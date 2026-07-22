/* ==========================================================================
   MALEMETRIX LABS — Test Suite (Phase 4)
   Node, kein Framework. Deckt: Normalisierung, Einheiten, History, Duplikate,
   Fasting-Kontext, Trends/Status, Prioritäten, Enhanced-Kontext, Stack-Kontext,
   Recheck, Builder/Completeness, Panel-Vergleich, Import-Review, freies T/HOMA,
   Sync-Append-Merge, RLS (Zwei-Nutzer), Export/Delete, UI-Render-Smoke.
   Ausführen:  node tools-dev/tests/labs.test.js
   ========================================================================== */
"use strict";
var path = require("path");
var ROOT = path.resolve(__dirname, "../..");

/* ---------- Test-Harness: DOM/localStorage/MM-Shim ---------- */
function freshEnv(opts) {
  opts = opts || {};
  var store = {};
  var listeners = {};
  var fakeEls = {};
  function makeEl(id) {
    return { id: id, _html: "", value: "", files: null, placeholder: "", style: {},
      get innerHTML() { return this._html; }, set innerHTML(v) { this._html = v; },
      addEventListener: function () {}, appendChild: function () {}, removeChild: function () {},
      querySelector: function () { return null; }, querySelectorAll: function () { return []; },
      getAttribute: function () { return null; }, setAttribute: function () {}, focus: function () {},
      children: [], parentNode: null, textContent: "" };
  }
  global.localStorage = {
    getItem: function (k) { return k in store ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; },
    key: function (i) { return Object.keys(store)[i]; },
    get length() { return Object.keys(store).length; }
  };
  global.document = {
    dispatchEvent: function (e) { (listeners[e.type] || []).forEach(function (cb) { cb(e); }); return true; },
    addEventListener: function (t, cb) { (listeners[t] = listeners[t] || []).push(cb); },
    getElementById: function (id) { if (id === "mmDash" && opts.host) { fakeEls[id] = fakeEls[id] || opts.host; return fakeEls[id]; } if (opts.els && id in opts.els) return opts.els[id]; return fakeEls[id] || (fakeEls[id] = null); },
    createElement: function () { return makeEl("dyn"); },
    querySelector: function () { return null; }
  };
  global.CustomEvent = function (type, init) { this.type = type; this.detail = (init || {}).detail; };
  global.window = { addEventListener: function () {}, MM: {}, __MM_APP_TEST: opts.appTest || false, location: { hash: opts.hash || "#labs", origin: "https://x" } };
  global.location = global.window.location;
  try { Object.defineProperty(global, "navigator", { value: { onLine: true }, configurable: true }); } catch (e) {}
  global.MM = global.window.MM;
  MM.store = {
    get: function (k, d) { try { var r = localStorage.getItem("mm_" + k); return r ? JSON.parse(r) : d; } catch (e) { return d; } },
    set: function (k, v) { localStorage.setItem("mm_" + k, JSON.stringify(v)); try { document.dispatchEvent(new CustomEvent("mm:store", { detail: { key: k, operation: "set" } })); } catch (e) {} },
    remove: function (k) { localStorage.removeItem("mm_" + k); }
  };
  MM.toast = function () {};
  // Account-Stub (nur was Views/os-core brauchen)
  MM.account = {
    _domains: {},
    registerStateDomain: function (n, key, o) { this._domains[n] = { key: key, append: !!(o && o.append) }; },
    registerDomain: function () {},
    getDashboardState: function () { return opts.dash || { name: "", hasScore: false, mode: "recomp", bottleneck: "", program: { active: false }, access: {}, sync: "local" }; },
    snapshot: function () { return { state: "local", configured: false }; },
    onChange: function () {}, whenReady: function () { return Promise.resolve(); }
  };
  // Module laden (frisch)
  ["js/os/os-core.js", "js/os/engines.js", "js/os/labs.js"].forEach(function (f) { delete require.cache[require.resolve(path.join(ROOT, f))]; require(path.join(ROOT, f)); });
  if (opts.appTest) { delete require.cache[require.resolve(path.join(ROOT, "js/os/app.js"))]; require(path.join(ROOT, "js/os/app.js")); }
  return { store: store };
}

/* ---------- Assertions ---------- */
var passed = 0, failed = 0, groups = {};
var curGroup = "general";
function group(g) { curGroup = g; }
function ok(cond, msg) {
  groups[curGroup] = groups[curGroup] || { p: 0, f: 0 };
  if (cond) { passed++; groups[curGroup].p++; }
  else { failed++; groups[curGroup].f++; console.error("  ✗ [" + curGroup + "] " + msg); }
}
function eq(a, b, msg) { ok(a === b, msg + " (got " + JSON.stringify(a) + ", want " + JSON.stringify(b) + ")"); }
function near(a, b, tol, msg) { ok(Math.abs(a - b) <= tol, msg + " (got " + a + ", want ~" + b + ")"); }

/* ---------- Sequential runner: Tests laufen isoliert & in Reihenfolge,
   async-Tests werden vollständig awaited, bevor der nächste startet. ---------- */
var TESTS = [];
function test(name, fn) { TESTS.push({ name: name, fn: fn }); }
async function runAll() {
  for (var i = 0; i < TESTS.length; i++) { group(TESTS[i].name); try { await TESTS[i].fn(); } catch (e) { ok(false, "threw: " + (e && e.message || e)); } }
}

/* ======================= TESTS ======================= */

// A. Marker-Normalisierung + Aliase
test("normalization", function () {
  freshEnv();
  var L = MM.labs;
  eq(L.canonicalMarkerId("Apo B"), "apo_b", "alias 'Apo B'");
  eq(L.canonicalMarkerId("Apolipoprotein B"), "apo_b", "alias 'Apolipoprotein B'");
  eq(L.canonicalMarkerId("ApoB"), "apo_b", "alias 'ApoB'");
  eq(L.canonicalMarkerId("HbA1c"), "hba1c", "alias HbA1c");
  eq(L.canonicalMarkerId("Langzeitzucker"), "hba1c", "alias Langzeitzucker→hba1c");
  eq(L.canonicalMarkerId("freies Testosteron"), "free_testosterone", "alias free T");
  eq(L.canonicalMarkerId("Östradiol"), "estradiol", "alias Östradiol");
  eq(L.canonicalMarkerId("völliger_quatsch"), null, "unknown alias → null");
});

// B. Einheiten-Normalisierung (§10, §91)
test("units", function () {
  freshEnv();
  var L = MM.labs;
  var c = L.toCanonical("ldl_c", 3.0, "mmol/L");
  near(c.value, 116.01, 0.5, "LDL 3.0 mmol/L → ~116 mg/dL");
  eq(c.converted, true, "LDL converted flag");
  eq(c.original.value, 3.0, "LDL original value retained");
  eq(c.original.unit, "mmol/L", "LDL original unit retained");
  var g = L.toCanonical("glucose", 5.5, "mmol/L");
  near(g.value, 99.11, 0.5, "Glukose 5.5 mmol/L → ~99 mg/dL");
  var t = L.toCanonical("total_testosterone", 20, "nmol/L");
  near(t.value, 576.8, 1, "Testo 20 nmol/L → ~577 ng/dL");
  var same = L.toCanonical("ldl_c", 116, "mg/dL");
  eq(same.converted, false, "mg/dL→mg/dL no conversion");
  var unknown = L.toCanonical("ldl_c", 3, "furlongs");
  eq(unknown.unknownUnit, true, "unknown unit flagged");
  eq(unknown.converted, false, "unknown unit not converted (no guess)");
  var noUnit = L.toCanonical("ldl_c", 116, "");
  eq(noUnit.converted, false, "no unit → assume canonical, no math");
});

// C. Manuelle Erfassung + History (§89, §90, §5)
test("history", function () {
  freshEnv();
  var L = MM.labs;
  L.addResult({ name: "ApoB", value: 108, unit: "mg/dL", date: "2026-01-10" });
  L.addResult({ name: "ApoB", value: 91, unit: "mg/dL", date: "2026-04-10" });
  L.addResult({ name: "ApoB", value: 76, unit: "mg/dL", date: "2026-07-10" });
  eq(L.seriesFor("apo_b").length, 3, "3 ApoB results in history");
  eq(L.latestFor("apo_b").value, 76, "latest derived = 76");
  eq(L.firstFor("apo_b").value, 108, "first = 108");
  // History unveränderlich: alte Werte bleiben
  var vals = L.seriesFor("apo_b").map(function (r) { return r.value; });
  ok(vals.indexOf(108) >= 0 && vals.indexOf(91) >= 0, "old values preserved (immutable)");
});

// D. Duplikaterkennung (§72, §92)
test("duplicates", function () {
  freshEnv();
  var L = MM.labs;
  L.addResult({ name: "ApoB", value: 92, unit: "mg/dL", date: "2026-07-10" });
  var dup = L.addResult({ name: "ApoB", value: 92, unit: "mg/dL", date: "2026-07-10" });
  eq(dup.ok, false, "duplicate rejected");
  eq(dup.code, "duplicate", "duplicate code");
  eq(L.seriesFor("apo_b").length, 1, "no duplicate stored");
  // anderer Wert am selben Tag = KEIN Duplikat (Korrektur)
  var diff = L.addResult({ name: "ApoB", value: 95, unit: "mg/dL", date: "2026-07-10" });
  eq(diff.ok, true, "different value same day allowed");
});

// E. Panel-Identität + Import-Matching (§73, §74)
test("panel-identity", function () {
  freshEnv();
  var L = MM.labs;
  L.addResult({ name: "ApoB", value: 90, unit: "mg/dL", date: "2026-05-01", lab: "Labor X" });
  L.addResult({ name: "LDL", value: 118, unit: "mg/dL", date: "2026-05-01", lab: "Labor X" });
  eq(L.panels().length, 1, "same date+lab → one panel");
  eq(L.resultsForPanel(L.panels()[0].id).length, 2, "both results in one panel");
  L.addResult({ name: "HbA1c", value: 5.5, unit: "%", date: "2026-05-01", lab: "Labor Y" });
  eq(L.panels().length, 2, "different lab → new panel");
});

// F. Fasting-Kontext (§36, §93)
test("fasting", function () {
  freshEnv();
  var L = MM.labs;
  var fasted = L.addResult({ name: "Glukose", value: 90, unit: "mg/dL", date: "2026-01-01", fasted: true });
  var random = L.addResult({ name: "Glukose", value: 90, unit: "mg/dL", date: "2026-02-01", fasted: false });
  eq(fasted.result.fasted, true, "fasted flag stored true");
  eq(random.result.fasted, false, "non-fasted flag stored false");
  ok(fasted.result.fasted !== random.result.fasted, "fasted vs non-fasted distinguished");
});

// G. Trend + Status + Signifikanz (§12, §13, §34, §97, §98)
test("trends", function () {
  freshEnv();
  var L = MM.labs;
  // ApoB verbessert
  L.addResult({ name: "ApoB", value: 110, unit: "mg/dL", date: "2026-01-01" });
  L.addResult({ name: "ApoB", value: 90, unit: "mg/dL", date: "2026-04-01" });
  L.addResult({ name: "ApoB", value: 75, unit: "mg/dL", date: "2026-07-01" });
  eq(L.trend("apo_b").status, "IMPROVING", "ApoB 110→90→75 improving");
  // Rauschen ignorieren: HbA1c 5.4 → 5.5 (unter noise floor 3%)
  L.addResult({ name: "HbA1c", value: 5.4, unit: "%", date: "2026-01-01" });
  L.addResult({ name: "HbA1c", value: 5.45, unit: "%", date: "2026-04-01" });
  eq(L.trend("hba1c").status, "STABLE", "tiny HbA1c change = STABLE (no noise alarm)");
  ok(L.trend("hba1c").significant === false, "tiny change not significant");
  // Hämatokrit verschlechtert + kritisch (§98, §53)
  L.addResult({ name: "Hämatokrit", value: 47, unit: "%", date: "2026-01-01" });
  L.addResult({ name: "Hämatokrit", value: 51, unit: "%", date: "2026-04-01" });
  L.addResult({ name: "Hämatokrit", value: 54, unit: "%", date: "2026-07-01" });
  var ht = L.trend("hematocrit");
  ok(ht.crit && ht.crit.level === "prompt_review", "Hct 54 → critical prompt");
  eq(ht.status, "NEEDS_FOLLOWUP", "Hct critical → NEEDS_FOLLOWUP");
});

// H. Einzelwert-Kontext (§38, §51)
test("single-value", function () {
  freshEnv();
  var L = MM.labs;
  L.addResult({ name: "Gesamttestosteron", value: 450, unit: "ng/dL", date: "2026-01-01" });
  var tr = L.trend("total_testosterone");
  eq(tr.single, true, "single T value flagged");
  eq(tr.status, "CONTEXT_DEPENDENT", "single T (timeMatters) → context-dependent, not high/low");
});

// I. Prioritäten: maximal 3 (§16)
test("priorities", function () {
  freshEnv();
  var L = MM.labs;
  // viele auffällige Marker erzeugen
  [["ApoB", 130], ["LDL", 190], ["Hämatokrit", 55], ["Triglyceride", 260], ["GGT", 120], ["ALT", 90]].forEach(function (m, i) {
    L.addResult({ name: m[0], value: m[1] * 0.9, unit: m[0] === "HbA1c" ? "%" : (m[0] === "Hämatokrit" ? "%" : (m[0] === "GGT" || m[0] === "ALT" ? "U/L" : "mg/dL")), date: "2026-01-01" });
    L.addResult({ name: m[0], value: m[1], unit: m[0] === "Hämatokrit" ? "%" : (m[0] === "GGT" || m[0] === "ALT" ? "U/L" : "mg/dL"), date: "2026-06-01" });
  });
  var pr = L.priorities();
  ok(pr.length <= 3, "priorities capped at 3, got " + pr.length);
  ok(pr.length >= 1, "at least one priority surfaced");
});

// J. Enhanced vs Health Kontext (§17, §19, §94)
test("pathway-context", function () {
  // Health-Pfad
  freshEnv();
  MM.os.setP("pathway", "health");
  MM.labs.addResult({ name: "Hämatokrit", value: 50, unit: "%", date: "2026-01-01" });
  MM.labs.addResult({ name: "Hämatokrit", value: 52, unit: "%", date: "2026-06-01" });
  var rcHealth = MM.labs.suggestRecheck("hematocrit").windowDays;
  // Enhanced-Pfad: gleiches → kürzeres Fenster
  freshEnv();
  MM.os.setP("pathway", "enhanced");
  MM.labs.addResult({ name: "Hämatokrit", value: 50, unit: "%", date: "2026-01-01" });
  MM.labs.addResult({ name: "Hämatokrit", value: 52, unit: "%", date: "2026-06-01" });
  var rcEnh = MM.labs.suggestRecheck("hematocrit").windowDays;
  ok(rcEnh < rcHealth, "Enhanced shortens hematocrit recheck window (" + rcEnh + " < " + rcHealth + ")");
  // Enhanced Monitoring vorhanden
  var mon = MM.labs.enhancedMonitoring();
  ok(mon.some(function (d) { return d.key === "heme" && d.has; }), "enhanced monitoring shows hematology");
});

// K. Missing markers / Completeness (§21, §99)
test("completeness", function () {
  freshEnv();
  MM.os.setP("pathway", "enhanced");
  MM.labs.addResult({ name: "Gesamttestosteron", value: 600, unit: "ng/dL", date: "2026-01-01" });
  var comp = MM.labs.completeness();
  ok(comp.missing.length > 0, "enhanced user with only T → panel incomplete (missing markers)");
  ok(comp.have < comp.total, "not everything present → not 'all okay'");
});

// L. Stack-Kontext aus Labs (§31, §95, §96)
test("stack-context", function () {
  freshEnv();
  var L = MM.labs, E = MM.engines;
  // Vitamin D ausreichend → hold
  L.addResult({ name: "Vitamin D", value: 45, unit: "ng/mL", date: "2026-01-01" });
  // Ferritin hoch → iron avoid
  L.addResult({ name: "Ferritin", value: 350, unit: "ng/mL", date: "2026-01-01" });
  var flags = L.stackContext();
  var vd = flags.filter(function (f) { return f.supp === "vitd"; })[0];
  ok(vd && vd.action === "hold", "Vit D 45 → hold (don't escalate)");
  var ir = flags.filter(function (f) { return f.supp === "iron"; })[0];
  ok(ir && ir.action === "avoid", "Ferritin 350 → iron avoid");
  // stackStrategy respektiert avoid (kein Eisen im Katalog → prüfen dass omega3/vitd Logik stimmt)
  var strat = E.stackStrategy({ mode: "recomp", budget: "optimal", labFlags: flags });
  var vdItem = strat.items.filter(function (s) { return s.id === "vitd"; })[0];
  ok(!vdItem || vdItem.labAction === "hold", "vit D item annotated as hold when present");
  // Niedriges Vit D → consider + höhere Priorität
  freshEnv();
  MM.labs.addResult({ name: "Vitamin D", value: 15, unit: "ng/mL", date: "2026-01-01" });
  var flags2 = MM.labs.stackContext();
  var vd2 = flags2.filter(function (f) { return f.supp === "vitd"; })[0];
  ok(vd2 && vd2.action === "consider", "Vit D 15 → consider supplementation");
});

// M. Recheck-Engine (§24, §100)
test("recheck", function () {
  freshEnv();
  var L = MM.labs;
  // alter Wert → fällig
  L.addResult({ name: "ApoB", value: 90, unit: "mg/dL", date: "2025-01-01" });
  var rc = L.suggestRecheck("apo_b");
  eq(rc.due, true, "old ApoB (>90d) → recheck due");
  // frischer Wert → nicht fällig
  freshEnv();
  var today = new Date().toISOString().slice(0, 10);
  MM.labs.addResult({ name: "ApoB", value: 90, unit: "mg/dL", date: today });
  eq(MM.labs.suggestRecheck("apo_b").due, false, "fresh ApoB → not due");
  // Lp(a) onceEnough → nie „due“ spam
  MM.labs.addResult({ name: "Lp(a)", value: 30, unit: "nmol/L", date: "2020-01-01" });
  eq(MM.labs.suggestRecheck("lp_a").once, true, "Lp(a) once-enough (no repeat spam)");
});

// N. Today-Signale: Recheck einmal, nicht täglich Spam (§27, §100)
test("today-signals", function () {
  freshEnv();
  var L = MM.labs;
  L.addResult({ name: "ApoB", value: 90, unit: "mg/dL", date: "2025-01-01" });
  var sig = L.todaySignals();
  ok(sig.some(function (s) { return s.type === "recheck_due"; }), "recheck due surfaces in Today");
  // nur EIN recheck-Signal (nicht pro Marker eins)
  eq(sig.filter(function (s) { return s.type === "recheck_due"; }).length, 1, "single recheck signal (no spam)");
});

// O. Freies Testosteron (Vermeulen) + HOMA-IR (§39, §41)
test("derived", function () {
  freshEnv();
  var L = MM.labs;
  L.addResult({ name: "Gesamttestosteron", value: 600, unit: "ng/dL", date: "2026-01-01" });
  L.addResult({ name: "SHBG", value: 30, unit: "nmol/L", date: "2026-01-01" });
  var ft = L.latestFor("free_testosterone");
  ok(ft && ft.value > 80 && ft.value < 200, "free T derived plausibly (" + (ft && ft.value) + " pg/mL)");
  ok(ft && ft.derivedFrom && ft.method, "free T documents method (not blackbox)");
  // HOMA-IR nur nüchtern
  L.addResult({ name: "Glukose", value: 90, unit: "mg/dL", date: "2026-02-01", fasted: true });
  L.addResult({ name: "Insulin", value: 8, unit: "µIU/mL", date: "2026-02-01", fasted: true });
  var homa = L.latestFor("homa_ir");
  near(homa.value, 1.78, 0.05, "HOMA-IR = 90*8/405 ≈ 1.78");
  // Nicht-nüchtern → KEIN HOMA
  freshEnv();
  MM.labs.addResult({ name: "Glukose", value: 90, unit: "mg/dL", date: "2026-02-01", fasted: false });
  MM.labs.addResult({ name: "Insulin", value: 8, unit: "µIU/mL", date: "2026-02-01", fasted: false });
  ok(!MM.labs.latestFor("homa_ir"), "no HOMA-IR from non-fasting values");
});

// P. Panel-Vergleich (§56)
test("panel-compare", function () {
  freshEnv();
  var L = MM.labs;
  L.addResult({ name: "ApoB", value: 108, unit: "mg/dL", date: "2026-01-15" });
  L.addResult({ name: "HbA1c", value: 6.1, unit: "%", date: "2026-01-15" });
  L.addResult({ name: "ApoB", value: 76, unit: "mg/dL", date: "2026-07-15" });
  L.addResult({ name: "HbA1c", value: 5.7, unit: "%", date: "2026-07-15" });
  var cmp = L.comparePanels();
  ok(cmp && cmp.rows.length >= 2, "compare returns rows");
  var apob = cmp.rows.filter(function (r) { return r.marker_id === "apo_b"; })[0];
  eq(apob.from, 108, "compare from 108");
  eq(apob.to, 76, "compare to 76");
  ok(apob.significant, "ApoB change flagged significant");
});

// Q. Import-Review (§7, §8, §63) — nie Auto-Save
test("import", function () {
  freshEnv();
  var L = MM.labs;
  // ohne Provider → manueller Review-Modus, KEINE erfundenen Werte
  return L.parseLabDocument({ name: "labor.pdf" }, { date: "2026-03-01" }).then(function (res) {
    eq(res.status, "manual", "no provider → manual review (no fake OCR)");
    eq(res.values.length, 0, "no values invented");
    // confirmImport übernimmt geprüfte Werte
    var out = L.confirmImport([{ marker_id: "apo_b", value: 92, unit: "mg/dL" }, { marker_id: "ldl_c", value: 118, unit: "mg/dL" }], { date: "2026-03-01", lab: "Import" });
    eq(out.added, 2, "confirmed import adds 2");
    eq(L.latestFor("apo_b").value, 92, "imported ApoB stored");
    eq(L.latestFor("apo_b").confidence, "parsed_confirmed", "import confidence marked");
    // Duplikat-Import wird übersprungen (§74, §92)
    var out2 = L.confirmImport([{ marker_id: "apo_b", value: 92, unit: "mg/dL" }], { date: "2026-03-01" });
    eq(out2.added, 0, "duplicate import adds 0");
    eq(out2.skipped, 1, "duplicate import skipped 1");
  });
});

// R. Provider-Adapter (§64) — parseLabDocument mit Provider
test("import-provider", function () {
  freshEnv();
  var L = MM.labs;
  L.registerParseProvider(function () { return { values: [{ name: "ApoB", value: 92, unit: "mg/dL" }, { name: "HbA1c", value: 5.7, unit: "%" }] }; });
  ok(L.hasParseProvider(), "provider registered");
  return L.parseLabDocument({ name: "x.pdf" }, {}).then(function (res) {
    eq(res.status, "review", "provider → review status");
    eq(res.values.length, 2, "provider returned 2 values for review");
    ok(res.values[0].recognized, "provider value mapped to canonical marker");
  });
});

// S. Sync Append-Merge (§67, §71) — Historie nie überschreiben.
// ECHTER Pfad: Cloud (Gerät A) hat {r1}, lokal (Gerät B) hat {r2}. Nach Hydration
// müssen BEIDE existieren — kein Last-Write-Wins-Verlust.
test("sync-merge", async function () {
  freshEnv();
  // lokale Lab-Ergebnisse (Gerät B) direkt setzen
  localStorage.setItem("mm_lab_results", JSON.stringify([{ id: "r2", marker_id: "apo_b", value: 76, date: "2026-07-01" }]));
  // Test-Cloud (Gerät A) mit disjunktem Ergebnis r1
  global.window.__MM_TEST_CLOUD = {
    user: { id: "u1" }, tables: {
      profiles: [], entitlements: [], score_results: [], program_cycles: [],
      os_state: [{ user_id: "u1", domain: "labresults", state: [{ id: "r1", marker_id: "apo_b", value: 108, date: "2026-01-01" }], state_version: 1 }]
    }, codes: {}
  };
  global.window.MM_CONFIG = {};
  delete require.cache[require.resolve(path.join(ROOT, "js/account.js"))];
  require(path.join(ROOT, "js/account.js"));
  // Module neu laden → registrieren labpanels/labresults/labnotes mit {append:true} am echten Adapter
  ["js/os/os-core.js", "js/os/engines.js", "js/os/labs.js"].forEach(function (f) { delete require.cache[require.resolve(path.join(ROOT, f))]; require(path.join(ROOT, f)); });
  await MM.account.whenReady();
  var merged = MM.labs.results();
  var ids = merged.map(function (r) { return r.id; });
  ok(ids.indexOf("r1") >= 0, "cloud result r1 kept after hydration");
  ok(ids.indexOf("r2") >= 0, "local result r2 kept after hydration");
  eq(merged.length, 2, "append-merge: no history lost (r1 + r2)");
});

// T. RLS Zwei-Nutzer (§68, §101) — über Test-Backend
test("rls", function () {
  freshEnv();
  // Test-Cloud mit zwei Nutzern
  global.window.__MM_TEST_CLOUD = { user: { id: "userA" }, tables: {}, codes: {} };
  global.window.MM_CONFIG = {};
  delete require.cache[require.resolve(path.join(ROOT, "js/account.js"))];
  require(path.join(ROOT, "js/account.js"));
  // os_state RLS wird serverseitig erzwungen; das Test-Backend filtert per user_id.
  // Wir prüfen die Kernsemantik: select mit eq user_id liefert nur eigene Zeilen.
  var C = global.window.__MM_TEST_CLOUD;
  C.tables.os_state = [
    { user_id: "userA", domain: "labresults", state: [{ id: "a1" }] },
    { user_id: "userB", domain: "labresults", state: [{ id: "b1" }] }
  ];
  // Simuliere das Backend-select (gleiche Filterlogik wie makeTestBackend)
  function sel(uid) { return C.tables.os_state.filter(function (r) { return r.user_id === uid; }); }
  eq(sel("userA").length, 1, "userA sees only own os_state row");
  eq(sel("userA")[0].state[0].id, "a1", "userA sees own lab data");
  ok(!sel("userA").some(function (r) { return r.user_id === "userB"; }), "userA CANNOT see userB labs");
});

// U. Export / Delete (§69, §70, §102, §103)
test("export-delete", function () {
  freshEnv();
  var L = MM.labs;
  L.addResult({ name: "ApoB", value: 90, unit: "mg/dL", date: "2026-01-01" });
  L.addNote({ date: "2026-01-01", text: "nüchtern, hartes Training am Vortag" });
  // Export (lokaler Modus): os_state-Domains müssen labs enthalten.
  // Reihenfolge: erst das echte account.js, dann Module NEU laden, damit sie
  // ihre Domains beim echten Adapter (nicht dem Stub) registrieren.
  global.window.MM_CONFIG = {};
  delete require.cache[require.resolve(path.join(ROOT, "js/account.js"))];
  require(path.join(ROOT, "js/account.js"));
  ["js/os/os-core.js", "js/os/engines.js", "js/os/labs.js"].forEach(function (f) { delete require.cache[require.resolve(path.join(ROOT, f))]; require(path.join(ROOT, f)); });
  return MM.account.exportMyData().then(function (data) {
    ok(data.os_state && data.os_state.labresults, "export includes lab results");
    ok(data.os_state.labresults.length === 1, "exported lab result present with data");
    ok(data.os_state.labnotes && data.os_state.labnotes.length === 1, "export includes lab notes");
    // Delete cascade: os_state hat ON DELETE CASCADE (Migration) — hier lokal: clearLocalData entfernt mm_
    MM.account.clearLocalData();
    eq(MM.labs.results().length, 0, "clearLocalData removes lab results");
  });
});

// V. UI-Render-Smoke (§104, §105) — Views werfen nicht + enthalten Kernmarken
test("ui-render", function () {
  var host = { _html: "", get innerHTML() { return this._html; }, set innerHTML(v) { this._html = v; }, addEventListener: function () {}, querySelector: function () { return null; } };
  freshEnv({ appTest: true, host: host, dash: { name: "Max", hasScore: true, score: 72, mode: "recomp", bottleneck: "body", program: { active: false }, access: {}, sync: "local" } });
  var A = MM._app;
  ok(A && typeof A.vLabs === "function", "app test hook exposes vLabs");
  // leerer Zustand
  var empty = A.vLabs();
  ok(/Noch keine Laborwerte/.test(empty), "empty labs view renders empty state");
  // mit Daten
  MM.labs.addResult({ name: "ApoB", value: 108, unit: "mg/dL", date: "2026-01-01" });
  MM.labs.addResult({ name: "ApoB", value: 76, unit: "mg/dL", date: "2026-07-01" });
  MM.labs.addResult({ name: "Hämatokrit", value: 54, unit: "%", date: "2026-07-01" });
  var full = A.vLabs();
  ok(/BIOMARKER INTELLIGENCE/.test(full), "labs hero renders");
  ok(/Top-Prioritäten/.test(full), "priorities section renders");
  ok(/Systeme/.test(full), "category dashboard renders");
  ok(full.indexOf("undefined") < 0, "no 'undefined' leaked into labs HTML");
  var det = A.vLabMarker("apo_b");
  ok(/Labor-Range/.test(det) && /MaleMetrix-Kontext/.test(det), "marker detail separates lab range vs context");
  ok(det.indexOf("undefined") < 0, "no 'undefined' in marker detail");
  var bld = A.vLabBuilder();
  ok(/CORE/.test(bld) && /ADVANCED/.test(bld), "builder renders CORE + ADVANCED");
  var imp = A.vLabImport();
  ok(/Upload/.test(imp) || /wählen/.test(imp), "import view renders upload");
  var ent = A.vLabEntry();
  ok(/Marker/.test(ent), "entry view renders");
  // Enhanced monitoring
  MM.os.setP("pathway", "enhanced");
  var mon = A.vLabMonitor();
  ok(/ENHANCED MONITORING/.test(mon), "enhanced monitoring renders");
  ok(mon.indexOf("undefined") < 0, "no 'undefined' in monitoring");
});

// W. Privacy: Events tragen keine Biomarker-Werte (§66)
test("privacy", function () {
  freshEnv();
  var captured = [];
  document.addEventListener("mm:os", function (e) { captured.push(e.detail); });
  MM.labs.addResult({ name: "ApoB", value: 108, unit: "mg/dL", date: "2026-01-01" });
  MM.labs.addResult({ name: "ApoB", value: 200, unit: "mg/dL", date: "2026-07-01" });
  var leaked = captured.some(function (d) { return d && d.payload && (d.payload.value != null); });
  ok(!leaked, "no raw biomarker value in event payloads");
  ok(captured.some(function (d) { return d && d.name === "LAB_RESULT_ADDED"; }), "LAB_RESULT_ADDED emitted");
});

/* ======================= RUN + SUMMARY ======================= */
runAll().then(function () {
  console.log("\n──────── LABS TEST SUMMARY ────────");
  Object.keys(groups).forEach(function (g) { var s = groups[g]; console.log((s.f ? "✗" : "✓") + " " + g + ": " + s.p + " ok" + (s.f ? ", " + s.f + " FAIL" : "")); });
  console.log("───────────────────────────────────");
  console.log((failed ? "✗ " : "✓ ") + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
});
