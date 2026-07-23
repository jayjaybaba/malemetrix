/* ==========================================================================
   MaleMetrix Service Worker — PWA 2.0 (Phase 6)
   --------------------------------------------------------------------------
   · App-Shell offline: My MaleMetrix (OS), Tracker, Kalorien-Tracker.
   · Strategie: Network-first mit Cache-Fallback (frisch wenn online,
     letzte bekannte Version wenn offline). Bei Deploys VERSION erhöhen.
   · Navigation offline: Fallback auf die passende gecachte Seite —
     OS-Routen (mein-protokoll.html) fallen nie auf tracker.html zurück.
   · notificationclick: öffnet das EXAKTE Ziel (Deep-Link), nie die Homepage.
   · push: echter Handler — wird nur aktiv, wenn Server-Push konfiguriert ist
     (VAPID + Backend). Ohne Config passiert hier ehrlich: nichts.
   ========================================================================== */
const VERSION = "mm-v81";
const CORE = [
  "tracker.html", "dinner.html", "index.html", "mein-protokoll.html", "labor.html",
  "css/fonts.css", "css/style.css", "css/os.css", "css/labs.css",
  "js/config.js", "js/analytics.js", "js/i18n.js", "js/main.js",
  "js/vault.js", "js/check-data.js", "js/account.js",
  "js/os/program-view.js", "js/os/os-core.js", "js/os/engines.js", "js/os/execution.js", "js/os/app.js",
  "js/os/labs.js", "js/os/labs-data.js", "js/os/labs-app.js",
  "js/os/intelligence/intelligence-core.js", "js/os/intelligence/context-builder.js",
  "js/os/intelligence/memory.js", "js/os/intelligence/digital-twin.js",
  "js/os/intelligence/decision-engine.js", "js/os/intelligence/review.js",
  "js/os/intelligence/advisor.js", "js/os/intelligence/simulator.js",
  "js/os/intelligence/experiments.js", "js/os/intelligence/protocol.js",
  "js/os/intelligence/knowledge.js", "js/os/intelligence/foresight.js", "js/os/intelligence/ai.js",
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

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // externe Requests (PayPal, Supabase, API) nie anfassen

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
        caches.match(req, { ignoreSearch: true }).then((hit) => {
          if (hit) return hit;
          // Navigation offline: passende Shell statt falscher Seite.
          if (req.mode === "navigate") {
            const p = url.pathname;
            const fallback = p.indexOf("mein-protokoll") >= 0 ? "mein-protokoll.html"
              : p.indexOf("dinner") >= 0 ? "dinner.html"
              : p.indexOf("tracker") >= 0 ? "tracker.html"
              : "mein-protokoll.html";
            return caches.match(fallback, { ignoreSearch: true });
          }
          return undefined;
        })
      )
  );
});

/* ---- Notification → EXAKTE Aktion (Deep-Link), nie die Homepage ---- */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const deepLink = (e.notification.data && e.notification.data.deepLink) || "#today";
  const target = deepLink.indexOf(".html") >= 0 ? deepLink : "mein-protokoll.html" + deepLink;
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.indexOf("mein-protokoll") >= 0 && "focus" in c) {
          c.navigate(target).catch(() => {});
          return c.focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});

/* ---- Web Push (Server-seitig CONFIG REQUIRED — siehe PUSH.md) ----
   Dieser Handler ist echt und vollständig; er feuert nur, wenn ein Backend
   mit VAPID-Keys tatsächlich Push sendet. Payload-Kontrakt:
   { title, body, deepLink, tag, privacy } — bei privacy:"discreet" wird
   der Inhalt NICHT auf dem Sperrbildschirm gezeigt. */
self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) {}
  const discreet = data.privacy === "discreet";
  const title = discreet ? "MaleMetrix" : (data.title || "MaleMetrix");
  const body = discreet ? "Eine Aktion ist fällig." : (data.body || "");
  e.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      tag: data.tag || "mm-push",
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      data: { deepLink: data.deepLink || "#today" }
    })
  );
});
