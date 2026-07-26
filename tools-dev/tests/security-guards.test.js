/* ==========================================================================
   MALEMETRIX — HARTE REGRESSIONS-WÄCHTER (P0)
   Diese Suite prüft Eigenschaften, deren Verlust Kunden oder Umsatz kostet.
   Sie ist bewusst streng und darf nicht "weichgeklopft" werden: Wer eine
   dieser Zusicherungen bricht, bricht den Build.
   Ausführen:  node tools-dev/tests/security-guards.test.js
   ========================================================================== */
"use strict";
var fs = require("node:fs");
var path = require("node:path");
var ROOT = path.resolve(__dirname, "../..");
var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }
function read(p) { return fs.readFileSync(path.join(ROOT, p), "utf8"); }

/* Alle Dateien, die tatsächlich an Browser ausgeliefert werden. tools-dev/
   ist Werkzeugkasten und wird nie deployt. */
function shipped(exts) {
  var out = [];
  (function walk(dir) {
    fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach(function (e) {
      var rel = dir ? dir + "/" + e.name : e.name;
      if (e.name === ".git" || e.name === "node_modules" || e.name === "tools-dev" || e.name === "supabase") return;
      if (e.isDirectory()) return walk(rel);
      if (exts.some(function (x) { return e.name.endsWith(x); })) out.push(rel);
    });
  })("");
  return out;
}
var JS_HTML = shipped([".js", ".html"]);

/* ------------------------------------------------------------------ G1 */
group("G1 · Keine entschlüsselbaren Secrets im ausgelieferten Frontend");
(function () {
  var treffer = JS_HTML.filter(function (f) {
    return /DELIVERY_VAULT|deliveryCodes|const DK\s*=/.test(read(f));
  });
  ok(treffer.length === 0,
    "kein DELIVERY_VAULT / DK / deliveryCodes ausgeliefert (gefunden: " + (treffer.join(", ") || "nichts") + ")");

  /* Ein Vault-Payload ist nur sicher, solange sein Schlüssel NICHT daneben
     liegt. Frühere Fassungen lieferten beides gemeinsam aus. */
  var mitSchluessel = JS_HTML.filter(function (f) {
    var t = read(f);
    return /openRaw\s*\(/.test(t) && /\bDK\b|MMD-/.test(t);
  });
  ok(mitSchluessel.length === 0,
    "kein Payload wird mit mitgeliefertem Schlüssel geöffnet (gefunden: " + (mitSchluessel.join(", ") || "nichts") + ")");
})();

/* ------------------------------------------------------------------ G2 */
group("G2 · Keine Premium-Zugangslinks mit Code in der URL");
(function () {
  var treffer = JS_HTML.filter(function (f) {
    return /["'`][^"'`]*\?code=/.test(read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""));
  });
  ok(treffer.length === 0,
    "kein ?code=-Link im Code (gefunden: " + (treffer.join(", ") || "nichts") + ")");
})();

/* ------------------------------------------------------------------ G3 */
group("G3 · Genau eine Quelle je Kapitel, kein öffentlicher Volltext");
(function () {
  var ebooks = fs.readdirSync(path.join(ROOT, "ebooks")).filter(function (f) { return /\.html$/.test(f); });
  var traeger = ebooks.filter(function (f) { return /type="application\/json" id="[A-Za-z]*[Vv]ault/.test(read("ebooks/" + f)); });
  ok(traeger.length === 1 && traeger[0] === "protokoll.html",
    "genau eine Seite unter ebooks/ trägt einen Vault (gefunden: " + (traeger.join(", ") || "keine") + ")");

  /* Vorschauseiten sind klein. Wächst eine über diese Grenze, ist mit hoher
     Wahrscheinlichkeit wieder Volltext hineingeraten. */
  var GRENZE = 12000;
  var zuGross = ebooks.filter(function (f) {
    return f !== "protokoll.html" && read("ebooks/" + f).length > GRENZE;
  });
  ok(zuGross.length === 0,
    "keine öffentliche Kapitelseite über " + GRENZE + " Zeichen (gefunden: " + (zuGross.join(", ") || "nichts") + ")");

  var ohneNoindex = ebooks.filter(function (f) { return !/noindex/.test(read("ebooks/" + f)); });
  ok(ohneNoindex.length === 0,
    "jede Seite unter ebooks/ ist noindex (ohne: " + (ohneNoindex.join(", ") || "keine") + ")");
})();

/* ------------------------------------------------------------------ G4 */
group("G4 · Zustimmung zu digitalen Inhalten ist Pflicht");
(function () {
  var co = read("js/checkout.js");
  ok(/id="coDigital"[^>]*required/.test(co), "die Digital-Checkbox ist required");
  ok(/getElementById\("coDigital"\)[\s\S]{0,200}?ok = false/.test(co), "validateForm() lässt ohne Zustimmung nicht durch");
  ok(/digitalConsentGiven\s*\(/.test(co), "es gibt einen eigenen Gate vor dem Kaufweg");
  ok(/digitalConsent:\s*list\.some/.test(co), "die Zustimmung wird in der Bestellung dokumentiert");
  ok(/DIGITAL_CONSENT_VERSION/.test(co) && /DIGITAL_CONSENT_TEXT/.test(co),
    "Wortlaut und Textversion sind nachweisbar festgehalten");
  ok(/Digitale Inhalte — Zustimmung/.test(co), "die Bestellbestätigung weist die Zustimmung aus");
})();

/* ------------------------------------------------------------------ G5 */
group("G5 · Kein Client-Produkt ohne serverseitiges Gegenstück");
(function () {
  var shop = read("js/shop-data.js");
  var clientIds = (shop.match(/id:\s*"([a-z0-9-]+)"/g) || []).map(function (m) { return m.split('"')[1]; });
  var srv = read("supabase/functions/mm-commerce/fulfillment.mjs");
  var fehlend = clientIds.filter(function (id) { return srv.indexOf('"' + id + '"') < 0; });
  ok(clientIds.length > 0, "Client-Katalog gelesen (" + clientIds.length + " Produkte)");
  ok(fehlend.length === 0,
    "jedes Client-Produkt existiert serverseitig (fehlend: " + (fehlend.join(", ") || "keins") + ")");

  /* Client- und Serverpreis müssen übereinstimmen: Der Server prüft den
     gezahlten Betrag, ein Auseinanderlaufen lässt jede Zahlung auflaufen. */
  var cP = (shop.match(/price:\s*([0-9]+(?:\.[0-9]+)?)/) || [])[1];
  var sP = (srv.match(/priceCents:\s*([0-9]+)/) || [])[1];
  ok(cP && sP && Math.round(parseFloat(cP) * 100) === parseInt(sP, 10),
    "Client-Preis (" + cP + " €) und Server-Preis (" + sP + " Cent) stimmen überein");

  /* Sichtbare Preise werden in mehreren Schreibweisen gesetzt: "99 €",
     "99&nbsp;€" und im Englischen "€99". Eine frühere Preisänderung fasste
     nur die erste Form an, sodass auf mehreren Seiten der alte Preis
     stehen blieb. Daher wird hier jede Schreibweise gegen den Katalog
     geprüft — Versandschwellen und der Coaching-Monatspreis ausgenommen. */
  var ERLAUBT = [cP.replace(/\.00$/, ""), "149", "199", "50", "400", "3,90", "3.90"];
  var falsch = [];
  shipped([".html", ".js"]).forEach(function (f) {
    var t = read(f);
    var re = /(?:^|[^0-9])([0-9]+(?:[.,][0-9]{2})?)(?:&nbsp;|&#160;| |\s)*€|€\s*([0-9]+(?:[.,][0-9]{2})?)/g, m;
    while ((m = re.exec(t))) {
      var betrag = m[1] || m[2];
      if (ERLAUBT.indexOf(betrag) < 0) falsch.push(f + " → " + betrag + " €");
    }
  });
  ok(falsch.length === 0,
    "kein abweichender Preis in einer der Schreibweisen (gefunden: " + (falsch.slice(0, 8).join("; ") || "nichts") + ")");
})();

/* ------------------------------------------------------------------ G6 */
group("G6 · Keine absoluten medizinischen Wirkversprechen");
(function () {
  /* Negativliste aus der Redaktionsvorgabe. Geprüft werden nur öffentlich
     ausgelieferte Seiten — Vault-Inhalte sind hier nicht lesbar. */
  var VERBOTEN = [
    "kein Herzrasen", "kein Crash", "keine kognitive Dämpfung",
    "kein Toleranzaufbau", "keine Toleranzentwicklung",
    "die häufigste Ursache ist", "der größte Hormon-Hebel"
  ];
  var treffer = [];
  shipped([".html"]).forEach(function (f) {
    var t = read(f);
    VERBOTEN.forEach(function (p) { if (t.indexOf(p) >= 0) treffer.push(f + " → „" + p + "“"); });
  });
  ok(treffer.length === 0, "keine Formulierung aus der Negativliste (gefunden: " + (treffer.join("; ") || "nichts") + ")");
})();


/* ------------------------------------------------------------------ G7 */
group("G7 · Owner-Rolle ist serverseitig und nicht faelschbar");
(function () {
  var mig = read("supabase/migrations/20260726000011_owner_roles_and_grants.sql");
  ok(/create table if not exists public\.user_roles/.test(mig), "user_roles existiert");
  ok(/user_id\s+uuid primary key references auth\.users\(id\)/.test(mig),
    "die Rolle haengt an auth.users.id, nicht an einer E-Mail");
  ok(/create policy "own role read"[\s\S]{0,160}for select/.test(mig),
    "authenticated darf user_roles nur LESEN");
  ok(!/create policy[^;]*on public\.user_roles for (insert|update|delete|all)/i.test(mig),
    "keine Schreib-Policy — niemand kann sich selbst zum Owner machen");
  ok(/security definer/.test(mig) && /is_owner\(uid uuid\)/.test(mig), "zentrale is_owner()-Pruefung existiert");

  /* Die Owner-E-Mail darf nirgends im ausgelieferten Frontend stehen. */
  var leck = JS_HTML.filter(function (f) { return /ural\.b@live\.de/i.test(read(f)); });
  ok(leck.length === 0, "keine Owner-E-Mail im Frontend (gefunden: " + (leck.join(", ") || "nichts") + ")");

  var ent = read("js/os/entitlements.js");
  ok(/MM\.account && MM\.account\.role/.test(ent), "die Rolle wird vom Konto gelesen, nicht aus localStorage");
  ok(!/@live\.de|===\s*["']owner["']\s*\|\|/.test(ent.replace(/role\(\) === "owner"/g, "")),
    "keine E-Mail-Sonderfaelle in der Zugriffslogik");
})();

/* ------------------------------------------------------------------ G8 */
group("G8 · Manuelle Zugangsvergabe gibt nur Produkte, nie Rollen");
(function () {
  var fn = read("supabase/functions/mm-admin/index.ts");
  ok(/auth\.getUser\(/.test(fn), "Identitaet kommt aus dem verifizierten Token");
  ok(/from\("user_roles"\)[\s\S]{0,120}role !== "owner"/.test(fn), "nur Owner darf die Funktion nutzen");
  ok(!/from\("user_roles"\)[\s\S]{0,200}\.(insert|upsert|update)\(/.test(fn),
    "die Funktion vergibt niemals eine Rolle");
  ok(/cannot_revoke_self/.test(fn), "der Owner kann sich nicht selbst entziehen");
  ok(/cannot_revoke_owner/.test(fn), "einem Owner kann der Zugang nicht entzogen werden");
  ok(/ERLAUBTE_PRODUKTE/.test(fn) && /unknown_product/.test(fn), "nur bekannte Produkte sind vergebbar");
  ok(/normalize\("NFKC"\)/.test(fn) && /toLowerCase\(\)/.test(fn),
    "E-Mails werden gegen Schreibweisen-Tricks normalisiert");
  ok(/ambiguous_account/.test(fn), "mehrdeutige Konten werden nicht blind bedient");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
if (failed) process.exit(1);
