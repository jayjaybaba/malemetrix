/* ==========================================================================
   MALEMETRIX — PRODUKTVORSCHAU (öffentlich, vor dem Kauf)
   --------------------------------------------------------------------------
   Zeigt die ECHTE Programmlogik statt eines nachgebauten Marketing-Mockups:
   Modi, Engpässe, Phasen, Wochenmuster und Tagesinhalte kommen alle aus
   js/program-framework.js — demselben Modul, das im gekauften Programm läuft.
   Ändert sich das Programm, ändert sich diese Vorschau mit. Es gibt keine
   zweite, geschönte Wahrheit.

   Was hier NICHT passiert: der bezahlte Inhalt (die zehn Protokoll-Kapitel und
   die Wochenkapitel) liegt verschlüsselt im Vault und wird von dieser Seite
   weder geladen noch angezeigt.

   Die Demo-Profile sind als Demo gekennzeichnet und stellen keine echten
   Teilnehmer dar. Echte Ergebnisse stehen auf ergebnisse.html — dort, wo sie
   den Fallstudien-Standard erfüllen müssen.
   ========================================================================== */
(function () {
  "use strict";
  var MM = (window.MM = window.MM || {});
  var F = MM.programFramework;
  var root = document.getElementById("pvRoot");
  if (!F || !root) return;

  function EN() { return !!(MM.i18n && MM.i18n.lang === "en"); }
  function L(de, en) { return EN() ? en : de; }
  function tr(o) { return o && typeof o === "object" ? (EN() ? (o.en || o.de) : o.de) : o; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* -------------------------------------------------------------------------
     DEMO-PROFILE — als Demo gekennzeichnet, nicht als Teilnehmer.
     Jedes Profil ist eine Ausgangslage, wie sie der Score erhebt. Was daraus
     folgt, rechnet die echte Logik.
     ------------------------------------------------------------------------- */
  var PROFILES = [
    {
      id: "a",
      name: { de: "Wenig Zeit, Bauch wächst", en: "Little time, belly growing" },
      facts: {
        de: ["38 Jahre, zwei Kinder, Bürojob", "3 Trainingstage möglich (Mo/Mi/Fr)", "Taille 104 cm, 96 kg", "Schlaf 5,5 h, Stress hoch", "Ernährung: „läuft nebenher“"],
        en: ["38, two kids, office job", "3 training days possible (Mon/Wed/Fri)", "Waist 104 cm, 96 kg", "Sleep 5.5 h, high stress", "Nutrition: “happens on the side”"]
      },
      mode: "cut", bottleneck: "recovery", days: [1, 3, 5], startWd: 1, nutrition: "simple", week: 3
    },
    {
      id: "b",
      name: { de: "Trainiert viel, sieht es nicht", en: "Trains a lot, doesn’t show" },
      facts: {
        de: ["35 Jahre, seit Jahren im Gym", "4 Trainingstage (Mo/Di/Do/Sa)", "Taille 92 cm, 84 kg", "Schlaf 7 h, Stress mittel", "Wochenenden eskalieren regelmäßig"],
        en: ["35, years in the gym", "4 training days (Mon/Tue/Thu/Sat)", "Waist 92 cm, 84 kg", "Sleep 7 h, moderate stress", "Weekends derail regularly"]
      },
      mode: "recomp", bottleneck: "metabolic", days: [1, 2, 4, 6], startWd: 1, nutrition: "tracked", week: 5
    },
    {
      id: "c",
      name: { de: "Schlank, aber kraftlos", en: "Lean but weak" },
      facts: {
        de: ["42 Jahre, wenig Muskelmasse", "3 Trainingstage (Di/Do/Sa)", "Taille 84 cm, 72 kg", "Schlaf 7,5 h, Stress niedrig", "Kaum Krafthistorie"],
        en: ["42, little muscle mass", "3 training days (Tue/Thu/Sat)", "Waist 84 cm, 72 kg", "Sleep 7.5 h, low stress", "Barely any lifting history"]
      },
      mode: "build", bottleneck: "strength", days: [2, 4, 6], startWd: 2, nutrition: "simple", week: 8
    }
  ];

  var WD_NAMES = { de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };

  var state = { profile: PROFILES[0], dayIndex: 0 };

  /* -------------------------------------------------------------------------
     1 — DURCHSTICH: Ausgangslage → Engpass → Modus → Plan
     ------------------------------------------------------------------------- */
  function renderChain() {
    var p = state.profile;
    var bn = F.BOTTLENECKS[p.bottleneck];
    var mode = F.MODES[p.mode];
    var ph = F.phaseOf(p.week);

    var picker = '<div class="c2-opts" role="group" aria-label="' + esc(L("Demo-Profil wählen", "Choose demo profile")) + '">' +
      PROFILES.map(function (x) {
        var on = x.id === p.id;
        return '<button type="button" class="c2-opt ' + (on ? "sel" : "") + '" data-pv-profile="' + x.id + '" aria-pressed="' + on + '"><div><b>' + esc(tr(x.name)) + '</b></div></button>';
      }).join("") + "</div>";

    return '<div class="c2-card2"><span class="k">' + L("1 · AUSGANGSLAGE", "1 · STARTING POINT") + '</span>' +
      '<p class="c2-muted" style="margin-bottom:10px">' + L(
        "Drei Demo-Profile — keine echten Personen. Die Angaben entsprechen dem, was der kostenlose Score erhebt.",
        "Three demo profiles — not real people. The inputs match what the free score collects."
      ) + "</p>" + picker +
      '<ul style="margin:14px 0 0 18px">' + tr(p.facts).map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul></div>" +

      '<div class="c2-card2 c2-bottleneck" style="margin-top:14px"><span class="k">' + L("2 · DEIN ENGPASS", "2 · YOUR BOTTLENECK") + '</span>' +
      "<h3 style=\"margin:4px 0 6px\">" + esc(bn.label) + "</h3><p>" + esc(tr(bn.why)) + "</p>" +
      '<p class="c2-muted" style="margin-top:8px">' + esc(tr(bn.focus)) + "</p>" +
      '<p class="c2-muted" style="margin-top:8px">' + L(
        "Genau ein Engpass — nicht zehn Baustellen gleichzeitig. Alles Weitere ordnet sich diesem unter.",
        "Exactly one bottleneck — not ten building sites at once. Everything else is subordinated to it."
      ) + "</p></div>" +

      '<div class="c2-card2" style="margin-top:14px"><span class="k">' + L("3 · DEIN MODUS", "3 · YOUR MODE") + '</span>' +
      "<h3 style=\"margin:4px 0 6px\">" + esc(mode.label) + " — " + esc(tr(mode.tag)) + "</h3>" +
      '<p class="c2-muted">' + esc(tr(mode.oneLiner)) + "</p>" +
      '<p style="margin-top:10px"><b>' + L("Prioritäten in dieser Reihenfolge:", "Priorities, in this order:") + "</b></p>" +
      '<ol style="margin:6px 0 0 18px">' + tr(mode.priorities).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol>" +
      '<p class="c2-muted" style="margin-top:10px">' + L("Gemessen wird an", "Measured by") + ": " +
      mode.metrics.map(function (m) { return esc(tr(m[1])); }).join(" · ") + "</p></div>" +

      '<div class="c2-card2" style="margin-top:14px"><span class="k">' + L("4 · DIE 12 WOCHEN", "4 · THE 12 WEEKS") + '</span>' +
      '<div class="pv-phases">' + F.PHASES.map(function (x) {
        var cur = p.week >= x.weeks[0] && p.week <= x.weeks[1];
        return '<div class="pv-phase' + (cur ? " cur" : "") + '"><span class="wk">W' + x.weeks[0] + "–" + x.weeks[1] +
          '</span><b>' + esc(tr(x.name)) + "</b><span>" + esc(tr(x.feel)) + "</span></div>";
      }).join("") + "</div>" +
      '<p class="c2-muted" style="margin-top:12px">' + L("Mission Woche", "Mission week") + " " + p.week + ": <b>" + esc(F.MISSIONS[p.week]) + "</b> · " +
      L("Phase", "Phase") + " " + ph.key + " — " + esc(tr(F.PHASE_TRAIN[ph.key])) + "</p></div>";
  }

  /* -------------------------------------------------------------------------
     2 — DIE WOCHE: echtes 7-Tage-Muster aus der Programmlogik
     ------------------------------------------------------------------------- */
  function weekPattern() {
    var p = state.profile;
    return F.patternFor(p.mode, p.week, p.bottleneck, { strengthWeekdays: p.days, startWeekday: p.startWd });
  }

  function renderWeek() {
    var p = state.profile;
    var pat = weekPattern();
    var names = EN() ? WD_NAMES.en : WD_NAMES.de;
    var counts = {};
    pat.forEach(function (d) { counts[d] = (counts[d] || 0) + 1; });

    var days = pat.map(function (type, i) {
      var d = F.DAY[type];
      var wd = names[(p.startWd + i) % 7];
      var on = i === state.dayIndex;
      return '<button type="button" class="pv-day' + (on ? " sel" : "") + '" data-pv-day="' + i + '" aria-pressed="' + on + '">' +
        '<span class="wd">' + esc(wd) + '</span><span class="ic">' + d.icon + '</span>' +
        '<span class="lb">' + esc(tr(d.label)) + "</span></button>";
    }).join("");

    var summary = Object.keys(counts).map(function (k) {
      return esc(tr(F.DAY[k].label)) + " ×" + counts[k];
    }).join(" · ");

    return '<div class="c2-card2"><span class="k">' + L("EINE KOMPLETTE WOCHE", "A COMPLETE WEEK") + " · " + L("Woche", "Week") + " " + p.week + '</span>' +
      '<p class="c2-muted" style="margin-bottom:12px">' + L(
        "Aus deinen verfügbaren Tagen, deinem Modus und deinem Engpass erzeugt — nicht aus einer Schablone. Klick einen Tag an, um ihn zu öffnen.",
        "Generated from your available days, your mode and your bottleneck — not from a template. Click a day to open it."
      ) + '</p><div class="pv-week">' + days + "</div>" +
      '<p class="c2-muted" style="margin-top:12px">' + esc(summary) + "</p></div>";
  }

  /* -------------------------------------------------------------------------
     3 — DER TAG: exakt die Karte, die im Programm erscheint
     ------------------------------------------------------------------------- */
  function renderDay() {
    var p = state.profile;
    var pat = weekPattern();
    var type = pat[state.dayIndex];
    var d = F.DAY[type];
    var ph = F.phaseOf(p.week);
    var names = EN() ? WD_NAMES.en : WD_NAMES.de;
    var pd = (p.week - 1) * 7 + state.dayIndex + 1;

    return '<div class="c2-today">' +
      '<span class="c2-greet">' + L("SO SIEHT DER TAG AUS", "THIS IS THE DAY") + "</span>" +
      '<div class="c2-daybig"><h1>' + L("Tag", "Day") + " " + pd + "</h1><span>" + L("Phase", "Phase") + " " + ph.key + " · " + esc(tr(ph.name)) + "</span></div>" +
      '<p class="c2-metaline">' + L("Modus", "Mode") + " <b>" + esc(F.MODES[p.mode].label) + "</b> · " +
      L("Engpass", "Bottleneck") + " <b>" + esc(F.BOTTLENECKS[p.bottleneck].label) + "</b> · " +
      esc(names[(p.startWd + state.dayIndex) % 7]) + ": <b>" + esc(tr(d.label)) + "</b></p>" +

      '<div class="c2-action"><div class="c2-action-head"><span class="c2-action-ico">' + d.icon + "</span>" +
      "<h3>" + esc(tr(d.label)) + " — " + esc(tr(d.tag)) + '</h3><span class="tag">' + L("HEUTE", "TODAY") + "</span></div>" +
      '<div class="c2-action-body"><p>' + esc(tr(d.full)) + "</p>" +
      (type === "strength" ? '<p class="c2-muted" style="margin-top:8px">📈 ' + esc(tr(F.PHASE_TRAIN[ph.key])) + "</p>" : "") +
      '<p class="c2-muted" style="margin-top:10px"><b>' + L("Minimum-Variante an schlechten Tagen:", "Minimum version on bad days:") + "</b> " + esc(tr(d.min)) + "</p>" +
      "</div></div>" +

      '<div class="c2-card2 c2-why" style="margin-top:14px"><span class="k">' + L("WARUM DAS HEUTE ZÄHLT", "WHY THIS MATTERS TODAY") + "</span><p>" + esc(tr(d.why)) + "</p></div>" +
      '<div class="c2-card2" style="margin-top:14px"><span class="k">' + esc(p.nutrition.toUpperCase()) + " · " + L("Ernährung heute", "Nutrition today") + "</span><p>" +
      esc(tr(F.NUTRI[p.nutrition].card)) + "</p></div>" +
      '<p class="c2-muted" style="margin-top:14px">' + L(
        "Im Programm hakst du hier ab, was du getan hast, und trägst deine Energie ein. Daraus entsteht die Umsetzungsquote, mit der das System am Wochenende entscheidet.",
        "In the program you tick off what you did here and log your energy. That produces the adherence rate the system uses to decide at the weekend."
      ) + "</p></div>";
  }

  /* -------------------------------------------------------------------------
     4 — DER WOCHENABSCHLUSS: die echten Entscheidungsregeln
     ------------------------------------------------------------------------- */
  function renderDecision() {
    var rules = [
      { t: "CHECK FIRST", d: { de: "Du hast ein mögliches Warnsignal angegeben. Erst ärztlich abklären — das Programm läuft auf dem Fundament ruhig weiter.", en: "You reported a possible warning sign. Get it checked first — the program continues gently on the fundamentals." } },
      { t: "EXECUTION FIRST", d: { de: "Umsetzung unter 70 %. Der Plan ist nicht das Problem — Kalorien senken würde jetzt nichts reparieren. Erst konstant umsetzen, dann bewerten.", en: "Adherence under 70 %. The plan is not the problem — cutting calories would fix nothing now. Execute consistently first, then judge." } },
      { t: "RECOVERY FIRST", d: { de: "Training läuft, aber Energie und Schlaf sind unten. Mehr Belastung wäre der falsche Hebel.", en: "Training is running, but energy and sleep are down. More load would be the wrong lever." } },
      { t: "ADJUST — EINE VARIABLE", d: { de: "Umsetzung hoch, Taille aber über mehrere Wochen unverändert. Jetzt genau EINE Variable ändern — nicht alles gleichzeitig.", en: "Adherence high, waist unchanged over several weeks. Change exactly ONE variable now — not everything at once." } },
      { t: "HOLD", d: { de: "Es läuft. Nichts ändern, nur weitermachen.", en: "It’s working. Change nothing, keep going." } }
    ];
    return '<div class="c2-card2"><span class="k">' + L("WOCHENABSCHLUSS · DIE ENTSCHEIDUNG", "WEEKLY CLOSE · THE DECISION") + "</span>" +
      '<p class="c2-muted" style="margin-bottom:12px">' + L(
        "Am Ende jeder Woche trägst du deine Werte ein und bekommst genau ein Urteil — kein Dashboard voller Zahlen, aus denen du selbst schlau werden musst. Diese fünf sind möglich:",
        "At the end of each week you enter your values and get exactly one verdict — not a dashboard of numbers you have to interpret yourself. These five are possible:"
      ) + '</p><div class="pv-rules">' +
      rules.map(function (r) { return '<div class="pv-rule"><b>' + esc(r.t) + "</b><p>" + esc(tr(r.d)) + "</p></div>"; }).join("") +
      '</div><p class="c2-muted" style="margin-top:12px">' + L(
        "Die Unterscheidung „Plan nicht ausgeführt“ gegen „Plan funktioniert nicht“ ist der Kern. Ohne sie ändert man Programme, die nie eine Chance hatten.",
        "Distinguishing “plan not executed” from “plan not working” is the core. Without it you change programs that never had a chance."
      ) + "</p></div>";
  }

  /* ---------------------------------------------------------------------- */
  function render() {
    root.innerHTML =
      '<h2 class="c2-sec-h">' + L("Vom Score zum morgigen Tag", "From score to tomorrow") + "</h2>" +
      '<p class="c2-sec-lead">' + L(
        "Alles unten läuft mit der echten Programmlogik. Wechsle das Profil und beobachte, was sich ändert.",
        "Everything below runs on the real program logic. Switch the profile and watch what changes."
      ) + "</p>" +
      renderChain() +
      '<div style="margin-top:22px">' + renderWeek() + "</div>" +
      '<div style="margin-top:22px">' + renderDay() + "</div>" +
      '<div style="margin-top:22px">' + renderDecision() + "</div>";
  }

  root.addEventListener("click", function (e) {
    var pb = e.target.closest("[data-pv-profile]");
    if (pb) {
      var id = pb.getAttribute("data-pv-profile");
      var found = PROFILES.filter(function (x) { return x.id === id; })[0];
      if (found) { state.profile = found; state.dayIndex = 0; render(); }
      return;
    }
    var db = e.target.closest("[data-pv-day]");
    if (db) { state.dayIndex = Number(db.getAttribute("data-pv-day")) || 0; render(); }
  });

  render();
  document.addEventListener("mm:langchange", render);
})();
