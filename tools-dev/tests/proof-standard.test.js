/* ==========================================================================
   MALEMETRIX — PROOF STANDARD
   Sichert die Regeln aus PROOF_STANDARD.md technisch ab:
   1. Keine erfundenen Fallstudien — jeder Eintrag erfüllt den Standard.
   2. Der Leerzustand ist ehrlich, nicht leer-mit-Platzhaltern.
   3. Die Fallstudien-Erfassung überträgt nichts ohne Einwilligung.
   4. Öffentliche Seiten behaupten keine Ergebnisse, die es nicht gibt.
   Ausführen:  node tools-dev/tests/proof-standard.test.js
   ========================================================================== */
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var ROOT = path.resolve(__dirname, "../..");
function read(f) { return fs.readFileSync(path.join(ROOT, f), "utf8"); }
var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

/* Datenmodul in einer minimalen Fenster-Attrappe laden. */
function loadCaseStudies() {
  var sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(read("js/case-studies-data.js"), sandbox);
  return sandbox.window.MM.caseStudies;
}

/* ===== 1) Jeder veröffentlichte Eintrag erfüllt den Standard ===== */
group("Fallstudien-Daten · Standard erfüllt");
var CS = loadCaseStudies();
(function () {
  ok(Array.isArray(CS.all), "js/case-studies-data.js liefert ein Array");
  CS.all.forEach(function (cs, i) {
    var idx = "Eintrag #" + i + " (" + (cs && cs.id || "ohne id") + ")";
    ok(CS.isPublishable(cs), idx + ": erfüllt den Veröffentlichungs-Standard");
    ok(!!(cs && cs.consentId), idx + ": hat eine hinterlegte Einwilligungs-Referenz");
    ok(!!(cs && CS.verification[cs.verified]), idx + ": trägt eine gültige Prüftiefe");
    ok(String(cs && cs.notWorking || "").trim().length >= 20, idx + ": dokumentiert, was NICHT funktioniert hat");
  });
  /* published() darf nie mehr ausliefern, als der Standard zulässt. */
  ok(CS.published().length <= CS.all.length, "published() filtert, statt zu ergänzen");
  ok(CS.published().every(CS.isPublishable), "published() gibt ausschließlich standardkonforme Einträge zurück");
})();

/* ===== 2) Der Validator lässt sich nicht aushebeln ===== */
group("Validator · weist unvollständige Einträge ab");
(function () {
  var full = {
    id: "cs-test", consentId: "test", verified: "self-reported",
    context: { age: 38 }, adherencePct: 80,
    notWorking: "Die Wochenenden sind mir dreimal komplett entglitten.",
    metrics: [{ key: "waist", label: "Taille", w0: 104, w12: 97 }]
  };
  ok(CS.isPublishable(full), "vollständiger Testeintrag wäre veröffentlichbar");
  function without(mut) { var c = JSON.parse(JSON.stringify(full)); mut(c); return c; }
  ok(!CS.isPublishable(without(function (c) { delete c.consentId; })), "ohne Einwilligungs-Referenz: abgewiesen");
  ok(!CS.isPublishable(without(function (c) { c.verified = "totally-legit"; })), "mit erfundener Prüftiefe: abgewiesen");
  ok(!CS.isPublishable(without(function (c) { c.adherencePct = null; })), "ohne Adhärenz: abgewiesen");
  ok(!CS.isPublishable(without(function (c) { c.notWorking = "passt"; })), "ohne echte Reibungs-Antwort: abgewiesen");
  ok(!CS.isPublishable(without(function (c) { c.metrics[0].w12 = null; })), "ohne Endwert (W12): abgewiesen");
  ok(!CS.isPublishable(without(function (c) { c.metrics[0].w0 = null; })), "ohne Startwert (W0): abgewiesen");
  ok(!CS.isPublishable(without(function (c) { delete c.context.age; })), "ohne Alter: abgewiesen");
  ok(!CS.isPublishable(null) && !CS.isPublishable({}), "leere/kaputte Eingabe: abgewiesen");
})();

/* ===== 3) Erfassung überträgt nichts still ===== */
group("Erfassung · keine stille Übertragung");
(function () {
  var src = read("js/case-study.js");
  ok(!/fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon/.test(src),
    "case-study.js sendet Gesundheitsdaten über keinen Netzwerkkanal");
  ok(/mailto:/.test(src), "Versand läuft sichtbar über den Mail-Client des Nutzers");
  ok(/function sendDraft[\s\S]{0,400}validate\(cs\)[\s\S]{0,200}if \(!v\.ok\)/.test(src),
    "sendDraft() bricht ab, solange der Standard nicht erfüllt ist");
  ok(/consent\.granted/.test(src) && /missing\.push\(L\("Einwilligung zur Veröffentlichung/.test(src),
    "fehlende Einwilligung blockiert den Versand");
  ok(/MIN_NOT_WORKING\s*=\s*(\d+)/.test(src) && Number(RegExp.$1) >= 20,
    "„Was hat NICHT funktioniert?“ ist ein echtes Pflichtfeld (≥ 20 Zeichen)");
  /* Die Karte darf erst im Abschluss erscheinen — nicht als Dauer-Nudge. */
  var course = read("js/course.js");
  ok(/if \(final\) \{[^}]*caseStudy[^}]*renderCard/.test(course),
    "die Fallstudien-Karte erscheint nur im Abschlussbericht (Woche 12)");
})();

/* ===== 4) Öffentliche Seite behauptet nichts Unbelegtes ===== */
group("ergebnisse.html · ehrlich im Leerzustand");
(function () {
  var html = read("ergebnisse.html");
  var js = read("js/ergebnisse.js");
  ok(/<h1[\s>]/.test(html) && (html.match(/<h1[\s>]/g) || []).length === 1, "genau eine <h1>");
  ok(/case-studies-data\.js/.test(html) && /ergebnisse\.js/.test(html), "Daten- und Renderer-Skript eingebunden");
  ok(/Noch keine veröffentlichte Fallstudie/.test(js), "Leerzustand benennt den Stand offen");
  ok(/keine Studie|keine Studie\.|Einzelfall-Dokumentation/.test(html), "Einzelfall-Grenze steht auf der Seite");

  /* Solange es keine Fallstudie gibt, darf keine öffentliche Seite ein
     Ergebnis behaupten. Zahlenversprechen sind der klassische Rückfall. */
  var claims = /(\d+\s*(kg|cm)\s*(in|nach)\s*\d+\s*Wochen|garantierte[rs]?\s+Erfolg|Erfolgsquote von \d+)/i;
  var PUBLIC = ["index", "protokoll", "coaching", "ergebnisse", "ueber", "check", "faq", "trust"];
  var anyPublished = CS.published().length > 0;
  PUBLIC.forEach(function (p) {
    var src = read(p + ".html");
    ok(anyPublished || !claims.test(src), p + ".html: kein Ergebnisversprechen ohne hinterlegte Fallstudie");
  });

  /* Die Seite muss erreichbar sein, sonst ist Transparenz dekorativ. */
  ok(/ergebnisse\.html/.test(read("index.html")), "index.html verlinkt die Ergebnis-Seite");
  ok(/ergebnisse\.html/.test(read("ueber.html")), "ueber.html verlinkt die Ergebnis-Seite");
  ok(/ergebnisse\.html/.test(read("sitemap.xml")), "sitemap.xml kennt die Ergebnis-Seite");
})();

/* ===== 5) Der Standard ist dokumentiert ===== */
group("PROOF_STANDARD.md · Regeln festgeschrieben");
(function () {
  var md = read("PROOF_STANDARD.md");
  ["Es wird nichts erfunden", "self-reported", "founder-verified", "photo-verified",
   "Abschlussquote", "Einwilligung"].forEach(function (k) {
    ok(md.indexOf(k) >= 0, "PROOF_STANDARD.md behandelt: " + k);
  });
})();

console.log("\n" + "-".repeat(52));
console.log(passed + " bestanden, " + failed + " fehlgeschlagen.");
process.exit(failed ? 1 : 0);
