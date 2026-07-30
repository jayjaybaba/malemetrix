/* ==========================================================================
   MALEMETRIX 12-WEEK SYSTEM 2.0 — Performance Operating System
   Pre-Final-Audit-Fix-Pass. Vault-Inhalt (12 Wochen) unverändert.
   Personalisierung nutzt die zentrale Score-Logik (MM_CHECK.goalDecision) als
   Single Source of Truth. Alle Nutzerdaten lokal (MM.store), versioniert.
   ========================================================================== */
(function () {
  "use strict";
  var gate = document.getElementById("courseGate");
  var content = document.getElementById("courseContent");
  var mount = document.getElementById("courseWeeks");
  if (!gate || !content || !mount) return;

  var DATA = { weeks: [], phases: {}, modules: [] };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };
  var S = { get: function (k, d) { return MM.store.get(k, d); }, set: function (k, v) { MM.store.set(k, v); }, del: function (k) { MM.store.remove ? MM.store.remove(k) : MM.store.set(k, null); } };
  function norm(s) { return MM.vault ? MM.vault.norm(s) : String(s || "").trim().toUpperCase().replace(/\s+/g, ""); }
  function EN() { return !!(window.MM && MM.i18n && MM.i18n.lang === "en"); }
  function tr(o) { return o && typeof o === "object" ? (EN() ? (o.en || o.de) : o.de) : o; }

  /* =========================================================================
     i18n (P17) — Chrome/Buttons/Verdicts vollständig; lange Beschreibungstexte
     als {de,en}-Objekte in den Config-Strukturen.
     ========================================================================= */
  var T_DICT = {
    "c2.today": { de: "HEUTE", en: "TODAY" }, "c2.plan": { de: "PLAN", en: "PLAN" }, "c2.progress": { de: "FORTSCHRITT", en: "PROGRESS" },
    "c2.day": { de: "Tag", en: "Day" }, "c2.week": { de: "Woche", en: "Week" }, "c2.phase": { de: "Phase", en: "Phase" },
    "c2.mode": { de: "Modus", en: "Mode" }, "c2.bottleneck": { de: "Engpass", en: "Bottleneck" }, "c2.today_priority": { de: "Heutige Priorität", en: "Today’s priority" },
    "c2.full": { de: "Full Day", en: "Full Day" }, "c2.min": { de: "Minimum Day", en: "Minimum Day" },
    "c2.train": { de: "TRAIN", en: "TRAIN" }, "c2.move": { de: "MOVE", en: "MOVE" }, "c2.nutrition": { de: "NUTRITION", en: "NUTRITION" }, "c2.recover": { de: "RECOVER", en: "RECOVER" },
    "c2.energy_today": { de: "Energie heute", en: "Energy today" }, "c2.why": { de: "Why this matters", en: "Why this matters" },
    "c2.more_protocol": { de: "Mehr Hintergrund im PROTOKOLL.", en: "More background in THE PROTOCOL." },
    "c2.mission": { de: "This week’s mission", en: "This week’s mission" }, "c2.focus_bn": { de: "Fokus deines Engpasses", en: "Your bottleneck focus" },
    "c2.win": { de: "Win Condition · Erfolg diese Woche, wenn", en: "Win Condition · this week counts if" },
    "c2.done_label": { de: "Erledigt", en: "Done" }, "c2.days_run": { de: "Tage gelaufen", en: "days elapsed" },
    "c2.never_twice": { de: "Nie zweimal hintereinander aussetzen. Ein Minimum Day zählt. Konstanz schlägt Perfektion.", en: "Never miss twice. A Minimum Day counts. Consistency beats perfection." },
    "c2.to_progress": { de: "Zum Weekly Pulse & Fortschritt →", en: "To Weekly Pulse & Progress →" },
    "c2.roadmap_h": { de: "Deine 12-Wochen-Roadmap", en: "Your 12-week roadmap" },
    "c2.roadmap_lead": { de: "Der Überblick. Dein täglicher Fahrplan steht unter HEUTE.", en: "The overview. Your daily plan is under TODAY." },
    "c2.your_mode": { de: "Dein Modus", en: "Your mode" }, "c2.priorities": { de: "Prioritäten", en: "Priorities" },
    "c2.progress_h": { de: "Fortschritt & Anpassung", en: "Progress & adjustment" },
    "c2.progress_lead": { de: "Einmal pro Woche kurz einchecken — das System entscheidet, ob dein Plan bleibt oder sich etwas ändert. Keine Einzeltage überinterpretieren.", en: "Check in once a week — the system decides whether your plan stays or changes. Never over-read single days." },
    "c2.consistency": { de: "Consistency", en: "Consistency" }, "c2.active_days": { de: "aktive Tage", en: "active days" },
    "c2.consistency_note": { de: "Ein verpasster Tag ist kein Rückschritt. Consistency-Rate schlägt Perfektions-Streak.", en: "A missed day is no setback. Consistency rate beats perfection streaks." },
    "c2.weekly_pulse": { de: "Wochen-Ergebnisprüfung", en: "Weekly review" }, "c2.evaluate": { de: "Auswerten", en: "Evaluate" },
    "c2.redo": { de: "Check-in wiederholen", en: "Redo check-in" }, "c2.energy_week": { de: "Energie diese Woche (1–5)", en: "Energy this week (1–5)" },
    "c2.sleep_was": { de: "Schlaf war…", en: "Sleep was…" }, "c2.good": { de: "gut", en: "good" }, "c2.ok": { de: "ok", en: "ok" }, "c2.bad": { de: "schlecht", en: "poor" },
    "c2.warn_q": { de: "Ich hatte ein mögliches Warnsignal (z. B. Brustschmerz, Atemnot, Ohnmacht)", en: "I had a possible warning sign (e.g. chest pain, breathlessness, fainting)" },
    "c2.recheck_h": { de: "Ergebnisprüfungen · W0 → W4 → W8 → W12", en: "Recheck dashboard · W0 → W4 → W8 → W12" },
    "c2.recheck_note": { de: "Trag deine Kernwerte an den vier Messpunkten ein — alles lokal. Keine medizinische Bewertung.", en: "Enter your key values at the four checkpoints — all local. No medical assessment." },
    "c2.start": { de: "Start", en: "Start" }, "c2.now": { de: "Jetzt", en: "Now" },
    "c2.next_move": { de: "Next Move", en: "Next Move" }, "c2.biggest_win": { de: "Biggest Win", en: "Biggest Win" },
    "c2.setup_h": { de: "Richte dein System ein", en: "Set up your system" },
    "c2.setup_lead": { de: "Zwei Minuten. Danach sagt dir das Programm jeden Tag, was zählt — abgestimmt auf dein Ziel und deinen größten Engpass.", en: "Two minutes. Then the program tells you every day what matters — tuned to your goal and biggest bottleneck." },
    "c2.q_goal": { de: "1 · Dein Ziel für die nächsten 12 Wochen", en: "1 · Your goal for the next 12 weeks" },
    "c2.q_bn": { de: "2 · Was hält dich aktuell am stärksten zurück?", en: "2 · What is holding you back most right now?" },
    "c2.q_nutri": { de: "3 · Ernährung — wie genau willst du es?", en: "3 · Nutrition — how precise do you want it?" },
    "c2.q_days": { de: "4 · An welchen Tagen kannst du realistisch Kraft trainieren?", en: "4 · Which days can you realistically strength-train?" },
    "c2.q_start": { de: "5 · Wann startest du?", en: "5 · When do you start?" },
    "c2.start_today": { de: "Heute", en: "Today" }, "c2.start_monday": { de: "Nächsten Montag", en: "Next Monday" },
    "c2.start_btn": { de: "Mein Programm starten →", en: "Start my program →" },
    "c2.why_mode": { de: "WHY THIS MODE?", en: "WHY THIS MODE?" }, "c2.from_score": { de: "Aus deinem MaleMetrix Score", en: "From your MaleMetrix Score" },
    "c2.no_fake_ai": { de: "Empfehlungen basieren nur auf deinen echten Angaben — keine erfundene KI-Analyse.", en: "Recommendations are based only on your real answers — no fabricated AI analysis." },
    "c2.reset": { de: "Programm zurücksetzen", en: "Reset program" },
    "c2.pause": { de: "Programm pausieren", en: "Pause program" }, "c2.resume": { de: "Programm fortsetzen", en: "Resume program" },
    "c2.paused_banner": { de: "Programm pausiert — dein Program Day steht still. Fortsetzen, wenn du wieder startest.", en: "Program paused — your Program Day is frozen. Resume when you’re back." },
    "c2.switch_mode": { de: "Modus wechseln", en: "Switch mode" },
    "c2.shift": { de: "Auf morgen verschieben", en: "Shift to tomorrow" },
    "c2.halfway_h": { de: "Halbzeit-Ergebnisprüfung · Woche 6", en: "Halfway review · Week 6" },
    "c2.what_improved": { de: "Was hat sich verbessert?", en: "What improved?" }, "c2.what_stuck": { de: "Was steht?", en: "What is stuck?" },
    "c2.mode_still": { de: "Passt dein Modus noch?", en: "Is your mode still right?" }, "c2.bn_still": { de: "Passt dein Engpass noch?", en: "Is your bottleneck still right?" },
    "c2.final_report": { de: "Final Transformation Report", en: "Final Transformation Report" }, "c2.current_progress": { de: "Current Progress", en: "Current Progress" },
    "c2.reassess_h": { de: "Engpass-Neubewertung", en: "Bottleneck reassessment" },
    "c2.keep_bn": { de: "Engpass beibehalten", en: "Keep bottleneck" }, "c2.update_bn": { de: "Auf {x} aktualisieren", en: "Update to {x}" }
  };
  function t(key, fb) { var e = T_DICT[key]; if (!e) return fb != null ? fb : key; return EN() ? (e.en || e.de) : e.de; }
  if (window.MM && MM.i18n && MM.i18n.extend) { var ext = {}; Object.keys(T_DICT).forEach(function (k) { ext[k] = T_DICT[k]; }); try { MM.i18n.extend(ext); } catch (e) {} }

  /* =========================================================================
     KONFIGURATION (Framework — kein bezahlter Inhalt)
     ========================================================================= */
  /* Das Gerüst (Tagestypen, Modi, Engpässe, Phasen, Missionen,
     Ernährungs-Level, Mustergenerierung) liegt in js/program-framework.js —
     öffentlich, rein und ohne bezahlten Inhalt. Es MUSS geteilt bleiben:
     die Produktvorschau (vorschau.html) zeigt damit die echte Programmlogik
     statt eines Mockups. Der bezahlte Inhalt bleibt ausschließlich im Vault. */
  var F = MM.programFramework;
  var PHASE_TRAIN = F.PHASE_TRAIN, DAY = F.DAY, MODES = F.MODES, MODE_ORDER = F.MODE_ORDER;
  var BOTTLENECKS = F.BOTTLENECKS, BN_ORDER = F.BN_ORDER, SCORE_MAP = F.SCORE_MAP;
  var PHASES = F.PHASES, MISSIONS = F.MISSIONS, NUTRI = F.NUTRI;

  /* =========================================================================
     ZUGANG (Vault)
     ========================================================================= */
  async function tryCode(code, noPersist) {
    var c = norm(code); if (!c || !window.MM || !MM.vault) return false;
    try { var js = await MM.vault.open("courseVault", c); (0, eval)(js); DATA = window.MM_COURSE || DATA; if (!noPersist) S.set("course_code", c); return true; } catch (e) { return false; }
  }

  /* =========================================================================
     MIGRATION / VERSIONIERUNG (P23)
     ========================================================================= */
  function migrate() {
    var v = S.get("c2_ver", 0);
    if (v < 2) {
      // c2_daily v1 nutzte {train, move, nutrition, recover, energy}; v2 nutzt {p, move, nutrition, recover, energy}
      var d = S.get("c2_daily", null);
      if (d && typeof d === "object") {
        Object.keys(d).forEach(function (k) { var r = d[k]; if (r && r.train != null && r.p == null) { r.p = !!r.train; delete r.train; } });
        S.set("c2_daily", d);
      }
      // Altes course_mode (v1-Modell) → als goal übernehmen, falls noch kein c2_goal
      var oldMode = S.get("course_mode", "");
      if (oldMode && MODES[oldMode] && !S.get("c2_goal", "")) S.set("c2_goal", oldMode);
      S.set("c2_ver", 2);
    }
    if (v < 3) {
      // v3: c2_daily wird program-day-keyed ("d<pd>") statt kalenderdatum-keyed.
      // Das macht die Vergangenheit pausenfest (Pause verschiebt keine Historie mehr).
      var dd = S.get("c2_daily", null);
      var sd0 = S.get("c2_start", "");
      if (dd && typeof dd === "object" && sd0) {
        try {
          var start0 = new Date(sd0 + "T00:00:00");
          var pd0 = S.get("c2_paused_days", 0) || 0;
          var conv = {};
          Object.keys(dd).forEach(function (k) {
            if (/^d\d+$/.test(k)) { conv[k] = dd[k]; return; } // bereits program-day-keyed
            var dt = new Date(k + "T00:00:00");
            if (isNaN(dt.getTime())) return; // ungültiger Key → verwerfen
            var pd = Math.round((dt - start0) / 86400000) + 1 - pd0;
            if (pd >= 1) conv["d" + pd] = dd[k];
          });
          S.set("c2_daily", conv);
        } catch (e) {}
      }
      S.set("c2_ver", 3);
    }
  }

  /* =========================================================================
     STATE / PERSONALISIERUNG
     ========================================================================= */
  function goal() { var g = S.get("c2_goal", ""); return MODES[g] ? g : ""; }
  function setGoal(g) { S.set("c2_goal", g); }
  function bottleneck() { var b = S.get("c2_bottleneck", ""); return BOTTLENECKS[b] ? b : ""; }
  function setBottleneck(b, reason) { var prev = bottleneck(); S.set("c2_bottleneck", b); var h = S.get("c2_bn_history", []); h.push({ b: b, day: currentProgramDay(), reason: reason || "", from: prev || "" }); S.set("c2_bn_history", h); }
  function nutritionMode() { var n = S.get("c2_nutrition", "simple"); return NUTRI[n] ? n : "simple"; }
  // Produktregel: exakt 3 oder 4 Krafttage. Alles andere ist ungültig.
  function validDaysArr(d) { return Array.isArray(d) && d.length >= 3 && d.length <= 4 && d.every(function (x) { return typeof x === "number" && x >= 0 && x <= 6; }); }
  function rawDays() { return S.get("c2_days", null); }
  function strengthDays() { var d = rawDays(); return validDaysArr(d) ? d : null; } // ungültig → null → sicheres Basismuster
  function daysNeedReview() { return personalized() && !validDaysArr(rawDays()); }
  function startDate() { return S.get("c2_start", ""); }
  function personalized() { return !!(goal() && bottleneck() && startDate()); }
  function scoreResult() { try { return S.get("check_result", null); } catch (e) { return null; } }
  function redFlags() { var r = scoreResult(); return (r && Array.isArray(r.flags)) ? r.flags : []; }
  function heightCm() { var r = scoreResult(); if (r && r.answers && r.answers.height != null) { var h = parseFloat(r.answers.height); if (!isNaN(h) && h > 50 && h < 260) return h; } return null; }

  // P1 — Single Source of Truth: MM_CHECK.goalDecision
  function goalRecommend() {
    var r = scoreResult();
    if (r && r.answers && window.MM_CHECK && MM_CHECK.goalDecision) {
      /* Score V2: HEALTH FIRST ist eine Prioritäts-Aussage, keine Trainings-
         richtung — fürs Programm zählt dann die parallele Körperrichtung. */
      try {
        var dec = MM_CHECK.goalDecision(r.answers);
        var m = (dec && MODES[dec.mode]) ? dec.mode : (dec && MODES[dec.trainingMode] ? dec.trainingMode : "");
        if (m) return { mode: m, reason: (dec && dec.reason) || "", src: "score" };
      } catch (e) {}
    }
    // Fallback für alte/unvollständige Ergebnisse
    if (r && r.plan && MODES[r.plan]) return { mode: r.plan, reason: "", src: "legacy" };
    return { mode: "", reason: "", src: "" };
  }
  function bnRecommend() {
    if (redFlags().length) return { bn: "medical", src: "flags" };
    var r = scoreResult();
    if (r && r.bottleneck && r.bottleneck.key && SCORE_MAP[r.bottleneck.key]) return { bn: SCORE_MAP[r.bottleneck.key], src: "score" };
    return { bn: "", src: "" };
  }

  /* ---- Mode-History (P11) — echte Historie, Vergangenheit immutabel ---- */
  function modeHistory() { var h = S.get("c2_mode_history", []); if (!h.length && goal()) { h = [{ mode: goal(), day: 1 }]; S.set("c2_mode_history", h); } return h; }
  function switchMode(newMode) { if (!MODES[newMode] || newMode === goal()) return; var h = modeHistory(); h.push({ mode: newMode, day: currentProgramDay(), from: goal() }); S.set("c2_mode_history", h); setGoal(newMode); }
  function modeAtDay(pd) { var h = modeHistory(); var m = goal() || "recomp"; for (var i = 0; i < h.length; i++) { if (h[i].day <= pd && MODES[h[i].mode]) m = h[i].mode; } return MODES[m] ? m : "recomp"; }
  function bnHistory() { var h = S.get("c2_bn_history", []); if (!h.length && bottleneck()) { h = [{ b: bottleneck(), day: 1 }]; S.set("c2_bn_history", h); } return h; }
  function bottleneckAtDay(pd) { var h = bnHistory(); var b = bottleneck() || "recovery"; for (var i = 0; i < h.length; i++) { if (h[i].day <= pd && BOTTLENECKS[h[i].b]) b = h[i].b; } return BOTTLENECKS[b] ? b : "recovery"; }

  /* ---- Pause (P10) ---- */
  function pausedDays() { return S.get("c2_paused_days", 0) || 0; }
  function pauseSince() { return S.get("c2_pause_since", ""); }
  function isPaused() { return !!pauseSince(); }
  function togglePause() {
    if (isPaused()) { var add = Math.max(0, diffDays(pauseSince(), todayYmd())); S.set("c2_paused_days", pausedDays() + add); S.del("c2_pause_since"); }
    else { S.set("c2_pause_since", todayYmd()); }
  }

  /* ---- Tages-/Wochenlogik ---- */
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function todayYmd() { return ymd(new Date()); }
  // P49 — DST-sicherer Tagesabstand: y/m/d als UTC-Mitternacht rechnen (UTC hat keine Sommerzeit),
  // damit 23/25-Stunden-Tage keinen Program Day verschlucken/verdoppeln.
  function parseYmdUTC(s) { var p = String(s || "").split("-"); return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
  function diffDays(a, b) { return Math.round((parseYmdUTC(b) - parseYmdUTC(a)) / 86400000); }
  function rawDayIndex() { var s = startDate(); if (!s) return 1; var ref = isPaused() ? pauseSince() : todayYmd(); return Math.max(1, diffDays(s, ref) + 1); }
  function notStarted() { var s = startDate(); if (!s) return false; return diffDays(s, todayYmd()) < 0; }
  function daysUntilStart() { var s = startDate(); if (!s) return 0; return Math.max(0, diffDays(todayYmd(), s)); }
  function currentProgramDay() { return Math.max(1, rawDayIndex() - pausedDays()); }
  function programOver() { return currentProgramDay() > 84; }
  function clampedDay() { return Math.min(84, currentProgramDay()); }
  function currentWeek() { return Math.min(12, Math.max(1, Math.ceil(clampedDay() / 7))); }
  function phaseOf(week) { return F.phaseOf(week); }

  /* Muster = geteilte Framework-Logik + der lokale Zustand dieses Nutzers
     (gewählte Krafttage, Startwochentag). Die Regeln selbst stehen nur einmal
     — in js/program-framework.js. */
  function startWeekday() {
    var s = startDate(); if (!s) return -1;
    var d = new Date(s + "T00:00:00");
    return isNaN(d.getTime()) ? -1 : d.getDay();
  }
  function patternFor(mode, week, bn) {
    return F.patternFor(mode, week, BOTTLENECKS[bn] ? bn : (bottleneck() || "recovery"),
      { strengthWeekdays: strengthDays(), startWeekday: startWeekday() });
  }
  // Session-Shift-Override (P9): tausche zwei Programm-Tage
  function dayOverrides() { return S.get("c2_dayswap", {}) || {}; }
  function dayTypeAt(programDay) {
    var week = Math.min(12, Math.max(1, Math.ceil(programDay / 7)));
    var mode = modeAtDay(programDay);
    var bn = bottleneckAtDay(programDay);
    var pat = patternFor(mode, week, bn);
    var base = pat[(programDay - 1) % 7];
    var ov = dayOverrides()["d" + programDay]; return ov || base;
  }
  function dayTypeToday() { return dayTypeAt(clampedDay()); }
  function shiftToday() {
    var d = clampedDay(); if (d >= 84) return;
    var ov = dayOverrides(); var a = dayTypeAt(d), b = dayTypeAt(d + 1);
    ov["d" + d] = b; ov["d" + (d + 1)] = a; S.set("c2_dayswap", ov);
  }

  /* ---- Daily Completion (P2) — program-day-keyed ("d<pd>"), pausenfest ---- */
  function dailyAll() { return S.get("c2_daily", {}) || {}; }
  function dailyForDay(pd) { var a = dailyAll(); return a["d" + pd] || {}; }
  function setDailyDay(pd, key, val) { var a = dailyAll(); var kk = "d" + pd; a[kk] = a[kk] || {}; if (val) a[kk][key] = true; else delete a[kk][key]; S.set("c2_daily", a); }
  function setEnergyDay(pd, v) { var a = dailyAll(); var kk = "d" + pd; a[kk] = a[kk] || {}; a[kk].energy = v; S.set("c2_daily", a); }
  // Volle Wochenplanung (unabhängig von elapsed) — für Win-Targets, die zum Split passen
  function plannedInWeek(week, type) { var n = 0; for (var i = 0; i < 7; i++) { var pd = (week - 1) * 7 + i + 1; if (pd > 84) break; if (dayTypeAt(pd) === type) n++; } return n; }

  // P2 + P4 — echte Semantik: primary completion zählt zur jeweiligen Tagesart
  function weekStats(week) {
    var res = { strength: { done: 0, planned: 0 }, engine: { done: 0, planned: 0 }, recover: { done: 0, planned: 0 }, move: 0, nutrition: 0, active: 0, days: 0, recoverNights: 0 };
    if (!startDate() || notStarted()) return res;
    for (var i = 0; i < 7; i++) {
      var pd = (week - 1) * 7 + i + 1; if (pd > clampedDay()) break;
      var dt = dayTypeAt(pd);
      if (dt === "strength") res.strength.planned++; else if (dt === "engine") res.engine.planned++; else if (dt === "recover") res.recover.planned++;
      var rec = dailyForDay(pd); res.days++;
      if (rec.p) { // Hauptaufgabe erledigt → zählt zur Tagesart
        if (dt === "strength") res.strength.done++; else if (dt === "engine") res.engine.done++; else if (dt === "recover" || dt === "reset" || dt === "mobility") res.recover.done++; else if (dt === "move") res.move++;
      }
      /* Nicht doppelt zählen: an einem MOVE-Tag hat die Zeile darüber den
         Tag bereits gutgeschrieben. Sonst meldet die Woche "5 von 5"
         erreicht, obwohl vier Tage geloggt wurden. */
      if (rec.move && dt !== "move") res.move++;
      if (rec.nutrition) res.nutrition++;
      if (rec.recover) res.recoverNights = (res.recoverNights || 0) + 1;
      if (rec.p || rec.move || rec.recover) res.active++;
    }
    res.recoverNights = res.recoverNights || 0;
    return res;
  }
  function winMet(week, modeKey) {
    var wk = weekStats(week); var g = modeKey || modeAtDay(Math.min(84, week * 7)) || goal() || "recomp"; var m = MODES[g] || MODES.recomp;
    return m.win.map(function (w) {
      var cur = 0, target = w.target, label = tr(w.label);
      // P5/P6 — Label und mathematisches Target MÜSSEN identisch sein: Strength/Engine dynamisch
      // aus dem tatsächlichen Wochenplan (SSOT: dayTypeAt). Ein einziger eindeutiger Zielwert.
      if (w.key === "strength") { cur = wk.strength.done; target = Math.min(w.target, plannedInWeek(week, "strength") || w.target); label = target + (EN() ? " strength sessions" : " Strength-Sessions"); }
      else if (w.key === "engine") { cur = wk.engine.done; target = Math.min(w.target, plannedInWeek(week, "engine") || w.target); label = target + (EN() ? (target === 1 ? " engine session" : " engine sessions") : (target === 1 ? " Engine-Einheit" : " Engine-Einheiten")); }
      else if (w.key === "move") cur = wk.move; else if (w.key === "recover") cur = wk.recoverNights; else if (w.key === "nutrition") cur = wk.nutrition;
      return { label: label, key: w.key, target: target, cur: cur, hit: cur >= target };
    });
  }
  function consistency() {
    var elapsed = clampedDay(); var active = 0; if (!startDate()) return { active: 0, elapsed: 0, pct: 0 };
    if (notStarted()) return { active: 0, elapsed: 0, pct: 0 };
    for (var pd = 1; pd <= elapsed; pd++) { var rec = dailyForDay(pd); if (rec.p || rec.move || rec.recover) active++; }
    return { active: active, elapsed: elapsed, pct: elapsed ? Math.round(active / elapsed * 100) : 0 };
  }

  /* ---- Recheck / Trend (P20) ---- */
  function rechecks() { return S.get("course_rechecks", {}) || {}; }
  function latestRecheck(metric) { var rc = rechecks(); var pts = ["w12", "w8", "w4", "w0"]; for (var i = 0; i < pts.length; i++) if (rc[pts[i]] && rc[pts[i]][metric] != null && rc[pts[i]][metric] !== "") return { point: pts[i], val: rc[pts[i]][metric] }; return null; }
  /* ---- Weekly Pulse + Adjustment (P4, P20) ---- */
  /* Freitextfelder erlauben "94,5". parseFloat schneidet am Komma ab und
     macht daraus 94 — aus einem echten Fortschritt wird rechnerisch
     Stagnation und damit eine falsche Plan-Anpassung. */
  function numDE(v) { var x = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isFinite(x) ? x : NaN; }

  function pulses() { return S.get("c2_pulse", {}) || {}; }
  function savePulse(week, obj) { var p = pulses(); p[week] = obj; S.set("c2_pulse", p); }
  // Mode-spezifische Adhärenz: anteilig über die trainingsrelevanten Win-Bedingungen
  // (Strength + Engine) des jeweiligen Modus. So bekommt PERFORM mit 0 Engine KEIN ON TRACK.
  function adherenceFor(week, g) {
    var wk = weekStats(week); var m = MODES[g] || MODES.recomp;
    // P45/P46/P80 — Adhärenz NUR gegen vollständig verstrichene Tage messen. HEUTE zählt noch nicht
    // als Miss (die Einheit kann noch kommen), eine zukünftige Freitagseinheit erst recht nicht.
    // dueThrough = letzter voll abgeschlossener Programmtag.
    var dueThrough = programOver() ? 84 : (clampedDay() - 1);
    function dueCount(type) { var n = 0; for (var i = 0; i < 7; i++) { var pd = (week - 1) * 7 + i + 1; if (pd > dueThrough) break; if (dayTypeAt(pd) === type) n++; } return n; }
    function doneCount(type) { var n = 0; for (var i = 0; i < 7; i++) { var pd = (week - 1) * 7 + i + 1; if (pd > dueThrough) break; if (dayTypeAt(pd) === type && dailyForDay(pd).p) n++; } return n; }
    var need = 0, got = 0, parts = [];
    m.win.forEach(function (w) {
      if (w.key === "strength" || w.key === "engine") {
        var tgt = Math.min(w.target, dueCount(w.key));
        if (tgt <= 0) return;
        var c = doneCount(w.key); need += tgt; got += Math.min(c, tgt); parts.push({ key: w.key, cur: c, target: tgt });
      }
    });
    return { adher: need ? got / need : 1, parts: parts, wk: wk, partial: (need === 0) };
  }
  function adjudicate(week, inp) {
    var lastPd = Math.min(84, week * 7);
    var g = modeAtDay(lastPd);
    var A = adherenceFor(week, g); var st = A.wk;
    var adher = A.adher;
    if (inp.warning) return { code: "check", title: "CHECK FIRST", cls: "check", text: { de: "Du hast ein mögliches Warnsignal angegeben. Kläre das bitte zuerst ärztlich ab, bevor du die Belastung erhöhst. Das Programm läuft auf dem Fundament ruhig weiter.", en: "You reported a possible warning sign. Please get it checked medically before increasing load. The program continues gently on the fundamentals." } };
    // P45/P46 — laufende Woche ohne bereits fällige Kern-Einheiten: nicht als schlechte Adhärenz werten.
    if (A.partial && clampedDay() < week * 7) return { code: "inprogress", title: EN() ? "WEEK IN PROGRESS" : "WOCHE LÄUFT NOCH", cls: "ontrack", text: { de: "Diese Woche läuft noch — es waren noch keine Kern-Einheiten fällig. Werte am Ende der Programmwoche aus, dann ist das Urteil aussagekräftig. Bis dahin: einfach dranbleiben.", en: "This week is still running — no core sessions were due yet. Evaluate at the end of the program week for a meaningful verdict. Until then: just keep going." }, partial: true };
    if (adher < 0.7) {
      var labelOf = function (k) { return k === "strength" ? (EN() ? "strength" : "Kraft") : (EN() ? "engine" : "Cardio"); };
      var shortParts = A.parts.filter(function (p) { return p.cur < p.target; }).map(function (p) { return p.cur + "/" + p.target + " " + labelOf(p.key); });
      var detail = shortParts.length ? shortParts.join(", ") : (st.strength.done + "/" + (st.strength.planned || 0) + (EN() ? " strength" : " Kraft"));
      return { code: "exec", title: "EXECUTION FIRST", cls: "exec", text: { de: "Dein Plan ist wahrscheinlich noch nicht das Problem. In " + MODES[g].label + " zählt vor allem die Trainingsumsetzung, und die war diese Woche nicht konstant genug (" + detail + "). Wir halten die Strategie stabil und fokussieren Umsetzung — nicht mehr Plan, sondern mehr Durchführung.", en: "Your plan is probably not the problem. In " + MODES[g].label + " it’s training execution that counts, and it wasn’t consistent enough this week (" + detail + "). We keep the strategy and focus on execution — not a new plan, just more follow-through." } };
    }
    if (inp.energy && inp.energy <= 3 && inp.sleep === "schlecht") return { code: "recover", title: "RECOVERY FIRST", cls: "recover", text: { de: "Adhärenz ist gut (Training läuft), aber Energie und Schlaf sind unten. Mehr Belastung wäre jetzt nicht mehr Fortschritt. Diese Woche: eine Einheit rausnehmen oder leichter, Schlaf priorisieren.", en: "Adherence is good (training is on), but energy and sleep are low. More load wouldn’t be more progress now. This week: drop or ease one session, prioritize sleep." } };
    // Trend statt Einzelwert (P20)
    var prev = pulses()[week - 1];
    var waistTrend = null;
    if (inp.waist && prev && prev.inp && prev.inp.waist) waistTrend = numDE(inp.waist) - numDE(prev.inp.waist);
    var stagnant = (waistTrend != null && Math.abs(waistTrend) < 0.3);
    if ((g === "cut" || g === "recomp") && stagnant && prev && prev.stagnant) return { code: "adjust", title: "ADJUST — eine Variable", cls: "adjust", text: { de: "Adhärenz hoch, Taille aber mehrere Wochen unverändert (Trend, nicht Einzeltag). Ändere jetzt GENAU EINE Variable — z. B. 500–800 Schritte/Tag mehr ODER eine Engine-Einheit mehr ODER ~10 % weniger Kalorien. Nicht alles gleichzeitig.", en: "Adherence high, but waist unchanged over multiple weeks (trend, not a single day). Change EXACTLY ONE variable — e.g. +500–800 steps/day OR one more engine session OR ~10% fewer calories. Not all at once." }, stagnant: true };
    if (g === "build" && inp.waist && prev && prev.inp && prev.inp.waist && (numDE(inp.waist) - numDE(prev.inp.waist)) > 1) return { code: "adjust", title: "BODY FAT GUARDRAIL", cls: "adjust", text: { de: "Gewicht/Taille steigen schneller als gewollt. Nicht „mehr essen“ — zieh den Überschuss etwas zurück, Progression im Gym bleibt der Fokus.", en: "Weight/waist rising faster than intended. Not “eat more” — pull the surplus back a bit, keep gym progression the focus." } };
    return { code: "ontrack", title: "ON TRACK", cls: "ontrack", text: { de: "Adhärenz gut, Richtung stimmt. Plan beibehalten — Konstanz ist gerade dein stärkster Hebel.", en: "Adherence good, direction right. Keep the plan — consistency is your strongest lever right now." }, stagnant: stagnant };
  }

  /* ---- Bottleneck Reassessment (P7) ---- */
  // P81 — Reassessment erst ab der Mitte der Checkpoint-Woche (genug gelaufene Tage), nicht am ersten Tag.
  function reassessDue() { var w = currentWeek(); if (w !== 4 && w !== 8 && w !== 12) return false; if (clampedDay() < (w - 1) * 7 + 4) return false; return !S.get("c2_reassess_" + w, false); }
  function suggestBottleneck() {
    // aus Recheck-Daten: was hat sich verbessert, was steht?
    var cur = bottleneck();
    function improved(metric) { var rc = rechecks(); var a = rc.w0 && rc.w0[metric], b = latestRecheck(metric); if (a == null || a === "" || !b) return null; var an = parseFloat(a), bn = parseFloat(b.val); if (isNaN(an) || isNaN(bn)) return null; return bn - an; }
    // Wenn Recovery-Engpass & Schlaf/Energie besser, Cardio schwach → engine
    if (cur === "recovery") { var sl = improved("sleep"), en = improved("energy"); if ((sl != null && sl > 0) || (en != null && en > 0)) return { bn: "engine", why: { de: "Deine Recovery hat sich stabilisiert. Dein größter verbleibender Hebel ist jetzt deine Cardiofitness.", en: "Your recovery has stabilized. Your biggest remaining lever is now your cardio fitness." } }; }
    if (cur === "body" || cur === "metabolic") { var wa = improved("waist"); if (wa != null && wa < -1) return { bn: "strength", why: { de: "Deine Taille geht runter. Der nächste Hebel ist, jetzt gezielt Kraft & Muskel aufzubauen.", en: "Your waist is dropping. The next lever is building strength & muscle now." } }; }
    if (cur === "engine") { var ca = improved("cardio"); if (ca != null) return { bn: "strength", why: { de: "Dein Motor läuft besser. Jetzt lohnt sich der Fokus auf Kraft.", en: "Your engine runs better. Now strength focus pays off." } }; }
    return null;
  }

  /* =========================================================================
     RENDER
     ========================================================================= */
  var view = S.get("c2_view", "today");
  function setView(v) { view = v; S.set("c2_view", v); render(); }

  function navBar() {
    var items = [["today", t("c2.today"), "01"], ["plan", t("c2.plan"), "02"], ["progress", t("c2.progress"), "03"]];
    return '<div class="c2-nav" role="tablist">' + items.map(function (it) {
      return '<button type="button" role="tab" aria-selected="' + (view === it[0] ? "true" : "false") + '" data-view="' + it[0] + '" class="' + (view === it[0] ? "on" : "") + '"><span class="n">' + it[2] + '</span>' + esc(it[1]) + '</button>';
    }).join("") + '</div>';
  }
  function phaseBar() {
    var w = currentWeek(), ph = phaseOf(w);
    return '<div class="c2-phase"><div class="c2-phase-top"><span>' + t("c2.phase") + ' <b>' + ph.key + ' / 4</b> — ' + esc(tr(ph.name)) + '</span><span>' + t("c2.week") + ' <b>' + w + '</b> · ' + t("c2.day") + ' <b>' + clampedDay() + '</b></span></div>' +
      '<div class="c2-phase-track">' + PHASES.map(function (p) { var doneP = w > p.weeks[1]; var inP = w >= p.weeks[0] && w <= p.weeks[1]; var frac = inP ? (w - p.weeks[0] + 1) / (p.weeks[1] - p.weeks[0] + 1) : (doneP ? 1 : 0); return '<div class="c2-phase-seg ' + (doneP ? "done" : "") + '"><div class="fill" style="width:' + Math.round(frac * 100) + '%"></div></div>'; }).join("") + '</div></div>';
  }
  function pausedBanner() { return isPaused() ? '<div class="c2-verdict recover" style="margin-bottom:14px"><h3>⏸ ' + esc(t("c2.paused_banner")) + '</h3><button type="button" class="c2-btn" data-resume>' + esc(t("c2.resume")) + '</button></div>' : ""; }

  function renderUpcoming() {
    var n = daysUntilStart(); var name = (S.get("unlock_name", "") || "").split(" ")[0];
    var when = new Date(startDate() + "T00:00:00");
    var wdN = EN() ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] : ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
    var dt0 = DAY[dayTypeAt(1)];
    return phaseBar() + '<div class="c2-today">' +
      '<span class="c2-greet">' + (name ? esc(name.toUpperCase()) + " — " : "") + (EN() ? "READY TO START" : "STARTKLAR") + '</span>' +
      '<div class="c2-daybig"><h1>' + (n === 1 ? (EN() ? "Starts tomorrow" : "Start morgen") : (EN() ? "Starts in " + n + " days" : "Start in " + n + " Tagen")) + '</h1><span>' + esc(wdN[when.getDay()]) + ', ' + esc(startDate()) + '</span></div>' +
      '<div class="c2-card2"><span class="k">' + (EN() ? "Your day 1" : "Dein Tag 1") + ' · ' + esc(tr(dt0.label)) + '</span><p>' + esc(tr(dt0.full)) + '</p><p class="c2-muted" style="margin-top:8px">' + (EN() ? "Nothing to log yet — daily tracking opens on your start date. Use the time to prep (kitchen, schedule, gym bag)." : "Noch nichts abzuhaken — das Tages-Tracking öffnet an deinem Startdatum. Nutze die Zeit zur Vorbereitung (Küche, Kalender, Gym-Tasche).") + '</p></div>' +
      '<div style="margin:14px 0;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="c2-btn ghost" data-startnow>' + (EN() ? "Start today instead" : "Doch heute starten") + '</button><button type="button" class="c2-btn ghost" data-view="plan">' + t("c2.plan") + ' →</button></div>' +
      '</div>';
  }
  function renderToday() {
    if (notStarted()) return renderUpcoming();
    if (programOver()) return renderReport(true);
    var todayPd = clampedDay();
    var dt = DAY[dayTypeToday()], g = goal(), mode = MODES[g], week = currentWeek(), ph = phaseOf(week);
    var date = todayYmd(), rec = dailyForDay(todayPd);
    var showMin = S.get("c2_min_" + date, false);
    var name = (S.get("unlock_name", "") || "").split(" ")[0];
    var wk = weekStats(week);
    var wins = winMet(week);
    var primary = DAY[dayTypeToday()];

    // P14: 12-Wochen-Fortschritt als System-Rail (01…12, aktuelle Woche
    // markiert) + Mono-Systemzeile — das Programm wirkt wie ein System,
    // nicht wie eine Inhaltsseite. Nur echte Wochenposition.
    var rail = "";
    for (var wi = 1; wi <= 12; wi++) rail += '<span class="' + (wi === week ? "cur" : (wi < week ? "done" : "")) + '">' + (wi < 10 ? "0" + wi : wi) + '</span>';
    var html = pausedBanner() + phaseBar() +
      '<div class="os14-prograil"><span class="sys">MM / 12-WEEK SYSTEM</span><div class="rail">' + rail + '</div></div>' +
      '<div class="c2-today">' +
      '<span class="c2-greet">' + (name ? (EN() ? "GOOD DAY, " : "GUTEN TAG, ") + esc(name.toUpperCase()) : (EN() ? "YOUR DAY" : "DEIN TAG")) + '</span>' +
      '<div class="c2-daybig"><h1>' + t("c2.day") + ' ' + clampedDay() + '</h1><span>' + t("c2.phase") + ' ' + ph.key + ' · ' + esc(tr(ph.name)) + '</span></div>' +
      '<p class="c2-metaline">' + t("c2.mode") + ' <b>' + esc(mode.label) + '</b> · ' + t("c2.bottleneck") + ' <b>' + esc(BOTTLENECKS[bottleneck()].label) + '</b> · ' + (EN() ? "Today" : "Heute") + ': <b>' + esc(tr(dt.label)) + '</b></p>' +
      '<div class="c2-action">' +
      '<div class="c2-action-head"><span class="c2-action-ico">' + dt.icon + '</span><h3>' + esc(tr(dt.label)) + ' — ' + esc(tr(dt.tag)) + '</h3><span class="tag">' + t("c2.today_priority") + '</span></div>' +
      '<div class="c2-action-body">' +
      '<div class="c2-toggle" role="group"><button type="button" data-min="0" class="' + (showMin ? "" : "on") + '" aria-pressed="' + (!showMin) + '">' + t("c2.full") + '</button><button type="button" data-min="1" class="' + (showMin ? "on" : "") + '" aria-pressed="' + (!!showMin) + '">' + t("c2.min") + '</button></div>' +
      '<p>' + esc(tr(showMin ? dt.min : dt.full)) + '</p>' +
      (dayTypeToday() === "strength" ? '<p class="c2-muted" style="margin-top:8px">📈 ' + esc(tr(PHASE_TRAIN[ph.key])) + '</p>' : "") +
      '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="c2-btn ghost" data-shift>↦ ' + esc(t("c2.shift")) + '</button></div>' +
      '</div></div>' +
      (dayTypeToday() === "strength" ? renderProgression() : "") +
      '<div class="c2-daily" role="group" aria-label="Daily completion">' +
      [["p", primary.icon, tr(primary.label)], ["move", "🚶", t("c2.move")], ["nutrition", "🍳", t("c2.nutrition")], ["recover", "😴", t("c2.recover")]].map(function (c) {
        return '<button type="button" class="c2-check ' + (rec[c[0]] ? "done" : "") + '" data-check="' + c[0] + '" aria-pressed="' + (!!rec[c[0]]) + '"><span class="ic">' + esc(c[1]) + '</span><span class="lb">' + esc(c[2]) + '</span></button>';
      }).join("") + '</div>' +
      '<div class="c2-energy"><label for="c2en">' + t("c2.energy_today") + '</label><input id="c2en" type="range" min="1" max="5" value="' + (rec.energy || 3) + '" data-energy><span id="c2eVal">' + (rec.energy || 3) + '/5</span></div>' +
      '</div>' +
      '<div class="c2-card2 c2-why"><span class="k">' + t("c2.why") + '</span><p>' + esc(tr(dt.why)) + '</p><p class="c2-muted" style="margin-top:8px"><a href="protokoll.html" style="color:var(--c2-blue2)">' + t("c2.more_protocol") + '</a></p></div>' +
      '<div class="c2-card2"><span class="k">' + esc(nutritionMode().toUpperCase()) + ' · ' + (EN() ? "Nutrition today" : "Ernährung heute") + '</span><p>' + esc(tr(NUTRI[nutritionMode()].card)) + '</p></div>' +
      '<div class="c2-card2 c2-mission"><span class="k">' + t("c2.mission") + ' · ' + t("c2.week") + ' ' + week + '</span><h3>' + esc(MISSIONS[week] || "") + '</h3><p class="c2-muted" style="margin-top:6px">' + t("c2.focus_bn") + ': ' + esc(tr(BOTTLENECKS[bottleneck()].focus)) + '</p></div>' +
      '<div class="c2-card2 c2-win"><span class="k">' + t("c2.win") + '</span><ul>' + wins.map(function (w) { return '<li class="' + (w.hit ? "hit" : "") + '">' + esc(w.label) + ' <span class="c2-muted">(' + w.cur + '/' + w.target + ')</span></li>'; }).join("") + '</ul></div>' +
      (week === 6 ? '<div style="margin:14px 0"><button type="button" class="c2-btn block" data-view="progress">🔎 ' + esc(t("c2.halfway_h")) + ' →</button></div>' : '<div style="margin:14px 0"><button type="button" class="c2-btn block" data-view="progress">' + t("c2.to_progress") + '</button></div>') +
      '<p class="c2-muted" style="text-align:center">' + t("c2.never_twice") + '</p>';
    return html;
  }

  function renderPlan() {
    var g = goal(), mode = MODES[g];
    var html = navBarNote() + '<h2 class="c2-sec-h">' + t("c2.roadmap_h") + '</h2><p class="c2-sec-lead">' + t("c2.roadmap_lead") + '</p>' +
      '<div class="c2-card2"><span class="k">' + t("c2.your_mode") + ' · ' + esc(mode.label) + '</span><h3 style="margin:2px 0 8px">' + esc(tr(mode.oneLiner)) + '</h3>' +
      '<p style="margin-bottom:8px"><b>' + t("c2.priorities") + ':</b> ' + tr(mode.priorities).map(esc).join(" · ") + '</p></div>';
    PHASES.forEach(function (p) {
      html += '<div class="c2-card2" style="border-left:3px solid var(--c2-blue)"><span class="k">' + t("c2.phase") + ' ' + p.key + ' · ' + t("c2.week") + ' ' + p.weeks[0] + "–" + p.weeks[1] + '</span><h3>' + esc(tr(p.name)) + '</h3><p class="c2-muted" style="margin-top:4px">„' + esc(tr(p.feel)) + '“ · ' + esc(tr(PHASE_TRAIN[p.key])) + '</p>';
      for (var w = p.weeks[0]; w <= p.weeks[1]; w++) {
        var wd = (DATA.weeks || []).find(function (x) { return x.week === w; }) || {};
        var byMode = wd.byMode && wd.byMode[g] ? wd.byMode[g] : "";
        html += '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--c2-line)"><div style="display:flex;gap:8px;align-items:baseline"><b style="color:#fff">' + t("c2.week") + ' ' + w + '</b><span style="font-family:var(--c2-mono);font-size:.62rem;letter-spacing:.1em;color:var(--c2-blue2)">' + esc(MISSIONS[w] || "") + '</span></div>' +
          (wd.title ? '<p style="margin-top:4px"><b>' + esc(wd.title) + '</b></p>' : "") + (wd.focus ? '<p class="c2-muted" style="margin-top:4px">' + esc(wd.focus) + '</p>' : "") +
          (byMode ? '<p style="margin-top:6px;font-size:.86rem"><span style="color:var(--c2-cyan)">🎯 ' + esc(mode.label) + ':</span> ' + esc(byMode) + '</p>' : "") + '</div>';
      }
      html += '</div>';
    });
    html += '<p class="c2-muted" style="text-align:center;margin-top:16px"><a href="protokoll.html" style="color:var(--c2-blue2)">' + (EN() ? "Open THE PROTOCOL for the science →" : "Tiefe & Wissenschaft: DAS PROTOKOLL öffnen →") + '</a></p>';
    return html;
  }
  function navBarNote() { return ""; }

  var RC_POINTS = [["w0", "c2.start"], ["w4", "W4"], ["w8", "W8"], ["w12", "W12"]];
  var RC_METRICS = [["score", { de: "MaleMetrix Score", en: "MaleMetrix Score" }], ["weight", { de: "Gewicht (kg)", en: "Weight (kg)" }], ["waist", { de: "Bauchumfang (cm)", en: "Waist (cm)" }], ["strength", { de: "Kraft-Marker", en: "Strength marker" }], ["cardio", { de: "Cardio-Marker", en: "Cardio marker" }], ["sleep", { de: "Schlaf (h)", en: "Sleep (h)" }], ["energy", { de: "Energie (1–10)", en: "Energy (1–10)" }], ["bottleneck", { de: "#1-Engpass", en: "#1 bottleneck" }]];
  function pointLabel(k) { return k === "w0" ? t("c2.start") : k.toUpperCase(); }

  function renderProgress() {
    var week = currentWeek(), g = goal(), mode = MODES[g], con = consistency();
    var html = pausedBanner() + '<h2 class="c2-sec-h">' + t("c2.progress_h") + '</h2><p class="c2-sec-lead">' + t("c2.progress_lead") + '</p>';

    // Reassessment (P7)
    if (reassessDue()) { var sug = suggestBottleneck(); html += '<div class="c2-card2 c2-bottleneck"><span class="k">' + t("c2.reassess_h") + ' · ' + t("c2.week") + ' ' + week + '</span>' + (sug ? '<p>' + esc(tr(sug.why)) + '</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button type="button" class="c2-btn" data-reassess-take="' + sug.bn + '">' + t("c2.update_bn").replace("{x}", BOTTLENECKS[sug.bn].label) + '</button><button type="button" class="c2-btn ghost" data-reassess-keep="1">' + t("c2.keep_bn") + '</button></div>' : '<p class="c2-muted">' + (EN() ? "Not enough data to suggest a change — keeping your current bottleneck. Add recheck values to sharpen this." : "Zu wenig Daten für eine Änderung — dein Engpass bleibt. Trag Messwerte ein, um das zu schärfen.") + '</p><button type="button" class="c2-btn ghost" data-reassess-keep="1">' + t("c2.keep_bn") + '</button>') + '</div>'; }

    // Halfway review (P14)
    if (week >= 6) html += renderHalfway();

    // Consistency
    html += '<div class="c2-card2"><span class="k">' + t("c2.consistency") + '</span><div class="c2-daybig" style="margin:2px 0"><h1 style="font-size:2rem">' + con.pct + '%</h1><span>' + con.active + ' / ' + con.elapsed + ' ' + t("c2.active_days") + '</span></div><p class="c2-muted">' + t("c2.consistency_note") + '</p></div>';

    // Weekly Pulse
    html += '<div class="c2-card2"><span class="k">' + t("c2.weekly_pulse") + ' · ' + t("c2.week") + ' ' + week + '</span>';
    var existing = pulses()[week];
    if (existing && existing.verdict) { var v = existing.verdict; html += '<div class="c2-verdict ' + v.cls + '"><h3>' + esc(v.title) + '</h3><p>' + esc(tr(v.text)) + '</p></div><button type="button" class="c2-btn ghost" data-pulse-redo="' + week + '">' + t("c2.redo") + '</button>'; }
    else {
      var wk = weekStats(week);
      html += '<p class="c2-muted" style="margin-bottom:8px">' + (EN() ? "Adherence this week" : "Adhärenz diese Woche") + ': ' + wk.strength.done + '/' + (wk.strength.planned || 0) + ' Strength · ' + wk.engine.done + ' Engine · ' + wk.recoverNights + ' Recovery.</p><div class="c2-grid2">' +
        mode.metrics.map(function (m) { return '<div class="c2-field"><label>' + esc(tr(m[1])) + '</label><input data-pin="' + m[0] + '" type="text" placeholder="—"></div>'; }).join("") +
        NUTRI[nutritionMode()].pulse.map(function (nf) { return '<div class="c2-field"><label>' + esc(tr(nf[1])) + '</label><input data-pin="n_' + nf[0] + '" type="text" placeholder="—"></div>'; }).join("") +
        '<div class="c2-field"><label>' + t("c2.energy_week") + '</label><input data-pin="energy" type="number" min="1" max="5" placeholder="3"></div>' +
        '<div class="c2-field"><label>' + t("c2.sleep_was") + '</label><select data-pin="sleep"><option value="">—</option><option value="gut">' + t("c2.good") + '</option><option value="ok">' + t("c2.ok") + '</option><option value="schlecht">' + t("c2.bad") + '</option></select></div></div>' +
        '<div class="c2-field"><label><input type="checkbox" data-pin-warn style="width:auto;margin-right:8px">' + t("c2.warn_q") + '</label></div>' +
        '<button type="button" class="c2-btn" data-pulse-run="' + week + '">' + t("c2.evaluate") + '</button>';
    }
    html += '</div>';

    // Recheck dashboard (P18 — Karten auf Mobile via CSS)
    html += '<div class="c2-card2"><span class="k">' + t("c2.recheck_h") + '</span><p class="c2-muted" style="margin-bottom:10px">' + t("c2.recheck_note") + '</p><div class="c2-recheck">' +
      '<table class="c2-rc-table"><thead><tr><th>' + (EN() ? "Value" : "Wert") + '</th>' + RC_POINTS.map(function (p) { return '<th>' + esc(pointLabel(p[0])) + '</th>'; }).join("") + '</tr></thead><tbody>' +
      RC_METRICS.map(function (m) { var data = rechecks(); return '<tr><td data-label="' + esc(tr(m[1])) + '">' + esc(tr(m[1])) + '</td>' + RC_POINTS.map(function (p) { var vv = (data[p[0]] && data[p[0]][m[0]] != null) ? data[p[0]][m[0]] : ""; return '<td data-label="' + esc(pointLabel(p[0])) + '"><input class="c2-rc" data-cp="' + p[0] + '" data-m="' + m[0] + '" value="' + String(vv).replace(/"/g, "&quot;") + '" aria-label="' + esc(tr(m[1])) + ' ' + esc(pointLabel(p[0])) + '"></td>'; }).join("") + '</tr>'; }).join("") +
      '</tbody></table></div></div>';

    // Report (current vs final — P16)
    html += renderReport(false);

    // Controls: pause + mode switch
    html += '<div class="c2-card2"><span class="k">' + (EN() ? "Program controls" : "Programm-Steuerung") + '</span><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">' +
      '<button type="button" class="c2-btn ghost" data-pause>' + (isPaused() ? t("c2.resume") : t("c2.pause")) + '</button>' +
      '<button type="button" class="c2-btn ghost" data-switch>' + t("c2.switch_mode") + '</button></div>' +
      (modeHistory().length ? '<p class="c2-muted" style="margin-top:8px">' + (EN() ? "Mode history: " : "Modus-Verlauf: ") + modeHistory().map(function (h) { return esc(MODES[h.mode] ? MODES[h.mode].label : h.mode) + " (Tag " + h.day + ")"; }).join(" → ") + '</p>' : "") +
      // P22 — Ernährungs-Level jederzeit wechselbar, ohne Programm-Reset
      '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--c2-line)"><span class="k">' + (EN() ? "Nutrition level" : "Ernährungs-Level") + '</span><div class="c2-opts" role="group" style="margin-top:6px">' +
      Object.keys(NUTRI).map(function (nk) { var on = nutritionMode() === nk; return '<button type="button" class="c2-opt ' + (on ? "sel" : "") + '" data-nutri="' + nk + '" aria-pressed="' + on + '"><div><b>' + esc(tr(NUTRI[nk].label)) + '</b></div></button>'; }).join("") + '</div></div>' +
      '</div>';
    return html;
  }

  function renderHalfway() {
    var rc = rechecks(); function has(m) { return (rc.w0 && rc.w0[m] != null && rc.w0[m] !== "") && latestRecheck(m); }
    function delta(m) { var b = latestRecheck(m); if (!has(m) || !b) return null; var a = parseFloat(rc.w0[m]), n = parseFloat(b.val); if (isNaN(a) || isNaN(n)) return null; return n - a; }
    var improved = [], stuck = [];
    [["waist", "Bauchumfang", "Waist", true], ["strength", "Kraft", "Strength", false], ["sleep", "Schlaf", "Sleep", false], ["energy", "Energie", "Energy", false], ["cardio", "Cardio", "Cardio", false], ["score", "Score", "Score", false]].forEach(function (m) {
      var d = delta(m[0]); if (d == null) return; var good = m[3] ? d < 0 : d > 0; (Math.abs(d) < 0.01 ? stuck : (good ? improved : stuck)).push(EN() ? m[2] : m[1]);
    });
    return '<div class="c2-card2" style="border-left:3px solid var(--c2-cyan)"><span class="k">' + t("c2.halfway_h") + '</span>' +
      '<p><b>' + t("c2.what_improved") + '</b> ' + (improved.length ? esc(improved.join(", ")) : (EN() ? "— add recheck values to see this." : "— trag Recheck-Werte ein, um das zu sehen.")) + '</p>' +
      '<p style="margin-top:6px"><b>' + t("c2.what_stuck") + '</b> ' + (stuck.length ? esc(stuck.join(", ")) : "—") + '</p>' +
      '<p class="c2-muted" style="margin-top:8px">' + t("c2.mode_still") + ' ' + t("c2.bn_still") + ' ' + (EN() ? "Use the reassessment and mode switch below if needed." : "Nutze bei Bedarf Reassessment und Modus-Wechsel unten.") + '</p></div>';
  }

  function renderReport(finalMode) {
    var rc = rechecks(), con = consistency(), g = goal();
    var final = finalMode || programOver();
    function pair(metric) { var s = (rc.w0 && rc.w0[metric] != null) ? rc.w0[metric] : ""; var b = latestRecheck(metric); return { s: s, n: b ? b.val : "" }; }
    var metrics = [["score", { de: "Score", en: "Score" }], ["waist", { de: "Bauchumfang", en: "Waist" }], ["weight", { de: "Gewicht", en: "Weight" }], ["strength", { de: "Kraft", en: "Strength" }], ["cardio", { de: "Cardio", en: "Cardio" }], ["sleep", { de: "Schlaf", en: "Sleep" }]];
    var biggest = null, biggestMag = 0;
    var cards = metrics.map(function (m) {
      var p = pair(m[0]); if (p.s === "" && p.n === "") return "";
      var cls = "flat", d = "", sn = parseFloat(p.s), nn = parseFloat(p.n);
      if (!isNaN(sn) && !isNaN(nn)) { var diff = nn - sn; var lowerBetter = (m[0] === "waist" || (m[0] === "weight" && (g === "cut" || g === "recomp"))); if (Math.abs(diff) < 0.01) { cls = "flat"; d = "±0"; } else { var good = lowerBetter ? diff < 0 : diff > 0; cls = good ? "up" : "down"; d = (diff > 0 ? "+" : "") + (Math.round(diff * 10) / 10); if (good) { var rel = Math.abs(diff / (sn || 1)); if (rel > biggestMag) { biggestMag = rel; biggest = tr(m[1]); } } } }
      return '<div class="c2-stat"><span class="lb">' + esc(tr(m[1])) + '</span><div class="vv"><b>' + esc(p.n || p.s || "—") + '</b>' + (d ? '<span class="delta ' + cls + '">' + esc(d) + '</span>' : "") + '</div><span class="c2-muted">' + t("c2.start") + ': ' + esc(p.s || "—") + '</span></div>';
    }).filter(Boolean).join("");
    if (!biggest && con.pct >= 80) biggest = EN() ? "Consistency" : "Konstanz";

    // Data-driven next move (P15)
    var nm = computeNextMove(g);
    var head = final ? t("c2.final_report") : t("c2.current_progress");
    var body = '<div class="c2-card2"><span class="k">' + head + ' · Start → ' + t("c2.now") + '</span>' +
      (!final ? '<p class="c2-muted" style="margin-bottom:6px">' + (EN() ? "Interim snapshot — the final report unlocks in week 12." : "Zwischenstand — der finale Report erscheint in Woche 12.") + '</p>' : "") +
      '<p class="c2-muted">' + t("c2.consistency") + ': <b style="color:#fff">' + con.pct + '%</b> (' + con.active + '/' + con.elapsed + ' ' + t("c2.active_days") + '). ' + (EN() ? "Only values you entered are shown — nothing invented." : "Nur eingetragene Werte werden gezeigt — nichts erfunden.") + '</p>' +
      (cards ? '<div class="c2-report-grid">' + cards + '</div>' : '<p class="c2-muted" style="margin-top:10px">' + (EN() ? "No recheck values yet. Enter your W0 start values above." : "Noch keine Recheck-Werte. Trag oben deine Start-Werte (W0) ein.") + '</p>') +
      (biggest ? '<div style="margin-top:12px"><span class="k">' + t("c2.biggest_win") + '</span><h3 style="margin:2px 0">' + esc(biggest) + '</h3></div>' : "") +
      '<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--c2-line)"><span class="k">' + t("c2.next_move") + '</span><h3 style="margin:2px 0 4px">' + esc(nm.label) + '</h3><p>' + esc(tr(nm.text)) + '</p></div></div>';
    /* Der Abschlussbericht ist der einzige Moment, an dem eine Fallstudie
       überhaupt belastbar ist: 12 Wochen gelaufen, Werte eingetragen,
       Adhärenz bekannt. Vorher wird nicht danach gefragt. */
    var csCard = "";
    if (final) { try { csCard = (MM.caseStudy && MM.caseStudy.renderCard) ? MM.caseStudy.renderCard() : ""; } catch (e) { csCard = ""; } }
    return final ? (phaseBar() + '<h2 class="c2-sec-h">' + (EN() ? "Program complete 🎯" : "Programm abgeschlossen 🎯") + '</h2>' + body + csCard) : body;
  }

  function computeNextMove(g) {
    var rc = rechecks(); var waistB = latestRecheck("waist"); var waist0 = rc.w0 && rc.w0.waist;
    var latestW = (waistB && !isNaN(parseFloat(waistB.val))) ? parseFloat(waistB.val) : null;
    var startW = (waist0 != null && waist0 !== "" && !isNaN(parseFloat(waist0))) ? parseFloat(waist0) : null;
    var waistDelta = (latestW != null && startW != null) ? (latestW - startW) : null;
    var h = heightCm();
    var whtr = (latestW != null && h) ? (latestW / h) : null; // 0.50 gesund · 0.53 erhöht · 0.58 hoch
    // Absolute Lage schlägt reine Delta-Interpretation (medizinisch belastbarer)
    if (g === "cut") {
      if (whtr != null) {
        if (whtr > 0.53) return { label: "CUT", text: { de: "Deine Taille im Verhältnis zur Körpergröße (WHtR " + whtr.toFixed(2) + ") ist noch erhöht — bleib im CUT, bis sie klar unter 0,53 liegt. Kraft dabei halten.", en: "Your waist-to-height (WHtR " + whtr.toFixed(2) + ") is still elevated — stay in CUT until it’s clearly under 0.53. Keep strength meanwhile." } };
        return { label: "RECOMP", text: { de: "WHtR " + whtr.toFixed(2) + " ist im gesunden Bereich und Kraft steht — jetzt Form & Muskel ausbauen (RECOMP), kein aggressives Defizit mehr.", en: "WHtR " + whtr.toFixed(2) + " is in the healthy range and strength holds — now build shape & muscle (RECOMP), no more aggressive deficit." } };
      }
      if (waistDelta != null && waistDelta < -2) return { label: "RECOMP", text: { de: "Fett ist deutlich runter (" + waistDelta.toFixed(1) + " cm Taille), Kraft solide — jetzt Form & Muskel ausbauen, ohne aggressives Defizit.", en: "Fat clearly down (" + waistDelta.toFixed(1) + " cm waist), strength solid — now build shape & muscle without an aggressive deficit." } };
      return { label: "CUT / RECOMP", text: { de: "Wenn die Taille noch deutlich erhöht ist: weiter CUT. Sonst Übergang zu RECOMP. (Trag deine Taille im Recheck ein, dann wird das exakt.)", en: "If waist is still clearly elevated: continue CUT. Otherwise transition to RECOMP. (Enter your waist in the recheck to make this exact.)" } };
    }
    if (g === "recomp") {
      if (whtr != null) {
        if (whtr > 0.53) return { label: "CUT", text: { de: "WHtR " + whtr.toFixed(2) + " ist noch erhöht — ein klarer CUT-Block bringt jetzt mehr als weiter RECOMP.", en: "WHtR " + whtr.toFixed(2) + " is still elevated — a clear CUT block now beats more RECOMP." } };
        if (whtr <= 0.50) return { label: "BUILD", text: { de: "WHtR " + whtr.toFixed(2) + " ist schlank — jetzt gezielt Muskel & Kraft mit leanem Überschuss (BUILD).", en: "WHtR " + whtr.toFixed(2) + " is lean — now build muscle & strength with a lean surplus (BUILD)." } };
        return { label: "BUILD / RECOMP", text: { de: "WHtR " + whtr.toFixed(2) + " ist solide — Richtung BUILD, wenn die Kraft weiter steigt; sonst RECOMP halten.", en: "WHtR " + whtr.toFixed(2) + " is solid — lean toward BUILD if strength keeps rising; otherwise hold RECOMP." } };
      }
      if (waistDelta != null && waistDelta > -0.5) return { label: "CUT", text: { de: "Taille kaum bewegt — ein klarer CUT-Block kann jetzt mehr bringen als weiter RECOMP.", en: "Waist barely moved — a clear CUT block may now beat more RECOMP." } };
      return { label: "BUILD", text: { de: "Basis steht, Taille runter — jetzt gezielt Muskel & Kraft mit leanem Überschuss.", en: "Base is set, waist down — now build muscle & strength with a lean surplus." } };
    }
    if (g === "build") {
      if (whtr != null && whtr > 0.58) return { label: "RECOMP / CUT", text: { de: "WHtR " + whtr.toFixed(2) + " ist zu hoch — nicht automatisch PERFORM. Erst Körperfett kontrollieren (RECOMP/CUT).", en: "WHtR " + whtr.toFixed(2) + " is too high — not automatically PERFORM. Control body fat first (RECOMP/CUT)." } };
      // Große Taillenzunahme = Fettaufbau überholt Muskelaufbau → nicht automatisch PERFORM, auch bei noch ok WHtR.
      if (waistDelta != null && waistDelta > 3) return { label: "RECOMP / CUT", text: { de: "Taille ist zu stark gestiegen (+" + waistDelta.toFixed(1) + " cm) — der Aufbau lief zu „schmutzig“. Nicht automatisch PERFORM: erst Körperfett kontrollieren (RECOMP/CUT).", en: "Waist rose too much (+" + waistDelta.toFixed(1) + " cm) — the build ran too “dirty”. Not automatically PERFORM: control body fat first (RECOMP/CUT)." } };
      return { label: "PERFORM", text: { de: "Sauber aufgebaut" + (whtr != null ? " (WHtR " + whtr.toFixed(2) + " unter Kontrolle)" : "") + " — jetzt Kraft UND Motor gleichzeitig für echte Leistungsfähigkeit.", en: "Built cleanly" + (whtr != null ? " (WHtR " + whtr.toFixed(2) + " under control)" : "") + " — now strength AND engine together for real capacity." } };
    }
    return { label: EN() ? "NEW CYCLE" : "NEUER DURCHLAUF", text: { de: "Starker Stand — nächster Durchlauf mit deinem dann größten Engpass.", en: "Strong position — next cycle targeting your then-biggest bottleneck." } };
  }

  /* ---------- Minimale Progressionsschicht (P12) ---------- */
  var CORE_LIFTS = [{ key: "squat", label: { de: "Kniebeuge / Beinpresse", en: "Squat / Leg press" } }, { key: "bench", label: { de: "Bankdrücken / Druck", en: "Bench / Press" } }, { key: "row", label: { de: "Rudern / Zug", en: "Row / Pull" } }];
  function lifts() { return S.get("c2_lifts", {}) || {}; }
  function lastLift(key) { var a = lifts()[key] || []; return a.length ? a[a.length - 1] : null; }
  function logLift(key, w, r) { var l = lifts(); l[key] = l[key] || []; l[key].push({ d: currentProgramDay(), w: w, r: r }); S.set("c2_lifts", l); }
  function renderProgression() {
    var rows = CORE_LIFTS.map(function (lf) {
      var last = lastLift(lf.key);
      var target = last ? (EN() ? "Target: " : "Ziel: ") + last.w + " kg × " + (Number(last.r) + 1) + " " + (EN() ? "or" : "oder") + " " + (Math.round((Number(last.w) + 2.5) * 2) / 2) + " kg × " + last.r : (EN() ? "Log your starting set." : "Startwert eintragen.");
      var lastTxt = last ? (EN() ? "Last: " : "Zuletzt: ") + '<b>' + esc(last.w) + " kg × " + esc(last.r) + '</b>' : '<span class="c2-muted">' + (EN() ? "no entry yet" : "noch kein Eintrag") + '</span>';
      return '<div class="c2-lift"><div class="c2-lift-h"><b>' + esc(tr(lf.label)) + '</b><span class="c2-muted">' + lastTxt + '</span></div>' +
        '<div class="c2-lift-in"><input id="lift_' + lf.key + '_w" type="number" inputmode="decimal" placeholder="kg" aria-label="kg"><span>×</span><input id="lift_' + lf.key + '_r" type="number" inputmode="numeric" placeholder="Wdh" aria-label="reps"><button type="button" class="c2-btn ghost" data-liftsave="' + lf.key + '">✓</button></div>' +
        '<p class="c2-muted" style="margin-top:4px;font-size:.78rem">📈 ' + esc(target) + '</p></div>';
    }).join("");
    return '<div class="c2-card2"><span class="k">' + (EN() ? "Progression · core lifts" : "Progression · Kernübungen") + '</span>' +
      '<p class="c2-muted" style="margin-bottom:10px">' + (EN() ? "Beat last time by a rep or a small increment — reps, load, cleaner form or fuller range all count." : "Schlag das letzte Mal um eine Wiederholung oder eine kleine Stufe — Wdh., Gewicht, sauberere Technik oder voller ROM zählen alle.") + '</p>' + rows + '</div>';
  }

  /* ---------- Onboarding ---------- */
  var obState = { goal: "", bottleneck: "", start: "today", nutrition: "simple", days: [1, 3, 5] };
  function renderOnboard() {
    var rec = goalRecommend(), bnr = bnRecommend();
    if (!obState.goal) obState.goal = rec.mode || "";
    if (!obState.bottleneck) obState.bottleneck = bnr.bn || "";
    function opts(name, list, sel, multi) {
      return '<div class="c2-opts" role="group">' + list.map(function (o) {
        var on = multi ? obState[name].some(function (x) { return String(x) === String(o[0]); }) : (sel === o[0]);
        return '<button type="button" class="c2-opt ' + (on ? "sel" : "") + '" data-ob="' + name + '" data-val="' + o[0] + '" data-multi="' + (multi ? 1 : 0) + '" aria-pressed="' + on + '"><div><b>' + esc(o[1]) + '</b>' + (o[2] ? '<div class="c2-muted" style="margin-top:2px">' + esc(o[2]) + '</div>' : "") + '</div></button>';
      }).join("") + '</div>';
    }
    var html = '<div class="c2-ob"><span class="c2-greet">MALEMETRIX 12-WEEK SYSTEM</span><h2>' + t("c2.setup_h") + '</h2><p class="c2-sec-lead">' + t("c2.setup_lead") + '</p>';

    if (redFlags().length) { html += '<div class="c2-verdict check" style="margin:10px 0"><h3>⚕️ CHECK FIRST</h3><p>' + (EN() ? "Your score answers include possible warning signs. Please get them checked medically before an aggressive performance start. The program runs on the fundamentals meanwhile — no diagnosis, no medication advice." : "Deine Score-Antworten enthalten mögliche Warnzeichen. Bitte kläre sie ärztlich ab, bevor du aggressiv startest. Das Programm läuft parallel auf dem Fundament — keine Diagnose, kein Medikamentenrat.") + '</p></div>'; }

    if (rec.mode && rec.src === "score") { html += '<div class="c2-reco"><span class="k">' + t("c2.from_score") + '</span><p style="margin-top:4px"><b style="color:#fff">' + t("c2.why_mode") + '</b> ' + (EN() ? "We recommend " : "Wir empfehlen ") + '<b style="color:#fff">' + esc(MODES[rec.mode].label) + '</b>' + (bnr.bn ? ' · ' + t("c2.bottleneck") + ' <b style="color:#fff">' + esc(BOTTLENECKS[bnr.bn].label) + '</b>' : "") + '.</p>' + (rec.reason && !EN() ? '<p style="margin-top:6px">' + esc(rec.reason) + '</p>' : (EN() && rec.reason ? '<p style="margin-top:6px">' + (EN() ? "This is derived from your MaleMetrix Score answers (body composition, strength, recovery and goal) — not a fabricated analysis." : "") + '</p>' : "")) + '<p class="c2-muted" style="margin-top:6px">' + (EN() ? "You can override below." : "Du kannst das unten überschreiben.") + '</p></div>'; }

    html += '<div class="q"><span>' + t("c2.q_goal") + '</span>' + opts("goal", [["cut", "CUT — " + (EN() ? "Lose fat" : "Fett runter"), EN() ? "Clearly reduce body fat, protect strength." : "Deutlicheres Körperfett runter, Kraft schützen."], ["recomp", "RECOMP — " + (EN() ? "Lose fat + gain muscle" : "Fett runter + Muskel rauf"), EN() ? "Normal weight / belly, little muscle, skinny-fat — shape over scale." : "Normal-/Bauchansatz, wenig Muskel, „skinny fat“ — Form statt Waage."], ["build", "BUILD — " + (EN() ? "Muscle & strength" : "Muskel & Kraft"), EN() ? "Lean, low body fat, want to build (lean)." : "Schlank, niedriger Körperfettanteil, willst aufbauen (lean)."], ["perform", "PERFORM — " + (EN() ? "Stronger & fitter" : "stärker & fitter"), EN() ? "Good base, want strength + endurance + capacity." : "Gute Basis, willst Kraft + Ausdauer + Belastbarkeit."]], obState.goal) + '</div>';

    html += '<div class="q"><span>' + t("c2.q_bn") + '</span>' + opts("bottleneck", [["recovery", "RECOVERY — " + (EN() ? "Sleep & recovery" : "Schlaf & Erholung"), ""], ["engine", "ENGINE — " + (EN() ? "Cardio & endurance" : "Cardio & Ausdauer"), ""], ["body", "BODY — " + (EN() ? "Belly & body fat" : "Bauch & Körperfett"), ""], ["strength", "STRENGTH — " + (EN() ? "Strength & muscle" : "Kraft & Muskel"), ""], ["metabolic", "METABOLIC — " + (EN() ? "Nutrition & structure" : "Ernährung & Struktur"), ""], ["lifestyle", "LIFESTYLE — " + (EN() ? "Execution in daily life" : "Umsetzung im Alltag"), ""]], obState.bottleneck) + '</div>';

    html += '<div class="q"><span>' + t("c2.q_nutri") + '</span>' + opts("nutrition", [["simple", tr(NUTRI.simple.label), tr(NUTRI.simple.card)], ["tracked", tr(NUTRI.tracked.label), tr(NUTRI.tracked.card)], ["precision", tr(NUTRI.precision.label), tr(NUTRI.precision.card)]], obState.nutrition) + '</div>';

    var wdN = EN() ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
    html += '<div class="q"><span>' + t("c2.q_days") + '</span>' + opts("days", [1, 2, 3, 4, 5, 6, 0].map(function (d) { return [String(d), wdN[d], ""]; }), null, true) + '<p class="c2-muted" style="margin-top:6px">' + (EN() ? "Pick exactly 3 or 4 realistic strength days (min 3, max 4). The rest fills with cardio, recovery and movement automatically." : "Wähle genau 3 oder 4 realistische Kraft-Tage (min. 3, max. 4). Der Rest füllt sich automatisch mit Cardio, Recovery und Bewegung.") + '</p></div>';

    html += '<div class="q"><span>' + t("c2.q_start") + '</span>' + opts("start", [["today", t("c2.start_today"), ""], ["monday", t("c2.start_monday"), ""]], obState.start) + '</div>';

    var ready = obState.goal && obState.bottleneck && obState.days.length >= 3 && obState.days.length <= 4;
    html += '<div style="margin:26px 0 10px"><button type="button" class="c2-btn block" id="c2ObGo"' + (ready ? "" : " disabled") + '>' + t("c2.start_btn") + '</button></div><p class="c2-muted" style="text-align:center">' + t("c2.no_fake_ai") + '</p></div>';
    return html;
  }

  // P4 — Altdaten mit ungültiger Krafttage-Zahl (2 oder >4): einmalige Nutzerkorrektur erzwingen,
  // ohne Programm/Historie zu löschen. Vergangenheit läuft bis zur Korrektur sicher auf dem Basismuster.
  function renderDaysReview() {
    var wdN = EN() ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
    var sel = validDaysArr(obState.days) ? obState.days : [1, 3, 5];
    obState.days = sel.slice();
    var ok = obState.days.length >= 3 && obState.days.length <= 4;
    return '<div class="c2-ob"><span class="c2-greet">MALEMETRIX 12-WEEK SYSTEM</span><h2>' + (EN() ? "Training days need review" : "Krafttage prüfen") + '</h2>' +
      '<p class="c2-sec-lead">' + (EN() ? "Your saved plan has an unsupported number of strength days. Pick exactly 3 or 4 — your progress, rechecks and history stay intact." : "Dein gespeicherter Plan hat eine nicht unterstützte Zahl an Krafttagen. Wähle genau 3 oder 4 — dein Fortschritt, deine Rechecks und deine Historie bleiben erhalten.") + '</p>' +
      '<div class="q"><span>' + t("c2.q_days") + '</span><div class="c2-opts" role="group">' +
      [1, 2, 3, 4, 5, 6, 0].map(function (d) { var on = obState.days.indexOf(d) >= 0; return '<button type="button" class="c2-opt ' + (on ? "sel" : "") + '" data-ob="days" data-val="' + d + '" data-multi="1" aria-pressed="' + on + '"><div><b>' + esc(wdN[d]) + '</b></div></button>'; }).join("") +
      '</div><p class="c2-muted" style="margin-top:6px">' + (EN() ? "Min 3, max 4." : "Min. 3, max. 4.") + '</p></div>' +
      '<div style="margin:20px 0 10px"><button type="button" class="c2-btn block" data-days-review' + (ok ? "" : " disabled") + '>' + (EN() ? "Save training days →" : "Krafttage speichern →") + '</button></div></div>';
  }

  /* ---------- Router ---------- */
  function render() {
    var html;
    if (!personalized()) html = renderOnboard();
    else if (daysNeedReview()) html = renderDaysReview();
    else { html = navBar(); html += (view === "plan") ? renderPlan() : (view === "progress") ? renderProgress() : renderToday(); }
    mount.className = "c2"; mount.innerHTML = html;
    var resetWrap = document.getElementById("courseReset"); if (resetWrap) resetWrap.style.display = (personalized() && !daysNeedReview()) ? "" : "none";
  }

  /* ---------- Events ---------- */
  function bind() {
    if (mount._c2bound) return; mount._c2bound = true;
    mount.addEventListener("click", function (e) {
      var t2 = e.target;
      try { if (MM.caseStudy && MM.caseStudy.handleClick(t2)) return; } catch (err) {}
      var nav = t2.closest("[data-view]"); if (nav) { setView(nav.getAttribute("data-view")); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      var chk = t2.closest("[data-check]"); if (chk) { var k = chk.getAttribute("data-check"); var pd = clampedDay(); var cur = dailyForDay(pd)[k]; setDailyDay(pd, k, !cur); chk.classList.toggle("done", !cur); chk.setAttribute("aria-pressed", String(!cur)); return; }
      if (t2.closest("[data-startnow]")) { S.set("c2_start", todayYmd()); MM.toast(EN() ? "Started today." : "Heute gestartet."); render(); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      var mn = t2.closest("[data-min]"); if (mn) { S.set("c2_min_" + todayYmd(), mn.getAttribute("data-min") === "1"); render(); return; }
      if (t2.closest("[data-shift]")) { shiftToday(); MM.toast(EN() ? "Shifted to tomorrow." : "Auf morgen verschoben."); render(); return; }
      var ls = t2.closest("[data-liftsave]"); if (ls) { var lk = ls.getAttribute("data-liftsave"); var lw = document.getElementById("lift_" + lk + "_w"); var lr = document.getElementById("lift_" + lk + "_r"); if (lw && lr && lw.value !== "" && lr.value !== "") {
        var wv = parseFloat(String(lw.value).replace(",", ".")), rv = parseInt(lr.value, 10);
        if (isNaN(wv) || isNaN(rv) || wv < 0 || wv > 500 || rv < 1 || rv > 100) { MM.toast(EN() ? "Enter a realistic weight (0–500 kg) and reps (1–100)." : "Bitte realistisches Gewicht (0–500 kg) und Wdh. (1–100) eingeben."); return; }
        logLift(lk, wv, rv); MM.toast(EN() ? "Logged." : "Gespeichert."); render();
      } return; }
      var nu = t2.closest("[data-nutri]"); if (nu) { var nkv = nu.getAttribute("data-nutri"); if (NUTRI[nkv]) { S.set("c2_nutrition", nkv); MM.toast(EN() ? "Nutrition level updated." : "Ernährungs-Level aktualisiert."); render(); } return; }
      if (t2.closest("[data-days-review]")) { if (!validDaysArr(obState.days)) { MM.toast(EN() ? "Pick 3 or 4 strength days." : "Wähle 3 oder 4 Krafttage."); return; } S.set("c2_days", obState.days.slice().sort(function (a, b) { return a - b; })); MM.toast(EN() ? "Training days saved." : "Krafttage gespeichert."); view = "today"; render(); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      if (t2.closest("[data-pause]") || t2.closest("[data-resume]")) { togglePause(); render(); return; }
      if (t2.closest("[data-switch]")) { openSwitch(); return; }
      var rt = t2.closest("[data-reassess-take]"); if (rt) { var nb = rt.getAttribute("data-reassess-take"); setBottleneck(nb, "reassessment"); S.set("c2_reassess_" + currentWeek(), true); MM.toast(EN() ? "Bottleneck updated." : "Engpass aktualisiert."); render(); return; }
      if (t2.closest("[data-reassess-keep]")) { S.set("c2_reassess_" + currentWeek(), true); render(); return; }
      var ob = t2.closest("[data-ob]"); if (ob) { var nm2 = ob.getAttribute("data-ob"); var val = ob.getAttribute("data-val"); if (ob.getAttribute("data-multi") === "1") { var arr = obState[nm2].slice(); var iv = parseInt(val, 10); var pos = arr.indexOf(iv); if (pos >= 0) arr.splice(pos, 1); else { if (nm2 === "days" && arr.length >= 4) { MM.toast(EN() ? "Choose a maximum of 4 strength days. The remaining days are used for engine, movement and recovery." : "Wähle maximal 4 Krafttage. Die übrigen Tage brauchen wir für Engine, Bewegung und Recovery."); return; } arr.push(iv); } obState[nm2] = arr; } else obState[nm2] = val; render(); return; }
      if (t2.id === "c2ObGo" || t2.closest("#c2ObGo")) {
        if (!(obState.goal && obState.bottleneck && obState.days.length >= 3 && obState.days.length <= 4)) { MM.toast(EN() ? "Pick 3 or 4 strength days to start." : "Wähle 3 oder 4 Krafttage, um zu starten."); return; }
        setGoal(obState.goal); S.set("c2_mode_history", [{ mode: obState.goal, day: 1, reason: "onboarding", from: "" }]); S.set("c2_bottleneck", obState.bottleneck); S.set("c2_bn_history", [{ b: obState.bottleneck, day: 1, reason: "onboarding", from: "" }]);
        S.set("c2_nutrition", obState.nutrition); S.set("c2_days", obState.days.slice().sort(function (a, b) { return a - b; }));
        S.set("c2_start", obState.start === "monday" ? nextMonday() : todayYmd());
        if (MM.track) MM.track("course_onboarded", { goal: obState.goal, bottleneck: obState.bottleneck });
        if (MM.track) MM.track("program_initialized", {});
        // P13/A2 — SYSTEM-READY-Moment (VS2): der Start ist ein Upgrade-
        // Moment, keine stille Weiterleitung. Nur ECHTE Setup-Werte, EIN CTA.
        view = "today"; S.set("c2_view", "today");
        var mLbl = (MODES[obState.goal] && (MODES[obState.goal].label || MODES[obState.goal].name)) || obState.goal.toUpperCase();
        mount.innerHTML =
          '<div class="mm-access" style="padding-top:56px">' +
          '<span class="stamp" style="color:var(--status-active,#16C4F4);border-color:rgba(22, 196, 244,0.35)">SYSTEM READY</span>' +
          '<div class="mm-metric-row" style="max-width:640px;margin:28px auto 0;text-align:left">' +
          '<div class="mm-metric"><span class="v" style="font-size:1.3rem">' + String(mLbl).toUpperCase() + '</span><span class="k">MODE</span></div>' +
          '<div class="mm-metric"><span class="v" style="font-size:1.3rem">' + String(obState.bottleneck).toUpperCase() + '</span><span class="k">PRIMÄRER ENGPASS</span></div>' +
          '<div class="mm-metric"><span class="v" style="font-size:1.3rem">12 WEEKS</span><span class="k">PROGRAM</span></div>' +
          '<div class="mm-metric"><span class="v" style="font-size:1.3rem">DAY 01</span><span class="k">TODAY</span></div>' +
          '</div>' +
          '<button class="btn btn-primary" id="c2StartDay1" style="margin-top:30px">START DAY 1 →</button>' +
          '<p class="assigned" style="margin-top:14px">DEIN PLAN IST AUS SCORE + SETUP ABGELEITET</p></div>';
        var sd1 = document.getElementById("c2StartDay1");
        if (sd1) sd1.addEventListener("click", function () { if (MM.track) MM.track("day1_started", {}); render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
        window.scrollTo({ top: 0, behavior: "smooth" }); return;
      }
      var pr = t2.closest("[data-pulse-run]"); if (pr) { runPulse(Number(pr.getAttribute("data-pulse-run"))); return; }
      var prd = t2.closest("[data-pulse-redo]"); if (prd) { var pp = pulses(); delete pp[prd.getAttribute("data-pulse-redo")]; S.set("c2_pulse", pp); render(); return; }
    });
    mount.addEventListener("change", function (e) {
      try { if (MM.caseStudy && MM.caseStudy.handleInput(e.target)) return; } catch (err) {}
    });
    mount.addEventListener("input", function (e) {
      var t2 = e.target;
      try { if (MM.caseStudy && MM.caseStudy.handleInput(t2)) return; } catch (err) {}
      if (t2.hasAttribute && t2.hasAttribute("data-energy")) { setEnergyDay(clampedDay(), Number(t2.value)); var lbl = document.getElementById("c2eVal"); if (lbl) lbl.textContent = t2.value + "/5"; return; }
      if (t2.classList && t2.classList.contains("c2-rc")) { var rc = rechecks(); var cp = t2.getAttribute("data-cp"); if (!rc[cp]) rc[cp] = {}; rc[cp][t2.getAttribute("data-m")] = t2.value; S.set("course_rechecks", rc); return; }
    });
    /* P52/P53/P101 — Neustart = neuer Durchlauf. Alte Rechecks dürfen NICHT
       die Baseline des neuen Durchlaufs werden: der alte wird archiviert und
       mit sauberer Baseline gestartet. Struktur (benannte Funktion + Deep-Link
       aus der Comeback-Karte) von master; sichtbarer Wortlaut folgt dem
       Begriffskanon („Durchlauf", nicht „Zyklus"). */
    function startNewCycle() {
      if (!confirm(EN() ? "Start a new 12-week cycle? Goal, bottleneck, start date, days, daily checks AND the recheck baseline (W0–W12) are cleared for a fresh cycle. Your previous cycle is archived — it will not be mixed into the new one." : "Neuen 12-Wochen-Durchlauf starten? Ziel, Engpass, Startdatum, Tage, tägliche Häkchen UND die Mess-Baseline (W0–W12) werden für einen frischen Durchlauf zurückgesetzt. Dein bisheriger Durchlauf wird archiviert — er wird nicht mit dem neuen vermischt.")) return;
      try {
        var rc = rechecks();
        if ((goal() || bottleneck() || Object.keys(rc).length) ) {
          var arch = S.get("c2_archive", []); if (!Array.isArray(arch)) arch = [];
          arch.push({ ended: todayYmd(), goal: goal(), bottleneck: bottleneck(), rechecks: rc, modeHistory: S.get("c2_mode_history", []), consistency: consistency() });
          if (arch.length > 12) arch = arch.slice(arch.length - 12);
          S.set("c2_archive", arch);
        }
      } catch (e) {}
      ["c2_goal", "c2_bottleneck", "c2_bn_history", "c2_start", "c2_nutrition", "c2_days", "c2_daily", "c2_pulse", "c2_view", "c2_dayswap", "c2_pause_since", "c2_paused_days", "c2_mode_history", "c2_lifts", "course_rechecks"].forEach(function (k) { S.del(k); });
      ["c2_reassess_4", "c2_reassess_8", "c2_reassess_12"].forEach(function (k) { S.del(k); });
      obState = { goal: "", bottleneck: "", start: "today", nutrition: "simple", days: [1, 3, 5] };
      view = "today"; render(); window.scrollTo({ top: 0, behavior: "smooth" });
    }
    var reset = document.getElementById("courseReset");
    if (reset && !reset._c2) { reset._c2 = true; reset.addEventListener("click", startNewCycle); }
    /* Deep-Link aus der Comeback-Karte in My MaleMetrix: ?restart=1 öffnet
       denselben Neustart-Flow (inkl. Sicherheitsabfrage) direkt. */
    if (!window.__c2RestartHandled && /[?&]restart=1\b/.test(location.search)) {
      window.__c2RestartHandled = true;
      setTimeout(startNewCycle, 150);
    }
    document.addEventListener("mm:langchange", function () { if (!content.hidden) render(); });
  }
  function openSwitch() {
    var opts2 = MODE_ORDER.filter(function (m) { return m !== goal(); }).map(function (m) { return MODES[m].label; }).join(" / ");
    var cur = MODES[goal()].label;
    var inp = prompt((EN() ? "Switch mode from " : "Modus wechseln von ") + cur + " → (" + opts2 + "):", "");
    if (!inp) return; var target = MODE_ORDER.find(function (m) { return MODES[m].label.toLowerCase() === norm(inp).toLowerCase() || m === inp.toLowerCase(); });
    if (target && confirm((EN() ? "Change goal to " : "Ziel ändern auf ") + MODES[target].label + "? " + (EN() ? "History is kept." : "Historie bleibt erhalten."))) { switchMode(target); MM.toast(EN() ? "Goal changed." : "Ziel geändert."); render(); }
  }
  function nextMonday() { var d = new Date(todayYmd() + "T00:00:00"); var day = d.getDay(); var add = ((8 - day) % 7) || 7; d.setDate(d.getDate() + add); return ymd(d); }
  function runPulse(week) {
    var inp = {}; mount.querySelectorAll("[data-pin]").forEach(function (el) { inp[el.getAttribute("data-pin")] = el.value; });
    var warnEl = mount.querySelector("[data-pin-warn]"); inp.warning = !!(warnEl && warnEl.checked); if (inp.energy) inp.energy = Number(inp.energy);
    var verdict = adjudicate(week, inp); savePulse(week, { inp: inp, verdict: verdict, stagnant: !!verdict.stagnant, ts: todayYmd() });
    if (MM.track) MM.track("course_pulse", { week: week, verdict: verdict.code }); render(); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* Debug-Hook für deterministische Tests (kein Sicherheitsrisiko — lokales Programm) */
  try { window.__C2 = { goalRecommend: goalRecommend, bnRecommend: bnRecommend, weekStats: weekStats, winMet: winMet, adjudicate: adjudicate, adherenceFor: adherenceFor, patternFor: patternFor, dayTypeAt: dayTypeAt, modeAtDay: modeAtDay, bottleneckAtDay: bottleneckAtDay, currentWeek: currentWeek, clampedDay: clampedDay, consistency: consistency, currentProgramDay: currentProgramDay, plannedInWeek: plannedInWeek, computeNextMove: computeNextMove, suggestBottleneck: suggestBottleneck, notStarted: notStarted, daysUntilStart: daysUntilStart, migrate: migrate, switchMode: switchMode, validDaysArr: validDaysArr, daysNeedReview: daysNeedReview, strengthDays: strengthDays }; } catch (e) {}

  /* =========================================================================
     GATE + BOOT
     ========================================================================= */
  function showContent() { gate.hidden = true; content.hidden = false; var pbox = document.getElementById("courseProgress"); if (pbox) pbox.innerHTML = ""; migrate(); bind(); render(); document.querySelectorAll("#courseContent .reveal").forEach(function (el) { el.classList.add("visible"); }); }
  function showGate() {
    gate.hidden = false; content.hidden = true;
    var input = document.getElementById("courseCode"), err = document.getElementById("courseCodeError"), btn = document.getElementById("courseUnlockBtn"), buy = document.getElementById("courseBuyBtn");
    async function tryUnlock() { if (await tryCode(input.value)) { if (MM.track) MM.track("course_unlocked", {}); MM.toast(EN() ? "Program unlocked — good luck!" : "Programm freigeschaltet — viel Erfolg!"); showContent(); window.scrollTo({ top: 0, behavior: "smooth" }); } else { err.textContent = EN() ? "Code not recognized. Check your order confirmation — case doesn’t matter." : "Code nicht erkannt. Bitte prüfe deine Bestellbestätigung — Groß-/Kleinschreibung ist egal."; err.style.display = "block"; input.classList.add("invalid"); if (MM.track) MM.track("course_code_failed", {}); } }
    if (btn && !btn._b) { btn._b = true; btn.addEventListener("click", tryUnlock); }
    if (input && !input._b) { input._b = true; input.addEventListener("keydown", function (e) { if (e.key === "Enter") tryUnlock(); }); input.addEventListener("input", function () { err.style.display = "none"; input.classList.remove("invalid"); }); }
    if (buy && !buy._b) { buy._b = true; buy.addEventListener("click", function () { location.href = "protokoll.html"; }); }
  }
  (async function boot() {
    var urlCode = ""; try { urlCode = norm(new URLSearchParams(location.search).get("code") || ""); } catch (e) {}
    if (urlCode && await tryCode(urlCode)) { history.replaceState(null, "", location.pathname); showContent(); return; }
    var saved = S.get("course_code", ""); if (saved && await tryCode(saved)) { showContent(); return; }
    // Account-Bridge (nur Zugriff/Persistenz, keine Programmlogik): ein Konto
    // mit twelve_week-Entitlement bekommt serverseitig autorisiertes
    // Schlüsselmaterial — der Vault wird regulär entschlüsselt, das Material
    // wird nicht in localStorage persistiert. Legacy-Codes bleiben Fallback.
    try {
      if (window.MM && MM.account && MM.account.whenReady) {
        await MM.account.whenReady();
        if (MM.account.hasAccess("twelve_week")) {
          var acc = await MM.account.resolveProductAccess("twelve_week");
          if (acc && acc.state === "authorized" && acc.material && await tryCode(acc.material, true)) { showContent(); return; }
        }
      }
    } catch (e) {}
    showGate();
  })();
})();
