/* ==========================================================================
   Generation 2 — Planmodell: Struktur, Grenzen, Versionierung

   Geprüft wird der Kern der Vereinfachung: ein Plan ist ein versioniertes
   Dokument mit harten Sicherheitsgrenzen. Änderungen brauchen Begründung
   und Quelle, verletzen nie die Leitplanken, und vergangene Stände bleiben
   rekonstruierbar (nichts wird umgeschrieben).
   ========================================================================== */
const path = require("path");
const model = require(path.join(__dirname, "..", "..", "js", "simple", "plan-model.js"));

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } };
const group = (g) => console.log("\n== " + g + " ==");

function basePlan() {
  const p = model.emptyPlan();
  p.id = "plan:2026-08-10:test";
  p.status = "active";
  p.startDate = "2026-08-10";
  p.endDate = model.addDays("2026-08-10", 83);
  p.selectedTransformation.startWeightKg = 94;
  p.selectedTransformation.finalTargetWeightKg = 80;
  p.selectedTransformation.expectedTotalWeeks = 26;
  p.phaseGoal.week12TargetMinKg = 86;
  p.phaseGoal.week12TargetMaxKg = 88;
  p.training.daysPerWeek = 3;
  p.training.weekdays = [1, 3, 5];
  p.training.maximumSessionMinutes = 60;
  p.nutrition.calorieTarget = 2150;
  p.nutrition.calorieRangeMin = 2050;
  p.nutrition.calorieRangeMax = 2250;
  p.nutrition.proteinTargetGrams = 180;
  p.dailyTargets.steps = 8000;
  p.createdAt = "2026-08-10T08:00:00.000Z";
  return p;
}

group("Struktur");
{
  const p = model.emptyPlan();
  ok(p.modelVersion === "simple-plan-v1", "modelVersion gesetzt");
  ok(p.version === 1 && p.status === "draft", "startet als draft v1");
  ok(p.phaseGoal.durationWeeks === 12, "Phase ist fest 12 Wochen");
  ok(Array.isArray(p.scoreContext.relevantFactors), "scoreContext vorhanden");
  ok(p.legacySource.migrated === false, "legacySource vorhanden");
  const s = model.emptySnapshot();
  ok(s.sourceVersion === "malemetrix-os-v1" && Array.isArray(s.migrationWarnings), "Snapshot-Vertrag §27.3");
}

group("Datums-Arithmetik");
{
  ok(model.addDays("2026-08-10", 83) === "2026-11-01", "12 Wochen über Monatsgrenzen");
  ok(model.addDays("2026-12-30", 5) === "2027-01-04", "Jahreswechsel");
}

group("Validierung — gültiger Plan");
{
  const v = model.validate(basePlan());
  ok(v.ok, "Basisplan ist gültig: " + v.errors.join("; "));
}

group("Validierung — harte Grenzen");
{
  let p = basePlan(); p.nutrition.calorieTarget = 1200;
  ok(!model.validate(p).ok, "kcal unter 1500 abgelehnt");
  p = basePlan(); p.nutrition.calorieTarget = 5200;
  ok(!model.validate(p).ok, "kcal über 4500 abgelehnt");
  p = basePlan(); p.training.daysPerWeek = 6;
  ok(!model.validate(p).ok, "6 Trainingstage abgelehnt (Gen 2: 2-4)");
  p = basePlan(); p.training.weekdays = [1, 3];
  ok(!model.validate(p).ok, "weekdays ≠ daysPerWeek abgelehnt");
  p = basePlan(); p.dailyTargets.steps = 2000;
  ok(!model.validate(p).ok, "Schrittziel unter 4000 abgelehnt");
  p = basePlan(); p.endDate = "2026-12-31";
  ok(!model.validate(p).ok, "endDate ≠ startDate+83 abgelehnt");
  p = basePlan(); p.phaseGoal.week12TargetMinKg = 80; // 14 kg in 12 Wochen bei 94 kg
  ok(!model.validate(p).ok, ">1 % Körpergewicht/Woche abgelehnt");
  p = basePlan(); p.nutrition.proteinTargetGrams = 40;
  ok(!model.validate(p).ok, "Proteinziel unplausibel niedrig abgelehnt");
}

group("Versionierung — Pflichtangaben");
{
  const p = basePlan();
  let r = model.applyChange(p, { "nutrition.calorieTarget": 2030 }, { source: "system" });
  ok(!r.ok, "ohne Begründung abgelehnt");
  r = model.applyChange(p, { "nutrition.calorieTarget": 2030 }, { reason: "Stagnation", source: "robot" });
  ok(!r.ok, "unbekannte Quelle abgelehnt");
  r = model.applyChange(p, {}, { reason: "x", source: "user" });
  ok(!r.ok, "leere Änderungsmenge abgelehnt");
}

group("Versionierung — korrekte Änderung");
{
  const p = basePlan();
  const r = model.applyChange(p, { "nutrition.calorieTarget": 2030 },
    { reason: "Zwei Wochen Stagnation bei guter Umsetzung", source: "system", rule: "wr_stall_adherent", checkinId: "ci:6", now: "2026-09-20T18:00:00.000Z" });
  ok(r.ok, "Änderung akzeptiert");
  ok(r.plan.version === 2 && p.version === 1, "neue Version, Original unangetastet");
  ok(r.plan.nutrition.calorieTarget === 2030, "neuer Wert gesetzt");
  const c = r.entry.changes[0];
  ok(c.from === 2150 && c.to === 2030, "Historie: vorheriger + neuer Wert");
  ok(r.entry.reason && r.entry.source === "system" && r.entry.rule === "wr_stall_adherent" && r.entry.checkinId === "ci:6", "Historie: Grund, Quelle, Regel, Wochencheck");
  ok(r.entry.changedAt === "2026-09-20T18:00:00.000Z", "Historie: Datum");
}

group("Versionierung — Leitplanken");
{
  const p = basePlan();
  let r = model.applyChange(p, { "nutrition.calorieTarget": 1700 }, { reason: "x", source: "system" });
  ok(!r.ok, "Kaloriensprung 450 kcal abgelehnt (max 250)");
  r = model.applyChange(p, { "dailyTargets.steps": 12000 }, { reason: "x", source: "system" });
  ok(!r.ok, "Schrittsprung 4000 abgelehnt (max 2000)");
  r = model.applyChange(p, { "nutrition.calorieTarget": 1400 }, { reason: "x", source: "system" });
  ok(!r.ok && p.nutrition.calorieTarget === 2150, "abgelehnte Änderung lässt Plan unverändert");
  r = model.applyChange(p, { "nutrition.exclusions": ["nüsse"] }, { reason: "x", source: "user" });
  ok(!r.ok, "nicht-versionierter Pfad über applyChange abgelehnt");
  r = model.applyChange(p, { "nutrition.calorieTarget": 2150 }, { reason: "x", source: "user" });
  ok(!r.ok, "reiner No-Op erzeugt keine neue Version");
}

group("Historische Sicht (nichts wird umgeschrieben)");
{
  const p0 = basePlan();
  const r1 = model.applyChange(p0, { "nutrition.calorieTarget": 2030 }, { reason: "a", source: "system", now: "2026-09-01T00:00:00Z" });
  const r2 = model.applyChange(r1.plan, { "dailyTargets.steps": 9000 }, { reason: "b", source: "system", now: "2026-09-08T00:00:00Z" });
  const hist = [r1.entry, r2.entry];
  const v1 = model.planAtVersion(r2.plan, hist, 1);
  ok(v1.nutrition.calorieTarget === 2150 && v1.dailyTargets.steps === 8000, "Version 1 rekonstruiert");
  const v2 = model.planAtVersion(r2.plan, hist, 2);
  ok(v2.nutrition.calorieTarget === 2030 && v2.dailyTargets.steps === 8000, "Version 2 rekonstruiert");
  ok(r2.plan.nutrition.calorieTarget === 2030 && r2.plan.dailyTargets.steps === 9000, "aktueller Stand unberührt");
}

console.log("\n" + (failed ? "FAILED" : "OK") + " — " + passed + " bestanden, " + failed + " fehlgeschlagen");
process.exit(failed ? 1 : 0);
