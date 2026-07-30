/* ==========================================================================
   MALEMETRIX — Regressionstests für die Audit-Korrekturen (Phase 13).

   Jeder Test friert genau einen behobenen Defekt ein. Sie sind bewusst als
   Reproduktion geschrieben: Eingabe → erwartetes Ergebnis, nicht als
   Quelltext-Muster. Wo die Funktion ohne DOM nicht ladbar ist, wird die
   korrigierte Logik 1:1 nachgebaut UND zusätzlich am Quelltext geprüft,
   dass die Datei diese Fassung wirklich enthält.

   Ausführen:  node tools-dev/tests/fixes-audit.test.js
   ========================================================================== */
"use strict";
var fs = require("fs");
var path = require("path");
var ROOT = path.resolve(__dirname, "../..");
var read = function (f) { return fs.readFileSync(path.join(ROOT, f), "utf8"); };

var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

/* ===================================================================== S1 */
group("S1 · Kasse: PayPal ist die Vorauswahl, nicht Vorkasse");
(function () {
  var s = read("js/checkout.js");
  var block = s.split("const payOptions = [];")[1].split("document.getElementById(\"checkoutForm\")")[0];
  var iPay = block.indexOf('id: "paypal_smart"');
  var iVor = block.indexOf('id: "vorkasse"');
  ok(iPay >= 0 && iVor >= 0, "beide Zahlarten existieren weiterhin");
  ok(iPay < iVor, "PayPal wird VOR Vorkasse in die Liste geschoben");
  ok(/\(i === 0 \? ' checked' : ''\)/.test(s), "die Ansicht wählt weiterhin den ersten Eintrag vor");
  ok(/Zugang sofort nach der Zahlung/.test(block), "die Beschreibung nennt den sofortigen Zugang");
  ok(/bankConfigured\(\)/.test(block), "der Vorkasse-Text bleibt abhängig von der hinterlegten Bankverbindung");
})();

/* ===================================================================== S3 */
group("S3 · Konto-Sync überträgt keine Score-Antworten mehr");
(function () {
  var s = read("js/account.js");
  var fn = s.split("function saveScoreResult(")[1].split("\n  }")[0];
  /* Der Kommentar in der Funktion ZITIERT den alten Fehler (`result: r`).
     Für Aussagen über den ausgeführten Code müssen Kommentare deshalb raus,
     sonst prüft der Test die Dokumentation statt der Implementierung. */
  var code = fn.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok(/result: pub/.test(code), "hochgeladen wird ein gefiltertes Objekt, nicht das Rohergebnis");
  ok(!/result: r\b/.test(code), "das ungefilterte Ergebnis wird nicht mehr übertragen");
  ok(!/"answers"/.test(code), "answers steht auf keiner Erlaubnisliste");

  /* Filter 1:1 nachbauen und mit einem echten Ergebnisobjekt prüfen. */
  var ALLOW = fn.split("[")[1].split("]")[0].split(",").map(function (x) { return x.trim().replace(/"/g, ""); }).filter(Boolean);
  var r = {
    date: "2026-07-25T10:00:00.000Z", total: 74, scores: { body: 60 }, level: "Solide Basis",
    plan: "recomp", bottleneck: { key: "blood" }, flags: [], v: 2, status: "enhanced",
    domains: { sleep: 80 }, dataGaps: [{ id: "bp" }], confidence: { level: "MODERATE" },
    answers: { perf_status: "enhanced", drv_libido: "niedrig", enh_categories: ["testosterone"], waist: 104, name: "Max" }
  };
  var pub = {};
  ALLOW.forEach(function (k) { if (r[k] !== undefined) pub[k] = r[k]; });
  ok(pub.answers === undefined, "der Antwortsatz fällt heraus");
  ok(pub.total === 74 && pub.domains.sleep === 80, "Score und Domains bleiben erhalten (Dashboard funktioniert)");
  var json = JSON.stringify(pub);
  ["enhanced", "niedrig", "testosterone", "104", "Max"].forEach(function (w) {
    ok(json.indexOf(w) < 0 || w === "enhanced" && json.indexOf('"status":"enhanced"') >= 0,
      "kein Antwortwert im Upload: " + w);
  });
  ok(/Art\. 9/.test(s), "die Invariante ist im Code begründet");
})();

/* ===================================================================== S2 */
group("S2 · Laufendes Workout wird nicht mehr stillschweigend überschrieben");
(function () {
  var s = read("js/tracker.js");
  ok(/function mayReplaceActive\(\)/.test(s), "es gibt eine gemeinsame Rückfrage");
  var f = s.split("function mayReplaceActive()")[1].split("\n  }")[0];
  ok(/if \(!S\.active\(\)\) return true;/.test(f), "ohne laufende Einheit wird nicht gefragt");
  ok(/confirm\(/.test(f), "mit laufender Einheit wird gefragt");
  ok(/function startSession\(tplId\) \{\s*\n\s*if \(!mayReplaceActive\(\)\) return;/.test(s), "startSession fragt");
  ok(/function repeatSession\(sess\) \{[\s\S]{0,60}if \(!mayReplaceActive\(\)\) return;/.test(s), "repeatSession fragt");
})();

/* ===================================================================== S4 */
group("S4 · recoveryLow(): leeres Feld ist kein Signal, „schlecht“ schon");
(function () {
  var s = read("js/os/os-core.js");
  var f = s.split("function recoveryLow()")[1].split("\n  }")[0];
  ok(/parseInt\(lp\.inp\.energy, 10\)/.test(f), "Energie wird als Zahl gelesen");
  ok(/isFinite\(_e\) && _e <= 2/.test(f), "nur eine echte Zahl <= 2 zählt");
  ok(/lp\.inp\.sleep === "schlecht"/.test(f), "der Schlafwert wird gegen den tatsächlich geschriebenen Wert geprüft");
  ok(!/=== "bad"/.test(f), "der nie geschriebene Wert \"bad\" ist raus");

  /* Reproduktion der korrigierten Bedingung */
  function low(inp) {
    var e = parseInt(inp.energy, 10);
    if (isFinite(e) && e <= 2) return true;
    return inp.sleep === "schlecht";
  }
  ok(low({ energy: "", sleep: "gut" }) === false, "leeres Energiefeld ⇒ NICHT erholungsschwach (vorher: true)");
  ok(low({ energy: "2", sleep: "gut" }) === true, "Energie 2 ⇒ erholungsschwach");
  ok(low({ energy: "4", sleep: "schlecht" }) === true, "Schlaf \"schlecht\" ⇒ erholungsschwach (vorher: nie)");
  ok(low({ energy: "4", sleep: "gut" }) === false, "guter Zustand bleibt gut");
  ok(/vcode === "exec"/.test(s), "der NOT-NOW-Zweig prüft den tatsächlichen Code \"exec\"");
})();

/* ===================================================================== S6 */
group("S6 · Komma-Eingaben werden nicht mehr abgeschnitten");
(function () {
  var s = read("js/course.js");
  ok(/function numDE\(v\)/.test(s), "es gibt einen gemeinsamen Zahlen-Helfer");
  ok(/numDE\(inp\.waist\) - numDE\(prev\.inp\.waist\)/.test(s), "der Taillen-Trend nutzt ihn");
  ok(!/parseFloat\(inp\.waist\) - parseFloat\(prev\.inp\.waist\)/.test(s), "keine rohe parseFloat-Differenz mehr");

  var numDE = function (v) { var x = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isFinite(x) ? x : NaN; };
  ok(numDE("94,5") === 94.5, "\"94,5\" wird zu 94.5 (vorher: 94)");
  ok(numDE("94.5") === 94.5, "\"94.5\" funktioniert weiterhin");
  ok(isNaN(numDE("")), "leere Eingabe bleibt NaN");
  /* Der Fall aus dem Audit: echter Fortschritt galt als Stagnation. */
  var trend = numDE("94,0") - numDE("94,5");
  ok(Math.abs(trend) >= 0.3, "0,5 cm Rückgang gilt als Fortschritt, nicht als Stagnation");
  var alt = parseFloat("94,0") - parseFloat("94,5");
  ok(Math.abs(alt) < 0.3, "… mit dem alten Code wäre daraus fälschlich Stagnation geworden");
})();

/* ===================================================================== S7 */
group("S7 · Datumsvorbelegungen nutzen die lokale Zeit");
(function () {
  var s = read("js/tracker.js");
  ok(/var today = localYmd\(new Date\(\)\);/.test(s), "Schlaf-Formular nutzt localYmd");
  ok(/id="cdDate" value="' \+ localYmd\(new Date\(\)\)/.test(s), "Cardio-Formular nutzt localYmd");
  ok(/id="bdDate" value="' \+ localYmd\(new Date\(\)\)/.test(s), "Körper-Formular nutzt localYmd");
  var formPart = s.split("function renderDaily")[0] + s.split("a.download =")[0];
  ok(!/value="' \+ new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/.test(s), "keine UTC-Vorbelegung in Formularen mehr");
  ok(/a\.download = "malemetrix-tracker-" \+ new Date\(\)\.toISOString\(\)/.test(s),
    "der Export-Dateiname darf weiterhin ISO/UTC nutzen (kein Nutzerdatum)");
})();

/* ===================================================================== S8 */
group("S8 · PR-Abzeichen erscheint beim Rekord, nicht beim Gleichstand");
(function () {
  var s = read("js/tracker.js");
  ok(/const isPR = setE1 > 0 && pr > 0 && setE1 > pr \+ 0\.01;/.test(s), "Vergleich ist jetzt „größer als“");
  var isPR = function (setE1, pr) { return setE1 > 0 && pr > 0 && setE1 > pr + 0.01; };
  ok(isPR(120, 116.67) === true, "echter Rekord ⇒ Abzeichen (vorher: nein)");
  ok(isPR(116.67, 116.67) === false, "Gleichstand ⇒ kein Abzeichen (vorher: ja)");
  ok(isPR(110, 116.67) === false, "darunter ⇒ kein Abzeichen");
})();

/* ===================================================================== S9 */
group("S9 · Bewegungstage werden nicht doppelt gezählt");
(function () {
  var s = read("js/course.js");
  ok(/if \(rec\.move && dt !== "move"\) res\.move\+\+;/.test(s), "der zweite Zähler schließt MOVE-Tage aus");
  /* Reproduktion: vier geloggte Tage, einer davon ein MOVE-Tag. */
  function count(days) {
    var res = { move: 0 };
    days.forEach(function (d) {
      if (d.p && d.dt === "move") res.move++;
      if (d.move && d.dt !== "move") res.move++;
    });
    return res.move;
  }
  var tage = [
    { dt: "move", p: true, move: true },
    { dt: "strength", p: true, move: true },
    { dt: "engine", p: true, move: true },
    { dt: "recover", p: true, move: true }
  ];
  ok(count(tage) === 4, "vier geloggte Tage ergeben 4 (vorher: 5)");
  ok(count(tage) < 5, "die Wochenmeldung „Schritt-Ziel an 5 Tagen“ wird nicht mehr fälschlich erfüllt");
})();

/* ==================================================================== S5 */
group("S5 · Score-Wiedereinstieg springt zur ersten offenen Frage");
(function () {
  var s = read("js/check.js");
  ok(/const firstOpen = steps\.findIndex/.test(s), "es wird nach der ersten unbeantworteten Frage gesucht");
  ok(/if \(firstOpen > 0\)/.test(s), "nur bei echtem Fortschritt wird gesprungen");
  ok(/deine bisherigen Antworten sind gespeichert/.test(s), "der Sprung wird dem Nutzer erklärt");

  /* Reproduktion der Suchlogik */
  var steps = [
    { q: { id: "a", type: "single" } },
    { q: { id: "b", type: "multi" } },
    { q: { id: "c", type: "fields", fields: [{ id: "age", required: true }] } },
    { q: { id: "d", type: "single" } }
  ];
  function firstOpen(answers) {
    return steps.findIndex(function (st) {
      var v = answers[st.q.id];
      if (st.q.type === "fields") return (st.q.fields || []).some(function (f) { return f.required && !answers[f.id]; });
      if (st.q.type === "multi") return !Array.isArray(v) || !v.length;
      return v === undefined || v === null || v === "";
    });
  }
  ok(firstOpen({ a: "x", b: ["y"], age: 40 }) === 3, "drei beantwortet ⇒ Sprung auf die vierte Frage");
  ok(firstOpen({}) === 0, "ohne Antworten ⇒ Frage 1");
  ok(firstOpen({ a: "x", b: [] }) === 1, "leere Mehrfachauswahl gilt als unbeantwortet");
  ok(firstOpen({ a: "x", b: ["y"], age: 40, d: "z" }) === -1, "vollständig ⇒ kein Sprung");
})();

/* ================================================================ S10-S20 */
group("S10-S20 · Ballast, Kontrast, Live-Region, Service Worker, robots.txt");
(function () {
  ok(!/check-data\.js/.test(read("mein-protokoll.html")), "S10: die App-Seite lädt die Score-Daten nicht mehr");
  ok(/check-data\.js/.test(read("check.html")), "… check.html braucht sie weiterhin und behält sie");

  var css = read("css/style.css");
  ok(/--muted-2: #98948A;/.test(css), "S13: --muted-2 ist aufgehellt");
  /* Kontrast gegen den dunkelsten Seitengrund nachrechnen (WCAG-Formel). */
  function lum(hex) {
    var c = [1, 3, 5].map(function (i) { return parseInt(hex.substr(i, 2), 16) / 255; })
      .map(function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function ratio(a, b) { var l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
  var bg = (css.match(/--bg-0:\s*(#[0-9a-f]{6})/i) || [])[1] || "#070A0F";
  var r = ratio("#98948A", bg);
  ok(r >= 4.5, "S13: Kontrast " + r.toFixed(2) + ":1 gegen " + bg + " erreicht 4.5:1");
  ok(ratio("#687184", bg) < 4.5, "… der alte Wert lag mit " + ratio("#687184", bg).toFixed(2) + ":1 darunter");

  var main = read("js/main.js");
  ok(/setAttribute\("role", "status"\)/.test(main) && /aria-live/.test(main), "S14: Toast ist eine Live-Region");

  var sw = read("sw.js");
  ok(/c\.add\(u\)\.catch/.test(sw), "S19: eine fehlende Datei bricht die Installation nicht mehr ab");
  ok(/\.catch\(\(\) => null\)/.test(sw), "… und die Rejection wird behandelt");

  var rob = read("robots.txt");
  ok(/Disallow: \/admin\//.test(rob), "S20: der interne Bereich bleibt gesperrt");
  ["checkout.html", "report.html", "impressum.html", "datenschutz.html", "agb.html"].forEach(function (p) {
    ok(!new RegExp("^Disallow: /" + p.replace(".", "\\."), "m").test(rob),
      "S20: /" + p + " ist nicht mehr gesperrt (noindex kann gelesen werden)");
  });
  ok(/Sitemap: https:\/\/www\.malemetrix\.com\/sitemap\.xml/.test(rob), "die Sitemap-Zeile bleibt");
})();

/* =============================================================== S11/S13-CSS */
group("S11 · Startseite lädt kein ungenutztes CSS mehr");
(function () {
  var idx = read("index.html");
  ok(!/css\/os\.css/.test(idx), "index.html bindet os.css nicht mehr ein");
  ok(/css\/style\.css/.test(idx), "style.css bleibt");
  ["mein-protokoll.html", "labor.html"].forEach(function (f) {
    ok(/css\/os\.css/.test(read(f)), f + " braucht os.css weiterhin und behält es");
  });
  /* Der Beweis, nicht die Behauptung: kein Klassen-Token, keine ID und kein
     Element-Selektor der Startseite existiert exklusiv in os.css. */
  var os = read("css/os.css"), st = read("css/style.css");
  var toks = {}, m, reC = /class="([^"]*)"/g;
  while ((m = reC.exec(idx))) m[1].split(/\s+/).forEach(function (t) { if (t) toks[t] = 1; });
  var exklusiv = Object.keys(toks).filter(function (t) { return os.indexOf("." + t) >= 0 && st.indexOf("." + t) < 0; });
  ok(exklusiv.length === 0, "keines der " + Object.keys(toks).length + " Klassen-Tokens hängt allein an os.css");
})();

/* ===================================================================== S12 */
group("S12 · Die App-Ansicht ist keine Live-Region mehr");
(function () {
  var html = read("mein-protokoll.html"), app = read("js/os/app.js");
  ok(!/id="mmDash"[^>]*aria-live/.test(html), "#mmDash ist nicht mehr aria-live (las sonst die ganze Seite vor)");
  ok(/id="mmStatus"[^>]*role="status"/.test(html), "stattdessen gibt es eine eigene, kurze Statusregion");
  ok(/class="sr-only"/.test(html) && /\.sr-only\s*\{/.test(read("css/style.css")), "die Statusregion ist unsichtbar, aber vorhanden");
  ok(/<div class="os-body" tabindex="-1">/.test(app), "der Inhaltsbereich ist programmatisch fokussierbar");
  ok(/function render\(navigated\)/.test(app), "render weiß, ob navigiert wurde");
  ok(/hashchange[^;]*render\(true\)/.test(app), "der Hashwechsel meldet Navigation");
  ok(/if \(navigated\)[\s\S]{0,220}b\.focus/.test(app), "und nur dann wandert der Fokus in den neuen Inhalt");
  ok(/announce\(VIEW_LABEL\[v\]/.test(app), "die Ansicht wird beim Namen genannt");
})();

/* ===================================================================== S15 */
group("S15 · Die Ergebnisseite hat eine erste Überschriftenebene");
(function () {
  var c = read("js/check.js");
  ok(/<h1 class="lvl-h">/.test(c), "die Ergebniszeile ist eine h1");
  ok(/MaleMetrix Score ' \+ r\.total \+ ' von 100/.test(c), "der Score steht für Screenreader in der Überschrift");
  ok(!/<h3 class="h-card"/.test(c), "keine Abschnittsüberschrift ist mehr h3");
  /* Fuenf, seit die Ergebnis-Erfassung als eigener Abschnitt dazugekommen ist. */
  ok((c.match(/<h2 class="h-card"/g) || []).length === 5, "die fuenf Abschnitte sind h2");
  ok(/const target = sec\.querySelector\("h1"\) \|\| sec;/.test(c), "nach dem Wechsel wird die Überschrift fokussiert");
  var css = read("css/style.css");
  ok(/\.os14-score-hero \.lvl b, \.os14-score-hero \.lvl \.lvl-h/.test(css), "die h1 sieht aus wie vorher das <b>");
  ok(/h1\[tabindex="-1"\]:focus[^{]*\{ outline: none/.test(css), "der programmatische Fokus zeigt keinen Ring");
})();

/* ===================================================================== S16 */
group("S16 · Datei-Uploads sind mit der Tastatur erreichbar");
(function () {
  var css = read("css/style.css");
  ok(/\.file-hidden \{[^}]*position: absolute/.test(css), "es gibt eine sichtbar-versteckte, aber fokussierbare Variante");
  ok(!/\.file-hidden \{[^}]*display: none/.test(css), "sie benutzt gerade NICHT display:none");
  ok(/\.has-file:focus-within/.test(css), "der Fokus ist am Label sichtbar");
  ok(/class="file-hidden"/.test(read("tracker.html")), "der Tracker-Import ist umgestellt");
  ok(!/id="trkImport"[^>]*display:none/.test(read("tracker.html")), "… und nicht mehr display:none");
  ok(/data-photoin[^>]*class="file-hidden"/.test(read("js/os/app.js")), "der Foto-Upload ist umgestellt");
  ok(/id="laFile"[^>]*class="file-hidden"/.test(read("js/os/labs-app.js")), "der Labor-Import ist umgestellt");
  ok(!/id="laFile"[^>]*\shidden>/.test(read("js/os/labs-app.js")), "… und trägt kein hidden mehr");
})();

/* ===================================================================== S17 */
group("S17 · Geschlossene Modale sind nicht mehr im Tab-Fokus");
(function () {
  var css = read("css/style.css");
  var closed = css.split(".modal-overlay {")[1].split("}")[0];
  var open = css.split(".modal-overlay.open {")[1].split("}")[0];
  ok(/visibility: hidden/.test(closed), "geschlossen: visibility hidden — nimmt den Teilbaum aus der Fokusreihenfolge");
  ok(/visibility: visible/.test(open), "offen: wieder sichtbar und bedienbar");
  ok(/opacity: 0/.test(closed) && /opacity: 1/.test(open), "die Blende arbeitet weiterhin über opacity");
  ok(/transition: opacity 0\.25s, visibility 0s linear 0\.25s/.test(closed), "visibility schaltet erst NACH der Blende — sonst springt das Ausblenden");
})();

/* ===================================================================== S18 */
group("S18 · Lokale Daten lassen sich ohne Konto löschen");
(function () {
  var app = read("js/os/app.js");
  ok(/id="mmWipe"/.test(app), "es gibt einen eigenständigen Knopf");
  ok(/Lokale Daten auf diesem Gerät löschen/.test(app), "… mit unmissverständlicher Beschriftung");
  var h = app.split('t.closest("#mmWipe")')[1].split('t.closest("#mmDelete")')[0];
  ok((h.match(/confirm\(/g) || []).length === 2, "die Löschung ist zweistufig bestätigt");
  ok(/MM\.account\.clearLocalData\(\)/.test(h), "sie ruft die vorhandene Bereinigung auf");
  ok(!/requestAccountDeletion/.test(h), "und fasst das Cloud-Konto nicht an");
})();

/* ================================================================ S21/S22 */
group("S21/S22 · Magazin: Score verlinkt, Vorschaubilder gesetzt");
(function () {
  var dir = path.join(ROOT, "blog");
  var files = fs.readdirSync(dir).filter(function (f) { return /\.html$/.test(f); });
  ok(files.length === 11, "alle 11 Artikel werden geprüft");
  var ohne = files.filter(function (f) { return !/href="\.\.\/check\.html"/.test(read("blog/" + f)); });
  ok(ohne.length === 0, "jeder Artikel verlinkt den Score (vorher: keiner)");
  var zwei = files.filter(function (f) { return (read("blog/" + f).match(/check\.html/g) || []).length >= 2; });
  ok(zwei.length === 11, "je zweimal: im Kopf und am Textende");
  ok(/\.blog-actions \{ flex-wrap: wrap/.test(read("css/style.css")), "drei Knöpfe dürfen auf schmalen Geräten umbrechen");
  ["blog.html", "circle.html"].forEach(function (f) {
    var s = read(f);
    ok(/property="og:title"/.test(s) && /property="og:image"/.test(s), "S22: " + f + " hat Titel und Bild für geteilte Links");
    ok(/name="twitter:card"/.test(s), "S22: " + f + " hat eine Twitter-Card");
  });
})();

/* ================================================================ S23/S24/S29 */
group("S23/S24/S29 · Strukturierte Daten, Index-Wahrheit");
(function () {
  [["protokoll.html", "Product", "99.00"], ["coaching.html", "Service", "199.00"]].forEach(function (t) {
    var m = read(t[0]).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    ok(!!m, "S23: " + t[0] + " führt strukturierte Daten");
    var o = JSON.parse(m[1]);
    ok(o["@type"] === t[1], "S23: als " + t[1]);
    ok(o.offers && o.offers.price === t[2] && o.offers.priceCurrency === "EUR", "S23: mit dem Preis, der auf der Seite steht (" + t[2] + " EUR)");
    ok(!o.aggregateRating && !o.review, "S23: ohne erfundene Bewertungen");
  });

  var sm = read("sitemap.xml");
  /* S24 hatte drei Ebooks für die Suche freigegeben. Inzwischen ist jedes
     Ebook Teil des bezahlten Protokolls — die Freigabe ist damit
     gegenstandslos geworden und ins Gegenteil verkehrt: kein Ebook gehört
     mehr in den Index oder in die Sitemap. */
  ["fettabbau", "protein-system", "gewohnheiten"].forEach(function (e) {
    ok(/noindex/.test(read("ebooks/" + e + ".html")), e + " ist als Protokoll-Kapitel aus dem Index");
    ok(sm.indexOf("ebooks/" + e + ".html") < 0, "… und aus der Sitemap");
  });
  ok((sm.match(/ebooks\//g) || []).length === 0, "die Sitemap führt überhaupt kein Ebook mehr");
  /* Alle siebzehn Kapitelseiten tragen dieselbe Auszeichnung. */
  ["00-start-here", "12-longevity-risk", "masterguide", "training-system",
   "11-injektionen", "schlaf-energie", "fettabbau", "protein-system"].forEach(function (e) {
    ok(/name="robots" content="noindex, follow"/.test(read("ebooks/" + e + ".html")), e + " ist als geschlossenes Kapitel ausgezeichnet");
  });

  ["shop.html", "circle.html"].forEach(function (f) {
    ok(/name="robots" content="noindex, follow"/.test(read(f)), "S29: " + f + " ist vorläufig nicht indexierbar");
    ok(sm.indexOf("/" + f) < 0, "S29: " + f + " steht nicht mehr in der Sitemap");
  });
  ok(sm.indexOf("/check.html") > 0 && sm.indexOf("/protokoll.html") > 0, "die tragenden Seiten bleiben in der Sitemap");
})();

/* ============================================================ S25-S28, S30 */
group("S25–S28 · Preise, Versand, Zeitangabe, klickbare Ziele");
(function () {
  var c = read("js/check.js");
  ok(!/ab 149|ab 199/.test(c), "S25: die erfundene Preisspanne ist weg");
  ok(/199 €<small> \/ Monat · monatlich kündbar<\/small>/.test(c), "S25: es steht dort, was überall sonst steht");
  ok(!/Versandkostenfrei/.test(read("checkout.html")), "S26: keine Versandkostenschwelle bei digitaler Lieferung");
  ok(/Digitale Lieferung, keine Versandkosten/.test(read("checkout.html")), "S26: … sondern die Wahrheit");
  ["index.html", "ueber.html", "js/os/app.js"].forEach(function (f) {
    ok(!/10 Minuten|10 minutes/.test(read(f)), "S27: " + f + " nennt keine 10 Minuten mehr");
  });
  var rep = read("js/report.js");
  ok(/<a class="r-cta-link" href="termin\.html">/.test(rep), "S28: der Termin ist am Bildschirm klickbar");
  ok(/<a class="r-cta-link" href="protokoll\.html">/.test(rep), "S28: das Protokoll ebenso");
  ok(/malemetrix\.com\/termin/.test(rep) && /malemetrix\.com\/protokoll/.test(rep), "S28: der Linktext bleibt die ausgeschriebene URL (Druck)");
  ok(/\.paper \.r-cta-link \{ color: inherit; text-decoration: none; \}/.test(read("report.html")), "S28: im Ausdruck ohne Linkfarbe");
})();

group("S30 · Kleinkram mit klarem Nutzen");
(function () {
  var co = read("js/checkout.js");
  ok(/const esc = \(s\)/.test(co), "checkout.js hat eine Maskierung");
  ok(!/' \+ order\.email \+ '/.test(co), "die E-Mail geht nicht mehr ungefiltert in innerHTML");
  ok(!/' \+ order\.name\.split\(" "\)\[0\] \+ '/.test(co), "der Name ebenso wenig");
  var rp = read("js/report.js");
  ok(/function esc\(s\)/.test(rp), "report.js hat eine Maskierung");
  ok(!/\(firstName \? firstName \+ ", du"/.test(rp), "der Vorname wird maskiert ausgegeben");
  ok(/esc\(firstName\.toUpperCase\(\)\)/.test(read("js/check.js")), "auch im Score-Kopf");
  /* Gegenprobe: die Insight-Texte enthalten bewusst Markup und dürfen NICHT
     maskiert werden — sonst stünde <strong> sichtbar auf der Seite. */
  ok(/i\.text \+ '<\/p>/.test(read("js/check.js")), "die Insight-Texte behalten ihr Markup (bewusst nicht maskiert)");
  var mc = read("supabase/functions/mm-commerce/index.ts");
  ok(!/detail: String\(e\?\.message/.test(mc), "mm-commerce reicht die Fehlerursache nicht mehr an den Client");
  ok(/console\.error\("\[mm-commerce\] unhandled"/.test(mc), "sie steht stattdessen im Funktions-Log");
  /* Das Kompendium wurde entfernt — DAS PROTOKOLL ist das Produkt. Geprüft
     wird derselbe Punkt jetzt am Protokoll-Reader. */
  var me = read("ebooks/protokoll.html");
  ok((me.match(/addEventListener\("scroll"/g) || []).length === 1, "der doppelte Scroll-Handler ist weg");
  ok(/progress\(\);/.test(me), "der Startwert wird weiterhin gesetzt");
  /* Die Zahl wandert mit jedem Testlauf — geprüft wird, dass sie zur
     tatsächlichen Suite passt, nicht ein fester Wert. */
  var suiten = fs.readdirSync(path.join(ROOT, "tools-dev/tests")).filter(function (f) { return /\.test\.js$/.test(f); }).length;
  var doku = read("MALEMETRIX_OS.md").match(/Gesamt (\d+) Assertions über (\d+) Suiten\. SW: (mm-v\d+)/);
  ok(!!doku, "die Doku nennt Assertions, Suiten und SW-Version");
  ok(doku && Number(doku[2]) === suiten, "die Suiten-Zahl stimmt (" + (doku ? doku[2] : "?") + " = " + suiten + ")");
  ok(doku && doku[3] === (read("sw.js").match(/const VERSION = "(mm-v\d+)"/) || [])[1], "die genannte SW-Version ist die ausgelieferte");
})();

/* ====================================================================== D3 */
group("D3 · Die veröffentlichte Gewichtung stimmt mit der gerechneten überein");
(function () {
  global.window = global;
  global.document = { addEventListener: function () {}, querySelector: function () { return null; } };
  require(path.join(ROOT, "js/check-data.js"));
  var C = global.window.MM_CHECK;
  var sum = 0;
  C.domainKeys.forEach(function (k) { sum += C.domainMeta[k].w; });
  var echt = {};
  C.domainKeys.forEach(function (k) { echt[C.domainMeta[k].name] = Math.round(C.domainMeta[k].w / sum * 1000) / 10; });

  var html = read("ueber.html");
  var tabelle = html.split('<table class="data-table">')[1].split("</table>")[0];
  var zeilen = tabelle.match(/<tr><td>([^<]+)<\/td><td class="mono">([\d,]+) %/g) || [];
  ok(zeilen.length === 12, "die Tabelle listet alle 12 Systeme (vorher 7)");

  var abweichung = 0;
  zeilen.forEach(function (z) {
    var m = z.match(/<td>([^<]+)<\/td><td class="mono">([\d,]+) %/);
    var name = m[1].replace(/&amp;/g, "&");
    var pub = parseFloat(m[2].replace(",", "."));
    if (echt[name] === undefined) { abweichung++; return; }
    if (Math.abs(echt[name] - pub) > 0.05) abweichung++;
  });
  ok(abweichung === 0, "jede veröffentlichte Prozentzahl entspricht C.domainMeta[d].w / " + sum);
  ok(!/<td>Körper<\/td><td class="mono">18 %/.test(html), "die frühere 18-%-Angabe für Körper ist weg (real " + echt["Körperkomposition"] + " %)");
  ok(/LEGACY: Gewichtung der ursprünglichen 7 Bereiche/.test(read("js/check-data.js")), "C.weights ist als wirkungslos gekennzeichnet");
  ok(C.weights && C.weights.recovery !== undefined, "… bleibt aber erhalten (score-engine.test.js prüft es)");
})();

/* ====================================================================== D4 */
group("D4 · Kein doppelter 7-Bereiche-Block mehr");
(function () {
  var c = read("js/check.js");
  ok(!/Deine 7 Bereiche/.test(c), "der Legacy-Block heißt nicht mehr wie das Produktversprechen");
  /* Seit Paket 4 heißt die Verdichtung ausdrücklich „verdichtetes Profil“ —
     klar getrennt von den 12 Optimierungsbereichen. */
  ok(/Dein verdichtetes Profil/.test(c), "er ist als verdichtetes Profil benannt");
  ok(!/7 Bereiche, ein Bild/.test(c), "auch die Unterzeile nennt keine 7 Bereiche");
  ok(/radarSVG\(r\.scores\)/.test(c), "das Radar und die Werte bleiben unverändert");
  ok(!/7 Bereiche/.test(read("js/report.js")), "der Report zieht nach");
  ok(!/7 Systeme/.test(read("js/os/app.js")), "die App ebenso");
})();

/* ====================================================================== D6 */
group("D6 · Tracker-Formulare haben benannte Felder");
(function () {
  var t = read("js/tracker.js");
  var ohne = (t.match(/<label>/g) || []).length;
  ok(ohne === 0, "kein <label> ohne Bezug mehr (vorher 22)");
  ["slDate", "slQual", "slMorning", "slLat", "slWake", "cdType", "cdDate", "bdDate", "plBar", "plnMin"].forEach(function (id) {
    ok(new RegExp('<label for="' + id + '">').test(t), "das zuvor völlig namenlose Feld " + id + " ist beschriftet");
  });
  ok(/<label class="plan-day"><input type="checkbox"/.test(t), "das Label, das sein Feld umschließt, bleibt unverändert");
  var xe = t.match(/>✕<\/button>/g) || [];
  var mitLabel = t.match(/aria-label="[^"]*(?:'|\+)[^>]*>✕<\/button>/g) || [];
  ok(xe.length === mitLabel.length, "alle " + xe.length + " ✕-Schaltflächen haben einen Namen");
  ok(/<label class="small" for="mmEmail"/.test(read("js/os/app.js")), "das Anmeldefeld ist beschriftet");
})();

/* ====================================================================== D9 */
group("D9 · Ebooks haben genau eine h1");
(function () {
  var dir = path.join(ROOT, "ebooks");
  var files = fs.readdirSync(dir).filter(function (f) { return /\.html$/.test(f); });
  var falsch = [];
  files.forEach(function (f) {
    var n = (read("ebooks/" + f).match(/<h1[\s>]/g) || []).length;
    if (n !== 1) falsch.push(f + "=" + n);
  });
  ok(falsch.length === 0, "alle " + files.length + " Ebook-Seiten haben genau eine h1 (vorher bis zu 20)");
  /* Es gibt kein frei lesbares Ebook mehr, an dem sich die Überschriften-
     regel im Volltext zeigen ließe. Geprüft bleibt, dass der Selektor
     tag-unabhängig ist — genau darum ging es bei D9 — und dass jede
     Kapitelseite bei genau einer h1 bleibt. */
  var bp = read("css/blueprint.css");
  ok(/\.bp \.bp-h1 \{/.test(bp) && !/\.bp h1\.bp-h1/.test(bp), "der Selektor greift unabhängig vom Tag");
  var mehr = ["testosteron", "fettabbau", "schlaf-stack"].filter(function (e) {
    return (read("ebooks/" + e + ".html").match(/<h1[\s>]/g) || []).length !== 1;
  });
  ok(mehr.length === 0, "jede Kapitelseite hat genau eine h1");
  /* blueprint.html ist seit dem Schließen der Kapitel eine Vorschauseite;
     die Cover-h1 von damals ist der Kapitelüberschrift gewichen. Geprüft
     bleibt das Eigentliche: genau eine h1. */
  var bpv = read("ebooks/blueprint.html");
  ok((bpv.match(/<h1[\s>]/g) || []).length === 1, "blueprint.html hat genau eine h1");
  ok(/DAS FUNDAMENT/.test(bpv), "und sie nennt den Kapiteltitel");
  var bp = read("css/blueprint.css");
  ok(/\.bp \.bp-h1 \{ font-size: clamp\(1\.8rem, 5vw, 2\.6rem\)/.test(bp), "der Selektor greift jetzt unabhängig vom Tag");
  ok(!/\.bp h1\.bp-h1/.test(bp), "… und ist nicht mehr an h1 gebunden");
  ok(/\.bp \.bp-h1 \{ font-size: 1\.7rem; \}/.test(bp), "auch in der Mobil-Regel");
})();

/* ===================================================================== D12 */
group("D12 · Service Worker registriert nur, wo er gebraucht wird");
(function () {
  var m = read("js/main.js");
  ok(/var APP_PAGES = \[/.test(m), "es gibt eine Liste der App-Seiten");
  ok(/if \(isApp\) \{\s*navigator\.serviceWorker\.register/.test(m), "registriert wird nur dort");
  ok(/matchMedia\("\(display-mode: standalone\)"\)/.test(m), "wer die Seite als App installiert hat, zählt dazu");
  ok(/getRegistration\(\)[\s\S]{0,180}reg\.update\(\)/.test(m), "bestehende Installationen werden trotzdem aktualisiert — sonst friert ein Besucher auf einer alten Version ein");
  var app = m.split("var APP_PAGES = [")[1].split("]")[0];
  ["mein-protokoll.html", "tracker.html", "check.html"].forEach(function (p) {
    ok(app.indexOf(p) >= 0, p + " gehört zu den App-Seiten");
  });
  ok(app.indexOf("index.html") < 0, "die Marketing-Startseite gehört NICHT dazu (~475 KB Vorab-Transfer)");
})();

/* ================================================================ D13/D14 */
group("D13/D14 · Toter Code entfernt, lebender erhalten");
(function () {
  /* Kommentare raus: der Erhaltungs-Kommentar ZÄHLT die entfernten Klassen
     auf und würde sonst als Treffer gelten — der Test prüfte sonst die
     Dokumentation statt des Stylesheets. */
  var css = read("css/style.css").replace(/\/\*[\s\S]*?\*\//g, "");
  ["course-week", "course-mode-btn", "course-recheck-table", "course-module-head", "module-callout", "coaching-tease", "course-res-ebook"].forEach(function (c) {
    ok(css.indexOf("." + c) < 0, "D13: ." + c + " ist entfernt");
  });
  ["course-hero", "course-progress", "course-toolbar"].forEach(function (c) {
    ok(css.indexOf("." + c) >= 0, "D13: ." + c + " bleibt — kurs-programm.html führt es im Markup");
  });
  ok(css.indexOf("#courseGate") >= 0, "D13: die Print-Regel für das Zugangs-Gate bleibt");
  ok(read("kurs-programm.html").indexOf("courseGate") >= 0, "… und das Gate existiert wirklich");
  /* Bewusst NICHT entfernt: .doc-*. Der Grund gehört in den Test, damit er
     nicht als Nachlässigkeit gelesen wird. */
  ["doc-table", "doc-figure", "doc-toc"].forEach(function (c) {
    ok(css.indexOf("." + c) >= 0, "D13: ." + c + " bleibt — Vault-Inhalte sind nicht prüfbar");
  });
  ok(/protoVault/.test(read("ebooks/protokoll.html")) && /css\/style\.css/.test(read("ebooks/protokoll.html")),
    "… Beleg: die Vault-Seite lädt style.css und füllt ihren Inhalt erst zur Laufzeit");

  var bal = 0;
  for (var i = 0; i < css.length; i++) { if (css[i] === "{") bal++; else if (css[i] === "}") bal--; }
  ok(bal === 0, "die Stylesheet-Struktur ist intakt");

  ok(read("js/check.js").indexOf("collectRedFlags") < 0, "D14: collectRedFlags entfernt");
  ok(read("js/tracker.js").indexOf("exType") < 0, "D14: exType entfernt");
  ok(read("js/course.js").indexOf("trendCount") < 0, "D14: trendCount entfernt");
  var app = read("js/os/app.js");
  ok(app.indexOf("insightCard") < 0, "D14: insightCard entfernt");
  ok(read("css/os.css").indexOf(".intel-insight") < 0, "D14: die zugehörigen CSS-Regeln ebenso");
  ok(app.indexOf("toneClass") >= 0, "… toneClass wird woanders gebraucht und bleibt");
})();

/* ====================================================== Q1 (QA-Fund) ==== */
group("Q1 · i18n löschte das Datei-Feld des Tracker-Imports");
(function () {
  /* Gefunden beim Browser-Test zu S16: #trkImport war nach dem Sprachlauf
     nicht mehr im DOM. js/i18n.js übersetzt per textContent — das entfernt
     jedes Kindelement. Mit data-i18n am <label> löschte jeder Seitenaufruf
     das darin liegende <input type="file">; der einzige Weg, ein Tracker-
     Backup zurückzuspielen, war damit vollständig tot. */
  var i18n = read("js/i18n.js");
  ok(/\[data-i18n\]/.test(i18n) && /el\.textContent = v/.test(i18n),
    "Beleg: [data-i18n] wird per textContent gesetzt — Kindelemente gehen dabei verloren");

  var t = read("tracker.html");
  ok(!/<label[^>]*data-i18n=[^>]*>[^<]*<input/.test(t), "kein <label data-i18n> mehr, das ein Feld umschließt");
  ok(/<span data-i18n="trk\.import">Daten laden<\/span><input type="file" id="trkImport"/.test(t),
    "übersetzt wird jetzt ein <span>, das Feld liegt daneben");

  /* Der Fehler darf projektweit nicht wiederkehren: KEIN [data-i18n]-Element
     im gesamten Repo darf Kindelemente enthalten. */
  var betroffen = [];
  (function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
      if ([".git", "node_modules", "tools-dev"].indexOf(e.name) >= 0) return;
      var p = path.join(dir, e.name);
      if (e.isDirectory()) return walk(p);
      if (!/\.html$/.test(e.name)) return;
      var src = fs.readFileSync(p, "utf8");
      var re = /<([a-z]+)([^>]*\sdata-i18n="[^"]+"[^>]*)>([\s\S]*?)<\/\1>/g, m;
      while ((m = re.exec(src))) if (/<[a-z]/i.test(m[3])) betroffen.push(path.relative(ROOT, p) + " <" + m[1] + ">");
    });
  })(ROOT);
  ok(betroffen.length === 0, "projektweit kein [data-i18n] mit Kindelementen" + (betroffen.length ? ": " + betroffen.join(", ") : ""));
})();

/* ====================================================== Q2 (QA-Fund) ==== */
group("Q2 · Kontrast auf hellem Papier und auf gefüllten Schaltflächen");
(function () {
  function lum(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(h, 16);
    var c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  /* Der Akzent #258CFF ist auf dunklem Grund richtig und bleibt dort. Auf
     dem weißen Dokumentpapier verfehlt er AA — dort steht jetzt #1a56c4. */
  ok(ratio("#258CFF", "#ffffff") < 4.5, "Beleg: der Akzent erreicht auf weiß nur " + ratio("#258CFF", "#ffffff").toFixed(2) + ":1");
  ok(ratio("#1a56c4", "#ffffff") >= 4.5, "die Papier-Linkfarbe erreicht " + ratio("#1a56c4", "#ffffff").toFixed(2) + ":1");
  ok(ratio("#646c7c", "#ffffff") >= 4.5, "die Fußzeile erreicht " + ratio("#646c7c", "#ffffff").toFixed(2) + ":1 (vorher 2,54)");
  ok(ratio("#ffffff", "#215fc9") >= 4.5, "Weiß auf der aktiven Schaltfläche erreicht " + ratio("#ffffff", "#215fc9").toFixed(2) + ":1 (vorher 3,94)");

  var css = read("css/style.css");
  ok(/\.doc-cover \.kick \{[^}]*color: #1a56c4/.test(css), "die Kicker-Zeile auf dem Papier ist umgestellt");
  ok(/\.doc-footer \{[^}]*color: #646c7c/.test(css), "die Dokument-Fußzeile ist umgestellt");
  ok(/\.unit-toggle button\.active \{ background: #215fc9/.test(css), "die aktive Einheiten-Schaltfläche ist umgestellt");
  ok(/\.tracker-tab\.active \{ background: #215fc9/.test(css), "der aktive Tracker-Tab ist umgestellt");
  ok(/--accent:\s*#258CFF/.test(css) || css.indexOf("#258CFF") >= 0, "der Marken-Akzent selbst bleibt unangetastet");

  /* Auf den hellen Dokumentseiten darf die zu helle Variante nicht mehr
     inline stehen. */
  var alt = [];
  (function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
      if ([".git", "node_modules", "tools-dev"].indexOf(e.name) >= 0) return;
      var p = path.join(dir, e.name);
      if (e.isDirectory()) return walk(p);
      if (!/\.html$/.test(e.name)) return;
      var src = fs.readFileSync(p, "utf8");
      if (src.indexOf("doc-paper") < 0) return;
      if (/color:#258CFF/.test(src)) alt.push(path.relative(ROOT, p));
    });
  })(ROOT);
  ok(alt.length === 0, "keine Dokumentseite setzt die zu helle Linkfarbe mehr inline" + (alt.length ? ": " + alt.join(", ") : ""));

  /* Die Geisterziffern sind Ornament — als solches ausgezeichnet, damit die
     Ausnahme dokumentiert ist statt bloß angenommen. */
  ok((read("index.html").match(/class="n" aria-hidden="true"/g) || []).length === 6, "die Ornament-Ziffern der Startseite sind als dekorativ ausgezeichnet");
  ok((read("protokoll.html").match(/class="pc-n" aria-hidden="true"/g) || []).length === 11, "die Kapitel-Geisterziffern ebenso");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
