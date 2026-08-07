/* ==========================================================================
   Essens-Protokoll — echte Zahlen statt Haekchen

   Warum das sicherheitsrelevant ist: Die Ernaehrungsquote wiegt 30 % im
   Execution Score, und der entscheidet mit, ob der Plan verschaerft wird.
   Ein Protokoll, das leere Tage als Diaetfehler wertet oder Muell annimmt,
   wuerde diese Entscheidung vergiften.

   Ausfuehren: node tools-dev/tests/foodlog.test.js
   ========================================================================== */
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const model = require(path.join(ROOT, "js/simple/plan-model.js"));
const engine = require(path.join(ROOT, "js/simple/plan-engine.js"));
const input = require(path.join(ROOT, "js/simple/plan-input.js"));
const decide = require(path.join(ROOT, "js/simple/decide.js"));
const foodlog = require(path.join(ROOT, "js/simple/foodlog.js"));

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } };
const group = (g) => console.log("\n== " + g + " ==");

const r = engine.createPlan(input.collect({
  transformGoal: { date: "2026-05-30T10:00:00Z", current_kg: 95, target_kg: 85, height_cm: 183,
    kind: "realistic", direction: "cut", months: 6, exp: "mid", days: 3,
    mode: "natural", equip: "gym", age: 34, activity: "moderat", diet: "misch" },
  checkResult: null, answers: { weekdays: [1, 3, 5] }
}), "2026-06-01");
if (!r.ok) throw new Error(r.errors.join(", "));
const PLAN = r.plan; PLAN.status = "active";
const N = PLAN.nutrition;
const e = (label, kcal, protein) => foodlog.makeEntry({ label, kcal, protein, at: "2026-06-29" });

group("Summe und Rest");
{
  const entries = [e("Frühstück", 500, 40), e("Mittag", 700, 55)];
  const t = foodlog.dayTotals(entries);
  ok(t.kcal === 1200 && t.protein === 95, "Summe stimmt (" + t.kcal + " kcal, " + t.protein + " g)");
  const rest = foodlog.remaining(N, entries);
  ok(rest.kcal === N.calorieTarget - 1200, "Restkalorien stimmen");
  ok(rest.protein === N.proteinTargetGrams - 95, "Restprotein stimmt");
  ok(foodlog.dayTotals([]).kcal === 0, "leerer Tag summiert zu 0");
  ok(foodlog.dayTotals(null).count === 0, "null faellt nicht um");
}

group("Abweichendes Tagesziel gewinnt (Auswaertsessen, Wochencheck)");
{
  const entries = [e("Pizza", 1400, 60)];
  const normal = foodlog.remaining(N, entries);
  const erhoeht = foodlog.remaining(N, entries, N.calorieTarget + 400);
  ok(erhoeht.kcal === normal.kcal + 400, "das uebergebene Ziel wird benutzt, nicht das Planziel");
  ok(erhoeht.kcalGoal === N.calorieTarget + 400, "und ausgewiesen");
}

group("ADVERSARIELL: ein leerer Tag ist KEIN Diaetfehler");
{
  ok(foodlog.dayHit(N, []) === null, "ohne Eintrag gibt es kein Urteil");
  ok(foodlog.dayHit(N, null) === null, "auch nicht bei fehlendem Protokoll");
  // Der Unterschied ist entscheidend: waere ein leerer Tag ein "nicht
  // getroffen", wuerde jedes Vergessen als Diaetfehler in den Score wandern.
  const a = foodlog.adherence(N, {}, ["2026-06-27", "2026-06-28"]);
  ok(a.pct === null && a.loggedDays === 0,
    "ohne protokollierte Tage gibt es keine Quote statt einer 0");
}

group("Treffer-Regel: Protein zaehlt, Kalorien duerfen atmen");
{
  const ziel = N.calorieTarget, prot = N.proteinTargetGrams;
  const genau = foodlog.dayHit(N, [e("Tag", ziel, prot)]);
  ok(genau.hit === true, "genau auf Ziel: getroffen");

  const knapp = foodlog.dayHit(N, [e("Tag", ziel, Math.round(prot * 0.91))]);
  ok(knapp.hit === true, "91 % Protein reicht — kein Diktat auf das Gramm");

  const zuWenigProtein = foodlog.dayHit(N, [e("Tag", ziel, Math.round(prot * 0.6))]);
  ok(zuWenigProtein.hit === false && zuWenigProtein.proteinOk === false,
    "60 % Protein: nicht getroffen, und der Grund ist benannt");

  const leichtDrueber = foodlog.dayHit(N, [e("Tag", Math.round(ziel * 1.08), prot)]);
  ok(leichtDrueber.hit === true, "8 % ueber dem Kalorienziel zaehlt noch");

  const deutlichDrueber = foodlog.dayHit(N, [e("Tag", Math.round(ziel * 1.4), prot)]);
  ok(deutlichDrueber.hit === false && deutlichDrueber.kcalOk === false, "40 % darueber nicht mehr");

  // Auch nach UNTEN gibt es eine Grenze — Hungern ist kein Erfolg.
  const vielZuWenig = foodlog.dayHit(N, [e("Tag", Math.round(ziel * 0.5), prot)]);
  ok(vielZuWenig.hit === false,
    "die Haelfte des Ziels gilt NICHT als Treffer — Unterschreiten ist ein Warnsignal, keine Leistung");
}

group("Eintraege: kein Muell kommt in die Entscheidung");
{
  ok(foodlog.makeEntry({ label: "", kcal: 500, protein: 30 }) === null, "ohne Bezeichnung: abgelehnt");
  ok(foodlog.makeEntry({ label: "X", kcal: 0, protein: 0 }) === null, "ohne jeden Wert: abgelehnt");
  ok(foodlog.makeEntry({ label: "X", kcal: -100, protein: 10 }) === null, "negative Kalorien: abgelehnt");
  ok(foodlog.makeEntry({ label: "X", kcal: 99999, protein: 10 }) === null, "unmoegliche Kalorien: abgelehnt");
  ok(foodlog.makeEntry({ label: "X", kcal: 500, protein: 900 }) === null, "unmoegliches Protein: abgelehnt");
  const gut = foodlog.makeEntry({ label: "  Pizza  ", kcal: 900.4, protein: 35.6, at: "2026-06-29" });
  ok(gut && gut.label === "Pizza", "Leerzeichen werden getrimmt");
  ok(gut.kcal === 900 && gut.protein === 36, "Werte werden gerundet");
  ok(gut.source === "frei", "Quelle wird gesetzt");
  const lang = foodlog.makeEntry({ label: "x".repeat(200), kcal: 100, protein: 5 });
  ok(lang.label.length === 60, "ueberlange Bezeichnung wird gekuerzt statt abgelehnt");
  // Nur Protein, keine Kalorien (z. B. Shake) muss gehen
  ok(foodlog.makeEntry({ label: "Shake", kcal: 0, protein: 30 }) !== null, "reiner Proteineintrag ist erlaubt");
}

group("Vorschlaege kommen aus dem eigenen Plan");
{
  const rest = { kcal: 700, protein: 50 };
  const s = foodlog.suggest(N, rest, 3);
  ok(s.length > 0 && s.length <= 3, "es kommen bis zu drei Vorschlaege (" + s.length + ")");
  const ids = s.map((x) => x.blockId);
  ok(new Set(ids).size === ids.length, "kein Baustein doppelt");
  ok(s.every((x) => x.kcal <= rest.kcal + 250),
    "nichts, was die Luecke deutlich sprengt");
  ok(foodlog.suggest(N, { kcal: 20, protein: 2 }).length === 0,
    "ist der Tag praktisch voll, wird nichts mehr vorgeschlagen");
  ok(foodlog.suggest(N, null).length === 0, "ohne Rest: keine Vorschlaege");
}

group("Eigene Mahlzeiten: erst ab dem zweiten Mal ein Muster");
{
  const log = {
    "2026-06-20": { entries: [e("Döner", 800, 45)] },
    "2026-06-21": { entries: [e("Döner", 800, 45), e("Einmaliges", 300, 10)] },
    "2026-06-22": { entries: [e("Döner", 800, 45)] }
  };
  const f = foodlog.favourites(log, 5);
  ok(f.length === 1 && f[0].label === "Döner", "nur das Wiederkehrende taucht auf");
  ok(f[0].n === 3, "mit korrekter Haeufigkeit");
  const mitPlan = foodlog.favourites({
    "2026-06-20": { entries: [{ label: "Planblock", kcal: 500, protein: 40, source: "plan" },
                              { label: "Planblock", kcal: 500, protein: 40, source: "plan" }] }
  }, 5);
  ok(mitPlan.length === 0, "Planbausteine zaehlen nicht als 'eigene' — sie stehen ohnehin oben");
}

group("Quote ueber einen Zeitraum");
{
  const ziel = N.calorieTarget, prot = N.proteinTargetGrams;
  const log = {
    "2026-06-25": { entries: [e("gut", ziel, prot)] },
    "2026-06-26": { entries: [e("gut", ziel, prot)] },
    "2026-06-27": { entries: [e("daneben", Math.round(ziel * 1.5), 40)] },
    "2026-06-28": { entries: [] }                      // nichts eingetragen
  };
  const tage = ["2026-06-25", "2026-06-26", "2026-06-27", "2026-06-28"];
  const a = foodlog.adherence(N, log, tage);
  ok(a.loggedDays === 3, "der leere Tag zaehlt nicht mit (" + a.loggedDays + ")");
  ok(a.hitDays === 2 && a.pct === 67, "2 von 3 protokollierten Tagen getroffen = 67 %");
}

group("Durchgriff auf den Execution Score");
{
  const ziel = N.calorieTarget, prot = N.proteinTargetGrams;
  const daylog = {};
  for (let i = 14; i >= 1; i--) {
    const d = model.addDays("2026-06-29", -i);
    // Haekchen behauptet: Protein immer erreicht
    daylog[d] = { tasks: { training: true, protein: true, steps: true }, closed: true };
  }
  const ohne = decide.executionScore(PLAN, daylog, "2026-06-29", { days: 14 });

  // Messung widerspricht: nur jeder dritte Tag getroffen
  const nutritionByDay = {};
  for (let i = 14; i >= 1; i--) {
    nutritionByDay[model.addDays("2026-06-29", -i)] = (i % 3 === 0);
  }
  const mit = decide.executionScore(PLAN, daylog, "2026-06-29", { days: 14, nutritionByDay: nutritionByDay });

  ok(ohne.nutrition === 100, "mit Haekchen behauptet die App 100 %");
  ok(mit.nutrition < 50, "gemessen sind es " + mit.nutrition + " % — die Messung gewinnt");
  ok(mit.score < ohne.score, "und der Gesamtscore faellt entsprechend (" + ohne.score + " -> " + mit.score + ")");

  // Gemischt: nur einige Tage protokolliert, der Rest bleibt beim Haekchen
  const teilweise = { "2026-06-28": false };
  const gemischt = decide.executionScore(PLAN, daylog, "2026-06-29", { days: 14, nutritionByDay: teilweise });
  ok(gemischt.nutrition < 100 && gemischt.nutrition > 80,
    "gemischte Quellen: je Tag die beste verfuegbare (" + gemischt.nutrition + " %)");
}

group("Determinismus");
{
  const a = JSON.stringify(foodlog.makeEntry({ label: "Pizza", kcal: 900, protein: 35, at: "2026-06-29" }));
  const b = JSON.stringify(foodlog.makeEntry({ label: "Pizza", kcal: 900, protein: 35, at: "2026-06-29" }));
  ok(a === b, "gleicher Eintrag -> gleiche ID (kein Zufall im Datensatz)");
}

console.log("\n" + (failed ? "FAILED" : "OK") + " — " + passed + " bestanden, " + failed + " fehlgeschlagen");
process.exit(failed ? 1 : 0);
