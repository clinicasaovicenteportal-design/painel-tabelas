import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const VERSION = "7.7.2";
const DEFAULT_MESSAGE =
  "Você está acessando a plataforma da Clínica São Vicente.";

const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const state = {
  user: null,
  profile: null,
  isAdmin: false,
  feedback: new Map(),
  feedbackUnsubscribe: null,
  identityUnsubscribe: null,
  cleanupTimer: null,
  observer: null,
  platformMessage: DEFAULT_MESSAGE
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

function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const date = toDate(value);
  if (!date) return "";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function cleanAddressBar() {
  document.title = "Clínica São Vicente | Portal Interno";

  if (!window.location.search) return;

  try {
    history.replaceState(
      history.state,
      document.title,
      window.location.pathname + (window.location.hash || "")
    );
  } catch (error) {
    console.warn("Limpeza da barra de endereço:", error);
  }
}

function ensureStyles() {
  if (document.getElementById("csv-security-772-style")) return;

  const style = document.createElement("style");
  style.id = "csv-security-772-style";
  style.textContent = `
    #search-box,
    .csv-home-search-wrap,
    #resultados-globais,
    .resultados-globais-box,
    #csv-modern-search-panel,
    [data-csv-old-search-result="true"] {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }

    .csv-platform-message {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin: 0 0 18px;
      padding: 13px 16px;
      border: 1px solid rgba(139, 37, 44, .14);
      border-radius: 16px;
      background: linear-gradient(
        135deg,
        rgba(139, 37, 44, .07),
        rgba(255, 255, 255, .88)
      );
      color: #6c2830;
      font: 600 10px/1.5 Poppins, sans-serif;
    }

    .csv-platform-message > div {
      display: flex;
      align-items: center;
      gap: 9px;
      min-width: 0;
    }

    .csv-platform-message i {
      font-size: 17px;
    }

    .csv-platform-message span {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .csv-platform-message button {
      flex: 0 0 auto;
      min-height: 34px;
      padding: 0 12px;
      border: 1px solid rgba(139, 37, 44, .18);
      border-radius: 11px;
      color: #8b252c;
      background: rgba(255, 255, 255, .9);
      font: 700 9px/1 Poppins, sans-serif;
      cursor: pointer;
    }

    #csv-ludo-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 5px;
      margin: 28px 0 10px;
      padding: 18px 14px;
      border-top: 1px solid rgba(126, 142, 166, .17);
      color: #718096;
      font: 500 9px/1.6 Poppins, sans-serif;
      text-align: center;
    }

    #csv-ludo-footer a {
      color: #8b252c;
      font-weight: 800;
      text-decoration: none;
    }

    .csv-feedback-admin-tools {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed rgba(126, 142, 166, .2);
    }

    .csv-feedback-admin-tools .csv-delete-status {
      margin-right: auto;
      color: #718096;
      font-size: 8px;
      font-weight: 600;
    }

    .csv-feedback-admin-tools button {
      min-height: 35px;
      padding: 0 11px;
      border: 1px solid rgba(126, 142, 166, .2);
      border-radius: 11px;
      background: #fff;
      font: 700 8px/1 Poppins, sans-serif;
      cursor: pointer;
    }

    .csv-feedback-admin-tools .schedule {
      color: #6d51b7;
      border-color: rgba(109, 81, 183, .24);
      background: rgba(109, 81, 183, .07);
    }

    .csv-feedback-admin-tools .cancel {
      color: #9a6700;
      border-color: rgba(192, 132, 0, .24);
      background: rgba(255, 193, 7, .09);
    }

    .csv-feedback-admin-tools .delete {
      color: #b4232e;
      border-color: rgba(180, 35, 46, .24);
      background: rgba(180, 35, 46, .08);
    }

    .csv-auto-delete-overlay {
      position: fixed;
      inset: 0;
      z-index: 14000;
      display: grid;
      place-items: center;
      padding: 22px;
      background: rgba(16, 24, 40, .6);
      backdrop-filter: blur(8px);
    }

    .csv-auto-delete-card {
      width: min(520px, 100%);
      max-height: calc(100vh - 44px);
      overflow: auto;
      padding: 24px;
      border-radius: 24px;
      background: #fff;
      box-shadow: 0 30px 90px rgba(15, 23, 42, .28);
      font-family: Poppins, sans-serif;
    }

    .csv-auto-delete-card header {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 20px;
    }

    .csv-auto-delete-card h2 {
      margin: 5px 0 6px;
      color: #172033;
      font-size: 22px;
    }

    .csv-auto-delete-card p {
      margin: 0;
      color: #718096;
      font-size: 10px;
      line-height: 1.6;
    }

    .csv-auto-delete-card .close {
      width: 36px;
      height: 36px;
      border: 0;
      border-radius: 11px;
      color: #4a5568;
      background: #f1f4f8;
      cursor: pointer;
    }

    .csv-auto-delete-card label {
      display: grid;
      gap: 7px;
      margin-bottom: 14px;
      color: #344054;
      font-size: 9px;
      font-weight: 700;
    }

    .csv-auto-delete-card select,
    .csv-auto-delete-card input {
      width: 100%;
      min-height: 44px;
      padding: 0 13px;
      border: 1px solid rgba(126, 142, 166, .23);
      border-radius: 12px;
      color: #172033;
      background: #f8fafc;
      font: 500 10px/1 Poppins, sans-serif;
    }

    .csv-auto-delete-note {
      display: flex;
      gap: 9px;
      margin: 14px 0 18px;
      padding: 12px;
      border-radius: 12px;
      color: #7a5a00;
      background: #fff8db;
      font-size: 9px;
      line-height: 1.5;
    }

    .csv-auto-delete-actions {
      display: flex;
      justify-content: flex-end;
      gap: 9px;
    }

    .csv-auto-delete-actions button {
      min-height: 40px;
      padding: 0 15px;
      border: 0;
      border-radius: 12px;
      font: 700 9px/1 Poppins, sans-serif;
      cursor: pointer;
    }

    .csv-auto-delete-actions .secondary {
      color: #4a5568;
      background: #eef1f5;
    }

    .csv-auto-delete-actions .primary {
      color: #fff;
      background: #8b252c;
    }

    @media (max-width: 700px) {
      .csv-platform-message {
        align-items: flex-start;
        flex-direction: column;
      }

      .csv-feedback-admin-tools {
        justify-content: stretch;
      }

      .csv-feedback-admin-tools button {
        flex: 1 1 130px;
      }
    }
  `;

  document.head.appendChild(style);
}

function isOldSearchResult(element) {
  const heading = element?.querySelector?.("h1, h2, h3, strong");
  const text = normalize(heading?.textContent || "");

  return (
    text.includes("resultados da busca global") ||
    text.includes("resultados da pesquisa") ||
    text.includes("resultado da busca")
  );
}

function disableSearch() {
  document
    .querySelectorAll(
      "#search-box, .csv-home-search-wrap, #resultados-globais, " +
      ".resultados-globais-box, #csv-modern-search-panel"
    )
    .forEach((element) => {
      element.innerHTML = "";
      element.setAttribute("aria-hidden", "true");
      element.style.setProperty("display", "none", "important");
      element.style.setProperty("visibility", "hidden", "important");
      element.style.setProperty("pointer-events", "none", "important");
    });

  ["input-pesquisa", "input-pesquisa-global"].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;

    input.value = "";
    input.disabled = true;
    input.remove();
  });

  document
    .querySelectorAll(
      ".main-content section, .main-content article, .main-content > div"
    )
    .forEach((element) => {
      if (!isOldSearchResult(element)) return;

      element.innerHTML = "";
      element.dataset.csvOldSearchResult = "true";
      element.style.setProperty("display", "none", "important");
    });

  const noop = () => {};

  [
    "executarPesquisaGlobal",
    "realizarPesquisaGlobal",
    "pesquisarGlobal",
    "filtrarPesquisaGlobal",
    "buscarEmTodoSistema",
    "renderizarResultadosGlobais"
  ].forEach((name) => {
    try {
      window[name] = noop;
    } catch (_) {}
  });
}

function ensurePlatformMessage() {
  const main = document.querySelector(".main-content");
  const header = main?.querySelector(".top-header");
  if (!main || !header) return;

  let note = document.getElementById("csv-platform-message");

  if (!note) {
    note = document.createElement("div");
    note.id = "csv-platform-message";
    note.className = "csv-platform-message";

    if (header.nextSibling) {
      main.insertBefore(note, header.nextSibling);
    } else {
      main.appendChild(note);
    }
  }

  note.innerHTML = `
    <div>
      <i class="ri-shield-check-line"></i>
      <span>${esc(state.platformMessage || DEFAULT_MESSAGE)}</span>
    </div>

    ${state.isAdmin ? `
      <button type="button" id="csv-edit-platform-message">
        <i class="ri-edit-line"></i>
        Editar mensagem
      </button>
    ` : ""}
  `;

  note
    .querySelector("#csv-edit-platform-message")
    ?.addEventListener("click", editPlatformMessage);
}

async function editPlatformMessage() {
  if (!state.isAdmin) return;

  const next = prompt(
    "Mensagem exibida para todos no topo da plataforma:",
    state.platformMessage || DEFAULT_MESSAGE
  );

  if (next === null) return;

  const message = String(next || "").trim();

  if (!message) {
    alert("A mensagem não pode ficar vazia.");
    return;
  }

  try {
    await setDoc(
      doc(db, "configuracoes", "identidade-portal"),
      {
        navigationMessage: message,
        updatedBy: state.profile?.name || state.user?.email || "Gestão",
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Editar mensagem do portal:", error);
    alert("Não foi possível atualizar a mensagem.");
  }
}

function ensureFooter() {
  const main = document.querySelector(".main-content");
  if (!main) return;

  let footer = document.getElementById("csv-ludo-footer");

  if (!footer) {
    footer = document.createElement("footer");
    footer.id = "csv-ludo-footer";
    main.appendChild(footer);
  }

  footer.innerHTML = `
    <span>Sistema desenvolvido pela</span>
    <strong>Ludodigitalmkt</strong>
    <span>— siga agora nas redes sociais</span>
    <a
      href="https://www.instagram.com/ludodigitalmkt/"
      target="_blank"
      rel="noopener noreferrer">
      @ludodigitalmkt
    </a>
  `;
}

async function loadProfile(user) {
  const snapshot = await getDoc(doc(db, "usuarios", user.uid));
  const data = snapshot.exists() ? snapshot.data() || {} : {};
  const legacyAdmin = String(user.email || "")
    .toLowerCase()
    .includes("@clinica");

  return {
    uid: user.uid,
    email: user.email || data.email || "",
    name: data.nome || user.email?.split("@")[0] || "Colaborador",
    sector: data.setor || "Geral",
    admin: data.admin === true || legacyAdmin
  };
}

function feedbackData(id) {
  return state.feedback.get(id)?.data || {};
}

function scheduleText(data) {
  const date = toDate(data?.autoDeleteAt);

  if (!date) return "Sem exclusão automática";
  if (date.getTime() <= Date.now()) {
    return "Aguardando limpeza automática";
  }

  return `Exclusão agendada para ${formatDate(date)}`;
}

function enhanceFeedbackTickets() {
  if (!state.isAdmin) return;

  document.querySelectorAll("[data-open-feedback]").forEach((button) => {
    const id = String(button.dataset.openFeedback || "");
    const ticket = button.closest(".csv-feedback-ticket");

    if (!id || !ticket) return;

    let tools = ticket.querySelector(".csv-feedback-admin-tools");

    if (!tools) {
      tools = document.createElement("div");
      tools.className = "csv-feedback-admin-tools";
      ticket.appendChild(tools);
    }

    const data = feedbackData(id);
    const scheduled = Boolean(toDate(data.autoDeleteAt));

    tools.innerHTML = `
      <span class="csv-delete-status">
        <i class="ri-timer-line"></i>
        ${esc(scheduleText(data))}
      </span>

      ${scheduled ? `
        <button
          type="button"
          class="cancel"
          data-cancel-auto-delete="${esc(id)}">
          <i class="ri-close-circle-line"></i>
          Cancelar autoexclusão
        </button>
      ` : `
        <button
          type="button"
          class="schedule"
          data-schedule-delete="${esc(id)}">
          <i class="ri-timer-flash-line"></i>
          Agendar exclusão
        </button>
      `}

      <button
        type="button"
        class="delete"
        data-delete-feedback="${esc(id)}">
        <i class="ri-delete-bin-6-line"></i>
        Excluir agora
      </button>
    `;
  });
}

async function deleteFeedback(id) {
  if (!state.isAdmin || !id) return;

  const data = feedbackData(id);
  const title = data.titulo || "esta mensagem";

  if (
    !confirm(
      `Excluir definitivamente "${title}"?\n\n` +
      "Esta ação não poderá ser desfeita."
    )
  ) {
    return;
  }

  try {
    await deleteDoc(doc(db, "feedback-plataforma", id));
  } catch (error) {
    console.error("Excluir mensagem:", error);
    alert("Não foi possível excluir a mensagem.");
  }
}

async function cancelAutoDelete(id) {
  if (!state.isAdmin || !id) return;

  try {
    await updateDoc(doc(db, "feedback-plataforma", id), {
      autoDeleteAt: null,
      autoDeleteLabel: "",
      autoDeleteBy: "",
      autoDeleteScheduledAt: null,
      atualizadoEm: serverTimestamp()
    });
  } catch (error) {
    console.error("Cancelar autoexclusão:", error);
    alert("Não foi possível cancelar a exclusão programada.");
  }
}

function closeDeleteModal() {
  document.getElementById("csv-auto-delete-overlay")?.remove();
}

function openDeleteModal(id) {
  if (!state.isAdmin || !id) return;

  closeDeleteModal();

  const data = feedbackData(id);
  const overlay = document.createElement("div");
  overlay.id = "csv-auto-delete-overlay";
  overlay.className = "csv-auto-delete-overlay";

  overlay.innerHTML = `
    <div class="csv-auto-delete-card">
      <header>
        <div>
          <small>GESTÃO DE MENSAGENS</small>
          <h2>Programar exclusão</h2>
          <p>${esc(data.titulo || "Mensagem selecionada")}</p>
        </div>

        <button type="button" class="close" data-close-delete-modal>
          <i class="ri-close-line"></i>
        </button>
      </header>

      <form id="csv-auto-delete-form">
        <label>
          <span>Quando deseja excluir?</span>
          <select name="period" id="csv-delete-period">
            <option value="1h">Em 1 hora</option>
            <option value="6h">Em 6 horas</option>
            <option value="24h" selected>Em 24 horas</option>
            <option value="3d">Em 3 dias</option>
            <option value="7d">Em 7 dias</option>
            <option value="30d">Em 30 dias</option>
            <option value="custom">Escolher data e hora</option>
          </select>
        </label>

        <label id="csv-custom-delete-wrap" style="display:none;">
          <span>Data e hora personalizadas</span>
          <input
            type="datetime-local"
            name="customDate"
            id="csv-custom-delete-date">
        </label>

        <div class="csv-auto-delete-note">
          <i class="ri-information-line"></i>
          <span>
            No plano gratuito, a exclusão será executada quando uma conta
            da gestão estiver com o portal aberto. O agendamento continuará
            salvo no Firebase.
          </span>
        </div>

        <div class="csv-auto-delete-actions">
          <button type="button" class="secondary" data-close-delete-modal>
            Cancelar
          </button>

          <button type="submit" class="primary">
            <i class="ri-timer-line"></i>
            Programar exclusão
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay
    .querySelectorAll("[data-close-delete-modal]")
    .forEach((button) => {
      button.addEventListener("click", closeDeleteModal);
    });

  const period = overlay.querySelector("#csv-delete-period");
  const customWrap = overlay.querySelector("#csv-custom-delete-wrap");
  const customInput = overlay.querySelector("#csv-custom-delete-date");

  period.addEventListener("change", () => {
    const custom = period.value === "custom";
    customWrap.style.display = custom ? "grid" : "none";
    customInput.required = custom;
  });

  overlay
    .querySelector("#csv-auto-delete-form")
    .addEventListener("submit", async (event) => {
      event.preventDefault();

      const form = event.currentTarget;
      const formData = new FormData(form);
      const selected = String(formData.get("period") || "24h");
      const now = new Date();
      let target;
      let label;

      const offsets = {
        "1h": 60 * 60 * 1000,
        "6h": 6 * 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
        "3d": 3 * 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000
      };

      if (selected === "custom") {
        target = new Date(String(formData.get("customDate") || ""));

        if (
          Number.isNaN(target.getTime()) ||
          target.getTime() <= now.getTime()
        ) {
          alert("Escolha uma data futura válida.");
          return;
        }

        label = "Data personalizada";
      } else {
        target = new Date(
          now.getTime() + Number(offsets[selected] || offsets["24h"])
        );

        label = period.options[period.selectedIndex]?.text || selected;
      }

      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.innerHTML =
        '<i class="ri-loader-4-line ri-spin"></i> Salvando...';

      try {
        await updateDoc(doc(db, "feedback-plataforma", id), {
          autoDeleteAt: Timestamp.fromDate(target),
          autoDeleteLabel: label,
          autoDeleteBy: state.profile?.name || state.user?.email || "Gestão",
          autoDeleteScheduledAt: serverTimestamp(),
          atualizadoEm: serverTimestamp()
        });

        closeDeleteModal();
        await cleanupExpired();
      } catch (error) {
        console.error("Programar exclusão:", error);
        alert("Não foi possível programar a exclusão.");

        submit.disabled = false;
        submit.innerHTML =
          '<i class="ri-timer-line"></i> Programar exclusão';
      }
    });
}

async function cleanupExpired() {
  if (!state.isAdmin) return;

  const expired = [];
  const now = Date.now();

  state.feedback.forEach((item, id) => {
    const date = toDate(item.data?.autoDeleteAt);

    if (date && date.getTime() <= now) {
      expired.push(id);
    }
  });

  for (const id of expired) {
    try {
      await deleteDoc(doc(db, "feedback-plataforma", id));
    } catch (error) {
      console.warn(`Autoexclusão pendente para ${id}.`, error);
    }
  }
}

function bindActions() {
  if (document.documentElement.dataset.csvSecurity772Bound === "1") {
    return;
  }

  document.documentElement.dataset.csvSecurity772Bound = "1";

  document.addEventListener(
    "click",
    (event) => {
      const deleteButton = event.target.closest("[data-delete-feedback]");
      if (deleteButton) {
        event.preventDefault();
        deleteFeedback(deleteButton.dataset.deleteFeedback);
        return;
      }

      const scheduleButton = event.target.closest("[data-schedule-delete]");
      if (scheduleButton) {
        event.preventDefault();
        openDeleteModal(scheduleButton.dataset.scheduleDelete);
        return;
      }

      const cancelButton = event.target.closest("[data-cancel-auto-delete]");
      if (cancelButton) {
        event.preventDefault();
        cancelAutoDelete(cancelButton.dataset.cancelAutoDelete);
      }
    },
    true
  );
}

function observeUi() {
  state.observer?.disconnect();

  state.observer = new MutationObserver(() => {
    disableSearch();
    ensurePlatformMessage();
    ensureFooter();
    enhanceFeedbackTickets();
  });

  state.observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function listenIdentity() {
  state.identityUnsubscribe?.();

  state.identityUnsubscribe = onSnapshot(
    doc(db, "configuracoes", "identidade-portal"),
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() || {} : {};

      state.platformMessage =
        String(data.navigationMessage || "").trim() ||
        DEFAULT_MESSAGE;

      ensurePlatformMessage();
    },
    (error) => {
      console.warn("Identidade do portal:", error);
      state.platformMessage = DEFAULT_MESSAGE;
      ensurePlatformMessage();
    }
  );
}

function listenFeedback() {
  state.feedbackUnsubscribe?.();
  state.feedback.clear();

  if (!state.isAdmin) return;

  state.feedbackUnsubscribe = onSnapshot(
    collection(db, "feedback-plataforma"),
    (snapshot) => {
      state.feedback = new Map(
        snapshot.docs.map((item) => [
          item.id,
          {
            id: item.id,
            data: item.data() || {}
          }
        ])
      );

      enhanceFeedbackTickets();
      cleanupExpired();
    },
    (error) => {
      console.warn("Controle de mensagens:", error);
    }
  );
}

function stop() {
  state.feedbackUnsubscribe?.();
  state.identityUnsubscribe?.();

  state.feedbackUnsubscribe = null;
  state.identityUnsubscribe = null;
  state.feedback.clear();

  if (state.cleanupTimer) {
    clearInterval(state.cleanupTimer);
    state.cleanupTimer = null;
  }
}

async function initUser(user) {
  state.user = user;

  try {
    state.profile = await loadProfile(user);
  } catch (error) {
    state.profile = {
      uid: user.uid,
      email: user.email || "",
      name: user.email?.split("@")[0] || "Colaborador",
      sector: "Geral",
      admin: String(user.email || "").toLowerCase().includes("@clinica")
    };
  }

  state.isAdmin = state.profile?.admin === true;

  cleanAddressBar();
  disableSearch();
  ensurePlatformMessage();
  ensureFooter();
  listenIdentity();
  listenFeedback();

  if (state.isAdmin) {
    state.cleanupTimer = setInterval(cleanupExpired, 60 * 1000);
  }

  [80, 250, 700, 1600, 3200].forEach((delay) => {
    setTimeout(() => {
      disableSearch();
      ensurePlatformMessage();
      ensureFooter();
      enhanceFeedbackTickets();
    }, delay);
  });
}

function reset() {
  stop();

  state.user = null;
  state.profile = null;
  state.isAdmin = false;
  state.platformMessage = DEFAULT_MESSAGE;

  closeDeleteModal();
  disableSearch();
}

function init() {
  ensureStyles();
  cleanAddressBar();
  disableSearch();
  bindActions();
  observeUi();

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      reset();
      return;
    }

    initUser(user).catch((error) => {
      console.error("Módulo de segurança 7.7.2:", error);
    });
  });

  console.log(`CSV Security Controls ${VERSION} carregado.`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
