/* ==========================================================================
   MALEMETRIX INTELLIGENCE — DECISION ENGINE 2.0  (MM.intelligence.decision)
   --------------------------------------------------------------------------
   Zentrale, DETERMINISTISCHE Arbitrierung. Verschiedene Engines schlagen
   teils widersprüchliche Aktionen vor — hier wird priorisiert, entschieden
   und begründet. Kein Zufall, keine KI-Erfindung.

   Enthält:
     · decide()               — Arbitrierung zu EINER primären Entscheidung +
                                Not-Now, mit Evidenz & Review-Trigger (§15/16).
     · bottleneck2()          — dynamischer Limiter mit Confidence + Evidenz (§69/70).
     · contradictions()       — System zieht in verschiedene Richtungen? (§18)
     · planConsistency()      — Goal↔Mode↔Nutrition↔Training↔Recovery↔Stack (§19)
     · leverage()             — Impact × Effort × Confidence je Intervention (§73)
     · stopDoing()            — was man AUFHÖREN sollte (§74)
     · minimumViableDay()     — reduzierter Plan bei Überforderung (§75)
   One-Variable-Prinzip (§17): bei Änderungen HOLD EVERYTHING ELSE CONSTANT.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var I = MM.intelligence = MM.intelligence || {};
  function EN() { return MM.engines; }
  function LB() { return MM.labs; }
  function mem() { return I.memory; }

  /* ---------- BOTTLENECK 2.0 (§69/70) ----------
     Dynamischer Limiter über 8 Domänen mit Confidence + Evidenz. Basiert auf
     echten Signalen des Context/Twin, nicht auf dem statischen Score-Bottleneck
     (der bleibt als Prior verfügbar). */
  var BN_DOMAINS = ["execution", "recovery", "nutrition", "training", "body", "metabolic", "medical", "knowledge"];
  function bottleneck2(ctx) {
    ctx = ctx || I.buildContext();
    var scores = {};    // domain -> {score, evidence[]}
    function add(dom, s, ev) { scores[dom] = scores[dom] || { score: 0, evidence: [] }; scores[dom].score += s; if (ev) scores[dom].evidence.push(ev); }

    // EXECUTION: niedrige Adhärenz ist fast immer der erste Limiter.
    var cons = ctx.execution.consistency;
    if (cons != null) {
      if (cons < 60) add("execution", 5, "Umsetzung nur " + cons + "%");
      else if (cons < 75) add("execution", 3, "Umsetzung " + cons + "% — noch nicht konstant");
      else add("execution", 0.2, "Umsetzung " + cons + "% (stark)");
    }
    // RECOVERY: schlechter Schlaf/Energie + gute Adhärenz → Recovery limitiert.
    var r = ctx.recovery;
    if (r.lastSleepQuality === "schlecht" || (r.sleepHours != null && r.sleepHours < 6.5)) {
      var w = (cons != null && cons >= 75) ? 4 : 2.5;
      add("recovery", w, "Schlaf unter Zielbereich" + (r.lastEnergy != null && r.lastEnergy <= 3 ? ", Energie " + r.lastEnergy + "/5" : ""));
    }
    // TRAINING: Plateau trotz guter Recovery/Nutrition.
    var t = ctx.training;
    if (t.available && t.avgE1rmPct != null && t.avgE1rmPct <= 0 && (cons == null || cons >= 75)) add("training", 3, "Kraft-Trend flach (" + signed(t.avgE1rmPct) + "%) bei guter Umsetzung");
    if (!t.available) add("training", 1.5, "Keine geloggten Workouts — Trainingsreiz unklar");
    // NUTRITION: Ziel-Modus vs. Körpertrend inkonsistent. Im Build ist flaches
    // Gewicht der klassische „iss mehr“-Fall — und liegt VOR einer Trainings-
    // umstellung (stagnierende Kraft im Build ist oft Folge des fehlenden
    // Überschusses). Daher etwas höher gewichtet als das Trainings-Plateau.
    var b = ctx.body, mode = ctx.goal.mode;
    if (mode === "build" && b.weightTrend15 != null && b.weightTrend15 <= 0 && (cons == null || cons >= 80)) add("nutrition", 3.5, "Build-Ziel, aber Gewicht stagniert/fällt bei hoher Adhärenz");
    if ((mode === "cut") && b.weightTrend15 != null && b.weightTrend15 >= 0 && b.waistTrend14 != null && b.waistTrend14 >= 0 && (cons == null || cons >= 80)) add("nutrition", 3, "Cut-Ziel, aber Gewicht UND Taille stehen");
    // BODY: Taille läuft in falsche Richtung fürs Ziel.
    if (mode === "build" && b.waistTrend14 != null && b.waistTrend14 > 0.7) add("body", 2, "Taille steigt schneller als für sauberen Aufbau nötig");
    // METABOLIC / MEDICAL aus Labs.
    var lb = LB();
    if (lb && ctx.labs.available) {
      ctx.labs.priorities.forEach(function (p) {
        if (p.crit) add("medical", 6, p.name + ": ärztlich prüfen");
        else if (p.status === "WORSENING" || p.status === "NEEDS_FOLLOWUP") add("metabolic", 2, p.name + " verschlechtert sich");
      });
    }
    // KNOWLEDGE: kein Plan / kein Pathway → Plan-Klarheit limitiert.
    if (!ctx.pathway) add("knowledge", 2, "Kein Pathway gewählt");
    if (!ctx.nutrition.hasPlan && !ctx.training.hasPlan) add("knowledge", 1.5, "Weder Nutrition- noch Trainingsplan gesetzt");

    // Sieger + Confidence.
    var ranked = Object.keys(scores).map(function (d) { return { domain: d, score: scores[d].score, evidence: scores[d].evidence }; }).sort(function (a, b) { return b.score - a.score; });
    if (!ranked.length) {
      var prior = ctx.goal.bottleneck;
      return { domain: prior || "execution", confidencePct: prior ? 45 : 30, evidence: prior ? ["Aus Score-Baseline (noch wenig frische Signale)"] : ["Zu wenig Daten für dynamische Bewertung"], all: [], low: true };
    }
    var top = ranked[0];
    var second = ranked[1];
    // Confidence: Abstand zum zweiten + absolute Höhe.
    var gap = second ? (top.score - second.score) : top.score;
    var confPct = Math.round(I.util.clamp(40 + gap * 9 + Math.min(top.score, 6) * 3, 30, 92));
    return { domain: top.domain, confidencePct: confPct, evidence: top.evidence, all: ranked, low: top.score < 2 };
  }
  // Bottleneck-Historie pflegen (§71/72) — nur bei Wechsel einen Eintrag.
  function trackBottleneck(ctx) {
    var bn = bottleneck2(ctx);
    var hist = getHist();
    var last = hist.length ? hist[hist.length - 1] : null;
    if (!last || last.domain !== bn.domain) {
      hist.push({ domain: bn.domain, since: I.util.todayYmd(), confidencePct: bn.confidencePct, evidence: bn.evidence });
      if (hist.length > 40) hist = hist.slice(-40);
      MM.store && MM.store.set("intel_bottleneck_hist", hist);
      if (last) return { changed: true, from: last.domain, to: bn.domain, bn: bn };
    }
    return { changed: false, bn: bn };
  }
  function getHist() { var h = MM.store ? MM.store.get("intel_bottleneck_hist", []) : []; return Array.isArray(h) ? h : []; }
  function bottleneckHistory() { return getHist(); }

  /* ---------- LEVERAGE (§73) — Impact × Effort × Confidence ---------- */
  function leverage(ctx) {
    ctx = ctx || I.buildContext();
    var bn = bottleneck2(ctx);
    var items = [];
    function add(id, label, impact, effort, confidence, when) { items.push({ id: id, label: label, impact: impact, effort: effort, confidence: confidence, score: score(impact, effort, confidence), domain: when }); }
    // Kandidaten je nach Bottleneck priorisiert.
    if (bn.domain === "recovery") add("sleep", "Schlaf-Konstanz (fixe Bettzeit, 7h+)", "high", "medium", "high", "recovery");
    if (bn.domain === "execution") add("adherence", "Trainings-/Ess-Konstanz halten (nichts Neues)", "high", "low", "high", "execution");
    if (bn.domain === "nutrition") add("kcal", "Energie um EINE Stufe anpassen (~10%)", "high", "low", "medium", "nutrition");
    if (bn.domain === "training") add("progression", "Double Progression konsequent, Übung ggf. variieren", "medium", "medium", "medium", "training");
    if (bn.domain === "body") add("surplus", "Überschuss leicht zurücknehmen", "medium", "low", "medium", "nutrition");
    if (bn.domain === "medical" || bn.domain === "metabolic") add("labreview", "Auffälligen Laborwert ärztlich einordnen / rechecken", "high", "medium", "high", "labs");
    // Immer verfügbare Basis-Hebel.
    add("protein", "Proteinziel real treffen", "medium", "low", "high", "nutrition");
    add("steps", "Alltagsbewegung (NEAT/Schritte)", "medium", "low", "medium", "lifestyle");
    // Niedrighebel bewusst als solche markieren.
    add("newsupp", "Neues Supplement hinzufügen", "low", "low", "low", "stack");
    add("newprogram", "Programm/Split wechseln", "low", "medium", "low", "training");
    items.sort(function (a, b) { return b.score - a.score; });
    return items;
  }
  function score(impact, effort, confidence) {
    var IM = { high: 3, medium: 2, low: 1 }, EF = { low: 3, medium: 2, high: 1 }, CO = { high: 3, medium: 2, low: 1 };
    return (IM[impact] || 1) * 2 + (EF[effort] || 1) + (CO[confidence] || 1);
  }

  /* ---------- STOP DOING (§74) ---------- */
  function stopDoing(ctx) {
    ctx = ctx || I.buildContext();
    var bn = bottleneck2(ctx);
    var out = [];
    if (bn.domain === "execution" || (ctx.execution.consistency != null && ctx.execution.consistency < 70)) {
      out.push("Neue Programme/Splits suchen — erst Konstanz, dann Feintuning.");
      out.push("Supplements stapeln, bevor die Umsetzung steht.");
    }
    if (bn.domain === "recovery") { out.push("Trainingsvolumen erhöhen, solange Schlaf unten ist."); out.push("Ein größeres Defizit fahren."); }
    if (ctx.goal.mode === "cut" && ctx.body.weightTrend15 != null && ctx.body.weightTrend15 < -1.0) out.push("Kalorien weiter senken — du verlierst schon zu schnell.");
    // Generische Anti-Overreaction.
    out.push("Schlüsse aus 2–3 Tagen ziehen — Trends brauchen mehrere Messpunkte.");
    // Lab-getrieben: hohes Vit D / Eisen nicht weiter pushen.
    (ctx.stack.labFlags || []).forEach(function (f) { if (f.action === "avoid") out.push(f.text); if (f.action === "hold" && f.supp === "vitd") out.push("Vitamin D blind hochdosieren (Wert ist ausreichend)."); });
    // dedupe
    return out.filter(function (x, i) { return out.indexOf(x) === i; }).slice(0, 5);
  }

  /* ---------- CONTRADICTION ENGINE (§18) ---------- */
  function contradictions(ctx) {
    ctx = ctx || I.buildContext();
    var out = [];
    var mode = ctx.goal.mode, b = ctx.body, r = ctx.recovery, t = ctx.training;
    // Ziel „max Muskel“ + Recovery schlecht + hohes Volumen.
    if ((mode === "build" || mode === "perform") && (r.lastSleepQuality === "schlecht" || (r.sleepHours != null && r.sleepHours < 6.3))) {
      out.push({ severity: "medium", title: "Aufbau-Ziel trifft schwache Recovery", text: "Du willst aufbauen, aber Schlaf/Energie sind unten. Mehr Reiz ohne Erholung wird nicht zu mehr Muskel — erst Recovery, dann Volumen." });
    }
    // Ziel Fettabbau, aber Gewicht fällt zu schnell + Kraft bricht.
    if (mode === "cut" && b.weightTrend15 != null && b.weightTrend15 < -1.2 && t.avgE1rmPct != null && t.avgE1rmPct < 0) {
      out.push({ severity: "high", title: "Zu aggressiver Cut kostet Kraft", text: "Gewicht fällt schnell UND Kraft geht runter — das Defizit ist zu groß. Nicht blind weiter, Energie leicht erhöhen." });
    }
    // Build-Ziel mit Kaloriendefizit (Plan-Widerspruch).
    if (mode === "build" && ctx.nutrition.hasPlan && b.weightTrend15 != null && b.weightTrend15 < -0.3) {
      out.push({ severity: "medium", title: "Build-Ziel, aber Gewicht fällt", text: "Im Aufbau sollte das Gewicht langsam steigen. Prüfe, ob die Energie zum Ziel passt." });
    }
    return out;
  }

  /* ---------- PLAN CONSISTENCY AUDIT (§19) ---------- */
  function planConsistency(ctx) {
    ctx = ctx || I.buildContext();
    var checks = [];
    function ok(name, pass, note) { checks.push({ name: name, pass: pass, note: note || "" }); }
    ok("GOAL ↔ MODE", !!ctx.goal.mode, ctx.goal.mode ? "" : "Kein Modus gesetzt.");
    ok("MODE ↔ NUTRITION", ctx.nutrition.hasPlan, ctx.nutrition.hasPlan ? "" : "Kein Nutrition-Plan zum Modus.");
    ok("MODE ↔ TRAINING", ctx.training.hasPlan || ctx.cycle.active, (ctx.training.hasPlan || ctx.cycle.active) ? "" : "Kein Trainingsplan/aktiver Zyklus.");
    ok("TRAINING ↔ RECOVERY", !((ctx.recovery.sleepHours != null && ctx.recovery.sleepHours < 6.3) && (ctx.training.daysPerWeek || 0) >= 5), "Viel Trainingsfrequenz bei wenig Schlaf ist riskant.");
    ok("STACK ↔ GOAL", !ctx.stack.available || !(ctx.stack.labFlags || []).some(function (f) { return f.action === "avoid"; }), "Stack enthält etwas, das die Labwerte abraten.");
    ok("LABS ↔ MONITORING", !(ctx.pathway === "enhanced" && !ctx.labs.available), ctx.pathway === "enhanced" && !ctx.labs.available ? "Enhanced-Pfad ohne Monitoring-Labs." : "");
    ok("CALENDAR ↔ PLAN", true, "");
    ok("TODAY ↔ PROGRAM", !ctx.cycle.active || ctx.cycle.day != null, "");
    var fails = checks.filter(function (c) { return !c.pass; });
    return { checks: checks, fails: fails, ok: fails.length === 0 };
  }

  /* =======================================================================
     decide() — zentrale Arbitrierung zu EINER primären Entscheidung.
     Kandidaten kommen aus: NBA (os), Nutrition-Adjust (engine), Plateau,
     Labs-Priorität, Bottleneck. Priorisiert nach urgency/impact/confidence/
     reversibility/safety. Liefert Decision-Card-Struktur + Not-Now.
     ======================================================================= */
  function decide(ctx) {
    ctx = ctx || I.buildContext();
    var bn = bottleneck2(ctx);
    var cands = [];

    // 1) Sicherheit zuerst: kritischer Laborwert.
    (ctx.labs.priorities || []).forEach(function (p) {
      if (p.crit) cands.push({ type: "check", domain: "labs", urgency: 5, impact: 5, confidence: 4, reversible: true, title: p.name + " ärztlich prüfen", reason: p.reason, evidence: ["Labor-Priorität: " + p.name], deepLink: "#labmarker?m=" + p.marker });
    });

    // 2) Contradiction mit hoher Severity → auflösen.
    contradictions(ctx).forEach(function (c) { if (c.severity === "high") cands.push({ type: "change", domain: "plan", urgency: 4, impact: 4, confidence: 3, reversible: true, title: c.title, reason: c.text, evidence: ["Widerspruch im System"] }); });

    // 3) Nutrition-Adjust (deterministische Engine).
    if (ctx.nutrition.hasPlan && EN() && EN().nutritionAdjust) {
      var adj = EN().nutritionAdjust({
        mode: ctx.goal.mode, weightTrend: ctx.body.weightTrend15, waistTrend: ctx.body.waistTrend14,
        adherencePct: ctx.execution.consistency, energyLow: ctx.recovery.lastEnergy != null && ctx.recovery.lastEnergy <= 3, sleepBad: ctx.recovery.lastSleepQuality === "schlecht"
      });
      if (adj.code !== "keep") {
        var isChange = /adjust/.test(adj.code);
        cands.push({ type: isChange ? "change" : "watch", domain: "nutrition", urgency: 3, impact: isChange ? 4 : 2, confidence: ctx.execution.consistency != null ? 3 : 2, reversible: true, title: adj.title, reason: adj.text, evidence: buildNutriEvidence(ctx), deepLink: "#plan" });
      }
    }

    // 4) Recovery-Bottleneck → Fokus Schlaf.
    if (bn.domain === "recovery") cands.push({ type: "change", domain: "recovery", urgency: 3, impact: 4, confidence: 3, reversible: true, title: "Recovery priorisieren", reason: "Recovery ist aktuell dein Limiter — Schlaf-Konstanz schlägt mehr Volumen.", evidence: bn.evidence, deepLink: "#today" });

    // 5) Execution-Bottleneck → Konstanz halten (KEEP, kein neuer Plan).
    if (bn.domain === "execution") cands.push({ type: "keep", domain: "execution", urgency: 3, impact: 5, confidence: 4, reversible: true, title: "Umsetzung vor Optimierung", reason: "Der stärkste Hebel ist gerade nicht ein neuer Plan, sondern konstante Durchführung.", evidence: bn.evidence, deepLink: "#today" });

    // 6) Fallback: nächste beste Aktion aus dem OS (Programm-Tag etc.).
    if (!cands.length && MM.os && MM.os.nextBestAction) {
      var nba = MM.os.nextBestAction();
      if (nba.primary) cands.push({ type: "keep", domain: nba.primary.domain || "training", urgency: 2, impact: 3, confidence: 3, reversible: true, title: nba.primary.label, reason: "Halte den Kurs — das Rückgrat des Plans steht.", evidence: ["Kein akuter Anpassungsbedarf erkannt"], deepLink: nba.primary.deepLink });
    }

    // Arbitrierung: gewichteter Score, safety/urgency dominiert.
    cands.forEach(function (c) { c.score = c.urgency * 3 + c.impact * 2 + c.confidence - (c.reversible ? 0 : 2); });
    cands.sort(function (a, b) { return b.score - a.score; });
    var primary = cands[0] || { type: "keep", domain: "general", title: "Kurs halten", reason: "Genug Daten fehlen für eine Änderung — weitermachen und messen.", evidence: [], confidence: 2 };

    // NOT NOW: konkurrierende, aber nicht-primäre Kandidaten + Stop-Doing.
    var notNow = cands.slice(1, 3).map(function (c) { return c.title; }).concat(stopDoing(ctx).slice(0, 2));
    // One-Variable-Hinweis bei Änderungen.
    var oneVariable = primary.type === "change";
    return {
      primary: primary,
      candidates: cands,
      notNow: notNow.filter(function (x, i) { return notNow.indexOf(x) === i; }).slice(0, 4),
      bottleneck: bn,
      oneVariable: oneVariable,
      reviewInDays: primary.type === "change" ? 14 : primary.type === "check" ? 7 : 21
    };
  }
  function buildNutriEvidence(ctx) {
    var ev = [];
    if (ctx.body.weightTrend15 != null) ev.push("Gewichtstrend " + signed(ctx.body.weightTrend15) + " kg (Ø)");
    if (ctx.body.waistTrend14 != null) ev.push("Taillentrend " + signed(ctx.body.waistTrend14) + " cm");
    if (ctx.execution.consistency != null) ev.push("Umsetzung " + ctx.execution.consistency + "%");
    return ev;
  }

  function signed(v) { return v == null ? "—" : (v > 0 ? "+" : "") + I.util.round(v, 1); }

  /* ---------- MINIMUM VIABLE DAY (§75) ---------- */
  function minimumViableDay(ctx) {
    ctx = ctx || I.buildContext();
    var items = [];
    if (ctx.nutrition.protein) items.push("Protein-Floor: " + Math.round(ctx.nutrition.protein * 0.9) + " g");
    else items.push("Protein zu jeder Mahlzeit");
    items.push("30-Minuten-Einheit (Hauptübungen) statt voller Session");
    items.push((MM.os ? MM.os.getP("lifestyle.stepTarget", 7000) : 7000) - 1000 + " Schritte reichen heute");
    return { title: "MINIMUM VIABLE DAY", items: items, note: "Kein Perfektionismus — heute zählt Anwesenheit, nicht Bestleistung." };
  }

  I.decision = {
    decide: decide, bottleneck2: bottleneck2, trackBottleneck: trackBottleneck, bottleneckHistory: bottleneckHistory,
    leverage: leverage, stopDoing: stopDoing, contradictions: contradictions, planConsistency: planConsistency,
    minimumViableDay: minimumViableDay, BN_DOMAINS: BN_DOMAINS
  };
  try { if (MM.account && MM.account.registerStateDomain) MM.account.registerStateDomain("intelbnhist", "intel_bottleneck_hist", { append: true }); } catch (e) {}
})();
