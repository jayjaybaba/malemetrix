/* ==========================================================================
   MALEMETRIX P3 — OPTIMIERUNGSPUNKTE & GEMEINSAMES STATUSMODELL
   Friert ein: kanonische Struktur (mm_opt_points) mit Referenzen statt
   Kopien, Entstehung nur aus bestätigten Handlungen, konservative
   Duplikatregel, Statusableitung aus der Quelle, persönlicher Standard nur
   nach ausdrücklicher Bestätigung, mehrere offene Wirkungsprüfungen,
   Legacy-Lesbarkeit und unveränderte Fremdmodule.
   Ausführen:  node tools-dev/tests/optimierungspunkte.test.js
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

/* Sandbox: echtes check-data.js + focus.js + points.js, fixes Heute-Datum. */
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
    Date: FakeDate, Math, JSON, Object, Array, String, Number, isNaN, parseInt, parseFloat
  };
  ctx.window = ctx; ctx.__mem = mem;
  vm.createContext(ctx);
  vm.runInContext(read("js/check-data.js"), ctx);
  vm.runInContext(read("js/focus.js"), ctx);
  vm.runInContext(read("js/points.js"), ctx);
  return ctx;
}
const RES = { total: 55, bottleneck: { domain: "sleep", name: "Schlaf & Erholung" } };
/* Auftrag: 7 Tage, Start 01.07., letzter Umsetzungstag 07.07., Prüfung 08.07. */
function auftrag(over) {
  return Object.assign({
    v: 1, domain: "sleep", bottleneckName: "Schlaf & Erholung",
    title: "Zur selben Zeit ins Bett", daily: "Heute zur geplanten Zeit ins Bett",
    why: "w", proof: "p", arzt: "", target: 5, days: 7, wirkfrist: 14,
    started: "2026-07-01", until: "2026-07-08", wirkungBis: "2026-07-15", done: {}
  }, over || {});
}
function tage(n, monat) {
  const d = {}; for (let i = 1; i <= n; i++) d["2026-" + (monat || "07") + "-" + ("0" + i).slice(-2)] = true; return d;
}

/* ==================================================================== 1 */
group("1 · Kanonische Struktur, Legacy und Fremdmodule (T1, 21, 22, 30–33)");
(function () {
  const pts = read("js/points.js");
  ok(/var KEY = "opt_points"/.test(pts), "genau EINE kanonische Punkt-Liste (mm_opt_points)");
  ok(!/intel_decisions|os_decisions/.test(pts.replace(/\/\*[\s\S]*?\*\//g, "")),
    "points.js schreibt NIE in intel_decisions oder os_decisions (T22)");
  ok(!/intel_experiments/.test(pts.replace(/\/\*[\s\S]*?\*\//g, "")) && /MM\.intelligence && MM\.intelligence\.experiments/.test(pts),
    "Premium-Experimente werden nur über die öffentliche API gelesen, nie über den Store (T30)");
  ok(/E\.all\(\)/.test(pts) && !/experiments\.\w+\s*=/.test(pts), "kein Schreibzugriff auf das Experiment-Modul (T30)");

  /* Fremdmodule unangetastet (T31, T33). */
  const g = require("node:child_process").execSync("git -C " + ROOT + " diff --name-only HEAD", { encoding: "utf8" }) +
            require("node:child_process").execSync("git -C " + ROOT + " diff --name-only --cached", { encoding: "utf8" });
  ok(!/js\/os\/intelligence\/experiments\.js/.test(g), "experiments.js ist in diesem Paket unverändert (T31)");
  ok(!/js\/os\/intelligence\/memory\.js/.test(g), "memory.js (intel_decisions) bleibt unverändert (T1)");
  ok(!/js\/score-telemetry\.js/.test(g), "Telemetrie unverändert (T33)");
  const cd = read("js/check-data.js");
  ok(/C\.domainMeta|domainMeta:/.test(cd), "Score-Engine vorhanden");
  const ctx = box();
  const summe = Object.keys(ctx.window.MM_CHECK.domainMeta).reduce((a, k) => a + (ctx.window.MM_CHECK.domainMeta[k].w || 0), 0);
  ok(summe === 145, "Score-Gewichte eingefroren (Summe 145) — keine Formeländerung (T33)");

  /* Legacy-Ledger bleibt lesbar und behält seinen Fallback-Zweck (T21). */
  const ex = read("js/os/execution.js");
  ok(/function legacyDecisions\(\)/.test(ex) && /os_decisions_migrated/.test(ex),
    "os_decisions bleibt lesbar samt idempotenter Einmal-Migration (T21)");
  ok(/if \(I && I\.memory && migrateLegacyDecisions\(\)\)/.test(ex),
    "neue Entscheidungen gehen in den kanonischen Ledger; os_decisions nur ohne Intelligence-Schicht (T21)");

  /* Ein Ledger-Eintrag ohne neue Felder bleibt unberührt lesbar (T1). */
  const c2 = box("2026-07-20", { mm_intel_decisions: JSON.stringify([{ id: "dec_1", domain: "nutrition", title: "Alt", status: "open" }]) });
  c2.MM.points.fromFocus(auftrag(), {});
  const led = JSON.parse(c2.__mem["mm_intel_decisions"]);
  ok(led.length === 1 && led[0].id === "dec_1" && led[0].status === "open",
    "bestehender Ledger-Eintrag ohne neue Felder bleibt unverändert lesbar (T1)");
})();

/* ==================================================================== 2 */
group("2 · Entstehung nur aus bestätigten Handlungen (T2, 3, 4, 34)");
(function () {
  const c = box();
  ok(c.MM.points.list().length === 0, "frischer Zustand: keine Punkte");

  /* Score-Ergebnis ANZEIGEN erzeugt keinen Punkt — nur focusFor(), kein Start. */
  c.window.MM_CHECK.focusFor(RES, 7);
  c.window.MM_CHECK.focusFor(RES, 14);
  ok(c.MM.points.list().length === 0, "angezeigter, nicht übernommener Engpass erzeugt keinen Punkt (T2)");

  const chk = read("js/check.js");
  ok((chk.match(/MM\.points\.fromFocus/g) || []).length === 1, "genau EINE Erzeugungsstelle in check.js");
  ok(chk.indexOf("MM.focus.start(auftrag)") < chk.indexOf("MM.points.fromFocus"),
    "der Punkt entsteht erst NACH dem bestätigten Auftragsstart (T2/T3)");
  const vorRender = chk.indexOf("function renderResult");
  const idxCreate = chk.indexOf("MM.points.fromFocus");
  ok(idxCreate > vorRender && /focusGo/.test(chk.slice(idxCreate - 1200, idxCreate)),
    "die Erzeugung liegt im Klick-Handler, nicht im Render-Pfad (T2)");

  /* Bestätigter Engpass / gestarteter Auftrag ⇒ Punkt (T3/T4). */
  const f = auftrag();
  c.MM.focus.start(f);
  const p = c.MM.points.fromFocus(f, { origin: "engpass" });
  ok(p && p.id && p.source_type === "focus" && p.source_id === "sleep:2026-07-01",
    "gestarteter Auftrag erzeugt genau einen Punkt mit Quellreferenz (T3/T4)");
  ok(p.area === "sleep" && p.areaLabel === "Schlaf & Erholung", "Optimierungsbereich ist zugeordnet");
  ok(p.origin === "engpass" && p.measure_summary && p.review_date === "2026-07-08" && p.effect_review_date === "2026-07-15",
    "Ursprung, Maßnahmen-Zusammenfassung und beide Prüftermine sind gesetzt");

  /* Nach Reload lesbar (T34). */
  const c2 = box("2026-07-20", { mm_opt_points: c.__mem["mm_opt_points"], mm_focus: c.__mem["mm_focus"] });
  const wieder = c2.MM.points.list();
  ok(wieder.length === 1 && wieder[0].source_id === "sleep:2026-07-01", "Punkt bleibt nach Reload lesbar (T34)");
})();

/* ==================================================================== 3 */
group("3 · Duplikatregel — konservativ (T5, 6, 7)");
(function () {
  const c = box();
  const f = auftrag();
  c.MM.focus.start(f);
  const a = c.MM.points.fromFocus(f);
  const b = c.MM.points.fromFocus(f);          // identische Quelle erneut
  ok(c.MM.points.list().length === 1 && a.id === b.id, "identische source_id erzeugt keinen zweiten Punkt (T5/T6)");

  /* Dieselbe Quelle mit neuen Daten ⇒ Aktualisierung, nicht Duplikat (T6). */
  const f2 = auftrag({ until: "2026-07-09", wirkungBis: "2026-07-20" });
  const upd = c.MM.points.fromFocus(f2);
  ok(c.MM.points.list().length === 1 && upd.id === a.id && upd.review_date === "2026-07-09",
    "gleiche source_id aktualisiert den bestehenden Punkt (T6)");

  /* Gleicher Bereich, ANDERER Punkt ⇒ eigener Eintrag (T7). */
  const anders = auftrag({ started: "2026-08-01", until: "2026-08-08", wirkungBis: "2026-08-15", title: "Kein Koffein nach 14 Uhr" });
  c.MM.points.fromFocus(anders);
  ok(c.MM.points.list().length === 2, "fachlich anderer Punkt im selben Bereich wird NICHT zusammengelegt (T7)");

  /* Anderer Bereich, gleicher Titel ⇒ eigener Eintrag (T7). */
  const andererBereich = auftrag({ domain: "energy", bottleneckName: "Energie", started: "2026-08-02", until: "2026-08-09", wirkungBis: "2026-08-16" });
  c.MM.points.fromFocus(andererBereich);
  ok(c.MM.points.list().length === 3, "gleicher Titel in anderem Bereich bleibt ein eigener Punkt (T7)");

  /* Gleicher Bereich + identischer Titel + noch aktiv ⇒ Aktualisierung (T5). */
  const c2 = box();
  c2.MM.points.upsert({ area: "sleep", title: "Zur selben Zeit ins Bett", source_type: "focus", source_id: "sleep:2026-07-01", status: "in_umsetzung" });
  c2.MM.points.upsert({ area: "sleep", title: "zur selben zeit ins bett!", source_type: "focus", source_id: "sleep:2026-09-01", status: "in_umsetzung" });
  ok(c2.MM.points.list().length === 1, "derselbe aktive Punkt wird auch bei neuer Quelle nicht doppelt angelegt (T5)");
})();

/* ==================================================================== 4 */
group("4 · Statusübergänge folgen den Handlungen (T8–11, 15–18)");
(function () {
  const V = (ctx) => ctx.MM.points.list()[0];

  /* Auftrag gestartet ⇒ In Umsetzung (T8). */
  const c1 = box("2026-07-03", { mm_focus: JSON.stringify(auftrag({ done: tage(2) })) });
  c1.MM.points.fromFocus(auftrag());
  ok(V(c1).status === "in_umsetzung" && V(c1).statusLabel === "In Umsetzung", "laufender Auftrag ⇒ In Umsetzung (T8)");

  /* Fokusphase beendet, Umsetzung noch nicht quittiert ⇒ Prüfung fällig (T9). */
  const c2 = box("2026-07-08", { mm_focus: JSON.stringify(auftrag({ done: tage(5) })) });
  c2.MM.points.fromFocus(auftrag());
  ok(V(c2).status === "pruefung_faellig" && V(c2).statusLabel === "Prüfung fällig", "Phasenende ⇒ Prüfung fällig (T9)");

  /* Wirkung vertagt ⇒ Wirkung offen (T10). */
  const c3 = box("2026-07-08", { mm_focus: JSON.stringify(auftrag({ done: tage(5), wirkung: { verdict: "offen", date: "2026-07-08" } })) });
  c3.MM.points.fromFocus(auftrag());
  ok(V(c3).status === "wirkung_offen" && V(c3).statusLabel === "Wirkung offen", "Umsetzung geprüft, Wirkung vertagt ⇒ Wirkung offen (T10)");

  /* Positives Wirkungsergebnis ⇒ Abschluss möglich (T11). */
  const c4 = box("2026-07-15", { mm_focus: JSON.stringify(auftrag({ done: tage(5), wirkung: { verdict: "erkennbar", date: "2026-07-15" } })) });
  c4.MM.points.fromFocus(auftrag());
  ok(V(c4).status === "abgeschlossen", "erfasste Wirkung ⇒ Abgeschlossen (T11)");

  /* Unzureichende Umsetzung ⇒ Wirkung nicht belastbar (T15). */
  const c5 = box("2026-07-08", { mm_focus: JSON.stringify(auftrag({ done: tage(1) })) });
  c5.MM.points.fromFocus(auftrag());
  ok(c5.MM.focus.umsetzung().verdict === "nicht_ausreichend" && c5.MM.focus.wirkung().belastbar === false,
    "unzureichende Umsetzung ⇒ Wirkung nicht belastbar (T15)");
  ok(V(c5).status === "pruefung_faellig", "…und der Punkt behauptet kein Ergebnis");

  /* „Nicht weiter prüfen" ⇒ Abschluss ohne erfundenes Ergebnis (T16). */
  const c6 = box("2026-07-15", { mm_focus: JSON.stringify(auftrag({ done: tage(5), wirkung: { verdict: "nicht_geprueft", date: "2026-07-15" } })) });
  c6.MM.points.fromFocus(auftrag());
  ok(V(c6).status === "abgeschlossen", "bewusste Abwahl ⇒ Abgeschlossen (T16)");
  ok(!V(c6).result_summary, "…ohne ein Wirkungsergebnis zu erfinden (T16)");
  ok(c6.MM.focus.wirkungLabel("nicht_geprueft") === "bewusst nicht weiter geprüft", "die Abwahl bleibt ehrlich benannt");

  /* Pausiert bleibt erhalten — manuelle Zustände gewinnen über die Ableitung (T17). */
  const c7 = box("2026-07-03", { mm_focus: JSON.stringify(auftrag({ done: tage(2) })) });
  const p7 = c7.MM.points.fromFocus(auftrag());
  c7.MM.points.setStatus(p7.id, "pausiert");
  ok(V(c7).status === "pausiert" && V(c7).statusLabel === "Pausiert", "Pausierung überschreibt die Ableitung (T17)");
  const c7b = box("2026-07-03", { mm_focus: c7.__mem["mm_focus"], mm_opt_points: c7.__mem["mm_opt_points"] });
  ok(V(c7b).status === "pausiert", "…und bleibt nach Reload erhalten (T17)");
  c7.MM.points.resume(p7.id);
  ok(V(c7).status === "in_umsetzung", "Fortsetzen kehrt zur abgeleiteten Wahrheit zurück");

  /* Weitere Abklärung: manuell UND aus fachlicher Grenze abgeleitet (T18). */
  const c8 = box("2026-07-03", { mm_focus: JSON.stringify(auftrag({ done: tage(2) })) });
  const p8 = c8.MM.points.fromFocus(auftrag());
  c8.MM.points.setStatus(p8.id, "weitere_abklaerung");
  ok(V(c8).status === "weitere_abklaerung" && V(c8).statusLabel === "Weitere Abklärung", "Weitere Abklärung bleibt erhalten (T18)");
  const med = auftrag({ domain: "hormonal", bottleneckName: "Hormonell", arzt: "ärztlich abklären", target: 6, done: tage(6), wirkung: { verdict: "nicht_erkennbar", date: "2026-07-15" } });
  const c9 = box("2026-07-15", { mm_focus: JSON.stringify(med) });
  c9.MM.points.fromFocus(med);
  ok(V(c9).status === "weitere_abklaerung", "gut umgesetzt + keine Wirkung + ärztlicher Vorbehalt ⇒ Weitere Abklärung (T18)");

  /* Sichtbare Gruppen: genau sieben, keine technischen Verdicts. */
  const labels = Object.keys(c1.MM.points.LABEL).map((k) => c1.MM.points.LABEL[k]);
  ok(labels.length === 7, "genau sieben sichtbare Statusgruppen");
  ok(!labels.join(" ").match(/LIKELY|KEEP|verdict|open|reviewed/i), "keine technischen Verdicts in den sichtbaren Gruppen");
})();

/* ==================================================================== 5 */
group("5 · Persönlicher Standard nur nach ausdrücklicher Bestätigung (T12–14, 35)");
(function () {
  const guteWirkung = auftrag({ done: tage(5), wirkung: { verdict: "erkennbar", date: "2026-07-15" } });

  /* Positive Wirkung OHNE Bestätigung ⇒ kein Standard (T12). */
  const c = box("2026-07-15", { mm_focus: JSON.stringify(guteWirkung) });
  const p = c.MM.points.fromFocus(guteWirkung);
  ok(c.MM.points.standardEmpfohlen(c.MM.points.get(p.id)) === true, "gute Umsetzung + Wirkung ⇒ Übernahme wird EMPFOHLEN");
  ok(c.MM.points.standards().length === 0, "ohne Bestätigung entsteht KEIN persönlicher Standard (T12/T35)");
  ok(c.MM.points.get(p.id).standard === null, "…der Punkt trägt keinen Standard");

  /* Hoher Umsetzungsgrad allein erzeugt nie einen Standard (T35). */
  const fleissig = auftrag({ done: tage(7) });
  const c2 = box("2026-07-08", { mm_focus: JSON.stringify(fleissig) });
  const p2 = c2.MM.points.fromFocus(fleissig);
  ok(c2.MM.points.standardEmpfohlen(c2.MM.points.get(p2.id)) === false, "7 von 7 Tagen ohne Wirkungsurteil ⇒ keine Empfehlung (T35)");
  ok(c2.MM.points.standards().length === 0, "…und erst recht kein automatischer Standard (T35)");

  /* Mit ausdrücklicher Bestätigung ⇒ Standard (T13). */
  const std = c.MM.points.adoptStandard(p.id, { minimal: "an stressigen Tagen nur die Uhrzeit halten" });
  ok(std && std.standard && std.standard.bestaetigt === true, "ausdrückliche Übernahme erzeugt den Standard (T13)");
  ok(std.standard.bestaetigtAm === "2026-07-15" && std.standard.bereich === "Schlaf & Erholung" && std.standard.minimal,
    "der Standard trägt Was/Bereich/Warum/Minimalform (T13)");
  ok(std.status === "abgeschlossen" && std.completed_at === "2026-07-15", "…und schließt den Punkt ab");
  ok(c.MM.points.standards().length === 1, "er taucht in der Standard-Liste auf");

  /* Keine Wirkung ⇒ keine Empfehlung, kein Standard (T14). */
  const ohne = auftrag({ done: tage(5), wirkung: { verdict: "nicht_erkennbar", date: "2026-07-15" } });
  const c3 = box("2026-07-15", { mm_focus: JSON.stringify(ohne) });
  const p3 = c3.MM.points.fromFocus(ohne);
  ok(c3.MM.points.standardEmpfohlen(c3.MM.points.get(p3.id)) === false, "keine erkennbare Wirkung ⇒ keine Empfehlung (T14)");
  c3.MM.points.declineStandard(p3.id);
  ok(c3.MM.points.standards().length === 0 && c3.MM.points.get(p3.id).status === "abgeschlossen",
    "Abschluss ohne Standard ist ausdrücklich möglich (T14)");

  /* Ärztlicher Vorbehalt ⇒ keine Empfehlung zur dauerhaften Übernahme. */
  const med = auftrag({ domain: "hormonal", arzt: "ärztlich abklären", done: tage(5), wirkung: { verdict: "erkennbar", date: "2026-07-15" } });
  const c4 = box("2026-07-15", { mm_focus: JSON.stringify(med) });
  const p4 = c4.MM.points.fromFocus(med);
  ok(c4.MM.points.standardEmpfohlen(c4.MM.points.get(p4.id)) === false, "fachliche Einschränkung verhindert die Empfehlung");

  /* Nachweis der Bestätigung ist im UI an eine Nutzeraktion gebunden. */
  const trk = read("js/tracker.js");
  ok(/data-fstd="adopt"/.test(trk) && /data-fstd="decline"/.test(trk), "Tracker bietet Übernahme UND Ablehnung als Entscheidung an");
  ok(/MM\.points\.adoptStandard\(id\)/.test(trk) && /addEventListener\("click"/.test(trk),
    "der Standard entsteht ausschließlich im Klick-Handler (T35)");
  ok(!/adoptStandard/.test(read("js/points.js").split("function adoptStandard")[0].replace(/\/\*[\s\S]*?\*\//g, "")),
    "keine automatische Übernahme irgendwo vor der Funktion selbst");
})();

/* ==================================================================== 6 */
group("6 · Source of Truth: Referenz statt Kopie (T27–29)");
(function () {
  const f = auftrag({ done: tage(3) });
  const c = box("2026-07-04", { mm_focus: JSON.stringify(f) });
  const p = c.MM.points.fromFocus(f);
  const gespeichert = JSON.parse(c.__mem["mm_opt_points"])[0];

  ok(gespeichert.done === undefined && gespeichert.wirkung === undefined && gespeichert.target === undefined,
    "der Punkt enthält KEINE zweite Kopie von Häkchen, Ziel oder Wirkung (T29)");
  ok(gespeichert.source_type === "focus" && gespeichert.source_id === "sleep:2026-07-01",
    "er referenziert die Quelle über source_type + source_id (T27)");

  /* Änderung an der Quelle wirkt sofort — ohne Schreibvorgang am Punkt. */
  const vorher = c.__mem["mm_opt_points"];
  c.MM.focus.toggleDay("2026-07-04");
  ok(c.MM.focus.progress().erledigt === 4, "die Umsetzung wächst in mm_focus (T27)");
  ok(c.__mem["mm_opt_points"] === vorher, "der Punkt wurde dabei NICHT verändert — keine bidirektionale Synchronisation");

  /* Historische Prüfungen bleiben in mm_focus_history maßgeblich (T28). */
  c.MM.focus.clear();
  const hist = JSON.parse(c.__mem["mm_focus_history"]);
  ok(hist.length === 1 && hist[0].erledigt === 4, "die Umsetzungsbilanz steht in mm_focus_history (T28)");
  const nachArchiv = c.MM.points.list()[0];
  ok(nachArchiv.status === "wirkung_offen", "der Punkt leitet seinen Status weiterhin aus der Quelle ab (T28)");

  /* Punkt ohne auffindbare Quelle fällt auf den gespeicherten Stand zurück. */
  const c2 = box("2026-07-20", { mm_opt_points: c.__mem["mm_opt_points"] });
  ok(c2.MM.points.list()[0].status === "in_umsetzung", "ohne Quelle bleibt der zuletzt bekannte Stand lesbar");
})();

/* ==================================================================== 7 */
group("7 · Mehrere offene Wirkungsprüfungen (T23–26)");
(function () {
  /* Keine offene Prüfung (T23). */
  const c0 = box("2026-07-20", {});
  ok(c0.MM.focus.wirkungOffeneListe().length === 0 && c0.MM.focus.wirkungOffen() === null, "null offene Wirkungsprüfungen (T23)");

  /* Genau eine (T24) — die Oberfläche bleibt einfach. */
  const einH = [{ domain: "sleep", title: "A", started: "2026-06-01", until: "2026-06-15", erledigt: 11, ziel: 10, days: 14, wirkungBis: "2026-06-29" }];
  const c1 = box("2026-07-20", { mm_focus_history: JSON.stringify(einH) });
  ok(c1.MM.focus.wirkungOffeneListe().length === 1, "eine offene Wirkungsprüfung (T24)");
  const trk = read("js/tracker.js");
  ok(/function weitereOffeneHTML/.test(trk) && /if \(!rest\.length\) return "";/.test(trk),
    "die Zusatzliste erscheint nur, wenn es mehr als eine gibt (T24)");

  /* Mehrere gleichzeitig — keine darf verschwinden (T25). */
  const mehrH = [
    { domain: "sleep", title: "A", started: "2026-06-01", until: "2026-06-15", erledigt: 11, ziel: 10, days: 14, wirkungBis: "2026-06-29" },
    { domain: "energy", title: "B", started: "2026-06-20", until: "2026-06-27", erledigt: 5, ziel: 5, days: 7, wirkungBis: "2026-07-11" }
  ];
  const cM = box("2026-07-20", { mm_focus_history: JSON.stringify(mehrH), mm_focus: JSON.stringify(auftrag({ started: "2026-07-01", until: "2026-07-08", wirkungBis: "2026-07-15", done: tage(5) })) });
  const liste = cM.MM.focus.wirkungOffeneListe();
  ok(liste.length === 3, "drei offene Wirkungsprüfungen werden ALLE gefunden (T25)");
  ok(liste[0].faelligAm === "2026-06-29", "sortiert nach Fälligkeit — die dringendste zuerst (T25)");
  ok(liste.map((o) => o.ref).join(",") === "sleep:2026-06-01,energy:2026-06-20,sleep:2026-07-01", "jede trägt eine eindeutige Referenz");

  /* Gezieltes Erfassen trifft den richtigen Vorgang (T25). */
  ok(cM.MM.focus.setWirkung("erkennbar", null, "energy:2026-06-20") === true, "eine bestimmte Prüfung lässt sich gezielt beantworten");
  const h2 = JSON.parse(cM.__mem["mm_focus_history"]);
  ok(h2[1].wirkung.verdict === "erkennbar" && !h2[0].wirkung, "…und nur diese — die andere bleibt unberührt (T25)");
  ok(cM.MM.focus.wirkungOffeneListe().length === 2, "danach sind noch zwei offen");

  /* Nach Reload weiterhin vollständig auffindbar (T26). */
  const cR = box("2026-07-20", { mm_focus_history: cM.__mem["mm_focus_history"], mm_focus: cM.__mem["mm_focus"] });
  ok(cR.MM.focus.wirkungOffeneListe().length === 2, "keine offene Prüfung verschwindet nach Reload (T26)");
  ok(/data-fref/.test(trk), "die UI adressiert jede Prüfung einzeln (T25)");
})();

/* ==================================================================== 8 */
group("8 · updated_at und Multi-Device-Merge (T19, T20)");
(function () {
  const c = box();
  const p = c.MM.points.fromFocus(auftrag());
  const t1 = JSON.parse(c.__mem["mm_opt_points"])[0].updated_at;
  ok(!!t1 && !isNaN(Date.parse(t1)), "jeder Punkt trägt ein gültiges updated_at (T19)");
  c.MM.points.setStatus(p.id, "pausiert");
  const t2 = JSON.parse(c.__mem["mm_opt_points"])[0].updated_at;
  ok(Date.parse(t2) >= Date.parse(t1), "jede Mutation aktualisiert updated_at (T19)");
  c.MM.points.adoptStandard(p.id, {});
  ok(Date.parse(JSON.parse(c.__mem["mm_opt_points"])[0].updated_at) >= Date.parse(t2), "auch die Standard-Übernahme (T19)");

  /* Sync-Klassifikation: die Domäne ist registriert und inventarisiert. */
  ok(/registerStateDomain\("optpoints", "opt_points", \{ append: true \}\)/.test(read("js/points.js")),
    "opt_points ist als append-Sync-Domäne registriert — keine neue Tabelle");
  ok(/optpoints: "opt_points"/.test(read("js/os/os-core.js")), "und im Sync-Inventar klassifiziert");

  /* Multi-Device: der neuere Stand gewinnt (Paket-0-Konfliktregel, T20). */
  const store = {};
  const RealDate = Date;
  const ctx = {
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      get length() { return Object.keys(store).length; }, key: (i) => Object.keys(store)[i]
    },
    document: { addEventListener() {}, dispatchEvent() {}, getElementById: () => null, hidden: false },
    CustomEvent: function (t, i) { this.type = t; this.detail = (i || {}).detail; },
    console: { log() {}, error() {} }, Date: RealDate, Math, JSON, Object, Array, String, Number, isNaN, parseInt, parseFloat,
    setTimeout, clearTimeout, Promise
  };
  ctx.window = { addEventListener() {}, location: { origin: "https://x", hash: "" }, MM: {},
    __MM_TEST_CLOUD: { user: { id: "u1" }, tables: { os_state: [
      { user_id: "u1", domain: "optpoints", state: [{ id: "pt_1", status: "abgeschlossen", updated_at: "2026-07-27T10:00:00Z" }], state_version: 9 }
    ] } } };
  ctx.MM = ctx.window.MM; ctx.global = ctx;
  vm.createContext(ctx);
  ctx.MM.store = {
    get: (k, d) => { try { const r = store["mm_" + k]; return r != null ? JSON.parse(r) : d; } catch (e) { return d; } },
    set: (k, v) => { store["mm_" + k] = JSON.stringify(v); },
    remove: (k) => { delete store["mm_" + k]; }
  };
  ctx.MM.config = {};
  store["mm_opt_points"] = JSON.stringify([{ id: "pt_1", status: "in_umsetzung", updated_at: "2026-07-20T10:00:00Z" }]);
  store["mm_os_ver_optpoints"] = "3"; store["mm_os_synced_optpoints"] = "2";
  vm.runInContext(read("js/account.js"), ctx);
  ctx.MM.account.registerStateDomain("optpoints", "opt_points", { append: true });
  return ctx.MM.account.init().then(() => new Promise((r) => setTimeout(r, 2200))).then(() => {
    const lokal = JSON.parse(store["mm_opt_points"]);
    ok(lokal.length === 1 && lokal[0].status === "abgeschlossen",
      "Multi-Device-Merge behält den neueren Status (T20)");
  });
})();

/* Der letzte Block ist asynchron — Ausgabe erst danach. */
setTimeout(function () {
  console.log("\n==============================");
  console.log("PASS: " + passed + "  FAIL: " + failed);
  process.exit(failed ? 1 : 0);
}, 3200);
