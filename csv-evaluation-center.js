import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const CSV_EVALUATION_CENTER_VERSION = "7.9.5";

const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentProfile = null;
let isAdmin = false;
let evaluations = [];
let observerTimer = null;
let itemMap = new Map();

function phase() {
  return window.csvPhase2State || {};
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

function normalize(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function unique(values = []) {
  return [...new Set(
    values
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )];
}

function title(item) {
  return String(
    item?.data?.["Título do Informativo"] ||
    item?.data?.["Título do Documento"] ||
    item?.data?.titulo ||
    "Informativo"
  ).trim();
}

function dateValue(item) {
  return String(
    item?.data?.["Data de Publicação"] ||
    item?.data?.dataPublicacao ||
    ""
  ).trim();
}

function formatDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Sem data";

  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T12:00:00`)
    : new Date(raw);

  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleDateString("pt-BR");
}

function groupId(item) {
  return String(
    item?.data?.grupoPublicacaoId ||
    item?.groupId ||
    item?.id ||
    ""
  );
}

function matches(entry, item) {
  const data = entry?.data || {};

  return (
    String(
      data.bulletinGroupId ||
      data.bulletinId ||
      ""
    ) === groupId(item) ||
    String(data.bulletinId || "") ===
      String(item?.id || "")
  );
}

function audience(item) {
  if (item?.collectionName === "boletins-privados") {
    const names = unique(
      item.targets ||
      item.groupDocs?.map(
        (entry) =>
          entry?.data?.["Para qual Colaborador?"]
      ) ||
      [item?.data?.["Para qual Colaborador?"]]
    );

    return names.length > 1
      ? `${names.length} colaboradores direcionados`
      : names[0] || "Colaborador direcionado";
  }

  const data = item?.data || {};

  if (data.publicoTipo === "todos") {
    return "Toda a clínica";
  }

  if (data.publicoTipo === "setores") {
    return unique(data.publicoSetores || [])
      .join(", ") || "Setores específicos";
  }

  return String(
    data["Para quais Setores?"] ||
    "Toda a clínica"
  );
}

function publishedItems() {
  const state = phase();

  const general = (state.bulletins || []).map(
    (item) => ({
      ...item,
      collectionName: "boletins",
      groupDocs: [item]
    })
  );

  if (!isAdmin) {
    const direct = (state.privateBulletins || []).map(
      (item) => ({
        ...item,
        collectionName: "boletins-privados"
      })
    );

    return [...general, ...direct].sort(
      (a, b) =>
        dateValue(b).localeCompare(dateValue(a))
    );
  }

  const groups = new Map();

  (state.privateBulletins || []).forEach((item) => {
    const key = String(
      item?.data?.grupoPublicacaoId ||
      `single-${item.id}`
    );

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  const direct = [...groups.entries()].map(
    ([key, docs]) => ({
      ...docs[0],
      id: key,
      collectionName: "boletins-privados",
      groupDocs: docs,
      targets: unique(
        docs.map(
          (item) =>
            item?.data?.["Para qual Colaborador?"]
        )
      )
    })
  );

  return [...general, ...direct].sort(
    (a, b) =>
      dateValue(b).localeCompare(dateValue(a))
  );
}

async function loadEvaluations() {
  if (!currentUser) return [];

  try {
    const reference = isAdmin
      ? collection(db, "avaliacoes-boletins")
      : query(
          collection(db, "avaliacoes-boletins"),
          where("uid", "==", currentUser.uid)
        );

    const snapshot = await getDocs(reference);

    evaluations = snapshot.docs.map((entry) => ({
      id: entry.id,
      data: entry.data() || {}
    }));
  } catch (error) {
    console.warn("Central de avaliações:", error);
  }

  return evaluations;
}

function ownEvaluation(item) {
  return evaluations.find(
    (entry) =>
      entry.data?.uid === currentUser?.uid &&
      matches(entry, item)
  ) || null;
}

function evaluationsFor(item) {
  return evaluations.filter(
    (entry) => matches(entry, item)
  );
}

function average(items) {
  if (!items.length) return 0;

  return items.reduce(
    (sum, entry) =>
      sum + Number(entry.data?.rating || 0),
    0
  ) / items.length;
}

function pendingRequest(entry) {
  const data = entry?.data || {};

  return (
    data.needsExplanation === true &&
    String(data.explanationStatus || "pending") !==
      "resolved"
  );
}

function statusInfo(data = {}) {
  if (data.needsExplanation !== true) {
    return {
      value: "not_requested",
      label: "Sem solicitação",
      className: "neutral"
    };
  }

  const value = String(
    data.explanationStatus || "pending"
  );

  if (value === "resolved") {
    return {
      value,
      label: "Explicação realizada",
      className: "resolved"
    };
  }

  if (value === "in_progress") {
    return {
      value,
      label: "Em acompanhamento",
      className: "progress"
    };
  }

  return {
    value: "pending",
    label: "Solicitação nova",
    className: "pending"
  };
}

function ensureRoot() {
  let root = document.getElementById(
    "csv-evaluation-center-root"
  );

  if (!root) {
    root = document.createElement("div");
    root.id = "csv-evaluation-center-root";
    document.body.appendChild(root);
  }

  return root;
}

function closeModal() {
  ensureRoot().innerHTML = "";
  document.body.classList.remove(
    "csv-engagement-modal-open"
  );
}

function openModal(content) {
  const root = ensureRoot();

  root.innerHTML = `
    <div class="csv-engagement-modal" data-eval-backdrop>
      <div class="csv-engagement-modal-card large csv-evaluation-center-modal">
        ${content}
      </div>
    </div>
  `;

  document.body.classList.add(
    "csv-engagement-modal-open"
  );

  root
    .querySelector("[data-eval-backdrop]")
    ?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) {
        closeModal();
      }
    });

  root
    .querySelectorAll("[data-close-eval]")
    .forEach((button) => {
      button.addEventListener("click", closeModal);
    });

  return root;
}

function currentItemFromCard(card) {
  const button = [
    ...card.querySelectorAll("button")
  ].find((item) =>
    String(
      item.getAttribute("onclick") || ""
    ).includes("csv2OpenBulletin")
  );

  const match = String(
    button?.getAttribute("onclick") || ""
  ).match(/csv2OpenBulletin\('([^']+)'\)/);

  return match?.[1]
    ? phase().displayItems?.get?.(match[1]) || null
    : null;
}

async function openItem(item) {
  await loadEvaluations();

  if (!isAdmin) {
    window.csvBulletinRatingsOpen?.(item);
    return;
  }

  openAdminDetails(item);
}

function enhanceCards() {
  if (!currentUser || !currentProfile) return;

  document
    .querySelectorAll(
      ".csv-folder-bulletin-card, #csv2-bulletin-list .csv2-bulletin-card"
    )
    .forEach((card) => {
      const actions = card.querySelector(
        ".csv-folder-bulletin-actions, .csv2-bulletin-actions"
      );

      const item = currentItemFromCard(card);

      if (!actions || !item) return;

      let button = actions.querySelector(
        ".csv-bulletin-rating-button, .csv-evaluation-card-button"
      );

      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className =
          `csv-evaluation-card-button ${isAdmin ? "admin" : ""}`;

        button.addEventListener(
          "click",
          () => openItem(item)
        );

        actions.appendChild(button);
      }

      if (isAdmin) {
        button.innerHTML =
          '<i class="ri-bar-chart-box-line"></i> Avaliações';
        return;
      }

      const existing = ownEvaluation(item);

      if (existing) {
        button.classList.add("rated");
        button.innerHTML = `
          <i class="ri-star-fill"></i>
          Avaliado • ${Number(existing.data?.rating || 0)}★
        `;
      } else {
        button.classList.remove("rated");
        button.innerHTML =
          '<i class="ri-star-line"></i> Avaliar informativo';
      }
    });
}

function ensureCenterButton() {
  if (!currentUser || !currentProfile) return;

  const header = document.querySelector(
    "#csv2-bulletins-root > .csv2-page-header"
  );

  if (!header) return;

  let holder = header.querySelector(
    ".csv2-header-actions"
  );

  if (!holder) {
    holder = document.createElement("div");
    holder.className =
      "csv2-header-actions csv-evaluation-center-actions";
    header.appendChild(holder);
  }

  let button = document.getElementById(
    "csv-evaluation-center-button"
  );

  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.id = "csv-evaluation-center-button";
    button.className =
      "csv2-button csv-evaluation-center-button";
    button.addEventListener(
      "click",
      openCenter
    );
    holder.insertBefore(button, holder.firstChild);
  }

  button.innerHTML = isAdmin
    ? '<i class="ri-star-smile-line"></i> Central de avaliações'
    : '<i class="ri-star-line"></i> Avaliar informativos';
}

function summaryFor(item) {
  const list = evaluationsFor(item);

  return {
    list,
    count: list.length,
    average: average(list),
    requests: list.filter(pendingRequest).length,
    comments: list.filter(
      (entry) =>
        String(entry.data?.observation || "").trim()
    ).length
  };
}

function centerRow(item, index) {
  const key = `${item.collectionName}:${groupId(item)}:${index}`;
  itemMap.set(key, item);

  const summary = summaryFor(item);
  const own = ownEvaluation(item);

  if (!isAdmin) {
    return `
      <article class="csv-evaluation-center-row employee ${own ? "evaluated" : "not-evaluated"}">
        <div class="csv-evaluation-center-copy">
          <span>${esc(audience(item))}</span>
          <h3>${esc(title(item))}</h3>
          <small>Publicado em ${esc(formatDate(dateValue(item)))}</small>
        </div>

        <div class="csv-evaluation-center-own">
          ${own ? `
            <strong>${Number(own.data?.rating || 0)} <i class="ri-star-fill"></i></strong>
            <span>${esc(statusInfo(own.data).label)}</span>
          ` : `
            <strong>—</strong>
            <span>Ainda não avaliado</span>
          `}
        </div>

        <button type="button" data-eval-item="${esc(key)}">
          <i class="${own ? "ri-edit-line" : "ri-star-line"}"></i>
          ${own ? "Ver ou atualizar" : "Avaliar"}
        </button>
      </article>
    `;
  }

  return `
    <article class="csv-evaluation-center-row admin ${summary.requests ? "needs-attention" : ""}">
      <div class="csv-evaluation-center-copy">
        <span>${esc(audience(item))}</span>
        <h3>${esc(title(item))}</h3>
        <small>Publicado em ${esc(formatDate(dateValue(item)))}</small>
      </div>

      <div class="csv-evaluation-center-metrics">
        <span><strong>${summary.count}</strong>Avaliações</span>
        <span><strong>${summary.count ? summary.average.toFixed(1) : "—"}</strong>Nota média</span>
        <span class="${summary.requests ? "attention" : ""}"><strong>${summary.requests}</strong>Pedem explicação</span>
        <span><strong>${summary.comments}</strong>Comentários</span>
      </div>

      <button type="button" data-eval-item="${esc(key)}">
        <i class="ri-bar-chart-box-line"></i>
        Abrir avaliações
      </button>
    </article>
  `;
}

async function openCenter() {
  await loadEvaluations();
  itemMap = new Map();

  const items = publishedItems();
  const requests = evaluations.filter(
    pendingRequest
  ).length;

  const root = openModal(`
    <header class="csv-modal-header">
      <div>
        <span><i class="ri-star-smile-line"></i>${isAdmin ? "Gestão de avaliações" : "Avaliação dos informativos"}</span>
        <h2>${isAdmin ? "Central de avaliações" : "Informativos publicados"}</h2>
        <p>${isAdmin ? "Veja notas, comentários e solicitações de explicação." : "Avalie os comunicados e acompanhe as respostas da gestão."}</p>
      </div>
      <button type="button" data-close-eval><i class="ri-close-line"></i></button>
    </header>

    <div class="csv-modal-body">
      ${isAdmin ? `
        <section class="csv-evaluation-center-summary">
          <article><span>Informativos</span><strong>${items.length}</strong><i class="ri-file-list-3-line"></i></article>
          <article><span>Avaliações</span><strong>${evaluations.length}</strong><i class="ri-survey-line"></i></article>
          <article><span>Nota média</span><strong>${evaluations.length ? average(evaluations).toFixed(1) : "—"}</strong><i class="ri-star-fill"></i></article>
          <article class="${requests ? "attention" : ""}"><span>Pedidos de explicação</span><strong>${requests}</strong><i class="ri-question-answer-line"></i></article>
        </section>
      ` : ""}

      <div class="csv-evaluation-center-toolbar">
        <label><i class="ri-search-line"></i><input id="csv-evaluation-search" placeholder="Pesquisar informativo, setor ou colaborador..."></label>
        <select id="csv-evaluation-filter">
          ${isAdmin ? `
            <option value="all">Todos</option>
            <option value="attention">Com pedido de explicação</option>
            <option value="evaluated">Com avaliações</option>
            <option value="empty">Sem avaliações</option>
          ` : `
            <option value="all">Todos</option>
            <option value="pending">Ainda não avaliados</option>
            <option value="evaluated">Já avaliados</option>
          `}
        </select>
      </div>

      <div id="csv-evaluation-center-list" class="csv-evaluation-center-list">
        ${items.length
          ? items.map(centerRow).join("")
          : '<div class="csv-engagement-empty"><i class="ri-inbox-line"></i><strong>Nenhum informativo publicado</strong></div>'}
      </div>
    </div>
  `);

  const search = root.querySelector(
    "#csv-evaluation-search"
  );
  const filter = root.querySelector(
    "#csv-evaluation-filter"
  );

  const applyFilter = () => {
    const term = normalize(search?.value || "");
    const mode = filter?.value || "all";

    root
      .querySelectorAll(".csv-evaluation-center-row")
      .forEach((row) => {
        let allowed =
          !term ||
          normalize(row.textContent).includes(term);

        if (allowed && mode !== "all") {
          if (isAdmin) {
            const count = Number(
              row.querySelector(
                ".csv-evaluation-center-metrics span strong"
              )?.textContent || 0
            );

            if (mode === "attention") {
              allowed = row.classList.contains(
                "needs-attention"
              );
            }
            if (mode === "evaluated") allowed = count > 0;
            if (mode === "empty") allowed = count === 0;
          } else {
            if (mode === "pending") {
              allowed = row.classList.contains(
                "not-evaluated"
              );
            }
            if (mode === "evaluated") {
              allowed = row.classList.contains(
                "evaluated"
              );
            }
          }
        }

        row.style.display = allowed ? "" : "none";
      });
  };

  search?.addEventListener("input", applyFilter);
  filter?.addEventListener("change", applyFilter);

  root
    .querySelectorAll("[data-eval-item]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const item = itemMap.get(
          button.dataset.evalItem
        );
        if (item) openItem(item);
      });
    });
}

async function saveManagement(entry, form) {
  const response = String(
    form.querySelector('[name="adminResponse"]')?.value || ""
  ).trim();

  const statusValue = String(
    form.querySelector('[name="explanationStatus"]')?.value || "pending"
  );

  const status = form.querySelector(
    "[data-management-status]"
  );

  const button = form.querySelector(
    'button[type="submit"]'
  );

  button.disabled = true;
  button.innerHTML =
    '<i class="ri-loader-4-line ri-spin"></i> Salvando...';

  try {
    await updateDoc(
      doc(db, "avaliacoes-boletins", entry.id),
      {
        adminResponse: response,
        adminResponseBy:
          currentProfile?.name || "Gestão",
        adminResponseAt:
          response ? serverTimestamp() : null,
        explanationStatus:
          entry.data?.needsExplanation === true
            ? statusValue
            : "not_requested",
        explanationResolvedAt:
          statusValue === "resolved"
            ? serverTimestamp()
            : null,
        explanationResolvedBy:
          statusValue === "resolved"
            ? currentProfile?.name || "Gestão"
            : "",
        updatedAt: serverTimestamp()
      }
    );

    status.textContent = "Acompanhamento salvo.";
    status.className = "success";
    await loadEvaluations();
  } catch (error) {
    console.error(error);
    status.textContent = "Não foi possível salvar.";
    status.className = "error";
  } finally {
    button.disabled = false;
    button.innerHTML =
      '<i class="ri-save-line"></i> Salvar acompanhamento';
  }
}

function openAdminDetails(item) {
  const list = evaluationsFor(item);
  const avg = average(list);
  const requests = list.filter(pendingRequest).length;

  const root = openModal(`
    <header class="csv-modal-header">
      <div>
        <span><i class="ri-bar-chart-box-line"></i>Avaliações do informativo</span>
        <h2>${esc(title(item))}</h2>
        <p>${esc(audience(item))} • ${esc(formatDate(dateValue(item)))}</p>
      </div>
      <button type="button" data-close-eval><i class="ri-close-line"></i></button>
    </header>

    <div class="csv-modal-body">
      <button type="button" id="csv-eval-back" class="csv-evaluation-back"><i class="ri-arrow-left-line"></i>Voltar para a central</button>

      <section class="csv-bulletin-rating-summary">
        <article><span>Avaliações</span><strong>${list.length}</strong><i class="ri-survey-line"></i></article>
        <article><span>Nota média</span><strong>${list.length ? avg.toFixed(1) : "—"}</strong><i class="ri-star-fill"></i></article>
        <article class="${requests ? "attention" : ""}"><span>Pedem explicação</span><strong>${requests}</strong><i class="ri-question-answer-line"></i></article>
        <article><span>Comentários</span><strong>${list.filter((entry) => String(entry.data?.observation || "").trim()).length}</strong><i class="ri-chat-quote-line"></i></article>
      </section>

      <section class="csv-evaluation-management-list">
        ${list.length
          ? list.map((entry) => {
              const data = entry.data || {};
              const info = statusInfo(data);

              return `
                <article class="${pendingRequest(entry) ? "needs-explanation" : ""}">
                  <header>
                    <div><strong>${esc(data.nome || "Colaborador")}</strong><small>${esc(data.setor || "Geral")}</small></div>
                    <span>${Number(data.rating || 0)} <i class="ri-star-fill"></i></span>
                  </header>

                  <b>${esc(data.understanding || "Não informado")}</b>
                  <p>${esc(data.observation || "Sem comentário.")}</p>

                  ${data.needsExplanation === true ? `
                    <div class="csv-explanation-state ${info.className}">
                      <i class="ri-question-answer-line"></i>
                      <strong>${esc(info.label)}</strong>
                    </div>
                  ` : ""}

                  <form data-management-id="${entry.id}" class="csv-evaluation-management-form">
                    <label>
                      <span>Resposta ou orientação realizada</span>
                      <textarea name="adminResponse" rows="3" placeholder="Registre a resposta, o ajuste feito ou a orientação presencial.">${esc(data.adminResponse || "")}</textarea>
                    </label>

                    <label>
                      <span>Situação</span>
                      <select name="explanationStatus" ${data.needsExplanation === true ? "" : "disabled"}>
                        <option value="pending" ${info.value === "pending" ? "selected" : ""}>Solicitação nova</option>
                        <option value="in_progress" ${info.value === "in_progress" ? "selected" : ""}>Em acompanhamento</option>
                        <option value="resolved" ${info.value === "resolved" ? "selected" : ""}>Explicação realizada</option>
                      </select>
                    </label>

                    <button type="submit"><i class="ri-save-line"></i>Salvar acompanhamento</button>
                    <small data-management-status></small>
                  </form>
                </article>
              `;
            }).join("")
          : '<div class="csv-engagement-empty"><i class="ri-star-line"></i><strong>Ainda não há avaliações</strong><span>As respostas dos colaboradores aparecerão aqui.</span></div>'}
      </section>
    </div>
  `);

  root
    .querySelector("#csv-eval-back")
    ?.addEventListener("click", openCenter);

  root
    .querySelectorAll("[data-management-id]")
    .forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();

        const entry = list.find(
          (item) =>
            item.id === form.dataset.managementId
        );

        if (entry) saveManagement(entry, form);
      });
    });
}

function enhance() {
  ensureCenterButton();
  enhanceCards();
}

function observe() {
  const root =
    document.getElementById("tab-boletins") ||
    document.documentElement;

  if (root.dataset?.csvEvalCenterObserved === "1") {
    return;
  }

  if (root.dataset) {
    root.dataset.csvEvalCenterObserved = "1";
  }

  new MutationObserver(() => {
    clearTimeout(observerTimer);
    observerTimer = setTimeout(enhance, 70);
  }).observe(root, {
    childList: true,
    subtree: true
  });
}

function init() {
  observe();

  onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;

    if (!user) {
      currentProfile = null;
      isAdmin = false;
      closeModal();
      return;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 120)
    );

    currentProfile =
      phase().profile || {
        uid: user.uid,
        email: user.email || "",
        name:
          user.email?.split("@")[0] ||
          "Colaborador",
        sector: "Geral",
        admin:
          String(user.email || "")
            .toLowerCase()
            .includes("@clinica")
      };

    isAdmin =
      currentProfile?.admin === true;

    await loadEvaluations();

    [100, 350, 800, 1600].forEach((delay) => {
      setTimeout(enhance, delay);
    });
  });

  window.csvEvaluationCenter = {
    version: CSV_EVALUATION_CENTER_VERSION,
    open: openCenter,
    refresh: async () => {
      await loadEvaluations();
      enhance();
    }
  };

  console.log(
    `CSV Evaluation Center ${CSV_EVALUATION_CENTER_VERSION} carregado.`
  );
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    init,
    { once: true }
  );
} else {
  init();
}
