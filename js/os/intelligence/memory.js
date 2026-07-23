/* ==========================================================================
   MALEMETRIX INTELLIGENCE — MEMORY + DECISION LEDGER  (MM.intelligence.memory)
   --------------------------------------------------------------------------
   Strukturierte, LANGFRISTIGE Erinnerung — kein Chat-Verlauf. Das ist der
   Kern des Moats: das System merkt sich, was probiert wurde und was folgte.

   Memory-Typen (§11):
     goal        — Ziele über Zeit
     preference  — Vorlieben (z. B. „max. 40 min Kochen“, „kein Frühsport“)
     constraint  — Randbedingungen (Zeit, Equipment, Verletzung)
     response    — INTERVENTION → beobachtete Reaktion (§12), keine Kausalität
     decision    — Decision Ledger (§13): jede bedeutsame Planänderung
     experiment  — Experiment-Referenzen (Detail in experiments.js)
     coaching    — Notizen aus Advisor/Coach-Interaktionen

   Alles append-orientiert, syncbar (append:true), exportierbar, löschbar.
   User kann Memory einsehen/korrigieren (Memory Center §98).
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var I = MM.intelligence = MM.intelligence || {};
  function store() { return MM.store; }
  function get(k, d) { try { return store() ? store().get(k, d) : d; } catch (e) { return d; } }
  function set(k, v) { try { if (store()) store().set(k, v); } catch (e) {} }
  function todayYmd() { return I.util.todayYmd(); }

  /* deterministische ID (kein Math.random — reproduzierbar, resume-sicher) */
  function uid(prefix) { var c = get("intel_seq", 0) || 0; c++; set("intel_seq", c); return (prefix || "m") + "_" + c; }

  /* ---------- generische Memory-Liste ---------- */
  function all() { var m = get("intel_memory", []); return Array.isArray(m) ? m : []; }
  function saveAll(m) { set("intel_memory", m); }
  function byType(type) { return all().filter(function (x) { return x.type === type; }); }

  function remember(type, data, opts) {
    opts = opts || {};
    var entry = Object.assign({ id: uid(type.slice(0, 3)), type: type, date: data.date || todayYmd(), created: todayYmd(), source: opts.source || "system", confidence: opts.confidence || null }, data);
    // Dedupe für stabile Fakten (goal/preference/constraint) per key.
    if (opts.key) {
      var list = all(); var idx = list.findIndex(function (x) { return x.type === type && x.key === opts.key; });
      entry.key = opts.key;
      if (idx >= 0) { entry.id = list[idx].id; entry.created = list[idx].created; entry.updated = todayYmd(); list[idx] = entry; saveAll(list); return entry; }
      list.push(entry); saveAll(list); return entry;
    }
    var l2 = all(); l2.push(entry); saveAll(l2); return entry;
  }
  function forget(id) { var l = all(); var n = l.filter(function (x) { return x.id !== id; }); if (n.length === l.length) return false; saveAll(n); return true; }
  function updateMemory(id, patch) { var l = all(); var i = l.findIndex(function (x) { return x.id === id; }); if (i < 0) return false; l[i] = Object.assign({}, l[i], patch, { updated: todayYmd() }); saveAll(l); return true; }

  /* ---------- Fakten-Convenience ---------- */
  function setGoal(text, meta) { return remember("goal", Object.assign({ text: text }, meta || {}), { key: "current_goal", source: "user" }); }
  function setPreference(key, text) { return remember("preference", { text: text }, { key: key, source: "user" }); }
  function setConstraint(key, text) { return remember("constraint", { text: text }, { key: key, source: "user" }); }
  function facts() { return { goal: byType("goal"), preferences: byType("preference"), constraints: byType("constraint") }; }

  /* ---------- RESPONSE MEMORY (§12) — Intervention → beobachtete Reaktion ----------
     Wird typischerweise beim Review-Fälligwerden einer Decision erzeugt. Nie
     Kausalität behaupten: „beobachtet“, nicht „verursacht“. */
  function recordResponse(intervention, observed, opts) {
    opts = opts || {};
    return remember("response", {
      intervention: intervention,           // {domain, change, from, to, startDate}
      observed: observed,                    // {weightDelta, waistDelta, strengthPct, windowDays, ...}
      note: opts.note || "",
      decision_id: opts.decision_id || null
    }, { source: "system", confidence: opts.confidence || null });
  }
  function responses() { return byType("response"); }
  // frühere ähnliche Interventionen finden (für N-of-1 / Advisor „das hast du schon probiert“).
  function priorResponses(domain, changeKind) {
    return responses().filter(function (r) {
      var iv = r.intervention || {};
      if (domain && iv.domain !== domain) return false;
      if (changeKind && iv.changeKind !== changeKind) return false;
      return true;
    });
  }

  /* =======================================================================
     DECISION LEDGER (§13) — jede bedeutsame Planänderung ist ein Datensatz.
     {id, date, domain, title, old_state, new_state, reason, evidence[],
      confidence, review_date, status, outcome}
     status: open | reviewed | superseded | reverted
     ======================================================================= */
  function ledger() { var l = get("intel_decisions", []); return Array.isArray(l) ? l : []; }
  function saveLedger(l) { set("intel_decisions", l); }
  function recordDecision(dec) {
    var entry = {
      id: uid("dec"), date: dec.date || todayYmd(), domain: dec.domain || "general",
      title: dec.title || "", type: dec.type || "change",           // keep | change | watch | check
      old_state: dec.old_state != null ? dec.old_state : null,
      new_state: dec.new_state != null ? dec.new_state : null,
      reason: dec.reason || "", evidence: dec.evidence || [],
      confidence: dec.confidence || "medium",
      review_date: dec.review_date || addDays(todayYmd(), dec.reviewInDays || 14),
      reviewInDays: dec.reviewInDays || 14,
      status: "open", outcome: null, source: dec.source || "system", created: todayYmd()
    };
    var l = ledger(); l.push(entry); saveLedger(l);
    // Auch als decision-memory referenzieren (einheitliche Historie)
    remember("decision", { decision_id: entry.id, domain: entry.domain, title: entry.title, decisionType: entry.type }, { source: entry.source });
    emitIntel("DECISION_RECORDED", { id: entry.id, domain: entry.domain });
    return entry;
  }
  function addDays(ymd, n) { var t = I.util.daysBetween("1970-01-01", ymd); var d = new Date((t + n) * 86400000); return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0"); }
  function decisionsOpen() { return ledger().filter(function (d) { return d.status === "open"; }); }
  function decisionsDueForReview() { var t = todayYmd(); return decisionsOpen().filter(function (d) { return d.review_date && d.review_date <= t; }); }
  function reviewDecision(id, outcome, observed) {
    var l = ledger(); var i = l.findIndex(function (d) { return d.id === id; }); if (i < 0) return false;
    l[i].status = "reviewed"; l[i].outcome = outcome || null; l[i].reviewedAt = todayYmd(); saveLedger(l);
    // Response Memory anhängen, wenn beobachtete Daten vorliegen.
    if (observed) recordResponse({ domain: l[i].domain, change: l[i].title, from: l[i].old_state, to: l[i].new_state, startDate: l[i].date, changeKind: l[i].type }, observed, { decision_id: id, note: outcome && outcome.note });
    emitIntel("DECISION_REVIEWED", { id: id });
    return true;
  }
  function supersedeDecisionsInDomain(domain, exceptId) {
    var l = ledger(); var changed = false;
    l.forEach(function (d) { if (d.domain === domain && d.status === "open" && d.id !== exceptId) { d.status = "superseded"; d.supersededAt = todayYmd(); changed = true; } });
    if (changed) saveLedger(l);
  }
  function getDecision(id) { return ledger().filter(function (d) { return d.id === id; })[0] || null; }
  function lastDecision(domain) { var l = ledger().filter(function (d) { return !domain || d.domain === domain; }); return l.length ? l[l.length - 1] : null; }

  function emitIntel(name, payload) {
    var os = MM.os; var safe = {};
    if (payload) Object.keys(payload).forEach(function (k) { if (typeof payload[k] !== "object") safe[k] = payload[k]; });
    if (os && os.emit) os.emit(name, safe);
  }

  /* ---------- Memory Center Snapshot (§98) ---------- */
  function centerView() {
    var f = facts();
    return {
      goal: f.goal[0] || null,
      preferences: f.preferences,
      constraints: f.constraints,
      responses: responses().slice(-6).reverse(),
      decisions: ledger().slice(-8).reverse(),
      counts: { memories: all().length, decisions: ledger().length, responses: responses().length }
    };
  }
  function _clearAll() { set("intel_memory", []); set("intel_decisions", []); }

  I.memory = {
    remember: remember, forget: forget, update: updateMemory, all: all, byType: byType,
    setGoal: setGoal, setPreference: setPreference, setConstraint: setConstraint, facts: facts,
    recordResponse: recordResponse, responses: responses, priorResponses: priorResponses,
    // ledger
    ledger: ledger, recordDecision: recordDecision, decisionsOpen: decisionsOpen,
    decisionsDueForReview: decisionsDueForReview, reviewDecision: reviewDecision,
    supersedeDecisionsInDomain: supersedeDecisionsInDomain, getDecision: getDecision, lastDecision: lastDecision,
    centerView: centerView, addDays: addDays, _clearAll: _clearAll
  };

  try {
    if (MM.account && MM.account.registerStateDomain) {
      MM.account.registerStateDomain("intelmemory", "intel_memory", { append: true });
      MM.account.registerStateDomain("inteldecisions", "intel_decisions", { append: true });
    }
  } catch (e) {}
})();
