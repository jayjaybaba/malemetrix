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

  /* ======================================================================
     SCORE-EVOLUTION (Audit-Punkt 5): Das System hängt mit wachsender
     Datenmenge immer WENIGER an der Selbsteinschätzung.

     STAGE 0  nur Heuristik/Selbsteinschätzung (Cold Start)
     STAGE 1  Account-Historie fließt ein (≥ MIN_N vergleichbare Videos)
     STAGE 2  + Search-/Trend-Signal an der Idee verknüpft
     STAGE 3  Performance-Modell: Daten-Gewicht wächst mit n (bis 60 %)
     STAGE 4  + Kalibrierung: schlechte Trefferquote der eigenen Empfehlungen
              verschiebt das Gewicht weiter Richtung Daten (bis 75 %)

     Blend je Dimension:
       score = (1 − wD) · Selbsteinschätzung + wD · Historien-Score
       wD    = min(0.6, n · 0.05)  [+0.15 bei nachweislich schlechter
               Kalibrierung, Cap 0.75]
       Historien-Score = Perzentil des Themas unter allen eigenen Videos
       (Viral: Views · Growth: Follower/1k · Reward: RPM), skaliert 0–100.
     ====================================================================== */
  function dimMetric(dim) {
    return dim === "viral" ? function (v) { return G.metric(v, "views"); }
      : dim === "growth" ? G.followerPer1k
      : G.rpm;
  }
  function topicHistory(topic, dim) {
    var fn = dimMetric(dim);
    var all = G.S.videos().map(fn).filter(function (x) { return x != null && isFinite(x); });
    var comp = comparableVideos(topic).map(fn).filter(function (x) { return x != null && isFinite(x); });
    if (comp.length < D.MIN_N || all.length < D.MIN_N) return { n: comp.length, score: null };
    var med = G.median(comp);
    var below = all.filter(function (x) { return x <= med; }).length;
    return { n: comp.length, score: Math.round((below / all.length) * 100), med: med };
  }
  function calibrationPenalty() {
    var cal = calibration();
    return (cal.ready && cal.hitRate < 0.5) ? 0.15 : 0;
  }
  function dataWeight(n) {
    var w = Math.min(0.6, n * 0.05) + (n >= D.MIN_N ? calibrationPenalty() : 0);
    return Math.min(0.75, w);
  }
  function confidence(n) {
    if (n >= 8) return "HOCH";
    if (n >= D.MIN_N) return "MITTEL";
    return "NIEDRIG";
  }

  /* ---------- Die drei Hauptscores einer Idee (§9, geblendet) ---------- */
  function ideaScores(idea) {
    var out = {};
    ["viral", "growth", "reward"].forEach(function (dim) {
      var base = factorScore((idea.factors || {})[dim], D.FACTORS[dim]);
      var hist = topicHistory(idea.topic, dim);
      var score, basis;
      if (base.score == null && hist.score == null) {
        score = null;
        basis = ["Noch keine Faktoren bewertet und keine Historie"];
      } else if (hist.score == null) {
        score = base.score;
        basis = ["Selbsteinschätzung: " + base.answered + "/" + base.of + " Faktoren (Gewicht 100 %)",
          "Historie: erst " + hist.n + "/" + D.MIN_N + " vergleichbare Videos"];
      } else if (base.score == null) {
        score = hist.score;
        basis = ["Nur Historie (" + hist.n + " Videos, Themen-Perzentil " + hist.score + ")"];
      } else {
        var wD = dataWeight(hist.n);
        score = Math.round((1 - wD) * base.score + wD * hist.score);
        basis = [
          "Selbsteinschätzung " + base.score + " (Gewicht " + Math.round((1 - wD) * 100) + " %, " + base.answered + "/" + base.of + " Faktoren)",
          "Account-Historie " + hist.score + " (Gewicht " + Math.round(wD * 100) + " %, " + hist.n + " vergleichbare Videos, Themen-Perzentil)"
        ];
        if (calibrationPenalty() > 0) basis.push("Kalibrierung < 50 % Trefferquote → Daten-Gewicht erhöht");
      }
      out[dim] = { score: score == null ? null : Math.max(0, Math.min(100, score)), confidence: confidence(hist.n), basis: basis, histN: hist.n };
    });
    return out;
  }

  /* ---------- Stage-Anzeige (§Audit-5) ----------
     Exakte Logik, keine Pauschalaussagen: Das Daten-Gewicht wD hängt an der
     Zahl VERGLEICHBARER Videos DESSELBEN Themas (wD = min(0.6, n·0.05)),
     nicht an der Gesamtzahl aller Videos. Themen ohne eigene Historie
     bleiben selbsteinschätzungsbasiert, egal wie groß der Account ist. */
  function stageInfo(idea) {
    var comp = comparableVideos(idea.topic || "");
    var cal = calibration();
    var wD = dataWeight(comp.length);
    var stage = 0, why;
    if (comp.length < D.MIN_N) {
      why = "Cold Start für dieses Thema: " + comp.length + "/" + D.MIN_N + " vergleichbare Videos — Score = 100 % Selbsteinschätzung";
    } else {
      stage = 1;
      why = "Historie fließt ein: " + comp.length + " vergleichbare Videos zum Thema → Daten-Gewicht " + Math.round(wD * 100) + " %";
    }
    if (stage >= 1 && (idea.searchId || (idea.factors && idea.factors.viral && idea.factors.viral.momentum != null))) {
      stage = 2; why += " · Search-/Trend-Signal verknüpft";
    }
    if (wD >= 0.5) {
      stage = 3;
      why = "Datengetrieben: Daten-Gewicht " + Math.round(wD * 100) + " % aus " + comp.length + " vergleichbaren Videos zu „" + (idea.topic || "?") + "“ — Selbsteinschätzung zählt nur noch " + Math.round((1 - wD) * 100) + " %";
    }
    if (cal.ready) { stage = 4; why += " · Kalibrierung aktiv (" + Math.round(cal.hitRate * 100) + " % Trefferquote" + (calibrationPenalty() > 0 ? ", Daten-Gewicht erhöht" : "") + ")"; }
    return { stage: stage, why: why, comparable: comp.length, dataWeight: wD };
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

  /* ---------- Breakout-Detektor (§43, aus lokalen Snapshot-Zeitreihen) ----------
     Velocity = ΔViews / Tage zwischen den letzten beiden Snapshots eines Videos.
     Breakout, wenn Velocity ≥ 3× Median-Velocity des Accounts (n ≥ MIN_N). */
  function breakouts() {
    var rows = [];
    G.S.videos().forEach(function (v) {
      var s = (v.snapshots || []).filter(function (x) { return x.views != null && x.ts; });
      if (s.length < 2) return;
      var a = s[s.length - 2], b = s[s.length - 1];
      var days = Math.max(0.25, (new Date(b.ts) - new Date(a.ts)) / 864e5);
      var vel = (b.views - a.views) / days;
      if (vel > 0) rows.push({ video: v, velocity: vel, days: days, delta: b.views - a.views });
    });
    if (rows.length < D.MIN_N) return { ready: false, n: rows.length, need: D.MIN_N, top: [] };
    var med = G.median(rows.map(function (r) { return r.velocity; }));
    var top = rows.filter(function (r) { return med > 0 && r.velocity >= 3 * med; })
      .sort(function (a, b) { return b.velocity - a.velocity; })
      .map(function (r) {
        return { video: r.video, velocity: r.velocity,
          why: "+" + G.fmtInt(r.delta) + " Views in " + r.days.toFixed(1) + " Tagen (" + (r.velocity / med).toFixed(1) + "× Account-Median-Velocity)" };
      });
    return { ready: true, n: rows.length, med: med, top: top.slice(0, 3) };
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
    staleRules: staleRules, accountMedians: accountMedians, comparableVideos: comparableVideos,
    stageInfo: stageInfo, breakouts: breakouts, dataWeight: dataWeight
  };
})();
