/* ==========================================================================
   MALEMETRIX OS — APP SHELL  (My MaleMetrix) · Phase 3.1 "Close the Loop"
   --------------------------------------------------------------------------
   Rendert die eingeloggte App in #mmDash: TODAY · PLAN · TRACK · PROGRESS ·
   LEARN (+ Baseline, Pathway, Transformation, Workout). Hash-Routing,
   mobile Bottom-Nav. Bewahrt alle Account-Flows aus Phase 2.x.

   Phase-3.1-Wahrheiten:
   · TODAY zeigt den ECHTEN Tagestyp (MM.programView) — §9
   · Workout schließt Programm-Tage nur auf Kraft-Tagen ab — §10/§105
   · Session-Zuordnung folgt dem PLAN (Kraftslot-Sequenz), nicht einem
     Completion-Zähler — §11/§12
   · Nutrition: PLANNED ≠ LOGGED; persistierte Meal-Days; echte Swaps mit
     Delta; Wochen-Review mit REVIEW → ACCEPT — §29–§39
   · Progress rechnet mit echten e1RM-Daten oder sagt INSUFFICIENT DATA — §64
   ========================================================================== */
(function () {
  "use strict";
  var host = document.getElementById("mmDash");
  if (!host || !window.MM || !MM.account || !MM.os || !MM.engines || !MM.exec) return;
  var OS = MM.os, E = MM.engines, PV = MM.programView || null, X = MM.exec;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  var MODE = { cut: "CUT", recomp: "RECOMP", build: "BUILD", perform: "PERFORM" };
  var BN = { recovery: "Recovery", engine: "Engine", body: "Body", strength: "Strength", metabolic: "Metabolic", lifestyle: "Lifestyle", medical: "Medical Check" };
  var PHASE = { 1: "Build the Base", 2: "Build Capacity", 3: "Push Performance", 4: "Lock it in" };
  var GROUP_DE = { chest: "Brust", back: "Rücken", quads: "Quads", hamstrings: "Hamstrings", delts: "Schultern", arms: "Arme", core: "Core" };
  function todayYmd() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  /* ---------- Routing ---------- */
  var VIEWS = ["today", "plan", "track", "progress", "learn", "baseline", "pathway", "transform", "workout", "week", "settings", "coach", "advisor", "review", "twin", "simulator", "experiments", "protocol", "timeline", "memory"];
  function view() { var h = (location.hash || "#today").slice(1).split("?")[0]; return VIEWS.indexOf(h) >= 0 ? h : "today"; }
  function hashParam(name) { var q = (location.hash || "").split("?")[1] || ""; var m = q.split("&").filter(function (kv) { return kv.split("=")[0] === name; })[0]; return m ? decodeURIComponent(m.split("=")[1] || "") : ""; }
  window.addEventListener("hashchange", function () { render(); window.scrollTo(0, 0); });

  function navBar(active) {
    var items = [["today", "Today"], ["plan", "Plan"], ["track", "Track"], ["progress", "Progress"], ["learn", "Learn"]];
    return '<nav class="os-nav" aria-label="App">' + items.map(function (it) {
      return '<a href="#' + it[0] + '" class="' + (active === it[0] ? "on" : "") + '"><span class="os-nav-dot"></span>' + it[1] + '</a>';
    }).join("") + '</nav>';
  }

  /* ---------- Bausteine ---------- */
  function tile(label, val, sub) { return '<div class="os-tile"><div class="k">' + esc(label) + '</div><div class="v">' + esc(val) + '</div>' + (sub ? '<div class="s">' + esc(sub) + '</div>' : '') + '</div>'; }
  function sec(title, inner, cls) { return '<section class="os-sec ' + (cls || "") + '"><h2 class="os-h2">' + esc(title) + '</h2>' + inner + '</section>'; }
  function realityCheck(goalTxt, timeTxt, realTxt) {
    return '<div class="os-reality"><span class="tag">REALITY CHECK</span><div class="row"><span>Ziel</span><b>' + esc(goalTxt) + '</b></div><div class="row"><span>Zeit</span><b>' + esc(timeTxt) + '</b></div><div class="verdict">' + esc(realTxt) + '</div></div>';
  }
  function nobody(text) { return '<div class="os-nobody"><span class="tag">WHAT NOBODY TELLS YOU</span><p>' + esc(text) + '</p></div>'; }
  function greetTime() { var h = new Date().getHours(); return h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend"; }
  // Mini-Sparkline (§65) — inline SVG, kein Chart-Framework.
  function spark(series, w, h) {
    if (!series || series.length < 2) return "";
    var vals = series.map(function (x) { return x.value; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var span = (max - min) || 1; w = w || 120; h = h || 32;
    var pts = vals.map(function (v, i) { return (i / (vals.length - 1) * w).toFixed(1) + "," + (h - 3 - (v - min) / span * (h - 6)).toFixed(1); }).join(" ");
    return '<svg class="os-spark" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>';
  }

  /* ---------- Workout-Log-Zugriff (Modell §14, abwärtskompatibel) ---------- */
  function wlogs() { return MM.store.get("os_workout_logs", {}) || {}; }
  function exHistories() {
    var l = wlogs(); var out = {};
    Object.keys(l).forEach(function (k) { if (k.charAt(0) !== "_" && Array.isArray(l[k])) out[k] = l[k]; });
    return out;
  }
  /* §11/§12 — Session-Zuordnung aus dem PLAN: der n-te Kraftslot des Programms
     bekommt Template n der Rotation. Überlebt verpasste Tage, Reschedules und
     Gerätewechsel, weil sie aus (synchronisiertem) Programm-State abgeleitet
     ist — nicht aus einem lokalen Completion-Zähler. */
  function plannedSessionInfo(tp) {
    if (PV && PV.available()) {
      var st = PV.state();
      if (!st.notStarted && !st.over) {
        var today = st.day;
        var isStrengthToday = PV.dayTypeAt(today) === "strength";
        var targetDay = today;
        if (!isStrengthToday) {
          targetDay = null;
          for (var d = today + 1; d <= Math.min(84, today + 7); d++) { if (PV.dayTypeAt(d) === "strength") { targetDay = d; break; } }
        }
        if (targetDay != null) {
          var seq = PV.strengthIndexUpTo(targetDay);   // 1-basiert
          var tpl = tp.sessions[(seq - 1) % tp.sessions.length];
          return { session: tpl, programDay: targetDay, isToday: isStrengthToday, seq: seq, spid: OS.cycleId() + ":d" + targetDay };
        }
      }
    }
    var count = ((wlogs())._sessions || []).length;   // Fallback ohne aktives Programm
    return { session: tp.sessions[count % tp.sessions.length], programDay: null, isToday: false, seq: count + 1, spid: OS.cycleId() + ":free" + (count + 1) };
  }

  /* ============ PHASE 6 — TODAY-2.0-BAUSTEINE (NBA-Karte · Timeline · Kontext) ============ */
  function fmtDateShort(ymd) { return ymd ? ymd.slice(8) + "." + ymd.slice(5, 7) + "." : ""; }
  function nbaCard(day) {
    var nba = day.nba; if (!nba.primary) return "";
    var a = nba.primary;
    var html = '<div class="os-nba os-nba2"><span class="tag">NEXT BEST ACTION</span>';
    var detailDup = a.time && a.detail && a.detail.indexOf("~" + a.durationMin) === 0;
    html += '<div class="nba-main"><b>' + esc(a.title) + '</b>' +
      (a.time ? '<span class="nba-time">' + esc(a.time) + (a.durationMin ? ' · ~' + a.durationMin + ' MIN' : '') + '</span>' : '') +
      (a.detail && !detailDup ? '<span>' + esc(a.detail) + '</span>' : '') + '</div>';
    if (nba.lift) {
      html += '<div class="nba-lift">' + (nba.lift.last ? '<span class="k">Zuletzt ' + esc(nba.lift.name) + '</span><b>' + esc(nba.lift.last) + '</b>' : '') +
        '<span class="k">Heute</span><b>' + esc(nba.lift.target) + '</b></div>';
    }
    if (nba.why && nba.why.length) html += '<div class="nba-why"><span class="k">WARUM HEUTE</span>' + nba.why.map(function (w) { return '<p>' + esc(w) + '</p>'; }).join("") + '</div>';
    if (a.type === "repair") html += '<button class="btn btn-primary btn-sm" data-repair="' + esc(String(a.repairPd)) + '">Optionen ansehen →</button>';
    else if (a.deepLink === "#workout") html += '<a class="btn btn-primary btn-sm" href="#workout">Session starten →</a>';
    else if (a.type === "decision_review") html += '<button class="btn btn-primary btn-sm" data-decreview="' + esc(a.decisionId) + '">Review öffnen →</button>';
    else if (a.deepLink && a.deepLink.indexOf(".html") >= 0) html += '<a class="btn btn-primary btn-sm" href="' + a.deepLink + '">Öffnen →</a>';
    else html += '<button class="btn btn-primary btn-sm" data-osdone="' + esc(a.id) + '">Erledigt ✓</button>';
    if (nba.secondary && nba.secondary.length) {
      html += '<div class="nba-sec">' + nba.secondary.map(function (s) {
        return '<div class="row"><span>' + esc(s.title) + '</span>' + (s.done ? '<i class="ok">✓</i>' : '<button class="os-ghost" data-osdone="' + esc(s.id) + '">✓</button>') + '</div>';
      }).join("") + '</div>';
    }
    html += '</div>';
    return html;
  }
  function planTimeline(day) {
    if (!day.anchors || !day.anchors.length) return "";
    return '<div class="os-timeline">' + day.anchors.map(function (a) {
      return '<div class="os-anchor ' + (a.done ? "done" : "") + '"><span class="tm">' + esc(a.time) + '</span><div class="tx"><b>' + esc(a.title) + '</b><span>' + esc(a.sub || "") + '</span></div>' +
        (a.deepLink ? '<a class="os-ghost" href="' + a.deepLink + '">→</a>' : (a.ref && !a.done ? '<button class="os-ghost" data-osdone="' + esc(a.ref) + '">✓</button>' : (a.done ? '<span class="ok">✓</span>' : ''))) + '</div>';
    }).join("") + '</div>';
  }
  function contextBadge(day) {
    if (!day.overlay) return "";
    var o = day.overlay; var meta = X.OVERLAYS[o.mode] || { label: o.mode };
    return '<div class="os-ctx"><span class="dot"></span><div class="tx"><b>' + esc(meta.label) + (o.end !== o.start ? " · bis " + fmtDateShort(o.end) : " · heute") + '</b><span>' + esc(meta.line || "") + '</span></div><button class="os-ghost" data-endoverlay="' + esc(o.id) + '">Beenden</button></div>';
  }
  function closeDayCard(day) {
    var hour = new Date().getHours();
    var log = X.dayLog(day.date);
    if (log) {
      var V = { COMPLETE: "Tag komplett", PARTIAL: "Teilweise — zählt trotzdem", RECOVERY: "Recovery-Tag", REST: "Geplante Erholung" };
      return '<div class="os-close done"><span class="tag">TAG GESCHLOSSEN</span><b>' + esc(V[log.verdict] || log.verdict) + '</b>' + (log.protein ? '<span>Protein ' + log.protein.eaten + '/' + log.protein.target + ' g</span>' : '') + '</div>';
    }
    if (hour < 18) return "";
    var rem = X.remaining(day.date);
    var trained = day.actions.some(function (a) { return (a.type === "workout" || a.type === "makeup_workout") && a.done; });
    var isTrain = day.actions.some(function (a) { return a.type === "workout" || a.type === "makeup_workout"; });
    return '<div class="os-close"><span class="tag">EVENING CLOSE</span>' +
      '<div class="rows">' +
      (isTrain ? '<div class="row"><span>Training</span><b>' + (trained ? "✓" : "offen") + '</b></div>' : '<div class="row"><span>Training</span><b>Ruhetag</b></div>') +
      (rem && rem.logged ? '<div class="row"><span>Protein</span><b>' + rem.eaten.p + '/' + rem.target.protein + ' g</b></div>' : '') +
      '<div class="row"><span>Ein Ding morgen</span><b>Schlaf vor ' + esc(X.prefs().bedtime) + '</b></div></div>' +
      '<button class="btn btn-primary btn-sm" data-closeday>Tag schließen ✓</button><span class="hint">~15 Sekunden. Nichts wird doppelt gefragt.</span></div>';
  }

  /* =========================== TODAY =========================== */
  function vToday(snap) {
    var d = MM.account.getDashboardState();
    var p = d.program || {};
    var name = d.name ? (", " + d.name.toUpperCase()) : "";
    var html = "";

    html += '<div class="os-head"><span class="eyebrow" style="margin:0">My MaleMetrix</span><span style="display:flex;gap:8px"><a class="os-ghost" href="#settings" aria-label="Einstellungen">⚙</a>' +
      (snap.state === "signed_in" ? '<button id="mmOut" class="os-ghost">Abmelden</button>' : '') + '</span></div>';

    if (snap.state === "signed_in") {
      var inv = MM.account.localInventory(); var ms = MM.account.migrationStatus();
      if ((inv.score || inv.program) && ms.state !== "complete") {
        html += '<div class="card os-accent"><p style="font-weight:600;margin:0 0 8px">Daten auf diesem Gerät gefunden' + (ms.state === "partial" ? " — teilweise übernommen" : "") + '</p><ul class="small" style="margin:0 0 12px;padding-left:18px;color:var(--muted)">' + (inv.score ? '<li>Score — ' + (ms.score ? "übernommen ✓" : "gefunden") + '</li>' : '') + (inv.program ? '<li>12-Week Fortschritt — ' + (ms.program ? "übernommen ✓" : "gefunden") + '</li>' : '') + '</ul><button id="mmImport" class="btn btn-primary btn-sm">' + (ms.state === "partial" ? "Erneut versuchen" : "In meinen Account übernehmen") + '</button><p id="mmImportMsg" class="small" style="display:none;margin-top:8px;color:var(--muted)"></p><p class="small muted" style="margin:10px 0 0">Tracker-Daten bleiben vorerst lokal. Deine lokalen Daten bleiben als Backup erhalten.</p></div>';
      }
    }

    if (!OS.pathway() && (d.hasScore || (d.access && d.access.twelve_week))) {
      html += '<a class="card os-pathway-cta" href="#pathway"><span class="tag">PATHWAY</span><b>Was willst du wirklich erreichen?</b><span class="s">Health · Performance · Enhanced — 30 Sekunden, prägt dein ganzes System.</span></a>';
    }

    if (d.access.twelve_week && p.active && !p.notStarted && !p.over) {
      /* ---- PHASE 6: EIN BESTER TAG (Hero → NBA 2.0 → Plan → Kontext → 1 Signal) ---- */
      var day = X.buildDay();
      var rx = PV ? PV.getTodayPrescription() : null;
      if (MM.track) MM.track("today_open", {});

      // COMEBACK — Willkommen zurück statt Streak-Schuld
      if (day.comeback) {
        html += '<div class="card os-comeback"><span class="tag">WILLKOMMEN ZURÜCK</span><p class="muted" style="margin:6px 0 10px">' + day.comeback.away + ' Tage weg — kein Drama. Hier hast du aufgehört.</p>' +
          day.comeback.options.map(function (o) { return '<button class="os-comeback-opt" data-comeback="' + esc(o.key) + '"><b>' + esc(o.label) + '</b><span>' + esc(o.line) + '</span></button>'; }).join("") + '</div>';
      }

      // HERO — mit ECHTEM Tagestyp (programView) + Overlay-Status
      var heroLine = day.overlay && X.OVERLAYS[day.overlay.mode] ? X.OVERLAYS[day.overlay.mode].label : "";
      html += '<div class="card os-hero-card' + (day.restDay ? " rest" : "") + '"><span class="small muted os-k">' + esc(greetTime()) + esc(name) + '</span>' +
        '<h1 class="os-big">Woche ' + p.week + ' · Tag ' + p.day + '</h1>' +
        '<p class="muted" style="margin:0 0 6px">' + esc(MODE[d.mode] || d.mode || "") + ' · Phase ' + p.phase + ' · ' + esc(PHASE[p.phase]) + (heroLine ? ' — <strong style="color:var(--text)">' + esc(heroLine) + '</strong>' : '') + '</p>' +
        (rx ? '<p class="os-daytype os-dt-' + esc(rx.dayType) + '"><span class="dt">' + esc(rx.title) + '</span><span class="dp">' + esc(rx.purpose) + '</span></p>' : '') + '</div>';

      // KONTEXT-BADGE (aktives Overlay, jederzeit beendbar)
      html += contextBadge(day);

      // Workout-Draft von heute → Resume statt Neuanfang
      var draft = MM.store.get("os_workout_draft", null);
      if (draft && draft.date === todayYmd() && !day.actions.some(function (a) { return (a.type === "workout" || a.type === "makeup_workout") && a.done; })) {
        html += '<a class="card os-resume" href="#workout"><span class="tag">SESSION LÄUFT</span><b>Workout fortsetzen →</b><span class="s">Deine Sätze sind gespeichert — nichts geht verloren.</span></a>';
      }

      // NEXT BEST ACTION 2.0 — eine primäre, max. zwei sekundäre, echtes WARUM
      if (day.nothingUrgent && !day.restDay) {
        html += '<div class="os-nba os-quiet"><span class="tag">HEUTE</span><b>Nichts braucht eine Korrektur.</b><p class="muted">Alles Wichtige ist erledigt oder auf Kurs. Stabilität ist das Feature — nicht Stillstand.</p></div>';
      } else if (day.restDay && !day.nba.primary) {
        html += '<div class="os-nba os-quiet"><span class="tag">RECOVERY DAY</span><b>Erholung ist Teil des Programms.</b><p class="muted">' + esc(X.prefs().stepTarget) + ' Schritte · Protein halten · Schlaf vor ' + esc(X.prefs().bedtime) + '. Kein künstliches „Mehr“.</p></div>';
      } else {
        html += nbaCard(day);
      }

      // INTELLIGENCE-VORSCHLAG (§21/§22) — bestätigen oder ablehnen, nie still.
      if (day.proposal) {
        var pr = day.proposal;
        html += '<div class="intel-decision intel-tone-watch os-proposal"><div class="hd"><span class="verdict">' + (pr.type === "check" ? "CHECK FIRST" : "VORSCHLAG") + '</span>' + (day.bottleneck ? '<span class="bn">Limiter: ' + esc((MM.intelligence ? MM.intelligence.LABELS.BN[day.bottleneck.domain] : day.bottleneck.domain) || day.bottleneck.domain) + ' · ' + day.bottleneck.confidencePct + '%</span>' : '') + '</div>' +
          '<b class="ttl">' + esc(pr.title) + '</b><p class="rsn">' + esc(pr.reason) + '</p>' +
          (pr.evidence.length ? '<div class="ev"><span>BASIEREND AUF</span>' + pr.evidence.map(function (e2) { return '<i>' + esc(e2) + '</i>'; }).join("") + '</div>' : '') +
          (pr.oneVariable ? '<p class="onevar">↳ EINE Variable ändern — alles andere konstant halten.</p>' : '') +
          '<div class="ctl" style="display:flex;gap:8px;margin-top:10px">' +
          (pr.type === "change" ? '<button class="btn btn-primary btn-sm" data-propapply>Übernehmen ✓</button>' : (pr.deepLink ? '<a class="btn btn-primary btn-sm" href="' + esc(pr.deepLink) + '">Ansehen →</a>' : '')) +
          '<button class="os-ghost" data-propdismiss="' + esc(pr.key) + '">Nicht jetzt</button></div></div>';
      }

      // WAITING FOR DATA (§30/§31) — Entscheidung wartet bewusst. KEEP PLAN.
      if (day.waiting) {
        day.waiting.slice(0, 1).forEach(function (w) {
          html += '<div class="os-decision os-waiting"><span class="tag">WAITING FOR DATA</span><b>' + esc(w.decision) + '</b>' +
            '<span class="s">Braucht noch: ' + w.needs.map(esc).join(" · ") + '</span><span class="s">' + esc(w.until) + '</span></div>';
        });
      }

      // MY DAY CHANGED + WAS KANN ICH JETZT ESSEN
      html += '<div class="os-daybtns"><button class="os-daychanged" data-daychanged><span class="ic">⟲</span> Mein Tag hat sich geändert</button><button class="os-eatnow" data-eatnow>Was kann ich jetzt essen?</button></div>';

      // Sekundärer Zugang zur Intelligenz (§67): kein 15-Tab-Chaos.
      if (MM.intelligence) html += '<p class="os-weeklink intel-links"><a href="#coach">Warum? · Coach &amp; Intelligence →</a></p>';

      // TAGESPLAN — chronologische High-Value-Anker
      html += sec("Today Plan", planTimeline(day) + '<p class="os-weeklink"><a href="#week">Ganze Woche ansehen →</a></p>');

      // WOCHEN-AUTOPILOT (§127/§128): Konflikte VOR der Woche sichtbar machen.
      if (MM.intelligence && MM.intelligence.foresight) {
        var ap = null;
        try { ap = MM.intelligence.foresight.weekAutopilot(); } catch (e) {}
        var weekEndSoon = day.programDay != null && (day.programDay % 7 === 0 || day.programDay % 7 >= 6);
        if (ap && (ap.status === "ISSUES" || weekEndSoon)) {
          html += '<div class="intel-decision ' + (ap.status === "ISSUES" ? "intel-tone-watch" : "intel-tone-good") + ' os-autopilot"><div class="hd"><span class="verdict">' + (ap.status === "ISSUES" ? "AUTOPILOT" : "NÄCHSTE WOCHE") + '</span><span class="bn">Load: ' + esc(ap.load) + ' · Recovery: ' + esc(ap.recovery) + '</span></div>' +
            '<b class="ttl">' + esc(ap.headline) + '</b>' +
            ap.conflicts.map(function (c) { return '<p class="rsn">' + esc(c.wd) + ' ' + esc(fmtDateShort(c.date)) + ': belegt ' + esc(c.busy.start) + '–' + esc(c.busy.end) + (c.altTime ? ' → frei um ' + esc(c.altTime.start) : c.altDay ? ' → Ausweichtag ' + esc(c.altDay.wd) : '') + '</p>'; }).join("") +
            '<p class="rsn"><b>Fokus:</b> ' + esc(ap.focus) + (ap.notNow.length ? ' · <b>Not now:</b> ' + esc(ap.notNow[0]) : '') + '</p>' +
            '<div class="ctl" style="display:flex;gap:8px;margin-top:10px">' + (ap.moves.length ? '<button class="btn btn-primary btn-sm" data-apweek>Woche übernehmen ✓</button>' : '') + '<a class="os-ghost" href="#week">Woche ansehen →</a></div></div>';
        }
      }

      // EIN SIGNAL (dedupliziert, läuft ab) — Foresight hat Vorrang, max. EINES (§63/§157).
      var fsi = null;
      if (!day.insight && !day.proposal && MM.intelligence && MM.intelligence.foresight) {
        try { fsi = MM.intelligence.foresight.pickInsight(); } catch (e) {}
      }
      if (day.insight) {
        html += '<div class="os-insight"><span class="tag">SIGNAL</span><p>' + esc(day.insight.text) + '</p><button class="os-ghost" data-ackinsight="' + esc(day.insight.id) + '">Gesehen</button></div>';
      } else if (fsi) {
        html += '<div class="os-insight"><span class="tag">FORESIGHT · ' + esc(fsi.level) + '</span><p><b>' + esc(fsi.title) + ':</b> ' + esc(fsi.text) + '</p>' + (fsi.action ? '<a class="os-ghost" href="' + esc(fsi.action.link) + '">' + esc(fsi.action.label) + ' →</a>' : '') + '</div>';
      }

      // ENTSCHEIDUNGS-REVIEWS fällig (Closed-Loop-Ledger)
      X.dueDecisions().forEach(function (dec) {
        html += '<div class="os-decision"><span class="tag">REVIEW FÄLLIG</span><b>' + esc(dec.what) + '</b><span class="s">Entschieden am ' + esc(fmtDateShort(dec.date)) + (dec.why ? ' — ' + esc(dec.why) : '') + '</span>' +
          '<div class="ctl"><button class="os-chip" data-decclose="' + esc(dec.id) + '" data-outcome="kept">Behalten</button><button class="os-chip" data-decclose="' + esc(dec.id) + '" data-outcome="adjusted">Angepasst</button><button class="os-chip" data-decclose="' + esc(dec.id) + '" data-outcome="reverted">Zurückgenommen</button></div></div>';
      });

      // CONSISTENCY statt Streak
      var cons = X.consistency28();
      if (cons && cons.planned > 0) html += '<p class="os-consistency">' + esc(cons.label) + (day.restDay ? ' · Geplante Erholung zählt als Erfolg.' : '') + '</p>';

      // NOT NOW — Anti-Noise
      html += '<p class="os-notnow"><b>Not now:</b> ' + day.notNow.map(esc).join(" · ") + '</p>';

      // EVENING CLOSE
      html += closeDayCard(day);

      if (!OS.baseline()) html += '<a class="card os-baseline-cta" href="#baseline"><span class="tag">BASELINE</span><b>Dokumentiere deinen Start.</b><span class="s">Gewicht, Taille, Kraftwerte, Fotos — du wirst nicht mehr wissen, wie du heute aussahst.</span></a>';

      // Sheet-Container (My Day Changed / Eat Now / Quick Capture)
      html += '<div id="osSheet" class="os-sheet" hidden></div>';
    } else if (d.access.twelve_week && p && p.notStarted) {
      html += '<div class="card os-accent"><span class="small muted os-k">' + esc(greetTime()) + esc(name) + '</span><h1 class="os-big" style="font-size:1.5rem">Dein 12-Week System ist startklar</h1><p class="muted" style="margin:0 0 14px">Dein Programm beginnt am gewählten Startdatum. Nutze die Zeit: <a href="#baseline" style="color:var(--accent)">Baseline anlegen →</a></p><a href="kurs-programm.html" class="btn btn-primary">Programm öffnen →</a></div>';
    } else if (d.access.twelve_week) {
      html += '<div class="card os-accent"><span class="small muted os-k">' + esc(greetTime()) + esc(name) + '</span><h1 class="os-big" style="font-size:1.5rem">Dein 12-Week System ist bereit</h1><p class="muted" style="margin:0 0 14px">Empfohlener Ablauf: erst <a href="#baseline" style="color:var(--accent)">Baseline</a>, dann Programm einrichten.</p><a href="kurs-programm.html" class="btn btn-primary">Programm starten →</a></div>';
    } else if (d.hasScore) {
      html += '<div class="card os-accent"><span class="small muted os-k">' + esc(greetTime()) + esc(name) + '</span><h1 class="os-big" style="font-size:1.5rem">Dein Engpass: ' + esc(d.bottleneckName || BN[d.bottleneck] || "—") + '</h1><p class="muted" style="margin:0 0 14px">Empfohlener Modus: <strong style="color:var(--text)">' + esc(MODE[d.mode] || d.mode || "—") + '</strong>. Das 12-Week System führt dich Schritt für Schritt.</p><a href="protokoll.html" class="btn btn-primary">Dein System aufbauen →</a></div>';
    } else {
      html += '<div class="card os-accent os-start"><h1 class="os-big" style="font-size:1.5rem">Dein System startet hier</h1><ol class="os-steps">' +
        '<li><b>Score machen</b><span>Baseline deiner 7 Systeme — findet deinen Engpass.</span></li>' +
        '<li><b>Pathway wählen</b><span>Health · Performance · Enhanced.</span></li>' +
        '<li><b>Baseline anlegen</b><span>Gewicht, Taille, Fotos, Kraftwerte.</span></li>' +
        '<li><b>Plan bauen</b><span>Programm, Nutrition, Training, Stack.</span></li></ol>' +
        '<a href="check.html" class="btn btn-primary">MaleMetrix Score starten →</a></div>';
    }

    // Kontext läuft seit Phase 6 über Overlays („Mein Tag hat sich geändert“ +
    // Badge oben) — die alten Kontext-Chips sind dadurch abgelöst.

    if (!d.access.twelve_week) {
      html += '<div class="card"><p class="small" style="margin:0 0 8px;font-weight:600">Du hast bereits einen Zugangscode?</p><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="mmClaim" type="text" placeholder="Zugangscode" autocomplete="off" spellcheck="false" style="flex:1;min-width:180px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:rgba(127,127,127,0.06);color:var(--text);letter-spacing:1px"><button id="mmClaimBtn" class="btn btn-primary btn-sm">Zugang aktivieren</button></div><p id="mmClaimMsg" class="small" style="display:none;margin-top:8px"></p></div>';
    }

    var SYNC_TXT = { synced: "Gespeichert ✓", pending: "Sync ausstehend", saving: "Speichert…", offline: "Offline — lokal gespeichert", error: "Sync wird automatisch erneut versucht", "local": "Nur dieses Gerät", "n/a": "" };
    html += '<div class="card os-account"><span class="os-k">Konto &amp; Daten</span>' +
      '<p class="small muted" style="margin:8px 0 10px">Status: ' + esc(SYNC_TXT[snap.state === "signed_in" ? MM.account.getSyncStatus() : "local"] || "") + '</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button id="mmExport" class="os-ghost">Meine Daten exportieren (JSON)</button>' +
      (snap.state === "signed_in" ? '<button id="mmDelete" class="os-ghost">Konto löschen</button>' : '') +
      '</div><p id="mmAcctMsg" class="small muted" style="display:none;margin-top:8px"></p></div>';

    if (snap.state === "local") html += '<p class="small muted" style="text-align:center;margin-top:18px">Dieses Gerät nutzt My MaleMetrix lokal. Das geräteübergreifende Konto wird demnächst aktiviert — deine Daten bleiben erhalten.</p>';
    return html;
  }

  /* =========================== WEEK PLANNER (Phase 6) =========================== */
  var weekOffset = 0;
  function vWeek() {
    var wp = X.weekPlan(weekOffset);
    if (!wp) { weekOffset = 0; wp = X.weekPlan(0); }
    if (!wp) return '<div class="card"><p class="muted">Noch keine Woche zu planen. <a href="#today" style="color:var(--accent)">Zurück zu Today →</a></p></div>';
    var head = '<div class="os-weekhead"><button class="os-ghost" data-weeknav="-1" ' + (weekOffset <= 0 ? "disabled" : "") + '>←</button><div class="t"><b>' + (wp.week ? "WOCHE " + wp.week : "DIESE WOCHE") + '</b><span class="os-load os-load-' + wp.load.toLowerCase() + '">' + wp.load + ' · ~' + Math.round(wp.loadMin / 60 * 10) / 10 + ' h geplant</span></div><button class="os-ghost" data-weeknav="1">→</button></div>';
    var grid = '<div class="os-weekgrid">' + wp.days.map(function (dd) {
      var cls = "os-wday" + (dd.isToday ? " today" : "") + (dd.past ? " past" : "") + (dd.type === "strength" || dd.makeup ? " train" : "");
      var status = dd.past ? (dd.type === "strength" ? (dd.trainDone ? '<span class="ok">✓</span>' : '<span class="miss">verpasst</span>') : (dd.done ? '<span class="ok">✓</span>' : '')) : "";
      return '<div class="' + cls + '"><span class="wd">' + esc(dd.wd) + '</span><span class="dt">' + esc(fmtDateShort(dd.date)) + '</span><b>' + esc(dd.label) + '</b>' +
        (dd.review ? '<span class="mk">REVIEW</span>' : '') + (dd.measure ? '<span class="mk">MESSEN</span>' : '') +
        (dd.overlay ? '<span class="mk ov">' + esc((X.OVERLAYS[dd.overlay] || {}).label || dd.overlay) + '</span>' : '') + status + '</div>';
    }).join("") + '</div>';
    var missed = X.missedThisWeek().filter(function (m) { return !m.handled; });
    var repair = "";
    if (missed.length && weekOffset === 0) {
      repair = '<div class="os-decision"><span class="tag">WOCHE REPARIEREN</span><b>' + missed.length + ' Einheit' + (missed.length > 1 ? 'en' : '') + ' offen</b><span class="s">Die Vergangenheit bleibt, wie sie war — aber die Woche ist noch zu retten.</span><div class="ctl"><button class="os-chip" data-repair="' + missed[0].pd + '">Optionen ansehen</button></div></div>';
    }
    var ics = '<div class="card"><span class="tag">KALENDER-EXPORT</span><p class="muted" style="margin:8px 0 12px">Nur echte Termine: Trainingstage, Nachhol-Sessions, Review, Messtag. Apple/Google-kompatibel (.ics). Kein Zwei-Wege-Sync — ehrlich gesagt.</p><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="icsTime" type="time" value="' + esc(OS.getP("calendar.trainTime", "18:00")) + '" style="padding:8px;border:1px solid var(--line);border-radius:8px;background:rgba(127,127,127,0.06);color:var(--text)"><button id="icsGo" class="os-ghost">Nächste 14 Tage als .ics</button></div></div>';
    return sec("Week Planner", head + grid + '<p class="small muted" style="margin-top:8px">TRAIN = Kraft · ENGINE = Cardio · RECOVER/RESET = geplante Erholung (zählt als Erfolg).</p>') + repair + ics + '<div id="osSheet" class="os-sheet" hidden></div>';
  }

  /* =========================== SETTINGS / CONTROL CENTER (Phase 6) =========================== */
  function vSettings() {
    var rp = X.reminderPrefs();
    var pf = X.prefs();
    var ps = X.pushStatus();
    function sel(id, val, opts) { return '<select id="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(val) === String(o[0]) ? " selected" : "") + '>' + o[1] + '</option>'; }).join("") + '</select>'; }
    var html = sec("Erinnerungen",
      '<p class="muted" style="margin:0 0 12px">MaleMetrix erinnert nur, wenn etwas WIRKLICH ansteht — nie für Erledigtes, max. ' + rp.maxPerDay + '×/Tag, mit Ruhezeiten.</p>' +
      '<label class="os-toggle"><input type="checkbox" id="rmEnabled"' + (rp.enabled ? " checked" : "") + '><span>Erinnerungen aktiv</span></label>' +
      '<div class="os-grid2"><label class="os-field"><span>Ruhe ab</span><input id="rmQuietFrom" type="time" value="' + esc(rp.quietFrom) + '"></label><label class="os-field"><span>Ruhe bis</span><input id="rmQuietTo" type="time" value="' + esc(rp.quietTo) + '"></label></div>' +
      '<label class="os-field"><span>Sperrbildschirm-Inhalt</span>' + sel("rmPrivacy", rp.privacy, [["full", "Voll (Inhalt sichtbar)"], ["discreet", "Diskret (nur „Aktion fällig“)"], ["off", "Keine System-Notifications"]]) + '</label>' +
      '<p class="small muted" style="margin-top:8px">' + esc(ps.state === "config_required" ? ps.honest : ps.state === "unsupported" ? "Dieser Browser unterstützt keine Notifications — Erinnerungen erscheinen in der App." : "System-Notifications aktiv, solange die App geöffnet ist.") + '</p>' +
      (typeof Notification !== "undefined" && Notification.permission === "default" && rp.enabled ? '<button class="os-ghost" id="rmPerm">System-Benachrichtigungen erlauben</button>' : ''));
    html += sec("Rhythmus",
      '<div class="os-grid2"><label class="os-field"><span>Trainingszeit</span><input id="stTrainTime" type="time" value="' + esc(pf.trainTime) + '"></label>' +
      '<label class="os-field"><span>Schlaf-Fenster ab</span><input id="stBedtime" type="time" value="' + esc(pf.bedtime) + '"></label>' +
      '<label class="os-field"><span>Schrittziel</span><input id="stSteps" type="number" inputmode="numeric" value="' + esc(pf.stepTarget) + '"></label>' +
      '<label class="os-field"><span>Wiegetag</span>' + sel("stWeighWd", pf.weighWd, [[0, "Sonntag"], [1, "Montag"], [5, "Freitag"], [6, "Samstag"]]) + '</label></div>');
    html += sec("Modus & Dichte",
      '<label class="os-field"><span>Informationsdichte</span>' + sel("stDensity", pf.density, [["focus", "Focus — sag mir nur, was zu tun ist"], ["standard", "Standard"], ["expert", "Expert — Daten & Begründungen"]]) + '</label>' +
      '<label class="os-toggle"><input type="checkbox" id="stMinimum"' + (pf.minimumMode ? " checked" : "") + '><span>Minimum-Mode (nur Training · Protein · Schlaf · 1 Messung)</span></label>' +
      '<label class="os-field"><span>Automationslevel</span>' + sel("stAutomation", pf.automation, [["manual", "Manuell — nur anzeigen"], ["assisted", "Assistiert — vorschlagen, ich bestätige"], ["proactive", "Proaktiv — sichere Mikro-Änderungen automatisch"]]) + '</label>' +
      '<p class="small muted">Größere Plan-Änderungen brauchen IMMER deine Bestätigung — unabhängig vom Level. Medizinische Automation gibt es nicht.</p>');
    html += sec("Kalender-Voraussicht",
      '<p class="muted" style="margin:0 0 10px">MaleMetrix prüft geplante Einheiten gegen deine BELEGTEN Zeitfenster — gespeichert werden nur Start/Ende, nie Termintitel.</p>' +
      '<label class="os-field"><span>Kalender-Export (.ics) importieren — nur busy/free</span><input id="calIcs" type="file" accept=".ics,text/calendar"></label>' +
      '<p class="small muted">' + (X.busyWindows().length ? X.busyWindows().length + ' belegte Fenster gespeichert. ' : 'Noch keine belegten Fenster. ') + 'Google-Kalender (busy/free via OAuth): Architektur steht — CONFIG REQUIRED, siehe CALENDAR.md.</p>' +
      (X.busyWindows().length ? '<button class="os-ghost" id="calClear">Importierte Fenster löschen</button>' : ''));
    var aiSt = (window.MM && MM.ai) ? MM.ai.status() : { state: "config_required" };
    html += sec("KI-Sprachschicht",
      '<p class="small muted">' + esc(aiSt.state === "enabled" ? "KI-Synthese aktiv (server-seitig, validiert). Deterministische Intelligenz bleibt maßgeblich." : (aiSt.honest || "Deterministische Intelligenz aktiv — KI-Schicht braucht Server-Konfiguration.")) + '</p>');
    html += '<p style="margin-top:16px"><a class="os-ghost" href="#today">← Zurück zu Today</a></p>';
    return html;
  }

  /* =========================== PATHWAY =========================== */
  function vPathway() {
    var cur = OS.pathway();
    return sec("Was willst du wirklich erreichen?", '<p class="muted" style="margin:0 0 16px">Pathway ≠ Ziel. Der Pathway bestimmt Ton, Tiefe und welche Inhalte dein System dir zeigt — dein Modus (CUT/RECOMP/BUILD/PERFORM) bleibt davon getrennt.</p>' +
      '<div class="os-pathways">' + Object.keys(OS.PATHWAYS).map(function (k) {
        var p = OS.PATHWAYS[k];
        return '<button class="os-pathway ' + (cur === k ? "sel" : "") + '" data-pathway="' + k + '"><span class="nm">' + esc(p.label) + '</span><span class="ln">' + esc(p.line) + '</span>' + (k === "enhanced" ? '<span class="note">Direkte Real-World-Education · kein Dosierungs-Generator</span>' : '') + '</button>';
      }).join("") + '</div>');
  }

  /* =========================== BASELINE =========================== */
  function vBaseline() {
    var b = OS.baseline() || {};
    var lw = OS.latestMetric("weight"), lwa = OS.latestMetric("waist");
    var cyc = OS.currentCycle();
    function inp(id, label, val, ph) { return '<label class="os-field"><span>' + esc(label) + '</span><input id="' + id + '" type="number" inputmode="decimal" value="' + (val != null ? esc(val) : "") + '" placeholder="' + (ph || "—") + '"></label>'; }
    return sec("Baseline · dokumentiere deinen Start",
      '<p class="small muted" style="margin:0 0 4px">Zyklus <span class="os-mono">' + esc(cyc.id.slice(-6)) + '</span> · Status ' + esc(cyc.status === "draft" ? "DRAFT (Programm noch nicht gestartet)" : cyc.status.toUpperCase()) + '</p>' +
      '<p class="muted">Du wirst nicht mehr genau wissen, wie du heute aussahst. Miss den Start — Woche 0 · 4 · 8 · 12 vergleichen sich später von selbst.</p>' +
      '<div class="os-grid2">' +
      inp("blW", "Gewicht (kg)", b.weight || (lw && lw.value) || null) + inp("blWa", "Taille (cm)", b.waist || (lwa && lwa.value) || null) +
      inp("blBf", "KFA-Schätzung % (optional)", b.bf || null) + inp("blSleep", "Ø Schlaf (h)", b.sleep || OS.getP("recovery.sleepHours", null)) +
      inp("blBench", "Bankdrücken (kg × Wdh, z. B. 80x8)", null, b.bench || "80x8") + inp("blSquat", "Kniebeuge/Beinpresse", null, b.squat || "100x8") +
      '</div>' +
      '<label class="os-field"><span>Aktuelle Supplements (frei)</span><input id="blStack" type="text" value="' + esc(b.stackText || "") + '" placeholder="z. B. Kreatin, Whey, Multivitamin"></label>' +
      '<div class="os-photos"><span class="os-k">Fotos (optional · bleiben NUR auf diesem Gerät)</span><p class="small muted" style="margin:4px 0 10px">Gleiches Licht, gleicher Abstand, gleiche Pose. Kein Upload, keine Fake-KI-Analyse.</p>' +
      ["front", "side", "back"].map(function (a) { return '<label class="os-photo" data-angle="' + a + '"><input type="file" accept="image/*" capture="environment" data-photoin="' + a + '" hidden><span class="ang">' + a.toUpperCase() + '</span><span class="st" id="ph_' + a + '">+ Foto</span></label>'; }).join("") + '</div>' +
      '<button id="blSave" class="btn btn-primary" style="margin-top:14px">Baseline speichern →</button>' +
      '<p class="small muted" style="margin-top:8px">Fotos sind optional — das Programm startet auch ohne. Ohne Fotos gibt es in Woche 12 nur keinen visuellen Vergleich.</p>');
  }

  /* =========================== TRANSFORMATION =========================== */
  function vTransform() {
    var t = MM.store.get("os_transformation", null);
    var lw = OS.latestMetric("weight");
    var d = MM.account.getDashboardState();
    var pw = OS.pathway();
    var html = "";
    if (t && t.result) {
      var r = t.result;
      html += sec("Deine Transformation", realityCheck(t.input.targetWeightKg + " kg · " + (t.input.targetLeanness === "leaner" ? "definierter" : "gleich"), t.input.months + " Monate", r.reality) +
        (r.enhanced && r.enhancedMarkers ? '<div class="os-enhmarkers"><span class="tag">ENHANCED-KONTEXT</span>' + [["Physique-Potenzial", r.enhancedMarkers.potential], ["Komplexität", r.enhancedMarkers.complexity], ["Monitoring", r.enhancedMarkers.monitoring], ["Reversibilität", r.enhancedMarkers.reversibility], ["Gesundheitskosten", r.enhancedMarkers.healthCost]].map(function (m) { return '<div class="row"><span>' + esc(m[0]) + '</span><b>' + esc(m[1]) + '</b></div>'; }).join("") + '</div>' : '') +
        '<div class="os-roadmap">' + r.phases.map(function (p, i) { return '<div class="os-phase"><span class="n">' + (i + 1) + '</span><div><b>' + esc(p.name) + '</b><span class="w">' + p.weeks + ' Wochen</span><p>' + esc(p.why) + '</p>' + (p.monitoring ? '<p class="small" style="color:var(--amber,#f5a623)">' + esc(p.monitoring) + '</p>' : '') + '</div></div>'; }).join("") + '</div>' +
        '<p class="small muted">Erwartbarer Muskelaufbau (' + r.months + ' Mon.): konservativ ' + r.gainRange.cons + ' kg · wahrscheinlich ' + r.gainRange.likely + ' kg · aggressiv ' + r.gainRange.aggr + ' kg. Spannen, keine Garantien.</p>' +
        '<p style="margin-top:10px"><a class="btn btn-primary btn-sm" href="kurs-programm.html">Aktuellen 12-Wochen-Zyklus ' + (d.program && d.program.active ? "fortsetzen" : "starten") + ' →</a> <button class="os-ghost" id="txReset">Neu planen</button></p>');
      if (r.enhanced) html += '<a class="card os-row-cta" href="coaching.html#enhanced"><span class="tag">SUPPORT</span><b>Enhanced Performance Support — 1:1 Begleitung mit Monitoring-Rhythmus</b></a>';
      else if ((t.input.targetWeightKg - t.input.weightKg) > 8) html += '<a class="card os-row-cta" href="coaching.html#muscle"><span class="tag">COACHING</span><b>Maximum Muscle — 1:1 Begleitung für ambitionierte Aufbauziele</b></a>';
      html += nobody("Aufbau und sichtbar schlanker werden passieren nicht in derselben Woche — sondern in derselben Roadmap. Wer beides gleichzeitig in 12 Wochen will, bekommt meist keins von beidem.");
      return html;
    }
    function inp(id, label, val, ph) { return '<label class="os-field"><span>' + esc(label) + '</span><input id="' + id + '" type="number" inputmode="decimal" value="' + (val != null ? esc(val) : "") + '" placeholder="' + (ph || "—") + '"></label>'; }
    html += sec("Wo willst du hin?", '<p class="muted">Wir rechnen ehrlich: was dein Ziel in deinem Trainingsalter wirklich braucht — in Spannen, nicht in Versprechen.</p>' +
      (pw === "enhanced" ? '<p class="small" style="color:var(--amber,#f5a623)">Dein Pathway ist ENHANCED — die Roadmap rechnet mit dem Kontext (höhere Spannen, höhere Unsicherheit, Monitoring-Blöcke). Keine Substanz-/Dosierungsplanung.</p>' : '') +
      '<div class="os-grid2">' + inp("txW", "Aktuelles Gewicht (kg)", (lw && lw.value) || null) + inp("txBf", "KFA-Schätzung % (optional)", null, "18") +
      inp("txTW", "Zielgewicht (kg)", null, "90") + inp("txM", "Zeitraum (Monate)", 12) + '</div>' +
      '<label class="os-field"><span>Dabei…</span><select id="txLean"><option value="leaner">definierter werden</option><option value="same">Körperfett egal</option><option value="much_leaner">deutlich definierter</option></select></label>' +
      '<label class="os-field"><span>Trainingserfahrung</span><select id="txExp"><option value="beginner">Einsteiger (&lt;1 Jahr)</option><option value="novice" selected>Fortgeschritten (1–2 J.)</option><option value="intermediate">Erfahren (2–5 J.)</option><option value="advanced">Sehr erfahren (5+ J.)</option></select></label>' +
      '<button id="txGo" class="btn btn-primary" style="margin-top:12px">Reality Check →</button>');
    return html;
  }

  /* =========================== PLAN =========================== */
  function currentMealDay() {
    var nd = MM.store.get("os_nutrition_days", null);
    return (nd && Array.isArray(nd.current) && nd.current.length) ? nd : null;
  }
  function vPlan() {
    var d = MM.account.getDashboardState();
    var html = "";
    var t = MM.store.get("os_transformation", null);
    html += '<a class="card os-row-cta" href="#transform"><span class="tag">ROADMAP</span><b>' + (t ? "12-Monats-Roadmap ansehen" : "Transformation planen — Reality Check") + '</b></a>';
    if (MM.intelligence) html += '<a class="card os-row-cta" href="#simulator"><span class="tag">WHAT IF?</span><b>Szenarien vergleichen — 3 vs 4 Tage · mehr essen · Reise</b></a>';

    /* --- NUTRITION OS --- */
    var np = MM.store.get("os_nutrition_plan", null);
    if (np) {
      var nd = currentMealDay();
      var mealIds = nd ? nd.current : null;
      var meals = mealIds ? mealIds.map(E.mealById).filter(Boolean) : E.exampleDay(np, { maxCookMin: OS.getP("nutrition.cookMinutes", 40) }).meals;
      var totals = mealIds ? E.dayTotals(mealIds) : meals.reduce(function (a, m) { return { kcal: a.kcal + m.kcal, p: a.p + m.p }; }, { kcal: 0, p: 0 });
      var logToday = OS.nutritionLog()[todayYmd()] || [];
      html += sec("Nutrition · " + esc(MODE[d.mode] || ""),
        '<div class="os-macro"><div class="m"><b>' + np.kcal + '</b><span>kcal (' + np.kcalRange[0] + '–' + np.kcalRange[1] + ')</span></div><div class="m"><b>' + np.protein + ' g</b><span>Protein</span></div><div class="m"><b>' + np.carbs + ' g</b><span>Carbs</span></div><div class="m"><b>' + np.fat + ' g</b><span>Fett</span></div></div>' +
        '<p class="small muted" style="margin:8px 0 12px">' + (nd ? 'Dein gespeicherter Tag (seit ' + esc(nd.saved) + ') — geplant: ' + totals.kcal + ' kcal · ' + totals.p + ' g Protein. GEPLANT ≠ GEGESSEN: logge, was du wirklich isst.' : 'Beispieltag — mit „Diesen Tag verwenden“ wird er dein fester Plan, den du swappen und loggen kannst.') + '</p>' +
        '<div class="os-meals">' + meals.map(function (m) {
          var logged = logToday.some(function (e) { return e.name === m.name; });
          return '<div class="os-meal"><div class="hd"><b>' + esc(m.name) + '</b><span>' + m.kcal + ' kcal · ' + m.p + ' g P</span></div><p class="ing">' + E.ingText(m.ing).map(esc).join(" · ") + '</p>' +
            (m.family ? '<p class="fam">Familie: ' + esc(m.family.note) + ' (' + m.family.servings + ' Portionen)</p>' : '') +
            '<div class="ctl">' +
            (nd ? '<button class="os-chip ' + (logged ? "sel" : "") + '" data-eat="' + m.id + '">' + (logged ? "Geloggt ✓" : "Gegessen ✓") + '</button>' : '') +
            '<button class="os-chip" data-swap="' + m.id + '" data-want="cheaper">billiger</button><button class="os-chip" data-swap="' + m.id + '" data-want="faster">schneller</button><button class="os-chip" data-swap="' + m.id + '" data-want="protein">mehr Protein</button><button class="os-chip" data-swap="' + m.id + '" data-want="family">Familie</button></div></div>';
        }).join("") + '</div>' +
        (!nd ? '<button class="btn btn-primary btn-sm" id="npUseDay">Diesen Tag verwenden →</button> ' : '') +
        '<button class="os-ghost" id="npShop">Einkaufsliste (Mengen) anzeigen</button><div id="npShopOut"></div>' +
        '<div id="npAdjust" style="margin-top:12px">' + weeklyReviewCard(np, d) + '</div>');
    } else {
      html += '<div class="card"><span class="tag">NUTRITION OS</span><p class="muted" style="margin:8px 0 12px">Jeder Modus braucht Zahlen: Energie, Protein, realer Tag. Aus deinen vorhandenen Daten — nichts wird doppelt gefragt.</p>' +
        '<div class="os-grid2">' +
        (!OS.latestMetric("weight") ? '<label class="os-field"><span>Gewicht (kg)</span><input id="npW" type="number" inputmode="decimal"></label>' : '') +
        (!OS.getP("identity.height", null) ? '<label class="os-field"><span>Größe (cm)</span><input id="npH" type="number" inputmode="decimal"></label>' : '') +
        '<label class="os-field"><span>Beruf/Alltag</span><select id="npOcc"><option value="sitting">überwiegend sitzend</option><option value="mixed">gemischt</option><option value="physical">körperlich</option></select></label>' +
        '<label class="os-field"><span>Schritte/Tag (grob)</span><select id="npSteps"><option value="4000">&lt; 5.000</option><option value="7000" selected>5–10.000</option><option value="12000">&gt; 10.000</option></select></label>' +
        '</div><button id="npCreate" class="btn btn-primary btn-sm">Nutrition-Plan erstellen →</button>' +
        '<p class="small muted" style="margin-top:8px">Aktivität wird aus Trainingstagen + Alltag geschätzt und später aus deinem echten Logging + Gewichtstrend korrigiert — keine Pauschale.</p></div>';
    }

    /* --- TRAINING ENGINE --- */
    var tp = MM.store.get("os_training_plan", null);
    if (tp) {
      var vol = E.weeklyVolume(tp);
      var psi = plannedSessionInfo(tp);
      html += sec("Training · " + tp.days + " Tage / Woche", (tp.note ? '<p class="small muted" style="margin:0 0 10px">' + esc(tp.note) + '</p>' : '') +
        (psi.programDay != null ? '<p class="small" style="margin:0 0 10px">' + (psi.isToday ? 'Heute geplant: <b>' + esc(psi.session.name) + '</b>' : 'Nächste geplante Session: <b>' + esc(psi.session.name) + '</b> (Programm-Tag ' + psi.programDay + ')') + '</p>' : '') +
        '<div class="os-sessions">' + tp.sessions.map(function (s) {
          return '<div class="os-session"><b>' + esc(s.name) + '</b><ul>' + s.slots.map(function (sl) { return '<li>' + esc(sl.name) + ' <span>' + sl.sets + ' × ' + sl.reps[0] + '–' + sl.reps[1] + ' · RIR ' + sl.rir + ' · Pause ' + sl.rest + '</span>' + (sl.note ? '<em class="os-exnote">' + esc(sl.note) + '</em>' : '') + '</li>'; }).join("") + '</ul></div>';
        }).join("") + '</div>' +
        '<div class="os-volume"><span class="tag">WOCHENVOLUMEN (harte Sätze)</span>' + Object.keys(vol).filter(function (g) { return g !== "core"; }).map(function (g) { return '<div class="vrow"><span>' + esc(GROUP_DE[g] || g) + '</span><i style="width:' + Math.min(100, vol[g] * 6) + 'px"></i><b>' + vol[g] + '</b></div>'; }).join("") + '</div>' +
        '<p class="small muted">Progression: Double Progression — erst Wiederholungen im Zielbereich füllen, dann Last erhöhen. Dein nächstes Ziel steht im Workout.</p>' +
        '<a class="btn btn-primary btn-sm" href="#workout">Workout öffnen →</a> <button class="os-ghost" id="tpReset">Plan ändern</button>');
    } else {
      var daysKnown = MM.store.get("c2_days", null);
      html += '<div class="card"><span class="tag">TRAINING ENGINE</span><p class="muted" style="margin:8px 0 12px">Exakte Sessions mit Sätzen, Wiederholungsbereichen, RIR und Progressionsregel — abgestimmt auf deine Programm-Tage' + (daysKnown ? ' (' + daysKnown.length + '/Woche, aus deinem Programm übernommen)' : '') + '.</p>' +
        '<div class="os-grid2"><label class="os-field"><span>Ort</span><select id="tpLoc"><option value="gym">Gym</option><option value="home_db">Zuhause (Kurzhanteln)</option><option value="home_none">Zuhause (ohne Equipment)</option></select></label>' +
        '<label class="os-field"><span>Priorität</span><select id="tpPrio"><option value="balanced">Ausgewogen</option><option value="chest">Brust</option><option value="back">Rücken</option><option value="arms">Arme</option><option value="shoulders">Schultern</option><option value="legs">Beine</option></select></label></div>' +
        '<div class="os-ctxrow" style="margin:6px 0 10px"><span class="small muted" style="align-self:center">Einschränkungen:</span>' +
        [["shoulder", "Schulter"], ["knee", "Knie"], ["back", "Rücken"]].map(function (l) { return '<label class="os-chip os-chk"><input type="checkbox" data-tplim="' + l[0] + '"> ' + l[1] + '</label>'; }).join("") + '</div>' +
        '<button id="tpCreate" class="btn btn-primary btn-sm">Trainingsplan erstellen →</button></div>';
    }

    /* --- STACK INTELLIGENCE --- */
    var st = MM.store.get("os_stack", null);
    var budget = (st && st.budget) || "optimal";
    var budgetEuro = st && st.budgetEuro;
    // §31/§95/§96 — Labs speisen Stack-Kontext: Vitamin D ausreichend → nicht
    // hochdosieren; Eisen hoch → kein Eisen; Hämatokrit hoch → Monitoring-Flag.
    var labCtx = (window.MM.labs) ? MM.labs.stackContext() : { flags: {}, notes: [] };
    var strat = E.stackStrategy({
      mode: d.mode || "recomp", pathway: OS.pathway(), budget: budget, budgetEuro: budgetEuro,
      current: (OS.getP("stack.currentText", "") || (OS.baseline() || {}).stackText || "").split(","),
      sleepBad: (OS.getP("recovery.sleepHours", 7) || 7) < 6.5,
      fishTwiceWeek: OS.getP("nutrition.fishTwiceWeek", false), summerSun: OS.getP("lifestyle.summerSun", false),
      medication: OS.getP("health.medication", false),
      vitDAdequate: labCtx.flags.vitDAdequate, ironHigh: labCtx.flags.ironHigh
    });
    html += sec("Stack · wertbasiert, nicht maximal",
      '<div class="os-budget">' + ["essential", "optimal", "maximal"].map(function (b) { return '<button class="os-chip ' + (budget === b && !budgetEuro ? "sel" : "") + '" data-budget="' + b + '">' + b.toUpperCase() + '</button>'; }).join("") +
      '<label class="os-chip os-chk" style="margin-left:6px">€/Monat: <input id="stEuro" type="number" inputmode="numeric" value="' + (budgetEuro || "") + '" placeholder="60" style="width:56px;background:transparent;border:0;color:inherit;border-bottom:1px solid var(--line)"></label><button class="os-ghost" id="stEuroGo">Budget anwenden</button></div>' +
      (strat.costPlan ? '<div class="os-costplan"><div class="row"><span>KERN</span><b>' + strat.costPlan.coreCost + ' €/Mon. — ' + strat.costPlan.core.map(esc).join(", ") + '</b></div>' + (strat.costPlan.nextBest.length ? '<div class="row"><span>NÄCHSTE ERGÄNZUNG</span><b>' + strat.costPlan.nextBest.map(function (n) { return esc(n.name) + " (+" + n.addMo + " €)"; }).join(" · ") + '</b></div>' : '') + (strat.costPlan.lowReturn.length ? '<div class="row low"><span>GERINGER ERTRAG</span><b>' + strat.costPlan.lowReturn.map(function (n) { return esc(n.name) + " (+" + n.addMo + " €)"; }).join(" · ") + '</b></div>' : '') + '</div>' : '') +
      '<div class="os-stack">' + strat.items.map(function (s) { return '<div class="os-supp"><div class="hd"><b>' + esc(s.name) + '</b><span class="ev ev-' + s.evidence.toLowerCase() + '">' + esc(s.evidence) + '</span></div><p>' + esc(s.why) + '</p><span class="tm">' + esc(s.timing) + ' · ~' + s.costMo + ' €/Mon.</span></div>'; }).join("") + '</div>' +
      (strat.conflicts.length ? '<div class="os-conflicts"><span class="tag">CONTEXT CHECK</span>' + strat.conflicts.map(function (c) { return '<p>' + esc(c) + '</p>'; }).join("") + '</div>' : '') +
      (strat.skipped.length ? '<div class="os-skipped"><span class="tag">BEWUSST NICHT EMPFOHLEN</span>' + strat.skipped.map(function (s) { return '<p><b>' + esc(s.name) + '</b> — ' + esc(s.why) + '</p>'; }).join("") + '</div>' : '') +
      (strat.remove.length ? '<div class="os-remove"><span class="tag">STREICHEN — SPART GELD, KOSTET NICHTS</span>' + strat.remove.map(function (s) { return '<p><b>' + esc(s.name) + '</b> — ' + esc(s.why) + '</p>'; }).join("") + '</div>' : '') +
      (strat.diminishing ? '<p class="small muted" style="margin-top:8px">' + esc(strat.diminishing) + '</p>' : '') +
      '<div class="os-schedule">' + [["morning", "MORGENS"], ["with_food", "ZUM ESSEN"], ["pre_training", "PRE-TRAINING"], ["evening", "ABENDS"]].map(function (sl) { var arr = strat.schedule[sl[0]]; return arr.length ? '<div><span>' + sl[1] + '</span><b>' + arr.map(esc).join(" · ") + '</b></div>' : ''; }).join("") + '</div>' +
      '<button class="btn btn-primary btn-sm" id="stSave">Als meine Stack-Routine übernehmen</button>');

    html += '<div class="card"><span class="tag">KALENDER</span><p class="muted" style="margin:8px 0 12px">Deine Woche als echte Tagestypen (Strength-Session X · Engine · Recover) in deinen Kalender — als ICS-Datei. Kein Zwei-Wege-Sync, ehrlich gesagt.</p><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="icsTime" type="time" value="' + esc(OS.getP("calendar.trainTime", "18:00")) + '" style="padding:8px;border:1px solid var(--line);border-radius:8px;background:rgba(127,127,127,0.06);color:var(--text)"><button id="icsGo" class="os-ghost">Nächste 7 Tage als .ics laden</button></div></div>';
    return html;
  }

  /* Wochen-Review (§37/§38): echte Daten rein → Verdict → REVIEW → ACCEPT */
  function weeklyReviewCard(np, d) {
    var wt = OS.metricTrend("weight", 7);
    var wa = OS.metricTrend("waist", 7);
    var lw = OS.latestMetric("weight");
    var log = OS.nutritionLog();
    var dates = []; for (var i = 1; i <= 7; i++) { var dt = new Date(Date.now() - i * 86400000); dates.push(dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0")); }
    var adh = E.weeklyAdherence(log, np, dates);
    var lp = OS.lastPulse();
    var trend = E.strengthTrend(exHistories());
    var verdict = E.nutritionAdjust({
      mode: d.mode || "recomp", weightKg: lw ? lw.value : null,
      weightTrend: wt ? wt.delta : null, waistTrend: wa ? wa.delta : null,
      adherencePct: adh.daysLogged >= 3 ? Math.round(adh.proteinDays / Math.max(1, adh.daysLogged) * 100) : null,
      energyLow: !!(lp && lp.inp && lp.inp.energy != null && lp.inp.energy <= 2),
      sleepBad: !!(lp && lp.inp && lp.inp.sleep === "bad"),
      strengthStalled: !!(trend && trend.pct <= 0.5),
      kcalTarget: np.kcal
    });
    var hist = MM.store.get("os_adjust_history", []) || [];
    var histHtml = hist.length ? '<p class="small muted" style="margin-top:8px">Letzte Anpassung: ' + esc(hist[hist.length - 1].date) + ' · ' + hist[hist.length - 1].oldKcal + ' → ' + hist[hist.length - 1].newKcal + ' kcal (' + esc(hist[hist.length - 1].reason) + ')</p>' : '';
    return '<div class="os-review"><span class="tag">WOCHEN-REVIEW · NUTRITION</span>' +
      '<div class="rows"><div class="row"><span>Protein-Ziel</span><b>' + adh.proteinDays + ' / ' + Math.max(adh.daysLogged, 7) + ' Tage' + (adh.daysLogged < 7 ? ' (nur ' + adh.daysLogged + ' geloggt)' : '') + '</b></div>' +
      '<div class="row"><span>Energie-Korridor</span><b>' + adh.energyDays + ' / ' + Math.max(adh.daysLogged, 7) + ' Tage</b></div>' +
      '<div class="row"><span>Gewichtstrend</span><b>' + (wt ? ((wt.delta > 0 ? "+" : "") + wt.delta + " kg / Woche") : "INSUFFICIENT DATA") + '</b></div></div>' +
      '<div class="verdict v-' + esc(verdict.code) + '"><b>' + esc(verdict.title) + '</b><p>' + esc(verdict.text) + '</p>' +
      (verdict.newKcal ? '<button class="btn btn-primary btn-sm" id="npAccept" data-old="' + verdict.oldKcal + '" data-new="' + verdict.newKcal + '" data-code="' + esc(verdict.code) + '">Änderung übernehmen: ' + verdict.oldKcal + ' → ' + verdict.newKcal + ' kcal</button>' : '') + '</div>' + histHtml + '</div>';
  }

  /* =========================== WORKOUT =========================== */
  var woMinutes = null;   // Phase 6: gewählte Zeit-Kompression (null = wie geplant/Overlay)
  var woRpe = null;       // Phase 6: optionale Session-Bewertung
  function draftGet() { var d = MM.store.get("os_workout_draft", null); return (d && d.date === todayYmd()) ? d : null; }
  function draftSave(patch) {
    var d = draftGet() || { date: todayYmd(), startedAt: new Date().toISOString(), values: {} };
    Object.assign(d, patch || {});
    MM.store.set("os_workout_draft", d);
  }
  function draftClear() { MM.store.remove("os_workout_draft"); }
  function adaptedSession(psi) {
    // Overlay-Anpassung (Reise/kein Gym/Zeitbudget) + manuelle Kompression —
    // auf Basis der PLAN-abgeleiteten Session (psi), Original bleibt unberührt.
    var s = X.sessionForDay(todayYmd(), null, psi.session) || psi.session;
    if (woMinutes) { var c = X.compressSession(s, woMinutes); if (c) s = c; }
    return s;
  }
  function vWorkout() {
    var tp = MM.store.get("os_training_plan", null);
    if (!tp) return '<div class="card"><p class="muted">Noch kein Trainingsplan. <a href="#plan" style="color:var(--accent)">Im Plan erstellen →</a></p></div>';
    var psi = plannedSessionInfo(tp);
    var s = adaptedSession(psi);
    var logs = wlogs();
    var recLow = OS.recoveryLow();
    var mk = X.makeupForDate(todayYmd());
    var draft = draftGet();
    var est = s.estMin || X.estimateSessionMin(s);
    var head = mk && !psi.isToday
      ? '<p class="small" style="margin:0 0 10px;color:var(--accent)">Nachhol-Session (verpasste Einheit von ' + esc(fmtDateShort(mk.fromDate)) + ') — zählt für die Woche, die Vergangenheit bleibt ehrlich.</p>'
      : psi.programDay == null ? "" :
        psi.isToday ? '<p class="small" style="margin:0 0 10px">Heute ist Krafttag — geplant: <b>Session ' + esc(psi.session.key) + '</b> (' + psi.seq + '. Kraftslot deines Programms).</p>'
          : '<p class="small" style="margin:0 0 10px;color:var(--amber,#f5a623)">Heute ist laut Programm KEIN Krafttag (' + esc(PV ? PV.getTodayPrescription().title : "") + '). Unten steht deine nächste geplante Session (Tag ' + psi.programDay + ') — ein heute absolviertes Workout hakt den heutigen Programm-Tag NICHT ab.</p>';
    var chips = '<div class="os-wo-time">' + [["", "Voll"], ["45", "45 min"], ["30", "30 min"], ["15", "15 min"]].map(function (c) {
      var on = (woMinutes == null && c[0] === "") || String(woMinutes) === c[0];
      return '<button class="os-chip ' + (on ? "sel" : "") + '" data-womin="' + c[0] + '">' + c[1] + '</button>';
    }).join("") + '<span class="est">~' + est + ' min</span></div>';
    var subNote = s.substituted && s.substituted.length ? '<p class="small muted" style="margin:4px 0 8px">Equipment-Anpassung aktiv: ' + s.substituted.map(esc).join(" · ") + ' — Original-Historie bleibt unberührt.</p>' : '';
    var compNote = s.compressedTo ? '<p class="small muted" style="margin:4px 0 8px">' + esc(s.note || "") + '</p>' : '';
    var html = sec("Workout · " + esc(s.baseName || s.name),
      head + chips + subNote + compNote +
      (recLow ? '<p class="os-advisory">Recovery ist unten (Pulse/Kontext) — Progressionsziele sind heute bewusst konservativ.</p>' : '') +
      s.slots.map(function (sl) {
        var hist = (logs[sl.ex] || []);
        var last = hist.length ? hist[hist.length - 1] : null;
        var target = E.progressionPlan(hist, sl.reps, { recoveryLow: recLow });
        return '<div class="os-ex"><div class="hd"><b>' + esc(sl.name) + '</b><span>' + sl.sets + ' × ' + sl.reps[0] + '–' + sl.reps[1] + ' · RIR ' + sl.rir + '</span></div>' +
          (sl.note ? '<p class="small" style="color:var(--amber,#f5a623)">' + esc(sl.note) + '</p>' : '') +
          (last ? '<p class="last">Zuletzt: ' + last.sets.map(function (x) { return x.w + "×" + x.r; }).join(" · ") + '</p>' : '') +
          '<p class="tgt"><span class="os-target-ico" aria-hidden="true"></span>' + esc(target.text) + '</p>' +
          '<div class="sets">' + Array.from({ length: sl.sets }).map(function (_, si) {
            var dv = draft && draft.values && draft.values[sl.ex] && draft.values[sl.ex][si] || {};
            return '<span class="set"><input type="number" inputmode="decimal" placeholder="kg" value="' + (dv.w != null ? esc(dv.w) : "") + '" data-exw="' + sl.ex + '" data-set="' + si + '"><input type="number" inputmode="numeric" placeholder="Wdh" value="' + (dv.r != null ? esc(dv.r) : "") + '" data-exr="' + sl.ex + '" data-set="' + si + '"></span>';
          }).join("") + '</div>' +
          '<button class="os-resttimer" data-rest="' + (/min/.test(sl.rest) ? 150 : 90) + '">⏱ Pause ' + esc(sl.rest) + '</button></div>';
      }).join("") +
      '<div class="os-wo-rpe"><span class="os-k">Wie war die Session? (optional)</span><div class="ctl">' + [["easy", "Leichter als erwartet"], ["target", "Auf Ziel"], ["hard", "Hart"], ["stopped", "Früh abgebrochen"]].map(function (r) { return '<button class="os-chip" data-rpe="' + r[0] + '">' + r[1] + '</button>'; }).join("") + '</div></div>' +
      '<button id="woFinish" class="btn btn-primary" style="margin-top:14px" data-spid="' + esc(psi.spid) + '" data-pd="' + (psi.programDay || "") + '" data-skey="' + esc(s.key) + '" data-istoday="' + (psi.isToday ? "1" : "") + '">Workout abschließen ✓</button>' +
      '<div class="os-wo-alt"><button class="os-ghost" id="woLater">Später beenden (Sätze bleiben)</button>' + (woMinutes !== 15 ? '<button class="os-ghost" data-womin="15">Rest komprimieren → 15 min</button>' : '') + '</div>' +
      '<p class="small muted" style="margin-top:8px">' + (mk && !psi.isToday ? "Abschließen speichert deine Sätze UND hakt die Nachhol-Session ab — der verpasste Tag bleibt in der Historie verpasst." : psi.isToday ? "Abschließen speichert deine Sätze UND hakt den heutigen Programm-Tag ab — keine Doppel-Erfassung." : "Abschließen speichert deine Sätze. Der Programm-Tag wird nur an echten Krafttagen abgehakt.") + '</p>');
    return html;
  }

  /* =========================== TRACK =========================== */
  function vTrack() {
    var lw = OS.latestMetric("weight"), lwa = OS.latestMetric("waist");
    var wt = OS.metricTrend("weight", 7);
    var np = MM.store.get("os_nutrition_plan", null);
    var ft = OS.todayFoodTotals();
    var rx = PV && PV.available() ? PV.getTodayPrescription() : null;
    var html = sec("Track · dein Measurement Layer",
      '<div class="os-grid2"><label class="os-field"><span>Gewicht heute (kg)</span><input id="tkW" type="number" inputmode="decimal" placeholder="' + (lw ? lw.value : "—") + '"></label>' +
      '<label class="os-field"><span>Taille (cm)</span><input id="tkWa" type="number" inputmode="decimal" placeholder="' + (lwa ? lwa.value : "—") + '"></label></div>' +
      '<button id="tkSave" class="btn btn-primary btn-sm">Speichern</button>' +
      (wt ? '<p class="small muted" style="margin-top:10px">7-Tage-Trend Gewicht: ' + (wt.delta > 0 ? "+" : "") + wt.delta + ' kg (rollender Ø — Einzelmessungen sind Rauschen).</p>' : '') +
      '<div class="os-metriclist">' + OS.metricSeries("weight").slice(-7).reverse().map(function (m) { return '<div><span>' + m.date + '</span><b>' + m.value + ' ' + m.unit + '</b><i>' + m.source + '</i></div>'; }).join("") + '</div>');

    // §30 — Quick-Log Ernährung
    if (np) {
      html += sec("Food-Log heute" + (ft ? " · " + ft.p + " / " + np.protein + " g P · " + ft.kcal + " / " + np.kcal + " kcal" : ""),
        '<div class="os-quicklog">' + E.MEALS.filter(function (m) { return m.tags.indexOf("restaurant") < 0; }).slice(0, 6).map(function (m) { return '<button class="os-chip" data-eat="' + m.id + '">' + esc(m.name.split(" ")[0]) + ' (' + m.p + 'P)</button>'; }).join("") + '</div>' +
        '<div class="os-grid2" style="margin-top:10px"><label class="os-field"><span>Eigener Eintrag: kcal</span><input id="qlK" type="number" inputmode="numeric"></label><label class="os-field"><span>Protein (g)</span><input id="qlP" type="number" inputmode="numeric"></label></div>' +
        '<button id="qlSave" class="os-ghost">Eintrag loggen</button>' +
        '<div class="os-loglist">' + (OS.nutritionLog()[todayYmd()] || []).map(function (e) { return '<div><span>' + esc(e.name) + '</span><b>' + e.kcal + ' kcal · ' + e.p + ' g P</b><i>' + esc(e.source) + '</i></div>'; }).join("") + '</div>');
    }

    // §88 — Engine-Session loggen (schließt NUR Engine-Tage ab)
    html += sec("Engine-Session",
      (rx && rx.dayType === "engine" ? '<p class="small" style="margin:0 0 10px">Heute ist Engine-Tag: ' + esc(rx.purpose) + '</p>' : '<p class="small muted" style="margin:0 0 10px">Cardio zählt immer — einen Programm-Tag hakt es nur an echten Engine-Tagen ab.</p>') +
      '<div class="os-grid2"><label class="os-field"><span>Art</span><select id="enType"><option value="zone2">Zone 2 (Rad/Gehen/Rudern)</option><option value="intervals">Intervalle</option><option value="run">Lauf</option><option value="other">Andere</option></select></label>' +
      '<label class="os-field"><span>Dauer (min)</span><input id="enMin" type="number" inputmode="numeric" placeholder="35"></label></div>' +
      '<button id="enSave" class="btn btn-primary btn-sm">Engine-Session loggen</button>');

    // §89 — Recovery kurz
    html += sec("Recovery (kurz)",
      '<div class="os-grid2"><label class="os-field"><span>Schlaf letzte Nacht (h)</span><input id="rcSleep" type="number" inputmode="decimal" step="0.5" placeholder="7"></label>' +
      '<label class="os-field"><span>Energie (1–5)</span><select id="rcEnergy"><option>—</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></label></div>' +
      '<button id="rcSave" class="os-ghost">Speichern</button>' +
      '<p style="margin-top:14px"><a class="os-ghost" href="tracker.html">Vollständiger Tracker (Training · Cardio · Schlaf) →</a></p>');
    return html;
  }

  /* =========================== PROGRESS =========================== */
  function vProgress() {
    var d = MM.account.getDashboardState();
    var b = OS.baseline() || {};
    var w0 = OS.firstMetric("weight"), wN = OS.latestMetric("weight");
    var wa0 = OS.firstMetric("waist"), waN = OS.latestMetric("waist");
    var p = d.program || {};
    var trend = E.strengthTrend(exHistories());
    function row(l, a, bv, extra) { return '<div class="os-cmp-row"><span>' + esc(l) + '</span><b>' + esc(a != null ? a : "—") + '</b><i>→</i><b class="now">' + esc(bv != null ? bv : "—") + '</b>' + (extra || "") + '</div>'; }
    var interp = E.interpretProgress({
      weightDelta: (w0 && wN) ? wN.value - w0.value : null,
      waistDelta: (wa0 && waN) ? waN.value - wa0.value : null,
      strengthPct: trend ? trend.pct : null,
      executionPct: p.consistency != null ? p.consistency : null
    });
    var html = sec("Start → Jetzt",
      '<div class="os-cmp">' + row("Score", b.score || (d.hasScore ? "—" : null), d.hasScore ? d.score : "—") +
      row("Gewicht", w0 ? w0.value + " kg" : null, wN ? wN.value + " kg" : null, spark(OS.metricSeries("weight").slice(-14))) +
      row("Taille", wa0 ? wa0.value + " cm" : null, waN ? waN.value + " cm" : null, spark(OS.metricSeries("waist").slice(-14))) +
      row("Kraft (e1RM Ø)", trend ? "Basis" : "—", trend ? ((trend.pct > 0 ? "+" : "") + trend.pct + " %") : "INSUFFICIENT DATA") +
      row("Execution", "—", p.consistency != null ? p.consistency + " %" : "—") + '</div>' +
      (trend ? '<div class="os-liftlist">' + trend.lifts.map(function (l) { return '<div><span>' + esc(l.name) + '</span><b>' + l.first + ' → ' + l.last + ' kg e1RM</b><i class="' + (l.pct >= 0 ? "up" : "dn") + '">' + (l.pct > 0 ? "+" : "") + l.pct + ' %</i></div>'; }).join("") + '<p class="small muted">e1RM nach Epley: Last × (1 + Wdh/30) — dokumentierte Schätzformel, kein Test-Maximum.</p></div>' : '<p class="small muted">Kraft-Trend erscheint, sobald mindestens zwei geloggte Einheiten derselben Benchmark-Übung existieren.</p>') +
      '<div class="os-interp">' + interp.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join("") + '</div>');

    html += '<div class="card" id="osPhotoCmp"><span class="tag">FOTOS · WOCHE 0 vs. JETZT</span><div class="os-photocmp" id="osPhotoSlots"><p class="small muted">Prüfe Fotos…</p></div></div>';

    // §66/§67 — W12: Transformation Report + Next Cycle
    if (p.active && (p.week >= 12 || p.over)) {
      var rec = E.nextCycleRecommendation({ mode: d.mode, waistNow: waN ? waN.value : null, weightDelta: (w0 && wN) ? wN.value - w0.value : null, waistDelta: (wa0 && waN) ? waN.value - wa0.value : null, strengthPct: trend ? trend.pct : null, executionPct: p.consistency });
      html += sec("Transformation Report · Woche 12",
        '<div class="os-report">' +
        '<div class="rrow"><span>BODY</span><b>' + (w0 && wN ? (wN.value - w0.value > 0 ? "+" : "") + (wN.value - w0.value).toFixed(1) + " kg · " : "") + (wa0 && waN ? (waN.value - wa0.value > 0 ? "+" : "") + (waN.value - wa0.value).toFixed(1) + " cm Taille" : "Messdaten unvollständig") + '</b></div>' +
        '<div class="rrow"><span>PERFORMANCE</span><b>' + (trend ? "Kraft " + (trend.pct > 0 ? "+" : "") + trend.pct + " % (e1RM)" : "INSUFFICIENT DATA — keine Workout-Logs") + '</b></div>' +
        '<div class="rrow"><span>EXECUTION</span><b>' + (p.consistency != null ? p.consistency + " % Consistency" : "—") + '</b></div>' +
        '<div class="rrow"><span>NEXT MOVE</span><b>' + esc(MODE[rec.mode] || rec.mode) + (rec.repeatFoundation ? " (Fundament wiederholen)" : "") + '</b></div>' +
        '<p class="small" style="margin-top:8px">' + rec.why.map(esc).join(" ") + '</p>' +
        '<p class="small muted">Abschließen &amp; archivieren macht diesen Zyklus unveränderlich und öffnet den nächsten.</p>' +
        '<button class="btn btn-primary btn-sm" id="cycDone">Zyklus abschließen →</button></div>');
    }

    var arch = MM.store.get("c2_archive", []) || [];
    var hist = arch.map(function (a, i) { return '<div class="os-cycle"><b>Zyklus ' + (i + 1) + '</b><span>' + esc((MODE[a.goal] || a.goal || "—")) + '</span><i>abgeschlossen ' + esc(a.ended || "") + '</i></div>'; }).join("");
    if (p.active) hist += '<div class="os-cycle on"><b>Zyklus ' + (arch.length + 1) + '</b><span>' + esc(MODE[d.mode] || "") + '</span><i>aktiv · Woche ' + p.week + '</i></div>';
    if (hist) html += sec("Zyklus-Historie", '<div class="os-cycles">' + hist + '</div><p class="small muted">Historische Zyklen sind unveränderlich — sie sind deine Geschichte, nicht dein Arbeitsstand.</p>');
    if (MM.intelligence) html += '<a class="card os-row-cta" href="#timeline"><span class="tag">TIMELINE</span><b>Deine ganze Historie — Entscheidungen · Labs · Reviews</b></a>';
    return html;
  }
  function loadPhotoCompare() {
    var slot = document.getElementById("osPhotoSlots"); if (!slot) return;
    Promise.all([OS.photoStatus(0), OS.hasPhotos(12), OS.hasPhotos(8), OS.hasPhotos(4)]).then(function (h) {
      var st0 = h[0];
      var lastWeek = h[1] ? 12 : h[2] ? 8 : h[3] ? 4 : null;
      if (st0 === "none") { slot.innerHTML = '<p class="small muted">Keine Baseline-Fotos. Ohne Woche-0-Fotos gibt es keinen visuellen Vergleich — die Zahlen oben gelten trotzdem.</p>'; return; }
      if (st0 === "other_device") { slot.innerHTML = '<p class="small muted">Deine Woche-0-Fotos wurden auf einem anderen Gerät aufgenommen und bleiben bewusst dort (Fotos werden nie hochgeladen). Öffne Progress auf dem Gerät mit den Fotos — oder mache hier neue Checkpoint-Fotos.</p>'; return; }
      if (!lastWeek) { slot.innerHTML = '<p class="small muted">Woche-0-Fotos vorhanden ✓ — der Vergleich erscheint, sobald du Checkpoint-Fotos (W4/W8/W12) machst. <a href="#baseline" style="color:var(--accent)">Jetzt Fotos hinzufügen</a></p>'; return; }
      Promise.all(["front", "side", "back"].map(function (a) { return Promise.all([OS.getPhoto(0, a), OS.getPhoto(lastWeek, a)]); })).then(function (pairs) {
        slot.innerHTML = pairs.map(function (pr, i) {
          var a = ["FRONT", "SIDE", "BACK"][i];
          if (!pr[0] && !pr[1]) return "";
          return '<div class="pair"><span>' + a + '</span><div class="imgs">' + (pr[0] ? '<img src="' + URL.createObjectURL(pr[0]) + '" alt="Woche 0 ' + a + '">' : '') + (pr[1] ? '<img src="' + URL.createObjectURL(pr[1]) + '" alt="Woche ' + lastWeek + ' ' + a + '">' : '') + '</div></div>';
        }).join("");
      });
    });
  }

  /* =========================== LEARN =========================== */
  function vLearn() {
    var pw = OS.pathway();
    var html = "";
    if (MM.intelligence && MM.intelligence.knowledge) {
      try {
        var ln = MM.intelligence.knowledge.learnNow();
        html += sec("Lerne, was JETZT zählt", '<p class="small muted" style="margin:0 0 10px">Ausgewählt für deinen aktuellen Engpass: <b style="color:var(--text)">' + esc((MM.intelligence.LABELS.BN[ln.bottleneck] || ln.bottleneck)) + '</b>.</p>' +
          ln.items.map(function (it) {
            return '<div class="os-decision" style="margin:8px 0"><b>' + esc(it.title) + '</b><span class="s">' + esc(it.summary) + '</span>' + (it.action ? '<div class="ctl"><a class="os-chip" href="' + esc(it.action.link) + '">' + esc(it.action.label) + ' →</a></div>' : '') + '</div>';
          }).join(""));
      } catch (e) {}
    }
    html += sec("Learn · verstehe dein System",
      '<div class="os-learn-grid">' +
      '<a class="os-learn" href="ebooks/protokoll.html"><b>DAS PROTOKOLL</b><span>Das Referenzwerk — warum dein System funktioniert.</span></a>' +
      '<a class="os-learn" href="ebooks.html"><b>Library</b><span>Deep Dives: Body · Engine · Recovery · Hormone · Health.</span></a>' +
      '<a class="os-learn" href="labor.html"><b>MaleMetrix Labs</b><span>Deine Biologie über die Zeit — Werte werden zu Kontext.</span></a>' +
      '<a class="os-learn" href="blutwerte.html"><b>Blood &amp; Labs (Guide)</b><span>Die Biomarker, die für Männer zählen.</span></a>' +
      (MM.intelligence ? '<a class="os-learn" href="#protocol"><b>MY PROTOCOL</b><span>Dein Betriebshandbuch — dynamisch aus deinem echten Plan.</span></a>' : '') +
      '</div>');
    if (pw === "enhanced") {
      var F = E.ENHANCED_FRAMEWORK;
      html += sec("Enhanced Performance Center", '<p class="muted" style="margin:0 0 6px">Direkt, real-world, ohne Moralisieren — und ohne Rezeptgenerator.</p><p class="small muted" style="margin:0 0 14px">' + esc(F.boundary) + '</p>' +
        '<div class="os-enh">' + F.levels.map(function (l) {
          return '<div class="os-enh-level"><div class="hd"><b>' + esc(l.name) + '</b><span>Komplexität: ' + esc(l.complexity) + '</span></div>' +
            '<p><b>Ambition:</b> ' + esc(l.ambition) + '</p><p><b>Monitoring:</b> ' + esc(l.monitoring) + '</p><p><b>Trade-offs:</b> ' + esc(l.tradeoffs) + '</p><p class="und"><b>Unterschätzt:</b> ' + esc(l.underestimated) + '</p></div>';
        }).join("") + '</div>' +
        // §54 — Klassen-Education (aufklappbar, kein Dosierungs-Generator)
        '<h3 class="os-h3">Substanzklassen — was Männer real erwartet</h3>' +
        '<div class="os-classes">' + F.classes.map(function (c) {
          return '<details class="os-class"><summary><b>' + esc(c.name) + '</b></summary>' +
            '<p><b>Warum genutzt:</b> ' + esc(c.whyUse) + '</p><p><b>Was es verändert:</b> ' + esc(c.changes) + '</p>' +
            '<p><b>Erwartung:</b> ' + esc(c.expect) + '</p><p class="und"><b>Unterschätzt:</b> ' + esc(c.underestimate) + '</p>' +
            '<p><b>Monitoring:</b> ' + esc(c.monitor) + '</p><p><b>Typische Fehler:</b> ' + esc(c.failureModes) + '</p></details>';
        }).join("") + '</div>' +
        '<div class="os-matrix"><span class="tag">MONITORING-MATRIX</span><div class="mrows">' + F.monitoringMatrix.map(function (m) { return '<div class="mrow"><span>' + esc(m.domain) + '</span><b>' + m.items.map(esc).join(" · ") + '</b></div>'; }).join("") + '</div></div>' +
        '<div class="os-nobody"><span class="tag">EXIT</span><p>' + esc(F.exit) + '</p></div>' +
        '<a class="card os-row-cta" href="ebooks.html#advanced"><span class="tag">DEEP DIVE</span><b>Ultimate Stack — Muscle-Gain-Framework (Advanced Library)</b></a>' +
        '<a class="card os-row-cta" href="coaching.html#enhanced"><span class="tag">SUPPORT</span><b>Enhanced Performance Support — 1:1 Begleitung mit Monitoring</b></a>');
    } else if (pw === "health") {
      html += '<p class="small muted" style="margin-top:12px">Dein Pathway ist HEALTH — Enhanced-Inhalte werden dir bewusst nicht in den Weg gestellt. Du findest sie jederzeit über die Library, wenn du sie suchst.</p>';
    } else {
      html += nobody("Mehr Training ist nicht automatisch mehr Muskel. Die nützliche Frage ist: Wie viel produktives Training kannst du erholen UND steigern?");
    }
    return html;
  }

  /* ======================================================================
     INTELLIGENCE UI (Phase 5) — Coach-Hub, Advisor, Review, Twin, Simulator,
     Experimente, Protocol, Timeline, Memory. Sekundäre Navigation über den
     Coach-Hub — die Bottom-Nav bleibt bei 5 Einträgen.
     ====================================================================== */
  function INTEL() { return MM.intelligence; }
  var TONE_COL = { good: "var(--green,#3ddc84)", watch: "var(--amber,#f5a623)", alert: "#ff5470", neutral: "var(--muted)" };
  function confDot(level) { return '<span class="intel-conf intel-conf-' + esc(level) + '" title="Confidence: ' + esc(level) + '"><i></i><i></i><i></i></span>'; }
  function toneClass(t) { return "intel-tone-" + (t || "neutral"); }

  // DECISION CARD (§85): KEEP / CHANGE / WATCH / CHECK FIRST
  var DEC_LABEL = { keep: "KEEP", change: "CHANGE", watch: "WATCH", check: "CHECK FIRST" };
  var DEC_TONE = { keep: "good", change: "watch", watch: "neutral", check: "alert" };
  function decisionCard(dec, opts) {
    opts = opts || {};
    var p = dec.primary || dec;
    var type = p.type || "keep";
    var html = '<div class="intel-decision intel-tone-' + (DEC_TONE[type] || "neutral") + '">' +
      '<div class="hd"><span class="verdict">' + esc(DEC_LABEL[type] || type.toUpperCase()) + '</span>' + (dec.bottleneck ? '<span class="bn">Limiter: ' + esc((INTEL().LABELS.BN[dec.bottleneck.domain] || dec.bottleneck.domain)) + ' · ' + dec.bottleneck.confidencePct + '%</span>' : '') + '</div>' +
      '<b class="ttl">' + esc(p.title) + '</b>' +
      '<p class="rsn">' + esc(p.reason) + '</p>';
    if (p.evidence && p.evidence.length) html += '<div class="ev"><span>BASIEREND AUF</span>' + p.evidence.map(function (e) { return '<i>' + esc(e) + '</i>'; }).join("") + '</div>';
    if (dec.oneVariable) html += '<p class="onevar">↳ EINE Variable ändern — alles andere konstant halten.</p>';
    if (dec.notNow && dec.notNow.length) html += '<p class="notnow"><b>Not now:</b> ' + dec.notNow.map(esc).join(" · ") + '</p>';
    if (p.deepLink) html += '<a class="btn btn-primary btn-sm" href="' + esc(p.deepLink) + '">Ansehen →</a>';
    html += '</div>';
    return html;
  }
  // INSIGHT CARD (§86)
  function insightCard(tag, headline, rows) {
    return '<div class="intel-insight"><span class="tag">' + esc(tag) + '</span><b class="hl">' + esc(headline) + '</b>' +
      '<div class="rows">' + rows.map(function (r) { return '<div class="r"><span>' + esc(r.k) + '</span><b class="' + toneClass(r.tone) + '">' + esc(r.v) + '</b></div>'; }).join("") + '</div></div>';
  }

  /* ============ PHASE 7 — VISUAL INTELLIGENCE (ein Chart-System, §110) ============ */
  // Trajektorie: Erwartungsband (Modus) als Korridor + tatsächliche Gewichtsserie.
  // Ehrliche Achsen, keine Punkt-Prognose — Band statt Linie (§53/§94/§111).
  function svgTrajectory(ctx) {
    ctx = ctx || (MM.intelligence ? MM.intelligence.buildContext() : null);
    if (!ctx || !ctx.body.available) return "";
    var series = OS.metricSeries("weight").slice(-28);
    if (series.length < 5) return '<p class="small muted">Trajektorie erscheint ab ~5 Messpunkten.</p>';
    var band = MM.intelligence.foresight ? MM.intelligence.foresight.MODE_BAND[ctx.goal.mode] : null;
    var W = 320, H = 96, P = 6;
    var vals = series.map(function (m) { return m.value; });
    var w0 = vals[0];
    var days = series.length;
    var expLo = band ? w0 * (1 + band[0] / 100 * days / 7) : null;
    var expHi = band ? w0 * (1 + band[1] / 100 * days / 7) : null;
    var min = Math.min.apply(null, vals.concat(expLo != null ? [expLo] : [])) - 0.3;
    var max = Math.max.apply(null, vals.concat(expHi != null ? [expHi] : [])) + 0.3;
    function y(v) { return H - P - (v - min) / (max - min) * (H - 2 * P); }
    function x(i) { return P + i / (days - 1) * (W - 2 * P); }
    var bandPath = "";
    if (band) {
      var pts = [];
      for (var i = 0; i < days; i++) pts.push(x(i).toFixed(1) + "," + y(w0 * (1 + band[0] / 100 * i / 7)).toFixed(1));
      for (var j = days - 1; j >= 0; j--) pts.push(x(j).toFixed(1) + "," + y(w0 * (1 + band[1] / 100 * j / 7)).toFixed(1));
      bandPath = '<polygon points="' + pts.join(" ") + '" fill="rgba(0,194,255,0.10)" stroke="none"/>';
    }
    var line = series.map(function (m, i) { return x(i).toFixed(1) + "," + y(m.value).toFixed(1); }).join(" ");
    return '<svg class="mm-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gewichtsverlauf mit Erwartungskorridor (' + min.toFixed(1) + '–' + max.toFixed(1) + ' kg)">' + bandPath +
      '<polyline points="' + line + '" fill="none" stroke="var(--accent-2,#00c2ff)" stroke-width="1.6" vector-effect="non-scaling-stroke"/>' +
      '<text x="' + P + '" y="10" class="mm-chart-lbl">' + max.toFixed(1) + '</text><text x="' + P + '" y="' + (H - 2) + '" class="mm-chart-lbl">' + min.toFixed(1) + ' kg</text></svg>' +
      (band ? '<p class="small muted" style="margin:2px 0 0">Blaues Band = Erwartungskorridor ' + esc(ctx.goal.mode.toUpperCase()) + ' (' + band[0] + '…' + band[1] + ' %KG/Woche) · Linie = deine Messungen.</p>' : '');
  }
  // METRIX BODY (§92): Signatur-Visual im Koordinatensystem-Stil — sechs
  // tappbare System-Regionen, kein Fake-Diagnose-Scan.
  function svgMetrixBody(twin) {
    var st = {};
    (twin && twin.domains || []).forEach(function (d) { st[(d.key || d.label || "").toLowerCase()] = d; });
    function tone(k) { var d = st[k]; if (!d) return "off"; return d.confidence && d.confidence.level === "none" ? "off" : d.trend && d.trend.dir < 0 && (k === "recovery" || k === "execution") ? "warn" : "on"; }
    function node(cx, cy, k, label, link) {
      return '<a href="' + link + '" aria-label="' + esc(label) + '"><circle cx="' + cx + '" cy="' + cy + '" r="11" class="mb-node mb-' + tone(k) + '"/><text x="' + (cx + 16) + '" y="' + (cy + 4) + '" class="mb-lbl">' + esc(label) + '</text></a>';
    }
    return '<div class="mm-metrixbody"><svg viewBox="0 0 320 240" role="img" aria-label="Metrix Body — Systemübersicht">' +
      '<line x1="60" y1="20" x2="60" y2="220" class="mb-axis"/><line x1="20" y1="120" x2="300" y2="120" class="mb-axis"/>' +
      '<path d="M60,36 C78,36 84,52 84,66 C84,84 72,92 72,104 L72,150 C72,178 66,196 62,214 M60,36 C42,36 36,52 36,66 C36,84 48,92 48,104 L48,150 C48,178 54,196 58,214" class="mb-silhouette"/>' +
      '<circle cx="60" cy="26" r="10" class="mb-silhouette"/>' +
      node(140, 44, "body", "BODY · Körper", "#track") +
      node(140, 78, "engine", "ENGINE · Cardio", "#track") +
      node(140, 112, "recovery", "RECOVERY · Schlaf", "#experiments") +
      node(140, 146, "metabolic", "METABOLIC · Nutrition/Glukose", "#plan") +
      node(140, 180, "hormonal", "HORMONAL · Labs", "labor.html") +
      node(140, 214, "execution", "EXECUTION · Umsetzung", "#week") +
      '</svg></div>';
  }

  /* =========================== COACH HUB =========================== */
  function vCoach() {
    if (!INTEL() || !INTEL().buildContext) return '<div class="card"><p class="muted">Intelligence lädt…</p></div>';
    var I = INTEL(); var ctx = I.buildContext();
    var dec = I.decision.decide(ctx);
    var depth = I.twin.personalizationDepth();
    var html = '<div class="intel-hero"><span class="tag">PERSONAL PERFORMANCE INTELLIGENCE</span>' +
      '<h1 class="os-big">Was solltest du als Nächstes tun — und warum?</h1>' +
      '<p class="muted" style="margin:2px 0 0">Dein System liest, was du tust, was sich verändert und was gerade limitiert — und entscheidet begründet.</p></div>';

    // PRIMARY DECISION
    html += '<section class="os-sec"><h2 class="os-h2">Deine Entscheidung jetzt</h2>' + decisionCard(dec) + '</section>';

    // Contradictions
    var contras = I.decision.contradictions(ctx);
    if (contras.length) {
      html += '<section class="os-sec"><h2 class="os-h2">Dein System zieht in verschiedene Richtungen</h2>' +
        contras.map(function (c) { return '<div class="intel-contra intel-sev-' + esc(c.severity) + '"><b>' + esc(c.title) + '</b><p>' + esc(c.text) + '</p></div>'; }).join("") + '</section>';
    }

    // Ask MaleMetrix teaser
    html += '<a class="card os-row-cta intel-ask-cta" href="#advisor"><span class="tag">ASK MALEMETRIX</span><b>Frag dein System — gegroundet in deinen echten Daten</b><span class="s">Warum stagniere ich? · Soll ich mehr essen? · Was ändern meine Labs?</span></a>';

    // Module grid
    html += '<section class="os-sec"><h2 class="os-h2">Intelligence-Module</h2><div class="intel-grid">' +
      module("#review", "WEEKLY REVIEW", "Wochen-Synthese + Verdict", I.review.reviewDue(ctx) ? "fällig" : "") +
      module("#twin", "DIGITAL TWIN", "Dein Modell über die Zeit", depth.pct + "% Reife") +
      module("#simulator", "WHAT IF?", "Szenarien vergleichen", "") +
      module("#experiments", "EXPERIMENTE", "Kontrolliert optimieren", (I.experiments.active().length ? "1 aktiv" : "")) +
      module("#protocol", "MY PROTOCOL", "Dein Betriebshandbuch", "") +
      module("#timeline", "TIMELINE", "Deine Historie", "") +
      '</div></section>';

    // Personalization depth (§123)
    html += '<div class="card intel-depth"><span class="os-k">MaleMetrix kennt dich zu</span><div class="bar"><span style="width:' + depth.pct + '%"></span></div><b>' + depth.pct + '%</b>' +
      (depth.missingHighValue.length ? '<p class="small muted" style="margin:8px 0 0">Größter Hebel für bessere Personalisierung: ' + depth.missingHighValue.map(esc).join(", ") + '</p>' : '') + '</div>';
    return html;
  }
  function module(href, title, sub, badge) {
    return '<a class="intel-module" href="' + href + '"><div class="hd"><b>' + esc(title) + '</b>' + (badge ? '<span class="badge">' + esc(badge) + '</span>' : '') + '</div><span>' + esc(sub) + '</span></a>';
  }

  /* =========================== ADVISOR =========================== */
  function vAdvisor() {
    if (!INTEL() || !INTEL().advisor) return '<div class="card"><p class="muted">Advisor lädt…</p></div>';
    var I = INTEL();
    var ctx = I.buildContext();
    var suggestions = I.advisor.suggestedQuestions(ctx);
    var lastQ = MM.store.get("intel_last_q", "");
    var html = '<div class="intel-back"><a href="#coach">← Coach</a></div>';
    html += '<section class="os-sec"><span class="tag">ASK MALEMETRIX</span><h1 class="os-big" style="font-size:1.6rem">Frag dein System.</h1>' +
      '<p class="muted" style="margin:0 0 14px">Antworten sind in DEINEN Daten gegroundet — kein generischer Chat. Kurz zuerst, Details ausklappbar.</p>' +
      '<div class="intel-ask"><input id="advQ" type="text" placeholder="z. B. Warum stagniert mein Gewicht?" value="' + esc(lastQ) + '" autocomplete="off"><button id="advGo" class="btn btn-primary">Fragen</button></div>' +
      '<div class="intel-suggest">' + suggestions.map(function (q) { return '<button class="os-chip" data-advq="' + esc(q) + '">' + esc(q) + '</button>'; }).join("") + '</div>' +
      '<div id="advOut">' + (lastQ ? renderAdvisorAnswer(I.advisor.answer(lastQ, ctx)) : "") + '</div></section>';
    return html;
  }
  function renderAdvisorAnswer(a) {
    function block(label, items, cls) { if (!items || !items.length) return ""; return '<div class="ans-block ' + (cls || "") + '"><span>' + esc(label) + '</span><ul>' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul></div>'; }
    var html = '<div class="intel-answer ' + (a.unsure ? "unsure" : "") + '">' +
      '<div class="ans-main"><span class="tag">ANTWORT</span><b>' + esc(a.answer) + '</b></div>' +
      block("Was ich sehe", a.whatISee) +
      block("Was es wahrscheinlich bedeutet", a.whatItMeans) +
      block("Was ich als Nächstes täte", a.whatIdDo, "do") +
      block("Was NICHT ändern", a.whatNotToChange, "nochange") +
      (a.reassess ? '<div class="ans-block"><span>Wann neu bewerten</span><p>' + esc(a.reassess) + '</p></div>' : '') +
      (a.basedOn && a.basedOn.length ? '<div class="ans-based"><span>BASIEREND AUF</span>' + a.basedOn.map(function (e) { return '<i>' + esc(e) + '</i>'; }).join("") + '</div>' : '') +
      (a.boundaryNote ? '<p class="ans-boundary">' + esc(a.boundaryNote) + '</p>' : '') +
      '</div>';
    return html;
  }

  /* =========================== WEEKLY REVIEW =========================== */
  function vReview() {
    if (!INTEL() || !INTEL().review) return '<div class="card"><p class="muted">Review lädt…</p></div>';
    var I = INTEL(); var ctx = I.buildContext();
    var rev = I.review.generate(ctx);
    var eva = I.review.expectedVsActual(ctx);
    var html = '<div class="intel-back"><a href="#coach">← Coach</a></div>';
    html += '<section class="os-sec"><span class="tag">WEEKLY INTELLIGENCE REVIEW</span>' +
      '<h1 class="os-big" style="font-size:1.6rem">Woche ' + (rev.week || "—") + '</h1>' +
      '<div class="intel-revconf">' + confDot(rev.confidence.level) + '<span>' + esc(rev.confidence.level.toUpperCase()) + ' CONFIDENCE · ' + esc(rev.confidence.factors.join(" · ")) + '</span></div></section>';
    // Sections
    html += '<div class="intel-revsections">' + rev.sections.map(function (s) { return '<div class="intel-revsec ' + toneClass(s.tone) + '"><span>' + esc(s.label) + '</span><b>' + esc(s.value) + '</b></div>'; }).join("") + '</div>';
    // Expected vs Actual — the wow moment (§174)
    if (eva.actual != null) {
      var statusLabel = { ahead: "VORAUS", within: "IM ERWARTUNGSBAND", behind: "HINTER PLAN" };
      html += '<div class="intel-eva"><span class="tag">ERWARTET vs. TATSÄCHLICH</span>' +
        '<div class="eva-bar"><span class="band" style="left:0;right:0"></span><span class="actual ' + toneClass(eva.status === "behind" ? "watch" : "good") + '"></span></div>' +
        '<div class="eva-rows"><div><span>Erwartet (kg/Wo)</span><b>' + eva.expected[0] + " … " + eva.expected[1] + '</b></div><div><span>Tatsächlich</span><b>' + (eva.actual > 0 ? "+" : "") + eva.actual + '</b></div><div><span>Status</span><b>' + esc(statusLabel[eva.status] || "—") + '</b></div></div></div>';
    }
    // Verdict decision card
    html += '<section class="os-sec"><h2 class="os-h2">Verdict</h2>' +
      decisionCard({ primary: { type: rev.decisionType, title: rev.decisionTitle || rev.verdict, reason: rev.decisionReason, evidence: rev.evidence, deepLink: null }, bottleneck: { domain: rev.bottleneck, confidencePct: rev.bottleneckConfidence }, oneVariable: rev.decisionType === "change" }) + '</section>';
    // Primary focus + do not change
    html += '<div class="intel-focus"><div class="fbox"><span class="os-k">PRIMÄRER FOKUS</span><b>' + esc(rev.primaryFocus) + '</b></div>' +
      (rev.doNotChange.length ? '<div class="fbox"><span class="os-k">NICHT ÄNDERN</span><b>' + rev.doNotChange.map(esc).join(" · ") + '</b></div>' : '') +
      '<div class="fbox"><span class="os-k">NÄCHSTER REVIEW</span><b>in ' + rev.reviewInDays + ' Tagen</b></div></div>';
    // History
    html += '<div class="card"><span class="os-k">Trajektorie · erwartet vs. tatsächlich</span>' + svgTrajectory(ctx) + '</div>';
    var hist = I.review.reviews().filter(function (r) { return r.week !== rev.week; });
    if (hist.length) html += '<section class="os-sec"><h2 class="os-h2">Frühere Reviews</h2><div class="intel-revhist">' + hist.slice(-6).reverse().map(function (r) { return '<div class="rh"><b>W' + r.week + '</b><span>' + esc(r.verdict) + '</span><i>' + esc(r.primaryFocus) + '</i></div>'; }).join("") + '</div><p class="small muted">Historische Reviews sind unveränderlich — sie ändern sich nicht mit neuen Daten.</p></section>';
    return html;
  }

  /* =========================== DIGITAL TWIN =========================== */
  function vTwin() {
    if (!INTEL() || !INTEL().twin) return '<div class="card"><p class="muted">Twin lädt…</p></div>';
    var I = INTEL(); var ctx = I.buildContext();
    var twin = I.twin.build(ctx);
    var depth = I.twin.personalizationDepth(twin);
    var html = '<div class="intel-back"><a href="#coach">← Coach</a></div>';
    html += '<section class="os-sec"><span class="tag">DIGITAL TWIN</span><h1 class="os-big" style="font-size:1.5rem">Dein Modell, über die Zeit.</h1>' +
      '<p class="muted" style="margin:0 0 6px">Je Domäne: Zustand, Trend, wie sicher MaleMetrix ist — und was es NICHT weiß.</p></section>';
    html += svgMetrixBody(twin);
    html += '<div class="card"><span class="os-k">Trajektorie · erwartet vs. tatsächlich</span>' + svgTrajectory(ctx) + '</div>';
    html += '<div class="intel-twin">' + twin.domains.map(function (d) {
      var arrow = d.trend.dir > 0 ? "↑" : d.trend.dir < 0 ? "↓" : "→";
      return '<div class="intel-tdom"><div class="hd"><b>' + esc(d.label) + '</b>' + confDot(d.confidence.level) + '</div>' +
        '<div class="st">' + esc(d.state) + '</div>' +
        '<div class="tr"><span class="arr ' + (d.trend.dir > 0 ? "up" : d.trend.dir < 0 ? "down" : "") + '">' + arrow + '</span>' + esc(d.trend.text) + '</div>' +
        '<div class="meta"><span class="cpl"><i style="width:' + d.dataCompleteness.pct + '%"></i></span><span class="cl">' + esc(d.confidence.reason) + '</span></div>' + '</div>';
    }).join("") + '</div>';
    html += '<div class="card intel-depth"><span class="os-k">Datenreife gesamt</span><div class="bar"><span style="width:' + depth.pct + '%"></span></div><b>' + depth.pct + '%</b>' +
      (depth.lowConfidenceDomains.length ? '<p class="small muted" style="margin:8px 0 0">Dünne Datenlage: ' + depth.lowConfidenceDomains.map(esc).join(", ") + '</p>' : '') + '</div>';
    return html;
  }

  /* =========================== SIMULATOR =========================== */
  function vSimulator() {
    if (!INTEL() || !INTEL().simulator) return '<div class="card"><p class="muted">Simulator lädt…</p></div>';
    var I = INTEL(); var ctx = I.buildContext();
    var key = hashParam("s") || "calories_plus";
    var scenarios = I.simulator.listScenarios();
    var sim = I.simulator.simulate(key, {}, ctx);
    var html = '<div class="intel-back"><a href="#coach">← Coach</a></div>';
    html += '<section class="os-sec"><span class="tag">WHAT IF?</span><h1 class="os-big" style="font-size:1.5rem">Szenarien vergleichen.</h1>' +
      '<p class="muted" style="margin:0 0 12px">Kein Zukunftsversprechen — Richtung, Zeit-Spanne, Trade-offs und was wahr sein müsste.</p>' +
      '<div class="intel-scenpick">' + scenarios.map(function (s) { return '<button class="os-chip ' + (s.key === key ? "sel" : "") + '" data-scen="' + s.key + '">' + esc(s.label) + '</button>'; }).join("") + '</div></section>';
    if (sim) {
      html += '<div class="intel-sim">' +
        '<div class="intel-simcol current"><span class="lbl">AKTUELLER PFAD</span><b>' + esc(sim.current.label) + '</b><p>' + esc(sim.current.direction) + '</p></div>' +
        sim.options.map(function (o) {
          return '<div class="intel-simcol"><span class="lbl">OPTION</span><b>' + esc(o.label) + '</b><p class="dir">' + esc(o.direction) + '</p>' +
            '<div class="tr"><span>Zeit</span>' + esc(o.timeRange) + '</div>' +
            (o.tradeoffs.length ? '<ul class="to">' + o.tradeoffs.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join("") + '</ul>' : '') +
            '<div class="cf"><span>Confidence</span> ' + confDot(o.confidence) + '</div>' +
            (o.needsTrue.length ? '<div class="nt"><span>Müsste wahr sein</span>' + o.needsTrue.map(function (n) { return '<i>' + esc(n) + '</i>'; }).join("") + '</div>' : '') + '</div>';
        }).join("") + '</div>';
      if (sim.note) html += '<div class="os-nobody"><p>' + esc(sim.note) + '</p></div>';
      // §23 SIMULATOR → EXECUTION: Szenario wird Vorschlag, nie stille Mutation.
      if (key === 'calories_plus') html += '<div class="intel-simact"><button class="btn btn-primary btn-sm" data-simpropose="calories_plus">Als Vorschlag übernehmen (+~175 kcal) →</button><span class="small muted">Erst nach deiner Bestätigung: Ziel ändert sich, Entscheidung wird im Ledger dokumentiert, Review in 14 Tagen.</span></div>';
      html += '<div class="intel-assume"><span class="os-k">Annahmen</span>' + sim.assumptions.map(function (a) { return '<span class="' + (a.holds ? "hold" : "broken") + '">' + esc(a.text) + (a.holds ? " ✓" : " ✗") + '</span>'; }).join("") + '<p class="small muted" style="margin:6px 0 0">Fällt eine Annahme, sinkt die Verlässlichkeit der Szenarien.</p></div>';
      if (key === "calories_plus" && I.foresight) {
        var prh = I.foresight.personalResponse("nutrition");
        if (prh) html += '<div class="card"><span class="tag">DEINE HISTORIE</span><p class="small" style="margin:6px 0 0">' + esc(prh.summary) + '</p><p class="small muted" style="margin:4px 0 0">Konfidenz: ' + (prh.n >= 2 ? "MODERAT" : "NIEDRIG") + ' — wird mit jeder bewerteten Entscheidung stärker.</p></div>';
      }
    }
    return html;
  }

  /* =========================== EXPERIMENTS =========================== */
  function vExperiments() {
    if (!INTEL() || !INTEL().experiments) return '<div class="card"><p class="muted">Experimente laden…</p></div>';
    var I = INTEL(); var ctx = I.buildContext();
    var X = I.experiments;
    var active = X.active();
    var html = '<div class="intel-back"><a href="#coach">← Coach</a></div>';
    html += '<section class="os-sec"><span class="tag">EXPERIMENTE</span><h1 class="os-big" style="font-size:1.5rem">Kontrolliert optimieren.</h1>' +
      '<p class="muted" style="margin:0 0 6px">Eine Variable, klare Hypothese, feste Dauer. So lernst du, was bei DIR wirkt.</p></section>';
    if (active.length) {
      var e = active[0];
      var due = X.dueForReview().length > 0;
      html += '<div class="intel-expactive"><span class="tag">LÄUFT</span><b>' + esc(e.title) + '</b>' +
        '<div class="exgrid"><div><span>Hypothese</span><p>' + esc(e.hypothesis) + '</p></div><div><span>Änderung</span><p>' + esc(e.change) + '</p></div>' +
        '<div><span>Primär</span><p>' + esc(e.primary) + '</p></div><div><span>Konstant halten</span><p>' + e.keepConstant.map(esc).join(", ") + '</p></div></div>' +
        '<p class="small muted">Start ' + esc(e.startDate) + ' · Ende ' + esc(e.endDate) + '</p>' +
        (due ? '<button class="btn btn-primary btn-sm" data-expeval="' + esc(e.id) + '">Jetzt auswerten →</button>' : '<p class="small muted">Läuft noch — kein vorzeitiges Urteil.</p>') + '</div>';
    } else {
      html += '<section class="os-sec"><h2 class="os-h2">Experiment starten</h2><div class="intel-exptpl">' +
        X.templates().map(function (t) {
          var prior = X.priorAttempts(t.key).length;
          return '<div class="intel-tpl"><div class="hd"><b>' + esc(t.title) + '</b><span>' + t.durationDays + ' Tage</span></div><p>' + esc(t.change) + '</p><span class="pr">Primär: ' + esc(t.primary) + '</span>' +
            (prior ? '<span class="prior">schon ' + prior + '× getestet</span>' : '') +
            '<button class="os-ghost os-ghost-sm" data-expstart="' + esc(t.key) + '">Starten</button></div>';
        }).join("") + '</div><p class="small muted">Immer nur EIN Experiment gleichzeitig — sonst weißt du nicht, was gewirkt hat.</p></section>';
    }
    var hist = X.history();
    if (hist.length) html += '<section class="os-sec"><h2 class="os-h2">Abgeschlossen</h2><div class="intel-exphist">' + hist.slice(-6).reverse().map(function (e) { return '<div class="eh"><b>' + esc(e.title) + '</b><span class="v v-' + (e.result ? esc(e.result.verdict.replace(/\s/g, "_").toLowerCase()) : "") + '">' + esc(e.result ? e.result.verdict : "—") + '</span></div>'; }).join("") + '</div></section>';
    return html;
  }

  /* =========================== PROTOCOL =========================== */
  function vProtocol() {
    if (!INTEL() || !INTEL().protocol) return '<div class="card"><p class="muted">Protokoll lädt…</p></div>';
    var I = INTEL(); var ctx = I.buildContext();
    var p = I.protocol.current(ctx);
    var html = '<div class="intel-back"><a href="#coach">← Coach</a></div>';
    html += '<section class="os-sec"><span class="tag">MY PROTOCOL · v' + p.version + '</span><h1 class="os-big" style="font-size:1.5rem">Dein Betriebshandbuch.</h1>' +
      '<p class="muted" style="margin:0 0 6px">Dynamisch aus deinem echten Plan — nicht das allgemeine Protokoll, sondern deins.</p></section>';
    if (p.changedFrom && p.changedFrom.length) html += '<div class="intel-protochange"><span class="tag">GEÄNDERT SEIT v' + (p.version - 1) + '</span>' + p.changedFrom.map(function (c) { return '<p>' + esc(c.label) + ': <s>' + esc(c.from) + '</s> → <b>' + esc(c.to) + '</b></p>'; }).join("") + '</div>';
    html += '<div class="intel-proto">' + p.sections.map(function (s) { return '<div class="intel-psec"><span class="os-k">' + esc(s.label) + '</span><b>' + esc(s.value) + '</b>' + (s.detail ? '<i>' + esc(s.detail) + '</i>' : '') + '</div>'; }).join("") + '</div>';
    html += '<section class="os-sec"><h2 class="os-h2">Meine Regeln</h2><ul class="intel-rules">' + p.rules.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join("") + '</ul></section>';
    html += '<p class="small muted">Nächster Review: ' + esc(p.nextReview) + ' · Version steigt automatisch, wenn sich dein Plan ändert.</p>';
    return html;
  }

  /* =========================== TIMELINE =========================== */
  function vTimeline() {
    if (!INTEL() || !INTEL().timeline) return '<div class="card"><p class="muted">Timeline lädt…</p></div>';
    var I = INTEL(); var ctx = I.buildContext();
    var events = I.timeline.build(ctx);
    var TYPE_LABEL = { score: "SCORE", program_start: "PROGRAMM", lab_panel: "LABS", decision: "ENTSCHEIDUNG", experiment: "EXPERIMENT", review: "REVIEW", pr: "PR", mode_change: "MODUS" };
    var html = '<div class="intel-back"><a href="#coach">← Coach</a></div>';
    html += '<section class="os-sec"><span class="tag">TIMELINE</span><h1 class="os-big" style="font-size:1.5rem">Deine Historie.</h1>' +
      '<p class="muted" style="margin:0 0 12px">Score, Programm, Labs, Entscheidungen, Experimente, Reviews — an einem Ort.</p></section>';
    if (!events.length) { html += '<div class="card"><p class="muted">Noch keine Ereignisse — sie sammeln sich, während du das System nutzt.</p></div>'; return html; }
    html += '<div class="intel-timeline">' + events.map(function (e) {
      return '<div class="intel-tlrow"><span class="d">' + esc(e.date.slice(2)) + '</span><span class="ty ty-' + esc(e.type) + '">' + esc(TYPE_LABEL[e.type] || e.type) + '</span><div class="c"><b>' + esc(e.title) + '</b>' + (e.summary ? '<span>' + esc(e.summary) + '</span>' : '') + '</div></div>';
    }).join("") + '</div>';
    return html;
  }

  /* =========================== MEMORY CENTER =========================== */
  function vMemory() {
    if (!INTEL() || !INTEL().memory) return '<div class="card"><p class="muted">Memory lädt…</p></div>';
    var I = INTEL(); var mc = I.memory.centerView();
    var html = '<div class="intel-back"><a href="#coach">← Coach</a></div>';
    html += '<section class="os-sec"><span class="tag">WAS MALEMETRIX ÜBER MICH WEISS</span><h1 class="os-big" style="font-size:1.5rem">Memory Center.</h1>' +
      '<p class="muted" style="margin:0 0 12px">Strukturierte Fakten — kein Chatverlauf. Du kannst alles einsehen und löschen.</p></section>';
    if (mc.goal) html += '<div class="card"><span class="os-k">Ziel</span><b style="display:block;color:#fff;margin-top:4px">' + esc(mc.goal.text) + '</b></div>';
    if (mc.constraints.length) html += '<div class="card"><span class="os-k">Randbedingungen</span>' + mc.constraints.map(function (c) { return '<div class="intel-memrow"><span>' + esc(c.text) + '</span><button class="lab-del" data-memforget="' + esc(c.id) + '">×</button></div>'; }).join("") + '</div>';
    if (mc.responses.length) html += '<section class="os-sec"><h2 class="os-h2">Beobachtete Reaktionen</h2>' + mc.responses.map(function (r) { var iv = r.intervention || {}, ob = r.observed || {}; return '<div class="intel-resp"><b>' + esc(iv.change || iv.domain || "Intervention") + '</b><span>→ ' + (ob.weightDelta != null ? "Gewicht " + (ob.weightDelta > 0 ? "+" : "") + ob.weightDelta + " kg" : "") + (ob.waistDelta != null ? " · Taille " + (ob.waistDelta > 0 ? "+" : "") + ob.waistDelta + " cm" : "") + (ob.strengthPct != null ? " · Kraft " + (ob.strengthPct > 0 ? "+" : "") + ob.strengthPct + "%" : "") + '</span><i>beobachtet, keine bewiesene Ursache</i></div>'; }).join("") + '</section>';
    if (mc.decisions.length) html += '<section class="os-sec"><h2 class="os-h2">Entscheidungs-Ledger</h2>' + mc.decisions.map(function (d) { return '<div class="intel-ledrow"><span class="d">' + esc(d.date.slice(2)) + '</span><div><b>' + esc(d.title) + '</b><span>' + esc(d.reason) + '</span></div><i class="st st-' + esc(d.status) + '">' + esc(d.status) + '</i></div>'; }).join("") + '</section>';
    html += '<p class="small muted">Insgesamt: ' + mc.counts.memories + ' Fakten · ' + mc.counts.decisions + ' Entscheidungen · ' + mc.counts.responses + ' Reaktionen. Export/Löschung über Today → Konto &amp; Daten.</p>';
    return html;
  }


  /* =========================== SHEETS (Phase 6: My Day Changed · Eat Now · Quick Capture) =========================== */
  var dcState = { key: null, params: {} };
  var dcProposal = null;
  function openSheet(inner) {
    var el = document.getElementById("osSheet");
    if (!el) { el = document.createElement("div"); el.id = "osSheet"; el.className = "os-sheet"; host.appendChild(el); }
    el.innerHTML = '<div class="os-sheet-bg" data-sheetclose></div><div class="os-sheet-body">' + inner + '<button class="os-sheet-x" data-sheetclose aria-label="Schließen">×</button></div>';
    el.hidden = false;
  }
  function closeSheet() { var el = document.getElementById("osSheet"); if (el) { el.hidden = true; el.innerHTML = ""; } dcProposal = null; }
  function sheetDayChanged() {
    dcState = { key: null, params: {} };
    openSheet('<span class="tag">MEIN TAG HAT SICH GEÄNDERT</span><p class="small muted" style="margin:6px 0 12px">Ein Tap — MaleMetrix rechnet den Tag neu. Der Basisplan bleibt unangetastet.</p>' +
      X.dayChangedOptions().map(function (o) { return '<button class="os-sheet-opt" data-dcopt="' + o.key + '">' + esc(o.label) + '</button>'; }).join(""));
  }
  function dcStep(key) {
    dcState = { key: key, params: {} };
    if (key === "less_time") {
      openSheet('<span class="tag">WIE VIEL ZEIT HAST DU?</span><div class="os-sheet-chips">' + [15, 30, 45].map(function (m) { return '<button class="os-chip" data-dcmin="' + m + '">' + m + ' min</button>'; }).join("") + '</div>');
      return;
    }
    if (key === "traveling") {
      openSheet('<span class="tag">WIE LANGE BIST DU WEG?</span><div class="os-sheet-chips">' + [2, 4, 7].map(function (d) { return '<button class="os-chip" data-dcdays="' + d + '">' + d + ' Tage</button>'; }).join("") + '</div>');
      return;
    }
    if (key === "no_gym") { dcAskLocation("no_gym"); return; }
    dcPropose(key, {});
  }
  function dcAskLocation(key) {
    dcState.key = key;
    openSheet('<span class="tag">WAS HAST DU ZUR VERFÜGUNG?</span><div class="os-sheet-chips">' +
      '<button class="os-chip" data-dcloc="hotel_gym">Hotel-Gym</button><button class="os-chip" data-dcloc="home_db">Kurzhanteln</button><button class="os-chip" data-dcloc="home_none">Nur Körpergewicht</button></div>');
  }
  function dcPropose(key, params) {
    var p = X.proposeDayChange(key, params);
    if (!p) { closeSheet(); return; }
    dcProposal = p;
    if (key === "missed" && p.repair && p.repair.options.length) {
      openSheet('<span class="tag">' + esc(p.title) + '</span>' +
        p.repair.options.map(function (o, i) {
          return '<button class="os-sheet-opt" data-repairpick="' + esc(o.date) + '" data-repairmissed="' + p.repair.missedPd + '"><b>' + (i === 0 ? "BESTE OPTION · " : "") + esc(o.wd) + ' ' + esc(fmtDateShort(o.date)) + '</b><span>' + esc(o.why) + (o.tradeoff ? ' · ' + esc(o.tradeoff) : '') + '</span></button>';
        }).join("") +
        '<button class="os-sheet-opt ghost" data-repairskip="' + p.repair.missedPd + '"><b>Diese Woche auslassen</b><span>Auch okay. Das Programm bestraft nicht.</span></button>');
      return;
    }
    openSheet('<span class="tag">' + esc(p.title) + '</span>' +
      '<div class="os-sheet-lines">' + p.lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join("") + '</div>' +
      (p.apply ? '<button class="btn btn-primary btn-sm" data-dcapply>Übernehmen ✓</button>' : '<button class="btn btn-primary btn-sm" data-sheetclose>Alles klar</button>'));
  }
  function sheetRepair(missedPd) {
    var opts = X.repairOptions(missedPd);
    openSheet('<span class="tag">VERPASSTE EINHEIT NACHHOLEN</span>' +
      (opts.length ? opts.map(function (o, i) {
        return '<button class="os-sheet-opt" data-repairpick="' + esc(o.date) + '" data-repairmissed="' + missedPd + '"><b>' + (i === 0 ? "BESTE OPTION · " : "") + esc(o.wd) + ' ' + esc(fmtDateShort(o.date)) + '</b><span>' + esc(o.why) + (o.tradeoff ? ' · ' + esc(o.tradeoff) : '') + '</span></button>';
      }).join("") : '<p class="muted">Diese Woche ist voll. Auslassen ist die ehrliche Option.</p>') +
      '<button class="os-sheet-opt ghost" data-repairskip="' + missedPd + '"><b>Auslassen</b><span>Kein Nachtragen. Weiter im Plan.</span></button>');
  }
  function sheetEatNow(where) {
    var res = X.eatNow({ where: where });
    var ctxChips = '<div class="os-sheet-chips ctx">' + Object.keys(X.FOOD_CONTEXT).map(function (k) { return '<button class="os-chip ' + (k === where ? "sel" : "") + '" data-eatctx="' + k + '">' + esc(X.FOOD_CONTEXT[k]) + '</button>'; }).join("") + '</div>';
    var remLine = res.remaining && res.remaining.target ? '<p class="small muted" style="margin:4px 0 10px">Noch offen: ' + res.remaining.protein + ' g Protein · ' + res.remaining.kcal + ' kcal</p>' : "";
    var opts = res.strategy
      ? res.options.map(function (o) { return '<div class="os-sheet-opt static"><b>' + esc(o.name) + '</b><span>' + esc(o.detail) + '</span></div>'; }).join("")
      : res.options.map(function (m) { return '<button class="os-sheet-opt" data-eatlog="' + esc(m.name) + '" data-p="' + m.p + '" data-kcal="' + m.kcal + '"><b>' + esc(m.name) + '</b><span>' + m.kcal + ' kcal · ' + m.p + ' g Protein · ' + m.min + ' min</span></button>'; }).join("");
    openSheet('<span class="tag">WAS KANN ICH JETZT ESSEN?</span>' + remLine + ctxChips + opts +
      '<div class="os-sheet-manual"><input id="qcP" type="number" inputmode="numeric" placeholder="Protein g"><input id="qcKcal" type="number" inputmode="numeric" placeholder="kcal (optional)"><button class="os-ghost" data-eatmanual>Loggen</button></div>');
  }
  function sheetQuickCapture() {
    openSheet('<span class="tag">SCHNELL ERFASSEN</span>' +
      '<div class="os-sheet-manual"><input id="qcW" type="number" inputmode="decimal" placeholder="Gewicht kg"><button class="os-ghost" data-qcweight>Speichern</button></div>' +
      '<button class="os-sheet-opt" data-eatnow><b>Mahlzeit loggen</b><span>Aus Vorschlägen oder manuell</span></button>' +
      '<button class="os-sheet-opt" data-daychanged><b>Kontext ändern</b><span>Reise · weniger Zeit · kein Gym · …</span></button>');
  }

  /* ---- Advisor: Frage stellen (deterministischer Kern, Provider-Seam) ---- */
  function askAdvisor(q) {
    q = (q || "").trim(); if (!q || !MM.intelligence) return;
    MM.store.set("intel_last_q", q);
    var out = document.getElementById("advOut");
    var inp = document.getElementById("advQ"); if (inp) inp.value = q;
    var ans = MM.intelligence.advisor.answer(q);
    if (out) out.innerHTML = renderAdvisorAnswer(ans);
    if (MM.track) MM.track("advisor_ask", {});
  }

  /* ---- Rest-Timer (optional, ein Timer gleichzeitig) ---- */
  var restIv = null;
  function startRestTimer(btn) {
    if (restIv) { clearInterval(restIv); restIv = null; }
    var left = parseInt(btn.getAttribute("data-rest"), 10) || 90;
    var orig = btn.textContent;
    btn.classList.add("run");
    restIv = setInterval(function () {
      left--;
      if (left <= 0) {
        clearInterval(restIv); restIv = null;
        btn.textContent = "✓ Weiter geht's"; btn.classList.remove("run");
        try { if (navigator.vibrate) navigator.vibrate(200); } catch (e) {}
        setTimeout(function () { btn.textContent = orig; }, 4000);
        return;
      }
      btn.textContent = "⏱ " + Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
    }, 1000);
  }

  /* =========================== SIGN-IN / SKELETON (Bestand) =========================== */
  function skeleton() { host.innerHTML = '<div class="card" style="max-width:640px;margin:40px auto;text-align:center;color:var(--muted)">My MaleMetrix wird geladen…</div>'; }
  function signInScreen() {
    host.innerHTML = '<div class="section-head center" style="margin-top:24px"><span class="eyebrow">My MaleMetrix</span><h1 class="h-display" style="font-size:2rem">Willkommen zurück</h1><p class="lead">Melde dich mit deiner E-Mail an — wir schicken dir einen Magic Link, kein Passwort nötig.</p></div>' +
      '<div class="card" style="max-width:420px;margin:0 auto"><label class="small" style="display:block;margin-bottom:6px;color:var(--muted)">E-Mail</label><input id="mmEmail" type="email" inputmode="email" autocomplete="email" placeholder="du@beispiel.de" style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:1rem;background:rgba(127,127,127,0.06);color:var(--text);margin-bottom:12px"><button id="mmGo" class="btn btn-primary btn-block">Weiter →</button><p id="mmAuthMsg" class="small" style="margin-top:12px;display:none"></p></div>';
    var em = document.getElementById("mmEmail"), go = document.getElementById("mmGo"), m = document.getElementById("mmAuthMsg");
    function submit() { var v = (em.value || "").trim(); if (!/.+@.+\..+/.test(v)) { em.focus(); return; } go.disabled = true; go.textContent = "Sende…"; MM.account.signIn(v).then(function (res) { m.style.display = "block"; m.style.color = res.ok ? "var(--green,#3ddc84)" : "var(--amber,#f5a623)"; m.textContent = res.message || (res.ok ? "Magic Link gesendet." : "Fehler."); go.disabled = false; go.textContent = "Weiter →"; if (res.ok && MM.track) MM.track("login_started", {}); }); }
    go.addEventListener("click", submit); em.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
  }

  /* =========================== RENDER + EVENTS =========================== */
  function render() {
    var snap = MM.account.snapshot();
    if (snap.state === "loading") { skeleton(); return; }
    if (snap.configured && snap.state === "signed_out") { signInScreen(); return; }
    OS.ensureCycle();   // Zyklus-Zustandsmaschine bei jedem Render konsistent halten
    var v = view();
    var body = v === "plan" ? vPlan() : v === "track" ? vTrack() : v === "progress" ? vProgress() : v === "learn" ? vLearn() : v === "baseline" ? vBaseline() : v === "pathway" ? vPathway() : v === "transform" ? vTransform() : v === "workout" ? vWorkout() : v === "week" ? vWeek() : v === "settings" ? vSettings() :
      v === "coach" ? vCoach() : v === "advisor" ? vAdvisor() : v === "review" ? vReview() : v === "twin" ? vTwin() : v === "simulator" ? vSimulator() : v === "experiments" ? vExperiments() : v === "protocol" ? vProtocol() : v === "timeline" ? vTimeline() : v === "memory" ? vMemory() : vToday(snap);
    var fab = (v !== "workout" && v !== "settings" && snap.state !== "signed_out") ? '<button class="os-fab" data-fab aria-label="Schnell erfassen">+</button>' : "";
    host.innerHTML = '<div class="os-shell os-env-' + (v === "progress" || v === "workout" ? "performance" : v === "plan" ? "metabolic" : v === "learn" && OS.pathway() === "enhanced" ? "clinical" : "instrument") + '">' + navBar(v) + '<div class="os-body">' + body + '</div>' + fab + '</div>';
    if (v === "progress") loadPhotoCompare();
    bindOnce();
  }

  var _bound = false;
  function bindOnce() {
    if (_bound) return; _bound = true;
    host.addEventListener("click", function (e) {
      var t = e.target;
      var out = t.closest("#mmOut"); if (out) { MM.account.signOut(); return; }
      var imp = t.closest("#mmImport"); if (imp) { imp.disabled = true; imp.textContent = "Übernehme…"; MM.account.importLocalData().then(function (r) { var m = document.getElementById("mmImportMsg"); if (m) { m.style.display = "block"; m.textContent = r.ok ? "Vollständig übernommen. Deine lokalen Daten bleiben als Backup." : ((r.status && r.status.state === "partial") ? "Teilweise übernommen — bitte erneut versuchen." : (r.message || "Fehlgeschlagen — bitte erneut versuchen.")); } setTimeout(render, 900); }); return; }
      var cb = t.closest("#mmClaimBtn"); if (cb) { var val = (document.getElementById("mmClaim") || {}).value; var m2 = document.getElementById("mmClaimMsg"); cb.disabled = true; MM.account.claimAccessCode(val).then(function (r) { if (m2) { m2.style.display = "block"; m2.style.color = r.ok ? "var(--green,#3ddc84)" : "var(--amber,#f5a623)"; m2.textContent = r.ok ? "Zugang aktiviert." : (r.message || "Code nicht erkannt."); } cb.disabled = false; if (r.ok) { if (MM.track) MM.track("claim_access", {}); setTimeout(render, 700); } }); return; }
      var ex = t.closest("#mmExport"); if (ex) { MM.account.exportMyData().then(function (data) { var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "my-malemetrix-export.json"; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); }); return; }
      var del = t.closest("#mmDelete"); if (del) {
        if (!confirm("Konto endgültig löschen? Alle Cloud-Daten werden entfernt. Das kann nicht rückgängig gemacht werden.")) return;
        if (!confirm("Wirklich sicher? Letzte Bestätigung.")) return;
        del.disabled = true;
        MM.account.requestAccountDeletion().then(function (r) { var m3 = document.getElementById("mmAcctMsg"); if (r.ok) { if (confirm("Konto gelöscht. Auch die lokalen MaleMetrix-Daten auf DIESEM Gerät entfernen?")) MM.account.clearLocalData(); location.reload(); } else if (m3) { m3.style.display = "block"; m3.textContent = r.message || "Löschung derzeit nicht verfügbar."; del.disabled = false; } });
        return;
      }
      var pw = t.closest("[data-pathway]"); if (pw) { OS.setPathway(pw.getAttribute("data-pathway")); if (MM.track) MM.track("pathway_selected", { p: pw.getAttribute("data-pathway") }); location.hash = "#today"; render(); return; }
      var done = t.closest("[data-osdone]"); if (done) { OS.completeAction(done.getAttribute("data-osdone")); render(); return; }
      var ctx = t.closest("[data-ctx]"); if (ctx) { OS.setContextMode(ctx.getAttribute("data-ctx")); render(); return; }
      var rsc = t.closest("[data-resched]"); if (rsc) { var pr = rsc.getAttribute("data-resched").split(":"); if (OS.applyReschedule(parseInt(pr[0], 10), parseInt(pr[1], 10))) { if (MM.toast) MM.toast("Krafttag verschoben — Kalender/Plan aktualisiert."); } render(); return; }
      var ph = t.closest(".os-photo"); if (ph && !t.closest("input")) { var fi = ph.querySelector("input[type=file]"); if (fi) fi.click(); return; }
      if (t.closest("#blSave")) { saveBaselineFromForm(); return; }
      if (t.closest("#txGo")) { runTransform(); return; }
      if (t.closest("#txReset")) { MM.store.remove("os_transformation"); render(); return; }
      if (t.closest("#npCreate")) { createNutritionPlan(); return; }
      if (t.closest("#npUseDay")) { useThisDay(); return; }
      var eat = t.closest("[data-eat]"); if (eat) { var meal = E.mealById(eat.getAttribute("data-eat")); if (meal) { OS.logFood({ name: meal.name, kcal: meal.kcal, p: meal.p, c: meal.c, f: meal.f, source: "meal-plan" }); if (MM.toast) MM.toast("Geloggt: " + meal.name + " (" + meal.p + " g P)"); render(); } return; }
      var sw = t.closest("[data-swap]"); if (sw) { doSwap(sw.getAttribute("data-swap"), sw.getAttribute("data-want")); return; }
      if (t.closest("#npShop")) { var nd2 = currentMealDay(); var ids = nd2 ? nd2.current : E.exampleDay(MM.store.get("os_nutrition_plan", null), {}).meals.map(function (m) { return m.id; }); var list = E.shoppingList(ids); var out = document.getElementById("npShopOut"); if (out) out.innerHTML = '<div class="os-shoplist">' + Object.keys(list).map(function (c) { return list[c].length ? '<div><span>' + c.toUpperCase() + '</span>' + list[c].map(function (i) { return '<label><input type="checkbox"> ' + esc(i) + '</label>'; }).join("") + '</div>' : ''; }).join("") + '</div>'; return; }
      var acc = t.closest("#npAccept"); if (acc) { acceptAdjustment(acc); return; }
      if (t.closest("#tpCreate")) { createTrainingPlan(); return; }
      if (t.closest("#tpReset")) { MM.store.remove("os_training_plan"); render(); return; }
      var bud = t.closest("[data-budget]"); if (bud) { var stx = MM.store.get("os_stack", {}) || {}; stx.budget = bud.getAttribute("data-budget"); delete stx.budgetEuro; MM.store.set("os_stack", stx); render(); return; }
      if (t.closest("#stEuroGo")) { var eu = parseInt((document.getElementById("stEuro") || {}).value, 10); var sty = MM.store.get("os_stack", {}) || {}; if (eu > 0) sty.budgetEuro = eu; else delete sty.budgetEuro; MM.store.set("os_stack", sty); render(); return; }
      if (t.closest("#stSave")) { saveStack(); return; }
      if (t.closest("#woFinish")) { finishWorkout(t.closest("#woFinish")); return; }
      if (t.closest("#qlSave")) { var qk = parseFloat((document.getElementById("qlK") || {}).value), qp = parseFloat((document.getElementById("qlP") || {}).value); if (qk || qp) { OS.logFood({ name: "Eigener Eintrag", kcal: qk || 0, p: qp || 0, source: "quick" }); if (MM.toast) MM.toast("Geloggt."); render(); } return; }
      if (t.closest("#enSave")) { saveEngine(); return; }
      if (t.closest("#rcSave")) { var sh = parseFloat((document.getElementById("rcSleep") || {}).value); var en = parseInt((document.getElementById("rcEnergy") || {}).value, 10); var any = false; if (sh) { OS.logMetric("sleep", sh, "h"); any = true; } if (en) { OS.logMetric("energy", en, "/5"); any = true; } if (any) { if (MM.toast) MM.toast("Recovery gespeichert."); render(); } return; }
      if (t.closest("#cycDone")) { OS.completeCycle(); if (MM.toast) MM.toast("Zyklus abgeschlossen — er ist jetzt Teil deiner Historie."); render(); return; }
      if (t.closest("#tkSave")) { var w = parseFloat((document.getElementById("tkW") || {}).value); var wa = parseFloat((document.getElementById("tkWa") || {}).value); var okAny = false; if (w) { OS.logMetric("weight", w, "kg"); okAny = true; } if (wa) { OS.logMetric("waist", wa, "cm"); okAny = true; } if (okAny) { if (MM.toast) MM.toast("Gespeichert."); render(); } return; }
      if (t.closest("#icsGo")) {
        var tm = (document.getElementById("icsTime") || {}).value || "18:00"; OS.setP("calendar.trainTime", tm);
        // Week-Planner exportiert die Phase-6-Termine (nur echte Appointments);
        // Plan exportiert die Tagestyp-Woche (Phase-3.1-Verhalten).
        var ics = view() === "week" ? X.icsCalendar(14) : OS.icsForNextDays(7, tm);
        if (!ics) { if (MM.toast) MM.toast("Keine anstehenden Termine — Kalender wäre leer, also gibt es keinen."); return; }
        var bl = new Blob([ics], { type: "text/calendar" }); var aa = document.createElement("a"); aa.href = URL.createObjectURL(bl); aa.download = "malemetrix-training.ics"; aa.click(); return;
      }

      /* ---- Phase 6: Sheets & Execution ---- */
      if (t.closest("[data-sheetclose]")) { closeSheet(); return; }
      if (t.closest("[data-daychanged]")) { sheetDayChanged(); return; }
      var dcOpt = t.closest("[data-dcopt]"); if (dcOpt) { dcStep(dcOpt.getAttribute("data-dcopt")); return; }
      var dcMin = t.closest("[data-dcmin]"); if (dcMin) { dcPropose("less_time", { minutes: parseInt(dcMin.getAttribute("data-dcmin"), 10) }); return; }
      var dcDays = t.closest("[data-dcdays]"); if (dcDays) { dcState.params.days = parseInt(dcDays.getAttribute("data-dcdays"), 10); dcAskLocation("traveling"); return; }
      var dcLoc = t.closest("[data-dcloc]"); if (dcLoc) { dcState.params.location = dcLoc.getAttribute("data-dcloc"); dcPropose(dcState.key, dcState.params); return; }
      if (t.closest("[data-dcapply]")) { if (dcProposal && dcProposal.apply) dcProposal.apply(); closeSheet(); if (MM.toast) MM.toast("Heute ist angepasst. Der Basisplan bleibt unverändert."); render(); return; }
      var rp = t.closest("[data-repair]"); if (rp) { sheetRepair(parseInt(rp.getAttribute("data-repair"), 10)); return; }
      var rpk = t.closest("[data-repairpick]"); if (rpk) { X.applyReschedule(parseInt(rpk.getAttribute("data-repairmissed"), 10), rpk.getAttribute("data-repairpick"), "repair"); closeSheet(); if (MM.toast) MM.toast("Eingeplant. Kalender & Erinnerungen ziehen mit."); render(); return; }
      var rsk = t.closest("[data-repairskip]"); if (rsk) { X.skipMissed(parseInt(rsk.getAttribute("data-repairskip"), 10)); closeSheet(); if (MM.toast) MM.toast("Okay — ausgelassen. Kein Nachtragen, kein Drama."); render(); return; }
      if (t.closest("[data-eatnow]")) { sheetEatNow("home"); return; }
      var ec = t.closest("[data-eatctx]"); if (ec) { sheetEatNow(ec.getAttribute("data-eatctx")); return; }
      var el2 = t.closest("[data-eatlog]"); if (el2) { X.logFood(parseFloat(el2.getAttribute("data-p")), parseFloat(el2.getAttribute("data-kcal")), el2.getAttribute("data-eatlog")); closeSheet(); if (MM.toast) MM.toast("Geloggt — Rest des Tages ist aktualisiert."); render(); return; }
      if (t.closest("[data-eatmanual]")) { var mp = parseFloat((document.getElementById("qcP") || {}).value); var mk2 = parseFloat((document.getElementById("qcKcal") || {}).value); if (!isNaN(mp)) { X.logFood(mp, isNaN(mk2) ? 0 : mk2, "Manuell"); closeSheet(); if (MM.toast) MM.toast("Geloggt."); render(); } return; }
      if (t.closest("[data-closeday]")) { X.closeDay(); render(); return; }
      var eo = t.closest("[data-endoverlay]"); if (eo) { X.endOverlay(eo.getAttribute("data-endoverlay")); if (MM.toast) MM.toast("Zurück zum Basisplan."); render(); return; }
      var ai = t.closest("[data-ackinsight]"); if (ai) { X.ackInsight(ai.getAttribute("data-ackinsight")); render(); return; }
      var dc2 = t.closest("[data-decclose]"); if (dc2) { X.closeDecision(dc2.getAttribute("data-decclose"), dc2.getAttribute("data-outcome")); if (MM.toast) MM.toast("Entscheidung geschlossen — Ledger aktualisiert."); render(); return; }
      if (t.closest("[data-decreview]")) { var dEl = host.querySelector(".os-decision"); if (dEl) dEl.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
      var cb2 = t.closest("[data-comeback]"); if (cb2) {
        var ck = cb2.getAttribute("data-comeback"); X.ackComeback();
        if (ck === "light") { X.startOverlay({ mode: "busy", start: todayYmd(), end: todayYmd(), reason: "comeback", mods: { minutes: 30 } }); if (MM.toast) MM.toast("Sanfter Wiedereinstieg: 30-Minuten-Version heute."); }
        if (ck === "pause") { location.href = "kurs-programm.html"; return; }
        render(); return;
      }
      var wn = t.closest("[data-weeknav]"); if (wn && !wn.disabled) { weekOffset = Math.max(0, weekOffset + parseInt(wn.getAttribute("data-weeknav"), 10)); render(); return; }
      var wm = t.closest("[data-womin]"); if (wm) { var v0 = wm.getAttribute("data-womin"); woMinutes = v0 === "" ? null : parseInt(v0, 10); render(); return; }
      var rpe = t.closest("[data-rpe]"); if (rpe) { woRpe = rpe.getAttribute("data-rpe"); host.querySelectorAll("[data-rpe]").forEach(function (b) { b.classList.toggle("sel", b === rpe); }); return; }
      if (t.closest("#woLater")) { if (MM.toast) MM.toast("Gespeichert — du kannst jederzeit weitermachen."); location.hash = "#today"; render(); return; }
      var rt = t.closest("[data-rest]"); if (rt) { startRestTimer(rt); return; }
      if (t.closest("[data-fab]")) { sheetQuickCapture(); return; }
      if (t.closest("[data-qcweight]")) { var qw = parseFloat((document.getElementById("qcW") || {}).value); if (!isNaN(qw)) { OS.logMetric("weight", qw, "kg"); closeSheet(); if (MM.toast) MM.toast("Gewicht gespeichert."); render(); } return; }
      if (t.closest("#rmPerm")) { X.requestNotifyPermission().then(function () { render(); }); return; }

      /* ---------- INTELLIGENCE (Phase 5) ---------- */
      var advq = t.closest("[data-advq]"); if (advq) { askAdvisor(advq.getAttribute("data-advq")); return; }
      if (t.closest("#advGo")) { var qq = (document.getElementById("advQ") || {}).value; askAdvisor(qq); return; }
      var scen = t.closest("[data-scen]"); if (scen) { location.hash = "#simulator?s=" + scen.getAttribute("data-scen"); render(); return; }
      var expS = t.closest("[data-expstart]"); if (expS && MM.intelligence) { var resE = MM.intelligence.experiments.start(expS.getAttribute("data-expstart")); if (MM.toast) MM.toast(resE.ok ? "Experiment gestartet — erscheint in Today." : "Bereits ein Experiment aktiv."); render(); return; }
      var expE = t.closest("[data-expeval]"); if (expE && MM.intelligence) { MM.intelligence.experiments.evaluate(expE.getAttribute("data-expeval")); if (MM.toast) MM.toast("Experiment ausgewertet — Ergebnis in der Historie."); render(); return; }
      var memF = t.closest("[data-memforget]"); if (memF && MM.intelligence) { MM.intelligence.memory.forget(memF.getAttribute("data-memforget")); render(); return; }
      if (t.closest("[data-apweek]") && MM.intelligence && MM.intelligence.foresight) {
        var ap2 = MM.intelligence.foresight.weekAutopilot();
        if (ap2) { var res2 = MM.intelligence.foresight.applyWeek(ap2); if (MM.toast) MM.toast(res2.applied ? "Woche übernommen ✓ — " + res2.applied + " Anpassung(en). Kalender & Erinnerungen ziehen mit." : "Nichts anzupassen — Woche steht."); }
        render(); return;
      }
      if (t.closest("#calClear")) { X.clearBusy(); if (MM.toast) MM.toast("Belegte Fenster gelöscht."); render(); return; }

      /* PROPOSAL-FLOW (§21/§22): Intelligence schlägt vor → Nutzer bestätigt →
         Execution wendet an → Ledger dokumentiert → Review terminiert. */
      var pap = t.closest("[data-propapply]"); if (pap) {
        var dayP = X.buildDay();
        if (dayP.proposal) { X.applyProposal(dayP.proposal); if (MM.toast) MM.toast("Übernommen ✓ — Entscheidung im Ledger, Review in " + dayP.proposal.reviewInDays + " Tagen."); }
        render(); return;
      }
      var pdm = t.closest("[data-propdismiss]"); if (pdm) { X.dismissProposal(pdm.getAttribute("data-propdismiss")); if (MM.toast) MM.toast("Okay — Vorschlag pausiert (7 Tage)."); render(); return; }
      var simP = t.closest("[data-simpropose]"); if (simP && MM.intelligence) {
        var np9 = MM.store.get("os_nutrition_plan", null);
        if (!np9) { if (MM.toast) MM.toast("Erst einen Nutrition-Plan erstellen (Plan-Tab)."); return; }
        X.applyProposal({ key: "nutrition:sim_calories_plus", domain: "nutrition", type: "change", code: "adjust_up", title: "+~175 kcal (Simulator-Szenario)", reason: "Aus dem What-If-Szenario übernommen — eine Variable, Review in 14 Tagen.", evidence: ["Simulator: Mehr essen (+kcal)"], reviewInDays: 14 });
        if (MM.toast) MM.toast("Übernommen ✓ — neues Ziel aktiv, Review in 14 Tagen."); location.hash = "#today"; render(); return;
      }
    });
    host.addEventListener("change", function (e) {
      var ci = e.target.closest("#calIcs");
      if (ci && ci.files && ci.files[0]) {
        ci.files[0].text().then(function (txt) { var n = X.importBusyICS(txt); if (MM.toast) MM.toast(n ? n + " belegte Fenster importiert — Termintitel wurden verworfen." : "Keine verwertbaren Termine im Import-Fenster (nächste 21 Tage)."); render(); });
        return;
      }
      var fi = e.target.closest("[data-photoin]");
      if (fi && fi.files && fi.files[0]) {
        var angle = fi.getAttribute("data-photoin");
        var d = MM.account.getDashboardState(); var p = d.program || {};
        var week = (!p.active || p.notStarted) ? 0 : (p.week >= 12 ? 12 : p.week >= 8 ? 8 : p.week >= 4 ? 4 : 0);
        OS.savePhoto(week, angle, fi.files[0]).then(function () { var st = document.getElementById("ph_" + angle); if (st) st.textContent = "✓ gespeichert (W" + week + ")"; });
        return;
      }
      /* ---- Phase 6 Settings: sofort persistieren, kein Save-Button nötig ---- */
      var id = e.target.id;
      if (id === "rmEnabled") { X.setReminderPrefs({ enabled: e.target.checked }); render(); return; }
      if (id === "rmQuietFrom") { X.setReminderPrefs({ quietFrom: e.target.value }); return; }
      if (id === "rmQuietTo") { X.setReminderPrefs({ quietTo: e.target.value }); return; }
      if (id === "rmPrivacy") { X.setReminderPrefs({ privacy: e.target.value }); return; }
      if (id === "stTrainTime") { OS.setP("calendar.trainTime", e.target.value); return; }
      if (id === "stBedtime") { OS.setP("recovery.bedtime", e.target.value); return; }
      if (id === "stSteps") { var sv = parseInt(e.target.value, 10); if (sv > 0) OS.setP("lifestyle.stepTarget", sv); return; }
      if (id === "stWeighWd") { OS.setP("lifestyle.weighWeekday", parseInt(e.target.value, 10)); return; }
      if (id === "stDensity") { OS.setP("ui.density", e.target.value); return; }
      if (id === "stMinimum") { OS.setP("lifestyle.minimumMode", e.target.checked); return; }
      if (id === "stAutomation") { OS.setP("ui.automation", e.target.value); return; }
    });
    /* ---- Phase 6: Workout-Draft — jeder Satz sofort auf Gerät gesichert (Resume ohne Verlust) ---- */
    host.addEventListener("input", function (e) {
      if (!e.target.closest("[data-exw],[data-exr]")) return;
      var values = {};
      host.querySelectorAll("[data-exw]").forEach(function (inp) {
        var ex = inp.getAttribute("data-exw"), si = inp.getAttribute("data-set");
        values[ex] = values[ex] || {}; values[ex][si] = values[ex][si] || {};
        if (inp.value !== "") values[ex][si].w = parseFloat(inp.value);
      });
      host.querySelectorAll("[data-exr]").forEach(function (inp) {
        var ex = inp.getAttribute("data-exr"), si = inp.getAttribute("data-set");
        values[ex] = values[ex] || {}; values[ex][si] = values[ex][si] || {};
        if (inp.value !== "") values[ex][si].r = parseInt(inp.value, 10);
      });
      draftSave({ values: values });
    });
    // §61/§62 — Live-Refresh bei OS-Events (Score/Recheck/…): kein Reload nötig.
    document.addEventListener("mm:os", function (e) {
      var n = e.detail && e.detail.name;
      if (n === "SCORE_COMPLETED" || n === "RECHECK_COMPLETED") { OS.prefillFromScore(); render(); }
    });
  }

  function saveBaselineFromForm() {
    function num(id) { var el = document.getElementById(id); var v = el ? parseFloat(el.value) : NaN; return isNaN(v) ? null : v; }
    function txt(id) { var el = document.getElementById(id); return el ? el.value : ""; }
    var data = { weight: num("blW"), waist: num("blWa"), bf: num("blBf"), sleep: num("blSleep"), bench: txt("blBench"), squat: txt("blSquat"), stackText: txt("blStack") };
    var d = MM.account.getDashboardState(); if (d.hasScore) data.score = d.score;
    OS.saveBaseline(data);
    if (data.sleep) OS.setP("recovery.sleepHours", data.sleep);
    if (data.stackText) OS.setP("stack.currentText", data.stackText);
    if (MM.toast) MM.toast("Baseline gespeichert.");
    location.hash = "#today"; render();
  }
  function runTransform() {
    function num(id) { var el = document.getElementById(id); var v = el ? parseFloat(el.value) : NaN; return isNaN(v) ? null : v; }
    var w = num("txW") || (OS.latestMetric("weight") || {}).value;
    if (!w) { if (MM.toast) MM.toast("Aktuelles Gewicht fehlt."); return; }
    if (num("txW") && !OS.latestMetric("weight")) OS.logMetric("weight", num("txW"), "kg");
    var input = { weightKg: w, bfPct: num("txBf"), heightCm: OS.getP("identity.height", 180), experience: (document.getElementById("txExp") || {}).value || "novice", targetWeightKg: num("txTW") || w, targetLeanness: (document.getElementById("txLean") || {}).value || "leaner", months: num("txM") || 12, pathway: OS.pathway() };
    var result = E.transformation(input);
    MM.store.set("os_transformation", { input: input, result: result, created: todayYmd() });
    OS.setP("training.experience", input.experience);
    render();
  }
  function createNutritionPlan() {
    var d = MM.account.getDashboardState();
    var w = (OS.latestMetric("weight") || {}).value || parseFloat((document.getElementById("npW") || {}).value);
    var h = OS.getP("identity.height", null) || parseFloat((document.getElementById("npH") || {}).value);
    if (!w || !h) { if (MM.toast) MM.toast("Gewicht + Größe werden gebraucht."); return; }
    if (!OS.latestMetric("weight")) OS.logMetric("weight", w, "kg");
    if (!OS.getP("identity.height", null)) OS.setP("identity.height", h);
    var occ = (document.getElementById("npOcc") || {}).value || OS.getP("lifestyle.occupation", "sitting");
    var steps = parseInt((document.getElementById("npSteps") || {}).value, 10) || OS.getP("lifestyle.stepTarget", 7000);
    OS.setP("lifestyle.occupation", occ);
    var daysArr = MM.store.get("c2_days", null);
    var trainDays = Array.isArray(daysArr) ? daysArr.length : OS.getP("training.daysPerWeek", 3);
    var t = E.nutritionTargets({ weightKg: w, heightCm: h, age: OS.getP("identity.age", 35), mode: d.mode || "recomp", activity: { trainDays: trainDays, stepsPerDay: steps, occupation: occ } });
    MM.store.set("os_nutrition_plan", t);
    render();
  }
  function useThisDay() {
    var np = MM.store.get("os_nutrition_plan", null); if (!np) return;
    var day = E.exampleDay(np, { maxCookMin: OS.getP("nutrition.cookMinutes", 40) });
    MM.store.set("os_nutrition_days", { current: day.meals.map(function (m) { return m.id; }), saved: todayYmd() });
    if (MM.toast) MM.toast("Tag gespeichert — ab jetzt swappst und loggst du DIESEN Plan.");
    render();
  }
  function doSwap(mealId, want) {
    var nd = currentMealDay();
    var alt = E.swapMeal(mealId, want, nd ? nd.current : []);
    if (!alt) { if (MM.toast) MM.toast("Keine passende Alternative gefunden."); return; }
    if (nd) {
      var idx = nd.current.indexOf(mealId);
      if (idx >= 0) { nd.current[idx] = alt.id; MM.store.set("os_nutrition_days", nd); }
      if (MM.toast) MM.toast("Getauscht: " + alt.name + " (" + (alt.delta.kcal >= 0 ? "+" : "") + alt.delta.kcal + " kcal · " + (alt.delta.p >= 0 ? "+" : "") + alt.delta.p + " g P)");
      render();
    } else {
      if (MM.toast) MM.toast("Alternative: " + alt.name + " (" + (alt.delta.kcal >= 0 ? "+" : "") + alt.delta.kcal + " kcal · " + (alt.delta.p >= 0 ? "+" : "") + alt.delta.p + " g P). Mit „Diesen Tag verwenden“ wird der Plan swappbar.");
    }
  }
  function acceptAdjustment(btn) {
    var np = MM.store.get("os_nutrition_plan", null); if (!np) return;
    var oldK = parseInt(btn.getAttribute("data-old"), 10), newK = parseInt(btn.getAttribute("data-new"), 10);
    var code = btn.getAttribute("data-code");
    np.kcal = newK; np.kcalRange = [newK - 150, newK + 150];
    np.carbs = Math.max(0, Math.round((newK - np.protein * 4 - np.fat * 9) / 4));
    MM.store.set("os_nutrition_plan", np);
    var hist = MM.store.get("os_adjust_history", []) || [];
    hist.push({ date: todayYmd(), oldKcal: oldK, newKcal: newK, reason: code, evidence: "weekly_review" });
    MM.store.set("os_adjust_history", hist);
    OS.emit("WEEKLY_REVIEW_COMPLETED", { oldKcal: oldK, newKcal: newK, code: code });
    if (MM.toast) MM.toast("Übernommen: " + oldK + " → " + newK + " kcal.");
    render();
  }
  function createTrainingPlan() {
    var daysArr = MM.store.get("c2_days", null);
    var days = (Array.isArray(daysArr) && daysArr.length === 4) ? 4 : 3;   // SSOT: Programm-Tage
    var lims = Array.prototype.slice.call(host.querySelectorAll("[data-tplim]:checked")).map(function (el) { return el.getAttribute("data-tplim"); });
    var plan = E.buildTrainingPlan({ daysPerWeek: days, minutes: OS.getP("training.minutes", 60), location: (document.getElementById("tpLoc") || {}).value || "gym", priority: (document.getElementById("tpPrio") || {}).value || "balanced", experience: OS.getP("training.experience", "novice"), limitations: lims });
    MM.store.set("os_training_plan", plan);
    OS.setP("training.daysPerWeek", days);
    OS.setP("training.location", plan.location);
    if (lims.length) OS.setP("health.limitations", lims);
    render();
  }
  function saveStack() {
    var d = MM.account.getDashboardState();
    var st = MM.store.get("os_stack", {}) || {};
    var strat = E.stackStrategy({ mode: d.mode || "recomp", pathway: OS.pathway(), budget: st.budget || "optimal", budgetEuro: st.budgetEuro, current: (OS.getP("stack.currentText", "") || "").split(",") });
    MM.store.set("os_stack", { budget: st.budget || "optimal", budgetEuro: st.budgetEuro, items: strat.items.map(function (s) { return { id: s.id, name: s.name, timing: s.timing }; }), saved: todayYmd() });
    OS.emit("STACK_UPDATED", {});
    if (MM.toast) MM.toast("Stack-Routine gespeichert — erscheint in Today.");
    render();
  }
  function saveEngine() {
    var type = (document.getElementById("enType") || {}).value || "zone2";
    var min = parseInt((document.getElementById("enMin") || {}).value, 10);
    if (!min) { if (MM.toast) MM.toast("Dauer fehlt."); return; }
    var log = MM.store.get("os_engine_log", []) || [];
    log.push({ date: todayYmd(), type: type, min: min });
    if (log.length > 120) log = log.slice(-120);
    MM.store.set("os_engine_log", log);
    var d = MM.account.getDashboardState(); var p = d.program || {};
    var res = { ok: false };
    if (p.active && !p.notStarted && !p.over) res = OS.completeEngineDay(p.day, { session: { type: type, min: min } });
    if (MM.toast) MM.toast(res.ok ? "Engine-Session geloggt ✓ — Engine-Tag abgehakt." : "Engine-Session geloggt ✓ (heutiger Programm-Tag ist " + (res.dayType || "kein Engine-Tag") + " — nicht abgehakt).");
    render();
  }
  /* §10/§14 — Workout beenden: strukturierter Log (workout_id, cycle_id,
     session_plan_id, program_day) + Legacy-Historie je Übung; Programm-Tag
     wird NUR über den Guard abgehakt (Kraft-Tag + gleicher Zyklus). */
  function finishWorkout(btn) {
    var tp = MM.store.get("os_training_plan", null); if (!tp) return;
    var psi = plannedSessionInfo(tp);
    var s = adaptedSession(psi);   // Phase 6: dieselbe (ggf. angepasste) Session, in die geloggt wurde
    var logs = wlogs();
    var dstr = todayYmd();
    var exercises = [];
    s.slots.forEach(function (sl, order) {
      var sets = [];
      for (var i = 0; i < sl.sets; i++) {
        var wEl = host.querySelector('[data-exw="' + sl.ex + '"][data-set="' + i + '"]');
        var rEl = host.querySelector('[data-exr="' + sl.ex + '"][data-set="' + i + '"]');
        var w = wEl ? parseFloat(wEl.value) : NaN, r = rEl ? parseInt(rEl.value, 10) : NaN;
        if (!isNaN(w) && !isNaN(r)) sets.push({ w: w, r: r });
      }
      if (sets.length) {
        logs[sl.ex] = logs[sl.ex] || [];
        var prs = E.detectPRs(logs[sl.ex], { sets: sets });
        logs[sl.ex].push({ date: dstr, sets: sets });
        exercises.push({ ex: sl.ex, order: order, sets: sets, prs: prs });
      }
    });
    if (!exercises.length) { if (MM.toast) MM.toast("Keine Sätze eingetragen — nichts gespeichert."); return; }
    logs._sessions = logs._sessions || []; logs._sessions.push({ date: dstr, key: psi.session.key, rpe: woRpe || null, compressed: s.compressedTo || null, partial: exercises.length < s.slots.length });
    logs._workouts = logs._workouts || [];
    logs._workouts.push({ id: "wo_" + Date.now().toString(36), cycle: OS.cycleId(), spid: psi.spid, sessionKey: s.key, programDay: psi.isToday ? psi.programDay : null, date: dstr, exercises: exercises.map(function (x) { return { ex: x.ex, order: x.order, sets: x.sets }; }) });
    if (logs._workouts.length > 200) logs._workouts = logs._workouts.slice(-200);
    MM.store.set("os_workout_logs", logs);
    var allPrs = exercises.reduce(function (a, x) { return a.concat(x.prs || []); }, []);
    var res = { ok: false, reason: "no_program" };
    var d = MM.account.getDashboardState(); var p = d.program || {};
    var mk = X.makeupForDate(dstr);
    if (p.active && !p.notStarted && !p.over && psi.isToday) {
      res = OS.completeProgramDay(psi.programDay, { cycleId: OS.cycleId(), sessionId: psi.spid });
    } else if (mk) {
      // Phase 6: Nachhol-Session — hakt den ZIELTAG ab (requireStrength:false),
      // der verpasste Tag bleibt ehrlich verpasst. EIN Abschluss, eine Quelle.
      X.completeMakeup(mk.id);
      res = { ok: true, reason: "makeup", dayType: "makeup" };
    } else if (p.active && !p.notStarted && !p.over) {
      res = { ok: false, reason: "day_not_strength", dayType: PV ? PV.dayTypeAt(p.day) : null };
    }
    var msg = res.reason === "makeup" ? "Nachhol-Session ✓ — Woche repariert." :
      res.ok ? "Workout gespeichert ✓ — Programm-Tag abgehakt." :
        res.reason === "day_not_strength" ? "Workout gespeichert ✓. Heutiger Programm-Tag (" + (res.dayType || "—") + ") wurde NICHT abgehakt — er ist kein Krafttag." :
          "Workout gespeichert ✓.";
    if (allPrs.length) msg += " " + allPrs[0].text;
    draftClear(); woMinutes = null; woRpe = null;
    if (MM.track) MM.track("action_complete", { t: res.reason === "makeup" ? "makeup" : "workout" });
    if (MM.toast) MM.toast(msg);
    location.hash = "#today"; render();
  }

  /* =========================== BOOT =========================== */
  skeleton();
  MM.account.onChange(render);
  MM.account.whenReady().then(function () {
    OS.prefillFromScore();
    OS.ensureCycle();
    // App-Start-Intelligenz (Phase 6): laufendes Workout → direkt weitermachen.
    var draft = MM.store.get("os_workout_draft", null);
    if (draft && draft.date === todayYmd() && (location.hash === "" || location.hash === "#today")) location.hash = "#workout";
    render();
    // Reminder-Engine: Tick beim Start + alle 5 Minuten, solange die App offen ist.
    try { X.tick(); setInterval(function () { X.tick(); }, 5 * 60 * 1000); } catch (e) {}
  }).catch(render);
  if (MM.track) MM.track("dashboard_open", {});
})();
