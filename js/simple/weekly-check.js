/* ==========================================================================
   MaleMetrix Generation 2 — Wochencheck (PUR: Regelwerk, kein DOM/Storage)

   Einmal pro Woche: wenige Fragen, eine regelbasierte Entscheidung, eine
   sichtbare Begründung. „Plan bleibt unverändert" ist eine valide — und
   häufige — Entscheidung. Sicherheitsregeln gewinnen immer.

   Entscheidungen ändern den Plan ausschließlich über die Versionierung
   (plan-model.applyChange) — mit Regel-ID, Begründung, Quelle "system"
   und Verweis auf den Wochencheck. Vergangene Wochen bleiben unberührt.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./plan-model.js"));
  } else {
    root.MMSimple = root.MMSimple || {};
    root.MMSimple.weekly = factory(root.MMSimple.model);
  }
})(typeof self !== "undefined" ? self : this, function (model) {
  "use strict";

  var L = model.LIMITS;

  /* ---------- Gewichtstrend: geglättet, nie Ein-Punkt-Panik ----------
     weights: [{date:"YYYY-MM-DD", kg:Number}] beliebig sortiert.
     Liefert { thisWeekAvg, prevWeekAvg, deltaPerWeek, points } oder null
     bei zu dünner Datenlage (<2 Werte je Fenster). */
  function trend(weights, todayYmd) {
    if (!Array.isArray(weights)) return null;
    var t0 = model.addDays(todayYmd, -7), t1 = model.addDays(todayYmd, -14);
    var cur = [], prev = [];
    weights.forEach(function (w) {
      if (!w || typeof w.kg !== "number" || !w.date) return;
      if (w.date > todayYmd) return;
      if (w.date > t0) cur.push(w.kg);
      else if (w.date > t1) prev.push(w.kg);
    });
    if (cur.length < 2 || prev.length < 2) return null;
    var avg = function (a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; };
    var ca = avg(cur), pa = avg(prev);
    return { thisWeekAvg: Math.round(ca * 10) / 10, prevWeekAvg: Math.round(pa * 10) / 10,
             deltaPerWeek: Math.round((ca - pa) * 100) / 100, points: cur.length + prev.length };
  }

  /* ---------- Erwartete Wochenrate aus dem Plan ---------- */
  function plannedRate(plan) {
    var st = plan.selectedTransformation || {};
    var pg = plan.phaseGoal || {};
    if (st.startWeightKg == null || pg.week12TargetMinKg == null) return null;
    var mid = (pg.week12TargetMinKg + pg.week12TargetMaxKg) / 2;
    return Math.round((mid - st.startWeightKg) / (pg.durationWeeks || 12) * 100) / 100; // negativ = Abnahme
  }

  /* ---------- Fragen des Wochenchecks (§19) — nur Notwendiges ---------- */
  var QUESTIONS = [
    { id: "trainingsDone", type: "number", label: "Wie viele geplante Trainings hast du absolviert?", labelEn: "How many planned sessions did you complete?" },
    { id: "nutritionAdherence", type: "choice", options: ["gut", "mittel", "schlecht"], label: "Wie gut hast du die Ernährungsvorgabe getroffen?", labelEn: "How well did you hit your nutrition targets?" },
    { id: "hunger", type: "choice", options: ["normal", "hoch"], label: "Hunger in dieser Woche?", labelEn: "Hunger this week?" },
    { id: "energy", type: "choice", options: ["gut", "mittel", "schlecht"], label: "Energie & Regeneration?", labelEn: "Energy & recovery?" },
    { id: "performance", type: "choice", options: ["besser", "stabil", "schlechter"], label: "Trainingsleistung (Gewichte/Wiederholungen)?", labelEn: "Training performance (loads/reps)?" },
    { id: "circumstances", type: "multi", options: ["krank", "reise", "stress", "verletzung"], label: "Besondere Umstände?", labelEn: "Special circumstances?" }
  ];

  /* ---------- Entscheidung ----------
     ctx = { plan, week, todayYmd, weights, answers }
     Liefert { rule, decision, reason{de,en}, changes|null, safetyNote|null }.
     changes ist direkt für store.changePlan geeignet (oder null = keine
     Änderung). Reihenfolge der Regeln = Priorität; Sicherheit zuerst. */
  function decide(ctx) {
    var plan = ctx.plan, a = ctx.answers || {};
    var tr = trend(ctx.weights || [], ctx.todayYmd);
    var pr = plannedRate(plan);
    var cut = plan.derived ? plan.derived.cut : (pr != null && pr < 0);
    var circ = a.circumstances || [];
    var kcal = plan.nutrition.calorieTarget;
    var steps = plan.dailyTargets.steps;

    function res(rule, decision, de, en, changes, safety) {
      return { rule: rule, decision: decision, reason: { de: de, en: en },
               changes: changes || null, safetyNote: safety || null,
               trend: tr, plannedRatePerWeek: pr };
    }

    /* 1 — Sicherheit: Krankheit/Verletzung → nie verschärfen */
    if (circ.indexOf("krank") >= 0) {
      return res("wr_sick", "recovery_first",
        "Du warst krank. Diese Woche zählt Erholung: Kurzversionen oder Pause, keine Kalorien- oder Zielverschärfung. Wiedereinstieg nach der Comeback-Regel.",
        "You were sick. This week is about recovery: short versions or rest, no calorie or target tightening. Return via the comeback rule.",
        null, "krankheit");
    }
    if (circ.indexOf("verletzung") >= 0) {
      return res("wr_injury", "adjust_training",
        "Verletzung gemeldet: betroffene Übungen werden durch die hinterlegten Alternativen ersetzt, Volumen bleibt reduziert. Bei anhaltenden Schmerzen: ärztlich abklären.",
        "Injury reported: affected exercises switch to their listed alternatives, volume stays reduced. If pain persists, see a doctor.",
        null, "verletzung");
    }

    /* 2 — Sicherheit: zu schneller Verlust */
    if (cut && tr && -tr.deltaPerWeek > (plan.selectedTransformation.startWeightKg || 90) * 0.011) {
      var upTo = Math.min(kcal + 150, L.kcalMax);
      return res("wr_too_fast", "kcal_up",
        "Dein Gewicht fällt schneller als geplant (" + Math.abs(tr.deltaPerWeek).toFixed(1) + " kg/Woche). Zu schnell kostet Muskeln — das Tagesziel steigt um " + (upTo - kcal) + " kcal.",
        "You're losing faster than planned (" + Math.abs(tr.deltaPerWeek).toFixed(1) + " kg/week). Too fast costs muscle — the daily target goes up by " + (upTo - kcal) + " kcal.",
        { "nutrition.calorieTarget": upTo }, "zu_schnell");
    }

    /* 3 — Sicherheit: Leistung UND Regeneration schlecht → Volumen runter */
    if (a.performance === "schlechter" && a.energy === "schlecht") {
      return res("wr_overreach", "volume_down",
        "Leistung und Regeneration sind beide im Keller. Diese Woche: reduzierte Woche (ein Satz weniger, ~80 % Last) und Schlafanker priorisieren — keine Kalorienänderung.",
        "Performance and recovery are both down. This week: deload (one set less, ~80% load) and prioritize the sleep anchor — no calorie change.",
        null, "regeneration");
    }

    /* 4 — Hoher Hunger bei schlechter Energie → moderat entlasten */
    if (a.hunger === "hoch" && a.energy === "schlecht" && cut) {
      var up2 = Math.min(kcal + 100, L.kcalMax);
      return res("wr_hunger", "kcal_up",
        "Dauerhunger plus schlechte Energie: Das Defizit wird um " + (up2 - kcal) + " kcal entschärft. Erst Gemüse und Protein hoch, dann neu bewerten.",
        "Constant hunger plus low energy: the deficit is eased by " + (up2 - kcal) + " kcal. Raise vegetables and protein first, then reassess.",
        { "nutrition.calorieTarget": up2 }, null);
    }

    /* 5 — Datenlage zu dünn → nichts ändern, Messen zur Aufgabe machen */
    if (!tr) {
      return res("wr_no_data", "keep",
        "Zu wenige Gewichtsdaten für eine seriöse Entscheidung. Der Plan bleibt unverändert — wiege dich diese Woche an den festen Wiege-Tagen.",
        "Not enough weight data for a serious decision. The plan stays unchanged — weigh in on your fixed days this week.",
        null, "datenlage");
    }

    /* 6 — Trend im Zielkorridor → bewusst nichts ändern */
    var target = pr != null ? pr : 0;
    var tol = Math.max(0.15, Math.abs(target) * 0.4);
    if (Math.abs(tr.deltaPerWeek - target) <= tol) {
      return res("wr_on_track", "keep",
        "Dein Gewichtstrend liegt im Zielkorridor und deine Umsetzung trägt. Deshalb ändern wir diese Woche nichts.",
        "Your weight trend is inside the target corridor and your execution holds. So we change nothing this week.",
        null, null);
    }

    /* 7 — Stagnation (Cut) */
    var stalled = cut ? tr.deltaPerWeek > target + tol : tr.deltaPerWeek < target - tol;
    if (stalled && a.nutritionAdherence === "gut" && (a.trainingsDone == null || a.trainingsDone >= Math.max(1, plan.training.daysPerWeek - 1))) {
      if (cut) {
        var down = Math.max(kcal - 120, L.kcalMin);
        if (down < kcal) {
          return res("wr_stall_adherent", "kcal_down",
            "Dein Gewicht stagniert seit zwei Wochen und du hast den Plan überwiegend eingehalten. Das Tagesziel wird deshalb moderat um " + (kcal - down) + " kcal reduziert.",
            "Your weight has stalled for two weeks while you mostly stuck to the plan. The daily target is therefore reduced moderately by " + (kcal - down) + " kcal.",
            { "nutrition.calorieTarget": down }, null);
        }
        var stepsUp = Math.min(steps + 1000, L.stepsMax);
        return res("wr_stall_steps", "steps_up",
          "Kalorien sind bereits an der Untergrenze — stattdessen steigt dein Schrittziel um " + (stepsUp - steps) + ".",
          "Calories are already at the floor — your step goal rises by " + (stepsUp - steps) + " instead.",
          { "dailyTargets.steps": stepsUp }, null);
      }
      var up3 = Math.min(kcal + 120, L.kcalMax);
      return res("wr_gain_stall", "kcal_up",
        "Aufbau stagniert bei guter Umsetzung: +" + (up3 - kcal) + " kcal aufs Tagesziel.",
        "Muscle-gain progress stalled with good adherence: +" + (up3 - kcal) + " kcal to the daily target.",
        { "nutrition.calorieTarget": up3 }, null);
    }
    if (stalled) {
      return res("wr_stall_execution", "keep",
        "Die Zahlen stagnieren, aber die Umsetzung war unvollständig — der Plan wird NICHT verschärft. Diese Woche zählt Umsetzung: Mahlzeitenbausteine und Trainingstage wie geplant, dann entscheiden die Daten neu.",
        "Numbers stalled, but execution was incomplete — the plan is NOT tightened. This week is about execution: meal blocks and training days as planned; the data decides next week.",
        null, null);
    }

    /* 8 — Reise/Stress ohne Zahlen-Problem → Plan hält, Regeln aktiv */
    if (circ.indexOf("reise") >= 0 || circ.indexOf("stress") >= 0) {
      return res("wr_life", "keep",
        "Besondere Woche (Reise/Stress), Trend trotzdem in Ordnung. Der Plan bleibt — nutze Kurzversionen und die Unterwegs-Regeln.",
        "Special week (travel/stress), trend still fine. The plan stays — use short versions and the on-the-go rules.",
        null, null);
    }

    /* 9 — Default: leicht daneben, aber kein klares Muster → beobachten */
    return res("wr_watch", "keep",
      "Der Trend weicht leicht ab, zeigt aber noch kein stabiles Muster. Der Plan bleibt unverändert — nächste Woche entscheiden zwei volle Datenwochen.",
      "The trend deviates slightly but shows no stable pattern yet. The plan stays unchanged — next week two full data weeks will decide.",
      null, null);
  }

  /* ---------- Check-in-Datensatz bauen (append-only, Phase-1-Store) ---------- */
  function buildCheckin(ctx, decision) {
    return {
      id: "ci:w" + ctx.week + ":" + ctx.todayYmd,
      week: ctx.week, date: ctx.todayYmd,
      answers: ctx.answers || {},
      trend: decision.trend,
      rule: decision.rule, decision: decision.decision,
      reason: decision.reason,
      changed: !!decision.changes,
      planVersionBefore: ctx.plan.version
    };
  }

  return { QUESTIONS: QUESTIONS, trend: trend, plannedRate: plannedRate, decide: decide, buildCheckin: buildCheckin };
});
