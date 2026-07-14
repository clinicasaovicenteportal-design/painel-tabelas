import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const VERSION = "8.0.0";
const SETTINGS_KEY = "csv_sound_settings_v1";
const SILENT_KEY = "csv_sound_silent_session_v1";
const LOGIN_KEY = "csv_sound_login_pending_v1";
const DEADLINE_PREFIX = "csv_sound_deadlines_daily";

const auth = getAuth(getApp());
const defaults = {
  enabled: true,
  volume: 0.22,
  login: true,
  interface: true,
  notifications: true,
  deadlines: true,
  confirmations: true
};

const state = {
  settings: loadSettings(),
  context: null,
  master: null,
  panelOpen: false,
  user: null,
  profile: null,
  knownNotifications: new Set(),
  notificationsPrimed: false,
  notificationObserver: null,
  deadlineTimer: null,
  uiTimer: null,
  lastPlayedAt: 0,
  queued: "",
  unlockPending: false
};

function loadSettings() {
  try {
    return {
      ...defaults,
      ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")
    };
  } catch (_) {
    return { ...defaults };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch (_) {}
  renderUi();
}

function isSilent() {
  try {
    return sessionStorage.getItem(SILENT_KEY) === "1";
  } catch (_) {
    return false;
  }
}

function setSilent(value) {
  try {
    value
      ? sessionStorage.setItem(SILENT_KEY, "1")
      : sessionStorage.removeItem(SILENT_KEY);
  } catch (_) {}
  renderUi();
}

function supported() {
  return Boolean(window.AudioContext || window.webkitAudioContext);
}

async function ensureContext() {
  if (!supported()) return null;

  if (!state.context) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    state.context = new AudioContextClass();
    state.master = state.context.createGain();
    state.master.gain.value = state.settings.volume;
    state.master.connect(state.context.destination);
  }

  if (state.context.state === "suspended") {
    try {
      await state.context.resume();
    } catch (_) {}
  }

  if (state.queued && state.context.state === "running") {
    const queued = state.queued;
    state.queued = "";
    setTimeout(() => play(queued), 30);
  }

  return state.context;
}

function category(name) {
  if (["click", "open", "close"].includes(name)) return "interface";
  if (["login", "unlock"].includes(name)) return "login";
  if (["deadline", "urgent", "overdue"].includes(name)) return "deadlines";
  if (["success", "complete", "saved"].includes(name)) return "confirmations";
  return "notifications";
}

function mediaPlaying() {
  const audio = [...document.querySelectorAll("audio")].some(
    (item) => !item.paused && !item.ended && item.currentTime > 0
  );
  return audio || Boolean(window.speechSynthesis?.speaking);
}

function canPlay(name) {
  const key = category(name);
  return Boolean(
    state.settings.enabled &&
    state.settings[key] !== false &&
    !isSilent() &&
    !document.body.classList.contains("csv-device-locked")
  );
}

function effectiveGain(multiplier = 1) {
  return Math.max(
    0.0001,
    multiplier * (mediaPlaying() ? 0.28 : 1)
  );
}

function tone(frequency, start, duration, type = "sine", volume = 0.13) {
  const ctx = state.context;
  if (!ctx || !state.master || ctx.state !== "running") return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const begin = ctx.currentTime + start;
  const end = begin + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, begin);
  gain.gain.setValueAtTime(0.0001, begin);
  gain.gain.exponentialRampToValueAtTime(
    effectiveGain(volume),
    begin + Math.min(0.025, duration / 3)
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gain);
  gain.connect(state.master);
  oscillator.start(begin);
  oscillator.stop(end + 0.03);
}

function noise(start = 0, duration = 0.38, volume = 0.03) {
  const ctx = state.context;
  if (!ctx || !state.master || ctx.state !== "running") return;

  const size = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < size; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / size);
  }

  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const begin = ctx.currentTime + start;

  source.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.value = 1700;
  filter.Q.value = 0.7;
  gain.gain.setValueAtTime(0.0001, begin);
  gain.gain.exponentialRampToValueAtTime(effectiveGain(volume), begin + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, begin + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(state.master);
  source.start(begin);
  source.stop(begin + duration);
}

function pattern(name) {
  const note = (freq, start, duration, type = "sine", volume = 0.13) =>
    tone(freq, start, duration, type, volume);

  if (name === "click") {
    note(660, 0, 0.055, "sine", 0.10);
    note(520, 0.035, 0.07, "sine", 0.07);
    return;
  }

  if (name === "login") {
    noise();
    note(523.25, 0.09, 0.26, "sine", 0.15);
    note(659.25, 0.22, 0.30, "sine", 0.14);
    note(783.99, 0.37, 0.42, "sine", 0.12);
    note(1046.5, 0.40, 0.28, "triangle", 0.025);
    return;
  }

  if (name === "unlock") {
    note(493.88, 0, 0.12);
    note(659.25, 0.10, 0.18);
    note(783.99, 0.20, 0.25);
    return;
  }

  if (name === "deadline") {
    note(440, 0, 0.18, "triangle", 0.14);
    note(554.37, 0.19, 0.22, "triangle", 0.14);
    return;
  }

  if (["urgent", "overdue"].includes(name)) {
    note(329.63, 0, 0.14, "triangle", 0.15);
    note(392, 0.16, 0.14, "triangle", 0.15);
    note(329.63, 0.34, 0.24, "triangle", 0.15);
    return;
  }

  if (name === "success") {
    note(523.25, 0, 0.12);
    note(659.25, 0.09, 0.15);
    note(783.99, 0.19, 0.22);
    return;
  }

  if (name === "response") {
    note(587.33, 0, 0.16);
    note(783.99, 0.12, 0.24);
    return;
  }

  if (name === "update") {
    note(440, 0, 0.12);
    note(554.37, 0.09, 0.14);
    note(659.25, 0.18, 0.22);
    return;
  }

  note(783.99, 0, 0.12);
  note(1046.5, 0.09, 0.22, "triangle", 0.11);
}

async function play(name = "notification", { force = false } = {}) {
  if (!force && !canPlay(name)) return false;
  if (!force && Date.now() - state.lastPlayedAt < 120) return false;

  state.lastPlayedAt = Date.now();
  const ctx = await ensureContext();
  if (!ctx || ctx.state !== "running") {
    state.queued = name;
    return false;
  }

  state.master.gain.setTargetAtTime(
    Math.max(0.0001, state.settings.volume),
    ctx.currentTime,
    0.02
  );
  pattern(name);
  pulseButton();
  return true;
}

function pulseButton() {
  const button = document.getElementById("csv-sound-button");
  if (!button) return;
  button.classList.remove("csv-sound-playing");
  void button.offsetWidth;
  button.classList.add("csv-sound-playing");
  setTimeout(() => button.classList.remove("csv-sound-playing"), 650);
}

function normalize(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function classifyNotification(button) {
  const text = normalize(button.textContent);
  const classes = button.querySelector(".csv-notification-icon")?.className || "";

  if (/vencid|atrasad|prazo expirado/.test(text)) return "urgent";
  if (/vence hoje|vence amanha|prazo|leitura obrigatoria/.test(text)) return "deadline";
  if (classes.includes("response") || /respondeu|resposta da gestao/.test(text)) return "response";
  if (classes.includes("update") || /atualizacao/.test(text)) return "update";
  if (classes.includes("campaign") || /obrigatorio|urgente/.test(text)) return "urgent";
  return "notification";
}

function priority(name) {
  return { urgent: 60, deadline: 50, response: 40, update: 30, notification: 20 }[name] || 10;
}

function scanNotifications() {
  const list = document.getElementById("csv-notification-list");
  if (!list) {
    state.notificationsPrimed = false;
    state.knownNotifications.clear();
    return;
  }

  const buttons = [...list.querySelectorAll("[data-notification-id]")];
  const ids = buttons.map((button) => button.dataset.notificationId);

  if (!state.notificationsPrimed) {
    ids.forEach((id) => state.knownNotifications.add(id));
    state.notificationsPrimed = true;
    return;
  }

  const added = buttons.filter(
    (button) =>
      button.classList.contains("unread") &&
      !state.knownNotifications.has(button.dataset.notificationId)
  );

  ids.forEach((id) => state.knownNotifications.add(id));
  if (!added.length) return;

  const sounds = added.map(classifyNotification).sort((a, b) => priority(b) - priority(a));
  play(sounds[0] || "notification");
}

function observeNotifications() {
  const list = document.getElementById("csv-notification-list");
  if (!list || list.dataset.csvSoundObserved === VERSION) return;

  list.dataset.csvSoundObserved = VERSION;
  state.notificationObserver?.disconnect?.();
  state.notificationsPrimed = false;
  state.knownNotifications.clear();

  state.notificationObserver = new MutationObserver(() => {
    clearTimeout(state.notificationTimer);
    state.notificationTimer = setTimeout(scanNotifications, 80);
  });

  state.notificationObserver.observe(list, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"]
  });

  scanNotifications();
}

function currentProfile() {
  return window.csvPhase2State?.profile || state.profile || null;
}

function arrayNormalized(value) {
  return (Array.isArray(value) ? value : String(value || "").split(","))
    .map(normalize)
    .filter(Boolean);
}

function bulletinRead(item, profile) {
  const name = normalize(profile?.name || "");
  const uid = String(profile?.uid || state.user?.uid || "");

  const legacy = Array.isArray(item?.data?.leituras) && item.data.leituras.some(
    (entry) => normalize(String(entry || "").split(" (")[0].trim()) === name
  );
  if (legacy) return true;

  return [
    ...(window.csvPhase2State?.readings || []),
    ...(window.csvBulletinIntelligence?.readings || [])
  ].some((entry) => {
    const data = entry?.data || {};
    const sameBulletin = String(data.boletimId || data.bulletinId || "") === String(item?.id || "");
    const samePerson =
      (uid && String(data.uid || data.userUid || data.colaboradorUid || "") === uid) ||
      normalize(data.nome || data.colaboradorNome || "") === name;
    return sameBulletin && samePerson;
  });
}

function audienceAllows(item, profile) {
  const data = item?.data || {};
  const collectionName = item?.collectionName || "boletins";

  if (collectionName === "boletins-privados") {
    const targetUid = String(data.destinatarioUid || "");
    const targetName = normalize(data["Para qual Colaborador?"] || data.publicoPessoas?.[0] || "");
    return Boolean(
      (targetUid && targetUid === String(profile?.uid || state.user?.uid || "")) ||
      (targetName && targetName === normalize(profile?.name || ""))
    );
  }

  if (data.publicoTipo === "todos") return true;
  if (data.publicoTipo === "pessoas") {
    return arrayNormalized(data.publicoPessoas).includes(normalize(profile?.name || ""));
  }

  const sectors = arrayNormalized(data.publicoSetores || data["Para quais Setores?"])
    .filter((sector) => !sector.includes("geral"));

  if (data.publicoTipo === "setores" || sectors.length) {
    return sectors.includes(normalize(profile?.sector || ""));
  }

  return true;
}

function deadlineDate(item) {
  const raw = item?.data?.prazoLeitura || item?.data?.["Prazo para Leitura"] || "";
  if (!raw) return null;
  if (typeof raw?.toDate === "function") return raw.toDate();

  const text = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return new Date(`${text}T23:59:59`);

  const brazil = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brazil) {
    return new Date(Number(brazil[3]), Number(brazil[2]) - 1, Number(brazil[1]), 23, 59, 59, 999);
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function dailyDeadlineState() {
  const key = `${DEADLINE_PREFIX}_${state.user?.uid || "anon"}_${dayKey()}`;
  try {
    return { key, ids: new Set(JSON.parse(localStorage.getItem(key) || "[]")) };
  } catch (_) {
    return { key, ids: new Set() };
  }
}

function bulletinTitle(item) {
  const data = item?.data || {};
  return String(
    data["Título do Informativo"] ||
    data["Título do Documento"] ||
    data.titulo ||
    "Informativo"
  ).trim();
}

function scanDeadlines() {
  const profile = currentProfile();
  const center = window.csvNotificationCenter;

  if (
    !state.user ||
    !profile ||
    profile.admin === true ||
    window.csvPhase2State?.isAdmin === true ||
    typeof center?.push !== "function"
  ) return;

  const items = [
    ...(window.csvPhase2State?.bulletins || []),
    ...(window.csvPhase2State?.privateBulletins || [])
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daily = dailyDeadlineState();
  let strongest = "";
  let changed = false;

  items.forEach((item) => {
    if (!audienceAllows(item, profile) || bulletinRead(item, profile)) return;

    const deadline = deadlineDate(item);
    if (!deadline) return;

    const deadlineDay = new Date(deadline);
    deadlineDay.setHours(0, 0, 0, 0);
    const diffDays = Math.round((deadlineDay.getTime() - today.getTime()) / 86400000);

    let status = "";
    let title = "";
    let message = "";
    let sound = "";
    let level = 0;

    if (diffDays < 0) {
      status = "overdue";
      title = "Prazo de leitura vencido";
      message = `${bulletinTitle(item)} • venceu em ${deadline.toLocaleDateString("pt-BR")}`;
      sound = "urgent";
      level = 60;
    } else if (diffDays === 0) {
      status = "today";
      title = "Prazo de leitura vence hoje";
      message = `${bulletinTitle(item)} • conclua a leitura até hoje.`;
      sound = "deadline";
      level = 50;
    } else if (diffDays === 1) {
      status = "tomorrow";
      title = "Prazo de leitura vence amanhã";
      message = `${bulletinTitle(item)} • organize sua leitura com antecedência.`;
      sound = "notification";
      level = 20;
    }

    if (!status) return;

    const collectionName = item.collectionName || "boletins";
    const id = `deadline:${collectionName}:${item.id}:${dayKey(deadline)}:${status}`;
    const already = daily.ids.has(id);

    if (already) {
      state.knownNotifications.add(id);
    } else {
      daily.ids.add(id);
      changed = true;
      if (level > priority(strongest)) strongest = sound;
    }

    center.push({
      id,
      type: "deadline",
      icon: status === "overdue" ? "ri-alarm-warning-line" : "ri-timer-flash-line",
      title,
      message,
      time: new Date(),
      tab: "boletins",
      priority: status === "overdue" ? 16 : status === "today" ? 14 : 11
    });
  });

  if (changed) {
    try {
      localStorage.setItem(daily.key, JSON.stringify([...daily.ids]));
    } catch (_) {}
    setTimeout(() => play(strongest || "notification"), 220);
  }
}

function iconClass() {
  return !state.settings.enabled || isSilent()
    ? "ri-volume-mute-line"
    : "ri-volume-up-line";
}

function panelMarkup() {
  const categories = [
    ["login", "ri-login-circle-line", "Entrada", "Login e desbloqueio"],
    ["interface", "ri-cursor-line", "Interface", "Navegação e botões"],
    ["notifications", "ri-notification-3-line", "Notificações", "Sino, respostas e novidades"],
    ["deadlines", "ri-timer-flash-line", "Prazos", "Vencimentos e alertas"],
    ["confirmations", "ri-checkbox-circle-line", "Confirmações", "Ações concluídas"]
  ];

  return `
    <button type="button" id="csv-sound-button" class="csv-sound-button"
      aria-label="Configurar sons do portal" aria-expanded="${state.panelOpen}"
      title="Central de Sons CSV">
      <i class="${iconClass()}"></i>
      <span class="csv-sound-status ${state.settings.enabled && !isSilent() ? "active" : ""}"></span>
    </button>

    <section id="csv-sound-panel" class="csv-sound-panel ${state.panelOpen ? "open" : ""}"
      aria-hidden="${state.panelOpen ? "false" : "true"}">
      <header>
        <div>
          <span><i class="ri-music-2-line"></i> Identidade sonora</span>
          <strong>Central de Sons CSV</strong>
          <small>Sons suaves, gerados no próprio dispositivo.</small>
        </div>
        <button type="button" data-sound-close aria-label="Fechar"><i class="ri-close-line"></i></button>
      </header>

      ${supported() ? `
        <div class="csv-sound-master">
          <div><strong>Sons do portal</strong><span>Ative ou silencie todos os efeitos.</span></div>
          <label class="csv-sound-switch">
            <input type="checkbox" data-sound-setting="enabled" ${state.settings.enabled ? "checked" : ""}>
            <span></span>
          </label>
        </div>

        <label class="csv-sound-volume">
          <span><strong>Volume</strong><b id="csv-sound-volume-value">${Math.round(state.settings.volume * 100)}%</b></span>
          <input type="range" min="0" max="60" step="1"
            value="${Math.round(state.settings.volume * 100)}" data-sound-volume>
        </label>

        <div class="csv-sound-categories">
          ${categories.map(([key, icon, title, description]) => `
            <label>
              <i class="${icon}"></i>
              <span><strong>${title}</strong><small>${description}</small></span>
              <input type="checkbox" data-sound-setting="${key}" ${state.settings[key] ? "checked" : ""}>
            </label>
          `).join("")}
        </div>

        <div class="csv-sound-tests">
          <span>Testar assinatura sonora</span>
          <div>
            <button type="button" data-sound-test="login"><i class="ri-login-circle-line"></i> Entrada</button>
            <button type="button" data-sound-test="notification"><i class="ri-notification-3-line"></i> Notificação</button>
            <button type="button" data-sound-test="deadline"><i class="ri-timer-line"></i> Prazo</button>
            <button type="button" data-sound-test="success"><i class="ri-check-line"></i> Sucesso</button>
          </div>
        </div>

        <button type="button" class="csv-sound-silent-session ${isSilent() ? "active" : ""}"
          data-sound-silent-session>
          <i class="${isSilent() ? "ri-volume-up-line" : "ri-moon-clear-line"}"></i>
          ${isSilent() ? "Reativar sons nesta sessão" : "Modo silencioso nesta sessão"}
        </button>

        <p class="csv-sound-note">
          O volume diminui automaticamente enquanto houver áudio ou leitura em voz alta.
        </p>
      ` : `
        <div class="csv-sound-unsupported">
          <i class="ri-volume-mute-line"></i>
          <strong>Sons indisponíveis</strong>
          <span>Este navegador não oferece suporte aos efeitos do portal.</span>
        </div>
      `}
    </section>
  `;
}

function renderUi() {
  const header = document.querySelector(".top-header");
  if (!header) return;

  let root = document.getElementById("csv-sound-center");
  if (!root) {
    root = document.createElement("div");
    root.id = "csv-sound-center";
    root.className = "csv-sound-center";

    const notification = document.getElementById("csv-notification-center");
    notification?.parentElement === header
      ? header.insertBefore(root, notification)
      : header.appendChild(root);
  }

  const signature = JSON.stringify({ settings: state.settings, silent: isSilent(), open: state.panelOpen });
  if (root.dataset.signature === signature) return;
  root.dataset.signature = signature;
  root.innerHTML = panelMarkup();
  bindUi(root);
}

function bindUi(root) {
  root.querySelector("#csv-sound-button")?.addEventListener("click", async (event) => {
    event.stopPropagation();
    await ensureContext();
    state.panelOpen = !state.panelOpen;
    renderUi();
    if (state.panelOpen) play("click");
  });

  root.querySelector("[data-sound-close]")?.addEventListener("click", () => {
    state.panelOpen = false;
    renderUi();
  });

  root.querySelectorAll("[data-sound-setting]").forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.dataset.soundSetting;
      state.settings[key] = input.checked;
      saveSettings();
    });
  });

  const volume = root.querySelector("[data-sound-volume]");
  volume?.addEventListener("input", () => {
    const value = Math.max(0, Math.min(60, Number(volume.value || 0)));
    state.settings.volume = value / 100;
    const display = root.querySelector("#csv-sound-volume-value");
    if (display) display.textContent = `${value}%`;
    if (state.context && state.master) {
      state.master.gain.setTargetAtTime(Math.max(0.0001, state.settings.volume), state.context.currentTime, 0.02);
    }
  });
  volume?.addEventListener("change", () => {
    saveSettings();
    play("notification", { force: true });
  });

  root.querySelectorAll("[data-sound-test]").forEach((button) => {
    button.addEventListener("click", async () => {
      await ensureContext();
      play(button.dataset.soundTest, { force: true });
    });
  });

  root.querySelector("[data-sound-silent-session]")?.addEventListener("click", () => {
    const next = !isSilent();
    setSilent(next);
    if (!next) play("unlock", { force: true });
  });
}

function checkUnlock() {
  if (!state.unlockPending) return;
  const dashboard = document.getElementById("dashboard-screen");
  const visible = dashboard && getComputedStyle(dashboard).display !== "none" &&
    !document.body.classList.contains("csv-device-locked");

  if (visible) {
    state.unlockPending = false;
    play("unlock");
  } else {
    setTimeout(checkUnlock, 450);
  }
}

function bindClicks() {
  document.addEventListener("pointerdown", async (event) => {
    await ensureContext();
    const target = event.target.closest("button, a, [role='button'], .shortcut-card");
    if (!target || target.closest("#csv-sound-center")) return;

    if (target.matches("#btn-login") || target.closest("#btn-login")) {
      try { sessionStorage.setItem(LOGIN_KEY, "1"); } catch (_) {}
      return;
    }

    if (target.matches("#csv-device-unlock-primary") || target.closest("#csv-device-unlock-primary")) {
      state.unlockPending = true;
      setTimeout(checkUnlock, 500);
      return;
    }

    if (target.matches("[data-update-now]") || target.closest("[data-update-now]")) {
      play("update");
      return;
    }

    const explicit = target.dataset.csvSound || target.closest("[data-csv-sound]")?.dataset.csvSound;
    if (explicit) {
      play(explicit);
      return;
    }

    if (
      target.matches(
        ".nav-btn:not(#btn-logout), .csv-home-primary-action, .csv-home-secondary-action, " +
        ".shortcut-card, .csv2-button, .csv-notification-item, #csv-notification-bell"
      ) ||
      target.closest(
        ".nav-btn:not(#btn-logout), .csv-home-primary-action, .csv-home-secondary-action, " +
        ".shortcut-card, .csv2-button, .csv-notification-item, #csv-notification-bell"
      )
    ) play("click");
  }, true);

  document.addEventListener("click", (event) => {
    const root = document.getElementById("csv-sound-center");
    if (state.panelOpen && root && !root.contains(event.target)) {
      state.panelOpen = false;
      renderUi();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.panelOpen) {
      state.panelOpen = false;
      renderUi();
    }
  });
}

function handleLogin(user) {
  let pending = false;
  try {
    pending = sessionStorage.getItem(LOGIN_KEY) === "1";
    sessionStorage.removeItem(LOGIN_KEY);
  } catch (_) {}
  if (pending) setTimeout(() => play("login"), 430);
}

function loadProfile(user) {
  setTimeout(() => {
    state.profile = window.csvPhase2State?.profile || {
      uid: user.uid,
      name: user.email?.split("@")[0] || "Colaborador",
      sector: "Geral",
      admin: String(user.email || "").toLowerCase().includes("@clinica")
    };
    scanDeadlines();
  }, 900);
}

function startUser(user) {
  state.user = user;
  handleLogin(user);
  loadProfile(user);

  [500, 1400, 2800, 5000].forEach((delay) => {
    setTimeout(() => {
      renderUi();
      observeNotifications();
      scanDeadlines();
    }, delay);
  });

  clearInterval(state.deadlineTimer);
  state.deadlineTimer = setInterval(scanDeadlines, 60000);
}

function resetUser() {
  clearInterval(state.deadlineTimer);
  state.deadlineTimer = null;
  state.notificationObserver?.disconnect?.();
  state.notificationObserver = null;
  state.notificationsPrimed = false;
  state.knownNotifications.clear();
  state.user = null;
  state.profile = null;
}

function init() {
  renderUi();
  bindClicks();

  onAuthStateChanged(auth, (user) => {
    user ? startUser(user) : resetUser();
  });

  if (document.documentElement.dataset.csvSoundMutation !== VERSION) {
    document.documentElement.dataset.csvSoundMutation = VERSION;
    new MutationObserver(() => {
      clearTimeout(state.uiTimer);
      state.uiTimer = setTimeout(() => {
        renderUi();
        observeNotifications();
      }, 100);
    }).observe(document.body, { childList: true, subtree: true });
  }

  window.csvSound = {
    version: VERSION,
    play,
    open: () => {
      state.panelOpen = true;
      renderUi();
    },
    close: () => {
      state.panelOpen = false;
      renderUi();
    },
    test: (name) => play(name, { force: true }),
    mute: () => {
      state.settings.enabled = false;
      saveSettings();
    },
    unmute: () => {
      state.settings.enabled = true;
      saveSettings();
      play("unlock", { force: true });
    },
    settings: () => ({ ...state.settings, silentSession: isSilent() }),
    set: (key, value) => {
      if (key === "silentSession") return setSilent(Boolean(value));
      if (key in state.settings) {
        state.settings[key] = value;
        saveSettings();
      }
    },
    refresh: () => {
      renderUi();
      observeNotifications();
      scanDeadlines();
    }
  };

  console.log(`CSV Sound Center ${VERSION} carregada.`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
