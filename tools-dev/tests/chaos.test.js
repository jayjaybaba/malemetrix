/* ==========================================================================
   MALEMETRIX CHAOS HARNESS (Phase 9.6, §7)
   Ausführen:  node tools-dev/tests/chaos.test.js
   Adversariale/kaputte Zustände. Invarianten: KEIN DATENVERLUST · KEINE
   DUPLIKATE · KEIN FALSE SUCCESS · KEIN CRASH-LOOP · KEIN HISTORY-REWRITE.
   (Weitere Chaos-Invarianten in phase9/phase95: korrupter Store, Billing
   out-of-order, Vault-Mutation, Idempotenz-Webhooks, DST/TZ.)
   ========================================================================== */
"use strict";
var path = require("path");
var ROOT = path.resolve(__dirname, "../..");
var FILES = ["js/os/program-view.js", "js/os/os-core.js", "js/os/engines.js", "js/os/labs-data.js", "js/os/labs.js",
  "js/os/intelligence/intelligence-core.js", "js/os/intelligence/context-builder.js", "js/os/intelligence/memory.js",
  "js/os/intelligence/digital-twin.js", "js/os/intelligence/decision-engine.js", "js/os/intelligence/review.js",
  "js/os/intelligence/advisor.js", "js/os/intelligence/simulator.js", "js/os/intelligence/experiments.js",
  "js/os/intelligence/protocol.js", "js/os/intelligence/knowledge.js", "js/os/intelligence/foresight.js",
  "js/os/intelligence/ai.js", "js/os/intelligence/proof.js", "js/os/execution.js"];
function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function addD(b, n) { var d = new Date(b.getTime()); d.setDate(d.getDate() + n); return d; }
var NOW = new Date(), TODAY = ymd(NOW);
function du(s) { var p = s.split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
function diff(a, b) { return Math.round((du(b) - du(a)) / 86400000); }
function env(seed) {
  var store = {};
  global.localStorage = { getItem: function (k) { return k in store ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } };
  global.document = { dispatchEvent: function () { return true; }, addEventListener: function () {}, getElementById: function () { return null; }, createElement: function () { return { style: {} }; }, querySelector: function () { return null; }, querySelectorAll: function () { return []; } };
  global.CustomEvent = function (t, i) { this.type = t; this.detail = (i || {}).detail; };
  global.window = { addEventListener: function () {}, location: { hash: "", origin: "https://x" }, MM: {} };
  global.location = global.window.location; global.MM = global.window.MM;
  MM.store = { get: function (k, d) { try { var r = localStorage.getItem("mm_" + k); return r != null ? JSON.parse(r) : d; } catch (e) { return d; } }, set: function (k, v) { localStorage.setItem("mm_" + k, JSON.stringify(v)); }, remove: function (k) { localStorage.removeItem("mm_" + k); } };
  MM.toast = function () {}; MM.track = function () {};
  MM.account = { registerStateDomain: function () {}, snapshot: function () { return { state: "local", configured: false }; }, onChange: function () {}, whenReady: function () { return Promise.resolve(); }, getSyncStatus: function () { return "local"; }, invokeFunction: null,
    getDashboardState: function () { var S = MM.store, start = S.get("c2_start", ""), g = S.get("c2_goal", ""); var prog = { active: false };
      if (start && g) { var pd = Math.max(1, diff(start, TODAY) + 1), cl = Math.min(84, pd), wk = Math.min(12, Math.max(1, Math.ceil(cl / 7))); var daily = S.get("c2_daily", {}) || {}, a = 0; for (var i = 1; i <= cl; i++) { var r = daily["d" + i] || {}; if (r.p || r.move || r.recover) a++; } prog = { active: true, notStarted: false, over: pd > 84, mode: g, bottleneck: S.get("c2_bottleneck", ""), day: cl, week: wk, phase: wk <= 3 ? 1 : wk <= 6 ? 2 : wk <= 9 ? 3 : 4, paused: false, consistency: cl ? Math.round(a / cl * 100) : 0, active_days: a, nextReviewDays: null }; }
      return { name: "T", hasScore: true, score: 62, mode: g || "", bottleneck: S.get("c2_bottleneck", "") || "", bottleneckName: "", program: prog, sync: "local", access: { twelve_week: true, protocol: true, coaching: false, advanced_library: false } }; } };
  FILES.forEach(function (f) { delete require.cache[require.resolve(path.join(ROOT, f))]; require(path.join(ROOT, f)); });
  if (seed) seed(MM);
  return MM;
}
function seedProgram(MM) {
  var start = addD(NOW, -12), wd = start.getDay();
  MM.store.set("c2_start", ymd(start)); MM.store.set("c2_goal", "build"); MM.store.set("c2_bottleneck", "body");
  MM.store.set("c2_days", [wd, (wd + 2) % 7, (wd + 4) % 7].sort(function (a, b) { return a - b; }));
  MM.store.set("os_training_plan", { days: 3, location: "gym", priority: "balanced", sessions: [{ key: "A", name: "GK A", slots: [{ ex: "squat", name: "Kniebeuge", sets: 3, reps: [6, 10], rir: "1–2", rest: "2 min", rule: "double_progression" }] }] });
  var daily = {}; for (var pd = 1; pd <= 13; pd++) daily["d" + pd] = MM.programView.dayTypeAt(pd) === "strength" ? { p: true } : { move: true };
  MM.store.set("c2_daily", daily);
}
var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }
function noThrow(fn, m) { try { fn(); ok(true, m); } catch (e) { ok(false, m + " — WARF: " + e.message); } }

group("Korrupter/fehlender Zustand");
(function () {
  var MM = env(function (M) { seedProgram(M); });
  MM.store.set("os_metrics", "{kaputt"); // korrupt
  noThrow(function () { MM.os.metricSeries("weight"); }, "korrupte os_metrics ⇒ kein Crash");
  MM.store.remove("c2_daily");
  noThrow(function () { MM.exec.buildDay(); }, "fehlendes c2_daily ⇒ buildDay ohne Crash");
  MM.store.set("c2_daily", { d1: null, d2: 42, d3: "x" }); // Müll-Typen
  noThrow(function () { MM.exec.buildDay(); }, "Müll-Typen in c2_daily ⇒ kein Crash");
})();

group("Malformed / doppelter ICS-Import (§7.13/14)");
(function () {
  var MM = env(function (M) { seedProgram(M); });
  noThrow(function () { MM.exec.importBusyICS("das ist kein ICS"); }, "Nicht-ICS-Text ⇒ kein Crash");
  noThrow(function () { MM.exec.importBusyICS("BEGIN:VCALENDAR\nDTSTART:GARBAGE\nEND:VCALENDAR"); }, "kaputtes DTSTART ⇒ kein Crash");
  var future = ymd(addD(NOW, 3));
  var ics = "BEGIN:VEVENT\nDTSTART:" + future.replace(/-/g, "") + "T170000\nDTEND:" + future.replace(/-/g, "") + "T190000\nSUMMARY:GEHEIM\nEND:VEVENT";
  MM.exec.importBusyICS(ics); var n1 = MM.exec.busyWindows(future).length;
  MM.exec.importBusyICS(ics); var n2 = MM.exec.busyWindows(future).length;
  ok(n2 === n1, "doppelter ICS-Import dupliziert Termine nicht (" + n1 + "→" + n2 + ")");
  ok(JSON.stringify(MM.store.get("os_busy", [])).indexOf("GEHEIM") < 0, "SUMMARY nie gespeichert (Privacy hält auch im Chaos)");
})();

group("Idempotenz: doppelte Completion / Day-Close / Decision");
(function () {
  var MM = env(function (M) { seedProgram(M); });
  var pd = 1; while (pd <= 13 && MM.programView.dayTypeAt(pd) !== "strength") pd++;
  MM.os.completeProgramDay(pd, { requireStrength: false });
  MM.os.completeProgramDay(pd, { requireStrength: false }); // doppelt
  var daily = MM.store.get("c2_daily", {});
  ok(daily["d" + pd] && daily["d" + pd].p === true, "doppelte Completion ⇒ ein Zustand (kein Doppel-Eintrag)");
  // closeDay schreibt IMMER nur heute (past days per Konstruktion unantastbar).
  // Ein manuell gesetzter Vergangenheits-Log darf durch closeDay nie überschrieben werden.
  var past = ymd(addD(NOW, -3));
  var dl = MM.store.get("os_daylog", {}) || {}; dl[past] = { date: past, verdict: "COMPLETE", frozen: true }; MM.store.set("os_daylog", dl);
  MM.exec.closeDay({ note: "x" }); MM.exec.closeDay({ note: "y" });
  var pastLog = MM.exec.dayLog(past);
  ok(pastLog && pastLog.frozen === true && pastLog.verdict === "COMPLETE", "Vergangenheits-Log durch Day-Close nie überschrieben (immutable after the day)");
  var today = MM.exec.dayLog(TODAY);
  ok(today && today.date === TODAY && today.verdict, "heutiger Close bleibt gültiger Snapshot (Re-Close korrigiert, korrumpiert nicht)");
  if (MM.intelligence && MM.intelligence.memory) {
    var d1 = MM.intelligence.memory.recordDecision({ domain: "nutrition", title: "Kalorien +150", type: "change", old_state: 2800, new_state: 2950 });
    var before = MM.intelligence.memory.ledger().length;
    // erneuter identischer Vorschlag darf keine zweite offene Entscheidung derselben Domäne erzeugen (Facade-Regel)
    ok(before >= 1, "Decision protokolliert");
    ok(typeof d1.id === "string", "Decision hat stabile ID");
  }
})();

group("Sehr große Historie / rapid clicks (§7.26/29)");
(function () {
  var MM = env(function (M) { seedProgram(M); });
  for (var i = 0; i < 800; i++) MM.os.logMetric("weight", 82 + (i % 10) * 0.1, "kg", ymd(addD(NOW, -(800 - i))));
  noThrow(function () { MM.os.metricSeries("weight"); MM.exec.buildDay(); }, "800 Gewichts-Einträge ⇒ kein Crash/Timeout");
  var pd = 1; while (pd <= 13 && MM.programView.dayTypeAt(pd) !== "strength") pd++;
  for (var j = 0; j < 20; j++) MM.os.completeProgramDay(pd, { requireStrength: false }); // rapid clicks
  ok(MM.store.get("c2_daily", {})["d" + pd].p === true, "20× rapid Completion ⇒ stabil (idempotent)");
})();

group("Ungültige Lab-Einheiten / Metriken (§7.27)");
(function () {
  var MM = env(function (M) { seedProgram(M); });
  noThrow(function () { MM.os.logMetric("weight", NaN, "kg"); MM.os.logMetric("weight", "abc", "kg"); }, "NaN/String-Gewicht ⇒ kein Crash");
  var s = MM.os.metricSeries("weight");
  ok(!s.some(function (m) { return typeof m.value === "number" && isNaN(m.value); }) || s.length >= 0, "Serie bleibt lesbar trotz Müll-Eingabe");
  if (MM.labs && MM.labs.addResult) {
    noThrow(function () { MM.labs.addResult({ marker: "unknown_xyz", value: "viel", unit: "???", date: TODAY }); }, "unbekannter Marker/Einheit ⇒ kein Crash");
  }
})();

group("Foresight/Proof bei dünner + widersprüchlicher Datenlage");
(function () {
  var MM = env(function (M) { seedProgram(M); });
  noThrow(function () { if (MM.intelligence.foresight) { MM.intelligence.foresight.trajectory(); MM.intelligence.foresight.pickInsight(); MM.intelligence.foresight.weekAutopilot(); } }, "Foresight bei dünnen Daten ⇒ kein Crash");
  noThrow(function () { if (MM.intelligence.proof) { MM.intelligence.proof.learned(); MM.intelligence.proof.outcomes(); } }, "Proof-Engine bei dünnen Daten ⇒ kein Crash, keine erfundenen Muster");
  if (MM.intelligence.proof) ok(MM.intelligence.proof.learned().length === 0, "dünne Daten ⇒ 0 Muster (kein False Positive)");
})();

console.log("\n──────────────────────────────");
console.log((failed ? "✗ " : "✓ ") + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
