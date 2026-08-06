/* ==========================================================================
   Generation 2 — Future Split: Kursprojektion (project())

   Deckt die 14 Fixtures des Future-Split-Auftrags ab. Kernaussagen:
   ohne Trend keine Zahlen; Korridore statt Einzelwerte; Cut und Gain mit
   invertiertem Vorzeichen; Sicherheitsschwelle identisch mit wr_too_fast
   (Status und Regel widersprechen sich nie); keine Division durch null;
   project() mutiert nichts und ändert decide() nicht.
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

const TODAY = "2026-09-07";

function mkPlan() {
  const tg = { date: "2026-08-01T10:00:00Z", current_kg: 94, target_kg: 80, height_cm: 182,
    kind: "realistic", direction: "cut", months: 6, exp: "mid", days: 3, mode: "natural",
    equip: "gym", age: 34, activity: "leicht", diet: "misch" };
  const r = engine.createPlan(input.collect({ transformGoal: tg, checkResult: null, answers: { weekdays: [1, 3, 5] } }), "2026-08-10");
  r.plan.status = "active";
  // Feste Zielwerte, damit die Fixture-Rechnung exakt und lesbar bleibt:
  r.plan.phaseGoal.week12TargetMinKg = 89;
  r.plan.phaseGoal.week12TargetMaxKg = 91;   // Planrate: (90-94)/12 = -0,33 kg/Wo
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
function ctx(over) {
  return Object.assign({ plan: mkPlan(), week: 4, todayYmd: TODAY,
    weights: weights(93, -0.05, TODAY),
    answers: { trainingsDone: 3, nutritionAdherence: "gut", hunger: "normal", energy: "gut", performance: "stabil", circumstances: [] } }, over || {});
}
function gainPlan(tMin, tMax) {
  const p = mkPlan();
  p.derived.cut = false;
  p.phaseGoal.week12TargetMinKg = tMin;
  p.phaseGoal.week12TargetMaxKg = tMax;
  return p;
}

group("1 — Cut auf Kurs: Korridore überlappen, kein Gap");
{
  const c = ctx();                          // Trend ~-0,35, Projektion ~89,7 in Zielkorridor 89-91
  const f = weekly.project(c);
  ok(f.status === "on_course", "Status on_course (" + f.status + ")");
  ok(f.gap === null, "kein Gap bei Überlappung");
  ok(f.currentCourse.minKg <= 91 && f.currentCourse.maxKg >= 89, "Projektionskorridor überlappt Zielkorridor (" + f.currentCourse.minKg + "-" + f.currentCourse.maxKg + ")");
  ok(f.dataQuality === "high", "14 Messpunkte → Datenqualität high");
  ok(f.headline.de.length > 0 && f.headline.en.length > 0, "Headline DE und EN vorhanden");
  const d = weekly.decide(c);
  ok(d.rule === "wr_on_track", "decide() unverändert: wr_on_track (Regression)");
}

group("2 — Cut leicht hinter Ziel");
{
  const f = weekly.project(ctx({ weights: weights(93.4, -0.02, TODAY) }));   // Projektion ~92,1
  ok(f.status === "slightly_behind", "Status slightly_behind (" + f.status + ")");
  ok(f.gap && f.gap.kgBehindMin > 0 && f.gap.kgBehindMin <= 1.5, "Gap in kg klein (" + (f.gap && f.gap.kgBehindMin) + ")");
  ok(f.gap.weeksBehindMin >= 1, "Wochenabweichung mindestens 1 (" + f.gap.weeksBehindMin + ")");
}

group("3 — Cut deutlich hinter Ziel (Stagnation)");
{
  const c = ctx({ weights: weights(94, 0, TODAY),
    answers: { trainingsDone: 1, nutritionAdherence: "schlecht", hunger: "normal", energy: "gut", performance: "stabil", circumstances: [] } });
  const f = weekly.project(c);
  ok(f.status === "behind_target", "Status behind_target (" + f.status + ")");
  ok(f.gap.kgBehindMin > 1.5, "Gap deutlich (" + f.gap.kgBehindMin + " kg)");
  const d = weekly.decide(c);
  ok(d.rule === "wr_stall_execution" && d.changes === null, "decide() unverändert: Umsetzung vor Verschärfung (Regression)");
}

group("4 — Verlust zu schnell: Status und wr_too_fast stimmen überein");
{
  const c = ctx({ weights: weights(93, -0.16, TODAY) });   // ~1,12 kg/Wo > 1,1 % von 94
  const f = weekly.project(c);
  ok(f.status === "loss_too_fast", "Status loss_too_fast (" + f.status + ")");
  const d = weekly.decide(c);
  ok(d.rule === "wr_too_fast" && d.decision === "kcal_up", "decide() greift mit derselben Schwelle: wr_too_fast");
}

group("5 — Cut voraus, aber sicher");
{
  const f = weekly.project(ctx({ weights: weights(90, -0.1, TODAY) }));   // ~0,7 kg/Wo, Projektion ~83
  ok(f.status === "ahead_but_safe", "Status ahead_but_safe (" + f.status + ")");
  ok(f.gap === null, "voraus → kein 'hinter'-Gap");
}

group("6 — Gain: Projektion unter Ziel = hinter (Vorzeichen invertiert)");
{
  const f = weekly.project(ctx({ plan: gainPlan(97, 98), weights: weights(94, 0, TODAY) }));
  ok(f.status === "behind_target", "Status behind_target, NICHT ahead (" + f.status + ")");
  ok(f.gap && f.gap.kgBehindMin > 1.5, "Gap positiv gerechnet (" + (f.gap && f.gap.kgBehindMin) + " kg)");
}

group("7 — Gain: Gewicht über Zielkorridor ist nicht automatisch positiv");
{
  const f = weekly.project(ctx({ plan: gainPlan(95, 96), weights: weights(98, 0, TODAY) }));
  ok(f.status !== "on_course", "Überschießen wird nicht als 'im Zielkorridor' gewertet (" + f.status + ")");
  ok(f.status === "ahead_but_safe" && f.gap === null, "neutral als 'vor dem Zielkurs' eingeordnet, ohne Erfolgs-Gap");
}

group("8 — Ein einzelner Gewichtswert: keine Zahlen, keine Platzhalter");
{
  const f = weekly.project(ctx({ weights: [{ date: "2026-09-06", kg: 91 }] }));
  ok(f.status === "insufficient_data", "Status insufficient_data");
  ok(f.currentCourse === null && f.gap === null, "keine Projektion, kein Gap");
  ok(f.dataQuality === "low", "Datenqualität low");
  ok(f.targetCourse.minKg === 89 && f.targetCourse.maxKg === 91, "Zielkorridor bleibt sichtbar");
  const d = weekly.decide(ctx({ weights: [{ date: "2026-09-06", kg: 91 }] }));
  ok(d.rule === "wr_no_data", "decide() unverändert: wr_no_data (Regression)");
}

group("9 — Datenqualität bestimmt Korridorbreite");
{
  const two = [-1, -3, -8, -10].map(d => ({ date: model.addDays(TODAY, d), kg: 93 }));
  const six = [-1, -3, -5, -8, -10, -12].map(d => ({ date: model.addDays(TODAY, d), kg: 93 }));
  const fm = weekly.project(ctx({ weights: two }));
  const fh = weekly.project(ctx({ weights: six }));
  ok(fm.dataQuality === "medium", "4 Punkte → medium");
  ok(fh.dataQuality === "high", "6 Punkte → high");
  const wm = Math.round((fm.currentCourse.maxKg - fm.currentCourse.minKg) * 10) / 10;
  const wh = Math.round((fh.currentCourse.maxKg - fh.currentCourse.minKg) * 10) / 10;
  ok(wm === 1.8 && wh === 1, "Korridorbreite medium 1,8 / high 1,0 (" + wm + " / " + wh + ")");
  ok(wm > wh, "weniger Daten → breiterer Korridor");
}

group("10 — Ziel nicht mehr seriös erreichbar → verlängern statt erzwingen");
{
  const f = weekly.project(ctx({ week: 10, weights: weights(94, 0, TODAY) }));   // 3 kg in 2 Wochen nötig
  ok(f.status === "goal_requires_extension", "Status goal_requires_extension (" + f.status + ")");
  ok(f.targetCourse.stillPlausible === false, "stillPlausible false");
}

group("11 — Planrate 0: keine Division, kein Infinity");
{
  const p = mkPlan();
  p.phaseGoal.week12TargetMinKg = 93.5;
  p.phaseGoal.week12TargetMaxKg = 94.5;    // Mitte = Startgewicht → Rate 0
  const f = weekly.project(ctx({ plan: p, weights: weights(95, 0.1, TODAY) }));
  ok(f.gap !== null, "Gap in kg vorhanden");
  ok(f.gap.weeksBehindMin === null && f.gap.weeksBehindMax === null, "Wochenabweichung null statt Division durch 0");
  const flat = JSON.stringify(f);
  ok(flat.indexOf("Infinity") < 0 && flat.indexOf("NaN") < 0, "kein Infinity/NaN im Ergebnis");
}

group("12 — Woche 12 überschritten → completed");
{
  const f = weekly.project(ctx({ week: 12, weights: weights(90, 0, TODAY) }));
  ok(f.currentCourse.weeksRemaining === 0, "weeksRemaining 0");
  ok(f.status === "completed", "Status completed (" + f.status + ")");
}

group("13 — project() mutiert weder ctx noch plan");
{
  const c = ctx({ weights: weights(93.4, -0.02, TODAY) });
  const before = JSON.stringify(c);
  weekly.project(c);
  ok(JSON.stringify(c) === before, "ctx nach project() byte-identisch");
}

group("14 — Statuskatalog vollständig und ohne Wertung");
{
  const banned = ["Versagen", "schlecht", "Disziplin", "fällst zurück", "zu wenig Einsatz"];
  let clean = true;
  const all = [
    weekly.project(ctx()),
    weekly.project(ctx({ weights: weights(94, 0, TODAY) })),
    weekly.project(ctx({ weights: [{ date: "2026-09-06", kg: 91 }] })),
    weekly.project(ctx({ weights: weights(93, -0.16, TODAY) })),
    weekly.project(ctx({ week: 10, weights: weights(94, 0, TODAY) })),
    weekly.project(ctx({ week: 12, weights: weights(90, 0, TODAY) }))
  ];
  all.forEach(f => {
    banned.forEach(b => { if (f.headline.de.indexOf(b) >= 0) clean = false; });
    if (!f.headline.en) clean = false;
  });
  ok(clean, "keine moralische Wertung in Headlines, EN überall vorhanden");
}

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
