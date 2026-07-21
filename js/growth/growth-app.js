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
      '<p class="muted small" style="margin-bottom:18px">Zugangscode eingeben. Alle Daten bleiben lokal auf diesem Gerät — auf dem Server liegen keine Nutzerdaten.</p>' +
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

  /* ======================================================================
     TIKTOK-ADAPTER (§5/§77) — spricht NUR mit dem eigenen Worker.
     Ohne konfigurierten Worker: Level 0 (Manual Mode).
     ====================================================================== */
  var TT = {
    cfg: function () { return (window.MM_CONFIG && MM_CONFIG.growth && MM_CONFIG.growth.tiktok) || {}; },
    configured: function () { return !!(TT.cfg().apiBase); },
    status: null,
    async fetchStatus() {
      if (!TT.configured()) return null;
      try {
        var r = await fetch(TT.cfg().apiBase.replace(/\/$/, "") + "/api/status", {
          headers: { "x-admin-key": TT.cfg().adminKey || "" }
        });
        if (!r.ok) throw new Error("HTTP " + r.status);
        TT.status = await r.json();
        return TT.status;
      } catch (e) {
        G.log("tiktok", "Status-Abruf fehlgeschlagen: " + e.message);
        TT.status = { error: e.message };
        return TT.status;
      }
    },
    level: function () {
      if (!TT.configured()) return 0;
      if (TT.status && TT.status.connected) return TT.status.videosAvailable ? 2 : 1;
      return 0;
    }
  };
  var AI = {
    cfg: function () { return (window.MM_CONFIG && MM_CONFIG.growth && MM_CONFIG.growth.ai) || {}; },
    configured: function () { var c = AI.cfg(); return !!(c.endpoint || c.apiKey); }
  };

  /* ======================================================================
     SHELL & ROUTER
     ====================================================================== */
  var TABS = [
    { key: "dash",    label: "Dashboard",   icon: "🔥" },
    { key: "videos",  label: "Videos",      icon: "📈" },
    { key: "ideas",   label: "Ideen",       icon: "✍️" },
    { key: "search",  label: "Suche",       icon: "🔎" },
    { key: "works",   label: "What Works",  icon: "🏆" },
    { key: "missions",label: "Missionen",   icon: "✅" },
    { key: "settings",label: "System",      icon: "⚙️" }
  ];
  var tab = "dash";
  var state = { editIdea: null, detailVideo: null, importData: null, scriptIdea: null, hookIdea: null };

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
    var lvl = TT.level();
    root.innerHTML =
      '<div class="gos-topbar">' +
      '<div><strong style="font-family:var(--font-display);font-size:1.05rem">GROWTH <span class="text-grad">COMMAND CENTER</span></strong>' +
      '<span class="small muted" style="margin-left:10px">Level ' + lvl + ' · ' + esc(D.LEVELS[lvl].label) + '</span></div>' +
      '<button class="btn btn-ghost btn-sm" id="gosLock">Sperren</button></div>' +
      '<div class="gos-tabs" role="tablist">' + TABS.map(function (t) {
        return '<button role="tab" aria-selected="' + (tab === t.key) + '" class="gos-tab' + (tab === t.key ? " active" : "") + '" data-tab="' + t.key + '">' + t.icon + " " + t.label + '</button>';
      }).join("") + '</div>' +
      '<div id="gosPanel" class="gos-panel"></div>' +
      '<div class="gos-quickbar">' + TABS.slice(0, 6).map(function (t) {
        return '<button data-tab="' + t.key + '" aria-label="' + t.label + '"' + (tab === t.key ? ' class="active"' : "") + '>' + t.icon + '<span>' + t.label + '</span></button>';
      }).join("") + '</div>';
    root.querySelectorAll("[data-tab]").forEach(function (b) {
      b.addEventListener("click", function () { tab = b.dataset.tab; state.editIdea = null; state.detailVideo = null; renderApp(); });
    });
    document.getElementById("gosLock").addEventListener("click", function () {
      try { sessionStorage.removeItem("mm_gos_auth"); } catch (e) {}
      renderGate();
    });
    renderPanel();
  }

  function renderPanel() {
    var p = document.getElementById("gosPanel");
    if (tab === "dash") renderDash(p);
    else if (tab === "videos") renderVideos(p);
    else if (tab === "ideas") renderIdeas(p);
    else if (tab === "search") renderSearch(p);
    else if (tab === "works") renderWorks(p);
    else if (tab === "missions") renderMissions(p);
    else if (tab === "settings") renderSettings(p);
  }

  /* ======================================================================
     DASHBOARD (§8/§37/§53/§70)
     ====================================================================== */
  function statBox(val, label, sub) {
    return '<div class="tstat"><div class="tstat-num text-grad">' + val + '</div><div class="tstat-label">' + label + (sub ? '<br><span style="opacity:0.7">' + sub + '</span>' : "") + '</div></div>';
  }
  function deltaStr(cur, prev) {
    if (cur == null || prev == null || !prev) return "";
    var d = ((cur - prev) / prev) * 100;
    var s = (d >= 0 ? "+" : "") + d.toFixed(0) + "%";
    return '<span style="color:' + (d >= 0 ? "#2ecc71" : "#e74c3c") + '"> ' + s + '</span>';
  }

  function renderDash(p) {
    var vids = G.S.videos();
    var hasData = vids.some(function (v) { return G.metric(v, "views") != null; });
    var d7 = SC.periodSummary(7, 0), d7p = SC.periodSummary(7, 7);
    var d30 = SC.periodSummary(30, 0), d30p = SC.periodSummary(30, 30);
    var opps = SC.topOpportunities(3);
    var stale = SC.staleRules();
    var target = SC.targetStatus();
    var cal = SC.calibration();

    var html = "";

    /* Status-Banner: ehrlicher Datenmodus */
    html += '<div class="card gos-banner">' +
      (TT.configured()
        ? '<span>🔌 TikTok-Worker konfiguriert — Verbindung unter <a href="#" data-goto="settings">System</a> prüfen.</span>'
        : '<span>📥 <strong>Level 0 · Manual Mode:</strong> Alle Kennzahlen stammen aus TikTok-Studio-Importen und Eingaben. Die TikTok-API-Anbindung ist vorbereitet (siehe System → TikTok-Verbindung), benötigt aber Konfiguration + TikTok-Genehmigung.</span>') +
      "</div>";

    if (stale.length) {
      html += '<div class="card" style="border-color:rgba(241,196,15,0.4);margin-bottom:16px"><span class="small">⚠️ <strong>' + stale.length + ' TikTok-Regel(n) nicht verifiziert</strong> oder älter als ' + D.RULE_MAX_AGE_DAYS + ' Tage. Reward-/Eligibility-Aussagen basieren auf unbestätigten Annahmen → im TikTok Studio prüfen und unter System → Plattform-Regeln bestätigen.</span></div>';
    }

    /* Executive KPIs */
    html += '<h3 class="h-card" style="margin-bottom:10px">Executive Summary ' + srcChip(hasData ? "studio_csv" : "manual") + '</h3>';
    if (!hasData) {
      html += '<div class="card" style="margin-bottom:18px"><p class="muted" style="margin:0">Noch keine Videodaten importiert. → <a href="#" data-goto="videos">Videos & TikTok-Studio-Import</a>. Es werden keine Zahlen erfunden.</p></div>';
    } else {
      html += '<div class="stat-grid-tracker" style="margin-bottom:8px">' +
        statBox(G.fmtInt(d7.views) + deltaStr(d7.views, d7p.views), "Views (7 T.)", d7.count + " Videos") +
        statBox(G.fmtInt(d7.followers) + deltaStr(d7.followers, d7p.followers), "Follower (7 T.)") +
        statBox(G.fmtInt(d30.views) + deltaStr(d30.views, d30p.views), "Views (30 T.)", d30.count + " Videos") +
        statBox(G.fmtEur(d30.rewardEur) + deltaStr(d30.rewardEur, d30p.rewardEur), "Rewards (30 T.)") +
        '</div>' +
        '<p class="small muted" style="margin:0 0 18px">Zeitraum = Videos, die im Zeitraum veröffentlicht wurden; Werte = letzter importierter Stand. Vergleich: vorherige Periode.</p>';
    }

    /* Target Mode */
    if (target) {
      var tLabel = { followers: "neue Follower", reward: "€ Rewards", views: "Views" }[target.target.type];
      html += '<div class="card" style="margin-bottom:18px"><span class="card-num">ZIEL ' + esc(target.month) + '</span>' +
        '<p style="margin:6px 0 4px"><strong>' + G.fmtInt(target.target.amount) + ' ' + tLabel + '</strong> — aktuell: ' + (target.current != null ? G.fmtInt(target.current) : "keine Daten") +
        (target.forecast != null ? ' · Forecast: ' + G.fmtInt(target.forecast) + (target.gap > 0 ? ' <span style="color:#e74c3c">(−' + G.fmtInt(target.gap) + ')</span>' : ' <span style="color:#2ecc71">(Ziel in Reichweite)</span>') : "") + '</p>' +
        '<p class="small muted" style="margin:0">' + esc(target.note) + '</p></div>';
    }

    /* Today's Top Opportunities + Next Best Action */
    html += '<h3 class="h-card" style="margin-bottom:10px">Today’s Top Opportunities ' + chip("interne Berechnung", "calc") + '</h3>';
    if (!opps.top.length) {
      html += '<div class="card" style="margin-bottom:18px"><p class="muted" style="margin:0">Noch keine bewerteten Ideen in der Pipeline. → <a href="#" data-goto="ideas">Idee anlegen und Faktoren bewerten</a>.' +
        (opps.blocked.length ? ' (' + opps.blocked.length + ' Idee(n) stehen auf 🔴 NICHT PRODUZIEREN.)' : "") + '</p></div>';
    } else {
      var medals = ["🥇", "🥈", "🥉"];
      html += opps.top.map(function (o, i) {
        var s = o.composite.scores;
        return '<div class="card" style="margin-bottom:10px' + (i === 0 ? ";border-color:var(--accent-line);background:var(--accent-soft)" : "") + '">' +
          '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">' +
          '<div><strong>' + medals[i] + " " + esc(o.idea.title) + '</strong> <span class="small muted">' + esc(o.idea.topic || "") + '</span><br>' +
          '<span class="small mono">Opportunity ' + o.composite.score + ' · Viral ' + (s.viral.score != null ? s.viral.score : "—") + ' · Growth ' + (s.growth.score != null ? s.growth.score : "—") + ' · Reward ' + (s.reward.score != null ? s.reward.score : "—") + '</span> ' + confChip(o.composite.confidence) + '</div>' +
          (i === 0 ? '<button class="btn btn-primary btn-sm" data-script-for="' + o.idea.id + '">✍️ Skript erzeugen</button>' : '<button class="btn btn-dark btn-sm" data-open-idea="' + o.idea.id + '">Öffnen</button>') +
          '</div>' +
          (i === 0 ? '<p class="small muted" style="margin:8px 0 0"><strong>Warum:</strong> ' + o.composite.scores.growth.basis.concat(o.composite.scores.reward.basis).slice(0, 3).map(esc).join(" · ") + '</p>' : "") +
          '</div>';
      }).join("");
      html += '<p class="small muted" style="margin:4px 0 18px">Gewichtung: ' + esc((D.WEIGHT_PRESETS[G.S.settings().presetKey] || {}).label || "Custom") + ' — änderbar unter System.</p>';
    }
    if (opps.blocked.length) {
      html += '<div class="card" style="border-color:rgba(231,76,60,0.35);margin-bottom:18px"><span class="card-num" style="color:#e74c3c">🔴 NICHT PRODUZIEREN</span>' +
        opps.blocked.map(function (o) {
          return '<p class="small" style="margin:6px 0 0"><strong>' + esc(o.idea.title) + '</strong> — ' + o.dnp.reasons.map(esc).join("; ") + '</p>';
        }).join("") + '</div>';
    }

    /* Pipeline + letzte Videos + Missionen */
    var byStatus = {};
    G.S.ideas().forEach(function (i) { byStatus[i.status] = (byStatus[i.status] || 0) + 1; });
    html += '<div class="grid-3" style="margin-bottom:18px">' +
      '<div class="card"><span class="card-num">PIPELINE</span><p style="margin:8px 0 0" class="small">' +
      (Object.keys(byStatus).length ? D.STATUSES.filter(function (s) { return byStatus[s]; }).map(function (s) { return esc(s) + ": <strong>" + byStatus[s] + "</strong>"; }).join(" · ") : "Leer — starte mit einer Idee.") + '</p></div>' +
      '<div class="card"><span class="card-num">LETZTE VIDEOS</span>' +
      (vids.length ? vids.slice().sort(function (a, b) { return new Date(b.postAt || 0) - new Date(a.postAt || 0); }).slice(0, 3).map(function (v) {
        var w = SC.winner(v);
        return '<p class="small" style="margin:8px 0 0">' + (w.isWinner ? "🏆 " : "") + esc(v.title) + ' — ' + G.fmtInt(G.metric(v, "views")) + ' Views</p>';
      }).join("") : '<p class="small muted" style="margin:8px 0 0">Keine Videos erfasst.</p>') + '</div>' +
      '<div class="card"><span class="card-num">MISSIONEN HEUTE</span>' + (function () {
        var m = (G.S.missions()[todayKey()] || {});
        var done = Object.keys(m).filter(function (k) { return m[k]; }).length;
        return '<p class="small" style="margin:8px 0 0"><strong>' + done + "/" + D.MISSIONS.length + '</strong> erledigt — <a href="#" data-goto="missions">öffnen</a></p>';
      })() + '</div></div>';

    /* Kalibrierung (§87) */
    html += '<div class="card"><span class="card-num">EMPFEHLUNGS-KALIBRIERUNG</span>' +
      (cal.ready
        ? '<p class="small" style="margin:8px 0 0">Trefferquote Empfehlung → Ergebnis: <strong>' + Math.round(cal.hitRate * 100) + ' %</strong> (' + cal.n + ' abgeschlossene Empfehlungen).</p>'
        : '<p class="small muted" style="margin:8px 0 0">Noch nicht genügend Daten (' + cal.n + '/' + cal.need + ' Empfehlungen mit Ergebnis). Das System bewertet seine eigenen Empfehlungen, sobald genug Videos durchlaufen sind.</p>') + '</div>';

    p.innerHTML = html;
    p.querySelectorAll("[data-goto]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); tab = a.dataset.goto; renderApp(); });
    });
    p.querySelectorAll("[data-open-idea]").forEach(function (b) {
      b.addEventListener("click", function () { tab = "ideas"; state.editIdea = b.dataset.openIdea; renderApp(); });
    });
    p.querySelectorAll("[data-script-for]").forEach(function (b) {
      b.addEventListener("click", function () {
        rememberRecommendation(b.dataset.scriptFor);
        tab = "ideas"; state.editIdea = b.dataset.scriptFor; state.scriptIdea = b.dataset.scriptFor; renderApp();
      });
    });
  }
  function todayKey() { return new Date().toISOString().slice(0, 10); }
  function rememberRecommendation(ideaId) {
    var idea = G.S.ideas().find(function (i) { return i.id === ideaId; });
    if (!idea) return;
    var c = SC.composite(idea);
    var recs = G.S.recs();
    recs.push({ date: new Date().toISOString(), ideaId: ideaId, title: idea.title, composite: c.score, preset: G.S.settings().presetKey });
    G.S.saveRecs(recs);
    G.log("rec", "Empfehlung gemerkt: " + idea.title + " (Score " + c.score + ")");
  }

  /* ======================================================================
     VIDEOS (§49/§50/§51) — CRUD, Snapshots, CSV-Import, Detail
     ====================================================================== */
  function renderVideos(p) {
    if (state.detailVideo) return renderVideoDetail(p, state.detailVideo);
    if (state.importData) return renderImportWizard(p);

    var vids = G.S.videos().slice().sort(function (a, b) { return new Date(b.postAt || 0) - new Date(a.postAt || 0); });
    var html = '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">' +
      '<h3 class="h-card" style="margin:0">Videos ' + chip("MANUELLER IMPORT · LIVE", "manual") + '</h3>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<label class="btn btn-primary btn-sm" style="cursor:pointer">📥 TikTok-Studio-CSV<input type="file" id="gosCsv" accept=".csv,text/csv" style="display:none"></label>' +
      '<button class="btn btn-dark btn-sm" id="gosNewVid">＋ Video manuell</button></div></div>' +
      '<p class="small muted" style="margin:0 0 14px">Export im TikTok Studio: Analytics → Daten herunterladen (CSV). Jeder Import wird als Snapshot gespeichert — so entsteht ein Verlauf pro Video.</p>';

    if (!vids.length) {
      html += '<div class="empty-state card" style="text-align:center;padding:32px"><p class="muted" style="margin:0">Noch keine Videos. CSV importieren oder manuell anlegen.</p></div>';
    } else {
      html += '<div style="overflow-x:auto"><table class="gos-table"><thead><tr><th>Video</th><th>Datum</th><th>Views</th><th>Follower</th><th>F/1k</th><th>QV-Quote</th><th>RPM</th><th>Reward</th><th></th></tr></thead><tbody>' +
        vids.map(function (v) {
          var w = SC.winner(v);
          return '<tr><td>' + (w.isWinner ? "🏆 " : "") + esc(v.title) + '<br><span class="small muted">' + esc(v.topic || "—") + ' · ' + esc(v.format || "—") + '</span></td>' +
            '<td class="mono">' + G.fmtDate(v.postAt) + '</td>' +
            '<td class="mono">' + G.fmtInt(G.metric(v, "views")) + '</td>' +
            '<td class="mono">' + G.fmtInt(G.metric(v, "followers")) + '</td>' +
            '<td class="mono">' + (G.followerPer1k(v) != null ? G.followerPer1k(v).toFixed(1) : "—") + '</td>' +
            '<td class="mono">' + (G.qvRatio(v) != null ? Math.round(G.qvRatio(v) * 100) + "%" : "—") + '</td>' +
            '<td class="mono">' + (G.rpm(v) != null ? G.rpm(v).toFixed(2) + " €" : "—") + '</td>' +
            '<td class="mono">' + (G.metric(v, "rewardEur") != null ? G.fmtEur(G.metric(v, "rewardEur")) : "—") + '</td>' +
            '<td><button class="btn btn-dark btn-sm" data-detail="' + v.id + '">Details</button></td></tr>';
        }).join("") + '</tbody></table></div>';
    }
    p.innerHTML = html;
    var csv = document.getElementById("gosCsv");
    if (csv) csv.addEventListener("change", function (e) { if (e.target.files[0]) startImport(e.target.files[0]); });
    var nv = document.getElementById("gosNewVid");
    if (nv) nv.addEventListener("click", function () { state.detailVideo = "NEW"; renderPanel(); });
    p.querySelectorAll("[data-detail]").forEach(function (b) {
      b.addEventListener("click", function () { state.detailVideo = b.dataset.detail; renderPanel(); });
    });
  }

  /* ---------- CSV-Import-Wizard: Mapping bestätigen, Vorschau, Duplikate ---------- */
  function startImport(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var rows = G.parseCSV(String(reader.result || ""));
      if (rows.length < 2) { alert("CSV enthält keine Datenzeilen."); return; }
      var header = rows[0];
      state.importData = {
        header: header, rows: rows.slice(1),
        map: header.map(function (h) { return G.guessHeader(h); })
      };
      renderPanel();
    };
    reader.onerror = function () { alert("Datei konnte nicht gelesen werden."); };
    reader.readAsText(file);
  }
  var IMPORT_FIELDS = [
    ["", "— ignorieren —"], ["title", "Titel"], ["postAt", "Datum"], ["views", "Views"],
    ["likes", "Likes"], ["comments", "Kommentare"], ["shares", "Shares"], ["saves", "Saves"],
    ["followers", "Neue Follower"], ["qualifiedViews", "Qualified Views"], ["rewardEur", "Reward (€)"],
    ["lengthSec", "Länge (Sek.)"], ["watchTimeSec", "Watchtime (Sek.)"], ["retention", "Retention/Completion"], ["url", "URL"]
  ];
  function renderImportWizard(p) {
    var im = state.importData;
    var html = '<h3 class="h-card">CSV-Import — Spalten zuordnen ' + chip("MANUELLER IMPORT", "manual") + '</h3>' +
      '<p class="small muted">Vorbelegung ist ein Vorschlag — bitte prüfen und bestätigen (§50). ' + im.rows.length + ' Zeilen erkannt.</p>' +
      '<div style="overflow-x:auto"><table class="gos-table"><thead><tr>' +
      im.header.map(function (h, i) {
        return '<th>' + esc(h) + '<br><select data-col="' + i + '" class="gos-select">' +
          IMPORT_FIELDS.map(function (f) { return '<option value="' + f[0] + '"' + (im.map[i] === f[0] ? " selected" : "") + '>' + f[1] + '</option>'; }).join("") +
          '</select></th>';
      }).join("") + '</tr></thead><tbody>' +
      im.rows.slice(0, 5).map(function (r) {
        return '<tr>' + im.header.map(function (_, i) { return '<td class="small">' + esc((r[i] || "").slice(0, 40)) + '</td>'; }).join("") + '</tr>';
      }).join("") + '</tbody></table></div>' +
      '<div style="display:flex;gap:10px;margin-top:14px">' +
      '<button class="btn btn-primary" id="gosDoImport">Import bestätigen</button>' +
      '<button class="btn btn-ghost" id="gosCancelImport">Abbrechen</button></div>' +
      '<p class="small muted" id="gosImportMsg" style="margin-top:10px"></p>';
    p.innerHTML = html;
    p.querySelectorAll("[data-col]").forEach(function (s) {
      s.addEventListener("change", function () { im.map[parseInt(s.dataset.col, 10)] = s.value; });
    });
    document.getElementById("gosCancelImport").addEventListener("click", function () { state.importData = null; renderPanel(); });
    document.getElementById("gosDoImport").addEventListener("click", doImport);
  }
  function doImport() {
    var im = state.importData;
    if (im.map.indexOf("title") < 0) { document.getElementById("gosImportMsg").textContent = "Mindestens „Titel“ muss zugeordnet sein."; return; }
    var vids = G.S.videos();
    var added = 0, updated = 0, skipped = 0;
    im.rows.forEach(function (r) {
      var rec = {};
      im.map.forEach(function (f, i) { if (f) rec[f] = r[i]; });
      var title = String(rec.title || "").trim();
      if (!title) { skipped++; return; }
      var postAt = rec.postAt ? parseDateFlexible(rec.postAt) : null;
      var snap = { ts: new Date().toISOString(), source: "studio_csv", verified: true };
      ["views", "likes", "comments", "shares", "saves", "followers", "qualifiedViews"].forEach(function (k) {
        var n = G.num(rec[k]); if (n != null) snap[k] = n;
      });
      var rw = rec.rewardEur != null ? G.numRaw(String(rec.rewardEur).replace(/[€\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")) : null;
      if (rw != null) snap.rewardEur = rw;
      if (rec.retention != null) { var rt = G.numRaw(String(rec.retention).replace("%", "").replace(",", ".")); if (rt != null) snap.retention = rt > 1 ? rt / 100 : rt; }
      if (rec.watchTimeSec != null) { var wt = G.num(rec.watchTimeSec); if (wt != null) snap.watchTimeSec = wt; }
      /* Duplikate: gleicher Titel (und Datum, falls beide vorhanden) => Snapshot anhängen */
      var existing = vids.find(function (v) {
        if (rec.url && v.url && v.url === String(rec.url).trim()) return true;
        return v.title === title && (!postAt || !v.postAt || v.postAt.slice(0, 10) === postAt.slice(0, 10));
      });
      if (existing) {
        existing.snapshots = existing.snapshots || [];
        existing.snapshots.push(snap);
        if (!existing.postAt && postAt) existing.postAt = postAt;
        if (!existing.lengthSec && G.num(rec.lengthSec) != null) existing.lengthSec = G.num(rec.lengthSec);
        updated++;
      } else {
        vids.push({
          id: G.uid("v"), title: title, url: rec.url ? String(rec.url).trim() : "",
          postAt: postAt, lengthSec: G.num(rec.lengthSec), topic: "", cluster: "", format: "",
          hookType: "", hookText: "", searchTerm: "", contentClass: "reward", promoted: false,
          prodMinutes: null, notes: "", snapshots: [snap], created: new Date().toISOString()
        });
        added++;
      }
    });
    G.S.saveVideos(vids);
    G.log("import", "CSV: " + added + " neu, " + updated + " aktualisiert, " + skipped + " übersprungen");
    state.importData = null;
    renderPanel();
    setTimeout(function () { alert("Import fertig: " + added + " neue Videos, " + updated + " aktualisiert (Snapshot angehängt), " + skipped + " Zeilen ohne Titel übersprungen.\n\nTipp: Öffne die neuen Videos und ergänze Thema/Format/Hook-Typ — davon lernt das System."); }, 50);
  }
  function parseDateFlexible(s) {
    s = String(s).trim();
    var m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/); // deutsch
    if (m) { var y = m[3].length === 2 ? "20" + m[3] : m[3]; return y + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0") + "T12:00:00"; }
    var d = new Date(s);
    return isNaN(d) ? null : d.toISOString();
  }

  /* ---------- Video-Detail (§49) ---------- */
  function renderVideoDetail(p, id) {
    var isNew = id === "NEW";
    var vids = G.S.videos();
    var v = isNew ? {
      id: G.uid("v"), title: "", url: "", postAt: new Date().toISOString().slice(0, 16), lengthSec: null,
      topic: "", cluster: "", format: "", hookType: "", hookText: "", searchTerm: "",
      contentClass: "reward", promoted: false, prodMinutes: G.S.settings().prodMinutesDefault,
      notes: "", snapshots: [], created: new Date().toISOString()
    } : vids.find(function (x) { return x.id === id; });
    if (!v) { state.detailVideo = null; return renderPanel(); }

    var w = isNew ? null : SC.winner(v);
    var qd = isNew ? null : SC.qvDiagnosis(v);
    var last = G.lastSnap(v);

    function opt(list, sel) { return list.map(function (o) { return '<option' + (o === sel ? " selected" : "") + '>' + esc(o) + '</option>'; }).join(""); }

    var html = '<button class="btn btn-ghost btn-sm" id="gosBack">← Zurück</button>' +
      '<div class="card" style="margin-top:12px">' +
      '<h3 class="h-card">' + (isNew ? "Neues Video" : esc(v.title)) + (w && w.isWinner ? ' 🏆' : "") + '</h3>' +
      (w ? '<p class="small muted" style="margin:2px 0 12px"><strong>Winner-Check:</strong> ' + w.why.map(esc).join(" · ") + ' ' + chip("interne Berechnung", "calc") + '</p>' : "") +
      '<div class="form-row"><div class="field"><label>Titel</label><input id="vdTitle" type="text" value="' + esc(v.title) + '"></div>' +
      '<div class="field"><label>Veröffentlicht am</label><input id="vdDate" type="datetime-local" value="' + (v.postAt ? v.postAt.slice(0, 16) : "") + '"></div></div>' +
      '<div class="form-row"><div class="field"><label>Thema</label><select id="vdTopic"><option value="">—</option>' + opt(D.TOPICS, v.topic) + '</select></div>' +
      '<div class="field"><label>Format</label><select id="vdFormat"><option value="">—</option>' + opt(D.FORMATS, v.format) + '</select></div></div>' +
      '<div class="form-row"><div class="field"><label>Hook-Typ</label><select id="vdHook"><option value="">—</option>' +
      D.HOOK_TYPES.map(function (h) { return '<option value="' + h.key + '"' + (v.hookType === h.key ? " selected" : "") + '>' + esc(h.label) + '</option>'; }).join("") + '</select></div>' +
      '<div class="field"><label>Länge (Sek.)</label><input id="vdLen" type="number" value="' + (v.lengthSec || "") + '"></div></div>' +
      '<div class="form-row"><div class="field"><label>Content-Klasse (§36)</label><select id="vdClass">' +
      Object.keys(D.CONTENT_CLASSES).map(function (k) { return '<option value="' + k + '"' + (v.contentClass === k ? " selected" : "") + '>' + esc(D.CONTENT_CLASSES[k].label) + '</option>'; }).join("") + '</select></div>' +
      '<div class="field"><label>Produktionszeit (Min.)</label><input id="vdProd" type="number" value="' + (v.prodMinutes || "") + '"></div></div>' +
      '<label class="small" style="display:flex;gap:8px;align-items:center;margin:4px 0 10px"><input type="checkbox" id="vdPromoted"' + (v.promoted ? " checked" : "") + '> Promoted/Anzeigen-Traffic (getrennt halten — promotete Views ≠ Reward-Views, §65)</label>' +
      '<div class="field"><label>Suchbegriff (Search-Intent)</label><input id="vdSearch" type="text" value="' + esc(v.searchTerm) + '"></div>' +
      '<div class="field" style="margin-top:10px"><label>Notizen</label><textarea id="vdNotes" rows="2">' + esc(v.notes) + '</textarea></div>' +
      (v.contentClass !== "reward" ? '<p class="small" style="color:#f1c40f;margin:8px 0 0">⚠️ ' + esc(D.CONTENT_CLASSES[v.contentClass].note) + '</p>' : "") +
      '<div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">' +
      '<button class="btn btn-primary" id="vdSave">Speichern</button>' +
      (!isNew ? '<button class="btn btn-dark" id="vdSnap">＋ Kennzahlen-Snapshot</button><button class="btn btn-ghost" id="vdDel">Löschen</button>' : "") +
      '</div></div>';

    /* Kennzahlen + Verlauf */
    if (!isNew) {
      html += '<div class="card" style="margin-top:14px"><span class="card-num">KENNZAHLEN (letzter Stand ' + (last ? G.fmtDate(last.ts) : "—") + ') ' + (last ? srcChip(last.source) : "") + '</span>' +
        '<div class="stat-grid-tracker" style="margin-top:10px">' +
        statBox(G.fmtInt(G.metric(v, "views")), "Views") +
        statBox(G.fmtInt(G.metric(v, "followers")), "Follower") +
        statBox(G.followerPer1k(v) != null ? G.followerPer1k(v).toFixed(1) : "—", "Follower/1k") +
        statBox(G.qvRatio(v) != null ? Math.round(G.qvRatio(v) * 100) + "%" : "—", "QV-Quote") +
        statBox(G.rpm(v) != null ? G.rpm(v).toFixed(2) + " €" : "—", "RPM") +
        statBox(G.rewardPerProdMin(v) != null ? G.rewardPerProdMin(v).toFixed(2) + " €" : "—", "€/Prod-Min") +
        '</div>' +
        (qd ? '<div style="border-left:3px solid #f1c40f;padding:8px 12px;margin-top:10px"><strong class="small">📉 Qualified-View-Quote unter Account-Median (' + Math.round(qd.ratio * 100) + '% vs. ' + Math.round(qd.median * 100) + '%).</strong><ul class="small muted" style="margin:6px 0 0;padding-left:18px">' + qd.hints.map(function (h) { return "<li>" + esc(h) + "</li>"; }).join("") + '</ul></div>' : "") +
        ((v.snapshots || []).length > 1 ? '<p class="small muted" style="margin-top:10px"><strong>Verlauf:</strong> ' + v.snapshots.map(function (s) { return G.fmtDate(s.ts) + ": " + G.fmtInt(s.views) + " V"; }).join(" → ") + '</p>' : "") +
        '</div>';
      if (w && w.isWinner) {
        html += '<div class="card" style="margin-top:14px;border-color:var(--accent-line)"><span class="card-num">🏆 WINNER — FOLGE-IDEEN OHNE ZU KOPIEREN (§29)</span>' +
          '<ul class="small" style="margin:10px 0 0;padding-left:18px">' + D.WINNER_ANGLES.slice(0, 5).map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + '</ul>' +
          '<button class="btn btn-dark btn-sm" style="margin-top:10px" id="vdSpinoff">Als neue Idee anlegen</button></div>';
      }
    }
    p.innerHTML = html;

    document.getElementById("gosBack").addEventListener("click", function () { state.detailVideo = null; renderPanel(); });
    document.getElementById("vdSave").addEventListener("click", function () {
      v.title = document.getElementById("vdTitle").value.trim();
      if (!v.title) { alert("Titel fehlt."); return; }
      var dt = document.getElementById("vdDate").value;
      v.postAt = dt ? new Date(dt).toISOString() : v.postAt;
      v.topic = document.getElementById("vdTopic").value;
      v.format = document.getElementById("vdFormat").value;
      v.hookType = document.getElementById("vdHook").value;
      v.lengthSec = G.numRaw(document.getElementById("vdLen").value);
      v.contentClass = document.getElementById("vdClass").value;
      v.prodMinutes = G.numRaw(document.getElementById("vdProd").value);
      v.promoted = document.getElementById("vdPromoted").checked;
      v.searchTerm = document.getElementById("vdSearch").value.trim();
      v.notes = document.getElementById("vdNotes").value;
      var all = G.S.videos();
      var idx = all.findIndex(function (x) { return x.id === v.id; });
      if (idx >= 0) all[idx] = v; else all.push(v);
      G.S.saveVideos(all);
      state.detailVideo = null; renderPanel();
    });
    var sn = document.getElementById("vdSnap");
    if (sn) sn.addEventListener("click", function () { snapshotDialog(v); });
    var del = document.getElementById("vdDel");
    if (del) del.addEventListener("click", function () {
      if (!confirm("Video und alle Snapshots löschen?")) return;
      G.S.saveVideos(G.S.videos().filter(function (x) { return x.id !== v.id; }));
      state.detailVideo = null; renderPanel();
    });
    var sp = document.getElementById("vdSpinoff");
    if (sp) sp.addEventListener("click", function () {
      var ideas = G.S.ideas();
      ideas.push(newIdea({ title: "Follow-up: " + v.title, topic: v.topic, format: v.format, cluster: v.cluster }));
      G.S.saveIdeas(ideas);
      tab = "ideas"; renderApp();
    });
  }

  /* Snapshot-Eingabe (manuell, §51: source=manual, verified=true) */
  function snapshotDialog(v) {
    var fields = [["views", "Views"], ["likes", "Likes"], ["comments", "Kommentare"], ["shares", "Shares"],
      ["followers", "Neue Follower (durch dieses Video)"], ["qualifiedViews", "Qualified Views"], ["rewardEur", "Reward (€)"]];
    var last = G.lastSnap(v) || {};
    var html = '<div class="mm-modal-box"><div class="mm-modal-head"><strong>Snapshot — ' + esc(v.title) + '</strong><button class="mm-modal-close" id="snClose">✕</button></div>' +
      '<p class="small muted">Werte aus dem TikTok Studio ablesen und eintragen. Quelle wird als „Eingabe“ gespeichert.</p>' +
      fields.map(function (f) {
        return '<div class="field"><label>' + f[1] + (last[f[0]] != null ? ' <span class="muted">(zuletzt: ' + last[f[0]] + ')</span>' : "") + '</label><input type="number" step="any" id="sn_' + f[0] + '"></div>';
      }).join("") +
      '<button class="btn btn-primary btn-block" id="snSave" style="margin-top:10px">Snapshot speichern</button></div>';
    var modal = document.createElement("div");
    modal.className = "mm-modal open"; modal.innerHTML = html;
    document.body.appendChild(modal);
    modal.addEventListener("click", function (e) { if (e.target === modal) modal.remove(); });
    document.getElementById("snClose").addEventListener("click", function () { modal.remove(); });
    document.getElementById("snSave").addEventListener("click", function () {
      var snap = { ts: new Date().toISOString(), source: "manual", verified: true };
      var any = false;
      fields.forEach(function (f) {
        var n = G.numRaw(document.getElementById("sn_" + f[0]).value);
        if (n != null) { snap[f[0]] = n; any = true; }
      });
      if (!any) { alert("Mindestens einen Wert eintragen."); return; }
      v.snapshots = v.snapshots || [];
      v.snapshots.push(snap);
      var all = G.S.videos();
      var idx = all.findIndex(function (x) { return x.id === v.id; });
      if (idx >= 0) all[idx] = v;
      G.S.saveVideos(all);
      modal.remove();
      renderPanel();
    });
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
      html += '<div class="card" style="text-align:center;padding:32px"><p class="muted" style="margin:0">Noch keine Ideen. Lege die erste an — oder erzeuge eine aus einer Search-Chance (Tab Suche).</p></div>';
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
      html += '<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:center;margin:10px 0 4px">' +
        '<div><span style="font-family:var(--font-display);font-size:2rem;font-weight:800" class="text-grad">' + c.score + '</span><span class="muted small"> /100 Opportunity</span></div>' +
        confChip(c.confidence) + (dnp.flag ? chip("🔴 NICHT PRODUZIEREN", "blocked") : chip("Produzierbar", "live")) + '</div>';
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
    html += '<details class="card gos-details" style="margin-top:14px"' + (c.score == null ? " open" : "") + '><summary><strong>Faktoren bewerten (0–10)</strong> <span class="muted small">— Selbsteinschätzung; Historie fließt automatisch ein</span></summary>';
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

    /* --- Pre-Publish-Check --- */
    html += '<details class="card gos-details" style="margin-top:14px"><summary><strong>🚦 Pre-Publish- & Reward-Check</strong></summary>' + renderCheck(i) + '</details>';

    /* --- Verknüpfung + Aktionen --- */
    var linkedVid = i.videoId ? G.S.videos().find(function (v) { return v.id === i.videoId; }) : null;
    html += '<div class="card" style="margin-top:14px"><span class="card-num">VERÖFFENTLICHUNG</span>' +
      (linkedVid
        ? '<p class="small" style="margin:8px 0 0">Verknüpft mit Video: <strong>' + esc(linkedVid.title) + '</strong> — Ergebnisse fließen in die Kalibrierung ein.</p>'
        : '<p class="small muted" style="margin:8px 0 0">Nach dem Posten: Status auf PUBLISHED setzen und mit einem importierten Video verknüpfen.</p>' +
          '<div class="field" style="margin-top:8px"><label>Mit Video verknüpfen</label><select id="idLink"><option value="">—</option>' +
          G.S.videos().map(function (v) { return '<option value="' + v.id + '">' + esc(v.title) + '</option>'; }).join("") + '</select></div>') +
      '<p class="small muted" style="margin:10px 0 0">📤 <strong>„An TikTok senden“ (Draft):</strong> ' + chip("EXTERNE FREIGABE ERFORDERLICH", "blocked") + ' Content Posting API erfordert TikTok-App-Audit; unauditierte Apps posten nur privat (Regel R6). Workflow bis dahin: Video in TikTok Studio hochladen, Caption/Hashtags aus dem Script Studio kopieren.</p>' +
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
    bindCheck(p, i);
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

  /* ---------- Pre-Publish-Check (§57/§58) ---------- */
  function renderCheck(i) {
    var ans = i.check || {};
    var html = '<p class="small muted" style="margin-top:10px">Zwei getrennte Ergebnisse (§57): TikTok-Compliance und Reward-Eligibility. Regeln aus System → Plattform-Regeln.</p>' +
      D.PREPUBLISH.map(function (c) {
        return '<label class="small" style="display:block;margin-top:6px"><input type="checkbox" data-check="' + c.key + '"' + (ans[c.key] ? " checked" : "") + '> ' + esc(c.label) + (c.critical ? ' <span class="muted">(kritisch)</span>' : "") + '</label>';
      }).join("") +
      '<div id="checkResult" style="margin-top:12px">' + checkResultHTML(i) + '</div>';
    return html;
  }
  function checkResultHTML(i) {
    var ans = i.check || {};
    function dimState(dim) {
      var items = D.PREPUBLISH.filter(function (c) { return c.dim === dim || (dim === "eligibility" && c.dim === "quality" && c.key === "hook5s"); });
      var rel = D.PREPUBLISH.filter(function (c) { return c.dim === dim; });
      var missCrit = rel.filter(function (c) { return c.critical && !ans[c.key]; });
      var missAny = rel.filter(function (c) { return !ans[c.key]; });
      if (missCrit.length) return { s: "red", miss: missCrit };
      if (missAny.length) return { s: "yellow", miss: missAny };
      return { s: "green", miss: [] };
    }
    var comp = dimState("compliance"), eli = dimState("eligibility"), q = dimState("quality");
    var sponsoredBlock = (i.contentClass === "sponsored" || i.contentClass === "affiliate");
    function badge(st, label) {
      var m = { green: ["🟢", "live"], yellow: ["🟡", "config"], red: ["🔴", "blocked"] }[st.s];
      return chip(m[0] + " " + label + (st.miss.length ? " — offen: " + st.miss.length : ""), m[1]);
    }
    var overall = (comp.s === "green" && eli.s === "green" && q.s !== "red" && !sponsoredBlock) ? chip("🟢 READY", "live")
      : sponsoredBlock ? chip("🔴 Kein Reward-Kandidat (Sponsored/Affiliate)", "blocked")
      : chip("Noch nicht ready", "config");
    return '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      badge(comp, "TikTok-Compliance") + badge(eli, "Reward-Eligibility") + badge(q, "Qualität") + overall + '</div>' +
      (sponsoredBlock ? '<p class="small" style="color:#f1c40f;margin:8px 0 0">⚠️ ' + esc(D.CONTENT_CLASSES[i.contentClass].note) + '</p>' : "");
  }
  function bindCheck(p, i) {
    p.querySelectorAll("[data-check]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        i.check = i.check || {};
        i.check[cb.dataset.check] = cb.checked;
        saveIdeaSilent(i);
        var out = p.querySelector("#checkResult");
        if (out) out.innerHTML = checkResultHTML(i);
      });
    });
  }

  /* ======================================================================
     SEARCH RADAR & CLUSTER (§14/§15)
     ====================================================================== */
  function renderSearch(p) {
    var items = G.S.search().slice().sort(function (a, b) { return (b.opportunity || 0) - (a.opportunity || 0); });
    var html = '<h3 class="h-card" style="margin-bottom:6px">Search Opportunity Radar ' + chip("MANUELLER IMPORT", "manual") + '</h3>' +
      '<p class="small muted" style="margin:0 0 14px">Quelle: TikTok Creator Search Insights (App), Google Trends, eigene Recherche — Werte hier eintragen. Eine automatische Anbindung existiert nicht (TikTok bietet dafür keine öffentliche API); es wird nichts gescrapt.</p>' +
      '<div class="card" style="margin-bottom:16px"><strong class="small">Neue Search-Chance</strong>' +
      '<div class="form-row" style="margin-top:8px"><div class="field"><label>Suchbegriff</label><input id="soKw" type="text" placeholder="z. B. freies testosteron berechnen"></div>' +
      '<div class="field"><label>Cluster</label><input id="soCluster" type="text" placeholder="z. B. Testosteron"></div></div>' +
      '<div class="form-row"><div class="field"><label>Suchnachfrage (0–100)</label><input id="soDemand" type="number" min="0" max="100"></div>' +
      '<div class="field"><label>Konkurrenz (0–100)</label><input id="soComp" type="number" min="0" max="100"></div></div>' +
      '<div class="form-row"><div class="field"><label>MaleMetrix-Fit (0–100)</label><input id="soFit" type="number" min="0" max="100"></div>' +
      '<div class="field"><label>Reward-Potenzial (0–100)</label><input id="soReward" type="number" min="0" max="100"></div></div>' +
      '<div class="field"><label>Quelle der Einschätzung</label><input id="soSource" type="text" placeholder="z. B. Creator Search Insights 20.07."></div>' +
      '<button class="btn btn-primary btn-sm" id="soAdd" style="margin-top:10px">Hinzufügen</button></div>';

    if (items.length) {
      html += '<div style="overflow-x:auto"><table class="gos-table"><thead><tr><th>Keyword</th><th>Cluster</th><th>Demand</th><th>Comp.</th><th>Fit</th><th>Reward</th><th>Opportunity</th><th></th></tr></thead><tbody>' +
        items.map(function (s) {
          var prio = s.opportunity >= 75 ? ' <strong style="color:#2ecc71">PRIORITY</strong>' : "";
          return '<tr><td>' + esc(s.keyword) + '<br><span class="small muted">' + esc(s.source || "") + '</span></td><td>' + esc(s.cluster || "—") + '</td>' +
            '<td class="mono">' + (s.demand != null ? s.demand : "—") + '</td><td class="mono">' + (s.competition != null ? s.competition : "—") + '</td>' +
            '<td class="mono">' + (s.fit != null ? s.fit : "—") + '</td><td class="mono">' + (s.rewardPot != null ? s.rewardPot : "—") + '</td>' +
            '<td class="mono"><strong>' + (s.opportunity != null ? s.opportunity : "—") + '</strong>' + prio + '</td>' +
            '<td style="white-space:nowrap"><button class="btn btn-dark btn-sm" data-toidea="' + s.id + '">→ Idee</button> <button class="btn-link-del" data-delso="' + s.id + '" style="background:none;border:none;color:var(--muted-2);cursor:pointer;text-decoration:underline;font-size:0.75rem">löschen</button></td></tr>';
        }).join("") + '</tbody></table></div>';
    }

    /* Cluster-Coverage (§15/§16) */
    var clusters = {};
    G.S.search().forEach(function (s) { if (s.cluster) (clusters[s.cluster] = clusters[s.cluster] || { kw: 0, prod: 0 }).kw++; });
    G.S.videos().forEach(function (v) { if (v.cluster && clusters[v.cluster]) clusters[v.cluster].prod++; });
    G.S.videos().forEach(function (v) { if (v.cluster && !clusters[v.cluster]) clusters[v.cluster] = { kw: 0, prod: 1 }; });
    var ckeys = Object.keys(clusters);
    if (ckeys.length) {
      html += '<h4 class="h-card" style="margin:20px 0 8px;font-size:1rem">Cluster-Abdeckung ' + chip("interne Berechnung", "calc") + '</h4>' +
        '<div class="grid-3">' + ckeys.map(function (k) {
          var c = clusters[k];
          var cov = c.kw ? Math.round((c.prod / (c.kw + c.prod)) * 100) : 100;
          return '<div class="card"><strong class="small">' + esc(k) + '</strong><p class="small muted" style="margin:6px 0 0">' + c.prod + ' Videos · ' + c.kw + ' offene Keywords · Abdeckung ' + cov + '%</p>' +
            '<div class="bar-track" style="margin-top:8px;height:6px;background:var(--line);border-radius:3px"><div style="width:' + cov + '%;height:100%;border-radius:3px;background:linear-gradient(90deg,var(--accent),#00c2ff)"></div></div></div>';
        }).join("") + '</div>';
    }
    p.innerHTML = html;
    document.getElementById("soAdd").addEventListener("click", function () {
      var kw = document.getElementById("soKw").value.trim();
      if (!kw) { alert("Suchbegriff fehlt."); return; }
      var demand = G.numRaw(document.getElementById("soDemand").value);
      var comp = G.numRaw(document.getElementById("soComp").value);
      var fit = G.numRaw(document.getElementById("soFit").value);
      var rew = G.numRaw(document.getElementById("soReward").value);
      var parts = [demand, comp != null ? 100 - comp : null, fit, rew].filter(function (x) { return x != null; });
      var opp = parts.length ? Math.round(parts.reduce(function (a, b) { return a + b; }, 0) / parts.length) : null;
      var list = G.S.search();
      list.push({ id: G.uid("s"), keyword: kw, cluster: document.getElementById("soCluster").value.trim(),
        demand: demand, competition: comp, fit: fit, rewardPot: rew, opportunity: opp,
        source: document.getElementById("soSource").value.trim(), ts: new Date().toISOString(), status: "open" });
      G.S.saveSearch(list);
      renderPanel();
    });
    p.querySelectorAll("[data-toidea]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = G.S.search().find(function (x) { return x.id === b.dataset.toidea; });
        if (!s) return;
        var ideas = G.S.ideas();
        var idea = newIdea({ title: s.keyword, topic: "", cluster: s.cluster });
        idea.factors.viral.momentum = s.demand != null ? Math.round(s.demand / 10) : undefined;
        idea.factors.reward.search = s.demand != null ? Math.round(s.demand / 10) : undefined;
        idea.competition = s.competition != null ? Math.round(s.competition / 10) : null;
        ideas.push(idea); G.S.saveIdeas(ideas);
        tab = "ideas"; state.editIdea = idea.id; renderApp();
      });
    });
    p.querySelectorAll("[data-delso]").forEach(function (b) {
      b.addEventListener("click", function () {
        G.S.saveSearch(G.S.search().filter(function (x) { return x.id !== b.dataset.delso; }));
        renderPanel();
      });
    });
  }

  /* ======================================================================
     WHAT WORKS / WHAT DOESN'T (§88/§89) + Posting-Zeit (§47)
     ====================================================================== */
  function renderWorks(p) {
    var acc = SC.accountMedians();
    var html = '<h3 class="h-card" style="margin-bottom:6px">What Works for MaleMetrix ' + chip("interne Berechnung aus Importen", "calc") + '</h3>';
    if (acc.n < D.MIN_N) {
      html += '<div class="card"><p class="muted" style="margin:0">Noch nicht genügend Daten: ' + acc.n + '/' + D.MIN_N + ' Videos mit importierten Views. Erst importieren, dann lernt das System — es werden keine Muster erfunden (§84).</p></div>';
      p.innerHTML = html; return;
    }
    function table(title, rows, valueFn, valueLabel) {
      var withN = rows.filter(function (r) { return r.n >= D.MIN_N && valueFn(r) != null; });
      if (!withN.length) return '<div class="card"><strong class="small">' + title + '</strong><p class="small muted" style="margin:6px 0 0">Noch nicht genügend Daten (mind. ' + D.MIN_N + ' Videos pro Gruppe).</p></div>';
      withN.sort(function (a, b) { return valueFn(b) - valueFn(a); });
      return '<div class="card"><strong class="small">' + title + '</strong><table class="gos-table" style="margin-top:8px"><thead><tr><th></th><th>n</th><th>' + valueLabel + '</th></tr></thead><tbody>' +
        withN.slice(0, 5).map(function (r) {
          var v = valueFn(r);
          return '<tr><td>' + esc(r.label) + '</td><td class="mono">' + r.n + '</td><td class="mono">' + (typeof v === "number" ? (v >= 100 ? G.fmtInt(v) : v.toFixed(2)) : v) + '</td></tr>';
        }).join("") + '</tbody></table></div>';
    }
    var byTopic = SC.aggregateBy(function (v) { return v.topic || null; });
    var byFormat = SC.aggregateBy(function (v) { return v.format || null; });
    var byLength = SC.aggregateBy(SC.lengthBucket);
    var byHook = SC.aggregateBy(function (v) { return v.hookType || null; }, function (k) {
      var h = D.HOOK_TYPES.find(function (x) { return x.key === k; }); return h ? h.label : k;
    });
    html += '<div class="grid-3" style="margin-bottom:16px">' +
      table("Top Themen — Follower/1k Views", byTopic, function (r) { return r.medFpk; }, "F/1k") +
      table("Top Themen — RPM", byTopic, function (r) { return r.medRpm; }, "€ RPM") +
      table("Top Themen — Views", byTopic, function (r) { return r.medViews; }, "Ø Views") +
      table("Formate — Follower/1k", byFormat, function (r) { return r.medFpk; }, "F/1k") +
      table("Längen — Views", byLength, function (r) { return r.medViews; }, "Ø Views") +
      table("Hook-Typen — Follower/1k", byHook, function (r) { return r.medFpk; }, "F/1k") +
      '</div>';

    /* What doesn't work */
    var weak = [];
    byTopic.filter(function (r) { return r.n >= D.MIN_N; }).forEach(function (r) {
      if (acc.fpk && r.medFpk != null && r.medFpk < acc.fpk * 0.5) weak.push(esc(r.label) + ": zieht Views, aber kaum Follower (" + r.medFpk.toFixed(1) + " F/1k vs. Median " + acc.fpk.toFixed(1) + ")");
      if (acc.qv && r.medQv != null && r.medQv < acc.qv * 0.7) weak.push(esc(r.label) + ": schwache Qualified-View-Quote (" + Math.round(r.medQv * 100) + "%)");
      if (acc.rpm && r.medRpm != null && r.medRpm < acc.rpm * 0.5) weak.push(esc(r.label) + ": RPM deutlich unter Median");
    });
    html += '<div class="card" style="border-color:rgba(231,76,60,0.3);margin-bottom:16px"><strong class="small">🛑 What doesn’t work — Stop doing</strong>' +
      (weak.length ? '<ul class="small" style="margin:8px 0 0;padding-left:18px">' + weak.map(function (w) { return "<li>" + w + "</li>"; }).join("") + '</ul>'
        : '<p class="small muted" style="margin:6px 0 0">Keine klaren Schwachmuster bei aktueller Datenlage.</p>') + '</div>';

    /* Posting-Zeit */
    var pt = SC.postingTime();
    html += '<div class="card"><strong class="small">Posting-Zeit-Learning (§47)</strong>' +
      (pt.rows.length
        ? '<p class="small" style="margin:6px 0 0">' + pt.rows.map(function (r) { return r.label + ": Ø " + G.fmtInt(r.medViews) + " Views (" + r.n + ")"; }).join(" · ") + '</p>'
        : '<p class="small muted" style="margin:6px 0 0">Noch nicht genügend Daten — mind. ' + D.MIN_N_TIME + ' Videos pro Wochentag nötig. Keine pauschalen „19-Uhr-Mythen“ (§97).</p>') + '</div>';

    p.innerHTML = html;
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
     SYSTEM / EINSTELLUNGEN (§5/§77/§78/§92/§94/§75)
     ====================================================================== */
  function renderSettings(p) {
    var s = G.S.settings();
    var rules = G.S.rules();
    var html = "";

    /* --- TikTok-Verbindung (§5/§77) --- */
    html += '<div class="card" style="margin-bottom:16px"><h3 class="h-card" style="margin-bottom:4px">TikTok-Verbindung</h3>' +
      '<p class="small" style="margin:0 0 10px">' + (TT.configured() ? chip("Worker konfiguriert", "config") : chip("🔴 Nicht verbunden — Level 0 · Manual Mode", "manual")) + '</p>' +
      '<div id="ttStatus"></div>' +
      '<div style="overflow-x:auto;margin-top:10px"><table class="gos-table"><thead><tr><th>Level</th><th>Funktion</th><th>Status</th></tr></thead><tbody>' +
      D.LEVELS.map(function (l) {
        var active = TT.level() >= l.n;
        return '<tr><td class="mono">' + l.n + '</td><td>' + esc(l.label) + '<br><span class="small muted">' + esc(l.desc) + '</span></td>' +
          '<td>' + (l.n === 0 ? chip("LIVE", "live") : active ? chip("AKTIV", "live") : chip(esc(l.state), l.state.indexOf("EXTERNE") >= 0 ? "blocked" : "config")) + '</td></tr>';
      }).join("") + '</tbody></table></div>' +
      (TT.configured()
        ? '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
          '<button class="btn btn-primary btn-sm" id="ttConnect">TikTok verbinden</button>' +
          '<button class="btn btn-dark btn-sm" id="ttRefresh">Verbindung aktualisieren</button>' +
          '<button class="btn btn-ghost btn-sm" id="ttDisconnect">Trennen</button></div>'
        : '<p class="small muted" style="margin-top:12px">Die serverseitige OAuth-Anbindung ist fertig gebaut (<code>proxy/tiktok-oauth-worker.js</code>) und wartet auf: 1) TikTok-Developer-App (deine Freigabe), 2) Cloudflare-Worker-Deploy, 3) Eintrag von <code>apiBase</code>/<code>adminKey</code> in <code>js/config.js</code>. Schritt-für-Schritt: <code>GROWTH-OS.md</code>. Bis dahin gibt es hier bewusst keinen Verbinden-Button — keine Fake-Funktionen.</p>') +
      '</div>';

    /* --- Gewichtung (§10/§93) --- */
    var wActive = s.weights || (D.WEIGHT_PRESETS[s.presetKey] || D.WEIGHT_PRESETS.balanced).w;
    html += '<div class="card" style="margin-bottom:16px"><h3 class="h-card" style="margin-bottom:8px">Opportunity-Gewichtung <span class="small muted">v' + D.WEIGHTS_VERSION + '</span></h3>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
      Object.keys(D.WEIGHT_PRESETS).map(function (k) {
        return '<button class="btn btn-sm ' + (s.presetKey === k && !s.weights ? "btn-primary" : "btn-dark") + '" data-preset="' + k + '">' + esc(D.WEIGHT_PRESETS[k].label) + '</button>';
      }).join("") + '</div>' +
      '<div class="form-row">' + ["viral", "growth", "reward", "brand"].map(function (k) {
        return '<div class="field"><label>' + k.toUpperCase() + ' %</label><input type="number" min="0" max="100" data-weight="' + k + '" value="' + (wActive[k] || 0) + '"></div>';
      }).join("") + '</div>' +
      '<button class="btn btn-dark btn-sm" id="wSave">Eigene Gewichtung speichern</button></div>';

    /* --- Target Mode (§92) --- */
    var t = s.target || {};
    html += '<div class="card" style="margin-bottom:16px"><h3 class="h-card" style="margin-bottom:8px">Monatsziel (Target Mode)</h3>' +
      '<div class="form-row"><div class="field"><label>Zieltyp</label><select id="tgType">' +
      [["", "— kein Ziel —"], ["followers", "Neue Follower"], ["reward", "€ Creator Rewards"], ["views", "Views"]].map(function (o) {
        return '<option value="' + o[0] + '"' + (t.type === o[0] ? " selected" : "") + '>' + o[1] + '</option>';
      }).join("") + '</select></div>' +
      '<div class="field"><label>Zielwert</label><input id="tgAmount" type="number" value="' + (t.amount || "") + '"></div>' +
      '<div class="field"><label>Monat</label><input id="tgMonth" type="month" value="' + (t.month || new Date().toISOString().slice(0, 7)) + '"></div></div>' +
      '<button class="btn btn-dark btn-sm" id="tgSave">Ziel speichern</button></div>';

    /* --- Plattform-Regeln (§94/§95) --- */
    html += '<div class="card" style="margin-bottom:16px"><h3 class="h-card" style="margin-bottom:4px">Plattform-Regeln (platform_rules)</h3>' +
      '<p class="small muted" style="margin:0 0 10px">TikTok ändert Regeln — deshalb sind sie hier Daten, nicht Code. Prüfe jede Regel in der offiziellen Quelle und setze „Heute verifiziert“. Warnung ab ' + D.RULE_MAX_AGE_DAYS + ' Tagen.</p>' +
      rules.map(function (r, ri) {
        var age = r.verified ? G.daysAgo(r.verified) : null;
        var fresh = r.verified && age <= D.RULE_MAX_AGE_DAYS;
        return '<div class="gos-rule"><div style="flex:1;min-width:220px"><strong class="small">' + esc(r.name) + '</strong>' +
          '<p class="small" style="margin:2px 0 0">' + esc(r.value) + '</p>' +
          '<p class="small muted" style="margin:2px 0 0">Quelle: ' + esc(r.source) + (r.note ? " · " + esc(r.note) : "") + '</p></div>' +
          '<div style="text-align:right;white-space:nowrap">' +
          (fresh ? chip("✔ " + G.fmtDate(r.verified), "live") : chip(r.verified ? "⚠️ " + age + " Tage alt" : "⚠️ unverifiziert", "config")) +
          '<br><button class="btn btn-dark btn-sm" data-verify="' + ri + '" style="margin-top:6px">Heute verifiziert</button></div></div>';
      }).join("") + '</div>';

    /* --- KI (§optional) --- */
    html += '<div class="card" style="margin-bottom:16px"><h3 class="h-card" style="margin-bottom:4px">KI-Unterstützung</h3>' +
      '<p class="small" style="margin:0">' + (AI.configured() ? chip("Konfiguriert — Ausgaben werden als KI-VORSCHLAG markiert", "live") : chip("KONFIGURATION ERFORDERLICH", "config") +
        ' <span class="muted">Optional: Endpoint/Key in <code>js/config.js → growth.ai</code>. Empfohlen: eigener Proxy-Endpoint statt API-Key im Browser (Anleitung in GROWTH-OS.md).</span>') + '</p></div>';

    /* --- Daten (DSGVO §75) --- */
    html += '<div class="card" style="margin-bottom:16px"><h3 class="h-card" style="margin-bottom:4px">Daten</h3>' +
      '<p class="small muted" style="margin:0 0 10px">Alle Growth-OS-Daten liegen nur in diesem Browser (localStorage). Backup regelmäßig exportieren.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-dark btn-sm" id="dataExport">Backup exportieren</button>' +
      '<label class="btn btn-dark btn-sm" style="cursor:pointer">Backup importieren<input type="file" id="dataImport" accept="application/json" style="display:none"></label>' +
      '<button class="btn btn-ghost btn-sm" id="dataDelete">Alle Daten löschen</button></div></div>';

    /* --- Log (§76) --- */
    var logs = G.S.log().slice(-12).reverse();
    html += '<div class="card"><h3 class="h-card" style="margin-bottom:4px">Log</h3>' +
      (logs.length ? '<div class="small mono muted" style="display:grid;gap:2px">' + logs.map(function (l) {
        return '<span>' + esc(l.ts.slice(5, 16).replace("T", " ")) + ' [' + esc(l.kind) + '] ' + esc(l.msg) + '</span>';
      }).join("") + '</div>' : '<p class="small muted" style="margin:0">Leer.</p>') + '</div>';

    p.innerHTML = html;

    /* TikTok bindings */
    if (TT.configured()) {
      var stBox = document.getElementById("ttStatus");
      stBox.innerHTML = '<p class="small muted">Status wird abgefragt …</p>';
      TT.fetchStatus().then(function (st) {
        if (!st || st.error) {
          stBox.innerHTML = '<p class="small" style="color:#e74c3c">Worker nicht erreichbar: ' + esc(st && st.error || "unbekannt") + ' — Deploy/Key prüfen (GROWTH-OS.md → Troubleshooting).</p>';
        } else if (st.connected) {
          stBox.innerHTML = '<p class="small">🟢 <strong>' + esc(st.display_name || st.open_id) + '</strong>' +
            (st.stats ? ' · ' + G.fmtInt(st.stats.follower_count) + ' Follower · ' + G.fmtInt(st.stats.likes_count) + ' Likes · ' + G.fmtInt(st.stats.video_count) + ' Videos' : "") +
            ' · Scopes: ' + esc((st.scopes || []).join(", ")) + ' · Letzter Sync: ' + G.fmtDate(st.lastSync) + ' ' + srcChip("api") + '</p>';
          renderApp();
        } else {
          stBox.innerHTML = '<p class="small">🔴 Worker erreichbar, aber kein TikTok-Konto verbunden.</p>';
        }
      });
      var tc = document.getElementById("ttConnect");
      if (tc) tc.addEventListener("click", function () {
        window.open(TT.cfg().apiBase.replace(/\/$/, "") + "/auth/start?key=" + encodeURIComponent(TT.cfg().adminKey || ""), "_blank");
      });
      var tr = document.getElementById("ttRefresh");
      if (tr) tr.addEventListener("click", function () { renderPanel(); });
      var td = document.getElementById("ttDisconnect");
      if (td) td.addEventListener("click", async function () {
        if (!confirm("TikTok-Verbindung trennen (Token wird serverseitig widerrufen)?")) return;
        try {
          await fetch(TT.cfg().apiBase.replace(/\/$/, "") + "/api/disconnect", { method: "POST", headers: { "x-admin-key": TT.cfg().adminKey || "" } });
        } catch (e) {}
        renderPanel();
      });
    }

    /* Weights */
    p.querySelectorAll("[data-preset]").forEach(function (b) {
      b.addEventListener("click", function () {
        s.presetKey = b.dataset.preset; s.weights = null;
        G.S.saveSettings(s); renderPanel();
      });
    });
    document.getElementById("wSave").addEventListener("click", function () {
      var w = {};
      p.querySelectorAll("[data-weight]").forEach(function (inp) { w[inp.dataset.weight] = G.numRaw(inp.value) || 0; });
      s.weights = w; G.S.saveSettings(s);
      G.log("settings", "Eigene Gewichtung gespeichert");
      renderPanel();
    });

    /* Target */
    document.getElementById("tgSave").addEventListener("click", function () {
      var type = document.getElementById("tgType").value;
      s.target = type ? { type: type, amount: G.numRaw(document.getElementById("tgAmount").value), month: document.getElementById("tgMonth").value } : null;
      G.S.saveSettings(s); renderPanel();
    });

    /* Rules */
    p.querySelectorAll("[data-verify]").forEach(function (b) {
      b.addEventListener("click", function () {
        var r = G.S.rules();
        r[parseInt(b.dataset.verify, 10)].verified = new Date().toISOString().slice(0, 10);
        G.S.saveRules(r);
        G.log("rules", "Regel verifiziert: " + r[parseInt(b.dataset.verify, 10)].name);
        renderPanel();
      });
    });

    /* Data */
    document.getElementById("dataExport").addEventListener("click", G.exportAll);
    document.getElementById("dataImport").addEventListener("change", function (e) {
      if (!e.target.files[0]) return;
      G.importAll(e.target.files[0], function (err) {
        if (err) alert("Import fehlgeschlagen: " + err);
        else { alert("Backup importiert."); renderApp(); }
      });
    });
    document.getElementById("dataDelete").addEventListener("click", function () {
      if (!confirm("Wirklich ALLE Growth-OS-Daten auf diesem Gerät löschen? (Backup vorher exportieren!)")) return;
      if (!confirm("Letzte Bestätigung: unwiderruflich löschen?")) return;
      G.deleteAll();
      renderApp();
    });
  }

  /* ======================================================================
     START
     ====================================================================== */
  if (isAuthed()) renderApp(); else renderGate();
})();
