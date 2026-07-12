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

