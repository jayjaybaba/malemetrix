/* ==========================================================================
   MaleMetrix Generation 2 — Plan-Input (PUR: kein DOM, kein Storage)

   Verbindet die drei Eingangsquellen des 12-Wochen-Plans, ohne sie zu
   duplizieren:

     1. TRANSFORMATION  (mm_transform_goal, js/transformation.js)
        → Ausgangs-/Zielgewicht, Zeitraum, Zieltyp, Kontext
     2. SCORE           (mm_check_result, js/check.js — Score V2)
        → Engpass + max. 2 Faktoren + medizinische Vorsicht,
          JEDER mit konkreter Plankonsequenz (SCORE_RULES)
     3. PLANFRAGEBOGEN  (nur was wirklich fehlt; jede Frage nennt ihre
          Wirkung — Fragen ohne Plankonsequenz existieren hier nicht)

   Ergebnis: normalisierter Input für plan-engine.createPlan() plus
   `missing`-Liste. Fehlende Pflichtdaten werden NIE still ersetzt.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else { root.MMSimple = root.MMSimple || {}; root.MMSimple.input = factory(); }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ================= SCORE → PLAN (§7) =================
     Jede Regel: welcher Score-Befund führt zu welcher konkreten
     Planentscheidung. Die Engine (plan-engine.js) wendet `effects`
     deterministisch an; `consequence` ist der Satz, den der Nutzer sieht. */
  var SCORE_RULES = {
    recovery: {
      effects: { daysCap: 3, rateFactor: 0.85, sleepAnchor: true, deloadEarly: true },
      consequence: "Deine Regeneration ist aktuell der begrenzende Faktor. Dein Plan startet deshalb mit maximal drei Krafttrainings, einer moderaten Rate und einem festen Schlafanker.",
      consequenceEn: "Recovery is currently your limiting factor. Your plan therefore starts with at most three strength sessions, a moderate rate and a fixed sleep anchor."
    },
    strength: {
      effects: { preferFullBody: true, strictProgression: true },
      consequence: "Dir fehlt planbare Trainingsstruktur. Dein Plan setzt auf wenige feste Ganzkörper-Einheiten mit dokumentierter Progression statt Abwechslung.",
      consequenceEn: "You lack a plannable training structure. Your plan uses a few fixed full-body sessions with documented progression instead of variety."
    },
    fuel: {
      effects: { mealSystemPriority: true, proteinEmphasis: true },
      consequence: "Dein Ernährungssystem ist der Engpass. Dein Plan macht Protein und Mengen messbar: feste Mahlzeitenbausteine, Einkaufsliste, ein Meal-Prep-Tag.",
      consequenceEn: "Your nutrition system is the bottleneck. Your plan makes protein and portions measurable: fixed meal building blocks, a shopping list, one meal-prep day."
    },
    drive: {
      effects: { rateFactor: 0.9, sleepAnchor: true, stepsModerate: true },
      consequence: "Deine Energie ist der Engpass — sie hängt an Schlaf, Bewegung und Ernährung. Dein Plan startet mit moderatem Defizit, festem Schlafanker und realistischem Schrittziel.",
      consequenceEn: "Your energy is the bottleneck — it depends on sleep, movement and nutrition. Your plan starts with a moderate deficit, a fixed sleep anchor and a realistic step goal."
    },
    execution: {
      effects: { sessionCap: 45, maxDailyTasks: 3, habitFirst: true },
      consequence: "Umsetzung ist dein Engpass. Dein Plan bleibt bewusst klein: kurze Einheiten, maximal drei Tagesaufgaben, ein System, das deinen Alltag überlebt.",
      consequenceEn: "Execution is your bottleneck. Your plan stays deliberately small: short sessions, at most three daily tasks, a system that survives your everyday life."
    },
    body: {
      effects: { measurementEmphasis: true },
      consequence: "Deine Ausgangslage ist unscharf. Dein Plan legt feste Wiege-Tage und Fortschrittsfotos (Start, Woche 4, 8, 12) fest, damit Fortschritt sichtbar wird.",
      consequenceEn: "Your baseline is fuzzy. Your plan fixes weigh-in days and progress photos (start, week 4, 8, 12) so progress becomes visible."
    },
    blood: {
      effects: { conservative: true, labHint: true },
      consequence: "Dir fehlt die Datenbasis. Dein Plan bleibt konservativ und empfiehlt eine Blutwerte-Baseline — ohne Diagnose, als Faktenbasis.",
      consequenceEn: "You lack a data baseline. Your plan stays conservative and recommends a blood-work baseline — no diagnosis, just facts."
    }
  };

  /* Red Flags aus dem Score → medizinische Vorsicht: konservativ planen,
     ärztliche Abklärung empfehlen, niemals Diagnose/Therapie. */
  function mapScore(checkResult) {
    if (!checkResult || !checkResult.bottleneck) return null;
    var bn = checkResult.bottleneck;
    var key = bn.domain || bn.key || null;
    var rule = SCORE_RULES[key] || null;
    var factors = [];
    var sp = checkResult.secondaryPriorities || checkResult.weakest || [];
    for (var i = 0; i < sp.length && factors.length < 2; i++) {
      var f = sp[i];
      var fk = typeof f === "string" ? f : (f && (f.domain || f.key));
      if (fk && fk !== key && SCORE_RULES[fk]) factors.push(fk);
    }
    var cautions = [];
    var flags = checkResult.flags || [];
    (Array.isArray(flags) ? flags : []).forEach(function (fl) {
      var label = typeof fl === "string" ? fl : (fl && (fl.label || fl.text || fl.key));
      if (label) cautions.push(String(label));
    });
    return {
      primaryBottleneck: key,
      relevantFactors: factors,
      medicalCautions: cautions,
      scoreTotal: typeof checkResult.total === "number" ? checkResult.total : null,
      scoredAt: checkResult.date || null,
      consequence: rule ? rule.consequence : null,
      effects: mergeEffects(key, factors, cautions.length > 0)
    };
  }

  /* Effekte des Engpasses + (abgeschwächt) der Faktoren zusammenführen.
     Konservativste Variante gewinnt (kleinster Cap, kleinster Faktor). */
  function mergeEffects(primary, factors, hasCautions) {
    var out = {};
    function fold(key, weightFull) {
      var r = SCORE_RULES[key]; if (!r) return;
      Object.keys(r.effects).forEach(function (k) {
        var v = r.effects[k];
        if (typeof v === "number") {
          if (out[k] == null) out[k] = v;
          else out[k] = Math.min(out[k], weightFull ? v : Math.max(v, out[k]));
        } else {
          out[k] = out[k] || v;
        }
      });
    }
    if (primary) fold(primary, true);
    (factors || []).forEach(function (f) { fold(f, false); });
    if (hasCautions) { out.conservative = true; out.medicalNote = true; out.rateFactor = Math.min(out.rateFactor || 1, 0.85); }
    return out;
  }

  /* ================= TRANSFORMATION → PLAN (§6) ================= */
  function mapTransformation(tg) {
    if (!tg || tg.current_kg == null || tg.target_kg == null) return null;
    return {
      targetId: "trf:" + (tg.date || "unbekannt"),
      targetType: tg.kind || null,               // realistisch/ambitioniert-Variante der Zielwahl
      startWeightKg: tg.current_kg,
      finalTargetWeightKg: tg.target_kg,
      selectedAt: tg.date || null,
      heightCm: tg.height_cm != null ? tg.height_cm : null,
      direction: tg.direction || (tg.target_kg < tg.current_kg ? "cut" : "gain"),
      months: tg.months != null ? tg.months : null,
      // Kontext, den die Transformation bereits abgefragt hat — wird im
      // Fragebogen NICHT erneut gefragt (§8 "nie doppelt fragen"):
      experience: tg.exp || null,                 // neu | mid | pro
      trainingDaysWish: tg.days != null ? tg.days : null,
      location: tg.equip === "home" ? "home" : (tg.equip === "gym" ? "gym" : null),
      mode: tg.mode || "natural",
      waistCm: tg.waist_cm != null ? tg.waist_cm : null
    };
  }

  /* ================= MINIMALER PLANFRAGEBOGEN (§8) =================
     Nur Informationen, die Transformation + Score NICHT liefern.
     Jede Frage nennt `why` (sichtbar) = ihre konkrete Plan-Wirkung.
     `prefill(ctx)` versucht, die Antwort aus vorhandenen Daten zu holen —
     dann wird die Frage nur zur Bestätigung angezeigt oder übersprungen. */
  var QUESTIONS = [
    // --- Training ---
    { id: "age", section: "training", required: true, type: "number", min: 18, max: 90,
      label: "Alter", labelEn: "Age",
      why: "steuert deine Kalorienrechnung (Grundumsatz).", whyEn: "drives your calorie calculation (BMR).",
      prefill: function (c) { return c.tg && c.tg.age != null ? c.tg.age : (c.answers && c.answers.age); } },
    { id: "activity", section: "training", required: true, type: "choice",
      options: ["sitzend", "leicht", "moderat", "hoch"],
      label: "Alltags-Aktivität", labelEn: "Daily activity",
      why: "steuert deinen Kalorienverbrauch.", whyEn: "drives your calorie expenditure.",
      prefill: function (c) { return c.tg && c.tg.activity ? c.tg.activity : null; } },
    { id: "daysPerWeek", section: "training", required: true, type: "choice", options: [2, 3, 4],
      label: "Realistische Trainingstage pro Woche", labelEn: "Realistic training days per week",
      why: "bestimmt deinen Trainings-Split (Ganzkörper vs. Ober-/Unterkörper).", whyEn: "determines your training split (full body vs. upper/lower).",
      prefill: function (c) { var d = c.trf && c.trf.trainingDaysWish; return d ? Math.max(2, Math.min(4, d)) : null; } },
    { id: "weekdays", section: "training", required: true, type: "weekdays",
      label: "An welchen Wochentagen trainierst du?", labelEn: "Which weekdays do you train?",
      why: "legt deine Trainingstage im Wochenplan und Kalender fest.", whyEn: "fixes your training days in the weekly plan and calendar." },
    { id: "preferredTime", section: "training", required: false, type: "time", default: "18:00",
      label: "Bevorzugte Trainingszeit", labelEn: "Preferred training time",
      why: "steuert Kalendereinträge und Erinnerungen.", whyEn: "drives calendar entries and reminders." },
    { id: "location", section: "training", required: true, type: "choice", options: ["gym", "home"],
      label: "Gym oder Zuhause?", labelEn: "Gym or home?",
      why: "bestimmt deine Übungsauswahl.", whyEn: "determines your exercise selection.",
      prefill: function (c) { return c.trf && c.trf.location; } },
    { id: "experience", section: "training", required: true, type: "choice", options: ["neu", "mid", "pro"],
      label: "Trainingserfahrung", labelEn: "Training experience",
      why: "steuert Volumen und Progressionsgeschwindigkeit.", whyEn: "drives volume and progression speed.",
      prefill: function (c) { return c.trf && c.trf.experience; } },
    { id: "injuries", section: "training", required: false, type: "multi", default: [],
      options: ["schulter", "knie", "ruecken", "huefte", "handgelenk"],
      label: "Verletzungen / Einschränkungen", labelEn: "Injuries / limitations",
      why: "tauscht belastende Übungen gegen Alternativen.", whyEn: "swaps stressful exercises for alternatives." },
    { id: "maxSessionMinutes", section: "training", required: false, type: "choice", options: [30, 45, 60, 90], default: 60,
      label: "Maximale Trainingsdauer", labelEn: "Maximum session length",
      why: "begrenzt den Umfang jeder Einheit — die Kurzversion bleibt immer verfügbar.", whyEn: "caps each session — the short version stays available." },

    // --- Ernährung ---
    { id: "mealCount", section: "nutrition", required: false, type: "choice", options: [2, 3, 4, 5], default: 3,
      label: "Mahlzeiten pro Tag", labelEn: "Meals per day",
      why: "bestimmt die Aufteilung deiner Kalorien und Bausteine.", whyEn: "determines how calories and building blocks are split." },
    { id: "diet", section: "nutrition", required: false, type: "choice", options: ["misch", "veggie"], default: "misch",
      label: "Ernährungsform", labelEn: "Diet style",
      why: "filtert deine Mahlzeitenbausteine.", whyEn: "filters your meal building blocks.",
      prefill: function (c) { return (c.tg && c.tg.diet) ? c.tg.diet : null; } },
    { id: "exclusions", section: "nutrition", required: false, type: "multi", default: [],
      options: ["fisch", "schwein", "milch", "eier", "gluten", "nuesse", "soja"],
      label: "Ausschlüsse / Allergien", labelEn: "Exclusions / allergies",
      why: "entfernt Bausteine mit diesen Lebensmitteln — Allergien werden strikt ausgeschlossen.", whyEn: "removes blocks with these foods — allergies are excluded strictly." },
    { id: "cookingMinutesMax", section: "nutrition", required: false, type: "choice", options: [10, 20, 40], default: 20,
      label: "Verfügbare Kochzeit pro Mahlzeit", labelEn: "Cooking time per meal",
      why: "wählt schnelle oder aufwändigere Bausteine.", whyEn: "selects quick or more involved blocks." },
    { id: "eatingOutPerWeek", section: "nutrition", required: false, type: "choice", options: [0, 1, 2, 4], default: 1,
      label: "Wie oft isst du auswärts pro Woche?", labelEn: "How often do you eat out per week?",
      why: "aktiviert Restaurant-Regeln statt Kochrezepten für diese Tage.", whyEn: "activates restaurant rules instead of recipes for those days." },
    { id: "shoppingDay", section: "nutrition", required: false, type: "weekday", default: 6,
      label: "Einkaufstag", labelEn: "Shopping day",
      why: "terminiert die automatische Einkaufsliste.", whyEn: "schedules the automatic shopping list." },
    { id: "mealPrepDay", section: "nutrition", required: false, type: "weekday", default: 0,
      label: "Meal-Prep-Tag", labelEn: "Meal-prep day",
      why: "plant deinen Vorkoch-Block in Woche und Kalender.", whyEn: "plans your prep block in week and calendar." },
    { id: "householdSize", section: "nutrition", required: false, type: "choice", options: [1, 2, 3, 4], default: 1,
      label: "Für wie viele Personen kochst du?", labelEn: "How many people do you cook for?",
      why: "multipliziert Mengen und Einkaufsliste.", whyEn: "multiplies portions and the shopping list." },

    // --- Alltag ---
    { id: "wakeTime", section: "daily", required: false, type: "time", default: "06:30",
      label: "Typische Aufstehzeit", labelEn: "Typical wake time",
      why: "verankert Morgen-Brief und Mahlzeitenfenster.", whyEn: "anchors morning brief and meal windows." },
    { id: "sleepTime", section: "daily", required: false, type: "time", default: "22:30",
      label: "Typische Schlafenszeit", labelEn: "Typical bedtime",
      why: "setzt deinen Schlafanker — bei Regenerations-Engpass Teil des Plans.", whyEn: "sets your sleep anchor — part of the plan if recovery is the bottleneck." },
    { id: "workPattern", section: "daily", required: false, type: "choice", options: ["day", "shift", "free"], default: "day",
      label: "Arbeitsmodell", labelEn: "Work pattern",
      why: "Schichtarbeit verschiebt Anker und Erinnerungen.", whyEn: "shift work moves anchors and reminders." },
    { id: "steps", section: "daily", required: false, type: "choice", options: [5000, 6000, 8000, 10000], default: 8000,
      label: "Realistisches Schrittziel", labelEn: "Realistic step goal",
      why: "ist dein tägliches Bewegungsziel neben dem Training.", whyEn: "is your daily movement target besides training." },
    { id: "reviewWeekday", section: "daily", required: false, type: "weekday", default: 0,
      label: "Wochencheck-Tag", labelEn: "Weekly check day",
      why: "terminiert die wöchentliche Plananpassung.", whyEn: "schedules the weekly plan adjustment." }
  ];

  /* Fragen für den Nutzer aufbereiten: Vorbefüllung anwenden, bereits
     Bekanntes als bestätigt markieren. ctx = { tg, trf, answers } */
  function questionsFor(ctx) {
    ctx = ctx || {};
    return QUESTIONS.map(function (q) {
      var pre = null;
      try { pre = q.prefill ? q.prefill(ctx) : null; } catch (e) { pre = null; }
      var current = ctx.answers && ctx.answers[q.id] != null ? ctx.answers[q.id]
        : (pre != null ? pre : (q.default !== undefined ? q.default : null));
      return {
        id: q.id, section: q.section, type: q.type, options: q.options || null,
        min: q.min, max: q.max, required: !!q.required,
        label: q.label, labelEn: q.labelEn, why: q.why, whyEn: q.whyEn,
        prefilled: pre != null, value: current
      };
    });
  }

  /* ================= ZUSAMMENFÜHRUNG ================= */
  /* collect() liefert den normalisierten Engine-Input + missing-Liste.
     answers = { frageId: wert } (aus dem Fragebogen). */
  function collect(sources) {
    sources = sources || {};
    var trf = mapTransformation(sources.transformGoal);
    var score = mapScore(sources.checkResult);
    var a = sources.answers || {};
    var missing = [];

    if (!trf) missing.push("transformation");
    var q = questionsFor({ tg: sources.transformGoal, trf: trf, answers: a });
    var vals = {};
    q.forEach(function (item) {
      if (item.value == null || (Array.isArray(item.value) && item.type === "weekdays" && !item.value.length)) {
        if (item.required) missing.push(item.id);
      } else vals[item.id] = item.value;
    });
    // Konsistenz: weekdays muss zu daysPerWeek passen
    if (vals.daysPerWeek && Array.isArray(vals.weekdays) && vals.weekdays.length !== vals.daysPerWeek) {
      missing.push("weekdays");
      delete vals.weekdays;
    }

    return {
      ok: missing.length === 0,
      missing: missing,
      transformation: trf,
      score: score,               // null erlaubt: Score ist Input, kein Gate
      answers: vals
    };
  }

  return {
    SCORE_RULES: SCORE_RULES,
    QUESTIONS: QUESTIONS,
    mapScore: mapScore,
    mapTransformation: mapTransformation,
    mergeEffects: mergeEffects,
    questionsFor: questionsFor,
    collect: collect
  };
});
