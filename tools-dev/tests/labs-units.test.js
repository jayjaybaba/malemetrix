/* ==========================================================================
   MALEMETRIX P11/P6 — BLOODWORK: Einheiten-Normalisierung (Verhaltenstests)
   Lädt das echte js/os/labs-data.js und prüft die Konvertierungen, auf denen
   jede Interpretation aufbaut. Falsche Faktoren = falsche Gesundheitsaussage,
   deshalb hier exakt eingefroren (Referenz: Standard-Umrechnungsfaktoren).
   Ausführen:  node tools-dev/tests/labs-units.test.js
   ========================================================================== */
"use strict";
var path = require("path");
var ROOT = path.resolve(__dirname, "../..");
global.window = { MM: {} };
global.MM = global.window.MM;
require(path.join(ROOT, "js/os/labs-data.js"));
var L = MM.labsData;

var passed = 0, failed = 0;
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }
function near(a, b, tol) { return Math.abs(a - b) <= (tol || 0.6); }

console.log("== Einheiten → kanonisch (echte Faktoren) ==");
// Glukose: 5.6 mmol/L ≈ 100.9 mg/dL (×18.016)
var g = L.toCanonical("fasting_glucose", 5.6, "mmol/L");
ok(g && near(g.value, 100.9), "Glukose 5,6 mmol/L → ~101 mg/dL (" + (g && g.value) + ")");
// LDL: 3.0 mmol/L ≈ 116 mg/dL (×38.67)
var ldl = L.toCanonical("ldl_c", 3.0, "mmol/L");
ok(ldl && near(ldl.value, 116, 1), "LDL 3,0 mmol/L → ~116 mg/dL (" + (ldl && ldl.value) + ")");
// Triglyceride: 1.7 mmol/L ≈ 150.6 mg/dL (×88.57)
var tg = L.toCanonical("triglycerides", 1.7, "mmol/L");
ok(tg && near(tg.value, 150.6, 1), "TG 1,7 mmol/L → ~151 mg/dL (" + (tg && tg.value) + ")");
// Kreatinin: 88 µmol/L ≈ 1.0 mg/dL (×0.0113)
var cr = L.toCanonical("creatinine", 88, "µmol/L");
ok(cr && near(cr.value, 0.99, 0.05), "Kreatinin 88 µmol/L → ~1,0 mg/dL (" + (cr && cr.value) + ")");
// ApoB: 1.1 g/L = 110 mg/dL (×100)
var ab = L.toCanonical("apo_b", 1.1, "g/L");
ok(ab && near(ab.value, 110, 0.5), "ApoB 1,1 g/L → 110 mg/dL (" + (ab && ab.value) + ")");
// Identität: mg/dL bleibt mg/dL
var idc = L.toCanonical("ldl_c", 120, "mg/dL");
ok(idc && idc.value === 120, "mg/dL → mg/dL unverändert");

console.log("\n== Ehrlichkeit: keine falsche Auto-Konvertierung ==");
// HbA1c IFCC (mmol/mol) ↔ NGSP (%) ist NICHT linear — Engine darf es nicht linear faken.
var a1c = L.toCanonical("hba1c", 42, "mmol/mol");
ok(!a1c || a1c.value == null || a1c.refused || a1c.unit !== "%" || a1c.value === 42,
  "HbA1c mmol/mol wird NICHT linear nach % gefälscht (Ergebnis: " + JSON.stringify(a1c) + ")");
var pct = L.toCanonical("hba1c", 5.4, "%");
ok(pct && pct.value === 5.4, "HbA1c in % bleibt unangetastet");

console.log("\n== Marker-Basis: Kategorien vollständig, Prinzipien verankert ==");
["cardiovascular", "metabolic"].forEach(function (c) {
  ok(L.byCategory(c).length >= 3, "Kategorie " + c + " hat ≥3 Marker (" + L.byCategory(c).length + ")");
});
var apo = L.byCategory("cardiovascular").find(function (m) { return m.id === "apo_b"; });
ok(apo && /Trend/.test(apo.context), "ApoB-Kontext betont Trend > Einzelwert");
var lpa = L.byCategory("cardiovascular").find(function (m) { return m.id === "lp_a"; });
ok(lpa && /genetisch|Einmal/.test(lpa.why + lpa.context), "Lp(a) ehrlich als weitgehend genetisch/Einmalmessung erklärt");
var src = require("node:fs").readFileSync(path.join(ROOT, "js/os/labs-data.js"), "utf8");
ok(/Optimal-Range-Erfindung/.test(src) && /reference-Ranges kommen IMMER vom Labor/.test(src),
  "Prinzip verankert: Referenzbereiche kommen vom Labor — keine erfundenen Optimal Ranges");
ok(/KEIN Diagnose-Tool/i.test(src) && /KEINE Krebsdiagnose/.test(src),
  "Prinzip verankert: kein Diagnose-Tool, PSA explizit ohne Krebsdiagnose-Anspruch");
ok(!/optimalRange|targetRange.*longevity/i.test(src), "kein Code-Feld für erfundene Optimalbereiche");

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
