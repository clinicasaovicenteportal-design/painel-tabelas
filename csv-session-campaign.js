import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const CSV_SESSION_CAMPAIGN_VERSION = "7.7.0";
const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentProfile = null;
let countdownTimer = null;

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function safeHttpsUrl(value = "") {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" ? url.href : "";
  } catch (_) {
    return "";
  }
}

function normalize(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function campaignResponseId(versionId, uid) {
  return `${String(versionId || "current").replace(/[^a-zA-Z0-9_-]/g, "_")}_${uid}`;
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
  link.href = `./csv-engagement-7.7.css?v=${CSV_SESSION_CAMPAIGN_VERSION}`;
  document.head.appendChild(link);
}

function secureLoginForm() {
  const form = document.getElementById("form-login");
  const email = document.getElementById("email");
  const password = document.getElementById("senha");
  const loginOptions = document.querySelector(".csv-login-options");

  if (!form || !email || !password) return;

  if (form.getAttribute("autocomplete") !== "off") {
    form.setAttribute("autocomplete", "off");
  }
  if (email.getAttribute("autocomplete") !== "off") {
    email.setAttribute("autocomplete", "off");
  }
  if (email.getAttribute("autocapitalize") !== "none") {
    email.setAttribute("autocapitalize", "none");
  }
  if (email.getAttribute("spellcheck") !== "false") {
    email.setAttribute("spellcheck", "false");
  }
  if (password.getAttribute("autocomplete") !== "new-password") {
    password.setAttribute("autocomplete", "new-password");
  }

  const rememberLine = document.querySelector(".csv-remember-line");
  if (rememberLine) rememberLine.remove();

  if (loginOptions && !document.getElementById("csv-session-security-note")) {
    const note = document.createElement("div");
    note.id = "csv-session-security-note";
    note.className = "csv-session-security-note";
    note.innerHTML = `
      <i class="ri-shield-keyhole-line"></i>
      <span>
        Por segurança, o acesso termina ao fechar esta janela.
        Guarde seu usuário e senha em local seguro e não compartilhe os dados.
      </span>
    `;
    loginOptions.replaceChildren(note);
  }

  if (!form.dataset.csvSecureLoginObserved) {
    form.dataset.csvSecureLoginObserved = "1";

    const observer = new MutationObserver(() => {
      if (email.getAttribute("autocomplete") !== "off") {
        email.setAttribute("autocomplete", "off");
      }
      if (password.getAttribute("autocomplete") !== "new-password") {
        password.setAttribute("autocomplete", "new-password");
      }
      document.querySelector(".csv-remember-line")?.remove();
    });

    observer.observe(form, {
      attributes: true,
      childList: true,
      subtree: true
    });
  }
}

function audienceAllows(config, profile) {
  const type = String(config.audienceType || "todos");
  if (type === "todos") return true;

  if (type === "setores") {
    const sectors = Array.isArray(config.sectors) ? config.sectors : [];
    return sectors.map(normalize).includes(normalize(profile?.sector));
  }

  return true;
}

function youtubeEmbed(url) {
  const raw = String(url || "");
  const match =
    raw.match(/[?&]v=([^&#]+)/) ||
    raw.match(/youtu\.be\/([^?&#/]+)/) ||
    raw.match(/youtube\.com\/embed\/([^?&#/]+)/);

  return match?.[1]
    ? `https://www.youtube.com/embed/${encodeURIComponent(match[1])}?rel=0`
    : "";
}

function vimeoEmbed(url) {
  const match = String(url || "").match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match?.[1]
    ? `https://player.vimeo.com/video/${encodeURIComponent(match[1])}`
    : "";
}

function driveEmbed(url) {
  const raw = String(url || "");
  const match =
    raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  return match?.[1]
    ? `https://drive.google.com/file/d/${encodeURIComponent(match[1])}/preview`
    : "";
}

function mediaMarkup(config) {
  const type = String(config.mediaType || "texto");
  const rawUrl = safeHttpsUrl(config.mediaUrl || "");

  if (type === "imagem" && rawUrl) {
    return `
      <div class="csv-campaign-media image">
        <img src="${esc(rawUrl)}" alt="${esc(config.title || "Campanha")}" referrerpolicy="no-referrer">
      </div>
    `;
  }

  if (type === "video" && rawUrl) {
    const embed = youtubeEmbed(rawUrl) || vimeoEmbed(rawUrl) || driveEmbed(rawUrl);

    if (embed) {
      return `
        <div class="csv-campaign-media video">
          <iframe
            src="${esc(embed)}"
            title="${esc(config.title || "Vídeo institucional")}"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowfullscreen></iframe>
        </div>
      `;
    }

    if (/\.(mp4|webm|ogg)(?:$|\?)/i.test(rawUrl)) {
      return `
        <div class="csv-campaign-media video">
          <video controls playsinline preload="metadata">
            <source src="${esc(rawUrl)}">
          </video>
        </div>
      `;
    }
  }

  if (type === "documento" && rawUrl) {
    const embed = driveEmbed(rawUrl) || rawUrl;
    return `
      <div class="csv-campaign-media document">
        <iframe src="${esc(embed)}" title="${esc(config.title || "Documento institucional")}"></iframe>
        <a href="${esc(rawUrl)}" target="_blank" rel="noopener noreferrer">
          <i class="ri-external-link-line"></i> Abrir documento em outra guia
        </a>
      </div>
    `;
  }

  return `
    <div class="csv-campaign-media text">
      <i class="ri-megaphone-line"></i>
      <strong>Comunicado institucional</strong>
      <span>Leia com atenção antes de entrar no portal.</span>
    </div>
  `;
}

function ratingMarkup(required) {
  if (!required) return "";

  return `
    <div class="csv-campaign-rating">
      <span>Como você avalia este material?</span>
      <div class="csv-star-picker" data-campaign-stars>
        ${[1, 2, 3, 4, 5].map((star) => `
          <button type="button" data-value="${star}" aria-label="${star} estrela${star > 1 ? "s" : ""}">
            <i class="ri-star-line"></i>
          </button>
        `).join("")}
      </div>
      <input type="hidden" id="csv-campaign-rating-value" value="0">
    </div>
  `;
}

function removeCampaignGate() {
  clearInterval(countdownTimer);
  countdownTimer = null;
  document.getElementById("csv-campaign-gate")?.remove();
  document.body.classList.remove("csv-campaign-locked");
}

async function saveCampaignResponse(config) {
  if (!currentUser || !currentProfile) return;

  const overlay = document.getElementById("csv-campaign-gate");
  const confirmation = overlay?.querySelector("#csv-campaign-confirmation");
  const rating = Number(overlay?.querySelector("#csv-campaign-rating-value")?.value || 0);
  const comment = String(overlay?.querySelector("#csv-campaign-comment")?.value || "").trim();
  const status = overlay?.querySelector("[data-campaign-status]");

  if (!confirmation?.checked) {
    if (status) status.textContent = "Confirme que visualizou o material.";
    return;
  }

  if (config.requireRating === true && rating < 1) {
    if (status) status.textContent = "Escolha uma nota de 1 a 5 estrelas.";
    return;
  }

  if (config.requireComment === true && comment.length < 3) {
    if (status) status.textContent = "Escreva uma observação antes de continuar.";
    return;
  }

  const button = overlay?.querySelector("[data-campaign-complete]");
  if (button) {
    button.disabled = true;
    button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Liberando acesso...';
  }

  try {
    const versionId = config.versionId || "current";
    const responseId = campaignResponseId(versionId, currentUser.uid);

    await setDoc(doc(db, "campanha-acesso-respostas", responseId), {
      uid: currentUser.uid,
      nome: currentProfile.name,
      setor: currentProfile.sector,
      campaignVersionId: versionId,
      campaignTitle: config.title || "Campanha institucional",
      rating,
      comment,
      completed: true,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    removeCampaignGate();
  } catch (error) {
    console.error("Campanha de acesso:", error);
    if (status) {
      status.textContent =
        error?.code === "permission-denied"
          ? "As regras do Firestore ainda precisam ser publicadas."
          : "Não foi possível registrar a visualização. Tente novamente.";
    }

    if (button) {
      button.disabled = false;
      button.innerHTML = '<i class="ri-login-box-line"></i> Liberar meu acesso';
    }
  }
}

function bindCampaignStars(overlay) {
  const holder = overlay.querySelector("[data-campaign-stars]");
  if (!holder) return;

  const input = overlay.querySelector("#csv-campaign-rating-value");
  holder.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const value = Number(button.dataset.value || 0);
      if (input) input.value = String(value);

      holder.querySelectorAll("button").forEach((item) => {
        const active = Number(item.dataset.value || 0) <= value;
        item.classList.toggle("active", active);
        item.innerHTML = `<i class="${active ? "ri-star-fill" : "ri-star-line"}"></i>`;
      });
    });
  });
}

function showCampaignGate(config, preview = false) {
  removeCampaignGate();
  ensureStylesheet();

  const minimumSeconds = preview
    ? 0
    : Math.max(0, Math.min(180, Number(config.minimumSeconds || 0)));

  const overlay = document.createElement("div");
  overlay.id = "csv-campaign-gate";
  overlay.className = "csv-campaign-gate";
  overlay.innerHTML = `
    <div class="csv-campaign-shell">
      <header class="csv-campaign-header">
        <div class="csv-campaign-brand">
          <img src="logo.png" alt="Clínica Médica São Vicente">
          <div>
            <strong>Clínica Médica São Vicente</strong>
            <span>${preview ? "Pré-visualização da gestão" : "Comunicado antes do portal"}</span>
          </div>
        </div>
        ${preview ? `
          <button type="button" class="csv-campaign-preview-close" data-campaign-close>
            <i class="ri-close-line"></i> Fechar prévia
          </button>
        ` : `
          <span class="csv-campaign-secure-badge">
            <i class="ri-shield-check-line"></i> Acesso protegido
          </span>
        `}
      </header>

      <main class="csv-campaign-content">
        <section class="csv-campaign-copy">
          <span class="csv-campaign-kicker">
            <i class="ri-notification-3-line"></i>
            ${esc(config.label || "Informação importante")}
          </span>
          <h1>${esc(config.title || "Comunicado da gestão")}</h1>
          <p>${esc(config.description || "Confira o conteúdo abaixo antes de acessar o portal.")}</p>
          ${mediaMarkup(config)}
        </section>

        <aside class="csv-campaign-confirm-card">
          <div class="csv-campaign-confirm-icon"><i class="ri-checkbox-circle-line"></i></div>
          <h2>Confirmação de visualização</h2>
          <p>
            ${preview
              ? "Esta é a experiência que será exibida aos colaboradores."
              : "Após confirmar a leitura, o sistema libera o acesso ao painel."}
          </p>

          ${ratingMarkup(config.requireRating === true)}

          <label class="csv-campaign-comment-label ${config.requireComment === true ? "required" : ""}">
            <span>Observação ${config.requireComment === true ? "obrigatória" : "opcional"}</span>
            <textarea id="csv-campaign-comment" placeholder="Escreva sua opinião sobre este material..."></textarea>
          </label>

          <label class="csv-campaign-checkline">
            <input type="checkbox" id="csv-campaign-confirmation">
            <span>Confirmo que visualizei e compreendi este conteúdo.</span>
          </label>

          <small class="csv-campaign-countdown" data-campaign-countdown>
            ${minimumSeconds > 0 ? `Aguarde ${minimumSeconds}s para liberar o acesso.` : ""}
          </small>

          <div class="csv-campaign-status" data-campaign-status></div>

          ${preview ? `
            <button type="button" class="csv-campaign-complete" data-campaign-close>
              <i class="ri-check-line"></i> Finalizar prévia
            </button>
          ` : `
            <button type="button" class="csv-campaign-complete" data-campaign-complete ${minimumSeconds > 0 ? "disabled" : ""}>
              <i class="ri-login-box-line"></i> Liberar meu acesso
            </button>
          `}
        </aside>
      </main>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.classList.add("csv-campaign-locked");
  bindCampaignStars(overlay);

  if (preview) {
    overlay.querySelectorAll("[data-campaign-close]").forEach((button) => {
      button.addEventListener("click", removeCampaignGate);
    });
    return;
  }

  const completeButton = overlay.querySelector("[data-campaign-complete]");
  completeButton?.addEventListener("click", () => saveCampaignResponse(config));

  if (minimumSeconds > 0) {
    let remaining = minimumSeconds;
    const countdown = overlay.querySelector("[data-campaign-countdown]");

    countdownTimer = setInterval(() => {
      remaining -= 1;

      if (remaining <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        if (countdown) countdown.textContent = "Conteúdo liberado para confirmação.";
        if (completeButton) completeButton.disabled = false;
        return;
      }

      if (countdown) {
        countdown.textContent = `Aguarde ${remaining}s para liberar o acesso.`;
      }
    }, 1000);
  }
}

async function checkCampaignGate() {
  if (!currentUser || !currentProfile || currentProfile.admin || !currentProfile.active) {
    removeCampaignGate();
    return;
  }

  try {
    const snapshot = await getDoc(doc(db, "configuracoes", "campanha-acesso"));
    if (!snapshot.exists()) {
      removeCampaignGate();
      return;
    }

    const config = snapshot.data() || {};
    if (config.active !== true || !audienceAllows(config, currentProfile)) {
      removeCampaignGate();
      return;
    }

    const versionId = config.versionId || "current";
    const responseId = campaignResponseId(versionId, currentUser.uid);
    const response = await getDoc(doc(db, "campanha-acesso-respostas", responseId));

    if (response.exists() && response.data()?.completed === true) {
      removeCampaignGate();
      return;
    }

    showCampaignGate(config, false);
  } catch (error) {
    console.error("Verificação da campanha de acesso:", error);
    removeCampaignGate();
  }
}

async function configureSessionPersistence() {
  try {
    await setPersistence(auth, browserSessionPersistence);
    document.documentElement.dataset.csvAuthPersistence = "session";
  } catch (error) {
    console.warn("Não foi possível alterar a persistência da sessão:", error);
  }
}

function init() {
  document.title = "Painel Clínico 7.7.0";
  ensureStylesheet();
  secureLoginForm();

  const loginObserver = new MutationObserver(secureLoginForm);
  loginObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  configureSessionPersistence();

  onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;
    currentProfile = user ? await loadProfile(user) : null;

    if (!user) {
      removeCampaignGate();
      const email = document.getElementById("email");
      const password = document.getElementById("senha");
      if (email) email.value = "";
      if (password) password.value = "";
      secureLoginForm();
      return;
    }

    await checkCampaignGate();
  });

  window.csvCampaignPreview = (config) => showCampaignGate(config || {}, true);
  window.csvCampaignRefresh = checkCampaignGate;

  console.log(
    `CSV Session Campaign ${CSV_SESSION_CAMPAIGN_VERSION} carregado.`
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
