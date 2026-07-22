/* ==========================================================================
   MALEMETRIX OS — APP SHELL  (My MaleMetrix)
   --------------------------------------------------------------------------
   Rendert die eingeloggte App in #mmDash: TODAY · PLAN · TRACK · PROGRESS ·
   LEARN (+ Baseline, Pathway, Transformation, Workout). Hash-Routing
   (#today …), mobile Bottom-Nav. Bewahrt alle Account-Flows aus Phase 2.x
   (Sign-in, Migration, Claim, Export, Löschung) — MaleMetrix integriert,
   der Nutzer kombiniert nicht fünf Tools im Kopf.
   ========================================================================== */
(function () {
  "use strict";
  var host = document.getElementById("mmDash");
  if (!host || !window.MM || !MM.account || !MM.os || !MM.engines) return;
  var OS = MM.os, E = MM.engines;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  var MODE = { cut: "CUT", recomp: "RECOMP", build: "BUILD", perform: "PERFORM" };
  var BN = { recovery: "Recovery", engine: "Engine", body: "Body", strength: "Strength", metabolic: "Metabolic", lifestyle: "Lifestyle", medical: "Medical Check" };
  var PHASE = { 1: "Build the Base", 2: "Build Capacity", 3: "Push Performance", 4: "Lock it in" };
  function todayYmd() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  /* ---------- Routing ---------- */
  var VIEWS = ["today", "plan", "track", "progress", "learn", "baseline", "pathway", "transform", "workout"];
  function view() { var h = (location.hash || "#today").slice(1).split("?")[0]; return VIEWS.indexOf(h) >= 0 ? h : "today"; }
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

  /* =========================== TODAY =========================== */
  function vToday(snap) {
    var d = MM.account.getDashboardState();
    var p = d.program || {};
    var name = d.name ? (", " + d.name.toUpperCase()) : "";
    var html = "";

    // Kopf + Abmelden (Bestands-Hooks)
    html += '<div class="os-head"><span class="eyebrow" style="margin:0">My MaleMetrix</span>' +
      (snap.state === "signed_in" ? '<button id="mmOut" class="os-ghost">Abmelden</button>' : '') + '</div>';

    // Migration (Bestands-Flow)
    if (snap.state === "signed_in") {
      var inv = MM.account.localInventory(); var ms = MM.account.migrationStatus();
      if ((inv.score || inv.program) && ms.state !== "complete") {
        html += '<div class="card os-accent"><p style="font-weight:600;margin:0 0 8px">Daten auf diesem Gerät gefunden' + (ms.state === "partial" ? " — teilweise übernommen" : "") + '</p><ul class="small" style="margin:0 0 12px;padding-left:18px;color:var(--muted)">' + (inv.score ? '<li>Score — ' + (ms.score ? "übernommen ✓" : "gefunden") + '</li>' : '') + (inv.program ? '<li>12-Week Fortschritt — ' + (ms.program ? "übernommen ✓" : "gefunden") + '</li>' : '') + '</ul><button id="mmImport" class="btn btn-primary btn-sm">' + (ms.state === "partial" ? "Erneut versuchen" : "In meinen Account übernehmen") + '</button><p id="mmImportMsg" class="small" style="display:none;margin-top:8px;color:var(--muted)"></p><p class="small muted" style="margin:10px 0 0">Tracker-Daten bleiben vorerst lokal. Deine lokalen Daten bleiben als Backup erhalten.</p></div>';
      }
    }

    // Pathway wählen, falls noch keiner gesetzt
    if (!OS.pathway() && (d.hasScore || (d.access && d.access.twelve_week))) {
      html += '<a class="card os-pathway-cta" href="#pathway"><span class="tag">PATHWAY</span><b>Was willst du wirklich erreichen?</b><span class="s">Health · Performance · Enhanced — 30 Sekunden, prägt dein ganzes System.</span></a>';
    }

    if (d.access.twelve_week && p.active && !p.notStarted && !p.over) {
      // HERO: Programm-Status (Bestands-Texte 'Woche X · Tag Y' bleiben)
      html += '<div class="card os-hero-card"><span class="small muted os-k">' + esc(greetTime()) + esc(name) + '</span>' +
        '<h1 class="os-big">Woche ' + p.week + ' · Tag ' + p.day + '</h1>' +
        '<p class="muted" style="margin:0 0 14px">Phase ' + p.phase + ' · ' + esc(PHASE[p.phase]) + ' — Modus <strong style="color:var(--text)">' + esc(MODE[d.mode] || d.mode || "") + '</strong> · Engpass <strong style="color:var(--text)">' + esc(BN[d.bottleneck] || d.bottleneck || "—") + '</strong></p>' +
        '<a href="kurs-programm.html" class="btn btn-primary" data-track="program_continue">Heute fortsetzen →</a></div>';
      html += '<div class="os-tiles">' + (d.hasScore ? tile("Score", d.score + " / 100") : "") + tile("Programm", "W " + p.week + " / 12") + tile("Consistency", p.consistency + " %", p.active_days + " aktive Tage") + (p.nextReviewDays != null ? tile("Nächstes Review", p.nextReviewDays + " Tage") : "") + '</div>';

      // NEXT BEST ACTION + Aktionen
      var nba = OS.nextBestAction();
      if (nba.primary) {
        html += '<div class="os-nba"><span class="tag">NEXT BEST ACTION</span><div class="nba-main"><b>' + esc(nba.primary.label) + '</b><span>' + esc(nba.primary.detail) + '</span></div>' +
          (nba.primary.type === "program_day" ? '<a class="btn btn-primary btn-sm" href="' + nba.primary.deepLink + '">Start →</a>' : '<button class="btn btn-primary btn-sm" data-osdone="' + esc(nba.primary.id) + '">Erledigt ✓</button>') + '</div>';
        html += '<p class="os-notnow"><b>Not now:</b> ' + nba.notNow.map(esc).join(" · ") + '</p>';
      }
      var acts = OS.todayActions();
      html += '<div class="os-actions">' + acts.map(function (a, i) {
        return '<div class="os-action ' + (a.done ? "done" : "") + '"><span class="n">' + (i + 1) + '</span><div class="t"><b>' + esc(a.label) + '</b><span>' + esc(a.detail) + '</span></div>' +
          (a.type === "program_day" ? '<a class="os-ghost" href="' + a.deepLink + '">Öffnen</a>' : (a.done ? '<span class="ok">✓</span>' : '<button class="os-ghost" data-osdone="' + esc(a.id) + '">✓</button>')) + '</div>';
      }).join("") + '</div>';

      // Baseline-Reminder, falls für diesen Zyklus keine existiert
      if (!OS.baseline()) html += '<a class="card os-baseline-cta" href="#baseline"><span class="tag">BASELINE</span><b>Dokumentiere deinen Start.</b><span class="s">Gewicht, Taille, Kraftwerte, Fotos — du wirst nicht mehr wissen, wie du heute aussahst.</span></a>';
    } else if (d.access.twelve_week && p && p.notStarted) {
      html += '<div class="card os-accent"><span class="small muted os-k">' + esc(greetTime()) + esc(name) + '</span><h1 class="os-big" style="font-size:1.5rem">Dein 12-Week System ist startklar</h1><p class="muted" style="margin:0 0 14px">Dein Programm beginnt am gewählten Startdatum. Nutze die Zeit: <a href="#baseline" style="color:var(--accent)">Baseline anlegen →</a></p><a href="kurs-programm.html" class="btn btn-primary">Programm öffnen →</a></div>';
    } else if (d.access.twelve_week) {
      html += '<div class="card os-accent"><span class="small muted os-k">' + esc(greetTime()) + esc(name) + '</span><h1 class="os-big" style="font-size:1.5rem">Dein 12-Week System ist bereit</h1><p class="muted" style="margin:0 0 14px">Empfohlener Ablauf: erst <a href="#baseline" style="color:var(--accent)">Baseline</a>, dann Programm einrichten.</p><a href="kurs-programm.html" class="btn btn-primary">Programm starten →</a></div>';
    } else if (d.hasScore) {
      html += '<div class="card os-accent"><span class="small muted os-k">' + esc(greetTime()) + esc(name) + '</span><h1 class="os-big" style="font-size:1.5rem">Dein Engpass: ' + esc(d.bottleneckName || BN[d.bottleneck] || "—") + '</h1><p class="muted" style="margin:0 0 14px">Empfohlener Modus: <strong style="color:var(--text)">' + esc(MODE[d.mode] || d.mode || "—") + '</strong>. Das 12-Week System führt dich Schritt für Schritt.</p><a href="protokoll.html" class="btn btn-primary">Dein System aufbauen →</a></div>';
    } else {
      // Leerer Zustand: DEIN SYSTEM STARTET HIER (enthält Baseline + Score starten)
      html += '<div class="card os-accent os-start"><h1 class="os-big" style="font-size:1.5rem">Dein System startet hier</h1><ol class="os-steps">' +
        '<li><b>Score machen</b><span>Baseline deiner 7 Systeme — findet deinen Engpass.</span></li>' +
        '<li><b>Pathway wählen</b><span>Health · Performance · Enhanced.</span></li>' +
        '<li><b>Baseline anlegen</b><span>Gewicht, Taille, Fotos, Kraftwerte.</span></li>' +
        '<li><b>Plan bauen</b><span>Programm, Nutrition, Training, Stack.</span></li></ol>' +
        '<a href="check.html" class="btn btn-primary">MaleMetrix Score starten →</a></div>';
    }

    // Claim (Bestands-Flow)
    if (!d.access.twelve_week) {
      html += '<div class="card"><p class="small" style="margin:0 0 8px;font-weight:600">Du hast bereits einen Zugangscode?</p><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="mmClaim" type="text" placeholder="Zugangscode" autocomplete="off" spellcheck="false" style="flex:1;min-width:180px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:rgba(127,127,127,0.06);color:var(--text);letter-spacing:1px"><button id="mmClaimBtn" class="btn btn-primary btn-sm">Zugang aktivieren</button></div><p id="mmClaimMsg" class="small" style="display:none;margin-top:8px"></p></div>';
    }

    // Konto & Daten (Bestands-Flow) + Sync-Status
    var SYNC_TXT = { synced: "Gespeichert ✓", pending: "Sync ausstehend", saving: "Speichert…", offline: "Offline — lokal gespeichert", error: "Sync wird automatisch erneut versucht", "local": "Nur dieses Gerät", "n/a": "" };
    html += '<div class="card os-account"><span class="os-k">Konto &amp; Daten</span>' +
      '<p class="small muted" style="margin:8px 0 10px">Status: ' + esc(SYNC_TXT[snap.state === "signed_in" ? MM.account.getSyncStatus() : "local"] || "") + '</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button id="mmExport" class="os-ghost">Meine Daten exportieren (JSON)</button>' +
      (snap.state === "signed_in" ? '<button id="mmDelete" class="os-ghost">Konto löschen</button>' : '') +
      '</div><p id="mmAcctMsg" class="small muted" style="display:none;margin-top:8px"></p></div>';

    if (snap.state === "local") html += '<p class="small muted" style="text-align:center;margin-top:18px">Dieses Gerät nutzt My MaleMetrix lokal. Das geräteübergreifende Konto wird demnächst aktiviert — deine Daten bleiben erhalten.</p>';
    return html;
  }

  /* =========================== PATHWAY =========================== */
  function vPathway() {
    var cur = OS.pathway();
    var html = sec("Was willst du wirklich erreichen?", '<p class="muted" style="margin:0 0 16px">Pathway ≠ Ziel. Der Pathway bestimmt Ton, Tiefe und welche Inhalte dein System dir zeigt — dein Modus (CUT/RECOMP/BUILD/PERFORM) bleibt davon getrennt.</p>' +
      '<div class="os-pathways">' + Object.keys(OS.PATHWAYS).map(function (k) {
        var p = OS.PATHWAYS[k];
        return '<button class="os-pathway ' + (cur === k ? "sel" : "") + '" data-pathway="' + k + '"><span class="nm">' + esc(p.label) + '</span><span class="ln">' + esc(p.line) + '</span>' + (k === "enhanced" ? '<span class="note">Direkte Real-World-Education · kein Dosierungs-Generator</span>' : '') + '</button>';
      }).join("") + '</div>');
    return html;
  }

  /* =========================== BASELINE =========================== */
  function vBaseline() {
    var b = OS.baseline() || {};
    var lw = OS.latestMetric("weight"), lwa = OS.latestMetric("waist");
    function inp(id, label, val, ph) { return '<label class="os-field"><span>' + esc(label) + '</span><input id="' + id + '" type="number" inputmode="decimal" value="' + (val != null ? esc(val) : "") + '" placeholder="' + (ph || "—") + '"></label>'; }
    var html = sec("Baseline · dokumentiere deinen Start",
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
    return html;
  }

  /* =========================== TRANSFORMATION =========================== */
  function vTransform() {
    var t = (MM.store && MM.store.get("os_transformation", null)) || null;
    var lw = OS.latestMetric("weight");
    var d = MM.account.getDashboardState();
    var html = "";
    if (t && t.result) {
      var r = t.result;
      html += sec("Deine Transformation", realityCheck(t.input.targetWeightKg + " kg · " + (t.input.targetLeanness === "leaner" ? "definierter" : "gleich"), t.input.months + " Monate", r.reality) +
        '<div class="os-roadmap">' + r.phases.map(function (p, i) { return '<div class="os-phase"><span class="n">' + (i + 1) + '</span><div><b>' + esc(p.name) + '</b><span class="w">' + p.weeks + ' Wochen</span><p>' + esc(p.why) + '</p></div></div>'; }).join("") + '</div>' +
        '<p class="small muted">Erwartbarer Muskelaufbau (' + r.months + ' Mon.): konservativ ' + r.gainRange.cons + ' kg · wahrscheinlich ' + r.gainRange.likely + ' kg · aggressiv ' + r.gainRange.aggr + ' kg. Spannen, keine Garantien.</p>' +
        '<p style="margin-top:10px"><a class="btn btn-primary btn-sm" href="kurs-programm.html">Aktuellen 12-Wochen-Zyklus ' + (d.program && d.program.active ? "fortsetzen" : "starten") + ' →</a> <button class="os-ghost" id="txReset">Neu planen</button></p>');
      html += nobody("Aufbau und sichtbar schlanker werden passieren nicht in derselben Woche — sondern in derselben Roadmap. Wer beides gleichzeitig in 12 Wochen will, bekommt meist keins von beidem.");
      return html;
    }
    function inp(id, label, val, ph) { return '<label class="os-field"><span>' + esc(label) + '</span><input id="' + id + '" type="number" inputmode="decimal" value="' + (val != null ? esc(val) : "") + '" placeholder="' + (ph || "—") + '"></label>'; }
    html += sec("Wo willst du hin?", '<p class="muted">Wir rechnen ehrlich: was dein Ziel in deinem Trainingsalter wirklich braucht — in Spannen, nicht in Versprechen.</p>' +
      '<div class="os-grid2">' + inp("txW", "Aktuelles Gewicht (kg)", (lw && lw.value) || null) + inp("txBf", "KFA-Schätzung % (optional)", null, "18") +
      inp("txTW", "Zielgewicht (kg)", null, "90") + inp("txM", "Zeitraum (Monate)", 12) + '</div>' +
      '<label class="os-field"><span>Dabei…</span><select id="txLean"><option value="leaner">definierter werden</option><option value="same">Körperfett egal</option><option value="much_leaner">deutlich definierter</option></select></label>' +
      '<label class="os-field"><span>Trainingserfahrung</span><select id="txExp"><option value="beginner">Einsteiger (&lt;1 Jahr)</option><option value="novice" selected>Fortgeschritten (1–2 J.)</option><option value="intermediate">Erfahren (2–5 J.)</option><option value="advanced">Sehr erfahren (5+ J.)</option></select></label>' +
      '<button id="txGo" class="btn btn-primary" style="margin-top:12px">Reality Check →</button>');
    return html;
  }

  /* =========================== PLAN =========================== */
  function vPlan() {
    var d = MM.account.getDashboardState();
    var prof = OS.profile();
    var html = "";
    // Transformation-Einstieg
    var t = MM.store.get("os_transformation", null);
    html += '<a class="card os-row-cta" href="#transform"><span class="tag">ROADMAP</span><b>' + (t ? "12-Monats-Roadmap ansehen" : "Transformation planen — Reality Check") + '</b></a>';

    /* --- NUTRITION OS --- */
    var np = MM.store.get("os_nutrition_plan", null);
    if (np) {
      var day = E.exampleDay(np, { maxCookMin: OS.getP("nutrition.cookMinutes", 40) });
      html += sec("Nutrition · " + esc(MODE[d.mode] || ""), '<div class="os-macro"><div class="m"><b>' + np.kcal + '</b><span>kcal (' + np.kcalRange[0] + '–' + np.kcalRange[1] + ')</span></div><div class="m"><b>' + np.protein + ' g</b><span>Protein</span></div><div class="m"><b>' + np.carbs + ' g</b><span>Carbs</span></div><div class="m"><b>' + np.fat + ' g</b><span>Fett</span></div></div>' +
        '<p class="small muted" style="margin:8px 0 12px">So sieht ' + np.protein + ' g Protein wirklich aus:</p>' +
        '<div class="os-meals">' + day.meals.map(function (m) {
          return '<div class="os-meal"><div class="hd"><b>' + esc(m.name) + '</b><span>' + m.kcal + ' kcal · ' + m.p + ' g P</span></div><p class="ing">' + m.ing.map(esc).join(" · ") + '</p>' +
            (m.family ? '<p class="fam">👨‍👩‍👧 ' + esc(m.family.note) + ' (' + m.family.servings + ' Portionen)</p>' : '') +
            '<div class="ctl"><button class="os-chip" data-swap="' + m.id + '" data-want="cheaper">billiger</button><button class="os-chip" data-swap="' + m.id + '" data-want="faster">schneller</button><button class="os-chip" data-swap="' + m.id + '" data-want="protein">mehr Protein</button><button class="os-chip" data-swap="' + m.id + '" data-want="family">Familie</button></div></div>';
        }).join("") + '</div>' +
        '<p class="small muted">Tagessumme Beispiel: ' + day.totals.kcal + ' kcal · ' + day.totals.p + ' g Protein</p>' +
        '<button class="os-ghost" id="npShop">Einkaufsliste anzeigen</button><div id="npShopOut"></div>' +
        '<div id="npAdjust" style="margin-top:12px"></div>');
    } else {
      html += '<div class="card"><span class="tag">NUTRITION OS</span><p class="muted" style="margin:8px 0 12px">Jeder Modus braucht Zahlen: Energie, Protein, Beispieltag. Aus deinen vorhandenen Daten — nichts wird doppelt gefragt.</p>' +
        (OS.latestMetric("weight") && OS.getP("identity.height", null) ? '<button id="npCreate" class="btn btn-primary btn-sm">Nutrition-Plan erstellen →</button>' :
          '<div class="os-grid2"><label class="os-field"><span>Gewicht (kg)</span><input id="npW" type="number" inputmode="decimal"></label><label class="os-field"><span>Größe (cm)</span><input id="npH" type="number" inputmode="decimal" value="' + (OS.getP("identity.height", "") || "") + '"></label></div><button id="npCreate" class="btn btn-primary btn-sm">Nutrition-Plan erstellen →</button>') + '</div>';
    }

    /* --- TRAINING ENGINE --- */
    var tp = MM.store.get("os_training_plan", null);
    if (tp) {
      html += sec("Training · " + tp.days + " Tage / Woche", (tp.note ? '<p class="small muted" style="margin:0 0 10px">' + esc(tp.note) + '</p>' : '') +
        '<div class="os-sessions">' + tp.sessions.map(function (s) {
          return '<div class="os-session"><b>' + esc(s.name) + '</b><ul>' + s.slots.map(function (sl) { return '<li>' + esc(sl.name) + ' <span>' + sl.sets + ' × ' + sl.reps[0] + '–' + sl.reps[1] + ' · RIR ' + sl.rir + ' · Pause ' + sl.rest + '</span></li>'; }).join("") + '</ul></div>';
        }).join("") + '</div>' +
        '<p class="small muted">Progression: Double Progression — erst Wiederholungen im Zielbereich füllen, dann Last erhöhen. Dein nächstes Ziel steht im Workout.</p>' +
        '<a class="btn btn-primary btn-sm" href="#workout">Heutiges Workout öffnen →</a> <button class="os-ghost" id="tpReset">Plan ändern</button>');
    } else {
      var pd = d.program || {};
      var daysKnown = MM.store.get("c2_days", null);
      html += '<div class="card"><span class="tag">TRAINING ENGINE</span><p class="muted" style="margin:8px 0 12px">Exakte Sessions mit Sätzen, Wiederholungsbereichen, RIR und Progressionsregel — abgestimmt auf deine Programm-Tage' + (daysKnown ? ' (' + daysKnown.length + '/Woche, aus deinem Programm übernommen)' : '') + '.</p>' +
        '<div class="os-grid2"><label class="os-field"><span>Ort</span><select id="tpLoc"><option value="gym">Gym</option><option value="home_db">Zuhause (Kurzhanteln)</option><option value="home_none">Zuhause (ohne Equipment)</option></select></label>' +
        '<label class="os-field"><span>Priorität</span><select id="tpPrio"><option value="balanced">Ausgewogen</option><option value="chest">Brust</option><option value="back">Rücken</option><option value="arms">Arme</option><option value="shoulders">Schultern</option><option value="legs">Beine</option></select></label></div>' +
        '<button id="tpCreate" class="btn btn-primary btn-sm">Trainingsplan erstellen →</button></div>';
    }

    /* --- STACK INTELLIGENCE --- */
    var st = MM.store.get("os_stack", null);
    var budget = (st && st.budget) || "optimal";
    var strat = E.stackStrategy({ mode: d.mode || "recomp", pathway: OS.pathway(), budget: budget, current: (OS.getP("stack.currentText", "") || (OS.baseline() || {}).stackText || "").split(","), sleepBad: (OS.getP("recovery.sleepHours", 7) || 7) < 6.5 });
    html += sec("Stack · wertbasiert, nicht maximal",
      '<div class="os-budget">' + ["essential", "optimal", "maximal"].map(function (b) { return '<button class="os-chip ' + (budget === b ? "sel" : "") + '" data-budget="' + b + '">' + b.toUpperCase() + '</button>'; }).join("") + '</div>' +
      '<div class="os-stack">' + strat.items.map(function (s) { return '<div class="os-supp"><div class="hd"><b>' + esc(s.name) + '</b><span class="ev ev-' + s.evidence.toLowerCase() + '">' + esc(s.evidence) + '</span></div><p>' + esc(s.why) + '</p><span class="tm">' + esc(s.timing) + '</span></div>'; }).join("") + '</div>' +
      (strat.remove.length ? '<div class="os-remove"><span class="tag">STREICHEN — SPART GELD, KOSTET NICHTS</span>' + strat.remove.map(function (s) { return '<p><b>' + esc(s.name) + '</b> — ' + esc(s.why) + '</p>'; }).join("") + '</div>' : '') +
      (strat.diminishing ? '<p class="small muted" style="margin-top:8px">' + esc(strat.diminishing) + '</p>' : '') +
      '<div class="os-schedule">' + [["morning", "MORGENS"], ["with_food", "ZUM ESSEN"], ["pre_training", "PRE-TRAINING"], ["evening", "ABENDS"]].map(function (sl) { var arr = strat.schedule[sl[0]]; return arr.length ? '<div><span>' + sl[1] + '</span><b>' + arr.map(esc).join(" · ") + '</b></div>' : ''; }).join("") + '</div>' +
      '<button class="btn btn-primary btn-sm" id="stSave">Als meine Stack-Routine übernehmen</button>');

    // Kalender / ICS
    html += '<div class="card"><span class="tag">KALENDER</span><p class="muted" style="margin:8px 0 12px">Trainingszeiten in deinen Kalender — als ICS-Datei (Apple/Google-kompatibel). Kein Zwei-Wege-Sync, ehrlich gesagt.</p><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="icsTime" type="time" value="' + esc(OS.getP("calendar.trainTime", "18:00")) + '" style="padding:8px;border:1px solid var(--line);border-radius:8px;background:rgba(127,127,127,0.06);color:var(--text)"><button id="icsGo" class="os-ghost">Nächste 7 Tage als .ics laden</button></div></div>';
    return html;
  }

  /* =========================== WORKOUT =========================== */
  function currentSession(tp) {
    var logs = MM.store.get("os_workout_logs", {}) || {};
    var count = (logs._sessions || []).length;
    return tp.sessions[count % tp.sessions.length];
  }
  function vWorkout() {
    var tp = MM.store.get("os_training_plan", null);
    if (!tp) return '<div class="card"><p class="muted">Noch kein Trainingsplan. <a href="#plan" style="color:var(--accent)">Im Plan erstellen →</a></p></div>';
    var s = currentSession(tp);
    var logs = MM.store.get("os_workout_logs", {}) || {};
    var html = sec("Workout · " + esc(s.name),
      s.slots.map(function (sl, i) {
        var hist = (logs[sl.ex] || []);
        var last = hist.length ? hist[hist.length - 1] : null;
        var target = E.progressionTarget(last ? last.sets : null, sl.reps);
        return '<div class="os-ex"><div class="hd"><b>' + esc(sl.name) + '</b><span>' + sl.sets + ' × ' + sl.reps[0] + '–' + sl.reps[1] + ' · RIR ' + sl.rir + '</span></div>' +
          (last ? '<p class="last">Zuletzt: ' + last.sets.map(function (x) { return x.w + "×" + x.r; }).join(" · ") + '</p>' : '') +
          '<p class="tgt">🎯 ' + esc(target.text) + '</p>' +
          '<div class="sets">' + Array.from({ length: sl.sets }).map(function (_, si) { return '<span class="set"><input type="number" inputmode="decimal" placeholder="kg" data-exw="' + sl.ex + '" data-set="' + si + '"><input type="number" inputmode="numeric" placeholder="Wdh" data-exr="' + sl.ex + '" data-set="' + si + '"></span>'; }).join("") + '</div></div>';
      }).join("") +
      '<button id="woFinish" class="btn btn-primary" style="margin-top:14px">Workout abschließen ✓</button>' +
      '<p class="small muted" style="margin-top:8px">Abschließen speichert deine Sätze UND hakt den Programm-Tag ab — keine Doppel-Erfassung.</p>');
    return html;
  }

  /* =========================== TRACK =========================== */
  function vTrack() {
    var lw = OS.latestMetric("weight"), lwa = OS.latestMetric("waist");
    var wt = OS.metricTrend("weight", 7);
    var html = sec("Track · dein Measurement Layer",
      '<div class="os-grid2"><label class="os-field"><span>Gewicht heute (kg)</span><input id="tkW" type="number" inputmode="decimal" placeholder="' + (lw ? lw.value : "—") + '"></label>' +
      '<label class="os-field"><span>Taille (cm)</span><input id="tkWa" type="number" inputmode="decimal" placeholder="' + (lwa ? lwa.value : "—") + '"></label></div>' +
      '<button id="tkSave" class="btn btn-primary btn-sm">Speichern</button>' +
      (wt ? '<p class="small muted" style="margin-top:10px">7-Tage-Trend Gewicht: ' + (wt.delta > 0 ? "+" : "") + wt.delta + ' kg (rollender Ø — Einzelmessungen sind Rauschen).</p>' : '') +
      '<div class="os-metriclist">' + OS.metricSeries("weight").slice(-7).reverse().map(function (m) { return '<div><span>' + m.date + '</span><b>' + m.value + ' ' + m.unit + '</b><i>' + m.source + '</i></div>'; }).join("") + '</div>' +
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
    function row(l, a, bv) { return '<div class="os-cmp-row"><span>' + esc(l) + '</span><b>' + esc(a != null ? a : "—") + '</b><i>→</i><b class="now">' + esc(bv != null ? bv : "—") + '</b></div>'; }
    var interp = E.interpretProgress({
      weightDelta: (w0 && wN) ? wN.value - w0.value : null,
      waistDelta: (wa0 && waN) ? waN.value - wa0.value : null,
      strengthPct: null,
      executionPct: p.consistency != null ? p.consistency : null
    });
    var html = sec("Start → Jetzt",
      '<div class="os-cmp">' + row("Score", b.score || (d.hasScore ? "—" : null), d.hasScore ? d.score : "—") +
      row("Gewicht", w0 ? w0.value + " kg" : null, wN ? wN.value + " kg" : null) +
      row("Taille", wa0 ? wa0.value + " cm" : null, waN ? waN.value + " cm" : null) +
      row("Execution", "—", p.consistency != null ? p.consistency + " %" : "—") + '</div>' +
      '<div class="os-interp">' + interp.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join("") + '</div>');
    // Fotos-Vergleich (async nachgeladen)
    html += '<div class="card" id="osPhotoCmp"><span class="tag">FOTOS · WOCHE 0 vs. JETZT</span><div class="os-photocmp" id="osPhotoSlots"><p class="small muted">Prüfe Fotos…</p></div></div>';
    // Zyklus-Historie
    var arch = MM.store.get("c2_archive", []) || [];
    var hist = arch.map(function (a, i) { return '<div class="os-cycle"><b>Zyklus ' + (i + 1) + '</b><span>' + esc((MODE[a.goal] || a.goal || "—")) + '</span><i>abgeschlossen ' + esc(a.ended || "") + '</i></div>'; }).join("");
    if (p.active) hist += '<div class="os-cycle on"><b>Zyklus ' + (arch.length + 1) + '</b><span>' + esc(MODE[d.mode] || "") + '</span><i>aktiv · Woche ' + p.week + '</i></div>';
    if (hist) html += sec("Zyklus-Historie", '<div class="os-cycles">' + hist + '</div><p class="small muted">Historische Zyklen sind unveränderlich — sie sind deine Geschichte, nicht dein Arbeitsstand.</p>');
    return html;
  }
  function loadPhotoCompare() {
    var slot = document.getElementById("osPhotoSlots"); if (!slot) return;
    Promise.all([OS.hasPhotos(0), OS.hasPhotos(12), OS.hasPhotos(8), OS.hasPhotos(4)]).then(function (h) {
      var lastWeek = h[1] ? 12 : h[2] ? 8 : h[3] ? 4 : null;
      if (!h[0]) { slot.innerHTML = '<p class="small muted">Keine Baseline-Fotos auf diesem Gerät. Ohne Woche-0-Fotos gibt es keinen visuellen Vergleich — die Zahlen oben gelten trotzdem.</p>'; return; }
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
    var d = MM.account.getDashboardState();
    var html = sec("Learn · verstehe dein System",
      '<div class="os-learn-grid">' +
      '<a class="os-learn" href="ebooks/protokoll.html"><b>DAS PROTOKOLL</b><span>Das Referenzwerk — warum dein System funktioniert.</span></a>' +
      '<a class="os-learn" href="ebooks.html"><b>Library</b><span>Deep Dives: Body · Engine · Recovery · Hormone · Health.</span></a>' +
      '<a class="os-learn" href="blutwerte.html"><b>Blood &amp; Labs</b><span>Die Biomarker, die für Männer zählen.</span></a>' +
      '</div>');
    if (pw === "enhanced") {
      var F = E.ENHANCED_FRAMEWORK;
      html += sec("Enhanced Performance Center", '<p class="muted" style="margin:0 0 6px">Direkt, real-world, ohne Moralisieren — und ohne Rezeptgenerator.</p><p class="small muted" style="margin:0 0 14px">' + esc(F.boundary) + '</p>' +
        '<div class="os-enh">' + F.levels.map(function (l) {
          return '<div class="os-enh-level"><div class="hd"><b>' + esc(l.name) + '</b><span>Komplexität: ' + esc(l.complexity) + '</span></div>' +
            '<p><b>Ambition:</b> ' + esc(l.ambition) + '</p><p><b>Monitoring:</b> ' + esc(l.monitoring) + '</p><p><b>Trade-offs:</b> ' + esc(l.tradeoffs) + '</p><p class="und"><b>Unterschätzt:</b> ' + esc(l.underestimated) + '</p></div>';
        }).join("") + '</div>' +
        '<div class="os-riskmap"><span class="tag">MONITORING-LANDKARTE</span><div class="doms">' + F.monitoringDomains.map(function (m) { return '<span>' + esc(m) + '</span>'; }).join("") + '</div></div>' +
        '<div class="os-nobody"><span class="tag">EXIT</span><p>' + esc(F.exit) + '</p></div>' +
        '<a class="card os-row-cta" href="ebooks.html#advanced"><span class="tag">DEEP DIVE</span><b>Ultimate Stack — Muscle-Gain-Framework (Advanced Library)</b></a>' +
        '<a class="card os-row-cta" href="coaching.html"><span class="tag">SUPPORT</span><b>Enhanced Performance Support — 1:1 Begleitung mit Monitoring</b></a>');
    } else if (pw === "health") {
      html += '<p class="small muted" style="margin-top:12px">Dein Pathway ist HEALTH — Enhanced-Inhalte werden dir bewusst nicht in den Weg gestellt. Du findest sie jederzeit über die Library, wenn du sie suchst.</p>';
    } else {
      html += nobody("Mehr Training ist nicht automatisch mehr Muskel. Die nützliche Frage ist: Wie viel produktives Training kannst du erholen UND steigern?");
    }
    return html;
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
    var v = view();
    var body = v === "plan" ? vPlan() : v === "track" ? vTrack() : v === "progress" ? vProgress() : v === "learn" ? vLearn() : v === "baseline" ? vBaseline() : v === "pathway" ? vPathway() : v === "transform" ? vTransform() : v === "workout" ? vWorkout() : vToday(snap);
    host.innerHTML = '<div class="os-shell">' + navBar(v) + '<div class="os-body">' + body + '</div></div>';
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
      var ph = t.closest(".os-photo"); if (ph && !t.closest("input")) { var fi = ph.querySelector("input[type=file]"); if (fi) fi.click(); return; }
      if (t.closest("#blSave")) { saveBaselineFromForm(); return; }
      if (t.closest("#txGo")) { runTransform(); return; }
      if (t.closest("#txReset")) { MM.store.remove("os_transformation"); render(); return; }
      if (t.closest("#npCreate")) { createNutritionPlan(); return; }
      var sw = t.closest("[data-swap]"); if (sw) { var alt = E.swapMeal(sw.getAttribute("data-swap"), sw.getAttribute("data-want")); if (alt && MM.toast) MM.toast("Alternative: " + alt.name + " (" + alt.kcal + " kcal · " + alt.p + " g P)"); return; }
      if (t.closest("#npShop")) { var npx = MM.store.get("os_nutrition_plan", null); var dayx = E.exampleDay(npx, {}); var list = E.shoppingList(dayx.meals.map(function (m) { return m.id; })); var out = document.getElementById("npShopOut"); if (out) out.innerHTML = '<div class="os-shoplist">' + Object.keys(list).map(function (c) { return list[c].length ? '<div><span>' + c.toUpperCase() + '</span>' + list[c].map(function (i) { return '<label><input type="checkbox"> ' + esc(i) + '</label>'; }).join("") + '</div>' : ''; }).join("") + '</div>'; return; }
      if (t.closest("#tpCreate")) { createTrainingPlan(); return; }
      if (t.closest("#tpReset")) { MM.store.remove("os_training_plan"); render(); return; }
      var bud = t.closest("[data-budget]"); if (bud) { var stx = MM.store.get("os_stack", {}) || {}; stx.budget = bud.getAttribute("data-budget"); MM.store.set("os_stack", stx); render(); return; }
      if (t.closest("#stSave")) { saveStack(); return; }
      if (t.closest("#woFinish")) { finishWorkout(); return; }
      if (t.closest("#tkSave")) { var w = parseFloat((document.getElementById("tkW") || {}).value); var wa = parseFloat((document.getElementById("tkWa") || {}).value); var okAny = false; if (w) { OS.logMetric("weight", w, "kg"); okAny = true; } if (wa) { OS.logMetric("waist", wa, "cm"); okAny = true; } if (okAny) { if (MM.toast) MM.toast("Gespeichert."); render(); } return; }
      if (t.closest("#icsGo")) { var tm = (document.getElementById("icsTime") || {}).value || "18:00"; OS.setP("calendar.trainTime", tm); var ics = OS.icsForNextDays(7, tm); if (!ics) { if (MM.toast) MM.toast("Kein aktives Programm."); return; } var bl = new Blob([ics], { type: "text/calendar" }); var aa = document.createElement("a"); aa.href = URL.createObjectURL(bl); aa.download = "malemetrix-training.ics"; aa.click(); return; }
    });
    host.addEventListener("change", function (e) {
      var fi = e.target.closest("[data-photoin]");
      if (fi && fi.files && fi.files[0]) {
        var angle = fi.getAttribute("data-photoin");
        var d = MM.account.getDashboardState(); var p = d.program || {};
        var week = (!p.active || p.notStarted) ? 0 : (p.week >= 12 ? 12 : p.week >= 8 ? 8 : p.week >= 4 ? 4 : 0);
        OS.savePhoto(week, angle, fi.files[0]).then(function () { var st = document.getElementById("ph_" + angle); if (st) st.textContent = "✓ gespeichert (W" + week + ")"; });
      }
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
    var input = { weightKg: w, bfPct: num("txBf"), heightCm: OS.getP("identity.height", 180), experience: (document.getElementById("txExp") || {}).value || "novice", targetWeightKg: num("txTW") || w, targetLeanness: (document.getElementById("txLean") || {}).value || "leaner", months: num("txM") || 12 };
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
    var t = E.nutritionTargets({ weightKg: w, heightCm: h, age: OS.getP("identity.age", 35), mode: d.mode || "recomp", activity: "moderate" });
    MM.store.set("os_nutrition_plan", t);
    OS.emit("MEAL_LOGGED", { created: true });
    render();
  }
  function createTrainingPlan() {
    var daysArr = MM.store.get("c2_days", null);
    var days = (Array.isArray(daysArr) && daysArr.length === 4) ? 4 : 3;   // SSOT: Programm-Tage
    var plan = E.buildTrainingPlan({ daysPerWeek: days, minutes: OS.getP("training.minutes", 60), location: (document.getElementById("tpLoc") || {}).value || "gym", priority: (document.getElementById("tpPrio") || {}).value || "balanced", experience: OS.getP("training.experience", "novice") });
    MM.store.set("os_training_plan", plan);
    OS.setP("training.daysPerWeek", days);
    OS.setP("training.location", plan.location);
    render();
  }
  function saveStack() {
    var d = MM.account.getDashboardState();
    var st = MM.store.get("os_stack", {}) || {};
    var strat = E.stackStrategy({ mode: d.mode || "recomp", pathway: OS.pathway(), budget: st.budget || "optimal", current: (OS.getP("stack.currentText", "") || "").split(",") });
    MM.store.set("os_stack", { budget: st.budget || "optimal", items: strat.items.map(function (s) { return { id: s.id, name: s.name, timing: s.timing }; }), saved: todayYmd() });
    OS.emit("STACK_UPDATED", {});
    if (MM.toast) MM.toast("Stack-Routine gespeichert — erscheint in Today.");
    render();
  }
  function finishWorkout() {
    var tp = MM.store.get("os_training_plan", null); if (!tp) return;
    var s = currentSession(tp);
    var logs = MM.store.get("os_workout_logs", {}) || {};
    var dstr = todayYmd();
    s.slots.forEach(function (sl) {
      var sets = [];
      for (var i = 0; i < sl.sets; i++) {
        var wEl = host.querySelector('[data-exw="' + sl.ex + '"][data-set="' + i + '"]');
        var rEl = host.querySelector('[data-exr="' + sl.ex + '"][data-set="' + i + '"]');
        var w = wEl ? parseFloat(wEl.value) : NaN, r = rEl ? parseInt(rEl.value, 10) : NaN;
        if (!isNaN(w) && !isNaN(r)) sets.push({ w: w, r: r });
      }
      if (sets.length) { logs[sl.ex] = logs[sl.ex] || []; logs[sl.ex].push({ date: dstr, sets: sets }); }
    });
    logs._sessions = logs._sessions || []; logs._sessions.push({ date: dstr, key: s.key });
    MM.store.set("os_workout_logs", logs);
    // Integration: Programm-Tag abhaken (EIN Eintrag, keine Doppel-Erfassung)
    var d = MM.account.getDashboardState(); var p = d.program || {};
    if (p.active && !p.notStarted && !p.over) OS.completeProgramDay(p.day);
    if (MM.toast) MM.toast("Workout gespeichert ✓ — Programm-Tag abgehakt.");
    location.hash = "#today"; render();
  }

  /* =========================== BOOT =========================== */
  skeleton();
  MM.account.onChange(render);
  MM.account.whenReady().then(function () {
    OS.prefillFromScore();      // Score → Graph (nie doppelt fragen)
    render();
  }).catch(render);
  if (MM.track) MM.track("dashboard_open", {});
})();
