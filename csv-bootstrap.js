import { getApps } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";

const VERSION = "7.2.2";
const MAX_ATTEMPTS = 160;
const WAIT_MS = 75;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showStartupError(message) {
  console.error(message);

  let box = document.getElementById("csv-startup-error");
  if (!box) {
    box = document.createElement("div");
    box.id = "csv-startup-error";
    box.style.cssText = [
      "position:fixed",
      "left:50%",
      "bottom:24px",
      "z-index:999999",
      "max-width:min(620px,calc(100vw - 32px))",
      "padding:14px 18px",
      "border-radius:16px",
      "color:#fff",
      "background:#8b252c",
      "box-shadow:0 18px 45px rgba(0,0,0,.25)",
      "font:600 12px/1.55 Poppins,sans-serif",
      "transform:translateX(-50%)"
    ].join(";");
    document.body.appendChild(box);
  }

  box.textContent = message;
}

async function waitForCore() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const firebaseReady = getApps().length > 0;
    const firestoreReady = Boolean(window.db);
    const dashboardReady = Boolean(document.getElementById("dashboard-screen"));

    if (firebaseReady && firestoreReady && dashboardReady) {
      return;
    }

    await sleep(WAIT_MS);
  }

  throw new Error(
    "O núcleo principal não terminou de carregar. Firebase, banco ou painel não ficaram disponíveis."
  );
}

async function start() {
  console.log(`CSV Bootstrap ${VERSION}: aguardando o sistema principal...`);

  await waitForCore();

  console.log("CSV Bootstrap: núcleo pronto. Iniciando Fase 2...");

  await import(`./csv-phase2.js?v=${VERSION}`);

  if (typeof window.csv2EnsureTeamManager !== "function") {
    throw new Error("A Fase 2 foi carregada, mas as funções da nova interface não ficaram disponíveis.");
  }

  console.log("CSV Bootstrap: Fase 2 pronta. Iniciando acabamento visual...");

  await import(`./csv-polish.js?v=${VERSION}`);

  console.log("CSV Bootstrap: iniciando Corpo Clínico e Convênios...");
  await import(`./csv-clinical-directory.js?v=${VERSION}`);

  console.log("CSV Bootstrap: iniciando Controle de Ativos...");
  await import(`./csv-assets-dashboard.js?v=${VERSION}`);

  console.log("CSV Bootstrap: iniciando controle administrativo...");
  await import(`./csv-admin-control.js?v=${VERSION}`);

  console.log("CSV Bootstrap: limpando menu e ativando atualizações...");
  await import(`./csv-menu-update.js?v=${VERSION}`);

  console.log("CSV Bootstrap: iniciando inteligência de informativos...");
  await import(`./csv-bulletin-intelligence.js?v=${VERSION}`);

  console.log("CSV Bootstrap: aplicando visual moderno aos Informativos Diretos...");
  await import(`./csv-direct-modern.js?v=${VERSION}`);

  console.log(`CSV Bootstrap ${VERSION}: carregamento concluído.`);

  const forceCurrentView = () => {
    const activeTab = document.querySelector(".nav-btn.active")?.dataset?.tab;

    if (activeTab === "colaboradores") {
      window.csv2EnsureTeamManager?.();
      window.csv2RenderTeamManager?.();
    }

    if (activeTab === "boletins") {
      window.csv2EnsureBulletinExperience?.();
    }
  };

  [150, 500, 1200, 2400].forEach((delay) => {
    setTimeout(forceCurrentView, delay);
  });
}

start().catch((error) => {
  console.error("CSV Bootstrap: falha ao iniciar os módulos:", error);
  showStartupError(
    "Não foi possível carregar a nova interface. Feche o aplicativo, abra novamente e atualize com Ctrl + Shift + R. Detalhe: " +
      (error?.message || "erro desconhecido")
  );
});
