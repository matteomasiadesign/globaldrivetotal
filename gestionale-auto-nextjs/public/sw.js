// Service worker minimale: rende l'app installabile e mette in cache
// solo gli asset statici (icone, manifest). Le pagine e i dati restano
// sempre presi dalla rete, perché il gestionale lavora con dati live
// da Supabase: non ha senso (né sarebbe sicuro) tenerli offline.

const CACHE_NAME = "gestionale-shell-v1";
const ASSET_DA_CACHARE = ["/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSET_DA_CACHARE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Solo per gli asset statici elencati sopra: cache-first.
  // Tutto il resto (pagine, chiamate API/Supabase) va sempre in rete.
  if (ASSET_DA_CACHARE.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
