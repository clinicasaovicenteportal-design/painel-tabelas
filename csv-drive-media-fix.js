import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const VERSION = "7.5.4";
const app = getApp();
const db = getFirestore(app);

const state = {
  config: null,

  loginIndex: 0,
  loginTimer: null,
  loginGeneration: 0,

  homeIndex: 0,
  homeTimer: null,
  homeGeneration: 0,
  homeSlides: [],
  homePaused: false,

  settingsObserverTimer: null
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

function imageCandidates(raw = "", width = 2200) {
  const value = String(raw || "").trim();
  if (!value) return [];

  const id = extractDriveId(value);

  if (!id) return [value];

  return [
    `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`,
    `https://lh3.googleusercontent.com/d/${id}=w${width}`,
    `https://drive.usercontent.google.com/download?id=${id}&export=view&authuser=0`,
    `https://drive.google.com/uc?export=view&id=${id}`,
    value
  ];
}

function loadImage(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    const timer = setTimeout(() => {
      image.src = "";
      reject(new Error("Tempo limite ao carregar imagem."));
    }, timeout);

    image.onload = () => {
      clearTimeout(timer);

      if (image.naturalWidth < 2 || image.naturalHeight < 2) {
        reject(new Error("Imagem sem dimensões válidas."));
        return;
      }

      resolve(url);
    };

    image.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Falha ao carregar imagem."));
    };

    image.referrerPolicy = "no-referrer";
    image.src = url;
  });
}

async function resolveImage(raw = "", width = 2200) {
  const candidates = imageCandidates(raw, width);

  for (const candidate of candidates) {
    try {
      return await loadImage(candidate);
    } catch (_) {
      // Tenta o próximo formato público do Google Drive.
    }
  }

  return "";
}

function parseLines(raw = "", maxParts = 5) {
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

function parseLoginBanners(raw = "") {
  return parseLines(raw, 3)
    .map(([image, title, text]) => ({
      image,
      title,
      text
    }))
    .filter((item) => item.image);
}

function parseHomeCarousel(config = {}) {
  const items = parseLines(config.homeCarouselItems || "", 5)
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

function restoreLoginDefault() {
  const panel = document.getElementById("csv-login-ad-panel");
  if (!panel) return;

  panel.classList.remove(
    "csv-drive-login-active",
    "csv-drive-login-error"
  );

  panel.style.removeProperty("--csv-drive-login-image");

  document
    .querySelector(".csv-ad-placeholder")
    ?.style.removeProperty("display");

  document
    .querySelector(".csv-mascot-stage")
    ?.style.removeProperty("display");

  document.getElementById("csv-drive-login-dots")?.remove();
}

async function applyLoginBannerAt(index = 0) {
  const config = state.config || {};
  const banners = parseLoginBanners(config.loginBanners);
  const panel = document.getElementById("csv-login-ad-panel");

  if (!panel) return;

  document.getElementById("csv-admin-login-banner")?.remove();

  if (!banners.length) {
    restoreLoginDefault();
    return;
  }

  const selected = banners[index % banners.length];
  const generation = ++state.loginGeneration;
  const resolved = await resolveImage(selected.image, 2200);

  if (generation !== state.loginGeneration) return;

  if (!resolved) {
    panel.classList.add("csv-drive-login-error");
    return;
  }

  panel.classList.remove("csv-drive-login-error");
  panel.classList.add("csv-drive-login-active");

  panel.style.setProperty(
    "--csv-drive-login-image",
    `url("${resolved.replace(/"/g, "%22")}")`
  );

  const title = document.getElementById("csv-ad-title");
  const text = document.getElementById("csv-ad-text");

  if (title && selected.title) title.textContent = selected.title;
  if (text && selected.text) text.textContent = selected.text;

  const placeholder = document.querySelector(".csv-ad-placeholder");
  const mascot = document.querySelector(".csv-mascot-stage");

  if (placeholder) placeholder.style.display = "none";
  if (mascot) mascot.style.display = "none";

  let dots = document.getElementById("csv-drive-login-dots");

  if (banners.length > 1) {
    if (!dots) {
      dots = document.createElement("div");
      dots.id = "csv-drive-login-dots";
      dots.className = "csv-drive-login-dots";
      panel.appendChild(dots);
    }

    dots.innerHTML = banners
      .map(
        (_, dotIndex) =>
          `<button
            type="button"
            class="${dotIndex === index % banners.length ? "active" : ""}"
            data-index="${dotIndex}"
            aria-label="Exibir anúncio ${dotIndex + 1}">
          </button>`
      )
      .join("");

    dots.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        state.loginIndex = Number(button.dataset.index || 0);
        applyLoginBannerAt(state.loginIndex);
      });
    });
  } else {
    dots?.remove();
  }
}

function applyLoginBanners() {
  clearInterval(state.loginTimer);
  state.loginTimer = null;
  state.loginIndex = 0;

  const banners = parseLoginBanners(
    state.config?.loginBanners || ""
  );

  applyLoginBannerAt(0);

  if (banners.length <= 1) return;

  const seconds = Math.max(
    4,
    Number(state.config?.loginBannerInterval || 8)
  );

  state.loginTimer = setInterval(() => {
    state.loginIndex =
      (state.loginIndex + 1) % banners.length;

    applyLoginBannerAt(state.loginIndex);
  }, seconds * 1000);
}

function homeTab() {
  return document.getElementById("tab-home");
}

function ensureHomeCarouselSection() {
  const tab = homeTab();
  if (!tab) return null;

  let section = document.getElementById(
    "csv-home-banner-carousel-section"
  );

  if (!section) {
    section = document.createElement("section");
    section.id = "csv-home-banner-carousel-section";
    section.className = "csv-home-banner-carousel-section";
    section.innerHTML = `
      <div class="csv-home-banner-heading">
        <div>
          <span>
            <i class="ri-gallery-line"></i>
            Comunicados em destaque
          </span>
          <h2>Campanhas e informações da clínica</h2>
        </div>
        <small>Atualizado pela gestão</small>
      </div>

      <div
        id="csv-home-banner-carousel"
        class="csv-home-banner-carousel"
        aria-live="polite"
      ></div>
    `;

    tab.appendChild(section);
  } else if (section.parentElement !== tab) {
    tab.appendChild(section);
  }

  return section;
}

function neutralizeLegacyHomeImage() {
  const area = document.getElementById("banner-area");
  if (!area) return;

  area.classList.remove(
    "has-admin-image",
    "csv-drive-home-active",
    "csv-drive-home-error"
  );

  area.style.removeProperty("--csv-drive-home-image");
  area.style.removeProperty("background-image");
}

function stopHomeTimer() {
  clearInterval(state.homeTimer);
  state.homeTimer = null;
}

function startHomeTimer() {
  stopHomeTimer();

  if (
    state.homePaused ||
    state.homeSlides.length <= 1
  ) {
    return;
  }

  const seconds = Math.max(
    3,
    Number(state.config?.homeCarouselInterval || 7)
  );

  state.homeTimer = setInterval(() => {
    if (state.homePaused) return;
    homeGoTo(state.homeIndex + 1, "next");
  }, seconds * 1000);
}

function homeTransition() {
  const allowed = new Set(["fade", "slide", "zoom"]);
  const selected = String(
    state.config?.homeCarouselTransition || "fade"
  ).toLowerCase();

  return allowed.has(selected) ? selected : "fade";
}

function homeSlideMarkup(slide, index) {
  const active = index === state.homeIndex;
  const image = slide.resolvedImage || "";
  const hasCopy = Boolean(
    slide.title ||
    slide.text ||
    (slide.buttonText && slide.buttonLink)
  );

  return `
    <article
      class="csv-home-banner-slide ${active ? "active" : ""}"
      data-slide-index="${index}"
      aria-hidden="${active ? "false" : "true"}"
    >
      <img
        src="${esc(image)}"
        alt="${esc(slide.title || `Banner ${index + 1}`)}"
        loading="${index === 0 ? "eager" : "lazy"}"
        referrerpolicy="no-referrer"
      >

      <div class="csv-home-banner-overlay"></div>

      ${hasCopy ? `
        <div class="csv-home-banner-copy">
          <span>
            <i class="ri-megaphone-line"></i>
            Destaque da gestão
          </span>

          ${slide.title
            ? `<h3>${esc(slide.title)}</h3>`
            : ""}

          ${slide.text
            ? `<p>${esc(slide.text)}</p>`
            : ""}

          ${slide.buttonText && slide.buttonLink
            ? `<a
                href="${esc(slide.buttonLink)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                ${esc(slide.buttonText)}
                <i class="ri-arrow-right-up-line"></i>
              </a>`
            : ""}
        </div>
      ` : ""}
    </article>
  `;
}

function renderHomeCarousel() {
  const section = ensureHomeCarouselSection();
  const holder = document.getElementById(
    "csv-home-banner-carousel"
  );

  if (!section || !holder) return;

  if (
    state.config?.homeCarouselActive === false ||
    !state.homeSlides.length
  ) {
    section.style.display = "none";
    stopHomeTimer();
    return;
  }

  section.style.display = "";
  holder.dataset.transition = homeTransition();

  holder.innerHTML = `
    <div class="csv-home-banner-stage">
      ${state.homeSlides
        .map(homeSlideMarkup)
        .join("")}

      ${state.homeSlides.length > 1 ? `
        <button
          type="button"
          class="csv-home-banner-arrow previous"
          data-action="previous"
          aria-label="Banner anterior"
        >
          <i class="ri-arrow-left-s-line"></i>
        </button>

        <button
          type="button"
          class="csv-home-banner-arrow next"
          data-action="next"
          aria-label="Próximo banner"
        >
          <i class="ri-arrow-right-s-line"></i>
        </button>
      ` : ""}

      <div class="csv-home-banner-bottom">
        <div class="csv-home-banner-dots">
          ${state.homeSlides
            .map(
              (_, index) =>
                `<button
                  type="button"
                  class="${index === state.homeIndex ? "active" : ""}"
                  data-index="${index}"
                  aria-label="Exibir banner ${index + 1}">
                </button>`
            )
            .join("")}
        </div>

        <span class="csv-home-banner-counter">
          ${String(state.homeIndex + 1).padStart(2, "0")}
          /
          ${String(state.homeSlides.length).padStart(2, "0")}
        </span>
      </div>

      ${state.homeSlides.length > 1 ? `
        <div class="csv-home-banner-progress">
          <i style="animation-duration:${Math.max(
            3,
            Number(state.config?.homeCarouselInterval || 7)
          )}s"></i>
        </div>
      ` : ""}
    </div>
  `;

  holder
    .querySelector('[data-action="previous"]')
    ?.addEventListener("click", () => {
      homeGoTo(state.homeIndex - 1, "previous");
    });

  holder
    .querySelector('[data-action="next"]')
    ?.addEventListener("click", () => {
      homeGoTo(state.homeIndex + 1, "next");
    });

  holder.querySelectorAll(".csv-home-banner-dots button").forEach(
    (button) => {
      button.addEventListener("click", () => {
        homeGoTo(Number(button.dataset.index || 0), "direct");
      });
    }
  );

  const stage = holder.querySelector(".csv-home-banner-stage");

  stage?.addEventListener("mouseenter", () => {
    state.homePaused = true;
    stopHomeTimer();
    stage.classList.add("paused");
  });

  stage?.addEventListener("mouseleave", () => {
    state.homePaused = false;
    stage.classList.remove("paused");
    startHomeTimer();
  });

  startHomeTimer();
}

function homeGoTo(index, direction = "next") {
  if (!state.homeSlides.length) return;

  const total = state.homeSlides.length;
  state.homeIndex = (index + total) % total;

  const holder = document.getElementById(
    "csv-home-banner-carousel"
  );

  if (holder) {
    holder.dataset.direction = direction;
  }

  renderHomeCarousel();
}

async function prepareHomeCarousel() {
  const config = state.config || {};
  const sourceItems = parseHomeCarousel(config);
  const generation = ++state.homeGeneration;

  neutralizeLegacyHomeImage();

  if (
    config.homeCarouselActive === false ||
    !sourceItems.length
  ) {
    state.homeSlides = [];
    state.homeIndex = 0;
    renderHomeCarousel();
    return;
  }

  const limitedItems = sourceItems.slice(0, 12);

  const resolved = await Promise.all(
    limitedItems.map(async (item) => ({
      ...item,
      resolvedImage: await resolveImage(item.image, 2400)
    }))
  );

  if (generation !== state.homeGeneration) return;

  state.homeSlides = resolved.filter(
    (item) => item.resolvedImage
  );

  if (state.homeIndex >= state.homeSlides.length) {
    state.homeIndex = 0;
  }

  renderHomeCarousel();
}

function enhanceSettingsHelp() {
  const form = document.getElementById(
    "csv-admin-settings-form"
  );

  if (!form || form.dataset.csvDrive754 === "1") return;

  form.dataset.csvDrive754 = "1";

  const loginField = form.querySelector(
    '[name="loginBanners"]'
  )?.closest("label");

  const carouselField = form.querySelector(
    '[name="homeCarouselItems"]'
  )?.closest("label");

  [loginField, carouselField].forEach((field) => {
    if (!field || field.querySelector(".csv-drive-help")) return;

    const help = document.createElement("small");
    help.className = "csv-drive-help";
    help.innerHTML =
      '<i class="ri-google-fill"></i> ' +
      "Aceita o link público normal do Google Drive. " +
      "O sistema converte automaticamente para imagem direta.";

    field.appendChild(help);
  });
}

function applyEverything() {
  enhanceSettingsHelp();
  applyLoginBanners();
  prepareHomeCarousel();
}

function subscribe() {
  onSnapshot(
    doc(db, "configuracoes", "geral"),
    (snapshot) => {
      state.config = snapshot.exists()
        ? snapshot.data() || {}
        : {};

      applyEverything();
    },
    (error) => {
      console.warn(
        "CSV Drive Media: não foi possível ler as configurações.",
        error
      );
    }
  );
}

function bindHomeNavigation() {
  const button = document.querySelector(
    '.sidebar-nav .nav-btn[data-tab="home"]'
  );

  if (!button || button.dataset.csvCarousel754 === "1") return;

  button.dataset.csvCarousel754 = "1";
  button.addEventListener("click", () => {
    [40, 180, 500].forEach((delay) => {
      setTimeout(() => {
        ensureHomeCarouselSection();
        renderHomeCarousel();
      }, delay);
    });
  });
}

function init() {
  subscribe();
  bindHomeNavigation();
  ensureHomeCarouselSection();

  const observer = new MutationObserver(() => {
    clearTimeout(state.settingsObserverTimer);

    state.settingsObserverTimer = setTimeout(() => {
      bindHomeNavigation();
      enhanceSettingsHelp();

      if (
        state.homeSlides.length &&
        !document.getElementById(
          "csv-home-banner-carousel-section"
        )
      ) {
        ensureHomeCarouselSection();
        renderHomeCarousel();
      }
    }, 90);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.addEventListener("focus", () => {
    ensureHomeCarouselSection();
    renderHomeCarousel();
  });

  window.csvHomeCarouselRefresh = prepareHomeCarousel;

  console.log(
    `CSV Drive Media Fix ${VERSION} carregado.`
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
