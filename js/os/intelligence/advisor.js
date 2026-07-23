/* ==========================================================================
   MALEMETRIX INTELLIGENCE — ADVISOR  (MM.intelligence.advisor)
   --------------------------------------------------------------------------
   „ASK MALEMETRIX“ — kein generischer Chatbot. Der Advisor beantwortet Fragen
   ÜBER DAS EIGENE SYSTEM, gegroundet in echten Nutzerdaten (§20–24).

   Antwort-Contract (§21):
     ANSWER · WHAT I SEE · WHAT IT PROBABLY MEANS · WHAT I WOULD DO NEXT ·
     WHAT NOT TO CHANGE · WHEN TO REASSESS
   Jede Antwort ZITIERT Nutzerdaten (§22) und führt eine Evidence-Trace (§23).
   Bei zu wenig Daten: „I would not change this yet“ + was fehlt (§24).

   Architektur:
     · DETERMINISTIC CORE (Layer 2): erzeugt IMMER eine vollständige, gegroundete
       Antwort — auch ohne KI (deterministischer Fallback §27).
     · PROVIDER SEAM (Layer 3): answerAsync() kann eine registrierte KI nutzen,
       um Sprache zu verbessern. Nie ohne den deterministischen Kern; KI darf
       Layer-1/2-Wahrheit nie still ändern (§3). Kein Secret im Client (§26).
     · TOOL MODEL (§29): kontrollierte Accessoren statt roher Speicherzugriff.
     · DATA BOUNDARY (§28): Nutzer-/Dokumentinhalt kann Policy nicht überschreiben.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var I = MM.intelligence = MM.intelligence || {};
  function signed(v) { return v == null ? "—" : (v > 0 ? "+" : "") + I.util.round(v, 1); }
  function has(v) { return v != null; }

  /* =======================================================================
     TOOL MODEL (§29) — kontrollierte Accessoren. Der Advisor liest NUR hierüber.
     ======================================================================= */
  function tools(ctx) {
    ctx = ctx || I.buildContext();
    return {
      getCurrentState: function () { return ctx; },
      getBody: function () { return ctx.body; },
      getMetricTrend: function () { return { weight7: ctx.body.weightTrend7, weight15: ctx.body.weightTrend15, waist14: ctx.body.waistTrend14 }; },
      getTrainingHistory: function () { return ctx.training; },
      getNutrition: function () { return ctx.nutrition; },
      getRecovery: function () { return ctx.recovery; },
      getLabTrend: function (mid) { return MM.labs && mid ? MM.labs.trend(mid) : null; },
      getLabs: function () { return ctx.labs; },
      getStack: function () { return ctx.stack; },
      getBottleneck: function () { return I.decision.bottleneck2(ctx); },
      getDecision: function () { return I.decision.decide(ctx); },
      getDecisionHistory: function () { return I.memory ? I.memory.ledger() : []; },
      getPriorResponses: function (domain) { return I.memory ? I.memory.priorResponses(domain) : []; },
      getContradictions: function () { return I.decision.contradictions(ctx); }
    };
  }

  /* =======================================================================
     DATA BOUNDARY (§28) — Injection-Schutz. Fragen sind DATEN, nie Befehle.
     ======================================================================= */
  var INJECTION = /(ignore|disregard|forget|override|vergiss|ignorier|missachte)\s+(all|previous|above|die|alle|vorherige|system|prior)|system\s*prompt|you are now|du bist jetzt|jailbreak|new instructions|neue anweisung|act as|prescribe me|verschreib(e)? mir|exact dosage|genaue dosierung/i;
  function sanitizeQuestion(q) {
    q = String(q || "").slice(0, 500);
    var flagged = INJECTION.test(q);
    return { text: q, injectionAttempt: flagged };
  }

  /* =======================================================================
     DETERMINISTIC ANSWER CORE — pro Thema ein Handler. Liefert Contract-Objekt.
     ======================================================================= */
  function insufficient(missingList, topic) {
    return {
      answer: "Das würde ich JETZT noch nicht ändern.",
      unsure: true,
      whatISee: ["Für eine belastbare Aussage fehlen mir Daten."],
      whatItMeans: ["Eine Empfehlung auf dünner Datenlage wäre Raten, nicht Intelligenz."],
      whatIdDo: (missingList || []).map(function (m) { return "Erfassen: " + (m.label || m); }),
      whatNotToChange: ["Nichts überstürzen — erst messen."],
      reassess: "Sobald die fehlenden Daten da sind (meist 1–2 Wochen)."
    };
  }

  var HANDLERS = {
    // „Warum verliere ich kein Fett / Gewicht?“
    fatloss: function (t) {
      var ctx = t.getCurrentState(), b = t.getBody(), tr = t.getMetricTrend();
      if (b.weightTrend15 == null && b.waistTrend14 == null) return insufficient([{ label: "7+ Tage Gewicht" }, { label: "eine Taillenmessung" }]);
      var see = [], means = [], doNext = [], noChange = [], evidence = ["body.weightTrend", "body.waistTrend", "execution.consistency"];
      if (has(tr.weight15)) see.push("Gewichtstrend " + signed(tr.weight15) + " kg (rollender Ø)");
      if (has(tr.waist14)) see.push("Taillentrend " + signed(tr.waist14) + " cm");
      if (has(ctx.execution.consistency)) see.push("Umsetzung " + ctx.execution.consistency + "%");
      var recomp = has(tr.waist14) && tr.waist14 < -0.3 && has(tr.weight15) && Math.abs(tr.weight15) < 0.3;
      var answer, reassess = "In 10–14 Tagen mit mehr Messpunkten neu bewerten.";
      if (recomp) {
        answer = "Deine Waage steht — dein Fortschritt nicht.";
        means.push("Taille runter bei stabilem Gewicht spricht für Rekomposition (Fett runter, Muskel gehalten/aufgebaut). Das ist kein Plateau.");
        doNext.push("Genau so weitermachen."); noChange.push("Kalorien", "Trainingsplan");
      } else if (has(ctx.execution.consistency) && ctx.execution.consistency < 75) {
        answer = "Wahrscheinlich ist nicht der Plan das Problem, sondern die Umsetzung.";
        means.push("Bei " + ctx.execution.consistency + "% Umsetzung sagen die Zahlen mehr über die Woche als über die Strategie."); doNext.push("Erst konstant umsetzen, dann bewerten."); noChange.push("Kalorien senken");
      } else if (has(tr.weight15) && tr.weight15 >= 0 && (!has(tr.waist14) || tr.waist14 >= 0)) {
        answer = "Gewicht und Taille bewegen sich nicht — hier ist eine Anpassung vertretbar.";
        means.push("Bei hoher Adhärenz und mehrwöchigem Stillstand ist ein Energie-Abschlag von ~10% sinnvoll — EINE Variable.");
        doNext.push("Energie ~10% senken ODER +1000 Schritte/Tag — nicht beides."); noChange.push("Trainingsplan", "Stack");
      } else {
        answer = "Du bist auf Kurs — noch kein Grund zu ändern.";
        means.push("Der Trend zeigt in die gewollte Richtung."); doNext.push("Weiter messen."); noChange.push("Alles Wesentliche");
      }
      return { answer: answer, whatISee: see, whatItMeans: means, whatIdDo: doNext, whatNotToChange: noChange, reassess: reassess, evidence: evidence };
    },

    // „Soll ich mehr essen / Kalorien erhöhen?“
    nutrition: function (t) {
      var ctx = t.getCurrentState(), b = t.getBody(), n = t.getNutrition();
      if (!n.hasPlan) return insufficient([{ label: "Nutrition-Plan erstellen (Plan → Nutrition)" }]);
      if (b.weightTrend15 == null) return insufficient([{ label: "7+ Tage Gewicht für einen Trend" }]);
      var prior = t.getPriorResponses("nutrition");
      var see = ["Aktuelles Ziel: " + (n.kcal) + " kcal", "Gewichtstrend " + signed(b.weightTrend15) + " kg/Woche (Ø)"];
      if (has(ctx.execution.consistency)) see.push("Umsetzung " + ctx.execution.consistency + "%");
      var means = [], doNext = [], noChange = ["Trainingsplan"], answer;
      var mode = ctx.goal.mode;
      if (mode === "build" && b.weightTrend15 <= 0 && (ctx.execution.consistency == null || ctx.execution.consistency >= 80)) {
        answer = "Ja — im Aufbau und Gewicht steht, ein moderater Aufschlag ist berechtigt.";
        means.push("Bei stabiler Adhärenz und flachem Gewicht im Build fehlt Energie zum Wachsen.");
        doNext.push("Energie +150–200 kcal/Tag, dann 2 Wochen beobachten (Taille im Blick).");
      } else if (mode === "cut") {
        answer = "Im Cut eher nicht — es sei denn, du verlierst zu schnell.";
        if (b.weightTrend15 < -1.0) { answer = "Ja, leicht — du verlierst zu schnell."; doNext.push("Energie +150 kcal, Kraft schützen."); }
        else { means.push("Solange der Abbau kontrolliert läuft, nicht mehr essen."); doNext.push("Ziele halten, Trend beobachten."); }
      } else {
        answer = "Noch nicht — der aktuelle Trend rechtfertigt keine Erhöhung.";
        means.push("Bei stabilem/leicht fallendem Gewicht abseits eines Build-Ziels gibt es keinen Grund draufzulegen.");
        doNext.push("Ziele halten, in 2 Wochen neu bewerten.");
      }
      if (prior.length) { var p = prior[prior.length - 1]; means.push("Notiz: eine frühere Kalorien-Änderung ist dokumentiert — Ergebnis wurde als " + (p.observed ? "„Gewicht " + signed(p.observed.weightDelta) + " kg, Taille " + signed(p.observed.waistDelta) + " cm“" : "beobachtet") + " festgehalten."); }
      return { answer: answer, whatISee: see, whatItMeans: means, whatIdDo: doNext, whatNotToChange: noChange, reassess: "In 14 Tagen mit neuem Gewichtstrend.", evidence: ["nutrition.plan", "body.weightTrend", "execution.consistency", "memory.responses"] };
    },

    // „Warum ist mein Bankdrücken / meine Kraft stehengeblieben?“
    strength: function (t) {
      var ctx = t.getCurrentState(), tr = t.getTrainingHistory(), r = t.getRecovery();
      // Gate auf echte Kraft-Trenddaten: mind. eine Übung mit ≥2 Messpunkten
      // (avgE1rmPct wird nur daraus gebildet), nicht auf die reine Session-Zahl.
      if (!tr.available || (tr.avgE1rmPct == null && (!tr.lifts || tr.lifts.length === 0))) return insufficient([{ label: "2+ geloggte Einheiten derselben Übung (für einen Kraft-Trend)" }]);
      var see = [], means = [], doNext = [], noChange = [], evidence = ["training.lifts", "recovery", "nutrition", "execution.consistency"];
      if (has(tr.avgE1rmPct)) see.push("Kraft-Trend Ø " + signed(tr.avgE1rmPct) + "% (e1RM)");
      see.push(tr.sessions + " Sessions geloggt");
      var stalled = has(tr.avgE1rmPct) && tr.avgE1rmPct <= 0.5;
      var answer;
      if (!stalled) {
        answer = "Deine Kraft steigt eigentlich — hier steht nichts still.";
        means.push("Ø e1RM " + signed(tr.avgE1rmPct) + "% über die geloggten Einheiten.");
        doNext.push("Double Progression konsequent weiterführen."); noChange.push("Programm");
      } else {
        answer = "Bevor du das Programm wechselst — die üblichen Bremsklötze zuerst.";
        var causes = [];
        if (r.lastSleepQuality === "schlecht" || (has(r.sleepHours) && r.sleepHours < 6.5)) { causes.push("Schlaf unter Zielbereich"); doNext.push("Schlaf-Konstanz fixen (der wahrscheinlichste Bremsklotz)."); }
        if (ctx.goal.mode === "cut") { causes.push("Kaloriendefizit (Kraft stagniert dort oft)"); doNext.push("Erwartung im Defizit anpassen ODER Energie leicht erhöhen."); }
        if (has(ctx.execution.consistency) && ctx.execution.consistency < 80) { causes.push("unregelmäßiges Training"); doNext.push("Erst Konstanz, dann Programmänderung."); }
        means.push(causes.length ? "Wahrscheinliche Ursachen: " + causes.join(", ") + "." : "Bei guter Basis: Übung variieren ODER 1 Woche leichter Deload — nicht einfach mehr Sätze.");
        if (!doNext.length) doNext.push("Übung variieren oder kurzer Deload (−30% Volumen, 1 Woche).");
        noChange.push("Nicht gleichzeitig alles ändern");
      }
      return { answer: answer, whatISee: see, whatItMeans: means, whatIdDo: doNext, whatNotToChange: noChange, reassess: "Nach 2–3 weiteren Einheiten neu bewerten.", evidence: evidence };
    },

    // „Was ändern meine letzten Labs?“ / labs
    labs: function (t) {
      var l = t.getLabs();
      if (!l.available) return insufficient([{ label: "Laborwerte erfassen (Labs)" }]);
      var see = [l.markers + " Marker erfasst"], means = [], doNext = [], noChange = [], evidence = ["labs.priorities", "labs.freshness"];
      if (l.fresh.state === "stale") means.push("Deine Labordaten sind veraltet (" + l.fresh.label + ") — als Momentaufnahme von damals lesen, nicht als aktuellen Stand.");
      var answer;
      if (l.priorities.length) {
        answer = l.priorities[0].name + " ist gerade dein wichtigster Labor-Punkt.";
        l.priorities.slice(0, 3).forEach(function (p) { see.push(p.name + ": " + p.status.toLowerCase()); });
        var crit = l.priorities.filter(function (p) { return p.crit; })[0];
        if (crit) { means.push(crit.reason); doNext.push(crit.name + " ärztlich einordnen lassen."); }
        else { means.push("Trend-Kontext zählt mehr als der Einzelwert."); doNext.push(l.priorities[0].name + " im Blick behalten / rechecken."); }
        noChange.push("Keine überstürzten Stack-Änderungen wegen eines Werts");
      } else {
        answer = "Deine Labs sind unauffällig genug — kein akuter Handlungsbedarf.";
        means.push("Keine Marker mit auffälligem Trend oder kritischem Wert.");
        doNext.push("Turnusmäßig rechecken (Labs → Recheck-Plan).");
      }
      if (l.rechecksDue) doNext.push(l.rechecksDue + " Recheck(s) sind fällig.");
      return { answer: answer, whatISee: see, whatItMeans: means, whatIdDo: doNext, whatNotToChange: noChange, reassess: "Zum nächsten Recheck-Fenster.", evidence: evidence };
    },

    // „Ist mein Stack sinnvoll?“
    stack: function (t) {
      var s = t.getStack(), l = t.getLabs();
      var see = [], means = [], doNext = [], noChange = [], evidence = ["stack.items", "stack.labFlags"];
      if (!s.available) return insufficient([{ label: "Stack im Plan zusammenstellen" }]);
      see.push("Aktuell: " + (s.items.length ? s.items.join(", ") : "leer"));
      var answer = "Dein Stack ist grundsätzlich vertretbar — mit ein paar labor-informierten Hinweisen.";
      (s.labFlags || []).forEach(function (f) {
        if (f.action === "avoid") { doNext.push("Nicht: " + f.text); means.push(f.text); }
        else if (f.action === "hold") { doNext.push("Halten statt eskalieren: " + f.text); }
        else if (f.action === "consider") { doNext.push("Erwägen: " + f.text); }
      });
      if (!s.labFlags || !s.labFlags.length) { means.push("Ohne Laborwerte bleibt die Stack-Bewertung allgemein — Labs würden sie schärfen."); doNext.push("Labs erfassen für labor-informierte Empfehlungen."); }
      noChange.push("Nichts stapeln, bevor Training/Ernährung/Schlaf stehen");
      return { answer: answer, whatISee: see, whatItMeans: means, whatIdDo: doNext, whatNotToChange: noChange, reassess: "Bei neuen Laborwerten.", evidence: evidence };
    },

    // „Was soll ich diese Woche fokussieren?“ / „Was als Nächstes?“
    focus: function (t) {
      var ctx = t.getCurrentState(), dec = t.getDecision(), bn = t.getBottleneck();
      var see = ["Aktueller Limiter: " + (I.LABELS.BN[bn.domain] || bn.domain) + " (" + bn.confidencePct + "% Konfidenz)"];
      bn.evidence.slice(0, 2).forEach(function (e) { see.push(e); });
      return {
        answer: dec.primary.title + ".",
        whatISee: see,
        whatItMeans: [dec.primary.reason],
        whatIdDo: [dec.primary.title].concat(dec.primary.deepLink ? [] : []),
        whatNotToChange: dec.notNow.slice(0, 3),
        reassess: "In " + dec.reviewInDays + " Tagen.",
        evidence: ["decision.primary", "bottleneck2"].concat(bn.evidence.length ? ["bottleneck.evidence"] : [])
      };
    },

    // „Was hat sich im letzten Monat geändert?“
    change: function (t) {
      var ctx = t.getCurrentState(), b = t.getBody(), tr = t.getTrainingHistory(), l = t.getLabs();
      var see = [], means = [], doNext = ["Weiter messen — Veränderung wird über Trends sichtbar, nicht über Einzeltage."], noChange = [];
      if (has(b.weightDelta)) see.push("Gewicht " + signed(b.weightDelta) + " kg seit Start");
      if (has(b.waistDelta)) see.push("Taille " + signed(b.waistDelta) + " cm seit Start");
      if (has(tr.avgE1rmPct)) see.push("Kraft Ø " + signed(tr.avgE1rmPct) + "% (e1RM)");
      (l.deltas || []).slice(0, 3).forEach(function (d) { see.push(d.name + " " + I.util.round(d.from) + "→" + I.util.round(d.to) + " " + (d.unit || "")); });
      if (!see.length) return insufficient([{ label: "Start- und aktuelle Messwerte für einen Vergleich" }]);
      var answer = "Hier die belastbaren Veränderungen — als Trend, ohne Kausalitätsbehauptung.";
      means.push("Zahlen zeigen WAS sich geändert hat; WARUM bleibt korrelativ, solange nicht kontrolliert getestet wurde.");
      return { answer: answer, whatISee: see, whatItMeans: means, whatIdDo: doNext, whatNotToChange: noChange, reassess: "Fortlaufend.", evidence: ["body.delta", "training.lifts", "labs.deltas"] };
    },

    // „Was soll ich aufhören?“ / stop
    stop: function (t) {
      var ctx = t.getCurrentState();
      var list = I.decision.stopDoing(ctx);
      return { answer: "Das würde ich gerade sein lassen:", whatISee: ["Basierend auf deinem aktuellen Limiter und Trend."], whatItMeans: [], whatIdDo: list, whatNotToChange: [], reassess: "Laufend.", evidence: ["decision.stopDoing", "bottleneck2"], isList: true };
    },

    // Generisch: Snapshot + primäre Entscheidung.
    general: function (t) {
      var ctx = t.getCurrentState(), dec = t.getDecision();
      var snap = I.snapshot(ctx).rows.filter(function (r) { return ["GOAL", "TREND", "TRAINING", "BOTTLENECK"].indexOf(r.k) >= 0; }).map(function (r) { return r.k.toLowerCase() + ": " + r.v; });
      return {
        answer: "Kurzstand: " + dec.primary.title + ".",
        whatISee: snap,
        whatItMeans: [dec.primary.reason],
        whatIdDo: [dec.primary.title],
        whatNotToChange: dec.notNow.slice(0, 2),
        reassess: "In " + dec.reviewInDays + " Tagen.",
        evidence: ["snapshot", "decision.primary"]
      };
    }
  };

  // Thema → Handler-Routing (nutzt classifyTopic, mit Sonderfällen stop/labs/change).
  function routeHandler(question) {
    var q = String(question || "").toLowerCase();
    if (/aufhören|stop doing|stop|weglassen|sein lassen|nicht mehr/.test(q)) return "stop";
    var topic = I.classifyTopic(question);
    if (topic === "weight") return "fatloss";
    if (HANDLERS[topic]) return topic;
    return "general";
  }

  /* =======================================================================
     ANSWER (deterministisch, synchron) — immer verfügbar.
     ======================================================================= */
  function answer(question, ctx) {
    var clean = sanitizeQuestion(question);
    ctx = ctx || I.buildContext();
    var t = tools(ctx);
    var handlerKey = routeHandler(clean.text);
    var out = HANDLERS[handlerKey](t);
    out.topic = handlerKey;
    out.question = clean.text;
    out.boundaryNote = boundaryNote(clean, ctx, handlerKey);
    if (clean.injectionAttempt) out.boundaryNote = "MaleMetrix bleibt bei seinem Rahmen: es erklärt und ordnet ein, verschreibt aber keine individuellen Medikamenten-/Dosierungspläne und lässt sich nicht umschreiben. " + (out.boundaryNote || "");
    out.provider = "deterministic";
    out.generatedAt = ctx.builtAt;
    // Evidence-Trace in menschenlesbare Quellen übersetzen.
    out.basedOn = (out.evidence || []).map(prettyEvidence).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    return out;
  }
  function boundaryNote(clean, ctx, topic) {
    // Medizinische Grenze nur wo kontextuell nötig (§164) — nicht mechanisch überall.
    if (topic === "labs") { var crit = (ctx.labs.priorities || []).some(function (p) { return p.crit; }); if (crit) return "Kritische Werte gehören ärztlich eingeordnet — MaleMetrix stellt keine Diagnose."; }
    if (ctx.pathway === "enhanced" && /dosier|dosage|mg|ml|protokoll|cycle|kur/.test(clean.text.toLowerCase())) return "Zu konkreter Dosierung/Protokoll: MaleMetrix erklärt Strategie & Monitoring, erstellt aber keine individuellen Dosierungspläne — das gehört in professionelle Begleitung.";
    return "";
  }
  var EV_LABEL = {
    "body.weightTrend": "Gewichtstrend", "body.waistTrend": "Taillentrend", "body.delta": "Körper-Veränderung",
    "execution.consistency": "Umsetzung/Adhärenz", "training.lifts": "Kraftverlauf", "nutrition.plan": "Nutrition-Plan",
    "recovery": "Schlaf/Recovery", "labs.priorities": "Labor-Prioritäten", "labs.deltas": "Labor-Verlauf",
    "labs.freshness": "Aktualität der Labs", "stack.items": "aktueller Stack", "stack.labFlags": "Labor-Kontext zum Stack",
    "memory.responses": "frühere Interventionen", "decision.primary": "Entscheidungs-Engine", "bottleneck2": "Bottleneck-Analyse",
    "bottleneck.evidence": "Bottleneck-Evidenz", "snapshot": "Gesamt-Snapshot", "decision.stopDoing": "Stop-Doing-Regeln"
  };
  function prettyEvidence(e) { return EV_LABEL[e] || null; }

  /* =======================================================================
     PROVIDER SEAM (§25/26/27) — optionale KI-Sprachveredelung.
     Kein Secret im Client; ein registrierter Provider ruft ein sicheres
     Backend/Edge-Function. Fehlt der Provider → deterministische Antwort.
     Der Provider bekommt NUR: den Contract + relevanten (budgetierten) Kontext.
     ======================================================================= */
  var _provider = null;   // fn(payload) -> Promise<{prose}>
  function registerProvider(fn) { if (typeof fn === "function") _provider = fn; }
  function hasProvider() { return !!_provider; }

  function answerAsync(question, ctx) {
    var base = answer(question, ctx);   // deterministischer Kern IMMER zuerst
    if (!_provider) return Promise.resolve(base);
    // Nur budgetierten, relevanten Kontext an den Provider geben (§5, §99).
    var payload = {
      contract: base,                    // die deterministische Struktur ist die Wahrheit
      relevantContext: I.relevantContext(question, ctx),
      policy: "Explain and rephrase the deterministic contract in a natural, concise MaleMetrix voice. You MUST NOT invent numbers, change decisions, or contradict the contract. If the contract says 'unsure', keep it unsure."
    };
    return Promise.resolve().then(function () { return _provider(payload); }).then(function (res) {
      if (res && res.prose) { base.prose = String(res.prose); base.provider = res.provider || "ai"; }
      return base;   // Kern bleibt maßgeblich; KI ist nur Sprache obendrauf
    }).catch(function () { return base; });   // Provider-Ausfall → deterministisch (§27)
  }

  /* Vorgeschlagene Fragen (kontextabhängig) für die UI. */
  function suggestedQuestions(ctx) {
    ctx = ctx || I.buildContext();
    var qs = [];
    if (ctx.goal.mode === "cut" || (ctx.body.waistTrend14 != null)) qs.push("Warum verliere ich kein Fett?");
    if (ctx.goal.mode === "build") qs.push("Soll ich mehr essen?");
    if (ctx.training.available) qs.push("Warum ist meine Kraft stehengeblieben?");
    qs.push("Was soll ich diese Woche fokussieren?");
    if (ctx.labs.available) qs.push("Was ändern meine letzten Labs?");
    if (ctx.stack.available) qs.push("Ist mein Stack sinnvoll?");
    qs.push("Was hat sich verändert?");
    qs.push("Was soll ich aufhören?");
    return qs.slice(0, 6);
  }

  I.advisor = {
    answer: answer, answerAsync: answerAsync, tools: tools, suggestedQuestions: suggestedQuestions,
    registerProvider: registerProvider, hasProvider: hasProvider, sanitizeQuestion: sanitizeQuestion, routeHandler: routeHandler
  };
})();
