import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const CSV_OFFLINE_ACCESS_VERSION = "7.9.4";
const INTERNAL_DOMAIN = "acesso.csv.app";
const LAST_SYNC_KEY = "csv_offline_last_sync";
const DATA_SIGNATURE_KEY = "csv_offline_data_signature";

const app = getApp();
const auth = getAuth(app);

let currentUser = null;
let originalLoginHandler = null;
let dataTimer = null;

function normalize(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40);
}

function internalEmail(login = "") {
  const raw = String(login || "").trim().toLowerCase();
  return raw.includes("@")
    ? raw
    : `${normalize(raw)}@${INTERNAL_DOMAIN}`;
}

function formatDateTime(value) {
  const date = new Date(Number(value || 0));

  if (Number.isNaN(date.getTime())) {
    return "ainda não registrada";
  }

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function saveLastSync() {
  if (!navigator.onLine) return;

  try {
    localStorage.setItem(
      LAST_SYNC_KEY,
      String(Date.now())
    );
  } catch (_) {}
}

function lastSyncText() {
  try {
    return formatDateTime(
      localStorage.getItem(LAST_SYNC_KEY)
    );
  } catch (_) {
    return "ainda não registrada";
  }
}

function setLoginStatus(message, kind = "") {
  const status = document.getElementById(
    "csv-login-status"
  );

  if (!status) return;

  status.className =
    `csv-login-status${kind ? ` ${kind}` : ""}`;

  status.innerHTML = message;
}

function updateSecurityNote() {
  const note = document.getElementById(
    "csv-session-security-note"
  );

  if (!note) return;

  note.innerHTML = `
    <i class="ri-shield-keyhole-line"></i>
    <span>
      Depois de um acesso online validado, este dispositivo poderá
      abrir os últimos dados salvos sem internet. Em computadores
      compartilhados, use sempre <strong>Sair do Painel</strong>.
    </span>
  `;
}

function ensureOfflineIndicator() {
  const header = document.querySelector(".top-header");
  if (!header) return null;

  let indicator = document.getElementById(
    "csv-offline-indicator"
  );

  if (indicator) return indicator;

  indicator = document.createElement("div");
  indicator.id = "csv-offline-indicator";
  indicator.className = "csv-offline-indicator";
  indicator.innerHTML = `
    <i class="ri-wifi-off-line"></i>
    <span>
      <strong>Modo offline</strong>
      <small></small>
    </span>
  `;

  const notificationCenter = document.getElementById(
    "csv-notification-center"
  );

  if (notificationCenter) {
    header.insertBefore(indicator, notificationCenter);
  } else {
    header.appendChild(indicator);
  }

  return indicator;
}

function updateOfflineIndicator() {
  const indicator = ensureOfflineIndicator();
  if (!indicator) return;

  const offline = !navigator.onLine;

  indicator.classList.toggle(
    "visible",
    offline
  );

  const small = indicator.querySelector("small");

  if (small) {
    small.textContent =
      `Dados salvos até ${lastSyncText()}`;
  }
}

function revealCachedDashboard() {
  const login = document.getElementById(
    "login-screen"
  );

  const dashboard = document.getElementById(
    "dashboard-screen"
  );

  if (login) login.style.display = "none";
  if (dashboard) dashboard.style.display = "flex";

  document.body.classList.add(
    "csv-offline-dashboard"
  );

  setLoginStatus(
    '<i class="ri-database-2-line"></i> Acesso offline liberado com os últimos dados sincronizados.',
    "is-offline"
  );

  window.setTimeout(() => {
    window.csv2EnsureBulletinExperience?.();
    window.csvBulletinFoldersRefresh?.();
    window.csvUiRefresh?.renderActive?.(true);
  }, 180);
}

async function offlineAwareLogin(event) {
  if (navigator.onLine) {
    return originalLoginHandler?.(event);
  }

  event?.preventDefault?.();

  const loginInput = document.getElementById(
    "email"
  );

  const typedLogin = String(
    loginInput?.value || ""
  ).trim();

  if (!currentUser) {
    setLoginStatus(
      '<i class="ri-wifi-off-line"></i> Este dispositivo ainda não possui uma sessão offline válida. Conecte-se à internet, entre uma vez e aguarde a sincronização.',
      "is-error"
    );
    return;
  }

  if (
    typedLogin &&
    internalEmail(typedLogin) !==
      String(currentUser.email || "").toLowerCase()
  ) {
    setLoginStatus(
      '<i class="ri-user-forbid-line"></i> O usuário informado é diferente do último acesso salvo neste dispositivo.',
      "is-error"
    );
    return;
  }

  revealCachedDashboard();
}

function bindOfflineLogin() {
  const button = document.getElementById(
    "btn-login"
  );

  const form = document.getElementById(
    "form-login"
  );

  if (!button) return;

  if (
    !originalLoginHandler ||
    originalLoginHandler === offlineAwareLogin
  ) {
    originalLoginHandler =
      window.efetuarLogin ||
      button.onclick ||
      form?.onsubmit ||
      null;
  }

  window.efetuarLogin = offlineAwareLogin;
  button.onclick = offlineAwareLogin;

  if (form) {
    form.onsubmit = offlineAwareLogin;
  }
}

function dataSignature() {
  const state = window.csvPhase2State || {};

  return JSON.stringify({
    collaborators:
      state.collaborators?.length || 0,
    users:
      state.users?.length || 0,
    bulletins:
      state.bulletins?.length || 0,
    privateBulletins:
      state.privateBulletins?.length || 0,
    profile:
      state.profile?.uid ||
      state.profile?.email ||
      ""
  });
}

function monitorDataSync() {
  if (dataTimer) {
    window.clearInterval(dataTimer);
  }

  dataTimer = window.setInterval(() => {
    if (!navigator.onLine || !currentUser) return;

    const signature = dataSignature();

    try {
      const previous =
        localStorage.getItem(
          DATA_SIGNATURE_KEY
        );

      if (
        signature !== previous &&
        signature !== "{}"
      ) {
        localStorage.setItem(
          DATA_SIGNATURE_KEY,
          signature
        );
        saveLastSync();
      }
    } catch (_) {}
  }, 3000);
}

function updateConnectionState() {
  updateOfflineIndicator();
  updateSecurityNote();
  bindOfflineLogin();

  if (navigator.onLine) {
    document.body.classList.remove(
      "csv-offline-dashboard"
    );

    saveLastSync();

    setLoginStatus(
      '<i class="ri-wifi-line"></i> Sistema conectado e pronto para sincronizar',
      "is-online"
    );
  } else if (currentUser) {
    setLoginStatus(
      `<i class="ri-database-2-line"></i> Acesso offline disponível • dados salvos até ${lastSyncText()}`,
      "is-offline"
    );
  } else {
    setLoginStatus(
      '<i class="ri-wifi-off-line"></i> Sem conexão. O acesso offline exige uma entrada online anterior neste dispositivo.',
      "is-offline"
    );
  }
}

async function init() {
  try {
    await setPersistence(
      auth,
      browserLocalPersistence
    );

    document.documentElement.dataset
      .csvAuthPersistence = "local-offline";
  } catch (error) {
    console.warn(
      "Persistência offline:",
      error
    );
  }

  onAuthStateChanged(auth, (user) => {
    currentUser = user || null;

    if (user && navigator.onLine) {
      saveLastSync();
    }

    updateConnectionState();
  });

  [80, 250, 700, 1500, 3000].forEach(
    (delay) => {
      window.setTimeout(() => {
        updateSecurityNote();
        bindOfflineLogin();
        updateOfflineIndicator();
      }, delay);
    }
  );

  window.addEventListener(
    "online",
    updateConnectionState
  );

  window.addEventListener(
    "offline",
    updateConnectionState
  );

  monitorDataSync();

  window.csvOfflineAccess = {
    version: CSV_OFFLINE_ACCESS_VERSION,
    refresh: updateConnectionState,
    lastSync: lastSyncText
  };

  console.log(
    `CSV Offline Access ${CSV_OFFLINE_ACCESS_VERSION} carregado.`
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
