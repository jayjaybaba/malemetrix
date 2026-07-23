// ============================================================================
// MaleMetrix P10/P0.6–0.8 — Edge-Function-Standard: Auth + CORS.
// Verhaltens-Tests laufen gegen das ECHTE Modul _shared/edge.mjs (dasselbe,
// das die Functions in Deno importieren); statische Invarianten sichern die
// Verwendung des Standards in jeder Function.
// ============================================================================
"use strict";
var fs = require("node:fs");
var path = require("node:path");
var ROOT = path.resolve(__dirname, "../..");
function read(p) { return fs.readFileSync(path.join(ROOT, p), "utf8"); }

var PASS = 0, FAIL = 0;
function ok(c, m, d) { if (c) { PASS++; console.log("  ✓ " + m); } else { FAIL++; console.log("  ✗ " + m + (d ? " — " + d : "")); } }
function group(t) { console.log("\n· " + t); }

var FN = "supabase/functions/";
var mmAi = read(FN + "mm-ai/index.ts");
var delAcc = read(FN + "delete-account/index.ts");
var rpa = read(FN + "resolve-product-access/index.ts");
var commerce = read(FN + "mm-commerce/index.ts");
var sendBrief = read(FN + "send-brief/index.ts");
var configToml = read("supabase/config.toml");

(async () => {
  const edge = await import("../../supabase/functions/_shared/edge.mjs");

  group("CORS-Verhalten (echtes Modul): Allowlist statt Wildcard");
  {
    const h1 = edge.corsHeaders("https://www.malemetrix.com");
    ok(h1["access-control-allow-origin"] === "https://www.malemetrix.com", "www-Origin wird gespiegelt");
    const h2 = edge.corsHeaders("https://malemetrix.com");
    ok(h2["access-control-allow-origin"] === "https://malemetrix.com", "Apex-Origin wird gespiegelt");
    const h3 = edge.corsHeaders("https://evil.example.com");
    ok(h3["access-control-allow-origin"] === "https://www.malemetrix.com", "fremde Origin bekommt NICHT ihr Echo (Browser blockt)");
    ok(!Object.values(h1).includes("*"), "keine Wildcard-Origin mehr");
    ok(/authorization/.test(h1["access-control-allow-headers"]) &&
       /apikey/.test(h1["access-control-allow-headers"]) &&
       /x-client-info/.test(h1["access-control-allow-headers"]) &&
       /content-type/.test(h1["access-control-allow-headers"]),
      "alle von supabase-js gesendeten Preflight-Header sind erlaubt");
    ok(h1["vary"] === "origin", "vary: origin gesetzt (Cache-korrekt bei Origin-Echo)");
    const pf = edge.preflight(h1);
    ok(pf.status === 204, "Preflight antwortet 204");
    ok(pf.headers.get("access-control-allow-origin") === "https://www.malemetrix.com", "Preflight trägt CORS-Header");
  }

  group("Auth-Verhalten (echtes Modul): Bearer → getUser(jwt)");
  {
    const cors = edge.corsHeaders("https://www.malemetrix.com");
    const mkReq = (auth) => new Request("https://x.example/fn", { method: "POST", headers: auth ? { authorization: auth } : {} });
    // Kein Header → auth_missing, getUser wird NIE aufgerufen
    let called = false;
    const svcNever = { auth: { getUser: async () => { called = true; return { data: { user: null } }; } } };
    const r1 = await edge.requireUser(mkReq(null), svcNever, cors);
    ok(r1.errorResponse && r1.errorResponse.status === 401, "ohne Authorization → 401");
    ok((await r1.errorResponse.json()).error === "auth_missing", "Code auth_missing");
    ok(called === false, "ohne Token wird getUser nicht aufgerufen");
    // Ungültiger Token → auth_invalid_token; Token wird EXPLIZIT übergeben
    let seenJwt = null;
    const svcReject = { auth: { getUser: async (jwt) => { seenJwt = jwt; return { data: { user: null }, error: { message: "bad" } }; } } };
    const r2 = await edge.requireUser(mkReq("Bearer abc.def.ghi"), svcReject, cors);
    ok(r2.errorResponse && (await r2.errorResponse.json()).error === "auth_invalid_token", "ungültiger JWT → auth_invalid_token");
    ok(seenJwt === "abc.def.ghi", "JWT wird EXPLIZIT an getUser übergeben (ES256-Fix)");
    // Prüfung wirft → auth_validation_failed
    const svcThrow = { auth: { getUser: async () => { throw new Error("network"); } } };
    const r3 = await edge.requireUser(mkReq("Bearer t"), svcThrow, cors);
    ok(r3.errorResponse && (await r3.errorResponse.json()).error === "auth_validation_failed", "Prüf-Exception → auth_validation_failed");
    // Gültig → user
    const svcOk = { auth: { getUser: async () => ({ data: { user: { id: "u1", email: "e@x.de" } }, error: null }) } };
    const r4 = await edge.requireUser(mkReq("Bearer good"), svcOk, cors);
    ok(r4.user && r4.user.id === "u1" && !r4.errorResponse, "gültiger Token → user");
  }

  group("mm-ai: ES256-Auth-Fix + CORS (vorher: ANON_KEY-Bug, keine CORS-Header)");
  ok(/_shared\/edge\.mjs/.test(mmAi), "mm-ai nutzt den gemeinsamen Standard");
  ok(!/SUPABASE_ANON_KEY/.test(mmAi), "mm-ai liest keinen ANON_KEY mehr");
  ok(/requireUser\(/.test(mmAi), "mm-ai validiert Bearer im Handler");
  ok(/preflight\(/.test(mmAi) && /OPTIONS/.test(mmAi), "mm-ai beantwortet OPTIONS (Preflight)");
  ok(/SUPABASE_SERVICE_ROLE_KEY/.test(mmAi), "mm-ai nutzt Service-Role-Client für Auth + Rate-Limit");
  ok(/rate_limited/.test(mmAi) && /RATE_LIMIT_PER_HOUR/.test(mmAi), "Rate-Limit bleibt aktiv");
  ok(/MAX_BODY_BYTES/.test(mmAi), "Payload-Größenlimit bleibt aktiv");

  group("delete-account: Auth-Fix + Aufbewahrungs-Doku (NICHT live getestet)");
  ok(/_shared\/edge\.mjs/.test(delAcc), "delete-account nutzt den gemeinsamen Standard");
  ok(!/SUPABASE_ANON_KEY/.test(delAcc), "delete-account liest keinen ANON_KEY mehr");
  ok(/requireUser\(/.test(delAcc), "delete-account validiert Bearer im Handler");
  ok(/SUPABASE_SERVICE_ROLE_KEY/.test(delAcc), "Standard-Secret-Name (mit Legacy-Fallback)");
  ok(/deleteUser\(user\.id\)/.test(delAcc), "gelöscht wird NUR die token-verifizierte user.id");
  ok(!/body\.(user_?id|uid)/i.test(delAcc), "keine User-ID aus dem Request-Body");
  ok(/confirm !== true/.test(delAcc), "explizite Bestätigung bleibt Pflicht");
  ok(/set null/i.test(delAcc) && /orders/i.test(delAcc), "Order-Aufbewahrung (set null) ist im Code dokumentiert");

  group("resolve-product-access: vollständige Preflight-Header");
  ok(/_shared\/edge\.mjs/.test(rpa), "resolve-product-access nutzt den Standard");
  ok(/requireUser\(/.test(rpa), "Bearer-Validierung im Handler");
  ok(/eq\("user_id", uid\)/.test(rpa), "Entitlement-Query strikt auf validierten User gefiltert");
  ok(!/console\.log/.test(rpa), "kein Logging (Material darf nie geloggt werden)");

  group("mm-commerce: Allowlist-CORS, Race-freie Header");
  ok(/_shared\/edge\.mjs/.test(commerce), "mm-commerce nutzt den Standard");
  ok(!/allow-origin":\s*"\*"/.test(commerce), "keine Wildcard mehr in mm-commerce");
  ok(/const CORS = corsHeaders\(req\.headers\.get\("origin"\)/.test(commerce), "CORS wird PRO Request berechnet (kein Modul-State)");

  group("send-brief: Scheduler-Auth (kein Browser-Endpunkt)");
  ok(/x-scheduler-secret/.test(sendBrief) && /SCHEDULER_SECRET/.test(sendBrief), "send-brief verlangt Scheduler-Secret");
  ok(/403/.test(sendBrief), "falsches/fehlendes Secret → 403");

  group("config.toml: verify_jwt dokumentiert konfiguriert");
  ["mm-commerce", "resolve-product-access", "mm-ai", "delete-account", "send-brief"].forEach(function (fn) {
    var re = new RegExp("\\[functions\\." + fn.replace(/[-]/g, "\\-") + "\\]\\s*\\nverify_jwt = false");
    ok(re.test(configToml), fn + ": verify_jwt=false in config.toml");
  });
  ok(/NICHT öffentlich/.test(configToml), "config.toml dokumentiert: verify_jwt=false ≠ anonym");

  group("Doku: EDGE_FUNCTIONS.md Statusmatrix existiert");
  var doc = read("EDGE_FUNCTIONS.md");
  ["mm-commerce", "resolve-product-access", "mm-ai", "delete-account", "send-brief"].forEach(function (fn) {
    ok(doc.indexOf(fn) >= 0, "Statusmatrix deckt " + fn + " ab");
  });
  ok(/NEIN/.test(doc) && /deploy/i.test(doc), "Doku ist ehrlich über Nicht-Deploytes + nennt Deploy-Schritte");

  console.log("\n==============================");
  console.log("PASS: " + PASS + "  FAIL: " + FAIL);
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(1); });
