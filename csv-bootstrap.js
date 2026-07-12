import { getApps } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";

const VERSION = "7.5.2";
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
    ["Fase 2", "./csv-phase2.js"],
    ["Acabamento visual", "./csv-polish.js"],
    ["Corpo Clínico e Convênios", "./csv-clinical-directory.js"],
    ["Controle de Ativos", "./csv-assets-dashboard.js"],
    ["Controle Administrativo", "./csv-admin-control.js"],
    ["Menu e Atualizações", "./csv-menu-update.js"],
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
