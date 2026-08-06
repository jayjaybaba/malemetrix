/* ==========================================================================
   MaleMetrix — Zielengine der Transformation (transform-goals.mjs).
   Testet die ABNAHMEKRITERIEN der Neuausrichtung (Phase 2): harte Grenzen,
   Vorschlagslogik, dynamische Alternativen, Prompt-Plausibilität. Dieselbe
   Datei läuft im Server (Edge Function), im Browser und hier — ein Satz
   Regeln, dreimal verwendet, einmal getestet.
     node --test tools-dev/tests/transform-goals.test.js
   ========================================================================== */
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const MOD = pathToFileURL(path.join(__dirname, "..", "..", "supabase", "functions", "_shared", "transform-goals.mjs")).href;

let G;
test.before(async () => { G = await import(MOD); });

/* ---------------- Harte Zielgrenzen (Abnahmekriterien 1-8) ---------------- */

test("1. 70 kg / 180 cm mit 49-kg-Ziel wird blockiert (BMI-Untergrenze)", () => {
  const r = G.validateTarget({ weightKg: 70, heightCm: 180, waistCm: 84, shape: "durchschnitt", targetKg: 49 });
  assert.equal(r.verdict, "blockiert");
  assert.equal(r.code, "bmi_floor");
  assert.ok(r.altLo >= Math.round(G.weightAtBmi(20, 180)), "Alternative beginnt nicht unter BMI 20");
  assert.ok(r.altHi > r.altLo, "Alternative ist eine echte Spanne");
});

test("2. 70 kg / 190 cm mit 49-kg-Ziel wird blockiert", () => {
  const r = G.validateTarget({ weightKg: 70, heightCm: 190, waistCm: 84, shape: "durchschnitt", targetKg: 49 });
  assert.equal(r.verdict, "blockiert");
});

test("3. 110 kg / 180 cm mit moderatem Ziel (99 kg) ist erlaubt", () => {
  const r = G.validateTarget({ weightKg: 110, heightCm: 180, waistCm: 112, shape: "kraeftig", targetKg: 99 });
  assert.ok(r.verdict === "plausibel" || r.verdict === "ambitioniert", "moderates Ziel freigegeben, war: " + r.verdict);
});

test("4. Jedes Ziel unter BMI 20 wird blockiert — nie freigegeben", () => {
  [[80, 175], [95, 185], [60, 165], [120, 190]].forEach(([w, h]) => {
    const justUnder = Math.floor(G.weightAtBmi(20, h)) - 1;
    const r = G.validateTarget({ weightKg: w, heightCm: h, waistCm: null, shape: "durchschnitt", targetKg: justUnder });
    assert.equal(r.verdict, "blockiert", w + "kg/" + h + "cm → " + justUnder + "kg muss blockiert sein");
  });
});

test("5. Niedriger Ausgangs-BMI → keine automatischen Abnahmeziele mehr", () => {
  // 62 kg / 178 cm = BMI 19,6 — Vorschläge müssen auf Rekomposition/Aufbau drehen.
  const p = G.proposeGoals({ weightKg: 62, heightCm: 178, waistCm: 74, shape: "durchschnitt", direction: "cut" });
  assert.equal(p.direction, "recomp");
  assert.ok(p.a.kind !== "cut", "Ziel A ist keine weitere Abnahme");
  assert.ok(p.b.kind !== "cut", "Ziel B ist keine weitere Abnahme");
  assert.ok(p.note && p.note.length > 10, "erklärender Hinweis vorhanden");
});

test("6. Ziel identisch mit Ist wird blockiert", () => {
  const r = G.validateTarget({ weightKg: 90, heightCm: 180, waistCm: 100, shape: "kraeftig", targetKg: 90 });
  assert.equal(r.verdict, "blockiert");
  assert.equal(r.code, "same_as_current");
});

test("7. Ziel A identisch mit Ziel B wird blockiert (validatePair)", () => {
  assert.equal(G.validatePair(80, 80).ok, false);
  assert.equal(G.validatePair(80, 78).ok, true);
  // und die Vorschlagsengine selbst liefert nie zwei identische Ziele:
  ["adipoes", "kraeftig", "durchschnitt", "athletisch", "definiert"].forEach((shape) => {
    ["cut", "bulk"].forEach((direction) => {
      const p = G.proposeGoals({ weightKg: 95, heightCm: 180, waistCm: 100, shape, direction });
      assert.notEqual(p.a.kg, p.b.kg, shape + "/" + direction + " liefert zwei verschiedene Ziele");
    });
  });
});

test("8. Unrealistisch hoher Muskelaufbau wird blockiert", () => {
  // +20 % Körpergewicht als Aufbauziel → blockiert (Ein-Bild-Plausibilität).
  const r = G.validateTarget({ weightKg: 75, heightCm: 180, waistCm: 82, shape: "athletisch", targetKg: 90 });
  assert.equal(r.verdict, "blockiert");
  assert.equal(r.code, "extreme_gain");
  assert.ok(r.altHi <= Math.round(75 * 1.10) + 1, "Alternative bleibt im plausiblen Aufbaubereich");
});

test("9. Moderater langfristiger Muskelaufbau ist erlaubt", () => {
  const r = G.validateTarget({ weightKg: 75, heightCm: 180, waistCm: 82, shape: "athletisch", targetKg: 80 });
  assert.ok(r.verdict === "plausibel" || r.verdict === "ambitioniert", "war: " + r.verdict);
});

/* ---------------- Vorschläge & Alternativen ---------------- */

test("Vorschläge: nie unter BMI 20, nie identisch, B ambitionierter als A (Abnahme)", () => {
  const cases = [
    { weightKg: 110, heightCm: 180, waistCm: 115, shape: "adipoes" },
    { weightKg: 95, heightCm: 178, waistCm: 104, shape: "kraeftig" },
    { weightKg: 85, heightCm: 182, waistCm: 92, shape: "durchschnitt" },
    { weightKg: 160, heightCm: 185, waistCm: 135, shape: "adipoes" },
  ];
  cases.forEach((c) => {
    const p = G.proposeGoals({ ...c, direction: "cut" });
    assert.ok(G.bmi(p.a.kg, c.heightCm) >= 20, "Ziel A über BMI 20 bei " + c.weightKg);
    assert.ok(G.bmi(p.b.kg, c.heightCm) >= 20 - 1e-9, "Ziel B über BMI 20 bei " + c.weightKg);
    assert.ok(p.b.kg < p.a.kg, "Ziel B ambitionierter als A");
    assert.ok(p.a.deltaKg >= 3, "Ziel A ist sichtbar relevant (≥3 kg)");
    // beide Vorschläge bestehen die eigene Validierung:
    ["a", "b"].forEach((k) => {
      const v = G.validateTarget({ ...c, targetKg: p[k].kg });
      assert.ok(v.verdict === "plausibel" || v.verdict === "ambitioniert",
        "Vorschlag " + k + " (" + p[k].kg + " kg) muss freigegeben sein, war: " + v.verdict);
    });
  });
});

test("Dynamische Alternative: 70 kg / 175 cm blockiert → Spanne im Bereich ~60-64 kg", () => {
  const r = G.validateTarget({ weightKg: 70, heightCm: 175, waistCm: 84, shape: "durchschnitt", targetKg: 50 });
  assert.equal(r.verdict, "blockiert");
  assert.ok(r.altLo >= 58 && r.altLo <= 63, "untere Alternative plausibel (war " + r.altLo + ")");
  assert.ok(r.altHi >= r.altLo + 1 && r.altHi <= 68, "obere Alternative plausibel (war " + r.altHi + ")");
});

test("Körperfett ist immer ein Schätzbereich, nie ein Einzelwert", () => {
  const e = G.estimateBf({ weightKg: 90, heightCm: 180, waistCm: 100, shape: "kraeftig" });
  assert.ok(e.lo < e.mid && e.mid < e.hi, "lo < mid < hi");
  const p = G.proposeGoals({ weightKg: 90, heightCm: 180, waistCm: 100, shape: "kraeftig", direction: "cut" });
  assert.ok(p.a.bf.lo < p.a.bf.hi, "Zielkörperfett als Bereich");
});

/* ---------------- Prompt-Plausibilität (2.6/2.7) ---------------- */

test("Prompts: großer Verlust ab hohem Startgewicht ergibt KEIN Sixpack", () => {
  // 160 kg → 136 kg: deutlich schlanker, aber nicht definiert (Beispiel aus der Vorgabe).
  const f = G.targetLookFragment({ weightKg: 160, heightCm: 185, waistCm: 135, shape: "adipoes", targetKg: 136 });
  assert.ok(/NO six-pack|NO visible abs/i.test(f), "kein Sixpack-Versprechen: " + f);
  assert.ok(!/six-pack.*defined|sharply defined/i.test(f), "keine Definitionssprache");
});

test("Prompts: moderater Verlust bei Durchschnittsform wird höchstens athletisch", () => {
  const f = G.targetLookFragment({ weightKg: 90, heightCm: 182, waistCm: 96, shape: "durchschnitt", targetKg: 76 });
  assert.ok(!/competition|extreme vascul/i.test(f));
});

test("Prompts: nie Wettkampf-Look, nie Venen-Show, Identität bleibt", () => {
  const f = G.targetLookFragment({ weightKg: 80, heightCm: 180, waistCm: 84, shape: "athletisch", targetKg: 72 });
  assert.ok(/NO extreme vascularity|NOT a bodybuilding|NOT shredded/i.test(f), f);
  assert.ok(/same tattoos/i.test(G.IDENTITY_FRAGMENT), "Tattoos bleiben");
  assert.ok(/without any beautification/i.test(G.IDENTITY_FRAGMENT), "keine Gesichtsverschönerung");
  assert.ok(/same hairstyle/i.test(G.IDENTITY_FRAGMENT), "keine neue Frisur");
  assert.ok(/same background/i.test(G.IDENTITY_FRAGMENT), "Hintergrund bleibt");
});

test("Prompts: Aufbau wird nie als reine Muskelmasse beschrieben", () => {
  const small = G.targetLookFragment({ weightKg: 75, heightCm: 180, waistCm: 82, shape: "athletisch", targetKg: 78 });
  const big = G.targetLookFragment({ weightKg: 75, heightCm: 180, waistCm: 82, shape: "athletisch", targetKg: 82 });
  assert.ok(/body fat/i.test(small) && /body fat/i.test(big), "Zunahme enthält ehrlich auch Fettanteil");
});

/* ---------------- Server-Durchsetzung (Abnahmekriterium 13 + P0) ----------
   Direkt manipulierte API-Aufrufe dürfen die Client-Grenzen nicht umgehen:
   die Edge Function muss DIESELBE Engine importieren und aufrufen, die
   Datenschutz-Header senden und die Einwilligung erzwingen. Quelltext-
   Invarianten nach dem Muster von security-guards.test.js. */
const fs = require("node:fs");

test("10./11. Planengine: keine Zwangs-Minimums, keine stillen Defaults", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "..", "js", "transformation.js"), "utf8");
  // Kleines Ziel über langen Zeitraum → Phasen statt erzwungenem 0,25-kg-Cut:
  assert.ok(!src.includes("Math.max(usedRate, cut ? 0.25"), "kein 0,25-kg-Wochen-Zwang mehr");
  assert.ok(!/Math\.max\(kcalDelta, 300\)/.test(src), "kein 300-kcal-Zwangsdefizit mehr");
  assert.ok(src.includes("phased_small"), "kleine Ziele bekommen aktive Phase + Stabilisierung");
  assert.ok(/Erhaltung\/Stabilisierung/.test(src), "Erhaltungsphase wird kommuniziert");
  // Fehlende Angaben → Feldfeedback statt erfundener Werte:
  assert.ok(!/heightCm\s*\)?\s*\|\|\s*180/.test(src), "kein stiller 180-cm-Fallback");
  assert.ok(!/\bage\s*\)?\s*\|\|\s*35\b/.test(src), "kein stiller 35-Jahre-Fallback");
  assert.ok(/ohne Alter ist keine seriöse Kalorienrechnung/.test(src), "Alter ist Pflicht mit Klartext-Feedback");
  // Enhanced ohne Pauschal-Volumengarantie:
  assert.ok(!/20-30\s*%/.test(src), "keine 20-30-Prozent-Volumen-Pauschale mehr");
});

test("13. Edge Function erzwingt Zielengine, Consent und Datenschutz-Header", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "..", "supabase", "functions", "mm-transform", "index.ts"), "utf8");
  assert.ok(src.includes('from "../_shared/transform-goals.mjs"'), "importiert die geteilte Zielengine");
  assert.ok(/validateTarget\(\{\s*weightKg:\s*currentKg/.test(src), "ruft validateTarget mit den Request-Werten auf");
  assert.ok(/verdictRes\.verdict !== "plausibel" && verdictRes\.verdict !== "ambitioniert"/.test(src), "nur freigegebene Verdikte generieren");
  assert.ok(src.includes('"x-fal-store-io": "0"'), "sendet x-fal-store-io: 0");
  assert.ok(src.includes("x-fal-object-lifecycle-preference"), "sendet Lifecycle-Header (Bildverfall)");
  assert.ok(src.includes("body.consent !== true"), "erzwingt die Einwilligung serverseitig");
  assert.ok(!/cutIntensity|sharply defined six-pack|visible veins/.test(src), "alte Pauschal-Prompts sind entfernt");
});
