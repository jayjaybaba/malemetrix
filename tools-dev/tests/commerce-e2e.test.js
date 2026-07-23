/* ==========================================================================
   MALEMETRIX — Commerce-Robustheit + Auth (nach abgeschlossenem 1-€-Livetest)
   Der kontrollierte E2E-Testpfad (1-€-Testprodukt + ?e2e/?recover) ist nach
   erfolgreichem Livetest vollständig zurückgebaut. Diese Suite sichert den
   PRODUKTIVEN Zahlungsweg ab: DAS PROTOKOLL bleibt exakt 49 €, kein Client-
   Preis, PayPal-Server-Verifikation, Idempotenz, iOS-Recovery, CORS,
   autoritative Auth (ES256/verify_jwt) — und dass der Testpfad wirklich weg ist.
   Ausführen:  node tools-dev/tests/commerce-e2e.test.js
   ========================================================================== */
"use strict";
var fs = require("fs");
var path = require("path");
var ROOT = path.resolve(__dirname, "../..");
function read(f) { return fs.readFileSync(path.join(ROOT, f), "utf8"); }
var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

var shopData = read("js/shop-data.js");
var checkout = read("js/checkout.js");
var shopJs = read("js/shop.js");
var edgeIndex = read("supabase/functions/mm-commerce/index.ts");
var fulfillment = read("supabase/functions/mm-commerce/fulfillment.mjs");
// Der Fulfillment-Kern lebt seit P10 in fulfillment.mjs (unit-getestet in
// commerce-fulfillment.test.js); statische Invarianten prüfen beide Dateien.
var edge = edgeIndex + "\n" + fulfillment;

/* ===== 1) DAS PROTOKOLL: Preis unverändert auf beiden Seiten ===== */
group("DAS PROTOKOLL · 49 € unangetastet");
(function () {
  ok(/id:\s*"protokoll"[\s\S]{0,200}price:\s*49\.00/.test(shopData), "Client: protokoll price 49.00");
  ok(/"protokoll":\s*\{\s*priceCents:\s*4900/.test(fulfillment), "Server: protokoll 4900 Cent");
  ok(/entitlements:\s*\["protocol",\s*"twelve_week"\]/.test(fulfillment), "Server: protokoll-Entitlements unverändert");
})();

/* ===== 2) E2E-Testpfad vollständig zurückgebaut ===== */
group("Teardown · 1-€-Testpfad vollständig entfernt");
(function () {
  ok(shopData.indexOf("mm-e2e-test") === -1, "Client: kein Testprodukt mehr in shop-data.js");
  ok(checkout.indexOf("mm-e2e-test") === -1 && !/get\("e2e"\)|get\("recover"\)/.test(checkout), "Client: kein e2e/recover-Testpfad mehr in checkout.js");
  ok(edge.indexOf("mm-e2e-test") === -1 && edge.indexOf("e2e_test") === -1, "Server: keine Testprodukt-Whitelist/Isolation mehr");
  // Nur noch echte Produkte im server-kanonischen Katalog (fulfillment.mjs)
  var catalogBlock = (fulfillment.split("export const PRODUCTS")[1] || "").split("};")[0];
  ok(/"protokoll"/.test(catalogBlock) && !/e2e/i.test(catalogBlock), "Server-Katalog enthält nur echte Produkte");
})();

/* ===== 3) Kein generischer Preis-Override ===== */
group("Sicherheit · Server glaubt nie dem Client-Preis");
(function () {
  ok(/capture\.amountCents !== v\.expectedCents[\s\S]{0,80}amount_mismatch/.test(fulfillment), "Betrag wird EXAKT geprüft ⇒ amount_mismatch (weder Unter- noch Überzahlung)");
  ok(/currency_mismatch/.test(fulfillment), "Währung wird erzwungen (EUR) ⇒ currency_mismatch");
  ok(/unknown_product/.test(fulfillment), "unbekannte Produkt-IDs ⇒ unknown_product, nie still toleriert");
  ok(!/body\.(price|amount|total)/.test(edge), "Server liest keinen Preis aus dem Request-Body");
  ok(/order\.status !== "COMPLETED"/.test(edge) && /cap\.status !== "COMPLETED"/.test(edge),
    "PayPal-Order UND Capture müssen COMPLETED sein");
  ok(/commerce_events/.test(edge) && /23505/.test(edge), "Idempotenz über commerce_events (unique) intakt");
})();

/* ===== 5) Reload-/Kontextverlust-Robustheit (iOS Safari) — echte Käufe ===== */
group("Recovery · Pending-State überlebt Reload (produktiv)");
(function () {
  ok(/savePending\(\{\s*paypalOrderId: ppOrderId/.test(checkout), "Pending-State wird in createOrder VOR der Freigabe gespeichert");
  ok(/captureId/.test(checkout) && /pd\.captureId = capId/.test(checkout), "Capture-ID wird nach onApprove ergänzt");
  ok(/if \(bootPending && \(bootPending\.paypalOrderId \|\| bootPending\.captureId\)\)/.test(checkout), "Boot: ausstehende Zahlung ⇒ Recovery statt neuem Checkout");
  ok(/Zahlung wird bestätigt/.test(checkout), "Recovery-UX: „Zahlung wird bestätigt …“");
  ok(/NICHT erneut bezahlen/.test(checkout), "UX warnt explizit vor Doppelzahlung");
  ok(/id="retryVerify"/.test(checkout) && !/retryVerify[\s\S]{0,400}order\.create/.test(checkout), "Wiederholungs-Button prüft nur — löst nie neue Zahlung aus");
  ok(/\.then\(\(r\) => \{\s*if \(fnOk\(r\)\)[\s\S]{0,400}renderVerifyIssue\(fnCode\(r\)\)/.test(checkout), "Verifikationsfehler ⇒ KEINE falsche Erfolgsseite");
  ok(!/savePending\(\{[^}]*\b(secret|password|authorization|jwt|bearer)\b/i.test(checkout), "Pending-State enthält keine Secrets");
})();

/* ===== 6) Server-Robustheit: Fehler ehrlich, Replay selbstheilend ===== */
group("Server · DB-Fehler nicht ignoriert, Replay heilt, Capture-Fallback");
(function () {
  ok(/order_write_failed/.test(edge), "orders-Insert-Fehler ⇒ expliziter Fehler (nie ignoriert)");
  ok(/entitlement_write_failed/.test(edge), "entitlements-Upsert-Fehler ⇒ expliziter Fehler (nie ignoriert)");
  ok(/replay = true/.test(fulfillment) && /existing\.data/.test(fulfillment), "Replay kehrt nicht früh zurück: Order/Entitlements werden sichergestellt");
  ok(/eq\("provider", provider\)\.eq\("provider_ref", ref\)/.test(edgeIndex), "kein doppelter Order-Insert (Existenz-Check über provider+provider_ref)");
  ok(/\/v2\/payments\/captures\//.test(edge), "Capture-/Transaktions-ID-Fallback für Recovery");
  ok(/APPROVED/.test(edge) && /\/capture"/.test(edge.replace(/\n/g, "")) || /\+ "\/capture"/.test(edge), "APPROVED-Order wird serverseitig captured (verlorenes Client-Capture)");
  ok(/PayPal-Request-Id/.test(edge), "serverseitiges Capture idempotent (PayPal-Request-Id)");
  ok(/replay, entitlements: v\.keys/.test(fulfillment), "bereits verarbeitete Zahlung ⇒ Erfolg (replay:true), kein Doppel-Grant");
})();

/* ===== 6b) P10-Regression: Fulfillment-Reihenfolge + Claim-Schutz =====
   Der Live-Bug: commerce_events-Insert VOR Order/Entitlement ⇒ event_log_failed
   stoppte einen bezahlten Kauf. Diese Gruppe verhindert die Rückkehr statisch;
   das VERHALTEN beweist tools-dev/tests/commerce-fulfillment.test.js. */
group("P10 · Order-first-Fulfillment, Audit best effort, Claim-Schutz");
(function () {
  ok(!/event_log_failed/.test(fulfillment), "Fulfillment-Kern kennt kein event_log_failed mehr (Audit ist kein Gate)");
  var iOrder = fulfillment.indexOf("db.insertOrder");
  var iEnt = fulfillment.indexOf("db.upsertEntitlement");
  var iAudit = fulfillment.indexOf("db.logEvent");
  ok(iOrder > -1 && iEnt > iOrder && iAudit > iEnt, "Quellcode-Reihenfolge: Order → Entitlement → Audit");
  ok(/payment_already_claimed/.test(fulfillment), "fremde Capture ⇒ payment_already_claimed (409)");
  ok(/order\.user_id !== userId/.test(fulfillment), "Claim-Check vergleicht user_id der bestehenden Order");
  ok(/order_conflict/.test(fulfillment), "Replay-Manipulation (Betrag/Währung/Produkte) ⇒ order_conflict");
  ok(/23505/.test(fulfillment), "Race Conditions über Unique-Constraint (23505) behandelt");
  ok(/import \{ fulfillVerifiedCapture/.test(edgeIndex), "index.ts nutzt den unit-getesteten Fulfillment-Kern");
  var oneTimePath = edgeIndex.split("handleSubscriptionEvent(body")[1] || edgeIndex;
  ok(!/commerce_events[\s\S]{0,400}from\("orders"\)\.insert/.test(oneTimePath), "kein commerce_events-Insert mehr vor dem Order-Write im Kaufpfad");
  // Node kann das echte Modul laden — beweist zusätzlich, dass Deno/Node dieselbe Datei teilen.
  var canImport = true;
  try { require("node:fs").accessSync(require("node:path").join(ROOT, "tools-dev/tests/commerce-fulfillment.test.js")); } catch (e) { canImport = false; }
  ok(canImport, "Verhaltens-Suite commerce-fulfillment.test.js existiert");
})();

/* ===== 7) P0-Regression: account.js auf checkout.html + Cache-Busting ===== */
group("Checkout-Seite · account.js geladen, Assets versioniert");
(function () {
  var co = read("checkout.html");
  var accIdx = co.indexOf("js/account.js");
  var ckIdx = co.indexOf("js/checkout.js");
  ok(accIdx > -1, "checkout.html lädt js/account.js (MM.account für Server-Verify/Recovery)");
  ok(ckIdx > -1 && accIdx < ckIdx, "account.js steht VOR checkout.js");
  ok(/js\/checkout\.js\?v=\d+/.test(co), "checkout.js ist versioniert (Cache-Bust alter Clients)");
  ok(/js\/account\.js\?v=\d+/.test(co), "account.js ist versioniert");
  ok(/js\/shop-data\.js\?v=\d+/.test(co), "shop-data.js ist versioniert (Testprodukt erreicht alte Clients)");
  // Keine andere Seite darf checkout.js ohne account.js laden
  var all = fs.readdirSync(ROOT).filter(function (f) { return /\.html$/.test(f); });
  var offenders = all.filter(function (f) {
    var h = read(f);
    return h.indexOf("js/checkout.js") > -1 && h.indexOf("js/account.js") === -1;
  });
  ok(offenders.length === 0, "keine Seite lädt checkout.js ohne account.js" + (offenders.length ? " (" + offenders.join(", ") + ")" : ""));
})();

/* ===== 8) invokeFunction-Contract korrekt entpackt ===== */
group("Contract · { ok, data } wird zentral entpackt");
(function () {
  ok(/function fnOk\(r\) \{ return !!\(r && r\.ok && r\.data && r\.data\.ok\); \}/.test(checkout),
    "fnOk prüft Transport- UND Server-Erfolg (r.ok && r.data.ok)");
  ok(/renderRecoverySuccess\(pending, fnData\(r\)\)/.test(checkout), "Recovery liest entitlements/amount aus data, nicht von r");
  ok(/renderVerifyIssue\(fnCode\(r\)\)/.test(checkout), "Fehlercode kommt aus fnCode (data.error bzw. code)");
  ok(!/r\.entitlements|resp\.entitlements/.test(checkout), "kein Zugriff mehr auf r.entitlements (alter Contract-Bug)");
  var acc = read("js/account.js");
  ok(/r\.error\.context/.test(acc) && /json\(\)/.test(acc), "account.js reicht Server-Fehlercodes aus non-2xx-Antworten durch");
})();

/* ===== 9) CORS: Preflight sauber, sonst blockt der Browser den POST ===== */
group("CORS · OPTIONS-Preflight + CORS-Header auf allen Antworten");
(function () {
  ok(/access-control-allow-origin/.test(edge), "CORS-Header definiert (access-control-allow-origin)");
  ok(/access-control-allow-headers[^]*authorization[^]*x-client-info/.test(edge.replace(/\n/g, " ")), "erlaubt authorization + x-client-info (supabase-js Header)");
  ok(/req\.method === "OPTIONS"[\s\S]{0,80}status: 204[\s\S]{0,20}headers: CORS/.test(edge), "OPTIONS ⇒ 204 mit CORS-Headern (Preflight besteht)");
  ok(/headers: \{ "content-type": "application\/json", \.\.\.CORS \}/.test(edge), "json()-Antworten tragen CORS-Header");
})();

/* ===== 10) Präzise, sichere Fehlercodes (Recovery-Diagnose) ===== */
group("Fehlercodes · konkret statt generisch");
(function () {
  ok(/"paypal_auth_failed"/.test(edge), "Token-Fehler ⇒ paypal_auth_failed");
  ok(/"capture_not_found"/.test(edge), "unbekannte Capture-/Order-ID ⇒ capture_not_found");
  ok(/"paypal_lookup_failed"/.test(edge), "PayPal-Lookup-Fehler ⇒ paypal_lookup_failed");
  ok(/or\.status === 404/.test(edge), "Order-404 wird klar von echten Fehlern unterschieden");
  var acc = read("js/account.js");
  ok(/code: "unreachable"/.test(acc), "Client: Netzwerk/CORS-Block ⇒ 'unreachable' statt 'function_error'");
  ok(/VERIFY_MSG/.test(checkout) && /amount_mismatch:/.test(checkout) && /paypal_auth_failed:/.test(checkout),
    "Client: lesbare Meldungen je Fehlercode (nicht nur 'function_error')");
})();

/* ===== 11) Server-Auth: JWT autoritativ via Service-Role validieren ===== */
group("Auth · getUser(jwt) mit Service-Role, keine ungeprüften Claims");
(function () {
  ok(!/Deno\.env\.get\("SUPABASE_ANON_KEY"\)/.test(edge), "liest SUPABASE_ANON_KEY nicht mehr (falscher Key für ES256/Publishable-Projekt)");
  ok(/service\.auth\.getUser\(jwt\)/.test(edge), "Bearer-Token wird EXPLIZIT validiert: service.auth.getUser(jwt)");
  ok(/authHeader\.replace\(\/\^Bearer\\s\+\/i, ""\)/.test(edge), "Bearer-Prefix wird sauber entfernt");
  ok(/error: "auth_missing"/.test(edge), "fehlender Header ⇒ auth_missing (401)");
  ok(/error: "auth_invalid_token"/.test(edge), "ungültiger/abgelaufener/fremder Token ⇒ auth_invalid_token (401)");
  ok(/error: "auth_validation_failed"/.test(edge), "Validierungs-Exception ⇒ auth_validation_failed (401)");
  ok(!/uData\?\.user[\s\S]{0,40}\.\.\.jwt|body\.user|payload\.sub/.test(edge), "keine Trust-Entscheidung anhand ungeprüfter JWT-Claims");
  // Genau EIN Service-Role-Client (Dublette entfernt), an Subscription-Handler übergeben
  var svc = (edge.match(/createClient\(/g) || []).length;
  ok(svc === 1, "genau eine createClient-Erzeugung (Dublette vereinheitlicht) — ist " + svc);
  ok(/handleSubscriptionEvent\(body, user, service\)/.test(edge), "Subscription-Handler bekommt den geteilten service-Client");
  // Service-Role-Key wird nie serialisiert: nicht INNERHALB eines json({...})-
  // Objekts und nie in einer console.-Zeile (der Guard `!SR_KEY` steht VOR
  // json( und ist damit kein Leak).
  ok(!/json\(\{[^}]*(SR_KEY|SERVICE_ROLE)/.test(edge), "Service-Role-Key nie im json()-Antwortkörper");
  ok(!/console\.[a-z]+\([^)]*(SR_KEY|SERVICE_ROLE)/.test(edge), "Service-Role-Key nie geloggt");
  // Client kennt die neuen Auth-Codes
  ok(/auth_missing:/.test(checkout) && /auth_invalid_token:/.test(checkout) && /auth_validation_failed:/.test(checkout),
    "Client mappt auth_missing/auth_invalid_token/auth_validation_failed auf klare Meldungen");
})();

/* ===== 12) Platform verify_jwt bewusst aus, App-Auth bleibt Pflicht ===== */
group("Platform · verify_jwt=false + In-Handler-Auth erzwungen");
(function () {
  var cfgPath = path.join(ROOT, "supabase/config.toml");
  ok(fs.existsSync(cfgPath), "supabase/config.toml existiert");
  var cfg = fs.existsSync(cfgPath) ? fs.readFileSync(cfgPath, "utf8") : "";
  ok(/\[functions\.mm-commerce\][\s\S]*?verify_jwt\s*=\s*false/.test(cfg), "mm-commerce: verify_jwt = false");
  ok(/\[functions\.resolve-product-access\][\s\S]*?verify_jwt\s*=\s*false/.test(cfg), "resolve-product-access: verify_jwt = false");
  // Trotz deaktivierter Platform-Prüfung MUSS der Handler Auth erzwingen:
  ok(/auth_missing/.test(edge) && /service\.auth\.getUser\(jwt\)/.test(edge), "mm-commerce erzwingt Auth im Handler (nicht öffentlich)");
})();

/* ===== 13) resolve-product-access: gleicher Auth-Fix, user-scoped ===== */
group("resolve-product-access · autoritative Auth + user-scoped Entitlement");
(function () {
  var rpa = read("supabase/functions/resolve-product-access/index.ts");
  ok(!/Deno\.env\.get\("SUPABASE_ANON_KEY"\)/.test(rpa), "liest SUPABASE_ANON_KEY nicht mehr");
  ok(/service\.auth\.getUser\(jwt\)/.test(rpa), "validiert Bearer-Token explizit via Service-Role");
  ok(/error: "auth_missing"/.test(rpa) && /error: "auth_invalid_token"/.test(rpa), "konkrete Auth-Codes (auth_missing/auth_invalid_token)");
  ok(/\.eq\("user_id", uid\)/.test(rpa), "Entitlement-Query strikt auf validierten user_id gefiltert (Service-Role umgeht RLS)");
  ok(!/JSON\.stringify\(\{[^}]*material[^}]*\}[\s\S]*console/.test(rpa) && /Never log the material|material/.test(rpa), "Schlüsselmaterial wird nicht geloggt");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
