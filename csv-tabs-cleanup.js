const CSV_TABS_CLEANUP_VERSION = "7.4.1";

const REMOVED_TABS = new Set([
  "ultrassom",
  "consultas",
  "pacotes",
  "exames-imagem",
  "institutos",
  "contatos",
  "remocoes"
]);

function removeTabFromInterface(tab) {
  document
    .querySelectorAll(`.nav-btn[data-tab="${tab}"]`)
    .forEach((element) => element.remove());

  document.getElementById(`tab-${tab}`)?.remove();

  document
    .querySelectorAll("#tab-home [onclick]")
    .forEach((element) => {
      const handler = element.getAttribute("onclick") || "";

      if (
        handler.includes(`irParaAba('${tab}')`) ||
        handler.includes(`irParaAba("${tab}")`)
      ) {
        element.remove();
      }
    });
}

function removePermissionOption(tab) {
  document
    .querySelectorAll(
      `input[value="${tab}"], input[data-permission="${tab}"], [data-area="${tab}"]`
    )
    .forEach((element) => {
      const wrapper =
        element.closest(
          ".csv-access-option, .csv-permission-option, label, article, li"
        ) || element;

      wrapper.remove();
    });
}

function redirectRemovedActiveTab() {
  const active = document.querySelector(
    ".sidebar-nav .nav-btn.active[data-tab]"
  );

  if (!active || !REMOVED_TABS.has(active.dataset.tab)) return;

  const home = document.querySelector(
    '.sidebar-nav .nav-btn[data-tab="home"]'
  );

  home?.click();
}

function cleanRemovedTabs() {
  REMOVED_TABS.forEach((tab) => {
    removeTabFromInterface(tab);
    removePermissionOption(tab);
  });

  redirectRemovedActiveTab();
}

function installGuard() {
  cleanRemovedTabs();

  const observer = new MutationObserver(() => {
    clearTimeout(installGuard.timer);
    installGuard.timer = setTimeout(cleanRemovedTabs, 60);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  setInterval(cleanRemovedTabs, 2500);

  window.csvRemovedTabs = [...REMOVED_TABS];

  console.log(
    `CSV Tabs Cleanup ${CSV_TABS_CLEANUP_VERSION} carregado.`
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installGuard);
} else {
  installGuard();
}
