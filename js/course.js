/* ==========================================================================
   MaleMetrix — 12-Wochen-Programm (Zugang + Fortschritt + Rendering)
   --------------------------------------------------------------------------
   - Der Programminhalt liegt AES-verschlüsselt in der Seite (#courseVault);
     der Zugangscode ist der Schlüssel (js/vault.js) und steht nirgends im
     ausgelieferten Code. Falscher Code ⇒ Entschlüsselung schlägt fehl.
   - Fortschritt (abgehakte Aufgaben) wird lokal im Browser gespeichert.
   - Inhalt (window.MM_COURSE) wird nach Freischaltung aus dem Vault geladen.
   ========================================================================== */

(function () {
  "use strict";

  // Ausgeblendete Ebooks: hier gelistete Dateien werden NICHT als Programm-
  // Ressource angezeigt (Dateien bleiben erhalten — nur unsichtbar). Zum
  // Wieder-Einblenden Eintrag aus dieser Liste entfernen.
  const HIDDEN_EBOOKS = [
    "gewohnheiten.html", "protein-system.html", "training-system.html",
    "fettabbau.html", "schlaf-energie.html", "masterguide.html"
  ];
  function isHiddenEbook(href) {
    return !!href && HIDDEN_EBOOKS.some(function (h) { return href.indexOf("ebooks/" + h) >= 0; });
  }

  let DATA = { weeks: [], phases: {}, modules: [] };
  const gate = document.getElementById("courseGate");
  const content = document.getElementById("courseContent");
  if (!gate || !content) return;

  function norm(s) { return MM.vault ? MM.vault.norm(s) : String(s || "").trim().toUpperCase().replace(/\s+/g, ""); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  /* ---------- Zugang: Code entschlüsselt den Inhalt (Vault) ---------- */
  async function tryCode(code) {
    const c = norm(code);
    if (!c || !window.MM || !MM.vault) return false;
    try {
      const js = await MM.vault.open("courseVault", c);
      (0, eval)(js); // eigener, per GCM-Auth verifizierter Inhalt
      DATA = window.MM_COURSE || DATA;
      MM.store.set("course_code", c);
      return true;
    } catch (e) { return false; }
  }

  /* ---------- Modus (CUT/RECOMP/BUILD/PERFORM) ---------- */
  function currentMode() {
    const items = (DATA.modes && DATA.modes.items) || {};
    const def = (DATA.modes && DATA.modes["default"]) || "recomp";
    const saved = MM.store.get("course_mode", "");
    return items[saved] ? saved : def;
  }

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

    async function tryUnlock() {
      if (await tryCode(input.value)) {
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
    if (buy) buy.addEventListener("click", () => { location.href = "protokoll.html"; });
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

  function renderModeSelector() {
    const md = DATA.modes;
    if (!md || !md.items) return "";
    const active = currentMode();
    const order = md.order || Object.keys(md.items);
    const btns = order.map(k => {
      const it = md.items[k];
      if (!it) return "";
      return '<button type="button" class="course-mode-btn' + (k === active ? " is-active" : "") + '" data-mode="' + k + '">' +
        '<span class="course-mode-label">' + esc(it.label) + "</span>" +
        '<span class="course-mode-tag">' + esc(it.tag) + "</span></button>";
    }).join("");
    const cur = md.items[active] || {};
    return '<section class="course-mode card reveal" id="courseMode">' +
      '<span class="eyebrow">' + esc(md.eyebrow || "") + "</span>" +
      '<h2 class="h-section" style="margin-bottom:8px">' + esc(md.title || "Wähle deinen Modus") + "</h2>" +
      (md.lead ? '<p class="lead">' + esc(md.lead) + "</p>" : "") +
      '<div class="course-mode-grid">' + btns + "</div>" +
      '<div class="course-mode-active"><span class="course-mode-active-label">Dein Modus: ' + esc(cur.label || "") + "</span>" +
      "<p>" + esc(cur.summary || "") + "</p></div>" +
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

    const mode = currentMode();
    const modeLabel = ((DATA.modes && DATA.modes.items && DATA.modes.items[mode]) || {}).label || mode;
    const modeNote = (w.byMode && w.byMode[mode])
      ? '<div class="course-modenote"><span class="course-modenote-label">🎯 In deinem Modus · ' + esc(modeLabel) + "</span><p>" + esc(w.byMode[mode]) + "</p></div>"
      : "";

    const checkin = w.checkin ? '<div class="course-checkin"><span class="course-checkin-label">📋 Sonntag-Review</span><span>' + esc(w.checkin) + " · Frag dich zum Wochenschluss: Was ist nächste Woche dein <strong>#1-Engpass</strong> — und was ist dein eine Hauptprojekt dagegen?</span></div>" : "";
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
      modeNote +
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
    items = (items || []).filter(function (r) { return !isHiddenEbook(r.href); });
    if (!items.length) return "";
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
      let eb = (DATA.resources && DATA.resources.modules) ? DATA.resources.modules[m.id] : null;
      if (eb && isHiddenEbook(eb.href)) eb = null;
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

  /* ---------- Chaos-Woche / Minimum Viable Week ---------- */
  function renderMinimumWeek() {
    const m = DATA.minimumWeek;
    if (!m) return "";
    const li = arr => (arr || []).map(x => "<li>" + esc(x) + "</li>").join("");
    return '<section class="course-minweek card reveal"><span class="eyebrow">' + esc(m.eyebrow || "") + "</span>" +
      '<h2 class="h-section" style="margin-bottom:6px">' + esc(m.title) + "</h2>" +
      '<p class="lead">' + esc(m.lead) + "</p>" +
      '<div class="grid-2" style="margin-top:14px">' +
      '<div><span class="course-block-label">Standard-Woche</span><ul class="check-list">' + li(m.standard) + "</ul></div>" +
      '<div><span class="course-block-label">Minimum Viable Week</span><ul class="check-list">' + li(m.minimum) + "</ul></div>" +
      "</div>" +
      (m.note ? '<p class="muted" style="margin-top:12px">' + esc(m.note) + "</p>" : "") +
      "</section>";
  }

  /* ---------- Recheck-Dashboard W0/4/8/12 (lokal, keine Interpretation) ---------- */
  const RECHECK_POINTS = [["w0", "Start (W0)"], ["w4", "Woche 4"], ["w8", "Woche 8"], ["w12", "Woche 12"]];
  const RECHECK_METRICS = [
    ["score", "MaleMetrix Score", "num"], ["weight", "Gewicht (kg)", "num"], ["waist", "Bauchumfang (cm)", "num"],
    ["strength", "Kraft-Marker", "txt"], ["cardio", "Cardio-Marker", "txt"], ["sleep", "Schlaf (h)", "num"],
    ["energy", "Energie (1–10)", "num"], ["bp", "Blutdruck (falls relevant)", "txt"], ["bottleneck", "#1-Engpass", "txt"]
  ];
  function rechecks() { return MM.store.get("course_rechecks", {}) || {}; }
  function saveRechecks(o) { MM.store.set("course_rechecks", o); }
  function renderRecheck() {
    const data = rechecks();
    const head = "<tr><th>Wert</th>" + RECHECK_POINTS.map(p => "<th>" + esc(p[1]) + "</th>").join("") + "</tr>";
    const rows = RECHECK_METRICS.map(m => {
      return "<tr><td>" + esc(m[1]) + "</td>" + RECHECK_POINTS.map(p => {
        const v = (data[p[0]] && data[p[0]][m[0]] != null) ? data[p[0]][m[0]] : "";
        const im = m[2] === "num" ? ' inputmode="decimal"' : "";
        return '<td><input class="rc-in" data-cp="' + p[0] + '" data-metric="' + m[0] + '" type="text"' + im + ' value="' + String(v).replace(/"/g, "&quot;") + '"></td>';
      }).join("") + "</tr>";
    }).join("");
    return '<section class="course-recheck card reveal"><span class="eyebrow">Recheck-Dashboard</span>' +
      '<h2 class="h-section" style="margin-bottom:6px">W0 → W4 → W8 → W12</h2>' +
      '<p class="lead">Trag deine wichtigsten Werte an den vier Messpunkten ein — alles bleibt lokal auf deinem Gerät. Keine medizinische Bewertung, nur eine ehrliche Antwort auf: <strong>Was hat sich bewegt?</strong></p>' +
      '<div class="course-recheck-scroll"><table class="course-recheck-table">' + head + rows + "</table></div>" +
      '<p class="small muted" style="margin-top:10px">Mach den MaleMetrix Score an jedem Messpunkt neu und trag ihn ein. Kraft-/Cardio-Marker frei wählen (z. B. „Bank 4×8@70 kg“ oder „5 km Zeit“).</p>' +
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
    html += renderModeSelector();
    html += renderMinimumWeek();
    html += renderRecheck();
    let lastPhase = null;
    DATA.weeks.forEach(w => {
      if (w.phase !== lastPhase) { html += phaseDivider(w.phase); lastPhase = w.phase; }
      html += weekCard(w);
    });
    html += renderModules();
    html += renderCta();

    const cw = document.getElementById("courseWeeks");
    cw.innerHTML = html;
    renderProgress();

    if (!cw._bound) {
      cw._bound = true;

      // Häkchen speichern (Event-Delegation)
      cw.addEventListener("change", e => {
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

      // Modus wählen (Event-Delegation) — speichert Modus, rendert neu
      cw.addEventListener("click", e => {
        const btn = e.target.closest(".course-mode-btn");
        if (!btn) return;
        MM.store.set("course_mode", btn.dataset.mode);
        if (MM.track) MM.track("course_mode_selected", { mode: btn.dataset.mode });
        showContent();
      });

      // Recheck-Dashboard: Werte lokal speichern (Event-Delegation)
      cw.addEventListener("input", e => {
        const inp = e.target;
        if (!inp.classList || !inp.classList.contains("rc-in")) return;
        const o = rechecks();
        const cp = inp.dataset.cp;
        if (!o[cp]) o[cp] = {};
        o[cp][inp.dataset.metric] = inp.value;
        saveRechecks(o);
      });
    }

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
  (async function boot() {
    let urlCode = "";
    try { urlCode = norm(new URLSearchParams(location.search).get("code") || ""); } catch (e) { /* noop */ }
    if (urlCode && await tryCode(urlCode)) {
      history.replaceState(null, "", location.pathname);
      showContent();
      return;
    }
    const saved = MM.store.get("course_code", "");
    if (saved && await tryCode(saved)) { showContent(); return; }
    showGate();
  })();
})();
