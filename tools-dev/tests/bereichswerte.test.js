/* ==========================================================================
   MALEMETRIX P4 — BEREICHSWERTE UND NACHVOLLZIEHBARE BEGRÜNDUNG
   Friert ein, dass der Bereichswert eine reine DARSTELLUNGSSCHICHT bleibt:
   ein kanonischer Helfer, Domain-Score / 10, deutsches Zahlenformat, keine
   Speicherung, keine zweite Engine, keine erfundenen Ursachen, kein Engpass
   aus dem niedrigsten Wert, keine rückwirkende Struktur über alte Ergebnisse.
   Deckt die Prüfpunkte 1–40 aus Paket 4 ab (Nummern in den Meldungen).
   Ausführen:  node tools-dev/tests/bereichswerte.test.js
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

/* Echte Engine, ohne DOM. */
global.window = global.window || {};
require(path.join(ROOT, "js/check-data.js"));
const C = global.window.MM_CHECK;

/* Sandbox mit localStorage — für Speicher- und Tagestracking-Nachweise. */
function box(today, store) {
  const mem = Object.assign({}, store || {});
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0) super((today || "2026-07-20") + "T12:00:00"); else super(...a); }
    static now() { return new RealDate((today || "2026-07-20") + "T12:00:00").getTime(); }
  }
  const ctx = {
    localStorage: {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; }
    },
    console: { log() {}, error() {} },
    Date: FakeDate, Math, JSON, Object, Array, String, Number, isNaN, isFinite, parseInt, parseFloat
  };
  ctx.window = ctx; ctx.__mem = mem;
  vm.createContext(ctx);
  vm.runInContext(read("js/check-data.js"), ctx);
  vm.runInContext(read("js/focus.js"), ctx);
  vm.runInContext(read("js/points.js"), ctx);
  return ctx;
}

const CHECK = read("js/check.js");
const REPORT = read("js/report.js");
const DATA = read("js/check-data.js");
const CSS = read("css/style.css");
/* Nur der Paket-4-Block der Ergebnisseite — dort dürfen keine Nebenwirkungen
   entstehen. Alles davor/danach ist bestehender Code aus früheren Paketen. */
const AREA_BLOCK = CHECK.split("OPTIMIERUNGSBEREICHE MIT BEREICHSWERT (Paket 4)")[1].split("V2: KONTEXT-PANEL")[0];
/* Derselbe Block ohne jede Kommentarzeile — Kommentare dürfen erklären, was im
   Code selbst gerade NICHT passieren darf (z. B. „Score / 10“). */
const AREA_CODE = AREA_BLOCK.replace(/^[\s\S]*?\*\//, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const HELPER_BLOCK = DATA.split("C.areaValueFromDomainScore")[1].split("C.legacyScores")[0];

/* Realistische Antworten mit echten Lücken und echten Punktverlusten. */
const ANS = {
  sex: "m", age: "44", height: "182", weight: "96", waist: "104",
  status_use: "natural", goal_main: ["fatloss"], goal_pain: "energie",
  rec_duration: "lt5", mov_sitting: "gt11", steps: "lt4",
  str_freq: "1", fuel_protein: "keine_ahnung"
};

/* ==================================================================== 1 */
group("1 · Kanonischer Helfer und Umrechnung (T1–T6, T14, T35)");
(function () {
  ok(typeof C.areaValueFromDomainScore === "function", "kanonischer Helfer areaValueFromDomainScore existiert (T35)");
  ok(typeof C.formatAreaValue === "function" && typeof C.areaValueLabel === "function",
    "Formatierung und vollständiges Label liegen im selben kanonischen Ort (T35)");
  ok(typeof C.areaValueA11y === "function", "vollständiger Screenreader-Text ist Teil des Helfers (T35)");

  ok(C.areaValueFromDomainScore(100) === 10, "Rohwert 100 → 10 (T1)");
  ok(C.areaValueLabel(100) === "10/10", "Domain-Score 100 → 10/10 (T1)");
  ok(C.areaValueLabel(84) === "8,4/10", "Domain-Score 84 → 8,4/10 (T2)");
  ok(C.areaValueLabel(70) === "7/10", "Domain-Score 70 → 7/10 ohne unnötiges Komma-Null (T3)");
  ok(C.areaValueLabel(56) === "5,6/10", "Domain-Score 56 → 5,6/10 (T4)");
  ok(C.areaValueLabel(10) === "1/10", "Domain-Score 10 → 1/10 (T5)");
  ok(C.areaValueLabel(0) === "0/10", "Domain-Score 0 → 0/10 (T6)");
  ok(C.areaValueLabel(74) === "7,4/10" && C.areaValueLabel(7) === "0,7/10", "Zwischenwerte bleiben verlustfrei (T14)");

  /* T14: der Domain-Score selbst wird nie verändert — nur durch 10 geteilt. */
  [0, 1, 7, 10, 33, 56, 70, 84, 99, 100].forEach(function (s) {
    ok(C.areaValueFromDomainScore(s) * 10 === s, "Rohwert ist exakt Score/10, verlustfrei umkehrbar: " + s + " (T14)");
  });
})();

/* ==================================================================== 2 */
group("2 · Formatregeln: Komma, eine Nachkommastelle, keine Untergrenze (T9–T11)");
(function () {
  ok(C.formatAreaValue(56) === "5,6" && !/\./.test(C.formatAreaValue(56)), "deutsches Dezimalkomma, kein Punkt (T9)");
  ok(!/[.,]/.test(C.formatAreaValue(70)), "ganze Werte tragen gar kein Trennzeichen (T9)");
  [0, 3, 7, 14, 27, 38, 46, 55, 63, 79, 88, 91, 100].forEach(function (s) {
    const t = C.formatAreaValue(s);
    const nk = t.indexOf(",") >= 0 ? t.split(",")[1].length : 0;
    ok(nk <= 1, "höchstens eine Nachkommastelle bei Score " + s + " → " + t + " (T10)");
  });
  /* T10: Rundung bleibt auf eine Stelle, auch bei krummen Zwischenwerten. */
  ok(C.formatAreaValue(56.49) === "5,6" && C.formatAreaValue(56.5) === "5,7", "kaufmännische Rundung auf eine Stelle (T10)");
  /* T11: keine künstliche Untergrenze — 0 bleibt 0, kleine Werte bleiben klein. */
  ok(C.areaValueLabel(0) === "0/10" && C.areaValueLabel(1) === "0,1/10" && C.areaValueLabel(4) === "0,4/10",
    "kein künstliches Minimum von 1 (T11)");
  ok(!/Math\.max\(\s*1/.test(HELPER_BLOCK), "im Helfer existiert keine Mindestwert-Klemme (T11)");
})();

/* ==================================================================== 3 */
group("3 · Fehlende und ungültige Werte (T7, T8, T24)");
(function () {
  [null, undefined, NaN, Infinity, -Infinity, "70", "", {}, [], true, false].forEach(function (v) {
    ok(C.areaValueFromDomainScore(v) === null, "kein Rohwert aus ungültiger Eingabe: " + String(v) + " (T8)");
    ok(C.areaValueLabel(v) === "Noch nicht bewertet", "ungültige Eingabe zeigt „Noch nicht bewertet“: " + String(v) + " (T7/T8)");
  });
  /* Außerhalb von 0–100 kann nur beschädigte Persistenz liegen: lieber ehrlich
     nichts anzeigen als eine unsinnige Zahl. Keine Skalierung, keine Klemme. */
  [-1, -5, 101, 1000].forEach(function (v) {
    ok(C.areaValueFromDomainScore(v) === null && C.areaValueLabel(v) === "Noch nicht bewertet",
      "Score außerhalb der 0–100-Skala gilt als ungültig: " + v + " (T8)");
  });
  ok(C.areaValueLabel(100) === "10/10" && C.areaValueLabel(0) === "0/10", "die Grenzen selbst bleiben gültige Werte (T1/T6)");
  ok(C.AREA_VALUE_EMPTY === "Noch nicht bewertet", "genau EIN Leertext, zentral definiert (T7)");
  ok(!/Noch nicht bewertet/.test(C.areaValueLabel(0)), "0 ist ein ECHTER Wert und wird nicht als „fehlt“ ausgegeben (T7)");
  ok(C.areaValueA11y("Schlaf & Erholung", 56) === "Schlaf & Erholung: Bereichswert 5,6 von 10",
    "Screenreader erhält den vollständigen Text, nicht nur die Zahl (T7)");
  ok(C.areaValueA11y("Schlaf & Erholung", null) === "Schlaf & Erholung: Noch nicht bewertet",
    "fehlender Wert wird auch akustisch als fehlend benannt — nicht als „normal“ (T24)");
  /* T24: fehlende Daten erzeugen sichtbare Lücken, keine stille Annahme. */
  const gaps = C.dataGaps(ANS);
  ok(gaps.length > 0 && gaps.every(g => g.label && g.why), "Datenlücken benennen Fehlendes samt Begründung (T24)");
  ok(/Datenbasis begrenzt/.test(AREA_BLOCK), "Bereiche mit Lücke werden sichtbar markiert (T23)");
})();

/* ==================================================================== 4 */
group("4 · Keine Speicherung, keine Telemetrie, keine Confidence-Logik (T12, T13, T25)");
(function () {
  ok(!/localStorage|MM\.store|setItem/.test(HELPER_BLOCK), "der Helfer schreibt und liest keinen Speicher (T12)");
  ok(!/MM\.store\.set|localStorage\.setItem/.test(AREA_CODE), "der Bereichsblock der Ergebnisseite speichert nichts (T12)");
  ok(!/areaValue|Bereichswert/.test(read("js/score-telemetry.js")), "Telemetrie kennt den Bereichswert nicht (T13)");
  ok(!/MM\.track|telOnce|telemetry/i.test(AREA_CODE), "kein Telemetrie-Aufruf aus der Bereichsdarstellung (T13)");
  ok(!/MM\.track|telOnce/.test(HELPER_BLOCK), "kein Telemetrie-Aufruf aus dem Helfer (T13)");
  ok(!/confidence|Aussagesicherheit/i.test(HELPER_BLOCK), "der Helfer führt keine eigene Aussagesicherheit ein (T25)");
  ok(typeof C.dataConfidence === "function" && C.evaluate(ANS).confidence && C.evaluate(ANS).confidence.level,
    "die bestehende Confidence-Logik bleibt die einzige (T25)");

  /* T12 hart: nach vollständiger Darstellung ist KEIN neuer Speicherschlüssel da. */
  const ctx = box("2026-07-20", { mm_check_result: JSON.stringify({ v: 2, date: "2026-07-10", total: 61, domains: { sleep: 56, training: 84 } }) });
  const K = ctx.window.MM_CHECK;
  const vorher = Object.keys(ctx.__mem).sort().join("|");
  K.areaValueLabel(56); K.areaValueA11y("Schlaf", 56); K.formatAreaValue(84);
  K.areaReasons({ rec_duration: "lt5" }, "sleep", [], 3);
  ok(Object.keys(ctx.__mem).sort().join("|") === vorher, "Darstellung erzeugt keinen einzigen neuen Speicherschlüssel (T12)");
})();

/* ==================================================================== 5 */
group("5 · Score-Engine unverändert: Formeln, Gewichte, Gesamtscore (T15–T18, T40)");
(function () {
  const summe = Object.keys(C.domainMeta).reduce((a, k) => a + (C.domainMeta[k].w || 0), 0);
  ok(summe === 145, "Gewichtssumme eingefroren bei 145 (T17)");
  ok(C.domainKeys.length === 12, "12 Kern-Domains unverändert (T18)");
  ok(Object.keys(C.domainMeta).length === 15, "12 Kern- + 3 Kontext-Domains unverändert (T18)");

  const ev = C.evaluate(ANS);
  ok(ev.total >= 0 && ev.total <= 100, "Gesamtscore bleibt auf der 100er-Skala (T15)");
  ok(/\/100/.test(CHECK) && !/total[^\n]{0,40}areaValue/.test(CHECK), "der Gesamtscore wird nie als Bereichswert dargestellt (T15)");
  ok(typeof C.totalFrom === "function", "die bestehende Gesamtrechnung bleibt die einzige (T16)");

  /* T16: identische Antworten → identisches Ergebnis; der Helfer wirkt nicht zurück. */
  const a1 = JSON.stringify(C.evaluate(ANS));
  C.domainKeys.forEach(d => C.areaValueLabel(C.evaluate(ANS).domains[d]));
  const a2 = JSON.stringify(C.evaluate(ANS));
  ok(a1 === a2, "die Auswertung ist nach Bereichswert-Nutzung bitgleich (T16/T40)");

  /* T18: die Priorisierungsfunktion selbst ist unverändert nutzbar. */
  ok(typeof C.primaryBottleneck === "function" && /health \* meta\.action/.test(DATA.replace(/meta\./g, "meta.")),
    "Domain-Priorisierung nutzt weiterhin health × action × Zielbezug (T18)");

  /* T40: Telemetrie-Datei ohne Paket-4-Berührung. */
  const tel = read("js/score-telemetry.js");
  ok(!/Bereich|area_value|domain_value/.test(tel), "Score-Telemetrie verhaltensgleich — kein neues Feld (T40)");
})();

/* ==================================================================== 6 */
group("6 · Engpass kommt aus der Engine, nicht aus dem niedrigsten Wert (T19, T20)");
(function () {
  /* Konstruiert: cardiovascular 45 liegt ÜBER movement 40 — und ist trotzdem
     der Engpass, weil die bestehende Gewichtung (health × action) so rankt. */
  const domains = {
    cardiovascular: 45, movement: 40, sleep: 80, training: 80, nutrition: 80,
    bodyComposition: 80, recovery: 80, metabolic: 80, hormonal: 80, mental: 80,
    energy: 80, dataQuality: 80
  };
  const bn = C.primaryBottleneck({ sex: "m", age: "40" }, domains, [], []);
  const min = Object.keys(domains).sort((x, y) => domains[x] - domains[y])[0];
  ok(bn.domain === "cardiovascular", "die Engine wählt cardiovascular als Engpass (T19)");
  ok(min === "movement" && bn.domain !== min, "der niedrigste Bereichswert wird NICHT automatisch zum Engpass (T20)");
  ok(domains[bn.domain] > domains[min], "der Engpass darf einen höheren Bereichswert haben als ein anderer Bereich (T20)");

  /* Die Ergebnisseite markiert genau diesen Engpass — nicht den kleinsten Wert. */
  ok(/d === V\.primaryBottleneck\.domain/.test(AREA_BLOCK), "die Markierung liest die Engine-Entscheidung (T19)");
  ok(!/Math\.min|sort\(.*domains|niedrigst/i.test(AREA_CODE), "kein Minimum-Vergleich in der Bereichsdarstellung (T20)");
  ok(/Primärer Engpass/.test(AREA_BLOCK), "der Engpass wird genau einmal klar benannt (T19)");

  /* Echter Durchlauf: Markierung und Engine stimmen überein. */
  const ev = C.evaluate(ANS);
  ok(ev.primaryBottleneck && C.domainMeta[ev.primaryBottleneck.domain], "der Engpass ist immer eine echte Domain (T19)");
  ok(ev.primaryBottleneck.value === ev.domains[ev.primaryBottleneck.domain],
    "der angezeigte Engpasswert stammt aus derselben Domain-Zahl (T19)");
})();

/* ==================================================================== 7 */
group("7 · Begründung aus vorhandenen Daten, ohne erfundene Ursache (T21, T22, T23)");
(function () {
  const ev = C.evaluate(ANS);
  const rs = C.areaReasons(ANS, "sleep", ev.dataGaps, 3);
  ok(rs.gruende.length > 0, "es gibt eine konkrete Begründung für den Schlafbereich (T21)");

  /* T21: jede Begründung ist eine ECHTE Frage mit der ECHTEN Antwort des Nutzers. */
  const steps = C.scoredSteps(ANS);
  rs.gruende.forEach(function (g) {
    const st = steps.filter(s => s.q.id === g.id)[0];
    ok(!!st, "Begründung „" + g.frage + "“ verweist auf eine tatsächlich gestellte Frage (T21)");
    ok(!!st && ANS[st.q.id] !== undefined, "die Begründung nutzt eine tatsächlich gegebene Antwort (T21)");
    ok(!!st && C.domainOf(st.q) === "sleep", "die Begründung stammt aus demselben Bereich (T21)");
    ok(g.kosten > 0, "nur Antworten, die den Wert wirklich gedrückt haben, erklären ihn (T21)");
  });

  /* T22: keine Ursachenbehauptung, keine Diagnose, keine generierten Sätze. */
  ok(!/weil du|führt zu|verursacht|liegt daran|ist schuld|Diagnose/i.test(HELPER_BLOCK.replace(/\/\*[\s\S]*?\*\//g, "")),
    "der Helfer formuliert keine Ursachen (T22)");
  ok(!/Math\.random|generate|template|prompt/i.test(HELPER_BLOCK), "keine generierten Begründungstexte (T22)");
  rs.hinweise.forEach(function (h) {
    const m = C.MODIFIERS.filter(x => x.id === h.id)[0];
    ok(!!m && m.why === h.text, "Zusatzhinweis „" + h.id + "“ ist wörtlich der dokumentierte bestehende Modifikator (T22)");
  });

  /* Keine doppelten Gründe. */
  const ids = rs.gruende.map(g => g.id);
  ok(new Set(ids).size === ids.length, "Gründe sind eindeutig, nichts wird doppelt genannt (T21)");
  ok(rs.gruende.length <= 3, "die Begründung bleibt kurz (Limit greift) (T21)");
  ok(C.areaReasons(ANS, "sleep", ev.dataGaps, 1).gruende.length <= 1, "das Limit ist parametrierbar und wird eingehalten (T21)");

  /* T23: eine vorhandene Datenlücke wird im Bereich sichtbar. */
  const mitLuecke = ev.dataGaps.filter(g => g.domain)[0];
  ok(!!mitLuecke, "die Antworten erzeugen mindestens eine echte Datenlücke (T23)");
  const rl = C.areaReasons(ANS, mitLuecke.domain, ev.dataGaps, 3);
  ok(rl.luecke && rl.luecke.id === mitLuecke.id, "die Lücke wird genau ihrem Bereich zugeordnet (T23)");
  ok(C.areaReasons(ANS, "sleep", [], 3).luecke === null, "ohne Lücke wird keine erfunden (T23)");

  /* Ein Bereich ohne Punktverlust behauptet nichts. */
  const gut = C.areaReasons({ sex: "m", age: "30", rec_duration: "7to8" }, "sleep", [], 3);
  ok(gut.gruende.length === 0, "wo nichts Punkte gekostet hat, wird auch nichts als Grund erfunden (T22)");
  ok(/keine deiner Antworten/i.test(AREA_BLOCK), "dafür existiert ein ehrlicher Ersatztext (T22)");
})();

/* ==================================================================== 8 */
group("8 · Optimierungspunkte nur lesend (T26, T27, T38)");
(function () {
  ok(/MM\.points && MM\.points\.list/.test(AREA_BLOCK), "die Ergebnisseite liest die bestehende Punktliste (T26)");
  ok(!/points\.upsert|points\.fromFocus|points\.setStatus|points\.adoptStandard/.test(AREA_CODE),
    "die Bereichsdarstellung schreibt nie in mm_opt_points (T26/T27)");
  ok(!/opt_points/.test(AREA_CODE), "kein direkter Speicherzugriff an der Punktliste vorbei (T26)");
  ok(/!p\.abgeschlossen/.test(AREA_BLOCK), "nur aktive Punkte werden referenziert (T26)");
  ok(/pt \?/.test(AREA_BLOCK) || /\(pt \?/.test(AREA_BLOCK), "ohne Punkt entsteht kein leerer Platzhalter (T26)");

  /* T27 hart: ein sehr niedriger Bereichswert erzeugt keinen Punkt. */
  const ctx = box("2026-07-20", {});
  const P = ctx.window.MM.points;
  ok(P.list().length === 0, "Ausgangslage: keine Punkte");
  const K = ctx.window.MM_CHECK;
  ["sleep", "movement", "nutrition"].forEach(d => { K.areaValueLabel(3); K.areaReasons({}, d, [], 3); });
  ok(P.list().length === 0, "niedrige Bereichswerte erzeugen keinen einzigen Optimierungspunkt (T27)");
  ok(ctx.__mem["mm_opt_points"] === undefined, "es wird nicht einmal eine leere Punktliste angelegt (T27)");

  /* T38: vorhandene Punkte und ihre Status bleiben unverändert. */
  const punkte = [{ id: "p1", area: "sleep", title: "Zur selben Zeit ins Bett", status: "in_umsetzung", source_type: "focus", source_id: "sleep:2026-07-01", updated_at: "2026-07-01T10:00:00.000Z" }];
  const c2 = box("2026-07-20", { mm_opt_points: JSON.stringify(punkte) });
  const vorher = c2.__mem["mm_opt_points"];
  c2.window.MM.points.list();
  c2.window.MM_CHECK.areaValueLabel(56);
  ok(c2.__mem["mm_opt_points"] === vorher, "Lesen für die Bereichsdarstellung verändert die Punkte nicht (T38)");
  ok(JSON.parse(c2.__mem["mm_opt_points"])[0].status === "in_umsetzung", "der gespeicherte Status bleibt exakt erhalten (T38)");
})();

/* ==================================================================== 9 */
group("9 · Historische Ergebnisse und Score-Versionen (T28, T29, T36, T37)");
(function () {
  ok(/V\.legacy \|\| !rows\.length/.test(AREA_BLOCK), "ohne gespeicherte Domain-Daten wird die Bereichsliste gar nicht erst gebaut (T29)");
  ok(/frühere[s]? Ergebnis/i.test(AREA_BLOCK) && /verdichtete Profil/.test(AREA_BLOCK),
    "stattdessen erscheint der ehrliche Hinweis auf das verdichtete Profil (T29)");
  ok(!/legacyScores|r\.scores/.test(AREA_CODE), "es wird nie ein Bereichswert aus den 7 Profilsäulen zurückgerechnet (T29)");
  ok(/typeof V\.domains\[d\] === "number"/.test(AREA_BLOCK), "nur tatsächlich gespeicherte Zahlen werden dargestellt (T29)");

  /* T28: ein gespeichertes Ergebnis bleibt nach vollständiger Darstellung byte-gleich. */
  const alt = { v: 2, date: "2026-05-02", total: 58, scores: { body: 40, strength: 62 }, domains: { sleep: 56, training: 84, movement: 41 }, answers: ANS };
  const ctx = box("2026-07-20", { mm_check_result: JSON.stringify(alt) });
  const vorher = ctx.__mem["mm_check_result"];
  const K = ctx.window.MM_CHECK;
  Object.keys(alt.domains).forEach(d => { K.areaValueLabel(alt.domains[d]); K.areaValueA11y(d, alt.domains[d]); K.areaReasons(alt.answers, d, [], 3); });
  ok(ctx.__mem["mm_check_result"] === vorher, "das gespeicherte Score-Ergebnis wird nicht mutiert (T28)");
  ok(JSON.parse(ctx.__mem["mm_check_result"]).domains.sleep === 56, "die gespeicherten Domain-Zahlen bleiben unverändert (T28)");

  /* T29: ein Alt-Ergebnis ohne domains bekommt keinen erfundenen Wert. */
  const legacyRes = { date: "2025-11-03", total: 55, scores: { body: 40, strength: 62, fuel: 50, recovery: 44, blood: 60, drive: 58, execution: 51 } };
  ok(legacyRes.domains === undefined, "Ausgangslage: Alt-Ergebnis ohne Domain-Daten");
  Object.keys(legacyRes.scores).forEach(k => {
    ok(C.areaValueLabel(legacyRes.scores[k]) !== undefined, "Profilwerte lassen sich technisch formatieren …");
  });
  ok(!/scores\[/.test(AREA_CODE), "… werden aber im Bereichsblock nie als Bereichswert eingesetzt (T31)");

  /* T36/T37: der Bereichswert hängt am Score-Zeitpunkt, nicht am Tagestracking. */
  ok(/Score vom |letzten Score/.test(AREA_BLOCK), "der Bereichswert wird sichtbar an seinen Score-Zeitpunkt gebunden (T36)");
  const c3 = box("2026-07-20", {
    mm_check_result: JSON.stringify(alt),
    mm_focus: JSON.stringify({ v: 1, domain: "sleep", title: "Zur selben Zeit ins Bett", daily: "Heute pünktlich ins Bett", target: 5, days: 7, started: "2026-07-18", until: "2026-07-25", done: {} })
  });
  const label1 = c3.window.MM_CHECK.areaValueLabel(JSON.parse(c3.__mem["mm_check_result"]).domains.sleep);
  c3.window.MM.focus.toggleDay();
  c3.window.MM.focus.toggleDay();
  const label2 = c3.window.MM_CHECK.areaValueLabel(JSON.parse(c3.__mem["mm_check_result"]).domains.sleep);
  ok(label1 === "5,6/10" && label2 === "5,6/10", "Tagestracking verändert den Bereichswert nicht (T37)");
  ok(c3.__mem["mm_check_result"] === JSON.stringify(alt), "und rührt das Score-Ergebnis nicht an (T37)");
})();

/* =================================================================== 10 */
group("10 · 12 Bereiche vs. 7-Säulen-Profil (T30, T31)");
(function () {
  ok(/Deine Optimierungsbereiche/.test(AREA_BLOCK), "die 12 Bereiche heißen Optimierungsbereiche (T30)");
  const profil = CHECK.split("MM / PROFIL")[1] || "";
  ok(/verdichtetes Profil/.test(profil), "die 7 Säulen heißen ausdrücklich „verdichtetes Profil“ (T30)");
  ok(!/Optimierungsbereich/.test(profil.slice(0, 1200)), "die 7 Säulen werden nirgends Optimierungsbereiche genannt (T30)");
  ok(/keine zweite Bereichsliste/.test(profil), "die Verdichtung wird als solche erklärt (T30)");
  ok(/100er-Skala/.test(profil), "die Profilsäulen bleiben sichtbar auf der 100er-Skala (T31)");
  ok(!/areaValueLabel|Bereichswert/.test(profil.split("</div></div>")[0] || profil.slice(0, 1500)),
    "kein Profilwert wird als Bereichswert ausgegeben (T31)");

  /* legacyScores bleibt die einzige Verdichtung — und ist keine Bereichsquelle. */
  ok(typeof C.legacyScores === "function", "die bestehende Verdichtung 12 → 7 bleibt erhalten (T30)");
  const ev = C.evaluate(ANS);
  const leg = C.legacyScores(ev.domains);
  ok(Object.keys(leg).length === 7, "die Verdichtung liefert weiterhin genau 7 Säulen (T30)");
  ok(C.domainKeys.length === 12, "und die Bereichsliste weiterhin 12 Kern-Domains (T30)");
  ok(!/hardcode|\.length === 12|slice\(0, ?12\)/.test(AREA_CODE), "die Bereichsanzahl wird nicht hart kodiert (T30)");
  ok(/C\.domainKeys\.concat/.test(AREA_BLOCK), "die Bereichsauswahl kommt aus der Engine samt Kontext-Domains (T30)");
})();

/* =================================================================== 11 */
group("11 · Trend nur bei sicherem Vergleich (T32, T33, T34)");
(function () {
  /* Der bestehende Verlauf speichert bewusst NUR Datum, Gesamtwert und die
     7 Profilsäulen — kein Domain-Detail. Damit ist ein Bereichs-Trend heute
     nicht sicher möglich, und genau deshalb wird keiner behauptet. */
  ok(/hist\.push\(\{ date: result\.date, total, scores \}\)/.test(CHECK),
    "der gespeicherte Verlauf enthält Datum, Gesamtwert und Profilsäulen (T32)");
  ok(!/domains/.test(CHECK.split("hist.push(")[1].split(";")[0]), "der Verlauf speichert keine Domain-Details (T32)");
  ok(!/hist\.push[\s\S]{0,120}domains/.test(CHECK), "Paket 4 ändert die Verlaufs-Persistenz nicht (T32)");

  /* T32: für die Werte, die WIRKLICH kompatibel gespeichert sind (Gesamtscore),
     nutzt die Seite weiterhin die bestehende Vergleichslogik. */
  ok(/const prev = \(MM\.store\.get\("check_history", \[\]\) \|\| \[\]\)/.test(CHECK),
    "die bestehende Vergleichslogik über check_history bleibt unverändert in Gebrauch (T32)");

  /* T33/T34: kein Trend, keine Ursachenbehauptung an den Bereichswerten. */
  ok(!/→|Trend|vorher|Vergleich|seit dem letzten Score/i.test(AREA_CODE),
    "an den Bereichswerten steht kein Trend, solange kein sicherer Vergleich existiert (T33)");
  ok(!/dank|durch deinen Auftrag|hat gewirkt|weil du/i.test(AREA_CODE), "keine Kausalitätsbehauptung an einem Wert (T34)");
  ok(!/areaTrend|trendFrom|C\.trend/.test(DATA), "keine neue Trend-Engine in check-data.js (T33)");
})();

/* =================================================================== 12 */
group("12 · Ergebnisseite, Report und Darstellung (T12-Seite, T35, T39)");
(function () {
  /* T35: alle sichtbaren Bereichswerte laufen über den kanonischen Helfer. */
  ok(/C\.areaValueLabel\(/.test(AREA_BLOCK), "die Ergebnisseite nutzt den kanonischen Helfer (T35)");
  ok(/C\.areaValueA11y\(/.test(AREA_BLOCK), "und den kanonischen Screenreader-Text (T35)");
  ok(!/\/ ?10\b/.test(AREA_CODE.replace(/areaValue\w*\([^)]*\)/g, "")),
    "kein zweiter, handgebauter 10er-Wert auf der Ergebnisseite (T35)");
  ok(/C\.areaValueLabel\(/.test(REPORT), "der Report nutzt denselben Helfer (T35)");
  ok(!/toFixed\(1\)/.test(REPORT.split("Optimierungsbereiche im Detail")[1] || ""), "der Report formatiert nicht selbst (T35)");

  /* Hierarchie: Gesamtscore bleibt die primäre Zahl. */
  ok(CHECK.indexOf("mm-hero") < CHECK.indexOf("MM / BEREICHE") || CHECK.indexOf("/100") < CHECK.indexOf("MM / BEREICHE"),
    "der Gesamtscore /100 steht vor den Bereichswerten (T15)");
  ok(/mm-secthead/.test(AREA_BLOCK) && /class="card dash-block"/.test(AREA_BLOCK),
    "bestehende Karten- und Kopfkomponenten statt neuer Bausteine");
  ok(/Warum dieser Wert\?/.test(AREA_BLOCK), "die Begründung ist als aufklappbarer Punkt vorhanden");
  ok(/<details class="why"><summary>/.test(AREA_BLOCK), "aufklappbar über <details> — damit tastaturbedienbar");
  ok(/sr-only/.test(AREA_BLOCK), "der Wert ist nicht nur visuell verfügbar");

  /* Reihenfolge der Karte: Name → Wert → Status → Warum → Punkt. */
  const card = AREA_BLOCK.split("html += '<div class=\"mm-area")[1] || "";
  ok(card.indexOf("nm") < card.indexOf("val") && card.indexOf("val") < card.indexOf("marks")
    && card.indexOf("marks") < card.indexOf("why") && card.indexOf("why") < card.indexOf("pt"),
    "die vorgegebene Hierarchie der Bereichskarte stimmt");

  /* CSS: bestehendes Designsystem, keine Ampel, kein Tacho, kein Chart. */
  const areaCss = CSS.split("OPTIMIERUNGSBEREICHE MIT BEREICHSWERT (Paket 4)")[1].split("/* ----")[0];
  ok(/var\(--hairline\)/.test(areaCss) && /var\(--status-active\)/.test(areaCss), "nur bestehende Design-Tokens");
  ok(!/gauge|tacho|speedo|gradient|conic/i.test(areaCss), "kein Tacho, kein Verlaufs-Chart");
  ok(!/#[0-9a-f]{6}/i.test(areaCss), "keine hart kodierten Farben — nur Tokens");
  ok(/@media \(max-width: 420px\)/.test(areaCss), "eigene Regel für schmale Displays (390 px)");
  ok(/overflow-wrap: anywhere/.test(areaCss), "lange deutsche Bereichsnamen brechen sauber um");
  ok(/min-height: 32px/.test(areaCss), "die Aufklapp-Fläche ist auch mobil greifbar");
  ok(/focus-visible/.test(areaCss), "der Fokuszustand bleibt sichtbar");
  ok(!/PRIMARY/.test(CSS), "die Engpass-Markierung ist deutsch (Begriffskanon)");

  /* Report: Trennung sichtbar, Persistenz unangetastet. */
  ok(/Dein verdichtetes Profil/.test(REPORT) && /Deine Optimierungsbereiche im Detail/.test(REPORT),
    "der Report benennt Profil und Bereiche getrennt (T30)");
  ok(/if \(!V \|\| V\.legacy \|\| !V\.domains\) return;/.test(REPORT),
    "der Report ergänzt Bereichswerte nur bei wirklich gespeicherten Domain-Daten (T29)");
  ok(!/MM\.store\.set/.test(REPORT), "der Report schreibt nichts (T12/T28)");
  ok(/Archetyp|Performance-Typ/.test(REPORT) && !/Archetyp[^\n]{0,80}Bereichswert/.test(REPORT),
    "Archetyp und Bereichswert bleiben getrennt");

  /* T39: Paket 1–3 bleiben funktionsfähig. */
  const ctx = box("2026-07-20", {});
  const F = ctx.window.MM.focus, P = ctx.window.MM.points;
  ok(typeof F.start === "function" && typeof F.progress === "function", "Fokusphasen-API aus Paket 2 unverändert nutzbar (T39)");
  ok(ctx.window.MM_CHECK.FOCUS_DAUERN.join(",") === "7,14,28", "die Dauern 7/14/28 aus Paket 2 sind unverändert (T39)");
  ok(ctx.window.MM_CHECK.focusTarget(7, 20) === 5 && ctx.window.MM_CHECK.focusTarget(14, 20) === 10,
    "die Ziel-Regel aus Paket 2 rechnet unverändert (T39)");
  ok(typeof P.upsert === "function" && typeof P.standardEmpfohlen === "function", "Optimierungspunkte-API aus Paket 3 unverändert (T39)");
  ok(/Optimierungsbereich|Engpass|Optimierungspunkt|Fokusphase/.test(read("BEGRIFFSKANON.md")), "der Begriffskanon aus Paket 1 gilt weiter (T39)");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
