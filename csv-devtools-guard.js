(() => {
  "use strict";

  const VERSION = "7.5.1";
  const hostname = String(window.location.hostname || "").toLowerCase();

  const developmentHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".app.github.dev") ||
    hostname.endsWith(".githubpreview.dev");

  if (developmentHost) {
    console.info(
      `CSV DevTools Guard ${VERSION}: desativado no ambiente de desenvolvimento.`
    );
    return;
  }

  const state = {
    visible: false,
    openedByShortcut: false,
    lastDetectedAt: 0
  };

  function isSmallTouchDevice() {
    return (
      navigator.maxTouchPoints > 0 &&
      Math.min(window.innerWidth, window.innerHeight) < 760
    );
  }

  function ensureOverlay() {
    let overlay = document.getElementById("csv-devtools-guard");

    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "csv-devtools-guard";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "csv-devtools-guard-title");
    overlay.innerHTML = `
      <div class="csv-devtools-guard-card">
        <div class="csv-devtools-guard-icon">
          <i class="ri-shield-keyhole-line"></i>
        </div>

        <span class="csv-devtools-guard-eyebrow">
          Ambiente interno protegido
        </span>

        <h2 id="csv-devtools-guard-title">
          Acesso técnico restrito
        </h2>

        <p>
          Console, Elements e ferramentas de desenvolvimento são
          reservados à administração do sistema.
        </p>

        <div class="csv-devtools-guard-notice">
          <i class="ri-information-line"></i>
          <span>
            Feche as ferramentas do navegador para continuar usando
            o Painel Clínico.
          </span>
        </div>

        <button type="button" id="csv-devtools-guard-check">
          <i class="ri-refresh-line"></i>
          Verificar e continuar
        </button>

        <small>
          O acesso aos dados permanece controlado pelo login e pelas
          regras de segurança do Firebase.
        </small>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay
      .querySelector("#csv-devtools-guard-check")
      ?.addEventListener("click", () => {
        state.openedByShortcut = false;
        checkDevTools(true);
      });

    return overlay;
  }

  function showGuard() {
    const overlay = ensureOverlay();

    if (!state.visible) {
      state.visible = true;
      document.documentElement.classList.add("csv-devtools-restricted");
      overlay.classList.add("is-visible");
    }
  }

  function hideGuard() {
    const overlay = document.getElementById("csv-devtools-guard");

    state.visible = false;
    document.documentElement.classList.remove("csv-devtools-restricted");
    overlay?.classList.remove("is-visible");
  }

  function dimensionsSuggestDevTools() {
    if (isSmallTouchDevice()) return false;

    const widthDifference = Math.max(
      0,
      window.outerWidth - window.innerWidth
    );

    const heightDifference = Math.max(
      0,
      window.outerHeight - window.innerHeight
    );

    return widthDifference > 180 || heightDifference > 180;
  }

  function checkDevTools(manual = false) {
    const detected = dimensionsSuggestDevTools();

    if (detected) {
      state.lastDetectedAt = Date.now();
      showGuard();
      return;
    }

    if (
      state.openedByShortcut &&
      !manual &&
      Date.now() - state.lastDetectedAt < 1200
    ) {
      showGuard();
      return;
    }

    state.openedByShortcut = false;
    hideGuard();
  }

  function isRestrictedShortcut(event) {
    const key = String(event.key || "").toLowerCase();

    return (
      key === "f12" ||
      (event.ctrlKey &&
        event.shiftKey &&
        ["i", "j", "c", "k"].includes(key)) ||
      (event.metaKey &&
        event.altKey &&
        ["i", "j", "c"].includes(key)) ||
      (event.ctrlKey && key === "u")
    );
  }

  document.addEventListener(
    "keydown",
    (event) => {
      if (!isRestrictedShortcut(event)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      state.openedByShortcut = true;
      state.lastDetectedAt = Date.now();
      showGuard();
    },
    true
  );

  document.addEventListener(
    "contextmenu",
    (event) => {
      event.preventDefault();
      state.openedByShortcut = true;
      state.lastDetectedAt = Date.now();
      showGuard();
    },
    true
  );

  window.addEventListener("resize", () => checkDevTools(false));
  window.addEventListener("focus", () => checkDevTools(false));

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkDevTools(false);
  });

  setInterval(() => checkDevTools(false), 650);

  /*
   * Reduz as mensagens técnicas no site publicado.
   * Em localhost e Codespaces o console continua normal para manutenção.
   */
  ["log", "info", "debug", "warn"].forEach((method) => {
    try {
      console[method] = () => {};
    } catch (_) {}
  });

  try {
    console.clear();
  } catch (_) {}

  setTimeout(() => checkDevTools(false), 200);
})();
