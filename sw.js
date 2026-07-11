const CACHE_NAME = 'painel-csv-v6.1.0';

// Ficheiros que queremos guardar no dispositivo
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './login-ui.css',
  './csv-phase2.css',
  './csv-polish.css',
  './app.js',
  './login-ui.js',
  './csv-phase2.js',
  './csv-polish.js',
  './manifest.json',
  './logo.png'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Ativa o novo Service Worker imediatamente e limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames
        .filter(cacheName => cacheName !== CACHE_NAME)
        .map(cacheName => caches.delete(cacheName))
    ))
  );
  self.clients.claim();
});

// Estratégia: rede primeiro para arquivos do app (evita servir JS antigo)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone)).catch(err => console.warn('Falha ao salvar no cache:', err));
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request, {
          ignoreSearch: true
        });

        if (cachedResponse) {
          return cachedResponse;
        }

        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }

        return Response.error();
      })
  );
});
