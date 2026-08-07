/* ==========================================================================
   Apple Health — gemessener Tagesverbrauch statt Aktivitaetsfaktor

   Der gefaehrliche Fall zuerst: eine nicht getragene Uhr meldet einen
   Bruchteil des echten Verbrauchs. Wuerde die Engine das uebernehmen,
   entstuende ein viel zu niedriges Kalorienziel. Diese Suite haelt die
   Leitplanken fest, die genau das verhindern — und prueft, dass der Weg
   ohne Health unveraendert bleibt.

   Ausfuehren: node tools-dev/tests/health-energy.test.js
   ========================================================================== */
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const engine = require(path.join(ROOT, "js/simple/plan-engine.js"));
const input = require(path.join(ROOT, "js/simple/plan-input.js"));
const model = require(path.join(ROOT, "js/simple/plan-model.js"));

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } };
const group = (g) => console.log("\n== " + g + " ==");

const FORMEL = 2500;   // Beispiel-Schaetzung, um die Grenzen greifbar zu machen

group("resolveTdee: ohne Messung bleibt alles wie bisher");
{
  [null, undefined, {}, { tdee: 0 }, { tdee: -100 }, { tdee: NaN }, { tdee: "2600" }].forEach((m, i) => {
    const r = engine.resolveTdee(FORMEL, m);
    ok(r.tdee === FORMEL && r.source === "formel", "Fall " + i + ": Formel gilt, Quelle 'formel'");
  });
  const r = engine.resolveTdee(FORMEL, null);
  ok(r.reason === null, "ohne Messung gibt es auch keinen Ablehnungsgrund zu melden");
  ok(r.measuredTdee === null, "und keinen gemessenen Wert");
}

group("resolveTdee: plausible Messung wird uebernommen");
{
  const r = engine.resolveTdee(FORMEL, { tdee: 2890, days: 7 });
  ok(r.tdee === 2890, "gemessene 2890 kcal ersetzen die Schaetzung");
  ok(r.source === "apple_health", "Quelle wird als apple_health ausgewiesen");
  ok(r.measuredTdee === 2890 && r.reason === null, "Messwert sichtbar, kein Ablehnungsgrund");

  const low = engine.resolveTdee(FORMEL, { tdee: 1900, days: 6 });
  ok(low.tdee === 1900, "auch ein deutlich niedrigerer, aber plausibler Wert zaehlt (24 % unter Formel)");

  const rounded = engine.resolveTdee(FORMEL, { tdee: 2712.6, days: 5 });
  ok(rounded.tdee === 2713, "Nachkommastellen werden gerundet");
}

group("Leitplanke 1: zu wenige Messtage");
{
  [0, 1, 4].forEach((d) => {
    const r = engine.resolveTdee(FORMEL, { tdee: 2800, days: d });
    ok(r.tdee === FORMEL && r.reason === "zu_wenige_tage", d + " Tage reichen nicht — Formel bleibt");
  });
  const r5 = engine.resolveTdee(FORMEL, { tdee: 2800, days: 5 });
  ok(r5.source === "apple_health", "ab 5 vollen Tagen wird uebernommen");
  const rMissing = engine.resolveTdee(FORMEL, { tdee: 2800 });
  ok(rMissing.reason === "zu_wenige_tage", "fehlende Tagesangabe zaehlt als 0 Tage, nicht als 'egal'");
}

group("Leitplanke 2: nicht getragene Uhr darf kein Hungerziel erzeugen");
{
  const r = engine.resolveTdee(FORMEL, { tdee: 900, days: 7 });
  ok(r.tdee === FORMEL, "900 kcal werden nicht uebernommen");
  ok(r.reason === "unplausibel_niedrig", "und der Grund wird benannt");
  ok(r.measuredTdee === 900, "der verworfene Wert bleibt sichtbar — nichts wird verschwiegen");

  ok(engine.resolveTdee(FORMEL, { tdee: 1199, days: 7 }).reason === "unplausibel_niedrig",
    "unter der absoluten Untergrenze von 1200 kcal");
  ok(engine.resolveTdee(FORMEL, { tdee: 1800, days: 7 }).reason === "unplausibel_niedrig",
    "mehr als 25 % unter der Formel (1800 < 1875)");
  ok(engine.resolveTdee(FORMEL, { tdee: 1875, days: 7 }).source === "apple_health",
    "genau an der 25-%-Grenze wird noch uebernommen");

  // Auch bei kleiner Formel greift die absolute Untergrenze
  ok(engine.resolveTdee(1400, { tdee: 1100, days: 7 }).reason === "unplausibel_niedrig",
    "die 1200er-Untergrenze gilt unabhaengig von der Formel");
}

group("Leitplanke 3: unplausibel hoher Wert");
{
  const r = engine.resolveTdee(FORMEL, { tdee: 6000, days: 7 });
  ok(r.tdee === FORMEL && r.reason === "unplausibel_hoch", "6000 kcal werden nicht uebernommen");
  ok(engine.resolveTdee(FORMEL, { tdee: 3500, days: 7 }).source === "apple_health",
    "genau an der 40-%-Grenze wird noch uebernommen (3500)");
  ok(engine.resolveTdee(FORMEL, { tdee: 3501, days: 7 }).reason === "unplausibel_hoch",
    "einen Kilokalorien-Schritt darueber nicht mehr");
}

group("mapMeasured: nimmt nur an, was Zahlen sind");
{
  ok(input.mapMeasured(null) === null, "null bleibt null");
  ok(input.mapMeasured({ days: 7 }) === null, "ohne tdee: null");
  ok(input.mapMeasured({ tdee: "2800", days: 7 }) === null, "Text statt Zahl wird abgewiesen");
  const m = input.mapMeasured({ tdee: 2800, days: 7, readAt: "2026-08-07T10:00:00Z", boese: "x" });
  ok(m.tdee === 2800 && m.days === 7, "gueltige Werte kommen durch");
  ok(m.source === "apple_health", "Quelle wird gesetzt");
  ok(m.boese === undefined, "unbekannte Felder werden nicht durchgereicht");
  ok(input.mapMeasured({ tdee: 2800 }).days === 0, "fehlende Tagesangabe wird zu 0, nicht zu undefined");
}

/* --- Ende-zu-Ende: derselbe Nutzer, einmal mit und einmal ohne Health ---- */
/* Fixture-Form wie in simple-engine.test.js — mapTransformation erwartet die
   Rohform aus transformation.js, nicht das schon normalisierte Objekt. */
function collectWith(measured, tgOver) {
  const tg = Object.assign({
    date: "2026-08-01T10:00:00Z", current_kg: 95, target_kg: 85, height_cm: 183,
    kind: "realistic", direction: "cut", months: 6, exp: "mid", days: 3,
    mode: "natural", equip: "gym", age: 34, activity: "sitzend", diet: "misch"
  }, tgOver || {});
  return input.collect({
    transformGoal: tg, checkResult: null,
    answers: { weekdays: [1, 3, 5] },
    measured: measured
  });
}

group("Ende zu Ende: derselbe Nutzer mit und ohne Apple Health");
{
  const ohne = collectWith(null);
  ok(ohne.measured === null, "ohne Health steht measured auf null");
  const tOhne = engine.computeTargets(ohne);
  ok(tOhne.tdeeSource === "formel", "ohne Health rechnet die Engine mit der Formel");
  ok(tOhne.tdee === tOhne.tdeeFormula, "und tdee ist genau die Formelzahl");

  // Sitzender Bueromensch laut Auswahlfeld, in Wirklichkeit viel unterwegs
  const mit = collectWith({ tdee: 2950, days: 7 });
  const tMit = engine.computeTargets(mit);
  ok(tMit.tdeeSource === "apple_health", "mit Health greift die Messung");
  ok(tMit.tdee === 2950, "gemessener Verbrauch wird zur Grundlage");
  ok(tMit.kcal > tOhne.kcal, "das Kalorienziel steigt entsprechend (" + tOhne.kcal + " -> " + tMit.kcal + ")");
  ok(tMit.ratePerWeek === tOhne.ratePerWeek, "die Abnahmerate bleibt unveraendert — Health aendert nur die Basis");

  const plan = engine.createPlan(mit, "2026-08-07");
  ok(plan.ok, "der Plan mit Health-Daten ist gueltig");
  ok(plan.plan.derived.tdeeSource === "apple_health", "der Plan merkt sich die Quelle");
  ok(plan.plan.derived.tdeeFormula === tOhne.tdee, "und was die Formel gesagt haette");

  // Der gefaehrliche Fall bis ins Kalorienziel durchgerechnet
  const uhrAus = collectWith({ tdee: 850, days: 7 });
  const tUhrAus = engine.computeTargets(uhrAus);
  ok(tUhrAus.kcal === tOhne.kcal, "nicht getragene Uhr aendert das Kalorienziel NICHT");
  ok(tUhrAus.tdeeRejected === "unplausibel_niedrig", "und der Grund landet im Plan");
  ok(tUhrAus.kcal >= model.LIMITS.kcalMin, "das Ziel bleibt ueber der harten Untergrenze");
}

group("Kein Weg an den bestehenden Grenzen vorbei");
{
  // Sehr hoher gemessener Verbrauch darf das Ziel nicht ueber kcalMax heben
  const t = engine.computeTargets(collectWith({ tdee: 4400, days: 7 },
    { current_kg: 95, target_kg: 105, direction: "bulk" }));
  ok(t.kcal <= model.LIMITS.kcalMax, "das Kalorienziel bleibt unter kcalMax (" + t.kcal + " <= " + model.LIMITS.kcalMax + ")");
}

console.log("\n" + (failed ? "FAILED" : "OK") + " — " + passed + " bestanden, " + failed + " fehlgeschlagen");
process.exit(failed ? 1 : 0);
