/* ==========================================================================
   MALEMETRIX INTELLIGENCE — DIGITAL TWIN  (MM.intelligence.twin)
   --------------------------------------------------------------------------
   Kein Fake-Physiologie-Simulator. Ein LONGITUDINALES MODELL des Nutzers:
   je Domäne state · trend · confidence · lastUpdated · dataCompleteness (§8/9/10).

   Domänen: BODY · PERFORMANCE · NUTRITION · RECOVERY · CARDIOMETABOLIC ·
            HORMONAL · EXECUTION · LIFESTYLE · (ENHANCED optional).

   Der Twin liest den Context (Layer 1) und annotiert ihn mit Bewertung —
   erfindet nichts. Er weiß auch, WAS er NICHT weiß (confidence + freshness).
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var I = MM.intelligence = MM.intelligence || {};
  function LB() { return MM.labs; }
  function conf(l, r, f) { return I.confidence(l, r, f); }

  function fmt(v, unit) { return v == null ? "—" : (I.util.round(v, 1) + (unit ? " " + unit : "")); }

  // Eine Twin-Domäne baut sich aus dem Context.
  function domain(key, label, state, trend, confidence, lastUpdated, completeness, note) {
    return { key: key, label: label, state: state, trend: trend, confidence: confidence, lastUpdated: lastUpdated, dataCompleteness: completeness, note: note || "" };
  }

  function build(ctx) {
    ctx = ctx || I.buildContext();
    var doms = [];
    var b = ctx.body, t = ctx.training, n = ctx.nutrition, r = ctx.recovery, lb = ctx.labs;

    /* BODY */
    (function () {
      var st = b.available ? (fmt(b.weight, "kg") + (b.waist != null ? " · " + fmt(b.waist, "cm") + " Taille" : "")) : "keine Daten";
      var tr = b.weightTrend15 != null ? { dir: sign(b.weightTrend15), text: "Gewicht " + signed(b.weightTrend15) + " kg (Ø)" + (b.waistTrend14 != null ? " · Taille " + signed(b.waistTrend14) + " cm" : "") } : { dir: 0, text: "noch kein belastbarer Trend" };
      var cpl = complete([b.weight != null, b.waist != null, b.bf != null, b.points >= 3]);
      var c = b.bf != null ? conf("high", "Gewicht + Taille + KFA-Schätzung.") :
        (b.available && b.points >= 3) ? conf("medium", "Gewicht/Taille vorhanden, keine Körperfett-Schätzung/Fotos.") :
          b.available ? conf("low", "Wenige Messpunkte.") : conf("none", "Keine Körpermaße erfasst.");
      doms.push(domain("body", "BODY", st, tr, c, b.weightDate, cpl, b.bf == null ? "Für höhere Sicherheit: KFA-Schätzung oder Fotos." : ""));
    })();

    /* PERFORMANCE */
    (function () {
      var st = t.available ? (t.avgE1rmPct != null ? "Kraft Ø " + signed(t.avgE1rmPct) + "% (e1RM)" : t.sessions + " Sessions geloggt") : "keine Trainingsdaten";
      var tr = t.avgE1rmPct != null ? { dir: sign(t.avgE1rmPct), text: "e1RM " + signed(t.avgE1rmPct) + "%" } : { dir: 0, text: "Trend braucht ≥2 Einheiten/Übung" };
      var cpl = complete([t.available, t.sessions >= 4, t.avgE1rmPct != null, t.hasPlan]);
      var c = I.confidenceFromData(t.sessions, t.fresh.state, { needPoints: 6, missingReason: "Keine geloggten Workouts." });
      doms.push(domain("performance", "PERFORMANCE", st, tr, c, t.lastDate, cpl));
    })();

    /* NUTRITION */
    (function () {
      var st = n.available ? (n.kcal + " kcal · " + n.protein + " g P") : "kein Plan";
      var tr = { dir: 0, text: n.adherencePct != null ? n.adherencePct + "% Umsetzung" : "Adhärenz unbekannt" };
      var cpl = complete([n.hasPlan, n.adherencePct != null, n.protein != null]);
      var c = n.hasPlan ? (n.adherencePct != null ? conf("high", "Plan + Adhärenz aus Weekly Pulse.") : conf("medium", "Plan gesetzt, Adhärenz unklar.")) : conf("none", "Kein Nutrition-Plan.");
      doms.push(domain("nutrition", "NUTRITION", st, tr, c, null, cpl));
    })();

    /* RECOVERY */
    (function () {
      var st = r.available ? ((r.sleepHours != null ? fmt(r.sleepHours, "h") + " Schlaf" : "") + (r.lastEnergy != null ? " · Energie " + r.lastEnergy + "/5" : "")) : "keine Daten";
      var declining = r.lastSleepQuality === "schlecht" || (r.sleepHours != null && r.sleepHours < 6.5);
      var tr = { dir: declining ? -1 : 0, text: declining ? "unter Zielbereich" : (r.available ? "im Rahmen" : "unbekannt") };
      var cpl = complete([r.sleepHours != null, r.lastEnergy != null, r.lastSleepQuality != null]);
      var c = r.available ? (r.lastEnergy != null ? conf("medium", "Schlaf + Weekly-Pulse-Energie.") : conf("low", "Nur Schlaf-Sollwert, keine frische Erfassung.")) : conf("none", "Keine Recovery-Daten.");
      doms.push(domain("recovery", "RECOVERY", st, tr, c, r.pulseWeek != null ? "Pulse W" + r.pulseWeek : null, cpl));
    })();

    /* CARDIOMETABOLIC (labs) */
    (function () {
      var lbm = LB();
      var markers = ["apo_b", "ldl_c", "hba1c", "triglycerides", "hs_crp"];
      var present = lbm ? markers.filter(function (m) { return lbm.latestFor(m); }) : [];
      var worsening = 0, improving = 0;
      present.forEach(function (m) { var tr = lbm.trend(m); if (tr) { if (tr.status === "WORSENING" || tr.status === "NEEDS_FOLLOWUP") worsening++; if (tr.status === "IMPROVING") improving++; } });
      var st = present.length ? (present.length + " Marker · " + (worsening ? worsening + " zu beobachten" : improving ? improving + " verbessert" : "stabil")) : "keine Labordaten";
      var tr = { dir: worsening ? -1 : improving ? 1 : 0, text: worsening ? worsening + " verschlechtern sich" : improving ? improving + " verbessern sich" : "stabil/unbekannt" };
      var cpl = complete([present.indexOf("apo_b") >= 0, present.indexOf("hba1c") >= 0, present.indexOf("triglycerides") >= 0, present.length >= 3]);
      var c = present.length ? (lb.fresh.state === "stale" ? conf("low", "Labordaten veraltet.") : conf("medium", present.length + " kardiometabolische Marker.")) : conf("none", "Keine Labordaten.");
      doms.push(domain("cardiometabolic", "CARDIOMETABOLIC", st, tr, c, lb.lastPanelDate, cpl));
    })();

    /* HORMONAL (labs) */
    (function () {
      var lbm = LB();
      var markers = ["total_testosterone", "free_testosterone", "shbg", "estradiol"];
      var present = lbm ? markers.filter(function (m) { return lbm.latestFor(m); }) : [];
      if (!present.length && !(ctx.pathway === "enhanced")) return; // Hormone nur zeigen, wenn Daten oder Enhanced
      var st = present.length ? present.map(function (m) { return lbm.markerName(m); }).join(", ") : "keine Hormondaten";
      var c = present.length ? conf("medium", present.length + " Hormonmarker.") : conf("none", ctx.pathway === "enhanced" ? "Enhanced-Pfad ohne Hormondaten — Panel unvollständig." : "Keine Hormondaten.");
      var cpl = complete([present.indexOf("total_testosterone") >= 0, present.indexOf("shbg") >= 0, present.indexOf("estradiol") >= 0]);
      doms.push(domain("hormonal", "HORMONAL", st, { dir: 0, text: present.length ? "siehe Labs" : "unvollständig" }, c, lb.lastPanelDate, cpl));
    })();

    /* EXECUTION */
    (function () {
      var e = ctx.execution;
      var st = e.available ? (e.consistency + "% Umsetzung · Woche " + e.week) : (ctx.cycle.active ? "läuft" : "kein aktiver Zyklus");
      var tr = { dir: e.consistency != null ? (e.consistency >= 80 ? 1 : e.consistency < 60 ? -1 : 0) : 0, text: e.consistency != null ? (e.consistency >= 80 ? "stark" : e.consistency < 60 ? "unregelmäßig" : "solide") : "—" };
      var cpl = complete([e.available, e.consistency != null, e.week != null]);
      var c = e.available ? conf("high", "Programm-Adhärenz aus echten Tagesdaten.") : conf("none", "Kein aktiver Zyklus.");
      doms.push(domain("execution", "EXECUTION", st, tr, c, null, cpl));
    })();

    /* LIFESTYLE (context mode) */
    (function () {
      var cm = ctx.contextMode;
      var labels = { normal: "normal", travel: "Reise", high_stress: "hoher Stress", no_gym: "kein Gym", vacation: "Urlaub", recovery_sick: "krank/Erholung" };
      doms.push(domain("lifestyle", "LIFESTYLE", labels[cm] || cm, { dir: cm === "normal" ? 0 : -1, text: cm === "normal" ? "Standardbetrieb" : "temporärer Overlay aktiv" }, conf("medium", "Kontext-Modus bekannt."), null, complete([true, cm !== "normal"])));
    })();

    return { builtAt: ctx.builtAt, domains: doms, ctx: ctx };
  }

  function sign(v) { return v == null ? 0 : v > 0.01 ? 1 : v < -0.01 ? -1 : 0; }
  function signed(v) { return v == null ? "—" : (v > 0 ? "+" : "") + I.util.round(v, 1); }
  function complete(bools) { var n = bools.filter(Boolean).length; return { have: n, total: bools.length, pct: Math.round(n / bools.length * 100) }; }

  // Gesamt-Datenreife (Personalization Depth §123).
  function personalizationDepth(twin) {
    twin = twin || build();
    var doms = twin.domains;
    var avg = Math.round(doms.reduce(function (a, d) { return a + d.dataCompleteness.pct; }, 0) / doms.length);
    var lowConf = doms.filter(function (d) { return d.confidence.rank <= 1; }).map(function (d) { return d.label; });
    var missingHighValue = (twin.ctx.missing || []).filter(function (m) { return m.impact === "high"; }).map(function (m) { return m.label; });
    return { pct: avg, lowConfidenceDomains: lowConf, missingHighValue: missingHighValue };
  }

  I.twin = { build: build, personalizationDepth: personalizationDepth };
})();
