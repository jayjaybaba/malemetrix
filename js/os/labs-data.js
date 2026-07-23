/* ==========================================================================
   MALEMETRIX LABS — MARKER KNOWLEDGE BASE  (MM.labsData)
   --------------------------------------------------------------------------
   Kanonische Marker-Metadaten + Einheiten-Konvertierung + Alias-Auflösung.
   KEIN Diagnose-Tool. "context" ist Educational-Kontext, KEINE medizinische
   Optimal-Range-Erfindung. reference-Ranges kommen IMMER vom Labor des
   Nutzers — hier steht nur, WARUM ein Marker zählt und WOMIT er zusammenhängt.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};

  // Einheiten-Konvertierung: nur explizite, belegte Faktoren. value_canonical =
  // value_source × factor(sourceUnit→canonicalUnit). Quelle bleibt IMMER erhalten.
  // Molmassen: Glucose 180.16, Cholesterin 386.65, Triglyceride 885.4,
  // Testosteron 288.42, Estradiol 272.38 (→ pg/mL via /3.671), Kreatinin 88.4.
  var UNIT_CONV = {
    glucose: { canonical: "mg/dL", map: { "mg/dl": 1, "mmol/l": 18.016 } },
    cholesterol: { canonical: "mg/dL", map: { "mg/dl": 1, "mmol/l": 38.67 } },     // LDL/HDL/non-HDL/total
    triglycerides: { canonical: "mg/dL", map: { "mg/dl": 1, "mmol/l": 88.57 } },
    testosterone: { canonical: "ng/dL", map: { "ng/dl": 1, "nmol/l": 28.842, "ng/ml": 100 } },
    estradiol: { canonical: "pg/mL", map: { "pg/ml": 1, "pmol/l": 0.2724 } },
    creatinine: { canonical: "mg/dL", map: { "mg/dl": 1, "umol/l": 0.0113, "µmol/l": 0.0113 } },
    hba1c: { canonical: "%", map: { "%": 1, "mmol/mol": null } },                  // IFCC↔NGSP nicht linear → nicht auto-konvertieren
    apob: { canonical: "mg/dL", map: { "mg/dl": 1, "g/l": 100 } },
    generic_gL: { canonical: "g/dL", map: { "g/dl": 1, "g/l": 0.1 } }
  };

  // Marker-DB. category, canonicalUnit, convGroup (UNIT_CONV-Schlüssel),
  // aliases (lowercased), why, context, relatedMarkers, goals, pathways.
  var MARKERS = [
    // -------- CARDIOVASCULAR --------
    { id: "apo_b", name: "ApoB", category: "cardiovascular", unit: "mg/dL", conv: "apob", aliases: ["apob", "apo b", "apolipoprotein b", "apolipoprotein-b"], why: "Zählt die Zahl atherogener Partikel — der belastbarste Einzelmarker für kardiovaskuläres Risiko, oft aussagekräftiger als LDL-C allein.", context: "Trend über Zeit schlägt Einzelwert. Für Enhanced-/TRT-Kontext besonders relevant.", related: ["ldl_c", "non_hdl", "lp_a"], goals: ["all"], pathways: ["all"] },
    { id: "ldl_c", name: "LDL-Cholesterin", category: "cardiovascular", unit: "mg/dL", conv: "cholesterol", aliases: ["ldl", "ldl-c", "ldl cholesterol", "ldl-cholesterin"], why: "Klassischer Lipidmarker. ApoB/non-HDL bilden das Partikelrisiko oft besser ab.", context: "Nicht isoliert lesen — ApoB und Triglyceride gehören dazu.", related: ["apo_b", "non_hdl"], goals: ["all"], pathways: ["all"] },
    { id: "hdl_c", name: "HDL-Cholesterin", category: "cardiovascular", unit: "mg/dL", conv: "cholesterol", aliases: ["hdl", "hdl-c", "hdl cholesterol"], why: "Kontextmarker — sehr hoch ist nicht automatisch besser, sehr niedrig ein Signal.", context: "Kein simples 'gut'. Im Zusammenhang mit Triglyceriden lesen.", related: ["triglycerides"], goals: ["all"], pathways: ["all"] },
    { id: "triglycerides", name: "Triglyceride", category: "cardiovascular", unit: "mg/dL", conv: "triglycerides", aliases: ["triglyceride", "tg", "trigs"], why: "Metabolischer Spiegel — hängt eng mit Insulinsensitivität und Ernährung.", context: "Nüchtern messen. Hoch = oft metabolisches Signal.", related: ["hdl_c", "hba1c"], goals: ["all"], pathways: ["all"], fastingRelevant: true },
    { id: "non_hdl", name: "Non-HDL-Cholesterin", category: "cardiovascular", unit: "mg/dL", conv: "cholesterol", aliases: ["non-hdl", "nonhdl", "non hdl"], why: "Gesamt minus HDL — guter Partikelproxy, wenn ApoB fehlt.", context: "Trend beobachten.", related: ["apo_b", "ldl_c"], goals: ["all"], pathways: ["all"] },
    { id: "lp_a", name: "Lp(a)", category: "cardiovascular", unit: "nmol/L", aliases: ["lp(a)", "lpa", "lipoprotein a", "lipoprotein(a)"], why: "Weitgehend genetisch — einmal messen lohnt sich; erhöht das kardiovaskuläre Grundrisiko.", context: "Einmal-Bestimmung meist ausreichend; kaum durch Lifestyle veränderbar.", related: ["apo_b"], goals: ["all"], pathways: ["all"] },
    { id: "hs_crp", name: "hs-CRP", category: "cardiovascular", unit: "mg/L", aliases: ["hscrp", "hs crp", "hs-crp", "high sensitivity crp", "crp"], why: "Entzündungsmarker mit kardiovaskulärem und Recovery-Bezug.", context: "Kurz nach hartem Training oder Infekt verfälscht — Kontext beachten.", related: ["ferritin"], goals: ["all"], pathways: ["all"] },
    // -------- METABOLIC --------
    { id: "fasting_glucose", name: "Nüchternglukose", category: "metabolic", unit: "mg/dL", conv: "glucose", aliases: ["glucose", "glukose", "fasting glucose", "nüchternglukose", "blutzucker"], why: "Momentaufnahme des Glukosestoffwechsels.", context: "Nur nüchtern vergleichbar — Nüchternstatus zwingend mitführen.", related: ["hba1c", "fasting_insulin"], goals: ["all"], pathways: ["all"], fastingRelevant: true },
    { id: "hba1c", name: "HbA1c", category: "metabolic", unit: "%", conv: "hba1c", aliases: ["hba1c", "a1c", "hb a1c", "glykohämoglobin"], why: "Langzeit-Blutzucker (~3 Monate) — robuster als eine Einzelmessung.", context: "Trend zählt. Bei Anämie/Hämolyse verzerrt.", related: ["fasting_glucose", "fasting_insulin"], goals: ["all"], pathways: ["all"] },
    { id: "fasting_insulin", name: "Nüchtern-Insulin", category: "metabolic", unit: "µIU/mL", aliases: ["insulin", "fasting insulin", "nüchtern-insulin", "nüchtern insulin"], why: "Früher Marker für Insulinresistenz — oft vor der Glukose auffällig.", context: "Mit Glukose zusammen HOMA-IR berechenbar.", related: ["fasting_glucose", "hba1c"], goals: ["all"], pathways: ["all"], fastingRelevant: true },
    { id: "uric_acid", name: "Harnsäure", category: "metabolic", unit: "mg/dL", aliases: ["uric acid", "harnsäure", "urat"], why: "Metabolischer Kontextmarker (Gicht, Fruktose, Purine).", context: "", related: [], goals: ["all"], pathways: ["all"] },
    // -------- LIVER --------
    { id: "alt", name: "ALT (GPT)", category: "liver", unit: "U/L", aliases: ["alt", "gpt", "alat", "sgpt"], why: "Leberzell-Marker — bei hartem Training leicht erhöht, ohne Lebererkrankung.", context: "Training/Alkohol/orale Wirkstoffe als Kontext. Nicht automatisch abtun.", related: ["ast", "ggt"], goals: ["all"], pathways: ["all"] },
    { id: "ast", name: "AST (GOT)", category: "liver", unit: "U/L", aliases: ["ast", "got", "asat", "sgot"], why: "Steigt bei Muskel- UND Leberbelastung — nach Training oft erhöht.", context: "AST/ALT-Verhältnis + CK helfen bei der Einordnung.", related: ["alt", "ck"], goals: ["all"], pathways: ["all"] },
    { id: "ggt", name: "GGT", category: "liver", unit: "U/L", aliases: ["ggt", "gamma-gt", "gamma gt", "y-gt"], why: "Sensibel für Alkohol und cholestatische Prozesse.", context: "", related: ["alt"], goals: ["all"], pathways: ["all"] },
    { id: "alp", name: "Alkalische Phosphatase", category: "liver", unit: "U/L", aliases: ["alp", "ap", "alkalische phosphatase"], why: "Leber-/Knochen-Kontext.", context: "", related: [], goals: ["all"], pathways: ["all"] },
    { id: "bilirubin", name: "Bilirubin (gesamt)", category: "liver", unit: "mg/dL", aliases: ["bilirubin", "bili", "gesamtbilirubin"], why: "Leber-/Hämolyse-Kontext; leicht erhöht oft harmlos (Gilbert).", context: "", related: [], goals: ["all"], pathways: ["all"] },
    // -------- KIDNEY --------
    { id: "creatinine", name: "Kreatinin", category: "kidney", unit: "mg/dL", conv: "creatinine", aliases: ["creatinine", "kreatinin", "krea"], why: "Nierenmarker — bei viel Muskelmasse und Kreatin-Einnahme systematisch höher, OHNE Nierenschaden.", context: "Bei muskulösen Männern Cystatin C zusätzlich sinnvoll. Keine falsche Beruhigung, aber auch kein Fehlalarm.", related: ["egfr", "cystatin_c"], goals: ["all"], pathways: ["all"] },
    { id: "egfr", name: "eGFR", category: "kidney", unit: "mL/min/1.73m²", aliases: ["egfr", "gfr", "e-gfr"], why: "Geschätzte Filtrationsrate — kreatininbasiert bei viel Muskel oft unterschätzt.", context: "Cystatin-C-basierte eGFR ist bei Muskulösen fairer.", related: ["creatinine", "cystatin_c"], goals: ["all"], pathways: ["all"] },
    { id: "cystatin_c", name: "Cystatin C", category: "kidney", unit: "mg/L", aliases: ["cystatin c", "cystatin-c", "cystatinc"], why: "Nierenmarker UNABHÄNGIG von Muskelmasse — fairer für Kraftsportler.", context: "Besonders sinnvoll, wenn Kreatinin durch Muskel/Kreatin erhöht wirkt.", related: ["creatinine", "egfr"], goals: ["all"], pathways: ["performance", "enhanced"] },
    { id: "acr_urine", name: "Albumin/Kreatinin (Urin)", category: "kidney", unit: "mg/g", aliases: ["acr", "albumin/creatinine", "uacr", "albumin-kreatinin-ratio"], why: "Früher Nierenschaden-Marker.", context: "", related: [], goals: ["all"], pathways: ["all"] },
    // -------- HEMATOLOGY --------
    { id: "hemoglobin", name: "Hämoglobin", category: "hematology", unit: "g/dL", conv: "generic_gL", aliases: ["hemoglobin", "hämoglobin", "hb", "hgb"], why: "Sauerstofftransport. Für Enhanced/TRT engmaschig relevant.", context: "Mit Hämatokrit zusammen lesen.", related: ["hematocrit", "rbc"], goals: ["all"], pathways: ["all"] },
    { id: "hematocrit", name: "Hämatokrit", category: "hematology", unit: "%", aliases: ["hematocrit", "hämatokrit", "hct", "hkt"], why: "Anteil zellulärer Bestandteile — steigt unter TRT/Enhanced, erhöht Blutviskosität.", context: "Steigender Trend (z. B. 47→50→53) ist ein echtes kardiovaskuläres Kontextsignal — mit Blutdruck/Hydration lesen.", related: ["hemoglobin", "rbc"], goals: ["all"], pathways: ["all"] },
    { id: "rbc", name: "Erythrozyten (RBC)", category: "hematology", unit: "M/µL", aliases: ["rbc", "erythrozyten", "red blood cells", "erys"], why: "Rote Blutkörperchen — Teil des Hämatokrit-Kontexts.", context: "", related: ["hematocrit", "hemoglobin"], goals: ["all"], pathways: ["all"] },
    { id: "wbc", name: "Leukozyten (WBC)", category: "hematology", unit: "K/µL", aliases: ["wbc", "leukozyten", "white blood cells", "leukos"], why: "Immun-/Entzündungskontext.", context: "", related: [], goals: ["all"], pathways: ["all"] },
    { id: "platelets", name: "Thrombozyten", category: "hematology", unit: "K/µL", aliases: ["platelets", "thrombozyten", "plt", "thrombos"], why: "Gerinnungs-/Kontextmarker.", context: "", related: [], goals: ["all"], pathways: ["all"] },
    { id: "ferritin", name: "Ferritin", category: "hematology", unit: "µg/L", aliases: ["ferritin"], why: "Eisenspeicher — niedrig kostet Energie/Recovery, hoch ist ein Kontextsignal (Entzündung, Überladung).", context: "Als Akute-Phase-Protein bei Entzündung falsch hoch. Mit Transferrinsättigung lesen.", related: ["iron", "tsat", "hs_crp"], goals: ["all"], pathways: ["performance", "enhanced"] },
    { id: "iron", name: "Eisen", category: "hematology", unit: "µg/dL", aliases: ["iron", "eisen", "serum iron"], why: "Momentaufnahme — allein wenig aussagekräftig.", context: "Mit Ferritin + Transferrinsättigung.", related: ["ferritin", "tsat"], goals: ["all"], pathways: ["all"] },
    { id: "tsat", name: "Transferrinsättigung", category: "hematology", unit: "%", aliases: ["tsat", "transferrinsättigung", "transferrin saturation"], why: "Bester Einzelmarker für Eisenstatus/-überladung.", context: "", related: ["ferritin", "iron"], goals: ["all"], pathways: ["all"] },
    // -------- HORMONES --------
    { id: "total_testosterone", name: "Testosteron (gesamt)", category: "hormones", unit: "ng/dL", conv: "testosterone", aliases: ["total testosterone", "testosteron", "gesamttestosteron", "testosteron gesamt", "total t"], why: "Zentraler Hormonmarker — allein aber unvollständig ohne SHBG, freies T, Tageszeit und Symptomkontext.", context: "Morgens messen. Ein Einzelwert ohne SHBG/Timing ist oft irreführend. Keine automatische TRT-Diagnose.", related: ["shbg", "free_testosterone", "lh", "estradiol"], goals: ["all"], pathways: ["all"], timeRelevant: true },
    { id: "free_testosterone", name: "Freies Testosteron", category: "hormones", unit: "pg/mL", aliases: ["free testosterone", "freies testosteron", "free t"], why: "Bioverfügbarer Anteil — aussagekräftiger als Gesamt-T, wenn SHBG auffällig ist.", context: "Berechnet (Vermeulen) oder direkt gemessen — Methode dokumentieren.", related: ["total_testosterone", "shbg"], goals: ["all"], pathways: ["all"], timeRelevant: true },
    { id: "shbg", name: "SHBG", category: "hormones", unit: "nmol/L", aliases: ["shbg", "sex hormone binding globulin"], why: "Bindet Testosteron — bestimmt, wie viel wirklich frei verfügbar ist.", context: "Ohne SHBG ist Gesamt-T halbe Information.", related: ["total_testosterone", "free_testosterone"], goals: ["all"], pathways: ["all"] },
    { id: "estradiol", name: "Estradiol (E2)", category: "hormones", unit: "pg/mL", conv: "estradiol", aliases: ["estradiol", "e2", "östradiol", "oestradiol"], why: "Wichtig für Libido, Knochen, Stimmung — bei Männern weder 'zu drücken' noch zu ignorieren.", context: "Sensitiven Assay verwenden. Für Enhanced-Kontext zentral.", related: ["total_testosterone"], goals: ["all"], pathways: ["all"] },
    { id: "lh", name: "LH", category: "hormones", unit: "IU/L", aliases: ["lh", "luteinisierendes hormon", "luteinizing hormone"], why: "Signal der Hypophyse an die Hoden — unterdrückt unter exogenem Testosteron.", context: "Niedrig + niedriges T deutet auf sekundäre Ursache/Suppression.", related: ["fsh", "total_testosterone"], goals: ["all"], pathways: ["all"] },
    { id: "fsh", name: "FSH", category: "hormones", unit: "IU/L", aliases: ["fsh", "follikelstimulierendes hormon"], why: "Steuert die Spermienbildung — relevant bei Fertilitätsfragen.", context: "", related: ["lh"], goals: ["all"], pathways: ["all"] },
    { id: "prolactin", name: "Prolaktin", category: "hormones", unit: "ng/mL", aliases: ["prolactin", "prolaktin", "prl"], why: "Kontext für Libido/Erektion; im 19-Nor-Enhanced-Kontext besonders relevant.", context: "", related: [], goals: ["all"], pathways: ["enhanced"] },
    { id: "dht", name: "DHT", category: "hormones", unit: "ng/dL", aliases: ["dht", "dihydrotestosteron", "dihydrotestosterone"], why: "Potentestes Androgen — Haar/Haut/Prostata-Kontext.", context: "", related: ["total_testosterone"], goals: ["all"], pathways: ["enhanced"] },
    { id: "psa", name: "PSA", category: "hormones", unit: "ng/mL", aliases: ["psa", "prostata-spezifisches antigen", "prostate specific antigen"], why: "Prostata-Verlaufsmarker — Trend und Alterskontext zählen. KEINE Krebsdiagnose.", context: "Änderungen über Zeit sind wichtiger als ein Einzelwert; ärztlich einordnen.", related: [], goals: ["all"], pathways: ["all"] },
    // -------- THYROID --------
    { id: "tsh", name: "TSH", category: "thyroid", unit: "mIU/L", aliases: ["tsh", "thyreotropin"], why: "Screening der Schilddrüsenfunktion.", context: "Kein universelles 'optimal = X' — mit fT4/fT3 und Therapie lesen.", related: ["ft4", "ft3"], goals: ["all"], pathways: ["all"] },
    { id: "ft4", name: "fT4", category: "thyroid", unit: "ng/dL", aliases: ["ft4", "freies t4", "free t4"], why: "Freies Schilddrüsenhormon — Kontext zu TSH.", context: "", related: ["tsh", "ft3"], goals: ["all"], pathways: ["all"] },
    { id: "ft3", name: "fT3", category: "thyroid", unit: "pg/mL", aliases: ["ft3", "freies t3", "free t3"], why: "Aktives Schilddrüsenhormon.", context: "Im Kaloriendefizit oft niedriger — Kontext beachten.", related: ["tsh", "ft4"], goals: ["all"], pathways: ["all"] },
    { id: "tpo_ab", name: "TPO-Antikörper", category: "thyroid", unit: "IU/mL", aliases: ["tpo", "tpo-ak", "tpo antibodies", "anti-tpo"], why: "Autoimmun-Kontext (Hashimoto).", context: "", related: ["tsh"], goals: ["all"], pathways: ["all"] },
    // -------- NUTRIENTS --------
    { id: "vitamin_d", name: "Vitamin D (25-OH)", category: "nutrients", unit: "ng/mL", aliases: ["vitamin d", "25-oh", "25-oh-d", "25 hydroxy vitamin d", "vitd", "vitamin d3"], why: "Häufiger Mangel in DE — steuert Supplementierung gezielt statt pauschal.", context: "Ausreichend → NICHT blind hochdosieren. Stack-Engine liest diesen Wert.", related: [], goals: ["all"], pathways: ["all"] },
    { id: "vitamin_b12", name: "Vitamin B12", category: "nutrients", unit: "pg/mL", aliases: ["b12", "vitamin b12", "cobalamin"], why: "Energie/Neuro-Kontext, relevant bei pflanzenbetonter Ernährung.", context: "Holo-TC/MMA sind sensibler bei Grauzone.", related: ["folate"], goals: ["all"], pathways: ["all"] },
    { id: "folate", name: "Folsäure", category: "nutrients", unit: "ng/mL", aliases: ["folate", "folsäure", "folat"], why: "Kontext zu B12/Homocystein.", context: "", related: ["vitamin_b12"], goals: ["all"], pathways: ["all"] },
    { id: "magnesium", name: "Magnesium", category: "nutrients", unit: "mg/dL", aliases: ["magnesium", "mg"], why: "Muskel-/Schlaf-Kontext; Serumwert nur grob.", context: "", related: [], goals: ["all"], pathways: ["all"] },
    { id: "zinc", name: "Zink", category: "nutrients", unit: "µg/dL", aliases: ["zinc", "zink"], why: "Immun-/Hormon-Kontext.", context: "", related: [], goals: ["all"], pathways: ["all"] },
    // -------- PERFORMANCE / RECOVERY --------
    { id: "ck", name: "Kreatinkinase (CK)", category: "performance", unit: "U/L", aliases: ["ck", "cpk", "kreatinkinase", "creatine kinase"], why: "Muskelbelastungsmarker — nach hartem Training stark erhöht, ohne Krankheitswert.", context: "1–2 Tage nach intensivem Training massiv hoch — Timing beachten, sonst Fehlinterpretation.", related: ["ast"], goals: ["performance"], pathways: ["performance", "enhanced"] },
    { id: "cortisol", name: "Cortisol (morgens)", category: "performance", unit: "µg/dL", aliases: ["cortisol", "kortisol"], why: "Stress-/Recovery-Kontext.", context: "Tageszeitabhängig — morgens standardisiert messen.", related: [], goals: ["performance"], pathways: ["all"], timeRelevant: true }
  ];

  var BY_ID = {}; MARKERS.forEach(function (m) { BY_ID[m.id] = m; });
  var ALIAS = {};
  MARKERS.forEach(function (m) {
    ALIAS[m.name.toLowerCase()] = m.id; ALIAS[m.id] = m.id;
    (m.aliases || []).forEach(function (a) { ALIAS[a.toLowerCase()] = m.id; });
  });
  function normName(s) { return String(s || "").toLowerCase().replace(/[\s._-]+/g, " ").trim(); }
  function resolveMarker(nameOrId) {
    var n = normName(nameOrId);
    if (ALIAS[n]) return ALIAS[n];
    // toleranter Match: Bindestriche/Punkte entfernt
    var compact = n.replace(/\s+/g, "");
    for (var k in ALIAS) { if (k.replace(/[\s._-]+/g, "") === compact) return ALIAS[k]; }
    return null;
  }
  function marker(id) { return BY_ID[id] || null; }

  // Konvertiere Wert in kanonische Einheit; Quelle bleibt erhalten. null wenn
  // keine belegte Konvertierung existiert (dann NICHT vergleichen, ehrlich).
  function toCanonical(markerId, value, unit) {
    var m = BY_ID[markerId]; if (!m) return null;
    var u = String(unit || "").toLowerCase().replace(/\s+/g, "");
    var canonU = (m.unit || "").toLowerCase().replace(/\s+/g, "");
    if (!m.conv) return u === canonU ? { value: value, unit: m.unit } : null;
    var cfg = UNIT_CONV[m.conv]; if (!cfg) return null;
    var f = cfg.map[u];
    if (f === 1) return { value: value, unit: cfg.canonical };
    if (f == null) return null;                 // nicht linear / unbekannt → nicht raten
    return { value: Math.round(value * f * 100) / 100, unit: cfg.canonical };
  }

  var CATEGORIES = [
    { id: "cardiovascular", label: "Kardiovaskulär" },
    { id: "metabolic", label: "Metabolisch" },
    { id: "hematology", label: "Hämatologie" },
    { id: "liver", label: "Leber" },
    { id: "kidney", label: "Niere" },
    { id: "hormones", label: "Hormone" },
    { id: "thyroid", label: "Schilddrüse" },
    { id: "nutrients", label: "Nährstoffe" },
    { id: "performance", label: "Performance/Recovery" }
  ];

  MM.labsData = {
    MARKERS: MARKERS, CATEGORIES: CATEGORIES, marker: marker, resolveMarker: resolveMarker,
    toCanonical: toCanonical, byCategory: function (c) { return MARKERS.filter(function (m) { return m.category === c; }); }
  };
})();
