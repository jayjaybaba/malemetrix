/* ==========================================================================
   MaleMetrix Generation 2 — Bestandsmigration (Phase 7, NICHT-DESTRUKTIV)

   Ablauf je Nutzer (§27.2):
     1. Legacy-Daten erkennen (LocalStorage-Keys der OS-v1-Generation; die
        Cloud-Seite hängt an denselben Keys über die bestehende Sync-Schicht)
     2. validieren
     3. vollständigen Snapshot erzeugen (Checksummen, Warnungen)
     4. Snapshot kontogesynct speichern (os_state-Domain "legacy_snapshot")
     5. Vorbefüllung für den Planfragebogen aus ZUVERLÄSSIGEN Daten —
        Unsicheres wird als offene Frage gemeldet, NIE still erfunden (§27.4)
     6./7. Migrationsstatus speichern (Domain "simple_migration")
     8. neue App über Flag aktivierbar
     9. ALLE Originaldaten bleiben unangetastet — diese Datei kennt keinerlei
        Lösch- oder Schreiboperation auf Legacy-Keys.

   Rücknahme (§27.5): revert() schaltet den Nutzer auf die Legacy-Ansicht
   zurück (Flag), pausiert den Gen-2-Plan und protokolliert das — Snapshot
   und Historie bleiben erhalten. Da Originale nie verändert wurden, geht
   dabei nichts verloren.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else { root.MMSimple = root.MMSimple || {}; root.MMSimple.migration = factory(); }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function S() { return (typeof MM !== "undefined" && MM.store) ? MM.store : null; }

  /* Legacy-Keys je fachlichem Bereich (Owner bleibt OS v1). */
  var LEGACY_KEYS = {
    program: ["c2_start", "c2_goal", "c2_bottleneck", "c2_days", "c2_daily", "c2_pulse",
              "c2_nutrition", "c2_dayswap", "c2_pause_since", "c2_paused_days",
              "c2_mode_history", "c2_bn_history", "c2_lifts", "c2_archive", "os_cycle", "os_cycle_history"],
    training: ["os_training_plan", "os_workout_logs", "trk_plan", "trk_sessions", "trk_cardio"],
    nutrition: ["os_nutrition_plan", "os_nutrition_days", "os_nutrition_log"],
    reviews: ["c2_pulse", "intel_reviews", "course_rechecks"],
    progress: ["os_metrics", "os_baseline"],
    preferences: ["os_profile", "os_reminder_prefs", "os_overlays"],
    score: ["check_result"],
    transformation: ["transform_goal", "os_transformation"]
  };

  /* djb2 — stabile, schnelle Checksumme für den Snapshot-Nachweis. */
  function checksum(v) {
    var s = "";
    try { s = JSON.stringify(v); } catch (e) { return null; }
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return "djb2:" + (h >>> 0).toString(16) + ":" + s.length;
  }

  /* ---------------- 1. Erkennen ---------------- */
  function detect() {
    var st = S(); if (!st) return { hasLegacy: false };
    var found = {};
    var any = false;
    Object.keys(LEGACY_KEYS).forEach(function (area) {
      found[area] = LEGACY_KEYS[area].filter(function (k) { return st.get(k, null) != null; });
      if (found[area].length) any = true;
    });
    var c2start = st.get("c2_start", "");
    var programDay = null;
    if (c2start && /^\d{4}-\d{2}-\d{2}$/.test(c2start)) {
      var ms = Date.now() - new Date(c2start + "T12:00:00").getTime();
      programDay = Math.floor(ms / 86400000) + 1;
    }
    return {
      hasLegacy: any,
      areas: found,
      activeProgram: !!c2start,
      programStart: c2start || null,
      programDay: programDay,
      paused: st.get("c2_pause_since", null) != null,
      hasTransform: !!st.get("transform_goal", null),
      hasScore: !!st.get("check_result", null)
    };
  }

  /* ---------------- 2.-4. Snapshot (idempotent, additiv) ---------------- */
  function captureSnapshot(opts) {
    opts = opts || {};
    var st = S(); if (!st) return { ok: false, errors: ["kein Store"] };
    var model = (typeof MMSimple !== "undefined" && MMSimple.model) || (typeof require === "function" ? require("./plan-model.js") : null);
    var store = (typeof MMSimple !== "undefined" && MMSimple.store) || null;
    var d = detect();
    if (!d.hasLegacy) return { ok: false, errors: ["keine Legacy-Daten vorhanden"] };

    var existing = store ? store.getSnapshot() : null;
    if (existing && !opts.force) return { ok: true, snapshot: existing, existed: true };

    var snap = model.emptySnapshot();
    snap.id = "snap:" + (opts.now || new Date().toISOString());
    snap.migratedAt = opts.now || new Date().toISOString();

    function grab(keys) {
      var out = {};
      keys.forEach(function (k) {
        var v = st.get(k, null);
        if (v != null) { out[k] = v; snap.sourceChecksums[k] = checksum(v); }
      });
      return Object.keys(out).length ? out : null;
    }
    snap.legacyProgramState = grab(LEGACY_KEYS.program);
    snap.legacyTrainingHistory = grab(LEGACY_KEYS.training);
    snap.legacyNutritionHistory = grab(LEGACY_KEYS.nutrition);
    snap.legacyReviews = grab(LEGACY_KEYS.reviews);
    snap.legacyProgress = grab(LEGACY_KEYS.progress);
    snap.legacyPreferences = grab(LEGACY_KEYS.preferences);
    snap.legacyScore = grab(LEGACY_KEYS.score);
    snap.legacyTransformation = grab(LEGACY_KEYS.transformation);
    // Bilddaten (IndexedDB-Fotos) werden BEWUSST nicht kopiert (§27.3) —
    // sie bleiben, wo sie sind: geräte-lokal in mm_os/photos.
    snap.migrationWarnings = [];
    if (d.activeProgram && d.programDay != null && d.programDay > 1 && d.programDay <= 84) {
      snap.migrationWarnings.push("aktives 12-Wochen-Programm in Tag " + d.programDay + " — die neue Planzählung startet neu; die alte Historie bleibt vollständig erhalten");
    }
    if (d.paused) snap.migrationWarnings.push("Programm war pausiert");
    if (!d.hasTransform) snap.migrationWarnings.push("kein Transformationsziel vorhanden — Zielwahl nötig");

    if (store) store.saveSnapshot(snap);
    return { ok: true, snapshot: snap, existed: false };
  }

  /* ---------------- 5. Vorbefüllung aus ZUVERLÄSSIGEN Daten ---------------- */
  /* Liefert { answers, open } — `open` sind Felder, die der Nutzer einmalig
     bestätigen muss, weil die Legacy-Quelle sie nicht sicher hergibt. */
  function prefillFromLegacy() {
    var st = S(); if (!st) return { answers: {}, open: [] };
    var p = st.get("os_profile", {}) || {};
    var answers = {};
    var open = [];
    var tr = p.training || {};
    var nu = p.nutrition || {};
    var id = p.identity || {};

    if (id.age != null && id.age >= 18 && id.age <= 90) answers.age = id.age;
    if (tr.experience === "beginner") answers.experience = "neu";
    else if (tr.experience === "advanced") answers.experience = "pro";
    else if (tr.experience) answers.experience = "mid";
    if (tr.daysPerWeek >= 2 && tr.daysPerWeek <= 6) answers.daysPerWeek = Math.min(4, tr.daysPerWeek);
    if (tr.location === "home" || tr.location === "gym") answers.location = tr.location;
    if (tr.minutes >= 20 && tr.minutes <= 120) answers.maxSessionMinutes = tr.minutes <= 35 ? 30 : (tr.minutes <= 50 ? 45 : (tr.minutes <= 75 ? 60 : 90));
    if (nu.mealsPerDay >= 2 && nu.mealsPerDay <= 5) answers.mealCount = nu.mealsPerDay;
    if (nu.dietStyle === "veggie" || nu.dietStyle === "vegetarian") answers.diet = "veggie";
    if (nu.cookMinutes != null) answers.cookingMinutesMax = nu.cookMinutes <= 12 ? 10 : (nu.cookMinutes <= 25 ? 20 : 40);

    // Wochentage lassen sich aus v1 nicht sicher ableiten → immer fragen.
    open.push("weekdays");
    if (answers.age == null) open.push("age");
    return { answers: answers, open: open };
  }

  /* ---------------- 6./7. Status ---------------- */
  function status() { return S() ? S().get("simple_migration", null) : null; }
  function setStatus(patch) {
    var st = S(); if (!st) return null;
    var cur = status() || {};
    Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; });
    cur.updatedAt = new Date().toISOString();
    st.set("simple_migration", cur);
    return cur;
  }

  /* Migration als abgeschlossen markieren (nach Planaktivierung). */
  function markMigrated(plan, snapshot) {
    return setStatus({
      status: "migrated",
      sourceVersion: "malemetrix-os-v1",
      migrationVersion: (MMSimple.model && MMSimple.model.MODEL_VERSION) || "simple-plan-v1",
      snapshotId: snapshot ? snapshot.id : null,
      planId: plan ? plan.id : null,
      planVersion: plan ? plan.version : null,
      warnings: snapshot ? snapshot.migrationWarnings : []
    });
  }

  /* ---------------- Rücknahme (§27.5) ---------------- */
  function revert(reason) {
    var store = MMSimple.store;
    var plan = store ? store.getPlan() : null;
    if (plan && plan.status === "active") {
      plan.status = "paused";
      store.adoptPlan(plan, { force: true });
    }
    if (typeof MM !== "undefined" && MM.flags) MM.flags.setUser("simpleAppDefault", false);
    setStatus({ status: "reverted", revertReason: reason || "user", planId: plan ? plan.id : null });
    try { if (typeof MM !== "undefined" && MM.track) MM.track("legacy_fallback_activated"); } catch (e) {}
    return { ok: true };
  }

  return {
    LEGACY_KEYS: LEGACY_KEYS,
    detect: detect,
    captureSnapshot: captureSnapshot,
    prefillFromLegacy: prefillFromLegacy,
    status: status,
    markMigrated: markMigrated,
    revert: revert,
    _checksum: checksum
  };
});
