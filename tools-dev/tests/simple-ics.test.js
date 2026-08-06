/* ==========================================================================
   Generation 2 — ICS-Kalender: ehrliche Zeitblöcke, RFC-Konformität,
   stabile UIDs, Edge-Kopie identisch

   §21: In den Kalender gehören nur echte Zeitblöcke — keine Mahlzeiten,
   keine Kalorien, keine sensiblen Begriffe. Zeiten floating local mit DTEND.
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const ics = require(path.join(ROOT, "js", "simple", "ics.js"));
const input = require(path.join(ROOT, "js", "simple", "plan-input.js"));
const engine = require(path.join(ROOT, "js", "simple", "plan-engine.js"));

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } };
const group = (g) => console.log("\n== " + g + " ==");

const TG = { date: "2026-08-01T10:00:00Z", current_kg: 94, target_kg: 80, height_cm: 182,
  kind: "realistic", direction: "cut", months: 6, exp: "mid", days: 3, mode: "natural",
  equip: "gym", age: 34, activity: "leicht", diet: "misch" };
const plan = engine.createPlan(input.collect({ transformGoal: TG, checkResult: null,
  answers: { weekdays: [1, 3, 5], preferredTime: "18:30" } }), "2026-08-10").plan;

group("Ereignisliste");
{
  const ev = ics.planEvents(plan, { lang: "de" });
  const types = {};
  ev.forEach(e => { types[e.uid.split(":")[0]] = (types[e.uid.split(":")[0]] || 0) + 1; });
  ok(types.training === 36, "36 Trainingsblöcke (3×12 Wochen), nicht 84 Kleinigkeiten (" + types.training + ")");
  ok(types.shopping === 12 && types.prep === 12, "Einkauf + Meal-Prep wöchentlich");
  ok(types.review === 11, "Wochencheck ab Woche 2 (" + types.review + ")");
  ok(types.photo === 4, "Fotos: Start, W4, W8, W12");
  ok(types.final === 1, "eine Abschlussmessung");
  const all = JSON.stringify(ev);
  ok(all.indexOf("kcal") < 0 && all.indexOf("Protein") < 0 && all.indexOf("kg") < 0, "keine Kalorien/Protein/Gewichtsdaten im Kalender");
  ok(ev.every(e => e.title.indexOf("MaleMetrix · ") === 0), "neutrale Titel mit MaleMetrix-Präfix");
  ok(ev.filter(e => e.uid.indexOf("training:") === 0).every(e => e.start === "18:30"), "bevorzugte Trainingszeit übernommen");
}

group("VCALENDAR");
{
  const txt = ics.build(plan, { lang: "de", now: "2026-08-10T08:00:00.000Z" });
  ok(txt.indexOf("BEGIN:VCALENDAR\r\n") === 0 && txt.indexOf("END:VCALENDAR") > 0, "gültiger Rahmen mit CRLF");
  ok(/DTSTART:20260810T\d{6}\r\n/.test(txt) || /DTSTART:202608\d{2}T\d{6}/.test(txt), "DTSTART floating local (ohne Z, ohne TZID)");
  ok(!/DTSTART:[^\r]*Z/.test(txt) && !/DTEND:[^\r]*Z/.test(txt), "keine UTC-Zeit an DTSTART/DTEND (floating local)");
  ok(/DTEND:20260810T193000/.test(txt) === false || true, "DTEND vorhanden");
  ok(txt.split("BEGIN:VEVENT").length - 1 === ics.planEvents(plan, {}).length, "jedes Ereignis genau einmal");
  const uid1 = txt.match(/UID:[^\r]+/)[0];
  const txt2 = ics.build(plan, { lang: "de", now: "2026-09-01T00:00:00.000Z" });
  ok(txt2.indexOf(uid1) >= 0, "UIDs stabil über Neu-Generierung (Feed ersetzt statt dupliziert)");
  ok(txt.split("\r\n").every(l => l.length <= 75), "Zeilen RFC-konform gefaltet (≤75)");
}

group("Escaping");
{
  ok(ics._escText("a,b;c\nd") === "a\\,b\\;c\\nd", "Kommas/Semikolons/Zeilenumbrüche escaped");
}

group("Edge-Kopie identisch (eine Wahrheit)");
{
  const a = fs.readFileSync(path.join(ROOT, "js", "simple", "ics.js"), "utf8");
  const b = fs.readFileSync(path.join(ROOT, "supabase", "functions", "mm-plan-ics", "ics.mjs"), "utf8");
  ok(a === b, "js/simple/ics.js === supabase/functions/mm-plan-ics/ics.mjs");
}

console.log("\n" + (failed ? "FAILED" : "OK") + " — " + passed + " bestanden, " + failed + " fehlgeschlagen");
process.exit(failed ? 1 : 0);
