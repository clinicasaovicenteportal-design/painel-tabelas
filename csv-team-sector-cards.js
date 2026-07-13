(() => {
  "use strict";

  const VERSION = "7.9.6";
  const STORAGE_KEY = "csv_team_view_mode_7_9_6";

  let viewMode = "list";
  let observerTimer = null;
  let lastSignature = "";

  try {
    viewMode =
      localStorage.getItem(STORAGE_KEY) === "cards"
        ? "cards"
        : "list";
  } catch (_) {}

  function state() {
    return window.csvPhase2State || {};
  }

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

  function mergedTeam() {
    const map = new Map();
    const current = state();

    (current.collaborators || []).forEach((item) => {
      const name = collaboratorName(item);
      if (!name) return;

      map.set(normalize(name), {
        name,
        sector: collaboratorSector(item),
        userData: null,
        collaboratorData: item.data || {}
      });
    });

    (current.users || []).forEach((item) => {
      const data = item?.data || {};

      if (
        data.admin ||
        data.removido === true ||
        !data.nome
      ) {
        return;
      }

      const key = normalize(data.nome);
      const existing = map.get(key) || {
        name: data.nome,
        sector: data.setor || "Geral",
        collaboratorData: {}
      };

      map.set(key, {
        ...existing,
        name: data.nome || existing.name,
        sector:
          data.setor ||
          existing.sector ||
          "Geral",
        userData: data
      });
    });

    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR")
    );
  }

  function groupedSectors(records) {
    const map = new Map();

    records.forEach((record) => {
      const sector =
        String(record.sector || "Geral").trim() ||
        "Geral";

      const key = normalize(sector);

      if (!map.has(key)) {
        map.set(key, {
          key,
          sector,
          records: []
        });
      }

      map.get(key).records.push(record);
    });

    return [...map.values()].sort((a, b) =>
      a.sector.localeCompare(b.sector, "pt-BR")
    );
  }

  function stats(records) {
    const withAccess = records.filter(
      (item) => Boolean(item.userData)
    ).length;

    const active = records.filter(
      (item) =>
        item.userData &&
        item.userData.ativo !== false
    ).length;

    return {
      total: records.length,
      withAccess,
      withoutAccess:
        Math.max(0, records.length - withAccess),
      active
    };
  }

  function cardMarkup(label, records, kind = "sector") {
    const current = stats(records);

    return `
      <button
        type="button"
        class="csv-team-sector-card ${kind}"
        data-team-sector-card="${esc(
          kind === "company" ? "" : label
        )}"
      >
        <div class="csv-team-sector-card-icon">
          <i class="${
            kind === "company"
              ? "ri-building-4-line"
              : "ri-team-line"
          }"></i>
        </div>

        <div class="csv-team-sector-card-copy">
          <span>${
            kind === "company"
              ? "Visão geral da empresa"
              : "Setor cadastrado"
          }</span>
          <h3>${esc(label)}</h3>
          <strong>
            ${current.total}
            colaborador${current.total === 1 ? "" : "es"}
          </strong>
        </div>

        <div class="csv-team-sector-card-metrics">
          <span>
            <b>${current.active}</b>
            Ativos
          </span>
          <span>
            <b>${current.withAccess}</b>
            Com acesso
          </span>
          <span class="${
            current.withoutAccess ? "attention" : ""
          }">
            <b>${current.withoutAccess}</b>
            Sem acesso
          </span>
        </div>

        <div class="csv-team-sector-card-footer">
          <span>Abrir colaboradores</span>
          <i class="ri-arrow-right-line"></i>
        </div>
      </button>
    `;
  }

  function renderCards() {
    const holder = document.getElementById(
      "csv-team-sector-cards"
    );

    if (!holder) return;

    const records = mergedTeam();
    const sectors = groupedSectors(records);

    const signature = JSON.stringify({
      viewMode,
      records: records.map((item) => [
        item.name,
        item.sector,
        Boolean(item.userData),
        item.userData?.ativo !== false
      ])
    });

    if (signature === lastSignature) return;
    lastSignature = signature;

    holder.innerHTML = `
      <div class="csv-team-sector-cards-heading">
        <div>
          <span>
            <i class="ri-layout-grid-line"></i>
            Visualização por setores
          </span>
          <h3>Equipe organizada por área</h3>
          <p>
            Abra a empresa inteira ou selecione um setor
            para visualizar somente os colaboradores daquela área.
          </p>
        </div>

        <small>${sectors.length} setor(es)</small>
      </div>

      <div class="csv-team-sector-cards-grid">
        ${cardMarkup(
          "Empresa toda",
          records,
          "company"
        )}

        ${sectors.map((group) =>
          cardMarkup(
            group.sector,
            group.records,
            "sector"
          )
        ).join("")}
      </div>
    `;

    holder
      .querySelectorAll("[data-team-sector-card]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const sector =
            button.dataset.teamSectorCard || "";

          const select = document.getElementById(
            "csv2-team-sector"
          );

          if (select) {
            select.value = sector;
            select.dispatchEvent(
              new Event("change", {
                bubbles: true
              })
            );
          }

          setView("list");
        });
      });
  }

  function applyView() {
    const root = document.getElementById(
      "csv2-team-root"
    );

    const list = document.getElementById(
      "csv2-team-list"
    );

    const cards = document.getElementById(
      "csv-team-sector-cards"
    );

    if (!root || !list || !cards) return;

    root.classList.toggle(
      "csv-team-cards-mode",
      viewMode === "cards"
    );

    list.style.display =
      viewMode === "cards" ? "none" : "";

    cards.style.display =
      viewMode === "cards" ? "" : "none";

    root
      .querySelectorAll("[data-team-view]")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.teamView === viewMode
        );
      });

    if (viewMode === "cards") {
      renderCards();
    }
  }

  function setView(mode) {
    viewMode = mode === "cards"
      ? "cards"
      : "list";

    try {
      localStorage.setItem(
        STORAGE_KEY,
        viewMode
      );
    } catch (_) {}

    lastSignature = "";
    applyView();
  }

  function ensureControls() {
    const root = document.getElementById(
      "csv2-team-root"
    );

    const toolbar = root?.querySelector(
      ".csv2-team-toolbar"
    );

    const panel = root?.querySelector(
      ".csv2-team-panel"
    );

    const list = document.getElementById(
      "csv2-team-list"
    );

    if (!root || !toolbar || !panel || !list) {
      return;
    }

    let controls = document.getElementById(
      "csv-team-view-controls"
    );

    if (!controls) {
      controls = document.createElement("div");
      controls.id = "csv-team-view-controls";
      controls.className =
        "csv-team-view-controls";

      controls.innerHTML = `
        <button
          type="button"
          data-team-view="list"
        >
          <i class="ri-list-check-2"></i>
          Lista
        </button>

        <button
          type="button"
          data-team-view="cards"
        >
          <i class="ri-layout-grid-line"></i>
          Cards por setor
        </button>
      `;

      toolbar.appendChild(controls);

      controls
        .querySelectorAll("[data-team-view]")
        .forEach((button) => {
          button.addEventListener(
            "click",
            () => setView(
              button.dataset.teamView
            )
          );
        });
    }

    let cards = document.getElementById(
      "csv-team-sector-cards"
    );

    if (!cards) {
      cards = document.createElement("div");
      cards.id = "csv-team-sector-cards";
      cards.className =
        "csv-team-sector-cards";

      panel.insertBefore(cards, list);
    }

    applyView();
  }

  function refresh() {
    ensureControls();

    if (viewMode === "cards") {
      renderCards();
    }
  }

  function observe() {
    const root =
      document.getElementById(
        "tab-colaboradores"
      ) || document.documentElement;

    if (
      root.dataset
        ?.csvTeamCardsObserved === "1"
    ) {
      return;
    }

    if (root.dataset) {
      root.dataset.csvTeamCardsObserved = "1";
    }

    new MutationObserver(() => {
      clearTimeout(observerTimer);
      observerTimer = setTimeout(
        refresh,
        90
      );
    }).observe(root, {
      childList: true,
      subtree: true
    });
  }

  function init() {
    observe();

    [120, 400, 900, 1800, 3200].forEach(
      (delay) => setTimeout(refresh, delay)
    );

    window.csvTeamSectorCards = {
      version: VERSION,
      refresh,
      setView
    };

    console.log(
      `CSV Team Sector Cards ${VERSION} carregado.`
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
})();
