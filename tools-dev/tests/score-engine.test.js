/* ==========================================================================
   MALEMETRIX P10/P2 — Score-/Decision-Engine: Verhaltens-Regressionstests
   Lädt die ECHTE Engine (js/check-data.js) und ruft MM_CHECK.goalDecision /
   productRecommendation mit konstruierten Antworten auf. Friert die
   kritischen Produktregeln ein:
     · GOAL ≠ BOTTLENECK — Bauchfett-Fokus darf nie stumpf BUILD ergeben
     · sehr leichter Mann mit Aufbauziel bekommt nie CUT
     · Red Flags haben Vorrang vor jeder Produkt-/Coaching-Empfehlung
     · Schlaf-/Recovery-Schwäche ändert den Body-Mode nicht willkürlich
   Ausführen:  node tools-dev/tests/score-engine.test.js
   ========================================================================== */
"use strict";
var path = require("path");
var ROOT = path.resolve(__dirname, "../..");

global.window = {};
require(path.join(ROOT, "js/check-data.js"));
var C = global.window.MM_CHECK;

var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

ok(!!C && typeof C.goalDecision === "function", "Engine lädt in Node (deterministisch, ohne DOM)");

/* ===== 1) Der gemeldete Realfehler: Bauchfokus ⇒ nie stumpf BUILD ===== */
group("GOAL vs. BOTTLENECK · Bauchfett-Fokus ⇒ nie BUILD");
(function () {
  // Hoher Körperfettanteil (WHtR 0.61) + Muskelwunsch ⇒ CUT, nicht BUILD
  var d1 = C.goalDecision({ goal_main: ["muskeln"], height: 180, weight: 102, waist: 110, body_type: "uebergewicht", str_freq: "3", str_plan: "ja" });
  ok(d1.mode === "cut", "WHtR 0.61 + Muskelziel ⇒ CUT (nicht BUILD): " + d1.mode);
  ok(/Fett/i.test(d1.reason), "Begründung erklärt den Fett-Vorrang (Explainability)");

  // „Mein Bauchansatz stört mich" (goal_pain=bauch) + moderates Fett ⇒ RECOMP
  var d2 = C.goalDecision({ goal_main: ["muskeln"], goal_pain: "bauch", height: 180, weight: 88, waist: 97, body_type: "normal_bauch", str_freq: "3", str_plan: "ja" });
  ok(d2.mode !== "build", "Bauchansatz stört + moderates Fett ⇒ nicht BUILD: " + d2.mode);
  ok(d2.mode === "recomp", "… sondern RECOMP (Taille runter, Muskeln rauf)");

  // Reiner Bauchfett-Fokus ohne Muskelwunsch ⇒ CUT
  var d3 = C.goalDecision({ goal_main: ["bauchfett"], height: 178, weight: 92, waist: 100, body_type: "normal_bauch" });
  ok(d3.mode === "cut", "reiner Bauchfett-Fokus ⇒ CUT: " + d3.mode);

  // Grenzfall aus dem Brief: schlanker, trainierter Mann, den der (kleine)
  // Bauch stört + Muskelwunsch ⇒ BUILD ist hier bewusst erlaubt, aber die
  // Begründung MUSS den Bauch adressieren (keine stumpfe Empfehlung).
  var d4 = C.goalDecision({ goal_main: ["muskeln"], goal_pain: "bauch", height: 182, weight: 78, waist: 82, body_type: "skinny", str_freq: "3", str_plan: "ja" });
  ok(d4.mode === "build" || d4.mode === "recomp", "schlank+trainiert+Bauch stört ⇒ BUILD/RECOMP möglich: " + d4.mode);
  ok(/Bauch/i.test(d4.reason), "… aber die Begründung adressiert den Bauch explizit");
})();

/* ===== 2) Sehr leichter Mann + Aufbauziel ⇒ nie aggressiver CUT ===== */
group("Untergewichtig/skinny + Muskelziel ⇒ nie CUT");
(function () {
  var d = C.goalDecision({ goal_main: ["muskeln"], height: 185, weight: 62, waist: 74, body_type: "skinny", str_freq: "0", str_plan: "nein" });
  ok(d.mode !== "cut", "BMI 18.1 + Muskelziel ⇒ kein CUT: " + d.mode);
  ok(d.mode === "build" || d.mode === "recomp", "… sondern Aufbau-orientiert (BUILD/RECOMP)");
  var d2 = C.goalDecision({ goal_main: ["kraft"], height: 190, weight: 66, waist: 76, body_type: "skinny", str_freq: "2", str_plan: "ja" });
  ok(d2.mode !== "cut", "sehr leicht + Kraftziel ⇒ ebenfalls kein CUT: " + d2.mode);
})();

/* ===== 3) Recovery-Schwäche kippt das Body-Goal nicht ===== */
group("Schlechter Schlaf ⇒ Bottleneck-Thema, überschreibt Mode nicht willkürlich");
(function () {
  var base = { goal_main: ["muskeln"], height: 180, weight: 80, waist: 84, body_type: "skinny", str_freq: "3", str_plan: "ja" };
  var good = C.goalDecision(base);
  var badSleep = C.goalDecision(Object.assign({}, base, { rec_sleep_h: "unter6", rec_quality: "schlecht", rec_stress: "hoch" }));
  ok(good.mode === badSleep.mode, "identische Körperdaten ⇒ gleicher Mode, unabhängig von Schlaf-Antworten (" + good.mode + ")");
  ok(C.bottleneckTexts && C.bottleneckTexts.recovery, "Recovery existiert als eigener Bottleneck (getrennt vom Goal)");
  ok(C.weights && C.weights.recovery >= 10, "Recovery hat substanzielles Gewicht im Score (" + C.weights.recovery + ")");
})();

/* ===== 4) Red Flags haben Vorrang — kein Sales-Push ===== */
group("Red-Flag-Routing · medizinisch vor kommerziell");
(function () {
  var strongScores = { body: 70, strength: 70, fuel: 70, recovery: 70, blood: 70, drive: 70, execution: 70 };
  var r = C.productRecommendation({ flags: ["Brustschmerz bei Belastung"], scores: strongScores, answers: {} });
  ok(r.kind === "medical", "mit Red Flag ⇒ kind=medical (kein Programm-/Coaching-Push)");
  ok(/ärztlich|Arzt/i.test(r.title + " " + r.why), "Empfehlung sagt klar: zuerst ärztlich abklären");
  ok(!r.primary.href, "primäre Aktion ist KEIN Verkaufslink");
  var r2 = C.productRecommendation({ flags: [], scores: strongScores, answers: {} });
  ok(r2.kind !== "medical", "ohne Red Flag ⇒ normale Empfehlung (" + r2.kind + ")");
})();

/* ===== 5) Coaching nur bei High-Intent-Signalen (P5.2-Vorgriff) ===== */
group("Coaching-Trigger · high-intent statt überall");
(function () {
  var weak = { body: 40, strength: 42, fuel: 40, recovery: 44, blood: 50, drive: 50, execution: 40 };
  var rWeak = C.productRecommendation({ flags: [], scores: weak, answers: { exe_restarts: "staendig" } });
  ok(rWeak.kind === "coaching", "mehrere schwache Bereiche + Neustart-Muster ⇒ Coaching: " + rWeak.kind);
  var solid = { body: 62, strength: 60, fuel: 58, recovery: 61, blood: 65, drive: 63, execution: 66 };
  var rSolid = C.productRecommendation({ flags: [], scores: solid, answers: {} });
  ok(rSolid.kind !== "coaching", "solides Profil ohne Wunsch ⇒ KEIN Coaching-Push: " + rSolid.kind);
  var rWish = C.productRecommendation({ flags: [], scores: solid, answers: { exe_support: "coach" } });
  ok(rWish.kind === "coaching", "expliziter Begleitungs-Wunsch ⇒ Coaching angeboten");
})();

/* ===== 6) Determinismus & Vollständigkeit ===== */
group("Determinismus · gleiche Eingabe ⇒ gleiche Entscheidung, alle Modi erreichbar");
(function () {
  var a = { goal_main: ["muskeln"], goal_pain: "bauch", height: 180, weight: 88, waist: 97, body_type: "normal_bauch", str_freq: "3", str_plan: "ja" };
  var m1 = C.goalDecision(a).mode, m2 = C.goalDecision(a).mode, m3 = C.goalDecision(a).mode;
  ok(m1 === m2 && m2 === m3, "3× identische Eingabe ⇒ identischer Mode (kein Zufall, keine KI)");
  var modes = {};
  [
    { goal_main: ["muskeln"], height: 185, weight: 70, waist: 76, body_type: "skinny", str_freq: "3", str_plan: "ja" },              // build
    { goal_main: ["muskeln"], height: 180, weight: 102, waist: 110, body_type: "uebergewicht" },                                       // cut
    { goal_main: ["muskeln"], goal_pain: "bauch", height: 180, weight: 88, waist: 97, body_type: "normal_bauch", str_freq: "3", str_plan: "ja" }, // recomp
    { goal_main: ["energie"], height: 180, weight: 76, waist: 80, body_type: "skinny" }                                                // perform
  ].forEach(function (x) { modes[C.goalDecision(x).mode] = true; });
  ok(modes.build && modes.cut && modes.recomp && modes.perform, "alle 4 Modi sind deterministisch erreichbar (echte Differenzierung)");
  ["cut", "recomp", "build", "perform"].forEach(function (m) {
    ok(C.modeLabels[m] && C.modeLabels[m].desc.length > 10, "Mode " + m.toUpperCase() + " hat eine ehrliche Beschreibung");
  });
})();

/* ===== 7) P13 · Decision Confidence — deterministisch, keine Fake-% ===== */
group("P13 · Confidence: HIGH/MEDIUM/LIMITED aus Daten, nie erfunden");
(function () {
  var full = { height: 180, weight: 88, waist: 96, body_type: "normal_bauch", steps: "8000", blood_bp: "ja", drv_libido: "ok", drv_morning: "ok", rec_quality: "ok" };
  var c1 = C.decisionConfidence(full, []);
  ok(c1.level === "HIGH", "vollständige, konsistente Daten ⇒ HIGH: " + c1.level);
  ok(/konsistent/.test(c1.reasons.join(" ")), "HIGH hat ehrliche Begründung");
  var c2 = C.decisionConfidence({ height: 180, weight: 88, body_type: "normal_bauch", steps: "8000", blood_bp: "ja", drv_libido: "ok", drv_morning: "ok" }, []);
  ok(c2.level === "MEDIUM", "eine fehlende Kernangabe (Bauchumfang) ⇒ MEDIUM: " + c2.level);
  var c3 = C.decisionConfidence({ height: 180, weight: 95, waist: 104, body_type: "skinny", drv_libido: "keine_antwort", drv_morning: "keine_antwort", rec_quality: "keine_antwort" }, []);
  ok(c3.level === "LIMITED", "Widerspruch (skinny + WHtR 0.58) + verweigerte Antworten ⇒ LIMITED: " + c3.level);
  ok(c3.contradictions.length >= 1, "Widersprüche werden benannt, nicht kaschiert");
  var c4 = C.decisionConfidence(full, ["Brustschmerz bei Belastung"]);
  ok(c4.level === "LIMITED" && /ärztlich/.test(c4.reasons.join(" ")), "Red Flag ⇒ LIMITED mit medizinischem Hinweis");
  ok(!JSON.stringify(c1).match(/%|percent/i), "keine Fake-Prozentwerte im Confidence-Objekt");
  var again = C.decisionConfidence(full, []);
  ok(again.level === c1.level, "deterministisch: gleiche Eingabe ⇒ gleiches Level");
})();

/* ===== 8) P13 · Next-Step-Routing — GENAU EINE primäre Handlung ===== */
group("P13 · Next Step: eine Handlung, klare Präzedenz");
(function () {
  ok(C.nextStep({ hasScore: true, signedIn: true, activeCycle: false, redFlags: true }).key === "medical", "Red Flag schlägt alles ⇒ medical");
  ok(C.nextStep({ hasScore: false }).key === "score", "kein Score ⇒ Score starten");
  var acc = C.nextStep({ hasScore: true, signedIn: false, activeCycle: false });
  ok(acc.key === "account" && /sichern/i.test(acc.label), "Score ohne Konto ⇒ Ergebnis sichern (Score geht nie verloren)");
  ok(C.nextStep({ hasScore: true, signedIn: true, activeCycle: false }).key === "start_program", "Konto ohne Zyklus ⇒ 12-Wochen-System starten");
  ok(C.nextStep({ hasScore: true, signedIn: true, activeCycle: true }).key === "today", "aktiver Zyklus ⇒ HEUTE");
  ok(C.nextStep({ hasScore: true, signedIn: true, activeCycle: true, redFlags: false }).href.indexOf("#today") > 0, "HEUTE führt direkt ins Cockpit");
  ["medical", "score", "account", "start_program", "today"].forEach(function () {});
  var m = C.nextStep({ redFlags: true });
  ok(m.href === null, "medical hat KEINEN Verkaufslink als primäre Aktion");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
