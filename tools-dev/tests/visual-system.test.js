/* ==========================================================================
   MALEMETRIX VS2 — VISUAL SYSTEM 2.0: statische Design-System-Invarianten
   Sichert: zentrale Tokens (Farbe = Bedeutung), Instrument- statt Karten-
   Sprache im Cockpit, diagnostische Systemklassen, Access-Moment, Motion
   mit reduced-motion-Guard, keine Emoji-UI in Systemkomponenten.
   Ausführen:  node tools-dev/tests/visual-system.test.js
   ========================================================================== */
"use strict";
var fs = require("node:fs");
var path = require("node:path");
var ROOT = path.resolve(__dirname, "../..");
function read(p) { return fs.readFileSync(path.join(ROOT, p), "utf8"); }
var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

var style = read("css/style.css");
var os = read("css/os.css");
var checkout = read("js/checkout.js");
var vs2 = style.split("VISUAL SYSTEM 2.0")[1] || "";

group("Tokens · COLOR HAS MEANING (semantische Ebene, zentral)");
ok(vs2.length > 0, "VS2-Block existiert zentral in css/style.css");
["--status-active", "--status-improving", "--status-attention", "--status-flag", "--status-neutral"].forEach(function (t) {
  ok(vs2.indexOf(t + ":") >= 0, "Token " + t + " definiert");
});
ok(/--status-active:\s*var\(--accent-2\)/.test(vs2), "Cyan = Brand/Aktiv (kein neuer Farbwert, Alias auf Bestand)");
ok(/--hairline/.test(vs2) && /--surface/.test(vs2), "Flächen-/Hairline-Tokens für 'less cards, more structure'");

group("Data as Design · Instrumente statt Mini-Boxen");
ok(/\.mm-metric \{/.test(vs2) && /clamp\(1\.6rem/.test(vs2), "mm-metric: große Werte als Layout-Hauptelement");
ok(/tabular-nums/.test(vs2), "tabellarische Ziffern (Messwert-Typografie)");
ok(/\.mm-secthead/.test(vs2) && /letter-spacing:\s*0\.18em/.test(vs2), "Mono-Sektionsheader (MM / SCORE-Sprache)");
// Cockpit-Statuszeile: keine Box-Optik mehr, Hairline-Trenner
var strip = os.split("Cockpit-Instrumente")[1] || "";
ok(strip.length > 0, "Cockpit-Statuszeile ist auf Instrument-Sprache umgestellt");
ok(!/border-radius:\s*12px/.test(strip.split(".os-stat b")[0]), "keine Karten-Boxen mehr in der Statuszeile");
ok(/border-left: 1px solid var\(--hairline/.test(strip), "Hairline-Trenner statt Card-Grid");
ok(/@media \(max-width: 560px\)/.test(strip), "Mobile: eigene 2-Spalten-Hierarchie statt gestapeltem Desktop");

group("Diagnostic System Language · BODY/ENGINE/RECOVERY/…");
ok(/\.mm-sys .row\.is-primary/.test(vs2) || /\.mm-sys \.row\.is-primary/.test(vs2), "Primary Bottleneck hat EINE klare Hervorhebung");
ok(/PRIMARY/.test(vs2), "PRIMARY-Markierung in Mono-Mikrotypo");
ok(/is-flag/.test(vs2), "Medical-Flag-Zustand nutzt Rot (Status, nicht Deko)");

group("Premium Access Moment · Kauf = Upgrade");
ok(/\.mm-access/.test(vs2) && /mm-unlock/.test(vs2), "ACCESS-GRANTED-Komponente mit Unlock-Animation");
ok(/ACCESS GRANTED/.test(checkout), "Checkout-Erfolg nutzt den Access-Moment");
ok(/ASSIGNED TO YOUR ACCOUNT/.test(checkout), "ASSIGNED TO YOUR ACCOUNT vorhanden");
ok(/Jetzt starten/.test(checkout), "primäre Aktion führt ins Produkt (Jetzt starten), nicht auf die Homepage");
ok(checkout.indexOf("ACCESS GRANTED") < 0 || !/🎉|🚀|✨/.test(checkout.split("ACCESS GRANTED")[1].slice(0, 600)), "kein Emoji-Konfetti im Access-Moment");

group("Motion · funktional + reduced-motion-Guard");
ok(/prefers-reduced-motion: reduce/.test(vs2), "reduced-motion wird respektiert");
ok((vs2.match(/@keyframes/g) || []).length <= 3, "wenige, gezielte Keyframes (keine Animations-Orgie)");

group("Empty/Locked States · Premium-Ruhe");
ok(/\.mm-empty/.test(vs2) && /\.mm-locked/.test(vs2), "Empty- und Locked-States sind Systemkomponenten");
ok(/LOCKED · /.test(vs2), "Locked-State spricht Mono-Systemsprache");

group("Score Result · diagnostische Systemliste statt Balken-Stapel");
var check = read("js/check.js");
ok(/mm-sys/.test(check) && /is-primary/.test(check), "Ergebnisseite nutzt .mm-sys mit Primary-Bottleneck-Highlight");
ok(/MM \/ SYSTEMS/.test(check), "Mono-Systemheader auf der Ergebnisseite");
ok((check.match(/is-primary/g) || []).length >= 1 && /k === bKey/.test(check), "genau der Engpass wird als PRIMARY markiert (datengetrieben)");

group("P13/A2 · SYSTEM-READY-Moment nach Programm-Setup");
var course = read("js/course.js");
ok(/SYSTEM READY/.test(course), "SYSTEM-READY-Screen existiert nach dem Setup");
ok(/START DAY 1/.test(course), "genau EIN CTA: START DAY 1");
ok(/PRIMARY BOTTLENECK/.test(course) && /DAY 01/.test(course), "zeigt Mode/Bottleneck/12 Weeks/Day 01 aus ECHTEN Setup-Werten");
ok(/program_initialized/.test(course) && /day1_started/.test(course), "Funnel-Events program_initialized + day1_started (keine Gesundheitsdaten)");
ok(/mm-access/.test(course) && /mm-metric/.test(course), "nutzt VS2-Systemklassen, kein eigenes Design");

group("P16/D1 · Freie Ebooks als Protokoll-Kapitel gerahmt");
var bpcss = read("css/blueprint.css");
ok(/\.bp-protohead/.test(bpcss) && /\.bp-protocta/.test(bpcss), "Rahmungs-Styles (Kopf + Ende-CTA) existieren in blueprint.css");
// P17: kanonische 10-Kapitel-Nummerierung (+ Companions als „· VERTIEFUNG", Abschluss)
var CHAPTERS = {
  "blueprint.html": "KAPITEL 01", "fettabbau.html": "KAPITEL 01 · VERTIEFUNG", "protein-system.html": "KAPITEL 01 · VERTIEFUNG",
  "taeglich-trainieren.html": "KAPITEL 02", "training-system.html": "KAPITEL 02 · VERTIEFUNG",
  "schlaf-energie.html": "KAPITEL 03", "schlaf-stack.html": "KAPITEL 03 · VERTIEFUNG", "blutwerte-guide.html": "KAPITEL 04",
  "testosteron.html": "KAPITEL 05", "glp1-agonisten.html": "KAPITEL 06", "supplements.html": "KAPITEL 08",
  "sexuelle-gesundheit.html": "KAPITEL 09", "11-injektionen.html": "KAPITEL 10",
  "12-longevity-risk.html": "KAPITEL 04 · VERTIEFUNG", "gewohnheiten.html": "ABSCHLUSS", "masterguide.html": "KAPITEL 01 · VERTIEFUNG"
};
Object.keys(CHAPTERS).forEach(function (fn) {
  var h = read("ebooks/" + fn);
  var head = /<main class="bp">\s*<div class="bp-protohead">/.test(h);
  var label = h.indexOf("MM / PROTOCOL · " + CHAPTERS[fn]) >= 0;
  var cta = h.indexOf('class="bp-protocta"') >= 0 && h.indexOf("protokoll.html") >= 0;
  var oneEach = (h.match(/class="bp-protohead"/g) || []).length === 1 && (h.match(/class="bp-protocta"/g) || []).length === 1;
  ok(head && label && cta && oneEach, fn + ": Systemkopf (" + CHAPTERS[fn] + ") + Ende-CTA genau einmal, Link auf protokoll.html");
});
/* Früher an ebooks/testosteron.html geprüft; die Seite ist seit dem
   Schließen der Kapitel eine Vorschau. Die Rollentrennung gehört ohnehin
   auf die Produktseite. */
ok(!/DAS 12-WOCHEN-PROGRAMM.{0,40}erklärt/i.test(read("protokoll.html")), "Rollen bleiben getrennt (Programm 'erklärt' nicht) — Positionierung intakt");

group("P17 · Kanonische 10-Kapitel-Architektur (+ Abschluss)");
var proto = read("protokoll.html");
ok(/id="kapitel"/.test(proto) && /class="proto-index"/.test(proto), "protokoll.html hat EINEN kanonischen Kapitel-Index (#kapitel)");
ok(!/Die 10 Module/.test(proto) && !/pillar-tag">Modul /.test(proto) && !/14 Kapitel/.test(proto), "kein '10 Module'- und kein '14 Kapitel'-Modell mehr");
ok((proto.match(/class="proto-chap/g) || []).length === 11, "Index = exakt 10 nummerierte Kapitel + 1 Abschluss");
/* Das Muster lässt Attribute zwischen Klasse und Ziffer zu (die Ziffern
   sind seit der Kontrastprüfung als aria-hidden ausgezeichnet). Geprüft
   wird weiterhin dasselbe: zehn nummerierte Kapitel. */
ok((proto.match(/class="pc-n"[^>]*>\d\d</g) || []).length === 10, "genau 10 Kapitelnummern 01–10");
ok((proto.match(/class="pc-n" aria-hidden="true"/g) || []).length === 11, "die Geisterziffern sind als Ornament ausgezeichnet (Kontrast-Ausnahme)");
ok(/proto-outro/.test(proto) && /ABSCHLUSS · DAS SYSTEM ZUSAMMENSETZEN/.test(proto), "unnummerierter Abschluss vorhanden (kein Kapitel 11)");
ok(/ebooks\/blueprint\.html/.test(proto) && /ebooks\/ultimate-stack\.html/.test(proto) && /ebooks\/11-injektionen\.html/.test(proto), "Index verlinkt echte Kapitel-URLs inkl. Ultimate Stack (07) + Injektionen (10)");
ok(/DAS PROTOKOLL erklärt/.test(proto) && /12-Wochen-Programm/.test(proto) && /führt/.test(proto), "Rollen getrennt (Protokoll erklärt · Programm führt)");
/* Seit dem Schließen der Kapitel ist KEINES mehr frei — die frühere
   Prüfung verlangte ausdrücklich beide Kennzeichnungen. */
ok(/pc-tag paid">IM PROTOKOLL/.test(proto), "jedes Kapitel ist als Teil des Produkts gekennzeichnet");
ok(!/FREI LESEN/.test(proto), "kein Kapitel wird mehr als frei lesbar beworben");
ok((proto.match(/pc-tag paid">IM PROTOKOLL/g) || []).length === 11, "alle 11 Einträge tragen die Kennzeichnung");
ok(/\.proto-index \{/.test(style) && /\.proto-chap/.test(style), "Index-Styles zentral in style.css");
ok(!/id="frei-lesen"/.test(proto), "redundantes D2-Preview-Grid entfernt (dedupliziert in den Index)");
var eb = read("ebooks.html");
ok(/id="ebRecommendSec"/.test(eb) && /display:none/.test(eb.split("ebRecommendSec")[1].slice(0, 80)), "ebooks.html Empfehlungssektion existiert, per Default verborgen");
ok(/EMPFOHLEN FÜR DICH/.test(eb), "Mono-Header 'EMPFOHLEN FÜR DICH'");
ok(/MM\.store\.get\("check_result"/.test(eb), "Empfehlung liest den echten lokalen Score (keine Fake-Personalisierung)");
["recovery", "body", "fuel", "blood", "strength", "drive", "execution"].forEach(function (k) {
  ok(new RegExp(k + ":\\s*\\{").test(eb), "Bottleneck '" + k + "' hat ein Empfehlungs-Mapping");
});
ok(!/mm-ai|fetch\(|XMLHttpRequest/.test(eb.split("EMPFOHLEN FÜR DICH")[1] || ""), "Empfehlung sendet nichts nach außen (nur lokal)");

group("P16/E · Frei gebliebene Zusatzkapitel 00/12 (bp-Design)");
/* 11-injektionen war hier mit dabei, ist aber Kapitel 10 von DAS PROTOKOLL
   und inzwischen geschlossen. Seine inhaltlichen Leitplanken (keine
   Universalnadel, keine Dosierungen, Nadelwahl an Präparat und Anatomie
   gebunden) stehen im bezahlten Volltext und sind öffentlich nicht mehr
   prüfbar — die Vorschauseite wird stattdessen im Block „Kapitel sind
   geschlossen" geprüft. */
/* Auch 00-start-here und 12-longevity-risk tragen die Protokoll-Rahmung
   (KAPITEL 01 bzw. 04 · VERTIEFUNG) und sind inzwischen geschlossen. Das
   Foto-freie Cover war ein Merkmal des Volltexts; geprüft bleibt die
   Rahmung, die auf der Vorschau weiterhin steht. */
["00-start-here", "12-longevity-risk"].forEach(function (fn) {
  var h = read("ebooks/" + fn + ".html");
  ok(/<body class="bp-wrap">/.test(h) && /blueprint\.css/.test(h), fn + ": bp-Design (blueprint.css)");
  ok(/<div class="bp-protohead">/.test(h) && /class="bp-protocta"/.test(h), fn + ": Protokoll-Rahmung (Kopf + Ende-CTA)");
  ok(/rel="canonical"/.test(h), fn + ": canonical gesetzt");
});

group("Kapitel sind geschlossen — Vorschau statt Volltext");
/* Die früheren Prüfungen an dieser Stelle gingen durch den Volltext von
   ebooks/testosteron.html (BEFORE-TRT-Sektion, Reihenfolge, TOC). Dieser
   Text ist jetzt Teil des bezahlten Produkts und liegt nicht mehr
   öffentlich; inhaltlich prüfbar bleibt er nur im Vault. Geprüft wird
   deshalb, dass die öffentliche Seite genau das ist, was sie sein soll:
   eine Vorschau mit Kaufweg — und eben KEIN Volltext. */
var GESCHLOSSEN = ["blueprint", "taeglich-trainieren", "schlaf-energie", "blutwerte-guide",
  "testosteron", "glp1-agonisten", "ultimate-stack", "supplements", "sexuelle-gesundheit",
  "11-injektionen", "gewohnheiten"];
GESCHLOSSEN.forEach(function (name) {
  var src = read("ebooks/" + name + ".html");
  ok(src.length < 9000, name + ": Vorschau statt Volltext (" + src.length + " Zeichen)");
  ok(/Teil von DAS PROTOKOLL/.test(src), name + ": nennt die Zugehörigkeit zum Produkt");
  ok(/protokoll.html/.test(src), name + ": führt zum Kaufweg");
  ok(/noindex/.test(src), name + ": nicht indexierbar");
  ok(/Was in diesem Kapitel steht/.test(src), name + ": sagt, was drinsteht");
  /* Der Volltext liegt im Vault von ebooks/protokoll.html (zehn Kapitel plus
     Abschluss), nicht mehr im Kompendium. Geprüft wird der Käufer-Hinweis mit
     seinem seitenrelativen Link — der Kaufweg oben zeigt auf ../protokoll.html
     und ist damit unterscheidbar. */
  ok(/Schon gekauft\?/.test(src) && /href="protokoll\.html"/.test(src),
    name + ": Käufer finden den Weg zum Volltext");
  ok(!/kostenloses Ebook|Gratis herunterladen/.test(src), name + ": kein Gratis-Versprechen mehr");
});
/* EINE Quelle je Kapitel. Der Ultimate Stack lag frueher zusaetzlich als
   eigener Vault vor — damit existierte Kapitel 07 zweimal und die beiden
   Fassungen liefen auseinander. Der Volltext steht jetzt ausschliesslich im
   protoVault von ebooks/protokoll.html. Dieser Test haelt das fest. */
group("Kein Kapitel existiert zweimal");
(function () {
  var traeger = fs.readdirSync(path.join(ROOT, "ebooks"))
    .filter(function (f) { return /\.html$/.test(f); })
    .filter(function (f) { return /type="application\/json" id="[A-Za-z]*[Vv]ault/.test(read("ebooks/" + f)); });
  ok(traeger.length === 1 && traeger[0] === "protokoll.html",
    "genau eine Seite traegt einen Vault (gefunden: " + (traeger.join(", ") || "keine") + ")");
  ok(!/stackVault|MM\.vault\.open/.test(read("ebooks/ultimate-stack.html")),
    "Kapitel 07 hat keinen eigenen Vault mehr — kein zweiter Volltext");
})();

group("Lead-Seiten sammeln keine Adresse mehr für bezahlte Kapitel");
["blutwerte-guide", "gewohnheiten", "glp1-agonisten", "schlaf-energie",
 "sexuelle-gesundheit", "supplements", "taeglich-trainieren", "testosteron"].forEach(function (name) {
  var lp = read("lp/" + name + ".html");
  ok(!/data-ebook-read/.test(lp), "lp/" + name + ": kein E-Mail-Gate mehr");
  ok(!/Gratis herunterladen/.test(lp), "lp/" + name + ": kein Gratis-Versprechen");
  ok(/protokoll.html/.test(lp), "lp/" + name + ": führt zum Produkt");
  ok(/check.html/.test(lp), "lp/" + name + ": nennt den kostenlosen Score als echte Alternative");
});
/* Es gibt kein Gratis-Ebook mehr — folglich auch kein E-Mail-Gate. */
["fettabbau", "protein-system", "schlaf-stack", "training-system", "masterguide"].forEach(function (name) {
  var lp = read("lp/" + name + ".html");
  ok(!/data-ebook-read/.test(lp), "lp/" + name + ": kein E-Mail-Gate mehr");
  ok(/protokoll\.html/.test(lp) && /check\.html/.test(lp), "lp/" + name + ": führt zum Produkt und zum Score");
});
var alleLp = fs.readdirSync(path.join(ROOT, "lp")).filter(function (f) { return /\.html$/.test(f); });
var mitGate = alleLp.filter(function (f) { return /data-ebook-read/.test(read("lp/" + f)); });
ok(mitGate.length === 0, "keine einzige Lead-Seite sammelt noch eine Adresse für ein Ebook" + (mitGate.length ? ": " + mitGate.join(", ") : ""));

group("P16/G-H · Score-Ergebnis: Engpass → PASSENDES Kapitel statt generisch");
var checkData = read("js/check-data.js");
var checkJs = read("js/check.js");
ok(/bottleneckChapter:\s*\{/.test(checkData), "check-data.js: bottleneckChapter-Map existiert");
/* Kein Kapitel ist mehr frei lesbar. Der Vertrag hat sich damit gedreht: die
   Engpass-Empfehlung darf kein Ebook mehr verlinken (das wäre ein Versprechen
   auf frei Lesbares), muss aber weiterhin domänenspezifisch benennen, worum
   es geht — sonst wäre sie wieder generisch. */
var bnBlock = checkData.split("bottleneckChapter:")[1].split("\n  },")[0];
[["body", "Körperkomposition"], ["strength", "Training"], ["fuel", "Ernährung"],
 ["recovery", "Schlaf"], ["blood", "Blutwerte"], ["drive", "Hormone"],
 ["execution", "Umsetzung"]].forEach(function (pair) {
  ok(new RegExp(pair[0] + ":\\s*\\{[^}]*protokoll\\.html[^}]*" + pair[1]).test(bnBlock),
    "Engpass '" + pair[0] + "' → protokoll.html, benannt als '" + pair[1] + "'");
});
ok(!/ebooks\//.test(bnBlock), "keine Engpass-Empfehlung verlinkt noch ein Kapitel direkt");
var bnLabels = (bnBlock.match(/label:\s*"([^"]+)"/g) || []);
ok(new Set(bnLabels).size >= 6, "die Empfehlungen sind domänenspezifisch benannt (" + new Set(bnLabels).size + " verschiedene Bezeichnungen)");
/* Score V2: die Kapitel-Vertiefung läuft über die kontextuelle Deep-Link-Engine
   (Engpass-Domain × Status × Datenlücken) statt über eine feste 1:1-Map.
   Der Vertrag bleibt: passendes Kapitel statt generischer Produktseite. */
ok(/V\.deepLinks/.test(checkJs), "check.js nutzt die kontextuelle Deep-Link-Engine im Diagnose-Block");
ok(/data-track="protokoll_chapter_/.test(checkJs), "… und trackt das konkrete Kapitel weiterhin");
ok(/data-track="protokoll_chapter_/.test(checkJs), "Diagnose-Link trackt kapitelspezifisch (protokoll_chapter_<engpass>)");
ok(!/href="protokoll\.html" data-track="protokoll_from_result"/.test(checkJs), "generischer protokoll.html-Link im Diagnose-Block ersetzt");
ok(/data-track="cta_protokoll"/.test(checkJs), "Produkt-CTA (99 €) auf der Ergebnisseite bleibt erhalten");

group("Flagship Motion #01 · MM/MECHANISM-Clip (Assets)");
/* Der Clip sitzt im Volltext von Kapitel 04 (Blutwerte), das inzwischen zum
   bezahlten Produkt gehört. Die Einbettung selbst ist damit öffentlich nicht
   mehr prüfbar; was geprüft bleibt, ist der Bestand der Assets — sie werden
   weiterhin ausgeliefert und vom bezahlten Inhalt referenziert. */
["assets/protocol/motion/apob-arterial-retention.mp4",
 "assets/protocol/motion/apob-arterial-retention.jpg"].forEach(function (f) {
  ok(fs.existsSync(path.join(ROOT, f)), "Motion-Asset vorhanden: " + f);
});
var bpcss2 = read("css/blueprint.css");
ok(/\.bp-mech/.test(bpcss2), "die Styles für das MM/MECHANISM-Instrument bleiben erhalten");


console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
