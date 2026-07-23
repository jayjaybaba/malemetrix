/* ==========================================================================
   MALEMETRIX PHASE 9.7 — Launch-Readiness (First 100 Users)
   Statische Zusicherungen über die öffentlichen Seiten: keine versehentliche
   Sprachmischung in Kern-Headlines, genau eine primäre CTA je Acquisition-
   Seite, keine toten Links, keine Fake-Live-Feature-Behauptungen, saubere
   Navigation ohne Dubletten/404.
   Ausführen:  node tools-dev/tests/launch-readiness.test.js
   ========================================================================== */
"use strict";
var fs = require("fs");
var path = require("path");
var ROOT = path.resolve(__dirname, "../..");
function read(f) { return fs.readFileSync(path.join(ROOT, f), "utf8"); }
function exists(f) { try { return fs.existsSync(path.join(ROOT, f.split("#")[0].split("?")[0])); } catch (e) { return false; } }
var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

var PUBLIC = ["index", "check", "ebooks", "coaching", "trust", "faq", "ueber", "kontakt", "checkout", "blog", "shop"];
var ACQUISITION = ["index", "check", "coaching"]; // Seiten mit klarer Haupt-CTA

/* ===== 1) Keine versehentliche englische Kern-Headline (DE-First) ===== */
group("Sprach-Konsistenz · keine versehentliche englische Headline");
(function () {
  var idx = read("index.html");
  ok(!/Build the body|Protect the system/i.test(idx), "Homepage-H1 ist nicht mehr englisch");
  // Bekannte legitime Marken-/Nav-Begriffe (Library, Score, Today, Stack) sind erlaubt.
  var ENGLISH_SENTENCE = /(Unlock your|Optimize your|Next-generation|AI-powered|data-driven)/i;
  PUBLIC.forEach(function (p) {
    var html = read(p + ".html");
    ok(!ENGLISH_SENTENCE.test(html), p + ".html: keine generische englische SaaS-Phrase");
  });
})();

/* ===== 2) Genau eine sichtbare H1 je öffentlicher Seite ===== */
group("Struktur · genau eine H1 je Seite");
(function () {
  PUBLIC.forEach(function (p) {
    var html = read(p + ".html");
    var count = (html.match(/<h1[\s>]/g) || []).length;
    ok(count === 1, p + ".html: genau eine <h1> (" + count + ")");
  });
})();

/* ===== 3) Acquisition-Seiten haben eine Primär-CTA zum Score/Ziel ===== */
group("Conversion · Haupt-CTA auf Acquisition-Seiten vorhanden");
(function () {
  ACQUISITION.forEach(function (p) {
    var html = read(p + ".html");
    ok(/class="btn btn-primary/.test(html), p + ".html: mind. eine primäre CTA");
  });
  var idx = read("index.html");
  ok(/check\.html"[^>]*btn btn-primary|btn btn-primary[^>]*data-track="score_start_click"/.test(idx.replace(/\n/g, " ")),
    "Homepage-Haupt-CTA führt zum Score");
})();

/* ===== 4) Keine toten Links / Platzhalter in öffentlichen Seiten ===== */
group("Dead-Ends · keine href=\"#\" oder Coming-Soon in öffentlicher UI");
(function () {
  PUBLIC.forEach(function (p) {
    var html = read(p + ".html");
    ok(!/href="#"/.test(html), p + ".html: kein href=\"#\" Dead-Link");
    ok(!/coming soon|demnächst verfügbar|>bald<|placeholder-link/i.test(html), p + ".html: kein Coming-Soon-Platzhalter");
  });
})();

/* ===== 5) Keine Fake-Live-Feature-Behauptungen in öffentlicher Copy ===== */
group("Ehrlichkeit · keine nicht-operativen Feature-Claims");
(function () {
  var FAKE = /(Apple Health|HealthKit|Google Fit|\bOura\b|\bWhoop\b|\bGarmin\b|Wearable-Sync|automatische Synchronisation|Echtzeit-Sync|native App im App Store)/i;
  PUBLIC.forEach(function (p) {
    var html = read(p + ".html");
    ok(!FAKE.test(html), p + ".html: keine nicht-operative Integrations-Behauptung");
  });
})();

/* ===== 6) Navigation · Kernziele vorhanden, existieren, keine Dubletten ===== */
group("Navigation · Kernziele existieren, keine Dublette");
(function () {
  var idx = read("index.html");
  var navBlock = (idx.match(/<nav class="main-nav"[\s\S]*?<\/nav>/) || [""])[0];
  var hrefs = (navBlock.match(/href="([^"]+)"/g) || []).map(function (h) { return h.slice(6, -1); });
  ["check.html", "ebooks.html", "coaching.html", "mein-protokoll.html"].forEach(function (dest) {
    ok(hrefs.indexOf(dest) >= 0, "Nav enthält " + dest);
  });
  // Alle Nav-Ziele existieren als Datei (interne .html-Links)
  hrefs.filter(function (h) { return /\.html/.test(h) && !/^https?:/.test(h); }).forEach(function (h) {
    ok(exists(h), "Nav-Ziel existiert: " + h);
  });
  // Keine doppelte identische Ziel-URL in der Hauptnav (Dublette)
  var seen = {}, dup = false;
  hrefs.forEach(function (h) { if (seen[h]) dup = true; seen[h] = 1; });
  ok(!dup, "keine doppelten Nav-Ziele");
})();

/* ===== 7) First-Session-Pfad erreichbar (Onboarding-Einstieg) ===== */
group("First-Session · Onboarding-Einstieg erreichbar");
(function () {
  ok(exists("mein-protokoll.html"), "My MaleMetrix (Produkt-Einstieg) existiert");
  var mp = read("mein-protokoll.html");
  ok(/check\.html/.test(mp), "Produkt-Einstieg verlinkt den Score (erster Schritt)");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
