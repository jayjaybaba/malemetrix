/* ==========================================================================
   MaleMetrix — 12-Wochen-Programm (Zugang + Fortschritt + Rendering)
   --------------------------------------------------------------------------
   - Zugang über den Code aus config.js (courseAccessCode). Einfacher, geteilter
     Code — kein echter Kopierschutz. Für automatische Auslieferung + Schutz
     später eine Programmplattform (elopage, Copecart, Digistore24) nutzen.
   - Fortschritt (abgehakte Aufgaben) wird lokal im Browser gespeichert.
   - Inhalt kommt komplett aus js/course-data.js (window.MM_COURSE).
   ========================================================================== */

(function () {
  "use strict";

  const CFG = window.MM_CONFIG || {};
  const DATA = window.MM_COURSE || { weeks: [], phases: {}, modules: [] };
  const gate = document.getElementById("courseGate");
  const content = document.getElementById("courseContent");
  if (!gate || !content) return;

  function norm(s) { return String(s || "").trim().toUpperCase().replace(/\s+/g, ""); }
  const CODE = norm(CFG.courseAccessCode || "");
  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  /* ---------- Zugang ---------- */
  function isUnlocked() { return MM.store.get("course_unlocked", false) === true; }
  function unlock() { MM.store.set("course_unlocked", true); }

  /* ---------- Fortschritt ---------- */
  function progress() { return MM.store.get("course_progress", {}) || {}; }
  function saveProgress(p) { MM.store.set("course_progress", p); }
  function tkey(w, i) { return "w" + w + "_t" + i; }
  function totalTodos() { return DATA.weeks.reduce((n, w) => n + (w.todos ? w.todos.length : 0), 0); }
  function doneCount() { const p = progress(); return Object.keys(p).filter(k => p[k]).length; }
  function weekDone(w) {
    const p = progress();
    return w.todos.length > 0 && w.todos.every((_, i) => p[tkey(w.week, i)]);
  }

  /* ---------- Gate-Ansicht ---------- */
  function showGate() {
    gate.hidden = false;
    content.hidden = true;

    const input = document.getElementById("courseCode");
    const err = document.getElementById("courseCodeError");
    const btn = document.getElementById("courseUnlockBtn");
    const buy = document.getElementById("courseBuyBtn");

    function tryUnlock() {
      const val = norm(input.value);
      if (!CODE) {
        err.textContent = "Es ist noch kein Zugangscode hinterlegt. Bitte trage in js/config.js einen courseAccessCode ein.";
        err.style.display = "block";
        return;
      }
      if (val && val === CODE) {
        unlock();
        if (MM.track) MM.track("course_unlocked", {});
        MM.toast("Programm freigeschaltet — viel Erfolg!");
        showContent();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        err.textContent = "Code nicht erkannt. Bitte prüfe deine Bestellbestätigung — Groß-/Kleinschreibung ist egal.";
        err.style.display = "block";
        input.classList.add("invalid");
        if (MM.track) MM.track("course_code_failed", {});
      }
    }

    btn.addEventListener("click", tryUnlock);
    input.addEventListener("keydown", e => { if (e.key === "Enter") tryUnlock(); });
    input.addEventListener("input", () => { err.style.display = "none"; input.classList.remove("invalid"); });
    if (buy) buy.addEventListener("click", () => { if (MM.cart) MM.cart.add("kurs-12w", 1); });
  }

  /* ---------- Render-Bausteine ---------- */
  function renderIntro() {
    const x = DATA.intro;
    if (!x) return "";
    const pillars = (x.pillars || []).map(p =>
      '<div class="course-pillar"><span class="course-pillar-icon">' + p.icon + "</span>" +
      "<h4>" + esc(p.name) + "</h4><p>" + esc(p.text) + "</p></div>"
    ).join("");
    const how = (x.how || []).map(s => "<li>" + esc(s) + "</li>").join("");
    return '<section class="course-intro card reveal">' +
      '<span class="eyebrow">' + esc(x.eyebrow || "") + "</span>" +
      '<h2 class="h-section" style="margin-bottom:12px">' + esc(x.title) + "</h2>" +
      '<p class="lead">' + esc(x.lead) + "</p>" +
      '<div class="course-pillars">' + pillars + "</div>" +
      (x.science ? '<div class="course-science"><span class="course-science-label">📊 Was die Studienlage zeigt</span><p>' + esc(x.science) + "</p></div>" : "") +
      (how ? '<div class="course-how"><span class="course-block-label">So nutzt du das Programm</span><ol>' + how + "</ol></div>" : "") +
      (x.promise ? '<p class="course-promise muted">' + esc(x.promise) + "</p>" : "") +
      "</section>";
  }

  function phaseDivider(phaseKey) {
    const ph = (DATA.phases || {})[phaseKey];
    if (!ph) return "";
    return '<div class="course-phase-divider reveal" style="--phase:' + (ph.color || "#2e7cf6") + '">' +
      '<span class="course-phase-name">' + esc(ph.name) + "</span>" +
      (ph.weeks ? '<span class="course-phase-weeks">' + esc(ph.weeks) + "</span>" : "") +
      "</div>";
  }

  function phaseChip(phaseKey) {
    const ph = (DATA.phases || {})[phaseKey];
    if (!ph) return "";
    return '<span class="course-phase-chip" style="--phase:' + (ph.color || "#2e7cf6") + '">' + esc(ph.name) + "</span>";
  }

  function weekCard(w) {
    const p = progress();
    const done = weekDone(w);

    const todos = w.todos.map((t, i) => {
      const checked = !!p[tkey(w.week, i)];
      return '<label class="checkbox-row' + (checked ? " checked" : "") + '">' +
        '<input type="checkbox" data-w="' + w.week + '" data-i="' + i + '"' + (checked ? " checked" : "") + ">" +
        "<span>" + esc(t) + "</span></label>";
    }).join("");

    const lesson = (w.lesson || []).map(par => "<p>" + esc(par) + "</p>").join("");

    const meta = [
      ["🏋️", "Training", w.train],
      ["🍳", "Ernährung", w.fuel],
      ["😴", "Recovery", w.recovery],
      ["🧠", "Routine & Verhalten", w.behavior]
    ].filter(m => m[2]).map(m =>
      '<div class="course-meta"><span class="course-meta-label">' + m[0] + " " + m[1] + "</span><p>" + esc(m[2]) + "</p></div>"
    ).join("");

    const checkin = w.checkin ? '<div class="course-checkin"><span class="course-checkin-label">📋 Wochen-Check-in</span><span>' + esc(w.checkin) + "</span></div>" : "";
    const note = w.note ? '<div class="alert alert-warn course-note"><span class="alert-icon">⚕️</span><div>' + esc(w.note) + "</div></div>" : "";
    const science = w.science ? '<div class="course-science"><span class="course-science-label">📊 Was die Studienlage zeigt</span><p>' + esc(w.science) + "</p></div>" : "";
    const resources = resourceBlock(DATA.resources && DATA.resources.weeks ? DATA.resources.weeks[w.week] : null);

    return '<article class="course-week card reveal' + (done ? " is-done" : "") + '" id="woche-' + w.week + '">' +
      '<div class="course-week-head">' +
      '<span class="course-week-no">Woche ' + w.week + "</span>" +
      phaseChip(w.phase) +
      '<span class="course-week-check" aria-hidden="true">✓ erledigt</span>' +
      "</div>" +
      '<h2 class="h-card course-week-title">' + esc(w.title) + "</h2>" +
      '<p class="course-focus">' + esc(w.focus) + "</p>" +
      science +
      (lesson ? '<div class="course-lesson">' + lesson + "</div>" : "") +
      '<div class="course-todos" data-week="' + w.week + '">' +
      '<span class="course-block-label">Diese Woche erledigen</span>' + todos +
      "</div>" +
      '<div class="course-meta-grid">' + meta + "</div>" +
      checkin +
      resources +
      note +
      "</article>";
  }

  function resourceBlock(items) {
    if (!items || !items.length) return "";
    var ICON = { ebook: "📕", check: "🎯", tool: "🧮", tracker: "📈", page: "📄" };
    var links = items.map(function (r) {
      var ext = (r.kind === "ebook" || /\.pdf/i.test(r.href || "")) ? ' target="_blank" rel="noopener"' : "";
      return '<a class="course-res course-res-' + (r.kind || "ebook") + '" href="' + r.href + '"' + ext + '>' +
        "<span>" + (ICON[r.kind] || "🔗") + "</span>" + esc(r.label) + "</a>";
    }).join("");
    return '<div class="course-resources"><span class="course-block-label">Vertiefen &amp; Tools</span>' +
      '<div class="course-res-list">' + links + "</div></div>";
  }

  function renderModules() {
    const mods = DATA.modules || [];
    if (!mods.length) return "";
    const cards = mods.map(m => {
      const body = (m.body || []).map(par => "<p>" + esc(par) + "</p>").join("");
      const callout = m.callout
        ? '<div class="module-callout module-callout-' + (m.callout.type === "warn" ? "warn" : "info") + '">' +
          "<span>" + (m.callout.type === "warn" ? "⚠️" : "ℹ️") + "</span><p>" + esc(m.callout.text) + "</p></div>"
        : "";
      const tease = m.coachingTease
        ? '<div class="coaching-tease"><span class="coaching-tease-label">🔒 Mehr im 1:1-Coaching</span><p>' + esc(m.coachingTease) + "</p>" +
          '<a href="coaching.html" class="btn btn-sm btn-primary">Coaching ansehen</a></div>'
        : "";
      const eb = (DATA.resources && DATA.resources.modules) ? DATA.resources.modules[m.id] : null;
      const ebookLink = eb ? '<a class="course-module-ebook" href="' + eb.href + '" target="_blank" rel="noopener">📕 ' + esc(eb.label) + " →</a>" : "";
      return '<article class="course-module card reveal">' +
        '<div class="course-module-head"><span class="course-module-icon">' + m.icon + "</span>" +
        '<div><span class="course-module-kicker">' + esc(m.kicker || "") + "</span>" +
        '<h3 class="h-card">' + esc(m.title) + "</h3></div></div>" +
        '<div class="course-module-body">' + body + "</div>" +
        ebookLink + callout + tease +
        "</article>";
    }).join("");
    return '<section class="course-library">' +
      '<div class="course-phase-divider reveal" style="--phase:#8b7bf0"><span class="course-phase-name">Wissens-Bibliothek</span>' +
      '<span class="course-phase-weeks">Das Warum hinter dem System</span></div>' +
      cards + "</section>";
  }

  function renderCta() {
    const c = DATA.coachingCta;
    if (!c) return "";
    const points = (c.points || []).map(s => "<li>" + esc(s) + "</li>").join("");
    const a1 = c.ctaPrimary ? '<a href="' + c.ctaPrimary.href + '" class="btn btn-primary btn-lg btn-arrow">' + esc(c.ctaPrimary.label) + "</a>" : "";
    const a2 = c.ctaSecondary ? '<a href="' + c.ctaSecondary.href + '" class="btn btn-ghost btn-lg">' + esc(c.ctaSecondary.label) + "</a>" : "";
    return '<section class="course-coaching-cta reveal">' +
      '<span class="eyebrow" style="justify-content:center">' + esc(c.eyebrow || "") + "</span>" +
      '<h2 class="h-section">' + esc(c.title) + "</h2>" +
      '<p class="lead">' + esc(c.lead) + "</p>" +
      '<ul class="check-list course-cta-list">' + points + "</ul>" +
      (c.note ? '<p class="muted course-cta-note">' + esc(c.note) + "</p>" : "") +
      '<div class="hero-ctas" style="justify-content:center">' + a1 + a2 + "</div>" +
      "</section>";
  }

  /* ---------- Fortschrittsbalken ---------- */
  function renderProgress() {
    const box = document.getElementById("courseProgress");
    if (!box) return;
    const total = totalTodos();
    const done = doneCount();
    const pct = total ? Math.round((done / total) * 100) : 0;
    const weeksDone = DATA.weeks.filter(weekDone).length;
    box.innerHTML =
      '<div class="course-progress-top"><span><strong>' + done + "</strong> von " + total + " Aufgaben erledigt</span>" +
      "<span>" + weeksDone + " / " + DATA.weeks.length + " Wochen komplett · " + pct + "%</span></div>" +
      '<div class="course-bar"><div class="course-bar-fill" style="width:' + pct + '%"></div></div>';
  }

  /* ---------- Inhalt zusammenbauen ---------- */
  function showContent() {
    gate.hidden = true;
    content.hidden = false;

    let html = renderIntro();
    let lastPhase = null;
    DATA.weeks.forEach(w => {
      if (w.phase !== lastPhase) { html += phaseDivider(w.phase); lastPhase = w.phase; }
      html += weekCard(w);
    });
    html += renderModules();
    html += renderCta();

    document.getElementById("courseWeeks").innerHTML = html;
    renderProgress();

    // Häkchen speichern (Event-Delegation)
    document.getElementById("courseWeeks").addEventListener("change", e => {
      const cb = e.target;
      if (!cb.matches('input[type="checkbox"][data-w]')) return;
      const p = progress();
      const k = tkey(cb.dataset.w, cb.dataset.i);
      if (cb.checked) p[k] = true; else delete p[k];
      saveProgress(p);
      cb.closest(".checkbox-row").classList.toggle("checked", cb.checked);
      const wNum = Number(cb.dataset.w);
      const wData = DATA.weeks.find(x => x.week === wNum);
      const card = document.getElementById("woche-" + wNum);
      if (card && wData) card.classList.toggle("is-done", weekDone(wData));
      renderProgress();
    });

    // Fortschritt zurücksetzen
    const reset = document.getElementById("courseReset");
    if (reset && !reset._bound) {
      reset._bound = true;
      reset.addEventListener("click", () => {
        if (!confirm("Wirklich den gesamten Fortschritt zurücksetzen? Alle Häkchen werden entfernt.")) return;
        saveProgress({});
        showContent();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // Reveal-Animation anstoßen
    document.querySelectorAll("#courseContent .reveal").forEach(el => el.classList.add("visible"));
  }

  /* ---------- Start ---------- */
  try {
    const urlCode = norm(new URLSearchParams(location.search).get("code") || "");
    if (urlCode && CODE && urlCode === CODE) {
      unlock();
      history.replaceState(null, "", location.pathname);
    }
  } catch (e) { /* noop */ }

  if (isUnlocked()) showContent();
  else showGate();
})();
