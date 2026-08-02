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
    var sb = h.indexOf('<a href="mein-protokoll.html#plan?f=stack" data-i18n="nav.stackBuilder">') !== -1;
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

  /* Der Menüpunkt heißt „Stack Builder" — dann muss er auch dort landen und
     nicht oben in der Plan-Ansicht, wo zuerst Roadmap und Nutrition stehen. */
  ok(/#plan\?f=stack/.test(beispiel), "der Menüpunkt fährt den Stack-Abschnitt gezielt an");
  ok(/"os-sec-stack"\)/.test(osApp), "der Stack-Abschnitt trägt die Marke, die dafür angefahren wird");
  ok(/hashParam\("f"\)/.test(osApp), "render wertet den Abschnitts-Parameter aus");
  var views = (osApp.match(/var VIEWS = \[([^\]]+)\]/) || ["", ""])[1];
  ok(/"plan"/.test(views), "\"plan\" ist eine echte Ansicht der App");
  ok(/--- STACK INTELLIGENCE ---/.test(osApp.split("function vPlan()")[1] || ""),
    "und der Stack Builder wird genau dort gerendert");

  ["nav.matrix", "nav.myGroup", "nav.stackBuilder", "nav.ebooksGroup"].forEach(function (k) {
    ok(new RegExp('"' + k.replace(".", "\\.") + '":').test(read("js/i18n.js")), "i18n-Schlüssel vorhanden: " + k);
  });

  /* --- Die Kapitel im Menü ---
     Ein Menüeintrag auf eine gelöschte oder umbenannte Kapitelseite ist ein
     404, den niemand bemerkt, bis ein Besucher darauf klickt. */
  /* Nur der Navigationsblock zählt — ebooks.html und protokoll.html
     verlinken Kapitel auch im Seiteninhalt, das ist kein Menüeintrag. */
  function menuBlock(h) { return (h.match(/<div class="nav-more-menu">[\s\S]*?<\/div>/) || [""])[0]; }
  var kap = (menuBlock(beispiel).match(/href="ebooks\/[a-z0-9-]+\.html"/g) || [])
    .map(function (h) { return h.slice(6, -1); });
  ok(kap.length >= 15, "das Menü führt die Kapitel (" + kap.length + ")");
  var tot = kap.filter(function (h) { return !exists(h); });
  ok(tot.length === 0, "jedes Kapitel im Menü existiert als Datei" + (tot.length ? " (" + tot.join(", ") + ")" : ""));
  var dop = kap.filter(function (h, i) { return kap.indexOf(h) !== i; });
  ok(dop.length === 0, "kein Kapitel steht doppelt im Menü" + (dop.length ? " (" + dop.join(", ") + ")" : ""));

  /* Die drei Alt-Fassungen sind bewusst draußen: Sie zeigen denselben Inhalt
     wie ihre kanonische Fassung und stehen nur deshalb noch im Repo (siehe
     CONTENT_INVENTORY, Duplicate-Content-Schutz). Zwei Menüzeilen auf
     dasselbe Kapitel wären für den Besucher schlicht falsch. */
  ["ebooks/masterguide.html", "ebooks/schlaf-stack.html", "ebooks/training-system.html"].forEach(function (alt) {
    ok(kap.indexOf(alt) < 0, "die Alt-Fassung " + alt.replace("ebooks/", "") + " steht NICHT im Menü");
  });
  /* Das Gesamtwerk ist kein Kapitel — es hängt am Produkt, nicht an der Liste. */
  ok(kap.indexOf("ebooks/protokoll.html") < 0, "das gekaufte Gesamtwerk steht nicht zwischen den Kapiteln");

  /* Jede kanonische Kapitelseite der Engine muss auch im Menü stehen —
     sonst fehlt ein Kapitel, das das Produkt selbst führt. */
  var engine2 = read("js/check-data.js");
  var kanon = (engine2.match(/href: "ebooks\/[a-z0-9-]+\.html"/g) || [])
    .map(function (h) { return h.slice(7, -1); });
  var fehlend = kanon.filter(function (h) { return kap.indexOf(h) < 0; });
  ok(kanon.length > 0 && fehlend.length === 0,
    "jedes Kapitel aus C.CHAPTERS steht im Menü" + (fehlend.length ? " (fehlt: " + fehlend.join(", ") + ")" : " (" + kanon.length + ")"));

  /* Auf jeder Seite dieselben Kapitel — eine Seite mit altem Block würde den
     Besucher wieder abschneiden, ohne dass es auffällt. */
  var abweichend = [];
  seiten.forEach(function (f) {
    var h = read(f);
    var k2 = (menuBlock(h).match(/href="ebooks\/[a-z0-9-]+\.html"/g) || []).length;
    if (k2 !== kap.length) abweichend.push(f + " (" + k2 + ")");
  });
  ok(abweichend.length === 0, "alle Seiten führen dieselben Kapitel" + (abweichend.length ? " (" + abweichend.join(", ") + ")" : ""));

  /* Ohne Deckel wächst das Menü mit dreißig Zeilen über den Bildrand. */
  var css = read("css/style.css");
  ok(/\.nav-more-menu \{[\s\S]{0,600}max-height:/.test(css), "das Untermenü hat eine Höhenbegrenzung");
  ok(/\.nav-more-menu \{[\s\S]{0,600}overflow-y: auto/.test(css), "… und scrollt, statt abzuschneiden");

  /* Der mobile Fall ist der schlimmere: Das Schubfach ist `fixed`, wandert
     also beim Seiten-Scrollen NICHT mit. Ohne eigenen Deckel ragte es mit
     den Kapiteln 1960px hoch in ein 844px-Fenster — alles ab Eintrag zwölf
     war unerreichbar, und kein Scrollen der Seite half. */
  /* Es gibt mehrere `.main-nav`-Regeln; gemeint ist die mit dem Schubfach.
     Über `position: fixed` gefunden statt über die Reihenfolge im Sheet. */
  var mobil = (css.match(/\.main-nav \{[^}]*position: fixed[^}]*\}/) || [""])[0];
  ok(mobil.length > 100, "der mobile Navigationsblock wurde für die Prüfung gefunden");
  ok(/position: fixed/.test(mobil), "das Schubfach ist weiterhin fixiert");
  ok(/max-height: calc\(100vh - var\(--header-h\)\)/.test(mobil), "… und deshalb auf Fensterhöhe gedeckelt");
  ok(/overflow-y: auto/.test(mobil), "… und in sich scrollbar");
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
