/* ==========================================================================
   Entscheidungsschicht — Execution Score, Trajectory, Tagesauftrag, Maßnahmen

   Diese Suite ist bewusst adversariell aufgebaut: sie prueft zuerst die
   Faelle, in denen ein naives System dem Nutzer schadet.

     Plateau + schlechte Ausfuehrung  -> NICHT verschaerfen
     Schnelle Abnahme + Kraftverlust  -> NICHT weiter verschaerfen
     Eine schlechte Nacht             -> gar keine Reaktion
     Drei Tage Ausfall                -> Wiedereinstieg, KEINE Kompensation
     Urlaub                           -> Plan danach intakt

   Ausfuehren: node tools-dev/tests/decide.test.js
   ========================================================================== */
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const model = require(path.join(ROOT, "js/simple/plan-model.js"));
const engine = require(path.join(ROOT, "js/simple/plan-engine.js"));
const input = require(path.join(ROOT, "js/simple/plan-input.js"));
const weekly = require(path.join(ROOT, "js/simple/weekly-check.js"));
const decide = require(path.join(ROOT, "js/simple/decide.js"));

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } };
const group = (g) => console.log("\n== " + g + " ==");

/* ---------------- Testplan: 95 -> 85 kg, Mo/Mi/Fr, Start 2026-06-01 ------- */
function makePlan(over) {
  const tg = Object.assign({
    date: "2026-05-30T10:00:00Z", current_kg: 95, target_kg: 85, height_cm: 183,
    kind: "realistic", direction: "cut", months: 6, exp: "mid", days: 3,
    mode: "natural", equip: "gym", age: 34, activity: "moderat", diet: "misch"
  }, (over && over.tg) || {});
  const r = engine.createPlan(input.collect({
    transformGoal: tg, checkResult: null, answers: { weekdays: [1, 3, 5] }
  }), "2026-06-01");
  if (!r.ok) throw new Error("Testplan ungueltig: " + r.errors.join(", "));
  r.plan.status = "active";
  return r.plan;
}
const PLAN = makePlan();

/* Erzeugt ein Tagesprotokoll: `quote` = Anteil erfuellter Aufgaben (0..1). */
function makeDaylog(fromYmd, toYmd, quote, opts) {
  opts = opts || {};
  const log = {};
  let i = 0;
  for (let d = fromYmd; d <= toYmd; d = model.addDays(d, 1), i++) {
    if (opts.skipFrom && d >= opts.skipFrom) continue;      // Luecke ab hier
    const hit = (i % 10) < Math.round(quote * 10);   // deterministisch verteilt
    log[d] = { tasks: { training: hit, protein: hit, steps: hit }, closed: hit, workout: null };
  }
  return log;
}
function makeWeights(fromYmd, days, startKg, perWeek) {
  const out = [];
  for (let i = 0; i < days; i++) {
    out.push({ date: model.addDays(fromYmd, i), kg: Math.round((startKg + perWeek * (i / 7)) * 10) / 10 });
  }
  return out;
}

/* ========================= EXECUTION SCORE ============================== */
group("Execution Score: misst Ausfuehrung, nicht Ergebnis");
{
  const today = "2026-06-29";
  const perfect = makeDaylog("2026-06-15", "2026-06-28", 1);
  const e = decide.executionScore(PLAN, perfect, today, { days: 14, weights: makeWeights("2026-06-15", 14, 93, -0.5) });
  ok(e.score === 100, "alles erfuellt (inkl. Wiegen) -> 100 (war " + e.score + ")");
  const ohneWaage = decide.executionScore(PLAN, perfect, today, { days: 14 });
  ok(ohneWaage.score < 100 && ohneWaage.weighIn === 0,
    "wer nie wiegt, kommt nicht auf 100 — Messen ist Teil der Ausfuehrung (" + ohneWaage.score + ")");
  ok(e.training === 100 && e.nutrition === 100 && e.steps === 100, "alle Teilbereiche 100");
  ok(e.days === 14, "genau 14 Tage betrachtet");

  const none = decide.executionScore(PLAN, {}, today, { days: 14 });
  ok(none.score === 0, "leeres Protokoll -> 0, nicht null (Nichtstun ist eine Aussage)");

  const half = decide.executionScore(PLAN, makeDaylog("2026-06-15", "2026-06-28", 0.5), today, { days: 14 });
  ok(half.score > 30 && half.score < 70, "halbe Umsetzung liegt in der Mitte (" + half.score + ")");

  const kurz = decide.executionScore(PLAN, {}, "2026-06-01", { days: 14 });
  ok(kurz.score === null && kurz.reason === "zu_kurz",
    "am Starttag gibt es noch keinen Score statt einer 0 zu behaupten");
}

group("Execution Score: unter fuenf Tagen gibt es keine Quote");
{
  /* Gefunden im Browser-Durchlauf: am zweiten Nutzungstag stand auf dem
     Startbildschirm „Deine Umsetzung liegt bei 0 % ueber 1 Tage". Aus einem
     einzigen Tag. Eine Quote braucht Tage, sonst ist sie ein Vorwurf. */
  ok(decide.EXEC_MIN_DAYS === 5, "die Untergrenze ist benannt und exportiert");

  for (let n = 1; n < decide.EXEC_MIN_DAYS; n++) {
    const heute = model.addDays("2026-06-01", n);
    const e = decide.executionScore(PLAN, {}, heute, { days: 14 });
    ok(e.score === null && e.reason === "zu_wenige_tage",
      "nach " + n + " Tag(en) noch keine Quote (" + e.score + ")");
    ok(e.training === null && e.nutrition === null && e.steps === null && e.weighIn === null,
      "auch die Teilbereiche bleiben leer statt 0 zu behaupten (Tag " + n + ")");
  }

  const ab5 = decide.executionScore(PLAN, {}, model.addDays("2026-06-01", 5), { days: 14 });
  ok(ab5.score === 0 && ab5.days === 5,
    "ab fuenf Tagen zaehlt Nichtstun wieder als 0 — die Leitplanke ist eine Verzoegerung, keine Ausrede");

  /* Der Tagesauftrag darf die Zahl in dieser Zeit nicht erwaehnen. */
  const fruehText = JSON.stringify(decide.dailyPrescription({
    plan: PLAN, todayYmd: "2026-06-03", daylog: {}, weights: [], today: {}
  }));
  ok(!/Umsetzung liegt bei/.test(fruehText),
    "in der ersten Woche steht keine Umsetzungsquote im Tagesauftrag");
}

group("Execution Score: Grammatik im Umsetzungssatz");
{
  /* „ueber 1 Tage" war der zweite Teil desselben Befunds. */
  const log = makeDaylog("2026-06-15", "2026-06-28", 0.2);
  const schwach = decide.executionScore(PLAN, log, "2026-06-29", { days: 14 });
  const r = decide.dailyPrescription({
    plan: PLAN, todayYmd: "2026-06-29", daylog: log, execution: schwach, health: null
  });
  ok(/Umsetzung liegt bei/.test(JSON.stringify(r.why)),
    "bei schwacher Umsetzung wird die Quote genannt");
  ok(/über 14 Tage/.test(JSON.stringify(r.why)), "Plural bleibt Plural");

  /* Der Text muss auch dann stimmen, wenn ein Aufrufer einen Ein-Tages-Score
     hereinreicht — die Leitplanke sitzt in executionScore, die Grammatik hier. */
  const eins = decide.dailyPrescription({
    plan: PLAN, todayYmd: "2026-06-29", daylog: log,
    execution: { score: 20, days: 1 }, health: null
  });
  const t = JSON.stringify(eins.why);
  ok(/über einen Tag\./.test(t), "ein Tag heisst 'einen Tag'");
  ok(!/ 1 Tage/.test(t), "nie 'ueber 1 Tage'");
}

group("Execution Score: der heutige Tag zaehlt nicht mit");
{
  const log = makeDaylog("2026-06-15", "2026-06-28", 1);
  log["2026-06-29"] = { tasks: {}, closed: false };     // heute, noch nichts getan
  const w = makeWeights("2026-06-15", 14, 93, -0.5);    // an allen Wiege-Tagen gewogen
  const e = decide.executionScore(PLAN, log, "2026-06-29", { days: 14, weights: w });
  ok(e.score === 100, "der laufende Tag drueckt den Schnitt nicht (" + e.score + ")");
}

group("Execution Score: gemessene Schritte schlagen das Haekchen");
{
  const log = {};
  for (let d = "2026-06-22"; d <= "2026-06-28"; d = model.addDays(d, 1)) {
    log[d] = { tasks: { steps: false }, closed: false };   // Haekchen nie gesetzt
  }
  const stepsByDay = {};
  Object.keys(log).forEach((d) => { stepsByDay[d] = PLAN.dailyTargets.steps + 500; });
  const ohne = decide.executionScore(PLAN, log, "2026-06-29", { days: 7 });
  const mit = decide.executionScore(PLAN, log, "2026-06-29", { days: 7, stepsByDay: stepsByDay });
  ok(ohne.steps === 0, "ohne Health: kein Haekchen = 0 %");
  ok(mit.steps === 100, "mit Health: gelaufen ist gelaufen, auch ohne Haekchen");
  ok(mit.score > ohne.score, "der Gesamtscore steigt entsprechend");
}

/* ============================ MISSED STREAK ============================= */
group("Verpasste Tage: zaehlt nur zusammenhaengende Luecken");
{
  const log = makeDaylog("2026-06-15", "2026-06-25", 1);   // bis 25. alles gemacht
  ok(decide.missedStreak(PLAN, log, "2026-06-26").days === 0, "gestern erledigt -> 0");
  ok(decide.missedStreak(PLAN, log, "2026-06-27").days === 1, "ein Tag Luecke -> 1");
  ok(decide.missedStreak(PLAN, log, "2026-06-29").days === 3, "drei Tage Luecke -> 3");
  ok(decide.missedStreak(PLAN, {}, "2026-06-02").days === 1,
    "am zweiten Tag ohne Eintraege genau 1 — nicht 21 (Plananfang begrenzt)");
}

/* ======================== TAGESAUFTRAG: KERNFAELLE ====================== */
function rx(over) {
  return decide.dailyPrescription(Object.assign({
    plan: PLAN, todayYmd: "2026-06-29", daylog: makeDaylog("2026-06-15", "2026-06-28", 1),
    execution: { score: 92, days: 14 }, health: null, modifier: null
  }, over || {}));
}

group("Tagesauftrag: Standardfall bleibt kurz");
{
  const p = rx();                       // 2026-06-29 ist ein Montag = Trainingstag
  ok(p.training === true, "Montag ist Trainingstag");
  ok(p.mode === "normal", "Modus normal");
  ok(p.kcal === PLAN.nutrition.calorieTarget, "Kalorienziel unveraendert");
  ok(p.headline.de === "Trainingstag.", "kurze Ansage statt Dashboard");
  ok(p.why.length <= 2, "hoechstens zwei Begruendungen, wenn nichts los ist (" + p.why.length + ")");
}

group("ADVERSARIELL: eine schlechte Nacht aendert nichts");
{
  const p = rx({ health: { sleepHours: 5.2 } });
  ok(p.mode === "normal", "ein einzelnes Signal loest keine Planaenderung aus");
  ok(p.sessionMinutes === PLAN.training.maximumSessionMinutes, "Trainingsdauer unveraendert");
}

group("Zwei Erholungssignale zusammen: leichter, aber nicht gestrichen");
{
  const p = rx({ health: { sleepHours: 5.2, hrvMs: 30, baselineHrv: 60 } });
  ok(p.mode === "recover", "zwei Signale -> Modus recover");
  ok(p.training === true, "das Training faellt NICHT aus — nur das Volumen sinkt");
  ok(p.sessionMinutes <= 40, "Einheit verkuerzt");
  ok(p.why.some((w) => /Eine einzelne schlechte Nacht/.test(w.de)),
    "die Begruendung sagt ausdruecklich, dass eine Nacht allein nichts ausloest");
  // Microcopy: interne Schluessel duerfen nicht in den Nutzertext lecken
  const alleTexte = p.why.map((w) => w.de + " " + w.en).join(" ");
  ok(!/\bhrv\b|\bschlaf \+|\bruhepuls\b/.test(alleTexte),
    "keine internen Signalnamen im Text — es heisst 'Herzfrequenzvariabilitaet', nicht 'hrv'");
  ok(/Schlafdauer und Herzfrequenzvariabilität/.test(p.why[0].de),
    "die Signale werden ausgeschrieben und mit 'und' verbunden");
}

group("ADVERSARIELL: ein verpasster Tag wird nicht kommentiert");
{
  const log = makeDaylog("2026-06-15", "2026-06-27", 1);   // 28. fehlt
  const p = rx({ daylog: log });
  ok(p.missedDays === 1, "ein Tag verpasst");
  ok(!/ausgelassen|missed/i.test(p.headline.de + p.headline.en),
    "kein Hinweis, keine Ermahnung — ein Tag ist Rauschen");
}

group("Never miss twice: genau beim zweiten Tag");
{
  const log = makeDaylog("2026-06-15", "2026-06-26", 1);   // 27. + 28. fehlen
  const p = rx({ daylog: log });
  ok(p.missedDays === 2, "zwei Tage verpasst");
  ok(/Zwei Tage/.test(p.headline.de), "jetzt kommt genau ein Hinweis");
  ok(p.mode === "normal", "aber der Plan wird nicht umgebaut");
  ok(p.kcal === PLAN.nutrition.calorieTarget, "und die Kalorien bleiben");
}

group("ADVERSARIELL: Wiedereinstieg kompensiert nicht");
{
  const log = makeDaylog("2026-06-15", "2026-06-22", 1);   // 6 Tage Luecke
  const p = rx({ daylog: log, execution: { score: 40, days: 14 } });
  ok(p.mode === "reentry", "Modus Wiedereinstieg");
  ok(p.kcal === PLAN.nutrition.calorieTarget, "KEIN tieferes Defizit nach dem Ausfall");
  ok(p.steps <= PLAN.dailyTargets.steps, "KEIN erhoehtes Schrittziel als Strafe");
  ok(p.sessionMinutes <= 40, "die Einheit ist bewusst kleiner, nicht groesser");
  ok(p.why.some((w) => /nichts nachgeholt|nothing gets made up/i.test(w.de + w.en)),
    "die App sagt ausdruecklich, dass nichts nachgeholt wird");
  ok(p.why.some((w) => /nicht kaputt|not broken/i.test(w.de + w.en)),
    "und dass die Transformation nicht gescheitert ist");
}

group("Life happens: nur 30 Minuten");
{
  const p = rx({ modifier: { type: "zeit", minutes: 30 } });
  ok(p.mode === "short" && p.sessionMinutes === 30, "Einheit auf 30 Minuten gekuerzt");
  ok(p.training === true, "gestrichen wird nichts");
  ok(p.kcal === PLAN.nutrition.calorieTarget, "Ernaehrung bleibt unberuehrt");
}

group("Life happens: Auswaertsessen");
{
  const p = rx({ modifier: { type: "auswaerts" } });
  ok(p.kcal === PLAN.nutrition.calorieTarget, "das Tagesziel wird NICHT gesenkt");
  ok(p.why.some((w) => /kein Strafcardio|no punishment cardio/i.test(w.de + w.en)),
    "kein Strafcardio, keine ausgelassenen Mahlzeiten");
  ok(/Protein früh/.test(p.focus.de), "stattdessen eine umsetzbare Verteilungsregel");
}

group("Life happens: krank");
{
  const p = rx({ modifier: { type: "krank" } });
  ok(p.training === false, "kein Training");
  ok(p.kcal >= PLAN.nutrition.calorieTarget, "das Defizit wird aufgehoben, nicht vertieft");
  ok(p.steps <= 4000, "Schrittziel deutlich runter");
}

group("Gemeldete Umstaende schlagen Messwerte");
{
  const p = rx({ modifier: { type: "krank" }, health: { sleepHours: 8, hrvMs: 90, baselineHrv: 60 } });
  ok(p.mode === "recover" && p.training === false,
    "gute Health-Werte heben eine Krankmeldung nicht auf");
}

/* ============================= TRAJECTORY ============================== */
group("Trajectory: rechnet mit der gemessenen, nicht der geplanten Rate");
{
  const w = makeWeights("2026-06-15", 14, 93, -0.6);
  const tr = weekly.trend(w, "2026-06-29");
  const t = decide.trajectory(PLAN, tr, "2026-06-29", { score: 90 });
  ok(t && t.projectedDate, "es gibt ein Zieldatum (" + (t && t.projectedDate) + ")");
  ok(t.actualRatePerWeek < 0, "Rate negativ (Abnahme)");
  ok(["ahead", "on_track", "behind"].indexOf(t.status) >= 0, "Status gesetzt: " + t.status);
  ok(t.week12ProjectionKg > 0 && t.week12ProjectionKg < t.currentKg,
    "Projektion fuer Woche 12 liegt unter dem heutigen Gewicht");
}

group("Trajectory: ohne Bewegung wird KEIN Datum erfunden");
{
  const flat = weekly.trend(makeWeights("2026-06-15", 14, 93, 0), "2026-06-29");
  const t = decide.trajectory(PLAN, flat, "2026-06-29", { score: 90 });
  ok(t.projectedDate === null, "kein Zieldatum bei Stillstand");
  ok(t.status === "stalled", "stattdessen ehrlich: stalled");
}

group("Trajectory: falsche Richtung wird benannt");
{
  const up = weekly.trend(makeWeights("2026-06-15", 14, 93, +0.4), "2026-06-29");
  const t = decide.trajectory(PLAN, up, "2026-06-29", { score: 90 });
  ok(t.status === "wrong_direction", "Zunahme im Cut heisst wrong_direction, nicht 'noch 200 Wochen'");
  ok(t.projectedDate === null, "und kein Fantasiedatum");
}

group("Trajectory: ohne Datenlage null statt Schaetzung");
{
  ok(decide.trajectory(PLAN, null, "2026-06-29", {}) === null, "kein Trend -> null");
}

/* =========================== INTERVENTIONEN ============================ */
group("Maßnahme: genau eine Stellschraube, mit Pruefdatum");
{
  const dec = { rule: "wr_stall_adherent", changes: { "nutrition.calorieTarget": 2100 },
                reason: { de: "x", en: "x" }, trend: { deltaPerWeek: -0.1 } };
  const iv = decide.openIntervention(dec, { todayYmd: "2026-06-29" });
  ok(iv.variable === "nutrition.calorieTarget", "die eine veraenderte Variable ist festgehalten");
  ok(iv.reviewDate === "2026-07-13", "Pruefung nach 14 Tagen (" + iv.reviewDate + ")");
  ok(iv.baselineRatePerWeek === -0.1, "der Ausgangswert wird mitgeschrieben, sonst ist spaeter nichts vergleichbar");
  ok(decide.openIntervention({ rule: "wr_on_track", changes: null }, { todayYmd: "2026-06-29" }) === null,
    "eine Entscheidung ohne Aenderung erzeugt keine Maßnahme");
}

group("Maßnahme: Bewertung erst am Pruefdatum");
{
  const iv = decide.openIntervention({ rule: "r", changes: { "dailyTargets.steps": 10000 }, trend: { deltaPerWeek: -0.1 } },
    { todayYmd: "2026-06-29" });
  const early = decide.reviewIntervention(iv, { todayYmd: "2026-07-05", weightTrend: { deltaPerWeek: -0.5 } });
  ok(early.due === false, "vor dem Pruefdatum passiert nichts");
}

group("ADVERSARIELL: Maßnahme wird bei schlechter Ausfuehrung NICHT bewertet");
{
  const iv = decide.openIntervention({ rule: "r", changes: { "dailyTargets.steps": 10000 }, trend: { deltaPerWeek: -0.1 } },
    { todayYmd: "2026-06-29" });
  const r = decide.reviewIntervention(iv, {
    todayYmd: "2026-07-13", weightTrend: { deltaPerWeek: -0.05 },
    execution: { score: 51 }, plannedRatePerWeek: -0.5
  });
  ok(r.verdict === "inconclusive",
    "bei 51 % Umsetzung ist die Maßnahme nicht bewertbar — sonst wird die falsche Ursache verworfen");
}

group("Maßnahme: Wirkung erkannt, Ruecknahme bei Wirkungslosigkeit");
{
  const iv = decide.openIntervention({ rule: "r", changes: { "dailyTargets.steps": 10000 }, trend: { deltaPerWeek: -0.05 } },
    { todayYmd: "2026-06-29" });
  const good = decide.reviewIntervention(iv, {
    todayYmd: "2026-07-13", weightTrend: { deltaPerWeek: -0.48 },
    execution: { score: 92 }, plannedRatePerWeek: -0.5
  });
  ok(good.verdict === "kept", "im Zielkorridor -> bleibt");

  const nothing = decide.reviewIntervention(iv, {
    todayYmd: "2026-07-13", weightTrend: { deltaPerWeek: -0.02 },
    execution: { score: 92 }, plannedRatePerWeek: -0.5
  });
  ok(nothing.verdict === "reverted", "keine Wirkung trotz guter Umsetzung -> zurueckgenommen");
  ok(/bevor eine zweite dazukommt/.test(nothing.reason.de),
    "und die Begruendung nennt den Grund: eine Variable nach der anderen");
}

/* ============ ZUSAMMENSPIEL MIT DEM BESTEHENDEN WOCHENCHECK ============= */
group("ADVERSARIELL: Plateau + schlechte Ausfuehrung verschaerft nichts");
{
  const w = makeWeights("2026-06-15", 14, 90, 0);          // Stillstand
  const dec = weekly.decide({
    plan: PLAN, week: 5, todayYmd: "2026-06-29", weights: w,
    answers: { trainingsDone: 1, nutritionAdherence: "schlecht", hunger: "normal",
               energy: "gut", performance: "stabil", circumstances: [] }
  });
  ok(dec.changes === null, "keine Planaenderung");
  ok(dec.rule === "wr_stall_execution", "die Regel benennt Ausfuehrung als Ursache");
}

group("ADVERSARIELL: schnelle Abnahme wird entschaerft, nicht verschaerft");
{
  const w = makeWeights("2026-06-15", 14, 93, -1.6);       // viel zu schnell
  const dec = weekly.decide({
    plan: PLAN, week: 5, todayYmd: "2026-06-29", weights: w,
    answers: { trainingsDone: 3, nutritionAdherence: "gut", hunger: "hoch",
               energy: "schlecht", performance: "schlechter", circumstances: [] }
  });
  ok(dec.decision === "kcal_up", "Kalorien HOCH, nicht runter");
  ok(dec.changes["nutrition.calorieTarget"] > PLAN.nutrition.calorieTarget, "und zwar wirklich hoeher");
}

group("ADVERSARIELL: Urlaub zerstoert den Plan nicht");
{
  const planBefore = JSON.stringify(PLAN);
  const w = makeWeights("2026-06-15", 14, 93, 0);
  const dec = weekly.decide({
    plan: PLAN, week: 5, todayYmd: "2026-06-29", weights: w,
    answers: { trainingsDone: 0, nutritionAdherence: "schlecht", hunger: "normal",
               energy: "gut", performance: "stabil", circumstances: ["reise"] }
  });
  ok(dec.changes === null, "keine Aenderung nach einer Reisewoche");
  ok(JSON.stringify(PLAN) === planBefore, "der Plan wurde durch die Entscheidung nicht mutiert");

  // und der Tag danach ist ein Wiedereinstieg, kein Nachholprogramm
  const p = decide.dailyPrescription({
    plan: PLAN, todayYmd: "2026-06-29", daylog: makeDaylog("2026-06-08", "2026-06-21", 1),
    execution: { score: 55, days: 14 }
  });
  ok(p.mode === "reentry" && p.kcal === PLAN.nutrition.calorieTarget,
    "nach dem Urlaub: Wiedereinstieg ohne Nachholen");
}


group("ADVERSARIELL: wohlwollende Selbsteinschaetzung wird von der Messung ueberstimmt");
{
  const w = makeWeights("2026-06-15", 14, 90, 0);          // Stillstand
  const answers = { trainingsDone: 3, nutritionAdherence: "gut", hunger: "normal",
                    energy: "gut", performance: "stabil", circumstances: [] };

  // ohne Messung: wie bisher, Kalorien runter
  const ohne = weekly.decide({ plan: PLAN, week: 5, todayYmd: "2026-06-29", weights: w, answers: answers });
  ok(ohne.rule === "wr_stall_adherent" && ohne.changes,
    "ohne gemessene Ausfuehrung bleibt das alte Verhalten erhalten");

  // mit Messung, die der Selbstauskunft widerspricht: keine Aenderung
  const mit = weekly.decide({ plan: PLAN, week: 5, todayYmd: "2026-06-29", weights: w, answers: answers,
                              execution: { score: 48, days: 14 } });
  ok(mit.changes === null, "bei 48 % gemessener Umsetzung wird NICHT gekuerzt");
  ok(mit.rule === "wr_stall_selfreport_gap", "die Regel benennt die Luecke zwischen Selbstbild und Protokoll");
  ok(/48 %/.test(mit.reason.de), "und nennt die Zahl, statt nur zu widersprechen");

  // mit Messung, die sie bestaetigt: Anpassung wie vorgesehen
  const belegt = weekly.decide({ plan: PLAN, week: 5, todayYmd: "2026-06-29", weights: w, answers: answers,
                                 execution: { score: 93, days: 14 } });
  ok(belegt.rule === "wr_stall_adherent" && belegt.changes,
    "bei belegter guter Umsetzung wird angepasst — genau dann ist es sinnvoll");
}

group("ADVERSARIELL: Sicherheitsregeln stehen ueber der Messung");
{
  const w = makeWeights("2026-06-15", 14, 93, -1.6);
  const dec = weekly.decide({ plan: PLAN, week: 5, todayYmd: "2026-06-29", weights: w,
    answers: { trainingsDone: 3, nutritionAdherence: "gut", hunger: "normal", energy: "gut",
               performance: "stabil", circumstances: [] },
    execution: { score: 20, days: 14 } });
  ok(dec.decision === "kcal_up",
    "zu schneller Verlust wird auch bei mieser Umsetzung entschaerft — Sicherheit zuerst");
}

group("Determinismus");
{
  const a = JSON.stringify(rx());
  const b = JSON.stringify(rx());
  ok(a === b, "gleicher Zustand -> identischer Tagesauftrag");
}

/* ========================= PHASENBILANZ ================================= */
/* Gefunden im Browser-Durchlauf: der Abschlussbildschirm sagte
   „12 Wochen geschafft." bei 95 kg -> 93,7 kg und einem Ziel von 85 kg.
   Plan: Start 95, Phasenziel 87–89 (nahe Kante 89), Gesamtziel 85. */
function bilanz(endKg, execScore, over) {
  const w = endKg == null ? [] : [{ date: "2026-06-01", kg: 95 }, { date: "2026-08-24", kg: endKg }];
  const ex = execScore == null ? { score: null } : { score: execScore, days: 84 };
  return decide.phaseOutcome(over && over.plan ? over.plan : PLAN, over && over.weights ? over.weights : w, ex);
}
const alleTexte = (b) => [b.headline, b.verdict, b.nextStep]
  .map((t) => (t ? t.de + " | " + t.en : "")).join(" || ");

group("Phasenbilanz: Ziel erreicht");
{
  const b = bilanz(88.5, 96);
  ok(b.status === "erreicht", "88,5 kg bei Phasenziel 89 -> erreicht (" + b.status + ", " + b.reachedPct + " %)");
  ok(/Ziel erreicht/.test(b.headline.de), "und nur dann steht 'Ziel erreicht' in der Überschrift");
  ok(b.attribution === null, "bei Erfolg wird keine Ursache gesucht — das wäre eine Relativierung");
  ok(/85/.test(b.nextStep.de), "der nächste Schritt nennt das noch offene Gesamtziel");
}

group("Phasenbilanz: der gefundene Fall — 1,3 kg statt 6 kg");
{
  const b = bilanz(93.7, 45);
  ok(b.status === "kaum", "22 % des Phasenziels -> 'kaum', nicht 'geschafft' (" + b.status + ")");
  ok(!/geschafft|erreicht|Glückwunsch|stark|super/i.test(alleTexte(b)),
    "kein Lob für ein verfehltes Ziel — an keiner Stelle des Bildschirms");
  ok(/1,3 kg abgenommen/.test(b.verdict.de), "die tatsächliche Veränderung wird genannt — mit Komma");
  ok(/6 kg/.test(b.verdict.de), "und die geplante daneben");
  ok(!/\d\.\d/.test(alleTexte(b).split("||")[0]), "im deutschen Satz steht kein Dezimalpunkt");
  ok(b.attribution === "ausfuehrung", "bei 45 % Umsetzung liegt es an der Ausführung");
  ok(/nicht schärfere|dieselben Zahlen/.test(b.nextStep.de),
    "und der Plan wird deshalb NICHT verschärft");
}

group("Phasenbilanz: gut umgesetzt und trotzdem verfehlt -> der Plan war schuld");
{
  const b = bilanz(93.7, 92);
  ok(b.attribution === "plan", "ab 85 % Umsetzung liegt es an den Zahlen, nicht am Nutzer");
  ok(/nicht an dir/.test(b.nextStep.de), "das wird auch so gesagt");
  ok(/gemessenen Verbrauch/.test(b.nextStep.de), "und die Konsequenz benannt: gemessener statt berechneter Verbrauch");
  const mittel = bilanz(93.7, 78);
  ok(mittel.attribution === "unklar", "zwischen 70 und 85 wird keine Ursache behauptet");
  const ohne = bilanz(93.7, null);
  ok(ohne.attribution === "unklar", "ohne Umsetzungsdaten erst recht nicht");
}

group("Phasenbilanz: Teilerfolg wird als Teilerfolg benannt");
{
  const b = bilanz(91.5, 88);
  ok(b.status === "teilweise", "58 % -> teilweise (" + b.reachedPct + " %)");
  ok(/3,5 kg abgenommen/.test(b.headline.de), "die Überschrift nennt die echte Strecke");
  ok(!/geschafft/.test(alleTexte(b)), "aber sie sagt nicht 'geschafft'");
}

group("Phasenbilanz: falsche Richtung wird nicht beschönigt");
{
  const b = bilanz(96.2, 30);
  ok(b.status === "falsche_richtung", "zugenommen im Cut -> falsche_richtung");
  ok(/nicht in die geplante Richtung/.test(b.verdict.de), "das steht als Satz da");
  ok(!/geschafft|erreicht/.test(alleTexte(b)), "und wird nicht gefeiert");
  const stillstand = bilanz(95, 30);
  ok(stillstand.status === "falsche_richtung", "Stillstand zählt genauso — 0 kg ist kein Fortschritt");
}

group("Phasenbilanz: ohne Wiegungen gibt es kein Ergebnis");
{
  const leer = bilanz(null, 90);
  ok(leer.status === "keine_daten", "keine Wiegungen -> keine_daten");
  ok(leer.reachedPct === null && leer.endKg === null, "keine erfundenen Zahlen");
  ok(/zu wenige Wiegungen/.test(leer.verdict.de), "der Grund wird genannt");
  ok(/Wiege-Tag/.test(leer.nextStep.de), "und der nächste Schritt ist die kleinste sinnvolle Änderung");
  const eine = decide.phaseOutcome(PLAN, [{ date: "2026-06-01", kg: 95 }], { score: 90 });
  ok(eine.status === "keine_daten", "eine einzelne Wiegung ist auch keine Bilanz");
}

group("Phasenbilanz: Aufbau statt Abnahme");
{
  const auf = makePlan({ tg: { current_kg: 70, target_kg: 78, direction: "gain", kind: "realistic" } });
  const b = decide.phaseOutcome(auf, [{ date: "2026-06-01", kg: 70 }, { date: "2026-08-24", kg: 74 }], { score: 90 });
  ok(b.status === "erreicht" || b.status === "teilweise",
    "Zunahme zählt im Aufbau als Fortschritt (" + b.status + ", " + b.reachedPct + " %)");
  ok(/zugenommen/.test(alleTexte(b)), "und heißt dann 'zugenommen', nicht 'abgenommen'");
  const runter = decide.phaseOutcome(auf, [{ date: "2026-06-01", kg: 70 }, { date: "2026-08-24", kg: 69 }], { score: 90 });
  ok(runter.status === "falsche_richtung", "Abnahme im Aufbau ist die falsche Richtung");
}

group("Phasenbilanz: keine internen Begriffe im Nutzertext, deterministisch");
{
  const b = bilanz(93.7, 45);
  ok(!/ausfuehrung|falsche_richtung|keine_daten|reachedPct|attribution/.test(alleTexte(b)),
    "keine Statusschlüssel im sichtbaren Text");
  ok(JSON.stringify(bilanz(93.7, 45)) === JSON.stringify(bilanz(93.7, 45)),
    "gleiche Eingabe -> identische Bilanz");
  ok(b.headline && b.verdict && b.nextStep, "jeder Fall hat Überschrift, Befund und genau einen nächsten Schritt");
}

group("Am Ziel gibt es kein Zieldatum mehr");
{
  /* „85 kg am 24. Sept. — 23 Tage später als geplant" stand auf dem
     Fortschritt, waehrend der Nutzer bei 82,9 kg war. remaining wurde ohne
     Vorzeichenpruefung gerechnet, Math.abs machte daraus eine Restdauer. */
  const amZiel = decide.trajectory(PLAN, { thisWeekAvg: 84.5, deltaPerWeek: -0.05, weeks: 4 }, "2026-07-20", { score: 90 });
  ok(amZiel.status === "goal_reached", "unter dem Ziel -> goal_reached (" + amZiel.status + ")");
  ok(amZiel.projectedDate === null, "und kein Datum");
  ok(amZiel.daysVsPlan == null, "und kein 'Tage später als geplant'");

  const genau = decide.trajectory(PLAN, { thisWeekAvg: 85, deltaPerWeek: -0.3, weeks: 4 }, "2026-07-20", { score: 90 });
  ok(genau.status === "goal_reached", "genau auf dem Ziel zaehlt als erreicht");

  const unterwegs = decide.trajectory(PLAN, { thisWeekAvg: 90, deltaPerWeek: -0.4, weeks: 4 }, "2026-07-20", { score: 90 });
  ok(unterwegs.projectedDate != null, "unterwegs gibt es weiterhin ein Datum (" + unterwegs.projectedDate + ")");
}

group("Gemessene Tage sind keine Ausfalltage");
{
  /* Wer sein Essen protokolliert oder dessen Schritte aus Apple Health
     kommen, setzt kein Haekchen — und galt als abwesend. Die App bot ihm
     „Wiedereinstieg nach 3 Tagen Pause" an, obwohl sie seine Daten hat. */
  const leer = decide.missedStreak(PLAN, {}, "2026-06-29");
  ok(leer.days > 0, "ohne jede Spur zaehlt der Ausfall weiter (" + leer.days + ")");

  const mitSchritten = decide.missedStreak(PLAN, {}, "2026-06-29", { stepsByDay: { "2026-06-28": 9000 } });
  ok(mitSchritten.days === 0, "gemessene Schritte beenden die Zaehlung (" + mitSchritten.days + ")");

  const mitEssen = decide.missedStreak(PLAN, {}, "2026-06-29", { nutritionByDay: { "2026-06-28": true } });
  ok(mitEssen.days === 0, "ein Essens-Eintrag ebenso (" + mitEssen.days + ")");

  /* Ein NICHT erreichter Tag im Essens-Protokoll ist trotzdem ein Tag, an
     dem etwas passiert ist — aber `false` heisst „gemessen und verfehlt",
     nicht „anwesend". Bewusst nur `true` zaehlt. */
  const verfehlt = decide.missedStreak(PLAN, {}, "2026-06-29", { nutritionByDay: { "2026-06-28": false } });
  ok(verfehlt.days > 0, "ein verfehlter Tag beendet die Zaehlung nicht");

  /* Und der Tagesauftrag reicht die Quellen wirklich durch. */
  const r = decide.dailyPrescription({
    plan: PLAN, todayYmd: "2026-06-29", daylog: {},
    stepsByDay: { "2026-06-28": 9000, "2026-06-27": 9000, "2026-06-26": 9000 },
    execution: { score: 90, days: 14 }, health: null
  });
  ok(r.mode !== "reentry", "kein Wiedereinstieg, wenn Schritte gemessen wurden (" + r.mode + ")");
}

console.log("\n" + (failed ? "FAILED" : "OK") + " — " + passed + " bestanden, " + failed + " fehlgeschlagen");
process.exit(failed ? 1 : 0);
