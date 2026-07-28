/* ==========================================================================
   MALEMETRIX P2 — FOKUSPHASE & ERGEBNISPRÜFUNG für „Ein Auftrag"
   Friert ein: Dauern 7/14/28, Ziel-Regel (Toleranzprinzip), Abwärts-
   kompatibilität (Alt-Aufträge = 28 Tage, Historie unverändert lesbar),
   Terminlogik (Start/Ende/Resttage, Kalendertag-Arithmetik), getrennte
   Umsetzungs- und Wirkungsprüfung, Trennung Fokusphase ≠ vollständiger
   Score, unveränderte Score-Engine/Telemetrie/Persistenzformate.
   Ausführen:  node tools-dev/tests/fokusphase.test.js
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

/* Sandbox wie focus.test.js — echtes check-data.js + focus.js, eigener Store. */
function sandbox() {
  const mem = {};
  const ctx = {
    localStorage: {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; }
    },
    console: { log() {}, error() {} },
    Date, Math, JSON, Object, Array, String, Number, isNaN, parseInt, parseFloat
  };
  ctx.window = ctx;
  ctx.__mem = mem;
  vm.createContext(ctx);
  vm.runInContext(read("js/check-data.js"), ctx);
  vm.runInContext(read("js/focus.js"), ctx);
  return ctx;
}
/* Sandbox mit FESTEM Heute-Datum — für Tagesgrenzen und Fälligkeiten. */
function sandboxAt(today, store) {
  const mem = Object.assign({}, store || {});
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(today + "T12:00:00"); else super(...a); }
    static now() { return new RealDate(today + "T12:00:00").getTime(); }
  }
  const ctx = {
    localStorage: {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; }
    },
    console: { log() {}, error() {} },
    Date: FakeDate, Math, JSON, Object, Array, String, Number, isNaN, parseInt, parseFloat
  };
  ctx.window = ctx; ctx.__mem = mem;
  vm.createContext(ctx);
  vm.runInContext(read("js/focus.js"), ctx);
  return ctx;
}
/* 7-Tage-Auftrag: Start 01.07., letzter Umsetzungstag 07.07., Prüfung 08.07. */
const F7 = {
  v: 1, domain: "sleep", title: "Zur selben Zeit ins Bett", daily: "d",
  target: 5, days: 7, started: "2026-07-01", until: "2026-07-08",
  wirkfrist: 14, wirkungBis: "2026-07-15",
  done: { "2026-07-01": true, "2026-07-02": true, "2026-07-03": true, "2026-07-05": true, "2026-07-06": true }
};
const store7 = () => ({ mm_focus: JSON.stringify(F7) });

const R = { total: 55, bottleneck: { domain: "sleep", name: "Schlaf" } };
const ymdLocal = (d) => d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);

/* ==================================================================== 1 */
group("1 · Dauern 7/14/28: Start, Ende, Ziel (Tests 1–3, 9–11)");
(function () {
  const ctx = sandbox(); const C = ctx.window.MM_CHECK;
  [7, 14, 28].forEach((d) => {
    const f = C.focusFor(R, d);
    ok(f.days === d, d + " Tage: Dauer wird übernommen");
    const t = new Date();
    ok(f.started === ymdLocal(t), d + " Tage: Startdatum ist heute (lokal)");
    ok(f.until === ymdLocal(new Date(t.getFullYear(), t.getMonth(), t.getDate() + d)), d + " Tage: Enddatum = Start + " + d + " Kalendertage");
    ok(f.target >= 1 && f.target < f.days, d + " Tage: Ziel " + f.target + "/" + d + " — nie Perfektion");
    ctx.MM.focus.start(JSON.parse(JSON.stringify(f)));
    const p = ctx.MM.focus.progress();
    ok(p.offen === d, d + " Tage: verbleibende Tage am Starttag = " + d);
    ok(p.tage === d, d + " Tage: progress() meldet die gewählte Dauer");
  });
  /* Ziel-Regel (Toleranzprinzip) explizit: 20/28 → 5/7 → 10/14; 24/28 → 6/7 → 12/14. */
  ok(C.focusTarget(7, 20) === 5 && C.focusTarget(14, 20) === 10, "Ziel-Regel: 20/28 wird zu 5/7 und 10/14 (5 von 7 Tagen pro Woche)");
  ok(C.focusTarget(7, 24) === 6 && C.focusTarget(14, 24) === 12, "Ziel-Regel: 24/28 wird zu 6/7 und 12/14");
  ok(C.focusTarget(7, 28) === 6, "Ziel-Regel: Obergrenze d−1 — nie d von d verlangt");
  const f28 = C.focusFor(R, 28);
  ok(f28.target === C.FOCUS.sleep.target, "28 Tage: bestehendes Ziel bleibt EXAKT unverändert");
})();

/* ==================================================================== 2 */
group("2 · Empfehlung: Nutzer sieht sie, ungültige Werte fallen darauf zurück");
(function () {
  const ctx = sandbox(); const C = ctx.window.MM_CHECK;
  const f = C.focusFor(R);
  ok(f.days === (C.FOCUS.sleep.dauer || 28), "ohne Auswahl gilt die empfohlene Dauer des Auftrags");
  ok(f.empfohlen === (C.FOCUS.sleep.dauer || 28), "die Empfehlung steht am Auftrag (fürs UI sichtbar)");
  ok(C.focusFor(R, 10).days === f.empfohlen, "unzulässige Dauer (10) fällt auf die Empfehlung zurück");
  Object.keys(C.FOCUS).forEach((d) => {
    const e = C.FOCUS[d];
    ok([7, 14, 28].indexOf(e.dauer) >= 0 && e.wirkfrist >= e.dauer,
      d + ": empfohlene Dauer " + e.dauer + " zulässig, Wirkfrist " + e.wirkfrist + " ≥ Dauer");
  });
  const chk = read("js/check.js");
  ok(/\[7, 14, 28\]\.map/.test(chk) && /data-fdays/.test(chk), "UI bietet genau die drei Dauern an");
  ok(/empfohlen/.test(chk), "die empfohlene Dauer ist im UI gekennzeichnet");
})();

/* ==================================================================== 3 */
group("3 · Abwärtskompatibilität (Tests 4–8, 25)");
(function () {
  const ctx = sandbox();
  /* Alt-Auftrag OHNE days/target/until — wie ihn frühe Versionen speicherten. */
  ctx.__mem["mm_focus"] = JSON.stringify({ v: 1, domain: "sleep", title: "Alt", daily: "x", started: "2026-07-01", done: { "2026-07-02": true } });
  const f = ctx.MM.focus.current();
  ok(f.days === 28, "Alt-Auftrag ohne Dauer gilt weiter als 28 Tage");
  ok(f.until === "2026-07-29", "fehlendes Enddatum wird aus Start + 28 abgeleitet");
  ok(JSON.parse(ctx.__mem["mm_focus"]).days === undefined, "der gespeicherte Alt-Datensatz wird dabei NICHT umgeschrieben");

  /* Aktiver 28-Tage-Auftrag bleibt byte-identisch, solange niemand abhakt. */
  const ctx2 = sandbox();
  const raw = JSON.stringify({ v: 1, domain: "sleep", title: "Aktiv", daily: "x", target: 20, days: 28, started: "2026-07-20", until: "2026-08-17", done: {} });
  ctx2.__mem["mm_focus"] = raw;
  ctx2.MM.focus.current(); ctx2.MM.focus.progress();
  ok(ctx2.__mem["mm_focus"] === raw, "aktiver 28-Tage-Auftrag bleibt beim Lesen unverändert");

  /* Historische Alt-Einträge (ohne days/wirkung) bleiben lesbar. */
  const ctx3 = sandbox();
  ctx3.__mem["mm_focus_history"] = JSON.stringify([{ domain: "sleep", title: "Historisch", started: "2026-05-01", until: "2026-05-29", erledigt: 21, ziel: 20, geschafft: true, scoreAtStart: 50 }]);
  const o = ctx3.MM.focus.lastOutcome();
  ok(o && o.title === "Historisch" && o.days === 28 && o.wirkung === null, "historischer 28-Tage-Eintrag bleibt lesbar (Dauer-Fallback 28, Wirkung null)");

  /* Gewählte Dauer übersteht den Reload (frische Engine, gleicher Store). */
  const ctx4 = sandbox();
  ctx4.MM.focus.start(ctx4.window.MM_CHECK.focusFor(R, 7));
  const persisted = ctx4.__mem["mm_focus"];
  const ctx5 = sandbox();
  ctx5.__mem["mm_focus"] = persisted;
  ok(ctx5.MM.focus.current().days === 7 && ctx5.MM.focus.progress().tage === 7, "7-Tage-Wahl bleibt nach Reload erhalten");

  /* Ein laufender Auftrag wird nie still überschrieben: start() archiviert. */
  const ctx6 = sandbox(); const C6 = ctx6.window.MM_CHECK;
  ctx6.MM.focus.start(C6.focusFor(R, 14));
  ctx6.MM.focus.toggleDay();
  ctx6.MM.focus.start(C6.focusFor(R, 7));   // „erneutes Onboarding"
  const h = ctx6.MM.focus.history();
  ok(h.length === 1 && h[0].days === 14 && h[0].erledigt === 1, "erneuter Start archiviert den laufenden Auftrag statt ihn zu überschreiben");
  ok(ctx6.MM.focus.current().days === 7, "der neue Auftrag trägt die neue Dauer");
})();

/* ==================================================================== 4 */
group("4 · Terminlogik: Prüfungen, Trennung vom Score, Kalender (Tests 12–16)");
(function () {
  const ctx = sandbox(); const C = ctx.window.MM_CHECK;
  /* Umsetzungsprüfung fällig am Phasenende. */
  ctx.__mem["mm_focus"] = JSON.stringify(Object.assign(C.focusFor(R, 7), { started: "2026-07-01", until: "2026-07-08", wirkungBis: "2026-07-15" }));
  const u = ctx.MM.focus.umsetzung();
  ok(u.faelligAm === "2026-07-08" && u.faellig === true, "Umsetzungsprüfung liegt am Ende der Fokusphase und ist nach Ablauf fällig");
  const w = ctx.MM.focus.wirkung();
  ok(w.faelligAm === "2026-07-15" && w.spaeterAlsUmsetzung === true, "Wirkungsprüfung darf später liegen als die Umsetzungsprüfung");
  ok(w.verdict === "offen", "ohne erfasstes Urteil bleibt die Wirkung ehrlich offen");

  /* Training: Umsetzung nach 14 Tagen, Wirkung sinnvoll erst nach 28. */
  const ft = C.focusFor({ total: 50, bottleneck: { domain: "training", name: "Training" } }, 14);
  ok(ft.days === 14 && ft.wirkfrist === 28 && ft.wirkungBis > ft.until, "kurze Fokusphase + langsame Wirkung ⇒ Wirkungsprüfung terminiert später");
  /* Wirkfrist nie vor Phasenende. */
  const f28 = C.focusFor({ total: 50, bottleneck: { domain: "training", name: "Training" } }, 28);
  ok(f28.wirkungBis === f28.until, "Wirkfrist liegt nie vor dem Ende der Fokusphase");

  /* Fokusphase ≠ vollständiger Score. */
  const chk = read("js/check.js");
  ok(/löst nur die Umsetzungsprüfung/.test(chk) && /nie automatisch einen neuen Score/.test(chk), "Code dokumentiert: Phasenende löst keinen Score aus");
  ok(/vollständige[rn]? Score.{0,40}unabhängig/i.test(chk), "UI sagt ausdrücklich: der vollständige Score bleibt unabhängig");
  const trk = read("js/tracker.js");
  ok(/Optional: zweiten Score machen/.test(trk), "der zweite Score ist nach der Fokusphase eine Option, kein Zwang");

  /* Kalender/ICS folgt der gewählten Dauer + trennt die Termine. */
  ok(/Umsetzungsprüfung: Auftrag bilanzieren/.test(chk) && /MaleMetrix — Wirkungsprüfung/.test(chk), "ICS unterscheidet Umsetzungs- und Wirkungsprüfung");
  ok(/parseYmd2\(cur\.until\)/.test(chk), "ICS-Termin kommt aus dem tatsächlichen Phasenende, nicht aus fixen 28 Tagen");
  ok(!/Date\.now\(\) \+ 28 \* 86400000/.test(chk), "keine Millisekunden-28-Tage-Rechnung mehr im Auftragsfluss (Off-by-one an Zeitgrenzen)");

  /* Kalendertag-Arithmetik: Monatswechsel ohne Off-by-one. */
  ok(ctx.MM.focus.addDays("2026-01-31", 7) === "2026-02-07", "addDays: Monatswechsel korrekt");
  ok(ctx.MM.focus.addDays("2026-03-28", 7) === "2026-04-04", "addDays: über die Zeitumstellung hinweg exakt 7 Kalendertage");
})();

/* ==================================================================== 5 */
group("5 · Umsetzungsprüfung: Quote, fehlende Einträge (Test 17)");
(function () {
  const ctx = sandbox(); const C = ctx.window.MM_CHECK;
  const f = Object.assign(C.focusFor(R, 14), { started: "2026-07-01", until: "2026-07-15", done: {} });
  for (let i = 1; i <= 9; i++) f.done["2026-07-" + ("0" + i).slice(-2)] = true;
  ctx.__mem["mm_focus"] = JSON.stringify(f);
  const u = ctx.MM.focus.umsetzung();
  ok(u.erledigt === 9 && u.ziel === 10, "9 von 10 erfasst");
  ok(u.verdict === "teilweise", "knapp unter dem Ziel ⇒ teilweise (nicht ‚gescheitert')");
  ok(u.ohneEintrag >= 5, "Tage ohne Häkchen werden gezählt — sie gelten NIE als umgesetzt");
  const trk = read("js/tracker.js");
  ok(/nicht erfasst oder nicht umgesetzt/.test(trk), "UI benennt fehlende Einträge ehrlich (weder Erfolg noch bewusstes Scheitern)");
  /* Urteilsschwellen der dokumentierten Regel. */
  const mk = (n) => { const g = {}; for (let i = 1; i <= n; i++) g["2026-07-" + ("0" + i).slice(-2)] = true; return g; };
  const cases = [[10, "ausreichend"], [5, "teilweise"], [4, "nicht_ausreichend"]];
  cases.forEach(([n, v]) => {
    ctx.__mem["mm_focus"] = JSON.stringify(Object.assign({}, f, { done: mk(n) }));
    ok(ctx.MM.focus.umsetzung().verdict === v, n + "/10 Tage ⇒ " + v + " (Regel: Ziel · halbes Ziel)");
  });
})();

/* ==================================================================== 6 */
group("6 · Wirkungsprüfung getrennt: die vier Ergebnisfälle (Tests 18–22)");
(function () {
  const ctx = sandbox(); const C = ctx.window.MM_CHECK;
  const base = () => Object.assign(C.focusFor(R, 14), { started: "2026-06-01", until: "2026-06-15", wirkungBis: "2026-06-15", done: {} });
  const mk = (n) => { const g = {}; for (let i = 1; i <= n; i++) g["2026-06-" + ("0" + i).slice(-2)] = true; return g; };

  /* A: ausreichend umgesetzt + Wirkung erkennbar. */
  ctx.__mem["mm_focus"] = JSON.stringify(Object.assign(base(), { done: mk(11) }));
  ok(ctx.MM.focus.umsetzung().verdict === "ausreichend", "A: Umsetzung ausreichend");
  ok(ctx.MM.focus.setWirkung("erkennbar") === true, "A: Wirkung ‚erkennbar' lässt sich erfassen");
  ok(ctx.MM.focus.wirkung().verdict === "erkennbar" && ctx.MM.focus.wirkung().belastbar === true, "A: Urteil gespeichert und belastbar");

  /* B: ausreichend umgesetzt + keine Wirkung — bleibt getrennt bewertet. */
  ctx.__mem["mm_focus"] = JSON.stringify(Object.assign(base(), { done: mk(11) }));
  ctx.MM.focus.setWirkung("nicht_erkennbar");
  const wB = ctx.MM.focus.wirkung(); const uB = ctx.MM.focus.umsetzung();
  ok(uB.verdict === "ausreichend" && wB.verdict === "nicht_erkennbar", "B: gute Umsetzung + keine Wirkung sind gleichzeitig möglich");

  /* C: nicht ausreichend umgesetzt ⇒ Wirkung nicht belastbar. */
  ctx.__mem["mm_focus"] = JSON.stringify(Object.assign(base(), { done: mk(3) }));
  const uC = ctx.MM.focus.umsetzung(); const wC = ctx.MM.focus.wirkung();
  ok(uC.verdict === "nicht_ausreichend" && wC.belastbar === false, "C: schwache Umsetzung ⇒ Wirkung nicht sicher beurteilbar");
  ok(wC.verdict === "offen", "C: ohne Urteil bleibt die Wirkung offen — kein automatisches Scheitern");

  /* D: teilweise umgesetzt + Wirkung unklar. */
  ctx.__mem["mm_focus"] = JSON.stringify(Object.assign(base(), { done: mk(6) }));
  ctx.MM.focus.setWirkung("unklar");
  ok(ctx.MM.focus.umsetzung().verdict === "teilweise" && ctx.MM.focus.wirkung().verdict === "unklar", "D: teilweise + Datenlage unklar wird sauber abgebildet");

  /* Urteil wandert additiv in die Historie. */
  ctx.MM.focus.clear();
  const h = ctx.MM.focus.history();
  ok(h.length && h[h.length - 1].wirkung && h[h.length - 1].wirkung.verdict === "unklar", "Wirkungs-Urteil steht additiv im Historien-Eintrag");
  ok(ctx.MM.focus.setWirkung("quatsch") === false, "unbekannte Urteile werden abgelehnt");

  /* Keine Übertreibungs-Sprache im Auftragsfluss. */
  const texte = read("js/check.js") + read("js/tracker.js") + read("js/focus.js");
  ok(!/garantiert wirksam|kausal bestätigt|bewiesen[e]?\b/i.test(texte), "keine ‚bewiesen/garantiert/kausal'-Formulierungen im Auftragsfluss");
})();

/* ==================================================================== 7 */
group("7 · Engine, Telemetrie, Persistenz unangetastet (Tests 23–25)");
(function () {
  const ctx = sandbox(); const C = ctx.window.MM_CHECK;
  /* Score-Formeln/Gewichte: Domain-Gewichte und Aggregation unverändert. */
  ok(typeof C.evaluate === "function" && C.domainMeta && Object.keys(C.domainMeta).length >= 12, "Score-Engine vorhanden und unangetastet ladbar");
  const summe = Object.keys(C.domainMeta).reduce((a, k) => a + (C.domainMeta[k].w || 0), 0);
  ok(summe === 145 && Object.keys(C.domainMeta).length === 15, "Domain-Gewichte eingefroren: Summe 145 über 15 Domains (keine Formel-/Gewichtsänderung)");
  const ev = C.evaluate({});
  ok(ev && ev.primaryBottleneck && ev.confidence, "C.evaluate({}) liefert weiter ein vollständiges Ergebnis");
  /* Telemetrie-Datei unberührt (keine neuen Enums). */
  const tel = read("js/score-telemetry.js");
  ok(!/fokusphase|wirkungspruefung|umsetzungspruefung/i.test(tel), "Telemetrie kennt keine neuen Ereignisse/Enums");
  /* Persistenz: gleiche Keys, nur additive Felder. */
  const foc = read("js/focus.js");
  ok(/var KEY = "focus";/.test(foc) && /var KEY_DONE = "focus_history";/.test(foc), "Datenkeys mm_focus/mm_focus_history unverändert");
  ok(/nie\s+zurückschreiben|NUR im Speicherabbild/i.test(foc), "Normalisierung dokumentiert: Alt-Daten werden nicht umgeschrieben");
})();

/* ==================================================================== 8 */
group("8 · Nachprüfung: Umsetzung vs. Ziel, Prüfungstag, offene Wirkung");
(function () {
  /* --- 8.1  5 von 7 umgesetzt bei Ziel 5 — niemals „5 von 5" ----------- */
  const c = sandboxAt("2026-07-08", store7());          // Prüfungstag
  const u = c.MM.focus.umsetzung();
  ok(u.erledigt === 5 && u.tage === 7, "Umsetzung wird als 5 von 7 Tagen geführt (Gesamttage als Nenner)");
  ok(u.ziel === 5 && u.zielErreicht === true, "Ziel (5 Tage) und Zielstatus (erreicht) stehen getrennt daneben");
  ok(u.quote === 71, "Umsetzungsquote 71 % (5/7), nicht 100 %");
  ok(u.verdict === "ausreichend", "Zielstatus erreicht ⇒ ausreichend umgesetzt");

  const trk = read("js/tracker.js"), chk = read("js/check.js");
  ok(/u\.erledigt \+ ' von ' \+ u\.tage/.test(trk), "Tracker rendert Umsetzung gegen die Gesamttage");
  ok(/Ziel: ' \+ u\.ziel \+ ' von ' \+ u\.tage/.test(trk) && /zielErreicht \? 'erreicht'/.test(trk), "Tracker zeigt Ziel und Zielstatus als eigene Angabe");
  ok(!/' von ' \+ f\.target \+ ' Tagen/.test(trk), "kein Rest, der das Ziel als Nenner der Umsetzung ausgibt");
  ok(/o\.erledigt \+ ' von ' \+ \(o\.days \|\| 28\) \+ ' Tagen umgesetzt/.test(chk), "Score-Bilanz nennt umgesetzte Tage von Gesamttagen");
  ok(/Ziel: ' \+ o\.ziel \+ ' Tage/.test(chk), "Score-Bilanz führt das Ziel getrennt");

  /* Konsistent über alle drei Dauern (Ziel ist nie der Nenner). */
  [[7, 5], [14, 10], [28, 20]].forEach(([d, ziel]) => {
    const done = {};
    for (let i = 1; i <= ziel; i++) done["2026-07-" + ("0" + i).slice(-2)] = true;
    const f = Object.assign({}, F7, { days: d, target: ziel, until: "2026-07-01", done: done });
    f.until = c.MM.focus.addDays("2026-07-01", d);
    const cc = sandboxAt(c.MM.focus.addDays("2026-07-01", d), { mm_focus: JSON.stringify(f) });
    const uu = cc.MM.focus.umsetzung();
    ok(uu.tage === d && uu.ziel === ziel && uu.erledigt === ziel && uu.zielErreicht === true,
      d + " Tage: " + uu.erledigt + " von " + uu.tage + " umgesetzt, Ziel " + uu.ziel + " — getrennt geführt");
  });

  /* --- 8.2  letzter Umsetzungstag ≠ Prüfungstag ------------------------ */
  const cLetzt = sandboxAt("2026-07-07", store7());     // letzter Umsetzungstag
  const pL = cLetzt.MM.focus.progress();
  ok(pL.letzterTag === "2026-07-07" && pL.pruefungAm === "2026-07-08", "letzter Umsetzungstag (07.07.) und Prüfungstag (08.07.) werden getrennt ausgewiesen");
  ok(pL.abgelaufen === false && pL.vergangen === 7, "am letzten Umsetzungstag läuft die Phase noch — alle 7 Tage zählen");
  ok(pL.offen === 1, "am letzten Umsetzungstag ist genau 1 Tag offen");
  ok(c.MM.focus.progress().abgelaufen === true, "am Prüfungstag ist die Fokusphase abgelaufen (kein Abhaken mehr)");
  ok(/fmtD\(f\.started\) \+ '–' \+ fmtD\(p\.letzterTag\)/.test(trk), "Tracker zeigt den Zeitraum bis zum letzten Umsetzungstag");
  ok(/Umsetzungsprüfung am ' \+ fmtD\(p\.pruefungAm\)/.test(trk), "Tracker weist den Prüfungstag separat aus");
  ok(!/fmtD\(f\.started\) \+ ' bis ' \+ fmtD\(f\.until\)/.test(trk), "die missverständliche Spanne Start-bis-Prüfungstag ist weg");
  ok(/läuft bis zum ' \+ fmtNice\(parseYmd\(letzterTag\)\)/.test(chk), "Ergebnisseite nennt den letzten Umsetzungstag, nicht den Prüfungstag");
  ok(/p\.offen === 1 \? ' TAG' : ' TAGE'/.test(trk), "Singular/Plural der Resttage stimmt");

  /* --- 8.3  Phase fertig, Wirkungsprüfung liegt später ----------------- */
  const off = c.MM.focus.wirkungOffen();
  ok(off && off.quelle === "aktiv", "am Prüfungstag ist die Wirkungsprüfung als offen erkennbar");
  ok(off.faelligAm === "2026-07-15" && off.beurteilbar === false, "Termin der Wirkungsprüfung liegt später und ist noch nicht beurteilbar");
  ok(off.erledigt === 5 && off.ziel === 5 && off.days === 7, "der offene Vorgang kennt Umsetzung, Ziel und Dauer für die Anzeige");

  /* --- 8.4  Nach dem Archivieren bleibt die offene Wirkung auffindbar --- */
  c.MM.focus.clear();                                    // „Auftrag abschließen & archivieren"
  ok(c.MM.focus.current() === null, "der Auftrag ist archiviert");
  const nachArchiv = c.MM.focus.wirkungOffen();
  ok(nachArchiv && nachArchiv.quelle === "historie", "die offene Wirkungsprüfung überlebt das Archivieren");
  ok(nachArchiv.faelligAm === "2026-07-15" && nachArchiv.letzterTag === "2026-07-07", "Termin und letzter Umsetzungstag bleiben erhalten");

  /* Reload = frische Engine auf demselben Speicher. */
  const nachReload = sandboxAt("2026-07-16", { mm_focus_history: c.__mem["mm_focus_history"] });
  const off2 = nachReload.MM.focus.wirkungOffen();
  ok(off2 && off2.quelle === "historie", "nach Reload ist die offene Wirkungsprüfung weiterhin da");
  ok(off2.beurteilbar === true, "nach Erreichen des Termins ist sie als fällig markiert");
  ok(nachReload.MM.focus.setWirkung("teilweise") === true, "sie ist nach Reload weiterhin bearbeitbar");
  ok(nachReload.MM.focus.wirkungOffen() === null, "mit gespeichertem Ergebnis ist sie nicht mehr offen");
  const hist = nachReload.MM.focus.history();
  ok(hist[hist.length - 1].wirkung.verdict === "teilweise", "das Ergebnis steht am archivierten Vorgang");
  ok(/wirkungOffen/.test(trk) && /WIRKUNGSPRÜFUNG · OFFEN/.test(trk), "der Tracker rendert die offene Wirkungsprüfung als eigene Karte");
  ok(/wirkungBtns\(/.test(trk) && /data-fwirkung="' \+ q\[0\]/.test(trk), "die Erfassung ist dort direkt möglich");

  /* --- 8.5  Abschluss erst durch Ergebnis ODER bewusste Entscheidung ---- */
  const cVertagt = sandboxAt("2026-07-16", { mm_focus_history: c.__mem["mm_focus_history"] });
  ok(cVertagt.MM.focus.setWirkung("offen") === true, "Vertagung (noch offen, später prüfen) lässt sich erfassen");
  ok(cVertagt.MM.focus.wirkungOffen() !== null, "eine Vertagung schließt den Vorgang NICHT ab — er bleibt sichtbar");
  ok(cVertagt.MM.focus.setWirkung("nicht_geprueft") === true, "die bewusste Entscheidung, nicht weiter zu prüfen, ist erfassbar");
  ok(cVertagt.MM.focus.wirkungOffen() === null, "erst diese Entscheidung schließt die offene Wirkungsprüfung ab");
  ok(cVertagt.MM.focus.wirkungLabel("nicht_geprueft") === "bewusst nicht weiter geprüft", "die Entscheidung ist ehrlich benannt (kein Ergebnis erfunden)");
  ok(/nicht_geprueft\|Nicht weiter prüfen/.test(trk), "der Tracker bietet die bewusste Abwahl an");

  /* Alt-Einträge von vor der Fokusphasen-Logik tauchen nie als offen auf. */
  const cLegacy = sandboxAt("2026-07-16", { mm_focus_history: JSON.stringify([{ domain: "sleep", title: "Alt", started: "2026-05-01", until: "2026-05-29", erledigt: 21, ziel: 20, geschafft: true }]) });
  ok(cLegacy.MM.focus.wirkungOffen() === null, "historische Alt-Aufträge werden nicht nachträglich als offene Wirkungsprüfung gemeldet");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
