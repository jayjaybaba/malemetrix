/* ==========================================================================
   MaleMetrix Generation 2 — Entscheidungsschicht (PUR: kein DOM, kein Storage)

   WARUM ES DIESE DATEI GIBT
   Bis hierher konnte MaleMetrix einmal pro Woche entscheiden (weekly-check.js)
   — und zwar aus SELBSTAUSKUNFT („Ernährung: gut/mittel/schlecht"). Gleich-
   zeitig lag im Tagesprotokoll die gemessene Ausführung ungenutzt herum.
   Ein System, das Daten sammelt und daraus keine Entscheidung ableitet, ist
   ein Tracker. Diese Datei macht daraus eine Steuerung.

   VIER REINE FUNKTIONEN, EINE VERANTWORTUNG JE FUNKTION
     executionScore(...)     Wie gut wird der Plan ausgeführt? (gemessen)
     trajectory(...)         Wohin führt das aktuelle Verhalten?
     dailyPrescription(...)  Was ist HEUTE zu tun — und warum?
     reviewIntervention(...) Hat die letzte Maßnahme gewirkt?

   DIE VIER LEITSAETZE, DIE HIER IN CODE STEHEN
   1. Ergebnis und Ausführung sind zwei verschiedene Dinge. Wer den Plan zu
      55 % ausführt, hat kein Planproblem.
   2. Ein schlechter Tag ist Rauschen. Zwei sind ein Muster („never miss
      twice"). Erst das Muster loest etwas aus.
   3. Nach einem Ausfall wird nichts nachgeholt und nichts bestraft — es wird
      wieder eingestiegen. Kompensation ist der haeufigste Abbruchgrund.
   4. Es wird immer nur EINE Stellschraube gleichzeitig bewegt. Sonst weiss
      hinterher niemand, was gewirkt hat.

   Alles hier ist deterministisch. Gleicher Zustand -> gleiche Entscheidung.
   Kein KI-Aufruf, keine Zufallszahl, keine Uhrzeitabhaengigkeit ausser dem
   uebergebenen Datum.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./plan-model.js"));
  } else {
    root.MMSimple = root.MMSimple || {};
    root.MMSimple.decide = factory(root.MMSimple.model);
  }
})(typeof self !== "undefined" ? self : this, function (model) {
  "use strict";

  var L = model.LIMITS;

  /* ================= Hilfen ================= */
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function pct(done, planned) { return planned <= 0 ? null : clamp(Math.round(done / planned * 100), 0, 100); }
  function isWorkoutDay(plan, ymd) {
    var wd = new Date(ymd + "T12:00:00").getDay();
    return (plan.training.weekdays || []).indexOf(wd) >= 0;
  }

  /* Alle Tage von `from` bis `to` (beide inklusive), aufsteigend. */
  function dayRange(from, to) {
    var out = [], d = from;
    for (var i = 0; i < 400 && d <= to; i++) { out.push(d); d = model.addDays(d, 1); }
    return out;
  }

  /* ================= 1 · EXECUTION SCORE =================
     Misst NUR, was der Nutzer beeinflussen kann — nicht, was sein Koerper
     tut. Genau diese Trennung verhindert den haeufigsten Denkfehler:
     „Der Plan funktioniert nicht" bei 55 % Umsetzung.

     Quelle ist das Tagesprotokoll (gemessen), nicht die Selbstauskunft im
     Wochencheck. Wo Apple Health Schritte liefert, zaehlt die Messung statt
     des Haekchens.

     Bewusst NICHT im Score: Gewicht, Taille, Kalorienverbrauch. Das sind
     Ergebnisse. */
  var EXEC_WEIGHTS = { training: 0.40, nutrition: 0.30, steps: 0.20, weighIn: 0.10 };

  /**
   * @param {object} plan
   * @param {object} daylog   { "YYYY-MM-DD": { tasks:{}, workout, closed } }
   * @param {string} todayYmd
   * @param {object} [opts]   { days=14, weights=[], stepsByDay={} }
   */
  function executionScore(plan, daylog, todayYmd, opts) {
    opts = opts || {};
    var days = opts.days || 14;
    var stepsByDay = opts.stepsByDay || {};
    var weights = opts.weights || [];
    daylog = daylog || {};

    // Der heutige Tag zaehlt nicht mit: er ist noch nicht vorbei und wuerde
    // den Schnitt jeden Morgen kuenstlich druecken.
    var last = model.addDays(todayYmd, -1);
    var first = model.addDays(todayYmd, -days);
    var start = plan.startDate && plan.startDate > first ? plan.startDate : first;
    if (start > last) {
      return { score: null, days: 0, training: null, nutrition: null, steps: null,
               weighIn: null, reason: "zu_kurz" };
    }

    var range = dayRange(start, last);
    var tPlanned = 0, tDone = 0, nPlanned = 0, nDone = 0;
    var sPlanned = 0, sDone = 0, wPlanned = 0, wDone = 0;
    var weighDays = plan.dailyTargets.weighInWeekdays || [];
    var weightDates = {};
    weights.forEach(function (w) { if (w && w.date) weightDates[w.date] = true; });

    range.forEach(function (ymd) {
      var e = daylog[ymd] || { tasks: {} };
      var tasks = e.tasks || {};

      if (isWorkoutDay(plan, ymd)) { tPlanned++; if (tasks.training) tDone++; }

      nPlanned++;
      if (tasks.protein) nDone++;

      sPlanned++;
      var measured = stepsByDay[ymd];
      if (typeof measured === "number") {
        // Gemessen schlaegt Haekchen: das Ziel gilt ab 90 % als erfuellt,
        // weil ein Schrittziel keine Pruefungsaufgabe ist.
        if (measured >= (plan.dailyTargets.steps || 0) * 0.9) sDone++;
      } else if (tasks.steps) sDone++;

      var wd = new Date(ymd + "T12:00:00").getDay();
      if (weighDays.indexOf(wd) >= 0) { wPlanned++; if (weightDates[ymd]) wDone++; }
    });

    var parts = {
      training: pct(tDone, tPlanned),
      nutrition: pct(nDone, nPlanned),
      steps: pct(sDone, sPlanned),
      weighIn: pct(wDone, wPlanned)
    };

    // Gewichtete Summe ueber die Teile, die es in diesem Zeitraum gab.
    var sum = 0, weight = 0;
    Object.keys(EXEC_WEIGHTS).forEach(function (k) {
      if (parts[k] == null) return;
      sum += parts[k] * EXEC_WEIGHTS[k];
      weight += EXEC_WEIGHTS[k];
    });

    return {
      score: weight > 0 ? Math.round(sum / weight) : null,
      days: range.length,
      training: parts.training, nutrition: parts.nutrition,
      steps: parts.steps, weighIn: parts.weighIn,
      trainingPlanned: tPlanned, trainingDone: tDone,
      reason: null
    };
  }

  /* Schwellen, an denen sich Entscheidungen aendern. Bewusst grob: eine
     Grenze bei 70 und eine bei 85 reicht: darunter ist Ausfuehrung das
     Problem, darueber der Plan. */
  var EXEC = { poor: 70, good: 85 };

  /* ================= 2 · TRAJECTORY =================
     Wohin fuehrt das aktuelle Verhalten? Rechnet NICHT mit der geplanten
     Rate, sondern mit der tatsaechlich gemessenen — sonst waere es eine
     Wiederholung des Plans statt einer Vorhersage.

     Gibt bewusst null zurueck, solange die Datenlage duenn ist. Eine
     Prognose aus drei Wiegungen ist eine Zahl, die Vertrauen zerstoert. */
  function trajectory(plan, weightTrend, todayYmd, execution) {
    var st = plan.selectedTransformation || {}, pg = plan.phaseGoal || {};
    if (!weightTrend || st.startWeightKg == null || st.finalTargetWeightKg == null) return null;

    var actualRate = weightTrend.deltaPerWeek;           // kg/Woche, negativ = Abnahme
    var current = weightTrend.thisWeekAvg;
    var goal = st.finalTargetWeightKg;
    var remaining = goal - current;                       // negativ = noch abzunehmen
    var cut = plan.derived ? plan.derived.cut : goal < st.startWeightKg;

    var plannedMid = (pg.week12TargetMinKg + pg.week12TargetMaxKg) / 2;
    var plannedRate = (plannedMid - st.startWeightKg) / (pg.durationWeeks || 12);

    var out = {
      currentKg: current,
      actualRatePerWeek: Math.round(actualRate * 100) / 100,
      plannedRatePerWeek: Math.round(plannedRate * 100) / 100,
      executionScore: execution && execution.score != null ? execution.score : null,
      goalKg: goal,
      projectedDate: null, weeksRemaining: null, daysVsPlan: null,
      week12ProjectionKg: null,
      status: null                 // ahead | on_track | behind | wrong_direction | stalled
    };

    // Projektion fuer das Phasenziel: wo steht der Nutzer in Woche 12?
    var dayNo = Math.max(1, Math.round((Date.parse(todayYmd) - Date.parse(plan.startDate)) / 86400000) + 1);
    var weeksLeftInPhase = Math.max(0, ((pg.durationWeeks || 12) * 7 - dayNo) / 7);
    out.week12ProjectionKg = Math.round((current + actualRate * weeksLeftInPhase) * 10) / 10;

    // Richtung: bewegt sich ueberhaupt etwas, und in welche Richtung?
    var movingRight = cut ? actualRate < -0.05 : actualRate > 0.05;
    if (!movingRight) {
      out.status = (cut ? actualRate > 0.05 : actualRate < -0.05) ? "wrong_direction" : "stalled";
      return out;                 // ohne Bewegung gibt es kein seriöses Datum
    }

    var weeks = Math.abs(remaining / actualRate);
    if (!isFinite(weeks) || weeks > 260) return out;      // > 5 Jahre: keine Aussage
    out.weeksRemaining = Math.round(weeks * 10) / 10;
    out.projectedDate = model.addDays(todayYmd, Math.round(weeks * 7));

    // Vergleich mit dem Plan: wie viele Tage frueher/spaeter als geplant?
    if (plannedRate !== 0) {
      var plannedWeeks = Math.abs(remaining / plannedRate);
      if (isFinite(plannedWeeks)) out.daysVsPlan = Math.round((plannedWeeks - weeks) * 7);
    }
    if (out.daysVsPlan == null) out.status = "on_track";
    else if (out.daysVsPlan >= 7) out.status = "ahead";
    else if (out.daysVsPlan <= -7) out.status = "behind";
    else out.status = "on_track";
    return out;
  }

  /* ================= 3 · DAILY PRESCRIPTION =================
     Der Kern. Aus dem Zustand von heute entsteht GENAU EIN Tagesauftrag mit
     genau einem Schwerpunkt und einer nachvollziehbaren Begruendung.

     ctx = {
       plan, todayYmd, daylog,
       weightTrend,               (weekly.trend(...) oder null)
       execution,                 (executionScore(...))
       health,                    { sleepHours, steps, hrvMs, restingHeartRate,
                                    baselineHrv, baselineRhr } — alles optional
       modifier                   { type, ... } aus „Heute anpassen" (optional)
     }

     Rueckgabe:
     {
       day, week, mode, session, kcal, protein, steps, cardio,
       focus{de,en}, headline{de,en}, why[], actions[], intervention|null
     }

     `mode` ist die eine Entscheidung des Tages:
       normal        Plan laeuft, nichts anzupassen
       deload        geplante reduzierte Woche
       recover       Erholung geht heute vor (Signal oder Meldung)
       short         verkuerzte Fassung (Zeit/Umstaende)
       reentry       Wiedereinstieg nach Ausfall — bewusst kleiner Schritt
       rest          planmaessiger Ruhetag
  */

  /* Wie viele der letzten Tage wurden verpasst? Ein Tag ist „verpasst", wenn
     er ein Trainingstag war und kein Training geloggt wurde, oder wenn der
     Tag komplett leer blieb (kein Haekchen, kein Abschluss). */
  function missedStreak(plan, daylog, todayYmd) {
    daylog = daylog || {};
    var missed = 0, checked = 0;
    for (var i = 1; i <= 21; i++) {
      var ymd = model.addDays(todayYmd, -i);
      if (plan.startDate && ymd < plan.startDate) break;
      var e = daylog[ymd];
      var tasks = (e && e.tasks) || {};
      var touched = !!(e && (e.closed || tasks.training || tasks.protein || tasks.steps));
      checked++;
      if (touched) break;
      missed++;
    }
    return { days: missed, checkedDays: checked };
  }

  /* Erholungssignal aus Apple Health — bewusst grob und nur mit Baseline.
     Eine einzelne schlechte Nacht aendert NICHTS (Leitsatz 2): erst die
     Kombination aus deutlich unterdurchschnittlichem Schlaf und einem
     zweiten Signal (HRV oder Ruhepuls) macht daraus eine Entscheidung. */
  function recoverySignal(h) {
    if (!h) return { low: false, reasons: [] };
    var reasons = [];
    var shortSleep = typeof h.sleepHours === "number" && h.sleepHours > 0 && h.sleepHours < 6;
    if (shortSleep) reasons.push("schlaf");
    if (typeof h.hrvMs === "number" && typeof h.baselineHrv === "number" && h.baselineHrv > 0 &&
        h.hrvMs < h.baselineHrv * 0.8) reasons.push("hrv");
    if (typeof h.restingHeartRate === "number" && typeof h.baselineRhr === "number" && h.baselineRhr > 0 &&
        h.restingHeartRate > h.baselineRhr + 5) reasons.push("ruhepuls");
    // Ein Signal allein reicht nicht. Zwei schon.
    return { low: reasons.length >= 2, reasons: reasons };
  }

  function tx(de, en) { return { de: de, en: en }; }

  /* Interne Signalnamen gehoeren nicht in den Nutzertext. „schlaf + hrv"
     liest sich wie ein Log-Eintrag, nicht wie eine Erklaerung. */
  var SIGNAL_NAMES = {
    schlaf: { de: "Schlafdauer", en: "sleep duration" },
    hrv: { de: "Herzfrequenzvariabilität", en: "heart rate variability" },
    ruhepuls: { de: "Ruhepuls", en: "resting heart rate" }
  };
  function signalNames(keys, isEn) {
    var names = keys.map(function (k) {
      var n = SIGNAL_NAMES[k];
      return n ? (isEn ? n.en : n.de) : k;
    });
    if (names.length < 2) return names.join("");
    return names.slice(0, -1).join(", ") + (isEn ? " and " : " und ") + names[names.length - 1];
  }

  function dailyPrescription(ctx) {
    var plan = ctx.plan, ymd = ctx.todayYmd;
    var daylog = ctx.daylog || {};
    var exec = ctx.execution || { score: null };
    var mod = ctx.modifier || null;
    var day = Math.round((Date.parse(ymd) - Date.parse(plan.startDate)) / 86400000) + 1;
    var week = Math.ceil(day / 7);
    var isDeload = (plan.training.deloadWeeks || []).indexOf(week) >= 0;
    var trainingDay = isWorkoutDay(plan, ymd);
    var rec = recoverySignal(ctx.health);
    var miss = missedStreak(plan, daylog, ymd);

    var out = {
      day: day, week: week,
      mode: trainingDay ? "normal" : "rest",
      training: trainingDay,
      kcal: plan.nutrition.calorieTarget,
      protein: plan.nutrition.proteinTargetGrams,
      steps: plan.dailyTargets.steps,
      cardio: null,
      sessionMinutes: plan.training.maximumSessionMinutes || 60,
      focus: null, headline: null,
      why: [],                 // nachvollziehbare Begruendungen, in Reihenfolge
      execution: exec.score,
      missedDays: miss.days
    };

    function why(de, en) { out.why.push(tx(de, en)); }

    /* --- Stufe 1: gemeldete Umstaende gewinnen immer -------------------
       Was der Nutzer aktiv meldet, ueberstimmt jede Messung. Wer krank ist,
       braucht keine Herzfrequenzanalyse. */
    if (mod) {
      if (mod.type === "krank") {
        out.mode = "recover"; out.training = false;
        out.steps = Math.min(out.steps, 4000);
        out.kcal = Math.max(plan.nutrition.calorieTarget, (plan.derived && plan.derived.tdee) || out.kcal);
        out.headline = tx("Heute wird nicht trainiert.", "No training today.");
        out.focus = tx("Erholung und ausreichend trinken", "Recovery and enough fluids");
        why("Du hast dich krank gemeldet. Training pausiert, das Defizit ist für heute aufgehoben — Krankheit ist kein Zeitpunkt zum Abnehmen.",
            "You reported being ill. Training is paused and the deficit is lifted for today — illness is no time to diet.");
        why("Wiedereinstieg kommt automatisch, wenn du dich wieder gesund meldest. Es wird nichts nachgeholt.",
            "Re-entry comes automatically once you report being well. Nothing gets made up.");
        return out;
      }
      if (mod.type === "zeit" && trainingDay) {
        var minutes = clamp(mod.minutes || 30, 15, plan.training.maximumSessionMinutes || 60);
        out.mode = "short"; out.sessionMinutes = minutes;
        out.headline = tx("Kurzfassung: " + minutes + " Minuten.", "Short version: " + minutes + " minutes.");
        out.focus = tx("Die schweren Grundübungen zuerst", "The heavy compound lifts first");
        why("Du hast heute " + minutes + " Minuten. Die Einheit wird gekürzt, nicht gestrichen — die ersten Übungen tragen den größten Teil des Reizes.",
            "You have " + minutes + " minutes today. The session is shortened, not skipped — the first exercises carry most of the stimulus.");
        return out;
      }
      if (mod.type === "auswaerts") {
        out.headline = tx("Auswärtsessen eingeplant.", "Eating out is planned.");
        out.focus = tx("Protein früh am Tag sichern", "Secure your protein early in the day");
        // Kein Defizit-Nachschärfen: das Tagesziel bleibt, nur die Verteilung ändert sich.
        why("Das Tagesziel bleibt bei " + out.kcal + " kcal. Halte Frühstück und Mittag proteinreich und leicht — der Abend hat dann Luft.",
            "The daily target stays at " + out.kcal + " kcal. Keep breakfast and lunch high in protein and light — the evening then has room.");
        why("Nicht kompensiert wird: kein Auslassen von Mahlzeiten, kein Strafcardio. Ein Abend entscheidet nichts.",
            "No compensation: no skipped meals, no punishment cardio. One evening decides nothing.");
        return out;
      }
      if (mod.type === "reise") {
        out.mode = trainingDay ? "short" : "rest";
        out.sessionMinutes = Math.min(out.sessionMinutes, 30);
        out.steps = Math.max(out.steps, plan.dailyTargets.steps);
        out.headline = tx("Reisetag.", "Travel day.");
        out.focus = tx("Bewegung und Protein — der Rest darf warten", "Movement and protein — the rest can wait");
        why("Unterwegs zählt Halten, nicht Fortschritt. Kurzeinheit ohne Geräte reicht; das Kalorienziel bleibt unverändert.",
            "On the road, maintaining beats progressing. A short equipment-free session is enough; the calorie target stays unchanged.");
        return out;
      }
    }

    /* --- Stufe 2: Wiedereinstieg nach Ausfall (Rescue) ------------------
       Der wichtigste Fall des ganzen Produkts. Hier entscheidet sich, ob
       jemand zurueckkommt oder aufhoert. */
    if (miss.days >= 3) {
      out.mode = "reentry";
      out.training = trainingDay;
      out.sessionMinutes = Math.min(out.sessionMinutes, 40);
      out.steps = Math.max(4000, Math.round((plan.dailyTargets.steps || 8000) * 0.7));
      out.headline = tx("Wiedereinstieg — heute zählt nur, dass du anfängst.",
                        "Re-entry — today only counts that you start.");
      out.focus = trainingDay
        ? tx("Eine kurze Einheit, bewusst leichter", "One short session, deliberately lighter")
        : tx("Ein Spaziergang und eine proteinreiche Mahlzeit", "A walk and one high-protein meal");
      why(miss.days + " Tage Pause. Deine Transformation ist davon nicht kaputt — " +
          miss.days + " von 84 Tagen ändern das Ergebnis nicht messbar.",
          miss.days + " days off. Your transformation is not broken by that — " +
          miss.days + " out of 84 days do not measurably change the outcome.");
      why("Es wird nichts nachgeholt: kein zusätzliches Cardio, kein tieferes Defizit. Nachholen ist der häufigste Grund, warum Leute danach ganz aufhören.",
          "Nothing gets made up: no extra cardio, no deeper deficit. Making up for it is the most common reason people quit entirely.");
      return out;
    }

    /* --- Stufe 3: „never miss twice" -----------------------------------
       Ein verpasster Tag ist Rauschen und wird bewusst NICHT kommentiert.
       Zwei sind ein Muster und bekommen genau einen Satz. */
    if (miss.days === 2) {
      out.headline = tx("Zwei Tage ausgelassen — heute wieder rein.",
                        "Two days missed — back in today.");
      out.focus = trainingDay
        ? tx("Die geplante Einheit, nichts obendrauf", "The planned session, nothing on top")
        : tx("Protein und Schritte, das reicht heute", "Protein and steps, that's enough today");
      why("Ein ausgelassener Tag ist normal. Zwei hintereinander sind der Punkt, an dem Pläne kippen — deshalb dieser Hinweis und keiner beim ersten Mal.",
          "One missed day is normal. Two in a row is where plans tip over — hence this note, and none after the first.");
    }

    /* --- Stufe 4: Erholung aus Messwerten ------------------------------ */
    if (rec.low && trainingDay && out.mode === "normal") {
      out.mode = "recover";
      out.sessionMinutes = Math.min(out.sessionMinutes, 40);
      out.cardio = "keins";
      out.headline = tx("Heute leichter trainieren.", "Train lighter today.");
      out.focus = tx("Vor 23:00 Uhr schlafen", "Sleep before 11pm");
      why("Zwei Werte liegen unter deinem Schnitt: " + signalNames(rec.reasons, false) + ". Das Volumen sinkt heute um einen Satz je Übung, die Last bleibt.",
          "Two values are below your average: " + signalNames(rec.reasons, true) + ". Volume drops by one set per exercise today, the load stays.");
      why("Eine einzelne schlechte Nacht würde hier nichts auslösen — erst zwei Signale zusammen.",
          "A single bad night would trigger nothing here — only two signals together.");
    } else if (rec.low && !trainingDay) {
      out.focus = tx("Schlaf ist heute der Engpass", "Sleep is today's bottleneck");
      why("Erholungssignale unter deinem Schnitt. Am Ruhetag heißt das: früher ins Bett, sonst nichts ändern.",
          "Recovery signals below your average. On a rest day that means: earlier to bed, change nothing else.");
    }

    /* --- Stufe 5: geplante reduzierte Woche ----------------------------- */
    if (isDeload && trainingDay && out.mode === "normal") {
      out.mode = "deload";
      out.headline = tx("Reduzierte Woche.", "Deload week.");
      out.focus = tx("Technik statt Gewicht", "Technique over weight");
      why("Woche " + week + " ist im Plan als reduzierte Woche vorgesehen: ein Satz weniger, rund 80 % der Last. Das ist kein Rückschritt, sondern der Grund, warum es danach weitergeht.",
          "Week " + week + " is a planned deload: one set less, about 80% load. That is not a step back — it is why progress continues afterwards.");
    }

    /* --- Stufe 6: Standardfall ------------------------------------------
       Wenn nichts dagegen spricht, ist die Ansage kurz und die Begruendung
       ehrlich: es laeuft. */
    if (!out.headline) {
      out.headline = trainingDay
        ? tx("Trainingstag.", "Training day.")
        : tx("Ruhetag.", "Rest day.");
      out.focus = trainingDay
        ? tx("Eine Wiederholung mehr als letztes Mal", "One more rep than last time")
        : tx("Schritte und Protein", "Steps and protein");
    }

    /* --- Ausfuehrung einordnen, ohne zu moralisieren --------------------- */
    if (exec.score != null) {
      if (exec.score < EXEC.poor) {
        why("Deine Umsetzung liegt bei " + exec.score + " % über " + exec.days + " Tage. Der Plan wird deshalb nicht verschärft — zuerst zählt Ausführung, dann Zahlen.",
            "Your execution is at " + exec.score + "% over " + exec.days + " days. The plan will not be tightened — execution first, numbers second.");
      } else if (exec.score >= 95) {
        why("Umsetzung " + exec.score + " %. Auf diesem Niveau sind Zahlen aussagekräftig — Anpassungen im Wochencheck greifen jetzt wirklich.",
            "Execution " + exec.score + "%. At this level the numbers mean something — weekly adjustments now actually bite.");
      }
    }
    return out;
  }

  /* ================= 4 · INTERVENTION =================
     Wenn MaleMetrix etwas aendert, wird das zu einer Maßnahme mit Anfang,
     Erfolgskriterium und Ueberpruefungsdatum — nicht zu einer stillen
     Zahlenaenderung. Und es laeuft immer nur EINE gleichzeitig.

     Eine Maßnahme entsteht aus einer Wochencheck-Entscheidung
     (weekly-check.js liefert rule + changes) und wird nach `reviewDays`
     bewertet. */
  var REVIEW_DAYS = 14;   // zwei volle Datenwochen — darunter ist Trend Rauschen

  function openIntervention(decision, ctx) {
    if (!decision || !decision.changes) return null;
    var paths = Object.keys(decision.changes);
    if (!paths.length) return null;
    return {
      id: "iv:" + ctx.todayYmd + ":" + decision.rule,
      rule: decision.rule,
      variable: paths[0],                       // genau eine Stellschraube
      from: null, to: decision.changes[paths[0]],
      startDate: ctx.todayYmd,
      reviewDate: model.addDays(ctx.todayYmd, REVIEW_DAYS),
      reason: decision.reason,
      baselineRatePerWeek: decision.trend ? decision.trend.deltaPerWeek : null,
      status: "open",                            // open | kept | reverted | inconclusive
      result: null
    };
  }

  /**
   * Bewertet eine laufende Maßnahme. Bewusst konservativ: „unklar" ist ein
   * gueltiges Ergebnis. Ohne Datengrundlage wird nichts behauptet.
   */
  function reviewIntervention(iv, ctx) {
    if (!iv || iv.status !== "open") return null;
    if (ctx.todayYmd < iv.reviewDate) return { due: false };
    var tr = ctx.weightTrend;
    var exec = ctx.execution || {};
    if (!tr) {
      return { due: true, verdict: "inconclusive",
        reason: tx("Zu wenige Gewichtsdaten seit dem Start der Maßnahme — sie läuft unverändert weiter.",
                   "Too little weight data since the measure started — it continues unchanged.") };
    }
    if (exec.score != null && exec.score < EXEC.poor) {
      return { due: true, verdict: "inconclusive",
        reason: tx("Die Maßnahme lässt sich nicht bewerten: die Umsetzung lag bei " + exec.score + " %. Bewertet wird erst, wenn der Plan auch ausgeführt wurde.",
                   "The measure cannot be judged: execution was at " + exec.score + "%. Judgement waits until the plan is actually being followed.") };
    }
    var target = ctx.plannedRatePerWeek != null ? ctx.plannedRatePerWeek : 0;
    var tol = Math.max(0.15, Math.abs(target) * 0.4);
    var hit = Math.abs(tr.deltaPerWeek - target) <= tol;
    var improved = iv.baselineRatePerWeek == null ? null
      : Math.abs(tr.deltaPerWeek - target) < Math.abs(iv.baselineRatePerWeek - target);

    if (hit) {
      return { due: true, verdict: "kept",
        reason: tx("Der Trend liegt wieder im Zielkorridor. Die Maßnahme bleibt und wird nicht weiter verschärft.",
                   "The trend is back inside the target corridor. The measure stays and is not tightened further.") };
    }
    if (improved) {
      return { due: true, verdict: "kept",
        reason: tx("Noch nicht im Korridor, aber näher dran als vorher. Die Maßnahme bekommt zwei weitere Wochen, bevor etwas anderes verändert wird.",
                   "Not in the corridor yet, but closer than before. The measure gets two more weeks before anything else changes.") };
    }
    return { due: true, verdict: "reverted",
      reason: tx("Die Maßnahme hat nichts bewirkt. Sie wird zurückgenommen, bevor eine zweite dazukommt — sonst weiß hinterher niemand, was gewirkt hat.",
                 "The measure achieved nothing. It is rolled back before a second one is added — otherwise nobody knows afterwards what worked.") };
  }

  return {
    EXEC_WEIGHTS: EXEC_WEIGHTS, EXEC: EXEC, REVIEW_DAYS: REVIEW_DAYS,
    executionScore: executionScore,
    trajectory: trajectory,
    missedStreak: missedStreak,
    recoverySignal: recoverySignal,
    dailyPrescription: dailyPrescription,
    openIntervention: openIntervention,
    reviewIntervention: reviewIntervention
  };
});
