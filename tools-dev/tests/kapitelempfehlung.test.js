/* ==========================================================================
   MALEMETRIX P6 — SCORE → PROTOKOLL: KAPITEL UND ABSCHNITTE
   Friert ein: EINE kanonische Zuordnung Domain → Kapitel → Abschnitt über
   stabile IDs, echte Deep-Links auf existierende Anker, Begründung nur aus
   vorhandenen Score-Daten, unveränderte Priorisierung, unveränderter
   Zugriffsschutz und ehrliche Fallbacks statt falscher Links.
   Deckt die Prüfpunkte 1–45 aus Paket 6 ab (Nummern in den Meldungen).
   Ausführen:  node tools-dev/tests/kapitelempfehlung.test.js
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } };
const group = (g) => console.log("\n== " + g + " ==");

global.window = global.window || {};
require(path.join(ROOT, "js/check-data.js"));
const C = global.window.MM_CHECK;

const CHECK = read("js/check.js");
const REPORT = read("js/report.js");
const DATA = read("js/check-data.js");
const MAP_BLOCK = DATA.split("KAPITEL UND ABSCHNITTE (Paket 6)")[1].split("C.deepLinks = function")[0];

const ANS = {
  sex: "m", age: "44", height: "182", weight: "96", waist: "104",
  status_use: "natural", goal_main: ["fatloss"], goal_pain: "energie",
  rec_duration: "lt5", mov_sitting: "gt11", steps: "lt4",
  str_freq: "1", fuel_protein: "keine_ahnung"
};

/* ==================================================================== 1 */
group("1 · Vollständige, gültige Zuordnung je Domain (T1, T2, T8, T9)");
(function () {
  const domains = Object.keys(C.domainMeta);
  ok(domains.length === 15, "die Engine hat unverändert 15 Domains (T1)");
  domains.forEach(function (d) {
    const l = C.chapterFor(d);
    ok(!!l, "Domain " + d + " hat eine Zuordnungsentscheidung (T1)");
    if (!l) return;
    /* T8: Kapitel existiert im kanonischen Register UND als Datei. */
    ok(!!C.CHAPTERS[l.chapter], "Kapitel-ID „" + l.chapter + "“ steht im Kapitelregister (T8)");
    ok(exists(l.href), "die Kapiteldatei existiert: " + l.href + " (T8)");
    /* T9: Abschnitts-ID existiert im zugehörigen Kapitel — als echter Anker. */
    ok(!!l.sectionLabel, "Domain " + d + " nennt einen konkreten Abschnitt (T4/T9)");
    const html = read(l.href);
    ok(html.indexOf('id="abschnitt-' + l.section + '"') >= 0,
      "der Anker #abschnitt-" + l.section + " existiert wirklich in " + l.href + " (T9)");
  });

  /* T2: der technische Schlüssel ist nie die sichtbare Überschrift. */
  ok(!/DOMAIN_CHAPTER[\s\S]{0,900}chapter: "(Schlaf|Training|Blutwerte)"/.test(MAP_BLOCK),
    "die Zuordnung nutzt Kapitel-IDs, keine sichtbaren Kapitelnamen (T2)");
  Object.keys(C.DOMAIN_CHAPTER).forEach(function (d) {
    const m = C.DOMAIN_CHAPTER[d];
    ok(typeof m.chapter === "string" && /^[a-zA-Z]+$/.test(m.chapter), "stabile Kapitel-ID für " + d + " (T2/T7)");
    ok(typeof m.section === "string" && /^[a-z0-9-]+$/.test(m.section), "stabile Abschnitts-ID für " + d + " (T2/T7)");
  });
  ok(!/label ===|label\.indexOf|sectionLabel ===/.test(MAP_BLOCK), "kein Nachschlagen über Labels (T2)");
})();

/* ==================================================================== 2 */
group("2 · Primärer Engpass und Priorisierung (T3, T5, T33)");
(function () {
  const ev = C.evaluate(ANS);
  const l = C.chapterFor(ev.primaryBottleneck.domain);
  ok(!!l && !!l.chapterLabel, "der primäre Engpass erhält eine konkrete Kapitelzuordnung (T3)");
  ok(!!l && !!l.sectionLabel, "und einen konkreten Abschnitt (T4)");
  ok(!!l && /#abschnitt-/.test(l.hrefSection), "der Deep-Link zeigt auf den Abschnittsanker (T4)");

  /* T5: der niedrigste Bereichswert überschreibt die Engine nicht. */
  const domains = { cardiovascular: 45, movement: 40, sleep: 80, training: 80, nutrition: 80,
    bodyComposition: 80, recovery: 80, metabolic: 80, hormonal: 80, energy: 80, dataQuality: 80 };
  const bn = C.primaryBottleneck({ sex: "m", age: "40" }, domains, [], []);
  const min = Object.keys(domains).sort((x, y) => domains[x] - domains[y])[0];
  ok(bn.domain === "cardiovascular" && bn.domain !== min,
    "die Empfehlung folgt dem Engine-Engpass, nicht dem niedrigsten Wert (T5)");
  ok(C.chapterFor(bn.domain).chapter === "blutwerte", "und landet im Kapitel des Engpasses, nicht des Minimums (T5)");

  /* T33: die primäre Empfehlung steht in der Engpass-Karte, die kompakte
     Bereichsempfehlung ausdrücklich NICHT für den Engpass. */
  /* Der Kopf kommt im Kommentar UND im Code vor — der Kartenrumpf ist das
     zweite Vorkommen. */
  const engpassKarte = CHECK.split("DEIN PRIMÄRER ENGPASS")[2].split("OPTIMIERUNGSBEREICHE MIT BEREICHSWERT")[0];
  ok(/Empfohlenes Kapitel/.test(engpassKarte), "die primäre Empfehlung steht beim Engpass (T33)");
  ok(/if \(isPrimary\) return "";/.test(CHECK), "in der Bereichskarte entfällt sie für den Engpass — keine Dopplung (T6/T33)");
  ok(CHECK.indexOf("Empfohlenes Kapitel") < CHECK.indexOf("Passender Abschnitt im Protokoll"),
    "die primäre Empfehlung steht vor den kompakten (T33)");
})();

/* ==================================================================== 3 */
group("3 · Höchstens eine Empfehlung, keine falschen Links (T6, T7, T26, T27)");
(function () {
  const bereich = CHECK.split("Passender Abschnitt im Protokoll")[0].split("const pt = punktZu(d);")[1] || "";
  ok((CHECK.match(/Passender Abschnitt im Protokoll/g) || []).length === 1,
    "je Bereich existiert genau EINE kompakte Empfehlung (T6)");
  ok(/if \(!l \|\| !l\.sectionLabel\) return "";/.test(CHECK),
    "ohne echte Zuordnung entsteht kein Link und kein Platzhalter (T7)");

  /* T26/T27: kaputte Referenzen. */
  const alt = C.CHAPTERS.schlaf;
  C.CHAPTERS.schlaf = undefined;
  ok(C.chapterFor("sleep") === null, "ein fehlendes Kapitel liefert null statt eines falschen Links (T26)");
  C.CHAPTERS.schlaf = alt;
  const altSec = C.CHAPTERS.schlaf.sections["schlafrhythmus"];
  delete C.CHAPTERS.schlaf.sections["schlafrhythmus"];
  const ohneAbschnitt = C.chapterFor("sleep");
  ok(!!ohneAbschnitt && ohneAbschnitt.section === null, "ein fehlender Abschnitt wird nicht erfunden (T27)");
  ok(ohneAbschnitt.hrefSection === ohneAbschnitt.href && !/#/.test(ohneAbschnitt.hrefSection),
    "dann führt der Link höchstens ins richtige Kapitel — nie zu einem falschen Anker (T27)");
  C.CHAPTERS.schlaf.sections["schlafrhythmus"] = altSec;
  ok(C.chapterFor("sleep").section === "schlafrhythmus", "danach ist die Zuordnung wieder intakt");

  ok(C.chapterFor("gibtesnicht") === null, "eine unbekannte Domain erzeugt keine Empfehlung (T7)");
  ok(typeof C.CHAPTER_FALLBACK === "string" && /noch kein direkter Protokollabschnitt/.test(C.CHAPTER_FALLBACK),
    "für den Fall ohne Zuordnung existiert ein verständlicher Fallback (T7)");
  ok(/C\.CHAPTER_FALLBACK/.test(CHECK), "die Ergebnisseite nutzt genau diesen Fallback (T7)");
})();

/* ==================================================================== 4 */
group("4 · Stabilität gegen Umbenennung und Reihenfolge (T13, T14, T43)");
(function () {
  /* T13: eine sichtbare Überschriftsänderung zerstört die Zuordnung nicht. */
  const vorher = C.chapterFor("sleep");
  const altLabel = C.CHAPTERS.schlaf.label;
  const altSection = C.CHAPTERS.schlaf.sections["schlafrhythmus"];
  C.CHAPTERS.schlaf.label = "GANZ ANDERER TITEL";
  C.CHAPTERS.schlaf.sections["schlafrhythmus"] = "Ganz anderer Abschnittstext";
  const nachher = C.chapterFor("sleep");
  ok(nachher.chapter === vorher.chapter && nachher.section === vorher.section,
    "geänderte Überschriften lassen Kapitel- und Abschnitts-ID unberührt (T13)");
  ok(nachher.hrefSection === vorher.hrefSection, "und den Deep-Link unverändert (T13)");
  ok(nachher.chapterLabel === "GANZ ANDERER TITEL", "nur die Anzeige folgt der Umbenennung (T13)");
  C.CHAPTERS.schlaf.label = altLabel;
  C.CHAPTERS.schlaf.sections["schlafrhythmus"] = altSection;

  /* T14: die Reihenfolge im Register ist ohne Bedeutung. */
  ok(!/Object\.keys\(C\.CHAPTERS\)\[|CHAPTERS\[0\]|slice\(0, 1\)/.test(MAP_BLOCK),
    "keine Zuordnung hängt an der Position im Register (T14)");
  ok(C.chapterFor("execution").chapter === "abschluss", "der Abschluss wird trotz Sonderstellung korrekt zugeordnet (T14)");

  /* T43: genau EINE Kapitelstruktur. */
  const register = Object.keys(C.CHAPTERS);
  const hrefs = register.map((k) => C.CHAPTERS[k].href);
  ok(new Set(hrefs).size === hrefs.length, "keine Kapiteldatei ist doppelt registriert (T43)");
  ok(new Set(register).size === register.length, "keine doppelte Kapitel-ID (T43)");
  ok(!/C\.CHAPTERS_?2|CHAPTER_MAP|SECTION_MAP/.test(DATA), "es gibt keine zweite Kapitelstruktur (T43)");
  ok((DATA.match(/C\.CHAPTERS = /g) || []).length === 1, "das Register wird genau einmal definiert (T43)");
  ok(!/DOMAIN_CHAPTER|C\.CHAPTERS/.test(CHECK.replace(/C\.chapterFor|C\.CHAPTER_FALLBACK|C\.chapterLinkLabel/g, "")),
    "check.js führt keine eigene Kapitelabfrage (§4)");
  ok(!/DOMAIN_CHAPTER|C\.CHAPTERS/.test(REPORT), "report.js führt keine eigene Kapitelabfrage (§4)");
})();

/* ==================================================================== 5 */
group("5 · „Empfohlen, weil …“ aus vorhandenen Daten (T15–T19, T44)");
(function () {
  const ev = C.evaluate(ANS);
  const rs = C.areaReasons(ANS, ev.primaryBottleneck.domain, ev.dataGaps, 2);
  ok(rs.gruende.length > 0, "die Begründung stammt aus den Bereichsgründen aus Paket 4 (T15/T39)");
  const steps = C.scoredSteps(ANS);
  rs.gruende.forEach(function (g) {
    ok(steps.some((s) => s.q.id === g.id), "Grund „" + g.frage + "“ ist eine echte gestellte Frage (T15)");
    ok(ANS[g.id] !== undefined, "und nutzt eine tatsächlich gegebene Antwort (T15)");
  });
  /* T17: maximal drei Gründe. */
  const block = CHECK.split("Empfohlenes Kapitel")[1].split("</div>';")[0];
  ok(/gruende\.slice\(0, 3\)/.test(block), "höchstens drei Begründungsgründe (T17)");
  ok(/areaReasons\(r\.answers \|\| \{\}, V\.primaryBottleneck\.domain, V\.dataGaps \|\| \[\], 2\)/.test(CHECK),
    "die Gründe kommen aus der bestehenden deterministischen Quelle (T15)");
  /* T16: nichts Generatives, nichts Zufälliges. */
  ok(!/Math\.random|generate|prompt|template`/.test(block), "keine generative oder zufällige Begründung (T16)");
  /* T19: keine Diagnose, keine Kausalität. */
  ok(!/verursacht|führt zu|weil du .* bist|Diagnose|behandelt dich/i.test(block),
    "keine Diagnose und keine Kausalitätsbehauptung (T19)");
  /* T18: ehrlicher Fallback ohne Begründungsdaten. */
  ok(/Empfohlen aufgrund deines priorisierten Optimierungsbereichs/.test(block),
    "ohne belastbare Gründe erscheint der vorgegebene Fallback (T18)");
  const leer = C.areaReasons({ sex: "m", age: "30" }, "sleep", [], 2);
  ok(leer.gruende.length === 0, "ohne Punktverlust gibt es keine erfundenen Gründe (T16/T18)");
  /* T44: keine Zuordnung über Auftragstexte. */
  ok(!/FOCUS\[|f\.title|f\.daily/.test(MAP_BLOCK), "die Zuordnung nutzt keine Auftragstexte (T44)");
})();

/* ==================================================================== 6 */
group("6 · Deep-Link und Zugänglichkeit (T10, T11, T12, T20)");
(function () {
  const l = C.chapterFor("sleep");
  ok(l.href === "ebooks/schlaf-energie.html", "der Deep-Link zeigt auf das richtige Kapitel (T10)");
  ok(l.hrefSection === "ebooks/schlaf-energie.html#abschnitt-schlafrhythmus", "und auf den richtigen Abschnitt (T11)");
  ok(!/\?|&|%/.test(l.hrefSection), "die URL bleibt lesbar und stabil (T12)");
  ok(read(l.href).indexOf('id="abschnitt-schlafrhythmus"') >= 0, "der Anker ist statisch im Dokument — Reload und PWA tragen ihn (T12/T42)");
  ok(C.chapterFor("sleep", "../").hrefSection === "../ebooks/schlaf-energie.html#abschnitt-schlafrhythmus",
    "Unterseiten können denselben Auflöser mit Basis nutzen (T12)");

  /* T20: zugänglicher Linktext nennt Abschnitt und Werk. */
  const label = C.chapterLinkLabel(l);
  ok(/Schlafrhythmus|Rhythmus schlägt Dauer/.test(label) && /DAS PROTOKOLL/.test(label),
    "der zugängliche Name nennt Abschnitt und Werk: „" + label + "“ (T20)");
  ok(!/^Öffnen$|^Mehr erfahren$/.test(label), "kein kontextloses „Öffnen“ (T20)");
  ok(/aria-label="' \+ esc\(C\.chapterLinkLabel\(link\)\)/.test(CHECK), "die Ergebnisseite setzt genau dieses Label (T20)");
  ok((CHECK.match(/aria-label=/g) || []).length >= 3, "auch die kompakten Empfehlungen tragen ein Label (T20)");
  ok(C.chapterLinkLabel(null) === "", "ohne Zuordnung entsteht kein leeres Label (T7)");
})();

/* ==================================================================== 7 */
group("7 · Zugriffsschutz bleibt unberührt (T21–T25, T45)");
(function () {
  /* Der Volltext liegt verschlüsselt im Reader; die Kapitelseiten sind die
     bestehende Vorschau. Ein Anker kann daran nichts ändern. */
  const reader = read("ebooks/protokoll.html");
  ok(/id="protoVault"/.test(reader) && /MM\.vault\.open\("protoVault"/.test(reader),
    "der Volltext bleibt kryptografisch verschlossen (T23/T45)");
  ok(/hasAccess\("protocol"\)/.test(reader) && /resolveProductAccess\("protocol"\)/.test(reader),
    "Zugriff läuft unverändert über Konto und Entitlement (T21/T24)");
  ok(/localStorage\.getItem\(STORE\)/.test(reader), "der bestehende Legacy-Zugangsweg bleibt unverändert (T25)");

  /* Kein Ziel der Empfehlung ist der Reader — der Anker kann die Sperre
     also nicht einmal berühren. */
  Object.keys(C.domainMeta).forEach(function (d) {
    const l = C.chapterFor(d);
    ok(!l || l.href.indexOf("ebooks/protokoll.html") < 0,
      "die Empfehlung für " + d + " zeigt nie in den verschlossenen Volltext (T23/T45)");
  });
  /* Und die verlinkten Kapitelseiten sind unverändert Vorschauseiten. */
  const ziele = Object.keys(C.CHAPTERS).map((k) => C.CHAPTERS[k].href);
  ziele.forEach(function (h) {
    const html = read(h);
    ok(/bp-protocta/.test(html), h + " ist unverändert die bestehende Vorschau mit Zugangshinweis (T22)");
    ok(/Teil von DAS PROTOKOLL|Vertiefung/.test(html), h + " weist den Zugangsstatus weiterhin als Text aus (T22)");
  });
  ok(!/vault|protoVault|unlock|entitlement/i.test(MAP_BLOCK), "die Zuordnung fasst keine Zugriffslogik an (T45)");
  ok(!/entitlement|hasAccess|resolveProductAccess/.test(CHECK.split("Empfohlenes Kapitel")[1].split("</div>';")[0]),
    "die Empfehlung ändert nichts an Zugang oder Entitlements (T24/T25)");
})();

/* ==================================================================== 8 */
group("8 · Keine Nebenwirkungen (T28, T29, T30, T34–T38, T40)");
(function () {
  const block = CHECK.split("Empfohlenes Kapitel")[1].split("OPTIMIERUNGSBEREICHE")[0];
  ok(!/MM\.store\.set|localStorage\.setItem/.test(block), "die Empfehlung speichert nichts (T28/T29)");
  ok(!/MM\.track|telOnce/.test(block), "keine neue Telemetrie (T30)");
  ok(!/points\.upsert|points\.fromFocus|adoptStandard|MM\.points/.test(block),
    "kein Optimierungspunkt und kein Standard entsteht (T34/T36)");
  ok(!/focus\.start|MM\.focus\.start/.test(block), "kein Auftrag wird automatisch gestartet (T35)");
  ok(!/window\.location\s*=|location\.href\s*=/.test(block), "kein automatisches Öffnen ohne Nutzeraktion (§6)");

  /* T37/T38: Score und Bereichswerte unverändert. */
  const summe = Object.keys(C.domainMeta).reduce((a, k) => a + (C.domainMeta[k].w || 0), 0);
  ok(summe === 145, "Score-Gewichte eingefroren (Summe 145) (T38)");
  ok(C.areaValueLabel(56) === "5,6/10" && C.areaValueLabel(70) === "7/10", "die Bereichswerte aus Paket 4 sind unverändert (T37)");
  const a1 = JSON.stringify(C.evaluate(ANS));
  Object.keys(C.domainMeta).forEach((d) => C.chapterFor(d));
  ok(JSON.stringify(C.evaluate(ANS)) === a1, "die Auswertung ist nach Nutzung der Zuordnung bitgleich (T38)");

  /* T39/T40: Paket 4 und 5 bleiben kompatibel. */
  ok(typeof C.areaReasons === "function" && typeof C.areaValueA11y === "function", "Paket-4-API unverändert (T39)");
  const FOCUS = read("js/focus.js");
  ok(/MESSDATENBRÜCKE \(Paket 5\)/.test(FOCUS) && /C\.CHAPTERS|chapterFor/.test(FOCUS) === false,
    "die Messdatenlogik aus Paket 5 ist unberührt und kennt keine Kapitel (T40)");
  ok(/var SIGNALE = \{/.test(FOCUS), "die Quellenmatrix aus Paket 5 steht unverändert (T40)");
})();

/* ==================================================================== 9 */
group("9 · Historische Ergebnisse und Report (T31, T32, T13-Report)");
(function () {
  /* T31: ein V2-Ergebnis mit gespeicherten Domains lässt sich sicher
     navigieren — die Zuordnung ist eine heutige Navigationshilfe. */
  const domains = { sleep: 56, training: 84, movement: 41 };
  Object.keys(domains).forEach(function (d) {
    const l = C.chapterFor(d);
    ok(!!l && exists(l.href), "historische Domain " + d + " führt auf ein heute existierendes Kapitel (T31)");
  });
  ok(/Passender Abschnitt/.test(REPORT), "der Report formuliert es als heutigen Hinweis, nicht als damalige Empfehlung (T31)");
  ok(!/damals empfohlen|damals wurde/i.test(REPORT + CHECK), "keine Behauptung über die damalige Empfehlung (T31)");

  /* T32: Legacy ohne Domains bekommt nichts erfunden. */
  ok(/if \(!V \|\| V\.legacy \|\| !V\.domains\) return;/.test(REPORT),
    "der Report ergänzt nur bei wirklich gespeicherten Domains (T32)");
  ok(/V\.legacy \|\| !rows\.length/.test(CHECK), "die Ergebnisseite baut für Alt-Ergebnisse keine Bereichsliste (T32)");
  /* Der Engpass eines Alt-Ergebnisses wurde gerade erst nachgerechnet und war
     damals nie gespeichert — daraus darf keine Kapitelempfehlung entstehen.
     Genau das hat die Browser-Prüfung aufgedeckt. */
  const empf = CHECK.split("EMPFOHLENES KAPITEL (Paket 6)")[1].split("'</div>';")[0];
  ok(/if \(V\.legacy\) return "";/.test(empf),
    "ein Alt-Ergebnis ohne gespeicherte Domains erhält gar keine Kapitelempfehlung (T32)");
  ok(empf.indexOf('if (V.legacy) return "";') < empf.indexOf("C.chapterFor"),
    "die Legacy-Prüfung steht VOR jeder Zuordnung (T32)");
  ok(!/chapterFor/.test(CHECK.split("Für dieses frühere Ergebnis")[0].split("if (V.legacy || !rows.length)")[1] || ""),
    "und damit auch keine Kapitelempfehlung daraus (T32)");

  /* Report: Kapitel und Abschnitt als TEXT — der Report wird gedruckt. */
  ok(/Empfohlenes Kapitel/.test(REPORT), "der Report nennt das empfohlene Kapitel beim Engpass (§13)");
  ok(/DAS PROTOKOLL · Kapitel/.test(REPORT), "samt Kapitelnummer als Text (§13)");
  ok(!/<a href=/.test(REPORT.split("Empfohlenes Kapitel")[1].split("</tr>")[0]),
    "im gedruckten Report steht kein Link, der dort nicht funktioniert (§13)");
  ok(!/r-section[\s\S]{0,200}Kapiteltext/.test(REPORT), "keine Protokolltexte im Report (§13)");
})();

/* =================================================================== 10 */
group("10 · Kanonische Begriffe und Darstellung (§17, §16)");
(function () {
  const sicht = CHECK + REPORT;
  ["Recommendation Engine", "Content Routing", "Mapping Layer", "Intervention Library",
   "Treatment Path", "FMEA", "Ishikawa", "5 Why", "KVP", "8D"].forEach(function (b) {
    ok(sicht.indexOf(b) < 0, "kein sichtbarer Methodenbegriff: " + b + " (§17)");
  });
  ["Empfohlenes Kapitel", "Empfohlen, weil", "Passender Abschnitt", "DAS PROTOKOLL"].forEach(function (b) {
    ok(CHECK.indexOf(b) > 0, "kanonischer Begriff verwendet: " + b + " (§17)");
  });

  /* §16: Darstellung bricht um, ist lesbar, kein zweiter Hero. */
  const CSS = read("css/style.css");
  const chapCss = (CSS.split("EMPFOHLENES KAPITEL (Paket 6)")[1] || "").split("/* ---- OPT-IN")[0].replace(/^[\s\S]*?\*\//, "");
  ok(/overflow-wrap: anywhere/.test(chapCss), "lange Kapitel- und Abschnittsnamen brechen sauber um (§16)");
  ok(!/#[0-9a-f]{6}/i.test(chapCss), "nur bestehende Design-Tokens (§16)");
  const kleinste = (chapCss.match(/font-size: ([\d.]+)rem/g) || []).map((x) => parseFloat(x.replace(/[^\d.]/g, "")));
  ok(kleinste.length > 0 && Math.min.apply(null, kleinste.filter((x) => x > 0.6)) >= 0.8,
    "die Fließtexte der Empfehlung sind lesbar gesetzt (§16)");
  ok(/focus-visible/.test(chapCss), "der sichtbare Fokus bleibt erhalten (§16)");
  ok(!/font-size: clamp\(|2\.4rem/.test(chapCss), "keine zweite große Hero-Zahl (§11)");
  ok(/Vertiefung/.test(CHECK), "eine Vertiefung wird als solche gekennzeichnet, nicht als Kapitel des Kanons (§5)");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
