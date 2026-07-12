import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const VERSION = "7.5.3";
const app = getApp();
const db = getFirestore(app);

const state = {
  config: null,
  bannerIndex: 0,
  bannerTimer: null,
  applyTimer: null,
  generation: 0
};

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

function imageCandidates(raw = "", width = 1920) {
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

function loadImage(url, timeout = 9000) {
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

async function resolveImage(raw = "", width = 1920) {
  const candidates = imageCandidates(raw, width);

  for (const candidate of candidates) {
    try {
      return await loadImage(candidate);
    } catch (_) {
      // Tenta automaticamente o próximo formato do Drive.
    }
  }

  return "";
}

function parseLoginBanners(raw = "") {
  return String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [image = "", title = "", text = ""] = line
        .split("|")
        .map((part) => part.trim());

      return { image, title, text };
    })
    .filter((item) => item.image);
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
  const currentGeneration = ++state.generation;
  const resolved = await resolveImage(selected.image, 2200);

  if (currentGeneration !== state.generation) return;

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

  if (title && selected.title) {
    title.textContent = selected.title;
  }

  if (text && selected.text) {
    text.textContent = selected.text;
  }

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
          `<button type="button"
            class="${dotIndex === index % banners.length ? "active" : ""}"
            data-index="${dotIndex}"
            aria-label="Exibir anúncio ${dotIndex + 1}">
          </button>`
      )
      .join("");

    dots.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        state.bannerIndex = Number(button.dataset.index || 0);
        applyLoginBannerAt(state.bannerIndex);
      });
    });
  } else {
    dots?.remove();
  }
}

function applyLoginBanners() {
  clearInterval(state.bannerTimer);
  state.bannerTimer = null;
  state.bannerIndex = 0;

  const banners = parseLoginBanners(
    state.config?.loginBanners || ""
  );

  applyLoginBannerAt(0);

  if (banners.length <= 1) return;

  const seconds = Math.max(
    4,
    Number(state.config?.loginBannerInterval || 8)
  );

  state.bannerTimer = setInterval(() => {
    state.bannerIndex =
      (state.bannerIndex + 1) % banners.length;

    applyLoginBannerAt(state.bannerIndex);
  }, seconds * 1000);
}

async function applyHomeAnnouncement() {
  const config = state.config || {};
  const area = document.getElementById("banner-area");

  if (!area) return;

  if (
    config.homeAnnouncementActive === false ||
    !config.homeAnnouncementImage
  ) {
    area.classList.remove(
      "csv-drive-home-active",
      "csv-drive-home-error"
    );
    area.style.removeProperty("--csv-drive-home-image");
    return;
  }

  const resolved = await resolveImage(
    config.homeAnnouncementImage,
    2200
  );

  if (!resolved) {
    area.classList.add("csv-drive-home-error");
    return;
  }

  area.classList.remove("csv-drive-home-error");
  area.classList.add(
    "has-admin-image",
    "csv-drive-home-active"
  );

  area.style.setProperty(
    "--csv-drive-home-image",
    `url("${resolved.replace(/"/g, "%22")}")`
  );
}

function enhanceSettingsHelp() {
  const form = document.getElementById(
    "csv-admin-settings-form"
  );

  if (!form || form.dataset.csvDrive753 === "1") return;

  form.dataset.csvDrive753 = "1";

  const loginField = form.querySelector(
    '[name="loginBanners"]'
  )?.closest("label");

  const homeField = form.querySelector(
    '[name="homeAnnouncementImage"]'
  )?.closest("label");

  [loginField, homeField].forEach((field) => {
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
  clearTimeout(state.applyTimer);

  state.applyTimer = setTimeout(() => {
    enhanceSettingsHelp();
    applyLoginBanners();
    applyHomeAnnouncement();
  }, 40);
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

function init() {
  subscribe();

  const observer = new MutationObserver(() => {
    enhanceSettingsHelp();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.addEventListener("focus", applyEverything);

  console.log(
    `CSV Drive Media Fix ${VERSION} carregado.`
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
