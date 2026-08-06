/* ==========================================================================
   Generation 2 — Bestandsmigration: nicht-destruktiv, idempotent, rückholbar

   Deckt die Migrations-Szenarien aus dem Auftrag (§33) ab: Bestandsnutzer
   mit/ohne Programm, Woche 6, pausiert, teilweise fehlende Daten, doppelt
   gestartet, zurückgesetzt. Kernaussage: Legacy-Originale werden NIE
   verändert, Unsicheres wird gefragt statt erfunden.
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } };
const group = (g) => console.log("\n== " + g + " ==");

function sandbox(seed) {
  const mem = {};
  Object.keys(seed || {}).forEach(k => { mem["mm_" + k] = JSON.stringify(seed[k]); });
  const ctx = {
    console: { log() {}, error() {} },
    Date, Math, JSON, Object, Array, String, Number, parseFloat, parseInt, isNaN,
    CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; },
    document: { addEventListener() {}, dispatchEvent() {} },
    MM_CONFIG: {}
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  ctx.MM = {
    store: {
      get: (k, fb) => { const raw = mem["mm_" + k]; return raw != null ? JSON.parse(raw) : fb; },
      set: (k, v) => { mem["mm_" + k] = JSON.stringify(v); },
      remove: (k) => { delete mem["mm_" + k]; }
    },
    track() {}
  };
  vm.runInContext(read("js/flags.js"), ctx);
  vm.runInContext(read("js/simple/plan-model.js"), ctx);
  vm.runInContext(read("js/simple/plan-store.js"), ctx);
  vm.runInContext(read("js/simple/migration.js"), ctx);
  ctx._mem = mem;
  return ctx;
}

function daysAgoYmd(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

const LEGACY_FULL = {
  transform_goal: { date: "2026-07-01T10:00:00Z", current_kg: 94, target_kg: 80, height_cm: 182, exp: "mid", days: 3, mode: "natural", equip: "gym", age: 34, activity: "leicht" },
  check_result: { date: "2026-07-02T10:00:00Z", total: 61, bottleneck: { key: "recovery", domain: "recovery" }, flags: [] },
  c2_start: daysAgoYmd(38),                       // Woche 6
  c2_goal: "recomp", c2_daily: { d1: { p: 1 } }, c2_pulse: [{ week: 1 }],
  os_profile: { identity: { age: 34, height: 182 }, training: { experience: "intermediate", daysPerWeek: 5, minutes: 45, location: "gym" }, nutrition: { mealsPerDay: 3, cookMinutes: 20, dietStyle: "misch" } },
  os_metrics: [{ type: "weight", value: 94, unit: "kg", date: "2026-07-01", source: "manual" }],
  os_training_plan: { split: "fb3" }
};

group("Erkennung");
{
  const c = sandbox(LEGACY_FULL);
  const d = c.MMSimple.migration.detect();
  ok(d.hasLegacy && d.activeProgram, "Bestandsnutzer mit aktivem Programm erkannt");
  ok(d.programDay >= 36 && d.programDay <= 40, "Programmtag berechnet (Woche 6: Tag " + d.programDay + ")");
  ok(d.hasTransform && d.hasScore, "Transformation + Score erkannt");
  const c2 = sandbox({});
  ok(!c2.MMSimple.migration.detect().hasLegacy, "neuer Nutzer: keine Legacy-Daten");
  const c3 = sandbox({ check_result: LEGACY_FULL.check_result });
  const d3 = c3.MMSimple.migration.detect();
  ok(d3.hasLegacy && !d3.activeProgram, "Bestandsnutzer ohne Programm (nur Score)");
}

group("Snapshot — vollständig, mit Checksummen, ohne Bilddaten");
{
  const c = sandbox(LEGACY_FULL);
  const before = JSON.stringify(c._mem);
  const r = c.MMSimple.migration.captureSnapshot({ now: "2026-08-06T12:00:00Z" });
  ok(r.ok && !r.existed, "Snapshot erzeugt");
  const s = r.snapshot;
  ok(s.legacyProgramState && s.legacyProgramState.c2_start === LEGACY_FULL.c2_start, "Programmzustand gesichert");
  ok(s.legacyTransformation && s.legacyScore && s.legacyProgress && s.legacyPreferences, "alle Bereiche gesichert");
  ok(Object.keys(s.sourceChecksums).length >= 8, "Checksummen je Quelle (" + Object.keys(s.sourceChecksums).length + ")");
  ok(s.migrationWarnings.some(w => w.indexOf("Tag") >= 0), "Warnung: laufendes Programm Woche 6");
  ok(JSON.stringify(s).indexOf("photo") < 0, "keine Bilddaten im Snapshot");
  // NICHT-DESTRUKTIV: Originale byte-identisch (nur neue mm_legacy_snapshot-Zeile kam dazu)
  const after = JSON.parse(JSON.stringify(c._mem));
  delete after.mm_legacy_snapshot;
  ok(JSON.stringify(after) === before, "Legacy-Originale unverändert (byte-identisch)");
}

group("Idempotenz — Migration zweimal gestartet");
{
  const c = sandbox(LEGACY_FULL);
  const r1 = c.MMSimple.migration.captureSnapshot({ now: "2026-08-06T12:00:00Z" });
  const r2 = c.MMSimple.migration.captureSnapshot({ now: "2026-08-07T12:00:00Z" });
  ok(r2.ok && r2.existed && r2.snapshot.id === r1.snapshot.id, "zweiter Lauf überschreibt den Snapshot nicht");
}

group("Vorbefüllung — zuverlässig übernehmen, Unsicheres fragen");
{
  const c = sandbox(LEGACY_FULL);
  const p = c.MMSimple.migration.prefillFromLegacy();
  ok(p.answers.age === 34 && p.answers.experience === "mid" && p.answers.location === "gym", "Profil-Daten übernommen");
  ok(p.answers.daysPerWeek === 4, "5 Wunschtage → auf Gen-2-Maximum 4 gekappt");
  ok(p.answers.maxSessionMinutes === 45 && p.answers.mealCount === 3, "Zeit + Mahlzeiten übernommen");
  ok(p.open.indexOf("weekdays") >= 0, "Wochentage bleiben offene Frage (nie erfunden)");
  const c2 = sandbox({ check_result: LEGACY_FULL.check_result });
  const p2 = c2.MMSimple.migration.prefillFromLegacy();
  ok(Object.keys(p2.answers).length === 0 && p2.open.indexOf("age") >= 0, "fehlende Daten → offene Fragen statt Standardwerte");
}

group("Status + Rücknahme (§27.5)");
{
  const c = sandbox(LEGACY_FULL);
  const snap = c.MMSimple.migration.captureSnapshot({ now: "2026-08-06T12:00:00Z" }).snapshot;
  // Plan simulieren
  const plan = c.MMSimple.model.emptyPlan();
  plan.id = "plan:test"; plan.status = "active"; plan.version = 1;
  c.MM.store.set("simple_plan", plan);
  const st = c.MMSimple.migration.markMigrated(plan, snap);
  ok(st.status === "migrated" && st.planId === "plan:test" && st.snapshotId === snap.id, "Status: Migration, Plan-ID, Snapshot-ID, Version");
  ok(Array.isArray(st.warnings) && st.warnings.length >= 1, "Warnungen im Status");

  const r = c.MMSimple.migration.revert("admin");
  ok(r.ok, "Rücknahme läuft");
  ok(c.MM.store.get("simple_plan", null).status === "paused", "Gen-2-Plan pausiert, nicht gelöscht");
  ok(c.MMSimple.migration.status().status === "reverted" && c.MMSimple.migration.status().revertReason === "admin", "Status: reverted (durch Admin)");
  ok(c.MM.store.get("flags_user", {}).simpleAppDefault === false, "Nutzer-Flag: klassische Ansicht wieder Standard");
  ok(c.MM.store.get("legacy_snapshot", null) != null, "Snapshot bleibt erhalten");
  ok(c.MM.store.get("c2_start", null) === LEGACY_FULL.c2_start, "Legacy-Programm unangetastet");
}

console.log("\n" + (failed ? "FAILED" : "OK") + " — " + passed + " bestanden, " + failed + " fehlgeschlagen");
process.exit(failed ? 1 : 0);
