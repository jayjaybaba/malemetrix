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
  var ERLAUBT = [cP.replace(/\.00$/, ""), "199", "50", "400", "3,90", "3.90"];
  var falsch = [];
  shipped([".html", ".js"]).forEach(function (f) {
    /* Kommentare zaehlen nicht: Ein Betrag in einer Erklaerung fuer den
       Entwickler steht auf keiner Seite und ist kein Preisversprechen. */
    var t = read(f)
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
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

/* ----------------------------------------------------------------- G8a */
group("G8a · Mitgliederliste: nur lesend, vollstaendig, nur fuer den Owner");
(function () {
  var fn = read("supabase/functions/mm-admin/index.ts");
  ok(/action === "list_members"/.test(fn), "list_members existiert");
  /* Die Uebersicht darf NIE schreiben — sie ist reine Anzeige. */
  var block = fn.split('action === "list_members"')[1].split('action === "grant"')[0];
  ok(!/\.(insert|upsert|update|delete)\(/.test(block), "list_members ist strikt lesend");
  /* Kontosuche paginiert ueber ALLE Konten — die Einzelseite perPage:1000
     hat ab Konto 1001 vorhandene Konten uebersehen (stille Falsch-Einladung). */
  ok(/async function alleKonten/.test(fn), "gemeinsame paginierte Kontoladung existiert");
  ok(!/listUsers\(\{ page: 1, perPage: 1000 \}\)/.test(fn), "keine Einzelseiten-Abfrage mit 1000er-Deckel mehr");
  ok(/MAX_PAGES/.test(fn) && /users\.length < PER_PAGE\) break/.test(fn),
    "die Paginierung hat Abbruch UND harten Deckel gegen Endlosschleifen");
  /* UI: Sichtbarkeit ist Bequemlichkeit, Autorisierung liegt beim Server. */
  var app = read("js/os/app.js");
  ok(/list_members/.test(app) && /grMembers/.test(app), "die App bindet die Mitgliederliste an");
  ok(/isOwner\(\)\)\s*\{\s*html \+= sec\("Betreiber"/.test(app.replace(/\n/g, " ").replace(/\s+/g, " ")) ||
     /isOwner && MM\.entitlements\.isOwner\(\)/.test(app),
    "der Einstellungs-Einstieg erscheint nur fuer den Owner");
})();

/* ----------------------------------------------------------------- G8b */
group("G8b · mm-admin: verify_jwt=false ist durch Handler-Auth vollstaendig gedeckt");
(function () {
  var fn = read("supabase/functions/mm-admin/index.ts");
  var toml = read("supabase/config.toml");

  /* Authentifizierung: Bearer-Pflicht mit 401, Identitaet server-autoritativ. */
  ok(/authHeader\.startsWith\("Bearer "\)[\s\S]{0,60}unauthorized[\s\S]{0,20}401/.test(fn),
    "ohne Bearer-Token endet der Request mit 401");
  ok(/auth\.getUser\([\s\S]{0,80}authHeader\.replace\("Bearer ", ""\)/.test(fn) &&
     /userErr \|\| !userData\?\.user\) return json\(\{ error: "unauthorized" \}, 401\)/.test(fn),
    "das JWT wird server-autoritativ geprueft (getUser); ungueltig ⇒ 401");

  /* Autorisierung: Owner-Rolle aus user_roles ueber die Token-Identitaet. */
  ok(/from\("user_roles"\)\.select\("role"\)\.eq\("user_id", callerId\)/.test(fn),
    "die Rollenpruefung laeuft ueber die Token-Identitaet (callerId), nie ueber Body-Daten");
  ok(/rolle\.role !== "owner"\) return json\(\{ error: "forbidden" \}, 403\)/.test(fn),
    "ohne Owner-Rolle endet der Request mit 403");

  /* Reihenfolge: Auth + Rolle stehen VOR jeder Aktion und vor dem Body-Parse. */
  var idxAuth = fn.indexOf('auth.getUser'), idxRole = fn.indexOf('from("user_roles")'),
      idxBody = fn.indexOf('await req.json()'), idxAction = fn.indexOf('action === "list"');
  ok(idxAuth > 0 && idxRole > idxAuth && idxBody > idxRole && idxAction > idxBody,
    "Reihenfolge erzwungen: Token-Auth → Owner-Check → erst dann Body/Aktionen");

  /* Keine Autorisierung ueber Client-Parameter oder CORS. */
  ok(!/body\.(user_id|role|owner|caller)/.test(fn),
    "keine Identitaets-/Rollenfelder aus dem Request-Body");
  ok(/const callerId = userData\.user\.id/.test(fn),
    "callerId stammt ausschliesslich aus dem verifizierten Token");
  ok(/if \(req\.method === "OPTIONS"\) return preflight\(cors\)/.test(fn) &&
     !/const pre = preflight\(req\)/.test(fn),
    "preflight nur fuer OPTIONS (CORS ist Transport, keine Autorisierung)");

  /* Platform-Ebene: verify_jwt=false ist konfiguriert UND begruendet noetig
     (ES256-Projekt — die Legacy-Pruefung wuerde jeden Aufruf vorab ablehnen). */
  ok(/\[functions\.mm-admin\]\s*\nverify_jwt = false/.test(toml),
    "config.toml deklariert verify_jwt=false fuer mm-admin (Auth liegt im Handler)");
})();

/* ------------------------------------------------------------------ G9 */
group("G9 · Apple Pay wird nur versprochen, wenn es auch funktioniert");
(function () {
  var co = read("js/checkout.js");
  var cfg = read("js/config.js");

  ok(/function stripeLinkFor\s*\(/.test(co) && /function applePayAvailable\s*\(/.test(co),
    "Zahlart und Geraetefaehigkeit werden getrennt geprueft");
  ok(/const stripeUrl = stripeLinkFor\(\);[\s\S]{0,120}applePayAvailable\(\)/.test(co),
    "Apple Pay erscheint nur bei hinterlegtem Link UND faehigem Geraet");
  ok(/buy\\\.stripe\\\.com/.test(co) || /buy\\.stripe\\.com/.test(co),
    "der Zahlungslink wird gegen die Stripe-Domain geprueft");
  ok(/list\.length !== 1 \|\| list\[0\]\.qty !== 1/.test(co),
    "ein Produktlink gilt nur fuer genau dieses eine Produkt — sonst zahlte der Kaeufer einen anderen Betrag");

  /* Die Rueckleitung von Stripe ist kein Zahlungsnachweis — jeder koennte die
     URL selbst aufrufen. Seit der automatischen Freischaltung DARF die
     Rueckkehr Zugang vergeben, aber ausschliesslich nach serverseitiger
     Pruefung der Checkout-Session. Der Wachhund prueft daher nicht mehr
     "kein Zugang", sondern die Kette: URL -> Serververifikation -> Erfolg. */
  var rueck = (co.match(/function renderStripeReturn\(\)[\s\S]*?\n  }/) || [""])[0];
  ok(rueck.length > 0, "es gibt eine eigene Behandlung der Rueckkehr");
  ok(!/ACCESS GRANTED|vault|Zugangscode/i.test(rueck),
    "die Rueckkehr selbst zeigt weder Zugangsstempel noch Code");
  ok(/runStripeVerify\(sid,/.test(rueck) && /if \(!sid\) \{ renderStripeManual/.test(rueck),
    "die Rueckkehr fuehrt in die Serververifikation, sonst in den ehrlichen Hinweis");
  /* Die Erfolgsansicht darf nur aus dem verifizierten Serverpfad heraus
     erreichbar sein (fnOk == data.ok der Edge Function). */
  var verify = (co.match(/function runStripeVerify\([\s\S]*?\n  }\n/) || [""])[0];
  ok(/action:\s*"verify_stripe"/.test(verify) && /if \(fnOk\(r\)\)[\s\S]{0,200}renderStripeSuccess/.test(verify),
    "renderStripeSuccess haengt am fnOk der Edge-Function-Antwort");
  ok(co.split("renderStripeSuccess(").length === 3,
    "renderStripeSuccess hat genau EINE Aufrufstelle (Definition + verifizierter Pfad)");
  ok(!/renderStripeSuccess/.test(rueck), "die Rueckkehr ruft die Erfolgsansicht nicht direkt auf");

  /* Ein Stripe-Geheimschluessel darf niemals im Frontend liegen. Das gilt
     fuer den Vollzugriff (sk_) genauso wie fuer eingeschraenkte Schluessel
     (rk_): auch ein rk_live_ kann in fremder Hand die API im Namen des
     Kontos aufrufen. Oeffentlich sein duerfen ausschliesslich der
     pk_-Schluessel und die buy.stripe.com-Adresse. */
  var leck = JS_HTML.filter(function (f) { return /\b(sk|rk)_(live|test)_[A-Za-z0-9]{10}/.test(read(f)); });
  ok(leck.length === 0, "kein Stripe-Geheimschluessel im Frontend (gefunden: " + (leck.join(", ") || "nichts") + ")");

  /* Auch nicht in irgendeiner anderen versionierten Datei — ein Schluessel
     im Repo ist ein Schluessel in der Welt, sobald das Repo geteilt wird. */
  var alle = [];
  (function walk(dir) {
    fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach(function (e) {
      var rel = dir ? dir + "/" + e.name : e.name;
      if (e.name === ".git" || e.name === "node_modules") return;
      if (e.isDirectory()) return walk(rel);
      if (/\.(js|mjs|ts|html|json|md|sql|sh|yml|yaml|toml)$/.test(e.name)) alle.push(rel);
    });
  })("");
  var repoLeck = alle.filter(function (f) {
    return /\b(sk|rk)_(live|test)_[A-Za-z0-9]{20}/.test(read(f));
  });
  ok(repoLeck.length === 0, "kein Stripe-Geheimschluessel irgendwo im Repo (gefunden: " + (repoLeck.join(", ") || "nichts") + ")");

  /* Auslieferung: seit der automatischen Freischaltung (live geprueft) darf
     der Checkout den Zugang direkt nach der Zahlung versprechen. Das
     Versprechen ist aber nur zulaessig, solange der ehrliche Rueckfall
     existiert: ohne session_id oder ohne Server-Secret sagt
     renderStripeManual die manuelle Freischaltung an, statt zu behaupten,
     der Zugang sei schon da. */
  ok(/Zugang wird direkt nach der Zahlung freigeschaltet/.test(co),
    "der Checkout sagt die sofortige Freischaltung an");
  ok(/function renderStripeManual/.test(co) && /Zahlungseingangs frei/.test(co),
    "der ehrliche Rueckfall auf manuelle Freischaltung existiert weiterhin");

  /* .well-known wird von GitHub Pages nur mit .nojekyll ausgeliefert. */
  ok(fs.existsSync(path.join(ROOT, ".nojekyll")),
    ".nojekyll vorhanden — sonst waere /.well-known/ nicht erreichbar");

  /* Der Wert darf leer sein (Zahlart aus) oder eine oeffentliche
     buy.stripe.com-Adresse — aber niemals irgendetwas anderes. Ein
     Geheimschluessel oder eine fremde Domain an dieser Stelle waere der
     teuerste denkbare Fehler in dieser Datei. */
  var wert = (cfg.match(/"protokoll":\s*"([^"]*)"/) || [])[1];
  ok(wert !== undefined, "der Schalter steht in config.js");
  ok(wert === "" || /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9_]+$/.test(wert),
    "der Zahlungslink ist leer oder eine echte buy.stripe.com-Adresse (ist: " +
    (wert ? wert.slice(0, 30) + "…" : "leer") + ")");
})();

/* ------------------------------------------------------------------ G10 */
group("G10 · Der dokumentierte Kauf-Trichter wird wirklich gemessen");
(function () {
  var an = read("js/analytics.js");
  var block = (an.match(/DER KAUF-TRICHTER[\s\S]*?Die drei wichtigsten/) || [""])[0];
  var events = (block.match(/^ {5}([a-z][a-z0-9_]+)(?= )/gm) || []).map(function (s) { return s.trim(); });
  ok(events.length >= 8, "der Trichter ist dokumentiert (" + events.length + " Stufen)");

  /* Frueher standen hier sieben Ereignisse aus laengst entfernten Produkten.
     Eine Trichter-Dokumentation, die nichts misst, ist schlimmer als keine:
     Sie sieht nach Ueberblick aus und ist keiner. */
  var quelle = JS_HTML.map(read).join("\n");
  var tot = events.filter(function (e) {
    return quelle.indexOf('MM.track("' + e) < 0 &&
           quelle.indexOf('track("' + e) < 0 &&
           quelle.indexOf('data-track="' + e) < 0;
  });
  ok(tot.length === 0, "jede Trichterstufe wird auch ausgeloest (tote Stufen: " + (tot.join(", ") || "keine") + ")");

  ok(/plausibleDomain: ""/.test(read("js/config.js")),
    "kein Anbieter vorbelegt, hinter dem kein Konto steht");
  ok(/Abschnitt 7|Reichweitenmessung/.test(read("datenschutz.html")),
    "die Datenschutzerklaerung deckt die Reichweitenmessung ab");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
if (failed) process.exit(1);
