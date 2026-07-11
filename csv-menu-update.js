
(() => {
  "use strict";

  const CURRENT_VERSION = "7.1.1";
  const REMOVED_TABS = new Set(["ensino", "treinamentos", "rh"]);
  const VERSION_STORAGE_KEY = "csv_app_version";
  const RELOAD_GUARD_KEY = "csv_app_reload_guard";
  const DISMISS_PREFIX = "csv_update_dismissed_";

  let updateOpen = false;
  let pendingVersion = "";

  function compareVersions(left = "", right = "") {
    const a = String(left).split(".").map((item) => Number(item) || 0);
    const b = String(right).split(".").map((item) => Number(item) || 0);
    const size = Math.max(a.length, b.length);

    for (let index = 0; index < size; index += 1) {
      const difference = (a[index] || 0) - (b[index] || 0);
      if (difference !== 0) return difference;
    }

    return 0;
  }

  function injectStyles() {
    if (document.getElementById("csv-menu-update-style")) return;

    const style = document.createElement("style");
    style.id = "csv-menu-update-style";
    style.textContent = `
      .nav-btn[data-tab="ensino"],
      .nav-btn[data-tab="treinamentos"],
      .nav-btn[data-tab="rh"],
      #tab-ensino,
      #tab-treinamentos,
      #tab-rh {
        display: none !important;
      }

      .sidebar {
        height: 100vh !important;
        min-height: 0 !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
      }

      .sidebar-header,
      .sidebar-footer {
        flex: 0 0 auto !important;
      }

      .sidebar-nav {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        height: auto !important;
        max-height: none !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        scrollbar-gutter: stable;
        padding-bottom: 14px !important;
      }

      .sidebar-nav::-webkit-scrollbar {
        width: 5px !important;
      }

      .sidebar-nav::-webkit-scrollbar-thumb {
        border-radius: 999px !important;
        background: rgba(139, 37, 44, .42) !important;
      }

      .sidebar-footer {
        position: relative !important;
        z-index: 4 !important;
        margin-top: 7px !important;
        background: inherit !important;
      }

      .csv-update-overlay {
        position: fixed;
        inset: 0;
        z-index: 9999999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 22px;
        background: rgba(10, 17, 29, .68);
        backdrop-filter: blur(14px);
      }

      .csv-update-overlay.is-open {
        display: flex;
      }

      .csv-update-card {
        width: min(470px, 100%);
        padding: 28px;
        border: 1px solid rgba(255,255,255,.58);
        border-radius: 28px;
        color: #172033;
        background:
          radial-gradient(circle at 92% 0%, rgba(116,88,202,.18), transparent 32%),
          #fff;
        box-shadow: 0 38px 100px rgba(0,0,0,.32);
        font-family: Poppins, sans-serif;
      }

      html[data-theme="dark"] .csv-update-card {
        color: #eef3fb;
        border-color: rgba(255,255,255,.1);
        background:
          radial-gradient(circle at 92% 0%, rgba(116,88,202,.22), transparent 32%),
          #182231;
      }

      .csv-update-icon {
        width: 62px;
        height: 62px;
        display: grid;
        place-items: center;
        border-radius: 21px;
        color: #fff;
        background: linear-gradient(145deg, #8b252c, #c94d59);
        box-shadow: 0 17px 35px rgba(139,37,44,.28);
        font-size: 28px;
      }

      .csv-update-card h2 {
        margin: 18px 0 8px;
        font-size: 25px;
        line-height: 1.08;
      }

      .csv-update-card p {
        margin: 0;
        color: #718096;
        font-size: 11px;
        line-height: 1.7;
      }

      html[data-theme="dark"] .csv-update-card p {
        color: #aeb9ca;
      }

      .csv-update-version {
        margin-top: 15px;
        padding: 10px 12px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        border: 1px solid rgba(116,88,202,.15);
        border-radius: 13px;
        color: #6952b0;
        background: rgba(116,88,202,.08);
        font-size: 9px;
        font-weight: 800;
      }

      .csv-update-actions {
        margin-top: 22px;
        display: grid;
        grid-template-columns: .75fr 1.25fr;
        gap: 9px;
      }

      .csv-update-actions button {
        min-height: 48px;
        border-radius: 15px;
        font-family: inherit;
        font-size: 10px;
        font-weight: 800;
        cursor: pointer;
      }

      .csv-update-later {
        border: 1px solid #dfe5ee;
        color: #586579;
        background: #f6f8fb;
      }

      .csv-update-now {
        border: 1px solid rgba(255,255,255,.24);
        color: #fff;
        background: linear-gradient(145deg, #781c24, #b53b45);
        box-shadow: 0 14px 30px rgba(139,37,44,.24);
      }

      .csv-update-progress {
        margin-top: 16px;
        display: none;
        color: #718096;
        font-size: 9px;
        font-weight: 700;
      }

      .csv-update-progress.visible {
        display: block;
      }

      @media (max-width: 520px) {
        .csv-update-actions {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function removeObsoleteModules() {
    REMOVED_TABS.forEach((tab) => {
      document
        .querySelectorAll(`.nav-btn[data-tab="${tab}"], #tab-${tab}`)
        .forEach((element) => element.remove());

      document
        .querySelectorAll(
          `[data-permission="${tab}"], input[value="${tab}"], [data-area="${tab}"]`
        )
        .forEach((element) => {
          const removable =
            element.closest("label") ||
            element.closest(".csv2-permission-item") ||
            element.closest(".csv-polish-permission") ||
            element;

          removable?.remove();
        });
    });

    const nav = document.querySelector(".sidebar-nav");

    if (nav) {
      nav.style.setProperty("max-height", "none", "important");
      nav.style.setProperty("height", "auto", "important");
      nav.style.setProperty("min-height", "0", "important");
      nav.style.setProperty("overflow-y", "auto", "important");
    }
  }

  async function clearPanelCaches() {
    if (!("caches" in window)) return;

    const names = await caches.keys();

    await Promise.all(
      names
        .filter((name) => name.startsWith("painel-csv-"))
        .map((name) => caches.delete(name))
    );
  }

  async function unregisterWorkers() {
    if (!("serviceWorker" in navigator)) return;

    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((item) => item.unregister()));
  }

  function reloadWithVersion(version) {
    const url = new URL(window.location.href);
    url.searchParams.set("csv-version", version || CURRENT_VERSION);
    url.searchParams.set("csv-refresh", Date.now().toString());
    window.location.replace(url.toString());
  }

  async function applyCurrentVersionOnce() {
    const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
    const guardedVersion = sessionStorage.getItem(RELOAD_GUARD_KEY);

    if (storedVersion === CURRENT_VERSION) {
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
      return;
    }

    localStorage.setItem(VERSION_STORAGE_KEY, CURRENT_VERSION);

    if (guardedVersion === CURRENT_VERSION) {
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
      return;
    }

    sessionStorage.setItem(RELOAD_GUARD_KEY, CURRENT_VERSION);
    await clearPanelCaches();
    await unregisterWorkers();
    reloadWithVersion(CURRENT_VERSION);
  }

  function ensureUpdatePopup() {
    let overlay = document.getElementById("csv-update-overlay");

    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "csv-update-overlay";
    overlay.className = "csv-update-overlay";
    overlay.innerHTML = `
      <div class="csv-update-card" role="dialog" aria-modal="true">
        <div class="csv-update-icon"><i class="ri-refresh-line"></i></div>
        <h2>Há uma atualização nova</h2>
        <p id="csv-update-message">
          Uma nova versão do Painel Clínico está disponível.
          Deseja atualizar o navegador agora?
        </p>
        <div class="csv-update-version" id="csv-update-version">
          <i class="ri-sparkling-line"></i>
          Nova versão
        </div>
        <div class="csv-update-actions">
          <button type="button" class="csv-update-later" id="csv-update-later">
            Depois
          </button>
          <button type="button" class="csv-update-now" id="csv-update-now">
            Sim, atualizar agora
          </button>
        </div>
        <div class="csv-update-progress" id="csv-update-progress">
          Limpando arquivos antigos e carregando a nova versão...
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay
      .querySelector("#csv-update-later")
      ?.addEventListener("click", () => {
        if (pendingVersion) {
          sessionStorage.setItem(`${DISMISS_PREFIX}${pendingVersion}`, "1");
        }

        overlay.classList.remove("is-open");
        updateOpen = false;
      });

    overlay
      .querySelector("#csv-update-now")
      ?.addEventListener("click", async () => {
        overlay.querySelectorAll("button").forEach((button) => {
          button.disabled = true;
        });

        overlay
          .querySelector("#csv-update-progress")
          ?.classList.add("visible");

        localStorage.setItem(
          VERSION_STORAGE_KEY,
          pendingVersion || CURRENT_VERSION
        );

        await clearPanelCaches();
        await unregisterWorkers();
        reloadWithVersion(pendingVersion || CURRENT_VERSION);
      });

    return overlay;
  }

  function showUpdatePopup(version, message = "") {
    if (
      updateOpen ||
      sessionStorage.getItem(`${DISMISS_PREFIX}${version}`) === "1"
    ) {
      return;
    }

    pendingVersion = version;
    updateOpen = true;

    const overlay = ensureUpdatePopup();

    overlay.querySelector("#csv-update-message").textContent =
      message ||
      "Uma nova versão do Painel Clínico está disponível. Deseja atualizar o navegador agora?";

    overlay.querySelector("#csv-update-version").innerHTML =
      `<i class="ri-sparkling-line"></i> Versão ${version}`;

    overlay.classList.add("is-open");
  }

  async function checkForUpdates() {
    try {
      const url = new URL("./version.json", window.location.href);
      url.searchParams.set("_", Date.now().toString());

      const response = await fetch(url.toString(), {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate"
        }
      });

      if (!response.ok) return;

      const data = await response.json();
      const remoteVersion = String(data.version || "").trim();

      if (
        remoteVersion &&
        compareVersions(remoteVersion, CURRENT_VERSION) > 0
      ) {
        showUpdatePopup(remoteVersion, data.message || "");
      }
    } catch (error) {
      console.warn("Verificação de atualização:", error);
    }
  }

  function startObservers() {
    const observer = new MutationObserver(removeObsoleteModules);

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"]
    });

    [0, 100, 300, 700, 1500, 3000, 6000].forEach((delay) => {
      setTimeout(removeObsoleteModules, delay);
    });
  }

  async function init() {
    injectStyles();
    removeObsoleteModules();
    startObservers();

    await applyCurrentVersionOnce();

    checkForUpdates();
    setInterval(checkForUpdates, 5 * 60 * 1000);

    window.addEventListener("focus", checkForUpdates);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        checkForUpdates();
      }
    });

    window.csvCheckForUpdates = checkForUpdates;

    console.log(
      `CSV Menu/Atualização ${CURRENT_VERSION} carregado.`
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
