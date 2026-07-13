(() => {
  "use strict";

  const VERSION = "7.9.5";

  const uiState = {
    mode: "folders",
    folder: null,
    search: "",
    readerStatus: "all",
    readerSearch: "",
    readerRows: [],
    observerTimer: null
  };

  function phase() {
    return window.csvPhase2State || {};
  }

  function intelligence() {
    return window.csvBulletinIntelligence || {};
  }

  function isAdmin() {
    return phase().isAdmin === true;
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
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function unique(values = []) {
    return [...new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )];
  }

  function bulletinTitle(item) {
    return String(
      item?.data?.["Título do Informativo"] ||
      item?.data?.["Título do Documento"] ||
      item?.data?.titulo ||
      "Informativo"
    ).trim();
  }

  function bulletinDescription(item) {
    return String(
      item?.data?.descricao ||
      item?.data?.conteudo ||
      item?.data?.Motivo ||
      item?.data?.motivo ||
      ""
    ).trim();
  }

  function bulletinDate(item) {
    return String(
      item?.data?.["Data de Publicação"] ||
      item?.data?.dataPublicacao ||
      ""
    ).trim();
  }

  function bulletinDeadline(item) {
    return String(
      item?.data?.prazoLeitura ||
      item?.data?.["Prazo para Leitura"] ||
      ""
    ).trim();
  }

  function bulletinType(item) {
    return String(
      item?.data?.["Tipo (Urgente, Norma, Regra, etc)"] ||
      item?.data?.tipo ||
      "Informativo"
    ).trim();
  }

  function bulletinMedia(item) {
    return String(
      item?.data?.midiaTipo ||
      (
        item?.data?.["Links dos Materiais (1 por linha)"]
          ? "documento"
          : "texto"
      )
    ).trim();
  }

  function formatDate(value) {
    const raw = String(value || "").trim();
    if (!raw) return "Sem data";

    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? new Date(`${raw}T12:00:00`)
      : new Date(raw);

    return Number.isNaN(date.getTime())
      ? raw
      : date.toLocaleDateString("pt-BR");
  }

  function targetPerson(item) {
    return String(
      item?.data?.["Para qual Colaborador?"] ||
      item?.data?.publicoPessoas?.[0] ||
      ""
    ).trim();
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

  function activePeople() {
    const map = new Map();
    const state = phase();

    (state.collaborators || []).forEach((item) => {
      const name = collaboratorName(item);
      if (!name || item?.data?.ativo === false) return;

      map.set(normalize(name), {
        uid: String(item?.data?.uidAuth || ""),
        name,
        sector: collaboratorSector(item)
      });
    });

    (state.users || []).forEach((item) => {
      const data = item?.data || {};

      if (
        data.admin ||
        data.removido === true ||
        data.ativo === false ||
        !data.nome
      ) {
        return;
      }

      const key = normalize(data.nome);
      const existing = map.get(key) || {};

      map.set(key, {
        ...existing,
        uid: item.id || existing.uid || "",
        name: data.nome,
        sector: data.setor || existing.sector || "Geral"
      });
    });

    (state.privateBulletins || []).forEach((item) => {
      const name = targetPerson(item);
      if (!name) return;

      const key = normalize(name);
      const existing = map.get(key) || {};

      map.set(key, {
        ...existing,
        uid:
          existing.uid ||
          String(item?.data?.destinatarioUid || ""),
        name,
        sector:
          existing.sector ||
          item?.data?.setorDestinatario ||
          "Geral"
      });
    });

    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR")
    );
  }

  function generalItems() {
    return (phase().bulletins || []).map((item) => ({
      ...item,
      collectionName: "boletins",
      kind: "Geral"
    }));
  }

  function directItems() {
    return (phase().privateBulletins || []).map((item) => ({
      ...item,
      collectionName: "boletins-privados",
      kind: "Direcionado"
    }));
  }

  function legacySectors(item) {
    return unique(
      String(item?.data?.["Para quais Setores?"] || "")
        .split(",")
        .map((value) => value.trim())
        .filter(
          (value) =>
            value &&
            !normalize(value).includes("geral")
        )
    );
  }

  function itemSectors(item) {
    const direct = Array.isArray(item?.data?.publicoSetores)
      ? item.data.publicoSetores
      : [];

    return unique([...direct, ...legacySectors(item)]);
  }

  function isCompanyItem(item) {
    const type = item?.data?.publicoTipo;

    if (type === "todos") return true;
    if (type === "setores" || type === "pessoas") return false;

    const legacy = normalize(
      item?.data?.["Para quais Setores?"] || "Geral"
    );

    return !legacy || legacy.includes("geral");
  }

  function readingNames(item) {
    return new Set(
      (Array.isArray(item?.data?.leituras)
        ? item.data.leituras
        : []
      )
        .map((entry) =>
          String(entry || "").split(" (")[0].trim()
        )
        .filter(Boolean)
        .map(normalize)
    );
  }

  function structuredReading(item, person) {
    const readings = intelligence().readings || [];
    const personName = normalize(person?.name || "");
    const personUid = String(person?.uid || "");

    return readings.find((entry) => {
      const data = entry?.data || {};

      return (
        data.bulletinId === item?.id &&
        (
          !data.collectionName ||
          data.collectionName === item?.collectionName
        ) &&
        (
          (personUid && data.uid === personUid) ||
          normalize(data.nome || "") === personName
        )
      );
    }) || null;
  }

  function hasRead(item, person) {
    return Boolean(
      readingNames(item).has(normalize(person?.name || "")) ||
      structuredReading(item, person)
    );
  }

  function generalRecipients(item) {
    const people = activePeople();
    const data = item?.data || {};
    const type = data.publicoTipo;

    if (type === "todos") return people;

    if (type === "setores") {
      const sectors = itemSectors(item).map(normalize);
      return people.filter((person) =>
        sectors.includes(normalize(person.sector))
      );
    }

    if (type === "pessoas") {
      const names = unique(data.publicoPessoas || []).map(normalize);
      return people.filter((person) =>
        names.includes(normalize(person.name))
      );
    }

    if (isCompanyItem(item)) return people;

    const sectors = itemSectors(item).map(normalize);

    return people.filter((person) =>
      sectors.includes(normalize(person.sector))
    );
  }

  function directRecipients(item) {
    const docs = item?.groupDocs?.length
      ? item.groupDocs
      : [item];

    return docs
      .map((docItem) => {
        const name = targetPerson(docItem);
        const matched = activePeople().find(
          (person) => normalize(person.name) === normalize(name)
        );

        return {
          item: {
            ...docItem,
            collectionName: "boletins-privados"
          },
          person: matched || {
            uid: String(docItem?.data?.destinatarioUid || ""),
            name: name || "Destinatário não identificado",
            sector:
              docItem?.data?.setorDestinatario || "Geral"
          }
        };
      })
      .filter((row) => row.person.name);
  }

  function recipientRows(item) {
    if (
      item?.collectionName === "boletins-privados" ||
      item?.kind === "Direcionado"
    ) {
      return directRecipients(item).map(({ item: docItem, person }) => {
        const reading = structuredReading(docItem, person);

        return {
          item: docItem,
          person,
          read: hasRead(docItem, person),
          readAt:
            reading?.data?.lidoEmIso ||
            reading?.data?.lidoEm?.toDate?.()?.toISOString?.() ||
            ""
        };
      });
    }

    return generalRecipients(item).map((person) => {
      const reading = structuredReading(item, person);

      return {
        item,
        person,
        read: hasRead(item, person),
        readAt:
          reading?.data?.lidoEmIso ||
          reading?.data?.lidoEm?.toDate?.()?.toISOString?.() ||
          ""
      };
    });
  }

  function itemStats(item) {
    const rows = recipientRows(item);
    const read = rows.filter((row) => row.read).length;
    const total = rows.length;

    return {
      total,
      read,
      pending: Math.max(0, total - read),
      rate: total ? Math.round((read / total) * 100) : 0
    };
  }

  function folderStats(items) {
    const totals = items.reduce(
      (stats, item) => {
        const current = itemStats(item);

        stats.documents += 1;
        stats.assigned += current.total;
        stats.read += current.read;
        stats.pending += current.pending;

        return stats;
      },
      {
        documents: 0,
        assigned: 0,
        read: 0,
        pending: 0
      }
    );

    const people = new Map();

    items.forEach((item) => {
      recipientRows(item).forEach((row) => {
        const key = String(
          row.person?.uid ||
          normalize(row.person?.name || "")
        );

        if (!key) return;

        const current = people.get(key) || {
          pending: false
        };

        if (!row.read) {
          current.pending = true;
        }

        people.set(key, current);
      });
    });

    const peopleRows = [...people.values()];
    const peoplePending = peopleRows.filter(
      (person) => person.pending
    ).length;

    const peopleTotal = peopleRows.length;
    const peopleComplete = Math.max(
      0,
      peopleTotal - peoplePending
    );

    return {
      ...totals,
      peopleTotal,
      peopleComplete,
      peoplePending,
      peopleRate:
        peopleTotal
          ? Math.round(
              (
                peopleComplete /
                peopleTotal
              ) * 100
            )
          : 0
    };
  }

  function companyFolder() {
    const items = generalItems().filter(isCompanyItem);

    return {
      kind: "company",
      key: "company",
      name: "Toda a clínica",
      subtitle: "Boletins enviados para toda a empresa",
      icon: "ri-building-4-line",
      items,
      stats: folderStats(items)
    };
  }

  function sectorFolders() {
    const map = new Map();

    generalItems().forEach((item) => {
      itemSectors(item).forEach((sector) => {
        const key = normalize(sector);

        if (!map.has(key)) {
          map.set(key, {
            kind: "sector",
            key: sector,
            name: sector,
            subtitle: "Informativos destinados ao setor",
            icon: "ri-folder-user-line",
            items: []
          });
        }

        map.get(key).items.push(item);
      });
    });

    return [...map.values()]
      .map((folder) => ({
        ...folder,
        stats: folderStats(folder.items)
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
      );
  }

  function personFolders() {
    const map = new Map();

    directItems().forEach((item) => {
      const name = targetPerson(item);
      if (!name) return;

      const key = normalize(name);

      if (!map.has(key)) {
        const person = activePeople().find(
          (entry) => normalize(entry.name) === key
        );

        map.set(key, {
          kind: "person",
          key: name,
          name,
          subtitle:
            person?.sector ||
            item?.data?.setorDestinatario ||
            "Informativo individual",
          icon: "ri-user-star-line",
          items: []
        });
      }

      map.get(key).items.push(item);
    });

    return [...map.values()]
      .map((folder) => ({
        ...folder,
        stats: folderStats(folder.items)
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
      );
  }

  function allFolders() {
    return {
      company: companyFolder(),
      sectors: sectorFolders(),
      people: personFolders()
    };
  }

  function displayKey(item, suffix = "") {
    return [
      "csv-folder",
      item?.collectionName || "boletins",
      item?.id || Math.random().toString(36).slice(2),
      suffix
    ].join("-");
  }

  function registerDisplayItem(item, suffix = "") {
    const state = phase();
    const key = displayKey(item, suffix);

    if (!(state.displayItems instanceof Map)) {
      state.displayItems = new Map();
    }

    state.displayItems.set(key, item);

    return key;
  }

  function folderCard(folder, tone) {
    const stats = folder.stats;
    const statusClass = stats.peopleTotal === 0
      ? "status-neutral"
      : stats.peoplePending > 0
        ? "status-pending"
        : "status-complete";

    return `
      <button
        type="button"
        class="csv-folder-card ${tone} ${statusClass}"
        onclick="window.csvBulletinFoldersOpen(
          '${folder.kind}',
          '${esc(encodeURIComponent(folder.key))}'
        )"
      >
        <div class="csv-folder-card-icon">
          <i class="${folder.icon}"></i>
        </div>

        <div class="csv-folder-card-copy">
          <span>${esc(folder.subtitle)}</span>
          <h3>${esc(folder.name)}</h3>
          <small>
            ${stats.documents} informativo(s)
            • ${stats.peopleTotal} colaborador(es)
          </small>
        </div>

        <div class="csv-folder-card-metrics">
          <span class="complete">
            <strong>${stats.peopleComplete}</strong>
            Em dia
          </span>

          <span class="${stats.peoplePending ? "pending" : "complete"}">
            <strong>${stats.peoplePending}</strong>
            Com pendência
          </span>
        </div>

        <div class="csv-folder-card-progress">
          <i style="width:${stats.peopleRate}%"></i>
        </div>

        <span class="csv-folder-card-arrow">
          <i class="ri-arrow-right-line"></i>
        </span>
      </button>
    `;
  }

  function foldersMarkup() {
    const folders = allFolders();
    const search = normalize(uiState.search);

    const company = folders.company.items.length
      ? [folders.company]
      : [];

    const filterFolder = (folder) =>
      !search ||
      normalize(`${folder.name} ${folder.subtitle}`).includes(search);

    const sectors = folders.sectors.filter(filterFolder);
    const people = folders.people.filter(filterFolder);
    const companyFiltered = company.filter(filterFolder);

    return `
      <div class="csv-folder-view">
        ${companyFiltered.length ? `
          <section class="csv-folder-section">
            <div class="csv-folder-section-title">
              <span><i class="ri-building-4-line"></i> Empresa</span>
              <small>Comunicações gerais</small>
            </div>
            <div class="csv-folder-grid company">
              ${companyFiltered.map((folder) => folderCard(folder, "company")).join("")}
            </div>
          </section>
        ` : ""}

        <section class="csv-folder-section">
          <div class="csv-folder-section-title">
            <span><i class="ri-team-line"></i> Setores</span>
            <small>${sectors.length} pasta(s)</small>
          </div>
          <div class="csv-folder-grid">
            ${sectors.length
              ? sectors.map((folder) => folderCard(folder, "sector")).join("")
              : `
                <div class="csv-folder-empty compact">
                  <i class="ri-folder-open-line"></i>
                  <strong>Nenhuma pasta de setor encontrada</strong>
                  <span>Ao publicar para um setor, a pasta será criada automaticamente.</span>
                </div>
              `}
          </div>
        </section>

        <section class="csv-folder-section">
          <div class="csv-folder-section-title">
            <span><i class="ri-user-star-line"></i> Colaboradores</span>
            <small>${people.length} pasta(s)</small>
          </div>
          <div class="csv-folder-grid">
            ${people.length
              ? people.map((folder) => folderCard(folder, "person")).join("")
              : `
                <div class="csv-folder-empty compact">
                  <i class="ri-user-received-line"></i>
                  <strong>Nenhum direcionado encontrado</strong>
                  <span>Selecione “Colaboradores direcionados” no cadastro.</span>
                </div>
              `}
          </div>
        </section>
      </div>
    `;
  }

  function folderByKind(kind, key) {
    const decoded = decodeURIComponent(key || "");
    const folders = allFolders();

    if (kind === "company") return folders.company;

    if (kind === "sector") {
      return folders.sectors.find(
        (folder) => normalize(folder.key) === normalize(decoded)
      ) || null;
    }

    if (kind === "person") {
      return folders.people.find(
        (folder) => normalize(folder.key) === normalize(decoded)
      ) || null;
    }

    return null;
  }

  function audienceText(item) {
    if (item.collectionName === "boletins-privados") {
      return targetPerson(item) || "Colaborador";
    }

    if (isCompanyItem(item)) return "Toda a clínica";

    return itemSectors(item).join(", ") || "Setores";
  }

  function bulletinCard(item, index = 0) {
    const key = registerDisplayItem(item, String(index));
    const stats = itemStats(item);
    const deadline = bulletinDeadline(item);

    return `
      <article class="csv-folder-bulletin-card ${stats.pending > 0 ? "status-pending" : "status-complete"}">
        <div class="csv-folder-bulletin-icon">
          <i class="${
            bulletinMedia(item) === "video"
              ? "ri-video-line"
              : bulletinMedia(item) === "audio"
                ? "ri-volume-up-line"
                : bulletinMedia(item) === "texto"
                  ? "ri-article-line"
                  : "ri-file-text-line"
          }"></i>
        </div>

        <div class="csv-folder-bulletin-copy">
          <div class="csv-folder-bulletin-tags">
            <span>${esc(bulletinType(item))}</span>
            <span>${esc(bulletinMedia(item))}</span>
            ${deadline
              ? `<span class="deadline">Prazo ${esc(formatDate(deadline))}</span>`
              : ""}
          </div>

          <h3>${esc(bulletinTitle(item))}</h3>
          <p>${esc(bulletinDescription(item) || "Sem descrição adicional.")}</p>
          <small>
            <i class="ri-calendar-line"></i>${esc(formatDate(bulletinDate(item)))}
            <i class="ri-user-received-2-line"></i>${esc(audienceText(item))}
          </small>
        </div>

        <div class="csv-folder-bulletin-reading">
          <strong>${stats.rate}%</strong>
          <span>${stats.read}/${stats.total} leituras</span>
          <div><i style="width:${stats.rate}%"></i></div>
        </div>

        <div class="csv-folder-bulletin-actions">
          <button type="button" onclick="window.csv2OpenBulletin('${key}')">
            <i class="ri-eye-line"></i>Abrir
          </button>
          <button type="button" onclick="window.csvBulletinOpenReadStatus('${key}')">
            <i class="ri-group-line"></i>Leitores
          </button>
          <button type="button" onclick="window.csv2EditBulletin('${key}')">
            <i class="ri-edit-line"></i>Editar
          </button>
          <button type="button" class="danger" onclick="window.csv2DeleteBulletin('${key}')">
            <i class="ri-delete-bin-line"></i>Excluir
          </button>
        </div>
      </article>
    `;
  }

  function folderDetailMarkup(folder) {
    const stats = folder.stats;

    return `
      <div class="csv-folder-detail">
        <header class="csv-folder-detail-header">
          <button type="button" class="csv-folder-back" onclick="window.csvBulletinFoldersBack()">
            <i class="ri-arrow-left-line"></i>Voltar para as pastas
          </button>

          <div class="csv-folder-detail-identity ${folder.kind}">
            <div><i class="${folder.icon}"></i></div>
            <section>
              <span>${esc(folder.subtitle)}</span>
              <h3>${esc(folder.name)}</h3>
              <p>${stats.documents} informativo(s) • ${stats.peopleTotal} colaborador(es) • ${stats.peopleComplete} em dia • ${stats.peoplePending} com pendência</p>
            </section>
          </div>
        </header>

        <div class="csv-folder-detail-list">
          ${folder.items.length
            ? folder.items
                .slice()
                .sort((a, b) => bulletinDate(b).localeCompare(bulletinDate(a)))
                .map((item, index) => bulletinCard(item, index))
                .join("")
            : `<div class="csv-folder-empty"><i class="ri-inbox-line"></i><strong>Esta pasta ainda está vazia</strong></div>`}
        </div>
      </div>
    `;
  }

  function allItemsForMode(mode) {
    if (mode === "company") return generalItems().filter(isCompanyItem);
    if (mode === "sectors") return generalItems().filter((item) => !isCompanyItem(item));
    if (mode === "people") return directItems();
    return [...generalItems(), ...directItems()];
  }

  function listMarkup(mode) {
    const search = normalize(uiState.search);
    const items = allItemsForMode(mode)
      .filter((item) => {
        if (!search) return true;
        return normalize([
          bulletinTitle(item),
          bulletinDescription(item),
          audienceText(item),
          bulletinType(item)
        ].join(" ")).includes(search);
      })
      .sort((a, b) => bulletinDate(b).localeCompare(bulletinDate(a)));

    return `
      <div class="csv-folder-flat-list">
        ${items.length
          ? items.map((item, index) => bulletinCard(item, index)).join("")
          : `<div class="csv-folder-empty"><i class="ri-inbox-line"></i><strong>Nenhum informativo encontrado</strong><span>Altere o filtro ou a pesquisa.</span></div>`}
      </div>
    `;
  }

  function renderBrowserContent() {
    const holder = document.getElementById("csv-bulletin-folder-content");
    if (!holder || !isAdmin()) return;

    phase().displayItems?.clear?.();

    if (uiState.folder) {
      const folder = folderByKind(uiState.folder.kind, uiState.folder.key);
      holder.innerHTML = folder ? folderDetailMarkup(folder) : foldersMarkup();
      return;
    }

    holder.innerHTML = uiState.mode === "folders"
      ? foldersMarkup()
      : listMarkup(uiState.mode);
  }

  function applyFolderBrowser() {
    if (!isAdmin()) return;

    const root = document.getElementById("csv2-bulletins-root");
    const section = root?.querySelector(".csv2-bulletin-list-card");

    if (!root || !section) return;

    if (
      section.dataset.csvFolderBrowser === VERSION &&
      document.getElementById("csv-bulletin-folder-content")
    ) return;

    section.dataset.csvFolderBrowser = VERSION;
    section.classList.add("csv-folder-browser-card");

    section.innerHTML = `
      <div class="csv-folder-browser-heading">
        <div>
          <span>Organização automática</span>
          <h3>Pastas de boletins</h3>
          <p>Cada publicação é organizada conforme o destino escolhido: empresa, setor ou colaborador.</p>
        </div>

        <div class="csv-folder-browser-tools">
          <label>
            <i class="ri-search-line"></i>
            <input id="csv-folder-search" placeholder="Pesquisar pasta ou informativo..." value="${esc(uiState.search)}">
          </label>

          <div class="csv-folder-view-switch">
            <button type="button" data-mode="folders" class="${uiState.mode === "folders" ? "active" : ""}"><i class="ri-folder-3-line"></i>Pastas</button>
            <button type="button" data-mode="all" class="${uiState.mode === "all" ? "active" : ""}">Todos</button>
            <button type="button" data-mode="company" class="${uiState.mode === "company" ? "active" : ""}">Empresa</button>
            <button type="button" data-mode="sectors" class="${uiState.mode === "sectors" ? "active" : ""}">Setores</button>
            <button type="button" data-mode="people" class="${uiState.mode === "people" ? "active" : ""}">Direcionados</button>
          </div>
        </div>
      </div>

      <div id="csv-bulletin-folder-content"></div>
    `;

    section.querySelectorAll(".csv-folder-view-switch button").forEach((button) => {
      button.addEventListener("click", () => {
        uiState.mode = button.dataset.mode || "folders";
        uiState.folder = null;
        section.querySelectorAll(".csv-folder-view-switch button").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        renderBrowserContent();
      });
    });

    section.querySelector("#csv-folder-search")?.addEventListener("input", (event) => {
      uiState.search = event.target.value;
      uiState.folder = null;
      renderBrowserContent();
    });

    renderBrowserContent();
  }

  window.csvBulletinFoldersOpen = function(kind, encodedKey) {
    uiState.folder = { kind, key: decodeURIComponent(encodedKey || "") };
    renderBrowserContent();
  };

  window.csvBulletinFoldersBack = function() {
    uiState.folder = null;
    uiState.mode = "folders";

    const section = document.querySelector(".csv-folder-browser-card");
    section?.querySelectorAll(".csv-folder-view-switch button").forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === "folders");
    });

    renderBrowserContent();
  };

  function ensureReaderModal() {
    let modal = document.getElementById("csv-folder-readers-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "csv-folder-readers-modal";
    modal.className = "csv-folder-modal";
    modal.innerHTML = `
      <div class="csv-folder-modal-card readers">
        <button type="button" class="csv-folder-modal-close" onclick="window.csvBulletinFoldersCloseReaders()"><i class="ri-close-line"></i></button>
        <div id="csv-folder-readers-content"></div>
      </div>
    `;

    modal.addEventListener("click", (event) => {
      if (event.target === modal) window.csvBulletinFoldersCloseReaders();
    });

    document.body.appendChild(modal);
    return modal;
  }

  function renderReaderRows() {
    const holder = document.getElementById("csv-folder-reader-rows");
    if (!holder) return;

    const search = normalize(uiState.readerSearch);
    const rows = uiState.readerRows.filter((row) => {
      const matchesStatus =
        uiState.readerStatus === "all" ||
        (uiState.readerStatus === "read" && row.read) ||
        (uiState.readerStatus === "pending" && !row.read);

      const matchesSearch =
        !search ||
        normalize(`${row.person.name} ${row.person.sector}`).includes(search);

      return matchesStatus && matchesSearch;
    });

    holder.innerHTML = rows.length
      ? rows.map((row) => `
          <article class="csv-folder-reader-row ${row.read ? "read" : "pending"}">
            <div class="csv-folder-reader-person">
              <span>${esc(row.person.name.charAt(0) || "?")}</span>
              <div><strong>${esc(row.person.name)}</strong><small>${esc(row.person.sector || "Geral")}</small></div>
            </div>
            <div class="csv-folder-reader-state">
              <span class="${row.read ? "read" : "pending"}">
                <i class="${row.read ? "ri-checkbox-circle-line" : "ri-time-line"}"></i>
                ${row.read ? "Lido" : "Pendente"}
              </span>
              ${row.readAt ? `<small>${esc(formatDate(row.readAt))}</small>` : ""}
            </div>
          </article>
        `).join("")
      : `<div class="csv-folder-empty compact"><i class="ri-user-search-line"></i><strong>Nenhum destinatário neste filtro</strong><span>Verifique os colaboradores e os setores vinculados.</span></div>`;
  }

  function openReaders(key) {
    const item = phase().displayItems?.get?.(key) || window.csv2GetDisplayItem?.(key);
    if (!item || !isAdmin()) return;

    const rows = recipientRows(item);
    const read = rows.filter((row) => row.read).length;
    const pending = rows.length - read;

    uiState.readerRows = rows;
    uiState.readerStatus = "all";
    uiState.readerSearch = "";

    const modal = ensureReaderModal();
    const content = modal.querySelector("#csv-folder-readers-content");

    content.innerHTML = `
      <header class="csv-folder-reader-header">
        <span><i class="ri-group-line"></i>Leitores do informativo</span>
        <h2>${esc(bulletinTitle(item))}</h2>
        <p>Acompanhe quem concluiu a leitura e quem ainda possui pendência.</p>
      </header>

      <section class="csv-folder-reader-summary">
        <article><span>Destinatários</span><strong>${rows.length}</strong></article>
        <article class="read"><span>Leituras</span><strong>${read}</strong></article>
        <article class="${pending ? "pending" : ""}"><span>Pendências</span><strong>${pending}</strong></article>
        <article><span>Índice</span><strong>${rows.length ? Math.round((read / rows.length) * 100) : 0}%</strong></article>
      </section>

      <div class="csv-folder-reader-toolbar">
        <label><i class="ri-search-line"></i><input id="csv-folder-reader-search" placeholder="Pesquisar colaborador..."></label>
        <div>
          <button class="active" data-reader-status="all">Todos</button>
          <button data-reader-status="read">Lidos</button>
          <button data-reader-status="pending">Pendentes</button>
        </div>
      </div>

      <div id="csv-folder-reader-rows" class="csv-folder-reader-list"></div>
    `;

    content.querySelector("#csv-folder-reader-search")?.addEventListener("input", (event) => {
      uiState.readerSearch = event.target.value;
      renderReaderRows();
    });

    content.querySelectorAll("[data-reader-status]").forEach((button) => {
      button.addEventListener("click", () => {
        uiState.readerStatus = button.dataset.readerStatus || "all";
        content.querySelectorAll("[data-reader-status]").forEach((itemButton) => itemButton.classList.remove("active"));
        button.classList.add("active");
        renderReaderRows();
      });
    });

    renderReaderRows();
    modal.classList.add("is-open");
  }

  window.csvBulletinOpenReadStatus = openReaders;

  window.csvBulletinFoldersCloseReaders = function() {
    document.getElementById("csv-folder-readers-modal")?.classList.remove("is-open");
  };

  function directMetrics() {
    const folders = personFolders();
    const items = directItems();
    const stats = folderStats(items);

    return {
      folders,
      documents: items.length,
      collaborators: folders.length,
      read: stats.read,
      pending: stats.pending,
      assigned: stats.assigned,
      rate: stats.assigned ? Math.round((stats.read / stats.assigned) * 100) : 0
    };
  }

  function directMonitorFolderCard(folder) {
    const stats = folder.stats;
    const rate = stats.assigned ? Math.round((stats.read / stats.assigned) * 100) : 0;

    return `
      <button type="button" class="csv-direct-monitor-person-card ${stats.pending > 0 ? "status-pending" : "status-complete"}" onclick="window.csvDirectMonitorOpenPerson('${esc(encodeURIComponent(folder.key))}')">
        <span class="csv-direct-monitor-avatar">${esc(folder.name.charAt(0))}</span>
        <div>
          <h3>${esc(folder.name)}</h3>
          <p>${esc(folder.subtitle)}</p>
          <div class="csv-direct-monitor-progress"><i style="width:${rate}%"></i></div>
        </div>
        <aside><strong>${rate}%</strong><small>${stats.read} lido(s) • ${stats.pending} pendente(s)</small></aside>
        <i class="ri-arrow-right-s-line"></i>
      </button>
    `;
  }

  function ensureDirectMonitor() {
    let modal = document.getElementById("csv-direct-monitor-fixed");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "csv-direct-monitor-fixed";
    modal.className = "csv-folder-modal direct-monitor";
    modal.innerHTML = `
      <div class="csv-folder-modal-card direct">
        <button type="button" class="csv-folder-modal-close" onclick="window.csvDirectMonitorClose()"><i class="ri-close-line"></i></button>
        <div id="csv-direct-monitor-content"></div>
      </div>
    `;

    modal.addEventListener("click", (event) => {
      if (event.target === modal) window.csvDirectMonitorClose();
    });

    document.body.appendChild(modal);
    return modal;
  }

  function renderDirectMonitor() {
    const modal = ensureDirectMonitor();
    const content = modal.querySelector("#csv-direct-monitor-content");
    const metrics = directMetrics();

    content.innerHTML = `
      <header class="csv-direct-monitor-header">
        <div>
          <span><i class="ri-user-star-line"></i>Gestão de informativos direcionados</span>
          <h2>Acompanhamento individual</h2>
          <p>Consulte as pastas dos colaboradores, leituras e pendências sem sair da Central de Boletins.</p>
        </div>
        <button type="button" onclick="window.csvDirectMonitorCreate()"><i class="ri-add-line"></i>Novo direcionado</button>
      </header>

      <section class="csv-direct-monitor-summary">
        <article><span>Informativos</span><strong>${metrics.documents}</strong><i class="ri-file-user-line"></i></article>
        <article><span>Colaboradores</span><strong>${metrics.collaborators}</strong><i class="ri-team-line"></i></article>
        <article class="read"><span>Leituras</span><strong>${metrics.read}</strong><i class="ri-checkbox-circle-line"></i></article>
        <article class="${metrics.pending ? "pending" : ""}"><span>Pendências</span><strong>${metrics.pending}</strong><i class="ri-time-line"></i></article>
        <article><span>Índice geral</span><strong>${metrics.rate}%</strong><i class="ri-line-chart-line"></i></article>
      </section>

      <section class="csv-direct-monitor-list-section">
        <div>
          <span>Pastas individuais</span>
          <h3>Colaboradores e acompanhamento</h3>
          <p>Abra uma pasta para visualizar todos os informativos direcionados àquela pessoa.</p>
        </div>
        <div class="csv-direct-monitor-person-list">
          ${metrics.folders.length
            ? metrics.folders.map(directMonitorFolderCard).join("")
            : `<div class="csv-folder-empty"><i class="ri-inbox-line"></i><strong>Nenhum informativo direcionado</strong><span>Cadastre um novo informativo e selecione colaboradores direcionados.</span></div>`}
        </div>
      </section>
    `;

    modal.classList.add("is-open");
  }

  window.csvDirectMonitorOpenPerson = function(encodedName) {
    const name = decodeURIComponent(encodedName || "");
    const folder = personFolders().find((item) => normalize(item.name) === normalize(name));
    if (!folder) return;

    const modal = ensureDirectMonitor();
    const content = modal.querySelector("#csv-direct-monitor-content");
    phase().displayItems?.clear?.();

    content.innerHTML = `
      <header class="csv-direct-monitor-header person">
        <button type="button" class="back" onclick="window.csvDirectMonitorBack()"><i class="ri-arrow-left-line"></i>Voltar</button>
        <div>
          <span>Relatório individual</span>
          <h2>${esc(folder.name)}</h2>
          <p>${esc(folder.subtitle)} • ${folder.stats.documents} informativo(s)</p>
        </div>
      </header>
      <div class="csv-direct-monitor-document-list">
        ${folder.items.length
          ? folder.items.slice().sort((a, b) => bulletinDate(b).localeCompare(bulletinDate(a))).map((item, index) => bulletinCard(item, index)).join("")
          : `<div class="csv-folder-empty"><strong>Nenhum documento nesta pasta</strong></div>`}
      </div>
    `;
  };

  window.csvDirectMonitorBack = renderDirectMonitor;

  window.csvDirectMonitorClose = function() {
    document.getElementById("csv-direct-monitor-fixed")?.classList.remove("is-open");
  };

  window.csvDirectMonitorCreate = function() {
    window.csvDirectMonitorClose();
    window.irParaAba?.("boletins");

    setTimeout(() => {
      document.getElementById("csv2-new-bulletin-button")?.click();

      setTimeout(() => {
        const audience = document.getElementById("csv2-b-audience");
        if (audience) {
          audience.value = "pessoas";
          audience.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }, 100);
    }, 120);
  };

  function bindMonitorButton() {
    const current = document.getElementById("csv-unified-monitor-button");
    if (!current || current.dataset.csvFolderFixed === VERSION) return;

    const replacement = current.cloneNode(true);
    replacement.dataset.csvFolderFixed = VERSION;
    replacement.innerHTML = '<i class="ri-dashboard-3-line"></i> Acompanhamento direcionados';

    current.replaceWith(replacement);
    replacement.addEventListener("click", renderDirectMonitor);
  }

  function removeTeachingCard() {
    document.querySelectorAll("#tab-home .shortcut-card").forEach((card) => {
      const handler = card.getAttribute("onclick") || "";
      const title = card.querySelector(".shortcut-title")?.textContent || "";

      if (
        handler.includes("irParaAba('ensino')") ||
        handler.includes('irParaAba("ensino")') ||
        normalize(title) === "ensino"
      ) {
        card.remove();
      }
    });
  }

  function apply() {
    removeTeachingCard();
    bindMonitorButton();
    applyFolderBrowser();
    window.csvBulletinOpenReadStatus = openReaders;
  }

  function init() {
    apply();

    const observer = new MutationObserver(() => {
      clearTimeout(uiState.observerTimer);
      uiState.observerTimer = setTimeout(apply, 55);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    [100, 300, 700, 1400, 2600].forEach((delay) => {
      setTimeout(apply, delay);
    });

    window.csvBulletinFoldersRefresh = apply;
    console.log(`CSV Bulletin Folders ${VERSION} carregado.`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
