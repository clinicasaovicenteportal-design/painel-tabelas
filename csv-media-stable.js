import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const VERSION = "7.5.6";
const app = getApp();
const db = getFirestore(app);

const state = {
  config: {},
  loginItems: [],
  loginIndex: 0,
  loginTimer: null,
  homeItems: [],
  homeIndex: 0,
  homeTimer: null,
  homePaused: false,
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

function enabled(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  return !(
    value === false ||
    value === 0 ||
    value === "0" ||
    String(value).toLowerCase() === "false"
  );
}

function extractDriveId(raw = "") {
  const value = String(raw || "").trim();
  if (!value) return "";

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/i,
    /\/d\/([a-zA-Z0-9_-]+)/i,
    /[?&]id=([a-zA-Z0-9_-]+)/i,
    /\/uc\?.*?[?&]?id=([a-zA-Z0-9_-]+)/i,
    /\/thumbnail\?.*?[?&]?id=([a-zA-Z0-9_-]+)/i
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

function imageCandidates(raw = "", width = 2400) {
  const value = String(raw || "").trim();
  if (!value) return [];

  const id = extractDriveId(value);
  if (!id) return [value];

  return [
    `https://lh3.googleusercontent.com/d/${id}=w${width}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`,
    `https://drive.usercontent.google.com/download?id=${id}&export=view&confirm=t`,
    `https://drive.google.com/uc?export=view&id=${id}`,
    value
  ];
}

function assignImage(img, raw, width = 2400) {
  if (!img) return;

  const candidates = imageCandidates(raw, width);
  img.dataset.candidates = JSON.stringify(candidates);
  img.dataset.candidateIndex = "0";
  img.classList.add("csv-media-loading");
  img.referrerPolicy = "no-referrer";

  img.onload = () => {
    img.classList.remove("csv-media-loading", "csv-media-error");
  };

  img.onerror = () => {
    const list = JSON.parse(img.dataset.candidates || "[]");
    const nextIndex = Number(img.dataset.candidateIndex || 0) + 1;

    if (nextIndex < list.length) {
      img.dataset.candidateIndex = String(nextIndex);
      img.src = list[nextIndex];
      return;
    }

    img.classList.remove("csv-media-loading");
    img.classList.add("csv-media-error");
  };

  if (candidates.length) {
    img.src = candidates[0];
  } else {
    img.removeAttribute("src");
    img.classList.add("csv-media-error");
  }
}

function parseRows(raw = "", maxParts = 5) {
  return String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line
        .split("|")
        .slice(0, maxParts)
        .map((part) => part.trim());

      while (parts.length < maxParts) parts.push("");
      return parts;
    });
}

function parseLoginItems(raw = "") {
  return parseRows(raw, 3)
    .map(([image, title, text]) => ({ image, title, text }))
    .filter((item) => item.image);
}

function parseHomeItems(config = {}) {
  const items = parseRows(config.homeCarouselItems || "", 5)
    .map(([image, title, text, buttonText, buttonLink]) => ({
      image,
      title,
      text,
      buttonText,
      buttonLink
    }))
    .filter((item) => item.image);

  if (items.length) return items;

  if (config.homeAnnouncementImage) {
    return [{
      image: config.homeAnnouncementImage,
      title: config.homeAnnouncementTitle || "",
      text: config.homeAnnouncementText || "",
      buttonText: config.homeAnnouncementButtonText || "",
      buttonLink: config.homeAnnouncementButtonLink || ""
    }];
  }

  return [];
}

function clearTimer(name) {
  clearInterval(state[name]);
  state[name] = null;
}

function applyFixedAnnouncementVisibility() {
  const area = document.getElementById("banner-area");
  if (!area) return;

  const active = enabled(state.config.homeAnnouncementActive, true);
  area.hidden = !active;
  if (active) {
    area.style.removeProperty("display");
  } else {
    area.style.setProperty("display", "none", "important");
  }
  document.documentElement.dataset.csvFixedAnnouncement = active ? "on" : "off";
}

function restoreLoginDefault() {
  clearTimer("loginTimer");
  document.getElementById("csv-stable-login-media")?.remove();
  document.getElementById("csv-stable-login-dots")?.remove();

  document.querySelector(".csv-ad-placeholder")?.style.removeProperty("display");
  document.querySelector(".csv-mascot-stage")?.style.removeProperty("display");

  const title = document.getElementById("csv-ad-title");
  const text = document.getElementById("csv-ad-text");

  if (title) title.textContent = "Tudo o que a equipe precisa, em um só lugar.";
  if (text) {
    text.textContent = "Consulte informações, orientações, comunicados e recursos internos de forma rápida, organizada e segura.";
  }
}

function ensureLoginStage() {
  const panel = document.getElementById("csv-login-ad-panel");
  if (!panel) return null;

  let stage = document.getElementById("csv-stable-login-media");
  if (!stage) {
    stage = document.createElement("div");
    stage.id = "csv-stable-login-media";
    stage.className = "csv-stable-login-media";
    stage.innerHTML = '<img alt="Banner da Clínica Médica São Vicente">';
    panel.prepend(stage);
  }

  return stage;
}

function renderLogin(index = state.loginIndex) {
  const items = state.loginItems;
  const panel = document.getElementById("csv-login-ad-panel");
  if (!panel) return;

  if (!items.length) {
    restoreLoginDefault();
    return;
  }

  state.loginIndex = ((index % items.length) + items.length) % items.length;
  const selected = items[state.loginIndex];
  const stage = ensureLoginStage();
  const img = stage?.querySelector("img");
  assignImage(img, selected.image, 2400);

  document.querySelector(".csv-ad-placeholder")?.style.setProperty("display", "none");
  document.querySelector(".csv-mascot-stage")?.style.setProperty("display", "none");

  const title = document.getElementById("csv-ad-title");
  const text = document.getElementById("csv-ad-text");
  if (title) title.textContent = selected.title || "Informação da Clínica";
  if (text) text.textContent = selected.text || "Comunicado institucional da gestão.";

  let dots = document.getElementById("csv-stable-login-dots");
  if (items.length <= 1) {
    dots?.remove();
    return;
  }

  if (!dots) {
    dots = document.createElement("div");
    dots.id = "csv-stable-login-dots";
    dots.className = "csv-stable-login-dots";
    panel.appendChild(dots);
  }

  dots.innerHTML = items.map((_, itemIndex) => `
    <button
      type="button"
      class="${itemIndex === state.loginIndex ? "active" : ""}"
      data-index="${itemIndex}"
      aria-label="Exibir banner ${itemIndex + 1}">
    </button>
  `).join("");

  dots.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      renderLogin(Number(button.dataset.index || 0));
      startLoginTimer();
    });
  });
}

function startLoginTimer() {
  clearTimer("loginTimer");
  if (state.loginItems.length <= 1) return;

  const seconds = Math.max(4, Number(state.config.loginBannerInterval || 8));
  state.loginTimer = setInterval(() => {
    renderLogin(state.loginIndex + 1);
  }, seconds * 1000);
}

function applyLoginBanners() {
  state.loginItems = parseLoginItems(state.config.loginBanners || "");
  state.loginIndex = 0;
  renderLogin(0);
  startLoginTimer();
}

function ensureHomeSection() {
  const home = document.getElementById("tab-home");
  if (!home) return null;

  let section = document.getElementById("csv-stable-home-carousel-section");
  if (!section) {
    section = document.createElement("section");
    section.id = "csv-stable-home-carousel-section";
    section.className = "csv-stable-home-carousel-section";
    section.innerHTML = `
      <div class="csv-stable-home-heading">
        <div>
          <span><i class="ri-gallery-line"></i> Comunicados em destaque</span>
          <h2>Campanhas e informações da clínica</h2>
        </div>
        <small>Atualizado pela gestão</small>
      </div>
      <div id="csv-stable-home-carousel" class="csv-stable-home-carousel"></div>
    `;
    home.appendChild(section);
  } else if (section.parentElement !== home) {
    home.appendChild(section);
  }

  return section;
}

function homeTransition() {
  const allowed = new Set(["fade", "slide", "zoom"]);
  const value = String(state.config.homeCarouselTransition || "fade").toLowerCase();
  return allowed.has(value) ? value : "fade";
}

function renderHome(index = state.homeIndex) {
  const section = ensureHomeSection();
  const holder = document.getElementById("csv-stable-home-carousel");
  const active = enabled(state.config.homeCarouselActive, true);

  if (!section || !holder) return;

  if (!active || !state.homeItems.length) {
    section.hidden = true;
    section.style.setProperty("display", "none", "important");
    clearTimer("homeTimer");
    return;
  }

  section.hidden = false;
  section.style.removeProperty("display");

  state.homeIndex = ((index % state.homeItems.length) + state.homeItems.length) % state.homeItems.length;
  const item = state.homeItems[state.homeIndex];
  const transition = homeTransition();

  holder.innerHTML = `
    <article class="csv-stable-home-slide csv-transition-${transition}">
      <img alt="${esc(item.title || `Banner ${state.homeIndex + 1}`)}">
      <div class="csv-stable-home-overlay"></div>
      ${item.title || item.text || (item.buttonText && item.buttonLink) ? `
        <div class="csv-stable-home-copy">
          <span><i class="ri-megaphone-line"></i> Destaque da gestão</span>
          ${item.title ? `<h3>${esc(item.title)}</h3>` : ""}
          ${item.text ? `<p>${esc(item.text)}</p>` : ""}
          ${item.buttonText && item.buttonLink ? `
            <a href="${esc(item.buttonLink)}" target="_blank" rel="noopener noreferrer">
              ${esc(item.buttonText)}
              <i class="ri-arrow-right-up-line"></i>
            </a>
          ` : ""}
        </div>
      ` : ""}

      ${state.homeItems.length > 1 ? `
        <button type="button" class="csv-stable-home-arrow previous" data-action="previous" aria-label="Banner anterior">
          <i class="ri-arrow-left-s-line"></i>
        </button>
        <button type="button" class="csv-stable-home-arrow next" data-action="next" aria-label="Próximo banner">
          <i class="ri-arrow-right-s-line"></i>
        </button>
        <div class="csv-stable-home-bottom">
          <div class="csv-stable-home-dots">
            ${state.homeItems.map((_, itemIndex) => `
              <button
                type="button"
                class="${itemIndex === state.homeIndex ? "active" : ""}"
                data-index="${itemIndex}"
                aria-label="Exibir banner ${itemIndex + 1}">
              </button>
            `).join("")}
          </div>
          <span>${String(state.homeIndex + 1).padStart(2, "0")} / ${String(state.homeItems.length).padStart(2, "0")}</span>
        </div>
      ` : ""}
    </article>
  `;

  assignImage(holder.querySelector("img"), item.image, 2600);

  holder.querySelector('[data-action="previous"]')?.addEventListener("click", () => {
    renderHome(state.homeIndex - 1);
    startHomeTimer();
  });

  holder.querySelector('[data-action="next"]')?.addEventListener("click", () => {
    renderHome(state.homeIndex + 1);
    startHomeTimer();
  });

  holder.querySelectorAll(".csv-stable-home-dots button").forEach((button) => {
    button.addEventListener("click", () => {
      renderHome(Number(button.dataset.index || 0));
      startHomeTimer();
    });
  });

  const slide = holder.querySelector(".csv-stable-home-slide");
  slide?.addEventListener("mouseenter", () => {
    state.homePaused = true;
    clearTimer("homeTimer");
  });
  slide?.addEventListener("mouseleave", () => {
    state.homePaused = false;
    startHomeTimer();
  });
}

function startHomeTimer() {
  clearTimer("homeTimer");
  if (state.homePaused || state.homeItems.length <= 1) return;

  const seconds = Math.max(3, Number(state.config.homeCarouselInterval || 7));
  state.homeTimer = setInterval(() => {
    if (!state.homePaused) renderHome(state.homeIndex + 1);
  }, seconds * 1000);
}

function applyHomeCarousel() {
  state.homeItems = parseHomeItems(state.config);
  if (state.homeIndex >= state.homeItems.length) state.homeIndex = 0;
  renderHome(state.homeIndex);
  startHomeTimer();
}

function sanitizePart(value = "") {
  return String(value).replace(/\r?\n/g, " ").replace(/\|/g, "/").trim();
}

function serializeEditorItems(items = [], fields = []) {
  return items
    .filter((item) => sanitizePart(item.image))
    .map((item) => fields.map((field) => sanitizePart(item[field])).join(" | "))
    .join("\n");
}

function editorDefinitions() {
  return [
    {
      sourceName: "loginBanners",
      editorId: "csv-login-banner-editor",
      title: "Banners da tela de login",
      fields: ["image", "title", "text"],
      parse: (raw) => parseLoginItems(raw)
    },
    {
      sourceName: "homeCarouselItems",
      editorId: "csv-home-banner-editor",
      title: "Banners do carrossel da página inicial",
      fields: ["image", "title", "text", "buttonText", "buttonLink"],
      parse: (raw) => parseHomeItems({ homeCarouselItems: raw })
    }
  ];
}

function fieldLabel(field) {
  return ({
    image: "Link público da imagem no Google Drive",
    title: "Título",
    text: "Descrição",
    buttonText: "Texto do botão",
    buttonLink: "Link do botão"
  })[field] || field;
}

function fieldPlaceholder(field) {
  return ({
    image: "https://drive.google.com/file/d/...",
    title: "Título opcional",
    text: "Descrição opcional",
    buttonText: "Ex.: Ver comunicado",
    buttonLink: "https://..."
  })[field] || "";
}

function editorRow(item, index, fields) {
  return `
    <article class="csv-stable-editor-item" data-index="${index}">
      <header>
        <strong><i class="ri-image-2-line"></i> Banner ${index + 1}</strong>
        <div>
          <button type="button" data-action="up" title="Mover para cima"><i class="ri-arrow-up-line"></i></button>
          <button type="button" data-action="down" title="Mover para baixo"><i class="ri-arrow-down-line"></i></button>
          <button type="button" data-action="remove" class="danger" title="Remover"><i class="ri-delete-bin-6-line"></i></button>
        </div>
      </header>
      <div class="csv-stable-editor-grid">
        ${fields.map((field) => {
          const full = ["image", "text", "buttonLink"].includes(field) ? "full" : "";
          if (field === "text") {
            return `
              <label class="${full}">
                <span>${fieldLabel(field)}</span>
                <textarea data-field="${field}" rows="2" placeholder="${fieldPlaceholder(field)}">${esc(item[field] || "")}</textarea>
              </label>
            `;
          }

          return `
            <label class="${full}">
              <span>${fieldLabel(field)}</span>
              <input
                type="${field === "image" || field === "buttonLink" ? "url" : "text"}"
                data-field="${field}"
                value="${esc(item[field] || "")}"
                placeholder="${fieldPlaceholder(field)}">
            </label>
          `;
        }).join("")}
      </div>
    </article>
  `;
}

function collectEditorItems(editor, fields) {
  return [...editor.querySelectorAll(".csv-stable-editor-item")].map((row) => {
    const item = {};
    fields.forEach((field) => {
      item[field] = row.querySelector(`[data-field="${field}"]`)?.value || "";
    });
    return item;
  });
}

function renderEditor(editor, source, definition, items) {
  const list = editor.querySelector(".csv-stable-editor-list");
  const safeItems = items.length ? items : [Object.fromEntries(definition.fields.map((field) => [field, ""]))];
  list.innerHTML = safeItems.map((item, index) => editorRow(item, index, definition.fields)).join("");
  syncEditor(editor, source, definition);
}

function syncEditor(editor, source, definition) {
  const items = collectEditorItems(editor, definition.fields);
  source.value = serializeEditorItems(items, definition.fields);
  const total = items.filter((item) => sanitizePart(item.image)).length;
  const count = editor.querySelector(".csv-stable-editor-count");
  if (count) count.textContent = `${total} ${total === 1 ? "banner" : "banners"}`;
}

function installEditor(definition) {
  const form = document.getElementById("csv-admin-settings-form");
  const source = form?.querySelector(`textarea[name="${definition.sourceName}"]`);
  if (!form || !source || form.querySelector(`#${definition.editorId}`)) return;

  source.classList.add("csv-stable-source-field");
  source.tabIndex = -1;
  source.setAttribute("aria-hidden", "true");

  const editor = document.createElement("div");
  editor.id = definition.editorId;
  editor.className = "csv-stable-editor";
  editor.innerHTML = `
    <div class="csv-stable-editor-toolbar">
      <div>
        <strong>${esc(definition.title)}</strong>
        <small>Use os botões para adicionar, excluir ou reorganizar as imagens.</small>
      </div>
      <button type="button" data-add-banner><i class="ri-add-line"></i> Adicionar banner</button>
    </div>
    <div class="csv-stable-editor-list"></div>
    <div class="csv-stable-editor-footer">
      <span class="csv-stable-editor-count">0 banners</span>
      <small>Até 12 imagens por área.</small>
    </div>
  `;

  source.closest("label")?.insertAdjacentElement("afterend", editor);
  renderEditor(editor, source, definition, definition.parse(source.value));

  editor.querySelector("[data-add-banner]")?.addEventListener("click", () => {
    const items = collectEditorItems(editor, definition.fields);
    if (items.length >= 12) {
      alert("Esta área aceita até 12 banners.");
      return;
    }
    items.push(Object.fromEntries(definition.fields.map((field) => [field, ""])));
    renderEditor(editor, source, definition, items);
    editor.querySelector(".csv-stable-editor-item:last-child")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  editor.addEventListener("input", () => syncEditor(editor, source, definition));
  editor.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const row = button.closest(".csv-stable-editor-item");
    const index = Number(row?.dataset.index || 0);
    const items = collectEditorItems(editor, definition.fields);

    if (button.dataset.action === "remove") items.splice(index, 1);
    if (button.dataset.action === "up" && index > 0) {
      [items[index - 1], items[index]] = [items[index], items[index - 1]];
    }
    if (button.dataset.action === "down" && index < items.length - 1) {
      [items[index + 1], items[index]] = [items[index], items[index + 1]];
    }

    renderEditor(editor, source, definition, items);
  });
}

function installEditors() {
  editorDefinitions().forEach(installEditor);
}

function syncAllEditors() {
  const form = document.getElementById("csv-admin-settings-form");
  if (!form) return;

  editorDefinitions().forEach((definition) => {
    const editor = form.querySelector(`#${definition.editorId}`);
    const source = form.querySelector(`textarea[name="${definition.sourceName}"]`);
    if (editor && source) syncEditor(editor, source, definition);
  });
}

function injectStyles() {
  if (document.getElementById("csv-media-stable-style")) return;

  const style = document.createElement("style");
  style.id = "csv-media-stable-style";
  style.textContent = `
    html[data-csv-fixed-announcement="off"] #banner-area { display:none !important; }

    .csv-stable-login-media { position:absolute; inset:0; z-index:0; overflow:hidden; border-radius:inherit; }
    .csv-stable-login-media::after { content:""; position:absolute; inset:0; background:linear-gradient(90deg,rgba(62,15,22,.82),rgba(62,15,22,.34)); }
    .csv-stable-login-media img { width:100%; height:100%; object-fit:cover; transition:opacity .35s ease, transform .8s ease; }
    .csv-stable-login-media img.csv-media-loading { opacity:.15; transform:scale(1.03); }
    .csv-stable-login-media img.csv-media-error { display:none; }
    #csv-login-ad-panel > *:not(.csv-stable-login-media) { position:relative; z-index:2; }
    .csv-stable-login-dots { position:absolute !important; z-index:5 !important; left:50%; bottom:22px; transform:translateX(-50%); display:flex; gap:7px; }
    .csv-stable-login-dots button { width:8px; height:8px; padding:0; border:0; border-radius:50%; background:rgba(255,255,255,.42); cursor:pointer; }
    .csv-stable-login-dots button.active { width:24px; border-radius:999px; background:#fff; }

    .csv-stable-home-carousel-section { margin-top:26px; padding:18px; border:1px solid rgba(123,139,163,.16); border-radius:28px; background:rgba(255,255,255,.84); box-shadow:0 22px 55px rgba(30,45,70,.08); }
    html[data-theme="dark"] .csv-stable-home-carousel-section { background:#182333; border-color:rgba(255,255,255,.08); }
    .csv-stable-home-heading { margin-bottom:14px; display:flex; align-items:end; justify-content:space-between; gap:15px; }
    .csv-stable-home-heading span { color:#8b252c; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; }
    .csv-stable-home-heading h2 { margin:5px 0 0; color:var(--cp-text,#172033); font-size:22px; }
    .csv-stable-home-heading small { color:#718096; font-size:9px; }
    .csv-stable-home-slide { position:relative; min-height:clamp(260px,34vw,520px); overflow:hidden; border-radius:22px; background:#152033; animation:csvStableFade .45s ease both; }
    .csv-stable-home-slide.csv-transition-slide { animation-name:csvStableSlide; }
    .csv-stable-home-slide.csv-transition-zoom { animation-name:csvStableZoom; }
    .csv-stable-home-slide > img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transition:opacity .35s ease; }
    .csv-stable-home-slide > img.csv-media-loading { opacity:.12; }
    .csv-stable-home-slide > img.csv-media-error { display:none; }
    .csv-stable-home-overlay { position:absolute; inset:0; background:linear-gradient(90deg,rgba(11,20,35,.82),rgba(11,20,35,.16)); }
    .csv-stable-home-copy { position:absolute; z-index:2; left:clamp(22px,5vw,70px); top:50%; width:min(540px,72%); color:#fff; transform:translateY(-50%); }
    .csv-stable-home-copy span { font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; }
    .csv-stable-home-copy h3 { margin:10px 0; font-size:clamp(24px,3.2vw,48px); line-height:1.04; }
    .csv-stable-home-copy p { margin:0 0 17px; color:rgba(255,255,255,.82); font-size:clamp(10px,1vw,14px); line-height:1.7; }
    .csv-stable-home-copy a { min-height:42px; padding:0 15px; display:inline-flex; align-items:center; gap:7px; border-radius:13px; color:#172033; background:#fff; text-decoration:none; font-size:10px; font-weight:800; }
    .csv-stable-home-arrow { position:absolute; z-index:3; top:50%; width:42px; height:42px; display:grid; place-items:center; border:1px solid rgba(255,255,255,.35); border-radius:50%; color:#fff; background:rgba(14,24,40,.34); backdrop-filter:blur(12px); transform:translateY(-50%); cursor:pointer; }
    .csv-stable-home-arrow.previous { left:14px; }
    .csv-stable-home-arrow.next { right:14px; }
    .csv-stable-home-bottom { position:absolute; z-index:3; left:22px; right:22px; bottom:16px; display:flex; align-items:center; justify-content:space-between; color:#fff; font-size:9px; font-weight:800; }
    .csv-stable-home-dots { display:flex; gap:6px; }
    .csv-stable-home-dots button { width:8px; height:8px; padding:0; border:0; border-radius:50%; background:rgba(255,255,255,.42); cursor:pointer; }
    .csv-stable-home-dots button.active { width:25px; border-radius:999px; background:#fff; }

    .csv-stable-source-field { position:absolute !important; width:1px !important; height:1px !important; min-height:1px !important; opacity:0 !important; pointer-events:none !important; overflow:hidden !important; }
    .csv-stable-editor { margin-top:14px; padding:17px; border:1px solid rgba(116,88,202,.14); border-radius:21px; background:linear-gradient(145deg,rgba(116,88,202,.05),rgba(139,37,44,.025)),var(--cp-card,#fff); }
    .csv-stable-editor-toolbar { margin-bottom:14px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .csv-stable-editor-toolbar > div { display:flex; flex-direction:column; gap:3px; }
    .csv-stable-editor-toolbar strong { color:var(--cp-text,#172033); font-size:12px; }
    .csv-stable-editor-toolbar small,.csv-stable-editor-footer small { color:#718096; font-size:9px; }
    .csv-stable-editor-toolbar > button { min-height:40px; padding:0 14px; display:inline-flex; align-items:center; gap:6px; border:0; border-radius:13px; color:#fff; background:linear-gradient(145deg,#7458ca,#9a73e6); font-family:inherit; font-size:9px; font-weight:800; cursor:pointer; box-shadow:0 12px 25px rgba(116,88,202,.2); }
    .csv-stable-editor-list { display:grid; gap:11px; }
    .csv-stable-editor-item { padding:14px; border:1px solid var(--cp-border,#e3e9f1); border-radius:17px; background:var(--cp-card,#fff); }
    .csv-stable-editor-item > header { margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; gap:10px; }
    .csv-stable-editor-item > header strong { color:#7055bd; font-size:10px; }
    .csv-stable-editor-item > header > div { display:flex; gap:5px; }
    .csv-stable-editor-item > header button { width:32px; height:32px; display:grid; place-items:center; border:1px solid var(--cp-border,#e3e9f1); border-radius:10px; color:#64748b; background:var(--cp-soft,#f6f8fb); cursor:pointer; }
    .csv-stable-editor-item > header button.danger { color:#d94350; }
    .csv-stable-editor-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .csv-stable-editor-grid label { display:flex; flex-direction:column; gap:5px; }
    .csv-stable-editor-grid label.full { grid-column:1 / -1; }
    .csv-stable-editor-grid span { color:#66748a; font-size:8px; font-weight:800; }
    .csv-stable-editor-grid input,.csv-stable-editor-grid textarea { width:100%; min-height:42px; padding:10px 12px; border:1px solid var(--cp-border,#dfe6ef); border-radius:12px; outline:none; color:var(--cp-text,#172033); background:var(--cp-soft,#f7f9fc); font-family:inherit; font-size:9px; resize:vertical; }
    .csv-stable-editor-grid input:focus,.csv-stable-editor-grid textarea:focus { border-color:rgba(116,88,202,.52); box-shadow:0 0 0 4px rgba(116,88,202,.08); }
    .csv-stable-editor-footer { margin-top:12px; display:flex; align-items:center; justify-content:space-between; gap:10px; }
    .csv-stable-editor-count { padding:6px 10px; border-radius:999px; color:#6952b0; background:rgba(116,88,202,.09); font-size:8px; font-weight:800; }

    @keyframes csvStableFade { from { opacity:0; } to { opacity:1; } }
    @keyframes csvStableSlide { from { opacity:0; transform:translateX(22px); } to { opacity:1; transform:none; } }
    @keyframes csvStableZoom { from { opacity:0; transform:scale(.97); } to { opacity:1; transform:scale(1); } }

    @media (max-width:720px) {
      .csv-stable-home-heading { align-items:start; flex-direction:column; }
      .csv-stable-home-copy { width:76%; }
      .csv-stable-editor-toolbar { align-items:stretch; flex-direction:column; }
      .csv-stable-editor-toolbar > button { justify-content:center; }
      .csv-stable-editor-grid { grid-template-columns:1fr; }
      .csv-stable-editor-grid label.full { grid-column:auto; }
    }
  `;
  document.head.appendChild(style);
}

function applyEverything() {
  applyFixedAnnouncementVisibility();
  applyLoginBanners();
  applyHomeCarousel();
  installEditors();
}

function subscribe() {
  onSnapshot(
    doc(db, "configuracoes", "geral"),
    (snapshot) => {
      state.config = snapshot.exists() ? snapshot.data() || {} : {};
      applyEverything();
    },
    (error) => {
      console.warn("CSV Mídia Estável: não foi possível ler as configurações.", error);
    }
  );
}

function init() {
  injectStyles();
  subscribe();

  document.addEventListener("submit", (event) => {
    if (event.target?.id === "csv-admin-settings-form") {
      syncAllEditors();
    }
  }, true);

  document.addEventListener("click", (event) => {
    if (event.target.closest('.nav-btn[data-tab="home"], .nav-btn[data-tab="ajustes"]')) {
      [30, 160, 480].forEach((delay) => setTimeout(() => {
        applyFixedAnnouncementVisibility();
        applyHomeCarousel();
        installEditors();
      }, delay));
    }
  });

  const observer = new MutationObserver(() => {
    clearTimeout(state.observerTimer);
    state.observerTimer = setTimeout(() => {
      applyFixedAnnouncementVisibility();
      installEditors();
      if (!document.getElementById("csv-stable-home-carousel-section")) {
        applyHomeCarousel();
      }
    }, 90);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.csvHomeCarouselRefresh = applyHomeCarousel;
  window.csvBannerSettingsApply = applyEverything;
  window.csvBannerEditorSync = syncAllEditors;

  console.log(`CSV Mídia Estável ${VERSION} carregado.`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

