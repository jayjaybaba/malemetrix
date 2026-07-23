/* ==========================================================================
   MALEMETRIX ACTIVATION ENGINE — MM.activation  (Phase 8, §4–§6, §25–§26)
   --------------------------------------------------------------------------
   Kanonisches Aktivierungsmodell. KEINE neue Datenquelle: jeder Meilenstein
   wird rein aus vorhandenem Zustand ABGELEITET (Score, Graph, Programm,
   Ledger, Metriken). Nichts wird doppelt gefragt, nichts wird simuliert.

   · milestones()  — Meilensteine mit done-Status (abgeleitet, idempotent)
   · stage()       — aktuelle Produktstufe für Progressive Disclosure
   · depth()       — Personalisierungstiefe: BASELINE → CONNECTED → ADAPTIVE
                     → CALIBRATED (statt "Profil 63 % vollständig")
   · coldStart()   — Kern-Signale der ersten 14 Tage ("3 von 6 etabliert")
   · mapData()     — Inhalt der Performance Map (aus Score + Intelligenz)
   · trackOnce()   — Funnel-Events GENAU EINMAL, ohne Gesundheitswerte (§55)
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var S = { get: function (k, d) { try { return MM.store.get(k, d); } catch (e) { return d; } } };
  function OS() { return MM.os; }
  function I() { return MM.intelligence; }
  function todayYmd() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function daySpan(a, b) { try { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); } catch (e) { return 0; } }

  /* ---------- Rohsignale (eine Leseschicht, keine Duplikate) ---------- */
  function raw() {
    var score = S.get("check_result", null);
    var daily = S.get("c2_daily", {}) || {};
    var anyDay = Object.keys(daily).some(function (k) { var r = daily[k] || {}; return !!(r.p || r.move || r.recover); });
    var wlogs = S.get("os_workout_logs", null) || {};
    var sessions = (wlogs._sessions || []).length;
    var weights = (OS() ? OS().metricSeries("weight") : []) || [];
    var pulse = S.get("c2_pulse", {}) || {};
    var ledger = [];
    try { ledger = I() && I().memory ? I().memory.ledger() : []; } catch (e) {}
    var responses = [];
    try { responses = I() && I().memory ? I().memory.responses() : []; } catch (e) {}
    var d = MM.account ? MM.account.getDashboardState() : { access: {}, program: {} };
    return {
      score: score, dash: d,
      pathway: OS() ? OS().pathway() : null,
      baseline: OS() ? OS().baseline() : null,
      anyProgramDay: anyDay, sessions: sessions,
      weights: weights, weightSpanDays: weights.length >= 2 ? daySpan(weights[0].date, weights[weights.length - 1].date) : 0,
      pulseCount: Object.keys(pulse).length,
      // "echte" Entscheidungen: nicht nur aus der Alt-Migration übernommen
      realDecisions: ledger.filter(function (x) { return !(x.meta && x.meta.legacy_id) && x.source !== "migration"; }),
      responses: responses,
      nutritionPlan: S.get("os_nutrition_plan", null)
    };
  }

  /* ---------- Meilensteine (§4) — Reihenfolge = Produktreise ---------- */
  var DEFS = [
    { key: "SCORED",              label: "Score abgeschlossen",        ev: "m_scored" },
    { key: "PATHWAY_SET",         label: "Pathway gewählt",            ev: "m_pathway" },
    { key: "SYSTEM_READY",        label: "System eingerichtet",        ev: "m_plan_created" },
    { key: "BASELINE_COMPLETE",   label: "Baseline dokumentiert",      ev: "m_baseline_complete" },
    { key: "FIRST_ACTION",        label: "Erste Aktion umgesetzt",     ev: "m_first_action" },
    { key: "FIRST_WEEK",          label: "Erste Woche geschafft",      ev: "m_week_complete" },
    { key: "FIRST_REVIEW",        label: "Erstes Weekly Review",       ev: "m_review_complete" },
    { key: "FIRST_ADAPTATION",    label: "Erste System-Anpassung",     ev: "m_first_adaptation" },
    { key: "FIRST_PROOF",         label: "Erster messbarer Verlauf",   ev: "m_proof_moment" },
    { key: "PAID",                label: "Vollzugang aktiv",           ev: null }  // purchase wird im Checkout getrackt
  ];
  function milestones() {
    var r = raw(); var p = r.dash.program || {};
    var done = {
      SCORED: !!r.score,
      PATHWAY_SET: !!r.pathway,
      SYSTEM_READY: !!(r.dash.access.twelve_week && p.active),
      BASELINE_COMPLETE: !!r.baseline,
      FIRST_ACTION: r.anyProgramDay || r.sessions > 0,
      FIRST_WEEK: !!(p.active && p.day >= 8 && p.consistency > 0),
      FIRST_REVIEW: r.pulseCount > 0,
      FIRST_ADAPTATION: r.realDecisions.length > 0,
      FIRST_PROOF: r.weightSpanDays >= 21 && r.weights.length >= 6,
      PAID: !!r.dash.access.protocol
    };
    return DEFS.map(function (d) { return { key: d.key, label: d.label, done: !!done[d.key], ev: d.ev }; });
  }
  function stage() {
    var ms = milestones();
    for (var i = 0; i < ms.length; i++) { if (!ms[i].done && ms[i].key !== "PAID") return ms[i].key; }
    return "ESTABLISHED";
  }

  /* ---------- Personalisierungstiefe (§26) ---------- */
  function depth() {
    var r = raw();
    var lvl = "NEU", explain = "", next = "";
    if (r.responses.length >= 1) {
      lvl = "CALIBRATED";
      explain = "MaleMetrix kann deine Entscheidungen mit deinen eigenen gemessenen Reaktionen vergleichen.";
      next = "Jede geschlossene Entscheidung schärft deine persönlichen Vorhersage-Bänder weiter.";
    } else if (r.realDecisions.length >= 1 && r.weightSpanDays >= 14) {
      lvl = "ADAPTIVE";
      explain = "Das System passt sich an: Entscheidungen werden protokolliert und nach der Review-Frist gegen echte Daten geprüft.";
      next = "Bei CALIBRATED vergleicht MaleMetrix neue Vorschläge mit dem, was bei DIR beim letzten Mal wirklich passiert ist.";
    } else if (r.weights.length >= 7 && r.sessions >= 3) {
      lvl = "CONNECTED";
      explain = "Genug laufende Daten für Trends: Gewichtsverlauf und Trainingshistorie sind verbunden.";
      next = "Die erste protokollierte System-Anpassung bringt dich auf ADAPTIVE.";
    } else if (r.score || r.baseline) {
      lvl = "BASELINE";
      explain = "Dein Ausgangspunkt ist erfasst. Empfehlungen basieren auf deiner Baseline — noch nicht auf deinem Verlauf.";
      next = "7 Gewichts-Einträge + 3 Sessions verbinden dein System (CONNECTED).";
    } else {
      explain = "Noch kein Ausgangspunkt. Der Score ist der schnellste Start.";
      next = "Score abschließen → BASELINE.";
    }
    return { level: lvl, explain: explain, next: next };
  }

  /* ---------- Cold Start (§25): Kern-Signale statt Chores ---------- */
  function coldStart() {
    var r = raw();
    var sig = [
      { key: "score",    label: "Score-Baseline",       ok: !!r.score },
      { key: "baseline", label: "Körper-Baseline",      ok: !!r.baseline },
      { key: "weight",   label: "Gewichtstrend",        ok: r.weights.length >= 8 },
      { key: "training", label: "Trainingsmuster",      ok: r.sessions >= 3 },
      { key: "review",   label: "Wochen-Puls",          ok: r.pulseCount >= 1 },
      { key: "nutrition",label: "Ernährungs-Ziel",      ok: !!r.nutritionPlan }
    ];
    var n = sig.filter(function (s) { return s.ok; }).length;
    var phase = n >= 5 ? "Persönliche Kalibrierung läuft" : n >= 3 ? "Muster werden sichtbar" : "Frühe Signale";
    return { signals: sig, established: n, total: sig.length, phase: phase,
      line: "MaleMetrix lernt deine Reaktion. " + n + " von " + sig.length + " Kern-Signalen etabliert." };
  }

  /* ---------- PERFORMANCE MAP (§5/§6/§92) — Daten, kein Rendering ---------- */
  function mapData() {
    var r = raw();
    if (!r.score) return null;
    var sc = r.score;
    var mode = (r.dash.program && r.dash.program.mode) || sc.plan || "";
    var MODE_TXT = {
      build: { name: "BUILD", dir: "Erwartung: +0,10 bis +0,35 % Körpergewicht pro Woche — Kraft steigt, Taille bleibt kontrolliert." },
      cut: { name: "CUT", dir: "Erwartung: −0,5 bis −1,0 % Körpergewicht pro Woche — Kraft halten, Taille fällt." },
      recomp: { name: "RECOMP", dir: "Erwartung: Gewicht nahezu stabil (−0,25 bis +0,15 %/Woche) — Taille fällt, Kraft steigt." },
      perform: { name: "PERFORM", dir: "Erwartung: Gewicht stabil — Leistung und Energie steigen messbar." }
    };
    var det = null, ctx = null;
    try { ctx = I() ? I().buildContext() : null; det = ctx ? I().decision.decide(ctx) : null; } catch (e) {}
    var first = det && det.primary ? { title: det.primary.title, reason: det.primary.reason }
      : { title: "Baseline anlegen und Woche 1 starten", reason: "Ohne dokumentierten Start ist Fortschritt später nicht beweisbar." };
    var notNow = (det && det.notNow && det.notNow.length ? det.notNow : ["Mehr Supplemente", "Programm-Hopping", "Detail-Optimierung vor der Basis"]).slice(0, 3);
    var dp = depth(); var cs = coldStart();
    return {
      archetype: (sc.archetype && sc.archetype.name) || "",
      total: sc.total != null ? sc.total : null,
      bottleneck: (sc.bottleneck && (sc.bottleneck.name || sc.bottleneck.key)) || "",
      bottleneckDyn: det && det.bottleneck ? { domain: det.bottleneck.domain, confidencePct: det.bottleneck.confidencePct } : null,
      weakest: (sc.weakest || []).slice(0, 3).map(function (w) { return { key: w.key || w[0], name: w.name || w.key || "", score: w.score != null ? w.score : w[1] }; }),
      pathway: r.pathway || null,
      mode: mode, modeName: (MODE_TXT[mode] || {}).name || (mode || "").toUpperCase(),
      direction: (MODE_TXT[mode] || {}).dir || "Richtung wird nach Modus-Wahl konkret.",
      first: first, notNow: notNow,
      confidence: { depth: dp.level, line: cs.established >= cs.total ? "Alle Kern-Signale etabliert." : cs.line },
      scoreDate: sc.date || null
    };
  }

  /* ---------- Funnel: jedes Milestone-Event GENAU EINMAL (§55/§91.23) ---------- */
  function trackOnce() {
    if (!MM.track) return;
    var sent = S.get("activation_sent", {}) || {};
    var dirty = false;
    milestones().forEach(function (m) {
      if (m.done && m.ev && !sent[m.ev]) { MM.track(m.ev, {}); sent[m.ev] = todayYmd(); dirty = true; }
    });
    if (dirty) { try { MM.store.set("activation_sent", sent); } catch (e) {} }
  }

  MM.activation = { milestones: milestones, stage: stage, depth: depth, coldStart: coldStart, mapData: mapData, trackOnce: trackOnce };
})();
