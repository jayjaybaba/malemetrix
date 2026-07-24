/* ==========================================================================
   MALEMETRIX SCORE V2 — Adaptive Engine: verbindliche Verhaltenstests
   Lädt die ECHTE Engine (js/check-data.js) und prüft die Produktregeln,
   die nie wieder brechen dürfen:

     · Status ist Kontext, KEIN Punktabzug (natural vs. enhanced)
     · TRT ≠ leistungsorientierte Anwendung (getrennte Pfade & Texte)
     · UNBEKANNT ≠ NORMAL (Data-Gap-Engine)
     · Score und Aussagesicherheit sind getrennt
     · Bauchfett-Fokus ergibt nie leichtfertig BUILD
     · keine Diagnose, keine Dosierungen, keine Gegenmittel
     · alte gespeicherte Ergebnisse laden weiter

   Ausführen:  node tools-dev/tests/score-v2.test.js
   ========================================================================== */
"use strict";
var path = require("path");
var ROOT = path.resolve(__dirname, "../..");
var fs = require("fs");

global.window = {};
require(path.join(ROOT, "js/check-data.js"));
var C = global.window.MM_CHECK;

var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

/* ---------------------------------------------------------------- Fixtures */

/* Solider Lifestyle-Kern, identisch über alle Status-Varianten — damit
   Unterschiede im Ergebnis NUR aus dem Kontext stammen können. */
var CORE_GOOD = {
  goal_main: ["muskeln"], goal_pain: "kraft", goal_urgency: 4,
  name: "Test", age: 38, height: 180, weight: 82, waist: 86,
  job: "gemischt", kids: "nein", steps: "7to10", history: "aktiv",
  body_weighttrend: "gleich", body_waisttrend: "gleich", body_type: "athletisch",
  body_tracking: ["gewicht", "bauch", "kraft"], body_satisfaction: 7,
  str_freq: "4plus", str_plan: "progression", str_log: "app",
  str_exercises: ["kniebeuge", "kreuzheben", "bank", "rudern", "klimmzug", "schulter", "core"],
  str_limit: "nichts", str_values: "genau", str_cardio_freq: "2",
  str_cardio_capacity: "locker", str_cardio_marker: "regelmaessig",
  mov_daily: "regelmaessig", mov_sitting: "4to8",
  fuel_protein: "tracke", fuel_structure: "geplant", fuel_calories: "tracke",
  fuel_alcohol: "nie", fuel_control: "selten", fuel_eatout: "selten", fuel_problem: "durchhalten",
  rec_duration: "7to8", rec_wake: "erholt", rec_night: "0", rec_caffeine: "morgens",
  rec_stress: 3, rec_snore: "nein",
  blood_bp: "kontrolliert", blood_baseline: "aktuell_eingeordnet", blood_cardiometabolic: "eingeordnet",
  blood_prevention: "regelmaessig", blood_family: "ja", blood_doctor: "regelmaessig", blood_overtest: "gezielt",
  cv_smoking: "nie", cv_bp_control: "normal", met_glucose: "normal", met_medication: ["keine"],
  lab_recency: "lt3m", lab_known: ["blutbild", "haematokrit", "ldl", "hdl", "trig", "apob", "glukose", "niere", "leber", "hormone"],
  drv_energy: "stabil", drv_focus: "klar", drv_libido: "sehr", drv_morning: "regelmaessig",
  exe_slots: "4plus", exe_restarts: "konstant", exe_after4w: "durchziehen",
  exe_enemy: "planung", exe_support: "plan", exe_ready: 9,
  redflags: ["keine"],
  qual_time: "ja", qual_start: "sofort"
};

function mk(over) { return Object.assign({}, CORE_GOOD, over || {}); }
function visIds(a) { return C.visibleSteps(a).map(function (s) { return s.q.id; }); }

/* ===================================================================== 0 */
group("0 · Engine lädt deterministisch ohne DOM");
ok(typeof C.evaluate === "function", "C.evaluate existiert");
ok(typeof C.statusOf === "function" && typeof C.dataGaps === "function", "Status-Routing & Data-Gap-Engine existieren");
(function () {
  var a = mk({ perf_status: "natural" });
  var e1 = JSON.stringify(C.evaluate(a)), e2 = JSON.stringify(C.evaluate(a));
  ok(e1 === e2, "gleiche Eingabe ⇒ identisches Ergebnis (kein Zufall, keine KI)");
})();

/* ===================================================================== 1 */
group("Adaptivität · Natural, TRT, Enhanced und Former bekommen NICHT dieselben Fragen");
(function () {
  var nat = visIds(mk({ perf_status: "natural" }));
  var trt = visIds(mk({ perf_status: "medical_trt" }));
  var enh = visIds(mk({ perf_status: "enhanced", enh_categories: ["testosterone", "oral"] }));
  var fmr = visIds(mk({ perf_status: "former_enhanced" }));
  var unc = visIds(mk({ perf_status: "uncertain" }));

  ok(nat.indexOf("perf_status") >= 0, "Status-Routingfrage erscheint für alle");
  ok(nat.indexOf("nat_training_response") >= 0 && nat.indexOf("trt_supervision") < 0 && nat.indexOf("enh_categories") < 0,
    "NATURAL: eigener Pfad, keine TRT-/Enhanced-Fragen");
  ok(trt.indexOf("trt_supervision") >= 0 && trt.indexOf("trt_followup") >= 0 && trt.indexOf("enh_categories") < 0,
    "TRT: Therapiefragen, aber KEINE Enhanced-Fragen (getrennte Kategorien)");
  ok(enh.indexOf("enh_categories") >= 0 && enh.indexOf("trt_supervision") < 0,
    "ENHANCED: eigener Pfad, nicht mit TRT vermischt");
  ok(fmr.indexOf("fe_last_use") >= 0 && fmr.indexOf("fe_followup") >= 0,
    "FORMER: Rückkehr-Fragen (Zeitachse + Nachkontrolle)");
  ok(unc.indexOf("unc_context") >= 0 && unc.indexOf("nat_training_response") >= 0,
    "UNSICHER: neutrale Klärungsfrage, keine erzwungene Einordnung");
  ok(JSON.stringify(nat) !== JSON.stringify(enh) && JSON.stringify(trt) !== JSON.stringify(enh),
    "die Fragenliste unterscheidet sich real zwischen den Kontexten");

  var core = C.allSteps.filter(function (s) { return !s.q.when && !s.mod.when; }).length;
  var coreShare = core / enh.length;
  ok(coreShare >= 0.6 && coreShare <= 0.85,
    "Pflicht-Kern: " + core + " Fragen = " + Math.round(coreShare * 100) + "% des Enhanced-Pfads, der Rest ist adaptiv");
  ok(enh.length - core >= 8, (enh.length - core) + " adaptive Fragen im Enhanced-Pfad (progressive disclosure)");
  ok(nat.length <= 52 && enh.length <= 58,
    "kein Verhör: natural " + nat.length + ", enhanced " + enh.length + " Fragen (vorher: 51 starre Fragen für JEDEN)");
})();

/* ===================================================================== 2 */
group("Compound-aware Routing · Kategorien steuern Folgefragen, nicht Empfehlungen");
(function () {
  var oral = visIds(mk({ perf_status: "enhanced", enh_categories: ["oral"] }));
  var gh = visIds(mk({ perf_status: "enhanced", enh_categories: ["gh"] }));
  var glp = visIds(mk({ perf_status: "enhanced", enh_categories: ["glp1"] }));
  var glpNat = visIds(mk({ perf_status: "natural", met_medication: ["glp1"] }));
  ok(oral.indexOf("enh_liver") >= 0, "orale Substanzen ⇒ Leber-Kontrollfrage erscheint");
  ok(gh.indexOf("enh_glucose") >= 0 && gh.indexOf("enh_liver") < 0, "Wachstumshormon ⇒ Glukose-Frage, keine Leber-Frage");
  ok(glp.indexOf("glp1_lean") >= 0, "GLP-1 ⇒ Muskelerhalt-Kontext");
  ok(glpNat.indexOf("glp1_lean") >= 0, "GLP-1 wird auch bei NATURAL erkannt (Medikamentenfrage)");
  ok(visIds(mk({ perf_status: "enhanced", enh_categories: ["testosterone"] })).indexOf("enh_hematology") >= 0,
    "androgen wirksame Kategorie ⇒ Hämatologie-Kontext");
})();

/* ===================================================================== 3 */
group("Signal-Routing · Symptome öffnen Module statt Punkte abzuziehen");
(function () {
  var snore = visIds(mk({ rec_snore: "stark", perf_status: "natural" }));
  ok(snore.indexOf("slp_daysleep") >= 0, "Schnarchen ⇒ Tagesmüdigkeits-/Apnoe-Kontext");
  var sex = visIds(mk({ perf_status: "natural", drv_libido: "niedrig" }));
  ok(sex.indexOf("drv_change") >= 0, "sexuelle Symptome ⇒ Verlaufsfrage (ärztlich relevant), keine Diagnose");
  var bp = visIds(mk({ perf_status: "enhanced", enh_signals: ["bp"] }));
  ok(bp.indexOf("cv_bp_control") >= 0, "Blutdruck-Signal ⇒ kardiovaskuläres Kontrollmodul");
})();

/* ===================================================================== 4 */
group("CASE 1 · NATURAL, schlank, Muskelziel ⇒ BUILD ist erlaubt");
(function () {
  var ev = C.evaluate(mk({ perf_status: "natural", goal_main: ["muskeln"], waist: 82, weight: 78, body_type: "skinny" }));
  ok(ev.goalRecommendation.mode === "build", "schlank + belegte Taille + Muskelziel ⇒ BUILD: " + ev.goalRecommendation.mode);
  ok(ev.confidence.level === "HIGH", "vollständige Daten ⇒ hohe Aussagesicherheit: " + ev.confidence.level);
  ok(!!ev.primaryBottleneck.name, "auch ein starkes Profil bekommt einen benannten Engpass");
})();

/* ===================================================================== 5 */
group("CASE 2 · NATURAL, Bauch stört ⇒ NIEMALS automatisch BUILD");
(function () {
  var a = mk({ perf_status: "natural", goal_main: ["muskeln"], goal_pain: "bauch",
    weight: 92, waist: 100, body_type: "normal_bauch" });
  var ev = C.evaluate(a);
  ok(ev.goalRecommendation.mode !== "build", "Bauchfokus + erhöhte Taille ⇒ kein BUILD: " + ev.goalRecommendation.mode);
  ok(["cut", "recomp"].indexOf(ev.goalRecommendation.mode) >= 0, "… sondern CUT oder RECOMP");

  /* Der eigentliche Altfehler: Bauch stört, Taille NICHT gemessen.
     Unbekannt darf nicht als „schlank" durchgehen. */
  var b = mk({ perf_status: "natural", goal_main: ["muskeln"], goal_pain: "bauch",
    waist: "", body_type: "athletisch" });
  var evb = C.evaluate(b);
  ok(evb.goalRecommendation.mode !== "build",
    "Bauch stört + Bauchumfang unbekannt ⇒ kein BUILD (unbekannt ≠ schlank): " + evb.goalRecommendation.mode);
  ok(/Bauch/i.test(evb.goalRecommendation.reason), "… und die Begründung adressiert den Bauch ausdrücklich");
  ok(evb.dataGaps.some(function (g) { return g.id === "waist"; }), "… der fehlende Bauchumfang erscheint als Datenlücke");
})();

/* ===================================================================== 6 */
group("CASE 3 · NATURAL mit Symptomcluster ⇒ Abklärung, KEINE Hormondiagnose");
(function () {
  var ev = C.evaluate(mk({ perf_status: "natural", drv_libido: "niedrig", drv_morning: "fast_nie",
    drv_energy: "muede", drv_focus: "traege", rec_duration: "5to6", rec_wake: "geraedert",
    nat_training_response: "stagniert", nat_recovery: "schlecht", drv_change: "schleichend" }));
  var txt = JSON.stringify(ev);
  ok(/gepr(ü|ue)ft|Abkl(ä|ae)rung/i.test(ev.contextPanel.verdict + " " + ev.contextPanel.lines.join(" ")),
    "Symptomcluster ⇒ „hormoneller Kontext sollte geprüft werden“");
  ok(!/niedrige[ns]? Testosteron|Testosteronmangel|Hypogonadismus bei dir|du hast (einen )?Mangel/i.test(txt),
    "KEINE Diagnose im Ergebnis");
  ok(["sleep", "recovery", "energy", "hormonal", "bodyComposition"].indexOf(ev.primaryBottleneck.domain) >= 0,
    "Engpass ist ein Lifestyle-/Kontextsystem (" + ev.primaryBottleneck.domain + "), keine Hormonaussage");
})();

/* ===================================================================== 7 */
group("CASE 4+5 · TRT: Ansprechen und Kontrolle sind zwei verschiedene Dinge");
(function () {
  var good = C.evaluate(mk({ perf_status: "medical_trt", trt_reason: "hypogonadismus",
    trt_supervision: "regelmaessig", trt_duration: "1to3y", trt_followup: "lt3m",
    trt_response: "klar", trt_fertility: "abgeschlossen" }));
  ok(good.domains.therapyControl >= 78, "gut betreute Therapie ⇒ hohe Therapie-Kontrolle: " + good.domains.therapyControl);
  ok(good.contextPanel.title === "THERAPIE-KONTROLLE", "TRT bekommt das Therapie-Panel (nicht Enhanced Control)");
  ok(good.goalRecommendation.mode !== "health_first", "TRT mit sauberer Kontrolle ⇒ kein HEALTH FIRST");

  var poor = C.evaluate(mk({ perf_status: "medical_trt", trt_reason: "symptome",
    trt_supervision: "selbst", trt_duration: "1to3y", trt_followup: "nie",
    trt_response: "klar", trt_fertility: "nein", blood_bp: "nein", lab_recency: "nie", lab_known: undefined }));
  ok(poor.contextPanel.response === "deutlich verbessert", "gutes Ansprechen wird weiterhin als positiv ausgewiesen");
  ok(poor.domains.therapyControl < 45, "… bei gleichzeitig schwacher Kontrolle: " + poor.domains.therapyControl);
  ok(poor.dataGaps.some(function (g) { return g.id === "trt_labs"; }), "fehlende Verlaufskontrolle erscheint als Datenlücke");
  ok(poor.goalRecommendation.mode === "health_first", "unbegleitete Therapie ohne Werte ⇒ HEALTH FIRST");
  ok(good.total > poor.total, "Unterschied entsteht durch KONTROLLE, nicht durch den Status (" + good.total + " vs " + poor.total + ")");
})();

/* ===================================================================== 8 */
group("CASE 6+7 · ENHANCED: Status kostet nie Punkte, fehlende Kontrolle schon");
(function () {
  var natural = C.evaluate(mk({ perf_status: "natural" }));
  var monitored = C.evaluate(mk({ perf_status: "enhanced", enh_context: "cruise",
    enh_categories: ["testosterone"], enh_signals: ["keine"], enh_bp_routine: "regelmaessig",
    enh_hematology: "aktuell" }));
  var uncontrolled = C.evaluate(mk({ perf_status: "enhanced", enh_context: "blast",
    enh_categories: ["testosterone", "oral"], enh_signals: ["keine"], enh_bp_routine: "nie",
    enh_hematology: "nein", enh_liver: "nein", blood_bp: "nein", lab_recency: "gt12m", lab_known: undefined }));

  ok(Math.abs(natural.total - monitored.total) <= 5,
    "identischer Lifestyle: NATURAL " + natural.total + " vs. gut kontrolliert ENHANCED " + monitored.total + " ⇒ kein Status-Malus");
  ok(monitored.domains.enhancedControl >= 78, "gute Kontrolle ⇒ hoher Enhanced-Control-Wert: " + monitored.domains.enhancedControl);
  ok(monitored.primaryBottleneck.domain !== "enhancedControl", "gut kontrolliert ⇒ Kontrolle ist NICHT der Engpass");

  ok(uncontrolled.domains.training >= 80 && uncontrolled.domains.sleep >= 80,
    "hohe Performance-Domains bleiben hoch (Training " + uncontrolled.domains.training + ")");
  ok(["enhancedControl", "cardiovascular", "dataQuality"].indexOf(uncontrolled.primaryBottleneck.domain) >= 0,
    "schlechte Kontrolle ⇒ Engpass = Kontrolle/Daten/Herz-Kreislauf: " + uncontrolled.primaryBottleneck.domain);
  ok(uncontrolled.total < monitored.total, "der Unterschied kommt aus der Kontrolle: " + uncontrolled.total + " < " + monitored.total);
  ok(uncontrolled.contextPanel.title === "ENHANCED CONTROL", "Enhanced bekommt das Control-Panel");
  ok(/Kontroll/i.test(uncontrolled.contextPanel.lines.join(" ")), "Panel spricht über Kontrollqualität, nicht über Schuld");
})();

/* ===================================================================== 9 */
group("CASE 8 · FORMER ENHANCED + Symptome ohne Nachkontrolle ⇒ Status unklar");
(function () {
  var ev = C.evaluate(mk({ perf_status: "former_enhanced", fe_last_use: "3to6m", fe_duration: "1to3y",
    fe_changes: ["libido", "energie"], fe_followup: "nein", drv_libido: "niedrig", drv_energy: "muede" }));
  ok(ev.contextPanel.title === "RÜCKKEHR-STATUS", "eigener Panel-Typ für frühere Anwendung");
  ok(ev.contextPanel.unclear === true && /UNKLAR/.test(ev.contextPanel.verdict), "Ergebnis: RÜCKKEHR-STATUS UNKLAR");
  ok(ev.dataGaps.some(function (g) { return g.id === "former_followup"; }), "fehlende Nachkontrolle ist eine Datenlücke");
  ok(!/Testosteronmangel|Diagnose|du hast/i.test(ev.contextPanel.verdict), "keine Diagnose im Verdict");
  var late = C.evaluate(mk({ perf_status: "former_enhanced", fe_last_use: "gt12m", fe_duration: "lt3m",
    fe_changes: ["libido"], fe_followup: "nein", drv_libido: "niedrig" }));
  ok(late.contextPanel.unclear === true, "auch nach >12 Monaten gilt Zeit allein NICHT als Beleg für Erholung");
})();

/* ==================================================================== 10 */
group("CASE 9 · Unbekannte Labore sind eine LÜCKE, nicht „normal“");
(function () {
  var known = C.evaluate(mk({ perf_status: "natural" }));
  var unknown = C.evaluate(mk({ perf_status: "natural", lab_recency: "nie", lab_known: undefined,
    blood_bp: "nein", blood_baseline: "nie", met_glucose: "nie", waist: "" }));
  ok(unknown.dataGaps.length > known.dataGaps.length, "fehlende Daten erzeugen mehr Lücken (" + unknown.dataGaps.length + " vs " + known.dataGaps.length + ")");
  ok(unknown.dataGaps.some(function (g) { return g.id === "labs_none"; }), "„nie gemessen“ ⇒ explizite Lücke labs_none");
  ok(unknown.confidence.level !== "HIGH", "Aussagesicherheit sinkt: " + unknown.confidence.level);
  ok(unknown.dataGaps.every(function (g) { return !!g.why; }), "jede Lücke erklärt, warum sie zählt");
  ok(known.confidence.level === "HIGH" && unknown.total !== null, "Score und Confidence sind getrennte Größen");
})();

/* ==================================================================== 11 */
group("CASE 10 · HEALTH FIRST geht vor Physique-Optimierung");
(function () {
  var ev = C.evaluate(mk({ perf_status: "natural", redflags: ["brust"], goal_main: ["muskeln"] }));
  ok(ev.goalRecommendation.mode === "health_first", "harte Warnzeichen ⇒ HEALTH FIRST: " + ev.goalRecommendation.mode);
  ok(ev.goalRecommendation.trainingMode !== "health_first", "die Körperrichtung bleibt parallel erhalten (Programm läuft weiter)");
  ok(/Reihenfolge/i.test(ev.goalRecommendation.reason), "Botschaft ist Reihenfolge, nicht „du bist krank“");
  var bp = C.evaluate(mk({ perf_status: "natural", cv_bp_control: "unbehandelt", blood_bp: "kontrolliert" }));
  ok(bp.goalRecommendation.mode === "health_first", "unbehandelt erhöhter Blutdruck ⇒ HEALTH FIRST");
  ok(bp.primaryBottleneck.domain === "cardiovascular", "… und der Engpass ist der kardiovaskuläre Kontext");
  ok(C.modeLabels.health_first && /HEALTH FIRST/.test(C.modeLabels.health_first.label), "HEALTH FIRST ist ein echter Modus mit Label");
})();

/* ==================================================================== 12 */
group("CASE 11 · Gleicher Score, anderer Kontext ⇒ andere Interpretation");
(function () {
  var natural = C.evaluate(mk({ perf_status: "natural", rec_duration: "lt5", rec_wake: "geraedert",
    rec_night: "3plus", rec_caffeine: "abends", rec_stress: 9 }));
  var enhanced = C.evaluate(mk({ perf_status: "enhanced", enh_context: "blast",
    enh_categories: ["testosterone", "oral"], enh_signals: ["keine"], enh_bp_routine: "nie",
    enh_hematology: "nein", enh_liver: "nein", blood_bp: "nein" }));
  ok(natural.primaryBottleneck.domain !== enhanced.primaryBottleneck.domain,
    "unterschiedliche Engpässe: " + natural.primaryBottleneck.domain + " vs. " + enhanced.primaryBottleneck.domain);
  ok(natural.contextPanel.title !== enhanced.contextPanel.title, "unterschiedliche Kontext-Panels");
  ok(JSON.stringify(natural.deepLinks) !== JSON.stringify(enhanced.deepLinks), "unterschiedliche nächste Wege");
})();

/* ==================================================================== 13 */
group("CASE 12 · Unsicherer Status ⇒ Score funktioniert, ohne Zwangseinordnung");
(function () {
  var ev = C.evaluate(mk({ perf_status: "uncertain", unc_context: "prescribed_unclear" }));
  ok(typeof ev.total === "number" && ev.total > 0, "Score wird berechnet: " + ev.total);
  ok(ev.status === "uncertain", "Status bleibt „uncertain“ — keine automatische Zuordnung");
  ok(ev.contextPanel.band === "neutral", "neutrale Einordnung statt Bewertung");
  ok(!ev.domains.enhancedControl && !ev.domains.therapyControl, "keine Kontext-Domain wird unterstellt");
})();

/* ==================================================================== 14 */
group("Domänen-Architektur · kein linearer Gesamttopf, kein Doppelzählen");
(function () {
  ok(C.domainKeys.length >= 10, C.domainKeys.length + " Kern-Domains statt einer Summe");
  var seen = {};
  var dup = [];
  C.allSteps.forEach(function (s) {
    var d = C.domainOf(s.q);
    if (!d) return;
    if (seen[s.q.id]) dup.push(s.q.id);
    seen[s.q.id] = d;
  });
  ok(!dup.length, "jede Frage zahlt auf GENAU EINE Domain ein (keine Mehrfachzählung)");
  ok(C.MODIFIERS.length <= 3 && C.MODIFIERS.every(function (m) {
    return Object.keys(m.apply).every(function (k) { return Math.abs(m.apply[k]) <= 8; });
  }), "Kontextmodifikatoren sind wenige und klein (max ±8), statt fünffacher Strafe");
  var ev = C.evaluate(mk({ perf_status: "natural" }));
  ok(Object.keys(ev.domains).every(function (d) { return ev.domains[d] >= 0 && ev.domains[d] <= 100; }), "alle Domains liegen in 0..100");
  ok(ev.scores && typeof ev.scores.body === "number" && typeof ev.scores.execution === "number",
    "die 7 historischen Bereiche werden weiterhin abgeleitet (Radar/Report/Programm)");
})();

/* ==================================================================== 15 */
group("Bottleneck-Engine · Priorität statt „niedrigster Wert“");
(function () {
  var a = mk({ perf_status: "natural", str_freq: "0", str_plan: "nein", str_log: "nein",
    str_exercises: ["keine"], str_limit: "kein_plan", str_values: "nein", history: "nie",
    cv_bp_control: "unbehandelt" });
  var ev = C.evaluate(a);
  ok(ev.domains.training < 40, "Training ist zahlenmäßig der schwächste Bereich: " + ev.domains.training);
  ok(ev.primaryBottleneck.domain === "cardiovascular",
    "trotzdem gewinnt der unkontrollierte Blutdruck die Priorität: " + ev.primaryBottleneck.domain);
  ok(ev.primaryBottleneck.forced === true, "die Vorrangregel wird als solche ausgewiesen");
  ok((ev.secondaryPriorities || []).length >= 1, "sekundäre Prioritäten werden benannt");
  ok(!!C.LEGACY_DOMAIN_KEY[ev.primaryBottleneck.domain], "Engpass mappt auf einen Bestands-Schlüssel (Programm-Kompatibilität)");
})();

/* ==================================================================== 16 */
group("Medizinische Sicherheit · keine Diagnosen, keine Dosierungen, keine Gegenmittel");
(function () {
  var corpus = fs.readFileSync(path.join(ROOT, "js/check-data.js"), "utf8") +
    fs.readFileSync(path.join(ROOT, "js/check.js"), "utf8");
  ok(!/\b\d+\s?mg\b/i.test(corpus), "nirgends eine Milligramm-Angabe (keine Dosierungslogik)");
  ok(!/\bPCT\b|Post[- ]Cycle|Absetzprotokoll/.test(corpus), "keine PCT-/Absetzprotokoll-Logik");
  ok(!/Aromatasehemmer|Anastrozol|Tamoxifen|Clomifen|hCG\b/i.test(corpus), "keine Gegenmittel-/Präparatnamen");
  ok(!/(nimm|dosiere|reduziere auf|steigere auf|erh(ö|oe)he auf)[^.]{0,40}\d+\s?(mg|ml|IE)\b/i.test(corpus), "keine Handlungsanweisung zu Substanzmengen");

  var ev = C.evaluate(mk({ perf_status: "enhanced", enh_categories: ["testosterone", "oral", "gh"],
    enh_signals: ["libido", "bp", "akne"], enh_bp_routine: "nie", enh_hematology: "nein", enh_liver: "nein" }));
  var out = JSON.stringify(ev);
  ok(!/empfehlen wir.*(Substanz|Wirkstoff)|setze .* ab|f(ü|ue)ge .* hinzu/i.test(out), "Ergebnis empfiehlt keine Substanzänderung");
  ok(/(ärztlich|Arzt)/i.test(out), "Ergebnis verweist stattdessen auf ärztliche Einordnung");
  ok(C.redFlags(mk({ perf_status: "enhanced", enh_signals: ["atemnot"] })).length >= 1, "harte Warnzeichen werden als Red Flag geführt");
})();

/* ==================================================================== 17 */
group("Rückwärtskompatibilität · alte Ergebnisse laden ohne Crash und ohne Umdeutung");
(function () {
  var legacy = { total: 58, scores: { body: 50, strength: 60, fuel: 44, recovery: 40, blood: 38, drive: 52, execution: 61 },
    bottleneck: { key: "blood", name: "Datenbasis & Blutwerte" }, plan: "recomp",
    answers: { age: 41, height: 182, weight: 90, waist: 98, steps: "4to7", job: "sitzend",
      goal_main: ["bauchfett"], body_type: "normal_bauch", str_freq: "2", rec_duration: "6to7" } };
  var ev = C.evaluate(legacy.answers);
  ok(ev.status === "unknown", "fehlender Status wird als „unknown“ geführt — NICHT als natural");
  ok(ev.confidence.level === "LIMITED", "Legacy-Ergebnis wird bewusst vorsichtig eingeordnet");
  ok(ev.contextPanel.key === "unknown" && /früheren Score-Version/.test(ev.contextPanel.lines.join(" ")),
    "das Panel benennt die alte Score-Version ehrlich");
  ok(typeof ev.total === "number" && ev.total >= 0 && ev.total <= 100, "Score bleibt berechenbar: " + ev.total);
  ok(!!ev.primaryBottleneck.name, "auch alte Antworten bekommen einen Engpass");
  ok(C.evaluate({}).total >= 0, "komplett leere Antworten crashen nicht");
  ok(C.statusOf({ perf_status: "irgendwas" }) === "unknown", "unbekannte Statuswerte fallen sicher auf „unknown“ zurück");
})();

/* ==================================================================== 18 */
group("Ergebnis-Vollständigkeit · jeder Nutzer bekommt Engpass, Lücken, Weg");
(function () {
  ["natural", "former_enhanced", "medical_trt", "enhanced", "uncertain"].forEach(function (st) {
    var ev = C.evaluate(mk({ perf_status: st, enh_categories: ["testosterone"], fe_last_use: "6to12m", trt_followup: "3to6m" }));
    ok(!!ev.primaryBottleneck.name, st + ": primärer Engpass benannt");
    ok(Array.isArray(ev.dataGaps), st + ": Datenlücken-Liste vorhanden");
    ok(!!ev.goalRecommendation.label, st + ": Zielrichtung vorhanden (" + ev.goalRecommendation.label + ")");
    ok(!!ev.confidence.level, st + ": Aussagesicherheit vorhanden (" + ev.confidence.level + ")");
    ok(ev.deepLinks.length >= 1 && ev.deepLinks.length <= 3, st + ": 1–3 gezielte Vertiefungen (kein Link-Spam)");
    ok(C.orderOfOperations(ev).length >= 4, st + ": klare Reihenfolge (messen → Engpass → ausrichten → neu bewerten)");
  });
})();

/* ==================================================================== 19 */
group("Zielrichtung · alle Modi erreichbar, Zielwunsch allein entscheidet nicht");
(function () {
  var modes = {};
  [
    mk({ perf_status: "natural", goal_main: ["muskeln"], waist: 82, weight: 76, body_type: "skinny" }),
    mk({ perf_status: "natural", goal_main: ["muskeln"], waist: 112, weight: 108, body_type: "uebergewicht" }),
    mk({ perf_status: "natural", goal_main: ["muskeln"], goal_pain: "bauch", waist: 97, weight: 88, body_type: "normal_bauch" }),
    mk({ perf_status: "natural", goal_main: ["energie"], waist: 80, weight: 76, body_type: "skinny" }),
    mk({ perf_status: "natural", redflags: ["brust"] })
  ].forEach(function (a) { modes[C.goalDecision(a).mode] = true; });
  ok(modes.build && modes.cut && modes.recomp && modes.perform && modes.health_first,
    "CUT, RECOMP, BUILD, PERFORM und HEALTH FIRST sind alle deterministisch erreichbar");
  var wish = C.goalDecision(mk({ perf_status: "natural", goal_main: ["muskeln"], goal_pain: "bauch",
    waist: 104, weight: 98, body_type: "stark_fett" }));
  ok(wish.mode === "cut", "Wunsch „Muskeln aufbauen“ kippt nicht die Körperrealität: " + wish.mode);
  ok(C.trainingModeOf(mk({ perf_status: "natural", redflags: ["brust"] })) !== "health_first",
    "trainingModeOf liefert immer eine nutzbare Trainingsrichtung");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
