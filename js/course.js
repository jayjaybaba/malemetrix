/* ==========================================================================
   MALEMETRIX 12-WEEK SYSTEM 2.0 — persönliches Performance Operating System
   --------------------------------------------------------------------------
   - Bezahlter Programminhalt (die 12 Wochen) liegt AES-verschlüsselt im Vault
     (#courseVault); der Zugangscode ist der Schlüssel (js/vault.js). Falscher
     Code ⇒ Entschlüsselung schlägt fehl. Wir ändern diese Inhalte nicht.
   - Darüber liegt das OS: Personalisierung (Goal × Bottleneck aus dem
     MaleMetrix Score), TODAY-Ansicht, echte Modus-Logik, Minimum Day,
     Weekly Pulse + Adjustment-Engine, Progress + Transformation-Report.
   - Alle Nutzerdaten liegen lokal (MM.store / localStorage).
   ========================================================================== */
(function () {
  "use strict";
  var gate = document.getElementById("courseGate");
  var content = document.getElementById("courseContent");
  var mount = document.getElementById("courseWeeks");
  if (!gate || !content || !mount) return;

  var DATA = { weeks: [], phases: {}, modules: [] };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };
  var S = { get: function (k, d) { return MM.store.get(k, d); }, set: function (k, v) { MM.store.set(k, v); } };
  function norm(s) { return MM.vault ? MM.vault.norm(s) : String(s || "").trim().toUpperCase().replace(/\s+/g, ""); }

  /* =========================================================================
     OS-KONFIGURATION (Framework — kein bezahlter Inhalt)
     ========================================================================= */
  var DAY = {
    strength: { label: "STRENGTH", icon: "🏋️", tag: "Kraft",
      full: "45–60 Min Krafttraining. Grundübungen, saubere Technik, letzte 1–3 Wiederholungen fordernd (RIR 1–3). Progression: dieselben Gewichte wie letztes Mal — plus eine Wiederholung oder eine kleine Stufe mehr.",
      min: "20 Min Kern-Krafttraining: 3 Grundübungen (Beine, Druck, Zug), je 2 harte Sätze.",
      why: "Kraft ist der Reiz, der Muskulatur erhält und aufbaut — im Defizit schützt sie deine Muskeln, im Aufbau macht sie den Unterschied." },
    engine: { label: "ENGINE", icon: "🚴", tag: "Cardio",
      full: "35–45 Min Zone 2 (locker, du könntest reden) — Rad, zügiges Gehen, Rudern. Baut deinen aeroben Motor ohne die Erholung zu zerstören.",
      min: "20 Min zügiges Gehen. Zählt.",
      why: "Cardiofitness (VO₂max) ist einer der stärksten Prädiktoren für langfristige Gesundheit — nicht nur etwas für Ausdauersportler." },
    recover: { label: "RECOVER", icon: "🧘", tag: "Regeneration",
      full: "Aktive Erholung: 20–30 Min leichte Bewegung + Mobility. Heute Abend: feste Schlafzeit, Bildschirm runter, kühl & dunkel.",
      min: "20 Min Spaziergang + früh ins Bett.",
      why: "Regeneration ist der Multiplikator: schlechter Schlaf drückt Insulinsensitivität, Hunger, Training und Hormone gleichzeitig." },
    move: { label: "MOVE", icon: "🚶", tag: "Alltag",
      full: "Alltagsbewegung: Schritt-Ziel treffen (deine Baseline + etwas mehr). Treppe statt Aufzug, Gang zu Fuß.",
      min: "Ein zügiger 15–20-Min-Spaziergang.",
      why: "Alltagsbewegung (NEAT) ist der unterschätzte Energieverbrauch-Hebel — konstanter als jede einzelne Trainingseinheit." },
    mobility: { label: "MOBILITY", icon: "🤸", tag: "Beweglichkeit",
      full: "15–20 Min Mobility für Hüfte, Schulter, Wirbelsäule. Bewegt, was beim Sitzen steif wird.",
      min: "10 Min Mobility auf die problematischste Region.",
      why: "Beweglichkeit hält dich trainierbar und verletzungsärmer — kleiner Aufwand, große Wirkung auf Dauer." },
    reset: { label: "RESET", icon: "🌿", tag: "Leichter Tag",
      full: "Bewusst leichter Tag: Spaziergang, Sonne, gutes Essen, früh schlafen. Kein schlechtes Gewissen — das ist Teil des Plans.",
      min: "Ein Spaziergang. Mehr muss heute nicht sein.",
      why: "Ein geplanter leichter Tag ist kein Nichtstun — er hält dich über 12 Wochen im Spiel. Kein Tag ist „verloren“." }
  };

  var MODES = {
    cut: {
      label: "CUT", tag: "Fett runter", oneLiner: "LOSE FAT. KEEP PERFORMANCE.",
      pattern: ["strength", "engine", "strength", "recover", "strength", "engine", "reset"],
      priorities: ["Taille & Gewichtstrend nach unten", "Kraft & Trainingsleistung halten", "Protein hoch", "Konstanz vor Härte"],
      nutrition: "Moderates Defizit, Protein oben (~2 g/kg). Kein Crash — 0,5–1 % Körpergewicht pro Woche ist das effiziente Fenster.",
      metrics: [["waist", "Bauchumfang (cm)"], ["weight", "Gewicht (kg)"], ["strength", "Kraft-Marker"]],
      win: [["train", "3 Strength-Sessions"], ["engine", "2 Engine-Einheiten"], ["nutrition", "Protein-Ziel an 6/7 Tagen"], ["move", "Schritt-Ziel an 5 Tagen"]]
    },
    recomp: {
      label: "RECOMP", tag: "Fett runter + Muskel rauf", oneLiner: "LOOK BETTER WITHOUT CHASING SCALE WEIGHT.",
      pattern: ["strength", "engine", "strength", "recover", "strength", "move", "reset"],
      priorities: ["Taille runter bei stabiler Waage", "Kraft nach oben", "Protein hoch", "Geduld — Recomp ist langsam sichtbar"],
      nutrition: "Nahe Erhaltung oder kleines Defizit, viel Protein. Ein stabiles Gewicht ist hier KEIN Stillstand — Taille ↓ und Kraft ↑ sind der Erfolg.",
      metrics: [["waist", "Bauchumfang (cm)"], ["strength", "Kraft-Marker"], ["weight", "Gewicht (kg, Kontext)"]],
      win: [["train", "3 Strength-Sessions"], ["engine", "1–2 Engine-Einheiten"], ["nutrition", "Protein-Ziel an 6/7 Tagen"], ["recover", "Schlaf-Fenster an 5 Nächten"]]
    },
    build: {
      label: "BUILD", tag: "Muskel & Kraft", oneLiner: "BUILD MUSCLE. CONTROL FAT GAIN.",
      pattern: ["strength", "engine", "strength", "recover", "strength", "strength", "reset"],
      priorities: ["Kraftprogression", "Trainingsqualität & Volumen", "Kleiner Überschuss — lean, kein Bulk", "Taille als Guardrail beobachten"],
      nutrition: "Kleiner Überschuss (~5–10 %), langsam zunehmen. Steigt die Taille unverhältnismäßig, ziehst du den Überschuss zurück — kein Dreck-Bulk.",
      metrics: [["strength", "Kraft-Marker"], ["weight", "Gewicht (kg)"], ["waist", "Bauchumfang (cm, Guardrail)"]],
      win: [["train", "4 Strength-Sessions"], ["engine", "1 Engine-Einheit (Recovery erhalten)"], ["nutrition", "Protein + Überschuss getroffen"], ["recover", "Schlaf an 5 Nächten (Wachstum)"]]
    },
    perform: {
      label: "PERFORM", tag: "Stärker + größerer Motor", oneLiner: "BUILD A STRONGER BODY AND A BIGGER ENGINE.",
      pattern: ["strength", "engine", "strength", "recover", "engine", "strength", "reset"],
      priorities: ["Kraft UND Cardiofitness gleichzeitig", "Belastbarkeit & Energie", "Recovery schützen", "Gesundheitsmarker im Blick"],
      nutrition: "Erhaltung. Training und Cardio fuelen, Protein solide. Leistung schlägt hier die Waage.",
      metrics: [["strength", "Kraft-Marker"], ["cardio", "Cardio-Marker (z. B. 5-km-Zeit)"], ["energy", "Energie (1–10)"]],
      win: [["train", "3 Strength-Sessions"], ["engine", "2–3 Engine-Einheiten"], ["recover", "Schlaf an 5 Nächten"], ["move", "Schritt-Ziel an 5 Tagen"]]
    }
  };
  var MODE_ORDER = ["cut", "recomp", "build", "perform"];

  var BOTTLENECKS = {
    recovery: { label: "RECOVERY", why: "Schlaf & Erholung sind aktuell deine größte Lücke — sie ziehen Training, Hunger und Hormone mit nach unten.", focus: "Stabilisiere zuerst deine Recovery, bevor wir die Trainingsbelastung aggressiver steigern." },
    engine: { label: "ENGINE", why: "Deine Cardiofitness/Bewegung ist der schwächste Knoten — genau hier liegt der größte Gesundheits-Hebel.", focus: "Baue systematisch deinen aeroben Motor auf — konstante Zone-2-Einheiten schlagen seltene Zerstörungs-Sessions." },
    body: { label: "BODY", why: "Körperzusammensetzung/Taille ist dein Hauptthema — daran hängen Stoffwechsel und Risiko.", focus: "Fokus auf Taille & Körperfett bei geschützter Muskulatur — nicht die Waage jagen." },
    metabolic: { label: "METABOLIC", why: "Deine Stoffwechsel-/Ernährungsbasis ist der Engpass — Protein, Struktur und Alltagsbewegung ziehen am meisten.", focus: "Erst Ernährungsstruktur und Bewegung stabilisieren — hier entsteht die Basis für alles andere." },
    strength: { label: "STRENGTH", why: "Kraft & Muskelmasse sind dein schwächster Bereich — deine funktionelle Reserve und dein Stoffwechsel profitieren am meisten.", focus: "Progressive Kraftentwicklung hat Priorität — sauberes Training, echte Progression." },
    lifestyle: { label: "LIFESTYLE", why: "Nicht das Wissen fehlt, sondern die konstante Umsetzung im Alltag — das ist der eigentliche Hebel.", focus: "Baue zuerst ein System, das deinen Alltag überlebt: feste Zeiten, Minimum Days, Nie-Null." },
    medical: { label: "MEDICAL CHECK", why: "Einige deiner Angaben deuten darauf hin, dass zuerst eine ärztliche Abklärung sinnvoll sein könnte.", focus: "Kläre relevante Warnzeichen ärztlich ab, bevor du die Belastung hochfährst — das Programm läuft parallel auf dem Fundament weiter." }
  };
  // Score-Sub-Score → Programm-Bottleneck
  var SCORE_MAP = { recovery: "recovery", body: "body", strength: "strength", fuel: "metabolic", blood: "metabolic", drive: "recovery", execution: "lifestyle" };

  var PHASES = [
    { key: 1, name: "BUILD THE BASE", weeks: [1, 3], feel: "Ich bekomme mein System unter Kontrolle." },
    { key: 2, name: "BUILD CAPACITY", weeks: [4, 6], feel: "Ich werde leistungsfähiger." },
    { key: 3, name: "PUSH PERFORMANCE", weeks: [7, 9], feel: "Jetzt passiert sichtbar etwas." },
    { key: 4, name: "LOCK IT IN", weeks: [10, 12], feel: "Ich konsolidiere und messe, was sich verändert hat." }
  ];
  var MISSIONS = {
    1: "CONTROL YOUR ENVIRONMENT", 2: "BUILD CONSISTENCY", 3: "MASTER THE BASICS",
    4: "START PROGRESSING", 5: "BUILD YOUR ENGINE", 6: "HALFWAY CHECK",
    7: "PUSH THE STIMULUS", 8: "SHARPEN EXECUTION", 9: "PEAK THE BLOCK",
    10: "CONSOLIDATE", 11: "STABILIZE HABITS", 12: "REVIEW · BENCHMARK · NEXT MOVE"
  };

  /* =========================================================================
     ZUGANG (Vault)
     ========================================================================= */
  async function tryCode(code) {
    var c = norm(code);
    if (!c || !window.MM || !MM.vault) return false;
    try { var js = await MM.vault.open("courseVault", c); (0, eval)(js); DATA = window.MM_COURSE || DATA; S.set("course_code", c); return true; }
    catch (e) { return false; }
  }

  /* =========================================================================
     STATE / PERSONALISIERUNG
     ========================================================================= */
  function goal() { var g = S.get("c2_goal", ""); return MODES[g] ? g : ""; }
  function setGoal(g) { S.set("c2_goal", g); }
  function bottleneck() { var b = S.get("c2_bottleneck", ""); return BOTTLENECKS[b] ? b : ""; }
  function setBottleneck(b) { S.set("c2_bottleneck", b); }
  function nutritionMode() { return S.get("c2_nutrition", "simple"); }
  function startDate() { return S.get("c2_start", ""); }
  function setStart(iso) { S.set("c2_start", iso); }
  function personalized() { return !!(goal() && bottleneck() && startDate()); }

  function scoreResult() { try { return S.get("check_result", null); } catch (e) { return null; } }
  // Empfehlung aus dem MaleMetrix Score (echte Daten, keine Fake-KI)
  function recommend() {
    var r = scoreResult(); var out = { goal: "", bottleneck: "", from: "" };
    if (r && r.bottleneck && r.bottleneck.key) { out.bottleneck = SCORE_MAP[r.bottleneck.key] || ""; out.from = "score"; }
    if (r && r.answers) {
      var a = r.answers;
      var g = [].concat(a.goal_main || []);
      if (g.indexOf("lose_fat") >= 0 || g.indexOf("fatloss") >= 0) out.goal = "cut";
      else if (g.indexOf("build_muscle") >= 0 || g.indexOf("muscle") >= 0) out.goal = "build";
      else if (g.indexOf("performance") >= 0 || g.indexOf("fitness") >= 0) out.goal = "perform";
      else if (g.length) out.goal = "recomp";
    }
    return out;
  }

  /* ---- Tages-/Wochen-Berechnung ---- */
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function todayYmd() { return ymd(new Date()); }
  function dayIndex() {
    var s = startDate(); if (!s) return 1;
    var a = new Date(s + "T00:00:00"), b = new Date(todayYmd() + "T00:00:00");
    var diff = Math.floor((b - a) / 86400000) + 1;
    return Math.max(1, diff);
  }
  function programOver() { return dayIndex() > 84; }
  function currentDay() { return Math.min(84, dayIndex()); }
  function currentWeek() { return Math.min(12, Math.max(1, Math.ceil(currentDay() / 7))); }
  function phaseOf(week) { for (var i = 0; i < PHASES.length; i++) { if (week >= PHASES[i].weeks[0] && week <= PHASES[i].weeks[1]) return PHASES[i]; } return PHASES[0]; }

  // Bottleneck moduliert das Tagesmuster (Phase 1): Recovery-Engpass ⇒ mehr Erholung, Engine ⇒ mehr Cardio.
  function patternFor(mode, week) {
    var p = (MODES[mode] || MODES.recomp).pattern.slice();
    var b = bottleneck();
    if (week <= 3) {
      if (b === "recovery") { p[1] = "recover"; p[5] = "recover"; }
      else if (b === "engine") { p[5] = "engine"; }
      else if (b === "lifestyle") { p[2] = "move"; }
    }
    return p;
  }
  function dayTypeToday() {
    var mode = goal() || "recomp"; var d = currentDay(); var week = currentWeek();
    var pat = patternFor(mode, week); return pat[(d - 1) % 7];
  }

  /* ---- Daily Completion ---- */
  function dailyAll() { return S.get("c2_daily", {}) || {}; }
  function dailyFor(dateStr) { var a = dailyAll(); return a[dateStr] || {}; }
  function setDaily(dateStr, key, val) { var a = dailyAll(); a[dateStr] = a[dateStr] || {}; if (val) a[dateStr][key] = true; else delete a[dateStr][key]; S.set("c2_daily", a); }
  function setEnergy(dateStr, v) { var a = dailyAll(); a[dateStr] = a[dateStr] || {}; a[dateStr].energy = v; S.set("c2_daily", a); }

  // Zähle in einer Programmwoche erledigte Tage nach Kategorie
  function weekStats(week) {
    var s = startDate(); var res = { train: 0, engine: 0, move: 0, recover: 0, nutrition: 0, active: 0, days: 0 };
    if (!s) return res;
    var start = new Date(s + "T00:00:00");
    var mode = goal() || "recomp"; var pat = patternFor(mode, week);
    for (var i = 0; i < 7; i++) {
      var dIdx = (week - 1) * 7 + i; // 0-based day within program
      var date = new Date(start.getTime() + dIdx * 86400000);
      if (date > new Date(todayYmd() + "T00:00:00")) break;
      res.days++;
      var rec = dailyFor(ymd(date));
      var dt = pat[i];
      if (rec.train) { res.train++; if (dt === "engine") res.engine++; }
      if (rec.move) res.move++;
      if (rec.nutrition) res.nutrition++;
      if (rec.recover) res.recover++;
      if (rec.train || rec.move || rec.recover) res.active++;
    }
    return res;
  }
  function consistency() {
    var a = dailyAll(); var elapsed = Math.min(84, currentDay()); var active = 0;
    var s = startDate(); if (!s) return { active: 0, elapsed: 0, pct: 0 };
    var start = new Date(s + "T00:00:00");
    for (var i = 0; i < elapsed; i++) {
      var date = ymd(new Date(start.getTime() + i * 86400000));
      var rec = a[date] || {};
      if (rec.train || rec.move || rec.recover) active++;
    }
    return { active: active, elapsed: elapsed, pct: elapsed ? Math.round(active / elapsed * 100) : 0 };
  }

  /* ---- Weekly Pulse + Adjustment Engine ---- */
  function pulses() { return S.get("c2_pulse", {}) || {}; }
  function savePulse(week, obj) { var p = pulses(); p[week] = obj; S.set("c2_pulse", p); }
  // Transparente Regeln → Verdikt. change one variable.
  function adjudicate(week, inp) {
    var st = weekStats(week);
    var plannedTrain = (MODES[goal() || "recomp"].pattern).filter(function (x) { return x === "strength"; }).length;
    var adher = plannedTrain ? st.train / plannedTrain : 0;
    if (inp.warning) return { code: "check", title: "CHECK FIRST", cls: "check", text: "Du hast ein mögliches Warnsignal angegeben. Kläre das bitte zuerst ärztlich ab, bevor du die Belastung erhöhst. Das Programm läuft auf dem Fundament (Bewegung, Schlaf, Ernährung) ruhig weiter." };
    if (adher < 0.7) return { code: "exec", title: "EXECUTION FIRST", cls: "exec", text: "Dein Plan ist wahrscheinlich noch nicht das Problem. Deine Umsetzung war diese Woche nicht konstant genug (" + Math.round(adher * 100) + " % der Krafteinheiten), um sinnvoll zu beurteilen, ob eine Änderung nötig ist. Wir halten die Strategie stabil und fokussieren Umsetzung." };
    if (inp.energy && inp.energy <= 3 && inp.sleep && inp.sleep === "schlecht") return { code: "recover", title: "RECOVERY FIRST", cls: "recover", text: "Adhärenz ist gut, aber Energie und Schlaf sind unten. Mehr Belastung wäre jetzt nicht mehr Fortschritt. Diese Woche: eine Trainingseinheit rausnehmen oder leichter machen, Schlaf priorisieren. Dann neu bewerten." };
    // mode-spezifische Stagnation
    var prev = pulses()[week - 1];
    var stagnation = false;
    if (inp.waist && prev && prev.inp && prev.inp.waist) { if (Math.abs(parseFloat(inp.waist) - parseFloat(prev.inp.waist)) < 0.3) stagnation = true; }
    var g = goal();
    if (g === "cut" || g === "recomp") {
      if (stagnation && prev && prev.stagnant) return { code: "adjust", title: "ADJUST — eine Variable", cls: "adjust", text: "Adhärenz hoch, Taille aber mehrere Wochen unverändert. Jetzt änderst du GENAU EINE Variable — z. B. 500–800 zusätzliche Schritte/Tag ODER eine Engine-Einheit mehr ODER ~10 % weniger Kalorien. Nicht alles gleichzeitig. Dann beobachten." };
    }
    if (g === "build") {
      if (inp.waist && prev && prev.inp && prev.inp.waist && parseFloat(inp.waist) - parseFloat(prev.inp.waist) > 1) return { code: "adjust", title: "BODY FAT GUARDRAIL", cls: "adjust", text: "Gewicht/Taille steigen schneller als gewollt. Nicht einfach „mehr essen“ — zieh den Überschuss etwas zurück (kleinere Portionen abends), Progression im Gym bleibt der Fokus." };
    }
    return { code: "ontrack", title: "ON TRACK", cls: "ontrack", text: "Adhärenz gut, Richtung stimmt. Plan beibehalten — Konstanz ist gerade dein stärkster Hebel. Nichts ändern, was funktioniert.", stagnant: stagnation };
  }

  /* =========================================================================
     RENDER
     ========================================================================= */
  var view = S.get("c2_view", "today");
  function setView(v) { view = v; S.set("c2_view", v); render(); }

  function statusStrip() {
    var g = goal(), b = bottleneck(), ph = phaseOf(currentWeek());
    return '<div class="c2-strip">' +
      '<span class="c2-pill"><span class="dot"></span>DAY <b>' + currentDay() + '</b>/84</span>' +
      '<span class="c2-pill">WEEK <b>' + currentWeek() + '</b>/12</span>' +
      '<span class="c2-pill">PHASE <b>' + ph.key + '</b>/4 · ' + esc(ph.name) + '</span>' +
      '<span class="c2-pill">MODE <b>' + esc((MODES[g] || {}).label || "—") + '</b></span>' +
      (b ? '<span class="c2-pill">BOTTLENECK <b>' + esc(BOTTLENECKS[b].label) + '</b></span>' : "") +
      '</div>';
  }
  function navBar() {
    var items = [["today", "HEUTE", "01"], ["plan", "PLAN", "02"], ["progress", "FORTSCHRITT", "03"]];
    return '<div class="c2-nav">' + items.map(function (it) {
      return '<button data-view="' + it[0] + '" class="' + (view === it[0] ? "on" : "") + '"><span class="n">' + it[2] + '</span>' + it[1] + '</button>';
    }).join("") + '</div>';
  }
  function phaseBar() {
    var w = currentWeek();
    return '<div class="c2-phase"><div class="c2-phase-top"><span>PHASE <b>' + phaseOf(w).key + ' / 4</b> — ' + esc(phaseOf(w).name) + '</span><span>WEEK <b>' + w + '</b> · DAY <b>' + currentDay() + '</b></span></div>' +
      '<div class="c2-phase-track">' + PHASES.map(function (p) {
        var doneP = w > p.weeks[1]; var inP = w >= p.weeks[0] && w <= p.weeks[1];
        var frac = inP ? (w - p.weeks[0] + 1) / (p.weeks[1] - p.weeks[0] + 1) : (doneP ? 1 : 0);
        return '<div class="c2-phase-seg ' + (doneP ? "done" : "") + '"><div class="fill" style="width:' + Math.round(frac * 100) + '%"></div></div>';
      }).join("") + '</div></div>';
  }

  /* ---------- TODAY ---------- */
  function renderToday() {
    if (programOver()) return renderReport(true);
    var dt = DAY[dayTypeToday()]; var g = goal(); var mode = MODES[g]; var week = currentWeek();
    var date = todayYmd(); var rec = dailyFor(date);
    var minKey = "c2_min_" + date; var showMin = S.get(minKey, false);
    var name = (S.get("unlock_name", "") || "").split(" ")[0];
    var wk = weekStats(week);

    var checks = [["train", "🏋️", "TRAIN"], ["move", "🚶", "MOVE"], ["nutrition", "🍳", "NUTRITION"], ["recover", "😴", "RECOVER"]];
    var winList = mode.win.map(function (wc) {
      var hit = false;
      if (wc[0] === "train") hit = wk.train >= 3; else if (wc[0] === "engine") hit = wk.engine >= 1;
      else if (wc[0] === "nutrition") hit = wk.nutrition >= 5; else if (wc[0] === "move") hit = wk.move >= 5;
      else if (wc[0] === "recover") hit = wk.recover >= 5;
      return '<li class="' + (hit ? "hit" : "") + '">' + esc(wc[1]) + '</li>';
    }).join("");

    var html = phaseBar() +
      '<div class="c2-today">' +
      '<span class="c2-greet">' + (name ? "GUTEN TAG, " + esc(name.toUpperCase()) : "DEIN TAG") + '</span>' +
      '<div class="c2-daybig"><h1>Tag ' + currentDay() + '</h1><span>Phase ' + phaseOf(week).key + " · " + esc(phaseOf(week).name) + '</span></div>' +
      '<p class="c2-metaline">Modus <b>' + esc(mode.label) + '</b> · Engpass <b>' + esc((BOTTLENECKS[bottleneck()] || {}).label || "—") + '</b> · Heute: <b>' + esc(dt.label) + '</b></p>' +

      '<div class="c2-action">' +
      '<div class="c2-action-head"><span class="c2-action-ico">' + dt.icon + '</span><h3>' + esc(dt.label) + ' — ' + esc(dt.tag) + '</h3><span class="tag">Heutige Priorität</span></div>' +
      '<div class="c2-action-body">' +
      '<div class="c2-toggle"><button data-min="0" class="' + (showMin ? "" : "on") + '">Full Day</button><button data-min="1" class="' + (showMin ? "on" : "") + '">Minimum Day</button></div>' +
      '<p>' + esc(showMin ? dt.min : dt.full) + '</p>' +
      '</div></div>' +

      '<div class="c2-daily">' + checks.map(function (c) {
        return '<div class="c2-check ' + (rec[c[0]] ? "done" : "") + '" data-check="' + c[0] + '"><span class="ic">' + c[1] + '</span><span class="lb">' + c[2] + '</span></div>';
      }).join("") + '</div>' +
      '<div class="c2-energy"><span>Energie heute</span><input type="range" min="1" max="5" value="' + (rec.energy || 3) + '" data-energy><span id="c2eVal">' + (rec.energy || 3) + '/5</span></div>' +
      '</div>' +

      '<div class="c2-card2 c2-why"><span class="k">Why this matters</span><p>' + esc(dt.why) + '</p>' +
      '<p class="c2-muted" style="margin-top:8px">Mehr Hintergrund im <a href="ebooks/protokoll.html" style="color:var(--c2-blue2)">PROTOKOLL</a>.</p></div>' +

      '<div class="c2-card2 c2-mission"><span class="k">This week’s mission · Woche ' + week + '</span><h3>' + esc(MISSIONS[week] || "") + '</h3>' +
      '<p class="c2-muted" style="margin-top:6px">Fokus deines Engpasses: ' + esc((BOTTLENECKS[bottleneck()] || {}).focus || "") + '</p></div>' +

      '<div class="c2-card2 c2-win"><span class="k">Win Condition · diese Woche gilt als Erfolg, wenn</span><ul>' + winList + '</ul>' +
      '<p class="c2-muted" style="margin-top:10px">Erledigt: ' + wk.train + ' Strength · ' + wk.engine + ' Engine · ' + wk.nutrition + ' Ernährung · ' + wk.recover + ' Recovery (' + wk.days + ' Tage gelaufen)</p></div>' +

      (currentWeek() >= 1 ? '<div style="margin:16px 0 6px"><button class="c2-btn block" data-view="progress">Zum Weekly Pulse & Fortschritt →</button></div>' : "") +
      '<p class="c2-muted" style="text-align:center">Nie zweimal hintereinander aussetzen. Ein Minimum Day zählt. Konstanz schlägt Perfektion.</p>';
    return html;
  }

  /* ---------- PLAN (Roadmap, aus Vault-Inhalten) ---------- */
  function renderPlan() {
    var g = goal(); var mode = MODES[g];
    var html = '<h2 class="c2-sec-h">Deine 12-Wochen-Roadmap</h2><p class="c2-sec-lead">Der Überblick. Dein täglicher Fahrplan steht unter <b>HEUTE</b>. Hier siehst du, wohin die Reise geht — Phase für Phase.</p>';
    // Mode summary
    html += '<div class="c2-card2"><span class="k">Dein Modus · ' + esc(mode.label) + '</span><h3 style="margin:2px 0 8px">' + esc(mode.oneLiner) + '</h3>' +
      '<p style="margin-bottom:8px"><b>Prioritäten:</b> ' + mode.priorities.map(esc).join(" · ") + '</p>' +
      '<p><b>Ernährung:</b> ' + esc(mode.nutrition) + '</p></div>';
    // Phases + weeks
    PHASES.forEach(function (p) {
      html += '<div class="c2-card2" style="border-left:3px solid var(--c2-blue)"><span class="k">Phase ' + p.key + ' · Woche ' + p.weeks[0] + "–" + p.weeks[1] + '</span><h3>' + esc(p.name) + '</h3><p class="c2-muted" style="margin-top:4px">„' + esc(p.feel) + '“</p>';
      for (var w = p.weeks[0]; w <= p.weeks[1]; w++) {
        var wd = (DATA.weeks || []).find(function (x) { return x.week === w; }) || {};
        var byMode = wd.byMode && wd.byMode[g] ? wd.byMode[g] : "";
        html += '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--c2-line)">' +
          '<div style="display:flex;gap:8px;align-items:baseline"><b style="color:#fff">Woche ' + w + '</b><span style="font-family:var(--c2-mono);font-size:.62rem;letter-spacing:.1em;color:var(--c2-blue2)">' + esc(MISSIONS[w] || "") + '</span></div>' +
          (wd.title ? '<p style="margin-top:4px"><b>' + esc(wd.title) + '</b></p>' : "") +
          (wd.focus ? '<p class="c2-muted" style="margin-top:4px">' + esc(wd.focus) + '</p>' : "") +
          (byMode ? '<p style="margin-top:6px;font-size:.86rem"><span style="color:var(--c2-cyan)">🎯 ' + esc(mode.label) + ':</span> ' + esc(byMode) + '</p>' : "") +
          '</div>';
      }
      html += '</div>';
    });
    html += '<p class="c2-muted" style="text-align:center;margin-top:16px">Tiefe & Wissenschaft dahinter: <a href="ebooks/protokoll.html" style="color:var(--c2-blue2)">DAS PROTOKOLL öffnen →</a></p>';
    return html;
  }

  /* ---------- PROGRESS (Pulse + Consistency + Recheck + Report) ---------- */
  var RC_POINTS = [["w0", "Start"], ["w4", "W4"], ["w8", "W8"], ["w12", "W12"]];
  var RC_METRICS = [["score", "MaleMetrix Score"], ["weight", "Gewicht (kg)"], ["waist", "Bauchumfang (cm)"], ["strength", "Kraft-Marker"], ["cardio", "Cardio-Marker"], ["sleep", "Schlaf (h)"], ["energy", "Energie (1–10)"], ["bottleneck", "#1-Engpass"]];
  function rechecks() { return S.get("course_rechecks", {}) || {}; }
  function renderProgress() {
    var week = currentWeek(); var g = goal(); var mode = MODES[g]; var con = consistency();
    var existing = pulses()[week];
    var html = '<h2 class="c2-sec-h">Fortschritt & Anpassung</h2><p class="c2-sec-lead">Einmal pro Woche kurz einchecken — das System entscheidet, ob dein Plan bleibt oder sich etwas ändern sollte. Keine Einzeltage überinterpretieren.</p>';

    // Consistency
    html += '<div class="c2-card2"><span class="k">Consistency</span><div class="c2-daybig" style="margin:2px 0"><h1 style="font-size:2rem">' + con.pct + '%</h1><span>' + con.active + ' / ' + con.elapsed + ' aktive Tage</span></div>' +
      '<p class="c2-muted">Ein verpasster Tag ist kein Rückschritt. Consistency-Rate schlägt Perfektions-Streak.</p></div>';

    // Weekly Pulse
    html += '<div class="c2-card2"><span class="k">Weekly Pulse · Woche ' + week + '</span>';
    if (existing && existing.verdict) {
      var v = existing.verdict;
      html += '<div class="c2-verdict ' + v.cls + '"><h3>' + esc(v.title) + '</h3><p>' + esc(v.text) + '</p></div>' +
        '<button class="c2-btn ghost" data-pulse-redo="' + week + '">Check-in wiederholen</button>';
    } else {
      var wk = weekStats(week);
      html += '<p class="c2-muted" style="margin-bottom:8px">Adhärenz diese Woche: ' + wk.train + ' Strength · ' + wk.engine + ' Engine · ' + wk.recover + ' Recovery.</p>' +
        '<div class="c2-grid2">' +
        mode.metrics.map(function (m) {
          return '<div class="c2-field"><label>' + esc(m[1]) + '</label><input data-pin="' + m[0] + '" type="text" inputmode="text" placeholder="—"></div>';
        }).join("") +
        '<div class="c2-field"><label>Energie diese Woche (1–5)</label><input data-pin="energy" type="number" min="1" max="5" placeholder="3"></div>' +
        '<div class="c2-field"><label>Schlaf war…</label><select data-pin="sleep"><option value="">—</option><option value="gut">gut</option><option value="ok">ok</option><option value="schlecht">schlecht</option></select></div>' +
        '</div>' +
        '<div class="c2-field"><label><input type="checkbox" data-pin-warn style="width:auto;margin-right:8px">Ich hatte ein mögliches Warnsignal (z. B. Brustschmerz, Atemnot, Ohnmacht)</label></div>' +
        '<button class="c2-btn" data-pulse-run="' + week + '">Auswerten</button>';
    }
    html += '</div>';

    // Recheck dashboard
    html += '<div class="c2-card2"><span class="k">Recheck-Dashboard · W0 → W4 → W8 → W12</span><p class="c2-muted" style="margin-bottom:10px">Trag deine Kernwerte an den vier Messpunkten ein — alles lokal. Keine medizinische Bewertung.</p>' +
      '<div style="overflow-x:auto"><table class="course-recheck-table" style="width:100%;font-size:.82rem">' +
      '<tr><th style="text-align:left">Wert</th>' + RC_POINTS.map(function (p) { return '<th>' + esc(p[1]) + '</th>'; }).join("") + '</tr>' +
      RC_METRICS.map(function (m) {
        var data = rechecks();
        return '<tr><td style="color:var(--c2-ink2)">' + esc(m[1]) + '</td>' + RC_POINTS.map(function (p) {
          var vv = (data[p[0]] && data[p[0]][m[0]] != null) ? data[p[0]][m[0]] : "";
          return '<td><input class="c2-rc" data-cp="' + p[0] + '" data-m="' + m[0] + '" value="' + String(vv).replace(/"/g, "&quot;") + '" style="width:100%;min-width:64px;padding:6px;background:var(--c2-bg);border:1px solid var(--c2-line);border-radius:6px;color:#fff"></td>';
        }).join("") + '</tr>';
      }).join("") + '</table></div></div>';

    // Transformation report (always available, honest — only shows what exists)
    html += renderReport(false);
    return html;
  }

  function renderReport(standalone) {
    var rc = rechecks(); var con = consistency(); var g = goal();
    function pair(metric) {
      var s = rc.w0 && rc.w0[metric] != null ? rc.w0[metric] : "";
      var pts = ["w12", "w8", "w4"]; var n = "";
      for (var i = 0; i < pts.length; i++) { if (rc[pts[i]] && rc[pts[i]][metric] != null && rc[pts[i]][metric] !== "") { n = rc[pts[i]][metric]; break; } }
      return { s: s, n: n };
    }
    var metrics = [["score", "Score"], ["waist", "Bauchumfang"], ["weight", "Gewicht"], ["strength", "Kraft"], ["cardio", "Cardio"], ["sleep", "Schlaf"]];
    var cards = metrics.map(function (m) {
      var p = pair(m[0]); if (p.s === "" && p.n === "") return "";
      var deltaHtml = "", cls = "flat", d = "";
      var sn = parseFloat(p.s), nn = parseFloat(p.n);
      if (!isNaN(sn) && !isNaN(nn)) { var diff = nn - sn; var lowerBetter = (m[0] === "waist" || (m[0] === "weight" && (g === "cut" || g === "recomp"))); if (Math.abs(diff) < 0.01) { cls = "flat"; d = "±0"; } else { var good = lowerBetter ? diff < 0 : diff > 0; cls = good ? "up" : "down"; d = (diff > 0 ? "+" : "") + (Math.round(diff * 10) / 10); } }
      return '<div class="c2-stat"><span class="lb">' + esc(m[1]) + '</span><div class="vv"><b>' + esc(p.n || p.s || "—") + '</b>' + (d ? '<span class="delta ' + cls + '">' + esc(d) + '</span>' : "") + '</div><span class="c2-muted">Start: ' + esc(p.s || "—") + '</span></div>';
    }).filter(Boolean).join("");

    var nextMap = { cut: ["recomp", "RECOMP", "Fett ist runter — jetzt Form & Kraft ausbauen, ohne aggressives Defizit."], recomp: ["build", "BUILD", "Basis steht — jetzt gezielt Muskel & Kraft mit leanem Überschuss."], build: ["perform", "PERFORM", "Masse ist da — jetzt Kraft UND Motor gleichzeitig für echte Leistungsfähigkeit."], perform: ["recomp", "NEUER ZYKLUS", "Starker Stand — nächster Zyklus mit deinem dann größten Engpass."] };
    var nm = nextMap[g] || nextMap.recomp;

    var body = '<div class="c2-card2"><span class="k">Transformation Report · Start vs. Jetzt</span>' +
      '<h3 style="margin:2px 0 4px">Was hat sich bewegt?</h3>' +
      '<p class="c2-muted">Consistency: <b style="color:#fff">' + con.pct + '%</b> (' + con.active + ' / ' + con.elapsed + ' aktive Tage). Es werden nur Werte gezeigt, die du eingetragen hast — nichts erfunden.</p>' +
      (cards ? '<div class="c2-report-grid">' + cards + '</div>' : '<p class="c2-muted" style="margin-top:10px">Noch keine Recheck-Werte eingetragen. Trag oben deine Start-Werte (W0) ein — spätestens in Woche 12 siehst du hier deine echte Veränderung.</p>') +
      '<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--c2-line)"><span class="k">Next Move</span>' +
      '<h3 style="margin:2px 0 4px">' + esc(nm[1]) + '</h3><p>' + esc(nm[2]) + '</p></div>' +
      '</div>';
    return standalone ? (phaseBar() + '<h2 class="c2-sec-h">Programm abgeschlossen 🎯</h2><p class="c2-sec-lead">Die 12 Wochen sind durch. Hier dein ehrlicher Rückblick.</p>' + body + '<button class="c2-btn block" data-view="progress" style="margin-top:12px">Zu Fortschritt & Daten</button>') : body;
  }

  /* ---------- Onboarding ---------- */
  var obState = { goal: "", bottleneck: "", start: "today", nutrition: "simple" };
  function renderOnboard() {
    var rec = recommend();
    if (!obState.goal) obState.goal = rec.goal || "";
    if (!obState.bottleneck) obState.bottleneck = rec.bottleneck || "";
    var hasScore = !!scoreResult();
    function opts(name, list, sel) {
      return '<div class="c2-opts">' + list.map(function (o) {
        return '<div class="c2-opt ' + (sel === o[0] ? "sel" : "") + '" data-ob="' + name + '" data-val="' + o[0] + '"><div><b>' + esc(o[1]) + '</b>' + (o[2] ? '<div class="c2-muted" style="margin-top:2px">' + esc(o[2]) + '</div>' : "") + '</div></div>';
      }).join("") + '</div>';
    }
    var html = '<div class="c2-ob">' +
      '<span class="c2-greet">MALEMETRIX 12-WEEK SYSTEM</span>' +
      '<h2>Richte dein System ein</h2>' +
      '<p class="c2-sec-lead">Zwei Minuten. Danach sagt dir das Programm jeden Tag, was zählt — abgestimmt auf dein Ziel und deinen größten Engpass.</p>';

    if (hasScore && (rec.goal || rec.bottleneck)) {
      html += '<div class="c2-reco"><span class="k">Aus deinem MaleMetrix Score</span><p style="margin-top:4px">Auf Basis deiner Score-Antworten empfehlen wir: ' +
        (rec.goal ? 'Ziel <b style="color:#fff">' + esc(MODES[rec.goal].label) + '</b>' : "") + (rec.goal && rec.bottleneck ? " · " : "") +
        (rec.bottleneck ? 'Engpass <b style="color:#fff">' + esc(BOTTLENECKS[rec.bottleneck].label) + '</b>' : "") +
        '. Du kannst das unten überschreiben.</p></div>';
    }

    html += '<div class="q"><span>1 · Dein Ziel für die nächsten 12 Wochen</span>' +
      opts("goal", [
        ["cut", "CUT — Fett runter", "Deutlicheres Körperfett runter, Kraft schützen."],
        ["recomp", "RECOMP — Fett runter + Muskel rauf", "Normal-/Bauchansatz, wenig Muskel, „skinny fat“ — Form statt Waage."],
        ["build", "BUILD — Muskel & Kraft", "Schlank, niedriger Körperfettanteil, willst aufbauen (lean)."],
        ["perform", "PERFORM — stärker & fitter", "Gute Basis, willst Kraft + Ausdauer + Belastbarkeit."]
      ], obState.goal) + '</div>';

    html += '<div class="q"><span>2 · Was hält dich aktuell am stärksten zurück?</span>' +
      opts("bottleneck", [
        ["recovery", "RECOVERY — Schlaf & Erholung", "Zu wenig/schlechter Schlaf, Stress, ausgelaugt."],
        ["engine", "ENGINE — Cardio & Ausdauer", "Aus der Puste, wenig Bewegung, schlechte Kondition."],
        ["body", "BODY — Bauch & Körperfett", "Bauchansatz/Körperfett ist das Hauptthema."],
        ["strength", "STRENGTH — Kraft & Muskel", "Wenig Kraft/Muskel, kaum Trainingshistorie."],
        ["metabolic", "METABOLIC — Ernährung & Struktur", "Ernährung chaotisch, Protein/Struktur fehlen."],
        ["lifestyle", "LIFESTYLE — Umsetzung im Alltag", "Wissen da, aber Konstanz fehlt."]
      ], obState.bottleneck) + '</div>';

    html += '<div class="q"><span>3 · Ernährung — wie genau willst du es?</span>' +
      opts("nutrition", [
        ["simple", "SIMPLE — kein Zählen", "Protein, Mahlzeitenstruktur, Portionen. Für die meisten richtig."],
        ["tracked", "TRACKED — Kalorien & Protein", "Du trackst mit."],
        ["precision", "PRECISION — für Fortgeschrittene", "Gewichts-/Taillentrend, Makros, gezielte Anpassung."]
      ], obState.nutrition) + '</div>';

    html += '<div class="q"><span>4 · Wann startest du?</span>' +
      opts("start", [["today", "Heute", "Los geht’s — Tag 1 ist heute."], ["monday", "Nächsten Montag", "Sauberer Wochenstart."]], obState.start) + '</div>';

    html += '<div style="margin:26px 0 10px"><button class="c2-btn block" id="c2ObGo"' + ((obState.goal && obState.bottleneck) ? "" : " disabled") + '>Mein Programm starten →</button></div>' +
      '<p class="c2-muted" style="text-align:center">Empfehlungen basieren nur auf deinen echten Angaben — keine erfundene KI-Analyse.</p></div>';
    return html;
  }

  /* ---------- Router ---------- */
  function render() {
    var html = "";
    if (!personalized()) { html = renderOnboard(); }
    else {
      html = navBar();
      if (view === "plan") html += renderPlan();
      else if (view === "progress") html += renderProgress();
      else html += renderToday();
    }
    mount.className = "c2";
    mount.innerHTML = html;
    // reset control (im Shell) ⇒ bei Onboarding ausblenden
    var resetWrap = document.getElementById("courseReset");
    if (resetWrap) resetWrap.style.display = personalized() ? "" : "none";
  }

  /* ---------- Events (Delegation) ---------- */
  function bind() {
    if (mount._c2bound) return; mount._c2bound = true;
    mount.addEventListener("click", function (e) {
      var t = e.target;
      var nav = t.closest("[data-view]"); if (nav) { setView(nav.getAttribute("data-view")); return; }
      var navbtn = t.closest(".c2-nav button"); if (navbtn) { setView(navbtn.getAttribute("data-view")); return; }
      var chk = t.closest("[data-check]"); if (chk) { var k = chk.getAttribute("data-check"); var d = todayYmd(); var cur = dailyFor(d)[k]; setDaily(d, k, !cur); chk.classList.toggle("done", !cur); return; }
      var mn = t.closest("[data-min]"); if (mn) { S.set("c2_min_" + todayYmd(), mn.getAttribute("data-min") === "1"); render(); return; }
      var ob = t.closest("[data-ob]"); if (ob) { obState[ob.getAttribute("data-ob")] = ob.getAttribute("data-val"); render(); return; }
      if (t.id === "c2ObGo" || t.closest("#c2ObGo")) {
        if (!obState.goal || !obState.bottleneck) return;
        setGoal(obState.goal); setBottleneck(obState.bottleneck); S.set("c2_nutrition", obState.nutrition);
        var start = obState.start === "monday" ? nextMonday() : todayYmd();
        setStart(start);
        if (MM.track) MM.track("course_onboarded", { goal: obState.goal, bottleneck: obState.bottleneck });
        MM.toast("Dein 12-Wochen-System ist eingerichtet.");
        view = "today"; S.set("c2_view", "today"); render(); window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      var pr = t.closest("[data-pulse-run]"); if (pr) { runPulse(Number(pr.getAttribute("data-pulse-run"))); return; }
      var prd = t.closest("[data-pulse-redo]"); if (prd) { var p = pulses(); delete p[prd.getAttribute("data-pulse-redo")]; S.set("c2_pulse", p); render(); return; }
    });
    mount.addEventListener("input", function (e) {
      var t = e.target;
      if (t.hasAttribute && t.hasAttribute("data-energy")) { setEnergy(todayYmd(), Number(t.value)); var lbl = document.getElementById("c2eVal"); if (lbl) lbl.textContent = t.value + "/5"; return; }
      if (t.classList && t.classList.contains("c2-rc")) { var rc = rechecks(); var cp = t.getAttribute("data-cp"); if (!rc[cp]) rc[cp] = {}; rc[cp][t.getAttribute("data-m")] = t.value; S.set("course_rechecks", rc); return; }
    });
    var reset = document.getElementById("courseReset");
    if (reset && !reset._c2) { reset._c2 = true; reset.addEventListener("click", function () {
      if (!confirm("Programm zurücksetzen? Ziel, Engpass, Startdatum und tägliche Häkchen werden gelöscht. Deine Recheck-Werte bleiben erhalten.")) return;
      ["c2_goal", "c2_bottleneck", "c2_start", "c2_nutrition", "c2_daily", "c2_pulse", "c2_view"].forEach(function (k) { MM.store.remove ? MM.store.remove(k) : S.set(k, null); });
      obState = { goal: "", bottleneck: "", start: "today", nutrition: "simple" };
      view = "today"; render(); window.scrollTo({ top: 0, behavior: "smooth" });
    }); }
  }
  function nextMonday() { var d = new Date(todayYmd() + "T00:00:00"); var day = d.getDay(); var add = ((8 - day) % 7) || 7; d.setDate(d.getDate() + add); return ymd(d); }

  function runPulse(week) {
    var inp = {};
    mount.querySelectorAll("[data-pin]").forEach(function (el) { inp[el.getAttribute("data-pin")] = el.value; });
    var warnEl = mount.querySelector("[data-pin-warn]"); inp.warning = !!(warnEl && warnEl.checked);
    if (inp.energy) inp.energy = Number(inp.energy);
    var verdict = adjudicate(week, inp);
    savePulse(week, { inp: inp, verdict: verdict, stagnant: !!verdict.stagnant, ts: todayYmd() });
    if (MM.track) MM.track("course_pulse", { week: week, verdict: verdict.code });
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* =========================================================================
     GATE + BOOT
     ========================================================================= */
  function showContent() {
    gate.hidden = true; content.hidden = false;
    var pbox = document.getElementById("courseProgress"); if (pbox) pbox.innerHTML = "";
    bind(); render();
    document.querySelectorAll("#courseContent .reveal").forEach(function (el) { el.classList.add("visible"); });
  }
  function showGate() {
    gate.hidden = false; content.hidden = true;
    var input = document.getElementById("courseCode"), err = document.getElementById("courseCodeError"),
      btn = document.getElementById("courseUnlockBtn"), buy = document.getElementById("courseBuyBtn");
    async function tryUnlock() {
      if (await tryCode(input.value)) { if (MM.track) MM.track("course_unlocked", {}); MM.toast("Programm freigeschaltet — viel Erfolg!"); showContent(); window.scrollTo({ top: 0, behavior: "smooth" }); }
      else { err.textContent = "Code nicht erkannt. Bitte prüfe deine Bestellbestätigung — Groß-/Kleinschreibung ist egal."; err.style.display = "block"; input.classList.add("invalid"); if (MM.track) MM.track("course_code_failed", {}); }
    }
    if (btn && !btn._b) { btn._b = true; btn.addEventListener("click", tryUnlock); }
    if (input && !input._b) { input._b = true; input.addEventListener("keydown", function (e) { if (e.key === "Enter") tryUnlock(); }); input.addEventListener("input", function () { err.style.display = "none"; input.classList.remove("invalid"); }); }
    if (buy && !buy._b) { buy._b = true; buy.addEventListener("click", function () { location.href = "protokoll.html"; }); }
  }

  (async function boot() {
    var urlCode = ""; try { urlCode = norm(new URLSearchParams(location.search).get("code") || ""); } catch (e) {}
    if (urlCode && await tryCode(urlCode)) { history.replaceState(null, "", location.pathname); showContent(); return; }
    var saved = S.get("course_code", "");
    if (saved && await tryCode(saved)) { showContent(); return; }
    showGate();
  })();
})();
