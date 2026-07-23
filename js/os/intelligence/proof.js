/* ==========================================================================
   MALEMETRIX PROOF ENGINE — MM.intelligence.proof  (Phase 8, §27/§28)
   --------------------------------------------------------------------------
   Der Nutzer muss SEHEN, dass MaleMetrix etwas tut. Jedes gezeigte Muster ist
   aus echten Daten gerechnet und trägt eine ehrliche Evidenz-Klasse:

     OBSERVED    — reine Zählung/Messung deiner eigenen Daten
     ASSOCIATED  — zwei deiner Verläufe bewegen sich zusammen (keine Kausalität)
     LIKELY      — konsistent über mehrere Zyklen/Entscheidungen
     UNCERTAIN   — Hinweis vorhanden, Datenbasis dünn

   Kein Muster ohne Mindest-N. Lieber "noch nicht genug Daten" als eine
   erfundene Erkenntnis. Kausal-Sprache ist bewusst gedeckelt ("gefolgt von",
   nie "hat bewirkt").
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM || !MM.intelligence) return;
  var I = MM.intelligence;
  function S(k, d) { try { return MM.store.get(k, d); } catch (e) { return d; } }

  /* ---------- Entscheidungs-Outcomes (§28) ---------- */
  var VERDICT = {
    kept: { label: "BEHALTEN", cls: "good" },
    helped: { label: "HAT GEHOLFEN", cls: "good" },
    unclear: { label: "UNKLAR", cls: "watch" },
    no_effect: { label: "KEIN MESSBARER EFFEKT", cls: "watch" },
    reverted: { label: "ZURÜCKGENOMMEN", cls: "off" }
  };
  function outcomeOf(dec, resp) {
    // Verdikt konservativ ableiten: Review-Outcome des Nutzers hat Vorrang,
    // Response-Memory liefert die gemessene Beobachtung dazu.
    if (dec.status === "open") return { key: "open", label: "REVIEW AUSSTEHEND", cls: "watch" };
    var o = dec.outcome && (dec.outcome.key || dec.outcome);
    if (o === "reverted") return VERDICT.reverted;
    if (o === "kept" || o === "adjusted" || o === "keep") {
      if (resp && resp.observed) {
        var w = resp.observed.weightDelta;
        return (w != null) ? VERDICT.helped : VERDICT.kept;
      }
      return VERDICT.kept;
    }
    return VERDICT.unclear;
  }
  function outcomes() {
    var led = [], resp = [];
    try { led = I.memory.ledger(); resp = I.memory.responses(); } catch (e) {}
    return led.slice(-12).reverse().map(function (d) {
      var r = resp.filter(function (x) { return x.decision_id === d.id || ((x.intervention || {}).change === d.title && (x.intervention || {}).startDate === d.date); })[0] || null;
      var v = outcomeOf(d, r);
      return {
        id: d.id, what: d.title, domain: d.domain, date: d.date,
        from: d.old_state != null ? String(d.old_state) : null,
        to: d.new_state != null ? String(d.new_state) : null,
        expected: d.expected || null,
        observed: r && r.observed ? r.observed : null,
        verdict: v, status: d.status
      };
    });
  }

  /* ---------- Gelernte Muster (§27) — jeder Generator hat ein Mindest-N ---------- */
  function learned(ctx) {
    var out = [];
    try { ctx = ctx || I.buildContext(); } catch (e) { ctx = null; }

    // 1) Wochentags-Zuverlässigkeit — OBSERVED (reine Zählung).
    try {
      var er = I.foresight.executionRisk(ctx);
      var solid = er.windows.filter(function (w) { return w.planned >= 4; });
      if (solid.length >= 2) {
        var worst = solid[0], best = solid[solid.length - 1];
        if (worst.missRate >= 0.4 && best.missRate <= 0.2) {
          out.push({ cls: "OBSERVED", text: "Du setzt " + best.wdName + "-Einheiten deutlich zuverlässiger um als " + worst.wdName + " (" + Math.round((1 - best.missRate) * 100) + " % vs. " + Math.round((1 - worst.missRate) * 100) + " %).", basis: worst.planned + "+" + best.planned + " geplante Einheiten" });
        }
      }
    } catch (e) {}

    // 2) Entscheidungs-Antworten — ASSOCIATED ("gefolgt von", nie kausal).
    try {
      var resp = I.memory.responses().slice(-3);
      resp.forEach(function (r) {
        var iv = r.intervention || {};
        if (!r.observed || !iv.change) return;
        var obs = [];
        if (r.observed.weightDelta != null) obs.push("Gewicht " + (r.observed.weightDelta > 0 ? "+" : "") + r.observed.weightDelta + " kg");
        if (r.observed.waistDelta != null) obs.push("Taille " + (r.observed.waistDelta > 0 ? "+" : "") + r.observed.waistDelta + " cm");
        if (r.observed.strengthPct != null) obs.push("Kraft " + (r.observed.strengthPct > 0 ? "+" : "") + r.observed.strengthPct + " %");
        if (!obs.length) return;
        out.push({ cls: "ASSOCIATED", text: "Auf „" + iv.change + "“ folgte in deinem Verlauf: " + obs.join(" · ") + ".", basis: "Deine gemessene Reaktion" + (r.observed.windowDays ? " über " + r.observed.windowDays + " Tage" : "") });
      });
    } catch (e) {}

    // 3) Trajektorie im/außerhalb des Erwartungsbands — OBSERVED.
    try {
      var tr = I.foresight.trajectory(ctx);
      if (tr && tr.status === "WITHIN") out.push({ cls: "OBSERVED", text: "Dein Gewichtstrend liegt im Erwartungsband deines Modus — der Plan liefert, was er soll.", basis: tr.why });
      else if (tr && (tr.status === "BELOW" || tr.status === "ABOVE")) out.push({ cls: "OBSERVED", text: "Dein Gewichtstrend liegt " + (tr.status === "BELOW" ? "unter" : "über") + " dem Erwartungsband deines Modus.", basis: tr.why });
    } catch (e) {}

    // 4) Schlaf ↔ Umsetzung — nur mit genug Daten, ehrlich ASSOCIATED.
    try {
      var sleep = (MM.os ? MM.os.metricSeries("sleep") : []) || [];
      var sess = (S("os_workout_logs", {}) || {})._sessions || [];
      if (sleep.length >= 10 && sess.length >= 6) {
        var avg = sleep.reduce(function (a, x) { return a + x.value; }, 0) / sleep.length;
        var lowDays = {}; sleep.forEach(function (x) { if (x.value < avg - 0.75) lowDays[x.date] = true; });
        var nLow = Object.keys(lowDays).length;
        if (nLow >= 4) {
          var sessDates = {}; sess.forEach(function (s2) { sessDates[s2.date] = true; });
          var hitLow = Object.keys(lowDays).filter(function (dt) { return sessDates[dt]; }).length;
          var rateLow = hitLow / nLow;
          var rateAll = Math.min(1, sess.length / Math.max(1, sleep.length));
          if (rateAll - rateLow >= 0.25) {
            out.push({ cls: "ASSOCIATED", text: "An Tagen mit deutlich weniger Schlaf als dein Schnitt trainierst du seltener. Zusammenhang, keine bewiesene Ursache.", basis: nLow + " Kurz-Schlaf-Tage vs. " + sleep.length + " Schlaf-Einträge" });
          }
        }
      }
    } catch (e) {}

    // 5) Kalibrierung der Vorhersagen — erst ab mehreren aufgelösten Predictions.
    try {
      var cal = I.foresight.calibration();
      if (cal && cal.resolved >= 3 && cal.highRisk.n >= 2) {
        var rate = Math.round(cal.highRisk.occurred / cal.highRisk.n * 100);
        out.push({ cls: rate >= 60 ? "LIKELY" : "UNCERTAIN", text: "Von " + cal.highRisk.n + " Hochrisiko-Vorhersagen trafen " + cal.highRisk.occurred + " ein (" + rate + " %). MaleMetrix zeigt dir seine Trefferquote, statt sie zu verstecken.", basis: cal.resolved + " aufgelöste Vorhersagen im Prediction-Ledger" });
      }
    } catch (e) {}

    return out.slice(0, 5);   // Fokus statt Feed — maximal 5 Muster.
  }

  /* ---------- Was fehlt für mehr? (ehrlicher Leerzustand) ---------- */
  function missing() {
    var m = [];
    try {
      var resp = I.memory.responses(); var led = I.memory.ledger();
      var sess = (S("os_workout_logs", {}) || {})._sessions || [];
      var w = (MM.os ? MM.os.metricSeries("weight") : []) || [];
      if (w.length < 8) m.push("Regelmäßige Gewichts-Einträge (aktuell " + w.length + ")");
      if (sess.length < 4) m.push("Geloggte Trainings-Sessions (aktuell " + sess.length + ")");
      if (!led.length) m.push("Eine erste protokollierte System-Anpassung");
      else if (!resp.length) m.push("Ein abgeschlossenes Entscheidungs-Review (misst deine Reaktion)");
    } catch (e) {}
    return m;
  }

  I.proof = { learned: learned, outcomes: outcomes, missing: missing, VERDICT: VERDICT };
})();
