/* ==========================================================================
   MALEMETRIX P0 — APPEND-SYNC: Verhaltenstests
   registerStateDomain(name, key, { append:true }) muss Historien-Domains
   (intel_decisions, intel_reviews, …) beim Multi-Device-Sync VEREINIGEN
   statt als Blob zu überschreiben. Diese Suite lädt das echte js/account.js
   in Node mit dem Test-Backend (window.__MM_TEST_CLOUD) und friert ein:
     · Hydration: Cloud neuer + lokal synced ⇒ lokale Extra-Einträge bleiben
       erhalten (Union) und werden zum Re-Upload vorgemerkt
     · Flush: lokal dirty ⇒ Cloud-Einträge, die lokal fehlen, werden vor dem
       Upload übernommen (kein Löschen fremder Geräte-Historie)
     · Nicht-Append-Domains behalten exakt das alte Last-write-wins-Verhalten
   Ausführen:  node tools-dev/tests/append-merge.test.js
   ========================================================================== */
"use strict";
var path = require("path");
var ROOT = path.resolve(__dirname, "../..");

var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function ids(arr) { return (arr || []).map(function (e) { return e && e.id; }).sort().join(","); }

/* ---- Minimal-Browser-Umgebung + Test-Cloud (Muster: user-state.test.js) ---- */
function freshEnv(cloud) {
  var store = {};
  global.localStorage = {
    getItem: function (k) { return k in store ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; },
    get length() { return Object.keys(store).length; },
    key: function (i) { return Object.keys(store)[i]; }
  };
  global.document = { addEventListener: function () {}, dispatchEvent: function () {}, getElementById: function () { return null; }, hidden: false };
  global.CustomEvent = function (t, i) { this.type = t; this.detail = (i || {}).detail; };
  global.window = { addEventListener: function () {}, location: { origin: "https://x", hash: "" }, MM: {}, __MM_TEST_CLOUD: cloud };
  global.MM = global.window.MM;
  MM.store = {
    get: function (k, d) { try { var r = localStorage.getItem("mm_" + k); return r != null ? JSON.parse(r) : d; } catch (e) { return d; } },
    set: function (k, v) { localStorage.setItem("mm_" + k, JSON.stringify(v)); },
    remove: function (k) { localStorage.removeItem("mm_" + k); }
  };
  MM.config = {};
  delete require.cache[require.resolve(path.join(ROOT, "js/account.js"))];
  require(path.join(ROOT, "js/account.js"));
  return MM;
}
function cloudRow(cloud, domain) {
  return (cloud.tables.os_state || []).filter(function (r) { return r.domain === domain; })[0] || null;
}

var tests = [];

/* --------------------------------------------------------------------------
   1) HYDRATION: Cloud neuer, lokal vollständig synced, aber mit Extra-Eintrag
      (klassischer Verlustfall: Gerät B pushte [1,2,3], Gerät A hat [1,4]).
   -------------------------------------------------------------------------- */
tests.push(function () {
  group("Hydration-Merge: lokale Extra-Einträge überleben Cloud-Overwrite");
  var C = { user: { id: "u1" }, tables: { os_state: [
    { user_id: "u1", domain: "inteldecisions", state: [{ id: "dec_1" }, { id: "dec_2" }, { id: "dec_3" }], state_version: 5 }
  ] } };
  var M = freshEnv(C);
  M.store.set("intel_decisions", [{ id: "dec_1" }, { id: "dec_4" }]);
  M.store.set("os_ver_inteldecisions", 2);
  M.store.set("os_synced_inteldecisions", 2);
  M.account.registerStateDomain("inteldecisions", "intel_decisions", { append: true });
  return M.account.init().then(function () { return wait(2200); }).then(function () {
    var local = M.store.get("intel_decisions", null);
    ok(ids(local) === "dec_1,dec_2,dec_3,dec_4", "lokal = Union aus Cloud + lokalen Einträgen (dec_4 nicht verloren)");
    var row = cloudRow(C, "inteldecisions");
    ok(row && ids(row.state) === "dec_1,dec_2,dec_3,dec_4", "Union wurde zurück in die Cloud geladen (Re-Upload nach Merge)");
  });
});

/* --------------------------------------------------------------------------
   2) FLUSH: lokal dirty (ver > synced), Cloud enthält fremden Eintrag —
      der Upload darf ihn nicht überschreiben.
   -------------------------------------------------------------------------- */
tests.push(function () {
  group("Flush-Merge: Upload übernimmt Cloud-Einträge fremder Geräte");
  var C = { user: { id: "u1" }, tables: { os_state: [
    { user_id: "u1", domain: "intelreviews", state: [{ id: "review_w1" }, { id: "review_w2" }], state_version: 9 }
  ] } };
  var M = freshEnv(C);
  M.store.set("intel_reviews", [{ id: "review_w1" }, { id: "review_w3" }]);
  M.store.set("os_ver_intelreviews", 3);
  M.store.set("os_synced_intelreviews", 2);   // lokal geändert seit letztem Sync ⇒ dirty
  M.account.registerStateDomain("intelreviews", "intel_reviews", { append: true });
  return M.account.init().then(function () { return wait(2200); }).then(function () {
    var row = cloudRow(C, "intelreviews");
    ok(row && ids(row.state) === "review_w1,review_w2,review_w3", "Cloud = Union (review_w2 vom anderen Gerät nicht gelöscht)");
    ok(ids(M.store.get("intel_reviews", null)) === "review_w1,review_w2,review_w3", "lokal ebenfalls Union nach Flush");
  });
});

/* --------------------------------------------------------------------------
   3) NICHT-APPEND: Last-write-wins bleibt exakt wie bisher (kein Merge).
   -------------------------------------------------------------------------- */
tests.push(function () {
  group("Nicht-Append-Domain: unverändertes Last-write-wins");
  var C = { user: { id: "u1" }, tables: { os_state: [
    { user_id: "u1", domain: "osprofile", state: { goals: { mode: "cut" } }, state_version: 7 }
  ] } };
  var M = freshEnv(C);
  M.store.set("os_profile", { goals: { mode: "build" } });
  M.store.set("os_ver_osprofile", 2);
  M.store.set("os_synced_osprofile", 2);
  M.account.registerStateDomain("osprofile", "os_profile");
  return M.account.init().then(function () { return wait(600); }).then(function () {
    var local = M.store.get("os_profile", null);
    ok(local && local.goals && local.goals.mode === "cut", "Cloud (neuer + lokal synced) ersetzt lokalen Blob wie bisher");
  });
});

/* --------------------------------------------------------------------------
   4) ROBUSTHEIT: Append-Domain mit Nicht-Array-Zustand fällt auf LWW zurück.
   -------------------------------------------------------------------------- */
tests.push(function () {
  group("Robustheit: Nicht-Array in Append-Domain ⇒ Fallback ohne Crash");
  var C = { user: { id: "u1" }, tables: { os_state: [
    { user_id: "u1", domain: "intelmemory", state: { legacyShape: true }, state_version: 4 }
  ] } };
  var M = freshEnv(C);
  M.store.set("intel_memory", { otherShape: true });
  M.store.set("os_ver_intelmemory", 1);
  M.store.set("os_synced_intelmemory", 1);
  M.account.registerStateDomain("intelmemory", "intel_memory", { append: true });
  return M.account.init().then(function () { return wait(600); }).then(function () {
    var local = M.store.get("intel_memory", null);
    ok(local && local.legacyShape === true, "Cloud-Stand übernommen (LWW-Fallback), kein Fehler geworfen");
  });
});

/* --------------------------------------------------------------------------
   5) KONFLIKT GLEICHE ID: derselbe Ledger-Eintrag wurde auf beiden Geräten
      unterschiedlich geändert — der neuere updated_at-Stand muss gewinnen,
      egal in welche Richtung gemerged wird.
   -------------------------------------------------------------------------- */
tests.push(function () {
  group("Konflikt gleiche id: Cloud-Eintrag neuer ⇒ Cloud gewinnt");
  var C = { user: { id: "u1" }, tables: { os_state: [
    { user_id: "u1", domain: "inteldecisions", state: [
      { id: "dec_1", status: "reviewed", updated_at: "2026-07-27T10:00:00Z" },
      { id: "dec_9", status: "open" }
    ], state_version: 9 }
  ] } };
  var M = freshEnv(C);
  M.store.set("intel_decisions", [{ id: "dec_1", status: "open", updated_at: "2026-07-20T10:00:00Z" }]);
  M.store.set("os_ver_inteldecisions", 3);
  M.store.set("os_synced_inteldecisions", 2);   // dirty ⇒ Flush-Pfad
  M.account.registerStateDomain("inteldecisions", "intel_decisions", { append: true });
  return M.account.init().then(function () { return wait(2200); }).then(function () {
    var row = cloudRow(C, "inteldecisions");
    var d1 = (row.state || []).filter(function (e) { return e.id === "dec_1"; })[0];
    ok(d1 && d1.status === "reviewed", "älterer lokaler Stand überschreibt den neueren Cloud-Stand NICHT");
    ok(ids(row.state) === "dec_1,dec_9", "fremder Eintrag (dec_9) bleibt unverändert erhalten");
    var l1 = (M.store.get("intel_decisions", []) || []).filter(function (e) { return e.id === "dec_1"; })[0];
    ok(l1 && l1.status === "reviewed", "lokal übernimmt den neueren Cloud-Stand");
  });
});

tests.push(function () {
  group("Konflikt gleiche id: lokaler Eintrag neuer ⇒ lokal gewinnt");
  var C = { user: { id: "u1" }, tables: { os_state: [
    { user_id: "u1", domain: "inteldecisions", state: [
      { id: "dec_1", status: "open", updated_at: "2026-07-20T10:00:00Z" }
    ], state_version: 9 }
  ] } };
  var M = freshEnv(C);
  M.store.set("intel_decisions", [{ id: "dec_1", status: "reviewed", updated_at: "2026-07-27T10:00:00Z" }]);
  M.store.set("os_ver_inteldecisions", 3);
  M.store.set("os_synced_inteldecisions", 2);
  M.account.registerStateDomain("inteldecisions", "intel_decisions", { append: true });
  return M.account.init().then(function () { return wait(2200); }).then(function () {
    var row = cloudRow(C, "inteldecisions");
    var d1 = (row.state || []).filter(function (e) { return e.id === "dec_1"; })[0];
    ok(d1 && d1.status === "reviewed", "neuerer lokaler Stand setzt sich gegen älteren Cloud-Stand durch");
  });
});

tests.push(function () {
  group("Konflikt gleiche id: identischer Zeitstempel ⇒ deterministische Wahl");
  var C = { user: { id: "u1" }, tables: { os_state: [
    { user_id: "u1", domain: "inteldecisions", state: [
      { id: "dec_1", note: "b", updated_at: "2026-07-27T10:00:00Z" }
    ], state_version: 9 }
  ] } };
  var M = freshEnv(C);
  M.store.set("intel_decisions", [{ id: "dec_1", note: "a", updated_at: "2026-07-27T10:00:00Z" }]);
  M.store.set("os_ver_inteldecisions", 3);
  M.store.set("os_synced_inteldecisions", 2);
  M.account.registerStateDomain("inteldecisions", "intel_decisions", { append: true });
  return M.account.init().then(function () { return wait(2200); }).then(function () {
    var row = cloudRow(C, "inteldecisions");
    var d1 = (row.state || []).filter(function (e) { return e.id === "dec_1"; })[0];
    // JSON-Vergleich: "b" > "a" ⇒ deterministisch gewinnt die note:"b"-Variante,
    // unabhängig davon, welches Gerät den Merge ausführt.
    ok(d1 && d1.note === "b", "Gleichstand wird deterministisch aufgelöst (inhaltsbasiert, richtungsunabhängig)");
    var l1 = (M.store.get("intel_decisions", []) || []).filter(function (e) { return e.id === "dec_1"; })[0];
    ok(l1 && l1.note === "b", "lokal und Cloud konvergieren auf denselben Eintrag");
  });
});

tests.push(function () {
  group("Konflikt gleiche id: nur eine Seite hat updated_at ⇒ gestempelte Seite gewinnt");
  var C = { user: { id: "u1" }, tables: { os_state: [
    { user_id: "u1", domain: "inteldecisions", state: [
      { id: "dec_1", status: "reviewed", updated_at: "2026-07-27T10:00:00Z" }
    ], state_version: 9 }
  ] } };
  var M = freshEnv(C);
  M.store.set("intel_decisions", [{ id: "dec_1", status: "open" }]);   // Alt-Eintrag ohne Stempel
  M.store.set("os_ver_inteldecisions", 3);
  M.store.set("os_synced_inteldecisions", 2);
  M.account.registerStateDomain("inteldecisions", "intel_decisions", { append: true });
  return M.account.init().then(function () { return wait(2200); }).then(function () {
    var row = cloudRow(C, "inteldecisions");
    var d1 = (row.state || []).filter(function (e) { return e.id === "dec_1"; })[0];
    ok(d1 && d1.status === "reviewed", "Eintrag MIT Zeitstempel schlägt ungestempelten Alt-Eintrag");
  });
});

tests.push(function () {
  group("Konflikt gleiche id: ungültige Zeitstempel ⇒ kein Crash, deterministische Wahl");
  var C = { user: { id: "u1" }, tables: { os_state: [
    { user_id: "u1", domain: "inteldecisions", state: [
      { id: "dec_1", note: "b", updated_at: "kein-datum" },
      { id: "dec_7", note: "fremd" }
    ], state_version: 9 }
  ] } };
  var M = freshEnv(C);
  M.store.set("intel_decisions", [{ id: "dec_1", note: "a", updated_at: "kein-datum" }]);
  M.store.set("os_ver_inteldecisions", 3);
  M.store.set("os_synced_inteldecisions", 2);
  M.account.registerStateDomain("inteldecisions", "intel_decisions", { append: true });
  return M.account.init().then(function () { return wait(2200); }).then(function () {
    var row = cloudRow(C, "inteldecisions");
    var d1 = (row.state || []).filter(function (e) { return e.id === "dec_1"; })[0];
    ok(d1 && d1.note === "b", "ungültige Zeitstempel fallen auf den deterministischen Inhaltsvergleich zurück");
    ok(ids(row.state) === "dec_1,dec_7", "fremder Eintrag bleibt auch im Fehlerfall erhalten");
  });
});

/* --------------------------------------------------------------------------
   6) STATISCH: Die Ledger-Mutationen stempeln updated_at (Quelle der Regel).
   -------------------------------------------------------------------------- */
tests.push(function () {
  group("Statisch: memory.js stempelt updated_at bei jeder Ledger-Mutation");
  var fs = require("fs");
  var src = fs.readFileSync(path.join(ROOT, "js/os/intelligence/memory.js"), "utf8");
  ok(/status: "open", outcome: null[\s\S]{0,300}updated_at: new Date\(\)\.toISOString\(\)/.test(src), "recordDecision stempelt updated_at");
  ok(/reviewedAt = todayYmd\(\); l\[i\]\.updated_at = new Date\(\)\.toISOString\(\)/.test(src), "reviewDecision stempelt updated_at");
  ok(/supersededAt = todayYmd\(\); d\.updated_at = new Date\(\)\.toISOString\(\)/.test(src), "supersedeDecisionsInDomain stempelt updated_at");
  return Promise.resolve();
});

/* ---- sequenziell ausführen ---- */
tests.reduce(function (p, t) { return p.then(t); }, Promise.resolve()).then(function () {
  console.log("\n==============================");
  console.log("PASS: " + passed + "  FAIL: " + failed);
  process.exit(failed ? 1 : 0);
}).catch(function (e) {
  console.error("SUITE ERROR: " + (e && e.stack || e));
  process.exit(1);
});
