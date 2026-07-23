/* ==========================================================================
   MALEMETRIX PERSONAL PERFORMANCE INTELLIGENCE — CORE  (MM.intelligence)
   --------------------------------------------------------------------------
   Die Intelligenz-Schicht ÜBER den Engines. Sie erfindet nie deterministische
   Wahrheit — sie liest sie, strukturiert sie, urteilt regelbasiert und erklärt.

   Drei-Schichten-Modell:
     LAYER 1  DETERMINISTIC TRUTH  — Gewicht, Programmtag, ApoB, Protein …
                                     kommt aus MM.os / MM.labs / MM.account.
                                     Wird NIE von der Intelligenz umgeschrieben.
     LAYER 2  RULE / DECISION      — Adhärenz-Urteil, Nutrition-Adjust, Plateau,
                                     Recheck, Progression, Bottleneck-Priorität.
                                     Deterministisch, testbar, erklärbar.
     LAYER 3  SYNTHESIS / LANGUAGE — Erklärung, Zusammenfassung, Vergleich,
                                     Antwort. Optional KI (Provider-Seam), mit
                                     deterministischem Fallback. Darf Layer 1/2
                                     nie still verändern.

   Dieses Core-Modul stellt Namespace + Hilfsfunktionen bereit:
     · Freshness  (fresh | aging | stale | missing) je Datum + Halbwertszeit.
     · Confidence (high | medium | low | none) aus Datenlage + Begründung.
     · Zahl/Datum-Utilities, geteilt von allen Intelligence-Modulen.
   Keine Business-Logik der Engines wird hier dupliziert.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var I = MM.intelligence = MM.intelligence || {};

  /* ---------- geteilte Utilities ---------- */
  function todayYmd() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function parseYmdUTC(s) { var p = String(s || "").split("-"); return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
  function daysBetween(a, b) { return Math.round((parseYmdUTC(b) - parseYmdUTC(a)) / 86400000); }
  function daysAgo(ymd) { if (!ymd) return null; return daysBetween(ymd, todayYmd()); }
  function round(v, dp) { if (v == null || isNaN(v)) return null; var f = Math.pow(10, dp == null ? 1 : dp); return Math.round(v * f) / f; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function pct(part, whole) { return whole ? Math.round(part / whole * 100) : 0; }

  /* ---------- FRESHNESS ----------
     Jede wichtige Größe kennt ihr Alter relativ zu einer Halbwertszeit (Tage).
     freshDays: bis dahin „fresh“. staleDays: ab dann „stale“. Dazwischen „aging“.
     Fehlt das Datum → „missing“. */
  function freshness(ymd, freshDays, staleDays) {
    if (!ymd) return { state: "missing", ageDays: null, label: "fehlt" };
    var age = daysAgo(ymd);
    if (age == null || age < 0) age = 0;
    var st = age <= (freshDays || 3) ? "fresh" : age >= (staleDays || 30) ? "stale" : "aging";
    var label = st === "fresh" ? (age <= 1 ? "heute/gestern" : "vor " + age + " Tagen") : st === "aging" ? "vor " + age + " Tagen" : "veraltet (" + (age >= 365 ? Math.round(age / 365 * 10) / 10 + " J." : Math.round(age / 30) + " Mon.") + ")";
    return { state: st, ageDays: age, label: label };
  }
  // Standard-Halbwertszeiten pro Domäne (Tage): body schnell, labs langsam.
  var FRESH_PROFILE = {
    weight: [3, 21], waist: [10, 45], bf_estimate: [30, 120],
    workout: [4, 21], nutrition: [3, 14], sleep: [3, 14],
    labs: [120, 270], score: [60, 210], pulse: [8, 28], photo: [30, 120]
  };
  function freshnessFor(domain, ymd) { var p = FRESH_PROFILE[domain] || [7, 30]; return freshness(ymd, p[0], p[1]); }

  /* ---------- CONFIDENCE ----------
     confidence(level, reason, factors) — strukturiertes „wie sicher“.
     level: high|medium|low|none. Wird aus Datenlage abgeleitet, nie geraten. */
  var CONF_RANK = { none: 0, low: 1, medium: 2, high: 3 };
  function confidence(level, reason, factors) {
    if (CONF_RANK[level] == null) level = "low";
    return { level: level, rank: CONF_RANK[level], reason: reason || "", factors: factors || [] };
  }
  // aus n Datenpunkten + Frische ableiten (generisch, für Twin-Domänen).
  function confidenceFromData(nPoints, freshState, opts) {
    opts = opts || {};
    var need = opts.needPoints || 3;
    if (!nPoints) return confidence("none", opts.missingReason || "Keine Daten in dieser Domäne.");
    if (freshState === "stale") return confidence("low", "Daten vorhanden, aber veraltet.");
    if (nPoints >= need && (freshState === "fresh" || freshState === "aging")) return confidence("high", nPoints + " Datenpunkte, aktuell genug.");
    if (nPoints >= Math.ceil(need / 2)) return confidence("medium", nPoints + " Datenpunkte — für einen belastbaren Trend etwas dünn.");
    return confidence("low", "Nur " + nPoints + " Datenpunkt(e) — noch keine belastbare Aussage.");
  }
  function minConfidence(a, b) { return (CONF_RANK[a.level] <= CONF_RANK[b.level]) ? a : b; }

  /* ---------- Trend-Richtung → Label ---------- */
  function dirLabel(delta, betterWhenDown) {
    if (delta == null) return "—";
    if (Math.abs(delta) < 1e-9) return "stabil";
    var up = delta > 0;
    return up ? "steigend" : "fallend";
  }

  I.util = {
    todayYmd: todayYmd, daysBetween: daysBetween, daysAgo: daysAgo, round: round, clamp: clamp, pct: pct, dirLabel: dirLabel
  };
  I.freshness = freshness;
  I.freshnessFor = freshnessFor;
  I.FRESH_PROFILE = FRESH_PROFILE;
  I.confidence = confidence;
  I.confidenceFromData = confidenceFromData;
  I.minConfidence = minConfidence;
  I.CONF_RANK = CONF_RANK;

  // Version der Intelligenz-Schicht (für Explainability/Reports).
  I.VERSION = "5.0";
})();
