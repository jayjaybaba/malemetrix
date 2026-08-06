/* ==========================================================================
   MaleMetrix Generation 2 — Plan-Persistenz (EINE Quelle der Wahrheit)

   Der aktive Plan lebt NICHT in verstreuten LocalStorage-Schlüsseln:
   - lokal:  feste MM.store-Keys (unten)
   - Konto:  versionierte Zeilen in der bestehenden Supabase-Tabelle
             `os_state` über MM.account.registerStateDomain — dieselbe
             Sync-/Konflikt-/Offline-Mechanik wie alle OS-Domains
             (local-first, Cloud überschreibt nur strikt Neueres).

   Bewusste Architektur-Entscheidung (PLAN_MODEL.md §Persistenz): Es wird
   KEINE neue Plantabelle gebaut — os_state (user_id + domain unique,
   RLS, state_version) erfüllt „serverseitig, versioniert, kontobezogen"
   bereits. Additiv, rückwärtskompatibel, kein paralleles Sync-System.

   Keys (alle mm_-präfixiert via MM.store):
     simple_plan          aktueller Plan (Dokument, plan-model.js)
     simple_plan_history  append-only Versionshistorie
     simple_funnel        Funnelstatus (Transformation→Score→Fragen→Plan)
     simple_checkins      append-only Wochencheck-Ergebnisse
     legacy_snapshot      Migrations-Snapshot der v1-Daten (§27.3)
     flags_user           Konto-Ebene der Feature-Flags (Rollback je Nutzer)
   ========================================================================== */
(function () {
  "use strict";
  window.MM = window.MM || {};
  window.MMSimple = window.MMSimple || {};
  var model = MMSimple.model;

  var KEYS = {
    plan: "simple_plan",
    history: "simple_plan_history",
    funnel: "simple_funnel",
    checkins: "simple_checkins",
    snapshot: "legacy_snapshot",
    flagsUser: "flags_user"
  };

  function S() { return MM.store; }
  function nowIso() { return new Date().toISOString(); }

  /* ---------------- Sync-Registrierung (einmalig, idempotent) ------------- */
  var registered = false;
  function registerSync() {
    if (registered) return true;
    if (!(MM.account && MM.account.registerStateDomain)) return false;
    // WICHTIG: registerStateDomain erwartet Store-Keys OHNE "mm_"-Präfix —
    // der Account-Layer liest über MM.store, das selbst präfixiert.
    MM.account.registerStateDomain("simple_plan", KEYS.plan);
    MM.account.registerStateDomain("simple_plan_history", KEYS.history, { append: true });
    MM.account.registerStateDomain("simple_funnel", KEYS.funnel);
    MM.account.registerStateDomain("simple_checkins", KEYS.checkins, { append: true });
    MM.account.registerStateDomain("legacy_snapshot", KEYS.snapshot);
    MM.account.registerStateDomain("flags_user", KEYS.flagsUser);
    // Das gewählte Transformationsziel folgt dem Konto (Funnel-Fortsetzung
    // auf anderem Gerät); Owner bleibt js/transformation.js.
    MM.account.registerStateDomain("transform_goal", "transform_goal");
    // Tagesprotokoll + Einkaufs-Häkchen + Migrationsstatus der Gen-2-App.
    MM.account.registerStateDomain("simple_daylog", "simple_daylog");
    MM.account.registerStateDomain("simple_shopping", "simple_shopping");
    MM.account.registerStateDomain("simple_migration", "simple_migration");
    // Gewichtsreihe: identische Domain wie OS v1 (os-core registriert
    // "osmetrics" → "os_metrics"); die Registrierung hier ist idempotent
    // und sorgt dafür, dass Gewichte auch ohne geladenes OS syncen.
    MM.account.registerStateDomain("osmetrics", "os_metrics");
    registered = true;
    return true;
  }
  // sofort versuchen, sonst nach DOM-Ready (account.js lädt vor uns, aber sicher ist sicher)
  if (!registerSync()) document.addEventListener("DOMContentLoaded", registerSync);

  /* ---------------- Plan ---------------- */
  function getPlan() { return S().get(KEYS.plan, null); }
  function getHistory() { return S().get(KEYS.history, []); }

  function savePlan(plan) {
    plan.updatedAt = nowIso();
    S().set(KEYS.plan, plan);
    try { document.dispatchEvent(new CustomEvent("mm:simple-plan", { detail: { version: plan.version, status: plan.status } })); } catch (e) {}
    return plan;
  }

  /* Neue Version über plan-model.applyChange — EINZIGER Schreibweg für
     versionierte Felder. Historie ist append-only. */
  function changePlan(changes, meta) {
    var plan = getPlan();
    if (!plan) return { ok: false, errors: ["kein aktiver Plan"] };
    meta = meta || {};
    meta.now = nowIso();
    var r = model.applyChange(plan, changes, meta);
    if (!r.ok) return r;
    var hist = getHistory();
    hist.push(r.entry);
    S().set(KEYS.history, hist);
    savePlan(r.plan);
    return r;
  }

  /* Bewusste Nutzer-Neukonfiguration (§"Plan anpassen"): Der Nutzer darf
     Trainingstage, Zeiten, Ernährungspräferenzen usw. jederzeit ändern.
     Das ist KEINE Wochencheck-Anpassung (dort gelten Schrittgrenzen),
     sondern ein Neuaufbau der Plan-Inhalte bei erhaltener Identität:
     id, Status, Start-/Enddatum und Historie bleiben, die Version steigt,
     der Unterschied wird als Historieneintrag festgehalten. */
  function reconfigurePlan(nextPlan, reason) {
    var cur = getPlan();
    if (!cur) return { ok: false, errors: ["kein Plan vorhanden"] };
    nextPlan.id = cur.id;
    nextPlan.status = cur.status;
    nextPlan.startDate = cur.startDate;
    nextPlan.endDate = cur.endDate;
    nextPlan.createdAt = cur.createdAt;
    nextPlan.legacySource = cur.legacySource;
    var v = model.validate(nextPlan);
    if (!v.ok) return { ok: false, errors: v.errors };
    nextPlan.version = (cur.version || 1) + 1;
    var paths = ["training.daysPerWeek", "training.weekdays", "training.templateId",
      "training.location", "training.maximumSessionMinutes",
      "nutrition.calorieTarget", "nutrition.proteinTargetGrams", "nutrition.mealCount",
      "dailyTargets.steps"];
    var changes = [];
    paths.forEach(function (p) {
      var from = model._get(cur, p), to = model._get(nextPlan, p);
      if (JSON.stringify(from) !== JSON.stringify(to)) changes.push({ path: p, from: from, to: to });
    });
    var entry = {
      id: "pv:" + nextPlan.version + ":" + cur.id,
      planId: cur.id, version: nextPlan.version,
      changedAt: nowIso(),
      reason: reason || "Vom Nutzer angepasst (Plan-Einstellungen)",
      rule: "user_reconfigure", source: "user", checkinId: null,
      changes: changes
    };
    var hist = getHistory();
    hist.push(entry);
    S().set(KEYS.history, hist);
    savePlan(nextPlan);
    return { ok: true, plan: nextPlan, entry: entry };
  }

  /* Ersten Plan setzen (aus plan-engine.createPlan). Überschreibt nie einen
     aktiven Plan ohne ausdrückliches force. */
  function adoptPlan(plan, opts) {
    var cur = getPlan();
    if (cur && cur.status === "active" && !(opts && opts.force)) {
      return { ok: false, errors: ["aktiver Plan vorhanden — adoptPlan mit {force:true} oder erst abschließen"] };
    }
    if (!plan.createdAt) plan.createdAt = nowIso();
    savePlan(plan);
    return { ok: true, plan: plan };
  }

  /* ---------------- Funnelstatus (kontobezogen, §5) ---------------- */
  /* steps: transformation → goal_selected → score_done → questions_done →
            preview_seen → plan_active */
  var FUNNEL_ORDER = ["start", "goal_selected", "score_done", "questions_done", "preview_seen", "plan_active"];
  function getFunnel() {
    return S().get(KEYS.funnel, { step: "start", updatedAt: null, data: {} });
  }
  function setFunnelStep(step, data) {
    if (FUNNEL_ORDER.indexOf(step) < 0) return null;
    var f = getFunnel();
    // Funnel läuft nur vorwärts; Zusatzdaten werden gemerged.
    if (FUNNEL_ORDER.indexOf(step) >= FUNNEL_ORDER.indexOf(f.step || "start")) f.step = step;
    if (data) Object.keys(data).forEach(function (k) { f.data[k] = data[k]; });
    f.updatedAt = nowIso();
    S().set(KEYS.funnel, f);
    return f;
  }

  /* ---------------- Wochenchecks (append-only) ---------------- */
  function getCheckins() { return S().get(KEYS.checkins, []); }
  function addCheckin(entry) {
    var list = getCheckins();
    if (!entry.id) entry.id = "ci:" + (entry.week != null ? entry.week : "?") + ":" + Date.now().toString(36);
    if (list.some(function (c) { return c.id === entry.id; })) return entry; // idempotent
    entry.createdAt = entry.createdAt || nowIso();
    list.push(entry);
    S().set(KEYS.checkins, list);
    return entry;
  }

  /* ---------------- Legacy-Snapshot ---------------- */
  function getSnapshot() { return S().get(KEYS.snapshot, null); }
  function saveSnapshot(snap) {
    // Snapshots werden nie überschrieben-und-verkleinert: neuer Snapshot nur
    // mit neuem Zeitstempel; der Aufrufer (migration.js) prüft Vorbedingungen.
    snap.migratedAt = snap.migratedAt || nowIso();
    S().set(KEYS.snapshot, snap);
    return snap;
  }

  MMSimple.store = {
    KEYS: KEYS,
    registerSync: registerSync,
    getPlan: getPlan,
    getHistory: getHistory,
    adoptPlan: adoptPlan,
    changePlan: changePlan,
    reconfigurePlan: reconfigurePlan,
    getFunnel: getFunnel,
    setFunnelStep: setFunnelStep,
    FUNNEL_ORDER: FUNNEL_ORDER,
    getCheckins: getCheckins,
    addCheckin: addCheckin,
    getSnapshot: getSnapshot,
    saveSnapshot: saveSnapshot
  };
})();
