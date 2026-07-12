import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const VERSION = "7.5.5";
const app = getApp();
const db = getFirestore(app);

const state = {
  config: {},
  observerTimer: null,
  refreshTimer: null
};

function isEnabled(value, fallback = true) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return !(
    value === false ||
    value === 0 ||
    value === "0" ||
    String(value).toLowerCase() === "false"
  );
}

function sanitizePart(value = "") {
  return String(value)
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "/")
    .trim();
}

function parseItems(raw = "") {
  return String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [
        image = "",
        title = "",
        text = "",
        buttonText = "",
        buttonLink = ""
      ] = line.split("|").map((part) => part.trim());

      return {
        image,
        title,
        text,
        buttonText,
        buttonLink
      };
    });
}

function serializeItems(items = []) {
  return items
    .filter((item) => sanitizePart(item.image))
    .map((item) => [
      sanitizePart(item.image),
      sanitizePart(item.title),
      sanitizePart(item.text),
      sanitizePart(item.buttonText),
      sanitizePart(item.buttonLink)
    ].join(" | "))
    .join("\n");
}

function forceVisibility(element, visible) {
  if (!element) return;

  if (visible) {
    element.hidden = false;
    element.removeAttribute("aria-hidden");
    element.classList.remove("csv-feature-disabled");
    element.style.removeProperty("display");
  } else {
    element.hidden = true;
    element.setAttribute("aria-hidden", "true");
    element.classList.add("csv-feature-disabled");
    element.style.setProperty("display", "none", "important");
  }
}

function enforceBannerVisibility() {
  const fixedActive = isEnabled(
    state.config.homeAnnouncementActive,
    true
  );

  const carouselActive = isEnabled(
    state.config.homeCarouselActive,
    true
  );

  const fixedBanner = document.getElementById("banner-area");
  const carouselSection = document.getElementById(
    "csv-home-banner-carousel-section"
  );

  forceVisibility(fixedBanner, fixedActive);
  forceVisibility(carouselSection, carouselActive);

  document.documentElement.dataset.csvFixedBanner =
    fixedActive ? "on" : "off";

  document.documentElement.dataset.csvHomeCarousel =
    carouselActive ? "on" : "off";

  if (carouselActive && !carouselSection) {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = setTimeout(() => {
      window.csvHomeCarouselRefresh?.();
    }, 120);
  }
}

function editorTemplate() {
  return `
    <div class="csv-banner-editor-toolbar">
      <div>
        <strong>Imagens do carrossel</strong>
        <small>
          Cadastre, edite, organize ou remova os banners visualmente.
        </small>
      </div>

      <button type="button" id="csv-banner-add">
        <i class="ri-add-line"></i>
        Adicionar banner
      </button>
    </div>

    <div id="csv-banner-editor-list"></div>

    <div class="csv-banner-editor-footer">
      <span id="csv-banner-editor-count">0 banners</span>
      <small>Limite recomendado: até 12 imagens.</small>
    </div>
  `;
}

function itemTemplate(item, index) {
  return `
    <article class="csv-banner-editor-item" data-index="${index}">
      <header>
        <span class="csv-banner-number">
          <i class="ri-image-2-line"></i>
          Banner ${index + 1}
        </span>

        <div class="csv-banner-item-actions">
          <button
            type="button"
            data-action="up"
            title="Mover para cima"
            aria-label="Mover banner para cima"
          >
            <i class="ri-arrow-up-line"></i>
          </button>

          <button
            type="button"
            data-action="down"
            title="Mover para baixo"
            aria-label="Mover banner para baixo"
          >
            <i class="ri-arrow-down-line"></i>
          </button>

          <button
            type="button"
            data-action="remove"
            class="danger"
            title="Remover banner"
            aria-label="Remover banner"
          >
            <i class="ri-delete-bin-6-line"></i>
          </button>
        </div>
      </header>

      <div class="csv-banner-editor-grid">
        <label class="full">
          <span>Link público da imagem no Google Drive</span>
          <input
            type="url"
            data-field="image"
            value="${escapeAttribute(item.image)}"
            placeholder="https://drive.google.com/file/d/..."
          >
        </label>

        <label>
          <span>Título</span>
          <input
            type="text"
            data-field="title"
            value="${escapeAttribute(item.title)}"
            placeholder="Título opcional"
          >
        </label>

        <label>
          <span>Texto do botão</span>
          <input
            type="text"
            data-field="buttonText"
            value="${escapeAttribute(item.buttonText)}"
            placeholder="Ex.: Ver comunicado"
          >
        </label>

        <label class="full">
          <span>Descrição</span>
          <textarea
            data-field="text"
            rows="2"
            placeholder="Descrição opcional"
          >${escapeHtml(item.text)}</textarea>
        </label>

        <label class="full">
          <span>Link do botão</span>
          <input
            type="url"
            data-field="buttonLink"
            value="${escapeAttribute(item.buttonLink)}"
            placeholder="https://..."
          >
        </label>
      </div>
    </article>
  `;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function escapeAttribute(value = "") {
  return escapeHtml(value);
}

function collectEditorItems(editor) {
  return [...editor.querySelectorAll(".csv-banner-editor-item")]
    .map((row) => ({
      image: row.querySelector('[data-field="image"]')?.value || "",
      title: row.querySelector('[data-field="title"]')?.value || "",
      text: row.querySelector('[data-field="text"]')?.value || "",
      buttonText:
        row.querySelector('[data-field="buttonText"]')?.value || "",
      buttonLink:
        row.querySelector('[data-field="buttonLink"]')?.value || ""
    }));
}

function syncEditor(editor, textarea) {
  const items = collectEditorItems(editor);
  textarea.value = serializeItems(items);

  const validCount = items.filter((item) =>
    sanitizePart(item.image)
  ).length;

  const count = editor.querySelector("#csv-banner-editor-count");
  if (count) {
    count.textContent =
      `${validCount} ${validCount === 1 ? "banner" : "banners"}`;
  }
}

function renderEditorRows(editor, textarea, items) {
  const list = editor.querySelector("#csv-banner-editor-list");
  if (!list) return;

  const safeItems = items.length ? items : [{
    image: "",
    title: "",
    text: "",
    buttonText: "",
    buttonLink: ""
  }];

  list.innerHTML = safeItems
    .map(itemTemplate)
    .join("");

  syncEditor(editor, textarea);
}

function installCarouselEditor() {
  const form = document.getElementById(
    "csv-admin-settings-form"
  );

  const textarea = form?.querySelector(
    'textarea[name="homeCarouselItems"]'
  );

  if (!form || !textarea) return;
  if (form.querySelector("#csv-banner-visual-editor")) return;

  textarea.classList.add("csv-banner-source-field");
  textarea.setAttribute("aria-hidden", "true");
  textarea.tabIndex = -1;

  const editor = document.createElement("div");
  editor.id = "csv-banner-visual-editor";
  editor.className = "csv-banner-visual-editor";
  editor.innerHTML = editorTemplate();

  textarea.closest("label")?.insertAdjacentElement(
    "afterend",
    editor
  );

  renderEditorRows(
    editor,
    textarea,
    parseItems(textarea.value)
  );

  editor
    .querySelector("#csv-banner-add")
    ?.addEventListener("click", () => {
      const items = collectEditorItems(editor);

      if (items.length >= 12) {
        alert("O carrossel aceita até 12 banners.");
        return;
      }

      items.push({
        image: "",
        title: "",
        text: "",
        buttonText: "",
        buttonLink: ""
      });

      renderEditorRows(editor, textarea, items);

      editor
        .querySelector(".csv-banner-editor-item:last-child")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
    });

  editor.addEventListener("input", () => {
    syncEditor(editor, textarea);
  });

  editor.addEventListener("click", (event) => {
    const button = event.target.closest(
      "button[data-action]"
    );

    if (!button) return;

    const row = button.closest(".csv-banner-editor-item");
    if (!row) return;

    const index = Number(row.dataset.index || 0);
    const action = button.dataset.action;
    const items = collectEditorItems(editor);

    if (action === "remove") {
      items.splice(index, 1);
    }

    if (action === "up" && index > 0) {
      [items[index - 1], items[index]] =
        [items[index], items[index - 1]];
    }

    if (action === "down" && index < items.length - 1) {
      [items[index + 1], items[index]] =
        [items[index], items[index + 1]];
    }

    renderEditorRows(editor, textarea, items);
  });

  form.addEventListener(
    "submit",
    () => {
      syncEditor(editor, textarea);
    },
    true
  );

  window.csvBannerEditorSync = () => {
    syncEditor(editor, textarea);
  };
}

function applyConfig() {
  enforceBannerVisibility();
  installCarouselEditor();
}

function subscribe() {
  onSnapshot(
    doc(db, "configuracoes", "geral"),
    (snapshot) => {
      state.config = snapshot.exists()
        ? snapshot.data() || {}
        : {};

      applyConfig();

      setTimeout(enforceBannerVisibility, 100);
      setTimeout(enforceBannerVisibility, 500);
    },
    (error) => {
      console.warn(
        "CSV Banners Hotfix: não foi possível ler as configurações.",
        error
      );
    }
  );
}

function init() {
  subscribe();

  const observer = new MutationObserver(() => {
    clearTimeout(state.observerTimer);

    state.observerTimer = setTimeout(() => {
      installCarouselEditor();
      enforceBannerVisibility();
    }, 80);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class", "hidden"]
  });

  document.addEventListener("click", (event) => {
    if (
      event.target.closest(
        '.nav-btn[data-tab="home"], .nav-btn[data-tab="ajustes"]'
      )
    ) {
      [30, 150, 450].forEach((delay) => {
        setTimeout(applyConfig, delay);
      });
    }
  });

  window.csvBannerSettingsApply = applyConfig;

  console.log(
    `CSV Banners Hotfix ${VERSION} carregado.`
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
