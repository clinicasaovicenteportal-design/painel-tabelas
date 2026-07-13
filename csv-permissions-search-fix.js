import { getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const CSV_FIX_VERSION = "7.7.1";
const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const EXTRA_AREAS = [
  {
    id: "opinioes",
    label: "Opiniões e melhorias",
    icon: "ri-chat-smile-3-line"
  },
  {
    id: "beneficios",
    label: "Clube de benefícios",
    icon: "ri-gift-2-line"
  }
];

const state = {
  user: null,
  profile: null,
  lastTab: "home",
  benefits: [],
  benefitsLoaded: false,
  searchToken: 0,
  permissionTimer: null,
  observerTimer: null
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
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function phaseState() {
  return window.csvPhase2State || {};
}

async function loadProfile(user) {
  if (!user) return null;

  try {
    const snapshot = await getDoc(doc(db, "usuarios", user.uid));
    const data = snapshot.exists() ? snapshot.data() || {} : {};
    const legacyAdmin = String(user.email || "")
      .toLowerCase()
      .includes("@clinica");

    return {
      uid: user.uid,
      name: data.nome || user.email?.split("@")[0] || "Colaborador",
      sector: data.setor || "Geral",
      admin: data.admin === true || legacyAdmin,
      permissions: Array.isArray(data.permissoes)
        ? data.permissoes
        : []
    };
  } catch (error) {
    console.warn("CSV 7.7.1 — perfil:", error);

    const fallback = phaseState().profile || {};
    return {
      uid: user.uid,
      name: fallback.name || user.email?.split("@")[0] || "Colaborador",
      sector: fallback.sector || "Geral",
      admin:
        phaseState().isAdmin === true ||
        String(user.email || "").toLowerCase().includes("@clinica"),
      permissions: Array.isArray(fallback.permissions)
        ? fallback.permissions
        : []
    };
  }
}

function currentProfile() {
  const live = phaseState().profile;

  if (live) {
    return {
      ...state.profile,
      ...live,
      admin: phaseState().isAdmin === true || state.profile?.admin === true,
      permissions: Array.isArray(live.permissions)
        ? live.permissions
        : state.profile?.permissions || []
    };
  }

  return state.profile;
}

function canAccess(tabId) {
  const profile = currentProfile();

  if (!profile) return false;
  if (profile.admin === true) return true;
  if (tabId === "home") return true;

  return new Set(profile.permissions || []).has(tabId);
}

function syncNewNavigation() {
  EXTRA_AREAS.forEach((area) => {
    const button = document.getElementById(`csv-nav-${area.id}`);
    if (!button) return;

    const allowed = canAccess(area.id);
    const expected = allowed ? "flex" : "none";

    if (button.style.display !== expected) {
      button.style.setProperty("display", expected, "important");
    }

    button.disabled = !allowed;
    button.setAttribute("aria-hidden", allowed ? "false" : "true");
    button.title = allowed
      ? area.label
      : "Esta área ainda não foi liberada para este acesso.";
  });
}

function findUserPermissionsForRow(row) {
  if (!row) return new Set();

  const name = normalize(
    row.querySelector(".csv2-team-identity strong")?.textContent || ""
  );

  const username = normalize(
    String(
      row.querySelector(".csv2-team-login strong")?.textContent || ""
    ).replace(/^@/, "")
  );

  const users = Array.isArray(phaseState().users)
    ? phaseState().users
    : [];

  const found = users.find((item) => {
    const data = item?.data || {};
    return (
      (name && normalize(data.nome) === name) ||
      (username && normalize(data.usuario) === username)
    );
  });

  return new Set(
    Array.isArray(found?.data?.permissoes)
      ? found.data.permissoes
      : []
  );
}

function updatePermissionMaster(container, prefix) {
  if (!container || !prefix) return;

  const master = container.querySelector(
    `[data-permission-all="${CSS.escape(prefix)}"]`
  );

  if (!master) return;

  const inputs = [
    ...container.querySelectorAll(`input[name="${CSS.escape(prefix)}"]`)
  ];

  const checked = inputs.filter((input) => input.checked).length;
  master.checked = inputs.length > 0 && checked === inputs.length;
  master.indeterminate = checked > 0 && checked < inputs.length;
}

function injectExtraPermissionOptions() {
  document.querySelectorAll(".csv2-permission-grid").forEach((grid) => {
    const first = grid.querySelector('input[type="checkbox"][name]');
    const prefix = first?.name;
    if (!prefix) return;

    const container =
      grid.closest("[data-permission-container]") ||
      grid.parentElement ||
      grid;

    const master = container.querySelector(
      `[data-permission-all="${CSS.escape(prefix)}"]`
    );

    const row = grid.closest(".csv2-team-row");
    const savedPermissions = findUserPermissionsForRow(row);
    const masterWasChecked = master?.checked === true;

    EXTRA_AREAS.forEach((area) => {
      if (
        grid.querySelector(
          `input[name="${CSS.escape(prefix)}"][value="${area.id}"]`
        )
      ) {
        return;
      }

      const label = document.createElement("label");
      label.className = "csv2-permission-item";
      label.dataset.csvExtraPermission = area.id;

      const checked =
        savedPermissions.has(area.id) ||
        masterWasChecked;

      label.innerHTML = `
        <input
          type="checkbox"
          name="${esc(prefix)}"
          value="${area.id}"
          ${checked ? "checked" : ""}>
        <span>
          <i class="${area.icon}"></i>
          ${esc(area.label)}
        </span>
      `;

      grid.appendChild(label);

      label.querySelector("input")?.addEventListener("change", () => {
        updatePermissionMaster(container, prefix);
      });
    });

    updatePermissionMaster(container, prefix);
  });
}

function schedulePermissionSync() {
  clearTimeout(state.observerTimer);
  state.observerTimer = setTimeout(() => {
    injectExtraPermissionOptions();
    syncNewNavigation();
  }, 40);
}

function installPermissionObserver() {
  if (document.documentElement.dataset.csvPermissions771 === "1") return;

  document.documentElement.dataset.csvPermissions771 = "1";

  const observer = new MutationObserver(schedulePermissionSync);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest(
        '.nav-btn[data-tab="opinioes"], .nav-btn[data-tab="beneficios"]'
      );

      if (!button) return;

      const tabId = button.dataset.tab || "";
      if (canAccess(tabId)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    },
    true
  );

  state.permissionTimer = setInterval(() => {
    injectExtraPermissionOptions();
    syncNewNavigation();
  }, 350);
}

function ensureSearchStyles() {
  if (document.getElementById("csv-modern-search-771-style")) return;

  const style = document.createElement("style");
  style.id = "csv-modern-search-771-style";
  style.textContent = `
    #csv-modern-search-panel {
      display: none;
      margin: 0 0 34px;
      padding: 24px;
      border: 1px solid rgba(126, 142, 166, .18);
      border-radius: 26px;
      background: rgba(255, 255, 255, .92);
      box-shadow: 0 24px 60px rgba(35, 48, 72, .09);
    }
    html[data-theme="dark"] #csv-modern-search-panel {
      background: #182333;
      border-color: rgba(255, 255, 255, .08);
    }
    .csv-modern-search-heading {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 20px;
    }
    .csv-modern-search-heading span {
      color: #8b252c;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .csv-modern-search-heading h2 {
      margin: 5px 0 0;
      color: var(--cp-text, #172033);
      font-size: clamp(22px, 3vw, 34px);
    }
    .csv-modern-search-heading p {
      margin: 7px 0 0;
      color: #718096;
      font-size: 11px;
    }
    .csv-modern-search-count {
      padding: 8px 12px;
      border-radius: 999px;
      color: #6d51b7;
      background: rgba(116, 88, 202, .1);
      font-size: 9px;
      font-weight: 800;
      white-space: nowrap;
    }
    .csv-modern-search-groups {
      display: grid;
      gap: 18px;
    }
    .csv-modern-search-group {
      padding: 18px;
      border: 1px solid rgba(126, 142, 166, .16);
      border-radius: 20px;
      background: var(--cp-card, #fff);
    }
    .csv-modern-search-group > header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }
    .csv-modern-search-group > header strong {
      color: var(--cp-text, #172033);
      font-size: 13px;
    }
    .csv-modern-search-group > header small {
      color: #718096;
      font-size: 9px;
    }
    .csv-modern-result-list {
      display: grid;
      gap: 10px;
    }
    .csv-modern-result {
      display: grid;
      grid-template-columns: 46px minmax(0, 1fr) auto;
      align-items: center;
      gap: 13px;
      padding: 13px;
      border: 1px solid rgba(126, 142, 166, .15);
      border-radius: 16px;
      background: var(--cp-soft, #f7f9fc);
    }
    .csv-modern-result-icon {
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      color: #8b252c;
      background: rgba(139, 37, 44, .09);
      font-size: 18px;
    }
    .csv-modern-result-copy {
      min-width: 0;
    }
    .csv-modern-result-copy strong {
      display: block;
      overflow: hidden;
      color: var(--cp-text, #172033);
      font-size: 11px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .csv-modern-result-copy span {
      display: block;
      margin-top: 4px;
      overflow: hidden;
      color: #718096;
      font-size: 9px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .csv-modern-result button {
      min-height: 38px;
      padding: 0 13px;
      border: 0;
      border-radius: 12px;
      color: #fff;
      background: #8b252c;
      font: 700 9px/1 Poppins, sans-serif;
      cursor: pointer;
    }
    .csv-modern-search-empty {
      padding: 42px 20px;
      display: grid;
      place-items: center;
      gap: 8px;
      border: 1px dashed rgba(126, 142, 166, .26);
      border-radius: 20px;
      color: #718096;
      text-align: center;
    }
    .csv-modern-search-empty i {
      color: #8b252c;
      font-size: 28px;
    }
    .csv-modern-search-empty strong {
      color: var(--cp-text, #172033);
      font-size: 13px;
    }
    @media (max-width: 720px) {
      #csv-modern-search-panel {
        padding: 16px;
      }
      .csv-modern-search-heading {
        align-items: flex-start;
        flex-direction: column;
      }
      .csv-modern-result {
        grid-template-columns: 40px minmax(0, 1fr);
      }
      .csv-modern-result button {
        grid-column: 1 / -1;
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
}

function searchPanel() {
  let panel = document.getElementById("csv-modern-search-panel");
  if (panel) return panel;

  const main = document.querySelector(".main-content");
  if (!main) return null;

  panel = document.createElement("section");
  panel.id = "csv-modern-search-panel";

  const header = main.querySelector(".top-header");
  if (header?.nextSibling) {
    main.insertBefore(panel, header.nextSibling);
  } else {
    main.prepend(panel);
  }

  return panel;
}

function hideLegacySearchResults() {
  document
    .querySelectorAll(
      ".main-content section, .main-content article, .main-content > div"
    )
    .forEach((element) => {
      if (element.id === "csv-modern-search-panel") return;

      const heading = element.querySelector("h1, h2, h3, strong");
      const text = normalize(heading?.textContent || "");

      if (
        text.includes("resultados da pesquisa") ||
        text.includes("resultados do sistema") ||
        text.includes("resultado da busca")
      ) {
        element.style.setProperty("display", "none", "important");
        element.dataset.csvLegacySearchHidden = "1";
      }
    });
}

function bulletinTitle(item) {
  const data = item?.data || {};
  return String(
    data["Título do Informativo"] ||
    data["Título do Documento"] ||
    data.titulo ||
    "Informativo"
  );
}

function bulletinDescription(item) {
  const data = item?.data || {};
  return String(
    data.descricao ||
    data.conteudo ||
    data["Motivo"] ||
    data["Tipo (Urgente, Norma, Regra, etc)"] ||
    ""
  );
}

function collectPeople(queryText) {
  const profile = currentProfile();
  if (!profile?.admin) return [];

  const users = Array.isArray(phaseState().users)
    ? phaseState().users
    : [];

  const seen = new Set();

  return users
    .filter((item) => {
      const data = item?.data || {};
      if (data.admin === true || data.removido === true) return false;

      const haystack = normalize(
        `${data.nome || ""} ${data.setor || ""} ${data.usuario || ""}`
      );

      return haystack.includes(queryText);
    })
    .filter((item) => {
      const key = normalize(item?.data?.nome || item?.id || "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12)
    .map((item) => ({
      type: "person",
      icon: "ri-user-3-line",
      title: item.data?.nome || "Colaborador",
      subtitle: `${item.data?.setor || "Geral"} • @${item.data?.usuario || "sem usuário"}`,
      action: "Abrir na equipe",
      value: item.data?.nome || ""
    }));
}

function collectBulletins(queryText) {
  if (!canAccess("boletins")) return [];

  const phase = phaseState();
  const items = [
    ...(Array.isArray(phase.bulletins) ? phase.bulletins : []),
    ...(Array.isArray(phase.privateBulletins)
      ? phase.privateBulletins
      : [])
  ];

  const seen = new Set();

  return items
    .filter((item) => {
      const haystack = normalize(
        `${bulletinTitle(item)} ${bulletinDescription(item)}`
      );
      return haystack.includes(queryText);
    })
    .filter((item) => {
      const key = `${item.collectionName || "boletins"}-${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12)
    .map((item) => ({
      type: "bulletin",
      icon: "ri-file-text-line",
      title: bulletinTitle(item),
      subtitle: bulletinDescription(item) || "Boletim ou informativo",
      action: "Abrir boletins",
      value: "boletins"
    }));
}

function collectLegacyDirectory(queryText) {
  const sources = [
    {
      tab: "corpo-clinico",
      label: "Corpo Clínico",
      icon: "ri-stethoscope-line"
    },
    {
      tab: "convenios",
      label: "Convênios",
      icon: "ri-shield-cross-line"
    }
  ];

  const output = [];

  sources.forEach((source) => {
    if (!canAccess(source.tab)) return;

    const records =
      window.dadosGlobaisAbas?.[source.tab] ||
      window.todosOsDadosDoSistema?.[source.tab] ||
      [];

    if (!Array.isArray(records)) return;

    records.slice(0, 500).forEach((item) => {
      const data = item?.data || item || {};
      const values = Object.values(data)
        .filter((value) =>
          ["string", "number"].includes(typeof value)
        )
        .join(" ");

      if (!normalize(values).includes(queryText)) return;

      const title =
        data["Nome do Médico"] ||
        data["Convênio"] ||
        data.nome ||
        data.titulo ||
        source.label;

      output.push({
        type: "directory",
        icon: source.icon,
        title: String(title),
        subtitle: source.label,
        action: `Abrir ${source.label}`,
        value: source.tab
      });
    });
  });

  return output.slice(0, 12);
}

async function loadBenefits() {
  if (state.benefitsLoaded) return state.benefits;

  state.benefitsLoaded = true;

  try {
    const snapshot = await getDocs(collection(db, "beneficios"));
    state.benefits = snapshot.docs.map((item) => ({
      id: item.id,
      data: item.data() || {}
    }));
  } catch (error) {
    console.warn("CSV 7.7.1 — pesquisa de benefícios:", error);
    state.benefits = [];
  }

  return state.benefits;
}

async function collectBenefits(queryText) {
  if (!canAccess("beneficios")) return [];

  const profile = currentProfile();
  const items = await loadBenefits();

  return items
    .filter((item) => {
      const data = item.data || {};
      if (data.active === false) return false;

      const sectors = Array.isArray(data.sectors)
        ? data.sectors.map(normalize)
        : [];

      if (
        !profile?.admin &&
        data.audienceType === "setores" &&
        sectors.length &&
        !sectors.includes(normalize(profile?.sector))
      ) {
        return false;
      }

      const haystack = normalize(
        `${data.title || ""} ${data.partner || ""} ${data.category || ""} ${data.description || ""} ${data.discount || ""}`
      );

      return haystack.includes(queryText);
    })
    .slice(0, 12)
    .map((item) => ({
      type: "benefit",
      icon: "ri-gift-2-line",
      title: item.data?.title || "Benefício",
      subtitle:
        item.data?.discount ||
        item.data?.partner ||
        item.data?.category ||
        "Clube de benefícios",
      action: "Abrir benefício",
      value: "beneficios"
    }));
}

function resultGroup(title, items) {
  if (!items.length) return "";

  return `
    <section class="csv-modern-search-group">
      <header>
        <strong>${esc(title)}</strong>
        <small>${items.length} resultado(s)</small>
      </header>
      <div class="csv-modern-result-list">
        ${items.map((item) => `
          <article class="csv-modern-result">
            <span class="csv-modern-result-icon">
              <i class="${item.icon}"></i>
            </span>
            <div class="csv-modern-result-copy">
              <strong>${esc(item.title)}</strong>
              <span>${esc(item.subtitle)}</span>
            </div>
            <button
              type="button"
              data-modern-result="${esc(item.type)}"
              data-modern-value="${esc(item.value)}">
              ${esc(item.action)}
            </button>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function hideAllTabsForSearch() {
  document.querySelectorAll(".tab-content").forEach((section) => {
    section.classList.remove("active");
    section.style.setProperty("display", "none", "important");
  });

  document.querySelectorAll(".sidebar-nav .nav-btn").forEach((button) => {
    button.classList.remove("active");
  });
}

function activateTab(tabId) {
  const input = document.getElementById("input-pesquisa");
  if (input) input.value = "";

  const panel = searchPanel();
  if (panel) panel.style.display = "none";

  if (
    ["opinioes", "beneficios"].includes(tabId) &&
    typeof window.csvEngagementOpenTab === "function"
  ) {
    window.csvEngagementOpenTab(tabId);
    return;
  }

  window.irParaAba?.(tabId);
}

function bindSearchResultActions(panel) {
  panel.querySelectorAll("[data-modern-result]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.modernResult || "";
      const value = button.dataset.modernValue || "";

      if (type === "person") {
        activateTab("colaboradores");

        setTimeout(() => {
          window.csv2EnsureTeamManager?.();
          window.csv2RenderTeamManager?.();

          const search = document.getElementById("csv2-team-search");
          if (!search) return;

          search.value = value;
          search.dispatchEvent(
            new Event("input", {
              bubbles: true
            })
          );
        }, 180);

        return;
      }

      activateTab(value || "home");
    });
  });
}

async function renderModernSearch(rawQuery) {
  const panel = searchPanel();
  if (!panel) return;

  const queryText = normalize(rawQuery);

  hideLegacySearchResults();

  if (queryText.length < 2) {
    panel.style.display = "none";
    activateTab(state.lastTab || "home");
    return;
  }

  const activeTab =
    document.querySelector(".sidebar-nav .nav-btn.active")?.dataset?.tab;

  if (activeTab) {
    state.lastTab = activeTab;
  }

  hideAllTabsForSearch();

  const pageTitle = document.getElementById("page-title");
  if (pageTitle) pageTitle.textContent = "Pesquisa inteligente";

  panel.style.display = "block";
  panel.innerHTML = `
    <div class="csv-modern-search-heading">
      <div>
        <span><i class="ri-search-eye-line"></i> Pesquisa moderna</span>
        <h2>Buscando por “${esc(rawQuery)}”</h2>
        <p>Resultados organizados sem abrir os cartões antigos do sistema.</p>
      </div>
      <b class="csv-modern-search-count">
        Pesquisando...
      </b>
    </div>
    <div class="csv-modern-search-empty">
      <i class="ri-loader-4-line ri-spin"></i>
      <strong>Organizando os resultados</strong>
      <span>Aguarde um instante.</span>
    </div>
  `;

  const token = ++state.searchToken;
  const benefits = await collectBenefits(queryText);

  if (token !== state.searchToken) return;

  const people = collectPeople(queryText);
  const bulletins = collectBulletins(queryText);
  const directory = collectLegacyDirectory(queryText);
  const total =
    people.length +
    bulletins.length +
    benefits.length +
    directory.length;

  panel.innerHTML = `
    <div class="csv-modern-search-heading">
      <div>
        <span><i class="ri-search-eye-line"></i> Pesquisa moderna</span>
        <h2>Resultados para “${esc(rawQuery)}”</h2>
        <p>A pesquisa mostra somente dados atuais e acessíveis para este usuário.</p>
      </div>
      <b class="csv-modern-search-count">
        ${total} resultado(s)
      </b>
    </div>

    ${total ? `
      <div class="csv-modern-search-groups">
        ${resultGroup("Colaboradores", people)}
        ${resultGroup("Boletins e informativos", bulletins)}
        ${resultGroup("Clube de benefícios", benefits)}
        ${resultGroup("Diretórios do portal", directory)}
      </div>
    ` : `
      <div class="csv-modern-search-empty">
        <i class="ri-search-line"></i>
        <strong>Nenhum resultado encontrado</strong>
        <span>Tente pesquisar outro nome, setor, boletim, convênio ou benefício.</span>
      </div>
    `}
  `;

  bindSearchResultActions(panel);
}

function installModernSearch() {
  ensureSearchStyles();

  const original = document.getElementById("input-pesquisa");
  if (!original || original.dataset.csvModernSearch === "1") return;

  const input = original.cloneNode(true);
  input.dataset.csvModernSearch = "1";
  input.value = "";
  input.autocomplete = "off";
  input.setAttribute("autocomplete", "off");

  original.replaceWith(input);

  let timer = null;

  input.addEventListener(
    "input",
    (event) => {
      event.stopImmediatePropagation();
      clearTimeout(timer);

      timer = setTimeout(() => {
        renderModernSearch(input.value).catch((error) => {
          console.error("CSV 7.7.1 — pesquisa moderna:", error);
        });
      }, 120);
    },
    true
  );

  ["keyup", "change", "search"].forEach((type) => {
    input.addEventListener(
      type,
      (event) => {
        event.stopImmediatePropagation();
      },
      true
    );
  });

  hideLegacySearchResults();
}

function initForUser(user) {
  state.user = user;
  state.benefitsLoaded = false;
  state.benefits = [];

  loadProfile(user)
    .then((profile) => {
      state.profile = profile;
      injectExtraPermissionOptions();
      syncNewNavigation();
      installModernSearch();
    })
    .catch((error) => {
      console.error("CSV 7.7.1 — inicialização:", error);
    });
}

function reset() {
  state.user = null;
  state.profile = null;
  state.benefits = [];
  state.benefitsLoaded = false;

  EXTRA_AREAS.forEach((area) => {
    document
      .getElementById(`csv-nav-${area.id}`)
      ?.style.setProperty("display", "none", "important");
  });
}

function init() {
  ensureSearchStyles();
  installPermissionObserver();

  [200, 600, 1200, 2200].forEach((delay) => {
    setTimeout(() => {
      installModernSearch();
      injectExtraPermissionOptions();
      syncNewNavigation();
    }, delay);
  });

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      reset();
      return;
    }

    initForUser(user);
  });

  console.log(
    `CSV Permissions & Modern Search ${CSV_FIX_VERSION} carregado.`
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
