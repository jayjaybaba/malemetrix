/* ==========================================================================
   MALEMETRIX — Regressionstests zum Feedback aus dem ersten Testlauf mit
   einem echten Anwender.

   Jede Prüfung friert genau eine Rückmeldung ein. Wo es geht, wird die
   Wirkung reproduziert (Ziel → Modus, Seed → Rotation), nicht nur der
   Quelltext abgeglichen.

   Ausführen:  node tools-dev/tests/feedback-v1.test.js
   ========================================================================== */
"use strict";
var fs = require("fs");
var path = require("path");
var ROOT = path.resolve(__dirname, "../..");
var read = function (f) { return fs.readFileSync(path.join(ROOT, f), "utf8"); };

var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

/* Engine laden */
global.window = global;
global.document = { addEventListener: function () {}, querySelector: function () { return null; } };
require(path.join(ROOT, "js/check-data.js"));
var C = global.window.MM_CHECK;
var BASIS = { age: "42", height: "180", weight: "88", job: "sitzend", kids: "nein", steps: "4to7", history: "aktiv" };

/* ===================================================================== 1 */
group("1 · „Einfach gesünder werden“ ist ein eigenes Ziel");
(function () {
  var q = C.questionById("goal_main");
  var werte = q.options.map(function (o) { return o.v; });
  ok(werte.indexOf("gesundheit") === 0, "die Option steht an erster Stelle der Zielfrage");
  ok(/gesünder werden/i.test(q.options[0].label), "Beschriftung: „" + q.options[0].label + "“");
  var pain = C.questionById("goal_pain");
  ok(pain.options[0].v === "gesundheit", "auch „Was stört dich?“ lässt „nichts Bestimmtes“ zu");

  /* Wirkung: aus dem Gesundheitsziel darf keine Diät- oder Aufbauansage
     werden, die niemand verlangt hat. */
  function modus(a) { return C.goalDecision(Object.assign({}, BASIS, a)); }
  var schlank = modus({ goal_main: ["gesundheit"], waist: "84" });
  var mittel = modus({ goal_main: ["gesundheit"], waist: "96" });
  var hoch = modus({ goal_main: ["gesundheit"], waist: "112", weight: "105" });
  ok(schlank.mode === "perform", "schlank + Gesundheitsziel ⇒ PERFORM (weder Diät noch Aufbau)");
  ok(mittel.mode === "recomp", "mittlere Taille ⇒ RECOMP statt Diätansage");
  ok(hoch.mode === "cut", "hoher Körperfettanteil ⇒ CUT — mit gesundheitlicher, nicht optischer Begründung");
  ok(/gesundheitlicher Hebel/.test(hoch.reason), "die Begründung spricht von Gesundheit: „" + hoch.reason.slice(0, 60) + "…“");
  ok(!/Fokus liegt klar auf weniger Bauchfett/.test(mittel.reason),
    "kein unterstellter Fettabbau-Fokus (der Fehler, den die Umstellung behebt)");

  /* Alle anderen Wege bleiben, wie sie waren. */
  ok(modus({ goal_main: ["bauchfett"], waist: "100" }).mode === "cut", "Bauchfett-Ziel unverändert CUT");
  ok(modus({ goal_main: ["muskeln"], waist: "82", str_freq: "2_3", str_plan: "ja" }).mode === "build", "Muskel-Ziel unverändert BUILD");
  ok(modus({ goal_main: ["energie"], waist: "84" }).mode === "perform", "Energie-Ziel unverändert PERFORM");
  ok(modus({ goal_main: ["gesundheit", "bauchfett"], waist: "96" }).mode === "cut",
    "wer BEIDES nennt, bekommt weiterhin die Körper-Logik");
})();

/* ===================================================================== 2 */
group("2 · Mehr Fragen, wenn Gesundheit das Ziel ist");
(function () {
  ok(typeof C.healthFocus === "function", "es gibt eine zentrale Bedingung dafür");
  ok(C.healthFocus({ goal_main: ["gesundheit"] }) && C.healthFocus({ goal_pain: "gesundheit" }), "sie greift bei beiden Zielfragen");
  ok(!C.healthFocus({ goal_main: ["muskeln"] }), "und nur dort");

  var mod = C.modules.filter(function (m) { return m.id === "healthdeep"; })[0];
  ok(!!mod, "es gibt ein eigenes Vertiefungsmodul");
  ok(mod.questions.length === 8, mod.questions.length + " zusätzliche Fragen");

  function n(a) { return C.visibleSteps(Object.assign({}, BASIS, a)).length; }
  var ohne = n({ goal_main: ["bauchfett"] });
  var mit = n({ goal_main: ["gesundheit"] });
  ok(mit - ohne === 8, "Gesundheitsziel ⇒ genau 8 Fragen mehr (" + ohne + " → " + mit + ")");
  ok(C.visibleSteps(Object.assign({}, BASIS, { goal_main: ["muskeln"] })).filter(function (s) { return s.mod.id === "healthdeep"; }).length === 0,
    "wer Muskeln aufbauen will, bekommt keine einzige zusätzliche Frage");

  /* Keine Doppelung: was es schon gab, wurde nicht noch einmal gestellt. */
  var alle = C.allSteps.map(function (s) { return (s.q.title || "").toLowerCase(); });
  /* Wortgrenze, sonst trifft "rauchst du" auch "wie viel Koffein
     brauchst du" — der Test hätte eine Doppelung gemeldet, die es nicht
     gibt. */
  [/\brauchst du\b/, /wie oft trinkst du alkohol/, /wie viele stunden sitzt du/].forEach(function (re) {
    var treffer = alle.filter(function (x) { return re.test(x); }).length;
    ok(treffer === 1, "„" + String(re) + "“ kommt genau einmal vor, nicht doppelt (" + treffer + ")");
  });

  /* Die neuen Fragen zahlen auf bestehende Domains ein. */
  var domains = mod.questions.map(function (q) { return q.dom || q.module; }).filter(Boolean);
  var bekannt = C.domainKeys.concat(["fuel", "recovery", "blood", "strength"]);
  ok(domains.every(function (d) { return bekannt.indexOf(d) >= 0; }), "keine neue Domain: " + domains.join(", "));
  ok(C.domainKeys.length === 12, "es bleiben 12 Kern-Domains");
})();

/* ===================================================================== 3 */
group("3 · Taille statt „Bauchumfang“");
(function () {
  var f = C.questionById("basics_form");
  var waist = f.fields.filter(function (x) { return x.id === "waist"; })[0];
  ok(/Taillenumfang/.test(waist.label), "das Feld heißt Taillenumfang: „" + waist.label + "“");
  ok(/Rippe/.test(f.sub) && /Beckenkamm/.test(f.sub), "der Hilfetext nennt die anatomische Messstelle");
  ok(/NICHT an der dicksten Stelle/.test(f.sub), "und schließt die dickste Stelle ausdrücklich aus");
  ok(/Taillenumfang/.test(C.questionById("body_waisttrend").title), "auch die Verlaufsfrage spricht von der Taille");
})();

/* ===================================================================== 4 */
group("4 · Fehlende Antwortmöglichkeiten");
(function () {
  var t = C.questionById("body_tracking").options;
  var p = t.filter(function (o) { return o.v === "protein"; })[0];
  ok(!!p, "„nur Protein“ ist wählbar: „" + (p ? p.label : "—") + "“");
  ok(p && p.p > 0, "und zählt wie die anderen Einzelmarker (" + (p ? p.p : "?") + " Punkte)");

  var r = C.questionById("exe_restarts").options;
  var nie = r.filter(function (o) { return o.v === "nie_aufgehoert"; })[0];
  ok(!!nie, "„nie aufgehört, aber lasch“ ist wählbar: „" + (nie ? nie.label : "—") + "“");
  var konstant = r.filter(function (o) { return o.v === "konstant"; })[0].p;
  var einszwei = r.filter(function (o) { return o.v === "1to2"; })[0].p;
  var staendig = r.filter(function (o) { return o.v === "staendig"; })[0].p;
  ok(nie && nie.p < konstant && nie.p > staendig,
    "die Bewertung liegt dazwischen: konstant " + konstant + " > lasch " + nie.p + " > ständig " + staendig);
  ok(nie && nie.p < einszwei, "und unter „1–2 Neustarts“ — vorhanden sein ist nicht dasselbe wie dranbleiben");
})();

/* ===================================================================== 5 */
group("5 · Die Verlaufsfrage nennt ihren Bezug");
(function () {
  var q = C.questionById("drv_change");
  ok(/Libido/.test(q.title) && /Erektion/.test(q.title), "Titel: „" + q.title + "“");
  ok(!/^Wie hat sich das entwickelt\?$/.test(q.title), "nicht mehr das bezuglose „Wie hat sich das entwickelt?“");
  ok(/letzten Fragen/.test(q.sub), "der Hilfetext verweist auf die vorangegangenen Fragen");
})();

/* ===================================================================== 6 */
group("6 · Der Sicherheits-Check ist vollständig entfernt");
(function () {
  ok(C.questionById("redflags") === null, "die Symptomabfrage existiert nicht mehr");
  ok(C.modules.filter(function (m) { return m.id === "safety"; }).length === 0, "auch das Kapitel ist weg");
  ok(C.moduleOrder.indexOf("safety") < 0, "und aus der Kapitelreihenfolge ausgetragen");
  ok(!C.moduleIntro.safety, "keine verwaiste Kapitel-Einleitung");
  ok(!/Trifft aktuell einer dieser Punkte/.test(read("js/check-data.js")), "kein Rest im Quelltext");
  ok(!/Blut im Urin/.test(read("js/check-data.js")), "auch die zuvor gestrichene Option ist verschwunden");
  var alle = C.allSteps.map(function (s) { return (s.q.title || ""); }).join(" ");
  ok(!/Brustschmerzen|Ohnmacht/.test(alle), "keine Frage fragt mehr nach Symptomen");

  /* Was NICHT verschwinden durfte: die Hinweise, die sich aus Antworten
     ergeben, die ohnehin gestellt werden. */
  var b = { age: "42", height: "180", weight: "88", waist: "96" };
  ok(C.redFlags(b).length === 0, "ohne Auffälligkeiten gibt es keinen Hinweis");
  ok(C.redFlags(Object.assign({}, b, { rec_snore: "aussetzer", slp_daysleep: "taeglich" })).length >= 1,
    "Atemaussetzer plus Tagesmüdigkeit erzeugen weiterhin einen Hinweis");
  ok(C.redFlags(Object.assign({}, b, { cv_bp_control: "unbehandelt" })).length >= 1,
    "ein unbehandelter Blutdruck ebenso");
  ok(C.redFlags(Object.assign({}, b, { enh_signals: ["atemnot"] })).length >= 1,
    "und ungewohnte Luftnot im Enhanced-Kontext");

  /* Rückwärtskompatibilität: wer vor der Änderung geantwortet hat, verliert
     seine Hinweise nicht. */
  var legacy = C.redFlags(Object.assign({}, b, { redflags: ["brust", "depression"] }));
  ok(legacy.length === 2, "gespeicherte Altantworten werden weiterhin ausgewertet");
  ok(/ärztliche Abklärung/.test(legacy.join(" ")), "mit dem ursprünglichen Wortlaut");
  ok(typeof C.LEGACY_FLAG_TEXT === "object", "die Texte dafür stehen in einer eigenen Tabelle");
  ok(C.redFlags(Object.assign({}, b, { redflags: ["gibtesnicht"] })).length === 0, "unbekannte Altwerte erzeugen nichts");
})();

/* ===================================================================== 7 */
group("7 · Roter Faden: Reihenfolge und Kapitel");
(function () {
  ok(Array.isArray(C.moduleOrder), "die Kapitelreihenfolge steht als ausdrückliche Liste");
  var ist = C.modules.map(function (m) { return m.id; });
  ok(JSON.stringify(ist) === JSON.stringify(C.moduleOrder), "die Module sind danach sortiert");

  /* Der eigentliche Gewinn: keine Bedingung liest mehr eine Antwort, die
     erst später gestellt wird. Genau das war vorher dreimal der Fall. */
  var pos = {};
  var i = 0;
  C.modules.forEach(function (m) {
    m.questions.forEach(function (q) {
      pos[q.id] = ++i;
      (q.fields || []).forEach(function (f) { if (pos[f.id] === undefined) pos[f.id] = i; });
    });
  });
  var vorwaerts = [];
  i = 0;
  C.modules.forEach(function (m) {
    m.questions.forEach(function (q) {
      i++;
      if (typeof q.when !== "function") return;
      var src = q.when.toString(), re = /\ba\.([A-Za-z_][A-Za-z0-9_]*)/g, mm;
      var ids = {};
      while ((mm = re.exec(src))) ids[mm[1]] = true;
      if (/statusOf\(/.test(src)) ids.perf_status = true;
      Object.keys(ids).forEach(function (id) {
        /* pos[id] === undefined heißt: die Antwort stammt aus keiner
           aktuellen Frage (z. B. redflags aus Altbeständen) — das ist kein
           Vorwärtsverweis. */
        if (pos[id] !== undefined && pos[id] > i) vorwaerts.push(q.id + " (Fr. " + i + ") liest " + id + " (Fr. " + pos[id] + ")");
      });
    });
  });
  ok(vorwaerts.length === 0, "keine Bedingung greift auf eine spätere Antwort zu" + (vorwaerts.length ? ": " + vorwaerts.join("; ") : ""));

  /* Die drei Stellen, um die es konkret ging. */
  ok(pos.lab_recency < pos.blood_doctor, "„Wann zuletzt Blut abgenommen?“ kommt vor „Werden Auffälligkeiten eingeordnet?“");
  ok(pos.lab_known < pos.blood_overtest, "die bekannten Werte werden vor der Testfrage erhoben");
  ok(pos.redflags === undefined, "die Warnzeichen-Frage gibt es nicht mehr (ihre Position ist damit gegenstandslos)");

  /* Kapitel-Einleitungen */
  ok(C.moduleIntro && Object.keys(C.moduleIntro).length >= C.modules.length,
    "jedes Kapitel hat einen Einleitungssatz (" + Object.keys(C.moduleIntro || {}).length + ")");
  C.modules.forEach(function (m) {
    if (!C.moduleIntro[m.id]) { failed++; console.error("  ✗ FAIL: Kapitel ohne Einleitung: " + m.id); }
  });
  ok(true, "alle Kapitel-Einleitungen vorhanden");
  var js = read("js/check.js");
  ok(/kapitelStart/.test(js) && /q-chapter-intro/.test(js), "die Einleitung wird beim ersten Schritt eines Kapitels gezeigt");
  ok(/modVorher\.id !== modJetzt\.id/.test(js), "und danach nicht mehr");
})();

/* ===================================================================== 8 */
group("8 · Kein Wegrutschen des Inhalts nach jeder Antwort");
(function () {
  var js = read("js/check.js");
  ok(/korrigiereScroll/.test(js), "nach dem Neurendern wird die Position korrigiert");
  ok(/if \(window\.scrollY > top \+ 1\)/.test(js), "nur nach oben — wer schon oben steht, wird nicht bewegt");
  ok(/requestAnimationFrame\(korrigiereScroll\)/.test(js), "und im Folgeframe noch einmal, gegen die Fokus-Animation des Browsers");
  ok(/data-wizard/.test(js), "im Fragebogen wird weiches Scrollen abgeschaltet");
  var css = read("css/style.css");
  ok(/html\[data-wizard\] \{ scroll-behavior: auto; \}/.test(css), "die zugehörige Regel existiert");
  ok(/#wizBody \{ min-height/.test(css), "die Karte fällt nicht mehr beliebig weit zusammen");
})();

/* ===================================================================== 9 */
group("9 · Seitenrand");
(function () {
  var css = read("css/style.css");
  ok(/\.wizard-wrap \{ width: min\(760px, calc\(100% - 48px\)\)/.test(css), "der Fragebogen hat jetzt eine Randbreite (vorher: keine)");
  ok(/\.result-wrap \{ width: min\(860px, calc\(100% - 48px\)\)/.test(css), "die Ergebnisseite ebenso");
  ok(/\.wizard-wrap, \.result-wrap \{ width: calc\(100% - 32px\); \}/.test(css), "und beide folgen der Mobil-Regel");
  ok(/width: calc\(100% - 28px\)/.test(css), "auf sehr schmalen Geräten 14 px statt vorher 12 px");
  ok(!/\.container, \.container-narrow, \.container-tight \{ width: calc\(100% - 24px\); \}/.test(css),
    "die alte Verkleinerung auf 12 px ist weg — der schmalste Bildschirm hatte den kleinsten Rand");
  ok(/\.option-grid > \.option-card \{ min-width: 0; \}/.test(css), "Rasterkarten wachsen nicht mehr über ihre Spalte hinaus");
  ok(/result-wrap/.test(read("js/check.js")), "das Ergebnis-HTML wird in den Wrapper geschrieben");
})();

/* ==================================================================== 10 */
group("10 · Mahlzeiten: kein Restaurant, echte Varianz");
(function () {
  global.MM = { store: { get: function (k, d) { return d; }, set: function () {} }, track: function () {} };
  delete require.cache[require.resolve(path.join(ROOT, "js/os/engines.js"))];
  require(path.join(ROOT, "js/os/engines.js"));
  var E = global.window.MM.engines;

  ok(E.MEALS.length >= 60, E.MEALS.length + " Mahlzeiten (vorher 33)");
  ok(E.MEALS.filter(function (m) { return m.tags.indexOf("restaurant") >= 0; }).length === 0, "kein Restaurant-/Imbiss-Eintrag mehr");
  ok(!/rest_grill|rest_bowl|rest_doener/.test(read("js/os/engines.js")), "auch nicht als toter Rest im Quelltext");
  var slots = {};
  E.MEALS.forEach(function (m) { slots[m.slot] = (slots[m.slot] || 0) + 1; });
  ok(slots.breakfast >= 14 && slots.main >= 30 && slots.snack >= 15,
    "Auswahl in allen drei Kategorien: " + JSON.stringify(slots));

  /* Nährwerte müssen zu den Makros passen — sonst rechnet die App falsch. */
  var schief = E.MEALS.filter(function (m) {
    var calc = 4 * m.p + 4 * m.c + 9 * m.f;
    return Math.abs(calc - m.kcal) / m.kcal > 0.10;
  });
  ok(schief.length === 0, "alle Nährwerte plausibel" + (schief.length ? ": " + schief.map(function (m) { return m.id; }).join(", ") : ""));
  var ohneZutaten = E.MEALS.filter(function (m) { return !m.ing || !m.ing.length; });
  ok(ohneZutaten.length === 0, "jede Mahlzeit hat Zutaten für die Einkaufsliste");

  /* Rotation: über die Tage verschieden, innerhalb eines Tages stabil. */
  var ziel = { protein: 180, kcal: 2400 };
  var tage = [];
  for (var d = 0; d < 7; d++) tage.push(E.exampleDay(ziel, { maxCookMin: 40, seed: 20260101 + d }).meals.map(function (m) { return m.id; }).join("|"));
  ok(new Set(tage).size === 7, "sieben Tage ergeben sieben verschiedene Pläne (vorher: siebenmal derselbe)");
  var gerichte = new Set(tage.join("|").split("|"));
  ok(gerichte.size >= 20, gerichte.size + " verschiedene Gerichte in einer Woche (vorher 4)");
  var a1 = E.exampleDay(ziel, { seed: 7 }).meals.map(function (m) { return m.id; }).join("|");
  var a2 = E.exampleDay(ziel, { seed: 7 }).meals.map(function (m) { return m.id; }).join("|");
  ok(a1 === a2, "derselbe Tag liefert denselben Plan — kein Zufall beim Neuladen");

  /* Der Tausch muss den Wunsch wirklich erfüllen. */
  var cur = E.mealById("haehnchen_reis");
  var schneller = E.swapMeal("haehnchen_reis", "faster", []);
  var billiger = E.swapMeal("haehnchen_reis", "cheaper", []);
  var protein = E.swapMeal("haehnchen_reis", "protein", []);
  ok(schneller && schneller.min < cur.min, "„schneller“ liefert wirklich etwas Schnelleres (" + schneller.min + " < " + cur.min + " min)");
  ok(billiger && billiger.cost <= cur.cost, "„billiger“ liefert nichts Teureres");
  ok(protein && (protein.p / protein.kcal) > (cur.p / cur.kcal), "„mehr Protein“ liefert höhere Proteindichte");

  /* Schnellerfassung: tageszeitabhängig statt immer dieselben Frühstücke. */
  var app = read("js/os/app.js");
  ok(/function quickLogMeals\(\)/.test(app), "die Schnellerfassung wählt gezielt aus");
  ok(/h < 10 \? "breakfast"/.test(app), "abhängig von der Tageszeit");
  ok(!/\.slice\(0, 6\)\.map\(function \(m\) \{ return '<button class="os-chip"/.test(app), "nicht mehr die ersten sechs des Rohdaten-Arrays");
  ok(/function kurzName\(name\)/.test(app), "und der Name wird sinnvoll gekürzt");
  ok(!/esc\(m\.name\.split\(" "\)\[0\]\)/.test(app), "nicht mehr am ersten Leerzeichen abgeschnitten („Körniger“)");

  /* dinner.html */
  var din = read("js/dinner.js");
  ok(!/c: "liefern"/.test(din) && !/c: "auswaerts"/.test(din), "keine Liefer-/Auswärts-Gerichte mehr");
  ok(/id: "schnell"/.test(din) && /id: "ofen"/.test(din), "stattdessen nach Aufwand gegliedert");
  var anzahl = (din.match(/\{ c: "(schnell|kochen|ofen)"/g) || []).length;
  ok(anzahl >= 24, anzahl + " Abendvorschläge (vorher 6 zum Kochen)");
  ok(/passend\.slice\(start\)/.test(din), "auch hier rotiert die Reihenfolge über den Tag");

  /* Der Restaurant-Kontext im OS ist weg. */
  var ex = read("js/os/execution.js");
  ok(!/restaurant: "RESTAURANT"/.test(ex), "„Restaurant“ ist keine Auswahl mehr");
  ok(!/Protein zuerst bestellen/.test(ex), "auch die Bestell-Strategietexte sind entfernt");
  ok(/where === "travel"/.test(ex), "„unterwegs“ bleibt — mit mitnehmbaren eigenen Mahlzeiten");

  /* Die Nachschlage-Datenbank behält ihre Einträge: wer auswärts gegessen
     hat, muss das ehrlich protokollieren können. */
  var fdb = read("js/food-db.js");
  ok(/"Auswärts"/.test(fdb), "die Lebensmittel-Suche kennt weiterhin Auswärts-Gerichte");
  ok(/nicht als Vorschlag|keine Empfehlungsliste/.test(fdb), "mit Begründung im Quelltext, warum sie bleiben");
})();

/* ==================================================================== 11 */
group("11 · Kein Verweis führt in ein geschlossenes Kapitel");
(function () {
  var ZU = ["blueprint", "taeglich-trainieren", "schlaf-energie", "blutwerte-guide",
    "testosteron", "glp1-agonisten", "supplements", "sexuelle-gesundheit",
    "11-injektionen", "gewohnheiten"];

  /* Die erste Fassung dieser Prüfung sah nur in drei bekannte Tabellen und
     übersah deshalb C.CHAPTERS.hormones — der Link ging live und wurde erst
     beim Abgleich mit der ausgelieferten Datei auffällig. Jetzt wird der
     gesamte Quelltext nach href-Zielen durchsucht; eine neue Tabelle kann
     sich nicht mehr daran vorbeischmuggeln. */
  var src = read("js/check-data.js");
  var offen = [];
  ZU.forEach(function (z) {
    var re = new RegExp('href: "ebooks/' + z + '\\.html"', "g");
    var m = src.match(re);
    if (m) offen.push(z + " (" + m.length + "x)");
  });
  ok(offen.length === 0, "keine Score-Verlinkung zeigt auf ein geschlossenes Kapitel" + (offen.length ? ": " + offen.join(", ") : ""));

  /* Und jedes tatsächlich verlinkte Ziel muss existieren. */
  var ziele = (src.match(/href: "(?:ebooks\/)?[a-z0-9-]+\.html"/g) || [])
    .map(function (x) { return x.slice(7, -1); });
  var fehlend = ziele.filter(function (h) { return !fs.existsSync(path.join(ROOT, h)); });
  ok(ziele.length > 0 && fehlend.length === 0,
    ziele.length + " Verlinkungsziele, alle vorhanden" + (fehlend.length ? " — fehlt: " + fehlend.join(", ") : ""));

  /* Bibliothek, Sitemap und Verkaufsseite dürfen sie ebenfalls nicht mehr
     als frei führen. ebooks.html ist inzwischen das Inhaltsverzeichnis des
     Produkts — es DARF die Kapitelseiten verlinken (die zeigen vorab, was
     drinsteht), aber es darf sie nicht als kostenlos ausgeben und kein
     E-Mail-Gate mehr davorsetzen. */
  var lib = read("ebooks.html"), sm = read("sitemap.xml");
  ZU.forEach(function (z) {
    ok(sm.indexOf("ebooks/" + z + ".html") < 0, "sitemap.xml führt " + z + " nicht mehr");
  });
  ok(!/data-ebook-read|unlockBoxForm|data-read=/.test(lib), "ebooks.html hat kein E-Mail-Gate mehr");
  ok(/99 €/.test(lib) && /INHALTSVERZEICHNIS/.test(lib), "ebooks.html ist als Inhaltsverzeichnis mit Preis ausgewiesen");
  ok(!/Kostenlose Ebooks|kostenlos freischalten|Lesen ohne Anmeldung/.test(lib), "ebooks.html verspricht keine kostenlosen Ebooks mehr");
  var ebJs = read("js/ebooks.js");
  ok(/b\.gated \?/.test(ebJs) && !/MM\.unlock/.test(ebJs), "die Bibliotheks-Kachel kennzeichnet bezahlte Kapitel und gated nichts per E-Mail");
  ok(!fs.existsSync(path.join(ROOT, "js/landing.js")), "das Lead-Skript der Gratis-Landingpages ist entfernt");
  ok(read("protokoll.html").indexOf("FREI LESEN") < 0, "die Verkaufsseite bewirbt kein Kapitel mehr als frei");
  ok((read("protokoll.html").match(/IM PROTOKOLL/g) || []).length === 11, "alle elf Einträge sind als Produktbestandteil gekennzeichnet");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
