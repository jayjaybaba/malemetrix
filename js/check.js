/* ==========================================================================
   MaleMetrix Score — Wizard-Engine, Scoring & Ergebnis-Dashboard
   ========================================================================== */

(function () {
  "use strict";

  const C = window.MM_CHECK;
  const $ = (sel) => document.querySelector(sel);

  /* Flache Liste aller Fragen-Schritte */
  const steps = [];
  C.modules.forEach(m => m.questions.forEach(q => steps.push({ mod: m, q })));

  const state = {
    idx: 0,
    answers: MM.store.get("check_draft", {}) || {}
  };

  /* ======================================================================
     SCORING
     ====================================================================== */

  function whtrPoints(a) {
    const waist = parseFloat(a.waist), height = parseFloat(a.height);
    if (!waist || !height) return { pts: 0, ratio: null, missing: true };
    const ratio = waist / height;
    let pts;
    if (ratio < 0.5) pts = 25;
    else if (ratio < 0.55) pts = 17;
    else if (ratio < 0.6) pts = 9;
    else pts = 3;
    return { pts, ratio: Math.round(ratio * 100) / 100 };
  }

  function computeScores(a) {
    const scores = { body: 0, strength: 0, fuel: 0, recovery: 0, blood: 0, drive: 0, execution: 0 };

    steps.forEach(({ q }) => {
      if (!q.module) return;
      const ans = a[q.id];
      if (ans === undefined || ans === null) return;

      if (q.type === "single") {
        const opt = q.options.find(o => String(o.v) === String(ans));
        if (opt && typeof opt.p === "number") scores[q.module] += opt.p;
      } else if (q.type === "multi") {
        const sel = Array.isArray(ans) ? ans : [];
        if (q.bucket) {
          const count = sel.filter(v => {
            const o = q.options.find(x => x.v === v);
            return o && !o.exclusive;
          }).length;
          for (const [max, pts] of q.bucket) {
            if (count <= max) { scores[q.module] += pts; break; }
          }
        } else {
          let sum = 0;
          sel.forEach(v => {
            const o = q.options.find(x => x.v === v);
            if (o && typeof o.p === "number") sum += o.p;
          });
          scores[q.module] += Math.min(sum, q.cap || sum);
        }
      } else if (q.type === "scale") {
        const val = parseInt(ans, 10);
        for (const [max, pts] of q.pointsMap) {
          if (val <= max) { scores[q.module] += pts; break; }
        }
      }
    });

    const wh = whtrPoints(a);
    if (wh.ratio !== null) {
      scores.body += wh.pts;
    } else {
      // Fehlender Bauchumfang ist KEIN schlechter Wert: Body über die vorhandenen
      // Fragen normalisieren (Nicht-WHtR-Maximum ~68 → auf ~93 hochskalieren),
      // statt eine feste, niedrige Ersatzbewertung einzurechnen.
      scores.body = Math.round(scores.body * (93 / 68));
    }

    Object.keys(scores).forEach(k => { scores[k] = Math.max(0, Math.min(100, Math.round(scores[k]))); });

    const h = parseFloat(a.height), w = parseFloat(a.weight);
    a._bmi = (h && w) ? Math.round(w / Math.pow(h / 100, 2) * 10) / 10 : 0;

    let total = 0;
    Object.keys(C.weights).forEach(k => { total += scores[k] * C.weights[k]; });
    total = Math.round(total / 100);

    return { scores, total, whtr: wh.ratio };
  }

  /* ---------- Engpass-Algorithmus ---------- */

  function findBottleneck(s, a) {
    // Spezialregeln (in Prioritätsreihenfolge)
    if (s.drive <= 45 && s.recovery <= 45 && s.blood <= 45) {
      return { key: "recovery", name: "Schlaf & Datenbasis", text: "Bevor du Hormone oder Energie überinterpretierst, müssen Schlaf und Datenbasis sauberer werden. Erst Erholung stabilisieren, dann messen, dann optimieren." };
    }
    if (s.strength >= 60 && s.body <= 45 && s.fuel <= 45) {
      return { key: "fuel", name: "Ernährungssystem", text: "Du hast kein Trainingsproblem. Du hast ein Ernährungssystem-Problem: Protein, Mengen und Wochenenden müssen messbar werden." };
    }
    if (s.body <= 45 && s.strength <= 45 && s.fuel <= 45) {
      return { key: "strength", name: "Fundament (Körper, Training & Ernährung)", text: "Du brauchst keinen Spezialplan. Du brauchst ein starkes Fundament: feste Trainingstage, Proteinziel, Baseline-Messung. Genau in dieser Reihenfolge." };
    }
    if (s.blood >= 60 && s.drive <= 45 && s.recovery <= 45) {
      return { key: "recovery", name: "Umsetzung statt Overthinking", text: "Du hast Daten, aber deine Basis ist nicht stabil genug. Mehr Messung ersetzt keine Umsetzung — Schlaf und Routine sind dein erster Hebel." };
    }
    const others = Object.keys(s).filter(k => k !== "execution");
    if (s.execution <= 40 && others.every(k => s[k] >= 45)) {
      return { key: "execution", name: "Umsetzung", text: "Du weißt wahrscheinlich genug. Was fehlt, ist Kontrolle und ein System, das deinen Alltag überlebt." };
    }

    // Fallback: gewichtete Schwäche, Ziel-relevante Module zählen stärker
    const goals = a.goal_main || [];
    const boosted = new Set();
    goals.forEach(g => (C.goalModuleMap[g] || []).forEach(m => boosted.add(m)));

    let best = null, bestVal = -1;
    Object.keys(s).forEach(k => {
      const val = (100 - s[k]) * C.weights[k] * (boosted.has(k) ? 1.3 : 1);
      if (val > bestVal) { bestVal = val; best = k; }
    });
    const bt = C.bottleneckTexts[best];
    return { key: best, name: bt.name, text: bt.text };
  }

  /* ---------- Archetyp ---------- */

  function findArchetype(s, a, bottleneck) {
    for (const arch of C.archetypes) {
      try { if (arch.match(s, a)) return arch; } catch (e) { /* weiter */ }
    }
    const fbId = C.archetypeFallback[bottleneck.key] || "neustarter";
    return C.archetypes.find(x => x.id === fbId) || C.archetypes[C.archetypes.length - 1];
  }

  /* ---------- Red Flags ---------- */

  function collectRedFlags(a) {
    const flags = [];
    (a.redflags || []).forEach(v => {
      const q = steps.find(st => st.q.id === "redflags").q;
      const o = q.options.find(x => x.v === v);
      if (o && o.flag) flags.push(o.flag);
    });
    if (a.rec_snore === "aussetzer" && !(a.redflags || []).includes("apnoe")) {
      flags.push("Beobachtete Atemaussetzer im Schlaf sollten ärztlich abgeklärt werden (Stichwort Schlafapnoe).");
    }
    return flags;
  }
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
    const pct = Math.round((state.idx / steps.length) * 100);
    $("#wizModule").textContent = steps[state.idx].mod.label;
    $("#wizCount").textContent = "Frage " + (state.idx + 1) + " / " + steps.length;
    $("#wizBar").style.width = pct + "%";
  }

  function renderStep() {
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
    const { scores, total, whtr } = computeScores(a);
    const level = C.levelFor(total);
    const bottleneck = findBottleneck(scores, a);
    const arch = findArchetype(scores, a, bottleneck);
    const flags = collectRedFlags(a);

    const sorted = Object.keys(scores).sort((x, y) => scores[x] - scores[y]);
    const result = {
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
      answers: a
    };

    MM.store.set("check_result", result);
    const hist = MM.store.get("check_history", []);
    hist.push({ date: result.date, total, scores });
    MM.store.set("check_history", hist.slice(-12));
    MM.store.remove("check_draft");
    if (MM.track) MM.track("check_completed", { score: total, bottleneck: bottleneck.key, archetype: arch.id });

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

  /* ---------- Ergebnis rendern ---------- */

  function renderResult(r) {
    const el = $("#checkResult");
    const keys = ["body", "strength", "fuel", "recovery", "blood", "drive", "execution"];
    const prev = (MM.store.get("check_history", []) || []).slice(0, -1).pop();
    const firstName = ((r.answers && r.answers.name) || "").trim().split(/\s+/)[0].slice(0, 24);

    const nm = (k) => (C.moduleNamesDe && C.moduleNamesDe[k]) || C.moduleNames[k];
    const sortedDesc = keys.slice().sort((x, y) => r.scores[y] - r.scores[x]);
    const strengths = sortedDesc.slice(0, 3);
    const topVal = r.scores[strengths[0]] || 0;
    const bKey = r.bottleneck.key;
    const ans = r.answers || {};
    const dc = C.dataConfidence(ans);
    const tv = C.targetValues(ans);

    let html = '';

    /* ---------- 1. HERO: Gesamt-Score + Status ---------- */
    html += '<div class="result-hero">' +
      '<div class="score-ring">' + ringSVG(r.total) +
      '<div class="score-ring-center"><div class="num">' + r.total + '</div><div class="of">VON 100</div></div></div>' +
      '<div class="result-meta">' +
      '<span class="eyebrow" style="margin-bottom:6px">' + (firstName ? firstName + ', dein MaleMetrix Score' : 'Dein MaleMetrix Score') + '</span>' +
      '<div class="result-status">' + r.level + '</div>' +
      '<p class="muted" style="margin-top:8px">' + r.levelText + '</p>' +
      '<div class="result-chips">' +
      '<span class="chip">Stärkster Bereich: <strong>' + nm(strengths[0]) + '</strong></span>' +
      '<span class="chip warn">Größter Hebel: <strong>' + r.bottleneck.name + '</strong></span>' +
      '<span class="chip">Empfohlener Modus: <strong>' + tv.modeLabel + '</strong></span>' +
      (prev ? '<span class="chip ' + (r.total >= prev.total ? 'accent' : 'warn') + '">Letzter Check: <strong>' + prev.total + ' → ' + r.total + '</strong></span>' : '') +
      '</div></div></div>';

    /* ---------- Datenqualität (NICHT Gesundheitsstatus) ---------- */
    html += '<div class="card" style="margin-bottom:22px;border-left:3px solid ' +
      (dc.level === 'hoch' ? 'var(--green)' : dc.level === 'mittel' ? 'var(--accent-2)' : 'var(--red)') + '">' +
      '<span class="card-num">DATENQUALITÄT: ' + dc.level.toUpperCase() + '</span>' +
      '<p class="small muted" style="margin:6px 0 0">' + dc.text +
      (dc.missing.indexOf('Bauchumfang') >= 0 ? ' <a href="check.html" style="color:var(--accent)">Bauchumfang nachtragen und Ergebnis präzisieren →</a>' : '') +
      '</p></div>';

    /* ---------- Red Flags (Sicherheit zuerst) ---------- */
    if (r.flags.length) {
      html += '<div class="alert alert-danger"><span class="alert-icon">⚕</span><div>' +
        '<strong>Bitte zuerst ärztlich abklären:</strong><ul style="margin-top:8px;display:grid;gap:6px;list-style:disc;padding-left:18px">' +
        r.flags.map(f => '<li>' + f + '</li>').join('') +
        '</ul><p style="margin-top:10px;font-size:0.85rem">MaleMetrix unterstützt dich bei Training, Ernährung, Schlaf und Struktur — ersetzt aber keine medizinische Diagnostik oder Behandlung.</p></div></div>';
    }

    /* ---------- 2. PROFIL: Radar + Einzel-Scores ---------- */
    html += '<div class="result-grid">' +
      '<div class="card"><h3 style="margin-bottom:6px">Dein Performance-Profil</h3><p class="small muted" style="margin-bottom:10px">7 Bereiche, ein Bild: je weiter außen, desto stärker.</p>' +
      '<div class="radar-wrap">' + radarSVG(r.scores) + '</div></div>' +
      '<div class="card js-bars"><h3 style="margin-bottom:18px">Deine 7 Bereiche</h3><div class="score-rows">';
    keys.forEach(k => {
      const v = r.scores[k];
      html += '<div class="score-row"><div class="score-row-top">' +
        '<span class="name">' + nm(k) + ' <span class="muted small">· ' + C.moduleSubtitles[k] + '</span></span>' +
        '<span class="pts">' + v + '/100</span></div>' +
        '<div class="bar-track"><div class="bar-fill ' + levelClass(v) + '" data-width="' + v + '"></div></div></div>';
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

    /* ---------- 4. GRÖSSTER ENGPASS ---------- */
    html += '<div class="card dash-block bottleneck-card">' +
      '<span class="card-num" style="color:var(--red)">DEIN GRÖSSTER ENGPASS · ' + r.scores[bKey] + '/100</span>' +
      '<h3 style="font-size:1.4rem;margin:2px 0 8px">' + r.bottleneck.name + '</h3>' +
      '<p>' + r.bottleneck.text + '</p>' +
      (C.bottleneckAffects[bKey] ? '<p style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line);color:var(--muted)"><strong style="color:var(--text)">Warum jetzt Priorität:</strong> ' + C.bottleneckAffects[bKey] + '</p>' : '') +
      '</div>';

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
    html += '</div><div class="sc-foot">malemetrix.de · kostenloser Score</div></div>' +
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
