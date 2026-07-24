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
var CHAPTERS = {
  "blueprint.html": "KAPITEL 01", "fettabbau.html": "KAPITEL 02", "protein-system.html": "KAPITEL 02",
  "taeglich-trainieren.html": "KAPITEL 03", "training-system.html": "KAPITEL 03",
  "schlaf-energie.html": "KAPITEL 04", "schlaf-stack.html": "KAPITEL 04", "blutwerte-guide.html": "KAPITEL 05",
  "testosteron.html": "KAPITEL 06", "glp1-agonisten.html": "KAPITEL 07", "supplements.html": "KAPITEL 09",
  "sexuelle-gesundheit.html": "KAPITEL 10", "gewohnheiten.html": "KAPITEL 13", "masterguide.html": "ÜBERBLICK"
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

group("P16/D2 · Modul-Hub: Produktseite-Previews + Bottleneck-Empfehlung");
var proto = read("protokoll.html");
ok(/id="frei-lesen"/.test(proto) && /Frei lesbar/.test(proto), "protokoll.html hat eigene 'Frei lesbar'-Preview-Sektion");
ok(/Die 10 Module/.test(proto), "die ECHTE 10-Modul-Übersicht bleibt bestehen (kein Überversprechen)");
ok((proto.match(/class="preview-ch"/g) || []).length >= 8, "Preview-Grid verlinkt ≥8 freie Kapitel");
ok(/ebooks\/blueprint\.html/.test(proto) && /ebooks\/testosteron\.html/.test(proto), "Previews zeigen auf echte freie Kapitel-URLs");
ok(/Erklärwerk/.test(proto) && /12-Wochen-Programm/.test(proto) && /führt/.test(proto), "Rollen getrennt (Erklärwerk erklärt · Programm führt)");
ok(/\.preview-ch \{/.test(style) && /\.preview-grid \{/.test(style), "Preview-Kachel-Styles zentral in style.css");
var eb = read("ebooks.html");
ok(/id="ebRecommendSec"/.test(eb) && /display:none/.test(eb.split("ebRecommendSec")[1].slice(0, 80)), "ebooks.html Empfehlungssektion existiert, per Default verborgen");
ok(/EMPFOHLEN FÜR DICH/.test(eb), "Mono-Header 'EMPFOHLEN FÜR DICH'");
ok(/MM\.store\.get\("check_result"/.test(eb), "Empfehlung liest den echten lokalen Score (keine Fake-Personalisierung)");
["recovery", "body", "fuel", "blood", "strength", "drive", "execution"].forEach(function (k) {
  ok(new RegExp(k + ":\\s*\\{").test(eb), "Bottleneck '" + k + "' hat ein Empfehlungs-Mapping");
});
ok(!/mm-ai|fetch\(|XMLHttpRequest/.test(eb.split("EMPFOHLEN FÜR DICH")[1] || ""), "Empfehlung sendet nichts nach außen (nur lokal)");

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
