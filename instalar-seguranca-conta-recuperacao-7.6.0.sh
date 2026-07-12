#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/painel-tabelas

echo "=============================================================="
echo "SEGURANÇA DE CONTA E RECUPERAÇÃO DE SENHA — VERSÃO 7.6.0"
echo "=============================================================="

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/workspaces/backup-seguranca-conta-7.6.0-$STAMP"
mkdir -p "$BACKUP_DIR"

echo
echo "1/8 — Salvando os arquivos que serão alterados..."

for file in \
  index.html \
  app.js \
  csv-bootstrap.js \
  sw.js \
  version.json \
  firebase.json \
  firestore.rules
do
  if [ -f "$file" ]; then
    cp "$file" "$BACKUP_DIR/$file"
  fi
done

echo
echo "2/8 — Atualizando a base do GitHub sem apagar alterações locais..."

git fetch origin main

if git diff --quiet && git diff --cached --quiet; then
  git pull --rebase origin main || true
else
  echo "Existem alterações locais. Elas serão preservadas."
fi

echo
echo "3/8 — Criando a área Minha Conta e recuperação de acesso..."

cat > csv-account-security.js <<'EOF_ACCOUNT_JS'
import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-functions.js";

const VERSION = "7.6.0";
const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "southamerica-east1");

const callConfigureRecoveryPin = httpsCallable(functions, "configurarPinRecuperacao");
const callRecoverWithPin = httpsCallable(functions, "recuperarSenhaComPin");
const callRequestHelp = httpsCallable(functions, "solicitarAjudaRecuperacao");
const callRegisterOwnChange = httpsCallable(functions, "registrarTrocaSenhaPropria");
const callAdminReset = httpsCallable(functions, "adminRedefinirSenha");
const callAdminResolve = httpsCallable(functions, "adminResolverSolicitacao");

const state = {
  user: null,
  profile: null,
  isAdmin: false,
  requests: [],
  notifications: [],
  unsubscribers: [],
  observerTimer: null
};

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

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

function formatDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) return "Agora";
  return date.toLocaleString("pt-BR");
}

function setMessage(id, message, kind = "") {
  const element = document.getElementById(id);
  if (!element) return;
  element.className = `csv-account-message${kind ? ` ${kind}` : ""}`;
  element.innerHTML = message;
}

function setBusy(button, busy, label = "Processando...") {
  if (!button) return;
  if (busy) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> ${esc(label)}`;
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.originalHtml || button.innerHTML;
  }
}

async function loadOwnProfile(user) {
  const snapshot = await getDoc(doc(db, "usuarios", user.uid));
  if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() };

  const email = String(user.email || "").toLowerCase();
  if (email.endsWith("@clinica.com")) {
    return {
      id: user.uid,
      nome: "Gestão Administrador",
      usuario: email.split("@")[0],
      setor: "Gestão",
      admin: true,
      ativo: true,
      recuperacoesSelfService: 0,
      recoveryPinConfigured: false
    };
  }

  return null;
}

function isAdminProfile(profile) {
  return profile?.admin === true ||
    String(state.user?.email || "").toLowerCase().endsWith("@clinica.com");
}

function closeAllCustomTabs() {
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active");
    tab.style.display = "none";
  });

  document.querySelectorAll(".sidebar-nav .nav-btn").forEach((button) => {
    button.classList.remove("active");
  });
}

function openTab(tab, button, title) {
  if (!tab) return;
  closeAllCustomTabs();
  tab.style.display = "block";
  tab.classList.add("active");
  button?.classList.add("active");

  const pageTitle = document.getElementById("page-title");
  if (pageTitle) pageTitle.textContent = title;

  const searchBox = document.getElementById("search-box");
  if (searchBox) searchBox.style.display = "none";
}

function accountTabMarkup() {
  const used = Number(state.profile?.recuperacoesSelfService || 0);
  const remaining = Math.max(0, 3 - used);
  const configured = state.profile?.recoveryPinConfigured === true ||
    Boolean(state.profile?.recoveryPinHash);

  return `
    <div class="csv-account-hero">
      <div>
        <span class="csv-account-eyebrow">
          <i class="ri-shield-keyhole-line"></i>
          Segurança da conta
        </span>
        <h2>Minha conta e senha</h2>
        <p>Atualize sua senha e configure um PIN pessoal para recuperar o acesso com segurança.</p>
      </div>
      <div class="csv-account-identity">
        <div class="csv-account-avatar">${esc((state.profile?.nome || "U").charAt(0).toUpperCase())}</div>
        <div>
          <strong>${esc(state.profile?.nome || "Usuário")}</strong>
          <span>@${esc(state.profile?.usuario || "")} • ${esc(state.profile?.setor || "Geral")}</span>
        </div>
      </div>
    </div>

    <div class="csv-account-stats">
      <article>
        <span>PIN de recuperação</span>
        <strong>${configured ? "Configurado" : "Não configurado"}</strong>
        <i class="${configured ? "ri-shield-check-line" : "ri-shield-keyhole-line"}"></i>
      </article>
      <article>
        <span>Recuperações disponíveis</span>
        <strong>${remaining} de 3</strong>
        <i class="ri-key-2-line"></i>
      </article>
      <article>
        <span>Status da conta</span>
        <strong>${state.profile?.ativo === false ? "Desativada" : "Ativa"}</strong>
        <i class="ri-checkbox-circle-line"></i>
      </article>
    </div>

    <div class="csv-account-grid">
      <form id="csv-change-password-form" class="csv-account-card">
        <div class="csv-account-card-head">
          <span class="burgundy"><i class="ri-lock-password-line"></i></span>
          <div>
            <h3>Alterar minha senha</h3>
            <p>Informe a senha atual antes de definir uma nova.</p>
          </div>
        </div>

        <label>
          <span>Senha atual</span>
          <input type="password" id="csv-current-password" autocomplete="current-password" required>
        </label>

        <div class="csv-account-two">
          <label>
            <span>Nova senha</span>
            <input type="password" id="csv-new-password" minlength="8" autocomplete="new-password" required>
          </label>
          <label>
            <span>Confirmar nova senha</span>
            <input type="password" id="csv-confirm-password" minlength="8" autocomplete="new-password" required>
          </label>
        </div>

        <small>A nova senha precisa ter pelo menos 8 caracteres.</small>
        <div id="csv-change-password-message" class="csv-account-message"></div>

        <button type="submit" class="csv-account-primary">
          <i class="ri-save-line"></i>
          Salvar nova senha
        </button>
      </form>

      <form id="csv-recovery-pin-form" class="csv-account-card">
        <div class="csv-account-card-head">
          <span class="purple"><i class="ri-fingerprint-line"></i></span>
          <div>
            <h3>${configured ? "Trocar PIN de recuperação" : "Criar PIN de recuperação"}</h3>
            <p>O PIN será solicitado somente quando você esquecer a senha.</p>
          </div>
        </div>

        <label>
          <span>Senha atual</span>
          <input type="password" id="csv-pin-current-password" autocomplete="current-password" required>
        </label>

        <div class="csv-account-two">
          <label>
            <span>Novo PIN de 6 números</span>
            <input type="password" id="csv-recovery-pin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required>
          </label>
          <label>
            <span>Confirmar PIN</span>
            <input type="password" id="csv-recovery-pin-confirm" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required>
          </label>
        </div>

        <small>Após 3 recuperações por PIN, somente a gestão poderá redefinir sua senha.</small>
        <div id="csv-recovery-pin-message" class="csv-account-message"></div>

        <button type="submit" class="csv-account-secondary">
          <i class="ri-shield-keyhole-line"></i>
          ${configured ? "Atualizar PIN" : "Ativar recuperação"}
        </button>
      </form>
    </div>

    <div class="csv-account-security-note">
      <i class="ri-information-line"></i>
      <div>
        <strong>Proteção do acesso</strong>
        <p>O PIN não substitui sua senha. Ele é armazenado de forma protegida e possui bloqueio contra tentativas repetidas.</p>
      </div>
    </div>
  `;
}

function ensureAccountArea() {
  if (!state.user || !state.profile) return;

  const nav = document.querySelector(".sidebar-nav");
  const main = document.querySelector(".main-content");
  if (!nav || !main) return;

  let button = document.getElementById("csv-account-nav");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.id = "csv-account-nav";
    button.className = "nav-btn csv-account-nav";
    button.innerHTML = '<i class="ri-user-settings-line"></i> Minha Conta';
    nav.appendChild(button);
  }

  let tab = document.getElementById("tab-minha-conta");
  if (!tab) {
    tab = document.createElement("section");
    tab.id = "tab-minha-conta";
    tab.className = "tab-content csv-account-shell";
    tab.style.display = "none";
    main.appendChild(tab);
  }

  tab.innerHTML = accountTabMarkup();
  bindAccountForms(tab);

  if (!button.dataset.csvBound) {
    button.dataset.csvBound = "1";
    button.addEventListener("click", () => {
      tab.innerHTML = accountTabMarkup();
      bindAccountForms(tab);
      openTab(tab, button, "Minha Conta");
    });
  }
}

function bindAccountForms(tab) {
  tab.querySelector("#csv-change-password-form")?.addEventListener("submit", changeOwnPassword);
  tab.querySelector("#csv-recovery-pin-form")?.addEventListener("submit", configureRecoveryPin);
}

async function reauthenticate(currentPassword) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error("Sessão inválida. Entre novamente no painel.");
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
}

async function changeOwnPassword(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const currentPassword = form.querySelector("#csv-current-password").value;
  const newPassword = form.querySelector("#csv-new-password").value;
  const confirmation = form.querySelector("#csv-confirm-password").value;

  if (newPassword.length < 8) {
    setMessage("csv-change-password-message", "Use pelo menos 8 caracteres.", "error");
    return;
  }

  if (newPassword !== confirmation) {
    setMessage("csv-change-password-message", "As novas senhas não são iguais.", "error");
    return;
  }

  setBusy(button, true, "Alterando...");
  setMessage("csv-change-password-message", "Validando sua senha atual...", "working");

  try {
    await reauthenticate(currentPassword);
    await updatePassword(auth.currentUser, newPassword);
    await callRegisterOwnChange({ origem: "minha-conta" });

    form.reset();
    setMessage(
      "csv-change-password-message",
      '<i class="ri-checkbox-circle-line"></i> Senha alterada com sucesso.',
      "success"
    );
  } catch (error) {
    console.error("Alteração de senha:", error);
    const message = error.code === "auth/invalid-credential" || error.code === "auth/wrong-password"
      ? "A senha atual está incorreta."
      : error.code === "auth/requires-recent-login"
        ? "Entre novamente no painel e tente outra vez."
        : `Não foi possível alterar: ${error.message || "erro inesperado"}`;
    setMessage("csv-change-password-message", message, "error");
  } finally {
    setBusy(button, false);
  }
}

async function configureRecoveryPin(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const currentPassword = form.querySelector("#csv-pin-current-password").value;
  const pin = form.querySelector("#csv-recovery-pin").value.trim();
  const confirmation = form.querySelector("#csv-recovery-pin-confirm").value.trim();

  if (!/^\d{6}$/.test(pin)) {
    setMessage("csv-recovery-pin-message", "O PIN deve ter exatamente 6 números.", "error");
    return;
  }

  if (pin !== confirmation) {
    setMessage("csv-recovery-pin-message", "Os PINs informados não são iguais.", "error");
    return;
  }

  setBusy(button, true, "Protegendo...");
  setMessage("csv-recovery-pin-message", "Validando sua identidade...", "working");

  try {
    await reauthenticate(currentPassword);
    const result = await callConfigureRecoveryPin({ pin });

    state.profile = {
      ...state.profile,
      recoveryPinConfigured: true,
      recuperacoesSelfService: Number(result.data?.used || state.profile?.recuperacoesSelfService || 0)
    };
    window.csvPerfilAtual = { ...(window.csvPerfilAtual || {}), ...state.profile };

    form.reset();
    setMessage(
      "csv-recovery-pin-message",
      '<i class="ri-shield-check-line"></i> PIN configurado com segurança.',
      "success"
    );

    setTimeout(() => ensureAccountArea(), 500);
  } catch (error) {
    console.error("Configuração de PIN:", error);
    const message = error.code === "auth/invalid-credential" || error.code === "auth/wrong-password"
      ? "A senha atual está incorreta."
      : `Não foi possível configurar: ${error.message || "erro inesperado"}`;
    setMessage("csv-recovery-pin-message", message, "error");
  } finally {
    setBusy(button, false);
  }
}

function ensureForgotButton() {
  const form = document.getElementById("form-login");
  if (!form || document.getElementById("csv-forgot-access")) return;

  const loginButton = document.getElementById("btn-login");
  const button = document.createElement("button");
  button.type = "button";
  button.id = "csv-forgot-access";
  button.className = "csv-forgot-access";
  button.innerHTML = '<i class="ri-key-2-line"></i> Esqueci minha senha';
  button.addEventListener("click", openRecoveryModal);

  loginButton?.insertAdjacentElement("beforebegin", button);
}

function recoveryModalMarkup() {
  return `
    <div class="csv-recovery-dialog" role="dialog" aria-modal="true" aria-labelledby="csv-recovery-title">
      <button type="button" class="csv-recovery-close" aria-label="Fechar">
        <i class="ri-close-line"></i>
      </button>

      <div class="csv-recovery-brand">
        <span><i class="ri-shield-keyhole-line"></i></span>
        <div>
          <small>Recuperação protegida</small>
          <h2 id="csv-recovery-title">Recuperar acesso</h2>
        </div>
      </div>

      <p class="csv-recovery-description">
        Use o PIN pessoal configurado em “Minha Conta”. São permitidas até 3 recuperações por usuário.
      </p>

      <div class="csv-recovery-tabs">
        <button type="button" class="active" data-mode="pin">Usar meu PIN</button>
        <button type="button" data-mode="help">Pedir ajuda à gestão</button>
      </div>

      <form id="csv-recover-with-pin-form" class="csv-recovery-form active">
        <label>
          <span>Usuário de acesso</span>
          <input id="csv-recovery-username" autocomplete="username" required placeholder="ex.: maria.silva">
        </label>

        <label>
          <span>PIN de recuperação</span>
          <input id="csv-recovery-pin-login" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" required placeholder="6 números">
        </label>

        <div class="csv-account-two">
          <label>
            <span>Nova senha</span>
            <input id="csv-recovery-new-password" type="password" minlength="8" autocomplete="new-password" required>
          </label>
          <label>
            <span>Confirmar senha</span>
            <input id="csv-recovery-confirm-password" type="password" minlength="8" autocomplete="new-password" required>
          </label>
        </div>

        <div id="csv-recovery-login-message" class="csv-account-message"></div>

        <button type="submit" class="csv-account-primary">
          <i class="ri-refresh-line"></i>
          Recuperar e trocar senha
        </button>
      </form>

      <form id="csv-recovery-help-form" class="csv-recovery-form">
        <div class="csv-recovery-help-box">
          <i class="ri-customer-service-2-line"></i>
          <div>
            <strong>Não configurou o PIN?</strong>
            <p>Envie uma solicitação para a gestão. O administrador receberá um aviso no painel.</p>
          </div>
        </div>

        <label>
          <span>Usuário de acesso</span>
          <input id="csv-help-username" autocomplete="username" required placeholder="ex.: maria.silva">
        </label>

        <div id="csv-recovery-help-message" class="csv-account-message"></div>

        <button type="submit" class="csv-account-secondary">
          <i class="ri-notification-3-line"></i>
          Notificar a gestão
        </button>
      </form>

      <small class="csv-recovery-footer">
        Por segurança, cinco tentativas incorretas de PIN bloqueiam temporariamente a recuperação.
      </small>
    </div>
  `;
}

function openRecoveryModal() {
  let overlay = document.getElementById("csv-recovery-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "csv-recovery-overlay";
    overlay.className = "csv-recovery-overlay";
    overlay.innerHTML = recoveryModalMarkup();
    document.body.appendChild(overlay);

    overlay.querySelector(".csv-recovery-close")?.addEventListener("click", closeRecoveryModal);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeRecoveryModal();
    });

    overlay.querySelectorAll(".csv-recovery-tabs button").forEach((button) => {
      button.addEventListener("click", () => switchRecoveryMode(button.dataset.mode));
    });

    overlay.querySelector("#csv-recover-with-pin-form")?.addEventListener("submit", recoverWithPin);
    overlay.querySelector("#csv-recovery-help-form")?.addEventListener("submit", requestRecoveryHelp);
  }

  const username = document.getElementById("email")?.value || "";
  const input = overlay.querySelector("#csv-recovery-username");
  if (input && username) input.value = normalize(username.split("@")[0]);

  overlay.classList.add("open");
  document.body.classList.add("csv-modal-open");
  setTimeout(() => input?.focus(), 120);
}

function closeRecoveryModal() {
  document.getElementById("csv-recovery-overlay")?.classList.remove("open");
  document.body.classList.remove("csv-modal-open");
}

function switchRecoveryMode(mode) {
  const overlay = document.getElementById("csv-recovery-overlay");
  if (!overlay) return;

  overlay.querySelectorAll(".csv-recovery-tabs button").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  overlay.querySelector("#csv-recover-with-pin-form")?.classList.toggle("active", mode === "pin");
  overlay.querySelector("#csv-recovery-help-form")?.classList.toggle("active", mode === "help");
}

async function recoverWithPin(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const username = normalize(form.querySelector("#csv-recovery-username").value);
  const pin = form.querySelector("#csv-recovery-pin-login").value.trim();
  const newPassword = form.querySelector("#csv-recovery-new-password").value;
  const confirmation = form.querySelector("#csv-recovery-confirm-password").value;

  if (!username || !/^\d{6}$/.test(pin)) {
    setMessage("csv-recovery-login-message", "Informe o usuário e o PIN de 6 números.", "error");
    return;
  }

  if (newPassword.length < 8) {
    setMessage("csv-recovery-login-message", "A nova senha deve ter pelo menos 8 caracteres.", "error");
    return;
  }

  if (newPassword !== confirmation) {
    setMessage("csv-recovery-login-message", "As novas senhas não são iguais.", "error");
    return;
  }

  setBusy(button, true, "Recuperando...");
  setMessage("csv-recovery-login-message", "Validando seus dados...", "working");

  try {
    const result = await callRecoverWithPin({ username, pin, newPassword });
    const remaining = Number(result.data?.remaining ?? 0);

    const loginInput = document.getElementById("email");
    const passwordInput = document.getElementById("senha");
    if (loginInput) loginInput.value = username;
    if (passwordInput) passwordInput.value = "";

    form.reset();
    setMessage(
      "csv-recovery-login-message",
      `<i class="ri-checkbox-circle-line"></i> Senha atualizada. Restam ${remaining} recuperação(ões) por PIN.`,
      "success"
    );

    setTimeout(closeRecoveryModal, 1900);
  } catch (error) {
    console.error("Recuperação por PIN:", error);
    const raw = String(error.message || "");
    const message = raw.includes("Limite")
      ? "O limite de 3 recuperações foi atingido. Solicite ajuda à gestão."
      : raw.includes("temporariamente")
        ? "A recuperação está temporariamente bloqueada por tentativas incorretas."
        : "Usuário ou PIN inválido. Confira os dados e tente novamente.";
    setMessage("csv-recovery-login-message", message, "error");
  } finally {
    setBusy(button, false);
  }
}

async function requestRecoveryHelp(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const username = normalize(form.querySelector("#csv-help-username").value);

  if (!username) {
    setMessage("csv-recovery-help-message", "Informe seu usuário de acesso.", "error");
    return;
  }

  setBusy(button, true, "Enviando...");
  setMessage("csv-recovery-help-message", "Notificando a gestão...", "working");

  try {
    await callRequestHelp({ username });
    form.reset();
    setMessage(
      "csv-recovery-help-message",
      '<i class="ri-checkbox-circle-line"></i> Solicitação enviada. Aguarde o contato da gestão.',
      "success"
    );
  } catch (error) {
    console.error("Pedido de recuperação:", error);
    const message = String(error.message || "").includes("limite")
      ? "O limite de solicitações foi atingido. Procure a gestão diretamente."
      : "Não foi possível enviar agora. Tente novamente em alguns minutos.";
    setMessage("csv-recovery-help-message", message, "error");
  } finally {
    setBusy(button, false);
  }
}

function ensureAdminRecoveryArea() {
  if (!state.isAdmin) {
    document.getElementById("csv-recovery-admin-nav")?.remove();
    document.getElementById("tab-recuperacao-acesso-admin")?.remove();
    return;
  }

  const nav = document.querySelector(".sidebar-nav");
  const main = document.querySelector(".main-content");
  if (!nav || !main) return;

  let button = document.getElementById("csv-recovery-admin-nav");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.id = "csv-recovery-admin-nav";
    button.className = "nav-btn csv-recovery-admin-nav";
    button.innerHTML = `
      <i class="ri-key-2-line"></i>
      Recuperação de Acessos
      <span id="csv-recovery-badge" class="csv-recovery-badge">0</span>
    `;

    const teamButton = nav.querySelector('[data-tab="colaboradores"]');
    if (teamButton?.nextSibling) nav.insertBefore(button, teamButton.nextSibling);
    else nav.appendChild(button);
  }

  let tab = document.getElementById("tab-recuperacao-acesso-admin");
  if (!tab) {
    tab = document.createElement("section");
    tab.id = "tab-recuperacao-acesso-admin";
    tab.className = "tab-content csv-account-shell";
    tab.style.display = "none";
    main.appendChild(tab);
  }

  renderAdminRecovery(tab);

  if (!button.dataset.csvBound) {
    button.dataset.csvBound = "1";
    button.addEventListener("click", () => {
      renderAdminRecovery(tab);
      openTab(tab, button, "Recuperação de Acessos");
    });
  }
}

function renderAdminRecovery(tab = document.getElementById("tab-recuperacao-acesso-admin")) {
  if (!tab || !state.isAdmin) return;

  const pending = state.requests.filter((item) => item.status === "pendente");
  const unread = state.notifications.filter((item) => item.lida !== true);

  const badge = document.getElementById("csv-recovery-badge");
  if (badge) {
    const total = pending.length + unread.length;
    badge.textContent = total;
    badge.style.display = total ? "inline-flex" : "none";
  }

  tab.innerHTML = `
    <div class="csv-account-hero admin">
      <div>
        <span class="csv-account-eyebrow"><i class="ri-notification-badge-line"></i> Gestão de segurança</span>
        <h2>Recuperação de acessos</h2>
        <p>Acompanhe solicitações, redefina senhas temporárias e consulte as alterações realizadas pelos usuários.</p>
      </div>
      <div class="csv-admin-recovery-summary">
        <span><strong>${pending.length}</strong> pendente(s)</span>
        <span><strong>${unread.length}</strong> aviso(s) novo(s)</span>
      </div>
    </div>

    <div class="csv-account-grid admin-grid">
      <section class="csv-account-card">
        <div class="csv-account-card-head">
          <span class="burgundy"><i class="ri-customer-service-2-line"></i></span>
          <div>
            <h3>Solicitações pendentes</h3>
            <p>Defina uma senha temporária para o colaborador.</p>
          </div>
        </div>
        <div id="csv-admin-recovery-requests" class="csv-admin-recovery-list">
          ${pending.length ? pending.map(requestCardMarkup).join("") : emptyAdminMarkup("Nenhuma solicitação pendente")}
        </div>
      </section>

      <section class="csv-account-card">
        <div class="csv-account-card-head">
          <span class="purple"><i class="ri-history-line"></i></span>
          <div>
            <h3>Notificações de segurança</h3>
            <p>Trocas de senha e recuperações realizadas.</p>
          </div>
        </div>
        <div class="csv-admin-notification-list">
          ${state.notifications.length
            ? state.notifications.slice(0, 30).map(notificationMarkup).join("")
            : emptyAdminMarkup("Nenhuma notificação registrada")}
        </div>
      </section>
    </div>
  `;

  bindAdminRecoveryActions(tab);
}

function requestCardMarkup(item) {
  return `
    <article class="csv-admin-recovery-item" data-request-id="${esc(item.id)}" data-uid="${esc(item.uid || "")}">
      <div class="csv-admin-recovery-top">
        <div class="csv-account-avatar small">${esc((item.nome || item.usuario || "U").charAt(0).toUpperCase())}</div>
        <div>
          <strong>${esc(item.nome || "Colaborador")}</strong>
          <span>@${esc(item.usuario || "")} • ${esc(item.setor || "Sem setor")}</span>
          <small>${esc(formatDate(item.criadoEm))}</small>
        </div>
      </div>

      <label>
        <span>Nova senha temporária</span>
        <input type="password" class="csv-admin-temp-password" minlength="8" placeholder="Mínimo de 8 caracteres">
      </label>

      <div class="csv-admin-recovery-actions">
        <button type="button" class="csv-admin-reset-password">
          <i class="ri-key-line"></i>
          Redefinir senha
        </button>
        <button type="button" class="csv-admin-close-request secondary">
          <i class="ri-check-line"></i>
          Marcar atendido
        </button>
      </div>
      <div class="csv-account-message csv-admin-request-message"></div>
    </article>
  `;
}

function notificationMarkup(item) {
  const icons = {
    troca_senha_usuario: "ri-lock-password-line",
    recuperacao_pin: "ri-fingerprint-line",
    pedido_recuperacao: "ri-customer-service-2-line",
    redefinicao_gestao: "ri-admin-line"
  };

  return `
    <article class="csv-admin-notification ${item.lida === true ? "read" : "unread"}">
      <span><i class="${icons[item.tipo] || "ri-shield-check-line"}"></i></span>
      <div>
        <strong>${esc(item.titulo || "Evento de segurança")}</strong>
        <p>${esc(item.mensagem || "")}</p>
        <small>${esc(formatDate(item.criadoEm))}</small>
      </div>
    </article>
  `;
}

function emptyAdminMarkup(text) {
  return `
    <div class="csv-account-empty">
      <i class="ri-shield-check-line"></i>
      <strong>${esc(text)}</strong>
    </div>
  `;
}

function bindAdminRecoveryActions(tab) {
  tab.querySelectorAll(".csv-admin-recovery-item").forEach((card) => {
    card.querySelector(".csv-admin-reset-password")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const password = card.querySelector(".csv-admin-temp-password").value;
      const message = card.querySelector(".csv-admin-request-message");

      if (password.length < 8) {
        message.className = "csv-account-message csv-admin-request-message error";
        message.textContent = "Use pelo menos 8 caracteres.";
        return;
      }

      setBusy(button, true, "Redefinindo...");
      try {
        await callAdminReset({
          uid: card.dataset.uid,
          requestId: card.dataset.requestId,
          newPassword: password
        });
        message.className = "csv-account-message csv-admin-request-message success";
        message.innerHTML = '<i class="ri-checkbox-circle-line"></i> Senha redefinida com sucesso.';
      } catch (error) {
        message.className = "csv-account-message csv-admin-request-message error";
        message.textContent = `Não foi possível redefinir: ${error.message || "erro inesperado"}`;
      } finally {
        setBusy(button, false);
      }
    });

    card.querySelector(".csv-admin-close-request")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      setBusy(button, true, "Finalizando...");
      try {
        await callAdminResolve({ requestId: card.dataset.requestId, status: "atendido" });
      } catch (error) {
        alert(`Não foi possível finalizar: ${error.message || "erro inesperado"}`);
      } finally {
        setBusy(button, false);
      }
    });
  });
}

function subscribeAdminSecurity() {
  state.unsubscribers.forEach((unsubscribe) => {
    try { unsubscribe?.(); } catch (_) {}
  });
  state.unsubscribers = [];

  if (!state.isAdmin) return;

  state.unsubscribers.push(onSnapshot(
    query(collection(db, "recuperacoes-acesso"), orderBy("criadoEm", "desc"), limit(100)),
    (snapshot) => {
      state.requests = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      ensureAdminRecoveryArea();
    },
    (error) => console.warn("Solicitações de recuperação:", error)
  ));

  state.unsubscribers.push(onSnapshot(
    query(collection(db, "notificacoes-admin"), orderBy("criadoEm", "desc"), limit(100)),
    (snapshot) => {
      state.notifications = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      ensureAdminRecoveryArea();
    },
    (error) => console.warn("Notificações administrativas:", error)
  ));
}

function removeAccountArea() {
  document.getElementById("csv-account-nav")?.remove();
  document.getElementById("tab-minha-conta")?.remove();
  document.getElementById("csv-recovery-admin-nav")?.remove();
  document.getElementById("tab-recuperacao-acesso-admin")?.remove();

  state.unsubscribers.forEach((unsubscribe) => {
    try { unsubscribe?.(); } catch (_) {}
  });
  state.unsubscribers = [];
}

async function handleAuth(user) {
  state.user = user;

  if (!user) {
    state.profile = null;
    state.isAdmin = false;
    removeAccountArea();
    ensureForgotButton();
    return;
  }

  try {
    state.profile = await loadOwnProfile(user);
    state.isAdmin = isAdminProfile(state.profile);

    if (!state.profile) return;

    ensureAccountArea();
    ensureAdminRecoveryArea();
    subscribeAdminSecurity();
  } catch (error) {
    console.error("Segurança da conta:", error);
  }
}

function observeInterface() {
  const observer = new MutationObserver(() => {
    clearTimeout(state.observerTimer);
    state.observerTimer = setTimeout(() => {
      ensureForgotButton();
      if (state.user && state.profile) {
        ensureAccountArea();
        ensureAdminRecoveryArea();
      }
    }, 100);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

function init() {
  ensureForgotButton();
  observeInterface();
  onAuthStateChanged(auth, handleAuth);
  console.log(`CSV Segurança da Conta ${VERSION} carregado.`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

EOF_ACCOUNT_JS

cat > csv-account-security.css <<'EOF_ACCOUNT_CSS'
/* CSV Segurança da Conta 7.6.0 */

.csv-account-shell {
  padding-bottom: 44px;
}

.csv-account-nav,
.csv-recovery-admin-nav {
  position: relative;
}

.csv-recovery-badge {
  min-width: 20px;
  height: 20px;
  margin-left: auto;
  padding: 0 6px;
  display: none;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #fff;
  background: #ef4444;
  font-size: 10px;
  font-weight: 800;
  box-shadow: 0 6px 18px rgba(239, 68, 68, .28);
}

.csv-account-hero {
  margin-bottom: 22px;
  padding: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border: 1px solid rgba(139, 37, 44, .12);
  border-radius: 28px;
  background:
    radial-gradient(circle at 92% 8%, rgba(124, 91, 196, .17), transparent 32%),
    linear-gradient(135deg, rgba(255,255,255,.98), rgba(247,249,253,.96));
  box-shadow: 0 22px 58px rgba(31, 43, 66, .10);
}

[data-theme="dark"] .csv-account-hero {
  background:
    radial-gradient(circle at 92% 8%, rgba(124, 91, 196, .28), transparent 32%),
    linear-gradient(135deg, rgba(25,34,49,.98), rgba(18,27,41,.98));
  border-color: rgba(255,255,255,.08);
}

.csv-account-hero.admin {
  background:
    radial-gradient(circle at 90% 10%, rgba(139, 37, 44, .20), transparent 35%),
    linear-gradient(135deg, rgba(255,255,255,.98), rgba(249,247,252,.96));
}

[data-theme="dark"] .csv-account-hero.admin {
  background:
    radial-gradient(circle at 90% 10%, rgba(139, 37, 44, .34), transparent 35%),
    linear-gradient(135deg, rgba(25,34,49,.98), rgba(18,27,41,.98));
}

.csv-account-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 9px;
  color: #8b252c;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.csv-account-hero h2 {
  margin: 0;
  color: var(--cp-text, #172033);
  font-size: clamp(28px, 3.4vw, 46px);
  line-height: 1.02;
  letter-spacing: -.045em;
}

.csv-account-hero p {
  max-width: 720px;
  margin: 10px 0 0;
  color: var(--cp-muted, #718096);
  font-size: 13px;
  line-height: 1.65;
}

.csv-account-identity,
.csv-admin-recovery-summary {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.csv-account-avatar {
  width: 58px;
  height: 58px;
  flex: 0 0 58px;
  display: grid;
  place-items: center;
  border-radius: 20px;
  color: #fff;
  background: linear-gradient(145deg, #7d5bd0, #9f6de2);
  box-shadow: 0 15px 32px rgba(124,91,196,.24);
  font-size: 20px;
  font-weight: 800;
}

.csv-account-avatar.small {
  width: 44px;
  height: 44px;
  flex-basis: 44px;
  border-radius: 15px;
  font-size: 15px;
}

.csv-account-identity strong,
.csv-account-identity span {
  display: block;
}

.csv-account-identity strong {
  color: var(--cp-text, #172033);
  font-size: 14px;
}

.csv-account-identity span {
  margin-top: 4px;
  color: var(--cp-muted, #718096);
  font-size: 10px;
}

.csv-account-stats {
  margin-bottom: 22px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.csv-account-stats article {
  min-height: 132px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--cp-border, #e2e8f0);
  border-radius: 22px;
  background: var(--cp-card, #fff);
  box-shadow: 0 15px 38px rgba(31, 43, 66, .07);
}

.csv-account-stats article::after {
  content: "";
  width: 100px;
  height: 100px;
  position: absolute;
  right: -28px;
  bottom: -32px;
  border-radius: 50%;
  background: rgba(124, 91, 196, .08);
}

.csv-account-stats span,
.csv-account-stats strong {
  display: block;
  position: relative;
  z-index: 2;
}

.csv-account-stats span {
  color: var(--cp-muted, #718096);
  font-size: 10px;
  font-weight: 700;
}

.csv-account-stats strong {
  margin-top: 11px;
  color: var(--cp-text, #172033);
  font-size: 24px;
}

.csv-account-stats i {
  position: absolute;
  right: 18px;
  bottom: 15px;
  z-index: 2;
  color: rgba(124,91,196,.25);
  font-size: 34px;
}

.csv-account-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.csv-account-grid.admin-grid {
  align-items: start;
}

.csv-account-card {
  padding: 24px;
  border: 1px solid var(--cp-border, #e2e8f0);
  border-radius: 24px;
  background: var(--cp-card, #fff);
  box-shadow: 0 18px 44px rgba(31, 43, 66, .08);
}

.csv-account-card-head {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 13px;
}

.csv-account-card-head > span {
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: #fff;
  font-size: 20px;
}

.csv-account-card-head > span.burgundy {
  background: linear-gradient(145deg, #8b252c, #c75058);
}

.csv-account-card-head > span.purple {
  background: linear-gradient(145deg, #7357bd, #9d78e6);
}

.csv-account-card-head h3 {
  margin: 0;
  color: var(--cp-text, #172033);
  font-size: 18px;
  letter-spacing: -.02em;
}

.csv-account-card-head p {
  margin: 4px 0 0;
  color: var(--cp-muted, #718096);
  font-size: 10px;
  line-height: 1.5;
}

.csv-account-card label,
.csv-admin-recovery-item label,
.csv-recovery-form label {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.csv-account-card label > span,
.csv-admin-recovery-item label > span,
.csv-recovery-form label > span {
  color: var(--cp-muted, #64748b);
  font-size: 9px;
  font-weight: 800;
}

.csv-account-card input,
.csv-admin-recovery-item input,
.csv-recovery-form input {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--cp-border, #dce4ee);
  border-radius: 15px;
  outline: none;
  color: var(--cp-text, #172033);
  background: var(--cp-soft, #f7f9fc);
  font-family: inherit;
  font-size: 11px;
  transition: .2s ease;
}

.csv-account-card input:focus,
.csv-admin-recovery-item input:focus,
.csv-recovery-form input:focus {
  border-color: rgba(124,91,196,.48);
  box-shadow: 0 0 0 4px rgba(124,91,196,.08);
}

.csv-account-two {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.csv-account-card > small {
  margin-top: 11px;
  display: block;
  color: var(--cp-muted, #718096);
  font-size: 9px;
  line-height: 1.5;
}

.csv-account-primary,
.csv-account-secondary,
.csv-admin-recovery-actions button {
  min-height: 46px;
  margin-top: 16px;
  padding: 0 17px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 15px;
  color: #fff;
  font-family: inherit;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 13px 28px rgba(31, 43, 66, .12);
  transition: .2s ease;
}

.csv-account-primary {
  background: linear-gradient(145deg, #8b252c, #c34d55);
}

.csv-account-secondary {
  background: linear-gradient(145deg, #6f55b8, #9670dc);
}

.csv-account-primary:hover,
.csv-account-secondary:hover,
.csv-admin-recovery-actions button:hover {
  transform: translateY(-2px);
}

.csv-account-primary:disabled,
.csv-account-secondary:disabled,
.csv-admin-recovery-actions button:disabled {
  opacity: .65;
  cursor: wait;
  transform: none;
}

.csv-account-message {
  min-height: 20px;
  margin-top: 11px;
  font-size: 9px;
  font-weight: 700;
  line-height: 1.5;
}

.csv-account-message.success { color: #16815a; }
.csv-account-message.error { color: #dc3545; }
.csv-account-message.working { color: #7357bd; }

.csv-account-security-note {
  margin-top: 18px;
  padding: 18px 20px;
  display: flex;
  gap: 12px;
  border: 1px solid rgba(32, 129, 91, .16);
  border-radius: 18px;
  background: rgba(32, 129, 91, .055);
}

.csv-account-security-note > i {
  color: #20815b;
  font-size: 22px;
}

.csv-account-security-note strong {
  color: var(--cp-text, #172033);
  font-size: 12px;
}

.csv-account-security-note p {
  margin: 4px 0 0;
  color: var(--cp-muted, #718096);
  font-size: 10px;
  line-height: 1.55;
}

.csv-forgot-access {
  width: 100%;
  min-height: 38px;
  margin: 0 0 10px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  color: #8b252c;
  background: transparent;
  font-family: inherit;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
}

.csv-forgot-access:hover {
  text-decoration: underline;
}

body.csv-modal-open {
  overflow: hidden;
}

.csv-recovery-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000000;
  padding: 24px;
  display: none;
  place-items: center;
  background: rgba(10, 17, 29, .72);
  backdrop-filter: blur(14px);
}

.csv-recovery-overlay.open {
  display: grid;
}

.csv-recovery-dialog {
  width: min(560px, 100%);
  max-height: min(840px, 92vh);
  overflow: auto;
  padding: 28px;
  position: relative;
  border: 1px solid rgba(255,255,255,.22);
  border-radius: 28px;
  background: var(--cp-card, #fff);
  box-shadow: 0 36px 100px rgba(0,0,0,.32);
  animation: csvRecoveryEnter .28s ease both;
}

@keyframes csvRecoveryEnter {
  from { opacity: 0; transform: translateY(16px) scale(.98); }
  to { opacity: 1; transform: none; }
}

.csv-recovery-close {
  width: 38px;
  height: 38px;
  position: absolute;
  top: 16px;
  right: 16px;
  display: grid;
  place-items: center;
  border: 1px solid var(--cp-border, #e2e8f0);
  border-radius: 13px;
  color: var(--cp-text, #172033);
  background: var(--cp-soft, #f7f9fc);
  cursor: pointer;
}

.csv-recovery-brand {
  display: flex;
  align-items: center;
  gap: 13px;
}

.csv-recovery-brand > span {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  color: #fff;
  background: linear-gradient(145deg, #8b252c, #c75058);
  font-size: 23px;
}

.csv-recovery-brand small,
.csv-recovery-brand h2 {
  display: block;
}

.csv-recovery-brand small {
  color: #8b252c;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .07em;
  text-transform: uppercase;
}

.csv-recovery-brand h2 {
  margin: 3px 0 0;
  color: var(--cp-text, #172033);
  font-size: 28px;
  letter-spacing: -.03em;
}

.csv-recovery-description {
  margin: 17px 0;
  color: var(--cp-muted, #718096);
  font-size: 11px;
  line-height: 1.6;
}

.csv-recovery-tabs {
  margin-bottom: 18px;
  padding: 4px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  border-radius: 15px;
  background: var(--cp-soft, #f3f6fa);
}

.csv-recovery-tabs button {
  min-height: 40px;
  border: 0;
  border-radius: 11px;
  color: var(--cp-muted, #718096);
  background: transparent;
  font-family: inherit;
  font-size: 9px;
  font-weight: 800;
  cursor: pointer;
}

.csv-recovery-tabs button.active {
  color: #fff;
  background: linear-gradient(145deg, #7357bd, #9b75e2);
  box-shadow: 0 8px 20px rgba(115,87,189,.22);
}

.csv-recovery-form {
  display: none;
}

.csv-recovery-form.active {
  display: block;
}

.csv-recovery-form > label + label {
  margin-top: 13px;
}

.csv-recovery-help-box {
  margin-bottom: 15px;
  padding: 16px;
  display: flex;
  gap: 12px;
  border: 1px solid rgba(124,91,196,.14);
  border-radius: 16px;
  background: rgba(124,91,196,.055);
}

.csv-recovery-help-box > i {
  color: #7357bd;
  font-size: 24px;
}

.csv-recovery-help-box strong {
  color: var(--cp-text, #172033);
  font-size: 11px;
}

.csv-recovery-help-box p {
  margin: 4px 0 0;
  color: var(--cp-muted, #718096);
  font-size: 9px;
  line-height: 1.5;
}

.csv-recovery-footer {
  margin-top: 17px;
  display: block;
  color: var(--cp-muted, #718096);
  font-size: 8px;
  line-height: 1.5;
  text-align: center;
}

.csv-admin-recovery-summary {
  gap: 10px;
}

.csv-admin-recovery-summary span {
  min-width: 120px;
  padding: 14px 16px;
  border: 1px solid rgba(124,91,196,.12);
  border-radius: 16px;
  color: var(--cp-muted, #718096);
  background: rgba(255,255,255,.72);
  font-size: 9px;
  text-align: center;
}

[data-theme="dark"] .csv-admin-recovery-summary span {
  background: rgba(255,255,255,.04);
}

.csv-admin-recovery-summary strong {
  display: block;
  color: var(--cp-text, #172033);
  font-size: 22px;
}

.csv-admin-recovery-list,
.csv-admin-notification-list {
  display: grid;
  gap: 11px;
}

.csv-admin-recovery-item,
.csv-admin-notification {
  padding: 15px;
  border: 1px solid var(--cp-border, #e2e8f0);
  border-radius: 17px;
  background: var(--cp-soft, #f8fafc);
}

.csv-admin-recovery-top {
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 11px;
}

.csv-admin-recovery-top strong,
.csv-admin-recovery-top span,
.csv-admin-recovery-top small {
  display: block;
}

.csv-admin-recovery-top strong {
  color: var(--cp-text, #172033);
  font-size: 11px;
}

.csv-admin-recovery-top span,
.csv-admin-recovery-top small {
  margin-top: 3px;
  color: var(--cp-muted, #718096);
  font-size: 8px;
}

.csv-admin-recovery-actions {
  display: flex;
  gap: 8px;
}

.csv-admin-recovery-actions button {
  margin-top: 10px;
  flex: 1;
  background: linear-gradient(145deg, #8b252c, #c34d55);
}

.csv-admin-recovery-actions button.secondary {
  color: #596579;
  background: #fff;
  border: 1px solid var(--cp-border, #e2e8f0);
  box-shadow: none;
}

[data-theme="dark"] .csv-admin-recovery-actions button.secondary {
  color: #dbe5f3;
  background: #1d293b;
}

.csv-admin-notification {
  display: flex;
  gap: 11px;
}

.csv-admin-notification.unread {
  border-color: rgba(139,37,44,.22);
  background: rgba(139,37,44,.045);
}

.csv-admin-notification > span {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  color: #8b252c;
  background: rgba(139,37,44,.10);
}

.csv-admin-notification strong {
  color: var(--cp-text, #172033);
  font-size: 10px;
}

.csv-admin-notification p {
  margin: 4px 0;
  color: var(--cp-muted, #718096);
  font-size: 9px;
  line-height: 1.45;
}

.csv-admin-notification small {
  color: var(--cp-muted, #718096);
  font-size: 8px;
}

.csv-account-empty {
  min-height: 130px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  color: var(--cp-muted, #718096);
  text-align: center;
}

.csv-account-empty i {
  font-size: 30px;
  color: #23a36d;
}

.csv-account-empty strong {
  font-size: 11px;
}

@media (max-width: 980px) {
  .csv-account-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .csv-account-stats,
  .csv-account-grid {
    grid-template-columns: 1fr;
  }

  .csv-admin-recovery-summary {
    width: 100%;
  }

  .csv-admin-recovery-summary span {
    flex: 1;
  }
}

@media (max-width: 620px) {
  .csv-account-hero,
  .csv-account-card,
  .csv-recovery-dialog {
    padding: 20px;
    border-radius: 21px;
  }

  .csv-account-two,
  .csv-recovery-tabs {
    grid-template-columns: 1fr;
  }

  .csv-account-identity,
  .csv-admin-recovery-summary,
  .csv-admin-recovery-actions {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
  }

  .csv-account-avatar {
    align-self: flex-start;
  }

  .csv-recovery-overlay {
    padding: 12px;
  }
}

EOF_ACCOUNT_CSS

echo
echo "4/8 — Criando as funções seguras do Firebase..."

mkdir -p functions

cat > functions/index.js <<'EOF_FUNCTIONS_JS'
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

EOF_FUNCTIONS_JS

cat > functions/package.json <<'EOF_FUNCTIONS_PACKAGE'
{
  "name": "csv-account-security-functions",
  "private": true,
  "main": "index.js",
  "engines": {
    "node": "20"
  },
  "scripts": {
    "serve": "firebase emulators:start --only functions",
    "deploy": "firebase deploy --only functions"
  },
  "dependencies": {
    "firebase-admin": "latest",
    "firebase-functions": "latest"
  }
}

EOF_FUNCTIONS_PACKAGE

cat > functions/.gitignore <<'EOF_FUNCTIONS_GITIGNORE'
node_modules/
.firebase/
firebase-debug.log
EOF_FUNCTIONS_GITIGNORE

echo
echo "5/8 — Conectando a nova função ao painel..."

python3 <<'PY'
from pathlib import Path
import json
import re

VERSION = "7.6.0"

path = Path("index.html")
text = path.read_text(encoding="utf-8")

text = re.sub(
    r"<title>Painel Clínico [^<]+</title>",
    f"<title>Painel Clínico {VERSION}</title>",
    text,
    count=1
)

css_tag = f'    <link rel="stylesheet" href="csv-account-security.css?v={VERSION}">\n'

if "csv-account-security.css" not in text:
    text = text.replace("</head>", css_tag + "</head>", 1)
else:
    text = re.sub(
        r'csv-account-security\.css\?v=[^"]+',
        f'csv-account-security.css?v={VERSION}',
        text
    )

text = re.sub(r'app\.js\?v=[^"]+', f'app.js?v={VERSION}', text)
text = re.sub(r'csv-bootstrap\.js\?v=[^"]+', f'csv-bootstrap.js?v={VERSION}', text)
path.write_text(text, encoding="utf-8")

path = Path("app.js")
text = path.read_text(encoding="utf-8")
text = re.sub(
    r"const APP_VERSION = '[^']+';",
    f"const APP_VERSION = '{VERSION}';",
    text,
    count=1
)
path.write_text(text, encoding="utf-8")

path = Path("csv-bootstrap.js")
text = path.read_text(encoding="utf-8")
text = re.sub(
    r'const VERSION = "[^"]+";',
    f'const VERSION = "{VERSION}";',
    text,
    count=1
)

security_import = """
  await safeImport(
    "Segurança da conta e recuperação de senha",
    "./csv-account-security.js"
  );
"""

if "./csv-account-security.js" not in text:
    marker = """
  await safeImport(
    "Chat de IA removido",
    "./csv-chat-disabled.js"
  );
"""

    if marker not in text:
        raise SystemExit(
            "Não encontrei o ponto de carregamento dos módulos no csv-bootstrap.js."
        )

    text = text.replace(marker, marker + security_import, 1)

path.write_text(text, encoding="utf-8")

path = Path("sw.js")
text = path.read_text(encoding="utf-8")
text = re.sub(
    r'const CACHE_NAME = "[^"]+";',
    f'const CACHE_NAME = "painel-csv-v{VERSION}";',
    text,
    count=1
)

for asset in ["./csv-account-security.css", "./csv-account-security.js"]:
    if asset in text:
        continue

    marker = '  "./csv-chat-disabled.js",'
    if marker not in text:
        marker = '  "./csv-media-stable.js",'

    if marker not in text:
        raise SystemExit(
            "Não encontrei a lista de arquivos do service worker."
        )

    text = text.replace(marker, marker + f'\n  "{asset}",', 1)

path.write_text(text, encoding="utf-8")

path = Path("firebase.json")
config = json.loads(path.read_text(encoding="utf-8"))
config["functions"] = {
    "source": "functions",
    "runtime": "nodejs20"
}
path.write_text(
    json.dumps(config, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8"
)

path = Path("firestore.rules")
rules = path.read_text(encoding="utf-8")

security_rules = """
    match /recuperacoes-acesso/{requestId} {
      allow read, update, delete: if isAdmin();
      allow create: if false;
    }

    match /notificacoes-admin/{notificationId} {
      allow read, update, delete: if isAdmin();
      allow create: if false;
    }

    match /auditoria-acessos/{auditId} {
      allow read: if isAdmin();
      allow create, update, delete: if false;
    }

"""

if "match /recuperacoes-acesso/" not in rules:
    marker = "    match /{collectionName}/{document=**} {"
    if marker not in rules:
        raise SystemExit(
            "Não encontrei o ponto correto para inserir as novas regras."
        )
    rules = rules.replace(marker, security_rules + marker, 1)

path.write_text(rules, encoding="utf-8")

Path("version.json").write_text(
    json.dumps(
        {
            "version": VERSION,
            "message": (
                "Nova área Minha Conta, troca de senha pelo colaborador, "
                "recuperação por PIN com limite de três usos e painel "
                "administrativo de solicitações e notificações."
            ),
            "force": False,
            "publishedAt": "2026-07-12"
        },
        ensure_ascii=False,
        indent=2
    ) + "\n",
    encoding="utf-8"
)
PY

echo
echo "6/8 — Instalando dependências das funções..."

npm install --prefix functions --no-audit --no-fund

echo
echo "7/8 — Validando todos os arquivos..."

node --check csv-account-security.js
node --check csv-bootstrap.js
node --check app.js
node --check sw.js
node --check functions/index.js

python3 -m json.tool firebase.json >/dev/null
python3 -m json.tool version.json >/dev/null
python3 -m json.tool functions/package.json >/dev/null

grep -q 'csv-account-security.js' csv-bootstrap.js
grep -q 'csv-account-security.css' index.html
grep -q 'painel-csv-v7.6.0' sw.js
grep -q 'recuperacoes-acesso' firestore.rules
grep -q '"version": "7.6.0"' version.json

echo
echo "8/8 — Publicando o código no GitHub..."

git add \
  index.html \
  app.js \
  csv-bootstrap.js \
  csv-account-security.js \
  csv-account-security.css \
  sw.js \
  version.json \
  firebase.json \
  firestore.rules \
  functions/index.js \
  functions/package.json \
  functions/package-lock.json \
  functions/.gitignore

if git diff --cached --quiet; then
  echo "Nenhuma alteração nova para enviar ao GitHub."
else
  git commit -m "Adicionar segurança de conta e recuperação de senha"
  git push origin main
fi

echo
echo "=============================================================="
echo "CÓDIGO 7.6.0 ENVIADO AO GITHUB"
echo "=============================================================="
echo
echo "Agora será feita a publicação segura no Firebase."
echo "As Cloud Functions exigem que o projeto esteja no plano Blaze."
echo

if firebase deploy --only firestore:rules,functions; then
  echo
  echo "=============================================================="
  echo "SEGURANÇA DE CONTA 7.6.0 ATIVADA COM SUCESSO"
  echo "=============================================================="
  echo
  echo "Recursos disponíveis:"
  echo "- aba Minha Conta para todos os usuários;"
  echo "- alteração da própria senha com confirmação da senha atual;"
  echo "- criação de PIN pessoal de recuperação;"
  echo "- até 3 recuperações de senha por PIN;"
  echo "- bloqueio de 30 minutos após 5 PINs incorretos;"
  echo "- botão Esqueci minha senha na tela de login;"
  echo "- solicitação de ajuda para a gestão;"
  echo "- painel administrativo de recuperação de acessos;"
  echo "- notificação quando um usuário altera ou recupera a senha."
else
  echo
  echo "=============================================================="
  echo "O CÓDIGO FOI ENVIADO AO GITHUB, MAS O FIREBASE NÃO ATIVOU"
  echo "=============================================================="
  echo
  echo "Isso normalmente acontece quando:"
  echo "1. o Firebase CLI precisa de login novamente; ou"
  echo "2. o projeto ainda não está no plano Blaze."
  echo
  echo "Depois de regularizar, execute somente:"
  echo
  echo "firebase deploy --only firestore:rules,functions"
  echo
  echo "Nenhum arquivo precisa ser criado novamente."
fi

echo
echo "Backup dos arquivos anteriores:"
echo "$BACKUP_DIR"
