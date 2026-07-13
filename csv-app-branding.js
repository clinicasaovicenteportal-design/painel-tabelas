const CSV_APP_BRANDING_VERSION = "7.9.4";
const SPLASH_KEY = "csv_splash_seen_7_9_4";

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    window.navigator.standalone === true
  );
}

function reducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function markBrandLogos() {
  document.querySelectorAll(
    ".csv-login-mobile-brand img, .sidebar-logo, .csv-mascot-chest img, .csv-login-brand img"
  ).forEach((image) => image.classList.add("csv-live-brand-logo"));
}

function removeSplash(splash) {
  if (!splash || splash.dataset.closing === "1") return;

  splash.dataset.closing = "1";
  splash.classList.add("is-leaving");

  window.setTimeout(() => {
    splash.remove();
    document.documentElement.classList.remove("csv-splash-visible");
  }, reducedMotion() ? 120 : 700);
}

function showSplash() {
  markBrandLogos();

  if (sessionStorage.getItem(SPLASH_KEY) === "1") return;
  sessionStorage.setItem(SPLASH_KEY, "1");

  const splash = document.createElement("div");
  splash.id = "csv-app-splash";
  splash.className = `csv-app-splash ${isStandalone() ? "is-standalone" : "is-browser"}`;
  splash.setAttribute("role", "status");
  splash.setAttribute("aria-label", "Abrindo o Portal Clínica São Vicente");

  splash.innerHTML = `
    <div class="csv-splash-backdrop"></div>

    <div class="csv-splash-particles" aria-hidden="true">
      ${Array.from({ length: 16 }, (_, index) => `
        <i style="--i:${index};--x:${8 + ((index * 17) % 84)}%;--y:${10 + ((index * 23) % 78)}%;"></i>
      `).join("")}
    </div>

    <div class="csv-splash-stage">
      <div class="csv-splash-orbit orbit-one"></div>
      <div class="csv-splash-orbit orbit-two"></div>

      <div class="csv-splash-logo-shell">
        <span class="csv-splash-shine"></span>
        <img src="./logo.png" alt="Clínica São Vicente">
      </div>

      <svg class="csv-splash-pulse" viewBox="0 0 760 120" aria-hidden="true">
        <path
          d="M10 68 H150 L185 68 L208 25 L246 99 L285 52 L318 68 H750"
          pathLength="1"
        />
      </svg>

      <div class="csv-splash-copy">
        <span>${isStandalone() ? "APLICATIVO INSTITUCIONAL" : "PORTAL INSTITUCIONAL"}</span>
        <h1>Clínica São Vicente</h1>
        <p>Saúde Cuidado &amp; Bem-estar</p>
      </div>

      <div class="csv-splash-loader" aria-hidden="true"><i></i></div>
    </div>
  `;

  document.documentElement.classList.add("csv-splash-visible");
  document.body.appendChild(splash);

  requestAnimationFrame(() => splash.classList.add("is-ready"));

  const duration = reducedMotion() ? 420 : isStandalone() ? 2400 : 1850;
  window.setTimeout(() => removeSplash(splash), duration);

  splash.addEventListener("click", () => removeSplash(splash));
}

function init() {
  markBrandLogos();
  showSplash();

  [250, 700, 1400].forEach((delay) => {
    window.setTimeout(markBrandLogos, delay);
  });

  console.log(`CSV App Branding ${CSV_APP_BRANDING_VERSION} carregado.`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
