/* Paket-8-Browserprüfung: Alltagstest, 12-Wochen-Abschluss und Integrität
   von mm_opt_points @390/@1440. Abläufe A–H aus §30.
   Jeder Ablauf startet mit einem frisch gesetzten Zustand (isoliert und
   deterministisch) — kein Ablauf hängt vom vorherigen ab. */
/* Läuft gegen einen lokalen Server (Standard: http://127.0.0.1:8899/).
   Siehe tools-dev/qa/README.md. */
const pw = require(process.env.MM_PLAYWRIGHT || "playwright-core");
const BASE = process.env.MM_BASE || "http://127.0.0.1:8899/";
let fail = 0;
const ok = (c, m) => { if (c) console.log("  OK  " + m); else { fail++; console.error("  FAIL: " + m); } };

const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const plus = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const HEUTE = new Date();
const T0 = ymd(HEUTE);
/* Woche 12 des laufenden Programms: Start vor 80 Tagen = Programmtag 81. */
const PROG_START = ymd(plus(HEUTE, -80));

function standardPunkt(id, titel, bereich, area, minimal, seit) {
  return {
    id: id, area: area, areaLabel: bereich, title: titel,
    status: "abgeschlossen", source_type: "manual", source_id: "src_" + id,
    entity_type: "optimization_point", created: seit, updated_at: seit + "T10:00:00.000Z",
    completed_at: seit,
    standard: { bestaetigt: true, bestaetigtAm: seit, was: titel, bereich: bereich, warum: "hat in der Ergebnisprüfung geholfen", minimal: minimal || "" }
  };
}
const BASIS = {
  account_entitlements: ["protocol", "twelve_week"],
  /* Der Zugriffs-Nachweis gehoert dazu: ohne ihn verwirft account.js beim
     naechsten Laden zu Recht jedes unverifizierte Entitlement (P1-11). */
  account_access_validation: { version: 2, validated: true, validated_at: new Date().toISOString() },
  c2_goal: "recomp", c2_bottleneck: "recovery", c2_start: PROG_START, c2_ver: 3,
  os_cycle: { id: "cyc_p_" + PROG_START, status: "active", start: PROG_START, created: PROG_START },
  opt_seq: 50
};

async function seed(page, store, hash) {
  await page.goto(BASE + "mein-protokoll.html", { waitUntil: "load" });
  await page.evaluate((s) => {
    localStorage.clear();
    Object.keys(s).forEach((k) => localStorage.setItem("mm_" + k, JSON.stringify(s[k])));
  }, store);
  await page.goto(BASE + "mein-protokoll.html#" + (hash || "progress"), { waitUntil: "load" });
  await page.waitForTimeout(1500);
}
const cyc = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("mm_os_cycle") || "null"));
const pts = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("mm_opt_points") || "[]"));
const txt = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent : ""; }, sel);

async function noOverflow(page, label) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(over <= 0, label + ": kein horizontaler Ueberlauf (" + over + "px)");
}
/* Tageswerte rueckdatiert setzen: der Zeitraum wird im Speicher verschoben,
   damit die sieben Tage ohne Zeitreise durchlaufen werden koennen. */
async function tageFuellen(page, werte) {
  await page.evaluate((w) => {
    const c = JSON.parse(localStorage.getItem("mm_os_cycle"));
    const t = c.everyday;
    const start = new Date(); start.setDate(start.getDate() - 7);
    const ymd2 = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    t.started_at = ymd2(start);
    const bis = new Date(start); bis.setDate(bis.getDate() + 6); t.until = ymd2(bis);
    const rev = new Date(start); rev.setDate(rev.getDate() + 7); t.review_date = ymd2(rev);
    t.days = {};
    w.forEach((v, i) => {
      if (!v) return;
      const d = new Date(start); d.setDate(d.getDate() + i);
      t.days[ymd2(d)] = {};
      t.standards.forEach((s) => { t.days[ymd2(d)][s.point_id] = v; });
    });
    localStorage.setItem("mm_os_cycle", JSON.stringify(c));
  }, werte);
}

async function run(width) {
  console.log("\n======== ALLTAGSTEST @" + width + "px ========");
  const browser = await pw.chromium.launch({ executablePath: process.env.MM_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width, height: 950 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message || e)));
  page.on("dialog", (d) => d.accept());

  /* ---------------- A. Ohne persoenlichen Standard --------------------- */
  console.log("\n-- A. Alltagstest ohne Standard --");
  await seed(page, Object.assign({}, BASIS, {
    opt_points: [{ id: "pt_50", area: "sleep", areaLabel: "Schlaf", title: "Frueher schlafen", status: "erkannt", source_type: "manual", source_id: "o1", entity_type: "optimization_point" }]
  }));
  let body = await page.evaluate(() => document.body.innerText);
  ok(/Alltagstest/.test(body), "der Alltagstest erscheint im Abschlussbereich");
  ok(/brauchst du mindestens einen Standard/.test(body), "mit verstaendlichem Hinweis auf die Voraussetzung");
  ok(!(await page.evaluate(() => !!document.getElementById("etStart"))), "er kann nicht gestartet werden");
  ok((await cyc(page)).everyday === undefined, "es entsteht kein Alltagstest");
  let p = await pts(page);
  ok(!p.some((x) => x.standard && x.standard.bestaetigt), "und kein kuenstlicher Standard");
  await noOverflow(page, "ohne Standard");

  /* ---------------- B. Alltagstest vorbereiten ------------------------- */
  console.log("\n-- B. Alltagstest vorbereiten --");
  const DREI = [
    standardPunkt("pt_60", "Drei Trainingseinheiten pro Woche", "Training", "training", "Zwei kurze Einheiten", ymd(plus(HEUTE, -40))),
    standardPunkt("pt_61", "Protein zu jeder Hauptmahlzeit", "Ernaehrung", "nutrition", "", ymd(plus(HEUTE, -30))),
    standardPunkt("pt_62", "Kein Koffein nach 14 Uhr", "Regeneration", "recovery", "", ymd(plus(HEUTE, -20)))
  ];
  await seed(page, Object.assign({}, BASIS, { opt_points: DREI }));
  const boxen = await page.evaluate(() => Array.from(document.querySelectorAll(".etSel")).map((c) => ({ v: c.value, an: c.checked })));
  ok(boxen.length === 3, "alle drei vorhandenen Standards stehen zur Auswahl (" + boxen.length + ")");
  ok(boxen.filter((b) => b.an).length === 3, "die Vorauswahl ist gesetzt, aber nichts laeuft");
  ok((await cyc(page)).everyday === undefined, "die Vorauswahl startet den Test nicht");
  body = await page.evaluate(() => document.body.innerText);
  ok(/Minimalform: Zwei kurze Einheiten/.test(body), "eine vorhandene Minimalform wird angezeigt");
  const minFelder = await page.evaluate(() => Array.from(document.querySelectorAll(".etMin")).map((i) => i.getAttribute("data-etpt")));
  ok(minFelder.indexOf("pt_61") >= 0 && minFelder.indexOf("pt_60") < 0,
    "nur wo keine Minimalform existiert, kann eine vor dem Start festgelegt werden");
  ok(/Ergebnisprüfung/.test(body), "der Zeitraum samt Ergebnisprüfung ist sichtbar");

  /* Vier waeren zu viele: eine dritte Auswahl bleibt das Maximum. */
  await page.evaluate(() => { document.querySelectorAll(".etSel")[2].checked = false; });
  await page.fill('.etMin[data-etpt="pt_61"]', "Zwei proteinreiche Mahlzeiten");
  await page.evaluate(() => document.getElementById("etStart").click());
  await page.waitForTimeout(900);
  let c = await cyc(page);
  ok(!!c.everyday && c.everyday.started_at === T0, "die ausdrueckliche Bestaetigung startet den Alltagstest");
  ok(c.everyday.standards.length === 2, "genau die bestaetigten Standards sind enthalten");
  ok(c.everyday.until === ymd(plus(HEUTE, 6)), "letzter Alltagstest-Tag korrekt: " + c.everyday.until);
  ok(c.everyday.review_date === ymd(plus(HEUTE, 7)), "Ergebnisprüfung am Folgetag: " + c.everyday.review_date);
  const s60 = c.everyday.standards.filter((s) => s.point_id === "pt_60")[0];
  const s61 = c.everyday.standards.filter((s) => s.point_id === "pt_61")[0];
  ok(s60 && s60.minimal === "Zwei kurze Einheiten", "die vorhandene Minimalform wurde uebernommen");
  ok(s61 && s61.minimal === "Zwei proteinreiche Mahlzeiten", "die vorher festgelegte Minimalform gilt");
  ok(s60 && !s60.warum && !s60.bestaetigtAm, "keine vollstaendige Kopie des Standards");
  p = await pts(page);
  ok(p.filter((x) => x.id === "pt_61")[0].standard.minimal === "",
    "der Standard selbst wurde nicht still veraendert");
  ok(!c.everyday.completed_at, "der Test ist offen");
  await noOverflow(page, "Vorbereitung");

  /* ---------------- C. Laufender Alltagstest --------------------------- */
  console.log("\n-- C. Laufender Alltagstest --");
  await page.evaluate(() => { location.hash = "#today"; });
  await page.waitForTimeout(1200);
  const karte = await page.evaluate(() => {
    const el = document.querySelector(".os-alltagstest");
    return el ? el.innerText : "";
  });
  ok(/ALLTAGSTEST · TAG 1 VON 7/.test(karte), "die Tageserfassung steht auf der bestehenden Heute-Flaeche");
  const btns = await page.evaluate(() => Array.from(document.querySelectorAll("[data-etday]")).map((b) => b.getAttribute("data-etday") + "/" + b.getAttribute("data-etpt")));
  ["normal", "minimal", "nein", "unklar"].forEach((k) =>
    ok(btns.some((b) => b.indexOf(k + "/") === 0), "der Tageswert „" + k + "“ ist getrennt erfassbar"));
  await page.evaluate(() => document.querySelector('[data-etday="normal"][data-etpt="pt_60"]').click());
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('[data-etday="minimal"][data-etpt="pt_61"]').click());
  await page.waitForTimeout(600);
  c = await cyc(page);
  ok(c.everyday.days[T0].pt_60 === "normal" && c.everyday.days[T0].pt_61 === "minimal",
    "Normalform und Minimalform werden getrennt gespeichert");
  await page.evaluate(() => document.querySelector('[data-etday="nein"][data-etpt="pt_60"]').click());
  await page.waitForTimeout(600);
  c = await cyc(page);
  ok(c.everyday.days[T0].pt_60 === "nein", "eine manuelle Korrektur gewinnt");
  ok(Object.keys(c.everyday.days).length === 1, "und erzeugt keinen zweiten Tageseintrag");
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1300);
  c = await cyc(page);
  ok(c.everyday.days[T0].pt_60 === "nein" && c.everyday.days[T0].pt_61 === "minimal",
    "nach Reload bleiben die Entscheidungen erhalten");
  const aktiv = await page.evaluate(() => {
    const b = document.querySelector('[data-etday="nein"][data-etpt="pt_60"]');
    return b ? b.getAttribute("aria-pressed") : "";
  });
  ok(aktiv === "true", "die getroffene Wahl ist sichtbar markiert");
  /* Zukuenftige Tage: es gibt gar keine Bedienelemente dafuer. */
  const nurHeute = await page.evaluate(() => {
    const el = document.querySelector(".os-alltagstest");
    return el ? !/TAG 2|TAG 3|morgen/i.test(el.innerText) : false;
  });
  ok(nurHeute, "zukuenftige Tage sind nicht erfassbar");
  await noOverflow(page, "laufender Test");

  /* ---------------- D. Abschluss --------------------------------------- */
  console.log("\n-- D. Abschluss der sieben Tage --");
  await tageFuellen(page, ["normal", "normal", "minimal", "normal", "nein", "minimal", "normal"]);
  await page.evaluate(() => { location.hash = "#progress"; });
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1500);
  body = await page.evaluate(() => document.body.innerText);
  ok(/Ergebnisprüfung/.test(body), "die Ergebnispruefung erscheint");
  const bilanz = await page.evaluate(() => Array.from(document.querySelectorAll(".et-tally")).map((e) => e.textContent));
  ok(bilanz.length === 2, "je Standard eine Bilanz (" + bilanz.length + ")");
  ok(/Normalform 4/.test(bilanz[0]) && /Minimalform 2/.test(bilanz[0]) && /nicht umgesetzt 1/.test(bilanz[0]),
    "Normal-, Minimal- und Fehl-Tage korrekt: " + bilanz[0]);
  const urteil = await page.evaluate(() => Array.from(document.querySelectorAll(".et-verdict")).map((e) => e.textContent));
  ok(/Alltagstauglich/.test(urteil[0]), "die Alltagstauglichkeit ist nachvollziehbar: " + urteil[0]);
  ok(!/schwach|versagt|undiszipliniert/i.test(body), "keine Bewertung der Person");
  ok(!/dadurch|verursacht|hat bewirkt|bewiesen/i.test(body), "keine Kausalitaetsaussage");
  /* Hindernis + Entscheidung. */
  await page.selectOption('[data-ethind="pt_60"]', "zeit");
  await page.waitForTimeout(400);
  c = await cyc(page);
  ok(c.everyday.obstacles.pt_60 === "zeit", "das Hindernis ist optional und wird gespeichert");
  await page.evaluate(() => document.getElementById("etDone").click());
  await page.waitForTimeout(700);
  c = await cyc(page);
  ok(!c.everyday.completed_at, "ohne Entscheidung schliesst die Pruefung nicht ab");
  await page.selectOption('[data-etdec="pt_60"]', "beibehalten");
  await page.waitForTimeout(300);
  await page.selectOption('[data-etdec="pt_61"]', "minimalform_ergaenzen");
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById("etDone").click());
  await page.waitForTimeout(900);
  c = await cyc(page);
  ok(!!c.everyday.completed_at, "mit Entscheidung wird sie abgeschlossen");
  ok(c.everyday.results.pt_60.verdict === "alltagstauglich", "das Ergebnis ist gespeichert");
  await noOverflow(page, "Abschluss");

  /* ---------------- E. Standardentscheidung ---------------------------- */
  console.log("\n-- E. Standardentscheidung --");
  p = await pts(page);
  ok(p.filter((x) => x.id === "pt_61")[0].standard.minimal === "",
    "die Entscheidung allein aendert den Standard nicht");
  const hatBtn = await page.evaluate(() => !!document.querySelector('[data-etmin="pt_61"]'));
  ok(hatBtn, "die Bestaetigung wird ausdruecklich angeboten");
  await page.evaluate(() => document.querySelector('[data-etmin="pt_61"]').click());
  await page.waitForTimeout(800);
  p = await pts(page);
  const st61 = p.filter((x) => x.id === "pt_61")[0].standard;
  ok(st61.minimal === "Zwei proteinreiche Mahlzeiten", "erst die Bestaetigung ergaenzt die Minimalform");
  ok(st61.bestaetigt === true && st61.was && st61.bereich && st61.bestaetigtAm,
    "die kanonische Struktur bleibt vollstaendig erhalten");
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1400);
  p = await pts(page);
  ok(p.filter((x) => x.id === "pt_61")[0].standard.minimal === "Zwei proteinreiche Mahlzeiten",
    "die Aenderung bleibt nach Reload erhalten");
  const ergVor = JSON.stringify((await cyc(page)).everyday.results);
  /* „Nicht dauerhaft beibehalten" nur nach Bestaetigung. */
  await page.evaluate(() => {
    const c2 = JSON.parse(localStorage.getItem("mm_os_cycle"));
    c2.everyday.decisions.pt_60 = "nicht_behalten";
    localStorage.setItem("mm_os_cycle", JSON.stringify(c2));
  });
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1400);
  p = await pts(page);
  ok(p.filter((x) => x.id === "pt_60")[0].standard.aktiv !== false,
    "ohne Bestaetigung bleibt der Standard aktiv");
  const retBtn = await page.evaluate(() => !!document.querySelector('[data-etretire="pt_60"]'));
  ok(retBtn, "die Bestaetigung wird angeboten");
  await page.evaluate(() => document.querySelector('[data-etretire="pt_60"]').click());
  await page.waitForTimeout(800);
  p = await pts(page);
  const st60 = p.filter((x) => x.id === "pt_60")[0].standard;
  ok(st60.aktiv === false && !!st60.beendetAm, "erst die Bestaetigung beendet ihn");
  ok(st60.bestaetigt === true && st60.was && st60.bestaetigtAm, "die Historie bleibt unveraendert erhalten");
  ok(JSON.stringify((await cyc(page)).everyday.results) === ergVor,
    "das abgeschlossene Ergebnis bleibt eingefroren");
  await noOverflow(page, "Standardentscheidung");

  /* ---------------- F. Programmabschluss ------------------------------- */
  console.log("\n-- F. 12-Wochen-Abschluss --");
  body = await page.evaluate(() => document.body.innerText);
  ok(/DURCHLAUF IM ÜBERBLICK/.test(body), "die Abschlussuebersicht erscheint");
  const sum = await txt(page, ".os-etsum");
  ok(/Programmbeginn/.test(sum), "der Programmbeginn steht drin");
  ok(/Persönliche Standards/.test(sum), "die persoenlichen Standards ebenfalls");
  ok(/Alltagstest/.test(sum), "und das Ergebnis des Alltagstests");
  ok(!/Erfolgsquote|Gesamtnote|Punktzahl|Erfolgspunkte/.test(sum), "keine zweite Gesamtbewertung");
  ok(/lässt sich daraus nicht ableiten/.test(sum), "die Grenze der Aussage wird benannt");
  const naechste = await page.evaluate(() => {
    const s = document.getElementById("etNext");
    return s ? Array.from(s.options).map((o) => o.value).filter(Boolean) : [];
  });
  ok(naechste.length >= 5 && naechste.length <= 7, "genau eine naechste Hauptentscheidung mit knapper Liste (" + naechste.length + ")");
  const cycVor = JSON.stringify(await cyc(page));
  await page.selectOption("#etNext", "neu");
  await page.waitForTimeout(500);
  ok(JSON.stringify(await cyc(page)) === cycVor, "die Auswahl startet keinen neuen Durchlauf");
  const hinweis = await txt(page, "#etNextOut");
  ok(/bewusst im Programm/.test(hinweis), "sie benennt nur den naechsten Schritt: " + hinweis);
  const start2 = await page.evaluate(() => localStorage.getItem("mm_c2_start"));
  ok(JSON.parse(start2) === PROG_START, "das Programm wurde nicht verlaengert oder verschoben");
  await noOverflow(page, "Abschluss-Uebersicht");

  /* ---------------- G. mm_opt_points-Integritaet ----------------------- */
  console.log("\n-- G. Punkt und Massnahme getrennt --");
  const OFFEN = {
    id: "pt_70", area: "recovery", areaLabel: "Regeneration", title: "Abendliche Regeneration verbessern",
    status: "erkannt", source_type: "manual", source_id: "og1", entity_type: "optimization_point"
  };
  const MASS = {
    id: "pt_71", area: "recovery", areaLabel: "Regeneration", title: "Magnesium (abends)",
    measure_label_snapshot: "Magnesium (abends)", status: "in_umsetzung", source_type: "measure",
    entity_type: "measure", measure_source: "stack", measure_id: "magnesium",
    optimization_point_id: "pt_70", measure_started_at: ymd(plus(HEUTE, -5)),
    observation_days: 14, review_date: ymd(plus(HEUTE, 9))
  };
  /* Die Punkt-Uebersicht steht im Fortschritt, die Massnahmenpruefung im Plan —
     beide lesen dieselbe kanonische Liste und muessen sie sauber trennen. */
  await seed(page, Object.assign({}, BASIS, { opt_points: [OFFEN, MASS] }), "progress");
  const punktBlock = await page.evaluate(() => {
    const s = Array.from(document.querySelectorAll(".os-sec")).filter((x) => /^Optimierungspunkte/.test(x.textContent))[0];
    return s ? s.innerText : "";
  });
  ok(/Abendliche Regeneration/.test(punktBlock), "der Optimierungspunkt erscheint in seinem Block");
  ok(!/Magnesium/.test(punktBlock), "die Massnahme wird dort NICHT als Optimierungspunkt gerendert");
  await page.evaluate(() => { location.hash = "#plan"; });
  await page.waitForTimeout(1200);
  const massBlock = await page.evaluate(() => {
    const s = Array.from(document.querySelectorAll(".os-sec")).filter((x) => /^Maßnahmen prüfen/.test(x.textContent))[0];
    return s ? s.innerText : "";
  });
  ok(/Magnesium/.test(massBlock), "die Massnahme erscheint in ihrem eigenen Block");
  ok(/Optimierungspunkt: Abendliche Regeneration/.test(massBlock), "der Punkt erscheint dort nur als Verweis, nicht als eigene Massnahme");
  p = await pts(page);
  ok(p.length === 2, "es entstehen keine Duplikate (" + p.length + ")");
  ok(p.filter((x) => x.entity_type === "measure").length === 1, "genau eine Massnahme");
  /* Aufbewahrungsgrenze mit vielen abgeschlossenen Massnahmen. */
  await page.evaluate(() => {
    const l = JSON.parse(localStorage.getItem("mm_opt_points"));
    for (let i = 0; i < 70; i++) {
      l.push({
        id: "alt_" + i, title: "Alte Massnahme " + i, status: "abgeschlossen", source_type: "measure",
        entity_type: "measure", measure_source: "stack", measure_id: "x" + i, optimization_point_id: "pt_70",
        measure_started_at: "2026-01-01", measure_decision: "beendet"
      });
    }
    localStorage.setItem("mm_opt_points", JSON.stringify(l));
    /* Eine echte Mutation loest die Kappung aus. */
    window.MM.points.upsert({ area: "sleep", areaLabel: "Schlaf", title: "Ganz neuer Punkt", source_type: "manual", source_id: "neu1" });
  });
  p = await pts(page);
  ok(p.length === 60, "die Liste bleibt gekappt (" + p.length + ")");
  ok(p.some((x) => x.id === "pt_70"), "der offene Optimierungspunkt bleibt erhalten");
  ok(p.some((x) => x.id === "pt_71"), "die offene Massnahme bleibt erhalten");
  ok(p.some((x) => x.title === "Ganz neuer Punkt"), "und der neue Punkt ist da");
  await noOverflow(page, "Punkt-Integritaet");

  /* ---------------- H. Ende-zu-Ende ------------------------------------ */
  console.log("\n-- H. Ende zu Ende --");
  await seed(page, Object.assign({}, BASIS, {
    opt_points: [standardPunkt("pt_80", "Kein Koffein nach 14 Uhr", "Regeneration", "recovery", "Nach 16 Uhr keins", ymd(plus(HEUTE, -25)))],
    check_result: { total: 62, date: ymd(plus(HEUTE, -80)), bottleneck: { key: "recovery", name: "Regeneration" }, answers: {} }
  }));
  ok(await page.evaluate(() => !!document.getElementById("etStart")), "mit einem Standard ist der Alltagstest startbar");
  await page.evaluate(() => document.getElementById("etStart").click());
  await page.waitForTimeout(900);
  ok(!!(await cyc(page)).everyday, "er startet");
  await page.evaluate(() => { location.hash = "#today"; });
  await page.waitForTimeout(1200);
  ok(await page.evaluate(() => !!document.querySelector('[data-etday="normal"]')), "die Tageserfassung ist erreichbar");
  await page.evaluate(() => document.querySelector('[data-etday="normal"]').click());
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1300);
  ok((await cyc(page)).everyday.days[T0], "der Eintrag ueberlebt den Reload");
  await tageFuellen(page, ["normal", "normal", "normal", "minimal", "normal", "normal", "normal"]);
  await page.evaluate(() => { location.hash = "#progress"; });
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1500);
  await page.selectOption('[data-etdec="pt_80"]', "beibehalten");
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById("etDone").click());
  await page.waitForTimeout(900);
  c = await cyc(page);
  ok(!!c.everyday.completed_at, "die Ergebnispruefung schliesst ab");
  body = await page.evaluate(() => document.body.innerText);
  ok(/DURCHLAUF IM ÜBERBLICK/.test(body), "der 12-Wochen-Abschluss ist erreichbar");
  const score = await page.evaluate(() => JSON.parse(localStorage.getItem("mm_check_result")));
  ok(score.total === 62, "das Score-Ergebnis ist unveraendert");
  const hist = await page.evaluate(() => localStorage.getItem("mm_check_history"));
  ok(hist === null, "kein zweiter Score wurde erzeugt");
  ok((await page.evaluate(() => localStorage.getItem("mm_focus"))) === null, "kein Auftrag startete automatisch");
  ok(!(await pts(page)).some((x) => x.entity_type === "measure"), "keine Massnahme startete automatisch");
  ok(JSON.parse(await page.evaluate(() => localStorage.getItem("mm_account_entitlements"))).length === 2,
    "keine Zugriffskontrolle wurde umgangen");

  /* ---------------- Querschnitt ---------------------------------------- */
  console.log("\n-- Querschnitt --");
  const abgeschnitten = await page.evaluate(() => {
    const s = document.querySelector(".os-etbox");
    if (!s) return -1;
    return Array.from(s.querySelectorAll("button, select, label, p, b")).filter((e) => e.scrollWidth - e.clientWidth > 1).length;
  });
  ok(abgeschnitten === 0, "keine abgeschnittenen Schaltflaechen oder Labels (" + abgeschnitten + ")");
  const klein = await page.evaluate(() => {
    const s = document.querySelector(".os-etbox");
    if (!s) return 99;
    return Math.min.apply(null, Array.from(s.querySelectorAll("p, select, button, b")).map((e) => parseFloat(getComputedStyle(e).fontSize)));
  });
  ok(klein >= 11, "keine unlesbar kleine Typografie (" + klein + "px)");
  const treffer = await page.evaluate(() => {
    const b = document.querySelector(".os-etbox button");
    if (!b) return 99;
    return b.getBoundingClientRect().height;
  });
  ok(treffer >= 32, "Bedienelemente sind gross genug (" + Math.round(treffer) + "px)");
  /* Nach dem Abschluss enthaelt der Block Schaltflaechen statt Auswahlfelder —
     geprueft wird deshalb das erste vorhandene Bedienelement. */
  const fokus = await page.evaluate(() => {
    const s = document.querySelector(".os-etbox select, .os-etbox button, .os-etbox a, #etNext");
    if (!s) return "KEIN BEDIENELEMENT";
    s.focus();
    return document.activeElement === s ? "ok" : "NICHT FOKUSSIERBAR";
  });
  ok(fokus === "ok", "das Bedienelement ist per Tastatur erreichbar (" + fokus + ")");
  const ring = await page.evaluate(() => {
    const s = document.querySelector("#etNext") || document.querySelector(".os-etbox button");
    if (!s) return "";
    s.focus();
    const st = getComputedStyle(s);
    return st.outlineStyle + "/" + st.outlineWidth;
  });
  ok(!/none\/0px/.test(ring) || ring === "", "der Fokus ist sichtbar (" + ring + ")");
  /* 200-%-Textzoom, soweit mit dem bestehenden Setup pruefbar. */
  await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
  await page.waitForTimeout(400);
  await noOverflow(page, "bei 200-%-Textzoom");
  await page.evaluate(() => { document.documentElement.style.fontSize = ""; });

  /* Direkte URL und Browser-Zurueck. */
  await page.goto(BASE + "mein-protokoll.html#progress", { waitUntil: "load" });
  await page.waitForTimeout(1300);
  ok(await page.evaluate(() => /Alltagstest/.test(document.body.innerText)), "die direkte URL fuehrt zum Abschlussbereich");
  await page.evaluate(() => { location.hash = "#today"; });
  await page.waitForTimeout(700);
  await page.goBack(); await page.waitForTimeout(900);
  ok(await page.evaluate(() => /Alltagstest/.test(document.body.innerText)), "Browser-Zurueck funktioniert");

  ok(errs.length === 0, "keine JavaScript-Fehler" + (errs.length ? ": " + errs.join(" | ") : ""));
  await browser.close();
}

(async () => {
  console.log("Heute: " + T0 + " · Programmstart: " + PROG_START);
  await run(390);
  await run(1440);
  console.log("\n==============================");
  console.log(fail ? "FAILS: " + fail : "ALLE BROWSER-PRUEFUNGEN BESTANDEN");
  console.log("EXIT=" + (fail ? 1 : 0));
  process.exit(fail ? 1 : 0);
})();
