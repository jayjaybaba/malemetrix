/* ==========================================================================
   MALEMETRIX PHASE 9.6 — Stack Builder 2.0 · Knowledge Completion · Cold Start
   Ausführen:  node tools-dev/tests/phase96.test.js
   ========================================================================== */
"use strict";
var path = require("path");
var ROOT = path.resolve(__dirname, "../..");
function loadEngines() {
  global.window = { MM: {} }; global.MM = global.window.MM; MM.store = { get: function (k, d) { return d; }, set: function () {}, remove: function () {} };
  delete require.cache[require.resolve(path.join(ROOT, "js/os/engines.js"))];
  require(path.join(ROOT, "js/os/engines.js"));
  return MM.engines;
}
function loadKnowledge() {
  global.window = { MM: {} }; global.MM = global.window.MM; MM.store = { get: function (k, d) { return d; }, set: function () {}, remove: function () {} };
  MM.intelligence = { util: { daysBetween: function () { return 10; }, todayYmd: function () { return "2026-07-24"; } } };
  delete require.cache[require.resolve(path.join(ROOT, "js/os/intelligence/knowledge.js"))];
  require(path.join(ROOT, "js/os/intelligence/knowledge.js"));
  return MM.intelligence.knowledge;
}
var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

/* ================= 1) STACK TRIAGE (§13 Wow-Moment) ================= */
group("Stack triage · KEEP/OPTIONAL/REMOVE, aktiv reduzierend");
(function () {
  var E = loadEngines();
  var cur = "Kreatin, Whey, Omega-3, Vitamin D, BCAA, Tribulus Testo Booster, Fatburner, Multivitamin, Magnesium, Koffein, Ashwagandha";
  var t = E.analyzeCurrentStack(cur, { mode: "build" });
  ok(t.total === 11, "11 Eingaben erkannt");
  ok(t.remove.length === 4, "4 Low-Value gestrichen (BCAA/Booster/Fatburner/Multi)");
  ok(t.remove.some(function (r) { return /BCAA/i.test(r.name); }), "BCAA gestrichen");
  ok(t.remove.some(function (r) { return /Booster/i.test(r.name); }), "Testo-Booster gestrichen");
  ok(t.keep.some(function (k) { return /Kreatin/i.test(k.name); }), "Kreatin behalten");
  ok(t.monthlySaved >= 50, "Streichen spart ≥50 €/Mon. (" + t.monthlySaved + ")");
  ok(t.summary.indexOf("Behalte") >= 0 && t.summary.indexOf("streiche") >= 0, "Zusammenfassung nennt behalten+streichen");
  // Kontext senkt Nutzen: Protein gedeckt + Fisch 2×/Woche ⇒ Whey/Omega-3 optional, nicht keep.
  var t2 = E.analyzeCurrentStack("Whey, Omega-3", { mode: "build", proteinCovered: true, fishTwiceWeek: true });
  ok(t2.keep.length === 0 && t2.optional.length === 2, "Kontext macht Whey+Omega-3 optional (kein blindes Behalten)");
  // Unbekanntes wird ehrlich als nicht bewertbar markiert, nie empfohlen.
  var t3 = E.analyzeCurrentStack("Kreatin, Schlangenöl-XR9000", { mode: "build" });
  ok(t3.unknown.length === 1 && t3.unknown[0].input.indexOf("Schlangen") >= 0, "unbekanntes Produkt ⇒ NICHT BEWERTBAR (nicht empfohlen)");
  // Dopplung erkennen.
  var t4 = E.analyzeCurrentStack("Koffein, Pre-Workout, Kreatin", { mode: "build" });
  ok(t4.dupes.length >= 1, "Doppel-Koffeinquelle als Dopplung erkannt");
  // Keine Supplement-Inflation: leerer Input ⇒ nichts erfunden.
  var t5 = E.analyzeCurrentStack("", { mode: "build" });
  ok(t5.total === 0 && t5.keep.length === 0 && t5.remove.length === 0, "leerer Stack ⇒ keine erfundenen Empfehlungen");
})();

/* ================= 2) STACK TIER-GRUPPIERUNG + Kontext-Reduktion ================= */
group("Stack strategy · ESSENTIAL/OPTIMAL/ADVANCED, Kontext reduziert");
(function () {
  var E = loadEngines();
  var s = E.stackStrategy({ mode: "build", budget: "maximal" });
  ok(s.tiers && s.tiers.ESSENTIAL.length >= 3, "ESSENTIAL enthält Fundament (Kreatin/Protein/Omega/VitD)");
  ok(s.tiers.ESSENTIAL.some(function (x) { return x.id === "creatine"; }), "Kreatin in ESSENTIAL");
  ok(s.items.every(function (x) { return x.tier !== "low_value"; }), "keine Low-Value-Empfehlung");
  // Kontext reduziert: genug Fisch ⇒ Omega-3 nicht empfohlen.
  var s2 = E.stackStrategy({ mode: "build", budget: "optimal", fishTwiceWeek: true });
  ok(!s2.items.some(function (x) { return x.id === "omega3"; }), "Fisch 2×/Woche ⇒ Omega-3 rausgefiltert (reduziert statt aufgebläht)");
  ok(s2.skipped.some(function (x) { return /Omega/i.test(x.name); }), "Omega-3 erscheint in 'bewusst nicht empfohlen'");
  // Enhanced-Framework strikt getrennt: keine Supplement-IDs, keine Dosen.
  ok(E.ENHANCED_FRAMEWORK && /keine individuellen Dosierungspläne/i.test(E.ENHANCED_FRAMEWORK.boundary), "Enhanced-Grenze: keine individuellen Dosierungspläne");
  ok(E.ENHANCED_FRAMEWORK.classes.every(function (c) { return !/\d+ ?mg|\d+ ?ml|\d+ ?iu|\d+ ?ie/i.test(JSON.stringify(c)); }), "Enhanced-Klassen enthalten KEINE Dosierungen");
})();

/* ================= 3) KNOWLEDGE COMPLETION (§1/§15) ================= */
group("Knowledge · mehr Quellen, Gate hält, nichts erfunden");
(function () {
  var K = loadKnowledge();
  var cov = K.coverage();
  ok(cov.resolvedSources >= 7, "≥7 aufgelöste Landmark-Quellen (" + cov.resolvedSources + ")");
  ok(K.VERSION >= 3, "Knowledge-Version ≥3 (§30)");
  // Neue Quellen real angehängt.
  ok(K.citations(K.byId("hypertrophy_volume")).some(function (s) { return s.doi === "10.1080/02640414.2016.1210197"; }), "Schoenfeld 2017 an hypertrophy_volume");
  ok(K.citations(K.byId("recovery_sleep")).some(function (s) { return s.doi === "10.5664/jcsm.4758"; }), "Watson 2015 an recovery_sleep");
  ok(K.citations(K.byId("omega3")).some(function (s) { return s.doi === "10.1093/eurheartj/ehz455"; }), "ESC/EAS an omega3");
  // Gate: unbelegte Objekte bleiben ohne Zitat.
  var pl = K.byId("plateau");
  ok(K.pubState(pl) !== "PUBLISHED" && K.citations(pl).length === 0, "unbelegtes Objekt bleibt REVIEWED ohne Zitat");
  // Keine erfundenen Quellen (jede Zitation hat url/doi).
  ok(!K.all().some(function (o) { return K.citations(o).some(function (s) { return !s || (!s.url && !s.doi); }); }), "keine Zitation ohne echte url/doi");
  // Publikations-Gate: PUBLISHED nur wenn ALLE Kern-Claims belegt.
  ok(K.pubState(K.byId("protein_target")) === "PUBLISHED", "protein_target PUBLISHED (alle Claims belegt)");
})();

console.log("\n──────────────────────────────");
console.log((failed ? "✗ " : "✓ ") + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
