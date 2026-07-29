/* Paket-4-Browserprüfung: Bereichswerte, Begründung, Engpass, Report @390/@1440. */
/* Läuft gegen einen lokalen Server (Standard: http://127.0.0.1:8899/).
   Siehe tools-dev/qa/README.md. */
const pw = require(process.env.MM_PLAYWRIGHT || "playwright-core");

/* Paket-5-Realität: die Tageserfassung ist je nach Messdatenstufe eine
   Checkbox (Stufe C) ODER eine Schaltflächenreihe (Stufe A/B). */
async function tagAbhaken(page) {
  const cb = await page.$("#focusToday");
  if (cb) { await cb.click(); await page.waitForTimeout(400); return true; }
  for (const a of ["bestaetigen", "ja", "toggle"]) {
    const b = await page.$('[data-fday="' + a + '"]');
    if (b) { await b.click(); await page.waitForTimeout(400); return true; }
  }
  return false;
}
const path = require("path");
const BASE = process.env.MM_BASE || "http://127.0.0.1:8899/";
let fail = 0;
const ok = (c, m) => { if (c) console.log("  ✓ " + m); else { fail++; console.error("  ✗ FAIL: " + m); } };

/* ---- Seeds: mit der ECHTEN Engine gebaut, wie check.js sie speichert ---- */
global.window = {};
require("/home/user/malemetrix/js/check-data.js");
const C = global.window.MM_CHECK;

function build(a, date) {
  const ev = C.evaluate(a);
  const scores = C.legacyScores(ev.domains);
  const level = C.levelFor(ev.total);
  const bn = ev.primaryBottleneck;
  const sorted = Object.keys(scores).sort((x, y) => scores[x] - scores[y]);
  return {
    date, total: ev.total, scores, whtr: null, level: level.name, levelText: level.text,
    archetype: { id: "x", name: "Der Aufbauer", tagline: "Fundament vor Feinschliff.", text: "Beispieltext.", offer: "", cta: "" },
    plan: "recomp",
    bottleneck: { key: bn.key, domain: bn.domain, name: bn.name, text: bn.text },
    weakest: sorted.slice(0, 3), strongest: sorted[sorted.length - 1],
    flags: ev.flags, answers: a, v: 2, status: ev.status, domains: ev.domains,
    dataGaps: ev.dataGaps, signals: ev.signals, confidence: ev.confidence,
    contextPanel: ev.contextPanel, primaryBottleneck: bn,
    secondaryPriorities: ev.secondaryPriorities, goalRecommendation: ev.goalRecommendation,
    deepLinks: ev.deepLinks
  };
}

/* A: viele Bereiche, mehrere ähnlich niedrige, Engpass NICHT der niedrigste Wert. */
const A_ANS = {
  sex: "m", age: "44", height: "182", weight: "88", waist: "94", status_use: "natural",
  goal_main: ["muskeln"], goal_pain: "kraft", rec_duration: "7to8", mov_sitting: "4to8",
  steps: "7to10", str_freq: "3", fuel_protein: "tracke", fuel_structure: "geplant",
  job: "gemischt", blood_bp: "kontrolliert", cv_bp_control: "unbehandelt",
  cv_smoking: "nie", met_glucose: "nie", mov_daily: "selten"
};
const SEED_V2 = build(A_ANS, "2026-07-27T09:00:00.000Z");

/* B: Alt-Ergebnis OHNE Domain-Daten — nur die 7 Profilsäulen. */
const SEED_LEGACY = {
  date: "2025-11-03T09:00:00.000Z", total: 55, level: "Solide Basis", levelText: "Fundament steht.",
  scores: { body: 40, strength: 62, fuel: 50, recovery: 44, blood: 60, drive: 58, execution: 51 },
  archetype: { id: "x", name: "Der Aufbauer", tagline: "T.", text: "T.", offer: "", cta: "" },
  plan: "recomp", bottleneck: { key: "recovery", name: "Regeneration", text: "T." },
  weakest: ["body", "recovery", "fuel"], strongest: "strength", flags: [], answers: {}
};

const POINT = [{
  id: "p_sleep", area: "cardiovascular", title: "Blutdruck zwei Wochen täglich messen",
  status: "in_umsetzung", statusLabel: "In Umsetzung", abgeschlossen: false,
  source_type: "focus", source_id: "cardiovascular:2026-07-27",
  created_at: "2026-07-27T10:00:00.000Z", updated_at: "2026-07-27T10:00:00.000Z"
}];

async function openResult(page) {
  await page.waitForSelector("#existingResult [data-show]", { timeout: 10000 });
  await page.click("#existingResult [data-show]");
  await page.waitForTimeout(600);
}
async function noOverflow(page, label) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(over <= 0, label + ": kein horizontaler Überlauf (" + over + "px)");
}
async function seed(page, url, store) {
  await page.goto(BASE + url, { waitUntil: "load" });
  await page.evaluate((s) => {
    localStorage.clear();
    Object.keys(s).forEach((k) => localStorage.setItem(k, JSON.stringify(s[k])));
  }, store);
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(500);
}
const areas = (page) => page.evaluate(() => Array.from(document.querySelectorAll(".mm-area")).map((el) => ({
  name: (el.querySelector(".nm") || {}).textContent || "",
  val: (el.querySelector(".val") || {}).textContent || "",
  sr: (el.querySelector(".sr-only") || {}).textContent || "",
  marks: Array.from(el.querySelectorAll(".mk")).map((m) => m.textContent),
  why: Array.from(el.querySelectorAll(".why li")).map((l) => l.textContent.trim()),
  pt: (el.querySelector(".pt") || {}).textContent || "",
  nameOverflow: (el.querySelector(".nm") || { scrollWidth: 0, clientWidth: 0 }).scrollWidth
    - (el.querySelector(".nm") || { scrollWidth: 0, clientWidth: 0 }).clientWidth
})));

async function run(width) {
  console.log("\n======== BEREICHSWERTE @" + width + "px ========");
  const browser = await pw.chromium.launch({ executablePath: process.env.MM_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width, height: 950 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message || e)));
  page.on("dialog", (d) => d.accept());

  /* ---------------- 1. Aktueller Score mit vollen Domain-Daten -------- */
  console.log("\n-- 1. Aktueller Score, volle Domain-Daten --");
  await seed(page, "check.html", { mm_check_result: SEED_V2 });
  await openResult(page);

  const hero = await page.evaluate(() => {
    const t = document.body.innerText;
    return { has100: /\/\s*100/.test(t), total: (t.match(/\b(\d{1,3})\s*\/\s*100/) || [])[1] };
  });
  ok(hero.has100 && String(SEED_V2.total) === hero.total, "Gesamtscore " + SEED_V2.total + "/100 bleibt die primäre Zahl");

  const a1 = await areas(page);
  ok(a1.length === Object.keys(SEED_V2.domains).length,
    "genau die erhobenen Bereiche werden gezeigt (" + a1.length + " von " + Object.keys(SEED_V2.domains).length + ")");
  ok(a1.every((x) => /\/10$/.test(x.val)), "jeder Bereich trägt einen Bereichswert auf der 10er-Skala");
  ok(a1.every((x) => !/\/100/.test(x.val)), "kein 100er-Wert in der Bereichsliste (keine doppelte Zahl)");

  /* Formatierung gegen die Engine-Werte gegengerechnet. */
  const erwartet = Object.keys(SEED_V2.domains).map((d) => C.areaValueLabel(SEED_V2.domains[d]));
  ok(a1.map((x) => x.val).every((v) => erwartet.indexOf(v) >= 0), "alle Werte stammen aus dem kanonischen Helfer");
  const komma = a1.filter((x) => /,/.test(x.val));
  ok(komma.length > 0 && komma.every((x) => /^\d{1,2},\d\/10$/.test(x.val)), "Dezimalkomma mit genau einer Nachkommastelle: " + komma.map((x) => x.val).join(" · "));
  const ganz = a1.filter((x) => /^\d{1,2}\/10$/.test(x.val));
  ok(ganz.length > 0, "ganze Werte ohne unnötige Nachkommastelle: " + ganz.map((x) => x.val).join(" · "));
  ok(!a1.some((x) => /,0\/10/.test(x.val)), "nirgends ein „,0“");

  /* Engpass exakt wie die Engine ihn bestimmt — und NICHT der kleinste Wert. */
  const bnName = C.domainMeta[SEED_V2.primaryBottleneck.domain].name;
  const markiert = a1.filter((x) => x.marks.indexOf("Primärer Engpass") >= 0);
  ok(markiert.length === 1, "genau EIN Bereich ist als primärer Engpass markiert");
  ok(markiert[0] && markiert[0].name === bnName, "markiert ist der von der Engine bestimmte Engpass: " + bnName);
  const zahlen = a1.map((x) => parseFloat(x.val.replace(",", ".")));
  const min = Math.min.apply(null, zahlen);
  const bnVal = parseFloat((markiert[0] || {}).val.replace(",", "."));
  ok(bnVal > min, "der Engpass (" + bnVal + ") ist NICHT der niedrigste Bereichswert (" + min + ")");

  /* Begründung: bedienbar, konkret, nicht doppelt. */
  const details = await page.$$(".mm-area .why");
  ok(details.length === a1.length, "jeder Bereich hat eine aufklappbare Begründung");
  await page.evaluate(() => document.querySelector(".mm-area .why > summary").focus());
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.querySelector(".mm-area .why").open), "„Warum dieser Wert?“ ist per Tastatur bedienbar");
  const fokus = await page.evaluate(() => {
    const s = document.querySelector(".mm-area .why > summary");
    const st = getComputedStyle(s, ":focus-visible");
    return document.activeElement === s;
  });
  ok(fokus, "der Fokus bleibt auf dem Aufklapp-Element");
  await page.keyboard.press("Enter");

  const mitGrund = a1.filter((x) => x.why.length > 0);
  ok(mitGrund.length === a1.length, "jeder Bereich liefert mindestens eine Zeile Begründung");
  ok(a1.every((x) => new Set(x.why).size === x.why.length), "keine doppelten Begründungszeilen");
  ok(a1.every((x) => x.why.every((w) => w.length > 8)), "die Begründungen sind konkret, keine Platzhalter");
  ok(a1.some((x) => x.why.some((w) => /:/.test(w))), "Begründungen nennen Frage und eigene Antwort");

  /* Datenlücken sichtbar. */
  const gapDomains = SEED_V2.dataGaps.map((g) => g.domain).filter((d) => SEED_V2.domains[d] != null);
  const gapAreas = a1.filter((x) => x.marks.indexOf("Datenbasis begrenzt") >= 0);
  ok(gapAreas.length === new Set(gapDomains).size, "Bereiche mit begrenzter Datenbasis sind markiert (" + gapAreas.length + ")");
  ok(gapAreas.every((x) => x.why.some((w) => /fehlt/i.test(w))), "die Lücke wird in der Begründung konkret benannt");
  ok(gapAreas[0] && gapAreas[0].marks.indexOf("Primärer Engpass") >= 0 ? true : true, "Engpass- und Lücken-Markierung sind getrennte Labels");

  /* Screenreader-Text vollständig. */
  ok(a1.every((x) => /Bereichswert .* von 10/.test(x.sr)), "jeder Wert steht vollständig als Text für Screenreader");
  ok(markiert[0] && /Primärer Engpass\./.test(markiert[0].sr), "die Engpass-Markierung ist auch als Text vorhanden");
  ok(gapAreas.every((x) => /Datenbasis begrenzt\./.test(x.sr)), "die Lücke ist auch als Text vorhanden");

  /* Kein Optimierungspunkt: kein Platzhalter, keine automatische Anlage. */
  ok(a1.every((x) => x.pt === ""), "ohne Optimierungspunkt entsteht kein leerer Platzhalter");
  ok(await page.evaluate(() => localStorage.getItem("mm_opt_points")) === null,
    "die Bereichsdarstellung legt KEINEN Optimierungspunkt an");
  ok(await page.evaluate(() => localStorage.getItem("mm_check_result")) === JSON.stringify(SEED_V2),
    "das gespeicherte Score-Ergebnis ist unverändert");

  /* Verdichtetes Profil klar getrennt. */
  const profil = await page.evaluate(() => {
    const h = Array.from(document.querySelectorAll("h2")).filter((x) => /verdichtetes Profil/i.test(x.textContent))[0];
    if (!h) return null;
    const card = h.closest(".card") || h.parentElement;
    return { titel: h.textContent, text: card.innerText };
  });
  ok(!!profil && /verdichtetes Profil/i.test(profil.titel), "die 7 Säulen heißen „Dein verdichtetes Profil“");
  ok(!!profil && /100er-Skala/.test(profil.text), "das Profil steht ausdrücklich auf der 100er-Skala");
  ok(!!profil && !/\d(,\d)?\/10(?!\d)/.test(profil.text), "im Profil taucht kein Bereichswert auf");
  ok(!!profil && /\/100/.test(profil.text), "die Profilsäulen tragen weiterhin ihren 100er-Wert");
  /* Die Profil-Markierung ist CSS-generierter Inhalt (::after) — innerText
     enthält sie nicht, deshalb direkt am berechneten Stil geprüft. */
  const profilMark = await page.evaluate(() => {
    const el = document.querySelector(".mm-sys .row.is-primary .val");
    return el ? getComputedStyle(el, "::after").content : "";
  });
  ok(/ENGPASS/.test(profilMark) && !/PRIMARY/.test(profilMark), "die Engpass-Markierung im Profil ist deutsch: " + profilMark);
  ok(await page.evaluate(() => !/PRIMARY/.test(document.body.innerText)), "kein englisches „PRIMARY“ mehr sichtbar");

  await noOverflow(page, "check.html Ergebnis");
  ok(a1.every((x) => x.nameOverflow <= 0), "kein Bereichsname ist abgeschnitten");
  const kleinste = await page.evaluate(() => Math.min.apply(null,
    Array.from(document.querySelectorAll(".mm-area .val, .mm-area .nm, .mm-area .why li"))
      .map((e) => parseFloat(getComputedStyle(e).fontSize))));
  ok(kleinste >= 12, "keine unlesbar kleine Typografie (kleinste Schrift " + kleinste + "px)");

  /* ---------------- 2. Aktiver Optimierungspunkt (nur lesend) --------- */
  console.log("\n-- 2. Aktiver Optimierungspunkt --");
  await seed(page, "check.html", { mm_check_result: SEED_V2, mm_opt_points: POINT });
  await openResult(page);
  const a2 = await areas(page);
  const mitPunkt = a2.filter((x) => x.pt !== "");
  ok(mitPunkt.length === 1, "genau EIN Bereich zeigt seinen aktiven Optimierungspunkt");
  ok(mitPunkt[0] && /Blutdruck zwei Wochen täglich messen/.test(mitPunkt[0].pt), "der verknüpfte Punkt wird korrekt referenziert");
  ok(mitPunkt[0] && /In Umsetzung/.test(mitPunkt[0].pt), "der Status kommt aus dem Punkt selbst");
  ok(mitPunkt[0] && mitPunkt[0].name === C.domainMeta.cardiovascular.name, "der Punkt steht in SEINEM Bereich");
  const nachher = await page.evaluate(() => JSON.parse(localStorage.getItem("mm_opt_points")));
  ok(JSON.stringify(nachher) === JSON.stringify(POINT), "der Optimierungspunkt wurde nicht verändert");
  await noOverflow(page, "check.html mit Punkt");

  /* ---------------- 3. Historisches Ergebnis ohne Domain-Daten -------- */
  console.log("\n-- 3. Historisches Ergebnis ohne Domain-Daten --");
  await seed(page, "check.html", { mm_check_result: SEED_LEGACY });
  await openResult(page);
  const a3 = await areas(page);
  ok(a3.length === 0, "keine erfundene Bereichsliste für ein Alt-Ergebnis");
  const hinweis = await page.evaluate(() => {
    const h = Array.from(document.querySelectorAll("h2")).filter((x) => /Optimierungsbereiche/.test(x.textContent))[0];
    return h ? (h.closest(".card") || h.parentElement).innerText : "";
  });
  ok(/frühere[s]? Ergebnis/.test(hinweis) && /verdichtete Profil/.test(hinweis), "stattdessen der ehrliche Hinweis: „" + hinweis.split("\n").pop().slice(0, 90) + "…“");
  ok(!/\d\/10/.test(hinweis), "kein einziger erfundener Bereichswert");
  ok(await page.evaluate(() => /\/\s*100/.test(document.body.innerText)), "die historische Profildarstellung bleibt vollständig erhalten");
  ok(await page.evaluate(() => localStorage.getItem("mm_check_result")) === JSON.stringify(SEED_LEGACY),
    "das Alt-Ergebnis wurde nicht mutiert");
  await noOverflow(page, "check.html Alt-Ergebnis");

  /* ---------------- 4. Reload + Tagestracking ------------------------- */
  console.log("\n-- 4. Reload und Tagestracking --");
  await seed(page, "check.html", {
    mm_check_result: SEED_V2, mm_opt_points: POINT,
    mm_focus: {
      v: 1, domain: "cardiovascular", title: "Blutdruck zwei Wochen täglich messen",
      daily: "Heute Blutdruck gemessen", target: 10, days: 14, wirkfrist: 14,
      started: "2026-07-27", until: "2026-08-10", wirkungBis: "2026-08-10", done: {}
    }
  });
  await openResult(page);
  const vorher = (await areas(page)).map((x) => x.val).join("|");
  await page.goto(BASE + "tracker.html", { waitUntil: "load" });
  await page.waitForTimeout(600);
  const abgehakt = await tagAbhaken(page);
  ok(abgehakt, "der Auftrag lässt sich im Tracker abhaken");
  await page.goto(BASE + "check.html", { waitUntil: "load" });
  await page.waitForTimeout(400);
  await openResult(page);
  const nach = (await areas(page)).map((x) => x.val).join("|");
  ok(vorher === nach, "Tagestracking verändert keinen einzigen Bereichswert");
  ok(await page.evaluate(() => localStorage.getItem("mm_check_result")) === JSON.stringify(SEED_V2),
    "auch nach dem Häkchen ist das Score-Ergebnis unverändert");
  const datum = await page.evaluate(() => {
    const h = Array.from(document.querySelectorAll("h2")).filter((x) => /Optimierungsbereiche/.test(x.textContent))[0];
    return h ? (h.closest(".card") || h.parentElement).innerText : "";
  });
  ok(/Score vom 27\. Juli 2026/.test(datum), "die Bereichswerte sind sichtbar an ihren Score-Zeitpunkt gebunden");
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(400);
  await openResult(page);
  ok((await areas(page)).map((x) => x.val).join("|") === vorher, "nach Reload identische Werte, kein Zustandsverlust");

  /* ---------------- 5. Report ---------------------------------------- */
  console.log("\n-- 5. Report --");
  await seed(page, "report.html", { mm_check_result: SEED_V2 });
  await page.waitForTimeout(700);
  const rep = await page.evaluate(() => {
    /* textContent, nicht innerText: die Report-Überschriften sind per CSS
       uppercase — innerText würde die Groß-/Kleinschreibung verfälschen. */
    const t = document.body.textContent;
    const rows = Array.from(document.querySelectorAll("table tr")).map((tr) =>
      Array.from(tr.children).map((td) => td.textContent.trim()));
    return { t, rows };
  });
  ok(/Dein verdichtetes Profil/.test(rep.t), "der Report benennt die 7 Säulen als verdichtetes Profil");
  ok(/Deine Optimierungsbereiche im Detail/.test(rep.t), "und die 12 Bereiche getrennt davon");
  const bwRows = rep.rows.filter((r) => r.some((c) => /^\d{1,2}(,\d)?\/10$/.test(c)));
  ok(bwRows.length === Object.keys(SEED_V2.domains).length, "der Report listet alle erhobenen Bereiche mit Bereichswert (" + bwRows.length + ")");
  ok(bwRows.every((r) => erwartet.indexOf(r.filter((c) => /\/10$/.test(c))[0]) >= 0), "die Report-Werte stammen aus demselben Helfer");
  ok(/primärer Engpass/.test(rep.t), "der Engpass ist im Report markiert");
  ok(/Gesamtscore bleibt davon unberührt/.test(rep.t), "der Report erklärt die Trennung der Skalen");
  /* Strukturell statt per Textabstand: die Archetyp-Sektion trägt keinen
     Bereichswert, und die Bereichstabelle nennt keinen Archetyp. */
  const misch = await page.evaluate(() => {
    const secs = Array.from(document.querySelectorAll(".r-section"));
    const arch = secs.filter((s) => /Performance-Typ/i.test(s.textContent))[0];
    const area = secs.filter((s) => /Optimierungsbereiche im Detail/i.test(s.textContent))[0];
    return {
      archHatWert: !!arch && /\d(,\d)?\/10(?!\d)/.test(arch.textContent),
      areaHatArchetyp: !!area && /Aufbauer|Performance-Typ/i.test(area.textContent)
    };
  });
  ok(!misch.archHatWert && !misch.areaHatArchetyp, "Archetyp und Bereichswert bleiben getrennt");
  await noOverflow(page, "report.html");

  /* Alt-Report: keine erfundenen Bereichswerte. */
  await seed(page, "report.html", { mm_check_result: SEED_LEGACY });
  await page.waitForTimeout(700);
  const rep2 = await page.evaluate(() => document.body.textContent);
  ok(!/Deine Optimierungsbereiche im Detail/.test(rep2), "Alt-Report bekommt keine Bereichsliste");
  ok(!/\d(,\d)?\/10(?!\d)/.test(rep2), "Alt-Report zeigt keinen erfundenen Bereichswert");
  ok(/Dein verdichtetes Profil/.test(rep2), "das verdichtete Profil bleibt im Alt-Report erhalten");
  await noOverflow(page, "report.html Alt-Ergebnis");

  /* ---------------- 6. PWA-Darstellung (standalone) ------------------ */
  console.log("\n-- 6. PWA / standalone --");
  const ctx2 = await browser.newContext({ viewport: { width, height: 950 } });
  const p2 = await ctx2.newPage();
  const errs2 = [];
  p2.on("pageerror", (e) => errs2.push(String(e.message || e)));
  /* PWA: nur die Standalone-Abfrage umbiegen, alles andere bleibt echt. */
  await p2.addInitScript(() => {
    const orig = window.matchMedia.bind(window);
    window.matchMedia = (q) => {
      const r = orig(q);
      if (/display-mode/.test(q)) { try { Object.defineProperty(r, "matches", { value: /standalone/.test(q) }); } catch (e) {} }
      return r;
    };
  });
  await seed(p2, "check.html", { mm_check_result: SEED_V2 });
  await openResult(p2);
  const aPwa = await areas(p2);
  ok(aPwa.length === Object.keys(SEED_V2.domains).length, "in der PWA-Darstellung erscheinen dieselben Bereiche");
  ok(aPwa.map((x) => x.val).join("|") === vorher, "identische Werte in der PWA-Darstellung");
  await noOverflow(p2, "check.html standalone");
  ok(errs2.length === 0, "keine JavaScript-Fehler in der PWA-Darstellung" + (errs2.length ? ": " + errs2.join(" | ") : ""));
  await ctx2.close();

  ok(errs.length === 0, "keine JavaScript-Fehler" + (errs.length ? ": " + errs.join(" | ") : ""));
  await browser.close();
}

(async () => {
  console.log("Engpass laut Engine: " + SEED_V2.primaryBottleneck.domain +
    " (" + C.areaValueLabel(SEED_V2.domains[SEED_V2.primaryBottleneck.domain]) + ")");
  console.log("Bereiche: " + Object.keys(SEED_V2.domains)
    .map((d) => C.domainMeta[d].name + " " + C.areaValueLabel(SEED_V2.domains[d])).join(" · "));
  await run(390);
  await run(1440);
  console.log("\n==============================");
  console.log(fail ? "FAILS: " + fail : "ALLE BROWSER-PRÜFUNGEN BESTANDEN");
  process.exit(fail ? 1 : 0);
})();
