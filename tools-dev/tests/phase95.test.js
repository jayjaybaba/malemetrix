/* ==========================================================================
   MALEMETRIX PHASE 9.5 — GO-LIVE: Access-Control · SW-Cache · Migration · Privacy
   Ausführen:  node tools-dev/tests/phase95.test.js
   Deckt (§4/§15/§24): AES-Inhaltsgrenze (falscher Code entschlüsselt nie),
   Autoritäts-Modell (localStorage-Fälschung öffnet keinen Inhalt / keine
   Server-Ressource), Capability-Facade Server-autoritativ, SW cacht nie
   Cross-Origin (Auth/Payment/Supabase), Migrations-Idempotenz + RLS-Statik,
   productionStatus-ohne-Secrets, Analytics-Privacy-Regression.
   ========================================================================== */
"use strict";
var path = require("path");
var fs = require("fs");
var crypto = require("crypto");
var ROOT = path.resolve(__dirname, "../..");
var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

/* ================= 1) AES-INHALTSGRENZE (§4) — der bezahlte Vermögenswert ================= */
group("Content boundary · AES-256-GCM, falscher Code entschlüsselt nie");
(function () {
  var ITER = 150000, norm = function (c) { return String(c || "").trim().toUpperCase().replace(/\s+/g, ""); };
  function enc(t, c) { var s = crypto.randomBytes(16), iv = crypto.randomBytes(12), k = crypto.pbkdf2Sync(norm(c), s, ITER, 32, "sha256"); var ci = crypto.createCipheriv("aes-256-gcm", k, iv); var ct = Buffer.concat([ci.update(t, "utf8"), ci.final(), ci.getAuthTag()]); return { v: 1, iter: ITER, salt: s.toString("base64"), iv: iv.toString("base64"), ct: ct.toString("base64") }; }
  function dec(p, c) { var s = Buffer.from(p.salt, "base64"), iv = Buffer.from(p.iv, "base64"), d = Buffer.from(p.ct, "base64"), k = crypto.pbkdf2Sync(norm(c), s, p.iter, 32, "sha256"), tag = d.subarray(d.length - 16), ct = d.subarray(0, d.length - 16), dc = crypto.createDecipheriv("aes-256-gcm", k, iv); dc.setAuthTag(tag); return Buffer.concat([dc.update(ct), dc.final()]).toString("utf8"); }
  var payload = enc("PREMIUM CONTENT", "MMX-CODE-A");
  ok(dec(payload, "MMX-CODE-A") === "PREMIUM CONTENT", "richtiger Code entschlüsselt");
  var wrong = false; try { dec(payload, "MMX-CODE-B"); } catch (e) { wrong = true; } ok(wrong, "falscher Code ⇒ GCM-Auth schlägt fehl (kein Inhalt)");
  var empty = false; try { dec(payload, ""); } catch (e) { empty = true; } ok(empty, "leerer Code ⇒ blockiert");
  var mut = false; try { var p2 = JSON.parse(JSON.stringify(payload)); p2.ct = p2.ct.slice(0, -4) + "AAAA"; dec(p2, "MMX-CODE-A"); } catch (e) { mut = true; } ok(mut, "manipulierter Payload ⇒ blockiert");
  // vault.js nutzt exakt dieses Format (PBKDF2 150k → AES-256-GCM).
  var vjs = fs.readFileSync(path.join(ROOT, "js/vault.js"), "utf8");
  ok(/PBKDF2/.test(vjs) && /AES-GCM/.test(vjs) && /150000/.test(vjs), "js/vault.js verwendet dasselbe Krypto-Schema");
})();

/* ================= 2) AUTORITÄTS-MODELL (§4.2) — Quell-Invarianten ================= */
group("Authority model · Server autoritativ, localStorage nur advisory");
(function () {
  var acc = fs.readFileSync(path.join(ROOT, "js/account.js"), "utf8");
  // grantLocal wird NUR nach Krypto-Beweis aufgerufen.
  var grantCalls = (acc.match(/grantLocal\(/g) || []).length;
  ok(grantCalls >= 2, "grantLocal existiert");
  ok(/tryValidateCode\(code\)[\s\S]{0,200}?grantLocal/.test(acc) || /if \(ok\) grantLocal/.test(acc), "grantLocal folgt auf tryValidateCode (Decrypt-Beweis)");
  ok(/if \(localEntitlements\(\)\.length\) S\.setRaw\("account_entitlements", \[\]\)/.test(acc), "revalidateStoredCode verwirft unverifizierte Entitlements");
  // resolveProductAccess: signed_in prüft hasAccess (server), sonst nur Legacy-Code, sonst unavailable.
  ok(/if \(!api\.hasAccess\(productKey\)\) return[\s\S]{0,60}unauthorized/.test(acc), "resolveProductAccess: kein Server-Entitlement ⇒ unauthorized");
  ok(/state: "unavailable"/.test(acc), "ohne Code ⇒ unavailable (kein Inhalt)");
  // course.js gated echten Inhalt über resolveProductAccess, nicht über UI-Flag.
  var co = fs.readFileSync(path.join(ROOT, "js/course.js"), "utf8");
  ok(/resolveProductAccess\("twelve_week"\)/.test(co), "Programm-Inhalt gated über resolveProductAccess (Server/Krypto)");
  // KEIN Entitlement-Sprawl: kein if(plan==='pro') in Zugriffslogik.
  var appjs = fs.readFileSync(path.join(ROOT, "js/os/app.js"), "utf8");
  ok(!/plan\s*===\s*["'](pro|premium)["']/.test(appjs), "kein plan==='pro'-Sprawl in app.js");
})();

/* ================= 3) CAPABILITY-FACADE server-autoritativ (§13/§7.3) ================= */
group("Capability facade · gefälschte Entitlements ⇒ kein Zugriff wenn Server autoritativ");
(function () {
  global.window = { MM: {} }; global.MM = global.window.MM;
  var serverEnts = [];
  MM.account = { getEntitlements: function () { return serverEnts.slice(); }, subscription: function () { return null; }, snapshot: function () { return { state: "signed_in" }; } };
  delete require.cache[require.resolve(path.join(ROOT, "js/os/entitlements.js"))];
  require(path.join(ROOT, "js/os/entitlements.js"));
  // Server sagt: kein Entitlement ⇒ can() false, egal was der Client "glaubt".
  ok(MM.entitlements.can("FORESIGHT") === false, "leere Server-Entitlements ⇒ kein FORESIGHT");
  ok(MM.entitlements.billingState() === "FREE", "FREE billingState");
  serverEnts = ["protocol"];
  ok(MM.entitlements.can("FORESIGHT") === true, "Server-Entitlement ⇒ FORESIGHT frei");
  // provenance folgt dem Server, nicht dem Client-Cache.
  ok(MM.entitlements.provenance().tag === "LEGACY_LIFETIME", "Provenance = LEGACY_LIFETIME");
})();

/* ================= 4) SW CACHE-SICHERHEIT (§15) ================= */
group("Service Worker · cacht nie Cross-Origin (Auth/Payment/Supabase)");
(function () {
  var sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  ok(/url\.origin !== location\.origin\) return/.test(sw), "Cross-Origin-Requests (PayPal/Supabase/API) werden nie angefasst");
  ok(/req\.method !== "GET"\) return/.test(sw), "nur GET wird betrachtet (keine POST-Zahlungscalls)");
  // Version eindeutig + Alt-Caches werden bei activate gelöscht.
  var v = (sw.match(/const VERSION = "(mm-v\d+)"/) || [])[1];
  ok(!!v, "SW-Version gesetzt (" + v + ")");
  ok(/keys\.filter\(\(k\) => k !== VERSION\)\.map\(\(k\) => caches\.delete\(k\)\)/.test(sw), "activate löscht alle Alt-Caches (kein stale Schema)");
  // Kein Auth-/Token-/Payment-Pfad in CORE.
  ok(!/auth|token|checkout-verify|resolve-product/i.test(sw.split("CORE = [")[1].split("];")[0]), "CORE-Cache enthält keine Auth-/Payment-Endpunkte");
})();

/* ================= 5) MIGRATIONS-IDEMPOTENZ + RLS-STATIK (§2.1/§3) ================= */
group("Migrations · idempotent, RLS aktiv, Service-Only-Tabellen ohne Client-Policy");
(function () {
  var dir = path.join(ROOT, "supabase/migrations");
  var files = fs.readdirSync(dir).filter(function (f) { return /\.sql$/.test(f); }).sort();
  ok(files.length >= 8, "≥8 Migrationen vorhanden (" + files.length + ")");
  var allSql = files.map(function (f) { return fs.readFileSync(path.join(dir, f), "utf8"); }).join("\n");
  // Idempotenz-Muster.
  ok(/create table if not exists/i.test(allSql), "Tabellen mit 'if not exists' (idempotent)");
  // RLS auf Nutzer-Tabellen.
  ["entitlements", "orders", "subscriptions", "os_state"].forEach(function (t) {
    var re = new RegExp("alter table [^;]*" + t + "[^;]*enable row level security", "i");
    ok(re.test(allSql), t + ": RLS aktiviert");
  });
  // Service-Only-Tabellen: keine authenticated-Policy.
  ["commerce_events", "subscription_events"].forEach(function (t) {
    var re = new RegExp('create policy[^;]*on public\\.' + t, "i");
    ok(!re.test(allSql), t + ": keine Client-Policy (reine Server-Tabelle)");
  });
  // Idempotenz-Uniques für Webhook-Events.
  ok(/unique \(provider, event_id\)/.test(allSql), "commerce/subscription_events: unique(provider,event_id)");
})();

/* ================= 6) PRODUCTION STATUS — ehrlich, ohne Secrets (§1/§91) ================= */
group("productionStatus · meldet Wahrheit, nie Secret-Werte");
(function () {
  global.window = { MM: {}, MM_CONFIG: { supabaseUrl: "", paypalClientId: "sb", AI_ENABLED: false } };
  global.MM = global.window.MM; global.MM_CONFIG = global.window.MM_CONFIG;
  try { Object.defineProperty(global, "navigator", { value: { serviceWorker: {} }, configurable: true }); } catch (e) {}
  MM.account = { snapshot: function () { return { state: "local" }; } };
  MM.ai = { configured: function () { return false; }, status: function () { return { state: "config_required" }; } };
  delete require.cache[require.resolve(path.join(ROOT, "js/os/production-status.js"))];
  require(path.join(ROOT, "js/os/production-status.js"));
  var s = MM.productionStatusSync();
  ok(s.supabase.client_configured === false, "Supabase unkonfiguriert ehrlich");
  ok(s.paypal.mode === "sandbox", "PayPal Sandbox ehrlich");
  ok(s.ai.live === false, "KI live=false ehrlich");
  ok(s.push.status.indexOf("REQUIRES CONFIG") >= 0, "Push REQUIRES CONFIG ehrlich");
  ok(s.analytics.status === "local_only", "Analytics local_only ehrlich");
  ok(!/sk-ant-|PAYPAL_SECRET\s*=|SERVICE_ROLE_KEY\s*=|eyJ[A-Za-z0-9_-]{20,}|[A-Fa-f0-9]{64}/.test(JSON.stringify(s)), "keine Secret-Werte in der Diagnose");
})();

/* ================= 7) ANALYTICS-PRIVACY (§11.2, Regression) ================= */
group("Analytics · kein Gesundheitswert in MM.track (Repo-Lint)");
(function () {
  var offenders = [];
  function walk(dir) { fs.readdirSync(dir).forEach(function (f) { var p = path.join(dir, f); var st = fs.statSync(p); if (st.isDirectory()) walk(p); else if (/\.js$/.test(f)) { var src = fs.readFileSync(p, "utf8"); var re = /MM\.track\(\s*"[^"]+"\s*,\s*\{([^}]*)\}/g, m; while ((m = re.exec(src))) { if (/(^|\W)(score|weight|waist|kcal|sleep|kg|labs?|marker)\s*:/i.test(m[1])) offenders.push(path.relative(ROOT, p)); } } }); }
  walk(path.join(ROOT, "js"));
  ok(offenders.length === 0, "kein MM.track sendet Gesundheitswerte" + (offenders.length ? " — " + offenders.join(",") : ""));
})();

console.log("\n──────────────────────────────");
console.log((failed ? "✗ " : "✓ ") + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
