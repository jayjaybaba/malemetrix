/* ==========================================================================
   MALEMETRIX INTELLIGENCE — ENGINE  (decision · review · strategic hint)
   --------------------------------------------------------------------------
   Owns MEANING, feeds MM.exec (execution). Reconciled to the ONE canonical
   ledger (MM.exec.addDecision / dueDecisions / closeDecision) — no competing
   ledger. Produces:
     · decide()        — Decision Engine: proposes a change with reason +
                         evidence + confidence + review date. PROPOSE only —
                         apply goes through confirm → MM.exec ledger.
     · weeklyReview()  — Weekly Intelligence Review over REAL data + memory.
     · strategicHint() — strategic priority the single NBA (buildDay) consumes.
     · Two first-class verdicts: WAITING_FOR_DATA · NOTHING_NEEDS_CHANGING.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var I = MM.intelligence = MM.intelligence || {};
  var S = {
    get: function (k, d) { try { return MM.store ? MM.store.get(k, d) : d; } catch (e) { return d; } },
    set: function (k, v) { try { if (MM.store) MM.store.set(k, v); } catch (e) {} }
  };
  function OS() { return MM.os; }
  function EX() { return MM.exec; }
  function EN() { return MM.engines; }
  function todayYmd() { return I.util.todayYmd(); }
  var CONF = I.util.CONF_RANK;

  /* ======================= WAITING FOR DATA ======================= */
  // Verhindert Optimierungs-Churn: eine Kalorien-/Trainings-Entscheidung
  // braucht ein Mindestmaß an frischer Evidenz. Sonst: KEEP + was fehlt.
  function dataReadiness(ctx, need) {
    // need: {weightPoints, waistPoint, adherenceDays}
    var missing = [];
    var wN = OS() ? OS().metricSeries("weight").length : 0;
    var na = ctx.signals.nutrition.value;
    if (need.weightPoints && wN < need.weightPoints) missing.push((need.weightPoints - wN) + " weitere Wiege-Werte");
    if (need.weightFresh && ctx.signals.weight.fresh < 0.3) missing.push("eine aktuelle Wiegung (der Trend ist veraltet)");
    if (need.waistPoint && (!ctx.signals.waist.value)) missing.push("eine Taillenmessung");
    if (need.adherenceDays && (!na || na.daysLogged < need.adherenceDays)) missing.push(((need.adherenceDays - (na ? na.daysLogged : 0)) + " weitere geloggte Ernährungstage"));
    return { ready: missing.length === 0, missing: missing };
  }
  I.dataReadiness = dataReadiness;

  /* ======================= DECISION ENGINE ======================= */
  // Liefert EINEN Entscheidungs-KANDIDATEN (oder KEEP / WAITING). Wendet
  // NICHTS an — Anwenden läuft über applyDecision() nach Bestätigung.
  function decide(ctx) {
    ctx = ctx || I.context();
    var bn = I.bottleneck(ctx);
    var contra = I.contradictions(ctx);
    var mode = ctx.goal.mode || "recomp";
    var np = S.get("os_nutrition_plan", null);

    // 1) EXECUTION FIRST — niedrige Adhärenz schlägt jede Feinjustierung
    var na = ctx.signals.nutrition.value;
    if (na && na.pct != null && na.daysLogged >= 3 && na.pct < 70) {
      return verdict("execution_first", "EXECUTION FIRST", "Die Umsetzung war diese Woche das Problem (" + na.pct + " % Protein-Adhärenz), nicht die Zielwerte. Erst konstant treffen, dann bewerten.", { domain: "nutrition", confidence: na != null ? ctx.signals.nutrition.confidence : "low", evidence: na }, contra, bn);
    }
    // 2) RECOVERY FIRST — Recovery-Engpass mit Evidenz
    if (bn.key === "recovery" && CONF[bn.confidence] >= CONF.medium) {
      return verdict("recovery_first", "RECOVERY FIRST", "Recovery ist gerade der limitierende Faktor (" + bn.why + "). Mehr Druck oder ein größeres Defizit wären kontraproduktiv — diese Woche Schlaf/Erholung priorisieren.", { domain: "recovery", confidence: bn.confidence, evidence: bn }, contra, bn);
    }
    // 3) NUTRITION-Anpassung — nur mit ausreichend frischen Daten
    if (np && (mode === "cut" || mode === "build" || mode === "recomp")) {
      var ready = dataReadiness(ctx, { weightPoints: 3, weightFresh: true, adherenceDays: 4 });
      if (!ready.ready) {
        return waiting("Kalorien-Ziel", ready.missing, "Bis dahin bleibt der Plan — keine Änderung auf dünner Datenbasis.");
      }
      var lw = OS() && OS().latestMetric ? OS().latestMetric("weight") : null;
      var wt = ctx.signals.weight.value, wa = ctx.signals.waist.value;
      var adj = EN().nutritionAdjust({
        mode: mode, weightKg: lw ? lw.value : null,
        weightTrend: wt ? wt.deltaPerWeek : null, waistTrend: wa ? wa.deltaPerWeek : null,
        adherencePct: na ? na.pct : null,
        energyLow: !!(ctx.signals.pulse.value && ctx.signals.pulse.value.energy <= 2),
        sleepBad: !!(ctx.signals.pulse.value && ctx.signals.pulse.value.sleep === "bad"),
        strengthStalled: !!(ctx.signals.strength.value && ctx.signals.strength.value.pct <= 0.5),
        kcalTarget: np.kcal
      });
      if (adj.code === "keep") return nothingNeedsChanging("Trend und Umsetzung passen zum Ziel. Der stärkste Hebel ist gerade Konstanz — nicht eine neue Zahl.", bn, contra);
      if (adj.code === "execution_first") return verdict("execution_first", adj.title, adj.text, { domain: "nutrition", confidence: ctx.signals.nutrition.confidence, evidence: na }, contra, bn);
      if (adj.code === "recovery_first") return verdict("recovery_first", adj.title, adj.text, { domain: "recovery", confidence: "medium", evidence: bn }, contra, bn);
      // konkrete kcal-Änderung als Kandidat
      return {
        verdict: "adjust", code: adj.code, title: adj.title, text: adj.text,
        proposal: { domain: "nutrition", field: "kcal", from: adj.oldKcal || np.kcal, to: adj.newKcal, reviewInDays: 14 },
        confidence: ctx.signals.weight.confidence, evidence: { weight: wt, waist: wa, adherence: na },
        contradictions: contra, bottleneck: bn, reassessInDays: 14,
        explain: buildExplain("Kalorien-Anpassung", adj.text, ctx, bn, 14)
      };
    }
    // 4) Default
    return nothingNeedsChanging("Keine belastbare Änderung fällig — Plan halten.", bn, contra);
  }

  function verdict(code, title, text, meta, contra, bn) {
    return { verdict: code, code: code, title: title, text: text, proposal: null, confidence: meta.confidence, evidence: meta.evidence, contradictions: contra || [], bottleneck: bn, reassessInDays: 7, explain: buildExplain(title, text, null, bn, 7) };
  }
  function waiting(topic, missing, tail) {
    return { verdict: "waiting_for_data", code: "waiting_for_data", title: "WARTE AUF DATEN", topic: topic, missing: missing, text: (topic + ": es fehlen noch " + missing.join(" · ") + ". " + (tail || "")), proposal: null, confidence: "low", contradictions: [], reassessInDays: 7 };
  }
  function nothingNeedsChanging(text, bn, contra) {
    return { verdict: "keep", code: "keep", title: "PLAN HALTEN", text: text, proposal: null, confidence: "medium", contradictions: contra || [], bottleneck: bn, reassessInDays: 7, explain: { why: text, notChange: ["Kalorien-Ziel", "Trainingsplan", "mehr Supplements"], reassess: "in 7 Tagen bzw. beim nächsten Weekly Pulse" } };
  }
  // Explainability (§15): WHY · SHOW ME THE DATA · WHAT NOT TO CHANGE · WHEN TO REASSESS
  function buildExplain(what, why, ctx, bn, days) {
    var data = [];
    if (ctx) {
      var s = ctx.signals;
      if (s.weight.value) data.push("Gewichtstrend: " + (s.weight.value.deltaPerWeek > 0 ? "+" : "") + s.weight.value.deltaPerWeek + " kg/Woche (Konfidenz " + s.weight.confidence + ")");
      if (s.waist.value) data.push("Taillentrend: " + (s.waist.value.deltaPerWeek > 0 ? "+" : "") + s.waist.value.deltaPerWeek + " cm/Woche");
      if (s.nutrition.value) data.push("Adhärenz: " + s.nutrition.value.proteinDays + "/" + s.nutrition.value.daysLogged + " Tage Proteinziel");
      if (s.strength.value) data.push("Kraft (e1RM): " + (s.strength.value.pct > 0 ? "+" : "") + s.strength.value.pct + " %");
    }
    return { what: what, why: why, data: data, notChange: ["Nicht mehrere Variablen gleichzeitig ändern", "Kein neues Supplement gegen ein Umsetzungsproblem"], reassess: "in " + days + " Tagen — vorher ist der Trend noch nicht belastbar", bottleneck: bn ? (bn.key + " (Konfidenz " + bn.confidence + ")") : null };
  }
  I.decide = decide;

  /* ======================= DECISION → CANONICAL LEDGER ======================= */
  // Anwenden NUR nach Bestätigung. Schreibt in DEN EINEN MM.exec-Ledger und
  // führt die eigentliche Domänen-Änderung durch (z. B. Nutrition-Ziel).
  function applyDecision(dec) {
    if (!dec || !dec.proposal) return { ok: false, reason: "no_proposal" };
    var pr = dec.proposal;
    var applied = null;
    if (pr.domain === "nutrition" && pr.field === "kcal") {
      var np = S.get("os_nutrition_plan", null);
      if (np) {
        np.kcal = pr.to; np.kcalRange = [pr.to - 150, pr.to + 150];
        np.carbs = Math.max(0, Math.round((pr.to - np.protein * 4 - np.fat * 9) / 4));
        S.set("os_nutrition_plan", np);
        applied = { kcal: pr.to };
      }
      // Anpassungshistorie (für Progress-Erklärung, §39)
      var hist = S.get("os_adjust_history", []) || [];
      hist.push({ date: todayYmd(), oldKcal: pr.from, newKcal: pr.to, reason: dec.code, evidence: "intelligence" });
      S.set("os_adjust_history", hist);
    }
    // EIN Ledger: MM.exec besitzt die Persistenz der Entscheidung
    var ledgerEntry = null;
    try {
      if (EX() && EX().addDecision) ledgerEntry = EX().addDecision({ domain: pr.domain, what: dec.title + (pr.field === "kcal" ? " (" + pr.from + " → " + pr.to + " kcal)" : ""), why: dec.text, reviewInDays: pr.reviewInDays || 14 });
    } catch (e) {}
    // Intelligence-Meta zur Ledger-Zeile (Bedeutung/Evidenz) — separat, referenziert per id
    if (ledgerEntry) {
      var meta = S.get("intel_decision_meta", {}) || {};
      meta[ledgerEntry.id] = { code: dec.code, confidence: dec.confidence, evidence: dec.evidence || null, oldState: pr.from, proposedState: pr.to, appliedState: applied, source: "intelligence" };
      S.set("intel_decision_meta", meta);
    }
    try { OS() && OS().emit && OS().emit("WEEKLY_REVIEW_COMPLETED", { decision: dec.code }); } catch (e) {}
    return { ok: true, applied: applied, ledger: ledgerEntry };
  }
  I.applyDecision = applyDecision;
  // Meaning-Layer über dem exec-Ledger: reichert Ledger-Zeilen mit Intelligenz an.
  I.decisionMeta = function (id) { var m = S.get("intel_decision_meta", {}) || {}; return m[id] || null; };
  // Decision-Follow-up (§22/§10): beim Review einer fälligen Entscheidung
  // Outcome bestimmen (KEEP/ADJUST/REVERT) aus dem, was seither passiert ist.
  function reviewDecision(ledgerEntry) {
    var meta = I.decisionMeta(ledgerEntry.id);
    var ctx = I.context();
    var wt = ctx.signals.weight.value;
    if (!meta || !meta.proposedState) return { outcome: "keep", text: "Keine messbare Zielgröße — Entscheidung als abgeschlossen markieren." };
    // Beispiel Nutrition: hat die Änderung den gewünschten Trend gebracht?
    if (meta.evidence && ctx.goal.mode === "cut") {
      if (wt && wt.deltaPerWeek < -0.2) return { outcome: "keep", text: "Die Anpassung wirkt — der Gewichtstrend liegt jetzt im Zielbereich. Beibehalten." };
      if (wt && wt.deltaPerWeek > -0.05) return { outcome: "adjust", text: "Der Trend steht weiter — die letzte Anpassung reichte nicht. Nächster kleiner Schritt statt großem Sprung." };
    }
    return { outcome: "keep", text: "Kein klares Gegensignal — Entscheidung beibehalten und weiter beobachten." };
  }
  I.reviewDecision = reviewDecision;

  /* ======================= WEEKLY INTELLIGENCE REVIEW ======================= */
  function weeklyReview(ymd) {
    ymd = ymd || todayYmd();
    var ctx = I.snapshot(ymd, true);   // merkt den Snapshot (Timeline)
    var bn = ctx.bottleneck;
    var dec = decide(ctx);
    var sections = {
      execution: execSection(ctx),
      body: bodySection(ctx),
      performance: perfSection(ctx),
      nutrition: nutriSection(ctx),
      recovery: recoverySection(ctx)
    };
    var primaryFocus = bn.key;
    var doNotChange = dec.verdict === "keep" || dec.verdict === "waiting_for_data"
      ? ["Kalorien-Ziel", "Trainingsplan"]
      : (dec.verdict === "execution_first" ? ["Kalorien senken", "neues Supplement", "Programm wechseln"] : ["mehrere Dinge gleichzeitig"]);
    return {
      date: ymd, sections: sections, verdict: dec, bottleneck: bn,
      primaryFocus: primaryFocus, doNotChange: doNotChange,
      nextReviewInDays: dec.reassessInDays || 7,
      contradictions: ctx.contradictions
    };
  }
  function execSection(ctx) {
    var t = ctx.execution;
    return { label: "EXECUTION", value: t.consistency28 != null ? t.consistency28 + " % (28 Tage)" : (ctx.program.consistency != null ? ctx.program.consistency + " %" : "—"), note: t.missedThisWeek ? (t.missedThisWeek + " verpasste Einheit(en) diese Woche") : "keine offenen Einheiten" };
  }
  function bodySection(ctx) {
    var w = ctx.signals.weight.value, wa = ctx.signals.waist.value;
    return { label: "BODY", value: (w ? (w.deltaPerWeek > 0 ? "+" : "") + w.deltaPerWeek + " kg/Wo" : "—") + (wa ? " · Taille " + (wa.deltaPerWeek > 0 ? "+" : "") + wa.deltaPerWeek + " cm/Wo" : ""), confidence: ctx.signals.weight.confidence, note: ctx.signals.weight.confidence === "low" || ctx.signals.weight.confidence === "none" ? "INSUFFICIENT DATA — mehr Messpunkte nötig" : "" };
  }
  function perfSection(ctx) {
    var s = ctx.signals.strength.value;
    return { label: "PERFORMANCE", value: s ? "Kraft " + (s.pct > 0 ? "+" : "") + s.pct + " % (e1RM Ø)" : "INSUFFICIENT DATA — keine Workout-Logs", confidence: ctx.signals.strength.confidence };
  }
  function nutriSection(ctx) {
    var n = ctx.signals.nutrition.value;
    return { label: "NUTRITION", value: n && n.daysLogged ? (n.proteinDays + "/" + n.daysLogged + " Tage Proteinziel" + (n.pct != null ? " (" + n.pct + " %)" : "")) : "kein Logging", confidence: ctx.signals.nutrition.confidence };
  }
  function recoverySection(ctx) {
    var p = ctx.signals.pulse.value;
    return { label: "RECOVERY", value: p ? ("Energie " + (p.energy || "—") + "/5 · Schlaf " + (p.sleep || "—")) : "kein Weekly Pulse", note: ctx.execution.overlayActive === "low_recovery" ? "Low-Recovery-Overlay aktiv" : "" };
  }
  I.weeklyReview = weeklyReview;

  /* ======================= STRATEGIC HINT → ONE NBA ======================= */
  // MM.exec.buildDay konsumiert das: Intelligence bestimmt STRATEGISCHE
  // Priorität (Engpass + Verdict), Execution bestimmt Machbarkeit (Timing).
  // Es entsteht GENAU EINE NBA — keine zwei konkurrierenden.
  function strategicHint(ymd) {
    var ctx = I.context(ymd);
    var bn = I.bottleneck(ctx);
    var dec = decide(ctx);
    // Empfehlung an die NBA: welcher Domain-Bonus, welche NOT-NOW-Ergänzung
    var boost = null, guard = null;
    if (dec.verdict === "recovery_first") { boost = "recovery"; guard = "hard_training"; }
    else if (dec.verdict === "execution_first") { boost = "consistency"; guard = "complexity"; }
    return {
      date: ctx.date, bottleneck: bn.key, bottleneckConfidence: bn.confidence, bottleneckWhy: bn.why,
      verdict: dec.verdict, verdictTitle: dec.title, verdictText: dec.text,
      boost: boost, guard: guard,
      decisionPending: dec.verdict === "adjust" ? { title: dec.title, text: dec.text } : null,
      notNow: dec.verdict === "execution_first" ? ["Kalorien weiter senken", "neues Supplement", "Programm wechseln"]
        : dec.verdict === "recovery_first" ? ["Progression erzwingen", "mehr Volumen", "mehr Cardio"]
          : bn.key === "recovery" ? ["Mehr Supplements", "Mehr Cardio-Volumen"] : ["Mehr gleichzeitig ändern"],
      confidence: dec.confidence
    };
  }
  I.strategicHint = strategicHint;
})();
