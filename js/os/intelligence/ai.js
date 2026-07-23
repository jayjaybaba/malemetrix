/* ==========================================================================
   MALEMETRIX INTELLIGENCE — AI PROVIDER LAYER  (MM.ai)
   --------------------------------------------------------------------------
   LAYER 3: Sprache & Synthese ÜBER der deterministischen Intelligenz.
   Die KI ist NIE Quelle der Wahrheit: sie bekommt deterministische Fakten,
   selektierten Kontext, Wissensobjekte und die deterministische Entscheidung
   — und darf erklären, verdichten, vergleichen, personalisieren. Mehr nicht.

   · Server-seitig: Edge Function `mm-ai` (Secrets NIE im Client) — §5/§166.
   · Task-Routing (§7): Kategorien, Modellwahl liegt serverseitig.
   · Kontext-Budget (§21): relevantContext + max. 3 Wissensobjekte, nie Roh-DB.
   · Cache (§22): task × Kontext-Fingerprint × Decision-/Knowledge-Version.
   · Validierung (§9/§175/§177): Zahlen müssen zum Kontext passen, keine
     erfundenen Werte, kein Überschreiben der deterministischen Entscheidung,
     keine verbotenen Aktionen ⇒ sonst deterministischer Fallback.
   · Ausfall (§20/§178): Provider weg ⇒ Produkt vollständig funktionsfähig.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var I = function () { return MM.intelligence; };

  var TASKS = {
    SHORT_SYNTHESIS: { maxTokens: 300 },
    ADVISOR_REASONING: { maxTokens: 700 },
    WEEKLY_REVIEW_LANGUAGE: { maxTokens: 500 },
    KNOWLEDGE_EXPLANATION: { maxTokens: 600 },
    CONTENT_GENERATION: { maxTokens: 900 },
    COMPLEX_COMPARISON: { maxTokens: 800 }
  };

  function configured() {
    // Ehrlich: konfiguriert = Cloud-Konto aktiv UND Feature-Flag gesetzt.
    return !!(window.MM_CONFIG && MM_CONFIG.AI_ENABLED) && !!(MM.account && MM.account.invokeFunction);
  }
  function status() {
    if (!(window.MM_CONFIG && MM_CONFIG.AI_ENABLED)) return { state: "config_required", honest: "Deterministische Intelligenz aktiv. KI-Sprachschicht braucht Server-Konfiguration (Edge Function mm-ai + Provider-Key) — nichts wird vorgetäuscht." };
    return { state: "enabled" };
  }

  /* ---------- Kontext-Fingerprint für Cache (§22) ---------- */
  function fingerprint(task, question, ctx) {
    var dec = null; try { dec = I().decision.decide(ctx); } catch (e) {}
    var parts = [task, question || "",
      ctx && ctx.body ? [ctx.body.weight, ctx.body.waist, ctx.body.weightTrend15, ctx.body.waistTrend14].join(",") : "",
      ctx && ctx.cycle ? ctx.cycle.week + ":" + ctx.cycle.day : "",
      dec ? dec.primary.type + ":" + dec.primary.title : "",
      I().knowledge ? "k" + I().knowledge.VERSION : ""];
    var s = parts.join("|"); var h = 0;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return "aic_" + (h >>> 0).toString(36);
  }
  var _cache = {};

  /* ---------- Payload-Minimierung (§8/§170) ---------- */
  function buildPayload(opts, ctx) {
    var In = I();
    var slim = In.relevantContext(opts.question || opts.task, ctx);
    var know = [];
    try {
      know = In.knowledge.retrieve(opts.question || "", ctx, 3).map(function (r) {
        return { id: r.object.id, title: r.object.title, summary: r.object.summary, stale: r.stale,
          claims: (r.object.claims || []).slice(0, 3).map(function (c) { return { s: c.statement, ev: c.evidence_type }; }) };
      });
    } catch (e) {}
    var det = null;
    try { var d = In.decision.decide(ctx); det = { type: d.primary.type, title: d.primary.title, reason: d.primary.reason, notNow: d.notNow, bottleneck: d.bottleneck.domain, confidencePct: d.bottleneck.confidencePct }; } catch (e) {}
    return {
      task: TASKS[opts.task] ? opts.task : "SHORT_SYNTHESIS",
      question: String(opts.question || "").slice(0, 500),
      context: slim,                    // bereits domänen-budgetiert, keine Roh-Historie
      knowledge: know,
      deterministicDecision: det,
      uncertainty: (slim.missing || []).map(function (m) { return m.label; }),
      lang: "de"
    };
  }

  /* ---------- VALIDIERUNG (§9/§175/§176/§177) ---------- */
  var FORBIDDEN = /dosier(e|ung)|nimm \d+ ?mg|absetzschema|verschreib|diagnose:\s|du hast (krebs|diabetes|eine erkrankung)|ich habe deinen plan (geändert|angepasst)/i;
  function validate(text, payload) {
    var out = { ok: true, reasons: [] };
    if (!text || typeof text !== "string" || text.length < 5) { out.ok = false; out.reasons.push("empty"); return out; }
    if (FORBIDDEN.test(text)) { out.ok = false; out.reasons.push("forbidden_content"); }
    // Zahlen-Grounding: genannte kg-Gewichtsangaben müssen ~zum Kontext passen (§175).
    var w = payload.context && payload.context.body ? payload.context.body.weight : null;
    if (w != null) {
      var m = text.match(/(\d{2,3}(?:[.,]\d)?)\s?kg/g) || [];
      m.forEach(function (tok) {
        var v = parseFloat(tok.replace(",", "."));
        if (v >= 40 && v <= 200 && Math.abs(v - w) > 12 && Math.abs(v - (payload.context.body.weightStart || w)) > 12) {
          out.ok = false; out.reasons.push("ungrounded_weight:" + tok);
        }
      });
    }
    // Entscheidungs-Konsistenz (§177): KEEP darf nicht als Änderung verkauft werden.
    var det = payload.deterministicDecision;
    if (det && det.type === "keep" && /erhöhe .*kalorien|senke .*kalorien|reduziere .*kalorien|ändere dein(en)? plan jetzt/i.test(text)) {
      out.ok = false; out.reasons.push("contradicts_deterministic_keep");
    }
    // Quellen-Halluzination (§176): keine erfundenen Zitations-Pattern rendern.
    if (/\(([A-Z][a-z]+ et al\.,? \d{4})\)|doi\.org/i.test(text)) { out.ok = false; out.reasons.push("uncited_source_pattern"); }
    return out;
  }

  /* ---------- Beobachtbarkeit (§23) — nie sensible Rohdaten ---------- */
  function obs(ev, meta) { try { if (MM.track) MM.track("ai_" + ev, meta || {}); } catch (e) {} }

  /* ---------- ask() — der einzige Weg zur KI ---------- */
  var _inflight = {};
  function ask(opts) {
    var ctx = null;
    try { ctx = opts.ctx || I().buildContext(); } catch (e) {}
    var payload = buildPayload(opts, ctx);
    if (!configured()) { obs("fallback", { r: "config_required", t: payload.task }); return Promise.resolve({ ok: false, reason: "config_required", fallback: true }); }
    var key = fingerprint(payload.task, payload.question, ctx);
    if (_cache[key]) { obs("cache_hit", { t: payload.task }); return Promise.resolve(_cache[key]); }
    if (_inflight[key]) return _inflight[key];   // Duplicate-Suppression (§21)
    var t0 = Date.now();
    _inflight[key] = MM.account.invokeFunction("mm-ai", payload).then(function (r) {
      delete _inflight[key];
      if (!r.ok || !r.data || !r.data.text) { obs("fallback", { r: r.code || "no_text", t: payload.task }); return { ok: false, reason: r.code || "provider_error", fallback: true }; }
      var v = validate(r.data.text, payload);
      obs("response", { t: payload.task, ms: Date.now() - t0, valid: v.ok, model: r.data.model || "?" });
      if (!v.ok) return { ok: false, reason: "validation_failed:" + v.reasons.join(","), fallback: true };
      var res = { ok: true, text: r.data.text, model: r.data.model || null, basedOn: payload.knowledge.map(function (k) { return k.title; }), task: payload.task };
      _cache[key] = res;
      return res;
    }).catch(function (e) { delete _inflight[key]; obs("fallback", { r: "network" }); return { ok: false, reason: "network", fallback: true }; });
    return _inflight[key];
  }

  MM.ai = { ask: ask, status: status, configured: configured, validate: validate, buildPayload: buildPayload, TASKS: TASKS, _cacheClear: function () { _cache = {}; } };
})();
