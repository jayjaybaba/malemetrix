/* ==========================================================================
   MALEMETRIX — ANABOLE MATRIX: Datenintegrität und redaktionelle Leitplanken
   Sichert das, was bei dieser Seite tatsächlich kaputtgehen kann: eine
   Matrixzelle, die auf nichts zeigt; ein Signalweg ohne Hebel; eine Bremse,
   die versehentlich als „anschaltbar" ausgewiesen wird; eine Quelle ohne
   DOI; eine Evidenzstufe ohne Beleg; und die Passage über Substanzen, die
   beim nächsten Redesign still verschwindet.
   Ausführen:  node tools-dev/tests/anabole-matrix.test.js
   ========================================================================== */
"use strict";
var fs = require("node:fs");
var path = require("node:path");
var ROOT = path.resolve(__dirname, "../..");
function read(p) { return fs.readFileSync(path.join(ROOT, p), "utf8"); }
var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

require(path.join(ROOT, "js/anabole-matrix-data.js"));
var D = globalThis.MM_ANABOLIC;

var wegIds = D.signalwege.map(function (w) { return w.id; });
var hebelIds = D.hebel.map(function (h) { return h.id; });

/* ===== 1) Matrix zeigt nur auf Dinge, die es gibt ===== */
group("Matrix · keine Zelle zeigt ins Leere");
(function () {
  ok(!!D && D.version, "Datenmodell lädt und trägt eine Version");
  var fremdeZeilen = Object.keys(D.matrix).filter(function (k) { return hebelIds.indexOf(k) < 0; });
  ok(fremdeZeilen.length === 0, "jede Matrixzeile ist ein bekannter Hebel" + (fremdeZeilen.length ? " (" + fremdeZeilen.join(", ") + ")" : ""));

  var fremdeSpalten = [];
  var falscheCodes = [];
  Object.keys(D.matrix).forEach(function (h) {
    Object.keys(D.matrix[h]).forEach(function (w) {
      if (wegIds.indexOf(w) < 0) fremdeSpalten.push(h + "→" + w);
      if ([2, 1, -1].indexOf(D.matrix[h][w]) < 0) falscheCodes.push(h + "→" + w + "=" + D.matrix[h][w]);
    });
  });
  ok(fremdeSpalten.length === 0, "jede Matrixspalte ist ein bekannter Signalweg" + (fremdeSpalten.length ? " (" + fremdeSpalten.join(", ") + ")" : ""));
  ok(falscheCodes.length === 0, "nur die Wirkungscodes 2 / 1 / -1 kommen vor" + (falscheCodes.length ? " (" + falscheCodes.join(", ") + ")" : ""));

  var ohneWirkung = hebelIds.filter(function (h) { return D.deckung(h) === 0; });
  ok(ohneWirkung.length === 0, "kein Hebel ohne jede Wirkung" + (ohneWirkung.length ? " (" + ohneWirkung.join(", ") + ")" : ""));

  var offen = D.offeneWege();
  ok(offen.length === 0, "jeder Signalweg ist über mindestens einen Hebel erreichbar" + (offen.length ? " (offen: " + offen.join(", ") + ")" : ""));

  ok(Object.keys(D.wirkung).length === 4, "die Legende deckt alle vier Zustände ab (inkl. 'keine Wirkung')");
})();

/* ===== 2) Bremsen werden gelöst, nicht angeschaltet =====
   Der inhaltliche Kern der Seite: AMPK, Myostatin und der Kortisol-Arm sind
   Bremsen. Ein Hebel, der sie „direkt schaltet", wäre eine Aussage, die
   niemand vertreten will — und genau die Verwechslung, die diese Seite
   auflösen soll. */
group("Semantik · Bremse ≠ Gaspedal");
(function () {
  var bremsen = D.signalwege.filter(function (w) { return w.rolle === "bremse"; }).map(function (w) { return w.id; });
  var antriebe = D.signalwege.filter(function (w) { return w.rolle !== "bremse"; }).map(function (w) { return w.id; });
  ok(bremsen.length >= 3, "es gibt mindestens drei Bremsen (AMPK, Myostatin, Kortisol/FoxO)");

  var falschPositiv = [], falschNegativ = [];
  Object.keys(D.matrix).forEach(function (h) {
    Object.keys(D.matrix[h]).forEach(function (w) {
      var v = D.matrix[h][w];
      if (bremsen.indexOf(w) >= 0 && v > 0) falschPositiv.push(h + "→" + w);
      if (antriebe.indexOf(w) >= 0 && v < 0) falschNegativ.push(h + "→" + w);
    });
  });
  ok(falschPositiv.length === 0, "keine Bremse wird als 'schaltet direkt' geführt" + (falschPositiv.length ? " (" + falschPositiv.join(", ") + ")" : ""));
  ok(falschNegativ.length === 0, "kein anaboler Weg wird als 'Bremse lösen' geführt" + (falschNegativ.length ? " (" + falschNegativ.join(", ") + ")" : ""));

  var ohneLoesung = D.signalwege.filter(function (w) {
    return w.rolle === "bremse" && !w.loesen;
  }).map(function (w) { return w.id; });
  ok(ohneLoesung.length === 0, "jede Bremse sagt, wie man sie löst" + (ohneLoesung.length ? " (" + ohneLoesung.join(", ") + ")" : ""));
})();

/* ===== 3) Quellen: real, vollständig, referenziert ===== */
group("Quellen · DOI, Adresse, keine Platzhalter");
(function () {
  var ids = Object.keys(D.quellen);
  ok(ids.length >= 10, "das Register führt mindestens zehn Arbeiten (" + ids.length + ")");

  var unvollstaendig = ids.filter(function (id) {
    var q = D.quellen[id];
    return !q.titel || !q.autoren || !q.jahr || !q.venue || !q.doi || !q.url || !q.art || !q.aussage;
  });
  ok(unvollstaendig.length === 0, "jede Quelle trägt Titel, Autoren, Jahr, Journal, DOI, URL, Art und Kernaussage" + (unvollstaendig.length ? " (" + unvollstaendig.join(", ") + ")" : ""));

  var schlechteUrl = ids.filter(function (id) { return !/^https:\/\//.test(D.quellen[id].url); });
  ok(schlechteUrl.length === 0, "jede Quellen-URL ist https" + (schlechteUrl.length ? " (" + schlechteUrl.join(", ") + ")" : ""));

  var schlechteDoi = ids.filter(function (id) { return !/^10\.\d{4,9}\//.test(D.quellen[id].doi); });
  ok(schlechteDoi.length === 0, "jeder DOI hat die Form 10.xxxx/…" + (schlechteDoi.length ? " (" + schlechteDoi.join(", ") + ")" : ""));

  var platzhalter = ids.filter(function (id) { return /unresolved|tbd|todo|xxx/i.test(JSON.stringify(D.quellen[id])); });
  ok(platzhalter.length === 0, "keine Platzhalter-Quelle, die wie ein Beleg aussieht" + (platzhalter.length ? " (" + platzhalter.join(", ") + ")" : ""));

  /* Alle Verweise zeigen auf existierende Einträge — Signalwege, Hebel und
     der Vergleich gleichermaßen. */
  var tot = [];
  function pruefe(liste, wo) {
    (liste || []).forEach(function (id) { if (ids.indexOf(id) < 0) tot.push(wo + "→" + id); });
  }
  D.signalwege.forEach(function (w) { pruefe(w.quellen, w.id); });
  D.hebel.forEach(function (h) { pruefe(h.quellen, h.id); });
  D.vergleich.punkte.forEach(function (p, i) { pruefe(p.quellen, "vergleich[" + i + "]"); });
  ok(tot.length === 0, "kein Verweis zeigt auf eine Quelle, die es nicht gibt" + (tot.length ? " (" + tot.join(", ") + ")" : ""));

  /* Umgekehrt: eine Quelle, die nirgends benutzt wird, ist Ballast. */
  var benutzt = {};
  D.signalwege.forEach(function (w) { (w.quellen || []).forEach(function (q) { benutzt[q] = 1; }); });
  D.hebel.forEach(function (h) { (h.quellen || []).forEach(function (q) { benutzt[q] = 1; }); });
  D.vergleich.punkte.forEach(function (p) { (p.quellen || []).forEach(function (q) { benutzt[q] = 1; }); });
  var unbenutzt = ids.filter(function (id) { return !benutzt[id]; });
  ok(unbenutzt.length === 0, "jede geführte Quelle wird auch verwendet" + (unbenutzt.length ? " (" + unbenutzt.join(", ") + ")" : ""));
})();

/* ===== 4) Evidenz: keine Stufe ohne Deckung ===== */
group("Evidenz · Stufe und Beleg passen zusammen");
(function () {
  var STUFEN = ["STARK", "MITTEL", "SCHWACH"];
  var falsch = D.signalwege.concat(D.hebel).filter(function (x) { return STUFEN.indexOf(x.evidenz) < 0; });
  ok(falsch.length === 0, "jede Evidenzstufe ist STARK, MITTEL oder SCHWACH");

  /* STARK ohne Quelle wäre genau die Behauptung, die PROOF_STANDARD §0
     verbietet. MITTEL/SCHWACH ohne Quelle ist zulässig — dann muss es aber
     bei den Signalwegen ausdrücklich als solches markiert sein. */
  var starkOhneQuelle = D.signalwege.concat(D.hebel).filter(function (x) {
    return x.evidenz === "STARK" && (!x.quellen || x.quellen.length === 0);
  }).map(function (x) { return x.id; });
  ok(starkOhneQuelle.length === 0, "keine Aussage ist STARK, ohne eine Quelle zu tragen" + (starkOhneQuelle.length ? " (" + starkOhneQuelle.join(", ") + ")" : ""));

  var stummeLuecke = D.signalwege.filter(function (w) {
    return (!w.quellen || w.quellen.length === 0) && !w.evidenzNote;
  }).map(function (w) { return w.id; });
  ok(stummeLuecke.length === 0, "ein Signalweg ohne Quelle sagt ausdrücklich, dass er keine hat" + (stummeLuecke.length ? " (" + stummeLuecke.join(", ") + ")" : ""));
})();

/* ===== 5) Jeder Eintrag ist vollständig und überprüfbar ===== */
group("Inhalt · Dosis, Zeitfenster, Nachweis, Grenze");
(function () {
  var PFLICHT_WEG = ["name", "unter", "rolle", "was", "schalter", "fenster", "nachweis", "fehler", "grenze"];
  var luecken = [];
  D.signalwege.forEach(function (w) {
    PFLICHT_WEG.forEach(function (f) { if (!w[f] || String(w[f]).trim().length < 3) luecken.push(w.id + "." + f); });
  });
  ok(luecken.length === 0, "jeder Signalweg füllt alle Pflichtfelder" + (luecken.length ? " (" + luecken.join(", ") + ")" : ""));

  var PFLICHT_HEBEL = ["name", "kurz", "dosis", "warum", "nachweis", "fehler"];
  var hluecken = [];
  D.hebel.forEach(function (h) {
    PFLICHT_HEBEL.forEach(function (f) { if (!h[f] || String(h[f]).trim().length < 3) hluecken.push(h.id + "." + f); });
  });
  ok(hluecken.length === 0, "jeder Hebel trägt Dosis, Begründung, Nachweis und den häufigsten Fehler" + (hluecken.length ? " (" + hluecken.join(", ") + ")" : ""));

  var dopplung = wegIds.filter(function (v, i) { return wegIds.indexOf(v) !== i; })
    .concat(hebelIds.filter(function (v, i) { return hebelIds.indexOf(v) !== i; }));
  ok(dopplung.length === 0, "keine doppelte ID" + (dopplung.length ? " (" + dopplung.join(", ") + ")" : ""));

  /* Der Wochenplan darf nur auf existierende Wege verweisen. */
  var totImPlan = [];
  D.woche.forEach(function (t) {
    (t.wege || []).forEach(function (id) { if (wegIds.indexOf(id) < 0) totImPlan.push(t.tag + "→" + id); });
  });
  ok(totImPlan.length === 0, "der Trigger-Plan verweist nur auf echte Signalwege" + (totImPlan.length ? " (" + totImPlan.join(", ") + ")" : ""));
  ok(D.woche.length === 7, "der Trigger-Plan deckt eine volle Woche ab");
})();

/* ===== 5b) Kurzmarken: eindeutig und spaltentauglich =====
   Zwei verschiedene Arbeiten von Morton aus 2018 stehen im Register. Eine
   automatisch aus „Autor + Jahr" gebaute Marke wäre bei beiden gleich —
   deshalb steht die Kurzmarke in den Daten und wird hier auf Eindeutigkeit
   geprüft. */
group("Kurzmarken · eindeutig, und die Spalte trägt sie");
(function () {
  var ids = Object.keys(D.quellen);
  var ohne = ids.filter(function (id) { return !D.quellen[id].kurz; });
  ok(ohne.length === 0, "jede Quelle hat eine Kurzmarke" + (ohne.length ? " (" + ohne.join(", ") + ")" : ""));
  var marken = ids.map(function (id) { return D.quellen[id].kurz; });
  var doppelt = marken.filter(function (v, i) { return marken.indexOf(v) !== i; });
  ok(doppelt.length === 0, "keine zwei Quellen tragen dieselbe Kurzmarke" + (doppelt.length ? " (" + doppelt.join(", ") + ")" : ""));

  /* Der Spaltenkopf der Matrix ist gedreht und hat feste Höhe (152 px).
     Bei 0.7rem passen rund 22 Zeichen — darüber wird abgeschnitten. */
  var zuLang = D.signalwege.filter(function (w) { return !w.kurz || w.kurz.length > 22; })
    .map(function (w) { return w.id + " (" + (w.kurz ? w.kurz.length : "fehlt") + ")"; });
  ok(zuLang.length === 0, "jeder Signalweg hat einen Kurznamen von höchstens 22 Zeichen" + (zuLang.length ? " (" + zuLang.join(", ") + ")" : ""));

  var css = read("anabole-matrix.html");
  ok(/\.am-col-n \{[^}]*height: 152px/.test(css), "die Spaltenhöhe im Stylesheet passt zu dieser Grenze");
})();

/* ===== 6) Die unbequeme Passage bleibt =====
   Ohne den ehrlichen Vergleich ist die Seite Werbung. Deshalb wird er nicht
   als Fließtext geführt, sondern als geprüfte Struktur. */
group("Ehrlichkeit · der Vergleich mit Substanzen bleibt stehen");
(function () {
  var v = D.vergleich;
  ok(!!v && !!v.kern && v.punkte.length >= 4, "der Vergleich hat eine Kernaussage und mindestens vier Punkte");
  var alle = JSON.stringify(v);
  ok(/ersetzt/.test(v.kern) || /nichts davon/i.test(v.kern), "die Kernaussage sagt ausdrücklich, dass nichts davon Substanzen ersetzt");

  var belegt = {};
  v.punkte.forEach(function (p) { (p.quellen || []).forEach(function (q) { belegt[q] = 1; }); });
  ["bhasin_1996", "bhasin_2001", "bhasin_2018"].forEach(function (q) {
    ok(!!belegt[q], "der Vergleich stützt sich auf " + q);
  });
  ok(/Arzt|ärztlich/.test(alle), "der Vergleich verweist für Substanzfragen an den Arzt");

  /* Keine Dosierungs- oder Bezugsanleitung für Substanzen — irgendwo in den
     Daten. Die 600-mg-Angabe stammt aus der zitierten Studie und steht dort
     als Studienbedingung, nicht als Anwendung: sie muss von einer Quelle
     begleitet sein. */
  var text = JSON.stringify(D);
  ok(!/(kaufen|bestellen|bezugsquelle|Quelle für|Anbieter)\s*(von\s*)?(Testosteron|Anabolika|Steroid)/i.test(text),
    "nirgends eine Bezugsanleitung für Substanzen");
  ok(!/(nimm|nehme|dosiere|spritze)\s+\d+\s*(mg|ml|IE)/i.test(text),
    "nirgends eine Einnahme- oder Dosieranweisung in der zweiten Person");
})();

/* ===== 7) Seite und Datenmodell hängen zusammen ===== */
group("Seite · Auslieferung, Struktur, Index");
(function () {
  var html = read("anabole-matrix.html");
  var js = read("js/anabole-matrix.js");

  ok((html.match(/<h1[\s>]/g) || []).length === 1, "genau eine h1");
  ok(/rel="canonical" href="https:\/\/www\.malemetrix\.com\/anabole-matrix\.html"/.test(html), "kanonische Adresse gesetzt");
  ok(/property="og:title"/.test(html) && /name="twitter:card"/.test(html), "Titel und Karte für geteilte Links");
  ok(/application\/ld\+json/.test(html), "strukturierte Daten vorhanden");

  var iData = html.indexOf("js/anabole-matrix-data.js");
  var iView = html.indexOf("js/anabole-matrix.js");
  ok(iData > -1 && iView > -1 && iData < iView, "die Datendatei wird vor der Darstellung geladen");

  ["amMatrix", "amZahlen", "amWege", "amHebel", "amWoche", "amVergleich", "amQuellen"].forEach(function (id) {
    ok(html.indexOf('id="' + id + '"') > -1, "Aufhängepunkt " + id + " existiert in der Seite");
  });

  /* Der Vorspann nennt die Aufteilung der elf Wege in Worten. Sie ist von
     Hand geschrieben und damit die Stelle, die bei einer Datenänderung
     still falsch wird — deshalb wird sie gegen die Daten geprüft. */
  var WORT = ["null", "ein", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf"];
  function zaehle(rolle) { return D.signalwege.filter(function (w) { return w.rolle === rolle; }).length; }
  var vorspann = (html.match(/Muskelaufbau ist kein einzelner Schalter[^<]*/) || [""])[0];
  ok(vorspann.indexOf(WORT[D.signalwege.length] + " Wegen") > -1,
    "der Vorspann nennt die richtige Gesamtzahl der Wege (" + WORT[D.signalwege.length] + ")");
  ok(vorspann.indexOf(WORT[zaehle("gas")] + ", die Aufbau anschalten") > -1,
    "… die richtige Zahl anaboler Wege (" + WORT[zaehle("gas")] + ")");
  ok(vorspann.indexOf(WORT[zaehle("kapazitaet")] + ", die die Obergrenze setzen") > -1,
    "… die richtige Zahl der Kapazitätswege (" + WORT[zaehle("kapazitaet")] + ")");
  ok(vorspann.indexOf(WORT[zaehle("bremse")] + ", die bremsen") > -1,
    "… die richtige Zahl der Bremsen (" + WORT[zaehle("bremse")] + ")");

  ok(/Ersatz für ärztliche Beratung/.test(html), "der medizinische Hinweis steht auf der Seite");
  ok(/Keine Einnahme-, Dosierungs- oder Therapieempfehlung/.test(html), "und die Abgrenzung zu Dosierungsempfehlungen");
  ok(/check\.html/.test(html), "die Seite führt zum Score weiter (kein Sackgassen-Screen)");

  /* Inhalt lebt in der Datendatei — die Darstellung erfindet keinen. */
  ok(!/mTORC1|Myostatin|Kreatin-Monohydrat/.test(js), "die Darstellungsdatei enthält keine Inhaltsbegriffe (eine Quelle je Inhalt)");

  var sm = read("sitemap.xml");
  ok(sm.indexOf("anabole-matrix.html") > -1, "die Seite steht in der Sitemap");
  ok(!/noindex/.test(html), "die Seite ist für die Suche freigegeben");

  /* Systemsprache: keine Emoji-UI in einer Referenzseite. */
  ok(!/[\u{1F300}-\u{1FAFF}]/u.test(html.replace(/<!--[\s\S]*?-->/g, "")), "keine Emoji in der Seite");
  ok(!/[\u{1F300}-\u{1FAFF}]/u.test(JSON.stringify(D)), "keine Emoji in den Daten");
})();

console.log("\n" + "-".repeat(52));
console.log(passed + " bestanden, " + failed + " fehlgeschlagen.");
process.exit(failed ? 1 : 0);
