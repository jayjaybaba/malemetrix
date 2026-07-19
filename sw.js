/* ==========================================================================
   MaleMetrix Service Worker — macht Tracker & Kalorien-Tracker offline nutzbar.
   Strategie: Network-first mit Cache-Fallback (frische Inhalte, wenn online;
   letzte bekannte Version, wenn offline). Bei neuen Deploys VERSION erhöhen.
   ========================================================================== */
const VERSION = "mm-v34";
const CORE = [
  "tracker.html", "dinner.html", "index.html",
  "css/fonts.css", "css/style.css",
  "js/config.js", "js/analytics.js", "js/i18n.js", "js/main.js",
  "js/tracker.js", "js/tracker-data.js",
  "js/food-db.js", "js/dinner.js",
  "js/shop-data.js",
  "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // externe Requests (PayPal, API) nie anfassen

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("tracker.html"))
      )
  );
});
