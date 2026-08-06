/* ==========================================================================
   MaleMetrix Generation 2 — App-Controller (meinplan.html)

   Vier sichtbare Bereiche: HEUTE · MEIN PLAN · FORTSCHRITT · PROFIL.
   Dazu der Einrichtungs-Ablauf (Ziel → Score → Planfragen → Vorschau →
   Aktivierung) und der Wochencheck. Alles andere arbeitet im Hintergrund.

   Datenquellen (eine Wahrheit je Datum):
     Plan/Historie/Checkins/Funnel  → MMSimple.store (os_state-Sync)
     Gewicht                        → mm_os_metrics (GLEICHE Form wie OS v1:
                                      {type,value,unit,date,source}) — Legacy
                                      und Gen 2 lesen dieselbe Reihe
     Tagesprotokoll (Aufgaben/Workout) → mm_simple_daylog (Sync-Domain)
     Einkaufs-Häkchen               → mm_simple_shopping (Sync-Domain)
     Entitlements                   → MM.account (server-granted, unverändert)
   ========================================================================== */
(function () {
  "use strict";
  if (!document.getElementById("sapp")) return;   // nur auf meinplan.html

  var store = MMSimple.store, model = MMSimple.model,
      input = MMSimple.input, engine = MMSimple.engine, weekly = MMSimple.weekly;

  /* ---------------- Helpers ---------------- */
  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function en() { return !!(window.MM && MM.i18n && MM.i18n.lang === "en"); }
  function tx(de, enTxt) { return en() ? (enTxt || de) : de; }
  function pick(obj) { if (obj == null) return ""; return typeof obj === "object" ? (en() ? (obj.en || obj.de) : obj.de) : obj; }
  function track(ev, props) { try { if (MM.track) MM.track(ev, props); } catch (e) {} }
  function todayYmd() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  var WD = { de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
  function wdName(i) { return (en() ? WD.en : WD.de)[i]; }

  /* ---------------- Daten ---------------- */
  function plan() { return store.getPlan(); }
  function activePlan() { var p = plan(); return p && p.status === "active" ? p : null; }
  function daylog() { return MM.store.get("simple_daylog", {}); }
  function saveDaylog(d) { MM.store.set("simple_daylog", d); }
  function dayEntry(ymd) { var d = daylog(); return d[ymd] || { tasks: {}, workout: null, closed: false }; }
  function setDayEntry(ymd, entry) { var d = daylog(); d[ymd] = entry; saveDaylog(d); }

  // Gewicht: GLEICHE Reihe wie OS v1 (mm_os_metrics)
  function metrics() { return MM.store.get("os_metrics", []); }
  function logWeight(kg, ymd) {
    if (!kg || isNaN(kg)) return false;
    var m = metrics();
    var entry = { type: "weight", value: parseFloat(kg), unit: "kg", date: ymd || todayYmd(), source: "simple" };
    var idx = -1;
    for (var i = 0; i < m.length; i++) if (m[i].type === "weight" && m[i].date === entry.date && m[i].source === entry.source) { idx = i; break; }
    if (idx >= 0) m[idx] = entry; else m.push(entry);
    MM.store.set("os_metrics", m);
    return true;
  }
  function weightSeries() {
    // je Tag der letzte Wert (Quelle egal) — für Trend/Fortschritt
    var byDate = {};
    metrics().forEach(function (x) { if (x.type === "weight" && x.date) byDate[x.date] = x.value; });
    return Object.keys(byDate).sort().map(function (d) { return { date: d, kg: byDate[d] }; });
  }

  function access() {
    try { return (MM.account && MM.account.getDashboardState) ? (MM.account.getDashboardState().access || {}) : {}; } catch (e) { return {}; }
  }
  function isCustomer() { var a = access(); return !!(a.protocol || a.twelve_week || a.coaching); }

  function dayNumber(p, ymd) {
    var ms = (new Date(ymd + "T12:00:00") - new Date(p.startDate + "T12:00:00"));
    return Math.floor(ms / 86400000) + 1;   // Tag 1 = startDate
  }
  function weekNumber(p, ymd) { return Math.ceil(dayNumber(p, ymd) / 7); }
  function weekInfo(p, ymd) {
    var wd = new Date(ymd + "T12:00:00").getDay();
    var info = null;
    (p.week || []).forEach(function (d) { if (d.weekday === wd) info = d; });
    return info;
  }
  function sessionForWeekday(p, wd) {
    var i = p.training.weekdays.indexOf(wd);
    if (i < 0) return null;
    return p.training.sessions[i % p.training.sessions.length];
  }
  function lastWorkoutFor(sessionKey, beforeYmd) {
    var d = daylog(), best = null;
    Object.keys(d).forEach(function (ymd) {
      var w = d[ymd] && d[ymd].workout;
      if (w && w.sessionKey === sessionKey && ymd < beforeYmd && (!best || ymd > best.ymd)) best = { ymd: ymd, w: w };
    });
    return best && best.w;
  }

  /* ================================================================
     ROUTER
     ================================================================ */
  var VIEWS = ["heute", "plan", "fortschritt", "profil", "einrichten", "check", "workout"];
  function view() {
    var h = (location.hash || "#heute").slice(1).split("?")[0];
    return VIEWS.indexOf(h) >= 0 ? h : "heute";
  }
  var root = document.getElementById("sapp");

  function render() {
    var v = view();
    var p = activePlan();
    if (!p && ["heute", "fortschritt", "check", "workout"].indexOf(v) >= 0) v = "einrichten";
    root.innerHTML = "";
    document.querySelectorAll(".s-nav a").forEach(function (a) {
      a.classList.toggle("on", a.getAttribute("href") === "#" + (v === "einrichten" ? "heute" : v));
    });
    if (v === "einrichten") vSetup();
    else if (v === "heute") vToday();
    else if (v === "plan") vPlan();
    else if (v === "fortschritt") vProgress();
    else if (v === "profil") vProfile();
    else if (v === "check") vCheck();
    else if (v === "workout") vWorkout();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", render);
  document.addEventListener("mm:langchange", render);
  document.addEventListener("mm:account", render);

  /* ================================================================
     EINRICHTEN — Ziel → Score → Planfragen → Vorschau → Aktivierung
     ================================================================ */
  var wizardAnswers = MM.store.get("simple_wizard_draft", {});
  function saveDraft() { MM.store.set("simple_wizard_draft", wizardAnswers); }

  function vSetup() {
    var tg = MM.store.get("transform_goal", null);
    var cr = MM.store.get("check_result", null);
    var draftPlan = plan();

    root.appendChild(el("h2", null, tx("Dein 12-Wochen-Plan", "Your 12-week plan")));
    root.appendChild(el("p", "s-sub", tx(
      "Das ist dein Ziel. Das wird dein Plan. Danach sagt dir MaleMetrix jeden Tag, was konkret zu tun ist.",
      "This is your goal. This becomes your plan. After that, MaleMetrix tells you every day exactly what to do.")));

    /* Bestandsmigration (Phase 7, nicht-destruktiv): Legacy-Daten erkennen,
       Snapshot sichern, Fragebogen aus zuverlässigen Daten vorbefüllen.
       Originaldaten werden nie verändert. */
    var mig = MMSimple.migration ? MMSimple.migration.detect() : { hasLegacy: false };
    if (mig.hasLegacy && MMSimple.migration.status() == null) {
      track("migration_started");
      var snapR = MMSimple.migration.captureSnapshot();
      var pre = MMSimple.migration.prefillFromLegacy();
      Object.keys(pre.answers).forEach(function (k) {
        if (wizardAnswers[k] == null) wizardAnswers[k] = pre.answers[k];
      });
      saveDraft();
      if (snapR.ok) track(snapR.snapshot && snapR.snapshot.migrationWarnings.length ? "migration_warning" : "migration_succeeded");
      var note = el("div", "s-note", tx(
        "Dein bisheriger MaleMetrix-Stand wurde erkannt und vollständig gesichert. Bekannte Angaben sind unten vorbefüllt — nichts geht verloren, die klassische Ansicht bleibt im Profil erreichbar.",
        "Your existing MaleMetrix data was detected and fully preserved. Known answers are prefilled below — nothing is lost, the classic view stays available in your profile."));
      if (mig.activeProgram && mig.programDay > 1 && mig.programDay <= 84) {
        note.innerHTML += "<br>" + esc(tx("Hinweis: Dein laufendes Programm (Tag " + mig.programDay + ") bleibt in der klassischen Ansicht vollständig erhalten; der neue Plan zählt ab seinem Start neu.",
          "Note: your running program (day " + mig.programDay + ") stays fully intact in the classic view; the new plan counts from its own start."));
      }
      root.appendChild(note);
    }

    var stepIdx = !tg ? 0 : (!wizardAnswers._questionsDone ? 1 : (draftPlan && draftPlan.status === "draft" ? 3 : 2));
    var steps = el("div", "s-steps");
    for (var i = 0; i < 4; i++) steps.appendChild(el("i", i <= stepIdx ? "on" : ""));
    root.appendChild(steps);

    /* Schritt 1 — Ziel */
    var goal = el("div", "s-card");
    if (tg && tg.current_kg != null && tg.target_kg != null) {
      goal.appendChild(el("h3", null, tx("1 · Dein Ziel", "1 · Your goal") + " ✓"));
      goal.appendChild(el("p", null, "<strong>" + esc(tg.current_kg) + " kg → " + esc(tg.target_kg) + " kg</strong>"));
      goal.appendChild(el("p", "hint", tx("Aus deiner Transformation übernommen. Anderes Ziel? Transformation erneut durchlaufen.",
        "Taken from your transformation. Different goal? Run the transformation again.")));
      store.setFunnelStep("goal_selected");
    } else {
      goal.appendChild(el("h3", null, tx("1 · Wähle dein Ziel", "1 · Choose your goal")));
      goal.appendChild(el("p", "hint", tx("Die Transformation zeigt dir zwei realistische Zielbilder — du wählst eines.",
        "The transformation shows you two realistic target states — you pick one.")));
      var a1 = el("a", "btn btn-primary", tx("Transformation starten", "Start the transformation"));
      a1.href = "transformation.html";
      goal.appendChild(a1);
    }
    root.appendChild(goal);

    /* Schritt 2 — Score */
    var sc = el("div", "s-card");
    if (cr && cr.bottleneck) {
      var mapped = input.mapScore(cr);
      sc.appendChild(el("h3", null, tx("2 · Dein Engpass", "2 · Your bottleneck") + " ✓"));
      sc.appendChild(el("p", null, esc(en() ? (input.SCORE_RULES[mapped.primaryBottleneck] || {}).consequenceEn || "" : mapped.consequence || "")));
      store.setFunnelStep("score_done");
    } else if (tg) {
      sc.appendChild(el("h3", null, tx("2 · Score (empfohlen)", "2 · Score (recommended)")));
      sc.appendChild(el("p", "hint", tx("Der Score erkennt, was deinen Fortschritt am stärksten begrenzt — das fließt direkt in deinen Plan ein. Ohne Score gelten Standard-Leitplanken.",
        "The score detects what limits your progress the most — it flows straight into your plan. Without it, default guardrails apply.")));
      var a2 = el("a", "btn btn-ghost btn-sm", tx("Score machen (10 Min)", "Take the score (10 min)"));
      a2.href = "check.html";
      sc.appendChild(a2);
    } else {
      sc.appendChild(el("h3", "hint", tx("2 · Score", "2 · Score")));
    }
    root.appendChild(sc);

    /* Schritt 3 — Planfragen */
    if (tg) {
      var qCard = el("div", "s-card");
      qCard.appendChild(el("h3", null, tx("3 · Wenige Planfragen", "3 · A few plan questions")));
      qCard.appendChild(el("p", "hint", tx("Nur was wirklich fehlt — jede Frage verändert deinen Plan.", "Only what's actually missing — every question changes your plan.")));
      var qs = input.questionsFor({ tg: tg, trf: input.mapTransformation(tg), answers: wizardAnswers });
      var shown = 0;
      qs.forEach(function (q) {
        var wrap = el("div", "s-q");
        wrap.appendChild(el("div", "lbl", esc(en() ? q.labelEn : q.label) + (q.prefilled ? " ✓" : "")));
        wrap.appendChild(el("div", "why", tx("Warum: ", "Why: ") + esc(en() ? q.whyEn : q.why)));
        var val = wizardAnswers[q.id] != null ? wizardAnswers[q.id] : q.value;
        if (q.type === "choice" || q.type === "weekday") {
          var opts = el("div", "opts");
          var options = q.type === "weekday" ? [0, 1, 2, 3, 4, 5, 6] : q.options;
          options.forEach(function (o) {
            var b = el("button", String(val) === String(o) ? "on" : "", q.type === "weekday" ? wdName(o) : esc(labelFor(q.id, o)));
            b.type = "button";
            b.addEventListener("click", function () { wizardAnswers[q.id] = o; saveDraft(); render(); });
            opts.appendChild(b);
          });
          wrap.appendChild(opts);
        } else if (q.type === "weekdays" || q.type === "multi") {
          var cur = Array.isArray(val) ? val.slice() : [];
          var opts2 = el("div", "opts");
          var options2 = q.type === "weekdays" ? [1, 2, 3, 4, 5, 6, 0] : q.options;
          options2.forEach(function (o) {
            var b = el("button", cur.indexOf(o) >= 0 ? "on" : "", q.type === "weekdays" ? wdName(o) : esc(labelFor(q.id, o)));
            b.type = "button";
            b.addEventListener("click", function () {
              var ix = cur.indexOf(o);
              if (ix >= 0) cur.splice(ix, 1); else cur.push(o);
              wizardAnswers[q.id] = cur.slice(); saveDraft(); render();
            });
            opts2.appendChild(b);
          });
          wrap.appendChild(opts2);
        } else {
          var inp = el("input");
          inp.type = q.type === "time" ? "time" : "number";
          if (q.min != null) inp.min = q.min;
          if (q.max != null) inp.max = q.max;
          inp.value = val != null ? val : "";
          inp.addEventListener("change", function () {
            wizardAnswers[q.id] = q.type === "time" ? inp.value : parseFloat(inp.value);
            saveDraft();
          });
          wrap.appendChild(inp);
        }
        qCard.appendChild(wrap);
        shown++;
      });
      if (shown && !wizardAnswers._started) { wizardAnswers._started = 1; saveDraft(); track("plan_questions_started"); store.setFunnelStep("questions_done", {}); }

      var err = el("p", "s-err"); err.style.display = "none";
      var goPrev = el("button", "btn btn-primary", tx("Zur Planvorschau", "See plan preview"));
      goPrev.addEventListener("click", function () {
        var collected = input.collect({ transformGoal: tg, checkResult: cr, answers: wizardAnswers });
        if (!collected.ok) {
          err.textContent = tx("Es fehlt noch: ", "Still missing: ") + collected.missing.join(", ");
          err.style.display = "";
          return;
        }
        var r = engine.createPlan(collected, todayYmd());
        if (!r.ok) { err.textContent = r.errors.join("; "); err.style.display = ""; return; }
        wizardAnswers._questionsDone = 1; saveDraft();
        track("plan_questions_completed");
        var ad = store.adoptPlan(r.plan, { force: plan() && plan().status === "draft" });
        if (!ad.ok) { err.textContent = ad.errors.join("; "); err.style.display = ""; return; }
        store.setFunnelStep("preview_seen");
        track("plan_preview_seen");
        render();
      });
      qCard.appendChild(goPrev);
      qCard.appendChild(err);
      root.appendChild(qCard);
    }

    /* Schritt 4 — Vorschau + Aktivierung */
    var dp = plan();
    if (dp && dp.status === "draft") {
      var pv = el("div", "s-card");
      pv.appendChild(el("h3", null, tx("4 · Deine 12-Wochen-Vorschau", "4 · Your 12-week preview")));
      var st = dp.selectedTransformation, pg = dp.phaseGoal;
      pv.appendChild(el("p", null,
        "<strong>" + tx("Gesamtziel", "Overall goal") + ":</strong> " + st.finalTargetWeightKg + " kg " +
        tx("in ehrlich ~", "in an honest ~") + st.expectedTotalWeeks + " " + tx("Wochen", "weeks") + "<br>" +
        (pg.isFinalPhase
          ? "<strong>" + tx("Diese 12 Wochen", "These 12 weeks") + ":</strong> " + tx("dein Ziel liegt in dieser Phase", "your goal sits inside this phase") + " (" + pg.week12TargetMinKg + "–" + pg.week12TargetMaxKg + " kg)"
          : "<strong>" + tx("Phase 1 (12 Wochen)", "Phase 1 (12 weeks)") + ":</strong> " + pg.week12TargetMinKg + "–" + pg.week12TargetMaxKg + " kg")));
      pv.appendChild(el("p", "hint",
        dp.nutrition.calorieTarget + " kcal · " + dp.nutrition.proteinTargetGrams + " g " + tx("Protein", "protein") + " · " +
        dp.training.daysPerWeek + "× " + tx("Training", "training") + " (" + dp.training.weekdays.map(wdName).join(", ") + ") · " +
        dp.dailyTargets.steps + " " + tx("Schritte", "steps")));
      if (dp.scoreContext && dp.scoreContext.consequence) pv.appendChild(el("div", "s-note", esc(dp.scoreContext.consequence)));
      if (dp.scoreContext && dp.scoreContext.medicalCautions && dp.scoreContext.medicalCautions.length) {
        pv.appendChild(el("div", "s-note warn", tx(
          "Dein Score enthielt Warnsignale. Der Plan ist bewusst konservativ — bitte lass die Punkte ärztlich abklären.",
          "Your score contained warning signs. The plan is deliberately conservative — please get these checked by a doctor.")));
      }

      if (isCustomer()) {
        var act = el("button", "btn btn-primary", tx("Plan aktivieren — Woche 1 beginnt heute", "Activate plan — week 1 starts today"));
        act.addEventListener("click", function () {
          var p2 = plan();
          p2.status = "active";
          p2.startDate = todayYmd();
          p2.endDate = model.addDays(p2.startDate, 83);
          store.adoptPlan(p2, { force: true });
          store.setFunnelStep("plan_active");
          track("plan_activated"); track("plan_created");
          // Bestandsnutzer: Migrationsstatus festschreiben (§27.5-Referenzen)
          if (MMSimple.migration && MMSimple.migration.detect().hasLegacy) {
            MMSimple.migration.markMigrated(p2, store.getSnapshot());
          }
          location.hash = "#heute";
        });
        pv.appendChild(act);
      } else {
        pv.appendChild(el("p", null, tx(
          "Der vollständige Plan (Training, Mahlzeiten, Einkaufsliste, tägliche Führung, Wochenanpassung) ist Teil von <strong>DAS PROTOKOLL</strong> — einmalig, kein Abo. Bereits gekauft? Einloggen genügt.",
          "The full plan (training, meals, shopping list, daily guidance, weekly adjustment) is part of <strong>DAS PROTOKOLL</strong> — one-time, no subscription. Already bought it? Just sign in.")));
        var buy = el("a", "btn btn-primary", tx("Plan freischalten", "Unlock the plan"));
        buy.href = "protokoll.html";
        buy.setAttribute("data-track", "simple_unlock_cta");
        pv.appendChild(buy);
        var login = el("a", "btn btn-ghost btn-sm", tx("Einloggen", "Sign in"));
        login.href = "mein-protokoll.html?legacy=1#settings";
        login.style.marginLeft = "10px";
        pv.appendChild(login);
      }
      root.appendChild(pv);
    }
  }

  function labelFor(qid, o) {
    var L2 = {
      activity: { sitzend: tx("sitzend", "sedentary"), leicht: tx("leicht aktiv", "lightly active"), moderat: tx("moderat", "moderate"), hoch: tx("sehr aktiv", "very active") },
      location: { gym: "Gym", home: tx("Zuhause", "Home") },
      experience: { neu: tx("< 1 Jahr", "< 1 year"), mid: tx("1–4 Jahre", "1–4 years"), pro: tx("4+ Jahre", "4+ years") },
      diet: { misch: tx("Mischkost", "Mixed"), veggie: tx("Vegetarisch", "Vegetarian") },
      workPattern: { day: tx("Tagschicht", "Day"), shift: tx("Schichtarbeit", "Shifts"), free: tx("Flexibel", "Flexible") },
      exclusions: { fisch: tx("Fisch", "Fish"), schwein: tx("Schwein", "Pork"), milch: tx("Milchprodukte", "Dairy"), eier: tx("Eier", "Eggs"), gluten: "Gluten", nuesse: tx("Nüsse", "Nuts"), soja: tx("Soja", "Soy") },
      injuries: { schulter: tx("Schulter", "Shoulder"), knie: tx("Knie", "Knee"), ruecken: tx("Rücken", "Back"), huefte: tx("Hüfte", "Hip"), handgelenk: tx("Handgelenk", "Wrist") }
    };
    return (L2[qid] && L2[qid][o] != null) ? L2[qid][o] : String(o);
  }

  /* ================================================================
     HEUTE
     ================================================================ */
  function vToday() {
    var p = activePlan();
    var ymd = todayYmd();
    var day = dayNumber(p, ymd), week = weekNumber(p, ymd);
    var entry = dayEntry(ymd);
    track("today_opened");

    if (day > 84) { vCompleted(p); return; }
    if (day < 1) { root.appendChild(el("div", "s-card", tx("Dein Plan startet am ", "Your plan starts on ") + p.startDate + ".")); return; }

    var info = weekInfo(p, ymd) || {};
    var isDeload = p.training.deloadWeeks.indexOf(week) >= 0;
    var session = info.training ? sessionForWeekday(p, new Date(ymd + "T12:00:00").getDay()) : null;

    /* Kopf */
    var head = el("div", "s-head");
    head.appendChild(el("span", "k", tx("Woche", "Week") + " " + week + " · " + tx("Tag", "Day") + " " + day + " / 84" + (isDeload ? " · " + tx("reduzierte Woche", "deload week") : "")));
    var st = p.selectedTransformation, pg = p.phaseGoal;
    head.appendChild(el("div", "goal", st.finalTargetWeightKg + " kg" +
      (pg.isFinalPhase ? "" : " <span style='color:var(--muted);font-weight:400'>· " + tx("Phase 1 bis", "phase 1 to") + " " + pg.week12TargetMinKg + "–" + pg.week12TargetMaxKg + " kg</span>")));
    var tr = weekly.trend(weightSeries(), ymd);
    if (tr) {
      var target = weekly.plannedRate(p) || 0;
      var onTrack = Math.abs(tr.deltaPerWeek - target) <= Math.max(0.15, Math.abs(target) * 0.4);
      var s = el("div", "status" + (onTrack ? "" : " warn"),
        onTrack ? tx("Du bist auf Kurs.", "You are on track.")
                : tx("Trend weicht ab — der Wochencheck prüft das.", "Trend deviates — the weekly check will look at it."));
      head.appendChild(s);
    }
    root.appendChild(head);

    /* Maximal drei primäre Aufgaben */
    var tasks = [];
    if (session) {
      tasks.push({ id: "training", b: (pick(session.name)) + " " + tx("absolvieren", "complete"), s: isDeload ? tx("Reduzierte Woche: 1 Satz weniger, ~80 % Last", "Deload: one set less, ~80% load") : tx("Progression: 1 Wiederholung mehr als letztes Mal", "Progression: one more rep than last time"), go: "#workout" });
    } else {
      tasks.push({ id: "movement", b: tx("30 Minuten gehen", "Walk 30 minutes"), s: tx("Ruhetag — Bewegung statt Training", "Rest day — movement instead of training") });
    }
    tasks.push({ id: "protein", b: tx("Mindestens ", "At least ") + p.nutrition.proteinTargetGrams + " g " + tx("Protein erreichen", "of protein"), s: tx("Mahlzeiten ansehen unter Mein Plan", "See meals under My Plan"), go: "#plan" });
    tasks.push({ id: "steps", b: p.dailyTargets.steps + " " + tx("Schritte erreichen", "steps"), s: null });

    var list = el("div", "s-tasks");
    tasks.slice(0, 3).forEach(function (t) {
      var done = !!entry.tasks[t.id];
      var row = el("div", "s-task" + (done ? " done" : ""));
      row.appendChild(el("span", "box", "✓"));
      var tt = el("div", "t");
      tt.appendChild(el("b", null, esc(t.b)));
      if (t.s) tt.appendChild(el("span", null, esc(t.s)));
      row.appendChild(tt);
      if (t.go && !done) { var go = el("span", "go", t.id === "training" ? tx("Starten →", "Start →") : tx("Ansehen →", "View →")); row.appendChild(go); }
      row.addEventListener("click", function (ev2) {
        if (t.id === "training" && !done) { location.hash = "#workout"; return; }
        entry.tasks[t.id] = !done;
        setDayEntry(ymd, entry);
        render();
      });
      list.appendChild(row);
    });
    root.appendChild(list);

    /* Sekundäres als Chips — nie mehr als nötig */
    var chips = el("div", "s-chips");
    function chip(id, label, on, fn) {
      var c = el("button", "s-chip" + (on ? " on" : ""), esc(label));
      c.addEventListener("click", fn);
      chips.appendChild(c);
    }
    var wd = new Date(ymd + "T12:00:00").getDay();
    if (p.dailyTargets.weighInWeekdays.indexOf(wd) >= 0) {
      var todaysWeight = weightSeries().filter(function (w) { return w.date === ymd; })[0];
      chip("weigh", todaysWeight ? ("⚖ " + todaysWeight.kg + " kg ✓") : tx("⚖ Gewicht eintragen", "⚖ Log weight"), !!todaysWeight, function () {
        var v = prompt(tx("Gewicht heute (kg):", "Weight today (kg):"));
        if (v) { logWeight(parseFloat(String(v).replace(",", ".")), ymd); render(); }
      });
    }
    if (info.shopping) chip("shop", tx("🛒 Einkaufstag", "🛒 Shopping day"), !!entry.tasks.shopping, function () { location.hash = "#plan"; MM.store.set("simple_plan_tab", "einkauf"); render(); });
    if (info.mealPrep) chip("prep", tx("🍳 Meal-Prep", "🍳 Meal prep"), !!entry.tasks.prep, function () { entry.tasks.prep = !entry.tasks.prep; setDayEntry(ymd, entry); render(); });
    if (info.review && week >= 2) chip("review", tx("📋 Wochencheck fällig", "📋 Weekly check due"), false, function () { location.hash = "#check"; });
    if ([1, 22, 50, 78].indexOf(day) >= 0) {
      chip("photo", tx("📷 Fortschrittsfoto (bleibt auf deinem Gerät)", "📷 Progress photo (stays on your device)"), !!entry.tasks.photo, function () {
        entry.tasks.photo = !entry.tasks.photo; setDayEntry(ymd, entry); render();
      });
    }
    root.appendChild(chips);

    /* Tagesabschluss */
    var closeBtn = el("button", "btn " + (entry.closed ? "btn-ghost btn-sm" : "btn-dark"), entry.closed ? tx("Tag abgeschlossen ✓", "Day closed ✓") : tx("Tag abschließen", "Close the day"));
    closeBtn.style.marginTop = "14px";
    closeBtn.addEventListener("click", function () {
      if (entry.closed) return;
      entry.closed = true;
      setDayEntry(ymd, entry);
      track("day_closed");
      render();
    });
    root.appendChild(closeBtn);
  }

  function vCompleted(p) {
    root.appendChild(el("h2", null, tx("12 Wochen geschafft.", "12 weeks done.")));
    var series = weightSeries();
    var startW = p.selectedTransformation.startWeightKg;
    var lastW = series.length ? series[series.length - 1].kg : null;
    root.appendChild(el("div", "s-card",
      (lastW != null ? "<p><strong>" + startW + " kg → " + lastW + " kg</strong></p>" : "") +
      "<p>" + tx("Dein Programm ist abgeschlossen. Unter Fortschritt siehst du die ganze Strecke. Wenn dein Gesamtziel noch offen ist, startest du die nächste Phase mit einem frischen Wochencheck-Stand — dein bisheriger Verlauf bleibt erhalten.",
        "Your program is complete. Progress shows the whole journey. If your overall goal is still open, start the next phase fresh — your history stays.") + "</p>"));
    var next = el("button", "btn btn-primary", tx("Nächste 12-Wochen-Phase planen", "Plan the next 12-week phase"));
    next.addEventListener("click", function () {
      var cur = plan();
      cur.status = "completed";
      store.adoptPlan(cur, { force: true });
      track("program_completed");
      MM.store.set("simple_wizard_draft", {});
      location.hash = "#einrichten"; render();
    });
    root.appendChild(next);
  }

  /* ================================================================
     WORKOUT — Training starten, abhaken, eintragen
     ================================================================ */
  function vWorkout() {
    var p = activePlan();
    var ymd = todayYmd();
    var wd = new Date(ymd + "T12:00:00").getDay();
    var session = sessionForWeekday(p, wd);
    var entry = dayEntry(ymd);
    if (!session) { location.hash = "#heute"; return; }
    if (!entry.workout) {
      entry.workout = { sessionKey: session.key, short: false, entries: {} };
      track("workout_started");
    }
    var w = entry.workout;
    var last = lastWorkoutFor(session.key, ymd);
    var week = weekNumber(p, ymd);
    var isDeload = p.training.deloadWeeks.indexOf(week) >= 0;

    root.appendChild(el("h2", null, esc(pick(session.name))));
    root.appendChild(el("p", "s-sub",
      (isDeload ? tx("Reduzierte Woche: ein Satz weniger, ~80 % Last. ", "Deload: one set less, ~80% load. ") : "") +
      tx("Doppelte Progression: erst Wiederholungen, dann Gewicht.", "Double progression: reps first, then load.")));

    var shortBtn = el("button", "s-chip" + (w.short ? " on" : ""), w.short ? tx("Kurze Version aktiv (~25 Min) ✓", "Short version on (~25 min) ✓") : tx("Wenig Zeit? Kurze Version", "Short on time? Short version"));
    shortBtn.addEventListener("click", function () { w.short = !w.short; setDayEntry(ymd, entry); render(); });
    root.appendChild(shortBtn);

    var card = el("div", "s-card");
    session.exercises.forEach(function (ex) {
      if (w.short && !ex.inShort) return;
      var e = w.entries[ex.id] || { setsDone: 0, weightKg: null, reps: null, sub: false };
      var sets = w.short ? Math.min(2, ex.sets) : (isDeload ? Math.max(1, ex.sets - 1) : ex.sets);
      var row = el("div", "s-ex");
      var n = el("div", "n");
      var last4 = last && last.entries && last.entries[ex.id];
      n.appendChild(el("b", null, esc(en() ? ex.nameEn : ex.name) + (ex.inShort ? " <span class='short-mark'>KURZ</span>" : "")));
      n.appendChild(el("span", null, sets + " × " + ex.repsLo + "–" + ex.repsHi + " · RIR " + ex.rir + " · " + tx("Pause", "rest") + " " + ex.restSec + " s" +
        (last4 && last4.weightKg ? " · " + tx("letztes Mal", "last time") + ": " + last4.weightKg + " kg × " + (last4.reps || "?") : "")));
      row.appendChild(n);
      var wIn = el("input"); wIn.type = "number"; wIn.step = "0.5"; wIn.placeholder = "kg";
      wIn.value = e.weightKg != null ? e.weightKg : (last4 && last4.weightKg != null ? last4.weightKg : "");
      wIn.addEventListener("change", function () { e.weightKg = parseFloat(wIn.value) || null; w.entries[ex.id] = e; setDayEntry(ymd, entry); });
      var rIn = el("input"); rIn.type = "number"; rIn.placeholder = tx("Wdh", "reps");
      rIn.value = e.reps != null ? e.reps : "";
      rIn.addEventListener("change", function () { e.reps = parseInt(rIn.value, 10) || null; w.entries[ex.id] = e; setDayEntry(ymd, entry); });
      row.appendChild(wIn); row.appendChild(rIn);
      var sb = el("div", "setbox");
      for (var si = 1; si <= sets; si++) {
        (function (si2) {
          var b = el("button", e.setsDone >= si2 ? "on" : "", String(si2));
          b.addEventListener("click", function () { e.setsDone = e.setsDone >= si2 ? si2 - 1 : si2; w.entries[ex.id] = e; setDayEntry(ymd, entry); render(); });
          sb.appendChild(b);
        })(si);
      }
      row.appendChild(sb);
      if (ex.substitute) {
        var sel = el("select");
        var o1 = el("option"); o1.value = ""; o1.textContent = tx("Übung ok", "Exercise ok");
        var o2 = el("option"); o2.value = "sub"; o2.textContent = tx("Ersatz: ", "Swap: ") + (en() ? ex.substitute.nameEn : ex.substitute.name);
        sel.appendChild(o1); sel.appendChild(o2);
        sel.value = e.sub ? "sub" : "";
        sel.addEventListener("change", function () { e.sub = sel.value === "sub"; w.entries[ex.id] = e; setDayEntry(ymd, entry); });
        row.appendChild(sel);
      }
      card.appendChild(row);
    });
    root.appendChild(card);

    var doneBtn = el("button", "btn btn-primary", tx("Training abschließen", "Finish workout"));
    doneBtn.addEventListener("click", function () {
      entry.tasks.training = true;
      setDayEntry(ymd, entry);
      track("workout_completed");
      location.hash = "#heute";
    });
    root.appendChild(doneBtn);
    var back = el("a", "btn btn-ghost btn-sm", tx("Zurück", "Back"));
    back.href = "#heute"; back.style.marginLeft = "10px";
    root.appendChild(back);
  }

  /* ================================================================
     MEIN PLAN — Woche · Training · Ernährung · Einkauf · iPhone
     ================================================================ */
  function vPlan() {
    var p = activePlan() || plan();
    if (!p) { location.hash = "#einrichten"; return; }
    root.appendChild(el("h2", null, tx("Mein Plan", "My plan")));
    var tabs = ["woche", "training", "ernaehrung", "einkauf", "iphone"];
    var names = { woche: tx("Woche", "Week"), training: "Training", ernaehrung: tx("Ernährung", "Nutrition"), einkauf: tx("Einkauf", "Shopping"), iphone: "iPhone" };
    var cur = MM.store.get("simple_plan_tab", "woche");
    if (tabs.indexOf(cur) < 0) cur = "woche";
    var bar = el("div", "s-subtabs");
    tabs.forEach(function (t) {
      var b = el("button", t === cur ? "on" : "", esc(names[t]));
      b.addEventListener("click", function () { MM.store.set("simple_plan_tab", t); render(); });
      bar.appendChild(b);
    });
    root.appendChild(bar);
    if (cur === "woche") subWeek(p);
    else if (cur === "training") subTraining(p);
    else if (cur === "ernaehrung") subNutrition(p);
    else if (cur === "einkauf") subShopping(p);
    else if (cur === "iphone") subIphone(p);
  }

  function subWeek(p) {
    var wrap = el("div", "s-week");
    var todayWd = new Date().getDay();
    var order = [1, 2, 3, 4, 5, 6, 0];
    order.forEach(function (wd) {
      var d = (p.week || []).filter(function (x) { return x.weekday === wd; })[0] || {};
      var row = el("div", "d" + (wd === todayWd ? " today" : ""));
      row.appendChild(el("span", "wd", wdName(wd)));
      var what = [];
      if (d.training) { var s = sessionForWeekday(p, wd); what.push("💪 " + (s ? pick(s.name) : "Training")); }
      else what.push(tx("Bewegung / Schritte", "Movement / steps"));
      row.appendChild(el("span", "what", esc(what.join(" · "))));
      var tags = [];
      if (d.shopping) tags.push(tx("Einkauf", "Shopping"));
      if (d.mealPrep) tags.push("Prep");
      if (d.review) tags.push(tx("Wochencheck", "Check"));
      if (tags.length) row.appendChild(el("span", "tag", esc(tags.join(" · "))));
      wrap.appendChild(row);
    });
    root.appendChild(wrap);
  }

  function subTraining(p) {
    var t = p.training;
    root.appendChild(el("p", "s-sub", t.daysPerWeek + "× " + tx("pro Woche", "per week") + " · " + t.weekdays.map(wdName).join(", ") + " · " + (t.location === "home" ? tx("Zuhause", "Home") : "Gym") + " · max. " + t.maximumSessionMinutes + " min"));
    t.sessions.forEach(function (s) {
      var c = el("div", "s-card");
      c.appendChild(el("h3", null, esc(pick(s.name))));
      s.exercises.forEach(function (ex) {
        var row = el("div", "s-ex");
        var n = el("div", "n");
        n.appendChild(el("b", null, esc(en() ? ex.nameEn : ex.name) + (ex.inShort ? " <span class='short-mark'>" + tx("KURZVERSION", "SHORT") + "</span>" : "")));
        n.appendChild(el("span", null, ex.sets + " × " + ex.repsLo + "–" + ex.repsHi + " · RIR " + ex.rir + " · " + ex.restSec + " s" +
          (ex.substitute ? " · " + tx("Ersatz", "swap") + ": " + esc(en() ? ex.substitute.nameEn : ex.substitute.name) : "")));
        row.appendChild(n);
        c.appendChild(row);
      });
      root.appendChild(c);
    });
    var rules = el("div", "s-card");
    rules.appendChild(el("h3", null, tx("Regeln", "Rules")));
    [t.progressionRule, t.deloadRule, t.shortVersionRule, t.travelRule, t.comebackRule].forEach(function (r) {
      rules.appendChild(el("p", "hint", "• " + esc(pick(r))));
    });
    rules.appendChild(el("p", "hint", tx("Reduzierte Wochen: ", "Deload weeks: ") + t.deloadWeeks.join(", ")));
    root.appendChild(rules);
  }

  function subNutrition(p) {
    var n = p.nutrition;
    root.appendChild(el("p", "s-sub",
      n.calorieTarget + " kcal (" + n.calorieRangeMin + "–" + n.calorieRangeMax + ") · " +
      n.proteinTargetGrams + " g " + tx("Protein", "protein") + " · " + n.mealCount + " " + tx("Mahlzeiten", "meals")));
    (n.meals || []).forEach(function (m, mi) {
      var slotNames = { breakfast: tx("Frühstück", "Breakfast"), lunch: tx("Mittagessen", "Lunch"), dinner: tx("Abendessen", "Dinner"), snack: "Snack" };
      var card = el("div", "s-meal");
      card.appendChild(el("div", "slot", esc(slotNames[m.slot] || m.slot) + " · ~" + m.targetKcal + " kcal"));
      m.options.forEach(function (o) {
        var chosenId = (n.mealTemplateIds[mi] || "").split("@")[0];
        var isChosen = o.blockId === chosenId;
        var opt = el("div", "opt" + (isChosen ? " chosen" : ""));
        var row = el("div", "row");
        row.appendChild(el("b", null, esc(pick(o.name))));
        row.appendChild(el("span", "kp", o.kcal + " kcal · " + o.protein + " g P"));
        opt.appendChild(row);
        opt.appendChild(el("div", "items", o.items.map(function (i) { return esc(en() ? i.nameEn : i.name) + " " + i.grams + " g"; }).join(" · ")));
        opt.appendChild(el("div", "prep", esc(pick(o.prep))));
        if (!isChosen) {
          var pickBtn = el("button", "btn btn-ghost btn-sm", tx("Diese Option wählen", "Choose this option"));
          pickBtn.addEventListener("click", function () {
            var cur2 = plan();
            cur2.nutrition.mealTemplateIds[mi] = o.blockId + "@" + o.factor;
            store.adoptPlan(cur2, { force: true });   // Bausteinwahl ist Präferenz, keine Planversion
            render();
          });
          opt.appendChild(pickBtn);
        }
        card.appendChild(opt);
      });
      root.appendChild(card);
    });
    var rules = el("div", "s-card");
    rules.appendChild(el("h3", null, tx("Praktische Regeln", "Practical rules")));
    (n.practicalRules || []).forEach(function (r) {
      rules.appendChild(el("p", "hint", "<strong>" + esc(pick(r.name)) + ":</strong> " + esc(pick(r.rule))));
    });
    rules.appendChild(el("p", "hint", esc(pick(n.hydration))));
    root.appendChild(rules);
  }

  function subShopping(p) {
    var list = engine.shoppingList(p.nutrition);
    var checks = MM.store.get("simple_shopping", {});
    var weekKey = p.startDate + ":w" + weekNumber(p, todayYmd());
    checks[weekKey] = checks[weekKey] || {};
    var wrap = el("div", "s-shop");
    wrap.appendChild(el("p", "s-sub", tx("Für 7 Tage aus deinen gewählten Mahlzeiten", "For 7 days from your chosen meals") + (list.persons > 1 ? " · " + list.persons + " " + tx("Personen", "people") : "")));
    list.categories.forEach(function (c) {
      wrap.appendChild(el("div", "cat", esc(pick(c.name))));
      c.items.forEach(function (it) {
        var lab = el("label", checks[weekKey][it.foodId] ? "done" : "");
        var cb = el("input"); cb.type = "checkbox"; cb.checked = !!checks[weekKey][it.foodId];
        cb.addEventListener("change", function () {
          checks[weekKey][it.foodId] = cb.checked;
          MM.store.set("simple_shopping", checks);
          lab.classList.toggle("done", cb.checked);
        });
        lab.appendChild(cb);
        lab.appendChild(el("span", null, esc(en() ? it.nameEn : it.name)));
        var amount = it.grams >= 1000 ? (Math.round(it.grams / 100) / 10) + " kg" : it.grams + " g";
        lab.appendChild(el("span", "amt", amount));
        wrap.appendChild(lab);
      });
    });
    root.appendChild(wrap);

    var actions = el("div", "s-actions");
    var copyBtn = el("button", "btn btn-ghost btn-sm", tx("Kopieren", "Copy"));
    copyBtn.addEventListener("click", function () {
      var txt = engine.shoppingListText(list, en() ? "en" : "de");
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
        copyBtn.textContent = tx("Kopiert ✓", "Copied ✓");
      }).catch(function () { window.prompt(tx("Manuell kopieren:", "Copy manually:"), txt); });
      track("shopping_copied");
    });
    actions.appendChild(copyBtn);
    if (navigator.share) {
      var shareBtn = el("button", "btn btn-ghost btn-sm", tx("Teilen", "Share"));
      shareBtn.addEventListener("click", function () {
        navigator.share({ title: "MaleMetrix", text: engine.shoppingListText(list, en() ? "en" : "de") }).then(function () { track("shopping_shared"); }).catch(function () {});
      });
      actions.appendChild(shareBtn);
    }
    root.appendChild(actions);
  }

  function subIphone(p) {
    // Phase 6 füllt diesen Bereich (Kalender, PWA, Erinnerungen, Notizen).
    if (MMSimple.iphone && MMSimple.iphone.render) { MMSimple.iphone.render(root, p); return; }
    root.appendChild(el("div", "s-card", tx("Die iPhone-Einrichtung (Kalender, Web-App, Erinnerungen) folgt in diesem Bereich.", "iPhone setup (calendar, web app, reminders) lives here.")));
  }

  /* ================================================================
     FORTSCHRITT
     ================================================================ */
  function vProgress() {
    var p = activePlan();
    var ymd = todayYmd();
    var series = weightSeries();
    var st = p.selectedTransformation, pg = p.phaseGoal;
    root.appendChild(el("h2", null, tx("Fortschritt", "Progress")));

    var startW = st.startWeightKg;
    var curW = series.length ? series[series.length - 1].kg : null;
    var tr = weekly.trend(series, ymd);

    var grid = el("div", "s-stat");
    function cell(v, l) { var c = el("div", "cell"); c.appendChild(el("div", "v", v)); c.appendChild(el("div", "l", l)); grid.appendChild(c); }
    cell(startW + " kg", tx("Start", "Start"));
    cell(curW != null ? curW + " kg" : "—", tx("Aktuell", "Current"));
    cell(pg.week12TargetMinKg + "–" + pg.week12TargetMaxKg + " kg", tx("Ziel Woche 12", "Week-12 target"));
    cell(st.finalTargetWeightKg + " kg", tx("Gesamtziel (~" + st.expectedTotalWeeks + " Wo.)", "Overall (~" + st.expectedTotalWeeks + " wks)"));
    root.appendChild(grid);

    /* Aussage — geglättet, keine Ein-Punkt-Panik */
    if (tr) {
      var target = weekly.plannedRate(p) || 0;
      var onTrack = Math.abs(tr.deltaPerWeek - target) <= Math.max(0.15, Math.abs(target) * 0.4);
      root.appendChild(el("div", "s-note" + (onTrack ? "" : " warn"),
        onTrack ? tx("Du bist aktuell auf Kurs (Trend " + tr.deltaPerWeek + " kg/Woche).", "You're currently on track (trend " + tr.deltaPerWeek + " kg/week).")
                : tx("Dein Trend (" + tr.deltaPerWeek + " kg/Woche) liegt außerhalb des Zielkorridors. Im Wochencheck prüfen wir Umsetzung, Kalorien und Schritte.",
                    "Your trend (" + tr.deltaPerWeek + " kg/week) sits outside the corridor. The weekly check will look at execution, calories and steps.")));
    } else {
      root.appendChild(el("div", "s-note", tx("Noch zu wenige Gewichtsdaten für einen Trend — wiege dich an deinen festen Wiege-Tagen.", "Not enough weight data for a trend yet — weigh in on your fixed days.")));
    }

    /* Training: geplant vs. absolviert (keine Streaks) */
    var d = daylog();
    var planned = 0, done = 0;
    var week = Math.min(weekNumber(p, ymd), 12);
    for (var day = 1; day <= Math.min(dayNumber(p, ymd), 84); day++) {
      var dy = model.addDays(p.startDate, day - 1);
      var wd2 = new Date(dy + "T12:00:00").getDay();
      if (p.training.weekdays.indexOf(wd2) >= 0) {
        planned++;
        if (d[dy] && d[dy].tasks && d[dy].tasks.training) done++;
      }
    }
    var tc = el("div", "s-card");
    tc.appendChild(el("h3", null, tx("Training", "Training")));
    tc.appendChild(el("p", null, done + " / " + planned + " " + tx("geplante Einheiten absolviert", "planned sessions completed") + (planned ? " (" + Math.round(done / planned * 100) + " %)" : "")));
    tc.appendChild(el("p", "hint", tx("Zählung ohne Streak-Druck: Kurzversion zählt voll, verpasste Tage werden nicht gestapelt.", "No streak pressure: the short version counts fully, missed days are not stacked.")));
    root.appendChild(tc);

    /* Fotos */
    var ph = el("div", "s-card");
    ph.appendChild(el("h3", null, tx("Fotos", "Photos")));
    var marks = { 1: tx("Start", "Start"), 22: tx("Woche 4", "Week 4"), 50: tx("Woche 8", "Week 8"), 78: tx("Woche 12", "Week 12") };
    var rowP = [];
    Object.keys(marks).forEach(function (dd) {
      var dy2 = model.addDays(p.startDate, +dd - 1);
      var got = d[dy2] && d[dy2].tasks && d[dy2].tasks.photo;
      rowP.push((got ? "✓ " : "○ ") + marks[dd]);
    });
    ph.appendChild(el("p", null, rowP.join(" · ")));
    ph.appendChild(el("p", "hint", tx("Fotos bleiben auf deinem Gerät (Kamera/Fotos-App) — MaleMetrix lädt nichts hoch und erinnert nur an die Zeitpunkte.",
      "Photos stay on your device (camera/photos app) — MaleMetrix uploads nothing and only reminds you of the checkpoints.")));
    root.appendChild(ph);

    /* Wochencheck-Historie */
    var cis = store.getCheckins();
    if (cis.length) {
      var hc = el("div", "s-card");
      hc.appendChild(el("h3", null, tx("Wochenchecks", "Weekly checks")));
      cis.slice(-6).reverse().forEach(function (ci) {
        hc.appendChild(el("p", "hint", "W" + ci.week + " · " + (ci.changed ? tx("Plan angepasst", "Plan adjusted") : tx("Plan unverändert", "Plan unchanged")) + " — " + esc(pick(ci.reason))));
      });
      root.appendChild(hc);
    }
  }

  /* ================================================================
     WOCHENCHECK
     ================================================================ */
  var checkAnswers = {};
  function vCheck() {
    var p = activePlan();
    var ymd = todayYmd();
    var week = weekNumber(p, ymd);
    track("weekly_check_started");
    root.appendChild(el("h2", null, tx("Wochencheck — Woche ", "Weekly check — week ") + week));
    root.appendChild(el("p", "s-sub", tx("Sieben kurze Angaben. Danach entscheidet das Regelwerk — und begründet die Entscheidung.", "Seven quick inputs. Then the rules decide — and explain the decision.")));

    var existing = store.getCheckins().filter(function (c) { return c.week === week; })[0];
    if (existing) {
      root.appendChild(el("div", "s-note", tx("Diese Woche ist bereits geprüft: ", "This week is already checked: ") + esc(pick(existing.reason))));
      var back0 = el("a", "btn btn-ghost btn-sm", tx("Zurück zu Heute", "Back to Today"));
      back0.href = "#heute";
      root.appendChild(back0);
      return;
    }

    var card = el("div", "s-card");
    weekly.QUESTIONS.forEach(function (q) {
      var wrap = el("div", "s-q");
      wrap.appendChild(el("div", "lbl", esc(en() ? q.labelEn : q.label)));
      if (q.type === "number") {
        var inp = el("input"); inp.type = "number"; inp.min = 0; inp.max = 7;
        inp.value = checkAnswers[q.id] != null ? checkAnswers[q.id] : "";
        inp.addEventListener("change", function () { checkAnswers[q.id] = parseInt(inp.value, 10); });
        wrap.appendChild(inp);
      } else {
        var opts = el("div", "opts");
        q.options.forEach(function (o) {
          var isMulti = q.type === "multi";
          var sel = isMulti ? (checkAnswers[q.id] || []).indexOf(o) >= 0 : checkAnswers[q.id] === o;
          var b = el("button", sel ? "on" : "", esc(checkLabel(o)));
          b.type = "button";
          b.addEventListener("click", function () {
            if (isMulti) {
              var arr = checkAnswers[q.id] || [];
              var ix = arr.indexOf(o);
              if (ix >= 0) arr.splice(ix, 1); else arr.push(o);
              checkAnswers[q.id] = arr;
            } else checkAnswers[q.id] = o;
            render();
          });
          opts.appendChild(b);
        });
        wrap.appendChild(opts);
      }
      card.appendChild(wrap);
    });
    root.appendChild(card);

    var go = el("button", "btn btn-primary", tx("Auswerten", "Evaluate"));
    go.addEventListener("click", function () {
      var ctx = { plan: p, week: week, todayYmd: ymd, weights: weightSeries(), answers: checkAnswers };
      var d = weekly.decide(ctx);
      root.innerHTML = "";
      root.appendChild(el("h2", null, tx("Entscheidung", "Decision")));
      root.appendChild(el("div", d.changes ? "s-note" : "s-note", esc(pick(d.reason))));
      var apply = el("button", "btn btn-primary", d.changes ? tx("Anpassung übernehmen", "Apply adjustment") : tx("Verstanden — weiter", "Got it — continue"));
      apply.addEventListener("click", function () {
        var ci = weekly.buildCheckin(ctx, d);
        if (d.changes) {
          var r = store.changePlan(d.changes, { reason: pick(d.reason), source: "system", rule: d.rule, checkinId: ci.id });
          if (!r.ok) { alert(r.errors.join("; ")); return; }
          track("plan_adjusted");
        } else {
          track("plan_kept");
        }
        store.addCheckin(ci);
        track("weekly_check_completed");
        checkAnswers = {};
        location.hash = "#heute";
      });
      root.appendChild(apply);
    });
    root.appendChild(go);
  }
  function checkLabel(o) {
    var m = { gut: tx("gut", "good"), mittel: tx("mittel", "medium"), schlecht: tx("schlecht", "poor"),
      normal: "normal", hoch: tx("hoch", "high"), besser: tx("besser", "better"), stabil: tx("stabil", "stable"),
      schlechter: tx("schlechter", "worse"), krank: tx("krank", "sick"), reise: tx("Reise", "travel"),
      stress: "Stress", verletzung: tx("Verletzung", "injury") };
    return m[o] || String(o);
  }

  /* ================================================================
     PROFIL
     ================================================================ */
  function vProfile() {
    root.appendChild(el("h2", null, tx("Profil", "Profile")));

    /* Konto */
    var acc = el("div", "s-card");
    acc.appendChild(el("h3", null, tx("Konto", "Account")));
    var state = null;
    try { state = MM.account && MM.account.getDashboardState ? MM.account.getDashboardState() : null; } catch (e) {}
    if (state && state.user) {
      acc.appendChild(el("p", null, esc(state.user.email || "") + (isCustomer() ? " · DAS PROTOKOLL ✓" : "")));
    } else {
      acc.appendChild(el("p", "hint", tx("Nicht eingeloggt. Mit Konto synchronisiert dein Plan über Geräte.", "Not signed in. With an account your plan syncs across devices.")));
    }
    var accLink = el("a", "btn btn-ghost btn-sm", state && state.user ? tx("Konto verwalten", "Manage account") : tx("Einloggen", "Sign in"));
    accLink.href = "mein-protokoll.html?legacy=1#settings";
    acc.appendChild(accLink);
    root.appendChild(acc);

    /* Sprache */
    var lang = el("div", "s-card");
    lang.appendChild(el("h3", null, tx("Sprache", "Language")));
    var lb = el("button", "btn btn-ghost btn-sm", en() ? "Deutsch" : "English");
    lb.addEventListener("click", function () { MM.i18n.toggle(); });
    lang.appendChild(lb);
    root.appendChild(lang);

    /* Plan-Verwaltung */
    var p = plan();
    if (p) {
      var pm = el("div", "s-card");
      pm.appendChild(el("h3", null, tx("Plan", "Plan")));
      pm.appendChild(el("p", "hint", "Version " + p.version + " · Status: " + p.status + " · " + tx("Start", "start") + ": " + (p.startDate || "—")));
      var hist = store.getHistory();
      if (hist.length) {
        hist.slice(-5).reverse().forEach(function (h) {
          pm.appendChild(el("p", "hint", "v" + h.version + " (" + (h.changedAt || "").slice(0, 10) + ", " + h.source + "): " + esc(h.reason)));
        });
      }
      if (p.status === "active") {
        var pause = el("button", "btn btn-ghost btn-sm", tx("Plan pausieren", "Pause plan"));
        pause.addEventListener("click", function () {
          if (!confirm(tx("Plan pausieren? Dein Fortschritt bleibt erhalten.", "Pause the plan? Your progress stays."))) return;
          var c = plan(); c.status = "paused"; store.adoptPlan(c, { force: true }); render();
        });
        pm.appendChild(pause);
      } else if (p.status === "paused") {
        var resume = el("button", "btn btn-primary btn-sm", tx("Plan fortsetzen", "Resume plan"));
        resume.addEventListener("click", function () { var c = plan(); c.status = "active"; store.adoptPlan(c, { force: true }); render(); });
        pm.appendChild(resume);
      }
      root.appendChild(pm);
    }

    /* Klassische Ansicht (Rollback pro Nutzer) */
    var legacy = el("div", "s-card");
    legacy.appendChild(el("h3", null, tx("Klassische Ansicht", "Classic view")));
    legacy.appendChild(el("p", "hint", tx(
      "Die vollständige MaleMetrix-OS-Oberfläche (alle bisherigen Module) bleibt verfügbar. Deine Daten gehen in keine Richtung verloren.",
      "The full MaleMetrix OS interface (all previous modules) stays available. No data is lost in either direction.")));
    if (MM.flags.get("legacyAppEnabled")) {
      var open = el("a", "btn btn-ghost btn-sm", tx("Klassische Ansicht öffnen", "Open classic view"));
      open.href = "mein-protokoll.html?legacy=1";
      legacy.appendChild(open);
      var makeDefault = el("button", "btn btn-ghost btn-sm", tx("Klassische Ansicht als Standard", "Make classic the default"));
      makeDefault.style.marginLeft = "8px";
      makeDefault.addEventListener("click", function () {
        MM.flags.setUser("simpleAppDefault", false);
        track("legacy_fallback_activated");
        alert(tx("Erledigt — My MaleMetrix öffnet künftig die klassische Ansicht. Umkehrbar hier im Profil der klassischen App oder per Support.",
          "Done — My MaleMetrix will open the classic view from now on. Reversible in the classic app or via support."));
      });
      legacy.appendChild(makeDefault);
      var ms = MMSimple.migration ? MMSimple.migration.status() : null;
      if (ms && ms.status === "migrated") {
        var rb = el("button", "btn btn-ghost btn-sm", tx("Migration zurücksetzen", "Undo migration"));
        rb.style.marginLeft = "8px";
        rb.addEventListener("click", function () {
          if (!confirm(tx("Zurück zur klassischen Ansicht? Der neue Plan wird pausiert (nicht gelöscht), deine alten Daten waren nie verändert.",
            "Back to the classic view? The new plan is paused (not deleted); your old data was never modified."))) return;
          MMSimple.migration.revert("user");
          location.href = "mein-protokoll.html?legacy=1";
        });
        legacy.appendChild(rb);
      }
    }
    root.appendChild(legacy);

    /* Rechtliches + Diagnose */
    var more = el("div", "s-card");
    more.appendChild(el("h3", null, tx("Mehr", "More")));
    more.appendChild(el("p", "hint",
      "<a href='tools.html'>" + tx("Rechner & Tools", "Calculators & tools") + "</a> · " +
      "<a href='blog.html'>" + tx("Wissen", "Knowledge") + "</a> · " +
      "<a href='datenschutz.html'>" + tx("Datenschutz", "Privacy") + "</a> · " +
      "<a href='impressum.html'>" + tx("Impressum", "Imprint") + "</a> · " +
      "<a href='agb.html'>" + tx("AGB", "Terms") + "</a>"));
    root.appendChild(more);
  }

  /* ---------------- Start ---------------- */
  track("simple_app_opened");
  render();
})();
