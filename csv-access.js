import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  where,
  arrayUnion,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const CSV_ACCESS_VERSION = "5.0.0";
const INTERNAL_DOMAIN = "acesso.csv.app";

const defaultApp = getApp();
const auth = getAuth(defaultApp);
const db = getFirestore(defaultApp);

const creatorName = "csv-account-creator-v5";
const creatorApp =
  getApps().find((item) => item.name === creatorName) ||
  initializeApp(defaultApp.options, creatorName);
const creatorAuth = getAuth(creatorApp);

const TAB_OPTIONS = [
  { id: "boletins", label: "Comunicados e boletins" },
  { id: "corpo-clinico", label: "Corpo clínico" },
  { id: "convenios", label: "Convênios" },
  { id: "ultrassom", label: "Ultrassom" },
  { id: "consultas", label: "Consultas e procedimentos" },
  { id: "pacotes", label: "Pacotes do pronto-socorro" },
  { id: "exames-imagem", label: "Exames de imagem" },
  { id: "institutos", label: "Tabela Instituto" },
  { id: "contatos", label: "Contatos úteis" },
  { id: "remocoes", label: "Remoções" },
  { id: "ensino", label: "Ensino e treinamento" },
  { id: "agenda-trabalho", label: "Agenda de trabalho" }
];

const state = {
  profile: null,
  isAdmin: false,
  boletins: [],
  privados: [],
  colaboradores: [],
  usuarios: [],
  chart: null,
  listeners: [],
  editingUid: null,
  bulletinReady: false
};

window.csvAccessState = state;

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

function internalEmail(login = "") {
  const raw = String(login || "").trim().toLowerCase();
  return raw.includes("@") ? raw : `${normalize(raw)}@${INTERNAL_DOMAIN}`;
}

function displayNameFromEmail(email = "") {
  return String(email).split("@")[0].replace(/[._-]+/g, " ");
}

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function currentTheme() {
  return localStorage.getItem("csv_theme") === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
  const chosen = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = chosen;
  localStorage.setItem("csv_theme", chosen);

  const button = document.getElementById("csv-theme-toggle");
  if (button) {
    button.innerHTML = chosen === "dark"
      ? '<i class="ri-sun-line"></i><span>Modo claro</span>'
      : '<i class="ri-moon-clear-line"></i><span>Modo escuro</span>';
    button.setAttribute("aria-label", chosen === "dark" ? "Ativar modo claro" : "Ativar modo escuro");
  }

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", chosen === "dark" ? "#111827" : "#8B252C");
}

function ensureThemeToggle() {
  const header = document.querySelector(".top-header");
  if (!header || document.getElementById("csv-theme-toggle")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.id = "csv-theme-toggle";
  button.className = "csv-theme-toggle";
  button.addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });

  header.appendChild(button);
  applyTheme(currentTheme());
}

function setLoginStatus(message, kind = "") {
  const status = document.getElementById("csv-login-status");
  if (!status) return;
  status.className = `csv-login-status${kind ? ` ${kind}` : ""}`;
  status.innerHTML = message;
}

function installSmartLogin() {
  const button = document.getElementById("btn-login");
  const form = document.getElementById("form-login");
  const loginInput = document.getElementById("email");
  const passwordInput = document.getElementById("senha");

  if (!button || !loginInput || !passwordInput) return;

  loginInput.placeholder = "Usuário ou e-mail";
  loginInput.setAttribute("autocomplete", "username");
  loginInput.setAttribute("inputmode", "email");

  const smartLogin = async (event) => {
    event?.preventDefault?.();

    const login = loginInput.value.trim();
    const password = passwordInput.value;

    if (!login || !password) {
      setLoginStatus('<i class="ri-error-warning-line"></i> Informe o usuário e a senha.', "error");
      return;
    }

    const original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Entrando...';
    setLoginStatus('<i class="ri-shield-keyhole-line"></i> Validando acesso...', "");

    try {
      await signInWithEmailAndPassword(auth, internalEmail(login), password);
    } catch (error) {
      console.error("Falha no login CSV:", error);
      setLoginStatus('<i class="ri-error-warning-line"></i> Usuário ou senha incorretos.', "error");
      alert("Não foi possível entrar. Confira o usuário e a senha cadastrados.");
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  };

  window.efetuarLogin = smartLogin;
  button.onclick = smartLogin;
  if (form) form.onsubmit = smartLogin;
}

function clearDataListeners() {
  state.listeners.forEach((unsubscribe) => {
    try { unsubscribe?.(); } catch (_) {}
  });
  state.listeners = [];
}

function isLegacyAdmin(user) {
  return String(user?.email || "").toLowerCase().includes("@clinica");
}

async function loadProfile(user) {
  const adminLegacy = isLegacyAdmin(user);
  const snapshot = await getDoc(doc(db, "usuarios", user.uid));

  if (snapshot.exists()) {
    const data = snapshot.data() || {};
    return {
      uid: user.uid,
      email: user.email || data.email || "",
      nome: data.nome || displayNameFromEmail(user.email),
      usuario: data.usuario || displayNameFromEmail(user.email),
      setor: data.setor || "Geral",
      ativo: data.ativo !== false,
      admin: data.admin === true || adminLegacy,
      permissoes: Array.isArray(data.permissoes) ? data.permissoes : []
    };
  }

  if (adminLegacy) {
    return {
      uid: user.uid,
      email: user.email || "",
      nome: "Gestão Administrador",
      usuario: displayNameFromEmail(user.email),
      setor: "Gestão",
      ativo: true,
      admin: true,
      permissoes: TAB_OPTIONS.map((item) => item.id)
    };
  }

  return null;
}

function allowedTab(tabId) {
  if (!state.profile) return false;
  if (state.isAdmin) return true;
  if (tabId === "home") return true;
  return state.profile.permissoes.includes(tabId);
}

function applyPermissions() {
  document.querySelectorAll(".sidebar-nav .nav-btn[data-tab]").forEach((button) => {
    const tab = button.dataset.tab || "";

    if (tab === "boletins-privados" || tab === "treinamentos" || tab === "rh" ||
        tab === "colaboradores" || tab === "ajustes" || tab === "ativos") {
      button.style.display = state.isAdmin ? "" : "none";
      return;
    }

    button.style.display = allowedTab(tab) ? "" : "none";

    if (!button.dataset.csvGuarded) {
      button.dataset.csvGuarded = "1";
      button.addEventListener("click", (event) => {
        const requested = button.dataset.tab || "";
        if (!allowedTab(requested)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          alert("Seu acesso não permite abrir esta área.");
        }
      }, true);
    }
  });

  document.querySelectorAll(".admin-only").forEach((element) => {
    element.style.display = state.isAdmin ? "" : "none";
  });

  const globalSearch = document.querySelector(".csv-home-search-wrap");
  if (globalSearch && !state.isAdmin) {
    const broadAccess = state.profile.permissoes.length >= 6;
    globalSearch.style.display = broadAccess ? "" : "none";
  }

  const badge = document.getElementById("user-role-badge");
  if (badge) {
    badge.textContent = state.isAdmin
      ? "Gestão Administrador"
      : `${state.profile.nome} • ${state.profile.setor}`;
  }

  ensureAccessManager();
  renderAccessUsers();
  renderBulletinDashboard();
}

function openCustomTab(tab, button, title) {
  document.querySelectorAll(".tab-content").forEach((item) => {
    item.style.display = "none";
    item.classList.remove("active");
  });

  document.querySelectorAll(".sidebar-nav .nav-btn").forEach((item) => {
    item.classList.remove("active");
  });

  tab.style.display = "block";
  tab.classList.add("active");
  button?.classList.add("active");

  const pageTitle = document.getElementById("page-title");
  if (pageTitle) pageTitle.textContent = title;

  const searchBox = document.getElementById("search-box");
  if (searchBox) searchBox.style.display = "none";
}

function permissionsMarkup(selected = []) {
  return TAB_OPTIONS.map((item) => `
    <label class="csv-permission-option">
      <input type="checkbox" name="csv-permission" value="${item.id}" ${selected.includes(item.id) ? "checked" : ""}>
      <span>
        <strong>${esc(item.label)}</strong>
        <small>Permitir visualização desta área</small>
      </span>
    </label>
  `).join("");
}

function ensureAccessManager() {
  if (!state.isAdmin) return;

  const nav = document.querySelector(".sidebar-nav");
  const main = document.querySelector(".main-content");
  if (!nav || !main) return;

  let button = document.getElementById("csv-nav-acessos");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.id = "csv-nav-acessos";
    button.className = "nav-btn admin-only";
    button.innerHTML = '<i class="ri-user-settings-line"></i> Acessos da Equipe';

    const collaboratorsButton = nav.querySelector('[data-tab="colaboradores"]');
    if (collaboratorsButton?.nextSibling) {
      nav.insertBefore(button, collaboratorsButton.nextSibling);
    } else {
      nav.appendChild(button);
    }
  }

  let tab = document.getElementById("tab-acessos-equipe");
  if (!tab) {
    tab = document.createElement("section");
    tab.id = "tab-acessos-equipe";
    tab.className = "tab-content csv-access-shell";
    tab.style.display = "none";
    tab.innerHTML = `
      <div class="csv-access-header">
        <div>
          <span class="csv-eyebrow"><i class="ri-shield-user-line"></i> Administração de acesso</span>
          <h2>Logins e permissões da equipe</h2>
          <p>Crie um usuário individual, defina a senha inicial e escolha exatamente quais áreas serão exibidas.</p>
        </div>
        <button type="button" class="btn-hover color-8" id="csv-reset-access-form">
          <i class="ri-add-line"></i> Novo acesso
        </button>
      </div>

      <div class="csv-access-layout">
        <form id="csv-access-form" class="csv-access-form">
          <input type="hidden" id="csv-access-uid">

          <div class="csv-form-title">
            <i class="ri-user-add-line"></i>
            <div>
              <strong id="csv-access-form-title">Cadastrar colaborador</strong>
              <small>A senha é salva somente no Firebase Authentication.</small>
            </div>
          </div>

          <label>Nome completo</label>
          <input class="form-input" id="csv-access-name" required placeholder="Ex.: Maria da Silva">

          <div class="csv-two-columns">
            <div>
              <label>Usuário de acesso</label>
              <input class="form-input" id="csv-access-user" required placeholder="Ex.: maria.silva">
            </div>
            <div>
              <label>Setor</label>
              <input class="form-input" id="csv-access-sector" required placeholder="Ex.: Recepção">
            </div>
          </div>

          <label>Senha inicial</label>
          <input class="form-input" type="password" id="csv-access-password" minlength="6" placeholder="Mínimo de 6 caracteres">
          <small class="csv-field-help" id="csv-password-help">A senha é obrigatória apenas na criação do acesso.</small>

          <div class="csv-permissions-title">Áreas permitidas</div>
          <div class="csv-permissions-grid" id="csv-permissions-grid">
            ${permissionsMarkup(["boletins"])}
          </div>

          <label class="csv-active-line">
            <input type="checkbox" id="csv-access-active" checked>
            <span>Conta ativa</span>
          </label>

          <button type="submit" class="btn-hover color-11 csv-save-access">
            <i class="ri-save-line"></i> Salvar acesso
          </button>
        </form>

        <div class="csv-access-list-panel">
          <div class="csv-list-toolbar">
            <div>
              <strong>Colaboradores com login</strong>
              <small id="csv-user-count">0 acessos cadastrados</small>
            </div>
            <input class="form-input" id="csv-user-search" placeholder="Pesquisar colaborador...">
          </div>
          <div id="csv-users-list" class="csv-users-list"></div>
        </div>
      </div>

      <div class="csv-security-note">
        <i class="ri-information-line"></i>
        <div>
          <strong>Importante</strong>
          <p>Esta etapa cria contas reais no Firebase Authentication e controla as áreas visíveis. A redefinição administrativa de senha e as regras finais de banco serão adicionadas em uma etapa separada com função segura de servidor.</p>
        </div>
      </div>
    `;

    main.appendChild(tab);

    tab.querySelector("#csv-access-form").addEventListener("submit", saveAccessUser);
    tab.querySelector("#csv-reset-access-form").addEventListener("click", resetAccessForm);
    tab.querySelector("#csv-user-search").addEventListener("input", renderAccessUsers);
  }

  button.style.display = "";
  if (!button.dataset.csvBound) {
    button.dataset.csvBound = "1";
    button.addEventListener("click", () => openCustomTab(tab, button, "Acessos da Equipe"));
  }
}

function getSelectedPermissions() {
  return [...document.querySelectorAll('input[name="csv-permission"]:checked')]
    .map((input) => input.value);
}

async function usernameExists(username, ignoreUid = "") {
  const snapshot = await getDocs(query(
    collection(db, "usuarios"),
    where("usuario", "==", username)
  ));

  return snapshot.docs.some((item) => item.id !== ignoreUid);
}

async function saveAccessUser(event) {
  event.preventDefault();

  if (!state.isAdmin) {
    alert("Somente a gestão pode cadastrar acessos.");
    return;
  }

  const uid = document.getElementById("csv-access-uid").value.trim();
  const name = document.getElementById("csv-access-name").value.trim();
  const username = normalize(document.getElementById("csv-access-user").value);
  const sector = document.getElementById("csv-access-sector").value.trim();
  const password = document.getElementById("csv-access-password").value;
  const active = document.getElementById("csv-access-active").checked;
  const permissions = getSelectedPermissions();

  if (!name || !username || !sector) {
    alert("Preencha nome, usuário e setor.");
    return;
  }

  if (!uid && password.length < 6) {
    alert("A senha inicial precisa ter pelo menos 6 caracteres.");
    return;
  }

  if (await usernameExists(username, uid)) {
    alert("Este nome de usuário já está em uso.");
    return;
  }

  const submit = event.submitter;
  const original = submit?.innerHTML || "";
  if (submit) {
    submit.disabled = true;
    submit.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Salvando...';
  }

  try {
    let targetUid = uid;
    let email = `${username}@${INTERNAL_DOMAIN}`;

    if (!targetUid) {
      const credential = await createUserWithEmailAndPassword(creatorAuth, email, password);
      targetUid = credential.user.uid;
      await signOut(creatorAuth);
    } else {
      const existing = state.usuarios.find((item) => item.id === targetUid);
      email = existing?.data?.email || email;
    }

    const profile = {
      nome: name,
      usuario: username,
      email,
      setor: sector,
      ativo: active,
      admin: false,
      permissoes: permissions,
      atualizadoEm: serverTimestamp()
    };

    if (!uid) profile.criadoEm = serverTimestamp();

    await setDoc(doc(db, "usuarios", targetUid), profile, { merge: true });
    await setDoc(doc(db, "colaboradores", targetUid), {
      "Nome Completo do Colaborador": name,
      "Setor da Clínica": sector,
      "PIN de Acesso (Treinamentos)": "",
      usuarioAuth: username,
      uidAuth: targetUid,
      ativo: active
    }, { merge: true });

    alert(uid ? "Permissões atualizadas com sucesso." : `Acesso criado. Usuário: ${username}`);
    resetAccessForm();
  } catch (error) {
    console.error("Erro ao salvar acesso:", error);

    const messages = {
      "auth/email-already-in-use": "Este usuário já possui uma conta no Firebase.",
      "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
      "auth/invalid-email": "O nome de usuário gerou um e-mail interno inválido.",
      "permission-denied": "O Firebase recusou a gravação. Verifique as regras do Firestore."
    };

    alert(messages[error.code] || `Não foi possível salvar o acesso: ${error.message}`);
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.innerHTML = original;
    }
  }
}

function resetAccessForm() {
  state.editingUid = null;

  const form = document.getElementById("csv-access-form");
  if (!form) return;

  form.reset();
  document.getElementById("csv-access-uid").value = "";
  document.getElementById("csv-access-active").checked = true;
  document.getElementById("csv-access-form-title").textContent = "Cadastrar colaborador";
  document.getElementById("csv-access-user").disabled = false;
  document.getElementById("csv-access-password").disabled = false;
  document.getElementById("csv-access-password").required = true;
  document.getElementById("csv-password-help").textContent = "A senha é obrigatória apenas na criação do acesso.";
  document.getElementById("csv-permissions-grid").innerHTML = permissionsMarkup(["boletins"]);
}

window.csvEditAccessUser = function(uid) {
  const item = state.usuarios.find((user) => user.id === uid);
  if (!item) return;

  const data = item.data || {};
  state.editingUid = uid;

  document.getElementById("csv-access-uid").value = uid;
  document.getElementById("csv-access-name").value = data.nome || "";
  document.getElementById("csv-access-user").value = data.usuario || "";
  document.getElementById("csv-access-user").disabled = true;
  document.getElementById("csv-access-sector").value = data.setor || "";
  document.getElementById("csv-access-password").value = "";
  document.getElementById("csv-access-password").disabled = true;
  document.getElementById("csv-access-password").required = false;
  document.getElementById("csv-access-active").checked = data.ativo !== false;
  document.getElementById("csv-access-form-title").textContent = "Editar permissões";
  document.getElementById("csv-password-help").textContent = "A senha não é exibida nem armazenada no banco.";
  document.getElementById("csv-permissions-grid").innerHTML = permissionsMarkup(
    Array.isArray(data.permissoes) ? data.permissoes : []
  );

  document.getElementById("tab-acessos-equipe")?.scrollIntoView({ behavior: "smooth", block: "start" });
};

window.csvToggleAccessUser = async function(uid, active) {
  if (!state.isAdmin) return;

  const item = state.usuarios.find((user) => user.id === uid);
  if (!item) return;

  const action = active ? "reativar" : "desativar";
  if (!confirm(`Deseja ${action} o acesso de ${item.data.nome || item.data.usuario}?`)) return;

  try {
    await updateDoc(doc(db, "usuarios", uid), {
      ativo: active,
      atualizadoEm: serverTimestamp()
    });
    await setDoc(doc(db, "colaboradores", uid), { ativo: active }, { merge: true });
  } catch (error) {
    alert(`Não foi possível ${action} o acesso: ${error.message}`);
  }
};

function renderAccessUsers() {
  const container = document.getElementById("csv-users-list");
  if (!container || !state.isAdmin) return;

  const search = normalize(document.getElementById("csv-user-search")?.value || "");
  const users = state.usuarios
    .filter((item) => !item.data.admin)
    .filter((item) => {
      const haystack = normalize(`${item.data.nome || ""} ${item.data.usuario || ""} ${item.data.setor || ""}`);
      return !search || haystack.includes(search);
    })
    .sort((a, b) => String(a.data.nome || "").localeCompare(String(b.data.nome || "")));

  const count = document.getElementById("csv-user-count");
  if (count) count.textContent = `${users.length} acesso(s) cadastrado(s)`;

  if (!users.length) {
    container.innerHTML = `
      <div class="csv-empty-state">
        <i class="ri-user-search-line"></i>
        <strong>Nenhum acesso encontrado</strong>
        <span>Cadastre o primeiro colaborador pelo formulário ao lado.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = users.map(({ id, data }) => {
    const permissions = Array.isArray(data.permissoes) ? data.permissoes : [];
    const permissionLabels = permissions
      .map((permission) => TAB_OPTIONS.find((item) => item.id === permission)?.label || permission)
      .slice(0, 4);

    return `
      <article class="csv-user-card ${data.ativo === false ? "is-inactive" : ""}">
        <div class="csv-user-avatar">${esc((data.nome || "C").charAt(0).toUpperCase())}</div>
        <div class="csv-user-main">
          <div class="csv-user-head">
            <div>
              <strong>${esc(data.nome || "Colaborador")}</strong>
              <span>@${esc(data.usuario || "")} • ${esc(data.setor || "Sem setor")}</span>
            </div>
            <span class="csv-user-status ${data.ativo === false ? "off" : "on"}">
              ${data.ativo === false ? "Desativado" : "Ativo"}
            </span>
          </div>

          <div class="csv-user-permissions">
            ${permissionLabels.map((label) => `<span>${esc(label)}</span>`).join("")}
            ${permissions.length > 4 ? `<span>+${permissions.length - 4}</span>` : ""}
          </div>

          <div class="csv-user-actions">
            <button type="button" onclick="window.csvEditAccessUser('${id}')">
              <i class="ri-edit-line"></i> Editar permissões
            </button>
            <button type="button" class="${data.ativo === false ? "positive" : "danger"}"
              onclick="window.csvToggleAccessUser('${id}', ${data.ativo === false ? "true" : "false"})">
              <i class="${data.ativo === false ? "ri-checkbox-circle-line" : "ri-forbid-2-line"}"></i>
              ${data.ativo === false ? "Reativar" : "Desativar"}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function ensureBulletinDashboard() {
  const tab = document.getElementById("tab-boletins");
  if (!tab || document.getElementById("csv-bulletin-dashboard")) return;

  const legacy = document.createElement("div");
  legacy.id = "csv-boletins-legacy";
  legacy.className = "csv-boletins-legacy";

  [...tab.children].forEach((child) => legacy.appendChild(child));

  const dashboard = document.createElement("div");
  dashboard.id = "csv-bulletin-dashboard";
  dashboard.className = "csv-bulletin-dashboard";
  dashboard.innerHTML = `
    <div class="csv-bulletin-header">
      <div>
        <span class="csv-eyebrow"><i class="ri-file-chart-line"></i> Central de informativos</span>
        <h2 id="csv-bulletin-title">Meus boletins</h2>
        <p id="csv-bulletin-subtitle">Boletins gerais e direcionados reunidos em uma única visão.</p>
      </div>
      <button type="button" id="csv-toggle-boletin-management" class="btn-hover color-8" style="display:none">
        <i class="ri-settings-3-line"></i> Gerenciar cadastros
      </button>
    </div>

    <div class="csv-bulletin-stats">
      <article><span>Total atribuído</span><strong id="csv-stat-total">0</strong><i class="ri-file-list-3-line"></i></article>
      <article><span>Leituras concluídas</span><strong id="csv-stat-read">0</strong><i class="ri-checkbox-circle-line"></i></article>
      <article><span>Pendências</span><strong id="csv-stat-pending">0</strong><i class="ri-time-line"></i></article>
      <article><span>Índice de leitura</span><strong id="csv-stat-rate">0%</strong><i class="ri-line-chart-line"></i></article>
    </div>

    <div class="csv-bulletin-overview">
      <section class="csv-bulletin-chart-card">
        <div class="csv-card-heading">
          <div>
            <strong>Desempenho dos últimos meses</strong>
            <span>Comparativo entre informativos atribuídos e lidos.</span>
          </div>
        </div>
        <div class="csv-chart-wrap"><canvas id="csv-bulletin-chart"></canvas></div>
      </section>

      <aside class="csv-performance-callout" id="csv-performance-callout">
        <i class="ri-sparkling-2-line"></i>
        <strong>Acompanhamento de leitura</strong>
        <p>Os resultados aparecerão assim que os informativos forem carregados.</p>
      </aside>
    </div>

    <section id="csv-admin-reading-panel" class="csv-admin-reading-panel" style="display:none">
      <div class="csv-card-heading">
        <div>
          <strong>Resultado geral da equipe</strong>
          <span>Quem está em dia e quem precisa de acompanhamento.</span>
        </div>
        <input id="csv-reading-search" class="form-input" placeholder="Pesquisar colaborador...">
      </div>
      <div id="csv-reading-team-list" class="csv-reading-team-list"></div>
    </section>

    <section class="csv-bulletin-list-card">
      <div class="csv-card-heading">
        <div>
          <strong id="csv-list-title">Informativos disponíveis</strong>
          <span>Gerais e individuais, organizados pela data mais recente.</span>
        </div>
        <div class="csv-bulletin-filters">
          <button type="button" data-filter="all" class="active">Todos</button>
          <button type="button" data-filter="pending">Pendentes</button>
          <button type="button" data-filter="read">Lidos</button>
        </div>
      </div>
      <div id="csv-unified-bulletin-list" class="csv-unified-bulletin-list"></div>
    </section>
  `;

  tab.appendChild(dashboard);
  tab.appendChild(legacy);
  legacy.style.display = "none";

  dashboard.querySelectorAll(".csv-bulletin-filters button").forEach((button) => {
    button.addEventListener("click", () => {
      dashboard.querySelectorAll(".csv-bulletin-filters button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      dashboard.dataset.filter = button.dataset.filter || "all";
      renderBulletinDashboard();
    });
  });

  dashboard.querySelector("#csv-reading-search").addEventListener("input", renderAdminReadingList);
  dashboard.querySelector("#csv-toggle-boletin-management").addEventListener("click", () => {
    const showing = legacy.style.display !== "none";
    legacy.style.display = showing ? "none" : "block";
    dashboard.querySelector("#csv-toggle-boletin-management").innerHTML = showing
      ? '<i class="ri-settings-3-line"></i> Gerenciar cadastros'
      : '<i class="ri-dashboard-line"></i> Voltar ao painel';
    if (!showing) legacy.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const navButton = document.querySelector('.nav-btn[data-tab="boletins"]');
  navButton?.addEventListener("click", () => setTimeout(renderBulletinDashboard, 20));
}

function parseDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return new Date(0);

  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T12:00:00`)
    : new Date(raw);

  return Number.isNaN(iso.getTime()) ? new Date(0) : iso;
}

function readerNames(item) {
  return new Set(
    (Array.isArray(item?.data?.leituras) ? item.data.leituras : [])
      .map((entry) => String(entry).split(" (")[0].trim())
      .filter(Boolean)
  );
}

function generalAssignedTo(item, profile) {
  const target = String(item?.data?.["Para quais Setores?"] || "Geral");
  if (!profile) return false;
  if (!target || target.toLowerCase().includes("geral")) return true;

  const sectors = target.split(",").map((value) => value.trim().toLowerCase());
  return sectors.includes(String(profile.setor || "").trim().toLowerCase());
}

function privateAssignedTo(item, profile) {
  return String(item?.data?.["Para qual Colaborador?"] || "").trim() === String(profile?.nome || "").trim();
}

function unifiedPersonalItems() {
  if (!state.profile) return [];

  const general = state.boletins
    .filter((item) => generalAssignedTo(item, state.profile))
    .map((item) => ({ ...item, collectionName: "boletins", kind: "Geral" }));

  const direct = state.privados
    .filter((item) => privateAssignedTo(item, state.profile))
    .map((item) => ({ ...item, collectionName: "boletins-privados", kind: "Direcionado" }));

  return [...general, ...direct].sort((a, b) => {
    const dateA = parseDate(a.data?.["Data de Publicação"]).getTime();
    const dateB = parseDate(b.data?.["Data de Publicação"]).getTime();
    return dateB - dateA;
  });
}

function assignedItemsForCollaborator(collaborator) {
  const profile = {
    nome: collaborator.nome,
    setor: collaborator.setor
  };

  const general = state.boletins
    .filter((item) => generalAssignedTo(item, profile))
    .map((item) => ({ ...item, collectionName: "boletins", kind: "Geral" }));

  const direct = state.privados
    .filter((item) => privateAssignedTo(item, profile))
    .map((item) => ({ ...item, collectionName: "boletins-privados", kind: "Direcionado" }));

  return [...general, ...direct];
}

function hasRead(item, name) {
  return readerNames(item).has(String(name || "").trim());
}

function recentMonths() {
  const result = [];
  const today = new Date();

  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
    result.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
    });
  }

  return result;
}

function updateChart(items, name) {
  const canvas = document.getElementById("csv-bulletin-chart");
  if (!canvas || typeof Chart === "undefined") return;

  const months = recentMonths();
  const totals = months.map(() => 0);
  const reads = months.map(() => 0);

  items.forEach((item) => {
    const date = parseDate(item.data?.["Data de Publicação"]);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const index = months.findIndex((month) => month.key === key);
    if (index < 0) return;

    totals[index] += 1;
    if (hasRead(item, name)) reads[index] += 1;
  });

  state.chart?.destroy?.();
  state.chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: months.map((month) => month.label),
      datasets: [
        {
          label: "Atribuídos",
          data: totals,
          borderColor: "#7c5bc4",
          backgroundColor: "rgba(124,91,196,.14)",
          tension: 0.38,
          fill: true
        },
        {
          label: "Lidos",
          data: reads,
          borderColor: "#23a36d",
          backgroundColor: "rgba(35,163,109,.10)",
          tension: 0.38,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { usePointStyle: true, boxWidth: 8 }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
        x: { grid: { display: false } }
      }
    }
  });
}


function updateAdminChart(collaborators) {
  const canvas = document.getElementById("csv-bulletin-chart");
  if (!canvas || typeof Chart === "undefined") return;

  const months = recentMonths();
  const totals = months.map(() => 0);
  const reads = months.map(() => 0);

  collaborators.forEach((collaborator) => {
    assignedItemsForCollaborator(collaborator).forEach((item) => {
      const date = parseDate(item.data?.["Data de Publicação"]);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const index = months.findIndex((month) => month.key === key);
      if (index < 0) return;

      totals[index] += 1;
      if (hasRead(item, collaborator.nome)) reads[index] += 1;
    });
  });

  state.chart?.destroy?.();
  state.chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: months.map((month) => month.label),
      datasets: [
        {
          label: "Atribuições",
          data: totals,
          borderColor: "#7c5bc4",
          backgroundColor: "rgba(124,91,196,.14)",
          tension: 0.38,
          fill: true
        },
        {
          label: "Leituras",
          data: reads,
          borderColor: "#23a36d",
          backgroundColor: "rgba(35,163,109,.10)",
          tension: 0.38,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { usePointStyle: true, boxWidth: 8 }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
        x: { grid: { display: false } }
      }
    }
  });
}

function performanceCallout(rate, pending, total) {
  const callout = document.getElementById("csv-performance-callout");
  if (!callout) return;

  let icon = "ri-sparkling-2-line";
  let title = "Comece acompanhando seus informativos";
  let text = "Os resultados aparecerão conforme as leituras forem registradas.";
  let level = "neutral";

  if (total > 0 && rate >= 90) {
    icon = "ri-trophy-line";
    title = "Excelente desempenho";
    text = `Você está com ${rate}% de leitura. Continue mantendo esse ritmo de organização.`;
    level = "positive";
  } else if (total > 0 && rate >= 70) {
    icon = "ri-line-chart-line";
    title = "Bom ritmo de leitura";
    text = `Seu índice está em ${rate}%. Restam ${pending} informativo(s) para colocar em dia.`;
    level = "attention";
  } else if (total > 0) {
    icon = "ri-alarm-warning-line";
    title = "Atenção às leituras pendentes";
    text = `Há ${pending} informativo(s) aguardando leitura. Organize um momento para revisar os conteúdos.`;
    level = "warning";
  }

  callout.className = `csv-performance-callout ${level}`;
  callout.innerHTML = `<i class="${icon}"></i><strong>${title}</strong><p>${text}</p>`;
}

function renderBulletinList(items, name) {
  const container = document.getElementById("csv-unified-bulletin-list");
  const dashboard = document.getElementById("csv-bulletin-dashboard");
  if (!container || !dashboard) return;

  const filter = dashboard.dataset.filter || "all";
  const filtered = items.filter((item) => {
    const read = hasRead(item, name);
    if (filter === "read") return read;
    if (filter === "pending") return !read;
    return true;
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div class="csv-empty-state">
        <i class="ri-inbox-archive-line"></i>
        <strong>Nenhum informativo nesta visualização</strong>
        <span>Altere o filtro ou aguarde novos comunicados.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((item) => {
    const data = item.data || {};
    const title = data["Título do Informativo"] || data["Título do Documento"] || "Informativo";
    const type = data["Tipo (Urgente, Norma, Regra, etc)"] || "Informativo";
    const motive = data["Motivo"] || "Sem motivo informado";
    const date = data["Data de Publicação"] || "Sem data";
    const read = hasRead(item, name);
    const material = String(data["Links dos Materiais (1 por linha)"] || "").split("\n").map((value) => value.trim()).filter(Boolean)[0];

    return `
      <article class="csv-bulletin-item ${read ? "is-read" : "is-pending"}">
        <div class="csv-bulletin-icon">
          <i class="${item.kind === "Direcionado" ? "ri-user-heart-line" : "ri-megaphone-line"}"></i>
        </div>
        <div class="csv-bulletin-item-main">
          <div class="csv-bulletin-item-top">
            <div>
              <span class="csv-kind-badge">${item.kind}</span>
              <span class="csv-type-badge">${esc(type)}</span>
            </div>
            <span class="csv-read-badge ${read ? "done" : "pending"}">
              <i class="${read ? "ri-checkbox-circle-line" : "ri-time-line"}"></i>
              ${read ? "Lido" : "Pendente"}
            </span>
          </div>
          <h3>${esc(title)}</h3>
          <p>${esc(motive)}</p>
          <div class="csv-bulletin-meta">
            <span><i class="ri-calendar-line"></i> ${esc(date)}</span>
            <span><i class="ri-user-line"></i> ${item.kind}</span>
          </div>
        </div>
        <div class="csv-bulletin-actions">
          ${material ? `<button type="button" onclick="window.abrirMidiaFlutuante('${esc(material)}', '${esc(title)}')"><i class="ri-eye-line"></i> Abrir</button>` : ""}
          ${!read && !state.isAdmin ? `<button type="button" class="primary" onclick="window.csvMarkBulletinRead('${item.collectionName}', '${item.id}')"><i class="ri-check-double-line"></i> Marcar como lido</button>` : ""}
          ${state.isAdmin ? `<button type="button" onclick="window.abrirListaLeituras('${item.id}', '${item.collectionName}')"><i class="ri-group-line"></i> Ver leituras</button>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

window.csvMarkBulletinRead = async function(collectionName, id) {
  if (!state.profile || state.isAdmin) return;

  const item = [...state.boletins, ...state.privados].find((entry) => entry.id === id);
  if (!item || hasRead(item, state.profile.nome)) return;

  const record = `${state.profile.nome} (${new Date().toLocaleString("pt-BR")} | Por: ${state.profile.email})`;

  try {
    await updateDoc(doc(db, collectionName, id), {
      leituras: arrayUnion(record)
    });
  } catch (error) {
    alert(`Não foi possível registrar a leitura: ${error.message}`);
  }
};

function collaboratorsForAnalytics() {
  const map = new Map();

  state.colaboradores.forEach((item) => {
    const data = item.data || {};
    const name = String(data["Nome Completo do Colaborador"] || data.nome || "").trim();
    if (!name) return;

    map.set(name, {
      id: item.id,
      nome: name,
      setor: data["Setor da Clínica"] || data.setor || "Geral",
      ativo: data.ativo !== false
    });
  });

  state.usuarios.forEach((item) => {
    const data = item.data || {};
    if (data.admin || !data.nome) return;

    map.set(data.nome, {
      id: item.id,
      nome: data.nome,
      setor: data.setor || "Geral",
      ativo: data.ativo !== false
    });
  });

  return [...map.values()].filter((item) => item.ativo);
}

function adminAnalytics() {
  const collaborators = collaboratorsForAnalytics();
  let assigned = 0;
  let read = 0;

  collaborators.forEach((collaborator) => {
    const items = assignedItemsForCollaborator(collaborator);
    assigned += items.length;
    read += items.filter((item) => hasRead(item, collaborator.nome)).length;
  });

  return {
    collaborators,
    assigned,
    read,
    pending: Math.max(0, assigned - read),
    rate: assigned ? Math.round((read / assigned) * 100) : 0
  };
}

function renderAdminReadingList() {
  const container = document.getElementById("csv-reading-team-list");
  if (!container || !state.isAdmin) return;

  const search = normalize(document.getElementById("csv-reading-search")?.value || "");
  const collaborators = collaboratorsForAnalytics()
    .map((collaborator) => {
      const items = assignedItemsForCollaborator(collaborator);
      const read = items.filter((item) => hasRead(item, collaborator.nome)).length;
      const total = items.length;
      const rate = total ? Math.round((read / total) * 100) : 100;
      return { ...collaborator, total, read, pending: Math.max(0, total - read), rate };
    })
    .filter((item) => !search || normalize(`${item.nome} ${item.setor}`).includes(search))
    .sort((a, b) => a.rate - b.rate || a.nome.localeCompare(b.nome));

  if (!collaborators.length) {
    container.innerHTML = '<div class="csv-empty-state"><i class="ri-team-line"></i><strong>Nenhum colaborador encontrado</strong></div>';
    return;
  }

  container.innerHTML = collaborators.map((item) => {
    const level = item.rate >= 90 ? "good" : item.rate >= 70 ? "medium" : "low";
    const message = item.rate >= 90 ? "Em dia" : item.rate >= 70 ? "Acompanhar" : "Requer atenção";

    return `
      <article class="csv-reading-person">
        <div class="csv-reading-avatar">${esc(item.nome.charAt(0).toUpperCase())}</div>
        <div class="csv-reading-person-main">
          <div class="csv-reading-person-head">
            <div><strong>${esc(item.nome)}</strong><span>${esc(item.setor)}</span></div>
            <span class="csv-reading-level ${level}">${message}</span>
          </div>
          <div class="csv-reading-progress"><span style="width:${item.rate}%"></span></div>
          <div class="csv-reading-numbers">
            <span>${item.read}/${item.total} lidos</span>
            <strong>${item.rate}%</strong>
            <span>${item.pending} pendente(s)</span>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderBulletinDashboard() {
  ensureBulletinDashboard();

  const dashboard = document.getElementById("csv-bulletin-dashboard");
  if (!dashboard || !state.profile) return;

  const managementButton = document.getElementById("csv-toggle-boletin-management");
  const adminPanel = document.getElementById("csv-admin-reading-panel");

  if (state.isAdmin) {
    const analytics = adminAnalytics();

    document.getElementById("csv-bulletin-title").textContent = "Painel geral de leituras";
    document.getElementById("csv-bulletin-subtitle").textContent = "Visão consolidada dos boletins gerais e direcionados de toda a equipe.";
    document.getElementById("csv-list-title").textContent = "Informativos publicados";

    if (managementButton) managementButton.style.display = "inline-flex";
    if (adminPanel) adminPanel.style.display = "block";

    document.getElementById("csv-stat-total").textContent = analytics.assigned;
    document.getElementById("csv-stat-read").textContent = analytics.read;
    document.getElementById("csv-stat-pending").textContent = analytics.pending;
    document.getElementById("csv-stat-rate").textContent = `${analytics.rate}%`;

    const allItems = [
      ...state.boletins.map((item) => ({ ...item, collectionName: "boletins", kind: "Geral" })),
      ...state.privados.map((item) => ({ ...item, collectionName: "boletins-privados", kind: "Direcionado" }))
    ].sort((a, b) => parseDate(b.data?.["Data de Publicação"]) - parseDate(a.data?.["Data de Publicação"]));

    updateAdminChart(analytics.collaborators);
    performanceCallout(analytics.rate, analytics.pending, analytics.assigned);
    renderAdminReadingList();
    renderBulletinList(allItems, "__admin__");
  } else {
    const items = unifiedPersonalItems();
    const read = items.filter((item) => hasRead(item, state.profile.nome)).length;
    const total = items.length;
    const pending = Math.max(0, total - read);
    const rate = total ? Math.round((read / total) * 100) : 0;

    document.getElementById("csv-bulletin-title").textContent = `Informativos de ${state.profile.nome}`;
    document.getElementById("csv-bulletin-subtitle").textContent = "Boletins gerais e direcionados reunidos em uma única visão.";

    if (managementButton) managementButton.style.display = "none";
    if (adminPanel) adminPanel.style.display = "none";

    document.getElementById("csv-stat-total").textContent = total;
    document.getElementById("csv-stat-read").textContent = read;
    document.getElementById("csv-stat-pending").textContent = pending;
    document.getElementById("csv-stat-rate").textContent = `${rate}%`;

    updateChart(items, state.profile.nome);
    performanceCallout(rate, pending, total);
    renderBulletinList(items, state.profile.nome);
  }
}

function subscribeData() {
  clearDataListeners();

  state.listeners.push(onSnapshot(collection(db, "boletins"), (snapshot) => {
    state.boletins = snapshot.docs.map((item) => ({ id: item.id, data: item.data() }));
    renderBulletinDashboard();
  }, (error) => console.warn("Boletins:", error)));

  const privateReference = state.isAdmin
    ? collection(db, "boletins-privados")
    : query(
        collection(db, "boletins-privados"),
        where("Para qual Colaborador?", "==", state.profile.nome)
      );

  state.listeners.push(onSnapshot(privateReference, (snapshot) => {
    state.privados = snapshot.docs.map((item) => ({ id: item.id, data: item.data() }));
    renderBulletinDashboard();
  }, (error) => console.warn("Boletins direcionados:", error)));

  state.listeners.push(onSnapshot(collection(db, "colaboradores"), (snapshot) => {
    state.colaboradores = snapshot.docs.map((item) => ({ id: item.id, data: item.data() }));
    renderAdminReadingList();
    renderBulletinDashboard();
  }, (error) => console.warn("Colaboradores:", error)));

  if (state.isAdmin) {
    state.listeners.push(onSnapshot(collection(db, "usuarios"), (snapshot) => {
      state.usuarios = snapshot.docs.map((item) => ({ id: item.id, data: item.data() }));
      renderAccessUsers();
      renderAdminReadingList();
      renderBulletinDashboard();
    }, (error) => console.warn("Usuários:", error)));
  }
}

async function handleAuthenticatedUser(user) {
  if (!user) {
    state.profile = null;
    state.isAdmin = false;
    state.boletins = [];
    state.privados = [];
    state.colaboradores = [];
    state.usuarios = [];
    clearDataListeners();
    return;
  }

  try {
    const profile = await loadProfile(user);

    if (!profile) {
      alert("Este login existe no Firebase, mas ainda não possui um perfil de acesso no painel.");
      await signOut(auth);
      return;
    }

    if (!profile.ativo && !profile.admin) {
      alert("Este acesso está desativado. Procure a gestão da clínica.");
      await signOut(auth);
      return;
    }

    state.profile = profile;
    state.isAdmin = profile.admin === true;
    window.csvPerfilAtual = profile;

    applyPermissions();
    subscribeData();

    if (!state.isAdmin && !allowedTab("boletins")) {
      const bulletinButton = document.querySelector('.nav-btn[data-tab="boletins"]');
      if (bulletinButton) bulletinButton.style.display = "none";
    }

    console.log(`CSV Access ${CSV_ACCESS_VERSION}:`, profile);
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
    alert("Não foi possível carregar as permissões deste usuário.");
  }
}

function init() {
  applyTheme(currentTheme());
  ensureThemeToggle();
  installSmartLogin();
  ensureBulletinDashboard();

  onAuthStateChanged(auth, handleAuthenticatedUser);

  window.addEventListener("online", () => setLoginStatus('<i class="ri-wifi-line"></i> Sistema conectado', "online"));
  window.addEventListener("offline", () => setLoginStatus('<i class="ri-wifi-off-line"></i> Modo offline disponível', "offline"));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

