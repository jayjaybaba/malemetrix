/* ==========================================================================
   Generation 2 — Feature-Flags: Ebenen-Präzedenz und Rollback-Schalter

   Defaults < Deploy-Config < Konto < Gerät. Unbekannte Flags werden nie
   gesetzt. Ein Flag ist Oberflächen-Führung, kein Zugriffsschutz — das
   Sicherheitsmodell dahinter prüfen die bestehenden Security-Suiten.
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } };
const group = (g) => console.log("\n== " + g + " ==");

function sandbox(cfgFlags) {
  const mem = {};
  const ctx = {
    console: { log() {}, error() {} },
    Date, Math, JSON, Object, Array, String, Number,
    CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; },
    document: { addEventListener() {}, dispatchEvent() {} },
    MM_CONFIG: cfgFlags ? { featureFlags: cfgFlags } : {}
  };
  ctx.window = ctx;
  ctx.self = ctx;
  vm.createContext(ctx);
  // MM.store-Attrappe wie in main.js (mm_-Präfix, JSON)
  ctx.MM = {
    store: {
      get: (k, fb) => { const raw = mem["mm_" + k]; return raw ? JSON.parse(raw) : fb; },
      set: (k, v) => { mem["mm_" + k] = JSON.stringify(v); },
      remove: (k) => { delete mem["mm_" + k]; }
    }
  };
  vm.runInContext(read("js/flags.js"), ctx);
  return ctx;
}

group("Defaults");
{
  const c = sandbox().MM.flags;
  ok(c.get("simpleAppEnabled") === true, "simpleAppEnabled default true");
  ok(c.get("simpleAppDefault") === false, "simpleAppDefault default false (Legacy bleibt Standard)");
  ok(c.get("legacyAppEnabled") === true, "legacyAppEnabled default true");
  ok(c.get("newPlanEngineEnabled") === true, "newPlanEngineEnabled default true");
  ok(c.get("legacyPlanFallbackEnabled") === true, "legacyPlanFallbackEnabled default true");
  ok(c.get("nichtVorhanden") === undefined, "unbekanntes Flag → undefined");
}

group("Deploy-Config überschreibt Defaults");
{
  const c = sandbox({ simpleAppDefault: true, legacyAppAdminOnly: true }).MM.flags;
  ok(c.get("simpleAppDefault") === true, "Config-Override greift");
  ok(c.get("legacyAppAdminOnly") === true, "zweites Config-Override greift");
  ok(c.get("legacyAppEnabled") === true, "unberührte Flags behalten Default");
}

group("Konto-Ebene überschreibt Deploy (Rollback pro Nutzer)");
{
  const c = sandbox({ simpleAppDefault: true }).MM.flags;
  ok(c.setUser("simpleAppDefault", false) === true, "setUser akzeptiert bekanntes Flag");
  ok(c.get("simpleAppDefault") === false, "Nutzer-Rollback gewinnt gegen globales Rollout-Flag");
  c.setUser("simpleAppDefault", null);
  ok(c.get("simpleAppDefault") === true, "Aufheben der Konto-Ebene fällt auf Deploy zurück");
  ok(c.setUser("evilFlag", true) === false, "unbekanntes Flag wird nie gespeichert");
}

group("Geräte-Ebene gewinnt über alles (Tester)");
{
  const c = sandbox({ simpleAppEnabled: false }).MM.flags;
  c.setUser("simpleAppEnabled", false);
  c.setLocal("simpleAppEnabled", true);
  ok(c.get("simpleAppEnabled") === true, "Geräte-Flag > Konto > Deploy");
  const layers = c.layers();
  ok(layers.defaults.simpleAppEnabled === true && layers.config.simpleAppEnabled === false &&
     layers.user.simpleAppEnabled === false && layers.local.simpleAppEnabled === true,
     "layers() zeigt alle vier Ebenen für Diagnose");
}

group("Vollständigkeit");
{
  const c = sandbox().MM.flags;
  const req = ["simpleAppEnabled", "legacyAppEnabled", "legacyAppAdminOnly", "newPlanEngineEnabled", "legacyPlanFallbackEnabled", "simpleAppDefault"];
  ok(req.every(n => c.names().indexOf(n) >= 0), "alle geforderten Flags existieren (§26.2)");
}

console.log("\n" + (failed ? "FAILED" : "OK") + " — " + passed + " bestanden, " + failed + " fehlgeschlagen");
process.exit(failed ? 1 : 0);
