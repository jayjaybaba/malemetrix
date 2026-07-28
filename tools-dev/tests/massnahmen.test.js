/* ==========================================================================
   MALEMETRIX P7 — STACK UND MASSNAHMENPRÜFUNG
   Friert ein: eine kleine Verbindungsschicht zwischen bestehendem Stack,
   bestehenden Optimierungspunkten und bestehenden Ergebnisprüfungen —
   ohne zweite Maßnahmenbibliothek, ohne automatische Aktivierung, ohne
   automatische Wirkungsbehauptung und ohne automatischen Standard.
   Deckt die Prüfpunkte 1–65 aus Paket 7 ab (Nummern in den Meldungen).
   Ausführen:  node tools-dev/tests/massnahmen.test.js
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

/* Sandbox mit fixem Heute-Datum: focus.js + points.js wie im Produkt. */
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
    Date: FakeDate, Math, JSON, Object, Array, String, Number,
    isNaN, isFinite, parseInt, parseFloat, RegExp
  };
  ctx.window = ctx; ctx.__mem = mem;
  vm.createContext(ctx);
  vm.runInContext(read("js/focus.js"), ctx);
  vm.runInContext(read("js/points.js"), ctx);
  ctx.P = ctx.window.MM.points;
  return ctx;
}
/* Ein Optimierungspunkt, an dem Maßnahmen hängen können. */
function mitPunkt(today, store) {
  const c = box(today, store);
  c.punkt = c.P.upsert({
    area: "recovery", areaLabel: "Regeneration",
    title: "Abendliche Regeneration verbessern",
    source_type: "manual", source_id: "op1"
  });
  return c;
}

const POINTS = read("js/points.js");
const APP = read("js/os/app.js");
const ENGINES = read("js/os/engines.js");
const TRACKER = read("js/tracker.js");
const MEASURE_BLOCK = POINTS.split("MASSNAHMEN (Paket 7)")[1].split("DUPLIKATE ---")[0];
/* Ohne Kommentare: ein Kommentar darf benennen, was der Code NICHT tut. */
const ohneKommentar = (s) => s.replace(/^[\s\S]*?\*\//, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const MEASURE_CODE = ohneKommentar(MEASURE_BLOCK);
const POINTS_CODE = ohneKommentar(POINTS);

/* ==================================================================== 1 */
group("1 · Bestehende Quellen bleiben kanonisch (T1, T2, T16, T17, T55, T56)");
(function () {
  /* T1: der Stack-Katalog bleibt, wo er ist — mit seinen stabilen IDs. */
  ok(/var SUPPS = \[/.test(ENGINES), "der Stack-Katalog lebt unverändert in engines.js (T1)");
  const ids = (ENGINES.match(/\{ id: "([a-z0-9]+)", name:/g) || []).length;
  ok(ids >= 13, "der Katalog enthält weiterhin seine stabilen IDs (" + ids + ") (T1/T5)");
  ok(!/var SUPPS|SUPPLEMENTS|MEASURES\s*=/.test(POINTS), "points.js legt keine zweite Maßnahmenbibliothek an (§5)");
  ok(!/costMo|evidence:|aliases:/.test(POINTS), "kein Katalogfeld wird nach points.js dupliziert (T16)");

  /* T2/T55/T56: Nutzer-Stack unverändert, keine neuen Keys, keine Migration. */
  ok(/MM\.store\.set\("os_stack"/.test(APP), "der Nutzer-Stack bleibt in os_stack (T2)");
  const keys = (POINTS.match(/S\.(get|set)\("([a-z_0-9]+)"/g) || []).map((k) => k.replace(/.*"([a-z_0-9]+)".*/, "$1"));
  ok(keys.every((k) => k === "opt_points" || k === "opt_seq"), "keine neuen globalen Speicherkeys: " + [...new Set(keys)].join(", ") + " (T55)");
  ok(!/CREATE TABLE|ALTER TABLE|applyMigration/i.test(POINTS_CODE), "keine neue Tabelle, keine Migration (T56)");
  ok(/registerStateDomain\("optpoints", "opt_points", \{ append: true \}\)/.test(POINTS),
    "die Sync-Domäne bleibt unverändert append-orientiert (T54)");
})();

/* ==================================================================== 2 */
group("2 · Keine automatische Aktivierung (T5–T9, T63)");
(function () {
  const c = mitPunkt();
  ok(c.P.list().filter((p) => p.istMassnahme).length === 0, "Ausgangslage: keine Maßnahme");
  /* T5–T9: nichts davon darf eine Maßnahme erzeugen. */
  c.P.list(); c.P.active(); c.P.measuresFor(c.punkt.id); c.P.measureAmbiguity(c.punkt.id);
  ok(c.P.list().filter((p) => p.istMassnahme).length === 0, "das bloße Anzeigen erzeugt keine aktive Maßnahme (T5)");
  ok(c.P.startMeasure({}) === null, "ein Aufruf ohne Punkt und Referenz erzeugt nichts (T5)");
  ok(c.P.startMeasure({ optimization_point_id: c.punkt.id }) === null, "ohne stabile Maßnahmenreferenz entsteht nichts (T11)");
  ok(c.P.startMeasure({ optimization_point_id: c.punkt.id, measure_source: "stack" }) === null, "ohne measure_id entsteht nichts (T11)");
  ok(c.P.startMeasure({ optimization_point_id: "gibtesnicht", measure_source: "stack", measure_id: "magnesium" }) === null,
    "ohne existierenden Optimierungspunkt entsteht nichts (T15)");
  ok(c.P.startMeasure({ optimization_point_id: c.punkt.id, measure_source: "erfunden", measure_id: "x" }) === null,
    "eine unbekannte Quellart wird abgewiesen (§5)");
  ok(c.__mem["mm_opt_points"].indexOf("measure_source") < 0, "nichts davon hat etwas gespeichert (T5)");

  /* Der Code selbst startet nirgends von allein. */
  ok(!/startMeasure\(/.test(read("js/check.js")), "die Score-Ergebnisseite startet keine Maßnahme (T6/T7)");
  ok(!/startMeasure\(/.test(read("js/check-data.js")), "die Engine startet keine Maßnahme (T6)");
  ok(!/startMeasure\(/.test(read("js/focus.js")), "die Messdatenbrücke startet keine Maßnahme (T9)");
  const starts = (APP.match(/P\.startMeasure\(|MM\.points\.startMeasure\(/g) || []).length;
  ok(starts === 1, "im OS gibt es genau EINEN Startpfad (T10)");
  ok(/function startMassnahme\(\)/.test(APP) && /t\.closest\("#mnStart"\)/.test(APP),
    "und der hängt an einer ausdrücklichen Schaltfläche (T10)");
  ok(!/focus\.start\(/.test(MEASURE_CODE), "kein Auftrag wird automatisch gestartet (T63)");
})();

/* ==================================================================== 3 */
group("3 · Ausdrücklicher Start und stabile Referenz (T10–T15)");
(function () {
  const c = mitPunkt("2026-07-28");
  const m = c.P.startMeasure({
    optimization_point_id: c.punkt.id, measure_source: "stack",
    measure_id: "magnesium", measure_label: "Magnesium (abends)",
    observation_days: 14, criterion_label: "Morgenenergie"
  });
  ok(!!m, "der ausdrückliche Start erzeugt eine Maßnahmenverknüpfung (T10)");
  ok(m.measure_id === "magnesium" && m.measure_source === "stack", "sie hält die stabile Referenz (T11)");
  ok(m.optimization_point_id === c.punkt.id, "und ist mit dem richtigen Optimierungspunkt verbunden (T15)");
  ok(m.statusLabel === "In Beobachtung", "der sichtbare Status ist „In Beobachtung“ (T10)");
  ok(m.measure_label_snapshot === "Magnesium (abends)", "der Anzeigename liegt als Snapshot bei (T65)");
  ok(!m.evidence && !m.costMo && !m.why && !m.aliases, "kein vollständiger Katalogeintrag wird kopiert (T16)");
  ok(!m.baseline_snapshot, "ohne Ausgangswert wird keiner erfunden (T32)");
  ok(Object.keys(m).length < 32, "die gespeicherte Struktur bleibt schlank (" + Object.keys(m).length + " Felder) (§24)");

  /* T13: identische aktive Referenz ⇒ kein Duplikat. */
  const n = c.P.list().length;
  const m2 = c.P.startMeasure({
    optimization_point_id: c.punkt.id, measure_source: "stack",
    measure_id: "magnesium", measure_label: "Magnesium (abends)", observation_days: 28
  });
  ok(c.P.list().length === n && m2.id === m.id, "dieselbe aktive Referenz aktualisiert, statt zu duplizieren (T13)");
  ok(m2.measure_started_at === m.measure_started_at, "das ursprüngliche Startdatum bleibt erhalten (T13)");
  ok(!!m2.updated_at && m2.updated_at >= m.updated_at, "updated_at wird gesetzt (T53)");

  /* T14: andere stabile ID bleibt eine eigene Maßnahme. */
  const m3 = c.P.startMeasure({
    optimization_point_id: c.punkt.id, measure_source: "stack",
    measure_id: "ashwagandha", measure_label: "Ashwagandha", observation_days: 14
  });
  ok(m3.id !== m.id && c.P.list().length === n + 1, "eine andere stabile ID bleibt eine eigenständige Maßnahme (T14)");
  /* T12: ähnliche Namen genügen nie. */
  const m4 = c.P.startMeasure({
    optimization_point_id: c.punkt.id, measure_source: "protokoll",
    measure_id: "schlafrhythmus", measure_label: "Magnesium (abends)", observation_days: 14
  });
  ok(m4.id !== m.id, "gleicher Anzeigename bei anderer Quelle bleibt getrennt (T7/T12)");
  ok(!/norm\(|title ===/.test(MEASURE_BLOCK.split("findMeasureIdx")[1].split("}")[0] || ""),
    "die Duplikatprüfung nutzt IDs, nicht Titel (T12)");
})();

/* ==================================================================== 4 */
group("4 · Beobachtungszeitraum und Prüfungstermin (T18–T27)");
(function () {
  const c = mitPunkt("2026-07-28");
  const start = (d) => c.P.startMeasure({
    optimization_point_id: c.punkt.id, measure_source: "protokoll",
    measure_id: "t" + d, measure_label: "T" + d, observation_days: d
  });
  ok(start(7).review_date === "2026-08-04", "7 Tage → Prüfung am 04.08. (T19)");
  ok(start(14).review_date === "2026-08-11", "14 Tage → Prüfung am 11.08. (T20)");
  ok(start(28).review_date === "2026-08-25", "28 Tage → Prüfung am 25.08. (T21)");
  ok(start(9).observation_days === 14, "eine unzulässige Dauer fällt auf den Standard zurück (T27)");
  ok(JSON.stringify(c.P.OBS_DAYS) === "[7,14,28]", "nur die drei organisatorischen Optionen (T26)");

  /* T22/T23/T24: Kalendergrenzen. */
  const monat = mitPunkt("2026-07-28");
  ok(monat.P.startMeasure({ optimization_point_id: monat.punkt.id, measure_source: "protokoll", measure_id: "a", measure_label: "A", observation_days: 7 }).review_date === "2026-08-04",
    "Monatswechsel korrekt (T22)");
  const jahr = mitPunkt("2026-12-28");
  ok(jahr.P.startMeasure({ optimization_point_id: jahr.punkt.id, measure_source: "protokoll", measure_id: "b", measure_label: "B", observation_days: 7 }).review_date === "2027-01-04",
    "Jahreswechsel korrekt (T23)");
  const dst = mitPunkt("2026-10-23");
  ok(dst.P.startMeasure({ optimization_point_id: dst.punkt.id, measure_source: "protokoll", measure_id: "c", measure_label: "C", observation_days: 7 }).review_date === "2026-10-30",
    "über die Zeitumstellung hinweg korrekt (T24)");
  ok(!/86400000/.test(MEASURE_BLOCK), "keine Millisekundenarithmetik für Kalendertage (T18)");
  ok(/new Date\(\+q\[0\], \(\+q\[1\] \|\| 1\) - 1, \(\+q\[2\] \|\| 1\) \+ n\)/.test(MEASURE_BLOCK),
    "Kalendertage werden über setDate-Semantik gerechnet (T18)");

  /* T25: kein garantierter Wirkungseintritt. */
  const hinweis = "Der Zeitraum strukturiert deine Prüfung. Er garantiert keinen bestimmten Wirkungseintritt.";
  ok(APP.indexOf(hinweis) > 0, "der vorgegebene Hinweis steht sichtbar in der Oberfläche (T25)");
  ok((APP.match(/garantiert keinen bestimmten Wirkungseintritt/g) || []).length >= 2,
    "er steht beim Start UND an der laufenden Maßnahme (T25)");
  ok(!/Wirkfrist|wirkt nach|Wirkung tritt/.test(MEASURE_CODE + ohneKommentar(APP.split("MASSNAHMENPRÜFUNG (Paket 7)")[1].split("function ergebnisFormHTML")[0])),
    "nirgends eine erfundene medizinische Wirkfrist (T27)");
  ok(/organisatorisch/i.test(MEASURE_BLOCK), "der Zeitraum ist ausdrücklich als organisatorisch dokumentiert (T25)");
})();

/* ==================================================================== 5 */
group("5 · Erfolgskriterium und Baseline (T28–T32)");
(function () {
  const c = mitPunkt();
  const mit = c.P.startMeasure({
    optimization_point_id: c.punkt.id, measure_source: "stack", measure_id: "magnesium",
    measure_label: "Magnesium (abends)", observation_days: 14, criterion_label: "Morgenenergie"
  });
  ok(mit.criterion_label === "Morgenenergie", "das Erfolgskriterium wird beim Start festgelegt (T28)");
  ok(typeof mit.criterion_label === "string", "höchstens EIN primäres Erfolgskriterium (T29)");
  ok(!/criteria|kriterien\s*=\s*\[/.test(MEASURE_BLOCK), "keine Liste mehrerer Kriterien (T29)");

  const ohne = c.P.startMeasure({
    optimization_point_id: c.punkt.id, measure_source: "stack", measure_id: "zinc",
    measure_label: "Zink", observation_days: 14
  });
  ok(ohne.criterion_label === "", "ohne Angabe entsteht kein erfundenes Kriterium (T30)");
  ok(/Bei der Prüfung beurteilst du Wirkung und Alltagstauglichkeit manuell/.test(APP),
    "stattdessen erscheint der ehrliche manuelle Fallback (T30)");

  /* T31/T32: Baseline nur, wenn übergeben — nie erfunden. */
  ok(ohne.baseline_snapshot === null, "ohne Ausgangswert bleibt die Baseline leer (T32)");
  const mitBase = c.P.startMeasure({
    optimization_point_id: c.punkt.id, measure_source: "stack", measure_id: "omega3",
    measure_label: "Omega-3", observation_days: 14, baseline: { label: "Morgenenergie 4/10", date: "2026-07-27", source: "Tracker" }
  });
  ok(mitBase.baseline_snapshot && mitBase.baseline_snapshot.source === "Tracker",
    "eine übergebene Baseline nennt ihre Quelle (T31)");
  ok(mitBase.baseline_snapshot.date === "2026-07-27", "und ihr Messdatum (T31)");
  ok(!/os_metrics|trk_body|trk_sleep/.test(POINTS_CODE), "points.js liest keine Messdaten selbst — keine Kopie (T17)");
})();

/* ==================================================================== 6 */
group("6 · Mehrere Veränderungen und Basis-Stack (T33, T34)");
(function () {
  const c = mitPunkt();
  const a = c.P.startMeasure({ optimization_point_id: c.punkt.id, measure_source: "stack", measure_id: "magnesium", measure_label: "Magnesium", observation_days: 14 });
  ok(c.P.measureAmbiguity(c.punkt.id).mehrere === false, "eine einzelne Maßnahme erzeugt keinen Hinweis (T33)");
  const b = c.P.startMeasure({ optimization_point_id: c.punkt.id, measure_source: "stack", measure_id: "ashwagandha", measure_label: "Ashwagandha", observation_days: 14 });
  const amb = c.P.measureAmbiguity(c.punkt.id);
  ok(amb.mehrere && amb.anzahl === 2, "zwei laufende Maßnahmen erzeugen den Zuordnungshinweis (T33)");
  ok(/schwerer eindeutig zuordnen/.test(amb.text), "mit dem vorgegebenen Wortlaut (T33)");
  ok(!/nicht möglich|blockiert|verhindert/.test(amb.text), "ohne den Nutzer zu blockieren (T33)");
  ok(a.id !== b.id && c.P.measuresFor(c.punkt.id).length === 2, "beide Referenzen bleiben getrennt (T33)");
  ok(!/automatisch (schlecht|negativ)|verdict.*negativ/.test(MEASURE_CODE), "kein automatisches negatives Urteil (T33)");

  /* T34: der bestehende Stack ist keine Maßnahme. */
  const c2 = box("2026-07-28", { os_stack: { budget: "optimal", items: [{ id: "creatine", name: "Kreatin Monohydrat" }, { id: "vitd", name: "Vitamin D3" }], saved: "2026-06-01" } });
  ok(c2.P.list().length === 0, "ein vorhandener Basis-Stack erzeugt keine Maßnahmenverknüpfung (T34)");
  ok(c2.__mem["mm_opt_points"] === undefined, "und legt nicht einmal eine Punktliste an (T34)");
  ok(JSON.parse(c2.__mem["mm_os_stack"]).items.length === 2, "der Basis-Stack bleibt unverändert lesbar (T2/T34)");
  ok(!/os_stack/.test(POINTS_CODE), "points.js klassifiziert den Nutzer-Stack nicht rückwirkend (T34)");
})();

/* ==================================================================== 7 */
group("7 · Ergebnisprüfung trennt Umsetzung, Wirkung, Alltag (T35–T37)");
(function () {
  const c = mitPunkt("2026-07-28");
  const m = c.P.startMeasure({ optimization_point_id: c.punkt.id, measure_source: "stack", measure_id: "magnesium", measure_label: "Magnesium", observation_days: 14, criterion_label: "Morgenenergie" });

  /* T35: gute Umsetzung allein erzeugt keine Wirkung. */
  const nurUms = c.P.setMeasureResult(m.id, { umsetzung: "regelmaessig" });
  ok(nurUms.umsetzung_result === "regelmaessig" && nurUms.result_summary === "",
    "regelmäßige Umsetzung erzeugt keine automatische Wirkung (T35)");
  ok(!nurUms.abgeschlossen, "und schließt die Maßnahme nicht ab (T35)");

  /* T37: drei getrennte Angaben plus Entscheidung. */
  const voll = c.P.setMeasureResult(m.id, { umsetzung: "regelmaessig", wirkung: "teilweise", alltag: "gut", decision: "beibehalten" });
  ok(voll.umsetzung_result === "regelmaessig" && voll.result_summary === "teilweise" && voll.usability_result === "gut",
    "Umsetzung, Wirkung und Alltagstauglichkeit stehen getrennt (T37)");
  ok(voll.measure_decision === "beibehalten" && voll.abgeschlossen, "die Entscheidung schließt die Prüfung ab (T37)");

  /* Unzulässige Werte werden abgewiesen. */
  ok(c.P.setMeasureResult(m.id, { wirkung: "bewiesen_wirksam" }) === null, "unzulässige Wirkungsurteile werden abgewiesen (T36)");
  ok(c.P.WIRKUNG.indexOf("bewiesen") < 0 && c.P.WIRKUNG.indexOf("verursacht") < 0, "keine Kausalitätsurteile im Vokabular (T36)");
  Object.keys(c.P.WIRKUNG_LABEL).forEach(function (k) {
    ok(!/bewiesen|garantiert|eindeutig verursacht|medizinisch bestätigt/i.test(c.P.WIRKUNG_LABEL[k]),
      "zulässige Formulierung für „" + k + "“: " + c.P.WIRKUNG_LABEL[k] + " (T36)");
  });

  /* „Noch einmal beobachten" verlängert, statt abzuschließen. */
  const c2 = mitPunkt("2026-07-28");
  const m2 = c2.P.startMeasure({ optimization_point_id: c2.punkt.id, measure_source: "stack", measure_id: "zinc", measure_label: "Zink", observation_days: 7 });
  const nochmal = c2.P.setMeasureResult(m2.id, { umsetzung: "teilweise", wirkung: "offen", decision: "weiter_beobachten" });
  ok(!nochmal.abgeschlossen && nochmal.review_date === "2026-08-04", "„noch einmal beobachten“ setzt einen neuen Termin (T37)");
})();

/* ==================================================================== 8 */
group("8 · Persönlicher Standard nur nach Bestätigung (T38, T39, T40, T62)");
(function () {
  function fertig(wirkung, alltag, extra) {
    const c = mitPunkt();
    const m = c.P.startMeasure(Object.assign({
      optimization_point_id: c.punkt.id, measure_source: "stack",
      measure_id: "magnesium", measure_label: "Magnesium", observation_days: 14
    }, extra || {}));
    c.P.setMeasureResult(m.id, { umsetzung: "regelmaessig", wirkung: wirkung, alltag: alltag, decision: "beibehalten" });
    return { c: c, m: c.P.get(m.id) };
  }
  const gut = fertig("erkennbar", "gut");
  ok(gut.c.P.standardEmpfohlen(gut.m), "gute Umsetzung + Wirkung + Alltagstauglichkeit ⇒ Empfehlung (T38)");
  ok(!gut.m.standard, "die Empfehlung allein erzeugt KEINEN Standard (T38)");
  const uebernommen = gut.c.P.adoptStandard(gut.m.id);
  ok(uebernommen.standard && uebernommen.standard.bestaetigt, "erst die ausdrückliche Übernahme erzeugt ihn (T39)");
  ok(uebernommen.standard.was === "Magnesium", "der Standard hält die Maßnahme (T39)");
  ok(gut.c.P.standards().length === 1, "und erscheint in der kanonischen Standardstruktur aus Paket 3 (T62)");
  ok(!/standards2|mm_standards/.test(POINTS), "keine zweite Standardbibliothek (T62)");

  /* T40: negative oder unklare Wirkung ⇒ keine Empfehlung. */
  ["nicht_erkennbar", "unklar", "offen"].forEach(function (w) {
    const f = fertig(w, "gut");
    ok(!f.c.P.standardEmpfohlen(f.m), "Wirkung „" + w + "“ ⇒ keine Standardempfehlung (T40)");
  });
  ["nicht_vertragen", "unklar"].forEach(function (a) {
    const f = fertig("erkennbar", a);
    ok(!f.c.P.standardEmpfohlen(f.m), "Alltagstauglichkeit „" + a + "“ ⇒ keine Standardempfehlung (T40)");
  });
  const warn = fertig("erkennbar", "gut", { warning: "Dauerhaft hohe Dosen stören die Kupferaufnahme." });
  ok(!warn.c.P.standardEmpfohlen(warn.m), "ein offener Warnhinweis verhindert die Empfehlung (T41)");
  const arzt = fertig("erkennbar", "gut", { arztVorbehalt: true });
  ok(!arzt.c.P.standardEmpfohlen(arzt.m), "ärztlicher Vorbehalt verhindert die Empfehlung (T41)");

  /* Abschluss ohne Standard bleibt möglich. */
  const o = fertig("erkennbar", "gut");
  o.c.P.declineStandard(o.m.id);
  ok(o.c.P.get(o.m.id).abgeschlossen && !o.c.P.get(o.m.id).standard,
    "Abschluss ohne Standard ist ausdrücklich möglich (T38)");
})();

/* ==================================================================== 9 */
group("9 · Sicherheit, Warnungen und Zugriff (T41–T45)");
(function () {
  const c = mitPunkt();
  const m = c.P.startMeasure({
    optimization_point_id: c.punkt.id, measure_source: "stack", measure_id: "zinc",
    measure_label: "Zink", observation_days: 14,
    warning: "Dauerhaft hohe Dosen stören die Kupferaufnahme."
  });
  ok(m.status === "weitere_abklaerung", "ein Warnhinweis führt zu „Weitere Abklärung“ statt zu stiller Aktivierung (T41)");
  ok(m.measure_warning.indexOf("Kupferaufnahme") >= 0, "der bestehende Warntext bleibt wörtlich erhalten (T42)");
  ok(/s\.monitor \|\| ""/.test(APP), "der Hinweis stammt aus dem bestehenden Katalogfeld, nicht aus neuer Logik (T42)");
  ok(/mn-warn/.test(APP), "und wird sichtbar angezeigt (T42)");

  /* T42: keine bestehende Warnung wird entfernt oder abgeschwächt. */
  ["os-conflicts", "os-skipped", "os-remove", "CONTEXT CHECK"].forEach(function (w) {
    ok(APP.indexOf(w) > 0, "bestehende Warnfläche bleibt erhalten: " + w + " (T42)");
  });
  ok(/monitor:|conflict:|skipIf:/.test(ENGINES), "die Sicherheitsfelder im Katalog sind unverändert (T42)");
  ok(!/dosier|mg\/kg|Einnahme empfohlen/i.test(MEASURE_CODE), "keine Dosierungs- oder Therapieempfehlung (§18)");
  ok(!/absetzen|reduziere die Dosis/i.test(MEASURE_CODE), "keine Empfehlung zum Absetzen (§18)");

  /* T43/T44/T45: Zugriff bleibt, wie er ist. */
  ok(!/hasAccess|entitlement|resolveProductAccess/.test(POINTS), "points.js fasst keine Zugriffslogik an (T43)");
  ok(!/hasAccess|entitlement/.test(APP.split("MASSNAHMENPRÜFUNG (Paket 7)")[1].split("function ergebnisFormHTML")[0]),
    "die Maßnahmenfläche ändert nichts an Zugang oder Entitlements (T43/T45)");
  ok(/hasAccess\("protocol"\)/.test(APP), "die bestehende Zugriffsprüfung bleibt unverändert (T45)");
  ok(!/mm_protokoll_code|DELIVERY_VAULT/.test(POINTS + APP.split("MASSNAHMENPRÜFUNG (Paket 7)")[1]),
    "kein clientseitiger Zugangscode wird wiederhergestellt (§19)");
})();

/* =================================================================== 10 */
group("10 · Experimente, Kapitel und Fremdmodule (T46–T49, T57–T61, T64)");
(function () {
  /* T46/T47: Premium-Experimente bleiben eigenständig. */
  ok(/MM\.intelligence && MM\.intelligence\.experiments/.test(POINTS), "Experimente werden nur über die öffentliche API gelesen (T46)");
  ok(!/experiments\.\w+\s*=|E\.save|E\.create/.test(POINTS), "kein Schreibzugriff auf das Experiment-Modul (T47)");
  const g = require("node:child_process").execSync("git -C " + ROOT + " diff --name-only HEAD", { encoding: "utf8" }) +
            require("node:child_process").execSync("git -C " + ROOT + " diff --name-only --cached", { encoding: "utf8" });
  ok(!/js\/os\/intelligence\/experiments\.js/.test(g), "experiments.js bleibt unverändert (T47)");
  ok(!/js\/score-telemetry\.js/.test(g), "keine neue Telemetrie (T64)");
  ok(!/MM\.track|telOnce/.test(MEASURE_CODE), "die Verbindungsschicht telemetriert nicht (T64)");

  /* T48/T49: Paket-6-Kapitelmapping nur lesen. */
  global.window = {};
  delete require.cache[require.resolve(path.join(ROOT, "js/check-data.js"))];
  require(path.join(ROOT, "js/check-data.js"));
  const C = global.window.MM_CHECK;
  ok(typeof C.chapterFor === "function" && C.chapterFor("sleep").chapter === "schlaf",
    "das Kapitelmapping aus Paket 6 ist unverändert (T48)");
  ok(!/CHAPTERS|chapterFor/.test(POINTS_CODE), "points.js baut keine zweite Kapitelzuordnung (T48)");
  ok(!/startMeasure/.test(read("js/check.js")), "kein Kapitelaufruf startet eine Maßnahme (T49)");

  /* T57–T61: Score, Bereichswerte, Messdatenbrücke, Statusmodell. */
  const summe = Object.keys(C.domainMeta).reduce((a, k) => a + (C.domainMeta[k].w || 0), 0);
  ok(summe === 145, "Score-Gewichte eingefroren (Summe 145) (T58)");
  ok(C.areaValueLabel(56) === "5,6/10", "Bereichswerte unverändert (T59)");
  ok(typeof C.totalFrom === "function" && typeof C.primaryBottleneck === "function", "Score-Formeln unverändert (T57)");
  const FOCUS = read("js/focus.js");
  ok(/MESSDATENBRÜCKE \(Paket 5\)/.test(FOCUS) && /var SIGNALE = \{/.test(FOCUS), "die Messdatenbrücke aus Paket 5 ist unverändert (T60)");
  ok(!/measure_source|startMeasure/.test(FOCUS), "und weiß nichts von Maßnahmen (T60)");
  const c = mitPunkt();
  ok(JSON.stringify(c.P.STATUS) === JSON.stringify(["erkannt", "in_umsetzung", "pruefung_faellig", "wirkung_offen", "abgeschlossen", "pausiert", "weitere_abklaerung"]),
    "das Statusmodell aus Paket 3 ist unverändert (T61)");
  ok(Object.keys(c.P.MEASURE_LABEL).every((k) => c.P.STATUS.indexOf(k) >= 0),
    "die Maßnahmensprache nutzt genau diese Zustände — keine zweite Statusmaschine (T61)");
})();

/* =================================================================== 11 */
group("11 · Legacy, Historie und Einfrieren (T3, T4, T50–T54, T65)");
(function () {
  /* T3/T4: Alt-Bestand bleibt kompatibel. */
  const alt = box("2026-07-28", {
    opt_points: [{ id: "pt_1", area: "sleep", areaLabel: "Schlaf", title: "Zur selben Zeit ins Bett",
      status: "in_umsetzung", source_type: "focus", source_id: "sleep:2026-07-01", created: "2026-07-01" }],
    os_stack: { budget: "optimal", items: [{ id: "creatine", name: "Kreatin Monohydrat" }] }
  });
  const l = alt.P.list();
  ok(l.length === 1 && l[0].title === "Zur selben Zeit ins Bett", "Alt-Punkte ohne Maßnahmenfelder bleiben lesbar (T4)");
  ok(l[0].istMassnahme === false, "und werden nicht als Maßnahme fehlgedeutet (T4)");
  ok(l[0].statusLabel === "In Umsetzung", "ihr Status bleibt in der Paket-3-Sprache (T4/T61)");
  ok(alt.P.measuresFor("pt_1").length === 0, "sie tragen keine erfundenen Maßnahmen (T4)");
  ok(JSON.parse(alt.__mem["mm_os_stack"]).items[0].id === "creatine", "Alt-Stack bleibt unverändert (T3)");

  /* T50: ICS. */
  ok(/BEGIN:VCALENDAR/.test(APP) && /Maßnahmenprüfung: /.test(APP), "der Prüfungstermin kann als ICS ausgegeben werden (T50)");
  ok(/UID:mm-mn-" \+ m\.id \+ "-" \+ flat\(m\.review_date\)/.test(APP),
    "die UID ist stabil — ein erneuter Export erzeugt keinen zweiten Termin (T51)");
  ok(/DTSTART;VALUE=DATE:/.test(APP), "ganztägiger Termin auf dem lokalen Kalendertag (T18/T50)");
  ok(/Umsetzung und Wirkung werden getrennt geprueft/.test(APP), "die Beschreibung nennt die Trennung (§22)");

  /* T51: Reload erzeugt keine Duplikate. */
  const c = mitPunkt("2026-07-28");
  const opts = { optimization_point_id: c.punkt.id, measure_source: "stack", measure_id: "magnesium", measure_label: "Magnesium", observation_days: 14 };
  c.P.startMeasure(opts); const snap = c.__mem["mm_opt_points"];
  c.P.startMeasure(opts); c.P.startMeasure(opts);
  ok(c.P.measuresFor(c.punkt.id).length === 1, "wiederholter Start erzeugt keinen zweiten Test (T51)");
  ok(JSON.parse(c.__mem["mm_opt_points"]).length === JSON.parse(snap).length, "und keine zweite Zeile (T51)");

  /* T52: abgeschlossene Prüfung bleibt eingefroren. */
  const f = mitPunkt("2026-07-28");
  const m = f.P.startMeasure({ optimization_point_id: f.punkt.id, measure_source: "stack", measure_id: "omega3", measure_label: "Omega-3", observation_days: 7, criterion_label: "Morgenenergie" });
  f.P.setMeasureResult(m.id, { umsetzung: "regelmaessig", wirkung: "teilweise", alltag: "gut", decision: "beibehalten" });
  const eingefroren = JSON.stringify(f.P.get(m.id));
  f.__mem["mm_trk_sleep"] = JSON.stringify([{ date: "2026-08-01", dur: 4 }]);
  f.__mem["mm_os_metrics"] = JSON.stringify([{ type: "weight", value: 99, date: "2026-08-01" }]);
  ok(JSON.stringify(f.P.get(m.id)) === eingefroren, "spätere Messwertänderungen verändern das Ergebnis nicht (T52)");
  ok(f.P.get(m.id).result_summary === "teilweise" && f.P.get(m.id).measure_decision === "beibehalten",
    "Ergebnis und Entscheidung bleiben erhalten (T52/§26)");

  /* T65: Historie bleibt nach Katalogtiteländerung lesbar. */
  ok(f.P.get(m.id).measure_label_snapshot === "Omega-3", "der Anzeigename ist als Snapshot eingefroren (T65)");
  ok(f.P.get(m.id).measure_id === "omega3", "die fachliche Referenz bleibt die stabile ID (T65)");
  ok(/measure_label_snapshot \|\| m\.title/.test(APP) && /measure_label_snapshot \|\| m\.title/.test(TRACKER),
    "beide Oberflächen zeigen den Snapshot — auch ohne geladenen Katalog (T65)");

  /* T53/T54: updated_at und Merge. */
  const vor = f.P.get(m.id).updated_at;
  f.P.mutate(m.id, { usability_result: "gut" });
  ok(f.P.get(m.id).updated_at >= vor, "jede echte Mutation setzt updated_at (T53)");
  ok(/updated_at: stamp\(\)/.test(POINTS), "der Zeitstempel wird zentral gesetzt (T53)");
})();

/* =================================================================== 12 */
group("12 · Oberfläche und Sprache (§25, §15, §27)");
(function () {
  const block = APP.split("MASSNAHMENPRÜFUNG (Paket 7)")[1].split("function ergebnisFormHTML")[0];
  ok(/function massnahmenHTML/.test(APP), "die Darstellung hängt in der bestehenden Stack-Ansicht (§25)");
  ok(/html \+= massnahmenHTML\(strat\);/.test(APP), "sie wird dort eingehängt, wo der Stack ohnehin steht (§25)");
  ok(!/location\.hash =|VIEWS\.push|new Route/.test(block), "keine neue Navigation und keine neue Seite (§25)");
  ok(/if \(!offen\.length && !massnahmen\.length\) return "";/.test(APP),
    "ohne Punkt und ohne Maßnahme erscheint nichts — kein leerer Platzhalter (§14)");
  ["Optimierungspunkt", "Beobachtungszeitraum", "Prüfung", "Erfolgssignal", "Maßnahme"].forEach(function (b) {
    ok(APP.indexOf(b) > 0, "kanonischer Begriff verwendet: " + b + " (§2)");
  });
  ["FMEA", "Ishikawa", "5 Why", "KVP", "8D", "Intervention Library", "Treatment Path"].forEach(function (b) {
    ok(APP.indexOf(b) < 0, "kein sichtbarer Methodenbegriff: " + b + " (§25)");
  });
  ["bewiesen wirksam", "garantiert erfolgreich", "medizinisch bestätigt", "hat eindeutig verursacht"].forEach(function (b) {
    ok((APP + POINTS_CODE + TRACKER).indexOf(b) < 0, "unzulässige Formulierung fehlt: " + b + " (§15)");
  });
  /* Der Tracker referenziert nur — er startet und ändert nichts. */
  ok(/measuresFor/.test(TRACKER) && !/startMeasure|setMeasureResult/.test(TRACKER),
    "der Tracker referenziert Maßnahmen nur lesend (§25)");
  /* CSS: bestehende Tokens, lesbar, umbruchfähig. */
  const CSS = read("css/os.css");
  const mnCss = (CSS.split("MASSNAHMENPRÜFUNG (Paket 7)")[1] || "").replace(/^[\s\S]*?\*\//, "");
  ok(mnCss.length > 200, "die Regeln sind vorhanden (§25)");
  ok(/overflow-wrap: anywhere/.test(mnCss), "lange deutsche Maßnahmennamen brechen sauber um (§30)");
  ok(/focus-visible/.test(mnCss), "der sichtbare Fokus bleibt erhalten (§30)");
  ok(/min-height: 40px/.test(mnCss), "die Bedienelemente sind auch mobil greifbar (§30)");
  ok(!/#[0-9a-f]{6}(?!,)/i.test(mnCss.replace(/var\([^)]*\)/g, "")), "nur bestehende Design-Tokens (§25)");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
