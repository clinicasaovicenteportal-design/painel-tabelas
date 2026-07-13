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
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  arrayUnion,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const CSV_PHASE2_VERSION = "7.9.5";
const INTERNAL_DOMAIN = "acesso.csv.app";
const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const creatorName = "csv-phase2-account-creator";
const creatorApp = getApps().find((item) => item.name === creatorName) || initializeApp(app.options, creatorName);
const creatorAuth = getAuth(creatorApp);
const creatorDb = getFirestore(creatorApp);

const ACCESS_AREAS = [
  { id: "boletins", label: "Boletins e informativos", icon: "ri-megaphone-line" },
  { id: "corpo-clinico", label: "Corpo clínico", icon: "ri-team-line" },
  { id: "agenda-corpo-clinico", label: "Agenda do corpo clínico", icon: "ri-calendar-schedule-line" },
  { id: "convenios", label: "Convênios", icon: "ri-shield-cross-line" },

];

const HIDDEN_NAV_TABS = ["ensino", "treinamentos", "rh", "boletins-privados"];

const state = {
  user: null,
  profile: null,
  isAdmin: false,
  collaborators: [],
  users: [],
  bulletins: [],
  privateBulletins: [],
  unsubscribers: [],
  bulletinChart: null,
  performanceChart: null,
  displayItems: new Map(),
  editingBulletinKey: "",
  teamSearch: "",
  teamSector: "",
  performanceFilters: {
    search: "",
    sector: "",
    status: "all",
    order: "worst",
    person: ""
  }
};

window.csvPhase2State = state;

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

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function internalEmail(username = "") {
  const raw = String(username || "").trim().toLowerCase();
  return raw.includes("@") ? raw : `${normalize(raw)}@${INTERNAL_DOMAIN}`;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function unique(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function dateToday() {
  return new Date().toISOString().slice(0, 10);
}

function parseDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return new Date(0);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`) : new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function readNames(item) {
  return new Set(
    (Array.isArray(item?.data?.leituras) ? item.data.leituras : [])
      .map((entry) => String(entry).split(" (")[0].trim())
      .filter(Boolean)
  );
}

function hasRead(item, name) {
  const normalizedName = normalizeText(name);

  if (readNames(item).has(String(name || "").trim())) {
    return true;
  }

  const structured =
    window.csvBulletinIntelligence?.readings || [];

  return structured.some((entry) => {
    const data = entry?.data || {};

    return (
      data.bulletinId === item?.id &&
      (!data.collectionName ||
        data.collectionName === item?.collectionName) &&
      normalizeText(data.nome || "") === normalizedName
    );
  });
}

function collaboratorName(item) {
  return String(item?.data?.["Nome Completo do Colaborador"] || item?.data?.nome || "").trim();
}

function collaboratorSector(item) {
  return String(item?.data?.["Setor da Clínica"] || item?.data?.setor || "Geral").trim() || "Geral";
}

function activeCollaborators() {
  const map = new Map();

  state.collaborators.forEach((item) => {
    const name = collaboratorName(item);
    if (!name) return;
    map.set(normalizeText(name), {
      id: item.id,
      name,
      sector: collaboratorSector(item),
      active: item.data?.ativo !== false,
      raw: item
    });
  });

  state.users.forEach((item) => {
    const data = item.data || {};
    if (data.admin || data.removido === true || !data.nome) return;
    const key = normalizeText(data.nome);
    const existing = map.get(key) || {};
    map.set(key, {
      ...existing,
      id: existing.id || item.id,
      name: data.nome,
      sector: data.setor || existing.sector || "Geral",
      active: data.ativo !== false,
      user: item,
      raw: existing.raw || null
    });
  });

  return [...map.values()]
    .filter((item) => item.active)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function allCollaboratorsMerged() {
  const map = new Map();

  state.collaborators.forEach((item) => {
    const name = collaboratorName(item);
    if (!name) return;
    map.set(normalizeText(name), {
      collaboratorId: item.id,
      collaboratorData: item.data || {},
      name,
      sector: collaboratorSector(item),
      userId: "",
      userData: null
    });
  });

  state.users.forEach((item) => {
    const data = item.data || {};
    if (data.admin || data.removido === true || !data.nome) return;
    const key = normalizeText(data.nome);
    const existing = map.get(key) || {
      collaboratorId: item.id,
      collaboratorData: {},
      name: data.nome,
      sector: data.setor || "Geral"
    };
    map.set(key, {
      ...existing,
      name: data.nome || existing.name,
      sector: data.setor || existing.sector,
      userId: item.id,
      userData: data
    });
  });

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function findUserForCollaborator(record) {
  if (record.userId) return state.users.find((item) => item.id === record.userId) || null;
  const linkedUid = record.collaboratorData?.uidAuth;
  if (linkedUid) return state.users.find((item) => item.id === linkedUid) || null;
  return state.users.find((item) => normalizeText(item.data?.nome) === normalizeText(record.name)) || null;
}


function setPhase2LoginStatus(message, kind = "") {
  const status = document.getElementById("csv-login-status");
  if (!status) return;
  status.className = `csv-login-status${kind ? ` ${kind}` : ""}`;
  status.innerHTML = message;
}

function installPhase2Login() {
  const button = document.getElementById("btn-login");
  const form = document.getElementById("form-login");
  const loginInput = document.getElementById("email");
  const passwordInput = document.getElementById("senha");

  if (!button || !loginInput || !passwordInput) return;

  loginInput.placeholder = "Usuário ou e-mail";
  loginInput.setAttribute("autocomplete", "username");

  const loginHandler = async (event) => {
    event?.preventDefault?.();

    if (button.dataset.csv2Loading === "1") return;

    const login = loginInput.value.trim();
    const password = passwordInput.value;

    if (!login || !password) {
      setPhase2LoginStatus(
        '<i class="ri-error-warning-line"></i> Informe o usuário e a senha.',
        "error"
      );
      return;
    }

    const email = internalEmail(login);
    const original = button.innerHTML;

    button.dataset.csv2Loading = "1";
    button.disabled = true;
    button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Entrando...';
    setPhase2LoginStatus(
      '<i class="ri-shield-keyhole-line"></i> Validando acesso...',
      ""
    );

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("CSV Fase 2 — erro de login:", error);
      setPhase2LoginStatus(
        '<i class="ri-error-warning-line"></i> Usuário ou senha incorretos.',
        "error"
      );
    } finally {
      button.dataset.csv2Loading = "0";
      button.disabled = false;
      button.innerHTML = original;
    }
  };

  window.efetuarLogin = loginHandler;
  button.onclick = loginHandler;
  if (form) form.onsubmit = loginHandler;
}


function applyHomeShortcutPermissions() {
  const home = document.getElementById("tab-home");
  if (!home || !state.profile) return;

  const permissions = new Set(state.profile.permissions || []);

  home.querySelectorAll("[onclick]").forEach((element) => {
    const handler = element.getAttribute("onclick") || "";
    const match = handler.match(/irParaAba\(['"]([^'"]+)['"]\)/);
    if (!match) return;

    const tab = match[1];
    const allowed = state.isAdmin || tab === "home" || permissions.has(tab) || (tab === "corpo-clinico" && permissions.has("agenda-corpo-clinico"));
    element.style.display = allowed ? "" : "none";
  });
}

function applyPhase2Permissions() {
  if (!state.profile) return;

  const permissions = new Set(
    Array.isArray(state.profile.permissions)
      ? state.profile.permissions
      : []
  );

  document.querySelectorAll(".sidebar-nav .nav-btn[data-tab]").forEach((button) => {
    const tab = button.dataset.tab || "";

    const adminOnlyTabs = new Set([
      "colaboradores",
      "ajustes",
      "ativos",
      "boletins-privados",
      "treinamentos",
      "ensino",
      "rh"
    ]);

    let visible = false;

    if (state.isAdmin) {
      visible = true;
    } else if (HIDDEN_NAV_TABS.includes(tab)) {
      visible = false;
    } else if (tab === "home") {
      visible = true;
    } else if (adminOnlyTabs.has(tab)) {
      visible = false;
    } else {
      visible = permissions.has(tab) || (tab === "corpo-clinico" && permissions.has("agenda-corpo-clinico"));
    }

    button.style.display = visible ? "" : "none";

    if (!button.dataset.csv2PermissionGuard) {
      button.dataset.csv2PermissionGuard = "1";
      button.addEventListener("click", (event) => {
        if (!state.profile || state.isAdmin) return;

        const requested = button.dataset.tab || "";
        const currentPermissions = new Set(state.profile.permissions || []);
        const allowed =
          requested === "home" ||
          (!HIDDEN_NAV_TABS.includes(requested) &&
            !adminOnlyTabs.has(requested) &&
            (currentPermissions.has(requested) || (requested === "corpo-clinico" && currentPermissions.has("agenda-corpo-clinico"))));

        if (!allowed) {
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

  const badge = document.getElementById("user-role-badge");
  if (badge) {
    badge.textContent = state.isAdmin
      ? "Gestão Administrador"
      : `${state.profile.name} • ${state.profile.sector}`;
  }

  const accessButton = document.getElementById("csv-nav-acessos");
  if (accessButton) accessButton.style.display = state.isAdmin ? "" : "none";

  applyHomeShortcutPermissions();
}


async function loadProfile(user) {
  if (!user) return null;

  const cacheKey = `csv-offline-profile:${user.uid}`;
  const legacyAdmin = String(user.email || "")
    .toLowerCase()
    .includes("@clinica");

  const readCachedProfile = () => {
    try {
      const cached = JSON.parse(
        localStorage.getItem(cacheKey) || "null"
      );

      return cached &&
        cached.uid === user.uid
        ? cached
        : null;
    } catch (_) {
      return null;
    }
  };

  const saveCachedProfile = (profile) => {
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify(profile)
      );
    } catch (_) {}

    return profile;
  };

  let snapshot = null;

  try {
    snapshot = await getDoc(
      doc(db, "usuarios", user.uid)
    );
  } catch (error) {
    const cached = readCachedProfile();

    if (cached) {
      console.info(
        "CSV Fase 2: perfil carregado do cache offline."
      );
      return cached;
    }

    if (!legacyAdmin) throw error;
  }

  if (snapshot?.exists()) {
    const data = snapshot.data() || {};

    return saveCachedProfile({
      uid: user.uid,
      email: user.email || data.email || "",
      name:
        data.nome ||
        user.email?.split("@")[0] ||
        "Colaborador",
      username:
        data.usuario ||
        user.email?.split("@")[0] ||
        "",
      sector: data.setor || "Geral",
      active: data.ativo !== false,
      admin: data.admin === true || legacyAdmin,
      permissions:
        Array.isArray(data.permissoes)
          ? data.permissoes
          : []
    });
  }

  const cached = readCachedProfile();
  if (cached) return cached;

  if (legacyAdmin) {
    return saveCachedProfile({
      uid: user.uid,
      email: user.email || "",
      name: "Gestão Administrador",
      username:
        user.email?.split("@")[0] ||
        "gestao",
      sector: "Gestão",
      active: true,
      admin: true,
      permissions:
        ACCESS_AREAS.map((item) => item.id)
    });
  }

  return null;
}

function cleanupListeners() {
  state.unsubscribers.forEach((unsubscribe) => {
    try { unsubscribe?.(); } catch (_) {}
  });
  state.unsubscribers = [];
}


function hideObsoleteNavigation() {
  if (state.isAdmin) {
    document.querySelectorAll(".sidebar-nav .nav-btn[data-tab]").forEach((button) => {
      button.classList.remove("csv2-hidden-nav");
      button.style.removeProperty("display");
    });

    const adminAccessButton = document.getElementById("csv-nav-acessos");
    if (adminAccessButton) {
      adminAccessButton.classList.remove("csv2-hidden-nav");
      adminAccessButton.style.removeProperty("display");
    }

    return;
  }
  HIDDEN_NAV_TABS.forEach((tabId) => {
    document.querySelectorAll(`.nav-btn[data-tab="${tabId}"]`).forEach((button) => {
      if (!button.classList.contains("csv2-hidden-nav")) {
        button.classList.add("csv2-hidden-nav");
      }
      if (button.style.display !== "none") {
        button.style.setProperty("display", "none", "important");
      }
    });
  });

  const accessButton = document.getElementById("csv-nav-acessos");
  if (accessButton) {
    if (!accessButton.classList.contains("csv2-hidden-nav")) {
      accessButton.classList.add("csv2-hidden-nav");
    }
    if (accessButton.style.display !== "none") {
      accessButton.style.setProperty("display", "none", "important");
    }
  }

  const bulletinButton = document.querySelector('.nav-btn[data-tab="boletins"]');
  if (
    bulletinButton &&
    !bulletinButton.textContent.includes("Boletins Gerais")
  ) {
    bulletinButton.innerHTML =
      '<i class="ri-megaphone-line"></i> Boletins Gerais';
  }
}

function keepNavigationClean() {
  hideObsoleteNavigation();

  const nav = document.querySelector(".sidebar-nav");
  if (!nav || nav.dataset.csv2Observed) return;

  nav.dataset.csv2Observed = "1";

  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      hideObsoleteNavigation();
      if (state.profile) applyPhase2Permissions();
    });
  }).observe(nav, {
    childList: true,
    subtree: true
  });
}


function roundRobotLogo() {
  document.documentElement.classList.add("csv2-round-robot-logo");
}

function permissionMarkup(selected = [], prefix = "csv2-perm") {
  const allSelected = ACCESS_AREAS.every((item) => selected.includes(item.id));
  return `
    <label class="csv2-permission-all">
      <input type="checkbox" data-permission-all="${prefix}" ${allSelected ? "checked" : ""}>
      <span><i class="ri-apps-2-line"></i><strong>Acesso a todas as áreas</strong><small>Marca ou desmarca todas as opções abaixo.</small></span>
    </label>
    <div class="csv2-permission-grid">
      ${ACCESS_AREAS.map((area) => `
        <label class="csv2-permission-item">
          <input type="checkbox" name="${prefix}" value="${area.id}" ${selected.includes(area.id) ? "checked" : ""}>
          <span><i class="${area.icon}"></i>${esc(area.label)}</span>
        </label>
      `).join("")}
    </div>
  `;
}

function bindPermissionAll(container) {
  if (!container) return;
  container.querySelectorAll("[data-permission-all]").forEach((master) => {
    if (master.dataset.bound) return;
    master.dataset.bound = "1";
    master.addEventListener("change", () => {
      const prefix = master.dataset.permissionAll;
      container.querySelectorAll(`input[name="${prefix}"]`).forEach((input) => {
        input.checked = master.checked;
      });
    });
  });
}

function selectedPermissions(container, prefix) {
  return [...container.querySelectorAll(`input[name="${prefix}"]:checked`)].map((input) => input.value);
}

function sectorsList() {
  return unique(allCollaboratorsMerged().map((item) => item.sector)).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function ensureTeamManager() {
  if (!state.isAdmin) return;
  const tab = document.getElementById("tab-colaboradores");
  if (!tab) return;

  if (!document.getElementById("csv2-team-root")) {
    const legacyHtml = tab.innerHTML;
    tab.innerHTML = `
      <div id="csv2-team-legacy" class="csv2-legacy-hidden">${legacyHtml}</div>
      <div id="csv2-team-root" class="csv2-team-root">
        <header class="csv2-page-header">
          <div>
            <span class="csv2-eyebrow"><i class="ri-team-line"></i> Gestão de colaboradores</span>
            <h2>Equipe, logins e permissões</h2>
            <p>Aproveite os colaboradores já cadastrados, crie os acessos que faltam e escolha quais áreas cada pessoa poderá visualizar.</p>
          </div>
          <div class="csv2-header-actions">
            <button type="button" class="csv2-button secondary" id="csv2-bulk-access-button"><i class="ri-user-follow-line"></i> Preparar acessos pendentes</button>
            <button type="button" class="csv2-button primary" id="csv2-add-collaborator-button"><i class="ri-user-add-line"></i> Adicionar colaborador</button>
          </div>
        </header>

        <section class="csv2-team-summary">
          <article><i class="ri-team-line"></i><span>Colaboradores</span><strong id="csv2-team-total">0</strong></article>
          <article><i class="ri-shield-user-line"></i><span>Com acesso</span><strong id="csv2-team-with-access">0</strong></article>
          <article><i class="ri-user-unfollow-line"></i><span>Sem acesso</span><strong id="csv2-team-without-access">0</strong></article>
          <article><i class="ri-checkbox-circle-line"></i><span>Contas ativas</span><strong id="csv2-team-active">0</strong></article>
        </section>

        <section class="csv2-team-panel">
          <div class="csv2-team-toolbar">
            <div class="csv2-search-field"><i class="ri-search-line"></i><input id="csv2-team-search" placeholder="Pesquisar nome, usuário ou setor..."></div>
            <select id="csv2-team-sector"><option value="">Todos os setores</option></select>
          </div>
          <div id="csv2-team-list" class="csv2-team-list"></div>
        </section>
      </div>
    `;

    document.getElementById("csv2-add-collaborator-button")?.addEventListener("click", () => {
      if (typeof window.csvPolishOpenCollaborator === "function") {
        window.csvPolishOpenCollaborator();
      } else if (typeof window.abrirModal === "function") {
        window.abrirModal("colaboradores");
      }
    });
    document.getElementById("csv2-bulk-access-button")?.addEventListener("click", openBulkAccessModal);
    document.getElementById("csv2-team-search")?.addEventListener("input", (event) => {
      state.teamSearch = event.target.value;
      renderTeamManager();
    });
    document.getElementById("csv2-team-sector")?.addEventListener("change", (event) => {
      state.teamSector = event.target.value;
      renderTeamManager();
    });
  }

  renderTeamManager();
}

function renderTeamManager() {
  const list = document.getElementById("csv2-team-list");
  if (!list || !state.isAdmin) return;

  const records = allCollaboratorsMerged();
  const sectors = sectorsList();
  const sectorSelect = document.getElementById("csv2-team-sector");
  if (sectorSelect) {
    const current = sectorSelect.value;
    sectorSelect.innerHTML = '<option value="">Todos os setores</option>' + sectors.map((sector) => `<option value="${esc(sector)}">${esc(sector)}</option>`).join("");
    sectorSelect.value = sectors.includes(current) ? current : state.teamSector;
  }

  const enriched = records.map((record) => {
    const user = findUserForCollaborator(record);
    return {
      ...record,
      userId: user?.id || record.userId || "",
      userData: user?.data || record.userData || null
    };
  });

  const withAccess = enriched.filter((item) => item.userData).length;
  const active = enriched.filter((item) => item.userData && item.userData.ativo !== false).length;
  document.getElementById("csv2-team-total").textContent = enriched.length;
  document.getElementById("csv2-team-with-access").textContent = withAccess;
  document.getElementById("csv2-team-without-access").textContent = Math.max(0, enriched.length - withAccess);
  document.getElementById("csv2-team-active").textContent = active;

  const queryText = normalizeText(state.teamSearch);
  const filtered = enriched.filter((item) => {
    const matchesSector = !state.teamSector || item.sector === state.teamSector;
    const haystack = normalizeText(`${item.name} ${item.sector} ${item.userData?.usuario || ""}`);
    return matchesSector && (!queryText || haystack.includes(queryText));
  });

  if (!filtered.length) {
    list.innerHTML = '<div class="csv2-empty"><i class="ri-user-search-line"></i><strong>Nenhum colaborador encontrado</strong><span>Altere os filtros ou cadastre uma nova pessoa.</span></div>';
    return;
  }

  list.innerHTML = filtered.map((item) => {
    const key = encodeURIComponent(item.collaboratorId || item.userId || normalize(item.name));
    const user = item.userData;
    const permissions = Array.isArray(user?.permissoes) ? user.permissoes : ["boletins"];
    const username = user?.usuario || item.collaboratorData?.usuarioAuth || normalize(item.name);
    const activeAccount = user ? user.ativo !== false : false;
    const prefix = `csv2-row-perm-${key}`;

    return `
      <article class="csv2-team-row ${user ? "has-access" : "without-access"}" data-team-key="${key}">
        <button type="button" class="csv2-team-row-summary" onclick="window.csv2ToggleTeamRow('${key}')">
          <span class="csv2-team-avatar">${esc(item.name.charAt(0).toUpperCase())}</span>
          <span class="csv2-team-identity"><strong>${esc(item.name)}</strong><small>${esc(item.sector)}</small></span>
          <span class="csv2-team-login"><small>Usuário</small><strong>${user ? `@${esc(username)}` : "Ainda não criado"}</strong></span>
          <span class="csv2-access-pill ${user ? (activeAccount ? "active" : "inactive") : "pending"}">${user ? (activeAccount ? "Acesso ativo" : "Desativado") : "Criar acesso"}</span>
          <i class="ri-arrow-down-s-line csv2-row-arrow"></i>
        </button>

        <div class="csv2-team-row-details">
          <div class="csv2-team-edit-grid">
            <label><span>Nome completo</span><input class="form-input" data-field="name" value="${esc(item.name)}"></label>
            <label><span>Setor</span><input class="form-input" data-field="sector" value="${esc(item.sector)}"></label>
            <label>
              <span>${user ? "Novo usuário de acesso" : "Usuário de acesso"}</span>
              <input class="form-input" data-field="username" value="${esc(username)}">
              ${user ? `<small class="csv2-credential-help">Para trocar a senha, informe também um novo usuário. O acesso anterior será bloqueado.</small>` : ""}
            </label>
            <label class="csv2-password-field">
              <span>${user ? "Nova senha de acesso" : "Senha inicial"}</span>
              <input class="form-input" data-field="password" type="password" minlength="8" placeholder="${user ? "Preencha somente para substituir o acesso" : "Mínimo de 8 caracteres"}">
            </label>
          </div>

          <div class="csv2-row-permissions" data-permission-container="${key}">
            <div class="csv2-section-label">Áreas que este colaborador poderá visualizar</div>
            ${permissionMarkup(permissions, prefix)}
          </div>

          <label class="csv2-account-active"><input type="checkbox" data-field="active" ${activeAccount || !user ? "checked" : ""}><span>Conta ativa</span></label>

          <div class="csv2-row-actions">
            ${user ? `
              <button type="button" class="csv2-button secondary" onclick="window.csv2SaveTeamRow('${key}')"><i class="ri-save-line"></i> Salvar alterações</button>
              <button type="button" class="csv2-button credentials" onclick="window.csv2ReplaceTeamCredentials('${key}')"><i class="ri-key-2-line"></i> Alterar login e senha</button>
            ` : `
              <button type="button" class="csv2-button primary" onclick="window.csv2CreateTeamAccess('${key}')"><i class="ri-user-add-line"></i> Criar login e salvar</button>
            `}
            <button type="button" class="csv2-button ghost" onclick="window.csv2ToggleTeamRow('${key}')"><i class="ri-arrow-up-s-line"></i> Recolher</button>
            <button type="button" class="csv2-button danger" onclick="window.csv2RemoveTeamMember('${key}')"><i class="ri-user-unfollow-line"></i> Excluir colaborador</button>
          </div>
          <div class="csv2-row-message" data-row-message></div>
        </div>
      </article>
    `;
  }).join("");

  list.querySelectorAll("[data-permission-container]").forEach(bindPermissionAll);
}

function findRenderedTeamRecord(key) {
  const decoded = decodeURIComponent(key);
  const records = allCollaboratorsMerged().map((record) => {
    const user = findUserForCollaborator(record);
    return { ...record, userId: user?.id || record.userId || "", userData: user?.data || record.userData || null };
  });
  return records.find((item) => (item.collaboratorId || item.userId || normalize(item.name)) === decoded) || null;
}

function renderedTeamRow(key) {
  return document.querySelector(`[data-team-key="${CSS.escape(key)}"]`);
}

window.csv2ToggleTeamRow = function(key) {
  const row = renderedTeamRow(key);
  if (!row) return;
  row.classList.toggle("is-open");
};

async function usernameExists(username, ignoreUid = "") {
  const snapshot = await getDocs(query(collection(db, "usuarios"), where("usuario", "==", username)));
  return snapshot.docs.some((item) => item.id !== ignoreUid);
}

async function createAuthAndProfile({
  collaboratorId,
  name,
  sector,
  username,
  password,
  permissions,
  active = true
}) {
  const normalizedUsername = normalize(username);

  if (!normalizedUsername) {
    throw new Error("Informe um usuário válido.");
  }

  if (password.length < 8) {
    throw new Error("A senha inicial precisa ter pelo menos 8 caracteres.");
  }

  const email = internalEmail(normalizedUsername);
  let credential;

  try {
    credential = await createUserWithEmailAndPassword(
      creatorAuth,
      email,
      password
    );
  } catch (error) {
    if (error?.code === "auth/email-already-in-use") {
      credential = await signInWithEmailAndPassword(
        creatorAuth,
        email,
        password
      );
    } else {
      throw error;
    }
  }

  const uid = credential.user.uid;

  const profilePayload = {
    nome: name,
    usuario: normalizedUsername,
    email,
    setor: sector,
    ativo: active,
    removido: false,
    admin: false,
    permissoes: permissions,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  };

  try {
    try {
      await setDoc(
        doc(creatorDb, "usuarios", uid),
        profilePayload,
        { merge: true }
      );
    } catch (selfProfileError) {
      await setDoc(
        doc(db, "usuarios", uid),
        profilePayload,
        { merge: true }
      );
    }

    await setDoc(
      doc(db, "colaboradores", collaboratorId || uid),
      {
        "Nome Completo do Colaborador": name,
        "Setor da Clínica": sector,
        usuarioAuth: normalizedUsername,
        uidAuth: uid,
        ativo: active,
        removido: false,
        atualizadoEm: serverTimestamp()
      },
      { merge: true }
    );

    return {
      uid,
      username: normalizedUsername
    };
  } finally {
    try {
      await signOut(creatorAuth);
    } catch (_) {}
  }
}

window.csv2CreateTeamAccess = async function(key) {
  if (!state.isAdmin) return;
  const record = findRenderedTeamRecord(key);
  const row = renderedTeamRow(key);
  if (!record || !row) return;

  const name = row.querySelector('[data-field="name"]').value.trim();
  const sector = row.querySelector('[data-field="sector"]').value.trim();
  const username = row.querySelector('[data-field="username"]').value.trim();
  const password = row.querySelector('[data-field="password"]').value;
  const active = row.querySelector('[data-field="active"]').checked;
  const prefix = `csv2-row-perm-${key}`;
  const permissions = selectedPermissions(row, prefix);
  const message = row.querySelector("[data-row-message]");

  if (!name || !sector || !username || !password) {
    message.textContent = "Preencha nome, setor, usuário e senha inicial.";
    message.className = "csv2-row-message error";
    return;
  }
  if (!permissions.length) {
    message.textContent = "Selecione pelo menos uma área de acesso.";
    message.className = "csv2-row-message error";
    return;
  }

  const button = row.querySelector(".csv2-row-actions .primary");
  const original = button?.innerHTML;
  if (button) { button.disabled = true; button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Criando acesso...'; }

  try {
    const result = await createAuthAndProfile({
      collaboratorId: record.collaboratorId,
      name,
      sector,
      username,
      password,
      permissions,
      active
    });
    message.textContent = `Acesso criado com o usuário @${result.username}.`;
    message.className = "csv2-row-message success";
  } catch (error) {
    console.error(error);
    const known = {
      "auth/email-already-in-use": "Este usuário já existe no Firebase Authentication.",
      "auth/weak-password": "A senha informada é muito fraca.",
      "auth/operation-not-allowed": "Ative o login por e-mail e senha no Firebase Authentication.",
      "permission-denied": "O Firestore bloqueou a gravação. Publique o arquivo firestore.rules criado por esta atualização."
    };
    message.textContent = known[error.code] || error.message || "Não foi possível criar o acesso.";
    message.className = "csv2-row-message error";
  } finally {
    if (button) { button.disabled = false; button.innerHTML = original; }
  }
};

window.csv2SaveTeamRow = async function(key) {
  if (!state.isAdmin) return;
  const record = findRenderedTeamRecord(key);
  const row = renderedTeamRow(key);
  if (!record || !row || !record.userId) return;

  const name = row.querySelector('[data-field="name"]').value.trim();
  const sector = row.querySelector('[data-field="sector"]').value.trim();
  const active = row.querySelector('[data-field="active"]').checked;
  const prefix = `csv2-row-perm-${key}`;
  const permissions = selectedPermissions(row, prefix);
  const message = row.querySelector("[data-row-message]");

  if (!name || !sector || !permissions.length) {
    message.textContent = "Preencha nome e setor e selecione ao menos uma área.";
    message.className = "csv2-row-message error";
    return;
  }

  try {
    await setDoc(doc(db, "usuarios", record.userId), {
      nome: name,
      setor: sector,
      ativo: active,
      permissoes: permissions,
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    await setDoc(doc(db, "colaboradores", record.collaboratorId || record.userId), {
      "Nome Completo do Colaborador": name,
      "Setor da Clínica": sector,
      usuarioAuth: record.userData?.usuario || record.collaboratorData?.usuarioAuth || "",
      uidAuth: record.userId,
      ativo: active
    }, { merge: true });

    message.textContent = "Dados e permissões salvos. O colaborador deve entrar novamente para receber as mudanças.";
    message.className = "csv2-row-message success";
  } catch (error) {
    message.textContent = `Não foi possível salvar: ${error.message}`;
    message.className = "csv2-row-message error";
  }
};



window.csv2ReplaceTeamCredentials = async function(key) {
  if (!state.isAdmin) return;

  const record = findRenderedTeamRecord(key);
  const row = renderedTeamRow(key);

  if (!record || !row || !record.userId) return;

  const currentUsername = normalize(
    record.userData?.usuario ||
    record.collaboratorData?.usuarioAuth ||
    ""
  );
  const newUsername = normalize(
    row.querySelector('[data-field="username"]')?.value || ""
  );
  const newPassword =
    row.querySelector('[data-field="password"]')?.value || "";
  const name =
    row.querySelector('[data-field="name"]')?.value.trim() || "";
  const sector =
    row.querySelector('[data-field="sector"]')?.value.trim() || "";
  const active =
    row.querySelector('[data-field="active"]')?.checked !== false;
  const prefix = `csv2-row-perm-${key}`;
  const permissions = selectedPermissions(row, prefix);
  const message = row.querySelector("[data-row-message]");

  if (!newUsername || !newPassword) {
    message.textContent =
      "Informe o novo usuário e uma nova senha com pelo menos 8 caracteres.";
    message.className = "csv2-row-message error";
    return;
  }

  if (newPassword.length < 8) {
    message.textContent =
      "A nova senha precisa ter pelo menos 8 caracteres.";
    message.className = "csv2-row-message error";
    return;
  }

  if (newUsername === currentUsername) {
    message.textContent =
      "Por segurança, a troca administrativa de senha exige também um novo usuário de acesso.";
    message.className = "csv2-row-message error";
    return;
  }

  if (await usernameExists(newUsername, record.userId)) {
    message.textContent =
      "Este novo usuário já está vinculado a outra pessoa.";
    message.className = "csv2-row-message error";
    return;
  }

  const confirmed = confirm(
    `Substituir o acesso de ${name}?\n\n` +
    `Novo usuário: @${newUsername}\n` +
    "O login anterior será bloqueado e não poderá mais acessar o portal."
  );

  if (!confirmed) return;

  const button = row.querySelector(".csv2-button.credentials");
  const original = button?.innerHTML;

  if (button) {
    button.disabled = true;
    button.innerHTML =
      '<i class="ri-loader-4-line ri-spin"></i> Alterando acesso...';
  }

  try {
    const result = await createAuthAndProfile({
      collaboratorId: record.collaboratorId || record.userId,
      name,
      sector,
      username: newUsername,
      password: newPassword,
      permissions,
      active
    });

    await setDoc(
      doc(db, "usuarios", record.userId),
      {
        ativo: false,
        removido: true,
        permissoes: [],
        credenciaisSubstituidasPor: result.uid,
        credenciaisSubstituidasEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      },
      { merge: true }
    );

    message.textContent =
      `Acesso substituído. O novo usuário é @${result.username}. O login antigo foi bloqueado.`;
    message.className = "csv2-row-message success";

    row.querySelector('[data-field="password"]').value = "";

    setTimeout(renderTeamManager, 650);
  } catch (error) {
    console.error("Troca de credenciais:", error);

    const known = {
      "auth/email-already-in-use":
        "Este usuário já existe no Firebase Authentication.",
      "auth/invalid-credential":
        "Já existe uma conta técnica com este usuário. Escolha outro nome de acesso.",
      "auth/weak-password":
        "A nova senha é muito fraca.",
      "permission-denied":
        "O Firestore bloqueou a alteração. Publique as regras desta atualização."
    };

    message.textContent =
      known[error?.code] ||
      error?.message ||
      "Não foi possível substituir o login.";
    message.className = "csv2-row-message error";
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = original;
    }
  }
};

window.csv2RemoveTeamMember = async function(key) {
  if (!state.isAdmin) return;

  const record = findRenderedTeamRecord(key);
  const row = renderedTeamRow(key);

  if (!record || !row) return;

  if (record.userId && record.userId === state.profile?.uid) {
    alert("O administrador conectado não pode excluir o próprio acesso.");
    return;
  }

  const confirmed = confirm(
    `Excluir ${record.name} do portal?\n\n` +
    "O colaborador desaparecerá da equipe e o login será bloqueado. " +
    "A conta técnica continuará no Firebase Authentication até ser apagada pela gestão no Console."
  );

  if (!confirmed) return;

  const message = row.querySelector("[data-row-message]");
  const buttons = row.querySelectorAll("button");

  buttons.forEach((button) => {
    button.disabled = true;
  });

  try {
    if (record.userId) {
      await setDoc(
        doc(db, "usuarios", record.userId),
        {
          ativo: false,
          removido: true,
          permissoes: [],
          removidoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp()
        },
        { merge: true }
      );
    }

    if (record.collaboratorId) {
      await deleteDoc(
        doc(db, "colaboradores", record.collaboratorId)
      );
    }

    message.textContent =
      "Colaborador removido do portal e acesso bloqueado.";
    message.className = "csv2-row-message success";

    setTimeout(() => {
      renderTeamManager();
    }, 450);
  } catch (error) {
    console.error("Erro ao remover colaborador:", error);

    message.textContent =
      error?.code === "permission-denied"
        ? "O Firestore bloqueou a exclusão. Publique as regras 6.4."
        : `Não foi possível excluir: ${error.message}`;

    message.className =
      error?.code === "permission-denied"
        ? "csv2-row-message permission-warning"
        : "csv2-row-message error";

    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
};

function ensureSharedModal(id, className = "csv2-modal") {
  let modal = document.getElementById(id);
  if (!modal) {
    modal = document.createElement("div");
    modal.id = id;
    modal.className = className;
    modal.style.display = "none";
    document.body.appendChild(modal);
  }
  return modal;
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "none";
}

window.csv2CloseModal = closeModal;

function openBulkAccessModal() {
  if (!state.isAdmin) return;
  const pending = allCollaboratorsMerged().filter((record) => !findUserForCollaborator(record));
  const modal = ensureSharedModal("csv2-bulk-access-modal");
  modal.innerHTML = `
    <div class="csv2-modal-card medium">
      <button type="button" class="csv2-modal-close" onclick="window.csv2CloseModal('csv2-bulk-access-modal')"><i class="ri-close-line"></i></button>
      <span class="csv2-eyebrow"><i class="ri-user-follow-line"></i> Preparação automática</span>
      <h2>Criar acessos para os colaboradores existentes</h2>
      <p>Foram encontrados <strong>${pending.length}</strong> colaborador(es) sem login. O sistema criará usuários a partir dos nomes e aplicará as permissões selecionadas.</p>

      <label class="csv2-form-label">Senha temporária para os novos acessos</label>
      <input type="password" id="csv2-bulk-password" class="form-input" minlength="8" placeholder="Mínimo de 8 caracteres">
      <small class="csv2-help">A senha não será salva no Firestore. Entregue-a aos colaboradores e altere o fluxo de redefinição em uma fase posterior.</small>

      <div class="csv2-section-label">Permissões iniciais</div>
      <div id="csv2-bulk-permissions">${permissionMarkup(["boletins"], "csv2-bulk-perm")}</div>

      <div id="csv2-bulk-progress" class="csv2-bulk-progress"></div>
      <div class="csv2-modal-actions">
        <button type="button" class="csv2-button ghost" onclick="window.csv2CloseModal('csv2-bulk-access-modal')">Cancelar</button>
        <button type="button" class="csv2-button primary" id="csv2-run-bulk-access"><i class="ri-play-line"></i> Criar ${pending.length} acesso(s)</button>
      </div>
    </div>
  `;
  modal.style.display = "flex";
  bindPermissionAll(document.getElementById("csv2-bulk-permissions"));
  document.getElementById("csv2-run-bulk-access")?.addEventListener("click", runBulkAccessCreation);
}

async function uniqueUsernameForName(name, used) {
  const base = normalize(name) || "colaborador";
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate) || await usernameExists(candidate)) {
    candidate = `${base}.${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

async function runBulkAccessCreation() {
  const pending = allCollaboratorsMerged().filter((record) => !findUserForCollaborator(record));
  const password = document.getElementById("csv2-bulk-password")?.value || "";
  const permissionsBox = document.getElementById("csv2-bulk-permissions");
  const permissions = selectedPermissions(permissionsBox, "csv2-bulk-perm");
  const progress = document.getElementById("csv2-bulk-progress");
  const button = document.getElementById("csv2-run-bulk-access");

  if (password.length < 8) return alert("Informe uma senha temporária com pelo menos 8 caracteres.");
  if (!permissions.length) return alert("Selecione pelo menos uma área de acesso.");
  if (!pending.length) return alert("Todos os colaboradores já possuem acesso.");
  if (!confirm(`Criar ${pending.length} conta(s) reais no Firebase Authentication?`)) return;

  const used = new Set(state.users.map((item) => item.data?.usuario).filter(Boolean));
  const results = [];
  button.disabled = true;

  for (let index = 0; index < pending.length; index += 1) {
    const record = pending[index];
    progress.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Criando ${index + 1}/${pending.length}: ${esc(record.name)}`;
    try {
      const username = await uniqueUsernameForName(record.name, used);
      const created = await createAuthAndProfile({
        collaboratorId: record.collaboratorId,
        name: record.name,
        sector: record.sector,
        username,
        password,
        permissions,
        active: true
      });
      results.push({ name: record.name, username: created.username, ok: true });
    } catch (error) {
      console.error("Falha ao criar acesso em lote", record.name, error);
      results.push({ name: record.name, error: error.message || error.code || "Erro", ok: false });
    }
    await sleep(450);
  }

  const successful = results.filter((item) => item.ok);
  const failed = results.filter((item) => !item.ok);
  progress.innerHTML = `
    <strong>${successful.length} acesso(s) criado(s); ${failed.length} falha(s).</strong>
    ${successful.length ? `<div class="csv2-created-logins">${successful.map((item) => `<span>${esc(item.name)}: <b>@${esc(item.username)}</b></span>`).join("")}</div>` : ""}
    ${failed.length ? `<details><summary>Ver falhas</summary>${failed.map((item) => `<div>${esc(item.name)}: ${esc(item.error)}</div>`).join("")}</details>` : ""}
  `;
  button.disabled = false;
  button.innerHTML = '<i class="ri-check-line"></i> Processo finalizado';
}

function bulletinTitle(item) {
  return String(item?.data?.["Título do Informativo"] || item?.data?.["Título do Documento"] || item?.data?.titulo || "Informativo");
}

function bulletinDate(item) {
  return String(item?.data?.["Data de Publicação"] || item?.data?.dataPublicacao || "");
}

function bulletinDeadline(item) {
  return String(
    item?.data?.prazoLeitura ||
    item?.data?.["Prazo para Leitura"] ||
    ""
  ).trim();
}

function deadlineDays(item) {
  const deadline = parseDate(bulletinDeadline(item));
  const today = parseDate(dateToday());

  if (!bulletinDeadline(item) || !deadline.getTime()) return null;

  return Math.ceil(
    (deadline.getTime() - today.getTime()) / 86400000
  );
}

function deadlineBadgeMarkup(item, read = false) {
  const deadline = bulletinDeadline(item);

  if (!deadline) return "";

  const days = deadlineDays(item);
  const formatted = parseDate(deadline).toLocaleDateString("pt-BR");

  if (read) {
    return `<span class="csv2-deadline-badge done">Prazo ${formatted}</span>`;
  }

  if (days !== null && days < 0) {
    return `<span class="csv2-deadline-badge overdue">Prazo vencido</span>`;
  }

  if (
    days !== null &&
    days <= Number(item?.data?.diasAviso || 2)
  ) {
    return `<span class="csv2-deadline-badge near">Vence ${formatted}</span>`;
  }

  return `<span class="csv2-deadline-badge">Prazo ${formatted}</span>`;
}

function deadlineExpired(item) {
  const days = deadlineDays(item);
  return days !== null && days < 0;
}

function datePlusDays(days = 3) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function bulletinType(item) {
  return String(item?.data?.["Tipo (Urgente, Norma, Regra, etc)"] || item?.data?.tipo || "Informativo");
}

function bulletinDescription(item) {
  return String(item?.data?.descricao || item?.data?.conteudo || item?.data?.["Motivo"] || "");
}

function bulletinMediaType(item) {
  return String(item?.data?.midiaTipo || (item?.data?.["Links dos Materiais (1 por linha)"] ? "documento" : "texto"));
}

function bulletinMediaUrl(item) {
  return String(item?.data?.midiaUrl || item?.data?.["Links dos Materiais (1 por linha)"] || "").split("\n")[0].trim();
}

function privateAssignedTo(item, profile) {
  const direct = String(item?.data?.["Para qual Colaborador?"] || "").trim();
  const list = Array.isArray(item?.data?.publicoPessoas) ? item.data.publicoPessoas : [];
  return direct === String(profile?.name || "").trim() || list.includes(profile?.name);
}

function generalAssignedTo(item, profile) {
  if (!profile) return false;
  const data = item.data || {};
  const audienceType = data.publicoTipo;

  if (audienceType === "todos") return true;
  if (audienceType === "setores") {
    const sectors = Array.isArray(data.publicoSetores) ? data.publicoSetores : [];
    return sectors.map(normalizeText).includes(normalizeText(profile.sector));
  }
  if (audienceType === "pessoas") {
    const people = Array.isArray(data.publicoPessoas) ? data.publicoPessoas : [];
    return people.map(normalizeText).includes(normalizeText(profile.name));
  }

  const legacy = String(data["Para quais Setores?"] || "Geral");
  if (!legacy || normalizeText(legacy).includes("geral")) return true;
  return legacy.split(",").map(normalizeText).includes(normalizeText(profile.sector));
}

function personalBulletins(profile = state.profile) {
  if (!profile) return [];
  const general = state.bulletins
    .filter((item) => generalAssignedTo(item, profile))
    .map((item) => ({ ...item, collectionName: "boletins", kind: "Geral" }));
  const direct = state.privateBulletins
    .filter((item) => privateAssignedTo(item, profile))
    .map((item) => ({ ...item, collectionName: "boletins-privados", kind: "Direcionado" }));
  return [...general, ...direct].sort((a, b) => parseDate(bulletinDate(b)) - parseDate(bulletinDate(a)));
}

function recipientsFor(item) {
  const collaborators = activeCollaborators();
  if (item.collectionName === "boletins-privados") {
    const person = String(item.data?.["Para qual Colaborador?"] || item.data?.publicoPessoas?.[0] || "").trim();
    return person ? collaborators.filter((collaborator) => normalizeText(collaborator.name) === normalizeText(person)) : [];
  }

  return collaborators.filter((collaborator) => generalAssignedTo(item, {
    name: collaborator.name,
    sector: collaborator.sector
  }));
}

function groupedAdminBulletins() {
  const output = [];
  const privateGroups = new Map();

  state.bulletins.forEach((item) => output.push({ ...item, collectionName: "boletins", kind: "Geral", groupDocs: [item] }));
  state.privateBulletins.forEach((item) => {
    const groupId = item.data?.grupoPublicacaoId || `single-${item.id}`;
    if (!privateGroups.has(groupId)) privateGroups.set(groupId, []);
    privateGroups.get(groupId).push(item);
  });

  privateGroups.forEach((items, groupId) => {
    const first = items[0];
    output.push({
      ...first,
      id: groupId,
      collectionName: "boletins-privados",
      kind: "Direcionado",
      groupDocs: items,
      targets: unique(items.map((item) => item.data?.["Para qual Colaborador?"]))
    });
  });

  return output.sort((a, b) => parseDate(bulletinDate(b)) - parseDate(bulletinDate(a)));
}

function mediaIcon(type) {
  return {
    video: "ri-video-line",
    documento: "ri-file-text-line",
    audio: "ri-volume-up-line",
    link: "ri-links-line",
    texto: "ri-article-line"
  }[type] || "ri-megaphone-line";
}

function audienceLabel(item) {
  if (item.collectionName === "boletins-privados") {
    const targets = item.targets || [item.data?.["Para qual Colaborador?"]].filter(Boolean);
    return targets.length > 1 ? `${targets.length} pessoas específicas` : targets[0] || "Pessoa específica";
  }
  const type = item.data?.publicoTipo;
  if (type === "todos") return "Toda a empresa";
  if (type === "setores") return unique(item.data?.publicoSetores || []).join(", ") || "Setores específicos";
  if (type === "pessoas") return `${unique(item.data?.publicoPessoas || []).length} pessoas específicas`;
  return item.data?.["Para quais Setores?"] || "Toda a empresa";
}

function bulletinReadStats(item) {
  if (item.groupDocs?.length > 1 || item.collectionName === "boletins-privados") {
    const docs = item.groupDocs || [item];
    const total = docs.length;
    const read = docs.filter((docItem) => {
      const name = docItem.data?.["Para qual Colaborador?"] || docItem.data?.publicoPessoas?.[0];
      return hasRead(docItem, name);
    }).length;
    return { total, read, pending: Math.max(0, total - read), rate: total ? Math.round((read / total) * 100) : 0 };
  }

  const recipients = recipientsFor(item);
  const read = recipients.filter((person) => hasRead(item, person.name)).length;
  const total = recipients.length;
  return { total, read, pending: Math.max(0, total - read), rate: total ? Math.round((read / total) * 100) : 0 };
}

function analyticsForPerson(person) {
  const items = personalBulletins({ name: person.name, sector: person.sector });
  const read = items.filter((item) => hasRead(item, person.name)).length;
  const total = items.length;
  return {
    ...person,
    items,
    read,
    total,
    pending: Math.max(0, total - read),
    rate: total ? Math.round((read / total) * 100) : 100
  };
}

function companyAnalytics() {
  const people = activeCollaborators().map(analyticsForPerson);
  const assigned = people.reduce((sum, item) => sum + item.total, 0);
  const read = people.reduce((sum, item) => sum + item.read, 0);
  return {
    people,
    assigned,
    read,
    pending: Math.max(0, assigned - read),
    rate: assigned ? Math.round((read / assigned) * 100) : 0
  };
}

function recentMonths() {
  const months = [];
  const today = new Date();
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
    months.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
    });
  }
  return months;
}

function chartSeries(items, name) {
  const months = recentMonths();
  const total = months.map(() => 0);
  const read = months.map(() => 0);
  items.forEach((item) => {
    const date = parseDate(bulletinDate(item));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const index = months.findIndex((month) => month.key === key);
    if (index < 0) return;
    total[index] += 1;
    if (hasRead(item, name)) read[index] += 1;
  });
  return { months, total, read };
}

function renderLineChart(canvasId, holderName, items, name) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === "undefined") return;
  const series = chartSeries(items, name);
  state[holderName]?.destroy?.();
  state[holderName] = new Chart(canvas, {
    type: "line",
    data: {
      labels: series.months.map((month) => month.label),
      datasets: [
        { label: "Atribuídos", data: series.total, borderColor: "#7357bd", backgroundColor: "rgba(115,87,189,.14)", fill: true, tension: .38 },
        { label: "Lidos", data: series.read, borderColor: "#22a66f", backgroundColor: "rgba(34,166,111,.10)", fill: true, tension: .38 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8 } } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } }
    }
  });
}

function performanceMessage(rate, pending, total, personal = true) {
  if (!total) return { level: "neutral", icon: "ri-sparkling-2-line", title: "Aguardando novos informativos", text: "Os indicadores aparecerão conforme novos conteúdos forem publicados." };
  if (rate >= 90) return { level: "positive", icon: "ri-trophy-line", title: personal ? "Excelente desempenho" : "Equipe com ótimo acompanhamento", text: `Índice de leitura em ${rate}%. Continue mantendo este padrão.` };
  if (rate >= 70) return { level: "attention", icon: "ri-line-chart-line", title: "Bom ritmo, com pontos de atenção", text: `Índice de ${rate}% e ${pending} leitura(s) pendente(s).` };
  return { level: "warning", icon: "ri-alarm-warning-line", title: "Atenção às leituras pendentes", text: `Índice de ${rate}% e ${pending} leitura(s) ainda não concluída(s).` };
}

function ensureBulletinExperience() {
  const tab = document.getElementById("tab-boletins");
  if (!tab) return;

  [...tab.children].forEach((child) => {
    if (child.id !== "csv2-bulletins-root") child.classList.add("csv2-legacy-hidden");
  });

  let root = document.getElementById("csv2-bulletins-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "csv2-bulletins-root";
    root.className = "csv2-bulletins-root";
    tab.appendChild(root);
  }

  renderBulletins();
}

function renderBulletins() {
  const root = document.getElementById("csv2-bulletins-root");
  if (!root || !state.profile) return;

  if (state.isAdmin) {
    const analytics = companyAnalytics();
    root.innerHTML = `
      <header class="csv2-page-header">
        <div>
          <span class="csv2-eyebrow"><i class="ri-megaphone-line"></i> Central de boletins</span>
          <h2>Boletins gerais e direcionados</h2>
          <p>Cadastre todos os informativos em um só lugar e acompanhe as leituras da equipe.</p>
        </div>
        <div class="csv2-header-actions">
          <button type="button" class="csv2-button secondary" id="csv2-performance-button"><i class="ri-bar-chart-grouped-line"></i> Desempenho por leitura</button>
          <button type="button" class="csv2-button primary" id="csv2-new-bulletin-button"><i class="ri-add-line"></i> Novo informativo</button>
        </div>
      </header>

      <section class="csv2-bulletin-summary">
        <article><span>Atribuições totais</span><strong>${analytics.assigned}</strong><i class="ri-file-list-3-line"></i></article>
        <article><span>Leituras concluídas</span><strong>${analytics.read}</strong><i class="ri-checkbox-circle-line"></i></article>
        <article><span>Pendências</span><strong>${analytics.pending}</strong><i class="ri-time-line"></i></article>
        <article><span>Índice geral</span><strong>${analytics.rate}%</strong><i class="ri-line-chart-line"></i></article>
      </section>

      <section class="csv2-admin-callout ${performanceMessage(analytics.rate, analytics.pending, analytics.assigned, false).level}">
        <i class="${performanceMessage(analytics.rate, analytics.pending, analytics.assigned, false).icon}"></i>
        <div><strong>${performanceMessage(analytics.rate, analytics.pending, analytics.assigned, false).title}</strong><p>${performanceMessage(analytics.rate, analytics.pending, analytics.assigned, false).text}</p></div>
        <button type="button" id="csv2-performance-callout-button">Abrir análise completa <i class="ri-arrow-right-line"></i></button>
      </section>

      <section class="csv2-bulletin-list-card">
        <div class="csv2-list-heading">
          <div><strong>Informativos publicados</strong><span>Conteúdos para toda a empresa, setores ou pessoas específicas.</span></div>
          <div class="csv2-filter-pills" id="csv2-admin-bulletin-filters">
            <button class="active" data-filter="all">Todos</button>
            <button data-filter="todos">Empresa</button>
            <button data-filter="setores">Setores</button>
            <button data-filter="pessoas">Pessoas</button>
          </div>
        </div>
        <div id="csv2-bulletin-list" class="csv2-bulletin-list"></div>
      </section>
    `;
    document.getElementById("csv2-new-bulletin-button")?.addEventListener("click", () => openBulletinForm());
    document.getElementById("csv2-performance-button")?.addEventListener("click", openPerformanceModal);
    document.getElementById("csv2-performance-callout-button")?.addEventListener("click", openPerformanceModal);
    root.querySelectorAll("#csv2-admin-bulletin-filters button").forEach((button) => {
      button.addEventListener("click", () => {
        root.querySelectorAll("#csv2-admin-bulletin-filters button").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        root.dataset.adminFilter = button.dataset.filter;
        renderAdminBulletinList();
      });
    });
    renderAdminBulletinList();
  } else {
    const items = personalBulletins();
    const read = items.filter((item) => hasRead(item, state.profile.name)).length;
    const total = items.length;
    const pending = Math.max(0, total - read);
    const rate = total ? Math.round((read / total) * 100) : 0;
    const message = performanceMessage(rate, pending, total, true);

    root.innerHTML = `
      <header class="csv2-page-header personal">
        <div>
          <span class="csv2-eyebrow"><i class="ri-user-heart-line"></i> Minha central de leitura</span>
          <h2>Olá, ${esc(state.profile.name)}</h2>
          <p>Aqui aparecem somente os boletins gerais, do seu setor ou enviados diretamente para você.</p>
        </div>
        <span class="csv2-person-sector"><i class="ri-building-4-line"></i>${esc(state.profile.sector)}</span>
      </header>

      <section class="csv2-bulletin-summary personal">
        <article><span>Recebidos</span><strong>${total}</strong><i class="ri-inbox-archive-line"></i></article>
        <article><span>Lidos</span><strong>${read}</strong><i class="ri-checkbox-circle-line"></i></article>
        <article><span>Pendentes</span><strong>${pending}</strong><i class="ri-time-line"></i></article>
        <article><span>Minha evolução</span><strong>${rate}%</strong><i class="ri-line-chart-line"></i></article>
      </section>

      <section class="csv2-person-overview">
        <div class="csv2-person-chart"><div class="csv2-list-heading"><div><strong>Evolução nos últimos meses</strong><span>Comparativo de conteúdos recebidos e lidos.</span></div></div><div class="csv2-chart-holder"><canvas id="csv2-person-chart"></canvas></div></div>
        <aside class="csv2-person-callout ${message.level}"><i class="${message.icon}"></i><strong>${message.title}</strong><p>${message.text}</p></aside>
      </section>

      <section class="csv2-bulletin-list-card">
        <div class="csv2-list-heading">
          <div><strong>Meus informativos</strong><span>Gerais e direcionados em ordem da publicação mais recente.</span></div>
          <div class="csv2-filter-pills" id="csv2-person-bulletin-filters"><button class="active" data-filter="all">Todos</button><button data-filter="direct">Direcionados</button><button data-filter="pending">Pendentes</button><button data-filter="read">Lidos</button></div>
        </div>
        <div id="csv2-bulletin-list" class="csv2-bulletin-list"></div>
      </section>
    `;

    root.querySelectorAll("#csv2-person-bulletin-filters button").forEach((button) => {
      button.addEventListener("click", () => {
        root.querySelectorAll("#csv2-person-bulletin-filters button").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        root.dataset.personalFilter = button.dataset.filter;
        renderPersonalBulletinList();
      });
    });
    renderLineChart("csv2-person-chart", "bulletinChart", items, state.profile.name);
    renderPersonalBulletinList();
  }
}

function bulletinCard(item, admin = false) {
  const key = `b-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  state.displayItems.set(key, item);
  const mediaType = bulletinMediaType(item);
  const title = bulletinTitle(item);
  const stats = admin ? bulletinReadStats(item) : null;
  const read = !admin && hasRead(item, state.profile.name);
  const targetText = audienceLabel(item);
  const description = bulletinDescription(item);
  const deadline = bulletinDeadline(item);
  const overdue = !admin && !read && deadlineExpired(item);

  return `
    <article class="csv2-bulletin-card ${!admin && read ? "is-read" : ""} ${!admin && !read ? "is-pending" : ""}">
      <div class="csv2-media-icon"><i class="${mediaIcon(mediaType)}"></i></div>
      <div class="csv2-bulletin-main">
        <div class="csv2-bulletin-tags"><span>${esc(bulletinType(item))}</span><span>${esc(mediaType)}</span>${deadlineBadgeMarkup(item, read)}${!admin ? `<span class="${read ? "done" : overdue ? "overdue" : "pending"}">${read ? "Lido" : overdue ? "Prazo vencido" : "Pendente"}</span>` : ""}</div>
        <h3>${esc(title)}</h3>
        <p>${esc(description || "Informativo sem descrição adicional.")}</p>
        <div class="csv2-bulletin-meta"><span><i class="ri-calendar-line"></i>${esc(bulletinDate(item) || "Sem data")}</span>${deadline ? `<span><i class="ri-timer-line"></i>Leitura até ${esc(parseDate(deadline).toLocaleDateString("pt-BR"))}</span>` : ""}<span><i class="ri-user-received-2-line"></i>${esc(targetText)}</span></div>
      </div>
      ${admin ? `
        <div class="csv2-admin-read-box"><strong>${stats.rate}%</strong><span>${stats.read}/${stats.total} leituras</span><div><i style="width:${stats.rate}%"></i></div></div>
      ` : ""}
      <div class="csv2-bulletin-actions">
        <button type="button" onclick="window.csv2OpenBulletin('${key}')"><i class="ri-eye-line"></i> Abrir</button>
        ${!admin && !read ? `<button type="button" class="primary" onclick="window.csv2MarkRead('${key}')"><i class="${overdue ? "ri-refresh-line" : "ri-check-double-line"}"></i> ${overdue ? "Solicitar releitura" : "Marcar como lido"}</button>` : ""}
        ${admin ? `<button type="button" onclick="window.csvBulletinOpenReadStatus('${key}')"><i class="ri-group-line"></i> Leitores</button><button type="button" onclick="window.csv2EditBulletin('${key}')"><i class="ri-edit-line"></i> Editar</button><button type="button" class="danger" onclick="window.csv2DeleteBulletin('${key}')"><i class="ri-delete-bin-line"></i> Excluir</button>` : ""}
      </div>
    </article>
  `;
}

function renderAdminBulletinList() {
  const container = document.getElementById("csv2-bulletin-list");
  const root = document.getElementById("csv2-bulletins-root");
  if (!container || !root || !state.isAdmin) return;
  state.displayItems.clear();
  const filter = root.dataset.adminFilter || "all";
  const items = groupedAdminBulletins().filter((item) => {
    if (filter === "all") return true;
    if (filter === "pessoas") return item.collectionName === "boletins-privados" || item.data?.publicoTipo === "pessoas";
    if (filter === "todos") return item.data?.publicoTipo === "todos" || normalizeText(item.data?.["Para quais Setores?"]).includes("geral");
    if (filter === "setores") return item.data?.publicoTipo === "setores" || (item.collectionName === "boletins" && !normalizeText(item.data?.["Para quais Setores?"]).includes("geral"));
    return true;
  });
  container.innerHTML = items.length ? items.map((item) => bulletinCard(item, true)).join("") : '<div class="csv2-empty"><i class="ri-inbox-line"></i><strong>Nenhum informativo neste filtro</strong></div>';
}

function renderPersonalBulletinList() {
  const container = document.getElementById("csv2-bulletin-list");
  const root = document.getElementById("csv2-bulletins-root");
  if (!container || !root || state.isAdmin) return;
  state.displayItems.clear();
  const filter = root.dataset.personalFilter || "all";
  const items = personalBulletins().filter((item) => {
    const read = hasRead(item, state.profile.name);
    if (filter === "read") return read;
    if (filter === "pending") return !read;
    if (filter === "direct") return item.kind === "Direcionado";
    return true;
  });
  container.innerHTML = items.length ? items.map((item) => bulletinCard(item, false)).join("") : '<div class="csv2-empty"><i class="ri-inbox-line"></i><strong>Nenhum informativo nesta visualização</strong><span>Altere o filtro ou aguarde uma nova publicação.</span></div>';
}

function materialEmbedUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const drive = raw.match(/\/d\/([a-zA-Z0-9_-]+)/) || raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (drive?.[1]) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  if (/youtube\.com\/watch\?v=/.test(raw)) return raw.replace("watch?v=", "embed/").split("&")[0];
  if (/youtu\.be\//.test(raw)) return raw.replace("youtu.be/", "youtube.com/embed/");
  if (/\.(pdf|doc|docx|ppt|pptx|xls|xlsx)(\?|#|$)/i.test(raw)) return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(raw)}`;
  return raw;
}

window.csv2GetDisplayItem = function(key) {
  return state.displayItems.get(key) || null;
};

window.csv2OpenBulletin = function(key) {
  const item = state.displayItems.get(key);
  if (!item) return;
  const type = bulletinMediaType(item);
  const url = bulletinMediaUrl(item);
  const title = bulletinTitle(item);
  const description = bulletinDescription(item);
  const modal = ensureSharedModal("csv2-media-modal");
  let media = "";

  if (type === "audio" && url) {
    media = `<div class="csv2-audio-player"><i class="ri-volume-up-line"></i><audio controls autoplay src="${esc(url)}"></audio></div>`;
  } else if (type === "video" && url) {
    const embed = materialEmbedUrl(url);
    media = /youtube\.com\/embed\//.test(embed)
      ? `<iframe src="${esc(embed)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
      : `<video controls autoplay src="${esc(url)}"></video>`;
  } else if ((type === "documento" || type === "link") && url) {
    media = `<iframe src="${esc(materialEmbedUrl(url))}" allowfullscreen></iframe>`;
  } else {
    media = `<div class="csv2-text-content">${esc(description || "Nenhum texto adicional informado.").replace(/\n/g, "<br>")}</div>`;
  }

  modal.innerHTML = `
    <div class="csv2-modal-card media">
      <button type="button" class="csv2-modal-close" onclick="window.csv2CloseModal('csv2-media-modal')"><i class="ri-close-line"></i></button>
      <span class="csv2-eyebrow"><i class="${mediaIcon(type)}"></i>${esc(type)}</span>
      <h2>${esc(title)}</h2>
      <p>${esc(description)}</p>
      <div class="csv2-media-stage">${media}</div>
      <div class="csv2-modal-actions">${url ? `<a class="csv2-button secondary" href="${esc(url)}" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> Abrir em nova guia</a>` : ""}<button class="csv2-button ghost" onclick="window.csv2CloseModal('csv2-media-modal')">Fechar</button></div>
    </div>
  `;
  modal.style.display = "flex";
};

window.csv2MarkRead = async function(key) {
  const item = state.displayItems.get(key);
  if (!item || state.isAdmin || !state.profile || hasRead(item, state.profile.name)) return;
  try {
    const record = `${state.profile.name} (${new Date().toLocaleString("pt-BR")} | Por: ${state.profile.email})`;
    await updateDoc(doc(db, item.collectionName, item.id), { leituras: arrayUnion(record) });
  } catch (error) {
    alert(`Não foi possível registrar a leitura: ${error.message}`);
  }
};

function targetOptionsMarkup(selected = []) {
  const people = activeCollaborators();
  return people.map((person) => `
    <label class="csv2-target-option"><input type="checkbox" name="csv2-target-person" value="${esc(person.name)}" ${selected.includes(person.name) ? "checked" : ""}><span><strong>${esc(person.name)}</strong><small>${esc(person.sector)}</small></span></label>
  `).join("");
}

function sectorOptionsMarkup(selected = []) {
  return sectorsList().map((sector) => `
    <label class="csv2-target-option compact"><input type="checkbox" name="csv2-target-sector" value="${esc(sector)}" ${selected.includes(sector) ? "checked" : ""}><span><strong>${esc(sector)}</strong></span></label>
  `).join("");
}

function openBulletinForm(item = null) {
  if (!state.isAdmin) return;
  const modal = ensureSharedModal("csv2-bulletin-form-modal");
  const data = item?.data || {};
  const isPrivate = item?.collectionName === "boletins-privados";
  const audienceType = isPrivate ? "pessoas" : (data.publicoTipo || (normalizeText(data["Para quais Setores?"]).includes("geral") ? "todos" : "setores"));
  const selectedPeople = item?.targets || unique(data.publicoPessoas || [data["Para qual Colaborador?"]]);
  const selectedSectors = unique(data.publicoSetores || String(data["Para quais Setores?"] || "").split(",").filter((value) => !normalizeText(value).includes("geral")));

  modal.innerHTML = `
    <div class="csv2-modal-card large">
      <button type="button" class="csv2-modal-close" onclick="window.csv2CloseModal('csv2-bulletin-form-modal')"><i class="ri-close-line"></i></button>
      <span class="csv2-eyebrow"><i class="ri-megaphone-line"></i> Cadastro único</span>
      <h2>${item ? "Editar informativo" : "Novo informativo"}</h2>
      <p>Defina o conteúdo, a mídia e exatamente quem poderá visualizar.</p>

      <form id="csv2-bulletin-form">
        <div class="csv2-form-grid three">
          <label><span>Título</span><input id="csv2-b-title" class="form-input" required value="${esc(bulletinTitle(item || {})) === "Informativo" && !item ? "" : esc(bulletinTitle(item || {}))}"></label>
          <label><span>Data de publicação</span><input id="csv2-b-date" type="date" class="form-input" required value="${esc(bulletinDate(item || {}) || dateToday())}"></label>
          <label><span>Prazo para leitura</span><input id="csv2-b-deadline" type="date" class="form-input" required value="${esc(bulletinDeadline(item || {}) || datePlusDays(3))}"></label>
        </div>

        <div class="csv2-form-grid three">
          <label><span>Classificação</span><select id="csv2-b-type" class="form-input">${["Informativo", "Aviso", "Urgente", "Norma", "Regra", "Comunicado"].map((type) => `<option ${bulletinType(item || {}) === type ? "selected" : ""}>${type}</option>`).join("")}</select></label>
          <label><span>Formato</span><select id="csv2-b-media" class="form-input">${[["texto","Texto"],["video","Vídeo"],["documento","Documento / PDF"],["audio","Áudio"],["link","Link externo"]].map(([value,label]) => `<option value="${value}" ${bulletinMediaType(item || {}) === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
          <label><span>Público</span><select id="csv2-b-audience" class="form-input"><option value="todos" ${audienceType === "todos" ? "selected" : ""}>Toda a empresa</option><option value="setores" ${audienceType === "setores" ? "selected" : ""}>Setores específicos</option><option value="pessoas" ${audienceType === "pessoas" ? "selected" : ""}>Pessoas específicas</option></select></label>
        </div>

        <div class="csv2-form-grid two">
          <label>
            <span>Avisar antes do vencimento</span>
            <select id="csv2-b-warning-days" class="form-input">
              ${[1,2,3,5].map((days) => `<option value="${days}" ${Number(data.diasAviso || 2) === days ? "selected" : ""}>${days} dia(s) antes</option>`).join("")}
            </select>
          </label>
          <label class="csv2-required-read">
            <input id="csv2-b-required" type="checkbox" ${data.leituraObrigatoria !== false ? "checked" : ""}>
            <span><strong>Leitura obrigatória</strong><small>Ativa prazos, alertas e acompanhamento individual.</small></span>
          </label>
        </div>

        <label><span>Descrição / mensagem</span><textarea id="csv2-b-description" class="form-input csv2-textarea" required placeholder="Escreva a orientação principal do informativo...">${esc(bulletinDescription(item || {}))}</textarea></label>
        <label id="csv2-b-url-label"><span>Link do material</span><input id="csv2-b-url" type="url" class="form-input" value="${esc(bulletinMediaUrl(item || {}))}" placeholder="https://..."><small>Para vídeos, documentos e áudios, informe um link público ou compartilhável.</small></label>

        <div id="csv2-target-sectors" class="csv2-target-box" style="display:${audienceType === "setores" ? "block" : "none"}"><div class="csv2-section-label">Selecione um ou mais setores</div><div class="csv2-target-grid">${sectorOptionsMarkup(selectedSectors)}</div></div>
        <div id="csv2-target-people" class="csv2-target-box" style="display:${audienceType === "pessoas" ? "block" : "none"}"><div class="csv2-section-label">Selecione uma ou mais pessoas</div><div class="csv2-target-search"><i class="ri-search-line"></i><input id="csv2-target-person-search" placeholder="Pesquisar colaborador..."></div><div class="csv2-target-grid people" id="csv2-target-people-grid">${targetOptionsMarkup(selectedPeople)}</div></div>

        <div id="csv2-b-form-message" class="csv2-row-message"></div>
        <div class="csv2-modal-actions"><button type="button" class="csv2-button ghost" onclick="window.csv2CloseModal('csv2-bulletin-form-modal')">Cancelar</button><button type="submit" class="csv2-button primary"><i class="ri-save-line"></i> ${item ? "Salvar alterações" : "Publicar informativo"}</button></div>
      </form>
    </div>
  `;
  modal.style.display = "flex";
  state.editingBulletinKey = item ? [...state.displayItems.entries()].find(([, value]) => value === item)?.[0] || "" : "";

  const audience = document.getElementById("csv2-b-audience");
  const media = document.getElementById("csv2-b-media");
  const updateTargetVisibility = () => {
    document.getElementById("csv2-target-sectors").style.display = audience.value === "setores" ? "block" : "none";
    document.getElementById("csv2-target-people").style.display = audience.value === "pessoas" ? "block" : "none";
  };
  const updateUrlVisibility = () => {
    const label = document.getElementById("csv2-b-url-label");
    label.style.display = media.value === "texto" ? "none" : "block";
  };
  audience.addEventListener("change", updateTargetVisibility);
  media.addEventListener("change", updateUrlVisibility);
  updateUrlVisibility();
  document.getElementById("csv2-target-person-search")?.addEventListener("input", (event) => {
    const term = normalizeText(event.target.value);
    document.querySelectorAll("#csv2-target-people-grid .csv2-target-option").forEach((option) => {
      option.style.display = !term || normalizeText(option.textContent).includes(term) ? "flex" : "none";
    });
  });
  document.getElementById("csv2-bulletin-form")?.addEventListener("submit", (event) => saveBulletin(event, item));
}

window.csv2EditBulletin = function(key) {
  const item = state.displayItems.get(key);
  if (item && state.isAdmin) openBulletinForm(item);
};

async function saveBulletin(event, existingItem = null) {
  event.preventDefault();
  if (!state.isAdmin) return;
  const form = event.currentTarget;
  const submit = event.submitter;
  const message = document.getElementById("csv2-b-form-message");
  const title = document.getElementById("csv2-b-title").value.trim();
  const date = document.getElementById("csv2-b-date").value;
  const deadline = document.getElementById("csv2-b-deadline").value;
  const warningDays = Number(document.getElementById("csv2-b-warning-days").value || 2);
  const requiredRead = document.getElementById("csv2-b-required").checked;
  const type = document.getElementById("csv2-b-type").value;
  const mediaType = document.getElementById("csv2-b-media").value;
  const audienceType = document.getElementById("csv2-b-audience").value;
  const description = document.getElementById("csv2-b-description").value.trim();
  const mediaUrl = document.getElementById("csv2-b-url").value.trim();
  const sectors = [...form.querySelectorAll('input[name="csv2-target-sector"]:checked')].map((input) => input.value);
  const people = [...form.querySelectorAll('input[name="csv2-target-person"]:checked')].map((input) => input.value);

  if (!title || !date || !deadline || !description) return alert("Preencha título, data, prazo de leitura e descrição.");
  if (mediaType !== "texto" && !mediaUrl) return alert("Informe o link do material selecionado.");
  if (audienceType === "setores" && !sectors.length) return alert("Selecione pelo menos um setor.");
  if (audienceType === "pessoas" && !people.length) return alert("Selecione pelo menos uma pessoa.");

  const original = submit.innerHTML;
  submit.disabled = true;
  submit.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Salvando...';

  const common = {
    "Tipo (Urgente, Norma, Regra, etc)": type,
    "Data de Publicação": date,
    "Motivo": description,
    "Links dos Materiais (1 por linha)": mediaUrl,
    descricao: description,
    conteudo: description,
    midiaTipo: mediaType,
    midiaUrl: mediaUrl,
    publicoTipo: audienceType,
    prazoLeitura: deadline,
    leituraObrigatoria: requiredRead,
    diasAviso: warningDays,
    atualizadoEm: serverTimestamp(),
    atualizadoPor: state.profile.email
  };

  try {
    if (audienceType === "pessoas") {
      const groupId = existingItem?.data?.grupoPublicacaoId || (existingItem?.id && !String(existingItem.id).startsWith("single-") ? existingItem.id : `grupo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
      const currentDocs = existingItem?.collectionName === "boletins-privados" ? (existingItem.groupDocs || [existingItem]) : [];
      const currentByPerson = new Map(currentDocs.map((item) => [String(item.data?.["Para qual Colaborador?"] || ""), item]));

      await Promise.all(currentDocs.filter((item) => !people.includes(item.data?.["Para qual Colaborador?"])).map((item) => deleteDoc(doc(db, "boletins-privados", item.id))));

      for (const person of people) {
        const recipient = activeCollaborators().find(
          (entry) =>
            normalizeText(entry.name) === normalizeText(person)
        );

        const payload = {
          ...common,
          "Título do Documento": title,
          "Para qual Colaborador?": person,
          destinatarioUid:
            recipient?.user?.id ||
            recipient?.raw?.data?.uidAuth ||
            "",
          publicoPessoas: [person],
          publicoSetores: [],
          grupoPublicacaoId: groupId
        };
        const current = currentByPerson.get(person);
        if (current) await setDoc(doc(db, "boletins-privados", current.id), payload, { merge: true });
        else await addDoc(collection(db, "boletins-privados"), { ...payload, leituras: [], criadoEm: serverTimestamp(), criadoPor: state.profile.email });
      }

      if (existingItem && existingItem.collectionName === "boletins") await deleteDoc(doc(db, "boletins", existingItem.id));
    } else {
      const payload = {
        ...common,
        "Título do Informativo": title,
        "Para quais Setores?": audienceType === "todos" ? "Geral" : sectors.join(", "),
        publicoSetores: audienceType === "setores" ? sectors : [],
        publicoPessoas: []
      };

      if (existingItem?.collectionName === "boletins") {
        await setDoc(doc(db, "boletins", existingItem.id), payload, { merge: true });
      } else {
        await addDoc(collection(db, "boletins"), { ...payload, leituras: [], criadoEm: serverTimestamp(), criadoPor: state.profile.email });
        if (existingItem?.collectionName === "boletins-privados") {
          await Promise.all((existingItem.groupDocs || [existingItem]).map((item) => deleteDoc(doc(db, "boletins-privados", item.id))));
        }
      }
    }

    message.textContent = "Informativo salvo com sucesso.";
    message.className = "csv2-row-message success";
    setTimeout(() => closeModal("csv2-bulletin-form-modal"), 500);
  } catch (error) {
    console.error(error);
    message.textContent = `Não foi possível salvar: ${error.message}`;
    message.className = "csv2-row-message error";
  } finally {
    submit.disabled = false;
    submit.innerHTML = original;
  }
}

window.csv2DeleteBulletin = async function(key) {
  if (!state.isAdmin) return;
  const item = state.displayItems.get(key);
  if (!item) return;
  if (!confirm(`Excluir definitivamente o informativo “${bulletinTitle(item)}”?`)) return;
  try {
    if (item.collectionName === "boletins-privados") {
      await Promise.all((item.groupDocs || [item]).map((entry) => deleteDoc(doc(db, "boletins-privados", entry.id))));
    } else {
      await deleteDoc(doc(db, "boletins", item.id));
    }
  } catch (error) {
    alert(`Não foi possível excluir: ${error.message}`);
  }
};

function openPerformanceModal() {
  if (!state.isAdmin) return;
  const modal = ensureSharedModal("csv2-performance-modal");
  const people = activeCollaborators();
  modal.innerHTML = `
    <div class="csv2-modal-card performance">
      <button type="button" class="csv2-modal-close" onclick="window.csv2CloseModal('csv2-performance-modal')"><i class="ri-close-line"></i></button>
      <span class="csv2-eyebrow"><i class="ri-bar-chart-grouped-line"></i> Análise gerencial</span>
      <h2>Desempenho de leitura da equipe</h2>
      <p>Visualize todos, filtre os melhores ou os colaboradores com mais pendências e abra uma análise individual.</p>

      <div class="csv2-performance-filters">
        <div class="csv2-search-field"><i class="ri-search-line"></i><input id="csv2-p-search" placeholder="Pesquisar colaborador..."></div>
        <select id="csv2-p-sector"><option value="">Todos os setores</option>${sectorsList().map((sector) => `<option>${esc(sector)}</option>`).join("")}</select>
        <select id="csv2-p-status"><option value="all">Todos os resultados</option><option value="good">Em dia (90%+)</option><option value="medium">Acompanhar (70–89%)</option><option value="low">Requer atenção (abaixo de 70%)</option><option value="pending">Com pendências</option></select>
        <select id="csv2-p-order"><option value="worst">Mais pendentes primeiro</option><option value="best">Melhores primeiro</option><option value="name">Ordem alfabética</option></select>
        <select id="csv2-p-person"><option value="">Visão de toda a equipe</option>${people.map((person) => `<option value="${esc(person.name)}">${esc(person.name)}</option>`).join("")}</select>
      </div>

      <div id="csv2-performance-content"></div>
    </div>
  `;
  modal.style.display = "flex";
  ["csv2-p-search", "csv2-p-sector", "csv2-p-status", "csv2-p-order", "csv2-p-person"].forEach((id) => {
    document.getElementById(id)?.addEventListener(id === "csv2-p-search" ? "input" : "change", renderPerformanceContent);
  });
  renderPerformanceContent();
}

function renderPerformanceContent() {
  const content = document.getElementById("csv2-performance-content");
  if (!content || !state.isAdmin) return;
  const search = normalizeText(document.getElementById("csv2-p-search")?.value || "");
  const sector = document.getElementById("csv2-p-sector")?.value || "";
  const status = document.getElementById("csv2-p-status")?.value || "all";
  const order = document.getElementById("csv2-p-order")?.value || "worst";
  const personName = document.getElementById("csv2-p-person")?.value || "";

  let people = activeCollaborators().map(analyticsForPerson);
  if (personName) people = people.filter((item) => item.name === personName);
  if (sector) people = people.filter((item) => item.sector === sector);
  if (search) people = people.filter((item) => normalizeText(`${item.name} ${item.sector}`).includes(search));
  if (status === "good") people = people.filter((item) => item.rate >= 90);
  if (status === "medium") people = people.filter((item) => item.rate >= 70 && item.rate < 90);
  if (status === "low") people = people.filter((item) => item.rate < 70);
  if (status === "pending") people = people.filter((item) => item.pending > 0);
  if (order === "best") people.sort((a, b) => b.rate - a.rate || a.name.localeCompare(b.name));
  else if (order === "name") people.sort((a, b) => a.name.localeCompare(b.name));
  else people.sort((a, b) => a.rate - b.rate || b.pending - a.pending || a.name.localeCompare(b.name));

  const assigned = people.reduce((sum, item) => sum + item.total, 0);
  const read = people.reduce((sum, item) => sum + item.read, 0);
  const pending = Math.max(0, assigned - read);
  const rate = assigned ? Math.round((read / assigned) * 100) : 0;

  content.innerHTML = `
    <section class="csv2-performance-summary"><article><span>Pessoas exibidas</span><strong>${people.length}</strong></article><article><span>Atribuições</span><strong>${assigned}</strong></article><article><span>Leituras</span><strong>${read}</strong></article><article><span>Índice</span><strong>${rate}%</strong></article></section>
    <section class="csv2-performance-layout">
      <div class="csv2-performance-chart-card"><div class="csv2-list-heading"><div><strong>${personName ? `Evolução de ${esc(personName)}` : "Comparativo da seleção"}</strong><span>Leituras e atribuições dos últimos seis meses.</span></div></div><div class="csv2-chart-holder"><canvas id="csv2-performance-chart"></canvas></div></div>
      <div class="csv2-performance-ranking"><div class="csv2-list-heading"><div><strong>Resultado por colaborador</strong><span>${order === "best" ? "Melhores resultados primeiro" : order === "worst" ? "Maiores pendências primeiro" : "Ordem alfabética"}</span></div></div><div class="csv2-ranking-list">${people.length ? people.map((item) => {
        const level = item.rate >= 90 ? "good" : item.rate >= 70 ? "medium" : "low";
        return `<article><span class="csv2-team-avatar">${esc(item.name.charAt(0))}</span><div><strong>${esc(item.name)}</strong><small>${esc(item.sector)} • ${item.read}/${item.total} lidos</small><div class="csv2-progress"><i style="width:${item.rate}%"></i></div></div><span class="csv2-score ${level}">${item.rate}%</span></article>`;
      }).join("") : '<div class="csv2-empty"><i class="ri-filter-off-line"></i><strong>Nenhum resultado neste filtro</strong></div>'}</div></div>
    </section>
  `;

  if (personName && people[0]) {
    renderLineChart("csv2-performance-chart", "performanceChart", people[0].items, people[0].name);
  } else {
    renderCompanyPerformanceChart(people);
  }
}

function renderCompanyPerformanceChart(people) {
  const canvas = document.getElementById("csv2-performance-chart");
  if (!canvas || typeof Chart === "undefined") return;
  const months = recentMonths();
  const assigned = months.map(() => 0);
  const read = months.map(() => 0);
  people.forEach((person) => {
    person.items.forEach((item) => {
      const date = parseDate(bulletinDate(item));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const index = months.findIndex((month) => month.key === key);
      if (index < 0) return;
      assigned[index] += 1;
      if (hasRead(item, person.name)) read[index] += 1;
    });
  });
  state.performanceChart?.destroy?.();
  state.performanceChart = new Chart(canvas, {
    type: "bar",
    data: { labels: months.map((month) => month.label), datasets: [
      { label: "Atribuições", data: assigned, backgroundColor: "rgba(115,87,189,.75)", borderRadius: 7 },
      { label: "Leituras", data: read, backgroundColor: "rgba(34,166,111,.82)", borderRadius: 7 }
    ] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } }
  });
}

function subscribeData() {
  cleanupListeners();
  state.unsubscribers.push(onSnapshot(collection(db, "colaboradores"), (snapshot) => {
    state.collaborators = snapshot.docs.map((item) => ({ id: item.id, data: item.data() }));
    ensureTeamManager();
    renderBulletins();
    if (document.getElementById("csv2-performance-modal")?.style.display === "flex") renderPerformanceContent();
  }, (error) => console.warn("CSV fase 2 colaboradores:", error)));

  if (state.isAdmin) {
    state.unsubscribers.push(onSnapshot(collection(db, "usuarios"), (snapshot) => {
      state.users = snapshot.docs.map((item) => ({ id: item.id, data: item.data() }));
      ensureTeamManager();
      renderBulletins();
    }, (error) => console.warn("CSV fase 2 usuários:", error)));
  } else {
    state.users = [];
  }

  state.unsubscribers.push(onSnapshot(collection(db, "boletins"), (snapshot) => {
    state.bulletins = snapshot.docs.map((item) => ({ id: item.id, data: item.data() }));
    renderBulletins();
  }, (error) => console.warn("CSV fase 2 boletins:", error)));

  const privateRef = state.isAdmin
    ? collection(db, "boletins-privados")
    : query(collection(db, "boletins-privados"), where("Para qual Colaborador?", "==", state.profile.name));

  state.unsubscribers.push(onSnapshot(privateRef, (snapshot) => {
    state.privateBulletins = snapshot.docs.map((item) => ({ id: item.id, data: item.data() }));
    renderBulletins();
  }, (error) => console.warn("CSV fase 2 direcionados:", error)));
}

function bindNavigation() {
  document.querySelector('.nav-btn[data-tab="boletins"]')?.addEventListener("click", () => setTimeout(ensureBulletinExperience, 30));
  document.querySelector('.nav-btn[data-tab="colaboradores"]')?.addEventListener("click", () => {
    setTimeout(ensureTeamManager, 30);
    setTimeout(ensureTeamManager, 320);
    setTimeout(renderTeamManager, 700);
  });
}

async function handleAuth(user) {
  state.user = user;
  if (!user) {
    state.profile = null;
    state.isAdmin = false;
    cleanupListeners();
    return;
  }

  try {
    const profile = await loadProfile(user);

    if (!profile) {
      alert("Este login ainda não possui um perfil de acesso no painel.");
      await signOut(auth);
      return;
    }

    if (!profile.active && !profile.admin) {
      alert("Este acesso está desativado. Procure a gestão da clínica.");
      await signOut(auth);
      return;
    }

    state.profile = profile;
    state.isAdmin = profile.admin === true;

    keepNavigationClean();
    applyPhase2Permissions();

    setTimeout(applyPhase2Permissions, 100);
    setTimeout(applyPhase2Permissions, 700);
    roundRobotLogo();
    bindNavigation();
    ensureBulletinExperience();
    if (state.isAdmin) {
      ensureTeamManager();
      setTimeout(ensureTeamManager, 250);
      setTimeout(ensureTeamManager, 850);
      setTimeout(renderTeamManager, 1100);
    }
    subscribeData();
    console.log(`CSV Phase 2 ${CSV_PHASE2_VERSION} carregada`, profile);
  } catch (error) {
    console.error("CSV fase 2: não foi possível carregar o perfil", error);
  }
}

window.csv2EnsureTeamManager = ensureTeamManager;
window.csv2RenderTeamManager = renderTeamManager;
window.csv2EnsureBulletinExperience = ensureBulletinExperience;
window.csv2RefreshBulletins = renderBulletins;

function init() {
  keepNavigationClean();
  roundRobotLogo();
  installPhase2Login();
  onAuthStateChanged(auth, handleAuth);
  window.addEventListener("click", (event) => {
    const modal = event.target.closest(".csv2-modal");
    if (modal && event.target === modal) modal.style.display = "none";
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
