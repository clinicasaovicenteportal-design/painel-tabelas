(() => {
  "use strict";

  const VERSION = "7.9.9";

  const periodState = {
    evaluation: {
      preset: "last_6_months",
      start: monthStartInput(-5),
      end: todayInput()
    },
    direct: {
      preset: "last_6_months",
      start: monthStartInput(-5),
      end: todayInput()
    }
  };

  let observerTimer = null;
  let originalDirectPerson = null;
  let currentDirectPerson = "";

  function phase() {
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

  function parseDate(value) {
    if (!value) return null;

    if (typeof value?.toDate === "function") {
      return value.toDate();
    }

    const raw = String(value || "").trim();
    if (!raw) return null;

    const brazil = raw.match(
      /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
    );

    if (brazil) {
      const date = new Date(
        Number(brazil[3]),
        Number(brazil[2]) - 1,
        Number(brazil[1]),
        Number(brazil[4] || 0),
        Number(brazil[5] || 0),
        Number(brazil[6] || 0)
      );

      return Number.isNaN(date.getTime())
        ? null
        : date;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const date = new Date(`${raw}T12:00:00`);

      return Number.isNaN(date.getTime())
        ? null
        : date;
    }

    const date = new Date(raw);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  function dateKey(value) {
    const date = parseDate(value);
    if (!date) return "";

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function todayInput() {
    return dateKey(new Date());
  }

  function monthStartInput(offset = 0) {
    const date = new Date();

    date.setMonth(
      date.getMonth() + offset,
      1
    );

    return dateKey(date);
  }

  function monthEndInput(offset = 0) {
    const date = new Date();

    date.setMonth(
      date.getMonth() + offset + 1,
      0
    );

    return dateKey(date);
  }

  function yearStartInput() {
    return `${new Date().getFullYear()}-01-01`;
  }

  function startOfDay(value) {
    const date = parseDate(value);
    if (!date) return null;

    date.setHours(0, 0, 0, 0);
    return date;
  }

  function endOfDay(value) {
    const date = parseDate(value);
    if (!date) return null;

    date.setHours(23, 59, 59, 999);
    return date;
  }

  function inRange(value, start, end) {
    const date = parseDate(value);
    const from = startOfDay(start);
    const until = endOfDay(end);

    return Boolean(
      date &&
      from &&
      until &&
      date.getTime() >= from.getTime() &&
      date.getTime() <= until.getTime()
    );
  }

  function formatDate(value) {
    const date = parseDate(value);

    return date
      ? date.toLocaleDateString("pt-BR")
      : "Sem data";
  }

  function periodLabel(state) {
    return `${formatDate(state.start)} a ${formatDate(state.end)}`;
  }

  function presetRange(preset) {
    if (preset === "current_month") {
      return {
        start: monthStartInput(0),
        end: monthEndInput(0)
      };
    }

    if (preset === "previous_month") {
      return {
        start: monthStartInput(-1),
        end: monthEndInput(-1)
      };
    }

    if (preset === "last_3_months") {
      return {
        start: monthStartInput(-2),
        end: todayInput()
      };
    }

    if (preset === "year") {
      return {
        start: yearStartInput(),
        end: todayInput()
      };
    }

    return {
      start: monthStartInput(-5),
      end: todayInput()
    };
  }

  function periodBarMarkup(scope, title) {
    const state = periodState[scope];

    return `
      <section
        class="csv-shared-period-bar"
        data-csv-period-scope="${scope}"
      >
        <div class="csv-shared-period-copy">
          <i class="ri-calendar-event-line"></i>
          <span>
            <strong>${esc(title)}</strong>
            <small>
              Resultados de ${esc(periodLabel(state))}
            </small>
          </span>
        </div>

        <label>
          <span>Período rápido</span>
          <select data-csv-period-preset>
            <option
              value="current_month"
              ${state.preset === "current_month" ? "selected" : ""}
            >
              Este mês
            </option>

            <option
              value="previous_month"
              ${state.preset === "previous_month" ? "selected" : ""}
            >
              Mês anterior
            </option>

            <option
              value="last_3_months"
              ${state.preset === "last_3_months" ? "selected" : ""}
            >
              Últimos 3 meses
            </option>

            <option
              value="last_6_months"
              ${state.preset === "last_6_months" ? "selected" : ""}
            >
              Últimos 6 meses
            </option>

            <option
              value="year"
              ${state.preset === "year" ? "selected" : ""}
            >
              Este ano
            </option>

            <option
              value="custom"
              ${state.preset === "custom" ? "selected" : ""}
            >
              Personalizado
            </option>
          </select>
        </label>

        <label>
          <span>Data inicial</span>
          <input
            type="date"
            value="${esc(state.start)}"
            data-csv-period-start
          >
        </label>

        <label>
          <span>Data final</span>
          <input
            type="date"
            value="${esc(state.end)}"
            data-csv-period-end
          >
        </label>

        <button
          type="button"
          data-csv-period-apply
        >
          <i class="ri-filter-3-line"></i>
          Aplicar período
        </button>
      </section>
    `;
  }

  function bindPeriodBar(bar, scope, callback) {
    if (!bar || bar.dataset.csvPeriodBound === "1") {
      return;
    }

    bar.dataset.csvPeriodBound = "1";

    const state = periodState[scope];
    const preset =
      bar.querySelector("[data-csv-period-preset]");
    const start =
      bar.querySelector("[data-csv-period-start]");
    const end =
      bar.querySelector("[data-csv-period-end]");
    const apply =
      bar.querySelector("[data-csv-period-apply]");

    const commit = () => {
      state.start = start.value;
      state.end = end.value;

      callback?.();
    };

    preset?.addEventListener("change", () => {
      state.preset = preset.value;

      if (preset.value !== "custom") {
        const range = presetRange(preset.value);

        state.start = range.start;
        state.end = range.end;

        start.value = state.start;
        end.value = state.end;
      }

      commit();
    });

    start?.addEventListener("change", () => {
      state.preset = "custom";
      preset.value = "custom";
    });

    end?.addEventListener("change", () => {
      state.preset = "custom";
      preset.value = "custom";
    });

    apply?.addEventListener(
      "click",
      commit
    );
  }

  function ensureReportButton(actions) {
    let button =
      document.getElementById(
        "csv-monthly-report-button"
      );

    if (
      button ||
      typeof window.csvReportsAccessibility
        ?.openReport !== "function"
    ) {
      return button;
    }

    button = document.createElement("button");
    button.type = "button";
    button.id = "csv-monthly-report-button";
    button.className =
      "csv2-button csv-monthly-report-button";
    button.innerHTML = `
      <i class="ri-file-pdf-2-line"></i>
      Relatório PDF
    `;

    button.addEventListener(
      "click",
      () =>
        window.csvReportsAccessibility
          .openReport()
    );

    actions.appendChild(button);

    return button;
  }

  function organizeHeaderActions() {
    const header =
      document.querySelector(
        "#csv2-bulletins-root > .csv2-page-header"
      );

    const actions =
      header?.querySelector(
        ".csv2-header-actions"
      );

    if (!header || !actions) return;

    ensureReportButton(actions);

    header.classList.add(
      "csv2-page-header-organized"
    );

    actions.classList.add(
      "csv2-header-actions-organized"
    );

    const order = [
      "csv-evaluation-center-button",
      "csv-unified-monitor-button",
      "csv2-performance-button",
      "csv-monthly-report-button",
      "csv2-new-bulletin-button"
    ];

    order.forEach((id) => {
      const button =
        document.getElementById(id);

      if (button && button.parentElement === actions) {
        actions.appendChild(button);
      }
    });

    actions
      .querySelectorAll("button")
      .forEach((button) => {
        button.classList.add(
          "csv2-organized-action-button"
        );
      });
  }

  function evaluationRowDate(row) {
    const text =
      row.querySelector(
        ".csv-evaluation-center-copy small"
      )?.textContent || "";

    return parseDate(text);
  }

  function evaluationBaseAllowed(
    row,
    modal
  ) {
    const search =
      normalize(
        modal.querySelector(
          "#csv-evaluation-search"
        )?.value || ""
      );

    const mode =
      modal.querySelector(
        "#csv-evaluation-filter"
      )?.value || "all";

    let allowed =
      !search ||
      normalize(row.textContent).includes(search);

    if (!allowed || mode === "all") {
      return allowed;
    }

    const admin =
      phase().profile?.admin === true ||
      phase().isAdmin === true;

    if (admin) {
      const count = Number(
        row.querySelector(
          ".csv-evaluation-center-metrics span strong"
        )?.textContent || 0
      );

      if (mode === "attention") {
        return row.classList.contains(
          "needs-attention"
        );
      }

      if (mode === "evaluated") {
        return count > 0;
      }

      if (mode === "empty") {
        return count === 0;
      }

      return true;
    }

    if (mode === "pending") {
      return row.classList.contains(
        "not-evaluated"
      );
    }

    if (mode === "evaluated") {
      return row.classList.contains(
        "evaluated"
      );
    }

    return true;
  }

  function recalculateEvaluationSummary(
    modal,
    visibleRows
  ) {
    const summary =
      modal.querySelector(
        ".csv-evaluation-center-summary"
      );

    if (!summary) return;

    const cards =
      [...summary.querySelectorAll("article")];

    let evaluationCount = 0;
    let weightedRating = 0;
    let requests = 0;

    visibleRows.forEach((row) => {
      const metrics =
        [...row.querySelectorAll(
          ".csv-evaluation-center-metrics span"
        )];

      const count = Number(
        metrics[0]?.querySelector("strong")
          ?.textContent || 0
      );

      const average = Number(
        String(
          metrics[1]?.querySelector("strong")
            ?.textContent || 0
        ).replace(",", ".")
      );

      evaluationCount += count;

      if (
        count > 0 &&
        Number.isFinite(average)
      ) {
        weightedRating +=
          average * count;
      }

      requests += Number(
        metrics[2]?.querySelector("strong")
          ?.textContent || 0
      );
    });

    const values = [
      visibleRows.length,
      evaluationCount,
      evaluationCount
        ? (
            weightedRating /
            evaluationCount
          ).toFixed(1)
        : "—",
      requests
    ];

    cards.forEach((card, index) => {
      const strong =
        card.querySelector("strong");

      if (strong && index < values.length) {
        strong.textContent =
          String(values[index]);
      }

      if (index === 3) {
        card.classList.toggle(
          "attention",
          requests > 0
        );
      }
    });
  }

  function applyEvaluationPeriod(modal) {
    const state =
      periodState.evaluation;

    const rows =
      [...modal.querySelectorAll(
        ".csv-evaluation-center-row"
      )];

    const visibleRows = [];

    rows.forEach((row) => {
      const date =
        evaluationRowDate(row);

      const dateAllowed =
        inRange(
          date,
          state.start,
          state.end
        );

      const allowed =
        dateAllowed &&
        evaluationBaseAllowed(row, modal);

      row.style.display =
        allowed ? "" : "none";

      if (allowed) {
        visibleRows.push(row);
      }
    });

    recalculateEvaluationSummary(
      modal,
      visibleRows
    );

    const list =
      modal.querySelector(
        "#csv-evaluation-center-list"
      );

    if (!list) return;

    let empty =
      list.querySelector(
        ".csv-evaluation-period-empty"
      );

    if (!visibleRows.length) {
      if (!empty) {
        empty =
          document.createElement("div");

        empty.className =
          "csv-engagement-empty csv-evaluation-period-empty";

        list.appendChild(empty);
      }

      empty.innerHTML = `
        <i class="ri-calendar-close-line"></i>
        <strong>
          Nenhum informativo neste período
        </strong>
        <span>
          Altere as datas ou os demais filtros.
        </span>
      `;
    } else {
      empty?.remove();
    }

    const copy =
      modal.querySelector(
        ".csv-shared-period-copy small"
      );

    if (copy) {
      copy.textContent =
        `Resultados de ${periodLabel(state)} • ${visibleRows.length} informativo(s)`;
    }
  }

  function enhanceEvaluationModal() {
    const modal =
      document.querySelector(
        "#csv-evaluation-center-root .csv-evaluation-center-modal"
      );

    if (!modal) return;

    let bar =
      modal.querySelector(
        '[data-csv-period-scope="evaluation"]'
      );

    if (!bar) {
      const body =
        modal.querySelector(
          ".csv-modal-body"
        );

      if (!body) return;

      body.insertAdjacentHTML(
        "afterbegin",
        periodBarMarkup(
          "evaluation",
          "Filtrar avaliações por data de publicação"
        )
      );

      bar =
        body.querySelector(
          '[data-csv-period-scope="evaluation"]'
        );
    }

    bindPeriodBar(
      bar,
      "evaluation",
      () =>
        applyEvaluationPeriod(modal)
    );

    if (
      modal.dataset
        .csvEvaluationPeriodEvents !== "1"
    ) {
      modal.dataset
        .csvEvaluationPeriodEvents = "1";

      const schedule = () => {
        window.setTimeout(
          () =>
            applyEvaluationPeriod(modal),
          25
        );
      };

      modal.addEventListener(
        "input",
        schedule,
        true
      );

      modal.addEventListener(
        "change",
        schedule,
        true
      );
    }

    applyEvaluationPeriod(modal);
  }

  function bulletinDate(item) {
    return String(
      item?.data?.["Data de Publicação"] ||
      item?.data?.dataPublicacao ||
      ""
    ).trim();
  }

  function targetName(item) {
    return String(
      item?.data?.["Para qual Colaborador?"] ||
      item?.data?.publicoPessoas?.[0] ||
      ""
    ).trim();
  }

  function targetSector(item, name) {
    const normalizedName =
      normalize(name);

    const collaborator =
      (phase().collaborators || [])
        .find((entry) =>
          normalize(
            entry?.data?.[
              "Nome Completo do Colaborador"
            ] ||
            entry?.data?.nome ||
            ""
          ) === normalizedName
        );

    const user =
      (phase().users || [])
        .find((entry) =>
          normalize(
            entry?.data?.nome || ""
          ) === normalizedName
        );

    return String(
      collaborator?.data?.[
        "Setor da Clínica"
      ] ||
      collaborator?.data?.setor ||
      user?.data?.setor ||
      item?.data?.setorDestinatario ||
      "Geral"
    ).trim() || "Geral";
  }

  function legacyHasRead(item, name) {
    return (
      Array.isArray(item?.data?.leituras) &&
      item.data.leituras.some(
        (entry) =>
          normalize(
            String(entry || "")
              .split(" (")[0]
              .trim()
          ) === normalize(name)
      )
    );
  }

  function structuredHasRead(
    item,
    name
  ) {
    const readings = [
      ...(phase().readings || []),
      ...(
        window.csvBulletinIntelligence
          ?.readings || []
      )
    ];

    return readings.some((entry) => {
      const data =
        entry?.data || {};

      const sameBulletin =
        String(
          data.boletimId ||
          data.bulletinId ||
          ""
        ) === String(item?.id || "");

      const samePerson =
        normalize(
          data.nome ||
          data.colaboradorNome ||
          ""
        ) === normalize(name);

      return sameBulletin && samePerson;
    });
  }

  function directItemsInPeriod() {
    const state =
      periodState.direct;

    return (phase().privateBulletins || [])
      .filter((item) =>
        inRange(
          bulletinDate(item),
          state.start,
          state.end
        )
      );
  }

  function directGroups() {
    const map = new Map();

    directItemsInPeriod()
      .forEach((item) => {
        const name =
          targetName(item);

        if (!name) return;

        const key =
          normalize(name);

        if (!map.has(key)) {
          map.set(key, {
            name,
            sector:
              targetSector(item, name),
            items: [],
            read: 0,
            pending: 0,
            rate: 0
          });
        }

        const group =
          map.get(key);

        const read =
          legacyHasRead(item, name) ||
          structuredHasRead(
            item,
            name
          );

        group.items.push(item);

        if (read) {
          group.read += 1;
        } else {
          group.pending += 1;
        }
      });

    return [...map.values()]
      .map((group) => ({
        ...group,
        rate:
          group.items.length
            ? Math.round(
                (
                  group.read /
                  group.items.length
                ) * 100
              )
            : 0
      }))
      .sort((a, b) =>
        a.name.localeCompare(
          b.name,
          "pt-BR"
        )
      );
  }

  function directCardMarkup(group) {
    return `
      <button
        type="button"
        class="csv-direct-monitor-person-card ${
          group.pending > 0
            ? "status-pending"
            : "status-complete"
        }"
        onclick="window.csvDirectMonitorOpenPerson('${esc(
          encodeURIComponent(group.name)
        )}')"
      >
        <span class="csv-direct-monitor-avatar">
          ${esc(group.name.charAt(0))}
        </span>

        <div>
          <h3>${esc(group.name)}</h3>
          <p>${esc(group.sector)}</p>

          <div class="csv-direct-monitor-progress">
            <i style="width:${group.rate}%"></i>
          </div>
        </div>

        <aside>
          <strong>${group.rate}%</strong>
          <small>
            ${group.read} lido(s)
            • ${group.pending} pendente(s)
          </small>
        </aside>

        <i class="ri-arrow-right-s-line"></i>
      </button>
    `;
  }

  function updateDirectSummary(
    modal,
    groups
  ) {
    const items =
      groups.flatMap(
        (group) => group.items
      );

    const read =
      groups.reduce(
        (sum, group) =>
          sum + group.read,
        0
      );

    const pending =
      Math.max(
        0,
        items.length - read
      );

    const rate =
      items.length
        ? Math.round(
            (read / items.length) * 100
          )
        : 0;

    const values = [
      items.length,
      groups.length,
      read,
      pending,
      `${rate}%`
    ];

    modal
      .querySelectorAll(
        ".csv-direct-monitor-summary article"
      )
      .forEach((card, index) => {
        const strong =
          card.querySelector("strong");

        if (strong && index < values.length) {
          strong.textContent =
            String(values[index]);
        }

        if (index === 3) {
          card.classList.toggle(
            "pending",
            pending > 0
          );
        }
      });
  }

  function enhanceDirectMain(modal) {
    const header =
      modal.querySelector(
        ".csv-direct-monitor-header:not(.person)"
      );

    const list =
      modal.querySelector(
        ".csv-direct-monitor-person-list"
      );

    if (!header || !list) return;

    let bar =
      modal.querySelector(
        '[data-csv-period-scope="direct"]'
      );

    if (!bar) {
      header.insertAdjacentHTML(
        "afterend",
        periodBarMarkup(
          "direct",
          "Filtrar acompanhamentos por data de publicação"
        )
      );

      bar =
        modal.querySelector(
          '[data-csv-period-scope="direct"]'
        );
    }

    bindPeriodBar(
      bar,
      "direct",
      () =>
        enhanceDirectMain(modal)
    );

    const groups =
      directGroups();

    updateDirectSummary(
      modal,
      groups
    );

    list.innerHTML =
      groups.length
        ? groups
            .map(directCardMarkup)
            .join("")
        : `
          <div class="csv-folder-empty">
            <i class="ri-calendar-close-line"></i>
            <strong>
              Nenhum direcionado neste período
            </strong>
            <span>
              Altere as datas para consultar outro intervalo.
            </span>
          </div>
        `;

    const copy =
      bar.querySelector(
        ".csv-shared-period-copy small"
      );

    if (copy) {
      copy.textContent =
        `Resultados de ${periodLabel(periodState.direct)} • ${groups.length} colaborador(es)`;
    }
  }

  function itemFromDirectCard(card) {
    const action =
      [...card.querySelectorAll(
        "[onclick]"
      )].find((element) =>
        String(
          element.getAttribute(
            "onclick"
          ) || ""
        ).includes(
          "csv2OpenBulletin"
        )
      );

    const match =
      String(
        action?.getAttribute(
          "onclick"
        ) || ""
      ).match(
        /csv2OpenBulletin\(\s*'([^']+)'/
      );

    return match?.[1]
      ? (
          phase().displayItems
            ?.get?.(match[1]) ||
          window.csv2GetDisplayItem?.(match[1])
        )
      : null;
  }

  function enhanceDirectPerson(modal) {
    const header =
      modal.querySelector(
        ".csv-direct-monitor-header.person"
      );

    const list =
      modal.querySelector(
        ".csv-direct-monitor-document-list"
      );

    if (!header || !list) return;

    let bar =
      modal.querySelector(
        '[data-csv-period-scope="direct"]'
      );

    if (!bar) {
      header.insertAdjacentHTML(
        "afterend",
        periodBarMarkup(
          "direct",
          "Filtrar informativos deste colaborador"
        )
      );

      bar =
        modal.querySelector(
          '[data-csv-period-scope="direct"]'
        );
    }

    bindPeriodBar(
      bar,
      "direct",
      () => {
        if (
          originalDirectPerson &&
          currentDirectPerson
        ) {
          originalDirectPerson(
            encodeURIComponent(
              currentDirectPerson
            )
          );

          window.setTimeout(
            enhanceDirectMonitor,
            40
          );
        }
      }
    );

    const cards =
      [...list.querySelectorAll(
        ".csv-folder-bulletin-card"
      )];

    let visible = 0;

    cards.forEach((card) => {
      const item =
        itemFromDirectCard(card);

      const allowed =
        item
          ? inRange(
              bulletinDate(item),
              periodState.direct.start,
              periodState.direct.end
            )
          : true;

      card.style.display =
        allowed ? "" : "none";

      if (allowed) {
        visible += 1;
      }
    });

    if (!visible) {
      let empty =
        list.querySelector(
          ".csv-direct-period-empty"
        );

      if (!empty) {
        empty =
          document.createElement("div");

        empty.className =
          "csv-folder-empty csv-direct-period-empty";

        list.appendChild(empty);
      }

      empty.innerHTML = `
        <i class="ri-calendar-close-line"></i>
        <strong>
          Nenhum informativo neste período
        </strong>
        <span>
          Altere as datas para visualizar outro intervalo.
        </span>
      `;
    } else {
      list.querySelector(
        ".csv-direct-period-empty"
      )?.remove();
    }

    const subtitle =
      header.querySelector("p");

    if (subtitle) {
      const sector =
        targetSector(
          directItemsInPeriod().find(
            (item) =>
              normalize(
                targetName(item)
              ) ===
              normalize(
                currentDirectPerson
              )
          ) || {},
          currentDirectPerson
        );

      subtitle.textContent =
        `${sector} • ${visible} informativo(s) • ${periodLabel(periodState.direct)}`;
    }

    const copy =
      bar.querySelector(
        ".csv-shared-period-copy small"
      );

    if (copy) {
      copy.textContent =
        `Resultados de ${periodLabel(periodState.direct)} • ${visible} informativo(s)`;
    }
  }

  function enhanceDirectMonitor() {
    const modal =
      document.getElementById(
        "csv-direct-monitor-fixed"
      );

    if (
      !modal ||
      !modal.classList.contains(
        "is-open"
      )
    ) {
      return;
    }

    if (
      modal.querySelector(
        ".csv-direct-monitor-header.person"
      )
    ) {
      enhanceDirectPerson(modal);
    } else {
      enhanceDirectMain(modal);
    }
  }

  function wrapDirectPerson() {
    const current =
      window.csvDirectMonitorOpenPerson;

    if (
      typeof current !== "function" ||
      current.__csvDatePeriodWrapped
    ) {
      return;
    }

    originalDirectPerson =
      current;

    const wrapped = function(encodedName) {
      currentDirectPerson =
        decodeURIComponent(
          encodedName || ""
        );

      const result =
        originalDirectPerson.call(
          this,
          encodedName
        );

      window.setTimeout(
        enhanceDirectMonitor,
        35
      );

      return result;
    };

    wrapped.__csvDatePeriodWrapped =
      true;

    window.csvDirectMonitorOpenPerson =
      wrapped;
  }

  function enhancePerformancePeriod() {
    if (
      document.getElementById(
        "csv2-performance-modal"
      )
    ) {
      window.csvReportsAccessibility
        ?.refresh?.();
    }
  }

  function enhanceUi() {
    window.csvReportsAccessibility
      ?.refresh?.();

    organizeHeaderActions();
    enhanceEvaluationModal();
    wrapDirectPerson();
    enhanceDirectMonitor();
    enhancePerformancePeriod();
  }

  function observeUi() {
    const root =
      document.getElementById(
        "tab-boletins"
      ) ||
      document.documentElement;

    if (
      root.dataset
        ?.csvDateFiltersObserved ===
      VERSION
    ) {
      return;
    }

    if (root.dataset) {
      root.dataset
        .csvDateFiltersObserved =
        VERSION;
    }

    new MutationObserver(() => {
      clearTimeout(observerTimer);

      observerTimer =
        window.setTimeout(
          enhanceUi,
          75
        );
    }).observe(root, {
      childList: true,
      subtree: true
    });
  }

  function init() {
    observeUi();

    [
      100,
      300,
      700,
      1300,
      2400,
      4000
    ].forEach((delay) => {
      window.setTimeout(
        enhanceUi,
        delay
      );
    });

    window.csvDateFiltersLayout = {
      version: VERSION,
      refresh: enhanceUi,
      periods: periodState
    };

    console.log(
      `CSV Date Filters Layout ${VERSION} carregado.`
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
