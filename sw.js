/* Service worker for offline installability (see CLAUDE.md's PWA section).
   Lives at repo root, not under dist/, on purpose — a service worker's
   default scope is the directory it's served from, and this one needs to
   control the whole site (index.html, css/, dist/), not just dist/. */

// Bump this alongside APP_VERSION (js/app.js) whenever a shipped change is
// worth invalidating old caches for — there's no build-derived version here,
// same hand-bumped convention as APP_VERSION itself, and for the same reason
// (no build step ever generated one, and that's still true for this file).
const CACHE_NAME = "mila-cache-v2";

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/css/styles.css",
  "/dist/game.js",
  "/dist/icons/icon-192.png",
  "/dist/icons/icon-512.png",
  "/dist/icons/icon-180.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting(); // take over on next load rather than waiting for every tab to close
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* Stale-while-revalidate: serve from cache immediately when present (fast,
   works offline), while always refetching in the background to keep the
   cache fresh for next time. Cross-origin requests are left alone entirely.
   Same-origin /api/* requests are also left alone — sync/backup data must
   always hit the network live, never be served stale from a cache, and
   POST/DELETE aren't cacheable anyway. */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
