/* ==========================================================================
   MaleMetrix — Analytics (datenschutzfreundlich)
   Sendet Events an Plausible (cookielos, wenn konfiguriert) UND zählt sie
   immer lokal mit, damit du den Funnel auch ohne Anbieter sehen kannst:
   In der Browser-Konsole → MM.funnel()

   Conversion-Events (Funnel):
     score_start_click     Klick auf "Score starten" (Nav, Hero, Check-Intro)
     check_started         Score-Wizard nach Consent gestartet
     check_completed       Score abgeschlossen (props: score, bottleneck, archetype)
     cta_protokoll         Klick Richtung Protokoll-Verkaufsseite
     cta_stack_review      Klick Richtung Stack Review
     cta_founder           Klick Richtung Founder-Runde
     cta_termin            Klick Richtung Analysegespräch/Erstgespräch
     founder_apply_submit  Founder-Bewerbungsformular: Klick auf Absenden
     founder_apply_sent    Founder-Bewerbung übermittelt
     stack_review_submit   Stack-Review-Formular: Klick auf Absenden
     stack_review_sent     Stack-Review-Anfrage übermittelt (props: plan)
     booking_submitted     Terminanfrage übermittelt
     score_dm_click        Score-Einordnung per Instagram-DM angefragt
     score_mail_click      Score-Einordnung per E-Mail angefragt
     protokoll_unlocked    Protokoll-Ebook freigeschaltet
   Anbieter-Anbindung: MM_CONFIG.analytics.plausibleDomain setzen (Plausible)
   oder MM.track in dieser Datei um einen weiteren Adapter ergänzen.
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
