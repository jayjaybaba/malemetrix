/* ==========================================================================
   MaleMetrix Growth OS — App (Shell, Zugang, Tabs, Module)
   --------------------------------------------------------------------------
   Local-first Admin-App. Kein Fake: Jede Funktion trägt ihren echten Status
   (LIVE / MANUELLER IMPORT / KONFIGURATION ERFORDERLICH / EXTERNE FREIGABE).
   TikTok-API-Aufrufe passieren NUR über den eigenen Worker (serverseitig,
   Tokens verlassen den Worker nie) — solange keiner konfiguriert ist,
   läuft Level 0 (Manual Mode) mit vollem Funktionsumfang.
   ========================================================================== */

(function () {
  "use strict";
  var root = document.getElementById("gosApp");
  if (!root) return;

  var D = GOS_DATA, G = GOS, SC = GOS_SCORE;
  var esc = G.esc;

  /* ======================================================================
     ZUGANG (§3) — SHA-256-Code-Gate.
     Ehrliche Einordnung: Das ist eine Zugangs­sperre gegen zufällige
     Besucher, keine Verschlüsselung. Alle DATEN liegen ausschließlich
     lokal auf diesem Gerät — auf dem Server liegt nur der (öffentliche)
     App-Code ohne jegliche Nutzerdaten oder Secrets.
     ====================================================================== */
  var GATE_HASH = (window.MM_CONFIG && MM_CONFIG.growth && MM_CONFIG.growth.accessHash) ||
    "8918903bb5c3c908850b105c4c73e549d92d839dd417326fa2b9fb9d6115e27c";

  function norm(code) { return String(code || "").trim().toUpperCase().replace(/\s+/g, ""); }
  async function sha256hex(str) {
    var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }
  function isAuthed() { try { return sessionStorage.getItem("mm_gos_auth") === GATE_HASH; } catch (e) { return false; } }

  function renderGate() {
    root.innerHTML =
      '<div class="card" style="max-width:420px;margin:60px auto;text-align:center">' +
      '<div style="font-size:2rem;margin-bottom:10px">🔐</div>' +
      '<h2 class="h-card" style="margin-bottom:8px">Growth OS — interner Bereich</h2>' +
      '<p class="muted small" style="margin-bottom:18px">Zugangscode eingeben. Daten liegen lokal in diesem Browser — plus optional in deiner eigenen Cloud, falls du den D1-Sync aktiviert hast.</p>' +
      '<div class="field"><input type="password" id="gosCode" placeholder="Zugangscode" autocomplete="off" aria-label="Zugangscode"></div>' +
      '<button class="btn btn-primary btn-block" id="gosEnter" style="margin-top:12px">Öffnen</button>' +
      '<p class="small muted" id="gosGateErr" style="margin-top:10px;min-height:18px"></p></div>';
    function tryEnter() {
      var code = document.getElementById("gosCode").value;
      sha256hex(norm(code)).then(function (h) {
        if (h === GATE_HASH) {
          try { sessionStorage.setItem("mm_gos_auth", GATE_HASH); } catch (e) {}
          G.log("auth", "Growth OS geöffnet");
          renderApp();
        } else {
          document.getElementById("gosGateErr").textContent = "Falscher Code.";
        }
      });
    }
    document.getElementById("gosEnter").addEventListener("click", tryEnter);
    document.getElementById("gosCode").addEventListener("keydown", function (e) { if (e.key === "Enter") tryEnter(); });
    document.getElementById("gosCode").focus();
  }

  var AI = {
    cfg: function () { return (window.MM_CONFIG && MM_CONFIG.growth && MM_CONFIG.growth.ai) || {}; },
    configured: function () { var c = AI.cfg(); return !!(c.endpoint || c.apiKey); }
  };

  /* ======================================================================
     SHELL & ROUTER
     ====================================================================== */
  var TABS = [
    { key: "ideas",   label: "Ideen",       icon: "✍️" },
    { key: "missions",label: "Missionen",   icon: "✅" }
  ];
  var tab = "ideas";
  var state = { editIdea: null, importData: null, scriptIdea: null, hookIdea: null };

  function chip(text, cls) {
    var colors = {
      live: "background:rgba(46,204,113,0.12);color:#2ecc71;border:1px solid rgba(46,204,113,0.3)",
      manual: "background:rgba(46,124,246,0.12);color:var(--accent);border:1px solid rgba(46,124,246,0.3)",
      config: "background:rgba(241,196,15,0.1);color:#f1c40f;border:1px solid rgba(241,196,15,0.3)",
      blocked: "background:rgba(231,76,60,0.1);color:#e74c3c;border:1px solid rgba(231,76,60,0.3)",
      calc: "background:rgba(255,255,255,0.06);color:var(--muted);border:1px solid var(--line)"
    };
    return '<span class="gos-chip" style="' + (colors[cls] || colors.calc) + '">' + text + '</span>';
  }
  function srcChip(source) {
    var map = {
      studio_csv: ["TikTok-Studio-Import", "manual"], manual: ["Eingabe", "manual"],
      api: ["TikTok API", "live"], calc: ["Berechnung", "calc"], ai: ["KI-Schätzung", "config"]
    };
    var m = map[source] || [source || "?", "calc"];
    return chip(m[0], m[1]);
  }
  function confChip(c) {
    return chip("Confidence: " + c, c === "HOCH" ? "live" : c === "MITTEL" ? "config" : "blocked");
  }

  function renderApp() {
    root.innerHTML =
      '<div class="gos-topbar">' +
      '<div><strong style="font-family:var(--font-display);font-size:1.05rem">CONTENT <span class="text-grad">COCKPIT</span></strong>' +
      '<span class="small muted" style="margin-left:10px">Ideen · Hooks · Skripte</span></div>' +
      '<button class="btn btn-ghost btn-sm" id="gosLock">Sperren</button></div>' +
      '<div class="gos-tabs" role="tablist">' + TABS.map(function (t) {
        return '<button role="tab" aria-selected="' + (tab === t.key) + '" class="gos-tab' + (tab === t.key ? " active" : "") + '" data-tab="' + t.key + '">' + t.icon + " " + t.label + '</button>';
      }).join("") + '</div>' +
      '<div id="gosPanel" class="gos-panel"></div>' +
      '<div class="gos-quickbar">' + TABS.slice(0, 6).map(function (t) {
        return '<button data-tab="' + t.key + '" aria-label="' + t.label + '"' + (tab === t.key ? ' class="active"' : "") + '>' + t.icon + '<span>' + t.label + '</span></button>';
      }).join("") + '</div>';
    root.querySelectorAll("[data-tab]").forEach(function (b) {
      b.addEventListener("click", function () { tab = b.dataset.tab; state.editIdea = null; renderApp(); });
    });
    document.getElementById("gosLock").addEventListener("click", function () {
      try { sessionStorage.removeItem("mm_gos_auth"); } catch (e) {}
      renderGate();
    });
    renderPanel();
  }

  function renderPanel() {
    var p = document.getElementById("gosPanel");
    if (tab === "missions") renderMissions(p);
    else renderIdeas(p);
  }

  function todayKey() { return new Date().toISOString().slice(0, 10); }
  function rememberRecommendation(ideaId) {
    var idea = G.S.ideas().find(function (i) { return i.id === ideaId; });
    if (!idea) return;
    ensurePrediction(idea, "dashboard");
  }
  /* Prognose einfrieren (einmal pro Idee) — Grundlage der Kalibrierung.
     Anti-Leakage: Ist die Idee zum Einfrier-Zeitpunkt bereits mit einem
     Video verknüpft, das Ergebnisdaten hat, wäre die „Prognose“ mit
     Kenntnis des Ergebnisses berechnet (die Themen-Historie enthält das
     Video selbst). Solche Retro-Prognosen werden markiert und zählen
     NICHT in die Kalibrierungs-Trefferquote. */
  function ensurePrediction(idea, origin) {
    var recs = G.S.recs();
    if (recs.some(function (r) { return r.ideaId === idea.id; })) return;
    var c = SC.composite(idea);
    if (c.score == null) return;
    var linked = idea.videoId ? G.S.videos().find(function (v) { return v.id === idea.videoId; }) : null;
    var retro = !!(linked && G.metric(linked, "views") != null);
    recs.push({ date: new Date().toISOString(), ideaId: idea.id, title: idea.title, composite: c.score, preset: G.S.settings().presetKey, origin: origin || "publish", retro: retro });
    G.S.saveRecs(recs);
    G.log("rec", "Prognose eingefroren: " + idea.title + " (Score " + c.score + (retro ? ", retro — nicht kalibrierungsrelevant" : "") + ")");
  }

  /* ======================================================================
     IDEEN (§9/§10/§20/§48) — Pipeline, Faktoren, Scores, DNP,
     Hook Lab (§21), Script Studio (§23), Pre-Publish-Check (§58)
     ====================================================================== */
  function newIdea(seed) {
    return Object.assign({
      id: G.uid("i"), title: "", topic: "", cluster: "", format: "", contentClass: "reward",
      status: "IDEA", competition: null, differentiation: null, medRisk: "low",
      factors: { viral: {}, growth: {}, reward: {}, brand: null },
      hooks: {}, hookChecks: {}, script: null, check: {}, videoId: null,
      created: new Date().toISOString()
    }, seed || {});
  }

  function renderIdeas(p) {
    if (state.editIdea) return renderIdeaDetail(p, state.editIdea);
    var ideas = G.S.ideas();
    var html = '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">' +
      '<h3 class="h-card" style="margin:0">Content-Pipeline ' + chip("LIVE", "live") + '</h3>' +
      '<button class="btn btn-primary btn-sm" id="gosNewIdea">＋ Neue Idee</button></div>';
    if (!ideas.length) {
      html += '<div class="card" style="text-align:center;padding:32px"><p class="muted" style="margin:0">Noch keine Ideen. Tippe auf „＋ Neue Idee“ und leg los — Hook Lab und Script Studio warten drin.</p></div>';
    } else {
      var groups = [["Aktiv", D.STATUS_ACTIVE], ["Veröffentlicht", ["PUBLISHED", "ANALYZING", "WINNER"]], ["Archiv", ["ARCHIVED"]]];
      groups.forEach(function (g) {
        var list = ideas.filter(function (i) { return g[1].indexOf(i.status) >= 0; });
        if (!list.length) return;
        html += '<h4 class="small muted" style="margin:16px 0 8px;letter-spacing:0.08em">' + g[0].toUpperCase() + ' (' + list.length + ')</h4>';
        list.sort(function (a, b) { return (SC.composite(b).score || 0) - (SC.composite(a).score || 0); });
        html += list.map(function (i) {
          var c = SC.composite(i);
          var dnp = SC.dnpCheck(i);
          return '<div class="card gos-idea-row" data-idea="' + i.id + '">' +
            '<div style="flex:1;min-width:200px"><strong>' + (dnp.flag ? "🔴 " : "") + esc(i.title || "(ohne Titel)") + '</strong><br>' +
            '<span class="small muted">' + esc(i.topic || "—") + ' · ' + esc(i.status) + ' · ' + esc(D.CONTENT_CLASSES[i.contentClass].label) + '</span></div>' +
            '<div class="mono small" style="text-align:right">' +
            (c.score != null ? 'Opp <strong>' + c.score + '</strong><br><span class="muted">V' + (c.scores.viral.score || "–") + " G" + (c.scores.growth.score || "–") + " R" + (c.scores.reward.score || "–") + '</span>' : '<span class="muted">nicht bewertet</span>') +
            '</div></div>';
        }).join("");
      });
    }
    p.innerHTML = html;
    var ni = document.getElementById("gosNewIdea");
    if (ni) ni.addEventListener("click", function () {
      var ideas2 = G.S.ideas();
      var idea = newIdea();
      ideas2.push(idea); G.S.saveIdeas(ideas2);
      state.editIdea = idea.id; renderPanel();
    });
    p.querySelectorAll("[data-idea]").forEach(function (el) {
      el.addEventListener("click", function () { state.editIdea = el.dataset.idea; renderPanel(); });
    });
  }

  function sliderRow(id, label, hint, val) {
    return '<div class="gos-slider-row"><label for="' + id + '">' + esc(label) + (hint ? ' <span class="muted small">— ' + esc(hint) + '</span>' : "") + '</label>' +
      '<div style="display:flex;align-items:center;gap:10px"><input type="range" min="0" max="10" step="1" id="' + id + '" value="' + (val != null ? val : 5) + '" ' + (val == null ? 'data-unset="1"' : "") + '>' +
      '<span class="mono" id="' + id + '_v" style="width:24px;text-align:right">' + (val != null ? val : "–") + '</span></div></div>';
  }

  function renderIdeaDetail(p, id) {
    var ideas = G.S.ideas();
    var i = ideas.find(function (x) { return x.id === id; });
    if (!i) { state.editIdea = null; return renderPanel(); }
    var c = SC.composite(i);
    var dnp = SC.dnpCheck(i);
    var openScript = state.scriptIdea === id; state.scriptIdea = null;

    function opt(list, sel) { return list.map(function (o) { return '<option' + (o === sel ? " selected" : "") + '>' + esc(o) + '</option>'; }).join(""); }

    var html = '<button class="btn btn-ghost btn-sm" id="gosBack">← Pipeline</button>' +
      /* --- Kopf + Meta --- */
      '<div class="card" style="margin-top:12px">' +
      '<div class="form-row"><div class="field"><label>Titel / Kernthese</label><input id="idTitle" type="text" value="' + esc(i.title) + '" placeholder="z. B. SHBG — der übersehene Hormonwert"></div>' +
      '<div class="field"><label>Status</label><select id="idStatus">' + opt(D.STATUSES, i.status) + '</select></div></div>' +
      '<div class="form-row"><div class="field"><label>Thema</label><select id="idTopic"><option value="">—</option>' + opt(D.TOPICS, i.topic) + '</select></div>' +
      '<div class="field"><label>Format</label><select id="idFormat"><option value="">—</option>' + opt(D.FORMATS, i.format) + '</select></div></div>' +
      '<div class="form-row"><div class="field"><label>Content-Klasse (§36)</label><select id="idClass">' +
      Object.keys(D.CONTENT_CLASSES).map(function (k) { return '<option value="' + k + '"' + (i.contentClass === k ? " selected" : "") + '>' + esc(D.CONTENT_CLASSES[k].label) + '</option>'; }).join("") + '</select></div>' +
      '<div class="field"><label>Cluster / Serie</label><input id="idCluster" type="text" value="' + esc(i.cluster) + '" placeholder="z. B. Testosteron-Cluster"></div></div>' +
      '<p class="small" style="color:#f1c40f;margin:4px 0 0" id="idClassNote">' + (i.contentClass !== "reward" ? "⚠️ " + esc(D.CONTENT_CLASSES[i.contentClass].note) : "") + '</p>' +
      '</div>';

    /* --- Scores --- */
    html += '<div class="card" style="margin-top:14px"><span class="card-num">SCORES ' + chip("interne Berechnung", "calc") + '</span>';
    if (c.score != null) {
      var st = SC.stageInfo(i);
      html += '<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:center;margin:10px 0 4px">' +
        '<div><span style="font-family:var(--font-display);font-size:2rem;font-weight:800" class="text-grad">' + c.score + '</span><span class="muted small"> /100 Opportunity</span></div>' +
        confChip(c.confidence) + chip("Stage " + st.stage + "/4", st.stage >= 3 ? "live" : st.stage >= 1 ? "manual" : "calc") +
        (dnp.flag ? chip("🔴 NICHT PRODUZIEREN", "blocked") : chip("Produzierbar", "live")) + '</div>' +
        '<p class="small muted" style="margin:0 0 4px"><strong>Lernstufe:</strong> ' + esc(st.why) + '</p>';
      ["viral", "growth", "reward"].forEach(function (dim) {
        var s = c.scores[dim];
        html += '<p class="small" style="margin:6px 0 0"><strong>' + dim.toUpperCase() + ": " + (s.score != null ? s.score : "—") + '</strong> · <span class="muted">' + s.basis.map(esc).join(" · ") + '</span></p>';
      });
      if (dnp.flag) html += '<p class="small" style="color:#e74c3c;margin:8px 0 0"><strong>Gründe:</strong> ' + dnp.reasons.map(esc).join("; ") + '</p>';
    } else {
      html += '<p class="small muted" style="margin:8px 0 0">Bewerte unten die Faktoren, dann berechnen sich die Scores.</p>';
    }
    html += '</div>';

    /* --- Faktoren --- */
    html += '<details class="card gos-details" style="margin-top:14px"' + (c.score == null ? " open" : "") + '><summary><strong>Faktoren bewerten (0–10)</strong> <span class="muted small">— deine Selbsteinschätzung, sortiert die Ideen nach Priorität</span></summary>';
    ["viral", "growth", "reward"].forEach(function (dim) {
      html += '<h4 class="small" style="margin:14px 0 6px;letter-spacing:0.06em">' + dim.toUpperCase() + '</h4>';
      D.FACTORS[dim].forEach(function (f) {
        html += sliderRow("f_" + dim + "_" + f.key, f.label, f.hint, (i.factors[dim] || {})[f.key]);
      });
    });
    html += '<h4 class="small" style="margin:14px 0 6px;letter-spacing:0.06em">STRATEGIE</h4>' +
      sliderRow("f_brand", "Strategic Brand Fit", "Passt es zur MaleMetrix-DNA: messbar, seriös, Männer 30–50?", i.factors.brand) +
      sliderRow("f_comp", "Konkurrenz zum Thema", "0 = kaum Content, 10 = übersättigt", i.competition) +
      sliderRow("f_diff", "Differenzierung", "Wie klar ist der MaleMetrix-Unterschied?", i.differentiation) +
      '<div class="field" style="margin-top:10px"><label>Medizinisches Risiko (§54)</label><select id="idMedRisk">' +
      [["low", "🟢 LOW — Lifestyle/Einordnung"], ["med", "🟡 REVIEW — Werte/Studien, Quellen nötig"], ["high", "🔴 HIGH — Medikamente/Therapie/Dosierung"]].map(function (o) {
        return '<option value="' + o[0] + '"' + (i.medRisk === o[0] ? " selected" : "") + '>' + o[1] + '</option>';
      }).join("") + '</select></div>' +
      '</details>';

    /* --- Hook Lab --- */
    html += '<details class="card gos-details" style="margin-top:14px"><summary><strong>🧪 Hook Lab</strong> <span class="muted small">— 10 Typen, Selbstcheck, Empfehlung' + (AI.configured() ? "" : " · KI optional (nicht konfiguriert)") + '</span></summary>' +
      renderHookLab(i) + '</details>';

    /* --- Script Studio --- */
    html += '<details class="card gos-details" style="margin-top:14px"' + (openScript ? " open" : "") + '><summary><strong>✍️ Script Studio</strong> <span class="muted small">— Retention Map, Visuals, Risiko-Check</span></summary>' +
      renderScriptStudio(i) + '</details>';

    /* --- Aktionen --- */
    html += '<div class="card" style="margin-top:14px"><span class="card-num">VERÖFFENTLICHUNG</span>' +
      '<p class="small muted" style="margin:8px 0 0">Fertig? Skript aus dem Script Studio kopieren, Video in TikTok Studio hochladen. Danach hier den Status auf „Veröffentlicht“ setzen.</p>' +
      '<div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">' +
      '<button class="btn btn-primary" id="idSave">Speichern</button>' +
      '<button class="btn btn-ghost" id="idDel">Löschen</button></div></div>';

    p.innerHTML = html;

    /* Slider live */
    p.querySelectorAll('input[type="range"]').forEach(function (r) {
      r.addEventListener("input", function () {
        r.removeAttribute("data-unset");
        var v = document.getElementById(r.id + "_v");
        if (v) v.textContent = r.value;
      });
    });
    document.getElementById("gosBack").addEventListener("click", function () { state.editIdea = null; renderPanel(); });
    document.getElementById("idSave").addEventListener("click", function () { saveIdeaForm(i); });
    document.getElementById("idDel").addEventListener("click", function () {
      if (!confirm("Idee löschen?")) return;
      G.S.saveIdeas(G.S.ideas().filter(function (x) { return x.id !== i.id; }));
      state.editIdea = null; renderPanel();
    });
    bindHookLab(p, i);
    bindScriptStudio(p, i);
  }

  function saveIdeaForm(i) {
    i.title = document.getElementById("idTitle").value.trim();
    i.status = document.getElementById("idStatus").value;
    i.topic = document.getElementById("idTopic").value;
    i.format = document.getElementById("idFormat").value;
    i.contentClass = document.getElementById("idClass").value;
    i.cluster = document.getElementById("idCluster").value.trim();
    i.medRisk = document.getElementById("idMedRisk").value;
    ["viral", "growth", "reward"].forEach(function (dim) {
      i.factors[dim] = i.factors[dim] || {};
      D.FACTORS[dim].forEach(function (f) {
        var el = document.getElementById("f_" + dim + "_" + f.key);
        if (el && !el.hasAttribute("data-unset")) i.factors[dim][f.key] = parseInt(el.value, 10);
      });
    });
    var b = document.getElementById("f_brand");
    if (b && !b.hasAttribute("data-unset")) i.factors.brand = parseInt(b.value, 10);
    var cp = document.getElementById("f_comp");
    if (cp && !cp.hasAttribute("data-unset")) i.competition = parseInt(cp.value, 10);
    var df = document.getElementById("f_diff");
    if (df && !df.hasAttribute("data-unset")) i.differentiation = parseInt(df.value, 10);
    var link = document.getElementById("idLink");
    if (link && link.value) i.videoId = link.value;
    /* Feedback-Loop (§Audit-7): Beim Übergang in die Veröffentlichung wird die
       Prognose EINGEFROREN — sonst gäbe es später nichts Ehrliches zu
       kalibrieren (die Scores ändern sich ja mit der Datenlage weiter). */
    if ((i.status === "PUBLISHED" || i.status === "READY" || i.videoId)) ensurePrediction(i);
    i.updated = new Date().toISOString();
    var all = G.S.ideas();
    var idx = all.findIndex(function (x) { return x.id === i.id; });
    if (idx >= 0) all[idx] = i;
    G.S.saveIdeas(all);
    state.editIdea = null;
    renderPanel();
  }

  /* ---------- Hook Lab (§21/§22) ---------- */
  function renderHookLab(i) {
    var learning = hookLearning();
    var html = "";
    if (learning.rows.length) {
      html += '<div style="border-left:3px solid var(--accent);padding:8px 12px;margin:10px 0"><strong class="small">Account-Learning ' + chip("interne Berechnung", "calc") + '</strong>' +
        '<p class="small muted" style="margin:4px 0 0">' + learning.rows.map(function (r) {
          return esc(r.label) + ": Ø " + G.fmtInt(r.medViews) + " Views, " + (r.medFpk != null ? r.medFpk.toFixed(1) : "—") + " F/1k (" + r.n + " Videos)";
        }).join(" · ") + '</p></div>';
    } else {
      html += '<p class="small muted" style="margin:10px 0">Hook-Learning: Noch nicht genügend Daten (mind. ' + D.MIN_N + ' Videos pro Hook-Typ mit Views). Trage bei importierten Videos den Hook-Typ ein.</p>';
    }
    var best = bestHook(i);
    if (best) {
      html += '<p class="small" style="margin:0 0 10px">💡 <strong>Empfehlung:</strong> ' + esc(best.label) + ' (Selbstcheck ' + best.score + '/100' + (best.histNote ? " · " + esc(best.histNote) : "") + ')</p>';
    }
    html += D.HOOK_TYPES.map(function (h) {
      var text = i.hooks[h.key] || "";
      var checks = (i.hookChecks[h.key] || {});
      var score = text ? SC.hookCheckScore(checks) : null;
      return '<div class="gos-hook" data-hook="' + h.key + '">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><strong class="small">' + esc(h.label) + '</strong>' +
        (score != null ? '<span class="mono small">First-5s: ' + score + '/100</span>' : "") + '</div>' +
        '<p class="small muted" style="margin:2px 0 6px">' + esc(h.desc) + ' <em>Beispiel: „' + esc(h.example) + '“</em></p>' +
        '<textarea rows="2" data-hooktext="' + h.key + '" placeholder="Deine ' + esc(h.label) + '-Hook …">' + esc(text) + '</textarea>' +
        (text ? '<div class="gos-checks">' + D.HOOK_CHECKS.map(function (chk) {
          return '<label class="small"><input type="checkbox" data-hookcheck="' + h.key + ':' + chk.key + '"' + (checks[chk.key] ? " checked" : "") + '> ' + esc(chk.label) + '</label>';
        }).join("") + '</div>' : "") +
        '</div>';
    }).join("");
    html += '<p class="small muted" style="margin-top:8px">Hooks speichern über „Speichern“ unten. Kein Clickbait: Jede Hook muss im Video eingelöst werden.</p>';
    return html;
  }
  function hookLearning() {
    var rows = SC.aggregateBy(function (v) { return v.hookType || null; }, function (k) {
      var h = D.HOOK_TYPES.find(function (x) { return x.key === k; });
      return h ? h.label : k;
    }).filter(function (r) { return r.n >= D.MIN_N; });
    rows.sort(function (a, b) { return (b.medFpk || 0) - (a.medFpk || 0); });
    return { rows: rows.slice(0, 4) };
  }
  function bestHook(i) {
    var learning = hookLearning();
    var best = null;
    D.HOOK_TYPES.forEach(function (h) {
      if (!i.hooks[h.key]) return;
      var score = SC.hookCheckScore(i.hookChecks[h.key] || {});
      var hist = learning.rows.find(function (r) { return r.label === h.label; });
      var bonus = hist ? 5 : 0;
      if (!best || score + bonus > best.score + (best.bonus || 0)) {
        best = { key: h.key, label: h.label, score: score, bonus: bonus, histNote: hist ? "historisch stark auf diesem Account" : "" };
      }
    });
    return best;
  }
  function bindHookLab(p, i) {
    p.querySelectorAll("[data-hooktext]").forEach(function (t) {
      t.addEventListener("change", function () {
        i.hooks[t.dataset.hooktext] = t.value.trim();
        saveIdeaSilent(i);
      });
    });
    p.querySelectorAll("[data-hookcheck]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var parts = cb.dataset.hookcheck.split(":");
        i.hookChecks[parts[0]] = i.hookChecks[parts[0]] || {};
        i.hookChecks[parts[0]][parts[1]] = cb.checked;
        saveIdeaSilent(i);
      });
    });
  }

  /* ---------- Script Studio (§13/§23/§24/§54/§55) ---------- */
  function renderScriptStudio(i) {
    var s = i.script || { mode: "reward", blocks: {}, visuals: {}, onscreen: "", cta: "", caption: "", hashtags: "", searchTerm: "", sources: "", riskAnswers: {} };
    var mode = D.SCRIPT_MODES.find(function (m) { return m.key === s.mode; }) || D.SCRIPT_MODES[0];
    var html = '<div class="field" style="margin-top:10px"><label>Modus</label><select id="scMode">' +
      D.SCRIPT_MODES.map(function (m) { return '<option value="' + m.key + '"' + (s.mode === m.key ? " selected" : "") + '>' + esc(m.label) + '</option>'; }).join("") + '</select></div>' +
      '<p class="small muted">Retention Map: Jeder Block hat einen Job. Maximum Value Density — nicht künstlich strecken (§13).</p>';
    mode.blocks.forEach(function (b, bi) {
      html += '<div class="gos-block"><div style="display:flex;justify-content:space-between;gap:8px"><strong class="small mono">' + esc(b.t) + '</strong><span class="small muted">' + esc(b.label) + '</span></div>' +
        (b.hint ? '<p class="small muted" style="margin:2px 0 4px">' + esc(b.hint) + '</p>' : "") +
        '<textarea rows="2" data-block="' + bi + '" placeholder="Gesprochener Text …">' + esc(s.blocks[bi] || "") + '</textarea>' +
        '<input type="text" data-visual="' + bi + '" placeholder="Visual (z. B. ' + esc(D.VISUAL_HINTS[Math.min(bi, D.VISUAL_HINTS.length - 1)]) + ')" value="' + esc(s.visuals[bi] || "") + '" class="gos-visual-input"></div>';
    });
    html += '<div class="form-row" style="margin-top:10px"><div class="field"><label>Thematischer CTA (§63)</label><input id="scCta" type="text" value="' + esc(s.cta) + '" placeholder="„Der nächste Wert, den ich zerlege: SHBG.“"></div>' +
      '<div class="field"><label>Suchbegriff (Search-to-FYP, §35)</label><input id="scSearch" type="text" value="' + esc(s.searchTerm) + '"></div></div>' +
      '<div class="field"><label>On-Screen-Text (Kernaussagen)</label><textarea id="scOnscreen" rows="2">' + esc(s.onscreen) + '</textarea></div>' +
      '<div class="form-row"><div class="field"><label>Caption</label><textarea id="scCaption" rows="2">' + esc(s.caption) + '</textarea></div>' +
      '<div class="field"><label>Hashtags</label><input id="scTags" type="text" value="' + esc(s.hashtags) + '" placeholder="3–5 thematische Tags — keine #fyp-Mythen (§97)"></div></div>' +
      '<div class="field"><label>Quellen (§55 — niemals erfinden; Tier A/B bevorzugen)</label><textarea id="scSources" rows="2" placeholder="z. B. Leproult & Van Cauter 2011 (JAMA) — Schlafrestriktion & Testosteron">' + esc(s.sources) + '</textarea></div>';

    /* Risiko-Check (§54) */
    var RISK = [
      ["claims", "Enthält unbelegte Gesundheitsbehauptungen"],
      ["dosage", "Enthält Dosierungs-/Therapieanweisungen"],
      ["promise", "Enthält Garantien oder Heilversprechen"],
      ["meds", "Behandelt Medikamente (TRT/GLP-1 …) ohne Arzt-Verweis"]
    ];
    html += '<div style="border-left:3px solid var(--line);padding:8px 12px;margin-top:8px"><strong class="small">Risiko-Check</strong>' +
      RISK.map(function (r) {
        return '<label class="small" style="display:block;margin-top:4px"><input type="checkbox" data-risk="' + r[0] + '"' + (s.riskAnswers[r[0]] ? " checked" : "") + '> ' + esc(r[1]) + '</label>';
      }).join("") +
      '<p class="small" style="margin:8px 0 0" id="scRiskOut">' + riskLabel(s.riskAnswers) + '</p></div>';

    html += '<div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">' +
      '<button class="btn btn-dark btn-sm" id="scCopy">📋 Skript kopieren</button>' +
      (AI.configured()
        ? '<button class="btn btn-dark btn-sm" id="scAi">🤖 KI-Entwurf (wird als KI-VORSCHLAG markiert)</button>'
        : '<span class="small muted" style="align-self:center">🤖 KI-Entwurf: ' + chip("KONFIGURATION ERFORDERLICH", "config") + ' (MM_CONFIG.growth.ai)</span>') +
      '</div><div id="scAiOut"></div>';
    return html;
  }
  function riskLabel(answers) {
    var n = Object.keys(answers || {}).filter(function (k) { return answers[k]; }).length;
    if (!n) return "🟢 LOW — keine Risiko-Marker gesetzt.";
    if (answers.promise || answers.dosage) return "🔴 HIGH — Heilversprechen/Dosierung entfernen oder umformulieren. Kein Publish.";
    return "🟡 REVIEW — Behauptungen mit Quellen (Tier A/B) belegen, Arzt-Verweis ergänzen.";
  }
  function bindScriptStudio(p, i) {
    var container = p;
    function ensure() {
      i.script = i.script || { mode: "reward", blocks: {}, visuals: {}, onscreen: "", cta: "", caption: "", hashtags: "", searchTerm: "", sources: "", riskAnswers: {} };
      return i.script;
    }
    var modeSel = container.querySelector("#scMode");
    if (!modeSel) return;
    modeSel.addEventListener("change", function () {
      ensure().mode = modeSel.value;
      saveIdeaSilent(i);
      state.editIdea = i.id; state.scriptIdea = i.id; renderPanel();
    });
    container.querySelectorAll("[data-block]").forEach(function (t) {
      t.addEventListener("change", function () { ensure().blocks[t.dataset.block] = t.value; saveIdeaSilent(i); });
    });
    container.querySelectorAll("[data-visual]").forEach(function (t) {
      t.addEventListener("change", function () { ensure().visuals[t.dataset.visual] = t.value; saveIdeaSilent(i); });
    });
    [["scCta", "cta"], ["scSearch", "searchTerm"], ["scOnscreen", "onscreen"], ["scCaption", "caption"], ["scTags", "hashtags"], ["scSources", "sources"]].forEach(function (m) {
      var el = container.querySelector("#" + m[0]);
      if (el) el.addEventListener("change", function () { ensure()[m[1]] = el.value; saveIdeaSilent(i); });
    });
    container.querySelectorAll("[data-risk]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var s = ensure();
        s.riskAnswers[cb.dataset.risk] = cb.checked;
        var out = container.querySelector("#scRiskOut");
        if (out) out.textContent = riskLabel(s.riskAnswers).replace(/<[^>]+>/g, "");
        saveIdeaSilent(i);
      });
    });
    var copy = container.querySelector("#scCopy");
    if (copy) copy.addEventListener("click", function () {
      var s = ensure();
      var mode = D.SCRIPT_MODES.find(function (m) { return m.key === s.mode; }) || D.SCRIPT_MODES[0];
      var best = bestHook(i);
      var txt = "SKRIPT: " + (i.title || "") + "\nModus: " + mode.label +
        (best ? "\nHOOK (" + best.label + "): " + (i.hooks[best.key] || "") : "") + "\n\n" +
        mode.blocks.map(function (b, bi) {
          return b.t + " · " + b.label + "\n" + (s.blocks[bi] || "—") + (s.visuals[bi] ? "\n[VISUAL] " + s.visuals[bi] : "");
        }).join("\n\n") +
        "\n\nON-SCREEN: " + (s.onscreen || "—") + "\nCTA: " + (s.cta || "—") +
        "\nSEARCH: " + (s.searchTerm || "—") + "\nCAPTION: " + (s.caption || "—") +
        "\nHASHTAGS: " + (s.hashtags || "—") + "\nQUELLEN: " + (s.sources || "—");
      navigator.clipboard.writeText(txt).then(function () { alert("Skript in Zwischenablage kopiert."); });
    });
    var ai = container.querySelector("#scAi");
    if (ai) ai.addEventListener("click", function () { aiScriptDraft(i, container.querySelector("#scAiOut")); });
  }
  function saveIdeaSilent(i) {
    var all = G.S.ideas();
    var idx = all.findIndex(function (x) { return x.id === i.id; });
    if (idx >= 0) { all[idx] = i; G.S.saveIdeas(all); }
  }
  async function aiScriptDraft(i, out) {
    var cfg = AI.cfg();
    out.innerHTML = '<p class="small muted">KI-Entwurf wird erzeugt …</p>';
    try {
      var mode = D.SCRIPT_MODES.find(function (m) { return m.key === (i.script && i.script.mode) || false; }) || D.SCRIPT_MODES[0];
      var body = {
        model: cfg.model || "claude-sonnet-5", max_tokens: 1200,
        messages: [{ role: "user", content:
          "Schreibe einen deutschen TikTok-Skript-Entwurf für den MaleMetrix-Account (Männergesundheit 30–50, seriös, evidenzbasiert, keine Heilversprechen, keine erfundenen Studien — wenn du keine Quelle sicher weißt, schreibe [QUELLE PRÜFEN]).\nThema: " + (i.title || i.topic) +
          "\nModus: " + mode.label + "\nStruktur (genau diese Blöcke, je 1–3 Sätze gesprochener Text):\n" +
          mode.blocks.map(function (b) { return b.t + " " + b.label; }).join("\n") }]
      };
      var url = cfg.endpoint || "https://api.anthropic.com/v1/messages";
      var headers = { "content-type": "application/json" };
      if (!cfg.endpoint) {
        headers["x-api-key"] = cfg.apiKey;
        headers["anthropic-version"] = "2023-06-01";
        headers["anthropic-dangerous-direct-browser-access"] = "true";
      }
      var res = await fetch(url, { method: "POST", headers: headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("API-Fehler " + res.status);
      var data = await res.json();
      var text = (data.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("\n");
      out.innerHTML = '<div style="border-left:3px solid #f1c40f;padding:8px 12px;margin-top:10px">' + chip("KI-VORSCHLAG — prüfen, nicht ungeprüft übernehmen", "config") +
        '<pre class="small" style="white-space:pre-wrap;margin:8px 0 0">' + esc(text) + '</pre></div>';
      G.log("ai", "Skript-Entwurf erzeugt für: " + i.title);
    } catch (e) {
      out.innerHTML = '<p class="small" style="color:#e74c3c">KI-Aufruf fehlgeschlagen: ' + esc(e.message) + '</p>';
      G.log("ai", "Fehler: " + e.message);
    }
  }

  /* ======================================================================
     MISSIONEN (§39) — manuelle Checkliste
     ====================================================================== */
  function renderMissions(p) {
    var all = G.S.missions();
    var today = all[todayKey()] || {};
    var html = '<h3 class="h-card" style="margin-bottom:6px">Today’s Growth Missions ' + chip("LIVE", "live") + '</h3>' +
      '<p class="small muted" style="margin:0 0 14px">Manuelle Arbeit mit System — keine Automatisierung, kein Spam. Kommentare schreibst du selbst; das OS liefert nur Struktur.</p>' +
      '<div class="card">' + D.MISSIONS.map(function (m) {
        return '<label class="gos-mission"><input type="checkbox" data-mission="' + m.key + '"' + (today[m.key] ? " checked" : "") + '> <span>' + esc(m.label) + '</span></label>';
      }).join("") + '</div>' +
      '<p class="small muted" style="margin-top:10px">Kommentar-Qualität statt „Tolles Video 🔥“: fachlicher Mehrwert in 1–2 Sätzen (z. B. SHBG-Perspektive ergänzen). Absenden immer manuell durch dich (§40).</p>';
    /* 7-Tage-Verlauf */
    var days = [];
    for (var d = 6; d >= 0; d--) {
      var k = new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
      var m = all[k] || {};
      days.push({ k: k, done: Object.keys(m).filter(function (x) { return m[x]; }).length });
    }
    html += '<div class="card" style="margin-top:12px"><strong class="small">Letzte 7 Tage</strong><p class="small mono" style="margin:6px 0 0">' +
      days.map(function (x) { return x.k.slice(8) + ".: " + x.done + "/" + D.MISSIONS.length; }).join(" · ") + '</p></div>';
    p.innerHTML = html;
    p.querySelectorAll("[data-mission]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var allM = G.S.missions();
        allM[todayKey()] = allM[todayKey()] || {};
        allM[todayKey()][cb.dataset.mission] = cb.checked;
        G.S.saveMissions(allM);
      });
    });
  }


  /* ======================================================================
     START
     ====================================================================== */
  if (isAuthed()) renderApp(); else renderGate();
})();
