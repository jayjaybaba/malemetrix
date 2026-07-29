/* ==========================================================================
   MALEMETRIX — PROGRAMM-FRAMEWORK (öffentlich, kein bezahlter Inhalt)
   --------------------------------------------------------------------------
   Die Struktur des 12-Wochen-Systems: Tagestypen, Modi, Engpässe, Phasen,
   Wochen-Missionen, Ernährungs-Level und die Mustergenerierung.

   Warum als eigenes Modul: Diese Tabellen sind das GERÜST, nicht der bezahlte
   Inhalt. Der bezahlte Inhalt (die Wochenkapitel) liegt verschlüsselt im
   `courseVault` und wird ausschließlich in `js/course.js` nach erfolgreicher
   Freischaltung geladen. Durch die Trennung kann die öffentliche
   Produktvorschau (`vorschau.html`) mit der ECHTEN Logik arbeiten statt mit
   einem nachgebauten Mockup — ohne dass eine einzige bezahlte Zeile öffentlich
   wird. `js/course.js` nutzt exakt dieselben Tabellen; es gibt keine zweite
   Wahrheit, die auseinanderlaufen könnte.

   Alle Funktionen hier sind rein: gleiche Eingabe → gleiche Ausgabe, kein
   Zugriff auf localStorage, kein DOM.
   ========================================================================== */
(function () {
  "use strict";
  var MM = (window.MM = window.MM || {});

  var PHASE_TRAIN = {
    1: { de: "Basis & Technik: moderates Volumen, saubere Ausführung, Gewichte kennenlernen (RIR 2–3).", en: "Base & technique: moderate volume, clean form, learn your weights (RIR 2–3)." },
    2: { de: "Progression: dieselben Übungen etwas schwerer/mehr Wiederholungen (doppelte Progression, RIR 1–2).", en: "Progression: same lifts, a bit heavier/more reps (double progression, RIR 1–2)." },
    3: { de: "Produktiver Hauptblock: härtester Reiz des Programms, mode-spezifisch (RIR 0–2 bei Grundübungen).", en: "Productive main block: the program’s hardest stimulus, mode-specific (RIR 0–2 on main lifts)." },
    4: { de: "Konsolidieren & Benchmark: Leistung sichern, in Woche 12 messen — ggf. Belastung leicht zurücknehmen.", en: "Consolidate & benchmark: lock in performance, measure in week 12 — pull back load slightly if needed." }
  };
  var DAY = {
    strength: { label: { de: "STRENGTH", en: "STRENGTH" }, icon: "🏋️", tag: { de: "Kraft", en: "Strength" },
      full: { de: "45–60 Min Krafttraining. Grundübungen, saubere Technik. Progression: dieselben Gewichte wie letztes Mal — plus eine Wiederholung oder eine kleine Stufe mehr.", en: "45–60 min strength. Compound lifts, clean form. Progression: same weights as last time — plus one rep or a small increment." },
      min: { de: "20 Min Kern-Krafttraining: 3 Grundübungen (Beine, Druck, Zug), je 2 harte Sätze.", en: "20 min core strength: 3 compounds (legs, push, pull), 2 hard sets each." },
      why: { de: "Kraft erhält und baut Muskulatur — im Defizit schützt sie deine Muskeln, im Aufbau macht sie den Unterschied.", en: "Strength maintains and builds muscle — it protects muscle in a deficit and drives the build phase." } },
    engine: { label: { de: "ENGINE", en: "ENGINE" }, icon: "🚴", tag: { de: "Cardio", en: "Cardio" },
      full: { de: "35–45 Min Zone 2 (locker, du könntest reden) — Rad, zügiges Gehen, Rudern.", en: "35–45 min zone 2 (easy, you could talk) — bike, brisk walk, row." },
      min: { de: "20 Min zügiges Gehen. Zählt.", en: "20 min brisk walk. Counts." },
      why: { de: "Cardiofitness (VO₂max) ist einer der stärksten Prädiktoren für langfristige Gesundheit — nicht nur für Ausdauersportler.", en: "Cardio fitness (VO₂max) is one of the strongest predictors of long-term health — not just for endurance athletes." } },
    recover: { label: { de: "RECOVER", en: "RECOVER" }, icon: "🧘", tag: { de: "Regeneration", en: "Recovery" },
      full: { de: "Aktive Erholung: 20–30 Min leichte Bewegung + Mobility. Abends: feste Schlafzeit, Bildschirm runter, kühl & dunkel.", en: "Active recovery: 20–30 min light movement + mobility. Tonight: fixed bedtime, screens down, cool & dark." },
      min: { de: "20 Min Spaziergang + früh ins Bett.", en: "20 min walk + early to bed." },
      why: { de: "Regeneration ist der Multiplikator: schlechter Schlaf drückt Insulinsensitivität, Hunger, Training und Hormone gleichzeitig.", en: "Recovery is the multiplier: poor sleep hits insulin sensitivity, hunger, training and hormones at once." } },
    move: { label: { de: "MOVE", en: "MOVE" }, icon: "🚶", tag: { de: "Alltag", en: "Daily" },
      full: { de: "Alltagsbewegung: Schritt-Ziel treffen (Baseline + etwas mehr). Treppe statt Aufzug.", en: "Daily movement: hit your step goal (baseline + a bit more). Stairs over elevator." },
      min: { de: "Ein zügiger 15–20-Min-Spaziergang.", en: "A brisk 15–20 min walk." },
      why: { de: "Alltagsbewegung (NEAT) ist der unterschätzte Energieverbrauch-Hebel — konstanter als jede Einzeleinheit.", en: "Daily activity (NEAT) is the underrated energy-expenditure lever — steadier than any single session." } },
    mobility: { label: { de: "MOBILITY", en: "MOBILITY" }, icon: "🤸", tag: { de: "Beweglichkeit", en: "Mobility" },
      full: { de: "15–20 Min Mobility für Hüfte, Schulter, Wirbelsäule.", en: "15–20 min mobility for hips, shoulders, spine." },
      min: { de: "10 Min Mobility auf die steifste Region.", en: "10 min mobility on the stiffest area." },
      why: { de: "Beweglichkeit hält dich trainierbar und verletzungsärmer — kleiner Aufwand, große Wirkung.", en: "Mobility keeps you trainable and injury-resistant — small effort, big payoff." } },
    reset: { label: { de: "RESET", en: "RESET" }, icon: "🌿", tag: { de: "Leichter Tag", en: "Light day" },
      full: { de: "Bewusst leichter Tag: Spaziergang, Sonne, gutes Essen, früh schlafen. Teil des Plans.", en: "A deliberate light day: walk, sun, good food, early night. Part of the plan." },
      min: { de: "Ein Spaziergang. Mehr muss heute nicht sein.", en: "A walk. Nothing more needed today." },
      why: { de: "Ein geplanter leichter Tag hält dich über 12 Wochen im Spiel — kein Tag ist „verloren“.", en: "A planned light day keeps you in the game over 12 weeks — no day is “lost”." } }
  };

  var MODES = {
    cut: { label: "CUT", tag: { de: "Fett runter", en: "Lose fat" }, oneLiner: { de: "LOSE FAT. KEEP PERFORMANCE.", en: "LOSE FAT. KEEP PERFORMANCE." },
      base: ["strength", "engine", "strength", "recover", "strength", "engine", "reset"],
      priorities: { de: ["Taille & Gewichtstrend runter", "Kraft & Trainingsleistung halten", "Protein hoch", "Konstanz vor Härte"], en: ["Waist & weight trend down", "Keep strength & performance", "Protein high", "Consistency over intensity"] },
      metrics: [["waist", { de: "Bauchumfang (cm)", en: "Waist (cm)" }], ["weight", { de: "Gewicht (kg)", en: "Weight (kg)" }], ["strength", { de: "Kraft-Marker", en: "Strength marker" }]],
      win: [{ key: "strength", target: 3, label: { de: "3 Strength-Sessions", en: "3 strength sessions" } }, { key: "engine", target: 2, label: { de: "2 Engine-Einheiten", en: "2 engine sessions" } }, { key: "nutrition", target: 6, label: { de: "Protein-Ziel an 6/7 Tagen", en: "Protein goal on 6/7 days" } }, { key: "move", target: 5, label: { de: "Schritt-Ziel an 5 Tagen", en: "Step goal on 5 days" } }] },
    recomp: { label: "RECOMP", tag: { de: "Fett runter + Muskel rauf", en: "Lose fat + gain muscle" }, oneLiner: { de: "LOOK BETTER WITHOUT CHASING SCALE WEIGHT.", en: "LOOK BETTER WITHOUT CHASING SCALE WEIGHT." },
      base: ["strength", "engine", "strength", "recover", "strength", "move", "reset"],
      priorities: { de: ["Taille runter bei stabiler Waage", "Kraft nach oben", "Protein hoch", "Geduld — Recomp ist langsam sichtbar"], en: ["Waist down at stable weight", "Strength up", "Protein high", "Patience — recomp shows slowly"] },
      metrics: [["waist", { de: "Bauchumfang (cm)", en: "Waist (cm)" }], ["strength", { de: "Kraft-Marker", en: "Strength marker" }], ["weight", { de: "Gewicht (kg, Kontext)", en: "Weight (kg, context)" }]],
      win: [{ key: "strength", target: 3, label: { de: "3 Strength-Sessions", en: "3 strength sessions" } }, { key: "engine", target: 2, label: { de: "1–2 Engine-Einheiten", en: "1–2 engine sessions" } }, { key: "nutrition", target: 6, label: { de: "Protein-Ziel an 6/7 Tagen", en: "Protein goal on 6/7 days" } }, { key: "recover", target: 5, label: { de: "Schlaf-Fenster an 5 Nächten", en: "Sleep window on 5 nights" } }] },
    build: { label: "BUILD", tag: { de: "Muskel & Kraft", en: "Muscle & strength" }, oneLiner: { de: "BUILD MUSCLE. CONTROL FAT GAIN.", en: "BUILD MUSCLE. CONTROL FAT GAIN." },
      base: ["strength", "engine", "strength", "recover", "strength", "strength", "reset"],
      priorities: { de: ["Kraftprogression", "Trainingsqualität & Volumen", "Kleiner Überschuss — lean, kein Bulk", "Taille als Guardrail"], en: ["Strength progression", "Training quality & volume", "Small surplus — lean, no bulk", "Waist as a guardrail"] },
      metrics: [["strength", { de: "Kraft-Marker", en: "Strength marker" }], ["weight", { de: "Gewicht (kg)", en: "Weight (kg)" }], ["waist", { de: "Bauchumfang (cm, Guardrail)", en: "Waist (cm, guardrail)" }]],
      win: [{ key: "strength", target: 4, label: { de: "4 Strength-Sessions", en: "4 strength sessions" } }, { key: "engine", target: 1, label: { de: "1 Engine-Einheit (Recovery erhalten)", en: "1 engine session (protect recovery)" } }, { key: "nutrition", target: 6, label: { de: "Protein + Überschuss getroffen", en: "Protein + surplus hit" } }, { key: "recover", target: 5, label: { de: "Schlaf an 5 Nächten (Wachstum)", en: "Sleep on 5 nights (growth)" } }] },
    perform: { label: "PERFORM", tag: { de: "Stärker + größerer Motor", en: "Stronger + bigger engine" }, oneLiner: { de: "BUILD A STRONGER BODY AND A BIGGER ENGINE.", en: "BUILD A STRONGER BODY AND A BIGGER ENGINE." },
      base: ["strength", "engine", "strength", "recover", "engine", "strength", "reset"],
      priorities: { de: ["Kraft UND Cardiofitness gleichzeitig", "Belastbarkeit & Energie", "Recovery schützen", "Gesundheitsmarker im Blick"], en: ["Strength AND cardio fitness together", "Work capacity & energy", "Protect recovery", "Watch health markers"] },
      metrics: [["strength", { de: "Kraft-Marker", en: "Strength marker" }], ["cardio", { de: "Cardio-Marker (z. B. 5-km-Zeit)", en: "Cardio marker (e.g. 5k time)" }], ["energy", { de: "Energie (1–10)", en: "Energy (1–10)" }]],
      win: [{ key: "strength", target: 3, label: { de: "3 Strength-Sessions", en: "3 strength sessions" } }, { key: "engine", target: 3, label: { de: "2–3 Engine-Einheiten", en: "2–3 engine sessions" } }, { key: "recover", target: 5, label: { de: "Schlaf an 5 Nächten", en: "Sleep on 5 nights" } }, { key: "move", target: 5, label: { de: "Schritt-Ziel an 5 Tagen", en: "Step goal on 5 days" } }] }
  };
  var MODE_ORDER = ["cut", "recomp", "build", "perform"];

  var BOTTLENECKS = {
    recovery: { label: "RECOVERY", why: { de: "Schlaf & Erholung sind deine größte Lücke — sie ziehen Training, Hunger und Hormone mit nach unten.", en: "Sleep & recovery are your biggest gap — they drag training, hunger and hormones down." }, focus: { de: "Stabilisiere zuerst deine Recovery, bevor die Trainingsbelastung aggressiver steigt.", en: "Stabilize recovery first before ramping training load." } },
    engine: { label: "ENGINE", why: { de: "Deine Cardiofitness/Bewegung ist der schwächste Knoten — hier liegt der größte Gesundheits-Hebel.", en: "Your cardio fitness/movement is the weakest node — the biggest health lever." }, focus: { de: "Baue systematisch deinen aeroben Motor auf — konstante Zone-2-Einheiten.", en: "Build your aerobic engine systematically — steady zone-2 sessions." } },
    body: { label: "BODY", why: { de: "Körperzusammensetzung/Taille ist dein Hauptthema — daran hängen Stoffwechsel und Risiko.", en: "Body composition/waist is your main issue — metabolism and risk hang on it." }, focus: { de: "Fokus auf Taille & Körperfett bei geschützter Muskulatur — nicht die Waage jagen.", en: "Focus on waist & body fat with protected muscle — don’t chase the scale." } },
    metabolic: { label: "METABOLIC", why: { de: "Deine Ernährungs-/Stoffwechselbasis ist der Engpass — Protein, Struktur und Bewegung ziehen am meisten.", en: "Your nutrition/metabolic base is the bottleneck — protein, structure and movement move the needle." }, focus: { de: "Erst Ernährungsstruktur und Bewegung stabilisieren — hier entsteht die Basis.", en: "Stabilize nutrition structure and movement first — this is the base." } },
    strength: { label: "STRENGTH", why: { de: "Kraft & Muskelmasse sind dein schwächster Bereich — funktionelle Reserve und Stoffwechsel profitieren am meisten.", en: "Strength & muscle are your weakest area — functional reserve and metabolism gain most." }, focus: { de: "Progressive Kraftentwicklung hat Priorität — sauberes Training, echte Progression.", en: "Progressive strength has priority — clean training, real progression." } },
    lifestyle: { label: "LIFESTYLE", why: { de: "Nicht das Wissen fehlt, sondern die konstante Umsetzung im Alltag — das ist der Hebel.", en: "It’s not knowledge that’s missing but consistent execution — that’s the lever." }, focus: { de: "Baue ein System, das deinen Alltag überlebt: feste Zeiten, Minimum Days, Nie-Null.", en: "Build a system that survives daily life: fixed times, minimum days, never-zero." } },
    medical: { label: "MEDICAL CHECK", why: { de: "Einige Angaben deuten darauf hin, dass zuerst eine ärztliche Abklärung sinnvoll sein könnte.", en: "Some inputs suggest a medical check-up may be sensible first." }, focus: { de: "Kläre relevante Warnzeichen ärztlich ab, bevor du die Belastung hochfährst — das Programm läuft parallel auf dem Fundament weiter.", en: "Get relevant warning signs checked medically before ramping load — the program continues on the fundamentals meanwhile." } }
  };
  var BN_ORDER = ["recovery", "engine", "body", "strength", "metabolic", "lifestyle"];
  var SCORE_MAP = { recovery: "recovery", body: "body", strength: "strength", fuel: "metabolic", blood: "metabolic", drive: "recovery", execution: "lifestyle" };

  var PHASES = [
    { key: 1, name: { de: "BUILD THE BASE", en: "BUILD THE BASE" }, weeks: [1, 3], feel: { de: "Ich bekomme mein System unter Kontrolle.", en: "I’m getting my system under control." } },
    { key: 2, name: { de: "BUILD CAPACITY", en: "BUILD CAPACITY" }, weeks: [4, 6], feel: { de: "Ich werde leistungsfähiger.", en: "I’m getting more capable." } },
    { key: 3, name: { de: "PUSH PERFORMANCE", en: "PUSH PERFORMANCE" }, weeks: [7, 9], feel: { de: "Jetzt passiert sichtbar etwas.", en: "Now it’s visibly happening." } },
    { key: 4, name: { de: "LOCK IT IN", en: "LOCK IT IN" }, weeks: [10, 12], feel: { de: "Ich konsolidiere und messe, was sich verändert hat.", en: "I consolidate and measure what changed." } }
  ];
  var MISSIONS = { 1: "CONTROL YOUR ENVIRONMENT", 2: "BUILD CONSISTENCY", 3: "MASTER THE BASICS", 4: "START PROGRESSING", 5: "BUILD YOUR ENGINE", 6: "HALFWAY CHECK", 7: "PUSH THE STIMULUS", 8: "SHARPEN EXECUTION", 9: "PEAK THE BLOCK", 10: "CONSOLIDATE", 11: "STABILIZE HABITS", 12: "REVIEW · BENCHMARK · NEXT MOVE" };

  var NUTRI = {
    simple: { label: { de: "SIMPLE — kein Zählen", en: "SIMPLE — no counting" },
      card: { de: "Protein bei jeder Mahlzeit (Hand voll), 2 Standardmahlzeiten, wenig Flüssigkalorien. Kein Kalorienzählen.", en: "Protein each meal (a palm), 2 standard meals, few liquid calories. No calorie counting." },
      pulse: [["protein", { de: "Protein-Ziel getroffen? (Tage 0–7)", en: "Protein goal hit? (days 0–7)" }]] },
    tracked: { label: { de: "TRACKED — Kalorien & Protein", en: "TRACKED — calories & protein" },
      card: { de: "Protein + Kalorienkorridor tracken. Kurz, ehrlich — nicht zwanghaft.", en: "Track protein + a calorie corridor. Brief, honest — not obsessive." },
      pulse: [["kcal", { de: "Ø Kalorien / Tag", en: "Avg calories / day" }], ["protein", { de: "Protein-Ziel getroffen? (Tage)", en: "Protein goal hit? (days)" }]] },
    precision: { label: { de: "PRECISION — für Fortgeschrittene", en: "PRECISION — advanced" },
      card: { de: "Kalorien, Protein, optional Makros. Anpassung an Gewichts-/Taillentrend — keine Pseudo-Präzision.", en: "Calories, protein, optional macros. Adjust to weight/waist trend — no pseudo-precision." },
      pulse: [["kcal", { de: "Ø Kalorien / Tag", en: "Avg calories / day" }], ["protein", { de: "Protein Ø g/Tag", en: "Protein avg g/day" }], ["macro", { de: "Makro-Notiz (optional)", en: "Macro note (optional)" }]] }
  };


  /* -------------------------------------------------------------------------
     MUSTERGENERIERUNG (rein — Zustand kommt als Parameter herein)
     ------------------------------------------------------------------------- */
  function phaseOf(week) {
    for (var i = 0; i < PHASES.length; i++) if (week >= PHASES[i].weeks[0] && week <= PHASES[i].weeks[1]) return PHASES[i];
    return PHASES[0];
  }

  /* Wochentagsbasiertes Muster: gewählte Wochentage = strength, Rest je Modus.
     startWeekday außerhalb 0..6 (kein Startdatum gesetzt) ⇒ kein Tag trifft,
     das Muster fällt auf die Füllreihenfolge zurück. */
  function buildWeekdayPattern(mode, week, strengthWeekdays, startWeekday) {
    var valid = (typeof startWeekday === "number" && isFinite(startWeekday) && startWeekday >= 0 && startWeekday <= 6);
    var sd = Array.isArray(strengthWeekdays) ? strengthWeekdays : [];
    var p = [];
    for (var pos = 0; pos < 7; pos++) {
      var wd = valid ? (startWeekday + pos) % 7 : -1;
      p.push(sd.indexOf(wd) >= 0 ? "strength" : null);
    }
    var fillOrder = mode === "perform" ? ["engine", "recover", "engine", "move", "reset"]
      : mode === "build" ? ["recover", "engine", "move", "reset", "reset"]
      : mode === "cut" ? ["engine", "recover", "engine", "move", "reset"]
      : ["engine", "recover", "move", "reset", "engine"];
    var fi = 0;
    for (var i = 0; i < 7; i++) { if (p[i] === null) { p[i] = fillOrder[fi % fillOrder.length]; fi++; } }
    return p;
  }

  /* P6 + P8 — Modus × Engpass × Phase × verfügbare Krafttage → 7-Tage-Muster.
     opts: { strengthWeekdays: [0..6] | null, startWeekday: 0..6 } */
  function patternFor(mode, week, bn, opts) {
    var m = MODES[mode] || MODES.recomp;
    var b = BOTTLENECKS[bn] ? bn : "recovery";
    var o = opts || {};
    var sd = Array.isArray(o.strengthWeekdays) ? o.strengthWeekdays : null;
    var p = sd ? buildWeekdayPattern(mode, week, sd, o.startWeekday) : m.base.slice();

    // Bottleneck-Modulation über ALLE Phasen (P6)
    var strengthIdx = []; p.forEach(function (x, i) { if (x === "strength") strengthIdx.push(i); });
    if (b === "recovery") {
      if (week <= 6) { // mehr Erholung früh
        var repl = ["engine", "move", "mobility"]; for (var i = 0; i < p.length; i++) { if (repl.indexOf(p[i]) >= 0) { p[i] = "recover"; break; } }
        if (week <= 3 && strengthIdx.length > 3) p[strengthIdx[strengthIdx.length - 1]] = "recover"; // dosiert Volumen
      }
    } else if (b === "engine") {
      for (var j = 0; j < p.length; j++) { if (p[j] === "reset" || p[j] === "move") { p[j] = "engine"; break; } }
    } else if (b === "lifestyle") {
      if (week <= 3 && strengthIdx.length > 3) p[strengthIdx[strengthIdx.length - 1]] = "move";
    } else if (b === "body" || b === "metabolic") {
      for (var k = 0; k < p.length; k++) { if (p[k] === "reset") { p[k] = "move"; break; } }
    }
    // CUT + RECOVERY: kein aggressives Cardio-Hochskalieren
    if (mode === "cut" && b === "recovery") { for (var q = 0; q < p.length; q++) { if (p[q] === "engine" && q > 0 && p[q - 1] === "engine") p[q] = "recover"; } }
    return p;
  }

  MM.programFramework = {
    PHASE_TRAIN: PHASE_TRAIN, DAY: DAY, MODES: MODES, MODE_ORDER: MODE_ORDER,
    BOTTLENECKS: BOTTLENECKS, BN_ORDER: BN_ORDER, SCORE_MAP: SCORE_MAP,
    PHASES: PHASES, MISSIONS: MISSIONS, NUTRI: NUTRI,
    phaseOf: phaseOf, patternFor: patternFor, buildWeekdayPattern: buildWeekdayPattern
  };
})();
