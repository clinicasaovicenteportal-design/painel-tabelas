(() => {
  "use strict";

  const CURRENT_VERSION = "7.5.6";
  const REMOVED_TABS = new Set(["ensino", "treinamentos", "rh"]);
  const APPLIED_KEY = "csv_update_applied_version";
  const DISMISSED_KEY = "csv_update_dismissed_version";
  let popupOpen = false;
  let pendingVersion = "";

  function compareVersions(left = "", right = "") {
    const a = String(left).split(".").map((item) => Number(item) || 0);
    const b = String(right).split(".").map((item) => Number(item) || 0);
    const total = Math.max(a.length, b.length);

    for (let index = 0; index < total; index += 1) {
      const difference = (a[index] || 0) - (b[index] || 0);
      if (difference !== 0) return difference;
    }

    return 0;
  }

  function injectStyles() {
    if (document.getElementById("csv-update-stable-style")) return;

    const style = document.createElement("style");
    style.id = "csv-update-stable-style";
    style.textContent = `
      .nav-btn[data-tab="ensino"],
      .nav-btn[data-tab="treinamentos"],
      .nav-btn[data-tab="rh"],
      #tab-ensino,
      #tab-treinamentos,
      #tab-rh { display:none !important; }

      .sidebar { height:100vh !important; min-height:0 !important; overflow:hidden !important; display:flex !important; flex-direction:column !important; }
      .sidebar-header,.sidebar-footer { flex:0 0 auto !important; }
      .sidebar-nav { flex:1 1 auto !important; min-height:0 !important; height:auto !important; max-height:none !important; overflow-y:auto !important; overflow-x:hidden !important; scrollbar-gutter:stable; padding-bottom:14px !important; }
      .sidebar-footer { position:relative !important; z-index:4 !important; margin-top:7px !important; background:inherit !important; }

      .csv-update-stable-overlay { position:fixed; inset:0; z-index:9999999; display:none; align-items:center; justify-content:center; padding:22px; background:rgba(10,17,29,.72); backdrop-filter:blur(14px); }
      .csv-update-stable-overlay.open { display:flex; }
      .csv-update-stable-card { width:min(470px,100%); padding:28px; border:1px solid rgba(255,255,255,.48); border-radius:28px; color:#172033; background:#fff; box-shadow:0 38px 100px rgba(0,0,0,.32); font-family:Poppins,sans-serif; }
      html[data-theme="dark"] .csv-update-stable-card { color:#eef3fb; border-color:rgba(255,255,255,.10); background:#182231; }
      .csv-update-stable-icon { width:62px; height:62px; display:grid; place-items:center; border-radius:21px; color:#fff; background:linear-gradient(145deg,#8b252c,#c94d59); box-shadow:0 17px 35px rgba(139,37,44,.28); font-size:28px; }
      .csv-update-stable-card h2 { margin:18px 0 8px; font-size:25px; line-height:1.08; }
      .csv-update-stable-card p { margin:0; color:#718096; font-size:11px; line-height:1.7; }
      .csv-update-stable-version { margin-top:15px; padding:10px 12px; display:inline-flex; align-items:center; gap:7px; border-radius:13px; color:#6952b0; background:rgba(116,88,202,.08); font-size:9px; font-weight:800; }
      .csv-update-stable-actions { margin-top:22px; display:grid; grid-template-columns:.75fr 1.25fr; gap:9px; }
      .csv-update-stable-actions button { min-height:48px; border-radius:15px; font-family:inherit; font-size:10px; font-weight:800; cursor:pointer; }
      .csv-update-stable-later { border:1px solid #dfe5ee; color:#586579; background:#f6f8fb; }
      .csv-update-stable-now { border:1px solid rgba(255,255,255,.24); color:#fff; background:linear-gradient(145deg,#781c24,#b53b45); box-shadow:0 14px 30px rgba(139,37,44,.24); }
      .csv-update-stable-progress { margin-top:16px; display:none; color:#718096; font-size:9px; font-weight:700; }
      .csv-update-stable-progress.visible { display:block; }
      @media(max-width:520px){.csv-update-stable-actions{grid-template-columns:1fr;}}
    `;
    document.head.appendChild(style);
  }

  function cleanRemovedTabs() {
    REMOVED_TABS.forEach((tab) => {
      document.querySelectorAll(`.nav-btn[data-tab="${tab}"], #tab-${tab}`).forEach((element) => element.remove());
      document.querySelectorAll(`[data-permission="${tab}"], input[value="${tab}"], [data-area="${tab}"]`).forEach((element) => {
        (element.closest("label") || element.closest(".csv2-permission-item") || element).remove();
      });
    });
  }

  async function clearCaches() {
    if (!("caches" in window)) return;
    const names = await caches.keys();
    await Promise.allSettled(names.filter((name) => name.startsWith("painel-csv-")).map((name) => caches.delete(name)));
  }

  async function updateWorker() {
    if (!("serviceWorker" in navigator)) return;
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(registrations.map(async (registration) => {
      try { await registration.update(); } catch (_) {}
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
      registration.installing?.postMessage({ type: "SKIP_WAITING" });
    }));
  }

  function ensurePopup() {
    let overlay = document.getElementById("csv-update-stable-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "csv-update-stable-overlay";
    overlay.className = "csv-update-stable-overlay";
    overlay.innerHTML = `
      <div class="csv-update-stable-card" role="dialog" aria-modal="true">
        <div class="csv-update-stable-icon"><i class="ri-refresh-line"></i></div>
        <h2>Há uma atualização nova</h2>
        <p id="csv-update-stable-message">Uma nova versão do Painel Clínico está disponível.</p>
        <div class="csv-update-stable-version" id="csv-update-stable-version"><i class="ri-sparkling-line"></i> Nova versão</div>
        <div class="csv-update-stable-actions">
          <button type="button" class="csv-update-stable-later">Depois</button>
          <button type="button" class="csv-update-stable-now">Atualizar agora</button>
        </div>
        <div class="csv-update-stable-progress">Limpando o cache e carregando a versão nova...</div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".csv-update-stable-later")?.addEventListener("click", () => {
      sessionStorage.setItem(DISMISSED_KEY, pendingVersion || CURRENT_VERSION);
      overlay.classList.remove("open");
      popupOpen = false;
    });

    overlay.querySelector(".csv-update-stable-now")?.addEventListener("click", async () => {
      const target = pendingVersion || CURRENT_VERSION;
      overlay.querySelectorAll("button").forEach((button) => { button.disabled = true; });
      overlay.querySelector(".csv-update-stable-progress")?.classList.add("visible");
      sessionStorage.setItem(APPLIED_KEY, target);

      try {
        await Promise.race([
          Promise.all([clearCaches(), updateWorker()]),
          new Promise((resolve) => setTimeout(resolve, 3500))
        ]);
      } catch (error) {
        console.warn("Atualização do painel:", error);
      }

      const url = new URL(window.location.href);
      url.searchParams.set("csv-version", target);
      url.searchParams.set("csv-refresh", Date.now().toString());
      window.location.replace(url.toString());
    });

    return overlay;
  }

  function showPopup(version, message = "") {
    if (popupOpen) return;
    if (sessionStorage.getItem(APPLIED_KEY) === version) return;
    if (sessionStorage.getItem(DISMISSED_KEY) === version) return;

    pendingVersion = version;
    popupOpen = true;

    const overlay = ensurePopup();
    overlay.querySelector("#csv-update-stable-message").textContent = message || "Uma nova versão do Painel Clínico está disponível. Deseja atualizar agora?";
    overlay.querySelector("#csv-update-stable-version").innerHTML = `<i class="ri-sparkling-line"></i> Versão ${version}`;
    overlay.classList.add("open");
  }

  async function checkForUpdates() {
    try {
      const url = new URL("./version.json", window.location.href);
      url.searchParams.set("_", Date.now().toString());
      const response = await fetch(url.toString(), { cache: "no-store" });
      if (!response.ok) return;

      const data = await response.json();
      const remote = String(data.version || "").trim();
      if (remote && compareVersions(remote, CURRENT_VERSION) > 0) {
        showPopup(remote, data.message || "");
      }
    } catch (error) {
      console.warn("Verificação de atualização:", error);
    }
  }

  function init() {
    injectStyles();
    cleanRemovedTabs();

    const observer = new MutationObserver(cleanRemovedTabs);
    observer.observe(document.documentElement, { childList:true, subtree:true });

    localStorage.setItem("csv_app_version", CURRENT_VERSION);
    checkForUpdates();
    setInterval(checkForUpdates, 10 * 60 * 1000);
    window.addEventListener("focus", checkForUpdates);

    window.csvCheckForUpdates = checkForUpdates;
    window.csvForceRefreshPanel = async () => {
      await clearCaches();
      await updateWorker();
      const url = new URL(window.location.href);
      url.searchParams.set("csv-refresh", Date.now().toString());
      window.location.replace(url.toString());
    };

    console.log(`CSV Atualizador Estável ${CURRENT_VERSION} carregado.`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

