/* ==========================================================================
   MALEMETRIX — INTELLIGENCE ↔ EXECUTION INTEGRATION (Grand Unification)
   Voller Stack: program-view + os-core + engines + labs + intelligence +
   execution. Testet die 10 Pflicht-Szenarien + Ledger-Vereinigung +
   longitudinale 12-Wochen-Invarianten (keine Zukunfts-Leakage).
   Ausführen:  node tools-dev/tests/integration.test.js
   ========================================================================== */
"use strict";
var path = require("path");
var ROOT = path.resolve(__dirname, "../..");

var FILES = ["js/os/program-view.js", "js/os/os-core.js", "js/os/engines.js", "js/os/labs-data.js", "js/os/labs.js",
  "js/os/intelligence/intelligence-core.js", "js/os/intelligence/context-builder.js", "js/os/intelligence/memory.js",
  "js/os/intelligence/digital-twin.js", "js/os/intelligence/decision-engine.js", "js/os/intelligence/review.js",
  "js/os/intelligence/advisor.js", "js/os/intelligence/simulator.js", "js/os/intelligence/experiments.js",
  "js/os/intelligence/protocol.js", "js/os/execution.js"];

function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function addD(base, n) { var d = new Date(base.getTime()); d.setDate(d.getDate() + n); return d; }
var NOW = new Date(); var TODAY = ymd(NOW);
function parseYmdUTC(s) { var p = s.split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
function diffDays(a, b) { return Math.round((parseYmdUTC(b) - parseYmdUTC(a)) / 86400000); }

function env(seed) {
  var store = {};
  global.localStorage = { getItem: function (k) { return k in store ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } };
  global.document = { dispatchEvent: function () { return true; }, addEventListener: function () {}, getElementById: function () { return null; }, createElement: function () { return { style: {} }; }, querySelector: function () { return null; }, querySelectorAll: function () { return []; } };
  global.CustomEvent = function (t, i) { this.type = t; this.detail = (i || {}).detail; };
  global.window = { addEventListener: function () {}, location: { hash: "", origin: "https://x" }, MM: {} };
  global.location = global.window.location;
  global.MM = global.window.MM;
  MM.store = {
    get: function (k, d) { try { var r = localStorage.getItem("mm_" + k); return r != null ? JSON.parse(r) : d; } catch (e) { return d; } },
    set: function (k, v) { localStorage.setItem("mm_" + k, JSON.stringify(v)); },
    remove: function (k) { localStorage.removeItem("mm_" + k); }
  };
  MM.toast = function () {}; MM.track = function () {};
  // Dashboard aus dem ECHTEN Store abgeleitet (wie account.js programView).
  MM.account = {
    registerStateDomain: function () {}, snapshot: function () { return { state: "local", configured: false }; },
    onChange: function () {}, whenReady: function () { return Promise.resolve(); }, getSyncStatus: function () { return "local"; },
    getDashboardState: function () {
      var S = MM.store;
      var start = S.get("c2_start", ""), g = S.get("c2_goal", "");
      var prog = { active: false };
      if (start && g) {
        var paused = S.get("c2_paused_days", 0) || 0;
        var ref = S.get("c2_pause_since", "") || TODAY;
        var notStarted = diffDays(start, TODAY) < 0;
        var pd = Math.max(1, Math.max(1, diffDays(start, ref) + 1) - paused);
        var clamped = Math.min(84, pd);
        var week = Math.min(12, Math.max(1, Math.ceil(clamped / 7)));
        var daily = S.get("c2_daily", {}) || {}, active = 0;
        for (var i = 1; i <= clamped; i++) { var rec = daily["d" + i] || {}; if (rec.p || rec.move || rec.recover) active++; }
        var pct = clamped ? Math.round(active / clamped * 100) : 0;
        prog = { active: true, notStarted: notStarted, over: pd > 84, mode: g, bottleneck: S.get("c2_bottleneck", ""), day: clamped, week: week, phase: week <= 3 ? 1 : week <= 6 ? 2 : week <= 9 ? 3 : 4, paused: false, consistency: pct, active_days: active, nextReviewDays: null };
      }
      return { name: "T", hasScore: true, score: 62, mode: g || "", bottleneck: S.get("c2_bottleneck", "") || "", bottleneckName: "", program: prog, sync: "local", access: { twelve_week: true, protocol: true, coaching: false, advanced_library: false } };
    }
  };
  FILES.forEach(function (f) { delete require.cache[require.resolve(path.join(ROOT, f))]; require(path.join(ROOT, f)); });
  if (seed) seed(MM);
  return MM;
}
/* Programm-Fixture: Start vor 9 Tagen → heute Tag 10 (Krafttag), Woche 2. */
function seedProgram(MM, opts) {
  opts = opts || {};
  var start = addD(NOW, -9); var startWd = start.getDay();
  MM.store.set("c2_start", ymd(start));
  MM.store.set("c2_goal", opts.mode || "recomp");
  MM.store.set("c2_bottleneck", opts.bottleneck || "body");
  MM.store.set("c2_days", [startWd, (startWd + 2) % 7, (startWd + 4) % 7].sort(function (a, b) { return a - b; }));
  MM.store.set("c2_pulse", opts.pulse || { 1: { inp: { energy: opts.energy != null ? opts.energy : 4, sleep: opts.sleepQ || "ok" }, verdict: {}, ts: TODAY } });
  MM.store.set("os_nutrition_plan", { kcal: 2800, kcalRange: [2650, 2950], protein: 190, fat: 80, carbs: 300 });
  MM.store.set("os_training_plan", { days: 3, location: "gym", priority: "balanced", sessions: [{ key: "A", name: "GK A", slots: [
    { ex: "squat", name: "Kniebeuge", sets: 3, reps: [6, 10], rir: "1–2", rest: "2–3 min", rule: "double_progression" },
    { ex: "bench", name: "Bankdrücken", sets: 3, reps: [6, 10], rir: "1–2", rest: "2–3 min", rule: "double_progression" },
    { ex: "row", name: "Rudern", sets: 3, reps: [8, 12], rir: "1–2", rest: "90 s", rule: "double_progression" },
    { ex: "lateral", name: "Seitheben", sets: 2, reps: [10, 15], rir: "0–1", rest: "90 s", rule: "double_progression" }] }] });
  // Erledigte Krafttage (für Konsistenz), Tag 8 optional verpasst.
  var daily = {};
  for (var pd = 1; pd < 10; pd++) {
    var isStr = MM.programView.dayTypeAt(pd) === "strength";
    if (isStr && !(opts.missPd && opts.missPd === pd)) daily["d" + pd] = { p: true };
    else if (!isStr) daily["d" + pd] = { move: true };
  }
  MM.store.set("c2_daily", daily);
}
function seedWeights(MM, from, perDay, days) {
  for (var i = 0; i < days; i++) { var dt = addD(NOW, -(days - 1 - i)); MM.os.logMetric("weight", Math.round((from + perDay * i) * 10) / 10, "kg", ymd(dt)); }
}
function seedWorkoutLogs(MM, stalled) {
  var logs = { _sessions: [] };
  ["bench", "squat", "row"].forEach(function (ex) {
    logs[ex] = [];
    for (var i = 0; i < 4; i++) {
      var w = stalled ? 80 : 80 + i * 2.5;
      logs[ex].push({ date: ymd(addD(NOW, -(21 - i * 6))), sets: [{ w: w, r: 8 }, { w: w, r: 8 }, { w: w, r: 8 }] });
      logs._sessions.push({ date: ymd(addD(NOW, -(21 - i * 6))), key: "A" });
    }
  });
  MM.store.set("os_workout_logs", logs);
}

var passed = 0, failed = 0, cur = "";
function group(g) { cur = g; console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

/* ================= LEDGER-VEREINIGUNG (§7/§96) ================= */
group("Ledger: EIN kanonischer Store, Migration, Fassade");
(function () {
  var MM = env(function (MM) {
    seedProgram(MM, {});
    // Alt-Phase-6-Entscheidungen (Legacy-Store) vor der Vereinigung:
    MM.store.set("os_decisions", [
      { id: "leg1", domain: "nutrition", what: "Kalorien +150", why: "Trend zu langsam", date: "2026-07-01", reviewDate: "2026-07-15", status: "open" },
      { id: "leg2", domain: "training", what: "Deload W4", why: "", date: "2026-06-01", reviewDate: "2026-06-15", status: "kept", outcomeNote: "hat gepasst", closedAt: "2026-06-15" }
    ]);
  });
  var all = MM.exec.decisions();
  ok(all.length === 2, "Legacy-Entscheidungen migriert (" + all.length + "/2)");
  var intelLedger = MM.intelligence.memory.ledger();
  ok(intelLedger.length === 2, "Kanonischer Store ist intel_decisions (" + intelLedger.length + " Einträge)");
  ok(intelLedger.every(function (d) { return d.legacy_id; }), "Migrierte Einträge tragen legacy_id (idempotent)");
  MM.exec.decisions(); MM.exec.decisions();
  ok(MM.intelligence.memory.ledger().length === 2, "Mehrfacher Zugriff dupliziert nichts");
  var due = MM.exec.dueDecisions(TODAY);
  ok(due.length === 1 && due[0].what === "Kalorien +150", "Fällige Review kommt aus dem kanonischen Ledger");
  MM.exec.closeDecision(due[0].id, "kept", "Gewicht reagiert");
  ok(MM.exec.dueDecisions(TODAY).length === 0, "Schließen wirkt im kanonischen Ledger");
  var closed = MM.intelligence.memory.getDecision(due[0].id);
  ok(closed.status === "reviewed" && closed.outcome.verdict === "kept", "Outcome im Intelligence-Ledger dokumentiert");
  ok(MM.intelligence.memory.responses().length >= 1, "Response Memory beim Review-Schließen erzeugt");
  var neu = MM.exec.addDecision({ domain: "nutrition", what: "Test", reviewInDays: 5 });
  ok(MM.intelligence.memory.getDecision(neu.id) != null, "addDecision schreibt NUR in den kanonischen Ledger");
  ok((MM.store.get("os_decisions", []) || []).length === 2, "Legacy-Store wächst nie weiter (eingefroren)");
})();

/* ================= S1 — RECOMP LÄUFT: KEEP, nichts erfinden ================= */
group("S1 · Recomp läuft → KEEP PLAN, kein künstlicher Vorschlag");
(function () {
  var MM = env(function (MM) {
    seedProgram(MM, { mode: "recomp" });
    seedWeights(MM, 84.0, 0, 21);                       // Gewicht stabil
    MM.os.logMetric("waist", 92, "cm", ymd(addD(NOW, -20)));
    MM.os.logMetric("waist", 91.2, "cm", ymd(addD(NOW, -10)));
    MM.os.logMetric("waist", 90.6, "cm", ymd(addD(NOW, -1)));   // Taille runter
    seedWorkoutLogs(MM, false);                          // Kraft steigt
  });
  var day = MM.exec.buildDay();
  ok(day.proposal == null, "Kein Änderungs-Vorschlag");
  ok(day.intelVerdict === "KEEP", "Intelligence-Verdict: KEEP");
  ok(day.nba.primary && (day.nba.primary.type === "workout" || day.nba.primary.type === "pulse_due"), "NBA bleibt Ausführung, keine Anpassung");
  var dec = MM.intelligence.decision.decide();
  ok(dec.primary.type === "keep", "decide(): keep");
})();

/* ================= S2 — BUILD-STALL: Vorschlag → Bestätigen → Anwenden → Ledger → Review ================= */
group("S2 · Build-Plateau → Proposal → Apply → Ledger → Review terminiert");
(function () {
  var MM = env(function (MM) {
    seedProgram(MM, { mode: "build" });
    seedWeights(MM, 82.0, 0, 24);                        // 3+ Wochen flach
    seedWorkoutLogs(MM, true);                           // Kraft stagniert
  });
  var day = MM.exec.buildDay();
  ok(day.proposal != null && day.proposal.domain === "nutrition", "Kalorien-Vorschlag erscheint");
  ok(day.proposal.code === "adjust_up" && day.proposal.newKcal > 2800, "Deterministisch aus der Engine (+~6% → " + day.proposal.newKcal + ")");
  ok(day.proposal.oneVariable, "One-Variable-Prinzip markiert");
  var before = MM.store.get("os_nutrition_plan", null).kcal;
  var dec = MM.exec.applyProposal(day.proposal);
  var after = MM.store.get("os_nutrition_plan", null).kcal;
  ok(after === day.proposal.newKcal && after > before, "Execution wendet NUR nach Bestätigung an (" + before + " → " + after + ")");
  var led = MM.intelligence.memory.getDecision(dec.id);
  ok(led && led.old_state === before + " kcal" && led.applied_state === after + " kcal", "Ledger: old/new/applied dokumentiert");
  ok(led.review_date && diffDays(TODAY, led.review_date) === 14, "Review in 14 Tagen terminiert");
  var day2 = MM.exec.buildDay();
  ok(day2.proposal == null, "Kein Doppel-Vorschlag, solange Entscheidung offen ist");
})();

/* ================= S3 — SCHLECHTER SCHLAF + 30 MIN: EIN kohärentes Ergebnis ================= */
group("S3 · Schlechter Schlaf + 30 Minuten → EIN Ergebnis, kein Widerspruch");
(function () {
  var MM = env(function (MM) {
    seedProgram(MM, { mode: "build", pulse: { 1: { inp: { energy: 2, sleep: "schlecht" }, verdict: {}, ts: TODAY } } });
    MM.os.setP("recovery.sleepHours", 5.5);
    seedWeights(MM, 82, 0.02, 14);
  });
  var prop = MM.exec.proposeDayChange("less_time", { minutes: 30 });
  prop.apply();
  MM.exec.startOverlay({ mode: "low_recovery", start: TODAY, end: TODAY, reason: "slept_badly" });
  var day = MM.exec.buildDay();
  ok(day.session && day.session.estMin <= 36, "Session auf ~30 min komprimiert (" + day.session.estMin + " min)");
  ok(day.nba.primary && day.nba.primary.type === "workout", "EINE primäre Aktion (Training, angepasst)");
  ok(day.nba.why.some(function (w) { return /Recovery|Ziel|Bestwerte/i.test(w); }), "WARUM nennt Recovery-Schonung");
  var bn = MM.intelligence.decision.bottleneck2();
  ok(bn.domain === "recovery", "Intelligence: Recovery ist Limiter");
  ok(day.notNow.length > 0 && !day.proposal, "Kein widersprüchlicher Zusatz-Vorschlag am selben Tag");
})();

/* ================= S4 — LOW ADHERENCE: EXECUTION FIRST ================= */
group("S4 · Niedrige Adhärenz → EXECUTION FIRST, Not-Now: Komplexität");
(function () {
  var MM = env(function (MM) {
    seedProgram(MM, { mode: "build" });
    MM.store.set("c2_daily", { d1: { p: true } });        // nur 1 von 9 Tagen aktiv
    seedWeights(MM, 82, 0, 10);
  });
  var dec = MM.intelligence.decision.decide();
  ok(dec.bottleneck.domain === "execution", "Bottleneck: execution");
  ok(dec.primary.type === "keep" && /Umsetzung/i.test(dec.primary.title), "EXECUTION FIRST (keep, kein neuer Plan)");
  ok(dec.notNow.some(function (n) { return /Supplement|Programme|Splits/i.test(n); }), "Not-Now: keine neue Komplexität");
  var a = MM.intelligence.advisor.answer("Soll ich mehr Supplements nehmen?");
  ok(!/ja, nimm|unbedingt/i.test(JSON.stringify(a.answer)), "Advisor pusht keine Supplements bei Execution-Lücke");
  var day = MM.exec.buildDay();
  ok(day.proposal == null, "Execution erzeugt keine Plan-Änderungs-Vorschläge");
})();

/* ================= S5 — MITTWOCH VERPASST: Repair OHNE Plan-Änderungs-Empfehlung ================= */
group("S5 · Verpasste Einheit → Woche repariert, Intelligence ändert den Plan NICHT");
(function () {
  var MM = env(function (MM) {
    seedProgram(MM, { mode: "recomp", missPd: 8 });       // Tag 8 (Krafttag) verpasst
    seedWeights(MM, 84, 0, 14);
    seedWorkoutLogs(MM, false);
  });
  var missed = MM.exec.missedThisWeek();
  ok(missed.length === 1 && missed[0].pd === 8, "Verpasste Einheit erkannt");
  var opts = MM.exec.repairOptions(8);
  ok(opts.length > 0, "Repair-Optionen vorhanden");
  var dec = MM.intelligence.decision.decide();
  ok(!(dec.primary.type === "change" && dec.primary.domain === "training"), "Intelligence empfiehlt KEINE Trainingsplan-Änderung wegen eines verpassten Tags");
  var swapBefore = JSON.stringify(MM.store.get("c2_dayswap", {}));
  MM.exec.applyReschedule(8, opts[0].date, "test");
  ok(JSON.stringify(MM.store.get("c2_dayswap", {})) === swapBefore, "Vergangenheit bleibt unangetastet");
})();

/* ================= S6 — TRAVEL: Overlay + Twin sieht Disruption + Basisplan intakt ================= */
group("S6 · Travel-Overlay → Twin/Kontext sehen Disruption, Basisplan intakt");
(function () {
  var MM = env(function (MM) {
    seedProgram(MM, { mode: "build" });
    seedWeights(MM, 82, 0.02, 14);
  });
  var planBefore = JSON.stringify(MM.store.get("os_training_plan", null));
  var swapBefore = JSON.stringify(MM.store.get("c2_dayswap", {}));
  MM.exec.startOverlay({ mode: "travel", start: TODAY, end: ymd(addD(NOW, 3)), mods: { location: "hotel_gym", minutes: 40 } });
  var ctx = MM.intelligence.buildContext();
  ok(ctx.execution.overlaysActive.indexOf("travel") >= 0, "Kontext kennt aktives Travel-Overlay");
  ok(ctx.execution.disruptions28 >= 1, "Disruption gezählt (28-Tage-Fenster)");
  var twin = MM.intelligence.twin.build(ctx);
  ok(twin && twin.domains && twin.domains.length > 0, "Digital Twin baut auf realem Kontext");
  ok(JSON.stringify(MM.store.get("os_training_plan", null)) === planBefore, "Basis-Trainingsplan unverändert");
  ok(JSON.stringify(MM.store.get("c2_dayswap", {})) === swapBefore, "Programm-Historie unverändert");
  var day = MM.exec.buildDay();
  ok(day.session && (day.session.substituted || day.session.compressedTo), "Ausführung an Reise angepasst");
})();

/* ================= S7 — ENHANCED: Hämatokrit → Monitoring, NIE Dosierung ================= */
group("S7 · Enhanced + Hämatokrit steigt → Monitoring-Priorität, keine Substanzsteuerung");
(function () {
  var MM = env(function (MM) {
    seedProgram(MM, { mode: "build" });
    MM.os.setP("pathway", "enhanced");
    MM.labs.addResult({ name: "Hämatokrit", value: 48, unit: "%", date: "2026-01-01" });
    MM.labs.addResult({ name: "Hämatokrit", value: 52, unit: "%", date: "2026-04-01" });
    MM.labs.addResult({ name: "Hämatokrit", value: 54, unit: "%", date: "2026-07-01" });
    seedWeights(MM, 82, 0.02, 14);
  });
  var dec = MM.intelligence.decision.decide();
  ok(dec.bottleneck.domain === "medical", "Bottleneck: medical (Monitoring)");
  ok(dec.primary.type === "check" && /Hämatokrit|Monitoring/i.test(dec.primary.title), "Primary: Monitoring-Review");
  ok(!/dosier|mg\b|absetzen|erhöhe die dosis/i.test(dec.primary.reason), "Keine Dosierungs-/Substanzanweisung");
  var day = MM.exec.buildDay();
  ok(day.proposal && day.proposal.type === "check", "Today zeigt CHECK-FIRST-Karte (Review, keine Änderung)");
})();

/* ================= S8 — DÜNNE DATEN: WAITING FOR DATA, keine Änderung ================= */
group("S8 · Zu wenig Gewichtsdaten → WAITING FOR DATA, KEEP");
(function () {
  var MM = env(function (MM) {
    seedProgram(MM, { mode: "build" });
    MM.os.logMetric("weight", 82, "kg", TODAY);           // nur 1 Datenpunkt
  });
  var waiting = MM.intelligence.decision.waitingForData();
  ok(waiting.length >= 1 && waiting[0].decision.indexOf("Kalorien") >= 0, "Kalorien-Entscheidung wartet auf Daten");
  ok(waiting[0].needs.length >= 1, "Konkrete Anforderungen genannt: " + waiting[0].needs.join(", "));
  var day = MM.exec.buildDay();
  ok(day.proposal == null, "Keine Kalorien-Änderung aus dünnen Daten");
  ok(day.waiting && day.waiting.length >= 1, "Today zeigt WAITING-FOR-DATA-Zustand");
})();

/* ================= S9 — KEIN PROVIDER: Deterministischer Advisor ================= */
group("S9 · Kein AI-Provider → deterministische Intelligenz funktioniert voll");
(function () {
  var MM = env(function (MM) { seedProgram(MM, { mode: "recomp" }); seedWeights(MM, 84, 0, 14); });
  ok(!MM.intelligence.advisor.hasProvider(), "Kein Provider registriert (ehrlich)");
  var a = MM.intelligence.advisor.answer("Warum stagniert mein Gewicht?");
  ok(a && a.answer && a.answer.length > 10, "Deterministische Antwort vorhanden");
  ok((a.whatISee && a.whatISee.length > 0) || (a.basedOn && a.basedOn.length > 0), "Antwort ist in echten Daten gegroundet (whatISee/basedOn)");
  var day = MM.exec.buildDay();
  ok(day.nba != null, "Execution unbeeinflusst");
})();

/* ================= S10 — DECISION LOOP: +kcal → 14 Tage → Review → KEEP ================= */
group("S10 · Closed Loop: Entscheidung → Review fällig → Outcome → Ledger zu");
(function () {
  var MM = env(function (MM) {
    seedProgram(MM, { mode: "build" });
    seedWeights(MM, 82.0, 0, 24);
    seedWorkoutLogs(MM, true);
  });
  var day = MM.exec.buildDay();
  var dec = MM.exec.applyProposal(day.proposal);
  // 14 Tage später: review_date künstlich auf heute ziehen (Zeitreise im Test).
  var l = MM.intelligence.memory.ledger();
  l.forEach(function (d) { if (d.id === dec.id) d.review_date = TODAY; });
  MM.store.set("intel_decisions", l);
  var day2 = MM.exec.buildDay();
  ok(day2.actions.some(function (a) { return a.type === "decision_review"; }), "Today surfaced das fällige Review");
  MM.exec.closeDecision(dec.id, "kept", "Gewicht reagiert wie erhofft");
  var closed = MM.intelligence.memory.getDecision(dec.id);
  ok(closed.status === "reviewed" && closed.outcome.verdict === "kept", "Outcome: KEEP dokumentiert");
  ok(MM.intelligence.memory.responses().some(function (r) { return r.decision_id === dec.id; }), "Beobachtete Reaktion im Response Memory");
  ok(MM.exec.buildDay().actions.every(function (a) { return a.type !== "decision_review"; }), "Loop geschlossen — nichts bleibt hängen");
})();

/* ================= LONGITUDINAL — 12 Wochen, keine Zukunfts-Leakage ================= */
group("Longitudinal · Reviews sind historisch unveränderlich");
(function () {
  var MM = env(function (MM) {
    seedProgram(MM, { mode: "build" });
    seedWeights(MM, 80.0, 0.03, 28);
  });
  var ctx = MM.intelligence.buildContext();
  var rev1 = MM.intelligence.review.generate(ctx);
  var stored1 = JSON.stringify(MM.intelligence.review.reviewForWeek(rev1.week));
  // 4 „Wochen später“: massiv neue Daten
  seedWeights(MM, 82.0, 0.1, 7);
  MM.os.logMetric("waist", 95, "cm", TODAY);
  var stored2 = JSON.stringify(MM.intelligence.review.reviewForWeek(rev1.week));
  ok(stored1 === stored2, "Gespeichertes Review Woche " + rev1.week + " bleibt Byte-gleich trotz neuer Daten");
  // Entscheidungshistorie bleibt
  var d1 = MM.exec.addDecision({ domain: "nutrition", what: "Test W2", reviewInDays: 14 });
  var led = MM.intelligence.memory.getDecision(d1.id);
  ok(led.date === TODAY, "Entscheidung trägt ihr Entstehungsdatum, nicht das Abfragedatum");
})();

/* ================= BRIEF-VEREINIGUNG (§98) ================= */
group("Morning Brief · EIN Contract: Intelligence-Inhalt + Execution-Zeitplan");
(function () {
  var MM = env(function (MM) {
    seedProgram(MM, { mode: "build", pulse: { 1: { inp: { energy: 2, sleep: "schlecht" }, verdict: {}, ts: TODAY } } });
    MM.os.setP("recovery.sleepHours", 5.8);
    seedWeights(MM, 82, 0.02, 14);
  });
  var b = MM.exec.brief();
  ok(!!b.focus && /schlaf|recovery/i.test(b.focus), "Fokus kommt aus der Intelligenz (Recovery-Limiter)");
  ok(b.primary != null && b.anchors && b.anchors.length > 0, "Zeitplan/Aktion kommt aus der Execution");
  ok(b.confidence != null, "Confidence sichtbar im Contract");
})();

console.log("\n──────────────────────────────");
console.log((failed ? "✗ " : "✓ ") + passed + " passed, " + failed + " failed");
if (failed) process.exit(1);
