/* ==========================================================================
   MaleMetrix Score — Wizard-Engine, Scoring & Ergebnis-Dashboard
   ========================================================================== */

(function () {
  "use strict";

  const C = window.MM_CHECK;
  const $ = (sel) => document.querySelector(sel);

  /* Adaptive Schrittliste (V2): welche Fragen ueberhaupt sinnvoll sind,
     haengt von den bisherigen Antworten ab — Status, Kontext, Signale.
     Wird nach JEDER Antwort neu berechnet (progressive disclosure). */
  let steps = C.visibleSteps({});

  const state = {
    idx: 0,
    answers: MM.store.get("check_draft", {}) || {}
  };

  function currentId() { return steps[state.idx] ? steps[state.idx].q.id : null; }

  /* Schrittliste neu bauen und dabei die aktuelle Frage nicht verlieren. */
  function resyncSteps(keepId) {
    const id = keepId || currentId();
    steps = C.visibleSteps(state.answers);
    if (!steps.length) { state.idx = 0; return; }
    let i = steps.findIndex(s => s.q.id === id);
    if (i < 0) i = Math.min(state.idx, steps.length - 1);
    state.idx = Math.max(0, i);
  }

  /* ======================================================================
     SCORING — vollstaendig in der Engine (check-data.js), damit Dashboard,
     Report und Programm nie auseinanderlaufen.
     ====================================================================== */

  function computeScores(a) {
    const h = parseFloat(a.height), w = parseFloat(a.weight);
    a._bmi = (h && w) ? Math.round(w / Math.pow(h / 100, 2) * 10) / 10 : 0;
    const ev = C.evaluate(a);
    const waist = parseFloat(a.waist);
    const whtr = (waist && h) ? Math.round((waist / h) * 100) / 100 : null;
    return { ev, scores: ev.scores, total: ev.total, whtr };
  }

  /* ---------- Archetyp ---------- */

  function findArchetype(s, a, bottleneck) {
    for (const arch of C.archetypes) {
      try { if (arch.match(s, a)) return arch; } catch (e) { /* weiter */ }
    }
    const fbId = C.archetypeFallback[bottleneck.key] || "neustarter";
    return C.archetypes.find(x => x.id === fbId) || C.archetypes[C.archetypes.length - 1];
  }

  /* ---------- Red Flags (eine Quelle: C.redFlags) ---------- */

  function collectRedFlags(a) { return C.redFlags(a); }
  /* ======================================================================
     WIZARD-RENDERING
     ====================================================================== */

  function show(sectionId) {
    ["checkIntro", "checkConsent", "checkWizard", "checkResult"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = (id === sectionId) ? "" : "none";
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderProgress() {
    const progressPct = Math.round((state.idx / steps.length) * 100);
    $("#wizModule").textContent = steps[state.idx].mod.label;
    /* Die Gesamtzahl ist adaptiv — deshalb "ca.", statt eine feste Zahl
       zu versprechen, die sich je nach Antwort noch ändert. */
    $("#wizCount").textContent = "Frage " + (state.idx + 1) + " / ca. " + steps.length;
    $("#wizBar").style.width = progressPct + "%";
  }

  function renderStep() {
    if (!steps[state.idx]) resyncSteps();
    const { q } = steps[state.idx];
    const wrap = $("#wizBody");
    renderProgress();

    let html = '<div class="q-block">';
    html += '<span class="q-module-tag">' + steps[state.idx].mod.label + '</span>';
    html += '<h2 class="q-title">' + q.title + '</h2>';
    if (q.sub) html += '<p class="q-sub">' + q.sub + '</p>';

    if (q.type === "single") {
      html += '<div class="option-grid' + (q.options.length > 6 ? ' two-col' : '') + '">';
      q.options.forEach((o, i) => {
        const sel = String(state.answers[q.id]) === String(o.v) ? " selected" : "";
        html += '<button type="button" class="option-card' + sel + '" data-val="' + o.v + '">' +
          '<span class="opt-key">' + String.fromCharCode(65 + i) + '</span><span>' + o.label + '</span></button>';
      });
      html += '</div>';
    } else if (q.type === "multi") {
      html += '<div class="option-grid' + (q.options.length > 6 ? ' two-col' : '') + '">';
      const cur = state.answers[q.id] || [];
      q.options.forEach((o, i) => {
        const sel = cur.includes(o.v) ? " selected" : "";
        html += '<button type="button" class="option-card' + sel + '" data-val="' + o.v + '" data-multi="1">' +
          '<span class="opt-key">' + String.fromCharCode(65 + i) + '</span><span>' + o.label + '</span></button>';
      });
      html += '</div>';
    } else if (q.type === "scale") {
      const val = state.answers[q.id] || Math.round((q.min + q.max) / 2);
      html += '<div class="slider-wrap"><div class="slider-val" id="sliderVal">' + val + '</div>' +
        '<input type="range" id="sliderInput" min="' + q.min + '" max="' + q.max + '" value="' + val + '">' +
        '<div class="slider-labels"><span>' + q.min + '</span><span>' + q.max + '</span></div></div>';
    } else if (q.type === "fields") {
      html += '<div class="form-row" style="grid-template-columns:1fr 1fr;">';
      q.fields.forEach(f => {
        const cur = state.answers[f.id] !== undefined ? state.answers[f.id] : "";
        html += '<div class="field"><label for="f_' + f.id + '">' + f.label + (f.required ? "" : "") + '</label>';
        if (f.type === "select") {
          html += '<select id="f_' + f.id + '" data-field="' + f.id + '"' + (f.required ? " required" : "") + '>';
          html += '<option value="">Bitte wählen…</option>';
          f.options.forEach(([v, l]) => {
            html += '<option value="' + v + '"' + (String(cur) === v ? " selected" : "") + '>' + l + '</option>';
          });
          html += '</select>';
        } else if (f.type === "text") {
          html += '<input type="text" id="f_' + f.id + '" data-field="' + f.id + '" autocomplete="given-name" maxlength="40"' +
            ' placeholder="' + (f.placeholder || "") + '" value="' + String(cur).replace(/"/g, "&quot;") + '"' + (f.required ? " required" : "") + '>';
        } else {
          html += '<input type="number" id="f_' + f.id + '" data-field="' + f.id + '" min="' + f.min + '" max="' + f.max +
            '" placeholder="' + (f.placeholder || "") + '" value="' + cur + '"' + (f.required ? " required" : "") + ' inputmode="numeric">';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    html += '</div>';
    wrap.innerHTML = html;

    /* Events */
    if (q.type === "single") {
      wrap.querySelectorAll(".option-card").forEach(btn => {
        btn.addEventListener("click", () => {
          state.answers[q.id] = isNaN(btn.dataset.val) ? btn.dataset.val : (q.options.some(o => typeof o.v === "number") ? Number(btn.dataset.val) : btn.dataset.val);
          saveDraft();
          resyncSteps(q.id);
          wrap.querySelectorAll(".option-card").forEach(b => b.classList.remove("selected"));
          btn.classList.add("selected");
          setTimeout(next, 220);
        });
      });
    } else if (q.type === "multi") {
      wrap.querySelectorAll(".option-card").forEach(btn => {
        btn.addEventListener("click", () => {
          let cur = state.answers[q.id] || [];
          const v = btn.dataset.val;
          const opt = q.options.find(o => String(o.v) === v);

          if (opt.exclusive) {
            cur = cur.includes(v) ? [] : [v];
          } else {
            cur = cur.filter(x => !q.options.find(o => String(o.v) === String(x) && o.exclusive));
            if (cur.includes(v)) cur = cur.filter(x => x !== v);
            else {
              if (q.maxSelect && cur.length >= q.maxSelect) {
                MM.toast("Maximal " + q.maxSelect + " Auswahl möglich");
                return;
              }
              cur.push(v);
            }
          }
          state.answers[q.id] = cur;
          saveDraft();
          resyncSteps(q.id);
          wrap.querySelectorAll(".option-card").forEach(b => {
            b.classList.toggle("selected", cur.includes(b.dataset.val));
          });
        });
      });
    } else if (q.type === "scale") {
      const input = $("#sliderInput");
      input.addEventListener("input", () => {
        $("#sliderVal").textContent = input.value;
        state.answers[q.id] = parseInt(input.value, 10);
        saveDraft();
      });
      if (state.answers[q.id] === undefined) state.answers[q.id] = parseInt(input.value, 10);
    } else if (q.type === "fields") {
      wrap.querySelectorAll("[data-field]").forEach(el => {
        el.addEventListener("input", () => {
          state.answers[el.dataset.field] = el.value;
          el.classList.remove("invalid");
          saveDraft();
        });
        el.addEventListener("change", () => {
          state.answers[el.dataset.field] = el.value;
          el.classList.remove("invalid");
          saveDraft();
          resyncSteps();
        });
      });
    }

    $("#wizBack").style.visibility = state.idx === 0 ? "hidden" : "visible";
    $("#wizNext").textContent = state.idx === steps.length - 1 ? "Ergebnis berechnen →" : "Weiter →";
  }

  function validateStep() {
    const { q } = steps[state.idx];
    if (q.type === "single") {
      if (state.answers[q.id] === undefined) { MM.toast("Bitte wähle eine Antwort"); return false; }
    } else if (q.type === "multi") {
      const cur = state.answers[q.id] || [];
      if (!cur.length) { MM.toast("Bitte wähle mindestens eine Option"); return false; }
    } else if (q.type === "fields") {
      let ok = true;
      q.fields.forEach(f => {
        const el = document.getElementById("f_" + f.id);
        const val = state.answers[f.id];
        if (f.required && (!val || String(val).trim() === "")) { el.classList.add("invalid"); ok = false; }
        else if (f.type === "number" && val) {
          const n = parseFloat(val);
          if (isNaN(n) || n < f.min || n > f.max) { el.classList.add("invalid"); ok = false; }
        }
      });
      if (!ok) MM.toast("Bitte prüfe die markierten Felder");
      return ok;
    }
    return true;
  }

  function saveDraft() { MM.store.set("check_draft", state.answers); }

  function next() {
    if (!validateStep()) return;
    if (state.idx < steps.length - 1) {
      state.idx++;
      renderStep();
    } else {
      finish();
    }
  }

  function back() {
    if (state.idx > 0) { state.idx--; renderStep(); }
  }

  /* ======================================================================
     ABSCHLUSS & ERGEBNIS
     ====================================================================== */

  function finish() {
    const a = state.answers;
    const { ev, scores, total, whtr } = computeScores(a);
    const level = C.levelFor(total);
    const bn = ev.primaryBottleneck;
    const bottleneck = { key: bn.key, domain: bn.domain, name: bn.name, text: bn.text };
    const arch = findArchetype(scores, a, bottleneck);
    const flags = ev.flags;

    const sorted = Object.keys(scores).sort((x, y) => scores[x] - scores[y]);
    const result = {
      /* ---- Bestandsfelder: Form bleibt exakt erhalten (Report, Programm,
         Konto-Sync, Buchung, Ebook-Empfehlung lesen weiter dasselbe) ---- */
      date: new Date().toISOString(),
      total, scores, whtr,
      level: level.name,
      levelText: level.text,
      archetype: { id: arch.id, name: arch.name, tagline: arch.tagline, text: arch.text, offer: arch.offer, cta: arch.cta },
      plan: arch.plan,
      bottleneck,
      weakest: sorted.slice(0, 3),
      strongest: sorted[sorted.length - 1],
      flags,
      answers: a,
      /* ---- V2-Felder ---- */
      v: 2,
      status: ev.status,
      domains: ev.domains,
      dataGaps: ev.dataGaps,
      signals: ev.signals,
      confidence: ev.confidence,
      contextPanel: ev.contextPanel,
      primaryBottleneck: bn,
      secondaryPriorities: ev.secondaryPriorities,
      goalRecommendation: ev.goalRecommendation,
      deepLinks: ev.deepLinks
    };

    MM.store.set("check_result", result);
    const hist = MM.store.get("check_history", []);
    hist.push({ date: result.date, total, scores });
    MM.store.set("check_history", hist.slice(-12));
    MM.store.remove("check_draft");
    // Analytics-Invariante (§91.23): keine Gesundheits-/Score-WERTE an Analytics —
    // nur grobe Kategorien (Engpass-Domäne, Archetyp) für den Funnel.
    if (MM.track) MM.track("check_completed", { bottleneck: bottleneck.key, archetype: arch.id });
    // OS-Event (§61): Graph/Dashboards aktualisieren sich live, ohne Reload.
    if (MM.os && MM.os.emit) MM.os.emit("SCORE_COMPLETED", { score: total, bottleneck: bottleneck.key });
    else { try { document.dispatchEvent(new CustomEvent("mm:os", { detail: { name: "SCORE_COMPLETED", payload: { score: total } } })); } catch (e) {} }

    renderResult(result);
    show("checkResult");
  }

  /* ---------- SVG-Helfer ---------- */

  function radarSVG(scores) {
    const keys = ["body", "strength", "fuel", "recovery", "blood", "drive", "execution"];
    const cx = 170, cy = 165, R = 115;
    const pt = (i, val) => {
      const ang = (Math.PI * 2 * i / 7) - Math.PI / 2;
      const r = R * val / 100;
      return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
    };
    let svg = '<svg viewBox="0 0 340 330" width="100%" style="max-width:380px" role="img" aria-label="Radar-Diagramm deiner 7 Scores">';
    // Gitter
    [25, 50, 75, 100].forEach(lvl => {
      const pts = keys.map((_, i) => pt(i, lvl).join(",")).join(" ");
      svg += '<polygon points="' + pts + '" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>';
    });
    // Achsen
    keys.forEach((_, i) => {
      const [x, y] = pt(i, 100);
      svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x + '" y2="' + y + '" stroke="rgba(255,255,255,0.08)"/>';
    });
    // Wertefläche
    const valPts = keys.map((k, i) => pt(i, Math.max(scores[k], 4)).join(",")).join(" ");
    svg += '<polygon points="' + valPts + '" fill="rgba(46,124,246,0.25)" stroke="#2e7cf6" stroke-width="2"/>';
    keys.forEach((k, i) => {
      const [x, y] = pt(i, Math.max(scores[k], 4));
      svg += '<circle cx="' + x + '" cy="' + y + '" r="4" fill="#00c2ff"/>';
    });
    // Beschriftung
    keys.forEach((k, i) => {
      const [x, y] = pt(i, 122);
      const nm = (C.moduleNamesShort && C.moduleNamesShort[k]) || C.moduleNames[k];
      svg += '<text x="' + x + '" y="' + y + '" fill="#9aa4b5" font-size="10.5" font-family="JetBrains Mono,monospace" text-anchor="middle" dominant-baseline="middle">' +
        nm.toUpperCase() + '</text>';
    });
    svg += '</svg>';
    return svg;
  }

  function ringSVG(total) {
    const r = 84, circ = 2 * Math.PI * r;
    const off = circ * (1 - total / 100);
    return '<svg width="190" height="190" viewBox="0 0 190 190">' +
      '<defs><linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="#2e7cf6"/><stop offset="100%" stop-color="#00c2ff"/></linearGradient></defs>' +
      '<circle class="ring-bg" cx="95" cy="95" r="' + r + '" fill="none" stroke-width="12"/>' +
      '<circle class="ring-val" cx="95" cy="95" r="' + r + '" fill="none" stroke-width="12" ' +
      'stroke-dasharray="' + circ + '" stroke-dashoffset="' + circ + '" data-target="' + off + '"/></svg>';
  }

  /* Geteilte Logik aus check-data.js (EINE Quelle der Wahrheit) */
  const levelClass = C.levelClass;
  const moduleText = C.moduleText;
  const protTarget = C.protTarget;
  const stepTargetNum = C.stepTargetNum;
  const personalInsights = C.personalInsights;
  const dynamicPlan = C.dynamicPlan;

  /* ---------- V2: gespeichertes Ergebnis in die aktuelle Struktur heben ---
     Alte Ergebnisse (ohne V2-Felder) werden NICHT als "natural" oder
     "gesund" interpretiert. Sie werden aus ihren Antworten nachgerechnet;
     was damals nicht gefragt wurde, bleibt ausdrücklich unbekannt. */
  function hydrate(r) {
    if (r && r.v === 2 && r.domains && r.confidence && r.primaryBottleneck) {
      return {
        status: r.status || "unknown",
        domains: r.domains,
        dataGaps: r.dataGaps || [],
        confidence: r.confidence,
        contextPanel: r.contextPanel || C.contextPanel(r.answers || {}, r.domains, r.dataGaps || []),
        primaryBottleneck: r.primaryBottleneck,
        secondaryPriorities: r.secondaryPriorities || r.primaryBottleneck.secondary || [],
        goalRecommendation: r.goalRecommendation,
        deepLinks: r.deepLinks || C.deepLinks(r.answers || {}, r.primaryBottleneck, r.dataGaps || []),
        legacy: false
      };
    }
    const a = (r && r.answers) || {};
    try {
      const ev = C.evaluate(a);
      return {
        status: ev.status, domains: ev.domains, dataGaps: ev.dataGaps, confidence: ev.confidence,
        contextPanel: ev.contextPanel, primaryBottleneck: ev.primaryBottleneck,
        secondaryPriorities: ev.secondaryPriorities, goalRecommendation: ev.goalRecommendation,
        deepLinks: ev.deepLinks, legacy: true
      };
    } catch (e) {
      return {
        status: "unknown", domains: {}, dataGaps: [],
        confidence: { level: "LIMITED", label: "EINGESCHRÄNKT", reasons: ["Dieses Ergebnis stammt aus einer früheren Score-Version."] },
        contextPanel: { key: "unknown", title: "STATUS OFFEN", verdict: "NEUTRALE EINORDNUNG", band: "neutral", lines: [] },
        primaryBottleneck: { domain: (r && r.bottleneck && r.bottleneck.key) || "execution", key: (r && r.bottleneck && r.bottleneck.key) || "execution", name: (r && r.bottleneck && r.bottleneck.name) || "Umsetzung", text: (r && r.bottleneck && r.bottleneck.text) || "", secondary: [] },
        secondaryPriorities: [],
        goalRecommendation: { mode: (r && r.plan) || "recomp", trainingMode: (r && r.plan) || "recomp", label: "", desc: "", reason: "" },
        deepLinks: [], legacy: true
      };
    }
  }

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- Ergebnis rendern ---------- */

  function renderResult(r) {
    const el = $("#checkResult");
    const keys = ["body", "strength", "fuel", "recovery", "blood", "drive", "execution"];
    const prev = (MM.store.get("check_history", []) || []).slice(0, -1).pop();
    const firstName = ((r.answers && r.answers.name) || "").trim().split(/\s+/)[0].slice(0, 24);

    const V = hydrate(r);
    const nm = (k) => (C.moduleNamesDe && C.moduleNamesDe[k]) || C.moduleNames[k];
    const sortedDesc = keys.slice().sort((x, y) => r.scores[y] - r.scores[x]);
    const strengths = sortedDesc.slice(0, 3);
    const topVal = r.scores[strengths[0]] || 0;
    const bKey = r.bottleneck.key;
    const ans = r.answers || {};
    const dc = C.dataConfidence(ans);
    const tv = C.targetValues(ans);
    const statusLabel = (C.statusLabels[V.status] || C.statusLabels.unknown).short;
    const confColorOf = (lvl) => lvl === "HIGH" ? "var(--status-improving,#2dd4a7)" : lvl === "MODERATE" ? "var(--status-attention,#f5b54a)" : "var(--status-flag,#f06a6a)";

    let html = '';

    /* ---------- 1. HERO (P14): Data-as-Design — die Zahl IST das Layout ---
       Massives Score-Readout + Mono-Systemzeile statt Ring-in-Karte.
       Darunter EIN Limiter-Band: der Engpass dominiert, nicht 4 Chips. */
    html += '<div class="os14-score-hero">' +
      '<div class="sys">MM / SCORE' + (firstName ? '<span class="who">' + firstName.toUpperCase() + '</span>' : '') + '</div>' +
      '<div class="read"><span class="num">' + r.total + '<small>/100</small></span>' +
      '<div class="lvl"><b>' + r.level + '</b><span>' + r.levelText + '</span>' +
      (prev ? '<span class="delta ' + (r.total >= prev.total ? 'up' : 'down') + '">LETZTER CHECK ' + prev.total + ' → ' + r.total + '</span>' : '') + '</div></div>' +
      '<div class="limiter"><span class="k">PRIMARY LIMITER</span><b>' + esc(V.primaryBottleneck.name).toUpperCase() + '</b><span class="v">' + (V.primaryBottleneck.value != null ? V.primaryBottleneck.value : "") + '</span></div>' +
      '</div>';

    /* ---------- V2-Kopfzeile: STATUS · ZIEL · CONFIDENCE ----------
       Drei Aussagen, die zusammen erst ein Ergebnis ergeben: In welchem
       Kontext lesen wir das, wohin geht die Richtung, und wie sicher
       ist die Einordnung überhaupt. */
    html += '<div class="grid-3 mm-v2-meta" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-bottom:22px">' +
      '<div class="card" style="padding:14px 16px"><span class="card-num">STATUS</span>' +
      '<h3 style="font-size:1.05rem;margin:4px 0 2px">' + esc(statusLabel) + '</h3>' +
      '<p class="small muted" style="margin:0">Kontext, kein Urteil — er kostet dich keinen Punkt.</p></div>' +
      '<div class="card" style="padding:14px 16px"><span class="card-num">EMPFOHLENE RICHTUNG</span>' +
      '<h3 style="font-size:1.05rem;margin:4px 0 2px">' + esc(V.goalRecommendation.label || tv.modeLabel) + '</h3>' +
      '<p class="small muted" style="margin:0">' + esc(V.goalRecommendation.desc || tv.modeDesc) + '</p></div>' +
      '<div class="card" style="padding:14px 16px;border-left:3px solid ' + confColorOf(V.confidence.level) + '"><span class="card-num">AUSSAGESICHERHEIT</span>' +
      '<h3 style="font-size:1.05rem;margin:4px 0 2px;color:' + confColorOf(V.confidence.level) + '">' + esc(V.confidence.label || V.confidence.level) + '</h3>' +
      '<p class="small muted" style="margin:0">' + esc((V.confidence.reasons || [])[0] || "") + '</p></div>' +
      '</div>';

    /* ---------- Red Flags (Sicherheit zuerst) ---------- */
    if (r.flags.length) {
      html += '<div class="alert alert-danger"><span class="alert-icon">⚕</span><div>' +
        '<strong>Bitte zuerst ärztlich abklären:</strong><ul style="margin-top:8px;display:grid;gap:6px;list-style:disc;padding-left:18px">' +
        r.flags.map(f => '<li>' + f + '</li>').join('') +
        '</ul><p style="margin-top:10px;font-size:0.85rem">MaleMetrix unterstützt dich bei Training, Ernährung, Schlaf und Struktur — ersetzt aber keine medizinische Diagnostik oder Behandlung.</p></div></div>';
    }

    /* ---------- V2: DEIN PRIMÄRER ENGPASS ----------
       Nicht der niedrigste Wert, sondern die höchste Kombination aus
       Schwere, Gesundheitsrelevanz, Umsetzbarkeit und Zielbezug. */
    html += '<div class="card dash-block bottleneck-card" style="margin-bottom:22px">' +
      '<span class="card-num" style="color:var(--red)">DEIN PRIMÄRER ENGPASS' +
      (V.primaryBottleneck.value != null ? ' · ' + V.primaryBottleneck.value + '/100' : '') + '</span>' +
      '<h3 style="font-size:1.4rem;margin:2px 0 8px">' + esc(V.primaryBottleneck.name) + '</h3>' +
      '<p>' + esc(V.primaryBottleneck.text) + '</p>' +
      (V.primaryBottleneck.forced
        ? '<p class="small" style="margin-top:10px;color:var(--muted)"><strong style="color:var(--text)">Warum das vorgeht:</strong> Deine Angaben enthalten einen Kontrollpunkt, der Vorrang vor der reinen Punktzahl hat.</p>'
        : '') +
      ((V.secondaryPriorities || []).length
        ? '<p class="small" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line);color:var(--muted)"><strong style="color:var(--text)">Danach:</strong> ' +
            V.secondaryPriorities.slice(0, 3).map(s => esc(s.name) + (s.value != null ? ' (' + s.value + ')' : '')).join(' · ') + '</p>'
        : '') +
      '</div>';

    /* ---------- V2: SYSTEM SCORES (nur relevante Domains) ---------- */
    (function () {
      const order = C.domainKeys.concat(["enhancedControl", "therapyControl", "recoveryStatus"]);
      const rows = order.filter(d => V.domains[d] !== undefined && V.domains[d] !== null);
      if (!rows.length) return;
      html += '<div class="card dash-block" style="margin-bottom:22px">' +
        '<div class="mm-secthead" style="margin-top:0"><span class="sys">MM / SYSTEMS</span><span class="t">Deine Systeme im Einzelnen</span></div>' +
        '<p class="small muted" style="margin:0 0 12px">Nur die Bereiche, die für deinen Kontext tatsächlich erhoben wurden. Was nicht erfasst wurde, wird hier auch nicht behauptet.</p>' +
        '<div class="mm-sys">';
      rows.forEach(d => {
        const v = V.domains[d];
        const meta = C.domainMeta[d] || { name: d };
        const isPrimary = d === V.primaryBottleneck.domain;
        html += '<div class="row' + (isPrimary ? ' is-primary' : (v < 40 ? ' is-flag' : '')) + '">' +
          '<span class="id">' + esc(meta.name).toUpperCase() + '</span>' +
          '<div class="bar"><span style="width:' + v + '%"></span></div>' +
          '<span class="val">' + v + '/100</span></div>';
      });
      html += '</div></div>';
    })();

    /* ---------- V2: KONTEXT-PANEL (Natural / TRT / Enhanced / Rückkehr) --
       Misst KONTROLLQUALITÄT, nicht den Status. */
    (function () {
      const p = V.contextPanel;
      if (!p) return;
      const col = p.band === "good" ? "var(--green)" : p.band === "partial" ? "var(--accent-2)"
        : p.band === "neutral" ? "var(--accent)" : "var(--status-attention,#f5b54a)";
      html += '<div class="card dash-block" style="margin-bottom:22px;border-left:3px solid ' + col + '">' +
        '<span class="card-num" style="color:' + col + '">' + esc(p.title) + '</span>' +
        '<h3 style="font-size:1.2rem;margin:2px 0 8px">' + esc(p.verdict) +
        (p.value != null ? ' <span class="mono" style="color:var(--muted);font-size:0.9rem">· ' + p.value + '/100</span>' : '') + '</h3>' +
        (p.lines || []).map(l => '<p class="small muted" style="margin:0 0 6px">' + esc(l) + '</p>').join('') +
        '</div>';
    })();

    /* ---------- V2: DATENLÜCKEN — unbekannt ist nicht "normal" ---------- */
    (function () {
      const gaps = V.dataGaps || [];
      html += '<div class="card dash-block" style="margin-bottom:22px">' +
        '<span class="card-num">DATENLÜCKEN</span>';
      if (!gaps.length) {
        html += '<p class="small muted" style="margin:6px 0 0">Keine relevanten Lücken: Deine zentralen Angaben sind vollständig. Deshalb ist deine Aussagesicherheit hoch — nicht, weil alles gut ist, sondern weil wir es wirklich wissen.</p>';
      } else {
        html += '<p class="small muted" style="margin:6px 0 12px">Kein Grund zur Panik — aber auch kein Grund, das Beste anzunehmen. Was hier steht, ist <strong>nicht gemessen</strong>. Nicht gemessen heißt nicht „normal".</p>' +
          '<div class="mm-sys">' +
          gaps.slice(0, 6).map(g => '<div class="row' + (g.severity >= 3 ? ' is-flag' : '') + '">' +
            '<span class="id">' + esc(g.label).toUpperCase() + '</span>' +
            '<span class="val" style="flex:1;text-align:left;font-family:var(--font-body);letter-spacing:0;color:var(--muted)">' + esc(g.why) + '</span></div>').join('') +
          '</div>';
      }
      html += '</div>';
    })();

    /* ---------- V2: DEINE REIHENFOLGE ---------- */
    (function () {
      let orderSteps = [];
      try {
        orderSteps = C.orderOfOperations({
          flags: r.flags, dataGaps: V.dataGaps, primaryBottleneck: V.primaryBottleneck,
          goalRecommendation: V.goalRecommendation
        });
      } catch (e) { orderSteps = []; }
      if (!orderSteps.length) return;
      html += '<div class="card dash-block priority1" style="margin-bottom:22px">' +
        '<span class="card-num" style="color:var(--accent-2)">DEINE REIHENFOLGE</span>' +
        '<p class="small muted" style="margin:2px 0 14px">Nicht alles gleichzeitig. In dieser Reihenfolge.</p><ol class="prio-steps">' +
        orderSteps.map((s, i) => '<li><span class="prio-num">' + (i + 1) + '</span><span><strong>' + esc(s.t) + '</strong> — ' + esc(s.d) + '</span></li>').join('') +
        '</ol></div>';
    })();

    /* ---------- Empfohlener Weg (Modus) + Begründung ---------- */
    html += '<div class="card" style="margin-bottom:22px;border-color:var(--accent-line);background:var(--accent-soft)">' +
      '<span class="card-num">DEIN EMPFOHLENER WEG</span>' +
      '<h3 style="font-size:1.3rem;margin:4px 0 6px">' + esc(tv.modeLabel) + ' — ' + esc(tv.modeDesc) + '</h3>' +
      '<p class="small" style="margin:0 0 10px">' + esc(tv.modeReason) + '</p>' +
      (tv.mode === "health_first" && tv.bodyModeLabel
        ? '<p class="small" style="margin:0 0 10px;color:var(--muted)"><strong style="color:var(--text)">Körperrichtung parallel:</strong> ' + esc(tv.bodyModeLabel) + ' — ' + esc(tv.bodyReason) + '</p>'
        : '') +
      '<p class="small" style="margin:0 0 10px;font-family:var(--font-mono);font-size:0.66rem;letter-spacing:0.14em">CONFIDENCE: <strong style="color:' + confColorOf(V.confidence.level) + '">' + esc(V.confidence.label || V.confidence.level) + '</strong><span class="muted" style="letter-spacing:0;font-family:var(--font-body);font-size:0.8rem"> — ' + esc((V.confidence.reasons || []).join(" ")) + '</span></p>' +
      '<p class="small muted" style="margin:0"><strong>Bewegung:</strong> Jeden Tag ein Reiz oder gezielte Bewegung — 3 Tage gezieltes Krafttraining, die übrigen Tage Zone 2, Mobility, Spaziergänge/Steps oder aktive Regeneration. Nicht jeden Tag maximale Belastung.</p>' +
      '</div>';

    /* ---------- 2. PROFIL: Radar + diagnostische Systemliste (VS2) ----------
       Die 7 Bereiche sprechen die MaleMetrix-Systemsprache (.mm-sys):
       Mono-IDs, Hairlines, genau EIN Primary-Bottleneck-Highlight —
       Diagnose-Instrument statt Karten-Balken-Stapel. */
    html += '<div class="result-grid">' +
      '<div class="card"><h3 style="margin-bottom:6px">Dein Performance-Profil</h3><p class="small muted" style="margin-bottom:10px">7 Bereiche, ein Bild: je weiter außen, desto stärker.</p>' +
      '<div class="radar-wrap">' + radarSVG(r.scores) + '</div></div>' +
      '<div class="card"><div class="mm-secthead" style="margin-top:0"><span class="sys">MM / SYSTEMS</span><span class="t">Deine 7 Bereiche</span></div><div class="mm-sys">';
    keys.forEach(k => {
      const v = r.scores[k];
      const flag = v < 40 && k !== bKey;
      html += '<div class="row' + (k === bKey ? ' is-primary' : (flag ? ' is-flag' : '')) + '" title="' + C.moduleSubtitles[k] + '">' +
        '<span class="id">' + nm(k).toUpperCase() + '</span>' +
        '<div class="bar"><span style="width:' + v + '%"></span></div>' +
        '<span class="val">' + v + '/100</span></div>';
    });
    html += '</div></div></div>';

    /* ---------- 3. STÄRKSTE BEREICHE ---------- */
    html += '<div class="card dash-block" style="border-left:3px solid var(--green)">' +
      '<span class="card-num" style="color:var(--green)">' + (topVal >= 60 ? 'DEINE STÄRKSTEN BEREICHE' : 'DEINE BESTEN AUSGANGSPUNKTE') + '</span>' +
      '<div class="strength-grid">';
    strengths.forEach(k => {
      html += '<div class="strength-item"><div class="strength-head"><span class="strength-name">' + nm(k) + '</span>' +
        '<span class="strength-val">' + r.scores[k] + '<small>/100</small></span></div>' +
        '<p class="small muted" style="margin:6px 0 0">' + (C.strengthNotes[k] || moduleText(k, r.scores[k])) + '</p></div>';
    });
    html += '</div></div>';

    /* ---------- V2: KONTEXTUELLE VERTIEFUNG ----------
       Der Score findet den Engpass, DAS PROTOKOLL erklärt ihn. Nur die
       Kapitel, die zu Engpass UND Kontext passen — kein Link-Spam. */
    (function () {
      const links = (V.deepLinks || []).slice(0, 3);
      if (!links.length) return;
      html += '<div class="card dash-block" style="margin-bottom:22px">' +
        '<span class="card-num">WARUM DAS SO IST — DAS PROTOKOLL</span>' +
        '<p class="small muted" style="margin:2px 0 12px">Der Score findet den Engpass. Diese Kapitel erklären, warum er entsteht.</p>' +
        '<div style="display:grid;gap:10px">' +
        links.map(l => '<a href="' + l.href + '" data-track="protokoll_chapter_' + esc(l.key) + '" style="color:var(--accent-2);text-decoration:none;display:block">' +
          '<strong>Kapitel ' + esc(l.label) + '</strong> <span class="muted" style="color:var(--muted)">— ' + esc(l.why) + '</span> →</a>').join('') +
        '</div></div>';
    })();

    /* ---------- P13/P1.6 — DEIN NÄCHSTER SCHRITT: GENAU EINE Handlung ----
       Deterministisches Routing (C.nextStep): Red Flag → medizinisch;
       kein Konto → sichern; Konto ohne Zyklus → System starten;
       Zyklus aktiv → HEUTE. Alles andere ist sekundär. */
    (function () {
      const snap = (window.MM && MM.account && MM.account.snapshot) ? MM.account.snapshot() : { state: "local" };
      const activeCycle = !!((MM.store && MM.store.get("c2_start", "")) && MM.store.get("c2_goal", ""));
      const step = C.nextPath({
        hasScore: true, signedIn: snap.state === "signed_in", activeCycle: activeCycle,
        redFlags: r.flags.length > 0,
        healthFirst: V.goalRecommendation && V.goalRecommendation.mode === "health_first",
        bigDataGaps: (V.dataGaps || []).filter(g => g.severity >= 3).length >= 2
      });
      html += '<div class="card" style="margin-bottom:22px;text-align:center;border-color:var(--accent-line)">' +
        '<span class="card-num" style="justify-content:center;color:var(--accent-2)">DEIN NÄCHSTER SCHRITT</span>' +
        (step.href
          ? '<a class="btn btn-primary" style="margin:10px 0 6px" href="' + step.href + '" data-track="next_step_' + step.key + '">' + step.label + ' →</a>'
          : '<p style="font-weight:700;margin:10px 0 6px">' + step.label + '</p>') +
        (step.note ? '<p class="small muted" style="margin:4px 0 0">' + step.note + '</p>' : '') +
        '</div>';
    })();

    /* ---------- 5. PRIORITÄT #1 + 3 Schritte ---------- */
    const stepsArr = C.nextSteps[bKey] || C.nextSteps.execution;
    html += '<div class="card dash-block priority1"><span class="card-num" style="color:var(--accent-2)">DEINE PRIORITÄT #1</span>' +
      '<h3 style="margin:2px 0 4px">' + nm(bKey) + ' stabilisieren</h3>' +
      '<p class="small muted" style="margin-bottom:16px">Nicht alles auf einmal. Diese drei Schritte holen dir den größten Effekt — starte heute:</p>' +
      '<ol class="prio-steps">';
    stepsArr.forEach((st, i) => {
      html += '<li><span class="prio-num">' + (i + 1) + '</span><span>' + st + '</span></li>';
    });
    html += '</ol></div>';

    /* ---------- Was deine Antworten konkret zeigen (Personalisierung) ---------- */
    const insights = personalInsights(r.answers || {}, r);
    if (insights.length) {
      html += '<div class="card dash-block" style="border-left:3px solid var(--accent-2)">' +
        '<span class="card-num">WAS DEINE ANTWORTEN KONKRET ZEIGEN</span>' +
        '<div style="display:grid;gap:14px;margin-top:6px">' +
        insights.map(i => '<div style="display:flex;gap:14px;align-items:flex-start">' +
          '<div style="font-size:1.3rem;flex-shrink:0;line-height:1.4">' + i.icon + '</div>' +
          '<p style="color:var(--muted);font-size:0.95rem;margin:0">' + i.text + '</p></div>').join('') +
        '</div></div>';
    }

    /* ---------- 6. PERSONALISIERTE WEGE: erst Inhalte, dann Angebote ---------- */
    const res = C.resource[bKey] || C.resource.execution;
    html += '<h3 class="h-card" style="margin:38px 0 6px">Deine nächsten Schritte' + (firstName ? ', ' + firstName : '') + '</h3>' +
      '<p class="small muted" style="margin-bottom:18px">Passend zu deinem Engpass „' + r.bottleneck.name + '" — zuerst verstehen und umsetzen, ohne einen Cent:</p>' +
      '<div class="grid-2 next-content">' +
      '<a class="card path-card" href="' + res.read.href + '" data-track="score_path_read"><span class="path-tag">LESEN</span>' +
      '<h3 style="font-size:1.05rem;margin:6px 0 4px">' + res.read.label + '</h3>' +
      '<p class="small muted" style="margin:0">Kostenloser Guide zu deinem größten Hebel.</p></a>' +
      '<a class="card path-card" href="' + res.track.href + '" data-track="score_path_track"><span class="path-tag">TRACKEN</span>' +
      '<h3 style="font-size:1.05rem;margin:6px 0 4px">' + res.track.label + '</h3>' +
      '<p class="small muted" style="margin:0">Sichtbar machen, was du veränderst.</p></a>' +
      '</div>';

    /* ---------- 7-Tage-Plan ---------- */
    let planDays;
    try { planDays = dynamicPlan(r.answers || {}, r); } catch (e2) { planDays = r.plan; }
    if (!planDays || !planDays.length) planDays = r.plan;
    html += '<div class="card dash-block" style="margin-top:16px"><span class="card-num">DEIN PERSÖNLICHER 7-TAGE-PLAN</span>' +
      '<p class="small muted" style="margin-bottom:10px">Aus deinen Antworten gebaut — er packt zuerst deine größten Hebel an.</p>';
    planDays.forEach(d => {
      html += '<div class="plan-day"><div class="plan-day-num">' + d.day + '</div><ul>' +
        d.items.map(it => '<li>' + it + '</li>').join('') + '</ul></div>';
    });
    html += '</div>';

    /* ---------- 6b. Personalisierte Empfehlung + 2 Wege ---------- */
    const rec = C.productRecommendation(r);
    const recColor = rec.kind === 'medical' ? 'var(--red)' : (rec.kind === 'coaching' ? 'var(--accent-2)' : 'var(--accent)');
    html += '<h3 class="h-card" style="margin:38px 0 6px">Wenn du es strukturiert angehen willst</h3>' +
      '<div class="card dash-block" style="border-left:3px solid ' + recColor + ';margin-bottom:14px">' +
      '<span class="card-num" style="color:' + recColor + '">' + (rec.kind === 'medical' ? 'ZUERST: SICHERHEIT' : 'PASST ZU DEINEM PROFIL') + '</span>' +
      '<h3 style="margin:2px 0 6px">' + rec.title + '</h3>' +
      '<p class="small muted" style="margin:0 0 14px">' + rec.why + '</p>' +
      (rec.primary.href ? '<a class="btn btn-primary btn-sm" href="' + rec.primary.href + '" data-track="cta_reco">' + rec.primary.label + '</a>' : '<span class="btn btn-dark btn-sm" style="cursor:default">' + rec.primary.label + '</span>') +
      '</div>' +
      '<p class="small muted" style="margin-bottom:18px">Beide Wege im Überblick — kein Muss: Der Score, die Guides und die Tools oben sind komplett kostenlos.</p>' +
      '<div class="grid-2">' +
      '<a class="card offer-card featured" href="protokoll.html" data-track="cta_protokoll"><span class="card-num">SELBSTSTÄNDIG</span>' +
      '<h3 style="font-size:1.05rem;margin:6px 0 2px">DAS PROTOKOLL</h3><p class="offer-price">49 €<small> einmalig</small></p>' +
      '<p class="small muted" style="margin:0 0 14px">Das komplette MaleMetrix-System inkl. interaktivem 12-Wochen-Programm — für die selbstständige Umsetzung.</p>' +
      '<span class="btn btn-primary btn-sm btn-block">Protokoll ansehen</span></a>' +
      '<a class="card offer-card" href="coaching.html" data-track="cta_coaching"><span class="card-num">INDIVIDUELL</span>' +
      '<h3 style="font-size:1.05rem;margin:6px 0 2px">1:1 Coaching</h3><p class="offer-price">ab 149 €<small> / Monat</small></p>' +
      '<p class="small muted" style="margin:0 0 14px">Individuelle Analyse und laufende Optimierung deiner Performance — persönlich begleitet.</p>' +
      '<span class="btn btn-dark btn-sm btn-block">1:1 ansehen</span></a>' +
      '</div>';

    /* ---------- Persönlicher DM-CTA ---------- */
    const ig = (window.MM_CONFIG || {}).instagram;
    const mailAddr = (window.MM_CONFIG || {}).contactEmail || '';
    const scoreMailto = 'mailto:' + encodeURIComponent(mailAddr) +
      '?subject=' + encodeURIComponent('SCORE — bitte kurz einordnen') +
      '&body=' + encodeURIComponent('Mein MaleMetrix Score: ' + r.total + '/100 (' + r.level + ')\nEngpass: ' + r.bottleneck.name + '\n\n(Screenshot vom Ergebnis anhängen)');
    html += '<div class="card dash-block" style="margin-top:16px;border-left:3px solid var(--accent-2)">' +
      '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:20px;justify-content:space-between">' +
      '<div style="flex:1;min-width:260px">' +
      '<h3 class="h-card" style="margin-bottom:6px">Unsicher, wo du anfangen sollst?</h3>' +
      '<p class="muted" style="font-size:0.93rem;margin:0">Schick mir deinen Score-Screenshot mit dem Wort SCORE — ich sage dir kurz und ehrlich, welcher Hebel für dich zuerst kommt. Kostenlos, direkt mit mir.</p></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;flex-shrink:0">' +
      (ig ? '<a class="btn btn-dark btn-sm" href="' + ig + '" target="_blank" rel="noopener" data-track="score_dm_click">📸 Per Instagram-DM</a>' : '') +
      '<a class="btn btn-dark btn-sm" href="' + scoreMailto + '" data-track="score_mail_click">✉️ Per E-Mail</a>' +
      '</div></div></div>';

    /* ---------- 7. TEILBARE SCORE-CARD ---------- */
    html += '<h3 class="h-card" style="margin:38px 0 14px">Deine Score-Card</h3>' +
      '<div class="mm-scorecard" id="scoreCard">' +
      '<div class="sc-top"><span class="sc-brand">MALE<strong>METRIX</strong></span><span class="sc-level">' + r.level + '</span></div>' +
      '<div class="sc-score"><span class="sc-num">' + r.total + '</span><span class="sc-of">/100</span></div>' +
      '<div class="sc-bars">';
    keys.forEach(k => {
      html += '<div class="sc-bar"><span class="sc-bar-label">' + (C.moduleNamesShort[k] || nm(k)) + '</span>' +
        '<span class="sc-bar-track"><span class="sc-bar-fill ' + levelClass(r.scores[k]) + '" style="width:' + Math.max(r.scores[k], 4) + '%"></span></span></div>';
    });
    html += '</div><div class="sc-foot">malemetrix.com · kostenloser Score</div></div>' +
      '<p class="small muted" style="margin-top:10px;text-align:center">Screenshot machen und teilen — oder unten „Score kopieren".</p>';

    /* ---------- Aktionen ---------- */
    html += '<div class="card dash-block" style="margin-top:24px"><h3 style="margin-bottom:14px">Dein Ergebnis sichern</h3>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
      '<a class="btn btn-dark" href="report.html">📄 Vollständigen Report öffnen (PDF)</a>' +
      '<button class="btn btn-dark" id="btnEmailResult">✉️ Ergebnis per E-Mail erhalten</button>' +
      '<button class="btn btn-dark" id="btnShare">🔗 Score kopieren &amp; teilen</button>' +
      '<button class="btn btn-ghost" id="btnRestart">Check neu starten</button>' +
      '</div>' +
      '<div id="emailForm" style="display:none;margin-top:20px;max-width:420px">' +
      '<div class="field"><label for="resName">Vorname</label><input type="text" id="resName" placeholder="Dein Vorname"></div>' +
      '<div class="field"><label for="resEmail">E-Mail</label><input type="email" id="resEmail" placeholder="du@beispiel.de"></div>' +
      '<button class="btn btn-primary" id="btnSendResult">Ergebnis senden</button>' +
      '<p class="small muted" style="margin-top:10px">Wir nutzen deine E-Mail nur, um dir dein Ergebnis zu schicken. Details in der <a href="datenschutz.html" style="text-decoration:underline">Datenschutzerklärung</a>.</p>' +
      '</div></div>';

    /* ---------- Social Proof + Disclaimer ---------- */
    html += '<div data-mm-trust style="margin-top:28px"></div>';
    html += '<p class="small" style="color:var(--muted-2);margin-top:24px">Der MaleMetrix Score ist eine Lifestyle-Analyse — keine medizinische Diagnose und kein Ersatz für ärztliche Beratung. Bei Beschwerden oder auffälligen Werten wende dich bitte an einen Arzt.</p>';

    el.innerHTML = html;
    if (MM.renderTrust) MM.renderTrust();

    /* Ring animieren */
    requestAnimationFrame(() => {
      setTimeout(() => {
        const ring = el.querySelector(".ring-val");
        if (ring) ring.style.strokeDashoffset = ring.dataset.target;
        el.querySelectorAll(".bar-fill[data-width]").forEach(b => { b.style.width = b.dataset.width + "%"; });
      }, 150);
    });

    /* Events */
    $("#btnRestart").addEventListener("click", () => {
      if (confirm("Check wirklich neu starten? Dein aktuelles Ergebnis bleibt im Verlauf gespeichert.")) {
        state.idx = 0; state.answers = {};
        MM.store.remove("check_draft");
        show("checkConsent");
      }
    });

    $("#btnEmailResult").addEventListener("click", () => {
      const f = $("#emailForm");
      f.style.display = f.style.display === "none" ? "" : "none";
    });

    $("#btnSendResult").addEventListener("click", async () => {
      const name = $("#resName").value.trim();
      const email = $("#resEmail").value.trim();
      if (!email || !email.includes("@")) { MM.toast("Bitte gültige E-Mail eingeben"); return; }
      const keysAll = ["body", "strength", "fuel", "recovery", "blood", "drive", "execution"];
      const payload = {
        Typ: "Score-Ergebnis",
        Name: name || "—",
        "E-Mail": email,
        Score: r.total + "/100 (" + r.level + ")",
        Archetyp: r.archetype.name,
        Engpass: r.bottleneck.name
      };
      keysAll.forEach(k => payload[C.moduleNames[k]] = r.scores[k] + "/100");
      const res = await MM.sendForm("MaleMetrix Score: " + r.total + "/100 — " + (name || email), payload);
      MM.toast(res.viaMailto ? "E-Mail-Programm geöffnet" : "Ergebnis gesendet — check dein Postfach");
    });

    $("#btnShare").addEventListener("click", async () => {
      const txt = "Mein MaleMetrix Score: " + r.total + "/100 (" + r.level + ") — Typ: " + r.archetype.name +
        ". Mach den kostenlosen Check: " + window.location.origin + window.location.pathname;
      try {
        if (navigator.share) { await navigator.share({ text: txt }); }
        else { await navigator.clipboard.writeText(txt); MM.toast("In Zwischenablage kopiert"); }
      } catch (e) { /* abgebrochen */ }
    });
  }

  /* ======================================================================
     INIT
     ====================================================================== */

  function init() {
    if (!document.getElementById("checkWizard")) return;

    /* Intro → Consent */
    $("#btnStartCheck").addEventListener("click", () => show("checkConsent"));

    /* Vorhandenes Ergebnis anzeigen */
    const existing = MM.store.get("check_result", null);
    if (existing) {
      const banner = $("#existingResult");
      if (banner) {
        banner.style.display = "";
        banner.querySelector("[data-score]").textContent = existing.total + "/100 · " + existing.level;
        banner.querySelector("[data-show]").addEventListener("click", () => {
          renderResult(existing);
          show("checkResult");
        });
      }
    }

    /* Consent-Logik */
    const consentBoxes = document.querySelectorAll("#checkConsent input[type=checkbox][required]");
    const btnConsent = $("#btnConsentNext");
    const checkConsent = () => {
      btnConsent.disabled = ![...consentBoxes].every(c => c.checked);
    };
    consentBoxes.forEach(c => c.addEventListener("change", () => {
      c.closest(".checkbox-row").classList.toggle("checked", c.checked);
      checkConsent();
    }));
    document.querySelectorAll("#checkConsent input[type=checkbox]:not([required])").forEach(c => {
      c.addEventListener("change", () => c.closest(".checkbox-row").classList.toggle("checked", c.checked));
    });
    checkConsent();

    btnConsent.addEventListener("click", () => {
      if (MM.track) MM.track("check_started");
      show("checkWizard");
      renderStep();
    });

    $("#wizNext").addEventListener("click", next);
    $("#wizBack").addEventListener("click", back);

    show("checkIntro");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
