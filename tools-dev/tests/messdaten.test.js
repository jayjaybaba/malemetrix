/* ==========================================================================
   MALEMETRIX P5 — MESSDATENBRÜCKE UND ASSISTIERTE ERFÜLLUNG
   Friert ein: EINE Source of Truth je Information, drei Automatikstufen,
   keine stille Auto-Erfüllung, Vorrang der manuellen Entscheidung, lokale
   Tageszuordnung, Idempotenz, eingefrorene Historie und die strikte Trennung
   von Umsetzung und Wirkung.
   Deckt die Prüfpunkte 1–52 aus Paket 5 ab (Nummern in den Meldungen).
   Ausführen:  node tools-dev/tests/messdaten.test.js
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

/* Sandbox mit fixem Heute-Datum und echtem focus.js/points.js. */
function box(today, store) {
  const mem = {};
  Object.keys(store || {}).forEach((k) => { mem["mm_" + k] = JSON.stringify(store[k]); });
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
    Date: FakeDate, Math, JSON, Object, Array, String, Number,
    isNaN, isFinite, parseInt, parseFloat, RegExp
  };
  ctx.window = ctx; ctx.__mem = mem;
  vm.createContext(ctx);
  vm.runInContext(read("js/focus.js"), ctx);
  vm.runInContext(read("js/points.js"), ctx);
  ctx.F = ctx.window.MM.focus;
  return ctx;
}

/* Auftrag: Bereich + Dauer frei wählbar. Start 01.07., letzter Umsetzungstag
   14.07., Prüfung am 15.07. */
function auftrag(domain, over) {
  return Object.assign({
    v: 1, domain: domain, bottleneckName: "Test", title: "Testauftrag",
    daily: "Heute erledigt", why: "w", proof: "p", arzt: "",
    target: 10, days: 14, wirkfrist: 14,
    started: "2026-07-01", until: "2026-07-15", wirkungBis: "2026-07-15", done: {}
  }, over || {});
}
const FOCUS = read("js/focus.js");
const TRACKER = read("js/tracker.js");
const DINNER = read("js/dinner.js");

/* ==================================================================== 1 */
group("1 · Quellenmatrix und Automatikstufen (T1, T2, T11)");
(function () {
  const c = box();
  const S = c.F.signale();
  /* T1: jede Kennzahl, die automatisch unterstützt wird, steht in der Matrix
     — und zu jedem Eintrag existiert ein echter Quellenleser. */
  const metriken = ["bewegung_min", "protein_g", "gewicht_notiert", "wert_notiert", "training_erfasst", "schlaf_erfasst"];
  Object.keys(S).forEach(function (d) {
    ok(metriken.indexOf(S[d].metrik) >= 0, "Bereich " + d + " verweist auf eine reale Kennzahl: " + S[d].metrik + " (T1)");
    ok(S[d].stufe === "A" || S[d].stufe === "B", "Bereich " + d + " hat eine gültige Automatikstufe (T1)");
  });
  ok(Object.keys(S).length === 7, "genau die geprüften 7 Bereiche werden unterstützt (T1)");
  ok(c.F.stufe("cardiovascular") === "A" && c.F.stufe("nutrition") === "A"
    && c.F.stufe("bodyComposition") === "A" && c.F.stufe("dataQuality") === "A", "vier Bereiche erfüllen Stufe A (T1)");
  ok(c.F.stufe("training") === "B" && c.F.stufe("movement") === "B" && c.F.stufe("sleep") === "B",
    "drei Bereiche bleiben bei Bestätigung (T1)");

  /* T2/T11: alles ohne Regel bleibt vollständig manuell. */
  ["recovery", "metabolic", "hormonal", "energy", "execution",
   "enhancedControl", "therapyControl", "recoveryStatus"].forEach(function (d) {
    ok(c.F.stufe(d) === "C", "Bereich " + d + " bleibt vollständig manuell (T2/T11)");
  });
  /* Der Auftrag „kein Koffein nach 14 Uhr" ist der Musterfall für Stufe C. */
  const c2 = box("2026-07-05", { focus: auftrag("energy"), trk_daily: [{ date: "2026-07-05", min: 90 }] });
  c2.F.autoSync();
  ok(Object.keys(c2.F.current().done).length === 0, "auch bei viel Bewegung entsteht fuer den Bereich energy kein Haekchen (T11)");
  ok(c2.F.tagStatus().stufe === "C", "der Tagesstatus meldet ehrlich Stufe C (T11)");

  /* Keine Regel hängt an sichtbaren Auftragstexten. */
  /* Geprüft wird der Zugriff, nicht ein Wort: keine Regel darf sich auf
     f.title / f.daily stützen — das sind sichtbare Auftragstexte. */
  const brueckeCode = FOCUS.split("MESSDATENBRÜCKE")[1].split("/* ----------------------------------------------------------------- LESEN")[0]
    .replace(/^[\s\S]*?\*\//, "").replace(/\/\*[\s\S]*?\*\//g, "");
  ok(!/\.title|\.daily\b|f\.daily/.test(brueckeCode), "die Matrix greift auf Domain-IDs zu, nie auf Auftragstexte (§11)");
  ok(/SIGNALE\[domain\]/.test(brueckeCode), "die Zuordnung läuft über die stabile Domain-ID (§11)");
})();

/* ==================================================================== 2 */
group("2 · Stufe A: Schwellenwerte und Datenlage (T3, T12–T18)");
(function () {
  const tag = "2026-07-05";
  const mk = (daily) => box(tag, { focus: auftrag("cardiovascular"), trk_daily: daily });

  /* T12/T13: fehlende Daten sind weder Erfolg noch Misserfolg. */
  const leer = mk([]);
  leer.F.autoSync();
  ok(Object.keys(leer.F.current().done).length === 0, "fehlende Daten gelten nicht als umgesetzt (T12)");
  ok(leer.F.tagStatus().status === null, "fehlende Daten gelten auch nicht als nicht umgesetzt (T13)");
  ok(leer.F.progress().erledigt === 0, "und schlagen sich in keiner Zahl nieder (T12/T13)");

  /* T16/T17/T18: unter / exakt / über dem Schwellenwert. */
  const unter = mk([{ date: tag, min: 29 }]);
  unter.F.autoSync();
  ok(!unter.F.tagStatus().umgesetzt, "29 von 30 Minuten erfüllen den Auftrag NICHT (T16)");
  const exakt = mk([{ date: tag, min: 30 }]);
  exakt.F.autoSync();
  ok(exakt.F.tagStatus().umgesetzt, "exakt 30 Minuten erfüllen den Auftrag (T17)");
  const drueber = mk([{ date: tag, min: 65 }]);
  drueber.F.autoSync();
  ok(drueber.F.tagStatus().umgesetzt && drueber.F.tagStatus().wert === 65, "über dem Schwellenwert erfüllt (T18)");
  ok(drueber.F.tagStatus().herkunft === "auto", "und wird als automatisch erkannt gekennzeichnet (T3)");
  ok(/Alltagsbewegung/.test(drueber.F.tagStatus().quelle || ""), "die verwendete Quelle ist benannt (T3)");

  /* T14: ungültige Daten werden ignoriert. */
  const muell = mk([{ date: tag, min: "viel" }, { date: tag, min: NaN }, { date: "kaputt", min: 99 },
                    { date: tag, min: -50 }, null, { min: 99 }]);
  muell.F.autoSync();
  ok(!muell.F.tagStatus().umgesetzt, "ungültige Einträge erfüllen nichts (T14)");
  ok(Object.keys(muell.F.current().done).length === 0, "und erzeugen keinen Tageseintrag (T14)");

  /* T15: veraltete Daten — außerhalb der Fokusphase wird nichts bewertet. */
  const alt = box(tag, { focus: auftrag("cardiovascular"), trk_daily: [{ date: "2026-06-20", min: 120 }] });
  alt.F.autoSync();
  ok(Object.keys(alt.F.current().done).length === 0, "Messdaten von vor dem Auftragsstart erfüllen nichts (T15)");
  const spaet = box("2026-07-20", { focus: auftrag("cardiovascular"), trk_daily: [{ date: "2026-07-16", min: 120 }] });
  spaet.F.autoSync();
  ok(!spaet.F.current().done["2026-07-16"], "Messdaten nach dem Ende der Fokusphase erfüllen nichts (T15)");

  /* T19: mehrere Einträge desselben Tages werden aggregiert, nicht dupliziert. */
  const viele = box(tag, {
    focus: auftrag("cardiovascular"),
    trk_daily: [{ date: tag, min: 12 }, { date: tag, min: 9 }],
    trk_cardio: [{ date: tag, durationMin: 6 }],
    trk_sessions: [{ date: tag + "T18:30:00.000Z", duration: 5 }]
  });
  viele.F.autoSync();
  ok(viele.F.tagStatus().wert === 32, "mehrere Aktivitäten desselben Tages ergeben 12+9+6+5 = 32 min (T19)");
  ok(Object.keys(viele.F.current().done).length === 1, "und genau EINEN Tageseintrag (T19)");
})();

/* ==================================================================== 3 */
group("3 · Free- und OS-Quellen, Priorität und Konflikt (T4–T7)");
(function () {
  const tag = "2026-07-05";
  /* T4: ein objektiver OS-Wert erfüllt Stufe A (Protein aus dem OS-Log). */
  const os = box(tag, {
    focus: auftrag("nutrition"),
    os_nutrition_plan: { protein: 180, kcal: 2600 },
    os_nutrition_log: { "2026-07-05": [{ p: 90 }, { p: 80 }] }
  });
  os.F.autoSync();
  ok(os.F.tagStatus().umgesetzt, "170 g bei Ziel 180 g (Schwelle 162 g) erfüllen über das OS-Log (T4)");
  ok(os.F.tagStatus().quelle === "OS-Ernährungslog", "die OS-Quelle ist benannt (T4)");
  ok(os.F.tagStatus().ziel === 162, "die bestehende 90-%-Adhärenzregel ist der Schwellenwert (T4)");

  /* T3: derselbe Fall über das freie Ernährungstagebuch. */
  const free = box(tag, {
    focus: auftrag("nutrition"), goals: { kcal: 2600, p: 180, c: 0, f: 0 },
    "diary_2026-07-05": { fruehstueck: [{ p: 40 }], mittag: [{ p: 60 }], abend: [{ p: 70 }], snacks: [] }
  });
  free.F.autoSync();
  ok(free.F.tagStatus().umgesetzt && free.F.tagStatus().wert === 170, "dasselbe Ergebnis aus dem freien Ernährungstagebuch (T3)");
  ok(free.F.tagStatus().quelle === "Ernährungstagebuch", "die freie Quelle ist benannt (T3)");

  /* T5/T6: beide Welten vorhanden — OS ist kanonisch, NIE wird addiert. */
  const beide = box(tag, {
    focus: auftrag("nutrition"),
    os_nutrition_plan: { protein: 180 }, os_nutrition_log: { "2026-07-05": [{ p: 170 }] },
    goals: { p: 180 }, "diary_2026-07-05": { fruehstueck: [{ p: 170 }], mittag: [], abend: [], snacks: [] }
  });
  const t5 = beide.F.tagStatus();
  ok(t5.wert === 170, "Free- und OS-Protein werden NICHT addiert (170, nicht 340) (T5)");
  ok(t5.quelle === "OS-Ernährungslog", "bei vorhandenem OS-Plan gewinnt deterministisch das OS-Log (T6)");

  /* T7: widersprüchliche Quellen erfüllen nichts automatisch. */
  const konflikt = box(tag, {
    focus: auftrag("nutrition"),
    os_nutrition_plan: { protein: 180 }, os_nutrition_log: { "2026-07-05": [{ p: 170 }] },
    goals: { p: 180 }, "diary_2026-07-05": { fruehstueck: [{ p: 30 }], mittag: [], abend: [], snacks: [] }
  });
  konflikt.F.autoSync();
  const tk = konflikt.F.tagStatus();
  ok(tk.stufe === "B", "ein Quellenkonflikt fällt auf Bestätigung zurück (T7)");
  ok(!tk.umgesetzt && Object.keys(konflikt.F.current().done).length === 0, "und erfüllt nichts automatisch (T7)");
  ok(/unterschiedlichen Ergebnissen/.test(tk.konflikt || ""), "der Konflikt wird verständlich benannt (T7)");

  /* Eine Trainingseinheit kann nie aus zwei Logs doppelt zählen. */
  const doppel = box(tag, {
    focus: auftrag("training"),
    trk_sessions: [{ date: tag + "T17:00:00.000Z", duration: 60 }],
    os_workout_logs: { _sessions: [{ date: tag, key: "a" }] }
  });
  const td = doppel.F.tagStatus();
  ok(td.stufe === "B" && td.treffer, "die Einheit wird genau einmal erkannt (T5)");
  ok(td.quelle === "Trainingslog im Tracker", "die Quellenwahl ist deterministisch (T6)");
})();

/* ==================================================================== 4 */
group("4 · Stufe B: Vorschlag statt Automatik (T8, T9, T10)");
(function () {
  const tag = "2026-07-05";
  const c = box(tag, { focus: auftrag("training"), trk_sessions: [{ date: tag + "T09:00:00.000Z", duration: 55 }] });
  c.F.autoSync();
  ok(Object.keys(c.F.current().done).length === 0, "Stufe B erzeugt beim Messdatenlauf KEIN Häkchen (T9)");
  const t = c.F.tagStatus();
  ok(t.stufe === "B" && t.treffer, "die Messdaten sprechen erkennbar dafür (T8)");
  ok(t.status === null, "ohne Bestätigung bleibt der Tag ohne Ergebnis (T9)");

  /* T10: Bestätigung erzeugt ein manuelles Ergebnis mit Herkunft. */
  c.F.setDay(tag, "ja", "bestaetigt", { quelle: t.quelle, wert: t.wert, ziel: t.ziel });
  const nach = c.F.tagStatus();
  ok(nach.umgesetzt && nach.herkunft === "bestaetigt", "die Bestätigung erzeugt ein manuelles Ergebnis (T10)");
  ok(nach.manuell, "und gilt ab sofort als ausdrückliche Entscheidung (T10)");
  ok(c.F.progress().erledigt === 1, "der Tag zählt in der Umsetzung (T10)");

  /* Der Vorschlag darf nicht wiederkehren und still überschreiben. */
  c.F.autoSync();
  ok(c.F.tagStatus().herkunft === "bestaetigt", "ein späterer Messdatenlauf lässt die Bestätigung unberührt (T26)");

  /* Bewegung: der Auftrag zählt Schritte — dafür gibt es keine Quelle. */
  const mv = box(tag, { focus: auftrag("movement"), trk_daily: [{ date: tag, min: 80 }] });
  mv.F.autoSync();
  ok(Object.keys(mv.F.current().done).length === 0, "Bewegungsminuten erfüllen keinen Schritte-Auftrag automatisch (T8)");
  ok(mv.F.tagStatus().nichtDeckend === "Schritte", "der nicht deckende Teil wird ausdrücklich benannt (T8)");
  /* Der Anhaltspunkt ist das bereits konfigurierte Tagesbewegungsziel des
     Nutzers, kein für Paket 5 erfundener Grenzwert. */
  ok(mv.F.tagStatus().ziel === 25, "ohne eigenen Plan gilt das dokumentierte Standard-Tagesziel 25 min (T8)");
  const mvPlan = box(tag, { focus: auftrag("movement"), trk_plan: { dailyMin: 60 }, trk_daily: [{ date: tag, min: 40 }] });
  ok(mvPlan.F.tagStatus().ziel === 60 && !mvPlan.F.tagStatus().treffer,
    "ein eigenes Tagesbewegungsziel gilt unverändert (60 min, 40 erfasst ⇒ kein Vorschlag) (T8)");
  ok(mv.F.tagStatus().treffer && !box(tag, { focus: auftrag("movement"), trk_daily: [{ date: tag, min: 8 }] }).F.tagStatus().treffer,
    "unterhalb des Tagesziels entsteht kein Vorschlag (T8)");
})();

/* ==================================================================== 5 */
group("5 · Manuelle Entscheidung gewinnt (T24, T25, T26)");
(function () {
  const tag = "2026-07-05";
  /* T25: Messdaten sagen erfüllt, Nutzer sagt nein. */
  const a = box(tag, { focus: auftrag("cardiovascular"), trk_daily: [{ date: tag, min: 90 }] });
  a.F.autoSync();
  ok(a.F.tagStatus().umgesetzt, "Ausgangslage: automatisch erkannt");
  a.F.setDay(tag, "nein", "korrigiert");
  ok(!a.F.tagStatus().umgesetzt, "die manuelle Korrektur setzt den Tag auf nicht umgesetzt (T25)");
  a.F.autoSync(); a.F.autoSync();
  ok(!a.F.tagStatus().umgesetzt && a.F.tagStatus().herkunft === "korrigiert",
    "auch nach zwei weiteren Messdatenläufen bleibt die Korrektur bestehen (T26)");
  ok(a.F.progress().erledigt === 0, "und der Tag zählt nicht als Erfolg (T25)");

  /* T24: Messdaten sagen nicht erfüllt, Nutzer sagt umgesetzt. */
  const b = box(tag, { focus: auftrag("cardiovascular"), trk_daily: [{ date: tag, min: 5 }] });
  b.F.autoSync();
  ok(!b.F.tagStatus().umgesetzt, "Ausgangslage: unter dem Schwellenwert");
  b.F.setDay(tag, "ja", "manuell");
  b.F.autoSync();
  ok(b.F.tagStatus().umgesetzt && b.F.tagStatus().herkunft === "manuell",
    "das manuelle Umgesetzt gewinnt gegen die automatische Bewertung (T24)");

  /* Die bestehende Checkbox bleibt ein sauberer Zweizustand. */
  const c = box(tag, { focus: auftrag("execution") });
  c.F.toggleDay(tag);
  ok(c.F.tagStatus(null, tag).umgesetzt && c.F.tagStatus(null, tag).herkunft === "manuell", "Checkbox an ⇒ manuell umgesetzt");
  c.F.toggleDay(tag);
  ok(c.F.current().done[tag] === undefined, "Checkbox aus ⇒ Eintrag entfernt (unverändertes Verhalten)");

  /* Abwählen einer AUTOMATISCH erkannten Erfüllung ist eine Korrektur. */
  const d = box(tag, { focus: auftrag("cardiovascular"), trk_daily: [{ date: tag, min: 90 }] });
  d.F.autoSync(); d.F.toggleDay(tag);
  ok(d.F.tagStatus().herkunft === "korrigiert" && !d.F.tagStatus().umgesetzt,
    "das Abwählen eines automatischen Tages wird als Korrektur festgehalten (T26)");
  d.F.autoSync();
  ok(!d.F.tagStatus().umgesetzt, "und wird nicht wieder überschrieben (T26)");
})();

/* ==================================================================== 6 */
group("6 · Zukunft, Idempotenz und Reload (T20–T23)");
(function () {
  /* T21: zukünftige Tage werden nie bewertet. */
  const z = box("2026-07-05", { focus: auftrag("cardiovascular"), trk_daily: [{ date: "2026-07-09", min: 120 }] });
  z.F.autoSync();
  ok(!z.F.current().done["2026-07-09"], "ein zukünftiger Tag wird nie automatisch bewertet (T21)");
  ok(z.F.setDay("2026-07-09", "ja", "manuell") && !z.F.current().done["2026-07-09"],
    "auch manuell lässt sich kein Zukunftstag eintragen (T21)");

  /* T20: ein Messwert erfüllt genau einen Tag. */
  const e = box("2026-07-10", { focus: auftrag("cardiovascular"), trk_daily: [{ date: "2026-07-04", min: 200 }] });
  e.F.autoSync();
  ok(Object.keys(e.F.current().done).length === 1 && e.F.current().done["2026-07-04"],
    "ein einzelner Messwert erfüllt genau seinen Tag — nicht mehrere (T20)");

  /* T22/T23: wiederholte Auswertung ist idempotent. */
  const i = box("2026-07-10", {
    focus: auftrag("cardiovascular"),
    trk_daily: [{ date: "2026-07-02", min: 40 }, { date: "2026-07-03", min: 55 }, { date: "2026-07-08", min: 31 }]
  });
  const n1 = i.F.autoSync();
  const snap1 = i.__mem["mm_focus"];
  const n2 = i.F.autoSync();
  const snap2 = i.__mem["mm_focus"];
  ok(n1 === 3, "der erste Lauf erkennt drei Tage");
  ok(n2 === 0, "der zweite Lauf schreibt nichts mehr (T23)");
  ok(snap1 === snap2, "der gespeicherte Zustand ist danach bitgleich (T22/T23)");
  ok(i.F.progress().erledigt === 3, "keine Duplikate nach wiederholtem Laden (T22)");
  for (let k = 0; k < 5; k++) i.F.autoSync();
  ok(i.F.progress().erledigt === 3 && i.__mem["mm_focus"] === snap1, "auch nach fünf Reloads unverändert (T22/T23)");
})();

/* ==================================================================== 7 */
group("7 · Messwertkorrektur und eingefrorene Historie (T27, T28)");
(function () {
  /* T27: während der aktiven Phase reagiert eine rein automatische Bewertung
     auf eine Korrektur der Messdaten. */
  const c = box("2026-07-10", { focus: auftrag("cardiovascular"), trk_daily: [{ date: "2026-07-04", min: 45 }] });
  c.F.autoSync();
  ok(c.F.current().done["2026-07-04"].s === "ja", "Ausgangslage: automatisch erkannt");
  c.__mem["mm_trk_daily"] = JSON.stringify([{ date: "2026-07-04", min: 12 }]);
  c.F.autoSync();
  const e = c.F.current().done["2026-07-04"];
  ok(e && e.s === "offen" && e.q === "auto_revidiert", "die frühere automatische Bewertung wird zurückgenommen (T27)");
  ok(c.F.progress().erledigt === 0, "und zählt nicht mehr als umgesetzt (T27)");
  ok(!/nein/.test(e.s), "sie wird dabei NICHT in ein automatisches Nicht-umgesetzt verwandelt (T13)");
  c.__mem["mm_trk_daily"] = JSON.stringify([{ date: "2026-07-04", min: 45 }]);
  c.F.autoSync();
  ok(c.F.current().done["2026-07-04"].s === "ja", "wird der Wert wieder korrigiert, gilt der Tag wieder (T27)");

  /* T28: eine archivierte Bilanz bleibt eingefroren. */
  const h = box("2026-07-16", {
    focus: auftrag("cardiovascular"),
    trk_daily: [{ date: "2026-07-02", min: 40 }, { date: "2026-07-03", min: 40 }, { date: "2026-07-04", min: 40 }]
  });
  h.F.autoSync();
  ok(h.F.umsetzung().erledigt === 3, "drei erkannte Tage vor dem Archivieren");
  h.F.clear();
  const hist = JSON.parse(h.__mem["mm_focus_history"]);
  ok(hist.length === 1 && hist[0].erledigt === 3, "die Bilanz wandert als Ergebnis in die Historie (T28)");
  ok(hist[0].ausTracking === 3, "samt Herkunftsangabe (T28)");
  ok(hist[0].done === undefined, "die Tagesliste selbst wandert NICHT mit (T28)");
  h.__mem["mm_trk_daily"] = JSON.stringify([]);
  h.F.autoSync();
  const hist2 = JSON.parse(h.__mem["mm_focus_history"]);
  ok(hist2[0].erledigt === 3, "eine spätere Tracker-Änderung verändert die archivierte Bilanz nicht (T28)");
  ok(h.__mem["mm_focus_history"] === JSON.stringify(hist), "die Historie ist byte-gleich geblieben (T28)");
})();

/* ==================================================================== 8 */
group("8 · Abwärtskompatibilität und Persistenz (T29–T32, T52)");
(function () {
  /* T29/T30: Alt-Auftrag mit `done: {tag: true}` bleibt vollständig lesbar. */
  const alt = box("2026-07-10", {
    focus: auftrag("execution", { done: { "2026-07-02": true, "2026-07-03": true, "2026-07-04": true } })
  });
  ok(alt.F.progress().erledigt === 3, "Alt-Einträge (true) zählen unverändert (T29)");
  ok(alt.F.tagStatus(null, "2026-07-02").manuell, "und gelten als manuell erfasst (T29)");
  ok(alt.F.tagStatus(null, "2026-07-02").herkunft === "manuell", "ohne Herkunftsdaten ⇒ manuell (T29)");
  alt.F.autoSync();
  ok(alt.__mem["mm_focus"].indexOf('"2026-07-02":true') > 0, "ein Alt-Eintrag wird nicht umgeschrieben (T30)");

  const histAlt = box("2026-07-10", {
    focus_history: [{ domain: "sleep", title: "Alt", started: "2026-05-01", until: "2026-05-29", erledigt: 18, ziel: 20, geschafft: false }]
  });
  ok(histAlt.F.history()[0].erledigt === 18, "Alt-Historie ohne neue Felder bleibt lesbar (T30)");
  ok(histAlt.F.wirkungOffeneListe().length === 0, "und taucht nicht nachträglich als offener Vorgang auf (T30)");

  /* T31: echte Mutationen tragen updated_at. */
  const u = box("2026-07-05", { focus: auftrag("execution") });
  ok(u.F.current().updated_at === undefined, "vor der ersten Mutation kein Zeitstempel");
  u.F.setDay("2026-07-05", "ja", "manuell");
  ok(!!u.F.current().updated_at, "eine echte Mutation setzt updated_at (T31)");
  const stamp = u.F.current().updated_at;
  u.F.autoSync();
  ok(u.F.current().updated_at === stamp, "ein Lauf ohne Änderung setzt updated_at NICHT neu (T31)");

  /* T32: der synchronisierte Punktespeicher behält die neuere Entscheidung.
     mm_focus selbst ist bewusst gerätelokal — dort gibt es keinen Merge. */
  ok(!/registerStateDomain/.test(FOCUS), "mm_focus bleibt gerätelokal, ohne neue Sync-Domäne (T32/T52)");
  ok(/registerStateDomain\("optpoints"/.test(read("js/points.js")), "der Merge lebt unverändert bei den Optimierungspunkten (T32)");
  const eintrag = u.F.current().done["2026-07-05"];
  ok(!!eintrag.at, "jede Tagesentscheidung trägt ihren eigenen Zeitstempel (T32)");

  /* T52: keine neuen globalen Datenkeys. */
  const keys = FOCUS.match(/S\.(get|set)\("([a-z_0-9]+)"/g) || [];
  const eigene = keys.map((k) => k.replace(/.*"([a-z_0-9]+)".*/, "$1"));
  const erlaubt = ["focus", "focus_history", "trk_daily", "trk_cardio", "trk_sessions", "trk_body",
                   "trk_sleep", "os_metrics", "os_workout_logs", "os_nutrition_log", "os_nutrition_plan", "goals"];
  eigene.forEach(function (k) { ok(erlaubt.indexOf(k) >= 0, "focus.js nutzt nur bestehende Keys: " + k + " (T52)"); });
  ok(!/S\.set\("(?!focus")/.test(FOCUS), "geschrieben wird ausschließlich in mm_focus (§2)");
})();

/* ==================================================================== 9 */
group("9 · Lokale Tageszuordnung (T33–T40)");
(function () {
  /* T39/T33: ein ISO-Zeitstempel am Abend gehört zum LOKALEN Tag. */
  const abends = box("2026-07-05", {
    focus: auftrag("cardiovascular"),
    trk_sessions: [{ date: "2026-07-05T23:30:00", duration: 45 }]
  });
  abends.F.autoSync();
  ok(!!abends.F.current().done["2026-07-05"], "eine Einheit um 23:30 Ortszeit zählt zum selben Tag (T33/T38)");
  ok(!abends.F.current().done["2026-07-06"], "und nicht zum Folgetag (T33)");

  const frueh = box("2026-07-05", {
    focus: auftrag("cardiovascular"),
    trk_sessions: [{ date: "2026-07-05T00:20:00", duration: 45 }]
  });
  frueh.F.autoSync();
  ok(!!frueh.F.current().done["2026-07-05"], "eine Einheit um 00:20 Ortszeit zählt zum selben Tag (T33)");

  /* T34/T35: Monats- und Jahreswechsel. */
  const monat = box("2026-08-02", {
    focus: auftrag("cardiovascular", { started: "2026-07-28", until: "2026-08-11", wirkungBis: "2026-08-11" }),
    trk_daily: [{ date: "2026-07-31", min: 40 }, { date: "2026-08-01", min: 40 }]
  });
  monat.F.autoSync();
  ok(monat.F.progress().erledigt === 2, "der Monatswechsel 31.07. → 01.08. wird korrekt durchlaufen (T34)");
  const jahr = box("2027-01-02", {
    focus: auftrag("cardiovascular", { started: "2026-12-28", until: "2027-01-11", wirkungBis: "2027-01-11" }),
    trk_daily: [{ date: "2026-12-31", min: 40 }, { date: "2027-01-01", min: 40 }]
  });
  jahr.F.autoSync();
  ok(jahr.F.progress().erledigt === 2, "der Jahreswechsel 31.12. → 01.01. wird korrekt durchlaufen (T35)");

  /* T36: Sommer-/Winterzeit — 25.10.2026 ist der Umstellungstag in der EU. */
  const dst = box("2026-10-27", {
    focus: auftrag("cardiovascular", { started: "2026-10-23", until: "2026-11-06", wirkungBis: "2026-11-06" }),
    trk_daily: [{ date: "2026-10-24", min: 40 }, { date: "2026-10-25", min: 40 }, { date: "2026-10-26", min: 40 }]
  });
  dst.F.autoSync();
  ok(dst.F.progress().erledigt === 3, "über die Zeitumstellung hinweg wird kein Tag übersprungen oder doppelt bewertet (T36)");
  ok(!!dst.F.current().done["2026-10-25"], "der Umstellungstag selbst wird korrekt bewertet (T36)");
  ok(!/86400000/.test(FOCUS.split("MESSDATENBRÜCKE")[1].split("LESEN */")[0]),
    "die Messdatenbrücke rechnet in Kalendertagen, nicht in Millisekunden (T36)");

  /* T37: Schlaf folgt der bestehenden Konvention („Nacht auf" = Aufwachtag). */
  const sl = box("2026-07-05", { focus: auftrag("sleep"), trk_sleep: [{ date: "2026-07-05", dur: 7.5 }] });
  const ts = sl.F.tagStatus();
  ok(ts.treffer && ts.quelle === "Schlaf-Log im Tracker", "der Schlafeintrag wird dem Aufwachtag zugeordnet (T37)");
  ok(/Nacht auf/.test(read("js/tracker.js")), "die bestehende Konvention im Tracker ist unverändert (T37)");
  ok(/Aufwachtag/.test(FOCUS), "und in der Brücke ausdrücklich dokumentiert (T37)");

  /* T40: Ernährung wird dem lokalen Tag des Eintrags zugeordnet. */
  const nu = box("2026-07-05", {
    focus: auftrag("nutrition"), goals: { p: 100 },
    "diary_2026-07-04": { fruehstueck: [{ p: 200 }], mittag: [], abend: [], snacks: [] },
    "diary_2026-07-05": { fruehstueck: [{ p: 20 }], mittag: [], abend: [], snacks: [] }
  });
  nu.F.autoSync();
  ok(!!nu.F.current().done["2026-07-04"], "der Tagebucheintrag vom 04.07. erfüllt den 04.07. (T40)");
  ok(!nu.F.current().done["2026-07-05"], "und nicht den 05.07. (T40)");
})();

/* =================================================================== 10 */
group("10 · Ergebnisprüfung: Umsetzung ≠ Wirkung (T41–T43)");
(function () {
  const c = box("2026-07-16", {
    focus: auftrag("cardiovascular", { target: 10 }),
    trk_daily: [{ date: "2026-07-02", min: 40 }, { date: "2026-07-03", min: 40 },
                { date: "2026-07-04", min: 40 }, { date: "2026-07-06", min: 40 }]
  });
  c.F.autoSync();
  c.F.setDay("2026-07-07", "ja", "manuell");
  c.F.setDay("2026-07-08", "ja", "manuell");
  const u = c.F.umsetzung();
  ok(u.erledigt === 6, "manuelle und automatisch erkannte Tage zählen gemeinsam (T41)");
  ok(u.ausTracking === 4, "die Herkunft wird zusätzlich ausgewiesen: 4 aus Tracking (T41)");
  ok(u.tage === 14 && u.ziel === 10, "Gesamttage und Ziel bleiben unverändert (T42)");
  ok(u.zielErreicht === false, "6 von 14 bei Ziel 10 ⇒ Ziel nicht erreicht (T42)");
  ok(u.quote === 43, "die Umsetzungsquote rechnet über die vergangenen Tage (T42)");
  ok(u.verdict === "teilweise", "das Umsetzungsurteil bleibt die bestehende Regel (T42)");
  ok(u.ausTracking !== u.quote, "es gibt KEINE zweite Quote für automatische Tage (T41)");

  /* T43: Umsetzung erzeugt niemals ein Wirkungsurteil. */
  const w = c.F.wirkung();
  ok(w.verdict === "offen" && !w.abgeschlossen, "die Wirkung bleibt trotz erkannter Umsetzung offen (T43)");
  ok(!/wirkung/i.test(FOCUS.split("function autoSync")[1].split("function current")[0]),
    "die automatische Auswertung fasst die Wirkungsprüfung nicht an (T43)");
  const brücke = FOCUS.split("MESSDATENBRÜCKE")[1].split("/* ----------------------------------------------------------------- LESEN")[0];
  ok(!/setWirkung|wirksam|verursacht|geholfen/i.test(brücke), "kein Messwert behauptet eine Wirkung (T43/§15)");
})();

/* =================================================================== 11 */
group("11 · Keine Nebenwirkungen auf Punkte, Standards, Score (T44–T50)");
(function () {
  const tag = "2026-07-05";
  const c = box(tag, { focus: auftrag("cardiovascular"), trk_daily: [{ date: tag, min: 90 }] });
  c.F.autoSync();
  /* T44/T45: kein Punkt, kein Standard allein aus Messdaten. */
  ok(c.__mem["mm_opt_points"] === undefined, "Messdaten erzeugen keinen Optimierungspunkt (T44)");
  ok(c.window.MM.points.list().length === 0, "die Punktliste bleibt leer (T44)");
  const brücke = FOCUS.split("MESSDATENBRÜCKE")[1];
  ok(!/MM\.points|opt_points|standard/i.test(brücke.split("LESEN */")[0]),
    "die Brücke kennt weder Punkte noch Standards (T44/T45)");

  /* Ein vorhandener Punkt bleibt in Titel, Bereich und Status unverändert. */
  const punkte = [{ id: "p1", area: "cardiovascular", title: "30 Minuten gehen", status: "in_umsetzung",
                    source_type: "focus", source_id: "cardiovascular:2026-07-01", updated_at: "2026-07-01T10:00:00.000Z" }];
  const c2 = box(tag, { focus: auftrag("cardiovascular"), trk_daily: [{ date: tag, min: 90 }], opt_points: punkte });
  const vorher = c2.__mem["mm_opt_points"];
  c2.F.autoSync();
  ok(c2.__mem["mm_opt_points"] === vorher, "ein vorhandener Punkt wird durch den Messdatenlauf nicht verändert (T44)");
  ok(c2.window.MM.points.list()[0].title === "30 Minuten gehen", "Titel und Bereich bleiben unverändert (T44)");
  ok(!c2.window.MM.points.list()[0].standard, "es entsteht kein persönlicher Standard (T45)");

  /* T46/T47/T48/T49: Score, Bereichswerte, Telemetrie, Experimente unberührt. */
  ok(!/areaValue|Bereichswert|check_result|check_history/.test(FOCUS), "die Brücke fasst Score und Bereichswerte nicht an (T46/T47)");
  ok(!/MM\.track|telOnce|score-telemetry/.test(brücke.split("LESEN */")[0]), "keine neue Telemetrie (T48)");
  ok(!/intel_experiments/.test(FOCUS), "Premium-Experimente bleiben unberührt (T49)");
  global.window = {};
  delete require.cache[require.resolve(path.join(ROOT, "js/check-data.js"))];
  require(path.join(ROOT, "js/check-data.js"));
  const C = global.window.MM_CHECK;
  const summe = Object.keys(C.domainMeta).reduce((a, k) => a + (C.domainMeta[k].w || 0), 0);
  ok(summe === 145, "Score-Gewichte eingefroren (Summe 145) (T47)");
  ok(C.areaValueLabel(56) === "5,6/10", "die Bereichswert-Darstellung aus Paket 4 ist unverändert (T46)");

  /* T50: Paket-2- und Paket-3-Flüsse bleiben kompatibel. */
  ok(C.FOCUS_DAUERN.join(",") === "7,14,28", "die Dauern aus Paket 2 sind unverändert (T50)");
  ok(C.focusTarget(7, 20) === 5 && C.focusTarget(14, 20) === 10, "die Ziel-Regel aus Paket 2 rechnet unverändert (T50)");
  const c3 = box("2026-07-16", { focus: auftrag("cardiovascular") });
  c3.F.setWirkung("erkennbar");
  ok(c3.F.wirkung().abgeschlossen, "die Wirkungsprüfung aus Paket 2 funktioniert unverändert (T50)");
  const c4 = box("2026-07-16", { focus: auftrag("cardiovascular") });
  c4.F.setWirkung("offen");
  ok(c4.F.wirkungOffeneListe().length === 1, "die vertagte Wirkungsprüfung bleibt auffindbar (T50)");
  ok(typeof c4.window.MM.points.upsert === "function" && typeof c4.window.MM.points.standardEmpfohlen === "function",
    "die Optimierungspunkte-API aus Paket 3 ist unverändert (T50)");
})();

/* =================================================================== 12 */
group("12 · Store-Konsistenz und sichtbare Sprache (T51, §5, §12)");
(function () {
  /* T51: dinner.js ist die reale freie Ernährungsquelle und nutzt jetzt die
     kanonische Abstraktion — bei identischen Schlüsseln. */
  ok(/mm_diary_/.test(DINNER) && /MM\.store/.test(DINNER), "dinner.js schreibt über MM.store (T51)");
  ok(/k\.slice\(3\)/.test(DINNER), "das mm_-Präfix wird abgeschnitten, der Schlüssel bleibt identisch (T51)");
  ok(!/localStorage\.setItem/.test(DINNER.split("var LS = {")[1].split("};")[0].replace(/set: function[\s\S]*?\n/, "")),
    "der JSON-Schreibweg geht nicht mehr direkt an localStorage vorbei (T51)");
  ok(/diary_/.test(FOCUS), "und genau dieser Speicher ist die freie Proteinquelle (T51)");
  ok(!/mm_mm_/.test(DINNER), "kein doppeltes Präfix (T51)");

  /* §5: keine technischen Herkunftsbezeichner in der Oberfläche. */
  ok(!/auto_true|source_match|inferred_state/.test(TRACKER), "keine technischen Herkunftsnamen im Tracker (§5)");
  ["Automatisch aus Messdaten erkannt", "Als umgesetzt bestätigen", "Nicht umgesetzt",
   "Später entscheiden", "Manuell korrigiert", "Manuell bestätigt"].forEach(function (s) {
    ok(TRACKER.indexOf(s) > 0, "sichtbare Kennzeichnung vorhanden: " + s + " (§5)");
  });
  ok(/Deine Messdaten sprechen dafür/.test(TRACKER), "der Vorschlagstext ist die vorgegebene Formulierung (§12)");
  /* Ein Wert UNTER dem Ziel darf nie als „spricht dafür" gelesen werden —
     sonst wäre der Vorschlag selbst eine unbelegte Behauptung. */
  const bBlock = TRACKER.split("/* Stufe B — Vorschlag")[1].split("};")[0];
  ok(/if \(!t\.treffer\) \{/.test(bBlock), "vorgeschlagen wird nur bei getroffenem Kriterium (§4/§5)");
  ok(bBlock.indexOf("das reicht als Beleg nicht") < bBlock.indexOf("sprechen dafür"),
    "unter dem Ziel steht ehrlich, dass der Beleg nicht reicht (§5)");
  ok(/Quelle: /.test(TRACKER), "die verwendete Quelle wird sichtbar benannt (§5)");
  ok(/Ziel: mindestens/.test(TRACKER), "der Schwellenwert wird sichtbar benannt (§5)");
  ok(/gilt nach einer Korrektur deiner Messdaten nicht mehr/.test(TRACKER),
    "eine zurückgenommene automatische Bewertung wird benannt (§8)");
  ok(/davon /.test(TRACKER) && /aus Tracking erkannt/.test(TRACKER), "die Herkunft ergänzt die Bilanz, ersetzt sie nicht (§13)");

  /* §12: keine neue Seite, keine neue Navigation. */
  ok(!/window\.location|new Route|#messdaten/.test(TRACKER.split("heuteBlock")[1] || ""), "keine neue Navigation (§12)");
  ok(/trk-focus-auto/.test(read("css/style.css")), "die Darstellung nutzt die bestehende Karte (§12)");
  /* Ohne Kommentare geprüft — ein Kommentar darf benennen, was der Code
     gerade NICHT tut. */
  const autoCss = (read("css/style.css").split("TAGESSTATUS AUS MESSDATEN")[1] || "")
    .split("/* ----")[0].replace(/^[\s\S]*?\*\//, "");
  ok(autoCss.length > 200, "die Bereichsregeln sind vorhanden (§12)");
  ok(!/gauge|ampel|traffic|conic|gradient/i.test(autoCss), "keine neue Ampel, kein neues Designsystem (§12)");
  ok(!/#[0-9a-f]{6}/i.test(autoCss), "keine hart kodierten Farben — nur bestehende Tokens (§12)");
  ok(/var\(--line\)|var\(--card-2\)/.test(autoCss), "dieselben Tokens wie die bestehende Checkbox-Zeile (§12)");
  /* §20: keine unlesbar kleine Typografie. Die Herkunftszeile trägt ganze
     Sätze — Mikrotypografie unter 0.75rem wäre dort ein echter Mangel. */
  const srcRegel = (autoCss.match(/\.ta-src\s*\{[^}]*\}/) || [""])[0];
  const groesse = parseFloat((srcRegel.match(/font-size:\s*([\d.]+)rem/) || [0, 0])[1]);
  ok(groesse >= 0.75, "die Herkunftszeile ist lesbar gesetzt (" + groesse + "rem) (§20)");
  ok(!/text-transform:\s*uppercase/.test(srcRegel), "ganze Sätze stehen nicht in Versalien (§20)");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
