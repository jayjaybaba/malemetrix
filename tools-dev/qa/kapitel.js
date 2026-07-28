/* Paket-6-Browserprüfung: Kapitelempfehlung und Deep-Links @390/@1440. */
/* Läuft gegen einen lokalen Server (Standard: http://127.0.0.1:8899/).
   Siehe tools-dev/qa/README.md. */
const pw = require(process.env.MM_PLAYWRIGHT || "playwright-core");
const BASE = process.env.MM_BASE || "http://127.0.0.1:8899/";
let fail = 0;
const ok = (c, m) => { if (c) console.log("  OK  " + m); else { fail++; console.error("  FAIL: " + m); } };

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
    archetype: { id: "x", name: "Der Aufbauer", tagline: "T.", text: "T.", offer: "", cta: "" },
    plan: "recomp", bottleneck: { key: bn.key, domain: bn.domain, name: bn.name, text: bn.text },
    weakest: sorted.slice(0, 3), strongest: sorted[sorted.length - 1], flags: ev.flags, answers: a,
    v: 2, status: ev.status, domains: ev.domains, dataGaps: ev.dataGaps, signals: ev.signals,
    confidence: ev.confidence, contextPanel: ev.contextPanel, primaryBottleneck: bn,
    secondaryPriorities: ev.secondaryPriorities, goalRecommendation: ev.goalRecommendation,
    deepLinks: ev.deepLinks
  };
}

/* Engpass = Schlaf: klare Gründe, klarer Abschnitt. */
const A_ANS = {
  sex: "m", age: "44", height: "182", weight: "88", waist: "94", status_use: "natural",
  goal_main: ["muskeln"], goal_pain: "energie", rec_duration: "lt5", mov_sitting: "4to8",
  steps: "7to10", str_freq: "3", fuel_protein: "tracke", fuel_structure: "geplant", job: "gemischt"
};
const SEED = build(A_ANS, "2026-07-28T09:00:00.000Z");
const SEED_LEGACY = {
  date: "2025-11-03T09:00:00.000Z", total: 55, level: "Solide Basis", levelText: "T.",
  scores: { body: 40, strength: 62, fuel: 50, recovery: 44, blood: 60, drive: 58, execution: 51 },
  archetype: { id: "x", name: "Der Aufbauer", tagline: "T.", text: "T.", offer: "", cta: "" },
  plan: "recomp", bottleneck: { key: "recovery", name: "Regeneration", text: "T." },
  weakest: ["body", "recovery", "fuel"], strongest: "strength", flags: [], answers: {}
};

async function openResult(page) {
  await page.waitForSelector("#existingResult [data-show]", { timeout: 10000 });
  await page.click("#existingResult [data-show]");
  await page.waitForTimeout(600);
}
async function seed(page, url, store) {
  await page.goto(BASE + url, { waitUntil: "load" });
  await page.evaluate((s) => { localStorage.clear(); Object.keys(s).forEach((k) => localStorage.setItem(k, JSON.stringify(s[k]))); }, store);
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(500);
}
async function noOverflow(page, label) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(over <= 0, label + ": kein horizontaler Ueberlauf (" + over + "px)");
}
const empfehlung = (page) => page.evaluate(() => {
  const e = document.querySelector(".mm-chap");
  if (!e) return null;
  const a = e.querySelector("a");
  return {
    kicker: (e.querySelector(".ch-kicker") || {}).textContent || "",
    sec: (e.querySelector(".ch-sec") || {}).textContent || "",
    src: (e.querySelector(".ch-src") || {}).textContent || "",
    why: (e.querySelector(".ch-why") || {}).textContent || "",
    gruende: Array.from(e.querySelectorAll(".ch-list li")).map((x) => x.textContent.trim()),
    href: a ? a.getAttribute("href") : null,
    aria: a ? a.getAttribute("aria-label") : null,
    text: e.innerText
  };
});
const bereichsLinks = (page) => page.evaluate(() => Array.from(document.querySelectorAll(".mm-area")).map((el) => ({
  name: (el.querySelector(".nm") || {}).textContent || "",
  primary: el.classList.contains("is-primary"),
  sec: el.querySelector(".sec a") ? el.querySelector(".sec a").textContent : null,
  href: el.querySelector(".sec a") ? el.querySelector(".sec a").getAttribute("href") : null,
  aria: el.querySelector(".sec a") ? el.querySelector(".sec a").getAttribute("aria-label") : null
})));

async function run(width) {
  console.log("\n======== KAPITELEMPFEHLUNG @" + width + "px ========");
  const browser = await pw.chromium.launch({ executablePath: process.env.MM_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width, height: 950 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message || e)));
  page.on("dialog", (d) => d.accept());

  /* ---------------- A. Primaerer Engpass ----------------------------- */
  console.log("\n-- A. Primaerer Engpass --");
  await seed(page, "check.html", { mm_check_result: SEED });
  await openResult(page);
  const erwartet = C.chapterFor(SEED.primaryBottleneck.domain);
  const e = await empfehlung(page);
  ok(!!e, "die Empfehlung erscheint beim primaeren Engpass");
  ok(e && /Empfohlenes Kapitel/i.test(e.kicker), "sie ist als empfohlenes Kapitel benannt");
  ok(e && e.sec === erwartet.sectionLabel, "der konkrete Abschnitt steht da: " + (e ? e.sec : ""));
  ok(e && e.src.indexOf("Kapitel " + erwartet.chapterNr) >= 0, "samt Kapitelnummer: " + (e ? e.src : ""));
  ok(e && e.src.indexOf(erwartet.chapterLabel) >= 0, "und Kapitelname");
  ok(e && /Empfohlen, weil/.test(e.why), "die Begruendung ist ueberschrieben");
  ok(e && e.gruende.length > 0 && e.gruende.length <= 4, "zwei bis drei konkrete Gruende (" + (e ? e.gruende.length : 0) + ")");
  ok(e && e.gruende.some((g) => /Stunden|Schlaf/i.test(g)), "die Gruende sind echte Score-Antworten: " + (e ? e.gruende[0] : ""));
  ok(e && new Set(e.gruende).size === e.gruende.length, "keine wiederholten Aussagen");
  ok(e && e.href === erwartet.hrefSection, "der Link zeigt auf Kapitel + Abschnitt: " + (e ? e.href : ""));
  ok(e && /#abschnitt-/.test(e.href || ""), "mit echtem Abschnittsanker");
  ok(e && /DAS PROTOKOLL/.test(e.aria || "") && /Abschnitt/.test(e.aria || ""), "zugaenglicher Name mit Kontext: " + (e ? e.aria : ""));
  ok(await page.evaluate(() => !document.querySelector(".mm-chap .mm-metric, .mm-chap .v")), "keine zweite grosse Hero-Zahl");
  ok(await page.evaluate(() => localStorage.getItem("mm_opt_points")) === null, "kein Optimierungspunkt wird erzeugt");
  ok(await page.evaluate(() => localStorage.getItem("mm_focus")) === null, "kein Auftrag wird automatisch gestartet");
  ok(await page.evaluate(() => localStorage.getItem("mm_check_result")) === JSON.stringify(SEED), "das Score-Ergebnis bleibt unveraendert");
  await noOverflow(page, "Ergebnisseite");

  /* Tastatur + Fokus */
  await page.evaluate(() => document.querySelector(".mm-chap a").focus());
  const fokus = await page.evaluate(() => {
    const a = document.querySelector(".mm-chap a");
    const s = getComputedStyle(a);
    return { aktiv: document.activeElement === a, outline: s.outlineStyle !== "none" || s.boxShadow !== "none" };
  });
  ok(fokus.aktiv, "die Schaltflaeche ist per Tastatur erreichbar");

  /* Deep-Link folgen */
  await page.keyboard.press("Enter");
  await page.waitForTimeout(900);
  const ziel = await page.evaluate(() => {
    const el = document.querySelector('[id^="abschnitt-"]');
    const h1 = document.querySelector("h1");
    return {
      url: location.href, hash: location.hash,
      h1: h1 ? h1.textContent.trim() : "",
      zielSichtbar: (function () {
        const t = document.querySelector(location.hash || "#nichts");
        if (!t) return false;
        const r = t.getBoundingClientRect();
        return r.top >= -5 && r.top < window.innerHeight;
      })(),
      zielText: (function () { const t = document.querySelector(location.hash || "#nichts"); return t ? t.textContent.trim() : ""; })()
    };
  });
  ok(/schlaf-energie\.html/.test(ziel.url), "der Link oeffnet das richtige Kapitel: " + ziel.url.split("/").pop());
  ok(ziel.hash === "#abschnitt-" + erwartet.section, "mit dem richtigen Abschnittsanker");
  ok(ziel.zielSichtbar, "der Zielabschnitt ist nach dem Laden sichtbar");
  ok(ziel.zielText.indexOf("Rhythmus") >= 0, "und es ist wirklich der gemeinte Abschnitt: " + ziel.zielText.slice(0, 50));
  ok(!/protokoll\.html$/.test(ziel.url), "kein Sprung nur auf die allgemeine Protokollseite");
  await noOverflow(page, "Kapitelseite");

  /* Reload des Deep-Links */
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(600);
  const nachReload = await page.evaluate(() => {
    const t = document.querySelector(location.hash || "#nichts");
    return { hash: location.hash, sichtbar: !!t && t.getBoundingClientRect().top < window.innerHeight };
  });
  ok(nachReload.hash === "#abschnitt-" + erwartet.section && nachReload.sichtbar, "Reload des Deep-Links bleibt funktionsfaehig");

  /* Direkte URL-Eingabe */
  await page.goto(BASE + erwartet.hrefSection, { waitUntil: "load" });
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => { const t = document.querySelector(location.hash); return !!t && t.getBoundingClientRect().top < window.innerHeight; }),
    "direkte URL-Eingabe fuehrt zum Abschnitt");

  /* Browser-Zurueck */
  await seed(page, "check.html", { mm_check_result: SEED });
  await openResult(page);
  await page.click(".mm-chap a");
  await page.waitForTimeout(700);
  await page.goBack({ waitUntil: "load" });
  await page.waitForTimeout(700);
  ok(/check\.html/.test(await page.evaluate(() => location.pathname)), "Browser-Zurueck fuehrt zur Auswertung");

  /* ---------------- B. Weitere Bereiche ------------------------------ */
  console.log("\n-- B. Weitere Optimierungsbereiche --");
  await openResult(page);
  const bl = await bereichsLinks(page);
  ok(bl.length > 1, "mehrere Bereiche vorhanden (" + bl.length + ")");
  const prim = bl.filter((x) => x.primary)[0];
  ok(prim && prim.sec === null, "der Engpass hat KEINE zweite kompakte Empfehlung");
  const weitere = bl.filter((x) => !x.primary && x.sec);
  ok(weitere.length > 0, "weitere Bereiche haben je eine kompakte Empfehlung (" + weitere.length + ")");
  ok(weitere.every((x) => /#abschnitt-/.test(x.href || "")), "jede zeigt auf einen echten Abschnitt");
  ok(weitere.every((x) => /DAS PROTOKOLL/.test(x.aria || "")), "jede traegt einen zugaenglichen Namen");
  ok(bl.every((x) => x.primary || x.sec === null || x.sec.length > 3), "keine leeren Platzhalter");
  const groessen = await page.evaluate(() => {
    const p = document.querySelector(".mm-chap .ch-sec");
    const s = document.querySelector(".mm-area .sec a");
    return { prim: p ? parseFloat(getComputedStyle(p).fontSize) : 0, sek: s ? parseFloat(getComputedStyle(s).fontSize) : 0 };
  });
  ok(groessen.prim > groessen.sek, "die primaere Empfehlung bleibt visuell prioritaer (" + groessen.prim + " vs " + groessen.sek + " px)");

  /* ---------------- C. Vorschau / Zugriff ---------------------------- */
  console.log("\n-- C. Vorschau und Zugriffsschutz --");
  await page.goto(BASE + erwartet.hrefSection, { waitUntil: "load" });
  await page.waitForTimeout(400);
  const vorschau = await page.evaluate(() => ({
    cta: !!document.querySelector(".bp-protocta"),
    text: document.body.innerText,
    volltext: document.body.innerText.length
  }));
  ok(vorschau.cta, "die bestehende Kapitelvorschau mit Zugangshinweis erscheint");
  ok(/Teil von DAS PROTOKOLL/.test(vorschau.text), "der Zugangsstatus ist als Text verstaendlich, nicht nur ueber Farbe");
  ok(vorschau.volltext < 6000, "der gesperrte Volltext bleibt geschuetzt (nur Vorschau, " + vorschau.volltext + " Zeichen)");

  await page.goto(BASE + "ebooks/protokoll.html#abschnitt-schlafrhythmus", { waitUntil: "load" });
  await page.waitForTimeout(900);
  const reader = await page.evaluate(() => ({
    gate: !!document.getElementById("protoGate") && !document.getElementById("protoGate").hidden,
    inhaltLeer: (document.getElementById("protoContent") || { innerHTML: "" }).innerHTML.length === 0,
    versteckt: (document.getElementById("protoContent") || {}).hidden
  }));
  ok(reader.gate, "der Volltext-Reader zeigt ohne Zugang unveraendert das Zugangs-Gate");
  ok(reader.inhaltLeer && reader.versteckt, "ein Abschnittsanker umgeht die Sperre nicht");

  /* ---------------- D. Fehlende Zuordnung ---------------------------- */
  console.log("\n-- D. Fehlende oder ungueltige Zuordnung --");
  await seed(page, "check.html", { mm_check_result: SEED });
  await page.evaluate(() => {
    /* Zuordnung zur Laufzeit zerstoeren — die Seite darf nicht abstuerzen. */
    window.MM_CHECK.DOMAIN_CHAPTER = {};
  });
  await openResult(page);
  const ohne = await page.evaluate(() => ({
    chap: !!document.querySelector(".mm-chap"),
    fallback: /noch kein direkter Protokollabschnitt/.test(document.body.innerText),
    links: document.querySelectorAll(".mm-area .sec a").length,
    engpass: !!document.querySelector(".bottleneck-card")
  }));
  ok(ohne.engpass, "die Ergebnisseite rendert weiterhin vollstaendig — kein Absturz");
  ok(!ohne.chap && ohne.fallback, "stattdessen erscheint der verstaendliche Fallback");
  ok(ohne.links === 0, "es entsteht kein falscher Link");
  await noOverflow(page, "Fallback");

  /* ---------------- E. Historische Ergebnisse ------------------------ */
  console.log("\n-- E. Historische Ergebnisse --");
  await seed(page, "check.html", { mm_check_result: SEED_LEGACY });
  await openResult(page);
  const legacy = await page.evaluate(() => ({
    chap: !!document.querySelector(".mm-chap"),
    areas: document.querySelectorAll(".mm-area").length,
    links: document.querySelectorAll(".mm-area .sec a").length,
    hinweis: /frühere[s]? Ergebnis/.test(document.body.innerText)
  }));
  ok(legacy.areas === 0 && legacy.links === 0, "ein Alt-Ergebnis ohne Domains bekommt keine erfundene Empfehlung");
  ok(legacy.hinweis, "stattdessen bleibt der bestehende ehrliche Hinweis");
  ok(await page.evaluate(() => localStorage.getItem("mm_check_result")) === JSON.stringify(SEED_LEGACY),
    "das Alt-Ergebnis wurde nicht mutiert");
  await noOverflow(page, "Alt-Ergebnis");

  /* Report */
  await seed(page, "report.html", { mm_check_result: SEED });
  await page.waitForTimeout(700);
  const rep = await page.evaluate(() => document.body.textContent);
  ok(/Empfohlenes Kapitel/.test(rep), "der Report nennt das empfohlene Kapitel");
  ok(rep.indexOf(erwartet.sectionLabel) >= 0, "samt konkretem Abschnitt");
  ok(/Passender Abschnitt/.test(rep), "und je Bereichszeile einen passenden Abschnitt");
  await noOverflow(page, "Report");

  /* PWA */
  const ctx2 = await browser.newContext({ viewport: { width, height: 950 } });
  const p2 = await ctx2.newPage();
  const errs2 = [];
  p2.on("pageerror", (e) => errs2.push(String(e.message || e)));
  await p2.addInitScript(() => {
    const orig = window.matchMedia.bind(window);
    window.matchMedia = (q) => { const r = orig(q); if (/display-mode/.test(q)) { try { Object.defineProperty(r, "matches", { value: /standalone/.test(q) }); } catch (e) {} } return r; };
  });
  await p2.goto(BASE + erwartet.hrefSection, { waitUntil: "load" });
  await p2.waitForTimeout(500);
  ok(await p2.evaluate(() => { const t = document.querySelector(location.hash); return !!t && t.getBoundingClientRect().top < window.innerHeight; }),
    "der Deep-Link funktioniert auch in der PWA-Darstellung");
  ok(errs2.length === 0, "keine JavaScript-Fehler in der PWA" + (errs2.length ? ": " + errs2.join(" | ") : ""));
  await ctx2.close();

  ok(errs.length === 0, "keine JavaScript-Fehler" + (errs.length ? ": " + errs.join(" | ") : ""));
  await browser.close();
}

(async () => {
  const l = C.chapterFor(SEED.primaryBottleneck.domain);
  console.log("Engpass: " + SEED.primaryBottleneck.domain + " -> Kapitel " + l.chapterNr + " · " + l.chapterLabel + " · " + l.sectionLabel);
  console.log("Deep-Link: " + l.hrefSection);
  await run(390);
  await run(1440);
  console.log("\n==============================");
  console.log(fail ? "FAILS: " + fail : "ALLE BROWSER-PRUEFUNGEN BESTANDEN");
  console.log("EXIT=" + (fail ? 1 : 0));
  process.exit(fail ? 1 : 0);
})();
