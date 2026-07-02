/* ==========================================================================
   MaleMetrix — Affiliate-/Partner-Links
   --------------------------------------------------------------------------
   Links mit data-aff="key" bekommen automatisch den in config.js
   (MM_CONFIG.affiliate) hinterlegten Partnerlink. Ist keiner konfiguriert,
   bleibt das im HTML gesetzte neutrale href (Hersteller-Seite) stehen.
   Partnerlinks werden mit rel="sponsored" markiert (Google-Vorgabe) und
   Boxen mit data-aff-disclosure bekommen den Kennzeichnungs-Hinweis
   (rechtlich Pflicht: Werbekennzeichnung).
   ========================================================================== */

(function () {
  "use strict";
  var CFG = window.MM_CONFIG || {};
  var AFF = CFG.affiliate || {};

  function init() {
    var anyActive = false;

    document.querySelectorAll("a[data-aff]").forEach(function (a) {
      var key = a.getAttribute("data-aff");
      var url = AFF[key];
      a.target = "_blank";
      if (url) {
        a.href = url;
        a.rel = "sponsored noopener";
        anyActive = true;
        a.addEventListener("click", function () {
          if (window.MM && MM.track) MM.track("affiliate_click", { partner: key });
        });
      } else {
        a.rel = "noopener";
      }
    });

    // Kennzeichnung nur zeigen, wenn tatsächlich Partnerlinks aktiv sind
    document.querySelectorAll("[data-aff-disclosure]").forEach(function (el) {
      if (anyActive) {
        el.textContent = "* Partner-Link (Werbung): Kaufst du darüber, erhält MaleMetrix eine kleine Provision — der Preis für dich ändert sich nicht.";
      } else {
        el.style.display = "none";
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
