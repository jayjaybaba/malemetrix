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

  /* ======================= BASELINE ======================= */
  // Pro Zyklus (Key = c2_start bzw. "pre" vor Programmstart). Fotos: optional,
  // LOCAL-FIRST in IndexedDB — kein stiller Upload, keine Fake-KFA-Analyse.
  function baselineKey() { return S.get("c2_start", "") || "pre"; }
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
  function photoKey(week, angle, key) { return (key || baselineKey()) + ":" + week + ":" + angle; }
  function savePhoto(week, angle, blob, key) {
    return photoDb().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction("photos", "readwrite");
        tx.objectStore("photos").put(blob, photoKey(week, angle, key));
        tx.oncomplete = function () { res(true); }; tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function getPhoto(week, angle, key) {
    return photoDb().then(function (db) {
      return new Promise(function (res) {
        var tx = db.transaction("photos", "readonly");
        var rq = tx.objectStore("photos").get(photoKey(week, angle, key));
        rq.onsuccess = function () { res(rq.result || null); }; rq.onerror = function () { res(null); };
      });
    }).catch(function () { return null; });
  }
  function hasPhotos(week, key) {
    return Promise.all(["front", "side", "back"].map(function (a) { return getPhoto(week, a, key); }))
      .then(function (r) { return r.some(Boolean); });
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

  // Aggregiert Programm + Nutrition + Movement + Recovery + Stack zu 3–5
  // sinnvollen Aktionen. Programm-Aktion kommt aus dem ECHTEN Programm-State
  // (rein lesend über MM.account.getDashboardState — keine Logik-Kopie).
  function todayActions() {
    var d = (window.MM && MM.account) ? MM.account.getDashboardState() : { program: { active: false }, access: {} };
    var p = d.program || {};
    var acts = [];
    var date = todayYmd();
    var nut = S.get("os_nutrition_plan", null);
    var stack = S.get("os_stack", null);
    var prof = profile();

    if (d.access && d.access.twelve_week && p.active && !p.notStarted && !p.over) {
      acts.push({ id: "program:d" + p.day, domain: "training", type: "program_day", date: date, priority: 1, source: "program", deepLink: "kurs-programm.html", label: "Programm · Tag " + p.day, detail: "Woche " + p.week + " · Phase " + p.phase, done: isProgramDayDone(p.day) });
    }
    if (nut && nut.protein) {
      acts.push({ id: "nutrition:protein:" + date, domain: "nutrition", type: "protein_target", date: date, priority: 2, source: "nutrition", deepLink: "#plan", label: "Nutrition", detail: nut.protein + " g Protein · ~" + nut.kcal + " kcal", done: actionDone("nutrition:protein:" + date) });
    }
    acts.push({ id: "move:" + date, domain: "movement", type: "steps", date: date, priority: 3, source: "os", deepLink: "#today", label: "Move", detail: (getP("lifestyle.stepTarget", 8000)) + " Schritte", done: actionDone("move:" + date) });
    var sleepT = getP("recovery.bedtime", "22:30");
    acts.push({ id: "sleep:" + date, domain: "recovery", type: "sleep", date: date, priority: 4, source: "os", deepLink: "#today", label: "Sleep", detail: "Ziel " + sleepT + " · " + (getP("recovery.sleepHours", 7) || 7) + "h+", done: actionDone("sleep:" + date) });
    if (stack && Array.isArray(stack.items) && stack.items.length) {
      acts.push({ id: "stack:" + date, domain: "stack", type: "routine", date: date, priority: 5, source: "stack", deepLink: "#plan", label: "Stack-Routine", detail: stack.items.slice(0, 3).map(function (i) { return i.name; }).join(" · ") + (stack.items.length > 3 ? " …" : ""), done: actionDone("stack:" + date) });
    }
    return acts.slice(0, 5);   // Tageslimit: 3–5 sinnvolle Aktionen, nie 14
  }
  function isProgramDayDone(day) {
    var daily = S.get("c2_daily", {}) || {}; var rec = daily["d" + day] || {};
    return !!rec.p;
  }
  // Workout aus dem OS abschließen = Programm-Tag als erledigt persistieren
  // (reiner Persistenz-Schreibzugriff auf denselben Key, den course.js liest —
  // KEINE Doppel-Erfassung, keine Logik-Kopie).
  function completeProgramDay(day) {
    var daily = S.get("c2_daily", {}) || {};
    daily["d" + day] = Object.assign({}, daily["d" + day], { p: true });
    S.set("c2_daily", daily);
    emit("WORKOUT_COMPLETED", { day: day });
  }

  // NEXT BEST ACTION — deterministisch, regelbasiert. Engpass-gewichtet.
  // Liefert genau EINE primäre Aktion + NOT-NOW-Liste.
  function nextBestAction() {
    var acts = todayActions();
    var open = acts.filter(function (a) { return !a.done; });
    var d = (window.MM && MM.account) ? MM.account.getDashboardState() : {};
    var bn = (d && d.bottleneck) || getP("goals.bottleneck", "");
    var notNow = [];
    if (!open.length) return { primary: null, notNow: ["Alles Wichtige ist erledigt. Kein Grund, künstlich mehr draufzupacken."] };
    // Score je Aktion: Basis = 10 - priority; Engpass-Bonus; Recovery-Schutz.
    var scored = open.map(function (a) {
      var s = 10 - a.priority;
      if (bn === "recovery" && a.domain === "recovery") s += 4;
      if (bn === "engine" && a.domain === "movement") s += 3;
      if ((bn === "body" || bn === "metabolic") && a.domain === "nutrition") s += 3;
      if ((bn === "strength" || bn === "lifestyle") && a.type === "program_day") s += 3;
      if (a.type === "program_day") s += 2;   // Programm ist das Rückgrat
      return { a: a, s: s };
    }).sort(function (x, y) { return y.s - x.s; });
    // NOT NOW — sagen, was gerade NICHT der Hebel ist.
    if (bn === "recovery") notNow.push("Mehr Supplements", "Mehr Cardio-Volumen", "Programm wechseln");
    else if (bn === "body" || bn === "metabolic") notNow.push("Supplement Nr. 12", "Noch ein neuer Trainingsplan");
    else notNow.push("Mehr gleichzeitig ändern", "Neue Tools suchen");
    return { primary: scored[0].a, notNow: notNow };
  }

  /* ======================= KONTEXT-MODI ======================= */
  var CONTEXT_MODES = ["normal", "travel", "high_stress", "no_gym", "vacation", "recovery_sick"];
  function contextMode() { var m = S.get("os_context", "normal"); return CONTEXT_MODES.indexOf(m) >= 0 ? m : "normal"; }
  function setContextMode(m) { if (CONTEXT_MODES.indexOf(m) >= 0) S.set("os_context", m); }

  /* ======================= ICS-EXPORT (Kalender) ======================= */
  // Ehrlich: ICS-Download + Deep-Link, KEIN Zwei-Wege-Sync.
  // P1-FIX (Phase 6): früher erzeugte diese Funktion ein Event für JEDEN Tag —
  // auch Ruhetage. Jetzt delegiert sie an MM.exec (nur echte Termine:
  // Trainingstage, Nachhol-Sessions, Review, Messtag).
  function icsForNextDays(days, timeHHMM) {
    if (timeHHMM) setP("calendar.trainTime", timeHHMM);
    if (window.MM && MM.exec && MM.exec.icsCalendar) return MM.exec.icsCalendar(days || 14);
    return null;
  }

  MM.os = {
    emit: emit,
    profile: profile, getP: getP, setP: setP, prefillFromScore: prefillFromScore, readiness: readiness,
    PATHWAYS: PATHWAYS, pathway: pathway, setPathway: setPathway,
    logMetric: logMetric, metricSeries: metricSeries, latestMetric: latestMetric, firstMetric: firstMetric, metricTrend: metricTrend,
    baseline: baseline, baselines: baselines, saveBaseline: saveBaseline, baselineKey: baselineKey,
    savePhoto: savePhoto, getPhoto: getPhoto, hasPhotos: hasPhotos,
    todayActions: todayActions, completeAction: completeAction, actionDone: actionDone,
    completeProgramDay: completeProgramDay, isProgramDayDone: isProgramDayDone,
    nextBestAction: nextBestAction,
    contextMode: contextMode, setContextMode: setContextMode,
    icsForNextDays: icsForNextDays
  };

  // OS-Domains beim Account-Sync registrieren (generische os_state-Tabelle).
  try {
    if (MM.account && MM.account.registerStateDomain) {
      MM.account.registerStateDomain("osprofile", "os_profile");
      MM.account.registerStateDomain("osmetrics", "os_metrics");
      MM.account.registerStateDomain("osbaseline", "os_baseline");
      MM.account.registerStateDomain("osnutrition", "os_nutrition_plan");
      MM.account.registerStateDomain("ostraining", "os_training_plan");
      MM.account.registerStateDomain("osstack", "os_stack");
      MM.account.registerStateDomain("osactions", "os_actions");
      MM.account.registerStateDomain("ostransform", "os_transformation");
    }
  } catch (e) {}
})();
