import { getApps } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";

const VERSION = "7.9.2";
const MAX_ATTEMPTS = 180;
const WAIT_MS = 75;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function removeOldStartupError() {
  document.getElementById("csv-startup-error")?.remove();
}

async function waitForCore() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const firebaseReady = getApps().length > 0;
    const firestoreReady = Boolean(window.db);
    const dashboardReady = Boolean(
      document.getElementById("dashboard-screen")
    );

    if (firebaseReady && firestoreReady && dashboardReady) {
      return true;
    }

    await sleep(WAIT_MS);
  }

  console.warn(
    "CSV Bootstrap: o núcleo demorou mais que o esperado. " +
    "Os módulos visuais continuarão tentando carregar."
  );

  return false;
}

async function safeImport(name, path) {
  try {
    await import(`${path}?v=${VERSION}`);
    console.log(`CSV Bootstrap: ${name} carregado.`);
    return true;
  } catch (error) {
    console.error(
      `CSV Bootstrap: o módulo "${name}" não carregou.`,
      error
    );
    return false;
  }
}

async function start() {
  removeOldStartupError();

  console.log(
    `CSV Bootstrap ${VERSION}: aguardando o sistema principal...`
  );

  await waitForCore();

  const modules = [
    ["Sessão segura e campanhas", "./csv-session-campaign.js"],
    ["Fase 2", "./csv-phase2.js"],
    ["Acabamento visual", "./csv-polish.js"],
    ["Corpo Clínico e Convênios", "./csv-clinical-directory.js"],
    ["Controle de Ativos", "./csv-assets-dashboard.js"],
    ["Controle Administrativo", "./csv-admin-control.js"],
    ["Inteligência de Informativos", "./csv-bulletin-intelligence.js"]
  ];

  for (const [name, path] of modules) {
    await safeImport(name, path);
  }

  await safeImport(
    "Atualização visual 7.4",
    "./csv-ui-refresh.js"
  );

  await safeImport(
    "Limpeza definitiva das abas removidas",
    "./csv-tabs-cleanup.js"
  );

  await safeImport(
    "Boletins unificados",
    "./csv-bulletins-unified.js"
  );

  await safeImport(
    "Pastas e leitores dos boletins",
    "./csv-bulletin-folders.js"
  );

  await safeImport(
    "Garantia visual das pastas",
    "./csv-bulletin-folders-enforcer.js"
  );

  // Um único módulo controla login, anúncio fixo, carrossel e editor.
  // Os dois módulos antigos foram retirados do carregamento para evitar conflito.
  await safeImport(
    "Mídia e banners estabilizados",
    "./csv-media-stable.js"
  );

  await safeImport(
    "Chat de IA removido",
    "./csv-chat-disabled.js"
  );

  await safeImport(
    "Opiniões, pesquisa e clube de benefícios",
    "./csv-feedback-benefits.js"
  );

  await safeImport(
    "Avaliação dos informativos",
    "./csv-bulletin-ratings.js"
  );

  await safeImport(
    "Permissões e pesquisa moderna",
    "./csv-permissions-search-fix.js"
  );

  await safeImport(
    "Central de notificações e atualização segura",
    "./csv-notification-center.js"
  );

  await safeImport(
    "Pulso São Vicente e identidade do aplicativo",
    "./csv-app-branding.js"
  );

  await safeImport(
    "Correção final de mobile e entrada",
    "./csv-mobile-hotfix-7.9.2.js"
  );
removeOldStartupError();

  const forceCurrentView = () => {
    removeOldStartupError();

    const activeTab =
      document.querySelector(".nav-btn.active")?.dataset?.tab;

    if (activeTab === "colaboradores") {
      window.csv2EnsureTeamManager?.();
      window.csv2RenderTeamManager?.();
    }

    if (activeTab === "boletins") {
      window.csv2EnsureBulletinExperience?.();
      window.csvBulletinRatingsRefresh?.();
    }

    if (activeTab === "opinioes") {
      window.csvEngagementRenderOpinions?.();
    }

    if (activeTab === "beneficios") {
      window.csvEngagementRenderBenefits?.();
    }

    window.csvUiRefresh?.renderActive?.(true);
  };

  [120, 420, 900, 1800, 3200].forEach((delay) => {
    setTimeout(forceCurrentView, delay);
  });

  console.log(
    `CSV Bootstrap ${VERSION}: carregamento concluído.`
  );
}

start().catch((error) => {
  removeOldStartupError();

  console.error(
    "CSV Bootstrap: falha geral de inicialização.",
    error
  );
});
