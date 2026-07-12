(() => {
  "use strict";

  const VERSION = "7.5.3";
  let timer = null;
  let observerTimer = null;

  function isAdmin() {
    return window.csvPhase2State?.isAdmin === true;
  }

  function bulletinTabIsVisible() {
    const tab = document.getElementById("tab-boletins");
    const nav = document.querySelector(
      '.sidebar-nav .nav-btn[data-tab="boletins"]'
    );

    if (!tab) return false;

    return Boolean(
      tab.classList.contains("active") ||
      nav?.classList.contains("active") ||
      getComputedStyle(tab).display !== "none"
    );
  }

  function refreshFolders() {
    if (!isAdmin()) return;
    if (!bulletinTabIsVisible()) return;

    try {
      window.csvBulletinFoldersRefresh?.();
    } catch (error) {
      console.warn(
        "CSV 7.5.3: não foi possível reaplicar as pastas.",
        error
      );
    }
  }

  function bindNavigation() {
    const button = document.querySelector(
      '.sidebar-nav .nav-btn[data-tab="boletins"]'
    );

    if (!button || button.dataset.csvFolders753 === "1") return;

    button.dataset.csvFolders753 = "1";

    button.addEventListener("click", () => {
      [30, 120, 350, 800].forEach((delay) => {
        setTimeout(refreshFolders, delay);
      });
    });
  }

  function wrapBulletinRenderer() {
    const original = window.csv2EnsureBulletinExperience;

    if (
      typeof original !== "function" ||
      original.__csvFolders753Wrapped
    ) {
      return;
    }

    const wrapped = function(...args) {
      const result = original.apply(this, args);

      [0, 60, 180].forEach((delay) => {
        setTimeout(refreshFolders, delay);
      });

      return result;
    };

    wrapped.__csvFolders753Wrapped = true;
    wrapped.__csvFolders753Original = original;
    window.csv2EnsureBulletinExperience = wrapped;
  }

  function keepCurrent() {
    bindNavigation();
    wrapBulletinRenderer();
    refreshFolders();
  }

  function init() {
    keepCurrent();

    const observer = new MutationObserver(() => {
      clearTimeout(observerTimer);
      observerTimer = setTimeout(keepCurrent, 70);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    timer = setInterval(() => {
      if (!bulletinTabIsVisible()) return;

      const root = document.getElementById("csv2-bulletins-root");
      const folderContent = document.getElementById(
        "csv-bulletin-folder-content"
      );

      if (root && !folderContent) {
        refreshFolders();
      }
    }, 650);

    window.addEventListener("beforeunload", () => {
      clearInterval(timer);
    });

    console.log(
      `CSV Bulletin Folders Enforcer ${VERSION} carregado.`
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
