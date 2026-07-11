const CSV_DIRECT_MODERN_VERSION = "7.2.1";

const directModernState = {
  search: "",
  status: "all",
  observer: null,
  wrapped: false,
  attempts: 0
};

function dmEscape(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function dmNormalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function dmPrivateItems() {
  return Array.isArray(window.todosPrivadosData)
    ? window.todosPrivadosData
    : [];
}

function dmTargetName(item) {
  return String(
    item?.data?.["Para qual Colaborador?"] ||
    item?.data?.publicoPessoas?.[0] ||
    item?.data?.nomeColaborador ||
    "Sem colaborador"
  ).trim();
}

function dmReadNames(item) {
  return new Set(
    (Array.isArray(item?.data?.leituras) ? item.data.leituras : [])
      .map((entry) => String(entry).split(" (")[0].trim())
      .filter(Boolean)
  );
}

function dmIsRead(item) {
  const target = dmTargetName(item);
  return dmReadNames(item).has(target) || dmReadNames(item).size > 0;
}

function dmDeadline(item) {
  return String(
    item?.data?.prazoLeitura ||
    item?.data?.["Prazo para Leitura"] ||
    ""
  ).trim();
}

function dmIsOverdue(item) {
  if (dmIsRead(item)) return false;

  const raw = dmDeadline(item);
  if (!raw) return false;

  const deadline = new Date(`${raw}T23:59:59`);
  return !Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now();
}

function dmMetrics() {
  const items = dmPrivateItems();
  const collaborators = new Set(
    items.map(dmTargetName).filter(Boolean).map(dmNormalize)
  );

  const read = items.filter(dmIsRead).length;
  const pending = items.length - read;
  const overdue = items.filter(dmIsOverdue).length;

  return {
    total: items.length,
    collaborators: collaborators.size,
    read,
    pending,
    overdue,
    rate: items.length ? Math.round((read / items.length) * 100) : 0
  };
}

function dmItemsForName(name) {
  const normalized = dmNormalize(name);

  return dmPrivateItems().filter(
    (item) => dmNormalize(dmTargetName(item)) === normalized
  );
}

function dmEnsureHero() {
  const view = document.getElementById("privados-view-folders");
  if (!view) return null;

  let hero = document.getElementById("csv-direct-modern-hero");

  if (!hero) {
    hero = document.createElement("section");
    hero.id = "csv-direct-modern-hero";
    hero.className = "csv-direct-modern-hero";
    view.insertBefore(hero, view.firstChild);
  }

  hero.innerHTML = `
    <div class="csv-direct-modern-hero-copy">
      <span class="csv-direct-modern-eyebrow">
        <i class="ri-shield-user-line"></i>
        Gestão de comunicação individual
      </span>
      <h2>Central de Informativos Direcionados</h2>
      <p>
        Acompanhe documentos individuais, prazos, leituras e pendências
        em uma visão mais limpa e organizada.
      </p>
    </div>

    <div class="csv-direct-modern-hero-actions">
      <button
        type="button"
        class="csv-direct-modern-secondary"
        onclick="window.renderizarGraficoPrivadosGeral?.()"
      >
        <i class="ri-refresh-line"></i>
        Atualizar painel
      </button>

      <button
        type="button"
        class="csv-direct-modern-primary admin-only"
        onclick="window.abrirModal?.('boletins-privados')"
      >
        <i class="ri-add-line"></i>
        Novo informativo
      </button>
    </div>
  `;

  return hero;
}

function dmEnsureKpis() {
  const view = document.getElementById("privados-view-folders");
  const hero = dmEnsureHero();
  if (!view || !hero) return null;

  let holder = document.getElementById("csv-direct-modern-kpis");

  if (!holder) {
    holder = document.createElement("section");
    holder.id = "csv-direct-modern-kpis";
    holder.className = "csv-direct-modern-kpis";
    hero.insertAdjacentElement("afterend", holder);
  }

  return holder;
}

function dmRenderKpis() {
  const holder = dmEnsureKpis();
  if (!holder) return;

  const metrics = dmMetrics();

  holder.innerHTML = `
    <article class="featured">
      <div>
        <span>Informativos ativos</span>
        <strong>${metrics.total}</strong>
        <small>documentos direcionados</small>
      </div>
      <i class="ri-file-user-line"></i>
    </article>

    <article>
      <div>
        <span>Colaboradores</span>
        <strong>${metrics.collaborators}</strong>
        <small>com pasta individual</small>
      </div>
      <i class="ri-team-line"></i>
    </article>

    <article>
      <div>
        <span>Leituras concluídas</span>
        <strong>${metrics.read}</strong>
        <small>${metrics.rate}% de conclusão</small>
      </div>
      <i class="ri-checkbox-circle-line"></i>
    </article>

    <article class="${metrics.pending ? "warning" : ""}">
      <div>
        <span>Pendências</span>
        <strong>${metrics.pending}</strong>
        <small>${metrics.overdue} vencida(s)</small>
      </div>
      <i class="ri-time-line"></i>
    </article>
  `;
}

function dmEnsureSectionHeading() {
  const view = document.getElementById("privados-view-folders");
  const grid = document.getElementById("grid-privados-folders");
  if (!view || !grid) return;

  let heading = document.getElementById("csv-direct-modern-list-heading");

  if (!heading) {
    heading = document.createElement("section");
    heading.id = "csv-direct-modern-list-heading";
    heading.className = "csv-direct-modern-list-heading";

    grid.insertAdjacentElement("beforebegin", heading);
  }

  heading.innerHTML = `
    <div>
      <span>Pastas individuais</span>
      <h3>Colaboradores e acompanhamento</h3>
      <p>Pesquise uma pessoa ou filtre pelo andamento das leituras.</p>
    </div>

    <div class="csv-direct-modern-filters">
      <label>
        <i class="ri-search-line"></i>
        <input
          id="csv-direct-modern-search"
          placeholder="Pesquisar colaborador..."
          value="${dmEscape(directModernState.search)}"
        >
      </label>

      <select id="csv-direct-modern-status">
        <option value="all">Todos</option>
        <option value="pending">Com pendências</option>
        <option value="read">Leituras em dia</option>
        <option value="overdue">Prazo vencido</option>
      </select>
    </div>
  `;

  const search = document.getElementById("csv-direct-modern-search");
  const status = document.getElementById("csv-direct-modern-status");

  if (status) status.value = directModernState.status;

  search?.addEventListener("input", (event) => {
    directModernState.search = event.target.value;
    dmApplyFolderFilters();
  });

  status?.addEventListener("change", (event) => {
    directModernState.status = event.target.value;
    dmApplyFolderFilters();
  });
}

function dmFolderName(card) {
  const preferred =
    card.querySelector(
      ".folder-title, .folder-name, .shortcut-title, h2, h3, h4, strong"
    )?.textContent;

  return String(preferred || card.textContent || "")
    .replace(/Documentos:\s*\d+/gi, "")
    .replace(/Lidos:\s*\d+/gi, "")
    .replace(/Pendentes:\s*\d+/gi, "")
    .trim();
}

function dmDecorateFolderCards() {
  const grid = document.getElementById("grid-privados-folders");
  if (!grid) return;

  grid.classList.add("csv-direct-modern-grid");

  [...grid.children].forEach((card) => {
    if (!(card instanceof HTMLElement)) return;

    card.classList.add("csv-direct-modern-person-card");

    const name = dmFolderName(card);
    const items = dmItemsForName(name);
    const read = items.filter(dmIsRead).length;
    const pending = Math.max(0, items.length - read);
    const overdue = items.filter(dmIsOverdue).length;
    const rate = items.length ? Math.round((read / items.length) * 100) : 0;

    card.dataset.csvDirectName = dmNormalize(name);
    card.dataset.csvDirectStatus =
      overdue > 0 ? "overdue" : pending > 0 ? "pending" : "read";

    let summary = card.querySelector(".csv-direct-modern-card-summary");

    if (!summary) {
      summary = document.createElement("div");
      summary.className = "csv-direct-modern-card-summary";
      card.appendChild(summary);
    }

    summary.innerHTML = `
      <div class="csv-direct-modern-progress">
        <i style="width:${rate}%"></i>
      </div>

      <div class="csv-direct-modern-card-metrics">
        <span><strong>${items.length}</strong>Total</span>
        <span><strong>${read}</strong>Lidos</span>
        <span class="${pending ? "warning" : ""}">
          <strong>${pending}</strong>Pendentes
        </span>
      </div>

      <span class="csv-direct-modern-card-status ${card.dataset.csvDirectStatus}">
        <i class="${
          overdue
            ? "ri-alarm-warning-line"
            : pending
              ? "ri-time-line"
              : "ri-checkbox-circle-line"
        }"></i>
        ${
          overdue
            ? `${overdue} vencido(s)`
            : pending
              ? "Acompanhamento pendente"
              : "Leituras em dia"
        }
      </span>
    `;
  });

  dmApplyFolderFilters();
}

function dmApplyFolderFilters() {
  const grid = document.getElementById("grid-privados-folders");
  if (!grid) return;

  const query = dmNormalize(directModernState.search);
  const status = directModernState.status;

  [...grid.children].forEach((card) => {
    if (!(card instanceof HTMLElement)) return;

    const matchesSearch =
      !query ||
      String(card.dataset.csvDirectName || "").includes(query);

    const cardStatus = card.dataset.csvDirectStatus || "read";
    const matchesStatus =
      status === "all" ||
      status === cardStatus ||
      (status === "pending" &&
        ["pending", "overdue"].includes(cardStatus));

    card.style.display =
      matchesSearch && matchesStatus ? "" : "none";
  });
}

function dmDecorateLegacyStructure() {
  const view = document.getElementById("privados-view-folders");
  if (!view) return;

  const chartBox = view.querySelector(":scope > .chart-box");
  if (chartBox) {
    chartBox.classList.add("csv-direct-modern-chart-card");

    const title = chartBox.querySelector("h3");
    if (title) {
      title.innerHTML = `
        <span>Visão de gestão</span>
        <strong>Motivos e ocorrências individuais</strong>
      `;
    }
  }

  const oldToolbar = [...view.children].find((child) =>
    child.classList?.contains("flex-between") &&
    child.querySelector?.("#grid-privados-folders") === null
  );

  if (
    oldToolbar &&
    oldToolbar !== document.getElementById("csv-direct-modern-list-heading")
  ) {
    oldToolbar.classList.add("csv-direct-modern-legacy-toolbar");
  }
}

function dmRestyleChart() {
  if (
    typeof window.Chart === "undefined" ||
    typeof window.Chart.getChart !== "function"
  ) {
    return;
  }

  const canvas = document.getElementById("chart-privados-geral");
  if (!canvas) return;

  const chart = window.Chart.getChart(canvas);
  if (!chart) return;

  const palette = [
    "#6f5bd3",
    "#8f72e8",
    "#5577d8",
    "#42a7a5",
    "#e6a23c",
    "#dc5d69",
    "#9b6edb",
    "#3f8bd6"
  ];

  chart.data.datasets.forEach((dataset) => {
    dataset.backgroundColor = (dataset.data || []).map(
      (_, index) => palette[index % palette.length]
    );
    dataset.borderColor = "transparent";
    dataset.borderWidth = 0;
    dataset.borderRadius = 12;
    dataset.borderSkipped = false;
    dataset.maxBarThickness = 52;
  });

  chart.options = chart.options || {};
  chart.options.responsive = true;
  chart.options.maintainAspectRatio = false;
  chart.options.animation = {
    duration: 450,
    easing: "easeOutQuart"
  };

  chart.options.plugins = chart.options.plugins || {};
  chart.options.plugins.legend = {
    display: false
  };

  chart.options.plugins.tooltip = {
    backgroundColor: "#17162c",
    titleColor: "#ffffff",
    bodyColor: "#d9d9ea",
    padding: 12,
    cornerRadius: 12,
    displayColors: false
  };

  chart.options.scales = chart.options.scales || {};
  chart.options.scales.x = {
    ...chart.options.scales.x,
    grid: { display: false },
    ticks: {
      color: "#a9a8c0",
      font: { size: 10, family: "Poppins" }
    },
    border: { display: false }
  };

  chart.options.scales.y = {
    ...chart.options.scales.y,
    beginAtZero: true,
    grid: {
      color: "rgba(255,255,255,.08)",
      drawBorder: false
    },
    ticks: {
      color: "#a9a8c0",
      precision: 0,
      font: { size: 10, family: "Poppins" }
    },
    border: { display: false }
  };

  chart.update("none");
}

function dmRefresh() {
  dmEnsureHero();
  dmRenderKpis();
  dmDecorateLegacyStructure();
  dmEnsureSectionHeading();
  dmDecorateFolderCards();

  setTimeout(dmRestyleChart, 60);
  setTimeout(dmRestyleChart, 240);
}

function dmObserveGrid() {
  const grid = document.getElementById("grid-privados-folders");
  if (!grid || directModernState.observer) return;

  directModernState.observer = new MutationObserver(() => {
    clearTimeout(dmObserveGrid.timer);
    dmObserveGrid.timer = setTimeout(() => {
      dmRenderKpis();
      dmDecorateFolderCards();
    }, 80);
  });

  directModernState.observer.observe(grid, {
    childList: true
  });
}

function dmWrapLegacyFunctions() {
  if (directModernState.wrapped) return;

  const functionNames = [
    "renderizarPastasPrivados",
    "renderizarGraficoPrivadosGeral"
  ];

  let wrappedAny = false;

  functionNames.forEach((name) => {
    const original = window[name];

    if (
      typeof original !== "function" ||
      original.__csvDirectModernWrapped
    ) {
      return;
    }

    const wrapped = function(...args) {
      const result = original.apply(this, args);
      setTimeout(dmRefresh, 90);
      return result;
    };

    wrapped.__csvDirectModernWrapped = true;
    wrapped.__csvDirectModernOriginal = original;
    window[name] = wrapped;
    wrappedAny = true;
  });

  if (wrappedAny) {
    directModernState.wrapped = functionNames.every(
      (name) =>
        typeof window[name] !== "function" ||
        window[name].__csvDirectModernWrapped
    );
  }
}

function dmBindNavigation() {
  const button = document.querySelector(
    '.nav-btn[data-tab="boletins-privados"]'
  );

  if (!button || button.dataset.csvDirectModernBound === "1") return;

  button.dataset.csvDirectModernBound = "1";

  button.addEventListener("click", () => {
    setTimeout(dmRefresh, 80);
    setTimeout(dmRefresh, 350);
  });
}

function dmInit() {
  dmBindNavigation();
  dmWrapLegacyFunctions();
  dmRefresh();
  dmObserveGrid();

  const retry = setInterval(() => {
    directModernState.attempts += 1;
    dmBindNavigation();
    dmWrapLegacyFunctions();
    dmObserveGrid();

    if (
      directModernState.attempts >= 24 ||
      (
        directModernState.wrapped &&
        document.getElementById("grid-privados-folders")
      )
    ) {
      clearInterval(retry);
    }
  }, 500);

  console.log(
    `CSV Direct Modern ${CSV_DIRECT_MODERN_VERSION} carregado.`
  );
}

window.csvDirectModernRefresh = dmRefresh;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", dmInit);
} else {
  dmInit();
}
