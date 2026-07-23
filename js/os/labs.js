/* ==========================================================================
   MALEMETRIX LABS — STORE + INTELLIGENCE  (MM.labs)  · Phase 4
   --------------------------------------------------------------------------
   Turns lab data into CONTEXT, not a spreadsheet. Append-only history
   (§5/§71), canonical markers + units (§9/§10), trend-first (§13), personal
   context by pathway/goal/meds/stack (§17), recheck engine (§24), and clean
   integrations into Stack/Today/NBA/Progress (§30–§33/§83). No diagnosis,
   no invented optimal ranges, no biomarker values in analytics (§66).

   Data model (§4/§67/§73):
     lab_panels  = [{ id, date, fasted, timeOfDay, labName, notes, created }]
     lab_results = [{ id, panelId, markerId, name, value, unit,
                      canonical:{value,unit}, refLow, refHigh, refText,
                      date, source, confidence, notes }]
   Sync: registered as OS state domains (oslabpanels/oslabresults/oslabnotes).
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var LD = function () { return MM.labsData; };
  var S = {
    get: function (k, d) { try { return MM.store ? MM.store.get(k, d) : d; } catch (e) { return d; } },
    set: function (k, v) { try { if (MM.store) MM.store.set(k, v); } catch (e) {} }
  };
  function todayYmd() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function parseYmdUTC(s) { var p = String(s || "").split("-"); return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
  function diffDays(a, b) { return Math.round((parseYmdUTC(b) - parseYmdUTC(a)) / 86400000); }
  function uid(prefix) {
    var r = ""; try { var a = new Uint8Array(4); crypto.getRandomValues(a); for (var i = 0; i < a.length; i++) r += a[i].toString(16).padStart(2, "0"); } catch (e) { r = Math.floor(Math.random() * 1e9).toString(16); }
    return prefix + "_" + Date.now().toString(36) + r;
  }
  function emit(name, payload) { if (MM.os && MM.os.emit) MM.os.emit(name, payload || {}); }

  function panels() { var p = S.get("lab_panels", []); return Array.isArray(p) ? p : []; }
  function results() { var r = S.get("lab_results", []); return Array.isArray(r) ? r : []; }

  /* ---- §72/§74 Duplikat-/Panel-Matching: gleiches Datum+Labor = ein Panel ---- */
  function findPanel(date, labName) {
    return panels().find(function (p) { return p.date === date && (p.labName || "") === (labName || ""); }) || null;
  }
  function ensurePanel(meta) {
    meta = meta || {};
    var existing = findPanel(meta.date || todayYmd(), meta.labName || "");
    if (existing) return existing;
    var p = { id: uid("panel"), date: meta.date || todayYmd(), fasted: !!meta.fasted, timeOfDay: meta.timeOfDay || null, labName: meta.labName || "", notes: meta.notes || "", created: todayYmd() };
    var all = panels(); all.push(p); S.set("lab_panels", all);
    emit("LAB_PANEL_CREATED", { panel: p.id });
    return p;
  }

  /* ---- Ergebnis hinzufügen (§6 manuell / §8 nach Review) — append-only, dedup ---- */
  function addResult(input) {
    // input: {markerId?|name, value, unit, date?, refLow?, refHigh?, refText?,
    //         fasted?, timeOfDay?, labName?, source?, confidence?, notes?}
    var markerId = input.markerId || (LD() ? LD().resolveMarker(input.name) : null);
    if (!markerId) return { ok: false, reason: "unknown_marker", raw: input.name };
    var m = LD().marker(markerId);
    var value = parseFloat(input.value);
    if (isNaN(value)) return { ok: false, reason: "invalid_value" };
    var date = input.date || todayYmd();
    var canonical = LD().toCanonical(markerId, value, input.unit || m.unit);
    // §72 Duplikat: gleicher Marker + Datum + (≈)Wert existiert schon
    var dup = results().find(function (r) { return r.markerId === markerId && r.date === date && Math.abs(r.value - value) < 1e-6 && (r.unit || "") === (input.unit || m.unit || ""); });
    if (dup) return { ok: true, duplicate: true, id: dup.id };
    var panel = ensurePanel({ date: date, fasted: input.fasted, timeOfDay: input.timeOfDay, labName: input.labName });
    var r = {
      id: uid("res"), panelId: panel.id, markerId: markerId, name: m.name,
      value: value, unit: input.unit || m.unit,
      canonical: canonical, refLow: input.refLow != null ? parseFloat(input.refLow) : null,
      refHigh: input.refHigh != null ? parseFloat(input.refHigh) : null, refText: input.refText || "",
      date: date, fasted: !!input.fasted, timeOfDay: input.timeOfDay || null, source: input.source || "manual",
      confidence: input.confidence || (input.source === "import" ? "parsed_confirmed" : "manual"),
      notes: input.notes || ""
    };
    var all = results(); all.push(r); S.set("lab_results", all);
    emit("LAB_RESULT_ADDED", { marker: markerId });
    // §26 Trendwechsel-Event
    var series = seriesFor(markerId);
    if (series.length >= 2) {
      var tr = trend(markerId);
      if (tr && tr.changed) emit("LAB_TREND_CHANGED", { marker: markerId, direction: tr.direction });
    }
    return { ok: true, id: r.id, panelId: panel.id };
  }
  function updateResult(id, patch) {
    var all = results(); var idx = all.findIndex(function (r) { return r.id === id; });
    if (idx < 0) return { ok: false };
    all[idx] = Object.assign({}, all[idx], patch); S.set("lab_results", all);
    emit("LAB_RESULT_UPDATED", { id: id }); return { ok: true };
  }
  function removeResult(id) { S.set("lab_results", results().filter(function (r) { return r.id !== id; })); }

  /* ---- Serien / Trends (§13/§34) — auf kanonischen Werten, sonst roh ---- */
  function cval(r) { return r.canonical ? r.canonical.value : r.value; }
  function cunit(r) { return r.canonical ? r.canonical.unit : r.unit; }
  function seriesFor(markerId) {
    return results().filter(function (r) { return r.markerId === markerId; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  function latest(markerId) { var s = seriesFor(markerId); return s.length ? s[s.length - 1] : null; }
  // §34 Signifikanz: relative Änderung + marker-spezifische Rausch-Schwelle.
  var NOISE = { hematocrit: 1.5, hemoglobin: 0.4, alt: 6, ast: 6, ck: 40, fasting_glucose: 5, hba1c: 0.2, apo_b: 5, ldl_c: 8, total_testosterone: 40, psa: 0.3 };
  function trend(markerId) {
    var s = seriesFor(markerId); if (s.length < 2) return null;
    var first = cval(s[0]), last = cval(s[s.length - 1]);
    var prev = cval(s[s.length - 2]);
    var absCh = Math.round((last - prev) * 100) / 100;
    var pct = prev !== 0 ? Math.round((last - prev) / Math.abs(prev) * 1000) / 10 : null;
    var noise = NOISE[markerId] || Math.abs(prev) * 0.05;
    var changed = Math.abs(last - prev) >= noise;
    var direction = !changed ? "stable" : (last > prev ? "up" : "down");
    return {
      markerId: markerId, unit: cunit(s[s.length - 1]),
      first: first, last: last, prev: prev, absChange: absCh, pctChange: pct,
      changed: changed, direction: direction, n: s.length,
      lastDate: s[s.length - 1].date, spanDays: diffDays(s[0].date, s[s.length - 1].date),
      overall: Math.round((last - first) * 100) / 100
    };
  }
  // Lab-Range-Status: NUR anhand der vom Nutzer gelieferten Referenz (§11/§107).
  function rangeStatus(r) {
    if (r.refLow == null && r.refHigh == null) return "no_range";
    var v = r.value;
    if (r.refHigh != null && v > r.refHigh) return "above";
    if (r.refLow != null && v < r.refLow) return "below";
    return "within";
  }

  /* ---- §12 Statuslabel: Trend + Range kombiniert, keine reine Ampel ---- */
  function markerStatus(markerId) {
    var l = latest(markerId); if (!l) return null;
    var t = trend(markerId);
    var rs = rangeStatus(l);
    var label = "stable";
    if (t && t.changed) label = t.direction === "up" ? "worsening_or_up" : "improving_or_down";
    if (rs === "above" || rs === "below") label = "outside_lab_range";
    return { markerId: markerId, latest: l, trend: t, rangeStatus: rs, label: label };
  }

  /* ---- §17 Kontext-Engine: personalisiert nach Graph/Pathway/Meds/Stack ---- */
  function ctxProfile() {
    var os = window.MM && MM.os;
    return {
      pathway: os ? os.pathway() : "",
      age: os ? os.getP("identity.age", null) : null,
      meds: os ? os.getP("health.medication", false) : false,
      medList: os ? os.getP("health.medList", "") : "",
      stackText: os ? (os.getP("stack.currentText", "") || (os.baseline() || {}).stackText || "") : "",
      fishTwiceWeek: os ? os.getP("nutrition.fishTwiceWeek", false) : false,
      familyHistory: os ? os.getP("health.familyHistory", []) : []
    };
  }
  // §50 Insight-Card: WAS/ WARUM / WAS ERKLÄRT ES / RECHECK / BESPRECHEN.
  function insight(markerId) {
    var st = markerStatus(markerId); if (!st) return null;
    var m = LD().marker(markerId); var ctx = ctxProfile();
    var t = st.trend;
    var what = t ? (t.changed ? (m.name + " " + (t.direction === "up" ? "steigt" : "fällt") + " (" + (t.absChange > 0 ? "+" : "") + t.absChange + " " + t.unit + (t.pctChange != null ? ", " + (t.pctChange > 0 ? "+" : "") + t.pctChange + " %" : "") + ")") : (m.name + " stabil")) : (m.name + ": erster Wert (" + cval(st.latest) + " " + cunit(st.latest) + ")");
    var explain = [];
    // markerspezifischer Kontext (Training/Muskel/Meds/Enhanced) — kein Diagnose-Claim
    if (markerId === "creatinine" || markerId === "egfr") explain.push("Bei viel Muskelmasse und Kreatin-Einnahme ist Kreatinin systematisch höher — Cystatin C wäre hier fairer.");
    if (markerId === "alt" || markerId === "ast" || markerId === "ck") explain.push("Hartes Training (1–2 Tage vorher) erhöht diese Werte ohne Krankheitswert — Trainingsnähe der Messung beachten.");
    if (markerId === "hematocrit" && ctx.pathway === "enhanced") explain.push("Unter Enhanced/TRT ist ein steigender Hämatokrit erwartbar — mit Blutdruck und Hydration zusammen einordnen.");
    if (markerId === "ferritin" && st.rangeStatus === "above") explain.push("Ferritin steigt auch bei Entzündung (Akute-Phase) — hs-CRP und Transferrinsättigung helfen bei der Einordnung.");
    if (markerId === "total_testosterone") explain.push("Ein Einzelwert ohne SHBG, freies T und Morgentiming ist unvollständige Information.");
    if (ctx.meds) explain.push("Dieser Wert ist im Kontext deiner aktuellen Medikation zu lesen — das ist keine Bewertung der Therapie.");
    var recheck = suggestRecheck(markerId);
    var discuss = (st.rangeStatus === "above" || st.rangeStatus === "below") || (t && t.changed && (markerId === "psa" || markerId === "hematocrit" || markerId === "apo_b"));
    return {
      markerId: markerId, name: m.name, what: what, why: m.why,
      couldExplain: explain, recheck: recheck,
      discuss: discuss ? "Auffälligkeit/Trend fachlich einordnen lassen — kein Selbstbefund." : "",
      status: st
    };
  }

  /* ---- §16 Top-Prioritäten (max 3) ---- */
  function priorities() {
    var scored = [];
    var seen = {};
    results().forEach(function (r) {
      if (seen[r.markerId]) return; seen[r.markerId] = 1;
      var st = markerStatus(r.markerId); if (!st) return;
      var m = LD().marker(r.markerId);
      var score = 0;
      if (st.rangeStatus === "above" || st.rangeStatus === "below") score += 5;
      if (st.trend && st.trend.changed) score += 3;
      // kardiovaskulär/hämatologisch höher gewichten, Enhanced-Kontext dazu
      if (m.category === "cardiovascular") score += 2;
      if (m.category === "hematology" && ctxProfile().pathway === "enhanced") score += 2;
      if (r.markerId === "psa" && st.trend && st.trend.direction === "up") score += 3;
      var due = suggestRecheck(r.markerId);
      if (due && due.due) score += 2;
      if (score > 0) scored.push({ markerId: r.markerId, name: m.name, score: score, status: st });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, 3);
  }

  /* ---- §15 Kategorie-Dashboard ---- */
  function categorySummary() {
    var out = [];
    (LD().CATEGORIES).forEach(function (cat) {
      var markerIds = {};
      results().forEach(function (r) { var m = LD().marker(r.markerId); if (m && m.category === cat.id) markerIds[r.markerId] = 1; });
      var ids = Object.keys(markerIds); if (!ids.length) return;
      var improving = 0, worsening = 0, followup = 0, stable = 0;
      ids.forEach(function (id) {
        var st = markerStatus(id);
        if (st.rangeStatus === "above" || st.rangeStatus === "below") followup++;
        else if (st.trend && st.trend.changed) { if (st.trend.direction === "down") improving++; else worsening++; }
        else stable++;
      });
      out.push({ category: cat.id, label: cat.label, count: ids.length, improving: improving, worsening: worsening, followup: followup, stable: stable });
    });
    return out;
  }

  /* ---- §24 Recheck-Engine: kontextuelle Fenster, keine Fake-Universalfrequenz ---- */
  var RECHECK_WEEKS = {
    apo_b: 12, ldl_c: 12, non_hdl: 12, hba1c: 13, fasting_glucose: 13,
    hematocrit: 10, hemoglobin: 10, alt: 12, ast: 12, ggt: 12,
    total_testosterone: 12, estradiol: 12, creatinine: 26, cystatin_c: 26,
    vitamin_d: 26, ferritin: 16, psa: 52, tsh: 26, lp_a: null
  };
  function suggestRecheck(markerId) {
    var l = latest(markerId); if (!l) return null;
    var pathway = ctxProfile().pathway;
    var weeks = RECHECK_WEEKS[markerId];
    if (weeks == null) return { markerId: markerId, weeks: null, due: false, note: "Verlaufskontrolle situativ — z. B. Lp(a) ist meist eine Einmalbestimmung." };
    // Enhanced verkürzt kardio/hämato-Fenster
    if (pathway === "enhanced" && (LD().marker(markerId).category === "hematology" || LD().marker(markerId).category === "cardiovascular")) weeks = Math.max(8, Math.round(weeks * 0.7));
    var age = diffDays(l.date, todayYmd());
    var due = age >= weeks * 7;
    return { markerId: markerId, weeks: weeks, ageDays: age, due: due, note: "Letzte Messung vor " + Math.round(age / 7) + " Wochen; Kontext-Fenster ~" + weeks + " Wochen." };
  }
  function rechecksDue() {
    var seen = {}; var out = [];
    results().forEach(function (r) { if (seen[r.markerId]) return; seen[r.markerId] = 1; var s = suggestRecheck(r.markerId); if (s && s.due) out.push(s); });
    return out;
  }

  /* ---- §22 Blood-Test-Builder: Panel nach Pathway/Goal/Kontext ---- */
  function panelBuilder() {
    var ctx = ctxProfile();
    var core = ["apo_b", "ldl_c", "hdl_c", "triglycerides", "hba1c", "fasting_glucose", "alt", "creatinine", "hemoglobin"];
    var goal = [], adv = [], optional = [];
    var pw = ctx.pathway;
    if (pw === "performance" || pw === "enhanced" || !pw) goal = goal.concat(["ferritin", "tsh", "total_testosterone", "shbg", "vitamin_d"]);
    if (pw === "enhanced") { goal = goal.concat(["hematocrit", "estradiol", "ggt", "cystatin_c", "lh"]); adv = adv.concat(["prolactin", "psa", "fsh"]); }
    adv = adv.concat(["lp_a", "hs_crp", "fasting_insulin"]);
    if (pw !== "enhanced") optional = optional.concat(["vitamin_b12", "cystatin_c"]);
    function decorate(ids) { var s = {}; return ids.filter(function (id) { if (s[id]) return false; s[id] = 1; return true; }).map(function (id) { var m = LD().marker(id); return { id: id, name: m ? m.name : id, why: m ? m.why : "", recheck: suggestRecheck(id) }; }); }
    return { core: decorate(core), goal: decorate(goal), advanced: decorate(adv), optional: decorate(optional), pathway: pw || "performance" };
  }
  // §21/§99 Vollständigkeit: welche für den Pathway nützlichen Marker fehlen?
  function completeness() {
    var have = {}; results().forEach(function (r) { have[r.markerId] = 1; });
    var b = panelBuilder();
    var wanted = b.core.concat(b.goal);
    var missing = wanted.filter(function (m) { return !have[m.id]; });
    return { haveCount: Object.keys(have).length, wantedCount: wanted.length, missing: missing };
  }

  /* ---- §31/§32 Stack-Kontext aus Labs: Über-/Fehlsupplementierung verhindern ---- */
  function stackContext() {
    var flags = { fishTwiceWeek: undefined, summerSun: undefined };
    var vd = latest("vitamin_d");
    var ferr = latest("ferritin"), tsat = latest("tsat"), iron = latest("iron");
    var notes = [];
    if (vd) { if (cval(vd) >= 30) { flags.vitDAdequate = true; notes.push("Vitamin D ausreichend (" + cval(vd) + " " + cunit(vd) + ") — nicht blind hochdosieren."); } else notes.push("Vitamin D niedrig — gezielt supplementieren und nachmessen."); }
    if ((ferr && cval(ferr) > 300) || (tsat && cval(tsat) > 45) || (iron && iron.refHigh && iron.value > iron.refHigh)) { flags.ironHigh = true; notes.push("Eisenstatus hoch — KEIN Eisen supplementieren; Kontext (Entzündung/Überladung) fachlich klären."); }
    var hct = latest("hematocrit");
    if (hct && (cval(hct) >= 52 || rangeStatus(hct) === "above")) { flags.hematocritHigh = true; notes.push("Hämatokrit hoch — Monitoring-Priorität erhöht (Blutdruck/Hydration); keine Substanzsteuerung durch MaleMetrix."); }
    return { flags: flags, notes: notes };
  }

  /* ---- §20 Enhanced-Monitoring-Ansicht ---- */
  function enhancedMonitoring() {
    var groups = [
      { key: "cardiovascular", label: "KARDIO", ids: ["apo_b", "ldl_c", "hdl_c", "triglycerides", "hs_crp"] },
      { key: "hematology", label: "HÄMATOLOGIE", ids: ["hematocrit", "hemoglobin", "rbc"] },
      { key: "liver", label: "LEBER", ids: ["alt", "ast", "ggt"] },
      { key: "kidney", label: "NIERE", ids: ["creatinine", "cystatin_c", "egfr", "acr_urine"] },
      { key: "hormones", label: "ENDOKRIN", ids: ["total_testosterone", "estradiol", "shbg", "lh", "fsh", "prolactin"] },
      { key: "metabolic", label: "METABOLISCH", ids: ["fasting_glucose", "hba1c", "fasting_insulin"] }
    ];
    return groups.map(function (g) {
      var rows = g.ids.map(function (id) {
        var l = latest(id); if (!l) return { id: id, name: LD().marker(id).name, has: false, recheck: null };
        return { id: id, name: LD().marker(id).name, has: true, value: cval(l), unit: cunit(l), date: l.date, trend: trend(id), recheck: suggestRecheck(id) };
      });
      return { key: g.key, label: g.label, rows: rows, measured: rows.filter(function (r) { return r.has; }).length };
    });
  }

  /* ---- §29 Progress-Integration (Panel-Vergleich) ---- */
  function progressComparison(markerIds) {
    var ids = markerIds || ["apo_b", "hba1c", "hematocrit", "alt", "total_testosterone", "ldl_c"];
    return ids.map(function (id) { var t = trend(id); if (!t) { var l = latest(id); return l ? { id: id, name: LD().marker(id).name, single: cval(l), unit: cunit(l) } : null; } return { id: id, name: LD().marker(id).name, first: t.first, last: t.last, unit: t.unit, overall: t.overall, direction: t.first === t.last ? "stable" : (t.last > t.first ? "up" : "down") }; }).filter(Boolean);
  }

  /* ---- §85 Lab-Review-Summary ---- */
  function reviewSummary() {
    var prios = priorities();
    var improving = [], watch = [];
    var seen = {};
    results().forEach(function (r) {
      if (seen[r.markerId]) return; seen[r.markerId] = 1;
      var t = trend(r.markerId); if (!t || !t.changed) return;
      var m = LD().marker(r.markerId);
      if (t.direction === "down" && (m.category === "cardiovascular" || m.category === "metabolic")) improving.push({ id: r.markerId, name: m.name, t: t });
      else watch.push({ id: r.markerId, name: m.name, t: t });
    });
    return { priorities: prios, improving: improving, watch: watch, completeness: completeness(), rechecks: rechecksDue() };
  }

  MM.labs = {
    panels: panels, results: results, ensurePanel: ensurePanel,
    addResult: addResult, updateResult: updateResult, removeResult: removeResult,
    seriesFor: seriesFor, latest: latest, trend: trend, rangeStatus: rangeStatus,
    markerStatus: markerStatus, insight: insight, priorities: priorities,
    categorySummary: categorySummary, suggestRecheck: suggestRecheck, rechecksDue: rechecksDue,
    panelBuilder: panelBuilder, completeness: completeness, stackContext: stackContext,
    enhancedMonitoring: enhancedMonitoring, progressComparison: progressComparison, reviewSummary: reviewSummary,
    cval: cval, cunit: cunit
  };

  // §67 Sync-Domains (append-orientierte Lab-Tabellen als versionierter State)
  try {
    if (MM.account && MM.account.registerStateDomain) {
      MM.account.registerStateDomain("oslabpanels", "lab_panels");
      MM.account.registerStateDomain("oslabresults", "lab_results");
      MM.account.registerStateDomain("oslabnotes", "lab_notes");
    }
  } catch (e) {}
})();
