import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  arrayUnion,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const CSV_INTELLIGENCE_VERSION = "7.1.1";
const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const intel = {
  user: null,
  profile: null,
  isAdmin: false,
  collaborators: [],
  users: [],
  bulletins: [],
  privateBulletins: [],
  readings: [],
  rereadRequests: [],
  notices: [],
  unsubscribers: [],
  chart: null,
  groups: new Map(),
  lastAlertKey: ""
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

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function dateOnly(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T12:00:00`)
    : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
  const date = dateOnly(dateValue) || new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function formatDate(value = "") {
  const date = dateOnly(value);
  return date
    ? date.toLocaleDateString("pt-BR")
    : "Sem prazo";
}

function daysUntil(value = "") {
  const deadline = dateOnly(value);
  const today = dateOnly(todayKey());
  if (!deadline || !today) return null;
  return Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
}

function collaboratorName(item) {
  return String(
    item?.data?.["Nome Completo do Colaborador"] ||
    item?.data?.nome ||
    ""
  ).trim();
}

function collaboratorSector(item) {
  return String(
    item?.data?.["Setor da Clínica"] ||
    item?.data?.setor ||
    "Geral"
  ).trim() || "Geral";
}

function bulletinTitle(item) {
  return String(
    item?.data?.["Título do Informativo"] ||
    item?.data?.["Título do Documento"] ||
    item?.data?.titulo ||
    "Informativo"
  );
}

function bulletinDate(item) {
  return String(
    item?.data?.["Data de Publicação"] ||
    item?.data?.dataPublicacao ||
    ""
  );
}

function bulletinDeadline(item) {
  return String(
    item?.data?.prazoLeitura ||
    item?.data?.["Prazo para Leitura"] ||
    ""
  );
}

function legacyReadNames(item) {
  return new Set(
    (Array.isArray(item?.data?.leituras) ? item.data.leituras : [])
      .map((entry) => String(entry).split(" (")[0].trim())
      .filter(Boolean)
  );
}

function readingId(item, uid) {
  return `${item.collectionName || "boletins"}__${item.id}__${uid}`
    .replace(/\//g, "_");
}

function rereadId(item, uid) {
  return readingId(item, uid);
}

function userByName(name) {
  const normalized = normalizeText(name);
  return intel.users.find(
    (item) =>
      normalizeText(item.data?.nome) === normalized &&
      item.data?.removido !== true
  ) || null;
}

function recipientForPrivate(item) {
  const name = String(
    item.data?.["Para qual Colaborador?"] ||
    item.data?.publicoPessoas?.[0] ||
    ""
  ).trim();

  const directUid = String(item.data?.destinatarioUid || "").trim();
  const user = directUid
    ? intel.users.find((entry) => entry.id === directUid)
    : userByName(name);

  return {
    uid: directUid || user?.id || "",
    name: name || user?.data?.nome || "Colaborador",
    sector: user?.data?.setor || "Geral",
    user
  };
}

function currentProfile() {
  return window.csvPhase2State?.profile || intel.profile;
}

function currentName() {
  return String(currentProfile()?.name || currentProfile()?.nome || "").trim();
}

function currentSector() {
  return String(currentProfile()?.sector || currentProfile()?.setor || "Geral").trim();
}

function currentPermissions() {
  const profile = currentProfile() || {};
  return new Set(profile.permissions || profile.permissoes || []);
}

function canUseBulletins() {
  return intel.isAdmin || currentPermissions().has("boletins");
}

function structuredReading(item, uid) {
  const id = readingId(item, uid);
  return intel.readings.find((entry) => entry.id === id) || null;
}

function rereadRequest(item, uid) {
  const id = rereadId(item, uid);
  return intel.rereadRequests.find((entry) => entry.id === id) || null;
}

function isRead(item, person) {
  const uid = person?.uid || "";
  const name = person?.name || "";
  return Boolean(
    (uid && structuredReading(item, uid)) ||
    legacyReadNames(item).has(name)
  );
}

function effectiveDeadline(item, request = null) {
  if (
    request?.data?.status === "aprovada" &&
    request?.data?.novaDataLimite
  ) {
    return request.data.novaDataLimite;
  }
  return bulletinDeadline(item);
}

function directItemsForCurrentUser() {
  const name = currentName();
  const uid = intel.user?.uid || "";

  return intel.privateBulletins.filter((item) => {
    const assignedName = String(
      item.data?.["Para qual Colaborador?"] ||
      item.data?.publicoPessoas?.[0] ||
      ""
    ).trim();
    const assignedUid = String(item.data?.destinatarioUid || "").trim();

    return (
      (assignedUid && assignedUid === uid) ||
      normalizeText(assignedName) === normalizeText(name)
    );
  });
}

function activePeople() {
  const map = new Map();

  intel.collaborators.forEach((item) => {
    const name = collaboratorName(item);
    if (!name || item.data?.ativo === false) return;

    map.set(normalizeText(name), {
      uid: String(item.data?.uidAuth || ""),
      name,
      sector: collaboratorSector(item)
    });
  });

  intel.users.forEach((item) => {
    const data = item.data || {};
    if (
      data.admin ||
      data.removido === true ||
      data.ativo === false ||
      !data.nome
    ) {
      return;
    }

    const key = normalizeText(data.nome);
    const existing = map.get(key) || {};

    map.set(key, {
      ...existing,
      uid: item.id,
      name: data.nome,
      sector: data.setor || existing.sector || "Geral"
    });
  });

  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR")
  );
}

function directGroups() {
  const groups = new Map();

  intel.privateBulletins.forEach((item) => {
    const groupId =
      item.data?.grupoPublicacaoId ||
      `single-${item.id}`;

    if (!groups.has(groupId)) {
      groups.set(groupId, {
        id: groupId,
        title: bulletinTitle(item),
        date: bulletinDate(item),
        deadline: bulletinDeadline(item),
        docs: []
      });
    }

    groups.get(groupId).docs.push(item);
  });

  return [...groups.values()].sort(
    (a, b) => (dateOnly(b.date)?.getTime() || 0) -
      (dateOnly(a.date)?.getTime() || 0)
  );
}

function groupMetrics(group) {
  const rows = group.docs.map((item) => {
    const person = recipientForPrivate(item);
    const request = person.uid
      ? rereadRequest(item, person.uid)
      : null;
    const deadline = effectiveDeadline(item, request);
    const read = isRead(item, person);
    const remaining = daysUntil(deadline);
    const overdue = !read && remaining !== null && remaining < 0;
    const near = !read && remaining !== null && remaining >= 0 && remaining <= Number(item.data?.diasAviso || 2);

    return {
      item,
      person,
      request,
      deadline,
      read,
      remaining,
      overdue,
      near
    };
  });

  return {
    rows,
    total: rows.length,
    read: rows.filter((row) => row.read).length,
    pending: rows.filter((row) => !row.read).length,
    overdue: rows.filter((row) => row.overdue).length,
    near: rows.filter((row) => row.near).length
  };
}

function personAnalytics(person) {
  const items = intel.privateBulletins.filter((item) => {
    const target = recipientForPrivate(item);
    return (
      (person.uid && target.uid === person.uid) ||
      normalizeText(target.name) === normalizeText(person.name)
    );
  });

  const rows = items.map((item) => {
    const request = person.uid ? rereadRequest(item, person.uid) : null;
    const reading = person.uid ? structuredReading(item, person.uid) : null;
    const deadline = effectiveDeadline(item, request);
    const read = isRead(item, person);
    const remaining = daysUntil(deadline);
    const overdue = !read && remaining !== null && remaining < 0;
    const onTime = reading?.data?.dentroDoPrazo === true;
    const requested = Boolean(request);

    return {
      item,
      request,
      reading,
      deadline,
      read,
      overdue,
      onTime,
      requested
    };
  });

  const total = rows.length;
  const read = rows.filter((row) => row.read).length;
  const pending = total - read;
  const overdue = rows.filter((row) => row.overdue).length;
  const onTime = rows.filter((row) => row.onTime).length;
  const requests = rows.filter((row) => row.requested).length;
  const rate = total ? Math.round((read / total) * 100) : 100;
  const score = Math.max(
    0,
    Math.min(
      100,
      rate + onTime * 2 - overdue * 8 - requests * 5
    )
  );

  let label = "Atenção necessária";
  let level = "low";

  if (score >= 90 && pending === 0) {
    label = "Destaque de engajamento";
    level = "excellent";
  } else if (score >= 75) {
    label = "Bom acompanhamento";
    level = "good";
  } else if (score >= 55) {
    label = "Em desenvolvimento";
    level = "medium";
  }

  return {
    ...person,
    rows,
    total,
    read,
    pending,
    overdue,
    onTime,
    requests,
    rate,
    score,
    label,
    level,
    positivePoints: onTime * 2 + Math.max(0, read - onTime),
    negativePoints: overdue * 2 + requests
  };
}

function ensureModal() {
  let modal = document.getElementById("csv-intel-modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "csv-intel-modal";
    modal.className = "csv-intel-modal";
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
    document.body.appendChild(modal);
  }

  return modal;
}

function closeModal() {
  const modal = document.getElementById("csv-intel-modal");
  if (modal) {
    modal.classList.remove("is-open");
    modal.innerHTML = "";
  }
}

window.csvIntelCloseModal = closeModal;

function openBulletinTab(filter = "all") {
  if (!canUseBulletins()) return;

  window.irParaAba?.("boletins");

  setTimeout(() => {
    const root = document.getElementById("csv2-bulletins-root");
    const button = root?.querySelector(
      `#csv2-person-bulletin-filters [data-filter="${filter}"]`
    );

    button?.click();
  }, 180);
}

window.csvIntelOpenMyDirect = () => openBulletinTab("direct");

function renderHomeCard() {
  if (intel.isAdmin || !canUseBulletins()) {
    document.getElementById("csv-direct-home-card")?.remove();
    return;
  }

  const home = document.getElementById("tab-home");
  const hero = home?.querySelector(".csv-home-hero");
  if (!home || !hero) return;

  let card = document.getElementById("csv-direct-home-card");

  if (!card) {
    card = document.createElement("section");
    card.id = "csv-direct-home-card";
    card.className = "csv-direct-home-card";
    hero.insertAdjacentElement("afterend", card);
  }

  const person = {
    uid: intel.user?.uid || "",
    name: currentName(),
    sector: currentSector()
  };

  const items = directItemsForCurrentUser();
  const pendingRows = items
    .map((item) => {
      const request = person.uid ? rereadRequest(item, person.uid) : null;
      const deadline = effectiveDeadline(item, request);
      return {
        item,
        request,
        deadline,
        read: isRead(item, person),
        remaining: daysUntil(deadline)
      };
    })
    .filter((row) => !row.read)
    .sort((a, b) => {
      if (a.remaining === null) return 1;
      if (b.remaining === null) return -1;
      return a.remaining - b.remaining;
    });

  const next = pendingRows[0];
  const overdue = pendingRows.filter(
    (row) => row.remaining !== null && row.remaining < 0
  ).length;

  card.innerHTML = `
    <div class="csv-direct-home-icon">
      <i class="ri-user-received-2-line"></i>
    </div>
    <div class="csv-direct-home-copy">
      <span>Informativos direcionados para você</span>
      <h3>${pendingRows.length
        ? `${pendingRows.length} leitura(s) aguardando você`
        : "Suas leituras estão em dia"}</h3>
      <p>${next
        ? `${esc(bulletinTitle(next.item))} • prazo ${esc(formatDate(next.deadline))}`
        : "Quando a gestão enviar uma orientação individual, ela aparecerá neste espaço."}</p>
    </div>
    <div class="csv-direct-home-metrics">
      <span><strong>${items.length}</strong>Total</span>
      <span class="${overdue ? "danger" : ""}"><strong>${overdue}</strong>Vencidos</span>
    </div>
    <button type="button" onclick="window.csvIntelOpenMyDirect()">
      Ver meus informativos
      <i class="ri-arrow-right-line"></i>
    </button>
  `;
}

function alertKey(rows, notices) {
  return [
    todayKey(),
    rows.length,
    rows.filter((row) => row.overdue).length,
    rows.filter((row) => row.near).length,
    notices.filter((item) => !item.data?.visualizadoEm).length
  ].join("-");
}

async function markNoticesSeen(items) {
  await Promise.all(
    items
      .filter((item) => !item.data?.visualizadoEm)
      .map((item) =>
        updateDoc(doc(db, "avisos-leitura", item.id), {
          visualizadoEm: serverTimestamp()
        }).catch(() => {})
      )
  );
}

function renderCollaboratorAlert() {
  if (intel.isAdmin || !canUseBulletins()) return;

  const person = {
    uid: intel.user?.uid || "",
    name: currentName(),
    sector: currentSector()
  };

  const rows = directItemsForCurrentUser()
    .map((item) => {
      const request = person.uid ? rereadRequest(item, person.uid) : null;
      const deadline = effectiveDeadline(item, request);
      const remaining = daysUntil(deadline);
      const read = isRead(item, person);

      return {
        item,
        request,
        deadline,
        remaining,
        read,
        overdue: !read && remaining !== null && remaining < 0,
        near: !read && remaining !== null && remaining >= 0 &&
          remaining <= Number(item.data?.diasAviso || 2)
      };
    })
    .filter((row) => !row.read);

  const unseenNotices = intel.notices.filter(
    (item) => !item.data?.visualizadoEm
  );
  const overdue = rows.filter((row) => row.overdue);
  const near = rows.filter((row) => row.near);

  if (
    !unseenNotices.length &&
    !overdue.length &&
    rows.length < 3 &&
    !near.length
  ) {
    return;
  }

  const key = alertKey(rows, intel.notices);

  if (
    intel.lastAlertKey === key ||
    sessionStorage.getItem(`csv-intel-alert-${key}`) === "1"
  ) {
    return;
  }

  intel.lastAlertKey = key;
  sessionStorage.setItem(`csv-intel-alert-${key}`, "1");

  let title = "Mantenha sua leitura em dia";
  let text = `Você possui ${rows.length} informativo(s) pendente(s). Consulte as orientações para continuar atualizado.`;
  let level = "attention";

  if (overdue.length) {
    title = "Existem leituras com prazo vencido";
    text = `${overdue.length} informativo(s) passaram do prazo. Abra o conteúdo e solicite uma nova oportunidade de leitura.`;
    level = "danger";
  } else if (unseenNotices.length) {
    title = "A gestão enviou um lembrete";
    text = unseenNotices[0].data?.mensagem ||
      "Há informativos pendentes que precisam da sua atenção.";
    level = "warning";
  } else if (near.length) {
    title = "Prazo de leitura próximo";
    text = `${near.length} informativo(s) vencem em breve. Organize-se para concluir dentro do prazo.`;
  }

  const modal = ensureModal();

  modal.innerHTML = `
    <div class="csv-intel-modal-card compact ${level}">
      <button type="button" class="csv-intel-close" onclick="window.csvIntelCloseModal()">
        <i class="ri-close-line"></i>
      </button>
      <div class="csv-intel-alert-icon">
        <i class="${overdue.length ? "ri-alarm-warning-line" : "ri-notification-3-line"}"></i>
      </div>
      <span class="csv-intel-eyebrow">Central de leitura</span>
      <h2>${esc(title)}</h2>
      <p>${esc(text)}</p>
      <div class="csv-intel-alert-stats">
        <span><strong>${rows.length}</strong>Pendentes</span>
        <span><strong>${near.length}</strong>Próximos do prazo</span>
        <span><strong>${overdue.length}</strong>Vencidos</span>
      </div>
      <div class="csv-intel-modal-actions">
        <button type="button" class="secondary" onclick="window.csvIntelCloseModal()">Agora não</button>
        <button type="button" class="primary" onclick="window.csvIntelCloseModal();window.csvIntelOpenMyDirect()">
          Ver informativos
        </button>
      </div>
    </div>
  `;

  modal.classList.add("is-open");
  markNoticesSeen(unseenNotices);
}

function monthSeries(groups) {
  const months = [];
  const now = new Date();

  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    months.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      assigned: 0,
      read: 0,
      pending: 0
    });
  }

  groups.forEach((group) => {
    const date = dateOnly(group.date);
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const month = months.find((item) => item.key === key);
    if (!month) return;
    const metrics = groupMetrics(group);
    month.assigned += metrics.total;
    month.read += metrics.read;
    month.pending += metrics.pending;
  });

  return months;
}

function renderAdminChart(groups) {
  const canvas = document.getElementById("csv-intel-chart");
  if (!canvas || typeof Chart === "undefined") return;

  const series = monthSeries(groups);
  intel.chart?.destroy?.();

  intel.chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: series.map((item) => item.label),
      datasets: [
        {
          label: "Atribuídos",
          data: series.map((item) => item.assigned),
          backgroundColor: "rgba(115,87,189,.78)",
          borderRadius: 8
        },
        {
          label: "Lidos",
          data: series.map((item) => item.read),
          backgroundColor: "rgba(34,166,111,.82)",
          borderRadius: 8
        },
        {
          label: "Pendentes",
          data: series.map((item) => item.pending),
          backgroundColor: "rgba(230,66,78,.76)",
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { usePointStyle: true, boxWidth: 8 }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
        x: { grid: { display: false } }
      }
    }
  });
}

function directDashboardRoot() {
  const tab = document.getElementById("tab-boletins-privados");
  if (!tab || !intel.isAdmin) return null;

  [...tab.children].forEach((child) => {
    if (child.id !== "csv-intel-admin-root") {
      child.style.display = "none";
    }
  });

  let root = document.getElementById("csv-intel-admin-root");

  if (!root) {
    root = document.createElement("div");
    root.id = "csv-intel-admin-root";
    root.className = "csv-intel-admin-root";
    tab.appendChild(root);
  }

  return root;
}

function renderAdminDashboard() {
  const root = directDashboardRoot();
  if (!root) return;

  const groups = directGroups();
  intel.groups = new Map(groups.map((group) => [group.id, group]));

  const metrics = groups.map(groupMetrics);
  const total = metrics.reduce((sum, item) => sum + item.total, 0);
  const read = metrics.reduce((sum, item) => sum + item.read, 0);
  const pending = metrics.reduce((sum, item) => sum + item.pending, 0);
  const overdue = metrics.reduce((sum, item) => sum + item.overdue, 0);
  const rate = total ? Math.round((read / total) * 100) : 0;

  const people = activePeople().map(personAnalytics);
  const best = [...people].sort((a, b) => b.score - a.score);
  const requestsPending = intel.rereadRequests.filter(
    (item) => item.data?.status === "pendente"
  ).length;

  root.innerHTML = `
    <header class="csv-intel-header">
      <div>
        <span class="csv-intel-eyebrow"><i class="ri-user-star-line"></i> Informativos direcionados</span>
        <h2>Leituras individuais, prazos e desenvolvimento</h2>
        <p>Publique pelo cadastro único de Boletins Gerais e acompanhe aqui cada destinatário, prazo, solicitação e resultado.</p>
      </div>
      <div class="csv-intel-header-actions">
        <button type="button" class="secondary" onclick="window.csvIntelOpenGeneralManager()">
          <i class="ri-newspaper-line"></i> Abrir Boletins Gerais
        </button>
        <button type="button" class="primary" onclick="window.csvIntelCreateDirect()">
          <i class="ri-add-line"></i> Novo direcionado
        </button>
      </div>
    </header>

    <section class="csv-intel-summary">
      <article><span>Atribuições</span><strong>${total}</strong><i class="ri-file-user-line"></i></article>
      <article><span>Leituras</span><strong>${read}</strong><i class="ri-checkbox-circle-line"></i></article>
      <article class="${pending ? "attention" : ""}"><span>Pendentes</span><strong>${pending}</strong><i class="ri-time-line"></i></article>
      <article class="${overdue ? "danger" : ""}"><span>Vencidos</span><strong>${overdue}</strong><i class="ri-alarm-warning-line"></i></article>
      <article><span>Índice geral</span><strong>${rate}%</strong><i class="ri-line-chart-line"></i></article>
      <article class="${requestsPending ? "attention" : ""}"><span>Releituras</span><strong>${requestsPending}</strong><i class="ri-refresh-line"></i></article>
    </section>

    <section class="csv-intel-overview">
      <div class="csv-intel-chart-card">
        <div class="csv-intel-card-heading">
          <div><strong>Evolução dos informativos direcionados</strong><span>Atribuídos, lidos e pendentes nos últimos seis meses.</span></div>
        </div>
        <div class="csv-intel-chart-holder"><canvas id="csv-intel-chart"></canvas></div>
      </div>

      <aside class="csv-intel-highlight-card">
        <span>Indicador de desenvolvimento</span>
        <h3>${best[0] ? esc(best[0].name) : "Sem dados suficientes"}</h3>
        <p>${best[0]
          ? `${best[0].score} pontos de acompanhamento • ${best[0].label}`
          : "Os destaques aparecerão conforme as leituras forem registradas."}</p>
        <div class="csv-intel-note">
          <i class="ri-information-line"></i>
          Este indicador considera apenas cumprimento de leituras e não decide promoções. A avaliação final deve ser humana e considerar o desempenho completo.
        </div>
      </aside>
    </section>

    <section class="csv-intel-section">
      <div class="csv-intel-card-heading">
        <div><strong>Publicações direcionadas</strong><span>Veja leitores, pendentes, prazos e envie lembretes somente a quem precisa.</span></div>
      </div>
      <div class="csv-intel-group-list">
        ${groups.length
          ? groups.map((group) => {
              const itemMetrics = groupMetrics(group);
              return `
                <article class="csv-intel-group-card ${itemMetrics.overdue ? "has-overdue" : ""}">
                  <div class="csv-intel-group-icon"><i class="ri-file-user-line"></i></div>
                  <div class="csv-intel-group-main">
                    <span>${esc(group.date || "Sem data")} • prazo ${esc(formatDate(group.deadline))}</span>
                    <h3>${esc(group.title)}</h3>
                    <div class="csv-intel-progress"><i style="width:${itemMetrics.total ? Math.round(itemMetrics.read / itemMetrics.total * 100) : 0}%"></i></div>
                  </div>
                  <div class="csv-intel-group-numbers">
                    <span><strong>${itemMetrics.read}</strong>Lidos</span>
                    <span><strong>${itemMetrics.pending}</strong>Pendentes</span>
                    <span class="${itemMetrics.overdue ? "danger" : ""}"><strong>${itemMetrics.overdue}</strong>Vencidos</span>
                  </div>
                  <div class="csv-intel-group-actions">
                    <button type="button" onclick="window.csvIntelOpenAudience('${esc(group.id)}')">
                      <i class="ri-group-line"></i> Quem leu
                    </button>
                    <button type="button" onclick="window.csvIntelEditDeadline('${esc(group.id)}')">
                      <i class="ri-calendar-edit-line"></i> Editar prazo
                    </button>
                    ${itemMetrics.pending
                      ? `<button type="button" class="attention" onclick="window.csvIntelNudgeGroup('${esc(group.id)}')"><i class="ri-notification-3-line"></i> Chamar atenção</button>`
                      : ""}
                  </div>
                </article>
              `;
            }).join("")
          : `<div class="csv-intel-empty"><i class="ri-inbox-line"></i><strong>Nenhum informativo direcionado</strong><span>Cadastre pela Central de Boletins e selecione pessoas específicas.</span></div>`}
      </div>
    </section>

    <section class="csv-intel-section">
      <div class="csv-intel-card-heading">
        <div>
          <strong>Relatório de desenvolvimento por leitura</strong>
          <span>Pontos positivos, atrasos e pedidos de releitura. Use como apoio, nunca como decisão automática de promoção.</span>
        </div>
        <div class="csv-intel-filters">
          <input id="csv-intel-search" placeholder="Pesquisar colaborador...">
          <select id="csv-intel-status">
            <option value="all">Todos os resultados</option>
            <option value="excellent">Destaques</option>
            <option value="good">Bom acompanhamento</option>
            <option value="medium">Em desenvolvimento</option>
            <option value="low">Atenção necessária</option>
          </select>
        </div>
      </div>
      <div id="csv-intel-people-table"></div>
    </section>
  `;

  document
    .getElementById("csv-intel-search")
    ?.addEventListener("input", renderPeopleTable);
  document
    .getElementById("csv-intel-status")
    ?.addEventListener("change", renderPeopleTable);

  renderAdminChart(groups);
  renderPeopleTable();
}

function renderPeopleTable() {
  const holder = document.getElementById("csv-intel-people-table");
  if (!holder || !intel.isAdmin) return;

  const search = normalizeText(
    document.getElementById("csv-intel-search")?.value || ""
  );
  const status =
    document.getElementById("csv-intel-status")?.value || "all";

  let people = activePeople().map(personAnalytics);

  if (search) {
    people = people.filter((item) =>
      normalizeText(`${item.name} ${item.sector}`).includes(search)
    );
  }

  if (status !== "all") {
    people = people.filter((item) => item.level === status);
  }

  people.sort(
    (a, b) =>
      b.score - a.score ||
      a.name.localeCompare(b.name, "pt-BR")
  );

  holder.innerHTML = `
    <div class="csv-intel-table">
      <div class="csv-intel-table-head">
        <span>Colaborador</span><span>Leituras</span><span>Pontos</span><span>Pendências</span><span>Indicador</span><span></span>
      </div>
      ${people.length
        ? people.map((person) => `
            <article>
              <div class="csv-intel-person">
                <span>${esc(person.name.charAt(0))}</span>
                <div><strong>${esc(person.name)}</strong><small>${esc(person.sector)}</small></div>
              </div>
              <div><strong>${person.read}/${person.total}</strong><small>${person.rate}% concluído</small></div>
              <div class="csv-intel-points"><b>+${person.positivePoints}</b><em>-${person.negativePoints}</em></div>
              <div><strong>${person.pending}</strong><small>${person.overdue} vencido(s) • ${person.requests} releitura(s)</small></div>
              <div><span class="csv-intel-score ${person.level}">${person.score}</span><small>${esc(person.label)}</small></div>
              <button type="button" onclick="window.csvIntelOpenPerson('${esc(encodeURIComponent(person.uid || person.name))}')"><i class="ri-eye-line"></i></button>
            </article>
          `).join("")
        : `<div class="csv-intel-empty compact"><strong>Nenhum colaborador neste filtro</strong></div>`}
    </div>
  `;
}

window.csvIntelOpenGeneralManager = function() {
  window.irParaAba?.("boletins");
};

window.csvIntelCreateDirect = function() {
  window.irParaAba?.("boletins");

  setTimeout(() => {
    document.getElementById("csv2-new-bulletin-button")?.click();

    setTimeout(() => {
      const audience = document.getElementById("csv2-b-audience");
      if (!audience) return;
      audience.value = "pessoas";
      audience.dispatchEvent(new Event("change", { bubbles: true }));
    }, 120);
  }, 150);
};

window.csvIntelOpenAudience = function(groupId) {
  const group = intel.groups.get(groupId);
  if (!group) return;

  const metrics = groupMetrics(group);
  const modal = ensureModal();

  modal.innerHTML = `
    <div class="csv-intel-modal-card wide">
      <button type="button" class="csv-intel-close" onclick="window.csvIntelCloseModal()"><i class="ri-close-line"></i></button>
      <span class="csv-intel-eyebrow">Acompanhamento individual</span>
      <h2>${esc(group.title)}</h2>
      <p>Prazo atual: ${esc(formatDate(group.deadline))}</p>

      <div class="csv-intel-audience-list">
        ${metrics.rows.map((row) => {
          const requestStatus = row.request?.data?.status || "";
          return `
            <article class="${row.overdue ? "overdue" : row.read ? "read" : "pending"}">
              <div class="csv-intel-person">
                <span>${esc(row.person.name.charAt(0))}</span>
                <div><strong>${esc(row.person.name)}</strong><small>${esc(row.person.sector)}</small></div>
              </div>
              <div>
                <strong>${row.read ? "Leitura concluída" : row.overdue ? "Prazo vencido" : "Aguardando leitura"}</strong>
                <small>Prazo ${esc(formatDate(row.deadline))}</small>
              </div>
              <span class="csv-intel-status ${row.read ? "read" : row.overdue ? "overdue" : "pending"}">
                ${row.read ? "Lido" : row.overdue ? "Vencido" : "Pendente"}
              </span>
              ${requestStatus === "pendente"
                ? `<button type="button" class="approve" onclick="window.csvIntelApproveReread('${esc(row.request.id)}','${esc(groupId)}')"><i class="ri-check-line"></i> Aprovar releitura</button>`
                : requestStatus
                  ? `<small class="csv-intel-request-label">Releitura: ${esc(requestStatus)}</small>`
                  : ""}
            </article>
          `;
        }).join("")}
      </div>

      <div class="csv-intel-modal-actions">
        <button type="button" class="secondary" onclick="window.csvIntelCloseModal()">Fechar</button>
        ${metrics.pending
          ? `<button type="button" class="primary" onclick="window.csvIntelCloseModal();window.csvIntelNudgeGroup('${esc(groupId)}')">Lembrar pendentes</button>`
          : ""}
      </div>
    </div>
  `;

  modal.classList.add("is-open");
};

window.csvIntelEditDeadline = function(groupId) {
  const group = intel.groups.get(groupId);
  if (!group) return;

  const modal = ensureModal();

  modal.innerHTML = `
    <div class="csv-intel-modal-card compact">
      <button type="button" class="csv-intel-close" onclick="window.csvIntelCloseModal()"><i class="ri-close-line"></i></button>
      <span class="csv-intel-eyebrow">Prazo de leitura</span>
      <h2>Editar prazo do informativo</h2>
      <p>${esc(group.title)}</p>
      <label class="csv-intel-field">
        <span>Nova data limite</span>
        <input type="date" id="csv-intel-new-deadline" value="${esc(group.deadline || addDays(todayKey(), 3))}">
      </label>
      <div class="csv-intel-modal-actions">
        <button type="button" class="secondary" onclick="window.csvIntelCloseModal()">Cancelar</button>
        <button type="button" class="primary" onclick="window.csvIntelSaveDeadline('${esc(groupId)}')">Salvar prazo</button>
      </div>
    </div>
  `;

  modal.classList.add("is-open");
};

window.csvIntelSaveDeadline = async function(groupId) {
  const group = intel.groups.get(groupId);
  const deadline = document.getElementById("csv-intel-new-deadline")?.value;
  if (!group || !deadline) return;

  await Promise.all(
    group.docs.map((item) =>
      setDoc(
        doc(db, "boletins-privados", item.id),
        {
          prazoLeitura: deadline,
          atualizadoEm: serverTimestamp(),
          atualizadoPor: currentProfile()?.email || ""
        },
        { merge: true }
      )
    )
  );

  closeModal();
};

window.csvIntelNudgeGroup = async function(groupId) {
  const group = intel.groups.get(groupId);
  if (!group) return;

  const pending = groupMetrics(group).rows.filter((row) => !row.read);

  if (!pending.length) {
    alert("Todos os destinatários já concluíram a leitura.");
    return;
  }

  const confirmed = confirm(
    `Enviar um lembrete para ${pending.length} colaborador(es) pendente(s)?`
  );
  if (!confirmed) return;

  let sent = 0;
  let skipped = 0;

  for (const row of pending) {
    if (!row.person.uid) {
      skipped += 1;
      continue;
    }

    await addDoc(collection(db, "avisos-leitura"), {
      uid: row.person.uid,
      nome: row.person.name,
      setor: row.person.sector,
      bulletinId: row.item.id,
      collectionName: "boletins-privados",
      titulo: bulletinTitle(row.item),
      prazoLeitura: row.deadline,
      mensagem: `Você possui o informativo “${bulletinTitle(row.item)}” pendente. Mantenha sua leitura em dia para acompanhar as orientações da clínica.`,
      criadoEm: serverTimestamp(),
      criadoPor: currentProfile()?.email || "",
      visualizadoEm: null
    });

    sent += 1;
  }

  alert(
    `${sent} lembrete(s) enviado(s).` +
    (skipped ? ` ${skipped} pessoa(s) ainda não possuem login vinculado.` : "")
  );
};

window.csvIntelApproveReread = async function(requestId, groupId) {
  const newDeadline = addDays(todayKey(), 2);

  await setDoc(
    doc(db, "solicitacoes-releitura", requestId),
    {
      status: "aprovada",
      novaDataLimite: newDeadline,
      analisadoEm: serverTimestamp(),
      analisadoPor: currentProfile()?.email || ""
    },
    { merge: true }
  );

  window.csvIntelOpenAudience(groupId);
};

window.csvIntelOpenPerson = function(identifier) {
  const decodedIdentifier = decodeURIComponent(identifier || "");
  const people = activePeople().map(personAnalytics);
  const person = people.find(
    (item) =>
      item.uid === decodedIdentifier ||
      normalizeText(item.name) === normalizeText(decodedIdentifier)
  );

  if (!person) return;

  const modal = ensureModal();

  modal.innerHTML = `
    <div class="csv-intel-modal-card wide">
      <button type="button" class="csv-intel-close" onclick="window.csvIntelCloseModal()"><i class="ri-close-line"></i></button>
      <span class="csv-intel-eyebrow">Relatório individual</span>
      <h2>${esc(person.name)}</h2>
      <p>${esc(person.sector)} • ${person.label}</p>

      <section class="csv-intel-person-summary">
        <article><span>Índice</span><strong>${person.score}</strong></article>
        <article><span>Lidos</span><strong>${person.read}/${person.total}</strong></article>
        <article><span>Pontos positivos</span><strong>+${person.positivePoints}</strong></article>
        <article><span>Pontos negativos</span><strong>-${person.negativePoints}</strong></article>
        <article><span>Vencidos</span><strong>${person.overdue}</strong></article>
        <article><span>Releituras</span><strong>${person.requests}</strong></article>
      </section>

      <div class="csv-intel-note">
        <i class="ri-information-line"></i>
        Este relatório mede somente comportamento de leitura. Não deve ser usado isoladamente para promoção, advertência ou qualquer decisão trabalhista.
      </div>

      <div class="csv-intel-person-docs">
        ${person.rows.length
          ? person.rows.map((row) => `
              <article>
                <div><strong>${esc(bulletinTitle(row.item))}</strong><small>Prazo ${esc(formatDate(row.deadline))}</small></div>
                <span class="csv-intel-status ${row.read ? "read" : row.overdue ? "overdue" : "pending"}">
                  ${row.read ? "Lido" : row.overdue ? "Vencido" : "Pendente"}
                </span>
              </article>
            `).join("")
          : `<div class="csv-intel-empty compact"><strong>Nenhum informativo direcionado</strong></div>`}
      </div>
    </div>
  `;

  modal.classList.add("is-open");
};

window.csvBulletinOpenReadStatus = function(key) {
  const item = window.csv2GetDisplayItem?.(key);
  if (!item || !intel.isAdmin) return;

  if (
    item.collectionName === "boletins-privados" &&
    item.groupDocs?.length
  ) {
    const groupId = item.data?.grupoPublicacaoId || item.id;
    const group = {
      id: groupId,
      title: bulletinTitle(item),
      date: bulletinDate(item),
      deadline: bulletinDeadline(item),
      docs: item.groupDocs
    };
    intel.groups.set(groupId, group);
    window.csvIntelOpenAudience(groupId);
    return;
  }

  const people = activePeople().filter((person) => {
    const data = item.data || {};
    if (data.publicoTipo === "todos") return true;
    if (data.publicoTipo === "setores") {
      return (data.publicoSetores || [])
        .map(normalizeText)
        .includes(normalizeText(person.sector));
    }
    return true;
  });

  const rows = people.map((person) => ({
    person,
    read: isRead(item, person)
  }));

  const modal = ensureModal();

  modal.innerHTML = `
    <div class="csv-intel-modal-card wide">
      <button type="button" class="csv-intel-close" onclick="window.csvIntelCloseModal()"><i class="ri-close-line"></i></button>
      <span class="csv-intel-eyebrow">Leitores do boletim</span>
      <h2>${esc(bulletinTitle(item))}</h2>
      <p>${rows.filter((row) => row.read).length}/${rows.length} leituras concluídas.</p>
      <div class="csv-intel-audience-list">
        ${rows.map((row) => `
          <article class="${row.read ? "read" : "pending"}">
            <div class="csv-intel-person">
              <span>${esc(row.person.name.charAt(0))}</span>
              <div><strong>${esc(row.person.name)}</strong><small>${esc(row.person.sector)}</small></div>
            </div>
            <span class="csv-intel-status ${row.read ? "read" : "pending"}">${row.read ? "Lido" : "Pendente"}</span>
          </article>
        `).join("")}
      </div>
    </div>
  `;

  modal.classList.add("is-open");
};

async function markReadOrRequest(key) {
  const item = window.csv2GetDisplayItem?.(key);
  const profile = currentProfile();

  if (!item || intel.isAdmin || !profile || !intel.user) return;

  const person = {
    uid: intel.user.uid,
    name: currentName(),
    sector: currentSector()
  };

  if (isRead(item, person)) return;

  const requestRef = doc(
    db,
    "solicitacoes-releitura",
    rereadId(item, person.uid)
  );
  const requestSnapshot = await getDoc(requestRef);
  const requestData = requestSnapshot.exists()
    ? requestSnapshot.data()
    : null;

  const deadline = effectiveDeadline(
    item,
    requestData ? { data: requestData } : null
  );
  const remaining = daysUntil(deadline);
  const overdue = remaining !== null && remaining < 0;

  if (overdue && requestData?.status !== "aprovada") {
    if (requestData?.status === "pendente") {
      alert("Sua solicitação de releitura já foi enviada e aguarda análise da gestão.");
      return;
    }

    await setDoc(
      requestRef,
      {
        uid: person.uid,
        nome: person.name,
        setor: person.sector,
        bulletinId: item.id,
        collectionName: item.collectionName,
        titulo: bulletinTitle(item),
        prazoOriginal: bulletinDeadline(item),
        status: "pendente",
        solicitadaEm: serverTimestamp(),
        solicitadaEmIso: new Date().toISOString()
      },
      { merge: true }
    );

    alert(
      "O prazo deste informativo terminou. Uma solicitação de releitura foi enviada à gestão e será registrada como ocorrência de atraso."
    );
    return;
  }

  const legacyRecord =
    `${person.name} (${new Date().toLocaleString("pt-BR")} | Por: ${profile.email || intel.user.email})`;

  await updateDoc(
    doc(db, item.collectionName, item.id),
    { leituras: arrayUnion(legacyRecord) }
  );

  await setDoc(
    doc(db, "leituras-informativos", readingId(item, person.uid)),
    {
      uid: person.uid,
      nome: person.name,
      setor: person.sector,
      bulletinId: item.id,
      collectionName: item.collectionName,
      titulo: bulletinTitle(item),
      prazoLeitura: deadline,
      lidoEm: serverTimestamp(),
      lidoEmIso: new Date().toISOString(),
      dentroDoPrazo: !overdue,
      reaberturaUsada: requestData?.status === "aprovada"
    },
    { merge: true }
  );

  if (requestData?.status === "aprovada") {
    await setDoc(
      requestRef,
      {
        status: "concluida",
        concluidaEm: serverTimestamp()
      },
      { merge: true }
    );
  }
}

function installReadOverride() {
  window.csv2MarkRead = markReadOrRequest;
}

function bindDirectNavigation() {
  const button = document.querySelector(
    '.nav-btn[data-tab="boletins-privados"]'
  );

  if (!button || button.dataset.csvIntelBound === "1") return;

  button.dataset.csvIntelBound = "1";
  button.addEventListener("click", () => {
    setTimeout(() => scheduleRefresh(20), 50);
  });
}

function cleanup() {
  intel.unsubscribers.forEach((unsubscribe) => {
    try { unsubscribe(); } catch (_) {}
  });
  intel.unsubscribers = [];
}

let refreshTimer = null;

function refreshAll() {
  installReadOverride();
  renderHomeCard();

  const directTab = document.getElementById("tab-boletins-privados");

  if (
    intel.isAdmin &&
    directTab?.classList.contains("active")
  ) {
    renderAdminDashboard();
  }

  renderCollaboratorAlert();
}

function scheduleRefresh(delay = 90) {
  clearTimeout(refreshTimer);

  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    refreshAll();
  }, delay);
}

function subscribe() {
  cleanup();

  intel.unsubscribers.push(
    onSnapshot(collection(db, "colaboradores"), (snapshot) => {
      intel.collaborators = snapshot.docs.map((item) => ({
        id: item.id,
        data: item.data()
      }));
      scheduleRefresh();
    })
  );

  if (intel.isAdmin) {
    intel.unsubscribers.push(
      onSnapshot(collection(db, "usuarios"), (snapshot) => {
        intel.users = snapshot.docs.map((item) => ({
          id: item.id,
          data: item.data()
        }));
        scheduleRefresh();
      })
    );
  } else {
    intel.users = [
      {
        id: intel.user.uid,
        data: {
          nome: currentName(),
          setor: currentSector(),
          ativo: true
        }
      }
    ];
  }

  intel.unsubscribers.push(
    onSnapshot(collection(db, "boletins"), (snapshot) => {
      intel.bulletins = snapshot.docs.map((item) => ({
        id: item.id,
        collectionName: "boletins",
        data: item.data()
      }));
      scheduleRefresh();
    })
  );

  const privateRef = intel.isAdmin
    ? collection(db, "boletins-privados")
    : query(
        collection(db, "boletins-privados"),
        where("Para qual Colaborador?", "==", currentName())
      );

  intel.unsubscribers.push(
    onSnapshot(privateRef, (snapshot) => {
      intel.privateBulletins = snapshot.docs.map((item) => ({
        id: item.id,
        collectionName: "boletins-privados",
        data: item.data()
      }));
      scheduleRefresh();
    })
  );

  const readingsRef = intel.isAdmin
    ? collection(db, "leituras-informativos")
    : query(
        collection(db, "leituras-informativos"),
        where("uid", "==", intel.user.uid)
      );

  intel.unsubscribers.push(
    onSnapshot(readingsRef, (snapshot) => {
      intel.readings = snapshot.docs.map((item) => ({
        id: item.id,
        data: item.data()
      }));
      scheduleRefresh();
    })
  );

  const rereadRef = intel.isAdmin
    ? collection(db, "solicitacoes-releitura")
    : query(
        collection(db, "solicitacoes-releitura"),
        where("uid", "==", intel.user.uid)
      );

  intel.unsubscribers.push(
    onSnapshot(rereadRef, (snapshot) => {
      intel.rereadRequests = snapshot.docs.map((item) => ({
        id: item.id,
        data: item.data()
      }));
      scheduleRefresh();
    })
  );

  if (!intel.isAdmin) {
    const noticeRef = query(
      collection(db, "avisos-leitura"),
      where("uid", "==", intel.user.uid)
    );

    intel.unsubscribers.push(
      onSnapshot(noticeRef, (snapshot) => {
        intel.notices = snapshot.docs.map((item) => ({
          id: item.id,
          data: item.data()
        }));
        scheduleRefresh();
      })
    );
  }
}

async function loadProfile(user) {
  const snapshot = await getDoc(doc(db, "usuarios", user.uid));
  return snapshot.exists() ? snapshot.data() : null;
}

async function handleAuth(user) {
  intel.user = user;

  if (!user) {
    intel.profile = null;
    intel.isAdmin = false;
    cleanup();
    return;
  }

  intel.profile = await loadProfile(user);
  intel.isAdmin =
    intel.profile?.admin === true ||
    String(user.email || "").toLowerCase().endsWith("@clinica.com");

  bindDirectNavigation();
  installReadOverride();
  subscribe();

  [120, 500].forEach((delay) => {
    setTimeout(() => scheduleRefresh(30), delay);
  });
}

function init() {
  bindDirectNavigation();
  installReadOverride();

  onAuthStateChanged(auth, handleAuth);

  console.log(
    `CSV Bulletin Intelligence ${CSV_INTELLIGENCE_VERSION} carregado.`
  );
}

window.csvBulletinIntelligence = intel;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
