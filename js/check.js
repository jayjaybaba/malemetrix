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
    if (!waist || !height) return { pts: 8, ratio: null };
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
    scores.body += wh.pts;

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
      return { key: "recovery", name: "Recovery & Datenbasis", text: "Bevor du Hormone oder Energie überinterpretierst, müssen Schlaf und Datenbasis sauberer werden. Erst Erholung stabilisieren, dann messen, dann optimieren." };
    }
    if (s.strength >= 60 && s.body <= 45 && s.fuel <= 45) {
      return { key: "fuel", name: "Ernährungssystem", text: "Du hast kein Trainingsproblem. Du hast ein Ernährungssystem-Problem: Protein, Mengen und Wochenenden müssen messbar werden." };
    }
    if (s.body <= 45 && s.strength <= 45 && s.fuel <= 45) {
      return { key: "strength", name: "Fundament (Body + Strength + Fuel)", text: "Du brauchst keinen Spezialplan. Du brauchst ein starkes Fundament: feste Trainingstage, Proteinziel, Baseline-Messung. Genau in dieser Reihenfolge." };
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

  /* ---------- Nächste Schritte: Engpass-abhängige Angebots-Pfade ---------- */

  function offerFor(bKey) {
    const paths = {
      recovery: {
        lead: "Dein Engpass ist Erholung. Bevor du irgendetwas Neues kaufst oder schluckst: Der 4-Ebenen-Schlaf-Stack ist dein erster Hebel — als Selbstlern-System im Protokoll oder persönlich gesteuert im 1:1 Coaching.",
        primary: { label: "DAS PROTOKOLL starten (Schlaf-Stack)", href: "protokoll.html", track: "cta_protokoll" },
        secondary: { label: "1:1 Coaching: Erstgespräch buchen", href: "coaching.html#buchen", track: "cta_coaching" }
      },
      body: {
        lead: "Dein Engpass ist die Körperbasis. Du brauchst kein weiteres Video, sondern ein System für Defizit, Protein und Messung — und idealerweise jemanden, der jede Woche draufschaut.",
        primary: { label: "DAS PROTOKOLL starten", href: "protokoll.html", track: "cta_protokoll" },
        secondary: { label: "1:1 Coaching: Erstgespräch buchen", href: "coaching.html#buchen", track: "cta_coaching" }
      },
      strength: {
        lead: "Dein Engpass ist das Training. Push/Pull/Legs mit dokumentierter Progression, RIR und der Ampel-Steuerung — als Selbstlern-System im Protokoll oder mit wöchentlicher Kontrolle im 1:1 Coaching.",
        primary: { label: "DAS PROTOKOLL starten (Trainingssystem)", href: "protokoll.html", track: "cta_protokoll" },
        secondary: { label: "1:1 Coaching: Erstgespräch buchen", href: "coaching.html#buchen", track: "cta_coaching" }
      },
      fuel: {
        lead: "Dein Engpass ist die Ernährung. Kein neuer Diät-Trend — ein Ernährungssystem: Proteinziel, Sattmacher, Wochenend-Strategie, Trend statt Tageswaage. Genau das steht im Protokoll, Modul 4.",
        primary: { label: "DAS PROTOKOLL starten (Ernährungssystem)", href: "protokoll.html", track: "cta_protokoll" },
        secondary: { label: "1:1 Coaching: Erstgespräch buchen", href: "coaching.html#buchen", track: "cta_coaching" }
      },
      blood: {
        lead: "Dein Engpass sind die Daten. Das Blood-Dashboard aus dem Protokoll macht aus „mal Blutwerte machen\" ein System mit 8 Bereichen — und im 1:1 Coaching wird deine Supplement-Strategie an deine Werte angepasst, nicht an Instagram.",
        primary: { label: "DAS PROTOKOLL starten (Blood-Dashboard)", href: "protokoll.html", track: "cta_protokoll" },
        secondary: { label: "1:1 Coaching: Erstgespräch buchen", href: "coaching.html#buchen", track: "cta_coaching" }
      },
      drive: {
        lead: "Dein Engpass ist Energie & Drive. Das ist fast nie ein „Hormonproblem\", sondern meist Schlaf, Defizit oder ein Stack, der nicht zu dir passt. Im 1:1 Coaching gehen wir das der Reihe nach durch — Schlaf zuerst.",
        primary: { label: "1:1 Coaching: Erstgespräch buchen", href: "coaching.html#buchen", track: "cta_coaching" },
        secondary: { label: "DAS PROTOKOLL starten", href: "protokoll.html", track: "cta_protokoll" }
      },
      execution: {
        lead: "Dein Engpass ist die Umsetzung. Mehr Wissen bringt dir nichts — du brauchst wöchentliche Kontrolle und einen, der nachfragt. Genau dafür ist das 1:1 Coaching gebaut: jede Woche dein Check-in, meine Antwort, ein klarer Fokus.",
        primary: { label: "1:1 Coaching: Erstgespräch buchen", href: "coaching.html#buchen", track: "cta_coaching" },
        secondary: { label: "DAS PROTOKOLL starten (Selbstlernen)", href: "protokoll.html", track: "cta_protokoll" }
      }
    };
    return paths[bKey] || paths.execution;
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

  function levelClass(v) { return v < 40 ? "low" : v < 70 ? "mid" : "high"; }

  function moduleText(key, v) {
    const t = C.moduleTexts[key];
    return v < 40 ? t.low : v < 70 ? t.mid : t.high;
  }

  /* ---------- Personalisierung: Zahlen-Helfer ---------- */

  function protTarget(a) {
    const w = parseFloat(a.weight);
    return w ? Math.round(w * 1.8) + "–" + Math.round(w * 2.2) + " g" : "1,8–2 g pro kg";
  }
  function stepTargetNum(a) {
    return (a.steps === "lt4") ? "7.000" : (a.steps === "4to7") ? "8.000" : "10.000";
  }

  /* ---------- Personalisierung: Insights aus konkreten Antworten ---------- */

  function personalInsights(a, r) {
    const neg = [], pos = [];

    // Schlaf
    const sleepMap = { lt5: "unter 5", "5to6": "5–6", "6to7": "6–7" };
    if (a.rec_duration === "lt5" || a.rec_duration === "5to6")
      neg.push({ icon: "😴", text: "Du schläfst aktuell nur <strong>" + sleepMap[a.rec_duration] + " Stunden</strong>. Das bremst Regeneration, Appetitkontrolle und Energie mehr als fast alles andere — und ist dein schnellster Hebel." });
    else if (a.rec_wake === "geraedert" || a.rec_wake === "nachts_wach")
      neg.push({ icon: "😴", text: "Du wachst gerädert auf bzw. nachts oft. Selbst bei genug Stunden zählt die <strong>Schlafqualität</strong> — Koffein-Timing und Abendroutine sind hier dein Hebel." });

    // Protein
    if (a.fuel_protein === "keine_ahnung")
      neg.push({ icon: "🥩", text: "Du weißt nicht, wie viel <strong>Protein</strong> du isst. Solange das im Dunkeln bleibt, sind Fettabbau und Muskelerhalt Glückssache. Dein Zielwert: <strong>" + protTarget(a) + "</strong> pro Tag." });
    else if (a.fuel_protein === "lt80")
      neg.push({ icon: "🥩", text: "Dein <strong>Protein liegt unter 80 g</strong> pro Tag — deutlich zu wenig. Allein das auf <strong>" + protTarget(a) + "</strong> anzuheben verändert Sättigung und Körperbild spürbar." });

    // Trainingsfrequenz
    const freqMap = { "0": "gar nicht", "1": "nur 1×", unregelmaessig: "sehr unregelmäßig" };
    if (a.str_freq === "0" || a.str_freq === "1" || a.str_freq === "unregelmaessig")
      neg.push({ icon: "🏋️", text: "Du trainierst aktuell <strong>" + freqMap[a.str_freq] + "</strong> Kraft pro Woche. Genau hier liegt dein größtes ungenutztes Potenzial — schon <strong>3 feste Einheiten</strong> verändern alles." });
    else if (a.str_plan === "spontan" || a.str_log === "nein")
      neg.push({ icon: "📈", text: "Du trainierst zwar, aber <strong>ohne dokumentierte Progression</strong>. Ohne Steigerung im Plan stagniert der Reiz — Tracking ist dein Hebel, nicht mehr Schwitzen." });

    // Schritte
    if (a.steps === "lt4")
      neg.push({ icon: "👟", text: "<strong>Unter 4.000 Schritte</strong> am Tag — der am meisten unterschätzte Hebel. Mehr Alltagsbewegung verbrennt oft mehr als jedes Workout. Ziel: <strong>" + stepTargetNum(a) + "</strong>." });
    else if (a.steps === "4to7")
      neg.push({ icon: "👟", text: "<strong>4.000–7.000 Schritte</strong> sind okay, aber nicht genug. Ein Ziel von <strong>" + stepTargetNum(a) + "</strong> ist ein leiser, großer Hebel für deine Bilanz." });

    // Alkohol
    if (a.fuel_alcohol === "taeglich")
      neg.push({ icon: "🍺", text: "<strong>Fast täglich Alkohol</strong> sabotiert Schlafqualität, Regeneration und Kalorienbilanz gleichzeitig — drei deiner Baustellen auf einmal." });
    else if (a.fuel_alcohol === "we_viel")
      neg.push({ icon: "🍺", text: "Am Wochenende viel Alkohol: Zwei Tage können das Defizit von fünf disziplinierten löschen. Hier liegt <strong>schnelle Beute</strong>." });

    // Koffein spät
    if (a.rec_caffeine === "abends" || a.rec_caffeine === "nachmittag")
      neg.push({ icon: "☕", text: "Du trinkst Koffein bis in den <strong>" + (a.rec_caffeine === "abends" ? "Abend" : "Nachmittag") + "</strong>. Die Wirkung hält 6+ Stunden an und kostet dich Tiefschlaf — eine 14-Uhr-Deadline wirkt oft Wunder." });

    // Neustarts / Umsetzung
    if (a.exe_restarts === "staendig" || a.exe_restarts === "nie_drin")
      neg.push({ icon: "🔁", text: "Du startest immer wieder neu. Das ist <strong>kein Disziplinproblem</strong> — dir fehlt ein System, das deinen Alltag überlebt. Genau das ist der Kern von MaleMetrix." });

    // Bauchumfang / WHtR
    if (r.whtr && r.whtr >= 0.6)
      neg.push({ icon: "📏", text: "Dein Bauchumfang liegt bei <strong>" + r.whtr.toFixed(2).replace(".", ",") + "×</strong> deiner Größe (Ziel: unter 0,50). Das ist dein wichtigster sichtbarer Marker — und gut veränderbar." });
    else if (r.whtr && r.whtr >= 0.5)
      neg.push({ icon: "📏", text: "Dein Bauchumfang liegt <strong>knapp über der Hälfte</strong> deiner Größe. Schon ein paar Zentimeter weniger verschieben das Bild spürbar." });

    // Stress
    if (a.rec_stress && parseInt(a.rec_stress, 10) >= 8)
      neg.push({ icon: "🧠", text: "Dein Stresslevel liegt bei <strong>" + a.rec_stress + "/10</strong>. Hoher Dauerstress arbeitet gegen Schlaf, Appetit und Regeneration — kurze tägliche Spaziergänge sind dein Ventil." });

    // Energie nur mit Koffein
    if (a.drv_energy === "nur_koffein")
      neg.push({ icon: "⚡", text: "Du <strong>funktionierst nur mit Koffein</strong>. Das ist ein Symptom, kein Zustand — meist steckt Schlaf oder Erholung dahinter, nicht ein „Energie-Problem“." });

    // Blutwerte-Baseline
    if (a.blood_last === "nie")
      neg.push({ icon: "🩸", text: "Du hast <strong>noch nie bewusst Blutwerte</strong> machen lassen. Ohne Baseline interpretierst du Energie und Drive nur nach Gefühl — eine saubere Messung beendet das Raten." });

    // Positive Stärke
    const strongTexts = {
      execution: "Deine <strong>Umsetzungsbereitschaft</strong> ist stark — der beste Startvorteil, den es gibt.",
      strength: "Dein <strong>Trainingsfundament</strong> ist solide — darauf lässt sich schnell aufbauen.",
      recovery: "Deine <strong>Erholung</strong> ist eine Stärke — sie erlaubt dir, über Training und Ernährung zu skalieren.",
      fuel: "Deine <strong>Ernährung</strong> ist überraschend strukturiert — eine starke Basis.",
      body: "Deine <strong>Körperbasis</strong> ist gut — bei dir geht es um Feintuning.",
      drive: "Dein <strong>Antrieb</strong> ist eine Stärke — nutze ihn als Motor.",
      blood: "Du bist <strong>datenorientiert</strong> — das gibt dir einen echten Vorsprung."
    };
    if (r.scores[r.strongest] >= 50 && strongTexts[r.strongest])
      pos.push({ icon: "✅", text: "Deine Stärke: " + strongTexts[r.strongest] });

    // Ziel-Dringlichkeit als motivierender Abschluss
    if (a.goal_urgency >= 4 || a.exe_ready >= 8)
      pos.push({ icon: "🔥", text: "Du willst <strong>jetzt</strong> starten — und Bereitschaft ist der Faktor, der am stärksten über Erfolg entscheidet. Nutze dieses Momentum." });

    // bottleneck-relevante Insights zuerst, dann Rest; max 5 negative + 1-2 positive
    return neg.slice(0, 5).concat(pos.slice(0, 1));
  }

  /* ---------- Personalisierung: dynamischer 7-Tage-Plan ---------- */

  function dynamicPlan(a, r) {
    const has = {
      sleep: ["lt5", "5to6"].indexOf(a.rec_duration) >= 0 || ["geraedert", "nachts_wach"].indexOf(a.rec_wake) >= 0,
      caffeine: ["nachmittag", "abends"].indexOf(a.rec_caffeine) >= 0,
      protein: ["keine_ahnung", "lt80"].indexOf(a.fuel_protein) >= 0,
      training: ["0", "1", "unregelmaessig"].indexOf(a.str_freq) >= 0,
      steps: ["lt4", "4to7"].indexOf(a.steps) >= 0,
      alcohol: ["we_viel", "taeglich", "2to3"].indexOf(a.fuel_alcohol) >= 0,
      tracking: Array.isArray(a.body_tracking) && a.body_tracking.indexOf("nichts") >= 0,
      blood: ["nie", "gt2y"].indexOf(a.blood_last) >= 0,
      weekend: ["wochenende", "abends"].indexOf(a.fuel_control) >= 0
    };
    const days = [];

    days.push({ day: "Tag 1", items: [
      "Gewicht und Bauchumfang messen (Nabelhöhe, ausgeatmet) + 3 Fotos: front, seitlich, hinten",
      has.protein ? "Protein-Tagesziel festlegen: <strong>" + protTarget(a) + "</strong>" : "Dein wichtigstes 12-Wochen-Ziel in einem Satz aufschreiben"
    ] });

    const d2 = [];
    if (has.sleep) d2.push("Feste Schlafenszeit für die nächsten 7 Tage festlegen — Ziel mindestens 7 Stunden");
    else d2.push("Zwei proteinreiche Standardmahlzeiten definieren, die du ohne Nachdenken wiederholst");
    if (has.caffeine) d2.push("Koffein-Deadline auf 14 Uhr setzen");
    else if (has.steps) d2.push("Schritte-Tracking am Handy aktivieren, Ziel " + stepTargetNum(a));
    days.push({ day: "Tag 2", items: d2 });

    days.push({ day: "Tag 3", items: [
      has.training ? "Erstes Krafttraining: Ganzkörper, 45–60 Min, Technik vor Gewicht — und im MaleMetrix Tracker dokumentieren" : "Krafttraining wie gewohnt — aber ab heute jede Übung im Tracker dokumentieren (Gewicht, Wdh.)",
      has.steps ? "Nach dem Training 15–20 Min zügig gehen (Richtung " + stepTargetNum(a) + " Schritte)" : "20 Minuten zügiger Spaziergang"
    ] });

    const d4 = [];
    if (has.tracking) d4.push("Einen Tag Ernährung grob mitschreiben — nur beobachten, noch nichts ändern");
    else d4.push("Protein heute bewusst treffen (" + protTarget(a) + ") und kurz notieren");
    if (has.blood) d4.push("Letzte Laborwerte raussuchen oder einen Basislabor-Termin vereinbaren");
    else d4.push("Koffein nach 14 Uhr weglassen, früher ins Bett");
    days.push({ day: "Tag 4", items: d4 });

    days.push({ day: "Tag 5", items: [
      "Zweites Krafttraining — gleiche Übungen, kleine Steigerung anstreben",
      has.sleep ? "Abendroutine: letzte 30 Minuten vor dem Schlafen ohne Bildschirm" : (stepTargetNum(a) + " Schritte erreichen")
    ] });

    days.push({ day: "Tag 6", items: [
      (has.alcohol || has.weekend) ? "Wochenendstrategie schriftlich festlegen: Alkohol- und Snack-Limit vorab — nüchtern entschieden" : "Eine flexible Mahlzeit bewusst einplanen statt das Wochenende laufen zu lassen",
      "Dritte Trainingseinheit oder aktive Erholung (Spaziergang, Mobility 15 Min)"
    ] });

    days.push({ day: "Tag 7", items: [
      "Review: Gewicht, Bauchumfang, Schlaf, Trainings und Energie (1–10) mit Tag 1 vergleichen",
      "3 feste Trainingstermine für die nächste Woche in den Kalender eintragen"
    ] });

    return days;
  }

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
      (prev ? '<span class="chip ' + (r.total >= prev.total ? 'accent' : 'warn') + '">Letzter Check: <strong>' + prev.total + ' → ' + r.total + '</strong></span>' : '') +
      '</div></div></div>';

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

    /* ---------- 6b. Angebote (erst jetzt, beratend, 3 Wege) ---------- */
    html += '<h3 class="h-card" style="margin:38px 0 6px">Wenn du es strukturiert angehen willst</h3>' +
      '<p class="small muted" style="margin-bottom:18px">Drei Wege — vom Selbermachen bis zur vollen Begleitung. Kein Muss: Der Score, die Guides und die Tools oben sind komplett kostenlos.</p>' +
      '<div class="grid-3">' +
      '<a class="card offer-card" href="protokoll.html" data-track="cta_protokoll"><span class="card-num">SELBST UMSETZEN</span>' +
      '<h3 style="font-size:1.05rem;margin:6px 0 2px">DAS PROTOKOLL</h3><p class="offer-price">49 €<small> einmalig</small></p>' +
      '<p class="small muted" style="margin:0 0 14px">Das komplette System inkl. interaktivem 12-Wochen-Programm.</p>' +
      '<span class="btn btn-dark btn-sm btn-block">Protokoll ansehen</span></a>' +
      '<a class="card offer-card featured" href="transformation.html" data-track="cta_founder"><span class="card-num" style="color:var(--accent)">MIT BEGLEITUNG</span>' +
      '<h3 style="font-size:1.05rem;margin:6px 0 2px">12-Wochen-Transformation</h3><p class="offer-price">599 €<small> Runde 1</small></p>' +
      '<p class="small muted" style="margin:0 0 14px">Strategie, Umsetzung, wöchentlicher Check-in — nur 10 Plätze.</p>' +
      '<span class="btn btn-primary btn-sm btn-block">Transformation ansehen</span></a>' +
      '<a class="card offer-card" href="coaching.html" data-track="cta_coaching"><span class="card-num">MAXIMAL INDIVIDUELL</span>' +
      '<h3 style="font-size:1.05rem;margin:6px 0 2px">1:1 Coaching</h3><p class="offer-price">Preis auf der Coaching-Seite</p>' +
      '<p class="small muted" style="margin:0 0 14px">Individuelle Analyse und laufende Optimierung.</p>' +
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
