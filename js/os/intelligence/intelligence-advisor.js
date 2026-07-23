/* ==========================================================================
   MALEMETRIX INTELLIGENCE — ADVISOR · SIMULATOR · FORECAST · EXPERIMENTS ·
   PROTOCOL · TIMELINE · KNOWLEDGE
   --------------------------------------------------------------------------
   Everything here PROPOSES; applying always goes CONFIRM → MM.exec/ledger.
   The advisor is deterministic by default. An AI provider is a SEAM only —
   if none is registered, the deterministic advisor answers. No fake AI.
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
  function addDays(ymd, n) { var d = new Date(I.util.diffDays ? 0 : 0); var p = ymd.split("-"); var t = Date.UTC(+p[0], +p[1] - 1, +p[2]) + n * 86400000; var x = new Date(t); return x.getUTCFullYear() + "-" + String(x.getUTCMonth() + 1).padStart(2, "0") + "-" + String(x.getUTCDate()).padStart(2, "0"); }

  /* ======================= AI PROVIDER SEAM (no fake AI) ======================= */
  // Registriere einen echten Provider via I.setProvider({name, complete(prompt)}).
  // Ohne Provider bleibt alles deterministisch — es wird NIE ein KI-Text
  // vorgetäuscht.
  var _provider = null;
  I.setProvider = function (p) { _provider = (p && typeof p.complete === "function") ? p : null; };
  I.providerStatus = function () { return _provider ? { available: true, name: _provider.name || "custom" } : { available: false, name: null, note: "Kein KI-Provider konfiguriert — Advisor arbeitet deterministisch." }; };

  /* ======================= DETERMINISTIC ADVISOR ======================= */
  // Advisor-Contract: {answer, proposals[], explain}. Proposals sind
  // ausführbar (reschedule · nutrition_adjust · start_experiment ·
  // add_measurement · review_decision). Nichts mutiert still.
  function advise(question) {
    var ctx = I.context();
    var bn = I.bottleneck(ctx);
    var dec = I.decide(ctx);
    var proposals = [];
    var lines = [];

    // Kern-Antwort aus dem Verdict
    lines.push(dec.title + " — " + dec.text);
    if (bn.source === "dynamic") lines.push("Aktueller Engpass: " + bn.key.toUpperCase() + " (Konfidenz " + bn.confidence + "). " + bn.why);

    // Proposal aus einer anstehenden Anpassung
    if (dec.verdict === "adjust" && dec.proposal) {
      proposals.push({ type: "nutrition_adjust", title: dec.title, detail: dec.proposal.from + " → " + dec.proposal.to + " kcal", decision: dec });
    }
    // Verpasste Einheit → Reschedule-Proposal
    try {
      if (EX() && EX().missedThisWeek) {
        var missed = EX().missedThisWeek().filter(function (m) { return !m.handled; });
        if (missed.length) proposals.push({ type: "reschedule", title: "Verpasste Einheit einplanen", detail: "Diese Woche ist eine Kraft-Einheit offen.", deepLink: "#today" });
      }
    } catch (e) {}
    // Veraltete Messung → add_measurement
    var lw = OS() && OS().latestMetric ? OS().latestMetric("weight") : null;
    if (lw && I.util.diffDays(lw.date, todayYmd()) > 7) proposals.push({ type: "add_measurement", title: "Aktuelle Messung fehlt", detail: "Für belastbare Empfehlungen: Gewicht/Taille auffrischen.", deepLink: "#track" });
    // Fällige Entscheidung → review
    try { if (EX() && EX().dueDecisions) { var due = EX().dueDecisions(todayYmd()); if (due.length) proposals.push({ type: "review_decision", title: "Entscheidung prüfen", detail: due[0].what, decisionId: due[0].id }); } } catch (e) {}

    // NOT-NOW aus Verdict
    var notNow = dec.verdict === "execution_first" ? ["Kalorien senken", "neues Supplement"] : bn.key === "recovery" ? ["mehr Cardio", "Programm wechseln"] : ["mehrere Dinge gleichzeitig ändern"];

    var answer = lines.join(" ");
    // Provider-Seam: falls echt konfiguriert, darf er FORMULIEREN — aber die
    // Fakten/Proposals bleiben deterministisch. Ohne Provider: deterministisch.
    var det = { answer: answer, proposals: proposals, notNow: notNow, explain: dec.explain || null, confidence: dec.confidence, deterministic: true, verdict: dec.verdict };
    if (_provider) {
      try {
        var reworded = _provider.complete({ question: question, facts: { verdict: dec, bottleneck: bn }, style: "concise-de" });
        if (reworded && typeof reworded === "string") { det.answer = reworded; det.deterministic = false; }
      } catch (e) {}
    }
    return det;
  }
  // Proposal ausführen — nach Bestätigung.
  function execProposal(pr) {
    if (!pr) return { ok: false };
    if (pr.type === "nutrition_adjust" && pr.decision) return I.applyDecision(pr.decision);
    if (pr.type === "start_experiment") return { ok: true, experiment: startExperiment(pr.experiment) };
    if (pr.type === "review_decision") return { ok: true, review: pr.decisionId };
    return { ok: true, deferred: true };   // reschedule/add_measurement → UI-Deep-Link
  }
  I.advise = advise;
  I.execProposal = execProposal;

  /* ======================= SIMULATOR → EXECUTION ======================= */
  // WHAT IF +200 kcal? → Szenario mit Annahmen + Spannen → Proposal → Confirm
  // → Ledger → Ziel ändert sich → Review terminiert. Kein Dead-End-Demo.
  function simulate(scenario) {
    var ctx = I.context();
    var np = S.get("os_nutrition_plan", null);
    var lw = OS() && OS().latestMetric ? OS().latestMetric("weight") : null;
    var w = lw ? lw.value : (ctx.body.weightNow || 85);
    if (scenario.type === "kcal_delta") {
      var delta = scenario.delta || 0;
      // Energiebilanz-Heuristik: ~7700 kcal/kg; Spannen ehrlich breit,
      // weil individuelle Anpassung (NEAT/Wasser) stark streut.
      var perWeekKg = Math.round((delta * 7 / 7700) * 100) / 100;
      var lo = Math.round(perWeekKg * 0.5 * 100) / 100, hi = Math.round(perWeekKg * 1.3 * 100) / 100;
      var newK = (np ? np.kcal : 2500) + delta;
      return {
        type: "kcal_delta", assumptions: ["Energiebilanz ~7700 kcal/kg", "NEAT/Wasser variieren stark", "gleiche Aktivität/Training"],
        projected: { perWeekKg: perWeekKg, rangePerWeek: [Math.min(lo, hi), Math.max(lo, hi)], in4Weeks: [Math.round(Math.min(lo, hi) * 4 * 10) / 10, Math.round(Math.max(lo, hi) * 4 * 10) / 10] },
        newTarget: newK,
        proposal: { type: "nutrition_adjust", title: (delta > 0 ? "+" : "") + delta + " kcal", decision: { verdict: "adjust", code: "simulated", title: "Simulierte Anpassung", text: "Kalorien " + (np ? np.kcal : 2500) + " → " + newK + " (via Simulator).", proposal: { domain: "nutrition", field: "kcal", from: np ? np.kcal : 2500, to: newK, reviewInDays: 14 }, confidence: "low" } },
        caveat: "Spannen, keine Garantie. Nach ~2–3 Wochen am echten Trend prüfen."
      };
    }
    return { type: scenario.type, note: "Szenario nicht modelliert." };
  }
  I.simulate = simulate;

  /* ======================= FORECAST ======================= */
  // Projiziert den aktuellen Trend vorwärts — in SPANNEN, ehrlich.
  function forecast(weeks) {
    weeks = weeks || 8;
    var ctx = I.context();
    var w = ctx.signals.weight;
    if (!w.value || w.confidence === "none" || w.confidence === "low") return { available: false, reason: "insufficient_data", note: "Für eine belastbare Prognose fehlen frische Messpunkte." };
    var per = w.value.deltaPerWeek;
    var now = ctx.body.weightNow;
    var lo = Math.round((now + per * weeks * 0.6) * 10) / 10, hi = Math.round((now + per * weeks * 1.1) * 10) / 10;
    return { available: true, weeks: weeks, from: now, range: [Math.min(lo, hi), Math.max(lo, hi)], perWeek: per, confidence: w.confidence, note: "Fortschreibung des aktuellen Trends — reale Kurven sind nicht linear." };
  }
  I.forecast = forecast;

  /* ======================= EXPERIMENT ENGINE ======================= */
  function experiments() { var e = S.get("intel_experiments", []); return Array.isArray(e) ? e : []; }
  function startExperiment(exp) {
    var e = { id: "exp_" + todayYmd() + "_" + (exp.key || "x"), key: exp.key, title: exp.title, hypothesis: exp.hypothesis || "", metric: exp.metric, startDate: todayYmd(), reviewDate: addDays(todayYmd(), exp.days || 28), baseline: exp.baseline != null ? exp.baseline : null, status: "running", outcome: null };
    var all = experiments(); all.push(e); S.set("intel_experiments", all);
    try { OS() && OS().emit && OS().emit("STACK_UPDATED", { experiment: e.key }); } catch (ex) {}
    return e;
  }
  function reviewExperiment(id, currentValue) {
    var all = experiments(); var i = all.findIndex(function (x) { return x.id === id; });
    if (i < 0) return { ok: false };
    var e = all[i];
    var delta = (e.baseline != null && currentValue != null) ? Math.round((currentValue - e.baseline) * 100) / 100 : null;
    e.status = "done"; e.endValue = currentValue != null ? currentValue : null; e.delta = delta;
    e.outcome = delta == null ? "inconclusive" : (Math.abs(delta) < (e.minMeaningful || 0.5) ? "no_effect" : (delta > 0 ? "improved" : "worse"));
    all[i] = e; S.set("intel_experiments", all);
    return { ok: true, experiment: e };
  }
  I.experiments = experiments;
  I.startExperiment = startExperiment;
  I.reviewExperiment = reviewExperiment;

  /* ======================= PERSONAL PROTOCOL ======================= */
  // Der aktuelle "Betriebszustand": aktive Entscheidungen + Plan + laufende
  // Experimente + Engpass. Was gilt gerade für DICH — an einem Ort.
  function protocol() {
    var ctx = I.context();
    var bn = I.bottleneck(ctx);
    var np = S.get("os_nutrition_plan", null);
    var tp = S.get("os_training_plan", null);
    var stack = S.get("os_stack", null);
    var decs = []; try { decs = EX() && EX().decisions ? EX().decisions().filter(function (d) { return d.status === "open"; }) : []; } catch (e) {}
    return {
      date: ctx.date,
      bottleneck: bn,
      goal: ctx.goal.mode,
      nutrition: np ? { kcal: np.kcal, protein: np.protein } : null,
      training: tp ? { days: tp.days } : null,
      stack: stack && stack.items ? stack.items.map(function (i) { return i.name; }) : [],
      openDecisions: decs.map(function (d) { return { what: d.what, reviewDate: d.reviewDate }; }),
      experiments: experiments().filter(function (e) { return e.status === "running"; })
    };
  }
  I.protocol = protocol;

  /* ======================= TIMELINE ======================= */
  // Längsschnitt-Historie aus Memory-Snapshots + Ledger + Anpassungshistorie.
  function timeline() {
    var events = [];
    (I.memory.log()).forEach(function (m) { if (m.snapshot && m.snapshot.bottleneck) events.push({ date: m.date, type: "snapshot", text: "Engpass: " + m.snapshot.bottleneck.key + " (Konfidenz " + m.snapshot.bottleneck.confidence + ")" }); });
    (S.get("os_adjust_history", []) || []).forEach(function (a) { events.push({ date: a.date, type: "adjustment", text: "Kalorien " + a.oldKcal + " → " + a.newKcal + " (" + a.reason + ")" }); });
    try { (EX() && EX().decisions ? EX().decisions() : []).forEach(function (d) { events.push({ date: d.date, type: "decision", text: d.what }); }); } catch (e) {}
    experiments().forEach(function (e) { events.push({ date: e.startDate, type: "experiment", text: "Experiment: " + e.title + (e.outcome ? " → " + e.outcome : "") }); });
    events.sort(function (a, b) { return a.date < b.date ? 1 : -1; });   // neueste zuerst
    return events.slice(0, 60);
  }
  I.timeline = timeline;

  /* ======================= KNOWLEDGE ENGINE (foundation) ======================= */
  // Strukturierte MaleMetrix-Knowledge-Objects. KEINE erfundenen Zitate:
  // sources sind Metadaten (Fachgesellschaft/Leitlinien-Kategorie), keine Fake-DOIs.
  var KNOWLEDGE = [
    { id: "apob_primacy", title: "ApoB als kausaler Lipidmarker", domain: "cardiovascular", summary: "ApoB zählt atherogene Partikel und bildet das kardiovaskuläre Risiko oft besser ab als LDL-C allein.", claims: ["Trend über Zeit schlägt Einzelwert", "für Enhanced/TRT-Kontext besonders relevant"], evidenceLevel: "A", pathway: ["all"], relatedMarkers: ["apo_b", "ldl_c", "non_hdl", "lp_a"], relatedActions: ["labs", "stack"], sources: ["ESC/EAS Lipid-Leitlinien (Kategorie)"] },
    { id: "protein_target", title: "Proteinziel im Defizit", domain: "nutrition", summary: "Höhere Proteinzufuhr (~2,0–2,4 g/kg) schützt Muskulatur im Defizit und verbessert Sättigung.", claims: ["Muskelerhalt im Cut", "Sättigung"], evidenceLevel: "A", pathway: ["all"], relatedMarkers: [], relatedActions: ["nutrition"], sources: ["Sporternährungs-Reviews (Kategorie)"] },
    { id: "zone2_vo2", title: "Aerobe Basis & VO2max", domain: "engine", summary: "Cardiorespiratorische Fitness ist einer der stärksten Prädiktoren für Langzeitgesundheit.", claims: ["VO2max ↔ Mortalität", "Zone-2-Basis + gelegentliche Intensität"], evidenceLevel: "A", pathway: ["all"], relatedMarkers: [], relatedActions: ["training"], sources: ["Kardiologische Kohorten (Kategorie)"] },
    { id: "creatine_core", title: "Kreatin — Core-Supplement", domain: "stack", summary: "Am besten belegtes Supplement für Kraft/Muskelmasse; günstig, sicher.", claims: ["Kraft/Leistung", "Sicherheit gut belegt"], evidenceLevel: "A", pathway: ["all"], relatedMarkers: [], relatedActions: ["stack"], sources: ["Supplement-Metaanalysen (Kategorie)"] },
    { id: "hct_monitoring", title: "Hämatokrit unter Enhanced/TRT", domain: "labs", summary: "Steigender Hämatokrit erhöht Blutviskosität — Monitoring-Priorität, mit Blutdruck/Hydration lesen.", claims: ["Monitoring statt Substanzsteuerung", "keine automatische Dosierung"], evidenceLevel: "B", pathway: ["enhanced"], relatedMarkers: ["hematocrit", "hemoglobin"], relatedActions: ["labs"], sources: ["Endokrinologie-Leitlinien (Kategorie)"] },
    { id: "recovery_multiplier", title: "Schlaf als Multiplikator", domain: "recovery", summary: "Schlechter Schlaf drückt Insulinsensitivität, Hunger, Training und Hormone gleichzeitig.", claims: ["Recovery vor Volumen", "Schlaf priorisieren bei Stagnation"], evidenceLevel: "A", pathway: ["all"], relatedMarkers: [], relatedActions: ["recovery"], sources: ["Schlafforschung (Kategorie)"] }
  ];
  I.knowledge = { all: function () { return KNOWLEDGE; }, byId: function (id) { return KNOWLEDGE.find(function (k) { return k.id === id; }) || null; }, forDomain: function (d) { return KNOWLEDGE.filter(function (k) { return k.domain === d; }); }, forMarker: function (m) { return KNOWLEDGE.filter(function (k) { return (k.relatedMarkers || []).indexOf(m) >= 0; }); } };
})();
