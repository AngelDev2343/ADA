const CACHE_NAME = "road-v1-cache";

const STATIC_ASSETS = [
  "index.html",
  "sw.js",
  "icons/icon192.png",
  "icons/icon512.png",
  "manifest.json",
];

// ---------------------------
// Instalación
// ---------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ---------------------------
// Activación y limpieza de caches antiguos
// ---------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        // Se elimina la referencia a API_CACHE, solo se conserva el caché principal
        keys.map(key => (key !== CACHE_NAME) ? caches.delete(key) : null)
      )
    ).then(() => self.clients.claim())
  );
});

// ---------------------------
// Fetch
// ---------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // ---------------------------
  // HTML navegación (modo offline)
  // ---------------------------
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(request)
          .then(cachedResp => {
            // Si la página específica no está, devuelve 'index.html' como fallback
            return cachedResp || caches.match('index.html'); 
          })
        )
    );
    return;
  }
  
  // ---------------------------
  // Recursos estáticos: cache-first
  // ---------------------------
  event.respondWith(
    caches.match(request).then(cachedResp => {
      // 1. Devuelve desde el caché si existe
      return cachedResp || fetch(request).then(networkResponse => {
        // 2. Si no está en caché, lo busca en la red y lo guarda
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});
