// ¡MUY IMPORTANTE! Sube la versión para forzar la actualización
const CACHE_NAME = "fire-v3-cache";

// Esta es tu lista de archivos.
// Si la instalación sigue fallando, es porque UN archivo de esta lista tiene
// un nombre o ruta incorrecta (revisa la consola F12 para ver el error 404).
const STATIC_ASSETS = [
  "fireboy-and-watergirl-forest-temple.min.js",
  "game.json",
  "icon-60x60.png",
  "index.html",
  "logo-512px.jpeg",
  "logo-512px.png",
  "main.min.js",
  "manifest.json",
  "version.js",
  "assets/atlasses/CharAssets.json",
  "assets/atlasses/CharAssets.png",
  "assets/atlasses/GroundAssets.json",
  "assets/atlasses/GroundAssets.png",
  "assets/atlasses/MechAssets.json",
  "assets/atlasses/MechAssets.png",
  "assets/atlasses/MenuAssets.json",
  "assets/atlasses/MenuAssets.png",
  "assets/atlasses/MenuBackgrounds.json",
  "assets/atlasses/MenuBackgrounds.png",
  "assets/atlasses/PopupAssets.json",
  "assets/atlasses/PopupAssets.png",
  "assets/atlasses/PreloaderAssets.json",
  "assets/atlasses/PreloaderAssets.png",
  "assets/atlasses/Temples/forest/TempleAssets.json",
  "assets/atlasses/Temples/forest/TempleAssets.png",
  "assets/audio/CharToggle1.mp3",
  "assets/audio/CharToggle2.mp3",
  "assets/audio/Clock.mp3",
  "assets/audio/Death.mp3",
  "assets/audio/Diamond.mp3",
  "assets/audio/Door.mp3",
  "assets/audio/EndDiamond.mp3",
  "assets/audio/EndFail.mp3",
  "assets/audio/EndPass.mp3",
  "assets/audio/Freeze.mp3",
  "assets/audio/IceSteps_fb.mp3",
  "assets/audio/IceSteps_wg.mp3",
  "assets/audio/Jump_fb.mp3",
  "assets/audio/Jump_wg.mp3",
  "assets/audio/LevelMusic.mp3",
  "assets/audio/LevelMusicFinish.mp3",
  "assets/audio/LevelMusicFinish_speed.mp3",
  "assets/audio/LevelMusicOver.mp3",
  "assets/audio/LevelMusic_dark.mp3",
  "assets/audio/LevelMusic_speed.mp3",
  "assets/audio/Lever.mp3",
  "assets/audio/LightPusher.mp3",
  "assets/audio/Melt.mp3",
  "assets/audio/MenuMusic.mp3",
  "assets/audio/Platform.mp3",
  "assets/audio/PortalClose.mp3",
  "assets/audio/PortalLoop.mp3",
  "assets/audio/PortalOpen.mp3",
  "assets/audio/PortalTransport.mp3",
  "assets/audio/Pusher.mp3",
  "assets/audio/Slider.mp3",
  "assets/audio/WaterSteps.mp3",
  "assets/audio/Wind.mp3",
  "assets/fonts/fbwg_font_cyrillic.fnt",
  "assets/fonts/fbwg_font_cyrillic.png",
  "assets/fonts/font.fnt",
  "assets/fonts/font.png",
  "assets/images/Beam.png",
  "assets/images/GameNameForest.png",
  "assets/images/TempleHallForest.jpg",
  "assets/images/TOASTER-MINI-new.png",
  "assets/images/branding/branding_logo_kizi.png",
  "assets/images/stores/android.png",
  "assets/images/stores/ios.png",
  "assets/images/stores/microsoft.png",
  "assets/images/stores/steam.png",
  "assets/tilemaps/tilesets/Chars.json",
  "assets/tilemaps/tilesets/Ground.json",
  "assets/tilemaps/tilesets/LargeObjects.json",
  "assets/tilemaps/tilesets/Objects.json",
  "bower_components/requirejs/require.js",
  "data/forest/temple.json",
  "data/forest/levels/forest_02.json",
  "data/forest/levels/forest_03.json",
  "data/forest/levels/forest_04.json",
  "data/forest/levels/forest_05.json",
  "data/forest/levels/forest_06.json",
  "data/forest/levels/forest_07.json",
  "data/forest/levels/forest_08.json",
  "data/forest/levels/forest_09.json",
  "data/forest/levels/forest_10.json",
  "data/forest/levels/forest_11.json",
  "data/forest/levels/forest_12.json",
  "data/forest/levels/forest_13.json",
  "data/forest/levels/forest_14.json",
  "data/forest/levels/forest_15.json",
  "data/forest/levels/forest_16.json",
  "data/forest/levels/forest_17.json",
  "data/forest/levels/forest_18.json",
  "data/forest/levels/forest_19.json",
  "data/forest/levels/forest_20.json",
  "data/forest/levels/forest_21.json",
  "data/forest/levels/forest_22.json",
  "data/forest/levels/forest_23.json",
  "data/forest/levels/forest_24.json",
  "data/forest/levels/forest_25.json",
  "data/forest/levels/forest_26.json",
  "data/forest/levels/forest_27.json",
  "data/forest/levels/forest_28.json",
  "data/forest/levels/forest_29.json",
  "data/forest/levels/forest_30.json",
  "data/forest/levels/forest_31.json",
  "data/forest/levels/forest_32.json",
  "data/tutorials/levels/forest_01.json",
  "img.gamedistribution.com/gamedistributionid-512x512.jpeg",
];

// ---------------------------
// Instalación
// ---------------------------
self.addEventListener("install", (event) => {
  console.log(`SW (${CACHE_NAME}): Evento install`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`SW (${CACHE_NAME}): Cacheando ${STATIC_ASSETS.length} archivos...`);
        // Si esto falla, revisa la consola para ver qué archivo dio error
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log(`SW (${CACHE_NAME}): ¡Archivos cacheados! Activando (skipWaiting)...`);
        return self.skipWaiting();
      })
      .catch(err => {
        console.error(`SW (${CACHE_NAME}): ¡FALLÓ cache.addAll()!`, err);
        console.error("SW: Revisa el error 404 de arriba. Ese archivo tiene un nombre o ruta incorrecta en la lista STATIC_ASSETS.");
      })
  );
});

// ---------------------------
// Activación y limpieza de caches antiguos
// ---------------------------
self.addEventListener("activate", (event) => {
  console.log(`SW (${CACHE_NAME}): Evento activate`);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log(`SW (${CACHE_NAME}): Eliminando caché antiguo: ${key}`);
            return caches.delete(key);
          }
          return null;
        })
      )
    ).then(() => {
      console.log(`SW (${CACHE_NAME}): Clientes reclamados.`);
      return self.clients.claim();
    })
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
    console.log(`SW: [Navigate] Buscando: ${request.url}`);
    event.respondWith(
      fetch(request) // 1. Intenta ir a la red
        .catch(() => {
          console.log(`SW: [Navigate] Red falló. Buscando en caché: ${request.url}`);
          // 2. Si falla, busca en caché (ignorando "?v=123")
          // CORREGIDO: Añadido { ignoreSearch: true }
          return caches.match(request, { ignoreSearch: true })
            .then(cachedResp => {
              if (cachedResp) {
                console.log(`SW: [Navigate] Sirviendo desde caché: ${request.url}`);
                return cachedResp;
              }
              // 3. Si no está, devuelve 'index.html' como última opción
              console.log(`SW: [Navigate] No se encontró. Devolviendo 'index.html'`);
              // CORREGIDO: Añadido { ignoreSearch: true }
              return caches.match('index.html', { ignoreSearch: true });
            });
        })
    );
    return;
  }
  
  // ---------------------------
  // Recursos estáticos: cache-first
  // ---------------------------
  event.respondWith(
    // 1. Busca en caché (ignorando "?v=123")
    // CORREGIDO: Añadido { ignoreSearch: true }
    caches.match(request, { ignoreSearch: true }).then(cachedResp => {
      
      // 1.1 Si está en caché, lo devuelve
      if (cachedResp) {
        // Descomenta la siguiente línea si quieres ver CADA archivo que se sirve:
        // console.log(`SW: [Static] Sirviendo desde caché: ${request.url}`);
        return cachedResp;
      }

      // 2. Si no está en caché, lo busca en la red
      console.log(`SW: [Static] Cache miss. Buscando en red: ${request.url}`);
      return fetch(request).then(networkResponse => {
        
        // 2.1 Clona la respuesta para poder guardarla Y devolverla
        const responseToCache = networkResponse.clone();
        
        // CORREGIDO: "op en" -> "open"
        caches.open(CACHE_NAME).then(cache => {
          console.log(`SW: [Static] Guardando en caché nuevo recurso: ${request.url}`);
          cache.put(request, responseToCache);
        });
        
        // 2.2 Devuelve la respuesta original de la red
        return networkResponse;
        
      }).catch(err => {
          console.warn(`SW: [Static] Fallo de red buscando: ${request.url}`, err);
          // Opcional: devolver una respuesta de fallback para imágenes/audio si falla
      });
    })
  );

});