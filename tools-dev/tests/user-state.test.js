/* ==========================================================================
   MALEMETRIX P11/P1.1 — USER STATE MODEL: Verhaltenstests
   MM.account.getDashboardState() ist die EINE Wahrheit für das Cockpit
   (Score, Mode, Bottleneck, Programmzustand, Access). Diese Suite lädt das
   echte js/account.js in Node und friert die Präzedenz-Regeln ein:
     · Programm-Mode schlägt Score-Plan (aktiver Zyklus = aktuellere Wahrheit)
     · fehlende Daten ⇒ ehrliche null/false-Werte (Basis der Empty States)
     · Access-Flags kommen aus Entitlements, nie erfunden
   Zusätzlich statisch: das Today-Cockpit rendert die Statuszeile NUR aus
   diesem Modell und blendet fehlende Werte aus (keine Fake-KPIs).
   Ausführen:  node tools-dev/tests/user-state.test.js
   ========================================================================== */
"use strict";
var path = require("path");
var fs = require("fs");
var ROOT = path.resolve(__dirname, "../..");

var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

/* ---- Minimal-Browser-Umgebung für account.js ---- */
function freshEnv() {
  var store = {};
  global.localStorage = {
    getItem: function (k) { return k in store ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  global.document = { addEventListener: function () {}, dispatchEvent: function () {}, getElementById: function () { return null; } };
  global.CustomEvent = function (t, i) { this.type = t; this.detail = (i || {}).detail; };
  global.window = { addEventListener: function () {}, location: { origin: "https://x", hash: "" }, MM: {} };
  global.MM = global.window.MM;
  MM.store = {
    get: function (k, d) { try { var r = localStorage.getItem("mm_" + k); return r != null ? JSON.parse(r) : d; } catch (e) { return d; } },
    set: function (k, v) { localStorage.setItem("mm_" + k, JSON.stringify(v)); },
    remove: function (k) { localStorage.removeItem("mm_" + k); }
  };
  MM.config = {}; // kein Cloud-Backend in Tests: local-first Pfad
  delete require.cache[require.resolve(path.join(ROOT, "js/account.js"))];
  require(path.join(ROOT, "js/account.js"));
  return MM;
}
function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return ymd(d); }

group("Leerer Nutzer ⇒ ehrliche Empty-State-Wahrheit");
(function () {
  var M = freshEnv();
  var d = M.account.getDashboardState();
  ok(d.hasScore === false && d.score === null, "kein Score ⇒ hasScore:false, score:null (nichts erfunden)");
  ok(d.mode === "" && d.bottleneck === "", "kein Mode/Bottleneck ohne Daten");
  ok(d.program && d.program.active === false, "kein aktiver Programm-Zyklus ⇒ program.active:false");
  ok(d.access.protocol === false && d.access.twelve_week === false, "keine Entitlements ⇒ kein Access (nie default-true)");
})();

group("Score vorhanden, kein Programm ⇒ Score liefert Mode/Bottleneck");
(function () {
  var M = freshEnv();
  M.store.set("check_result", { date: daysAgo(2), total: 61, plan: "recomp", bottleneck: { key: "recovery", name: "Schlaf & Erholung" }, answers: {} });
  var d = M.account.getDashboardState();
  ok(d.hasScore === true && d.score === 61, "Score-Wert kommt aus check_result (61)");
  ok(d.mode === "recomp", "Mode fällt auf Score-Plan zurück, solange kein Zyklus läuft");
  ok(d.bottleneck === "recovery" && /Schlaf/.test(d.bottleneckName), "Bottleneck-Key + Name aus dem Score");
  ok(d.program.active === false, "Programm bleibt ehrlich inaktiv");
})();

group("Aktiver Zyklus ⇒ Programm ist die aktuellere Wahrheit (Präzedenz)");
(function () {
  var M = freshEnv();
  M.store.set("check_result", { date: daysAgo(30), total: 55, plan: "cut", bottleneck: { key: "body", name: "Körperkomposition" } });
  M.store.set("c2_start", daysAgo(17));
  M.store.set("c2_goal", "recomp");
  M.store.set("c2_bottleneck", "recovery");
  var d = M.account.getDashboardState();
  ok(d.mode === "recomp", "Programm-Mode (recomp) schlägt älteren Score-Plan (cut)");
  ok(d.bottleneck === "recovery", "Programm-Bottleneck hat Vorrang");
  ok(d.program.active === true, "Zyklus aktiv");
  ok(d.program.day === 18, "Tag X/84 korrekt aus Startdatum abgeleitet (Tag " + d.program.day + ")");
  ok(d.program.week === 3, "Woche aus Tag abgeleitet (Woche " + d.program.week + ")");
})();

group("Access-Flags: nur aus Entitlements, additiv");
(function () {
  var M = freshEnv();
  M.store.set("course_code", "LEGACY123"); // Legacy-Code ⇒ lokale twelve_week/protocol-Spur
  var d = M.account.getDashboardState();
  ok(typeof d.access.protocol === "boolean" && typeof d.access.coaching === "boolean", "Access ist immer boolesch (nie undefined)");
  ok(d.access.coaching === false, "coaching wird nie aus einem Kurs-Code abgeleitet");
})();

group("Cockpit rendert NUR aus diesem Modell (statisch)");
(function () {
  var app = fs.readFileSync(path.join(ROOT, "js/os/app.js"), "utf8");
  ok(/os-statstrip/.test(app), "Statuszeile existiert im Today-Cockpit");
  var stripBlock = app.split("P11-COCKPIT")[1].split("KONTEXT-BADGE")[0];
  ok(/d\.hasScore && d\.score != null/.test(stripBlock), "SCORE-Kachel nur bei echtem Score (kein Fake-KPI)");
  ok(/if \(d\.mode\)/.test(stripBlock), "MODE-Kachel nur bei vorhandenem Mode");
  ok(/d\.bottleneckName \|\| d\.bottleneck/.test(stripBlock), "ENGPASS-Kachel nur bei vorhandenem Bottleneck");
  ok(/p\.nextReviewDays != null/.test(stripBlock), "CHECK-IN-Kachel nur mit echtem Review-Datum");
  ok(!/Math\.random|placeholder|TODO/.test(stripBlock), "keine Platzhalter-/Zufallswerte in der Statuszeile");
  var css = fs.readFileSync(path.join(ROOT, "css/os.css"), "utf8");
  ok(/\.os-statstrip/.test(css) && /\.os-stat\b/.test(css), "Statuszeile hat Design-System-CSS (Performance-Lab, keine Emojis)");
  ok(!/os-stat[^}]*emoji/i.test(css), "keine Emoji-Krücken im Cockpit-CSS");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
