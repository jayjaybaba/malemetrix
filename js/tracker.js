/* ==========================================================================
   MaleMetrix Tracker — voll funktionsfähige Fitness-App (Training, Cardio,
   Körpermaße, Pläne). Alles lokal im Browser, DE/EN, metrisch/imperial.
   ========================================================================== */

(function () {
  "use strict";

  const app = document.getElementById("trkApp");
  if (!app) return;

  const LANG = () => (window.MM && MM.i18n ? MM.i18n.lang : "de");
  const tr = (o) => (o && (o[LANG()] || o.de)) || "";
  const KG = 2.2046226218;
  const units = () => { try { return localStorage.getItem("mm_units") || "metric"; } catch (e) { return "metric"; } };
  const setUnits = (u) => { try { localStorage.setItem("mm_units", u); } catch (e) {} };
  const massU = () => units() === "imperial" ? "lb" : "kg";
  const dispW = (kg) => units() === "imperial" ? Math.round(kg * KG * 10) / 10 : kg;       // Zahl
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
    clearActive: () => MM.store.remove("trk_active")
  };

  const T = (de, en) => tr({ de, en });

  function allExercises() { return MM_TRK_EXERCISES.concat(S.customEx()); }
  function exById(id) { return allExercises().find(e => e.id === id) || { id, muscle: "other", name: { de: id, en: id } }; }
  function muscleLabel(m) { return tr(MM_TRK_MUSCLES[m] || { de: m, en: m }); }
  const e1RM = (w, r) => r <= 0 ? 0 : w * (1 + r / 30);

  function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(LANG() === "de" ? "de-DE" : "en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }
  function fmtShort(iso) { return new Date(iso).toLocaleDateString(LANG() === "de" ? "de-DE" : "en-US", { day: "2-digit", month: "2-digit", year: "2-digit" }); }

  /* ---------- Verlaufs-Helfer ---------- */
  function lastSetsFor(exId, exclId) {
    const ss = S.sessions().slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const s of ss) {
      if (s.id === exclId) continue;
      const ex = (s.exercises || []).find(e => e.exId === exId);
      if (ex && ex.sets.some(x => x.done)) return ex.sets.filter(x => x.done);
    }
    return null;
  }
  function bestE1RM(exId) {
    let best = 0;
    S.sessions().forEach(s => (s.exercises || []).forEach(e => {
      if (e.exId === exId) e.sets.forEach(x => { if (x.done) best = Math.max(best, e1RM(x.weight, x.reps)); });
    }));
    return best;
  }
  function sessionVolume(s) {
    let v = 0; (s.exercises || []).forEach(e => e.sets.forEach(x => { if (x.done) v += (x.weight || 0) * (x.reps || 0); })); return v;
  }
  function countPRsIn(session) {
    // PRs = Sätze, deren e1RM den bisherigen Rekord (vor dieser Session) übertrafen
    let prs = 0;
    const before = {};
    S.sessions().filter(s => new Date(s.date) < new Date(session.date)).forEach(s =>
      (s.exercises || []).forEach(e => e.sets.forEach(x => { if (x.done) before[e.exId] = Math.max(before[e.exId] || 0, e1RM(x.weight, x.reps)); })));
    (session.exercises || []).forEach(e => {
      let localBest = before[e.exId] || 0;
      e.sets.forEach(x => { if (x.done) { const v = e1RM(x.weight, x.reps); if (v > localBest) { prs++; localBest = v; } } });
    });
    return prs;
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
    // Streak (Wochen in Folge mit ≥1 Training)
    let streak = 0;
    for (let w = 0; w < 52; w++) {
      const start = new Date(now.getTime() - (w + 1) * 7 * 864e5), end = new Date(now.getTime() - w * 7 * 864e5);
      if (ss.some(s => { const d = new Date(s.date); return d >= start && d < end; })) streak++;
      else if (w > 0) break;
    }
    const volStr = totalVol >= 1000 ? (units() === "imperial" ? Math.round(totalVol * KG / 1000) + "k lb" : Math.round(totalVol / 1000) + "k kg") : fmtW(totalVol, 0);
    return '<div class="stat-grid-tracker">' +
      stat(ss.length, T("Einheiten gesamt", "Total workouts")) +
      stat(thisWeek, T("Diese Woche", "This week")) +
      stat(volStr, T("Gesamtvolumen", "Total volume")) +
      stat(totalPRs, T("Persönliche Rekorde", "Personal records")) +
      '</div>';
  }
  function stat(num, label) { return '<div class="tstat"><div class="tstat-num text-grad">' + num + '</div><div class="tstat-label">' + label + '</div></div>'; }

  function renderPanel() {
    const p = document.getElementById("trkPanel");
    if (tab === "workout") renderWorkout(p);
    else if (tab === "history") renderHistory(p);
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
      p.innerHTML =
        '<div class="card" style="text-align:center;padding:40px 24px;margin-bottom:24px">' +
        '<div style="font-size:2.4rem;margin-bottom:12px">🏋️</div>' +
        '<h3 class="h-card" style="margin-bottom:8px">' + T("Bereit fürs Training?", "Ready to train?") + '</h3>' +
        '<p class="muted" style="margin-bottom:22px;max-width:420px;margin-left:auto;margin-right:auto">' + T("Starte eine leere Einheit oder wähle einen Plan. Dein letztes Mal wird automatisch vorgeschlagen.", "Start an empty session or pick a routine. Your last time is auto-suggested.") + '</p>' +
        '<button class="btn btn-primary btn-lg" id="startEmpty">' + T("Leere Einheit starten", "Start empty workout") + '</button>' +
        '</div>' +
        '<h3 class="h-card" style="margin-bottom:14px">' + T("Schnellstart mit Plan", "Quick start with a routine") + '</h3>' +
        '<div class="grid-3">' + templates.map(tpl =>
          '<div class="template-card"><h4>' + tr(tpl.name) + '</h4>' +
          '<div style="margin:8px 0 14px">' + tpl.exIds.map(id => '<div class="template-ex">· ' + tr(exById(id).name) + '</div>').join("") + '</div>' +
          '<button class="btn btn-dark btn-sm btn-block" data-starttpl="' + tpl.id + '">' + T("Starten", "Start") + '</button></div>'
        ).join("") + '</div>';

      p.querySelector("#startEmpty").addEventListener("click", () => startSession(null));
      p.querySelectorAll("[data-starttpl]").forEach(b => b.addEventListener("click", () => startSession(b.dataset.starttpl)));
      return;
    }

    // Aktive Einheit
    const dur = Math.round((Date.now() - active.startedAt) / 60000);
    let html = '<div class="card" style="margin-bottom:20px"><div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">' +
      '<div><input type="text" id="sessName" value="' + (active.name || "").replace(/"/g, "&quot;") + '" style="background:none;border:none;font-family:var(--font-display);font-size:1.3rem;font-weight:700;color:var(--text);padding:0;width:auto"></div>' +
      '<div style="display:flex;gap:10px;align-items:center"><span class="mono muted" style="font-size:0.85rem">⏱ ' + dur + ' min</span>' +
      '<button class="btn btn-ghost btn-sm" id="discardSess">' + T("Verwerfen", "Discard") + '</button>' +
      '<button class="btn btn-primary btn-sm" id="finishSess">' + T("Beenden", "Finish") + '</button></div></div></div>';

    if (!active.exercises.length) {
      html += '<div class="empty-state"><div class="big">➕</div><p>' + T("Noch keine Übung. Füge deine erste hinzu.", "No exercise yet. Add your first.") + '</p></div>';
    }

    active.exercises.forEach((ex, ei) => {
      const meta = exById(ex.exId);
      const prev = lastSetsFor(ex.exId, active.id);
      const pr = bestE1RM(ex.exId);
      html += '<div class="card" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">' +
        '<div><h4 style="font-size:1.05rem">' + tr(meta.name) + '</h4><span class="ex-muscle-tag">' + muscleLabel(meta.muscle) + '</span></div>' +
        '<button class="btn-link-del" data-delex="' + ei + '" style="background:none;border:none;color:var(--muted-2);font-size:0.8rem;text-decoration:underline;cursor:pointer">' + T("Entfernen", "Remove") + '</button></div>' +
        '<table class="set-table"><thead><tr><th>' + T("Satz", "Set") + '</th><th>' + T("Letztes Mal", "Previous") + '</th><th>' + massU() + '</th><th>' + T("Wdh.", "Reps") + '</th><th>✓</th></tr></thead><tbody>';
      ex.sets.forEach((set, si) => {
        const prevSet = prev && prev[si] ? (dispW(prev[si].weight) + (units() === "imperial" ? "" : "") + " × " + prev[si].reps) : "—";
        const isPR = set.done && set.weight > 0 && e1RM(set.weight, set.reps) >= pr && e1RM(set.weight, set.reps) > 0 && pr > 0 && Math.abs(e1RM(set.weight, set.reps) - pr) < 0.01;
        html += '<tr data-set="' + ei + '_' + si + '"><td>' + (si + 1) + (isPR ? ' <span class="pr-badge">PR</span>' : '') + '</td>' +
          '<td class="prev-cell">' + prevSet + '</td>' +
          '<td><input type="number" inputmode="decimal" class="set-w" value="' + (set.weight ? dispW(set.weight) : "") + '" placeholder="' + (prev && prev[si] ? dispW(prev[si].weight) : "0") + '" data-ei="' + ei + '" data-si="' + si + '"></td>' +
          '<td><input type="number" inputmode="numeric" class="set-r" value="' + (set.reps || "") + '" placeholder="' + (prev && prev[si] ? prev[si].reps : "0") + '" data-ei="' + ei + '" data-si="' + si + '"></td>' +
          '<td><button class="set-done-btn' + (set.done ? " done" : "") + '" data-done="' + ei + '_' + si + '">✓</button></td></tr>';
      });
      html += '</tbody></table>' +
        '<div style="display:flex;gap:10px;margin-top:12px"><button class="btn btn-dark btn-sm" data-addset="' + ei + '">+ ' + T("Satz", "Set") + '</button>' +
        (prev ? '<span class="muted small" style="align-self:center">' + T("Tipp: Schlag dein letztes Mal", "Tip: beat your last time") + '</span>' : '') + '</div></div>';
    });

    html += '<button class="btn btn-ghost btn-block" id="addExercise" style="margin-top:8px">+ ' + T("Übung hinzufügen", "Add exercise") + '</button>';
    p.innerHTML = html;

    // Events
    p.querySelector("#sessName").addEventListener("change", e => { active.name = e.target.value; S.saveActive(active); });
    p.querySelector("#discardSess").addEventListener("click", () => {
      if (confirm(T("Einheit verwerfen? Daten gehen verloren.", "Discard workout? Data will be lost."))) { S.clearActive(); render(); }
    });
    p.querySelector("#finishSess").addEventListener("click", finishSession);
    p.querySelector("#addExercise").addEventListener("click", openExercisePicker);
    p.querySelectorAll("[data-delex]").forEach(b => b.addEventListener("click", () => {
      active.exercises.splice(+b.dataset.delex, 1); S.saveActive(active); renderPanel();
    }));
    p.querySelectorAll("[data-addset]").forEach(b => b.addEventListener("click", () => {
      const ex = active.exercises[+b.dataset.addset];
      const last = ex.sets[ex.sets.length - 1];
      ex.sets.push({ weight: last ? last.weight : 0, reps: last ? last.reps : 0, done: false });
      S.saveActive(active); renderPanel();
    }));
    p.querySelectorAll(".set-w").forEach(inp => inp.addEventListener("input", () => {
      active.exercises[+inp.dataset.ei].sets[+inp.dataset.si].weight = toKg(parseFloat(inp.value) || 0); S.saveActive(active);
    }));
    p.querySelectorAll(".set-r").forEach(inp => inp.addEventListener("input", () => {
      active.exercises[+inp.dataset.ei].sets[+inp.dataset.si].reps = parseInt(inp.value) || 0; S.saveActive(active);
    }));
    p.querySelectorAll("[data-done]").forEach(b => b.addEventListener("click", () => {
      const [ei, si] = b.dataset.done.split("_").map(Number);
      const set = active.exercises[ei].sets[si];
      set.done = !set.done;
      S.saveActive(active);
      if (set.done) { startRestTimer(); renderPanel(); }
      else renderPanel();
    }));
  }

  function startSession(tplId) {
    const tpl = tplId ? MM_TRK_TEMPLATES.concat(S.templates()).find(t => t.id === tplId) : null;
    const active = {
      id: "s" + Date.now(),
      startedAt: Date.now(),
      date: new Date().toISOString(),
      name: tpl ? tr(tpl.name) : T("Training " + fmtShort(new Date().toISOString()), "Workout " + fmtShort(new Date().toISOString())),
      exercises: tpl ? tpl.exIds.map(id => ({ exId: id, sets: [{ weight: 0, reps: 0, done: false }] })) : []
    };
    S.saveActive(active);
    render();
  }

  function finishSession() {
    const active = S.active();
    if (!active) return;
    // nur Übungen mit ≥1 erledigtem Satz behalten
    active.exercises = active.exercises.map(e => ({ ...e, sets: e.sets.filter(s => s.done) })).filter(e => e.sets.length);
    if (!active.exercises.length) {
      if (!confirm(T("Keine erledigten Sätze. Trotzdem ohne Speichern beenden?", "No completed sets. End without saving?"))) return;
      S.clearActive(); render(); return;
    }
    active.duration = Math.round((Date.now() - active.startedAt) / 60000);
    const sessions = S.sessions();
    sessions.push({ id: active.id, date: active.date, name: active.name, exercises: active.exercises, duration: active.duration });
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
    const draw = (filter) => {
      const q = (filter || "").toLowerCase();
      const list = allExercises().filter(e => tr(e.name).toLowerCase().includes(q) || muscleLabel(e.muscle).toLowerCase().includes(q));
      modal.querySelector(".ex-picker-list").innerHTML = list.map(e =>
        '<button class="ex-pick" data-pick="' + e.id + '"><span>' + tr(e.name) + '</span><span class="ex-muscle-tag">' + muscleLabel(e.muscle) + '</span></button>'
      ).join("") || '<p class="muted" style="text-align:center;padding:20px">' + T("Nichts gefunden.", "Nothing found.") + '</p>';
      modal.querySelectorAll("[data-pick]").forEach(b => b.addEventListener("click", () => {
        const active = S.active();
        active.exercises.push({ exId: b.dataset.pick, sets: [{ weight: 0, reps: 0, done: false }] });
        S.saveActive(active); closeModal(); renderPanel();
      }));
    };
    modal.innerHTML = '<div class="modal-box"><div class="modal-head"><h3 class="h-card">' + T("Übung wählen", "Choose exercise") + '</h3>' +
      '<button class="cart-close" id="exClose">✕</button></div>' +
      '<input type="text" class="ex-picker-search" id="exSearch" placeholder="' + T("Suchen oder eigene anlegen…", "Search or create your own…") + '">' +
      '<div class="ex-picker-list"></div>' +
      '<button class="btn btn-dark btn-block btn-sm" id="addCustomEx" style="margin-top:14px">+ ' + T("Eigene Übung anlegen", "Create custom exercise") + '</button></div>';
    modal.classList.add("open");
    draw("");
    modal.querySelector("#exClose").addEventListener("click", closeModal);
    modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
    const search = modal.querySelector("#exSearch");
    search.addEventListener("input", () => draw(search.value));
    modal.querySelector("#addCustomEx").addEventListener("click", () => {
      const name = search.value.trim() || prompt(T("Name der Übung:", "Exercise name:"));
      if (!name) return;
      const cs = S.customEx();
      const id = "cx" + Date.now();
      cs.push({ id, muscle: "other", name: { de: name, en: name } });
      S.saveCustomEx(cs);
      const active = S.active();
      active.exercises.push({ exId: id, sets: [{ weight: 0, reps: 0, done: false }] });
      S.saveActive(active); closeModal(); renderPanel();
    });
  }
  function closeModal() { const m = document.getElementById("exModal"); if (m) m.classList.remove("open"); }

  /* ==========================================================================
     REST-TIMER
     ========================================================================== */
  let restInterval = null, restTotal = 120, restLeft = 0;
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
      bar.querySelector("#restPlus").addEventListener("click", () => { restLeft += 15; restTotal += 15; tickRest(); });
      bar.querySelector("#restMinus").addEventListener("click", () => { restLeft = Math.max(0, restLeft - 15); tickRest(); });
    }
    return bar;
  }
  function startRestTimer() {
    ensureRestBar().classList.add("active");
    restTotal = 120; restLeft = 120;
    tickRest();
    clearInterval(restInterval);
    restInterval = setInterval(() => { restLeft--; if (restLeft <= 0) { stopRestTimer(); if (navigator.vibrate) navigator.vibrate(200); } else tickRest(); }, 1000);
  }
  function tickRest() {
    const m = Math.floor(restLeft / 60), s = restLeft % 60;
    const el = document.getElementById("restTime"); if (el) el.textContent = m + ":" + String(s).padStart(2, "0");
    const f = document.getElementById("restFill"); if (f) f.style.width = (restLeft / restTotal * 100) + "%";
  }
  function stopRestTimer() { clearInterval(restInterval); const b = document.getElementById("restBar"); if (b) b.classList.remove("active"); }

  /* ==========================================================================
     HISTORY
     ========================================================================== */
  function renderHistory(p) {
    const ss = S.sessions().slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!ss.length) { p.innerHTML = emptyState("📋", T("Noch keine Einheiten. Starte dein erstes Training!", "No workouts yet. Start your first session!"), "workout", T("Training starten", "Start workout")); bindEmpty(p); return; }
    p.innerHTML = ss.map(s => {
      const vol = sessionVolume(s), prs = countPRsIn(s);
      return '<div class="history-item"><div class="hi-head"><div><h4 style="font-size:1.05rem">' + s.name + '</h4>' +
        '<span class="hi-date">' + fmtDate(s.date) + '</span></div>' +
        '<button class="btn-link-del" data-delsess="' + s.id + '" style="background:none;border:none;color:var(--muted-2);font-size:0.78rem;text-decoration:underline;cursor:pointer">' + T("Löschen", "Delete") + '</button></div>' +
        s.exercises.map(e => '<div class="history-ex-line"><span>' + tr(exById(e.exId).name) + '</span>' +
          '<span class="sets">' + e.sets.map(x => dispW(x.weight) + "×" + x.reps).join(", ") + '</span></div>').join("") +
        '<div style="display:flex;gap:18px;margin-top:12px;font-size:0.8rem;color:var(--muted)" class="mono">' +
        '<span>📊 ' + fmtW(vol, 0) + '</span><span>⏱ ' + (s.duration || 0) + ' min</span>' + (prs ? '<span style="color:var(--amber)">🏆 ' + prs + ' PR</span>' : '') + '</div></div>';
    }).join("");
    p.querySelectorAll("[data-delsess]").forEach(b => b.addEventListener("click", () => {
      if (confirm(T("Diese Einheit löschen?", "Delete this workout?"))) { S.saveSessions(S.sessions().filter(s => s.id !== b.dataset.delsess)); render(); }
    }));
  }

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
    const vals = list.map(b => dispW(b.weightKg));
    const min = Math.min(...vals), max = Math.max(...vals), range = (max - min) || 1;
    const W = 600, H = 160, pad = 30;
    const pts = vals.map((v, i) => [pad + i / (vals.length - 1) * (W - 2 * pad), H - pad - (v - min) / range * (H - 2 * pad)]);
    const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    box.innerHTML = '<div class="card" style="margin-bottom:20px"><h4 class="h-card" style="margin-bottom:6px">' + T("Gewichtsverlauf", "Weight trend") + '</h4>' +
      '<p class="muted small" style="margin-bottom:10px">' + min.toFixed(1) + '–' + max.toFixed(1) + ' ' + massU() + '</p>' +
      '<svg class="mini-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><defs><linearGradient id="trkGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#2e7cf6"/><stop offset="100%" stop-color="#00c2ff"/></linearGradient></defs>' +
      '<line class="axis" x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - pad) + '" y2="' + (H - pad) + '"/>' +
      '<path class="ln" d="' + path + '"/>' +
      pts.map(p => '<circle class="dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3"/>').join("") +
      '</svg></div>';
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
    return '<div class="template-card"><div style="display:flex;justify-content:space-between;align-items:start"><h4>' + tr(t.name) + '</h4>' +
      (isCustom ? '<button class="btn-link-del" data-deltpl="' + t.id + '" style="background:none;border:none;color:var(--muted-2);font-size:0.75rem;text-decoration:underline;cursor:pointer">✕</button>' : '') + '</div>' +
      '<div style="margin:8px 0 14px">' + t.exIds.map(id => '<div class="template-ex">· ' + tr(exById(id).name) + '</div>').join("") + '</div>' +
      '<button class="btn btn-dark btn-sm btn-block" data-starttpl="' + t.id + '">' + T("Starten", "Start") + '</button></div>';
  }
  function openTemplateBuilder() {
    let modal = document.getElementById("tplModal");
    if (!modal) { modal = document.createElement("div"); modal.id = "tplModal"; modal.className = "modal-overlay"; document.body.appendChild(modal); }
    const chosen = [];
    const redraw = () => {
      modal.querySelector("#tplChosen").innerHTML = chosen.length ? chosen.map((id, i) => '<span class="chip" style="margin:3px">' + tr(exById(id).name) + ' <button data-rm="' + i + '" style="background:none;border:none;color:var(--muted);cursor:pointer">✕</button></span>').join("") : '<span class="muted small">' + T("Noch keine Übung gewählt", "No exercise chosen yet") + '</span>';
      modal.querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", () => { chosen.splice(+b.dataset.rm, 1); redraw(); }));
    };
    modal.innerHTML = '<div class="modal-box"><div class="modal-head"><h3 class="h-card">' + T("Eigenen Plan erstellen", "Create routine") + '</h3><button class="cart-close" id="tplClose">✕</button></div>' +
      '<div class="field"><label>' + T("Name des Plans", "Routine name") + '</label><input type="text" id="tplName" placeholder="' + T("z. B. Oberkörper Dienstag", "e.g. Upper Body Tuesday") + '"></div>' +
      '<div class="field"><label>' + T("Übungen", "Exercises") + '</label><div id="tplChosen" style="margin-bottom:10px"></div>' +
      '<select id="tplAdd"><option value="">' + T("Übung hinzufügen…", "Add exercise…") + '</option>' +
      allExercises().map(e => '<option value="' + e.id + '">' + tr(e.name) + ' (' + muscleLabel(e.muscle) + ')</option>').join("") + '</select></div>' +
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
  document.addEventListener("mm:themechange", () => { if (tab === "body") renderPanel(); });

  render();

  // Toolbar-Buttons (Export/Import/Einheit) verdrahten, falls vorhanden
  const expBtn = document.getElementById("trkExport"); if (expBtn) expBtn.addEventListener("click", MM_TRK_EXPORT);
  const impInput = document.getElementById("trkImport"); if (impInput) impInput.addEventListener("change", e => { if (e.target.files[0]) MM_TRK_IMPORT(e.target.files[0]); });
  const unitBtns = document.querySelectorAll("#trkUnitToggle button");
  unitBtns.forEach(b => {
    if (b.dataset.u === units()) b.classList.add("active");
    b.addEventListener("click", () => { setUnits(b.dataset.u); unitBtns.forEach(x => x.classList.toggle("active", x.dataset.u === units())); render(); });
  });
})();
