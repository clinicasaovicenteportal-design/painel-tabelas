const CSV_UI_REFRESH_VERSION = "7.4.0";

const uiState = {
  direct: {
    search: "",
    status: "all",
    selected: "",
    legacy: false,
    chart: null
  },
  imaging: {
    search: "",
    modality: "Todos",
    region: "Todas",
    selected: "",
    legacy: false
  },
  values: {
    institutos: { search: "", category: "Todas", legacy: false },
    consultas: { search: "", category: "Todas", legacy: false },
    pacotes: { search: "", category: "Todas", legacy: false }
  },
  fingerprints: new Map(),
  timers: new Map(),
  convenioObserver: null,
  ramalObserver: null
};

const VALUE_CONFIG = {
  institutos: {
    title: "Tabela Instituto",
    eyebrow: "Central de valores",
    description:
      "Consulte tabelas, valores, profissionais, especialidades e regras em uma visualização organizada.",
    icon: "ri-building-4-line",
    addLabel: "Nova tabela",
    addCollection: "institutos",
    titleFields: ["Número da Tabela", "Profissional", "Especialidade"],
    categoryFields: ["Número da Tabela", "Especialidade"],
    valueFields: ["Valor da Tabela", "Valor"],
    fields: [
      ["Número da Tabela", "Número da Tabela"],
      ["Valor da Tabela", "Valor da Tabela"],
      ["Profissional", "Profissional"],
      ["Especialidade", "Especialidade"],
      ["Restrição de Idade", "Restrição de Idade"],
      ["CRM", "CRM"],
      ["CBO", "CBO"],
      ["URA", "URA"],
      ["Outros", "Outros"]
    ]
  },
  consultas: {
    title: "Consultas e Procedimentos",
    eyebrow: "Serviços e valores",
    description:
      "Encontre procedimentos, códigos, valores, profissionais responsáveis e orientações.",
    icon: "ri-stethoscope-line",
    addLabel: "Novo procedimento",
    addCollection: "consultas",
    titleFields: ["Descrição", "Tipo", "Procedimento"],
    categoryFields: ["Tipo"],
    valueFields: ["Valor", "Valor ou Informacao"],
    fields: [
      ["Tipo", "Tipo"],
      ["Código", "Código"],
      ["Descrição", "Descrição"],
      ["Valor", "Valor"],
      ["Profissionais", "Profissionais que realizam (Opcional)"],
      ["Observações", "Observações"]
    ]
  },
  pacotes: {
    title: "Pacotes do Pronto-Socorro",
    eyebrow: "Pacotes e composições",
    description:
      "Visualize valores, itens inclusos, kits e observações dos pacotes disponíveis.",
    icon: "ri-first-aid-kit-line",
    addLabel: "Novo pacote",
    addCollection: "pacotes",
    titleFields: ["Descrição", "Pacotes", "Kit"],
    categoryFields: ["Pacotes", "Kit"],
    valueFields: ["Valor ou Informacao", "Valor"],
    fields: [
      ["Descrição", "Descrição"],
      ["Valor", "Valor ou Informacao"],
      ["Itens inclusos", "O que está incluso"],
      ["Observações", "Observações"],
      ["Pacote", "Pacotes"],
      ["Kit", "Kit"]
    ]
  }
};

const MODALITY_RULES = [
  ["Raio-X", ["raio x", "raio-x", "radiografia", "rx"]],
  ["Ultrassom", ["ultrassom", "ultra-som", "usg", "doppler"]],
  ["Tomografia", ["tomografia", "tomografico", "tc"]],
  ["Ressonância", ["ressonancia", "rm"]],
  ["Mamografia", ["mamografia", "mamario"]],
  ["Doppler", ["doppler"]],
  ["Ecocardiograma", ["ecocardiograma", "ecocardio"]]
];

const REGION_RULES = [
  ["Cabeça", ["cabeca", "cranio", "cerebro", "face", "seios da face"]],
  ["Pescoço", ["pescoco", "tireoide", "cervical"]],
  ["Tórax", ["torax", "pulmao", "pulmoes", "costela", "mediastino"]],
  ["Coração", ["coracao", "cardiaco", "aorta"]],
  ["Mama", ["mama", "mamografia", "seio"]],
  ["Abdômen", ["abdomen", "figado", "vesicula", "pancreas", "rim", "renal", "estomago"]],
  ["Pelve", ["pelve", "utero", "ovario", "prostata", "bexiga", "transvaginal", "obstetrico"]],
  ["Coluna", ["coluna", "lombar", "toracica", "dorsal", "sacro", "vertebra"]],
  ["Membros Superiores", ["ombro", "braco", "cotovelo", "antebraco", "mao", "punho"]],
  ["Membros Inferiores", ["quadril", "joelho", "perna", "tibia", "tornozelo", "pe"]]
];

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
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstValue(data, fields, fallback = "") {
  for (const field of fields) {
    const value = data?.[field];
    if (Array.isArray(value) && value.length) return value.join(", ");
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return fallback;
}

function itemsFrom(name) {
  const candidates = [
    window.dadosGlobaisAbas?.[name],
    window.todosOsDadosDoSistema?.[name]
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) {
      return value.map((item, index) => ({
        id: item?.id || `${name}-${index}`,
        data: item?.data || item || {},
        collectionName: name
      }));
    }
  }

  if (name === "boletins-privados" && Array.isArray(window.todosPrivadosData)) {
    return window.todosPrivadosData.map((item, index) => ({
      id: item?.id || `privado-${index}`,
      data: item?.data || item || {},
      collectionName: "boletins-privados"
    }));
  }

  return [];
}

function isAdmin() {
  if (window.csvPhase2State?.isAdmin === true) return true;

  const button = document.getElementById("btn-nav-ajustes");
  return Boolean(
    button &&
    getComputedStyle(button).display !== "none"
  );
}

function collectionFingerprint(items) {
  return JSON.stringify(
    items.map((item) => [
      item.id,
      Object.keys(item.data || {}).length,
      firstValue(item.data, [
        "Título do Documento",
        "Descrição",
        "Exame",
        "Nome do Exame",
        "Número da Tabela",
        "Tipo",
        "Valor",
        "Valor da Tabela",
        "Valor ou Informacao"
      ]),
      Array.isArray(item.data?.leituras) ? item.data.leituras.length : 0
    ])
  );
}

function hideElement(id, hidden = true) {
  const element = document.getElementById(id);
  if (element) element.style.display = hidden ? "none" : "";
}

function ensureModal() {
  let modal = document.getElementById("csv-ui-detail-modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "csv-ui-detail-modal";
    modal.className = "csv-ui-detail-modal";
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
    document.body.appendChild(modal);
  }

  return modal;
}

function closeModal() {
  const modal = document.getElementById("csv-ui-detail-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.innerHTML = "";
}

window.csvUiCloseModal = closeModal;

function openModal(markup) {
  const modal = ensureModal();
  modal.innerHTML = `
    <div class="csv-ui-detail-card">
      <button
        type="button"
        class="csv-ui-modal-close"
        onclick="window.csvUiCloseModal()"
        aria-label="Fechar"
      >
        <i class="ri-close-line"></i>
      </button>
      ${markup}
    </div>
  `;
  modal.classList.add("open");
}

/* =========================================================
   INFORMATIVOS DIRETOS
   ========================================================= */

function directTarget(item) {
  return firstValue(
    item.data,
    [
      "Para qual Colaborador?",
      "nomeColaborador",
      "destinatarioNome"
    ],
    asArray(item.data?.publicoPessoas)[0] || "Sem colaborador"
  );
}

function directTitle(item) {
  return firstValue(
    item.data,
    ["Título do Documento", "Título do Informativo", "titulo"],
    "Informativo"
  );
}

function directRead(item) {
  return Array.isArray(item.data?.leituras) && item.data.leituras.length > 0;
}

function directDeadline(item) {
  return firstValue(
    item.data,
    ["prazoLeitura", "Prazo para Leitura"],
    ""
  );
}

function directOverdue(item) {
  if (directRead(item)) return false;
  const raw = directDeadline(item);
  if (!raw) return false;
  const date = new Date(`${raw}T23:59:59`);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function directReason(item) {
  return firstValue(item.data, ["Motivo", "motivo"], "Outros");
}

function directType(item) {
  return firstValue(
    item.data,
    ["Tipo (Urgente, Norma, Regra, etc)", "tipo"],
    "Informativo"
  );
}

function directMaterials(item) {
  return asArray(
    firstValue(item.data, ["Links dos Materiais (1 por linha)", "links"], "")
  );
}

function directGroups(items) {
  const map = new Map();

  items.forEach((item) => {
    const name = directTarget(item);
    const key = normalize(name);
    if (!map.has(key)) map.set(key, { name, items: [] });
    map.get(key).items.push(item);
  });

  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR")
  );
}

function ensureDirectRoot() {
  const tab = document.getElementById("tab-boletins-privados");
  if (!tab) return null;

  let root = document.getElementById("csv-direct-dashboard");

  if (!root) {
    root = document.createElement("div");
    root.id = "csv-direct-dashboard";
    root.className = "csv-direct-dashboard";
    tab.insertBefore(root, tab.firstChild);
  }

  return root;
}

function renderDirectDashboard(force = false) {
  const root = ensureDirectRoot();
  if (!root || uiState.direct.legacy) return;

  const items = itemsFrom("boletins-privados");
  const fingerprint = collectionFingerprint(items);

  if (
    !force &&
    uiState.fingerprints.get("direct") === fingerprint &&
    root.dataset.rendered === "1"
  ) {
    return;
  }

  uiState.fingerprints.set("direct", fingerprint);
  root.dataset.rendered = "1";

  hideElement("privados-view-folders", true);
  hideElement("privados-view-list", true);

  const groups = directGroups(items);
  const read = items.filter(directRead).length;
  const pending = items.length - read;
  const overdue = items.filter(directOverdue).length;
  const rate = items.length ? Math.round((read / items.length) * 100) : 0;

  root.innerHTML = `
    <header class="csv-direct-hero">
      <div>
        <span class="csv-ui-eyebrow">
          <i class="ri-user-star-line"></i>
          Gestão de comunicação individual
        </span>
        <h2>Informativos Diretos</h2>
        <p>
          Acompanhe documentos individuais, leituras, pendências,
          prazos e evolução por colaborador.
        </p>
      </div>

      <div class="csv-ui-actions">
        <button
          type="button"
          class="secondary"
          onclick="window.csvUiToggleDirectLegacy()"
        >
          <i class="ri-settings-3-line"></i>
          Gerenciar documentos
        </button>

        <button
          type="button"
          class="primary admin-only"
          style="${isAdmin() ? "" : "display:none"}"
          onclick="window.abrirModal?.('boletins-privados')"
        >
          <i class="ri-add-line"></i>
          Novo informativo
        </button>
      </div>
    </header>

    <section class="csv-direct-kpis">
      <article class="featured">
        <span>Informativos ativos</span>
        <strong>${items.length}</strong>
        <small>documentos direcionados</small>
        <i class="ri-file-user-line"></i>
      </article>

      <article>
        <span>Colaboradores</span>
        <strong>${groups.length}</strong>
        <small>pastas individuais</small>
        <i class="ri-team-line"></i>
      </article>

      <article>
        <span>Leituras concluídas</span>
        <strong>${read}</strong>
        <small>${rate}% de conclusão</small>
        <i class="ri-checkbox-circle-line"></i>
      </article>

      <article class="${pending ? "warning" : ""}">
        <span>Pendências</span>
        <strong>${pending}</strong>
        <small>${overdue} vencida(s)</small>
        <i class="ri-time-line"></i>
      </article>
    </section>

    <section class="csv-direct-analytics">
      <div class="csv-direct-chart-card">
        <div class="csv-ui-section-head">
          <div>
            <span>Visão geral</span>
            <h3>Ocorrências por motivo</h3>
            <p>Distribuição dos informativos individuais cadastrados.</p>
          </div>
          <span class="csv-direct-rate">${rate}% em dia</span>
        </div>
        <div class="csv-direct-chart-wrap">
          <canvas id="csv-direct-chart"></canvas>
        </div>
      </div>

      <aside class="csv-direct-status-card">
        <span>Resumo de leitura</span>
        <h3>${pending ? "Atenção necessária" : "Tudo em dia"}</h3>
        <p>
          ${
            pending
              ? `${pending} informativo(s) aguardam leitura.`
              : "Todos os documentos cadastrados possuem leitura."
          }
        </p>

        <div class="csv-direct-ring" style="--progress:${rate}">
          <strong>${rate}%</strong>
          <small>conclusão</small>
        </div>

        <div class="csv-direct-mini-metrics">
          <span><i class="read"></i>${read} lidos</span>
          <span><i class="pending"></i>${pending} pendentes</span>
          <span><i class="overdue"></i>${overdue} vencidos</span>
        </div>
      </aside>
    </section>

    <section class="csv-direct-people">
      <div class="csv-ui-section-head csv-direct-people-head">
        <div>
          <span>Pastas individuais</span>
          <h3>Colaboradores e acompanhamento</h3>
          <p>Pesquise uma pessoa ou filtre pelo andamento das leituras.</p>
        </div>

        <div class="csv-direct-filters">
          <label>
            <i class="ri-search-line"></i>
            <input
              id="csv-direct-search"
              value="${esc(uiState.direct.search)}"
              placeholder="Pesquisar colaborador..."
            >
          </label>

          <select id="csv-direct-status">
            <option value="all">Todos</option>
            <option value="pending">Com pendências</option>
            <option value="read">Leituras em dia</option>
            <option value="overdue">Prazo vencido</option>
          </select>
        </div>
      </div>

      <div id="csv-direct-person-grid" class="csv-direct-person-grid"></div>
    </section>

    <section id="csv-direct-person-detail" class="csv-direct-person-detail"></section>
  `;

  const status = document.getElementById("csv-direct-status");
  if (status) status.value = uiState.direct.status;

  document
    .getElementById("csv-direct-search")
    ?.addEventListener("input", (event) => {
      uiState.direct.search = event.target.value;
      renderDirectPeople(groups);
    });

  status?.addEventListener("change", (event) => {
    uiState.direct.status = event.target.value;
    renderDirectPeople(groups);
  });

  renderDirectChart(items);
  renderDirectPeople(groups);
}

function renderDirectChart(items) {
  const canvas = document.getElementById("csv-direct-chart");
  if (!canvas || typeof window.Chart === "undefined") return;

  const counts = new Map();

  items.forEach((item) => {
    const reason = directReason(item);
    counts.set(reason, (counts.get(reason) || 0) + 1);
  });

  const rows = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  uiState.direct.chart?.destroy?.();

  uiState.direct.chart = new window.Chart(canvas, {
    type: "bar",
    data: {
      labels: rows.map(([label]) => label),
      datasets: [{
        data: rows.map(([, value]) => value),
        backgroundColor: [
          "#6d5ae6",
          "#4477de",
          "#36a675",
          "#efa83b",
          "#dc5866",
          "#38a8a4",
          "#9a69d5",
          "#7d8ba5"
        ],
        borderRadius: 11,
        borderSkipped: false,
        maxBarThickness: 54
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 420 },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          backgroundColor: "#171b2e",
          padding: 12,
          cornerRadius: 12
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: "#8a94a8",
            font: { family: "Poppins", size: 9 }
          }
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: "rgba(126,139,164,.12)" },
          ticks: {
            precision: 0,
            color: "#8a94a8",
            font: { family: "Poppins", size: 9 }
          }
        }
      }
    }
  });
}

function directGroupStatus(group) {
  const total = group.items.length;
  const read = group.items.filter(directRead).length;
  const overdue = group.items.filter(directOverdue).length;
  const pending = total - read;

  return {
    total,
    read,
    pending,
    overdue,
    rate: total ? Math.round((read / total) * 100) : 100,
    status: overdue ? "overdue" : pending ? "pending" : "read"
  };
}

function renderDirectPeople(groups) {
  const grid = document.getElementById("csv-direct-person-grid");
  if (!grid) return;

  const query = normalize(uiState.direct.search);
  const statusFilter = uiState.direct.status;

  const filtered = groups.filter((group) => {
    const metrics = directGroupStatus(group);
    const searchOk = !query || normalize(group.name).includes(query);
    const statusOk =
      statusFilter === "all" ||
      statusFilter === metrics.status ||
      (
        statusFilter === "pending" &&
        ["pending", "overdue"].includes(metrics.status)
      );

    return searchOk && statusOk;
  });

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="csv-ui-empty">
        <i class="ri-user-search-line"></i>
        <strong>Nenhum colaborador encontrado</strong>
        <span>Altere a pesquisa ou o filtro de andamento.</span>
      </div>
    `;
    renderDirectPersonDetail(null);
    return;
  }

  if (
    !uiState.direct.selected ||
    !filtered.some(
      (group) => normalize(group.name) === uiState.direct.selected
    )
  ) {
    uiState.direct.selected = normalize(filtered[0].name);
  }

  grid.innerHTML = filtered.map((group) => {
    const metrics = directGroupStatus(group);
    const initials = group.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

    return `
      <button
        type="button"
        class="csv-direct-person-card ${
          uiState.direct.selected === normalize(group.name) ? "selected" : ""
        } ${metrics.status}"
        onclick="window.csvUiSelectDirectPerson('${esc(normalize(group.name))}')"
      >
        <span class="csv-direct-avatar">${esc(initials || "C")}</span>

        <span class="csv-direct-person-copy">
          <strong>${esc(group.name)}</strong>
          <small>${metrics.total} documento(s) direcionado(s)</small>

          <span class="csv-direct-person-progress">
            <i style="width:${metrics.rate}%"></i>
          </span>

          <span class="csv-direct-person-metrics">
            <em>${metrics.read} lidos</em>
            <em>${metrics.pending} pendentes</em>
          </span>
        </span>

        <span class="csv-direct-person-badge">
          ${
            metrics.overdue
              ? `${metrics.overdue} vencido(s)`
              : metrics.pending
                ? "Acompanhamento"
                : "Em dia"
          }
        </span>
      </button>
    `;
  }).join("");

  const selected = groups.find(
    (group) => normalize(group.name) === uiState.direct.selected
  );

  renderDirectPersonDetail(selected || filtered[0]);
}

window.csvUiSelectDirectPerson = function(key) {
  uiState.direct.selected = key;
  renderDirectDashboard(true);
};

function renderDirectPersonDetail(group) {
  const holder = document.getElementById("csv-direct-person-detail");
  if (!holder) return;

  if (!group) {
    holder.innerHTML = "";
    return;
  }

  const items = [...group.items].sort((a, b) =>
    firstValue(b.data, ["Data de Publicação"], "")
      .localeCompare(firstValue(a.data, ["Data de Publicação"], ""))
  );

  holder.innerHTML = `
    <div class="csv-ui-section-head">
      <div>
        <span>Detalhamento individual</span>
        <h3>${esc(group.name)}</h3>
        <p>Documentos, prazos e situação de leitura.</p>
      </div>
    </div>

    <div class="csv-direct-doc-grid">
      ${items.map((item) => {
        const read = directRead(item);
        const overdue = directOverdue(item);
        const deadline = directDeadline(item);
        const links = directMaterials(item);

        return `
          <article class="csv-direct-doc-card ${read ? "read" : overdue ? "overdue" : "pending"}">
            <div class="csv-direct-doc-top">
              <span class="csv-direct-doc-icon">
                <i class="ri-file-user-line"></i>
              </span>

              <div>
                <small>${esc(directType(item))}</small>
                <h4>${esc(directTitle(item))}</h4>
                <p>${esc(directReason(item))}</p>
              </div>
            </div>

            <div class="csv-direct-doc-meta">
              <span>
                <i class="ri-calendar-line"></i>
                ${esc(firstValue(item.data, ["Data de Publicação"], "Sem data"))}
              </span>

              <span>
                <i class="ri-time-line"></i>
                ${deadline ? `Prazo ${esc(deadline)}` : "Sem prazo"}
              </span>
            </div>

            <div class="csv-direct-doc-footer">
              <span class="${read ? "read" : overdue ? "overdue" : "pending"}">
                <i class="${read ? "ri-checkbox-circle-line" : overdue ? "ri-alarm-warning-line" : "ri-time-line"}"></i>
                ${read ? "Lido" : overdue ? "Prazo vencido" : "Pendente"}
              </span>

              ${
                links.length
                  ? `
                    <button
                      type="button"
                      onclick="window.open('${esc(links[0])}','_blank','noopener')"
                    >
                      Abrir material
                      <i class="ri-arrow-right-up-line"></i>
                    </button>
                  `
                  : ""
              }
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

window.csvUiToggleDirectLegacy = function() {
  uiState.direct.legacy = !uiState.direct.legacy;

  const root = document.getElementById("csv-direct-dashboard");

  if (uiState.direct.legacy) {
    if (root) root.style.display = "none";
    hideElement("privados-view-folders", false);
    hideElement("privados-view-list", true);
  } else {
    if (root) root.style.display = "";
    hideElement("privados-view-folders", true);
    hideElement("privados-view-list", true);
    renderDirectDashboard(true);
  }
};

/* =========================================================
   EXAMES DE IMAGEM — SEM ATLAS
   ========================================================= */

function imagingItems() {
  return [
    ...itemsFrom("exames-imagem"),
    ...itemsFrom("ultrassom")
  ].map((item) => {
    const data = item.data || {};
    const text = normalize([
      item.collectionName,
      firstValue(data, ["Categoria do Exame", "Nome do Exame", "Exame", "Descrição"]),
      firstValue(data, ["Região do Corpo", "Sub-região / Órgão", "Observações", "Observação"])
    ].join(" "));

    let modality =
      item.collectionName === "ultrassom" ? "Ultrassom" : "Outros";

    for (const [label, terms] of MODALITY_RULES) {
      if (terms.some((term) => text.includes(term))) {
        modality = label;
        break;
      }
    }

    let region = firstValue(data, ["Região do Corpo"], "");

    if (!region) {
      for (const [label, terms] of REGION_RULES) {
        if (terms.some((term) => text.includes(term))) {
          region = label;
          break;
        }
      }
    }

    return {
      ...item,
      title: firstValue(
        data,
        ["Nome do Exame", "Exame", "Descrição", "Categoria do Exame"],
        "Procedimento de imagem"
      ),
      modality,
      region: region || "Não definida",
      code: firstValue(data, ["Código"], "Não informado"),
      value: firstValue(
        data,
        ["Valor", "Valor da Tabela", "Valor ou Informacao"],
        ""
      ),
      description: firstValue(
        data,
        ["Descrição", "Observações", "Observação"],
        "Descrição ainda não cadastrada."
      ),
      preparation: firstValue(
        data,
        ["Preparação / Observações", "Preparo", "Observações", "Observação"],
        "Sem preparo específico cadastrado."
      ),
      professionals: firstValue(
        data,
        ["Profissionais que realizam (Opcional)", "Profissionais"],
        "Equipe responsável"
      ),
      report: firstValue(data, ["Prazo de Laudo"], "Consultar"),
      duration: firstValue(data, ["Duração Média", "Duração"], "Consultar"),
      agreements: firstValue(data, ["Convênios"], "Consultar cobertura"),
      result: firstValue(
        data,
        ["Onde encontrar resultado"],
        "Consultar o setor responsável"
      )
    };
  }).sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
}

function imagingIcon(modality) {
  return {
    "Raio-X": "ri-xray-line",
    "Ultrassom": "ri-pulse-line",
    "Tomografia": "ri-scan-2-line",
    "Ressonância": "ri-focus-3-line",
    "Mamografia": "ri-women-line",
    "Doppler": "ri-heart-pulse-line",
    "Ecocardiograma": "ri-heart-3-line"
  }[modality] || "ri-body-scan-line";
}

function ensureImagingRoot() {
  const tab = document.getElementById("tab-exames-imagem");
  if (!tab) return null;

  document.getElementById("csv-imaging-atlas")?.remove();

  let root = document.getElementById("csv-imaging-modern");

  if (!root) {
    root = document.createElement("div");
    root.id = "csv-imaging-modern";
    root.className = "csv-imaging-modern";
    tab.insertBefore(root, tab.firstChild);
  }

  return root;
}

function filteredImaging(items) {
  const query = normalize(uiState.imaging.search);

  return items.filter((item) => {
    const queryOk =
      !query ||
      normalize([
        item.title,
        item.code,
        item.modality,
        item.region,
        item.description,
        item.professionals,
        item.agreements
      ].join(" ")).includes(query);

    const modalityOk =
      uiState.imaging.modality === "Todos" ||
      item.modality === uiState.imaging.modality;

    const regionOk =
      uiState.imaging.region === "Todas" ||
      item.region === uiState.imaging.region;

    return queryOk && modalityOk && regionOk;
  });
}

function renderImaging(force = false) {
  const root = ensureImagingRoot();
  if (!root || uiState.imaging.legacy) return;

  const items = imagingItems();
  const fingerprint = collectionFingerprint(items);

  if (
    !force &&
    uiState.fingerprints.get("imaging") === fingerprint &&
    root.dataset.rendered === "1"
  ) {
    return;
  }

  uiState.fingerprints.set("imaging", fingerprint);
  root.dataset.rendered = "1";

  hideElement("exames-imagem-view-folders", true);
  hideElement("exames-imagem-view-list", true);

  const modalities = ["Todos", ...new Set(items.map((item) => item.modality))];
  const regions = ["Todas", ...new Set(items.map((item) => item.region))];
  const filtered = filteredImaging(items);

  if (
    !uiState.imaging.selected ||
    !items.some((item) => item.id === uiState.imaging.selected)
  ) {
    uiState.imaging.selected = filtered[0]?.id || items[0]?.id || "";
  }

  root.innerHTML = `
    <header class="csv-imaging-hero">
      <div>
        <span class="csv-ui-eyebrow">
          <i class="ri-body-scan-line"></i>
          Central de procedimentos diagnósticos
        </span>
        <h2>Exames de Imagem</h2>
        <p>
          Pesquise por procedimento, região, modalidade, código,
          profissional ou convênio.
        </p>
      </div>

      <div class="csv-ui-actions">
        <button
          type="button"
          class="secondary admin-only"
          style="${isAdmin() ? "" : "display:none"}"
          onclick="window.csvUiToggleImagingLegacy()"
        >
          <i class="ri-settings-3-line"></i>
          Gerenciar cadastros
        </button>

        <button
          type="button"
          class="primary admin-only"
          style="${isAdmin() ? "" : "display:none"}"
          onclick="window.abrirModal?.('exames-imagem')"
        >
          <i class="ri-add-line"></i>
          Novo exame
        </button>
      </div>
    </header>

    <section class="csv-imaging-kpis">
      <article class="featured">
        <span>Procedimentos</span>
        <strong>${items.length}</strong>
        <small>exames cadastrados</small>
        <i class="ri-body-scan-line"></i>
      </article>

      <article>
        <span>Modalidades</span>
        <strong>${Math.max(0, modalities.length - 1)}</strong>
        <small>tipos disponíveis</small>
        <i class="ri-scan-2-line"></i>
      </article>

      <article>
        <span>Regiões</span>
        <strong>${Math.max(0, regions.length - 1)}</strong>
        <small>áreas identificadas</small>
        <i class="ri-focus-3-line"></i>
      </article>

      <article>
        <span>Resultado atual</span>
        <strong>${filtered.length}</strong>
        <small>encontrados pelos filtros</small>
        <i class="ri-search-eye-line"></i>
      </article>
    </section>

    <section class="csv-imaging-toolbar">
      <label class="csv-ui-search">
        <i class="ri-search-line"></i>
        <input
          id="csv-imaging-search-new"
          value="${esc(uiState.imaging.search)}"
          placeholder="Buscar exame, código, órgão, profissional ou convênio..."
        >
      </label>

      <select id="csv-imaging-modality-new">
        ${modalities.map((item) => `
          <option value="${esc(item)}">${esc(item)}</option>
        `).join("")}
      </select>

      <select id="csv-imaging-region-new">
        ${regions.map((item) => `
          <option value="${esc(item)}">${esc(item)}</option>
        `).join("")}
      </select>

      <button
        type="button"
        class="csv-ui-clear"
        onclick="window.csvUiClearImaging()"
      >
        <i class="ri-filter-off-line"></i>
        Limpar
      </button>
    </section>

    <section class="csv-imaging-layout">
      <aside class="csv-imaging-category-panel">
        <div class="csv-ui-section-head">
          <div>
            <span>Modalidades</span>
            <h3>Tipos de exame</h3>
          </div>
        </div>

        <div class="csv-imaging-category-list">
          ${modalities.map((modality) => {
            const count =
              modality === "Todos"
                ? items.length
                : items.filter((item) => item.modality === modality).length;

            return `
              <button
                type="button"
                class="${uiState.imaging.modality === modality ? "active" : ""}"
                onclick="window.csvUiSetImagingModality('${esc(modality)}')"
              >
                <span>
                  <i class="${imagingIcon(modality)}"></i>
                </span>
                <strong>${esc(modality)}</strong>
                <small>${count}</small>
              </button>
            `;
          }).join("")}
        </div>
      </aside>

      <main class="csv-imaging-results">
        <div class="csv-ui-section-head">
          <div>
            <span>Procedimentos cadastrados</span>
            <h3>${filtered.length} resultado(s)</h3>
            <p>Selecione um card para visualizar todos os detalhes.</p>
          </div>
        </div>

        <div class="csv-imaging-card-grid">
          ${
            filtered.length
              ? filtered.map((item) => `
                  <button
                    type="button"
                    class="csv-imaging-exam-card"
                    onclick="window.csvUiOpenImaging('${esc(item.collectionName)}','${esc(item.id)}')"
                  >
                    <span class="csv-imaging-exam-visual ${normalize(item.modality).replace(/\s+/g, "-")}">
                      <i class="${imagingIcon(item.modality)}"></i>
                      <b></b>
                    </span>

                    <span class="csv-imaging-exam-copy">
                      <small>${esc(item.modality)} • ${esc(item.region)}</small>
                      <strong>${esc(item.title)}</strong>
                      <em>
                        ${item.value ? esc(item.value) : `Código: ${esc(item.code)}`}
                      </em>
                    </span>

                    <span class="csv-imaging-exam-arrow">
                      <i class="ri-arrow-right-up-line"></i>
                    </span>
                  </button>
                `).join("")
              : `
                <div class="csv-ui-empty">
                  <i class="ri-search-eye-line"></i>
                  <strong>Nenhum exame encontrado</strong>
                  <span>Altere a busca ou os filtros selecionados.</span>
                </div>
              `
          }
        </div>
      </main>
    </section>

    <section class="csv-imaging-region-strip">
      <div class="csv-ui-section-head">
        <div>
          <span>Pesquisa por região</span>
          <h3>Encontre o exame pelo local do corpo</h3>
        </div>
      </div>

      <div>
        ${regions.map((region) => `
          <button
            type="button"
            class="${uiState.imaging.region === region ? "active" : ""}"
            onclick="window.csvUiSetImagingRegion('${esc(region)}')"
          >
            <i class="ri-map-pin-line"></i>
            ${esc(region)}
          </button>
        `).join("")}
      </div>
    </section>
  `;

  const modalitySelect =
    document.getElementById("csv-imaging-modality-new");
  const regionSelect =
    document.getElementById("csv-imaging-region-new");

  if (modalitySelect) modalitySelect.value = uiState.imaging.modality;
  if (regionSelect) regionSelect.value = uiState.imaging.region;

  document
    .getElementById("csv-imaging-search-new")
    ?.addEventListener("input", (event) => {
      uiState.imaging.search = event.target.value;
      renderImaging(true);
    });

  modalitySelect?.addEventListener("change", (event) => {
    uiState.imaging.modality = event.target.value;
    renderImaging(true);
  });

  regionSelect?.addEventListener("change", (event) => {
    uiState.imaging.region = event.target.value;
    renderImaging(true);
  });
}

window.csvUiSetImagingModality = function(value) {
  uiState.imaging.modality = value;
  renderImaging(true);
};

window.csvUiSetImagingRegion = function(value) {
  uiState.imaging.region = value;
  renderImaging(true);
};

window.csvUiClearImaging = function() {
  uiState.imaging.search = "";
  uiState.imaging.modality = "Todos";
  uiState.imaging.region = "Todas";
  renderImaging(true);
};

window.csvUiToggleImagingLegacy = function() {
  uiState.imaging.legacy = !uiState.imaging.legacy;
  const root = document.getElementById("csv-imaging-modern");

  if (uiState.imaging.legacy) {
    if (root) root.style.display = "none";
    hideElement("exames-imagem-view-folders", false);
    hideElement("exames-imagem-view-list", true);
  } else {
    if (root) root.style.display = "";
    hideElement("exames-imagem-view-folders", true);
    hideElement("exames-imagem-view-list", true);
    renderImaging(true);
  }
};

window.csvUiOpenImaging = function(collectionName, id) {
  const item = imagingItems().find(
    (entry) =>
      entry.collectionName === collectionName &&
      entry.id === id
  );

  if (!item) return;

  openModal(`
    <div class="csv-ui-modal-hero imaging">
      <span class="csv-ui-modal-icon">
        <i class="${imagingIcon(item.modality)}"></i>
      </span>

      <div>
        <span>${esc(item.modality)} • ${esc(item.region)}</span>
        <h2>${esc(item.title)}</h2>
        <p>Código ${esc(item.code)}</p>
      </div>
    </div>

    <div class="csv-ui-modal-grid">
      <article class="wide">
        <span>Descrição</span>
        <strong>${esc(item.description)}</strong>
      </article>

      <article>
        <span>Preparação</span>
        <strong>${esc(item.preparation)}</strong>
      </article>

      <article>
        <span>Duração média</span>
        <strong>${esc(item.duration)}</strong>
      </article>

      ${
        item.value
          ? `
            <article>
              <span>Valor</span>
              <strong>${esc(item.value)}</strong>
            </article>
          `
          : ""
      }

      <article>
        <span>Prazo de laudo</span>
        <strong>${esc(item.report)}</strong>
      </article>

      <article>
        <span>Profissionais</span>
        <strong>${esc(item.professionals)}</strong>
      </article>

      <article>
        <span>Convênios</span>
        <strong>${esc(item.agreements)}</strong>
      </article>

      <article>
        <span>Onde encontrar o resultado</span>
        <strong>${esc(item.result)}</strong>
      </article>
    </div>
  `);
};

/* =========================================================
   ABAS COM VALORES
   ========================================================= */

function valueItemData(item, config) {
  const data = item.data || {};

  return {
    ...item,
    title: firstValue(data, config.titleFields, "Item sem título"),
    category: firstValue(data, config.categoryFields, "Geral"),
    value: firstValue(data, config.valueFields, "Consultar"),
    searchable: normalize(
      Object.values(data)
        .map((value) =>
          Array.isArray(value) ? value.join(" ") : String(value || "")
        )
        .join(" ")
    )
  };
}

function ensureValueRoot(name) {
  const tab = document.getElementById(`tab-${name}`);
  if (!tab) return null;

  let root = document.getElementById(`csv-value-hub-${name}`);

  if (!root) {
    root = document.createElement("div");
    root.id = `csv-value-hub-${name}`;
    root.className = "csv-value-hub";
    tab.insertBefore(root, tab.firstChild);
  }

  return root;
}

function filteredValueItems(name, items) {
  const state = uiState.values[name];
  const query = normalize(state.search);

  return items.filter((item) => {
    const queryOk = !query || item.searchable.includes(query);
    const categoryOk =
      state.category === "Todas" ||
      normalize(item.category) === normalize(state.category);

    return queryOk && categoryOk;
  });
}

function renderValueHub(name, force = false) {
  const config = VALUE_CONFIG[name];
  const state = uiState.values[name];
  const root = ensureValueRoot(name);

  if (!config || !state || !root || state.legacy) return;

  const items = itemsFrom(name).map((item) =>
    valueItemData(item, config)
  );

  const fingerprint = collectionFingerprint(items);

  if (
    !force &&
    uiState.fingerprints.get(`value-${name}`) === fingerprint &&
    root.dataset.rendered === "1"
  ) {
    return;
  }

  uiState.fingerprints.set(`value-${name}`, fingerprint);
  root.dataset.rendered = "1";

  hideElement(`${name}-view-folders`, true);
  hideElement(`${name}-view-list`, true);

  const categories = [
    "Todas",
    ...new Set(items.map((item) => item.category))
  ];

  const filtered = filteredValueItems(name, items);
  const withValue = items.filter(
    (item) =>
      item.value &&
      normalize(item.value) !== "consultar" &&
      normalize(item.value) !== "nao informado"
  ).length;

  root.innerHTML = `
    <header class="csv-value-hero">
      <div>
        <span class="csv-ui-eyebrow">
          <i class="${config.icon}"></i>
          ${esc(config.eyebrow)}
        </span>
        <h2>${esc(config.title)}</h2>
        <p>${esc(config.description)}</p>
      </div>

      <div class="csv-ui-actions">
        <button
          type="button"
          class="secondary admin-only"
          style="${isAdmin() ? "" : "display:none"}"
          onclick="window.csvUiToggleValueLegacy('${name}')"
        >
          <i class="ri-settings-3-line"></i>
          Gerenciar cadastros
        </button>

        <button
          type="button"
          class="primary admin-only"
          style="${isAdmin() ? "" : "display:none"}"
          onclick="window.abrirModal?.('${config.addCollection}')"
        >
          <i class="ri-add-line"></i>
          ${esc(config.addLabel)}
        </button>
      </div>
    </header>

    <section class="csv-value-kpis">
      <article class="featured">
        <span>Total cadastrado</span>
        <strong>${items.length}</strong>
        <small>registros disponíveis</small>
        <i class="${config.icon}"></i>
      </article>

      <article>
        <span>Categorias</span>
        <strong>${Math.max(0, categories.length - 1)}</strong>
        <small>grupos identificados</small>
        <i class="ri-layout-grid-line"></i>
      </article>

      <article>
        <span>Com valor informado</span>
        <strong>${withValue}</strong>
        <small>registros preenchidos</small>
        <i class="ri-money-dollar-circle-line"></i>
      </article>

      <article>
        <span>Resultado atual</span>
        <strong>${filtered.length}</strong>
        <small>itens encontrados</small>
        <i class="ri-search-eye-line"></i>
      </article>
    </section>

    <section class="csv-value-toolbar">
      <label class="csv-ui-search">
        <i class="ri-search-line"></i>
        <input
          id="csv-value-search-${name}"
          value="${esc(state.search)}"
          placeholder="Pesquisar descrição, profissional, código ou valor..."
        >
      </label>

      <select id="csv-value-category-${name}">
        ${categories.map((category) => `
          <option value="${esc(category)}">${esc(category)}</option>
        `).join("")}
      </select>

      <button
        type="button"
        class="csv-ui-clear"
        onclick="window.csvUiClearValue('${name}')"
      >
        <i class="ri-filter-off-line"></i>
        Limpar
      </button>
    </section>

    <section class="csv-value-content">
      <div class="csv-ui-section-head">
        <div>
          <span>Informações organizadas</span>
          <h3>${filtered.length} resultado(s)</h3>
          <p>Clique em um card para visualizar todos os campos cadastrados.</p>
        </div>
      </div>

      <div class="csv-value-card-grid">
        ${
          filtered.length
            ? filtered.map((item, index) => `
                <button
                  type="button"
                  class="csv-value-card tone-${index % 4}"
                  onclick="window.csvUiOpenValue('${name}','${esc(item.id)}')"
                >
                  <span class="csv-value-card-icon">
                    <i class="${config.icon}"></i>
                  </span>

                  <span class="csv-value-card-copy">
                    <small>${esc(item.category)}</small>
                    <strong>${esc(item.title)}</strong>
                    <em>${esc(item.value)}</em>
                  </span>

                  <span class="csv-value-card-arrow">
                    <i class="ri-arrow-right-up-line"></i>
                  </span>
                </button>
              `).join("")
            : `
              <div class="csv-ui-empty">
                <i class="ri-search-eye-line"></i>
                <strong>Nenhuma informação encontrada</strong>
                <span>Altere a pesquisa ou a categoria selecionada.</span>
              </div>
            `
        }
      </div>
    </section>
  `;

  const category = document.getElementById(
    `csv-value-category-${name}`
  );

  if (category) category.value = state.category;

  document
    .getElementById(`csv-value-search-${name}`)
    ?.addEventListener("input", (event) => {
      state.search = event.target.value;
      renderValueHub(name, true);
    });

  category?.addEventListener("change", (event) => {
    state.category = event.target.value;
    renderValueHub(name, true);
  });
}

window.csvUiClearValue = function(name) {
  if (!uiState.values[name]) return;
  uiState.values[name].search = "";
  uiState.values[name].category = "Todas";
  renderValueHub(name, true);
};

window.csvUiToggleValueLegacy = function(name) {
  const state = uiState.values[name];
  if (!state) return;

  state.legacy = !state.legacy;
  const root = document.getElementById(`csv-value-hub-${name}`);

  if (state.legacy) {
    if (root) root.style.display = "none";
    hideElement(`${name}-view-folders`, false);
    hideElement(`${name}-view-list`, true);
  } else {
    if (root) root.style.display = "";
    hideElement(`${name}-view-folders`, true);
    hideElement(`${name}-view-list`, true);
    renderValueHub(name, true);
  }
};

window.csvUiOpenValue = function(name, id) {
  const config = VALUE_CONFIG[name];
  const item = itemsFrom(name).find((entry) => entry.id === id);
  if (!config || !item) return;

  const prepared = valueItemData(item, config);

  openModal(`
    <div class="csv-ui-modal-hero value">
      <span class="csv-ui-modal-icon">
        <i class="${config.icon}"></i>
      </span>

      <div>
        <span>${esc(prepared.category)}</span>
        <h2>${esc(prepared.title)}</h2>
        <p>${esc(prepared.value)}</p>
      </div>
    </div>

    <div class="csv-ui-modal-grid">
      ${config.fields.map(([label, field]) => {
        const value = item.data?.[field];
        if (
          value === undefined ||
          value === null ||
          String(value).trim() === ""
        ) return "";

        return `
          <article class="${label === "Itens inclusos" || label === "Observações" ? "wide" : ""}">
            <span>${esc(label)}</span>
            <strong>${esc(Array.isArray(value) ? value.join(", ") : value)}</strong>
          </article>
        `;
      }).join("")}
    </div>
  `);
};

/* =========================================================
   CONVÊNIOS — RESULTADOS DA BUSCA
   ========================================================= */

function convenioItems() {
  return itemsFrom("convenios").map((item) => ({
    ...item,
    plan: firstValue(
      item.data,
      ["Convênio", "Nome do Convênio", "nome", "convenio"],
      "Sem convênio"
    ),
    code: firstValue(item.data, ["Código", "codigo"], ""),
    service: firstValue(
      item.data,
      ["Serviço", "Procedimento", "servico"],
      ""
    ),
    note: firstValue(
      item.data,
      ["Observações", "observacoes", "Aceita o Servico?"],
      ""
    )
  }));
}

function ensureConvenioQuickResults() {
  const input = document.getElementById("csv-plan-search");
  const summary = document.getElementById("csv-plan-search-summary");

  if (!input || !summary) return;

  let holder = document.getElementById("csv-plan-quick-results");

  if (!holder) {
    holder = document.createElement("div");
    holder.id = "csv-plan-quick-results";
    holder.className = "csv-plan-quick-results";
    summary.insertAdjacentElement("afterend", holder);
  }

  const render = () => {
    const query = normalize(input.value);
    const items = convenioItems();

    if (!query) {
      holder.innerHTML = "";
      holder.style.display = "none";
      return;
    }

    const matches = items.filter((item) =>
      normalize([
        item.plan,
        item.code,
        item.service,
        item.note
      ].join(" ")).includes(query)
    );

    holder.style.display = "";

    holder.innerHTML = `
      <div class="csv-plan-quick-heading">
        <div>
          <span>Resultados exatos</span>
          <strong>${matches.length} correspondência(s)</strong>
        </div>
        <small>Pesquisado: “${esc(input.value)}”</small>
      </div>

      <div class="csv-plan-quick-list">
        ${
          matches.length
            ? matches.slice(0, 40).map((item) => `
                <button
                  type="button"
                  onclick="window.csvUiSelectConvenioResult('${esc(item.plan)}','${esc(item.service)}')"
                >
                  <span class="csv-plan-quick-icon">
                    <i class="ri-shield-cross-line"></i>
                  </span>

                  <span>
                    <strong>${esc(item.plan)}</strong>
                    <small>${esc(item.service || "Informação do convênio")}</small>
                    <em>${item.code ? `Código ${esc(item.code)}` : esc(item.note)}</em>
                  </span>

                  <i class="ri-arrow-right-s-line"></i>
                </button>
              `).join("")
            : `
              <div class="csv-plan-quick-empty">
                <i class="ri-search-eye-line"></i>
                Nenhum convênio ou procedimento encontrado.
              </div>
            `
        }
      </div>
    `;
  };

  if (input.dataset.csvQuickBound !== "1") {
    input.dataset.csvQuickBound = "1";
    input.addEventListener("input", () => {
      clearTimeout(ensureConvenioQuickResults.timer);
      ensureConvenioQuickResults.timer = setTimeout(render, 70);
    });
  }

  render();
}

window.csvUiSelectConvenioResult = function(planName, serviceName) {
  const normalizedPlan = normalize(planName);

  const button = [...document.querySelectorAll(".csv-plan-list-item")]
    .find((element) =>
      normalize(element.textContent).includes(normalizedPlan)
    );

  button?.click();
  button?.scrollIntoView({ behavior: "smooth", block: "center" });

  setTimeout(() => {
    const rows = [...document.querySelectorAll(".csv-procedure-row")];
    const row = rows.find((element) =>
      normalize(element.textContent).includes(normalize(serviceName))
    );

    if (row) {
      row.classList.add("csv-procedure-highlight");
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(
        () => row.classList.remove("csv-procedure-highlight"),
        2400
      );
    }
  }, 120);
};

/* =========================================================
   RAMAIS — VIDRO
   ========================================================= */

function decorateRamais() {
  const grid = document.getElementById("grid-ramais-agrupado");
  if (!grid) return;

  grid.classList.add("csv-ramais-glass-grid");

  [...grid.children].forEach((card, index) => {
    if (!(card instanceof HTMLElement)) return;
    card.classList.add("csv-ramal-glass-card");
    card.style.setProperty("--ramal-index", String(index));

    card.querySelectorAll(
      ".card, .item-card, .folder-card, article, li"
    ).forEach((inner) => {
      inner.classList.add("csv-ramal-inner-glass");
    });
  });

  if (!uiState.ramalObserver) {
    uiState.ramalObserver = new MutationObserver(() => {
      clearTimeout(decorateRamais.timer);
      decorateRamais.timer = setTimeout(decorateRamais, 80);
    });

    uiState.ramalObserver.observe(grid, {
      childList: true,
      subtree: true
    });
  }
}

/* =========================================================
   NAVEGAÇÃO E CICLO
   ========================================================= */

function activeTabName() {
  return document.querySelector(".nav-btn.active")?.dataset?.tab || "";
}

function renderActive(force = false) {
  const tab = activeTabName();

  if (tab === "boletins-privados") {
    renderDirectDashboard(force);
  }

  if (tab === "exames-imagem") {
    renderImaging(force);
  }

  if (VALUE_CONFIG[tab]) {
    renderValueHub(tab, force);
  }

  if (tab === "convenios") {
    ensureConvenioQuickResults();
  }

  if (tab === "contatos") {
    decorateRamais();
  }
}

function bindNavigation() {
  document.querySelectorAll(".nav-btn[data-tab]").forEach((button) => {
    if (button.dataset.csvUiRefreshBound === "1") return;

    button.dataset.csvUiRefreshBound = "1";
    button.addEventListener("click", () => {
      setTimeout(() => renderActive(true), 70);
      setTimeout(() => renderActive(true), 350);
    });
  });
}

function removeStartupError() {
  document.getElementById("csv-startup-error")?.remove();
}

function init() {
  removeStartupError();
  bindNavigation();

  ensureDirectRoot();
  ensureImagingRoot();

  Object.keys(VALUE_CONFIG).forEach(ensureValueRoot);

  setTimeout(() => renderActive(true), 100);
  setTimeout(() => renderActive(true), 550);

  setInterval(() => {
    removeStartupError();
    bindNavigation();
    renderActive(false);

    if (document.getElementById("csv-plan-search")) {
      ensureConvenioQuickResults();
    }

    if (document.getElementById("grid-ramais-agrupado")) {
      decorateRamais();
    }
  }, 1600);

  console.log(
    `CSV UI Refresh ${CSV_UI_REFRESH_VERSION} carregado.`
  );
}

window.csvUiRefresh = {
  version: CSV_UI_REFRESH_VERSION,
  renderActive,
  renderDirectDashboard,
  renderImaging,
  renderValueHub
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
