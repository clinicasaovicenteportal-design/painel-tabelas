const CACHE_NAME = "painel-csv-v7.2.1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./login-ui.css",
  "./csv-phase2.css",
  "./csv-polish.css",
  "./csv-weather-glass.css",
  "./csv-team-security.css",
  "./csv-clinical-directory.css",
  "./csv-bulletin-intelligence.css",
  "./csv-direct-modern.css",
  "./csv-system-upgrade.css",
  "./csv-admin-control.css",
  "./app.js",
  "./login-ui.js",
  "./csv-bootstrap.js",
  "./csv-phase2.js",
  "./csv-polish.js",
  "./csv-clinical-directory.js",
  "./csv-admin-control.js",
  "./csv-menu-update.js",
  "./csv-bulletin-intelligence.js",
  "./csv-direct-modern.js",
  "./csv-assets-dashboard.js",
  "./version.json",
  "./manifest.json",
  "./logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(new Request(url, { cache: "reload" }))
        )
      );
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((names) =>
        Promise.all(
          names
            .filter(
              (name) =>
                name.startsWith("painel-csv-") &&
                name !== CACHE_NAME
            )
            .map((name) => caches.delete(name))
        )
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: "no-store" });

    if (response?.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request, {
      ignoreSearch: true
    });

    if (cached) return cached;

    if (request.mode === "navigate") {
      return cache.match("./index.html");
    }

    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) return;

  if (
    requestUrl.pathname.endsWith("/version.json") ||
    requestUrl.pathname.endsWith("/sw.js")
  ) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
    );
    return;
  }

  event.respondWith(networkFirst(event.request));
});
