/* ==========================================================================
   MALEMETRIX — PERSONAL PERFORMANCE INTELLIGENCE · CORE  (MM.intelligence)
   --------------------------------------------------------------------------
   PHASE 5 THINKS. PHASE 6 EXECUTES.
   Diese Schicht VERSTEHT, PRIORISIERT und ENTSCHEIDET über der Domänen-Wahrheit
   (Score · Program · Training · Nutrition · Labs · Metrics · Weekly Pulse) und
   über der AUSFÜHRUNGS-REALITÄT von MM.exec (geplant/erledigt/verpasst/
   Konsistenz/Day-Close). Sie baut KEINE Parallel-App: sie speist MM.exec
   (EIN Ledger, EIN Today, EINE NBA) und lernt aus dem, was real passiert ist.

   Core stellt bereit:
     · util            — Frische-/Konfidenz-Modell (freshness × evidence)
     · memory          — strukturierte, append-only Längsschnitt-Erinnerung
                          (KEIN Future-Data-Leak: Snapshots sind datiert)
     · context()       — Canonical Context Builder → Personal Performance Snapshot
     · twin()          — Digital Twin (konsumiert MM.exec-Ausführungsrealität)
     · bottleneck()    — Dynamic Bottleneck Engine 2.0 (evidenz-gewichtet)
     · contradictions()— Contradiction Engine (widersprüchliche Signale finden)
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var I = MM.intelligence = MM.intelligence || {};
  var S = {
    get: function (k, d) { try { return MM.store ? MM.store.get(k, d) : d; } catch (e) { return d; } },
    set: function (k, v) { try { if (MM.store) MM.store.set(k, v); } catch (e) {} }
  };
  function OS() { return MM.os; }
  function EX() { return MM.exec; }
  function EN() { return MM.engines; }
  function PV() { return MM.programView; }
  function LB() { return MM.labs; }
  function todayYmd() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function parseYmdUTC(s) { var p = String(s || "").split("-"); return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
  function diffDays(a, b) { return Math.round((parseYmdUTC(b) - parseYmdUTC(a)) / 86400000); }

  /* ======================= FRESHNESS × CONFIDENCE ======================= */
  // Konfidenz ist NICHT nur "wie viele Daten", sondern auch "wie frisch".
  // Ein 6 Wochen alter Gewichtstrend ist schwache Evidenz für HEUTE.
  var FRESH = {   // Halbwertszeit-Fenster in Tagen je Signaltyp
    weight: 10, waist: 21, sleep: 5, energy: 5, strength: 21,
    nutrition_adherence: 10, pulse: 10, labs: 120
  };
  var CONF_RANK = { none: 0, low: 1, medium: 2, high: 3 };
  function freshness(type, lastDate, refYmd) {
    if (!lastDate) return 0;
    var age = diffDays(lastDate, refYmd || todayYmd());
    var w = FRESH[type] || 14;
    if (age <= 0) return 1;
    // linear bis w Tage, danach schnell abfallend
    return Math.max(0, Math.round((1 - Math.min(1, age / (w * 2))) * 100) / 100);
  }
  // Konfidenz aus (Datenpunkte n) × (Frische) → none/low/medium/high
  function confidenceOf(n, fresh) {
    if (!n) return "none";
    var f = fresh == null ? 1 : fresh;
    if (n >= 4 && f >= 0.6) return "high";
    if (n >= 3 && f >= 0.4) return "medium";
    if (n >= 2 && f >= 0.2) return "low";
    return n >= 1 ? "low" : "none";
  }
  function minConf(a, b) { return CONF_RANK[a] <= CONF_RANK[b] ? a : b; }

  I.util = {
    freshness: freshness, confidenceOf: confidenceOf, minConf: minConf,
    CONF_RANK: CONF_RANK, diffDays: diffDays, todayYmd: todayYmd
  };

  /* ======================= LONGITUDINAL MEMORY ======================= */
  // Datierte Snapshots. Wöchentlich gestempelt. Historische Reviews dürfen
  // NUR Snapshots verwenden, die zum jeweiligen Zeitpunkt existierten
  // (kein Future-Data-Leak) — asOf(ymd) filtert streng nach date <= ymd.
  function memoryLog() { var m = S.get("intel_memory", []); return Array.isArray(m) ? m : []; }
  function remember(snapshot, ymd) {
    var date = ymd || todayYmd();
    var log = memoryLog();
    // idempotent pro Tag: überschreibt denselben Tag statt zu duplizieren
    var idx = log.findIndex(function (x) { return x.date === date; });
    var rec = { date: date, snapshot: snapshot };
    if (idx >= 0) log[idx] = rec; else log.push(rec);
    log.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    if (log.length > 200) log = log.slice(log.length - 200);
    S.set("intel_memory", log);
    return rec;
  }
  function asOf(ymd) {
    var log = memoryLog().filter(function (x) { return x.date <= ymd; });
    return log.length ? log[log.length - 1] : null;
  }
  function memoryBetween(fromYmd, toYmd) {
    return memoryLog().filter(function (x) { return x.date >= fromYmd && x.date <= toYmd; });
  }
  I.memory = { log: memoryLog, remember: remember, asOf: asOf, between: memoryBetween };

  /* ======================= CANONICAL CONTEXT BUILDER ======================= */
  // Ein Schnappschuss der Person JETZT: verbindet Domänen-Wahrheit +
  // Ausführungsrealität zu einem konsistenten Objekt, das jede Intelligenz-
  // Funktion liest (statt überall dieselben Rohdaten neu zu ziehen).
  function metricTrendSafe(type, win) { try { return OS() && OS().metricTrend ? OS().metricTrend(type, win) : null; } catch (e) { return null; } }
  function signal(type, value, n, lastDate) {
    return { type: type, value: value, n: n || 0, lastDate: lastDate || null, fresh: freshness(type, lastDate), confidence: confidenceOf(n || 0, freshness(type, lastDate)) };
  }
  function nutritionAdherenceSignal(ymd) {
    // aus echtem Food-Log der letzten 7 Tage (MM.exec.foodLog / MM.os.nutritionLog)
    var np = S.get("os_nutrition_plan", null); if (!np) return signal("nutrition_adherence", null, 0, null);
    // SSOT: os_nutrition_log ist die volle Tages-Map (MM.os.nutritionLog).
    // MM.exec.foodLog(ymd) liefert bewusst nur EINEN Tag — hier brauchen wir die Map.
    var log = {}; try { log = (OS() && OS().nutritionLog) ? OS().nutritionLog() : (S.get("os_nutrition_log", {}) || {}); } catch (e) { log = {}; }
    var dates = []; for (var i = 1; i <= 7; i++) { var dt = new Date(parseYmdUTC(ymd || todayYmd()) - i * 86400000); dates.push(dt.getUTCFullYear() + "-" + String(dt.getUTCMonth() + 1).padStart(2, "0") + "-" + String(dt.getUTCDate()).padStart(2, "0")); }
    var adh = EN() && EN().weeklyAdherence ? EN().weeklyAdherence(log, np, dates) : { daysLogged: 0, proteinDays: 0 };
    var last = null; Object.keys(log).forEach(function (d) { if (log[d] && log[d].length && (!last || d > last)) last = d; });
    var pct = adh.daysLogged ? Math.round(adh.proteinDays / adh.daysLogged * 100) : null;
    var s = signal("nutrition_adherence", { proteinDays: adh.proteinDays, daysLogged: adh.daysLogged, pct: pct, energyDays: adh.energyDays }, adh.daysLogged, last);
    return s;
  }
  function strengthSignal() {
    var logs = S.get("os_workout_logs", {}) || {};
    var ex = {}; Object.keys(logs).forEach(function (k) { if (k.charAt(0) !== "_" && Array.isArray(logs[k])) ex[k] = logs[k]; });
    var trend = EN() && EN().strengthTrend ? EN().strengthTrend(ex) : null;
    var last = null; Object.keys(ex).forEach(function (k) { ex[k].forEach(function (r) { if (!last || r.date > last) last = r.date; }); });
    var n = trend ? trend.lifts.reduce(function (a, l) { return a + 2; }, 0) : 0;
    return signal("strength", trend, trend ? trend.lifts.length + 1 : 0, last);
  }

  function context(ymd) {
    ymd = ymd || todayYmd();
    var d = {}; try { d = OS() && MM.account ? MM.account.getDashboardState() : {}; } catch (e) { d = {}; }
    var p = d.program || {};
    var wt = metricTrendSafe("weight", 7), wa = metricTrendSafe("waist", 7);
    var w0 = OS() && OS().firstMetric ? OS().firstMetric("weight") : null;
    var wN = OS() && OS().latestMetric ? OS().latestMetric("weight") : null;
    var weightN = OS() ? OS().metricSeries("weight").length : 0;
    var waistN = OS() ? OS().metricSeries("waist").length : 0;
    var pulse = null; try { pulse = OS() && OS().lastPulse ? OS().lastPulse() : null; } catch (e) {}
    var pw = OS() && OS().pathway ? OS().pathway() : "";
    var lab = null;
    try { if (LB()) lab = { priorities: LB().priorities(), rechecksDue: LB().rechecksDue().length, stackContext: LB().stackContext() }; } catch (e) {}
    var snap = {
      date: ymd,
      identity: { age: OS() ? OS().getP("identity.age", null) : null, pathway: pw },
      goal: { mode: d.mode || (OS() ? OS().getP("goals.mode", "") : ""), bottleneckDeclared: d.bottleneck || "" },
      program: { active: !!p.active, notStarted: !!p.notStarted, over: !!p.over, day: p.day || null, week: p.week || null, phase: p.phase || null, consistency: p.consistency != null ? p.consistency : null },
      signals: {
        weight: signal("weight", wt ? { deltaPerWeek: wt.delta, recent: wt.recent } : null, weightN, wN ? wN.date : null),
        waist: signal("waist", wa ? { deltaPerWeek: wa.delta } : null, waistN, OS() && OS().latestMetric ? (OS().latestMetric("waist") || {}).date : null),
        strength: strengthSignal(),
        nutrition: nutritionAdherenceSignal(ymd),
        pulse: signal("pulse", pulse ? { energy: pulse.inp && pulse.inp.energy, sleep: pulse.inp && pulse.inp.sleep, verdict: pulse.verdict && pulse.verdict.code, stagnant: !!pulse.stagnant } : null, pulse ? 1 : 0, pulse ? pulse.ts : null)
      },
      body: { weightStart: w0 ? w0.value : null, weightNow: wN ? wN.value : null, weightDelta: (w0 && wN) ? Math.round((wN.value - w0.value) * 10) / 10 : null },
      labs: lab,
      execution: twin(ymd)
    };
    return snap;
  }

  /* ======================= DIGITAL TWIN ======================= */
  // Kein theoretisches Modell — das digitale Abbild dessen, was der Nutzer
  // WIRKLICH getan hat: geplant vs. erledigt, verpasst, Konsistenz, Day-Close,
  // Trainings-Progression, Nutrition-Adhärenz, Kontext-Störungen.
  function twin(ymd) {
    ymd = ymd || todayYmd();
    var t = { consistency28: null, missedThisWeek: 0, overlayActive: null, dayClosedYesterday: null, trainingProgressing: null, nutritionLogging: null, absenceDays: 0 };
    try {
      if (EX()) {
        if (EX().consistency28) t.consistency28 = EX().consistency28();
        if (EX().missedThisWeek) t.missedThisWeek = EX().missedThisWeek().filter(function (m) { return !m.handled; }).length;
        if (EX().activeOverlay) { var ov = EX().activeOverlay(ymd); t.overlayActive = ov ? ov.mode : null; }
        if (EX().absenceDays) t.absenceDays = EX().absenceDays();
        if (EX().isDayClosed) { var y = new Date(parseYmdUTC(ymd) - 86400000); var yy = y.getUTCFullYear() + "-" + String(y.getUTCMonth() + 1).padStart(2, "0") + "-" + String(y.getUTCDate()).padStart(2, "0"); t.dayClosedYesterday = EX().isDayClosed(yy); }
      }
    } catch (e) {}
    // Progression aus Kraft-Trend
    var st = strengthSignal();
    t.trainingProgressing = st.value ? (st.value.pct > 0.5) : null;
    // Nutrition-Logging aktiv?
    var na = nutritionAdherenceSignal(ymd);
    t.nutritionLogging = na.n >= 3;
    t.nutritionAdherencePct = na.value ? na.value.pct : null;
    return t;
  }
  I.context = context;
  I.twin = twin;

  /* ======================= DYNAMIC BOTTLENECK ENGINE 2.0 ======================= */
  // Nicht der einmal im Score deklarierte Engpass — der AKTUELL limitierende,
  // evidenz-gewichtet aus echten Signalen. Fällt auf den deklarierten zurück,
  // wenn zu wenig frische Daten da sind (ehrlich: dann niedrige Konfidenz).
  function bottleneck(ctx) {
    ctx = ctx || context();
    var sig = ctx.signals;
    var cand = [];
    // Recovery: schlechte Pulse-Energie/Schlaf ODER low_recovery overlay.
    // Ein expliziter Selbstbericht (Energie ≤2 UND Schlaf schlecht) ist starke
    // Wochen-Evidenz — er zählt als medium, nicht als schwaches Trend-Signal.
    if (sig.pulse.value && (sig.pulse.value.energy <= 2 || sig.pulse.value.sleep === "bad")) {
      var pulseStrong = sig.pulse.value.energy <= 2 && sig.pulse.value.sleep === "bad";
      cand.push({ key: "recovery", weight: 3, conf: pulseStrong ? "medium" : sig.pulse.confidence, why: "Energie/Schlaf im Weekly Pulse unten." });
    }
    if (ctx.execution.overlayActive === "low_recovery") cand.push({ key: "recovery", weight: 2, conf: "medium", why: "Low-Recovery-Overlay aktiv." });
    // Lifestyle/Execution: Konsistenz niedrig
    if (ctx.execution.consistency28 != null && ctx.execution.consistency28 < 60) cand.push({ key: "lifestyle", weight: 3, conf: "high", why: "28-Tage-Konsistenz unter 60 %." });
    else if (ctx.program.consistency != null && ctx.program.consistency < 60) cand.push({ key: "lifestyle", weight: 2, conf: "medium", why: "Programm-Konsistenz niedrig." });
    // Nutrition/Metabolic: Adhärenz niedrig bei aktivem Plan
    if (sig.nutrition.value && sig.nutrition.value.pct != null && sig.nutrition.value.pct < 60 && sig.nutrition.value.daysLogged >= 3) cand.push({ key: "metabolic", weight: 2, conf: sig.nutrition.confidence, why: "Protein-Adhärenz unter 60 % (geloggt)." });
    // Body: Taille stagniert/steigt im Cut, oder Gewicht steigt+Taille steigt
    if (ctx.goal.mode === "cut" && sig.waist.value && sig.waist.value.deltaPerWeek != null && sig.waist.value.deltaPerWeek > -0.1) cand.push({ key: "body", weight: 2, conf: sig.waist.confidence, why: "Taillentrend im Cut steht." });
    // Strength: Kraft stagniert bei aktivem Training
    if (sig.strength.value && sig.strength.value.pct != null && sig.strength.value.pct <= 0.5 && ctx.program.active) cand.push({ key: "strength", weight: 2, conf: sig.strength.confidence, why: "Kraft-Trend (e1RM) stagniert." });
    // Labs: Enhanced + hoher/steigender Hämatokrit → medical/monitoring
    if (ctx.labs && ctx.labs.stackContext && ctx.labs.stackContext.flags && ctx.labs.stackContext.flags.hematocritHigh) cand.push({ key: "medical", weight: 3, conf: "medium", why: "Labor: Hämatokrit hoch — Monitoring-Priorität." });

    if (!cand.length) {
      var declared = ctx.goal.bottleneckDeclared || "recovery";
      return { key: declared, confidence: "low", source: "declared", why: "Zu wenig frische Signale — bleibt beim Score-Engpass.", candidates: [] };
    }
    // aggregiere pro key
    var agg = {};
    cand.forEach(function (c) { if (!agg[c.key]) agg[c.key] = { key: c.key, score: 0, conf: c.conf, whys: [] }; agg[c.key].score += c.weight; agg[c.key].whys.push(c.why); agg[c.key].conf = minConf(agg[c.key].conf, c.conf) === "none" ? c.conf : (CONF_RANK[c.conf] > CONF_RANK[agg[c.key].conf] ? c.conf : agg[c.key].conf); });
    var arr = Object.keys(agg).map(function (k) { return agg[k]; }).sort(function (a, b) { return b.score - a.score; });
    var top = arr[0];
    return { key: top.key, confidence: top.conf, source: "dynamic", why: top.whys.join(" "), candidates: arr.map(function (a) { return { key: a.key, score: a.score }; }) };
  }
  I.bottleneck = bottleneck;

  /* ======================= CONTRADICTION ENGINE ======================= */
  // Findet widersprüchliche Signale, die eine naive Empfehlung kippen würden.
  function contradictions(ctx) {
    ctx = ctx || context();
    var out = [];
    var s = ctx.signals;
    // "Gewicht runter, aber Adhärenz niedrig" → Verlust ist evtl. Zufall/Wasser
    if (ctx.goal.mode === "cut" && s.weight.value && s.weight.value.deltaPerWeek < -0.3 && s.nutrition.value && s.nutrition.value.pct != null && s.nutrition.value.pct < 60) out.push({ type: "loss_without_adherence", text: "Gewicht fällt trotz niedriger Adhärenz — der Trend ist wahrscheinlich Rauschen, keine belastbare Basis für eine Kalorien-Änderung." });
    // "Kraft rauf, aber Gewicht fällt schnell" → Recomp-Risiko / zu aggressiv
    if (s.strength.value && s.strength.value.pct > 3 && s.weight.value && s.weight.value.deltaPerWeek < -0.8) out.push({ type: "strength_up_weight_fast_down", text: "Kraft steigt, aber das Gewicht fällt schnell — schön, aber schwer haltbar; Erwartung an das Tempo prüfen." });
    // "Adhärenz hoch, Trend steht, Recovery unten" → nicht Kalorien, erst Recovery
    if (s.nutrition.value && s.nutrition.value.pct >= 80 && s.pulse.value && (s.pulse.value.energy <= 2 || s.pulse.value.sleep === "bad")) out.push({ type: "adherence_high_recovery_low", text: "Umsetzung stimmt, aber Recovery ist unten — erst Schlaf/Erholung, nicht das Ziel verschärfen." });
    return out;
  }
  I.contradictions = contradictions;

  // Öffentlicher Snapshot mit Merken (für Timeline/Review). Speichert NUR wenn
  // explizit aufgerufen (z. B. Day-Close / Weekly Review) — kein stiller Spam.
  I.snapshot = function (ymd, persist) {
    var ctx = context(ymd);
    ctx.bottleneck = bottleneck(ctx);
    ctx.contradictions = contradictions(ctx);
    if (persist) remember({ bottleneck: ctx.bottleneck, body: ctx.body, execution: ctx.execution, goal: ctx.goal }, ymd);
    return ctx;
  };
})();
