import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const VERSION = "7.9.5";
const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const state = {
  user: null,
  profile: null,
  items: new Map(),
  custom: new Map(),
  seen: new Set(),
  knownBenefits: {},
  benefitReady: false,
  unsubscribers: [],
  dataTimer: null,
  updateTimer: null,
  updateInfo: null,
  panelOpen: false
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
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ts(value) {
  return toDate(value)?.getTime() || 0;
}

function newest(data = {}) {
  return Math.max(
    ts(data.updatedAt),
    ts(data.atualizadoEm),
    ts(data.respondidoEm),
    ts(data.createdAt),
    ts(data.criadoEm),
    ts(data.dataPublicacao),
    ts(data["Data de Publicação"])
  );
}

function relativeTime(value) {
  const date = toDate(value);
  if (!date) return "Agora";
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return "Agora";
  if (diff < 3600000) return `Há ${Math.max(1, Math.floor(diff / 60000))} min`;
  if (diff < 86400000) return `Há ${Math.max(1, Math.floor(diff / 3600000))} h`;
  if (diff < 604800000) return `Há ${Math.max(1, Math.floor(diff / 86400000))} dia(s)`;
  return date.toLocaleDateString("pt-BR");
}

function compareVersions(a = "0", b = "0") {
  const left = String(a).split(".").map((value) => Number(value) || 0);
  const right = String(b).split(".").map((value) => Number(value) || 0);
  const size = Math.max(left.length, right.length);

  for (let index = 0; index < size; index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff) return diff;
  }

  return 0;
}

function storageKey(name) {
  return `csv_notifications_${name}_${state.user?.uid || "anonymous"}`;
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "") || fallback;
  } catch (_) {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

function loadStorage() {
  state.seen = new Set(readJson(storageKey("seen"), []));
  state.knownBenefits = readJson(storageKey("benefits"), {});
  state.benefitReady = localStorage.getItem(storageKey("benefits_ready")) === "1";
}

function saveSeen() {
  writeJson(storageKey("seen"), [...state.seen].slice(-350));
}

function saveBenefits() {
  writeJson(storageKey("benefits"), state.knownBenefits);
  localStorage.setItem(storageKey("benefits_ready"), "1");
}

function add(item) {
  if (!item?.id || !item?.title) return;
  state.items.set(item.id, {
    type: "info",
    icon: "ri-notification-3-line",
    message: "",
    priority: 0,
    time: new Date(),
    tab: "",
    action: "",
    ...item
  });
}

function clearPrefix(prefix) {
  [...state.items.keys()].forEach((id) => {
    if (id.startsWith(prefix)) state.items.delete(id);
  });
}

function allItems() {
  return [...state.items.values(), ...state.custom.values()].sort((a, b) => {
    const priority = Number(b.priority || 0) - Number(a.priority || 0);
    return priority || ts(b.time) - ts(a.time);
  });
}

function currentProfile() {
  const live = window.csvPhase2State?.profile;
  return live
    ? {
        ...state.profile,
        ...live,
        admin: window.csvPhase2State?.isAdmin === true || state.profile?.admin === true
      }
    : state.profile;
}

function audienceAllows(data = {}) {
  const profile = currentProfile();
  if (profile?.admin) return true;
  if (data.active === false) return false;
  if (String(data.audienceType || "todos") === "todos") return true;

  const sectors = Array.isArray(data.sectors) ? data.sectors : [];
  return sectors.map(normalize).includes(normalize(profile?.sector));
}

async function loadProfile(user) {
  const snapshot = await getDoc(doc(db, "usuarios", user.uid));
  const data = snapshot.exists() ? snapshot.data() || {} : {};
  return {
    uid: user.uid,
    name: data.nome || user.email?.split("@")[0] || "Colaborador",
    sector: data.setor || "Geral",
    admin: data.admin === true || String(user.email || "").toLowerCase().includes("@clinica")
  };
}

function bulletinTitle(item) {
  const data = item?.data || {};
  return String(
    data["Título do Informativo"] ||
    data["Título do Documento"] ||
    data.titulo ||
    "Novo informativo"
  );
}

function bulletinRead(item) {
  const name = normalize(currentProfile()?.name || "");
  const readings = Array.isArray(item?.data?.leituras) ? item.data.leituras : [];

  if (readings.some((entry) => normalize(String(entry).split(" (")[0]) === name)) {
    return true;
  }

  return (window.csvBulletinIntelligence?.readings || []).some((entry) => {
    const data = entry?.data || {};
    return data.bulletinId === item?.id && normalize(data.nome || "") === name;
  });
}

function refreshBulletins() {
  clearPrefix("bulletin:");
  const phase = window.csvPhase2State || {};
  const items = [
    ...(Array.isArray(phase.bulletins) ? phase.bulletins : []),
    ...(Array.isArray(phase.privateBulletins) ? phase.privateBulletins : [])
  ];
  const dedupe = new Set();

  items.forEach((item) => {
    if (!item?.id || bulletinRead(item)) return;
    const collectionName = item.collectionName || "boletins";
    const key = `${collectionName}:${item.id}`;
    if (dedupe.has(key)) return;
    dedupe.add(key);

    const data = item.data || {};
    add({
      id: `bulletin:${key}:${newest(data) || 0}`,
      type: "bulletin",
      icon: "ri-newspaper-line",
      title: bulletinTitle(item),
      message: String(data.descricao || data.resumo || "Há um informativo aguardando sua leitura."),
      time: data.atualizadoEm || data.updatedAt || data.criadoEm || data.createdAt || new Date(),
      tab: "boletins",
      priority: 4
    });
  });
}

function listenFeedback() {
  const ref = query(
    collection(db, "feedback-plataforma"),
    where("uid", "==", state.user.uid)
  );

  state.unsubscribers.push(onSnapshot(ref, (snapshot) => {
    clearPrefix("feedback-response:");

    snapshot.docs.forEach((entry) => {
      const data = entry.data() || {};
      const answer = String(data.respostaAdmin || "").trim();
      if (!answer || data.respostaVisualizada === true) return;

      add({
        id: `feedback-response:${entry.id}:${ts(data.respondidoEm) || ts(data.atualizadoEm) || 0}`,
        type: "response",
        icon: "ri-reply-line",
        title: "A gestão respondeu sua mensagem",
        message: answer,
        time: data.respondidoEm || data.atualizadoEm || new Date(),
        tab: "opinioes",
        priority: 8
      });
    });

    render();
  }, (error) => console.warn("Notificações de respostas:", error)));
}

function listenBenefits() {
  state.unsubscribers.push(onSnapshot(collection(db, "beneficios"), (snapshot) => {
    clearPrefix("benefit:");
    const next = { ...state.knownBenefits };

    snapshot.docs.forEach((entry) => {
      const data = entry.data() || {};
      if (!audienceAllows(data)) return;

      const version = String(newest(data) || data.versionId || data.validUntil || "0");
      const previous = state.knownBenefits[entry.id];
      const isNew = previous === undefined;
      const isUpdated = previous !== undefined && previous !== version;

      if (state.benefitReady && (isNew || isUpdated)) {
        add({
          id: `benefit:${entry.id}:${version}`,
          type: "benefit",
          icon: "ri-gift-2-line",
          title: isNew ? "Novo benefício disponível" : "Benefício atualizado",
          message: String(data.title || data.discount || data.partner || "Confira a novidade no Clube de Benefícios."),
          time: data.updatedAt || data.createdAt || new Date(),
          tab: "beneficios",
          priority: 3
        });
      }

      next[entry.id] = version;
    });

    state.knownBenefits = next;
    state.benefitReady = true;
    saveBenefits();
    render();
  }, (error) => console.warn("Notificações de benefícios:", error)));
}

function campaignResponseId(versionId, uid) {
  return `${String(versionId || "current").replace(/[^a-zA-Z0-9_-]/g, "_")}_${uid}`;
}

function listenCampaign() {
  state.unsubscribers.push(onSnapshot(
    doc(db, "configuracoes", "campanha-acesso"),
    async (snapshot) => {
      clearPrefix("campaign:");
      if (!snapshot.exists()) return render();

      const data = snapshot.data() || {};
      if (!data.active || !audienceAllows(data)) return render();

      const versionId = String(data.versionId || "current");
      try {
        const response = await getDoc(doc(
          db,
          "campanha-acesso-respostas",
          campaignResponseId(versionId, state.user.uid)
        ));

        if (response.exists() && response.data()?.completed === true) return render();
      } catch (_) {}

      add({
        id: `campaign:${versionId}`,
        type: "campaign",
        icon: "ri-megaphone-line",
        title: String(data.title || "Comunicado obrigatório"),
        message: String(data.description || "Há um material institucional aguardando sua confirmação."),
        time: data.updatedAt || new Date(),
        action: "campaign",
        priority: 10
      });

      render();
    },
    (error) => console.warn("Notificações de campanha:", error)
  ));
}

async function checkUpdate() {
  try {
    const response = await fetch(`./version.json?check=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;

    const remote = await response.json();
    const remoteVersion = String(remote.version || "0");
    clearPrefix("update:");

    if (compareVersions(remoteVersion, VERSION) > 0) {
      state.updateInfo = {
        version: remoteVersion,
        message: String(remote.message || "Foram adicionadas melhorias e correções ao portal.")
      };

      add({
        id: `update:${remoteVersion}`,
        type: "update",
        icon: "ri-refresh-line",
        title: "Nova atualização disponível",
        message: state.updateInfo.message,
        time: remote.publishedAt || new Date(),
        action: "update",
        priority: 20
      });

      showUpdateToast();
    } else {
      state.updateInfo = null;
      document.getElementById("csv-update-toast")?.remove();
    }

    render();
  } catch (error) {
    console.warn("Verificação de atualização:", error);
  }
}

function ensureUi() {
  const header = document.querySelector(".top-header");
  if (!header) return false;
  if (document.getElementById("csv-notification-center")) return true;

  const root = document.createElement("div");
  root.id = "csv-notification-center";
  root.className = "csv-notification-center";
  root.innerHTML = `
    <button type="button" id="csv-notification-bell" class="csv-notification-bell" aria-label="Abrir notificações" aria-expanded="false">
      <i class="ri-notification-3-line"></i>
      <span id="csv-notification-badge"></span>
    </button>

    <section id="csv-notification-panel" class="csv-notification-panel" aria-hidden="true">
      <header>
        <div>
          <span>Central de notificações</span>
          <strong>Novidades do portal</strong>
        </div>
        <button type="button" id="csv-notification-close" aria-label="Fechar"><i class="ri-close-line"></i></button>
      </header>
      <div id="csv-notification-list" class="csv-notification-list"></div>
      <footer>
        <button type="button" id="csv-notification-read-all"><i class="ri-check-double-line"></i> Marcar todas como lidas</button>
      </footer>
    </section>
  `;

  header.appendChild(root);

  root.querySelector("#csv-notification-bell")?.addEventListener("click", (event) => {
    event.stopPropagation();
    state.panelOpen ? closePanel() : openPanel();
  });
  root.querySelector("#csv-notification-close")?.addEventListener("click", closePanel);
  root.querySelector("#csv-notification-read-all")?.addEventListener("click", () => {
    allItems().forEach((item) => state.seen.add(item.id));
    saveSeen();
    render();
  });
  document.addEventListener("click", (event) => {
    if (state.panelOpen && !root.contains(event.target)) closePanel();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePanel();
  });

  return true;
}

function openPanel() {
  state.panelOpen = true;
  document.getElementById("csv-notification-panel")?.classList.add("open");
  document.getElementById("csv-notification-panel")?.setAttribute("aria-hidden", "false");
  document.getElementById("csv-notification-bell")?.setAttribute("aria-expanded", "true");
}

function closePanel() {
  state.panelOpen = false;
  document.getElementById("csv-notification-panel")?.classList.remove("open");
  document.getElementById("csv-notification-panel")?.setAttribute("aria-hidden", "true");
  document.getElementById("csv-notification-bell")?.setAttribute("aria-expanded", "false");
}


async function syncInstalledAppBadge(count) {
  try {
    if (count > 0 && typeof navigator.setAppBadge === "function") {
      await navigator.setAppBadge(count);
      return;
    }

    if (typeof navigator.clearAppBadge === "function") {
      await navigator.clearAppBadge();
    }
  } catch (_) {}
}

function render() {
  if (!ensureUi()) return;
  const items = allItems();
  const unread = items.filter((item) => !state.seen.has(item.id)).length;
  syncInstalledAppBadge(unread);
  const badge = document.getElementById("csv-notification-badge");
  const list = document.getElementById("csv-notification-list");
  const readAll = document.getElementById("csv-notification-read-all");

  if (badge) {
    badge.textContent = unread > 99 ? "99+" : String(unread);
    badge.classList.toggle("visible", unread > 0);
  }
  if (readAll) readAll.disabled = unread === 0;
  if (!list) return;

  if (!items.length) {
    list.innerHTML = `<div class="csv-notification-empty"><i class="ri-notification-off-line"></i><strong>Tudo em dia</strong><span>Não há novas notificações no momento.</span></div>`;
    return;
  }

  list.innerHTML = items.slice(0, 40).map((item) => {
    const isUnread = !state.seen.has(item.id);
    return `
      <button type="button" class="csv-notification-item ${isUnread ? "unread" : ""}" data-notification-id="${esc(item.id)}">
        <span class="csv-notification-icon ${esc(item.type)}"><i class="${esc(item.icon)}"></i></span>
        <span class="csv-notification-copy">
          <strong>${esc(item.title)}</strong>
          <span>${esc(item.message)}</span>
          <small>${esc(relativeTime(item.time))}</small>
        </span>
        ${isUnread ? '<i class="csv-notification-dot"></i>' : ""}
      </button>`;
  }).join("");

  list.querySelectorAll("[data-notification-id]").forEach((button) => {
    button.addEventListener("click", () => openNotification(button.dataset.notificationId));
  });
}

function markSeen(id) {
  state.seen.add(id);
  saveSeen();
  render();
}

function navigate(tab) {
  closePanel();
  if (["opinioes", "beneficios"].includes(tab) && typeof window.csvEngagementOpenTab === "function") {
    window.csvEngagementOpenTab(tab);
  } else {
    window.irParaAba?.(tab);
  }
}

async function openNotification(id) {
  const item = state.items.get(id) || state.custom.get(id);
  if (!item) return;
  markSeen(id);

  if (item.action === "update") return applyUpdate();
  if (item.action === "campaign") {
    closePanel();
    return window.csvCampaignRefresh?.();
  }
  if (typeof item.onOpen === "function") {
    closePanel();
    return item.onOpen(item);
  }
  if (item.tab) navigate(item.tab);
}

function showUpdateToast() {
  if (!state.updateInfo) return;
  const version = state.updateInfo.version;
  if (sessionStorage.getItem("csv_update_dismissed") === version) return;
  if (document.getElementById("csv-update-toast")) return;

  const toast = document.createElement("aside");
  toast.id = "csv-update-toast";
  toast.className = "csv-update-toast";
  toast.innerHTML = `
    <span class="csv-update-toast-icon"><i class="ri-refresh-line"></i></span>
    <div class="csv-update-toast-copy">
      <small>ATUALIZAÇÃO DO PORTAL</small>
      <strong>Nova atualização disponível</strong>
      <p>${esc(state.updateInfo.message)}</p>
      <span>Versão ${esc(version)}</span>
    </div>
    <div class="csv-update-toast-actions">
      <button type="button" class="secondary" data-update-later>Depois</button>
      <button type="button" class="primary" data-update-now>Atualizar agora</button>
    </div>`;

  document.body.appendChild(toast);
  toast.querySelector("[data-update-later]")?.addEventListener("click", () => {
    sessionStorage.setItem("csv_update_dismissed", version);
    markSeen(`update:${version}`);
    toast.remove();
  });
  toast.querySelector("[data-update-now]")?.addEventListener("click", applyUpdate);
}

function waitInstalled(worker, timeout = 12000) {
  return new Promise((resolve) => {
    if (!worker || worker.state === "installed") return resolve();
    const timer = setTimeout(resolve, timeout);
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed") {
        clearTimeout(timer);
        resolve();
      }
    });
  });
}

async function applyUpdate() {
  const button = document.querySelector("#csv-update-toast [data-update-now]");
  if (button) {
    button.disabled = true;
    button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Atualizando...';
  }

  try {
    if (!("serviceWorker" in navigator)) return window.location.reload();
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return window.location.reload();

    let reloaded = false;
    const reloadOnce = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", reloadOnce, { once: true });
    await registration.update();
    if (registration.installing) await waitInstalled(registration.installing);

    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      return setTimeout(reloadOnce, 3500);
    }

    setTimeout(reloadOnce, 500);
  } catch (error) {
    console.error("Atualização do portal:", error);
    window.location.reload();
  }
}

function pushCustom(input = {}) {
  const id = String(input.id || "").trim() || `custom:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  state.custom.set(id, {
    id,
    type: input.type || "info",
    icon: input.icon || ({
      training: "ri-graduation-cap-line",
      document: "ri-file-text-line"
    }[input.type] || "ri-notification-3-line"),
    title: input.title || "Nova notificação",
    message: input.message || "",
    time: input.time || new Date(),
    tab: input.tab || "",
    action: input.action || "",
    onOpen: typeof input.onOpen === "function" ? input.onOpen : null,
    priority: Number(input.priority || 0)
  });
  render();
  return id;
}

function refreshAll() {
  refreshBulletins();
  checkUpdate();
  render();
}

function stop() {
  state.unsubscribers.forEach((unsubscribe) => unsubscribe?.());
  state.unsubscribers = [];
  clearInterval(state.dataTimer);
  clearInterval(state.updateTimer);
  state.dataTimer = null;
  state.updateTimer = null;
}

async function initUser(user) {
  stop();
  state.user = user;
  state.items.clear();
  state.custom.clear();

  try {
    state.profile = await loadProfile(user);
  } catch (_) {
    state.profile = {
      uid: user.uid,
      name: user.email?.split("@")[0] || "Colaborador",
      sector: "Geral",
      admin: String(user.email || "").toLowerCase().includes("@clinica")
    };
  }

  loadStorage();
  [80, 250, 700, 1500].forEach((delay) => setTimeout(() => {
    ensureUi();
    refreshBulletins();
    render();
  }, delay));

  listenFeedback();
  listenBenefits();
  listenCampaign();
  await checkUpdate();

  state.dataTimer = setInterval(() => {
    refreshBulletins();
    render();
  }, 12000);
  state.updateTimer = setInterval(checkUpdate, 5 * 60 * 1000);
}

function reset() {
  stop();
  state.user = null;
  state.profile = null;
  state.items.clear();
  state.custom.clear();
  state.seen.clear();
  state.updateInfo = null;
  closePanel();
  document.getElementById("csv-update-toast")?.remove();
  document.getElementById("csv-notification-center")?.remove();
}

function init() {
  window.csvNotificationCenter = {
    push: pushCustom,
    refresh: refreshAll,
    open: openPanel,
    close: closePanel,
    version: VERSION
  };

  window.addEventListener("csv:notification", (event) => pushCustom(event.detail || {}));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.user) refreshAll();
  });

  onAuthStateChanged(auth, (user) => {
    if (!user) return reset();
    initUser(user).catch((error) => console.error("Central de notificações:", error));
  });

  console.log(`CSV Notification Center ${VERSION} carregada.`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
