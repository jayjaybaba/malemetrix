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

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
