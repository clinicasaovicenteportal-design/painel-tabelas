import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const CSV_REPORTS_ACCESSIBILITY_VERSION = "7.9.8";

const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

let performanceChart = null;
let originalOpenBulletin = null;
let observerTimer = null;
let speechUtterance = null;

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

function unique(values = []) {
  return [...new Set(
    values
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )];
}

function parseDate(value) {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  const raw = String(value || "").trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

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
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
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

function formatDate(value) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString("pt-BR") : "Sem data";
}

function formatDateTime(value) {
  const date = parseDate(value);

  return date
    ? date.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "medium"
      })
    : "Horário não registrado";
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
    date >= from &&
    date <= until
  );
}

function todayInput() {
  return dateKey(new Date());
}

function monthStartInput(offset = 0) {
  const date = new Date();
  date.setMonth(date.getMonth() + offset, 1);
  return dateKey(date);
}

function monthEndInput(offset = 0) {
  const date = new Date();
  date.setMonth(date.getMonth() + offset + 1, 0);
  return dateKey(date);
}

function yearStartInput() {
  return `${new Date().getFullYear()}-01-01`;
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

function accessibleText(item) {
  return String(
    item?.data?.textoAcessivel ||
    item?.data?.textoParaLeitura ||
    bulletinDescription(item)
  ).trim();
}

function supplementalAudio(item) {
  return String(
    item?.data?.audioComplementarUrl ||
    item?.data?.audioUrl ||
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
  const state = phase();
  const map = new Map();

  (state.collaborators || []).forEach((item) => {
    const name = collaboratorName(item);
    const data = item?.data || {};

    if (
      !name ||
      data.ativo === false ||
      data.removido === true
    ) {
      return;
    }

    map.set(normalize(name), {
      uid: String(data.uidAuth || ""),
      name,
      sector: collaboratorSector(item),
      email: String(data.email || "")
    });
  });

  (state.users || []).forEach((item) => {
    const data = item?.data || {};

    if (
      data.admin === true ||
      data.ativo === false ||
      data.removido === true ||
      !data.nome
    ) {
      return;
    }

    const key = normalize(data.nome);
    const existing = map.get(key) || {};

    map.set(key, {
      ...existing,
      uid: String(item.id || existing.uid || ""),
      name: data.nome,
      sector: data.setor || existing.sector || "Geral",
      email: data.email || existing.email || ""
    });
  });

  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR")
  );
}

function itemSectors(item) {
  const data = item?.data || {};

  if (Array.isArray(data.publicoSetores)) {
    return unique(data.publicoSetores);
  }

  return unique(
    String(data["Para quais Setores?"] || "")
      .split(",")
      .map((value) => value.trim())
      .filter(
        (value) =>
          value &&
          !normalize(value).includes("geral")
      )
  );
}

function groupedBulletins() {
  const state = phase();

  const general = (state.bulletins || []).map(
    (item) => ({
      id: item.id,
      groupId: item.id,
      collectionName: "boletins",
      data: item.data || {},
      docs: [
        {
          ...item,
          collectionName:
            item.collectionName || "boletins"
        }
      ],
      kind: "Geral"
    })
  );

  const directMap = new Map();

  (state.privateBulletins || []).forEach((item) => {
    const groupId = String(
      item?.data?.grupoPublicacaoId ||
      `single-${item.id}`
    );

    if (!directMap.has(groupId)) {
      directMap.set(groupId, []);
    }

    directMap.get(groupId).push({
      ...item,
      collectionName:
        item.collectionName ||
        "boletins-privados"
    });
  });

  const direct = [...directMap.entries()].map(
    ([groupId, docs]) => ({
      id: groupId,
      groupId,
      collectionName: "boletins-privados",
      data: docs[0]?.data || {},
      docs,
      kind: "Direcionado"
    })
  );

  return [...general, ...direct].sort(
    (a, b) =>
      bulletinDate(b).localeCompare(
        bulletinDate(a)
      )
  );
}

function recipientsForGroup(group) {
  const people = activePeople();
  const data = group?.data || {};

  if (
    group.collectionName ===
    "boletins-privados"
  ) {
    return group.docs
      .map((docItem) => {
        const directUid = String(
          docItem?.data?.destinatarioUid || ""
        );

        const name = String(
          docItem?.data?.["Para qual Colaborador?"] ||
          docItem?.data?.publicoPessoas?.[0] ||
          ""
        ).trim();

        return (
          people.find(
            (person) =>
              directUid &&
              person.uid === directUid
          ) ||
          people.find(
            (person) =>
              normalize(person.name) ===
              normalize(name)
          ) || {
            uid: directUid,
            name: name || "Colaborador",
            sector:
              docItem?.data?.setorDestinatario ||
              "Geral",
            email: ""
          }
        );
      })
      .filter(
        (person, index, array) =>
          array.findIndex(
            (candidate) =>
              (
                candidate.uid &&
                candidate.uid === person.uid
              ) ||
              normalize(candidate.name) ===
                normalize(person.name)
          ) === index
      );
  }

  if (data.publicoTipo === "todos") {
    return people;
  }

  if (data.publicoTipo === "pessoas") {
    const names = unique(
      data.publicoPessoas || []
    ).map(normalize);

    return people.filter((person) =>
      names.includes(normalize(person.name))
    );
  }

  const sectors = itemSectors(group);

  if (
    data.publicoTipo === "setores" ||
    sectors.length
  ) {
    const normalizedSectors =
      sectors.map(normalize);

    return people.filter((person) =>
      normalizedSectors.includes(
        normalize(person.sector)
      )
    );
  }

  return people;
}

function docForPerson(group, person) {
  if (
    group.collectionName !==
    "boletins-privados"
  ) {
    return group.docs[0];
  }

  return (
    group.docs.find(
      (item) =>
        person.uid &&
        String(
          item?.data?.destinatarioUid || ""
        ) === person.uid
    ) ||
    group.docs.find(
      (item) =>
        normalize(
          item?.data?.[
            "Para qual Colaborador?"
          ] || ""
        ) === normalize(person.name)
    ) ||
    group.docs[0]
  );
}

function readingRecordId(item, uid) {
  return `${
    item?.collectionName || "boletins"
  }__${item?.id || ""}__${uid || ""}`
    .replace(/\//g, "_");
}

function structuredReading(item, person) {
  const readings = phase().readings || [];
  const expectedId = readingRecordId(
    item,
    person.uid
  );

  return readings.find((entry) => {
    const data = entry?.data || {};

    if (entry.id === expectedId) {
      return true;
    }

    const sameBulletin =
      String(
        data.boletimId ||
        data.bulletinId ||
        ""
      ) === String(item?.id || "");

    const sameCollection =
      !data.colecao ||
      String(data.colecao) ===
        String(
          item?.collectionName ||
          "boletins"
        );

    const samePerson =
      (
        person.uid &&
        String(
          data.uid ||
          data.userUid ||
          data.colaboradorUid ||
          ""
        ) === person.uid
      ) ||
      normalize(
        data.nome ||
        data.colaboradorNome ||
        ""
      ) === normalize(person.name);

    return (
      sameBulletin &&
      sameCollection &&
      samePerson
    );
  }) || null;
}

function legacyReading(item, person) {
  const entries = Array.isArray(
    item?.data?.leituras
  )
    ? item.data.leituras
    : [];

  const entry = entries.find((value) => {
    const text = String(value || "");
    const name = text.split(" (")[0].trim();

    return (
      normalize(name) ===
      normalize(person.name)
    );
  });

  if (!entry) return null;

  const text = String(entry);
  const inside =
    text.match(/\((.+)\)$/)?.[1] || "";

  const datePart =
    inside.split(/\s*\|\s*Por:/i)[0];

  return {
    entry: text,
    date:
      parseDate(datePart) ||
      parseDate(text)
  };
}

function readingInfo(group, person) {
  const item = docForPerson(group, person);
  const structured =
    structuredReading(item, person);

  if (structured) {
    const data = structured.data || {};

    const date =
      parseDate(data.lidoEmIso) ||
      parseDate(data.lidoEm) ||
      parseDate(data.lidoEmLocal) ||
      parseDate(data.dataHora);

    return {
      read: true,
      date,
      source: "structured",
      withinDeadline:
        data.dentroDoPrazo !== false
    };
  }

  const legacy = legacyReading(item, person);

  if (legacy) {
    const deadline = endOfDay(
      bulletinDeadline(group)
    );

    return {
      read: true,
      date: legacy.date,
      source: "legacy",
      withinDeadline:
        !deadline ||
        !legacy.date ||
        legacy.date.getTime() <=
          deadline.getTime()
    };
  }

  return {
    read: false,
    date: null,
    source: "",
    withinDeadline: false
  };
}

function audienceLabel(group) {
  if (
    group.collectionName ===
    "boletins-privados"
  ) {
    const recipients =
      recipientsForGroup(group);

    return recipients.length === 1
      ? recipients[0].name
      : `${recipients.length} colaboradores direcionados`;
  }

  if (group.data?.publicoTipo === "todos") {
    return "Toda a clínica";
  }

  const sectors = itemSectors(group);

  return sectors.length
    ? sectors.join(", ")
    : "Toda a clínica";
}

function filterGroupsByPeriod(
  groups,
  start,
  end
) {
  return groups.filter((group) =>
    inRange(
      bulletinDate(group),
      start,
      end
    )
  );
}

function groupStats(group) {
  const recipients =
    recipientsForGroup(group);

  const rows = recipients.map((person) => ({
    person,
    reading:
      readingInfo(group, person)
  }));

  const read = rows.filter(
    (row) => row.reading.read
  ).length;

  const total = rows.length;

  return {
    rows,
    total,
    read,
    pending:
      Math.max(0, total - read),
    rate:
      total
        ? Math.round(
            (read / total) * 100
          )
        : 0
  };
}

function analyticsByPerson(groups) {
  const people = activePeople();

  return people.map((person) => {
    const items = [];

    groups.forEach((group) => {
      const assigned =
        recipientsForGroup(group)
          .some(
            (candidate) =>
              (
                person.uid &&
                candidate.uid === person.uid
              ) ||
              normalize(candidate.name) ===
                normalize(person.name)
          );

      if (!assigned) return;

      items.push({
        group,
        reading:
          readingInfo(group, person)
      });
    });

    const total = items.length;
    const read = items.filter(
      (item) => item.reading.read
    ).length;

    return {
      ...person,
      items,
      total,
      read,
      pending:
        Math.max(0, total - read),
      rate:
        total
          ? Math.round(
              (read / total) * 100
            )
          : 0
    };
  });
}

function dateRangeFromPreset(preset) {
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

function rangeLabel(start, end) {
  return `${formatDate(start)} a ${formatDate(end)}`;
}

function getPerformanceRange() {
  return {
    start:
      document.getElementById(
        "csv-report-start"
      )?.value ||
      monthStartInput(-5),
    end:
      document.getElementById(
        "csv-report-end"
      )?.value ||
      todayInput()
  };
}

function makeBuckets(start, end) {
  const from = startOfDay(start);
  const until = endOfDay(end);

  if (!from || !until) return [];

  const days = Math.max(
    1,
    Math.ceil(
      (
        until.getTime() -
        from.getTime()
      ) / 86400000
    )
  );

  const buckets = [];

  if (days <= 31) {
    const cursor = new Date(from);

    while (cursor <= until) {
      buckets.push({
        label:
          cursor.toLocaleDateString(
            "pt-BR",
            {
              day: "2-digit",
              month: "2-digit"
            }
          ),
        start:
          startOfDay(cursor),
        end:
          endOfDay(cursor),
        assigned: 0,
        read: 0
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return buckets;
  }

  if (days <= 120) {
    const cursor = new Date(from);

    while (cursor <= until) {
      const bucketStart =
        startOfDay(cursor);

      const bucketEnd =
        new Date(cursor);

      bucketEnd.setDate(
        bucketEnd.getDate() + 6
      );

      if (bucketEnd > until) {
        bucketEnd.setTime(
          until.getTime()
        );
      }

      buckets.push({
        label:
          `${bucketStart.toLocaleDateString(
            "pt-BR",
            {
              day: "2-digit",
              month: "2-digit"
            }
          )} - ${bucketEnd.toLocaleDateString(
            "pt-BR",
            {
              day: "2-digit",
              month: "2-digit"
            }
          )}`,
        start: bucketStart,
        end: endOfDay(bucketEnd),
        assigned: 0,
        read: 0
      });

      cursor.setDate(cursor.getDate() + 7);
    }

    return buckets;
  }

  let cursor = new Date(
    from.getFullYear(),
    from.getMonth(),
    1
  );

  while (cursor <= until) {
    const bucketStart =
      new Date(cursor);

    const bucketEnd =
      new Date(
        cursor.getFullYear(),
        cursor.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

    buckets.push({
      label:
        cursor.toLocaleDateString(
          "pt-BR",
          {
            month: "short",
            year: "2-digit"
          }
        ),
      start: bucketStart,
      end:
        bucketEnd > until
          ? until
          : bucketEnd,
      assigned: 0,
      read: 0
    });

    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      1
    );
  }

  return buckets;
}

function performanceFilters() {
  return {
    search:
      normalize(
        document.getElementById(
          "csv2-p-search"
        )?.value || ""
      ),
    sector:
      String(
        document.getElementById(
          "csv2-p-sector"
        )?.value || ""
      ),
    status:
      String(
        document.getElementById(
          "csv2-p-status"
        )?.value || "all"
      ),
    order:
      String(
        document.getElementById(
          "csv2-p-order"
        )?.value || "worst"
      ),
    person:
      String(
        document.getElementById(
          "csv2-p-person"
        )?.value || ""
      )
  };
}

function filteredPerformanceData() {
  const { start, end } =
    getPerformanceRange();

  const groups =
    filterGroupsByPeriod(
      groupedBulletins(),
      start,
      end
    );

  const filters =
    performanceFilters();

  let people =
    analyticsByPerson(groups);

  if (filters.person) {
    people = people.filter(
      (item) =>
        item.name === filters.person
    );
  }

  if (filters.sector) {
    people = people.filter(
      (item) =>
        item.sector === filters.sector
    );
  }

  if (filters.search) {
    people = people.filter((item) =>
      normalize(
        `${item.name} ${item.sector}`
      ).includes(filters.search)
    );
  }

  if (filters.status === "good") {
    people = people.filter(
      (item) => item.rate >= 90
    );
  }

  if (filters.status === "medium") {
    people = people.filter(
      (item) =>
        item.rate >= 70 &&
        item.rate < 90
    );
  }

  if (filters.status === "low") {
    people = people.filter(
      (item) => item.rate < 70
    );
  }

  if (filters.status === "pending") {
    people = people.filter(
      (item) => item.pending > 0
    );
  }

  if (filters.order === "best") {
    people.sort(
      (a, b) =>
        b.rate - a.rate ||
        a.name.localeCompare(
          b.name,
          "pt-BR"
        )
    );
  } else if (filters.order === "name") {
    people.sort((a, b) =>
      a.name.localeCompare(
        b.name,
        "pt-BR"
      )
    );
  } else {
    people.sort(
      (a, b) =>
        a.rate - b.rate ||
        b.pending - a.pending ||
        a.name.localeCompare(
          b.name,
          "pt-BR"
        )
    );
  }

  return {
    start,
    end,
    groups,
    people,
    filters
  };
}

function renderPerformanceChart(
  groups,
  people,
  start,
  end
) {
  const canvas =
    document.getElementById(
      "csv-period-performance-chart"
    );

  if (
    !canvas ||
    typeof window.Chart === "undefined"
  ) {
    return;
  }

  const buckets =
    makeBuckets(start, end);

  people.forEach((person) => {
    person.items.forEach((entry) => {
      const publication =
        parseDate(
          bulletinDate(entry.group)
        );

      const bucket = buckets.find(
        (candidate) =>
          publication &&
          publication >= candidate.start &&
          publication <= candidate.end
      );

      if (!bucket) return;

      bucket.assigned += 1;

      if (entry.reading.read) {
        bucket.read += 1;
      }
    });
  });

  performanceChart?.destroy?.();

  performanceChart = new window.Chart(
    canvas,
    {
      type: "bar",
      data: {
        labels:
          buckets.map(
            (bucket) => bucket.label
          ),
        datasets: [
          {
            label: "Atribuições",
            data:
              buckets.map(
                (bucket) =>
                  bucket.assigned
              ),
            backgroundColor:
              "rgba(115, 87, 189, .72)",
            borderRadius: 7
          },
          {
            label: "Leituras",
            data:
              buckets.map(
                (bucket) =>
                  bucket.read
              ),
            backgroundColor:
              "rgba(34, 166, 111, .82)",
            borderRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            position: "bottom"
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    }
  );
}

function renderFilteredPerformance() {
  const content =
    document.getElementById(
      "csv2-performance-content"
    );

  if (!content) return;

  const data =
    filteredPerformanceData();

  const assigned =
    data.people.reduce(
      (sum, person) =>
        sum + person.total,
      0
    );

  const read =
    data.people.reduce(
      (sum, person) =>
        sum + person.read,
      0
    );

  const pending =
    Math.max(0, assigned - read);

  const rate =
    assigned
      ? Math.round(
          (read / assigned) * 100
        )
      : 0;

  content.innerHTML = `
    <section class="csv2-performance-summary csv-period-summary">
      <article>
        <span>Informativos</span>
        <strong>${data.groups.length}</strong>
        <small>no período</small>
      </article>

      <article>
        <span>Pessoas exibidas</span>
        <strong>${data.people.length}</strong>
        <small>colaboradores</small>
      </article>

      <article>
        <span>Atribuições</span>
        <strong>${assigned}</strong>
        <small>leituras esperadas</small>
      </article>

      <article>
        <span>Leituras</span>
        <strong>${read}</strong>
        <small>concluídas</small>
      </article>

      <article class="${pending ? "attention" : ""}">
        <span>Pendências</span>
        <strong>${pending}</strong>
        <small>não concluídas</small>
      </article>

      <article>
        <span>Índice</span>
        <strong>${rate}%</strong>
        <small>conclusão</small>
      </article>
    </section>

    <div class="csv-period-caption">
      <i class="ri-calendar-check-line"></i>
      <span>
        Informativos publicados entre
        <strong>${esc(rangeLabel(data.start, data.end))}</strong>.
      </span>
    </div>

    <section class="csv2-performance-layout">
      <div class="csv2-performance-chart-card">
        <div class="csv2-list-heading">
          <div>
            <strong>
              ${data.filters.person
                ? `Evolução de ${esc(data.filters.person)}`
                : "Leituras no período"}
            </strong>
            <span>
              Atribuições e leituras concluídas.
            </span>
          </div>
        </div>

        <div class="csv2-chart-holder">
          <canvas id="csv-period-performance-chart"></canvas>
        </div>
      </div>

      <div class="csv2-performance-ranking">
        <div class="csv2-list-heading">
          <div>
            <strong>Resultado por colaborador</strong>
            <span>${esc(rangeLabel(data.start, data.end))}</span>
          </div>
        </div>

        <div class="csv2-ranking-list">
          ${data.people.length
            ? data.people.map((item) => {
                const level =
                  item.rate >= 90
                    ? "good"
                    : item.rate >= 70
                      ? "medium"
                      : "low";

                return `
                  <article>
                    <span class="csv2-team-avatar">
                      ${esc(item.name.charAt(0))}
                    </span>

                    <div>
                      <strong>${esc(item.name)}</strong>
                      <small>
                        ${esc(item.sector)}
                        • ${item.read}/${item.total} lidos
                        • ${item.pending} pendente(s)
                      </small>

                      <div class="csv2-progress">
                        <i style="width:${item.rate}%"></i>
                      </div>
                    </div>

                    <span class="csv2-score ${level}">
                      ${item.rate}%
                    </span>
                  </article>
                `;
              }).join("")
            : `
              <div class="csv2-empty">
                <i class="ri-filter-off-line"></i>
                <strong>Nenhum resultado neste período</strong>
                <span>Altere as datas ou os demais filtros.</span>
              </div>
            `}
        </div>
      </div>
    </section>

    <section class="csv-period-bulletins">
      <div class="csv2-list-heading">
        <div>
          <strong>Informativos do período</strong>
          <span>${data.groups.length} publicação(ões).</span>
        </div>
      </div>

      <div class="csv-period-bulletin-grid">
        ${data.groups.slice(0, 12).map(
          (group) => {
            const stats = groupStats(group);

            return `
              <article class="${stats.pending ? "pending" : "complete"}">
                <span>${esc(bulletinType(group))}</span>
                <h4>${esc(bulletinTitle(group))}</h4>
                <small>
                  ${esc(formatDate(bulletinDate(group)))}
                  • ${esc(audienceLabel(group))}
                </small>
                <div>
                  <b>${stats.read}/${stats.total}</b>
                  <strong>${stats.rate}%</strong>
                </div>
              </article>
            `;
          }
        ).join("")}
      </div>
    </section>
  `;

  renderPerformanceChart(
    data.groups,
    data.people,
    data.start,
    data.end
  );
}

function setRangeControls(
  preset,
  startInput,
  endInput
) {
  if (preset === "custom") return;

  const range =
    dateRangeFromPreset(preset);

  startInput.value = range.start;
  endInput.value = range.end;
}

function enhancePerformanceModal() {
  const modal =
    document.getElementById(
      "csv2-performance-modal"
    );

  const filters =
    modal?.querySelector(
      ".csv2-performance-filters"
    );

  if (
    !modal ||
    !filters ||
    filters.dataset.csvPeriodReady === "1"
  ) {
    return;
  }

  filters.dataset.csvPeriodReady = "1";

  const preset =
    document.createElement("select");

  preset.id = "csv-report-preset";
  preset.innerHTML = `
    <option value="current_month">Este mês</option>
    <option value="previous_month">Mês anterior</option>
    <option value="last_3_months">Últimos 3 meses</option>
    <option value="last_6_months" selected>Últimos 6 meses</option>
    <option value="year">Este ano</option>
    <option value="custom">Período personalizado</option>
  `;

  const start =
    document.createElement("input");

  start.id = "csv-report-start";
  start.type = "date";
  start.value = monthStartInput(-5);
  start.title = "Data inicial";

  const end =
    document.createElement("input");

  end.id = "csv-report-end";
  end.type = "date";
  end.value = todayInput();
  end.title = "Data final";

  const apply =
    document.createElement("button");

  apply.type = "button";
  apply.className =
    "csv-period-apply-button";
  apply.innerHTML = `
    <i class="ri-filter-3-line"></i>
    Aplicar período
  `;

  const report =
    document.createElement("button");

  report.type = "button";
  report.className =
    "csv-period-report-button";
  report.innerHTML = `
    <i class="ri-file-pdf-2-line"></i>
    Baixar relatório
  `;

  filters.append(
    preset,
    start,
    end,
    apply,
    report
  );

  const scheduleRender = () => {
    window.setTimeout(
      renderFilteredPerformance,
      40
    );
  };

  preset.addEventListener(
    "change",
    () => {
      setRangeControls(
        preset.value,
        start,
        end
      );
      scheduleRender();
    }
  );

  start.addEventListener(
    "change",
    () => {
      preset.value = "custom";
      scheduleRender();
    }
  );

  end.addEventListener(
    "change",
    () => {
      preset.value = "custom";
      scheduleRender();
    }
  );

  apply.addEventListener(
    "click",
    renderFilteredPerformance
  );

  report.addEventListener(
    "click",
    () => {
      const data =
        filteredPerformanceData();

      generatePdfReport({
        start: data.start,
        end: data.end,
        sector:
          data.filters.sector,
        person:
          data.filters.person
      });
    }
  );

  [
    "csv2-p-search",
    "csv2-p-sector",
    "csv2-p-status",
    "csv2-p-order",
    "csv2-p-person"
  ].forEach((id) => {
    const input =
      document.getElementById(id);

    input?.addEventListener(
      id === "csv2-p-search"
        ? "input"
        : "change",
      scheduleRender
    );
  });

  scheduleRender();
}

function ensureReportRoot() {
  let root =
    document.getElementById(
      "csv-report-modal-root"
    );

  if (!root) {
    root = document.createElement("div");
    root.id = "csv-report-modal-root";
    document.body.appendChild(root);
  }

  return root;
}

function closeReportModal() {
  const root = ensureReportRoot();
  root.innerHTML = "";
  document.body.classList.remove(
    "csv-report-modal-open"
  );
}

function reportModalMarkup() {
  const sectors = unique(
    activePeople().map(
      (person) => person.sector
    )
  ).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  return `
    <div class="csv-report-modal-backdrop">
      <div class="csv-report-modal-card">
        <header>
          <div>
            <span>
              <i class="ri-file-chart-line"></i>
              Relatório de informativos
            </span>
            <h2>Gerar relatório em PDF</h2>
            <p>
              Escolha um mês ou período. O relatório incluirá a data e a hora de cada leitura registrada.
            </p>
          </div>

          <button
            type="button"
            data-close-report-modal
          >
            <i class="ri-close-line"></i>
          </button>
        </header>

        <form id="csv-report-form">
          <div class="csv-report-form-grid">
            <label>
              <span>Período rápido</span>
              <select id="csv-report-modal-preset">
                <option value="current_month">Este mês</option>
                <option value="previous_month">Mês anterior</option>
                <option value="last_3_months">Últimos 3 meses</option>
                <option value="last_6_months">Últimos 6 meses</option>
                <option value="year">Este ano</option>
                <option value="custom">Personalizado</option>
              </select>
            </label>

            <label>
              <span>Data inicial</span>
              <input
                id="csv-report-modal-start"
                type="date"
                value="${monthStartInput(0)}"
                required
              >
            </label>

            <label>
              <span>Data final</span>
              <input
                id="csv-report-modal-end"
                type="date"
                value="${monthEndInput(0)}"
                required
              >
            </label>

            <label>
              <span>Setor</span>
              <select id="csv-report-modal-sector">
                <option value="">Empresa toda</option>
                ${sectors.map(
                  (sector) => `
                    <option value="${esc(sector)}">
                      ${esc(sector)}
                    </option>
                  `
                ).join("")}
              </select>
            </label>
          </div>

          <label class="csv-report-check">
            <input
              id="csv-report-modal-details"
              type="checkbox"
              checked
            >
            <span>
              <strong>Incluir detalhamento das leituras</strong>
              <small>
                Nome, setor, situação, data e hora em que cada colaborador leu.
              </small>
            </span>
          </label>

          <div
            id="csv-report-form-message"
            class="csv-report-form-message"
          ></div>

          <div class="csv-report-form-actions">
            <button
              type="button"
              class="secondary"
              data-close-report-modal
            >
              Cancelar
            </button>

            <button
              type="submit"
              class="primary"
            >
              <i class="ri-file-pdf-2-line"></i>
              Gerar e baixar PDF
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function openReportModal() {
  const root = ensureReportRoot();
  root.innerHTML = reportModalMarkup();
  document.body.classList.add(
    "csv-report-modal-open"
  );

  root
    .querySelectorAll(
      "[data-close-report-modal]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        closeReportModal
      );
    });

  const preset =
    root.querySelector(
      "#csv-report-modal-preset"
    );

  const start =
    root.querySelector(
      "#csv-report-modal-start"
    );

  const end =
    root.querySelector(
      "#csv-report-modal-end"
    );

  preset?.addEventListener(
    "change",
    () => {
      setRangeControls(
        preset.value,
        start,
        end
      );
    }
  );

  start?.addEventListener(
    "change",
    () => {
      preset.value = "custom";
    }
  );

  end?.addEventListener(
    "change",
    () => {
      preset.value = "custom";
    }
  );

  root
    .querySelector("#csv-report-form")
    ?.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const button =
          event.currentTarget.querySelector(
            'button[type="submit"]'
          );

        const message =
          root.querySelector(
            "#csv-report-form-message"
          );

        button.disabled = true;
        button.innerHTML = `
          <i class="ri-loader-4-line ri-spin"></i>
          Preparando relatório...
        `;

        try {
          await generatePdfReport({
            start: start.value,
            end: end.value,
            sector:
              root.querySelector(
                "#csv-report-modal-sector"
              )?.value || "",
            details:
              root.querySelector(
                "#csv-report-modal-details"
              )?.checked !== false
          });

          closeReportModal();
        } catch (error) {
          console.error(
            "Relatório PDF:",
            error
          );

          message.textContent =
            "Não foi possível gerar o relatório. Verifique a conexão e tente novamente.";

          message.className =
            "csv-report-form-message error";

          button.disabled = false;
          button.innerHTML = `
            <i class="ri-file-pdf-2-line"></i>
            Gerar e baixar PDF
          `;
        }
      }
    );
}

function ensureReportButton() {
  if (phase().profile?.admin !== true) {
    return;
  }

  const header =
    document.querySelector(
      "#csv2-bulletins-root > .csv2-page-header"
    );

  if (!header) return;

  let actions =
    header.querySelector(
      ".csv2-header-actions"
    );

  if (!actions) {
    actions =
      document.createElement("div");
    actions.className =
      "csv2-header-actions";
    header.appendChild(actions);
  }

  if (
    document.getElementById(
      "csv-monthly-report-button"
    )
  ) {
    return;
  }

  const button =
    document.createElement("button");

  button.type = "button";
  button.id =
    "csv-monthly-report-button";
  button.className =
    "csv2-button csv-monthly-report-button";
  button.innerHTML = `
    <i class="ri-file-pdf-2-line"></i>
    Relatório PDF
  `;

  button.addEventListener(
    "click",
    openReportModal
  );

  actions.insertBefore(
    button,
    actions.firstChild
  );
}

async function fetchEvaluations() {
  try {
    const snapshot = await getDocs(
      collection(
        db,
        "avaliacoes-boletins"
      )
    );

    return snapshot.docs.map(
      (item) => ({
        id: item.id,
        data: item.data() || {}
      })
    );
  } catch (error) {
    console.warn(
      "Avaliações no relatório:",
      error
    );
    return [];
  }
}

function evaluationMatches(
  evaluation,
  group
) {
  const data =
    evaluation?.data || {};

  return (
    String(
      data.bulletinGroupId ||
      data.bulletinId ||
      ""
    ) === String(group.groupId) ||
    group.docs.some(
      (item) =>
        String(data.bulletinId || "") ===
        String(item.id)
    )
  );
}

function sectorSummaries(people) {
  const map = new Map();

  people.forEach((person) => {
    const sector =
      person.sector || "Geral";

    if (!map.has(sector)) {
      map.set(sector, {
        sector,
        collaborators: 0,
        assigned: 0,
        read: 0,
        pending: 0
      });
    }

    const current = map.get(sector);
    current.collaborators += 1;
    current.assigned += person.total;
    current.read += person.read;
    current.pending += person.pending;
  });

  return [...map.values()]
    .map((item) => ({
      ...item,
      rate:
        item.assigned
          ? Math.round(
              (
                item.read /
                item.assigned
              ) * 100
            )
          : 0
    }))
    .sort((a, b) =>
      a.sector.localeCompare(
        b.sector,
        "pt-BR"
      )
    );
}

function ensurePdfLibraries() {
  if (
    !window.jspdf?.jsPDF ||
    !window.jspdf.jsPDF.API?.autoTable
  ) {
    throw new Error(
      "Bibliotecas de PDF ainda não carregaram."
    );
  }

  return window.jspdf.jsPDF;
}

function safeFileName(value) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function addPdfHeader(
  pdf,
  title,
  subtitle
) {
  pdf.setFillColor(139, 37, 44);
  pdf.rect(0, 0, 210, 31, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.text(
    "Clínica Médica São Vicente",
    14,
    13
  );

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    "Portal CSV - Relatório de Informativos",
    14,
    20
  );

  pdf.setTextColor(23, 32, 51);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(title, 14, 43);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(94, 108, 132);
  pdf.text(subtitle, 14, 50);
}

function addPdfSectionTitle(
  pdf,
  title,
  y
) {
  pdf.setTextColor(139, 37, 44);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(title, 14, y);

  pdf.setDrawColor(224, 229, 237);
  pdf.line(14, y + 3, 196, y + 3);
}

function addSummaryCards(
  pdf,
  values,
  y
) {
  const width = 28.5;
  const gap = 2;

  values.forEach((item, index) => {
    const x =
      14 + index * (width + gap);

    pdf.setFillColor(
      item.attention ? 255 : 247,
      item.attention ? 241 : 249,
      item.attention ? 243 : 252
    );

    pdf.roundedRect(
      x,
      y,
      width,
      21,
      2.5,
      2.5,
      "F"
    );

    pdf.setTextColor(96, 109, 130);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.text(item.label, x + 3, y + 6);

    pdf.setTextColor(
      item.attention ? 181 : 23,
      item.attention ? 48 : 32,
      item.attention ? 59 : 51
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text(
      String(item.value),
      x + 3,
      y + 15
    );
  });
}

async function generatePdfReport({
  start,
  end,
  sector = "",
  person = "",
  details = true
}) {
  const jsPDF = ensurePdfLibraries();

  const allGroups =
    filterGroupsByPeriod(
      groupedBulletins(),
      start,
      end
    );

  const groups = allGroups.filter(
    (group) => {
      if (person) {
        return recipientsForGroup(group)
          .some(
            (candidate) =>
              candidate.name === person
          );
      }

      if (sector) {
        return recipientsForGroup(group)
          .some(
            (candidate) =>
              candidate.sector === sector
          );
      }

      return true;
    }
  );

  let people =
    analyticsByPerson(groups);

  if (sector) {
    people = people.filter(
      (item) =>
        item.sector === sector
    );
  }

  if (person) {
    people = people.filter(
      (item) =>
        item.name === person
    );
  }

  const assigned =
    people.reduce(
      (sum, item) =>
        sum + item.total,
      0
    );

  const read =
    people.reduce(
      (sum, item) =>
        sum + item.read,
      0
    );

  const pending =
    Math.max(0, assigned - read);

  const rate =
    assigned
      ? Math.round(
          (read / assigned) * 100
        )
      : 0;

  const evaluations =
    await fetchEvaluations();

  const selectedEvaluations =
    evaluations.filter(
      (entry) =>
        groups.some(
          (group) =>
            evaluationMatches(
              entry,
              group
            )
        )
    );

  const averageRating =
    selectedEvaluations.length
      ? (
          selectedEvaluations.reduce(
            (sum, item) =>
              sum +
              Number(
                item.data?.rating || 0
              ),
            0
          ) /
          selectedEvaluations.length
        ).toFixed(1)
      : "-";

  const explanationRequests =
    selectedEvaluations.filter(
      (item) =>
        item.data?.needsExplanation ===
          true &&
        String(
          item.data?.explanationStatus ||
          "pending"
        ) !== "resolved"
    ).length;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true
  });

  addPdfHeader(
    pdf,
    "Relatório de Informativos",
    `Período: ${rangeLabel(start, end)}${
      sector ? ` | Setor: ${sector}` : ""
    }${
      person ? ` | Colaborador: ${person}` : ""
    }`
  );

  addSummaryCards(
    pdf,
    [
      {
        label: "Informativos",
        value: groups.length
      },
      {
        label: "Colaboradores",
        value: people.length
      },
      {
        label: "Atribuições",
        value: assigned
      },
      {
        label: "Leituras",
        value: read
      },
      {
        label: "Pendências",
        value: pending,
        attention: pending > 0
      },
      {
        label: "Índice",
        value: `${rate}%`
      }
    ],
    58
  );

  pdf.setTextColor(96, 109, 130);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(
    `Avaliações: ${selectedEvaluations.length} | Nota média: ${averageRating} | Pedidos de explicação em aberto: ${explanationRequests}`,
    14,
    85
  );

  addPdfSectionTitle(
    pdf,
    "Resultado por setor",
    96
  );

  const sectors =
    sectorSummaries(people);

  pdf.autoTable({
    startY: 101,
    margin: {
      left: 14,
      right: 14
    },
    head: [[
      "Setor",
      "Colaboradores",
      "Atribuições",
      "Leituras",
      "Pendências",
      "Índice"
    ]],
    body:
      sectors.length
        ? sectors.map((item) => [
            item.sector,
            item.collaborators,
            item.assigned,
            item.read,
            item.pending,
            `${item.rate}%`
          ])
        : [[
            "Sem dados",
            "-",
            "-",
            "-",
            "-",
            "-"
          ]],
    theme: "grid",
    headStyles: {
      fillColor: [139, 37, 44],
      textColor: [255, 255, 255],
      fontSize: 7
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [38, 49, 68]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 253]
    }
  });

  let y =
    pdf.lastAutoTable.finalY + 11;

  if (y > 250) {
    pdf.addPage();
    y = 18;
  }

  addPdfSectionTitle(
    pdf,
    "Resultado por informativo",
    y
  );

  pdf.autoTable({
    startY: y + 5,
    margin: {
      left: 14,
      right: 14
    },
    head: [[
      "Data",
      "Informativo",
      "Público",
      "Leituras",
      "Pendências",
      "Índice"
    ]],
    body:
      groups.length
        ? groups.map((group) => {
            const stats =
              groupStats(group);

            return [
              formatDate(
                bulletinDate(group)
              ),
              bulletinTitle(group),
              audienceLabel(group),
              `${stats.read}/${stats.total}`,
              stats.pending,
              `${stats.rate}%`
            ];
          })
        : [[
            "-",
            "Nenhum informativo no período",
            "-",
            "-",
            "-",
            "-"
          ]],
    theme: "grid",
    headStyles: {
      fillColor: [115, 87, 189],
      textColor: [255, 255, 255],
      fontSize: 7
    },
    bodyStyles: {
      fontSize: 6.7,
      textColor: [38, 49, 68]
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 54 },
      2: { cellWidth: 43 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 17 }
    },
    alternateRowStyles: {
      fillColor: [249, 250, 253]
    }
  });

  y =
    pdf.lastAutoTable.finalY + 11;

  if (y > 245) {
    pdf.addPage();
    y = 18;
  }

  addPdfSectionTitle(
    pdf,
    "Resultado por colaborador",
    y
  );

  pdf.autoTable({
    startY: y + 5,
    margin: {
      left: 14,
      right: 14
    },
    head: [[
      "Colaborador",
      "Setor",
      "Recebidos",
      "Lidos",
      "Pendentes",
      "Índice"
    ]],
    body:
      people.length
        ? people.map((item) => [
            item.name,
            item.sector,
            item.total,
            item.read,
            item.pending,
            `${item.rate}%`
          ])
        : [[
            "Sem dados",
            "-",
            "-",
            "-",
            "-",
            "-"
          ]],
    theme: "grid",
    headStyles: {
      fillColor: [38, 126, 88],
      textColor: [255, 255, 255],
      fontSize: 7
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [38, 49, 68]
    },
    alternateRowStyles: {
      fillColor: [248, 252, 250]
    }
  });

  if (details) {
    const readingRows = [];

    groups.forEach((group) => {
      const stats = groupStats(group);

      stats.rows.forEach((row) => {
        readingRows.push([
          formatDate(
            bulletinDate(group)
          ),
          bulletinTitle(group),
          row.person.name,
          row.person.sector,
          row.reading.read
            ? "Lido"
            : "Pendente",
          row.reading.read
            ? formatDateTime(
                row.reading.date
              )
            : "-",
          row.reading.read
            ? (
                row.reading.withinDeadline
                  ? "No prazo"
                  : "Após o prazo"
              )
            : "-"
        ]);
      });
    });

    pdf.addPage();

    addPdfHeader(
      pdf,
      "Detalhamento das Leituras",
      `Data e hora registradas - ${rangeLabel(start, end)}`
    );

    pdf.autoTable({
      startY: 58,
      margin: {
        left: 8,
        right: 8
      },
      head: [[
        "Publicação",
        "Informativo",
        "Colaborador",
        "Setor",
        "Situação",
        "Data e hora da leitura",
        "Prazo"
      ]],
      body:
        readingRows.length
          ? readingRows
          : [[
              "-",
              "Nenhum registro no período",
              "-",
              "-",
              "-",
              "-",
              "-"
            ]],
      theme: "grid",
      headStyles: {
        fillColor: [139, 37, 44],
        textColor: [255, 255, 255],
        fontSize: 6.3
      },
      bodyStyles: {
        fontSize: 5.8,
        textColor: [38, 49, 68],
        cellPadding: 1.7
      },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 43 },
        2: { cellWidth: 37 },
        3: { cellWidth: 25 },
        4: { cellWidth: 18 },
        5: { cellWidth: 30 },
        6: { cellWidth: 19 }
      },
      alternateRowStyles: {
        fillColor: [249, 250, 253]
      }
    });
  }

  if (selectedEvaluations.length) {
    pdf.addPage();

    addPdfHeader(
      pdf,
      "Avaliações dos Informativos",
      `Notas, comentários e pedidos de explicação - ${rangeLabel(start, end)}`
    );

    pdf.autoTable({
      startY: 58,
      margin: {
        left: 10,
        right: 10
      },
      head: [[
        "Informativo",
        "Colaborador",
        "Setor",
        "Nota",
        "Compreensão",
        "Comentário",
        "Explicação"
      ]],
      body:
        selectedEvaluations.map(
          (entry) => {
            const data =
              entry.data || {};

            return [
              data.bulletinTitle ||
                "Informativo",
              data.nome ||
                "Colaborador",
              data.setor ||
                "Geral",
              `${Number(
                data.rating || 0
              )}/5`,
              data.understanding || "-",
              data.observation ||
                "Sem comentário",
              data.needsExplanation
                ? (
                    String(
                      data.explanationStatus ||
                      "pending"
                    ) === "resolved"
                      ? "Realizada"
                      : "Solicitada"
                  )
                : "Não"
            ];
          }
        ),
      theme: "grid",
      headStyles: {
        fillColor: [217, 154, 37],
        textColor: [255, 255, 255],
        fontSize: 6.2
      },
      bodyStyles: {
        fontSize: 5.8,
        textColor: [38, 49, 68]
      },
      alternateRowStyles: {
        fillColor: [253, 250, 243]
      }
    });
  }

  const pages =
    pdf.getNumberOfPages();

  for (
    let page = 1;
    page <= pages;
    page += 1
  ) {
    pdf.setPage(page);

    pdf.setDrawColor(230, 234, 240);
    pdf.line(14, 286, 196, 286);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(120, 130, 147);

    pdf.text(
      `Relatório gerado pelo Portal CSV em ${new Date().toLocaleString("pt-BR")}`,
      14,
      291
    );

    pdf.text(
      `Página ${page} de ${pages}`,
      196,
      291,
      { align: "right" }
    );
  }

  const fileName = [
    "relatorio-informativos",
    dateKey(start),
    dateKey(end),
    sector
      ? safeFileName(sector)
      : "empresa"
  ].join("-");

  pdf.save(`${fileName}.pdf`);
}

function driveFileId(url = "") {
  const raw = String(url || "");

  return (
    raw.match(
      /\/d\/([a-zA-Z0-9_-]+)/
    )?.[1] ||
    raw.match(
      /[?&]id=([a-zA-Z0-9_-]+)/
    )?.[1] ||
    ""
  );
}

function playableAudioUrl(url = "") {
  const raw = String(url || "").trim();
  if (!raw) return "";

  const driveId = driveFileId(raw);

  return driveId
    ? `https://drive.google.com/uc?export=download&id=${driveId}`
    : raw;
}

function stopSpeech() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  speechUtterance = null;

  document
    .querySelectorAll(
      ".csv-speech-button"
    )
    .forEach((button) => {
      button.classList.remove("active");
    });
}

function choosePortugueseVoice() {
  const voices =
    window.speechSynthesis
      ?.getVoices?.() || [];

  return (
    voices.find(
      (voice) =>
        /^pt-BR$/i.test(voice.lang)
    ) ||
    voices.find(
      (voice) =>
        /^pt/i.test(voice.lang)
    ) ||
    voices[0] ||
    null
  );
}

function speakItem(item, rate = 1) {
  if (
    !(
      "speechSynthesis" in window &&
      "SpeechSynthesisUtterance" in window
    )
  ) {
    alert(
      "Este navegador não possui leitura em voz alta disponível."
    );
    return;
  }

  stopSpeech();

  const text = [
    bulletinTitle(item),
    accessibleText(item)
  ]
    .filter(Boolean)
    .join(". ");

  if (!text) {
    alert(
      "Este informativo não possui texto disponível para leitura."
    );
    return;
  }

  const utterance =
    new SpeechSynthesisUtterance(text);

  utterance.lang = "pt-BR";
  utterance.rate = Number(rate || 1);
  utterance.pitch = 1;
  utterance.volume = 1;

  const voice =
    choosePortugueseVoice();

  if (voice) {
    utterance.voice = voice;
  }

  utterance.onend = stopSpeech;
  utterance.onerror = stopSpeech;

  speechUtterance = utterance;

  window.speechSynthesis.speak(
    utterance
  );

  document
    .getElementById(
      "csv-speech-play"
    )
    ?.classList.add("active");
}

function enhanceBulletinModal(item) {
  const modal =
    document.getElementById(
      "csv2-media-modal"
    );

  const card =
    modal?.querySelector(
      ".csv2-modal-card.media"
    );

  if (!card || !item) return;

  card
    .querySelector(
      ".csv-accessibility-panel"
    )
    ?.remove();

  const audioUrl =
    supplementalAudio(item);

  const text =
    accessibleText(item);

  const panel =
    document.createElement("section");

  panel.className =
    "csv-accessibility-panel";

  panel.innerHTML = `
    <div class="csv-accessibility-heading">
      <div>
        <span>
          <i class="ri-accessibility-line"></i>
          Acessibilidade
        </span>

        <strong>Ouvir este informativo</strong>

        <small>
          O leitor utiliza o texto preparado pela gestão ou a descrição do comunicado.
        </small>
      </div>

      <select
        id="csv-speech-rate"
        title="Velocidade da leitura"
      >
        <option value="0.75">0,75x</option>
        <option value="1" selected>1x</option>
        <option value="1.25">1,25x</option>
        <option value="1.5">1,5x</option>
      </select>
    </div>

    <div class="csv-speech-controls">
      <button
        type="button"
        id="csv-speech-play"
        class="csv-speech-button primary"
      >
        <i class="ri-volume-up-line"></i>
        Ouvir
      </button>

      <button
        type="button"
        id="csv-speech-pause"
        class="csv-speech-button"
      >
        <i class="ri-pause-line"></i>
        Pausar
      </button>

      <button
        type="button"
        id="csv-speech-resume"
        class="csv-speech-button"
      >
        <i class="ri-play-line"></i>
        Continuar
      </button>

      <button
        type="button"
        id="csv-speech-stop"
        class="csv-speech-button"
      >
        <i class="ri-stop-line"></i>
        Parar
      </button>
    </div>

    ${audioUrl ? `
      <div class="csv-supplemental-audio">
        <div>
          <i class="ri-mic-line"></i>
          <span>
            <strong>Áudio complementar da gestão</strong>
            <small>Gravação adicionada a este informativo.</small>
          </span>
        </div>

        <audio
          controls
          preload="metadata"
          src="${esc(playableAudioUrl(audioUrl))}"
        ></audio>

        <a
          href="${esc(audioUrl)}"
          target="_blank"
          rel="noopener"
        >
          Abrir áudio em nova guia
        </a>
      </div>
    ` : ""}

    ${!text ? `
      <div class="csv-accessibility-warning">
        Este informativo ainda não possui texto acessível para leitura automática.
      </div>
    ` : ""}
  `;

  const mediaStage =
    card.querySelector(
      ".csv2-media-stage"
    );

  if (mediaStage) {
    card.insertBefore(panel, mediaStage);
  } else {
    card.appendChild(panel);
  }

  const rate =
    panel.querySelector(
      "#csv-speech-rate"
    );

  panel
    .querySelector(
      "#csv-speech-play"
    )
    ?.addEventListener(
      "click",
      () =>
        speakItem(
          item,
          rate?.value || 1
        )
    );

  panel
    .querySelector(
      "#csv-speech-pause"
    )
    ?.addEventListener(
      "click",
      () =>
        window.speechSynthesis?.pause?.()
    );

  panel
    .querySelector(
      "#csv-speech-resume"
    )
    ?.addEventListener(
      "click",
      () =>
        window.speechSynthesis?.resume?.()
    );

  panel
    .querySelector(
      "#csv-speech-stop"
    )
    ?.addEventListener(
      "click",
      stopSpeech
    );
}

function wrapOpenBulletin() {
  const current =
    window.csv2OpenBulletin;

  if (
    typeof current !== "function" ||
    current.__csvAccessibilityWrapped
  ) {
    return;
  }

  originalOpenBulletin = current;

  const wrapped = function(key) {
    stopSpeech();

    const item =
      window.csv2GetDisplayItem?.(key) ||
      phase().displayItems?.get?.(key);

    const result =
      originalOpenBulletin.call(
        this,
        key
      );

    window.setTimeout(
      () =>
        enhanceBulletinModal(item),
      35
    );

    return result;
  };

  wrapped.__csvAccessibilityWrapped =
    true;

  window.csv2OpenBulletin = wrapped;
}

function enhanceUi() {
  ensureReportButton();
  enhancePerformanceModal();
  wrapOpenBulletin();
}

function observeUi() {
  const root =
    document.getElementById(
      "tab-boletins"
    ) ||
    document.documentElement;

  if (
    root.dataset
      ?.csvReportsAccessibilityObserved ===
    "1"
  ) {
    return;
  }

  if (root.dataset) {
    root.dataset
      .csvReportsAccessibilityObserved =
      "1";
  }

  new MutationObserver(() => {
    clearTimeout(observerTimer);
    observerTimer =
      window.setTimeout(
        enhanceUi,
        80
      );
  }).observe(root, {
    childList: true,
    subtree: true
  });
}

function init() {
  observeUi();

  onAuthStateChanged(
    auth,
    (user) => {
      if (!user) {
        stopSpeech();
        closeReportModal();
        return;
      }

      [120, 400, 900, 1800, 3200]
        .forEach((delay) => {
          window.setTimeout(
            enhanceUi,
            delay
          );
        });
    }
  );

  window.addEventListener(
    "beforeunload",
    stopSpeech
  );

  window.csvReportsAccessibility = {
    version:
      CSV_REPORTS_ACCESSIBILITY_VERSION,
    openReport: openReportModal,
    generateReport:
      generatePdfReport,
    speak: speakItem,
    stopSpeech,
    refresh: enhanceUi
  };

  console.log(
    `CSV Reports Accessibility ${CSV_REPORTS_ACCESSIBILITY_VERSION} carregado.`
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
