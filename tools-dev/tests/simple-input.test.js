/* ==========================================================================
   Generation 2 — Plan-Input: Transformation→Plan, Score→Plan, Fragebogen

   Geprüft wird die Verbindungsschicht: das gewählte Transformationsziel wird
   übernommen (nie neu erfunden), jeder Score-Engpass hat eine konkrete
   Plankonsequenz, der Fragebogen fragt nichts doppelt und nichts ohne
   Wirkung, und fehlende Pflichtdaten werden gemeldet statt still ersetzt.
   ========================================================================== */
const path = require("path");
const input = require(path.join(__dirname, "..", "..", "js", "simple", "plan-input.js"));

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } };
const group = (g) => console.log("\n== " + g + " ==");

const TG = { date: "2026-08-01T10:00:00Z", current_kg: 94, target_kg: 80, height_cm: 182,
  waist_cm: 102, kind: "realistic", direction: "cut", months: 6, exp: "mid", days: 3,
  mode: "natural", equip: "gym", age: 34, activity: "leicht" };

const CR = { date: "2026-08-02T10:00:00Z", total: 61,
  bottleneck: { key: "recovery", domain: "recovery", name: "Schlaf & Regeneration" },
  secondaryPriorities: [{ domain: "fuel" }, { domain: "execution" }, { domain: "body" }],
  flags: [] };

group("Transformation → Plan (§6)");
{
  const t = input.mapTransformation(TG);
  ok(t.startWeightKg === 94 && t.finalTargetWeightKg === 80, "Ausgangs- und Zielgewicht übernommen");
  ok(t.targetType === "realistic" && t.selectedAt === TG.date, "Zielvariante + Auswahldatum übernommen");
  ok(t.experience === "mid" && t.location === "gym" && t.trainingDaysWish === 3, "Kontext übernommen — wird nie doppelt gefragt");
  ok(input.mapTransformation(null) === null, "ohne Transformation kein erfundenes Ziel");
  ok(input.mapTransformation({ current_kg: 90 }) === null, "ohne Zielgewicht kein Mapping");
}

group("Score → Plan (§7): jede Domäne hat eine Konsequenz");
{
  const domains = ["body", "strength", "fuel", "recovery", "blood", "drive", "execution"];
  ok(domains.every(d => input.SCORE_RULES[d] && input.SCORE_RULES[d].consequence && Object.keys(input.SCORE_RULES[d].effects).length > 0),
     "alle 7 Score-Domänen → konkrete Effekte + sichtbarer Konsequenz-Satz");
  ok(domains.every(d => input.SCORE_RULES[d].consequenceEn), "Konsequenzen auch auf Englisch");
}

group("Score-Mapping");
{
  const s = input.mapScore(CR);
  ok(s.primaryBottleneck === "recovery", "Engpass erkannt");
  ok(s.relevantFactors.length === 2 && s.relevantFactors[0] === "fuel" && s.relevantFactors[1] === "execution",
     "höchstens zwei weitere Faktoren");
  ok(s.effects.daysCap === 3 && s.effects.sleepAnchor === true, "Regenerations-Effekte: max 3 Tage + Schlafanker");
  ok(s.effects.rateFactor === 0.85, "moderate Rate");
  ok(s.consequence.indexOf("Regeneration") >= 0, "Konsequenz-Satz benennt den Engpass");
  ok(input.mapScore(null) === null, "ohne Score kein erfundener Kontext (Score ist Input, kein Gate)");
}

group("Red Flags → konservative Planung");
{
  const cr = JSON.parse(JSON.stringify(CR));
  cr.bottleneck = { key: "strength", domain: "strength" };
  cr.secondaryPriorities = [];
  cr.flags = [{ label: "Blutdruck-Hinweis" }];
  const s = input.mapScore(cr);
  ok(s.medicalCautions.length === 1, "Warnsignal übernommen");
  ok(s.effects.conservative === true && s.effects.medicalNote === true, "konservative Planung erzwungen");
  ok(s.effects.rateFactor <= 0.85, "Rate gedeckelt bei Warnsignalen");
}

group("Fragebogen (§8): keine Frage ohne Wirkung, nichts doppelt");
{
  ok(input.QUESTIONS.every(q => q.why && q.why.length > 5 && q.whyEn), "jede Frage nennt ihre Plan-Wirkung (DE+EN)");
  const q = input.questionsFor({ tg: TG, trf: input.mapTransformation(TG), answers: {} });
  const byId = {}; q.forEach(x => { byId[x.id] = x; });
  ok(byId.experience.prefilled && byId.experience.value === "mid", "Erfahrung aus Transformation vorbefüllt");
  ok(byId.location.prefilled && byId.location.value === "gym", "Ort vorbefüllt");
  ok(byId.daysPerWeek.prefilled && byId.daysPerWeek.value === 3, "Trainingstage vorbefüllt");
  ok(byId.age.prefilled && byId.age.value === 34, "Alter aus Transformation vorbefüllt");
  ok(!byId.weekdays.prefilled, "Wochentage sind wirklich neu (fragt nur, was fehlt)");
  const sections = new Set(q.map(x => x.section));
  ok(sections.has("training") && sections.has("nutrition") && sections.has("daily"), "Bereiche Training/Ernährung/Alltag");
}

group("collect(): Pflichtfelder ohne stille Defaults");
{
  const r = input.collect({ transformGoal: TG, checkResult: CR, answers: { weekdays: [1, 3, 5] } });
  ok(r.ok, "vollständiger Input ist ok: " + r.missing.join(","));
  ok(r.answers.mealCount === 3 && r.answers.steps === 8000, "optionale Felder mit sichtbarem Default");

  const r2 = input.collect({ transformGoal: TG, checkResult: null, answers: {} });
  ok(!r2.ok && r2.missing.indexOf("weekdays") >= 0, "fehlende Wochentage werden gemeldet");
  ok(r2.score === null, "ohne Score bleibt scoreContext leer statt erfunden");

  const r3 = input.collect({ transformGoal: null, answers: { weekdays: [1, 3, 5] } });
  ok(!r3.ok && r3.missing.indexOf("transformation") >= 0, "ohne Transformation kein Plan");

  const r4 = input.collect({ transformGoal: TG, answers: { weekdays: [1, 3], daysPerWeek: 3 } });
  ok(!r4.ok && r4.missing.indexOf("weekdays") >= 0, "weekdays ≠ daysPerWeek wird gemeldet, nicht still repariert");

  const tgOhneAlter = Object.assign({}, TG); delete tgOhneAlter.age;
  const r5 = input.collect({ transformGoal: tgOhneAlter, answers: { weekdays: [1, 3, 5] } });
  ok(!r5.ok && r5.missing.indexOf("age") >= 0, "ohne Alter keine Kalorienrechnung — wird gefragt, nie erfunden");
}

console.log("\n" + (failed ? "FAILED" : "OK") + " — " + passed + " bestanden, " + failed + " fehlgeschlagen");
process.exit(failed ? 1 : 0);
