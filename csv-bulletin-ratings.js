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
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const CSV_BULLETIN_RATINGS_VERSION = "7.7.0";
const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentProfile = null;
let isAdmin = false;
let observerTimer = null;

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

function ensureStylesheet() {
  if (document.getElementById("csv-engagement-770-style")) return;

  const link = document.createElement("link");
  link.id = "csv-engagement-770-style";
  link.rel = "stylesheet";
  link.href = `./csv-engagement-7.7.css?v=${CSV_BULLETIN_RATINGS_VERSION}`;
  document.head.appendChild(link);
}

async function loadProfile(user) {
  if (!user) return null;

  const snapshot = await getDoc(doc(db, "usuarios", user.uid));
  const data = snapshot.exists() ? snapshot.data() || {} : {};
  const legacyAdmin = String(user.email || "").toLowerCase().includes("@clinica");

  return {
    uid: user.uid,
    name: data.nome || user.email?.split("@")[0] || "Colaborador",
    sector: data.setor || "Geral",
    admin: data.admin === true || legacyAdmin
  };
}

function bulletinTitle(item) {
  return String(
    item?.data?.["Título do Informativo"] ||
    item?.data?.["Título do Documento"] ||
    item?.data?.titulo ||
    "Informativo"
  );
}

function evaluationId(item, uid) {
  const collectionName = String(item.collectionName || "boletins");
  const raw = `${collectionName}_${item.id}_${uid}`;
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function bulletinGroupId(item) {
  return String(
    item?.data?.grupoPublicacaoId ||
    item?.groupId ||
    item?.id ||
    ""
  );
}

function currentItemFromCard(card) {
  const button = [...card.querySelectorAll("button")].find((item) =>
    String(item.getAttribute("onclick") || "").includes("csv2OpenBulletin")
  );

  const handler = String(button?.getAttribute("onclick") || "");
  const match = handler.match(/csv2OpenBulletin\('([^']+)'\)/);
  const key = match?.[1];

  return key
    ? window.csvPhase2State?.displayItems?.get?.(key) || null
    : null;
}

function ensureModalRoot() {
  let root = document.getElementById("csv-bulletin-rating-modal-root");

  if (!root) {
    root = document.createElement("div");
    root.id = "csv-bulletin-rating-modal-root";
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
    <div class="csv-engagement-modal" data-rating-backdrop>
      <div class="csv-engagement-modal-card ${esc(size)}">
        ${content}
      </div>
    </div>
  `;

  document.body.classList.add("csv-engagement-modal-open");

  root.querySelector("[data-rating-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeModal();
  });

  root.querySelectorAll("[data-close-rating-modal]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  return root;
}

function starButtons(value = 0, attribute = "data-bulletin-stars") {
  return `
    <div class="csv-star-picker large" ${attribute}>
      ${[1, 2, 3, 4, 5].map((star) => {
        const active = star <= Number(value || 0);
        return `
          <button type="button" data-value="${star}" class="${active ? "active" : ""}" aria-label="${star} estrela${star > 1 ? "s" : ""}">
            <i class="${active ? "ri-star-fill" : "ri-star-line"}"></i>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function bindStars(holder, input) {
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

async function openEmployeeEvaluation(item) {
  if (!currentUser || !currentProfile) return;

  const id = evaluationId(item, currentUser.uid);
  let existing = null;

  try {
    const snapshot = await getDoc(doc(db, "avaliacoes-boletins", id));
    existing = snapshot.exists() ? snapshot.data() || {} : null;
  } catch (error) {
    console.warn("Carregar avaliação do informativo:", error);
  }

  const data = existing || {};
  const rating = Number(data.rating || 0);
  const root = openModal(`
    <header class="csv-modal-header">
      <div>
        <span><i class="ri-star-smile-line"></i> Avaliação do informativo</span>
        <h2>${esc(bulletinTitle(item))}</h2>
        <p>Sua resposta é individual e ajuda a gestão a melhorar a comunicação.</p>
      </div>
      <button type="button" data-close-rating-modal><i class="ri-close-line"></i></button>
    </header>

    <div class="csv-modal-body">
      <form id="csv-bulletin-evaluation-form" class="csv-bulletin-evaluation-form">
        <div class="csv-rating-question">
          <span>Qual nota você dá para este informativo?</span>
          ${starButtons(rating)}
          <input type="hidden" name="rating" value="${rating}">
        </div>

        <label>
          <span>Você entendeu o conteúdo?</span>
          <select name="understanding">
            ${[
              "Entendi completamente",
              "Entendi parcialmente",
              "Não entendi",
              "Preciso de uma explicação melhor"
            ].map((value) => `
              <option ${String(data.understanding || "") === value ? "selected" : ""}>${value}</option>
            `).join("")}
          </select>
        </label>

        <label>
          <span>Observação individual</span>
          <textarea name="observation" rows="5" maxlength="1500" placeholder="Escreva o que ficou claro, o que gerou dúvida ou como o conteúdo poderia melhorar.">${esc(data.observation || "")}</textarea>
        </label>

        <label class="csv-check-option">
          <input type="checkbox" name="needsExplanation" ${data.needsExplanation === true ? "checked" : ""}>
          <span>Quero que este informativo seja melhor explicado.</span>
        </label>

        ${data.adminResponse ? `
          <div class="csv-bulletin-admin-response">
            <i class="ri-customer-service-2-line"></i>
            <div>
              <strong>Resposta da gestão</strong>
              <p>${esc(data.adminResponse)}</p>
            </div>
          </div>
        ` : ""}

        <div class="csv-form-actions">
          <span id="csv-bulletin-evaluation-status" class="csv-form-status"></span>
          <button type="submit" class="primary">
            <i class="ri-send-plane-line"></i>
            ${existing ? "Atualizar avaliação" : "Enviar avaliação"}
          </button>
        </div>
      </form>
    </div>
  `, "medium");

  const form = root.querySelector("#csv-bulletin-evaluation-form");
  const ratingInput = form?.querySelector('input[name="rating"]');
  bindStars(form?.querySelector("[data-bulletin-stars]"), ratingInput);

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const selectedRating = Number(formData.get("rating") || 0);
    const understanding = String(formData.get("understanding") || "");
    const observation = String(formData.get("observation") || "").trim();
    const needsExplanation =
      formData.get("needsExplanation") === "on" ||
      understanding === "Preciso de uma explicação melhor";
    const status = form.querySelector("#csv-bulletin-evaluation-status");
    const button = form.querySelector('button[type="submit"]');

    if (selectedRating < 1) {
      status.textContent = "Escolha uma nota de 1 a 5 estrelas.";
      status.className = "csv-form-status error";
      return;
    }

    button.disabled = true;
    button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Salvando...';

    try {
      await setDoc(doc(db, "avaliacoes-boletins", id), {
        uid: currentUser.uid,
        nome: currentProfile.name,
        setor: currentProfile.sector,
        bulletinId: String(item.id || ""),
        bulletinGroupId: bulletinGroupId(item),
        collectionName: String(item.collectionName || "boletins"),
        bulletinTitle: bulletinTitle(item),
        rating: selectedRating,
        understanding,
        observation,
        needsExplanation,
        updatedAt: serverTimestamp(),
        createdAt: data.createdAt || serverTimestamp()
      }, { merge: true });

      closeModal();
      setTimeout(enhanceBulletinCards, 80);
    } catch (error) {
      console.error("Salvar avaliação do informativo:", error);
      status.textContent =
        error?.code === "permission-denied"
          ? "As regras do Firestore ainda precisam ser publicadas."
          : "Não foi possível salvar a avaliação.";
      status.className = "csv-form-status error";
      button.disabled = false;
      button.innerHTML = '<i class="ri-send-plane-line"></i> Enviar avaliação';
    }
  });
}

function understandingSummary(items) {
  const counts = new Map();
  items.forEach((item) => {
    const value = String(item.data?.understanding || "Não informado");
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return counts;
}

function distribution(items) {
  return [1, 2, 3, 4, 5].map((rating) =>
    items.filter((item) => Number(item.data?.rating || 0) === rating).length
  );
}

function averageRating(items) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + Number(item.data?.rating || 0), 0) / items.length;
}

async function openAdminAnalytics(item) {
  let evaluations = [];

  try {
    const snapshot = await getDocs(collection(db, "avaliacoes-boletins"));
    const groupId = bulletinGroupId(item);
    evaluations = snapshot.docs
      .map((entry) => ({ id: entry.id, data: entry.data() || {} }))
      .filter((entry) =>
        String(entry.data?.bulletinGroupId || entry.data?.bulletinId || "") === groupId ||
        String(entry.data?.bulletinId || "") === String(item.id || "")
      );
  } catch (error) {
    console.error("Carregar avaliações administrativas:", error);
  }

  const average = averageRating(evaluations);
  const needsExplanation = evaluations.filter((entry) => entry.data?.needsExplanation === true);
  const understood = evaluations.filter((entry) =>
    String(entry.data?.understanding || "") === "Entendi completamente"
  );
  const counts = understandingSummary(evaluations);
  const stars = distribution(evaluations);

  const root = openModal(`
    <header class="csv-modal-header">
      <div>
        <span><i class="ri-bar-chart-box-line"></i> Avaliações do informativo</span>
        <h2>${esc(bulletinTitle(item))}</h2>
        <p>Notas, compreensão, observações e pedidos de explicação.</p>
      </div>
      <button type="button" data-close-rating-modal><i class="ri-close-line"></i></button>
    </header>

    <div class="csv-modal-body">
      <div class="csv-bulletin-rating-summary">
        <article><span>Avaliações</span><strong>${evaluations.length}</strong><i class="ri-survey-line"></i></article>
        <article><span>Nota média</span><strong>${average.toFixed(1)}</strong><i class="ri-star-fill"></i></article>
        <article><span>Entenderam totalmente</span><strong>${evaluations.length ? Math.round((understood.length / evaluations.length) * 100) : 0}%</strong><i class="ri-checkbox-circle-line"></i></article>
        <article><span>Pedem explicação</span><strong>${needsExplanation.length}</strong><i class="ri-question-answer-line"></i></article>
      </div>

      <div class="csv-rating-distribution">
        ${stars.map((count, index) => `
          <div>
            <span>${index + 1} estrela${index > 0 ? "s" : ""}</span>
            <div><i style="width:${evaluations.length ? Math.round((count / evaluations.length) * 100) : 0}%"></i></div>
            <b>${count}</b>
          </div>
        `).join("")}
      </div>

      <div class="csv-understanding-summary">
        ${[...counts.entries()].map(([label, count]) => `
          <span><b>${count}</b>${esc(label)}</span>
        `).join("")}
      </div>

      <section class="csv-evaluation-admin-list">
        ${evaluations.length ? evaluations.map((entry) => {
          const data = entry.data || {};
          return `
            <article class="${data.needsExplanation === true ? "needs-explanation" : ""}">
              <header>
                <div>
                  <strong>${esc(data.nome || "Colaborador")}</strong>
                  <small>${esc(data.setor || "Geral")}</small>
                </div>
                <span>${Number(data.rating || 0)} <i class="ri-star-fill"></i></span>
              </header>
              <b>${esc(data.understanding || "Não informado")}</b>
              <p>${esc(data.observation || "Sem observação.")}</p>
              ${data.needsExplanation === true ? `
                <div class="csv-needs-explanation-badge">
                  <i class="ri-question-line"></i> Solicitou uma explicação melhor
                </div>
              ` : ""}

              <form class="csv-evaluation-response-form" data-evaluation-response="${entry.id}">
                <textarea rows="3" placeholder="Responder individualmente a esta avaliação...">${esc(data.adminResponse || "")}</textarea>
                <button type="submit"><i class="ri-reply-line"></i> Responder</button>
                <small data-response-status></small>
              </form>
            </article>
          `;
        }).join("") : `
          <div class="csv-engagement-empty">
            <i class="ri-star-line"></i>
            <strong>Ainda não há avaliações</strong>
            <span>As respostas dos colaboradores aparecerão aqui.</span>
          </div>
        `}
      </section>
    </div>
  `, "large");

  root.querySelectorAll("[data-evaluation-response]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const evaluationIdValue = form.dataset.evaluationResponse;
      const response = String(form.querySelector("textarea")?.value || "").trim();
      const status = form.querySelector("[data-response-status]");
      const button = form.querySelector("button");

      if (!response) {
        status.textContent = "Escreva uma resposta.";
        return;
      }

      button.disabled = true;
      button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i>';

      try {
        await updateDoc(doc(db, "avaliacoes-boletins", evaluationIdValue), {
          adminResponse: response,
          adminResponseBy: currentProfile?.name || "Gestão",
          adminResponseAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        status.textContent = "Resposta salva.";
        status.className = "success";
      } catch (error) {
        status.textContent = "Não foi possível responder.";
        status.className = "error";
      } finally {
        button.disabled = false;
        button.innerHTML = '<i class="ri-reply-line"></i> Responder';
      }
    });
  });
}

async function updateEmployeeButton(button, item) {
  if (!currentUser || isAdmin) return;

  try {
    const snapshot = await getDoc(
      doc(db, "avaliacoes-boletins", evaluationId(item, currentUser.uid))
    );

    if (snapshot.exists()) {
      const rating = Number(snapshot.data()?.rating || 0);
      button.classList.add("rated");
      button.innerHTML = `<i class="ri-star-fill"></i> Avaliado • ${rating}★`;
    }
  } catch (_) {}
}

function enhanceBulletinCards() {
  if (!currentUser || !currentProfile) return;

  document.querySelectorAll("#csv2-bulletin-list .csv2-bulletin-card").forEach((card) => {
    if (card.dataset.csvRatingEnhanced === "1") return;

    const item = currentItemFromCard(card);
    const actions = card.querySelector(".csv2-bulletin-actions");
    if (!item || !actions) return;

    card.dataset.csvRatingEnhanced = "1";

    const button = document.createElement("button");
    button.type = "button";
    button.className = `csv-bulletin-rating-button ${isAdmin ? "admin" : ""}`;
    button.innerHTML = isAdmin
      ? '<i class="ri-bar-chart-box-line"></i> Avaliações'
      : '<i class="ri-star-line"></i> Avaliar informativo';

    button.addEventListener("click", () => {
      if (isAdmin) {
        openAdminAnalytics(item);
      } else {
        openEmployeeEvaluation(item);
      }
    });

    actions.appendChild(button);

    if (!isAdmin) {
      updateEmployeeButton(button, item);
    }
  });
}

function observeBulletins() {
  const root = document.getElementById("tab-boletins") || document.documentElement;
  if (root.dataset?.csvBulletinRatingsObserved === "1") return;
  if (root.dataset) root.dataset.csvBulletinRatingsObserved = "1";

  const observer = new MutationObserver(() => {
    clearTimeout(observerTimer);
    observerTimer = setTimeout(enhanceBulletinCards, 60);
  });

  observer.observe(root, {
    childList: true,
    subtree: true
  });

  [120, 350, 800, 1600, 3000].forEach((delay) => {
    setTimeout(enhanceBulletinCards, delay);
  });
}

function init() {
  ensureStylesheet();
  observeBulletins();

  onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;
    currentProfile = user ? await loadProfile(user) : null;
    isAdmin = currentProfile?.admin === true;

    if (!user) {
      closeModal();
      return;
    }

    [100, 400, 900].forEach((delay) => {
      setTimeout(enhanceBulletinCards, delay);
    });
  });

  window.csvBulletinRatingsRefresh = enhanceBulletinCards;
  window.csvBulletinRatingsOpen = (item) => {
    if (!item) return;
    if (isAdmin) openAdminAnalytics(item);
    else openEmployeeEvaluation(item);
  };

  console.log(
    `CSV Bulletin Ratings ${CSV_BULLETIN_RATINGS_VERSION} carregado.`
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
