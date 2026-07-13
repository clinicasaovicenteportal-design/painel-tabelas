import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const CSV_ENGAGEMENT_HUB_VERSION = "7.7.5";
const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const DEFAULT_CATEGORIES = [
  "Sugestão de melhoria",
  "Reclamação",
  "Elogio",
  "Erro ou problema",
  "Nova função",
  "Conteúdo ou boletim",
  "Benefícios",
  "Outro"
];

const BENEFIT_CATEGORIES = [
  "Cinema e entretenimento",
  "Viagens",
  "Hotéis e hospedagem",
  "Aluguel de veículos",
  "Alimentação",
  "Saúde e bem-estar",
  "Academias",
  "Educação e cursos",
  "Compras e lojas",
  "Serviços",
  "Outros"
];

const state = {
  user: null,
  profile: null,
  isAdmin: false,
  config: {
    feedbackCategories: DEFAULT_CATEGORIES,
    interfaceSurveyActive: true
  },
  campaign: {},
  feedback: [],
  surveyResponses: [],
  currentSurvey: null,
  benefits: [],
  feedbackFilter: "Todos",
  benefitFilter: "Todos",
  listeners: [],
  rendering: false
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
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function cleanArray(values = []) {
  return [...new Set(
    values
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )];
}

function safeHttpsUrl(value = "") {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" ? url.href : "";
  } catch (_) {
    return "";
  }
}

function dateValue(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value, withTime = true) {
  const date = dateValue(value);
  if (!date) return "Agora";

  return date.toLocaleString("pt-BR", withTime
    ? {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }
    : {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }
  );
}

function statusClass(value = "") {
  return normalize(value).replace(/[^a-z0-9]+/g, "-");
}

async function loadProfile(user) {
  if (!user) return null;

  const snapshot = await getDoc(doc(db, "usuarios", user.uid));
  const data = snapshot.exists() ? snapshot.data() || {} : {};
  const legacyAdmin = String(user.email || "").toLowerCase().includes("@clinica");

  return {
    uid: user.uid,
    email: user.email || data.email || "",
    name: data.nome || user.email?.split("@")[0] || "Colaborador",
    sector: data.setor || "Geral",
    admin: data.admin === true || legacyAdmin,
    active: data.ativo !== false
  };
}

function ensureStylesheet() {
  if (document.getElementById("csv-engagement-770-style")) return;

  const link = document.createElement("link");
  link.id = "csv-engagement-770-style";
  link.rel = "stylesheet";
  link.href = `./csv-engagement-7.7.css?v=${CSV_ENGAGEMENT_HUB_VERSION}`;
  document.head.appendChild(link);
}

function ensureModalRoot() {
  let root = document.getElementById("csv-engagement-modal-root");

  if (!root) {
    root = document.createElement("div");
    root.id = "csv-engagement-modal-root";
    document.body.appendChild(root);
  }

  return root;
}

function closeModal() {
  const root = ensureModalRoot();
  root.innerHTML = "";
  document.body.classList.remove("csv-engagement-modal-open");
}

function openModal(content, size = "medium") {
  const root = ensureModalRoot();
  root.innerHTML = `
    <div class="csv-engagement-modal" data-modal-backdrop>
      <div class="csv-engagement-modal-card ${esc(size)}">
        ${content}
      </div>
    </div>
  `;

  document.body.classList.add("csv-engagement-modal-open");
  root.querySelector("[data-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeModal();
  });
  root.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  return root;
}

function navButtonMarkup(tabId, label, icon) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nav-btn csv-engagement-nav";
  button.dataset.tab = tabId;
  button.id = `csv-nav-${tabId}`;
  button.innerHTML = `
    <i class="${icon}"></i>
    <span>${esc(label)}</span>
    <b class="csv-nav-notification" hidden>0</b>
  `;
  button.addEventListener("click", () => openTab(tabId));
  return button;
}

function ensureNavigation() {
  const nav = document.querySelector(".sidebar-nav");
  if (!nav) return;

  let opinions = document.getElementById("csv-nav-opinioes");
  let benefits = document.getElementById("csv-nav-beneficios");
  const firstAdmin = nav.querySelector(".admin-only");

  if (!opinions) {
    opinions = navButtonMarkup(
      "opinioes",
      "Opiniões e Melhorias",
      "ri-chat-smile-3-line"
    );
    nav.insertBefore(opinions, firstAdmin || null);
  }

  if (!benefits) {
    benefits = navButtonMarkup(
      "beneficios",
      "Clube de Benefícios",
      "ri-gift-2-line"
    );
    nav.insertBefore(benefits, firstAdmin || null);
  }

  if (state.user) {
    opinions.style.setProperty("display", "flex", "important");
    benefits.style.setProperty("display", "flex", "important");
  }
}

function ensureTabs() {
  const main = document.querySelector(".main-content");
  if (!main) return;

  if (!document.getElementById("tab-opinioes")) {
    const section = document.createElement("section");
    section.id = "tab-opinioes";
    section.className = "tab-content csv-engagement-tab";
    main.appendChild(section);
  }

  if (!document.getElementById("tab-beneficios")) {
    const section = document.createElement("section");
    section.id = "tab-beneficios";
    section.className = "tab-content csv-engagement-tab";
    main.appendChild(section);
  }
}

function manuallyActivateTab(tabId) {
  document.querySelectorAll(".tab-content").forEach((section) => {
    section.classList.remove("active");
    if (section.id !== `tab-${tabId}`) {
      section.style.setProperty("display", "none", "important");
    }
  });

  const target = document.getElementById(`tab-${tabId}`);
  if (target) {
    target.classList.add("active");
    target.style.setProperty("display", "block", "important");
  }

  document.querySelectorAll(".sidebar-nav .nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });

  const title = document.getElementById("page-title");
  if (title) {
    title.textContent =
      tabId === "opinioes"
        ? "Opiniões e Melhorias"
        : "Clube de Benefícios";
  }

  const search = document.getElementById("search-box");
  if (search) search.style.display = "none";
}

function openTab(tabId) {
  ensureNavigation();
  ensureTabs();

  try {
    window.irParaAba?.(tabId);
  } catch (_) {}

  setTimeout(() => {
    manuallyActivateTab(tabId);
    if (tabId === "opinioes") renderOpinions();
    if (tabId === "beneficios") renderBenefits();
  }, 30);
}

function activeTabId() {
  const active = document.querySelector(".sidebar-nav .nav-btn.active");
  return active?.dataset?.tab || "";
}

function keepNavigationVisible() {
  if (!state.user) return;
  ensureNavigation();
  ["opinioes", "beneficios"].forEach((tab) => {
    const button = document.getElementById(`csv-nav-${tab}`);
    if (button && button.style.display !== "flex") {
      button.style.setProperty("display", "flex", "important");
    }
  });
}

function startNavigationGuard() {
  const nav = document.querySelector(".sidebar-nav");
  if (!nav || nav.dataset.csvEngagementObserved) return;

  nav.dataset.csvEngagementObserved = "1";
  const observer = new MutationObserver(() => {
    keepNavigationVisible();
  });

  observer.observe(nav, {
    attributes: true,
    childList: true,
    subtree: true
  });
}

function clearListeners() {
  state.listeners.forEach((unsubscribe) => {
    try {
      unsubscribe?.();
    } catch (_) {}
  });
  state.listeners = [];
}

function categories() {
  const configured = Array.isArray(state.config.feedbackCategories)
    ? state.config.feedbackCategories
    : DEFAULT_CATEGORIES;

  return cleanArray([...configured, "Outro"]);
}

function categoryIcon(category) {
  const value = normalize(category);

  if (value.includes("elogio")) return "ri-heart-3-line";
  if (value.includes("reclam")) return "ri-error-warning-line";
  if (value.includes("erro") || value.includes("problema")) return "ri-bug-line";
  if (value.includes("benef")) return "ri-gift-line";
  if (value.includes("conteudo") || value.includes("boletim")) return "ri-file-text-line";
  if (value.includes("funcao")) return "ri-sparkling-2-line";
  if (value.includes("sugest")) return "ri-lightbulb-flash-line";
  return "ri-chat-3-line";
}

function feedbackCounts() {
  const counts = new Map();
  categories().forEach((category) => counts.set(category, 0));

  state.feedback.forEach((item) => {
    const type = String(item.data?.tipo || "Outro");
    counts.set(type, (counts.get(type) || 0) + 1);
  });

  return counts;
}

function newFeedbackCount() {
  return state.feedback.filter((item) =>
    ["nova", "em analise"].includes(normalize(item.data?.status || "Nova"))
  ).length;
}

function answeredForCurrentUserCount() {
  return state.feedback.filter((item) =>
    item.data?.uid === state.user?.uid &&
    Boolean(String(item.data?.respostaAdmin || "").trim()) &&
    item.data?.respostaVisualizada !== true
  ).length;
}

function updateNavBadges() {
  const button = document.querySelector("#csv-nav-opinioes .csv-nav-notification");
  if (!button) return;

  const count = state.isAdmin ? newFeedbackCount() : answeredForCurrentUserCount();
  button.hidden = count < 1;
  button.textContent = String(count);
}

function listenConfig() {
  const unsubscribe = onSnapshot(
    doc(db, "configuracoes", "engagement"),
    (snapshot) => {
      if (snapshot.exists()) {
        state.config = {
          ...state.config,
          ...(snapshot.data() || {})
        };
      }

      if (activeTabId() === "opinioes") renderOpinions();
    },
    (error) => console.warn("Configuração de engajamento:", error)
  );

  state.listeners.push(unsubscribe);
}

function listenCampaign() {
  const unsubscribe = onSnapshot(
    doc(db, "configuracoes", "campanha-acesso"),
    (snapshot) => {
      state.campaign = snapshot.exists() ? snapshot.data() || {} : {};
      if (activeTabId() === "opinioes" && state.isAdmin) renderOpinions();
    },
    (error) => console.warn("Campanha de acesso:", error)
  );

  state.listeners.push(unsubscribe);
}

function listenFeedback() {
  const source = state.isAdmin
    ? collection(db, "feedback-plataforma")
    : query(
        collection(db, "feedback-plataforma"),
        where("uid", "==", state.user.uid)
      );

  const unsubscribe = onSnapshot(
    source,
    (snapshot) => {
      state.feedback = snapshot.docs
        .map((item) => ({ id: item.id, data: item.data() || {} }))
        .sort((a, b) => {
          const aDate = dateValue(a.data?.criadoEm)?.getTime() || 0;
          const bDate = dateValue(b.data?.criadoEm)?.getTime() || 0;
          return bDate - aDate;
        });

      updateNavBadges();
      if (activeTabId() === "opinioes") renderOpinions();
    },
    (error) => console.warn("Opiniões e melhorias:", error)
  );

  state.listeners.push(unsubscribe);
}

function listenSurvey() {
  const source = state.isAdmin
    ? collection(db, "pesquisa-interface")
    : doc(db, "pesquisa-interface", state.user.uid);

  const unsubscribe = onSnapshot(
    source,
    (snapshot) => {
      if (state.isAdmin) {
        state.surveyResponses = snapshot.docs.map((item) => ({
          id: item.id,
          data: item.data() || {}
        }));
      } else {
        state.currentSurvey = snapshot.exists()
          ? { id: snapshot.id, data: snapshot.data() || {} }
          : null;
      }

      if (activeTabId() === "opinioes") renderOpinions();
    },
    (error) => console.warn("Pesquisa da interface:", error)
  );

  state.listeners.push(unsubscribe);
}

function listenBenefits() {
  const unsubscribe = onSnapshot(
    collection(db, "beneficios"),
    (snapshot) => {
      state.benefits = snapshot.docs
        .map((item) => ({ id: item.id, data: item.data() || {} }))
        .sort((a, b) => {
          const featuredA = a.data?.featured === true ? 1 : 0;
          const featuredB = b.data?.featured === true ? 1 : 0;
          if (featuredA !== featuredB) return featuredB - featuredA;
          return String(a.data?.title || "").localeCompare(
            String(b.data?.title || ""),
            "pt-BR"
          );
        });

      if (activeTabId() === "beneficios") renderBenefits();
    },
    (error) => console.warn("Clube de benefícios:", error)
  );

  state.listeners.push(unsubscribe);
}

function startListeners() {
  clearListeners();
  listenConfig();
  listenCampaign();
  listenFeedback();
  listenSurvey();
  listenBenefits();
}

function reasonCardsMarkup() {
  const counts = feedbackCounts();
  const cards = [
    ["Todos", state.feedback.length],
    ...[...counts.entries()]
  ];

  return cards.map(([category, count]) => `
    <button
      type="button"
      class="csv-reason-card ${state.feedbackFilter === category ? "active" : ""}"
      data-feedback-filter="${esc(category)}">
      <i class="${category === "Todos" ? "ri-inbox-archive-line" : categoryIcon(category)}"></i>
      <span>${esc(category)}</span>
      <strong>${count}</strong>
    </button>
  `).join("");
}

function adminFeedbackListMarkup() {
  const items = state.feedback.filter((item) => {
    if (state.feedbackFilter === "Todos") return true;
    return String(item.data?.tipo || "Outro") === state.feedbackFilter;
  });

  if (!items.length) {
    return `
      <div class="csv-engagement-empty">
        <i class="ri-inbox-line"></i>
        <strong>Nenhuma mensagem nesta categoria</strong>
        <span>As novas manifestações da equipe aparecerão aqui.</span>
      </div>
    `;
  }

  return items.map((item) => {
    const data = item.data || {};
    const answered = Boolean(String(data.respostaAdmin || "").trim());

    return `
      <article class="csv-feedback-ticket">
        <header>
          <div class="csv-feedback-person">
            <span>${esc(String(data.nome || "?").slice(0, 1).toUpperCase())}</span>
            <div>
              <strong>${esc(data.nome || "Colaborador")}</strong>
              <small>${esc(data.setor || "Geral")} • ${formatDate(data.criadoEm)}</small>
            </div>
          </div>
          <div class="csv-feedback-badges">
            <span class="type"><i class="${categoryIcon(data.tipo)}"></i>${esc(data.tipo || "Outro")}</span>
            <span class="status ${statusClass(data.status || "Nova")}">${esc(data.status || "Nova")}</span>
          </div>
        </header>
        <h3>${esc(data.titulo || "Mensagem sem título")}</h3>
        <p>${esc(data.mensagem || "")}</p>
        ${answered ? `
          <div class="csv-feedback-admin-answer">
            <i class="ri-reply-line"></i>
            <div>
              <strong>Resposta da gestão</strong>
              <p>${esc(data.respostaAdmin)}</p>
            </div>
          </div>
        ` : ""}
        <footer>
          <span>Prioridade: <b>${esc(data.prioridade || "Normal")}</b></span>

          <div class="csv-feedback-actions">
            <button
              type="button"
              class="csv-feedback-delete danger"
              data-delete-feedback="${item.id}">
              <i class="ri-delete-bin-6-line"></i>
              Excluir
            </button>

            <button type="button" data-open-feedback="${item.id}">
              <i class="ri-chat-check-line"></i>
              ${answered ? "Atualizar resposta" : "Responder"}
            </button>
          </div>
        </footer>
      </article>
    `;
  }).join("");
}

function categoryManagerMarkup() {
  return `
    <section class="csv-admin-config-card">
      <div class="csv-section-heading">
        <div>
          <span><i class="ri-price-tag-3-line"></i> Motivos disponíveis</span>
          <h3>Categorias das mensagens</h3>
          <p>Crie tipos personalizados para organizar sugestões, elogios e reclamações.</p>
        </div>
      </div>

      <div class="csv-category-chip-list">
        ${categories().map((category) => `
          <span>
            <i class="${categoryIcon(category)}"></i>
            ${esc(category)}
            ${category !== "Outro" ? `
              <button type="button" data-remove-category="${esc(category)}" aria-label="Remover ${esc(category)}">
                <i class="ri-close-line"></i>
              </button>
            ` : ""}
          </span>
        `).join("")}
      </div>

      <form id="csv-add-category-form" class="csv-inline-form">
        <input id="csv-new-category" type="text" maxlength="45" placeholder="Novo motivo">
        <button type="submit"><i class="ri-add-line"></i> Adicionar motivo</button>
      </form>
    </section>
  `;
}

function campaignAdminMarkup() {
  const config = state.campaign || {};
  const sectors = Array.isArray(config.sectors) ? config.sectors.join(", ") : "";

  return `
    <section class="csv-admin-config-card csv-campaign-admin-card">
      <div class="csv-section-heading">
        <div>
          <span><i class="ri-login-circle-line"></i> Campanha antes do painel</span>
          <h3>Vídeo, texto ou documento obrigatório</h3>
          <p>
            O colaborador informa usuário e senha e, antes de entrar no painel,
            confirma a visualização deste material.
          </p>
        </div>
        <label class="csv-switch-line">
          <input type="checkbox" id="csv-campaign-active" ${config.active === true ? "checked" : ""}>
          <span>Campanha ativa</span>
        </label>
      </div>

      <form id="csv-campaign-admin-form" class="csv-admin-grid-form">
        <label class="full">
          <span>Título principal</span>
          <input name="title" maxlength="120" value="${esc(config.title || "")}" placeholder="Ex.: Campanha de prevenção e segurança">
        </label>

        <label class="full">
          <span>Texto de apresentação</span>
          <textarea name="description" rows="4" placeholder="Explique o que a pessoa precisa ver ou ler.">${esc(config.description || "")}</textarea>
        </label>

        <label>
          <span>Tipo de material</span>
          <select name="mediaType">
            ${[
              ["texto", "Somente texto"],
              ["video", "Vídeo"],
              ["imagem", "Imagem"],
              ["documento", "Documento / PDF"]
            ].map(([value, label]) => `
              <option value="${value}" ${String(config.mediaType || "texto") === value ? "selected" : ""}>${label}</option>
            `).join("")}
          </select>
        </label>

        <label>
          <span>Link do material</span>
          <input name="mediaUrl" type="url" value="${esc(config.mediaUrl || "")}" placeholder="YouTube, Vimeo, Google Drive ou HTTPS">
        </label>

        <label>
          <span>Público</span>
          <select name="audienceType">
            <option value="todos" ${String(config.audienceType || "todos") === "todos" ? "selected" : ""}>Toda a equipe</option>
            <option value="setores" ${String(config.audienceType || "") === "setores" ? "selected" : ""}>Setores específicos</option>
          </select>
        </label>

        <label>
          <span>Setores, separados por vírgula</span>
          <input name="sectors" value="${esc(sectors)}" placeholder="Recepção, Financeiro, Comercial">
        </label>

        <label>
          <span>Tempo mínimo de visualização</span>
          <input name="minimumSeconds" type="number" min="0" max="180" value="${Number(config.minimumSeconds || 0)}">
        </label>

        <label class="csv-check-option">
          <input name="requireRating" type="checkbox" ${config.requireRating === true ? "checked" : ""}>
          <span>Exigir avaliação de 1 a 5 estrelas</span>
        </label>

        <label class="csv-check-option">
          <input name="requireComment" type="checkbox" ${config.requireComment === true ? "checked" : ""}>
          <span>Exigir observação do colaborador</span>
        </label>

        <div class="csv-form-actions full">
          <button type="button" class="secondary" id="csv-preview-campaign">
            <i class="ri-eye-line"></i> Pré-visualizar
          </button>
          <button type="submit" class="primary">
            <i class="ri-save-line"></i> Salvar campanha
          </button>
        </div>

        <div id="csv-campaign-admin-status" class="csv-form-status full"></div>
      </form>
    </section>
  `;
}

function surveyAnalyticsMarkup() {
  const responses = state.surveyResponses;
  const total = responses.length;
  const average = total
    ? responses.reduce((sum, item) => sum + Number(item.data?.rating || 0), 0) / total
    : 0;
  const easy = responses.filter((item) =>
    ["muito facil", "facil"].includes(normalize(item.data?.ease))
  ).length;
  const approved = responses.filter((item) => Number(item.data?.rating || 0) >= 4).length;
  const comments = responses.filter((item) => String(item.data?.comment || "").trim());

  return `
    <section class="csv-admin-config-card">
      <div class="csv-section-heading">
        <div>
          <span><i class="ri-pie-chart-2-line"></i> Pesquisa da interface</span>
          <h3>Votação sobre a experiência da plataforma</h3>
          <p>Acompanhe notas, facilidade de uso e sugestões individuais.</p>
        </div>
        <label class="csv-switch-line">
          <input type="checkbox" id="csv-interface-survey-active" ${state.config.interfaceSurveyActive !== false ? "checked" : ""}>
          <span>Pesquisa ativa</span>
        </label>
      </div>

      <div class="csv-survey-summary">
        <article><span>Respostas</span><strong>${total}</strong><i class="ri-survey-line"></i></article>
        <article><span>Nota média</span><strong>${average.toFixed(1)}</strong><i class="ri-star-smile-line"></i></article>
        <article><span>Aprovação</span><strong>${total ? Math.round((approved / total) * 100) : 0}%</strong><i class="ri-thumb-up-line"></i></article>
        <article><span>Fácil de usar</span><strong>${total ? Math.round((easy / total) * 100) : 0}%</strong><i class="ri-magic-line"></i></article>
      </div>

      <div class="csv-survey-comments">
        ${comments.length ? comments.slice(0, 20).map((item) => `
          <article>
            <header>
              <strong>${esc(item.data?.nome || "Colaborador")}</strong>
              <span>${Number(item.data?.rating || 0)} ★</span>
            </header>
            <small>${esc(item.data?.setor || "Geral")} • ${esc(item.data?.ease || "")}</small>
            <p>${esc(item.data?.comment || "")}</p>
            ${item.data?.priority ? `<b>Prioridade indicada: ${esc(item.data.priority)}</b>` : ""}
          </article>
        `).join("") : `
          <div class="csv-engagement-empty compact">
            <i class="ri-chat-quote-line"></i>
            <strong>Ainda não há comentários</strong>
          </div>
        `}
      </div>
    </section>
  `;
}

function employeeSurveyMarkup() {
  if (state.config.interfaceSurveyActive === false) return "";

  const data = state.currentSurvey?.data || {};
  const currentRating = Number(data.rating || 0);

  return `
    <section class="csv-survey-card">
      <div class="csv-section-heading">
        <div>
          <span><i class="ri-layout-4-line"></i> Pesquisa rápida</span>
          <h3>O que você achou da interface?</h3>
          <p>Sua avaliação ajuda a gestão a escolher as próximas melhorias.</p>
        </div>
        ${state.currentSurvey ? '<b class="csv-saved-badge"><i class="ri-check-line"></i> Avaliação salva</b>' : ""}
      </div>

      <form id="csv-interface-survey-form">
        <div class="csv-form-block">
          <span class="csv-field-title">Sua nota para a plataforma</span>
          <div class="csv-star-picker large" data-survey-stars>
            ${[1, 2, 3, 4, 5].map((star) => {
              const active = star <= currentRating;
              return `
                <button type="button" data-value="${star}" class="${active ? "active" : ""}">
                  <i class="${active ? "ri-star-fill" : "ri-star-line"}"></i>
                </button>
              `;
            }).join("")}
          </div>
          <input type="hidden" name="rating" value="${currentRating}">
        </div>

        <div class="csv-two-column-form">
          <label>
            <span>Facilidade de uso</span>
            <select name="ease">
              ${["Muito fácil", "Fácil", "Razoável", "Difícil"].map((value) => `
                <option ${String(data.ease || "") === value ? "selected" : ""}>${value}</option>
              `).join("")}
            </select>
          </label>

          <label>
            <span>O que deveria melhorar primeiro?</span>
            <select name="priority">
              ${[
                "Menu e navegação",
                "Boletins e informativos",
                "Velocidade",
                "Visual e organização",
                "Benefícios",
                "Outros"
              ].map((value) => `
                <option ${String(data.priority || "") === value ? "selected" : ""}>${value}</option>
              `).join("")}
            </select>
          </label>
        </div>

        <label class="csv-full-field">
          <span>Comentário ou sugestão</span>
          <textarea name="comment" rows="4" placeholder="Conte o que gostou e o que pode melhorar.">${esc(data.comment || "")}</textarea>
        </label>

        <div class="csv-form-actions">
          <span id="csv-survey-status" class="csv-form-status"></span>
          <button type="submit" class="primary">
            <i class="ri-send-plane-2-line"></i>
            ${state.currentSurvey ? "Atualizar avaliação" : "Enviar avaliação"}
          </button>
        </div>
      </form>
    </section>
  `;
}

function employeeFeedbackMarkup() {
  return `
    <section class="csv-feedback-compose">
      <div class="csv-section-heading">
        <div>
          <span><i class="ri-chat-smile-3-line"></i> Fale com a gestão</span>
          <h3>Envie uma sugestão, reclamação ou elogio</h3>
          <p>A resposta ficará disponível somente na sua conta.</p>
        </div>
      </div>

      <form id="csv-feedback-form" class="csv-feedback-form">
        <label>
          <span>Motivo</span>
          <select name="tipo">
            ${categories().map((category) => `
              <option value="${esc(category)}">${esc(category)}</option>
            `).join("")}
          </select>
        </label>

        <label>
          <span>Assunto</span>
          <input name="titulo" maxlength="100" required placeholder="Resuma sua mensagem">
        </label>

        <label class="full">
          <span>Mensagem</span>
          <textarea name="mensagem" rows="5" maxlength="2000" required placeholder="Escreva sua sugestão, elogio, reclamação ou necessidade."></textarea>
        </label>

        <div class="csv-form-actions full">
          <span id="csv-feedback-status" class="csv-form-status"></span>
          <button type="submit" class="primary">
            <i class="ri-send-plane-line"></i> Enviar para a gestão
          </button>
        </div>
      </form>
    </section>

    <section class="csv-my-feedback">
      <div class="csv-section-heading">
        <div>
          <span><i class="ri-history-line"></i> Acompanhamento</span>
          <h3>Minhas mensagens</h3>
          <p>Consulte respostas e o andamento de cada solicitação.</p>
        </div>
      </div>

      <div class="csv-my-feedback-list">
        ${state.feedback.length ? state.feedback.map((item) => {
          const data = item.data || {};
          const answered = Boolean(String(data.respostaAdmin || "").trim());
          const canDeleteOwn =
            !answered &&
            ["nova", "em analise"].includes(
              normalize(data.status || "Nova")
            );

          return `
            <article class="csv-my-feedback-card">
              <header>
                <span class="type"><i class="${categoryIcon(data.tipo)}"></i>${esc(data.tipo || "Outro")}</span>
                <span class="status ${statusClass(data.status || "Nova")}">${esc(data.status || "Nova")}</span>
              </header>
              <h4>${esc(data.titulo || "Mensagem")}</h4>
              <p>${esc(data.mensagem || "")}</p>
              ${answered ? `
                <div class="csv-feedback-admin-answer">
                  <i class="ri-customer-service-2-line"></i>
                  <div>
                    <strong>Resposta da gestão</strong>
                    <p>${esc(data.respostaAdmin)}</p>
                    <small>${formatDate(data.respondidoEm)}</small>
                  </div>
                </div>
              ` : `
                <div class="csv-feedback-waiting">
                  <i class="ri-time-line"></i>
                  Aguardando retorno da gestão
                </div>
              `}
              <footer>
                <span>${formatDate(data.criadoEm)}</span>

                ${canDeleteOwn ? `
                  <button
                    type="button"
                    class="csv-feedback-delete-own"
                    data-delete-own-feedback="${item.id}">
                    <i class="ri-delete-bin-6-line"></i>
                    Excluir mensagem
                  </button>
                ` : ""}
              </footer>
            </article>
          `;
        }).join("") : `
          <div class="csv-engagement-empty compact">
            <i class="ri-mail-open-line"></i>
            <strong>Você ainda não enviou mensagens</strong>
            <span>Use o formulário acima para falar com a gestão.</span>
          </div>
        `}
      </div>
    </section>
  `;
}

function renderAdminOpinions(root) {
  root.innerHTML = `
    <header class="csv-engagement-hero admin">
      <div>
        <span><i class="ri-dashboard-3-line"></i> Central de escuta e experiência</span>
        <h2>Opiniões, melhorias e avaliações</h2>
        <p>
          Organize as mensagens da equipe, responda individualmente,
          acompanhe a pesquisa da interface e publique campanhas obrigatórias.
        </p>
      </div>
      <div class="csv-hero-stat">
        <strong>${newFeedbackCount()}</strong>
        <span>aguardando análise</span>
      </div>
    </header>

    <section class="csv-reason-section">
      <div class="csv-section-heading">
        <div>
          <span><i class="ri-layout-grid-line"></i> Mensagens por motivo</span>
          <h3>Visão rápida das manifestações</h3>
          <p>Clique em um card para filtrar a lista.</p>
        </div>
      </div>
      <div class="csv-reason-grid">${reasonCardsMarkup()}</div>
    </section>

    <section class="csv-feedback-admin-list">
      <div class="csv-section-heading">
        <div>
          <span><i class="ri-inbox-2-line"></i> Caixa de entrada</span>
          <h3>${esc(state.feedbackFilter)}</h3>
          <p>${state.feedback.length} mensagem(ns) recebida(s) no total.</p>
        </div>
      </div>
      <div class="csv-feedback-ticket-list">${adminFeedbackListMarkup()}</div>
    </section>

    <div class="csv-admin-config-grid">
      ${categoryManagerMarkup()}
      ${surveyAnalyticsMarkup()}
    </div>

    ${campaignAdminMarkup()}
  `;

  bindAdminOpinions(root);
}

function renderEmployeeOpinions(root) {
  root.innerHTML = `
    <header class="csv-engagement-hero">
      <div>
        <span><i class="ri-chat-heart-line"></i> Sua opinião melhora o portal</span>
        <h2>Ajude a construir uma plataforma melhor</h2>
        <p>
          Envie ideias, elogios, reclamações ou pedidos de novos recursos.
          A gestão poderá responder diretamente por aqui.
        </p>
      </div>
      <div class="csv-hero-profile">
        <span>${esc(String(state.profile?.name || "?").slice(0, 1).toUpperCase())}</span>
        <div><strong>${esc(state.profile?.name || "Colaborador")}</strong><small>${esc(state.profile?.sector || "Geral")}</small></div>
      </div>
    </header>

    ${employeeFeedbackMarkup()}
    ${employeeSurveyMarkup()}
  `;

  bindEmployeeOpinions(root);
}

function renderOpinions() {
  const root = document.getElementById("tab-opinioes");
  if (!root || !state.profile || state.rendering) return;

  state.rendering = true;
  try {
    if (state.isAdmin) {
      renderAdminOpinions(root);
    } else {
      renderEmployeeOpinions(root);
    }
  } finally {
    state.rendering = false;
  }
}

function bindStarPicker(holder, input) {
  holder?.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const value = Number(button.dataset.value || 0);
      input.value = String(value);

      holder.querySelectorAll("button").forEach((item) => {
        const active = Number(item.dataset.value || 0) <= value;
        item.classList.toggle("active", active);
        item.innerHTML = `<i class="${active ? "ri-star-fill" : "ri-star-line"}"></i>`;
      });
    });
  });
}

async function submitFeedback(form) {
  const status = form.querySelector("#csv-feedback-status");
  const button = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  const title = String(formData.get("titulo") || "").trim();
  const message = String(formData.get("mensagem") || "").trim();
  const type = String(formData.get("tipo") || "Outro").trim();

  if (!title || message.length < 5) {
    if (status) status.textContent = "Preencha o assunto e escreva uma mensagem.";
    return;
  }

  button.disabled = true;
  button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Enviando...';

  try {
    await addDoc(collection(db, "feedback-plataforma"), {
      uid: state.user.uid,
      email: state.user.email || "",
      nome: state.profile.name,
      setor: state.profile.sector,
      tipo: type,
      titulo: title,
      mensagem: message,
      status: "Nova",
      prioridade: "Normal",
      respostaAdmin: "",
      respostaVisualizada: false,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    });

    form.reset();
    if (status) {
      status.textContent = "Mensagem enviada com sucesso.";
      status.className = "csv-form-status success";
    }
  } catch (error) {
    console.error("Enviar opinião:", error);
    if (status) {
      status.textContent =
        error?.code === "permission-denied"
          ? "As regras do Firestore ainda precisam ser publicadas."
          : "Não foi possível enviar agora.";
      status.className = "csv-form-status error";
    }
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="ri-send-plane-line"></i> Enviar para a gestão';
  }
}

async function submitSurvey(form) {
  const status = form.querySelector("#csv-survey-status");
  const button = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  const rating = Number(formData.get("rating") || 0);

  if (rating < 1) {
    if (status) status.textContent = "Escolha uma nota de 1 a 5 estrelas.";
    return;
  }

  button.disabled = true;
  button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Salvando...';

  try {
    await setDoc(doc(db, "pesquisa-interface", state.user.uid), {
      uid: state.user.uid,
      nome: state.profile.name,
      setor: state.profile.sector,
      rating,
      ease: String(formData.get("ease") || ""),
      priority: String(formData.get("priority") || ""),
      comment: String(formData.get("comment") || "").trim(),
      updatedAt: serverTimestamp(),
      createdAt: state.currentSurvey?.data?.createdAt || serverTimestamp()
    }, { merge: true });

    if (status) {
      status.textContent = "Avaliação registrada. Obrigado!";
      status.className = "csv-form-status success";
    }
  } catch (error) {
    console.error("Pesquisa da interface:", error);
    if (status) {
      status.textContent =
        error?.code === "permission-denied"
          ? "As regras do Firestore ainda precisam ser publicadas."
          : "Não foi possível salvar a avaliação.";
      status.className = "csv-form-status error";
    }
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="ri-send-plane-2-line"></i> Atualizar avaliação';
  }
}

function bindEmployeeOpinions(root) {
  root.querySelector("#csv-feedback-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    submitFeedback(event.currentTarget);
  });


  root.querySelectorAll("[data-delete-own-feedback]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteFeedbackMessage(
        button.dataset.deleteOwnFeedback,
        true
      );
    });
  });

  const surveyForm = root.querySelector("#csv-interface-survey-form");
  if (surveyForm) {
    const input = surveyForm.querySelector('input[name="rating"]');
    bindStarPicker(surveyForm.querySelector("[data-survey-stars]"), input);

    surveyForm.addEventListener("submit", (event) => {
      event.preventDefault();
      submitSurvey(event.currentTarget);
    });
  }
}

function feedbackReplyModal(item) {
  const data = item.data || {};

  const root = openModal(`
    <header class="csv-modal-header">
      <div>
        <span><i class="${categoryIcon(data.tipo)}"></i>${esc(data.tipo || "Outro")}</span>
        <h2>${esc(data.titulo || "Mensagem")}</h2>
        <p>${esc(data.nome || "Colaborador")} • ${esc(data.setor || "Geral")}</p>
      </div>
      <button type="button" data-close-modal><i class="ri-close-line"></i></button>
    </header>

    <div class="csv-modal-body">
      <div class="csv-original-message">
        <strong>Mensagem enviada</strong>
        <p>${esc(data.mensagem || "")}</p>
        <small>${formatDate(data.criadoEm)}</small>
      </div>

      <form id="csv-feedback-reply-form" class="csv-admin-grid-form">
        <label>
          <span>Status</span>
          <select name="status">
            ${["Nova", "Em análise", "Respondida", "Concluída"].map((value) => `
              <option ${String(data.status || "Nova") === value ? "selected" : ""}>${value}</option>
            `).join("")}
          </select>
        </label>

        <label>
          <span>Prioridade</span>
          <select name="priority">
            ${["Baixa", "Normal", "Alta", "Urgente"].map((value) => `
              <option ${String(data.prioridade || "Normal") === value ? "selected" : ""}>${value}</option>
            `).join("")}
          </select>
        </label>

        <label class="full">
          <span>Resposta para o colaborador</span>
          <textarea name="answer" rows="7" required placeholder="Escreva a resposta da gestão.">${esc(data.respostaAdmin || "")}</textarea>
        </label>

        <div class="csv-form-actions full">
          <span id="csv-feedback-reply-status" class="csv-form-status"></span>
          <button type="submit" class="primary">
            <i class="ri-reply-line"></i> Salvar resposta
          </button>
        </div>
      </form>
    </div>
  `, "medium");

  root.querySelector("#csv-feedback-reply-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const answer = String(formData.get("answer") || "").trim();
    const status = form.querySelector("#csv-feedback-reply-status");
    const button = form.querySelector('button[type="submit"]');

    if (!answer) {
      status.textContent = "Escreva uma resposta.";
      return;
    }

    button.disabled = true;
    button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Salvando...';

    try {
      await updateDoc(doc(db, "feedback-plataforma", item.id), {
        respostaAdmin: answer,
        status: String(formData.get("status") || "Respondida"),
        prioridade: String(formData.get("priority") || "Normal"),
        respostaVisualizada: false,
        respondidoPor: state.profile.name,
        respondidoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      });

      closeModal();
    } catch (error) {
      console.error("Responder opinião:", error);
      status.textContent = "Não foi possível salvar a resposta.";
      button.disabled = false;
      button.innerHTML = '<i class="ri-reply-line"></i> Salvar resposta';
    }
  });
}


async function deleteFeedbackMessage(id, requestedByOwner = false) {
  const item = state.feedback.find((entry) => entry.id === id);

  if (!item) {
    alert("A mensagem não foi encontrada.");
    return;
  }

  const data = item.data || {};
  const answered = Boolean(String(data.respostaAdmin || "").trim());
  const status = normalize(data.status || "Nova");
  const isOwner = data.uid === state.user?.uid;

  const ownerCanDelete =
    isOwner &&
    !answered &&
    ["nova", "em analise"].includes(status);

  if (!state.isAdmin && !ownerCanDelete) {
    alert(
      "Esta mensagem já foi respondida ou concluída. " +
      "Somente a gestão poderá excluí-la."
    );
    return;
  }

  const label = String(data.titulo || "Mensagem");
  const confirmation = state.isAdmin
    ? `Excluir definitivamente "${label}"?\n\nEsta ação não poderá ser desfeita.`
    : `Excluir a sua mensagem "${label}"?\n\nDepois de excluir, ela não poderá ser recuperada.`;

  if (!confirm(confirmation)) return;

  try {
    await deleteDoc(doc(db, "feedback-plataforma", id));

    if (requestedByOwner) {
      alert("Sua mensagem foi excluída.");
    }
  } catch (error) {
    console.error("Excluir opinião:", error);

    alert(
      error?.code === "permission-denied"
        ? "A permissão de exclusão ainda não foi publicada no Firebase."
        : "Não foi possível excluir a mensagem agora."
    );
  }
}

async function saveCategories(nextCategories) {
  await setDoc(doc(db, "configuracoes", "engagement"), {
    feedbackCategories: cleanArray([...nextCategories, "Outro"]),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

function campaignFormData(form) {
  const formData = new FormData(form);

  return {
    active: document.getElementById("csv-campaign-active")?.checked === true,
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    mediaType: String(formData.get("mediaType") || "texto"),
    mediaUrl: String(formData.get("mediaUrl") || "").trim(),
    audienceType: String(formData.get("audienceType") || "todos"),
    sectors: cleanArray(
      String(formData.get("sectors") || "").split(",")
    ),
    minimumSeconds: Math.max(0, Math.min(180, Number(formData.get("minimumSeconds") || 0))),
    requireRating: formData.get("requireRating") === "on",
    requireComment: formData.get("requireComment") === "on"
  };
}

async function saveCampaign(form) {
  const status = form.querySelector("#csv-campaign-admin-status");
  const button = form.querySelector('button[type="submit"]');
  const data = campaignFormData(form);

  if (data.active && !data.title) {
    status.textContent = "Informe um título para ativar a campanha.";
    status.className = "csv-form-status error";
    return;
  }

  if (
    data.active &&
    ["video", "imagem", "documento"].includes(data.mediaType) &&
    !safeHttpsUrl(data.mediaUrl)
  ) {
    status.textContent = "Informe um link HTTPS válido para o material.";
    status.className = "csv-form-status error";
    return;
  }

  button.disabled = true;
  button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Salvando...';

  try {
    await setDoc(doc(db, "configuracoes", "campanha-acesso"), {
      ...data,
      versionId: String(Date.now()),
      updatedBy: state.profile.name,
      updatedAt: serverTimestamp()
    }, { merge: true });

    status.textContent = data.active
      ? "Campanha publicada. Será exibida no próximo acesso dos colaboradores."
      : "Campanha salva como inativa.";
    status.className = "csv-form-status success";
    window.csvCampaignRefresh?.();
  } catch (error) {
    console.error("Salvar campanha:", error);
    status.textContent = "Não foi possível salvar a campanha.";
    status.className = "csv-form-status error";
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="ri-save-line"></i> Salvar campanha';
  }
}

function bindAdminOpinions(root) {
  root.querySelectorAll("[data-feedback-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.feedbackFilter = button.dataset.feedbackFilter || "Todos";
      renderOpinions();
    });
  });

  root.querySelectorAll("[data-open-feedback]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.feedback.find((entry) => entry.id === button.dataset.openFeedback);
      if (item) feedbackReplyModal(item);
    });
  });


  root.querySelectorAll("[data-delete-feedback]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteFeedbackMessage(
        button.dataset.deleteFeedback,
        false
      );
    });
  });

  root.querySelector("#csv-add-category-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = event.currentTarget.querySelector("#csv-new-category");
    const value = String(input?.value || "").trim();

    if (!value) return;

    try {
      await saveCategories([...categories(), value]);
      input.value = "";
    } catch (error) {
      alert("Não foi possível adicionar o motivo.");
    }
  });

  root.querySelectorAll("[data-remove-category]").forEach((button) => {
    button.addEventListener("click", async () => {
      const category = button.dataset.removeCategory;
      if (!confirm(`Remover o motivo "${category}"?`)) return;

      try {
        await saveCategories(categories().filter((item) => item !== category));
      } catch (error) {
        alert("Não foi possível remover o motivo.");
      }
    });
  });

  root.querySelector("#csv-interface-survey-active")?.addEventListener("change", async (event) => {
    try {
      await setDoc(doc(db, "configuracoes", "engagement"), {
        interfaceSurveyActive: event.currentTarget.checked,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      event.currentTarget.checked = !event.currentTarget.checked;
      alert("Não foi possível alterar a pesquisa.");
    }
  });

  const campaignForm = root.querySelector("#csv-campaign-admin-form");
  campaignForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveCampaign(event.currentTarget);
  });

  root.querySelector("#csv-preview-campaign")?.addEventListener("click", () => {
    if (!campaignForm) return;
    window.csvCampaignPreview?.({
      ...campaignFormData(campaignForm),
      label: "Prévia da campanha"
    });
  });
}

function benefitAudienceAllows(data) {
  if (state.isAdmin) return true;
  if (data.active === false) return false;

  const type = String(data.audienceType || "todos");
  if (type === "todos") return true;

  const sectors = Array.isArray(data.sectors) ? data.sectors : [];
  return sectors.map(normalize).includes(normalize(state.profile?.sector));
}

function benefitIsExpired(data) {
  const value = String(data.validUntil || "").trim();
  if (!value) return false;
  const date = new Date(`${value}T23:59:59`);
  return date.getTime() < Date.now();
}

function visibleBenefits() {
  return state.benefits.filter((item) => {
    const data = item.data || {};
    if (!benefitAudienceAllows(data)) return false;
    if (!state.isAdmin && benefitIsExpired(data)) return false;
    if (state.benefitFilter !== "Todos" && data.category !== state.benefitFilter) return false;
    return true;
  });
}

function benefitCardMarkup(item) {
  const data = item.data || {};
  const image = safeHttpsUrl(data.image || "");
  const link = safeHttpsUrl(data.link || "");
  const expired = benefitIsExpired(data);

  return `
    <article class="csv-benefit-card ${data.featured === true ? "featured" : ""} ${expired ? "expired" : ""}">
      <div class="csv-benefit-image">
        ${image ? `
          <img src="${esc(image)}" alt="${esc(data.title || "Benefício")}" referrerpolicy="no-referrer">
        ` : `
          <i class="ri-gift-2-line"></i>
        `}
        <div class="csv-benefit-image-badges">
          ${data.featured === true ? '<span class="featured">Destaque</span>' : ""}
          ${expired ? '<span class="expired">Expirado</span>' : ""}
          ${data.active === false ? '<span class="inactive">Inativo</span>' : ""}
        </div>
      </div>

      <div class="csv-benefit-content">
        <span class="category">${esc(data.category || "Outros")}</span>
        <h3>${esc(data.title || "Benefício")}</h3>
        <strong>${esc(data.discount || "Condição especial")}</strong>
        <p>${esc(data.description || "")}</p>

        ${data.code ? `
          <div class="csv-coupon-box">
            <span>Cupom</span>
            <b>${esc(data.code)}</b>
            <button type="button" data-copy-coupon="${esc(data.code)}"><i class="ri-file-copy-line"></i></button>
          </div>
        ` : ""}

        <div class="csv-benefit-meta">
          ${data.partner ? `<span><i class="ri-store-2-line"></i>${esc(data.partner)}</span>` : ""}
          ${data.validUntil ? `<span><i class="ri-calendar-line"></i>Até ${formatDate(`${data.validUntil}T12:00:00`, false)}</span>` : ""}
        </div>

        ${data.rules ? `
          <details>
            <summary>Regras do benefício</summary>
            <p>${esc(data.rules)}</p>
          </details>
        ` : ""}

        <footer>
          ${link ? `
            <a href="${esc(link)}" target="_blank" rel="noopener noreferrer">
              Utilizar benefício <i class="ri-arrow-right-up-line"></i>
            </a>
          ` : '<span></span>'}

          ${state.isAdmin ? `
            <div>
              <button type="button" data-edit-benefit="${item.id}"><i class="ri-edit-line"></i></button>
              <button type="button" class="danger" data-delete-benefit="${item.id}"><i class="ri-delete-bin-line"></i></button>
            </div>
          ` : ""}
        </footer>
      </div>
    </article>
  `;
}

function renderBenefits() {
  const root = document.getElementById("tab-beneficios");
  if (!root || !state.profile || state.rendering) return;

  state.rendering = true;

  try {
    const items = visibleBenefits();
    const activeCount = state.benefits.filter((item) =>
      item.data?.active !== false && !benefitIsExpired(item.data || {})
    ).length;

    root.innerHTML = `
      <header class="csv-engagement-hero benefits">
        <div>
          <span><i class="ri-vip-crown-2-line"></i> Vantagens para a equipe</span>
          <h2>Clube de Benefícios</h2>
          <p>
            Cupons e condições especiais em cinema, viagens, serviços,
            alimentação, saúde, educação e muito mais.
          </p>
        </div>
        ${state.isAdmin ? `
          <button type="button" class="csv-hero-action" id="csv-add-benefit">
            <i class="ri-add-line"></i> Cadastrar benefício
          </button>
        ` : `
          <div class="csv-hero-stat"><strong>${activeCount}</strong><span>benefícios ativos</span></div>
        `}
      </header>

      <section class="csv-benefit-filters">
        <button type="button" class="${state.benefitFilter === "Todos" ? "active" : ""}" data-benefit-filter="Todos">Todos</button>
        ${BENEFIT_CATEGORIES.map((category) => `
          <button type="button" class="${state.benefitFilter === category ? "active" : ""}" data-benefit-filter="${esc(category)}">
            ${esc(category)}
          </button>
        `).join("")}
      </section>

      ${state.isAdmin ? `
        <section class="csv-benefit-admin-summary">
          <article><span>Total cadastrado</span><strong>${state.benefits.length}</strong><i class="ri-archive-line"></i></article>
          <article><span>Ativos</span><strong>${activeCount}</strong><i class="ri-checkbox-circle-line"></i></article>
          <article><span>Em destaque</span><strong>${state.benefits.filter((item) => item.data?.featured === true).length}</strong><i class="ri-star-line"></i></article>
          <article><span>Expirados</span><strong>${state.benefits.filter((item) => benefitIsExpired(item.data || {})).length}</strong><i class="ri-calendar-close-line"></i></article>
        </section>
      ` : ""}

      <section class="csv-benefit-grid">
        ${items.length ? items.map(benefitCardMarkup).join("") : `
          <div class="csv-engagement-empty wide">
            <i class="ri-gift-line"></i>
            <strong>Nenhum benefício nesta categoria</strong>
            <span>Novas vantagens serão publicadas pela gestão.</span>
          </div>
        `}
      </section>
    `;

    bindBenefits(root);
  } finally {
    state.rendering = false;
  }
}

function benefitModal(item = null) {
  const data = item?.data || {};
  const sectors = Array.isArray(data.sectors) ? data.sectors.join(", ") : "";

  const root = openModal(`
    <header class="csv-modal-header">
      <div>
        <span><i class="ri-gift-2-line"></i> Clube de Benefícios</span>
        <h2>${item ? "Editar benefício" : "Cadastrar benefício"}</h2>
        <p>Preencha as informações que serão exibidas para a equipe.</p>
      </div>
      <button type="button" data-close-modal><i class="ri-close-line"></i></button>
    </header>

    <div class="csv-modal-body">
      <form id="csv-benefit-form" class="csv-admin-grid-form">
        <label>
          <span>Nome do benefício</span>
          <input name="title" required maxlength="100" value="${esc(data.title || "")}" placeholder="Ex.: 30% de desconto no cinema">
        </label>

        <label>
          <span>Parceiro</span>
          <input name="partner" maxlength="80" value="${esc(data.partner || "")}" placeholder="Nome da loja ou empresa">
        </label>

        <label>
          <span>Categoria</span>
          <select name="category">
            ${BENEFIT_CATEGORIES.map((category) => `
              <option ${String(data.category || "Outros") === category ? "selected" : ""}>${esc(category)}</option>
            `).join("")}
          </select>
        </label>

        <label>
          <span>Desconto / vantagem</span>
          <input name="discount" maxlength="80" value="${esc(data.discount || "")}" placeholder="Ex.: 20% OFF ou 2 por 1">
        </label>

        <label class="full">
          <span>Descrição</span>
          <textarea name="description" rows="4" placeholder="Explique o benefício.">${esc(data.description || "")}</textarea>
        </label>

        <label>
          <span>Código do cupom</span>
          <input name="code" maxlength="60" value="${esc(data.code || "")}" placeholder="Opcional">
        </label>

        <label>
          <span>Validade</span>
          <input name="validUntil" type="date" value="${esc(data.validUntil || "")}">
        </label>

        <label>
          <span>Link para utilizar</span>
          <input name="link" type="url" value="${esc(data.link || "")}" placeholder="https://">
        </label>

        <label>
          <span>Imagem ou logotipo</span>
          <input name="image" type="url" value="${esc(data.image || "")}" placeholder="Link HTTPS da imagem">
        </label>

        <label>
          <span>Público</span>
          <select name="audienceType">
            <option value="todos" ${String(data.audienceType || "todos") === "todos" ? "selected" : ""}>Toda a equipe</option>
            <option value="setores" ${String(data.audienceType || "") === "setores" ? "selected" : ""}>Setores específicos</option>
          </select>
        </label>

        <label>
          <span>Setores separados por vírgula</span>
          <input name="sectors" value="${esc(sectors)}" placeholder="Recepção, Financeiro">
        </label>

        <label class="full">
          <span>Regras e condições</span>
          <textarea name="rules" rows="4" placeholder="Limitações, documentos necessários, unidades participantes...">${esc(data.rules || "")}</textarea>
        </label>

        <label class="csv-check-option">
          <input name="active" type="checkbox" ${data.active !== false ? "checked" : ""}>
          <span>Benefício ativo</span>
        </label>

        <label class="csv-check-option">
          <input name="featured" type="checkbox" ${data.featured === true ? "checked" : ""}>
          <span>Exibir como destaque</span>
        </label>

        <div class="csv-form-actions full">
          <span id="csv-benefit-form-status" class="csv-form-status"></span>
          <button type="submit" class="primary">
            <i class="ri-save-line"></i> Salvar benefício
          </button>
        </div>
      </form>
    </div>
  `, "large");

  root.querySelector("#csv-benefit-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const status = form.querySelector("#csv-benefit-form-status");
    const button = form.querySelector('button[type="submit"]');

    if (!title) {
      status.textContent = "Informe o nome do benefício.";
      return;
    }

    button.disabled = true;
    button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Salvando...';

    const payload = {
      title,
      partner: String(formData.get("partner") || "").trim(),
      category: String(formData.get("category") || "Outros"),
      discount: String(formData.get("discount") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      code: String(formData.get("code") || "").trim(),
      validUntil: String(formData.get("validUntil") || ""),
      link: String(formData.get("link") || "").trim(),
      image: String(formData.get("image") || "").trim(),
      audienceType: String(formData.get("audienceType") || "todos"),
      sectors: cleanArray(String(formData.get("sectors") || "").split(",")),
      rules: String(formData.get("rules") || "").trim(),
      active: formData.get("active") === "on",
      featured: formData.get("featured") === "on",
      updatedBy: state.profile.name,
      updatedAt: serverTimestamp()
    };

    try {
      if (item) {
        await updateDoc(doc(db, "beneficios", item.id), payload);
      } else {
        await addDoc(collection(db, "beneficios"), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      closeModal();
    } catch (error) {
      console.error("Salvar benefício:", error);
      status.textContent =
        error?.code === "permission-denied"
          ? "As regras do Firestore ainda precisam ser publicadas."
          : "Não foi possível salvar o benefício.";
      button.disabled = false;
      button.innerHTML = '<i class="ri-save-line"></i> Salvar benefício';
    }
  });
}

function bindBenefits(root) {
  root.querySelector("#csv-add-benefit")?.addEventListener("click", () => benefitModal());

  root.querySelectorAll("[data-benefit-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.benefitFilter = button.dataset.benefitFilter || "Todos";
      renderBenefits();
    });
  });

  root.querySelectorAll("[data-copy-coupon]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copyCoupon || "");
        const original = button.innerHTML;
        button.innerHTML = '<i class="ri-check-line"></i>';
        setTimeout(() => {
          button.innerHTML = original;
        }, 1300);
      } catch (_) {
        alert(`Cupom: ${button.dataset.copyCoupon || ""}`);
      }
    });
  });

  root.querySelectorAll("[data-edit-benefit]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.benefits.find((entry) => entry.id === button.dataset.editBenefit);
      if (item) benefitModal(item);
    });
  });

  root.querySelectorAll("[data-delete-benefit]").forEach((button) => {
    button.addEventListener("click", async () => {
      const item = state.benefits.find((entry) => entry.id === button.dataset.deleteBenefit);
      if (!item) return;

      if (!confirm(`Excluir o benefício "${item.data?.title || "selecionado"}"?`)) return;

      try {
        await deleteDoc(doc(db, "beneficios", item.id));
      } catch (error) {
        alert("Não foi possível excluir o benefício.");
      }
    });
  });
}

function markRepliesViewed() {
  if (state.isAdmin || !state.user) return;

  state.feedback
    .filter((item) =>
      item.data?.uid === state.user.uid &&
      Boolean(String(item.data?.respostaAdmin || "").trim()) &&
      item.data?.respostaVisualizada !== true
    )
    .forEach((item) => {
      updateDoc(doc(db, "feedback-plataforma", item.id), {
        respostaVisualizada: true,
        respostaVisualizadaEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      }).catch(() => {});
    });
}

function observeActiveTabs() {
  const nav = document.querySelector(".sidebar-nav");
  if (!nav || nav.dataset.csvEngagementTabObserved) return;

  nav.dataset.csvEngagementTabObserved = "1";
  nav.addEventListener("click", (event) => {
    const button = event.target.closest(".nav-btn");
    if (!button) return;

    const tab = button.dataset.tab;
    if (tab === "opinioes") {
      setTimeout(() => {
        renderOpinions();
        markRepliesViewed();
      }, 80);
    }

    if (tab === "beneficios") {
      setTimeout(renderBenefits, 80);
    }
  });
}

async function initForUser(user) {
  state.user = user;
  state.profile = await loadProfile(user);
  state.isAdmin = state.profile?.admin === true;

  ensureNavigation();
  ensureTabs();
  startNavigationGuard();
  observeActiveTabs();
  startListeners();

  [100, 400, 900, 1800].forEach((delay) => {
    setTimeout(() => {
      keepNavigationVisible();
      if (activeTabId() === "opinioes") renderOpinions();
      if (activeTabId() === "beneficios") renderBenefits();
    }, delay);
  });
}

function resetState() {
  clearListeners();
  state.user = null;
  state.profile = null;
  state.isAdmin = false;
  state.feedback = [];
  state.surveyResponses = [];
  state.currentSurvey = null;
  state.benefits = [];

  document.getElementById("csv-nav-opinioes")?.style.setProperty("display", "none", "important");
  document.getElementById("csv-nav-beneficios")?.style.setProperty("display", "none", "important");
  closeModal();
}

function init() {
  ensureStylesheet();
  ensureNavigation();
  ensureTabs();

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      resetState();
      return;
    }

    initForUser(user).catch((error) => {
      console.error("Central de opiniões e benefícios:", error);
    });
  });

  window.csvEngagementOpenTab = openTab;
  window.csvEngagementRenderOpinions = renderOpinions;
  window.csvEngagementRenderBenefits = renderBenefits;

  console.log(
    `CSV Engagement Hub ${CSV_ENGAGEMENT_HUB_VERSION} carregado.`
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
