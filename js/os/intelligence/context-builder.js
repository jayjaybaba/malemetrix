/* ==========================================================================
   MALEMETRIX INTELLIGENCE — CONTEXT BUILDER  (MM.intelligence.buildContext)
   --------------------------------------------------------------------------
   EIN kanonisches Kontext-Paket für ALLE intelligenten Features. Kein Feature
   baut seinen Kontext selbst zusammen — sie lesen von hier. Nur Persistenz-
   Lesezugriff (Layer 1), plus Freshness/Confidence-Annotation.

   buildContext()   → vollständiges, maschinen- & menschenlesbares Paket.
   snapshot()       → verdichtete PERSONAL PERFORMANCE SNAPSHOT (§6).
   relevantContext(topic) → Kontext-Budgeting: nur relevante Domänen (§5).
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var I = MM.intelligence = MM.intelligence || {};
  var U = function () { return I.util; };
  function OS() { return MM.os; }
  function EN() { return MM.engines; }
  function LB() { return MM.labs; }
  function AC() { return MM.account; }
  function store() { return MM.store; }
  function get(k, d) { try { return store() ? store().get(k, d) : d; } catch (e) { return d; } }

  function num(v) { return (v == null || isNaN(parseFloat(v))) ? null : parseFloat(v); }

  /* ---------- BODY ---------- */
  function bodyContext() {
    var os = OS(); if (!os) return { available: false };
    var wLast = os.latestMetric("weight"), wFirst = os.firstMetric("weight");
    var waLast = os.latestMetric("waist"), waFirst = os.firstMetric("waist");
    var bf = os.latestMetric("bf_estimate");
    var wTrend = os.metricTrend("weight", 7);       // rollender 7-Tage-Trend
    var wTrend30 = os.metricTrend("weight", 15);
    var waTrend = os.metricTrend("waist", 14);
    var fr = I.freshnessFor("weight", wLast && wLast.date);
    var frWa = I.freshnessFor("waist", waLast && waLast.date);
    return {
      available: !!wLast,
      weight: wLast ? wLast.value : null, weightDate: wLast && wLast.date, weightFresh: fr,
      weightStart: wFirst ? wFirst.value : null,
      waist: waLast ? waLast.value : null, waistDate: waLast && waLast.date, waistFresh: frWa,
      waistStart: waFirst ? waFirst.value : null,
      bf: bf ? bf.value : null,
      weightTrend7: wTrend ? wTrend.delta : null,
      weightTrend15: wTrend30 ? wTrend30.delta : null,
      waistTrend14: waTrend ? waTrend.delta : null,
      weightDelta: (wLast && wFirst) ? U().round(wLast.value - wFirst.value, 1) : null,
      waistDelta: (waLast && waFirst) ? U().round(waLast.value - waFirst.value, 1) : null,
      points: os.metricSeries("weight").length
    };
  }

  /* ---------- TRAINING ---------- */
  function trainingContext() {
    var logs = get("os_workout_logs", {}) || {};
    var sessions = (logs._sessions || []);
    var lastSession = sessions.length ? sessions[sessions.length - 1] : null;
    // e1RM-Fortschritt je Übung (Epley) — dieselbe Definition wie Progress.
    var lifts = [];
    Object.keys(logs).forEach(function (ex) {
      if (ex === "_sessions") return;
      var h = logs[ex]; if (!Array.isArray(h) || h.length < 2) return;
      function best(e) { return (e.sets || []).reduce(function (m, s) { return Math.max(m, s.w * (1 + s.r / 30)); }, 0); }
      var a = best(h[0]), b = best(h[h.length - 1]);
      if (a > 0 && b > 0) lifts.push({ ex: ex, from: U().round(a, 0), to: U().round(b, 0), pct: U().round((b - a) / a * 100, 1), n: h.length, lastDate: h[h.length - 1].date });
    });
    var avgPct = lifts.length ? U().round(lifts.reduce(function (a, l) { return a + l.pct; }, 0) / lifts.length, 1) : null;
    var plan = get("os_training_plan", null);
    var fr = I.freshnessFor("workout", lastSession && lastSession.date);
    return {
      available: sessions.length > 0,
      sessions: sessions.length, lastDate: lastSession && lastSession.date, fresh: fr,
      lifts: lifts, avgE1rmPct: avgPct,
      daysPerWeek: plan ? plan.days : (get("c2_days", null) || []).length || null,
      hasPlan: !!plan
    };
  }

  /* ---------- NUTRITION ---------- */
  function nutritionContext() {
    var plan = get("os_nutrition_plan", null);
    // Adhärenz: aus Weekly Pulse (Programm) — echte Umsetzung, kein Wunschwert.
    var d = AC() ? AC().getDashboardState() : {};
    var prog = d.program || {};
    return {
      available: !!plan,
      kcal: plan ? plan.kcal : null, protein: plan ? plan.protein : null, carbs: plan ? plan.carbs : null, fat: plan ? plan.fat : null,
      kcalRange: plan ? plan.kcalRange : null,
      hasPlan: !!plan,
      adherencePct: (prog.active && !prog.notStarted) ? prog.consistency : null   // Programm-Adhärenz als Proxy
    };
  }

  /* ---------- RECOVERY ---------- */
  function recoveryContext() {
    var os = OS();
    var sleepH = os ? os.getP("recovery.sleepHours", null) : null;
    // letzter Weekly-Pulse-Input (Energie/Schlaf) als frischer Recovery-Marker.
    var pulses = get("c2_pulse", {}) || {};
    var lastPulse = null, lastWeek = null;
    Object.keys(pulses).sort(function (a, b) { return (+a) - (+b); }).forEach(function (w) { if (pulses[w] && pulses[w].inp) { lastPulse = pulses[w].inp; lastWeek = +w; } });
    return {
      available: sleepH != null || !!lastPulse,
      sleepHours: num(sleepH),
      lastEnergy: lastPulse && lastPulse.energy != null ? lastPulse.energy : null,
      lastSleepQuality: lastPulse ? lastPulse.sleep : null,
      pulseWeek: lastWeek
    };
  }

  /* ---------- STACK ---------- */
  function stackContext() {
    var st = get("os_stack", null);
    var labFlags = (LB() && LB().stackContext) ? LB().stackContext() : [];
    return {
      available: !!st,
      items: st && Array.isArray(st.items) ? st.items.map(function (i) { return i.name || i.id; }) : [],
      budget: st ? st.budget : null,
      labFlags: labFlags
    };
  }

  /* ---------- LABS ---------- */
  function labsContext() {
    var lb = LB(); if (!lb) return { available: false };
    var present = lb.markersPresent();
    if (!present.length) return { available: false, markers: 0 };
    var latestPanel = lb.panels().slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
    var fr = I.freshnessFor("labs", latestPanel && latestPanel.date);
    var prios = lb.priorities(3);
    var due = lb.dueRechecks();
    return {
      available: true, markers: present.length, lastPanelDate: latestPanel && latestPanel.date, fresh: fr,
      priorities: prios.map(function (p) { return { marker: p.marker_id, name: p.name, status: p.status, reason: p.reason, crit: !!(p.trend && p.trend.crit) }; }),
      rechecksDue: due.length,
      deltas: lb.progressDeltas ? lb.progressDeltas() : []
    };
  }

  /* ---------- ADHÄRENZ / EXECUTION ---------- */
  function executionContext(prog) {
    return {
      available: !!(prog && prog.active && !prog.notStarted),
      consistency: prog ? prog.consistency : null,
      activeDays: prog ? prog.active_days : null,
      week: prog ? prog.week : null, day: prog ? prog.day : null, phase: prog ? prog.phase : null
    };
  }

  /* ---------- MISSING DATA (was fehlt für bessere Entscheidungen) ---------- */
  function missingData(ctx) {
    var m = [];
    if (!ctx.body.available || ctx.body.weightFresh.state === "stale" || ctx.body.weightFresh.state === "missing") m.push({ key: "weight", label: "aktuelles Gewicht", impact: "high" });
    if (!ctx.body.waist || ctx.body.waistFresh.state === "stale" || ctx.body.waistFresh.state === "missing") m.push({ key: "waist", label: "aktuelle Taille", impact: "high" });
    if (!ctx.training.available || ctx.training.sessions < 2) m.push({ key: "workouts", label: "mehr geloggte Workouts (für Kraft-Trend)", impact: "medium" });
    if (!ctx.labs.available) m.push({ key: "labs", label: "Laborwerte (Biomarker-Kontext)", impact: "medium" });
    else if (ctx.labs.fresh.state === "stale") m.push({ key: "labs", label: "aktuelle Laborwerte (letzte sind veraltet)", impact: "medium" });
    if (ctx.recovery.sleepHours == null) m.push({ key: "sleep", label: "Schlafdaten", impact: "low" });
    return m;
  }

  /* ---------- HAUPTFUNKTION ---------- */
  function buildContext() {
    var os = OS(), ac = AC();
    var d = ac ? ac.getDashboardState() : {};
    var prog = d.program || {};
    var ctx = {
      builtAt: U().todayYmd(),
      identity: {
        name: d.name || "", age: os ? os.getP("identity.age", null) : null,
        sex: os ? os.getP("identity.sex", "male") : "male",
        height: os ? os.getP("identity.height", null) : null
      },
      pathway: os ? os.pathway() : "",
      goal: { mode: d.mode || "", bottleneck: d.bottleneck || "", bottleneckName: d.bottleneckName || "" },
      score: { has: !!d.hasScore, value: d.score },
      cycle: {
        active: !!(prog.active && !prog.notStarted && !prog.over),
        notStarted: !!prog.notStarted, over: !!prog.over,
        week: prog.week, day: prog.day, phase: prog.phase, consistency: prog.consistency,
        nextReviewDays: prog.nextReviewDays
      },
      baseline: os ? (os.baseline() || null) : null,
      contextMode: os ? os.contextMode() : "normal",
      body: bodyContext(),
      training: trainingContext(),
      nutrition: nutritionContext(),
      recovery: recoveryContext(),
      stack: stackContext(),
      labs: labsContext(),
      execution: executionContext(prog),
      access: d.access || {}
    };
    ctx.missing = missingData(ctx);
    return ctx;
  }

  /* ---------- SNAPSHOT (verdichtet, human + machine) §6 ---------- */
  var MODE = { cut: "CUT", recomp: "RECOMP", build: "BUILD", perform: "PERFORM" };
  var BN = { recovery: "Recovery", engine: "Engine", body: "Body", strength: "Strength", metabolic: "Metabolic", lifestyle: "Lifestyle", medical: "Medical Check", nutrition: "Nutrition", training: "Training", execution: "Execution", knowledge: "Plan-Klarheit" };
  var PHASE = { 1: "Build the Base", 2: "Build Capacity", 3: "Push Performance", 4: "Lock it in" };
  function snapshot(ctx) {
    ctx = ctx || buildContext();
    var b = ctx.body, t = ctx.training, n = ctx.nutrition, r = ctx.recovery;
    var rows = [];
    rows.push({ k: "GOAL", v: (MODE[ctx.goal.mode] || ctx.goal.mode || "—") + (ctx.pathway ? " · " + ctx.pathway.toUpperCase() : ""), sub: goalLine(ctx) });
    if (ctx.cycle.active) rows.push({ k: "PHASE", v: "Phase " + ctx.cycle.phase + " · " + (PHASE[ctx.cycle.phase] || "") + " · Woche " + ctx.cycle.week, sub: "" });
    if (b.available) rows.push({ k: "BODY", v: (b.weight != null ? b.weight + " kg" : "—") + (b.waist != null ? " · Taille " + b.waist + " cm" : ""), sub: b.weightFresh.label });
    var trendBits = [];
    if (b.weightTrend15 != null) trendBits.push("Gewicht " + (b.weightTrend15 > 0 ? "+" : "") + b.weightTrend15 + " kg");
    if (b.waistTrend14 != null) trendBits.push("Taille " + (b.waistTrend14 > 0 ? "+" : "") + b.waistTrend14 + " cm");
    if (trendBits.length) rows.push({ k: "TREND", v: trendBits.join(" · "), sub: "rollender Ø" });
    if (t.available) rows.push({ k: "TRAINING", v: (ctx.cycle.consistency != null ? ctx.cycle.consistency + "% Umsetzung" : t.sessions + " Sessions") + (t.avgE1rmPct != null ? " · Kraft " + (t.avgE1rmPct > 0 ? "+" : "") + t.avgE1rmPct + "%" : ""), sub: t.fresh.label });
    if (n.available) rows.push({ k: "NUTRITION", v: n.kcal + " kcal · " + n.protein + " g Protein", sub: n.adherencePct != null ? n.adherencePct + "% Adhärenz" : "" });
    if (r.available) rows.push({ k: "RECOVERY", v: (r.sleepHours != null ? r.sleepHours + " h Schlaf" : "—") + (r.lastEnergy != null ? " · Energie " + r.lastEnergy + "/5" : ""), sub: r.lastSleepQuality ? "Pulse: " + r.lastSleepQuality : "" });
    if (ctx.labs.available) rows.push({ k: "LABS", v: ctx.labs.markers + " Marker" + (ctx.labs.priorities.length ? " · " + ctx.labs.priorities.length + " Priorität(en)" : ""), sub: ctx.labs.fresh.label });
    rows.push({ k: "BOTTLENECK", v: BN[ctx.goal.bottleneck] || ctx.goal.bottleneck || "—", sub: "" });
    return { rows: rows, ctx: ctx };
  }
  function goalLine(ctx) {
    var mode = ctx.goal.mode;
    if (mode === "build") return "Muskel aufbauen, Taille im Rahmen halten.";
    if (mode === "cut") return "Fett verlieren, Kraft halten.";
    if (mode === "recomp") return "Rekomposition — schlanker bei gehaltener/steigender Kraft.";
    if (mode === "perform") return "Leistung maximieren.";
    return "Ziel noch nicht gesetzt.";
  }

  /* ---------- KONTEXT-BUDGETING / RELEVANZ (§5) ----------
     Für eine Frage/Domäne nur die relevanten Teile liefern — nicht die ganze
     Historie in jede (spätere) KI-Anfrage kippen. */
  var TOPIC_DOMAINS = {
    fatloss: ["body", "nutrition", "execution", "recovery", "training"],
    weight: ["body", "nutrition", "execution", "recovery"],
    strength: ["training", "body", "nutrition", "recovery", "execution"],
    plateau: ["training", "body", "nutrition", "recovery", "execution"],
    nutrition: ["nutrition", "body", "execution", "goal"],
    recovery: ["recovery", "training", "execution"],
    labs: ["labs", "stack", "body"],
    stack: ["stack", "labs", "goal"],
    focus: ["execution", "body", "training", "recovery", "labs"],
    change: ["body", "training", "nutrition", "labs", "execution"],
    general: ["goal", "cycle", "body", "training", "nutrition", "recovery", "labs", "execution"]
  };
  // grobe Themen-Klassifikation aus einer Frage (Layer-2 Keyword-Router).
  function classifyTopic(question) {
    var q = String(question || "").toLowerCase();
    if (/fett|abnehmen|lose fat|fat loss|definieren|schlank/.test(q)) return "fatloss";
    if (/gewicht|weight|waage|scale|plateau|stagn/.test(q)) return /bench|kraft|squat|drück|press|stärke|strength/.test(q) ? "strength" : "weight";
    if (/bench|bankdrücken|squat|kniebeuge|kraft|strength|stärker|progress|1rm|stall/.test(q)) return "strength";
    if (/protein|kalorien|calorie|essen|eat|nutrition|makro|surplus|deficit|defizit|mehr essen/.test(q)) return "nutrition";
    if (/schlaf|sleep|recovery|erholung|müde|stress|energie/.test(q)) return "recovery";
    if (/lab|blut|apob|ldl|hba1c|hormone|testosteron|marker|biomarker/.test(q)) return "labs";
    if (/stack|supplement|kreatin|vitamin|creatine/.test(q)) return "stack";
    if (/fokus|focus|priorit|woche|this week|next|wichtig/.test(q)) return "focus";
    if (/geändert|verändert|verändern|ver[äa]nderung|changed|change|letzten monat|last month|verlauf|fortschritt|progress/.test(q)) return "change";
    return "general";
  }
  function relevantContext(topicOrQuestion, fullCtx) {
    var ctx = fullCtx || buildContext();
    var topic = TOPIC_DOMAINS[topicOrQuestion] ? topicOrQuestion : classifyTopic(topicOrQuestion);
    var domains = TOPIC_DOMAINS[topic] || TOPIC_DOMAINS.general;
    var slim = { builtAt: ctx.builtAt, topic: topic, identity: ctx.identity, pathway: ctx.pathway, goal: ctx.goal, cycle: ctx.cycle, contextMode: ctx.contextMode };
    domains.forEach(function (dm) { if (ctx[dm] !== undefined) slim[dm] = ctx[dm]; });
    slim.missing = (ctx.missing || []).filter(function (m) { return domains.indexOf(m.key === "workouts" ? "training" : m.key === "sleep" ? "recovery" : m.key) >= 0 || domains.indexOf("body") >= 0; });
    return slim;
  }

  I.buildContext = buildContext;
  I.snapshot = snapshot;
  I.relevantContext = relevantContext;
  I.classifyTopic = classifyTopic;
  I.LABELS = { MODE: MODE, BN: BN, PHASE: PHASE };
})();
