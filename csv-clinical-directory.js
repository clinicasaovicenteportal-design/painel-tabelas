import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  setDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const CSV_CLINICAL_VERSION = "7.0.0";
const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const WEEK_DAYS = [
  ["segunda", "Segunda"],
  ["terca", "Terça"],
  ["quarta", "Quarta"],
  ["quinta", "Quinta"],
  ["sexta", "Sexta"],
  ["sabado", "Sábado"],
  ["domingo", "Domingo"]
];

const state = {
  user: null,
  professionals: [],
  healthPlanDocs: [],
  scheduleEvents: [],
  unsubscribers: [],
  doctorFilters: {
    search: "",
    specialty: "",
    healthPlan: "",
    day: ""
  },
  selectedDoctorId: "",
  selectedHealthPlanKey: "",
  healthPlanSearch: "",
  calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
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

function normalizeKey(value = "") {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function asArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function asLines(value) {
  if (Array.isArray(value)) return value.join("\n");
  return String(value || "");
}

function extractDriveFileId(raw = "") {
  const value = String(raw || "").trim();
  if (!value) return "";

  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{10,})/,
    /[?&]id=([a-zA-Z0-9_-]{10,})/,
    /googleusercontent\.com\/d\/([a-zA-Z0-9_-]{10,})/,
    /\/d\/([a-zA-Z0-9_-]{10,})/
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

function imageCandidates(raw = "") {
  const value = String(raw || "").trim();
  if (!value) return [];

  if (/drive\.google\.com\/drive\/folders\//i.test(value)) {
    return [];
  }

  const id = extractDriveFileId(value);

  if (id) {
    const safeId = encodeURIComponent(id);

    return [
      `https://drive.google.com/thumbnail?id=${safeId}&sz=w1600`,
      `https://lh3.googleusercontent.com/d/${safeId}=w1600`,
      `https://drive.usercontent.google.com/download?id=${safeId}&export=view&authuser=0`
    ];
  }

  return [value];
}

function imageUrl(raw = "") {
  return imageCandidates(raw)[0] || "";
}

window.csvClinicalNextImage = function(image) {
  try {
    const candidates = JSON.parse(
      decodeURIComponent(image.dataset.candidates || "%5B%5D")
    );

    const nextIndex = Number(image.dataset.candidateIndex || 0) + 1;

    if (nextIndex < candidates.length) {
      image.dataset.candidateIndex = String(nextIndex);
      image.src = candidates[nextIndex];
      return;
    }
  } catch (error) {
    console.warn("Falha ao testar alternativas da imagem:", error);
  }

  const wrapper = image.closest(".csv-clinical-avatar");
  wrapper?.classList.add("is-fallback");
  image.remove();
};

function photoPreviewMarkup(raw = "", name = "Profissional") {
  const candidates = imageCandidates(raw);
  const isFolder = /drive\.google\.com\/drive\/folders\//i.test(String(raw || ""));

  if (!candidates.length) {
    return `
      <div class="csv-photo-preview is-empty">
        <div class="csv-clinical-avatar is-fallback preview">
          <span>${esc(initials(name))}</span>
        </div>
        <div>
          <strong>Imagem ainda não disponível</strong>
          <small>${isFolder
            ? "Este é um link de pasta. Abra a foto individual e copie o link dela."
            : "Cole o link compartilhado de uma imagem."}</small>
        </div>
      </div>
    `;
  }

  const encodedCandidates = encodeURIComponent(JSON.stringify(candidates));

  return `
    <div class="csv-photo-preview">
      <div class="csv-clinical-avatar preview">
        <img
          src="${esc(candidates[0])}"
          alt="Prévia de ${esc(name)}"
          data-candidates="${esc(encodedCandidates)}"
          data-candidate-index="0"
          referrerpolicy="no-referrer"
          onerror="window.csvClinicalNextImage(this)"
        >
        <span>${esc(initials(name))}</span>
      </div>
      <div>
        <strong>Prévia da foto</strong>
        <small>No Drive, a foto precisa estar liberada para qualquer pessoa com o link.</small>
      </div>
    </div>
  `;
}

function updateDoctorPhotoPreview() {
  const input = document.getElementById("csv-doctor-photo-input");
  const nameInput = document.querySelector('#csv-doctor-form input[name="name"]');
  const preview = document.getElementById("csv-doctor-photo-preview");

  if (!input || !preview) return;

  preview.innerHTML = photoPreviewMarkup(
    input.value,
    nameInput?.value || "Profissional"
  );
}

function canEditSchedule() {
  if (isAdmin()) return true;

  const permissions =
    window.csvPhase2State?.profile?.permissions ||
    window.csvPhase2State?.profile?.permissoes ||
    [];

  return Array.isArray(permissions) &&
    permissions.includes("agenda-corpo-clinico");
}

function scheduleForDoctor(doctorId) {
  return state.scheduleEvents
    .filter((item) => item.data?.profissionalId === doctorId)
    .sort((a, b) => {
      const left = `${a.data?.data || ""} ${a.data?.inicio || ""}`;
      const right = `${b.data?.data || ""} ${b.data?.inicio || ""}`;
      return left.localeCompare(right);
    });
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isAdmin() {
  if (window.csvPhase2State?.isAdmin === true) return true;
  const email = String(state.user?.email || "").toLowerCase();
  return email.endsWith("@clinica.com");
}

function professionalData(item) {
  const data = item.data || {};
  return {
    id: item.id,
    raw: data,
    name: data["Nome do Médico"] || data.nome || data.nomeProfissional || "Profissional",
    photo: data["Link da Foto do Profissional"] || data.fotoUrl || "",
    specialty: data["Especialidade"] || data.especialidade || "Clínica geral",
    secondarySpecialties: asArray(data["Especialidades Secundárias"] || data.especialidadesSecundarias),
    segment: data["Segmento"] || data.segmento || "",
    crm: data["CRM"] || data.crm || "",
    cbo: data["CBO"] || data.cbo || "",
    ura: data["URA"] || data.ura || "",
    healthPlans: asArray(
      data["Convênios Aceitos"] ||
      data.conveniosAceitos ||
      (String(data["Unimed"] || "").toLowerCase().includes("sim") ? ["Unimed"] : [])
    ),
    days: asArray(data["Dias de Atendimento"] || data.diasAtendimento),
    schedule: data["Horários de Atendimento"] || data.horariosAtendimento || "",
    offices: asArray(data["Consultórios"] || data.consultorios),
    services: asArray(data["Procedimentos e Atendimentos"] || data.procedimentos),
    bio: data["Sobre o Profissional"] || data.sobre || data.biografia || "",
    phone: data["Telefone"] || data.telefone || "",
    email: data["E-mail"] || data.email || "",
    notes: data["Observações"] || data.observacoes || "",
    active: data["Ativo"] !== false && data.ativo !== false
  };
}

function allProfessionals() {
  return state.professionals
    .map(professionalData)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function unique(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function initials(name = "") {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "DR";
}

function photoMarkup(person, className = "") {
  const candidates = imageCandidates(person.photo);

  if (candidates.length) {
    const encodedCandidates = encodeURIComponent(JSON.stringify(candidates));

    return `
      <div class="csv-clinical-avatar ${className}">
        <img
          src="${esc(candidates[0])}"
          alt="${esc(person.name)}"
          data-candidates="${esc(encodedCandidates)}"
          data-candidate-index="0"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="window.csvClinicalNextImage(this)"
        >
        <span>${esc(initials(person.name))}</span>
      </div>
    `;
  }

  return `<div class="csv-clinical-avatar is-fallback ${className}"><span>${esc(initials(person.name))}</span></div>`;
}

function planNameFromDoc(item) {
  const data = item.data || {};
  return String(
    data.nome ||
    data["Convênio"] ||
    data["Nome do Convênio"] ||
    data.convenio ||
    ""
  ).trim();
}

function parseProcedureLine(line) {
  const parts = String(line || "").split("|").map((part) => part.trim());
  return {
    code: parts[0] || "",
    name: parts[1] || parts[0] || "",
    note: parts.slice(2).join(" | ")
  };
}

function aggregateHealthPlans() {
  const map = new Map();

  state.healthPlanDocs.forEach((item) => {
    const data = item.data || {};
    const name = planNameFromDoc(item);
    if (!name) return;

    const key = normalizeKey(name);
    const current = map.get(key) || {
      key,
      name,
      docs: [],
      masterId: "",
      logo: "",
      description: "",
      contacts: "",
      portalUrl: "",
      authorization: "",
      rules: "",
      documents: "",
      particularities: "",
      manualProfessionals: [],
      procedures: []
    };

    current.docs.push(item);

    const isMaster =
      data.tipoRegistro === "perfil-convenio" ||
      data.nome ||
      data.descricao ||
      Array.isArray(data.procedimentos);

    if (isMaster) {
      current.masterId = item.id;
      current.name = data.nome || name;
      current.logo = data.logoUrl || data.logo || current.logo;
      current.description = data.descricao || data["Descrição"] || current.description;
      current.contacts = data.contatos || data["Contatos"] || current.contacts;
      current.portalUrl = data.portalUrl || data["Portal / Link"] || current.portalUrl;
      current.authorization = data.autorizacao || data["Autorização"] || current.authorization;
      current.rules = data.regras || data["Regras"] || current.rules;
      current.documents = data.documentos || data["Documentos Necessários"] || current.documents;
      current.particularities = data.particularidades || data["Particularidades"] || current.particularities;
      current.manualProfessionals = unique([
        ...current.manualProfessionals,
        ...asArray(data.profissionais || data["Profissionais"])
      ]);

      (Array.isArray(data.procedimentos) ? data.procedimentos : []).forEach((procedure) => {
        current.procedures.push({
          code: procedure.codigo || procedure.code || "",
          name: procedure.nome || procedure.procedimento || procedure.name || "",
          note: procedure.observacao || procedure.note || ""
        });
      });
    } else {
      const service = data["Serviço"] || data.servico || data["Procedimento"] || "";
      if (service) {
        current.procedures.push({
          code: data["Código"] || data.codigo || "",
          name: service,
          note: [
            data["Aceita o Servico?"] || data.aceita || "",
            data["Observações"] || data.observacoes || ""
          ].filter(Boolean).join(" • ")
        });
      }
    }

    map.set(key, current);
  });

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function doctorsForHealthPlan(planName) {
  const planKey = normalizeText(planName);
  return allProfessionals().filter((person) =>
    person.healthPlans.some((plan) => normalizeText(plan) === planKey)
  );
}

function ensureModal() {
  let modal = document.getElementById("csv-clinical-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "csv-clinical-modal";
    modal.className = "csv-clinical-modal";
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
    document.body.appendChild(modal);
  }
  return modal;
}

function closeModal() {
  const modal = document.getElementById("csv-clinical-modal");
  if (modal) {
    modal.classList.remove("is-open");
    modal.innerHTML = "";
  }
}

window.csvClinicalCloseModal = closeModal;

function ensureClinicalTab() {
  const tab = document.getElementById("tab-corpo-clinico");
  if (!tab || tab.dataset.csvClinicalReady === "1") return;

  tab.dataset.csvClinicalReady = "1";
  tab.innerHTML = `
    <div class="csv-directory-page">
      <header class="csv-directory-header">
        <div>
          <span class="csv-directory-eyebrow"><i class="ri-stethoscope-line"></i> Diretório médico</span>
          <h2>Corpo clínico e agenda dos profissionais</h2>
          <p>Consulte especialidades, convênios, dias de atendimento, horários, consultórios e procedimentos realizados.</p>
        </div>
        <button type="button" class="csv-directory-action admin-only" id="csv-new-doctor-button">
          <i class="ri-user-add-line"></i> Cadastrar profissional
        </button>
      </header>

      <section class="csv-directory-stats" id="csv-doctor-stats"></section>

      <section class="csv-directory-layout">
        <aside class="csv-directory-filters">
          <div class="csv-directory-filter-title">
            <i class="ri-equalizer-2-line"></i>
            <div><strong>Filtros rápidos</strong><small>Refine a visualização da equipe.</small></div>
          </div>

          <label class="csv-directory-search">
            <i class="ri-search-line"></i>
            <input id="csv-doctor-search" placeholder="Pesquisar nome, CRM ou serviço...">
          </label>

          <label class="csv-directory-field">
            <span>Especialidade</span>
            <select id="csv-doctor-specialty"><option value="">Todas</option></select>
          </label>

          <label class="csv-directory-field">
            <span>Convênio</span>
            <select id="csv-doctor-plan"><option value="">Todos</option></select>
          </label>

          <label class="csv-directory-field">
            <span>Dia de atendimento</span>
            <select id="csv-doctor-day">
              <option value="">Todos os dias</option>
              ${WEEK_DAYS.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
            </select>
          </label>

          <div class="csv-week-legend" id="csv-week-legend"></div>
        </aside>

        <main class="csv-directory-main">
          <div class="csv-directory-main-head">
            <div>
              <span id="csv-doctor-result-label">Profissionais disponíveis</span>
              <h3 id="csv-doctor-result-count">0 profissionais</h3>
            </div>
            <button type="button" class="csv-clear-filter" id="csv-clear-doctor-filters">
              <i class="ri-filter-off-line"></i> Limpar filtros
            </button>
          </div>

          <div class="csv-doctor-grid" id="csv-doctor-grid"></div>
        </main>

        <aside class="csv-doctor-preview" id="csv-doctor-preview"></aside>
      </section>
    </div>
  `;

  document.getElementById("csv-new-doctor-button")?.addEventListener("click", () => openDoctorForm());
  document.getElementById("csv-doctor-search")?.addEventListener("input", (event) => {
    state.doctorFilters.search = event.target.value;
    renderClinicalTab();
  });
  document.getElementById("csv-doctor-specialty")?.addEventListener("change", (event) => {
    state.doctorFilters.specialty = event.target.value;
    renderClinicalTab();
  });
  document.getElementById("csv-doctor-plan")?.addEventListener("change", (event) => {
    state.doctorFilters.healthPlan = event.target.value;
    renderClinicalTab();
  });
  document.getElementById("csv-doctor-day")?.addEventListener("change", (event) => {
    state.doctorFilters.day = event.target.value;
    renderClinicalTab();
  });
  document.getElementById("csv-clear-doctor-filters")?.addEventListener("click", () => {
    state.doctorFilters = { search: "", specialty: "", healthPlan: "", day: "" };
    renderClinicalTab();
  });

  renderClinicalTab();
}

function doctorMatches(person) {
  const { search, specialty, healthPlan, day } = state.doctorFilters;
  const haystack = normalizeText([
    person.name,
    person.crm,
    person.specialty,
    person.secondarySpecialties.join(" "),
    person.services.join(" "),
    person.offices.join(" "),
    person.bio
  ].join(" "));

  const searchOk = !search || haystack.includes(normalizeText(search));
  const specialtyOk =
    !specialty ||
    normalizeText(person.specialty) === normalizeText(specialty) ||
    person.secondarySpecialties.some((item) => normalizeText(item) === normalizeText(specialty));
  const planOk =
    !healthPlan ||
    person.healthPlans.some((item) => normalizeText(item) === normalizeText(healthPlan));
  const dayOk =
    !day ||
    person.days.some((item) => normalizeKey(item) === normalizeKey(day));

  return searchOk && specialtyOk && planOk && dayOk;
}

function renderClinicalTab() {
  ensureClinicalTab();

  const professionals = allProfessionals();
  const filtered = professionals.filter(doctorMatches);
  const active = professionals.filter((person) => person.active);
  const specialties = unique(professionals.flatMap((person) => [person.specialty, ...person.secondarySpecialties]));
  const plans = unique(professionals.flatMap((person) => person.healthPlans));

  const specialtySelect = document.getElementById("csv-doctor-specialty");
  if (specialtySelect) {
    specialtySelect.innerHTML =
      '<option value="">Todas</option>' +
      specialties.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join("");
    specialtySelect.value = state.doctorFilters.specialty;
  }

  const planSelect = document.getElementById("csv-doctor-plan");
  if (planSelect) {
    planSelect.innerHTML =
      '<option value="">Todos</option>' +
      plans.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join("");
    planSelect.value = state.doctorFilters.healthPlan;
  }

  const search = document.getElementById("csv-doctor-search");
  if (search && search.value !== state.doctorFilters.search) search.value = state.doctorFilters.search;
  const day = document.getElementById("csv-doctor-day");
  if (day) day.value = state.doctorFilters.day;

  const stats = document.getElementById("csv-doctor-stats");
  if (stats) {
    stats.innerHTML = `
      <article><span class="csv-stat-icon blue"><i class="ri-team-line"></i></span><div><small>Profissionais</small><strong>${professionals.length}</strong></div></article>
      <article><span class="csv-stat-icon purple"><i class="ri-heart-pulse-line"></i></span><div><small>Especialidades</small><strong>${specialties.length}</strong></div></article>
      <article><span class="csv-stat-icon green"><i class="ri-calendar-check-line"></i></span><div><small>Em atividade</small><strong>${active.length}</strong></div></article>
      <article><span class="csv-stat-icon rose"><i class="ri-shield-check-line"></i></span><div><small>Convênios vinculados</small><strong>${plans.length}</strong></div></article>
    `;
  }

  const week = document.getElementById("csv-week-legend");
  if (week) {
    week.innerHTML = `
      <span class="csv-directory-mini-label">Equipe por dia</span>
      ${WEEK_DAYS.slice(0, 6).map(([value, label]) => {
        const count = professionals.filter((person) =>
          person.days.some((item) => normalizeKey(item) === normalizeKey(value))
        ).length;
        return `<button type="button" data-day="${value}" class="${state.doctorFilters.day === value ? "active" : ""}">
          <span>${label.slice(0, 3)}</span><strong>${count}</strong>
        </button>`;
      }).join("")}
    `;
    week.querySelectorAll("[data-day]").forEach((button) => {
      button.addEventListener("click", () => {
        state.doctorFilters.day =
          state.doctorFilters.day === button.dataset.day ? "" : button.dataset.day;
        renderClinicalTab();
      });
    });
  }

  const countLabel = document.getElementById("csv-doctor-result-count");
  if (countLabel) countLabel.textContent = `${filtered.length} ${filtered.length === 1 ? "profissional" : "profissionais"}`;

  const grid = document.getElementById("csv-doctor-grid");
  if (!grid) return;

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="csv-directory-empty">
        <i class="ri-user-search-line"></i>
        <strong>Nenhum profissional encontrado</strong>
        <span>Altere os filtros ou cadastre um novo profissional.</span>
      </div>
    `;
    return;
  }

  if (!state.selectedDoctorId || !filtered.some((person) => person.id === state.selectedDoctorId)) {
    state.selectedDoctorId = filtered[0]?.id || "";
  }

  grid.innerHTML = filtered.map((person) => `
    <article class="csv-doctor-card ${person.active ? "" : "is-inactive"} ${state.selectedDoctorId === person.id ? "is-selected" : ""}"
      data-doctor-id="${esc(person.id)}"
      onclick="window.csvSelectDoctor('${esc(person.id)}')">
      <div class="csv-doctor-photo-wrap">
        ${photoMarkup(person, "large")}
        <span class="csv-doctor-status ${person.active ? "active" : "inactive"}">
          ${person.active ? "Em atividade" : "Inativo"}
        </span>
      </div>

      <div class="csv-doctor-card-body">
        <div class="csv-doctor-name-row">
          <div>
            <h3>${esc(person.name)}</h3>
            <p>${esc(person.specialty)}</p>
          </div>
          <i class="ri-arrow-right-up-line"></i>
        </div>

        <div class="csv-doctor-meta">
          ${person.crm ? `<span><i class="ri-id-card-line"></i> CRM ${esc(person.crm)}</span>` : ""}
          ${person.offices[0] ? `<span><i class="ri-door-open-line"></i> ${esc(person.offices[0])}</span>` : ""}
          ${person.schedule ? `<span><i class="ri-time-line"></i> ${esc(person.schedule)}</span>` : ""}
        </div>

        <div class="csv-doctor-tags">
          ${person.days.slice(0, 4).map((item) => `<span>${esc(item)}</span>`).join("")}
        </div>

        <div class="csv-doctor-card-actions">
          <button type="button" onclick="window.csvOpenDoctorDetail('${esc(person.id)}')">
            Ver perfil
          </button>
          ${isAdmin() ? `<button type="button" class="admin-edit" onclick="event.stopPropagation();window.csvEditDoctor('${esc(person.id)}')"><i class="ri-edit-line"></i></button>` : ""}
        </div>
      </div>
    </article>
  `).join("");

  renderDoctorPreview();
}

window.csvSelectDoctor = function(id) {
  state.selectedDoctorId = id;
  renderClinicalTab();
};

function renderDoctorPreview() {
  const preview = document.getElementById("csv-doctor-preview");
  if (!preview) return;

  const person = allProfessionals().find((item) => item.id === state.selectedDoctorId);

  if (!person) {
    preview.innerHTML = `
      <div class="csv-doctor-preview-empty">
        <i class="ri-user-search-line"></i>
        <strong>Selecione um profissional</strong>
        <span>Os detalhes aparecerão aqui.</span>
      </div>
    `;
    return;
  }

  const upcoming = scheduleForDoctor(person.id)
    .filter((item) => String(item.data?.data || "") >= new Date().toISOString().slice(0, 10))
    .slice(0, 3);

  preview.innerHTML = `
    <div class="csv-doctor-preview-cover">
      ${photoMarkup(person, "profile")}
      <span class="csv-doctor-status ${person.active ? "active" : "inactive"}">
        ${person.active ? "Em atividade" : "Inativo"}
      </span>
    </div>

    <div class="csv-doctor-preview-body">
      <span class="csv-directory-eyebrow">Detalhes do profissional</span>
      <h3>${esc(person.name)}</h3>
      <p class="csv-doctor-preview-specialty">${esc(person.specialty)}</p>

      <div class="csv-doctor-preview-list">
        ${person.crm ? `<span><i class="ri-id-card-line"></i><b>CRM</b>${esc(person.crm)}</span>` : ""}
        <span><i class="ri-calendar-line"></i><b>Dias</b>${esc(person.days.join(", ") || "Não informado")}</span>
        <span><i class="ri-time-line"></i><b>Horário</b>${esc(person.schedule || "Não informado")}</span>
        <span><i class="ri-door-open-line"></i><b>Consultório</b>${esc(person.offices.join(", ") || "Não informado")}</span>
      </div>

      <div class="csv-doctor-preview-agenda">
        <div class="csv-doctor-preview-agenda-head">
          <strong>Próximas agendas</strong>
          <span>${upcoming.length}</span>
        </div>
        ${upcoming.length
          ? upcoming.map((item) => `
              <article>
                <span>${esc(item.data?.data || "")}</span>
                <strong>${esc(item.data?.inicio || "--:--")}–${esc(item.data?.fim || "--:--")}</strong>
                <small>${esc(item.data?.consultorio || "Consultório não informado")}</small>
              </article>
            `).join("")
          : `<small class="csv-preview-no-agenda">Nenhuma agenda futura cadastrada.</small>`}
      </div>

      <button type="button" class="csv-preview-open-profile"
        onclick="window.csvOpenDoctorDetail('${esc(person.id)}')">
        Abrir perfil completo
        <i class="ri-arrow-right-up-line"></i>
      </button>
    </div>
  `;
}


function calendarMarkup(person) {
  const month = state.calendarMonth;
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const leading = first.getDay();
  const events = scheduleForDoctor(person.id);
  const byDate = new Map();

  events.forEach((item) => {
    const key = String(item.data?.data || "");
    if (!key) return;
    const bucket = byDate.get(key) || [];
    bucket.push(item);
    byDate.set(key, bucket);
  });

  const cells = [];

  for (let index = 0; index < leading; index += 1) {
    cells.push('<div class="csv-calendar-day is-empty"></div>');
  }

  for (let day = 1; day <= last.getDate(); day += 1) {
    const date = new Date(year, monthIndex, day);
    const key = dateKey(date);
    const dayEvents = byDate.get(key) || [];
    const today = key === new Date().toISOString().slice(0, 10);

    cells.push(`
      <button type="button"
        class="csv-calendar-day ${today ? "is-today" : ""} ${dayEvents.length ? "has-events" : ""}"
        onclick="window.csvOpenScheduleDay('${esc(person.id)}','${key}')">
        <span>${day}</span>
        ${dayEvents.length
          ? `<small>${dayEvents.length}</small><i></i>`
          : ""}
      </button>
    `);
  }

  const monthLabel = month.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });

  return `
    <section class="csv-doctor-calendar-section">
      <div class="csv-calendar-head">
        <div>
          <span>Agenda detalhada</span>
          <h3>${esc(monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1))}</h3>
        </div>
        <div>
          <button type="button" onclick="window.csvChangeDoctorMonth(-1)">
            <i class="ri-arrow-left-s-line"></i>
          </button>
          <button type="button" onclick="window.csvChangeDoctorMonth(1)">
            <i class="ri-arrow-right-s-line"></i>
          </button>
          ${canEditSchedule()
            ? `<button type="button" class="primary" onclick="window.csvOpenScheduleForm('${esc(person.id)}')">
                <i class="ri-calendar-event-line"></i> Atualizar agenda
              </button>`
            : ""}
        </div>
      </div>

      <div class="csv-calendar-weekdays">
        <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span>
        <span>Qui</span><span>Sex</span><span>Sáb</span>
      </div>

      <div class="csv-calendar-grid">${cells.join("")}</div>

      <div class="csv-calendar-legend">
        <span><i class="today"></i> Hoje</span>
        <span><i class="scheduled"></i> Com agenda</span>
      </div>
    </section>
  `;
}

function agendaListMarkup(person) {
  const events = scheduleForDoctor(person.id)
    .filter((item) => String(item.data?.data || "") >= new Date().toISOString().slice(0, 10))
    .slice(0, 8);

  return `
    <section class="csv-doctor-upcoming-section">
      <div class="csv-plan-panel-head">
        <div><span>Próximos atendimentos</span><h3>Escala e consultórios</h3></div>
        <i class="ri-calendar-check-line"></i>
      </div>

      <div class="csv-doctor-upcoming-list">
        ${events.length
          ? events.map((item) => `
              <article>
                <div class="csv-agenda-date">
                  <strong>${esc(String(item.data?.data || "").slice(8, 10) || "--")}</strong>
                  <span>${esc(new Date(`${item.data?.data}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }))}</span>
                </div>
                <div>
                  <strong>${esc(item.data?.inicio || "--:--")} às ${esc(item.data?.fim || "--:--")}</strong>
                  <span>${esc(item.data?.consultorio || "Consultório não informado")}</span>
                  ${item.data?.observacao ? `<small>${esc(item.data.observacao)}</small>` : ""}
                </div>
                ${canEditSchedule()
                  ? `<div class="csv-agenda-actions">
                      <button type="button" onclick="window.csvOpenScheduleForm('${esc(person.id)}','${esc(item.id)}')"><i class="ri-edit-line"></i></button>
                      <button type="button" class="danger" onclick="window.csvDeleteSchedule('${esc(item.id)}','${esc(person.id)}')"><i class="ri-delete-bin-line"></i></button>
                    </div>`
                  : ""}
              </article>
            `).join("")
          : `<div class="csv-plan-panel-empty">Nenhuma agenda futura cadastrada.</div>`}
      </div>
    </section>
  `;
}

window.csvOpenDoctorDetail = function(id) {
  const person = allProfessionals().find((item) => item.id === id);
  if (!person) return;

  state.selectedDoctorId = id;

  const modal = ensureModal();
  modal.innerHTML = `
    <div class="csv-clinical-modal-card csv-doctor-profile-modal">
      <button type="button" class="csv-modal-close" onclick="window.csvClinicalCloseModal()"><i class="ri-close-line"></i></button>

      <div class="csv-doctor-profile-hero">
        ${photoMarkup(person, "profile")}
        <div>
          <span class="csv-directory-eyebrow"><i class="ri-user-heart-line"></i> Perfil profissional</span>
          <h2>${esc(person.name)}</h2>
          <p>${esc(person.specialty)}${person.crm ? ` • CRM ${esc(person.crm)}` : ""}</p>
          <div class="csv-doctor-tags">
            ${person.secondarySpecialties.map((item) => `<span>${esc(item)}</span>`).join("")}
          </div>
        </div>
      </div>

      <div class="csv-profile-grid">
        <section>
          <h3><i class="ri-information-line"></i> Sobre o profissional</h3>
          <p>${esc(person.bio || "Informações profissionais ainda não cadastradas.")}</p>
        </section>

        <section>
          <h3><i class="ri-calendar-schedule-line"></i> Agenda fixa na clínica</h3>
          <div class="csv-profile-list">
            <span><strong>Dias:</strong> ${esc(person.days.join(", ") || "Não informado")}</span>
            <span><strong>Horários:</strong> ${esc(person.schedule || "Não informado")}</span>
            <span><strong>Consultórios:</strong> ${esc(person.offices.join(", ") || "Não informado")}</span>
          </div>
        </section>

        <section>
          <h3><i class="ri-stethoscope-line"></i> Atendimentos realizados</h3>
          <div class="csv-profile-chip-list">
            ${person.services.length
              ? person.services.map((item) => `<span>${esc(item)}</span>`).join("")
              : "<small>Nenhum procedimento cadastrado.</small>"}
          </div>
        </section>

        <section>
          <h3><i class="ri-shield-check-line"></i> Convênios aceitos</h3>
          <div class="csv-profile-chip-list">
            ${person.healthPlans.length
              ? person.healthPlans.map((item) => `<span>${esc(item)}</span>`).join("")
              : "<small>Consulte a recepção.</small>"}
          </div>
        </section>
      </div>

      <div class="csv-profile-schedule-layout">
        ${calendarMarkup(person)}
        ${agendaListMarkup(person)}
      </div>

      <div class="csv-profile-footer">
        <div>
          ${person.phone ? `<span><i class="ri-phone-line"></i>${esc(person.phone)}</span>` : ""}
          ${person.email ? `<span><i class="ri-mail-line"></i>${esc(person.email)}</span>` : ""}
        </div>
        ${isAdmin() ? `
          <div class="csv-profile-admin-actions">
            <button type="button" class="csv-directory-action secondary" onclick="window.csvEditDoctor('${esc(person.id)}')"><i class="ri-edit-line"></i> Editar</button>
            <button type="button" class="csv-directory-action danger" onclick="window.csvDeleteDoctor('${esc(person.id)}')"><i class="ri-delete-bin-line"></i> Excluir</button>
          </div>
        ` : ""}
      </div>
    </div>
  `;
  modal.classList.add("is-open");
};

window.csvChangeDoctorMonth = function(direction) {
  const current = state.calendarMonth;
  state.calendarMonth = new Date(
    current.getFullYear(),
    current.getMonth() + Number(direction || 0),
    1
  );

  if (state.selectedDoctorId) {
    window.csvOpenDoctorDetail(state.selectedDoctorId);
  }
};

window.csvOpenScheduleDay = function(doctorId, date) {
  const events = scheduleForDoctor(doctorId).filter((item) => item.data?.data === date);

  if (events.length === 1 && canEditSchedule()) {
    window.csvOpenScheduleForm(doctorId, events[0].id);
    return;
  }

  if (canEditSchedule()) {
    window.csvOpenScheduleForm(doctorId, "", date);
  }
};

window.csvOpenScheduleForm = function(doctorId, eventId = "", defaultDate = "") {
  if (!canEditSchedule()) {
    alert("Seu acesso permite consultar, mas não atualizar a agenda médica.");
    return;
  }

  const person = allProfessionals().find((item) => item.id === doctorId);
  const existing = eventId
    ? state.scheduleEvents.find((item) => item.id === eventId)
    : null;

  if (!person) return;

  const data = existing?.data || {};
  const modal = ensureModal();

  modal.innerHTML = `
    <div class="csv-clinical-modal-card csv-form-modal csv-schedule-form-modal">
      <button type="button" class="csv-modal-close" onclick="window.csvClinicalCloseModal()"><i class="ri-close-line"></i></button>

      <span class="csv-directory-eyebrow"><i class="ri-calendar-event-line"></i> Agenda do corpo clínico</span>
      <h2>${existing ? "Editar escala" : "Nova escala"}</h2>
      <p>${esc(person.name)} • ${esc(person.specialty)}</p>

      <form id="csv-schedule-form" class="csv-smart-form">
        <input type="hidden" name="eventId" value="${esc(eventId)}">
        <input type="hidden" name="doctorId" value="${esc(doctorId)}">

        <div class="csv-form-section">
          <h3><i class="ri-calendar-line"></i> Data, horário e local</h3>

          <div class="csv-form-grid">
            <label>
              <span>Data</span>
              <input type="date" name="date" required value="${esc(data.data || defaultDate || new Date().toISOString().slice(0, 10))}">
            </label>
            <label>
              <span>Consultório ou sala</span>
              <input name="office" value="${esc(data.consultorio || person.offices[0] || "")}">
            </label>
            <label>
              <span>Início</span>
              <input type="time" name="start" required value="${esc(data.inicio || "")}">
            </label>
            <label>
              <span>Fim</span>
              <input type="time" name="end" required value="${esc(data.fim || "")}">
            </label>
            <label>
              <span>Status</span>
              <select name="status">
                <option value="Confirmado" ${data.status === "Confirmado" ? "selected" : ""}>Confirmado</option>
                <option value="Plantão" ${data.status === "Plantão" ? "selected" : ""}>Plantão</option>
                <option value="Alterado" ${data.status === "Alterado" ? "selected" : ""}>Alterado</option>
                <option value="Cancelado" ${data.status === "Cancelado" ? "selected" : ""}>Cancelado</option>
              </select>
            </label>
            <label class="full">
              <span>Observações para a equipe</span>
              <textarea name="notes" rows="4">${esc(data.observacao || "")}</textarea>
            </label>
          </div>
        </div>

        <div class="csv-form-actions">
          <button type="button" class="csv-directory-action secondary" onclick="window.csvOpenDoctorDetail('${esc(doctorId)}')">Cancelar</button>
          <button type="submit" class="csv-directory-action"><i class="ri-save-line"></i> Salvar agenda</button>
        </div>
        <div class="csv-form-message" id="csv-schedule-form-message"></div>
      </form>
    </div>
  `;

  modal.classList.add("is-open");
  document.getElementById("csv-schedule-form")?.addEventListener("submit", saveSchedule);
};

async function saveSchedule(event) {
  event.preventDefault();

  if (!canEditSchedule()) return;

  const form = event.currentTarget;
  const fd = new FormData(form);
  const eventId = String(fd.get("eventId") || "");
  const doctorId = String(fd.get("doctorId") || "");
  const person = allProfessionals().find((item) => item.id === doctorId);
  const button = form.querySelector('button[type="submit"]');
  const message = document.getElementById("csv-schedule-form-message");
  const original = button.innerHTML;

  const payload = {
    profissionalId: doctorId,
    profissionalNome: person?.name || "",
    data: String(fd.get("date") || ""),
    inicio: String(fd.get("start") || ""),
    fim: String(fd.get("end") || ""),
    consultorio: String(fd.get("office") || "").trim(),
    status: String(fd.get("status") || "Confirmado"),
    observacao: String(fd.get("notes") || "").trim(),
    atualizadoEm: serverTimestamp(),
    atualizadoPor: state.user?.email || ""
  };

  if (!payload.data || !payload.inicio || !payload.fim) {
    message.textContent = "Informe a data, o horário inicial e o horário final.";
    message.className = "csv-form-message error";
    return;
  }

  button.disabled = true;
  button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Salvando...';

  try {
    if (eventId) {
      await setDoc(doc(db, "agenda-profissionais", eventId), payload, { merge: true });
    } else {
      await addDoc(collection(db, "agenda-profissionais"), {
        ...payload,
        criadoEm: serverTimestamp()
      });
    }

    message.textContent = "Agenda atualizada com sucesso.";
    message.className = "csv-form-message success";

    setTimeout(() => window.csvOpenDoctorDetail(doctorId), 450);
  } catch (error) {
    console.error(error);
    message.textContent =
      error?.code === "permission-denied"
        ? "Seu acesso ainda não possui permissão para atualizar esta agenda."
        : `Não foi possível salvar: ${error.message}`;
    message.className = "csv-form-message error";
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

window.csvDeleteSchedule = async function(eventId, doctorId) {
  if (!canEditSchedule()) return;
  if (!confirm("Excluir este horário da agenda do profissional?")) return;

  try {
    await deleteDoc(doc(db, "agenda-profissionais", eventId));
    setTimeout(() => window.csvOpenDoctorDetail(doctorId), 160);
  } catch (error) {
    alert(`Não foi possível excluir: ${error.message}`);
  }
};

function doctorFormValues(person) {
  const data = person || {
    id: "",
    name: "",
    photo: "",
    specialty: "",
    secondarySpecialties: [],
    segment: "",
    crm: "",
    cbo: "",
    ura: "",
    healthPlans: [],
    days: [],
    schedule: "",
    offices: [],
    services: [],
    bio: "",
    phone: "",
    email: "",
    notes: "",
    active: true
  };
  return data;
}

function openDoctorForm(id = "") {
  if (!isAdmin()) return;
  const person = id ? allProfessionals().find((item) => item.id === id) : null;
  const value = doctorFormValues(person);
  const modal = ensureModal();

  modal.innerHTML = `
    <div class="csv-clinical-modal-card csv-form-modal">
      <button type="button" class="csv-modal-close" onclick="window.csvClinicalCloseModal()"><i class="ri-close-line"></i></button>

      <span class="csv-directory-eyebrow"><i class="ri-user-add-line"></i> Cadastro profissional</span>
      <h2>${id ? "Editar profissional" : "Novo profissional"}</h2>
      <p>Preencha as informações que serão exibidas para a equipe no diretório clínico.</p>

      <form id="csv-doctor-form" class="csv-smart-form">
        <input type="hidden" name="id" value="${esc(value.id)}">

        <div class="csv-form-section">
          <h3><i class="ri-user-3-line"></i> Identificação</h3>
          <div class="csv-form-grid">
            <label><span>Nome completo</span><input name="name" required value="${esc(value.name)}"></label>
            <label><span>Especialidade principal</span><input name="specialty" required value="${esc(value.specialty)}"></label>
            <label><span>CRM</span><input name="crm" value="${esc(value.crm)}"></label>
            <label><span>CBO</span><input name="cbo" value="${esc(value.cbo)}"></label>
            <label><span>Segmento</span><input name="segment" value="${esc(value.segment)}" placeholder="Ex.: Corpo clínico, plantonista..."></label>
            <label class="full csv-doctor-photo-field">
              <span>Foto do profissional — Google Drive ou URL direta</span>
              <input id="csv-doctor-photo-input" name="photo" value="${esc(value.photo)}" placeholder="Cole o link da foto individual compartilhada no Google Drive">
              <small>Não use o link de uma pasta. No Drive, libere a foto para “Qualquer pessoa com o link”.</small>
              <div id="csv-doctor-photo-preview">${photoPreviewMarkup(value.photo, value.name)}</div>
            </label>
            <label class="full"><span>Especialidades secundárias</span><input name="secondarySpecialties" value="${esc(value.secondarySpecialties.join(", "))}" placeholder="Separe por vírgulas"></label>
          </div>
        </div>

        <div class="csv-form-section">
          <h3><i class="ri-calendar-event-line"></i> Agenda e local</h3>
          <div class="csv-week-picker">
            ${WEEK_DAYS.map(([key, label]) => `
              <label>
                <input type="checkbox" name="days" value="${key}"
                  ${value.days.some((day) => normalizeKey(day) === key) ? "checked" : ""}>
                <span>${label}</span>
              </label>
            `).join("")}
          </div>
          <div class="csv-form-grid">
            <label><span>Horários de atendimento</span><input name="schedule" value="${esc(value.schedule)}" placeholder="Ex.: 08h às 12h e 14h às 17h"></label>
            <label><span>Consultórios</span><input name="offices" value="${esc(value.offices.join(", "))}" placeholder="Ex.: Consultório 2, Sala 4"></label>
          </div>
        </div>

        <div class="csv-form-section">
          <h3><i class="ri-heart-pulse-line"></i> Atuação</h3>
          <div class="csv-form-grid">
            <label class="full"><span>Procedimentos e atendimentos</span><textarea name="services" rows="4" placeholder="Um item por linha">${esc(value.services.join("\n"))}</textarea></label>
            <label class="full"><span>Convênios aceitos</span><textarea name="healthPlans" rows="3" placeholder="Um convênio por linha">${esc(value.healthPlans.join("\n"))}</textarea></label>
            <label class="full"><span>Sobre o profissional</span><textarea name="bio" rows="5">${esc(value.bio)}</textarea></label>
            <label><span>Telefone</span><input name="phone" value="${esc(value.phone)}"></label>
            <label><span>E-mail</span><input type="email" name="email" value="${esc(value.email)}"></label>
            <label class="full"><span>Observações internas</span><textarea name="notes" rows="3">${esc(value.notes)}</textarea></label>
          </div>
          <label class="csv-form-switch">
            <input type="checkbox" name="active" ${value.active ? "checked" : ""}>
            <span><strong>Profissional em atividade</strong><small>Desmarque para manter o cadastro oculto como inativo.</small></span>
          </label>
        </div>

        <div class="csv-form-actions">
          <button type="button" class="csv-directory-action secondary" onclick="window.csvClinicalCloseModal()">Cancelar</button>
          <button type="submit" class="csv-directory-action"><i class="ri-save-line"></i> Salvar profissional</button>
        </div>
        <div class="csv-form-message" id="csv-doctor-form-message"></div>
      </form>
    </div>
  `;

  modal.classList.add("is-open");
  document.getElementById("csv-doctor-form")?.addEventListener("submit", saveDoctor);

  document.getElementById("csv-doctor-photo-input")
    ?.addEventListener("input", updateDoctorPhotoPreview);

  document.querySelector('#csv-doctor-form input[name="name"]')
    ?.addEventListener("input", updateDoctorPhotoPreview);

  updateDoctorPhotoPreview();
}

window.csvEditDoctor = function(id) {
  closeModal();
  openDoctorForm(id);
};

async function saveDoctor(event) {
  event.preventDefault();
  if (!isAdmin()) return;

  const form = event.currentTarget;
  const fd = new FormData(form);
  const id = String(fd.get("id") || "");
  const days = [...form.querySelectorAll('input[name="days"]:checked')]
    .map((input) => WEEK_DAYS.find(([key]) => key === input.value)?.[1] || input.value);
  const button = form.querySelector('button[type="submit"]');
  const message = document.getElementById("csv-doctor-form-message");
  const original = button.innerHTML;

  const payload = {
    "Nome do Médico": String(fd.get("name") || "").trim(),
    "Especialidade": String(fd.get("specialty") || "").trim(),
    "Especialidades Secundárias": asArray(fd.get("secondarySpecialties")),
    "Segmento": String(fd.get("segment") || "").trim(),
    "CRM": String(fd.get("crm") || "").trim(),
    "CBO": String(fd.get("cbo") || "").trim(),
    "Link da Foto do Profissional": String(fd.get("photo") || "").trim(),
    "Dias de Atendimento": days,
    "Horários de Atendimento": String(fd.get("schedule") || "").trim(),
    "Consultórios": asArray(fd.get("offices")),
    "Procedimentos e Atendimentos": asArray(fd.get("services")),
    "Convênios Aceitos": asArray(fd.get("healthPlans")),
    "Sobre o Profissional": String(fd.get("bio") || "").trim(),
    "Telefone": String(fd.get("phone") || "").trim(),
    "E-mail": String(fd.get("email") || "").trim(),
    "Observações": String(fd.get("notes") || "").trim(),
    "Ativo": fd.get("active") === "on",
    atualizadoEm: serverTimestamp()
  };

  if (!payload["Nome do Médico"] || !payload["Especialidade"]) {
    message.textContent = "Informe o nome e a especialidade principal.";
    message.className = "csv-form-message error";
    return;
  }

  button.disabled = true;
  button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Salvando...';

  try {
    if (id) {
      await setDoc(doc(db, "corpo-clinico", id), payload, { merge: true });
    } else {
      await addDoc(collection(db, "corpo-clinico"), {
        ...payload,
        criadoEm: serverTimestamp()
      });
    }
    message.textContent = "Profissional salvo com sucesso.";
    message.className = "csv-form-message success";
    setTimeout(closeModal, 550);
  } catch (error) {
    console.error(error);
    message.textContent = `Não foi possível salvar: ${error.message}`;
    message.className = "csv-form-message error";
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

window.csvDeleteDoctor = async function(id) {
  if (!isAdmin()) return;
  const person = allProfessionals().find((item) => item.id === id);
  if (!person) return;
  if (!confirm(`Excluir permanentemente o cadastro de ${person.name}?`)) return;

  try {
    await deleteDoc(doc(db, "corpo-clinico", id));
    closeModal();
  } catch (error) {
    alert(`Não foi possível excluir: ${error.message}`);
  }
};

function ensureHealthPlanTab() {
  const tab = document.getElementById("tab-convenios");
  if (!tab || tab.dataset.csvPlanReady === "1") return;

  tab.dataset.csvPlanReady = "1";
  tab.innerHTML = `
    <div class="csv-plan-page">
      <header class="csv-directory-header">
        <div>
          <span class="csv-directory-eyebrow"><i class="ri-shield-cross-line"></i> Central de convênios</span>
          <h2>Convênios, coberturas e orientações</h2>
          <p>Selecione um convênio para consultar procedimentos, profissionais vinculados, regras, documentos e particularidades.</p>
        </div>
        <button type="button" class="csv-directory-action admin-only" id="csv-new-plan-button">
          <i class="ri-add-circle-line"></i> Cadastrar convênio
        </button>
      </header>

      <section class="csv-plan-layout">
        <aside class="csv-plan-sidebar">
          <label class="csv-directory-search">
            <i class="ri-search-line"></i>
            <input id="csv-plan-search" placeholder="Pesquisar convênio...">
          </label>
          <div class="csv-plan-list" id="csv-plan-list"></div>
        </aside>

        <main class="csv-plan-detail" id="csv-plan-detail"></main>
      </section>
    </div>
  `;

  document.getElementById("csv-new-plan-button")?.addEventListener("click", () => openHealthPlanForm());
  document.getElementById("csv-plan-search")?.addEventListener("input", (event) => {
    state.healthPlanSearch = event.target.value;
    renderHealthPlanTab();
  });

  renderHealthPlanTab();
}

function renderHealthPlanTab() {
  ensureHealthPlanTab();
  const plans = aggregateHealthPlans();
  const filtered = plans.filter((plan) =>
    !state.healthPlanSearch ||
    normalizeText(plan.name).includes(normalizeText(state.healthPlanSearch))
  );

  if (!state.selectedHealthPlanKey || !plans.some((plan) => plan.key === state.selectedHealthPlanKey)) {
    state.selectedHealthPlanKey = plans[0]?.key || "";
  }

  const list = document.getElementById("csv-plan-list");
  if (list) {
    if (!filtered.length) {
      list.innerHTML = `<div class="csv-plan-empty-list"><i class="ri-shield-search-line"></i><span>Nenhum convênio encontrado.</span></div>`;
    } else {
      list.innerHTML = filtered.map((plan) => {
        const procedureCount = unique(plan.procedures.map((item) => item.name)).length;
        return `
          <button type="button" class="csv-plan-list-item ${state.selectedHealthPlanKey === plan.key ? "active" : ""}"
            data-plan-key="${esc(plan.key)}">
            <span class="csv-plan-logo">
              ${plan.logo ? `<img src="${esc(plan.logo)}" alt="">` : `<i class="ri-shield-cross-fill"></i>`}
            </span>
            <span>
              <strong>${esc(plan.name)}</strong>
              <small>${procedureCount} ${procedureCount === 1 ? "procedimento" : "procedimentos"}</small>
            </span>
            <i class="ri-arrow-right-s-line"></i>
          </button>
        `;
      }).join("");

      list.querySelectorAll("[data-plan-key]").forEach((button) => {
        button.addEventListener("click", () => {
          state.selectedHealthPlanKey = button.dataset.planKey;
          renderHealthPlanTab();
        });
      });
    }
  }

  const selected = plans.find((plan) => plan.key === state.selectedHealthPlanKey);
  renderSelectedHealthPlan(selected);
}

function renderSelectedHealthPlan(plan) {
  const detail = document.getElementById("csv-plan-detail");
  if (!detail) return;

  if (!plan) {
    detail.innerHTML = `
      <div class="csv-plan-empty">
        <i class="ri-shield-star-line"></i>
        <h3>Selecione ou cadastre um convênio</h3>
        <p>As informações completas aparecerão neste painel.</p>
      </div>
    `;
    return;
  }

  const linkedDoctors = doctorsForHealthPlan(plan.name);
  const professionalNames = unique([
    ...linkedDoctors.map((person) => person.name),
    ...plan.manualProfessionals
  ]);
  const procedures = plan.procedures.filter((item) => item.name);

  detail.innerHTML = `
    <div class="csv-plan-hero">
      <div class="csv-plan-hero-brand">
        <span class="csv-plan-logo large">
          ${plan.logo ? `<img src="${esc(plan.logo)}" alt="">` : `<i class="ri-shield-cross-fill"></i>`}
        </span>
        <div>
          <span class="csv-directory-eyebrow">Convênio selecionado</span>
          <h2>${esc(plan.name)}</h2>
          <p>${esc(plan.description || "Informações gerais e orientações para atendimento.")}</p>
        </div>
      </div>
      ${isAdmin() ? `
        <div class="csv-plan-admin-actions">
          <button type="button" class="csv-directory-action secondary" onclick="window.csvEditHealthPlan('${esc(plan.key)}')"><i class="ri-edit-line"></i> Editar</button>
          <button type="button" class="csv-directory-action danger" onclick="window.csvDeleteHealthPlan('${esc(plan.key)}')"><i class="ri-delete-bin-line"></i></button>
        </div>
      ` : ""}
    </div>

    <section class="csv-plan-overview">
      <article><span class="csv-stat-icon blue"><i class="ri-file-list-3-line"></i></span><div><small>Procedimentos</small><strong>${procedures.length}</strong></div></article>
      <article><span class="csv-stat-icon purple"><i class="ri-user-heart-line"></i></span><div><small>Profissionais</small><strong>${professionalNames.length}</strong></div></article>
      <article><span class="csv-stat-icon green"><i class="ri-customer-service-2-line"></i></span><div><small>Contato</small><strong>${plan.contacts ? "Disponível" : "Pendente"}</strong></div></article>
    </section>

    <div class="csv-plan-content-grid">
      <section class="csv-plan-panel procedures">
        <div class="csv-plan-panel-head">
          <div><span>Serviços cobertos</span><h3>Procedimentos e códigos</h3></div>
          <i class="ri-file-list-3-line"></i>
        </div>
        <div class="csv-procedure-table">
          ${procedures.length ? `
            <div class="csv-procedure-row header"><span>Código</span><span>Procedimento</span><span>Observação</span></div>
            ${procedures.map((item) => `
              <div class="csv-procedure-row">
                <span>${esc(item.code || "—")}</span>
                <strong>${esc(item.name)}</strong>
                <small>${esc(item.note || "Sem observações")}</small>
              </div>
            `).join("")}
          ` : `<div class="csv-plan-panel-empty">Nenhum procedimento cadastrado.</div>`}
        </div>
      </section>

      <section class="csv-plan-panel">
        <div class="csv-plan-panel-head">
          <div><span>Equipe vinculada</span><h3>Profissionais que atendem</h3></div>
          <i class="ri-team-line"></i>
        </div>
        <div class="csv-plan-doctors">
          ${professionalNames.length
            ? professionalNames.map((name) => {
                const person = linkedDoctors.find((doctor) => normalizeText(doctor.name) === normalizeText(name));
                return `
                  <article>
                    ${person ? photoMarkup(person) : `<div class="csv-clinical-avatar is-fallback"><span>${esc(initials(name))}</span></div>`}
                    <div><strong>${esc(name)}</strong><small>${esc(person?.specialty || "Profissional vinculado")}</small></div>
                  </article>
                `;
              }).join("")
            : `<div class="csv-plan-panel-empty">Nenhum profissional vinculado.</div>`}
        </div>
      </section>

      <section class="csv-plan-panel">
        <div class="csv-plan-panel-head">
          <div><span>Orientações</span><h3>Regras e particularidades</h3></div>
          <i class="ri-information-line"></i>
        </div>
        <div class="csv-plan-text-block">
          <h4>Particularidades</h4>
          <p>${esc(plan.particularities || "Nenhuma particularidade cadastrada.")}</p>
          <h4>Regras de atendimento</h4>
          <p>${esc(plan.rules || "Consulte as orientações da recepção.")}</p>
          <h4>Documentos necessários</h4>
          <p>${esc(plan.documents || "Não informado.")}</p>
        </div>
      </section>

      <section class="csv-plan-panel contact">
        <div class="csv-plan-panel-head">
          <div><span>Suporte operacional</span><h3>Contato e autorização</h3></div>
          <i class="ri-phone-line"></i>
        </div>
        <div class="csv-profile-list">
          <span><strong>Contatos:</strong> ${esc(plan.contacts || "Não informado")}</span>
          <span><strong>Autorização:</strong> ${esc(plan.authorization || "Não informado")}</span>
          ${plan.portalUrl ? `<a href="${esc(plan.portalUrl)}" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> Abrir portal do convênio</a>` : ""}
        </div>
      </section>
    </div>
  `;
}

function healthPlanByKey(key) {
  return aggregateHealthPlans().find((plan) => plan.key === key);
}

function openHealthPlanForm(key = "") {
  if (!isAdmin()) return;
  const plan = key ? healthPlanByKey(key) : null;
  const modal = ensureModal();
  const procedureLines = (plan?.procedures || [])
    .map((item) => [item.code, item.name, item.note].filter(Boolean).join(" | "))
    .join("\n");

  modal.innerHTML = `
    <div class="csv-clinical-modal-card csv-form-modal">
      <button type="button" class="csv-modal-close" onclick="window.csvClinicalCloseModal()"><i class="ri-close-line"></i></button>

      <span class="csv-directory-eyebrow"><i class="ri-shield-add-line"></i> Cadastro de convênio</span>
      <h2>${plan ? "Editar convênio" : "Novo convênio"}</h2>
      <p>Organize cobertura, profissionais, procedimentos, autorizações e orientações em um único perfil.</p>

      <form id="csv-plan-form" class="csv-smart-form">
        <input type="hidden" name="masterId" value="${esc(plan?.masterId || "")}">
        <input type="hidden" name="originalKey" value="${esc(plan?.key || "")}">

        <div class="csv-form-section">
          <h3><i class="ri-shield-cross-line"></i> Identificação</h3>
          <div class="csv-form-grid">
            <label><span>Nome do convênio</span><input name="name" required value="${esc(plan?.name || "")}"></label>
            <label><span>Link da logo</span><input name="logo" value="${esc(plan?.logo || "")}" placeholder="https://..."></label>
            <label class="full"><span>Descrição geral</span><textarea name="description" rows="3">${esc(plan?.description || "")}</textarea></label>
          </div>
        </div>

        <div class="csv-form-section">
          <h3><i class="ri-file-list-3-line"></i> Cobertura</h3>
          <label class="csv-form-wide">
            <span>Procedimentos</span>
            <textarea name="procedures" rows="8" placeholder="Código | Procedimento | Observação&#10;101010 | Consulta cardiológica | Necessita autorização">${esc(procedureLines)}</textarea>
            <small>Use uma linha para cada procedimento.</small>
          </label>
          <label class="csv-form-wide">
            <span>Profissionais vinculados manualmente</span>
            <textarea name="professionals" rows="3" placeholder="Um profissional por linha">${esc((plan?.manualProfessionals || []).join("\n"))}</textarea>
          </label>
        </div>

        <div class="csv-form-section">
          <h3><i class="ri-information-line"></i> Operação e orientações</h3>
          <div class="csv-form-grid">
            <label><span>Contatos</span><textarea name="contacts" rows="3">${esc(plan?.contacts || "")}</textarea></label>
            <label><span>Processo de autorização</span><textarea name="authorization" rows="3">${esc(plan?.authorization || "")}</textarea></label>
            <label><span>Portal ou link</span><input name="portalUrl" value="${esc(plan?.portalUrl || "")}"></label>
            <label><span>Documentos necessários</span><textarea name="documents" rows="3">${esc(plan?.documents || "")}</textarea></label>
            <label class="full"><span>Regras de atendimento</span><textarea name="rules" rows="4">${esc(plan?.rules || "")}</textarea></label>
            <label class="full"><span>Particularidades</span><textarea name="particularities" rows="4">${esc(plan?.particularities || "")}</textarea></label>
          </div>
        </div>

        <div class="csv-form-actions">
          <button type="button" class="csv-directory-action secondary" onclick="window.csvClinicalCloseModal()">Cancelar</button>
          <button type="submit" class="csv-directory-action"><i class="ri-save-line"></i> Salvar convênio</button>
        </div>
        <div class="csv-form-message" id="csv-plan-form-message"></div>
      </form>
    </div>
  `;

  modal.classList.add("is-open");
  document.getElementById("csv-plan-form")?.addEventListener("submit", saveHealthPlan);
}

window.csvEditHealthPlan = function(key) {
  openHealthPlanForm(key);
};

async function saveHealthPlan(event) {
  event.preventDefault();
  if (!isAdmin()) return;

  const form = event.currentTarget;
  const fd = new FormData(form);
  const masterId = String(fd.get("masterId") || "");
  const name = String(fd.get("name") || "").trim();
  const button = form.querySelector('button[type="submit"]');
  const message = document.getElementById("csv-plan-form-message");
  const original = button.innerHTML;

  if (!name) {
    message.textContent = "Informe o nome do convênio.";
    message.className = "csv-form-message error";
    return;
  }

  const procedures = String(fd.get("procedures") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseProcedureLine)
    .map((item) => ({
      codigo: item.code,
      nome: item.name,
      observacao: item.note
    }));

  const payload = {
    tipoRegistro: "perfil-convenio",
    nome: name,
    "Convênio": name,
    logoUrl: String(fd.get("logo") || "").trim(),
    descricao: String(fd.get("description") || "").trim(),
    procedimentos: procedures,
    profissionais: asArray(fd.get("professionals")),
    contatos: String(fd.get("contacts") || "").trim(),
    portalUrl: String(fd.get("portalUrl") || "").trim(),
    autorizacao: String(fd.get("authorization") || "").trim(),
    documentos: String(fd.get("documents") || "").trim(),
    regras: String(fd.get("rules") || "").trim(),
    particularidades: String(fd.get("particularities") || "").trim(),
    atualizadoEm: serverTimestamp()
  };

  button.disabled = true;
  button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Salvando...';

  try {
    let savedId = masterId;
    if (masterId) {
      await setDoc(doc(db, "convenios", masterId), payload, { merge: true });
    } else {
      const created = await addDoc(collection(db, "convenios"), {
        ...payload,
        criadoEm: serverTimestamp()
      });
      savedId = created.id;
    }

    state.selectedHealthPlanKey = normalizeKey(name);
    message.textContent = "Convênio salvo com sucesso.";
    message.className = "csv-form-message success";
    setTimeout(closeModal, 550);
  } catch (error) {
    console.error(error);
    message.textContent = `Não foi possível salvar: ${error.message}`;
    message.className = "csv-form-message error";
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

window.csvDeleteHealthPlan = async function(key) {
  if (!isAdmin()) return;
  const plan = healthPlanByKey(key);
  if (!plan) return;

  if (!confirm(`Excluir o convênio ${plan.name} e todos os registros vinculados a ele?`)) return;

  try {
    await Promise.all(plan.docs.map((item) => deleteDoc(doc(db, "convenios", item.id))));
    state.selectedHealthPlanKey = "";
  } catch (error) {
    alert(`Não foi possível excluir: ${error.message}`);
  }
};

function applyAdminVisibility() {
  const admin = isAdmin();
  document.querySelectorAll(
    "#tab-corpo-clinico .admin-only, #tab-convenios .admin-only"
  ).forEach((element) => {
    element.style.display = admin ? "" : "none";
  });

  document.querySelectorAll("[data-schedule-editor]").forEach((element) => {
    element.style.display = canEditSchedule() ? "" : "none";
  });
}

function ensurePages() {
  ensureClinicalTab();
  ensureHealthPlanTab();
  applyAdminVisibility();
}

function subscribeData() {
  state.unsubscribers.forEach((unsubscribe) => {
    try { unsubscribe(); } catch (_) {}
  });
  state.unsubscribers = [];

  state.unsubscribers.push(
    onSnapshot(collection(db, "corpo-clinico"), (snapshot) => {
      state.professionals = snapshot.docs.map((item) => ({ id: item.id, data: item.data() }));
      renderClinicalTab();
      renderHealthPlanTab();
    }, (error) => console.error("Corpo clínico:", error))
  );

  state.unsubscribers.push(
    onSnapshot(collection(db, "convenios"), (snapshot) => {
      state.healthPlanDocs = snapshot.docs.map((item) => ({ id: item.id, data: item.data() }));
      renderHealthPlanTab();
      renderClinicalTab();
    }, (error) => console.error("Convênios:", error))
  );

  state.unsubscribers.push(
    onSnapshot(collection(db, "agenda-profissionais"), (snapshot) => {
      state.scheduleEvents = snapshot.docs.map((item) => ({ id: item.id, data: item.data() }));
      renderClinicalTab();

      const modal = document.getElementById("csv-clinical-modal");
      if (
        modal?.classList.contains("is-open") &&
        state.selectedDoctorId &&
        modal.querySelector(".csv-doctor-profile-modal")
      ) {
        window.csvOpenDoctorDetail(state.selectedDoctorId);
      }
    }, (error) => console.error("Agenda do corpo clínico:", error))
  );
}

function bindNavigation() {
  document.querySelectorAll('.nav-btn[data-tab="corpo-clinico"], .nav-btn[data-tab="convenios"]')
    .forEach((button) => {
      if (button.dataset.csvClinicalBound) return;
      button.dataset.csvClinicalBound = "1";
      button.addEventListener("click", () => {
        setTimeout(() => {
          ensurePages();
          if (button.dataset.tab === "corpo-clinico") renderClinicalTab();
          if (button.dataset.tab === "convenios") renderHealthPlanTab();
        }, 60);
      });
    });
}

window.csvClinicalEnsurePages = ensurePages;
window.csvClinicalRender = renderClinicalTab;
window.csvHealthPlanRender = renderHealthPlanTab;
window.csvClinicalCanEditSchedule = canEditSchedule;

function init() {
  ensurePages();
  bindNavigation();

  onAuthStateChanged(auth, (user) => {
    state.user = user;
    if (user) {
      ensurePages();
      applyAdminVisibility();
      subscribeData();
    } else {
      state.unsubscribers.forEach((unsubscribe) => {
        try { unsubscribe(); } catch (_) {}
      });
      state.unsubscribers = [];
    }
  });

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    ensurePages();
    bindNavigation();
    applyAdminVisibility();
    if (attempts >= 30) clearInterval(timer);
  }, 400);

  console.log(`CSV Clinical Directory ${CSV_CLINICAL_VERSION} carregado.`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
