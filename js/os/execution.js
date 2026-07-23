/* ==========================================================================
   MALEMETRIX OS — EXECUTION LAYER  (MM.exec)  ·  Phase 6
   --------------------------------------------------------------------------
   Verwandelt Plan + Kontext in EINEN ausführbaren Tag:
     · EXECUTION GRAPH   — Goal → Phase → Woche → Heute → Aktion → Abschluss.
       Ein kanonisches Aktionsmodell für alle Domains (Training, Nutrition,
       Recovery, Messung, Review, Entscheidung). Keine getrennten Task-Systeme.
     · ADAPTIVE TODAY    — buildDay(): chronologischer Tagesplan + Next Best
       Action 2.0 (eine primäre, max. zwei sekundäre) mit echtem WARUM.
     · KONTEXT-OVERLAYS  — BASE PLAN + TODAY OVERLAY. Reise/Busy/No-Gym/…
       verändern die AUSFÜHRUNG, nie die Historie. Reversibel, mit Ablauf.
     · MY DAY CHANGED    — deterministische Neuberechnung des Tages
       (weniger Zeit → komprimierte Session, kein Gym → Substitution, …).
     · TIME COMPRESSION  — 15/30/45-Minuten-Versionen aus dem ECHTEN Plan.
       Stimulus-Hierarchie bleibt erhalten (Compounds zuerst, nie random).
     · MISSED / REPAIR   — verpasste Session ⇒ beste Nachhol-Optionen mit
       Spacing-Begründung. Vergangenheit wird NIE umgeschrieben — Nachholen
       ist ein Execution-Overlay, kein History-Rewrite.
     · REMINDER ENGINE   — ein zentraler Wert-Filter (nur actionable, nie für
       Erledigtes, Dedup, Quiet Hours, Eskalation genau 1×, dann Stille).
       Lokale Notifications solange App offen; Server-Push: Architektur
       vorbereitet, ehrlich als CONFIG REQUIRED deklariert (kein Fake).
     · BRIEF & CLOSE     — Morning Brief / Evening Close / unveränderliche
       Tages-Snapshots. CONSISTENCY statt Streak. Comeback statt Schuld.
     · DECISION LEDGER   — Entscheidung → beobachten → Review fällig →
       keep/revert/adjust. Keine Entscheidung verschwindet.
   --------------------------------------------------------------------------
   Wahrheit: Programm-State gehört course.js (c2_*). Dieses Modul LIEST ihn
   und schreibt Abschlüsse ausschließlich über die vorhandenen Keys
   (c2_daily.dN.p) — eine Erledigung, ein Eintrag, viele Leser.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var S = {
    get: function (k, d) { try { return MM.store ? MM.store.get(k, d) : (JSON.parse(localStorage.getItem("mm_" + k)) ?? d); } catch (e) { return d; } },
    set: function (k, v) { try { MM.store ? MM.store.set(k, v) : localStorage.setItem("mm_" + k, JSON.stringify(v)); } catch (e) {} }
  };
  function OS() { return MM.os; }
  function E() { return MM.engines; }
  function IN() { return (window.MM && MM.intelligence) ? MM.intelligence : null; }
  function acct() { return (window.MM && MM.account) ? MM.account : null; }
  function dash() { var a = acct(); return a ? a.getDashboardState() : { program: { active: false }, access: {} }; }

  /* ---------- Zeit-Helfer (DST-sicher: Datumsrechnung in UTC-Mitternacht) ---------- */
  function todayYmd() { var d = new Date(); return ymdOf(d); }
  function ymdOf(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function parseYmdUTC(s) { var p = String(s || "").split("-"); return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
  function diffDays(a, b) { return Math.round((parseYmdUTC(b) - parseYmdUTC(a)) / 86400000); }
  function addDays(ymd, n) { var t = parseYmdUTC(ymd) + n * 86400000; var d = new Date(t); return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0"); }
  function weekdayOf(ymd) { return new Date(parseYmdUTC(ymd)).getUTCDay(); }   // 0=So..6=Sa
  function nowHM() { var d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
  function hmToMin(hm) { var p = String(hm || "0:0").split(":"); return (+p[0] || 0) * 60 + (+p[1] || 0); }
  var WD_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  function uid() { return "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function track(name, p) { try { if (MM.track) MM.track(name, p || {}); } catch (e) {} }

  /* =========================================================================
     PROGRAMM-ABLEITUNG — REIN LESEND.
     dayTypeAt ist ein SPIEGEL von course.js (patternFor/buildWeekdayPattern/
     c2_dayswap). course.js bleibt Owner; bei Änderungen dort muss dieser
     Spiegel nachziehen (Invariante wird in tools-dev/test-execution.mjs
     gegen Fixtures geprüft). Grund: mein-protokoll.html lädt course.js nicht.
     ========================================================================= */
  var MODE_BASE = {
    cut: ["strength", "engine", "strength", "recover", "strength", "engine", "reset"],
    recomp: ["strength", "engine", "strength", "recover", "strength", "move", "reset"],
    build: ["strength", "engine", "strength", "recover", "strength", "strength", "reset"],
    perform: ["strength", "engine", "strength", "recover", "engine", "strength", "reset"]
  };
  var BN_KEYS = ["recovery", "engine", "body", "metabolic", "strength", "lifestyle", "medical"];
  function progGoal() { return S.get("c2_goal", "") || "recomp"; }
  function progBottleneck() { var b = S.get("c2_bottleneck", ""); return BN_KEYS.indexOf(b) >= 0 ? b : "recovery"; }
  function progStart() { return S.get("c2_start", ""); }
  function pausedDays() { return S.get("c2_paused_days", 0) || 0; }
  function pauseSince() { return S.get("c2_pause_since", "") || ""; }
  function strengthDays() { var d = S.get("c2_days", null); return (Array.isArray(d) && d.length >= 3 && d.length <= 4 && d.every(function (x) { return typeof x === "number" && x >= 0 && x <= 6; })) ? d : null; }
  function modeAtDay(pd) { var h = S.get("c2_mode_history", []) || []; var m = progGoal(); for (var i = 0; i < h.length; i++) { if (h[i].day <= pd && MODE_BASE[h[i].mode]) m = h[i].mode; } return MODE_BASE[m] ? m : "recomp"; }
  function bnAtDay(pd) { var h = S.get("c2_bn_history", []) || []; var b = progBottleneck(); for (var i = 0; i < h.length; i++) { if (h[i].day <= pd && BN_KEYS.indexOf(h[i].b) >= 0) b = h[i].b; } return b; }

  function buildWeekdayPattern(mode, week, sd) {
    var start = new Date(progStart() + "T00:00:00"); var startWd = start.getDay();
    var p = [];
    for (var pos = 0; pos < 7; pos++) { var wd = (startWd + pos) % 7; p.push(sd.indexOf(wd) >= 0 ? "strength" : null); }
    var fillOrder = mode === "perform" ? ["engine", "recover", "engine", "move", "reset"] : mode === "build" ? ["recover", "engine", "move", "reset", "reset"] : mode === "cut" ? ["engine", "recover", "engine", "move", "reset"] : ["engine", "recover", "move", "reset", "engine"];
    var fi = 0;
    for (var i = 0; i < 7; i++) { if (p[i] === null) { p[i] = fillOrder[fi % fillOrder.length]; fi++; } }
    return p;
  }
  function patternFor(mode, week, bn) {
    var m = MODE_BASE[mode] ? mode : "recomp"; var b = BN_KEYS.indexOf(bn) >= 0 ? bn : progBottleneck();
    var sd = strengthDays();
    var p = sd ? buildWeekdayPattern(m, week, sd) : MODE_BASE[m].slice();
    var strengthIdx = []; p.forEach(function (x, i) { if (x === "strength") strengthIdx.push(i); });
    if (b === "recovery") {
      if (week <= 6) {
        var repl = ["engine", "move", "mobility"]; for (var i = 0; i < p.length; i++) { if (repl.indexOf(p[i]) >= 0) { p[i] = "recover"; break; } }
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
    // SSOT seit Phase 3.1: MM.programView (paritätsgetestet gegen course.js).
    // Der lokale Spiegel bleibt nur als Fallback für Umgebungen ohne program-view.
    try { if (window.MM && MM.programView && MM.programView.available()) return MM.programView.dayTypeAt(pd); } catch (e) {}
    if (!progStart()) return null;
    var week = Math.min(12, Math.max(1, Math.ceil(pd / 7)));
    var pat = patternFor(modeAtDay(pd), week, bnAtDay(pd));
    var base = pat[(pd - 1) % 7];
    var ov = (S.get("c2_dayswap", {}) || {})["d" + pd];
    return ov || base;
  }
  // Programm-Tag ↔ Kalenderdatum. Pause eingerechnet: während einer Pause
  // steht der Programm-Tag still — Zukunftsdaten sind dann bewusst null.
  function programDayForDate(ymd) {
    var start = progStart(); if (!start) return null;
    var ref = pauseSince() || ymd;
    if (pauseSince() && diffDays(pauseSince(), ymd) > 0) return null;   // pausiert: keine zukünftigen Programm-Tage
    var pd = diffDays(start, ymd < ref ? ymd : ref) + 1 - pausedDays();
    if (ymd < ref) pd = diffDays(start, ymd) + 1 - pausedDaysBefore(ymd);
    return (pd >= 1 && pd <= 84) ? pd : null;
  }
  // Vergangenheit: pausierte Tage VOR dem Datum abziehen (konservativ: gesamt).
  function pausedDaysBefore(ymd) { return pausedDays(); }
  function dateForProgramDay(pd) {
    var start = progStart(); if (!start) return null;
    // Aktueller Programm-Tag heute → Differenz rückwärts/vorwärts in Kalendertagen.
    var todayPd = programDayForDate(todayYmd());
    if (todayPd == null) { // pausiert oder außerhalb: einfacher Anker über Start+Pause
      return addDays(start, (pd - 1) + pausedDays());
    }
    return addDays(todayYmd(), pd - todayPd);
  }
  function dailyRec(pd) { var a = S.get("c2_daily", {}) || {}; return a["d" + pd] || {}; }
  function isTrainingDayPd(pd) { return dayTypeAt(pd) === "strength"; }

  /* =========================================================================
     KONTEXT-OVERLAYS — BASE PLAN + TODAY OVERLAY (reversibel, mit Ablauf)
     ========================================================================= */
  var OVERLAYS = {
    travel: { label: "REISE", line: "Programm bleibt intakt — Ausführung passt sich an Equipment & Zeit an." },
    busy: { label: "VOLLE WOCHE", line: "Weniger Zeit ≠ kein Training. Komprimierte Sessions, Protein-Floor, Schlaf-Anker." },
    no_gym: { label: "KEIN GYM", line: "Nächstbeste Ausführung mit vorhandenem Equipment — Historie bleibt unberührt." },
    low_recovery: { label: "LOW RECOVERY", line: "Session auf Ziel halten, keine Progression erzwingen. Schlaf ist der Hebel." },
    vacation: { label: "URLAUB", line: "Maintenance: 2–3 kurze Sessions, Protein-Anker, Schritte. Kein Moralisieren." },
    sick: { label: "KRANK / RÜCKKEHR", line: "Pause ist die richtige Entscheidung. Wiedereinstieg dosiert — kein Aufholen." },
    family_day: { label: "FAMILIENTAG", line: "Ein gemeinsames Essen, deine Portion. Training optional verschieben." },
    jetlag: { label: "JETLAG", line: "Erster Tag reduzierte Erwartung. Training zur lokalen Wunschzeit, Licht & Schlafanker." }
  };
  function overlays() { var o = S.get("os_overlays", []); return Array.isArray(o) ? o : []; }
  function saveOverlays(list) { S.set("os_overlays", list); }
  function activeOverlays(ymd) {
    ymd = ymd || todayYmd();
    return overlays().filter(function (o) { return o.start <= ymd && ymd <= o.end && !o.endedEarly; });
  }
  function activeOverlay(ymd) {
    var list = activeOverlays(ymd);
    return list.length ? list[list.length - 1] : null;   // jüngstes Overlay für Anzeige
  }
  function startOverlay(o) {
    if (!OVERLAYS[o.mode]) return null;
    var entry = { id: uid(), mode: o.mode, start: o.start || todayYmd(), end: o.end || o.start || todayYmd(), reason: o.reason || "", mods: o.mods || {}, created: new Date().toISOString() };
    if (entry.end < entry.start) entry.end = entry.start;
    var list = overlays(); list.push(entry);
    if (list.length > 40) list = list.slice(list.length - 40);
    saveOverlays(list);
    try { OS().setContextMode(entry.mode === "busy" || entry.mode === "family_day" || entry.mode === "jetlag" ? "travel" : entry.mode); } catch (e) {}
    track("context_mode_start", { mode: o.mode });
    return entry;
  }
  function endOverlay(id) {
    var list = overlays(); var y = addDays(todayYmd(), -1);
    list.forEach(function (o) { if (o.id === id) { o.endedEarly = true; if (o.end > y) o.end = y < o.start ? o.start : y; } });
    saveOverlays(list);
    try { OS().setContextMode("normal"); } catch (e) {}
  }

  /* =========================================================================
     TIME COMPRESSION — deterministisch, Stimulus-Hierarchie bleibt erhalten.
     Slot-Reihenfolge im Plan IST die Prioritätsreihenfolge (Compounds zuerst).
     ========================================================================= */
  function restSec(rest) { return /min/.test(rest || "") ? 150 : 90; }
  function slotMin(sl, capRest) {
    var r = restSec(sl.rest); if (capRest && r > 90) r = 90;
    return Math.round((sl.sets * (40 + r) + 60) / 60);   // 40 s Arbeitszeit/Satz + Pause + 1 min Setup
  }
  function estimateSessionMin(session) {
    if (!session || !session.slots) return 0;
    return session.slots.reduce(function (a, sl) { return a + slotMin(sl); }, 0);
  }
  function compressSession(session, minutes) {
    if (!session || !session.slots || !session.slots.length) return null;
    var slots = session.slots.map(function (sl) { return { ex: sl.ex, name: sl.name, sets: sl.sets, reps: sl.reps, rir: sl.rir, rest: sl.rest, rule: sl.rule }; });
    var dropped = [];
    var minKeep = Math.min(2, slots.length);
    function total(cap) { return slots.reduce(function (a, sl, i) { return a + slotMin(sl, cap && i >= 2); }, 0); }
    // Stufe 1: Iso-/Accessory-Slots von hinten streichen (nie die ersten beiden Slots)
    while (slots.length > minKeep && total(false) > minutes) { dropped.push(slots.pop()); }
    // Stufe 2: Accessory-Sätze auf 2 reduzieren
    if (total(false) > minutes) slots.forEach(function (sl, i) { if (i >= 1 && sl.sets > 2) sl.sets = 2; });
    // Stufe 3: Pausen der Accessories auf 90 s cappen
    var capped = total(false) > minutes;
    // Stufe 4: harte ≤20-Minuten-Version — IMMER 2 Slots à 2 Sätze
    if (minutes <= 20) { while (slots.length > 2) dropped.push(slots.pop()); slots.forEach(function (sl) { sl.sets = 2; }); capped = true; }
    var est = total(capped);
    return {
      key: session.key, name: session.name + " · " + minutes + " min", baseName: session.name,
      slots: slots, estMin: est, capRest: capped, compressedTo: minutes,
      dropped: dropped.map(function (d) { return d.name; }),
      note: "Priorität behalten: " + slots.slice(0, 2).map(function (s) { return s.name; }).join(" + ") + ". " + (dropped.length ? "Gestrichen (redundantes Accessory-Volumen): " + dropped.map(function (d) { return d.name; }).join(", ") + "." : "Nichts gestrichen.")
    };
  }

  /* =========================================================================
     SESSION-AUSWAHL + SUBSTITUTION (Equivalence über MM.engines.EXDB.alt)
     ========================================================================= */
  function currentSession() {
    var tp = S.get("os_training_plan", null); if (!tp || !tp.sessions || !tp.sessions.length) return null;
    // Phase 3.1-Semantik: Session-Zuordnung folgt dem PLAN (n-ter Kraftslot →
    // Template n der Rotation), nicht einem lokalen Completion-Zähler.
    try {
      var pv = (window.MM && MM.programView) ? MM.programView : null;
      if (pv && pv.available()) {
        var st = pv.state();
        if (!st.notStarted && !st.over) {
          var target = pv.dayTypeAt(st.day) === "strength" ? st.day : null;
          if (target == null) { for (var d2 = st.day + 1; d2 <= Math.min(84, st.day + 7); d2++) { if (pv.dayTypeAt(d2) === "strength") { target = d2; break; } } }
          if (target != null) { var seq = pv.strengthIndexUpTo(target); return tp.sessions[(seq - 1) % tp.sessions.length]; }
        }
      }
    } catch (e) {}
    var logs = S.get("os_workout_logs", {}) || {};
    var count = (logs._sessions || []).length;
    return tp.sessions[count % tp.sessions.length];
  }
  function substituteSession(session, loc) {
    if (!session) return null;
    var EX = E().EXDB;
    var out = { key: session.key, name: session.name + " · " + (loc === "home_none" ? "ohne Equipment" : loc === "home_db" ? "Kurzhanteln" : "Hotel-Gym"), baseName: session.name, slots: [], substituted: [] };
    session.slots.forEach(function (sl) {
      var ex = EX[sl.ex];
      if (!ex) return;
      var effLoc = loc === "hotel_gym" ? "home_db" : loc;   // Hotel-Gym ≈ Kurzhanteln + Maschinenersatz
      if (ex.equip.indexOf(effLoc) >= 0) { out.slots.push(sl); return; }
      var alt = null;
      for (var i = 0; i < ex.alt.length; i++) { if (EX[ex.alt[i]] && EX[ex.alt[i]].equip.indexOf(effLoc) >= 0) { alt = ex.alt[i]; break; } }
      if (alt) {
        out.slots.push({ ex: alt, name: EX[alt].name, sets: sl.sets, reps: sl.reps, rir: sl.rir, rest: sl.rest, rule: sl.rule, subFor: sl.ex });
        out.substituted.push(sl.name + " → " + EX[alt].name);
      } else {
        out.substituted.push(sl.name + " → entfällt (kein Äquivalent mit diesem Equipment)");
      }
    });
    return out.slots.length ? out : null;
  }

  /* =========================================================================
     MISSED WORKOUT / WEEK REPAIR — Vergangenheit bleibt unangetastet.
     Nachholen = os_reschedules-Eintrag (Execution-Overlay), KEIN dayswap in
     der Vergangenheit, KEINE Adhärenz-Umschreibung.
     ========================================================================= */
  function reschedules() { var r = S.get("os_reschedules", []); return Array.isArray(r) ? r : []; }
  function saveReschedules(r) { S.set("os_reschedules", r); }
  function makeupForDate(ymd, includeDone) { return reschedules().find(function (r) { return r.toDate === ymd && !r.cancelled && (includeDone || !r.done); }) || null; }
  function missedThisWeek() {
    var d = dash(); var p = d.program || {};
    if (!p.active || p.notStarted || p.over || p.paused) return [];
    var weekStartPd = (p.week - 1) * 7 + 1;
    var out = [];
    for (var pd = weekStartPd; pd < p.day; pd++) {
      if (isTrainingDayPd(pd) && !dailyRec(pd).p) {
        var already = reschedules().some(function (r) { return r.fromPd === pd && !r.cancelled; });
        out.push({ pd: pd, date: dateForProgramDay(pd), handled: already });
      }
    }
    return out;
  }
  function nextPlannedStrengthPd(afterPd) {
    for (var pd = afterPd + 1; pd <= Math.min(84, afterPd + 14); pd++) { if (isTrainingDayPd(pd)) return pd; }
    return null;
  }
  function lastStrengthDoneYmd() {
    var daily = S.get("c2_daily", {}) || {}; var best = null;
    Object.keys(daily).forEach(function (k) {
      if (daily[k] && daily[k].p) {
        var pd = parseInt(k.slice(1), 10);
        if (isTrainingDayPd(pd)) { var dt = dateForProgramDay(pd); if (dt && (!best || dt > best)) best = dt; }
      }
    });
    return best;
  }
  function repairOptions(missedPd) {
    var d = dash(); var p = d.program || {};
    if (!p.active) return [];
    var today = todayYmd();
    var weekEndPd = Math.min(84, Math.ceil(missedPd / 7) * 7);
    var nextStr = nextPlannedStrengthPd(p.day - 1);
    var opts = [];
    for (var pd = p.day; pd <= weekEndPd + 3 && pd <= 84; pd++) {
      if (isTrainingDayPd(pd)) continue;                          // geplante Sessions nie überschreiben
      var date = dateForProgramDay(pd); if (!date || date < today) continue;
      if (makeupForDate(date)) continue;                          // pro Tag max. 1 Nachhol-Session
      var gapToNext = nextStr ? Math.abs(pd - nextStr) : 99;
      var inWeek = pd <= weekEndPd;
      var quality = (gapToNext >= 2 ? 2 : gapToNext >= 1 ? 1 : 0) + (inWeek ? 1 : 0);
      opts.push({
        pd: pd, date: date, wd: WD_DE[weekdayOf(date)], quality: quality,
        why: gapToNext >= 2 ? "Hält ≥48 h Abstand zur nächsten geplanten Kraft-Einheit." : (gapToNext === 1 ? "Nur 24 h Abstand zur nächsten Kraft-Einheit — machbar, nicht ideal." : "Direkt neben einer geplanten Kraft-Einheit."),
        tradeoff: inWeek ? null : "Liegt außerhalb der Programmwoche — Wochen-Spacing leidet leicht."
      });
    }
    opts.sort(function (a, b) { return b.quality - a.quality || (a.date < b.date ? -1 : 1); });
    return opts.slice(0, 3);
  }
  function applyReschedule(missedPd, toDate, reason) {
    var toPd = programDayForDate(toDate);
    var r = reschedules();
    r = r.filter(function (x) { return !(x.fromPd === missedPd && !x.done); });
    r.push({ id: uid(), fromPd: missedPd, fromDate: dateForProgramDay(missedPd), toDate: toDate, toPd: toPd, reason: reason || "missed", created: new Date().toISOString(), done: false });
    if (r.length > 60) r = r.slice(r.length - 60);
    saveReschedules(r);
    try { OS().emit("ACTION_RESCHEDULED", { fromPd: missedPd, toDate: toDate }); } catch (e) {}
    track("reschedule_accept", {});
    return r[r.length - 1];
  }
  function skipMissed(missedPd) {
    var r = reschedules();
    r.push({ id: uid(), fromPd: missedPd, fromDate: dateForProgramDay(missedPd), toDate: null, toPd: null, reason: "skipped", created: new Date().toISOString(), done: false, cancelled: true });
    saveReschedules(r);
  }
  function completeMakeup(id) {
    var r = reschedules(); var hit = null;
    r.forEach(function (x) { if (x.id === id) { x.done = true; x.doneAt = new Date().toISOString(); hit = x; } });
    saveReschedules(r);
    // Erledigung zählt auf den ZIELTAG (heutigen Programm-Tag) — eine Quelle (c2_daily),
    // der verpasste Tag bleibt in der Historie verpasst (keine Umschreibung).
    // requireStrength:false — der Zieltag ist bewusst KEIN geplanter Krafttag.
    if (hit && hit.toPd) { try { OS().completeProgramDay(hit.toPd, { requireStrength: false, sessionId: "makeup:" + hit.id }); } catch (e) {} }
    return hit;
  }

  /* =========================================================================
     RÜCKKEHR / COMEBACK — Willkommen zurück statt Streak-Schuld.
     ========================================================================= */
  function lastActivityYmd() {
    var best = null;
    function up(ymd) { if (ymd && (!best || ymd > best)) best = ymd; }
    try { (S.get("os_events", []) || []).slice(-30).forEach(function (e) { up(String(e.at || "").slice(0, 10)); }); } catch (e) {}
    try { var m = S.get("os_metrics", []) || []; m.slice(-30).forEach(function (x) { up(x.date); }); } catch (e) {}
    try { var dl = S.get("os_daylog", {}) || {}; Object.keys(dl).forEach(up); } catch (e) {}
    try {
      var daily = S.get("c2_daily", {}) || {};
      Object.keys(daily).forEach(function (k) { var rec = daily[k]; if (rec && (rec.p || rec.move || rec.recover)) { var dt = dateForProgramDay(parseInt(k.slice(1), 10)); up(dt); } });
    } catch (e) {}
    return best;
  }
  function absenceDays() { var l = lastActivityYmd(); return l ? Math.max(0, diffDays(l, todayYmd()) ) : 0; }
  function comebackState() {
    var away = absenceDays();
    if (away < 7) return null;
    var ack = S.get("os_comeback_ack", "");
    if (ack && diffDays(ack, todayYmd()) < 7) return null;   // schon begrüßt
    var d = dash(); var p = d.program || {};
    return {
      away: away,
      options: [
        { key: "resume", label: "Weitermachen, wo ich war", line: away <= 10 ? "Empfohlen — " + away + " Tage kosten kein Programm." : "Möglich — erste Session bewusst leichter." },
        { key: "light", label: "Sanfter Wiedereinstieg", line: "Erste Session als 30-Minuten-Version, Protein-Floor, eine Messung. Dann normal weiter." },
        p.active && !p.over ? { key: "pause", label: "Programm offiziell pausieren", line: "Pause stoppt den Programm-Tag — ehrlicher als stilles Verpassen." } : null
      ].filter(Boolean)
    };
  }
  function ackComeback() { S.set("os_comeback_ack", todayYmd()); }

  /* =========================================================================
     DECISION LEDGER — FASSADE über dem EINEN kanonischen Ledger.
     Owner der Entscheidungsbedeutung: MM.intelligence.memory (intel_decisions).
     MM.exec erzeugt Follow-up-Aktionen, zeigt Review-Fälligkeit und wendet
     bestätigte Änderungen an — führt aber KEIN zweites Decision-Store.
     Der frühere Phase-6-Store (os_decisions) wird einmalig, idempotent
     migriert. Legacy-Pfad bleibt nur als Fallback ohne Intelligence-Layer.
     ========================================================================= */
  function legacyDecisions() { var d = S.get("os_decisions", []); return Array.isArray(d) ? d : []; }
  function fromIntel(d) {
    return {
      id: d.id, domain: d.domain, what: d.title, why: d.reason, date: d.date,
      reviewDate: d.review_date,
      status: d.status === "open" ? "open" : ((d.outcome && d.outcome.verdict) || d.status),
      confidence: d.confidence, evidence: d.evidence || [],
      oldState: d.old_state, newState: d.new_state, appliedState: d.applied_state
    };
  }
  function migrateLegacyDecisions() {
    var I = IN(); if (!I || !I.memory) return false;
    if (S.get("os_decisions_migrated", false)) return true;
    var legacy = legacyDecisions();
    if (legacy.length) {
      var l = I.memory.ledger();
      var seen = {}; l.forEach(function (d) { if (d.legacy_id) seen[d.legacy_id] = 1; });
      legacy.forEach(function (d) {
        if (seen[d.id]) return;
        I.memory.recordDecision({ domain: d.domain || "general", title: d.what || "", reason: d.why || "", reviewInDays: 14, source: "exec-migrated", date: d.date });
        var all = I.memory.ledger(); var e = all[all.length - 1];
        e.legacy_id = d.id;
        if (d.date) e.date = d.date;
        if (d.reviewDate) e.review_date = d.reviewDate;
        if (d.status && d.status !== "open") { e.status = "reviewed"; e.outcome = { verdict: d.status, note: d.outcomeNote || "" }; e.reviewedAt = d.closedAt || todayYmd(); }
        S.set("intel_decisions", all);
      });
    }
    S.set("os_decisions_migrated", true);
    return true;
  }
  // Beobachtete Reaktion für Response Memory (§12) — beim Review-Schließen.
  function observedNow() {
    try {
      var wt = OS().metricTrend("weight", 15), wa = OS().metricTrend("waist", 14);
      return { weightDelta: wt ? wt.delta : null, waistDelta: wa ? wa.delta : null, windowDays: 14 };
    } catch (e) { return null; }
  }
  function decisions() {
    var I = IN();
    if (I && I.memory && migrateLegacyDecisions()) return I.memory.ledger().map(fromIntel);
    return legacyDecisions();
  }
  function addDecision(dec) {
    var I = IN();
    if (I && I.memory && migrateLegacyDecisions()) {
      var e = I.memory.recordDecision({ domain: dec.domain || "general", title: dec.what, reason: dec.why || "", evidence: dec.evidence || [], reviewInDays: dec.reviewInDays != null ? dec.reviewInDays : 14, type: dec.type || "change", old_state: dec.oldState != null ? dec.oldState : null, new_state: dec.newState != null ? dec.newState : null, source: dec.source || "exec" });
      return fromIntel(e);
    }
    var entry = { id: uid(), domain: dec.domain || "general", what: dec.what, why: dec.why || "", date: todayYmd(), reviewDate: addDays(todayYmd(), dec.reviewInDays != null ? dec.reviewInDays : 14), status: "open" };
    var d = legacyDecisions(); d.push(entry); if (d.length > 100) d = d.slice(d.length - 100);
    S.set("os_decisions", d);
    return entry;
  }
  function dueDecisions(ymd) {
    ymd = ymd || todayYmd();
    var I = IN();
    if (I && I.memory && migrateLegacyDecisions()) return I.memory.decisionsDueForReview().filter(function (d) { return d.review_date <= ymd; }).map(fromIntel);
    return legacyDecisions().filter(function (d) { return d.status === "open" && d.reviewDate <= ymd; });
  }
  function closeDecision(id, outcome, note) {
    var I = IN();
    if (I && I.memory && migrateLegacyDecisions()) {
      I.memory.reviewDecision(id, { verdict: outcome, note: note || "" }, observedNow());
      return;
    }
    var d = legacyDecisions();
    d.forEach(function (x) { if (x.id === id && x.status === "open") { x.status = outcome; x.outcomeNote = note || ""; x.closedAt = todayYmd(); } });
    S.set("os_decisions", d);
  }

  /* =========================================================================
     INTELLIGENCE → EXECUTION: Vorschläge (Proposal-Contract §21/§22).
     Intelligence schlägt vor · Nutzer bestätigt · Execution wendet an ·
     Ledger dokumentiert (old/new/applied) · Review wird terminiert.
     KEINE stille Mutation. Ablehnen = 7 Tage Cooldown (lokal).
     ========================================================================= */
  function proposalState() { return S.get("os_proposal_state", {}) || {}; }
  function proposalDismissed(key) {
    var st = proposalState()[key];
    return !!(st && st.dismissedAt && diffDays(st.dismissedAt, todayYmd()) < 7);
  }
  function dismissProposal(key) { var st = proposalState(); st[key] = { dismissedAt: todayYmd() }; S.set("os_proposal_state", st); }
  function buildProposal(idec) {
    if (!idec || !idec.primary) return null;
    var p = idec.primary;
    if (p.type !== "change" && p.type !== "check") return null;
    // Nur ANWENDBARE Zustandsänderungen werden Bestätigungs-Karten:
    // Nutrition mit Engine-Code oder ein Check (z. B. Monitoring-Review).
    // Recovery-/Execution-Guidance läuft über Fokus/WARUM/Not-Now — sonst
    // widersprächen sich Overlay-Anpassung und Vorschlag am selben Tag (§34/§35).
    if (p.type === "change" && !(p.domain === "nutrition" && p.code)) return null;
    var key = p.domain + ":" + (p.code || p.title);
    if (proposalDismissed(key)) return null;
    // Kein Doppel-Vorschlag, solange in der Domäne eine offene Entscheidung läuft.
    var open = decisions().some(function (d) { return d.status === "open" && d.domain === p.domain; });
    if (open) return null;
    return { key: key, domain: p.domain, type: p.type, code: p.code || null, oldKcal: p.oldKcal || null, newKcal: p.newKcal || null, title: p.title, reason: p.reason, evidence: p.evidence || [], reviewInDays: idec.reviewInDays || 14, oneVariable: !!idec.oneVariable, deepLink: p.deepLink || null };
  }
  function applyProposal(prop) {
    if (!prop) return null;
    var oldState = null, newState = null;
    // Deterministische Anwendung je Domäne — Ausführung gehört MM.exec.
    if (prop.domain === "nutrition" && prop.code) {
      var np = S.get("os_nutrition_plan", null);
      if (np && np.kcal) {
        oldState = np.kcal + " kcal";
        // Deterministisch aus der Engine (newKcal) — Fallback nur, wenn der
        // Vorschlag ohne Engine-Zahl kam (z. B. Simulator-Route).
        var nk = prop.newKcal != null ? prop.newKcal
          : prop.code === "adjust_down" ? Math.round(np.kcal * 0.92 / 10) * 10
          : prop.code === "adjust_up" ? np.kcal + 175 : np.kcal;
        if (nk !== np.kcal) {
          np.kcal = nk; np.kcalRange = [nk - 150, nk + 150];
          np.carbs = Math.max(0, Math.round((nk - np.protein * 4 - np.fat * 9) / 4));
          S.set("os_nutrition_plan", np);
          newState = nk + " kcal";
        }
      }
    }
    var dec = addDecision({ domain: prop.domain, what: prop.title, why: prop.reason, evidence: prop.evidence, reviewInDays: prop.reviewInDays, type: prop.type, oldState: oldState, newState: newState, source: "today-proposal" });
    // applied_state im kanonischen Ledger dokumentieren.
    var I = IN();
    if (I && I.memory && newState != null) {
      var l = I.memory.ledger();
      l.forEach(function (d) { if (d.id === dec.id) { d.applied_state = newState; d.appliedAt = todayYmd(); } });
      S.set("intel_decisions", l);
    }
    try { OS().emit("DECISION_APPLIED", { id: dec.id, domain: prop.domain }); } catch (e) {}
    track("proposal_accept", { d: prop.domain });
    return dec;
  }

  /* =========================================================================
     NUTRITION EXECUTION — Food-Log, Rest des Tages, WAS KANN ICH JETZT ESSEN?
     ========================================================================= */
  // SSOT seit Phase 3.1: os_nutrition_log gehört MM.os (nutritionLog/logFood).
  // MM.exec delegiert — EIN Food-Log, viele Leser. Fallback nur ohne os-core-API.
  function foodLog(ymd) {
    try { if (OS() && OS().nutritionLog) return OS().nutritionLog()[ymd || todayYmd()] || []; } catch (e) {}
    var f = S.get("os_nutrition_log", {}) || {}; return f[ymd || todayYmd()] || [];
  }
  function logFood(protein, kcal, label) {
    var entry = { name: label || "Eintrag", kcal: Math.max(0, Math.round(kcal || 0)), p: Math.max(0, Math.round(protein || 0)), source: "exec" };
    try { if (OS() && OS().logFood) { OS().logFood(entry); return; } } catch (e) {}
    var f = S.get("os_nutrition_log", {}) || {}; var d = todayYmd();
    f[d] = f[d] || []; f[d].push(Object.assign({ at: new Date().toISOString() }, entry));
    S.set("os_nutrition_log", f);
  }
  function remaining(ymd) {
    var np = S.get("os_nutrition_plan", null); if (!np) return null;
    var eaten = foodLog(ymd).reduce(function (a, x) { return { p: a.p + x.p, kcal: a.kcal + x.kcal }; }, { p: 0, kcal: 0 });
    return { protein: Math.max(0, np.protein - eaten.p), kcal: Math.max(0, np.kcal - eaten.kcal), eaten: eaten, target: { protein: np.protein, kcal: np.kcal }, logged: foodLog(ymd).length > 0 };
  }
  var FOOD_CONTEXT = { home: "ZUHAUSE", restaurant: "RESTAURANT", supermarket: "SUPERMARKT", fast: "SCHNELL", family: "FAMILIE", travel: "UNTERWEGS" };
  function eatNow(ctx) {
    ctx = ctx || {};
    var rem = remaining() || { protein: 50, kcal: 700 };
    var where = FOOD_CONTEXT[ctx.where] ? ctx.where : "home";
    track("eat_now_open", { where: where });
    if (where === "restaurant" || where === "travel") {
      return { where: where, remaining: rem, strategy: true, options: [
        { name: "Protein zuerst bestellen", detail: "Fleisch/Fisch-Hauptgericht (~40–60 g Protein). Beilage nach Hunger — nicht nach Pflichtgefühl." },
        { name: "Ein Extra, nicht drei", detail: "Vorspeise ODER Dessert ODER Alkohol — eins davon passt fast immer in " + rem.kcal + " kcal." },
        { name: "Kein Makro-Mikromanagement", detail: "Grobe Schätzung reicht. Ein Restaurantabend entscheidet keine Woche." }
      ] };
    }
    var meals = E().MEALS.slice();
    if (where === "fast") meals = meals.filter(function (m) { return m.min <= 10; });
    if (where === "family") meals = meals.filter(function (m) { return m.tags.indexOf("familie") >= 0; }).concat(meals);
    if (where === "supermarket") meals = meals.filter(function (m) { return m.min <= 12; });
    if (rem.kcal < 450) meals = meals.filter(function (m) { return m.slot === "snack" || m.kcal <= rem.kcal + 120; });
    var scored = meals.map(function (m) {
      var pFit = Math.min(m.p, rem.protein) / Math.max(1, rem.protein);       // deckt Proteinlücke
      var kOver = Math.max(0, m.kcal - rem.kcal) / 300;                        // Kalorien-Überschuss bestraft
      return { m: m, s: pFit * 2 - kOver + (m.p / m.kcal) };                   // Proteindichte als Tiebreaker
    }).sort(function (a, b) { return b.s - a.s; });
    var seen = {}; var out = [];
    scored.forEach(function (x) { if (out.length < 3 && !seen[x.m.id]) { seen[x.m.id] = 1; out.push(x.m); } });
    return { where: where, remaining: rem, strategy: false, options: out };
  }

  /* =========================================================================
     TAGES-SNAPSHOT — Evening Close. Unveränderlich nach Korrekturfenster
     (Re-Close nur am selben Tag; ältere Snapshots sind gesperrt).
     ========================================================================= */
  function dayLog(ymd) { var l = S.get("os_daylog", {}) || {}; return l[ymd || todayYmd()] || null; }
  function isDayClosed(ymd) { return !!dayLog(ymd); }
  function closeDay(note) {
    var d = todayYmd();
    var l = S.get("os_daylog", {}) || {};
    if (l[d] && l[d].date !== d) return null;
    var st = dash(); var p = st.program || {};
    var pd = programDayForDate(d);
    var isTrain = pd != null && isTrainingDayPd(pd);
    var trained = pd != null ? !!dailyRec(pd).p : false;
    var mk = makeupForDate(d, true); var mkDone = !!(mk && mk.done);
    var rem = remaining(d);
    var acts = OS().todayActions(); var doneN = acts.filter(function (a) { return a.done; }).length;
    var verdict = !p.active ? (doneN >= Math.max(1, acts.length - 1) ? "COMPLETE" : "PARTIAL")
      : isTrain ? (trained ? "COMPLETE" : "PARTIAL")
      : (pd != null && dayTypeAt(pd) === "recover") || (pd != null && dayTypeAt(pd) === "reset") ? "RECOVERY"
      : (doneN >= Math.max(1, acts.length - 1) ? "COMPLETE" : "PARTIAL");
    l[d] = {
      date: d, closedAt: new Date().toISOString(), verdict: verdict,
      training: isTrain ? (trained ? "done" : "missed") : (mkDone ? "makeup_done" : "rest"),
      protein: rem && rem.logged ? { eaten: rem.eaten.p, target: rem.target.protein } : null,
      actions: { done: doneN, total: acts.length },
      overlay: (activeOverlay(d) || {}).mode || null,
      note: note || ""
    };
    var keys = Object.keys(l).sort(); while (keys.length > 180) delete l[keys.shift()];
    S.set("os_daylog", l);
    track("day_closed", { v: verdict });
    return l[d];
  }
  // CONSISTENCY statt Streak: erledigte geplante Kraft-Einheiten der letzten 28 Tage.
  function consistency28() {
    var d = dash(); var p = d.program || {};
    if (!p.active || p.notStarted) return null;
    var from = Math.max(1, p.day - 27);
    var planned = 0, done = 0;
    for (var pd = from; pd <= p.day; pd++) {
      if (isTrainingDayPd(pd)) { planned++; if (dailyRec(pd).p) done++; }
    }
    var makeups = reschedules().filter(function (r) { return r.done && r.toPd && r.toPd >= from && r.toPd <= p.day; }).length;
    return { done: Math.min(planned, done + makeups), planned: planned, label: Math.min(planned, done + makeups) + " von " + planned + " geplanten Kraft-Einheiten (28 Tage)" };
  }

  /* =========================================================================
     INSIGHTS — nur neu + bedeutsam + actionable/beruhigend. Dedup + Ablauf.
     ========================================================================= */
  function insightState() { return S.get("os_insights_state", {}) || {}; }
  function currentInsight() {
    var d = dash(); var p = d.program || {};
    var wk = p.week || 0;
    var cands = [];
    var wt = OS().metricTrend("weight", 7), wa = OS().metricTrend("waist", 14);
    if (wa && wa.delta <= -0.5 && wt && Math.abs(wt.delta) < 0.4) cands.push({ id: "recomp_w" + wk, text: "Taille bewegt sich (" + wa.delta + " cm/14 T), die Waage nicht — genau das Muster einer sauberen Rekomposition. Nichts ändern." });
    else if (wt && wt.delta <= -1.2 && d.mode === "cut") cands.push({ id: "fastloss_w" + wk, text: "Du verlierst über 1 kg/Woche im Trend — auf Dauer kostet das Muskeln. Beim nächsten Review Energie leicht erhöhen." });
    else if (wa && wa.delta >= 0.8 && d.mode === "build") cands.push({ id: "waistup_w" + wk, text: "Die Taille steigt schneller als für sauberen Aufbau nötig (" + wa.delta + " cm/14 T). Guardrail im Blick behalten." });
    var st = insightState();
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i]; var rec = st[c.id];
      if (rec && rec.ackAt) continue;
      if (rec && rec.shownAt && diffDays(rec.shownAt, todayYmd()) > 5) continue;   // abgelaufen
      if (!rec) { st[c.id] = { shownAt: todayYmd() }; S.set("os_insights_state", st); }
      return c;
    }
    return null;
  }
  function ackInsight(id) { var st = insightState(); st[id] = st[id] || {}; st[id].ackAt = todayYmd(); S.set("os_insights_state", st); }

  /* =========================================================================
     ADAPTIVE TODAY — buildDay(): Aktionen + chronologischer Plan + NBA 2.0
     ========================================================================= */
  function prefs() {
    return {
      trainTime: OS().getP("calendar.trainTime", "18:00"),
      bedtime: OS().getP("recovery.bedtime", "22:30"),
      stepTarget: OS().getP("lifestyle.stepTarget", 8000),
      weighWd: OS().getP("lifestyle.weighWeekday", 0),         // 0 = Sonntag
      density: OS().getP("ui.density", "standard"),            // focus | standard | expert
      minimumMode: !!OS().getP("lifestyle.minimumMode", false),
      automation: OS().getP("ui.automation", "assisted")       // manual | assisted | proactive
    };
  }
  function mainLiftInfo(session) {
    if (!session || !session.slots || !session.slots.length) return null;
    var logs = S.get("os_workout_logs", {}) || {};
    var sl = session.slots[0];
    var hist = logs[sl.ex] || [];
    var last = hist.length ? hist[hist.length - 1] : null;
    var target = E().progressionTarget(last ? last.sets : null, sl.reps);
    return { name: sl.name, last: last, target: target };
  }
  // Gestapelte Overlays wirken GEMEINSAM: Equipment-Substitution von jedem
  // Equipment-Overlay, Kompression auf das kleinste Zeitbudget aller Overlays.
  // (Beispiel §34: „weniger Zeit“ + „schlecht geschlafen“ am selben Tag.)
  function sessionForDay(ymd, overlay, baseSession) {
    var base = baseSession || currentSession(); if (!base) return null;
    var s = base;
    var list = overlay ? [overlay] : activeOverlays(ymd);
    var loc = null, minutes = null;
    list.forEach(function (o) {
      if (o.mode === "no_gym" || o.mode === "travel" || o.mode === "vacation") loc = (o.mods && o.mods.location) || (o.mode === "no_gym" ? "home_none" : "hotel_gym");
      if (o.mods && o.mods.minutes) minutes = minutes == null ? o.mods.minutes : Math.min(minutes, o.mods.minutes);
    });
    if (loc) s = substituteSession(s, loc) || s;
    if (minutes) { var c = compressSession(s, minutes); if (c) s = c; }
    return s;
  }
  function buildDay(ymd) {
    ymd = ymd || todayYmd();
    var d = dash(); var p = d.program || {};
    var pf = prefs();
    var pd = programDayForDate(ymd);
    var dtype = pd != null ? dayTypeAt(pd) : null;
    var overlay = activeOverlay(ymd);
    var np = S.get("os_nutrition_plan", null);
    var stack = S.get("os_stack", null);
    var mk = makeupForDate(ymd, true);
    var actions = [];
    var isToday = ymd === todayYmd();
    var trainDone = pd != null ? !!dailyRec(pd).p : false;
    var session = sessionForDay(ymd);   // ALLE aktiven Overlays wirken (gestapelt), nicht nur das jüngste
    var estMin = session ? (session.estMin || estimateSessionMin(session)) : 60;

    function act(a) { a.status = a.done ? "done" : "open"; actions.push(a); return a; }

    // TRAINING — geplante Session ODER Nachhol-Session (nie beides doppelt)
    var trainingAction = null;
    if (p.active && !p.notStarted && !p.over && pd != null && dtype === "strength" && d.access.twelve_week) {
      trainingAction = act({
        id: "train:d" + pd, domain: "training", type: "workout",
        title: session ? session.name : "Kraft-Session", detail: "~" + estMin + " min" + (session && session.substituted && session.substituted.length ? " · angepasst an Equipment" : ""),
        date: ymd, time: pf.trainTime, durationMin: estMin, priority: 1,
        flexibility: "window", window: ["16:00", "21:00"], source: "program", deepLink: "#workout",
        done: trainDone
      });
    } else if (mk && d.access.twelve_week) {
      trainingAction = act({
        id: "makeup:" + mk.id, domain: "training", type: "makeup_workout",
        title: (session ? session.name : "Kraft-Session") + " · nachgeholt", detail: "Verpasste Einheit von " + WD_DE[weekdayOf(mk.fromDate)] + " · ~" + estMin + " min",
        date: ymd, time: pf.trainTime, durationMin: estMin, priority: 1,
        flexibility: "window", window: ["16:00", "21:00"], source: "reschedule", deepLink: "#workout",
        done: mk.done
      });
    }

    // ENTSCHEIDUNGS-REVIEWS fällig
    dueDecisions(ymd).forEach(function (dec) {
      act({ id: "decision:" + dec.id, domain: "decision", type: "decision_review", title: "Entscheidung prüfen", detail: dec.what, date: ymd, time: null, durationMin: 2, priority: 2, flexibility: "anytime", source: "ledger", deepLink: "#today", done: false, decisionId: dec.id });
    });

    // WEEKLY REVIEW / RECHECK / LAB-RECHECK — Phase-3.1/4-Reminder als Aktionen
    // (EINE Quelle: MM.os.reminders; Fallback: letzter Tag der Programmwoche).
    var coreRems = [];
    try { if (isToday && OS().reminders) coreRems = OS().reminders(); } catch (e) {}
    if (coreRems.length) {
      coreRems.forEach(function (r) {
        if (r.type === "workout") return;   // Training ist oben bereits die Aktion
        var link = r.type === "lab_recheck" ? "labor.html" : r.type === "measurement" ? "#track" : "kurs-programm.html";
        act({ id: "corerem:" + r.type, domain: r.type === "lab_recheck" ? "labs" : r.type === "measurement" ? "measurement" : "review", type: r.type + "_due", title: r.type === "pulse" ? "Weekly Pulse" : r.type === "recheck" ? "Recheck fällig" : r.type === "lab_recheck" ? "Lab-Recheck" : "Messung auffrischen", detail: r.text, date: ymd, time: null, durationMin: 3, priority: r.urgent ? 2 : 5, flexibility: "anytime", source: "os", deepLink: link, done: false, urgent: !!r.urgent });
      });
    } else if (p.active && !p.notStarted && !p.over && pd != null && pd % 7 === 0) {
      act({ id: "review:w" + p.week, domain: "review", type: "weekly_review", title: "Weekly Review · Woche " + p.week, detail: "Woche bewerten, nächste Woche planen — 3 Minuten", date: ymd, time: null, durationMin: 3, priority: 2, flexibility: "anytime", source: "program", deepLink: "kurs-programm.html", done: false });
    }

    // MESSUNG — Wiege-/Taillentag
    if (weekdayOf(ymd) === pf.weighWd && !pf.minimumMode) {
      var weighedToday = (OS().metricSeries("weight").slice(-1)[0] || {}).date === ymd;
      act({ id: "measure:" + ymd, domain: "measurement", type: "weigh", title: "Wiegen + Taille", detail: "30 Sekunden · nüchtern", date: ymd, time: "07:30", durationMin: 1, priority: 3, flexibility: "window", window: ["06:00", "11:00"], source: "os", deepLink: "#track", done: weighedToday || OS().actionDone("measure:" + ymd, ymd) });
    }

    // NUTRITION — Proteinziel (anytime)
    if (np) {
      var rem = remaining(ymd);
      act({ id: "nutrition:protein:" + ymd, domain: "nutrition", type: "protein_target", title: "Protein " + np.protein + " g", detail: rem && rem.logged ? ("Noch " + rem.protein + " g offen · " + rem.kcal + " kcal Rest") : ("~" + np.kcal + " kcal · Tagesziel"), date: ymd, time: null, durationMin: 0, priority: 4, flexibility: "anytime", source: "nutrition", deepLink: "#plan", done: rem && rem.logged ? rem.protein <= 10 : OS().actionDone("nutrition:protein:" + ymd, ymd) });
    }

    // MOVE + SLEEP Anker (nicht im Minimum-Mode: nur Sleep)
    if (!pf.minimumMode) {
      act({ id: "move:" + ymd, domain: "movement", type: "steps", title: "Bewegung", detail: pf.stepTarget + " Schritte", date: ymd, time: null, durationMin: 0, priority: 5, flexibility: "anytime", source: "os", deepLink: "#today", done: OS().actionDone("move:" + ymd, ymd) });
    }
    act({ id: "sleep:" + ymd, domain: "recovery", type: "sleep", title: "Schlaf-Fenster", detail: "Ab " + pf.bedtime + " runterfahren", date: ymd, time: pf.bedtime, durationMin: 0, priority: 6, flexibility: "fixed", source: "os", deepLink: "#today", done: OS().actionDone("sleep:" + ymd, ymd) });

    // STACK
    if (stack && Array.isArray(stack.items) && stack.items.length && !pf.minimumMode && pf.density !== "focus") {
      act({ id: "stack:" + ymd, domain: "stack", type: "routine", title: "Stack-Routine", detail: stack.items.slice(0, 3).map(function (i) { return i.name; }).join(" · "), date: ymd, time: null, durationMin: 0, priority: 7, flexibility: "anytime", source: "stack", deepLink: "#plan", done: OS().actionDone("stack:" + ymd, ymd) });
    }

    // EXPERIMENT → TODAY (§25): genau EINE Aktion pro laufendem Experiment.
    try {
      var I5 = IN();
      if (I5 && I5.experiments && !pf.minimumMode) {
        var running = I5.experiments.active();
        if (running.length) {
          var ex5 = running[0];
          act({ id: "experiment:" + ex5.id + ":" + ymd, domain: "experiment", type: "experiment", title: ex5.change || ex5.title, detail: "Experiment · bis " + (ex5.endDate || "?"), date: ymd, time: null, durationMin: 0, priority: 5, flexibility: "anytime", source: "experiment", deepLink: "#experiments", done: OS().actionDone("experiment:" + ex5.id + ":" + ymd, ymd) });
        }
        var expDue = I5.experiments.dueForReview();
        if (expDue.length) {
          act({ id: "expreview:" + expDue[0].id, domain: "experiment", type: "experiment_review", title: "Experiment auswerten", detail: expDue[0].title, date: ymd, time: null, durationMin: 3, priority: 3, flexibility: "anytime", source: "experiment", deepLink: "#experiments", done: false });
        }
      }
    } catch (e) {}

    // ATTENTION BUDGET: max 6 Aktionen, im Focus-/Minimum-Mode 3
    var cap = pf.minimumMode || pf.density === "focus" ? 3 : 6;
    actions = actions.slice(0, cap);

    /* ---- Chronologischer Plan (nur High-Value-Anker, kein Stundenplan) ---- */
    var anchors = [];
    actions.forEach(function (a) {
      if (a.type === "weigh") anchors.push({ time: a.time, title: "WIEGEN", sub: "optional · 30 Sek", ref: a.id, done: a.done });
    });
    if (np && (trainingAction && !trainingAction.done)) {
      var preMin = Math.max(0, hmToMin(pf.trainTime) - 90);
      anchors.push({ time: String(Math.floor(preMin / 60)).padStart(2, "0") + ":" + String(preMin % 60).padStart(2, "0"), title: "PRE-TRAINING ESSEN", sub: "Protein + Carbs", ref: null, done: false });
    }
    if (trainingAction) anchors.push({ time: trainingAction.time, title: trainingAction.title.toUpperCase(), sub: "~" + trainingAction.durationMin + " min", ref: trainingAction.id, done: trainingAction.done, deepLink: "#workout" });
    anchors.push({ time: pf.bedtime, title: "WIND DOWN", sub: "Schlaf-Ziel", ref: "sleep:" + ymd, done: OS().actionDone("sleep:" + ymd, ymd) });
    anchors.sort(function (a, b) { return hmToMin(a.time) - hmToMin(b.time); });

    /* ---- INTELLIGENCE-ARBITRIERUNG (§9): Priorität denkt MM.intelligence,
       Machbarkeit entscheidet MM.exec — EIN Ergebnis, nie zwei NBAs. ---- */
    var intel = null;
    if (isToday) {
      try {
        var I6 = IN();
        if (I6 && I6.decision && I6.buildContext) {
          var ictx = I6.buildContext();
          intel = { ctx: ictx, dec: I6.decision.decide(ictx), waiting: I6.decision.waitingForData(ictx) };
          try { I6.decision.trackBottleneck(ictx); } catch (e) {}
        }
      } catch (e) { intel = null; }
    }

    /* ---- NBA 2.0 — genau EINE primäre, max. zwei sekundäre, mit WARUM ---- */
    var open = actions.filter(function (a) { return !a.done; });
    var missed = isToday ? missedThisWeek().filter(function (m) { return !m.handled; }) : [];
    var nba = { primary: null, secondary: [], why: [], missed: missed };
    var bn = intel ? intel.dec.bottleneck.domain : (d.bottleneck || "");
    if (open.length || missed.length) {
      var scored = open.map(function (a) {
        var s = 20 - a.priority * 2;
        if (a.type === "decision_review") s += 6;                                   // offene Schleifen schließen
        if (a.type === "weekly_review") s += 5;
        if (a.urgent && /_due$/.test(a.type)) s += 12;                              // fälliger Pulse/Recheck überstimmt alles (§57)
        if ((a.type === "workout" || a.type === "makeup_workout")) s += 7;          // Programm ist das Rückgrat
        if (overlay && overlay.mode === "low_recovery" && a.domain === "recovery") s += 6;
        if (bn === "recovery" && a.domain === "recovery") s += 3;
        if ((bn === "body" || bn === "metabolic" || bn === "nutrition") && a.domain === "nutrition") s += 3;
        if ((bn === "strength" || bn === "lifestyle" || bn === "training" || bn === "execution") && a.domain === "training") s += 2;
        if (bn === "medical" && a.domain === "labs") s += 5;
        // Timing: Aktion mit Zeitfenster, das bald schließt, steigt
        if (a.time && isToday) { var dt = hmToMin(a.time) - hmToMin(nowHM()); if (dt >= -30 && dt <= 120) s += 4; }
        return { a: a, s: s };
      }).sort(function (x, y) { return y.s - x.s; });
      // Verpasste Session ohne Plan schlägt alles außer heutigem Training
      if (missed.length && !(scored[0] && (scored[0].a.type === "workout" || scored[0].a.type === "makeup_workout"))) {
        nba.primary = { id: "repair:" + missed[0].pd, domain: "training", type: "repair", title: "Verpasste Einheit einplanen", detail: WD_DE[weekdayOf(missed[0].date)] + " ist offen geblieben — die Woche lässt sich reparieren.", deepLink: "#today", repairPd: missed[0].pd };
        nba.why.push("Eine geplante Kraft-Einheit ist offen — nachholen schlägt nachtrauern.");
      } else if (scored.length) {
        nba.primary = scored[0].a;
        if (nba.primary.type === "workout" || nba.primary.type === "makeup_workout") {
          var last = lastStrengthDoneYmd();
          if (last) { var h = diffDays(last, ymd) * 24; nba.why.push(h >= 48 ? h + " h seit der letzten Kraft-Einheit — Muskulatur ist erholt." : "Letzte Einheit vor " + h + " h — heute bewusst auf Ziel, nicht darüber."); }
          else nba.why.push("Erste Einheit dieser Woche — der wichtigste Termin des Tages.");
          if (overlay && overlay.mode === "low_recovery") nba.why.push("Low-Recovery-Modus: Session halten, Progression nicht erzwingen.");
          else if (intel && intel.dec.bottleneck.domain === "recovery") nba.why.push("Recovery ist laut Datenlage dein Limiter — Session auf Ziel, keine neuen Bestwerte erzwingen.");
          else nba.why.push("Kein Konflikt mit höherer Priorität.");
          if (intel && intel.dec.bottleneck.evidence && intel.dec.bottleneck.evidence.length && pf.density === "expert") nba.why.push("Datenlage: " + intel.dec.bottleneck.evidence[0] + " (Konfidenz " + intel.dec.bottleneck.confidencePct + "%).");
          var ml = mainLiftInfo(session);
          if (ml && ml.last) nba.lift = { name: ml.name, last: ml.last.sets.map(function (x) { return x.w + "×" + x.r; }).join(" / "), target: ml.target.text };
          else if (ml) nba.lift = { name: ml.name, last: null, target: ml.target.text };
        } else if (nba.primary.type === "decision_review") {
          nba.why.push("Diese Entscheidung wartet auf ihr Review — offene Schleifen kosten mehr als sie aussehen.");
        } else if (nba.primary.type === "weekly_review") {
          nba.why.push("Letzter Tag der Programmwoche — 3 Minuten Review machen die nächste Woche besser.");
        }
        nba.secondary = scored.slice(1, 3).map(function (x) { return x.a; });
      }
    }

    /* ---- NOT NOW — Intelligence besitzt die Bedeutung, Fallback bleibt lokal ---- */
    var notNow;
    if (intel && intel.dec.notNow && intel.dec.notNow.length) notNow = intel.dec.notNow;
    else if (bn === "recovery") notNow = ["Mehr Supplements", "Mehr Cardio-Volumen", "Programm wechseln"];
    else if (bn === "body" || bn === "metabolic" || bn === "nutrition") notNow = ["Neues Supplement", "Noch ein Trainingsplan", "Kalorien im Tagesrhythmus ändern"];
    else notNow = ["Mehr gleichzeitig ändern", "Neue Tools suchen"];

    /* ---- INTELLIGENCE-ERGEBNIS für die Experience-Schicht ---- */
    var proposal = intel ? buildProposal(intel.dec) : null;
    var waiting = intel && intel.waiting && intel.waiting.length && !proposal ? intel.waiting : null;
    var intelVerdict = intel ? (intel.dec.primary && intel.dec.primary.type === "keep" ? "KEEP" : intel.dec.primary ? intel.dec.primary.type.toUpperCase() : null) : null;

    return {
      date: ymd, isToday: isToday, programDay: pd, dayType: dtype, week: p.week || null,
      overlay: overlay, session: session, actions: actions, anchors: anchors,
      nba: nba, notNow: notNow,
      insight: isToday ? currentInsight() : null,
      comeback: isToday ? comebackState() : null,
      restDay: p.active && pd != null && (dtype === "recover" || dtype === "reset"),
      nothingUrgent: !nba.primary && !missed.length,
      // Intelligence-Schicht (null, wenn MM.intelligence nicht geladen ist)
      proposal: proposal, waiting: waiting, intelVerdict: intelVerdict,
      bottleneck: intel ? { domain: intel.dec.bottleneck.domain, confidencePct: intel.dec.bottleneck.confidencePct, evidence: intel.dec.bottleneck.evidence } : null
    };
  }

  /* =========================================================================
     MY DAY CHANGED — deterministische Neuberechnung. Vorschlag → Bestätigung.
     ========================================================================= */
  function dayChangedOptions() {
    return [
      { key: "less_time", label: "Ich habe weniger Zeit" },
      { key: "missed", label: "Ich habe mein Training verpasst" },
      { key: "traveling", label: "Ich bin auf Reisen" },
      { key: "slept_badly", label: "Ich habe schlecht geschlafen" },
      { key: "no_gym", label: "Heute kein Gym" },
      { key: "eating_out", label: "Ich esse auswärts" },
      { key: "run_down", label: "Ich fühle mich angeschlagen" },
      { key: "more_time", label: "Mein Tag ist freier geworden" }
    ];
  }
  function proposeDayChange(key, params) {
    params = params || {};
    var today = todayYmd();
    var day = buildDay(today);
    var p;
    switch (key) {
      case "less_time": {
        var mins = params.minutes || 30;
        var s = day.session ? compressSession(day.session, mins) : null;
        p = {
          key: key, title: mins + "-MINUTEN-PRIORITÄTSVERSION",
          lines: s
            ? ["Behalten: " + s.slots.map(function (x) { return x.name; }).join(" · "),
               s.dropped.length ? "Gestrichen: " + s.dropped.join(", ") + " (redundantes Volumen, kein Kernreiz)" : "Nichts gestrichen — Pausen gestrafft.",
               "Geschätzt ~" + s.estMin + " min statt " + estimateSessionMin(day.session) + " min."]
            : ["Heute steht keine Kraft-Session — der kürzere Tag ändert nichts am Plan."],
          apply: function () { startOverlay({ mode: "busy", start: today, end: today, reason: "less_time", mods: { minutes: mins } }); }
        };
        break;
      }
      case "missed": {
        var missed = missedThisWeek().filter(function (m) { return !m.handled; });
        var target = missed.length ? missed[0] : { pd: day.programDay, date: today };
        var opts = repairOptions(target.pd);
        p = { key: key, title: "VERPASSTE EINHEIT — OPTIONEN", repair: { missedPd: target.pd, options: opts },
          lines: opts.length ? opts.map(function (o, i) { return (i === 0 ? "BESTE OPTION: " : "ALTERNATIVE: ") + o.wd + " " + o.date.slice(8) + "." + o.date.slice(5, 7) + " — " + o.why + (o.tradeoff ? " (" + o.tradeoff + ")" : ""); }) : ["Diese Woche ist voll — Auslassen ist okay. Das Programm bestraft dich nicht."],
          apply: opts.length ? function () { applyReschedule(target.pd, opts[0].date, "day_changed"); } : function () { skipMissed(target.pd); } };
        break;
      }
      case "traveling": {
        var end = params.end || addDays(today, params.days ? params.days - 1 : 3);
        var loc = params.location || "hotel_gym";
        p = { key: key, title: "REISE-MODUS", lines: [
          "Bis " + end + ": Sessions werden auf " + (loc === "home_none" ? "Bodyweight" : loc === "home_db" ? "Kurzhanteln" : "Hotel-Gym") + " übersetzt — 30–40 min.",
          "Protein-Anker statt Makro-Mikromanagement. Schritte + Schlaf bleiben.",
          "Nach der Reise: automatisch zurück zum Basisplan. Nichts wird umgeschrieben."
        ], apply: function () { startOverlay({ mode: "travel", start: today, end: end, reason: params.reason || "", mods: { location: loc, minutes: 40 } }); } };
        break;
      }
      case "slept_badly": {
        p = { key: key, title: "SCHLECHT GESCHLAFEN", lines: [
          day.session ? "Training bleibt — aber heute auf Ziel, keine neuen Bestwerte erzwingen." : "Kein Training geplant — gut so.",
          "Ein Anker heute: vor " + prefs().bedtime + " runterfahren.",
          "Eine schlechte Nacht ist Rauschen. Zwei+ Nächte wären ein Signal."
        ], apply: function () { startOverlay({ mode: "low_recovery", start: today, end: today, reason: "slept_badly" }); } };
        break;
      }
      case "no_gym": {
        var sub = day.session ? substituteSession(day.session, params.location || "home_none") : null;
        p = { key: key, title: "KEIN GYM — NÄCHSTBESTE AUSFÜHRUNG", lines: sub ? sub.substituted.length ? sub.substituted : ["Session funktioniert ohne Änderung mit deinem Equipment."] : ["Heute steht keine Kraft-Session an."],
          apply: function () { startOverlay({ mode: "no_gym", start: today, end: today, reason: "no_gym", mods: { location: params.location || "home_none" } }); } };
        if (sub) p.lines = ["Gleiches Muster, anderes Werkzeug:"].concat(sub.substituted.length ? sub.substituted : ["Alle Übungen bleiben — dein Plan ist bereits equipment-kompatibel."]).concat(["Original-Historie bleibt unberührt."]);
        break;
      }
      case "eating_out": {
        var en = eatNow({ where: "restaurant" });
        p = { key: key, title: "AUSWÄRTS ESSEN", lines: en.options.map(function (o) { return o.name + " — " + o.detail; }), apply: null };
        break;
      }
      case "run_down": {
        p = { key: key, title: "ANGESCHLAGEN", lines: [
          "Heute: kein Training erzwingen. Option Pause oder lockere Bewegung.",
          "Protein-Floor + Schlaf sind heute die einzigen Ziele.",
          "Bei echten Krankheitssymptomen: auskurieren. Wiedereinstieg regelt das System — ohne Aufholjagd."
        ], apply: function () { startOverlay({ mode: "sick", start: today, end: params.end || today, reason: "run_down" }); } };
        break;
      }
      case "more_time": {
        var missed2 = missedThisWeek().filter(function (m) { return !m.handled; });
        p = { key: key, title: "MEHR ZEIT HEUTE", lines: missed2.length
          ? ["Beste Verwendung: die verpasste Einheit von " + WD_DE[weekdayOf(missed2[0].date)] + " heute nachholen."]
          : day.session && !day.actions.some(function (a) { return a.type === "workout" && a.done; }) && day.dayType === "strength"
            ? ["Nichts nachzuholen — nutze die Zeit für die volle Session ohne Zeitdruck (~" + estimateSessionMin(day.session) + " min) oder 20 min Zone 2 extra."]
            : ["Nichts aufholen. Spaziergang, Mobilität oder einfach frei — geplante Erholung ist Erfolg, kein Leerlauf."],
          apply: missed2.length ? function () { applyReschedule(missed2[0].pd, today, "more_time"); } : null };
        break;
      }
      default: return null;
    }
    track("day_changed", { k: key });
    return p;
  }

  /* =========================================================================
     REMINDER ENGINE — ein zentraler Filter. Stille ist ein Feature.
     ========================================================================= */
  function reminderPrefs() {
    var r = S.get("os_reminder_prefs", null);
    return Object.assign({ enabled: false, quietFrom: "21:30", quietTo: "07:30", maxPerDay: 3, privacy: "discreet", leadMin: 30 }, (r && typeof r === "object") ? r : {});
  }
  function setReminderPrefs(patch) { S.set("os_reminder_prefs", Object.assign(reminderPrefs(), patch || {})); }
  function reminderState() { return S.get("os_reminder_state", {}) || {}; }
  function markReminder(dedupKey, field) {
    var st = reminderState(); var d = todayYmd();
    st[d] = st[d] || {}; st[d][dedupKey] = st[d][dedupKey] || {};
    st[d][dedupKey][field] = new Date().toISOString();
    var keys = Object.keys(st).sort(); while (keys.length > 7) delete st[keys.shift()];
    S.set("os_reminder_state", st);
  }
  function reminderSent(dedupKey) { var st = reminderState(); var d = st[todayYmd()] || {}; return !!(d[dedupKey] && (d[dedupKey].sentAt || d[dedupKey].dismissedAt)); }
  function sentCountToday() { var d = reminderState()[todayYmd()] || {}; return Object.keys(d).filter(function (k) { return d[k].sentAt; }).length; }
  function inQuietHours(hm) {
    var p = reminderPrefs(); var t = hmToMin(hm || nowHM()), from = hmToMin(p.quietFrom), to = hmToMin(p.quietTo);
    return from > to ? (t >= from || t < to) : (t >= from && t < to);
  }
  // WERT-FILTER: actionable + rechtzeitig + relevant + nicht erledigt + nicht dupliziert.
  function eligibleReminders(now) {
    var p = reminderPrefs();
    if (!p.enabled) return [];
    now = now || nowHM();
    var day = buildDay(todayYmd());
    var out = [];
    if (inQuietHours(now)) return [];
    var budget = Math.max(0, p.maxPerDay - sentCountToday());
    day.actions.forEach(function (a) {
      if (a.done || !a.time) return;
      var dt = hmToMin(a.time) - hmToMin(now);
      var key1 = a.id + ":lead";
      // Heads-up: leadMin vor der Zeit
      if (dt <= p.leadMin && dt > 0 && !reminderSent(key1)) {
        out.push({ dedupKey: key1, actionId: a.id, stage: "lead", title: a.title, body: reminderBody(a, day), deepLink: a.deepLink, priority: a.priority });
      }
      // Eskalation genau EINMAL: 90 min überfällig, dann Stille
      if ((a.type === "workout" || a.type === "makeup_workout") && dt < -90 && dt > -240) {
        var key2 = a.id + ":esc";
        if (!reminderSent(key2) && !reminderSent(key1 + ":off")) {
          out.push({ dedupKey: key2, actionId: a.id, stage: "escalation", title: "Trainierst du heute noch?", body: "Fenster bis ~21:00 ist offen. Wenn nicht: ein Tap, und die Woche wird repariert.", deepLink: "#today", priority: 1 });
        }
      }
    });
    out.sort(function (a, b) { return a.priority - b.priority; });
    return out.slice(0, budget);
  }
  function reminderBody(a, day) {
    if (a.type === "workout" || a.type === "makeup_workout") {
      var lift = day.nba && day.nba.lift;
      return a.title + " · " + a.time + " · ~" + a.durationMin + " min" + (lift && lift.last ? ". Zuletzt " + lift.name + ": " + lift.last + "." : ".");
    }
    if (a.type === "weigh") return "30 Sekunden, nüchtern — der Trend braucht Datenpunkte.";
    if (a.type === "sleep") return "Ab " + a.time + " runterfahren — Schlaf ist heute der Hebel.";
    return a.detail || "";
  }
  function notificationText(rem, privacyMode) {
    var pm = privacyMode || reminderPrefs().privacy;
    if (pm === "off") return null;
    if (pm === "discreet") return { title: "MaleMetrix", body: "Eine Aktion ist fällig." };
    return { title: rem.title, body: rem.body };
  }
  // TICK — von der App beim Öffnen/Intervall gerufen. Lokale Notifications,
  // solange die App offen ist. EHRLICH: kein Server-Push ohne Backend-Config.
  function tick() {
    var rems = eligibleReminders();
    var shown = [];
    rems.forEach(function (rem) {
      markReminder(rem.dedupKey, "sentAt");
      shown.push(rem);
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          var txt = notificationText(rem);
          if (txt) {
            if (navigator.serviceWorker && navigator.serviceWorker.ready) {
              navigator.serviceWorker.ready.then(function (reg) {
                reg.showNotification(txt.title, { body: txt.body, tag: rem.dedupKey, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { deepLink: rem.deepLink } });
              }).catch(function () {});
            } else {
              new Notification(txt.title, { body: txt.body, tag: rem.dedupKey });
            }
          }
        }
      } catch (e) {}
    });
    return shown;
  }
  function dismissReminder(dedupKey) { markReminder(dedupKey, "dismissedAt"); }
  function requestNotifyPermission() {
    return new Promise(function (res) {
      try {
        if (typeof Notification === "undefined") return res("unsupported");
        if (Notification.permission === "granted") return res("granted");
        Notification.requestPermission().then(res).catch(function () { res("denied"); });
      } catch (e) { res("unsupported"); }
    });
  }

  /* =========================================================================
     MORNING BRIEF / EVENING CLOSE
     ========================================================================= */
  // MORNING BRIEF — EIN Contract (§11): Intelligence liefert Fokus/Watch/
  // Rationale, Execution liefert Zeitplan/Aktion/Dauer. Kein zweiter Generator.
  function brief() {
    var d = dash(); var p = d.program || {};
    var day = buildDay(todayYmd());
    var np = S.get("os_nutrition_plan", null);
    var bn = d.bottleneck || "";
    var focus = bn === "recovery" ? "Schlaf vor " + prefs().bedtime + "." : bn === "engine" ? "Heute " + prefs().stepTarget + " Schritte wirklich erreichen." : bn === "body" || bn === "metabolic" ? "Proteinziel treffen — der Rest folgt." : bn === "lifestyle" ? "Nur die EINE primäre Aktion. Nicht mehr." : "Progression sauber loggen.";
    var watch = day.insight ? day.insight.text : null;
    var confidence = null;
    try {
      var I7 = IN();
      if (I7 && I7.review && I7.review.morningBrief) {
        var mb = I7.review.morningBrief();
        if (mb.priority) focus = mb.priority;
        if (mb.watch && mb.watch !== "Nichts.") watch = watch ? watch + " · " + mb.watch : mb.watch;
        else if (!watch) watch = null;
      }
      if (day.bottleneck) confidence = day.bottleneck.confidencePct;
    } catch (e) {}
    return {
      dayLabel: p.active && !p.notStarted && !p.over ? "WOCHE " + p.week + " · TAG " + p.day : null,
      overlay: day.overlay,
      primary: day.nba.primary,
      lift: day.nba.lift || null,
      anchors: day.anchors,
      nutrition: np ? { kcal: np.kcal, protein: np.protein } : null,
      focus: focus,
      watch: watch,
      nextReview: p.nextReviewDays != null ? p.nextReviewDays : null,
      restDay: day.restDay,
      confidence: confidence
    };
  }

  /* =========================================================================
     KALENDER OS — interner Kalender + ehrlicher ICS-Export.
     Nur ECHTE Termine (Trainingstage, Nachhol-Sessions, Review) — keine
     täglichen Fake-Events. Floating local time (DST-sicher), DTEND gesetzt.
     Zwei-Wege-Sync: Provider-Abstraktion dokumentiert, NICHT vorgetäuscht.
     ========================================================================= */
  function calendarEvents(daysAhead) {
    var d = dash(); var p = d.program || {};
    var out = [];
    var pf = prefs();
    var today = todayYmd();
    for (var i = 0; i < (daysAhead || 7); i++) {
      var ymd = addDays(today, i);
      var pd = programDayForDate(ymd);
      if (p.active && !p.notStarted && !p.over && pd != null && pd <= 84) {
        if (dayTypeAt(pd) === "strength") {
          var done = !!dailyRec(pd).p;
          out.push({ id: "mm-train-d" + pd, sourceActionId: "train:d" + pd, date: ymd, time: pf.trainTime, durationMin: 60, domain: "training", title: "MaleMetrix · Kraft-Session" + (currentSession() ? "" : ""), status: done ? "done" : "planned", flexibility: "window", syncState: "internal" });
        }
        if (pd % 7 === 0) out.push({ id: "mm-review-w" + Math.ceil(pd / 7), sourceActionId: "review:w" + Math.ceil(pd / 7), date: ymd, time: "19:30", durationMin: 15, domain: "review", title: "MaleMetrix · Weekly Review", status: "planned", flexibility: "anytime", syncState: "internal" });
      }
      var mk = makeupForDate(ymd, true);
      if (mk) out.push({ id: "mm-makeup-" + mk.id, sourceActionId: "makeup:" + mk.id, date: ymd, time: pf.trainTime, durationMin: 55, domain: "training", title: "MaleMetrix · Nachhol-Session", status: mk.done ? "done" : "planned", flexibility: "window", syncState: "internal" });
      if (weekdayOf(ymd) === pf.weighWd) out.push({ id: "mm-weigh-" + ymd, sourceActionId: "measure:" + ymd, date: ymd, time: "07:30", durationMin: 5, domain: "measurement", title: "MaleMetrix · Wiegen + Taille", status: "planned", flexibility: "window", syncState: "internal" });
    }
    return out;
  }
  function icsEscape(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
  function icsCalendar(daysAhead) {
    var evs = calendarEvents(daysAhead || 14).filter(function (e) { return e.status !== "done"; });
    if (!evs.length) return null;
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MaleMetrix//OS Phase6//DE", "CALSCALE:GREGORIAN"];
    evs.forEach(function (e) {
      var ymd = e.date.replace(/-/g, "");
      var startMin = hmToMin(e.time); var endMin = startMin + (e.durationMin || 60);
      function hm(min) { return String(Math.floor(min / 60) % 24).padStart(2, "0") + String(min % 60).padStart(2, "0") + "00"; }
      lines.push("BEGIN:VEVENT",
        "UID:" + e.id + "@malemetrix",
        "DTSTART:" + ymd + "T" + hm(startMin),                 // floating local time — DST-sicher, reist mit dem Nutzer
        "DTEND:" + ymd + "T" + hm(endMin),
        "SUMMARY:" + icsEscape(e.title),
        "URL:https://www.malemetrix.com/mein-protokoll.html",
        "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }
  /* ---- WOCHENPLANER ---- */
  var TYPE_LABEL = { strength: "TRAIN", engine: "ENGINE", recover: "RECOVER", move: "MOVE", reset: "RESET", mobility: "MOBILITY" };
  function weekPlan(offset) {
    offset = offset || 0;
    var d = dash(); var p = d.program || {};
    var today = todayYmd();
    // Woche beginnt am Programm-Wochenanfang (falls aktiv), sonst Montag
    var anchor;
    if (p.active && !p.notStarted && !p.over && programDayForDate(today) != null) {
      var pd0 = programDayForDate(today);
      var weekStartPd = (Math.ceil(pd0 / 7) - 1 + offset) * 7 + 1;
      if (weekStartPd < 1 || weekStartPd > 84) return null;
      anchor = dateForProgramDay(weekStartPd);
    } else {
      var wd = weekdayOf(today); var mon = addDays(today, wd === 0 ? -6 : 1 - wd);
      anchor = addDays(mon, offset * 7);
    }
    var days = [];
    for (var i = 0; i < 7; i++) {
      var ymd = addDays(anchor, i);
      var pd = programDayForDate(ymd);
      var t = pd != null ? dayTypeAt(pd) : null;
      var mk = makeupForDate(ymd, true);
      var rec = pd != null ? dailyRec(pd) : {};
      days.push({
        date: ymd, wd: WD_DE[weekdayOf(ymd)], pd: pd, isToday: ymd === today, past: ymd < today,
        type: t, label: mk ? "NACHHOLEN" : (t ? TYPE_LABEL[t] || t.toUpperCase() : "—"),
        review: pd != null && pd % 7 === 0, measure: weekdayOf(ymd) === prefs().weighWd,
        done: !!(rec.p || rec.move || rec.recover), trainDone: !!rec.p, makeup: mk,
        overlay: (activeOverlay(ymd) || {}).mode || null
      });
    }
    // Wochenlast: geplante Ausführungs-Minuten
    var load = 0;
    days.forEach(function (x) { if (x.type === "strength" || x.makeup) load += 60; else if (x.type === "engine") load += 35; else if (x.type === "move") load += 25; });
    return { anchor: anchor, days: days, week: p.active && days[0].pd ? Math.ceil(days[0].pd / 7) : null, loadMin: load, load: load < 180 ? "LOW" : load <= 330 ? "BALANCED" : "HIGH" };
  }

  /* =========================================================================
     PUSH-ARCHITEKTUR — EHRLICHE KLASSIFIKATION.
     Client-Seite ist vorbereitet (Subscription-Persistenz unten), Server-
     Versand (VAPID-Keys + Edge Function + Scheduler) ist CONFIG REQUIRED.
     Ohne Server-Config wird NICHTS vorgetäuscht: pushStatus() sagt die Wahrheit.
     ========================================================================= */
  function pushStatus() {
    var cfgKey = (window.MM_CONFIG && MM_CONFIG.VAPID_PUBLIC_KEY) || "";
    var swOk = "serviceWorker" in navigator && "PushManager" in window;
    return {
      supported: swOk,
      configured: !!cfgKey,
      state: !swOk ? "unsupported" : !cfgKey ? "config_required" : (typeof Notification !== "undefined" && Notification.permission === "granted" ? "ready" : "permission_required"),
      honest: !cfgKey ? "Lokale Erinnerungen funktionieren, solange die App offen ist. Server-Push (App geschlossen) braucht Backend-Konfiguration — Architektur steht, Keys fehlen." : ""
    };
  }
  function subscribePush() {
    var st = pushStatus();
    if (st.state !== "permission_required" && st.state !== "ready") return Promise.resolve({ ok: false, reason: st.state });
    return navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(MM_CONFIG.VAPID_PUBLIC_KEY) });
    }).then(function (sub) {
      S.set("os_push_subscription", JSON.parse(JSON.stringify(sub)));
      return { ok: true, subscription: sub };
    }).catch(function (e) { return { ok: false, reason: String(e && e.message || e) }; });
  }
  function urlB64ToUint8(base64String) {
    var padding = "=".repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    var raw = atob(base64); var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  /* ======================= EXPORT ======================= */
  MM.exec = {
    // Programm-Ableitung (rein lesend)
    programDayForDate: programDayForDate, dateForProgramDay: dateForProgramDay, dayTypeAt: dayTypeAt,
    // Today / Execution Graph
    buildDay: buildDay, prefs: prefs,
    // Overlays
    OVERLAYS: OVERLAYS, overlays: overlays, activeOverlay: activeOverlay, startOverlay: startOverlay, endOverlay: endOverlay,
    // My Day Changed
    dayChangedOptions: dayChangedOptions, proposeDayChange: proposeDayChange,
    // Kompression & Substitution
    estimateSessionMin: estimateSessionMin, compressSession: compressSession, substituteSession: substituteSession, currentSession: currentSession, sessionForDay: sessionForDay,
    // Missed / Repair
    missedThisWeek: missedThisWeek, repairOptions: repairOptions, applyReschedule: applyReschedule, skipMissed: skipMissed, completeMakeup: completeMakeup, makeupForDate: makeupForDate, reschedules: reschedules,
    // Reminder Engine
    reminderPrefs: reminderPrefs, setReminderPrefs: setReminderPrefs, eligibleReminders: eligibleReminders, tick: tick, dismissReminder: dismissReminder, requestNotifyPermission: requestNotifyPermission, notificationText: notificationText, inQuietHours: inQuietHours,
    // Brief & Close
    brief: brief, closeDay: closeDay, dayLog: dayLog, isDayClosed: isDayClosed, consistency28: consistency28,
    // Decisions (Fassade über kanonischem intel_decisions-Ledger)
    decisions: decisions, addDecision: addDecision, dueDecisions: dueDecisions, closeDecision: closeDecision,
    migrateLegacyDecisions: migrateLegacyDecisions,
    // Intelligence → Execution Proposals
    buildProposal: buildProposal, applyProposal: applyProposal, dismissProposal: dismissProposal,
    // Insights & Comeback
    currentInsight: currentInsight, ackInsight: ackInsight, comebackState: comebackState, ackComeback: ackComeback, absenceDays: absenceDays,
    // Nutrition Execution
    foodLog: foodLog, logFood: logFood, remaining: remaining, eatNow: eatNow, FOOD_CONTEXT: FOOD_CONTEXT,
    // Kalender
    calendarEvents: calendarEvents, icsCalendar: icsCalendar, weekPlan: weekPlan,
    // Push (ehrlich)
    pushStatus: pushStatus, subscribePush: subscribePush
  };

  // Sync-Registrierung: die Phase-6-Domains (os_overlays, os_reschedules,
  // os_decisions, os_daylog, os_reminder_prefs) stehen im SYNC_DOMAINS-Inventar
  // von os-core und werden dort registriert — EIN Inventar, keine Doppelung.
  // os_reminder_state / os_push_subscription / os_workout_draft bleiben bewusst
  // GERÄTE-LOKAL (Notification-/Resume-Zustand ist Geräte-Zustand).
})();
