const CSV_IMAGING_ATLAS_VERSION = "7.3.0";

const imagingState = {
  items: [],
  sourceItems: {
    "exames-imagem": [],
    "ultrassom": []
  },
  search: "",
  modality: "Todos",
  region: "Todas",
  audience: "Masculino",
  view: "frente",
  selectedId: "",
  legacyMode: false,
  subscriptions: [],
  three: {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    bodyGroup: null,
    hotspots: [],
    raycaster: null,
    pointer: null,
    resizeObserver: null,
    frame: 0,
    ready: false
  }
};

const MODALITIES = [
  { key: "Todos", icon: "ri-layout-grid-line", label: "Todos" },
  { key: "Raio-X", icon: "ri-xray-line", label: "Raio-X" },
  { key: "Ultrassom", icon: "ri-pulse-line", label: "Ultrassom" },
  { key: "Tomografia", icon: "ri-scan-2-line", label: "Tomografia" },
  { key: "Ressonância", icon: "ri-focus-3-line", label: "Ressonância" },
  { key: "Mamografia", icon: "ri-women-line", label: "Mamografia" },
  { key: "Doppler", icon: "ri-heart-pulse-line", label: "Doppler" },
  { key: "Ecocardiograma", icon: "ri-heart-3-line", label: "Ecocardiograma" }
];

const REGIONS = [
  { key: "Todas", label: "Todas", icon: "ri-body-scan-line" },
  { key: "Cabeça", label: "Cabeça", icon: "ri-user-3-line" },
  { key: "Pescoço", label: "Pescoço", icon: "ri-focus-2-line" },
  { key: "Tórax", label: "Tórax", icon: "ri-lungs-line" },
  { key: "Coração", label: "Coração", icon: "ri-heart-pulse-line" },
  { key: "Mama", label: "Mama", icon: "ri-women-line" },
  { key: "Abdômen", label: "Abdômen", icon: "ri-capsule-line" },
  { key: "Pelve", label: "Pelve", icon: "ri-focus-3-line" },
  { key: "Coluna", label: "Coluna", icon: "ri-align-vertically" },
  { key: "Ombro", label: "Ombro", icon: "ri-arrow-left-right-line" },
  { key: "Braço", label: "Braço", icon: "ri-hand-heart-line" },
  { key: "Mão", label: "Mão", icon: "ri-hand-line" },
  { key: "Quadril", label: "Quadril", icon: "ri-focus-line" },
  { key: "Joelho", label: "Joelho", icon: "ri-run-line" },
  { key: "Perna", label: "Perna", icon: "ri-walk-line" },
  { key: "Pé", label: "Pé", icon: "ri-footprint-line" }
];

const REGION_POSITIONS = {
  "Cabeça": [0, 3.7, 0.52],
  "Pescoço": [0, 2.95, 0.48],
  "Tórax": [-0.28, 2.12, 0.62],
  "Coração": [0.22, 1.92, 0.7],
  "Mama": [0.38, 2.15, 0.72],
  "Abdômen": [0.05, 1.0, 0.65],
  "Pelve": [0, 0.12, 0.58],
  "Coluna": [0, 1.3, -0.64],
  "Ombro": [1.02, 2.35, 0.25],
  "Braço": [1.28, 1.2, 0.28],
  "Mão": [1.35, -0.15, 0.25],
  "Quadril": [0.58, 0.02, 0.38],
  "Joelho": [0.43, -2.05, 0.4],
  "Perna": [-0.42, -2.72, 0.3],
  "Pé": [0.42, -3.77, 0.46]
};

const REGION_ALIASES = {
  "Cabeça": [
    "cabeca", "cranio", "cerebro", "encefalo", "face", "seios da face",
    "orbita", "mandibula", "maxilar", "dente", "odont", "ouvido"
  ],
  "Pescoço": [
    "pescoco", "cervical", "tireoide", "carotida", "laringe", "faringe"
  ],
  "Tórax": [
    "torax", "pulmao", "pulmoes", "costela", "mediastino", "pleura",
    "bronquio", "bronquios", "esterno"
  ],
  "Coração": [
    "coracao", "cardiaco", "cardiaca", "ecocardiograma", "eco", "aorta"
  ],
  "Mama": [
    "mama", "mamografia", "mamario", "mamaria", "seio", "seios"
  ],
  "Abdômen": [
    "abdomen", "abdominal", "figado", "vesicula", "pancreas", "baco",
    "rim", "rins", "renal", "estomago", "intestino", "apendice"
  ],
  "Pelve": [
    "pelve", "pelvico", "pelvica", "utero", "ovario", "ovarios",
    "prostata", "bexiga", "transvaginal", "obstetrico", "gestacional"
  ],
  "Coluna": [
    "coluna", "lombar", "toracica", "dorsal", "sacra", "sacro",
    "vertebra", "vertebral"
  ],
  "Ombro": ["ombro", "clavicula", "escapula"],
  "Braço": ["braco", "cotovelo", "antebraco", "umero", "radio", "ulna"],
  "Mão": ["mao", "maos", "punho", "dedo", "dedos", "carpo"],
  "Quadril": ["quadril", "bacia", "femur proximal"],
  "Joelho": ["joelho", "patela", "rotula", "menisco"],
  "Perna": ["perna", "tibia", "fibula", "panturrilha", "tornozelo"],
  "Pé": ["pe", "pes", "calcaneo", "metatarso", "pododactilo"]
};

function escapeHtml(value = "") {
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

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function stringValue(data, keys, fallback = "") {
  for (const key of keys) {
    const value = data?.[key];

    if (Array.isArray(value) && value.length) {
      return value.join(", ");
    }

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim()
    ) {
      return String(value).trim();
    }
  }

  return fallback;
}

function directDriveImage(url = "") {
  const value = String(url || "").trim();
  if (!value) return "";

  const fileMatch =
    value.match(/\/file\/d\/([^/]+)/) ||
    value.match(/[?&]id=([^&]+)/);

  if (fileMatch?.[1]) {
    return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w1200`;
  }

  return value;
}

function inferModality(item) {
  const data = item.data || {};
  const combined = normalizeText([
    item.collectionName,
    data["Categoria do Exame"],
    data["Nome do Exame"],
    data.Exame,
    data.Descrição,
    data.Observação
  ].join(" "));

  if (item.collectionName === "ultrassom") return "Ultrassom";
  if (combined.includes("mamograf")) return "Mamografia";
  if (combined.includes("doppler")) return "Doppler";
  if (
    combined.includes("ecocardi") ||
    combined.includes("eco cardi")
  ) return "Ecocardiograma";
  if (
    combined.includes("resson") ||
    combined.includes("rm ")
  ) return "Ressonância";
  if (
    combined.includes("tomograf") ||
    combined.includes(" tc ") ||
    combined.startsWith("tc ")
  ) return "Tomografia";
  if (
    combined.includes("raio x") ||
    combined.includes("raio-x") ||
    combined.includes("radiograf") ||
    combined.includes(" rx ")
  ) return "Raio-X";
  if (
    combined.includes("ultrass") ||
    combined.includes("ultra-som") ||
    combined.includes("usg")
  ) return "Ultrassom";

  return stringValue(
    data,
    ["Categoria do Exame", "Modalidade"],
    "Outros"
  );
}

function inferRegion(item) {
  const data = item.data || {};
  const explicit = stringValue(
    data,
    ["Região do Corpo", "Região", "Área do Corpo"]
  );

  if (explicit) {
    const explicitNormalized = normalizeText(explicit);
    const exact = REGIONS.find(
      (region) =>
        region.key !== "Todas" &&
        normalizeText(region.key) === explicitNormalized
    );

    if (exact) return exact.key;
  }

  const combined = normalizeText([
    explicit,
    data["Sub-região / Órgão"],
    data["Nome do Exame"],
    data.Exame,
    data["Categoria do Exame"],
    data.Descrição,
    data.Observação,
    data.Observações
  ].join(" "));

  for (const [region, aliases] of Object.entries(REGION_ALIASES)) {
    if (aliases.some((alias) => combined.includes(alias))) {
      return region;
    }
  }

  return "Tórax";
}

function inferAudience(item) {
  const data = item.data || {};
  const combined = normalizeText([
    data["Público (Masculino, Feminino, Infantil, Todos)"],
    data.Público,
    data["Restrição de Idade"],
    data["Nome do Exame"],
    data.Exame,
    data.Descrição
  ].join(" "));

  if (
    combined.includes("infantil") ||
    combined.includes("crianca") ||
    combined.includes("pediatr")
  ) return "Infantil";

  if (
    combined.includes("feminino") ||
    combined.includes("mulher") ||
    combined.includes("mama") ||
    combined.includes("mamograf") ||
    combined.includes("utero") ||
    combined.includes("ovario") ||
    combined.includes("transvaginal") ||
    combined.includes("obstetr")
  ) return "Feminino";

  if (
    combined.includes("masculino") ||
    combined.includes("homem") ||
    combined.includes("prostata")
  ) return "Masculino";

  return "Todos";
}

function examTitle(item) {
  const data = item.data || {};

  return stringValue(
    data,
    [
      "Nome do Exame",
      "Exame",
      "Serviço",
      "Descrição",
      "Categoria do Exame"
    ],
    "Procedimento de imagem"
  );
}

function prepareItem(item) {
  const data = item.data || {};
  const modality = inferModality(item);
  const region = inferRegion(item);
  const audience = inferAudience(item);

  return {
    ...item,
    modality,
    region,
    audience,
    title: examTitle(item),
    code: stringValue(data, ["Código"], "Não informado"),
    description: stringValue(
      data,
      ["Descrição", "Observação", "Observações"],
      "Descrição ainda não cadastrada."
    ),
    how: stringValue(
      data,
      ["Como é feito", "Como é realizado"],
      "Consulte o protocolo interno para orientações de realização."
    ),
    preparation: stringValue(
      data,
      [
        "Preparação / Observações",
        "Preparo",
        "Observações",
        "Observação"
      ],
      "Sem preparo específico cadastrado."
    ),
    duration: stringValue(
      data,
      ["Duração Média", "Duração"],
      "Consultar"
    ),
    radiation: stringValue(
      data,
      ["Radiação", "Nível de Radiação"],
      modality === "Raio-X" || modality === "Tomografia"
        ? "Possui"
        : "Não ionizante"
    ),
    reportTime: stringValue(
      data,
      ["Prazo de Laudo"],
      "Consultar"
    ),
    professionals: stringValue(
      data,
      [
        "Profissionais que realizam (Opcional)",
        "Profissionais"
      ],
      "Equipe responsável"
    ),
    resultLocation: stringValue(
      data,
      ["Onde encontrar resultado"],
      "Consultar o setor responsável"
    ),
    agreements: stringValue(
      data,
      ["Convênios"],
      "Consultar cobertura"
    ),
    image: directDriveImage(
      stringValue(data, ["Imagem de Referência (Link)", "Imagem"])
    ),
    subregion: stringValue(
      data,
      ["Sub-região / Órgão", "Órgão"],
      region
    )
  };
}

function mergeItems() {
  const merged = [
    ...imagingState.sourceItems["exames-imagem"],
    ...imagingState.sourceItems.ultrassom
  ];

  const map = new Map();

  merged.forEach((item) => {
    map.set(`${item.collectionName}:${item.id}`, prepareItem(item));
  });

  imagingState.items = [...map.values()].sort((a, b) =>
    a.title.localeCompare(b.title, "pt-BR")
  );

  if (
    imagingState.selectedId &&
    !imagingState.items.some(
      (item) => itemKey(item) === imagingState.selectedId
    )
  ) {
    imagingState.selectedId = "";
  }

  renderAll();
}

function itemKey(item) {
  return `${item.collectionName}:${item.id}`;
}

function globalItemsFor(collectionName) {
  const raw = window.dadosGlobaisAbas?.[collectionName];

  if (Array.isArray(raw)) {
    return raw.map((item) => ({
      ...item,
      collectionName
    }));
  }

  return [];
}

function syncFromGlobals() {
  let changed = false;

  for (const collectionName of ["exames-imagem", "ultrassom"]) {
    if (imagingState.sourceItems[collectionName].length) continue;

    const items = globalItemsFor(collectionName);

    if (items.length) {
      imagingState.sourceItems[collectionName] = items;
      changed = true;
    }
  }

  if (changed) mergeItems();
}

function subscribeCollections() {
  if (
    !window.db ||
    typeof window.collection !== "function" ||
    typeof window.onSnapshot !== "function"
  ) {
    setTimeout(subscribeCollections, 400);
    return;
  }

  if (imagingState.subscriptions.length) return;

  ["exames-imagem", "ultrassom"].forEach((collectionName) => {
    try {
      const unsubscribe = window.onSnapshot(
        window.collection(window.db, collectionName),
        (snapshot) => {
          imagingState.sourceItems[collectionName] =
            snapshot.docs.map((entry) => ({
              id: entry.id,
              data: entry.data(),
              collectionName
            }));

          mergeItems();
        },
        (error) => {
          console.warn(
            `Atlas de imagem: não foi possível acompanhar ${collectionName}.`,
            error
          );
          syncFromGlobals();
        }
      );

      imagingState.subscriptions.push(unsubscribe);
    } catch (error) {
      console.warn(
        `Atlas de imagem: falha ao iniciar ${collectionName}.`,
        error
      );
    }
  });

  syncFromGlobals();
}

function isAdminNow() {
  if (window.csvPhase2State?.isAdmin === true) return true;
  if (window.csvBulletinIntelligence?.isAdmin === true) return true;

  const adminButton = document.getElementById("btn-nav-ajustes");
  return Boolean(
    adminButton &&
    window.getComputedStyle(adminButton).display !== "none"
  );
}

function modalityCount(modality) {
  if (modality === "Todos") return imagingState.items.length;

  return imagingState.items.filter(
    (item) => item.modality === modality
  ).length;
}

function regionCount(region) {
  if (region === "Todas") return imagingState.items.length;

  return imagingState.items.filter(
    (item) => item.region === region
  ).length;
}

function audienceMatches(item) {
  return (
    item.audience === "Todos" ||
    item.audience === imagingState.audience
  );
}

function filteredItems() {
  const query = normalizeText(imagingState.search);

  return imagingState.items.filter((item) => {
    if (!audienceMatches(item)) return false;

    if (
      imagingState.modality !== "Todos" &&
      item.modality !== imagingState.modality
    ) return false;

    if (
      imagingState.region !== "Todas" &&
      item.region !== imagingState.region
    ) return false;

    if (query) {
      const searchable = normalizeText([
        item.title,
        item.code,
        item.modality,
        item.region,
        item.subregion,
        item.description,
        item.professionals,
        item.agreements
      ].join(" "));

      if (!searchable.includes(query)) return false;
    }

    return true;
  });
}

function selectedItem() {
  const filtered = filteredItems();

  if (imagingState.selectedId) {
    const selected = imagingState.items.find(
      (item) => itemKey(item) === imagingState.selectedId
    );

    if (selected) return selected;
  }

  return filtered[0] || imagingState.items[0] || null;
}

function modalityIcon(modality) {
  return MODALITIES.find((entry) => entry.key === modality)?.icon ||
    "ri-body-scan-line";
}

function regionIcon(region) {
  return REGIONS.find((entry) => entry.key === region)?.icon ||
    "ri-focus-3-line";
}

function ensureAtlas() {
  const tab = document.getElementById("tab-exames-imagem");
  if (!tab) return null;

  let root = document.getElementById("csv-imaging-atlas");

  if (!root) {
    root = document.createElement("div");
    root.id = "csv-imaging-atlas";
    root.className = "csv-imaging-atlas";

    tab.insertBefore(root, tab.firstChild);

    root.innerHTML = `
      <header class="csv-imaging-header">
        <div class="csv-imaging-header-copy">
          <span class="csv-imaging-eyebrow">
            <i class="ri-body-scan-line"></i>
            Atlas inteligente da clínica
          </span>

          <h2>Exames de Imagem</h2>

          <p>
            Localize visualmente onde cada procedimento é realizado,
            consulte orientações e encontre os exames cadastrados.
          </p>
        </div>

        <div class="csv-imaging-header-actions">
          <label class="csv-imaging-search">
            <i class="ri-search-line"></i>
            <input
              id="csv-imaging-search"
              placeholder="Buscar procedimento, código ou região..."
              autocomplete="off"
            >
            <kbd>Ctrl K</kbd>
          </label>

          <button
            type="button"
            class="csv-imaging-action secondary admin-only"
            id="csv-imaging-manage"
            style="display:none"
            onclick="window.csvImagingToggleLegacy()"
          >
            <i class="ri-settings-3-line"></i>
            Gerenciar cadastros
          </button>

          <button
            type="button"
            class="csv-imaging-action primary admin-only"
            id="csv-imaging-new"
            style="display:none"
            onclick="window.csvImagingCreate('exames-imagem')"
          >
            <i class="ri-add-line"></i>
            Novo exame
          </button>
        </div>
      </header>

      <div id="csv-imaging-modern-content">
        <section class="csv-imaging-summary" id="csv-imaging-summary"></section>

        <section class="csv-imaging-workspace">
          <aside class="csv-imaging-modalities">
            <div class="csv-imaging-panel-heading">
              <span>Modalidades</span>
              <strong>Tipos de exame</strong>
            </div>

            <div id="csv-imaging-modality-list"></div>

            <button
              type="button"
              class="csv-imaging-ultrasound-button admin-only"
              id="csv-imaging-new-ultrasound"
              style="display:none"
              onclick="window.csvImagingCreate('ultrassom')"
            >
              <i class="ri-pulse-line"></i>
              Cadastrar ultrassom
            </button>
          </aside>

          <main class="csv-imaging-viewer-card">
            <div class="csv-imaging-viewer-topbar">
              <div class="csv-imaging-audience-tabs" id="csv-imaging-audience-tabs">
                <button type="button" data-audience="Masculino">
                  <i class="ri-men-line"></i>
                  Masculino
                </button>
                <button type="button" data-audience="Feminino">
                  <i class="ri-women-line"></i>
                  Feminino
                </button>
                <button type="button" data-audience="Infantil">
                  <i class="ri-user-smile-line"></i>
                  Infantil
                </button>
              </div>

              <div class="csv-imaging-view-tabs" id="csv-imaging-view-tabs">
                <button type="button" data-view="frente">Frente</button>
                <button type="button" data-view="costas">Costas</button>
                <button type="button" data-view="lateral">Lateral</button>
              </div>
            </div>

            <div class="csv-imaging-viewer-stage" id="csv-imaging-viewer-stage">
              <div class="csv-imaging-stage-grid"></div>

              <div class="csv-imaging-viewer-status">
                <span id="csv-imaging-body-label">Modelo masculino</span>
                <strong id="csv-imaging-region-label">Corpo completo</strong>
                <small>Arraste para girar • use o scroll para aproximar</small>
              </div>

              <div id="csv-imaging-three-host"></div>

              <div id="csv-imaging-fallback" class="csv-imaging-fallback">
                <svg viewBox="0 0 320 680" aria-label="Mapa do corpo humano">
                  <defs>
                    <linearGradient id="csvBodyGradient" x1="0" x2="1">
                      <stop offset="0" stop-color="#d7e4ff"/>
                      <stop offset=".5" stop-color="#fff"/>
                      <stop offset="1" stop-color="#eadfff"/>
                    </linearGradient>
                  </defs>
                  <circle cx="160" cy="72" r="45" class="body-part"/>
                  <rect x="142" y="112" width="36" height="38" rx="16" class="body-part"/>
                  <path d="M95 150 Q160 125 225 150 L214 332 Q160 365 106 332 Z" class="body-part"/>
                  <path d="M108 330 Q160 360 212 330 L205 420 Q160 445 115 420 Z" class="body-part"/>
                  <path d="M104 162 Q68 174 56 252 L70 405 Q82 420 94 402 L92 275 Z" class="body-part"/>
                  <path d="M216 162 Q252 174 264 252 L250 405 Q238 420 226 402 L228 275 Z" class="body-part"/>
                  <path d="M120 414 L148 414 L142 620 Q128 648 113 620 Z" class="body-part"/>
                  <path d="M172 414 L200 414 L207 620 Q192 648 178 620 Z" class="body-part"/>
                  <ellipse cx="160" cy="628" rx="50" ry="17" class="body-shadow"/>
                </svg>
                <p>Visualização 2.5D ativa</p>
              </div>

              <div id="csv-imaging-hotspot-label" class="csv-imaging-hotspot-label">
                Selecione uma região
              </div>
            </div>

            <div class="csv-imaging-region-toolbar">
              <div class="csv-imaging-panel-heading">
                <span>Mapa corporal</span>
                <strong>Filtrar por região</strong>
              </div>

              <div id="csv-imaging-region-chips"></div>
            </div>
          </main>

          <aside class="csv-imaging-detail" id="csv-imaging-detail"></aside>
        </section>

        <section class="csv-imaging-browser">
          <div class="csv-imaging-browser-heading">
            <div>
              <span>Procedimentos cadastrados</span>
              <h3>Explore todos os exames</h3>
              <p id="csv-imaging-results-label">
                Os resultados são atualizados automaticamente.
              </p>
            </div>

            <button
              type="button"
              class="csv-imaging-clear"
              onclick="window.csvImagingClearFilters()"
            >
              <i class="ri-filter-off-line"></i>
              Limpar filtros
            </button>
          </div>

          <div id="csv-imaging-procedure-grid"></div>
        </section>

        <div class="csv-imaging-disclaimer">
          <i class="ri-information-line"></i>
          <span>
            Recurso educacional e operacional. A localização apresentada
            auxilia a consulta interna e não substitui protocolos técnicos,
            orientação médica ou treinamento especializado.
          </span>
        </div>
      </div>
    `;

    bindAtlasEvents();
  }

  const admin = isAdminNow();

  [
    "csv-imaging-manage",
    "csv-imaging-new",
    "csv-imaging-new-ultrasound"
  ].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.style.display = admin ? "" : "none";
  });

  return root;
}

function bindAtlasEvents() {
  document
    .getElementById("csv-imaging-search")
    ?.addEventListener("input", (event) => {
      imagingState.search = event.target.value;
      imagingState.selectedId = "";
      renderAll();
    });

  document
    .getElementById("csv-imaging-audience-tabs")
    ?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-audience]");
      if (!button) return;

      imagingState.audience = button.dataset.audience;
      imagingState.selectedId = "";
      renderAll();
      rebuildBody();
    });

  document
    .getElementById("csv-imaging-view-tabs")
    ?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-view]");
      if (!button) return;

      imagingState.view = button.dataset.view;
      renderViewerControls();
      setCameraView(imagingState.view);
    });

  document.addEventListener("keydown", (event) => {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "k"
    ) {
      event.preventDefault();
      document.getElementById("csv-imaging-search")?.focus();
    }
  });
}

function renderSummary() {
  const holder = document.getElementById("csv-imaging-summary");
  if (!holder) return;

  const modalities = unique(
    imagingState.items.map((item) => item.modality)
  ).length;

  const regions = unique(
    imagingState.items.map((item) => item.region)
  ).length;

  const professionals = unique(
    imagingState.items.flatMap((item) =>
      String(item.professionals || "")
        .split(/[,;\n]/)
        .map((value) => value.trim())
        .filter(
          (value) =>
            value &&
            value !== "Equipe responsável"
        )
    )
  ).length;

  holder.innerHTML = `
    <article class="featured">
      <div>
        <span>Procedimentos</span>
        <strong>${imagingState.items.length}</strong>
        <small>cadastros sincronizados</small>
      </div>
      <i class="ri-body-scan-line"></i>
    </article>

    <article>
      <div>
        <span>Modalidades</span>
        <strong>${modalities}</strong>
        <small>tipos de exames</small>
      </div>
      <i class="ri-scan-2-line"></i>
    </article>

    <article>
      <div>
        <span>Regiões mapeadas</span>
        <strong>${regions}</strong>
        <small>áreas do corpo</small>
      </div>
      <i class="ri-focus-3-line"></i>
    </article>

    <article>
      <div>
        <span>Profissionais</span>
        <strong>${professionals}</strong>
        <small>vínculos identificados</small>
      </div>
      <i class="ri-user-heart-line"></i>
    </article>
  `;
}

function renderModalities() {
  const holder = document.getElementById(
    "csv-imaging-modality-list"
  );

  if (!holder) return;

  holder.innerHTML = MODALITIES.map((entry) => `
    <button
      type="button"
      class="${imagingState.modality === entry.key ? "active" : ""}"
      onclick="window.csvImagingSetModality('${escapeHtml(entry.key)}')"
    >
      <span class="csv-imaging-modality-icon">
        <i class="${entry.icon}"></i>
      </span>

      <span>
        <strong>${entry.label}</strong>
        <small>${modalityCount(entry.key)} procedimento(s)</small>
      </span>

      <i class="ri-arrow-right-s-line"></i>
    </button>
  `).join("");
}

function renderRegions() {
  const holder = document.getElementById(
    "csv-imaging-region-chips"
  );

  if (!holder) return;

  holder.innerHTML = REGIONS.map((entry) => `
    <button
      type="button"
      class="${imagingState.region === entry.key ? "active" : ""}"
      onclick="window.csvImagingSetRegion('${escapeHtml(entry.key)}')"
    >
      <i class="${entry.icon}"></i>
      ${entry.label}
      <small>${regionCount(entry.key)}</small>
    </button>
  `).join("");
}

function renderViewerControls() {
  document
    .querySelectorAll("#csv-imaging-audience-tabs [data-audience]")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.audience === imagingState.audience
      );
    });

  document
    .querySelectorAll("#csv-imaging-view-tabs [data-view]")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.view === imagingState.view
      );
    });

  const bodyLabel = document.getElementById(
    "csv-imaging-body-label"
  );

  if (bodyLabel) {
    bodyLabel.textContent =
      imagingState.audience === "Infantil"
        ? "Modelo infantil"
        : `Modelo ${imagingState.audience.toLowerCase()}`;
  }

  const regionLabel = document.getElementById(
    "csv-imaging-region-label"
  );

  if (regionLabel) {
    regionLabel.textContent =
      imagingState.region === "Todas"
        ? "Corpo completo"
        : imagingState.region;
  }
}

function renderDetail() {
  const holder = document.getElementById("csv-imaging-detail");
  if (!holder) return;

  const item = selectedItem();

  if (!item) {
    holder.innerHTML = `
      <div class="csv-imaging-empty-detail">
        <i class="ri-body-scan-line"></i>
        <h3>Nenhum exame cadastrado</h3>
        <p>
          Cadastre o primeiro procedimento para começar a utilizar
          o atlas interativo.
        </p>

        ${
          isAdminNow()
            ? `
              <button
                type="button"
                onclick="window.csvImagingCreate('exames-imagem')"
              >
                <i class="ri-add-line"></i>
                Cadastrar exame
              </button>
            `
            : ""
        }
      </div>
    `;
    return;
  }

  const imageMarkup = item.image
    ? `
      <img
        src="${escapeHtml(item.image)}"
        alt="${escapeHtml(item.title)}"
        onerror="this.parentElement.classList.add('image-error');this.remove();"
      >
    `
    : `
      <div class="csv-imaging-detail-placeholder">
        <i class="${modalityIcon(item.modality)}"></i>
      </div>
    `;

  const related = imagingState.items
    .filter(
      (candidate) =>
        itemKey(candidate) !== itemKey(item) &&
        (
          candidate.region === item.region ||
          candidate.modality === item.modality
        )
    )
    .slice(0, 3);

  holder.innerHTML = `
    <div class="csv-imaging-detail-top">
      <span class="csv-imaging-detail-image">
        ${imageMarkup}
      </span>

      <div>
        <span class="csv-imaging-detail-badge">
          ${escapeHtml(item.modality)}
        </span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>
          <i class="${regionIcon(item.region)}"></i>
          ${escapeHtml(item.region)} • ${escapeHtml(item.subregion)}
        </p>
      </div>
    </div>

    <div class="csv-imaging-detail-section">
      <span>Descrição</span>
      <p>${escapeHtml(item.description)}</p>
    </div>

    <div class="csv-imaging-detail-section">
      <span>Como é realizado</span>
      <p>${escapeHtml(item.how)}</p>
    </div>

    <div class="csv-imaging-detail-section">
      <span>Preparação e observações</span>
      <div class="csv-imaging-observation">
        <i class="ri-information-line"></i>
        <p>${escapeHtml(item.preparation)}</p>
      </div>
    </div>

    <div class="csv-imaging-detail-metrics">
      <article>
        <i class="ri-time-line"></i>
        <span>Duração</span>
        <strong>${escapeHtml(item.duration)}</strong>
      </article>

      <article>
        <i class="ri-radar-line"></i>
        <span>Radiação</span>
        <strong>${escapeHtml(item.radiation)}</strong>
      </article>

      <article>
        <i class="ri-file-check-line"></i>
        <span>Laudo</span>
        <strong>${escapeHtml(item.reportTime)}</strong>
      </article>
    </div>

    <div class="csv-imaging-detail-section compact">
      <span>Equipe e cobertura</span>
      <ul>
        <li>
          <i class="ri-user-heart-line"></i>
          ${escapeHtml(item.professionals)}
        </li>
        <li>
          <i class="ri-shield-cross-line"></i>
          ${escapeHtml(item.agreements)}
        </li>
        <li>
          <i class="ri-folder-shared-line"></i>
          ${escapeHtml(item.resultLocation)}
        </li>
      </ul>
    </div>

    ${
      related.length
        ? `
          <div class="csv-imaging-related">
            <span>Procedimentos relacionados</span>
            ${related.map((candidate) => `
              <button
                type="button"
                onclick="window.csvImagingSelect('${escapeHtml(itemKey(candidate))}')"
              >
                <i class="${modalityIcon(candidate.modality)}"></i>
                <span>
                  <strong>${escapeHtml(candidate.title)}</strong>
                  <small>${escapeHtml(candidate.modality)}</small>
                </span>
                <i class="ri-arrow-right-s-line"></i>
              </button>
            `).join("")}
          </div>
        `
        : ""
    }
  `;
}

function renderProcedureGrid() {
  const holder = document.getElementById(
    "csv-imaging-procedure-grid"
  );

  const label = document.getElementById(
    "csv-imaging-results-label"
  );

  if (!holder) return;

  const items = filteredItems();

  if (label) {
    label.textContent =
      `${items.length} procedimento(s) encontrado(s). ` +
      "Os resultados são atualizados automaticamente.";
  }

  if (!items.length) {
    holder.innerHTML = `
      <div class="csv-imaging-empty-results">
        <i class="ri-search-eye-line"></i>
        <strong>Nenhum procedimento encontrado</strong>
        <span>
          Ajuste os filtros ou cadastre novas informações.
        </span>
      </div>
    `;
    return;
  }

  holder.innerHTML = items.map((item) => `
    <button
      type="button"
      class="csv-imaging-procedure-card ${
        itemKey(item) === itemKey(selectedItem()) ? "active" : ""
      }"
      onclick="window.csvImagingSelect('${escapeHtml(itemKey(item))}')"
    >
      <span class="csv-imaging-procedure-icon">
        <i class="${modalityIcon(item.modality)}"></i>
      </span>

      <span class="csv-imaging-procedure-copy">
        <small>
          ${escapeHtml(item.modality)} • ${escapeHtml(item.region)}
        </small>
        <strong>${escapeHtml(item.title)}</strong>
        <em>Código: ${escapeHtml(item.code)}</em>
      </span>

      <span class="csv-imaging-procedure-arrow">
        <i class="ri-arrow-right-up-line"></i>
      </span>
    </button>
  `).join("");
}

function renderAll() {
  const root = ensureAtlas();
  if (!root || imagingState.legacyMode) return;

  renderSummary();
  renderModalities();
  renderRegions();
  renderViewerControls();
  renderDetail();
  renderProcedureGrid();

  const selected = selectedItem();
  updateHotspotSelection(selected?.region || imagingState.region);

  if (!imagingState.three.ready) {
    startThreeViewer();
  }
}

window.csvImagingSetModality = function(modality) {
  imagingState.modality = modality;
  imagingState.selectedId = "";
  renderAll();
};

window.csvImagingSetRegion = function(region) {
  imagingState.region = region;
  imagingState.selectedId = "";

  const matching = filteredItems()[0];

  if (matching) {
    imagingState.selectedId = itemKey(matching);
  }

  renderAll();
  focusRegion(region);
};

window.csvImagingSelect = function(key) {
  const item = imagingState.items.find(
    (candidate) => itemKey(candidate) === key
  );

  if (!item) return;

  imagingState.selectedId = key;
  imagingState.region = item.region;

  renderAll();
  focusRegion(item.region);

  document
    .getElementById("csv-imaging-detail")
    ?.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
};

window.csvImagingClearFilters = function() {
  imagingState.search = "";
  imagingState.modality = "Todos";
  imagingState.region = "Todas";
  imagingState.selectedId = "";

  const input = document.getElementById("csv-imaging-search");
  if (input) input.value = "";

  renderAll();
  focusRegion("Todas");
};

window.csvImagingCreate = function(collectionName) {
  if (typeof window.abrirModal === "function") {
    window.abrirModal(collectionName);
  } else {
    alert("O formulário de cadastro ainda não terminou de carregar.");
  }
};

window.csvImagingToggleLegacy = function() {
  imagingState.legacyMode = !imagingState.legacyMode;

  const modernContent = document.getElementById(
    "csv-imaging-modern-content"
  );

  const folderView = document.getElementById(
    "exames-imagem-view-folders"
  );

  const listView = document.getElementById(
    "exames-imagem-view-list"
  );

  const button = document.getElementById("csv-imaging-manage");

  if (imagingState.legacyMode) {
    if (modernContent) modernContent.style.display = "none";
    if (folderView) folderView.style.display = "";
    if (listView) listView.style.display = "none";

    if (button) {
      button.innerHTML =
        '<i class="ri-body-scan-line"></i> Voltar ao atlas';
    }
  } else {
    if (modernContent) modernContent.style.display = "";
    if (folderView) folderView.style.display = "none";
    if (listView) listView.style.display = "none";

    if (button) {
      button.innerHTML =
        '<i class="ri-settings-3-line"></i> Gerenciar cadastros';
    }

    renderAll();
  }
};

function hideLegacyViews() {
  if (imagingState.legacyMode) return;

  const folderView = document.getElementById(
    "exames-imagem-view-folders"
  );

  const listView = document.getElementById(
    "exames-imagem-view-list"
  );

  if (folderView) folderView.style.display = "none";
  if (listView) listView.style.display = "none";
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = [...document.scripts].find(
      (script) => script.src.endsWith(src.replace("./", "/"))
    );

    if (existing) {
      if (existing.dataset.csvLoaded === "1") {
        resolve();
      } else {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    script.addEventListener("load", () => {
      script.dataset.csvLoaded = "1";
      resolve();
    }, { once: true });

    script.addEventListener("error", reject, { once: true });
    document.head.appendChild(script);
  });
}

async function ensureThree() {
  if (window.THREE?.WebGLRenderer) return true;

  try {
    await loadScript("./vendor/three.min.js");
    await loadScript("./vendor/OrbitControls.js");

    return Boolean(window.THREE?.WebGLRenderer);
  } catch (error) {
    console.warn(
      "Atlas 3D indisponível. Mantendo visualização 2.5D.",
      error
    );
    return false;
  }
}

function createEllipsoid(group, material, position, scale) {
  const geometry = new window.THREE.SphereGeometry(1, 40, 28);
  const mesh = new window.THREE.Mesh(geometry, material);

  mesh.position.set(...position);
  mesh.scale.set(...scale);
  group.add(mesh);

  return mesh;
}

function createCylinder(
  group,
  material,
  radiusTop,
  radiusBottom,
  height,
  position,
  rotation = [0, 0, 0]
) {
  const geometry = new window.THREE.CylinderGeometry(
    radiusTop,
    radiusBottom,
    height,
    30,
    1,
    false
  );

  const mesh = new window.THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  group.add(mesh);

  return mesh;
}

function hotspotTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;

  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(
    64, 64, 5,
    64, 64, 58
  );

  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(.18, "rgba(112,87,215,1)");
  gradient.addColorStop(.35, "rgba(112,87,215,.72)");
  gradient.addColorStop(.65, "rgba(112,87,215,.18)");
  gradient.addColorStop(1, "rgba(112,87,215,0)");

  context.fillStyle = gradient;
  context.beginPath();
  context.arc(64, 64, 62, 0, Math.PI * 2);
  context.fill();

  const texture = new window.THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function buildBody() {
  const THREE = window.THREE;
  const group = new THREE.Group();
  group.name = "csv-medical-body";

  const audience = imagingState.audience;
  const isFemale = audience === "Feminino";
  const isChild = audience === "Infantil";

  const outerMaterial = new THREE.MeshPhysicalMaterial({
    color: isFemale ? 0xe6b0a8 : 0xd9a28f,
    transparent: true,
    opacity: .42,
    roughness: .62,
    metalness: 0,
    clearcoat: .08,
    side: THREE.DoubleSide
  });

  const muscleMaterial = new THREE.MeshStandardMaterial({
    color: isFemale ? 0xc96f68 : 0xb96055,
    transparent: true,
    opacity: .56,
    roughness: .72
  });

  const boneMaterial = new THREE.MeshStandardMaterial({
    color: 0xf3eee4,
    transparent: true,
    opacity: .72,
    roughness: .8
  });

  const lungMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd88690,
    transparent: true,
    opacity: .86,
    roughness: .55
  });

  const heartMaterial = new THREE.MeshStandardMaterial({
    color: 0xa8293b,
    roughness: .55
  });

  const liverMaterial = new THREE.MeshStandardMaterial({
    color: 0x7b342b,
    roughness: .7
  });

  const digestiveMaterial = new THREE.MeshStandardMaterial({
    color: 0xd58b73,
    roughness: .72
  });

  const kidneyMaterial = new THREE.MeshStandardMaterial({
    color: 0x8f3f49,
    roughness: .65
  });

  const brainMaterial = new THREE.MeshStandardMaterial({
    color: 0xe0a4ad,
    roughness: .78
  });

  const childScale = isChild ? .82 : 1;
  const torsoWidth = isFemale ? .78 : .9;
  const hipWidth = isFemale ? .79 : .67;
  const headScale = isChild ? 1.13 : 1;

  createEllipsoid(
    group,
    outerMaterial,
    [0, 3.64, 0],
    [.43 * headScale, .55 * headScale, .42 * headScale]
  );

  createEllipsoid(
    group,
    brainMaterial,
    [0, 3.7, .02],
    [.31 * headScale, .36 * headScale, .29 * headScale]
  );

  createCylinder(
    group,
    muscleMaterial,
    .19,
    .22,
    .45,
    [0, 3.02, 0]
  );

  createEllipsoid(
    group,
    outerMaterial,
    [0, 1.78, 0],
    [torsoWidth, 1.35, .53]
  );

  createEllipsoid(
    group,
    muscleMaterial,
    [0, 1.82, -.04],
    [torsoWidth * .9, 1.25, .46]
  );

  createEllipsoid(
    group,
    outerMaterial,
    [0, .3, 0],
    [hipWidth, .62, .5]
  );

  createCylinder(
    group,
    boneMaterial,
    .055,
    .055,
    2.7,
    [0, 1.25, -.33]
  );

  createEllipsoid(
    group,
    lungMaterial,
    [-.29, 2.12, .18],
    [.27, .58, .24]
  );

  createEllipsoid(
    group,
    lungMaterial,
    [.29, 2.12, .18],
    [.27, .58, .24]
  );

  createEllipsoid(
    group,
    heartMaterial,
    [.14, 1.87, .39],
    [.23, .32, .22]
  );

  createEllipsoid(
    group,
    liverMaterial,
    [-.28, 1.03, .22],
    [.48, .23, .24]
  );

  createEllipsoid(
    group,
    digestiveMaterial,
    [.13, .72, .22],
    [.39, .5, .29]
  );

  createEllipsoid(
    group,
    kidneyMaterial,
    [-.28, .75, -.1],
    [.12, .22, .11]
  );

  createEllipsoid(
    group,
    kidneyMaterial,
    [.28, .75, -.1],
    [.12, .22, .11]
  );

  createEllipsoid(
    group,
    digestiveMaterial,
    [0, .08, .22],
    [.2, .22, .18]
  );

  if (isFemale) {
    createEllipsoid(
      group,
      outerMaterial,
      [-.34, 2.15, .43],
      [.24, .22, .18]
    );

    createEllipsoid(
      group,
      outerMaterial,
      [.34, 2.15, .43],
      [.24, .22, .18]
    );
  }

  const upperArmX = isFemale ? 1.0 : 1.08;

  [-1, 1].forEach((side) => {
    createEllipsoid(
      group,
      outerMaterial,
      [side * upperArmX, 1.55, 0],
      [.23, .82, .22]
    );

    createEllipsoid(
      group,
      muscleMaterial,
      [side * upperArmX, 1.55, 0],
      [.17, .73, .16]
    );

    createEllipsoid(
      group,
      outerMaterial,
      [side * 1.18, .28, .01],
      [.18, .66, .17]
    );

    createEllipsoid(
      group,
      outerMaterial,
      [side * 1.22, -.38, .05],
      [.22, .18, .13]
    );

    createEllipsoid(
      group,
      outerMaterial,
      [side * .37, -1.16, 0],
      [.3, 1.1, .29]
    );

    createEllipsoid(
      group,
      muscleMaterial,
      [side * .37, -1.16, 0],
      [.23, 1.0, .22]
    );

    createEllipsoid(
      group,
      outerMaterial,
      [side * .39, -2.84, .01],
      [.24, .92, .23]
    );

    createEllipsoid(
      group,
      outerMaterial,
      [side * .41, -3.68, .2],
      [.3, .16, .55]
    );
  });

  group.scale.setScalar(childScale);

  if (isChild) {
    group.position.y = -.35;
  }

  const texture = hotspotTexture();

  imagingState.three.hotspots = Object.entries(REGION_POSITIONS)
    .map(([region, position]) => {
      const material = new THREE.SpriteMaterial({
        map: texture,
        color: 0xffffff,
        transparent: true,
        depthTest: false
      });

      const sprite = new THREE.Sprite(material);
      sprite.position.set(...position);
      sprite.scale.set(.37, .37, .37);
      sprite.userData.region = region;
      sprite.userData.baseScale = .37;
      sprite.renderOrder = 10;
      group.add(sprite);

      return sprite;
    });

  imagingState.three.bodyGroup = group;
  imagingState.three.scene.add(group);
}

async function startThreeViewer() {
  const host = document.getElementById("csv-imaging-three-host");
  if (!host || imagingState.three.ready) return;

  const available = await ensureThree();

  if (!available) {
    document
      .getElementById("csv-imaging-fallback")
      ?.classList.add("visible");
    return;
  }

  const THREE = window.THREE;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    35,
    Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight),
    .1,
    100
  );

  camera.position.set(0, 1.25, 9.3);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  host.innerHTML = "";
  host.appendChild(renderer.domElement);

  const ambient = new THREE.HemisphereLight(
    0xf6f7ff,
    0x594c7a,
    1.65
  );
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.65);
  keyLight.position.set(5, 7, 6);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x8a72ff, 1.05);
  rimLight.position.set(-5, 3, -4);
  scene.add(rimLight);

  const floorGeometry = new THREE.CircleGeometry(2.4, 64);
  const floorMaterial = new THREE.MeshBasicMaterial({
    color: 0x6f5bd3,
    transparent: true,
    opacity: .06,
    side: THREE.DoubleSide
  });

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.95;
  scene.add(floor);

  const controls = window.THREE.OrbitControls
    ? new window.THREE.OrbitControls(camera, renderer.domElement)
    : null;

  if (controls) {
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = .06;
    controls.minDistance = 6.8;
    controls.maxDistance = 13;
    controls.target.set(0, .2, 0);
    controls.maxPolarAngle = Math.PI * .72;
    controls.minPolarAngle = Math.PI * .28;
  }

  imagingState.three.scene = scene;
  imagingState.three.camera = camera;
  imagingState.three.renderer = renderer;
  imagingState.three.controls = controls;
  imagingState.three.raycaster = new THREE.Raycaster();
  imagingState.three.pointer = new THREE.Vector2();
  imagingState.three.ready = true;

  buildBody();
  updateHotspotSelection(
    selectedItem()?.region || imagingState.region
  );

  renderer.domElement.addEventListener("pointerup", (event) => {
    const bounds = renderer.domElement.getBoundingClientRect();

    imagingState.three.pointer.x =
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1;

    imagingState.three.pointer.y =
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

    imagingState.three.raycaster.setFromCamera(
      imagingState.three.pointer,
      camera
    );

    const intersections = imagingState.three.raycaster
      .intersectObjects(imagingState.three.hotspots, false);

    const region = intersections[0]?.object?.userData?.region;

    if (region) {
      window.csvImagingSetRegion(region);
    }
  });

  const resize = () => {
    if (!host.clientWidth || !host.clientHeight) return;

    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
  };

  imagingState.three.resizeObserver = new ResizeObserver(resize);
  imagingState.three.resizeObserver.observe(host);

  const fallback = document.getElementById("csv-imaging-fallback");
  if (fallback) fallback.style.display = "none";

  const animate = () => {
    imagingState.three.frame =
      window.requestAnimationFrame(animate);

    const time = performance.now() * .0018;

    imagingState.three.hotspots.forEach((hotspot, index) => {
      const active =
        hotspot.userData.region ===
        (selectedItem()?.region || imagingState.region);

      const base = hotspot.userData.baseScale || .37;
      const pulse = 1 + Math.sin(time + index * .45) * (active ? .12 : .04);
      const size = base * pulse * (active ? 1.32 : 1);

      hotspot.scale.set(size, size, size);
      hotspot.material.opacity = active ? 1 : .72;
      hotspot.material.color.set(active ? 0xfff4c7 : 0xffffff);
    });

    controls?.update();
    renderer.render(scene, camera);
  };

  animate();
}

function rebuildBody() {
  if (!imagingState.three.ready) return;

  const scene = imagingState.three.scene;
  const oldGroup = imagingState.three.bodyGroup;

  if (oldGroup) {
    scene.remove(oldGroup);

    oldGroup.traverse((object) => {
      object.geometry?.dispose?.();

      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose?.());
      } else {
        object.material?.dispose?.();
      }
    });
  }

  buildBody();
  updateHotspotSelection(
    selectedItem()?.region || imagingState.region
  );
}

function updateHotspotSelection(region) {
  const label = document.getElementById(
    "csv-imaging-hotspot-label"
  );

  if (label) {
    label.textContent =
      region && region !== "Todas"
        ? `Região selecionada: ${region}`
        : "Selecione uma região do corpo";
  }
}

function focusRegion(region) {
  if (
    !imagingState.three.ready ||
    !REGION_POSITIONS[region]
  ) {
    return;
  }

  const controls = imagingState.three.controls;
  const camera = imagingState.three.camera;
  const [x, y, z] = REGION_POSITIONS[region];

  controls?.target.set(x * .2, y, 0);
  camera.position.y = y + .15;
  camera.position.x *= .92;
  camera.position.z =
    imagingState.view === "costas" ? -8.2 : 8.2;
}

function setCameraView(view) {
  if (!imagingState.three.ready) return;

  const camera = imagingState.three.camera;
  const controls = imagingState.three.controls;
  const targetY =
    imagingState.region !== "Todas" &&
    REGION_POSITIONS[imagingState.region]
      ? REGION_POSITIONS[imagingState.region][1]
      : .25;

  if (view === "costas") {
    camera.position.set(0, targetY + .2, -9.2);
  } else if (view === "lateral") {
    camera.position.set(9.2, targetY + .2, 0);
  } else {
    camera.position.set(0, targetY + .2, 9.2);
  }

  controls?.target.set(0, targetY, 0);
  controls?.update();
}

function bindNavigation() {
  const button = document.querySelector(
    '.nav-btn[data-tab="exames-imagem"]'
  );

  if (!button || button.dataset.csvImagingBound === "1") return;

  button.dataset.csvImagingBound = "1";

  button.addEventListener("click", () => {
    setTimeout(() => {
      ensureAtlas();
      hideLegacyViews();
      renderAll();

      const pageTitle = document.getElementById("page-title");
      if (pageTitle) pageTitle.textContent = "Exames de Imagem";
    }, 90);

    setTimeout(renderAll, 400);
  });
}

function init() {
  ensureAtlas();
  bindNavigation();
  hideLegacyViews();
  subscribeCollections();

  setInterval(() => {
    bindNavigation();
    syncFromGlobals();

    const tab = document.getElementById("tab-exames-imagem");

    if (
      tab &&
      window.getComputedStyle(tab).display !== "none"
    ) {
      hideLegacyViews();
      renderAll();
    }
  }, 1800);

  console.log(
    `CSV Imaging Atlas ${CSV_IMAGING_ATLAS_VERSION} carregado.`
  );
}

window.csvImagingAtlasState = imagingState;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
