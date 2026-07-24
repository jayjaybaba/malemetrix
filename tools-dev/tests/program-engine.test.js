/* ==========================================================================
   MALEMETRIX P11/P3.1+P5 — PROGRAM & WEEKLY REVIEW ENGINE: Verhaltenstests
   Lädt die ECHTEN Engines (js/os/engines.js) in Node und friert ein:
     · CUT/RECOMP/BUILD/PERFORM sind real unterschiedlich (kcal, Protein/kg)
     · Weekly Review: DATA → deterministische DECISION (KEEP, adjust_up/down,
       execution_first, recovery_first) — Trends in %KG/Woche, nie fixe kg
     · Plateau-Logik: „Plan nicht ausgeführt" ≠ „Plan funktioniert nicht"
     · Einzelwert ändert nichts — Entscheidungen brauchen Trend + Adhärenz
   Ausführen:  node tools-dev/tests/program-engine.test.js
   ========================================================================== */
"use strict";
var path = require("path");
var ROOT = path.resolve(__dirname, "../..");

global.window = { MM: {} };
global.MM = global.window.MM;
global.localStorage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
global.document = { addEventListener: function () {}, dispatchEvent: function () {}, getElementById: function () { return null; } };
MM.store = { get: function (k, d) { return d; }, set: function () {}, remove: function () {} };
require(path.join(ROOT, "js/os/engines.js"));
var E = MM.engines;

var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

var BODY = { weightKg: 88, heightCm: 180, age: 38, activity: "moderate" };

group("P3.1 · Modes sind ECHT unterschiedlich (nicht nur Labels)");
(function () {
  var t = {};
  ["cut", "recomp", "build", "perform"].forEach(function (m) { t[m] = E.nutritionTargets(Object.assign({}, BODY, { mode: m })); });
  ok(t.cut.kcal < t.recomp.kcal, "CUT isst weniger als RECOMP (" + t.cut.kcal + " < " + t.recomp.kcal + ")");
  ok(t.build.kcal > t.recomp.kcal, "BUILD isst mehr als RECOMP (" + t.build.kcal + " > " + t.recomp.kcal + ")");
  ok(t.perform.kcal > t.recomp.kcal && t.perform.kcal < t.build.kcal, "PERFORM liegt zwischen Erhaltung und Aufbau");
  ok(t.recomp.kcal - t.cut.kcal >= 400, "CUT-Defizit ist substanziell (≥400 kcal), kein Kosmetik-Delta");
  ok(t.cut.protein > t.build.protein, "CUT schützt Muskeln mit MEHR Protein/kg als BUILD (" + t.cut.protein + "g > " + t.build.protein + "g)");
  ok(t.cut.protein === Math.round(88 * 2.2) && t.build.protein === Math.round(88 * 1.8), "Protein-Formeln exakt: 2,2 g/kg CUT · 1,8 g/kg BUILD");
  ["cut", "recomp", "build", "perform"].forEach(function (m) {
    ok(t[m].kcalRange && t[m].kcalRange[0] < t[m].kcal, m.toUpperCase() + " liefert Bereich statt Scheingenauigkeit");
  });
})();

group("P5.1 · Weekly Review: deterministische Entscheidungen");
(function () {
  // Gewicht stagniert, Taille sinkt, Umsetzung gut ⇒ KEEP (kein blinder Kalorien-Cut)
  var keep = E.nutritionAdjust({ mode: "recomp", weightKg: 88, weightTrend: -0.05, waistTrend: -0.4, adherencePct: 88, kcalTarget: 2600 });
  ok(keep.code === "keep", "Gewicht stabil + Taille runter + Adhärenz hoch ⇒ KEEP: " + keep.code);
  // Gewicht fällt zu schnell im CUT ⇒ Energie RAUF (Muskel-/Leistungsschutz)
  var fast = E.nutritionAdjust({ mode: "cut", weightKg: 88, weightTrend: -1.4, adherencePct: 90, kcalTarget: 2100 });
  ok(fast.code === "adjust_up", "−1,6 %KG/Woche im CUT ⇒ Energie leicht erhöhen: " + fast.code);
  ok(fast.newKcal > 2100, "neuer kcal-Wert liegt über dem alten (" + fast.newKcal + ")");
  // CUT ohne Fortschritt bei hoher Adhärenz ⇒ kontrollierte Reduktion (~8 %)
  var stall = E.nutritionAdjust({ mode: "cut", weightKg: 88, weightTrend: 0.0, waistTrend: 0.0, adherencePct: 92, kcalTarget: 2400 });
  ok(stall.code === "adjust_down" && stall.newKcal < 2400, "CUT-Stillstand trotz Umsetzung ⇒ −8 % (" + stall.newKcal + " kcal)");
  ok(Math.abs(stall.newKcal - 2400 * 0.92) <= 10, "Anpassung ist prozentual (~8 %), keine fixe kg-/kcal-Willkür");
  // Schlaf schlecht + Energie unten ⇒ RECOVERY FIRST, keine Verschärfung
  var rec = E.nutritionAdjust({ mode: "cut", weightKg: 88, weightTrend: 0.0, adherencePct: 90, energyLow: true, sleepBad: true, kcalTarget: 2400 });
  ok(rec.code === "recovery_first", "Schlaf+Energie unten ⇒ RECOVERY FIRST statt härterem Defizit");
  // BUILD: Gewicht+Taille zu schnell ⇒ Surplus zurück; Kraft stagniert bei stehendem Gewicht ⇒ leicht rauf
  var fatGain = E.nutritionAdjust({ mode: "build", weightKg: 80, weightTrend: 0.45, waistTrend: 0.7, adherencePct: 85, kcalTarget: 3100 });
  ok(fatGain.code === "adjust_down", "BUILD mit Taillen-Guardrail ⇒ Surplus zurücknehmen");
  var noGain = E.nutritionAdjust({ mode: "build", weightKg: 80, weightTrend: 0.0, strengthStalled: true, adherencePct: 85, kcalTarget: 3000 });
  ok(noGain.code === "adjust_up", "BUILD ohne Gewichts-/Kraftfortschritt bei guter Umsetzung ⇒ leicht erhöhen");
})();

group("P5.2 · „Plan nicht ausgeführt\" ≠ „Plan funktioniert nicht\"");
(function () {
  var exec = E.nutritionAdjust({ mode: "cut", weightKg: 88, weightTrend: 0.1, adherencePct: 55, kcalTarget: 2400 });
  ok(exec.code === "execution_first", "Adhärenz 55 % ⇒ EXECUTION FIRST — keine Kalorienänderung");
  ok(exec.newKcal == null, "… und es wird KEIN neuer kcal-Wert ausgegeben");
  ok(E.plateauCheck([], {}).reason === "insufficient_data", "plateauCheck verweigert Urteil ohne Historie (ehrlich)");
  var stalledHist = [
    { sets: [{ w: 80, r: 8 }, { w: 80, r: 8 }, { w: 80, r: 8 }] },
    { sets: [{ w: 80, r: 8 }, { w: 80, r: 8 }, { w: 80, r: 8 }] },
    { sets: [{ w: 80, r: 8 }, { w: 80, r: 8 }, { w: 80, r: 8 }] }
  ];
  var plateau = E.plateauCheck(stalledHist, { adherenceLow: true });
  ok(plateau.plateau === true && plateau.verdict === "EXECUTION", "echtes Kraft-Plateau + niedrige Adhärenz ⇒ Verdict EXECUTION, nicht Programmänderung");
  var plateauSleep = E.plateauCheck(stalledHist, { sleepBad: true });
  ok(plateauSleep.verdict === "RECOVERY", "Plateau + schlechter Schlaf ⇒ RECOVERY zuerst, nicht mehr Volumen");
})();

group("Ein schlechter Einzeltag ändert nichts (Trends > Einzelwerte)");
(function () {
  // weightTrend ist ein ROLLENDER Wochentrend — ein Tages-Spike erscheint hier
  // gedämpft. Simuliert: minimaler Trend ⇒ KEEP trotz „gestern +1 kg".
  var d = E.nutritionAdjust({ mode: "recomp", weightKg: 88, weightTrend: -0.08, waistTrend: 0.0, adherencePct: 85, kcalTarget: 2600 });
  ok(d.code === "keep", "minimaler Wochentrend ⇒ KEEP (kein Tages-Overreacting)");
  var noData = E.adaptiveTdee(2500, -0.3, 3);
  ok(noData === null, "adaptive TDEE verweigert Aussage bei <5 geloggten Tagen (ehrlich null)");
  ok(E.adaptiveTdee(2500, -0.5, 6) === 3050, "adaptive TDEE rechnet korrekt (2500 − (−0,5×7700/7) = 3050)");
})();

group("P3.2 · Jeden Tag eine Aufgabe — periodisiert, nicht jeden Tag hart");
(function () {
  var src = require("node:fs").readFileSync(path.join(ROOT, "js/os/program-view.js"), "utf8");
  var block = src.split("cut: [\"strength\"")[1] || "";
  ["cut", "recomp", "build", "perform"].forEach(function (m) {
    var re = new RegExp(m + ':\\s*\\[([^\\]]+)\\]');
    var match = re.exec(src);
    if (!match) { ok(false, m + ": Wochenmuster gefunden"); return; }
    var days = match[1].split(",").map(function (s) { return s.trim().replace(/"/g, ""); });
    ok(days.length === 7, m.toUpperCase() + ": alle 7 Tage haben einen Tagestyp (" + days.length + ")");
    ok(days.indexOf("recover") >= 0 || days.indexOf("reset") >= 0, m.toUpperCase() + ": enthält aktive Erholung — nicht 7× hart");
    ok(days.filter(function (d) { return d === "strength"; }).length >= 3, m.toUpperCase() + ": ≥3 Krafttage");
  });
  var b = /build:\s*\[([^\]]+)\]/.exec(src)[1].split(",").length;
  var c = /cut:\s*\[([^\]]+)\]/.exec(src)[1];
  ok(/engine/.test(c), "CUT-Woche enthält Engine-/Cardio-Tage (Bewegung statt nur Diät)");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
