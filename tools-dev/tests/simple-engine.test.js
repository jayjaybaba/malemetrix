/* ==========================================================================
   Generation 2 — Plan-Engine: deterministisch, regelbasiert, mit Leitplanken

   Deckt die Plan-Szenarien aus dem Auftrag (§33) ab: Abnahme, Aufbau,
   Gesamtziel länger/kürzer als 12 Wochen, 2/3/4 Trainingstage, Zuhause,
   Gym, Verletzung, vegetarisch, Allergien, wenig Kochzeit, fehlende
   Pflichtangaben — plus Einkaufslisten-Aggregation und Determinismus.
   ========================================================================== */
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const input = require(path.join(ROOT, "js", "simple", "plan-input.js"));
const model = require(path.join(ROOT, "js", "simple", "plan-model.js"));
const engine = require(path.join(ROOT, "js", "simple", "plan-engine.js"));

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } };
const group = (g) => console.log("\n== " + g + " ==");

function mkInput(over, tgOver, crOver) {
  const tg = Object.assign({ date: "2026-08-01T10:00:00Z", current_kg: 94, target_kg: 80,
    height_cm: 182, kind: "realistic", direction: "cut", months: 6, exp: "mid", days: 3,
    mode: "natural", equip: "gym", age: 34, activity: "leicht", diet: "misch" }, tgOver || {});
  const cr = crOver === null ? null : Object.assign({ date: "2026-08-02T10:00:00Z", total: 61,
    bottleneck: { key: "recovery", domain: "recovery" },
    secondaryPriorities: [{ domain: "fuel" }], flags: [] }, crOver || {});
  const answers = Object.assign({ weekdays: [1, 3, 5] }, over || {});
  return input.collect({ transformGoal: tg, checkResult: cr, answers });
}

group("Determinismus");
{
  const a = engine.createPlan(mkInput(), "2026-08-10");
  const b = engine.createPlan(mkInput(), "2026-08-10");
  ok(a.ok && b.ok, "Plan entsteht");
  ok(JSON.stringify(a.plan) === JSON.stringify(b.plan), "identischer Input → identischer Plan (reproduzierbar)");
}

group("Abnahme, Gesamtziel > 12 Wochen (94→80 kg)");
{
  const r = engine.createPlan(mkInput(), "2026-08-10");
  const p = r.plan;
  ok(r.targets.cut === true, "Cut erkannt");
  ok(p.phaseGoal.isFinalPhase === false, "Gesamtziel NICHT in 12 Wochen versprochen");
  ok(p.selectedTransformation.expectedTotalWeeks > 12, "ehrlicher Gesamtzeitraum (" + p.selectedTransformation.expectedTotalWeeks + " Wochen)");
  ok(p.phaseGoal.week12TargetMinKg >= 80 && p.phaseGoal.week12TargetMaxKg < 94, "Phase-1-Korridor zwischen Ziel und Start (" + p.phaseGoal.week12TargetMinKg + "–" + p.phaseGoal.week12TargetMaxKg + ")");
  ok(p.nutrition.calorieTarget >= 1500 && p.nutrition.calorieTarget < r.targets.tdee, "Defizit mit Untergrenze");
  ok(p.nutrition.proteinTargetGrams >= 150 && p.nutrition.proteinTargetGrams <= 245, "Protein im Korridor");
  const rate = (94 - p.phaseGoal.week12TargetMinKg) / 12;
  ok(rate <= 94 * 0.01 + 1e-9, "Rate ≤ 1 % Körpergewicht/Woche");
  ok(model.validate(p).ok, "Plan besteht Modell-Validierung");
}

group("Ziel innerhalb von 12 Wochen (84→80 kg)");
{
  const r = engine.createPlan(mkInput({}, { current_kg: 84, target_kg: 80 }), "2026-08-10");
  ok(r.ok && r.plan.phaseGoal.isFinalPhase === true, "Ziel liegt in dieser Phase");
  ok(r.plan.phaseGoal.week12TargetMinKg <= 80 && 80 <= r.plan.phaseGoal.week12TargetMaxKg, "Korridor umschließt das Ziel");
}

group("Muskelaufbau (70→75 kg, Anfänger)");
{
  const r = engine.createPlan(mkInput({}, { current_kg: 70, target_kg: 75, direction: "gain", exp: "neu" }, null), "2026-08-10");
  ok(r.ok && r.targets.cut === false, "Aufbau erkannt");
  ok(r.plan.nutrition.calorieTarget > r.targets.tdee, "Überschuss");
  ok(r.plan.nutrition.calorieTarget - r.targets.tdee <= 500, "Überschuss gedeckelt (max 500)");
  ok(r.plan.phaseGoal.week12TargetMaxKg <= 75, "Aufbau-Korridor überschreitet Ziel nicht");
}

group("Trainingstage → Split");
{
  const r2 = engine.createPlan(mkInput({ daysPerWeek: 2, weekdays: [2, 5] }, {}, null), "2026-08-10");
  ok(r2.ok && r2.plan.training.templateId === "fb2" && r2.plan.training.sessions.length === 2, "2 Tage → Ganzkörper A/B");
  const r3 = engine.createPlan(mkInput({}, {}, null), "2026-08-10");
  ok(r3.ok && r3.plan.training.templateId === "fb3", "3 Tage → Ganzkörper A/B/C");
  const r4 = engine.createPlan(mkInput({ daysPerWeek: 4, weekdays: [1, 2, 4, 5] }, {}, null), "2026-08-10");
  ok(r4.ok && r4.plan.training.templateId === "ul4" && r4.plan.training.sessions.length === 4, "4 Tage → Ober-/Unterkörper");
}

group("Score-Effekte im Training");
{
  const r = engine.createPlan(mkInput({ daysPerWeek: 4, weekdays: [1, 2, 4, 5] }), "2026-08-10");
  ok(r.ok && r.plan.training.daysPerWeek === 3, "Regenerations-Engpass deckelt 4 → 3 Tage");
  ok(r.plan.training.deloadWeeks.length === 2, "frühere Deloads bei Regenerations-Engpass");
  const rx = engine.createPlan(mkInput({}, {}, { bottleneck: { domain: "execution" }, secondaryPriorities: [] }), "2026-08-10");
  ok(rx.ok && rx.plan.training.maximumSessionMinutes <= 45, "Umsetzungs-Engpass kappt Trainingsdauer auf 45 min");
}

group("Zuhause & Verletzung → Ersatzübungen (Bewegungsmuster bleibt)");
{
  const rh = engine.createPlan(mkInput({ location: "home" }, { equip: "home" }, null), "2026-08-10");
  const exIds = [];
  rh.plan.training.sessions.forEach(s => s.exercises.forEach(e => exIds.push(e.id)));
  ok(rh.ok && exIds.indexOf("squat") < 0 && exIds.indexOf("bench") < 0, "Zuhause: keine Langhantel-Übungen");
  ok(exIds.indexOf("gobletsquat") >= 0 || exIds.indexOf("splitsquat") >= 0, "Zuhause: Beinübung vorhanden");
  const rk = engine.createPlan(mkInput({ injuries: ["knie"] }, {}, null), "2026-08-10");
  const ids2 = [];
  rk.plan.training.sessions.forEach(s => s.exercises.forEach(e => ids2.push(e.id)));
  ok(rk.ok && ids2.indexOf("squat") < 0, "Knie-Verletzung: Kniebeuge ersetzt");
  const all = [];
  rk.plan.training.sessions.forEach(s => s.exercises.forEach(e => all.push(e)));
  /* Frueher stand hier „jede Uebung hat eine Ersatzuebung". Genau diese
     Forderung hat den Selbstverweis erzwungen: core trug alt: "core", damit
     das Feld gefuellt ist — und der Plan zeigte „Plank / Beinheben · Ersatz:
     Plank / Beinheben". Richtig ist: ein Ersatz ist entweder eine ANDERE
     Uebung oder gar keiner. */
  const ohneErsatz = [...new Set(all.filter(e => !e.substitute || !e.substitute.id).map(e => e.id))];
  ok(ohneErsatz.every(id => id === "core"),
    "ohne Ersatz ist nur die Rumpfuebung — sonst nichts (" + (ohneErsatz.join(", ") || "keine") + ")");
  ok(all.every(e => !e.substitute || e.substitute.name !== e.name),
    "und kein Ersatz zeigt auf die Uebung selbst");
  ok(rk.plan.training.sessions.every(s => s.exercises.some(e => e.inShort)), "jede Session hat eine Kurzversion");
  ok(!!rk.plan.training.progressionRule.de && !!rk.plan.training.comebackRule.de, "Progressions- und Wiedereinstiegsregel vorhanden");
}

group("Ernährungsform & Ausschlüsse");
{
  const rv = engine.createPlan(mkInput({ diet: "veggie" }, { diet: "veggie" }, null), "2026-08-10");
  const allOpts = [];
  rv.plan.nutrition.meals.forEach(m => m.options.forEach(o => allOpts.push(o)));
  ok(rv.ok && allOpts.every(o => o.tags.indexOf("veggie") >= 0), "vegetarisch: nur Veggie-Bausteine");
  const rf = engine.createPlan(mkInput({ exclusions: ["fisch", "milch"] }, {}, null), "2026-08-10");
  const foods = [];
  rf.plan.nutrition.meals.forEach(m => m.options.forEach(o => o.items.forEach(i => foods.push(i.foodId))));
  ok(rf.ok && foods.indexOf("lachs") < 0 && foods.indexOf("thunfisch") < 0, "Fisch ausgeschlossen");
  ok(foods.indexOf("magerquark") < 0 && foods.indexOf("skyr") < 0 && foods.indexOf("joghurt") < 0, "Milchprodukte ausgeschlossen");
  const rq = engine.createPlan(mkInput({ cookingMinutesMax: 10 }, {}, null), "2026-08-10");
  const lunchOpts = rq.plan.nutrition.meals.filter(m => m.slot === "lunch")[0].options;
  ok(rq.ok && lunchOpts.every(o => o.tags.indexOf("quick") >= 0 || o.tags.indexOf("nocook") >= 0), "≤10 min Kochzeit: nur schnelle Optionen");
}

group("Mahlzeiten-Skalierung");
{
  const r = engine.createPlan(mkInput(), "2026-08-10");
  const meals = r.plan.nutrition.meals;
  ok(meals.length === 3, "3 Mahlzeiten-Slots");
  meals.forEach(m => {
    const first = m.options[0];
    ok(Math.abs(first.kcal - m.targetKcal) / m.targetKcal < 0.35, m.slot + ": Portion nahe am Slot-Ziel (" + first.kcal + " / " + m.targetKcal + ")");
  });
  const dayKcal = meals.reduce((s, m) => s + m.options[0].kcal, 0);
  ok(Math.abs(dayKcal - r.plan.nutrition.calorieTarget) / r.plan.nutrition.calorieTarget < 0.2, "Tagessumme nahe Kalorienziel (" + dayKcal + " / " + r.plan.nutrition.calorieTarget + ")");
  ok(r.plan.nutrition.practicalRules.length >= 8, "praktische Regeln (Restaurant, Reise, Hunger, …) vorhanden");
}

group("Einkaufsliste (§14)");
{
  const r = engine.createPlan(mkInput(), "2026-08-10");
  const list = engine.shoppingList(r.plan.nutrition);
  ok(list.categories.length >= 3, "Kategorien gebildet");
  const flat = {};
  list.categories.forEach(c => c.items.forEach(i => { ok(!flat[i.foodId], "kein Duplikat: " + i.foodId); flat[i.foodId] = i; }));
  ok(Object.keys(flat).length === list.itemCount, "itemCount konsistent");
  // Personen-Multiplikation
  const n2 = JSON.parse(JSON.stringify(r.plan.nutrition)); n2.householdSize = 2;
  const list2 = engine.shoppingList(n2);
  const g1 = list.categories.flatMap(c => c.items).find(i => i.foodId === "haehnchen");
  const g2 = list2.categories.flatMap(c => c.items).find(i => i.foodId === "haehnchen");
  ok(g1 && g2 && g2.grams >= g1.grams * 1.9, "2 Personen ≈ doppelte Menge");
  // Vorräte
  const listP = engine.shoppingList(r.plan.nutrition, { pantry: ["olivenoel"] });
  ok(!listP.categories.flatMap(c => c.items).some(i => i.foodId === "olivenoel"), "Vorräte werden weggelassen");
  // Mahlzeitentausch aktualisiert die Liste
  const n3 = JSON.parse(JSON.stringify(r.plan.nutrition));
  const lunch = r.plan.nutrition.meals.filter(m => m.slot === "lunch")[0];
  if (lunch.options.length > 1) {
    n3.mealTemplateIds = n3.mealTemplateIds.map(s => s.indexOf(lunch.options[0].blockId) === 0 ? lunch.options[1].blockId + "@" + lunch.options[1].factor : s);
    const list3 = engine.shoppingList(n3);
    ok(JSON.stringify(list3) !== JSON.stringify(list), "Tausch einer Mahlzeit ändert die Liste");
  } else ok(true, "(nur eine Lunch-Option — Tauschtest übersprungen)");
  // Klartext
  const txt = engine.shoppingListText(list, "de");
  ok(txt.indexOf("Einkaufsliste") >= 0 && txt.split("\n").length > 5, "Klartext-Export");
  ok(engine.shoppingListText(list, "en").indexOf("shopping list") >= 0, "Klartext-Export EN");
}

group("Baustein-Katalog: Integrität");
{
  const slots = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  engine.MEAL_BLOCKS.forEach(b => {
    ok(b.id && b.slot in slots && b.name && b.name.de && b.name.en && b.prep && b.prep.de && b.prep.en,
       "Block " + b.id + ": Slot, Name (DE/EN), Zubereitung (DE/EN)");
    ok(b.items.every(it => engine.FOODS[it[0]] && it[1] > 0), "Block " + b.id + ": nur Katalog-Lebensmittel mit Mengen");
    slots[b.slot]++;
  });
  ok(slots.breakfast >= 4 && slots.lunch >= 5 && slots.dinner >= 5 && slots.snack >= 4,
     "genug Auswahl je Slot (" + JSON.stringify(slots) + ")");
}

group("Wochenstruktur");
{
  const r = engine.createPlan(mkInput(), "2026-08-10");
  const w = r.plan.week;
  ok(w.length === 7, "7 Tage");
  ok(w.filter(d => d.training).length === 3, "3 Trainingstage");
  ok(w.some(d => d.shopping) && w.some(d => d.mealPrep) && w.some(d => d.review), "Einkauf, Prep, Wochencheck verankert");
}

group("Kalorien-Untergrenze (kleiner, älterer Nutzer)");
{
  const r = engine.createPlan(mkInput({ age: 62, activity: "sitzend" }, { current_kg: 72, target_kg: 65, age: 62, activity: "sitzend" }, null), "2026-08-10");
  ok(r.ok && r.plan.nutrition.calorieTarget >= 1500, "nie unter 1500 kcal (" + r.plan.nutrition.calorieTarget + ")");
}

group("Fehlende Pflichtangaben");
{
  const bad = engine.createPlan(input.collect({ transformGoal: null, answers: {} }), "2026-08-10");
  ok(!bad.ok && bad.errors[0].indexOf("unvollständig") >= 0, "ohne Transformation: klarer Fehler statt Plan");
  const bad2 = engine.createPlan(mkInput({ weekdays: [] }), "2026-08-10");
  ok(!bad2.ok, "ohne Wochentage kein Plan");
}

group("Schichtarbeit & Zeiten");
{
  const r = engine.createPlan(mkInput({ workPattern: "shift", wakeTime: "11:00", sleepTime: "02:30" }), "2026-08-10");
  ok(r.ok && r.plan.lifestyle.workPattern === "shift", "Schichtmodell gespeichert");
  ok(r.plan.reminderPreferences.morningBriefTime === "11:00", "Morgen-Brief folgt Aufstehzeit");
  ok(r.plan.reminderPreferences.eveningCloseTime === "00:30", "Tagesabschluss 2h vor Schlafenszeit (über Mitternacht)");
}

group("Keine Uebung ist ihr eigener Ersatz");
{
  /* Gefunden im Browser: der Trainingsplan zeigte
     „Plank / Beinheben · Ersatz: Plank / Beinheben".
     In den Uebungsdaten stand alt: "core" bei der Uebung core. */
  const p = engine.createPlan(mkInput(), "2026-08-10").plan;
  let selbst = [];
  (p.training.sessions || []).forEach(function (s) {
    (s.exercises || []).forEach(function (x) {
      if (x.substitute && x.substitute.name === x.name) selbst.push(x.name);
    });
  });
  ok(selbst.length === 0, "kein Ersatz zeigt auf die Uebung selbst" +
    (selbst.length ? " — " + selbst.join(", ") : ""));

  /* Und die Datenquelle selbst, unabhaengig davon, welcher Plan gerade
     erzeugt wird. */
  const src = require("fs").readFileSync(require("path").join(__dirname, "../../js/simple/plan-engine.js"), "utf8");
  const treffer = [];
  const blk = (src.match(/var EX = \{[\s\S]*?\n  \};/) || [""])[0];
  blk.split("\n").forEach(function (z) {
    const m = z.match(/^\s*(\w+):\s*\{.*?alt:\s*"(\w+)"/);
    if (m && m[1] === m[2]) treffer.push(m[1]);
  });
  ok(treffer.length === 0, "auch in den Uebungsdaten steht kein Selbstverweis" +
    (treffer.length ? " — " + treffer.join(", ") : ""));
}

console.log("\n" + (failed ? "FAILED" : "OK") + " — " + passed + " bestanden, " + failed + " fehlgeschlagen");
process.exit(failed ? 1 : 0);
