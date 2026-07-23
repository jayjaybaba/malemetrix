/* ==========================================================================
   MALEMETRIX — E2E-Testprodukt-Zusicherungen (kontrollierter 1-€-Livetest)
   Statisch geprüft: Client- und Server-Preis stimmen überein, DAS PROTOKOLL
   bleibt exakt 49 € / 4900 Cent, das Testprodukt ist versteckt, isoliert und
   nur über den bewussten Testparameter erreichbar. Kein generischer
   Preis-Override existiert.
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
var edge = read("supabase/functions/mm-commerce/index.ts");

/* ===== 1) DAS PROTOKOLL: Preis unverändert auf beiden Seiten ===== */
group("DAS PROTOKOLL · 49 € unangetastet");
(function () {
  ok(/id:\s*"protokoll"[\s\S]{0,200}price:\s*49\.00/.test(shopData), "Client: protokoll price 49.00");
  ok(/"protokoll":\s*4900/.test(edge), "Server: protokoll 4900 Cent");
  ok(/"protokoll":\s*\["protocol",\s*"twelve_week"\]/.test(edge), "Server: protokoll-Entitlements unverändert");
})();

/* ===== 2) Testprodukt: Client/Server-Parität exakt 1,00 € ===== */
group("E2E-Testprodukt · 1,00 € Parität + Isolation");
(function () {
  ok(/id:\s*"mm-e2e-test"[\s\S]{0,200}price:\s*1\.00/.test(shopData), "Client: mm-e2e-test price 1.00");
  ok(/"mm-e2e-test":\s*100/.test(edge), "Server: mm-e2e-test 100 Cent");
  ok(/"mm-e2e-test":\s*\["e2e_test"\]/.test(edge), "Server: vergibt NUR e2e_test-Entitlement");
  ok(/productIds\.includes\("mm-e2e-test"\)/.test(edge) && /productIds\.length !== 1/.test(edge),
    "Server: Testprodukt nicht mit echten Produkten kombinierbar");
  ok(/paidCents !== 100/.test(edge), "Server: EXAKT 100 Cent erzwungen (nicht nur Mindestbetrag)");
})();

/* ===== 3) Kein generischer Preis-Override ===== */
group("Sicherheit · Server glaubt nie dem Client-Preis");
(function () {
  ok(/paidCents < minCents.*amount_mismatch/.test(edge.replace(/\n/g, " ")), "Unterzahlung ⇒ amount_mismatch bleibt aktiv");
  ok(!/body\.(price|amount|total)/.test(edge), "Server liest keinen Preis aus dem Request-Body");
  ok(/order\.status !== "COMPLETED"/.test(edge) && /cap\.status !== "COMPLETED"/.test(edge),
    "PayPal-Order UND Capture müssen COMPLETED sein");
  ok(/commerce_events/.test(edge) && /23505/.test(edge), "Idempotenz über commerce_events (unique) intakt");
})();

/* ===== 4) Sichtbarkeit + Zugang nur über bewussten Testpfad ===== */
group("Sichtbarkeit · versteckt im Shop, Seed nur per ?e2e=mm1");
(function () {
  ok(/id:\s*"mm-e2e-test"[\s\S]{0,400}hidden:\s*true/.test(shopData), "Produkt trägt hidden:true");
  ok(/filter\(p => !p\.hidden/.test(shopJs), "Shop-Grid filtert hidden-Produkte aus");
  ok(/get\("e2e"\) === "mm1"/.test(checkout), "Checkout-Seed nur bei exaktem Parameter e2e=mm1");
  ok(/\[\{ id: "mm-e2e-test", qty: 1 \}\]/.test(checkout), "Seed setzt GENAU 1× Testprodukt (Total = 1,00 €)");
  // Kein normaler Shop-Link auf das Testprodukt
  var pub = ["index.html", "shop.html", "ebooks.html", "coaching.html"].map(read).join("");
  ok(pub.indexOf("mm-e2e-test") === -1, "kein öffentlicher Link/Verweis auf das Testprodukt");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
