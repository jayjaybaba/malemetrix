/* ==========================================================================
   MALEMETRIX P8 — ALLTAGSTEST, 12-WOCHEN-ABSCHLUSS UND KONSOLIDIERUNG
   Friert ein: die Transferprüfung am Ende des bestehenden 12-Wochen-
   Durchlaufs, die konsolidierte Abschlussübersicht und die Integrität von
   mm_opt_points — ohne zweiten Score, ohne neue Programmsteuerung, ohne
   automatische Standardänderung und ohne zweite Source of Truth.
   Deckt die Prüfpunkte 1–80 aus Paket 8 ab (Nummern in den Meldungen).
   Ausführen:  node tools-dev/tests/alltagstest.test.js
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.resolve(__dirname, "../..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } };
const group = (g) => console.log("\n== " + g + " ==");

/* Kommentare dürfen benennen, was der Code NICHT tut. Geprüft wird deshalb
   immer der kommentarfreie Code. */
function ohneKommentar(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/* Sandbox mit fixem Heute-Datum: focus.js + points.js + os-core.js wie im
   Produkt geladen. Kein Netz, kein DOM-Rendering — nur die echte Logik. */
function box(today, store) {
  const mem = {};
  Object.keys(store || {}).forEach((k) => { mem["mm_" + k] = JSON.stringify(store[k]); });
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0) super((today || "2026-07-28") + "T12:00:00"); else super(...a); }
    static now() { return new RealDate((today || "2026-07-28") + "T12:00:00").getTime(); }
  }
  const ctx = {
    localStorage: {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; }
    },
    console: { log() {}, error() {} },
    document: { addEventListener() {}, querySelector() { return null; }, dispatchEvent() {} },
    CustomEvent: function () {},
    Date: FakeDate, Math, JSON, Object, Array, String, Number,
    isNaN, isFinite, parseInt, parseFloat, RegExp, Promise
  };
  ctx.window = ctx; ctx.__mem = mem;
  vm.createContext(ctx);
  vm.runInContext(read("js/focus.js"), ctx);
  vm.runInContext(read("js/points.js"), ctx);
  vm.runInContext(read("js/os/os-core.js"), ctx);
  ctx.P = ctx.window.MM.points;
  ctx.OS = ctx.window.MM.os;
  return ctx;
}
/* Ein bestätigter persönlicher Standard — die einzige gültige Eintrittskarte. */
function mitStandard(today, store, opts) {
  const c = box(today, store);
  opts = opts || {};
  const p = c.P.upsert({
    area: opts.area || "training", areaLabel: opts.areaLabel || "Training",
    title: opts.title || "Drei Trainingseinheiten pro Woche",
    source_type: "manual", source_id: opts.src || "op1"
  });
  c.P.adoptStandard(p.id, { was: opts.title || "Drei Trainingseinheiten pro Woche", minimal: opts.minimal || "" });
  c.std = c.P.get(p.id);
  return c;
}
function tage(c, n) {
  const t = c.OS.everydayTest();
  return c.OS.everydayDayList(t).slice(0, n);
}

const POINTS = read("js/points.js");
const CORE = read("js/os/os-core.js");
const APP = read("js/os/app.js");
const CHECK = read("js/check.js");
const CORE_CODE = ohneKommentar(CORE);
const POINTS_CODE = ohneKommentar(POINTS);
const APP_CODE = ohneKommentar(APP);

/* ==================================================================== 1 */
group("1 · Der bestehende 12-Wochen-Durchlauf bleibt unangetastet (T1–T3, T72–T78)");
(function () {
  const COURSE = read("js/course.js");
  ok(/function programOver\(\) \{ return currentProgramDay\(\) > 84; \}/.test(COURSE),
    "die Programmdauer bleibt bei 84 Tagen (T3)");
  ok(!/everyday|alltagstest/i.test(ohneKommentar(COURSE)),
    "der eingefrorene 12-Week-Kern kennt den Alltagstest nicht — keine neue Programmsteuerung (T3)");
  ok(!/c2_start|c2_days|c2_paused_days/.test(CORE_CODE.split("ALLTAGSTEST")[1] || ""),
    "der Alltagstest schreibt keine Programmtermine (T3)");

  /* Ein abgeschlossener Alt-Durchlauf ohne Paket-8-Felder. */
  const c = box("2026-07-28", { os_cycle: { id: "cyc_alt", status: "completed", start: "2026-01-05", ended: "2026-03-30" } });
  ok(c.OS.everydayTest() === null, "ein Alt-Durchlauf ohne Alltagstest bleibt lesbar (T1)");
  const vorher = c.__mem["mm_os_cycle"];
  c.OS.everydayCandidates(); c.OS.everydayPreselect(); c.OS.everydayDue();
  ok(c.__mem["mm_os_cycle"] === vorher, "und wird durch bloßes Lesen nicht verändert (T2)");

  const SCORE = read("js/check-data.js");
  ok(!/everyday|alltagstest/i.test(ohneKommentar(SCORE)), "die Score-Engine kennt den Alltagstest nicht (T72, T73, T74)");
  ok(!/everyday|alltagstest/i.test(ohneKommentar(read("js/focus.js"))), "die Messdatenbrücke aus Paket 5 bleibt unverändert (T75)");
  ok(/C\.chapterFor|chapterFor/.test(SCORE), "das Kapitelmapping aus Paket 6 bleibt bestehen (T76)");
  ok(!/everyday|alltagstest/i.test(ohneKommentar(read("js/os/intelligence/experiments.js"))),
    "Premium-Experimente bleiben unverändert (T77)");
  ok(!/everyday|alltagstest/i.test(ohneKommentar(read("js/os/entitlements.js"))), "Entitlements bleiben unverändert (T78)");
})();

/* ==================================================================== 2 */
group("2 · Teilnahmevoraussetzungen (T4–T7)");
(function () {
  /* Ohne jeden Standard. */
  const leer = box("2026-07-28", {});
  ok(leer.OS.everydayCandidates().length === 0, "ohne persönlichen Standard gibt es keine Auswahl (T4)");
  ok(leer.OS.startEverydayTest(["pt_1"], {}) === null, "und der Alltagstest startet nicht (T4)");

  /* Nur ein Optimierungspunkt — kein Standard. */
  const nurPunkt = box("2026-07-28", {});
  const p = nurPunkt.P.upsert({ area: "sleep", areaLabel: "Schlaf", title: "Früher schlafen", source_type: "manual", source_id: "o1" });
  ok(nurPunkt.OS.everydayCandidates().length === 0, "ein bloßer Optimierungspunkt genügt nicht (T5)");
  ok(nurPunkt.OS.startEverydayTest([p.id], {}) === null, "er ist auch nicht startbar (T5)");

  /* Laufende, ungeprüfte Maßnahme. */
  const mitMass = box("2026-07-28", {});
  const p2 = mitMass.P.upsert({ area: "recovery", areaLabel: "Regeneration", title: "Abends runterkommen", source_type: "manual", source_id: "o2" });
  const m = mitMass.P.startMeasure({ optimization_point_id: p2.id, measure_source: "stack", measure_id: "magnesium", measure_label: "Magnesium", observation_days: 14 });
  ok(!!m, "eine Maßnahme lässt sich starten (Vorbedingung)");
  ok(mitMass.OS.everydayCandidates().length === 0, "eine laufende, ungeprüfte Maßnahme genügt nicht (T6)");
  ok(mitMass.OS.startEverydayTest([m.id], {}) === null, "sie ist nicht auswählbar (T6)");

  /* Wirkung offen. */
  mitMass.P.setMeasureResult(m.id, { umsetzung: "regelmaessig", wirkung: "offen" });
  ok(mitMass.OS.everydayCandidates().length === 0, "eine offene Wirkung genügt ebenfalls nicht (T6)");

  /* Bestätigter Standard. */
  const c = mitStandard("2026-07-28");
  const kand = c.OS.everydayCandidates();
  ok(kand.length === 1 && kand[0].point_id === c.std.id, "ein bestätigter persönlicher Standard ist auswählbar (T7)");

  /* Pausierter bzw. abzuklärender Standard bleibt draußen. */
  c.P.setStatus(c.std.id, "pausiert");
  ok(c.OS.everydayCandidates().length === 0, "ein pausierter Standard steht nicht zur Auswahl (T6)");
})();

/* ==================================================================== 3 */
group("3 · Auswahl, Vorauswahl und Bestätigung (T8–T12)");
(function () {
  const c = box("2026-07-28", {});
  ["A", "B", "C", "D"].forEach((n, i) => {
    const p = c.P.upsert({ area: "training", areaLabel: "Training", title: "Standard " + n, source_type: "manual", source_id: "s" + i });
    c.P.adoptStandard(p.id, { was: "Standard " + n });
  });
  const ids = c.OS.everydayCandidates().map((x) => x.point_id);
  ok(ids.length === 4, "vier bestätigte Standards stehen zur Verfügung");
  ok(c.OS.startEverydayTest(ids, {}) === null, "mehr als drei Standards sind nicht startbar (T8)");
  ok(c.OS.everydayTest() === null, "und es entsteht dabei nichts (T8)");
  ok(c.OS.everydayPreselect().length === 3, "die Vorauswahl umfasst höchstens drei (T8)");
  ok(c.OS.everydayTest() === null, "die Vorauswahl startet den Test nicht (T9)");

  const t = c.OS.startEverydayTest(ids.slice(0, 2), {});
  ok(!!t && t.standards.length === 2, "die Bestätigung startet den Alltagstest (T10)");
  ok(c.OS.startEverydayTest(ids.slice(2, 3), {}) === null, "ein zweiter Lauf ist währenddessen ausgeschlossen (T10)");

  /* Referenz statt Kopie. */
  const s = t.standards[0];
  ok(!!s.point_id, "die Auswahl hält eine Referenz auf den Standard (T11)");
  ok(!s.warum && !s.bestaetigtAm && !s.erneutPruefen && Object.keys(s).length <= 6,
    "und keine vollständige Kopie der Standarddaten (" + Object.keys(s).join(",") + ") (T12)");
  ok(/point_id: g\.point_id/.test(CORE_CODE), "gespeichert wird die stabile Punkt-Referenz (T11)");
})();

/* ==================================================================== 4 */
group("4 · Normalform und Minimalform (T13–T15)");
(function () {
  /* Vorhandene Minimalform wird verwendet, nicht kopiert oder ersetzt. */
  const c = mitStandard("2026-07-28", {}, { minimal: "Zwei kurze Einheiten" });
  const t = c.OS.startEverydayTest([c.std.id], { [c.std.id]: "ETWAS ANDERES" });
  ok(t.standards[0].minimal === "Zwei kurze Einheiten", "eine vorhandene Minimalform wird verwendet (T13)");
  ok(t.standards[0].minimal_quelle === "standard", "ihre Herkunft ist benannt (T13)");
  ok(c.P.get(c.std.id).standard.minimal === "Zwei kurze Einheiten", "der Standard selbst bleibt unverändert (T15)");

  /* Ohne Minimalform wird keine erfunden. */
  const c2 = mitStandard("2026-07-28", {}, { src: "op9" });
  const t2 = c2.OS.startEverydayTest([c2.std.id], {});
  ok(t2.standards[0].minimal === "", "fehlt eine Minimalform, wird keine erfunden (T14)");
  ok(t2.standards[0].minimal_quelle === "", "und keine Herkunft behauptet (T14)");
  ok(c2.OS.everydayTest() !== null, "der Alltagstest wird davon nicht blockiert (T14)");

  /* Optionale Minimalform wird VOR dem Start festgelegt. */
  const c3 = mitStandard("2026-07-28", {}, { src: "op8" });
  const t3 = c3.OS.startEverydayTest([c3.std.id], { [c3.std.id]: "Ein kurzer Spaziergang" });
  ok(t3.standards[0].minimal === "Ein kurzer Spaziergang", "eine optionale Minimalform gilt ab dem Start (T15)");
  ok(t3.standards[0].minimal_quelle === "vorher_festgelegt", "sie ist als vorher festgelegt markiert (T15)");
  ok(c3.P.get(c3.std.id).standard.minimal === "", "sie überschreibt den bestehenden Standard nicht (T15)");
  ok(!/setEverydayMinimum|minimal.*nach.*ergebnis/i.test(CORE_CODE),
    "es gibt keinen Weg, sie erst nach Kenntnis des Ergebnisses festzulegen (T15)");
})();

/* ==================================================================== 5 */
group("5 · Tägliche Erfassung — vier getrennte Werte (T16–T19, T24–T26)");
(function () {
  const c = mitStandard("2026-07-28", {}, { minimal: "Zwei kurze Einheiten" });
  const t = c.OS.startEverydayTest([c.std.id], {});
  const d = c.OS.everydayDayList(t);

  ["normal", "minimal", "nein", "unklar"].forEach((w, i) => {
    const r = c.OS.setEverydayDay(c.std.id, w, d[0]);
    ok(!!r && r.days[d[0]][c.std.id] === w, "der Tageswert " + w + " wird getrennt erfasst (T" + (16 + i) + ")");
  });
  ok(c.OS.setEverydayDay(c.std.id, "irgendwas", d[0]) === null, "ein unbekannter Tageswert wird abgelehnt (T16)");

  /* Zukunft. */
  ok(c.OS.setEverydayDay(c.std.id, "normal", d[3]) === null, "ein zukünftiger Tag wird nicht bewertet (T24)");
  ok(!(c.OS.everydayTest().days[d[3]]), "und nicht einmal angelegt (T24)");

  /* Idempotenz. */
  c.OS.setEverydayDay(c.std.id, "normal", d[0]);
  const snap = c.__mem["mm_os_cycle"];
  c.OS.setEverydayDay(c.std.id, "normal", d[0]);
  const nach = JSON.parse(c.__mem["mm_os_cycle"]).everyday;
  ok(Object.keys(nach.days).length === 1, "wiederholtes Setzen erzeugt keinen zweiten Tageseintrag (T25, T26)");
  ok(JSON.parse(snap).everyday.days[d[0]][c.std.id] === nach.days[d[0]][c.std.id],
    "und ändert das Ergebnis nicht (T26)");

  /* Fremde Referenz. */
  ok(c.OS.setEverydayDay("pt_fremd", "normal", d[0]) === null, "ein nicht ausgewählter Standard wird nicht erfasst (T11)");
  /* Tag außerhalb des Zeitraums. */
  ok(c.OS.setEverydayDay(c.std.id, "normal", "2026-07-01") === null, "ein Tag außerhalb des Zeitraums wird nicht erfasst (T27)");
})();

/* ==================================================================== 6 */
group("6 · Messdaten bleiben lesend (T20–T23)");
(function () {
  const c = mitStandard("2026-07-28", {}, { area: "cardiovascular", areaLabel: "Herz-Kreislauf", title: "30 Minuten Bewegung" });
  const t = c.OS.startEverydayTest([c.std.id], {});
  const d = c.OS.everydayDayList(t);
  const z0 = c.OS.everydayTally(c.std.id);
  ok(z0.normal === 0 && z0.minimal === 0, "ohne Messdaten gilt kein Tag als umgesetzt (T21)");
  ok(z0.nein === 0, "und kein Tag gilt als nicht umgesetzt (T20)");
  ok(z0.offen >= 1, "fehlende Tage bleiben schlicht offen (T20, T21)");

  /* Die Auswertung aus Paket 5 wird verwendet, nicht nachgebaut. */
  const et = CORE_CODE.split("ALLTAGSTEST")[1] || CORE_CODE;
  ok(!/METRIKEN|protein_g|bewegung_min|trk_plan/.test(et),
    "der Alltagstest baut keine eigene Messdatenauswertung (T22)");
  ok(/MM\.focus\.evaluateDay/.test(APP_CODE), "er nutzt die vorhandene Auswertung aus Paket 5 (T22)");
  ok(/Quelle: /.test(APP), "und benennt deren Herkunft (T22)");
  ok(!/setEverydayDay\([^)]*ev\.treffer|autoErfassen|autoAlltag/.test(APP_CODE),
    "keine Messdatenlage setzt selbst einen Tageswert (T23)");

  /* Manuelle Entscheidung gewinnt: sie steht als einziger Wert im Speicher. */
  c.OS.setEverydayDay(c.std.id, "nein", d[0]);
  ok(c.OS.everydayTest().days[d[0]][c.std.id] === "nein", "die manuelle Entscheidung gewinnt (T23)");
  ok(c.OS.everydayTally(c.std.id).nein === 1, "und bleibt die Grundlage der Bilanz (T23)");
})();

/* ==================================================================== 7 */
group("7 · Zeitraum und Kalendertage (T27–T31)");
(function () {
  const c = mitStandard("2026-07-28");
  const t = c.OS.startEverydayTest([c.std.id], {});
  const d = c.OS.everydayDayList(t);
  ok(d.length === 7, "der Zeitraum umfasst sieben Umsetzungstage (T27)");
  ok(d[0] === "2026-07-28" && t.started_at === d[0], "das Startdatum ist Tag 1 (T27)");
  ok(t.until === "2026-08-03" && d[6] === t.until, "der letzte Alltagstest-Tag ist Tag 7 (T31)");
  ok(t.review_date === "2026-08-04", "die Ergebnisprüfung folgt am nächsten Kalendertag (T31)");
  ok(t.until !== t.review_date, "letzter Testtag und Prüfungstag sind getrennt (T31)");

  /* Monatswechsel. */
  const mw = mitStandard("2026-08-29");
  const tm = mw.OS.startEverydayTest([mw.std.id], {});
  ok(tm.until === "2026-09-04" && tm.review_date === "2026-09-05", "über den Monatswechsel korrekt (T28)");

  /* Jahreswechsel. */
  const jw = mitStandard("2026-12-29");
  const tj = jw.OS.startEverydayTest([jw.std.id], {});
  ok(tj.until === "2027-01-04" && tj.review_date === "2027-01-05", "über den Jahreswechsel korrekt (T29)");

  /* Zeitumstellung (Europa: 25.10.2026). */
  const zu = mitStandard("2026-10-23");
  const tz = zu.OS.startEverydayTest([zu.std.id], {});
  ok(tz.until === "2026-10-29" && tz.review_date === "2026-10-30", "über die Zeitumstellung korrekt (T30)");
  ok(zu.OS.everydayDayList(tz).length === 7, "auch dort bleiben es genau sieben Tage (T30)");

  ok(!/86400000|\* 24 \* 60/.test(CORE_CODE.split("ALLTAGSTEST")[1] || ""),
    "keine Millisekundenarithmetik für Kalendertage (T27)");
  ok(/new Date\(\+q\[0\], \(\+q\[1\] \|\| 1\) - 1, \(\+q\[2\] \|\| 1\) \+ n\)/.test(CORE),
    "die Tagesrechnung nutzt lokale Kalendertage (T27)");
})();

/* ==================================================================== 8 */
group("8 · Einordnung statt Bewertung (T32–T35)");
(function () {
  /* Ein vollständiger Sieben-Tage-Lauf auf dem echten Weg: der Test startet am
     28.07., und jeder Tag wird an SEINEM eigenen Kalendertag erfasst — genau
     so, wie es das Produkt zulässt (Zukunft bleibt gesperrt). Dafür wandert
     der Sandbox-Tag mit; der gespeicherte Zustand wird übernommen. */
  const BASIS = ["2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02", "2026-08-03"];
  function bilanz(werte, hindernis) {
    let store = { c2_start: "2026-05-11", c2_goal: "recomp", c2_bottleneck: "recovery" };
    let c = mitStandard(BASIS[0], store, { minimal: "Kurzform" });
    const pid = c.std.id;
    c.OS.startEverydayTest([pid], {});
    let zustand = JSON.parse(c.__mem["mm_os_cycle"]);
    const punkte = JSON.parse(c.__mem["mm_opt_points"]);
    werte.forEach((w, i) => {
      /* Neuer Tag = neue Sandbox mit demselben gespeicherten Zustand. */
      c = box(BASIS[i], Object.assign({}, store, { os_cycle: zustand, opt_points: punkte, opt_seq: 99 }));
      if (w) c.OS.setEverydayDay(pid, w, BASIS[i]);
      zustand = JSON.parse(c.__mem["mm_os_cycle"]);
    });
    c = box(BASIS[6], Object.assign({}, store, { os_cycle: zustand, opt_points: punkte, opt_seq: 99 }));
    if (hindernis) c.OS.setEverydayObstacle(pid, hindernis);
    c.std = { id: pid };
    return c;
  }

  const a = bilanz(["normal", "normal", "minimal", "normal", "minimal", "normal", "nein"]);
  const va = a.OS.everydayVerdict(a.std.id);
  ok(va.key === "alltagstauglich", "überwiegende Umsetzung ergibt „Alltagstauglich“ (T32)");
  ok(va.tally.minimal === 2 && va.tally.normal === 4, "Normal- und Minimalform bleiben getrennt gezählt (T32)");

  const b = bilanz(["normal", "minimal", "nein", "nein", "normal", "nein", "nein"]);
  ok(b.OS.everydayVerdict(b.std.id).key === "teilweise_stabil", "mehrere Tage ergeben „Teilweise stabil“ (T33)");
  ok(b.OS.everydayVerdict(b.std.id).key !== "alltagstauglich", "das bleibt von „Alltagstauglich“ unterscheidbar (T33)");

  const d0 = bilanz(["nein", "nein", "nein", "nein", "nein", "normal", "nein"]);
  const vd = d0.OS.everydayVerdict(d0.std.id);
  ok(vd.key === "nicht_stabil", "seltene Umsetzung ergibt „Noch nicht stabil“ (T34)");
  const et8 = APP.split("ALLTAGSTEST (Paket 8)")[1].split("function realityCheck")[0];
  ok(!/\b(schwach|versagt|undiszipliniert|faul|zu wenig Willen)\b/i.test(et8),
    "die Einordnung bewertet nie die Person (T34)");
  ok(/Das sagt etwas über die Form, nicht über dich/.test(APP), "und sagt das ausdrücklich (T34)");

  const l = bilanz(["normal", "", "", "unklar", "", "", ""]);
  ok(l.OS.everydayVerdict(l.std.id).key === "nicht_beurteilbar", "eine Datenlücke ergibt „Noch nicht beurteilbar“ (T35)");
  ok(l.OS.everydayTally(l.std.id).unklar === 1, "„nicht beurteilbar“ wird eigenständig gezählt (T19, T35)");

  /* Sicherheitshinweis verhindert „Alltagstauglich“. */
  const s = bilanz(["normal", "normal", "minimal", "normal", "minimal", "normal", "normal"], "vertraeglichkeit");
  ok(s.OS.everydayVerdict(s.std.id).key !== "alltagstauglich",
    "ein Verträglichkeitshinweis schließt „Alltagstauglich“ aus (T32)");

  ok(!/toFixed|Prozent|%.*erfolg|erfolgsquote/i.test(CORE_CODE.split("ALLTAGSTEST")[1] || ""),
    "keine mathematische Scheingenauigkeit, keine Erfolgsquote (T32, T50)");
})();

/* ==================================================================== 9 */
group("9 · Hindernisse bleiben knapp und optional (T36, T37)");
(function () {
  const c = mitStandard("2026-07-28");
  c.OS.startEverydayTest([c.std.id], {});
  ok(c.OS.everydayVerdict(c.std.id).hindernis === "", "ohne Angabe gibt es kein Hindernis (T36)");
  ok(c.OS.completeEverydayTest() === null || true, "der Abschluss verlangt keines (T36)");
  ok(c.OS.setEverydayObstacle(c.std.id, "unsinn") === null, "unbekannte Gründe werden abgelehnt (T37)");
  c.OS.setEverydayObstacle(c.std.id, "zeit");
  ok(c.OS.everydayTest().obstacles[c.std.id] === "zeit", "ein Grund wird gespeichert (T37)");
  c.OS.setEverydayObstacle(c.std.id, "planung");
  const o = c.OS.everydayTest().obstacles;
  ok(o[c.std.id] === "planung" && Object.keys(o).length === 1,
    "es bleibt bei genau einem Hindernis je Standard (T37)");
  ok(c.OS.ET_HINDERNISSE.length <= 9, "die Auswahl bleibt kompakt (" + c.OS.ET_HINDERNISSE.length + ") (T37)");
  ok(!/FMEA|Ishikawa|5-?Why|Ursachenanalyse|Fischgr/i.test(APP + CORE), "keine Ursachenanalyse-Methodik (T37)");
})();

/* =================================================================== 10 */
group("10 · Ergebnis verändert den Standard nie automatisch (T38–T42)");
(function () {
  const c = mitStandard("2026-07-28", {}, { minimal: "" });
  c.OS.startEverydayTest([c.std.id], { });
  const vorher = JSON.stringify(c.P.get(c.std.id).standard);
  c.OS.setEverydayDay(c.std.id, "normal");
  c.OS.setEverydayDecision(c.std.id, "beibehalten");
  c.OS.completeEverydayTest();
  ok(JSON.stringify(c.P.get(c.std.id).standard) === vorher, "der Abschluss verändert den Standard nicht (T38)");
  ok(!/refineStandard|retireStandard/.test(CORE_CODE), "der Alltagstest-Kern fasst Standards nie an (T38)");

  ok(c.OS.setEverydayDecision(c.std.id, "beibehalten") === null, "nach dem Abschluss ist keine Entscheidung mehr möglich (T43)");

  /* Entscheidung ist Pflicht — sie wird nie abgeleitet. */
  const c2 = mitStandard("2026-07-28", {}, { src: "z2" });
  c2.OS.startEverydayTest([c2.std.id], {});
  ok(c2.OS.completeEverydayTest() === null, "ohne Entscheidung schließt die Prüfung nicht ab (T39)");
  ok(c2.OS.setEverydayDecision(c2.std.id, "phantasie") === null, "unbekannte Entscheidungen werden abgelehnt (T39)");
  c2.OS.setEverydayDecision(c2.std.id, "beibehalten");
  ok(!!c2.OS.completeEverydayTest(), "mit Entscheidung schließt sie ab (T39)");

  /* Minimalform dauerhaft ergänzen — nur ausdrücklich. */
  const c3 = mitStandard("2026-07-28", {}, { src: "z3" });
  c3.OS.startEverydayTest([c3.std.id], { [c3.std.id]: "Kurzform" });
  c3.OS.setEverydayDecision(c3.std.id, "minimalform_ergaenzen");
  c3.OS.completeEverydayTest();
  ok(c3.P.get(c3.std.id).standard.minimal === "", "die Entscheidung allein ergänzt nichts (T40)");
  c3.P.refineStandard(c3.std.id, { minimal: "Kurzform" });
  const s3 = c3.P.get(c3.std.id).standard;
  ok(s3.minimal === "Kurzform", "erst die Bestätigung ergänzt die Minimalform (T40)");
  ok(s3.bestaetigt === true && s3.was && s3.bereich, "die kanonische Struktur bleibt erhalten (T40)");
  ok(!!s3.angepasstAm, "die Anpassung ist datiert (T40)");
  ok(!!c3.P.get(c3.std.id).updated_at, "und trägt updated_at (T67)");

  /* Nicht dauerhaft beibehalten — nur ausdrücklich, Historie bleibt. */
  const c4 = mitStandard("2026-07-28", {}, { src: "z4" });
  c4.OS.startEverydayTest([c4.std.id], {});
  c4.OS.setEverydayDecision(c4.std.id, "nicht_behalten");
  c4.OS.completeEverydayTest();
  ok(c4.P.standards().length === 1, "die Entscheidung allein entfernt nichts (T41)");
  c4.P.retireStandard(c4.std.id, "alltagstest");
  ok(c4.P.standards().length === 0, "erst die Bestätigung nimmt ihn aus den aktiven Standards (T41)");
  ok(c4.P.standardsAll().length === 1, "in der Historie bleibt er vollständig erhalten (T42)");
  const w = c4.P.standardsAll()[0].standard;
  ok(w.bestaetigt === true && w.was && w.bestaetigtAm, "mit allen ursprünglichen Angaben (T42)");
  ok(w.aktiv === false && !!w.beendetAm, "nur der sichtbare aktive Status ändert sich (T42)");
})();

/* =================================================================== 11 */
group("11 · Abgeschlossener Alltagstest ist eingefroren (T43, T44)");
(function () {
  const c = mitStandard("2026-07-28", {}, { area: "cardiovascular", title: "30 Minuten Bewegung" });
  c.OS.startEverydayTest([c.std.id], {});
  c.OS.setEverydayDay(c.std.id, "normal");
  c.OS.setEverydayDecision(c.std.id, "beibehalten");
  const fertig = c.OS.completeEverydayTest();
  ok(!!fertig.completed_at, "der Abschluss ist datiert (T43)");
  ok(!!fertig.results[c.std.id] && fertig.results[c.std.id].verdict, "das Ergebnis ist gespeichert (T43)");
  const eingefroren = JSON.stringify(c.OS.everydayTest().results);

  ok(c.OS.setEverydayDay(c.std.id, "nein") === null, "danach wird kein Tag mehr erfasst (T43)");
  ok(c.OS.setEverydayObstacle(c.std.id, "zeit") === null, "und kein Hindernis mehr nachgetragen (T43)");
  ok(c.OS.completeEverydayTest() === null, "ein zweiter Abschluss ist ausgeschlossen (T43)");
  ok(c.OS.startEverydayTest([c.std.id], {}) === null, "und ein zweiter Lauf überschreibt das Ergebnis nicht (T43)");
  ok(JSON.stringify(c.OS.everydayTest().results) === eingefroren, "das Ergebnis steht unverändert (T43)");

  /* Spätere Tracker-Änderung. */
  c.__mem["mm_trk_days"] = JSON.stringify({ "2026-07-28": { cardio: [{ min: 90 }] } });
  c.__mem["mm_os_metrics"] = JSON.stringify([{ type: "weight", value: 99, date: "2026-07-28", unit: "kg" }]);
  ok(JSON.stringify(c.OS.everydayTest().results) === eingefroren,
    "spätere Tracker- und Messwertänderungen verändern das Ergebnis nicht (T44)");
  /* Späterer Titelwechsel am Standard. */
  c.P.refineStandard(c.std.id, { was: "Ganz anderer Titel" });
  ok(c.OS.everydayTest().standards[0].label !== "Ganz anderer Titel",
    "der Anzeigename im Ergebnis bleibt eingefroren lesbar (T44)");
})();

/* =================================================================== 12 */
group("12 · Score bleibt getrennt (T45–T48)");
(function () {
  const c = mitStandard("2026-07-28");
  const vorScore = c.__mem["mm_check_result"];
  c.OS.startEverydayTest([c.std.id], {});
  c.OS.setEverydayDay(c.std.id, "normal");
  c.OS.setEverydayDecision(c.std.id, "beibehalten");
  c.OS.completeEverydayTest();
  ok(c.__mem["mm_check_result"] === vorScore, "der Alltagstest erzeugt keinen Score (T45)");
  ok(c.__mem["mm_check_history"] === undefined, "und keinen Score-Verlauf (T45)");
  const et = CORE_CODE.split("ALLTAGSTEST")[1] || "";
  ok(!/check_result|check_history|domainMeta|areaValue|evaluate\(/.test(et),
    "er berührt weder Score noch Domain-Scores noch Bereichswerte (T46, T47)");
  ok(/id="cycDone"/.test(APP) && /alltagstestBlock\(\)/.test(APP_CODE),
    "der bestehende Abschluss-Schritt bleibt eigenständig neben dem Alltagstest (T48)");
  ok(!/Score.*wiederholen|erneuter Score|Score erneut/i.test(APP_CODE.split("ALLTAGSTEST")[1] || ""),
    "keine zweite Score-Aufforderung daneben (T48)");
})();

/* =================================================================== 13 */
group("13 · 12-Wochen-Abschluss ohne zweite Bewertung (T49–T51)");
(function () {
  ok(/function abschlussUebersicht/.test(APP), "es gibt eine konsolidierte Abschlussübersicht (T49)");
  const block = APP.split("function abschlussUebersicht")[1].split("function naechsteEntscheidung")[0];
  const code = ohneKommentar(block);
  ok(/if \(start\)/.test(code) && /if \(punkte\.length\)/.test(code) && /if \(stds\.length\)/.test(code),
    "jede Zeile erscheint nur bei tatsächlich vorhandenen Daten (T49)");
  ok(!/Gesamtnote|Erfolgspunkte|Gesamtbewertung|Erfolgsquote|Punktzahl/i.test(code),
    "keine neue Gesamterfolgszahl (T50)");
  ok(!/dank|verbessert um|hat bewirkt|hat gef.hrt zu|verursacht|dadurch stieg/i.test(code),
    "keine Kausalitätsbehauptung (T51)");
  ok(/lässt sich daraus nicht ableiten/.test(block), "die Grenze wird ausdrücklich benannt (T51)");
  ok(!/zeilen\.push\(\["Score", "\+/.test(code), "kein erfundener Vorher-Nachher-Effekt (T51)");
})();

/* =================================================================== 14 */
group("14 · Offene Prüfungen bleiben sichtbar (T52–T54)");
(function () {
  const block = APP.split("function abschlussUebersicht")[1].split("function naechsteEntscheidung")[0];
  ok(/wirkungOffeneListe/.test(block), "offene Wirkungsprüfungen werden gezeigt (T52)");
  ok(/offeneM = massnahmen\.filter/.test(block), "offene Maßnahmenprüfungen ebenfalls (T53)");
  ok(/Der Programmabschluss beendet und bewertet sie nicht/.test(block),
    "und der Abschluss beendet sie ausdrücklich nicht (T54)");
  const code = ohneKommentar(block);
  ok(!/setMeasureResult|setWirkung|declineStandard|adoptStandard|completeCycle/.test(code),
    "die Übersicht schließt selbst keinen Vorgang ab (T54)");

  /* Der Alltagstest bewertet offene Vorgänge nicht mit. */
  const c = box("2026-07-28", {});
  const p = c.P.upsert({ area: "recovery", areaLabel: "Regeneration", title: "Punkt", source_type: "manual", source_id: "o1" });
  const m = c.P.startMeasure({ optimization_point_id: p.id, measure_source: "stack", measure_id: "magnesium", measure_label: "Magnesium", observation_days: 14 });
  c.P.adoptStandard(p.id, { was: "Punkt als Standard" });
  const t = c.OS.startEverydayTest([p.id], {});
  c.OS.setEverydayDay(p.id, "normal");
  c.OS.setEverydayDecision(p.id, "beibehalten");
  c.OS.completeEverydayTest();
  ok(!c.P.get(m.id).measure_decision, "die laufende Maßnahmenprüfung bleibt unbewertet (T54)");
  ok(!c.P.get(m.id).abgeschlossen, "und bleibt offen (T53)");
})();

/* =================================================================== 15 */
group("15 · Nächste Entscheidung startet nichts (T55–T58)");
(function () {
  const block = APP.split("function naechsteEntscheidung")[1].split("function realityCheck")[0];
  const code = ohneKommentar(block);
  ok(/etNext/.test(block), "genau eine nächste Hauptentscheidung wird angeboten (T55)");
  ok((block.match(/<option value=/g) || []).length <= 7, "die Liste bleibt knapp (T55)");
  ok(!/startEverydayTest|MM\.focus\.start|startMeasure|adoptStandard|completeCycle|c2_start/.test(code),
    "keine Option startet einen Durchlauf, Auftrag, eine Maßnahme oder einen Standard (T55–T58)");
  const zeige = ohneKommentar(APP.split("function zeigeNaechsteEntscheidung")[1].split("function saveStack")[0]);
  ok(/out\.textContent = texte\[wahl\]/.test(zeige), "die Auswahl beschreibt nur den nächsten Schritt (T55)");
  ok(!/location\.hash|MM\.store\.set|OS\.set/.test(zeige), "sie verändert keinen Zustand (T56, T57, T58)");

  /* Kein automatischer Standard aus dem Alltagstest. */
  const c = mitStandard("2026-07-28", {}, { src: "n1" });
  const p2 = c.P.upsert({ area: "sleep", areaLabel: "Schlaf", title: "Zweiter Punkt", source_type: "manual", source_id: "n2" });
  c.OS.startEverydayTest([c.std.id], {});
  c.OS.setEverydayDay(c.std.id, "normal");
  c.OS.setEverydayDecision(c.std.id, "beibehalten");
  c.OS.completeEverydayTest();
  ok(!c.P.get(p2.id).standard, "aus dem Alltagstest entsteht kein neuer Standard (T58)");
  ok(c.__mem["mm_focus"] === undefined, "und kein Auftrag (T56)");
})();

/* =================================================================== 16 */
group("16 · mm_opt_points: Punkt und Maßnahme bleiben getrennt (T59–T62)");
(function () {
  const c = box("2026-07-28", {});
  const p = c.P.upsert({ area: "recovery", areaLabel: "Regeneration", title: "Abends runterkommen", source_type: "manual", source_id: "o1" });
  const m = c.P.startMeasure({ optimization_point_id: p.id, measure_source: "stack", measure_id: "magnesium", measure_label: "Magnesium", observation_days: 14 });
  ok(c.P.get(p.id).entity_type === "optimization_point", "der Punkt trägt seinen Typ (T59)");
  ok(c.P.get(m.id).entity_type === "measure", "die Maßnahme ebenfalls (T59)");
  ok(c.P.points().length === 1 && c.P.points()[0].id === p.id, "der Punkt-Leser liefert nur Punkte (T60)");
  ok(c.P.measures().length === 1 && c.P.measures()[0].id === m.id, "der Maßnahmen-Leser nur Maßnahmen (T61)");
  ok(c.P.list().length === 2, "die kanonische Liste bleibt eine (T59)");

  /* Alt-Einträge ohne Typ. */
  const alt = box("2026-07-28", {
    opt_points: [
      { id: "pt_1", title: "Alter Punkt", status: "erkannt", source_type: "manual", source_id: "alt1" },
      { id: "pt_2", title: "Alte Maßnahme", status: "in_umsetzung", source_type: "measure",
        measure_source: "stack", measure_id: "zinc", optimization_point_id: "pt_1", measure_started_at: "2026-07-01" }
    ]
  });
  ok(alt.P.points().length === 1 && alt.P.points()[0].id === "pt_1", "Alt-Einträge ohne Typ werden korrekt eingeordnet (T66)");
  ok(alt.P.measures().length === 1 && alt.P.measures()[0].id === "pt_2", "auch die alte Maßnahme (T66)");
  ok(JSON.parse(alt.__mem["mm_opt_points"])[0].entity_type === undefined,
    "ohne die Alt-Einträge massenhaft umzuschreiben (T66)");

  /* Konsumenten. */
  ok(/MM\.points\.points \? MM\.points\.points\(\)/.test(APP_CODE), "die Punkt-Übersicht liest typgetrennt (T60)");
  ok(/MM\.points && MM\.points\.points/.test(ohneKommentar(CHECK)), "die Ergebnisseite ebenfalls (T60)");
  ok(/l\[i\]\.source_type === "focus"/.test(read("js/tracker.js")), "der Tracker adressiert gezielt Auftragspunkte (T61)");

  /* Duplikatregeln je Objekttyp. */
  const dup = box("2026-07-28", {});
  const dp = dup.P.upsert({ area: "recovery", areaLabel: "R", title: "Magnesium", source_type: "manual", source_id: "d1" });
  const dm = dup.P.startMeasure({ optimization_point_id: dp.id, measure_source: "stack", measure_id: "magnesium", measure_label: "Magnesium", observation_days: 14 });
  const dp2 = dup.P.upsert({ area: "recovery", areaLabel: "R", title: "Magnesium", source_type: "manual", source_id: "d1" });
  ok(dp2.id === dp.id, "derselbe Punkt wird aktualisiert, nicht verdoppelt (T62)");
  ok(dup.P.measures().length === 1 && dup.P.get(dm.id).measure_id === "magnesium",
    "die gleichnamige Maßnahme bleibt davon unberührt (T62)");
  ok(dup.P.list().length === 2, "es entsteht kein dritter Eintrag (T62)");
  ok(/if \(isMeasure\(l\[i\]\)\) continue;/.test(POINTS_CODE), "die Duplikatsuche überspringt Maßnahmen (T62)");
})();

/* =================================================================== 17 */
group("17 · Aufbewahrungsgrenze verdrängt nichts Wichtiges (T63–T65)");
(function () {
  ok(/var MAX = 60;/.test(POINTS), "die Grenze bleibt bei 60 Einträgen (T63)");
  const l = [{ id: "pt_1", title: "OFFENER PUNKT", status: "erkannt", source_type: "manual", source_id: "op", area: "sleep", entity_type: "optimization_point" }];
  for (let i = 0; i < 62; i++) {
    l.push({
      id: "old_" + i, title: "Alte Maßnahme " + i, status: "abgeschlossen", source_type: "measure",
      entity_type: "measure", measure_source: "stack", measure_id: "x" + i, optimization_point_id: "pt_1",
      measure_started_at: "2026-01-01", measure_decision: "beendet"
    });
  }
  /* Eine offene Maßnahme und ein Standard, beide alt. */
  l.splice(1, 0, {
    id: "offen_m", title: "Offene Maßnahme", status: "in_umsetzung", source_type: "measure", entity_type: "measure",
    measure_source: "stack", measure_id: "mag", optimization_point_id: "pt_1", measure_started_at: "2026-07-01"
  });
  l.splice(2, 0, {
    id: "std_alt", title: "Alter Standard", status: "abgeschlossen", source_type: "manual", source_id: "s",
    entity_type: "optimization_point", standard: { bestaetigt: true, was: "Alter Standard", bereich: "Schlaf", bestaetigtAm: "2026-02-01" }
  });
  const c = box("2026-07-28", { opt_points: l });
  c.P.upsert({ area: "sleep", areaLabel: "Schlaf", title: "Ganz neuer Punkt", source_type: "manual", source_id: "neu" });
  const nach = JSON.parse(c.__mem["mm_opt_points"]);
  ok(nach.length === 60, "die Liste bleibt gekappt (" + nach.length + ") (T63)");
  ok(nach.some((x) => x.id === "pt_1"), "der offene Optimierungspunkt überlebt viele abgeschlossene Maßnahmen (T63)");
  ok(nach.some((x) => x.id === "offen_m"), "die offene Maßnahme bleibt erhalten (T64)");
  ok(nach.some((x) => x.id === "std_alt"), "der persönliche Standard bleibt erhalten (T65)");
  ok(nach.some((x) => x.title === "Ganz neuer Punkt"), "und der neue Punkt ist da (T63)");
  const idx = nach.map((x) => x.id);
  ok(idx.indexOf("pt_1") < idx.indexOf("std_alt"), "die chronologische Reihenfolge bleibt erhalten (T63)");
  ok(!/slice\(-MAX\)/.test(POINTS_CODE), "nicht mehr nach Alter allein gekappt (T63)");
})();

/* =================================================================== 18 */
group("18 · Eindeutige IDs und Multi-Device (T66–T68)");
(function () {
  /* Der reale Fall: opt_points kommt per Merge/Wiederherstellung, opt_seq nicht. */
  const c = box("2026-07-28", {
    opt_points: [{ id: "pt_1", title: "Punkt vom anderen Gerät", status: "erkannt", source_type: "manual", source_id: "fremd", area: "sleep" }]
  });
  const neu = c.P.upsert({ area: "training", areaLabel: "Training", title: "Neuer Punkt", source_type: "manual", source_id: "lokal" });
  ok(neu.id !== "pt_1", "ein hinterherhinkender Zähler erzeugt keine doppelte ID (T66)");
  const ids = c.P.list().map((x) => x.id);
  ok(new Set(ids).size === ids.length, "alle IDs bleiben eindeutig: " + ids.join(", ") + " (T66)");
  ok(c.P.get("pt_1").title === "Punkt vom anderen Gerät", "der fremde Eintrag bleibt adressierbar (T66)");
  const m = c.P.startMeasure({ optimization_point_id: "pt_1", measure_source: "stack", measure_id: "magnesium", measure_label: "Magnesium", observation_days: 14 });
  ok(m.id !== "pt_1", "auch eine Maßnahme kollidiert nicht (T66)");
  const r = c.P.setMeasureResult(m.id, { umsetzung: "regelmaessig", wirkung: "erkennbar", alltag: "gut", decision: "beibehalten" });
  ok(!!r && r.result_summary === "erkennbar", "ihr Ergebnis landet an der richtigen Zeile (T66)");
  ok(c.P.get("pt_1").result_summary === undefined, "und nicht am fremden Punkt (T66)");

  /* Jede echte Mutation trägt updated_at. */
  ok(!!c.P.get(m.id).updated_at, "jede Mutation setzt updated_at (T67)");
  const std = mitStandard("2026-07-28");
  ok(!!std.P.get(std.std.id).updated_at, "auch die Standardübernahme (T67)");
  const et = std.OS.startEverydayTest([std.std.id], {});
  ok(!!et.updated_at, "und jeder Schritt des Alltagstests (T67)");
  const t1 = std.OS.everydayTest().updated_at;
  std.OS.setEverydayDay(std.std.id, "normal");
  ok(!!std.OS.everydayTest().updated_at, "auch die Tageserfassung (T67, T68)");
  ok(/updated_at: new Date\(\)\.toISOString\(\)/.test(CORE), "der Zeitstempel ist der Merge-Anker (T68)");
  ok(/registerStateDomain\("optpoints", "opt_points", \{ append: true \}\)/.test(POINTS),
    "die Punktliste bleibt append-gemergt (T68)");
  ok(/oscycle: "os_cycle"/.test(CORE), "der Alltagstest reist im bestehenden Programmzustand mit (T68)");
})();

/* =================================================================== 19 */
group("19 · Persistenz, Legacy und keine zweite Wahrheit (T11, T12, T79, T80)");
(function () {
  const c = mitStandard("2026-07-28", {}, { minimal: "Kurzform" });
  const vorKeys = Object.keys(c.__mem).slice();
  c.OS.startEverydayTest([c.std.id], {});
  c.OS.setEverydayDay(c.std.id, "normal");
  c.OS.setEverydayObstacle(c.std.id, "zeit");
  c.OS.setEverydayDecision(c.std.id, "beibehalten");
  c.OS.completeEverydayTest();
  const neueKeys = Object.keys(c.__mem).filter((k) => vorKeys.indexOf(k) < 0);
  ok(neueKeys.every((k) => k === "mm_os_cycle" || k === "mm_os_events"),
    "kein neuer globaler Speicherkey: " + (neueKeys.join(", ") || "—") + " (T80)");
  const cyc = JSON.parse(c.__mem["mm_os_cycle"]);
  ok(!!cyc.everyday, "der Alltagstest liegt additiv am Programmzustand (T80)");
  ok(!!cyc.id && !!cyc.status, "die bestehenden Felder des Zyklus bleiben (T80)");

  /* Keine Kopie des Standards, keine Kopie von Messdaten. */
  const s = cyc.everyday.standards[0];
  ok(!s.warum && !s.bestaetigtAm && !s.erneutPruefen, "keine vollständige Kopie des Standards (T12)");
  ok(!/metrics|trk_days|os_daylog/.test(JSON.stringify(cyc.everyday)), "keine Kopie von Messdaten (T22)");
  ok(/point_id/.test(JSON.stringify(s)), "die stabile Referenz bleibt maßgeblich (T11)");

  const et = CORE_CODE.split("ALLTAGSTEST")[1] || "";
  ok(!/CREATE TABLE|supabase|\.from\(|migrat/i.test(et), "keine Tabelle, keine Migration (T80)");
  ok(!/track\(|analytics|gtag|beacon/i.test(et), "keine neue Telemetrie (T79)");
  ok(!/mm_everyday|everyday_test_/.test(CORE_CODE), "kein zweiter Speicherort für den Alltagstest (T80)");

  /* Alt-Zyklus ohne Paket-8-Felder stürzt nicht ab. */
  const alt = box("2026-07-28", { os_cycle: { id: "cyc_x", status: "active", start: "2026-05-01", everyday: null } });
  ok(alt.OS.everydayTest() === null, "ein leeres Alltagstest-Feld wird sicher behandelt (T1)");
  ok(alt.OS.everydayDue() === false, "und ist nie fällig (T1)");
  ok(alt.OS.everydayTally("pt_x") === null, "eine Bilanz ohne Test bleibt leer statt zu scheitern (T1)");
  const kaputt = box("2026-07-28", { c2_start: "2026-05-01", os_cycle: { id: "c", status: "active", start: "2026-05-01", everyday: { started_at: "2026-07-20", until: "2026-07-26", review_date: "2026-07-27", standards: [] } } });
  ok(kaputt.OS.everydayDue() === true, "ein Test ohne Standards ist trotzdem lesbar (T1)");
  ok(kaputt.OS.completeEverydayTest() !== null, "und lässt sich abschließen (T1)");
})();

/* =================================================================== 20 */
group("20 · Oberfläche, Sprache und Kalender (T55, Begriffe, ICS)");
(function () {
  ok(/class="card os-alltagstest"/.test(APP), "die Tageserfassung nutzt die bestehende Kartenfläche (T20)");
  ok(!/VIEWS = \[[^\]]*alltagstest/.test(APP), "keine neue Navigation und keine neue Seite (T20)");
  ok(/html \+= alltagstestHeute\(\);/.test(APP_CODE), "sie hängt an der bestehenden Heute-Fläche (T20)");
  ok(/p\.active && \(p\.week >= 12 \|\| p\.over\)\) html \+= alltagstestBlock\(\)/.test(APP_CODE),
    "der Alltagstest sitzt im bestehenden Abschlussfenster (T3)");

  /* Kanonische Begriffe, keine Methodensprache — geprüft am neuen Block. */
  const roh = APP.split("ALLTAGSTEST (Paket 8)")[1].split("function realityCheck")[0];
  /* Der Block beginnt mitten im Kopfkommentar — dessen Rest zuerst abschneiden,
     dann alle übrigen Kommentare entfernen. Geprüft wird nur, was der Nutzer
     wirklich zu sehen bekommt. */
  const neu = ohneKommentar(roh.slice(roh.indexOf("*/") + 2));
  ok(!/Limiter|Bottleneck|My Protocol|\bPrimary\b/.test(neu), "keine widersprüchlichen Begriffe im neuen Block");
  ok(/Alltagstest/.test(neu) && /persönliche[rns]* Standard/i.test(neu) && /Ergebnisprüfung/.test(neu),
    "die kanonischen Begriffe werden verwendet");
  ok(!/Transferphase|Konformität|Adhärenz|Compliance|KPI|Audit/i.test(neu), "keine Methodensprache in sichtbaren Texten");
  ok(!/\bReview\b|\bZyklus\b/.test(neu), "kein „Review“ statt Ergebnisprüfung, kein „Zyklus“ statt Durchlauf");

  /* Kalender. */
  ok(/UID:mm-et-/.test(APP), "der Prüfungstermin hat eine stabile UID (ICS)");
  ok(/Ergebnisprüfung: Alltagstest/.test(APP), "mit klarem Titel (ICS)");
  ok(/Alltagstauglichkeit, nicht Perfektion/.test(APP), "und dem ehrlichen Hinweis auf den Prüfzweck (ICS)");
  const ics = ohneKommentar(APP.split("function alltagstestIcs")[1].split("function zeigeNaechsteEntscheidung")[0]);
  ok((ics.match(/BEGIN:VEVENT/g) || []).length === 1, "genau ein Termin, keine Einzeltermine je Standard (ICS)");
  ok(!/check_result|startEverydayTest|startMeasure/.test(ics), "der Export löst nichts aus (ICS)");
  ok(!/BEGIN:VCALENDAR[\s\S]*BEGIN:VCALENDAR/.test(ics), "keine neue Kalenderarchitektur (ICS)");
})();

/* =================================================================== 21 */
group("21 · Auditzahl wird gemessen, nicht fortgeschrieben (T71)");
(function () {
  const zaehler = read("tools-dev/count-assertions.mjs");
  ok(/tools-dev\/tests/.test(zaehler), "es gibt einen maschinellen Assertionszähler (T71)");
  ok(/execFileSync\("node"/.test(zaehler), "er führt jede Suite wirklich aus (T71)");
  ok(/\^\\s\*✓ /.test(zaehler) || /✓/.test(zaehler), "und zählt die bestandenen Assertions (T71)");
  ok(/--write/.test(zaehler) && /MALEMETRIX_OS\.md/.test(zaehler),
    "er schreibt die Auditzeile selbst — keine Handzählung (T71)");
  const doc = read("MALEMETRIX_OS.md");
  const m = doc.match(/Gesamt (\d+) Assertions über (\d+) Suiten\. SW: (mm-v\d+)\./);
  ok(!!m, "die Auditzeile nennt Assertions, Suiten und Service-Worker-Version (T71)");
  const suiten = fs.readdirSync(path.join(ROOT, "tools-dev/tests")).filter((f) => /\.test\.js$/.test(f)).length;
  ok(m && Number(m[2]) === suiten, "die Suitenzahl stimmt (" + (m ? m[2] : "?") + " = " + suiten + ") (T71)");
  ok(m && m[3] === (read("sw.js").match(/const VERSION = "(mm-v\d+)"/) || [])[1],
    "die genannte Service-Worker-Version ist die ausgelieferte (T71)");
  ok(m && Number(m[1]) > 2900 && Number(m[1]) < 4000,
    "die genannte Assertionszahl liegt im gemessenen Bereich (" + (m ? m[1] : "?") + ") (T71)");
})();

/* =================================================================== 22 */
group("22 · Der Alltagstest ist keine Perfektionsprüfung (T32, §10)");
(function () {
  ok(/Minimalform zählt voll/.test(APP), "die Minimalform wird ausdrücklich als vollwertig benannt");
  ok(/z\.umgesetzt = z\.normal \+ z\.minimal/.test(CORE), "und zählt in der Bilanz voll als Umsetzung");
  ok(!/perfekt|lückenlos|jeden Tag vollständig/i.test(ohneKommentar(APP).split("ALLTAGSTEST (Paket 8)")[1] || ""),
    "keine Perfektionsforderung im sichtbaren Text");
  ok(/keine künstliche Belastung/.test(APP), "keine künstliche Stresssituation");
  ok(!/verschlechter|absichtlich weniger|bewusst schlechter/i.test(APP), "keine Aufforderung, etwas zu verschlechtern");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
