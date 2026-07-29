/* ==========================================================================
   MALEMETRIX — PRODUKTVORSCHAU
   Sichert die zwei Eigenschaften ab, an denen eine Vorschau scheitert:
   1. Sie zeigt die ECHTE Logik (eine Quelle, kein nachgebautes Mockup).
   2. Sie zeigt KEINEN bezahlten Inhalt.
   Plus: die Demo-Profile sind als Demo gekennzeichnet und werden nicht als
   Ergebnisse verkauft.
   Ausführen:  node tools-dev/tests/vorschau.test.js
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

/* Vorschau in einer minimalen DOM-Attrappe rendern. */
function renderPreview() {
  var handlers = [];
  var rootEl = { innerHTML: "", addEventListener: function (t, f) { handlers.push(f); } };
  var sb = { window: {}, console: { log: function () {} },
    document: { getElementById: function (id) { return id === "pvRoot" ? rootEl : null; }, addEventListener: function () {} } };
  vm.createContext(sb);
  vm.runInContext(read("js/program-framework.js"), sb);
  vm.runInContext(read("js/vorschau.js"), sb);
  return {
    html: function () { return rootEl.innerHTML; },
    F: sb.window.MM.programFramework,
    click: function (attr, val) {
      handlers.forEach(function (f) {
        f({ target: { closest: function (s) { return s === "[" + attr + "]" ? { getAttribute: function () { return val; } } : null; } } });
      });
    }
  };
}

/* ===== 1) Eine Quelle für die Programmlogik ===== */
group("Framework · geteilt statt dupliziert");
(function () {
  var course = read("js/course.js");
  var fw = read("js/program-framework.js");
  ok(/MM\.programFramework/.test(course), "course.js bezieht das Gerüst aus dem geteilten Modul");
  ok(/MM\.programFramework\s*=/.test(fw), "program-framework.js exportiert das Gerüst");
  /* Die Tabellen dürfen NUR einmal definiert sein — sonst laufen Produkt und
     Vorschau auseinander, ohne dass es jemand merkt. */
  ["var DAY = {", "var MODES = {", "var BOTTLENECKS = {", "var PHASES = [", "var NUTRI = {"].forEach(function (decl) {
    var name = decl.replace(/^var | = [[{]$/g, "").trim();
    ok(course.indexOf(decl) < 0, "course.js definiert " + name + " nicht erneut");
    ok(fw.indexOf(decl) >= 0, "program-framework.js ist die Quelle für " + name);
  });
  ok(!/function buildWeekdayPattern/.test(course), "die Mustergenerierung liegt nicht doppelt in course.js");
  /* Das Framework muss rein bleiben: kein Speicher, kein DOM. Kommentare
     erwähnen beides absichtlich — geprüft wird der Code, nicht die Prosa. */
  var fwCode = fw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok(!/localStorage|MM\.store|document\./.test(fwCode), "das Framework ist rein (kein Speicher, kein DOM)");
})();

/* ===== 2) Die Vorschau rendert echte Engine-Ausgaben ===== */
group("Vorschau · echte Logik, nicht Mockup");
(function () {
  var pv = renderPreview();
  var html = pv.html();
  ok(html.length > 2000, "die Vorschau rendert Inhalt (" + html.length + " Zeichen)");
  ok((html.match(/data-pv-profile=/g) || []).length === 3, "drei Demo-Profile wählbar");
  ok((html.match(/data-pv-day=/g) || []).length === 7, "eine vollständige Woche mit sieben Tagen");

  /* Die gezeigten Texte müssen aus dem Framework stammen, nicht aus der Seite.
     Vergleich gegen die HTML-escapte Fassung — die Vorschau escapt korrekt. */
  var F = pv.F;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  ok(html.indexOf(esc(F.DAY.strength.full.de)) >= 0, "der Tagesplan zeigt den echten STRENGTH-Inhalt");
  ok(html.indexOf(esc(F.BOTTLENECKS.recovery.why.de)) >= 0, "die Engpass-Begründung kommt aus dem Framework");
  ok(html.indexOf(esc(F.MISSIONS[3])) >= 0, "die Wochen-Mission kommt aus dem Framework");

  /* Profilwechsel muss die Ausgabe echt verändern — sonst ist es Deko. */
  pv.click("data-pv-profile", "c");
  var h2 = pv.html();
  ok(h2 !== html, "ein Profilwechsel verändert die Ausgabe");
  ok(h2.indexOf(esc(F.BOTTLENECKS.strength.why.de)) >= 0, "Profil C zeigt den STRENGTH-Engpass");
  ok(h2.indexOf(esc(F.MISSIONS[8])) >= 0, "Profil C steht in Woche 8 (" + F.MISSIONS[8] + ")");

  /* Das Wochenmuster in der Vorschau muss dem entsprechen, was patternFor liefert. */
  var pat = F.patternFor("build", 8, "strength", { strengthWeekdays: [2, 4, 6], startWeekday: 2 });
  ok(pat.length === 7, "patternFor liefert sieben Tage");
  ok(pat.filter(function (d) { return d === "strength"; }).length === 3, "drei gewählte Krafttage landen im Muster");
  pat.forEach(function (type) { ok(!!F.DAY[type], "Tagestyp „" + type + "“ ist im Framework definiert"); });
})();

/* ===== 3) Kein bezahlter Inhalt in der Vorschau ===== */
group("Vorschau · kein bezahlter Inhalt");
(function () {
  var page = read("vorschau.html");
  var js = read("js/vorschau.js");
  ok(!/courseVault|protoVault|<script type="application\/json"/.test(page), "vorschau.html enthält keinen Vault-Payload");
  ok(!/vault|MM_COURSE|DATA\.weeks/.test(js.replace(/Vault-|courseVault`/g, "")), "vorschau.js lädt keinen Vault und keine Wochenkapitel");
  ok(!/js\/vault\.js|js\/course\.js/.test(page), "vorschau.html bindet weder Vault-Loader noch das Programm-Skript ein");
  ok(/Grenzen der Vorschau|bewusst nicht steht/.test(page), "die Seite benennt, was sie NICHT zeigt");
})();

/* ===== 4) Demo bleibt als Demo erkennbar ===== */
group("Vorschau · Demo ist als Demo gekennzeichnet");
(function () {
  var page = read("vorschau.html");
  var js = read("js/vorschau.js");
  ok(/Demo-Profile?, keine echten (Personen|Teilnehmer)/.test(page + js), "Demo-Profile sind ausdrücklich als solche gekennzeichnet");
  ok(/DEMO-WERTE|Demo-Werte/.test(page), "die Beispiel-Ausgabe ist als Demo-Wert markiert");
  ok(/ergebnisse\.html/.test(page), "die Seite verweist für echte Ergebnisse auf ergebnisse.html");
  /* Ein Demo-Profil darf nie als Erfahrungsbericht auftreten. */
  ok(!/Erfahrungsbericht|Kundenstimme|hat abgenommen und/i.test(page), "kein Demo-Profil wird als Erfahrungsbericht ausgegeben");
})();

/* ===== 5) Erreichbarkeit ===== */
group("Vorschau · verlinkt und auffindbar");
(function () {
  ok(/vorschau\.html/.test(read("index.html")), "index.html verlinkt die Vorschau");
  ok(/vorschau\.html/.test(read("protokoll.html")), "protokoll.html verlinkt die Vorschau");
  ok(/vorschau\.html/.test(read("sitemap.xml")), "sitemap.xml kennt die Vorschau");
  var page = read("vorschau.html");
  ok((page.match(/<h1[\s>]/g) || []).length === 1, "genau eine <h1>");
  ok(/program-framework\.js/.test(page) && /vorschau\.js/.test(page), "Framework und Renderer sind eingebunden");
  ok(/program-framework\.js/.test(read("kurs-programm.html")), "das Programm lädt dasselbe Framework");
})();

console.log("\n" + "-".repeat(52));
console.log(passed + " bestanden, " + failed + " fehlgeschlagen.");
process.exit(failed ? 1 : 0);
