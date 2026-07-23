/* ==========================================================================
   MALEMETRIX OS — CORE  (MM.os)
   --------------------------------------------------------------------------
   Das gemeinsame Fundament des Operating Systems:
     · PERSONAL GRAPH  — ein Nutzer, ein Zustand. Jede Angabe hat genau einen
       Besitzer; Score-Antworten füllen den Graph vor (nie doppelt fragen).
     · METRICS         — generisches Körpermetrik-Modell (type/value/unit/date/
       source) mit Trends. Gewicht gehört HIER, alles andere liest nur.
     · EVENTS          — leichte Domain-Events (mm:os) für Persistenz/Progress.
     · ACTIONS / TODAY — ein Aktionsmodell, ein Tag, EINE wichtigste Handlung
       (Next Best Action) + NOT-NOW-Liste. Dedup über stabile IDs.
     · BASELINE        — Startpunkt je Zyklus inkl. lokaler Fotos (IndexedDB,
       local-first, kein stiller Upload).
   Keine 12-Week-Businesslogik hier — die bleibt eingefroren in course.js.
   Sync: registrierte OS-Domains laufen über MM.account (os_state, versioniert).
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var S = {
    get: function (k, d) { try { return MM.store ? MM.store.get(k, d) : (JSON.parse(localStorage.getItem("mm_" + k)) ?? d); } catch (e) { return d; } },
    set: function (k, v) { try { MM.store ? MM.store.set(k, v) : localStorage.setItem("mm_" + k, JSON.stringify(v)); } catch (e) {} }
  };
  function todayYmd() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function parseYmdUTC(s) { var p = String(s || "").split("-"); return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
  function diffDays(a, b) { return Math.round((parseYmdUTC(b) - parseYmdUTC(a)) / 86400000); }

  /* ======================= EVENTS ======================= */
  // SCORE_COMPLETED · PATHWAY_SELECTED · GOAL_CHANGED · BASELINE_CREATED ·
  // PROGRAM_STARTED · WORKOUT_COMPLETED · MEAL_LOGGED · WEIGHT_LOGGED ·
  // WEEKLY_REVIEW_COMPLETED · RECHECK_COMPLETED · STACK_UPDATED ·
  // ACTION_RESCHEDULED · CYCLE_COMPLETED
  function emit(name, payload) {
    try { document.dispatchEvent(new CustomEvent("mm:os", { detail: { name: name, payload: payload || {}, at: new Date().toISOString() } })); } catch (e) {}
    try {
      var log = S.get("os_events", []); if (!Array.isArray(log)) log = [];
      log.push({ n: name, at: new Date().toISOString() });
      if (log.length > 200) log = log.slice(log.length - 200);
      S.set("os_events", log);
    } catch (e) {}
  }

  /* ======================= PERSONAL GRAPH ======================= */
  // Domains: identity · pathway · goals · body(→metrics) · training · nutrition
  //          · recovery · health · stack · enhanced · lifestyle
  function profile() { var p = S.get("os_profile", null); return (p && typeof p === "object") ? p : {}; }
  function saveProfile(p) { S.set("os_profile", p); }
  function getP(path, d) {
    var parts = path.split("."); var cur = profile();
    for (var i = 0; i < parts.length; i++) { if (cur == null || typeof cur !== "object") return d; cur = cur[parts[i]]; }
    return cur == null ? d : cur;
  }
  function setP(path, val) {
    var parts = path.split("."); var p = profile(); var cur = p;
    for (var i = 0; i < parts.length - 1; i++) { if (typeof cur[parts[i]] !== "object" || cur[parts[i]] == null) cur[parts[i]] = {}; cur = cur[parts[i]]; }
    cur[parts[parts.length - 1]] = val;
    saveProfile(p);
  }

  // EIN INPUT, VIELE NUTZUNGEN: Score-Antworten füllen den Graph vor.
  // Es wird NIE etwas überschrieben, das der Nutzer bereits gesetzt hat.
  function prefillFromScore() {
    var r = S.get("check_result", null);
    if (!r || typeof r !== "object") return false;
    var a = r.answers || {};
    var p = profile(); var changed = false;
    function fill(path, val) {
      if (val == null || val === "") return;
      var parts = path.split("."); var cur = p;
      for (var i = 0; i < parts.length - 1; i++) { if (typeof cur[parts[i]] !== "object" || cur[parts[i]] == null) cur[parts[i]] = {}; cur = cur[parts[i]]; }
      var leaf = parts[parts.length - 1];
      if (cur[leaf] == null || cur[leaf] === "") { cur[leaf] = val; changed = true; }
    }
    fill("identity.height", parseFloat(a.height) || null);
    fill("identity.age", parseFloat(a.age) || null);
    fill("goals.mode", r.plan || null);
    fill("goals.bottleneck", (r.bottleneck && r.bottleneck.key) || null);
    fill("training.experience", a.str_freq === "0" ? "beginner" : (a.str_plan === "ja" ? "intermediate" : "novice"));
    fill("recovery.sleepHours", parseFloat(a.sleep_hours) || null);
    if (changed) saveProfile(p);
    // Gewicht/Taille sind METRIKEN (eigener Besitzer) — als Startmesswerte loggen.
    if (parseFloat(a.weight) && !latestMetric("weight")) logMetric("weight", parseFloat(a.weight), "kg", r.date || todayYmd(), "score");
    if (parseFloat(a.waist) && !latestMetric("waist")) logMetric("waist", parseFloat(a.waist), "cm", r.date || todayYmd(), "score");
    return changed;
  }

  // PROGRESSIVE PROFILING — nur fragen, wenn es Wert freischaltet.
  function readiness() {
    var p = profile();
    function pct(fields, obj) { var n = 0; fields.forEach(function (f) { if (obj && obj[f] != null && obj[f] !== "") n++; }); return Math.round(n / fields.length * 100); }
    return {
      core: pct(["height", "age"], p.identity) === 100 && p.pathway ? 100 : Math.round((pct(["height", "age"], p.identity) + (p.pathway ? 100 : 0)) / 2),
      training: pct(["experience", "daysPerWeek", "minutes", "location"], p.training),
      nutrition: pct(["mealsPerDay", "cookMinutes", "dietStyle"], p.nutrition),
      recovery: pct(["sleepHours", "stress"], p.recovery)
    };
  }

  /* ======================= PATHWAYS ======================= */
  // PATHWAY ≠ GOAL. health | performance | enhanced — beeinflusst
  // Personalisierung (Enhanced-Inhalte nur im Enhanced-Pfad prominent).
  var PATHWAYS = {
    health: { label: "HEALTH", line: "Besser aussehen. Besser fühlen. Ein stärkeres Gesundheitsfundament." },
    performance: { label: "PERFORMANCE", line: "Physique und Leistung so weit bringen, wie es realistisch geht." },
    enhanced: { label: "ENHANCED", line: "Einen Enhanced-Performance-Weg verstehen und sauber managen." }
  };
  function pathway() { var v = getP("pathway", ""); return PATHWAYS[v] ? v : ""; }
  function setPathway(v) { if (!PATHWAYS[v]) return; setP("pathway", v); emit("PATHWAY_SELECTED", { pathway: v }); }

  /* ======================= METRICS ======================= */
  // Generisch: {type, value, unit, date, source}. Quelle der Wahrheit für
  // Gewicht/Taille/KFA-Schätzung/Schlaf usw. Score & Engines LESEN nur.
  function metrics() { var m = S.get("os_metrics", []); return Array.isArray(m) ? m : []; }
  function logMetric(type, value, unit, date, source) {
    if (value == null || isNaN(parseFloat(value))) return false;
    var m = metrics();
    var entry = { type: type, value: parseFloat(value), unit: unit || "", date: date || todayYmd(), source: source || "manual" };
    // idempotent pro (type,date,source): letzter Wert des Tages gewinnt
    var idx = m.findIndex(function (x) { return x.type === type && x.date === entry.date && x.source === entry.source; });
    if (idx >= 0) m[idx] = entry; else m.push(entry);
    S.set("os_metrics", m);
    if (type === "weight") emit("WEIGHT_LOGGED", { value: entry.value });
    return true;
  }
  function metricSeries(type) { return metrics().filter(function (x) { return x.type === type; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }); }
  function latestMetric(type) { var s = metricSeries(type); return s.length ? s[s.length - 1] : null; }
  function firstMetric(type) { var s = metricSeries(type); return s.length ? s[0] : null; }
  // ROLLENDER TREND statt Einzelmessung: Ø der letzten `win` Tage minus Ø der `win` Tage davor.
  function metricTrend(type, win) {
    win = win || 7;
    var s = metricSeries(type); if (s.length < 2) return null;
    var cut = todayYmd();
    function avgBetween(fromD, toD) {
      var vals = s.filter(function (x) { return diffDays(x.date, cut) >= fromD && diffDays(x.date, cut) < toD; }).map(function (x) { return x.value; });
      if (!vals.length) return null;
      return vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
    }
    var recent = avgBetween(0, win), prior = avgBetween(win, win * 2);
    if (recent == null || prior == null) return null;
    return { delta: Math.round((recent - prior) * 100) / 100, recent: recent, prior: prior, window: win };
  }

  /* ======================= CYCLE IDENTITY (§4/§5) ======================= */
  // Stabile cycle_id — VOR Baseline/Fotos vergeben. Startdatum ist Metadatum,
  // NICHT Identität. Lifecycle: draft → active → completed/archived.
  function genCycleId() {
    var r = "";
    try { var a = new Uint8Array(6); crypto.getRandomValues(a); for (var i = 0; i < a.length; i++) r += a[i].toString(16).padStart(2, "0"); }
    catch (e) { r = Math.floor(Math.random() * 1e12).toString(16); }
    return "cyc_" + Date.now().toString(36) + "_" + r;
  }
  function cycleHistory() { var h = S.get("os_cycle_history", []); return Array.isArray(h) ? h : []; }
  function archiveCycle(c, status) {
    var h = cycleHistory();
    if (!h.some(function (x) { return x.id === c.id; })) { h.push(Object.assign({}, c, { status: status || "archived", ended: todayYmd() })); S.set("os_cycle_history", h); }
  }
  // Idempotente Zustandsmaschine: hält os_cycle konsistent mit c2_start.
  // WICHTIG (Multi-Device): wird ein Zyklus aus einem BEREITS bestehenden
  // Programm abgeleitet (c2_start existiert, aber noch keine cycle_id), ist die
  // ID DETERMINISTISCH aus dem Startdatum — so minten zwei Geräte NICHT zwei
  // verschiedene IDs für denselben Zyklus. Nur echte Draft-Neustarts (vor
  // Programmstart) bekommen eine zufällige ID.
  function derivedCycleId(start) { return "cyc_p_" + start; }
  function ensureCycle() {
    var c = S.get("os_cycle", null);
    var start = S.get("c2_start", "") || null;
    if (!c || !c.id) {
      c = { id: start ? derivedCycleId(start) : genCycleId(), status: start ? "active" : "draft", start: start, created: todayYmd() };
      S.set("os_cycle", c);
      migrateLegacyBaselines(c.id);
      return c;
    }
    if (start && !c.start) { c.start = start; c.status = "active"; S.set("os_cycle", c); }            // draft → active
    else if (start && c.start && c.start !== start) {                                                // Reset + Neustart → neuer Zyklus
      archiveCycle(c, "archived");
      c = { id: genCycleId(), status: "active", start: start, created: todayYmd() };
      S.set("os_cycle", c);
    } else if (!start && c.start) {                                                                  // Reset ohne Neustart → alter Zyklus zu, neuer Draft
      archiveCycle(c, "archived");
      c = { id: genCycleId(), status: "draft", start: null, created: todayYmd() };
      S.set("os_cycle", c);
    }
    migrateLegacyBaselines(c.id);
    return c;
  }
  function cycleId() { return ensureCycle().id; }
  function currentCycle() { return ensureCycle(); }
  function completeCycle() { var c = ensureCycle(); if (c.status === "active") { c.status = "completed"; c.ended = todayYmd(); S.set("os_cycle", c); emit("CYCLE_COMPLETED", { cycle: c.id }); } return c; }

  // §6 — Idempotente Legacy-Migration: Baselines unter "pre" oder Startdatum
  // werden dem aktuellen Zyklus zugeordnet. Nie destruktiv, nie doppelt:
  // vorhandene cycle_id-Baseline gewinnt immer; Legacy-Keys bleiben als Quelle
  // erhalten (Fotos liegen ggf. noch unter Legacy-Keys → Lookup-Fallback).
  function migrateLegacyBaselines(cid) {
    try {
      var all = S.get("os_baseline", null);
      if (!all || typeof all !== "object") return;
      if (all[cid]) return; // schon migriert / vorhanden → idempotent fertig
      var start = S.get("c2_start", "") || "";
      var legacy = (start && all[start]) ? all[start] : (all.pre || null);
      if (legacy) { all[cid] = Object.assign({}, legacy, { migratedFrom: (start && all[start]) ? start : "pre" }); S.set("os_baseline", all); }
    } catch (e) {}
  }
  function legacyBaselineKeys() {
    var out = []; var start = S.get("c2_start", "") || "";
    if (start) out.push(start);
    out.push("pre");
    return out;
  }

  /* ======================= BASELINE ======================= */
  // Pro Zyklus (Key = stabile cycle_id — §3/§4). Fotos: optional,
  // LOCAL-FIRST in IndexedDB — kein stiller Upload, keine Fake-KFA-Analyse.
  function baselineKey() { return cycleId(); }
  function baselines() { var b = S.get("os_baseline", {}); return (b && typeof b === "object") ? b : {}; }
  function baseline(key) { return baselines()[key || baselineKey()] || null; }
  function saveBaseline(data, key) {
    var all = baselines(); var k = key || baselineKey();
    all[k] = Object.assign({}, all[k], data, { updated: todayYmd() });
    S.set("os_baseline", all);
    emit("BASELINE_CREATED", { key: k });
    // Baseline-Körperwerte auch als Metriken loggen (eine Quelle, viele Leser)
    if (data.weight) logMetric("weight", data.weight, "kg", todayYmd(), "baseline");
    if (data.waist) logMetric("waist", data.waist, "cm", todayYmd(), "baseline");
    if (data.bf) logMetric("bf_estimate", data.bf, "%", todayYmd(), "baseline");
  }

  /* ---- Fotos (IndexedDB, nur dieses Gerät) ---- */
  var DB = null;
  function photoDb() {
    return new Promise(function (res, rej) {
      if (DB) return res(DB);
      var req = indexedDB.open("mm_os", 1);
      req.onupgradeneeded = function () { req.result.createObjectStore("photos"); };
      req.onsuccess = function () { DB = req.result; res(DB); };
      req.onerror = function () { rej(req.error); };
    });
  }
  // §7 — Checkpoint-Identität: cycle_id + Checkpoint (W0/W4/W8/W12) + Winkel.
  function checkpointOf(week) { return week >= 12 ? 12 : week >= 8 ? 8 : week >= 4 ? 4 : 0; }
  function photoKey(week, angle, key) { return (key || baselineKey()) + ":" + checkpointOf(week) + ":" + angle; }
  function rawGet(db, k) {
    return new Promise(function (res) {
      var tx = db.transaction("photos", "readonly");
      var rq = tx.objectStore("photos").get(k);
      rq.onsuccess = function () { res(rq.result || null); }; rq.onerror = function () { res(null); };
    });
  }
  function savePhoto(week, angle, blob, key) {
    return photoDb().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction("photos", "readwrite");
        tx.objectStore("photos").put(blob, photoKey(week, angle, key));
        tx.oncomplete = function () { res(true); }; tx.onerror = function () { rej(tx.error); };
      });
    }).then(function (ok) {
      // §103 — Metadatum "Foto existiert (auf irgendeinem Gerät)" wandert in die
      // synchronisierte Baseline; das Foto selbst bleibt LOCAL-ONLY.
      try {
        var all = baselines(); var k = key || baselineKey();
        var b = all[k] = all[k] || {};
        b.photoMeta = b.photoMeta || {};
        var cp = "W" + checkpointOf(week);
        b.photoMeta[cp] = b.photoMeta[cp] || {};
        b.photoMeta[cp][angle] = { taken: todayYmd() };
        S.set("os_baseline", all);
      } catch (e) {}
      return ok;
    });
  }
  function getPhoto(week, angle, key) {
    return photoDb().then(function (db) {
      var keys = [photoKey(week, angle, key)];
      if (!key) legacyBaselineKeys().forEach(function (lk) { keys.push(lk + ":" + checkpointOf(week) + ":" + angle); });
      // Fallback-Kette: cycle_id-Key, dann Legacy-Keys (Startdatum, "pre")
      return keys.reduce(function (p, k) { return p.then(function (hit) { return hit || rawGet(db, k); }); }, Promise.resolve(null));
    }).catch(function () { return null; });
  }
  function hasPhotos(week, key) {
    return Promise.all(["front", "side", "back"].map(function (a) { return getPhoto(week, a, key); }))
      .then(function (r) { return r.some(Boolean); });
  }
  // §103 — Drei ehrliche Zustände: 'local' (hier abrufbar) · 'other_device'
  // (laut Sync-Metadaten aufgenommen, aber nicht auf diesem Gerät) · 'none'.
  function photoStatus(week, key) {
    var cp = "W" + checkpointOf(week);
    var meta = ((baseline(key) || {}).photoMeta || {})[cp];
    return hasPhotos(week, key).then(function (local) {
      if (local) return "local";
      return (meta && Object.keys(meta).length) ? "other_device" : "none";
    });
  }

  /* ======================= ACTIONS / TODAY / NBA ======================= */
  // Standard-Aktionsmodell: {id, domain, type, date, priority, status, source,
  // deepLink, label, detail}. Dedup über stabile IDs — Programm/Training/
  // Kalender, die dasselbe Workout meinen, erzeugen EINE Aktion.
  function actionState() { var a = S.get("os_actions", {}); return (a && typeof a === "object") ? a : {}; }
  function actionDone(id, date) { var st = actionState(); return !!(st[date || todayYmd()] && st[date || todayYmd()][id]); }
  function completeAction(id, date) {
    var st = actionState(); var d = date || todayYmd();
    st[d] = st[d] || {}; st[d][id] = true;
    // Log begrenzen (letzte 60 Tage)
    var keys = Object.keys(st).sort(); while (keys.length > 60) { delete st[keys.shift()]; }
    S.set("os_actions", st);
  }

  /* ---- Weekly-Pulse-Adapter (§60): liest c2_pulse rein lesend — kein
     doppelter Fragebogen. Shape: {week: {inp, verdict:{code}, stagnant, ts}} ---- */
  function lastPulse() {
    var p = S.get("c2_pulse", {}) || {}; var weeks = Object.keys(p).map(Number).filter(function (n) { return !isNaN(n); }).sort(function (a, b) { return a - b; });
    if (!weeks.length) return null;
    var w = weeks[weeks.length - 1];
    return Object.assign({ week: w }, p[w]);
  }
  function recoveryLow() {
    var lp = lastPulse();
    if (lp && lp.inp && ((lp.inp.energy != null && lp.inp.energy <= 2) || lp.inp.sleep === "bad")) return true;
    var m = contextMode();
    return m === "recovery_sick";
  }

  // §29/§34 — echtes Food-Log: os_nutrition_log = { "YYYY-MM-DD": [entries] }
  function nutritionLog() { var l = S.get("os_nutrition_log", {}) || {}; return (l && typeof l === "object") ? l : {}; }
  function logFood(entry, date) {
    var l = nutritionLog(); var d = date || todayYmd();
    l[d] = l[d] || [];
    l[d].push({ name: entry.name || "Eintrag", kcal: Math.round(entry.kcal || 0), p: Math.round(entry.p || 0), c: Math.round(entry.c || 0), f: Math.round(entry.f || 0), source: entry.source || "manual", at: new Date().toISOString() });
    // Log begrenzen (90 Tage)
    var keys = Object.keys(l).sort(); while (keys.length > 90) delete l[keys.shift()];
    S.set("os_nutrition_log", l);
    emit("MEAL_LOGGED", { date: d, kcal: entry.kcal || 0 });
    return l[d];
  }
  function todayFoodTotals() {
    var entries = nutritionLog()[todayYmd()] || [];
    if (!entries.length) return null; // PLANNED ≠ LOGGED: ohne Logging kein Fake-Fortschritt
    return (window.MM && MM.engines) ? MM.engines.dayLogTotals(entries) : null;
  }

  // Aggregiert Programm + Nutrition + Movement + Recovery + Stack zu 3–5
  // sinnvollen Aktionen. Programm-Aktion kommt aus dem ECHTEN Tagestyp
  // (rein lesend über MM.programView — §9: kein "alles ist Training").
  function todayActions() {
    var d = (window.MM && MM.account) ? MM.account.getDashboardState() : { program: { active: false }, access: {} };
    var p = d.program || {};
    var acts = [];
    var date = todayYmd();
    var nut = S.get("os_nutrition_plan", null);
    var stack = S.get("os_stack", null);
    var mode = contextMode();

    if (d.access && d.access.twelve_week && p.active && !p.notStarted && !p.over) {
      var rx = (window.MM && MM.programView) ? MM.programView.getTodayPrescription() : null;
      var label = "Programm · Tag " + p.day, detail = "Woche " + p.week + " · Phase " + p.phase, dl = "kurs-programm.html", ptype = "program_day";
      if (rx) {
        if (rx.dayType === "strength") { label = "STRENGTH · Session"; detail = rx.purpose; dl = "#workout"; ptype = "program_strength"; }
        else if (rx.dayType === "engine") { label = "ENGINE · Zone 2"; detail = rx.purpose; dl = "#track"; ptype = "program_engine"; }
        else if (rx.dayType === "move") { label = "MOVE · " + (getP("lifestyle.stepTarget", 8000)) + " Schritte"; detail = rx.purpose; ptype = "program_move"; }
        else { label = rx.title + " · Recovery"; detail = rx.purpose; ptype = "program_recover"; }
        if (mode === "recovery_sick" && (rx.dayType === "strength" || rx.dayType === "engine")) { label = "ANGEPASST · " + rx.title; detail = "Krank/angeschlagen: heute zählt die Minimalversion — " + rx.minVersion; ptype = "program_recover"; dl = "kurs-programm.html"; }
        else if ((mode === "travel" || mode === "no_gym") && rx.dayType === "strength") { detail = "Unterwegs/ohne Gym: " + rx.minVersion + " (temporäre Alternative — dein Plan bleibt erhalten)"; }
      }
      acts.push({ id: "program:d" + p.day, domain: "training", type: ptype, dayType: rx ? rx.dayType : null, date: date, priority: 1, source: "program", deepLink: dl, label: label, detail: detail, done: isProgramDayDone(p.day) });
    }
    if (nut && nut.protein) {
      var ft = todayFoodTotals();
      var ndetail = ft ? (ft.p + " / " + nut.protein + " g Protein · " + ft.kcal + " / " + nut.kcal + " kcal") : (nut.protein + " g Protein · ~" + nut.kcal + " kcal (Ziel — noch nichts geloggt)");
      acts.push({ id: "nutrition:protein:" + date, domain: "nutrition", type: "protein_target", date: date, priority: 2, source: "nutrition", deepLink: "#plan", label: "Nutrition", detail: ndetail, logged: !!ft, done: ft ? (ft.p >= nut.protein * 0.9) : actionDone("nutrition:protein:" + date) });
    }
    acts.push({ id: "move:" + date, domain: "movement", type: "steps", date: date, priority: 3, source: "os", deepLink: "#today", label: "Move", detail: (getP("lifestyle.stepTarget", 8000)) + " Schritte", done: actionDone("move:" + date) });
    var sleepT = getP("recovery.bedtime", "22:30");
    acts.push({ id: "sleep:" + date, domain: "recovery", type: "sleep", date: date, priority: 4, source: "os", deepLink: "#today", label: "Sleep", detail: "Ziel " + sleepT + " · " + (getP("recovery.sleepHours", 7) || 7) + "h+", done: actionDone("sleep:" + date) });
    if (stack && Array.isArray(stack.items) && stack.items.length) {
      acts.push({ id: "stack:" + date, domain: "stack", type: "routine", date: date, priority: 5, source: "stack", deepLink: "#plan", label: "Stack-Routine", detail: stack.items.slice(0, 3).map(function (i) { return i.name; }).join(" · ") + (stack.items.length > 3 ? " …" : ""), done: actionDone("stack:" + date) });
    }
    // §94 — HIGH STRESS: Tageslast reduzieren, nur die 3 Essentials.
    if (mode === "high_stress") return acts.slice(0, 3);
    return acts.slice(0, 5);
  }
  function isProgramDayDone(day) {
    var daily = S.get("c2_daily", {}) || {}; var rec = daily["d" + day] || {};
    return !!rec.p;
  }
  // Workout aus dem OS abschließen = Programm-Tag als erledigt persistieren
  // (reiner Persistenz-Schreibzugriff auf denselben Key, den course.js liest —
  // KEINE Doppel-Erfassung, keine Logik-Kopie).
  // §10 — Ein Workout darf einen Programm-Tag NUR abschließen, wenn der
  // Tagestyp Kraft erwartet und das Ereignis zu Zyklus+Tag gehört. Der Guard
  // liest den echten Tagestyp über den read-only Adapter MM.programView.
  function completeProgramDay(day, opts) {
    opts = opts || {};
    var pv = (window.MM && MM.programView) ? MM.programView : null;
    var dayType = pv ? pv.dayTypeAt(day) : null;
    if (opts.requireStrength !== false) {
      if (!pv) return { ok: false, reason: "no_program_view", dayType: null };
      if (dayType !== "strength") return { ok: false, reason: "day_not_strength", dayType: dayType };
      if (opts.cycleId && opts.cycleId !== cycleId()) return { ok: false, reason: "cycle_mismatch", dayType: dayType };
    }
    var daily = S.get("c2_daily", {}) || {};
    daily["d" + day] = Object.assign({}, daily["d" + day], { p: true });
    S.set("c2_daily", daily);
    emit("WORKOUT_COMPLETED", { day: day, dayType: dayType, cycle: cycleId(), sessionId: opts.sessionId || null });
    return { ok: true, dayType: dayType };
  }
  // §88 — Engine-Tag analog: eine geloggte Engine-Session schließt nur einen
  // Engine-Tag ab (nie einen Kraft-Tag "aus Versehen").
  function completeEngineDay(day, opts) {
    opts = opts || {};
    var pv = (window.MM && MM.programView) ? MM.programView : null;
    var dayType = pv ? pv.dayTypeAt(day) : null;
    if (!pv || dayType !== "engine") return { ok: false, reason: "day_not_engine", dayType: dayType };
    var daily = S.get("c2_daily", {}) || {};
    daily["d" + day] = Object.assign({}, daily["d" + day], { p: true });
    S.set("c2_daily", daily);
    emit("ENGINE_COMPLETED", { day: day, cycle: cycleId(), session: opts.session || null });
    return { ok: true, dayType: dayType };
  }

  /* ---- REMINDER ENGINE (§71) — in-app "fällig"-Zustand, kein Push-Fake ---- */
  function reminders() {
    var out = [];
    var d = (window.MM && MM.account) ? MM.account.getDashboardState() : { program: {} };
    var p = d.program || {};
    if (p.active && !p.notStarted && !p.over) {
      var rx = (window.MM && MM.programView) ? MM.programView.getTodayPrescription() : null;
      if (rx && rx.dayType === "strength" && !isProgramDayDone(p.day)) out.push({ type: "workout", urgent: true, text: "Heute ist Krafttag (Session fällig)." });
      // Weekly Pulse fällig: letzte volle Woche ohne Pulse-Eintrag
      var pulse = S.get("c2_pulse", {}) || {};
      var lastFull = Math.floor((p.day - 1) / 7);
      if (lastFull >= 1 && !pulse[lastFull]) out.push({ type: "pulse", urgent: true, text: "Weekly Pulse für Woche " + lastFull + " ist offen — 60 Sekunden, steuert deinen Plan." });
      // Recheck fällig (W4/8/12)
      [4, 8, 12].forEach(function (w) {
        if (p.week >= w && !S.get("c2_reassess_" + w, null) && !((S.get("course_rechecks", {}) || {})["w" + w])) {
          if (p.week === w || p.week === w + 1) out.push({ type: "recheck", urgent: p.week === w, text: "Recheck W" + w + " ist fällig — Messwerte eintragen." });
        }
      });
    }
    // Messung veraltet (>7 Tage kein Gewicht)
    var lw = latestMetric("weight");
    if (lw && diffDays(lw.date, todayYmd()) > 7) out.push({ type: "measurement", urgent: false, text: "Letzte Gewichtsmessung ist " + diffDays(lw.date, todayYmd()) + " Tage her — Trends brauchen Messpunkte." });
    // §27/§80 — Lab-Recheck fällig ODER neue Lab-Änderung (nur wenn relevant, nicht täglich)
    if (window.MM && MM.labs) {
      try {
        var due2 = MM.labs.rechecksDue();
        if (due2.length) { var m0 = (MM.labsData ? MM.labsData.marker(due2[0].markerId) : null); out.push({ type: "lab_recheck", urgent: false, text: "Lab-Recheck fällig: " + (m0 ? m0.name : due2[0].markerId) + (due2.length > 1 ? " +" + (due2.length - 1) + " weitere" : "") + " — " + due2[0].note }); }
      } catch (e) {}
    }
    return out;
  }

  // NEXT BEST ACTION (§56–§59) — deterministisch, regelbasiert.
  // Inputs: Aktionen, Engpass, Dringlichkeit (Pulse/Recheck fällig), Recovery-
  // Zustand (Pulse/Kontext), Weekly-Pulse-Verdict. EINE primäre Aktion + NOT-NOW.
  function nextBestAction() {
    var acts = todayActions();
    var open = acts.filter(function (a) { return !a.done; });
    var d = (window.MM && MM.account) ? MM.account.getDashboardState() : {};
    var bn = (d && d.bottleneck) || getP("goals.bottleneck", "");
    var rem = reminders();
    var lp = lastPulse();
    var recLow = recoveryLow();
    var notNow = [];
    // §57 — Dringlichkeit: fälliger Pulse/Recheck kann alles überstimmen.
    var urgent = rem.find(function (r) { return r.urgent && (r.type === "pulse" || r.type === "recheck"); });
    if (urgent) {
      var ua = { id: "due:" + urgent.type, domain: "review", type: urgent.type + "_due", date: todayYmd(), priority: 0, source: "reminder", deepLink: "kurs-programm.html", label: urgent.type === "pulse" ? "Weekly Pulse" : "Recheck", detail: urgent.text, done: false };
      return { primary: ua, notNow: ["Neue Pläne bauen, bevor die Review-Daten da sind"], recoveryLow: recLow };
    }
    if (!open.length) return { primary: null, notNow: ["Alles Wichtige ist erledigt. Kein Grund, künstlich mehr draufzupacken."], recoveryLow: recLow };
    var scored = open.map(function (a) {
      var s = 10 - a.priority;
      if (bn === "recovery" && a.domain === "recovery") s += 4;
      if (bn === "engine" && a.domain === "movement") s += 3;
      if ((bn === "body" || bn === "metabolic") && a.domain === "nutrition") s += 3;
      if ((bn === "strength" || bn === "lifestyle") && a.domain === "training") s += 3;
      if (a.domain === "training") s += 2;   // Programm ist das Rückgrat
      // §58 — Recovery-Schutz: bei schlechter Recovery hartes Training nicht pushen.
      if (recLow && a.type === "program_strength") s -= 4;
      if (recLow && a.domain === "recovery") s += 5;
      return { a: a, s: s };
    }).sort(function (x, y) { return y.s - x.s; });
    var primary = scored[0].a;
    var advisory = "";
    if (recLow && primary.type === "program_strength") advisory = "Recovery ist unten — heute zählt die Minimalversion oder ein bewusster Recovery-Tag mehr als eine erzwungene Vollsession.";
    // §59 — NOT-NOW aus echtem Zustand: Verdict + Adhärenz + Engpass.
    var vcode = lp && lp.verdict && lp.verdict.code;
    if (vcode === "execution" || vcode === "off_track") notNow.push("Programm wechseln", "Kalorien weiter senken", "Neue Supplements");
    else if (lp && lp.stagnant) notNow.push("Einfach 'mehr Disziplin' versuchen — justiere stattdessen EINE Stellschraube (Review unten)");
    else if (bn === "recovery" || recLow) notNow.push("Mehr Supplements", "Mehr Cardio-Volumen", "Programm wechseln");
    else if (bn === "body" || bn === "metabolic") notNow.push("Supplement Nr. 12", "Noch ein neuer Trainingsplan");
    else notNow.push("Mehr gleichzeitig ändern", "Neue Tools suchen");
    return { primary: primary, notNow: notNow, advisory: advisory, recoveryLow: recLow };
  }

  /* ======================= KONTEXT-MODI (§90–§94) ======================= */
  var CONTEXT_MODES = ["normal", "travel", "high_stress", "no_gym", "vacation", "recovery_sick"];
  var CONTEXT_INFO = {
    normal: { label: "Normal", note: "" },
    travel: { label: "Travel", note: "Sessions als Minimalversion (Kurzhantel/Körpergewicht), Meals als No-Cook-Strategie. Dein Plan bleibt unverändert erhalten." },
    high_stress: { label: "High Stress", note: "Today reduziert auf die 3 Essentials — weniger Liste, mehr Fokus." },
    no_gym: { label: "No Gym", note: "Temporäre Übungs-Alternativen ohne Studio. Dein Hauptplan wird NICHT überschrieben." },
    vacation: { label: "Vacation", note: "Minimum Days zählen. Bewegung + Protein grob halten reicht — der Plan wartet." },
    recovery_sick: { label: "Krank / Angeschlagen", note: "Kein hartes Training. Erholung, Flüssigkeit, Schlaf. Rückkehr: 1–2 leichte Tage, dann normal — bei Warnzeichen ärztlich abklären (keine Diagnose durch MaleMetrix)." }
  };
  function contextMode() { var m = S.get("os_context", "normal"); return CONTEXT_MODES.indexOf(m) >= 0 ? m : "normal"; }
  function setContextMode(m) { if (CONTEXT_MODES.indexOf(m) >= 0) { S.set("os_context", m); emit("CONTEXT_CHANGED", { mode: m }); } }

  /* ======================= ICS-EXPORT (Kalender, §68/§69) ======================= */
  // Ehrlich: ICS-Download + Deep-Link, KEIN Zwei-Wege-Sync.
  // Events tragen den ECHTEN Tagestyp; UIDs sind stabil (cycle_id + program day).
  function icsForNextDays(days, timeHHMM) {
    var d = (window.MM && MM.account) ? MM.account.getDashboardState() : { program: {} };
    var p = d.program || {};
    if (!p.active || p.notStarted || p.over) return null;
    var pv = (window.MM && MM.programView) ? MM.programView : null;
    var t = (timeHHMM || getP("calendar.trainTime", "18:00")).replace(":", "") + "00";
    var cid = cycleId();
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MaleMetrix//OS//DE"];
    var now = new Date();
    for (var i = 0; i < (days || 7); i++) {
      var dt = new Date(now.getTime() + i * 86400000);
      var ymd = dt.getFullYear() + String(dt.getMonth() + 1).padStart(2, "0") + String(dt.getDate()).padStart(2, "0");
      var day = p.day + i; if (day > 84) break;
      var rx = pv ? pv.getPrescription(day) : null;
      var summary = "MaleMetrix · Tag " + day;
      if (rx) {
        if (rx.dayType === "strength") summary = "MaleMetrix · STRENGTH (Session " + rx.strengthSlotOfWeek + "/" + rx.strengthSlotsInWeek + ")";
        else summary = "MaleMetrix · " + rx.title;
      }
      lines.push("BEGIN:VEVENT", "UID:mm-" + cid + "-d" + day + "@malemetrix", "DTSTART:" + ymd + "T" + t,
        "SUMMARY:" + summary, "URL:https://www.malemetrix.com/kurs-programm.html", "END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  /* ---- RESCHEDULE (§70) — verpasster Krafttag → beste Ausweichtage ----
     Nutzt den echten Wochenplan: schlägt kommende Nicht-Kraft-Tage der
     laufenden Woche vor (Abstand zu weiteren Krafttagen beachtet) und
     verschiebt über den bestehenden dayswap-Mechanismus des Kerns. */
  function rescheduleOptions() {
    var pv = (window.MM && MM.programView) ? MM.programView : null;
    if (!pv || !pv.available()) return null;
    var st = pv.state(); if (st.notStarted || st.over) return null;
    var today = st.day;
    // verpasster Krafttag: gestern/vorgestern strength und nicht erledigt
    var missed = null;
    for (var back = 1; back <= 2; back++) {
      var pd = today - back; if (pd < 1) break;
      if (pv.dayTypeAt(pd) === "strength" && !isProgramDayDone(pd)) { missed = pd; break; }
    }
    if (missed == null) return null;
    var weekEnd = Math.min(84, (Math.ceil(today / 7)) * 7);
    var options = [];
    for (var d2 = today; d2 <= weekEnd; d2++) {
      var ty = pv.dayTypeAt(d2);
      if (ty === "strength" || isProgramDayDone(d2)) continue;
      // Abstand: direkt neben einem weiteren Krafttag ist zweite Wahl
      var adjacent = (d2 > 1 && pv.dayTypeAt(d2 - 1) === "strength") || (d2 < 84 && pv.dayTypeAt(d2 + 1) === "strength");
      options.push({ day: d2, dayType: ty, quality: adjacent ? "ok" : "gut" });
    }
    options.sort(function (a, b) { return (a.quality === "gut" ? 0 : 1) - (b.quality === "gut" ? 0 : 1) || a.day - b.day; });
    return { missedDay: missed, options: options.slice(0, 3) };
  }
  function applyReschedule(missedDay, targetDay) {
    // Tausch über denselben persistierten Mechanismus, den der Kern liest (c2_dayswap).
    var pv = (window.MM && MM.programView) ? MM.programView : null;
    if (!pv) return false;
    var a = pv.dayTypeAt(missedDay), b = pv.dayTypeAt(targetDay);
    if (a !== "strength" || b === "strength") return false;
    var ov = S.get("c2_dayswap", {}) || {};
    ov["d" + missedDay] = b; ov["d" + targetDay] = a;
    S.set("c2_dayswap", ov);
    emit("ACTION_RESCHEDULED", { from: missedDay, to: targetDay });
    return true;
  }

  MM.os = {
    emit: emit,
    profile: profile, getP: getP, setP: setP, prefillFromScore: prefillFromScore, readiness: readiness,
    PATHWAYS: PATHWAYS, pathway: pathway, setPathway: setPathway,
    logMetric: logMetric, metricSeries: metricSeries, latestMetric: latestMetric, firstMetric: firstMetric, metricTrend: metricTrend,
    baseline: baseline, baselines: baselines, saveBaseline: saveBaseline, baselineKey: baselineKey,
    cycleId: cycleId, currentCycle: currentCycle, completeCycle: completeCycle, cycleHistory: cycleHistory, ensureCycle: ensureCycle,
    savePhoto: savePhoto, getPhoto: getPhoto, hasPhotos: hasPhotos, photoStatus: photoStatus, checkpointOf: checkpointOf,
    todayActions: todayActions, completeAction: completeAction, actionDone: actionDone,
    completeProgramDay: completeProgramDay, completeEngineDay: completeEngineDay, isProgramDayDone: isProgramDayDone,
    nextBestAction: nextBestAction, reminders: reminders,
    lastPulse: lastPulse, recoveryLow: recoveryLow,
    nutritionLog: nutritionLog, logFood: logFood, todayFoodTotals: todayFoodTotals,
    rescheduleOptions: rescheduleOptions, applyReschedule: applyReschedule,
    contextMode: contextMode, setContextMode: setContextMode, CONTEXT_INFO: CONTEXT_INFO,
    icsForNextDays: icsForNextDays,
    SYNC_CLASSIFICATION: null // wird unten gesetzt (§95/§96)
  };

  /* ======= SYNC-INVENTAR (§95/§96) — jede OS-Persistenz ist klassifiziert =======
     CLOUD  → registrierte Sync-Domain (os_state)
     LOCAL  → bewusst nur dieses Gerät (Begründung dokumentiert)
     META   → Sync-/Versions-Metadaten des Account-Layers selbst
     Der automatisierte Inventar-Test schlägt fehl, wenn ein mm_-Key auftaucht,
     der in keiner Klasse liegt. */
  var SYNC_DOMAINS = {
    osprofile: "os_profile", osmetrics: "os_metrics", osbaseline: "os_baseline",
    osnutrition: "os_nutrition_plan", ostraining: "os_training_plan",
    osstack: "os_stack", osactions: "os_actions", ostransform: "os_transformation",
    osworkouts: "os_workout_logs",          // §13 — echte Sätze/Lasten syncen
    osnutridays: "os_nutrition_days",       // Phase C — persistierte Meal-Days
    osnutrilog: "os_nutrition_log",         // Phase C — echtes Food-Logging
    osadjust: "os_adjust_history",          // §39 — Anpassungshistorie
    osengine: "os_engine_log",              // §88 — Engine-/Cardio-Sessions
    oscycle: "os_cycle", oscyclehist: "os_cycle_history",
    oscontext: "os_context", osreminders: "os_reminders_done",
    oslabpanels: "lab_panels", oslabresults: "lab_results", oslabnotes: "lab_notes",  // Phase 4 (registriert in labs.js)
    // Phase 6 — Execution-Layer (registriert in execution.js)
    osoverlays: "os_overlays", osreschedules: "os_reschedules", osdecisions: "os_decisions",
    osdaylog: "os_daylog", osreminderprefs: "os_reminder_prefs"
  };
  var LOCAL_ONLY = {
    os_events: "abgeleitetes, gekapptes Ereignis-Log (rekonstruierbar)",
    os_photo_pending: "Foto-Upload existiert nicht — Fotos sind bewusst device-only",
    os_reminder_state: "Notification-Zustand ist Geräte-Zustand (Dedup pro Gerät)",
    os_push_subscription: "Push-Subscription ist per Definition geräte-gebunden",
    os_workout_draft: "laufende Session — Resume gehört zum Gerät, nicht zum Konto",
    os_comeback_ack: "Begrüßungs-Zustand pro Gerät",
    os_insights_state: "Insight-Anzeige-Dedup pro Gerät"
  };
  MM.os.SYNC_CLASSIFICATION = { cloud: SYNC_DOMAINS, localOnly: LOCAL_ONLY };

  try {
    if (MM.account && MM.account.registerStateDomain) {
      Object.keys(SYNC_DOMAINS).forEach(function (n) { MM.account.registerStateDomain(n, SYNC_DOMAINS[n]); });
    }
  } catch (e) {}
})();
