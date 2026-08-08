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
      input = MMSimple.input, engine = MMSimple.engine, weekly = MMSimple.weekly,
      decide = MMSimple.decide, foodlog = MMSimple.foodlog;

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

  /* ---- Zahlen und Daten in der Sprache des Nutzers --------------------
     JavaScript druckt 93.7 und 2026-12-24. Beides ist im Deutschen falsch
     und liest sich wie ein Datenbankauszug. Gespeichert wird weiter
     locale-neutral — formatiert wird erst hier, an der Oberfläche. */
  function nf(v, maxDec) {
    var n = typeof v === "number" ? v : parseFloat(v);
    if (v == null || v === "" || !isFinite(n)) return "—";
    var o = { minimumFractionDigits: 0, maximumFractionDigits: maxDec == null ? 1 : maxDec };
    try { return new Intl.NumberFormat(en() ? "en-US" : "de-DE", o).format(n); }
    catch (e) { return String(v); }
  }
  /* Ganze Zahlen mit Tausenderpunkt: 2.400 kcal, 8.000 Schritte. */
  function nfi(v) { return nf(v, 0); }
  /* Eine Rate wie -0,45 kg/Woche. Das Minus ist Teil der Aussage, deshalb
     bleibt es stehen; das Plus wird ergaenzt, damit eine Zunahme nicht wie
     eine Abnahme aussieht. */
  function rate(v) {
    var n = typeof v === "number" ? v : parseFloat(v);
    if (!isFinite(n)) return "—";
    return (n > 0 ? "+" : "") + nf(n, 2) + " kg/" + tx("Woche", "week");
  }
  /* „2026-12-24" -> „24. Dez. 2026". Ohne Wochentag: das Datum steht meist
     in einem Satz, der die Woche schon genannt hat. */
  function dt(ymd) {
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return String(ymd == null ? "" : ymd);
    try {
      return new Intl.DateTimeFormat(en() ? "en-US" : "de-DE",
        { day: "numeric", month: "short", year: "numeric" }).format(new Date(ymd + "T12:00:00"));
    } catch (e) { return ymd; }
  }

  /* ---------------- Daten ---------------- */
  /* Gemessener Tagesverbrauch aus Apple Health (nur native App). Der Wert
     wird von der Bruecke beim Verbinden abgelegt; hier wird er nur gelesen
     und nach 14 Tagen als zu alt verworfen — ein halbes Jahr alter Schnitt
     beschreibt niemanden mehr. Ohne App oder ohne Health: null, und die
     Engine rechnet wie bisher mit dem Aktivitaetsfaktor. */
  var MEASURED_MAX_AGE_MS = 14 * 24 * 3600 * 1000;
  function measuredEnergy() {
    var m = MM.store.get("health_energy", null);
    if (!m || typeof m.tdee !== "number") return null;
    if (m.readAt) {
      var age = Date.now() - Date.parse(m.readAt);
      if (isFinite(age) && age > MEASURED_MAX_AGE_MS) return null;
    }
    return m;
  }

  /* Health-Werte, die die Bruecke beim letzten Verbinden abgelegt hat.
     Ohne App oder ohne Health: leer — und die Entscheidung laeuft ohne sie. */
  function healthToday() {
    var h = MM.store.get("health_today", null);
    if (!h || !h.date || h.date !== todayYmd()) return null;   // nur der heutige Stand zaehlt
    return h;
  }
  function healthSteps() { return MM.store.get("health_steps_by_day", {}) || {}; }

  /* „Heute anpassen": eine gemeldete Ausnahme, die NUR fuer diesen Tag gilt.
     Bewusst nicht im Plan gespeichert — ein Restaurantbesuch ist keine
     Planaenderung und darf morgen keine Spuren hinterlassen. */
  function modifiers() { return MM.store.get("simple_day_modifier", {}); }
  function todaysModifier(ymd) { return modifiers()[ymd] || null; }
  function setModifier(ymd, mod) {
    var m = modifiers();
    if (mod) m[ymd] = mod; else delete m[ymd];
    // Alte Eintraege aufraeumen: was aelter als 30 Tage ist, hilft niemandem.
    var cutoff = model.addDays(todayYmd(), -30);
    Object.keys(m).forEach(function (k) { if (k < cutoff) delete m[k]; });
    MM.store.set("simple_day_modifier", m);
  }

  /* ---- Essens-Protokoll ------------------------------------------------
     Eine Zeile je Tag: { entries: [...], kcalTarget }. Das Tagesziel wird
     mitgeschrieben, weil es sich aendern kann (Auswaertsessen, Wochencheck)
     — sonst waere ein alter Tag spaeter falsch bewertet. */
  function foodLog() { return MM.store.get("simple_foodlog", {}); }
  function saveFoodLog(l) { MM.store.set("simple_foodlog", l); }
  function foodDay(ymd) { var l = foodLog(); return l[ymd] || { entries: [], kcalTarget: null }; }
  function addFood(ymd, entry, kcalTarget) {
    var l = foodLog();
    var d = l[ymd] || { entries: [], kcalTarget: null };
    d.entries.push(entry);
    if (typeof kcalTarget === "number") d.kcalTarget = kcalTarget;
    l[ymd] = d; saveFoodLog(l);
  }
  function removeFood(ymd, id) {
    var l = foodLog(); var d = l[ymd];
    if (!d) return;
    d.entries = d.entries.filter(function (e) { return e.id !== id; });
    l[ymd] = d; saveFoodLog(l);
  }
  /* Fuer den Execution Score: je Tag ein echtes Urteil, wo protokolliert
     wurde. Tage ohne Eintrag tauchen hier nicht auf — dort bleibt das
     Haekchen die Quelle. */
  function nutritionByDay(p) {
    var l = foodLog(), out = {};
    Object.keys(l).forEach(function (ymd) {
      var r = foodlog.dayHit(p.nutrition, l[ymd].entries, l[ymd].kcalTarget);
      if (r) out[ymd] = r.hit;
    });
    return out;
  }

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
  /* NUR Gewichte ab Planstart: Alt-Messwerte auf dem Gerät (Legacy-Tests,
     Score-Import) dürfen "Aktuell" und den Trend nicht verfälschen. */
  function planWeights(p) {
    if (!p || !p.startDate) return weightSeries();
    return weightSeries().filter(function (w) { return w.date >= p.startDate; });
  }
  /* Beim Planstart zählt das angegebene Startgewicht als Tag-1-Messwert —
     "Aktuell" beginnt damit beim Start, nicht bei Datenmüll oder leer. */
  function seedStartWeight(p) {
    var start = p && p.selectedTransformation && p.selectedTransformation.startWeightKg;
    if (!start || !p.startDate) return;
    var has = weightSeries().some(function (w) { return w.date === p.startDate; });
    if (!has) logWeight(start, p.startDate);
  }

  function access() {
    try { return (MM.account && MM.account.getDashboardState) ? (MM.account.getDashboardState().access || {}) : {}; } catch (e) { return {}; }
  }

  /* ---------------- Gerätelokale Fotos (IndexedDB, nie hochgeladen) ------- */
  var photoDB = {
    open: function () {
      return new Promise(function (res, rej) {
        var r = indexedDB.open("mm_simple", 1);
        r.onupgradeneeded = function () { r.result.createObjectStore("photos"); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      });
    },
    put: function (key, blob) {
      return photoDB.open().then(function (db) {
        return new Promise(function (res, rej) {
          var tx = db.transaction("photos", "readwrite");
          tx.objectStore("photos").put(blob, key);
          tx.oncomplete = function () { res(true); };
          tx.onerror = function () { rej(tx.error); };
        });
      });
    },
    get: function (key) {
      return photoDB.open().then(function (db) {
        return new Promise(function (res) {
          var rq = db.transaction("photos").objectStore("photos").get(key);
          rq.onsuccess = function () { res(rq.result || null); };
          rq.onerror = function () { res(null); };
        });
      });
    }
  };
  /* Foto aufnehmen/auswählen und lokal speichern; checkpointKey = "d1"|"d22"|… */
  function capturePhoto(checkpointKey, done) {
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*"; inp.setAttribute("capture", "environment");
    inp.style.display = "none";
    document.body.appendChild(inp);
    inp.addEventListener("change", function () {
      var f = inp.files && inp.files[0];
      inp.remove();
      if (!f) return;
      photoDB.put(checkpointKey, f).then(function () {
        track("photo_saved");
        if (done) done(true);
      }).catch(function () { if (done) done(false); });
    });
    inp.click();
  }

  /* ---------------- Bottom-Sheet (eine Schicht, wiederverwendbar) --------- */
  function openSheet(build) {
    closeSheet(true);       // ein noch auslaufendes Blatt sofort weg, nicht überlagert
    var back = el("div", "s-sheet-back");
    var sheet = el("div", "s-sheet");
    /* Nicht direkt closeSheet als Handler: der Klick reicht das Event als
       erstes Argument durch, und das waere dann das "sofort"-Flag. */
    back.addEventListener("click", function () { closeSheet(); });
    document.body.appendChild(back);
    document.body.appendChild(sheet);
    build(sheet);
    window._mmSheet = [back, sheet];
    try { if (MM.fokusFangen) MM.fokusFangen(sheet, function () { closeSheet(); }); } catch (e) {}
  }
  /* Das Blatt geht in 320 ms auf und in 220 ms zu. Zu ist schneller als auf:
     wer schliesst, hat sich entschieden und will nicht warten.
     Das Entfernen aus dem DOM passiert erst NACH der Bewegung — sonst
     verschwindet das Blatt schlagartig und die Animation ist umsonst.

     `auslaufend` haelt die Knoten fest, die gerade zugehen. Sonst liegt beim
     Wechsel von einem Blatt zum naechsten (Essen loeschen -> Liste neu) das
     alte 220 ms lang unter dem neuen. */
  var SHEET_OUT_MS = 220;
  var auslaufend = [];
  function closeSheet(sofort) {
    var nodes = (window._mmSheet || []).concat(auslaufend);
    window._mmSheet = null;
    auslaufend = [];
    if (!nodes.length) return;
    var weg = function () { nodes.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); }); };
    if (sofort || reducedMotion()) { weg(); return; }
    nodes.forEach(function (n) { n.classList.add("is-closing"); });
    auslaufend = nodes;
    setTimeout(function () { weg(); auslaufend = auslaufend === nodes ? [] : auslaufend; }, SHEET_OUT_MS);
  }
  function reducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  /* Gewichts-Sheet: großer Wert, gestern-Kontext, Trend-Feedback. */
  function openWeightSheet(ymd, onSaved) {
    var series = planWeights(activePlan());
    var last = series.length ? series[series.length - 1] : null;
    openSheet(function (sheet) {
      sheet.appendChild(el("h3", null, tx("Gewicht heute", "Weight today")));
      sheet.appendChild(el("div", "ctx", last
        ? tx("Zuletzt: ", "Last: ") + nf(last.kg) + " kg (" + dt(last.date) + ")"
        : tx("Erster Eintrag — ab jetzt zählt der Trend, nicht der einzelne Tag.", "First entry — from now on the trend counts, not the single day.")));
      var row = el("div", "big-input");
      var minus = el("button", null, "−"); minus.type = "button";
      var inp = el("input"); inp.type = "number"; inp.step = "0.1"; inp.inputMode = "decimal";
      inp.value = last ? last.kg : "";
      var plus = el("button", null, "+"); plus.type = "button";
      minus.addEventListener("click", function () { inp.value = (Math.round(((parseFloat(inp.value) || 0) - 0.1) * 10) / 10).toFixed(1); });
      plus.addEventListener("click", function () { inp.value = (Math.round(((parseFloat(inp.value) || 0) + 0.1) * 10) / 10).toFixed(1); });
      row.appendChild(minus); row.appendChild(inp); row.appendChild(plus);
      sheet.appendChild(row);
      var fb = el("div", "fb", "");
      sheet.appendChild(fb);
      var save = el("button", "btn btn-primary", tx("Speichern", "Save"));
      save.addEventListener("click", function () {
        var v = parseFloat(String(inp.value).replace(",", "."));
        if (!v || v < 30 || v > 300) { fb.textContent = tx("Bitte einen plausiblen Wert (30–300 kg).", "Please enter a plausible value (30–300 kg)."); fb.style.color = "var(--red)"; return; }
        logWeight(v, ymd);
        track("weight_logged");
        var tr = weekly.trend(planWeights(activePlan()), ymd);
        fb.style.color = "var(--green)";
        fb.textContent = tr
          ? tx("Gespeichert ✓ — Trend: " + rate(tr.deltaPerWeek), "Saved ✓ — trend: " + rate(tr.deltaPerWeek))
          : tx("Gespeichert ✓", "Saved ✓");
        setTimeout(function () { closeSheet(); if (onSaved) onSaved(); }, 700);
      });
      sheet.appendChild(save);
      inp.focus();
    });
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
  var VIEWS = ["heute", "plan", "fortschritt", "profil", "einrichten", "check", "workout", "anpassen"];
  function view() {
    var h = (location.hash || "#heute").slice(1).split("?")[0];
    return VIEWS.indexOf(h) >= 0 ? h : "heute";
  }
  var root = document.getElementById("sapp");

  var lastView = null;
  function render() {
    var v = view();
    var p = activePlan();
    if (!p && ["heute", "fortschritt", "check", "workout"].indexOf(v) >= 0) v = "einrichten";
    // Scroll-Position NUR bei echtem Ansichtswechsel zurücksetzen —
    // Re-Renders innerhalb derselben Ansicht (Chip angeklickt, Frage
    // beantwortet, Satz abgehakt) dürfen die Leseposition nicht verlieren.
    var viewChanged = v !== lastView;
    var keepY = window.scrollY;
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
    else if (v === "anpassen") vEdit();
    try {
      if (viewChanged) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      else window.scrollTo({ top: keepY, left: 0, behavior: "instant" });
    } catch (e) { window.scrollTo(0, viewChanged ? 0 : keepY); }

    /* Inhalt läuft nur bei einem echten Ansichtswechsel ein. render() wird
       auch bei jedem Häkchen aufgerufen — würde dabei der ganze Bildschirm
       neu einfliegen, wäre das Abhaken einer Aufgabe unbenutzbar. Dieselbe
       Unterscheidung wie bei der Scroll-Position eine Zeile darüber. */
    root.classList.remove("s-enter");
    if (viewChanged && !reducedMotion()) {
      void root.offsetWidth;          // erzwingt den Neustart der Animation
      root.classList.add("s-enter");
    }
    lastView = v;
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
      goal.appendChild(el("p", null, "<strong>" + esc(nf(tg.current_kg)) + " kg → " + esc(nf(tg.target_kg)) + " kg</strong>"));
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
      /* Vorher stand hier nur „2 · Score" — eine Überschrift ohne Satz und
         ohne Knopf. Ein gesperrter Schritt muss sagen, was er ist und wann
         er aufgeht, sonst ist er nur eine leere Kachel. */
      sc.className = "s-card s-locked";
      sc.appendChild(el("h3", null, tx("2 · Score", "2 · Score")));
      sc.appendChild(el("p", "hint", tx("Ein kurzer Fragebogen findet heraus, was deinen Fortschritt am stärksten bremst. Öffnet sich, sobald dein Ziel steht.",
        "A short questionnaire finds what slows your progress most. Unlocks once your goal is set.")));
    }
    root.appendChild(sc);

    /* Schritte 3 und 4 waren vor dem Ziel unsichtbar: oben vier Punkte,
       unten zwei Karten. Wer nicht sieht, wie weit der Weg ist, bricht ihn
       eher ab. Gesperrt heißt sichtbar, nicht abwesend. */
    if (!tg) {
      var l3 = el("div", "s-card s-locked");
      l3.appendChild(el("h3", null, tx("3 · Wenige Planfragen", "3 · A few plan questions")));
      l3.appendChild(el("p", "hint", tx("Trainingstage, Ausrüstung, Zeitbudget — nur was für deinen Plan wirklich fehlt.",
        "Training days, equipment, time budget — only what your plan is actually missing.")));
      root.appendChild(l3);

      var l4 = el("div", "s-card s-locked");
      l4.appendChild(el("h3", null, tx("4 · Deine 12-Wochen-Vorschau", "4 · Your 12-week preview")));
      l4.appendChild(el("p", "hint", tx("Kalorien, Protein, Trainingstage, Schritte — festgelegt, bevor du zusagst.",
        "Calories, protein, training days, steps — fixed before you commit.")));
      root.appendChild(l4);
    }

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
        var collected = input.collect({ transformGoal: tg, checkResult: cr, answers: wizardAnswers, measured: measuredEnergy() });
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
        "<strong>" + tx("Gesamtziel", "Overall goal") + ":</strong> " + nf(st.finalTargetWeightKg) + " kg " +
        tx("in ehrlich ~", "in an honest ~") + st.expectedTotalWeeks + " " + tx("Wochen", "weeks") + "<br>" +
        (pg.isFinalPhase
          ? "<strong>" + tx("Diese 12 Wochen", "These 12 weeks") + ":</strong> " + tx("dein Ziel liegt in dieser Phase", "your goal sits inside this phase") + " (" + nf(pg.week12TargetMinKg) + "–" + nf(pg.week12TargetMaxKg) + " kg)"
          : "<strong>" + tx("Phase 1 (12 Wochen)", "Phase 1 (12 weeks)") + ":</strong> " + nf(pg.week12TargetMinKg) + "–" + nf(pg.week12TargetMaxKg) + " kg")));
      pv.appendChild(el("p", "hint",
        nfi(dp.nutrition.calorieTarget) + " kcal · " + nfi(dp.nutrition.proteinTargetGrams) + " g " + tx("Protein", "protein") + " · " +
        dp.training.daysPerWeek + "× " + tx("Training", "training") + " (" + dp.training.weekdays.map(wdName).join(", ") + ") · " +
        nfi(dp.dailyTargets.steps) + " " + tx("Schritte", "steps")));
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
          seedStartWeight(p2);
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
        var buy = el("a", "btn btn-primary", tx("Plan freischalten — " + dp.phaseGoal.week12TargetMinKg + "–" + dp.phaseGoal.week12TargetMaxKg + " kg in 12 Wochen", "Unlock the plan — " + dp.phaseGoal.week12TargetMinKg + "–" + dp.phaseGoal.week12TargetMaxKg + " kg in 12 weeks"));
        buy.href = "protokoll.html";
        buy.setAttribute("data-track", "simple_unlock_cta");
        pv.appendChild(buy);
        pv.appendChild(loginForm(
          "Bereits gekauft? Einloggen genügt — dein Plan wird danach hier freigeschaltet:",
          "Already bought it? Just sign in — your plan unlocks here afterwards:"));
      }
      root.appendChild(pv);
    }
  }

  /* Inline-Login (Magic Link) — kein Umweg über die Legacy-Einstellungen. */
  function loginForm(introDe, introEn) {
    var wrap = el("div");
    if (introDe) wrap.appendChild(el("p", "hint", tx(introDe, introEn)));
    var row = el("div", "s-actions");
    var inp = el("input");
    inp.type = "email"; inp.placeholder = "deine@email.de"; inp.autocomplete = "email";
    inp.style.cssText = "flex:1;min-width:200px;background:var(--bg-2);border:1px solid var(--line-strong);color:var(--text);border-radius:9px;padding:10px 12px;font-size:0.95rem;";
    var btn = el("button", "btn btn-primary btn-sm", tx("Login-Link senden", "Send sign-in link"));
    var fb = el("p", "hint"); fb.style.marginTop = "6px";
    btn.addEventListener("click", function () {
      var mail = (inp.value || "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { fb.textContent = tx("Bitte eine gültige E-Mail-Adresse.", "Please enter a valid email address."); return; }
      btn.disabled = true; btn.textContent = "…";
      MM.account.signIn(mail).then(function (r) {
        btn.disabled = false;
        if (r && r.ok !== false) {
          btn.textContent = tx("Link gesendet ✓", "Link sent ✓");
          fb.textContent = tx("Prüfe dein Postfach und öffne den Link auf DIESEM Gerät — danach geht es hier automatisch weiter.",
            "Check your inbox and open the link on THIS device — this page continues automatically afterwards.");
        } else {
          btn.textContent = tx("Login-Link senden", "Send sign-in link");
          fb.textContent = (r && r.message) || tx("Senden fehlgeschlagen — bitte später erneut versuchen.", "Sending failed — please try again later.");
        }
      });
    });
    row.appendChild(inp); row.appendChild(btn);
    wrap.appendChild(row); wrap.appendChild(fb);
    return wrap;
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
    if (day < 1) { root.appendChild(el("div", "s-card", tx("Dein Plan startet am ", "Your plan starts on ") + dt(p.startDate) + ".")); return; }

    var info = weekInfo(p, ymd) || {};
    var isDeload = p.training.deloadWeeks.indexOf(week) >= 0;
    var session = info.training ? sessionForWeekday(p, new Date(ymd + "T12:00:00").getDay()) : null;

    /* ---- Die Entscheidung des Tages, bevor irgendetwas gezeichnet wird ----
       Der Screen bildet nicht mehr den Plan ab, sondern den Tagesauftrag:
       aus Plan + gemessener Ausführung + Health + gemeldeten Umständen. */
    var tr = weekly.trend(planWeights(p), ymd);
    var exec = decide.executionScore(p, daylog(), ymd, {
      days: 14, weights: planWeights(p), stepsByDay: healthSteps(), nutritionByDay: nutritionByDay(p)
    });
    var rxToday = decide.dailyPrescription({
      plan: p, todayYmd: ymd, daylog: daylog(),
      weightTrend: tr, execution: exec,
      health: healthToday(), modifier: todaysModifier(ymd)
    });

    /* Kopf */
    var head = el("div", "s-head");
    head.appendChild(el("span", "k", tx("Woche", "Week") + " " + week + " · " + tx("Tag", "Day") + " " + day + " / 84" + (isDeload ? " · " + tx("reduzierte Woche", "deload week") : "")));
    head.appendChild(el("div", "goal", esc(pick(rxToday.headline))));
    if (rxToday.focus) {
      /* Grün heißt in dieser App „läuft". Der Fokussatz ist eine Anweisung,
         kein Status — er bekommt deshalb Textfarbe. Farbe nur dann, wenn der
         Tag wirklich vom Normalfall abweicht. */
      var abweichung = rxToday.mode === "reentry" || rxToday.mode === "recover" || rxToday.mode === "short";
      head.appendChild(el("div", "status" + (abweichung ? " warn" : ""),
        '<span class="lbl">' + esc(tx("Fokus heute", "Today's focus")) + "</span>" + esc(pick(rxToday.focus))));
    }
    root.appendChild(head);

    /* Begründung — der Unterschied zwischen Ansage und Anweisung.
       Nur wenn es wirklich etwas zu begründen gibt. */
    if (rxToday.why.length) {
      var whyBox = el("div", "s-why");
      rxToday.why.slice(0, 2).forEach(function (w) { whyBox.appendChild(el("p", null, esc(pick(w)))); });
      root.appendChild(whyBox);
    }

    /* Maximal drei primäre Aufgaben — aus dem Tagesauftrag, nicht aus dem Plan */
    var tasks = [];
    if (session && rxToday.training) {
      var sub;
      if (rxToday.mode === "short" || rxToday.mode === "reentry") {
        sub = tx("Kurzfassung · " + rxToday.sessionMinutes + " Minuten",
                 "Short version · " + rxToday.sessionMinutes + " minutes");
      } else if (rxToday.mode === "recover") {
        sub = tx("Ein Satz weniger, Last bleibt", "One set less, load stays");
      } else if (rxToday.mode === "deload") {
        sub = tx("Reduzierte Woche · ~80 % Last", "Deload · ~80% load");
      } else {
        sub = tx("Eine Wiederholung mehr", "One more rep");
      }
      tasks.push({ id: "training", b: pick(session.name), s: sub, go: "#workout" });
    } else if (session && !rxToday.training) {
      tasks.push({ id: "movement", b: tx("Heute kein Training", "No training today"), s: tx("So entschieden — siehe Begründung oben", "Decided that way — see the reason above") });
    } else {
      tasks.push({ id: "movement", b: tx("30 Minuten gehen", "Walk 30 minutes"), s: tx("Ruhetag — Bewegung statt Training", "Rest day — movement instead of training") });
    }
    // Ernährung: solange nichts eingetragen ist, bleibt es beim Häkchen.
    // Sobald der erste Eintrag steht, zeigt die Zeile echte Zahlen und das
    // Häkchen verschwindet — eine Messung schlägt eine Selbsteinschätzung.
    var fd = foodDay(ymd);
    var rest = foodlog.remaining(p.nutrition, fd.entries, rxToday.kcal);
    if (fd.entries.length) {
      tasks.push({ id: "protein", measured: true,
        b: (rest.protein > 0 ? tx("Noch ", "Still ") + rest.protein + " g " + tx("Protein", "protein")
                             : tx("Protein erreicht ✓", "Protein reached ✓")),
        s: nfi(rest.eaten.kcal) + " / " + nfi(rest.kcalGoal) + " kcal · " +
           (rest.kcal >= 0 ? tx("noch ", "still ") + rest.kcal + " frei" : Math.abs(rest.kcal) + " " + tx("darüber", "over")),
        go: "sheet" });
    } else {
      tasks.push({ id: "protein", b: nfi(rxToday.protein) + " g " + tx("Protein", "protein"),
      s: tx("mindestens · ", "at least · ") + nfi(rxToday.kcal) + " kcal", go: "sheet" });
    }
    tasks.push({ id: "steps", b: nfi(rxToday.steps) + " " + tx("Schritte", "steps"), s: null });

    var list = el("div", "s-tasks");
    tasks.slice(0, 3).forEach(function (t) {
      // Bei gemessener Ernaehrung entscheidet das Protokoll, nicht das Haekchen.
      var done = t.measured ? !!(foodlog.dayHit(p.nutrition, foodDay(ymd).entries, rxToday.kcal) || {}).hit
                            : !!entry.tasks[t.id];
      var row = el("div", "s-task" + (done ? " done" : ""));
      row.appendChild(el("span", "box", "✓"));
      var tt = el("div", "t");
      tt.appendChild(el("b", null, esc(t.b)));
      if (t.s) tt.appendChild(el("span", null, esc(t.s)));
      row.appendChild(tt);
      if (t.go && !done) { var go = el("span", "go", t.id === "training" ? tx("Starten →", "Start →") : (t.id === "protein" ? tx("Eintragen →", "Log →") : tx("Ansehen →", "View →"))); row.appendChild(go); }
      row.addEventListener("click", function (ev2) {
        if (t.id === "training" && !done) { location.hash = "#workout"; return; }
        // Sobald gemessen wird, ist das Haekchen kein Zustand mehr, den man
        // setzen koennte — es ergibt sich aus den Eintraegen.
        if (t.id === "protein") { openFoodSheet(ymd, rxToday); return; }
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
      var todaysWeight = planWeights(p).filter(function (w) { return w.date === ymd; })[0];
      chip("weigh", todaysWeight ? (nf(todaysWeight.kg) + " kg ✓") : tx("Gewicht eintragen", "Log weight"), !!todaysWeight, function () {
        openWeightSheet(ymd, render);
      });
    }
    var activeMod = todaysModifier(ymd);
    chip("modify", activeMod ? tx("✎ Heute angepasst · zurücknehmen", "✎ Today adjusted · undo")
                             : tx("✎ Heute passt nicht", "✎ Today doesn't fit"), !!activeMod, function () {
      if (activeMod) { setModifier(ymd, null); track("day_modifier_cleared"); render(); return; }
      openModifySheet(ymd);
    });
    if (info.shopping) chip("shop", tx("Einkaufstag", "Shopping day"), !!entry.tasks.shopping, function () { location.hash = "#plan"; MM.store.set("simple_plan_tab", "einkauf"); render(); });
    if (info.mealPrep) chip("prep", tx("Meal-Prep", "Meal prep"), !!entry.tasks.prep, function () { entry.tasks.prep = !entry.tasks.prep; setDayEntry(ymd, entry); render(); });
    if (info.review && week >= 2) chip("review", tx("Wochencheck fällig", "Weekly check due"), false, function () { location.hash = "#check"; });
    if ([1, 22, 50, 78].indexOf(day) >= 0) {
      chip("photo", tx("Fortschrittsfoto (bleibt auf deinem Gerät)", "Progress photo (stays on your device)"), !!entry.tasks.photo, function () {
        capturePhoto("d" + day, function (okSaved) {
          if (okSaved) { entry.tasks.photo = true; setDayEntry(ymd, entry); }
          render();
        });
      });
    }
    root.appendChild(chips);

    /* Fortschritts-Moment: heute besser als letztes Mal? */
    if (entry.tasks.training && entry.workout && entry.workout.improved != null) {
      var imp = entry.workout.improved;
      root.appendChild(el("div", "s-note", imp > 0
        ? tx("Stark: <strong>" + imp + (imp === 1 ? " Übung" : " Übungen") + " besser als letztes Mal</strong> — genau so funktioniert Progression.",
             "Strong: <strong>" + imp + (imp === 1 ? " exercise" : " exercises") + " better than last time</strong> — that's exactly how progression works.")
        : tx("Training absolviert ✓ — halten zählt auch. Nächstes Mal greift das Tagesziel wieder.",
             "Session done ✓ — maintaining counts too. Next time the daily goal applies again.")));
    }

    /* Tagesabschluss */
    /* Der Tagesabschluss ist die letzte Handlung des Bildschirms. Als halb
       breiter Knopf zwischen Chips sah er aus wie noch ein Chip. */
    var closeBtn = el("button", "btn s-primary " + (entry.closed ? "btn-ghost btn-sm" : "btn-dark"),
      entry.closed ? tx("Tag abgeschlossen ✓", "Day closed ✓") : tx("Tag abschließen", "Close the day"));
    closeBtn.addEventListener("click", function () {
      if (entry.closed) return;
      entry.closed = true;
      setDayEntry(ymd, entry);
      track("day_closed");
      render();
    });
    root.appendChild(closeBtn);
  }

  /* Die Ausnahmen, die im Alltag wirklich vorkommen. Bewusst wenige und
     bewusst ohne Freitextfeld: jede Option führt zu einer definierten,
     getesteten Entscheidung — nicht zu einer improvisierten. */
  var MODIFIERS = [
    { type: "zeit", minutes: 30, de: "Ich habe nur 30 Minuten", en: "I only have 30 minutes" },
    { type: "zeit", minutes: 20, de: "Ich habe nur 20 Minuten", en: "I only have 20 minutes" },
    { type: "auswaerts", de: "Ich esse heute auswärts", en: "I'm eating out today" },
    { type: "reise", de: "Ich bin unterwegs / kein Gym", en: "I'm travelling / no gym" },
    { type: "krank", de: "Ich bin krank", en: "I'm ill" }
  ];

  function openModifySheet(ymd) {
    track("day_modifier_opened");
    openSheet(function (box) {
      box.appendChild(el("h3", null, tx("Was passt heute nicht?", "What doesn't fit today?")));
      box.appendChild(el("p", "hint", tx(
        "Gilt nur für heute. Dein Plan bleibt unverändert — es wird nichts nachgeholt und nichts kompensiert.",
        "Applies to today only. Your plan stays unchanged — nothing gets made up, nothing gets compensated.")));
      MODIFIERS.forEach(function (m) {
        var b = el("button", "btn btn-ghost", esc(tx(m.de, m.en)));
        b.style.cssText = "display:block;width:100%;margin-bottom:8px;text-align:left";
        b.addEventListener("click", function () {
          setModifier(ymd, { type: m.type, minutes: m.minutes || null });
          track("day_modifier_set", { type: m.type });
          closeSheet(); render();
        });
        box.appendChild(b);
      });
    });
  }

  /* ================================================================
     ESSEN EINTRAGEN — drei Wege, keine Datenbank

     Grundsatz: Wer nach Plan isst, tippt einmal. Wer auswaerts isst,
     schaetzt einmal. Wer dasselbe oft isst, tippt ab dem zweiten Mal
     wieder nur einmal. Alles andere waere eine schlechtere Kopie von
     MyFitnessPal — und widerspricht „weniger Tracking mit der Zeit".
     ================================================================ */
  function openFoodSheet(ymd, rx) {
    var p = activePlan();
    track("food_sheet_opened");
    openSheet(function (box) {
      var fd = foodDay(ymd);
      var rest = foodlog.remaining(p.nutrition, fd.entries, rx.kcal);

      box.appendChild(el("h3", null, tx("Heute gegessen", "Eaten today")));
      box.appendChild(el("p", "ctx",
        nfi(rest.eaten.kcal) + " / " + nfi(rest.kcalGoal) + " kcal · " +
        rest.eaten.protein + " / " + rest.proteinGoal + " g " + tx("Protein", "protein")));
      if (rest.protein > 0 || rest.kcal > 0) {
        box.appendChild(el("p", "hint",
          tx("Es fehlen noch ", "Still missing ") +
          Math.max(0, rest.protein) + " g " + tx("Protein", "protein") + " und " +
          nfi(Math.max(0, rest.kcal)) + " kcal."));
      }

      /* Bereits eingetragen — mit der Möglichkeit, einen Fehler zu löschen */
      fd.entries.forEach(function (e) {
        var row = el("div", "s-food-row");
        var t = el("div", "t");
        t.appendChild(el("b", null, esc(e.label)));
        t.appendChild(el("span", null, nfi(e.kcal) + " kcal · " + nfi(e.protein) + " g"));
        row.appendChild(t);
        var del = el("button", "btn btn-ghost btn-sm", "✕");
        del.setAttribute("aria-label", tx("Eintrag löschen", "Delete entry"));
        del.addEventListener("click", function () {
          removeFood(ymd, e.id); closeSheet(); openFoodSheet(ymd, rx);
        });
        row.appendChild(del);
        box.appendChild(row);
      });

      function addAndReopen(entry) {
        if (!entry) return;
        addFood(ymd, entry, rx.kcal);
        track("food_logged", { source: entry.source });
        closeSheet(); openFoodSheet(ymd, rx);
      }
      function optionButton(label, kcal, protein, source, blockId) {
        var b = el("button", "btn btn-ghost");
        b.style.cssText = "display:block;width:100%;margin-bottom:8px;text-align:left";
        b.innerHTML = "<b>" + esc(label) + "</b><br><span style='color:var(--muted);font-size:0.85rem'>" +
          nfi(kcal) + " kcal · " + nfi(protein) + " g " + tx("Protein", "protein") + "</span>";
        b.addEventListener("click", function () {
          addAndReopen(foodlog.makeEntry({ label: label, kcal: kcal, protein: protein,
            source: source, blockId: blockId || null, at: ymd }));
        });
        return b;
      }

      /* 1 — Was zur Lücke passt, aus dem eigenen Plan */
      var vorschlaege = foodlog.suggest(p.nutrition, rest, 3);
      if (vorschlaege.length) {
        box.appendChild(el("h4", null, tx("Passt zu dem, was noch fehlt", "Fits what's still missing")));
        vorschlaege.forEach(function (o) {
          box.appendChild(optionButton(pick(o.name), o.kcal, o.protein, "plan", o.blockId));
        });
      }

      /* 2 — Eigene Mahlzeiten, die schon mehrfach vorkamen */
      var favs = foodlog.favourites(foodLog(), 4);
      if (favs.length) {
        box.appendChild(el("h4", null, tx("Deine üblichen", "Your usual")));
        favs.forEach(function (f) {
          box.appendChild(optionButton(f.label, f.kcal, f.protein, "eigene"));
        });
      }

      /* 3 — Freie Eingabe für alles andere */
      box.appendChild(el("h4", null, tx("Etwas anderes", "Something else")));
      var form = el("div", "s-food-form");
      var name = document.createElement("input");
      name.type = "text"; name.className = "s-input";
      name.placeholder = tx("Was war es? (z. B. Pizza)", "What was it? (e.g. pizza)");
      name.setAttribute("aria-label", tx("Bezeichnung", "Label"));
      var kc = document.createElement("input");
      kc.type = "number"; kc.inputMode = "numeric"; kc.className = "s-input";
      kc.placeholder = "kcal"; kc.setAttribute("aria-label", "Kalorien");
      var pr = document.createElement("input");
      pr.type = "number"; pr.inputMode = "numeric"; pr.className = "s-input";
      pr.placeholder = tx("g Protein", "g protein"); pr.setAttribute("aria-label", tx("Protein in Gramm", "Protein in grams"));
      form.appendChild(name); form.appendChild(kc); form.appendChild(pr);
      box.appendChild(form);
      var hinweis = el("p", "hint");
      box.appendChild(hinweis);
      var save = el("button", "btn btn-primary", tx("Eintragen", "Log it"));
      save.addEventListener("click", function () {
        var e = foodlog.makeEntry({ label: name.value, kcal: parseFloat(kc.value),
          protein: parseFloat(pr.value), source: "frei", at: ymd });
        if (!e) {
          // Ehrlich sagen, was fehlt, statt still nichts zu tun.
          hinweis.textContent = tx("Bitte eine Bezeichnung und mindestens einen Wert eintragen. Schätzen ist ausdrücklich erlaubt — ungefähr richtig ist besser als gar nichts.",
            "Please enter a label and at least one value. Estimating is fine — roughly right beats nothing.");
          return;
        }
        addAndReopen(e);
      });
      box.appendChild(save);
      box.appendChild(el("p", "hint", tx(
        "Schätzwerte genügen. Diese Zahlen entscheiden nicht über dich, sondern darüber, ob MaleMetrix bei einem Plateau deinen Plan anfasst oder deine Umsetzung anspricht.",
        "Estimates are enough. These numbers don't judge you — they decide whether MaleMetrix touches your plan or your execution when progress stalls.")));
    });
  }

  function vCompleted(p) {
    /* Die Bilanz wird gerechnet, nicht behauptet. Vorher stand hier
       „12 Wochen geschafft." — auch dann, wenn von 10 geplanten Kilo
       eines herunterging. Ein Lob für ein verfehltes Ziel kostet mehr
       Vertrauen, als jede richtige Zahl danach zurückholt. */
    var series = planWeights(p);
    var bilanz = decide.phaseOutcome(p, series, decide.executionScore(p, daylog(), todayYmd(), {
      days: 84, weights: series, stepsByDay: healthSteps(), nutritionByDay: nutritionByDay(p)
    }));

    root.appendChild(el("h2", null, esc(pick(bilanz.headline))));

    var card = el("div", "s-card");
    if (bilanz.endKg != null) {
      card.appendChild(el("p", null, "<strong>" + esc(nf(bilanz.startKg)) + " kg → " + esc(nf(bilanz.endKg)) + " kg</strong>"));
    }
    card.appendChild(el("p", null, esc(pick(bilanz.verdict))));
    root.appendChild(card);

    /* Der nächste Schritt steht getrennt und allein — er ist der Grund,
       warum dieser Bildschirm überhaupt existiert. */
    var step = el("div", "s-why");
    step.appendChild(el("p", null, esc(pick(bilanz.nextStep))));
    root.appendChild(step);

    root.appendChild(el("p", "hint", tx("Unter Fortschritt siehst du die ganze Strecke. Dein bisheriger Verlauf bleibt erhalten.",
      "Progress shows the whole journey. Your history stays.")));

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
  /* Rest-Timer: startet beim Abhaken eines Satzes, läuft render-sicher
     über einen Modul-Zustand + 1-s-Tick. */
  var restTimer = { until: 0, label: "", iv: null };
  function startRest(seconds, label) {
    restTimer.until = Date.now() + seconds * 1000;
    restTimer.label = label;
    if (!restTimer.iv) restTimer.iv = setInterval(function () {
      var elBox = document.getElementById("sRestTimer");
      if (!elBox) return;
      var left = Math.ceil((restTimer.until - Date.now()) / 1000);
      var tEl = elBox.querySelector(".t");
      if (left <= 0) {
        elBox.classList.add("done");
        tEl.textContent = "0:00";
        elBox.querySelector(".l").textContent = tx("Pause vorbei — nächster Satz.", "Rest over — next set.");
        clearInterval(restTimer.iv); restTimer.iv = null;
        try { if (navigator.vibrate) navigator.vibrate(180); } catch (e) {}
      } else {
        tEl.textContent = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
      }
    }, 250);
  }
  function stopRest() {
    restTimer.until = 0;
    if (restTimer.iv) { clearInterval(restTimer.iv); restTimer.iv = null; }
    var elBox = document.getElementById("sRestTimer");
    if (elBox) elBox.remove();
  }
  /* Konkretes Tagesziel je Übung aus dem letzten Mal (doppelte Progression). */
  function progressionGoal(ex, last4) {
    if (!last4 || last4.weightKg == null) {
      return tx("Heute: Arbeitsgewicht finden (RIR 2)", "Today: find your working weight (RIR 2)");
    }
    if (last4.reps != null && last4.reps < ex.repsHi) {
      return tx("Ziel heute: " + nf(last4.weightKg) + " kg × " + (last4.reps + 1) + " (eine mehr als letztes Mal)",
                "Goal today: " + nf(last4.weightKg) + " kg × " + (last4.reps + 1) + " (one more than last time)");
    }
    var inc = ["squat", "legpress", "hinge", "hipthrust", "splitsquat", "gobletsquat", "dbrdl", "legcurl"].indexOf(ex.id) >= 0 ? 5 : 2.5;
    return tx("Ziel heute: " + nf(last4.weightKg + inc) + " kg × " + ex.repsLo + " (Gewicht rauf, unten neu starten)",
              "Goal today: " + nf(last4.weightKg + inc) + " kg × " + ex.repsLo + " (add load, restart at the bottom)");
  }
  /* Verbesserungen vs. letztes Mal zählen — der sichtbare Fortschritts-Moment. */
  function countImprovements(entries, last) {
    if (!last || !last.entries) return null;
    var n = 0;
    Object.keys(entries).forEach(function (id) {
      var now = entries[id], old = last.entries[id];
      if (!now || !old || now.weightKg == null || old.weightKg == null) return;
      if (now.weightKg > old.weightKg) n++;
      else if (now.weightKg === old.weightKg && (now.reps || 0) > (old.reps || 0)) n++;
    });
    return n;
  }

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

    /* Rest-Timer-Fläche (erscheint nach dem ersten abgehakten Satz) */
    if (restTimer.until > Date.now()) {
      var tb = el("div", "s-timer"); tb.id = "sRestTimer";
      tb.appendChild(el("span", "t", "…"));
      tb.appendChild(el("span", "l", tx("Pause — ", "Rest — ") + restTimer.label));
      var skip = el("button", null, tx("Überspringen", "Skip"));
      skip.addEventListener("click", stopRest);
      tb.appendChild(skip);
      root.appendChild(tb);
    }

    var card = el("div", "s-card");
    session.exercises.forEach(function (ex) {
      if (w.short && !ex.inShort) return;
      var e = w.entries[ex.id] || { setsDone: 0, weightKg: null, reps: null, sub: false };
      var sets = w.short ? Math.min(2, ex.sets) : (isDeload ? Math.max(1, ex.sets - 1) : ex.sets);
      var row = el("div", "s-ex");
      var n = el("div", "n");
      var last4 = last && last.entries && last.entries[ex.id];
      /* Anzeige = Daten: Das vorbelegte Gewicht aus dem letzten Mal wird
         REAL übernommen — sonst verliert der Log das Gewicht, wenn der
         Nutzer das Feld nie anfasst, und die Progression bricht. */
      if (e.weightKg == null && last4 && last4.weightKg != null) {
        e.weightKg = last4.weightKg;
        w.entries[ex.id] = e;
      }
      n.appendChild(el("b", null, esc(en() ? ex.nameEn : ex.name) + (ex.inShort ? " <span class='short-mark'>KURZ</span>" : "")));
      n.appendChild(el("span", null, sets + " × " + ex.repsLo + "–" + ex.repsHi + " · RIR " + ex.rir + " · " + tx("Pause", "rest") + " " + ex.restSec + " s" +
        (last4 && last4.weightKg ? " · " + tx("letztes Mal", "last time") + ": " + nf(last4.weightKg) + " kg × " + (last4.reps || "?") : "")));
      n.appendChild(el("span", "s-goal", esc(progressionGoal(ex, last4))));
      row.appendChild(n);
      /* Eingaben und Satz-Kaestchen in eine eigene Zeile: nebeneinander mit
         dem Uebungsnamen blieben fuer „Einarmiges Kurzhantel-Rudern" drei
         Zeichen Breite, und ab vier Saetzen lief das letzte Kaestchen aus
         dem Bild — sichtbar abgeschnitten und nicht mehr antippbar. */
      var ctl = el("div", "ctl");
      var wIn = el("input"); wIn.type = "number"; wIn.step = "0.5"; wIn.placeholder = "kg";
      wIn.value = e.weightKg != null ? e.weightKg : (last4 && last4.weightKg != null ? last4.weightKg : "");
      wIn.addEventListener("change", function () { e.weightKg = parseFloat(wIn.value) || null; w.entries[ex.id] = e; setDayEntry(ymd, entry); });
      var rIn = el("input"); rIn.type = "number"; rIn.placeholder = tx("Wdh", "reps");
      rIn.value = e.reps != null ? e.reps : "";
      rIn.addEventListener("change", function () { e.reps = parseInt(rIn.value, 10) || null; w.entries[ex.id] = e; setDayEntry(ymd, entry); });
      ctl.appendChild(wIn); ctl.appendChild(rIn);
      var sb = el("div", "setbox");
      for (var si = 1; si <= sets; si++) {
        (function (si2) {
          var b = el("button", e.setsDone >= si2 ? "on" : "", String(si2));
          b.addEventListener("click", function () {
            var inc = !(e.setsDone >= si2);
            e.setsDone = e.setsDone >= si2 ? si2 - 1 : si2;
            w.entries[ex.id] = e; setDayEntry(ymd, entry);
            if (inc && e.setsDone < sets) startRest(ex.restSec, (en() ? ex.nameEn : ex.name) + " · " + tx("Satz", "set") + " " + (e.setsDone + 1) + "/" + sets);
            else if (inc) stopRest();
            render();
          });
          sb.appendChild(b);
        })(si);
      }
      ctl.appendChild(sb);
      if (ex.substitute) {
        var sel = el("select");
        var o1 = el("option"); o1.value = ""; o1.textContent = tx("Übung ok", "Exercise ok");
        var o2 = el("option"); o2.value = "sub"; o2.textContent = tx("Ersatz: ", "Swap: ") + (en() ? ex.substitute.nameEn : ex.substitute.name);
        sel.appendChild(o1); sel.appendChild(o2);
        sel.value = e.sub ? "sub" : "";
        sel.addEventListener("change", function () { e.sub = sel.value === "sub"; w.entries[ex.id] = e; setDayEntry(ymd, entry); });
        ctl.appendChild(sel);
      }
      row.appendChild(ctl);
      card.appendChild(row);
    });
    root.appendChild(card);

    var doneBtn = el("button", "btn btn-primary", tx("Training abschließen", "Finish workout"));
    doneBtn.addEventListener("click", function () {
      entry.tasks.training = true;
      var imp = countImprovements(w.entries, last);
      if (imp != null) w.improved = imp;
      setDayEntry(ymd, entry);
      stopRest();
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
    var planHead = el("h2", null, tx("Mein Plan", "My plan"));
    root.appendChild(planHead);
    var editLink = el("p", "s-sub s-inline-link");
    editLink.innerHTML = '<a href="#anpassen">' + esc(tx("Plan anpassen →", "Adjust plan →")) + "</a>";
    root.appendChild(editLink);
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
      /* Kein Emoji: ein gelber Bizeps ist der einzige gesaettigte Farbfleck
         auf einem sonst praezisen Bildschirm und sieht aus wie Clipart.
         Dass es ein Trainingstag ist, sagt der Name der Einheit. */
      if (d.training) { var s = sessionForWeekday(p, wd); what.push(s ? pick(s.name) : "Training"); }
      else what.push(tx("Bewegung / Schritte", "Movement / steps"));
      row.appendChild(el("span", "what", esc(what.join(" · "))));
      var tags = [];
      if (d.shopping) tags.push(tx("Einkauf", "Shopping"));
      if (d.mealPrep) tags.push("Prep");
      if (d.review) tags.push(tx("Wochencheck", "Check"));
      /* Klasse „s-tag", nicht „tag": css/style.css hat ein globales .tag mit
         Rahmen, Fuellung und Pillenform. Das sah hier aus wie ein Knopf, war
         aber keiner — und hat der Zeile so viel Breite genommen, dass
         „Bewegung / Schritte" daneben umgebrochen ist. */
      if (tags.length) row.appendChild(el("span", "s-tag", esc(tags.join(" · "))));
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

  /* Woher die Zahl kommt, auf der alles andere aufbaut. Wer sein
     Kalorienziel sieht, soll wissen, ob es gemessen oder geschaetzt ist —
     und wenn eine Messung verworfen wurde, warum. */
  function tdeeOrigin(p) {
    var d = p.derived || {};
    var line = el("p", "hint");
    if (d.tdeeSource === "apple_health") {
      line.textContent = tx(
        "Grundlage: dein gemessener Tagesverbrauch aus Apple Health (" + nfi(d.tdee) + " kcal). Die Schätzformel hätte " + nfi(d.tdeeFormula) + " kcal gesagt.",
        "Basis: your measured daily burn from Apple Health (" + nfi(d.tdee) + " kcal). The estimate formula would have said " + nfi(d.tdeeFormula) + " kcal.");
      return line;
    }
    var why = {
      zu_wenige_tage: tx("zu wenige volle Messtage", "too few full measured days"),
      unplausibel_niedrig: tx("der gemessene Wert war unplausibel niedrig — meist eine nicht getragene Uhr", "the measured value was implausibly low — usually a watch that wasn't worn"),
      unplausibel_hoch: tx("der gemessene Wert war unplausibel hoch", "the measured value was implausibly high")
    }[d.tdeeRejected];
    line.textContent = why
      ? tx("Grundlage: Schätzformel (" + nfi(d.tdee) + " kcal). Apple Health meldete " + nfi(d.tdeeMeasured) + " kcal, das wurde nicht übernommen — " + why + ".",
           "Basis: estimate formula (" + nfi(d.tdee) + " kcal). Apple Health reported " + nfi(d.tdeeMeasured) + " kcal, which was not used — " + why + ".")
      : tx("Grundlage: Schätzformel aus Größe, Gewicht, Alter und Aktivität (" + nfi(d.tdee) + " kcal).",
           "Basis: estimate from height, weight, age and activity (" + nfi(d.tdee) + " kcal).");
    return line;
  }

  function subNutrition(p) {
    var n = p.nutrition;
    root.appendChild(el("p", "s-sub",
      nfi(n.calorieTarget) + " kcal (" + nfi(n.calorieRangeMin) + "–" + nfi(n.calorieRangeMax) + ") · " +
      n.proteinTargetGrams + " g " + tx("Protein", "protein") + " · " + n.mealCount + " " + tx("Mahlzeiten", "meals")));
    root.appendChild(tdeeOrigin(p));
    (n.meals || []).forEach(function (m, mi) {
      var slotNames = { breakfast: tx("Frühstück", "Breakfast"), lunch: tx("Mittagessen", "Lunch"), dinner: tx("Abendessen", "Dinner"), snack: "Snack" };
      var card = el("div", "s-meal");
      card.appendChild(el("div", "slot", esc(slotNames[m.slot] || m.slot) + " · ~" + nfi(m.targetKcal) + " kcal"));
      m.options.forEach(function (o) {
        var sel = (n.mealTemplateIds[mi] || "").split("@");
        var chosenId = sel[0];
        var isChosen = o.blockId === chosenId;
        /* Portion: die gewählte Option kann vom Basisfaktor abweichen (Stepper) */
        var factor = isChosen ? (parseFloat(sel[1]) || o.factor) : o.factor;
        var scale = factor / o.factor;
        var kcalShow = Math.round(o.kcal * scale), protShow = Math.round(o.protein * scale);
        var opt = el("div", "opt" + (isChosen ? " chosen" : ""));
        var row = el("div", "row");
        row.appendChild(el("b", null, esc(pick(o.name))));
        row.appendChild(el("span", "kp", nfi(kcalShow) + " kcal · " + nfi(protShow) + " g P"));
        opt.appendChild(row);
        opt.appendChild(el("div", "items", o.items.map(function (i) { return esc(en() ? i.nameEn : i.name) + " " + (Math.round(i.grams * scale / 5) * 5) + " g"; }).join(" · ")));
        opt.appendChild(el("div", "prep", esc(pick(o.prep))));
        if (isChosen) {
          var stepper = el("div", "s-portion");
          function setFactor(nf) {
            nf = Math.max(0.6, Math.min(1.6, Math.round(nf * 20) / 20));
            var cur2 = plan();
            cur2.nutrition.mealTemplateIds[mi] = o.blockId + "@" + nf;
            store.adoptPlan(cur2, { force: true });   // Portionswahl ist Präferenz — Einkaufsliste folgt automatisch
            render();
          }
          var minus = el("button", null, "−"); minus.type = "button";
          minus.addEventListener("click", function () { setFactor(factor - 0.1); });
          var plus = el("button", null, "+"); plus.type = "button";
          plus.addEventListener("click", function () { setFactor(factor + 0.1); });
          stepper.appendChild(minus);
          stepper.appendChild(el("span", "f", tx("Portion ", "Portion ") + Math.round(scale * 100) + " % · " + tx("Einkauf folgt mit", "shopping list follows")));
          stepper.appendChild(plus);
          opt.appendChild(stepper);
        }
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
        var amount = it.grams >= 1000 ? nf(it.grams / 1000) + " kg" : nfi(it.grams) + " g";
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
    seedStartWeight(p);
    var series = planWeights(p);
    var st = p.selectedTransformation, pg = p.phaseGoal;
    root.appendChild(el("h2", null, tx("Fortschritt", "Progress")));

    var startW = st.startWeightKg;
    var curW = series.length ? series[series.length - 1].kg : null;
    var tr = weekly.trend(series, ymd);

    var grid = el("div", "s-stat");
    function cell(v, l) { var c = el("div", "cell"); c.appendChild(el("div", "v", v)); c.appendChild(el("div", "l", l)); grid.appendChild(c); }
    cell(nf(startW) + " kg", tx("Start", "Start"));
    cell(curW != null ? nf(curW) + " kg" : "—", tx("Aktuell", "Current"));
    cell(nf(pg.week12TargetMinKg) + "–" + nf(pg.week12TargetMaxKg) + " kg", tx("Ziel Woche 12", "Week-12 target"));
    cell(nf(st.finalTargetWeightKg) + " kg", tx("Gesamtziel (~" + st.expectedTotalWeeks + " Wochen)", "Overall (~" + st.expectedTotalWeeks + " weeks)"));
    root.appendChild(grid);

    /* Aussage — geglättet, keine Ein-Punkt-Panik */
    if (tr) {
      var target = weekly.plannedRate(p) || 0;
      var onTrack = Math.abs(tr.deltaPerWeek - target) <= Math.max(0.15, Math.abs(target) * 0.4);
      root.appendChild(el("div", "s-note" + (onTrack ? " ok" : " warn"),
        onTrack ? tx("Du bist aktuell auf Kurs (Trend " + rate(tr.deltaPerWeek) + ").", "You're currently on track (trend " + rate(tr.deltaPerWeek) + ").")
                : tx("Dein Trend (" + rate(tr.deltaPerWeek) + ") liegt außerhalb des Zielkorridors. Im Wochencheck prüfen wir Umsetzung, Kalorien und Schritte.",
                    "Your trend (" + rate(tr.deltaPerWeek) + ") sits outside the corridor. The weekly check will look at execution, calories and steps.")));
    } else {
      root.appendChild(el("div", "s-note", tx("Noch zu wenige Gewichtsdaten für einen Trend — wiege dich an deinen festen Wiege-Tagen.", "Not enough weight data for a trend yet — weigh in on your fixed days.")));
    }

    /* ---- Ausführung: was DU tust, getrennt von dem, was dein Körper tut ----
       Diese Trennung ist der Grund, warum ein Nutzer bei 55 % Umsetzung
       nicht denkt, sein Plan sei kaputt. */
    var exec = decide.executionScore(p, daylog(), ymd, {
      days: 14, weights: series, stepsByDay: healthSteps(), nutritionByDay: nutritionByDay(p)
    });
    if (exec.score != null) {
      var ec = el("div", "s-card");
      ec.appendChild(el("h3", null, tx("Ausführung — letzte " + exec.days + " Tage", "Execution — last " + exec.days + " days")));
      /* Eine Zahl, kein Bruch: „100 / 100" stand vorher über vier Kacheln,
         auf denen ebenfalls „100 %" steht. Zweimal dieselbe Aussage in zwei
         verschiedenen Schreibweisen. */
      ec.appendChild(el("div", "s-big", nfi(exec.score) + " <small>%</small>"));
      /* Die vier Teilwerte gehören in DIESE Karte, sie sind keine eigenen.
         Vorher: vier umrandete Kacheln in einer umrandeten Karte in einer
         Liste umrandeter Karten. */
      var eg = el("div", "s-mini");
      function ecell(v, l) {
        var c = el("div", "cell");
        c.appendChild(el("div", "v", v == null ? "—" : nfi(v) + " %"));
        c.appendChild(el("div", "l", l)); eg.appendChild(c);
      }
      ecell(exec.training, tx("Training", "Training"));
      ecell(exec.nutrition, tx("Ernährung", "Nutrition"));
      ecell(exec.steps, tx("Schritte", "Steps"));
      ecell(exec.weighIn, tx("Wiegen", "Weigh-ins"));
      ec.appendChild(eg);
      // Jede Zahl bekommt eine Konsequenz. Sonst ist sie Dekoration.
      ec.appendChild(el("p", "hint", exec.score < decide.EXEC.poor
        ? tx("Unter " + decide.EXEC.poor + " % wird der Plan bewusst NICHT verschärft. Ein Plateau bei dieser Umsetzung ist kein Planproblem — die nächste Woche entscheidet Ausführung, nicht Kalorien.",
             "Below " + decide.EXEC.poor + "% the plan is deliberately NOT tightened. A plateau at this execution level is not a plan problem — next week is about execution, not calories.")
        : (exec.score >= decide.EXEC.good
          ? tx("Ab " + decide.EXEC.good + " % sind deine Zahlen aussagekräftig: Anpassungen im Wochencheck wirken jetzt wirklich auf den Körper und nicht auf Lücken.",
               "From " + decide.EXEC.good + "% your numbers mean something: weekly adjustments now act on your body, not on gaps.")
          : tx("Zwischen " + decide.EXEC.poor + " und " + decide.EXEC.good + " %: brauchbar, aber der Trend schwankt dadurch stärker als nötig.",
               "Between " + decide.EXEC.poor + " and " + decide.EXEC.good + "%: workable, but it makes the trend noisier than necessary."))));
      root.appendChild(ec);
    }

    /* ---- Verlauf: wohin führt das aktuelle Verhalten? ------------------- */
    var traj = decide.trajectory(p, tr, ymd, exec);
    if (traj) {
      var tc = el("div", "s-card");
      tc.appendChild(el("h3", null, tx("Wenn du so weitermachst", "If you continue like this")));
      if (traj.projectedDate) {
        tc.appendChild(el("div", "goal", nf(traj.goalKg) + " kg " + tx("am", "on") + " " + dt(traj.projectedDate)));
        var vs = traj.daysVsPlan;
        if (vs != null && Math.abs(vs) >= 7) {
          tc.appendChild(el("p", "hint", vs > 0
            ? tx("Das sind " + vs + " Tage vor Plan.", "That is " + vs + " days ahead of plan.")
            : tx("Das sind " + Math.abs(vs) + " Tage später als geplant.", "That is " + Math.abs(vs) + " days later than planned.")));
        }
        tc.appendChild(el("p", "hint", tx(
          "Gerechnet mit deiner gemessenen Rate von " + rate(traj.actualRatePerWeek) + ", nicht mit der geplanten. Ändert sich dein Verhalten, ändert sich dieses Datum.",
          "Calculated from your measured rate of " + rate(traj.actualRatePerWeek) + ", not the planned one. Change your behaviour and this date changes.")));
      } else if (traj.status === "stalled") {
        tc.appendChild(el("p", null, tx(
          "Dein Gewicht bewegt sich gerade nicht. Ein Zieldatum daraus zu rechnen wäre eine erfundene Zahl — deshalb steht hier keine.",
          "Your weight is not moving right now. Projecting a date from that would be a made-up number — so there is none here.")));
      } else if (traj.status === "wrong_direction") {
        tc.appendChild(el("p", null, tx(
          "Der Trend läuft aktuell in die andere Richtung (" + rate(traj.actualRatePerWeek) + "). Der Wochencheck sieht sich zuerst deine Ausführung an, nicht deine Kalorien.",
          "The trend currently runs the other way (" + rate(traj.actualRatePerWeek) + "). The weekly check looks at your execution first, not your calories.")));
      }
      root.appendChild(tc);
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

    /* Fotos — gerätelokal gespeichert, direkt vergleichbar */
    var ph = el("div", "s-card");
    ph.appendChild(el("h3", null, tx("Fotos", "Photos")));
    var marks = [[1, tx("Start", "Start")], [22, tx("Woche 4", "Week 4")], [50, tx("Woche 8", "Week 8")], [78, tx("Woche 12", "Week 12")]];
    var grid = el("div", "s-photos");
    var today = dayNumber(p, ymd);
    marks.forEach(function (mk) {
      var dd = mk[0], label = mk[1];
      var cell = el("div", "ph");
      cell.appendChild(el("span", "cap", esc(label)));
      photoDB.get("d" + dd).then(function (blob) {
        if (blob) {
          cell.innerHTML = "";
          var img = document.createElement("img");
          img.src = URL.createObjectURL(blob);
          img.alt = label;
          cell.appendChild(img);
        } else if (today >= dd) {
          cell.appendChild(el("span", "cap", tx("antippen zum Aufnehmen", "tap to capture")));
        }
      });
      cell.addEventListener("click", function () {
        if (today < dd) return;
        capturePhoto("d" + dd, function () { render(); });
      });
      grid.appendChild(cell);
    });
    ph.appendChild(grid);
    ph.appendChild(el("p", "hint", tx("Fotos bleiben auf DIESEM Gerät (lokaler Speicher) — MaleMetrix lädt nichts hoch. Verpasste Checkpoints lassen sich nachholen.",
      "Photos stay on THIS device (local storage) — MaleMetrix uploads nothing. Missed checkpoints can be caught up.")));
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
  /* Vorbefüllung aus dem, was die App schon weiß — nie doppelt fragen. */
  function prefillCheck(p, ymd) {
    if (checkAnswers.trainingsDone == null) {
      var d = daylog(), done = 0;
      for (var i = 0; i < 7; i++) {
        var dy = model.addDays(ymd, -i);
        if (d[dy] && d[dy].tasks && d[dy].tasks.training) done++;
      }
      checkAnswers.trainingsDone = done;
      checkAnswers._trainingsAuto = true;
    }
    if (checkAnswers.nutritionAdherence == null) {
      // Tagesabschlüsse als grober Anker: viele geschlossene Tage ≙ dranbleiben
      var d2 = daylog(), closed = 0;
      for (var j = 1; j <= 7; j++) {
        var dy2 = model.addDays(ymd, -j);
        if (d2[dy2] && d2[dy2].closed) closed++;
      }
      if (closed >= 5) checkAnswers.nutritionAdherence = "gut";
      else if (closed >= 3) checkAnswers.nutritionAdherence = "mittel";
      // unter 3: bewusst offen lassen — raten wäre eine stille Annahme
    }
  }
  function vCheck() {
    var p = activePlan();
    var ymd = todayYmd();
    var week = weekNumber(p, ymd);
    prefillCheck(p, ymd);
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
      var auto = q.id === "trainingsDone" && checkAnswers._trainingsAuto;
      wrap.appendChild(el("div", "lbl", esc(en() ? q.labelEn : q.label) + (auto ? " ✓" : "")));
      if (auto) wrap.appendChild(el("div", "why", tx("Aus deinen abgehakten Trainings übernommen — korrigierbar.", "Taken from your completed sessions — you can correct it.")));
      if (q.type === "number") {
        var inp = el("input"); inp.type = "number"; inp.min = 0; inp.max = 7;
        inp.value = checkAnswers[q.id] != null ? checkAnswers[q.id] : "";
        inp.addEventListener("change", function () { checkAnswers[q.id] = parseInt(inp.value, 10); delete checkAnswers._trainingsAuto; });
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
      // Die gemessene Ausführung geht mit in die Entscheidung: sie kann eine
      // wohlwollende Selbsteinschätzung überstimmen, nie umgekehrt.
      var ctx = { plan: p, week: week, todayYmd: ymd, weights: planWeights(p), answers: checkAnswers,
                  execution: decide.executionScore(p, daylog(), ymd, {
                    days: 14, weights: planWeights(p), stepsByDay: healthSteps(), nutritionByDay: nutritionByDay(p) }) };
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
     PLAN ANPASSEN — Trainingstage, Zeiten, Ernährung jederzeit ändern
     ================================================================ */
  function planToAnswers(p) {
    var st = p.selectedTransformation || {}, t = p.training || {}, n = p.nutrition || {},
        d = p.dailyTargets || {}, l = p.lifestyle || {}, r = p.reminderPreferences || {};
    var expMap = { beginner: "neu", intermediate: "mid", advanced: "pro" };
    var firstTime = null;
    try { firstTime = t.preferredTimes && t.weekdays.length ? t.preferredTimes[t.weekdays[0]] : null; } catch (e) {}
    return {
      age: st.age, activity: st.activity,
      daysPerWeek: t.daysPerWeek, weekdays: (t.weekdays || []).slice(),
      preferredTime: firstTime || "18:00",
      location: t.location, experience: expMap[t.experienceLevel] || "mid",
      injuries: (t.injuries || []).slice(),
      maxSessionMinutes: t.maximumSessionMinutes,
      mealCount: n.mealCount, diet: (n.dietaryPreferences || [])[0] || "misch",
      exclusions: (n.exclusions || []).slice(),
      cookingMinutesMax: n.cookingMinutesMax || 20,
      eatingOutPerWeek: n.eatingOutPerWeek != null ? n.eatingOutPerWeek : 1,
      shoppingDay: n.shoppingDay, mealPrepDay: n.mealPrepDay,
      householdSize: n.householdSize || 1,
      wakeTime: l.wakeTime || r.morningBriefTime || "06:30",
      sleepTime: l.sleepTime || "22:30",
      workPattern: l.workPattern || "day",
      steps: d.steps, reviewWeekday: r.weeklyReviewWeekday
    };
  }

  var editAnswers = null;
  function vEdit() {
    var p = activePlan() || plan();
    if (!p) { location.hash = "#einrichten"; return; }
    if (!editAnswers) editAnswers = planToAnswers(p);
    root.appendChild(el("h2", null, tx("Plan anpassen", "Adjust plan")));
    root.appendChild(el("p", "s-sub", tx(
      "Ändere Trainingstage, Zeiten und Ernährung — dein Fortschritt, deine Historie und dein Startdatum bleiben erhalten. Die Anpassung wird als neue Planversion festgehalten.",
      "Change training days, times and nutrition — your progress, history and start date stay. The adjustment is recorded as a new plan version.")));

    var tg = MM.store.get("transform_goal", null);
    var card = el("div", "s-card");
    var qs = input.questionsFor({ tg: tg, trf: input.mapTransformation(tg), answers: editAnswers });
    qs.forEach(function (q) {
      var wrap = el("div", "s-q");
      wrap.appendChild(el("div", "lbl", esc(en() ? q.labelEn : q.label)));
      wrap.appendChild(el("div", "why", tx("Warum: ", "Why: ") + esc(en() ? q.whyEn : q.why)));
      var val = editAnswers[q.id] != null ? editAnswers[q.id] : q.value;
      if (q.type === "choice" || q.type === "weekday") {
        var opts = el("div", "opts");
        var options = q.type === "weekday" ? [0, 1, 2, 3, 4, 5, 6] : q.options;
        options.forEach(function (o) {
          var b = el("button", String(val) === String(o) ? "on" : "", q.type === "weekday" ? wdName(o) : esc(labelFor(q.id, o)));
          b.type = "button";
          b.addEventListener("click", function () { editAnswers[q.id] = o; render(); });
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
            editAnswers[q.id] = cur.slice(); render();
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
          editAnswers[q.id] = q.type === "time" ? inp.value : parseFloat(inp.value);
        });
        wrap.appendChild(inp);
      }
      card.appendChild(wrap);
    });
    root.appendChild(card);

    var err = el("p", "s-err"); err.style.display = "none";
    var save = el("button", "btn btn-primary", tx("Anpassung speichern", "Save adjustment"));
    save.addEventListener("click", function () {
      var collected = input.collect({ transformGoal: tg, checkResult: MM.store.get("check_result", null), answers: editAnswers, measured: measuredEnergy() });
      if (!collected.ok) { err.textContent = tx("Es fehlt noch: ", "Still missing: ") + collected.missing.join(", "); err.style.display = ""; return; }
      var r = engine.createPlan(collected, p.startDate || todayYmd());
      if (!r.ok) { err.textContent = r.errors.join("; "); err.style.display = ""; return; }
      var rc = store.reconfigurePlan(r.plan, tx("Vom Nutzer angepasst (Plan-Einstellungen)", "Adjusted by the user (plan settings)"));
      if (!rc.ok) { err.textContent = rc.errors.join("; "); err.style.display = ""; return; }
      track("plan_reconfigured");
      editAnswers = null;
      location.hash = "#heute";
    });
    root.appendChild(save);
    var cancel = el("a", "btn btn-ghost btn-sm", tx("Abbrechen", "Cancel"));
    cancel.href = "#profil"; cancel.style.marginLeft = "10px";
    cancel.addEventListener("click", function () { editAnswers = null; });
    root.appendChild(cancel);
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
      var accLink = el("a", "btn btn-ghost btn-sm", tx("Konto verwalten", "Manage account"));
      accLink.href = "mein-protokoll.html?legacy=1#settings";
      acc.appendChild(accLink);
    } else {
      acc.appendChild(loginForm(
        "Mit Konto synchronisiert dein Plan über alle Geräte und der Kalender-Feed wird möglich:",
        "With an account your plan syncs across devices and the calendar feed becomes available:"));
    }
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
      /* „Status: active" war ein interner Wert im deutschen Text. */
      var statusText = { draft: tx("Entwurf", "draft"), active: tx("aktiv", "active"),
        paused: tx("pausiert", "paused"), completed: tx("abgeschlossen", "completed") }[p.status] || p.status;
      pm.appendChild(el("p", "hint", tx("Version ", "Version ") + p.version + " · " + statusText +
        " · " + tx("Start", "start") + ": " + (p.startDate ? dt(p.startDate) : "—")));
      var hist = store.getHistory();
      if (hist.length) {
        hist.slice(-5).reverse().forEach(function (h) {
          pm.appendChild(el("p", "hint", "v" + h.version + " (" + (h.changedAt || "").slice(0, 10) + ", " + h.source + "): " + esc(h.reason)));
        });
      }
      var editBtn = el("a", "btn btn-ghost btn-sm", tx("Plan anpassen", "Adjust plan"));
      editBtn.href = "#anpassen";
      editBtn.style.marginRight = "8px";
      pm.appendChild(editBtn);
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
    /* Vorher eine Zeile Fliesstext mit Mittelpunkten dazwischen: fuenf
       Ziele, jedes 16 Punkt hoch und keine zwei Millimeter auseinander.
       Jetzt eine Liste — jede Zeile eine eigene Flaeche. */
    var links = el("div", "s-links");
    [["tools.html", tx("Rechner & Tools", "Calculators & tools")],
     ["blog.html", tx("Wissen", "Knowledge")],
     ["datenschutz.html", tx("Datenschutz", "Privacy")],
     ["impressum.html", tx("Impressum", "Imprint")],
     ["agb.html", tx("AGB", "Terms")]].forEach(function (l) {
      var a = el("a", null, esc(l[1]));
      a.href = l[0];
      links.appendChild(a);
    });
    more.appendChild(links);
    root.appendChild(more);
  }

  /* ---------------- Start ---------------- */
  track("simple_app_opened");
  render();
})();
