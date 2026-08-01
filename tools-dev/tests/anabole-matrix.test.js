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
  Object.keys(D.substanzKategorien).forEach(function (k) { pruefe(D.substanzKategorien[k].quellen, "stack/" + k); });
  ok(tot.length === 0, "kein Verweis zeigt auf eine Quelle, die es nicht gibt" + (tot.length ? " (" + tot.join(", ") + ")" : ""));

  /* Umgekehrt: eine Quelle, die nirgends benutzt wird, ist Ballast. */
  var benutzt = {};
  D.signalwege.forEach(function (w) { (w.quellen || []).forEach(function (q) { benutzt[q] = 1; }); });
  D.hebel.forEach(function (h) { (h.quellen || []).forEach(function (q) { benutzt[q] = 1; }); });
  D.vergleich.punkte.forEach(function (p) { (p.quellen || []).forEach(function (q) { benutzt[q] = 1; }); });
  Object.keys(D.substanzKategorien).forEach(function (k) {
    (D.substanzKategorien[k].quellen || []).forEach(function (q) { benutzt[q] = 1; });
  });
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

  /* Zweite Achse: die ART des Belegs. Ein Mechanismus kann gut beschrieben
     und als Hebel trotzdem wertlos sein — ohne diese Achse verschwimmt
     „Mechanismus belegt" mit „Hebel belegt". */
  var ARTEN = ["HUMAN-LANGZEIT", "HUMAN-AKUT", "PRÄKLINISCH", "LEITLINIE", "MECHANISMUS"];
  var falscheArt = D.signalwege.concat(D.hebel).filter(function (x) { return ARTEN.indexOf(x.evidenzArt) < 0; })
    .map(function (x) { return x.id + "=" + x.evidenzArt; });
  ok(falscheArt.length === 0, "jeder Eintrag nennt die Art des Belegs, nicht nur seine Stärke" + (falscheArt.length ? " (" + falscheArt.join(", ") + ")" : ""));

  /* Die schärfste Regel dieser Achse: Was nur mechanistisch begründet ist,
     darf nie als HUMAN-LANGZEIT ausgewiesen sein und umgekehrt — eine
     Aussage mit Humanstudien-Quelle darf nicht als MECHANISMUS kleinreden. */
  var widerspruch = D.signalwege.concat(D.hebel).filter(function (x) {
    return x.evidenzArt === "MECHANISMUS" && x.quellen && x.quellen.length > 0;
  }).map(function (x) { return x.id; });
  ok(widerspruch.length === 0, "kein Eintrag ist als MECHANISMUS geführt, obwohl er eine Studie trägt" + (widerspruch.length ? " (" + widerspruch.join(", ") + ")" : ""));
})();

/* ===== 4b) Die multiplikative Rechnung =====
   Sie ist die Begründung dafür, dass die Seite eine Matrix ist und dass der
   Score nach dem Engpass sucht. Verweist ein Faktor ins Leere oder fällt ein
   Signalweg aus allen Faktoren heraus, stimmt die Erzählung nicht mehr. */
group("Rechnung · multiplikativ und lückenlos");
(function () {
  var F = D.formel;
  ok(!!F && F.faktoren.length >= 4, "die Rechnung hat mindestens vier Faktoren (" + (F ? F.faktoren.length : 0) + ")");
  ok(/multipliziert/i.test(F.kern), "sie sagt ausdrücklich, dass multipliziert und nicht addiert wird");
  ok(/Engpass/.test(F.folgerung), "und führt auf den Engpass — das Konzept, auf dem der Score steht");

  var tot = [];
  F.faktoren.forEach(function (fa) {
    ok(!!fa.frage && !!fa.leer, "Faktor „" + fa.name + "“ nennt Prüffrage und den Zustand bei null");
    fa.wege.forEach(function (id) { if (wegIds.indexOf(id) < 0) tot.push(fa.name + "→" + id); });
  });
  ok(tot.length === 0, "jeder Faktor verweist nur auf echte Signalwege" + (tot.length ? " (" + tot.join(", ") + ")" : ""));

  var abgedeckt = F.faktoren.reduce(function (a, fa) { return a.concat(fa.wege); }, []);
  var heimatlos = wegIds.filter(function (id) { return abgedeckt.indexOf(id) < 0; });
  ok(heimatlos.length === 0, "jeder Signalweg gehört zu einem Faktor der Rechnung" + (heimatlos.length ? " (" + heimatlos.join(", ") + ")" : ""));
})();

/* ===== 4c) Wege ohne steuerbaren Hebel =====
   Die Matrixregel „jeder Weg braucht einen Hebel" erzwingt Nützlichkeit —
   und würde ohne diesen Block genau die Wege verschweigen, unter deren
   Namen Präparate verkauft werden. */
group("Ehrlichkeit · was real ist, aber kein Hebel");
(function () {
  var O = D.ohneHebel;
  ok(O.length >= 5, "es sind mindestens fünf aufgeführt (" + O.length + ")");
  var luecken = O.filter(function (o) { return !o.id || !o.name || !o.was || !o.warum || !o.art; })
    .map(function (o) { return o.id || "?"; });
  ok(luecken.length === 0, "jeder nennt Name, Beschreibung, Begründung und Belegart" + (luecken.length ? " (" + luecken.join(", ") + ")" : ""));

  var kollision = O.filter(function (o) { return wegIds.indexOf(o.id) >= 0 || hebelIds.indexOf(o.id) >= 0; });
  ok(kollision.length === 0, "keine ID kollidiert mit einem Signalweg oder Hebel");

  var oIds = O.map(function (o) { return o.id; });
  ok(oIds.filter(function (v, i) { return oIds.indexOf(v) !== i; }).length === 0, "keine doppelte ID");

  /* Der wichtigste Einzelfall: Myostatin-Präparate. Wenn diese Zeile
     verschwindet, verliert die Seite ihre Schutzwirkung an der Stelle, an
     der am aggressivsten verkauft wird. */
  var text = JSON.stringify(O);
  ok(/Myostatin/.test(text) && /Follistatin/.test(text), "die Myostatin-/Follistatin-Präparate sind ausdrücklich benannt");
  ok(/β₂|Beta-2|β2/.test(text), "die β₂-Achse ist benannt");
  ok(/GH|Wachstumshormon/.test(text), "Wachstumshormon ist benannt");
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
  ["bhasin_1996", "bhasin_2001", "bhasin_2018", "baggish_2017", "lange_2002"].forEach(function (q) {
    ok(!!belegt[q], "der Vergleich stützt sich auf " + q);
  });

  /* Das Konvergenz-Argument ist die Antwort auf „dann eben von allem ein
     bisschen" — der Ansatz, der am plausibelsten klingt und am schlechtesten
     belegt ist. Ohne ihn beantwortet die Seite die eigentliche Frage nicht. */
  ok(/von allem ein bisschen/i.test(alle), "der Vergleich behandelt die „von allem ein bisschen“-Strategie ausdrücklich");
  ok(/dieselben Knoten|nicht additiv/i.test(alle), "… und begründet sie mit der Konvergenz auf dieselben Knoten");
  ok(/summieren sich|addieren sich/i.test(alle), "… während die Nebenwirkungen sich addieren");
  ok(/Flüssigkeit/.test(alle), "… und trennt fettfreie Masse von kontraktilem Gewebe");
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

/* ===== 6b) Der Selbstcheck: Verhalten projizieren, nicht Biologie messen =====
   Die inhaltliche Kernregel dieses Moduls. Er darf sagen, was das Verhalten
   adressiert — er darf nie behaupten, ein Signalweg sei im Muskel aktiv. */
group("Selbstcheck · Projektion, keine Messung");
(function () {
  var F = D.fragen;
  ok(F.length === D.hebel.length, "genau eine Frage je Hebel (" + F.length + " / " + D.hebel.length + ")");

  var fremd = F.filter(function (f) { return hebelIds.indexOf(f.hebel) < 0; }).map(function (f) { return f.hebel; });
  ok(fremd.length === 0, "jede Frage gehört zu einem echten Hebel" + (fremd.length ? " (" + fremd.join(", ") + ")" : ""));
  var hIds = F.map(function (f) { return f.hebel; });
  ok(hIds.filter(function (v, i) { return hIds.indexOf(v) !== i; }).length === 0, "kein Hebel wird doppelt gefragt");
  var ohneFrage = hebelIds.filter(function (id) { return hIds.indexOf(id) < 0; });
  ok(ohneFrage.length === 0, "kein Hebel bleibt ungefragt" + (ohneFrage.length ? " (" + ohneFrage.join(", ") + ")" : ""));

  var schlecht = F.filter(function (f) {
    var w = (f.optionen || []).map(function (o) { return o.w; });
    return w.length !== 3 || w.join(",") !== "2,1,0" ||
      (f.optionen || []).some(function (o) { return !o.label || o.label.length < 5; });
  }).map(function (f) { return f.hebel; });
  ok(schlecht.length === 0, "jede Frage hat drei beschriftete Stufen 2/1/0" + (schlecht.length ? " (" + schlecht.join(", ") + ")" : ""));

  /* ---- Die Sprachregel ----
     Geprüft wird nur, was der Selbstcheck ausgibt: seine Fragen, seine
     Zustandsbezeichnungen, sein Renderblock und sein Seitenabschnitt. Die
     Matrix selbst darf weiter von „schaltet direkt" sprechen — das ist eine
     Aussage über den Mechanismus, keine über den Nutzer. */
  var view = read("js/anabole-matrix.js");
  var ckJs = (view.split("SELBSTCHECK")[1] || "").split("TRIGGER-PLAN")[0];
  var page = read("anabole-matrix.html");
  var ckHtml = (page.split('id="abgleich"')[1] || "").split("</section>")[0];
  var ausgabe = JSON.stringify(D.fragen) + JSON.stringify(D.status) + ckJs + ckHtml;

  ok(ckJs.length > 500, "der Renderblock des Selbstchecks wurde für die Prüfung gefunden");
  ok(ckHtml.length > 200, "der Seitenabschnitt des Selbstchecks wurde für die Prüfung gefunden");

  [/\baktiviert\b/i, /\bgetriggert\b/i, /\bangeschaltet\b/i, /\bhochreguliert\b/i,
   /\bstimuliert\b/i, /dein mTOR/i, /deine? Signalweg\w* (ist|sind) aktiv/i].forEach(function (re) {
    ok(!re.test(ausgabe), "der Selbstcheck behauptet nirgends molekulare Aktivität (" + re.source + ")");
  });
  ok(/adressiert/.test(ausgabe), "er spricht stattdessen davon, was das Verhalten adressiert");
  ok(/kein Messwert|keine Messung/i.test(ausgabe), "und sagt ausdrücklich, dass es keine Messung ist");
  ok(/Selbstauskunft|überschätz/i.test(ausgabe), "… inklusive der Verzerrung durch Selbstauskunft");

  /* Kein Gesamtwert. Die Rechnung ist multiplikativ — ein Mittelwert wäre
     genau die Verwischung, gegen die die ganze Seite argumentiert. */
  ok(/keine Gesamtnote|kein Gesamtwert/i.test(ausgabe),
    "er sagt ausdrücklich, dass es keine Gesamtnote gibt");
  ok(!/\d+\s*%|\d+\s*Punkte|\bvon 100\b/.test(ausgabe),
    "und gibt nirgends eine Zahl als Note aus — die Rechnung ist multiplikativ, ein Mittelwert würde sie verwischen");

  /* ---- Zustände: vier, und Bremsen sprechen anders ---- */
  ok(Object.keys(D.status).length === 4, "vier Zustände — „noch offen“ ist eigenständig, nicht „nicht adressiert“");
  var bremsen = D.signalwege.filter(function (w) { return w.rolle === "bremse"; });
  var falschesWort = [];
  bremsen.forEach(function (w) {
    ["stark", "schwach", "keiner"].forEach(function (z) {
      if (/adressiert/.test(D.statusLabel(w.id, z))) falschesWort.push(w.id + "/" + z);
    });
  });
  ok(falschesWort.length === 0, "eine Bremse wird nie „adressiert“, sondern entlastet" + (falschesWort.length ? " (" + falschesWort.join(", ") + ")" : ""));

  /* ---- Auswertung: die Randfälle, in denen still gelogen würde ---- */
  function alle(v) { var o = {}; D.fragen.forEach(function (f) { o[f.hebel] = v; }); return o; }
  var leer = D.bewerte({});
  ok(wegIds.every(function (id) { return leer.wege[id] === "offen"; }),
    "ohne Antwort steht jeder Weg auf „offen“ — nie auf „nicht adressiert“");
  ok(leer.naechster === null && leer.schwaechster === null,
    "ohne Antwort wird weder ein Hebel noch ein schwächster Faktor behauptet");

  var null0 = D.bewerte(alle(0));
  ok(wegIds.every(function (id) { return null0.wege[id] === "keiner"; }), "bei durchweg 0 ist kein Weg adressiert");
  ok(!!null0.naechster, "… und genau ein nächster Hebel wird benannt");

  var voll = D.bewerte(alle(2));
  ok(wegIds.every(function (id) { return voll.wege[id] === "stark"; }), "bei durchweg 2 ist jeder Weg adressiert");
  ok(voll.schwaechster === null, "… und es wird kein schwächster Faktor erfunden, wenn keiner zurückliegt");
  ok(voll.naechster === null, "… und kein nächster Hebel");

  /* Ein einzelner erfüllter Hebel darf einen Weg nicht adressiert machen,
     solange ein anderer direkt wirkender Hebel bei null steht. */
  var einseitig = D.bewerte(Object.assign(alle(2), { H08: 0 }));
  ok(einseitig.wege.SW04 !== "stark",
    "der Androgenrezeptor gilt nicht als adressiert, wenn der Schlaf-Hebel bei null steht");
  ok(einseitig.naechster && einseitig.naechster.hebel.id === "H08",
    "… und der Schlaf wird als nächster Hebel benannt");

  /* Ein unbeantworteter Hebel darf nie empfohlen werden. */
  var teil = D.bewerte({ H01: 2, H06: 2, H08: 2 });
  ok(teil.naechster === null,
    "solange nur erfüllte Hebel beantwortet sind, wird nichts empfohlen — unbeantwortet heißt unbekannt");
  ok(teil.beantwortet === 3 && teil.vollstaendig === false, "der Fortschritt wird ehrlich gezählt");

  /* ---- Übernahme aus dem Score: nur lesend ---- */
  ok(/check_draft/.test(ckJs), "die Übernahme liest den gespeicherten Score-Entwurf");
  ok(!/MM\.store\.set\("check_|MM\.store\.set\('check_/.test(view),
    "der Selbstcheck schreibt nie in die Speicherbereiche des Scores");
  ok(!/check-data|CHECK_DATA|MM_CHECK/.test(view), "und rührt die kalibrierte Score-Engine nicht an");
})();

/* ===== 6c) Stack-Abgleich: nur Enhanced, nur Kategorien, kein Planer =====
   Die Ansicht bildet die Substanz-KATEGORIEN des Scores auf die Matrix ab.
   Sie darf drei Dinge nie tun: für andere Kontexte erscheinen, unter die
   Kategorie-Ebene gehen, oder eine zusätzliche Substanz als Gewinn zeigen. */
group("Stack-Abgleich · Konvergenz zeigen, nicht Eskalation belohnen");
(function () {
  require(path.join(ROOT, "js/matrix-cta.js"));
  var CTA = globalThis.MM_MATRIX_CTA || (global.window && global.window.MM_MATRIX_CTA);
  var K = D.substanzKategorien;

  /* --- Freischaltung --- */
  function res(status, kat) { return { status: status, answers: { enh_categories: kat } }; }
  ok(!!CTA.enhancedStack(res("enhanced", ["testosterone"])), "Enhanced mit Kategorie schaltet frei");
  ["natural", "medical_trt", "former_enhanced", "uncertain", "unknown"].forEach(function (s) {
    ok(CTA.enhancedStack(res(s, ["testosterone"])) === null, s + " schaltet NICHT frei");
  });
  ok(CTA.enhancedStack(res("enhanced", [])) === null, "Enhanced ohne Kategorie schaltet nicht frei");
  ok(CTA.enhancedStack(res("enhanced", ["no_answer"])) === null, "„Möchte ich nicht angeben“ zählt nie als Kategorie");
  [null, undefined, {}, { status: "enhanced" }, { status: "enhanced", answers: "x" }].forEach(function (bad, i) {
    var r; try { r = CTA.enhancedStack(bad); } catch (e) { r = "EX"; }
    ok(r === null, "unbrauchbare Eingabe #" + i + " → keine Freischaltung");
  });

  /* --- Jede Kategorie des Scores ist abgebildet --- */
  var scoreKats = ["testosterone", "aas", "oral", "gh", "glp1", "thyroid", "insulin", "stimulants", "peptides", "other"];
  var fehlend = scoreKats.filter(function (k) { return !K[k]; });
  ok(fehlend.length === 0, "jede Kategorie aus enh_categories ist abgebildet" + (fehlend.length ? " (" + fehlend.join(", ") + ")" : ""));
  var engine = read("js/check-data.js");
  var imScore = scoreKats.filter(function (k) { return new RegExp('v: "' + k + '"').test(engine); });
  ok(imScore.length === scoreKats.length, "und jede davon wird vom Score wirklich erhoben (" + imScore.length + "/" + scoreKats.length + ")");

  /* --- Verweise zeigen nur auf echte Wege bzw. echte Nicht-Hebel --- */
  var ohneIds = D.ohneHebel.map(function (o) { return o.id; });
  var tot = [];
  Object.keys(K).forEach(function (k) {
    (K[k].achsen || []).concat(K[k].gegen || []).forEach(function (w) { if (wegIds.indexOf(w) < 0) tot.push(k + "→" + w); });
    if (K[k].ausserhalb && ohneIds.indexOf(K[k].ausserhalb) < 0) tot.push(k + "→" + K[k].ausserhalb);
    (K[k].quellen || []).forEach(function (q) { if (!D.quelle(q)) tot.push(k + "→Quelle " + q); });
    if (!K[k].name || !K[k].wirkt || !K[k].grenze) tot.push(k + " unvollständig");
  });
  ok(tot.length === 0, "kein Verweis zeigt ins Leere" + (tot.length ? " (" + tot.join(", ") + ")" : ""));

  /* --- Der Kernbefund: Konvergenz --- */
  var einer = D.bewerteStack(["testosterone"]);
  ok(einer.achsen.length === 1 && einer.unberuehrt.length === D.signalwege.length - 1,
    "eine Substanz öffnet eine Achse — zwölf Wege bleiben unberührt");

  var zwei = D.bewerteStack(["testosterone", "aas"]);
  ok(zwei.achsen.length === 1, "eine zweite androgene Kategorie öffnet KEINE zusätzliche Achse");
  ok(zwei.konvergenz.indexOf("aas") >= 0, "… und wird ausdrücklich als konvergent ausgewiesen");
  ok(zwei.kontrolle.length >= einer.kontrolle.length, "… während die Kontrollmarker nicht weniger werden");

  var voll = D.bewerteStack(["testosterone", "aas", "gh", "stimulants", "glp1"]);
  ok(voll.kategorien.length === 5 && voll.achsen.length === 2,
    "fünf Kategorien ergeben zwei anabole Achsen (" + voll.achsen.length + ")");
  ok(voll.unberuehrt.length >= 7, "und lassen mindestens sieben Wege unberührt (" + voll.unberuehrt.length + ")");
  ok(voll.gegen.length > 0, "eine Kategorie wirkt ausdrücklich in die Gegenrichtung");
  ok(voll.ausserhalb.indexOf("OH6") >= 0, "die β₂-Achse wird als außerhalb der Matrix geführt");

  /* Mehr Kategorien dürfen die unberührten Wege nie erhöhen und die
     Kontrollmarker nie senken — sonst würde die Ansicht Eskalation belohnen. */
  ok(voll.unberuehrt.length < einer.unberuehrt.length, "mehr Kategorien lassen nicht MEHR Wege unberührt");
  ok(voll.kontrolle.length > einer.kontrolle.length, "aber mehr Marker zu kontrollieren (" + einer.kontrolle.length + " → " + voll.kontrolle.length + ")");

  /* --- Reinheit --- */
  var eingabe = ["testosterone", "gh"];
  var vorher = JSON.stringify(eingabe);
  D.bewerteStack(eingabe); D.bewerteStack(eingabe);
  ok(JSON.stringify(eingabe) === vorher, "die Eingabe wird nicht verändert");
  ok(JSON.stringify(D.bewerteStack(eingabe)) === JSON.stringify(D.bewerteStack(eingabe)), "deterministisch");
  ok(D.bewerteStack(["quatsch", null, 7]).kategorien.length === 0, "Unbekanntes wird ignoriert, nicht interpretiert");

  /* --- Kein Planer: keine Dosis, kein Verbindungsvergleich --- */
  var stackText = JSON.stringify(K) + read("js/anabole-matrix.js").split("STACK-ABGLEICH")[1].split("TRIGGER-PLAN")[0];
  [/\d+\s?mg\b/i, /\d+\s?(IE|iu)\b/i, /\d+\s?ml\b/i, /pro Woche\s+\d/i, /Zyklus/i, /\bDosierung\b/i,
   /Primo|Masteron|Trenbolon|Enanthat|Semaglutid|Clenbuterol|Retatrutid/i].forEach(function (re) {
    ok(!re.test(stackText), "keine Planer-Angabe im Stack-Abgleich (" + re.source + ")");
  });
  ok(/Arzt|ärztlich/.test(read("anabole-matrix.html").split('id="amStack"')[1].split("</section>")[0]),
    "der Abschnitt verweist für Substanzfragen an den Arzt");

  /* --- Der Abschnitt existiert nur im Enhanced-Kontext --- */
  var html = read("anabole-matrix.html");
  ok(/<section class="am-sec" id="amStack" hidden>/.test(html), "der Abschnitt ist standardmäßig ausgeblendet");
  var view = read("js/anabole-matrix.js");
  ok(/enhancedStack\(res\)/.test(view) && /if \(!gate\) return;/.test(view),
    "er wird nur bei bestätigtem Enhanced-Kontext gefüllt");
  ok(/sec\.hidden = false;/.test(view), "und erst dann sichtbar gemacht");
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

  ["amMatrix", "amZahlen", "amFormel", "amWege", "amHebel", "amOhne", "amWoche", "amVergleich", "amQuellen"].forEach(function (id) {
    ok(html.indexOf('id="' + id + '"') > -1, "Aufhängepunkt " + id + " existiert in der Seite");
  });

  /* Der Vorspann nennt die Aufteilung der elf Wege in Worten. Sie ist von
     Hand geschrieben und damit die Stelle, die bei einer Datenänderung
     still falsch wird — deshalb wird sie gegen die Daten geprüft. */
  var WORT = ["null", "ein", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn",
    "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn", "zwanzig"];
  function zaehle(rolle) { return D.signalwege.filter(function (w) { return w.rolle === rolle; }).length; }
  var vorspann = (html.match(/Muskelaufbau ist kein einzelner Schalter[^<]*/) || [""])[0];
  ok(vorspann.indexOf(WORT[D.signalwege.length] + " Wegen") > -1,
    "der Vorspann nennt die richtige Gesamtzahl der Wege (" + WORT[D.signalwege.length] + ")");

  /* Weitere von Hand geschriebene Zahlen auf der Seite — sie werden alle
     gegen die Daten geprüft, damit keine still falsch wird. */
  /* Satzanfänge sind großgeschrieben — deshalb wird kleingeschrieben verglichen. */
  var klein = html.toLowerCase();
  function nennt(text, m) { ok(klein.indexOf(text.toLowerCase()) > -1, m); }
  nennt(WORT[D.hebel.length] + " Hebel gegen " + WORT[D.signalwege.length] + " Signalwege",
    "die Matrix-Überschrift nennt beide Zahlen richtig");
  nennt("Die " + WORT[D.signalwege.length] + " Signalwege im Einzelnen",
    "die Wege-Überschrift nennt die richtige Zahl");
  nennt("Die " + WORT[D.hebel.length] + " Hebel, dosiert",
    "die Hebel-Überschrift nennt die richtige Zahl");
  nennt(WORT[Object.keys(D.quellen).length] + " verifizierte Arbeiten",
    "der Quellen-Vorspann nennt die richtige Zahl (" + WORT[Object.keys(D.quellen).length] + ")");
  nennt("Diese " + WORT[D.ohneHebel.length] + " stehen bewusst nicht in der Matrix",
    "der Abschnitt „ohne Hebel“ nennt die richtige Zahl (" + WORT[D.ohneHebel.length] + ")");
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
