/* ==========================================================================
   MALEMETRIX OS — PROGRAM VIEW  (MM.programView)
   --------------------------------------------------------------------------
   READ-ONLY Adapter über dem eingefrorenen 12-Week-Kern (js/course.js).
   Repliziert dessen Tagesmodell 1:1 aus denselben persistierten Keys
   (c2_goal, c2_bottleneck, c2_start, c2_days, c2_dayswap, c2_mode_history,
   c2_bn_history, c2_pause_since, c2_paused_days) — schreibt NIE.
   Die Treue wird per Paritätstest gegen window.__C2.dayTypeAt abgesichert
   (kurs-programm.html lädt beide; Drift => Testfehler).
   Kein bezahlter Inhalt: DAY/MODES-Muster sind Framework-Konfiguration, die
   identisch im freien course.js liegt.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var S = { get: function (k, d) { try { return MM.store ? MM.store.get(k, d) : d; } catch (e) { return d; } } };

  /* ---- Framework-Konfiguration (Spiegel von course.js, read-only) ---- */
  var MODE_BASE = {
    cut: ["strength", "engine", "strength", "recover", "strength", "engine", "reset"],
    recomp: ["strength", "engine", "strength", "recover", "strength", "move", "reset"],
    build: ["strength", "engine", "strength", "recover", "strength", "strength", "reset"],
    perform: ["strength", "engine", "strength", "recover", "engine", "strength", "reset"]
  };
  var FILL_ORDER = {
    perform: ["engine", "recover", "engine", "move", "reset"],
    build: ["recover", "engine", "move", "reset", "reset"],
    cut: ["engine", "recover", "engine", "move", "reset"],
    recomp: ["engine", "recover", "move", "reset", "engine"]
  };
  var BN_KEYS = ["recovery", "engine", "body", "strength", "metabolic", "lifestyle", "medical"];
  var DAY_INFO = {
    strength: { label: "STRENGTH", tag: "Kraft", purpose: "45–60 Min Krafttraining. Grundübungen, saubere Technik, Progression.", min: "20 Min Kern-Krafttraining: 3 Grundübungen, je 2 harte Sätze." },
    engine: { label: "ENGINE", tag: "Cardio", purpose: "35–45 Min Zone 2 (locker, du könntest reden) — Rad, zügiges Gehen, Rudern.", min: "20 Min zügiges Gehen. Zählt." },
    recover: { label: "RECOVER", tag: "Regeneration", purpose: "Aktive Erholung: 20–30 Min leichte Bewegung + Mobility. Abends feste Schlafzeit.", min: "20 Min Spaziergang + früh ins Bett." },
    move: { label: "MOVE", tag: "Alltag", purpose: "Alltagsbewegung: Schritt-Ziel treffen. Treppe statt Aufzug.", min: "Ein zügiger 15–20-Min-Spaziergang." },
    mobility: { label: "MOBILITY", tag: "Beweglichkeit", purpose: "15–20 Min Mobility für Hüfte, Schulter, Wirbelsäule.", min: "10 Min Mobility auf die steifste Region." },
    reset: { label: "RESET", tag: "Leichter Tag", purpose: "Bewusst leichter Tag: Spaziergang, Sonne, gutes Essen, früh schlafen.", min: "Ein Spaziergang. Mehr muss heute nicht sein." }
  };
  var PHASES = [
    { key: 1, name: "BUILD THE BASE", weeks: [1, 3] },
    { key: 2, name: "BUILD CAPACITY", weeks: [4, 6] },
    { key: 3, name: "PUSH PERFORMANCE", weeks: [7, 9] },
    { key: 4, name: "LOCK IT IN", weeks: [10, 12] }
  ];

  /* ---- Zeitlogik (identisch zu course.js: DST-sicher via UTC) ---- */
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function todayYmd() { return ymd(new Date()); }
  function parseYmdUTC(s) { var p = String(s || "").split("-"); return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
  function diffDays(a, b) { return Math.round((parseYmdUTC(b) - parseYmdUTC(a)) / 86400000); }

  function startDate() { return S.get("c2_start", ""); }
  function pausedDays() { return S.get("c2_paused_days", 0) || 0; }
  function pauseSince() { return S.get("c2_pause_since", ""); }
  function isPaused() { return !!pauseSince(); }
  function rawDayIndex() { var s = startDate(); if (!s) return 1; var ref = isPaused() ? pauseSince() : todayYmd(); return Math.max(1, diffDays(s, ref) + 1); }
  function notStarted() { var s = startDate(); if (!s) return false; return diffDays(s, todayYmd()) < 0; }
  function currentProgramDay() { return Math.max(1, rawDayIndex() - pausedDays()); }
  function programOver() { return currentProgramDay() > 84; }
  function clampedDay() { return Math.min(84, currentProgramDay()); }
  function weekOf(pd) { return Math.min(12, Math.max(1, Math.ceil(pd / 7))); }
  function phaseOf(week) { for (var i = 0; i < PHASES.length; i++) { if (week >= PHASES[i].weeks[0] && week <= PHASES[i].weeks[1]) return PHASES[i]; } return PHASES[0]; }

  /* ---- Personalisierung (identische Ableitungen) ---- */
  function goal() { var g = S.get("c2_goal", ""); return MODE_BASE[g] ? g : ""; }
  function bottleneck() { var b = S.get("c2_bottleneck", ""); return BN_KEYS.indexOf(b) >= 0 ? b : ""; }
  function modeHistory() { var h = S.get("c2_mode_history", []); return Array.isArray(h) ? h : []; }
  function bnHistory() { var h = S.get("c2_bn_history", []); return Array.isArray(h) ? h : []; }
  function modeAtDay(pd) {
    var h = modeHistory(); var m = goal() || "recomp";
    for (var i = 0; i < h.length; i++) { if (h[i].day <= pd && MODE_BASE[h[i].mode]) m = h[i].mode; }
    return MODE_BASE[m] ? m : "recomp";
  }
  function bottleneckAtDay(pd) {
    var h = bnHistory(); var b = bottleneck() || "recovery";
    for (var i = 0; i < h.length; i++) { if (h[i].day <= pd && BN_KEYS.indexOf(h[i].b) >= 0) b = h[i].b; }
    return BN_KEYS.indexOf(b) >= 0 ? b : "recovery";
  }
  function validDaysArr(d) { return Array.isArray(d) && d.length >= 3 && d.length <= 4 && d.every(function (x) { return typeof x === "number" && x >= 0 && x <= 6; }); }
  function strengthDays() { var d = S.get("c2_days", null); return validDaysArr(d) ? d : null; }

  function buildWeekdayPattern(mode, week, sd) {
    var start = new Date(startDate() + "T00:00:00"); var startWd = start.getDay();
    var p = [];
    for (var pos = 0; pos < 7; pos++) {
      var wd = (startWd + pos) % 7;
      p.push(sd.indexOf(wd) >= 0 ? "strength" : null);
    }
    var fillOrder = FILL_ORDER[mode] || FILL_ORDER.recomp;
    var fi = 0;
    for (var i = 0; i < 7; i++) { if (p[i] === null) { p[i] = fillOrder[fi % fillOrder.length]; fi++; } }
    return p;
  }
  function patternFor(mode, week, bn) {
    var m = MODE_BASE[mode] ? mode : "recomp";
    var b = BN_KEYS.indexOf(bn) >= 0 ? bn : (bottleneck() || "recovery");
    var sd = strengthDays();
    var p = sd ? buildWeekdayPattern(m, week, sd) : MODE_BASE[m].slice();
    var strengthIdx = []; p.forEach(function (x, i) { if (x === "strength") strengthIdx.push(i); });
    if (b === "recovery") {
      if (week <= 6) {
        var repl = ["engine", "move", "mobility"];
        for (var i = 0; i < p.length; i++) { if (repl.indexOf(p[i]) >= 0) { p[i] = "recover"; break; } }
        if (week <= 3 && strengthIdx.length > 3) p[strengthIdx[strengthIdx.length - 1]] = "recover";
      }
    } else if (b === "engine") {
      for (var j = 0; j < p.length; j++) { if (p[j] === "reset" || p[j] === "move") { p[j] = "engine"; break; } }
    } else if (b === "lifestyle") {
      if (week <= 3 && strengthIdx.length > 3) p[strengthIdx[strengthIdx.length - 1]] = "move";
    } else if (b === "body" || b === "metabolic") {
      for (var k = 0; k < p.length; k++) { if (p[k] === "reset") { p[k] = "move"; break; } }
    }
    if (m === "cut" && b === "recovery") { for (var q = 0; q < p.length; q++) { if (p[q] === "engine" && q > 0 && p[q - 1] === "engine") p[q] = "recover"; } }
    return p;
  }
  function dayTypeAt(pd) {
    var week = weekOf(pd);
    var pat = patternFor(modeAtDay(pd), week, bottleneckAtDay(pd));
    var base = pat[(pd - 1) % 7];
    var ov = (S.get("c2_dayswap", {}) || {})["d" + pd];
    return ov || base;
  }
  function expectsStrength(pd) { return dayTypeAt(pd) === "strength"; }

  /* ---- Wochen-Kraftslots: stabile Zuordnung Programm-Tag → Session-Sequenz ----
     Grundlage für exakte Session-Zuordnung (Phase B): der n-te Krafttag der
     Woche bekommt Session-Template n der Rotation — deterministisch aus dem
     Plan, nicht aus einem Zähler. */
  function strengthSlotsInWeek(week) {
    var out = [];
    for (var i = 0; i < 7; i++) {
      var pd = (week - 1) * 7 + i + 1; if (pd > 84) break;
      if (dayTypeAt(pd) === "strength") out.push(pd);
    }
    return out;
  }
  function strengthIndexUpTo(pd) {
    // Wievielter Krafttag des Programms ist pd (1-basiert)? Für Template-Rotation.
    var n = 0;
    for (var d = 1; d <= pd; d++) { if (dayTypeAt(d) === "strength") n++; }
    return n;
  }

  function state() {
    var s = startDate();
    var active = !!(goal() && bottleneck() && s);
    return {
      active: active,
      notStarted: active ? notStarted() : false,
      over: active ? programOver() : false,
      paused: isPaused(),
      day: active ? clampedDay() : 0,
      week: active ? weekOf(clampedDay()) : 0,
      mode: goal() || "",
      bottleneck: bottleneck() || "",
      start: s || ""
    };
  }

  /* ---- Die eine Auskunftsfunktion für TODAY (§8/§9) ---- */
  function getPrescription(pd) {
    var st = state();
    if (!st.active || st.notStarted || st.over) return null;
    var type = dayTypeAt(pd);
    var info = DAY_INFO[type] || DAY_INFO.move;
    var week = weekOf(pd);
    var slots = strengthSlotsInWeek(week);
    return {
      day: pd,
      week: week,
      phase: phaseOf(week).key,
      phaseName: phaseOf(week).name,
      dayType: type,
      title: info.label,
      tag: info.tag,
      purpose: info.purpose,
      minVersion: info.min,
      expectsStrength: type === "strength",
      strengthSlotOfWeek: type === "strength" ? (slots.indexOf(pd) + 1) : 0,
      strengthSlotsInWeek: slots.length,
      trainingSessionSeq: type === "strength" ? strengthIndexUpTo(pd) : 0
    };
  }
  function getTodayPrescription() { return getPrescription(state().day || 1); }

  MM.programView = {
    available: function () { return state().active; },
    state: state,
    dayTypeAt: dayTypeAt,
    expectsStrength: expectsStrength,
    currentProgramDay: currentProgramDay,
    clampedDay: clampedDay,
    weekOf: weekOf,
    strengthSlotsInWeek: strengthSlotsInWeek,
    strengthIndexUpTo: strengthIndexUpTo,
    getPrescription: getPrescription,
    getTodayPrescription: getTodayPrescription,
    DAY_INFO: DAY_INFO
  };
})();
