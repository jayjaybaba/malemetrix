/* ==========================================================================
   MALEMETRIX — Dynamische Übersetzung (DE→EN)
   Sichert die Architektur ab, die den Klon-Ansatz ersetzt: der Text der Seite
   ist die einzige Wahrheit, Englisch entsteht zur Laufzeit über mm-translate
   mit Server-Cache. Geprüft werden die Eigenschaften, auf die man sich
   verlassen muss — nicht die Formulierungen.
   Ausführen:  node tools-dev/tests/i18n-runtime.test.js
   ========================================================================== */
"use strict";
var fs = require("fs");
var path = require("path");
var ROOT = path.resolve(__dirname, "../..");
function read(f) { return fs.readFileSync(path.join(ROOT, f), "utf8"); }
var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

var i18n = read("js/i18n.js");
var glossar = read("js/i18n-en.js");
var fn = read("supabase/functions/mm-translate/index.ts");
var cfg = read("js/config.js");
var toml = read("supabase/config.toml");

/* ===== 1) Keine Seiten-Klone ===== */
group("Keine englischen Seiten-Klone");
(function () {
  var dateien = fs.readdirSync(ROOT).filter(function (f) { return /\.html$/.test(f); });
  var klone = dateien.filter(function (f) { return /(^en-|-en\.html$|^index-en)/.test(f); });
  ok(klone.length === 0, "keine englischen Kopien im Wurzelverzeichnis (gefunden: " + (klone.join(", ") || "nichts") + ")");
  ok(!fs.existsSync(path.join(ROOT, "en")), "kein /en/-Verzeichnis");
})();

/* ===== 2) Der Übersetzer arbeitet auf dem Text, nicht auf Schlüsseln ===== */
group("Laufzeit-Übersetzer · Textknoten + nachgerenderte Inhalte");
(function () {
  ok(/createTreeWalker\([\s\S]{0,80}NodeFilter\.SHOW_TEXT/.test(i18n),
     "läuft über die Textknoten der Seite (nicht nur über data-i18n)");
  ok(/new MutationObserver/.test(i18n) && /characterData: true/.test(i18n),
     "ein MutationObserver fängt alles, was JavaScript nachrendert");
  ok(/SKIP_TAGS = \{[^}]*SCRIPT[^}]*STYLE[^}]*\}/.test(i18n),
     "Skript- und Style-Inhalte werden nie angefasst");
  ok(/data-no-i18n/.test(i18n), "es gibt einen Opt-out (data-no-i18n)");
  ok(/hasAttribute\("data-i18n"\)/.test(i18n),
     "Elemente mit Schlüssel-Übersetzung werden nicht doppelt behandelt");
  ok(/ATTRS = \["placeholder", "title", "aria-label", "alt"\]/.test(i18n),
     "auch Platzhalter, Titel und Alternativtexte werden übersetzt");
})();

/* ===== 3) Deutsch bleibt die Wahrheit — nie eine kaputte Seite ===== */
group("Fehlerverhalten · unübersetzt statt kaputt");
(function () {
  var node = (i18n.match(/function translateNode[\s\S]*?\n  \}/) || [""])[0];
  ok(/if \(en == null\) \{[\s\S]{0,200}merken\(key, n, null\);\s*return;/.test(node),
     "fehlt eine Übersetzung, bleibt der deutsche Satz stehen und wird angemeldet");
  ok(/n\.__mmDe = raw/.test(node), "das Original bleibt am Knoten hängen (Rückweg auf Deutsch)");
  ok(/if \(n\.__mmDe != null\) return/.test(node), "kein doppeltes Übersetzen (keine Schleife)");
  ok(/function restoreGerman/.test(i18n) && /n\.nodeValue = n\.__mmDe/.test(i18n),
     "Rückschalten auf Deutsch stellt den Originaltext wieder her");
  ok(!/location\.reload\(\)/.test((i18n.match(/function setLang[\s\S]*?\n  \}/) || [""])[0]),
     "Rückschalten lädt die Seite NICHT neu (getippte Formulareingaben bleiben)");
  var send = (i18n.match(/function senden\(\)[\s\S]*?\n  \}/) || [""])[0];
  ok(/ANGEFRAGT\.add/.test(send) && /!ANGEFRAGT\.has\(k\)/.test(send),
     "jeder Satz wird höchstens einmal angefragt (keine Endlos-Schleife)");
  ok(/dienstAus = true/.test(i18n), "bei Netz-/Konfigurationsfehler wird der Dienst still abgeschaltet");
})();

/* ===== 4) Rechtstexte und Premium-Inhalte bleiben unangetastet ===== */
group("Grenzen · Recht und gekauftes Produkt");
(function () {
  ok(/LEGAL_PAGES = \["agb\.html", "datenschutz\.html", "impressum\.html"\]/.test(i18n),
     "AGB, Datenschutz und Impressum sind als Rechtsseiten markiert");
  ok(/if \(istRechtsseite\(\) \|\| istPremiumReader\(\)\) return;/.test(i18n),
     "auf Rechtsseiten und im Premium-Reader wird nicht übersetzt");
  ok(/legally binding version/.test(i18n),
     "englische Besucher bekommen auf Rechtsseiten einen ehrlichen Hinweis");
  ok(/istPremiumReader[\s\S]{0,120}\/ebooks\//.test(i18n),
     "der Premium-Reader (/ebooks/) ist ausgenommen");
})();

/* ===== 5) Kosten: jeder Satz genau einmal ===== */
group("Kosten · Cache auf zwei Ebenen, hartes Budget");
(function () {
  ok(/CACHE_KEY = "mm_i18n_en_v1"/.test(i18n) && /localStorage\.setItem\(CACHE_KEY/.test(i18n),
     "Client-Cache: wiederkehrende Besucher fragen gar nicht");
  ok(/CACHE_MAX_CHARS/.test(i18n), "der Client-Cache ist in der Größe begrenzt");
  ok(/from\("translations"\)[\s\S]{0,160}\.in\("source_hash", hashes\)/.test(fn),
     "Server-Cache wird VOR dem Anbieter gefragt");
  ok(fn.indexOf('.in("source_hash", hashes)') < fn.indexOf('Deno.env.get("DEEPL_API_KEY")'),
     "die Reihenfolge ist Cache → Anbieter, nicht umgekehrt");
  ok(/BUDGET_CHARS/.test(fn) && /gebremst/.test(fn) && /throttled: true/.test(fn),
     "Monatsbudget bremst den Anbieter, ohne die Seite zu zerstören");
  ok(/MAX_NEW_PER_HOUR/.test(fn), "Stundenbremse gegen Missbrauchs-Spikes");
  ok(/MAX_TEXTS = 48/.test(fn) && /MAX_TEXT_LEN/.test(fn) && /MAX_REQUEST_CHARS/.test(fn),
     "harte Größengrenzen pro Anfrage");
  ok(/translation_budget/.test(fn),
     "die Budget-Prüfung fragt eine Summe ab, nicht alle Monatszeilen");
  ok(/ignoreDuplicates: true/.test(fn),
     "gleichzeitige Anfragen für denselben Satz kollidieren nicht");
})();

/* ===== 6) Qualität: Marken und Fachbegriffe ===== */
group("Qualität · Marken bleiben, Fachbegriffe sitzen");
(function () {
  ok(/ignore_tags/.test(fn) && /protectBrands/.test(fn),
     "Markennamen werden dem Anbieter als unantastbar markiert");
  ok(/BRANDS = \[[^\]]*MaleMetrix[^\]]*BloodMetrix/.test(fn), "die Markenliste enthält die Eigennamen");
  // Nur die BRANDS-Zeile prüfen: im Kommentar darüber stehen dieselben Namen.
  var brandLine = (fn.match(/const BRANDS = \[[^\]]*\]/) || [""])[0];
  ok(brandLine.indexOf('"MaleMetrix Score"') < brandLine.indexOf('"MaleMetrix"'),
     "längere Marken stehen vor kürzeren (sonst zerschneidet die Ersetzung sie)");
  ok(/unprotect\(String\(x\.text/.test(fn), "die Schutz-Tags werden aus der Antwort entfernt");
  ok(/DAS PROTOKOLL": "THE PROTOCOL"/.test(glossar) && /"Engpass": "bottleneck"/.test(glossar),
     "das Glossar setzt Produkt- und Fachbegriffe fest");
  // Das Glossar darf kein zweites Volltext-Wörterbuch werden — sonst driftet es.
  var eintraege = (glossar.match(/^\s{2}"/gm) || []).length;
  ok(eintraege > 0 && eintraege < 160,
     "das Glossar bleibt klein (" + eintraege + " Einträge) — kein zweites Wörterbuch");
  ok(!/<[a-z]+>/i.test(glossar.replace(/\/\*[\s\S]*?\*\//g, "")),
     "keine HTML-Tags in den Glossar-Werten (ersetzt wird reiner Text)");
})();

/* ===== 7) Datenschutz: nur Seitentext, keine Nutzereingaben ===== */
group("Datenschutz · es verlässt nur Seitentext den Browser");
(function () {
  ok(/TEXTAREA: 1/.test(i18n), "Textfelder (textarea) werden nie gelesen");
  var attrs = (i18n.match(/ATTRS = \[[^\]]*\]/) || [""])[0];
  ok(!/"value"/.test(attrs), "Eingabewerte (value) werden nie übersetzt oder gesendet");
  ok(!/apikey|authorization/i.test((i18n.match(/fetch\(dienstUrl\(\)[\s\S]*?\}\)/) || [""])[0]),
     "die Anfrage trägt keine Zugangsdaten (öffentlicher Endpunkt, anonym)");
  ok(/verify_jwt = false/.test((toml.match(/\[functions\.mm-translate\][\s\S]*?verify_jwt = false/) || [""])[0]),
     "config.toml deklariert mm-translate als öffentlich (anonyme Besucher)");
})();

/* ===== 8) Der Schlüssel liegt nur in Supabase ===== */
group("Kostenlos by default · Schlüssel niemals im Repo");
(function () {
  /* Der Betreiber will für Englisch nichts zahlen. Deshalb MUSS der Standard
     ohne Schlüssel funktionieren — und ein bezahlter Anbieter darf nur dann
     greifen, wenn jemand ausdrücklich einen Schlüssel gesetzt hat. */
  ok(/translateMyMemory/.test(fn), "es gibt einen kostenlosen Anbieter");
  ok(/const provider = deepl \? "deepl" : \(google \? "google" : "mymemory"\)/.test(fn),
     "ohne Schlüssel wird der kostenlose Anbieter genommen (kein provider_not_configured mehr)");
  ok(!/provider_not_configured/.test(fn),
     "die Function ist nie \"nicht konfiguriert\" — Englisch funktioniert ohne Einrichtung");
  ok(/mymemoryUnbrauchbar/.test(fn) && /MYMEMORY WARNING/.test(fn),
     "Fehlermeldungen des kostenlosen Dienstes landen nie als Text auf der Seite");
  ok(/bezahlt && gesamt >= BUDGET_TOTAL/.test(fn),
     "das Gesamtbudget bremst nur bezahlte Anbieter (der kostenlose hat ein Tageslimit)");
  ok(/Deno\.env\.get\("DEEPL_API_KEY"\)/.test(fn), "DeepL-Schlüssel kommt aus der Umgebung");
  ok(!/DeepL-Auth-Key [A-Za-z0-9-]{8}/.test(fn.replace(/key\.trim\(\)/g, "")),
     "kein Schlüssel im Function-Quelltext");
  var alle = [];
  (function walk(dir) {
    fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach(function (e) {
      var rel = dir ? dir + "/" + e.name : e.name;
      if (e.name === ".git" || e.name === "node_modules") return;
      if (e.isDirectory()) return walk(rel);
      if (/\.(js|mjs|ts|html|json|md|sql|toml)$/.test(e.name)) alle.push(rel);
    });
  })("");
  // DeepL-Schlüssel sind UUID-artig und enden im Free-Tarif auf ":fx".
  var leck = alle.filter(function (f) { return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:fx/.test(read(f)); });
  ok(leck.length === 0, "kein DeepL-Schlüssel irgendwo im Repo (gefunden: " + (leck.join(", ") || "nichts") + ")");
  ok(/DEEPL_API_KEY/.test(cfg) && !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(cfg),
     "config.js dokumentiert den Schlüssel, enthält ihn aber nicht");
})();

/* ===== 9) Diagnose für den Betreiber ===== */
group("Diagnose · was fehlt, ist sichtbar");
(function () {
  ok(/untranslated\(\)/.test(i18n) && /status\(\)/.test(i18n) && /clearCache\(\)/.test(i18n),
     "MM.i18n bietet untranslated(), status() und clearCache()");
  ok(/UNTRANSLATED\[key\] = \(UNTRANSLATED\[key\] \|\| 0\) \+ 1/.test(i18n),
     "fehlende Sätze werden nach Häufigkeit gezählt");
  ok(/MM\.i18n\.untranslated\(\)/.test(cfg), "config.js erklärt, wie man Lücken findet");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
