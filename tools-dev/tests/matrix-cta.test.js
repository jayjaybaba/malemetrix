/* ==========================================================================
   MALEMETRIX — ÜBERGANG SCORE → ANABOLE MATRIX
   Prüft die Sichtbarkeitsentscheidung, die Vorbelegung und — genauso wichtig
   — dass die Score-Engine davon unberührt bleibt. Der CTA ist eine
   Darstellung, keine zweite Bewertung.
   Ausführen:  node tools-dev/tests/matrix-cta.test.js
   ========================================================================== */
"use strict";
var fs = require("node:fs");
var path = require("node:path");
var ROOT = path.resolve(__dirname, "../..");
function read(p) { return fs.readFileSync(path.join(ROOT, p), "utf8"); }
var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

global.window = global.window || {};
require(path.join(ROOT, "js/check-data.js"));
var C = global.window.MM_CHECK;
require(path.join(ROOT, "js/matrix-cta.js"));
var M = global.window.MM_MATRIX_CTA;

var CHECK_JS = read("js/check.js");
var CHECK_HTML = read("check.html");
var MATRIX_JS = read("js/anabole-matrix.js");
var MATRIX_HTML = read("anabole-matrix.html");

/* Ergebnis-Attrappe in der Form, die js/check.js tatsächlich speichert. */
function ergebnis(primary, secondary, answers, weakest) {
  return {
    total: 61, scores: {}, v: 2,
    /* `weakest` führt js/check.js als die drei schwächsten Säulen mit —
       Sekundärprioritäten zählen nur, wenn sie dort auch auftauchen. */
    weakest: weakest || ["strength", "fuel", "recovery"],
    bottleneck: { domain: primary, key: "training", name: "X", text: "" },
    primaryBottleneck: { domain: primary, value: 40, secondary: secondary || [] },
    secondaryPriorities: secondary || [],
    answers: answers || {}
  };
}
function sek(list) { return list.map(function (p) { return { domain: p[0], name: p[0], value: p[1] }; }); }

/* ===== 1) Kontexte aus strukturierten Domain-IDs ===== */
group("Kontext · nur stabile Domain-IDs, keine Textsuche");
(function () {
  ok(M.context(ergebnis("training", [])) === "training", "Trainings-Engpass → Kontext training");
  ok(M.context(ergebnis("nutrition", [])) === "nutrition", "Ernährungs-Engpass → Kontext nutrition");
  ok(M.context(ergebnis("sleep", [])) === "recovery", "Schlaf-Engpass → Kontext recovery");
  ok(M.context(ergebnis("recovery", [])) === "recovery", "Erholungs-Engpass → Kontext recovery");

  /* Nicht zugeordnete Domains dürfen nichts auslösen. */
  ["cardiovascular", "hormonal", "dataQuality", "execution", "metabolic",
   "bodyComposition", "movement", "energy", "enhancedControl"].forEach(function (d) {
    ok(M.context(ergebnis(d, [])) === null, d + " als Engpass → kein CTA");
  });

  /* Jede benutzte Domain-ID muss es in der Engine wirklich geben. */
  var bekannt = C.domainKeys.concat(["enhancedControl", "therapyControl", "recoveryStatus"]);
  var erfunden = Object.keys(M.DOMAIN_CONTEXT).filter(function (d) { return bekannt.indexOf(d) < 0; });
  ok(erfunden.length === 0, "keine erfundene Domain-ID" + (erfunden.length ? " (" + erfunden.join(", ") + ")" : ""));

  /* Der Textinhalt darf nie das Signal sein. */
  var nurText = ergebnis("execution", []);
  nurText.bottleneck.name = "Training & Fitness";
  nurText.bottleneck.text = "Dein Training und deine Ernährung und dein Schlaf";
  ok(M.context(nurText) === null, "passender Fließtext ohne strukturelle Zuordnung → kein CTA");
})();

/* ===== 2) Priorisierung: bestehende Reihenfolge, keine neue Rangfolge ===== */
group("Priorisierung · Engine-Reihenfolge schlägt alles");
(function () {
  /* Primärer Engpass gewinnt, auch wenn Sekundäre passen. */
  var r = ergebnis("training", sek([["nutrition", 30], ["sleep", 31]]));
  ok(M.context(r) === "training", "primärer Engpass hat Vorrang vor Sekundärprioritäten");

  /* Primär nicht zugeordnet → erste passende Sekundärpriorität in
     Engine-Reihenfolge. */
  var r2 = ergebnis("dataQuality", sek([["nutrition", 30], ["training", 44]]), {}, ["fuel", "strength", "body"]);
  ok(M.context(r2) === "nutrition", "sonst die erste passende Sekundärpriorität der Engine");

  /* Nicht zugeordnete Sekundäre werden übersprungen, nicht gewertet. */
  var r3 = ergebnis("dataQuality", sek([["cardiovascular", 20], ["sleep", 35]]), {}, ["recovery", "blood", "body"]);
  ok(M.context(r3) === "recovery", "nicht zugeordnete Sekundäre werden übersprungen");

  /* Echter Gleichstand über verschiedene Kontexte → neutrale Gesamtfassung. */
  var r4 = ergebnis("dataQuality", sek([["training", 33], ["nutrition", 33]]), {}, ["strength", "fuel", "body"]);
  ok(M.context(r4) === "multiple", "Gleichstand über zwei Kontexte → multiple");
  var r5 = ergebnis("dataQuality", sek([["sleep", 33], ["recovery", 33]]), {}, ["recovery", "body", "blood"]);
  ok(M.context(r5) === "recovery", "Gleichstand INNERHALB eines Kontexts bleibt dieser Kontext");

  /* Kein Gleichstand → klarer Spitzenreiter, kein multiple. */
  var r6 = ergebnis("dataQuality", sek([["training", 30], ["nutrition", 31]]), {}, ["strength", "fuel", "body"]);
  ok(M.context(r6) === "training", "unterschiedliche Werte → klarer Spitzenreiter");

  ok(M.CONTEXT_ORDER.join(",") === "training,nutrition,recovery", "die dokumentierte Tie-Breaker-Ordnung liegt fest");
})();

/* ===== 2b) Sekundäre nur, wenn sie auch schwach sind ===== */
group("Sekundäre · nur belegte Schwäche zählt");
(function () {
  /* Der Fall, der das aufgedeckt hat: primär `movement` (nicht zugeordnet),
     sekundär nutrition=96 und training=97 — beide bestens. Ohne diese
     Bedingung würde die Seite „Verbesserungspotenzial" behaupten, wo keins
     ist. */
  var gut = ergebnis("movement", sek([["nutrition", 96], ["training", 97]]), {}, ["body", "blood", "drive"]);
  ok(M.context(gut) === null, "starke Sekundärbereiche lösen keinen CTA aus");

  var schwach = ergebnis("movement", sek([["nutrition", 31]]), {}, ["fuel", "body", "blood"]);
  ok(M.context(schwach) === "nutrition", "eine schwache Sekundärpriorität zählt");

  var ohneListe = ergebnis("movement", sek([["nutrition", 31]]), {}, null);
  ohneListe.weakest = undefined;
  ok(M.context(ohneListe) === null, "ohne die Schwächeliste wird nichts behauptet");

  /* Der Ausschnitt der Säulen-Zuordnung muss zur Engine passen. */
  var falsch = Object.keys(M.DOMAIN_CONTEXT).filter(function (d) {
    return C.LEGACY_DOMAIN_KEY[d] !== ({ training: "strength", nutrition: "fuel", sleep: "recovery", recovery: "recovery" })[d];
  });
  ok(falsch.length === 0, "die Säulen-Zuordnung stimmt mit C.LEGACY_DOMAIN_KEY überein");
})();

/* ===== 3) Kein CTA bei fehlenden oder kaputten Daten ===== */
group("Sicherheit · im Zweifel kein CTA");
(function () {
  [null, undefined, 0, "", "training", [], NaN, true].forEach(function (bad) {
    var r;
    try { r = M.context(bad); } catch (e) { r = "EXCEPTION: " + e.message; }
    ok(r === null, "unbrauchbare Eingabe " + JSON.stringify(bad) + " → null ohne Ausnahme");
  });

  var kaputt = [
    {},
    { primaryBottleneck: null, secondaryPriorities: null },
    { primaryBottleneck: { domain: 42 }, secondaryPriorities: "training" },
    { bottleneck: {}, secondaryPriorities: [null, undefined, 7] },
    { secondaryPriorities: [{ domain: "training" }] }   // ohne value → kein Gleichstand
  ];
  kaputt.forEach(function (k, i) {
    var r;
    try { r = M.context(k); } catch (e) { r = "EXCEPTION: " + e.message; }
    ok(r === null || ["training", "nutrition", "recovery", "multiple"].indexOf(r) >= 0,
      "beschädigte Struktur #" + i + " wirft nicht (Ergebnis: " + r + ")");
  });
  ok(M.context({}) === null, "leeres Ergebnisobjekt → kein CTA");
  ok(M.context({ weakest: ["blood"], secondaryPriorities: [{ domain: "cardiovascular", value: 10 }] }) === null,
    "nur unpassende Sekundäre → kein CTA");
})();

/* ===== 4) Vorbelegung: gemessen, nicht angenommen ===== */
group("Vorbelegung · tatsächlich verwertbar, eine einzige Abbildung");
(function () {
  ok(M.prefillAvailable(null, null) === false, "ohne Daten keine Vorbelegung");
  ok(M.prefillAvailable({}, {}) === false, "leere Objekte ergeben keine Vorbelegung");
  ok(M.prefillAvailable(null, { irgendwas: "x" }) === false,
    "die bloße Existenz von check_draft genügt nicht");

  var mitDaten = { rec_duration: "7to8" };
  ok(M.prefillAvailable(null, mitDaten) === true, "eine verwertbare Antwort genügt");
  ok(M.prefillFrom(mitDaten).H08 === 2, "… und wird korrekt auf den Hebel abgebildet");

  /* Nach abgeschlossenem Score liegt der Entwurf nicht mehr vor —
     check.js löscht ihn. Die Antworten stehen in check_result.answers. */
  ok(/MM\.store\.remove\("check_draft"\)/.test(CHECK_JS),
    "Beleg: check.js löscht check_draft beim Abschluss");
  var res = ergebnis("training", [], { rec_duration: "lt5", fuel_protein: "tracke" });
  ok(M.prefillAvailable(res, null) === true, "Vorbelegung funktioniert aus check_result.answers");
  ok(M.scoreAntworten(res, { rec_duration: "gt8" }).rec_duration === "lt5",
    "das abgeschlossene Ergebnis hat Vorrang vor einem Alt-Entwurf");

  /* Alle Zielschlüssel müssen echte Hebel der Matrix sein. */
  global.globalThis.MM_ANABOLIC = undefined;
  require(path.join(ROOT, "js/anabole-matrix-data.js"));
  var D = global.window.MM_ANABOLIC || globalThis.MM_ANABOLIC;
  var hebelIds = D.hebel.map(function (h) { return h.id; });
  var alleKeys = Object.keys(M.prefillFrom({
    str_exercises: ["kniebeuge"], str_plan: "progression", fuel_protein: "tracke",
    fuel_calories: "gut", rec_duration: "gt8", fuel_alcohol: "nie", waist: 90, height: 180
  }));
  var fremd = alleKeys.filter(function (k) { return hebelIds.indexOf(k) < 0; });
  ok(fremd.length === 0, "jede Vorbelegung zeigt auf einen echten Hebel" + (fremd.length ? " (" + fremd.join(", ") + ")" : ""));
  ok(alleKeys.length === 7, "der Score deckt sieben der vierzehn Hebel ab (" + alleKeys.length + ")");
  ok(M.HEBEL_GESAMT === D.fragen.length, "die Hebelzahl stimmt mit dem Selbstcheck überein");

  /* Die Abbildung existiert genau einmal im Projekt. */
  ok(!/fuel_protein/.test(MATRIX_JS), "die Matrix-Darstellung führt keine zweite Abbildung");
  ok(/MM_MATRIX_CTA/.test(MATRIX_JS), "sie nutzt die gemeinsame Abbildung");
})();

/* ===== 5) Zustand des Selbstchecks ===== */
group("Zustand · abgeschlossener Selbstcheck wird leiser, nicht entfernt");
(function () {
  var voll = {};
  for (var i = 1; i <= 14; i++) voll["H" + String(i).padStart(2, "0")] = 2;

  var offen = M.decide(ergebnis("training", []), null, {});
  ok(offen.variant === "card", "ohne abgeschlossenen Selbstcheck: normale Vertiefungskarte");

  var fertig = M.decide(ergebnis("training", []), null, voll);
  ok(fertig.variant === "quiet", "nach Abschluss: leiser Wiedereinstieg statt zweiter Hauptempfehlung");
  ok(fertig.context === "training", "der Kontext bleibt trotzdem bestimmt");

  var teil = M.decide(ergebnis("training", []), null, { H01: 2, H02: 1 });
  ok(teil.variant === "card", "ein angefangener Selbstcheck gilt nicht als abgeschlossen");

  ok(M.checkState(null).vollstaendig === false && M.checkState(null).beantwortet === 0,
    "fehlender Zustand wird sicher behandelt");
  ok(M.checkState({ H01: "zwei", H02: 5, H03: 1 }).beantwortet === 1,
    "unbrauchbare Werte zählen nicht als beantwortet");

  ok(M.decide(ergebnis("execution", []), null, {}).variant === null,
    "ohne Kontext gibt es auch keine Variante");
  ok(/anabolic_check/.test(CHECK_JS), "der bestehende Speicher des Selbstchecks wird gelesen");
  ok(!/matrix_check_completed/.test(CHECK_JS + MATRIX_JS + read("js/matrix-cta.js")),
    "kein zusätzlicher Statusschlüssel wurde eingeführt");
})();

/* ===== 6) Reinheit: keine Seiteneffekte, keine Score-Veränderung ===== */
group("Reinheit · liest, verändert nichts");
(function () {
  var answers = { rec_duration: "7to8", fuel_protein: "tracke", str_plan: "progression" };
  var r = ergebnis("training", sek([["nutrition", 30]]), answers);
  var vorher = JSON.stringify(r);
  M.context(r); M.prefillAvailable(r, null); M.decide(r, null, {}); M.prefillFrom(answers);
  ok(JSON.stringify(r) === vorher, "das Ergebnisobjekt bleibt unverändert");

  var draft = { rec_duration: "7to8" };
  var draftVorher = JSON.stringify(draft);
  M.prefillFrom(draft); M.prefillAvailable(null, draft); M.decide(null, draft, {});
  ok(JSON.stringify(draft) === draftVorher, "check_draft wird nicht verändert");

  var a = M.prefillFrom(answers), b = M.prefillFrom(answers);
  ok(JSON.stringify(a) === JSON.stringify(b), "deterministisch bei gleicher Eingabe");
  ok(a !== b, "und liefert jedes Mal ein neues Objekt statt einer geteilten Referenz");

  var quelle = read("js/matrix-cta.js");
  ok(!/MM\.store\.set|localStorage\.setItem/.test(quelle), "die Entscheidungsschicht schreibt nirgends");
  ok(!/Math\.random|Date\.now/.test(quelle), "und ist frei von nichtdeterministischen Quellen");
})();

/* ===== 7) Regression: die Engine bleibt Bit für Bit dieselbe ===== */
group("Regression · Score, Reihenfolge und Engpass unverändert");
(function () {
  /* Die Engine wird mit und ohne geladene CTA-Schicht gefahren. Das Ergebnis
     muss identisch sein — der CTA ist eine Darstellung, keine Bewertung. */
  var faelle = [
    { goal_main: ["muskeln"], age: 38, height: 180, weight: 92, waist: 98, job: "sitzend", kids: "nein", steps: "5000to7500", history: "1to3", str_freq: "3", str_plan: "progression", str_log: "app", fuel_protein: "120to160", rec_duration: "7to8" },
    { goal_main: ["energie"], age: 45, height: 175, weight: 88, waist: 104, job: "stehend", kids: "ja", steps: "lt5000", history: "keine", str_freq: "0", fuel_protein: "lt80", rec_duration: "lt5", rec_stress: 8 },
    { goal_main: ["bauchfett", "kraft"], age: 29, height: 186, weight: 101, waist: 96, job: "koerperlich", kids: "nein", steps: "gt10000", history: "gt3", str_freq: "4plus", str_plan: "spontan", fuel_protein: "keine_ahnung", rec_duration: "6to7" }
  ];
  faelle.forEach(function (a, i) {
    var e1 = C.evaluate(a);
    M.decide({ primaryBottleneck: e1.primaryBottleneck, secondaryPriorities: e1.secondaryPriorities, answers: a }, null, {});
    var e2 = C.evaluate(a);
    ok(e1.total === e2.total, "Fall " + i + ": Gesamtscore unverändert (" + e1.total + ")");
    ok(JSON.stringify(e1.domains) === JSON.stringify(e2.domains), "Fall " + i + ": Domain-Scores unverändert");
    ok(e1.primaryBottleneck.domain === e2.primaryBottleneck.domain, "Fall " + i + ": primärer Engpass unverändert");
    ok(JSON.stringify(e1.secondaryPriorities) === JSON.stringify(e2.secondaryPriorities), "Fall " + i + ": Ergebnisreihenfolge unverändert");
    ok(JSON.stringify(e1.scores) === JSON.stringify(e2.scores), "Fall " + i + ": Profilsäulen unverändert");
    ok(e1.goalRecommendation.mode === e2.goalRecommendation.mode, "Fall " + i + ": Kontextmodus unverändert");
  });

  /* Die Engine-Datei kennt den CTA nicht — und darf ihn nie kennen. */
  var ENGINE = read("js/check-data.js");
  ok(!/MATRIX_CTA|anabole-matrix|matrixCta/i.test(ENGINE),
    "js/check-data.js weiß nichts von der Matrix (keine Rückkopplung in die Engine)");
})();

/* ===== 8) Einbindung in die Ergebnisseite ===== */
group("Ergebnisseite · genau ein CTA, an der richtigen Stelle");
(function () {
  ok(/matrix-cta\.js/.test(CHECK_HTML), "check.html lädt die Entscheidungsschicht");
  var iCta = CHECK_HTML.indexOf("js/matrix-cta.js"), iCheck = CHECK_HTML.indexOf("js/check.js");
  ok(iCta > -1 && iCta < iCheck, "… vor js/check.js");

  ok((CHECK_JS.match(/id="matrixCtaLink"/g) || []).length === 2,
    "genau zwei Auszeichnungen des Links — Karte ODER leiser Hinweis, nie beide");
  ok(/if \(d\.variant === "quiet"\)[\s\S]{0,400}return;/.test(CHECK_JS),
    "die leise Variante kehrt zurück, bevor die Karte gebaut wird");

  /* Ziel exakt wie gefordert. */
  ok(M.COPY.ziel === "anabole-matrix.html#abgleich", "Buttonziel ist exakt anabole-matrix.html#abgleich");
  ok(/id="abgleich"/.test(MATRIX_HTML), "das Sprungziel existiert auf der Matrixseite");
  ok(/\.am-sec\[id\][^}]*scroll-margin-top/.test(MATRIX_HTML),
    "der Anker springt nicht hinter den festen Kopf");

  /* Platzierung: nach dem einen Auftrag, vor dem nächsten Score. */
  var iAuftrag = CHECK_JS.indexOf("DER EINE AUFTRAG");
  var iMatrix = CHECK_JS.indexOf("VERTIEFUNG: ANABOLE MATRIX");
  var iNaechster = CHECK_JS.indexOf("DEIN NÄCHSTER SCORE");
  var iHero = CHECK_JS.indexOf("1. HERO");
  ok(iHero < iAuftrag && iAuftrag < iMatrix && iMatrix < iNaechster,
    "Reihenfolge: Ergebnis → Auftrag → Matrix-Vertiefung → nächster Score");

  /* Kompakt: bestehende Komponenten, kein eigener Ergebnisblock. */
  var block = CHECK_JS.slice(iMatrix, iNaechster);
  ok(/class="card dash-block"/.test(block), "nutzt die vorhandene kompakte Kartenkomponente");
  ok(/class="card-num"/.test(block) && /btn btn-primary btn-sm/.test(block),
    "nutzt vorhandene Kicker- und Button-Klassen");
  ok(!/<h1/.test(block), "keine konkurrierende Hauptüberschrift");
  ok(/<h2 style="margin:2px 0 6px;font-size:1rem"/.test(block),
    "die Überschrift ist eine h2 unter der h1 des Scores (S15) und bleibt klein");
  ok(/aria-label=/.test(block), "der Link trägt einen verständlichen Namen");
  ok((block.match(/href="' \+ esc\(M\.COPY\.ziel\)/g) || []).length === 2,
    "beide Varianten zeigen auf dasselbe Ziel");

  /* Die Darstellung darf nichts berechnen oder speichern. */
  ok(!/MM\.store\.set/.test(block), "der CTA-Block speichert nichts");
  ok(!/r\.(total|scores|domains|bottleneck)\s*=/.test(block), "und verändert keine Ergebniswerte");
})();

/* ===== 9) Analytics: bestehende Konventionen, keine Doppelzählung ===== */
group("Analytics · vorhandene Konvention, einmal pro Anzeige");
(function () {
  var i = CHECK_JS.indexOf("Matrix-Übergang: Ereignisse");
  ok(i > -1, "der Ereignisblock existiert");
  var block = CHECK_JS.slice(i, i + 1400);

  ok(/MM\.track\(/.test(block), "nutzt das bestehende MM.track statt einer neuen Bibliothek");
  ok(/cta_matrix_view/.test(block) && /cta_matrix_click/.test(block),
    "Sichtbarkeits- und Klick-Ereignis nach bestehender cta_-Konvention");
  ok(/source: "score_result"/.test(block), "source folgt der bestehenden Konvention (leadmagnet_signup)");
  ok(/leadmagnet_signup", \{ source: "score_result"/.test(CHECK_JS), "… die es im Bestand wirklich gibt");
  ok(/trigger_domain: matrixCta\.context/.test(block), "das Klick-Ereignis trägt den Kontext");
  ok(/prefill_available/.test(block), "und die Information zur Vorbelegung");

  /* Keine Score- oder Gesundheitswerte in den Eigenschaften. */
  ok(!/total|scores|answers|waist|weight/.test(block.split("const props")[1].split("}")[0]),
    "keine Score- oder Gesundheitswerte in den Eigenschaften");

  /* Einmal pro Anzeige: kein data-track auf dem Link (das würde über die
     Delegation in analytics.js zusätzlich feuern), Klick nur einmal. */
  var ctaBlock = CHECK_JS.slice(CHECK_JS.indexOf("VERTIEFUNG: ANABOLE MATRIX"), CHECK_JS.indexOf("DEIN NÄCHSTER SCORE"));
  ok(!/data-track/.test(ctaBlock), "kein data-track auf dem CTA — sonst zählt der Klick doppelt");
  ok(/\{ once: true \}/.test(block), "der Klick-Listener feuert höchstens einmal");
  ok((block.match(/MM\.track\(matrixCta\.variant/g) || []).length === 1,
    "genau ein Sichtbarkeits-Ereignis je Rendern");
  ok(/if \(!matrixCta \|\| !matrixCta\.context\) return;/.test(block),
    "ohne CTA wird auch nichts getrackt");
})();

/* ===== 10) Sprachgrenze ===== */
group("Sprache · Einordnung, keine Messung");
(function () {
  var text = JSON.stringify(M.COPY);
  [/\baktiviert\b/i, /\bgetriggert\b/i, /\bgemessen\b/i, /Signalwege messen/i,
   /mTOR testen/i, /biologisch nachweisen/i, /berechnen/i].forEach(function (re) {
    ok(!re.test(text), "die Copy behauptet keine Messung (" + re.source + ")");
  });
  ok(/adressiert/.test(text), "sie spricht von adressieren");
  ok(/wahrscheinlich/.test(text), "und bleibt bei wahrscheinlich statt sicher");
  ["training", "nutrition", "recovery", "multiple"].forEach(function (k) {
    ok(typeof M.COPY.text[k] === "string" && M.COPY.text[k].length > 40, "Copy für " + k + " vorhanden");
  });
  ok(M.COPY.kicker === "Vertiefung · Muskelaufbau", "Kicker wie vorgegeben");
})();

console.log("\n" + "-".repeat(52));
console.log(passed + " bestanden, " + failed + " fehlgeschlagen.");
process.exit(failed ? 1 : 0);
