const CACHE = "gx-vibe-v2";

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll([
        "/",
        "/styles.css",
        "/app.js",
        "/manifest.webmanifest"
      ])
    )
  );

  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE)
          .map(k => caches.delete(k))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);

  // Never intercept external video requests.
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request)
    )
  );
});