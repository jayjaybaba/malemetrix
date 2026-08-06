/* ==========================================================================
   MaleMetrix Generation 2 — Deterministische Plan-Engine (PUR)

   Erzeugt aus dem normalisierten Input (plan-input.js) den vollständigen
   12-Wochen-Plan: Ziele, Training, Ernährungsbausteine, Wochenstruktur,
   Einkaufsliste. Regelbasiert, reproduzierbar, testbar — identischer Input
   ergibt identischen Plan. KEIN KI-Aufruf; Formeln identisch zur
   Transformation (Mifflin-St-Jeor, Raten-Leitplanken), damit Vorschau und
   Plan nie auseinanderlaufen.

   KI darf (später, optional) formulieren und erklären — nie Werte erzeugen.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./plan-model.js"));
  } else {
    root.MMSimple = root.MMSimple || {};
    root.MMSimple.engine = factory(root.MMSimple.model);
  }
})(typeof self !== "undefined" ? self : this, function (model) {
  "use strict";

  var L = model.LIMITS;

  /* ================= 1. ZIELE (identische Formeln wie transformation.js) === */
  var ACTIVITY_F = { sitzend: 1.2, leicht: 1.375, moderat: 1.55, hoch: 1.725 };
  var BULK_RATE = { neu: 0.35, mid: 0.25, pro: 0.15 };

  function computeTargets(input) {
    var trf = input.transformation, a = input.answers;
    var eff = (input.score && input.score.effects) || {};
    var cur = trf.startWeightKg, goal = trf.finalTargetWeightKg;
    var cut = goal < cur;
    var delta = Math.abs(cur - goal);
    var enh = trf.mode === "enhanced";

    var bmr = Math.round(10 * cur + 6.25 * (trf.heightCm || 175) - 5 * a.age + 5);
    var tdee = Math.round(bmr * (ACTIVITY_F[a.activity] || ACTIVITY_F.moderat));

    var maxRate = cut ? cur * (enh ? 0.010 : 0.0075)
                      : (BULK_RATE[a.experience] || 0.25) * (enh ? 1.5 : 1);
    // Score-Kontext: konservativer Faktor (nie schneller machen)
    var rate = maxRate * 0.8 * (typeof eff.rateFactor === "number" ? eff.rateFactor : 1);
    rate = Math.max(rate, 0.05);
    // Harte Leitplanke: nie über 1 % KG/Woche im Cut
    if (cut) rate = Math.min(rate, cur * L.cutRatePerWeekMaxPct);

    var kcalDelta = Math.round(rate * 7700 / 7);
    var kcal;
    if (cut) {
      kcalDelta = Math.min(kcalDelta, enh ? 900 : 700);
      kcal = Math.max(tdee - kcalDelta, L.kcalMin);
    } else {
      kcalDelta = Math.min(Math.max(kcalDelta, 150), 500);
      kcal = Math.min(tdee + kcalDelta, L.kcalMax);
    }
    var expectedTotalWeeks = Math.max(1, Math.ceil(delta / rate));

    // Phase-1-Ziel: was 12 Wochen mit dieser Rate seriös schaffen
    var isFinal = expectedTotalWeeks <= L.durationWeeks;
    var w12lo, w12hi;
    if (isFinal) {
      w12lo = Math.round(goal - 1); w12hi = Math.round(goal + 1);
      if (cut) w12lo = Math.max(w12lo, Math.round(goal - 1));
    } else {
      var mid = cut ? cur - rate * L.durationWeeks : cur + rate * L.durationWeeks;
      w12lo = Math.round(mid - 1); w12hi = Math.round(mid + 1);
      if (cut && w12lo < goal) w12lo = Math.round(goal);
      if (!cut && w12hi > goal) w12hi = Math.round(goal);
    }

    var protein = Math.round((cut ? 2.2 : (enh ? 2.2 : 2.0)) * goal);
    // Protein-Korridor gegen das AUSGANGSgewicht absichern (Modelgrenze)
    var perKgMax = L.proteinPerKgMax * cur, perKgMin = L.proteinPerKgMin * cur;
    protein = Math.round(Math.min(Math.max(protein, perKgMin), perKgMax));
    var fatMin = Math.max(60, Math.round(0.8 * goal));

    return {
      cut: cut, bmr: bmr, tdee: tdee,
      kcal: kcal, kcalRange: [kcal - 100, kcal + 50 + (cut ? 50 : 100)],
      ratePerWeek: Math.round(rate * 100) / 100,
      expectedTotalWeeks: expectedTotalWeeks,
      isFinalPhase: isFinal,
      week12TargetMinKg: Math.min(w12lo, w12hi),
      week12TargetMaxKg: Math.max(w12lo, w12hi),
      proteinTargetGrams: protein,
      fatMinimumGrams: fatMin
    };
  }

  /* ================= 2. TRAINING ================= */
  /* Übungskatalog: kompakt, bewährt, mit Ersatzübung (gleiche Bewegung)
     und Home-Variante. `injury`-Tags: bei dieser Einschränkung ersetzen. */
  var EX = {
    squat:      { de: "Kniebeuge (Langhantel)", en: "Barbell squat",       alt: "legpress",   home: "gobletsquat", injury: ["knie", "ruecken"] },
    legpress:   { de: "Beinpresse",             en: "Leg press",           alt: "gobletsquat", home: "gobletsquat", injury: ["knie"] },
    gobletsquat:{ de: "Goblet Squat (Kurzhantel)", en: "Goblet squat",     alt: "splitsquat", home: "splitsquat",  injury: ["knie"] },
    splitsquat: { de: "Ausfallschritt / Split Squat", en: "Split squat",   alt: "legpress",   home: "splitsquat",  injury: ["knie"] },
    hinge:      { de: "Rumänisches Kreuzheben", en: "Romanian deadlift",   alt: "legcurl",    home: "dbrdl",       injury: ["ruecken"] },
    dbrdl:      { de: "Kurzhantel-RDL",         en: "Dumbbell RDL",        alt: "hipthrust",  home: "hipthrust",   injury: ["ruecken"] },
    legcurl:    { de: "Beinbeuger (Maschine)",  en: "Leg curl",            alt: "hinge",      home: "dbrdl",       injury: [] },
    hipthrust:  { de: "Hip Thrust",             en: "Hip thrust",          alt: "hinge",      home: "hipthrust",   injury: [] },
    bench:      { de: "Bankdrücken (Langhantel)", en: "Barbell bench press", alt: "dbbench",  home: "pushup",      injury: ["schulter", "handgelenk"] },
    dbbench:    { de: "Kurzhantel-Bankdrücken", en: "Dumbbell bench press", alt: "pushup",    home: "pushup",      injury: ["schulter"] },
    pushup:     { de: "Liegestütz (ggf. erhöht)", en: "Push-up",           alt: "dbbench",    home: "pushup",      injury: ["handgelenk"] },
    ohp:        { de: "Schulterdrücken",        en: "Overhead press",      alt: "dbohp",      home: "dbohp",       injury: ["schulter"] },
    dbohp:      { de: "Kurzhantel-Schulterdrücken", en: "DB overhead press", alt: "lateral",  home: "dbohp",       injury: ["schulter"] },
    lateral:    { de: "Seitheben",              en: "Lateral raise",       alt: "dbohp",      home: "lateral",     injury: [] },
    row:        { de: "Rudern (Langhantel/Kabel)", en: "Row (barbell/cable)", alt: "dbrow",   home: "dbrow",       injury: ["ruecken"] },
    dbrow:      { de: "Einarmiges Kurzhantel-Rudern", en: "One-arm DB row", alt: "row",       home: "dbrow",       injury: [] },
    pulldown:   { de: "Latzug / Klimmzug",      en: "Lat pulldown / pull-up", alt: "dbrow",   home: "dbrow",       injury: ["schulter"] },
    curl:       { de: "Bizeps-Curls",           en: "Biceps curls",        alt: "dbrow",      home: "curl",        injury: [] },
    triceps:    { de: "Trizepsdrücken",         en: "Triceps extension",   alt: "pushup",     home: "pushup",      injury: ["schulter"] },
    core:       { de: "Plank / Beinheben",      en: "Plank / leg raise",   alt: "core",       home: "core",        injury: [] }
  };

  /* Slot: [exId, sets, repsLo, repsHi, restSec, short] — short=true: Teil der
     Kurzversion. Reihenfolge = Stimulus-Priorität (Verbund zuerst). */
  var TEMPLATES = {
    fb2: {
      id: "fb2", name: { de: "Ganzkörper 2×/Woche", en: "Full body 2×/week" }, days: 2,
      sessions: [
        { key: "A", name: { de: "Ganzkörper A", en: "Full body A" }, slots: [
          ["squat", 3, 6, 10, 150, true], ["bench", 3, 6, 10, 150, true],
          ["row", 3, 8, 12, 120, true], ["hinge", 2, 8, 12, 120, false],
          ["lateral", 2, 12, 15, 60, false], ["core", 2, 10, 15, 60, false] ] },
        { key: "B", name: { de: "Ganzkörper B", en: "Full body B" }, slots: [
          ["hinge", 3, 6, 10, 150, true], ["ohp", 3, 6, 10, 150, true],
          ["pulldown", 3, 8, 12, 120, true], ["splitsquat", 2, 8, 12, 120, false],
          ["curl", 2, 10, 15, 60, false], ["triceps", 2, 10, 15, 60, false] ] }
      ]
    },
    fb3: {
      id: "fb3", name: { de: "Ganzkörper 3×/Woche", en: "Full body 3×/week" }, days: 3,
      sessions: [
        { key: "A", name: { de: "Ganzkörper A", en: "Full body A" }, slots: [
          ["squat", 3, 6, 10, 150, true], ["bench", 3, 6, 10, 150, true],
          ["row", 3, 8, 12, 120, true], ["lateral", 2, 12, 15, 60, false], ["core", 2, 10, 15, 60, false] ] },
        { key: "B", name: { de: "Ganzkörper B", en: "Full body B" }, slots: [
          ["hinge", 3, 6, 10, 150, true], ["ohp", 3, 6, 10, 150, true],
          ["pulldown", 3, 8, 12, 120, true], ["curl", 2, 10, 15, 60, false], ["triceps", 2, 10, 15, 60, false] ] },
        { key: "C", name: { de: "Ganzkörper C", en: "Full body C" }, slots: [
          ["legpress", 3, 8, 12, 120, true], ["dbbench", 3, 8, 12, 120, true],
          ["dbrow", 3, 8, 12, 120, true], ["legcurl", 2, 10, 15, 90, false], ["core", 2, 10, 15, 60, false] ] }
      ]
    },
    ul4: {
      id: "ul4", name: { de: "Ober-/Unterkörper 4×/Woche", en: "Upper/lower 4×/week" }, days: 4,
      sessions: [
        { key: "A", name: { de: "Oberkörper A", en: "Upper A" }, slots: [
          ["bench", 3, 6, 10, 150, true], ["row", 3, 6, 10, 150, true],
          ["ohp", 2, 8, 12, 120, true], ["pulldown", 2, 8, 12, 120, false],
          ["curl", 2, 10, 15, 60, false], ["triceps", 2, 10, 15, 60, false] ] },
        { key: "B", name: { de: "Unterkörper A", en: "Lower A" }, slots: [
          ["squat", 3, 6, 10, 180, true], ["hinge", 3, 8, 12, 150, true],
          ["splitsquat", 2, 8, 12, 120, false], ["core", 2, 10, 15, 60, false] ] },
        { key: "C", name: { de: "Oberkörper B", en: "Upper B" }, slots: [
          ["ohp", 3, 6, 10, 150, true], ["pulldown", 3, 8, 12, 150, true],
          ["dbbench", 2, 8, 12, 120, true], ["dbrow", 2, 8, 12, 120, false],
          ["lateral", 2, 12, 15, 60, false] ] },
        { key: "D", name: { de: "Unterkörper B", en: "Lower B" }, slots: [
          ["legpress", 3, 8, 12, 150, true], ["hipthrust", 3, 8, 12, 120, true],
          ["legcurl", 2, 10, 15, 90, false], ["core", 2, 10, 15, 60, false] ] }
      ]
    }
  };

  /* Übung für Ort/Verletzung auflösen — deterministisch, Bewegungsmuster
     bleibt erhalten. */
  function resolveExercise(exId, location, injuries) {
    var seen = {};
    var id = exId;
    for (var i = 0; i < 4; i++) {
      if (seen[id]) break; seen[id] = true;
      var ex = EX[id]; if (!ex) return exId;
      if (location === "home" && ex.home && ex.home !== id) { id = ex.home; continue; }
      var hurt = (injuries || []).some(function (inj) { return (EX[id].injury || []).indexOf(inj) >= 0; });
      if (hurt && ex.alt && ex.alt !== id) { id = ex.alt; continue; }
      break;
    }
    return id;
  }

  function buildTraining(input, targets) {
    var a = input.answers;
    var eff = (input.score && input.score.effects) || {};
    var days = a.daysPerWeek;
    if (eff.daysCap) days = Math.min(days, eff.daysCap);
    days = Math.max(L.daysPerWeekMin, Math.min(L.daysPerWeekMax, days));
    var tplId = days <= 2 ? "fb2" : (days === 3 || eff.preferFullBody ? "fb3" : "ul4");
    if (days === 4 && eff.preferFullBody) tplId = "fb3"; // Struktur-Engpass: einfacher Split
    var tpl = TEMPLATES[tplId];
    var maxMin = a.maxSessionMinutes || 60;
    if (eff.sessionCap) maxMin = Math.min(maxMin, eff.sessionCap);

    var sessions = tpl.sessions.slice(0, Math.max(days, tpl.sessions.length === 2 ? 2 : days)).map(function (s) {
      return {
        key: s.key, name: s.name,
        exercises: s.slots.map(function (slot) {
          var id = resolveExercise(slot[0], a.location, a.injuries || []);
          return {
            id: id, plannedId: slot[0],
            name: EX[id] ? EX[id].de : id, nameEn: EX[id] ? EX[id].en : id,
            sets: slot[1], repsLo: slot[2], repsHi: slot[3],
            rir: 2, restSec: slot[4], inShort: !!slot[5],
            substitute: EX[id] && EX[id].alt ? { id: EX[id].alt, name: EX[EX[id].alt].de, nameEn: EX[EX[id].alt].en } : null
          };
        })
      };
    });

    // Wochentage → Session-Zuordnung (n-ter Trainingstag = n-te Session, rotierend).
    // Deckelt der Score-Kontext die Tage (z. B. Regeneration: 4 → 3), werden
    // die Wochentage deterministisch gleichmäßig verteilt mitgekürzt.
    var weekdays = (a.weekdays || []).slice().sort(function (x, y) { return x - y; });
    if (weekdays.length > days) {
      var keep = [];
      for (var wi = 0; wi < days; wi++) {
        keep.push(weekdays[Math.round(wi * (weekdays.length - 1) / (days - 1))]);
      }
      weekdays = keep.filter(function (v, i) { return keep.indexOf(v) === i; });
      while (weekdays.length < days) {
        var cand = a.weekdays.filter(function (d) { return weekdays.indexOf(d) < 0; })[0];
        if (cand == null) break;
        weekdays.push(cand); weekdays.sort(function (x, y) { return x - y; });
      }
    }

    return {
      experienceLevel: a.experience === "neu" ? "beginner" : (a.experience === "pro" ? "advanced" : "intermediate"),
      location: a.location,
      daysPerWeek: days,
      weekdays: weekdays,
      preferredTimes: a.preferredTime ? weekdays.reduce(function (o, d) { o[d] = a.preferredTime; return o; }, {}) : {},
      maximumSessionMinutes: maxMin,
      templateId: tplId,
      sessions: sessions,
      progressionRule: {
        de: "Doppelte Progression: erst Wiederholungen bis zum oberen Ende des Bereichs steigern (bei RIR 2), dann Gewicht erhöhen (untere Wiederholungszahl, +2,5 kg Oberkörper / +5 kg Unterkörper) und wieder hocharbeiten.",
        en: "Double progression: first add reps to the top of the range (at RIR 2), then add weight (bottom of the range, +2.5 kg upper / +5 kg lower) and work back up."
      },
      deloadWeeks: eff.deloadEarly ? [5, 10] : [7],
      deloadRule: {
        de: "In der reduzierten Woche: gleiche Übungen, ein Satz weniger pro Übung, ~80 % des Gewichts. Grund: geplante Erholung schützt Progression und Gelenke.",
        en: "In the deload week: same exercises, one set less per exercise, ~80% of the load. Reason: planned recovery protects progression and joints."
      },
      shortVersionRule: {
        de: "Kurzversion (~25–30 min): nur die markierten Grundübungen, 2 Sätze, Pausen 90 s. Zählt voll als absolviertes Training.",
        en: "Short version (~25–30 min): only the marked main lifts, 2 sets, 90 s rests. Counts fully as a completed session."
      },
      travelRule: {
        de: "Reise/kein Gym: Zuhause-Variante jeder Übung (wird automatisch angezeigt) oder Kurzversion mit Körpergewicht. Verpasste Tage werden nicht nachgeholt gestapelt — weiter im Rhythmus.",
        en: "Travel/no gym: home variant of each exercise (shown automatically) or bodyweight short version. Missed days are not stacked — continue in rhythm."
      },
      comebackRule: {
        de: "Wiedereinstieg nach Krankheit: erste Woche mit 2 Sätzen und ~70 % Gewicht, dann normal weiter. Nichts wird 'aufgeholt'.",
        en: "Return after illness: first week 2 sets at ~70% load, then continue normally. Nothing is 'caught up'."
      },
      injuries: a.injuries || []
    };
  }

  /* ================= 3. ERNÄHRUNG (Bausteinsystem) ================= */
  /* Lebensmittel: [Name de, Name en, kcal/100g, Protein/100g, Kategorie]
     Kategorien: gemuese, protein, milch, kh, tk, sonstiges */
  var FOODS = {
    haferflocken: ["Haferflocken", "Oats", 370, 13, "kh"],
    magerquark: ["Magerquark", "Low-fat quark", 67, 12, "milch"],
    skyr: ["Skyr", "Skyr", 63, 11, "milch"],
    eier: ["Eier", "Eggs", 155, 13, "protein"],
    haehnchen: ["Hähnchenbrust", "Chicken breast", 165, 31, "protein"],
    rind: ["Rinderhack (5%)", "Lean beef mince", 137, 21, "protein"],
    lachs: ["Lachs", "Salmon", 208, 20, "protein"],
    thunfisch: ["Thunfisch (Dose, Wasser)", "Canned tuna in water", 116, 26, "protein"],
    tofu: ["Tofu", "Tofu", 76, 8, "protein"],
    linsen: ["Rote Linsen (trocken)", "Red lentils (dry)", 352, 24, "kh"],
    kichererbsen: ["Kichererbsen (Dose)", "Chickpeas (canned)", 139, 7, "kh"],
    reis: ["Reis (trocken)", "Rice (dry)", 349, 7, "kh"],
    kartoffeln: ["Kartoffeln", "Potatoes", 77, 2, "gemuese"],
    nudeln: ["Vollkornnudeln (trocken)", "Whole-grain pasta (dry)", 348, 13, "kh"],
    brot: ["Vollkornbrot", "Whole-grain bread", 244, 8, "kh"],
    brokkoli: ["Brokkoli", "Broccoli", 34, 3, "gemuese"],
    paprika: ["Paprika", "Bell pepper", 31, 1, "gemuese"],
    salat: ["Salatmix", "Salad mix", 20, 1, "gemuese"],
    tomaten: ["Tomaten", "Tomatoes", 18, 1, "gemuese"],
    banane: ["Banane", "Banana", 89, 1, "gemuese"],
    beerentk: ["Beeren (TK)", "Berries (frozen)", 45, 1, "tk"],
    gemuesetk: ["Gemüsemix (TK)", "Vegetable mix (frozen)", 40, 2, "tk"],
    olivenoel: ["Olivenöl", "Olive oil", 884, 0, "sonstiges"],
    nuesse: ["Nüsse/Mandeln", "Nuts/almonds", 620, 20, "sonstiges"],
    proteinpulver: ["Proteinpulver (Whey/vegan)", "Protein powder", 380, 78, "sonstiges"],
    kaese: ["Hüttenkäse", "Cottage cheese", 98, 13, "milch"],
    joghurt: ["Griechischer Joghurt 2%", "Greek yogurt 2%", 73, 10, "milch"]
  };

  /* Mahlzeitenbausteine. items: [foodId, Gramm]. tags: veggie / quick (≤10 min)
     / nocook. excl-Felder listen Auslöser aus dem Fragebogen (exclusions). */
  var MEAL_BLOCKS = [
    { id: "b1", slot: "breakfast", name: { de: "Protein-Porridge", en: "Protein porridge" }, tags: ["veggie", "quick"],
      items: [["haferflocken", 60], ["proteinpulver", 30], ["banane", 100], ["beerentk", 100]],
      prep: { de: "Haferflocken mit Wasser/Milch kochen, Pulver einrühren, Obst dazu.", en: "Cook oats, stir in powder, add fruit." } },
    { id: "b2", slot: "breakfast", name: { de: "Rührei mit Brot", en: "Scrambled eggs & bread" }, tags: ["quick"], excl: ["eier", "gluten"],
      items: [["eier", 165], ["brot", 80], ["tomaten", 100]],
      prep: { de: "3 Eier braten, dazu Brot und Tomaten.", en: "Fry 3 eggs, serve with bread and tomatoes." } },
    { id: "b3", slot: "breakfast", name: { de: "Skyr-Bowl", en: "Skyr bowl" }, tags: ["veggie", "quick", "nocook"], excl: ["milch"],
      items: [["skyr", 300], ["haferflocken", 40], ["beerentk", 120], ["nuesse", 15]],
      prep: { de: "Alles in eine Schüssel — fertig.", en: "Everything in one bowl — done." } },
    { id: "l1", slot: "lunch", name: { de: "Hähnchen-Reis-Bowl", en: "Chicken rice bowl" }, tags: [],
      items: [["haehnchen", 180], ["reis", 75], ["brokkoli", 200], ["olivenoel", 10]],
      prep: { de: "Meal-Prep-tauglich: Reis kochen, Hähnchen braten, Brokkoli dämpfen. Hält 3 Tage im Kühlschrank.", en: "Meal-prep friendly: cook rice, pan-fry chicken, steam broccoli. Keeps 3 days." } },
    { id: "l2", slot: "lunch", name: { de: "Thunfisch-Nudeln", en: "Tuna pasta" }, tags: ["quick"], excl: ["fisch", "gluten"],
      items: [["nudeln", 90], ["thunfisch", 140], ["tomaten", 150], ["olivenoel", 8]],
      prep: { de: "Nudeln kochen, Thunfisch und Tomaten unterheben.", en: "Cook pasta, fold in tuna and tomatoes." } },
    { id: "l3", slot: "lunch", name: { de: "Linsen-Curry", en: "Lentil curry" }, tags: ["veggie"],
      items: [["linsen", 90], ["gemuesetk", 250], ["reis", 60], ["olivenoel", 8]],
      prep: { de: "Linsen + TK-Gemüse mit Currypaste köcheln, Reis dazu. Prep-tauglich.", en: "Simmer lentils + frozen veg with curry paste, serve with rice. Prep-friendly." } },
    { id: "l4", slot: "lunch", name: { de: "Tofu-Gemüse-Pfanne", en: "Tofu veggie stir-fry" }, tags: ["veggie", "quick"], excl: ["soja"],
      items: [["tofu", 200], ["gemuesetk", 300], ["reis", 60], ["olivenoel", 10]],
      prep: { de: "Tofu anbraten, Gemüse dazu, Reis als Beilage.", en: "Sear tofu, add veg, rice on the side." } },
    { id: "d1", slot: "dinner", name: { de: "Lachs mit Kartoffeln", en: "Salmon & potatoes" }, tags: [], excl: ["fisch"],
      items: [["lachs", 150], ["kartoffeln", 300], ["salat", 100], ["olivenoel", 8]],
      prep: { de: "Lachs im Ofen (200°, 15 min), Kartoffeln kochen.", en: "Bake salmon (200°C, 15 min), boil potatoes." } },
    { id: "d2", slot: "dinner", name: { de: "Hack-Gemüse-Pfanne", en: "Beef & veg skillet" }, tags: ["quick"], excl: ["schwein"],
      items: [["rind", 180], ["gemuesetk", 300], ["kartoffeln", 250]],
      prep: { de: "Hack anbraten, Gemüse dazu, Kartoffeln als Beilage.", en: "Brown the mince, add veg, potatoes on the side." } },
    { id: "d3", slot: "dinner", name: { de: "Kichererbsen-Salat mit Käse", en: "Chickpea salad with cheese" }, tags: ["veggie", "quick", "nocook"], excl: ["milch"],
      items: [["kichererbsen", 240], ["kaese", 200], ["salat", 150], ["paprika", 150], ["olivenoel", 10]],
      prep: { de: "Alles mischen — kein Herd nötig.", en: "Mix everything — no stove needed." } },
    { id: "s1", slot: "snack", name: { de: "Quark mit Beeren", en: "Quark with berries" }, tags: ["veggie", "quick", "nocook"], excl: ["milch"],
      items: [["magerquark", 250], ["beerentk", 100]],
      prep: { de: "Umrühren, fertig.", en: "Stir, done." } },
    { id: "s2", slot: "snack", name: { de: "Protein-Shake + Banane", en: "Protein shake + banana" }, tags: ["veggie", "quick", "nocook"],
      items: [["proteinpulver", 35], ["banane", 120]],
      prep: { de: "Shaken.", en: "Shake." } },
    { id: "s3", slot: "snack", name: { de: "Joghurt mit Nüssen", en: "Yogurt with nuts" }, tags: ["veggie", "quick", "nocook"], excl: ["milch", "nuesse"],
      items: [["joghurt", 250], ["nuesse", 20]],
      prep: { de: "Mischen.", en: "Mix." } },
    { id: "b4", slot: "breakfast", name: { de: "Bauern-Omelett", en: "Farmer's omelette" }, tags: ["veggie"],
      items: [["eier", 165], ["kartoffeln", 200], ["paprika", 100]],
      prep: { de: "Kartoffelwürfel anbraten, Eier und Paprika dazu, stocken lassen.", en: "Fry diced potatoes, add eggs and pepper, let set." } },
    { id: "b5", slot: "breakfast", name: { de: "Protein-Pancakes", en: "Protein pancakes" }, tags: ["veggie", "quick"],
      items: [["haferflocken", 50], ["eier", 110], ["skyr", 100], ["banane", 80]],
      prep: { de: "Alles mixen, als kleine Pancakes ausbacken.", en: "Blend everything, cook as small pancakes." } },
    { id: "l5", slot: "lunch", name: { de: "Reis-Hack-Bowl", en: "Rice & beef bowl" }, tags: [], excl: ["schwein"],
      items: [["rind", 160], ["reis", 70], ["gemuesetk", 250], ["olivenoel", 8]],
      prep: { de: "Hack anbraten, Gemüse dazu, auf Reis. Prep-tauglich, hält 3 Tage.", en: "Brown the mince, add veg, serve on rice. Prep-friendly, keeps 3 days." } },
    { id: "l6", slot: "lunch", name: { de: "Hähnchen-Nudel-Pfanne", en: "Chicken pasta skillet" }, tags: ["quick"], excl: ["gluten"],
      items: [["haehnchen", 160], ["nudeln", 80], ["paprika", 150], ["olivenoel", 8]],
      prep: { de: "Hähnchenstreifen braten, gekochte Nudeln und Paprika unterheben.", en: "Sear chicken strips, fold in cooked pasta and pepper." } },
    { id: "d4", slot: "dinner", name: { de: "Ofen-Hähnchen mit Kartoffeln", en: "Roast chicken & potatoes" }, tags: [],
      items: [["haehnchen", 170], ["kartoffeln", 300], ["gemuesetk", 200], ["olivenoel", 8]],
      prep: { de: "Alles aufs Blech, 200°, ~25 min — ein Blech, kein Abwasch-Drama.", en: "Everything on one tray, 200°C, ~25 min — one tray, no dish drama." } },
    { id: "d5", slot: "dinner", name: { de: "Thunfisch-Kichererbsen-Salat", en: "Tuna chickpea salad" }, tags: ["quick", "nocook"], excl: ["fisch"],
      items: [["thunfisch", 140], ["kichererbsen", 200], ["tomaten", 150], ["olivenoel", 10]],
      prep: { de: "Abtropfen, mischen, fertig — kein Herd nötig.", en: "Drain, mix, done — no stove needed." } },
    { id: "d6", slot: "dinner", name: { de: "Tofu-Kartoffel-Curry", en: "Tofu potato curry" }, tags: ["veggie"], excl: ["soja"],
      items: [["tofu", 200], ["gemuesetk", 300], ["kartoffeln", 200], ["olivenoel", 10]],
      prep: { de: "Tofu anbraten, Gemüse + Kartoffeln + Currypaste köcheln.", en: "Sear tofu, simmer veg + potatoes + curry paste." } },
    { id: "s4", slot: "snack", name: { de: "Hüttenkäse mit Tomaten", en: "Cottage cheese & tomatoes" }, tags: ["veggie", "quick", "nocook"], excl: ["milch"],
      items: [["kaese", 200], ["tomaten", 100]],
      prep: { de: "Pfeffer drüber, fertig.", en: "Add pepper, done." } },
    { id: "s5", slot: "snack", name: { de: "Banane mit Nüssen", en: "Banana & nuts" }, tags: ["veggie", "quick", "nocook"], excl: ["nuesse"],
      items: [["banane", 120], ["nuesse", 25]],
      prep: { de: "Auspacken. Essen.", en: "Unwrap. Eat." } }
  ];

  function blockMacros(block, factor) {
    var kcal = 0, protein = 0;
    block.items.forEach(function (it) {
      var f = FOODS[it[0]];
      var g = it[1] * (factor || 1);
      kcal += f[2] * g / 100; protein += f[3] * g / 100;
    });
    return { kcal: Math.round(kcal), protein: Math.round(protein) };
  }

  /* Bausteine für den Nutzer filtern: Ernährungsform, Ausschlüsse, Kochzeit. */
  function eligibleBlocks(a) {
    var excl = a.exclusions || [];
    return MEAL_BLOCKS.filter(function (b) {
      if (a.diet === "veggie" && b.tags.indexOf("veggie") < 0) return false;
      // Ausschluss, wenn ein Lebensmittel des Blocks einer Ausschluss-Gruppe entspricht
      var hit = b.items.some(function (it) {
        var id = it[0];
        if (excl.indexOf("fisch") >= 0 && (id === "lachs" || id === "thunfisch")) return true;
        if (excl.indexOf("milch") >= 0 && ["magerquark", "skyr", "kaese", "joghurt"].indexOf(id) >= 0) return true;
        if (excl.indexOf("eier") >= 0 && id === "eier") return true;
        if (excl.indexOf("gluten") >= 0 && ["haferflocken", "brot", "nudeln"].indexOf(id) >= 0) return true;
        if (excl.indexOf("nuesse") >= 0 && id === "nuesse") return true;
        if (excl.indexOf("soja") >= 0 && id === "tofu") return true;
        if (excl.indexOf("schwein") >= 0 && id === "schwein") return true;
        return false;
      });
      if (hit) return false;
      if (a.cookingMinutesMax && a.cookingMinutesMax <= 10 && b.slot !== "snack" &&
          b.tags.indexOf("quick") < 0 && b.tags.indexOf("nocook") < 0) return false;
      return true;
    });
  }

  /* Tagesstruktur: Kalorien-Split je Mahlzeitenanzahl. */
  var MEAL_SPLITS = {
    2: [["lunch", 0.5], ["dinner", 0.5]],
    3: [["breakfast", 0.3], ["lunch", 0.4], ["dinner", 0.3]],
    4: [["breakfast", 0.25], ["lunch", 0.35], ["dinner", 0.3], ["snack", 0.1]],
    5: [["breakfast", 0.25], ["lunch", 0.3], ["dinner", 0.25], ["snack", 0.1], ["snack", 0.1]]
  };

  function buildNutrition(input, targets) {
    var a = input.answers;
    var blocks = eligibleBlocks(a);
    var split = MEAL_SPLITS[a.mealCount || 3] || MEAL_SPLITS[3];
    var plan = [];
    var chosen = [];
    split.forEach(function (sl, idx) {
      var slot = sl[0], share = sl[1];
      var targetKcal = targets.kcal * share;
      var options = blocks.filter(function (b) { return b.slot === slot; });
      if (!options.length) options = MEAL_BLOCKS.filter(function (b) { return b.slot === slot; });
      var opts = options.map(function (b) {
        var base = blockMacros(b, 1);
        var factor = Math.max(0.6, Math.min(1.6, targetKcal / base.kcal));
        factor = Math.round(factor * 20) / 20;
        var m = blockMacros(b, factor);
        return {
          blockId: b.id, name: b.name, slot: slot, factor: factor,
          kcal: m.kcal, protein: m.protein,
          items: b.items.map(function (it) {
            var f = FOODS[it[0]];
            return { foodId: it[0], name: f[0], nameEn: f[1], grams: Math.round(it[1] * factor / 5) * 5, category: f[4] };
          }),
          prep: b.prep, tags: b.tags
        };
      });
      plan.push({ slotIndex: idx, slot: slot, targetKcal: Math.round(targetKcal), options: opts });
      if (opts.length) chosen.push(opts[0].blockId + "@" + opts[0].factor);
    });

    return {
      calorieTarget: targets.kcal,
      calorieRangeMin: targets.kcalRange[0], calorieRangeMax: targets.kcalRange[1],
      proteinTargetGrams: targets.proteinTargetGrams,
      fatMinimumGrams: targets.fatMinimumGrams,
      mealCount: a.mealCount || 3,
      dietaryPreferences: a.diet ? [a.diet] : [],
      exclusions: a.exclusions || [], allergies: a.exclusions || [],
      cookingMinutesMax: a.cookingMinutesMax || null,
      eatingOutPerWeek: a.eatingOutPerWeek != null ? a.eatingOutPerWeek : null,
      mealTemplateIds: chosen,           // Default-Auswahl: erste Option je Slot
      meals: plan,                        // alle Optionen inkl. Mengen/Makros
      householdSize: a.householdSize || 1,
      shoppingDay: a.shoppingDay != null ? a.shoppingDay : 6,
      mealPrepDay: a.mealPrepDay != null ? a.mealPrepDay : 0,
      hydration: { de: "Trinken: ~30–40 ml je kg Körpergewicht, mehr an Trainingstagen. Kein Zwang, kein Tracking-Theater.", en: "Drink ~30–40 ml per kg bodyweight, more on training days. No obsession, no tracking theater." },
      practicalRules: PRACTICAL_RULES
    };
  }

  var PRACTICAL_RULES = [
    { id: "restaurant", name: { de: "Restaurant", en: "Restaurant" },
      rule: { de: "Wähle eine Proteinquelle + Gemüse/Beilage, Sauce separat. Ein Essen kippt keine Woche — der Wochendurchschnitt zählt.", en: "Pick one protein + veg/side, sauce on the side. One meal never ruins a week — the weekly average counts." } },
    { id: "weekend", name: { de: "Wochenende", en: "Weekend" },
      rule: { de: "Gleiche Struktur, lockerere Auswahl: Protein-Anker je Mahlzeit halten, Rest entspannt. Sonntag ist Prep-Tag.", en: "Same structure, looser choices: keep the protein anchor per meal, relax the rest. Sunday is prep day." } },
    { id: "family", name: { de: "Familienessen", en: "Family meals" },
      rule: { de: "Iss dasselbe wie alle — nur deine Portion Protein zuerst und Beilagen nach Hunger. Mengen gelten pro Person.", en: "Eat what everyone eats — your protein portion first, sides by hunger. Amounts are per person." } },
    { id: "timecrunch", name: { de: "Zeitmangel", en: "No time" },
      rule: { de: "Nimm die No-Cook-Optionen (Skyr-Bowl, Kichererbsen-Salat, Shake). 5 Minuten schlagen 0 Minuten.", en: "Use the no-cook options (skyr bowl, chickpea salad, shake). 5 minutes beats 0 minutes." } },
    { id: "travel", name: { de: "Urlaub / Reise", en: "Vacation / travel" },
      rule: { de: "Halte nur zwei Dinge: Proteinziel grob und Schritte. Der Plan wartet — kein Aufholen nötig.", en: "Keep only two things: rough protein target and steps. The plan waits — no catching up needed." } },
    { id: "nocooking", name: { de: "Keine Kochmöglichkeit", en: "No kitchen" },
      rule: { de: "Supermarkt-Standard: Skyr/Quark, fertiges Hähnchen, Brot, Obst, Nüsse. Reicht vollständig.", en: "Supermarket default: skyr/quark, rotisserie chicken, bread, fruit, nuts. Fully sufficient." } },
    { id: "hunger", name: { de: "Hoher Hunger", en: "Very hungry" },
      rule: { de: "Zuerst: +300–500 g Gemüse und +30 g Protein — dann neu bewerten. Hunger an 1–2 Tagen ist normal, dauerhafter Hunger ist ein Wochencheck-Thema.", en: "First: +300–500 g vegetables and +30 g protein — then reassess. Hunger on 1–2 days is normal; constant hunger is a weekly-check topic." } },
    { id: "missedmeal", name: { de: "Mahlzeit verpasst", en: "Missed meal" },
      rule: { de: "Nicht nachessen, nicht kompensieren. Nächste Mahlzeit normal.", en: "Don't double up, don't compensate. Next meal as normal." } },
    { id: "invitation", name: { de: "Spontane Einladung", en: "Spontaneous invitation" },
      rule: { de: "Zusagen, genießen, am nächsten Tag normal weiter. Der Plan ist ein System, kein Käfig.", en: "Say yes, enjoy, continue normally tomorrow. The plan is a system, not a cage." } }
  ];

  /* ================= 4. EINKAUFSLISTE ================= */
  var CATEGORY_NAMES = {
    gemuese: { de: "Gemüse & Obst", en: "Vegetables & fruit" },
    protein: { de: "Proteinquellen", en: "Protein sources" },
    milch: { de: "Milchprodukte", en: "Dairy" },
    kh: { de: "Kohlenhydrate", en: "Carbs" },
    tk: { de: "Tiefkühl", en: "Frozen" },
    sonstiges: { de: "Gewürze & Sonstiges", en: "Spices & other" }
  };

  /* Aus der aktuellen Bausteinwahl die Wochenliste bauen.
     selection: Array "blockId@factor" (nutrition.mealTemplateIds); jeder
     gewählte Baustein wird an 7 Tagen gegessen (einfaches, wiederholbares
     System) — Restauranttage reduzieren die Menge. */
  function shoppingList(nutrition, opts) {
    opts = opts || {};
    var persons = nutrition.householdSize || 1;
    var eatOut = nutrition.eatingOutPerWeek || 0;
    var byFood = {};
    (nutrition.mealTemplateIds || []).forEach(function (sel) {
      var parts = String(sel).split("@");
      var block = MEAL_BLOCKS.filter(function (b) { return b.id === parts[0]; })[0];
      if (!block) return;
      var factor = parseFloat(parts[1]) || 1;
      // Abendessen/Mittag: an Auswärts-Tagen entfällt eine Hauptmahlzeit
      var days = 7;
      if ((block.slot === "dinner" || block.slot === "lunch") && eatOut) {
        days = Math.max(3, 7 - Math.ceil(eatOut / 2));
      }
      block.items.forEach(function (it) {
        var f = FOODS[it[0]];
        var grams = it[1] * factor * days * persons;
        if (!byFood[it[0]]) byFood[it[0]] = { foodId: it[0], name: f[0], nameEn: f[1], category: f[4], grams: 0 };
        byFood[it[0]].grams += grams;
      });
    });
    var pantry = opts.pantry || [];    // Vorräte: foodIds, die schon da sind
    var items = Object.keys(byFood).map(function (k) { return byFood[k]; })
      .filter(function (it) { return pantry.indexOf(it.foodId) < 0; })
      .map(function (it) { it.grams = Math.round(it.grams / 25) * 25; return it; });

    var cats = {};
    items.forEach(function (it) { (cats[it.category] = cats[it.category] || []).push(it); });
    var categories = Object.keys(CATEGORY_NAMES).filter(function (c) { return cats[c]; }).map(function (c) {
      return { key: c, name: CATEGORY_NAMES[c], items: cats[c].sort(function (a, b) { return b.grams - a.grams; }) };
    });
    return { persons: persons, days: 7, categories: categories, itemCount: items.length };
  }

  /* Klartext-Export (Kopieren / Web Share / Notizen). */
  function shoppingListText(list, lang) {
    var en = lang === "en";
    var out = [en ? "MaleMetrix — shopping list (7 days)" : "MaleMetrix — Einkaufsliste (7 Tage)"];
    if (list.persons > 1) out[0] += en ? " · " + list.persons + " people" : " · " + list.persons + " Personen";
    list.categories.forEach(function (c) {
      out.push("");
      out.push((en ? c.name.en : c.name.de).toUpperCase());
      c.items.forEach(function (it) {
        var amount = it.grams >= 1000 ? (Math.round(it.grams / 100) / 10) + " kg" : it.grams + " g";
        out.push("- " + (en ? it.nameEn : it.name) + " — " + amount);
      });
    });
    return out.join("\n");
  }

  /* ================= 5. WOCHENSTRUKTUR ================= */
  function buildWeekStructure(training, nutrition, answers) {
    var days = [];
    for (var d = 0; d < 7; d++) {
      var isTrain = training.weekdays.indexOf(d) >= 0;
      days.push({
        weekday: d,
        training: isTrain ? training.sessions[training.weekdays.indexOf(d) % training.sessions.length].key : null,
        shopping: d === nutrition.shoppingDay,
        mealPrep: d === nutrition.mealPrepDay,
        review: d === (answers.reviewWeekday != null ? answers.reviewWeekday : 0),
        movement: !isTrain
      });
    }
    return days;
  }

  /* ================= 6. PLAN ZUSAMMENSETZEN ================= */
  function createPlan(input, todayYmd) {
    if (!input || !input.ok) {
      return { ok: false, errors: ["Input unvollständig: " + ((input && input.missing) || []).join(", ")] };
    }
    var targets = computeTargets(input);
    var training = buildTraining(input, targets);
    var nutrition = buildNutrition(input, targets);
    var a = input.answers;

    var p = model.emptyPlan();
    p.id = "plan:" + todayYmd + ":" + (input.transformation.selectedAt || "").replace(/[^0-9]/g, "").slice(0, 12);
    p.status = "draft";
    p.startDate = todayYmd;
    p.endDate = model.addDays(todayYmd, L.durationWeeks * 7 - 1);

    p.selectedTransformation = {
      targetId: input.transformation.targetId,
      targetType: input.transformation.targetType,
      startWeightKg: input.transformation.startWeightKg,
      finalTargetWeightKg: input.transformation.finalTargetWeightKg,
      targetRangeMinKg: input.transformation.finalTargetWeightKg - 1,
      targetRangeMaxKg: input.transformation.finalTargetWeightKg + 1,
      expectedTotalWeeks: targets.expectedTotalWeeks,
      selectedAt: input.transformation.selectedAt,
      heightCm: input.transformation.heightCm,
      age: a.age, activity: a.activity,
      direction: input.transformation.direction
    };
    p.phaseGoal = {
      durationWeeks: L.durationWeeks,
      week12TargetMinKg: targets.week12TargetMinKg,
      week12TargetMaxKg: targets.week12TargetMaxKg,
      isFinalPhase: targets.isFinalPhase
    };
    if (input.score) {
      p.scoreContext = {
        primaryBottleneck: input.score.primaryBottleneck,
        relevantFactors: input.score.relevantFactors,
        medicalCautions: input.score.medicalCautions,
        scoreTotal: input.score.scoreTotal,
        scoredAt: input.score.scoredAt,
        consequence: input.score.consequence
      };
    }
    p.training = training;
    p.nutrition = nutrition;
    p.dailyTargets = {
      steps: (input.score && input.score.effects && input.score.effects.stepsModerate)
        ? Math.min(a.steps || 8000, 8000) : (a.steps || 8000),
      sleepTargetHours: 7.5,
      weighInWeekdays: [1, 3, 5]
    };
    p.reminderPreferences = {
      morningBriefTime: a.wakeTime || "07:00",
      trainingLeadMinutes: 60,
      eveningCloseTime: a.sleepTime ? shiftTime(a.sleepTime, -120) : "20:30",
      weeklyReviewWeekday: a.reviewWeekday != null ? a.reviewWeekday : 0,
      weeklyReviewTime: "18:00"
    };
    p.lifestyle = { wakeTime: a.wakeTime || null, sleepTime: a.sleepTime || null, workPattern: a.workPattern || "day" };
    p.week = buildWeekStructure(training, nutrition, a);
    p.derived = { bmr: targets.bmr, tdee: targets.tdee, ratePerWeek: targets.ratePerWeek, cut: targets.cut };

    var v = model.validate(p);
    if (!v.ok) return { ok: false, errors: v.errors };
    return { ok: true, plan: p, targets: targets };
  }

  function shiftTime(hhmm, minutes) {
    var p = hhmm.split(":");
    var t = (+p[0] * 60 + (+p[1] || 0) + minutes + 1440) % 1440;
    var h = Math.floor(t / 60), m = t % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }

  return {
    ACTIVITY_F: ACTIVITY_F,
    EX: EX, TEMPLATES: TEMPLATES,
    FOODS: FOODS, MEAL_BLOCKS: MEAL_BLOCKS, PRACTICAL_RULES: PRACTICAL_RULES,
    CATEGORY_NAMES: CATEGORY_NAMES,
    computeTargets: computeTargets,
    resolveExercise: resolveExercise,
    buildTraining: buildTraining,
    eligibleBlocks: eligibleBlocks,
    blockMacros: blockMacros,
    buildNutrition: buildNutrition,
    shoppingList: shoppingList,
    shoppingListText: shoppingListText,
    buildWeekStructure: buildWeekStructure,
    createPlan: createPlan
  };
});
