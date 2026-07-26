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

  /* ---------- Öffentliche Track-Funktion ---------- */
  MM.track = function (event, props) {
    bump(event);
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
    MM.track("pageview_" + file.replace(/\.html$/, "").replace(/[^a-z0-9_]/gi, "") || "index");
  }

  // Outbound- & CTA-Klicks automatisch erfassen (data-track="name")
  document.addEventListener("click", function (e) {
    const el = e.target.closest("[data-track]");
    if (el) MM.track(el.getAttribute("data-track"));
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pageView);
  else pageView();
})();
