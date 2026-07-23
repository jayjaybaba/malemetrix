/* ==========================================================================
   MALEMETRIX INTELLIGENCE — FORESIGHT  (MM.intelligence.foresight)
   --------------------------------------------------------------------------
   Vorausschau statt Rückblick. Vorhergesagt wird, WAS AUFMERKSAMKEIT BRAUCHT
   (§40) — nie exakte Biologie. Alles deterministisch, erklärbar, mit
   Unsicherheitsband und expliziten Schwellen gegen Fehlalarme (§61/§62).

   · executionRisk()     — Zuverlässigkeit realer Zeitfenster (Wochentag),
                           gelernt aus Sessions/Reschedules (§46–§48).
   · plateauRisk()       — flacher Trend + Kraft-Stagnation + hohe Adhärenz,
                           mit prädiktiver Zurückhaltung (§49).
   · recoveryPressure()  — Schlaf/Energie × Trainingsdichte × Disruption (§50).
   · trajectory()        — Erwartungsband je Modus vs. tatsächlicher Trend,
                           NUR bei ausreichender Datenlage (§51/§60).
   · forecastWeight()    — Band-Prognose; persönliche Response-Historie wird
                           höher gewichtet als generische Annahmen (§52/§138).
   · pickInsight()       — max. EIN proaktiver Insight (§63): neu, bedeutsam,
                           actionable, ausreichend sicher — sonst Stille.
   · Prediction Ledger   — intel_predictions: Vorhersage → später Outcome →
                           Kalibrierung (§193–§195). Kein Vanity-Score.
   · weekAutopilot()     — Wochen-Voraussicht: Konflikte (busy/free aus
                           MM.exec), Risiken, EIN Fokus, Vorschlag, ACCEPT (§127).
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var I = MM.intelligence = MM.intelligence || {};
  function S(k, d) { try { return MM.store ? MM.store.get(k, d) : d; } catch (e) { return d; } }
  function SET(k, v) { try { if (MM.store) MM.store.set(k, v); } catch (e) {} }
  function EX() { return MM.exec; }
  var WD_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

  /* ---------- EXECUTION RISK (§46–§48) ---------- */
  function executionRisk(ctx) {
    var logs = S("os_workout_logs", {}) || {};
    var sess = logs._sessions || [];
    var resched = S("os_reschedules", []) || [];
    var byWd = {};   // wd -> {done, moved}
    sess.forEach(function (s) { var wd = new Date(s.date + "T12:00:00").getDay(); byWd[wd] = byWd[wd] || { done: 0, moved: 0 }; byWd[wd].done++; });
    resched.forEach(function (r) { if (!r.fromDate) return; var wd = new Date(r.fromDate + "T12:00:00").getDay(); byWd[wd] = byWd[wd] || { done: 0, moved: 0 }; byWd[wd].moved++; });
    var windows = Object.keys(byWd).map(function (wd) {
      var b = byWd[wd]; var planned = b.done + b.moved;
      var missRate = planned ? b.moved / planned : 0;
      var level = planned >= 3 && missRate >= 0.5 ? "HIGH" : planned >= 3 && missRate >= 0.3 ? "MODERATE" : "LOW";
      return { wd: +wd, wdName: WD_DE[+wd], planned: planned, done: b.done, moved: b.moved, missRate: Math.round(missRate * 100) / 100, level: level, why: b.moved + " von " + planned + " geplanten Einheiten an diesem Wochentag wurden verschoben." };
    }).sort(function (a, b) { return b.missRate - a.missRate; });
    return { windows: windows, unreliable: windows.filter(function (w) { return w.level === "HIGH"; }) };
  }
  // Gelerntes Muster → Vorschlag (§47/§189): nur mit genug Belegen, nie automatisch.
  function windowProposal(ctx) {
    var er = executionRisk(ctx);
    if (!er.unreliable.length) return null;
    var w = er.unreliable[0];
    return { type: "window_change", title: w.wdName + " ist dein unzuverlässigstes Trainingsfenster", reason: w.why + " Ein anderes Standard-Fenster (z. B. Morgen statt Abend oder ein anderer Tag) würde die Woche stabiler machen.", evidence: [w.moved + "/" + w.planned + " verschoben (" + Math.round(w.missRate * 100) + " %)"], requiresConfirmation: true, wd: w.wd };
  }

  /* ---------- PLATEAU RISK (§49) — mit Zurückhaltung ---------- */
  function plateauRisk(ctx) {
    ctx = ctx || I.buildContext();
    var pts = ctx.body.points || 0;
    if (pts < 10 || ctx.body.weightTrend15 == null) return { level: "UNKNOWN", why: ["Zu wenig Gewichtsdaten für eine Plateau-Bewertung."], restraint: null };
    if (ctx.execution.consistency != null && ctx.execution.consistency < 80) return { level: "LOW", why: ["Umsetzung < 80 % — ein flacher Trend wäre hier kein Plateau-Signal, sondern Execution."], restraint: null };
    var flat = Math.abs(ctx.body.weightTrend15) < 0.25;
    var strengthFlat = ctx.training.available && ctx.training.avgE1rmPct != null && ctx.training.avgE1rmPct <= 0.5;
    var level = flat && strengthFlat ? "MODERATE" : flat || strengthFlat ? "LOW" : "LOW";
    var why = [];
    if (flat) why.push("Gewichtstrend nahezu flach (" + ctx.body.weightTrend15 + " kg / 15-Tage-Fenster).");
    if (strengthFlat) why.push("Kraft-Trend flach (" + ctx.training.avgE1rmPct + " %).");
    if (!why.length) why.push("Trends bewegen sich im Zielkorridor.");
    // Prädiktive Zurückhaltung: MODERATE heißt beobachten, nicht handeln.
    var restraint = level === "MODERATE" ? "Noch nichts ändern — eine weitere Woche Daten macht daraus ein belastbares Signal oder Rauschen." : null;
    return { level: level, why: why, restraint: restraint };
  }

  /* ---------- RECOVERY PRESSURE (§50) ---------- */
  function recoveryPressure(ctx) {
    ctx = ctx || I.buildContext();
    var score = 0; var why = [];
    if (ctx.recovery.lastSleepQuality === "schlecht") { score += 2; why.push("Weekly Pulse: Schlaf schwach."); }
    if (ctx.recovery.sleepHours != null && ctx.recovery.sleepHours < 6.5) { score += 2; why.push("Ø Schlaf " + ctx.recovery.sleepHours + " h."); }
    if (ctx.recovery.lastEnergy != null && ctx.recovery.lastEnergy <= 2) { score += 2; why.push("Energie " + ctx.recovery.lastEnergy + "/5."); }
    var sess7 = (S("os_workout_logs", {})._sessions || []).filter(function (s) { try { return I.util.daysBetween(s.date, I.util.todayYmd()) <= 7; } catch (e) { return false; } }).length;
    if (sess7 >= 4) { score += 1.5; why.push(sess7 + " Sessions in 7 Tagen (hohe Dichte)."); }
    if ((ctx.execution.overlaysActive || []).some(function (m) { return m === "sick" || m === "low_recovery" || m === "travel"; })) { score += 1; why.push("Aktiver Kontext: " + ctx.execution.overlaysActive.join(", ") + "."); }
    var level = score >= 4 ? "HIGH" : score >= 2 ? "RISING" : "LOW";
    return { level: level, why: why.length ? why : ["Keine Belastungssignale."], score: score };
  }

  /* ---------- TRAJECTORY (§51) — Erwartungsband je Modus ---------- */
  var MODE_BAND = { build: [0.10, 0.35], cut: [-1.0, -0.5], recomp: [-0.25, 0.15], perform: [-0.2, 0.3] };  // %KG/Woche
  function trajectory(ctx) {
    ctx = ctx || I.buildContext();
    var band = MODE_BAND[ctx.goal.mode];
    if (!band) return { status: "NO_MODE" };
    if ((ctx.body.points || 0) < 8 || ctx.body.weightTrend15 == null || !ctx.body.weight) return { status: "INSUFFICIENT_DATA", needs: ["Mehr Wiegungen (Ziel: tägliche/regelmäßige Messpunkte über 2+ Wochen)"] };
    if (ctx.execution.consistency != null && ctx.execution.consistency < 75) return { status: "EXECUTION_FIRST", why: "Bei " + ctx.execution.consistency + " % Umsetzung sagt der Trend mehr über die Woche als über den Plan." };
    var weeklyPct = (ctx.body.weightTrend15 / 2.14) / ctx.body.weight * 100;
    var status = weeklyPct < band[0] ? "BELOW" : weeklyPct > band[1] ? "ABOVE" : "WITHIN";
    return { status: status, actualPctWk: Math.round(weeklyPct * 100) / 100, expected: band, why: "Ist: " + (weeklyPct >= 0 ? "+" : "") + weeklyPct.toFixed(2) + " %KG/Woche · erwartet für " + ctx.goal.mode.toUpperCase() + ": " + band[0] + " bis " + band[1] + "." };
  }

  /* ---------- PERSONAL RESPONSE MODEL (§52/§133–§136) ---------- */
  function personalResponse(domain, changeKind) {
    var resp = (I.memory ? I.memory.priorResponses(domain, changeKind) : []);
    if (!resp.length) return null;
    var w = resp.filter(function (r) { return r.observed && r.observed.weightDelta != null; });
    var avgW = w.length ? Math.round(w.reduce(function (a, r) { return a + r.observed.weightDelta; }, 0) / w.length * 100) / 100 : null;
    var last = resp[resp.length - 1];
    return { n: resp.length, avgWeightDelta: avgW, last: { change: last.intervention && last.intervention.change, observed: last.observed, date: last.date }, summary: "Frühere Intervention(en) in dieser Domäne: " + resp.length + "× — zuletzt „" + ((last.intervention || {}).change || "—") + "“" + (last.observed && last.observed.weightDelta != null ? " → Gewicht " + (last.observed.weightDelta > 0 ? "+" : "") + last.observed.weightDelta + " kg im Beobachtungsfenster (beobachtet, keine bewiesene Ursache)." : ".") };
  }

  /* ---------- FORECAST (§53/§138) — Band, nie Punktwert ---------- */
  function forecastWeight(ctx, weeks) {
    ctx = ctx || I.buildContext(); weeks = weeks || 4;
    var t = trajectory(ctx);
    if (t.status === "INSUFFICIENT_DATA" || t.status === "NO_MODE") return { status: "PAUSED", needs: t.needs || [], note: "Prognose pausiert — erst Datenbasis (§60)." };
    var base = MODE_BAND[ctx.goal.mode] || [-0.2, 0.2];
    var pr = personalResponse("nutrition");
    var center = t.actualPctWk != null ? t.actualPctWk : (base[0] + base[1]) / 2;
    // Persönliche Historie verengt/verschiebt das Band (§52), generisch bleibt der Rahmen.
    var half = Math.max(0.08, (base[1] - base[0]) / (pr && pr.n >= 2 ? 3 : 2));
    var lo = (center - half) / 100 * ctx.body.weight * weeks;
    var hi = (center + half) / 100 * ctx.body.weight * weeks;
    return { status: "OK", weeks: weeks, from: ctx.body.weight, range: [Math.round((ctx.body.weight + lo) * 10) / 10, Math.round((ctx.body.weight + hi) * 10) / 10], assumptions: ["Umsetzung bleibt ≥ 80 %", "Keine Kontext-Disruption > 3 Tage", pr ? "Persönliche Response-Historie (" + pr.n + " Datenpunkte) eingerechnet" : "Generische Annahmen (noch keine persönliche Response-Historie)"], confidence: pr && pr.n >= 2 ? "MODERATE" : "LOW" };
  }

  /* ---------- PREDICTION LEDGER (§194/§195) ---------- */
  function predictions() { var p = S("intel_predictions", []); return Array.isArray(p) ? p : []; }
  function recordPrediction(pred) {
    var list = predictions();
    var entry = { id: "prd_" + (list.length + 1) + "_" + (pred.type || "x"), date: I.util.todayYmd(), type: pred.type, level: pred.level, windowDays: pred.windowDays || 7, why: pred.why || [], outcome: null };
    // Dedup: gleiche offene Vorhersage nicht stapeln.
    if (list.some(function (p) { return p.type === entry.type && p.outcome == null && I.util.daysBetween(p.date, entry.date) < entry.windowDays; })) return null;
    list.push(entry); if (list.length > 200) list = list.slice(-200);
    SET("intel_predictions", list);
    return entry;
  }
  function resolvePrediction(id, outcome) {
    var list = predictions();
    list.forEach(function (p) { if (p.id === id && p.outcome == null) { p.outcome = outcome; p.resolvedAt = I.util.todayYmd(); } });
    SET("intel_predictions", list);
  }
  function calibration() {
    var done = predictions().filter(function (p) { return p.outcome != null; });
    var hi = done.filter(function (p) { return p.level === "HIGH"; });
    return { resolved: done.length, highRisk: { n: hi.length, occurred: hi.filter(function (p) { return p.outcome === "occurred"; }).length }, falsePositives: done.filter(function (p) { return p.level === "HIGH" && p.outcome === "not_occurred"; }).length, falseNegatives: done.filter(function (p) { return p.level === "LOW" && p.outcome === "occurred"; }).length };
  }

  /* ---------- EIN proaktiver Insight (§61–§63) ---------- */
  function pickInsight(ctx) {
    ctx = ctx || I.buildContext();
    var cands = [];
    var rp = recoveryPressure(ctx);
    if (rp.level === "HIGH") cands.push({ pri: 3, type: "recovery_pressure", level: rp.level, title: "Recovery-Druck steigt", text: rp.why.slice(0, 2).join(" "), action: { label: "Heute anpassen", link: "#today" } });
    var pl = plateauRisk(ctx);
    if (pl.level === "MODERATE") cands.push({ pri: 2, type: "plateau_risk", level: pl.level, title: "Plateau-Risiko: moderat", text: pl.why.join(" ") + " " + (pl.restraint || ""), action: null });
    var tr = trajectory(ctx);
    if (tr.status === "BELOW" || tr.status === "ABOVE") cands.push({ pri: 2, type: "trajectory", level: "MODERATE", title: tr.status === "BELOW" ? "Unter dem Zielkorridor" : "Über dem Zielkorridor", text: tr.why, action: { label: "Review ansehen", link: "#review" } });
    var wp = windowProposal(ctx);
    if (wp) cands.push({ pri: 1, type: "window_change", level: "MODERATE", title: wp.title, text: wp.reason, action: { label: "Fenster ändern", link: "#settings" } });
    if (!cands.length) return null;
    cands.sort(function (a, b) { return b.pri - a.pri; });
    var top = cands[0];
    // Vorhersage protokollieren (Kalibrierung §193) — dedupliziert intern.
    recordPrediction({ type: top.type, level: top.level, windowDays: 7, why: [top.text] });
    return top;
  }

  /* ---------- WEEK AUTOPILOT (§42/§127/§128) ---------- */
  function weekAutopilot(ctx) {
    ctx = ctx || I.buildContext();
    var ex = EX(); if (!ex) return null;
    var wp = ex.weekPlan(1);   // NÄCHSTE Woche
    if (!wp) return null;
    var conflicts = [];
    var moves = [];
    wp.days.forEach(function (d) {
      if (d.type !== "strength" || d.past) return;
      var conf = ex.conflictsForDate ? ex.conflictsForDate(d.date) : [];
      if (conf.length) {
        var alt = ex.bestWindows ? ex.bestWindows(d.date, 60) : [];
        var altDay = wp.days.filter(function (x) { return x.type !== "strength" && !x.past && x.date > d.date && (!ex.conflictsForDate || !ex.conflictsForDate(x.date).length); })[0];
        conflicts.push({ date: d.date, wd: d.wd, busy: conf[0], altTime: alt.length ? alt[0] : null, altDay: altDay ? { date: altDay.date, wd: altDay.wd } : null });
        if (alt.length) moves.push({ kind: "time", date: d.date, to: alt[0].start, why: "Belegtes Fenster " + conf[0].start + "–" + conf[0].end + " — " + alt[0].start + " ist frei und nah an deiner Präferenz." });
        else if (altDay) moves.push({ kind: "day", fromDate: d.date, fromPd: d.pd, toDate: altDay.date, why: "Der ganze Tag ist eng — " + altDay.wd + " ist frei und hält den Abstand zwischen Kraft-Einheiten." });
      }
    });
    var rp = recoveryPressure(ctx);
    var focus = rp.level !== "LOW" ? "Schlaf vor " + (ex.prefs().bedtime) + " — Recovery ist der Engpass der Woche." : (I.decision ? (I.decision.bottleneck2(ctx).domain === "nutrition" ? "Kalorien-Konstanz — jeden Tag im Zielbereich." : "Konstanz: alle geplanten Einheiten, nichts extra.") : "Konstanz.");
    var due = [];
    try { due = ex.dueDecisions ? ex.dueDecisions(wp.days[6].date).map(function (d) { return d.what; }) : []; } catch (e) {}
    return {
      week: wp.week, load: wp.load, days: wp.days,
      status: conflicts.length ? "ISSUES" : "KEEP",
      headline: conflicts.length ? conflicts.length + " Konflikt" + (conflicts.length > 1 ? "e" : "") + " erkannt" : "Nächste Woche sieht gut aus",
      conflicts: conflicts, moves: moves,
      recovery: rp.level, focus: focus,
      notNow: I.decision ? I.decision.stopDoing(ctx).slice(0, 2) : [],
      reviewDue: due
    };
  }
  // ACCEPT WEEK (§55/§57): nur Reschedules in freigegebenen Fenstern — sichere
  // Ausführungs-Präferenz, keine Plan-/Ernährungs-/Trainingsstrategie-Änderung.
  function applyWeek(ap) {
    var ex = EX(); if (!ex || !ap) return { applied: 0 };
    var n = 0;
    (ap.moves || []).forEach(function (m) {
      if (m.kind === "day" && m.fromPd && m.toDate) { ex.applyReschedule(m.fromPd, m.toDate, "autopilot"); n++; }
      if (m.kind === "time" && m.to) { try { MM.os.setP("calendar.trainTime", m.to); n++; } catch (e) {} }
    });
    try { MM.os.emit("AUTOPILOT_WEEK_ACCEPTED", { moves: n }); } catch (e) {}
    return { applied: n };
  }

  I.foresight = {
    executionRisk: executionRisk, windowProposal: windowProposal,
    plateauRisk: plateauRisk, recoveryPressure: recoveryPressure,
    trajectory: trajectory, forecastWeight: forecastWeight, personalResponse: personalResponse,
    predictions: predictions, recordPrediction: recordPrediction, resolvePrediction: resolvePrediction, calibration: calibration,
    pickInsight: pickInsight, weekAutopilot: weekAutopilot, applyWeek: applyWeek, MODE_BAND: MODE_BAND
  };
  try { if (MM.account && MM.account.registerStateDomain) MM.account.registerStateDomain("intelpredictions", "intel_predictions", { append: true }); } catch (e) {}
})();
