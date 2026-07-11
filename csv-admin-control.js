import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  limit,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const CSV_ADMIN_VERSION = "6.6.0";
const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const state = {
  user: null,
  profile: null,
  config: null,
  loginBannerTimer: null,
  loginBannerIndex: 0
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

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isAdmin() {
  if (window.csvPhase2State?.isAdmin === true) return true;
  if (state.profile?.admin === true) return true;

  const email = String(state.user?.email || "").toLowerCase();
  return email.endsWith("@clinica.com");
}

function currentPermissions() {
  const permissions =
    window.csvPhase2State?.profile?.permissions ||
    window.csvPhase2State?.profile?.permissoes ||
    state.profile?.permissoes ||
    state.profile?.permissions ||
    [];

  return new Set(Array.isArray(permissions) ? permissions : []);
}

function canOpen(tab) {
  if (isAdmin()) return tab !== "agenda-trabalho";

  const permissions = currentPermissions();

  if (tab === "home") return true;
  if (tab === "corpo-clinico" && permissions.has("agenda-corpo-clinico")) {
    return true;
  }

  return permissions.has(tab);
}

function driveImageUrl(raw = "") {
  const value = String(raw || "").trim();
  if (!value) return "";

  const match =
    value.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
    value.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if (match?.[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }

  return value;
}

function parseBannerLines(raw = "") {
  return String(raw || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [image = "", title = "", text = ""] = line
        .split("|")
        .map((part) => part.trim());

      return {
        image: driveImageUrl(image),
        title,
        text
      };
    })
    .filter((item) => item.image);
}

function showTab(tab, title = "") {
  if (!canOpen(tab)) {
    alert("Seu acesso não permite abrir esta área.");
    return;
  }

  document.querySelectorAll(".tab-content").forEach((section) => {
    section.classList.remove("active");
    section.style.display = "none";
  });

  document.querySelectorAll(".sidebar-nav .nav-btn[data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });

  const section = document.getElementById(`tab-${tab}`);
  if (!section) return;

  section.style.display = "block";
  section.classList.add("active", "csv-admin-tab-enter");

  const pageTitle = document.getElementById("page-title");
  if (pageTitle && title) pageTitle.textContent = title;

  const search = document.getElementById("search-box");
  if (search) search.style.display = "none";

  if (tab === "ativos") {
    setTimeout(() => {
      try {
        window.renderizarCards?.("ativos");
        window.renderizarPastasGenericas?.("ativos");
        window.renderizarPastaGenerica?.("ativos");
      } catch (error) {
        console.warn("Controle de ativos:", error);
      }
    }, 30);
  }

  if (tab === "ajustes") {
    renderAdminSettings();
  }

  if (tab === "corpo-clinico") {
    window.csvClinicalEnsurePages?.();
    window.csvClinicalRender?.();
  }

  if (tab === "convenios") {
    window.csvClinicalEnsurePages?.();
    window.csvHealthPlanRender?.();
  }
}

function removeLegacyWorkAgenda() {
  document.querySelectorAll(
    '.nav-btn[data-tab="agenda-trabalho"], #btn-nav-agenda-trabalho'
  ).forEach((element) => element.remove());

  const section = document.getElementById("tab-agenda-trabalho");
  if (section) {
    section.style.display = "none";
    section.dataset.csvRemoved = "1";
  }

  document.querySelectorAll('[onclick*="agenda-trabalho"]').forEach((element) => {
    element.remove();
  });

  const accessArea = document.querySelector(
    '[data-permission="agenda-trabalho"], input[value="agenda-trabalho"]'
  );
  accessArea?.closest("label")?.remove();
}

function renameAdminSettings() {
  const button = document.querySelector('.nav-btn[data-tab="ajustes"]');
  if (button) {
    button.innerHTML =
      '<i class="ri-settings-4-line"></i> Ajustes do Administrador';
  }
}

function guaranteeAdminTabs() {
  if (!isAdmin()) return;

  [
    "colaboradores",
    "ajustes",
    "ativos",
    "boletins-privados",
    "treinamentos",
    "ensino",
    "rh"
  ].forEach((tab) => {
    document.querySelectorAll(`.nav-btn[data-tab="${tab}"]`).forEach((button) => {
      button.style.removeProperty("display");
      button.classList.remove("csv2-hidden-nav");
    });
  });

  document.querySelectorAll(".admin-only").forEach((element) => {
    element.style.removeProperty("display");
  });
}

function interceptNavigation() {
  if (document.documentElement.dataset.csvAdminNavigation === "1") return;
  document.documentElement.dataset.csvAdminNavigation = "1";

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest(".nav-btn[data-tab]");
      if (!button) return;

      const tab = button.dataset.tab || "";

      if (tab === "agenda-trabalho") {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (!["ajustes", "ativos", "corpo-clinico", "convenios"].includes(tab)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const titles = {
        ajustes: "Ajustes do Administrador",
        ativos: "Controle de Ativos",
        "corpo-clinico": "Corpo Clínico",
        convenios: "Convênios"
      };

      showTab(tab, titles[tab]);
    },
    true
  );

  const originalIrParaAba = window.irParaAba;

  window.irParaAba = function(tab) {
    if (tab === "agenda-trabalho") return;

    if (["ajustes", "ativos", "corpo-clinico", "convenios"].includes(tab)) {
      const titles = {
        ajustes: "Ajustes do Administrador",
        ativos: "Controle de Ativos",
        "corpo-clinico": "Corpo Clínico",
        convenios: "Convênios"
      };

      showTab(tab, titles[tab]);
      return;
    }

    return originalIrParaAba?.(tab);
  };
}

function settingsDefaults() {
  return {
    loginBanners: "",
    loginBannerInterval: 8,
    homeAnnouncementActive: true,
    homeAnnouncementTitle: "Bem-vindo ao Painel Clínico",
    homeAnnouncementText: "",
    homeAnnouncementImage: "",
    homeAnnouncementButtonText: "",
    homeAnnouncementButtonLink: "",
    chatAvatar: "",
    primaryColor: "#8b252c",
    folderImage: "",
    locations: "",
    sectors: "",
    specialties: "",
    motives: "",
    pendingColor: "#e53e3e",
    completedColor: "#38a169"
  };
}

async function loadAdminSettings() {
  const defaults = settingsDefaults();

  try {
    const snapshot = await getDoc(doc(db, "configuracoes", "geral"));
    state.config = snapshot.exists()
      ? { ...defaults, ...(snapshot.data() || {}) }
      : defaults;
  } catch (error) {
    console.warn("Não foi possível carregar ajustes administrativos:", error);
    state.config = defaults;
  }

  applyAdminSettings();
  return state.config;
}

function applyHomeAnnouncement(config) {
  const area = document.getElementById("banner-area");
  const content = document.getElementById("banner-content");

  if (!area || !content) return;

  if (config.homeAnnouncementActive === false) {
    area.style.display = "none";
    return;
  }

  area.style.display = "";

  const image = driveImageUrl(config.homeAnnouncementImage || "");
  area.style.backgroundImage = image
    ? `linear-gradient(90deg, rgba(24,31,49,.82), rgba(24,31,49,.28)), url("${image}")`
    : "";

  area.classList.toggle("has-admin-image", Boolean(image));

  content.innerHTML = `
    <div class="csv-admin-home-announcement">
      <div>
        <span><i class="ri-notification-3-line"></i> Informação da gestão</span>
        <h2>${esc(config.homeAnnouncementTitle || "Bem-vindo ao Painel Clínico")}</h2>
        ${config.homeAnnouncementText
          ? `<p>${esc(config.homeAnnouncementText)}</p>`
          : ""}
      </div>
      ${config.homeAnnouncementButtonText && config.homeAnnouncementButtonLink
        ? `<a href="${esc(config.homeAnnouncementButtonLink)}" target="_blank" rel="noopener">
            ${esc(config.homeAnnouncementButtonText)}
            <i class="ri-arrow-right-up-line"></i>
          </a>`
        : ""}
    </div>
  `;
}

function loginPanelTarget() {
  return (
    document.querySelector("#login-screen .csv-login-ad-panel") ||
    document.querySelector("#login-screen .csv-login-brand-panel") ||
    document.querySelector("#login-screen .csv-login-visual-panel") ||
    document.querySelector("#login-screen .csv-login-left") ||
    document.querySelector("#login-screen > div > section:first-child")
  );
}

function renderLoginBannerAt(index = 0) {
  const config = state.config || settingsDefaults();
  const banners = parseBannerLines(config.loginBanners);
  const target = loginPanelTarget();

  if (!target) return;

  let card = document.getElementById("csv-admin-login-banner");

  if (!banners.length) {
    card?.remove();
    return;
  }

  if (!card) {
    card = document.createElement("div");
    card.id = "csv-admin-login-banner";
    card.className = "csv-admin-login-banner";
    target.appendChild(card);
  }

  const selected = banners[index % banners.length];

  card.innerHTML = `
    <div class="csv-admin-login-banner-image">
      <img src="${esc(selected.image)}" alt=""
        onerror="this.closest('.csv-admin-login-banner').style.display='none'">
    </div>
    <div class="csv-admin-login-banner-copy">
      <span><i class="ri-megaphone-line"></i> Comunicado</span>
      <strong>${esc(selected.title || "Informação da Clínica")}</strong>
      ${selected.text ? `<small>${esc(selected.text)}</small>` : ""}
    </div>
    ${banners.length > 1
      ? `<div class="csv-admin-login-banner-dots">
          ${banners.map((_, dotIndex) =>
            `<i class="${dotIndex === index % banners.length ? "active" : ""}"></i>`
          ).join("")}
        </div>`
      : ""}
  `;

  card.style.display = "";
}

function applyLoginBanners(config) {
  clearInterval(state.loginBannerTimer);
  state.loginBannerTimer = null;
  state.loginBannerIndex = 0;

  const banners = parseBannerLines(config.loginBanners);
  renderLoginBannerAt(0);

  if (banners.length <= 1) return;

  const intervalSeconds = Math.max(
    4,
    Number(config.loginBannerInterval || 8)
  );

  state.loginBannerTimer = setInterval(() => {
    state.loginBannerIndex =
      (state.loginBannerIndex + 1) % banners.length;

    renderLoginBannerAt(state.loginBannerIndex);
  }, intervalSeconds * 1000);
}

function applyAdminSettings() {
  const config = state.config || settingsDefaults();

  document.documentElement.style.setProperty(
    "--primary-color",
    config.primaryColor || "#8b252c"
  );

  if (config.pendingColor) {
    window.corStatusPendente = config.pendingColor;
  }

  if (config.completedColor) {
    window.corStatusConcluido = config.completedColor;
  }

  applyHomeAnnouncement(config);
  applyLoginBanners(config);
}

function renderAdminSettings() {
  if (!isAdmin()) {
    alert("Somente a gestão administrativa pode abrir esta área.");
    showTab("home", "Início");
    return;
  }

  const tab = document.getElementById("tab-ajustes");
  if (!tab) return;

  const config = state.config || settingsDefaults();

  tab.innerHTML = `
    <div class="csv-admin-settings-page">
      <header class="csv-admin-settings-hero">
        <div>
          <span class="csv-admin-settings-eyebrow">
            <i class="ri-shield-keyhole-line"></i>
            Administração do portal
          </span>
          <h2>Ajustes do Administrador</h2>
          <p>Controle os banners, anúncios, identidade visual, listas internas e manutenção do sistema.</p>
        </div>
        <div class="csv-admin-settings-status">
          <i class="ri-lock-2-line"></i>
          <div><strong>Acesso protegido</strong><small>Somente contas administrativas</small></div>
        </div>
      </header>

      <form id="csv-admin-settings-form" class="csv-admin-settings-form">
        <section class="csv-admin-settings-card">
          <div class="csv-admin-settings-card-title">
            <span class="purple"><i class="ri-layout-left-2-line"></i></span>
            <div><h3>Banners da tela de login</h3><p>Adicione imagens do Drive ou links diretos para exibir campanhas antes do acesso.</p></div>
          </div>

          <label class="csv-admin-settings-field full">
            <span>Banners — um por linha</span>
            <textarea name="loginBanners" rows="6"
              placeholder="LINK DA IMAGEM | Título | Texto curto">${esc(config.loginBanners || "")}</textarea>
            <small>Exemplo: link-do-drive | Campanha de vacinação | Confira as datas disponíveis.</small>
          </label>

          <label class="csv-admin-settings-field compact">
            <span>Trocar banner a cada</span>
            <div class="csv-admin-input-suffix">
              <input type="number" min="4" max="60" name="loginBannerInterval"
                value="${esc(config.loginBannerInterval || 8)}">
              <b>segundos</b>
            </div>
          </label>
        </section>

        <section class="csv-admin-settings-card">
          <div class="csv-admin-settings-card-title">
            <span class="blue"><i class="ri-megaphone-line"></i></span>
            <div><h3>Anúncio da tela inicial</h3><p>Use o banner principal para avisos, campanhas, datas importantes e orientações internas.</p></div>
          </div>

          <div class="csv-admin-settings-grid">
            <label class="csv-admin-settings-field">
              <span>Título do anúncio</span>
              <input name="homeAnnouncementTitle"
                value="${esc(config.homeAnnouncementTitle || "")}">
            </label>

            <label class="csv-admin-settings-field">
              <span>Imagem do anúncio — Drive ou URL</span>
              <input name="homeAnnouncementImage"
                value="${esc(config.homeAnnouncementImage || "")}">
            </label>

            <label class="csv-admin-settings-field full">
              <span>Texto do anúncio</span>
              <textarea name="homeAnnouncementText" rows="4">${esc(config.homeAnnouncementText || "")}</textarea>
            </label>

            <label class="csv-admin-settings-field">
              <span>Texto do botão</span>
              <input name="homeAnnouncementButtonText"
                value="${esc(config.homeAnnouncementButtonText || "")}"
                placeholder="Ex.: Ver comunicado">
            </label>

            <label class="csv-admin-settings-field">
              <span>Link do botão</span>
              <input name="homeAnnouncementButtonLink"
                value="${esc(config.homeAnnouncementButtonLink || "")}">
            </label>
          </div>

          <label class="csv-admin-switch">
            <input type="checkbox" name="homeAnnouncementActive"
              ${config.homeAnnouncementActive !== false ? "checked" : ""}>
            <span><strong>Anúncio ativo</strong><small>Desmarque para ocultar temporariamente.</small></span>
          </label>
        </section>

        <section class="csv-admin-settings-card">
          <div class="csv-admin-settings-card-title">
            <span class="green"><i class="ri-palette-line"></i></span>
            <div><h3>Identidade e organização</h3><p>Configurações usadas em pastas, chatbot, filtros e cadastros internos.</p></div>
          </div>

          <div class="csv-admin-settings-grid">
            <label class="csv-admin-settings-field">
              <span>Imagem ou avatar do chatbot</span>
              <input name="chatAvatar" value="${esc(config.chatAvatar || "")}">
            </label>

            <label class="csv-admin-settings-field">
              <span>Imagem padrão das pastas</span>
              <input name="folderImage" value="${esc(config.folderImage || "")}">
            </label>

            <label class="csv-admin-settings-field">
              <span>Cor principal</span>
              <input type="color" name="primaryColor"
                value="${esc(config.primaryColor || "#8b252c")}">
            </label>

            <label class="csv-admin-settings-field">
              <span>Cor de pendência</span>
              <input type="color" name="pendingColor"
                value="${esc(config.pendingColor || "#e53e3e")}">
            </label>

            <label class="csv-admin-settings-field">
              <span>Cor de concluído</span>
              <input type="color" name="completedColor"
                value="${esc(config.completedColor || "#38a169")}">
            </label>
          </div>

          <div class="csv-admin-settings-grid list-grid">
            <label class="csv-admin-settings-field">
              <span>Locais e prédios</span>
              <textarea name="locations" rows="6" placeholder="Um item por linha">${esc(config.locations || "")}</textarea>
            </label>

            <label class="csv-admin-settings-field">
              <span>Setores da clínica</span>
              <textarea name="sectors" rows="6" placeholder="Um item por linha">${esc(config.sectors || "")}</textarea>
            </label>

            <label class="csv-admin-settings-field">
              <span>Especialidades médicas</span>
              <textarea name="specialties" rows="6" placeholder="Uma especialidade por linha">${esc(config.specialties || "")}</textarea>
            </label>

            <label class="csv-admin-settings-field">
              <span>Motivos e classificações</span>
              <textarea name="motives" rows="6" placeholder="Um item por linha">${esc(config.motives || "")}</textarea>
            </label>
          </div>
        </section>

        <section class="csv-admin-settings-card maintenance">
          <div class="csv-admin-settings-card-title">
            <span class="red"><i class="ri-database-2-line"></i></span>
            <div><h3>Manutenção do Firebase</h3><p>A Agenda de Trabalho antiga foi retirada do portal. Esta limpeza é opcional e não afeta Corpo Clínico, Ativos, Boletins ou Convênios.</p></div>
          </div>

          <div class="csv-admin-maintenance-row">
            <div>
              <strong>Apagar histórico da antiga Agenda de Trabalho</strong>
              <small>Exclui somente documentos das coleções agenda-trabalho, agenda e tarefas.</small>
            </div>
            <button type="button" id="csv-clear-old-agenda">
              <i class="ri-delete-bin-6-line"></i>
              Limpar histórico antigo
            </button>
          </div>
        </section>

        <div class="csv-admin-settings-actions">
          <div id="csv-admin-settings-message"></div>
          <button type="submit">
            <i class="ri-save-3-line"></i>
            Salvar ajustes
          </button>
        </div>
      </form>
    </div>
  `;

  document
    .getElementById("csv-admin-settings-form")
    ?.addEventListener("submit", saveAdminSettings);

  document
    .getElementById("csv-clear-old-agenda")
    ?.addEventListener("click", clearOldAgendaHistory);
}

async function saveAdminSettings(event) {
  event.preventDefault();

  if (!isAdmin()) return;

  const form = event.currentTarget;
  const data = new FormData(form);
  const button = form.querySelector('button[type="submit"]');
  const message = document.getElementById("csv-admin-settings-message");
  const original = button.innerHTML;

  const payload = {
    loginBanners: String(data.get("loginBanners") || "").trim(),
    loginBannerInterval: Number(data.get("loginBannerInterval") || 8),
    homeAnnouncementActive: data.get("homeAnnouncementActive") === "on",
    homeAnnouncementTitle: String(data.get("homeAnnouncementTitle") || "").trim(),
    homeAnnouncementText: String(data.get("homeAnnouncementText") || "").trim(),
    homeAnnouncementImage: String(data.get("homeAnnouncementImage") || "").trim(),
    homeAnnouncementButtonText: String(data.get("homeAnnouncementButtonText") || "").trim(),
    homeAnnouncementButtonLink: String(data.get("homeAnnouncementButtonLink") || "").trim(),
    chatAvatar: String(data.get("chatAvatar") || "").trim(),
    primaryColor: String(data.get("primaryColor") || "#8b252c"),
    folderImage: String(data.get("folderImage") || "").trim(),
    locations: String(data.get("locations") || "").trim(),
    sectors: String(data.get("sectors") || "").trim(),
    specialties: String(data.get("specialties") || "").trim(),
    motives: String(data.get("motives") || "").trim(),
    pendingColor: String(data.get("pendingColor") || "#e53e3e"),
    completedColor: String(data.get("completedColor") || "#38a169"),

    // Campos legados mantidos para as partes antigas do painel.
    banner: String(data.get("homeAnnouncementTitle") || "").trim(),
    chatLogo: String(data.get("chatAvatar") || "").trim(),
    chatColor: String(data.get("primaryColor") || "#8b252c"),
    imagemPastas: String(data.get("folderImage") || "").trim(),
    locais: String(data.get("locations") || "").trim(),
    setores: String(data.get("sectors") || "").trim(),
    especialidades: String(data.get("specialties") || "").trim(),
    motivos: String(data.get("motives") || "").trim(),
    corPendente: String(data.get("pendingColor") || "#e53e3e"),
    corConcluido: String(data.get("completedColor") || "#38a169"),

    atualizadoEm: serverTimestamp(),
    atualizadoPor: state.user?.email || ""
  };

  button.disabled = true;
  button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Salvando...';
  message.textContent = "Salvando alterações...";
  message.className = "";

  try {
    await setDoc(doc(db, "configuracoes", "geral"), payload, { merge: true });

    state.config = { ...(state.config || {}), ...payload };
    applyAdminSettings();

    message.textContent = "Ajustes salvos e aplicados com sucesso.";
    message.className = "success";
  } catch (error) {
    console.error("Ajustes administrativos:", error);
    message.textContent =
      error?.code === "permission-denied"
        ? "O Firebase ainda está com regras antigas. Publique as regras 6.6."
        : `Não foi possível salvar: ${error.message}`;
    message.className = "error";
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

async function deleteCollectionBatches(collectionName) {
  let deleted = 0;

  while (true) {
    const snapshot = await getDocs(
      query(collection(db, collectionName), limit(350))
    );

    if (snapshot.empty) break;

    const batch = writeBatch(db);
    snapshot.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();

    deleted += snapshot.size;

    if (snapshot.size < 350) break;
  }

  return deleted;
}

async function clearOldAgendaHistory() {
  if (!isAdmin()) return;

  const confirmation = prompt(
    "Esta ação excluirá somente o histórico da antiga Agenda de Trabalho.\n\nDigite APAGAR AGENDA para continuar:"
  );

  if (confirmation !== "APAGAR AGENDA") {
    alert("Limpeza cancelada.");
    return;
  }

  const button = document.getElementById("csv-clear-old-agenda");
  const original = button.innerHTML;

  button.disabled = true;
  button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Limpando...';

  try {
    const collections = ["agenda-trabalho", "agenda", "tarefas"];
    let total = 0;

    for (const collectionName of collections) {
      total += await deleteCollectionBatches(collectionName);
    }

    await setDoc(
      doc(db, "configuracoes", "geral"),
      {
        agendaLegadaLimpaEm: serverTimestamp(),
        agendaLegadaLimpaPor: state.user?.email || ""
      },
      { merge: true }
    );

    alert(`${total} registros da agenda antiga foram excluídos.`);
  } catch (error) {
    console.error(error);
    alert(
      error?.code === "permission-denied"
        ? "O Firebase bloqueou a limpeza. Publique as regras 6.6 primeiro."
        : `Não foi possível concluir a limpeza: ${error.message}`
    );
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

async function loadProfile(user) {
  if (!user) return null;

  try {
    const snapshot = await getDoc(doc(db, "usuarios", user.uid));
    return snapshot.exists() ? snapshot.data() || {} : null;
  } catch (error) {
    console.warn("Perfil administrativo:", error);
    return null;
  }
}

async function handleAuth(user) {
  state.user = user;
  state.profile = user ? await loadProfile(user) : null;

  removeLegacyWorkAgenda();
  renameAdminSettings();
  guaranteeAdminTabs();

  if (user) {
    await loadAdminSettings();
    setTimeout(guaranteeAdminTabs, 150);
    setTimeout(guaranteeAdminTabs, 900);
  }
}

function init() {
  removeLegacyWorkAgenda();
  renameAdminSettings();
  interceptNavigation();

  onAuthStateChanged(auth, handleAuth);

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    removeLegacyWorkAgenda();
    renameAdminSettings();
    guaranteeAdminTabs();

    if (attempts >= 40) clearInterval(timer);
  }, 350);

  console.log(`CSV Admin Control ${CSV_ADMIN_VERSION} carregado.`);
}

window.csvAdminShowTab = showTab;
window.csvAdminRenderSettings = renderAdminSettings;
window.csvAdminApplySettings = applyAdminSettings;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
