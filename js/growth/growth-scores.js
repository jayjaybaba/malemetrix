/* ==========================================================================
   MaleMetrix Growth OS — Scores, Learning & Analytics
   --------------------------------------------------------------------------
   Grundsätze (§9/§84/§85/§87):
   - Scores sind transparente Heuristiken aus Selbsteinschätzung (0–10),
     angepasst durch ECHTE historische Account-Daten, sobald vorhanden.
   - Jede Aussage trägt Confidence + Datengrundlage.
   - Unter MIN_N vergleichbaren Videos: keine Behauptungen, nur Hinweis
     „Noch nicht genügend Daten“.
   - Keine hartkodierten Plattform-Wahrheiten: Regeln kommen aus
     platform_rules (growth-data.js / Einstellungen).
   ========================================================================== */

window.GOS_SCORE = (function () {
  "use strict";
  var D = GOS_DATA, G = GOS;

  /* ---------- Basis: Faktoren (0–10) -> Score (0–100) ---------- */
  function factorScore(values, defs) {
    var sum = 0, n = 0;
    defs.forEach(function (f) {
      var v = values && values[f.key];
      if (v != null && isFinite(v)) { sum += Math.max(0, Math.min(10, v)); n++; }
    });
    if (!n) return { score: null, answered: 0, of: defs.length };
    return { score: Math.round((sum / n) * 10), answered: n, of: defs.length };
  }

  /* ---------- Historie: vergleichbare Videos zum Thema ---------- */
  function comparableVideos(topic) {
    return G.S.videos().filter(function (v) {
      return v.topic === topic && G.metric(v, "views") != null;
    });
  }
  function accountMedians() {
    var vids = G.S.videos().filter(function (v) { return G.metric(v, "views") != null; });
    return {
      n: vids.length,
      views: G.median(vids.map(function (v) { return G.metric(v, "views"); })),
      fpk: G.median(vids.map(G.followerPer1k)),
      rpm: G.median(vids.map(G.rpm)),
      qv: G.median(vids.map(G.qvRatio))
    };
  }

  /* Historien-Anpassung: Thema läuft messbar besser/schlechter als der
     Account-Median => Score ±(max 10). Nur ab MIN_N vergleichbaren Videos. */
  function historyAdjust(topic, dim) {
    var comp = comparableVideos(topic);
    if (comp.length < D.MIN_N) return { delta: 0, n: comp.length, basis: null };
    var acc = accountMedians();
    var ratio = null, label = "";
    if (dim === "viral" && acc.views) {
      ratio = G.median(comp.map(function (v) { return G.metric(v, "views"); })) / acc.views;
      label = "Views vs. Account-Median";
    } else if (dim === "growth" && acc.fpk) {
      ratio = G.median(comp.map(G.followerPer1k)) / acc.fpk;
      label = "Follower/1k Views vs. Account-Median";
    } else if (dim === "reward" && acc.rpm) {
      ratio = G.median(comp.map(G.rpm)) / acc.rpm;
      label = "RPM vs. Account-Median";
    }
    if (ratio == null || !isFinite(ratio)) return { delta: 0, n: comp.length, basis: null };
    var delta = Math.max(-10, Math.min(10, Math.round((ratio - 1) * 20)));
    return { delta: delta, n: comp.length, basis: label + ": " + ratio.toFixed(2) + "×" };
  }

  function confidence(n) {
    if (n >= 8) return "HOCH";
    if (n >= D.MIN_N) return "MITTEL";
    return "NIEDRIG";
  }

  /* ---------- Die drei Hauptscores einer Idee (§9) ---------- */
  function ideaScores(idea) {
    var out = {};
    ["viral", "growth", "reward"].forEach(function (dim) {
      var base = factorScore((idea.factors || {})[dim], D.FACTORS[dim]);
      var hist = historyAdjust(idea.topic, dim);
      var score = base.score == null ? null : Math.max(0, Math.min(100, base.score + hist.delta));
      var basis = ["Selbsteinschätzung: " + base.answered + "/" + base.of + " Faktoren"];
      if (hist.basis) basis.push(hist.n + " vergleichbare Videos · " + hist.basis + " → " + (hist.delta >= 0 ? "+" : "") + hist.delta);
      else basis.push(hist.n < D.MIN_N ? "Historie: erst " + hist.n + "/" + D.MIN_N + " vergleichbare Videos — keine Anpassung" : "Historie: keine passende Metrik importiert");
      out[dim] = { score: score, confidence: confidence(hist.n), basis: basis, histN: hist.n };
    });
    return out;
  }

  /* ---------- Composite Opportunity Score (§10) ---------- */
  function activeWeights() {
    var s = G.S.settings();
    var w = s.weights || (D.WEIGHT_PRESETS[s.presetKey] || D.WEIGHT_PRESETS.balanced).w;
    var total = (w.viral || 0) + (w.growth || 0) + (w.reward || 0) + (w.brand || 0);
    if (!total) return { viral: 0.3, growth: 0.3, reward: 0.3, brand: 0.1 };
    return { viral: w.viral / total, growth: w.growth / total, reward: w.reward / total, brand: w.brand / total };
  }
  function composite(idea) {
    var sc = ideaScores(idea);
    var w = activeWeights();
    var brand = (idea.factors && idea.factors.brand != null) ? idea.factors.brand * 10 : null;
    var parts = [
      { v: sc.viral.score, w: w.viral }, { v: sc.growth.score, w: w.growth },
      { v: sc.reward.score, w: w.reward }, { v: brand, w: w.brand }
    ].filter(function (p) { return p.v != null; });
    if (!parts.length) return { score: null, scores: sc, brand: brand };
    var wsum = parts.reduce(function (a, p) { return a + p.w; }, 0);
    var val = parts.reduce(function (a, p) { return a + p.v * p.w; }, 0) / wsum;
    var minConf = ["NIEDRIG", "MITTEL", "HOCH"];
    var conf = [sc.viral, sc.growth, sc.reward].reduce(function (a, x) {
      return minConf.indexOf(x.confidence) < minConf.indexOf(a) ? x.confidence : a;
    }, "HOCH");
    return { score: Math.round(val), scores: sc, brand: brand, confidence: conf };
  }

  /* ---------- Do-Not-Produce (§38) ---------- */
  function dnpCheck(idea) {
    var reasons = [];
    var f = idea.factors || {};
    var g = f.growth || {}, v = f.viral || {};
    if (g.fit != null && g.fit <= 3) reasons.push("Niedriger MaleMetrix-Fit (" + g.fit + "/10)");
    if (idea.competition != null && idea.competition >= 8 && (idea.differentiation == null || idea.differentiation <= 4))
      reasons.push("Extrem hohe Konkurrenz ohne klare Differenzierung");
    if (idea.medRisk === "high") reasons.push("Medizinisches Risiko HIGH — erst Risiko-Review im Script Studio");
    var c = composite(idea);
    if (c.score != null && c.score < 40) reasons.push("Alle Scores schwach (Opportunity " + c.score + "/100)");
    if (v.surprise != null && v.surprise <= 2) reasons.push("Kaum neue Erkenntnis");
    return { flag: reasons.length > 0, reasons: reasons };
  }

  /* ---------- Hook-Selbstcheck-Score (§12/§21) ---------- */
  function hookCheckScore(answers) {
    var sum = 0, wsum = 0;
    D.HOOK_CHECKS.forEach(function (c) {
      wsum += c.weight;
      if (answers && answers[c.key]) sum += c.weight;
    });
    return wsum ? Math.round((sum / wsum) * 100) : 0;
  }

  /* ---------- Winner Detector (§28) — normalisiert, mit Begründung ---------- */
  function winner(video) {
    var vids = G.S.videos().filter(function (v) {
      return v.id !== video.id && G.metric(v, "views") != null;
    });
    var views = G.metric(video, "views");
    if (views == null) return { isWinner: false, why: ["Keine Views-Daten importiert"], norm: null };
    if (vids.length < D.MIN_N) return { isWinner: false, why: ["Erst " + vids.length + "/" + D.MIN_N + " Vergleichsvideos — Winner-Erkennung braucht mehr Daten"], norm: null };
    var med = G.median(vids.map(function (v) { return G.metric(v, "views"); }));
    var medF = G.median(vids.map(G.followerPer1k));
    var norm = med ? views / med : null;
    var f = G.followerPer1k(video);
    var why = [];
    if (norm != null && norm >= 1.8) why.push("Views " + norm.toFixed(1) + "× über Account-Median");
    if (f != null && medF != null && f >= 1.5 * medF && norm != null && norm >= 0.8)
      why.push("Follower-Conversion " + (f / medF).toFixed(1) + "× über Median");
    var r = G.rpm(video), medR = G.median(vids.map(G.rpm));
    if (r != null && medR != null && r >= 1.5 * medR) why.push("RPM " + (r / medR).toFixed(1) + "× über Median");
    return { isWinner: why.length > 0, why: why.length ? why : ["Im Normalbereich (Views " + (norm != null ? norm.toFixed(1) : "?") + "× Median)"], norm: norm };
  }

  /* ---------- Aggregation nach Dimension (§88/§89) ---------- */
  function aggregateBy(keyFn, labelFn) {
    var groups = {};
    G.S.videos().forEach(function (v) {
      if (G.metric(v, "views") == null) return;
      var k = keyFn(v);
      if (!k) return;
      (groups[k] = groups[k] || []).push(v);
    });
    var rows = [];
    Object.keys(groups).forEach(function (k) {
      var vs = groups[k];
      rows.push({
        key: k, label: labelFn ? labelFn(k) : k, n: vs.length,
        medViews: G.median(vs.map(function (v) { return G.metric(v, "views"); })),
        medFpk: G.median(vs.map(G.followerPer1k)),
        medRpm: G.median(vs.map(G.rpm)),
        medQv: G.median(vs.map(G.qvRatio)),
        sumReward: vs.reduce(function (a, v) { return a + (G.metric(v, "rewardEur") || 0); }, 0)
      });
    });
    return rows;
  }
  function lengthBucket(v) {
    if (!v.lengthSec) return null;
    if (v.lengthSec < 35) return "< 35 s";
    if (v.lengthSec < 61) return "35–60 s";
    if (v.lengthSec < 91) return "61–90 s";
    if (v.lengthSec < 181) return "91–180 s";
    return "> 180 s";
  }

  /* ---------- KPI-Zeitraum-Summen (§8) — aus letzten Snapshots.
     Ehrliche Semantik: „Summe der aktuellen Stände aller Videos, die im
     Zeitraum veröffentlicht wurden“ (Quelle: Import). ---------- */
  function periodSummary(days, offsetDays) {
    var now = Date.now();
    var from = now - (days + (offsetDays || 0)) * 864e5;
    var to = now - (offsetDays || 0) * 864e5;
    var vids = G.S.videos().filter(function (v) {
      if (!v.postAt) return false;
      var t = new Date(v.postAt).getTime();
      return t >= from && t < to;
    });
    function sum(key) {
      var any = false, s = 0;
      vids.forEach(function (v) { var m = G.metric(v, key); if (m != null) { s += m; any = true; } });
      return any ? s : null;
    }
    return {
      count: vids.length,
      views: sum("views"), likes: sum("likes"), comments: sum("comments"),
      shares: sum("shares"), followers: sum("followers"),
      qualifiedViews: sum("qualifiedViews"), rewardEur: sum("rewardEur")
    };
  }

  /* ---------- Qualified-View-Diagnose (§32) ---------- */
  function qvDiagnosis(video) {
    var q = G.qvRatio(video);
    if (q == null) return null;
    var acc = accountMedians();
    if (acc.qv == null || acc.n < D.MIN_N) return null;
    if (q >= acc.qv * 0.85) return null;
    return {
      ratio: q, median: acc.qv,
      hints: [
        "Schwache erste 0–5 Sekunden (Hook-Check des Videos prüfen)",
        "Hook zieht das falsche/zu breite Publikum an",
        "Einstieg zu langsam (Begrüßung, Vorrede, Logo?)",
        "Hook verspricht mehr, als das Video früh einlöst"
      ]
    };
  }

  /* ---------- Posting-Zeit (§47) — nur ab MIN_N_TIME pro Bucket ---------- */
  function postingTime() {
    var byDay = {};
    G.S.videos().forEach(function (v) {
      if (!v.postAt || G.metric(v, "views") == null) return;
      var d = new Date(v.postAt).getDay();
      (byDay[d] = byDay[d] || []).push(G.metric(v, "views"));
    });
    var names = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
    var rows = [], insufficient = 0;
    Object.keys(byDay).forEach(function (d) {
      if (byDay[d].length >= D.MIN_N_TIME) rows.push({ label: names[d], n: byDay[d].length, medViews: G.median(byDay[d]) });
      else insufficient++;
    });
    return { rows: rows, insufficient: insufficient };
  }

  /* ---------- Recommendation Memory & Kalibrierung (§86/§87) ---------- */
  function predictedTier(compositeScore) {
    if (compositeScore == null) return null;
    return compositeScore >= 75 ? "TOP" : compositeScore >= 55 ? "MITTEL" : "NIEDRIG";
  }
  function actualTier(video) {
    var w = winner(video);
    if (w.norm == null) return null;
    return w.norm >= 1.8 ? "TOP" : w.norm >= 0.8 ? "MITTEL" : "NIEDRIG";
  }
  function calibration() {
    var recs = G.S.recs(), vids = G.S.videos();
    var done = [];
    recs.forEach(function (r) {
      var idea = G.S.ideas().find(function (i) { return i.id === r.ideaId; });
      var vid = idea && idea.videoId ? vids.find(function (v) { return v.id === idea.videoId; }) : null;
      if (!vid) return;
      var at = actualTier(vid);
      if (at) done.push({ rec: r, predicted: predictedTier(r.composite), actual: at, title: r.title });
    });
    if (done.length < 5) return { ready: false, n: done.length, need: 5, rows: done };
    var hit = done.filter(function (d) { return d.predicted === d.actual; }).length;
    return { ready: true, n: done.length, hitRate: hit / done.length, rows: done };
  }

  /* ---------- Next Best Action / Top Opportunities (§37/§53) ---------- */
  function topOpportunities(limit) {
    var ideas = G.S.ideas().filter(function (i) {
      return D.STATUS_ACTIVE.indexOf(i.status) >= 0;
    });
    var scored = ideas.map(function (i) {
      var c = composite(i);
      var dnp = dnpCheck(i);
      return { idea: i, composite: c, dnp: dnp };
    }).filter(function (x) { return x.composite.score != null; });
    scored.sort(function (a, b) { return b.composite.score - a.composite.score; });
    var ok = scored.filter(function (x) { return !x.dnp.flag; });
    var blocked = scored.filter(function (x) { return x.dnp.flag; });
    return { top: ok.slice(0, limit || 3), blocked: blocked.slice(0, 3), totalScored: scored.length };
  }

  /* ---------- Target Mode (§92) ---------- */
  function targetStatus() {
    var t = G.S.settings().target;
    if (!t || !t.amount) return null;
    var month = t.month || new Date().toISOString().slice(0, 7);
    var mStart = new Date(month + "-01T00:00:00");
    var mEnd = new Date(mStart); mEnd.setMonth(mEnd.getMonth() + 1);
    var vids = G.S.videos().filter(function (v) {
      if (!v.postAt) return false;
      var d = new Date(v.postAt);
      return d >= mStart && d < mEnd;
    });
    var key = t.type === "followers" ? "followers" : t.type === "reward" ? "rewardEur" : "views";
    var current = 0, any = false;
    vids.forEach(function (v) { var m = G.metric(v, key); if (m != null) { current += m; any = true; } });
    var now = new Date();
    var elapsed = Math.max(1, Math.min((now - mStart) / 864e5, (mEnd - mStart) / 864e5));
    var totalDays = (mEnd - mStart) / 864e5;
    var pace = current / elapsed;
    var forecast = pace * totalDays;
    return {
      target: t, month: month, current: any ? current : null,
      forecast: any ? forecast : null, gap: any ? t.amount - forecast : null,
      note: "Lineare Hochrechnung aus importierten Daten — keine Garantie."
    };
  }

  /* ---------- Regel-Frische (§95) ---------- */
  function staleRules() {
    return G.S.rules().filter(function (r) {
      if (!r.verified) return true;
      return G.daysAgo(r.verified) > D.RULE_MAX_AGE_DAYS;
    });
  }

  return {
    factorScore: factorScore, ideaScores: ideaScores, composite: composite,
    activeWeights: activeWeights, dnpCheck: dnpCheck, hookCheckScore: hookCheckScore,
    winner: winner, aggregateBy: aggregateBy, lengthBucket: lengthBucket,
    periodSummary: periodSummary, qvDiagnosis: qvDiagnosis, postingTime: postingTime,
    predictedTier: predictedTier, actualTier: actualTier, calibration: calibration,
    topOpportunities: topOpportunities, targetStatus: targetStatus,
    staleRules: staleRules, accountMedians: accountMedians, comparableVideos: comparableVideos
  };
})();
