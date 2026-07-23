/* ==========================================================================
   MALEMETRIX INTELLIGENCE — KNOWLEDGE GRAPH  (MM.intelligence.knowledge)
   --------------------------------------------------------------------------
   Strukturierte, versionierte Wissensobjekte statt loser Texte. Jede wichtige
   Aussage ist ein CLAIM mit Evidenzlage — klinische Evidenz, Physiologie und
   Real-World-Praxis werden bewusst GETRENNT (§28). Keine erfundenen Quellen:
   wo keine belastbare Quellen-Metadatenlage vorliegt, steht sie als
   `unresolved` markiert (§29) — nie vorgetäuschte Vollständigkeit.

   Evidenztypen (§27):  STRONG | MODERATE | EMERGING | REAL_WORLD_LIMITED |
                        MECHANISTIC | EXPERIMENTAL
   Retrieval (§31/32):  Frage + Nutzerkontext → gerankte Objekte
                        (Relevanz × Pathway × Goal × Bottleneck × Frische).
   Staleness (§34/260): reviewedAt älter als staleDays ⇒ NEEDS_REVIEW,
                        Confidence wird beim Retrieval herabgestuft.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var I = MM.intelligence = MM.intelligence || {};

  var KV = 3;                 // Knowledge-Graph-Version (Phase 9.6: weitere Quellen aufgelöst; Snapshots referenzieren die Version zum Entscheidungszeitpunkt, §30)
  var STALE_DAYS = 365;
  var REVIEWED = "2026-07-23"; // Redaktionsstand dieses Builds

  function K(o) {
    return Object.assign({ version: KV, reviewedAt: REVIEWED, audience: "all", pathways: [], goals: [], markers: [], interventions: [], contraContext: [], related: [], sources: [{ ref: "unresolved", note: "Quellen-Metadaten noch nicht kuratiert — Aussagen konservativ formuliert." }], contentLocation: null }, o);
  }
  function C(id, statement, evidence, opts) {
    return Object.assign({ claim_id: id, statement: statement, evidence_type: evidence, confidence: evidence === "STRONG" ? "high" : evidence === "MODERATE" ? "medium" : "low", reviewed_at: REVIEWED, context: "", limitations: "", source_ids: ["unresolved"] }, opts || {});
  }

  /* ======================= QUELLEN-REGISTER (§27/§28/§65) =======================
     Nur real verifizierte Landmark-Quellen (Web-Recherche, Phase 9). Jede trägt
     canonical URL + ggf. DOI. UNRESOLVED bleibt UNRESOLVED — nie erfunden.
     source_type: GUIDELINE | CONSENSUS | META_ANALYSIS | RCT | COHORT | POSITION_STAND */
  var SOURCES = {
    morton_2018: { title: "A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults", authors: "Morton RW, et al.", year: 2018, venue: "Br J Sports Med 52(6):376–384", doi: "10.1136/bjsports-2017-097608", url: "https://bjsm.bmj.com/content/52/6/376", source_type: "META_ANALYSIS", last_reviewed: REVIEWED },
    kreider_2017: { title: "ISSN position stand: safety and efficacy of creatine supplementation in exercise, sport, and medicine", authors: "Kreider RB, et al.", year: 2017, venue: "J Int Soc Sports Nutr 14:18", doi: "10.1186/s12970-017-0173-z", url: "https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0173-z", source_type: "POSITION_STAND", last_reviewed: REVIEWED },
    esc_eas_2019: { title: "2019 ESC/EAS Guidelines for the management of dyslipidaemias", authors: "Mach F, et al.", year: 2020, venue: "Eur Heart J 41(1):111–188", doi: "10.1093/eurheartj/ehz455", url: "https://academic.oup.com/eurheartj/article/41/1/111/5556353", source_type: "GUIDELINE", last_reviewed: REVIEWED },
    step1_2021: { title: "Once-Weekly Semaglutide in Adults with Overweight or Obesity (STEP 1)", authors: "Wilding JPH, et al.", year: 2021, venue: "N Engl J Med 384:989–1002", doi: "10.1056/NEJMoa2032183", url: "https://www.nejm.org/doi/full/10.1056/NEJMoa2032183", source_type: "RCT", last_reviewed: REVIEWED },
    bhasin_2018: { title: "Testosterone Therapy in Men With Hypogonadism: An Endocrine Society Clinical Practice Guideline", authors: "Bhasin S, et al.", year: 2018, venue: "J Clin Endocrinol Metab 103(5):1715–1744", doi: "10.1210/jc.2018-00229", url: "https://academic.oup.com/jcem/article/103/5/1715/4939465", source_type: "GUIDELINE", last_reviewed: REVIEWED },
    schoenfeld_2017: { title: "Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis", authors: "Schoenfeld BJ, Ogborn D, Krieger JW", year: 2017, venue: "J Sports Sci 35(11):1073–1082", doi: "10.1080/02640414.2016.1210197", url: "https://www.tandfonline.com/doi/full/10.1080/02640414.2016.1210197", source_type: "META_ANALYSIS", last_reviewed: REVIEWED },
    watson_2015: { title: "Recommended Amount of Sleep for a Healthy Adult: A Joint Consensus Statement of the AASM and Sleep Research Society", authors: "Watson NF, et al.", year: 2015, venue: "J Clin Sleep Med 11(6):591–592", doi: "10.5664/jcsm.4758", url: "https://jcsm.aasm.org/doi/10.5664/jcsm.4758", source_type: "CONSENSUS", last_reviewed: REVIEWED }
  };
  function source(id) { return SOURCES[id] || null; }
  // Evidenz-Publikations-Gate (§29): ein Objekt ist nur PUBLISHED, wenn seine
  // Kern-Claims mindestens eine AUFGELÖSTE Quelle tragen; sonst REVIEWED (intern
  // nutzbar) oder STALE. UNRESOLVED darf NIE als "PUBLISHED"/autoritativ gelten.
  function claimSources(cl) { return (cl.source_ids || []).filter(function (s) { return s !== "unresolved" && SOURCES[s]; }); }
  function pubState(o) {
    if (isStale(o)) return "STALE";
    var cls = o.claims || [];
    var withSrc = cls.filter(function (c) { return claimSources(c).length; }).length;
    if (withSrc === 0) return "REVIEWED";          // kuratiert, aber (noch) ohne aufgelöste Quelle
    if (withSrc === cls.length) return "PUBLISHED"; // alle Kern-Claims belegt
    return "REVIEWED";                              // teilweise belegt: intern ok, öffentlich vorsichtig
  }
  // Öffentliche Zitate NUR aus aufgelösten Quellen — nie "unresolved" rendern.
  function citations(o) {
    var seen = {}, out = [];
    (o.claims || []).forEach(function (c) { claimSources(c).forEach(function (sid) { if (!seen[sid]) { seen[sid] = 1; out.push(SOURCES[sid]); } }); });
    return out;
  }

  /* ======================= INITIALBESTAND (§30) ======================= */
  var OBJECTS = [
    K({ id: "protein_target", slug: "protein", title: "Proteinzufuhr für Muskelaufbau & Diät", domain: "nutrition", summary: "1,6–2,2 g/kg/Tag deckt für die meisten Trainierenden den Bedarf; im Defizit eher oberes Ende. Verteilung ist zweitrangig gegenüber Tagessumme.", goals: ["build", "cut", "recomp", "perform"], interventions: ["protein_floor"], claims: [
      C("prot1", "1,6–2,2 g Protein/kg/Tag maximiert Muskelproteinsynthese für die meisten Trainierenden.", "STRONG", { source_ids: ["morton_2018"], context: "Morton 2018 (49 RCTs, 1863 Teilnehmer): Dosis-Wirkung plateauisiert nahe 1,62 g/kg/Tag." }),
      C("prot2", "Im Kaloriendefizit schützt eine höhere Zufuhr (~2,2 g/kg) Muskelmasse.", "MODERATE", { source_ids: ["morton_2018"] }),
      C("prot3", "Mahlzeiten-Timing ist gegenüber der Tagessumme nachrangig.", "MODERATE", { source_ids: ["morton_2018"], limitations: "Randfälle: sehr lange Fastenfenster, sehr niedrige Mahlzeitenfrequenz." })
    ], related: ["energy_balance", "creatine"] }),
    K({ id: "energy_balance", slug: "energie", title: "Energiebilanz & Gewichtstrend", domain: "nutrition", summary: "Der rollende Wochentrend zählt — Einzelmessungen sind Rauschen (Wasser, Glykogen, Natrium, Darminhalt). Anpassungen erst nach 2+ Wochen konsistenter Daten.", goals: ["build", "cut", "recomp"], claims: [
      C("en1", "Tagesgewicht schwankt durch Wasser/Glykogen um bis zu ±1–2 kg unabhängig von Fettmasse.", "STRONG"),
      C("en2", "Ein Überschuss von ~150–250 kcal reicht für nahezu maximalen Aufbau bei minimalem Fettzuwachs (fortgeschrittene Trainierende).", "MODERATE"),
      C("en3", "Adaptive Thermogenese verlangsamt Diätfortschritt — Plateaus nach Wochen sind erwartbar, kein Versagen.", "MODERATE")
    ], related: ["protein_target", "plateau"] }),
    K({ id: "plateau", slug: "plateau", title: "Plateaus: echt vs. scheinbar", domain: "training", summary: "Die meisten 'Plateaus' sind Messrauschen, Adhärenzlücken oder Erholungsdefizite — kein Programmversagen. Erst Datenlage prüfen, dann EINE Variable ändern.", goals: ["build", "cut", "recomp"], claims: [
      C("pl1", "3+ Wochen flacher Trend bei hoher Adhärenz und ausreichender Datenlage ist ein echtes Signal.", "REAL_WORLD_LIMITED"),
      C("pl2", "Bei <70 % Umsetzung ist der Plan selten das Problem (Execution First).", "REAL_WORLD_LIMITED")
    ], related: ["energy_balance", "recovery_sleep"] }),
    K({ id: "hypertrophy_volume", slug: "volumen", title: "Trainingsvolumen & Hypertrophie", domain: "training", summary: "~10–20 harte Sätze pro Muskel/Woche decken die meisten ab; Progression + Nähe zum Muskelversagen (RIR 0–3) sind die Treiber. Mehr Volumen ohne Erholung baut nichts auf.", goals: ["build", "recomp"], claims: [
      C("hv1", "Hypertrophie steigt mit Volumen bis zu einem individuellen Erholungslimit (Dosis-Wirkungs-Kurve mit Plateau).", "STRONG", { source_ids: ["schoenfeld_2017"], context: "Schoenfeld 2017 (Meta-Analyse, 15 Studien): graded Dosis-Wirkung, Schwelle ~10 harte Sätze/Muskel/Woche für nahezu maximale Hypertrophie." }),
      C("hv2", "Sätze nahe am Versagen (RIR 0–3) sind effektiver als weit entfernte.", "MODERATE"),
      C("hv3", "Double Progression (erst Wdh., dann Last) ist eine robuste Real-World-Progressionsregel.", "REAL_WORLD_LIMITED")
    ], related: ["recovery_sleep", "plateau"] }),
    K({ id: "creatine", slug: "kreatin", title: "Kreatin Monohydrat", domain: "stack", summary: "Bestbelegtes Supplement für Kraft/Muskelmasse. 3–5 g täglich, Timing egal. Erhöht Kreatinin im Blut OHNE Nierenschaden — Kontext für Laborwerte.", markers: ["creatinine", "cystatin_c"], interventions: ["creatine_daily"], claims: [
      C("cr1", "Kreatin erhöht Kraft- und Muskelaufbau messbar gegenüber Placebo.", "STRONG", { source_ids: ["kreider_2017"], context: "ISSN Position Stand: wirksamstes ergogenes Supplement für Hochintensität + fettfreie Masse." }),
      C("cr2", "Kreatin erhöht Serum-Kreatinin ohne echte Nierenfunktionsverschlechterung — Cystatin C bleibt dabei normal.", "STRONG", { source_ids: ["kreider_2017"], context: "Wichtig für Lab-Interpretation: hohes Kreatinin + normales Cystatin C unter Kreatin ist erwartbar." }),
      C("cr3", "Bei gesunden Nieren ist Langzeit-Einnahme (3–5 g) nicht nephrotoxisch.", "MODERATE", { source_ids: ["kreider_2017"], limitations: "Vorbestehende Nierenerkrankung: ärztlich abklären. ISSN: bis 30 g/Tag über 5 Jahre in Studien gut verträglich." })
    ], related: ["kidney_markers"] }),
    K({ id: "omega3", slug: "omega-3", title: "Omega-3 (EPA/DHA)", domain: "stack", summary: "Kardiometabolische Basis, besonders bei wenig Fischkonsum. Triglycerid-senkend in relevanter Dosis.", markers: ["triglycerides"], claims: [
      C("o31", "EPA/DHA senken Triglyceride dosisabhängig.", "STRONG", { source_ids: ["esc_eas_2019"], context: "2019 ESC/EAS: Omega-3 in relevanter Dosis als triglyceridsenkende Option." }),
      C("o32", "Harte Endpunkt-Effekte (Ereignisse) sind gemischt belegt — Basis, kein Wundermittel.", "MODERATE")
    ] }),
    K({ id: "recovery_sleep", slug: "schlaf", title: "Schlaf & Trainingserholung", domain: "recovery", summary: "Unter ~6,5 h chronisch: schlechtere Kraftentwicklung, Appetitregulation und Glukosetoleranz. Konstante Bettzeit schlägt Einzeloptimierungen.", goals: ["build", "cut", "recomp", "perform"], interventions: ["sleep_window", "caffeine_cutoff"], claims: [
      C("sl1", "Chronischer Schlafmangel reduziert Muskelproteinsynthese und Trainingsleistung.", "STRONG", { source_ids: ["watson_2015"], context: "AASM/SRS-Konsens (Watson 2015): ≥7 h/Nacht für Gesundheit nötig; ≤6 h reichen nicht — Basis für die Schlaf-Guardrail." }),
      C("sl2", "Schlafrestriktion verschiebt Gewichtsverlust von Fett zu fettfreier Masse.", "MODERATE"),
      C("sl3", "Koffein nach ~14 Uhr verschlechtert bei sensiblen Personen messbar die Schlafarchitektur.", "MODERATE")
    ], related: ["plateau", "hypertrophy_volume"] }),
    K({ id: "testosterone_basics", slug: "testosteron", title: "Testosteron-Grundlagen", domain: "hormonal", summary: "Schlaf, Körperfett, Energieverfügbarkeit und Krafttraining sind die größten natürlichen Hebel. Einzelwerte schwanken stark tageszeitabhängig — morgens, nüchtern, wiederholt messen.", markers: ["total_testosterone", "free_testosterone", "lh", "shbg"], claims: [
      C("t1", "Testosteron ist morgens am höchsten; Messungen außerhalb des Morgens sind schwer interpretierbar.", "STRONG", { source_ids: ["bhasin_2018"], context: "Endocrine-Society-Leitlinie: Diagnose nur bei Symptomen UND wiederholt eindeutig niedrigem Morgen-Testosteron." }),
      C("t2", "Massives Kaloriendefizit und Schlafmangel senken Testosteron reversibel.", "MODERATE"),
      C("t3", "Ein einzelner niedrig-normaler Wert ist keine Diagnose — Wiederholung + LH/SHBG-Kontext nötig.", "STRONG")
    ], related: ["trt_context", "recovery_sleep"] }),
    K({ id: "trt_context", slug: "trt", title: "TRT — Kontext statt Hype", domain: "hormonal", audience: "advanced", pathways: ["enhanced", "performance"], summary: "TRT ist Therapie eines diagnostizierten Mangels, kein Lifestyle-Upgrade. Unter TRT/Enhanced sind Hämatokrit, Lipide, Blutdruck und Fertilität die Monitoring-Kernachsen.", markers: ["total_testosterone", "hematocrit", "estradiol", "psa"], contraContext: ["kinderwunsch_ohne_beratung"], claims: [
      C("trt1", "Exogenes Testosteron supprimiert die eigene Achse (LH/FSH) und die Spermatogenese.", "STRONG", { source_ids: ["bhasin_2018"] }),
      C("trt2", "Hämatokrit-Anstieg ist unter TRT häufig und monitoringpflichtig.", "STRONG", { source_ids: ["bhasin_2018"], context: "Endocrine-Society-Leitlinie: Hämatokrit vor Beginn sowie 3–6 und 12 Monate danach kontrollieren." }),
      C("trt3", "Fertilität erholt sich nach Absetzen oft, aber langsam und nicht garantiert.", "MODERATE", { limitations: "Individuell hochvariabel; Kinderwunsch VOR Beginn planen." })
    ], related: ["hematocrit_ctx", "enhanced_monitoring"] }),
    K({ id: "glp1_context", slug: "glp1", title: "GLP-1-Agonisten im Performance-Kontext", domain: "metabolic", audience: "advanced", summary: "Starke Gewichtsreduktion, aber relevanter Anteil fettfreier Masse geht ohne Krafttraining + Protein verloren. Ruhepuls-Anstieg ist dokumentiert.", markers: ["hba1c", "fasting_glucose"], claims: [
      C("g1", "GLP-1-Agonisten erzeugen klinisch relevante Gewichtsverluste.", "STRONG", { source_ids: ["step1_2021"], context: "STEP 1 (Wilding 2021, NEJM): Semaglutid 2,4 mg + Lifestyle → ~14,9 % mittlerer Gewichtsverlust über 68 Wochen." }),
      C("g2", "Ohne Widerstandstraining/Protein ist der Anteil fettfreier Masse am Verlust erheblich (~25–40 %).", "MODERATE"),
      C("g3", "Ruhepuls steigt unter GLP-1-Agonisten im Mittel messbar an.", "MODERATE")
    ], related: ["protein_target", "hypertrophy_volume"] }),
    K({ id: "apob_lipids", slug: "apob", title: "ApoB & Lipide", domain: "cardiovascular", markers: ["apo_b", "ldl_c", "hdl_c", "triglycerides"], summary: "ApoB zählt atherogene Partikel und ist dem LDL-C als Risikomarker überlegen — besonders bei hohen Triglyceriden oder metabolischem Syndrom. Dein LDL ist nicht die ganze Geschichte.", claims: [
      C("ab1", "ApoB ist ein besserer Prädiktor atherosklerotischen Risikos als LDL-C allein.", "STRONG", { source_ids: ["esc_eas_2019"], context: "2019 ESC/EAS: ApoB als Risiko-verfeinernder Marker, v. a. bei hohen Triglyceriden/metabolischem Syndrom." }),
      C("ab2", "Diskordanz (normales LDL-C, hohes ApoB) identifiziert übersehenes Risiko.", "STRONG", { source_ids: ["esc_eas_2019"] }),
      C("ab3", "Anabolika verschlechtern das Lipidprofil (HDL ↓, ApoB ↑) teils drastisch und reversibel.", "MODERATE", { context: "Enhanced-Monitoring." })
    ], related: ["enhanced_monitoring"] }),
    K({ id: "glucose_hba1c", slug: "hba1c", title: "Glukose & HbA1c", domain: "metabolic", markers: ["hba1c", "fasting_glucose"], summary: "HbA1c bildet ~3 Monate ab; Nüchternglukose ist tagesformabhängig. Krafttraining + Alltagsbewegung sind die stärksten nicht-medikamentösen Hebel der Glukosetoleranz.", claims: [
      C("gl1", "HbA1c integriert die Glukoselage über ~8–12 Wochen.", "STRONG"),
      C("gl2", "Muskelmasse und Training verbessern Insulinsensitivität unabhängig vom Gewicht.", "STRONG")
    ] }),
    K({ id: "kidney_markers", slug: "niere", title: "Nierenmarker richtig lesen", domain: "renal", markers: ["creatinine", "cystatin_c", "egfr"], summary: "Kreatinin hängt an Muskelmasse und Kreatin-Einnahme — bei muskulösen Männern chronisch 'zu hoch'. Cystatin C ist der muskelunabhängige Gegencheck.", claims: [
      C("kd1", "Kreatinin-basierte eGFR unterschätzt die Nierenfunktion muskulöser Personen systematisch.", "STRONG"),
      C("kd2", "Cystatin C ist von Muskelmasse weitgehend unabhängig.", "STRONG")
    ], related: ["creatine"] }),
    K({ id: "liver_markers", slug: "leber", title: "Lebermarker & Training", domain: "hepatic", markers: ["alt", "ast", "ggt", "ck"], summary: "Hartes Training erhöht ALT/AST/CK transient — 48–72 h Trainingspause vor Blutabnahme verhindert Fehlalarme. GGT ist der trainingsunabhängigere Kontextmarker.", claims: [
      C("lv1", "Intensives Krafttraining kann Transaminasen tagelang unspezifisch erhöhen.", "STRONG"),
      C("lv2", "Orale 17-alpha-alkylierte Substanzen sind ausgeprägt hepatotoxisch.", "STRONG", { context: "Enhanced-Aufklärung, keine Anwendungsempfehlung." })
    ] }),
    K({ id: "hematocrit_ctx", slug: "haematokrit", title: "Hämatokrit unter Enhanced/TRT", domain: "hematology", pathways: ["enhanced"], markers: ["hematocrit", "hemoglobin"], summary: "Steigender Hämatokrit ist unter exogenem Testosteron erwartbar und die häufigste monitoringpflichtige Veränderung — zusammen mit Blutdruck und Hydration einordnen, ärztlich begleiten.", claims: [
      C("h1", "Exogenes Testosteron stimuliert die Erythropoese dosisabhängig.", "STRONG"),
      C("h2", "Sehr hohe Hämatokritwerte erhöhen die Blutviskosität — Monitoring-Priorität.", "MECHANISTIC", { limitations: "Harte Ereignis-Schwellen sind individuell/ärztlich zu bewerten — MaleMetrix setzt keine Behandlungsgrenzen." })
    ], related: ["trt_context", "enhanced_monitoring"] }),
    K({ id: "enhanced_monitoring", slug: "enhanced-monitoring", title: "Enhanced-Monitoring-Landkarte", domain: "enhanced", audience: "advanced", pathways: ["enhanced"], markers: ["apo_b", "hematocrit", "alt", "estradiol", "psa"], summary: "Wer Enhanced fährt, betreibt ein dauerhaftes Gesundheitsprojekt: Lipide/ApoB, Hämatokrit, Blutdruck, Leber, Hormonachse, Fertilität. Real-World-Praxis ohne Monitoring ist Blindflug.", claims: [
      C("em1", "Die kardiovaskuläre Last (Lipide, Blutdruck, Hämatokrit) ist der dominante Langzeit-Trade-off.", "MODERATE"),
      C("em2", "Blutdruck und Lipidverschiebung sind subjektiv nicht spürbar — nur messbar.", "REAL_WORLD_LIMITED")
    ], related: ["apob_lipids", "hematocrit_ctx", "trt_context"] }),
    K({ id: "fatloss_rate", slug: "fettabbau", title: "Fettabbau-Rate & Muskelerhalt", domain: "nutrition", goals: ["cut"], summary: "0,5–1 % Körpergewicht/Woche ist der Korridor, in dem Kraft und Muskelmasse meist haltbar sind. Schneller kostet zunehmend fettfreie Masse.", claims: [
      C("fl1", "Aggressivere Defizite erhöhen den Anteil fettfreier Masse am Gewichtsverlust.", "MODERATE"),
      C("fl2", "Krafterhalt ist der beste Alltagsindikator für Muskelerhalt im Cut.", "REAL_WORLD_LIMITED")
    ], related: ["protein_target", "energy_balance"] }),
    K({ id: "supplement_evidence", slug: "supplemente", title: "Supplement-Evidenz-Hierarchie", domain: "stack", summary: "Kreatin > Protein (bei Lücke) > Omega-3/Vitamin D (bei Mangel) > Koffein (akut) >> Rest. 'Testo-Booster' und Fatburner sind Geldverbrennung.", claims: [
      C("se1", "Tribulus & Co. erhöhen Testosteron nicht relevant.", "STRONG"),
      C("se2", "Fatburner-Komplexe sind im Kern teures Koffein.", "REAL_WORLD_LIMITED")
    ], related: ["creatine", "omega3"] })
  ];

  /* ======================= ZUGRIFF ======================= */
  function all() { return OBJECTS; }
  function byId(id) { return OBJECTS.filter(function (o) { return o.id === id || o.slug === id; })[0] || null; }
  function isStale(o) { try { return I.util.daysBetween(o.reviewedAt, I.util.todayYmd()) > STALE_DAYS; } catch (e) { return false; } }
  // Review-Queue (§34) — Entwickler-Metadaten, nie öffentliche UI.
  function reviewQueue() {
    return OBJECTS.map(function (o) {
      var flags = [];
      if (isStale(o)) flags.push("STALE");
      if ((o.sources || []).some(function (s) { return s.ref === "unresolved"; })) flags.push("MISSING_SOURCES");
      return flags.length ? { id: o.id, flags: flags } : null;
    }).filter(Boolean);
  }

  /* ======================= RETRIEVAL (§31/§32) ======================= */
  var TOPIC_HINTS = [
    [/kreatin|creatin/i, ["creatine", "kidney_markers"]],
    [/niere|kreatinin|creatinin|egfr|cystatin/i, ["kidney_markers", "creatine"]],
    [/protein|eiweiß/i, ["protein_target"]],
    [/kalorien|energie|surplus|defizit|überschuss/i, ["energy_balance", "fatloss_rate"]],
    [/plateau|stagnier|stall/i, ["plateau", "energy_balance", "hypertrophy_volume"]],
    [/volumen|sätze|hypertroph|muskelaufbau|wachs/i, ["hypertrophy_volume", "protein_target", "energy_balance"]],
    [/schlaf|sleep|erholung|recovery|müde/i, ["recovery_sleep"]],
    [/testosteron(?!.*trt)/i, ["testosterone_basics"]],
    [/trt|substitution/i, ["trt_context", "hematocrit_ctx"]],
    [/glp|semaglutid|tirzepatid|abnehmspritze/i, ["glp1_context"]],
    [/apob|ldl|lipid|cholesterin/i, ["apob_lipids"]],
    [/hba1c|glukose|zucker|insulin/i, ["glucose_hba1c"]],
    [/leber|alt\b|ast\b|ggt/i, ["liver_markers"]],
    [/hämatokrit|hematocrit|blut dick/i, ["hematocrit_ctx", "enhanced_monitoring"]],
    [/enhanced|stoff|kur|anabol/i, ["enhanced_monitoring", "trt_context", "apob_lipids"]],
    [/fett|abnehmen|cut\b|definier/i, ["fatloss_rate", "energy_balance", "protein_target"]],
    [/supplement|booster|burner/i, ["supplement_evidence", "creatine"]]
  ];
  function retrieve(question, ctx, limit) {
    ctx = ctx || (I.buildContext ? I.buildContext() : {});
    var q = String(question || "");
    var scores = {};
    function add(id, s) { scores[id] = (scores[id] || 0) + s; }
    TOPIC_HINTS.forEach(function (h) { if (h[0].test(q)) h[1].forEach(function (id, i) { add(id, 6 - i * 1.5); }); });
    OBJECTS.forEach(function (o) {
      if (q && new RegExp(o.slug, "i").test(q)) add(o.id, 4);
      // Kontext-Ranking: Pathway, Goal, Bottleneck, Nutzer-Marker.
      if (o.pathways.length && ctx.pathway && o.pathways.indexOf(ctx.pathway) >= 0) add(o.id, 1.5);
      if (o.goals.length && ctx.goal && o.goals.indexOf(ctx.goal.mode) >= 0) add(o.id, 1);
      if (ctx.labs && ctx.labs.available && o.markers.length) {
        (ctx.labs.priorities || []).forEach(function (p) { if (o.markers.indexOf(p.marker) >= 0) add(o.id, 2.5); });
      }
      if (ctx.goal && ctx.goal.bottleneck === "recovery" && o.domain === "recovery") add(o.id, 1.5);
      if (isStale(o) && scores[o.id]) add(o.id, -1.5);   // Staleness senkt Rang (§260)
    });
    var ranked = Object.keys(scores).filter(function (id) { return scores[id] > 1; })
      .sort(function (a, b) { return scores[b] - scores[a]; })
      .map(function (id) { var o = byId(id); return { object: o, score: Math.round(scores[id] * 10) / 10, stale: isStale(o) }; });
    return ranked.slice(0, limit || 3);
  }

  /* ======================= PERSONALIZED LEARN (§36/§37) ======================= */
  var BN_LEARN = {
    recovery: ["recovery_sleep", "plateau", "hypertrophy_volume"],
    nutrition: ["energy_balance", "protein_target", "fatloss_rate"],
    training: ["hypertrophy_volume", "plateau", "creatine"],
    execution: ["plateau", "recovery_sleep"],
    body: ["fatloss_rate", "energy_balance", "protein_target"],
    metabolic: ["glucose_hba1c", "apob_lipids", "energy_balance"],
    medical: ["hematocrit_ctx", "enhanced_monitoring", "apob_lipids"],
    knowledge: ["energy_balance", "protein_target", "hypertrophy_volume"]
  };
  // Aktion je Objekt (§37): kein Dead-End — jedes Wissen führt zu einem Feature.
  var OBJ_ACTION = {
    protein_target: { label: "Mein Proteinziel prüfen", link: "#plan" },
    energy_balance: { label: "Meinen Gewichtstrend ansehen", link: "#track" },
    plateau: { label: "Meine Wochen-Review öffnen", link: "#review" },
    hypertrophy_volume: { label: "Meinen Trainingsplan ansehen", link: "#plan" },
    creatine: { label: "Meinen Stack prüfen", link: "#plan" },
    recovery_sleep: { label: "Schlaf-Experiment starten", link: "#experiments" },
    apob_lipids: { label: "Meine Labs öffnen", link: "labor.html" },
    glucose_hba1c: { label: "Meine Labs öffnen", link: "labor.html" },
    kidney_markers: { label: "Meine Labs öffnen", link: "labor.html" },
    hematocrit_ctx: { label: "Monitoring ansehen", link: "labor.html" },
    enhanced_monitoring: { label: "Monitoring ansehen", link: "labor.html" },
    fatloss_rate: { label: "Meinen Trend prüfen", link: "#track" },
    supplement_evidence: { label: "Meinen Stack prüfen", link: "#plan" },
    testosterone_basics: { label: "Labs planen", link: "labor.html" },
    trt_context: { label: "Monitoring ansehen", link: "labor.html" },
    glp1_context: { label: "Mein Proteinziel prüfen", link: "#plan" },
    liver_markers: { label: "Meine Labs öffnen", link: "labor.html" },
    omega3: { label: "Meinen Stack prüfen", link: "#plan" }
  };
  function learnNow(ctx) {
    ctx = ctx || (I.buildContext ? I.buildContext() : {});
    var bn = "knowledge";
    try { bn = I.decision.bottleneck2(ctx).domain; } catch (e) {}
    var ids = (BN_LEARN[bn] || BN_LEARN.knowledge).slice();
    if (ctx.pathway === "enhanced" && ids.indexOf("enhanced_monitoring") < 0) ids.push("enhanced_monitoring");
    return { bottleneck: bn, items: ids.map(function (id) { var o = byId(id); return o ? { id: o.id, title: o.title, summary: o.summary, action: OBJ_ACTION[o.id] || null, stale: isStale(o) } : null; }).filter(Boolean).slice(0, 4) };
  }

  I.knowledge = {
    VERSION: KV, all: all, byId: byId, retrieve: retrieve, learnNow: learnNow,
    reviewQueue: reviewQueue, isStale: isStale, actionFor: function (id) { return OBJ_ACTION[id] || null; },
    // Phase 9 (§27/§29): Quellen, Publikations-Zustand, öffentliche Zitate.
    SOURCES: SOURCES, source: source, pubState: pubState, citations: citations,
    // Evidenz-Deckungsgrad für Doku/Tests: wie viele Objekte sind PUBLISHED?
    coverage: function () { var pub = 0, rev = 0; OBJECTS.forEach(function (o) { var s = pubState(o); if (s === "PUBLISHED") pub++; else if (s === "REVIEWED") rev++; }); return { total: OBJECTS.length, published: pub, reviewed: rev, resolvedSources: Object.keys(SOURCES).length }; }
  };
})();
