/* ==========================================================================
   MaleMetrix — Analytics (datenschutzfreundlich)
   Sendet Events an Plausible (cookielos, wenn konfiguriert) UND zählt sie
   immer lokal mit, damit du den Funnel auch ohne Anbieter sehen kannst:
   In der Browser-Konsole → MM.funnel()

   DER KAUF-TRICHTER — diese Kette entscheidet über den Umsatz. Sie ist so
   geordnet, wie ein Besucher sie durchläuft; jede Stufe zeigt, wo Menschen
   verloren gehen:

     score_start_click          Klick auf "Score starten" (Nav, Hero, Intro)
     check_started              Score-Wizard nach Consent gestartet
     check_completed            Score fertig (props: score, bottleneck, archetype)
     leadmagnet_signup          E-Mail am Score-Ende hinterlassen  ← Liste
     cta_protokoll              Klick Richtung Verkaufsseite
     protokoll_add_to_cart      In den Warenkorb gelegt
     checkout_started           Checkout geöffnet (props: value)
     checkout_stripe_redirect   Zur Bezahlseite weitergeleitet (Apple Pay/Karte)
     order_completed            Bestellung abgeschlossen (props: value, paid, method)
     protokoll_unlocked         Zugang tatsächlich benutzt

   Die drei wichtigsten Quotienten daraus:
     check_completed / check_started        → hält der Score die Leute?
     leadmagnet_signup / check_completed    → baust du eine Liste auf?
     order_completed / checkout_started     → bricht die Kasse ab?

   Daneben laufen rund 50 weitere Ereignisse (Tracker, Rechner, Programm,
   My MaleMetrix). Sie sind fürs Produktverständnis nützlich, aber nicht
   Teil des Kauf-Trichters.

   AKTIVIEREN: MM_CONFIG.analytics.plausibleDomain in js/config.js setzen.
   Ohne diesen Eintrag werden alle Ereignisse ausschließlich lokal im Browser
   des Besuchers gezählt und nie übertragen — du siehst dann nichts.
   ========================================================================== */

(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  const CFG = (window.MM_CONFIG || {}).analytics || {};

  /* ---------- Cloudflare Web Analytics (kostenlos, cookielos) ----------
     Zählt Seitenaufrufe, Herkunft und Geräte — KEINE eigenen Ereignisse.
     Die beantwortet unsere eigene site-telemetry weiter unten. */
  if (CFG.cloudflareToken) {
    const cf = document.createElement("script");
    cf.defer = true;
    cf.src = "https://static.cloudflareinsights.com/beacon.min.js";
    cf.setAttribute("data-cf-beacon", JSON.stringify({ token: CFG.cloudflareToken }));
    document.head.appendChild(cf);
  }

  /* ---------- Plausible laden (nur wenn Domain gesetzt) ---------- */
  if (CFG.plausibleDomain) {
    const s = document.createElement("script");
    s.defer = true;
    s.setAttribute("data-domain", CFG.plausibleDomain);
    s.src = CFG.plausibleSrc || "https://plausible.io/js/script.tagged-events.js";
    document.head.appendChild(s);
    // Plausible-Queue, falls Events vor dem Laden gefeuert werden
    window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
  }

  /* ---------- Lokaler Funnel-Zähler ---------- */
  function bump(event) {
    try {
      const key = "mm_funnel";
      const f = JSON.parse(localStorage.getItem(key) || "{}");
      f[event] = (f[event] || 0) + 1;
      f._updated = new Date().toISOString();
      localStorage.setItem(key, JSON.stringify(f));
    } catch (e) { /* Speicher voll/blockiert */ }
  }

  /* =========================================================================
     EIGENE NUTZUNGSMESSUNG (site-telemetry)
     -------------------------------------------------------------------------
     Schickt dieselben Ereignisse anonym an die eigene Edge Function, damit der
     Betreiber sie überhaupt sehen kann (Cloudflare kann keine eigenen
     Ereignisse). Datensparsam by design:
       · session_id = Zufallswert pro Browser-Sitzung (sessionStorage), nicht
         geräteübergreifend, keiner Person zuzuordnen.
       · Von der Herkunft wird NUR der Host gespeichert ("google.com"),
         niemals Pfad oder Query — dort stünden sonst Suchbegriffe.
       · Keine Cookies, keine IP-Speicherung, kein User-Agent-String.
     Gesendet wird gebündelt per sendBeacon (überlebt den Seitenwechsel und
     blockiert nie die Darstellung).
     ========================================================================= */
  const SB = (window.MM_CONFIG || {}).supabaseUrl || "";
  const TELE_ON = !!SB && CFG.siteTelemetry !== false;
  const TELE_URL = SB ? String(SB).replace(/\/+$/, "") + "/functions/v1/site-telemetry" : "";

  function hexId(bytes) {
    try {
      const a = new Uint8Array(bytes);
      crypto.getRandomValues(a);
      return Array.from(a, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    } catch (e) {
      // Fallback ohne WebCrypto — reicht für eine reine Sitzungs-Kennung.
      let s = "";
      while (s.length < bytes * 2) s += Math.floor(Math.random() * 16).toString(16);
      return s;
    }
  }
  function sessionId() {
    try {
      let s = sessionStorage.getItem("mm_sid");
      if (!s || !/^[a-f0-9]{8,64}$/.test(s)) { s = hexId(8); sessionStorage.setItem("mm_sid", s); }
      return s;
    } catch (e) { return hexId(8); }
  }
  function pageSlug() {
    const f = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "");
    const slug = (f || "index").toLowerCase().replace(/[^a-z0-9_-]/g, "");
    return slug.slice(0, 48) || "index";
  }
  function refHost() {
    try {
      if (!document.referrer) return null;
      const h = new URL(document.referrer).hostname.toLowerCase();
      if (!h || h === location.hostname) return null;         // interne Klicks zählen nicht als Quelle
      return /^[a-z0-9.-]{3,64}$/.test(h) ? h : null;
    } catch (e) { return null; }
  }
  function deviceClass() {
    const w = window.innerWidth || 1024;
    return w < 700 ? "mobile" : (w < 1100 ? "tablet" : "desktop");
  }

  let queue = [];
  let flushTimer = null;

  function flush() {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (!TELE_ON || !queue.length) return;
    const batch = queue.splice(0, 30);
    const payload = JSON.stringify({ events: batch });
    try {
      // text/plain vermeidet den CORS-Preflight; die Function liest den Body
      // bewusst als Text und parst selbst.
      if (navigator.sendBeacon) {
        navigator.sendBeacon(TELE_URL, new Blob([payload], { type: "text/plain;charset=UTF-8" }));
      } else {
        fetch(TELE_URL, { method: "POST", body: payload, keepalive: true, mode: "cors" }).catch(function () {});
      }
    } catch (e) { /* Messung darf die Seite nie stören */ }
  }

  function enqueue(event) {
    if (!TELE_ON) return;
    queue.push({
      event_id: hexId(8),
      session_id: sessionId(),
      event_name: String(event).toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 48),
      page: pageSlug(),
      ref_host: refHost(),
      device_class: deviceClass(),
      client_ts: new Date().toISOString()
    });
    if (queue.length >= 10) flush();
    else if (!flushTimer) flushTimer = setTimeout(flush, 4000);
  }

  if (TELE_ON) {
    // pagehide deckt auch iOS-Safari ab, wo "unload" unzuverlässig ist.
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", function () { if (document.hidden) flush(); });
  }

  /* ---------- Öffentliche Track-Funktion ---------- */
  MM.track = function (event, props) {
    bump(event);
    enqueue(event);
    try {
      if (window.plausible) window.plausible(event, props ? { props: props } : undefined);
    } catch (e) { /* noop */ }
  };

  /** Funnel im Browser ansehen: MM.funnel() */
  MM.funnel = function () {
    try { return JSON.parse(localStorage.getItem("mm_funnel") || "{}"); }
    catch (e) { return {}; }
  };

  /* ---------- Automatische Basis-Events ---------- */
  function pageView() {
    const file = (location.pathname.split("/").pop() || "index.html") || "index.html";
    // Lokaler Zähler bleibt seitenspezifisch (mm_funnel); an die eigene
    // Telemetrie geht EIN "pageview" — welche Seite es war, steht dort in der
    // Spalte `page` und lässt sich damit sauber aggregieren.
    bump("pageview_" + (file.replace(/\.html$/, "").replace(/[^a-z0-9_]/gi, "") || "index"));
    MM.track("pageview");
  }

  // Outbound- & CTA-Klicks automatisch erfassen (data-track="name")
  document.addEventListener("click", function (e) {
    const el = e.target.closest("[data-track]");
    if (el) MM.track(el.getAttribute("data-track"));
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pageView);
  else pageView();
})();
