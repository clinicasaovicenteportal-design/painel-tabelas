const CSV_BULLETINS_UNIFIED_VERSION = "7.5.0";

const DIRECT_TAB_ID = "tab-boletins-privados";
const DIRECT_NAV_SELECTOR =
  '.sidebar-nav .nav-btn[data-tab="boletins-privados"]';

let directTabOriginalParent = null;
let directTabOriginalNext = null;
let observerTimer = null;

function phaseState() {
  return window.csvPhase2State || {};
}

function isAdmin() {
  return phaseState().isAdmin === true;
}

function hideDirectNavigation() {
  document.querySelectorAll(DIRECT_NAV_SELECTOR).forEach((button) => {
    button.remove();
  });

  const generalButton = document.querySelector(
    '.sidebar-nav .nav-btn[data-tab="boletins"]'
  );

  if (
    generalButton &&
    !generalButton.textContent.includes("Boletins e Informativos")
  ) {
    generalButton.innerHTML =
      '<i class="ri-newspaper-line"></i> Boletins e Informativos';
  }
}

function enhanceGeneralHeader() {
  const root = document.getElementById("csv2-bulletins-root");
  if (!root) return;

  const title = root.querySelector(".csv2-page-header h2");
  const description = root.querySelector(".csv2-page-header p");
  const actions = root.querySelector(".csv2-header-actions");

  if (title && isAdmin()) {
    title.textContent =
      "Boletins gerais, setoriais e direcionados";
  }

  if (description && isAdmin()) {
    description.textContent =
      "Cadastre tudo em uma única central e acompanhe " +
      "leituras, prazos e destinatários.";
  }

  root
    .querySelectorAll(
      '#csv2-admin-bulletin-filters [data-filter="pessoas"]'
    )
    .forEach((button) => {
      button.textContent = "Direcionados";
    });

  if (
    actions &&
    isAdmin() &&
    !document.getElementById("csv-unified-monitor-button")
  ) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "csv-unified-monitor-button";
    button.className = "csv2-button secondary csv-unified-monitor-button";
    button.innerHTML =
      '<i class="ri-dashboard-3-line"></i> ' +
      "Acompanhamento direcionados";
    button.addEventListener("click", openUnifiedMonitor);

    actions.prepend(button);
  }
}

function ensurePriorityOptions() {
  const select = document.getElementById("csv2-b-type");
  if (!select || select.dataset.csvUnifiedPriority === "1") return;

  const selected = select.value || "Informativo";

  const options = [
    ["Informativo", "Rotina / informativo"],
    ["Aviso", "Aviso"],
    ["Atenção", "Atenção"],
    ["Importante", "Importante"],
    ["Urgente", "Urgente"],
    ["Crítico", "Crítico"],
    ["Norma", "Norma"],
    ["Regra", "Regra"],
    ["Comunicado", "Comunicado"]
  ];

  select.innerHTML = options
    .map(
      ([value, label]) =>
        `<option value="${value}">${label}</option>`
    )
    .join("");

  select.value = options.some(([value]) => value === selected)
    ? selected
    : "Informativo";

  const label = select.closest("label");
  const labelTitle = label?.querySelector(":scope > span");

  if (labelTitle) {
    labelTitle.textContent = "Grau / classificação";
  }

  if (label && !label.querySelector(".csv-unified-field-help")) {
    const help = document.createElement("small");
    help.className = "csv-unified-field-help";
    help.textContent =
      "Define o nível de atenção que será mostrado ao colaborador.";
    label.appendChild(help);
  }

  select.dataset.csvUnifiedPriority = "1";
}

function enhanceAudienceField() {
  const select = document.getElementById("csv2-b-audience");
  if (!select) return;

  const label = select.closest("label");
  const title = label?.querySelector(":scope > span");

  if (title) {
    title.textContent = "Destino do boletim";
  }

  const labels = {
    todos: "Toda a clínica",
    setores: "Setor(es) específico(s)",
    pessoas: "Colaborador(es) direcionado(s)"
  };

  [...select.options].forEach((option) => {
    if (labels[option.value]) {
      option.textContent = labels[option.value];
    }
  });

  const peopleHeading = document.querySelector(
    "#csv2-target-people .csv2-section-label"
  );

  if (peopleHeading) {
    peopleHeading.textContent =
      "Selecione quem receberá este boletim direcionado";
  }

  const sectorHeading = document.querySelector(
    "#csv2-target-sectors .csv2-section-label"
  );

  if (sectorHeading) {
    sectorHeading.textContent =
      "Selecione um ou mais setores";
  }
}

function enhanceBulletinForm() {
  ensurePriorityOptions();
  enhanceAudienceField();

  const form = document.getElementById("csv2-bulletin-form");
  if (!form || form.dataset.csvUnifiedForm === "1") return;

  const audience = document.getElementById("csv2-b-audience");

  const updateModalTone = () => {
    const card = form.closest(".csv2-modal-card");

    card?.classList.toggle(
      "csv-unified-is-direct",
      audience?.value === "pessoas"
    );
  };

  audience?.addEventListener("change", updateModalTone);
  updateModalTone();

  form.dataset.csvUnifiedForm = "1";
}

function ensureMonitorModal() {
  let modal = document.getElementById("csv-unified-monitor-modal");

  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "csv-unified-monitor-modal";
  modal.className = "csv-unified-monitor-modal";
  modal.innerHTML = `
    <div class="csv-unified-monitor-card">
      <header class="csv-unified-monitor-header">
        <div>
          <span>
            <i class="ri-user-star-line"></i>
            Gestão de informativos direcionados
          </span>
          <h2>Acompanhamento individual</h2>
          <p>
            Leituras, pendências, prazos, releituras e evolução
            permanecem dentro da Central de Boletins.
          </p>
        </div>

        <button
          type="button"
          id="csv-unified-monitor-close"
          aria-label="Fechar acompanhamento"
        >
          <i class="ri-close-line"></i>
        </button>
      </header>

      <div
        id="csv-unified-monitor-stage"
        class="csv-unified-monitor-stage"
      ></div>
    </div>
  `;

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeUnifiedMonitor();
    }
  });

  modal
    .querySelector("#csv-unified-monitor-close")
    ?.addEventListener("click", closeUnifiedMonitor);

  document.body.appendChild(modal);

  return modal;
}

function moveDirectTabToMonitor() {
  const directTab = document.getElementById(DIRECT_TAB_ID);
  const stage = document.getElementById(
    "csv-unified-monitor-stage"
  );

  if (!directTab || !stage) return null;

  if (!directTabOriginalParent) {
    directTabOriginalParent = directTab.parentNode;
    directTabOriginalNext = directTab.nextSibling;
  }

  stage.appendChild(directTab);

  directTab.style.setProperty("display", "block", "important");
  directTab.classList.add("active", "csv-unified-direct-stage");

  return directTab;
}

function restoreDirectTab() {
  const directTab = document.getElementById(DIRECT_TAB_ID);

  if (!directTab || !directTabOriginalParent) return;

  if (
    directTabOriginalNext &&
    directTabOriginalNext.parentNode === directTabOriginalParent
  ) {
    directTabOriginalParent.insertBefore(
      directTab,
      directTabOriginalNext
    );
  } else {
    directTabOriginalParent.appendChild(directTab);
  }

  directTab.classList.remove(
    "active",
    "csv-unified-direct-stage"
  );
  directTab.style.setProperty("display", "none", "important");
}

function renderMonitor() {
  window.csvIntelRefreshAdmin?.();

  [120, 350, 800].forEach((delay) => {
    setTimeout(() => {
      window.csvIntelRefreshAdmin?.();
    }, delay);
  });
}

function openUnifiedMonitor() {
  if (!isAdmin()) return;

  const modal = ensureMonitorModal();
  modal.classList.add("is-open");
  document.body.classList.add("csv-unified-modal-open");

  moveDirectTabToMonitor();
  renderMonitor();
}

function closeUnifiedMonitor() {
  const modal = document.getElementById(
    "csv-unified-monitor-modal"
  );

  modal?.classList.remove("is-open");
  document.body.classList.remove("csv-unified-modal-open");

  restoreDirectTab();

  window.irParaAba?.("boletins");

  setTimeout(() => {
    window.csv2EnsureBulletinExperience?.();
  }, 60);
}

function wrapIntelligenceActions() {
  const createDirect = window.csvIntelCreateDirect;

  if (
    typeof createDirect === "function" &&
    !createDirect.__csvUnifiedWrapped
  ) {
    const wrapped = function(...args) {
      closeUnifiedMonitor();
      return createDirect.apply(this, args);
    };

    wrapped.__csvUnifiedWrapped = true;
    wrapped.__csvUnifiedOriginal = createDirect;
    window.csvIntelCreateDirect = wrapped;
  }

  const openGeneral = window.csvIntelOpenGeneralManager;

  if (
    typeof openGeneral === "function" &&
    !openGeneral.__csvUnifiedWrapped
  ) {
    const wrapped = function(...args) {
      closeUnifiedMonitor();
      return openGeneral.apply(this, args);
    };

    wrapped.__csvUnifiedWrapped = true;
    wrapped.__csvUnifiedOriginal = openGeneral;
    window.csvIntelOpenGeneralManager = wrapped;
  }
}

function keepUnified() {
  hideDirectNavigation();
  enhanceGeneralHeader();
  enhanceBulletinForm();
  wrapIntelligenceActions();
}

function init() {
  hideDirectNavigation();

  const observer = new MutationObserver(() => {
    clearTimeout(observerTimer);

    observerTimer = setTimeout(() => {
      keepUnified();
    }, 45);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  [80, 220, 500, 1000, 2200].forEach((delay) => {
    setTimeout(keepUnified, delay);
  });

  window.csvUnifiedOpenDirectMonitor = openUnifiedMonitor;
  window.csvUnifiedCloseDirectMonitor = closeUnifiedMonitor;

  console.log(
    `CSV Bulletins Unified ${CSV_BULLETINS_UNIFIED_VERSION} carregado.`
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
