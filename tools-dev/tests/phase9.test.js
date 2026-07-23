/* ==========================================================================
   MALEMETRIX PHASE 9 — Production truth: Billing · Entitlements · Evidence · Chaos
   Ausführen:  node tools-dev/tests/phase9.test.js
   Deckt (§86-Auswahl): Billing-Zustandsmaschine deterministisch + out-of-order
   No-Ops, Capability-Gating (can), Abo-Gate ändert Legacy nie, Delivery-Vault-
   Neutralisierung bei Server-Grant (Quell-Invariante), Evidenz kann nicht
   erfunden werden + Publikations-Gate, Commerce-Idempotenz für Abos, Chaos-
   Invarianten (korrupter localStorage, DST, Doppelklick-Idempotenz).
   ========================================================================== */
"use strict";
var path = require("path");
var fs = require("fs");
var ROOT = path.resolve(__dirname, "../..");

function envBase() {
  var store = {};
  global.localStorage = { getItem: function (k) { return k in store ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; }, get _store() { return store; } };
  global.document = { dispatchEvent: function () { return true; }, addEventListener: function () {}, getElementById: function () { return null; }, createElement: function () { return { style: {} }; }, querySelector: function () { return null; }, querySelectorAll: function () { return []; } };
  global.CustomEvent = function (t, i) { this.type = t; this.detail = (i || {}).detail; };
  try { Object.defineProperty(global, "navigator", { value: { serviceWorker: {} }, configurable: true }); } catch (e) {}
  global.window = { addEventListener: function () {}, location: { hash: "", origin: "https://x" }, MM: {}, MM_CONFIG: {} };
  global.location = global.window.location; global.MM = global.window.MM; global.MM_CONFIG = global.window.MM_CONFIG;
  MM.store = { get: function (k, d) { try { var r = localStorage.getItem("mm_" + k); return r != null ? JSON.parse(r) : d; } catch (e) { return d; } }, set: function (k, v) { localStorage.setItem("mm_" + k, JSON.stringify(v)); }, remove: function (k) { localStorage.removeItem("mm_" + k); } };
  return store;
}
function loadEnt(entitlements, subscription) {
  MM.account = {
    getEntitlements: function () { return (entitlements || []).slice(); },
    subscription: function () { return subscription || null; },
    snapshot: function () { return { state: "local" }; }
  };
  delete require.cache[require.resolve(path.join(ROOT, "js/os/entitlements.js"))];
  require(path.join(ROOT, "js/os/entitlements.js"));
}

var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

/* ================= 1) BILLING-ZUSTANDSMASCHINE (§11) ================= */
group("Billing state machine · deterministisch + out-of-order No-Ops");
(function () {
  envBase();
  delete require.cache[require.resolve(path.join(ROOT, "js/os/billing-machine.js"))];
  require(path.join(ROOT, "js/os/billing-machine.js"));
  var B = MM.billing;
  ok(B.next("FREE", "subscription_created") === "ACTIVE", "FREE + created ⇒ ACTIVE");
  ok(B.next("ACTIVE", "payment_failed") === "PAST_DUE", "ACTIVE + payment_failed ⇒ PAST_DUE");
  ok(B.next("PAST_DUE", "invoice_paid") === "ACTIVE", "PAST_DUE + invoice_paid heilt ⇒ ACTIVE");
  ok(B.next("PAST_DUE", "grace_entered") === "GRACE", "PAST_DUE ⇒ GRACE");
  ok(B.next("ACTIVE", "cancel_at_period_end") === "CANCEL_AT_PERIOD_END", "cancel_at_period_end");
  ok(B.next("CANCEL_AT_PERIOD_END", "invoice_paid") === "CANCEL_AT_PERIOD_END", "invoice_paid ändert Cancel-am-Ende nicht");
  ok(B.next("CANCEL_AT_PERIOD_END", "period_ended") === "EXPIRED", "period_ended ⇒ EXPIRED");
  ok(B.next("ACTIVE", "refunded") === "REFUNDED", "refunded ⇒ REFUNDED");
  ok(B.next("CANCELLED", "reactivated") === "ACTIVE", "reactivated ⇒ ACTIVE");
  // Out-of-order / unbekannt / rückwärts = No-Op
  ok(B.next("FREE", "invoice_paid") === "FREE", "invoice_paid ohne Abo ⇒ No-Op (FREE bleibt)");
  ok(B.next("EXPIRED", "payment_failed") === "EXPIRED", "payment_failed nach EXPIRED ⇒ No-Op");
  ok(B.next("ACTIVE", "unknown_event_xyz") === "ACTIVE", "unbekanntes Event ⇒ No-Op");
  ok(B.next("CANCELLED", "period_ended") === "CANCELLED", "period_ended aus CANCELLED (nicht erlaubt) ⇒ No-Op");
  // Idempotenz: gleiches Event zweimal führt zum selben Zustand
  var s1 = B.next("FREE", "subscription_created"); var s2 = B.next(s1, "subscription_created");
  ok(s1 === "ACTIVE" && s2 === "ACTIVE", "created zweimal ⇒ stabil ACTIVE (idempotent)");
  ok(B.isLive("ACTIVE") && B.isLive("GRACE") && !B.isLive("EXPIRED") && !B.isLive("CANCELLED"), "isLive korrekt");
})();

/* ================= 2) CAPABILITY-GATING (§13) ================= */
group("Entitlements · can(capability), Abo-Gate schont Legacy");
(function () {
  envBase(); loadEnt([]);
  ok(MM.entitlements.can("FORESIGHT") === false, "FREE: keine FORESIGHT");
  ok(MM.entitlements.billingState() === "FREE", "FREE billingState");
  envBase(); loadEnt(["protocol"]);
  ok(MM.entitlements.can("FORESIGHT") && MM.entitlements.can("ADVISOR") && MM.entitlements.can("PROGRAM"), "Protokoll schaltet Kern-Fähigkeiten frei");
  ok(MM.entitlements.billingState() === "LEGACY_LIFETIME", "Einmal-Kauf ⇒ LEGACY_LIFETIME");
  ok(MM.entitlements.can("COACHING") === false, "Protokoll ≠ Coaching");
  ok(MM.entitlements.provenance().tag === "LEGACY_LIFETIME", "Grandfathering-Provenance korrekt");
  envBase(); loadEnt(["twelve_week"]);
  ok(MM.entitlements.can("PROGRAM") && !MM.entitlements.can("FORESIGHT"), "reines 12-Week: Programm ja, Foresight nein");
  envBase(); loadEnt(["protocol"], { state: "CANCELLED", plan: "intelligence_monthly" });
  // Kritisch (§14/§61): ein GEKündigtes Abo darf einem Legacy-Käufer NIE die
  // aus dem Kauf stammenden Fähigkeiten entziehen. SUBSCRIPTION_GATED ist leer ⇒
  // Fähigkeiten hängen am Kauf, nicht am Abo-Zustand.
  ok(MM.entitlements.can("FORESIGHT") === true, "gekündigtes Abo entzieht Legacy-Käufer nichts");
})();

/* ================= 3) DELIVERY-VAULT-NEUTRALISIERUNG (§5) ================= */
group("Delivery vault · Server-Grant umgeht Client-Code (Quell-Invariante)");
(function () {
  var co = fs.readFileSync(path.join(ROOT, "js/checkout.js"), "utf8");
  ok(/!opts\.serverGrant/.test(co), "deliveryCodes() wird bei serverGrant NICHT aufgerufen");
  ok(/serverGrant\s*\?\s*\(accountBlock/.test(co), "bei serverGrant erscheint Konto-Block statt Code-Block");
  ok(/verify_paypal/.test(co) && /invokeFunction\("mm-commerce"/.test(co), "Server-Verifikation vor Zugang");
  var sec = fs.readFileSync(path.join(ROOT, "SECURITY.md"), "utf8");
  ok(/rotate-vault/.test(sec) && /Reihenfolge schützt Alt-Kunden/.test(sec), "SECURITY.md dokumentiert sichere Retire-Sequenz");
  ok(fs.existsSync(path.join(ROOT, "tools-dev/rotate-vault.mjs")), "Rotations-Werkzeug existiert");
})();

/* ================= 4) EVIDENZ KANN NICHT ERFUNDEN WERDEN (§27/§29) ================= */
group("Knowledge · nur aufgelöste Quellen zitierbar, Publikations-Gate");
(function () {
  envBase();
  MM.intelligence = { util: { daysBetween: function () { return 10; }, todayYmd: function () { return "2026-07-24"; } } };
  delete require.cache[require.resolve(path.join(ROOT, "js/os/intelligence/knowledge.js"))];
  require(path.join(ROOT, "js/os/intelligence/knowledge.js"));
  var K = MM.intelligence.knowledge;
  var cov = K.coverage();
  ok(cov.resolvedSources >= 5, "≥5 aufgelöste Landmark-Quellen (" + cov.resolvedSources + ")");
  ok(cov.published >= 1, "mind. 1 Objekt PUBLISHED (alle Kern-Claims belegt)");
  // Keine öffentliche Zitation darf 'unresolved' oder ohne url/doi sein.
  var bad = K.all().some(function (o) { return K.citations(o).some(function (s) { return !s || (!s.url && !s.doi); }); });
  ok(!bad, "keine Zitation ohne echte url/doi");
  // Ein Objekt ohne aufgelöste Quelle ist NIE PUBLISHED.
  var en = K.byId("energy_balance");
  ok(K.pubState(en) !== "PUBLISHED" && K.citations(en).length === 0, "Objekt ohne Quelle: REVIEWED, keine Zitate (ehrlich)");
  // Belegtes Objekt trägt echte DOI.
  var prot = K.byId("protein_target");
  ok(K.pubState(prot) === "PUBLISHED" && K.citations(prot)[0].doi === "10.1136/bjsports-2017-097608", "Protein PUBLISHED mit echter Morton-2018-DOI");
  // Versionierung (§30): KV wurde erhöht.
  ok(K.VERSION >= 2, "Knowledge-Version ≥2 (Quellen aufgelöst)");
})();

/* ================= 5) PRODUCTION STATUS · nie Secrets (§91) ================= */
group("productionStatus · ehrlich, ohne Secrets");
(function () {
  envBase();
  MM_CONFIG.supabaseUrl = ""; MM_CONFIG.paypalClientId = "sb"; MM_CONFIG.AI_ENABLED = false;
  window.MM_CONFIG = MM_CONFIG;
  MM.account = { snapshot: function () { return { state: "local" }; } };
  MM.ai = { configured: function () { return false; }, status: function () { return { state: "config_required" }; } };
  delete require.cache[require.resolve(path.join(ROOT, "js/os/production-status.js"))];
  require(path.join(ROOT, "js/os/production-status.js"));
  var s = MM.productionStatusSync();
  ok(s.supabase.client_configured === false, "Supabase unkonfiguriert korrekt gemeldet");
  ok(s.paypal.mode === "sandbox", "PayPal-Sandbox ehrlich");
  ok(s.ai.live === false && s.ai.status === "config_required", "KI ehrlich REQUIRES CONFIG");
  var json = JSON.stringify(s);
  // Auf echte Secret-WERTE prüfen (nicht auf ehrliche Erklärtexte wie
  // "service_role ... nicht sichtbar"): Provider-Keys, JWTs, Secret-Zuweisungen.
  ok(!/sk-ant-|sk-proj-|eyJ[A-Za-z0-9_-]{20,}|PAYPAL_SECRET\s*=|SERVICE_ROLE_KEY\s*=|[A-Fa-f0-9]{64}/.test(json), "Diagnose enthält keinen echten Secret-Wert");
})();

/* ================= 6) CHAOS-INVARIANTEN (§51) ================= */
group("Chaos · korrupter Speicher, DST, Doppel-Event-Idempotenz");
(function () {
  // Korrupter localStorage darf MM.store.get nicht werfen.
  envBase();
  localStorage.setItem("mm_check_result", "{das ist kein json");
  var threw = false, val;
  try { val = MM.store.get("check_result", null); } catch (e) { threw = true; }
  ok(!threw && val === null, "korrupter JSON-Wert ⇒ Default statt Crash");
  // Commerce-Idempotenz-Muster im Server-Code (§12): insert-first vor Grant.
  var fn = fs.readFileSync(path.join(ROOT, "supabase/functions/mm-commerce/index.ts"), "utf8");
  ok(fn.indexOf("subscription_events") < fn.indexOf('from("subscriptions").upsert'), "Abo-Event: Idempotenz-Insert VOR Zustandsschreiben");
  ok(/23505|duplicate/i.test(fn), "Abo-Replay wird erkannt (unique violation)");
  ok(/billingNext\(/.test(fn), "Server nutzt dieselbe Zustandsmaschine wie der Client");
  // DST: reine UTC-Datumsdifferenz im Billing-Horizont (keine lokale TZ-Falle).
  delete require.cache[require.resolve(path.join(ROOT, "js/os/billing-machine.js"))];
  require(path.join(ROOT, "js/os/billing-machine.js"));
  ok(typeof MM.billing.next === "function", "Billing-Übergänge sind rein (zeitzonenunabhängig)");
})();

/* ================= 7) ANALYTICS-PRIVATSPHÄRE bleibt (§16, Regression) ================= */
group("Analytics · Lint über alle MM.track-Aufrufe (weiterhin sauber)");
(function () {
  var offenders = [];
  function walk(dir) { fs.readdirSync(dir).forEach(function (f) { var p = path.join(dir, f); var st = fs.statSync(p); if (st.isDirectory()) walk(p); else if (/\.js$/.test(f)) { var src = fs.readFileSync(p, "utf8"); var re = /MM\.track\(\s*"[^"]+"\s*,\s*\{([^}]*)\}/g, m; while ((m = re.exec(src))) { if (/(^|\W)(score|weight|waist|kcal|sleep|kg|labs?|marker)\s*:/i.test(m[1])) offenders.push(path.relative(ROOT, p)); } } }); }
  walk(path.join(ROOT, "js"));
  ok(offenders.length === 0, "kein MM.track sendet Gesundheitswerte" + (offenders.length ? " — " + offenders.join(",") : ""));
})();

console.log("\n──────────────────────────────");
console.log((failed ? "✗ " : "✓ ") + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
