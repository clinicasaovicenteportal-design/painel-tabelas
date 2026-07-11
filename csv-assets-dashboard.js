import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const CSV_ASSETS_VERSION = "7.2.0";
const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const assetState = {
  user: null,
  assets: [],
  inventories: [],
  error: "",
  ready: false,
  unsubscribers: [],
  chart: null,
  filters: {
    search: "",
    unit: "",
    sector: "",
    category: "",
    status: ""
  }
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
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function unique(values = []) {
  return [...new Set(values.map((item) => String(item || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function isAdmin() {
  if (window.csvPhase2State?.isAdmin === true) return true;
  return String(assetState.user?.email || "").toLowerCase().includes("@clinica");
}

function assetData(item) {
  const data = item?.data || {};
  return {
    id: item.id,
    raw: data,
    name: data["Nome do Equipamento"] || data.nome || "Ativo sem nome",
    category: data["Categoria"] || data.categoria || "Sem categoria",
    patrimony: data["Número de Patrimônio"] || data.patrimonio || item.id,
    unit:
      data["Unidade Local"] ||
      data.unidade ||
      (data["Localização / Setor"] ? "Sem unidade definida" : "Sem unidade"),
    sector:
      data["Setor"] ||
      data.setor ||
      data["Localização / Setor"] ||
      "Sem setor",
    responsible: data["Responsável"] || data.responsavel || "Não informado",
    status: data["Status do Ativo"] || data.status || "Não informado",
    notes: data["Observações"] || data.observacoes || "",
    updated:
      data.atualizadoEm?.toDate?.() ||
      data.atualizado_em ||
      data.criadoEm?.toDate?.() ||
      ""
  };
}

function statusGroup(status = "") {
  const value = normalize(status);

  if (
    value.includes("operacional") ||
    value === "ativo" ||
    value.includes("disponivel") ||
    value.includes("em uso") ||
    value.includes("funcionando")
  ) {
    return "operational";
  }

  if (
    value.includes("manutenc") ||
    value.includes("conserto") ||
    value.includes("defeito") ||
    value.includes("avariado")
  ) {
    return "maintenance";
  }

  if (
    value.includes("inativo") ||
    value.includes("baixado") ||
    value.includes("descartado")
  ) {
    return "inactive";
  }

  return "pending";
}

function statusLabel(group) {
  return {
    operational: "Operacional",
    maintenance: "Manutenção",
    inactive: "Inativo",
    pending: "A verificar"
  }[group] || "A verificar";
}

function statusIcon(group) {
  return {
    operational: "ri-checkbox-circle-line",
    maintenance: "ri-tools-line",
    inactive: "ri-forbid-2-line",
    pending: "ri-time-line"
  }[group] || "ri-time-line";
}

function formattedDate(value) {
  if (!value) return "Sem atualização";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem atualização";

  return date.toLocaleDateString("pt-BR");
}

function inventorySummary() {
  const inventories = assetState.inventories;
  const open = inventories.filter((item) =>
    ["em_andamento", "pendente", "pausado"].includes(
      String(item.data?.status || "")
    )
  );

  const completed = inventories.filter(
    (item) => String(item.data?.status || "") === "concluido"
  );

  let expected = 0;
  let read = 0;
  let divergences = 0;

  inventories.forEach((item) => {
    const data = item.data || {};
    expected += Array.isArray(data.itensEsperadosIds)
      ? data.itensEsperadosIds.length
      : Number(data.totalEsperado || 0);
    read += Array.isArray(data.itensLidosIds)
      ? data.itensLidosIds.length
      : Number(data.totalLido || 0);
    divergences += Array.isArray(data.itensDivergentes)
      ? data.itensDivergentes.length
      : Number(data.divergencias || 0);
  });

  return {
    total: inventories.length,
    open: open.length,
    completed: completed.length,
    expected,
    read,
    divergences,
    rate: expected ? Math.round((read / expected) * 100) : 0
  };
}

function filteredAssets() {
  const filters = assetState.filters;
  const search = normalize(filters.search);

  return assetState.assets
    .map(assetData)
    .filter((asset) => {
      const haystack = normalize([
        asset.name,
        asset.category,
        asset.patrimony,
        asset.unit,
        asset.sector,
        asset.responsible,
        asset.status,
        asset.notes
      ].join(" "));

      if (search && !haystack.includes(search)) return false;
      if (filters.unit && asset.unit !== filters.unit) return false;
      if (filters.sector && asset.sector !== filters.sector) return false;
      if (filters.category && asset.category !== filters.category) return false;
      if (filters.status && statusGroup(asset.status) !== filters.status) return false;

      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function moveLegacyCameraModal() {
  const modal = document.getElementById("modal-camera-qr");
  if (modal && modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }
}

function ensureAssetsPage() {
  const tab = document.getElementById("tab-ativos");
  if (!tab || tab.dataset.csvAssetsReady === "1") return;

  moveLegacyCameraModal();

  tab.dataset.csvAssetsReady = "1";
  tab.innerHTML = `
    <div class="csv-assets-page">
      <header class="csv-assets-hero">
        <div>
          <span class="csv-assets-eyebrow">
            <i class="ri-radar-line"></i>
            Central tecnológica de patrimônio
          </span>
          <h2>Controle de ativos e inventários</h2>
          <p>
            Consulte equipamentos, responsáveis, localização, status,
            conferências e etiquetas em um único painel.
          </p>
        </div>

        <div class="csv-assets-actions">
          <button type="button" class="secondary admin-only" id="csv-assets-inventory">
            <i class="ri-archive-drawer-line"></i> Inventário
          </button>
          <button type="button" class="secondary admin-only" id="csv-assets-labels">
            <i class="ri-printer-line"></i> Etiquetas
          </button>
          <button type="button" class="secondary admin-only" id="csv-assets-camera">
            <i class="ri-qr-scan-2-line"></i> Ler QR
          </button>
          <button type="button" class="primary admin-only" id="csv-assets-new">
            <i class="ri-add-line"></i> Novo ativo
          </button>
        </div>
      </header>

      <section class="csv-assets-kpis" id="csv-assets-kpis"></section>

      <section class="csv-assets-overview">
        <article class="csv-assets-chart-card">
          <div class="csv-assets-section-title">
            <div>
              <span>Visão geral</span>
              <h3>Distribuição por status</h3>
            </div>
            <i class="ri-pie-chart-2-line"></i>
          </div>
          <div class="csv-assets-chart-holder">
            <canvas id="csv-assets-status-chart"></canvas>
          </div>
        </article>

        <article class="csv-assets-inventory-card" id="csv-assets-inventory-card"></article>
      </section>

      <section class="csv-assets-toolbar">
        <label class="csv-assets-search">
          <i class="ri-search-line"></i>
          <input id="csv-assets-search" placeholder="Pesquisar equipamento, patrimônio, responsável...">
        </label>

        <select id="csv-assets-unit"><option value="">Todas as unidades</option></select>
        <select id="csv-assets-sector"><option value="">Todos os setores</option></select>
        <select id="csv-assets-category"><option value="">Todas as categorias</option></select>
        <select id="csv-assets-status">
          <option value="">Todos os status</option>
          <option value="operational">Operacionais</option>
          <option value="maintenance">Em manutenção</option>
          <option value="pending">A verificar</option>
          <option value="inactive">Inativos</option>
        </select>

        <button type="button" id="csv-assets-clear">
          <i class="ri-filter-off-line"></i>
        </button>
      </section>

      <section class="csv-assets-units">
        <div class="csv-assets-section-title">
          <div>
            <span>Navegação rápida</span>
            <h3>Unidades e setores</h3>
          </div>
        </div>
        <div id="csv-assets-unit-grid" class="csv-assets-unit-grid"></div>
      </section>

      <section class="csv-assets-list-card">
        <div class="csv-assets-list-heading">
          <div>
            <span>Base patrimonial</span>
            <h3 id="csv-assets-result-count">0 ativos</h3>
          </div>
          <span id="csv-assets-sync-status" class="csv-assets-sync-status">
            <i class="ri-loader-4-line ri-spin"></i> Sincronizando
          </span>
        </div>
        <div id="csv-assets-list"></div>
      </section>
    </div>
  `;

  bindAssetsControls();
  applyAdminVisibility();
  renderAssets();
}

function applyAdminVisibility() {
  document
    .querySelectorAll("#tab-ativos .admin-only")
    .forEach((element) => {
      element.style.display = isAdmin() ? "" : "none";
    });
}

function bindAssetsControls() {
  const bindSelect = (id, key) => {
    document.getElementById(id)?.addEventListener("change", (event) => {
      assetState.filters[key] = event.target.value;
      renderAssets();
    });
  };

  let searchTimer = null;
  document.getElementById("csv-assets-search")?.addEventListener("input", (event) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      assetState.filters.search = event.target.value;
      renderAssets();
    }, 120);
  });

  bindSelect("csv-assets-unit", "unit");
  bindSelect("csv-assets-sector", "sector");
  bindSelect("csv-assets-category", "category");
  bindSelect("csv-assets-status", "status");

  document.getElementById("csv-assets-clear")?.addEventListener("click", () => {
    assetState.filters = {
      search: "",
      unit: "",
      sector: "",
      category: "",
      status: ""
    };
    renderAssets();
  });

  document.getElementById("csv-assets-new")?.addEventListener("click", () => {
    window.abrirModal?.("ativos");
  });

  document.getElementById("csv-assets-inventory")?.addEventListener("click", () => {
    if (typeof window.abrirModalInventarioAtivos === "function") {
      window.abrirModalInventarioAtivos();
    } else {
      alert("O módulo de inventário ainda está carregando. Tente novamente.");
    }
  });

  document.getElementById("csv-assets-labels")?.addEventListener("click", () => {
    if (typeof window.abrirModalEtiquetasAtivos === "function") {
      window.abrirModalEtiquetasAtivos();
    } else {
      alert("O módulo de etiquetas ainda está carregando. Tente novamente.");
    }
  });

  document.getElementById("csv-assets-camera")?.addEventListener("click", () => {
    if (typeof window.iniciarLeitorQR === "function") {
      window.iniciarLeitorQR();
    } else {
      alert("O leitor de QR Code ainda está carregando. Tente novamente.");
    }
  });
}

function fillSelect(id, values, placeholder, selected) {
  const select = document.getElementById(id);
  if (!select) return;

  select.innerHTML =
    `<option value="">${esc(placeholder)}</option>` +
    values.map((value) =>
      `<option value="${esc(value)}">${esc(value)}</option>`
    ).join("");

  select.value = values.includes(selected) ? selected : "";
}

function renderFilters() {
  const assets = assetState.assets.map(assetData);

  fillSelect(
    "csv-assets-unit",
    unique(assets.map((item) => item.unit)),
    "Todas as unidades",
    assetState.filters.unit
  );

  const sectors = unique(
    assets
      .filter((item) =>
        !assetState.filters.unit || item.unit === assetState.filters.unit
      )
      .map((item) => item.sector)
  );

  fillSelect(
    "csv-assets-sector",
    sectors,
    "Todos os setores",
    assetState.filters.sector
  );

  fillSelect(
    "csv-assets-category",
    unique(assets.map((item) => item.category)),
    "Todas as categorias",
    assetState.filters.category
  );

  const search = document.getElementById("csv-assets-search");
  if (search && search.value !== assetState.filters.search) {
    search.value = assetState.filters.search;
  }

  const status = document.getElementById("csv-assets-status");
  if (status) status.value = assetState.filters.status;
}

function renderKpis() {
  const holder = document.getElementById("csv-assets-kpis");
  if (!holder) return;

  const assets = assetState.assets.map(assetData);
  const operational = assets.filter(
    (item) => statusGroup(item.status) === "operational"
  ).length;
  const maintenance = assets.filter(
    (item) => statusGroup(item.status) === "maintenance"
  ).length;
  const pending = assets.filter(
    (item) => statusGroup(item.status) === "pending"
  ).length;
  const summary = inventorySummary();

  holder.innerHTML = `
    <article class="primary">
      <span>Total de ativos</span>
      <strong>${assets.length}</strong>
      <small>${unique(assets.map((item) => item.unit)).length} unidade(s)</small>
      <i class="ri-computer-line"></i>
    </article>
    <article>
      <span>Operacionais</span>
      <strong>${operational}</strong>
      <small>Prontos para utilização</small>
      <i class="ri-checkbox-circle-line"></i>
    </article>
    <article class="${maintenance ? "warning" : ""}">
      <span>Manutenção</span>
      <strong>${maintenance}</strong>
      <small>Exigem acompanhamento</small>
      <i class="ri-tools-line"></i>
    </article>
    <article class="${pending ? "attention" : ""}">
      <span>A verificar</span>
      <strong>${pending}</strong>
      <small>Status pendente</small>
      <i class="ri-time-line"></i>
    </article>
    <article>
      <span>Conferência</span>
      <strong>${summary.rate}%</strong>
      <small>${summary.read}/${summary.expected || 0} itens lidos</small>
      <i class="ri-radar-line"></i>
    </article>
  `;
}

function renderStatusChart() {
  const canvas = document.getElementById("csv-assets-status-chart");
  if (!canvas || typeof Chart === "undefined") return;

  const assets = assetState.assets.map(assetData);
  const counts = {
    operational: 0,
    maintenance: 0,
    pending: 0,
    inactive: 0
  };

  assets.forEach((item) => {
    counts[statusGroup(item.status)] += 1;
  });

  assetState.chart?.destroy?.();

  assetState.chart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Operacionais", "Manutenção", "A verificar", "Inativos"],
      datasets: [{
        data: [
          counts.operational,
          counts.maintenance,
          counts.pending,
          counts.inactive
        ],
        backgroundColor: ["#167a52", "#e2a132", "#5375d6", "#9aa5b5"],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            padding: 18
          }
        }
      }
    }
  });
}

function renderInventoryCard() {
  const holder = document.getElementById("csv-assets-inventory-card");
  if (!holder) return;

  const summary = inventorySummary();

  holder.innerHTML = `
    <div class="csv-assets-inventory-top">
      <div>
        <span>Inventário inteligente</span>
        <h3>Acompanhamento das conferências</h3>
      </div>
      <i class="ri-qr-scan-2-line"></i>
    </div>

    <div class="csv-assets-gauge">
      <div class="csv-assets-gauge-ring" style="--rate:${summary.rate}">
        <strong>${summary.rate}%</strong>
        <span>conferido</span>
      </div>
      <div class="csv-assets-gauge-copy">
        <span><b>${summary.open}</b> em andamento</span>
        <span><b>${summary.completed}</b> concluído(s)</span>
        <span class="${summary.divergences ? "danger" : ""}">
          <b>${summary.divergences}</b> divergência(s)
        </span>
      </div>
    </div>

    <button type="button" class="admin-only" onclick="window.abrirModalInventarioAtivos?.()">
      Abrir central de inventário
      <i class="ri-arrow-right-line"></i>
    </button>
  `;

  applyAdminVisibility();
}

function renderUnitCards() {
  const holder = document.getElementById("csv-assets-unit-grid");
  if (!holder) return;

  const assets = assetState.assets.map(assetData);
  const units = unique(assets.map((item) => item.unit));

  if (!units.length) {
    holder.innerHTML = `
      <div class="csv-assets-empty compact">
        <i class="ri-building-line"></i>
        <strong>Nenhuma unidade com ativos</strong>
      </div>
    `;
    return;
  }

  holder.innerHTML = units.map((unit) => {
    const unitAssets = assets.filter((item) => item.unit === unit);
    const sectors = unique(unitAssets.map((item) => item.sector));
    const maintenance = unitAssets.filter(
      (item) => statusGroup(item.status) === "maintenance"
    ).length;

    return `
      <button type="button" class="csv-assets-unit-card"
        onclick="window.csvAssetsFilterUnit('${esc(encodeURIComponent(unit))}')">
        <span class="csv-assets-unit-icon"><i class="ri-building-4-line"></i></span>
        <div>
          <strong>${esc(unit)}</strong>
          <small>${unitAssets.length} ativo(s) • ${sectors.length} setor(es)</small>
        </div>
        <span class="${maintenance ? "warning" : ""}">
          ${maintenance ? `${maintenance} manutenção` : "Em dia"}
        </span>
        <i class="ri-arrow-right-s-line"></i>
      </button>
    `;
  }).join("");
}

window.csvAssetsFilterUnit = function(encodedUnit) {
  assetState.filters.unit = decodeURIComponent(encodedUnit || "");
  assetState.filters.sector = "";
  renderAssets();
};

function assetActions(asset) {
  if (!isAdmin()) {
    return `
      <button type="button" onclick="window.csvAssetOpenDetail('${esc(asset.id)}')">
        <i class="ri-eye-line"></i>
      </button>
    `;
  }

  return `
    <button type="button" title="Ver detalhes" onclick="window.csvAssetOpenDetail('${esc(asset.id)}')">
      <i class="ri-eye-line"></i>
    </button>
    <button type="button" title="Editar" onclick="window.csvAssetEdit('${esc(asset.id)}')">
      <i class="ri-edit-line"></i>
    </button>
    <button type="button" title="Ver QR Code" onclick="window.visualizarEtiquetaAtivo?.('${esc(asset.id)}')">
      <i class="ri-qr-code-line"></i>
    </button>
    <button type="button" title="Imprimir etiqueta" onclick="window.imprimirEtiquetaAtivo?.('${esc(asset.id)}')">
      <i class="ri-printer-line"></i>
    </button>
  `;
}

function renderAssetList() {
  const holder = document.getElementById("csv-assets-list");
  const count = document.getElementById("csv-assets-result-count");
  const sync = document.getElementById("csv-assets-sync-status");
  if (!holder) return;

  const assets = filteredAssets();

  if (count) {
    count.textContent = `${assets.length} ${assets.length === 1 ? "ativo" : "ativos"}`;
  }

  if (sync) {
    sync.className = `csv-assets-sync-status${assetState.error ? " error" : " ready"}`;
    sync.innerHTML = assetState.error
      ? `<i class="ri-error-warning-line"></i> Falha ao sincronizar`
      : `<i class="ri-cloud-line"></i> Dados sincronizados`;
  }

  if (assetState.error) {
    holder.innerHTML = `
      <div class="csv-assets-empty error">
        <i class="ri-database-2-line"></i>
        <strong>Não foi possível carregar os ativos</strong>
        <span>${esc(assetState.error)}</span>
      </div>
    `;
    return;
  }

  if (!assetState.ready) {
    holder.innerHTML = `
      <div class="csv-assets-loading">
        <i class="ri-loader-4-line ri-spin"></i>
        Carregando patrimônio...
      </div>
    `;
    return;
  }

  if (!assets.length) {
    holder.innerHTML = `
      <div class="csv-assets-empty">
        <i class="ri-inbox-archive-line"></i>
        <strong>Nenhum ativo encontrado</strong>
        <span>
          ${assetState.assets.length
            ? "Altere ou limpe os filtros para visualizar outros registros."
            : "A base está conectada, mas ainda não há ativos cadastrados."}
        </span>
        ${isAdmin() && !assetState.assets.length
          ? `<button type="button" onclick="window.abrirModal?.('ativos')"><i class="ri-add-line"></i> Cadastrar primeiro ativo</button>`
          : ""}
      </div>
    `;
    return;
  }

  holder.innerHTML = `
    <div class="csv-assets-table-head">
      <span>Equipamento</span>
      <span>Patrimônio</span>
      <span>Localização</span>
      <span>Responsável</span>
      <span>Status</span>
      <span></span>
    </div>
    <div class="csv-assets-table-body">
      ${assets.map((asset) => {
        const group = statusGroup(asset.status);
        return `
          <article class="csv-assets-row">
            <div class="csv-assets-product">
              <span><i class="ri-device-line"></i></span>
              <div>
                <strong>${esc(asset.name)}</strong>
                <small>${esc(asset.category)}</small>
              </div>
            </div>
            <div>
              <strong>${esc(asset.patrimony)}</strong>
              <small>Atualizado ${esc(formattedDate(asset.updated))}</small>
            </div>
            <div>
              <strong>${esc(asset.unit)}</strong>
              <small>${esc(asset.sector)}</small>
            </div>
            <div>
              <strong>${esc(asset.responsible)}</strong>
              <small>${esc(asset.notes || "Sem observações")}</small>
            </div>
            <div>
              <span class="csv-assets-status ${group}">
                <i class="${statusIcon(group)}"></i>
                ${esc(asset.status || statusLabel(group))}
              </span>
            </div>
            <div class="csv-assets-row-actions">
              ${assetActions(asset)}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

window.csvAssetEdit = function(id) {
  const item = assetState.assets.find((entry) => entry.id === id);
  if (!item || !isAdmin()) return;
  window.abrirModal?.("ativos", item.id, item.data);
};

function ensureAssetModal() {
  let modal = document.getElementById("csv-assets-detail-modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "csv-assets-detail-modal";
    modal.className = "csv-assets-modal";
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.classList.remove("is-open");
      }
    });
    document.body.appendChild(modal);
  }

  return modal;
}

window.csvAssetsCloseDetail = function() {
  document.getElementById("csv-assets-detail-modal")?.classList.remove("is-open");
};

window.csvAssetOpenDetail = function(id) {
  const item = assetState.assets.find((entry) => entry.id === id);
  if (!item) return;

  const asset = assetData(item);
  const group = statusGroup(asset.status);
  const modal = ensureAssetModal();

  modal.innerHTML = `
    <div class="csv-assets-modal-card">
      <button type="button" class="csv-assets-modal-close" onclick="window.csvAssetsCloseDetail()">
        <i class="ri-close-line"></i>
      </button>

      <div class="csv-assets-detail-hero">
        <span><i class="ri-device-line"></i></span>
        <div>
          <small>Detalhes do ativo</small>
          <h2>${esc(asset.name)}</h2>
          <p>${esc(asset.category)} • Patrimônio ${esc(asset.patrimony)}</p>
        </div>
        <span class="csv-assets-status ${group}">
          <i class="${statusIcon(group)}"></i>
          ${esc(asset.status)}
        </span>
      </div>

      <div class="csv-assets-detail-grid">
        <article><span>Unidade</span><strong>${esc(asset.unit)}</strong></article>
        <article><span>Setor</span><strong>${esc(asset.sector)}</strong></article>
        <article><span>Responsável</span><strong>${esc(asset.responsible)}</strong></article>
        <article><span>Última atualização</span><strong>${esc(formattedDate(asset.updated))}</strong></article>
      </div>

      <div class="csv-assets-detail-notes">
        <span>Observações</span>
        <p>${esc(asset.notes || "Nenhuma observação cadastrada.")}</p>
      </div>

      <div class="csv-assets-modal-actions">
        <button type="button" class="secondary" onclick="window.visualizarEtiquetaAtivo?.('${esc(asset.id)}')">
          <i class="ri-qr-code-line"></i> Ver QR
        </button>
        ${isAdmin()
          ? `<button type="button" class="primary" onclick="window.csvAssetsCloseDetail();window.csvAssetEdit('${esc(asset.id)}')"><i class="ri-edit-line"></i> Editar ativo</button>`
          : ""}
      </div>
    </div>
  `;

  modal.classList.add("is-open");
};

function renderAssets() {
  ensureAssetsPage();
  renderFilters();
  renderKpis();
  renderStatusChart();
  renderInventoryCard();
  renderUnitCards();
  renderAssetList();
  applyAdminVisibility();
}

function bindNavigation() {
  const button = document.querySelector('.nav-btn[data-tab="ativos"]');
  if (!button || button.dataset.csvAssetsBound === "1") return;

  button.dataset.csvAssetsBound = "1";
  button.addEventListener("click", () => {
    setTimeout(renderAssets, 80);
  });
}

function cleanup() {
  assetState.unsubscribers.forEach((unsubscribe) => {
    try {
      unsubscribe();
    } catch (_) {}
  });
  assetState.unsubscribers = [];
}

function subscribe() {
  cleanup();
  assetState.error = "";
  assetState.ready = false;
  renderAssets();

  assetState.unsubscribers.push(
    onSnapshot(
      collection(db, "ativos"),
      (snapshot) => {
        assetState.assets = snapshot.docs.map((item) => ({
          id: item.id,
          data: item.data()
        }));

        window.dadosGlobaisAbas = window.dadosGlobaisAbas || {};
        window.todosOsDadosDoSistema = window.todosOsDadosDoSistema || {};
        window.dadosGlobaisAbas.ativos = assetState.assets;
        window.todosOsDadosDoSistema.ativos = assetState.assets;

        assetState.ready = true;
        assetState.error = "";
        renderAssets();
      },
      (error) => {
        console.error("Controle de ativos:", error);
        assetState.ready = true;
        assetState.error =
          error?.code === "permission-denied"
            ? "O Firestore bloqueou a leitura da coleção de ativos. Publique as regras desta atualização."
            : error?.message || "Erro desconhecido.";
        renderAssets();
      }
    )
  );

  assetState.unsubscribers.push(
    onSnapshot(
      collection(db, "inventarios_ativos"),
      (snapshot) => {
        assetState.inventories = snapshot.docs.map((item) => ({
          id: item.id,
          data: item.data()
        }));

        window.inventariosAtivosData = assetState.inventories;
        renderAssets();
      },
      (error) => {
        console.warn("Inventários de ativos:", error);
      }
    )
  );
}

function init() {
  ensureAssetsPage();
  bindNavigation();

  onAuthStateChanged(auth, (user) => {
    assetState.user = user;

    if (user) {
      subscribe();
      setTimeout(() => {
        applyAdminVisibility();
        renderAssets();
      }, 300);
    } else {
      cleanup();
      assetState.assets = [];
      assetState.inventories = [];
      assetState.ready = false;
      renderAssets();
    }
  });

  console.log(`CSV Assets Dashboard ${CSV_ASSETS_VERSION} carregado.`);
}

window.csvAssetsState = assetState;
window.csvAssetsRender = renderAssets;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
