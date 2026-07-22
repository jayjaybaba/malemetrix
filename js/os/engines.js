/* ==========================================================================
   MALEMETRIX OS — ENGINES  (MM.engines)
   --------------------------------------------------------------------------
   Reine, deterministische Engines über dem Personal Graph:
     · TRANSFORMATION — Reality Check + 12-Monats-Blueprint (Ranges, nie
       Garantien; keine Fake-Präzision).
     · NUTRITION OS   — Energie/Makro-Ziele, Beispieltag aus echter Meal-DB,
       Swaps/Family/Budget, Einkaufsliste, trendbasierte Anpassungslogik
       (KEEP / ADJUST / EXECUTION FIRST / RECOVERY FIRST).
     · TRAINING       — Split-Generator, Double Progression, Plateau-Erkennung
       (nie blind Volumen drauf), Deload nach Signalen statt Kalender-Dogma.
     · STACK          — wertbasierte Supplement-Strategie (Budget-Modi,
       Low-Value-Entfernung) + ENHANCED-Strategie-Framework (Education,
       KEINE automatisierten individuellen Dosierungspläne).
     · PROGRESS       — Interpretation mit probabilistischer Sprache, keine
       falsche Kausalität.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var OS = function () { return MM.os; };

  /* ======================= TRANSFORMATION ENGINE ======================= */
  // Erfahrungsbasierte monatliche Muskelaufbau-Ranges (% Körpergewicht/Monat):
  // ehrliche, konservativ-bis-aggressiv gestaffelte Spannen — keine Versprechen.
  var GAIN_RANGES = {
    beginner: { cons: 0.5, likely: 0.9, aggr: 1.3 },
    novice: { cons: 0.4, likely: 0.7, aggr: 1.0 },
    intermediate: { cons: 0.2, likely: 0.4, aggr: 0.6 },
    advanced: { cons: 0.1, likely: 0.2, aggr: 0.35 }
  };
  function transformation(input) {
    // input: {weightKg, bfPct(optional), heightCm, experience, targetWeightKg,
    //         targetLeanness('leaner'|'same'|'much_leaner'), months}
    var exp = GAIN_RANGES[input.experience] ? input.experience : "novice";
    var months = Math.max(3, Math.min(24, input.months || 12));
    var r = GAIN_RANGES[exp];
    var w = input.weightKg;
    var gain = {
      cons: Math.round(w * (r.cons / 100) * months * 10) / 10,
      likely: Math.round(w * (r.likely / 100) * months * 10) / 10,
      aggr: Math.round(w * (r.aggr / 100) * months * 10) / 10
    };
    var wantsGain = (input.targetWeightKg || w) - w;
    var wantsLeaner = input.targetLeanness === "leaner" || input.targetLeanness === "much_leaner";
    var feasible = wantsGain <= gain.aggr * 1.15;   // Muskel, nicht Gesamtmasse — Toleranz für Wasser/Glykogen
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
    // Phasen-Blueprint aus Ausgangslage (nicht für jeden identisch)
    var bf = input.bfPct || null;
    var phases = [];
    if (bf != null && bf >= 20) phases.push({ key: "cut", name: "CUT / CLEANUP", weeks: 12, why: "Erst Körperfett kontrollieren — Aufbau auf hohem KFA baut überproportional Fett mit auf." });
    phases.push({ key: "build1", name: "FOUNDATION / PRODUCTIVE GROWTH", weeks: 12, why: "Progressiver Aufbau-Block: Volumen, Progression, Essen, Schlaf." });
    if (wantsGain > 2 || months >= 9) phases.push({ key: "minicut", name: "MINI-CUT", weeks: 4, why: "Kurzer, harter Cut hält die Taille im Rahmen und verlängert produktive Aufbauzeit." });
    if (months >= 9) phases.push({ key: "build2", name: "PRODUCTIVE GROWTH II", weeks: 12, why: "Zweiter Wachstumsblock auf besserer Basis." });
    if (wantsLeaner) phases.push({ key: "reveal", name: "CONSOLIDATE / REVEAL", weeks: 8, why: "Definieren, Kraft sichern, Ergebnis sichtbar machen." });
    return { experience: exp, months: months, gainRange: gain, feasible: feasible, reality: reality, phases: phases };
  }

  /* ======================= NUTRITION OS ======================= */
  function bmr(weightKg, heightCm, age) {   // Mifflin-St Jeor (männlich)
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * (age || 35) + 5);
  }
  var ACTIVITY = { low: 1.35, moderate: 1.5, high: 1.65 };
  var MODE_ADJ = { cut: -0.2, recomp: 0, build: 0.1, perform: 0.05 };
  function nutritionTargets(g) {
    // g: {weightKg, heightCm, age, mode, activity, trainDays}
    var base = bmr(g.weightKg, g.heightCm, g.age) * (ACTIVITY[g.activity] || 1.5);
    var kcal = Math.round(base * (1 + (MODE_ADJ[g.mode] != null ? MODE_ADJ[g.mode] : 0)) / 10) * 10;
    var proteinPerKg = g.mode === "cut" ? 2.2 : g.mode === "build" ? 1.8 : 2.0;
    var protein = Math.round(g.weightKg * proteinPerKg);
    var fat = Math.round(kcal * 0.27 / 9);
    var carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
    return { kcal: kcal, kcalRange: [kcal - 150, kcal + 150], protein: protein, fat: fat, carbs: Math.max(0, carbs), basis: { bmr: bmr(g.weightKg, g.heightCm, g.age), activity: g.activity || "moderate", modeAdj: MODE_ADJ[g.mode] || 0 } };
  }

  // Echte Meal-DB (Gramm/Makros pro Portion). tags: schnell/billig/füllend/familie
  var MEALS = [
    { id: "skyr_beeren", name: "Skyr-Bowl mit Beeren & Nüssen", slot: "breakfast", kcal: 420, p: 42, c: 38, f: 12, min: 5, cost: 1, tags: ["schnell", "billig"], ing: ["500 g Skyr", "150 g Beeren (TK)", "20 g Walnüsse", "10 g Honig"] },
    { id: "eier_brot", name: "Rührei (4 Eier) auf Vollkornbrot", slot: "breakfast", kcal: 520, p: 34, c: 35, f: 26, min: 10, cost: 1, tags: ["schnell", "füllend"], ing: ["4 Eier", "2 Scheiben Vollkornbrot", "10 g Butter", "Tomate"] },
    { id: "haehnchen_reis", name: "Hähnchen · Reis · Brokkoli", slot: "main", kcal: 650, p: 55, c: 70, f: 12, min: 25, cost: 2, tags: ["füllend", "familie"], ing: ["250 g Hähnchenbrust", "80 g Reis (roh)", "300 g Brokkoli", "1 EL Olivenöl"] },
    { id: "chili", name: "Chili con Carne (Familienrezept)", slot: "main", kcal: 720, p: 58, c: 60, f: 24, min: 35, cost: 2, tags: ["familie", "füllend"], ing: ["200 g Rinderhack (5%)", "120 g Kidneybohnen", "80 g Mais", "Passierte Tomaten", "Reis 60 g (roh)"], family: { servings: 4, note: "Ein Topf für alle — deine Portion wird abgemessen, keine Extra-Fitnessmahlzeit nötig." } },
    { id: "lachs_kartoffel", name: "Lachs · Kartoffeln · grüne Bohnen", slot: "main", kcal: 620, p: 45, c: 48, f: 26, min: 30, cost: 3, tags: ["familie"], ing: ["200 g Lachsfilet", "300 g Kartoffeln", "200 g grüne Bohnen"] },
    { id: "quark_abend", name: "Magerquark mit Leinöl & Banane", slot: "snack", kcal: 380, p: 40, c: 30, f: 10, min: 3, cost: 1, tags: ["schnell", "billig"], ing: ["400 g Magerquark", "1 Banane", "10 g Leinöl"] },
    { id: "wrap", name: "High-Protein-Wrap mit Pute", slot: "main", kcal: 540, p: 44, c: 52, f: 16, min: 12, cost: 2, tags: ["schnell"], ing: ["2 Vollkorn-Wraps", "150 g Putenbrust", "Salat, Tomate", "30 g Hummus"] },
    { id: "shake", name: "Whey-Shake + Haferflocken", slot: "snack", kcal: 400, p: 35, c: 45, f: 8, min: 3, cost: 1, tags: ["schnell", "billig"], ing: ["30 g Whey", "50 g Haferflocken", "300 ml Milch 1,5%"] },
    { id: "bowl_veg", name: "Linsen-Bowl mit Feta", slot: "main", kcal: 580, p: 32, c: 65, f: 20, min: 20, cost: 1, tags: ["billig", "familie"], ing: ["150 g rote Linsen (gekocht)", "60 g Feta", "Gurke, Tomate, Olivenöl", "Vollkornfladenbrot"] },
    { id: "pfanne_rind", name: "Rind-Gemüse-Pfanne mit Nudeln", slot: "main", kcal: 680, p: 50, c: 68, f: 20, min: 25, cost: 2, tags: ["familie", "füllend"], ing: ["200 g Rinderstreifen", "80 g Nudeln (roh)", "Paprika, Zucchini", "Sojasauce"] }
  ];
  function exampleDay(targets, prefs) {
    prefs = prefs || {};
    var pool = MEALS.slice();
    if (prefs.maxCookMin) pool = pool.filter(function (m) { return m.min <= prefs.maxCookMin || m.slot === "snack"; });
    var picks = [];
    function pick(slot) { var c = pool.filter(function (m) { return m.slot === slot && picks.indexOf(m) < 0; }); return c.length ? c[0] : null; }
    var b = pick("breakfast"); if (b) picks.push(b);
    var m1 = pick("main"); if (m1) picks.push(m1);
    var m2 = pool.filter(function (m) { return m.slot === "main" && picks.indexOf(m) < 0; })[0]; if (m2) picks.push(m2);
    var s = pick("snack"); if (s) picks.push(s);
    var sum = picks.reduce(function (a, m) { return { kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }; }, { kcal: 0, p: 0, c: 0, f: 0 });
    // Protein-Lücke mit zweitem Snack schließen, falls nötig
    if (targets && sum.p < targets.protein - 25) { var s2 = pool.filter(function (m) { return m.slot === "snack" && picks.indexOf(m) < 0; })[0]; if (s2) { picks.push(s2); sum.kcal += s2.kcal; sum.p += s2.p; sum.c += s2.c; sum.f += s2.f; } }
    return { meals: picks, totals: sum };
  }
  function swapMeal(mealId, want) {
    // want: 'cheaper' | 'faster' | 'filling' | 'protein' | 'family'
    var cur = MEALS.find(function (m) { return m.id === mealId; }); if (!cur) return null;
    var cands = MEALS.filter(function (m) { return m.slot === cur.slot && m.id !== mealId; });
    if (want === "cheaper") cands.sort(function (a, b) { return a.cost - b.cost; });
    else if (want === "faster") cands.sort(function (a, b) { return a.min - b.min; });
    else if (want === "filling") cands = cands.filter(function (m) { return m.tags.indexOf("füllend") >= 0; }).concat(cands);
    else if (want === "protein") cands.sort(function (a, b) { return (b.p / b.kcal) - (a.p / a.kcal); });
    else if (want === "family") cands = cands.filter(function (m) { return m.tags.indexOf("familie") >= 0; }).concat(cands);
    return cands[0] || null;
  }
  function familyPortion(mealId, targets) {
    var m = MEALS.find(function (x) { return x.id === mealId; }); if (!m || !m.family) return null;
    return { name: m.name, servings: m.family.servings, note: m.family.note, yourServing: { kcal: m.kcal, protein: m.p } };
  }
  function shoppingList(mealIds) {
    var CAT = { protein: ["Skyr", "Eier", "Hähnchen", "Hack", "Lachs", "Quark", "Pute", "Whey", "Feta", "Rind", "Milch"], carbs: ["Brot", "Reis", "Kartoffeln", "Haferflocken", "Wraps", "Nudeln", "Linsen", "Fladenbrot", "Banane", "Honig"], produce: ["Beeren", "Tomate", "Brokkoli", "Bohnen", "Salat", "Gurke", "Paprika", "Zucchini", "Mais"], fats: ["Nüsse", "Butter", "Olivenöl", "Leinöl", "Hummus"], convenience: ["Passierte", "Sojasauce", "Kidneybohnen"] };
    var out = { protein: [], carbs: [], produce: [], fats: [], convenience: [], other: [] };
    mealIds.forEach(function (id) {
      var m = MEALS.find(function (x) { return x.id === id; }); if (!m) return;
      m.ing.forEach(function (ing) {
        var cat = "other";
        Object.keys(CAT).forEach(function (c) { if (CAT[c].some(function (w) { return ing.indexOf(w) >= 0; })) cat = c; });
        if (out[cat].indexOf(ing) < 0) out[cat].push(ing);
      });
    });
    return out;
  }
  // TRENDBASIERTE ANPASSUNG — nie auf eine einzelne Waage-Messung reagieren.
  function nutritionAdjust(ctx) {
    // ctx: {mode, weightTrend(Δkg/Woche über rollende Ø), waistTrend, adherencePct, energyLow, sleepBad}
    if (ctx.adherencePct != null && ctx.adherencePct < 70) {
      return { code: "execution_first", title: "EXECUTION FIRST", text: "Die Zielwerte sind wahrscheinlich nicht das Problem — die Umsetzung war es diese Woche (" + ctx.adherencePct + " %). Kalorien senken würde jetzt nichts reparieren. Erst konstant umsetzen, dann bewerten." };
    }
    if (ctx.energyLow && ctx.sleepBad) {
      return { code: "recovery_first", title: "RECOVERY FIRST", text: "Energie und Schlaf sind unten. Ein größeres Defizit oder mehr Druck wäre jetzt kontraproduktiv. Diese Woche: Schlaf priorisieren, Ziele halten — nicht verschärfen." };
    }
    if (ctx.mode === "cut") {
      if (ctx.weightTrend != null && ctx.weightTrend > -0.2 && (ctx.waistTrend == null || ctx.waistTrend > -0.3)) {
        return { code: "adjust_down", title: "ADJUST −10 %", text: "Adhärenz hoch, aber Gewichts- UND Taillentrend stehen über mehrere Wochen. Senke die Energie um ~10 % (eine Variable) und beobachte die nächsten 2 Wochen." };
      }
      if (ctx.weightTrend != null && ctx.weightTrend < -1.0) {
        return { code: "adjust_up", title: "ZU SCHNELL — LEICHT ERHÖHEN", text: "Du verlierst über 1 % Körpergewicht pro Woche — auf Dauer kostet das Muskeln und Trainingsleistung. Erhöhe die Energie leicht (+150–200 kcal)." };
      }
    }
    if (ctx.mode === "build" && ctx.waistTrend != null && ctx.waistTrend > 0.7) {
      return { code: "adjust_down", title: "SURPLUS ZURÜCKNEHMEN", text: "Die Taille steigt schneller als bei einem sauberen Aufbau nötig. Überschuss etwas reduzieren — Progression im Training bleibt der Fokus." };
    }
    return { code: "keep", title: "KEEP", text: "Trend und Umsetzung passen zum Ziel. Nichts ändern — Konstanz ist gerade der stärkste Hebel." };
  }

  /* ======================= TRAINING ENGINE ======================= */
  var EXDB = {
    squat: { name: "Kniebeuge / Beinpresse", group: "legs", equip: ["gym", "home_barbell"], alt: ["legpress", "goblet"] },
    legpress: { name: "Beinpresse", group: "legs", equip: ["gym"], alt: ["squat", "goblet"] },
    goblet: { name: "Goblet Squat", group: "legs", equip: ["home_db", "gym"], alt: ["squat"] },
    rdl: { name: "Rumänisches Kreuzheben", group: "posterior", equip: ["gym", "home_barbell", "home_db"], alt: ["legcurl"] },
    legcurl: { name: "Beinbeuger", group: "posterior", equip: ["gym"], alt: ["rdl"] },
    bench: { name: "Bankdrücken", group: "push", equip: ["gym", "home_barbell"], alt: ["dbpress", "pushup"] },
    dbpress: { name: "KH-Drücken flach/schräg", group: "push", equip: ["gym", "home_db"], alt: ["bench", "pushup"] },
    pushup: { name: "Liegestütz (beschwert)", group: "push", equip: ["home_none", "home_db", "gym"], alt: ["dbpress"] },
    ohp: { name: "Schulterdrücken", group: "shoulders", equip: ["gym", "home_barbell", "home_db"], alt: ["dbpress"] },
    row: { name: "Rudern (LH/KH/Maschine)", group: "pull", equip: ["gym", "home_barbell", "home_db"], alt: ["pulldown"] },
    pulldown: { name: "Latzug / Klimmzug", group: "pull", equip: ["gym", "home_none"], alt: ["row"] },
    curl: { name: "Bizeps-Curls", group: "arms", equip: ["gym", "home_db"], alt: [] },
    triceps: { name: "Trizeps (Dips/Pushdown)", group: "arms", equip: ["gym", "home_none"], alt: [] },
    lateral: { name: "Seitheben", group: "shoulders", equip: ["gym", "home_db"], alt: [] },
    core: { name: "Core (Plank/Ab-Wheel)", group: "core", equip: ["home_none", "gym"], alt: [] }
  };
  function buildTrainingPlan(g) {
    // g: {daysPerWeek(3|4), minutes, location('gym'|'home_db'|'home_none'), priority('balanced'|'chest'|'back'|'arms'|'legs'|'shoulders'), experience}
    var days = g.daysPerWeek === 4 ? 4 : 3;
    var loc = g.location || "gym";
    function pick(key) { var ex = EXDB[key]; if (ex.equip.indexOf(loc) >= 0 || loc === "gym") return key; for (var i = 0; i < ex.alt.length; i++) { if (EXDB[ex.alt[i]].equip.indexOf(loc) >= 0) return ex.alt[i]; } return key; }
    function slot(key, sets, reps, rir) { var k = pick(key); return { ex: k, name: EXDB[k].name, sets: sets, reps: reps, rir: rir, rest: reps[1] <= 8 ? "2–3 min" : "90 s", rule: "double_progression" }; }
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
    // Muskel-Priorität: +1 Satz auf Zielmuskel-Slots, −1 auf entfernte Gruppe (kein Gesamtvolumen-Explosion)
    var prio = g.priority || "balanced";
    var PRIO_GROUP = { chest: "push", back: "pull", arms: "arms", legs: "legs", shoulders: "shoulders" };
    if (PRIO_GROUP[prio]) {
      sessions.forEach(function (s) { s.slots.forEach(function (sl) { if (EXDB[sl.ex].group === PRIO_GROUP[prio]) sl.sets += 1; }); });
    }
    // Zeitbudget: <45 min → letzte Iso-Übung je Session streichen
    if (g.minutes && g.minutes < 45) sessions.forEach(function (s) { if (s.slots.length > 4) s.slots.pop(); });
    return { days: days, location: loc, priority: prio, sessions: sessions, note: days >= 4 ? "Aufeinanderfolgende Krafttage haben bewusst unterschiedliche Schwerpunkte (Ober-/Unterkörper) — keine identische Belastung an Folgetagen." : "" };
  }
  // DOUBLE PROGRESSION: erst Wiederholungen im Zielbereich füllen, dann Last erhöhen.
  function progressionTarget(lastSets, repRange, increment) {
    // lastSets: [{w, r}...] — gleiche Last angenommen
    if (!lastSets || !lastSets.length) return { type: "start", text: "Startgewicht wählen: " + repRange[0] + "–" + repRange[1] + " Wdh. mit 1–2 RIR." };
    var w = lastSets[0].w;
    var allTop = lastSets.every(function (s) { return s.r >= repRange[1]; });
    if (allTop) { var nw = Math.round((w + (increment || 2.5)) * 2) / 2; return { type: "load", text: "Alle Sätze am oberen Ende (" + repRange[1] + ") → heute " + nw + " kg.", nextWeight: nw }; }
    var total = lastSets.reduce(function (a, s) { return a + s.r; }, 0);
    return { type: "reps", text: "Gleiches Gewicht (" + w + " kg) — schlage die Gesamt-Wdh. von letztem Mal (" + total + ").", beatTotal: total };
  }
  // PLATEAU: nie automatisch Volumen drauf. Erst Ursachen prüfen.
  function plateauCheck(history, ctx) {
    // history: letzte Einheiten desselben Exercises [{date, sets:[{w,r}]}]; ctx: {sleepBad, adherenceLow, kcalLow}
    if (!history || history.length < 3) return { plateau: false };
    var last3 = history.slice(-3);
    function score(h) { return h.sets.reduce(function (a, s) { return a + s.w * s.r; }, 0); }
    var s0 = score(last3[0]), s1 = score(last3[1]), s2 = score(last3[2]);
    var stalled = s2 <= s0 && s1 <= s0 * 1.02;
    if (!stalled) return { plateau: false };
    var rec = [];
    if (ctx && ctx.sleepBad) rec.push({ action: "recovery", text: "Schlaf ist der wahrscheinlichste Bremsklotz — erst Recovery fixen, NICHT mehr Volumen." });
    if (ctx && ctx.kcalLow) rec.push({ action: "nutrition", text: "Im deutlichen Defizit stagniert Kraft oft — Erwartung anpassen oder Energie leicht erhöhen." });
    if (ctx && ctx.adherenceLow) rec.push({ action: "execution", text: "Unregelmäßiges Training erklärt die Stagnation — erst Konstanz, dann Programmänderungen." });
    if (!rec.length) rec.push({ action: "variation", text: "3× keine Progression bei guter Basis: Übung variieren ODER einen leichten Deload (−30 % Volumen, 1 Woche) einschieben — nicht einfach mehr Sätze." });
    return { plateau: true, recommendations: rec };
  }

  /* ======================= STACK INTELLIGENCE ======================= */
  // Wertbasierter Katalog. tiers: foundation | goal | optional | low_value
  var SUPPS = [
    { id: "creatine", name: "Kreatin Monohydrat", tier: "foundation", evidence: "STRONG", value: 5, cost: 1, timing: "täglich 3–5 g, Zeitpunkt egal", why: "Am besten belegtes Supplement für Kraft & Muskelmasse. Billig, sicher, wirksam.", goals: ["build", "recomp", "cut", "perform"] },
    { id: "protein", name: "Whey/Casein (bei Proteinlücke)", tier: "foundation", evidence: "STRONG", value: 5, cost: 2, timing: "als Mahlzeitbaustein", why: "Kein Muss — aber der billigste Weg, das Proteinziel real zu treffen.", goals: ["build", "recomp", "cut", "perform"] },
    { id: "omega3", name: "Omega-3 (EPA/DHA)", tier: "foundation", evidence: "MODERATE", value: 4, cost: 2, timing: "1–2 g EPA+DHA mit Mahlzeit", why: "Kardiometabolische Basis, besonders bei wenig Fisch.", goals: ["all"] },
    { id: "vitd", name: "Vitamin D3", tier: "foundation", evidence: "MODERATE", value: 4, cost: 1, timing: "1000–2000 IE mit Fett", why: "Häufiger Mangel in DE — sinnvoll ohne Sonne, ideal per Blutwert steuern.", goals: ["all"] },
    { id: "caffeine", name: "Koffein (gezielt)", tier: "goal", evidence: "STRONG", value: 4, cost: 1, timing: "3–6 mg/kg 45 min vor Training, nicht nach 14 Uhr", why: "Akute Leistung + Fokus. Schlaf hat trotzdem Vorrang.", goals: ["build", "perform", "cut"] },
    { id: "citrulline", name: "Citrullin-Malat", tier: "optional", evidence: "MODERATE", value: 3, cost: 2, timing: "6–8 g pre", why: "Moderater Pump/Volumen-Effekt — nice-to-have, kein Fundament.", goals: ["build", "perform"] },
    { id: "magnesium", name: "Magnesium (abends)", tier: "optional", evidence: "MODERATE", value: 3, cost: 1, timing: "200–400 mg abends", why: "Sinnvoll bei Krämpfen/schlechtem Schlaf — kein Wundermittel.", goals: ["all"] },
    { id: "ashwagandha", name: "Ashwagandha", tier: "optional", evidence: "EMERGING", value: 2, cost: 2, timing: "300–600 mg abends", why: "Kann Stress/Schlaf leicht verbessern — Datenlage gemischt, Qualität schwankt.", goals: ["all"] },
    { id: "bcaa", name: "BCAA/EAA (bei genug Protein)", tier: "low_value", evidence: "STRONG_NEGATIVE", value: 0, cost: 2, timing: "—", why: "Wer sein Proteinziel isst, verbrennt hier Geld. Streichen.", goals: [] },
    { id: "tbooster", name: "„Testo-Booster“ (Tribulus & Co.)", tier: "low_value", evidence: "STRONG_NEGATIVE", value: 0, cost: 3, timing: "—", why: "Kein relevanter Effekt auf Testosteron in brauchbaren Studien. Streichen.", goals: [] },
    { id: "fatburner", name: "„Fatburner“-Komplexe", tier: "low_value", evidence: "STRONG_NEGATIVE", value: 0, cost: 3, timing: "—", why: "Teures Koffein mit Marketing. Das Defizit macht die Arbeit.", goals: [] },
    { id: "multivit", name: "Multivitamin (Standarddiät)", tier: "low_value", evidence: "MODERATE_NEGATIVE", value: 1, cost: 2, timing: "—", why: "Bei vernünftiger Ernährung meist überflüssig — gezielte Einzelstoffe schlagen die Gießkanne.", goals: [] }
  ];
  function stackStrategy(g) {
    // g: {mode, pathway, budget('essential'|'optimal'|'maximal'), current[](Namen), sleepBad}
    var budget = g.budget || "optimal";
    var take = SUPPS.filter(function (s) { return s.tier !== "low_value"; })
      .filter(function (s) { return s.goals.indexOf("all") >= 0 || s.goals.indexOf(g.mode) >= 0; })
      .sort(function (a, b) { return b.value - a.value || a.cost - b.cost; });
    var n = budget === "essential" ? 3 : budget === "optimal" ? 6 : take.length;
    var chosen = take.slice(0, n);
    if (g.sleepBad && !chosen.some(function (s) { return s.id === "magnesium"; })) { var mg = SUPPS.find(function (s) { return s.id === "magnesium"; }); if (mg) chosen.push(mg); }
    // MAXIMAL ≠ alles: abnehmender Grenznutzen wird explizit gemacht
    var diminishing = budget === "maximal" ? "Ab hier ist der Grenznutzen klein: alles unterhalb von Kreatin/Protein/Omega-3/Vitamin D bewegt wenige Prozent — Training, Essen und Schlaf bewegen den Rest." : "";
    // Low-Value-Entfernung gegen den aktuellen Stack des Nutzers
    var current = (g.current || []).map(function (x) { return String(x).toLowerCase(); });
    var remove = SUPPS.filter(function (s) { return s.tier === "low_value" && current.some(function (c) { return s.name.toLowerCase().indexOf(c) >= 0 || c.indexOf(s.id) >= 0 || (s.id === "bcaa" && /bcaa|eaa/.test(c)) || (s.id === "tbooster" && /tribulus|testo|booster/.test(c)) || (s.id === "fatburner" && /burner|fat/.test(c)) || (s.id === "multivit" && /multi/.test(c)); }); });
    var schedule = { morning: [], with_food: [], pre_training: [], evening: [] };
    chosen.forEach(function (s) {
      if (/pre/.test(s.timing)) schedule.pre_training.push(s.name);
      else if (/abends/.test(s.timing)) schedule.evening.push(s.name);
      else if (/Mahlzeit|Fett/.test(s.timing)) schedule.with_food.push(s.name);
      else schedule.morning.push(s.name);
    });
    return { budget: budget, items: chosen, remove: remove, diminishing: diminishing, schedule: schedule };
  }
  // ENHANCED-STRATEGIE-FRAMEWORK — Education über reale Strategie-Ebenen.
  // Bewusst KEINE automatisierten individuellen Dosierungspläne.
  var ENHANCED_FRAMEWORK = {
    boundary: "MaleMetrix erklärt reale Enhanced-Praxis direkt und ohne Moralisieren — erstellt aber keine individuellen Dosierungspläne für verschreibungspflichtige Substanzen. Strategie, Monitoring und Umsetzung gehören in professionelle Begleitung.",
    levels: [
      { key: "conservative", name: "CONSERVATIVE", ambition: "Moderater Vorteil, maximale Reversibilität", complexity: "niedrig", monitoring: "Basis-Blutbild + Lipide + Hormonachse, 2–4×/Jahr", tradeoffs: "Geringste Nebenwirkungslast; Fortschritt klar über natural, aber kein Extremumbau.", underestimated: "Auch die konservative Ebene unterdrückt die eigene Achse — 'wenig' ist nicht 'nichts'." },
      { key: "balanced", name: "BALANCED", ambition: "Deutlicher Physique-Fortschritt als Dauerprojekt", complexity: "mittel", monitoring: "Erweiterte Panels (Lipide, Hämatokrit, Leber, Blutdruck, Estradiol), 4–6×/Jahr", tradeoffs: "Reale Effekte auf Lipide/Hämatokrit/Fertilität — managebar, aber nur mit Daten.", underestimated: "Blutdruck und Lipidverschiebung spürt man nicht — man misst sie. Wer nicht misst, fliegt blind." },
      { key: "aggressive", name: "AGGRESSIVE", ambition: "Wettkampf-/Maximalphysique", complexity: "hoch", monitoring: "Engmaschig inkl. Kardio-Diagnostik; faktisch dauerhaftes Gesundheitsprojekt", tradeoffs: "Kumulative kardiovaskuläre Last, Fertilität, Schlaf, Psyche — hier wird Gesundheit aktiv gegen Physique getauscht.", underestimated: "Der Exit ist schwerer als der Einstieg: Achse, Erwartungen, Identität." }
    ],
    exit: "Absetzen/Zielwechsel ist ein eigenes Projekt: Achsen-Erholung dauert Monate, Fertilität länger. Wer 'irgendwann Kinder' sagt, plant das VOR dem Einstieg.",
    monitoringDomains: ["Blutdruck", "Lipide (ApoB)", "Hämatokrit", "Leber", "Niere", "Hormonachse", "Estradiol", "Fertilität", "Schlaf", "Psyche"]
  };

  /* ======================= PROGRESS INTERPRETATION ======================= */
  function interpretProgress(d) {
    // d: {weightDelta, waistDelta, strengthPct, executionPct}
    var out = [];
    var recomp = (d.weightDelta != null && Math.abs(d.weightDelta) < 1.5) && (d.waistDelta != null && d.waistDelta < -1.5) && (d.strengthPct != null && d.strengthPct > 3);
    if (recomp) out.push("Gewicht nahezu unverändert, Taille deutlich runter, Kraft rauf — dieses Muster ist konsistent mit erfolgreicher Rekomposition.");
    else {
      if (d.waistDelta != null && d.waistDelta < -2) out.push("Der Taillentrend (−" + Math.abs(d.waistDelta).toFixed(1) + " cm) spricht für realen Fettabbau.");
      if (d.strengthPct != null && d.strengthPct > 5) out.push("Kraft +" + d.strengthPct.toFixed(0) + " % — die Trainingsreize kommen an.");
      if (d.weightDelta != null && d.weightDelta > 2 && (d.waistDelta == null || d.waistDelta > 1)) out.push("Gewicht und Taille steigen zusammen — ein Teil des Aufbaus ist wahrscheinlich Fett. Kein Drama, aber ein Signal für den nächsten Block.");
    }
    if (d.executionPct != null && d.executionPct >= 80) out.push("Umsetzung " + d.executionPct + " % — Veränderungen sind damit belastbar interpretierbar.");
    if (d.executionPct != null && d.executionPct < 60) out.push("Bei " + d.executionPct + " % Umsetzung sind Rückschlüsse auf den Plan unsicher — die Daten sagen mehr über die Woche als über die Strategie.");
    if (!out.length) out.push("Noch zu wenig Daten für eine belastbare Interpretation — Trends brauchen mehrere Messpunkte.");
    return out;
  }
  // Muster-Beobachtung — bewusst korrelativ formuliert, nie kausal.
  function observePatterns(d) {
    var out = [];
    if (d.sleepConsistencyUp && d.trainingCompletionUp) out.push("Höhere Schlaf-Konstanz fiel zeitlich mit besserer Trainings-Umsetzung zusammen.");
    if (d.proteinAdherenceUp && d.strengthUp) out.push("Die Phase mit besserer Protein-Adhärenz überschnitt sich mit der Kraftprogression.");
    return out;
  }

  MM.engines = {
    transformation: transformation,
    nutritionTargets: nutritionTargets, exampleDay: exampleDay, swapMeal: swapMeal, familyPortion: familyPortion, shoppingList: shoppingList, nutritionAdjust: nutritionAdjust, MEALS: MEALS,
    buildTrainingPlan: buildTrainingPlan, progressionTarget: progressionTarget, plateauCheck: plateauCheck, EXDB: EXDB,
    stackStrategy: stackStrategy, SUPPS: SUPPS, ENHANCED_FRAMEWORK: ENHANCED_FRAMEWORK,
    interpretProgress: interpretProgress, observePatterns: observePatterns
  };
})();
