/* ==========================================================================
   MaleMetrix Tracker — Fitness-App (Training, Cardio, Körper, Pläne, Übungen)
   Alles lokal im Browser, DE/EN, metrisch/imperial.
   Features: Satz-Logging mit Auto-Vorschlag & Overload-Hinweis, Aufwärmsätze,
   RPE, PRs & e1RM, Scheiben-Rechner, Rest-Timer mit Ton, Übungs-Fortschritt
   mit Verlaufschart, Wochen-Insights, Workout wiederholen, Notizen, Export.
   ========================================================================== */

(function () {
  "use strict";

  const app = document.getElementById("trkApp");
  if (!app) return;

  const LANG = () => (window.MM && MM.i18n ? MM.i18n.lang : "de");
  const tr = (o) => (o && (o[LANG()] || o.de)) || "";
  const esc = MM.esc;
  const trE = (o) => esc(tr(o)); // übersetzt + escaped (Namen können vom Nutzer stammen)
  const KG = 2.2046226218;
  const units = () => { try { return localStorage.getItem("mm_units") || "metric"; } catch (e) { return "metric"; } };
  const setUnits = (u) => { try { localStorage.setItem("mm_units", u); } catch (e) {} };
  const massU = () => units() === "imperial" ? "lb" : "kg";
  const dispW = (kg) => units() === "imperial" ? Math.round(kg * KG * 10) / 10 : kg;
  const toKg = (v) => units() === "imperial" ? v / KG : v;
  const fmtW = (kg, d) => units() === "imperial" ? (kg * KG).toFixed(d == null ? 1 : d) + " lb" : (Math.round(kg * 10) / 10) + " kg";

  const S = {
    sessions: () => MM.store.get("trk_sessions", []),
    saveSessions: (v) => MM.store.set("trk_sessions", v),
    cardio: () => MM.store.get("trk_cardio", []),
    saveCardio: (v) => MM.store.set("trk_cardio", v),
    body: () => MM.store.get("trk_body", []),
    saveBody: (v) => MM.store.set("trk_body", v),
    templates: () => MM.store.get("trk_templates", []),
    saveTemplates: (v) => MM.store.set("trk_templates", v),
    customEx: () => MM.store.get("trk_custom_ex", []),
    saveCustomEx: (v) => MM.store.set("trk_custom_ex", v),
    active: () => MM.store.get("trk_active", null),
    saveActive: (v) => MM.store.set("trk_active", v),
    clearActive: () => MM.store.remove("trk_active"),
    /* Wochenplan: Gym-Tage (Wochentag -> Plan-ID) + tägliches Bewegungsziel.
       MaleMetrix-Prinzip: JEDEN Tag 20-30 min bewegen, 2-3x pro Woche Gym. */
    plan: () => MM.store.get("trk_plan", { gymDays: { "1": "push", "3": "pull", "5": "legs" }, dailyMin: 25 }),
    savePlan: (v) => MM.store.set("trk_plan", v),
    /* Tägliche Bewegungs-Einheiten (ohne Gym): [{date:"YYYY-MM-DD", min, kind}] */
    daily: () => MM.store.get("trk_daily", []),
    saveDaily: (v) => MM.store.set("trk_daily", v),
    restPref: () => MM.store.get("trk_rest_sec", 120),
    saveRestPref: (v) => MM.store.set("trk_rest_sec", v),
    barPref: () => MM.store.get("trk_bar_kg", (window.MM_TRK_PLATES || {}).barKg || 20),
    saveBarPref: (v) => MM.store.set("trk_bar_kg", v)
  };

  const T = (de, en) => tr({ de, en });

  function allExercises() { return MM_TRK_EXERCISES.concat(S.customEx()); }
  function exById(id) { return allExercises().find(e => e.id === id) || { id, muscle: "other", equip: "other", name: { de: id, en: id } }; }
  function muscleLabel(m) { return tr(MM_TRK_MUSCLES[m] || { de: m, en: m }); }
  const e1RM = (w, r) => r <= 0 ? 0 : w * (1 + r / 30);
  function exType(id) { return exById(id).type || "weight_reps"; }

  function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(LANG() === "de" ? "de-DE" : "en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }
  function fmtShort(iso) { return new Date(iso).toLocaleDateString(LANG() === "de" ? "de-DE" : "en-US", { day: "2-digit", month: "2-digit", year: "2-digit" }); }

  /* ---------- Verlaufs-Helfer ---------- */
  function workingSets(ex) { return (ex.sets || []).filter(x => x.done && !x.warmup); }
  function lastSetsFor(exId, exclId) {
    const ss = S.sessions().slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const s of ss) {
      if (s.id === exclId) continue;
      const ex = (s.exercises || []).find(e => e.exId === exId);
      if (ex && workingSets(ex).length) return workingSets(ex);
    }
    return null;
  }
  function bestE1RM(exId) {
    let best = 0;
    S.sessions().forEach(s => (s.exercises || []).forEach(e => {
      if (e.exId === exId) e.sets.forEach(x => { if (x.done && !x.warmup) best = Math.max(best, e1RM(x.weight, x.reps)); });
    }));
    return best;
  }
  function sessionVolume(s) {
    let v = 0; (s.exercises || []).forEach(e => e.sets.forEach(x => { if (x.done && !x.warmup) v += (x.weight || 0) * (x.reps || 0); })); return v;
  }
  function countPRsIn(session) {
    let prs = 0;
    const before = {};
    S.sessions().filter(s => new Date(s.date) < new Date(session.date)).forEach(s =>
      (s.exercises || []).forEach(e => e.sets.forEach(x => { if (x.done && !x.warmup) before[e.exId] = Math.max(before[e.exId] || 0, e1RM(x.weight, x.reps)); })));
    (session.exercises || []).forEach(e => {
      let localBest = before[e.exId] || 0;
      e.sets.forEach(x => { if (x.done && !x.warmup) { const v = e1RM(x.weight, x.reps); if (v > localBest) { prs++; localBest = v; } } });
    });
    return prs;
  }

  /* ---------- Tages-System (jeden Tag trainieren) ---------- */
  const localYmd = MM.ymd;
  /* Was wurde an einem Tag gemacht? (Gym-Session, Cardio, tägliche Bewegung) */
  function activityOn(ymd) {
    const gym = S.sessions().some(s => localYmd(s.date) === ymd);
    const cardio = S.cardio().some(c => c.date === ymd);
    const daily = S.daily().some(d => d.date === ymd);
    return { gym, cardio, daily, any: gym || cardio || daily };
  }
  /* Tage in Folge mit Aktivität (heute zählt, wenn schon trainiert;
     sonst beginnt die Zählung gestern — der Streak ist noch nicht gerissen). */
  function dayStreak() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let streak = 0;
    let d = new Date(today);
    if (!activityOn(localYmd(d)).any) d.setDate(d.getDate() - 1); // heute noch offen
    for (let i = 0; i < 730; i++) {
      if (activityOn(localYmd(d)).any) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return streak;
  }
  function planTplFor(weekday) {
    const plan = S.plan();
    const id = (plan.gymDays || {})[String(weekday)];
    if (!id) return null;
    return MM_TRK_TEMPLATES.concat(S.templates()).find(t => t.id === id) || null;
  }
  function logDaily(min, kind) {
    const list = S.daily();
    list.push({ date: localYmd(new Date()), min: min, kind: kind || "move" });
    S.saveDaily(list);
    MM.toast("🔥 " + T("Tagesziel erledigt — Streak: ", "Daily goal done — streak: ") + dayStreak() + " " + T("Tage", "days"));
    if (MM.track) MM.track("tracker_daily_logged", {});
    render();
  }

  /* ---------- Wochen-Kalender (Mo–So, aktuelle Woche) ---------- */
  function weekCalHTML() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Wochenstart Mo
    const names = LANG() === "de" ? ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
    let cells = "";
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      const ymd = localYmd(d);
      const act = activityOn(ymd);
      const tpl = planTplFor(d.getDay());
      const isToday = ymd === localYmd(today);
      const isPast = d < today;
      let icon, cls = "wk-day";
      if (act.gym) { icon = "🏋️"; cls += " done"; }
      else if (act.any) { icon = "✓"; cls += " done"; }
      else if (isPast) { icon = "·"; cls += " missed"; }
      else icon = tpl ? "🏋️" : "🚶";
      if (isToday) cls += " today";
      cells += '<div class="' + cls + '"><span class="wk-name">' + names[i] + '</span>' +
        '<span class="wk-icon">' + icon + '</span>' +
        '<span class="wk-sub">' + (tpl ? trE(tpl.name).split(" ")[0] : (LANG() === "de" ? "Bewegung" : "Move")) + '</span></div>';
    }
    return '<div class="card wk-cal-card"><div class="wk-cal-head">' +
      '<strong>📅 ' + T("Deine Trainingswoche", "Your training week") + '</strong>' +
      '<span class="mono" style="color:var(--amber);font-size:0.85rem">🔥 ' + dayStreak() + ' ' + T("Tage Streak", "day streak") + '</span>' +
      '<button class="btn btn-dark btn-sm" id="planSetup">⚙ ' + T("Plan", "Plan") + '</button></div>' +
      '<div class="wk-cal">' + cells + '</div></div>';
  }

  /* ---------- Heute-Karte: sagt jeden Morgen, was dran ist ---------- */
  function todayCardHTML() {
    const now = new Date();
    const ymd = localYmd(now);
    const act = activityOn(ymd);
    const tpl = planTplFor(now.getDay());
    const plan = S.plan();
    const min = plan.dailyMin || 25;
    if (tpl && !act.gym) {
      return '<div class="card today-card gym"><div class="today-kick">' + T("HEUTE IST GYM-TAG", "TODAY IS GYM DAY") + '</div>' +
        '<h3 class="h-card" style="margin:6px 0 4px">🏋️ ' + trE(tpl.name) + '</h3>' +
        '<p class="muted" style="margin-bottom:16px">' + tpl.exIds.slice(0, 4).map(id => trE(exById(id).name)).join(" · ") + (tpl.exIds.length > 4 ? " …" : "") + '</p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        '<button class="btn btn-primary" data-starttpl="' + tpl.id + '">' + T("Jetzt starten", "Start now") + ' →</button>' +
        '<button class="btn btn-dark btn-sm" id="onlyMove">' + T("Heute nur Bewegung", "Just movement today") + '</button></div></div>';
    }
    if (!act.any) {
      return '<div class="card today-card"><div class="today-kick">' + T("DEIN TAGESZIEL", "TODAY'S GOAL") + '</div>' +
        '<h3 class="h-card" style="margin:6px 0 4px">🚶 ' + min + '–' + (min + 5) + ' min ' + T("Bewegung", "movement") + '</h3>' +
        '<p class="muted" style="margin-bottom:16px">' + T("Gehen, Mobility, Core oder Eigengewicht — Hauptsache, die Kette reißt nicht. Kein Null-Tag.", "Walk, mobility, core or bodyweight — just don't break the chain. No zero days.") + '</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap" id="dailyChips">' +
        [20, 25, 30, 40].map(m => '<button class="btn btn-dark btn-sm" data-dmin="' + m + '">✓ ' + m + ' min</button>').join("") +
        '</div></div>';
    }
    return '<div class="card today-card done-card"><div class="today-kick" style="color:var(--green)">✓ ' + T("TAGESZIEL ERLEDIGT", "DAILY GOAL DONE") + '</div>' +
      '<h3 class="h-card" style="margin:6px 0 4px">' + (act.gym ? "🏋️ " + T("Gym-Einheit im Kasten — stark!", "Gym session done — strong!") : "🔥 " + T("Bewegung geloggt — die Kette hält.", "Movement logged — chain intact.")) + '</h3>' +
      '<p class="muted">' + T("Streak:", "Streak:") + ' ' + dayStreak() + ' ' + T("Tage. Morgen geht's weiter.", "days. See you tomorrow.") + '</p></div>';
  }

  function bindTodayCard(p) {
    const ps = p.querySelector("#planSetup");
    if (ps) ps.addEventListener("click", openPlanSetup);
    p.querySelectorAll("[data-dmin]").forEach(b => b.addEventListener("click", () => logDaily(+b.dataset.dmin)));
    const om = p.querySelector("#onlyMove");
    if (om) om.addEventListener("click", () => logDaily(S.plan().dailyMin || 25));
  }

  /* ---------- Plan-Setup (Gym-Tage + Plan pro Tag + tägliche Minuten) ---------- */
  function openPlanSetup() {
    let modal = document.getElementById("planModal");
    if (!modal) { modal = document.createElement("div"); modal.id = "planModal"; modal.className = "modal-overlay"; document.body.appendChild(modal); }
    const plan = S.plan();
    const gymDays = Object.assign({}, plan.gymDays || {});
    const tpls = MM_TRK_TEMPLATES.concat(S.templates());
    const names = LANG() === "de" ? ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"] : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const order = [1, 2, 3, 4, 5, 6, 0];
    const rows = order.map((wd, i) => {
      const active = !!gymDays[String(wd)];
      const sel = '<select data-pltpl="' + wd + '"' + (active ? "" : " disabled") + '>' +
        tpls.map(t => '<option value="' + t.id + '"' + (gymDays[String(wd)] === t.id ? " selected" : "") + '>' + trE(t.name) + '</option>').join("") + '</select>';
      return '<div class="plan-row"><label class="plan-day"><input type="checkbox" data-plday="' + wd + '"' + (active ? " checked" : "") + '> ' + names[i] + '</label>' + sel + '</div>';
    }).join("");
    modal.innerHTML = '<div class="modal-box"><div class="modal-head"><h3 class="h-card">📅 ' + T("Dein Wochenplan", "Your weekly plan") + '</h3><button class="cart-close" id="plnClose">✕</button></div>' +
      '<p class="muted" style="font-size:0.88rem;margin-bottom:14px">' + T("Das MaleMetrix-Prinzip: jeden Tag 20–30 min Bewegung, an 2–3 Tagen Gym. Wähle deine Gym-Tage — an allen anderen zählt die tägliche Bewegung.", "The MaleMetrix principle: 20–30 min movement every day, gym on 2–3 days. Pick your gym days — every other day counts daily movement.") + '</p>' +
      rows +
      '<div class="field" style="margin-top:14px"><label>' + T("Tägliches Bewegungsziel (Minuten)", "Daily movement goal (minutes)") + '</label>' +
      '<input type="number" id="plnMin" inputmode="numeric" value="' + (plan.dailyMin || 25) + '" min="10" max="90"></div>' +
      '<button class="btn btn-primary btn-block" id="plnSave" style="margin-top:10px">' + T("Plan speichern", "Save plan") + '</button></div>';
    modal.classList.add("open");
    modal.querySelector("#plnClose").addEventListener("click", () => modal.classList.remove("open"));
    modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("open"); });
    modal.querySelectorAll("[data-plday]").forEach(cb => cb.addEventListener("change", () => {
      const sel = modal.querySelector('[data-pltpl="' + cb.dataset.plday + '"]');
      sel.disabled = !cb.checked;
    }));
    modal.querySelector("#plnSave").addEventListener("click", () => {
      const out = {};
      modal.querySelectorAll("[data-plday]").forEach(cb => {
        if (cb.checked) out[cb.dataset.plday] = modal.querySelector('[data-pltpl="' + cb.dataset.plday + '"]').value;
      });
      S.savePlan({ gymDays: out, dailyMin: Math.max(10, parseInt(modal.querySelector("#plnMin").value, 10) || 25) });
      modal.classList.remove("open");
      MM.toast(T("Wochenplan gespeichert", "Weekly plan saved"));
      render();
    });
  }

  /* ==========================================================================
     TAB-SYSTEM
     ========================================================================== */
  let tab = "workout";

  function render() {
    app.innerHTML = statsHTML() + tabsHTML() + '<div class="tracker-panel" id="trkPanel"></div>';
    app.querySelectorAll(".tracker-tab").forEach(b => b.addEventListener("click", () => { tab = b.dataset.tab; render(); }));
    renderPanel();
  }

  function tabsHTML() {
    const t = (id, label) => '<button class="tracker-tab' + (tab === id ? " active" : "") + '" data-tab="' + id + '">' + label + '</button>';
    return '<div class="tracker-tabs">' +
      t("workout", T("Training", "Workout")) +
      t("history", T("Verlauf", "History")) +
      t("exercises", T("Übungen", "Exercises")) +
      t("insights", T("Insights", "Insights")) +
      t("cardio", T("Cardio", "Cardio")) +
      t("body", T("Körper", "Body")) +
      t("templates", T("Pläne", "Routines")) +
      '</div>';
  }

  function statsHTML() {
    const ss = S.sessions();
    const now = new Date(); const weekAgo = new Date(now.getTime() - 7 * 864e5);
    const thisWeek = ss.filter(s => new Date(s.date) >= weekAgo).length;
    const totalVol = ss.reduce((a, s) => a + sessionVolume(s), 0);
    const totalPRs = ss.reduce((a, s) => a + countPRsIn(s), 0);
    const volStr = totalVol >= 1000 ? (units() === "imperial" ? Math.round(totalVol * KG / 1000) + "k lb" : Math.round(totalVol / 1000) + "k kg") : fmtW(totalVol, 0);
    return '<div class="stat-grid-tracker">' +
      stat("🔥 " + dayStreak(), T("Tage-Streak", "Day streak")) +
      stat(thisWeek, T("Gym diese Woche", "Gym this week")) +
      stat(volStr, T("Gesamtvolumen", "Total volume")) +
      stat(totalPRs, T("Persönliche Rekorde", "Personal records")) +
      '</div>';
  }
  function stat(num, label) { return '<div class="tstat"><div class="tstat-num text-grad">' + num + '</div><div class="tstat-label">' + label + '</div></div>'; }

  function renderPanel() {
    const p = document.getElementById("trkPanel");
    if (tab === "workout") renderWorkout(p);
    else if (tab === "history") renderHistory(p);
    else if (tab === "exercises") renderExercises(p);
    else if (tab === "insights") renderInsights(p);
    else if (tab === "cardio") renderCardio(p);
    else if (tab === "body") renderBody(p);
    else if (tab === "templates") renderTemplates(p);
  }

  /* ==========================================================================
     WORKOUT
     ========================================================================== */
  function renderWorkout(p) {
    const active = S.active();
    if (!active) {
      const templates = MM_TRK_TEMPLATES.concat(S.templates());
      const last = S.sessions().slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      p.innerHTML =
        todayCardHTML() +
        weekCalHTML() +
        '<div class="card" style="text-align:center;padding:36px 24px;margin-bottom:22px">' +
        '<div style="font-size:2.4rem;margin-bottom:12px">🏋️</div>' +
        '<h3 class="h-card" style="margin-bottom:8px">' + T("Bereit fürs Training?", "Ready to train?") + '</h3>' +
        '<p class="muted" style="margin-bottom:22px;max-width:420px;margin-left:auto;margin-right:auto">' + T("Starte leer, wiederhole dein letztes Training oder wähle einen Plan. Dein letztes Mal wird automatisch vorgeschlagen.", "Start empty, repeat your last workout or pick a routine. Your last time is auto-suggested.") + '</p>' +
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
        '<button class="btn btn-primary btn-lg" id="startEmpty">' + T("Leere Einheit", "Empty workout") + '</button>' +
        (last ? '<button class="btn btn-dark btn-lg" id="repeatLast">↻ ' + T("Letztes wiederholen", "Repeat last") + '</button>' : '') +
        '</div></div>' +
        '<h3 class="h-card" style="margin-bottom:14px">' + T("Schnellstart mit Plan", "Quick start with a routine") + '</h3>' +
        '<div class="grid-3">' + templates.map(tpl =>
          '<div class="template-card"><h4>' + trE(tpl.name) + '</h4>' +
          '<div style="margin:8px 0 14px">' + tpl.exIds.map(id => '<div class="template-ex">· ' + trE(exById(id).name) + '</div>').join("") + '</div>' +
          '<button class="btn btn-dark btn-sm btn-block" data-starttpl="' + tpl.id + '">' + T("Starten", "Start") + '</button></div>'
        ).join("") + '</div>';

      p.querySelector("#startEmpty").addEventListener("click", () => startSession(null));
      const rl = p.querySelector("#repeatLast"); if (rl) rl.addEventListener("click", () => repeatSession(last));
      p.querySelectorAll("[data-starttpl]").forEach(b => b.addEventListener("click", () => startSession(b.dataset.starttpl)));
      bindTodayCard(p);
      return;
    }

    const dur = Math.round((Date.now() - active.startedAt) / 60000);
    const liveVol = sessionVolume({ exercises: active.exercises });
    let html = '<div class="card" style="margin-bottom:18px"><div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">' +
      '<div><input type="text" id="sessName" value="' + esc(active.name || "") + '" style="background:none;border:none;font-family:var(--font-display);font-size:1.3rem;font-weight:700;color:var(--text);padding:0;width:auto"></div>' +
      '<div style="display:flex;gap:10px;align-items:center"><span class="mono muted" style="font-size:0.85rem">⏱ ' + dur + ' min · ' + fmtW(liveVol, 0) + '</span>' +
      '<button class="btn btn-ghost btn-sm" id="discardSess">' + T("Verwerfen", "Discard") + '</button>' +
      '<button class="btn btn-primary btn-sm" id="finishSess">' + T("Beenden", "Finish") + '</button></div></div></div>';

    if (!active.exercises.length) {
      html += '<div class="empty-state"><div class="big">➕</div><p>' + T("Noch keine Übung. Füge deine erste hinzu.", "No exercise yet. Add your first.") + '</p></div>';
    }

    active.exercises.forEach((ex, ei) => {
      const meta = exById(ex.exId);
      const prev = lastSetsFor(ex.exId, active.id);
      const pr = bestE1RM(ex.exId);
      const type = meta.type || "weight_reps";
      const isBW = type === "bodyweight_reps";
      const isTime = type === "time";
      const wLabel = isTime ? T("Sek.", "Sec") : massU();
      const rCol = isTime ? "" : '<th>' + T("Wdh.", "Reps") + '</th>';

      html += '<div class="card" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">' +
        '<div><button class="ex-title-link" data-exdetail="' + ex.exId + '">' + trE(meta.name) + ' <span style="opacity:0.5">↗</span></button>' +
        '<span class="ex-muscle-tag">' + muscleLabel(meta.muscle) + '</span></div>' +
        '<button class="btn-link-del" data-delex="' + ei + '" style="background:none;border:none;color:var(--muted-2);font-size:0.8rem;text-decoration:underline;cursor:pointer">' + T("Entfernen", "Remove") + '</button></div>';

      if (meta.equip === "barbell" && !isTime) {
        html += '<button class="btn btn-dark btn-sm plate-btn" data-plate="' + ei + '" style="margin-bottom:10px">🏋️ ' + T("Scheiben", "Plates") + '</button>';
      }

      html += '<table class="set-table"><thead><tr><th>' + T("Satz", "Set") + '</th><th>' + T("Letztes", "Prev") + '</th>' +
        (isBW ? '' : '<th>' + wLabel + '</th>') + rCol +
        (isTime ? '' : '<th>RPE</th>') + '<th>✓</th></tr></thead><tbody>';

      ex.sets.forEach((set, si) => {
        const prevSet = prev && prev[si]
          ? (isTime ? (prev[si].reps + "s") : (isBW ? (prev[si].reps + "×") : (dispW(prev[si].weight) + "×" + prev[si].reps)))
          : "—";
        const setE1 = (!set.warmup && set.done && set.weight > 0) ? e1RM(set.weight, set.reps) : 0;
        const isPR = setE1 > 0 && pr > 0 && Math.abs(setE1 - pr) < 0.01;
        // Overload-Hinweis vs. letztes Mal (gleicher Satz-Index)
        let cue = "";
        if (!set.warmup && prev && prev[si] && !isTime) {
          const now = isBW ? set.reps : e1RM(set.weight, set.reps);
          const then = isBW ? prev[si].reps : e1RM(prev[si].weight, prev[si].reps);
          if (set.done && now > then + 0.01) cue = ' <span class="cue-up">▲</span>';
          else if (set.done && now < then - 0.01) cue = ' <span class="cue-down">▼</span>';
        }
        const rowCls = set.warmup ? ' class="warmup-row"' : '';
        html += '<tr data-set="' + ei + '_' + si + '"' + rowCls + '><td>' +
          '<button class="set-num' + (set.warmup ? " is-warmup" : "") + '" data-warm="' + ei + '_' + si + '" title="' + T("Aufwärmsatz umschalten", "Toggle warm-up") + '">' + (set.warmup ? "W" : (si + 1)) + '</button>' +
          (isPR ? ' <span class="pr-badge">PR</span>' : '') + cue + '</td>' +
          '<td class="prev-cell">' + prevSet + '</td>';
        if (!isBW) {
          html += '<td><input type="number" inputmode="decimal" class="set-w" value="' + (set.weight ? dispW(set.weight) : "") + '" placeholder="' + (prev && prev[si] ? dispW(prev[si].weight) : "0") + '" data-ei="' + ei + '" data-si="' + si + '"></td>';
        }
        if (!isTime) {
          html += '<td><input type="number" inputmode="numeric" class="set-r" value="' + (set.reps || "") + '" placeholder="' + (prev && prev[si] ? prev[si].reps : "0") + '" data-ei="' + ei + '" data-si="' + si + '"></td>' +
            '<td><input type="number" inputmode="decimal" class="set-rpe" value="' + (set.rpe || "") + '" placeholder="–" min="5" max="10" step="0.5" data-ei="' + ei + '" data-si="' + si + '"></td>';
        } else {
          html += '<td><input type="number" inputmode="numeric" class="set-r" value="' + (set.reps || "") + '" placeholder="' + (prev && prev[si] ? prev[si].reps : "30") + '" data-ei="' + ei + '" data-si="' + si + '"></td>';
        }
        html += '<td><button class="set-done-btn' + (set.done ? " done" : "") + '" data-done="' + ei + '_' + si + '">✓</button></td></tr>';
      });
      html += '</tbody></table>' +
        '<div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap"><button class="btn btn-dark btn-sm" data-addset="' + ei + '">+ ' + T("Satz", "Set") + '</button>' +
        '<button class="btn btn-dark btn-sm" data-addwarm="' + ei + '">+ ' + T("Aufwärmsatz", "Warm-up") + '</button></div></div>';
    });

    html += '<button class="btn btn-ghost btn-block" id="addExercise" style="margin-top:8px">+ ' + T("Übung hinzufügen", "Add exercise") + '</button>' +
      '<div class="field" style="margin-top:16px"><label>' + T("Notiz zur Einheit", "Session note") + '</label>' +
      '<textarea id="sessNote" rows="2" placeholder="' + T("z. B. gutes Gefühl, linkes Knie beobachten…", "e.g. felt strong, watch left knee…") + '" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--card-2);color:var(--text);font-family:inherit;resize:vertical">' + esc(active.note || "") + '</textarea></div>';
    p.innerHTML = html;

    p.querySelector("#sessName").addEventListener("change", e => { active.name = e.target.value; S.saveActive(active); });
    p.querySelector("#sessNote").addEventListener("change", e => { active.note = e.target.value; S.saveActive(active); });
    p.querySelector("#discardSess").addEventListener("click", () => {
      if (confirm(T("Einheit verwerfen? Daten gehen verloren.", "Discard workout? Data will be lost."))) { S.clearActive(); render(); }
    });
    p.querySelector("#finishSess").addEventListener("click", finishSession);
    p.querySelector("#addExercise").addEventListener("click", openExercisePicker);
    p.querySelectorAll("[data-exdetail]").forEach(b => b.addEventListener("click", () => openExerciseDetail(b.dataset.exdetail)));
    p.querySelectorAll("[data-plate]").forEach(b => b.addEventListener("click", () => {
      const ex = active.exercises[+b.dataset.plate];
      const lastSet = ex.sets[ex.sets.length - 1];
      openPlateCalc(lastSet ? lastSet.weight : 0);
    }));
    p.querySelectorAll("[data-delex]").forEach(b => b.addEventListener("click", () => {
      active.exercises.splice(+b.dataset.delex, 1); S.saveActive(active); renderPanel();
    }));
    p.querySelectorAll("[data-addset]").forEach(b => b.addEventListener("click", () => {
      const ex = active.exercises[+b.dataset.addset];
      const last = ex.sets[ex.sets.length - 1];
      ex.sets.push({ weight: last ? last.weight : 0, reps: last ? last.reps : 0, done: false });
      S.saveActive(active); renderPanel();
    }));
    p.querySelectorAll("[data-addwarm]").forEach(b => b.addEventListener("click", () => {
      const ex = active.exercises[+b.dataset.addwarm];
      ex.sets.unshift({ weight: 0, reps: 0, done: false, warmup: true });
      S.saveActive(active); renderPanel();
    }));
    p.querySelectorAll("[data-warm]").forEach(b => b.addEventListener("click", () => {
      const [ei, si] = b.dataset.warm.split("_").map(Number);
      const set = active.exercises[ei].sets[si];
      set.warmup = !set.warmup;
      S.saveActive(active); renderPanel();
    }));
    p.querySelectorAll(".set-w").forEach(inp => inp.addEventListener("input", () => {
      active.exercises[+inp.dataset.ei].sets[+inp.dataset.si].weight = toKg(parseFloat(inp.value) || 0); S.saveActive(active);
    }));
    p.querySelectorAll(".set-r").forEach(inp => inp.addEventListener("input", () => {
      active.exercises[+inp.dataset.ei].sets[+inp.dataset.si].reps = parseInt(inp.value) || 0; S.saveActive(active);
    }));
    p.querySelectorAll(".set-rpe").forEach(inp => inp.addEventListener("input", () => {
      active.exercises[+inp.dataset.ei].sets[+inp.dataset.si].rpe = parseFloat(inp.value) || 0; S.saveActive(active);
    }));
    p.querySelectorAll("[data-done]").forEach(b => b.addEventListener("click", () => {
      const [ei, si] = b.dataset.done.split("_").map(Number);
      const set = active.exercises[ei].sets[si];
      set.done = !set.done;
      S.saveActive(active);
      if (set.done && !set.warmup) startRestTimer();
      renderPanel();
    }));
  }

  function startSession(tplId) {
    const tpl = tplId ? MM_TRK_TEMPLATES.concat(S.templates()).find(t => t.id === tplId) : null;
    const active = {
      id: "s" + Date.now(),
      startedAt: Date.now(),
      date: new Date().toISOString(),
      name: tpl ? tr(tpl.name) : (T("Training", "Workout") + " " + fmtShort(new Date().toISOString())),
      exercises: tpl ? tpl.exIds.map(id => ({ exId: id, sets: [{ weight: 0, reps: 0, done: false }] })) : []
    };
    S.saveActive(active);
    render();
  }

  function repeatSession(sess) {
    if (!sess) return;
    const active = {
      id: "s" + Date.now(), startedAt: Date.now(), date: new Date().toISOString(),
      name: sess.name || (T("Training", "Workout") + " " + fmtShort(new Date().toISOString())),
      exercises: (sess.exercises || []).map(e => ({
        exId: e.exId,
        sets: (e.sets || []).map(x => ({ weight: x.weight || 0, reps: x.reps || 0, done: false, warmup: !!x.warmup }))
      }))
    };
    S.saveActive(active);
    render();
  }

  function finishSession() {
    const active = S.active();
    if (!active) return;
    active.exercises = active.exercises.map(e => ({ ...e, sets: e.sets.filter(s => s.done) })).filter(e => e.sets.length);
    if (!active.exercises.length) {
      if (!confirm(T("Keine erledigten Sätze. Trotzdem ohne Speichern beenden?", "No completed sets. End without saving?"))) return;
      S.clearActive(); render(); return;
    }
    active.duration = Math.round((Date.now() - active.startedAt) / 60000);
    const sessions = S.sessions();
    sessions.push({ id: active.id, date: active.date, name: active.name, exercises: active.exercises, duration: active.duration, note: active.note || "" });
    S.saveSessions(sessions);
    const prs = countPRsIn(active);
    S.clearActive();
    MM.toast(T("Einheit gespeichert" + (prs ? " · " + prs + " neue PR!" : ""), "Workout saved" + (prs ? " · " + prs + " new PR!" : "")));
    stopRestTimer();
    tab = "history"; render();
  }

  /* ---------- Übungs-Picker (Modal) ---------- */
  function openExercisePicker() {
    let modal = document.getElementById("exModal");
    if (!modal) { modal = document.createElement("div"); modal.id = "exModal"; modal.className = "modal-overlay"; document.body.appendChild(modal); }
    let muscleFilter = "";
    const draw = (filter) => {
      const q = (filter || "").toLowerCase();
      const list = allExercises().filter(e =>
        (!muscleFilter || e.muscle === muscleFilter) &&
        (tr(e.name).toLowerCase().includes(q) || muscleLabel(e.muscle).toLowerCase().includes(q)));
      modal.querySelector(".ex-picker-list").innerHTML = list.map(e =>
        '<button class="ex-pick" data-pick="' + e.id + '"><span>' + trE(e.name) + '</span><span class="ex-muscle-tag">' + muscleLabel(e.muscle) + '</span></button>'
      ).join("") || '<p class="muted" style="text-align:center;padding:20px">' + T("Nichts gefunden.", "Nothing found.") + '</p>';
      modal.querySelectorAll("[data-pick]").forEach(b => b.addEventListener("click", () => {
        const active = S.active();
        active.exercises.push({ exId: b.dataset.pick, sets: [{ weight: 0, reps: 0, done: false }] });
        S.saveActive(active); closeModal("exModal"); renderPanel();
      }));
    };
    const chips = Object.keys(MM_TRK_MUSCLES).map(m =>
      '<button class="mfilter" data-mf="' + m + '">' + muscleLabel(m) + '</button>').join("");
    modal.innerHTML = '<div class="modal-box"><div class="modal-head"><h3 class="h-card">' + T("Übung wählen", "Choose exercise") + '</h3>' +
      '<button class="cart-close" id="exClose">✕</button></div>' +
      '<input type="text" class="ex-picker-search" id="exSearch" placeholder="' + T("Suchen oder eigene anlegen…", "Search or create your own…") + '">' +
      '<div class="mfilter-row"><button class="mfilter active" data-mf="">' + T("Alle", "All") + '</button>' + chips + '</div>' +
      '<div class="ex-picker-list"></div>' +
      '<button class="btn btn-dark btn-block btn-sm" id="addCustomEx" style="margin-top:14px">+ ' + T("Eigene Übung anlegen", "Create custom exercise") + '</button></div>';
    modal.classList.add("open");
    draw("");
    modal.querySelector("#exClose").addEventListener("click", () => closeModal("exModal"));
    modal.addEventListener("click", e => { if (e.target === modal) closeModal("exModal"); });
    const search = modal.querySelector("#exSearch");
    search.addEventListener("input", () => draw(search.value));
    modal.querySelectorAll(".mfilter").forEach(b => b.addEventListener("click", () => {
      muscleFilter = b.dataset.mf;
      modal.querySelectorAll(".mfilter").forEach(x => x.classList.toggle("active", x === b));
      draw(search.value);
    }));
    modal.querySelector("#addCustomEx").addEventListener("click", () => {
      const name = search.value.trim() || prompt(T("Name der Übung:", "Exercise name:"));
      if (!name) return;
      const cs = S.customEx();
      const id = "cx" + Date.now();
      cs.push({ id, muscle: muscleFilter || "other", equip: "other", name: { de: name, en: name } });
      S.saveCustomEx(cs);
      const active = S.active();
      active.exercises.push({ exId: id, sets: [{ weight: 0, reps: 0, done: false }] });
      S.saveActive(active); closeModal("exModal"); renderPanel();
    });
  }
  function closeModal(id) { const m = document.getElementById(id || "exModal"); if (m) m.classList.remove("open"); }

  /* ---------- Scheiben-Rechner ---------- */
  function openPlateCalc(prefillKg) {
    let modal = document.getElementById("plateModal");
    if (!modal) { modal = document.createElement("div"); modal.id = "plateModal"; modal.className = "modal-overlay"; document.body.appendChild(modal); }
    const cfg = window.MM_TRK_PLATES || { barKg: 20, platesKg: [25, 20, 15, 10, 5, 2.5, 1.25] };
    const barKg = S.barPref();

    function compute(totalKg) {
      const perSide = (totalKg - barKg) / 2;
      if (perSide <= 0) return { ok: perSide === 0, plates: [], rest: perSide < 0 ? perSide : 0 };
      let rest = perSide; const plates = [];
      cfg.platesKg.forEach(pl => { while (rest >= pl - 1e-6) { plates.push(pl); rest -= pl; } });
      return { ok: rest < 0.01, plates, rest };
    }
    function draw(totalKgInput) {
      const totalDisp = parseFloat(totalKgInput) || 0;
      const totalKg = toKg(totalDisp);
      const res = compute(totalKg);
      let out;
      if (totalKg < barKg) {
        out = '<p class="muted" style="text-align:center;padding:14px">' + T("Gewicht ≤ Stange (", "Weight ≤ bar (") + fmtW(barKg) + ')</p>';
      } else if (!res.plates.length) {
        out = '<p style="text-align:center;padding:14px;color:var(--text)">' + T("Nur die Stange", "Just the bar") + '</p>';
      } else {
        const chips = res.plates.map(pl => '<span class="plate-chip">' + dispW(pl) + '</span>').join("");
        out = '<div class="plate-visual"><span class="plate-bar-end"></span>' + chips + '<span class="plate-bar-mid"></span></div>' +
          '<p class="muted small" style="text-align:center;margin-top:10px">' + T("pro Seite", "per side") + (res.rest > 0.01 ? ' · ' + T("Rest nicht darstellbar:", "leftover:") + ' ' + fmtW(res.rest) : '') + '</p>';
      }
      modal.querySelector("#plateOut").innerHTML = out;
    }
    modal.innerHTML = '<div class="modal-box"><div class="modal-head"><h3 class="h-card">🏋️ ' + T("Scheiben-Rechner", "Plate calculator") + '</h3><button class="cart-close" id="plClose">✕</button></div>' +
      '<div class="form-row"><div class="field"><label>' + T("Zielgewicht", "Target weight") + ' (' + massU() + ')</label><input type="number" inputmode="decimal" id="plTotal" value="' + (prefillKg ? dispW(prefillKg) : "") + '" placeholder="' + (units() === "imperial" ? "225" : "100") + '"></div>' +
      '<div class="field"><label>' + T("Stange", "Bar") + ' (' + massU() + ')</label><input type="number" inputmode="decimal" id="plBar" value="' + dispW(barKg) + '"></div></div>' +
      '<div id="plateOut" style="margin-top:8px"></div></div>';
    modal.classList.add("open");
    modal.querySelector("#plClose").addEventListener("click", () => closeModal("plateModal"));
    modal.addEventListener("click", e => { if (e.target === modal) closeModal("plateModal"); });
    const totalIn = modal.querySelector("#plTotal"), barIn = modal.querySelector("#plBar");
    totalIn.addEventListener("input", () => draw(totalIn.value));
    barIn.addEventListener("input", () => { S.saveBarPref(toKg(parseFloat(barIn.value) || 20)); draw(totalIn.value); });
    draw(totalIn.value);
    setTimeout(() => { totalIn.focus(); totalIn.select(); }, 50);
  }

  /* ---------- Übungs-Detail / Fortschritt ---------- */
  function exerciseHistory(exId) {
    const out = [];
    S.sessions().slice().sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(s => {
      const ex = (s.exercises || []).find(e => e.exId === exId);
      if (!ex) return;
      const work = ex.sets.filter(x => x.done && !x.warmup);
      if (!work.length) return;
      let bestE = 0, topW = 0, vol = 0, bestReps = 0;
      work.forEach(x => { bestE = Math.max(bestE, e1RM(x.weight, x.reps)); topW = Math.max(topW, x.weight); vol += x.weight * x.reps; bestReps = Math.max(bestReps, x.reps); });
      out.push({ date: s.date, sets: work, bestE, topW, vol, bestReps });
    });
    return out;
  }
  function openExerciseDetail(exId) {
    let modal = document.getElementById("exDetailModal");
    if (!modal) { modal = document.createElement("div"); modal.id = "exDetailModal"; modal.className = "modal-overlay"; document.body.appendChild(modal); }
    const meta = exById(exId);
    const hist = exerciseHistory(exId);
    const type = meta.type || "weight_reps";
    let body;
    if (!hist.length) {
      body = '<p class="muted" style="text-align:center;padding:24px">' + T("Noch keine erledigten Sätze für diese Übung.", "No completed sets for this exercise yet.") + '</p>';
    } else {
      const bestE = Math.max.apply(null, hist.map(h => h.bestE));
      const topW = Math.max.apply(null, hist.map(h => h.topW));
      const bestReps = Math.max.apply(null, hist.map(h => h.bestReps));
      const metric = type === "weight_reps"
        ? hist.map(h => ({ date: h.date, v: h.bestE }))
        : hist.map(h => ({ date: h.date, v: h.bestReps }));
      const chart = lineChart(metric.map(m => m.v), type === "weight_reps");
      const prRows =
        (type === "weight_reps"
          ? '<div class="mini-stat"><span>' + T("Bester e1RM", "Best e1RM") + '</span><strong>' + fmtW(bestE) + '</strong></div>' +
            '<div class="mini-stat"><span>' + T("Top-Gewicht", "Top weight") + '</span><strong>' + fmtW(topW) + '</strong></div>'
          : '') +
        '<div class="mini-stat"><span>' + T("Beste Wdh.", "Best reps") + '</span><strong>' + bestReps + '</strong></div>' +
        '<div class="mini-stat"><span>' + T("Einheiten", "Sessions") + '</span><strong>' + hist.length + '</strong></div>';
      const rows = hist.slice().reverse().map(h =>
        '<div class="history-ex-line" style="padding:10px 0;border-bottom:1px solid var(--line)"><span class="mono" style="font-size:0.78rem;color:var(--accent-2)">' + fmtShort(h.date) + '</span>' +
        '<span class="sets">' + h.sets.map(x => type === "time" ? (x.reps + "s") : (type === "bodyweight_reps" ? (x.reps + "×") : (dispW(x.weight) + "×" + x.reps))).join(", ") + '</span></div>').join("");
      body = '<div class="mini-stat-grid">' + prRows + '</div>' +
        (metric.length >= 2 ? '<div style="margin:16px 0"><div class="muted small" style="margin-bottom:6px">' + (type === "weight_reps" ? T("Geschätztes 1RM über Zeit", "Estimated 1RM over time") : T("Beste Wiederholungen über Zeit", "Best reps over time")) + '</div>' + chart + '</div>' : '') +
        '<div style="margin-top:8px">' + rows + '</div>';
    }
    modal.innerHTML = '<div class="modal-box"><div class="modal-head"><h3 class="h-card">' + trE(meta.name) + '</h3><button class="cart-close" id="exdClose">✕</button></div>' +
      '<span class="ex-muscle-tag" style="margin-bottom:14px;display:inline-block">' + muscleLabel(meta.muscle) + '</span>' + body + '</div>';
    modal.classList.add("open");
    modal.querySelector("#exdClose").addEventListener("click", () => closeModal("exDetailModal"));
    modal.addEventListener("click", e => { if (e.target === modal) closeModal("exDetailModal"); });
  }

  function lineChart(vals, isWeight) {
    if (vals.length < 2) return "";
    const disp = isWeight ? vals.map(v => dispW(v)) : vals;
    const min = Math.min.apply(null, disp), max = Math.max.apply(null, disp), range = (max - min) || 1;
    const W = 600, H = 150, pad = 26;
    const pts = disp.map((v, i) => [pad + i / (disp.length - 1) * (W - 2 * pad), H - pad - (v - min) / range * (H - 2 * pad)]);
    const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    return '<svg class="mini-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><defs><linearGradient id="trkGrad2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#2e7cf6"/><stop offset="100%" stop-color="#00c2ff"/></linearGradient></defs>' +
      '<line class="axis" x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - pad) + '" y2="' + (H - pad) + '"/>' +
      '<path class="ln" d="' + path + '" style="stroke:url(#trkGrad2)"/>' +
      pts.map(p => '<circle class="dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3"/>').join("") +
      '</svg><div class="mono muted small" style="display:flex;justify-content:space-between;margin-top:4px"><span>' + (isWeight ? fmtW(min) : Math.round(min)) + '</span><span>' + (isWeight ? fmtW(max) : Math.round(max)) + '</span></div>';
  }

  /* ==========================================================================
     EXERCISES (Bibliothek + Fortschritt)
     ========================================================================== */
  function renderExercises(p) {
    // Übungen, die schon trainiert wurden, mit PR + zuletzt
    const trained = {};
    S.sessions().forEach(s => (s.exercises || []).forEach(e => {
      if (workingSets(e).length) { trained[e.exId] = Math.max(trained[e.exId] || 0, new Date(s.date).getTime()); }
    }));
    const trainedIds = Object.keys(trained).sort((a, b) => trained[b] - trained[a]);

    let html = '';
    if (trainedIds.length) {
      html += '<h3 class="h-card" style="margin-bottom:12px">' + T("Deine Übungen", "Your exercises") + '</h3>' +
        '<div style="display:grid;gap:8px;margin-bottom:24px">' + trainedIds.map(id => {
          const pr = bestE1RM(id); const meta = exById(id);
          return '<button class="ex-progress-row" data-exdetail="' + id + '">' +
            '<div><div style="font-weight:600;color:var(--text)">' + trE(meta.name) + '</div>' +
            '<div class="muted small">' + muscleLabel(meta.muscle) + '</div></div>' +
            '<div style="text-align:right"><div class="mono" style="color:var(--accent)">' + (pr > 0 ? fmtW(pr) : "–") + '</div>' +
            '<div class="muted small">' + T("bestes e1RM", "best e1RM") + '</div></div></button>';
        }).join("") + '</div>';
    }
    // gesamte Bibliothek nach Muskelgruppe
    html += '<h3 class="h-card" style="margin-bottom:12px">' + T("Übungs-Bibliothek", "Exercise library") + '</h3>';
    Object.keys(MM_TRK_MUSCLES).forEach(m => {
      const list = allExercises().filter(e => e.muscle === m);
      if (!list.length) return;
      html += '<div class="muted small" style="margin:14px 0 6px;text-transform:uppercase;letter-spacing:0.06em">' + muscleLabel(m) + '</div>' +
        '<div style="display:grid;gap:6px">' + list.map(e =>
          '<button class="ex-progress-row" data-exdetail="' + e.id + '"><div style="font-weight:500;color:var(--text)">' + trE(e.name) + '</div>' +
          '<span class="ex-muscle-tag">' + (e.equip || "") + '</span></button>').join("") + '</div>';
    });
    p.innerHTML = html;
    p.querySelectorAll("[data-exdetail]").forEach(b => b.addEventListener("click", () => openExerciseDetail(b.dataset.exdetail)));
  }

  /* ==========================================================================
     INSIGHTS (Wochenvolumen + Sätze pro Muskel)
     ========================================================================== */
  function renderInsights(p) {
    const ss = S.sessions();
    if (!ss.length) { p.innerHTML = emptyState("📈", T("Noch keine Daten. Trainiere ein paar Mal, dann erscheinen hier deine Insights.", "No data yet. Train a few times to see insights."), "workout", T("Training starten", "Start workout")); bindEmpty(p); return; }
    const now = new Date();
    // Volumen der letzten 8 Wochen
    const weeks = [];
    for (let w = 7; w >= 0; w--) {
      const start = new Date(now.getTime() - (w + 1) * 7 * 864e5), end = new Date(now.getTime() - w * 7 * 864e5);
      let vol = 0, cnt = 0;
      ss.forEach(s => { const d = new Date(s.date); if (d >= start && d < end) { vol += sessionVolume(s); cnt++; } });
      weeks.push({ vol, cnt });
    }
    const maxVol = Math.max.apply(null, weeks.map(w => w.vol)) || 1;
    const bars = weeks.map((w, i) => {
      const h = Math.round(w.vol / maxVol * 100);
      return '<div class="ins-bar-col"><div class="ins-bar" style="height:' + Math.max(h, 2) + '%"></div>' +
        '<span class="ins-bar-lbl">' + (i === 7 ? T("jetzt", "now") : "-" + (7 - i) + "w") + '</span></div>';
    }).join("");

    // Sätze pro Muskelgruppe (letzte 7 Tage)
    const weekAgo = new Date(now.getTime() - 7 * 864e5);
    const muscleSets = {};
    ss.filter(s => new Date(s.date) >= weekAgo).forEach(s => (s.exercises || []).forEach(e => {
      const m = exById(e.exId).muscle;
      muscleSets[m] = (muscleSets[m] || 0) + workingSets(e).length;
    }));
    const maxSets = Math.max.apply(null, Object.values(muscleSets).concat([1]));
    const muscleRows = Object.keys(MM_TRK_MUSCLES).filter(m => muscleSets[m]).map(m =>
      '<div class="msl-row"><span class="msl-label">' + muscleLabel(m) + '</span>' +
      '<div class="msl-track"><div class="msl-fill" style="width:' + (muscleSets[m] / maxSets * 100) + '%"></div></div>' +
      '<span class="msl-val mono">' + muscleSets[m] + '</span></div>').join("") ||
      '<p class="muted small">' + T("Diese Woche noch keine Sätze.", "No sets this week yet.") + '</p>';

    // e1RM der Kernübungen
    const core = ["squat", "bench", "deadlift", "ohp"];
    const coreRows = core.map(id => {
      const pr = bestE1RM(id);
      return '<div class="mini-stat"><span>' + trE(exById(id).name) + '</span><strong>' + (pr > 0 ? fmtW(pr) : "–") + '</strong></div>';
    }).join("");

    p.innerHTML =
      '<div class="card" style="margin-bottom:18px"><h3 class="h-card" style="margin-bottom:14px">' + T("Volumen (8 Wochen)", "Volume (8 weeks)") + '</h3>' +
      '<div class="ins-bars">' + bars + '</div></div>' +
      '<div class="card" style="margin-bottom:18px"><h3 class="h-card" style="margin-bottom:14px">' + T("Sätze pro Muskel (7 Tage)", "Sets per muscle (7 days)") + '</h3>' + muscleRows + '</div>' +
      '<div class="card"><h3 class="h-card" style="margin-bottom:14px">' + T("Kraft-Rekorde (e1RM)", "Strength records (e1RM)") + '</h3><div class="mini-stat-grid">' + coreRows + '</div></div>';
  }

  /* ==========================================================================
     HISTORY
     ========================================================================== */
  function renderHistory(p) {
    const ss = S.sessions().slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!ss.length) { p.innerHTML = emptyState("📋", T("Noch keine Einheiten. Starte dein erstes Training!", "No workouts yet. Start your first session!"), "workout", T("Training starten", "Start workout")); bindEmpty(p); return; }
    p.innerHTML = ss.map(s => {
      const vol = sessionVolume(s), prs = countPRsIn(s);
      return '<div class="history-item"><div class="hi-head"><div><h4 style="font-size:1.05rem">' + esc(s.name) + '</h4>' +
        '<span class="hi-date">' + fmtDate(s.date) + '</span></div>' +
        '<div style="display:flex;gap:12px;align-items:center"><button class="btn btn-dark btn-sm" data-repeat="' + s.id + '">↻ ' + T("Wiederholen", "Repeat") + '</button>' +
        '<button class="btn-link-del" data-delsess="' + s.id + '" style="background:none;border:none;color:var(--muted-2);font-size:0.78rem;text-decoration:underline;cursor:pointer">' + T("Löschen", "Delete") + '</button></div></div>' +
        s.exercises.map(e => '<div class="history-ex-line"><span>' + trE(exById(e.exId).name) + '</span>' +
          '<span class="sets">' + e.sets.map(x => (x.warmup ? "" : "") + dispW(x.weight) + "×" + x.reps).join(", ") + '</span></div>').join("") +
        (s.note ? '<p class="muted small" style="margin-top:8px;font-style:italic">„' + esc(s.note) + '"</p>' : '') +
        '<div style="display:flex;gap:18px;margin-top:12px;font-size:0.8rem;color:var(--muted)" class="mono">' +
        '<span>📊 ' + fmtW(vol, 0) + '</span><span>⏱ ' + (s.duration || 0) + ' min</span>' + (prs ? '<span style="color:var(--amber)">🏆 ' + prs + ' PR</span>' : '') + '</div></div>';
    }).join("");
    p.querySelectorAll("[data-repeat]").forEach(b => b.addEventListener("click", () => {
      const s = S.sessions().find(x => x.id === b.dataset.repeat);
      if (s) { repeatSession(s); tab = "workout"; render(); }
    }));
    p.querySelectorAll("[data-delsess]").forEach(b => b.addEventListener("click", () => {
      if (confirm(T("Diese Einheit löschen?", "Delete this workout?"))) { S.saveSessions(S.sessions().filter(s => s.id !== b.dataset.delsess)); render(); }
    }));
  }

  /* ==========================================================================
     REST-TIMER (mit Ton)
     ========================================================================== */
  let restInterval = null, restTotal = 120, restLeft = 0, audioCtx = null;
  function beep() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.frequency.value = 880; g.gain.value = 0.15;
      o.start(); o.stop(audioCtx.currentTime + 0.18);
    } catch (e) {}
    if (navigator.vibrate) navigator.vibrate(200);
  }
  function ensureRestBar() {
    let bar = document.getElementById("restBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "restBar"; bar.className = "rest-timer-bar";
      bar.innerHTML = '<span class="rest-time-display" id="restTime">2:00</span>' +
        '<div class="rest-progress"><div class="rest-progress-fill" id="restFill" style="width:100%"></div></div>' +
        '<button class="btn btn-dark btn-sm" id="restMinus">−15s</button>' +
        '<button class="btn btn-dark btn-sm" id="restPlus">+15s</button>' +
        '<button class="btn btn-primary btn-sm" id="restSkip">' + T("Fertig", "Skip") + '</button>';
      document.body.appendChild(bar);
      bar.querySelector("#restSkip").addEventListener("click", stopRestTimer);
      bar.querySelector("#restPlus").addEventListener("click", () => { restLeft += 15; restTotal += 15; S.saveRestPref(restTotal); tickRest(); });
      bar.querySelector("#restMinus").addEventListener("click", () => { restLeft = Math.max(0, restLeft - 15); S.saveRestPref(Math.max(15, restTotal - 15)); tickRest(); });
    }
    return bar;
  }
  function startRestTimer() {
    ensureRestBar().classList.add("active");
    restTotal = S.restPref() || 120; restLeft = restTotal;
    tickRest();
    clearInterval(restInterval);
    restInterval = setInterval(() => { restLeft--; if (restLeft <= 0) { stopRestTimer(); beep(); } else tickRest(); }, 1000);
  }
  function tickRest() {
    const m = Math.floor(restLeft / 60), s = restLeft % 60;
    const el = document.getElementById("restTime"); if (el) el.textContent = m + ":" + String(s).padStart(2, "0");
    const f = document.getElementById("restFill"); if (f) f.style.width = (restLeft / restTotal * 100) + "%";
  }
  function stopRestTimer() { clearInterval(restInterval); const b = document.getElementById("restBar"); if (b) b.classList.remove("active"); }

  /* ==========================================================================
     CARDIO
     ========================================================================== */
  function renderCardio(p) {
    const distLabel = units() === "imperial" ? "mi" : "km";
    p.innerHTML =
      '<div class="card" style="margin-bottom:20px"><h3 class="h-card" style="margin-bottom:16px">' + T("Cardio-Einheit erfassen", "Log a cardio session") + '</h3>' +
      '<div class="form-row"><div class="field"><label>' + T("Art", "Type") + '</label><select id="cdType">' +
      ['run|🏃 ' + T("Laufen", "Run"), 'bike|🚴 ' + T("Radfahren", "Cycling"), 'row|🚣 ' + T("Rudern", "Rowing"), 'walk|🚶 ' + T("Gehen", "Walking"), 'swim|🏊 ' + T("Schwimmen", "Swimming")]
        .map(o => { const [v, l] = o.split("|"); return '<option value="' + v + '">' + l + '</option>'; }).join("") + '</select></div>' +
      '<div class="field"><label>' + T("Datum", "Date") + '</label><input type="date" id="cdDate" value="' + new Date().toISOString().slice(0, 10) + '"></div></div>' +
      '<div class="form-row"><div class="field"><label>' + T("Distanz", "Distance") + ' (' + distLabel + ')</label><input type="number" inputmode="decimal" id="cdDist" placeholder="' + (units() === "imperial" ? "3.1" : "5.0") + '"></div>' +
      '<div class="field"><label>' + T("Dauer", "Duration") + ' (min)</label><input type="number" inputmode="decimal" id="cdDur" placeholder="28"></div></div>' +
      '<button class="btn btn-primary" id="cdSave">' + T("Speichern", "Save") + '</button>' +
      '<div id="cdPreview" class="muted small" style="margin-top:12px"></div></div>' +
      '<div id="cardioList"></div>';

    const calcPace = () => {
      const dist = parseFloat(document.getElementById("cdDist").value) || 0;
      const dur = parseFloat(document.getElementById("cdDur").value) || 0;
      const prev = document.getElementById("cdPreview");
      if (dist > 0 && dur > 0) {
        const pace = dur / dist, sp = dist / (dur / 60);
        const pm = Math.floor(pace), ps = Math.round((pace - pm) * 60);
        prev.textContent = T("Pace", "Pace") + ": " + pm + ":" + String(ps).padStart(2, "0") + " min/" + distLabel + " · " + T("Tempo", "Speed") + ": " + sp.toFixed(1) + " " + distLabel + "/h";
      } else prev.textContent = "";
    };
    p.querySelector("#cdDist").addEventListener("input", calcPace);
    p.querySelector("#cdDur").addEventListener("input", calcPace);
    p.querySelector("#cdSave").addEventListener("click", () => {
      const dist = parseFloat(document.getElementById("cdDist").value) || 0;
      const dur = parseFloat(document.getElementById("cdDur").value) || 0;
      if (!dist || !dur) { MM.toast(T("Distanz und Dauer angeben", "Enter distance and duration")); return; }
      const distKm = units() === "imperial" ? dist * 1.609344 : dist;
      const list = S.cardio();
      list.push({ id: "c" + Date.now(), date: document.getElementById("cdDate").value, type: document.getElementById("cdType").value, distanceKm: distKm, durationMin: dur });
      S.saveCardio(list);
      MM.toast(T("Cardio gespeichert", "Cardio saved"));
      renderPanel();
    });
    drawCardioList(p.querySelector("#cardioList"), distLabel);
  }
  function drawCardioList(box, distLabel) {
    const list = S.cardio().slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    const icons = { run: "🏃", bike: "🚴", row: "🚣", walk: "🚶", swim: "🏊" };
    if (!list.length) { box.innerHTML = '<p class="muted" style="text-align:center;padding:20px">' + T("Noch keine Cardio-Einheiten.", "No cardio sessions yet.") + '</p>'; return; }
    box.innerHTML = list.map(c => {
      const dist = units() === "imperial" ? c.distanceKm / 1.609344 : c.distanceKm;
      const pace = c.durationMin / dist, pm = Math.floor(pace), ps = Math.round((pace - pm) * 60);
      const sp = dist / (c.durationMin / 60);
      return '<div class="history-item"><div class="hi-head"><div><h4 style="font-size:1rem">' + (icons[c.type] || "🏃") + ' ' + dist.toFixed(2) + ' ' + distLabel + '</h4>' +
        '<span class="hi-date">' + fmtDate(c.date) + '</span></div>' +
        '<button class="btn-link-del" data-delcd="' + c.id + '" style="background:none;border:none;color:var(--muted-2);font-size:0.78rem;text-decoration:underline;cursor:pointer">' + T("Löschen", "Delete") + '</button></div>' +
        '<div style="display:flex;gap:18px;font-size:0.85rem;color:var(--muted)" class="mono"><span>⏱ ' + c.durationMin + ' min</span><span>⚡ ' + pm + ":" + String(ps).padStart(2, "0") + ' /' + distLabel + '</span><span>🚀 ' + sp.toFixed(1) + ' ' + distLabel + '/h</span></div></div>';
    }).join("");
    box.querySelectorAll("[data-delcd]").forEach(b => b.addEventListener("click", () => {
      if (confirm(T("Eintrag löschen?", "Delete entry?"))) { S.saveCardio(S.cardio().filter(c => c.id !== b.dataset.delcd)); renderPanel(); }
    }));
  }

  /* ==========================================================================
     BODY
     ========================================================================== */
  function renderBody(p) {
    p.innerHTML =
      '<div class="card" style="margin-bottom:20px"><h3 class="h-card" style="margin-bottom:16px">' + T("Körpermaße erfassen", "Log body metrics") + '</h3>' +
      '<div class="form-row"><div class="field"><label>' + T("Gewicht", "Weight") + ' (' + massU() + ')</label><input type="number" inputmode="decimal" id="bdW" placeholder="' + (units() === "imperial" ? "180" : "82") + '"></div>' +
      '<div class="field"><label>' + T("Bauchumfang", "Waist") + ' (' + (units() === "imperial" ? "in" : "cm") + ')</label><input type="number" inputmode="decimal" id="bdWaist" placeholder="' + (units() === "imperial" ? "35" : "90") + '"></div></div>' +
      '<div class="form-row"><div class="field"><label>' + T("Körperfett", "Body fat") + ' (%)</label><input type="number" inputmode="decimal" id="bdBf" placeholder="18"></div>' +
      '<div class="field"><label>' + T("Datum", "Date") + '</label><input type="date" id="bdDate" value="' + new Date().toISOString().slice(0, 10) + '"></div></div>' +
      '<button class="btn btn-primary" id="bdSave">' + T("Speichern", "Save") + '</button></div>' +
      '<div id="bodyChart"></div><div id="bodyList"></div>';

    p.querySelector("#bdSave").addEventListener("click", () => {
      const w = parseFloat(document.getElementById("bdW").value) || 0;
      const waist = parseFloat(document.getElementById("bdWaist").value) || 0;
      const bf = parseFloat(document.getElementById("bdBf").value) || 0;
      if (!w && !waist && !bf) { MM.toast(T("Mindestens einen Wert angeben", "Enter at least one value")); return; }
      const list = S.body();
      list.push({ id: "b" + Date.now(), date: document.getElementById("bdDate").value, weightKg: w ? toKg(w) : 0, waistCm: waist ? (units() === "imperial" ? waist / 0.3937 : waist) : 0, bodyfat: bf });
      S.saveBody(list);
      MM.toast(T("Gespeichert", "Saved"));
      renderPanel();
    });
    drawBodyChart(p.querySelector("#bodyChart"));
    drawBodyList(p.querySelector("#bodyList"));
  }
  function drawBodyChart(box) {
    const list = S.body().filter(b => b.weightKg > 0).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    if (list.length < 2) { box.innerHTML = ""; return; }
    box.innerHTML = '<div class="card" style="margin-bottom:20px"><h4 class="h-card" style="margin-bottom:6px">' + T("Gewichtsverlauf", "Weight trend") + '</h4>' +
      lineChart(list.map(b => b.weightKg), true) + '</div>';
  }
  function drawBodyList(box) {
    const list = S.body().slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!list.length) { box.innerHTML = '<p class="muted" style="text-align:center;padding:20px">' + T("Noch keine Einträge.", "No entries yet.") + '</p>'; return; }
    box.innerHTML = list.map(b => '<div class="history-ex-line" style="padding:14px 18px;background:var(--card);border:1px solid var(--line);border-radius:10px;margin-bottom:8px">' +
      '<span class="mono" style="font-size:0.8rem;color:var(--accent-2)">' + fmtShort(b.date) + '</span>' +
      '<span class="sets">' + [b.weightKg ? fmtW(b.weightKg) : null, b.waistCm ? (units() === "imperial" ? (b.waistCm * 0.3937).toFixed(1) + " in" : b.waistCm.toFixed(0) + " cm") : null, b.bodyfat ? b.bodyfat + " %" : null].filter(Boolean).join(" · ") +
      ' <button class="btn-link-del" data-delbd="' + b.id + '" style="background:none;border:none;color:var(--muted-2);font-size:0.75rem;text-decoration:underline;cursor:pointer;margin-left:10px">✕</button></span></div>').join("");
    box.querySelectorAll("[data-delbd]").forEach(btn => btn.addEventListener("click", () => {
      S.saveBody(S.body().filter(b => b.id !== btn.dataset.delbd)); renderPanel();
    }));
  }

  /* ==========================================================================
     TEMPLATES
     ========================================================================== */
  function renderTemplates(p) {
    const custom = S.templates();
    p.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px">' +
      '<h3 class="h-card">' + T("Trainingspläne", "Routines") + '</h3>' +
      '<button class="btn btn-primary btn-sm" id="newTpl">+ ' + T("Eigenen Plan erstellen", "Create routine") + '</button></div>' +
      '<p class="muted" style="margin-bottom:18px;font-size:0.92rem">' + T("Vorgefertigte MaleMetrix-Pläne (3-Tage-System für wenig Zeit) plus deine eigenen.", "Ready-made MaleMetrix routines (3-day system for busy men) plus your own.") + '</p>' +
      '<div class="grid-3">' +
      MM_TRK_TEMPLATES.map(t => tplCard(t, false)).join("") +
      custom.map(t => tplCard(t, true)).join("") +
      '</div>';
    p.querySelector("#newTpl").addEventListener("click", openTemplateBuilder);
    p.querySelectorAll("[data-starttpl]").forEach(b => b.addEventListener("click", () => { startSession(b.dataset.starttpl); }));
    p.querySelectorAll("[data-deltpl]").forEach(b => b.addEventListener("click", () => {
      if (confirm(T("Plan löschen?", "Delete routine?"))) { S.saveTemplates(S.templates().filter(t => t.id !== b.dataset.deltpl)); renderPanel(); }
    }));
  }
  function tplCard(t, isCustom) {
    return '<div class="template-card"><div style="display:flex;justify-content:space-between;align-items:start"><h4>' + trE(t.name) + '</h4>' +
      (isCustom ? '<button class="btn-link-del" data-deltpl="' + t.id + '" style="background:none;border:none;color:var(--muted-2);font-size:0.75rem;text-decoration:underline;cursor:pointer">✕</button>' : '') + '</div>' +
      '<div style="margin:8px 0 14px">' + t.exIds.map(id => '<div class="template-ex">· ' + trE(exById(id).name) + '</div>').join("") + '</div>' +
      '<button class="btn btn-dark btn-sm btn-block" data-starttpl="' + t.id + '">' + T("Starten", "Start") + '</button></div>';
  }
  function openTemplateBuilder() {
    let modal = document.getElementById("tplModal");
    if (!modal) { modal = document.createElement("div"); modal.id = "tplModal"; modal.className = "modal-overlay"; document.body.appendChild(modal); }
    const chosen = [];
    const redraw = () => {
      modal.querySelector("#tplChosen").innerHTML = chosen.length ? chosen.map((id, i) => '<span class="chip" style="margin:3px">' + trE(exById(id).name) + ' <button data-rm="' + i + '" style="background:none;border:none;color:var(--muted);cursor:pointer">✕</button></span>').join("") : '<span class="muted small">' + T("Noch keine Übung gewählt", "No exercise chosen yet") + '</span>';
      modal.querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", () => { chosen.splice(+b.dataset.rm, 1); redraw(); }));
    };
    modal.innerHTML = '<div class="modal-box"><div class="modal-head"><h3 class="h-card">' + T("Eigenen Plan erstellen", "Create routine") + '</h3><button class="cart-close" id="tplClose">✕</button></div>' +
      '<div class="field"><label>' + T("Name des Plans", "Routine name") + '</label><input type="text" id="tplName" placeholder="' + T("z. B. Oberkörper Dienstag", "e.g. Upper Body Tuesday") + '"></div>' +
      '<div class="field"><label>' + T("Übungen", "Exercises") + '</label><div id="tplChosen" style="margin-bottom:10px"></div>' +
      '<select id="tplAdd"><option value="">' + T("Übung hinzufügen…", "Add exercise…") + '</option>' +
      allExercises().map(e => '<option value="' + e.id + '">' + trE(e.name) + ' (' + muscleLabel(e.muscle) + ')</option>').join("") + '</select></div>' +
      '<button class="btn btn-primary btn-block" id="tplSave" style="margin-top:8px">' + T("Plan speichern", "Save routine") + '</button></div>';
    modal.classList.add("open");
    redraw();
    modal.querySelector("#tplClose").addEventListener("click", () => modal.classList.remove("open"));
    modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("open"); });
    modal.querySelector("#tplAdd").addEventListener("change", e => { if (e.target.value) { chosen.push(e.target.value); e.target.value = ""; redraw(); } });
    modal.querySelector("#tplSave").addEventListener("click", () => {
      const name = modal.querySelector("#tplName").value.trim();
      if (!name || !chosen.length) { MM.toast(T("Name und mind. 1 Übung nötig", "Need a name and at least 1 exercise")); return; }
      const list = S.templates();
      list.push({ id: "t" + Date.now(), name: { de: name, en: name }, exIds: chosen.slice() });
      S.saveTemplates(list);
      modal.classList.remove("open");
      MM.toast(T("Plan gespeichert", "Routine saved"));
      renderPanel();
    });
  }

  /* ---------- Empty-State-Helfer ---------- */
  function emptyState(icon, text, gotoTab, btn) {
    return '<div class="empty-state"><div class="big">' + icon + '</div><p style="margin-bottom:18px">' + text + '</p>' +
      '<button class="btn btn-primary" data-goto="' + gotoTab + '">' + btn + '</button></div>';
  }
  function bindEmpty(p) { p.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => { tab = b.dataset.goto; render(); })); }

  /* ---------- Export / Import ---------- */
  window.MM_TRK_EXPORT = function () {
    const data = { sessions: S.sessions(), cardio: S.cardio(), body: S.body(), templates: S.templates(), customEx: S.customEx() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "malemetrix-tracker-" + new Date().toISOString().slice(0, 10) + ".json"; a.click();
  };
  window.MM_TRK_IMPORT = function (file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (d.sessions) S.saveSessions(d.sessions);
        if (d.cardio) S.saveCardio(d.cardio);
        if (d.body) S.saveBody(d.body);
        if (d.templates) S.saveTemplates(d.templates);
        if (d.customEx) S.saveCustomEx(d.customEx);
        MM.toast(T("Daten importiert", "Data imported"));
        render();
      } catch (e) { MM.toast(T("Ungültige Datei", "Invalid file")); }
    };
    reader.readAsText(file);
  };

  /* Sprachwechsel */
  document.addEventListener("mm:langchange", render);
  document.addEventListener("mm:themechange", () => { if (tab === "body" || tab === "insights" || tab === "exercises") renderPanel(); });

  render();

  const expBtn = document.getElementById("trkExport"); if (expBtn) expBtn.addEventListener("click", MM_TRK_EXPORT);
  const impInput = document.getElementById("trkImport"); if (impInput) impInput.addEventListener("change", e => { if (e.target.files[0]) MM_TRK_IMPORT(e.target.files[0]); });
  const unitBtns = document.querySelectorAll("#trkUnitToggle button");
  unitBtns.forEach(b => {
    if (b.dataset.u === units()) b.classList.add("active");
    b.addEventListener("click", () => { setUnits(b.dataset.u); unitBtns.forEach(x => x.classList.toggle("active", x.dataset.u === units())); render(); });
  });
})();
