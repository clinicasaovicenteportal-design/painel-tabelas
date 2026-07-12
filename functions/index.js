const crypto = require("crypto");
const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const {
  getFirestore,
  FieldValue,
  Timestamp
} = require("firebase-admin/firestore");

initializeApp();
setGlobalOptions({ region: "southamerica-east1", maxInstances: 10 });

const db = getFirestore();
const adminAuth = getAuth();
const MAX_SELF_RECOVERIES = 3;
const MAX_HELP_REQUESTS = 3;
const MAX_PIN_FAILURES = 5;
const PIN_LOCK_MINUTES = 30;

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40);
}

function assertPassword(password) {
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    throw new HttpsError(
      "invalid-argument",
      "A senha precisa ter entre 8 e 128 caracteres."
    );
  }
}

function assertPin(pin) {
  if (!/^\d{6}$/.test(String(pin || ""))) {
    throw new HttpsError(
      "invalid-argument",
      "O PIN precisa ter exatamente 6 números."
    );
  }
}

function hashPin(pin, salt) {
  return crypto.scryptSync(String(pin), String(salt), 64).toString("hex");
}

function secureEqual(left, right) {
  try {
    const a = Buffer.from(String(left), "hex");
    const b = Buffer.from(String(right), "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (_) {
    return false;
  }
}

async function findUserByUsername(username) {
  const normalized = normalize(username);
  if (!normalized) return null;

  const snapshot = await db
    .collection("usuarios")
    .where("usuario", "==", normalized)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const document = snapshot.docs[0];
  return {
    ref: document.ref,
    id: document.id,
    data: document.data() || {}
  };
}

async function isAdminRequest(request) {
  if (!request.auth) return false;

  const email = String(request.auth.token.email || "").toLowerCase();
  if (email.endsWith("@clinica.com")) return true;

  const snapshot = await db.doc(`usuarios/${request.auth.uid}`).get();
  return snapshot.exists && snapshot.data()?.admin === true;
}

async function requireAdmin(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Entre novamente no painel.");
  }

  if (!(await isAdminRequest(request))) {
    throw new HttpsError("permission-denied", "Somente a gestão pode executar esta ação.");
  }
}

function requireSignedIn(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Entre novamente no painel.");
  }
}

function requireRecentLogin(request, maxMinutes = 10) {
  requireSignedIn(request);
  const authTime = Number(request.auth.token.auth_time || 0) * 1000;
  if (!authTime || Date.now() - authTime > maxMinutes * 60 * 1000) {
    throw new HttpsError(
      "failed-precondition",
      "Faça login novamente antes de alterar os dados de segurança."
    );
  }
}

async function createAdminNotification({ tipo, titulo, mensagem, uid = "", usuario = "", nome = "" }) {
  await db.collection("notificacoes-admin").add({
    tipo,
    titulo,
    mensagem,
    uid,
    usuario,
    nome,
    lida: false,
    criadoEm: FieldValue.serverTimestamp()
  });
}

async function createAudit({ tipo, uid, usuario = "", nome = "", executorUid = "", detalhes = {} }) {
  await db.collection("auditoria-acessos").add({
    tipo,
    uid,
    usuario,
    nome,
    executorUid,
    detalhes,
    criadoEm: FieldValue.serverTimestamp()
  });
}

exports.configurarPinRecuperacao = onCall(async (request) => {
  requireRecentLogin(request);

  const pin = String(request.data?.pin || "").trim();
  assertPin(pin);

  const userRef = db.doc(`usuarios/${request.auth.uid}`);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Perfil de acesso não encontrado.");
  }

  const profile = snapshot.data() || {};
  if (profile.admin === true) {
    throw new HttpsError("failed-precondition", "A gestão utiliza recuperação administrativa.");
  }

  const salt = crypto.randomBytes(24).toString("hex");
  const hash = hashPin(pin, salt);
  const used = Number(profile.recuperacoesSelfService || 0);

  await userRef.set({
    recoveryPinHash: hash,
    recoveryPinSalt: salt,
    recoveryPinConfigured: true,
    recoveryPinConfiguredAt: FieldValue.serverTimestamp(),
    recoveryPinFailures: 0,
    recoveryPinLockUntil: FieldValue.delete(),
    atualizadoEm: FieldValue.serverTimestamp()
  }, { merge: true });

  await createAudit({
    tipo: "configuracao_pin_recuperacao",
    uid: request.auth.uid,
    usuario: profile.usuario || "",
    nome: profile.nome || "",
    executorUid: request.auth.uid
  });

  return {
    ok: true,
    used,
    remaining: Math.max(0, MAX_SELF_RECOVERIES - used)
  };
});

exports.registrarTrocaSenhaPropria = onCall(async (request) => {
  requireSignedIn(request);

  const userRef = db.doc(`usuarios/${request.auth.uid}`);
  const snapshot = await userRef.get();
  const profile = snapshot.exists ? snapshot.data() || {} : {};

  await userRef.set({
    senhaAlteradaEm: FieldValue.serverTimestamp(),
    ultimaTrocaSenhaTipo: "usuario",
    senhaTemporaria: false,
    atualizadoEm: FieldValue.serverTimestamp()
  }, { merge: true });

  await Promise.all([
    createAdminNotification({
      tipo: "troca_senha_usuario",
      titulo: "Senha alterada pelo colaborador",
      mensagem: `${profile.nome || profile.usuario || "Um colaborador"} alterou a própria senha dentro do painel.`,
      uid: request.auth.uid,
      usuario: profile.usuario || "",
      nome: profile.nome || ""
    }),
    createAudit({
      tipo: "troca_senha_usuario",
      uid: request.auth.uid,
      usuario: profile.usuario || "",
      nome: profile.nome || "",
      executorUid: request.auth.uid,
      detalhes: { origem: request.data?.origem || "painel" }
    })
  ]);

  return { ok: true };
});

exports.recuperarSenhaComPin = onCall(async (request) => {
  const username = normalize(request.data?.username || "");
  const pin = String(request.data?.pin || "").trim();
  const newPassword = String(request.data?.newPassword || "");

  assertPin(pin);
  assertPassword(newPassword);

  const user = await findUserByUsername(username);
  if (!user || user.data.admin === true || user.data.ativo === false) {
    throw new HttpsError("permission-denied", "Dados de recuperação inválidos.");
  }

  const now = Date.now();
  const lockUntil = user.data.recoveryPinLockUntil?.toMillis?.() || 0;
  if (lockUntil > now) {
    throw new HttpsError(
      "resource-exhausted",
      "Recuperação temporariamente bloqueada."
    );
  }

  const used = Number(user.data.recuperacoesSelfService || 0);
  if (used >= MAX_SELF_RECOVERIES) {
    throw new HttpsError(
      "failed-precondition",
      "Limite de recuperações atingido. Procure a gestão."
    );
  }

  if (!user.data.recoveryPinHash || !user.data.recoveryPinSalt) {
    throw new HttpsError("permission-denied", "Dados de recuperação inválidos.");
  }

  const informedHash = hashPin(pin, user.data.recoveryPinSalt);
  const validPin = secureEqual(informedHash, user.data.recoveryPinHash);

  if (!validPin) {
    const failures = Number(user.data.recoveryPinFailures || 0) + 1;
    const update = {
      recoveryPinFailures: failures,
      atualizadoEm: FieldValue.serverTimestamp()
    };

    if (failures >= MAX_PIN_FAILURES) {
      update.recoveryPinFailures = 0;
      update.recoveryPinLockUntil = Timestamp.fromMillis(
        now + PIN_LOCK_MINUTES * 60 * 1000
      );
    }

    await user.ref.set(update, { merge: true });
    throw new HttpsError("permission-denied", "Dados de recuperação inválidos.");
  }

  let reserved = false;
  try {
    await db.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(user.ref);
      if (!currentSnapshot.exists) {
        throw new HttpsError("not-found", "Usuário não encontrado.");
      }

      const current = currentSnapshot.data() || {};
      const currentUsed = Number(current.recuperacoesSelfService || 0);
      if (currentUsed >= MAX_SELF_RECOVERIES) {
        throw new HttpsError(
          "failed-precondition",
          "Limite de recuperações atingido. Procure a gestão."
        );
      }

      transaction.set(user.ref, {
        recuperacoesSelfService: currentUsed + 1,
        recoveryPinFailures: 0,
        recoveryPinLockUntil: FieldValue.delete(),
        senhaAlteradaEm: FieldValue.serverTimestamp(),
        ultimaTrocaSenhaTipo: "recuperacao_pin",
        senhaTemporaria: false,
        atualizadoEm: FieldValue.serverTimestamp()
      }, { merge: true });
    });

    reserved = true;
    await adminAuth.updateUser(user.id, { password: newPassword });
  } catch (error) {
    if (reserved) {
      await user.ref.set({
        recuperacoesSelfService: FieldValue.increment(-1),
        atualizadoEm: FieldValue.serverTimestamp()
      }, { merge: true }).catch(() => {});
    }
    throw error;
  }

  const remaining = Math.max(0, MAX_SELF_RECOVERIES - (used + 1));

  await Promise.all([
    createAdminNotification({
      tipo: "recuperacao_pin",
      titulo: "Senha recuperada com PIN",
      mensagem: `${user.data.nome || user.data.usuario || "Um colaborador"} recuperou o acesso. Restam ${remaining} recuperação(ões) por PIN.`,
      uid: user.id,
      usuario: user.data.usuario || "",
      nome: user.data.nome || ""
    }),
    createAudit({
      tipo: "recuperacao_pin",
      uid: user.id,
      usuario: user.data.usuario || "",
      nome: user.data.nome || "",
      detalhes: { remaining }
    })
  ]);

  return { ok: true, remaining };
});

exports.solicitarAjudaRecuperacao = onCall(async (request) => {
  const username = normalize(request.data?.username || "");
  if (!username) {
    throw new HttpsError("invalid-argument", "Informe o usuário de acesso.");
  }

  const user = await findUserByUsername(username);
  if (!user || user.data.admin === true || user.data.ativo === false) {
    return { ok: true };
  }

  const pendingSnapshot = await db
    .collection("recuperacoes-acesso")
    .where("uid", "==", user.id)
    .where("status", "==", "pendente")
    .limit(1)
    .get();

  if (!pendingSnapshot.empty) {
    return { ok: true, alreadyPending: true };
  }

  const requestsUsed = Number(user.data.pedidosRecuperacao || 0);
  if (requestsUsed >= MAX_HELP_REQUESTS) {
    throw new HttpsError(
      "failed-precondition",
      "O limite de solicitações foi atingido. Procure a gestão diretamente."
    );
  }

  const requestRef = db.collection("recuperacoes-acesso").doc();
  const nextCount = requestsUsed + 1;

  await Promise.all([
    requestRef.set({
      uid: user.id,
      usuario: user.data.usuario || username,
      nome: user.data.nome || "Colaborador",
      setor: user.data.setor || "Geral",
      status: "pendente",
      tentativa: nextCount,
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp()
    }),
    user.ref.set({
      pedidosRecuperacao: nextCount,
      ultimoPedidoRecuperacaoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp()
    }, { merge: true }),
    createAdminNotification({
      tipo: "pedido_recuperacao",
      titulo: "Solicitação de recuperação de acesso",
      mensagem: `${user.data.nome || user.data.usuario || "Um colaborador"} informou que esqueceu a senha.`,
      uid: user.id,
      usuario: user.data.usuario || username,
      nome: user.data.nome || ""
    })
  ]);

  return { ok: true, remainingRequests: Math.max(0, MAX_HELP_REQUESTS - nextCount) };
});

exports.adminRedefinirSenha = onCall(async (request) => {
  await requireAdmin(request);

  const uid = String(request.data?.uid || "").trim();
  const requestId = String(request.data?.requestId || "").trim();
  const newPassword = String(request.data?.newPassword || "");

  if (!uid) throw new HttpsError("invalid-argument", "Usuário não informado.");
  assertPassword(newPassword);

  const userRef = db.doc(`usuarios/${uid}`);
  const snapshot = await userRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Perfil do colaborador não encontrado.");
  }

  const profile = snapshot.data() || {};
  await adminAuth.updateUser(uid, { password: newPassword });

  const writes = [
    userRef.set({
      senhaAlteradaEm: FieldValue.serverTimestamp(),
      ultimaTrocaSenhaTipo: "gestao",
      senhaTemporaria: true,
      recoveryPinFailures: 0,
      recoveryPinLockUntil: FieldValue.delete(),
      atualizadoEm: FieldValue.serverTimestamp()
    }, { merge: true }),
    createAdminNotification({
      tipo: "redefinicao_gestao",
      titulo: "Senha redefinida pela gestão",
      mensagem: `A gestão redefiniu a senha de ${profile.nome || profile.usuario || "um colaborador"}.`,
      uid,
      usuario: profile.usuario || "",
      nome: profile.nome || ""
    }),
    createAudit({
      tipo: "redefinicao_gestao",
      uid,
      usuario: profile.usuario || "",
      nome: profile.nome || "",
      executorUid: request.auth.uid,
      detalhes: { requestId }
    })
  ];

  if (requestId) {
    writes.push(db.doc(`recuperacoes-acesso/${requestId}`).set({
      status: "resolvido",
      resolvidoPor: request.auth.uid,
      resolvidoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp()
    }, { merge: true }));
  }

  await Promise.all(writes);
  return { ok: true };
});

exports.adminResolverSolicitacao = onCall(async (request) => {
  await requireAdmin(request);

  const requestId = String(request.data?.requestId || "").trim();
  const status = String(request.data?.status || "atendido").trim();

  if (!requestId) {
    throw new HttpsError("invalid-argument", "Solicitação não informada.");
  }

  if (!["atendido", "cancelado", "resolvido"].includes(status)) {
    throw new HttpsError("invalid-argument", "Status inválido.");
  }

  await db.doc(`recuperacoes-acesso/${requestId}`).set({
    status,
    resolvidoPor: request.auth.uid,
    resolvidoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp()
  }, { merge: true });

  return { ok: true };
});

