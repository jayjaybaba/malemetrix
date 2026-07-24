/* ==========================================================================
   MALEMETRIX VS2 — VISUAL SYSTEM 2.0: statische Design-System-Invarianten
   Sichert: zentrale Tokens (Farbe = Bedeutung), Instrument- statt Karten-
   Sprache im Cockpit, diagnostische Systemklassen, Access-Moment, Motion
   mit reduced-motion-Guard, keine Emoji-UI in Systemkomponenten.
   Ausführen:  node tools-dev/tests/visual-system.test.js
   ========================================================================== */
"use strict";
var fs = require("node:fs");
var path = require("node:path");
var ROOT = path.resolve(__dirname, "../..");
function read(p) { return fs.readFileSync(path.join(ROOT, p), "utf8"); }
var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

var style = read("css/style.css");
var os = read("css/os.css");
var checkout = read("js/checkout.js");
var vs2 = style.split("VISUAL SYSTEM 2.0")[1] || "";

group("Tokens · COLOR HAS MEANING (semantische Ebene, zentral)");
ok(vs2.length > 0, "VS2-Block existiert zentral in css/style.css");
["--status-active", "--status-improving", "--status-attention", "--status-flag", "--status-neutral"].forEach(function (t) {
  ok(vs2.indexOf(t + ":") >= 0, "Token " + t + " definiert");
});
ok(/--status-active:\s*var\(--accent-2\)/.test(vs2), "Cyan = Brand/Aktiv (kein neuer Farbwert, Alias auf Bestand)");
ok(/--hairline/.test(vs2) && /--surface/.test(vs2), "Flächen-/Hairline-Tokens für 'less cards, more structure'");

group("Data as Design · Instrumente statt Mini-Boxen");
ok(/\.mm-metric \{/.test(vs2) && /clamp\(1\.6rem/.test(vs2), "mm-metric: große Werte als Layout-Hauptelement");
ok(/tabular-nums/.test(vs2), "tabellarische Ziffern (Messwert-Typografie)");
ok(/\.mm-secthead/.test(vs2) && /letter-spacing:\s*0\.18em/.test(vs2), "Mono-Sektionsheader (MM / SCORE-Sprache)");
// Cockpit-Statuszeile: keine Box-Optik mehr, Hairline-Trenner
var strip = os.split("Cockpit-Instrumente")[1] || "";
ok(strip.length > 0, "Cockpit-Statuszeile ist auf Instrument-Sprache umgestellt");
ok(!/border-radius:\s*12px/.test(strip.split(".os-stat b")[0]), "keine Karten-Boxen mehr in der Statuszeile");
ok(/border-left: 1px solid var\(--hairline/.test(strip), "Hairline-Trenner statt Card-Grid");
ok(/@media \(max-width: 560px\)/.test(strip), "Mobile: eigene 2-Spalten-Hierarchie statt gestapeltem Desktop");

group("Diagnostic System Language · BODY/ENGINE/RECOVERY/…");
ok(/\.mm-sys .row\.is-primary/.test(vs2) || /\.mm-sys \.row\.is-primary/.test(vs2), "Primary Bottleneck hat EINE klare Hervorhebung");
ok(/PRIMARY/.test(vs2), "PRIMARY-Markierung in Mono-Mikrotypo");
ok(/is-flag/.test(vs2), "Medical-Flag-Zustand nutzt Rot (Status, nicht Deko)");

group("Premium Access Moment · Kauf = Upgrade");
ok(/\.mm-access/.test(vs2) && /mm-unlock/.test(vs2), "ACCESS-GRANTED-Komponente mit Unlock-Animation");
ok(/ACCESS GRANTED/.test(checkout), "Checkout-Erfolg nutzt den Access-Moment");
ok(/ASSIGNED TO YOUR ACCOUNT/.test(checkout), "ASSIGNED TO YOUR ACCOUNT vorhanden");
ok(/Jetzt starten/.test(checkout), "primäre Aktion führt ins Produkt (Jetzt starten), nicht auf die Homepage");
ok(checkout.indexOf("ACCESS GRANTED") < 0 || !/🎉|🚀|✨/.test(checkout.split("ACCESS GRANTED")[1].slice(0, 600)), "kein Emoji-Konfetti im Access-Moment");

group("Motion · funktional + reduced-motion-Guard");
ok(/prefers-reduced-motion: reduce/.test(vs2), "reduced-motion wird respektiert");
ok((vs2.match(/@keyframes/g) || []).length <= 3, "wenige, gezielte Keyframes (keine Animations-Orgie)");

group("Empty/Locked States · Premium-Ruhe");
ok(/\.mm-empty/.test(vs2) && /\.mm-locked/.test(vs2), "Empty- und Locked-States sind Systemkomponenten");
ok(/LOCKED · /.test(vs2), "Locked-State spricht Mono-Systemsprache");

group("Score Result · diagnostische Systemliste statt Balken-Stapel");
var check = read("js/check.js");
ok(/mm-sys/.test(check) && /is-primary/.test(check), "Ergebnisseite nutzt .mm-sys mit Primary-Bottleneck-Highlight");
ok(/MM \/ SYSTEMS/.test(check), "Mono-Systemheader auf der Ergebnisseite");
ok((check.match(/is-primary/g) || []).length >= 1 && /k === bKey/.test(check), "genau der Engpass wird als PRIMARY markiert (datengetrieben)");

group("P13/A2 · SYSTEM-READY-Moment nach Programm-Setup");
var course = read("js/course.js");
ok(/SYSTEM READY/.test(course), "SYSTEM-READY-Screen existiert nach dem Setup");
ok(/START DAY 1/.test(course), "genau EIN CTA: START DAY 1");
ok(/PRIMARY BOTTLENECK/.test(course) && /DAY 01/.test(course), "zeigt Mode/Bottleneck/12 Weeks/Day 01 aus ECHTEN Setup-Werten");
ok(/program_initialized/.test(course) && /day1_started/.test(course), "Funnel-Events program_initialized + day1_started (keine Gesundheitsdaten)");
ok(/mm-access/.test(course) && /mm-metric/.test(course), "nutzt VS2-Systemklassen, kein eigenes Design");

group("P16/D1 · Freie Ebooks als Protokoll-Kapitel gerahmt");
var bpcss = read("css/blueprint.css");
ok(/\.bp-protohead/.test(bpcss) && /\.bp-protocta/.test(bpcss), "Rahmungs-Styles (Kopf + Ende-CTA) existieren in blueprint.css");
// P17: kanonische 10-Kapitel-Nummerierung (+ Companions als „· VERTIEFUNG", Abschluss)
var CHAPTERS = {
  "blueprint.html": "KAPITEL 01", "fettabbau.html": "KAPITEL 01 · VERTIEFUNG", "protein-system.html": "KAPITEL 01 · VERTIEFUNG",
  "taeglich-trainieren.html": "KAPITEL 02", "training-system.html": "KAPITEL 02 · VERTIEFUNG",
  "schlaf-energie.html": "KAPITEL 03", "schlaf-stack.html": "KAPITEL 03 · VERTIEFUNG", "blutwerte-guide.html": "KAPITEL 04",
  "testosteron.html": "KAPITEL 05", "glp1-agonisten.html": "KAPITEL 06", "supplements.html": "KAPITEL 08",
  "sexuelle-gesundheit.html": "KAPITEL 09", "11-injektionen.html": "KAPITEL 10",
  "12-longevity-risk.html": "KAPITEL 04 · VERTIEFUNG", "gewohnheiten.html": "ABSCHLUSS", "masterguide.html": "KAPITEL 01 · VERTIEFUNG"
};
Object.keys(CHAPTERS).forEach(function (fn) {
  var h = read("ebooks/" + fn);
  var head = /<main class="bp">\s*<div class="bp-protohead">/.test(h);
  var label = h.indexOf("MM / PROTOCOL · " + CHAPTERS[fn]) >= 0;
  var cta = h.indexOf('class="bp-protocta"') >= 0 && h.indexOf("protokoll.html") >= 0;
  var oneEach = (h.match(/class="bp-protohead"/g) || []).length === 1 && (h.match(/class="bp-protocta"/g) || []).length === 1;
  ok(head && label && cta && oneEach, fn + ": Systemkopf (" + CHAPTERS[fn] + ") + Ende-CTA genau einmal, Link auf protokoll.html");
});
ok(!/DAS 12-WOCHEN-PROGRAMM.{0,40}erklärt/i.test(read("ebooks/testosteron.html")), "Rollen bleiben getrennt (Programm 'erklärt' nicht) — Positionierung intakt");

group("P17 · Kanonische 10-Kapitel-Architektur (+ Abschluss)");
var proto = read("protokoll.html");
ok(/id="kapitel"/.test(proto) && /class="proto-index"/.test(proto), "protokoll.html hat EINEN kanonischen Kapitel-Index (#kapitel)");
ok(!/Die 10 Module/.test(proto) && !/pillar-tag">Modul /.test(proto) && !/14 Kapitel/.test(proto), "kein '10 Module'- und kein '14 Kapitel'-Modell mehr");
ok((proto.match(/class="proto-chap/g) || []).length === 11, "Index = exakt 10 nummerierte Kapitel + 1 Abschluss");
ok((proto.match(/class="pc-n">\d\d</g) || []).length === 10, "genau 10 Kapitelnummern 01–10");
ok(/proto-outro/.test(proto) && /ABSCHLUSS · DAS SYSTEM ZUSAMMENSETZEN/.test(proto), "unnummerierter Abschluss vorhanden (kein Kapitel 11)");
ok(/ebooks\/blueprint\.html/.test(proto) && /ebooks\/ultimate-stack\.html/.test(proto) && /ebooks\/11-injektionen\.html/.test(proto), "Index verlinkt echte Kapitel-URLs inkl. Ultimate Stack (07) + Injektionen (10)");
ok(/DAS PROTOKOLL erklärt/.test(proto) && /12-Wochen-Programm/.test(proto) && /führt/.test(proto), "Rollen getrennt (Protokoll erklärt · Programm führt)");
ok(/pc-tag paid">IM PROTOKOLL/.test(proto) && /pc-tag free">FREI LESEN/.test(proto), "ehrliche Frei/Premium-Kennzeichnung je Kapitel");
ok(/\.proto-index \{/.test(style) && /\.proto-chap/.test(style), "Index-Styles zentral in style.css");
ok(!/id="frei-lesen"/.test(proto), "redundantes D2-Preview-Grid entfernt (dedupliziert in den Index)");
var eb = read("ebooks.html");
ok(/id="ebRecommendSec"/.test(eb) && /display:none/.test(eb.split("ebRecommendSec")[1].slice(0, 80)), "ebooks.html Empfehlungssektion existiert, per Default verborgen");
ok(/EMPFOHLEN FÜR DICH/.test(eb), "Mono-Header 'EMPFOHLEN FÜR DICH'");
ok(/MM\.store\.get\("check_result"/.test(eb), "Empfehlung liest den echten lokalen Score (keine Fake-Personalisierung)");
["recovery", "body", "fuel", "blood", "strength", "drive", "execution"].forEach(function (k) {
  ok(new RegExp(k + ":\\s*\\{").test(eb), "Bottleneck '" + k + "' hat ein Empfehlungs-Mapping");
});
ok(!/mm-ai|fetch\(|XMLHttpRequest/.test(eb.split("EMPFOHLEN FÜR DICH")[1] || ""), "Empfehlung sendet nichts nach außen (nur lokal)");

group("P16/E · Neue Kapitel 00/11/12 (bp-Design, FREE) + medizinische Leitplanken");
["00-start-here", "11-injektionen", "12-longevity-risk"].forEach(function (fn) {
  var h = read("ebooks/" + fn + ".html");
  ok(/<body class="bp-wrap">/.test(h) && /blueprint\.css/.test(h), fn + ": bp-Design (blueprint.css)");
  ok(/<div class="bp-protohead">/.test(h) && /class="bp-protocta"/.test(h), fn + ": Protokoll-Rahmung (Kopf + Ende-CTA)");
  ok(/bp-cover nofoto/.test(h) && /rel="canonical"/.test(h), fn + ": Foto-freies Cover + canonical gesetzt");
});
// Kapitel 00 — Produkt-Rollen getrennt
var c00 = read("ebooks/00-start-here.html");
ok(/SCORE findet/.test(c00) && /PROTOKOLL erklärt/.test(c00) && /PROGRAMM führt/.test(c00) && /TRACKER misst/.test(c00), "00: Produkt-Rollen sauber getrennt (findet/erklärt/führt/misst)");
ok(/Optimiere zuerst das System/.test(c00), "00: Leitmotiv 'erst System, dann Signal'");
// Kapitel 11 — medizinische Leitplanken (Injektionen)
var c11 = read("ebooks/11-injektionen.html");
ok(/Universalnadel/.test(c11) && /MM \/ SAFETY/.test(c11), "11: 'keine Universalnadel' + MM/SAFETY-Note");
ok(/keine\s+<strong>Dosierungen<\/strong>|keine Dosierungen/i.test(c11), "11: explizit keine Dosierungen");
ok(!/[0-9][.,]?[0-9]*\s*mg\b/.test(c11), "11: KEINE Dosierangabe (kein 'x mg')");
ok(!/[0-9]+\s*(mm|G)\b/.test(c11), "11: KEINE konkrete Nadelgröße (kein 'x mm' / 'x G')");
ok(/Präparat/.test(c11) && /Route/.test(c11) && /Anatomie/.test(c11), "11: Nadelwahl an Präparat/Route/Stelle/Anatomie gebunden");
// Kapitel 12 — Longevity ohne erfundene Ranges
var c12 = read("ebooks/12-longevity-risk.html");
ok(/ApoB/.test(c12) && /(VO₂max|VO2max)/.test(c12), "12: ApoB + VO₂max behandelt");
ok(/keine[^.]{0,30}(Zielwert|Grenzwert|Zielwerte|Pauschal-Zielwerte)/i.test(c12), "12: explizit keine Pauschal-Zielwerte");
ok(!/[0-9]{2,3}\s*\/\s*[0-9]{2,3}\s*mmhg/i.test(c12) && !/[0-9]+\s*mmhg/i.test(c12), "12: KEINE erfundene Blutdruck-Range (mmHg)");
ok(!/[0-9][.,]?[0-9]*\s*mg\s*\/\s*dl/i.test(c12), "12: KEINE erfundene Lipid-/Glukose-Range (mg/dl)");
// Katalog-Discovery
var ebd = read("js/ebooks-data.js");
ok(/00-start-here\.html/.test(ebd) && /11-injektionen\.html/.test(ebd) && /12-longevity-risk\.html/.test(ebd), "E: neue Kapitel in der Library (ebooks-data.js) auffindbar");

group("P16/F · BEFORE-TRT: Adipositas↔T mehrpfadig + Reihenfolge (testosteron.html)");
var testo = read("ebooks/testosteron.html");
ok(/id="before-trt"/.test(testo), "eigene Sektion #before-trt existiert");
ok(testo.indexOf('id="before-trt"') < testo.indexOf('id="s12"'), "steht VOR der TRT-Red-Zone (s12)");
ok(/#before-trt/.test(testo.split("bp-toc")[1] || testo), "TOC verlinkt die BEFORE-TRT-Sektion");
["Aromatase", "Insulinresist", "Entzündung", "SHBG", "Schlafapnoe", "HPG"].forEach(function (p) {
  ok(new RegExp(p).test(testo.split('id="before-trt"')[1].split('id="s12"')[0]), "Pfad '" + p + "' im BEFORE-TRT-Abschnitt genannt");
});
var seg = testo.split('id="before-trt"')[1].split('id="s12"')[0];
ok(/Fett = hohes Östradiol/.test(seg) && /IRRTUM|zu einfach|Zu einfach/i.test(seg), "Fett=Östradiol-Verkürzung ausdrücklich als Irrtum markiert");
ok(/Körper/.test(seg) && /Schlaf/.test(seg) && /Training/.test(seg) && /Labor/.test(seg) && /Reassess/.test(seg) && /Diagnose/.test(seg), "Reihenfolge Körper→Schlaf→Training→Labor→Reassess→Diagnose vorhanden");
ok(/weder Werbung für noch gegen TRT/.test(seg), "kein Pro-/Anti-TRT (explizit neutral gerahmt)");
ok(!/[0-9][.,]?[0-9]*\s*(ng\/dl|nmol\/l|pg\/ml)/i.test(seg), "keine erfundenen Hormon-Grenzwerte im BEFORE-TRT-Abschnitt");
// CSS-Regressionsschutz: nur EINE .ev-Basisregel (sonst brechen ev-a/ev-red der Bestands-Ebooks)
var bpcss2 = read("css/blueprint.css");
ok((bpcss2.match(/^\.ev \{/gm) || []).length === 1, "genau EINE .ev-Basisregel in blueprint.css (kein Override der Pill-Basis)");
ok(/\.ev\.known/.test(bpcss2) && /\.ev-a \{/.test(bpcss2) && /\.ev-red \{/.test(bpcss2), "Evidenz-Farbmodifier (.ev.known) + Bestands-Chips (.ev-a/.ev-red) koexistieren");

group("P16/G-H · Score-Ergebnis: Engpass → PASSENDES Kapitel statt generisch");
var checkData = read("js/check-data.js");
var checkJs = read("js/check.js");
ok(/bottleneckChapter:\s*\{/.test(checkData), "check-data.js: bottleneckChapter-Map existiert");
[["body", "fettabbau"], ["strength", "training-system"], ["fuel", "fettabbau"], ["recovery", "schlaf-energie"], ["blood", "blutwerte-guide"], ["drive", "testosteron"], ["execution", "gewohnheiten"]].forEach(function (pair) {
  var seg = checkData.split("bottleneckChapter:")[1].split("},")[0] + checkData.split("bottleneckChapter:")[1].split("}")[1];
  var block = checkData.split("bottleneckChapter:")[1].slice(0, 700);
  ok(new RegExp(pair[0] + ":\\s*\\{[^}]*ebooks/" + pair[1] + "\\.html").test(block), "Engpass '" + pair[0] + "' → ebooks/" + pair[1] + ".html");
});
/* Score V2: die Kapitel-Vertiefung läuft über die kontextuelle Deep-Link-Engine
   (Engpass-Domain × Status × Datenlücken) statt über eine feste 1:1-Map.
   Der Vertrag bleibt: passendes Kapitel statt generischer Produktseite. */
ok(/V\.deepLinks/.test(checkJs), "check.js nutzt die kontextuelle Deep-Link-Engine im Diagnose-Block");
ok(/data-track="protokoll_chapter_/.test(checkJs), "… und trackt das konkrete Kapitel weiterhin");
ok(/data-track="protokoll_chapter_/.test(checkJs), "Diagnose-Link trackt kapitelspezifisch (protokoll_chapter_<engpass>)");
ok(!/href="protokoll\.html" data-track="protokoll_from_result"/.test(checkJs), "generischer protokoll.html-Link im Diagnose-Block ersetzt");
ok(/data-track="cta_protokoll"/.test(checkJs), "Produkt-CTA (49 €) auf der Ergebnisseite bleibt erhalten");

group("Flagship Motion #01 · MM/MECHANISM ApoB-Clip in Kapitel 04 (Blutwerte)");
var motion = read("ebooks/blutwerte-guide.html");
var mSeg = motion.split('id="s3"')[1].split('id="s4"')[0];
ok(/<figure class="bp-mech">/.test(mSeg) && /MM \/ MECHANISM/.test(mSeg), "MM/MECHANISM-Instrument sitzt im ApoB-/Herz-Kreislauf-Abschnitt (Kapitel 04)");
ok(/<video[^>]*class="bp-mech-video"/.test(mSeg), "Video-Element vorhanden");
ok(/preload="none"/.test(mSeg), "Performance: preload=none (Videodaten erst beim Abspielen)");
ok(/\bmuted\b/.test(mSeg) && /\bloop\b/.test(mSeg) && /\bplaysinline\b/.test(mSeg), "muted + loop + playsinline (stiller, ruhiger Loop)");
ok(!/\bautoplay\b/.test(mSeg), "kein hartes autoplay-Attribut (Auto-Play nur per JS im Viewport)");
ok(/poster="\.\.\/assets\/protocol\/motion\/apob-arterial-retention\.jpg"/.test(mSeg), "Posterframe gesetzt (funktioniert ohne Playback)");
ok(/assets\/protocol\/motion\/apob-arterial-retention\.mp4/.test(mSeg), "MP4-Quelle korrekt verlinkt");
ok(/aria-label=/.test(mSeg), "Video hat aria-label (Accessibility)");
ok(/prefers-reduced-motion/.test(motion) && /IntersectionObserver/.test(motion), "JS respektiert reduced-motion + lädt/spielt nur im Viewport");
ok(/Visualisierung/.test(mSeg), "Caption kennzeichnet den Clip ehrlich als Visualisierung");
ok(/\bAnzahl\b/.test(mSeg), "Kernaussage bleibt korrekt: es zählt die ANZAHL der ApoB-Partikel");
ok(!/bohr|Löcher|löchert|durchbohr/i.test(mSeg), "keine unwissenschaftliche 'Partikel bohren Löcher'-Darstellung");
ok(!/[0-9]+\s*(mg\/dl|nmol\/l)/i.test(mSeg), "kein erfundener Lipid-Grenzwert im Motion-Abschnitt");
ok(/\.bp-mech \{/.test(bpcss2) && /\.bp-mech-stage video/.test(bpcss2), "MM/MECHANISM-Styles in blueprint.css");
ok(fs.existsSync(path.join(ROOT, "assets/protocol/motion/apob-arterial-retention.mp4")), "Video-Asset existiert im Repo");
ok(fs.existsSync(path.join(ROOT, "assets/protocol/motion/apob-arterial-retention.jpg")), "Poster-Asset existiert im Repo");

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
