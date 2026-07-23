/* ==========================================================================
   MALEMETRIX PHASE 9.8 — i18n-Engine + Dictionary-Parität
   Lädt js/i18n.js in einer gemockten Browser-Umgebung und prüft: kanonische
   Locales, Normalisierung, Browser-Erkennung, Persistenz-/Manuelle-Wahl-Logik,
   Formatierung (Intl), Pluralisierung, Fallback/Diagnose und DE/EN-Parität.
   Ausführen:  node tools-dev/tests/i18n.test.js
   ========================================================================== */
"use strict";
var path = require("path");
var fs = require("fs");
var ROOT = path.resolve(__dirname, "../..");
var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

/* ---- Minimal-DOM-Mock, lädt js/i18n.js frisch mit gewünschtem Zustand ---- */
function loadI18n(opts) {
  opts = opts || {};
  var store = opts.store || {};
  global.localStorage = {
    getItem: function (k) { return k in store ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  Object.defineProperty(global, "navigator", {
    value: { language: opts.language || "de-DE", languages: opts.languages || [opts.language || "de-DE"] },
    configurable: true, writable: true
  });
  var el = { lang: "" };
  global.document = {
    documentElement: el,
    readyState: "complete",
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    dispatchEvent: function () {}
  };
  global.CustomEvent = function () {};
  global.window = {};
  delete require.cache[require.resolve(path.join(ROOT, "js/i18n.js"))];
  require(path.join(ROOT, "js/i18n.js"));
  return { i18n: global.window.MM.i18n, store: store, htmlEl: el };
}

/* ===== 1) Kanonische Locales + Normalisierung (§4) ===== */
group("Locales · genau DE/EN + Normalisierung");
(function () {
  var m = loadI18n().i18n;
  ok(m.supported.length === 2 && m.supported.indexOf("de") >= 0 && m.supported.indexOf("en") >= 0, "genau [de, en] unterstützt");
  ok(m.norm("de-DE") === "de" && m.norm("DE") === "de" && m.norm("Deutsch") === "de" && m.norm("german") === "de", "de-DE/DE/Deutsch/german → de");
  ok(m.norm("en-US") === "en" && m.norm("en-GB") === "en" && m.norm("EN") === "en" && m.norm("english") === "en", "en-US/en-GB/EN/english → en");
  ok(m.norm("fr") === null && m.norm("") === null && m.norm(null) === null, "unbekannt/leer → null");
})();

/* ===== 2) Erstbesuch-Browser-Erkennung (§5) ===== */
group("Erstbesuch · Browser-Erkennung, DE-Fallback");
(function () {
  ok(loadI18n({ language: "en-US", languages: ["en-US"], store: {} }).i18n.lang === "en", "englischer Browser, kein Store → en");
  ok(loadI18n({ language: "de-DE", languages: ["de-DE"], store: {} }).i18n.lang === "de", "deutscher Browser, kein Store → de");
  ok(loadI18n({ language: "fr-FR", languages: ["fr-FR"], store: {} }).i18n.lang === "de", "nicht unterstützter Browser → de (Fallback)");
})();

/* ===== 3) Manuelle Wahl gewinnt / Persistenz (§5, §6) ===== */
group("Persistenz · manuelle Wahl schlägt Browser");
(function () {
  var a = loadI18n({ language: "de-DE", store: { mm_lang: "en" } });
  ok(a.i18n.lang === "en", "deutscher Browser aber gespeichertes EN → en");
  var b = loadI18n({ language: "en-US", store: {} });
  b.i18n.setLang("de");
  ok(b.store.mm_lang === "de", "setLang persistiert die Wahl");
  ok(b.i18n.lang === "de", "Laufzeit-Sprache aktualisiert");
  ok(b.htmlEl.lang === "de", "document.documentElement.lang gesetzt (§41)");
})();

/* ===== 4) Fallback + Diagnose (§37) ===== */
group("Fallback · fehlender Key null + Diagnose");
(function () {
  var m = loadI18n().i18n;
  ok(m.t("nav.check") != null, "vorhandener Key liefert Wert");
  ok(m.t("does.not.exist.key") === null, "fehlender Key → null (kein roher Key-Leak)");
  ok(Object.keys(m.missing()).indexOf("does.not.exist.key") >= 0, "fehlender Key wird in missing() protokolliert");
})();

/* ===== 5) Interpolation + Pluralisierung (§40) ===== */
group("Interpolation + Plural");
(function () {
  var m = loadI18n().i18n;
  m.extend({ "test.hi": { de: "Hallo {name}", en: "Hi {name}" } });
  ok(m.t("test.hi", { name: "Max" }) === "Hallo {name}".replace("{name}", "Max"), "Platzhalter-Interpolation");
  ok(m.plural(1, { one: "{n} Tag", other: "{n} Tage" }) === "1 Tag", "Plural: 1 → Singular");
  ok(m.plural(3, { one: "{n} Tag", other: "{n} Tage" }) === "3 Tage", "Plural: 3 → Plural");
})();

/* ===== 6) Zahlen-/Datumsformatierung locale-korrekt (§38, §39) ===== */
group("Intl · Zahlen + Datum");
(function () {
  var de = loadI18n({ store: { mm_lang: "de" } }).i18n;
  var en = loadI18n({ store: { mm_lang: "en" } }).i18n;
  ok(de.fmtNum(1234.56).replace(/\s/g, "") === "1.234,56", "DE-Zahl 1.234,56 (" + de.fmtNum(1234.56) + ")");
  ok(en.fmtNum(1234.56) === "1,234.56", "EN-Zahl 1,234.56 (" + en.fmtNum(1234.56) + ")");
  var d = new Date(Date.UTC(2026, 6, 23, 12, 0, 0));
  ok(/2026/.test(de.fmtDate(d)) && /Juli/.test(de.fmtDate(d)), "DE-Datum enthält 'Juli' + 2026 (" + de.fmtDate(d) + ")");
  ok(/July/.test(en.fmtDate(d)) && /2026/.test(en.fmtDate(d)), "EN-Datum enthält 'July' + 2026 (" + en.fmtDate(d) + ")");
})();

/* ===== 7) Dictionary-Parität — jeder Key hat DE + EN (§36) ===== */
group("Parität · jeder DICT-Key hat DE und EN");
(function () {
  var dict = loadI18n().i18n.dict;
  var keys = Object.keys(dict);
  ok(keys.length > 140, "Dictionary hat > 140 Keys (" + keys.length + ")");
  var noDe = keys.filter(function (k) { return !dict[k] || dict[k].de == null || dict[k].de === ""; });
  var noEn = keys.filter(function (k) { return !dict[k] || dict[k].en == null || dict[k].en === ""; });
  ok(noDe.length === 0, "kein Key ohne DE" + (noDe.length ? " (" + noDe.slice(0, 5).join(", ") + ")" : ""));
  ok(noEn.length === 0, "kein Key ohne EN" + (noEn.length ? " (" + noEn.slice(0, 5).join(", ") + ")" : ""));
})();

/* ===== 8) Homepage-Keys vollständig verdrahtet (keine sichtbaren Lücken) ===== */
group("Homepage · alle referenzierten data-i18n-Keys existieren im DICT");
(function () {
  var dict = loadI18n().i18n.dict;
  var html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  var refs = (html.match(/data-i18n(?:-html)?="([^"]+)"/g) || [])
    .map(function (s) { return s.replace(/data-i18n(?:-html)?="/, "").replace(/"$/, ""); })
    .filter(function (k) { return !/^placeholder:|:/.test(k); });
  var uniq = Array.from(new Set(refs));
  ok(uniq.length >= 40, "Homepage referenziert ≥ 40 i18n-Keys (" + uniq.length + ")");
  var orphan = uniq.filter(function (k) { return !dict[k]; });
  ok(orphan.length === 0, "kein Homepage-Key ohne DICT-Eintrag" + (orphan.length ? " (" + orphan.slice(0, 6).join(", ") + ")" : ""));
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
