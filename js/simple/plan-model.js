/* ==========================================================================
   MaleMetrix Generation 2 — Planmodell (PUR: kein DOM, kein Storage)

   Das verbindliche, versionierte 12-Wochen-Planmodell. Diese Datei definiert
   NUR Struktur, Validierung und Versionierung — die fachliche Ableitung
   (Kalorien, Training, Mahlzeiten) liegt in js/simple/plan-engine.js, die
   Persistenz (MM.store + os_state-Sync) in js/simple/plan-store.js.

   Grundsätze (nicht verhandelbar):
   - Jede relevante Anpassung erzeugt eine NEUE Version (append-only Historie).
   - Vergangene Wochen werden nie rückwirkend verändert.
   - Kritische Werte haben harte Grenzen (validieren, nicht erfinden).
   - Fehlende Pflichtdaten werden als `missing` gemeldet — nie still ersetzt.

   Läuft im Browser (window.MMSimple.model) und in Node (module.exports).
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else { root.MMSimple = root.MMSimple || {}; root.MMSimple.model = factory(); }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MODEL_VERSION = "simple-plan-v1";

  /* ---------------- Grenzen (Sicherheits-Leitplanken) ---------------- */
  var LIMITS = {
    kcalMin: 1500,             // nie darunter planen (Muskel-/Gesundheitsschutz)
    kcalMax: 4500,
    kcalStepMax: 250,          // maximale Änderung pro Wochencheck
    /* Groesstes Defizit unter dem gemessenen/berechneten Verbrauch. Die
       Planerstellung hielt sich daran, der Wochencheck kannte den Wert nicht
       und kuerzte Woche fuer Woche weiter — nach acht Checks stand ein
       Defizit von 1490 kcal. Ein Wert an EINER Stelle, damit das nicht
       wieder auseinanderlaeuft. */
    kcalDeficitMax: 700,
    kcalDeficitMaxEnhanced: 900,
    proteinPerKgMin: 1.6,
    proteinPerKgMax: 2.6,
    cutRatePerWeekMaxPct: 0.01,    // max. 1 % Körpergewicht/Woche Abnahme
    stepsMin: 4000,
    stepsMax: 20000,          // absolute Obergrenze eines Plans
    /* Wie weit der Wochencheck das Schrittziel ueber den Planwert hinaus
       treiben darf. Ohne diese Grenze lief dieselbe Ratsche wie bei den
       Kalorien, nur eine Stellschraube weiter: bei zwoelf Wochen Stillstand
       8.000 -> 19.000 Schritte, also rund 15 km taeglich. Irgendwann ist
       nicht mehr das Ziel falsch, sondern die Annahme dahinter. */
    stepsRaiseMax: 4000,
    stepsStepMax: 2000,        // maximale Schrittziel-Änderung pro Woche
    daysPerWeekMin: 2,
    daysPerWeekMax: 4,         // Gen 2 plant bewusst 2-4 realistische Tage
    sessionMinutesMin: 20,
    sessionMinutesMax: 120,
    mealCountMin: 2,
    mealCountMax: 5,
    durationWeeks: 12
  };

  /* Felder, deren Änderung eine neue Planversion erzeugt (alles andere ist
     Präferenz-Kosmetik und bleibt in derselben Version). */
  var VERSIONED_PATHS = [
    "status", "startDate", "endDate",
    "phaseGoal", "scoreContext",
    "training.daysPerWeek", "training.weekdays", "training.templateId",
    "training.location", "training.maximumSessionMinutes", "training.deloadWeeks",
    "nutrition.calorieTarget", "nutrition.calorieRangeMin", "nutrition.calorieRangeMax",
    "nutrition.proteinTargetGrams", "nutrition.mealCount",
    "dailyTargets.steps", "dailyTargets.sleepTargetHours"
  ];

  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function isYmd(s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s); }
  function addDays(ymd, n) {
    var p = ymd.split("-");
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function get(obj, path) {
    return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }
  function set(obj, path, val) {
    var ks = path.split("."), o = obj;
    for (var i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null || typeof o[ks[i]] !== "object") o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = val;
  }

  /* ---------------- Leerer Plan (Strukturvertrag) ---------------- */
  function emptyPlan() {
    return {
      id: null,                     // "plan:<startDate>:<zufall>"
      userId: null,                 // wird beim Sync vom Konto gesetzt; lokal null
      modelVersion: MODEL_VERSION,
      version: 1,
      status: "draft",              // draft | active | paused | completed
      startDate: null, endDate: null,
      selectedTransformation: {
        targetId: null,
        targetType: null,           // realistic | ambitious (kind aus transform_goal)
        startWeightKg: null, finalTargetWeightKg: null,
        targetRangeMinKg: null, targetRangeMaxKg: null,
        expectedTotalWeeks: null,
        selectedAt: null,
        heightCm: null, age: null, activity: null, direction: null
      },
      phaseGoal: {
        durationWeeks: LIMITS.durationWeeks,
        week12TargetMinKg: null, week12TargetMaxKg: null,
        isFinalPhase: false         // true = Gesamtziel liegt in diesen 12 Wochen
      },
      scoreContext: {
        primaryBottleneck: null, relevantFactors: [], medicalCautions: [],
        scoreTotal: null, scoredAt: null
      },
      training: {
        experienceLevel: null,      // beginner | intermediate | advanced
        location: null,             // gym | home
        daysPerWeek: null,
        weekdays: [],               // 0=So … 6=Sa (JS-Konvention)
        preferredTimes: {},         // { "1": "18:30", … }
        maximumSessionMinutes: 60,
        templateId: null,           // aus TRAINING_TEMPLATES (plan-engine)
        deloadWeeks: [7],           // reduzierte Woche(n), begründet
        injuries: []
      },
      nutrition: {
        calorieTarget: null, calorieRangeMin: null, calorieRangeMax: null,
        proteinTargetGrams: null, fatMinimumGrams: null,
        mealCount: 3,
        dietaryPreferences: [],     // z. B. ["veggie"]
        exclusions: [], allergies: [],
        cookingMinutesMax: null, eatingOutPerWeek: null,
        mealTemplateIds: [],        // gewählte Bausteine je Slot (plan-engine)
        householdSize: 1,
        shoppingDay: 6, mealPrepDay: 0
      },
      dailyTargets: {
        steps: null, sleepTargetHours: null,
        weighInWeekdays: [1, 3, 5]
      },
      reminderPreferences: {
        morningBriefTime: "07:00", trainingLeadMinutes: 60,
        eveningCloseTime: "20:30",
        weeklyReviewWeekday: 0, weeklyReviewTime: "18:00"
      },
      lifestyle: {
        wakeTime: null, sleepTime: null, workPattern: null // day | shift | free
      },
      legacySource: { migrated: false, sourceVersion: null, snapshotId: null },
      createdAt: null, updatedAt: null
    };
  }

  /* ---------------- Validierung ---------------- */
  /* Prüft einen Plan gegen die harten Grenzen. Liefert { ok, errors[] }.
     Validieren heißt: NIE stillschweigend korrigieren. */
  function validate(plan) {
    var e = [];
    if (!plan || typeof plan !== "object") return { ok: false, errors: ["plan fehlt"] };
    var st = plan.selectedTransformation || {};
    var n = plan.nutrition || {}, t = plan.training || {}, d = plan.dailyTargets || {};

    if (plan.status && ["draft", "active", "paused", "completed"].indexOf(plan.status) < 0) e.push("status ungültig: " + plan.status);
    if (plan.startDate && !isYmd(plan.startDate)) e.push("startDate kein YYYY-MM-DD");
    if (plan.startDate && plan.endDate && plan.endDate !== addDays(plan.startDate, LIMITS.durationWeeks * 7 - 1)) {
      e.push("endDate passt nicht zu 12 Wochen ab startDate");
    }
    /* Der Torwaechter muss NaN zuerst abfangen: jeder Vergleich mit NaN ist
       false, deshalb sind Unter- UND Obergrenze gleichzeitig „eingehalten".
       Ein Plan mit calorieTarget = NaN galt so als gueltig und wurde
       gespeichert; danach stand auf jedem Bildschirm „— kcal". */
    if (n.calorieTarget != null && !isFinite(n.calorieTarget)) {
      e.push("Kalorienziel ist keine Zahl");
    } else if (n.calorieTarget != null) {
      if (n.calorieTarget < LIMITS.kcalMin) e.push("Kalorienziel unter Untergrenze " + LIMITS.kcalMin);
      if (n.calorieTarget > LIMITS.kcalMax) e.push("Kalorienziel über Obergrenze " + LIMITS.kcalMax);
    }
    if (n.proteinTargetGrams != null && !isFinite(n.proteinTargetGrams)) {
      e.push("Proteinziel ist keine Zahl");
    }
    if (n.proteinTargetGrams != null && st.startWeightKg) {
      var perKg = n.proteinTargetGrams / st.startWeightKg;
      if (perKg < LIMITS.proteinPerKgMin - 0.35 || perKg > LIMITS.proteinPerKgMax + 0.3) {
        e.push("Proteinziel unplausibel (" + perKg.toFixed(2) + " g/kg)");
      }
    }
    if (t.daysPerWeek != null && (t.daysPerWeek < LIMITS.daysPerWeekMin || t.daysPerWeek > LIMITS.daysPerWeekMax)) {
      e.push("Trainingstage außerhalb 2-4");
    }
    if (Array.isArray(t.weekdays) && t.daysPerWeek != null && t.weekdays.length && t.weekdays.length !== t.daysPerWeek) {
      e.push("weekdays (" + t.weekdays.length + ") ≠ daysPerWeek (" + t.daysPerWeek + ")");
    }
    if (t.maximumSessionMinutes != null && (t.maximumSessionMinutes < LIMITS.sessionMinutesMin || t.maximumSessionMinutes > LIMITS.sessionMinutesMax)) {
      e.push("Trainingsdauer außerhalb " + LIMITS.sessionMinutesMin + "-" + LIMITS.sessionMinutesMax + " Minuten");
    }
    if (d.steps != null && (d.steps < LIMITS.stepsMin || d.steps > LIMITS.stepsMax)) e.push("Schrittziel außerhalb " + LIMITS.stepsMin + "-" + LIMITS.stepsMax);
    if (n.mealCount != null && (n.mealCount < LIMITS.mealCountMin || n.mealCount > LIMITS.mealCountMax)) e.push("Mahlzeitenanzahl außerhalb 2-5");

    // Abnahmerate: Phase-1-Ziel darf 1 % KG/Woche nicht überschreiten
    if (st.startWeightKg && plan.phaseGoal && plan.phaseGoal.week12TargetMinKg != null) {
      var drop = st.startWeightKg - plan.phaseGoal.week12TargetMinKg;
      if (drop > 0) {
        var rate = drop / LIMITS.durationWeeks;
        if (rate > st.startWeightKg * LIMITS.cutRatePerWeekMaxPct + 1e-9) {
          e.push("12-Wochen-Ziel verlangt >1 % Körpergewicht/Woche (" + rate.toFixed(2) + " kg/Wo)");
        }
      }
    }
    return { ok: e.length === 0, errors: e };
  }

  /* ---------------- Versionierung ---------------- */
  /* Wendet Änderungen an und erzeugt eine neue Version + Historieneintrag.
     changes: { "nutrition.calorieTarget": 2030, … }
     meta:    { reason, source: "user"|"system"|"admin", rule, checkinId, now }
     Liefert { ok, plan, entry, errors } — bei Verstoß gegen Grenzen: ok=false,
     der Plan bleibt UNVERÄNDERT (nie halbe Änderungen). */
  function applyChange(plan, changes, meta) {
    meta = meta || {};
    if (!plan) return { ok: false, errors: ["plan fehlt"] };
    if (!changes || !Object.keys(changes).length) return { ok: false, errors: ["keine Änderungen"] };
    if (!meta.reason) return { ok: false, errors: ["Begründung (reason) ist Pflicht"] };
    if (["user", "system", "admin"].indexOf(meta.source) < 0) return { ok: false, errors: ["source muss user|system|admin sein"] };

    var next = clone(plan);
    var recorded = [];
    var err = [];
    Object.keys(changes).forEach(function (path) {
      var versioned = VERSIONED_PATHS.some(function (p) { return path === p || path.indexOf(p + ".") === 0; });
      if (!versioned) { err.push("Pfad nicht versionierbar: " + path); return; }
      var from = clone(get(plan, path));
      var to = clone(changes[path]);
      if (JSON.stringify(from) === JSON.stringify(to)) return; // no-op
      set(next, path, to);
      recorded.push({ path: path, from: from, to: to });
    });
    if (err.length) return { ok: false, errors: err };
    if (!recorded.length) return { ok: false, errors: ["alle Änderungen waren No-Ops"] };

    // Schrittweiten-Grenzen (sanfte Anpassung statt Sprünge)
    recorded.forEach(function (c) {
      if (c.path === "nutrition.calorieTarget" && typeof c.from === "number" && typeof c.to === "number" &&
          Math.abs(c.to - c.from) > LIMITS.kcalStepMax) {
        err.push("Kalorienänderung > " + LIMITS.kcalStepMax + " kcal pro Anpassung");
      }
      if (c.path === "dailyTargets.steps" && typeof c.from === "number" && typeof c.to === "number" &&
          Math.abs(c.to - c.from) > LIMITS.stepsStepMax) {
        err.push("Schrittzieländerung > " + LIMITS.stepsStepMax + " pro Anpassung");
      }
    });
    if (err.length) return { ok: false, errors: err };

    var v = validate(next);
    if (!v.ok) return { ok: false, errors: v.errors };

    var now = meta.now || null;
    next.version = (plan.version || 1) + 1;
    next.updatedAt = now;
    var entry = {
      id: "pv:" + next.version + ":" + (plan.id || "?"),
      planId: plan.id, version: next.version,
      changedAt: now,
      reason: meta.reason,
      rule: meta.rule || null,
      source: meta.source,
      checkinId: meta.checkinId || null,
      changes: recorded
    };
    return { ok: true, plan: next, entry: entry, errors: [] };
  }

  /* Historische Sicht: Plan-Stand VOR einer gegebenen Version rekonstruieren
     (Basis: aktueller Plan + Historie rückwärts). Vergangene Stände bleiben
     dadurch anzeigbar, ohne je etwas umzuschreiben. */
  function planAtVersion(plan, history, version) {
    var cur = clone(plan);
    var hs = (history || []).slice().sort(function (a, b) { return b.version - a.version; });
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i];
      if (h.version <= version) break;
      (h.changes || []).forEach(function (c) { set(cur, c.path, clone(c.from)); });
      cur.version = h.version - 1;
    }
    return cur;
  }

  /* ---------------- Legacy-Snapshot (Strukturvertrag §27.3) ---------------- */
  function emptySnapshot() {
    return {
      id: null, userId: null,
      sourceVersion: "malemetrix-os-v1",
      migrationVersion: MODEL_VERSION,
      migratedAt: null,
      sourceChecksums: {},
      legacyProgramState: null,
      legacyTrainingHistory: null,
      legacyNutritionHistory: null,
      legacyReviews: null,
      legacyProgress: null,
      legacyPreferences: null,
      legacyScore: null,
      legacyTransformation: null,
      migrationWarnings: []
    };
  }

  return {
    MODEL_VERSION: MODEL_VERSION,
    LIMITS: LIMITS,
    VERSIONED_PATHS: VERSIONED_PATHS,
    emptyPlan: emptyPlan,
    emptySnapshot: emptySnapshot,
    validate: validate,
    applyChange: applyChange,
    planAtVersion: planAtVersion,
    addDays: addDays,
    _get: get, _set: set
  };
});
