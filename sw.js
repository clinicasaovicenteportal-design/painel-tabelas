const CACHE_NAME = "painel-csv-v7.7.0";

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
  "./csv-ui-refresh.css",
  "./csv-bulletin-intelligence.css",
  "./csv-bulletins-unified.css",
  "./csv-bulletin-folders.css",
  "./csv-system-upgrade.css",
  "./csv-admin-control.css",
  "./csv-devtools-guard.css",
  "./csv-engagement-7.7.css",
  "./app.js",
  "./login-ui.js",
  "./csv-devtools-guard.js",
  "./csv-bootstrap.js",
  "./csv-session-campaign.js",
  "./csv-phase2.js",
  "./csv-polish.js",
  "./csv-clinical-directory.js",
  "./csv-ui-refresh.js",
  "./csv-tabs-cleanup.js",
  "./csv-admin-control.js",
  "./csv-menu-update.js",
  "./csv-bulletin-intelligence.js",
  "./csv-bulletins-unified.js",
  "./csv-bulletin-folders.js",
  "./csv-bulletin-folders-enforcer.js",
  "./csv-assets-dashboard.js",
  "./csv-media-stable.js",
  "./csv-chat-disabled.js",
  "./csv-feedback-benefits.js",
  "./csv-bulletin-ratings.js",
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
