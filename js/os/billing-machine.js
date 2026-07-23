/* ==========================================================================
   MALEMETRIX BILLING STATE MACHINE — MM.billing  (Phase 9, §11)
   --------------------------------------------------------------------------
   Deterministische Zustandsmaschine für Abo-Abrechnung. KEINE booleschen
   Flags verstreut — ein Zustand, explizite Übergänge, getestet. Out-of-order
   Webhooks dürfen den Zustand nicht korrumpieren (§12): jeder Übergang ist
   nur aus definierten Quell-Zuständen erlaubt; unbekannte/rückwärtige Events
   sind No-Ops statt Zustandsschäden.

   Diese Datei ist die EINZIGE Autorität für erlaubte Übergänge. Der
   serverseitige Webhook-Handler (mm-commerce) importiert dieselbe Tabelle,
   damit Client-Erwartung und Server-Verhalten nie auseinanderlaufen.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};

  var STATES = ["FREE", "TRIALING", "ACTIVE", "PAST_DUE", "GRACE", "CANCEL_AT_PERIOD_END", "CANCELLED", "EXPIRED", "REFUNDED"];

  // event → { from: [erlaubte Quellzustände], to: Zielzustand }
  // Nicht gelistete (event, from)-Kombinationen sind bewusst No-Ops.
  var TRANSITIONS = {
    "trial_started":        { from: ["FREE"], to: "TRIALING" },
    "subscription_created": { from: ["FREE", "TRIALING", "CANCELLED", "EXPIRED"], to: "ACTIVE" },
    "invoice_paid":         { from: ["TRIALING", "ACTIVE", "PAST_DUE", "GRACE", "CANCEL_AT_PERIOD_END"], to: null /* Zielzustand kontextabhängig, s.u. */ },
    "payment_failed":       { from: ["ACTIVE", "TRIALING"], to: "PAST_DUE" },
    "grace_entered":        { from: ["PAST_DUE"], to: "GRACE" },
    "cancel_at_period_end": { from: ["ACTIVE", "TRIALING", "PAST_DUE", "GRACE"], to: "CANCEL_AT_PERIOD_END" },
    "cancel_now":           { from: ["ACTIVE", "TRIALING", "PAST_DUE", "GRACE", "CANCEL_AT_PERIOD_END"], to: "CANCELLED" },
    "period_ended":         { from: ["CANCEL_AT_PERIOD_END", "GRACE", "PAST_DUE"], to: "EXPIRED" },
    "refunded":             { from: ["ACTIVE", "PAST_DUE", "GRACE", "CANCEL_AT_PERIOD_END", "CANCELLED"], to: "REFUNDED" },
    "reactivated":          { from: ["CANCELLED", "EXPIRED", "REFUNDED"], to: "ACTIVE" }
  };

  // invoice_paid heilt PAST_DUE/GRACE zurück zu ACTIVE; bei CANCEL_AT_PERIOD_END
  // bleibt der Nutzer bis Periodenende aktiv → CANCEL_AT_PERIOD_END bleibt.
  function paidTarget(from) {
    if (from === "CANCEL_AT_PERIOD_END") return "CANCEL_AT_PERIOD_END";
    return "ACTIVE";
  }

  // Reiner Übergang: (aktuellerZustand, event) → neuerZustand. Unerlaubt ⇒ gleich.
  function next(state, event) {
    if (STATES.indexOf(state) < 0) state = "FREE";
    var t = TRANSITIONS[event];
    if (!t) return state;                              // unbekanntes Event: No-Op
    if (t.from.indexOf(state) < 0) return state;       // out-of-order/rückwärts: No-Op
    if (event === "invoice_paid") return paidTarget(state);
    return t.to;
  }

  // Aktive, zahlende Nutzung (für Fähigkeits-Gating).
  function isLive(state) { return state === "ACTIVE" || state === "TRIALING" || state === "GRACE" || state === "CANCEL_AT_PERIOD_END"; }

  MM.billing = { STATES: STATES.slice(), next: next, isLive: isLive, transitions: TRANSITIONS };
})();
