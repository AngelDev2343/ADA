// Static hosts (GitHub Pages, Live Server, etc.) can't set COOP/COEP headers,
// so this worker adds them to our own pages to make them cross-origin isolated.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).then((response) => {
      if (response.status === 0) return response;

      const headers = new Headers(response.headers);
      headers.set("Cross-Origin-Opener-Policy", "same-origin");
      headers.set("Cross-Origin-Embedder-Policy", "credentialless");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    })
  );
});
