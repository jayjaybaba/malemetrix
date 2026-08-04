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
    /* invalidateIndex(): der Übungs-Index unten cacht den Bestand. Eine neue
       eigene Übung muss ihn verwerfen, sonst wird sie nicht gefunden. */
    saveCustomEx: (v) => { MM.store.set("trk_custom_ex", v); invalidateIndex(); },
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
    /* Schlaf-Log: [{id, date, dur(h), quality 1-5, latency, waking, morning 1-5, rhr?, hrv?, note?}] */
    sleep: () => MM.store.get("trk_sleep", []),
    saveSleep: (v) => MM.store.set("trk_sleep", v),
    restPref: () => MM.store.get("trk_rest_sec", 120),
    saveRestPref: (v) => MM.store.set("trk_rest_sec", v),
    barPref: () => MM.store.get("trk_bar_kg", (window.MM_TRK_PLATES || {}).barKg || 20),
    saveBarPref: (v) => MM.store.set("trk_bar_kg", v)
  };

  const T = (de, en) => tr({ de, en });

  /* Selbst angelegte Übungsnamen landen in HTML — deshalb maskieren. */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ==========================================================================
     ÜBUNGSBESTAND
     --------------------------------------------------------------------------
     Drei Quellen, absichtlich getrennt:

       1. KURATIERT  (js/tracker-data.js)      — 49 Übungen, immer geladen.
          Das sind die, die das MaleMetrix-Programm tatsächlich vorgibt.
       2. BIBLIOTHEK (js/tracker-library.js)   — 825 weitere, NACHGELADEN.
       3. EIGENE     (localStorage)            — was der Nutzer selbst anlegt.

     Die Bibliothek hängt nicht im <head>, weil sie 247 KB wiegt. Wer nur
     Sätze loggen will, lädt sie nie. Erst wer sucht oder stöbert, holt sie —
     einmal pro Seitenaufruf, danach liegt sie im Speicher.
     ========================================================================== */
  /* Die Fotos liegen im eigenen Repository (img/uebungen/), nicht auf einem
     fremden CDN. Drei Gründe, alle drei wichtiger als die 13 MB:

       · Ein fremder Bild-Host bekäme die IP-Adresse jedes Besuchers. Diese
         Seite hostet ihre Schriften genau deshalb lokal — siehe
         datenschutz.html, Abschnitt 8. Bei Fotos anders zu verfahren wäre
         inkonsequent und auskunftspflichtig.
       · Der Service Worker fasst fremde Origins bewusst nicht an
         (sw.js: url.origin !== location.origin → return). Vom CDN geladene
         Bilder landen also NIE im Offline-Cache — lokale schon, automatisch.
         Der Tracker wirbt mit Offline-Betrieb; das muss auch hier gelten.
       · Ein Kernfeature soll nicht an einem Dienst hängen, über den wir
         nicht bestimmen.

     320 px WebP, Ø 7,6 KB. Neu bauen: tools-dev/build-exercise-images.py */
  const LIB_BASE = "img/uebungen/";

  function exImg(srcSlug, n) { return srcSlug ? LIB_BASE + srcSlug + "-" + (n || 0) + ".webp" : ""; }

  /* Der Tracker läuft ausdrücklich offline — die Fotos kommen aber aus dem
     Netz. Ohne Verbindung zeigte der Browser sonst überall das Symbol für
     "kaputtes Bild". Stattdessen fällt die Kachel still auf ihre leere Form
     zurück: die Übung bleibt benutzbar, nur ohne Foto.

     Ein einziger Lauscher in der Capture-Phase, weil error-Ereignisse nicht
     aufsteigen — so gilt er auch für alles, was später gezeichnet wird. */
  document.addEventListener("error", (ev) => {
    const el = ev.target;
    if (!el || el.tagName !== "IMG") return;
    if (el.classList.contains("mm-anim-f")) {
      el.removeAttribute("src");
      const box = el.closest(".mm-anim");
      if (box) { box.classList.add("ex-thumb-empty"); box.classList.remove("is-playing"); }
      return;
    }
    if (el.classList.contains("ex-thumb") || el.classList.contains("ex-pick-thumb")) {
      el.removeAttribute("src");
      el.classList.add("ex-thumb-empty");
    }
  }, true);

  /* ==========================================================================
     BEWEGUNG STATT STANDBILD
     --------------------------------------------------------------------------
     Die Quelle liefert je Übung ZWEI Fotos — und zwar nicht zwei Ansichten,
     sondern Anfang und Ende derselben Bewegung: Hantel oben / Hantel unten.
     Im Wechsel abgespielt ergibt genau das die Bewegungsschleife, die eine
     Übung erklärt. Kein Standbild, sondern die Wiederholung selbst.

     Das ist der Grund, warum hier keine Videos liegen: die Animation steckt
     bereits in den Daten. Sie gilt für ALLE 874 Übungen, kostet kein
     zusätzliches Byte und funktioniert offline, sobald beide Bilder einmal
     im Cache sind.

     EIN Taktgeber für die ganze Seite. Zwanzig eigene Timer wären zwanzig
     Gelegenheiten, den Akku zu leeren und aus dem Takt zu geraten.
     ========================================================================== */
  const ANIM_MS = 900;
  let animTimer = null, animPhase = false;

  function animTick() {
    animPhase = !animPhase;
    document.querySelectorAll(".mm-anim.is-playing").forEach(el => {
      el.classList.toggle("frame-b", animPhase);
    });
    if (!document.querySelector(".mm-anim.is-playing")) stopAnimClock();
  }
  function startAnimClock() {
    if (animTimer || document.hidden) return;
    animTimer = setInterval(animTick, ANIM_MS);
  }
  function stopAnimClock() {
    if (animTimer) { clearInterval(animTimer); animTimer = null; }
  }
  /* Im Hintergrund-Tab läuft nichts. */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAnimClock();
    else if (document.querySelector(".mm-anim.is-playing")) startAnimClock();
  });

  /* Wer "weniger Bewegung" eingestellt hat, bekommt Standbilder — bis er von
     Hand auf Abspielen drückt. Die Wahl wird gemerkt. */
  const reducedMotion = () => {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  };
  function animOn() { return MM.store.get("trk_anim", !reducedMotion()); }
  function setAnimOn(v) { MM.store.set("trk_anim", !!v); }

  /* Zwei-Bild-Schleife. eager=true lädt beide Bilder sofort (Detailansicht),
     sonst kommt das zweite erst, wenn wirklich animiert wird. */
  function animMarkup(slug, cls, eager) {
    if (!slug) return '<span class="mm-anim ex-thumb-empty ' + cls + '" aria-hidden="true"></span>';
    const load = eager ? "eager" : "lazy";
    return '<span class="mm-anim ' + cls + '" data-anim="' + esc(slug) + '">' +
      '<img class="mm-anim-f mm-anim-a" src="' + exImg(slug, 0) + '" alt="" loading="' + load + '" decoding="async">' +
      (eager ? '<img class="mm-anim-f mm-anim-b" src="' + exImg(slug, 1) + '" alt="" loading="' + load + '" decoding="async">' : '') +
      '</span>';
  }

  /* Hängt das zweite Bild nach, falls es noch fehlt, und startet die Schleife.
     So zahlt eine Liste mit 60 Karten nicht 120 Bilder, sondern 60 — das
     zweite kommt erst, wenn jemand hinschaut. */
  function playAnim(box) {
    if (!box || box.classList.contains("ex-thumb-empty")) return;
    const slug = box.dataset.anim;
    if (!slug) return;
    if (!box.querySelector(".mm-anim-b")) {
      const b = document.createElement("img");
      b.className = "mm-anim-f mm-anim-b";
      b.decoding = "async";
      b.alt = "";
      b.src = exImg(slug, 1);
      box.appendChild(b);
    }
    box.classList.add("is-playing");
    startAnimClock();
  }
  function pauseAnim(box) {
    if (!box) return;
    box.classList.remove("is-playing", "frame-b");
  }

  /* Karten in Listen animieren erst bei Berührung/Mauszeiger — 60 gleichzeitig
     laufende Schleifen wären Unruhe, kein Nutzen. */
  function bindHoverAnim(root) {
    if (!animOn()) return;
    root.querySelectorAll(".ex-card, .ex-pick").forEach(card => {
      const box = card.querySelector(".mm-anim");
      if (!box) return;
      const on = () => playAnim(box), off = () => pauseAnim(box);
      card.addEventListener("mouseenter", on);
      card.addEventListener("mouseleave", off);
      card.addEventListener("focusin", on);
      card.addEventListener("focusout", off);
      card.addEventListener("touchstart", on, { passive: true });
    });
  }

  let libState = "idle";            // idle | loading | ready | failed
  let guideState = "idle";
  const libWaiting = [], guideWaiting = [];

  function loadScriptOnce(src, done) {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => done(true);
    s.onerror = () => done(false);
    document.head.appendChild(s);
  }

  /* Lädt die Bibliothek und ruft cb(ok). Mehrfachaufrufe während des Ladens
     werden gesammelt, nicht wiederholt angestoßen. */
  function loadLibrary(cb) {
    if (libState === "ready" || libState === "failed") { cb(libState === "ready"); return; }
    libWaiting.push(cb);
    if (libState === "loading") return;
    libState = "loading";
    loadScriptOnce("js/tracker-library.js", (ok) => {
      libState = ok && window.MM_TRK_LIBRARY ? "ready" : "failed";
      exIndex = null;                              // Index neu aufbauen
      libWaiting.splice(0).forEach(f => f(libState === "ready"));
    });
  }

  function loadGuide(cb) {
    if (guideState === "ready" || guideState === "failed") { cb(guideState === "ready"); return; }
    guideWaiting.push(cb);
    if (guideState === "loading") return;
    guideState = "loading";
    loadScriptOnce("js/tracker-guide.js", (ok) => {
      guideState = ok && window.MM_TRK_GUIDE ? "ready" : "failed";
      guideWaiting.splice(0).forEach(f => f(guideState === "ready"));
    });
  }

  /* Die kuratierten Übungen um Fotos und feine Muskeln ergänzen. Läuft einmal;
     js/tracker-curated.js ist klein und liegt im <head>. */
  let curatedMerged = false;
  function curated() {
    if (!curatedMerged) {
      const meta = window.MM_TRK_CURATED_META || {};
      MM_TRK_EXERCISES.forEach(e => {
        const m = meta[e.id];
        e.core = true;                              // Kennzeichen "vom Protokoll empfohlen"
        if (!m) return;
        if (m.src) e.src = m.src;
        if (m.m1) e.m1 = m.m1;
        if (m.m2) e.m2 = m.m2;
      });
      curatedMerged = true;
    }
    return MM_TRK_EXERCISES;
  }

  /* allExercises() wurde früher in jeder exById()-Abfrage neu zusammengebaut.
     Bei 49 Übungen war das egal, bei 874 nicht mehr — der Verlauf ruft
     exById() pro Satz auf. Deshalb ein Index, der nur neu entsteht, wenn
     sich der Bestand wirklich ändert. */
  let exIndex = null;
  function allExercises() {
    return curated().concat(window.MM_TRK_LIBRARY || [], S.customEx());
  }
  function buildIndex() {
    exIndex = new Map();
    allExercises().forEach(e => exIndex.set(e.id, e));
  }
  function invalidateIndex() { exIndex = null; }
  function exById(id) {
    if (!exIndex) buildIndex();
    return exIndex.get(id) || { id, muscle: "other", equip: "other", name: { de: id, en: id } };
  }
  function muscleLabel(m) { return tr(MM_TRK_MUSCLES[m] || { de: m, en: m }); }
  function fineLabel(m) { return tr((window.MM_TRK_FINE || {})[m] || { de: m, en: m }); }
  function equipLabel(e) { return tr((window.MM_TRK_EQUIP || {})[e] || { de: e, en: e }); }

  /* Feine Muskeln einer Übung. Kuratierte und Bibliotheks-Übungen tragen
     m1/m2; eigene Übungen haben nur die grobe Gruppe — die zählt dann als
     primär, damit die Heatmap sie nicht verschluckt. */
  function fineMuscles(ex) {
    if (ex.m1 && ex.m1.length) return { primary: ex.m1, secondary: ex.m2 || [] };
    const guess = { chest: ["chest"], back: ["lats"], legs: ["quadriceps"], shoulders: ["shoulders"], arms: ["biceps"], core: ["abdominals"] };
    return { primary: guess[ex.muscle] || [], secondary: [] };
  }
  const e1RM = (w, r) => r <= 0 ? 0 : w * (1 + r / 30);
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
  /* Bestes e1RM je Übung in EINEM Durchlauf. bestE1RM() einzeln pro Karte
     aufzurufen ginge bei 60 Karten 60-mal durch die gesamte Historie. */
  function bestE1RMMap() {
    const best = {};
    S.sessions().forEach(s => (s.exercises || []).forEach(e => {
      e.sets.forEach(x => {
        if (x.done && !x.warmup) {
          const v = e1RM(x.weight, x.reps);
          if (v > (best[e.exId] || 0)) best[e.exId] = v;
        }
      });
    }));
    return best;
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
  function localYmd(d) {
    const x = d instanceof Date ? d : new Date(d);
    return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
  }
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
        '<span class="wk-sub">' + (tpl ? tr(tpl.name).split(" ")[0] : (LANG() === "de" ? "Bewegung" : "Move")) + '</span></div>';
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
        '<h3 class="h-card" style="margin:6px 0 4px">🏋️ ' + tr(tpl.name) + '</h3>' +
        '<p class="muted" style="margin-bottom:16px">' + tpl.exIds.slice(0, 4).map(id => tr(exById(id).name)).join(" · ") + (tpl.exIds.length > 4 ? " …" : "") + '</p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        '<button class="btn btn-primary" data-starttpl="' + tpl.id + '">' + T("Jetzt starten", "Start now") + ' →</button>' +
        '<button class="btn btn-dark btn-sm" id="onlyMove">' + T("Heute nur Bewegung", "Just movement today") + '</button></div></div>';
    }
    if (!act.any) {
      return '<div class="card today-card"><div class="today-kick">' + T("DEIN TAGESZIEL", "TODAY'S GOAL") + '</div>' +
        '<h3 class="h-card" style="margin:6px 0 4px">🚶 ' + min + '–' + (min + 5) + ' min ' + T("Bewegung", "movement") + '</h3>' +
        '<p class="muted" style="margin-bottom:16px">' + T("Gehen, Mobility, Core oder Eigengewicht — jeder Tag zählt. Auch Recovery ist ein Tag.", "Walk, mobility, core or bodyweight — every day counts. Recovery is a day too.") + '</p>' +
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
        tpls.map(t => '<option value="' + t.id + '"' + (gymDays[String(wd)] === t.id ? " selected" : "") + '>' + tr(t.name) + '</option>').join("") + '</select>';
      return '<div class="plan-row"><label class="plan-day"><input type="checkbox" data-plday="' + wd + '"' + (active ? " checked" : "") + '> ' + names[i] + '</label>' + sel + '</div>';
    }).join("");
    modal.innerHTML = '<div class="modal-box"><div class="modal-head"><h3 class="h-card">📅 ' + T("Dein Wochenplan", "Your weekly plan") + '</h3><button class="cart-close" id="plnClose" aria-label="' + T("Wochenplan schließen", "Close weekly plan") + '">✕</button></div>' +
      '<p class="muted" style="font-size:0.88rem;margin-bottom:14px">' + T("Das MaleMetrix-Prinzip: jeden Tag 20–30 min Bewegung, an 2–3 Tagen Gym. Wähle deine Gym-Tage — an allen anderen zählt die tägliche Bewegung.", "The MaleMetrix principle: 20–30 min movement every day, gym on 2–3 days. Pick your gym days — every other day counts daily movement.") + '</p>' +
      rows +
      '<div class="field" style="margin-top:14px"><label for="plnMin">' + T("Tägliches Bewegungsziel (Minuten)", "Daily movement goal (minutes)") + '</label>' +
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
    app.innerHTML = focusHTML() + statsHTML() + tabsHTML() + '<div class="tracker-panel" id="trkPanel"></div>';
    app.querySelectorAll(".tracker-tab").forEach(b => b.addEventListener("click", () => { tab = b.dataset.tab; render(); }));
    bindFocus();
    renderPanel();
  }

  /* ---------- DER EINE AUFTRAG aus dem Score --------------------------------
     Steht bewusst GANZ OBEN, über den Statistiken: Er ist die eine Sache, die
     in diesen vier Wochen zählt. Alles andere im Tracker ist freiwillig. */
  function focusHTML() {
    if (!(window.MM && MM.focus)) return "";
    const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const fmtD = (str) => String(str || "").slice(8, 10) + "." + String(str || "").slice(5, 7) + "." + String(str || "").slice(0, 4);

    /* Der Optimierungspunkt zum Auftrag — kompakt: Bereich + sichtbarer
       Status. Er wird REFERENZIERT, nicht doppelt geführt (mm_focus bleibt
       maßgeblich); ohne points.js bleibt die Karte unverändert. */
    const punktZu = (ref) => {
      if (!(window.MM && MM.points && ref)) return null;
      try {
        const l = MM.points.list();
        for (let i = 0; i < l.length; i++) {
          if (l[i].source_type === "focus" && l[i].source_id === ref) return l[i];
        }
      } catch (e) {}
      return null;
    };
    const punktLine = (pt) => pt
      ? '<p class="small muted" style="margin:0 0 8px">Optimierungspunkt · Bereich ' + esc(pt.areaLabel || pt.area) +
        ' · <strong>' + esc(pt.statusLabel) + '</strong>' +
        (pt.standard && pt.standard.bestaetigt ? ' · als persönlicher Standard übernommen' : '') + '</p>' +
        massnahmenLine(pt)
      : "";

    /* Maßnahmen zu diesem Optimierungspunkt — kompakt referenziert (Paket 7).
       Der Tracker lädt den Stack-Katalog nicht; deshalb steht hier der
       gespeicherte Anzeigename, während die Maßnahme fachlich über ihre
       stabile ID im Katalog referenziert bleibt. Ohne Verknüpfung erscheint
       nichts — keine leeren Platzhalter, keine neue Pflicht. */
    const massnahmenLine = (pt) => {
      if (!(window.MM && MM.points && MM.points.measuresFor && pt)) return "";
      let ms = [];
      try { ms = MM.points.measuresFor(pt.id).filter((m) => !m.abgeschlossen); } catch (e) { return ""; }
      if (!ms.length) return "";
      let out = ms.map((m) =>
        '<p class="small muted" style="margin:0 0 4px">Maßnahme: <strong>' + esc(m.measure_label_snapshot || m.title) +
        '</strong> · ' + esc(m.statusLabel) +
        (m.review_date ? ' · Prüfung ' + esc(fmtD(m.review_date)) : '') +
        (m.criterion_label ? ' · Erfolgssignal: ' + esc(m.criterion_label) : '') + '</p>').join("");
      try {
        const amb = MM.points.measureAmbiguity(pt.id);
        if (amb.mehrere) out += '<p class="small" style="margin:0 0 8px;color:var(--muted-2)">' + esc(amb.text) + '</p>';
      } catch (e) {}
      return out;
    };

    /* Persönlicher Standard: NUR nach ausdrücklicher Bestätigung. Eine gute
       Wirkung erzeugt eine Empfehlung — nie automatisch einen Standard. */
    const standardBlock = (pt) => {
      if (!pt) return "";
      if (pt.standard && pt.standard.bestaetigt) {
        return '<p class="small" style="margin:0 0 12px"><strong>Persönlicher Standard:</strong> ' +
          esc(pt.standard.was) + ' — dauerhaft übernommen am ' + esc(fmtD(pt.standard.bestaetigtAm)) + '.</p>';
      }
      if (!(MM.points && MM.points.standardEmpfohlen(pt))) return "";
      return '<p class="small" style="margin:0 0 8px"><strong>Dauerhaft übernehmen?</strong> ' +
        'Die Maßnahme war ausreichend umgesetzt und hat geholfen. Deine Entscheidung:</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px">' +
        '<button type="button" class="btn btn-sm btn-primary" data-fstd="adopt" data-pt="' + esc(pt.id) + '">Als persönlichen Standard übernehmen</button>' +
        '<a class="btn btn-sm btn-ghost" href="check.html">Noch einmal testen</a>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-fstd="decline" data-pt="' + esc(pt.id) + '">Nicht dauerhaft übernehmen</button>' +
        '</div>';
    };

    /* Buttons der Wirkungsprüfung — an beiden Orten identisch: am
       abgelaufenen Auftrag und am bereits archivierten Vorgang.
       `ref` adressiert genau diesen Vorgang, damit bei mehreren offenen
       Prüfungen nie die falsche beantwortet wird. */
    const wirkungBtns = (ref) =>
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px">' +
      ['erkennbar|Wirkung erkennbar', 'teilweise|Teilweise', 'nicht_erkennbar|Keine erkennbare Wirkung',
       'offen|Noch offen — später prüfen', 'nicht_geprueft|Nicht weiter prüfen'].map(function (x) {
        const q = x.split("|");
        return '<button type="button" class="btn btn-sm btn-ghost" data-fwirkung="' + q[0] + '"' +
          (ref ? ' data-fref="' + esc(ref) + '"' : '') + '>' + q[1] + '</button>';
      }).join("") +
      '</div>';

    /* HEUTIGE ERFASSUNG — je nach Automatikstufe (Paket 5).
       A: aus Messdaten erkannt, mit sichtbarer Herkunft und Korrekturweg.
       B: Messdaten sprechen dafür — der Nutzer bestätigt ausdrücklich.
       C: unveränderte Ja/Nein-Erfassung.
       Ohne MM.focus.tagStatus (Alt-Stand) bleibt es bei der Checkbox. */
    const heuteBlock = (f) => {
      const cb = '<label class="trk-focus-check">' +
        '<input type="checkbox" id="focusToday"' + (MM.focus.progress(f).heuteErledigt ? " checked" : "") + '>' +
        '<span>' + esc(f.daily) + '</span></label>';
      if (!MM.focus.tagStatus) return cb;
      let t = null;
      try { t = MM.focus.tagStatus(f); } catch (e) { t = null; }
      if (!t || t.stufe === "C") return cb;

      const beleg = (mitZiel) => {
        let s = "";
        if (t.wert != null) s += t.wert + (t.einheit ? " " + t.einheit : "") + " erfasst";
        else if (t.quelle) s += "Erfasst";
        if (mitZiel && t.ziel != null) s += " · Ziel: mindestens " + t.ziel + (t.einheit ? " " + t.einheit : "");
        if (t.quelle) s += (s ? " · " : "") + "Quelle: " + esc(t.quelle);
        return s;
      };

      /* Ausdrücklich korrigiert oder bestätigt — der Nutzer hat entschieden. */
      if (t.manuell && (t.herkunft === "korrigiert" || t.herkunft === "bestaetigt")) {
        return '<div class="trk-focus-auto"><p class="ta-head">' + esc(f.daily) + '</p>' +
          '<p class="ta-state">' + (t.umgesetzt ? "Heute umgesetzt" : "Heute nicht umgesetzt") + '</p>' +
          '<p class="ta-src">' + (t.herkunft === "bestaetigt" ? "Manuell bestätigt" : "Manuell korrigiert") + '</p>' +
          '<button type="button" class="btn btn-sm btn-ghost" data-fday="toggle">Ändern</button></div>';
      }

      if (t.stufe === "A") {
        if (t.umgesetzt && t.herkunft === "auto") {
          return '<div class="trk-focus-auto is-done"><p class="ta-head">' + esc(f.daily) + '</p>' +
            '<p class="ta-state">Heute umgesetzt</p>' +
            '<p class="ta-ev">' + beleg(true) + '</p>' +
            '<p class="ta-src">Automatisch aus Messdaten erkannt</p>' +
            '<button type="button" class="btn btn-sm btn-ghost" data-fday="toggle">Ändern</button></div>';
        }
        const revidiert = t.revidiert
          ? '<p class="ta-src">Ein früher erkannter Tag gilt nach einer Korrektur deiner Messdaten nicht mehr.</p>' : "";
        return '<div class="trk-focus-auto"><p class="ta-head">' + esc(f.daily) + '</p>' +
          '<p class="ta-state">Heute noch offen</p>' +
          '<p class="ta-ev">' + (t.wert != null && t.ziel != null
            ? t.wert + (t.einheit ? " " + t.einheit : "") + " von " + t.ziel + (t.einheit ? " " + t.einheit : "") + " erreicht"
            : "Für heute liegen noch keine passenden Messdaten vor.") + '</p>' + revidiert +
          '<p class="ta-src">Du kannst den Tag jederzeit selbst eintragen.</p>' +
          '<button type="button" class="btn btn-sm btn-ghost" data-fday="ja">Umgesetzt</button> ' +
          '<button type="button" class="btn btn-sm btn-ghost" data-fday="nein">Nicht umgesetzt</button></div>';
      }

      /* Stufe B — Vorschlag. Ohne Bestätigung entsteht KEIN Häkchen.
         Vorgeschlagen wird NUR, wenn das Kriterium auch wirklich getroffen
         ist: ein Wert unter dem Ziel spricht nicht für die Umsetzung. */
      const kopf = '<div class="trk-focus-auto"><p class="ta-head">' + esc(f.daily) + '</p>';
      if (!t.treffer) {
        return kopf + '<p class="ta-state">Heute noch offen</p>' +
          '<p class="ta-ev">' + (t.wert != null && t.ziel != null
            ? t.wert + (t.einheit ? " " + t.einheit : "") + " von " + t.ziel + (t.einheit ? " " + t.einheit : "") + " erfasst — das reicht als Beleg nicht"
            : "Für heute liegen keine passenden Messdaten vor.") + '</p>' +
          '<button type="button" class="btn btn-sm btn-ghost" data-fday="ja">Umgesetzt</button> ' +
          '<button type="button" class="btn btn-sm btn-ghost" data-fday="nein">Nicht umgesetzt</button></div>';
      }
      const warum = t.konflikt ? esc(t.konflikt)
        : t.nichtDeckend ? "Dein Auftrag zählt " + esc(t.nichtDeckend) + " — das erfassen wir nicht. Der Wert oben ist ein verwandter, kein deckungsgleicher Beleg."
        : "Dein Auftrag enthält zusätzliche Bedingungen, die Messdaten nicht belegen können.";
      return kopf + '<p class="ta-state">Deine Messdaten sprechen dafür, dass du den Auftrag umgesetzt hast.</p>' +
        '<p class="ta-ev">' + beleg(false) + '</p>' +
        '<p class="ta-src">' + warum + ' Hast du ihn vollständig umgesetzt?</p>' +
        '<button type="button" class="btn btn-sm btn-primary" data-fday="bestaetigen">Als umgesetzt bestätigen</button> ' +
        '<button type="button" class="btn btn-sm btn-ghost" data-fday="nein">Nicht umgesetzt</button> ' +
        '<button type="button" class="btn btn-sm btn-ghost" data-fday="spaeter">Später entscheiden</button></div>';
    };

    /* Messdaten der laufenden Fokusphase auswerten, BEVOR die Karte gebaut
       wird — rein lesend für Stufe B/C, schreibend nur bei Stufe A und nur
       für Tage ohne ausdrückliche Entscheidung. */
    try { if (MM.focus.autoSync) MM.focus.autoSync(); } catch (e) {}
    const f = MM.focus.current();

    /* Kein laufender Auftrag — aber vielleicht eine OFFENE WIRKUNGSPRÜFUNG
       aus einem bereits archivierten Vorgang. Die darf nicht verschwinden:
       die Umsetzung ist abgeschlossen, die Wirkung ist es nicht. */
    if (!f) {
      const off = MM.focus.wirkungOffen && MM.focus.wirkungOffen();
      if (!off) return standardsHTML();
      return '<div class="card trk-focus" id="focus" style="margin-bottom:18px;border-left:3px solid var(--accent-2)">' +
        '<span class="card-num" style="color:var(--accent-2)">WIRKUNGSPRÜFUNG · OFFEN</span>' +
        '<h3 style="font-size:1.05rem;margin:6px 0 4px">Umsetzung abgeschlossen — die Wirkung ist noch offen.</h3>' +
        '<p class="small muted" style="margin:0 0 8px">' + esc(off.titel) + ' · Fokusphase ' + off.days + ' Tage bis ' + fmtD(off.letzterTag) +
        ' · umgesetzt: ' + off.erledigt + ' von ' + off.days + ' Tagen (Ziel: ' + off.ziel + ')</p>' +
        '<p class="small" style="margin:0 0 8px"><strong>Wirkungsprüfung ' +
        (off.beurteilbar ? 'fällig seit ' : 'terminiert für ') + fmtD(off.faelligAm) + '.</strong> ' +
        (off.beurteilbar ? 'Hat der Auftrag erkennbar geholfen? Deine ehrliche Einschätzung:'
                         : 'Bis dahin bleibt die Wirkung offen — du kannst sie jederzeit hier festhalten.') + '</p>' +
        punktLine(punktZu(off.ref)) +
        wirkungBtns(off.ref) +
        standardBlock(punktZu(off.ref)) +
        '<p class="small muted" style="margin:0">Der Vorgang ist archiviert; erst dein Wirkungsergebnis — oder die bewusste Entscheidung, nicht weiter zu prüfen — schließt ihn ab.</p>' +
        '</div>' + weitereOffeneHTML(off.ref) + standardsHTML();
    }

    const p = MM.focus.progress(f);

    /* Abgelaufen: ERGEBNISPRÜFUNG statt Checkbox — getrennt in Umsetzung
       (aus den Häkchen) und Wirkung (eigene Einschätzung, darf später
       liegen und bleibt bis dahin ehrlich offen). Kein automatischer
       Score-Zwang: der vollständige Score bleibt unabhängig davon. */
    if (p.abgelaufen) {
      const u = MM.focus.umsetzung(f);
      const w = MM.focus.wirkung(f);
      const uText = { ausreichend: "ausreichend umgesetzt", teilweise: "teilweise umgesetzt", nicht_ausreichend: "nicht ausreichend umgesetzt" }[u.verdict];
      let wBlock;
      /* Ein ERGEBNIS beendet die Erfassung — eine Vertagung („offen") NICHT:
         sonst wäre die vertagte Wirkungsprüfung an dieser Karte nicht mehr
         nachzuholen. Offen bleibt deshalb bearbeitbar. */
      if (w.erfasst && w.verdict !== "offen") {
        wBlock = '<p class="small" style="margin:0 0 12px"><strong>Wirkungsprüfung:</strong> ' + esc(w.label) +
          (w.erfasst.date ? ' · erfasst am ' + esc(fmtD(w.erfasst.date)) : '') + '</p>';
      } else if (w.erfasst && w.verdict === "offen") {
        wBlock = '<p class="small" style="margin:0 0 8px"><strong>Wirkungsprüfung: vertagt.</strong> ' +
          (w.spaeterAlsUmsetzung ? 'Sinnvoll ab ' + esc(fmtD(w.faelligAm)) + '. ' : '') +
          'Du kannst sie jederzeit hier festhalten:</p>' + wirkungBtns(MM.focus.ref ? MM.focus.ref(f) : null);
      } else {
        wBlock = '<p class="small" style="margin:0 0 8px"><strong>Wirkungsprüfung:</strong> ' +
          (u.verdict === "nicht_ausreichend"
            ? 'Bei dieser Umsetzung lässt sich die Wirkung nicht sicher beurteilen — das ist kein Scheitern, sondern eine offene Frage.'
            : (!w.beurteilbar && w.spaeterAlsUmsetzung
              ? 'Sinnvoll ab ' + esc(fmtD(w.faelligAm)) + ' — bis dahin gilt die Wirkung als offen.'
              : 'Hat der Auftrag erkennbar geholfen? Deine ehrliche Einschätzung:')) + '</p>' +
          wirkungBtns(MM.focus.ref ? MM.focus.ref(f) : null);
      }
      return '<div class="card trk-focus" id="focus" style="margin-bottom:18px;border-left:3px solid ' +
        (p.geschafft ? "var(--accent)" : "var(--muted-2)") + '">' +
        '<span class="card-num">DEIN AUFTRAG · ERGEBNISPRÜFUNG</span>' +
        /* Umsetzung, Ziel und Zielstatus sind DREI Angaben — das Ziel ist
           nie der Nenner der Umsetzung („5 von 7", nicht „5 von 5"). */
        '<h3 style="font-size:1.05rem;margin:6px 0 4px">Umsetzung: ' + u.erledigt + ' von ' + u.tage + ' Tagen — ' + uText + '.</h3>' +
        '<p class="small" style="margin:0 0 6px">Ziel: ' + u.ziel + ' von ' + u.tage + ' Tagen — <strong>' +
        (u.zielErreicht ? 'erreicht' : 'nicht erreicht') + '</strong> · Umsetzungsquote ' + u.quote + ' %</p>' +
        '<p class="small muted" style="margin:0 0 10px">' + esc(f.title) + ' · Fokusphase ' + f.days + ' Tage (' + fmtD(f.started) + '–' + fmtD(u.letzterTag) + ') · Umsetzungsprüfung ' + fmtD(u.faelligAm) +
        (u.ohneEintrag ? ' · ' + u.ohneEintrag + (u.ohneEintrag === 1 ? ' Tag' : ' Tage') + ' ohne Häkchen (nicht erfasst oder nicht umgesetzt)' : '') +
        /* Herkunft, KEINE zweite Quote: dieselben Tage, nur zusätzlich die
           Angabe, wie viele davon aus Messdaten kamen. */
        (u.ausTracking ? ' · davon ' + u.ausTracking + (u.ausTracking === 1 ? ' Tag' : ' Tage') + ' aus Tracking erkannt' : '') + '</p>' +
        punktLine(punktZu(MM.focus.ref ? MM.focus.ref(f) : null)) +
        wBlock +
        standardBlock(punktZu(MM.focus.ref ? MM.focus.ref(f) : null)) +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
        '<a class="btn btn-primary btn-sm" href="check.html">' +
        (p.geschafft ? "Optional: zweiten Score machen" : "Score wiederholen und neu ansetzen") + '</a>' +
        '<button type="button" class="trk-focus-drop" id="focusDrop">Auftrag abschließen &amp; archivieren</button>' +
        '</div>' +
        '<p class="small muted" style="margin:10px 0 0">Der vollständige Score bleibt davon unabhängig — sinnvoll nach rund 4 Wochen.</p>' +
        '</div>' + weitereOffeneHTML(MM.focus.ref ? MM.focus.ref(f) : null) + standardsHTML();
    }

    const kurs = p.aufKurs
      ? "Auf Kurs."
      : "Du liegst zurück — hol auf oder setz das Ziel kleiner.";
    return '<div class="card trk-focus" id="focus" style="margin-bottom:18px;border-left:3px solid var(--accent)">' +
      '<span class="card-num" style="color:var(--accent)">DEIN AUFTRAG · NOCH ' + p.offen + (p.offen === 1 ? ' TAG' : ' TAGE') + '</span>' +
      '<h3 style="font-size:1.05rem;margin:6px 0 4px">' + esc(f.title) + '</h3>' +
      /* Der letzte Umsetzungstag und der Prüfungstag sind NICHT derselbe Tag. */
      '<p class="small muted" style="margin:0 0 8px">Fokusphase ' + f.days + ' Tage: ' + fmtD(f.started) + '–' + fmtD(p.letzterTag) +
      ' · Umsetzungsprüfung am ' + fmtD(p.pruefungAm) +
      (f.wirkungBis && f.wirkungBis > f.until ? ' · Wirkungsprüfung ab ' + fmtD(f.wirkungBis) : '') + '</p>' +
      punktLine(punktZu(MM.focus.ref ? MM.focus.ref(f) : null)) +
      '<div class="trk-focus-bar" aria-hidden="true"><span style="width:' + p.prozent + '%"></span></div>' +
      '<p class="small muted" style="margin:8px 0 12px">' + p.erledigt + ' von ' + f.days + ' Tagen umgesetzt · Ziel: ' + f.target + ' Tage. ' + kurs + '</p>' +
      heuteBlock(f) +
      (f.arzt ? '<p class="small" style="color:var(--muted-2);margin:10px 0 0">' + esc(f.arzt) + '</p>' : '') +
      '<p class="small" style="margin:10px 0 0"><button type="button" class="trk-focus-drop" id="focusDrop">Auftrag beenden</button></p>' +
      '</div>' + weitereOffeneHTML(MM.focus.ref ? MM.focus.ref(f) : null) + standardsHTML();
  }

  /* WEITERE offene Wirkungsprüfungen — kompakt und nur, wenn es sie gibt.
     Wer genau eine offene Prüfung hat, sieht diese Liste nie. Kein offener
     Vorgang darf dauerhaft unzugänglich werden (mm_focus_history bleibt die
     maßgebliche Quelle; hier wird nur referenziert). */
  function weitereOffeneHTML(ausser) {
    if (!(window.MM && MM.focus && MM.focus.wirkungOffeneListe)) return "";
    const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const fmtD = (str) => String(str || "").slice(8, 10) + "." + String(str || "").slice(5, 7) + "." + String(str || "").slice(0, 4);
    const rest = MM.focus.wirkungOffeneListe().filter((o) => o.ref !== ausser);
    if (!rest.length) return "";
    return '<div class="card trk-focus" id="focusOffen" style="margin-bottom:18px">' +
      '<span class="card-num">WEITERE OFFENE WIRKUNGSPRÜFUNGEN · ' + rest.length + '</span>' +
      rest.map((o) =>
        '<div style="margin:10px 0 0;padding-top:10px;border-top:1px solid var(--line)">' +
        '<p class="small" style="margin:0 0 4px"><strong>' + esc(o.titel) + '</strong></p>' +
        '<p class="small muted" style="margin:0 0 6px">Umsetzung abgeschlossen: ' + o.erledigt + ' von ' + o.days +
        ' Tagen (Ziel: ' + o.ziel + ') · Wirkungsprüfung ' + (o.beurteilbar ? 'fällig seit ' : 'ab ') + fmtD(o.faelligAm) + '</p>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        ['erkennbar|Wirkung erkennbar', 'teilweise|Teilweise', 'nicht_erkennbar|Keine Wirkung', 'nicht_geprueft|Nicht weiter prüfen']
          .map((x) => { const q = x.split("|");
            return '<button type="button" class="btn btn-sm btn-ghost" data-fwirkung="' + q[0] + '" data-fref="' + esc(o.ref) + '">' + q[1] + '</button>'; })
          .join("") +
        '</div></div>').join("") +
      '</div>';
  }

  /* Übernommene persönliche Standards — knapp, damit sichtbar ist, was
     dauerhaft gilt. Entsteht ausschließlich aus bestätigten Übernahmen. */
  function standardsHTML() {
    if (!(window.MM && MM.points && MM.points.standards)) return "";
    const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    let st = [];
    try { st = MM.points.standards(); } catch (e) { return ""; }
    if (!st.length) return "";
    return '<div class="card trk-focus" id="focusStandards" style="margin-bottom:18px">' +
      '<span class="card-num">DEINE PERSÖNLICHEN STANDARDS · ' + st.length + '</span>' +
      '<ul class="small" style="margin:8px 0 0;padding-left:18px">' +
      st.map((p) => '<li style="margin:0 0 4px">' + esc(p.standard.was) + ' <span class="muted">· Bereich ' +
        esc(p.standard.bereich) + ' · seit ' + esc(String(p.standard.bestaetigtAm).slice(8, 10) + "." +
        String(p.standard.bestaetigtAm).slice(5, 7) + "." + String(p.standard.bestaetigtAm).slice(0, 4)) + '</span></li>').join("") +
      '</ul></div>';
  }

  function bindFocus() {
    const box = document.getElementById("focusToday");
    if (box) box.addEventListener("change", () => { MM.focus.toggleDay(); render(); });
    /* Tagesstatus aus der Messdatenbrücke (Paket 5). Jede Aktion ist eine
       AUSDRÜCKLICHE Entscheidung des Nutzers und gewinnt damit dauerhaft
       gegen jede spätere automatische Auswertung. „Später entscheiden"
       schreibt bewusst nichts. */
    document.querySelectorAll("[data-fday]").forEach((b) => b.addEventListener("click", () => {
      if (!(window.MM && MM.focus && MM.focus.setDay)) return;
      const a = b.getAttribute("data-fday");
      let t = null;
      try { t = MM.focus.tagStatus(); } catch (e) { t = null; }
      const beleg = t ? { quelle: t.quelle, wert: t.wert, ziel: t.ziel } : null;
      if (a === "spaeter") return;
      if (a === "toggle") MM.focus.toggleDay();
      else if (a === "ja") MM.focus.setDay(null, "ja", "manuell");
      else if (a === "bestaetigen") MM.focus.setDay(null, "ja", "bestaetigt", beleg);
      else if (a === "nein") MM.focus.setDay(null, "nein", "manuell");
      render();
    }));
    /* Wirkungsprüfung: Einschätzung erfassen (erkennbar/teilweise/keine/offen). */
    document.querySelectorAll("[data-fwirkung]").forEach((b) => b.addEventListener("click", () => {
      MM.focus.setWirkung(b.getAttribute("data-fwirkung"), null, b.getAttribute("data-fref") || null);
      render();
    }));
    /* Persönlicher Standard — ausschließlich auf ausdrückliche Bestätigung. */
    document.querySelectorAll("[data-fstd]").forEach((b) => b.addEventListener("click", () => {
      if (!(window.MM && MM.points)) return;
      const id = b.getAttribute("data-pt");
      if (b.getAttribute("data-fstd") === "adopt") {
        MM.points.adoptStandard(id);
        if (MM.toast) MM.toast("Als persönlicher Standard übernommen.");
      } else {
        MM.points.declineStandard(id);
      }
      render();
    }));
    const drop = document.getElementById("focusDrop");
    if (drop) drop.addEventListener("click", () => {
      if (confirm(T("Auftrag beenden? Der Fortschritt bleibt in deiner Historie erhalten.",
                    "End this task? Your progress stays in your history."))) {
        MM.focus.clear(); render();
      }
    });
  }

  function tabsHTML() {
    const t = (id, label) => '<button class="tracker-tab' + (tab === id ? " active" : "") + '" data-tab="' + id + '">' + label + '</button>';
    return '<div class="tracker-tabs">' +
      t("workout", T("Training", "Workout")) +
      t("history", T("Verlauf", "History")) +
      t("exercises", T("Übungen", "Exercises")) +
      t("insights", T("Insights", "Insights")) +
      t("cardio", T("Cardio", "Cardio")) +
      t("sleep", T("Schlaf", "Sleep")) +
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
    else if (tab === "sleep") renderSleep(p);
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
          '<div class="template-card"><h4>' + tr(tpl.name) + '</h4>' +
          '<div style="margin:8px 0 14px">' + tpl.exIds.map(id => '<div class="template-ex">· ' + tr(exById(id).name) + '</div>').join("") + '</div>' +
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
      '<div><input type="text" id="sessName" value="' + (active.name || "").replace(/"/g, "&quot;") + '" style="background:none;border:none;font-family:var(--font-display);font-size:1.3rem;font-weight:700;color:var(--text);padding:0;width:auto"></div>' +
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

      /* Die Bewegungsschleife läuft hier dauerhaft: zwischen zwei Sätzen ist
         der Blick auf die Ausführung genau das, was hilft — nicht erst nach
         einem zusätzlichen Klick ins Detailfenster. */
      html += '<div class="card" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:12px">' +
        '<div class="ex-head-live">' +
        animMarkup(meta.src, "ex-live-thumb", false) +
        '<div><button class="ex-title-link" data-exdetail="' + ex.exId + '">' + esc(tr(meta.name)) + ' <span style="opacity:0.5">↗</span></button>' +
        '<span class="ex-muscle-tag">' + esc(muscleLabel(meta.muscle)) + '</span></div></div>' +
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
        // Rekord heißt ÜBER dem bisherigen Bestwert — nicht exakt gleichauf.
        const isPR = setE1 > 0 && pr > 0 && setE1 > pr + 0.01;
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
      '<div class="field" style="margin-top:16px"><label for="sessNote">' + T("Notiz zur Einheit", "Session note") + '</label>' +
      '<textarea id="sessNote" rows="2" placeholder="' + T("z. B. gutes Gefühl, linkes Knie beobachten…", "e.g. felt strong, watch left knee…") + '" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--card-2);color:var(--text);font-family:inherit;resize:vertical">' + (active.note ? String(active.note).replace(/</g, "&lt;") : "") + '</textarea></div>';
    p.innerHTML = html;

    p.querySelector("#sessName").addEventListener("change", e => { active.name = e.target.value; S.saveActive(active); });
    p.querySelector("#sessNote").addEventListener("change", e => { active.note = e.target.value; S.saveActive(active); });
    p.querySelector("#discardSess").addEventListener("click", () => {
      if (confirm(T("Einheit verwerfen? Daten gehen verloren.", "Discard workout? Data will be lost."))) { S.clearActive(); render(); }
    });
    p.querySelector("#finishSess").addEventListener("click", finishSession);
    p.querySelector("#addExercise").addEventListener("click", openExercisePicker);
    p.querySelectorAll("[data-exdetail]").forEach(b => b.addEventListener("click", () => openExerciseDetail(b.dataset.exdetail)));
    /* Nur die Übungen dieser Einheit — eine Handvoll, keine Liste. */
    if (animOn()) p.querySelectorAll(".ex-live-thumb").forEach(playAnim);
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

  /* Eine laufende Einheit wird NICHT stillschweigend überschrieben.
     Der Verwerfen-Knopf fragt nach — das Starten einer neuen Einheit tat es
     nicht und hat das Log kommentarlos gelöscht. */
  function mayReplaceActive() {
    if (!S.active()) return true;
    return confirm(T("Es läuft noch eine Einheit. Sie geht dabei verloren. Trotzdem neu starten?",
      "A workout is still running. It will be lost. Start a new one anyway?"));
  }

  function startSession(tplId) {
    if (!mayReplaceActive()) return;
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
    if (!mayReplaceActive()) return;
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
    const PICK_MAX = 60;             // mehr Treffer als das zu scrollen lohnt
    const draw = (filter) => {
      const q = (filter || "").trim().toLowerCase();
      const all = allExercises().filter(e =>
        (!muscleFilter || e.muscle === muscleFilter) &&
        (!q || (e.name.de || "").toLowerCase().includes(q) ||
               (e.name.en || "").toLowerCase().includes(q) ||
               muscleLabel(e.muscle).toLowerCase().includes(q)));
      /* Programm-Übungen zuerst — im laufenden Training will man die
         gewohnten oben haben, nicht alphabetisches Bibliotheksrauschen. */
      all.sort((a, b) => {
        if (!!b.core !== !!a.core) return b.core ? 1 : -1;
        return tr(a.name).localeCompare(tr(b.name));
      });
      const list = all.slice(0, PICK_MAX);
      const rows = list.map(e =>
        '<button class="ex-pick" data-pick="' + esc(e.id) + '">' +
          animMarkup(e.src, "ex-pick-thumb", false) +
          '<span class="ex-pick-name">' + (e.core ? '<span class="ex-pick-star">★</span> ' : '') + esc(tr(e.name)) + '</span>' +
          '<span class="ex-muscle-tag">' + esc(muscleLabel(e.muscle)) + '</span></button>').join("");

      modal.querySelector(".ex-picker-list").innerHTML =
        (rows || '<p class="muted" style="text-align:center;padding:20px">' +
          (libState === "loading"
            ? T("Bibliothek lädt…", "Loading library…")
            : T("Nichts gefunden.", "Nothing found.")) + '</p>') +
        (all.length > list.length
          ? '<p class="muted small" style="text-align:center;padding:10px">' +
            T("… und " + (all.length - list.length) + " weitere. Suche eingrenzen.",
              "… and " + (all.length - list.length) + " more. Narrow your search.") + '</p>'
          : '');

      modal.querySelectorAll("[data-pick]").forEach(b => b.addEventListener("click", () => {
        const active = S.active();
        active.exercises.push({ exId: b.dataset.pick, sets: [{ weight: 0, reps: 0, done: false }] });
        S.saveActive(active); closeModal("exModal"); renderPanel();
      }));
      bindHoverAnim(modal);
    };
    const chips = Object.keys(MM_TRK_MUSCLES).map(m =>
      '<button class="mfilter" data-mf="' + m + '">' + muscleLabel(m) + '</button>').join("");
    modal.innerHTML = '<div class="modal-box"><div class="modal-head"><h3 class="h-card">' + T("Übung wählen", "Choose exercise") + '</h3>' +
      '<button class="cart-close" id="exClose" aria-label="' + T("Übungsauswahl schließen", "Close exercise picker") + '">✕</button></div>' +
      '<input type="text" class="ex-picker-search" id="exSearch" placeholder="' + T("Suchen oder eigene anlegen…", "Search or create your own…") + '">' +
      '<div class="mfilter-row"><button class="mfilter active" data-mf="">' + T("Alle", "All") + '</button>' + chips + '</div>' +
      '<div class="ex-picker-list"></div>' +
      '<button class="btn btn-dark btn-block btn-sm" id="addCustomEx" style="margin-top:14px">+ ' + T("Eigene Übung anlegen", "Create custom exercise") + '</button></div>';
    modal.classList.add("open");
    draw("");
    /* Bibliothek im Hintergrund holen; die kuratierten Übungen stehen sofort,
       die restlichen 825 erscheinen, sobald sie da sind. */
    loadLibrary(() => {
      const box = document.getElementById("exModal");
      if (box && box.classList.contains("open")) draw(box.querySelector("#exSearch").value);
    });
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
  function closeModal(id) {
    const m = document.getElementById(id || "exModal");
    if (!m) return;
    m.classList.remove("open");
    /* Geschlossene Fenster dürfen den Taktgeber nicht am Leben halten. */
    m.querySelectorAll(".mm-anim.is-playing").forEach(pauseAnim);
  }

  /* ---------- Scheiben-Rechner ---------- */
  function openPlateCalc(prefillKg) {
    let modal = document.getElementById("plateModal");
    if (!modal) { modal = document.createElement("div"); modal.id = "plateModal"; modal.className = "modal-overlay"; document.body.appendChild(modal); }
    const cfg = window.MM_TRK_PLATES || { barKg: 20, platesKg: [25, 20, 15, 10, 5, 2.5, 1.25] };
    /* Nicht einfrieren: Der Nutzer kann die Stange im Dialog aendern, und
       das muss sich im Ergebnis niederschlagen. Vorher blieb der Wert vom
       Oeffnen stehen und das Feld war wirkungslos. */
    let barKg = S.barPref();

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
    modal.innerHTML = '<div class="modal-box"><div class="modal-head"><h3 class="h-card">🏋️ ' + T("Scheiben-Rechner", "Plate calculator") + '</h3><button class="cart-close" id="plClose" aria-label="' + T("Scheiben-Rechner schließen", "Close plate calculator") + '">✕</button></div>' +
      '<div class="form-row"><div class="field"><label for="plTotal">' + T("Zielgewicht", "Target weight") + ' (' + massU() + ')</label><input type="number" inputmode="decimal" id="plTotal" value="' + (prefillKg ? dispW(prefillKg) : "") + '" placeholder="' + (units() === "imperial" ? "225" : "100") + '"></div>' +
      '<div class="field"><label for="plBar">' + T("Stange", "Bar") + ' (' + massU() + ')</label><input type="number" inputmode="decimal" id="plBar" value="' + dispW(barKg) + '"></div></div>' +
      '<div id="plateOut" style="margin-top:8px"></div></div>';
    modal.classList.add("open");
    modal.querySelector("#plClose").addEventListener("click", () => closeModal("plateModal"));
    modal.addEventListener("click", e => { if (e.target === modal) closeModal("plateModal"); });
    const totalIn = modal.querySelector("#plTotal"), barIn = modal.querySelector("#plBar");
    totalIn.addEventListener("input", () => draw(totalIn.value));
    barIn.addEventListener("input", () => {
      const v = parseFloat(barIn.value);
      barKg = isFinite(v) && v > 0 ? toKg(v) : ((window.MM_TRK_PLATES || {}).barKg || 20);
      S.saveBarPref(barKg);
      draw(totalIn.value);
    });
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
    /* Die Bewegung läuft — links die Schleife aus Start- und Endposition,
       rechts beide Positionen einzeln zum Vergleichen. Zusammen zeigt das
       sowohl den Ablauf als auch die beiden Endpunkte, auf die es ankommt. */
    const media = meta.src
      ? '<div class="ex-demo">' +
          '<div class="ex-demo-main">' +
            animMarkup(meta.src, "ex-demo-anim", true) +
            '<button class="ex-demo-toggle" id="exdPlay" type="button" aria-pressed="' + (animOn() ? "true" : "false") + '">' +
              (animOn() ? "❙❙ " + T("Pause", "Pause") : "▶ " + T("Abspielen", "Play")) + '</button>' +
          '</div>' +
          '<div class="ex-demo-frames">' +
            '<figure><img src="' + exImg(meta.src, 0) + '" alt="' + esc(tr(meta.name)) + ' — ' + T("Startposition", "start position") + '" loading="lazy" decoding="async">' +
              '<figcaption>' + T("Start", "Start") + '</figcaption></figure>' +
            '<figure><img src="' + exImg(meta.src, 1) + '" alt="' + esc(tr(meta.name)) + ' — ' + T("Endposition", "end position") + '" loading="lazy" decoding="async">' +
              '<figcaption>' + T("Ende", "End") + '</figcaption></figure>' +
          '</div>' +
        '</div>'
      : '';

    /* Muskeln: primär hervorgehoben, sekundär gedämpft. */
    const fm = fineMuscles(meta);
    const chip = (m, primary) => '<span class="ex-mchip' + (primary ? " is-primary" : "") + '">' + esc(fineLabel(m)) + '</span>';
    const muscles = (fm.primary.length || fm.secondary.length)
      ? '<div class="ex-mchips">' + fm.primary.map(m => chip(m, true)).join("") +
        fm.secondary.map(m => chip(m, false)).join("") + '</div>'
      : '';

    const tags = '<div class="ex-detail-tags">' +
      '<span class="ex-muscle-tag">' + esc(muscleLabel(meta.muscle)) + '</span>' +
      (meta.equip ? '<span class="ex-muscle-tag">' + esc(equipLabel(meta.equip)) + '</span>' : '') +
      (meta.core ? '<span class="ex-muscle-tag is-core">★ ' + T("Programm-Übung", "Programme exercise") + '</span>' : '') +
      '</div>';

    modal.innerHTML = '<div class="modal-box"><div class="modal-head"><h3 class="h-card">' + esc(tr(meta.name)) + '</h3><button class="cart-close" id="exdClose" aria-label="' + T("Übungsdetails schließen", "Close exercise details") + '">✕</button></div>' +
      media + tags + muscles +
      '<div id="exdGuide"></div>' +
      body + '</div>';
    modal.classList.add("open");
    modal.querySelector("#exdClose").addEventListener("click", () => closeModal("exDetailModal"));
    modal.addEventListener("click", e => { if (e.target === modal) closeModal("exDetailModal"); });

    const demo = modal.querySelector(".ex-demo-anim");
    const playBtn = modal.querySelector("#exdPlay");
    if (demo && playBtn) {
      if (animOn()) playAnim(demo);
      playBtn.addEventListener("click", () => {
        const nowOn = !demo.classList.contains("is-playing");
        setAnimOn(nowOn);                       // Wahl gilt auch für alle anderen Ansichten
        if (nowOn) playAnim(demo); else pauseAnim(demo);
        playBtn.setAttribute("aria-pressed", nowOn ? "true" : "false");
        playBtn.textContent = nowOn ? "❙❙ " + T("Pause", "Pause") : "▶ " + T("Abspielen", "Play");
      });
    }

    /* Ausführungsschritte liegen in einer eigenen, größeren Datei — die wird
       erst hier geholt, nicht beim Öffnen des Tabs. */
    const slot = modal.querySelector("#exdGuide");
    loadGuide((ok) => {
      if (!slot.isConnected) return;
      const steps = ok && window.MM_TRK_GUIDE ? window.MM_TRK_GUIDE[exId] : null;
      if (!steps || !steps.length) return;
      slot.innerHTML = '<h4 class="ex-detail-h">' + T("Ausführung", "How to perform") + '</h4>' +
        '<ol class="ex-steps">' + steps.map(s => '<li>' + esc(s) + '</li>').join("") + '</ol>' +
        '<p class="muted small ex-steps-note">' +
        T("Ausführungstext im englischen Original aus der gemeinfreien Quelle free-exercise-db.",
          "Instructions in the original English from the public-domain source free-exercise-db.") + '</p>';
    });
  }

  function lineChart(vals, isWeight) {
    if (vals.length < 2) return "";
    const disp = isWeight ? vals.map(v => dispW(v)) : vals;
    const min = Math.min.apply(null, disp), max = Math.max.apply(null, disp), range = (max - min) || 1;
    const W = 600, H = 150, pad = 26;
    const pts = disp.map((v, i) => [pad + i / (disp.length - 1) * (W - 2 * pad), H - pad - (v - min) / range * (H - 2 * pad)]);
    const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    return '<svg class="mini-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><defs><linearGradient id="trkGrad2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#258CFF"/><stop offset="100%" stop-color="#16C4F4"/></linearGradient></defs>' +
      '<line class="axis" x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - pad) + '" y2="' + (H - pad) + '"/>' +
      '<path class="ln" d="' + path + '" style="stroke:url(#trkGrad2)"/>' +
      pts.map(p => '<circle class="dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3"/>').join("") +
      '</svg><div class="mono muted small" style="display:flex;justify-content:space-between;margin-top:4px"><span>' + (isWeight ? fmtW(min) : Math.round(min)) + '</span><span>' + (isWeight ? fmtW(max) : Math.round(max)) + '</span></div>';
  }

  /* ==========================================================================
     EXERCISES (Bibliothek + Fortschritt)
     ========================================================================== */
  /* Filterzustand überlebt einen Tab-Wechsel — wer nach "Brust, Kurzhantel"
     gesucht hat, findet das nach dem Blick in den Verlauf wieder vor. */
  const exFilter = { q: "", muscle: "", equip: "", onlyCore: false, limit: 60 };

  /* Karte einer Übung: Foto (falls vorhanden), Name, Muskel, Gerät — und der
     eigene Rekord, sobald die Übung schon trainiert wurde. */
  function exCardHTML(e, pr) {
    const thumb = animMarkup(e.src, "ex-thumb", false);
    return '<button class="ex-card" data-exdetail="' + esc(e.id) + '">' + thumb +
      '<span class="ex-card-body">' +
        '<span class="ex-card-name">' + esc(tr(e.name)) + '</span>' +
        '<span class="ex-card-meta">' + esc(muscleLabel(e.muscle)) +
          (e.equip ? ' · ' + esc(equipLabel(e.equip)) : '') + '</span>' +
        (pr > 0 ? '<span class="ex-card-pr mono">' + fmtW(pr) + ' ' + T("bestes e1RM", "best e1RM") + '</span>' : '') +
      '</span>' +
      (e.core ? '<span class="ex-badge-core" title="' + T("Im MaleMetrix-Programm vorgesehen", "Part of the MaleMetrix programme") + '">★</span>' : '') +
      '</button>';
  }

  function exMatches(e) {
    if (exFilter.onlyCore && !e.core) return false;
    if (exFilter.muscle && e.muscle !== exFilter.muscle) return false;
    if (exFilter.equip && e.equip !== exFilter.equip) return false;
    const q = exFilter.q.trim().toLowerCase();
    if (!q) return true;
    return (e.name.de || "").toLowerCase().includes(q) ||
           (e.name.en || "").toLowerCase().includes(q) ||
           muscleLabel(e.muscle).toLowerCase().includes(q);
  }

  function renderExercises(p) {
    /* Reihenfolge: schon trainierte zuerst (das eigene Repertoire), dann die
       kuratierten Programm-Übungen, dann der Rest der Bibliothek. Nicht
       "alles", sondern das Richtige zuerst. */
    const prs = bestE1RMMap();
    const list = allExercises().filter(exMatches).sort((a, b) => {
      const ta = prs[a.id] ? 1 : 0, tb = prs[b.id] ? 1 : 0;
      if (ta !== tb) return tb - ta;
      if (!!b.core !== !!a.core) return b.core ? 1 : -1;
      return tr(a.name).localeCompare(tr(b.name));
    });
    const shown = list.slice(0, exFilter.limit);

    const chips = ['<button class="mfilter' + (exFilter.muscle ? "" : " active") + '" data-mf="">' + T("Alle", "All") + '</button>']
      .concat(Object.keys(MM_TRK_MUSCLES).map(m =>
        '<button class="mfilter' + (exFilter.muscle === m ? " active" : "") + '" data-mf="' + m + '">' + esc(muscleLabel(m)) + '</button>')).join("");

    const equipOpts = ['<option value="">' + T("Alle Geräte", "All equipment") + '</option>']
      .concat(Object.keys(window.MM_TRK_EQUIP || {}).map(k =>
        '<option value="' + k + '"' + (exFilter.equip === k ? " selected" : "") + '>' + esc(equipLabel(k)) + '</option>')).join("");

    p.innerHTML =
      '<div class="ex-lib-head">' +
        '<input type="search" id="exLibSearch" class="ex-picker-search" placeholder="' +
          T("Übung suchen — Name oder Muskel…", "Search exercise — name or muscle…") + '" value="' + esc(exFilter.q) + '">' +
        '<div class="ex-lib-controls">' +
          '<select id="exLibEquip" class="ex-lib-select">' + equipOpts + '</select>' +
          '<label class="ex-lib-toggle"><input type="checkbox" id="exLibCore"' + (exFilter.onlyCore ? " checked" : "") + '> ' +
            T("Nur Programm-Übungen", "Programme exercises only") + '</label>' +
        '</div>' +
        '<div class="mfilter-row">' + chips + '</div>' +
      '</div>' +
      '<p class="muted small" id="exLibCount" style="margin:0 0 12px">' +
        list.length + " " + T("Übungen", "exercises") +
        (libState === "ready" ? "" : " · " + T("Bibliothek lädt…", "loading library…")) + '</p>' +
      '<div class="ex-card-grid">' + shown.map(e => exCardHTML(e, prs[e.id])).join("") + '</div>' +
      (list.length > shown.length
        ? '<button class="btn btn-dark btn-block" id="exLibMore" style="margin-top:16px">' +
          T("Weitere anzeigen", "Show more") + ' (' + (list.length - shown.length) + ')</button>'
        : '') +
      (libState === "failed"
        ? '<p class="muted small" style="margin-top:16px">' +
          T("Die große Bibliothek konnte nicht geladen werden — deine kuratierten Übungen funktionieren normal weiter.",
            "The full library could not be loaded — your curated exercises keep working normally.") + '</p>'
        : '');

    p.querySelectorAll("[data-exdetail]").forEach(b => b.addEventListener("click", () => openExerciseDetail(b.dataset.exdetail)));
    bindHoverAnim(p);

    const search = p.querySelector("#exLibSearch");
    /* Neu zeichnen, ohne den Fokus zu verlieren — sonst schließt die
       Tastatur auf dem Handy nach jedem Buchstaben. */
    const redraw = () => {
      const pos = search === document.activeElement ? search.selectionStart : null;
      renderExercises(p);
      if (pos != null) {
        const s2 = p.querySelector("#exLibSearch");
        if (s2) { s2.focus(); try { s2.setSelectionRange(pos, pos); } catch (e) {} }
      }
    };
    search.addEventListener("input", () => { exFilter.q = search.value; exFilter.limit = 60; redraw(); });
    p.querySelector("#exLibEquip").addEventListener("change", (ev) => { exFilter.equip = ev.target.value; exFilter.limit = 60; redraw(); });
    p.querySelector("#exLibCore").addEventListener("change", (ev) => { exFilter.onlyCore = ev.target.checked; exFilter.limit = 60; redraw(); });
    p.querySelectorAll("[data-mf]").forEach(b => b.addEventListener("click", () => {
      exFilter.muscle = b.dataset.mf; exFilter.limit = 60; redraw();
    }));
    const more = p.querySelector("#exLibMore");
    if (more) more.addEventListener("click", () => { exFilter.limit += 60; redraw(); });

    /* Bibliothek beim ersten Blick in den Tab holen und dann neu zeichnen. */
    if (libState === "idle") loadLibrary(() => { if (tab === "exercises") renderExercises(p); });
  }

  /* ==========================================================================
     MUSKEL-HEATMAP
     --------------------------------------------------------------------------
     Zwei stilisierte Körperansichten, eingefärbt nach den Sätzen der letzten
     sieben Tage. Das beantwortet in einer Sekunde die Frage, für die man sonst
     den Verlauf durchgehen müsste: Was ist zu kurz gekommen?

     Zählweise: ein Satz zählt für den PRIMÄREN Muskel voll, für sekundäre
     halb. Bankdrücken ist Brusttraining und Trizepstraining — aber nicht zu
     gleichen Teilen. Ohne diese Gewichtung sähe jeder Drückplan so aus, als
     wäre der Trizeps genauso bedient wie die Brust.
     ========================================================================== */
  const SECONDARY_WEIGHT = 0.5;

  function muscleLoad(days) {
    const since = new Date(Date.now() - (days || 7) * 864e5);
    const load = {};
    S.sessions().forEach(s => {
      if (new Date(s.date) < since) return;
      (s.exercises || []).forEach(e => {
        const n = workingSets(e).length;
        if (!n) return;
        const fm = fineMuscles(exById(e.exId));
        fm.primary.forEach(m => { load[m] = (load[m] || 0) + n; });
        fm.secondary.forEach(m => { load[m] = (load[m] || 0) + n * SECONDARY_WEIGHT; });
      });
    });
    return load;
  }

  /* Mannequin-Grundform — dieselbe für Vorder- und Rückansicht. Sie trägt
     keine Bedeutung, sie gibt den Muskelflächen nur einen Körper. */
  const BODY_BASE =
    '<circle cx="60" cy="17" r="11" class="mmap-base"/>' +
    '<rect x="55" y="25" width="10" height="9" rx="3" class="mmap-base"/>' +
    '<rect x="42" y="33" width="36" height="62" rx="11" class="mmap-base"/>' +
    '<rect x="45" y="92" width="30" height="18" rx="7" class="mmap-base"/>' +
    '<rect x="26" y="40" width="12" height="36" rx="6" class="mmap-base"/>' +
    '<rect x="82" y="40" width="12" height="36" rx="6" class="mmap-base"/>' +
    '<rect x="22" y="72" width="11" height="36" rx="5.5" class="mmap-base"/>' +
    '<rect x="87" y="72" width="11" height="36" rx="5.5" class="mmap-base"/>' +
    '<rect x="42" y="104" width="16" height="48" rx="8" class="mmap-base"/>' +
    '<rect x="62" y="104" width="16" height="48" rx="8" class="mmap-base"/>' +
    '<rect x="44" y="148" width="13" height="46" rx="6.5" class="mmap-base"/>' +
    '<rect x="63" y="148" width="13" height="46" rx="6.5" class="mmap-base"/>';

  /* Muskelflächen je Ansicht. Ein Muskel darf mehrere Flächen haben
     (linke und rechte Körperhälfte). */
  const BODY_FRONT = {
    neck:       ['<rect x="55" y="25" width="10" height="9" rx="3"/>'],
    shoulders:  ['<ellipse cx="33" cy="45" rx="8" ry="7.5"/>', '<ellipse cx="87" cy="45" rx="8" ry="7.5"/>'],
    chest:      ['<ellipse cx="51" cy="48" rx="8.5" ry="8"/>', '<ellipse cx="69" cy="48" rx="8.5" ry="8"/>'],
    biceps:     ['<ellipse cx="32" cy="61" rx="5.5" ry="12"/>', '<ellipse cx="88" cy="61" rx="5.5" ry="12"/>'],
    forearms:   ['<ellipse cx="27.5" cy="89" rx="5" ry="15"/>', '<ellipse cx="92.5" cy="89" rx="5" ry="15"/>'],
    abdominals: ['<rect x="50" y="60" width="20" height="33" rx="6"/>'],
    abductors:  ['<ellipse cx="45" cy="105" rx="5" ry="9"/>', '<ellipse cx="75" cy="105" rx="5" ry="9"/>'],
    adductors:  ['<ellipse cx="55" cy="120" rx="4.5" ry="15"/>', '<ellipse cx="65" cy="120" rx="4.5" ry="15"/>'],
    quadriceps: ['<ellipse cx="49" cy="126" rx="7.5" ry="22"/>', '<ellipse cx="71" cy="126" rx="7.5" ry="22"/>'],
    calves:     ['<ellipse cx="50" cy="170" rx="6" ry="18"/>', '<ellipse cx="70" cy="170" rx="6" ry="18"/>']
  };
  const BODY_BACK = {
    neck:         ['<rect x="55" y="25" width="10" height="9" rx="3"/>'],
    traps:        ['<ellipse cx="60" cy="40" rx="17" ry="9"/>'],
    shoulders:    ['<ellipse cx="33" cy="45" rx="8" ry="7.5"/>', '<ellipse cx="87" cy="45" rx="8" ry="7.5"/>'],
    triceps:      ['<ellipse cx="32" cy="61" rx="5.5" ry="12"/>', '<ellipse cx="88" cy="61" rx="5.5" ry="12"/>'],
    forearms:     ['<ellipse cx="27.5" cy="89" rx="5" ry="15"/>', '<ellipse cx="92.5" cy="89" rx="5" ry="15"/>'],
    lats:         ['<ellipse cx="47" cy="60" rx="7" ry="14"/>', '<ellipse cx="73" cy="60" rx="7" ry="14"/>'],
    "middle back":['<rect x="53" y="50" width="14" height="18" rx="4"/>'],
    "lower back": ['<rect x="52" y="72" width="16" height="18" rx="4"/>'],
    glutes:       ['<ellipse cx="51" cy="101" rx="9" ry="9"/>', '<ellipse cx="69" cy="101" rx="9" ry="9"/>'],
    hamstrings:   ['<ellipse cx="49" cy="128" rx="7.5" ry="22"/>', '<ellipse cx="71" cy="128" rx="7.5" ry="22"/>'],
    calves:       ['<ellipse cx="50" cy="170" rx="6" ry="18"/>', '<ellipse cx="70" cy="170" rx="6" ry="18"/>']
  };

  function bodyViewHTML(regions, load, max, label) {
    const shapes = Object.keys(regions).map(m => {
      const v = load[m] || 0;
      /* Nie ganz durchsichtig: auch ein einziger Satz soll sichtbar sein,
         volle Deckung erst beim Wochenmaximum. */
      const o = v > 0 ? 0.28 + 0.72 * Math.min(1, v / max) : 0;
      const cls = v > 0 ? "mmap-on" : "mmap-off";
      const title = esc(fineLabel(m)) + ": " + (Math.round(v * 10) / 10) + " " + T("Sätze", "sets");
      return regions[m].map(sh =>
        sh.replace("/>", ' class="' + cls + '" style="opacity:' + o.toFixed(2) + '"><title>' + title + '</title></' +
          (sh.indexOf("<rect") === 0 ? "rect" : "ellipse") + '>')
      ).join("");
    }).join("");
    return '<figure class="mmap-fig">' +
      '<svg viewBox="0 0 120 200" class="mmap-svg" role="img" aria-label="' + esc(label) + '">' +
      BODY_BASE + shapes + '</svg>' +
      '<figcaption class="mmap-cap">' + esc(label) + '</figcaption></figure>';
  }

  function heatmapHTML() {
    const load = muscleLoad(7);
    const vals = Object.values(load);
    const max = vals.length ? Math.max.apply(null, vals) : 0;

    if (!max) {
      return '<div class="card" style="margin-bottom:18px">' +
        '<h3 class="h-card" style="margin-bottom:6px">' + T("Muskelkarte (7 Tage)", "Muscle map (7 days)") + '</h3>' +
        '<p class="muted small">' + T("Noch keine Sätze in den letzten sieben Tagen. Sobald du loggst, färbt sich hier ein, was du bedient hast — und es bleibt sichtbar, was nicht.", "No sets in the last seven days. Once you log, this fills in what you trained — and leaves visible what you did not.") + '</p></div>';
    }

    /* Vernachlässigt = im System bekannt, aber diese Woche ohne einen Satz.
       Nacken bleibt außen vor, den trainiert kaum jemand gezielt. */
    const known = Object.keys(window.MM_TRK_FINE || {}).filter(m => m !== "neck");
    const missing = known.filter(m => !load[m]);
    const ranked = known.filter(m => load[m]).sort((a, b) => load[b] - load[a]);

    const rows = ranked.map(m =>
      '<div class="msl-row"><span class="msl-label">' + esc(fineLabel(m)) + '</span>' +
      '<div class="msl-track"><div class="msl-fill" style="width:' + (load[m] / max * 100) + '%"></div></div>' +
      '<span class="msl-val mono">' + (Math.round(load[m] * 10) / 10) + '</span></div>').join("");

    return '<div class="card" style="margin-bottom:18px">' +
      '<h3 class="h-card" style="margin-bottom:4px">' + T("Muskelkarte (7 Tage)", "Muscle map (7 days)") + '</h3>' +
      '<p class="muted small" style="margin-bottom:14px">' +
        T("Sätze der letzten sieben Tage. Primärer Muskel zählt voll, unterstützender halb.",
          "Sets from the last seven days. Primary muscle counts fully, supporting muscle by half.") + '</p>' +
      '<div class="mmap-wrap">' +
        bodyViewHTML(BODY_FRONT, load, max, T("Vorderseite", "Front")) +
        bodyViewHTML(BODY_BACK, load, max, T("Rückseite", "Back")) +
      '</div>' +
      '<div class="mmap-legend">' + rows + '</div>' +
      (missing.length
        ? '<p class="mmap-gap"><strong>' + T("Diese Woche ohne Satz:", "No sets this week:") + '</strong> ' +
          missing.map(m => esc(fineLabel(m))).join(", ") + '</p>'
        : '<p class="mmap-gap mmap-gap-ok">' + T("Diese Woche kam jede Muskelgruppe dran.", "Every muscle group got work this week.") + '</p>') +
      '</div>';
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
      return '<div class="mini-stat"><span>' + tr(exById(id).name) + '</span><strong>' + (pr > 0 ? fmtW(pr) : "–") + '</strong></div>';
    }).join("");

    p.innerHTML =
      heatmapHTML() +
      '<div class="card" style="margin-bottom:18px"><h3 class="h-card" style="margin-bottom:14px">' + T("Volumen (8 Wochen)", "Volume (8 weeks)") + '</h3>' +
      '<div class="ins-bars">' + bars + '</div></div>' +
      '<div class="card" style="margin-bottom:18px"><h3 class="h-card" style="margin-bottom:14px">' + T("Sätze pro Muskelgruppe (7 Tage)", "Sets per muscle group (7 days)") + '</h3>' + muscleRows + '</div>' +
      '<div class="card"><h3 class="h-card" style="margin-bottom:14px">' + T("Kraft-Rekorde (e1RM)", "Strength records (e1RM)") + '</h3><div class="mini-stat-grid">' + coreRows + '</div></div>';

    /* Die Heatmap braucht die feinen Muskeln jeder geloggten Übung. Stammt
       eine davon aus der Bibliothek, muss die geladen sein — sonst fehlt
       genau die Zeile, die der Nutzer sucht. */
    if (libState === "idle" && S.sessions().some(s => (s.exercises || []).some(e => String(e.exId).indexOf("fx_") === 0))) {
      loadLibrary(() => { if (tab === "insights") renderInsights(p); });
    }
  }

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
        '<div style="display:flex;gap:12px;align-items:center"><button class="btn btn-dark btn-sm" data-repeat="' + s.id + '">↻ ' + T("Wiederholen", "Repeat") + '</button>' +
        '<button class="btn-link-del" data-delsess="' + s.id + '" style="background:none;border:none;color:var(--muted-2);font-size:0.78rem;text-decoration:underline;cursor:pointer">' + T("Löschen", "Delete") + '</button></div></div>' +
        s.exercises.map(e => '<div class="history-ex-line"><span>' + tr(exById(e.exId).name) + '</span>' +
          '<span class="sets">' + e.sets.map(x => (x.warmup ? "" : "") + dispW(x.weight) + "×" + x.reps).join(", ") + '</span></div>').join("") +
        (s.note ? '<p class="muted small" style="margin-top:8px;font-style:italic">„' + String(s.note).replace(/</g, "&lt;") + '"</p>' : '') +
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
     SCHLAF  (echter Schlaf-Tracker: Dauer, Qualität, Einschlafen, Erwachen,
     morgendliche Erholung, optional Ruhepuls/HRV — mit Verlauf, 7-Tage-Schnitt
     und konkreter Auswertung, die in Empfehlungen einfließt.)
     ========================================================================== */
  var SLEEP_QUALITY = [
    { v: 1, de: "sehr schlecht", en: "very poor" },
    { v: 2, de: "schlecht", en: "poor" },
    { v: 3, de: "okay", en: "okay" },
    { v: 4, de: "gut", en: "good" },
    { v: 5, de: "sehr gut", en: "very good" }
  ];
  var SLEEP_LATENCY = [
    { v: "instant", de: "sofort / < 15 Min", en: "instant / < 15 min" },
    { v: "normal", de: "15–30 Min", en: "15–30 min" },
    { v: "slow", de: "30–60 Min", en: "30–60 min" },
    { v: "hard", de: "> 60 Min", en: "> 60 min" }
  ];
  var SLEEP_WAKING = [
    { v: "none", de: "durchgeschlafen", en: "slept through" },
    { v: "once", de: "1–2× kurz wach", en: "woke 1–2× briefly" },
    { v: "often", de: "mehrfach wach", en: "woke repeatedly" },
    { v: "long", de: "lange wach gelegen", en: "awake for long" }
  ];
  function sleepQualityLabel(v) { var o = SLEEP_QUALITY.find(function (x) { return x.v === v; }); return o ? tr(o) : "—"; }
  function optList(arr, sel) {
    return arr.map(function (o) {
      var val = o.v, lab = (o.de != null) ? tr(o) : o.label;
      return '<option value="' + val + '"' + (String(val) === String(sel) ? " selected" : "") + '>' + lab + '</option>';
    }).join("");
  }
  function renderSleep(p) {
    /* Lokales Datum, nicht UTC: zwischen 00:00 und 02:00 Ortszeit landete
       der Eintrag sonst auf dem Vortag — Streak, Wochenkalender und die
       Heute-Karte blieben auf "nichts getan", und die Schlaf-Dedup
       überschrieb den echten Vortagseintrag. */
    var today = localYmd(new Date());
    p.innerHTML =
      '<div class="card" style="margin-bottom:20px"><h3 class="h-card" style="margin-bottom:6px">' + T("Schlaf erfassen", "Log sleep") + '</h3>' +
      '<p class="muted small" style="margin:0 0 16px">' + T("Schlaf ist dein größter Hormon- und Erholungs-Hebel. Trag ihn morgens in 20 Sekunden ein — der Verlauf zeigt dir dein echtes Muster.", "Sleep is your biggest hormone and recovery lever. Log it in 20 seconds each morning — the history shows your real pattern.") + '</p>' +
      '<div class="form-row"><div class="field"><label for="slDate">' + T("Nacht auf", "Night of") + '</label><input type="date" id="slDate" value="' + today + '"></div>' +
      '<div class="field"><label for="slDur">' + T("Schlafdauer", "Sleep duration") + ' (h)</label><input type="number" inputmode="decimal" step="0.25" id="slDur" placeholder="7.5"></div></div>' +
      '<div class="form-row"><div class="field"><label for="slQual">' + T("Subjektive Qualität", "Subjective quality") + '</label><select id="slQual">' + optList(SLEEP_QUALITY, 3) + '</select></div>' +
      '<div class="field"><label for="slMorning">' + T("Morgendliche Erholung", "Morning recovery") + '</label><select id="slMorning">' + optList(SLEEP_QUALITY, 3) + '</select></div></div>' +
      '<div class="form-row"><div class="field"><label for="slLat">' + T("Einschlafen", "Falling asleep") + '</label><select id="slLat">' + optList(SLEEP_LATENCY, "normal") + '</select></div>' +
      '<div class="field"><label for="slWake">' + T("Nächtliches Erwachen", "Night waking") + '</label><select id="slWake">' + optList(SLEEP_WAKING, "none") + '</select></div></div>' +
      '<div class="form-row"><div class="field"><label for="slRhr">' + T("Ruhepuls", "Resting HR") + ' (bpm) · <span class="muted">' + T("optional", "optional") + '</span></label><input type="number" inputmode="numeric" id="slRhr" placeholder="—"></div>' +
      '<div class="field"><label for="slHrv">HRV (ms) · <span class="muted">' + T("optional", "optional") + '</span></label><input type="number" inputmode="numeric" id="slHrv" placeholder="—"></div></div>' +
      '<div class="field" style="margin-bottom:14px"><label for="slNote">' + T("Notiz", "Note") + ' · <span class="muted">' + T("optional", "optional") + '</span></label><input type="text" id="slNote" placeholder="' + T("z. B. spät gegessen, Alkohol, Stress …", "e.g. late meal, alcohol, stress …") + '"></div>' +
      '<button class="btn btn-primary" id="slSave">' + T("Schlaf speichern", "Save sleep") + '</button></div>' +
      '<div id="sleepInsight"></div>' +
      '<div id="sleepList"></div>';

    p.querySelector("#slSave").addEventListener("click", function () {
      var dur = parseFloat(document.getElementById("slDur").value);
      if (!(dur > 0)) { MM.toast(T("Schlafdauer angeben", "Enter sleep duration")); return; }
      if (dur > 16) dur = 16;
      var date = document.getElementById("slDate").value || today;
      var list = S.sleep().filter(function (s) { return s.date !== date; }); // eine Nacht = ein Eintrag
      var rhr = parseInt(document.getElementById("slRhr").value, 10);
      var hrv = parseInt(document.getElementById("slHrv").value, 10);
      list.push({
        id: "s" + Date.now(), date: date, dur: Math.round(dur * 4) / 4,
        quality: parseInt(document.getElementById("slQual").value, 10),
        morning: parseInt(document.getElementById("slMorning").value, 10),
        latency: document.getElementById("slLat").value,
        waking: document.getElementById("slWake").value,
        rhr: isFinite(rhr) ? rhr : null, hrv: isFinite(hrv) ? hrv : null,
        note: document.getElementById("slNote").value.trim() || ""
      });
      S.saveSleep(list);
      MM.toast(T("Schlaf gespeichert", "Sleep saved"));
      renderPanel();
    });

    drawSleepInsight(p.querySelector("#sleepInsight"));
    drawSleepList(p.querySelector("#sleepList"));
  }
  function drawSleepInsight(box) {
    var all = S.sleep();
    if (!all.length) { box.innerHTML = ""; return; }
    var now = new Date(); var weekAgo = new Date(now.getTime() - 7 * 864e5);
    var last7 = all.filter(function (s) { return new Date(s.date) >= weekAgo; });
    var base = last7.length ? last7 : all.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 7);
    var avg = function (key) { var v = base.filter(function (s) { return s[key] != null; }); return v.length ? v.reduce(function (a, s) { return a + s[key]; }, 0) / v.length : null; };
    var aDur = avg("dur"), aQual = avg("quality"), aMorn = avg("morning"), aRhr = avg("rhr");
    var hardLat = base.filter(function (s) { return s.latency === "slow" || s.latency === "hard"; }).length;
    var wakeOften = base.filter(function (s) { return s.waking === "often" || s.waking === "long"; }).length;

    var st = function (num, label) { return '<div class="tstat"><div class="tstat-num text-grad">' + num + '</div><div class="tstat-label">' + label + '</div></div>'; };
    var stats = '<div class="stat-grid-tracker" style="margin-bottom:16px">' +
      st(aDur != null ? aDur.toFixed(1) + " h" : "—", T("Ø Schlaf (7 T.)", "Ø sleep (7 d)")) +
      st(aQual != null ? aQual.toFixed(1) + "/5" : "—", T("Ø Qualität", "Ø quality")) +
      st(aMorn != null ? aMorn.toFixed(1) + "/5" : "—", T("Ø Erholung", "Ø recovery")) +
      st(aRhr != null ? Math.round(aRhr) : "—", T("Ø Ruhepuls", "Ø resting HR")) +
      '</div>';

    // Auswertung: konkrete, priorisierte Empfehlung (fließt in die Recovery-Empfehlung ein)
    var tips = [];
    if (aDur != null && aDur < 6) tips.push(T("Dein Schnitt liegt unter 6 h — dauerhaft zu wenig Schlaf wird in Studien mit ungünstigeren Werten für Testosteron, Regeneration und Körperkomposition in Verbindung gebracht. Ziel: 7–9 h. Feste Schlafenszeit ist Hebel Nr. 1.", "Your average is under 6 h — the biggest brake on testosterone, recovery and fat loss. Target: 7–9 h. A fixed bedtime is lever #1."));
    else if (aDur != null && aDur < 7) tips.push(T("Mit im Schnitt unter 7 h lässt du Erholung liegen. 30–45 Min früher ins Bett bringt oft mehr als jedes Supplement.", "Averaging under 7 h leaves recovery on the table. Going to bed 30–45 min earlier often beats any supplement."));
    else if (aDur != null) tips.push(T("Deine Schlafdauer liegt im Zielbereich (7–9 h) — sehr gute Basis. Jetzt auf Konstanz und Qualität achten.", "Your sleep duration is in the target range (7–9 h) — great base. Now focus on consistency and quality."));
    if (hardLat >= 2) tips.push(T("Du brauchst oft > 30 Min zum Einschlafen: Koffein-Deadline früher legen, letzte 30 Min ohne Bildschirm, Schlafzimmer kühl & dunkel.", "You often need > 30 min to fall asleep: earlier caffeine cutoff, last 30 min screen-free, keep the bedroom cool & dark."));
    if (wakeOften >= 2) tips.push(T("Du wachst nachts häufig auf. Häufige mögliche Faktoren sind Alkohol am Abend und späte große Mahlzeiten — 2–3 h vor dem Schlafen meiden. Hält es über Wochen an, gehört es ärztlich abgeklärt.", "You wake up often at night. Common possible factors include evening alcohol and late large meals are the usual causes — avoid them 2–3 h before bed."));
    if (aQual != null && aQual < 3 && aDur != null && aDur >= 7) tips.push(T("Genug Stunden, aber schlechte Qualität — achte auf Alkohol, Raumtemperatur, Licht und einen regelmäßigen Rhythmus (auch am Wochenende).", "Enough hours but poor quality — check alcohol, room temperature, light and a regular rhythm (weekends too)."));
    if (!tips.length) tips.push(T("Solides Schlafmuster. Halte den Rhythmus stabil — Konstanz schlägt einzelne perfekte Nächte.", "Solid sleep pattern. Keep the rhythm stable — consistency beats single perfect nights."));

    box.innerHTML =
      '<div class="card" style="margin-bottom:20px;border-color:var(--accent-line)">' + stats +
      '<h4 class="h-card" style="font-size:1.02rem;margin:0 0 8px">💡 ' + T("Deine Schlaf-Auswertung", "Your sleep read-out") + '</h4>' +
      '<ul style="margin:0;padding-left:18px;display:grid;gap:7px">' + tips.map(function (t) { return '<li class="small" style="color:var(--muted)">' + t + '</li>'; }).join("") + '</ul></div>';
  }
  function drawSleepList(box) {
    var list = S.sleep().slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    if (!list.length) { box.innerHTML = '<p class="muted" style="text-align:center;padding:20px">' + T("Noch keine Nacht erfasst. Trag deine letzte Nacht ein.", "No night logged yet. Log your last night.") + '</p>'; return; }
    var latMap = {}, wakeMap = {};
    SLEEP_LATENCY.forEach(function (o) { latMap[o.v] = tr(o); });
    SLEEP_WAKING.forEach(function (o) { wakeMap[o.v] = tr(o); });
    var moon = function (dur) { return dur >= 7 ? "🌙" : dur >= 6 ? "🌗" : "🌘"; };
    box.innerHTML = list.map(function (s) {
      var extra = [];
      extra.push("💤 " + latMap[s.latency || "normal"]);
      extra.push("🌃 " + wakeMap[s.waking || "none"]);
      if (s.rhr) extra.push("❤️ " + s.rhr + " bpm");
      if (s.hrv) extra.push("📈 " + s.hrv + " ms");
      return '<div class="history-item"><div class="hi-head"><div><h4 style="font-size:1rem">' + moon(s.dur) + ' ' + s.dur.toFixed(2).replace(/\.00$/, "") + ' h · ' + sleepQualityLabel(s.quality) + '</h4>' +
        '<span class="hi-date">' + fmtDate(s.date) + '</span></div>' +
        '<button class="btn-link-del" data-delsl="' + s.id + '" style="background:none;border:none;color:var(--muted-2);font-size:0.78rem;text-decoration:underline;cursor:pointer">' + T("Löschen", "Delete") + '</button></div>' +
        '<div style="display:flex;gap:16px;flex-wrap:wrap;font-size:0.85rem;color:var(--muted)" class="mono">' + extra.map(function (e) { return '<span>' + e + '</span>'; }).join("") + '</div>' +
        (s.note ? '<div class="small muted" style="margin-top:6px">„' + s.note.replace(/</g, "&lt;") + '"</div>' : '') +
        '</div>';
    }).join("");
    box.querySelectorAll("[data-delsl]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (confirm(T("Eintrag löschen?", "Delete entry?"))) { S.saveSleep(S.sleep().filter(function (s) { return s.id !== b.dataset.delsl; })); renderPanel(); }
      });
    });
  }

  /* ==========================================================================
     CARDIO
     ========================================================================== */
  function renderCardio(p) {
    const distLabel = units() === "imperial" ? "mi" : "km";
    p.innerHTML =
      '<div class="card" style="margin-bottom:20px"><h3 class="h-card" style="margin-bottom:16px">' + T("Cardio-Einheit erfassen", "Log a cardio session") + '</h3>' +
      '<div class="form-row"><div class="field"><label for="cdType">' + T("Art", "Type") + '</label><select id="cdType">' +
      ['run|🏃 ' + T("Laufen", "Run"), 'bike|🚴 ' + T("Radfahren", "Cycling"), 'row|🚣 ' + T("Rudern", "Rowing"), 'walk|🚶 ' + T("Gehen", "Walking"), 'swim|🏊 ' + T("Schwimmen", "Swimming")]
        .map(o => { const [v, l] = o.split("|"); return '<option value="' + v + '">' + l + '</option>'; }).join("") + '</select></div>' +
      '<div class="field"><label for="cdDate">' + T("Datum", "Date") + '</label><input type="date" id="cdDate" value="' + localYmd(new Date()) + '"></div></div>' +
      '<div class="form-row"><div class="field"><label for="cdDist">' + T("Distanz", "Distance") + ' (' + distLabel + ')</label><input type="number" inputmode="decimal" id="cdDist" placeholder="' + (units() === "imperial" ? "3.1" : "5.0") + '"></div>' +
      '<div class="field"><label for="cdDur">' + T("Dauer", "Duration") + ' (min)</label><input type="number" inputmode="decimal" id="cdDur" placeholder="28"></div></div>' +
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
      /* Leeres Datumsfeld hiess bisher leerer String — der Eintrag stand danach
         dauerhaft als "Invalid Date" in der Liste. Heute ist die richtige
         Annahme, wie im Schlaf-Logger. */
      list.push({ id: "c" + Date.now(), date: document.getElementById("cdDate").value || localYmd(new Date()), type: document.getElementById("cdType").value, distanceKm: distKm, durationMin: dur });
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
      '<div class="form-row"><div class="field"><label for="bdW">' + T("Gewicht", "Weight") + ' (' + massU() + ')</label><input type="number" inputmode="decimal" id="bdW" placeholder="' + (units() === "imperial" ? "180" : "82") + '"></div>' +
      '<div class="field"><label for="bdWaist">' + T("Bauchumfang", "Waist") + ' (' + (units() === "imperial" ? "in" : "cm") + ')</label><input type="number" inputmode="decimal" id="bdWaist" placeholder="' + (units() === "imperial" ? "35" : "90") + '"></div></div>' +
      '<div class="form-row"><div class="field"><label for="bdBf">' + T("Körperfett", "Body fat") + ' (%)</label><input type="number" inputmode="decimal" id="bdBf" placeholder="18"></div>' +
      '<div class="field"><label for="bdDate">' + T("Datum", "Date") + '</label><input type="date" id="bdDate" value="' + localYmd(new Date()) + '"></div></div>' +
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
      ' <button class="btn-link-del" data-delbd="' + b.id + '" aria-label="' + T("Eintrag löschen", "Delete entry") + '" style="background:none;border:none;color:var(--muted-2);font-size:0.75rem;text-decoration:underline;cursor:pointer;margin-left:10px">✕</button></span></div>').join("");
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
      (isCustom ? '<button class="btn-link-del" data-deltpl="' + t.id + '" aria-label="' + T("Plan löschen", "Delete routine") + '" style="background:none;border:none;color:var(--muted-2);font-size:0.75rem;text-decoration:underline;cursor:pointer">✕</button>' : '') + '</div>' +
      '<div style="margin:8px 0 14px">' + t.exIds.map(id => '<div class="template-ex">· ' + tr(exById(id).name) + '</div>').join("") + '</div>' +
      '<button class="btn btn-dark btn-sm btn-block" data-starttpl="' + t.id + '">' + T("Starten", "Start") + '</button></div>';
  }
  function openTemplateBuilder() {
    let modal = document.getElementById("tplModal");
    if (!modal) { modal = document.createElement("div"); modal.id = "tplModal"; modal.className = "modal-overlay"; document.body.appendChild(modal); }
    const chosen = [];
    const redraw = () => {
      modal.querySelector("#tplChosen").innerHTML = chosen.length ? chosen.map((id, i) => '<span class="chip" style="margin:3px">' + tr(exById(id).name) + ' <button data-rm="' + i + '" aria-label="' + T("Übung entfernen", "Remove exercise") + '" style="background:none;border:none;color:var(--muted);cursor:pointer">✕</button></span>').join("") : '<span class="muted small">' + T("Noch keine Übung gewählt", "No exercise chosen yet") + '</span>';
      modal.querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", () => { chosen.splice(+b.dataset.rm, 1); redraw(); }));
    };
    modal.innerHTML = '<div class="modal-box"><div class="modal-head"><h3 class="h-card">' + T("Eigenen Plan erstellen", "Create routine") + '</h3><button class="cart-close" id="tplClose" aria-label="' + T("Plan-Editor schließen", "Close routine editor") + '">✕</button></div>' +
      '<div class="field"><label for="tplName">' + T("Name des Plans", "Routine name") + '</label><input type="text" id="tplName" placeholder="' + T("z. B. Oberkörper Dienstag", "e.g. Upper Body Tuesday") + '"></div>' +
      '<div class="field"><label for="tplAdd">' + T("Übungen", "Exercises") + '</label><div id="tplChosen" style="margin-bottom:10px"></div>' +
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
    const data = { sessions: S.sessions(), cardio: S.cardio(), sleep: S.sleep(), body: S.body(), templates: S.templates(), customEx: S.customEx() };
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
        if (d.sleep) S.saveSleep(d.sleep);
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
