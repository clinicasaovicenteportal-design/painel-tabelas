const CSV_MOBILE_NAV_VERSION = "7.9.3";
const CSV_MOBILE_BREAKPOINT = 980;

function csvMobileIsActive() {
  return window.innerWidth <= CSV_MOBILE_BREAKPOINT;
}

function csvMobileViewportHeight() {
  const height =
    window.visualViewport?.height ||
    window.innerHeight ||
    document.documentElement.clientHeight;

  document.documentElement.style.setProperty(
    "--csv-mobile-vh",
    `${height}px`
  );
}

function csvMobileSetMenu(open) {
  const shouldOpen = Boolean(open && csvMobileIsActive());

  document.body.classList.toggle(
    "csv-mobile-menu-open",
    shouldOpen
  );

  document
    .getElementById("csv-mobile-menu-button")
    ?.setAttribute(
      "aria-expanded",
      shouldOpen ? "true" : "false"
    );
}

function csvMobileCloseMenu() {
  csvMobileSetMenu(false);
}

function csvMobileToggleMenu() {
  csvMobileSetMenu(
    !document.body.classList.contains(
      "csv-mobile-menu-open"
    )
  );
}

function csvMobileEnsureBackdrop() {
  if (
    document.getElementById(
      "csv-mobile-sidebar-backdrop"
    )
  ) {
    return;
  }

  const backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.id = "csv-mobile-sidebar-backdrop";
  backdrop.className = "csv-mobile-sidebar-backdrop";
  backdrop.setAttribute(
    "aria-label",
    "Fechar menu lateral"
  );
  backdrop.addEventListener(
    "click",
    csvMobileCloseMenu
  );

  document.body.appendChild(backdrop);
}

function csvMobileEnsureMenuButton() {
  const header = document.querySelector(".top-header");
  if (!header) return;

  if (
    document.getElementById(
      "csv-mobile-menu-button"
    )
  ) {
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.id = "csv-mobile-menu-button";
  button.className = "csv-mobile-menu-button";
  button.setAttribute(
    "aria-label",
    "Abrir menu lateral"
  );
  button.setAttribute("aria-expanded", "false");
  button.innerHTML =
    '<i class="ri-menu-2-line" aria-hidden="true"></i>';

  button.addEventListener(
    "click",
    csvMobileToggleMenu
  );

  header.insertBefore(button, header.firstChild);
}

function csvMobileEnsureCloseButton() {
  const header = document.querySelector(
    ".sidebar-header"
  );

  if (!header) return;

  if (
    document.getElementById(
      "csv-mobile-sidebar-close"
    )
  ) {
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.id = "csv-mobile-sidebar-close";
  button.className = "csv-mobile-sidebar-close";
  button.setAttribute(
    "aria-label",
    "Fechar menu lateral"
  );
  button.innerHTML =
    '<i class="ri-close-line" aria-hidden="true"></i>';

  button.addEventListener(
    "click",
    csvMobileCloseMenu
  );

  header.appendChild(button);
}

function csvMobileBindNavigation() {
  const sidebar = document.querySelector(".sidebar");

  if (
    !sidebar ||
    sidebar.dataset.csvMobileNavigationBound === "1"
  ) {
    return;
  }

  sidebar.dataset.csvMobileNavigationBound = "1";

  sidebar.addEventListener("click", (event) => {
    const action = event.target.closest(
      ".nav-btn[data-tab], #btn-logout, .logout-btn"
    );

    if (action && csvMobileIsActive()) {
      window.setTimeout(
        csvMobileCloseMenu,
        80
      );
    }
  });
}

function csvMobileRemoveOldTransition() {
  document.body.classList.remove(
    "csv-auth-success"
  );

  document
    .getElementById("csv-login-transition")
    ?.remove();
}

function csvMobileRefresh() {
  csvMobileViewportHeight();
  csvMobileRemoveOldTransition();
  csvMobileEnsureBackdrop();
  csvMobileEnsureMenuButton();
  csvMobileEnsureCloseButton();
  csvMobileBindNavigation();

  const mobile = csvMobileIsActive();

  document.documentElement.classList.toggle(
    "csv-mobile-layout",
    mobile
  );

  document.body.classList.toggle(
    "csv-mobile-layout",
    mobile
  );

  if (!mobile) {
    csvMobileCloseMenu();
  }
}

function csvMobileInit() {
  csvMobileRefresh();

  [120, 400, 900, 1800, 3200].forEach(
    (delay) => {
      window.setTimeout(
        csvMobileRefresh,
        delay
      );
    }
  );

  window.addEventListener(
    "resize",
    csvMobileRefresh,
    { passive: true }
  );

  window.addEventListener(
    "orientationchange",
    () => {
      csvMobileCloseMenu();
      window.setTimeout(
        csvMobileRefresh,
        120
      );
    },
    { passive: true }
  );

  window.visualViewport?.addEventListener(
    "resize",
    csvMobileViewportHeight,
    { passive: true }
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        csvMobileCloseMenu();
      }
    }
  );

  window.csvMobileNavigation = {
    version: CSV_MOBILE_NAV_VERSION,
    open: () => csvMobileSetMenu(true),
    close: csvMobileCloseMenu,
    refresh: csvMobileRefresh
  };

  console.log(
    `CSV Mobile Navigation ${CSV_MOBILE_NAV_VERSION} carregada.`
  );
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    csvMobileInit,
    { once: true }
  );
} else {
  csvMobileInit();
}
