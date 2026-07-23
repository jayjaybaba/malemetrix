/* ==========================================================================
   MALEMETRIX INTELLIGENCE — PERSONAL PROTOCOL + TIMELINE
   (MM.intelligence.protocol / MM.intelligence.timeline)
   --------------------------------------------------------------------------
   MY PROTOCOL (§37–39): dynamisch zusammengesetztes persönliches Betriebs-
   handbuch (NICHT das allgemeine PROTOKOLL). Sektionen: Ziel · Phase · Training
   · Nutrition · Stack · Recovery · Monitoring · Priorität · REGELN · nächster
   Review. Personal Rules aus dem echten Plan (§38). Versionierung (§39): bei
   Planänderung neue Version + „was hat sich geändert“.

   TIMELINE (§115–118): eine vereinheitlichte Historie aus allen Domänen
   (Score, Programmstart, Nutrition-Adjust, PR, Lab-Panel, Experiment, Mode-
   Wechsel, Kontext-Modus …). Stabile IDs, idempotent.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var I = MM.intelligence = MM.intelligence || {};
  function store() { return MM.store; }
  function get(k, d) { try { return store() ? store().get(k, d) : d; } catch (e) { return d; } }
  function set(k, v) { try { if (store()) store().set(k, v); } catch (e) {} }
  function today() { return I.util.todayYmd(); }

  /* =======================================================================
     PERSONAL PROTOCOL
     ======================================================================= */
  function assemble(ctx) {
    ctx = ctx || I.buildContext();
    var L = I.LABELS;
    var bn = I.decision.bottleneck2(ctx);
    var sections = [];
    sections.push({ key: "goal", label: "MEIN ZIEL", value: (L.MODE[ctx.goal.mode] || ctx.goal.mode || "—") + (ctx.pathway ? " · " + ctx.pathway.toUpperCase() : ""), detail: goalDetail(ctx) });
    if (ctx.cycle.active) sections.push({ key: "phase", label: "MEINE PHASE", value: "Phase " + ctx.cycle.phase + " · Woche " + ctx.cycle.week, detail: (L.PHASE[ctx.cycle.phase] || "") });
    sections.push({ key: "training", label: "MEIN TRAINING", value: (ctx.training.daysPerWeek || "—") + " Tage/Woche", detail: ctx.training.hasPlan ? "Double Progression" : "Programm/Plan noch offen" });
    sections.push({ key: "nutrition", label: "MEINE NUTRITION", value: ctx.nutrition.hasPlan ? (ctx.nutrition.kcal + " kcal · " + ctx.nutrition.protein + " g P") : "kein Plan", detail: ctx.nutrition.kcalRange ? "Spanne " + ctx.nutrition.kcalRange[0] + "–" + ctx.nutrition.kcalRange[1] : "" });
    sections.push({ key: "stack", label: "MEIN STACK", value: ctx.stack.available && ctx.stack.items.length ? ctx.stack.items.slice(0, 4).join(", ") : "kein Stack", detail: (ctx.stack.labFlags || []).length ? ctx.stack.labFlags.length + " labor-informierte Hinweise" : "" });
    sections.push({ key: "recovery", label: "MEINE RECOVERY", value: (ctx.recovery.sleepHours != null ? ctx.recovery.sleepHours + " h Schlaf-Ziel" : "—"), detail: "" });
    sections.push({ key: "monitoring", label: "MEIN MONITORING", value: ctx.labs.available ? ctx.labs.markers + " Marker · " + (ctx.labs.rechecksDue ? ctx.labs.rechecksDue + " Recheck fällig" : "aktuell") : "keine Labs", detail: ctx.pathway === "enhanced" ? "Enhanced-Monitoring aktiv" : "" });
    sections.push({ key: "priority", label: "MEINE PRIORITÄT", value: I.LABELS.BN[bn.domain] || bn.domain, detail: bn.evidence[0] || "" });

    var rules = generateRules(ctx);
    var nextReview = ctx.cycle.nextReviewDays != null ? ("in " + ctx.cycle.nextReviewDays + " Tagen") : "wöchentlich";
    var proto = { version: null, date: today(), sections: sections, rules: rules, nextReview: nextReview, bottleneck: bn.domain };
    proto.fingerprint = fingerprint(proto);
    return proto;
  }
  function goalDetail(ctx) {
    var m = ctx.goal.mode;
    return m === "build" ? "Muskel aufbauen, Taille kontrolliert." : m === "cut" ? "Fett verlieren, Kraft halten." : m === "recomp" ? "Rekomposition." : m === "perform" ? "Leistung maximieren." : "Ziel definieren.";
  }
  /* PERSONAL RULES (§38) — aus echtem Plan generiert. */
  function generateRules(ctx) {
    var rules = [];
    if (ctx.nutrition.protein) rules.push("Protein-Floor: " + Math.round(ctx.nutrition.protein * 0.95) + " g/Tag.");
    rules.push("Kalorien nicht vor 14 Tagen ändern — außer der Trend überschreitet die Schwelle klar.");
    if (ctx.training.daysPerWeek) rules.push("Training: " + ctx.training.daysPerWeek + " Einheiten/Woche.");
    rules.push("Körpermaße wöchentlich (rollender Ø, keine Einzeltage).");
    if (ctx.recovery.sleepHours != null) rules.push("Schlaf-Ziel: " + ctx.recovery.sleepHours + " h+ konstant.");
    rules.push("Eine Variable pro Änderung — alles andere konstant halten.");
    if (ctx.labs.available && ctx.labs.rechecksDue) rules.push("Fällige Lab-Rechecks planen.");
    return rules;
  }
  function fingerprint(proto) {
    // Kompakte Signatur der planrelevanten Werte → erkennt echte Änderungen.
    return proto.sections.map(function (s) { return s.key + ":" + s.value; }).join("|");
  }

  /* Versionierung (§39): speichert nur, wenn sich der Fingerprint ändert. */
  function versions() { var v = get("intel_protocol_versions", []); return Array.isArray(v) ? v : []; }
  function current(ctx) {
    var proto = assemble(ctx);
    var vs = versions();
    var last = vs.length ? vs[vs.length - 1] : null;
    if (!last || last.fingerprint !== proto.fingerprint) {
      proto.version = (last ? last.version : 0) + 1;
      proto.changedFrom = last ? diffSections(last, proto) : null;
      var next = vs.concat([{ version: proto.version, date: proto.date, fingerprint: proto.fingerprint, sections: proto.sections, rules: proto.rules }]);
      if (next.length > 30) next = next.slice(-30);
      set("intel_protocol_versions", next);
      if (last && MM.os && MM.os.emit) MM.os.emit("PROTOCOL_VERSIONED", { version: proto.version });
    } else {
      proto.version = last.version;
      proto.changedFrom = null;
    }
    return proto;
  }
  function diffSections(oldV, newProto) {
    var changes = [];
    var oldMap = {}; (oldV.sections || []).forEach(function (s) { oldMap[s.key] = s.value; });
    newProto.sections.forEach(function (s) { if (oldMap[s.key] != null && oldMap[s.key] !== s.value) changes.push({ key: s.key, label: s.label, from: oldMap[s.key], to: s.value }); });
    return changes;
  }
  function versionHistory() { return versions(); }

  /* =======================================================================
     TIMELINE — vereinheitlichte Historie (§115–118). Idempotent über IDs.
     Baut sich aus vorhandenen Datenquellen zusammen (leseseitig), plus
     explizit geloggten Events.
     ======================================================================= */
  function typedEvents() { var e = get("intel_timeline", []); return Array.isArray(e) ? e : []; }
  function logEvent(ev) {
    var id = ev.id || (ev.type + ":" + ev.date + ":" + (ev.related_id || ev.title || ""));
    var list = typedEvents();
    if (list.some(function (x) { return x.id === id; })) return null;   // idempotent (§117)
    var entry = { id: id, date: ev.date || today(), type: ev.type, domain: ev.domain || "", title: ev.title || "", summary: ev.summary || "", source: ev.source || "system", related_id: ev.related_id || null };
    list.push(entry); if (list.length > 300) list = list.slice(-300); set("intel_timeline", list);
    return entry;
  }
  // Vollständige Timeline: geloggte Events + abgeleitete aus Domänen-Daten.
  function build(ctx) {
    ctx = ctx || I.buildContext();
    var events = typedEvents().slice();
    function push(e) { var id = e.id || (e.type + ":" + e.date + ":" + (e.related_id || e.title || "")); if (!events.some(function (x) { return x.id === id; })) events.push(Object.assign({ id: id }, e)); }
    // Score
    if (ctx.score.has) { var sr = MM.store ? MM.store.get("check_result", null) : null; if (sr && sr.date) push({ date: sr.date, type: "score", domain: "score", title: "MaleMetrix Score", summary: "Score " + (sr.total != null ? sr.total : "") }); }
    // Programmstart
    var start = MM.store ? MM.store.get("c2_start", "") : ""; if (start) push({ date: start, type: "program_start", domain: "training", title: "12-Week System gestartet", summary: (I.LABELS.MODE[ctx.goal.mode] || "") });
    // Lab-Panels
    if (MM.labs && MM.labs.panels) MM.labs.panels().forEach(function (p) { var nRes = (MM.labs.results ? MM.labs.results() : []).filter(function (r) { return r.panelId === p.id; }).length; push({ date: p.date, type: "lab_panel", domain: "labs", title: "Lab-Panel", summary: (p.labName || p.lab || "") + " · " + nRes + " Werte", related_id: p.id }); });
    // Entscheidungen (Ledger)
    if (I.memory) I.memory.ledger().forEach(function (d) { push({ date: d.date, type: "decision", domain: d.domain, title: d.title, summary: d.reason, related_id: d.id }); });
    // Experimente
    if (I.experiments) I.experiments.all().forEach(function (e) { push({ date: e.startDate, type: "experiment", domain: "experiment", title: e.title, summary: e.change, related_id: e.id }); });
    // Weekly Reviews
    if (I.review) I.review.reviews().forEach(function (r) { push({ date: r.date, type: "review", domain: "review", title: "Weekly Review W" + r.week, summary: r.verdict, related_id: r.id }); });
    events.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });   // neueste zuerst
    return events;
  }
  function search(query, ctx) {
    var q = String(query || "").toLowerCase();
    return build(ctx).filter(function (e) { return (e.title + " " + e.summary + " " + e.type + " " + e.domain).toLowerCase().indexOf(q) >= 0; });
  }
  function _clearAll() { set("intel_protocol_versions", []); set("intel_timeline", []); }

  I.protocol = { assemble: assemble, current: current, versionHistory: versionHistory, generateRules: generateRules };
  I.timeline = { build: build, logEvent: logEvent, search: search, _clearAll: _clearAll };
  try {
    if (MM.account && MM.account.registerStateDomain) {
      MM.account.registerStateDomain("intelprotocol", "intel_protocol_versions", { append: true });
      MM.account.registerStateDomain("inteltimeline", "intel_timeline", { append: true });
    }
  } catch (e) {}
})();
