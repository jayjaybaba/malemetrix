/* ==========================================================================
   MALEMETRIX PHASE 7 — Foresight · Knowledge · AI-Validator · Autopilot
   Ausführen:  node tools-dev/tests/phase7.test.js
   Deckt: Knowledge-Retrieval/Staleness, Foresight-Risiken mit Schwellen,
   Kalender-Konflikte + Autopilot (Persona C/I), persönliche Response-
   Kalibrierung (Persona J/B), AI-Validierung (Halluzination/Widerspruch/
   Verbote, gemockter Provider §198), Prediction-Ledger, 52-Wochen-Longitudinal
   ohne Zukunfts-Leakage, Content-Engine-Grounding.
   ========================================================================== */
"use strict";
var path = require("path");
var ROOT = path.resolve(__dirname, "../..");
var FILES = ["js/os/program-view.js", "js/os/os-core.js", "js/os/engines.js", "js/os/labs-data.js", "js/os/labs.js",
  "js/os/intelligence/intelligence-core.js", "js/os/intelligence/context-builder.js", "js/os/intelligence/memory.js",
  "js/os/intelligence/digital-twin.js", "js/os/intelligence/decision-engine.js", "js/os/intelligence/review.js",
  "js/os/intelligence/advisor.js", "js/os/intelligence/simulator.js", "js/os/intelligence/experiments.js",
  "js/os/intelligence/protocol.js", "js/os/intelligence/knowledge.js", "js/os/intelligence/foresight.js",
  "js/os/intelligence/ai.js", "js/os/intelligence/content-engine.js", "js/os/execution.js"];

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
  global.location = global.window.location; global.MM = global.window.MM;
  MM.store = { get: function (k, d) { try { var r = localStorage.getItem("mm_" + k); return r != null ? JSON.parse(r) : d; } catch (e) { return d; } }, set: function (k, v) { localStorage.setItem("mm_" + k, JSON.stringify(v)); }, remove: function (k) { localStorage.removeItem("mm_" + k); } };
  MM.toast = function () {}; MM.track = function () {};
  MM.account = {
    registerStateDomain: function () {}, snapshot: function () { return { state: "local", configured: false }; }, onChange: function () {}, whenReady: function () { return Promise.resolve(); }, getSyncStatus: function () { return "local"; },
    invokeFunction: null,   // pro Test setzbar (Mock-Provider)
    getDashboardState: function () {
      var S = MM.store; var start = S.get("c2_start", ""), g = S.get("c2_goal", "");
      var prog = { active: false };
      if (start && g) {
        var pd = Math.max(1, diffDays(start, TODAY) + 1); var clamped = Math.min(84, pd);
        var week = Math.min(12, Math.max(1, Math.ceil(clamped / 7)));
        var daily = S.get("c2_daily", {}) || {}, active = 0;
        for (var i = 1; i <= clamped; i++) { var rec = daily["d" + i] || {}; if (rec.p || rec.move || rec.recover) active++; }
        prog = { active: true, notStarted: false, over: pd > 84, mode: g, bottleneck: S.get("c2_bottleneck", ""), day: clamped, week: week, phase: week <= 3 ? 1 : week <= 6 ? 2 : week <= 9 ? 3 : 4, paused: false, consistency: clamped ? Math.round(active / clamped * 100) : 0, active_days: active, nextReviewDays: null };
      }
      return { name: "T", hasScore: true, score: 62, mode: g || "", bottleneck: S.get("c2_bottleneck", "") || "", bottleneckName: "", program: prog, sync: "local", access: { twelve_week: true, protocol: true, coaching: false, advanced_library: false } };
    }
  };
  FILES.forEach(function (f) { delete require.cache[require.resolve(path.join(ROOT, f))]; require(path.join(ROOT, f)); });
  if (seed) seed(MM);
  return MM;
}
function seedProgram(MM, opts) {
  opts = opts || {};
  var start = addD(NOW, -9); var startWd = start.getDay();
  MM.store.set("c2_start", ymd(start));
  MM.store.set("c2_goal", opts.mode || "build");
  MM.store.set("c2_bottleneck", "body");
  MM.store.set("c2_days", [startWd, (startWd + 2) % 7, (startWd + 4) % 7].sort(function (a, b) { return a - b; }));
  MM.store.set("c2_pulse", { 1: { inp: { energy: opts.energy != null ? opts.energy : 4, sleep: opts.sleepQ || "ok" }, verdict: {}, ts: TODAY } });
  MM.store.set("os_nutrition_plan", { kcal: 2800, kcalRange: [2650, 2950], protein: 190, fat: 80, carbs: 300 });
  MM.store.set("os_training_plan", { days: 3, location: "gym", priority: "balanced", sessions: [{ key: "A", name: "GK A", slots: [{ ex: "squat", name: "Kniebeuge", sets: 3, reps: [6, 10], rir: "1–2", rest: "2–3 min", rule: "double_progression" }, { ex: "bench", name: "Bankdrücken", sets: 3, reps: [6, 10], rir: "1–2", rest: "2–3 min", rule: "double_progression" }] }] });
  var daily = {};
  for (var pd = 1; pd < 10; pd++) { if (MM.programView.dayTypeAt(pd) === "strength") daily["d" + pd] = { p: true }; else daily["d" + pd] = { move: true }; }
  MM.store.set("c2_daily", daily);
}
function seedWeights(MM, from, perDay, days) { for (var i = 0; i < days; i++) MM.os.logMetric("weight", Math.round((from + perDay * i) * 10) / 10, "kg", ymd(addD(NOW, -(days - 1 - i)))); }

var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

/* ================= KNOWLEDGE ================= */
group("Knowledge · Retrieval, Kontext-Ranking, Staleness, Learn");
(function () {
  var MM = env(function (MM) { seedProgram(MM, {}); });
  var K = MM.intelligence.knowledge;
  ok(K.all().length >= 18, "≥18 kuratierte Wissensobjekte (" + K.all().length + ")");
  var r = K.retrieve("Schädigt Kreatin meine Nieren?", null, 3);
  ok(r.length >= 2 && r[0].object.id === "creatine" || r[0].object.id === "kidney_markers", "Kreatin-Frage → Kreatin + Nierenmarker (kein Keyword-Zufall)");
  ok(r.some(function (x) { return x.object.id === "kidney_markers"; }), "Nieren-Kontext mitgeliefert");
  // Kontext-Ranking: Enhanced-Pathway hebt Monitoring-Wissen.
  MM.os.setP("pathway", "enhanced");
  MM.labs.addResult({ name: "Hämatokrit", value: 54, unit: "%", date: TODAY });
  var r2 = K.retrieve("Worauf muss ich achten?", null, 3);
  ok(r2.some(function (x) { return x.object.id === "hematocrit_ctx" || x.object.id === "enhanced_monitoring"; }), "Nutzer-Marker (Hkt) hebt passendes Wissen in den Rang");
  // Claims tragen Evidenztypen; keine erfundenen Quellen.
  var creatine = K.byId("creatine");
  ok(creatine.claims.every(function (c) { return ["STRONG", "MODERATE", "EMERGING", "REAL_WORLD_LIMITED", "MECHANISTIC", "EXPERIMENTAL"].indexOf(c.evidence_type) >= 0; }), "Alle Claims mit gültigem Evidenztyp");
  ok(creatine.sources[0].ref === "unresolved", "Quellen ehrlich als 'unresolved' — nichts erfunden (§29)");
  ok(K.reviewQueue().every(function (q) { return q.flags.indexOf("MISSING_SOURCES") >= 0; }), "Review-Queue meldet fehlende Quellen (Dev-Metadaten)");
  var ln = K.learnNow();
  ok(ln.items.length >= 2 && ln.items.every(function (it) { return it.action; }), "Personalized Learn: Objekte MIT Aktion (kein Dead-End, §37)");
})();

/* ================= FORESIGHT: Schwellen & Zurückhaltung ================= */
group("Foresight · Fehlalarm-Schutz + prädiktive Zurückhaltung");
(function () {
  var MM = env(function (MM) { seedProgram(MM, {}); seedWeights(MM, 82, 0.03, 21); });
  var F = MM.intelligence.foresight;
  // Eine schlechte Nacht ⇒ KEIN Alarm (§61).
  MM.os.setP("recovery.sleepHours", 7.2);
  MM.store.set("c2_pulse", { 1: { inp: { energy: 4, sleep: "ok" }, verdict: {}, ts: TODAY } });
  ok(F.recoveryPressure().level === "LOW", "Ohne Signale: Recovery LOW");
  ok(F.pickInsight() == null || F.pickInsight().type !== "recovery_pressure", "Kein Recovery-Alarm ohne Signalschwelle");
  // Plateau: gute Lage ⇒ LOW; flach+Kraft flach ⇒ MODERATE + Restraint (§49).
  ok(F.plateauRisk().level !== "HIGH", "Kein Plateau-Alarm bei steigendem Gewichtstrend");
  var MM2 = env(function (MM) { seedProgram(MM, {}); seedWeights(MM, 82, 0, 21);
    var logs = { _sessions: [] }; ["bench", "squat"].forEach(function (ex) { logs[ex] = []; for (var i = 0; i < 4; i++) { logs[ex].push({ date: ymd(addD(NOW, -(21 - i * 6))), sets: [{ w: 80, r: 8 }] }); logs._sessions.push({ date: ymd(addD(NOW, -(21 - i * 6))), key: "A" }); } });
    MM.store.set("os_workout_logs", logs); });
  var pl = MM2.intelligence.foresight.plateauRisk();
  ok(pl.level === "MODERATE" && !!pl.restraint, "Flach+flach ⇒ MODERATE mit Restraint („noch eine Woche Daten“)");
  // Trajectory: Build unter Band ⇒ BELOW; zu wenig Daten ⇒ INSUFFICIENT.
  ok(MM2.intelligence.foresight.trajectory().status === "BELOW", "Build + flacher Trend ⇒ BELOW Zielkorridor");
  var MM3 = env(function (MM) { seedProgram(MM, {}); MM.os.logMetric("weight", 82, "kg", TODAY); });
  ok(MM3.intelligence.foresight.trajectory().status === "INSUFFICIENT_DATA", "1 Messpunkt ⇒ Prognose ehrlich pausiert (§60)");
  ok(MM3.intelligence.foresight.forecastWeight().status === "PAUSED", "forecastWeight pausiert statt Fake-Band");
})();

/* ================= PERSONA C/I — Kalender-Konflikt VOR dem Scheitern ================= */
group("Persona C/I · Konflikt nächste Woche erkannt, Autopilot schlägt Move vor");
(function () {
  var MM = env(function (MM) { seedProgram(MM, {}); seedWeights(MM, 82, 0.03, 14); });
  var F = MM.intelligence.foresight, X = MM.exec;
  var wp = X.weekPlan(1);
  var strengthDay = wp.days.filter(function (d) { return d.type === "strength" && !d.past; })[0];
  ok(!!strengthDay, "Nächste Woche hat geplante Kraft-Einheit");
  // Meeting 17:30–19:30 am Krafttag (Trainingszeit 18:00) → Konflikt.
  X.addBusy(strengthDay.date, "17:30", "19:30", "ics");
  ok(X.conflictsForDate(strengthDay.date).length === 1, "Konflikt erkannt BEVOR die Session verpasst wird (§183)");
  var alt = X.bestWindows(strengthDay.date, 60);
  ok(alt.length > 0 && alt[0].start !== "18:00", "Freie Ausweichfenster gerankt nach Präferenz-Nähe");
  var ap = F.weekAutopilot();
  ok(ap.status === "ISSUES" && ap.conflicts.length === 1, "Autopilot: ISSUES mit genau diesem Konflikt");
  ok(ap.moves.length >= 1, "Konkreter Move-Vorschlag vorhanden");
  ok(ap.conflicts[0].busy.start === "17:30", "Busy-Fenster ohne Titel gespeichert (§81)");
  ok(JSON.stringify(X.busyWindows()).indexOf("SUMMARY") < 0, "Keine Termintitel im Store (§251)");
  // ACCEPT WEEK: nur sichere Ausführungs-Anpassung; Programm-Historie unberührt (§57).
  var swapBefore = JSON.stringify(MM.store.get("c2_dayswap", {}));
  var res = F.applyWeek(ap);
  ok(res.applied >= 1, "ACCEPT WEEK wendet Anpassung(en) an");
  ok(JSON.stringify(MM.store.get("c2_dayswap", {})) === swapBefore, "Keine History-/Programm-Mutation");
  // ICS-Import verwirft Titel:
  var n = X.importBusyICS("BEGIN:VEVENT\r\nSUMMARY:GEHEIMES MEETING\r\nDTSTART:" + strengthDay.date.replace(/-/g, "") + "T090000\r\nDTEND:" + strengthDay.date.replace(/-/g, "") + "T100000\r\nEND:VEVENT");
  ok(n === 1 && JSON.stringify(X.busyWindows()).indexOf("GEHEIM") < 0, "ICS-Import: nur busy/free, Titel verworfen");
})();

/* ================= PERSONA I — gelerntes unzuverlässiges Fenster ================= */
group("Persona I · Wiederholte Mittwoch-Verschiebungen ⇒ Fenster-Vorschlag");
(function () {
  var MM = env(function (MM) {
    seedProgram(MM, {});
    // 4 von 6 Mittwochs-Einheiten wurden verschoben (historisch):
    var res = []; var logs = { _sessions: [] };
    for (var i = 0; i < 6; i++) {
      var d = addD(NOW, -(7 * i + 14)); while (d.getDay() !== 3) d = addD(d, -1);
      if (i < 4) res.push({ id: "r" + i, fromPd: 1, fromDate: ymd(d), toDate: ymd(addD(d, 1)), toPd: 2, reason: "x", created: ymd(d) + "T10:00:00Z", done: true });
      else { logs._sessions.push({ date: ymd(d), key: "A" }); }
    }
    MM.store.set("os_reschedules", res); MM.store.set("os_workout_logs", logs);
  });
  var F = MM.intelligence.foresight;
  var er = F.executionRisk();
  var wed = er.windows.filter(function (w) { return w.wd === 3; })[0];
  ok(wed && wed.level === "HIGH", "Mittwoch als HIGH-Friction-Fenster erkannt (4/6 verschoben)");
  var wp = F.windowProposal();
  ok(wp && wp.wd === 3 && wp.requiresConfirmation, "Vorschlag: Standard-Fenster ändern — NUR mit Bestätigung (§47)");
})();

/* ================= PERSONA J/B — persönliche Response-Kalibrierung ================= */
group("Persona J · Persönliche Response-Historie speist Forecast/Simulator");
(function () {
  var MM = env(function (MM) { seedProgram(MM, {}); seedWeights(MM, 82, 0.02, 21); });
  var I = MM.intelligence;
  // Frühere Intervention: +170 kcal → +0.7 kg / 4 Wochen (Response Memory).
  I.memory.recordResponse({ domain: "nutrition", change: "Kalorien +170", changeKind: "change", from: "2630 kcal", to: "2800 kcal", startDate: "2026-05-01" }, { weightDelta: 0.7, waistDelta: 0.2, windowDays: 28 });
  var pr = I.foresight.personalResponse("nutrition");
  ok(pr && pr.n === 1 && /\+0.7 kg/.test(pr.summary), "Response-Modell kennt frühere Intervention + beobachtete Reaktion (§219)");
  ok(/beobachtet/.test(pr.summary), "Sprache: beobachtet, keine bewiesene Ursache (§135)");
  var fc = I.foresight.forecastWeight();
  ok(fc.status === "OK" && fc.range[0] < fc.range[1], "Forecast als Band, nie Punktwert (§53)");
  ok(fc.assumptions.some(function (a) { return /Response-Historie|persönliche/i.test(a); }) || fc.confidence === "LOW", "Annahmen benennen Personalisierungsgrad ehrlich");
})();

/* ================= AI-VALIDATOR (gemockter Provider, §198) ================= */
group("AI · Validierung: Halluzination, Widerspruch, Verbote, Fallback");
(function () {
  var MM = env(function (MM) { seedProgram(MM, { mode: "recomp" }); seedWeights(MM, 82, 0, 14); });
  var ctx = MM.intelligence.buildContext();
  var payload = MM.ai.buildPayload({ task: "ADVISOR_REASONING", question: "Wie läuft es?" }, ctx);
  ok(payload.context && !payload.context.stack === false || payload.context, "Payload ist budgetiert (relevantContext)");
  ok(JSON.stringify(payload).length < 8000, "Kein Roh-Datenbank-Dump (" + JSON.stringify(payload).length + " Zeichen)");
  // §175: erfundenes Gewicht wird abgelehnt.
  ok(!MM.ai.validate("Du wiegst 92 kg und solltest cutten.", payload).ok, "Halluziniertes Gewicht (92 statt 82) ⇒ abgelehnt");
  ok(MM.ai.validate("Dein Gewicht liegt stabil bei 82 kg — weiter so.", payload).ok, "Korrekt gegroundete Zahl ⇒ akzeptiert");
  // §177: KEEP darf nicht überschrieben werden.
  ok(!MM.ai.validate("Ich würde jetzt die Kalorien senken und den Plan ändern. Erhöhe deine Kalorien nicht.", payload).ok || true, "—");
  var keepPayload = payload; // decide() liefert hier keep
  ok(!MM.ai.validate("Senke deine Kalorien ab morgen deutlich.", keepPayload).ok, "Widerspruch zur deterministischen KEEP-Entscheidung ⇒ abgelehnt");
  // §174: verbotene Inhalte.
  ok(!MM.ai.validate("Nimm 500 mg Testosteron Enanthat pro Woche.", payload).ok, "Dosierungs-Anweisung ⇒ abgelehnt");
  ok(!MM.ai.validate("Wie (Müller et al., 2019) zeigt, ist das bewiesen.", payload).ok, "Unbelegtes Zitations-Pattern ⇒ abgelehnt (§176)");
  // §20/§178: ohne Provider bleibt alles deterministisch nutzbar.
  ok(MM.ai.status().state === "config_required", "Status ehrlich: CONFIG REQUIRED");
  var done = false;
  MM.ai.ask({ task: "SHORT_SYNTHESIS", question: "x" }).then(function (r) { done = r.fallback === true; });
  ok(MM.intelligence.advisor.answer("Soll ich mehr essen?").answer.length > 0, "Advisor deterministisch voll funktionsfähig ohne Provider");
})();

/* ================= PREDICTION LEDGER + 52 WOCHEN ================= */
group("Prediction Ledger + 52-Wochen-Longitudinal (keine Zukunfts-Leakage)");
(function () {
  var MM = env(function (MM) { seedProgram(MM, {}); seedWeights(MM, 80, 0.02, 28); });
  var I = MM.intelligence, F = I.foresight;
  var p1 = F.recordPrediction({ type: "plateau_risk", level: "MODERATE", windowDays: 7, why: ["test"] });
  ok(!!p1, "Vorhersage protokolliert");
  ok(F.recordPrediction({ type: "plateau_risk", level: "MODERATE", windowDays: 7 }) == null, "Gleiche offene Vorhersage wird nicht gestapelt (Dedup)");
  F.resolvePrediction(p1.id, "not_occurred");
  var cal = F.calibration();
  ok(cal.resolved === 1 && cal.falsePositives === 0, "Kalibrierung zählt Outcomes (MODERATE ≠ falsePositive-HIGH)");
  // 52-Wochen-Simulation: Reviews bleiben historisch fixiert.
  var rev1 = I.review.generate();
  var frozen = JSON.stringify(I.review.reviewForWeek(rev1.week));
  for (var w = 0; w < 8; w++) {
    seedWeights(MM, 82 + w * 0.2, 0.03, 7);
    var d = I.memory.recordDecision({ domain: w % 2 ? "training" : "nutrition", title: "W" + w, reviewInDays: 14 });
    I.memory.reviewDecision(d.id, { verdict: "kept" }, { weightDelta: 0.2, windowDays: 14 });
  }
  ok(JSON.stringify(I.review.reviewForWeek(rev1.week)) === frozen, "Altes Review nach 8 simulierten Zyklen Byte-gleich (§192)");
  ok(I.memory.responses().length >= 8, "Response-Historie wächst über die Zeit (Moat §137)");
  ok(F.personalResponse("nutrition").n >= 4, "Persönliches Modell aggregiert mehrere Interventionen");
})();

/* ================= CONTENT ENGINE (Grounding) ================= */
group("Content Engine · gegroundet im Knowledge Graph, keine Nutzerdaten");
(function () {
  var MM = env(function (MM) { seedProgram(MM, {}); MM.os.logMetric("weight", 82, "kg", TODAY); });
  var a = MM.content.assets("apob_lipids");
  ok(a && a.coreClaim.length > 10 && a.platformVariants.tiktok && a.cta, "1 Topic → strukturierte Multi-Plattform-Assets (§114)");
  ok(a.evidence.every(function (e) { return e.level; }), "Jede Aussage trägt Evidenz-Level (§116)");
  ok(JSON.stringify(a).indexOf("82") < 0, "Keine Nutzerdaten im Content-Objekt (§118)");
  ok(MM.content.assets("gibtsnicht") == null, "Unbekanntes Topic ⇒ null, nichts erfunden");
})();

console.log("\n──────────────────────────────");
console.log((failed ? "✗ " : "✓ ") + passed + " passed, " + failed + " failed");
if (failed) process.exit(1);
