const CSV_MOBILE_HOTFIX_VERSION = "7.9.2";
const CSV_MOBILE_BREAKPOINT = 980;

function csvViewportHeight() {
  const h = window.visualViewport?.height || window.innerHeight || 0;
  document.documentElement.style.setProperty("--csv-mobile-vh", `${h}px`);
}

function csvIsMobile() {
  return window.innerWidth <= CSV_MOBILE_BREAKPOINT;
}

function csvCloseMenu() {
  document.body.classList.remove("csv-mobile-menu-open");
  const button = document.getElementById("csv-mobile-menu-button");
  if (button) button.setAttribute("aria-expanded", "false");
}

function csvOpenMenu() {
  if (!csvIsMobile()) return;
  document.body.classList.add("csv-mobile-menu-open");
  const button = document.getElementById("csv-mobile-menu-button");
  if (button) button.setAttribute("aria-expanded", "true");
}

function csvToggleMenu() {
  if (document.body.classList.contains("csv-mobile-menu-open")) csvCloseMenu();
  else csvOpenMenu();
}

function csvRemoveOldTransition() {
  document.body.classList.remove("csv-auth-success");
  const oldTransition = document.getElementById("csv-login-transition");
  if (oldTransition) {
    oldTransition.style.display = "none";
    oldTransition.remove();
  }
}

function csvEnsureBackdrop() {
  let backdrop = document.getElementById("csv-mobile-sidebar-backdrop");
  if (backdrop) return backdrop;

  backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.id = "csv-mobile-sidebar-backdrop";
  backdrop.className = "csv-mobile-sidebar-backdrop";
  backdrop.setAttribute("aria-label", "Fechar menu do portal");
  backdrop.addEventListener("click", csvCloseMenu);
  document.body.appendChild(backdrop);
  return backdrop;
}

function csvEnsureMenuButton() {
  const header = document.querySelector(".top-header");
  if (!header) return;

  let button = document.getElementById("csv-mobile-menu-button");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.id = "csv-mobile-menu-button";
    button.className = "csv-mobile-menu-button";
    button.setAttribute("aria-label", "Abrir menu");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = '<i class="ri-menu-2-line"></i>';
    button.addEventListener("click", csvToggleMenu);
    header.insertBefore(button, header.firstChild);
  }
}

function csvBindSidebar() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar || sidebar.dataset.csvMobileBound === "1") return;
  sidebar.dataset.csvMobileBound = "1";

  sidebar.addEventListener("click", (event) => {
    const target = event.target.closest(".nav-btn, .logout-btn, #btn-logout");
    if (target && csvIsMobile()) {
      setTimeout(csvCloseMenu, 100);
    }
  });
}

function csvApplyMobileClasses() {
  csvViewportHeight();
  const mobile = csvIsMobile();

  document.documentElement.classList.toggle("csv-mobile-active", mobile);
  document.body.classList.toggle("csv-mobile-active", mobile);

  const dashboard = document.getElementById("dashboard-screen");
  if (dashboard) dashboard.classList.toggle("csv-mobile-active", mobile);

  if (!mobile) csvCloseMenu();
}

function csvRefreshMobileUi() {
  csvRemoveOldTransition();
  csvEnsureBackdrop();
  csvEnsureMenuButton();
  csvBindSidebar();
  csvApplyMobileClasses();
}

function csvObserveUi() {
  const observer = new MutationObserver(() => {
    csvRefreshMobileUi();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function csvInitMobileHotfix() {
  csvRefreshMobileUi();
  [120, 400, 900, 1800, 3200].forEach((delay) => setTimeout(csvRefreshMobileUi, delay));
  csvObserveUi();

  window.addEventListener("resize", csvApplyMobileClasses, { passive: true });
  window.addEventListener("orientationchange", () => {
    csvCloseMenu();
    setTimeout(csvRefreshMobileUi, 120);
  }, { passive: true });
  window.visualViewport?.addEventListener("resize", csvViewportHeight, { passive: true });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") csvCloseMenu();
  });

  window.csvMobileHotfix = {
    version: CSV_MOBILE_HOTFIX_VERSION,
    refresh: csvRefreshMobileUi,
    open: csvOpenMenu,
    close: csvCloseMenu,
  };

  console.log(`CSV Mobile Hotfix ${CSV_MOBILE_HOTFIX_VERSION} carregado.`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", csvInitMobileHotfix, { once: true });
} else {
  csvInitMobileHotfix();
}
