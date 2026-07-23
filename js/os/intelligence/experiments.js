/* ==========================================================================
   MALEMETRIX INTELLIGENCE — EXPERIMENT ENGINE  (MM.intelligence.experiments)
   --------------------------------------------------------------------------
   Kontrollierte Selbst-Optimierung (§63–68). Jedes Experiment hat eine
   Hypothese, EINE Änderung, primäres/sekundäres Outcome, Dauer, „konstant
   halten“, Start/Ende, Ergebnis. One-Change-at-a-Time (§65). Ergebnis-Klassen
   ohne Kausalitäts-Übertreibung (§66). N-of-1-Lernen (§67) via Response Memory.
   Nie blind ein fehlgeschlagenes Experiment wiederholen (§68).
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var I = MM.intelligence = MM.intelligence || {};
  function store() { return MM.store; }
  function get(k, d) { try { return store() ? store().get(k, d) : d; } catch (e) { return d; } }
  function set(k, v) { try { if (store()) store().set(k, v); } catch (e) {} }
  function today() { return I.util.todayYmd(); }
  function uid() { var c = get("intel_seq", 0) || 0; c++; set("intel_seq", c); return "exp_" + c; }

  function all() { var e = get("intel_experiments", []); return Array.isArray(e) ? e : []; }
  function saveAll(e) { set("intel_experiments", e); }

  /* Vorlagen (§63) — konkrete, ein-Variablen-Experimente. */
  var TEMPLATES = [
    { key: "caffeine_cutoff", title: "Koffein-Cutoff vorziehen", change: "Kein Koffein nach 14 Uhr", primary: "Schlafqualität", secondary: "Morgen-Energie", durationDays: 14, keepConstant: ["Training", "Kalorien", "Bettzeit"] },
    { key: "protein_breakfast", title: "Protein-Frühstück", change: "40 g Protein zum Frühstück", primary: "Sättigung/Heißhunger", secondary: "Protein-Tagesziel", durationDays: 21, keepConstant: ["Kalorien gesamt", "Training"] },
    { key: "steps_10k", title: "10.000 Schritte/Tag", change: "Schrittziel auf 10k", primary: "Taillentrend", secondary: "Energie", durationDays: 28, keepConstant: ["Kalorien", "Training"] },
    { key: "creatine", title: "Kreatin konsequent", change: "Täglich 5 g Kreatin", primary: "Kraft (e1RM)", secondary: "Körpergewicht (Wasser)", durationDays: 42, keepConstant: ["Training", "Kalorien"] },
    { key: "sleep_consistency", title: "Feste Bettzeit", change: "Bettzeit ±30 min konstant", primary: "Energie/Recovery", secondary: "Trainings-Umsetzung", durationDays: 21, keepConstant: ["Training", "Kalorien"] },
    { key: "training_freq", title: "Trainingsfrequenz ändern", change: "Frequenz um 1 Tag ändern", primary: "Kraft (e1RM)", secondary: "Recovery", durationDays: 42, keepConstant: ["Kalorien", "Übungsauswahl"] }
  ];

  /* Guard: aktives Experiment vorhanden? (One-Change-at-a-Time §65) */
  function active() { return all().filter(function (e) { return e.status === "running"; }); }
  function canStart() { return active().length === 0; }

  /* Wurde dieses Experiment schon einmal (erfolglos) probiert? (§68) */
  function priorAttempts(key) { return all().filter(function (e) { return e.key === key && e.status === "done"; }); }

  function start(templateKeyOrDef, ctx) {
    ctx = ctx || I.buildContext();
    var def = typeof templateKeyOrDef === "string" ? TEMPLATES.filter(function (t) { return t.key === templateKeyOrDef; })[0] : templateKeyOrDef;
    if (!def) return { ok: false, code: "unknown_template" };
    if (!canStart()) return { ok: false, code: "already_running", running: active()[0] };
    // Baseline-Snapshot der relevanten Größen (für ehrlichen Vor/Nach-Vergleich).
    var baseline = snapshotMetrics(ctx);
    var exp = {
      id: uid(), key: def.key || "custom", title: def.title, change: def.change, hypothesis: def.hypothesis || (def.change + " verbessert " + def.primary),
      primary: def.primary, secondary: def.secondary, keepConstant: def.keepConstant || [],
      durationDays: def.durationDays || 21, startDate: today(), endDate: I.memory.addDays(today(), def.durationDays || 21),
      status: "running", baseline: baseline, result: null, created: today()
    };
    var list = all(); list.push(exp); saveAll(list);
    var prior = priorAttempts(exp.key);
    if (MM.os && MM.os.emit) MM.os.emit("EXPERIMENT_STARTED", { key: exp.key });
    return { ok: true, experiment: exp, priorAttempts: prior.length, priorNote: prior.length ? "Dieses Experiment hast du schon " + prior.length + "× durchgeführt — letztes Ergebnis: " + (prior[prior.length - 1].result ? prior[prior.length - 1].result.verdict : "unklar") + "." : "" };
  }

  function snapshotMetrics(ctx) {
    return {
      weight: ctx.body.weight, waist: ctx.body.waist, weightTrend: ctx.body.weightTrend15,
      strengthPct: ctx.training.avgE1rmPct, sleep: ctx.recovery.sleepHours, energy: ctx.recovery.lastEnergy,
      date: ctx.builtAt
    };
  }

  function dueForReview() { var t = today(); return active().filter(function (e) { return e.endDate <= t; }); }

  /* Auswerten (§66): Ergebnisklassen ohne Kausalitäts-Übertreibung. */
  function evaluate(id, ctx) {
    ctx = ctx || I.buildContext();
    var list = all(); var i = list.findIndex(function (e) { return e.id === id; }); if (i < 0) return { ok: false };
    var exp = list[i];
    var post = snapshotMetrics(ctx);
    var deltas = diff(exp.baseline, post);
    var verdict = classify(exp, deltas);
    exp.status = "done"; exp.endedAt = today(); exp.post = post; exp.deltas = deltas;
    exp.result = { verdict: verdict.verdict, text: verdict.text, deltas: deltas };
    list[i] = exp; saveAll(list);
    // N-of-1: als Response Memory ablegen (OBSERVED, nicht kausal §67).
    if (I.memory) I.memory.recordResponse(
      { domain: "experiment", change: exp.change, changeKind: exp.key, startDate: exp.startDate },
      { weightDelta: deltas.weight, waistDelta: deltas.waist, strengthPct: deltas.strengthPct, windowDays: exp.durationDays },
      { note: "Experiment: " + exp.title + " → " + verdict.verdict }
    );
    if (MM.os && MM.os.emit) MM.os.emit("EXPERIMENT_COMPLETED", { key: exp.key });
    return { ok: true, experiment: exp };
  }
  function diff(a, b) {
    function d(k) { return (a && a[k] != null && b && b[k] != null) ? I.util.round(b[k] - a[k], 2) : null; }
    return { weight: d("weight"), waist: d("waist"), strengthPct: d("strengthPct"), sleep: d("sleep"), energy: d("energy") };
  }
  // Grobe, konservative Klassifikation je nach primärem Outcome.
  function classify(exp, deltas) {
    var primary = (exp.primary || "").toLowerCase();
    var signalKey = /kraft|e1rm|strength/.test(primary) ? "strengthPct" : /taille|waist/.test(primary) ? "waist" : /energie|recovery|schlaf|sleep/.test(primary) ? "energy" : /sätt|heißhunger/.test(primary) ? null : null;
    var v = signalKey ? deltas[signalKey] : null;
    if (v == null) return { verdict: "INCONCLUSIVE", text: "Nicht genug objektive Daten zum primären Outcome — subjektiver Eindruck zählt, aber keine belastbare Aussage." };
    var better = signalKey === "waist" ? v < -0.5 : v > (signalKey === "strengthPct" ? 1.5 : 0.4);
    var worse = signalKey === "waist" ? v > 0.5 : v < -(signalKey === "strengthPct" ? 1.5 : 0.4);
    if (better) return { verdict: "LIKELY HELPED", text: "Das primäre Outcome bewegte sich in die gewünschte Richtung (" + signed(v) + ") — im Zeitfenster des Experiments. Korrelation, keine bewiesene Kausalität." };
    if (worse) return { verdict: "LIKELY NO EFFECT", text: "Kein Vorteil erkennbar (" + signed(v) + ") — nicht blind wiederholen." };
    return { verdict: "NO CLEAR SIGNAL", text: "Kein deutliches Signal (" + signed(v) + ") — im Rauschen. Länger testen oder anders messen." };
  }
  function signed(v) { return v == null ? "—" : (v > 0 ? "+" : "") + I.util.round(v, 1); }

  function history() { return all().filter(function (e) { return e.status === "done"; }); }
  function _clearAll() { set("intel_experiments", []); }

  I.experiments = {
    templates: function () { return TEMPLATES; }, all: all, active: active, canStart: canStart, priorAttempts: priorAttempts,
    start: start, dueForReview: dueForReview, evaluate: evaluate, history: history, _clearAll: _clearAll
  };
  try { if (MM.account && MM.account.registerStateDomain) MM.account.registerStateDomain("intelexperiments", "intel_experiments", { append: true }); } catch (e) {}
})();
