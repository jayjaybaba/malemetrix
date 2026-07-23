/* ==========================================================================
   MALEMETRIX ENTITLEMENTS — MM.entitlements  (Phase 9, §13/§11/§14)
   --------------------------------------------------------------------------
   EINE kanonische Fähigkeits-Schicht. Business-Logik fragt `can("FORESIGHT")`,
   NIE `if (plan === "pro")` — so bleibt Zugriffslogik an einem Ort.

   · Quelle der Wahrheit bleibt MM.account.getEntitlements() (server-vergeben,
     lokal nur nach Krypto-Beweis). Diese Datei ist eine reine Ableitung/Facade
     — kein zweiter Zustand, kein Client-Grant.
   · Billing-Zustand (§11) wird — sobald ein Provider konfiguriert ist — aus
     der Server-Subscription gelesen. Ohne Config: FREE bzw. LEGACY_LIFETIME
     (einmaliger Protokoll-Kauf). Kein erfundenes ACTIVE.
   · Grandfathering (§14): Herkunfts-Tags bleiben erhalten, alte Käufer werden
     nie still herabgestuft.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};

  // Fähigkeiten (§13) — was das Produkt kann, unabhängig von der Verpackung.
  var CAPS = ["PROGRAM", "TRACKING", "PROGRESS", "INTELLIGENCE", "ADVISOR", "FORESIGHT",
    "LABS_INTELLIGENCE", "SIMULATOR", "ADVANCED_STACK", "ENHANCED", "REPORTS", "COACHING"];

  // Entitlement → Fähigkeiten. PROTOKOLL (einmalig) schaltet heute das
  // Gesamtsystem frei (Phase-8-Positionierung: ein Kauf, ein System).
  // Eine spätere Intelligence-Subscription würde nur die laufenden
  // Fähigkeiten (FORESIGHT/REPORTS/ADVISOR) an ein aktives Abo binden — der
  // Schalter dafür ist SUBSCRIPTION_GATED unten, standardmäßig AUS (ehrlich).
  var GRANTS = {
    twelve_week: ["PROGRAM", "TRACKING", "PROGRESS"],
    protocol: ["PROGRAM", "TRACKING", "PROGRESS", "INTELLIGENCE", "ADVISOR", "FORESIGHT",
      "LABS_INTELLIGENCE", "SIMULATOR", "ADVANCED_STACK", "ENHANCED", "REPORTS"],
    advanced_library: ["LABS_INTELLIGENCE"],
    coaching: ["COACHING"],
    intelligence_sub: ["FORESIGHT", "ADVISOR", "REPORTS"]   // reserviert für spätere Abo-Stufe
  };
  // Solange kein Abo-Modell aktiv ist, sind diese Fähigkeiten NICHT abo-gebunden
  // (sie kommen aus dem Protokoll-Kauf). Wird erst true, wenn Model C/E gewählt
  // und ein Provider konfiguriert ist — dokumentiert in BUSINESS-MODEL.md.
  var SUBSCRIPTION_GATED = [];

  function ents() { try { return (MM.account && MM.account.getEntitlements) ? MM.account.getEntitlements() : []; } catch (e) { return []; } }

  function capsFor(list) {
    var set = {};
    (list || []).forEach(function (e) { (GRANTS[e] || []).forEach(function (c) { set[c] = true; }); });
    return set;
  }

  function billingState() {
    // Ehrlich: ohne konfigurierten Abo-Provider gibt es keine laufende
    // Abrechnung. Ein einmaliger Protokoll-Kauf = LEGACY_LIFETIME.
    var e = ents();
    var sub = null;
    try { sub = (MM.account.subscription && MM.account.subscription()) || null; } catch (x) {}
    if (sub && sub.state) return sub.state;                 // TRIALING/ACTIVE/PAST_DUE/GRACE/...
    if (e.indexOf("coaching") >= 0) return "COACHING";
    if (e.indexOf("protocol") >= 0 || e.indexOf("twelve_week") >= 0) return "LEGACY_LIFETIME";
    return "FREE";
  }

  function can(cap) {
    cap = String(cap || "").toUpperCase();
    if (CAPS.indexOf(cap) < 0) return false;
    var owned = capsFor(ents());
    if (!owned[cap]) return false;
    // Abo-gebundene Fähigkeiten erlöschen nur, wenn ein Abo existiert UND
    // nicht mehr zahlungsfähig ist — nie für Einmal-/Legacy-Käufer (§14/§61).
    if (SUBSCRIPTION_GATED.indexOf(cap) >= 0) {
      var st = billingState();
      var live = st === "ACTIVE" || st === "TRIALING" || st === "GRACE" || st === "LEGACY_LIFETIME" || st === "COACHING";
      return live;
    }
    return true;
  }

  // Herkunft einer Fähigkeit (für "Warum habe ich Zugriff?" / Grandfathering).
  function provenance() {
    var e = ents();
    var tag = e.indexOf("coaching") >= 0 ? "COACHING"
      : e.indexOf("protocol") >= 0 ? "LEGACY_LIFETIME"
      : e.indexOf("twelve_week") >= 0 ? "LEGACY_PROGRAM" : "FREE";
    return { tag: tag, entitlements: e.slice(), billingState: billingState() };
  }

  MM.entitlements = {
    CAPS: CAPS.slice(),
    can: can,
    billingState: billingState,
    provenance: provenance,
    // Für Views bequem: alle aktiven Fähigkeiten als Objekt.
    capabilities: function () { return capsFor(ents()); },
    // Test-/Doku-Hook: Ist eine Fähigkeit prinzipiell abo-gebunden?
    isSubscriptionGated: function (cap) { return SUBSCRIPTION_GATED.indexOf(String(cap || "").toUpperCase()) >= 0; }
  };
})();
