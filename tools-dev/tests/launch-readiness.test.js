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
  // ebooks.html ist bewusst KEIN Nav-Kernziel mehr (Founder-Entscheidung:
  // 'Kapitelübersicht' raus aus dem Menü) — die Seite bleibt über die App
  // (Protokoll-Tab · Vertiefung) und den Reader-Header erreichbar.
  ["check.html", "protokoll.html", "coaching.html", "mein-protokoll.html"].forEach(function (dest) {
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

  /* Der Sammelpunkt heißt "Mehr" und trägt die drei kostenlosen Tracker.
     Vorher hieß er "Über" und enthielt nur Info-Seiten — die Tracker waren
     ausschließlich im Footer verlinkt und damit praktisch unauffindbar.
     Geprüft wird auf ALLEN Seiten mit dieser Navigation: eine neue Seite mit
     altem Nav-Block würde den Besucher sonst in eine andere Website werfen. */
  var seiten = fs.readdirSync(ROOT).filter(function (f) {
    return /\.html$/.test(f) && read(f).indexOf('class="nav-more-toggle"') !== -1;
  });
  ok(seiten.length >= 25, "die Sammel-Navigation ist flächendeckend vorhanden (" + seiten.length + " Seiten)");
  var fehlt = [];
  seiten.forEach(function (f) {
    var h = read(f);
    var mehr = /<button class="nav-more-toggle" data-i18n="nav\.more">Mehr<\/button>/.test(h);
    var trk = ["tracker.html", "dinner.html", "labor.html", "tools.html"].every(function (d) {
      return h.indexOf('<a href="' + d + '"') !== -1;
    });
    if (!mehr || !trk) fehlt.push(f + (mehr ? "" : " [Titel]") + (trk ? "" : " [Tracker]"));
  });
  ok(fehlt.length === 0, "jede Seite trägt \"Mehr\" + die drei Tracker + die Rechner (fehlt: " + (fehlt.join(", ") || "nichts") + ")");

  /* Anabole Matrix + Stack Builder gehören auf JEDE Seite mit dieser
     Navigation, aus demselben Grund wie die Tracker: Eine neue Seite mit
     altem Nav-Block schneidet den Besucher von beiden ab, ohne dass es
     jemandem auffällt. Der Stack Builder zeigt bewusst auf die Plan-Ansicht
     der App — dort wird er gerendert (vPlan in js/os/app.js). */
  var fehltNeu = [];
  seiten.forEach(function (f) {
    var h = read(f);
    var m = h.indexOf('<a href="anabole-matrix.html" data-i18n="nav.matrix">') !== -1;
    var sb = h.indexOf('<a href="mein-protokoll.html#plan" data-i18n="nav.stackBuilder">') !== -1;
    if (!m || !sb) fehltNeu.push(f + (m ? "" : " [Matrix]") + (sb ? "" : " [StackBuilder]"));
  });
  ok(fehltNeu.length === 0, "… und Anabole Matrix + Stack Builder (fehlt: " + (fehltNeu.join(", ") || "nichts") + ")");

  /* Der Stack Builder steht NICHT unter „Kostenlos" — dort wäre er eine
     Zusage, die er nicht einlöst. Eigene Gruppe, eigenes Label. */
  var beispiel = read("index.html");
  var frei = beispiel.split('data-i18n="nav.freeGroup"')[1].split('data-i18n="nav.myGroup"')[0];
  ok(frei.indexOf("anabole-matrix.html") !== -1, "die Anabole Matrix steht unter \"Kostenlos\" — sie ist frei");
  ok(frei.indexOf("mein-protokoll.html#plan") === -1, "der Stack Builder steht NICHT unter \"Kostenlos\"");

  /* Das Ziel muss in der App wirklich eine Ansicht sein, sonst landet der
     Besucher stillschweigend auf „today". */
  var osApp = read("js/os/app.js");
  var views = (osApp.match(/var VIEWS = \[([^\]]+)\]/) || ["", ""])[1];
  ok(/"plan"/.test(views), "\"plan\" ist eine echte Ansicht der App");
  ok(/--- STACK INTELLIGENCE ---/.test(osApp.split("function vPlan()")[1] || ""),
    "und der Stack Builder wird genau dort gerendert");

  ["nav.matrix", "nav.myGroup", "nav.stackBuilder"].forEach(function (k) {
    ok(new RegExp('"' + k.replace(".", "\\.") + '":').test(read("js/i18n.js")), "i18n-Schlüssel vorhanden: " + k);
  });
  // Die Übersetzungen müssen zu den neuen Schlüsseln existieren, sonst stünde
  // in der EN-Ansicht der deutsche Text.
  var i18n = read("js/i18n.js");
  ["nav.more", "nav.freeGroup", "nav.trackerGym", "nav.trackerFood", "nav.trackerLabs", "nav.calc", "nav.aboutGroup"].forEach(function (k) {
    ok(new RegExp('"' + k.replace(".", "\\.") + '":').test(i18n), "i18n-Schlüssel vorhanden: " + k);
  });
  ok(/"nav\.more":\s*\{ de: "Mehr", en: "More" \}/.test(i18n), "nav.more ist DE \"Mehr\" / EN \"More\"");
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
