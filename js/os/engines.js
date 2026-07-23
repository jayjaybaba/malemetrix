/* ==========================================================================
   MALEMETRIX OS — ENGINES  (MM.engines)  · Phase 3.1 "Close the Loop"
   --------------------------------------------------------------------------
   Reine, deterministische Engines über dem Personal Graph:
     · TRANSFORMATION — Reality Check + Roadmap (Ranges, nie Garantien).
       Pathway-aware (§51): Enhanced-Kontext = höhere Spannen, höhere
       Unsicherheit, höhere Monitoring-Last — KEINE Dosierungen.
     · NUTRITION OS   — Aktivitätsmodell aus echten Daten (§27), Ziele,
       Meal-DB mit Gramm-Mengen (§43/§44), persistierbare Tage, echte Swaps
       mit Delta (§33), Logging-Aggregation + Adhärenz (§35/§36),
       %KG-basierte Anpassung je Modus (§40–§42).
     · TRAINING       — Experience-Modell (§17), Verletzungsfilter (§18),
       Volumen-Budget statt blindem +1 Satz (§19/§20), echte Progression aus
       Logs (§21), e1RM nach Epley (§22, dokumentiert), PR-Erkennung (§24),
       Plateau mit echten Daten (§25).
     · STACK          — tiefere Personalisierung (§46), Konflikt-Check (§48),
       Kosten-Engine (§49). ENHANCED: Klassen-Education (§54), KEINE
       individuellen Dosierungspläne.
     · PROGRESS       — Interpretation mit echten Kraftdaten, ehrliches
       "INSUFFICIENT DATA" statt falscher Recomp-Behauptung (§64/§118).
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};

  /* ======================= TRANSFORMATION ENGINE ======================= */
  // Monatliche Muskelaufbau-Spannen in % Körpergewicht/Monat nach Trainings-
  // alter. Rationale (dokumentiert, §52): abgeleitet aus der üblichen Praxis-
  // heuristik ~1–2 % KG im ersten Trainingsjahr/Monat fallend auf <0,5 % bei
  // Fortgeschrittenen (vgl. Lyle McDonald / Alan-Aragon-Modelle als Genre-
  // Konvention, keine exakte Studienzahl). Bewusst BREITE Spannen, keine
  // Pseudo-Präzision; Annahmen: konsistentes Training, Protein, Schlaf.
  var GAIN_RANGES = {
    beginner: { cons: 0.5, likely: 0.9, aggr: 1.3 },
    novice: { cons: 0.4, likely: 0.7, aggr: 1.0 },
    intermediate: { cons: 0.2, likely: 0.4, aggr: 0.6 },
    advanced: { cons: 0.1, likely: 0.2, aggr: 0.35 }
  };
  // §51/§53 — Enhanced-Kontext: Spannen verschieben sich nach oben, aber die
  // UNSICHERHEIT und die Gesundheits-/Monitoring-Kosten steigen überproportional.
  // Keine Substanzen, keine Dosierungen — nur ehrliche Kontext-Kategorien.
  var ENHANCED_CONTEXT = {
    rateNote: "Enhanced-Kontext: Aufbauraten liegen typischerweise über den Natural-Spannen, streuen aber extrem (Ansprechen, Substanzstrategie, Training, Historie). Wir nennen bewusst keine Zahl pro Substanz.",
    multipliers: { cons: 1.3, likely: 1.8, aggr: 2.5 },  // grobe Spannen-Verschiebung, KEIN Versprechen
    markers: { potential: "höher", complexity: "höher", monitoring: "deutlich höher", reversibility: "niedriger", healthCost: "höher" }
  };
  function transformation(input) {
    // input: {weightKg, bfPct?, heightCm, experience, targetWeightKg,
    //         targetLeanness('leaner'|'same'|'much_leaner'), months, pathway?}
    var exp = GAIN_RANGES[input.experience] ? input.experience : "novice";
    var months = Math.max(3, Math.min(24, input.months || 12));
    var r = GAIN_RANGES[exp];
    var w = input.weightKg;
    var enhanced = input.pathway === "enhanced";
    var mul = enhanced ? ENHANCED_CONTEXT.multipliers : { cons: 1, likely: 1, aggr: 1 };
    var gain = {
      cons: Math.round(w * (r.cons / 100) * mul.cons * months * 10) / 10,
      likely: Math.round(w * (r.likely / 100) * mul.likely * months * 10) / 10,
      aggr: Math.round(w * (r.aggr / 100) * mul.aggr * months * 10) / 10
    };
    var wantsGain = (input.targetWeightKg || w) - w;
    var wantsLeaner = input.targetLeanness === "leaner" || input.targetLeanness === "much_leaner";
    var feasible = wantsGain <= gain.aggr * 1.15;
    var reality;
    if (wantsGain > 0 && wantsLeaner) {
      reality = feasible
        ? "Aufbau UND schlanker in " + months + " Monaten ist machbar — aber nicht gleichzeitig in jeder Woche. Der realistische Weg läuft über Phasen: Aufbau-Blöcke plus gezielte Mini-Cuts."
        : "+" + wantsGain.toFixed(1) + " kg überwiegend Muskel in " + months + " Monaten liegt über der realistischen Spanne für dein Trainingsalter (" + gain.cons + "–" + gain.aggr + " kg). Das ist kein 12-Wochen-Ziel — plane länger oder passe das Ziel an.";
    } else if (wantsGain > 0) {
      reality = feasible
        ? "Realistisch. Erwartbarer Muskelaufbau in " + months + " Monaten: " + gain.cons + "–" + gain.aggr + " kg (wahrscheinlich ~" + gain.likely + " kg) — bei konsequentem Training, Essen und Schlaf."
        : "+" + wantsGain.toFixed(1) + " kg Muskel in " + months + " Monaten überschreitet die realistische Spanne (" + gain.cons + "–" + gain.aggr + " kg). Mehr Gewicht ginge — aber der Überschuss wäre großteils Fett.";
    } else {
      reality = "Fokus Fettabbau/Rekomposition: 0,5–1 % Körpergewicht pro Woche Abnahme ist nachhaltig; Kraft halten ist das Erfolgskriterium.";
    }
    if (enhanced) reality += " " + ENHANCED_CONTEXT.rateNote;
    var bf = input.bfPct || null;
    var phases = [];
    if (bf != null && bf >= 20) phases.push({ key: "cut", name: "CUT / CLEANUP", weeks: 12, why: "Erst Körperfett kontrollieren — Aufbau auf hohem KFA baut überproportional Fett mit auf." });
    phases.push({ key: "build1", name: "FOUNDATION / PRODUCTIVE GROWTH", weeks: 12, why: "Progressiver Aufbau-Block: Volumen, Progression, Essen, Schlaf." });
    if (wantsGain > 2 || months >= 9) phases.push({ key: "minicut", name: "MINI-CUT", weeks: 4, why: "Kurzer, harter Cut hält die Taille im Rahmen und verlängert produktive Aufbauzeit." });
    if (months >= 9) phases.push({ key: "build2", name: "PRODUCTIVE GROWTH II", weeks: 12, why: "Zweiter Wachstumsblock auf besserer Basis." });
    if (wantsLeaner) phases.push({ key: "reveal", name: "CONSOLIDATE / REVEAL", weeks: 8, why: "Definieren, Kraft sichern, Ergebnis sichtbar machen." });
    if (enhanced) phases.forEach(function (p) { p.monitoring = "Monitoring-Block: Blutdruck, Lipide/ApoB, Hämatokrit, Hormonachse — pro Phase mindestens ein Panel."; });
    return {
      experience: exp, months: months, gainRange: gain, feasible: feasible, reality: reality, phases: phases,
      pathway: input.pathway || "", enhanced: enhanced,
      enhancedMarkers: enhanced ? ENHANCED_CONTEXT.markers : null
    };
  }

  /* ======================= NUTRITION OS ======================= */
  function bmr(weightKg, heightCm, age) {   // Mifflin-St Jeor (männlich) — dokumentierte Standardformel
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * (age || 35) + 5);
  }
  var ACTIVITY = { low: 1.35, moderate: 1.5, high: 1.65, very_high: 1.75 };
  var MODE_ADJ = { cut: -0.2, recomp: 0, build: 0.1, perform: 0.05 };
  // §27 — Aktivität aus echten Daten statt hardcoded "moderate":
  // Trainingstage + Schrittniveau + Beruf → Startmultiplikator. Sobald echtes
  // Logging + Gewichtstrend existieren, korrigiert adaptiveTdee die Schätzung.
  function activityEstimate(g) {
    // g: {trainDays, stepsPerDay, occupation('sitting'|'mixed'|'physical'), cardioSessions}
    var score = 0;
    var td = g.trainDays || 0; score += td >= 5 ? 2 : td >= 3 ? 1.5 : td >= 1 ? 1 : 0;
    var st = g.stepsPerDay || 0; score += st >= 12000 ? 2 : st >= 8000 ? 1.2 : st >= 5000 ? 0.6 : 0;
    score += g.occupation === "physical" ? 1.5 : g.occupation === "mixed" ? 0.7 : 0;
    score += (g.cardioSessions || 0) >= 2 ? 0.6 : 0;
    var key = score >= 4.5 ? "very_high" : score >= 3 ? "high" : score >= 1.5 ? "moderate" : "low";
    return { key: key, factor: ACTIVITY[key], basis: g };
  }
  // Adaptive TDEE: beobachtete Energiebilanz schlägt jede Formel.
  // TDEE ≈ Ø-Intake − (Δkg/Woche × 7700 kcal / 7 Tage). Braucht ≥5 geloggte
  // Tage UND einen validen Gewichtstrend — sonst null (ehrlich).
  function adaptiveTdee(avgIntakeKcal, weightTrendKgPerWeek, daysLogged) {
    if (avgIntakeKcal == null || weightTrendKgPerWeek == null || (daysLogged || 0) < 5) return null;
    return Math.round((avgIntakeKcal - weightTrendKgPerWeek * 7700 / 7) / 10) * 10;
  }
  function nutritionTargets(g) {
    // g: {weightKg, heightCm, age, mode, activity(key ODER {trainDays,...}), trainDays}
    var actKey = typeof g.activity === "string" ? g.activity : (g.activity ? activityEstimate(g.activity).key : (g.trainDays != null ? activityEstimate({ trainDays: g.trainDays, stepsPerDay: g.stepsPerDay, occupation: g.occupation }).key : "moderate"));
    var base = bmr(g.weightKg, g.heightCm, g.age) * (ACTIVITY[actKey] || 1.5);
    var kcal = Math.round(base * (1 + (MODE_ADJ[g.mode] != null ? MODE_ADJ[g.mode] : 0)) / 10) * 10;
    var proteinPerKg = g.mode === "cut" ? 2.2 : g.mode === "build" ? 1.8 : 2.0;
    var protein = Math.round(g.weightKg * proteinPerKg);
    var fat = Math.round(kcal * 0.27 / 9);
    var carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
    return { kcal: kcal, kcalRange: [kcal - 150, kcal + 150], protein: protein, fat: fat, carbs: Math.max(0, carbs), basis: { bmr: bmr(g.weightKg, g.heightCm, g.age), activity: actKey, modeAdj: MODE_ADJ[g.mode] || 0 } };
  }

  /* ---- MEAL-DB (§43) — echte Rezepte, Gramm-Mengen für Einkaufsliste ----
     ing: [name, menge, einheit]. tags steuern Swaps/Filter. */
  function M(id, name, slot, kcal, p, c, f, min, cost, tags, ing, family) {
    var m = { id: id, name: name, slot: slot, kcal: kcal, p: p, c: c, f: f, min: min, cost: cost, tags: tags, ing: ing };
    if (family) m.family = family; return m;
  }
  var MEALS = [
    // ---------- FRÜHSTÜCK ----------
    M("skyr_beeren", "Skyr-Bowl mit Beeren & Nüssen", "breakfast", 420, 42, 38, 12, 5, 1, ["schnell", "billig", "nocook"], [["Skyr", 500, "g"], ["Beeren (TK)", 150, "g"], ["Walnüsse", 20, "g"], ["Honig", 10, "g"]]),
    M("eier_brot", "Rührei (4 Eier) auf Vollkornbrot", "breakfast", 520, 34, 35, 26, 10, 1, ["schnell", "füllend"], [["Eier", 4, "Stk"], ["Vollkornbrot", 2, "Scheiben"], ["Butter", 10, "g"], ["Tomate", 1, "Stk"]]),
    M("porridge_whey", "Protein-Porridge mit Banane", "breakfast", 480, 38, 62, 9, 8, 1, ["billig", "füllend"], [["Haferflocken", 80, "g"], ["Whey", 30, "g"], ["Banane", 1, "Stk"], ["Zimt", 2, "g"]]),
    M("omelett_gemuese", "Gemüse-Omelett mit Käse", "breakfast", 450, 32, 12, 30, 12, 2, ["lowcarb"], [["Eier", 3, "Stk"], ["Paprika", 1, "Stk"], ["Champignons", 100, "g"], ["Gouda", 30, "g"]]),
    M("quark_brot", "Körniger Frischkäse auf Brot mit Schnittlauch", "breakfast", 380, 35, 32, 10, 4, 1, ["schnell", "billig", "nocook"], [["Körniger Frischkäse", 300, "g"], ["Vollkornbrot", 2, "Scheiben"], ["Schnittlauch", 5, "g"]]),
    M("shake_pb", "Frühstücks-Shake (Whey · Hafer · Erdnuss)", "breakfast", 520, 42, 48, 16, 3, 1, ["schnell", "nocook"], [["Whey", 40, "g"], ["Haferflocken", 50, "g"], ["Erdnussmus", 15, "g"], ["Milch 1,5%", 300, "ml"]]),
    // ---------- HAUPTMAHLZEITEN ----------
    M("haehnchen_reis", "Hähnchen · Reis · Brokkoli", "main", 650, 55, 70, 12, 25, 2, ["füllend", "familie"], [["Hähnchenbrust", 250, "g"], ["Reis (roh)", 80, "g"], ["Brokkoli", 300, "g"], ["Olivenöl", 10, "g"]]),
    M("chili", "Chili con Carne (Familienrezept)", "main", 720, 58, 60, 24, 35, 2, ["familie", "füllend"], [["Rinderhack (5%)", 200, "g"], ["Kidneybohnen", 120, "g"], ["Mais", 80, "g"], ["Passierte Tomaten", 250, "g"], ["Reis (roh)", 60, "g"]], { servings: 4, note: "Ein Topf für alle — deine Portion wird abgemessen, keine Extra-Fitnessmahlzeit nötig." }),
    M("lachs_kartoffel", "Lachs · Kartoffeln · grüne Bohnen", "main", 620, 45, 48, 26, 30, 3, ["familie"], [["Lachsfilet", 200, "g"], ["Kartoffeln", 300, "g"], ["Grüne Bohnen", 200, "g"]]),
    M("wrap", "High-Protein-Wrap mit Pute", "main", 540, 44, 52, 16, 12, 2, ["schnell"], [["Vollkorn-Wraps", 2, "Stk"], ["Putenbrust", 150, "g"], ["Salat", 50, "g"], ["Tomate", 1, "Stk"], ["Hummus", 30, "g"]]),
    M("bowl_veg", "Linsen-Bowl mit Feta", "main", 580, 32, 65, 20, 20, 1, ["billig", "familie", "veg"], [["Rote Linsen (roh)", 100, "g"], ["Feta", 60, "g"], ["Gurke", 100, "g"], ["Tomate", 1, "Stk"], ["Olivenöl", 10, "g"], ["Vollkornfladenbrot", 1, "Stk"]]),
    M("pfanne_rind", "Rind-Gemüse-Pfanne mit Nudeln", "main", 680, 50, 68, 20, 25, 2, ["familie", "füllend"], [["Rinderstreifen", 200, "g"], ["Nudeln (roh)", 80, "g"], ["Paprika", 1, "Stk"], ["Zucchini", 1, "Stk"], ["Sojasauce", 20, "ml"]]),
    M("haehnchen_curry", "Hähnchen-Curry mit Reis (mild, familientauglich)", "main", 690, 52, 66, 22, 30, 2, ["familie"], [["Hähnchenbrust", 220, "g"], ["Kokosmilch light", 150, "ml"], ["Currypaste", 20, "g"], ["Reis (roh)", 75, "g"], ["Erbsen (TK)", 100, "g"]], { servings: 4, note: "Milde Basis für die Familie, deine Portion mit extra Hähnchen." }),
    M("bolognese", "Bolognese mit Vollkornnudeln", "main", 700, 48, 72, 20, 30, 2, ["familie", "füllend"], [["Rinderhack (5%)", 180, "g"], ["Passierte Tomaten", 250, "g"], ["Vollkornnudeln (roh)", 90, "g"], ["Zwiebel", 1, "Stk"], ["Karotte", 1, "Stk"]], { servings: 4, note: "Klassiker — Sauce für alle, Portionen einzeln abgewogen." }),
    M("ofen_gemuese_haehnchen", "Ofenblech: Hähnchen + Süßkartoffel + Gemüse", "main", 640, 50, 58, 18, 15, 2, ["familie", "mealprep"], [["Hähnchenbrust", 220, "g"], ["Süßkartoffel", 250, "g"], ["Paprika", 1, "Stk"], ["Zucchini", 1, "Stk"], ["Olivenöl", 12, "g"]]),
    M("thunfisch_bowl", "Thunfisch-Reis-Bowl (No-Cook mit Expressreis)", "main", 560, 46, 62, 12, 8, 1, ["schnell", "billig", "nocook"], [["Thunfisch (Dose, Wasser)", 2, "Dosen"], ["Expressreis", 250, "g"], ["Mais", 80, "g"], ["Joghurt 1,5%", 50, "g"]]),
    M("garnelen_pfanne", "Garnelen-Knoblauch-Pfanne mit Ciabatta", "main", 520, 42, 45, 18, 15, 3, ["lowcarb"], [["Garnelen", 250, "g"], ["Knoblauch", 3, "Zehen"], ["Olivenöl", 15, "g"], ["Ciabatta", 80, "g"], ["Rucola", 50, "g"]]),
    M("tofu_bowl", "Knusper-Tofu-Bowl mit Edamame", "main", 590, 38, 58, 22, 20, 2, ["veg"], [["Tofu (fest)", 250, "g"], ["Edamame (TK)", 100, "g"], ["Reis (roh)", 70, "g"], ["Sojasauce", 20, "ml"], ["Sesamöl", 8, "g"]]),
    M("steak_salat", "Steak auf lauwarmem Kartoffelsalat", "main", 650, 52, 42, 28, 25, 3, ["lowcarb", "füllend"], [["Rindersteak", 220, "g"], ["Kartoffeln", 250, "g"], ["Rucola", 50, "g"], ["Senf-Vinaigrette", 20, "g"]]),
    M("kichererbsen_curry", "Kichererbsen-Spinat-Curry (vegan)", "main", 560, 24, 68, 20, 20, 1, ["veg", "billig", "familie"], [["Kichererbsen (Dose)", 240, "g"], ["Spinat (TK)", 200, "g"], ["Kokosmilch light", 150, "ml"], ["Reis (roh)", 70, "g"]]),
    M("burger_bowl", "Burger-Bowl (Hack, ohne Bun)", "main", 620, 48, 40, 28, 20, 2, ["lowcarb", "füllend"], [["Rinderhack (5%)", 220, "g"], ["Salat", 100, "g"], ["Tomate", 1, "Stk"], ["Gewürzgurken", 50, "g"], ["Burgersauce light", 30, "g"], ["Kartoffelecken", 150, "g"]]),
    M("haehnchen_gyros", "Hähnchen-Gyros mit Tzatziki & Reis", "main", 660, 54, 60, 20, 25, 2, ["familie"], [["Hähnchenbrust", 230, "g"], ["Gyrosgewürz", 5, "g"], ["Joghurt 1,5%", 100, "g"], ["Gurke", 100, "g"], ["Reis (roh)", 70, "g"]]),
    // ---------- SNACKS ----------
    M("quark_abend", "Magerquark mit Leinöl & Banane", "snack", 380, 40, 30, 10, 3, 1, ["schnell", "billig", "nocook"], [["Magerquark", 400, "g"], ["Banane", 1, "Stk"], ["Leinöl", 10, "g"]]),
    M("shake", "Whey-Shake + Haferflocken", "snack", 400, 35, 45, 8, 3, 1, ["schnell", "billig", "nocook"], [["Whey", 30, "g"], ["Haferflocken", 50, "g"], ["Milch 1,5%", 300, "ml"]]),
    M("skyr_snack", "Skyr pur mit Honig", "snack", 220, 33, 20, 1, 2, 1, ["schnell", "billig", "nocook"], [["Skyr", 300, "g"], ["Honig", 10, "g"]]),
    M("nuss_apfel", "Apfel + Handvoll Mandeln", "snack", 250, 7, 25, 14, 1, 1, ["nocook", "unterwegs"], [["Apfel", 1, "Stk"], ["Mandeln", 25, "g"]]),
    M("eiweissbrot_huette", "Eiweißbrot mit Hüttenkäse & Tomate", "snack", 280, 26, 22, 9, 5, 2, ["schnell", "nocook"], [["Eiweißbrot", 2, "Scheiben"], ["Körniger Frischkäse", 150, "g"], ["Tomate", 1, "Stk"]]),
    M("beef_jerky", "Beef Jerky + Studentenfutter (unterwegs)", "snack", 320, 28, 24, 12, 0, 3, ["nocook", "unterwegs"], [["Beef Jerky", 50, "g"], ["Studentenfutter", 30, "g"]]),
    M("protein_pudding", "Proteinpudding mit Beeren", "snack", 260, 24, 26, 6, 2, 2, ["schnell", "nocook"], [["Proteinpudding", 200, "g"], ["Beeren (TK)", 100, "g"]]),
    M("banane_pb", "Banane mit Erdnussmus", "snack", 280, 8, 34, 13, 2, 1, ["schnell", "nocook", "unterwegs"], [["Banane", 1, "Stk"], ["Erdnussmus", 20, "g"]]),
    // ---------- RESTAURANT-GUIDE (kein Rezept — Bestell-Strategie) ----------
    M("rest_grill", "Restaurant: Grillteller (Fleisch + Gemüse + Kartoffeln)", "main", 700, 50, 45, 30, 0, 3, ["restaurant"], [["Bestell-Strategie: Protein zuerst, Beilage Kartoffeln/Reis statt Pommes, Sauce separat", 1, "×"]]),
    M("rest_bowl", "Restaurant/Imbiss: Bowl mit Doppel-Protein", "main", 650, 48, 60, 20, 0, 3, ["restaurant"], [["Bestell-Strategie: Doppelte Proteinportion, Dressing separat, kein Extra-Topping", 1, "×"]]),
    M("rest_doener", "Imbiss: Dönerteller mit Salat statt Brot", "main", 680, 45, 40, 35, 0, 2, ["restaurant"], [["Bestell-Strategie: Teller statt Brot, viel Salat, Knoblauchsauce light", 1, "×"]])
  ];
  function ingText(ing) { return ing.map(function (i) { return i[1] > 1 || i[2] !== "×" ? (i[1] + " " + i[2] + " " + i[0]) : i[0]; }); }
  function exampleDay(targets, prefs) {
    prefs = prefs || {};
    var pool = MEALS.filter(function (m) { return m.tags.indexOf("restaurant") < 0; });
    if (prefs.maxCookMin) pool = pool.filter(function (m) { return m.min <= prefs.maxCookMin || m.slot === "snack"; });
    if (prefs.veg) pool = pool.filter(function (m) { return m.tags.indexOf("veg") >= 0 || m.slot !== "main"; });
    var picks = [];
    function pick(slot) { var c = pool.filter(function (m) { return m.slot === slot && picks.indexOf(m) < 0; }); return c.length ? c[0] : null; }
    var b = pick("breakfast"); if (b) picks.push(b);
    var m1 = pick("main"); if (m1) picks.push(m1);
    var m2 = pool.filter(function (m) { return m.slot === "main" && picks.indexOf(m) < 0; })[0]; if (m2) picks.push(m2);
    var s = pick("snack"); if (s) picks.push(s);
    var sum = picks.reduce(function (a, m) { return { kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }; }, { kcal: 0, p: 0, c: 0, f: 0 });
    if (targets && sum.p < targets.protein - 25) { var s2 = pool.filter(function (m) { return m.slot === "snack" && picks.indexOf(m) < 0; })[0]; if (s2) { picks.push(s2); sum.kcal += s2.kcal; sum.p += s2.p; sum.c += s2.c; sum.f += s2.f; } }
    return { meals: picks, totals: sum };
  }
  function mealById(id) { return MEALS.find(function (m) { return m.id === id; }) || null; }
  function dayTotals(mealIds) {
    return mealIds.map(mealById).filter(Boolean).reduce(function (a, m) { return { kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }; }, { kcal: 0, p: 0, c: 0, f: 0 });
  }
  // §33 — Swap liefert Kandidat + Delta; die App ERSETZT damit real im Plan.
  function swapMeal(mealId, want, excludeIds) {
    var cur = mealById(mealId); if (!cur) return null;
    var ex = excludeIds || [];
    var cands = MEALS.filter(function (m) { return m.slot === cur.slot && m.id !== mealId && ex.indexOf(m.id) < 0 && m.tags.indexOf("restaurant") < 0; });
    if (want === "cheaper") cands.sort(function (a, b) { return a.cost - b.cost; });
    else if (want === "faster") cands.sort(function (a, b) { return a.min - b.min; });
    else if (want === "filling") cands = cands.filter(function (m) { return m.tags.indexOf("füllend") >= 0; }).concat(cands);
    else if (want === "protein") cands.sort(function (a, b) { return (b.p / b.kcal) - (a.p / a.kcal); });
    else if (want === "family") cands = cands.filter(function (m) { return m.tags.indexOf("familie") >= 0; }).concat(cands);
    var alt = cands[0] || null; if (!alt) return null;
    return Object.assign({}, alt, { delta: { kcal: alt.kcal - cur.kcal, p: alt.p - cur.p }, replaced: cur.id });
  }
  function familyPortion(mealId) {
    var m = mealById(mealId); if (!m || !m.family) return null;
    return { name: m.name, servings: m.family.servings, note: m.family.note, yourServing: { kcal: m.kcal, protein: m.p } };
  }
  // §44 — Einkaufsliste mit AGGREGIERTEN Mengen (Wiederholungen addieren sich).
  var ING_CAT = { protein: ["Skyr", "Eier", "Hähnchen", "Hack", "Lachs", "Quark", "Pute", "Whey", "Feta", "Rind", "Milch", "Thunfisch", "Garnelen", "Tofu", "Frischkäse", "Jerky", "Proteinpudding", "Steak"], carbs: ["Brot", "Reis", "Kartoffel", "Haferflocken", "Wrap", "Nudeln", "Linsen", "Fladenbrot", "Banane", "Honig", "Ciabatta", "Apfel", "Eiweißbrot", "Süßkartoffel"], produce: ["Beeren", "Tomate", "Brokkoli", "Bohnen", "Salat", "Gurke", "Paprika", "Zucchini", "Mais", "Champignons", "Spinat", "Erbsen", "Rucola", "Zwiebel", "Karotte", "Edamame", "Knoblauch", "Gewürzgurken"], fats: ["Nüsse", "Butter", "Olivenöl", "Leinöl", "Hummus", "Mandeln", "Erdnussmus", "Sesamöl", "Studentenfutter"], convenience: ["Passierte", "Sojasauce", "Kidneybohnen", "Kokosmilch", "Currypaste", "Kichererbsen", "Expressreis", "Gyros", "Joghurt", "Sauce", "Vinaigrette", "Zimt", "Schnittlauch", "Gouda"] };
  function shoppingList(mealIds) {
    var agg = {}; // name -> {q, u, cat}
    mealIds.forEach(function (id) {
      var m = mealById(id); if (!m) return;
      m.ing.forEach(function (ing) {
        var name = ing[0], q = ing[1], u = ing[2];
        if (u === "×") return; // Restaurant-Strategien haben keine Zutaten
        var cat = "other";
        Object.keys(ING_CAT).forEach(function (c) { if (ING_CAT[c].some(function (w) { return name.indexOf(w) >= 0; })) cat = c; });
        var k = name + "|" + u;
        if (!agg[k]) agg[k] = { name: name, q: 0, u: u, cat: cat };
        agg[k].q += q;
      });
    });
    var out = { protein: [], carbs: [], produce: [], fats: [], convenience: [], other: [] };
    Object.keys(agg).forEach(function (k) {
      var e = agg[k];
      var qty = e.u === "g" && e.q >= 1000 ? (Math.round(e.q / 50) * 50 / 1000) + " kg" : e.q + " " + e.u;
      out[e.cat].push(qty + " " + e.name);
    });
    return out;
  }

  /* ---- LOGGING + ADHÄRENZ (§29/§34–§36) ---- */
  // Log-Eintrag: {date, name, kcal, p, c?, f?, source('meal-plan'|'quick'|'manual')}
  function dayLogTotals(entries) {
    return (entries || []).reduce(function (a, e) { return { kcal: a.kcal + (e.kcal || 0), p: a.p + (e.p || 0), c: a.c + (e.c || 0), f: a.f + (e.f || 0), n: a.n + 1 }; }, { kcal: 0, p: 0, c: 0, f: 0, n: 0 });
  }
  // Adhärenz-Definition (dokumentiert, §36): Protein-Tag zählt ab ≥90 % des
  // Ziels; Energie-Tag zählt innerhalb ±10 % des Zielwerts (modusneutral —
  // der Zielwert selbst trägt bereits die Modus-Anpassung).
  function weeklyAdherence(logByDate, targets, dates) {
    var proteinDays = 0, energyDays = 0, logged = 0, kcalSum = 0;
    (dates || Object.keys(logByDate || {})).forEach(function (d) {
      var entries = (logByDate || {})[d]; if (!entries || !entries.length) return;
      var t = dayLogTotals(entries); logged++; kcalSum += t.kcal;
      if (targets && targets.protein && t.p >= targets.protein * 0.9) proteinDays++;
      if (targets && targets.kcal && Math.abs(t.kcal - targets.kcal) <= targets.kcal * 0.1) energyDays++;
    });
    return { daysLogged: logged, proteinDays: proteinDays, energyDays: energyDays, avgKcal: logged ? Math.round(kcalSum / logged) : null, proteinPct: logged ? Math.round(proteinDays / logged * 100) : null };
  }

  // §40–§42 — Anpassung in % Körpergewicht/Woche, nie fixe kg-Schwellen.
  function nutritionAdjust(ctx) {
    // ctx: {mode, weightKg, weightTrend(Δkg/Woche rollend), waistTrend(Δcm/Woche),
    //       adherencePct, energyLow, sleepBad, strengthStalled, kcalTarget}
    var w = ctx.weightKg || 85;
    var pct = ctx.weightTrend != null ? (ctx.weightTrend / w) * 100 : null;  // %KG/Woche
    if (ctx.adherencePct != null && ctx.adherencePct < 70) {
      return { code: "execution_first", title: "EXECUTION FIRST", text: "Die Zielwerte sind wahrscheinlich nicht das Problem — die Umsetzung war es diese Woche (" + ctx.adherencePct + " %). Kalorien senken würde jetzt nichts reparieren. Erst konstant umsetzen, dann bewerten." };
    }
    if (ctx.energyLow && ctx.sleepBad) {
      return { code: "recovery_first", title: "RECOVERY FIRST", text: "Energie und Schlaf sind unten. Ein größeres Defizit oder mehr Druck wäre jetzt kontraproduktiv. Diese Woche: Schlaf priorisieren, Ziele halten — nicht verschärfen." };
    }
    var t = ctx.kcalTarget || null;
    function adj(deltaPct, title, text) {
      var out = { code: deltaPct < 0 ? "adjust_down" : "adjust_up", title: title, text: text };
      if (t) { out.oldKcal = t; out.newKcal = Math.round(t * (1 + deltaPct / 100) / 10) * 10; }
      return out;
    }
    if (ctx.mode === "cut") {
      // Ziel: −0,5 bis −1,0 %KG/Woche.
      if (pct != null && pct > -0.25 && (ctx.waistTrend == null || ctx.waistTrend > -0.3)) {
        return adj(-8, "ADJUST −8 %", "Adhärenz hoch, aber der Gewichtstrend liegt bei " + (pct >= 0 ? "+" : "") + pct.toFixed(2) + " % KG/Woche (Ziel: −0,5 bis −1 %). Senke die Energie um ~8 % (eine Variable) und beobachte 2 Wochen.");
      }
      if (pct != null && pct < -1.2) {
        return adj(+7, "ZU SCHNELL — LEICHT ERHÖHEN", "Du verlierst " + Math.abs(pct).toFixed(2) + " % Körpergewicht pro Woche — über der nachhaltigen 1-%-Grenze. Das kostet auf Dauer Muskeln und Trainingsleistung. Erhöhe die Energie leicht.");
      }
    }
    if (ctx.mode === "build") {
      // Ziel: +0,1 bis +0,35 %KG/Woche, Taille als Guardrail.
      var waistFast = ctx.waistTrend != null && ctx.waistTrend > 0.5;
      if (pct != null && pct > 0.45 && waistFast) {
        return adj(-7, "SURPLUS ZURÜCKNEHMEN", "Gewicht (+" + pct.toFixed(2) + " % KG/Woche) und Taille steigen schneller als ein sauberer Aufbau braucht — der Überschuss landet teilweise als Fett. Etwas reduzieren, Progression bleibt der Fokus.");
      }
      if (pct != null && pct < 0.05 && ctx.strengthStalled && (ctx.adherencePct == null || ctx.adherencePct >= 80)) {
        return adj(+6, "LEICHT ERHÖHEN", "Gewicht steht, Kraft stagniert, Umsetzung stimmt — der Überschuss ist wahrscheinlich zu klein. Erhöhe die Energie leicht (+~6 %) und beobachte 2 Wochen.");
      }
    }
    if (ctx.mode === "recomp") {
      // Recomp ist nicht "0 kcal für immer": Taille + Kraft entscheiden.
      if (ctx.waistTrend != null && ctx.waistTrend > 0.4) {
        return adj(-6, "LEICHT REDUZIEREN", "Die Taille steigt im Recomp — leicht reduzieren, Protein und Training halten.");
      }
      if (ctx.strengthStalled && pct != null && pct < -0.4) {
        return adj(+5, "KRAFT SCHÜTZEN", "Kraft stagniert und das Gewicht fällt recht schnell für Recomp — Energie leicht anheben, sonst wird aus Recomp ein Mini-Cut ohne Plan.");
      }
    }
    return { code: "keep", title: "KEEP", text: "Trend und Umsetzung passen zum Ziel. Nichts ändern — Konstanz ist gerade der stärkste Hebel." };
  }

  /* ======================= TRAINING ENGINE ======================= */
  // §18 — pattern: Bewegungsmuster; limits: welche Einschränkung eine Übung
  // typischerweise problematisch macht (Kontext, keine Diagnose).
  var EXDB = {
    squat: { name: "Kniebeuge / Beinpresse", group: "quads", pattern: "squat", equip: ["gym", "home_barbell"], limits: ["knee", "back"], alt: ["legpress", "goblet"] },
    legpress: { name: "Beinpresse", group: "quads", pattern: "squat", equip: ["gym"], limits: ["knee"], alt: ["squat", "goblet"] },
    goblet: { name: "Goblet Squat", group: "quads", pattern: "squat", equip: ["home_db", "gym"], limits: ["knee"], alt: ["squat"] },
    rdl: { name: "Rumänisches Kreuzheben", group: "hamstrings", pattern: "hinge", equip: ["gym", "home_barbell", "home_db"], limits: ["back"], alt: ["legcurl"] },
    legcurl: { name: "Beinbeuger", group: "hamstrings", pattern: "curl", equip: ["gym"], limits: [], alt: ["rdl"] },
    bench: { name: "Bankdrücken", group: "chest", pattern: "h_push", equip: ["gym", "home_barbell"], limits: ["shoulder"], alt: ["dbpress", "pushup"] },
    dbpress: { name: "KH-Drücken flach/schräg", group: "chest", pattern: "h_push", equip: ["gym", "home_db"], limits: [], alt: ["bench", "pushup"] },
    pushup: { name: "Liegestütz (beschwert)", group: "chest", pattern: "h_push", equip: ["home_none", "home_db", "gym"], limits: [], alt: ["dbpress"] },
    ohp: { name: "Schulterdrücken", group: "delts", pattern: "v_push", equip: ["gym", "home_barbell", "home_db"], limits: ["shoulder"], alt: ["lateral"] },
    row: { name: "Rudern (LH/KH/Maschine)", group: "back", pattern: "h_pull", equip: ["gym", "home_barbell", "home_db"], limits: ["back"], alt: ["pulldown"] },
    pulldown: { name: "Latzug / Klimmzug", group: "back", pattern: "v_pull", equip: ["gym", "home_none"], limits: [], alt: ["row"] },
    curl: { name: "Bizeps-Curls", group: "arms", pattern: "curl", equip: ["gym", "home_db"], limits: [], alt: [] },
    triceps: { name: "Trizeps (Dips/Pushdown)", group: "arms", pattern: "extension", equip: ["gym", "home_none"], limits: ["shoulder"], alt: [] },
    lateral: { name: "Seitheben", group: "delts", pattern: "raise", equip: ["gym", "home_db"], limits: [], alt: [] },
    core: { name: "Core (Plank/Ab-Wheel)", group: "core", pattern: "brace", equip: ["home_none", "gym"], limits: [], alt: [] }
  };
  // §17 — Experience-Modell: Volumen-Budget (harte Sätze/Woche gesamt) und
  // Komplexität skalieren mit Trainingsalter.
  var EXPERIENCE = {
    beginner: { budget: 40, slotsPerSession: 4, note: "Weniger Übungen, saubere Technik, schnelle Anfangs-Progression." },
    novice: { budget: 50, slotsPerSession: 5, note: "" },
    intermediate: { budget: 60, slotsPerSession: 5, note: "Mehr Spezialisierung, doppelte Progression als Standard." },
    advanced: { budget: 70, slotsPerSession: 6, note: "Individualisiertes Volumen, Fatigue-Management, langsamere Progression ist normal." }
  };
  function limitationSwap(key, limitations) {
    var ex = EXDB[key]; if (!ex || !limitations || !limitations.length) return { key: key, note: "" };
    var hit = ex.limits.find(function (l) { return limitations.indexOf(l) >= 0; });
    if (!hit) return { key: key, note: "" };
    // Alternative mit gleichem/nahem Muster ohne die Einschränkung
    for (var i = 0; i < ex.alt.length; i++) {
      var a = EXDB[ex.alt[i]];
      if (a && !a.limits.some(function (l) { return limitations.indexOf(l) >= 0; })) {
        var L = { shoulder: "Schulter", knee: "Knie", back: "Rücken" };
        return { key: ex.alt[i], note: "Alternative wegen deiner Angabe (" + (L[hit] || hit) + ") — schmerzfreier Bewegungsradius entscheidet, keine Diagnose." };
      }
    }
    return { key: key, note: "Hinweis: " + ex.name + " kann bei deiner Angabe problematisch sein — reduziere Last/Radius oder wähle eine Variante, die schmerzfrei ist." };
  }
  function buildTrainingPlan(g) {
    // g: {daysPerWeek(3|4), minutes, location, priority, experience, limitations[]}
    var days = g.daysPerWeek === 4 ? 4 : 3;
    var loc = g.location || "gym";
    var exp = EXPERIENCE[g.experience] ? g.experience : "novice";
    var expCfg = EXPERIENCE[exp];
    var lims = Array.isArray(g.limitations) ? g.limitations : [];
    function pick(key) {
      var ex = EXDB[key]; var k = key;
      if (!(ex.equip.indexOf(loc) >= 0 || loc === "gym")) {
        for (var i = 0; i < ex.alt.length; i++) { if (EXDB[ex.alt[i]].equip.indexOf(loc) >= 0) { k = ex.alt[i]; break; } }
      }
      var sw = limitationSwap(k, lims);
      return { key: sw.key, note: sw.note };
    }
    function slot(key, sets, reps, rir) {
      var p = pick(key); var k = p.key;
      var s = { ex: k, name: EXDB[k].name, sets: sets, reps: reps, rir: rir, rest: reps[1] <= 8 ? "2–3 min" : "90 s", rule: "double_progression" };
      if (p.note) s.note = p.note;
      return s;
    }
    var sessions;
    if (days === 3) {
      sessions = [
        { key: "A", name: "Ganzkörper A", slots: [slot("squat", 3, [6, 10], "1–2"), slot("bench", 3, [6, 10], "1–2"), slot("row", 3, [8, 12], "1–2"), slot("lateral", 2, [10, 15], "0–1"), slot("core", 2, [10, 15], "—")] },
        { key: "B", name: "Ganzkörper B", slots: [slot("rdl", 3, [8, 12], "1–2"), slot("ohp", 3, [6, 10], "1–2"), slot("pulldown", 3, [8, 12], "1–2"), slot("curl", 2, [10, 15], "0–1"), slot("triceps", 2, [10, 15], "0–1")] },
        { key: "C", name: "Ganzkörper C", slots: [slot("legpress", 3, [10, 15], "1–2"), slot("dbpress", 3, [8, 12], "1–2"), slot("row", 3, [8, 12], "1–2"), slot("lateral", 2, [12, 20], "0–1"), slot("core", 2, [10, 15], "—")] }
      ];
    } else {
      sessions = [
        { key: "U1", name: "Oberkörper 1", slots: [slot("bench", 3, [6, 10], "1–2"), slot("row", 3, [6, 10], "1–2"), slot("ohp", 2, [8, 12], "1–2"), slot("pulldown", 2, [8, 12], "1–2"), slot("curl", 2, [10, 15], "0–1")] },
        { key: "L1", name: "Unterkörper 1", slots: [slot("squat", 3, [6, 10], "1–2"), slot("rdl", 3, [8, 12], "1–2"), slot("legpress", 2, [10, 15], "1–2"), slot("core", 3, [10, 15], "—")] },
        { key: "U2", name: "Oberkörper 2", slots: [slot("dbpress", 3, [8, 12], "1–2"), slot("pulldown", 3, [8, 12], "1–2"), slot("lateral", 3, [12, 20], "0–1"), slot("row", 2, [10, 15], "1–2"), slot("triceps", 2, [10, 15], "0–1")] },
        { key: "L2", name: "Unterkörper 2", slots: [slot("legpress", 3, [10, 15], "1–2"), slot("legcurl", 3, [10, 15], "1–2"), slot("goblet", 2, [10, 15], "1–2"), slot("core", 3, [10, 15], "—")] }
      ];
    }
    // Experience: Beginner → weniger Slots/Komplexität
    if (expCfg.slotsPerSession < 5) sessions.forEach(function (s) { while (s.slots.length > expCfg.slotsPerSession) s.slots.pop(); });
    // §19 — VOLUMEN-BUDGET statt +1 Satz überall: Priorität verschiebt Sätze
    // vom niedrigst-prioren Iso-Slot zum Ziel — Gesamtvolumen bleibt im Budget.
    var prio = g.priority || "balanced";
    var PRIO_GROUP = { chest: "chest", back: "back", arms: "arms", legs: "quads", shoulders: "delts" };
    if (PRIO_GROUP[prio]) {
      var target = PRIO_GROUP[prio];
      sessions.forEach(function (s) {
        var tgt = s.slots.filter(function (sl) { return EXDB[sl.ex].group === target; });
        if (!tgt.length) return;
        tgt.forEach(function (sl) { sl.sets += 1; });
        // Kompensation: 1 Satz von einem Nicht-Ziel-Iso-Slot abziehen (nie unter 2)
        var donor = s.slots.slice().reverse().find(function (sl) { return EXDB[sl.ex].group !== target && EXDB[sl.ex].group !== "core" && sl.sets > 2; });
        if (donor) donor.sets -= 1;
      });
    }
    if (g.minutes && g.minutes < 45) sessions.forEach(function (s) { if (s.slots.length > 4) s.slots.pop(); });
    // Budget-Deckel: Gesamtzahl harter Sätze/Woche ≤ Experience-Budget
    var totalSets = 0; sessions.forEach(function (s) { s.slots.forEach(function (sl) { if (EXDB[sl.ex].group !== "core") totalSets += sl.sets; }); });
    var weekSets = totalSets; // jede Session 1×/Woche im 3er/4er-Muster
    if (weekSets > expCfg.budget) {
      var over = weekSets - expCfg.budget;
      outer: for (var si = sessions.length - 1; si >= 0 && over > 0; si--) {
        for (var qi = sessions[si].slots.length - 1; qi >= 0 && over > 0; qi--) {
          var sl2 = sessions[si].slots[qi];
          if (EXDB[sl2.ex].group !== "core" && sl2.sets > 2) { sl2.sets -= 1; over -= 1; }
          if (over <= 0) break outer;
        }
      }
    }
    return { days: days, location: loc, priority: prio, experience: exp, limitations: lims, sessions: sessions, note: (days >= 4 ? "Aufeinanderfolgende Krafttage haben bewusst unterschiedliche Schwerpunkte (Ober-/Unterkörper) — keine identische Belastung an Folgetagen. " : "") + (expCfg.note || "") };
  }
  // §20 — Wöchentliches Volumen je Muskelgruppe sichtbar machen.
  function weeklyVolume(plan) {
    var out = {};
    (plan && plan.sessions || []).forEach(function (s) {
      s.slots.forEach(function (sl) { var gp = EXDB[sl.ex] ? EXDB[sl.ex].group : "other"; out[gp] = (out[gp] || 0) + sl.sets; });
    });
    return out;
  }

  /* ---- e1RM (§22) — Epley-Formel: e1RM = Last × (1 + Wdh/30). Dokumentiert,
     verbreitet, für 1–12 Wdh brauchbar; >12 Wdh wird nicht gewertet. ---- */
  function e1rm(w, r) { if (!w || !r || r > 12) return null; return Math.round(w * (1 + r / 30) * 10) / 10; }
  function bestE1rm(sets) {
    var best = null;
    (sets || []).forEach(function (s) { var e = e1rm(s.w, s.r); if (e != null && (best == null || e > best)) best = e; });
    return best;
  }
  // Kraft-Trend über Benchmark-Übungen: erster vs. letzter e1RM-Wert je Übung,
  // gemittelt. Braucht ≥2 Einheiten derselben Übung — sonst null (ehrlich).
  var BENCHMARKS = ["bench", "squat", "legpress", "row", "ohp", "rdl", "dbpress", "pulldown"];
  function strengthTrend(exHistories) {
    // exHistories: { exKey: [{date, sets:[{w,r}]}] }
    var pcts = [], lifts = [];
    BENCHMARKS.forEach(function (k) {
      var h = (exHistories || {})[k]; if (!h || h.length < 2) return;
      var first = bestE1rm(h[0].sets), last = bestE1rm(h[h.length - 1].sets);
      if (first == null || last == null || first <= 0) return;
      var pct = (last - first) / first * 100;
      pcts.push(pct);
      lifts.push({ ex: k, name: EXDB[k] ? EXDB[k].name : k, first: first, last: last, pct: Math.round(pct * 10) / 10 });
    });
    if (!pcts.length) return null;
    return { pct: Math.round(pcts.reduce(function (a, b) { return a + b; }, 0) / pcts.length * 10) / 10, lifts: lifts };
  }
  // §24 — PR-Erkennung: Last-PR, Wdh-PR (bei gleicher Last), e1RM-PR.
  function detectPRs(history, latest) {
    if (!history || !history.length || !latest) return [];
    var prs = [];
    var prevBestW = 0, prevBestE = 0, prevRepAt = {};
    history.forEach(function (h) {
      (h.sets || []).forEach(function (s) {
        if (s.w > prevBestW) prevBestW = s.w;
        var e = e1rm(s.w, s.r); if (e && e > prevBestE) prevBestE = e;
        if (!prevRepAt[s.w] || s.r > prevRepAt[s.w]) prevRepAt[s.w] = s.r;
      });
    });
    (latest.sets || []).forEach(function (s) {
      if (s.w > prevBestW) { prs.push({ type: "load", text: "Last-PR: " + s.w + " kg" }); prevBestW = s.w; }
      else if (prevRepAt[s.w] != null && s.r > prevRepAt[s.w]) { prs.push({ type: "reps", text: "Wdh-PR: " + s.w + " kg × " + s.r }); prevRepAt[s.w] = s.r; }
      var e = e1rm(s.w, s.r);
      if (e && prevBestE > 0 && e > prevBestE) { prs.push({ type: "e1rm", text: "e1RM-PR: " + e + " kg (+" + Math.round((e - prevBestE) / prevBestE * 1000) / 10 + " %)" }); prevBestE = e; }
    });
    return prs.slice(0, 2); // understated — kein Badge-Spam
  }

  // §21 — Progression aus echten Logs (letzte 2–4 Einheiten, nicht nur letzte).
  function progressionTarget(lastSets, repRange, increment) {
    if (!lastSets || !lastSets.length) return { type: "start", text: "Startgewicht wählen: " + repRange[0] + "–" + repRange[1] + " Wdh. mit 1–2 RIR." };
    var w = lastSets[0].w;
    var allTop = lastSets.every(function (s) { return s.r >= repRange[1]; });
    if (allTop) { var nw = Math.round((w + (increment || 2.5)) * 2) / 2; return { type: "load", text: "Alle Sätze am oberen Ende (" + repRange[1] + ") → heute " + nw + " kg.", nextWeight: nw }; }
    var total = lastSets.reduce(function (a, s) { return a + s.r; }, 0);
    return { type: "reps", text: "Gleiches Gewicht (" + w + " kg) — schlage die Gesamt-Wdh. von letztem Mal (" + total + ").", beatTotal: total };
  }
  function progressionPlan(history, repRange, ctx) {
    // history: [{date, sets}] chronologisch; ctx: {recoveryLow}
    if (!history || !history.length) return progressionTarget(null, repRange);
    var last = history[history.length - 1];
    var base = progressionTarget(last.sets, repRange);
    if (history.length >= 2) {
      var prev = history[history.length - 2];
      var eL = bestE1rm(last.sets), eP = bestE1rm(prev.sets);
      if (ctx && ctx.recoveryLow && eL != null && eP != null && eL < eP * 0.96) {
        return { type: "reduce", text: "Letzte Einheit lag klar unter der vorletzten UND deine Recovery ist unten — heute bewusst −10 % Last, saubere Technik, RIR 2–3. Das ist Steuerung, kein Rückschritt." };
      }
      if (eL != null && eP != null && eL < eP * 0.97) {
        return { type: "repeat", text: "Letzte Einheit war schwächer als davor. Heute: gleiche Last wiederholen und die Wdh.-Gesamtzahl stabilisieren — erst dann wieder steigern." };
      }
    }
    return base;
  }
  // §25 — Plateau mit echten Daten: ≥3 Einheiten, kein e1RM-/Volumen-Fortschritt,
  // dann Ursachenkette (Recovery → Ernährung → Umsetzung → Programmvariation).
  function plateauCheck(history, ctx) {
    if (!history || history.length < 3) return { plateau: false, reason: "insufficient_data" };
    var last3 = history.slice(-3);
    function volScore(h) { return (h.sets || []).reduce(function (a, s) { return a + s.w * s.r; }, 0); }
    var e = last3.map(function (h) { return bestE1rm(h.sets) || 0; });
    var v = last3.map(volScore);
    var e1Stalled = e[2] <= e[0] * 1.01 && e[1] <= e[0] * 1.01;
    var volStalled = v[2] <= v[0] && v[1] <= v[0] * 1.02;
    if (!(e1Stalled && volStalled)) return { plateau: false };
    if (ctx && ctx.adherenceLow) return { plateau: true, verdict: "EXECUTION", recommendations: [{ action: "execution", text: "Unregelmäßiges Training erklärt die Stagnation — erst Konstanz, dann Programmänderungen." }] };
    var rec = [];
    if (ctx && ctx.sleepBad) rec.push({ action: "recovery", text: "Schlaf ist der wahrscheinlichste Bremsklotz — erst Recovery fixen, NICHT mehr Volumen." });
    if (ctx && ctx.kcalLow) rec.push({ action: "nutrition", text: "Im deutlichen Defizit stagniert Kraft oft — Erwartung anpassen oder Energie leicht erhöhen." });
    if (!rec.length) rec.push({ action: "variation", text: "3× keine e1RM-/Volumen-Progression bei guter Basis: Übung variieren ODER leichter Deload (−30 % Volumen, 1 Woche) — nicht einfach mehr Sätze." });
    return { plateau: true, verdict: rec[0].action.toUpperCase(), recommendations: rec };
  }

  /* ======================= STACK INTELLIGENCE ======================= */
  // costMo: grobe Monatskosten in € (Marktüblich, Stand 2026 — Orientierung).
  // tier → Anzeige-Ebene (§2): foundation=ESSENTIAL, goal=OPTIMAL, optional=ADVANCED.
  // aliases: robuste Erkennung von Freitext-Eingaben des Nutzers.
  // magnitude/complexity/makesUnnecessary: für die 2.0-Karte (§2/§13).
  var SUPPS = [
    { id: "creatine", name: "Kreatin Monohydrat", tier: "foundation", evidence: "STRONG", value: 5, cost: 1, costMo: 6, timing: "täglich 3–5 g, Zeitpunkt egal", why: "Am besten belegtes Supplement für Kraft & Muskelmasse. Billig, sicher, wirksam.", goals: ["build", "recomp", "cut", "perform"], aliases: ["kreatin", "creatin", "creatine", "monohydrat"], magnitude: "Klein aber real: einige Prozent mehr Kraft/Leistung + etwas fettfreie Masse über Wochen.", complexity: "trivial", monitor: "Erhöht Serum-Kreatinin ohne Nierenschaden — für die Lab-Interpretation wissen." },
    { id: "protein", name: "Whey/Casein (bei Proteinlücke)", tier: "foundation", evidence: "STRONG", value: 5, cost: 2, costMo: 22, timing: "als Mahlzeitbaustein", why: "Kein Muss — aber der billigste Weg, das Proteinziel real zu treffen.", goals: ["build", "recomp", "cut", "perform"], aliases: ["whey", "casein", "protein", "eiweiß", "eiweiss", "isolat"], magnitude: "Indirekt: schließt die Proteinlücke, die Muskelaufbau limitiert.", complexity: "trivial", makesUnnecessary: "Sobald du dein Proteinziel über echte Mahlzeiten triffst.", skipIf: { proteinCovered: "Dein Proteinziel ist laut Logging bereits über echte Mahlzeiten gedeckt — Pulver ist dann optional." } },
    { id: "omega3", name: "Omega-3 (EPA/DHA)", tier: "foundation", evidence: "MODERATE", value: 4, cost: 2, costMo: 12, timing: "1–2 g EPA+DHA mit Mahlzeit", why: "Kardiometabolische Basis, besonders bei wenig Fisch.", goals: ["all"], aliases: ["omega", "omega-3", "omega3", "fischöl", "fischoel", "epa", "dha", "fish oil"], magnitude: "Triglycerid-senkend dosisabhängig; harte Endpunkte gemischt — Basis, kein Hebel.", complexity: "trivial", makesUnnecessary: "≥2× fetter Fisch pro Woche.", skipIf: { fishTwiceWeek: "Du isst ≥2× Fisch pro Woche — Omega-3-Supplementierung ist dann meist verzichtbar." } },
    { id: "vitd", name: "Vitamin D3", tier: "foundation", evidence: "MODERATE", value: 4, cost: 1, costMo: 4, timing: "1000–2000 IE mit Fett", why: "Häufiger Mangel in DE — sinnvoll ohne Sonne, ideal per Blutwert steuern.", goals: ["all"], aliases: ["vitamin d", "vitd", "d3", "cholecalciferol"], magnitude: "Relevant nur bei echtem Mangel — dann spürbar, sonst nahe null.", complexity: "trivial", makesUnnecessary: "Ausreichender 25-OH-D-Laborwert oder viel Sommersonne.", skipIf: { summerSun: "Viel Sonnenexposition im Sommer — dann eher Blutwert prüfen statt pauschal supplementieren." } },
    { id: "caffeine", name: "Koffein (gezielt)", tier: "goal", evidence: "STRONG", value: 4, cost: 1, costMo: 5, timing: "3–6 mg/kg 45 min vor Training, nicht nach 14 Uhr", why: "Akute Leistung + Fokus. Schlaf hat trotzdem Vorrang.", goals: ["build", "perform", "cut"], aliases: ["koffein", "caffeine", "pre-workout", "preworkout", "pre workout"], magnitude: "Akut messbar: mehr Wiederholungen/Leistung an dem Tag — kein Aufbaueffekt.", complexity: "niedrig", monitor: "Schlaf hat Vorrang — Timing beachten.", conflict: { sleepBad: "Bei schlechtem Schlaf ist zusätzliches Koffein kontraproduktiv — erst Schlaf, dann Stimulanzien.", highCaffeine: "Du liegst bereits hoch im Tageskoffein — mehr bringt keine Leistung, kostet aber Schlafqualität." } },
    { id: "citrulline", name: "Citrullin-Malat", tier: "optional", evidence: "MODERATE", value: 3, cost: 2, costMo: 14, timing: "6–8 g pre", why: "Moderater Pump/Volumen-Effekt — nice-to-have, kein Fundament.", goals: ["build", "perform"], aliases: ["citrullin", "citrulline", "malat"], magnitude: "Klein: etwas mehr Pump/Volumen, marginaler Leistungseffekt.", complexity: "niedrig" },
    { id: "magnesium", name: "Magnesium (abends)", tier: "optional", evidence: "MODERATE", value: 3, cost: 1, costMo: 6, timing: "200–400 mg abends", why: "Sinnvoll bei Krämpfen/schlechtem Schlaf — kein Wundermittel.", goals: ["all"], aliases: ["magnesium", "magnesiumcitrat", "magnesium glycinat"], magnitude: "Klein, v. a. bei Mangel/Krämpfen — kein Schlafwundermittel.", complexity: "trivial" },
    { id: "ashwagandha", name: "Ashwagandha", tier: "optional", evidence: "EMERGING", value: 2, cost: 2, costMo: 10, timing: "300–600 mg abends", why: "Kann Stress/Schlaf leicht verbessern — Datenlage gemischt, Qualität schwankt.", goals: ["all"], aliases: ["ashwagandha", "ksm-66", "withania"], magnitude: "Unsicher: leichte Stress-/Schlaf-Effekte in einigen Studien.", complexity: "niedrig", conflict: { medication: "Wechselwirkungen mit Schilddrüsen-/Sedativa-Medikation sind beschrieben — mit Arzt/Apotheke klären." } },
    { id: "bcaa", name: "BCAA/EAA (bei genug Protein)", tier: "low_value", evidence: "STRONG_NEGATIVE", value: 0, cost: 2, costMo: 18, timing: "—", why: "Wer sein Proteinziel isst, verbrennt hier Geld. Streichen.", goals: [], aliases: ["bcaa", "eaa", "aminosäuren", "aminos", "amino"], magnitude: "Bei ausreichend Protein: kein zusätzlicher Effekt.", makesUnnecessary: "Ein gedecktes Proteinziel (fast immer der Fall)." },
    { id: "tbooster", name: "„Testo-Booster“ (Tribulus & Co.)", tier: "low_value", evidence: "STRONG_NEGATIVE", value: 0, cost: 3, costMo: 25, timing: "—", why: "Kein relevanter Effekt auf Testosteron in brauchbaren Studien. Streichen.", goals: [], aliases: ["tribulus", "testo booster", "testobooster", "testo-booster", "booster", "d-asparaginsäure", "daa", "fadogia", "tongkat"], magnitude: "Kein messbarer Testosteron-Effekt.", makesUnnecessary: "Immer — Schlaf/Körperfett/Krafttraining sind die echten Hebel." },
    { id: "fatburner", name: "„Fatburner“-Komplexe", tier: "low_value", evidence: "STRONG_NEGATIVE", value: 0, cost: 3, costMo: 30, timing: "—", why: "Teures Koffein mit Marketing. Das Defizit macht die Arbeit.", goals: [], aliases: ["fatburner", "fat burner", "l-carnitin", "carnitin", "cla", "thermogen"], magnitude: "Über den Koffeinanteil hinaus: nahe null.", makesUnnecessary: "Ein Kaloriendefizit (das die eigentliche Arbeit macht)." },
    { id: "multivit", name: "Multivitamin (Standarddiät)", tier: "low_value", evidence: "MODERATE_NEGATIVE", value: 1, cost: 2, costMo: 8, timing: "—", why: "Bei vernünftiger Ernährung meist überflüssig — gezielte Einzelstoffe schlagen die Gießkanne.", goals: [], aliases: ["multivitamin", "multivit", "multi", "a-z"], magnitude: "Gering bei vernünftiger Ernährung; Dopplungsrisiko mit Einzelstoffen.", makesUnnecessary: "Eine abwechslungsreiche Ernährung + gezielte Einzelstoffe (D, Omega-3)." },
    { id: "zinc", name: "Zink", tier: "optional", evidence: "MODERATE", value: 2, cost: 1, costMo: 4, timing: "10–25 mg, nicht dauerhaft hochdosiert", why: "Nur bei Mangel/hohem Bedarf sinnvoll — nicht dauerhaft blind hochdosieren (Kupfer-Balance).", goals: ["all"], aliases: ["zink", "zinc"], magnitude: "Relevant nur bei Mangel.", complexity: "niedrig", monitor: "Dauerhaft hohe Dosen stören die Kupferaufnahme." }
  ];
  // Robustes Matching eines Freitext-Tokens auf ein SUPP-Objekt.
  function matchSupp(token) {
    var t = String(token || "").toLowerCase().trim();
    if (!t) return null;
    for (var i = 0; i < SUPPS.length; i++) {
      var s = SUPPS[i];
      if (t === s.id) return s;
      var al = s.aliases || [];
      for (var j = 0; j < al.length; j++) { if (t.indexOf(al[j]) >= 0 || al[j].indexOf(t) >= 0) return s; }
    }
    return null;
  }
  function stackStrategy(g) {
    // g: {mode, pathway, budget('essential'|'optimal'|'maximal'), budgetEuro?,
    //     current[], sleepBad, fishTwiceWeek, summerSun, highCaffeine,
    //     medication, proteinCovered, fertilityPriority}
    var budget = g.budget || "optimal";
    var take = SUPPS.filter(function (s) { return s.tier !== "low_value"; })
      .filter(function (s) { return s.goals.indexOf("all") >= 0 || s.goals.indexOf(g.mode) >= 0; })
      .sort(function (a, b) { return b.value - a.value || a.cost - b.cost; });
    // §46/§47 — Kontext REDUZIERT die Liste, statt sie aufzublasen:
    var skipped = [];
    take = take.filter(function (s) {
      // §31 Labs: Vitamin D ausreichend → nicht empfehlen; Eisen wird ohnehin nie empfohlen.
      if (s.id === "vitd" && g.vitDAdequate) { skipped.push({ name: s.name, why: "Laut Laborwert ist dein Vitamin D ausreichend — nicht blind hochdosieren, ggf. nur erhalten.", lab: true }); return false; }
      if (s.skipIf) { for (var k in s.skipIf) { if (g[k]) { skipped.push({ name: s.name, why: s.skipIf[k] }); return false; } } }
      if (s.conflict) { for (var c in s.conflict) { if (g[c]) { skipped.push({ name: s.name, why: s.conflict[c], conflict: true }); return false; } } }
      return true;
    });
    var n = budget === "essential" ? 3 : budget === "optimal" ? 6 : take.length;
    var chosen = take.slice(0, n);
    if (g.sleepBad && !chosen.some(function (s) { return s.id === "magnesium"; })) { var mg = SUPPS.find(function (s) { return s.id === "magnesium"; }); if (mg) chosen.push(mg); }
    // §49 — Kosten-Engine: € Budget → Kern / nächste Ergänzung / geringer Ertrag
    var costPlan = null;
    if (g.budgetEuro) {
      var run = 0, core = [], next = [], low = [];
      take.forEach(function (s) {
        if (run + s.costMo <= g.budgetEuro && core.length < 6) { core.push(s); run += s.costMo; }
        else if (next.length < 2 && s.value >= 3) next.push(s);
        else low.push(s);
      });
      costPlan = { budgetEuro: g.budgetEuro, coreCost: run, core: core.map(function (s) { return s.name; }), nextBest: next.map(function (s) { return { name: s.name, addMo: s.costMo }; }), lowReturn: low.map(function (s) { return { name: s.name, addMo: s.costMo }; }) };
      chosen = core;
    }
    var diminishing = budget === "maximal" ? "Ab hier ist der Grenznutzen klein: alles unterhalb von Kreatin/Protein/Omega-3/Vitamin D bewegt wenige Prozent — Training, Essen und Schlaf bewegen den Rest." : "";
    var current = (g.current || []).map(function (x) { return String(x).toLowerCase().trim(); }).filter(Boolean);
    var remove = SUPPS.filter(function (s) { return s.tier === "low_value" && current.some(function (c) { return s.name.toLowerCase().indexOf(c) >= 0 || c.indexOf(s.id) >= 0 || (s.id === "bcaa" && /bcaa|eaa/.test(c)) || (s.id === "tbooster" && /tribulus|testo|booster/.test(c)) || (s.id === "fatburner" && /burner|fat/.test(c)) || (s.id === "multivit" && /multi/.test(c)); }); });
    // §48 — Dopplungs-Check gegen aktuellen Stack (Koffein doppelt, Multi + Einzelstoffe)
    var conflicts = [];
    if (current.some(function (c) { return /pre.?workout|booster/.test(c); }) && chosen.some(function (s) { return s.id === "caffeine"; })) conflicts.push("Dein Pre-Workout enthält vermutlich bereits Koffein — nicht zusätzlich dosieren (Doppel-Stimulanzien).");
    if (current.some(function (c) { return /multi/.test(c); }) && chosen.some(function (s) { return s.id === "vitd"; })) conflicts.push("Multivitamin + separates Vitamin D: prüfe die Gesamtdosis — Dopplung ist üblich und unnötig.");
    if (g.medication) conflicts.push("CONTEXT CHECK: Du hast Medikation angegeben — kläre Supplement-Wechselwirkungen mit Arzt/Apotheke. Wir bewerten das bewusst nicht automatisch.");
    if (g.ironHigh) conflicts.push("CONTEXT CHECK: Dein Eisenstatus ist laut Labor hoch — KEIN Eisen supplementieren; Ursache (Entzündung/Überladung) fachlich klären.");
    var schedule = { morning: [], with_food: [], pre_training: [], evening: [] };
    chosen.forEach(function (s) {
      if (/pre/.test(s.timing)) schedule.pre_training.push(s.name);
      else if (/abends/.test(s.timing)) schedule.evening.push(s.name);
      else if (/Mahlzeit|Fett/.test(s.timing)) schedule.with_food.push(s.name);
      else schedule.morning.push(s.name);
    });
    // §2 — Ebenen-Gruppierung der Empfehlung: ESSENTIAL / OPTIMAL / ADVANCED.
    var TIER_LABEL = { foundation: "ESSENTIAL", goal: "OPTIMAL", optional: "ADVANCED" };
    var tiers = { ESSENTIAL: [], OPTIMAL: [], ADVANCED: [] };
    chosen.forEach(function (s) { var lbl = TIER_LABEL[s.tier] || "ADVANCED"; tiers[lbl].push(s); });
    return { budget: budget, items: chosen, tiers: tiers, remove: remove, skipped: skipped, conflicts: conflicts, costPlan: costPlan, diminishing: diminishing, schedule: schedule };
  }

  /* §2/§13 — TRIAGE des AKTUELLEN Stacks des Nutzers: KEEP / OPTIONAL / REMOVE.
     Der Wow-Moment: „Du nimmst 11 — behalte 4, optional 2, streiche 5, hier warum."
     Reduziert bewusst, statt Produkte hinzuzufügen. Unbekanntes wird ehrlich als
     UNKNOWN markiert (nicht bewertbar), nie stillschweigend empfohlen. */
  function analyzeCurrentStack(currentText, g) {
    g = g || {};
    var tokens = (Array.isArray(currentText) ? currentText : String(currentText || "").split(/[,;\n]+/))
      .map(function (x) { return String(x).trim(); }).filter(Boolean);
    var keep = [], optional = [], remove = [], unknown = [], seen = {};
    var counts = {};
    tokens.forEach(function (tok) {
      var s = matchSupp(tok);
      if (!s) { unknown.push({ input: tok }); return; }
      counts[s.id] = (counts[s.id] || 0) + 1;
      if (seen[s.id]) return; seen[s.id] = true;
      var goalFit = s.goals.indexOf("all") >= 0 || s.goals.indexOf(g.mode) >= 0;
      // Kontext-Abwertung: gedecktes Protein / genug Fisch / ausreichend Vit-D.
      var madeUnnecessary = (s.id === "protein" && g.proteinCovered) || (s.id === "omega3" && g.fishTwiceWeek) || (s.id === "vitd" && (g.summerSun || g.vitDAdequate));
      if (s.tier === "low_value") {
        remove.push({ id: s.id, name: s.name, why: s.why, value: s.magnitude || "Geringer/kein zusätzlicher Nutzen.", savesMo: s.costMo, unnecessary: s.makesUnnecessary || null });
      } else if (madeUnnecessary) {
        optional.push({ id: s.id, name: s.name, why: (s.makesUnnecessary ? "Optional geworden: " + s.makesUnnecessary : "Kontextabhängig optional."), evidence: s.evidence, magnitude: s.magnitude });
      } else if (s.tier === "foundation" && goalFit) {
        keep.push({ id: s.id, name: s.name, why: s.why, evidence: s.evidence, magnitude: s.magnitude });
      } else if (goalFit) {
        optional.push({ id: s.id, name: s.name, why: s.why, evidence: s.evidence, magnitude: s.magnitude });
      } else {
        optional.push({ id: s.id, name: s.name, why: "Für dein aktuelles Ziel (" + (g.mode || "—") + ") nicht vorrangig — nicht falsch, aber nicht der Hebel.", evidence: s.evidence, magnitude: s.magnitude });
      }
    });
    // Dopplungen im eingegebenen Stack (z. B. 2× Koffeinquelle, Multi + Einzelstoff).
    var dupes = Object.keys(counts).filter(function (id) { return counts[id] > 1; }).map(function (id) { var s = SUPPS.find(function (x) { return x.id === id; }); return s ? s.name : id; });
    if (g.medication) unknown.push({ input: "(Medikation angegeben)", note: "Supplement-Wechselwirkungen mit Arzt/Apotheke klären — wir bewerten das bewusst nicht automatisch." });
    return {
      total: tokens.length, keep: keep, optional: optional, remove: remove, unknown: unknown,
      dupes: dupes,
      summary: "Du nimmst " + tokens.length + ". Behalte " + keep.length + ", optional " + optional.length + ", streiche " + remove.length + (unknown.length ? ", " + unknown.length + " nicht bewertbar" : "") + ".",
      monthlySaved: remove.reduce(function (a, r) { return a + (r.savesMo || 0); }, 0)
    };
  }

  /* ---- ENHANCED (§53/§54/§55) — Klassen-Education, KEINE Dosierungen ---- */
  var ENHANCED_FRAMEWORK = {
    boundary: "MaleMetrix erklärt reale Enhanced-Praxis direkt und ohne Moralisieren — erstellt aber keine individuellen Dosierungspläne für verschreibungspflichtige Substanzen. Strategie, Monitoring und Umsetzung gehören in professionelle Begleitung.",
    levels: [
      { key: "conservative", name: "CONSERVATIVE", ambition: "Moderater Vorteil, maximale Reversibilität", complexity: "niedrig", monitoring: "Basis-Blutbild + Lipide + Hormonachse, 2–4×/Jahr", tradeoffs: "Geringste Nebenwirkungslast; Fortschritt klar über natural, aber kein Extremumbau.", underestimated: "Auch die konservative Ebene unterdrückt die eigene Achse — 'wenig' ist nicht 'nichts'." },
      { key: "balanced", name: "BALANCED", ambition: "Deutlicher Physique-Fortschritt als Dauerprojekt", complexity: "mittel", monitoring: "Erweiterte Panels (Lipide, Hämatokrit, Leber, Blutdruck, Estradiol), 4–6×/Jahr", tradeoffs: "Reale Effekte auf Lipide/Hämatokrit/Fertilität — managebar, aber nur mit Daten.", underestimated: "Blutdruck und Lipidverschiebung spürt man nicht — man misst sie. Wer nicht misst, fliegt blind." },
      { key: "aggressive", name: "AGGRESSIVE", ambition: "Wettkampf-/Maximalphysique", complexity: "hoch", monitoring: "Engmaschig inkl. Kardio-Diagnostik; faktisch dauerhaftes Gesundheitsprojekt", tradeoffs: "Kumulative kardiovaskuläre Last, Fertilität, Schlaf, Psyche — hier wird Gesundheit aktiv gegen Physique getauscht.", underestimated: "Der Exit ist schwerer als der Einstieg: Achse, Erwartungen, Identität." }
    ],
    // §54 — Substanzklassen als Education (WARUM/WAS/ERWARTUNG/UNTERSCHÄTZT/
    // MONITORING/FAILURE MODES). Klassen-Ebene, keine Produkte, keine Dosen.
    classes: [
      { key: "test_derived", name: "Testosteron-Derivate (Basis-Klasse)", whyUse: "Fundament fast jeder Enhanced-Strategie: Muskelproteinsynthese, Erholung, Trainierbarkeit steigen breit.", changes: "Mehr Masse & Kraft, höhere Erholungskapazität, oft mehr Wassereinlagerung; Aromatisierung zu Estradiol.", expect: "Deutlicher Fortschritt über natural — über Monate, nicht Wochen.", underestimate: "Achsen-Suppression beginnt sofort; Fertilität und eigene Produktion erholen sich langsam. Estradiol-Management wird unterschätzt.", monitor: "Testosteron/Estradiol, Hämatokrit, Lipide (ApoB), Blutdruck, Fertilitätsparameter bei Kinderwunsch.", failureModes: "„Blast ohne Plan“, kein Blutbild, Estradiol blind gemanagt, Exit nie geplant." },
      { key: "dht_derived", name: "DHT-Derivate", whyUse: "Härte/Definition ohne Aromatisierung; beliebt in Diät-/Wettkampfphasen.", changes: "Trockener Look, Kraft ohne viel Gewichtszunahme; kein Estradiol-Anstieg aus der Substanz selbst.", expect: "Sichtbare Qualitätseffekte, weniger Massezuwachs als Basis-Klasse.", underestimate: "Lipidverschiebung (HDL runter) oft stärker als bei der Basis-Klasse; Haarfollikel-Sensitivität; Gelenke fühlen sich 'trockener' an.", monitor: "Lipide engmaschig, Leber je nach Verbindung, Blutdruck.", failureModes: "Stacking mehrerer 'trockener' Verbindungen gleichzeitig — Lipide kollabieren messbar." },
      { key: "nor19", name: "19-Nor-Klasse", whyUse: "Starker Masse-/Kraftaufbau, Gelenk-Komfort-Effekte werden geschätzt.", changes: "Deutliche Masseeffekte; Prolaktin-/Progesteron-Achse wird relevant.", expect: "Viel Aufbau — mit der komplexesten Nebenwirkungssteuerung.", underestimate: "Psychische Effekte (Stimmung, Libido-Ausfälle über Monate) und die Trägheit der Erholung. „Deca-Dick“ ist real und langwierig.", monitor: "Prolaktin zusätzlich zur Standard-Achse, Lipide, Blutdruck, Psyche ehrlich beobachten.", failureModes: "Einsatz ohne Basis-Klasse, Prolaktin ignoriert, zu langer Einsatz ohne Pause." },
      { key: "orals", name: "Orale Anabolika", whyUse: "Schneller sichtbarer Effekt, kurze Zeitfenster (Start/Finish einer Phase).", changes: "Rasche Kraft-/Füllungseffekte; hepatische Belastung je nach Verbindung.", expect: "Kurzfristig viel — nachhaltiger Anteil deutlich kleiner als er sich anfühlt.", underestimate: "Leberwerte + Lipide verschieben sich schnell; 'nur 4 Wochen' summiert sich über Jahre.", monitor: "Leberpanel, Lipide vor/nach jedem Einsatzfenster.", failureModes: "Orals als Dauerlösung; Stacking zweier Orals; kein Vorher-Blutbild." },
      { key: "gh_axis", name: "GH-Achse (Wachstumshormon & Sekretagoga)", whyUse: "Recovery, Schlafqualität-Empfinden, Hautbild, langfristige Physique-'Qualität'.", changes: "Langsame Rekompositionseffekte über Monate; Wassereinlagerung initial.", expect: "Subtile, langsame Effekte — kein Mass-Builder.", underestimate: "Insulinsensitivität sinkt messbar; Kosten/Nutzen ist der schlechteste der gängigen Klassen; Fälschungsquote am Markt hoch.", monitor: "Nüchternglukose/HbA1c, IGF-1.", failureModes: "Teuer eingekauft, unterdosiert oder gefälscht, Glukose nie gemessen." },
      { key: "insulin_igf", name: "Insulin/IGF-Konzepte", whyUse: "Maximal-Bodybuilding-Kontext: Nährstoffpartitionierung auf höchstem Level.", changes: "In Kombination mit GH/AAS zusätzliche Masseeffekte bei Profis.", expect: "Für 99 % irrelevant — Risiko/Nutzen steht in keinem Verhältnis.", underestimate: "Akute Hypoglykämie kann tödlich sein. Das ist keine Übertreibung, sondern der Grund, warum diese Klasse außerhalb des Profi-Kontexts nichts verloren hat.", monitor: "Glukose-Management in Echtzeit — professionelle Begleitung zwingend.", failureModes: "Nachahmung von Pro-Protokollen ohne deren Kontext, Betreuung und Monitoring." },
      { key: "fatloss", name: "Fat-Loss-Pharmakologie", whyUse: "Diätphasen beschleunigen, Appetit kontrollieren (inkl. moderner GLP-1-Klasse).", changes: "Höherer Energieverbrauch bzw. geringerer Hunger; je nach Klasse Herz-Kreislauf-Last.", expect: "Defizit wird leichter — die Diät macht trotzdem die Arbeit.", underestimate: "Stimulanzien-Klassen: kardiale Ereignisse sind der reale Worst Case. GLP-1: Muskelverlust ohne Protein/Training; Rebound nach Absetzen.", monitor: "Blutdruck, Ruhepuls, Schlaf; bei GLP-1 Muskelmasse/Kraft aktiv schützen.", failureModes: "Stimulanzien stacken, Schlaf opfern, GLP-1 ohne Trainings-/Proteinstrategie." },
      { key: "peptides", name: "Peptide / 'Biohacking'-Kategorien", whyUse: "Heilung, Schlaf, Haut, 'Edge' — der experimentelle Rand.", changes: "Datenlage pro Substanz dünn bis anekdotisch; Effekte oft subtil.", expect: "Wenig Verlässliches — der Markt verkauft Hoffnung.", underestimate: "Qualität/Fälschung (Graumarkt), fehlende Langzeitdaten, sterile Handhabung.", monitor: "Mindestens: wissen, WAS man nimmt (Drittanbieter-Analytik) — sonst ist Monitoring sinnlos.", failureModes: "Vertrauen in Reseller-Marketing statt Analytik; zehn Substanzen gleichzeitig, Effekte unzuordenbar." }
    ],
    // §55 — Monitoring-Matrix (educational)
    monitoringMatrix: [
      { domain: "KARDIOVASKULÄR", items: ["Blutdruck (Heimmessung)", "ApoB / Lipidprofil", "Ruhepuls"] },
      { domain: "HÄMATOLOGIE", items: ["Hämatokrit", "Hämoglobin"] },
      { domain: "METABOLISCH", items: ["Nüchternglukose", "HbA1c"] },
      { domain: "LEBER", items: ["ALT/AST", "GGT"] },
      { domain: "NIERE", items: ["Kreatinin/eGFR", "Cystatin C bei viel Muskelmasse"] },
      { domain: "HORMONACHSE", items: ["Testosteron (gesamt/frei)", "Estradiol (sensitiv)", "LH/FSH", "Prolaktin (19-Nor)"] },
      { domain: "FERTILITÄT", items: ["Spermiogramm VOR Einstieg bei Kinderwunsch"] },
      { domain: "PSYCHE/SCHLAF", items: ["Schlafqualität", "Stimmung/Reizbarkeit ehrlich tracken"] }
    ],
    exit: "Absetzen/Zielwechsel ist ein eigenes Projekt: Achsen-Erholung dauert Monate, Fertilität länger. Wer 'irgendwann Kinder' sagt, plant das VOR dem Einstieg.",
    monitoringDomains: ["Blutdruck", "Lipide (ApoB)", "Hämatokrit", "Leber", "Niere", "Hormonachse", "Estradiol", "Fertilität", "Schlaf", "Psyche"]
  };

  /* ======================= PROGRESS INTERPRETATION ======================= */
  function interpretProgress(d) {
    // d: {weightDelta, waistDelta, strengthPct, executionPct}
    var out = [];
    var weightStable = d.weightDelta != null && Math.abs(d.weightDelta) < 1.5;
    var waistDown = d.waistDelta != null && d.waistDelta < -1.5;
    var recomp = weightStable && waistDown && (d.strengthPct != null && d.strengthPct > 3);
    if (recomp) out.push("Gewicht nahezu unverändert, Taille deutlich runter, Kraft rauf — dieses Muster ist konsistent mit erfolgreicher Rekomposition.");
    else {
      // §118 — kein falscher Recomp-Beweis: Muster benennen, fehlende Daten benennen.
      if (weightStable && waistDown && d.strengthPct == null) out.push("Gewicht stabil, Taille runter — das Muster spricht für Fettabbau/verbesserte Körperzusammensetzung. Für eine echte Recomp-Aussage fehlen Kraftdaten (INSUFFICIENT DATA: Kraft).");
      if (d.waistDelta != null && d.waistDelta < -2 && !(weightStable && waistDown && d.strengthPct == null)) out.push("Der Taillentrend (−" + Math.abs(d.waistDelta).toFixed(1) + " cm) spricht für realen Fettabbau.");
      if (d.strengthPct != null && d.strengthPct > 5) out.push("Kraft +" + d.strengthPct.toFixed(0) + " % (e1RM-Trend über Benchmark-Übungen) — die Trainingsreize kommen an.");
      if (d.weightDelta != null && d.weightDelta > 2 && (d.waistDelta == null || d.waistDelta > 1)) out.push("Gewicht und Taille steigen zusammen — ein Teil des Aufbaus ist wahrscheinlich Fett. Kein Drama, aber ein Signal für den nächsten Block.");
    }
    if (d.executionPct != null && d.executionPct >= 80) out.push("Umsetzung " + d.executionPct + " % — Veränderungen sind damit belastbar interpretierbar.");
    if (d.executionPct != null && d.executionPct < 60) out.push("Bei " + d.executionPct + " % Umsetzung sind Rückschlüsse auf den Plan unsicher — die Daten sagen mehr über die Woche als über die Strategie.");
    if (!out.length) out.push("Noch zu wenig Daten für eine belastbare Interpretation — Trends brauchen mehrere Messpunkte.");
    return out;
  }
  function observePatterns(d) {
    var out = [];
    if (d.sleepConsistencyUp && d.trainingCompletionUp) out.push("Höhere Schlaf-Konstanz fiel zeitlich mit besserer Trainings-Umsetzung zusammen.");
    if (d.proteinAdherenceUp && d.strengthUp) out.push("Die Phase mit besserer Protein-Adhärenz überschnitt sich mit der Kraftprogression.");
    return out;
  }
  // §67 — Next-Cycle-Empfehlung: transparent begründet, kein Black-Box-Output.
  function nextCycleRecommendation(d) {
    // d: {mode, waistNow, weightDelta, waistDelta, strengthPct, executionPct, score}
    var why = [];
    var rec = d.mode || "recomp";
    if (d.executionPct != null && d.executionPct < 60) {
      rec = d.mode; why.push("Umsetzung lag unter 60 % — derselbe Modus mit Fokus auf Konstanz schlägt jeden Strategiewechsel.");
      return { mode: rec, repeatFoundation: true, why: why };
    }
    if (d.mode === "cut") {
      if (d.waistDelta != null && d.waistDelta <= -3 && (d.waistNow == null || d.waistNow < 94)) { rec = "recomp"; why.push("Taille deutlich runter — der nächste Block kann auf Halten + Kraft aufbauen (RECOMP) statt weiter hart zu cutten."); }
      else { rec = "cut"; why.push("Taillenziel noch nicht erreicht — ein zweiter, kürzerer Cut-Block ist der direkteste Weg."); }
    } else if (d.mode === "build") {
      if (d.waistDelta != null && d.waistDelta > 2) { rec = "cut"; why.push("Die Taille ist im Aufbau spürbar mitgewachsen — ein Mini-Cut sichert die Qualität des Aufbaus."); }
      else { rec = "build"; why.push("Aufbau läuft sauber (Taille im Rahmen) — zweiter Wachstumsblock auf besserer Basis."); }
    } else if (d.mode === "recomp") {
      if (d.strengthPct != null && d.strengthPct > 5 && (d.waistDelta == null || d.waistDelta > -2)) { rec = "build"; why.push("Kraft reagiert gut, Taille bewegt sich kaum noch — ein leichter Aufbau-Block nutzt das Momentum."); }
      else if (d.waistDelta != null && d.waistDelta <= -3) { rec = "recomp"; why.push("Recomp liefert sichtbar — weiterlaufen lassen, solange Taille und Kraft sich gleichzeitig verbessern."); }
      else { rec = "recomp"; why.push("Noch kein klares Signal für einen Richtungswechsel — Recomp fortsetzen, Messpunkte verdichten."); }
    } else if (d.mode === "perform") {
      rec = "perform"; why.push("PERFORM ist ein Dauerzustand, kein 12-Wochen-Projekt — nächster Block mit neuen Benchmarks.");
    }
    return { mode: rec, why: why };
  }

  MM.engines = {
    transformation: transformation, ENHANCED_CONTEXT: ENHANCED_CONTEXT,
    nutritionTargets: nutritionTargets, activityEstimate: activityEstimate, adaptiveTdee: adaptiveTdee,
    exampleDay: exampleDay, mealById: mealById, dayTotals: dayTotals, ingText: ingText,
    swapMeal: swapMeal, familyPortion: familyPortion, shoppingList: shoppingList,
    dayLogTotals: dayLogTotals, weeklyAdherence: weeklyAdherence, nutritionAdjust: nutritionAdjust, MEALS: MEALS,
    buildTrainingPlan: buildTrainingPlan, weeklyVolume: weeklyVolume, EXPERIENCE: EXPERIENCE, limitationSwap: limitationSwap,
    progressionTarget: progressionTarget, progressionPlan: progressionPlan, plateauCheck: plateauCheck, EXDB: EXDB,
    e1rm: e1rm, bestE1rm: bestE1rm, strengthTrend: strengthTrend, detectPRs: detectPRs, BENCHMARKS: BENCHMARKS,
    stackStrategy: stackStrategy, analyzeCurrentStack: analyzeCurrentStack, matchSupp: matchSupp, SUPPS: SUPPS, ENHANCED_FRAMEWORK: ENHANCED_FRAMEWORK,
    interpretProgress: interpretProgress, observePatterns: observePatterns, nextCycleRecommendation: nextCycleRecommendation
  };
})();
