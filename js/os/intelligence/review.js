/* ==========================================================================
   MALEMETRIX INTELLIGENCE — WEEKLY REVIEW + BRIEFING  (MM.intelligence.review)
   --------------------------------------------------------------------------
   Das Flaggschiff (§40–44): jede Woche synthetisiert MaleMetrix Execution,
   Body, Training, Nutrition, Recovery, Labs → Verdict + EIN primärer Fokus +
   „DO NOT CHANGE“ + nächster Review. Mit Review-Confidence.

   IMMUTABILITY (§43): ein erzeugter Review wird als Snapshot gespeichert und
   NICHT von späteren Daten überschrieben. Ein Review pro Programmwoche (§42).

   Zusätzlich: Morning Brief (§45) + Evening Close (§46) — 20-Sekunden-Formate.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var I = MM.intelligence = MM.intelligence || {};
  function store() { return MM.store; }
  function get(k, d) { try { return store() ? store().get(k, d) : d; } catch (e) { return d; } }
  function set(k, v) { try { if (store()) store().set(k, v); } catch (e) {} }
  function signed(v) { return v == null ? "—" : (v > 0 ? "+" : "") + I.util.round(v, 1); }

  function reviews() { var r = get("intel_reviews", []); return Array.isArray(r) ? r : []; }
  function saveReviews(r) { set("intel_reviews", r); }
  function reviewForWeek(week) { return reviews().filter(function (r) { return r.week === week; })[0] || null; }
  function latestReview() { var r = reviews(); return r.length ? r[r.length - 1] : null; }

  /* Review-Confidence (§44): wie belastbar ist die Wochenaussage? */
  function reviewConfidence(ctx) {
    var factors = [];
    var score = 0;
    // Wiegungen diese Woche (aus Metrik-Serie, grob).
    var weightPts = ctx.body.points || 0;
    if (weightPts >= 4) { score += 2; factors.push(weightPts + " Wiegungen"); } else if (weightPts >= 1) { score += 1; factors.push(weightPts + " Wiegung(en)"); } else factors.push("keine Wiegung");
    if (ctx.body.waist != null) { score += 1; factors.push("Taille erfasst"); } else factors.push("keine Taille");
    if (ctx.execution.consistency != null) { score += 1; factors.push("Umsetzung " + ctx.execution.consistency + "%"); }
    if (ctx.training.available) { score += 1; factors.push(ctx.training.sessions + " Sessions geloggt"); }
    var level = score >= 4 ? "high" : score >= 2 ? "medium" : "low";
    return I.confidence(level, "Review-Datenlage", factors);
  }

  /* Kern: einen Review für die aktuelle Programmwoche generieren. */
  function generate(ctx, opts) {
    opts = opts || {};
    ctx = ctx || I.buildContext();
    var week = ctx.cycle.week || 0;
    // Immutability: existiert bereits ein Review für diese Woche → zurückgeben (kein Rewrite).
    if (!opts.force) { var ex = reviewForWeek(week); if (ex) return ex; }

    var dec = I.decision.decide(ctx);
    var bn = dec.bottleneck;
    var confidence = reviewConfidence(ctx);
    var sections = [];
    sections.push({ key: "execution", label: "EXECUTION", value: ctx.execution.consistency != null ? ctx.execution.consistency + "%" : "—", tone: tone(ctx.execution.consistency, 80, 60) });
    sections.push({ key: "body", label: "BODY", value: (ctx.body.weightTrend15 != null ? "Gewicht " + signed(ctx.body.weightTrend15) + " kg" : (ctx.body.weight != null ? ctx.body.weight + " kg" : "—")) + (ctx.body.waistTrend14 != null ? " · Taille " + signed(ctx.body.waistTrend14) + " cm" : ""), tone: "neutral" });
    sections.push({ key: "training", label: "PERFORMANCE", value: ctx.training.avgE1rmPct != null ? "Kraft " + signed(ctx.training.avgE1rmPct) + "%" : (ctx.training.available ? ctx.training.sessions + " Sessions" : "—"), tone: ctx.training.avgE1rmPct != null ? (ctx.training.avgE1rmPct > 0 ? "good" : "neutral") : "neutral" });
    sections.push({ key: "nutrition", label: "NUTRITION", value: ctx.nutrition.hasPlan ? (ctx.nutrition.adherencePct != null ? ctx.nutrition.adherencePct + "% Adhärenz" : ctx.nutrition.kcal + " kcal Ziel") : "kein Plan", tone: "neutral" });
    sections.push({ key: "recovery", label: "RECOVERY", value: (ctx.recovery.sleepHours != null ? ctx.recovery.sleepHours + " h" : "—") + (ctx.recovery.lastEnergy != null ? " · Energie " + ctx.recovery.lastEnergy + "/5" : ""), tone: ctx.recovery.lastSleepQuality === "schlecht" ? "watch" : "neutral" });
    if (ctx.labs.available && (ctx.labs.priorities.length || ctx.labs.rechecksDue)) sections.push({ key: "labs", label: "LABS", value: ctx.labs.priorities.length ? ctx.labs.priorities[0].name + " beobachten" : ctx.labs.rechecksDue + " Recheck fällig", tone: "watch" });

    // Verdict aus der primären Entscheidung.
    var verdictMap = { keep: "KEEP PLAN.", change: "ANPASSEN — eine Variable.", watch: "BEOBACHTEN.", check: "ZUERST ABKLÄREN." };
    var verdict = verdictMap[dec.primary.type] || "KEEP PLAN.";
    var primaryFocus = focusFor(bn.domain, ctx);
    var doNotChange = doNotChangeList(ctx, dec);

    var review = {
      id: "review_w" + week + "_" + ctx.builtAt, week: week, date: ctx.builtAt, phase: ctx.cycle.phase,
      sections: sections, verdict: verdict, decisionType: dec.primary.type,
      decisionTitle: dec.primary.title, decisionReason: dec.primary.reason, evidence: dec.primary.evidence,
      primaryFocus: primaryFocus, doNotChange: doNotChange, bottleneck: bn.domain, bottleneckConfidence: bn.confidencePct,
      confidence: confidence, reviewInDays: 7, snapshot: I.snapshot(ctx).rows, immutable: true
    };
    // Persistieren (immutable snapshot) — nur wenn genügend Woche vergangen ODER erzwungen.
    if (opts.persist !== false && week > 0) {
      var all = reviews();
      if (!all.some(function (r) { return r.week === week; })) { all.push(review); if (all.length > 24) all = all.slice(-24); saveReviews(all); if (MM.os && MM.os.emit) MM.os.emit("WEEKLY_INTEL_REVIEW", { week: week }); }
    }
    return review;
  }
  function tone(v, good, bad) { if (v == null) return "neutral"; return v >= good ? "good" : v < bad ? "watch" : "neutral"; }
  function focusFor(dom, ctx) {
    var map = {
      recovery: "Schlaf-Konstanz.", execution: "Dranbleiben — Konstanz vor Optimierung.",
      nutrition: "Energie/Protein sauber treffen.", training: "Progression konsequent umsetzen.",
      body: "Taille im Blick behalten.", metabolic: "Auffälligen Laborwert beobachten.",
      medical: "Laborbefund ärztlich einordnen.", knowledge: "Plan schärfen (Pathway/Ziele)."
    };
    return map[dom] || "Kurs halten.";
  }
  function doNotChangeList(ctx, dec) {
    var out = [];
    if (dec.primary.domain !== "nutrition" && ctx.nutrition.hasPlan) out.push("Kalorien");
    if (dec.primary.domain !== "training") out.push("Trainings-Split");
    if (ctx.stack.available) out.push("Stack");
    return out.slice(0, 3);
  }

  /* Trigger: Review fällig? (§42) — Ende der Programmwoche & noch keiner da. */
  function reviewDue(ctx) {
    ctx = ctx || I.buildContext();
    if (!ctx.cycle.active) return false;
    var week = ctx.cycle.week;
    if (week < 1) return false;
    if (reviewForWeek(week)) return false;
    // „genug Woche vergangen“: ab Tag 5 der Programmwoche.
    var dayInWeek = ((ctx.cycle.day - 1) % 7) + 1;
    return dayInWeek >= 5;
  }

  /* ---------- Expected vs Actual (§60 / für Review-„Wow“) ---------- */
  function expectedVsActual(ctx) {
    ctx = ctx || I.buildContext();
    // Erwartungsband aus Modus + Trainingsalter (grobe, ehrliche Range je Woche).
    var mode = ctx.goal.mode;
    var weeklyExpected = mode === "build" ? [0.1, 0.35] : mode === "cut" ? [-0.9, -0.4] : mode === "recomp" ? [-0.2, 0.1] : [-0.1, 0.2];
    var actual = ctx.body.weightTrend15;   // Ø kg/Woche-Näherung
    var status = "unknown";
    if (actual != null) {
      if (actual < weeklyExpected[0]) status = mode === "cut" ? "ahead" : "behind";
      else if (actual > weeklyExpected[1]) status = mode === "cut" ? "behind" : "ahead";
      else status = "within";
    }
    return { expected: weeklyExpected, actual: actual, status: status, mode: mode };
  }

  /* ---------- MORNING BRIEF (§45) ---------- */
  function morningBrief(ctx) {
    ctx = ctx || I.buildContext();
    var lines = {};
    lines.header = ctx.cycle.active ? ("Woche " + ctx.cycle.week + " · Tag " + ctx.cycle.day) : "Kein aktiver Zyklus";
    // Heutiges Training aus NBA/todayActions.
    var acts = MM.os ? MM.os.todayActions() : [];
    var train = acts.filter(function (a) { return a.type === "program_day" || a.domain === "training"; })[0];
    lines.today = train ? train.label + (train.detail ? " · " + train.detail : "") : "Kein Pflichttraining heute.";
    lines.nutrition = ctx.nutrition.hasPlan ? (ctx.nutrition.kcal + " kcal · " + ctx.nutrition.protein + " g Protein") : "Kein Nutrition-Plan.";
    // Priorität = Bottleneck-Fokus.
    var bn = I.decision.bottleneck2(ctx);
    lines.priority = focusFor(bn.domain, ctx);
    // Watch: kritische/fällige Signale (labs) — sonst „nichts“.
    var watch = [];
    (ctx.labs.priorities || []).forEach(function (p) { if (p.crit) watch.push(p.name + " ärztlich prüfen"); });
    if (MM.labs && MM.labs.todaySignals) MM.labs.todaySignals().forEach(function (s) { if (s.type === "recheck_due") watch.push("Lab-Recheck fällig"); });
    if (ctx.recovery.lastSleepQuality === "schlecht") watch.push("Schlaf war zuletzt schwach");
    lines.watch = watch.length ? watch.join(" · ") : "Nichts.";
    return lines;
  }

  /* ---------- EVENING CLOSE (§46) ---------- */
  function eveningClose(ctx) {
    ctx = ctx || I.buildContext();
    var p = (MM.account ? MM.account.getDashboardState().program : {}) || {};
    return {
      training: MM.os && MM.os.isProgramDayDone && ctx.cycle.day ? (MM.os.isProgramDayDone(ctx.cycle.day) ? "erledigt" : "offen") : "—",
      proteinTarget: ctx.nutrition.protein,
      stepTarget: MM.os ? MM.os.getP("lifestyle.stepTarget", 8000) : 8000,
      sleepTarget: MM.os ? MM.os.getP("recovery.bedtime", "22:30") : "22:30"
    };
  }

  function _clearAll() { set("intel_reviews", []); }

  I.review = {
    generate: generate, reviewDue: reviewDue, reviews: reviews, reviewForWeek: reviewForWeek, latestReview: latestReview,
    reviewConfidence: reviewConfidence, expectedVsActual: expectedVsActual,
    morningBrief: morningBrief, eveningClose: eveningClose, _clearAll: _clearAll
  };
  try { if (MM.account && MM.account.registerStateDomain) MM.account.registerStateDomain("intelreviews", "intel_reviews", { append: true }); } catch (e) {}
})();
