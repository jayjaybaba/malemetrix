/* ==========================================================================
   Generation 2 — Wochencheck: Regelwerk, Sicherheitsgrenzen, Begründungen

   Deckt die Wochencheck-Szenarien aus dem Auftrag (§33) ab. Kernaussagen:
   „Plan bleibt unverändert" ist valide; Sicherheitsregeln gewinnen immer;
   jede Entscheidung trägt eine sichtbare Begründung; Änderungen laufen nur
   über die Versionierung mit Regel-ID und Wochencheck-Referenz.
   ========================================================================== */
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const input = require(path.join(ROOT, "js", "simple", "plan-input.js"));
const model = require(path.join(ROOT, "js", "simple", "plan-model.js"));
const engine = require(path.join(ROOT, "js", "simple", "plan-engine.js"));
const weekly = require(path.join(ROOT, "js", "simple", "weekly-check.js"));

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } };
const group = (g) => console.log("\n== " + g + " ==");

function mkPlan() {
  const tg = { date: "2026-08-01T10:00:00Z", current_kg: 94, target_kg: 80, height_cm: 182,
    kind: "realistic", direction: "cut", months: 6, exp: "mid", days: 3, mode: "natural",
    equip: "gym", age: 34, activity: "leicht", diet: "misch" };
  const r = engine.createPlan(input.collect({ transformGoal: tg, checkResult: null, answers: { weekdays: [1, 3, 5] } }), "2026-08-10");
  r.plan.status = "active";
  return r.plan;
}
/* Gewichtsreihe: startKg, tägliche Rate über 14 Tage bis "today" */
function weights(startKg, perDay, todayYmd) {
  const out = [];
  for (let i = 13; i >= 0; i--) {
    out.push({ date: model.addDays(todayYmd, -i), kg: Math.round((startKg + (13 - i) * perDay) * 10) / 10 });
  }
  return out;
}
const TODAY = "2026-09-07";
function ctx(over) {
  return Object.assign({ plan: mkPlan(), week: 4, todayYmd: TODAY,
    weights: weights(92, -0.07, TODAY),      // ~0.49 kg/Woche — nahe Planrate
    answers: { trainingsDone: 3, nutritionAdherence: "gut", hunger: "normal", energy: "gut", performance: "stabil", circumstances: [] } }, over || {});
}

group("Trend-Berechnung (geglättet, keine Ein-Punkt-Panik)");
{
  const t = weekly.trend(weights(92, -0.07, TODAY), TODAY);
  ok(t && Math.abs(t.deltaPerWeek + 0.49) < 0.1, "Wochenrate aus 7-Tage-Mitteln (" + t.deltaPerWeek + ")");
  ok(weekly.trend([{ date: "2026-09-06", kg: 91 }], TODAY) === null, "ein einzelner Messwert ergibt keinen Trend");
  ok(weekly.trend([], TODAY) === null, "keine Daten → kein Trend");
}

group("Trend im Zielkorridor → Plan bleibt unverändert");
{
  const d = weekly.decide(ctx());
  ok(d.rule === "wr_on_track" && d.decision === "keep" && d.changes === null, "keine Änderung");
  ok(d.reason.de.indexOf("ändern wir diese Woche nichts") > 0, "Begründung wie im Auftrag");
  ok(!!d.reason.en, "Begründung auch EN");
}

group("Stagnation bei guter Umsetzung → moderate Kalorienreduktion");
{
  const d = weekly.decide(ctx({ weights: weights(91, 0, TODAY) }));
  ok(d.rule === "wr_stall_adherent" && d.decision === "kcal_down", "Regel greift");
  const kcalPath = d.changes && d.changes["nutrition.calorieTarget"];
  ok(typeof kcalPath === "number" && kcalPath < 3000, "neues Kalorienziel gesetzt");
  ok(d.reason.de.indexOf("120 kcal") > 0, "Begründung nennt die konkrete Änderung");
}

group("Stagnation bei schlechter Umsetzung → NICHT verschärfen");
{
  const d = weekly.decide(ctx({ weights: weights(91, 0, TODAY), answers: { trainingsDone: 1, nutritionAdherence: "schlecht", hunger: "normal", energy: "gut", performance: "stabil", circumstances: [] } }));
  ok(d.rule === "wr_stall_execution" && d.decision === "keep" && d.changes === null, "keine Kalorienänderung");
  ok(d.reason.de.indexOf("NICHT verschärft") > 0, "Begründung erklärt warum");
}

group("Verlust zu schnell → Kalorien HOCH (Sicherheit)");
{
  const d = weekly.decide(ctx({ weights: weights(93, -0.16, TODAY) }));   // ~1.1 kg/Woche
  ok(d.rule === "wr_too_fast" && d.decision === "kcal_up", "Sicherheitsregel greift");
  ok(d.changes["nutrition.calorieTarget"] > mkPlan().nutrition.calorieTarget, "Ziel steigt");
}

group("Hunger hoch + Energie schlecht → Defizit entschärfen");
{
  const d = weekly.decide(ctx({ answers: { trainingsDone: 3, nutritionAdherence: "gut", hunger: "hoch", energy: "schlecht", performance: "stabil", circumstances: [] } }));
  ok(d.rule === "wr_hunger" && d.decision === "kcal_up", "Hunger-Regel greift");
}

group("Leistung sinkt + Regeneration schlecht → Volumen runter, keine kcal-Änderung");
{
  const d = weekly.decide(ctx({ answers: { trainingsDone: 3, nutritionAdherence: "gut", hunger: "normal", energy: "schlecht", performance: "schlechter", circumstances: [] } }));
  ok(d.rule === "wr_overreach" && d.decision === "volume_down" && d.changes === null, "Deload statt Diätschraube");
}

group("Krankheit → Erholung zuerst, nie verschärfen");
{
  const d = weekly.decide(ctx({ weights: weights(91, 0, TODAY), answers: { trainingsDone: 0, nutritionAdherence: "schlecht", hunger: "normal", energy: "schlecht", performance: "schlechter", circumstances: ["krank"] } }));
  ok(d.rule === "wr_sick" && d.changes === null, "Krankheit dominiert alle anderen Regeln");
  ok(d.safetyNote === "krankheit", "als Sicherheitsentscheidung markiert");
}

group("Verletzung → Übungen tauschen, ärztlicher Hinweis");
{
  const d = weekly.decide(ctx({ answers: { trainingsDone: 2, nutritionAdherence: "gut", hunger: "normal", energy: "gut", performance: "stabil", circumstances: ["verletzung"] } }));
  ok(d.rule === "wr_injury" && d.reason.de.indexOf("ärztlich") > 0, "Verletzungsregel + Arzthinweis");
}

group("Unzureichende Daten → keine Änderung, Messen wird Aufgabe");
{
  const d = weekly.decide(ctx({ weights: [] }));
  ok(d.rule === "wr_no_data" && d.decision === "keep" && d.changes === null, "keine Datenbasis → keine Entscheidung");
}

group("Kalorien-Untergrenze → Schrittziel statt Kalorien");
{
  const p = mkPlan();
  p.nutrition.calorieTarget = 1500;   // bereits am Boden
  const d = weekly.decide(ctx({ plan: p, weights: weights(91, 0, TODAY) }));
  ok(d.rule === "wr_stall_steps" && d.decision === "steps_up", "Ausweich-Regel: Schritte +1000");
  ok(d.changes["dailyTargets.steps"] === p.dailyTargets.steps + 1000, "Schrittziel korrekt erhöht");
}

group("Anwendung über die Versionierung (Ende-zu-Ende)");
{
  const plan = mkPlan();
  const d = weekly.decide(ctx({ plan, weights: weights(91, 0, TODAY) }));
  const r = model.applyChange(plan, d.changes, { reason: d.reason.de, source: "system", rule: d.rule, checkinId: "ci:w4:" + TODAY, now: "2026-09-07T18:00:00Z" });
  ok(r.ok && r.plan.version === 2, "Änderung erzeugt Version 2");
  ok(r.entry.rule === "wr_stall_adherent" && r.entry.checkinId === "ci:w4:" + TODAY, "Historie trägt Regel + Wochencheck");
  const ci = weekly.buildCheckin({ plan, week: 4, todayYmd: TODAY, answers: {} }, d);
  ok(ci.id === "ci:w4:" + TODAY && ci.changed === true && ci.planVersionBefore === 1, "Check-in-Datensatz vollständig");
}

group("Aufbau-Stagnation → Kalorien hoch");
{
  const tg = { date: "2026-08-01T10:00:00Z", current_kg: 70, target_kg: 75, height_cm: 178,
    direction: "gain", exp: "neu", days: 3, mode: "natural", equip: "gym", age: 25, activity: "moderat" };
  const r = engine.createPlan(input.collect({ transformGoal: tg, checkResult: null, answers: { weekdays: [1, 3, 5] } }), "2026-08-10");
  const d = weekly.decide({ plan: r.plan, week: 4, todayYmd: TODAY, weights: weights(70, 0, TODAY),
    answers: { trainingsDone: 3, nutritionAdherence: "gut", hunger: "normal", energy: "gut", performance: "stabil", circumstances: [] } });
  ok(d.rule === "wr_gain_stall" && d.decision === "kcal_up", "Aufbau: +120 kcal bei Stagnation");
}

console.log("\n" + (failed ? "FAILED" : "OK") + " — " + passed + " bestanden, " + failed + " fehlgeschlagen");
process.exit(failed ? 1 : 0);
