/* ==========================================================================
   MALEMETRIX INTELLIGENCE — SCENARIO SIMULATOR + FORECAST
   (MM.intelligence.simulator / MM.intelligence.forecast)
   --------------------------------------------------------------------------
   „WHAT IF?“ (§53–57) — KEIN Fake-Zukunftsvorhersager. Ein Szenario-VERGLEICH:
   Richtung, Zeit-RANGE, Trade-offs, Confidence, „was müsste wahr sein“.
   Nie Fake-Präzision (§56): niemals „du wiegst 88,4 kg“, sondern Spannen +
   explizite Annahmen (§57).

   FORECAST (§58–60): Trajektorien-BAND aus Modus + Trainingsalter, KALIBRIERT
   an der beobachteten persönlichen Reaktion. Expected-vs-Actual (§60).
   GOAL FEASIBILITY (§61/62): Ziel vs. Realität, mit Verhandlungsoptionen.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var I = MM.intelligence = MM.intelligence || {};
  function EN() { return MM.engines; }
  function round(v, dp) { return I.util.round(v, dp); }
  function rng(a, b) { return [Math.min(a, b), Math.max(a, b)]; }

  /* Monatliche Muskelaufbau-Range (% KG/Monat) — dieselbe ehrliche Basis wie
     die Transformation-Engine, hier für Szenarien wiederverwendet. */
  var GAIN = { beginner: [0.5, 1.3], novice: [0.4, 1.0], intermediate: [0.2, 0.6], advanced: [0.1, 0.35] };
  function experience(ctx) { return (MM.os && MM.os.getP("training.experience", null)) || "novice"; }

  /* Persönliche Kalibrierung: beobachtete Gewichtsreaktion/Woche aus Trend. */
  function observedWeeklyKg(ctx) { return ctx.body.weightTrend15 != null ? ctx.body.weightTrend15 : null; }

  /* =======================================================================
     SIMULATOR — Katalog von Szenarien. Jedes liefert Optionen mit
     {label, direction, timeRange, tradeoffs[], confidence, needsTrue[]}.
     ======================================================================= */
  var SCENARIOS = {
    training_days: function (ctx, p) {
      var cur = ctx.training.daysPerWeek || 3;
      return {
        question: (p && p.a || 3) + " vs " + (p && p.b || 4) + " Trainingstage",
        current: { label: cur + " Tage (aktuell)", direction: "Referenz", timeRange: "—", tradeoffs: [], confidence: "high", needsTrue: [] },
        options: [
          { label: "3 Tage", direction: "solider Aufbau, mehr Erholung", timeRange: "etwas langsamer als 4 Tage", tradeoffs: ["weniger Wochenvolumen", "leichter erholbar", "robuster bei Bürojob/Stress"], confidence: "medium", needsTrue: ["jede Einheit progressiv", "Protein trifft Ziel"] },
          { label: "4 Tage", direction: "mehr Wochenvolumen → potenziell mehr Wachstum", timeRange: "geringfügig schneller — WENN erholt", tradeoffs: ["höherer Erholungsbedarf", "empfindlicher gegen schlechten Schlaf"], confidence: "medium", needsTrue: ["Schlaf 7h+", "keine chronische Stressphase"] }
        ],
        note: ctx.recovery.lastSleepQuality === "schlecht" ? "Bei aktuell schwachem Schlaf würde 4 Tage den Recovery-Engpass verschärfen — 3 gut umgesetzte Tage schlagen 4 halbe." : "Der Unterschied ist kleiner als die Umsetzung. Wähle, was du konstant durchhältst."
      };
    },
    calories_plus: function (ctx, p) {
      var delta = (p && p.kcal) || 200;
      var obs = observedWeeklyKg(ctx);
      var priorNutri = I.memory ? I.memory.priorResponses("nutrition") : [];
      var opts = [
        { label: "Energie gleich lassen", direction: "aktueller Trend hält an" + (obs != null ? " (" + (obs > 0 ? "+" : "") + round(obs) + " kg/Wo)" : ""), timeRange: "—", tradeoffs: [], confidence: obs != null ? "medium" : "low", needsTrue: [] },
        { label: "+" + delta + " kcal/Tag", direction: ctx.goal.mode === "cut" ? "Abbau verlangsamt sich / stoppt" : "Gewicht steigt eher, mehr Baumaterial", timeRange: "sichtbar über ~2–3 Wochen (Trend, nicht Tage)", tradeoffs: ["mehr Aufbau-Potenzial", "Risiko: Taille steigt mit, wenn Überschuss zu groß"], confidence: "medium", needsTrue: ["Taille im Blick", "Training progressiv"] }
      ];
      if (priorNutri.length) { var last = priorNutri[priorNutri.length - 1]; if (last.observed) opts[1].tradeoffs.push("dein beobachtetes Muster: zuletzt Gewicht " + signed(last.observed.weightDelta) + " kg, Taille " + signed(last.observed.waistDelta) + " cm"); }
      return { question: "+" + delta + " kcal/Tag", current: opts[0], options: [opts[1]], note: "Ranges unter der Annahme, dass du EINE Variable änderst (nur Kalorien)." };
    },
    cut_first: function (ctx) {
      var bf = ctx.body.bf;
      return {
        question: "Erst cutten, dann aufbauen?",
        current: { label: "direkt aufbauen", direction: "schneller mehr Masse, aber auf höherem KFA mehr Fett mit", timeRange: "—", tradeoffs: [], confidence: "medium", needsTrue: [] },
        options: [
          { label: "erst Mini-Cut (6–10 Wo)", direction: "startet den Aufbau auf besserer Basis", timeRange: "verzögert Aufbau um ~2 Monate, verlängert dann produktive Aufbauzeit", tradeoffs: ["kurzfristig kein Massezuwachs", "besseres P-Ratio danach", "Taille/Ästhetik früher sichtbar"], confidence: bf != null && bf >= 18 ? "high" : "medium", needsTrue: ["Kraft im Defizit halten"] }
        ],
        note: bf != null ? (bf >= 20 ? "Bei ~" + bf + "% KFA spricht viel für einen Cut zuerst." : bf <= 12 ? "Bei ~" + bf + "% KFA ist ein Cut zuerst meist unnötig — du kannst aufbauen." : "Bei ~" + bf + "% KFA ist beides vertretbar.") : "Ohne KFA-Schätzung bleibt das eine Richtungsaussage — eine Schätzung würde sie schärfen."
      };
    },
    time_crunch: function (ctx, p) {
      var mins = (p && p.minutes) || 30;
      return {
        question: "Nur " + mins + " Minuten/Tag",
        current: { label: "volle Sessions", direction: "Referenz", timeRange: "—", tradeoffs: [], confidence: "high", needsTrue: [] },
        options: [
          { label: mins + "-Min-Fokus", direction: "Hauptübungen erhalten den Großteil des Reizes", timeRange: "Fortschritt bleibt weitgehend erhalten", tradeoffs: ["Akzessoire/Volumen reduziert", "weniger Pump-Arbeit", "Progression auf Grundübungen bleibt"], confidence: "medium", needsTrue: ["Grundübungen priorisiert", "Protein trifft Ziel"] }
        ],
        note: "Kürzere, fokussierte Einheiten sind weit besser als ausgelassene — kein Programmabbruch nötig."
      };
    },
    travel: function (ctx, p) {
      var days = (p && p.days) || 10;
      return {
        question: days + " Tage Reise",
        current: { label: "Normalbetrieb", direction: "Referenz", timeRange: "—", tradeoffs: [], confidence: "high", needsTrue: [] },
        options: [
          { label: "Reise-Overlay", direction: "Erhaltung statt Aufbau — temporär", timeRange: days + " Tage, danach zurück zum Plan", tradeoffs: ["Hotel-Gym/Bodyweight erhält Kraft", "Schritte + Protein als Anker", "keine PRs erwartet"], confidence: "high", needsTrue: ["2–3 kurze Einheiten", "Protein grob halten"] }
        ],
        note: "Erhaltung ist das Ziel — das Programm wird pausiert, nicht abgebrochen (kein Datenverlust)."
      };
    }
  };
  function simulate(scenarioKey, params, ctx) {
    ctx = ctx || I.buildContext();
    var fn = SCENARIOS[scenarioKey]; if (!fn) return null;
    var r = fn(ctx, params || {});
    r.key = scenarioKey; r.assumptions = assumptions(ctx);
    return r;
  }
  function listScenarios() { return Object.keys(SCENARIOS).map(function (k) { return { key: k, label: SCEN_LABELS[k] || k }; }); }
  var SCEN_LABELS = { training_days: "3 vs 4 Trainingstage", calories_plus: "Mehr essen (+kcal)", cut_first: "Erst cutten oder aufbauen?", time_crunch: "Wenig Zeit (30 Min)", travel: "Reise-Szenario" };

  /* ASSUMPTION PANEL (§57) — explizite Annahmen jeder Simulation. */
  function assumptions(ctx) {
    return [
      { text: (ctx.execution.consistency != null ? ctx.execution.consistency + "%" : "~90%") + " Trainings-Adhärenz", holds: ctx.execution.consistency == null || ctx.execution.consistency >= 80 },
      { text: "Protein-Ziel getroffen", holds: true },
      { text: "Schlaf stabil", holds: !(ctx.recovery.lastSleepQuality === "schlecht") },
      { text: "keine große Unterbrechung", holds: ctx.contextMode === "normal" }
    ];
  }

  /* =======================================================================
     FORECAST — Trajektorien-Band, kalibriert (§58–60).
     ======================================================================= */
  function forecast(ctx, weeks) {
    ctx = ctx || I.buildContext();
    weeks = weeks || 12;
    var exp = experience(ctx);
    var w = ctx.body.weight;
    var mode = ctx.goal.mode;
    // generische Wochen-Range (kg/Woche) aus Modus + Trainingsalter.
    var monthlyPctRange = GAIN[exp] || GAIN.novice;
    var genWeekly;
    if (mode === "build") genWeekly = rng(w ? w * monthlyPctRange[0] / 100 / 4 : 0.1, w ? w * monthlyPctRange[1] / 100 / 4 : 0.35);
    else if (mode === "cut") genWeekly = [-0.9, -0.4];
    else if (mode === "recomp") genWeekly = [-0.2, 0.1];
    else genWeekly = [-0.1, 0.2];
    // KALIBRIERUNG: beobachtete Reaktion zieht das Band in Richtung Realität.
    var obs = observedWeeklyKg(ctx);
    var calibrated = genWeekly.slice(), calibratedNote = "generisches Band (noch keine persönliche Kalibrierung)";
    if (obs != null && ctx.body.points >= 3) {
      // Band Richtung Beobachtung verschieben (Mittelwert 60% Beobachtung / 40% generisch).
      var mid = (genWeekly[0] + genWeekly[1]) / 2;
      var newMid = mid * 0.4 + obs * 0.6;
      var halfWidth = (genWeekly[1] - genWeekly[0]) / 2;
      calibrated = [round(newMid - halfWidth, 2), round(newMid + halfWidth, 2)];
      calibratedNote = "kalibriert an deiner beobachteten Reaktion (" + signed(obs) + " kg/Woche)";
    }
    var band = { startWeight: w, weekly: calibrated, weeks: weeks, endRange: w != null ? [round(w + calibrated[0] * weeks, 1), round(w + calibrated[1] * weeks, 1)] : null, note: calibratedNote };
    return { mode: mode, experience: exp, band: band, expectedVsActual: I.review ? I.review.expectedVsActual(ctx) : null };
  }

  /* GOAL FEASIBILITY (§61/62) */
  function goalFeasibility(input, ctx) {
    ctx = ctx || I.buildContext();
    // input: {targetWeightKg, targetBf, months} — nutzt Transformation-Engine.
    var w = ctx.body.weight || input.currentWeightKg;
    if (!w || !input.targetWeightKg) return { ok: false, code: "need_weights" };
    var exp = experience(ctx);
    var res = EN() && EN().transformation ? EN().transformation({ weightKg: w, bfPct: ctx.body.bf, heightCm: ctx.identity.height || 180, experience: exp, targetWeightKg: input.targetWeightKg, targetLeanness: input.targetLeanness || "leaner", months: input.months || 12 }) : null;
    if (!res) return { ok: false, code: "engine_unavailable" };
    var wantGain = input.targetWeightKg - w;
    // Verhandlungsoptionen (§62): fastest realistic / balanced / conservative.
    var options = [];
    if (wantGain > 0) {
      options = [
        { key: "fastest", label: "SCHNELLSTES REALISTISCH", detail: "+" + res.gainRange.aggr + " kg Muskel in " + res.months + " Mon. — obere Kante, akzeptiert etwas mehr Fett." },
        { key: "balanced", label: "AUSGEWOGEN", detail: "+" + res.gainRange.likely + " kg — der wahrscheinliche, saubere Weg." },
        { key: "conservative", label: "KONSERVATIV", detail: "+" + res.gainRange.cons + " kg — maximal schlank bleiben, langsamer." }
      ];
    }
    return { ok: true, feasible: res.feasible, reality: res.reality, gainRange: res.gainRange, phases: res.phases, options: options, wantGain: round(wantGain, 1) };
  }

  function signed(v) { return v == null ? "—" : (v > 0 ? "+" : "") + round(v, 1); }

  I.simulator = { simulate: simulate, listScenarios: listScenarios, SCENARIOS: SCEN_LABELS, assumptions: assumptions };
  I.forecast = { forecast: forecast, goalFeasibility: goalFeasibility };
})();
