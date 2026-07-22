/* ==========================================================================
   MALEMETRIX OS — LABS & BIOMARKER INTELLIGENCE  (MM.labs)
   --------------------------------------------------------------------------
   Kein PDF-Viewer, keine Blutwert-Tabelle, kein „grün/rot“-Portal, keine
   Diagnose. Aufgabe: LABORDATEN IN KONTEXT VERWANDELN.

   Kette:  LABS → PROFILE → PATHWAY → GOALS → SCORE → NUTRITION → STACK →
           ENHANCED CONTEXT → PROGRESS → NEXT BEST ACTION.

   Kernteile:
     · MARKER KNOWLEDGE BASE — kanonische IDs, Aliase, Einheiten, Kategorie,
       why_it_matters, context_factors, Beziehungen. Struktur, keine Diagnose.
     · UNIT NORMALIZATION — nur mit EXPLIZITEN Umrechnungskarten; Originalwert
       bleibt IMMER erhalten. Nie stille Konvertierung.
     · DATENMODELL — Panels (ein Bluttermin = panel_id) + Ergebnisse. History
       ist unveränderlich (append), „Latest“ ist abgeleitet. Duplikaterkennung.
     · TREND ENGINE — Richtung schlägt Einzelwert. Signifikanz über absolute
       UND prozentuale Änderung; kein Alarm bei Rauschen.
     · STATUS — STABLE · IMPROVING · WORSENING · OUTSIDE_LAB_RANGE ·
       CONTEXT_DEPENDENT · NEEDS_FOLLOWUP. LAB-RANGE ≠ „optimal“.
     · CONTEXT ENGINE — interpretiert mit Alter/Geschlecht/Pathway/Goal/
       Medikation/Training/Enhanced-Status. Nie im Vakuum.
     · PRIORITIES — maximal 3. Recheck-Engine mit kontextabhängigen Fenstern.
     · BLOOD TEST BUILDER — personalisiertes Panel (CORE/GOAL/ADVANCED/OPTIONAL).
     · ENHANCED MONITORING — Cardio/Hämatologie/Leber/Niere/Endokrin/Metabolik/
       Fertilität. Monitoring-Priorität, KEINE automatischen Medikamenten-Pläne.

   Grundsätze: Original-Einheiten bewahren. Lab-Range nie mit „optimal“
   verwechseln. Keine erfundenen Optimalbereiche ohne Quelle. Kein KI-Doktor.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var S = {
    get: function (k, d) { try { return MM.store ? MM.store.get(k, d) : (JSON.parse(localStorage.getItem("mm_" + k)) ?? d); } catch (e) { return d; } },
    set: function (k, v) { try { MM.store ? MM.store.set(k, v) : localStorage.setItem("mm_" + k, JSON.stringify(v)); } catch (e) {} }
  };
  function todayYmd() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function parseYmdUTC(s) { var p = String(s || "").split("-"); return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
  function daysBetween(a, b) { return Math.round((parseYmdUTC(b) - parseYmdUTC(a)) / 86400000); }
  function round(v, dp) { var f = Math.pow(10, dp == null ? 2 : dp); return Math.round(v * f) / f; }
  function OS() { return window.MM && MM.os; }

  /* =====================================================================
     CATEGORIES
     ===================================================================== */
  var CATEGORIES = {
    cardio: { label: "KARDIOVASKULÄR", short: "Cardio", region: "heart" },
    metabolic: { label: "GLUKOSE / METABOLISCH", short: "Metabolisch", region: "endocrine" },
    liver: { label: "LEBER", short: "Leber", region: "liver" },
    kidney: { label: "NIERE", short: "Niere", region: "kidney" },
    heme: { label: "HÄMATOLOGIE", short: "Blut", region: "blood" },
    hormones: { label: "HORMONE", short: "Hormone", region: "endocrine" },
    thyroid: { label: "SCHILDDRÜSE", short: "Schilddrüse", region: "endocrine" },
    nutrients: { label: "NÄHRSTOFFSTATUS", short: "Nährstoffe", region: "blood" },
    performance: { label: "PERFORMANCE / RECOVERY", short: "Recovery", region: "blood" },
    prostate: { label: "PROSTATA", short: "Prostata", region: "kidney" }
  };

  /* =====================================================================
     UNIT CONVERSION — nur explizite Faktoren. keine "unit assumption".
     Faktoren via molare Masse; Quelle im Kommentar. Konvertiert AUF die
     kanonische Einheit des Markers (canonicalUnit).
     ===================================================================== */
  // to canonical = value * factor[from]. Faktoren pro Marker-„family“.
  var UNIT_MAPS = {
    // Cholesterin/LDL/HDL/nonHDL: mg/dL <-> mmol/L, MG=38.67 (mg/dL per mmol/L)
    chol_mgdl: { canonical: "mg/dL", to: { "mg/dl": 1, "mg/dL": 1, "mmol/l": 38.67, "mmol/L": 38.67 } },
    // Triglyceride: mg/dL, mmol/L factor 88.57
    trig_mgdl: { canonical: "mg/dL", to: { "mg/dl": 1, "mg/dL": 1, "mmol/l": 88.57, "mmol/L": 88.57 } },
    // ApoB / Lp(a) as mass: mg/dL <-> g/L (x100) ; Lp(a) nmol/L kept separate (no universal factor)
    apob_mgdl: { canonical: "mg/dL", to: { "mg/dl": 1, "mg/dL": 1, "g/l": 100, "g/L": 100 } },
    // Glukose: mg/dL <-> mmol/L factor 18.02
    glucose_mgdl: { canonical: "mg/dL", to: { "mg/dl": 1, "mg/dL": 1, "mmol/l": 18.02, "mmol/L": 18.02 } },
    // Kreatinin: mg/dL <-> µmol/L factor 0.0113 (µmol/L * 0.0113 = mg/dL)
    creat_mgdl: { canonical: "mg/dL", to: { "mg/dl": 1, "mg/dL": 1, "umol/l": 0.0113, "µmol/l": 0.0113, "µmol/L": 0.0113, "umol/L": 0.0113 } },
    // Harnsäure: mg/dL <-> µmol/L factor 0.0168
    urate_mgdl: { canonical: "mg/dL", to: { "mg/dl": 1, "mg/dL": 1, "umol/l": 0.0168, "µmol/l": 0.0168, "µmol/L": 0.0168, "umol/L": 0.0168 } },
    // Testosteron (total): ng/dL <-> nmol/L factor 28.84 (nmol/L * 28.84 = ng/dL) ; ng/mL x100
    testo_ngdl: { canonical: "ng/dL", to: { "ng/dl": 1, "ng/dL": 1, "nmol/l": 28.84, "nmol/L": 28.84, "ng/ml": 100, "ng/mL": 100 } },
    // Estradiol: pg/mL <-> pmol/L factor 0.2724 (pmol/L * 0.2724 = pg/mL)
    estradiol_pgml: { canonical: "pg/mL", to: { "pg/ml": 1, "pg/mL": 1, "pmol/l": 0.2724, "pmol/L": 0.2724 } },
    // SHBG: nmol/L (Standard, keine gängige alternative Masseeinheit)
    shbg_nmoll: { canonical: "nmol/L", to: { "nmol/l": 1, "nmol/L": 1 } },
    // Vitamin D 25-OH: ng/mL <-> nmol/L factor 0.4 (nmol/L * 0.4 = ng/mL)
    vitd_ngml: { canonical: "ng/mL", to: { "ng/ml": 1, "ng/mL": 1, "nmol/l": 0.4, "nmol/L": 0.4 } },
    // Ferritin / Cortisol etc: µg/L == ng/mL (1:1)
    ferritin_ngml: { canonical: "ng/mL", to: { "ng/ml": 1, "ng/mL": 1, "ug/l": 1, "µg/l": 1, "µg/L": 1, "ug/L": 1 } },
    // Eisen: µg/dL <-> µmol/L factor 5.587 (µmol/L * 5.587 = µg/dL)
    iron_ugdl: { canonical: "µg/dL", to: { "ug/dl": 1, "µg/dl": 1, "µg/dL": 1, "ug/dL": 1, "umol/l": 5.587, "µmol/l": 5.587, "µmol/L": 5.587, "umol/L": 5.587 } },
    // B12: pg/mL <-> pmol/L factor 1.355 (pmol/L * 1.355 = pg/mL)
    b12_pgml: { canonical: "pg/mL", to: { "pg/ml": 1, "pg/mL": 1, "pmol/l": 1.355, "pmol/L": 1.355, "ng/l": 1, "ng/L": 1 } },
    // Hämoglobin: g/dL <-> g/L (x0.1) ; mmol/L * 1.611 = g/dL
    hb_gdl: { canonical: "g/dL", to: { "g/dl": 1, "g/dL": 1, "g/l": 0.1, "g/L": 0.1, "mmol/l": 1.611, "mmol/L": 1.611 } }
  };
  // Einheiten, die als reine Dimensionslose/Prozent/Verhältnis gelten (keine Umrechnung)
  function normUnitStr(u) { return String(u == null ? "" : u).trim().replace(/\s+/g, "").toLowerCase(); }

  /* Convert a value to a marker's canonical unit. Returns {value, unit,
     converted:boolean, original:{value,unit}} — original ALWAYS retained.
     If no map or unknown unit → keep as-is, converted=false. NEVER guesses. */
  function toCanonical(markerId, value, unit) {
    var m = MARKERS[markerId];
    var original = { value: value, unit: unit || "" };
    if (m == null || value == null || isNaN(parseFloat(value))) return { value: (value == null ? null : parseFloat(value)), unit: unit || (m && m.canonicalUnit) || "", converted: false, original: original, unknownUnit: false };
    value = parseFloat(value);
    if (!m.unitMap) return { value: value, unit: unit || m.canonicalUnit, converted: false, original: original, unknownUnit: false };
    var map = UNIT_MAPS[m.unitMap]; if (!map) return { value: value, unit: unit || m.canonicalUnit, converted: false, original: original, unknownUnit: false };
    var u = normUnitStr(unit);
    if (!u) return { value: value, unit: map.canonical, converted: false, original: original, unknownUnit: false }; // keine Einheit → als kanonisch annehmen, NICHT rechnen
    // finde Faktor case-insensitiv
    var factor = null;
    Object.keys(map.to).forEach(function (k) { if (normUnitStr(k) === u) factor = map.to[k]; });
    if (factor == null) return { value: value, unit: unit, converted: false, original: original, unknownUnit: true }; // unbekannte Einheit → NICHT raten
    if (factor === 1) return { value: value, unit: map.canonical, converted: normUnitStr(map.canonical) !== u, original: original, unknownUnit: false };
    return { value: round(value * factor, 3), unit: map.canonical, converted: true, original: original, unknownUnit: false };
  }

  /* =====================================================================
     MARKER KNOWLEDGE BASE
     Jeder Marker: id · name · category · canonicalUnit · unitMap · aliases ·
     labRange (typische Erwachsenen-Laborspanne, GESCHLECHTSABHÄNGIG wo nötig,
     Quelle: gängige Referenzintervalle) · direction (welche Richtung ist
     „besser“: down|up|mid) · why_it_matters · context_factors ·
     related · goals · pathways · crit (nur QUELLENBASIERTE Alarm-Schwellen).
     labRange ist die typische LABOR-Referenz — NICHT „optimal“.
     ===================================================================== */
  var MARKERS = {
    /* ---------- CARDIOVASCULAR ---------- */
    apo_b: {
      name: "ApoB", category: "cardio", canonicalUnit: "mg/dL", unitMap: "apob_mgdl",
      aliases: ["apob", "apo b", "apolipoprotein b", "apolipoprotein-b", "apo-b"],
      labRange: { low: 40, high: 100 }, direction: "down",
      why_it_matters: "ApoB zählt die tatsächliche Zahl atherogener Partikel (jedes LDL/VLDL trägt genau ein ApoB). Für kardiovaskuläres Risiko oft aussagekräftiger als LDL-C allein.",
      context_factors: ["Nüchternheit nicht zwingend nötig", "Statin/Ezetimib senken", "familiäre Hypercholesterinämie", "Trainingszustand"],
      related: ["ldl_c", "non_hdl", "lp_a"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    ldl_c: {
      name: "LDL-Cholesterin", category: "cardio", canonicalUnit: "mg/dL", unitMap: "chol_mgdl",
      aliases: ["ldl", "ldl-c", "ldl cholesterin", "ldl cholesterol", "ldl-cholesterin"],
      labRange: { low: 0, high: 116 }, direction: "down",
      why_it_matters: "LDL transportiert Cholesterin ins Gewebe; anhaltend hohe Werte treiben Plaquebildung. Wird von ApoB und non-HDL kontextualisiert — nicht isoliert lesen.",
      context_factors: ["oft berechnet (Friedewald) — bei hohen Triglyceriden ungenau", "Statin/Ezetimib", "Ernährung"],
      related: ["apo_b", "non_hdl", "hdl_c", "triglycerides"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    hdl_c: {
      name: "HDL-Cholesterin", category: "cardio", canonicalUnit: "mg/dL", unitMap: "chol_mgdl",
      aliases: ["hdl", "hdl-c", "hdl cholesterin", "hdl cholesterol"],
      labRange: { low: 40, high: 90 }, direction: "up",
      why_it_matters: "HDL ist am Rücktransport von Cholesterin beteiligt. „Höher = pauschal besser“ stimmt aber nicht — sehr hohe Werte sind kein Freifahrtschein und ApoB bleibt der Treiber.",
      context_factors: ["Alkohol erhöht", "Training erhöht moderat", "genetische Varianten"],
      related: ["apo_b", "triglycerides", "non_hdl"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    triglycerides: {
      name: "Triglyceride", category: "cardio", canonicalUnit: "mg/dL", unitMap: "trig_mgdl",
      aliases: ["triglyceride", "tg", "triglyzeride", "triglycerides"],
      labRange: { low: 0, high: 150 }, direction: "down", fastingMatters: true,
      why_it_matters: "Erhöhte Triglyceride spiegeln oft Insulinresistenz, Alkohol und schnelle Kohlenhydrate. Nüchtern gemessen aussagekräftiger.",
      context_factors: ["NÜCHTERN messen", "Alkohol 24–48h vorher", "letzte Mahlzeit", "Insulinresistenz"],
      related: ["hdl_c", "glucose", "hba1c"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    non_hdl: {
      name: "Non-HDL-Cholesterin", category: "cardio", canonicalUnit: "mg/dL", unitMap: "chol_mgdl",
      aliases: ["non-hdl", "non hdl", "nonhdl", "non-hdl-c"],
      labRange: { low: 0, high: 130 }, direction: "down",
      why_it_matters: "Non-HDL = Gesamtcholesterin − HDL, erfasst ALLE atherogenen Partikel und ist auch nicht-nüchtern robust. Guter Kompromiss zwischen LDL und ApoB.",
      context_factors: ["direkt aus Gesamtchol − HDL berechenbar", "nicht-nüchtern robust"],
      related: ["apo_b", "ldl_c"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    lp_a: {
      name: "Lp(a)", category: "cardio", canonicalUnit: "nmol/L", unitMap: null,
      aliases: ["lpa", "lp(a)", "lipoprotein a", "lipoprotein(a)", "lp a"],
      labRange: { low: 0, high: 75 }, direction: "down", unitAmbiguous: true,
      why_it_matters: "Lp(a) ist stark genetisch bestimmt und ein unabhängiger kardiovaskulärer Risikofaktor. Einmal messen lohnt fast immer — ändert sich kaum über das Leben.",
      context_factors: ["EINHEIT BEACHTEN: nmol/L vs mg/dL sind nicht 1:1 umrechenbar (partikelabhängig)", "genetisch, kaum durch Lebensstil beeinflussbar", "Familienanamnese früher Herzinfarkte"],
      related: ["apo_b"], goals: ["all"], pathways: ["health", "performance", "enhanced"], onceEnough: true
    },
    hs_crp: {
      name: "hs-CRP", category: "cardio", canonicalUnit: "mg/L", unitMap: null,
      aliases: ["hscrp", "hs-crp", "hs crp", "high sensitivity crp", "hochsensitives crp", "crp hs"],
      labRange: { low: 0, high: 3 }, direction: "down",
      why_it_matters: "Niedriggradige Entzündung; kardiovaskulärer Kontextmarker. Steigt aber akut bei Infekt und hartem Training — als Trend lesen, nicht als Einzelwert.",
      context_factors: ["akuter Infekt verfälscht massiv", "hartes Training 24–72h vorher", "als Trend interpretieren"],
      related: ["ferritin"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },

    /* ---------- GLUCOSE / METABOLIC ---------- */
    glucose: {
      name: "Nüchternglukose", category: "metabolic", canonicalUnit: "mg/dL", unitMap: "glucose_mgdl",
      aliases: ["glukose", "glucose", "nüchternglukose", "blutzucker", "fasting glucose", "nüchtern-glukose", "bz"],
      labRange: { low: 70, high: 99 }, direction: "mid", fastingMatters: true,
      why_it_matters: "Momentaufnahme des Blutzuckers. NÜCHTERN vs. random ist ein völlig anderer Kontext — beide nie gleichsetzen.",
      context_factors: ["NÜCHTERN-Status entscheidend", "Stress/Krankheit erhöht akut", "letzte Mahlzeit"],
      related: ["hba1c", "insulin", "homa_ir"], goals: ["all"], pathways: ["health", "performance", "enhanced"],
      crit: { high: 300, dir: "high", note: "Sehr hoher Blutzucker — ärztlich abklären." }
    },
    hba1c: {
      name: "HbA1c", category: "metabolic", canonicalUnit: "%", unitMap: null,
      aliases: ["hba1c", "hb a1c", "a1c", "langzeitzucker", "glykohämoglobin", "hämoglobin a1c"],
      labRange: { low: 4, high: 5.6 }, direction: "down",
      why_it_matters: "Ø Blutzucker der letzten ~3 Monate — robuster als eine Einzelmessung. 5,7–6,4 % gilt als Prädiabetes-Bereich (Referenz, keine Diagnose).",
      context_factors: ["Anämie/Hämoglobinopathie verfälscht", "unabhängig vom Nüchternstatus", "3-Monats-Fenster"],
      related: ["glucose", "insulin", "homa_ir"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    insulin: {
      name: "Nüchterninsulin", category: "metabolic", canonicalUnit: "µIU/mL", unitMap: null,
      aliases: ["insulin", "nüchterninsulin", "fasting insulin", "nüchtern-insulin"],
      labRange: { low: 2, high: 25 }, direction: "down", fastingMatters: true,
      why_it_matters: "Nüchterninsulin zeigt, wie hart die Bauchspeicheldrüse arbeiten muss, um den Zucker zu halten — ein früher Insulinresistenz-Hinweis, oft bevor die Glukose steigt.",
      context_factors: ["NÜCHTERN messen", "gemeinsam mit Glukose für HOMA-IR"],
      related: ["glucose", "homa_ir", "hba1c"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    homa_ir: {
      name: "HOMA-IR", category: "metabolic", canonicalUnit: "index", unitMap: null,
      aliases: ["homa", "homa-ir", "homa ir", "insulinresistenz-index"],
      labRange: { low: 0, high: 2 }, direction: "down", derived: true,
      why_it_matters: "Berechneter Insulinresistenz-Index (Glukose × Insulin / 405). Kontext, keine Diagnose — sinnvoll nur mit NÜCHTERN gemessenen Ausgangswerten.",
      context_factors: ["nur aus NÜCHTERN-Glukose + Nüchtern-Insulin gültig", "Formel: (Glukose_mgdl × Insulin) / 405"],
      related: ["glucose", "insulin"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    uric_acid: {
      name: "Harnsäure", category: "metabolic", canonicalUnit: "mg/dL", unitMap: "urate_mgdl",
      aliases: ["harnsäure", "uric acid", "urat", "urate", "harnsaeure"],
      labRange: { low: 3.5, high: 7.2 }, direction: "down",
      why_it_matters: "Hoch bei Gicht-Risiko, verknüpft mit metabolischem Syndrom und Ernährung. Purinreiche Kost, Alkohol und Fructose treiben.",
      context_factors: ["Alkohol/Fleisch/Fructose", "Dehydrierung", "einige Diuretika"],
      related: ["glucose"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    proinsulin: {
      name: "Proinsulin", category: "metabolic", canonicalUnit: "pmol/L", unitMap: null,
      aliases: ["proinsulin"], labRange: { low: 0, high: 10 }, direction: "down",
      why_it_matters: "Vorstufe des Insulins; erhöht bei Beta-Zell-Stress. Spezialmarker, nur mit Kontext sinnvoll.",
      context_factors: ["Spezialmarker", "nüchtern"], related: ["insulin"], goals: ["all"], pathways: ["enhanced"]
    },

    /* ---------- LIVER ---------- */
    alt: {
      name: "ALT (GPT)", category: "liver", canonicalUnit: "U/L", unitMap: null,
      aliases: ["alt", "gpt", "alat", "sgpt", "alanin-aminotransferase", "alanine aminotransferase"],
      labRange: { low: 0, high: 50 }, direction: "down",
      why_it_matters: "Leberzell-Enzym. Hartes Training, Muskelabbau, Alkohol, orale Wirkstoffe und Fettleber erhöhen — nicht automatisch als Leberschaden lesen, aber auch nicht wegwischen.",
      context_factors: ["hartes Training 48–72h vorher erhöht", "Alkohol", "orale 17-alpha-alkylierte Substanzen", "Fettleber"],
      related: ["ast", "ggt", "alp"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    ast: {
      name: "AST (GOT)", category: "liver", canonicalUnit: "U/L", unitMap: null,
      aliases: ["ast", "got", "asat", "sgot", "aspartat-aminotransferase"],
      labRange: { low: 0, high: 50 }, direction: "down",
      why_it_matters: "Auch in Muskel vorhanden — steigt nach intensivem Training oft mit CK zusammen. AST/ALT-Verhältnis gibt Kontext.",
      context_factors: ["Muskelherkunft (Training, CK parallel prüfen)", "Alkohol", "AST/ALT-Ratio"],
      related: ["alt", "ck", "ggt"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    ggt: {
      name: "GGT", category: "liver", canonicalUnit: "U/L", unitMap: null,
      aliases: ["ggt", "gamma-gt", "gamma gt", "γ-gt", "gamma-glutamyltransferase"],
      labRange: { low: 0, high: 60 }, direction: "down",
      why_it_matters: "Sensibel für Alkohol und Gallenwegs-/Lebersbelastung. Weniger vom Training beeinflusst als ALT/AST — daher guter Zusatzkontext.",
      context_factors: ["Alkohol (empfindlich)", "Medikamente", "Gallenwege"],
      related: ["alt", "ast", "alp"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    alp: {
      name: "Alkalische Phosphatase", category: "liver", canonicalUnit: "U/L", unitMap: null,
      aliases: ["alp", "ap", "alkalische phosphatase", "alkaline phosphatase"],
      labRange: { low: 40, high: 130 }, direction: "mid",
      why_it_matters: "Aus Leber/Galle UND Knochen. Kontext entscheidet die Quelle — bei jungen Aktiven oft Knochenumbau.",
      context_factors: ["Knochenumbau", "Gallenwege", "Alter"],
      related: ["ggt", "bilirubin"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    bilirubin: {
      name: "Bilirubin (gesamt)", category: "liver", canonicalUnit: "mg/dL", unitMap: null,
      aliases: ["bilirubin", "gesamtbilirubin", "total bilirubin", "bili"],
      labRange: { low: 0.1, high: 1.2 }, direction: "mid",
      why_it_matters: "Abbauprodukt des Häms. Leicht erhöht oft harmlos (Gilbert-Syndrom, Fasten) — Kontext nötig.",
      context_factors: ["Gilbert-Syndrom (harmlos, häufig)", "Fasten erhöht", "Hämolyse"],
      related: ["alt", "ast"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },

    /* ---------- KIDNEY ---------- */
    creatinine: {
      name: "Kreatinin", category: "kidney", canonicalUnit: "mg/dL", unitMap: "creat_mgdl",
      aliases: ["kreatinin", "creatinine", "krea", "creat"],
      labRange: { low: 0.7, high: 1.3 }, direction: "mid",
      why_it_matters: "Nierenfunktions-Schätzer — aber muskelmasse- und kreatinabhängig. Bei muskulösen/kreatin-supplementierenden Männern oft „hoch“ ohne Nierenproblem. Cystatin C entkoppelt das.",
      context_factors: ["hohe Muskelmasse erhöht", "Kreatin-Supplement erhöht", "Fleischkonsum/Training vor Messung", "Cystatin C zur Entkopplung"],
      related: ["egfr", "cystatin_c", "acr"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    egfr: {
      name: "eGFR", category: "kidney", canonicalUnit: "mL/min/1.73m²", unitMap: null,
      aliases: ["egfr", "gfr", "e-gfr", "glomeruläre filtrationsrate"],
      labRange: { low: 90, high: 200 }, direction: "up",
      why_it_matters: "Geschätzte Filtrationsrate aus Kreatinin — erbt dessen Muskelmasse-Abhängigkeit. Bei sehr muskulösen Männern kann eGFR fälschlich niedrig wirken; Cystatin-C-basiert genauer.",
      context_factors: ["erbt Kreatinin-Verzerrung bei hoher Muskelmasse", "Cystatin-C-eGFR genauer bei Athleten"],
      related: ["creatinine", "cystatin_c"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    cystatin_c: {
      name: "Cystatin C", category: "kidney", canonicalUnit: "mg/L", unitMap: null,
      aliases: ["cystatin c", "cystatin-c", "cystatinc", "cys-c"],
      labRange: { low: 0.5, high: 1.0 }, direction: "down",
      why_it_matters: "Nierenmarker, der NICHT von Muskelmasse abhängt — deshalb bei Athleten/Enhanced der ehrlichere Nierencheck neben Kreatinin.",
      context_factors: ["unabhängig von Muskelmasse", "Schilddrüse/Steroide können beeinflussen"],
      related: ["creatinine", "egfr"], goals: ["all"], pathways: ["performance", "enhanced"]
    },
    acr: {
      name: "Albumin/Kreatinin-Ratio (Urin)", category: "kidney", canonicalUnit: "mg/g", unitMap: null,
      aliases: ["acr", "uacr", "albumin-kreatinin-ratio", "albumin creatinine ratio", "mikroalbumin"],
      labRange: { low: 0, high: 30 }, direction: "down",
      why_it_matters: "Früher Marker für Nierenschädigung (Gefäß-/Blutdruckbelastung), bevor eGFR fällt. Besonders relevant bei Bluthochdruck.",
      context_factors: ["Blutdruck", "Blutzucker", "Training kann transient erhöhen"],
      related: ["creatinine", "egfr"], goals: ["all"], pathways: ["health", "enhanced"]
    },

    /* ---------- HEMATOLOGY ---------- */
    hemoglobin: {
      name: "Hämoglobin", category: "heme", canonicalUnit: "g/dL", unitMap: "hb_gdl",
      aliases: ["hämoglobin", "hemoglobin", "hb", "hgb", "haemoglobin"],
      labRange: { low: 13.5, high: 17.5 }, direction: "mid",
      why_it_matters: "Sauerstoffträger. Zu niedrig = Anämie-Kontext; zu hoch relevant besonders unter TRT/Enhanced (Blutviskosität).",
      context_factors: ["Dehydrierung erhöht scheinbar", "TRT/Enhanced erhöht", "Höhe", "Eisenstatus"],
      related: ["hematocrit", "rbc", "ferritin"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    hematocrit: {
      name: "Hämatokrit", category: "heme", canonicalUnit: "%", unitMap: null,
      aliases: ["hämatokrit", "hematocrit", "hkt", "hct", "haematokrit"],
      labRange: { low: 40, high: 52 }, direction: "mid",
      why_it_matters: "Anteil zellulärer Bestandteile am Blut. Steigender Hämatokrit unter TRT/Enhanced erhöht die Blutviskosität und die kardiovaskuläre Last — als Trend eng verfolgen.",
      context_factors: ["Dehydrierung erhöht", "TRT/Enhanced treibt hoch", "Höhe", "als TREND lesen"],
      related: ["hemoglobin", "rbc"], goals: ["all"], pathways: ["health", "performance", "enhanced"],
      crit: { high: 54, dir: "high", note: "Deutlich erhöhter Hämatokrit — Blutviskosität/Blutdruck ärztlich prüfen, besonders unter TRT/Enhanced." }
    },
    rbc: {
      name: "Erythrozyten (RBC)", category: "heme", canonicalUnit: "10⁶/µL", unitMap: null,
      aliases: ["rbc", "erythrozyten", "erys", "red blood cells", "erythrocyten"],
      labRange: { low: 4.3, high: 5.9 }, direction: "mid",
      why_it_matters: "Zahl roter Blutkörperchen — begleitet Hämoglobin/Hämatokrit. Relevanter Trend unter Enhanced.",
      context_factors: ["Hydratation", "TRT/Enhanced", "Eisen"],
      related: ["hemoglobin", "hematocrit"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    wbc: {
      name: "Leukozyten (WBC)", category: "heme", canonicalUnit: "10³/µL", unitMap: null,
      aliases: ["wbc", "leukozyten", "leukos", "white blood cells"],
      labRange: { low: 4, high: 10 }, direction: "mid",
      why_it_matters: "Immunzellen — akut erhöht bei Infekt/Entzündung, kann nach hartem Training kurzzeitig steigen.",
      context_factors: ["akuter Infekt", "hartes Training", "Stress"],
      related: ["hs_crp"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    platelets: {
      name: "Thrombozyten", category: "heme", canonicalUnit: "10³/µL", unitMap: null,
      aliases: ["thrombozyten", "platelets", "plt", "thrombos"],
      labRange: { low: 150, high: 400 }, direction: "mid",
      why_it_matters: "Blutgerinnung. Kontextmarker; im Enhanced-Monitoring Teil des Gerinnungs-/Viskositätsbildes.",
      context_factors: ["Entzündung", "Enhanced-Kontext"],
      related: ["hematocrit"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    ferritin: {
      name: "Ferritin", category: "heme", canonicalUnit: "ng/mL", unitMap: "ferritin_ngml",
      aliases: ["ferritin"], labRange: { low: 30, high: 400 }, direction: "mid",
      why_it_matters: "Eisenspeicher — aber auch Akutphase-Protein: steigt bei Entzündung/Infekt/hartem Training unabhängig vom Eisen. Niedrig = echter Speichermangel (auch bei „normalem“ Hb).",
      context_factors: ["Akutphase: Entzündung erhöht trotz Eisenmangel", "hartes Training", "mit Transferrinsättigung lesen"],
      related: ["iron", "tsat", "hemoglobin"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    iron: {
      name: "Eisen (Serum)", category: "heme", canonicalUnit: "µg/dL", unitMap: "iron_ugdl",
      aliases: ["eisen", "iron", "serumeisen", "fe"],
      labRange: { low: 60, high: 170 }, direction: "mid",
      why_it_matters: "Momentaufnahme, stark tagesschwankend — allein wenig aussagekräftig, nur mit Ferritin und Transferrinsättigung.",
      context_factors: ["starke Tagesschwankung", "Nahrungseisen", "nur im Verbund lesen"],
      related: ["ferritin", "tsat"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    tsat: {
      name: "Transferrinsättigung", category: "heme", canonicalUnit: "%", unitMap: null,
      aliases: ["transferrinsättigung", "tsat", "transferrin saturation", "tf-sättigung", "sättigung"],
      labRange: { low: 20, high: 45 }, direction: "mid",
      why_it_matters: "Verhältnis von Eisen zur Transportkapazität. Hoch kann auf Eisenüberladung (z. B. Hämochromatose) hinweisen — dann KEIN Eisen supplementieren.",
      context_factors: ["hoch → Überladung möglich (Hämochromatose abklären)", "niedrig → Mangel", "nüchtern morgens genauer"],
      related: ["ferritin", "iron"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },

    /* ---------- HORMONES ---------- */
    total_testosterone: {
      name: "Gesamttestosteron", category: "hormones", canonicalUnit: "ng/dL", unitMap: "testo_ngdl",
      aliases: ["testosteron", "testosterone", "gesamttestosteron", "total testosterone", "testo gesamt", "gesamt-testosteron", "t total", "testo"],
      labRange: { low: 264, high: 916 }, direction: "mid", timeMatters: true,
      why_it_matters: "Ein einzelner Wert ohne Tageszeit, SHBG und freien Anteil ist oft unvollständige Information. Morgens (7–10 Uhr) messen. Nie auf „hoch/niedrig“ reduzieren.",
      context_factors: ["MORGENS 7–10 Uhr messen (Tagesrhythmus)", "SHBG + freies T für Interpretation nötig", "TRT-Status", "Krankheit/Schlaf senken akut"],
      related: ["free_testosterone", "shbg", "lh", "fsh", "estradiol"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    free_testosterone: {
      name: "Freies Testosteron", category: "hormones", canonicalUnit: "pg/mL", unitMap: null,
      aliases: ["freies testosteron", "free testosterone", "free t", "freies t", "ft"],
      labRange: { low: 50, high: 210 }, direction: "mid", timeMatters: true, derived: true,
      why_it_matters: "Der biologisch verfügbare Anteil. Kann aus Gesamt-T + SHBG + Albumin berechnet werden (Vermeulen) — MaleMetrix zeigt die Methode offen an, statt eine Blackbox-Zahl.",
      context_factors: ["berechenbar aus Gesamt-T, SHBG, Albumin (Vermeulen)", "direkt gemessen (Dialyse) am genauesten", "MORGENS"],
      related: ["total_testosterone", "shbg"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    shbg: {
      name: "SHBG", category: "hormones", canonicalUnit: "nmol/L", unitMap: "shbg_nmoll",
      aliases: ["shbg", "sexualhormon-bindendes globulin", "sex hormone binding globulin"],
      labRange: { low: 18, high: 54 }, direction: "mid",
      why_it_matters: "Bindet Testosteron und bestimmt, wie viel frei verfügbar ist. Hohes SHBG kann bei „normalem“ Gesamt-T zu niedrigem freien T führen — deshalb nie Gesamt-T allein lesen.",
      context_factors: ["hoch → weniger freies T", "niedrig bei Insulinresistenz/Adipositas", "Schilddrüse beeinflusst"],
      related: ["total_testosterone", "free_testosterone"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    estradiol: {
      name: "Estradiol (E2)", category: "hormones", canonicalUnit: "pg/mL", unitMap: "estradiol_pgml",
      aliases: ["estradiol", "e2", "östradiol", "oestradiol"],
      labRange: { low: 10, high: 40 }, direction: "mid",
      why_it_matters: "Beim Mann wichtig für Knochen, Libido und Wohlbefinden — zu niedrig ist ebenso ein Problem wie zu hoch. Unter Enhanced/TRT eng an T gekoppelt. Sensitiver Assay bei Männern bevorzugt.",
      context_factors: ["sensitiver Assay bei Männern genauer", "steigt mit T/Aromatisierung", "Körperfett erhöht", "TRT/Enhanced-Kontext"],
      related: ["total_testosterone", "shbg"], goals: ["all"], pathways: ["performance", "enhanced"]
    },
    lh: {
      name: "LH", category: "hormones", canonicalUnit: "IU/L", unitMap: null,
      aliases: ["lh", "luteinisierendes hormon", "luteinizing hormone"],
      labRange: { low: 1.7, high: 8.6 }, direction: "mid",
      why_it_matters: "Signal der Hypophyse an die Hoden. Unter exogenem T/Enhanced typischerweise unterdrückt — wichtig für das Verständnis der eigenen Achse und der Fertilität.",
      context_factors: ["unter exogenem T unterdrückt", "primäre vs. sekundäre Ursache", "Fertilitätskontext"],
      related: ["fsh", "total_testosterone"], goals: ["all"], pathways: ["health", "enhanced"]
    },
    fsh: {
      name: "FSH", category: "hormones", canonicalUnit: "IU/L", unitMap: null,
      aliases: ["fsh", "follikelstimulierendes hormon", "follicle stimulating hormone"],
      labRange: { low: 1.5, high: 12.4 }, direction: "mid",
      why_it_matters: "Steuert die Spermienproduktion. Unter Enhanced unterdrückt — zentral für Fertilitätsplanung.",
      context_factors: ["unter exogenem T unterdrückt", "Fertilität/Spermatogenese"],
      related: ["lh", "total_testosterone"], goals: ["all"], pathways: ["health", "enhanced"]
    },
    prolactin: {
      name: "Prolaktin", category: "hormones", canonicalUnit: "ng/mL", unitMap: null,
      aliases: ["prolaktin", "prolactin", "prl"],
      labRange: { low: 4, high: 15 }, direction: "mid",
      why_it_matters: "Erhöht kann Libido/Erektion und die T-Achse dämpfen. Stress und Schlafmangel erhöhen transient — deutliche/anhaltende Erhöhung ärztlich abklären.",
      context_factors: ["Stress/Sport/Sex vor Messung erhöht", "morgens nüchtern", "anhaltend hoch → abklären"],
      related: ["total_testosterone"], goals: ["all"], pathways: ["health", "enhanced"]
    },
    dht: {
      name: "DHT", category: "hormones", canonicalUnit: "ng/dL", unitMap: null,
      aliases: ["dht", "dihydrotestosteron", "dihydrotestosterone"],
      labRange: { low: 30, high: 85 }, direction: "mid",
      why_it_matters: "Potentes Androgen (Haare, Prostata, Libido). Kontextmarker, v. a. im Enhanced-/Haarausfall-Kontext.",
      context_factors: ["5-alpha-Reduktase-Hemmer senken", "Enhanced-Kontext"],
      related: ["total_testosterone"], goals: ["all"], pathways: ["enhanced"]
    },

    /* ---------- THYROID ---------- */
    tsh: {
      name: "TSH", category: "thyroid", canonicalUnit: "mIU/L", unitMap: null,
      aliases: ["tsh", "thyreotropin", "thyroid stimulating hormone", "basales tsh"],
      labRange: { low: 0.4, high: 4.0 }, direction: "mid",
      why_it_matters: "Steuerhormon der Schilddrüse. „Optimales TSH = X für alle“ ist ein Mythos — Interpretation braucht fT4/fT3, Symptome und ggf. Medikationskontext.",
      context_factors: ["kein universelles „Optimum“", "mit fT4/fT3 lesen", "Schilddrüsenmedikation", "Tagesschwankung"],
      related: ["ft4", "ft3", "tpo_ab"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    ft4: {
      name: "freies T4 (fT4)", category: "thyroid", canonicalUnit: "ng/dL", unitMap: null,
      aliases: ["ft4", "freies t4", "free t4", "ft-4", "ft 4"],
      labRange: { low: 0.8, high: 1.8 }, direction: "mid",
      why_it_matters: "Speicherform des Schilddrüsenhormons. Mit TSH zusammen zeigt es, ob die Achse zentral oder peripher aus dem Takt ist.",
      context_factors: ["mit TSH interpretieren", "Medikation"],
      related: ["tsh", "ft3"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    ft3: {
      name: "freies T3 (fT3)", category: "thyroid", canonicalUnit: "pg/mL", unitMap: null,
      aliases: ["ft3", "freies t3", "free t3", "ft-3", "ft 3"],
      labRange: { low: 2.3, high: 4.2 }, direction: "mid",
      why_it_matters: "Aktives Schilddrüsenhormon. Sinkt oft in starkem Kaloriendefizit/hartem Training (Adaptation) — Kontext beachten.",
      context_factors: ["fällt in starkem Defizit", "hartes Training", "Konversion aus T4"],
      related: ["tsh", "ft4"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    tpo_ab: {
      name: "TPO-Antikörper", category: "thyroid", canonicalUnit: "IU/mL", unitMap: null,
      aliases: ["tpo-ak", "tpo antikörper", "tpo antibodies", "anti-tpo", "tpo-antikörper", "mak"],
      labRange: { low: 0, high: 34 }, direction: "down",
      why_it_matters: "Erhöht bei autoimmuner Schilddrüsenentzündung (Hashimoto). Einmal-Kontext für die Ursache eines auffälligen TSH.",
      context_factors: ["Autoimmunkontext (Hashimoto)", "einmalig sinnvoll"],
      related: ["tsh"], goals: ["all"], pathways: ["health", "enhanced"], onceEnough: true
    },

    /* ---------- NUTRIENT STATUS ---------- */
    vitamin_d: {
      name: "Vitamin D (25-OH)", category: "nutrients", canonicalUnit: "ng/mL", unitMap: "vitd_ngml",
      aliases: ["vitamin d", "vitd", "25-oh-d", "25 oh vitamin d", "25-hydroxyvitamin d", "calcidiol", "vit d", "vitamin d3"],
      labRange: { low: 30, high: 60 }, direction: "up",
      why_it_matters: "Häufiger Mangel, besonders im Winter. Steuert Knochen, Immunsystem, Stimmung. Ideal per Blutwert dosieren statt blind hochdosieren.",
      context_factors: ["Sonnenexposition/Jahreszeit", "Supplementierung", "Körperfett bindet"],
      related: ["magnesium"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    b12: {
      name: "Vitamin B12", category: "nutrients", canonicalUnit: "pg/mL", unitMap: "b12_pgml",
      aliases: ["b12", "vitamin b12", "cobalamin", "holo-tc", "holotranscobalamin"],
      labRange: { low: 200, high: 900 }, direction: "up",
      why_it_matters: "Wichtig für Blutbildung und Nerven. Niedrig v. a. bei wenig tierischen Produkten. Holo-TC oder MMA sind sensibler als Serum-B12.",
      context_factors: ["vegetarisch/vegan", "Metformin/PPI senken", "Holo-TC/MMA sensitiver"],
      related: ["folate"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    folate: {
      name: "Folsäure", category: "nutrients", canonicalUnit: "ng/mL", unitMap: null,
      aliases: ["folsäure", "folate", "folat", "folacin", "vitamin b9"],
      labRange: { low: 3, high: 20 }, direction: "up",
      why_it_matters: "Zusammen mit B12 für Blutbildung und Homocystein-Stoffwechsel relevant.",
      context_factors: ["Ernährung", "mit B12 interpretieren"],
      related: ["b12"], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    magnesium: {
      name: "Magnesium", category: "nutrients", canonicalUnit: "mg/dL", unitMap: null,
      aliases: ["magnesium", "mg (serum)", "serum-magnesium"],
      labRange: { low: 1.7, high: 2.4 }, direction: "mid",
      why_it_matters: "Serum-Magnesium bildet den Gesamtstatus nur grob ab (viel ist intrazellulär) — als grober Kontext, nicht als Feinsteuerung.",
      context_factors: ["Serum bildet Gesamtstatus nur grob ab", "Supplementierung"],
      related: [], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },
    zinc: {
      name: "Zink", category: "nutrients", canonicalUnit: "µg/dL", unitMap: null,
      aliases: ["zink", "zinc", "zn"], labRange: { low: 70, high: 120 }, direction: "mid",
      why_it_matters: "Beteiligt an Immunfunktion und Hormonhaushalt. Serumwert schwankt; nur grober Kontext.",
      context_factors: ["Serum schwankt", "Ernährung/Supplement"],
      related: [], goals: ["all"], pathways: ["health", "performance", "enhanced"]
    },

    /* ---------- PERFORMANCE / RECOVERY ---------- */
    ck: {
      name: "Kreatinkinase (CK)", category: "performance", canonicalUnit: "U/L", unitMap: null,
      aliases: ["ck", "creatinkinase", "kreatinkinase", "cpk", "creatine kinase"],
      labRange: { low: 30, high: 200 }, direction: "mid",
      why_it_matters: "Muskelenzym — steigt nach intensivem/ungewohntem Training oft stark und harmlos. Ohne Trainingskontext ist ein hoher CK-Wert leicht fehlinterpretiert.",
      context_factors: ["hartes/ungewohntes Training 24–72h vorher erhöht massiv", "kann AST/ALT mitziehen", "Trainingskontext notieren"],
      related: ["ast", "alt"], goals: ["build", "perform"], pathways: ["performance", "enhanced"]
    },
    cortisol: {
      name: "Cortisol (morgens)", category: "performance", canonicalUnit: "µg/dL", unitMap: null,
      aliases: ["cortisol", "kortisol", "morgencortisol", "serum cortisol"],
      labRange: { low: 6, high: 18.4 }, direction: "mid", timeMatters: true,
      why_it_matters: "Stresshormon mit starkem Tagesrhythmus — nur morgens (7–9 Uhr) sinnvoll vergleichbar. Chronisch hoch koppelt an Schlaf/Übertraining.",
      context_factors: ["TAGESZEIT entscheidend (morgens)", "akuter Stress erhöht", "Schlaf/Übertraining"],
      related: [], goals: ["perform"], pathways: ["performance", "enhanced"]
    },

    /* ---------- PROSTATE ---------- */
    psa: {
      name: "PSA", category: "prostate", canonicalUnit: "ng/mL", unitMap: null,
      aliases: ["psa", "prostata-spezifisches antigen", "prostate specific antigen", "psa total"],
      labRange: { low: 0, high: 4 }, direction: "down",
      why_it_matters: "Prostata-Verlaufsmarker — KEINE Krebsdiagnose. Trend und Alterskontext zählen; Fahrradfahren/Ejakulation/Entzündung erhöhen transient. Änderungen ärztlich einordnen.",
      context_factors: ["Alter", "Ejakulation/Radfahren 48h vorher erhöht", "Prostatitis", "TRT-Kontext", "als TREND lesen"],
      related: [], goals: ["all"], pathways: ["health", "enhanced"]
    }
  };

  /* alias lookup (lazy) */
  var _aliasIndex = null;
  function aliasIndex() {
    if (_aliasIndex) return _aliasIndex;
    _aliasIndex = {};
    Object.keys(MARKERS).forEach(function (id) {
      _aliasIndex[id] = id;
      _aliasIndex[normUnitStr(MARKERS[id].name)] = id;
      (MARKERS[id].aliases || []).forEach(function (a) { _aliasIndex[normUnitStr(a)] = id; });
    });
    return _aliasIndex;
  }
  function canonicalMarkerId(nameOrAlias) {
    if (!nameOrAlias) return null;
    var key = normUnitStr(nameOrAlias);
    var idx = aliasIndex();
    if (idx[key]) return idx[key];
    // Fallback: strip Klammern/Punkte
    var stripped = key.replace(/[().\-_/]/g, "");
    var hit = null;
    Object.keys(idx).forEach(function (k) { if (k.replace(/[().\-_/]/g, "") === stripped) hit = idx[k]; });
    return hit;
  }
  function marker(id) { return MARKERS[id] || null; }
  function markerName(id) { return (MARKERS[id] && MARKERS[id].name) || id; }

  /* =====================================================================
     DATENMODELL — panels + results. History unveränderlich (append).
     lab_panels: {id, date, lab, fasted, note, source, created}
     lab_results: {id, panel_id, marker_id, value, unit, canonical{value,unit},
                   reference_low, reference_high, lab_reference_text, date,
                   fasted, source, confidence, notes, assay, sample, created}
     ===================================================================== */
  function panels() { var p = S.get("lab_panels", []); return Array.isArray(p) ? p : []; }
  function results() { var r = S.get("lab_results", []); return Array.isArray(r) ? r : []; }
  function labNotes() { var n = S.get("lab_notes", []); return Array.isArray(n) ? n : []; }
  function savePanels(p) { S.set("lab_panels", p); }
  function saveResults(r) { S.set("lab_results", r); }

  function uid(prefix) {
    // deterministisch genug ohne Math.random: Zeit + Zähler + Inhalt
    var c = S.get("lab_seq", 0) || 0; c++; S.set("lab_seq", c);
    return (prefix || "id") + "_" + c + "_" + String(Date.now ? "" : "");
  }
  // Panel-Identität: gleicher Tag + gleiches Labor = gleiches Panel.
  function panelKey(date, lab) { return normUnitStr(date) + "|" + normUnitStr(lab || ""); }
  function findPanel(date, lab) { return panels().filter(function (p) { return panelKey(p.date, p.lab) === panelKey(date, lab); })[0] || null; }

  function createPanel(data) {
    data = data || {};
    var date = data.date || todayYmd();
    var existing = findPanel(date, data.lab);
    if (existing) return existing;          // IMPORT MATCHING: kein Duplikat-Panel
    var p = { id: uid("panel"), date: date, lab: data.lab || "", fasted: data.fasted == null ? null : !!data.fasted, note: data.note || "", source: data.source || "manual", created: todayYmd() };
    var all = panels(); all.push(p); savePanels(all);
    emitLab("LAB_PANEL_CREATED", { panel_id: p.id, date: p.date });
    return p;
  }

  /* DUPLIKATERKENNUNG: gleicher marker+date+value(+unit) → Duplikat. */
  function isDuplicateResult(markerId, value, unit, date) {
    var v = parseFloat(value);
    return results().some(function (r) {
      return r.marker_id === markerId && r.date === date &&
        Math.abs(parseFloat(r.value) - v) < 1e-9 && normUnitStr(r.unit) === normUnitStr(unit || "");
    });
  }

  /* addResult — kernige Append-Operation. Bewahrt Original, normalisiert für
     Vergleich. Confidence: 'manual' | 'parsed_confirmed' | 'imported'. */
  function addResult(input) {
    input = input || {};
    var mid = input.marker_id || canonicalMarkerId(input.name);
    if (!mid || !MARKERS[mid]) return { ok: false, code: "unknown_marker", name: input.name };
    if (input.value == null || isNaN(parseFloat(input.value))) return { ok: false, code: "no_value" };
    var date = input.date || todayYmd();
    if (isDuplicateResult(mid, input.value, input.unit, date) && !input.allowDuplicate) return { ok: false, code: "duplicate", marker_id: mid };
    var panel = input.panel_id ? panels().filter(function (p) { return p.id === input.panel_id; })[0] : createPanel({ date: date, lab: input.lab, fasted: input.fasted, source: input.source });
    if (!panel) panel = createPanel({ date: date, lab: input.lab, fasted: input.fasted });
    var canon = toCanonical(mid, input.value, input.unit);
    var res = {
      id: uid("res"), panel_id: panel.id, marker_id: mid,
      value: parseFloat(input.value), unit: input.unit || MARKERS[mid].canonicalUnit,
      canonical: { value: canon.value, unit: canon.unit }, converted: canon.converted, unknownUnit: canon.unknownUnit,
      reference_low: input.reference_low != null ? parseFloat(input.reference_low) : null,
      reference_high: input.reference_high != null ? parseFloat(input.reference_high) : null,
      lab_reference_text: input.lab_reference_text || "",
      date: date, fasted: input.fasted == null ? (panel.fasted) : !!input.fasted,
      source: input.source || "manual",
      confidence: input.confidence || "manual",
      notes: input.notes || "", assay: input.assay || "", sample: input.sample || "",
      sample_time: input.sample_time || "",
      created: todayYmd()
    };
    var all = results(); all.push(res); saveResults(all);
    emitLab("LAB_RESULT_ADDED", { marker_id: mid, panel_id: panel.id, value: res.value });
    // HOMA-IR ableiten, falls Glukose+Insulin am selben Panel nüchtern vorliegen.
    maybeDeriveHoma(panel.id);
    // Freies T ableiten, falls Gesamt-T + SHBG am selben Panel.
    maybeDeriveFreeT(panel.id);
    // Trend-Änderung als Event (für Today/NBA/Progress)
    var tr = trend(mid);
    if (tr && tr.status && tr.status !== "STABLE" && tr.points >= 2) emitLab("LAB_TREND_CHANGED", { marker_id: mid, status: tr.status });
    return { ok: true, result: res, panel: panel, canonical: canon };
  }

  function updateResult(id, patch) {
    var all = results(); var idx = all.findIndex(function (r) { return r.id === id; });
    if (idx < 0) return { ok: false, code: "not_found" };
    var r = all[idx];
    if (patch.value != null) { r.value = parseFloat(patch.value); var c = toCanonical(r.marker_id, r.value, patch.unit || r.unit); r.canonical = { value: c.value, unit: c.unit }; r.converted = c.converted; }
    if (patch.unit != null) { r.unit = patch.unit; var c2 = toCanonical(r.marker_id, r.value, r.unit); r.canonical = { value: c2.value, unit: c2.unit }; r.converted = c2.converted; }
    ["reference_low", "reference_high", "lab_reference_text", "notes", "fasted", "confidence", "sample_time"].forEach(function (k) { if (patch[k] !== undefined) r[k] = (k === "reference_low" || k === "reference_high") ? (patch[k] == null ? null : parseFloat(patch[k])) : patch[k]; });
    r.updated = todayYmd();
    all[idx] = r; saveResults(all);
    emitLab("LAB_RESULT_UPDATED", { id: id, marker_id: r.marker_id });
    return { ok: true, result: r };
  }
  function deleteResult(id) {
    var all = results(); var next = all.filter(function (r) { return r.id !== id; });
    if (next.length === all.length) return { ok: false };
    saveResults(next); return { ok: true };
  }

  /* derived: HOMA-IR (nur nüchtern & plausibel) */
  function maybeDeriveHoma(panelId) {
    var rs = resultsForPanel(panelId);
    var g = rs.filter(function (r) { return r.marker_id === "glucose"; })[0];
    var ins = rs.filter(function (r) { return r.marker_id === "insulin"; })[0];
    if (!g || !ins) return;
    if (rs.some(function (r) { return r.marker_id === "homa_ir" && r.derivedFrom; })) return;
    // nur nüchtern
    if (g.fasted === false || ins.fasted === false) return;
    var gv = (g.canonical && g.canonical.value) || g.value; // mg/dL
    var homa = round((gv * ins.value) / 405, 2);
    var all = results();
    all.push({ id: uid("res"), panel_id: panelId, marker_id: "homa_ir", value: homa, unit: "index", canonical: { value: homa, unit: "index" }, converted: false, reference_low: 0, reference_high: 2, lab_reference_text: "", date: g.date, fasted: true, source: "derived", confidence: "manual", derivedFrom: ["glucose", "insulin"], notes: "berechnet (Glukose×Insulin/405)", created: todayYmd() });
    saveResults(all);
  }
  /* derived: freies Testosteron (Vermeulen, dokumentierte Formel) */
  function calcFreeTestosterone(totalNgdl, shbgNmoll, albuminGdl) {
    // Vermeulen 1999. total in ng/dL → nmol/L (/28.84). Albumin default 4.3 g/dL.
    var alb = albuminGdl != null ? albuminGdl : 4.3;
    var Tt = totalNgdl / 28.84;            // nmol/L
    var Ka = 3.6e4, Kshbg = 1e9;           // Assoziationskonstanten (L/mol)
    var SHBG = shbgNmoll * 1e-9;           // mol/L
    var N = Ka * (alb * 10 / 66500) + 1;   // Albumin g/dL→g/L /MW
    var a = N * Kshbg;
    var b = N + Kshbg * (SHBG - Tt * 1e-9);
    var c = -Tt * 1e-9;
    var FT = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);  // mol/L
    var ftNmol = FT * 1e9;
    var ftPgml = ftNmol * 288.4;           // nmol/L → pg/mL (×288.4)
    return { pgml: round(ftPgml, 1), nmol: round(ftNmol, 3), method: "Vermeulen (calc.)", albumin: alb };
  }
  function maybeDeriveFreeT(panelId) {
    var rs = resultsForPanel(panelId);
    var tt = rs.filter(function (r) { return r.marker_id === "total_testosterone"; })[0];
    var shbg = rs.filter(function (r) { return r.marker_id === "shbg"; })[0];
    if (!tt || !shbg) return;
    if (rs.some(function (r) { return r.marker_id === "free_testosterone"; })) return; // schon gemessen/berechnet
    var ttNgdl = (tt.canonical && tt.canonical.value) || tt.value;
    var shbgNmol = (shbg.canonical && shbg.canonical.value) || shbg.value;
    var alb = rs.filter(function (r) { return r.marker_id === "albumin"; })[0];
    var ft = calcFreeTestosterone(ttNgdl, shbgNmol, alb ? alb.value : null);
    var all = results();
    all.push({ id: uid("res"), panel_id: panelId, marker_id: "free_testosterone", value: ft.pgml, unit: "pg/mL", canonical: { value: ft.pgml, unit: "pg/mL" }, converted: false, reference_low: 50, reference_high: 210, lab_reference_text: "", date: tt.date, fasted: tt.fasted, source: "derived", confidence: "manual", derivedFrom: ["total_testosterone", "shbg"], notes: "berechnet nach Vermeulen (Albumin " + ft.albumin + " g/dL)", method: ft.method, created: todayYmd() });
    saveResults(all);
  }

  function resultsForPanel(panelId) { return results().filter(function (r) { return r.panel_id === panelId; }); }
  function seriesFor(markerId) {
    return results().filter(function (r) { return r.marker_id === markerId; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }
  function latestFor(markerId) { var s = seriesFor(markerId); return s.length ? s[s.length - 1] : null; }
  function firstFor(markerId) { var s = seriesFor(markerId); return s.length ? s[0] : null; }
  function markersPresent() {
    var set = {}; results().forEach(function (r) { set[r.marker_id] = true; });
    return Object.keys(set);
  }

  /* =====================================================================
     TREND ENGINE + STATUS
     Signifikanz: absolute UND prozentuale Änderung + markerspezifische
     Mindest-Schwelle (biologische Variabilität grob). Kein Alarm bei Rauschen.
     ===================================================================== */
  // grobe „noise floor“ pro Marker (relative %-Schwelle, unter der eine
  // Änderung als nicht bedeutsam gilt). Quelle: typische analytische+
  // biologische Variabilität; bewusst konservativ, dokumentiert.
  var NOISE_PCT = {
    apo_b: 8, ldl_c: 10, hdl_c: 8, triglycerides: 20, non_hdl: 9, lp_a: 10, hs_crp: 40,
    glucose: 6, hba1c: 3, insulin: 25, homa_ir: 25, uric_acid: 9,
    alt: 20, ast: 20, ggt: 15, alp: 8, bilirubin: 20,
    creatinine: 8, egfr: 8, cystatin_c: 8, acr: 30,
    hemoglobin: 4, hematocrit: 4, rbc: 4, wbc: 15, platelets: 10, ferritin: 15, iron: 25, tsat: 20,
    total_testosterone: 12, free_testosterone: 14, shbg: 12, estradiol: 15, lh: 20, fsh: 20, prolactin: 20, dht: 15,
    tsh: 20, ft4: 10, ft3: 10, tpo_ab: 25,
    vitamin_d: 12, b12: 15, folate: 20, magnesium: 6, zinc: 12,
    ck: 40, cortisol: 20, psa: 20
  };
  function noiseFloor(markerId) { return NOISE_PCT[markerId] != null ? NOISE_PCT[markerId] : 12; }

  // „besser“-Richtung: gibt +1 wenn Änderung Richtung besser, -1 schlechter, 0 neutral
  function directionSign(markerId, delta) {
    var m = MARKERS[markerId]; if (!m || delta === 0) return 0;
    if (m.direction === "down") return delta < 0 ? 1 : -1;
    if (m.direction === "up") return delta > 0 ? 1 : -1;
    return 0; // mid: Richtung allein sagt nichts über besser/schlechter
  }

  function refFor(res) {
    var m = MARKERS[res.marker_id] || {};
    var low = res.reference_low != null ? res.reference_low : (m.labRange ? m.labRange.low : null);
    var high = res.reference_high != null ? res.reference_high : (m.labRange ? m.labRange.high : null);
    return { low: low, high: high, fromLab: res.reference_low != null || res.reference_high != null };
  }
  function outsideLabRange(res) {
    var r = refFor(res); var v = (res.canonical && res.canonical.value != null) ? res.canonical.value : res.value;
    if (r.low != null && v < r.low) return "low";
    if (r.high != null && v > r.high) return "high";
    return null;
  }

  // trend(markerId) → {points, current, previous, first, delta, pct, dirSign,
  //   significant, status, outside, crit, series[]}
  function trend(markerId) {
    var s = seriesFor(markerId); if (!s.length) return null;
    var cur = s[s.length - 1];
    var curV = (cur.canonical && cur.canonical.value != null) ? cur.canonical.value : cur.value;
    var outside = outsideLabRange(cur);
    var crit = criticalFlag(markerId, cur);
    var out = { points: s.length, current: cur, currentValue: curV, series: s, outside: outside, crit: crit, marker_id: markerId };
    if (s.length < 2) {
      out.status = outside ? "OUTSIDE_LAB_RANGE" : (MARKERS[markerId] && MARKERS[markerId].timeMatters ? "CONTEXT_DEPENDENT" : "STABLE");
      out.significant = false; out.delta = null; out.pct = null;
      out.single = true;
      return out;
    }
    var prev = s[s.length - 2];
    var prevV = (prev.canonical && prev.canonical.value != null) ? prev.canonical.value : prev.value;
    var delta = round(curV - prevV, 3);
    var pct = prevV !== 0 ? round((delta / Math.abs(prevV)) * 100, 1) : null;
    var floor = noiseFloor(markerId);
    var significant = pct != null && Math.abs(pct) >= floor;
    var dsign = directionSign(markerId, delta);
    out.previous = prev; out.previousValue = prevV; out.first = s[0];
    out.delta = delta; out.pct = pct; out.dirSign = dsign; out.significant = significant;
    // Status-Kaskade
    if (!significant) out.status = outside ? "OUTSIDE_LAB_RANGE" : "STABLE";
    else if (dsign > 0) out.status = "IMPROVING";
    else if (dsign < 0) out.status = "WORSENING";
    else out.status = "CONTEXT_DEPENDENT";  // mid-Marker mit signifikanter, aber nicht wertbarer Bewegung
    // Follow-up-Overlay: außerhalb Range + verschlechternd/über krit → NEEDS_FOLLOWUP
    if (crit) out.status = "NEEDS_FOLLOWUP";
    else if (outside && (dsign < 0 || MARKERS[markerId].direction === "mid")) out.needsFollowup = true;
    return out;
  }

  /* KRITISCHE WERTE — NUR quellenbasierte, markerspezifische Schwellen.
     Kein erfundener Alarm. Rückgabe {level:'prompt_review', note} oder null. */
  function criticalFlag(markerId, res) {
    var m = MARKERS[markerId]; if (!m || !m.crit) return null;
    var v = (res.canonical && res.canonical.value != null) ? res.canonical.value : res.value;
    if (m.crit.dir === "high" && v >= m.crit.high) return { level: "prompt_review", note: m.crit.note };
    if (m.crit.dir === "low" && v <= m.crit.low) return { level: "prompt_review", note: m.crit.note };
    return null;
  }

  var STATUS_META = {
    STABLE: { label: "STABIL", tone: "neutral" },
    IMPROVING: { label: "VERBESSERT", tone: "good" },
    WORSENING: { label: "VERSCHLECHTERT", tone: "watch" },
    OUTSIDE_LAB_RANGE: { label: "AUSSERHALB LABOR-RANGE", tone: "watch" },
    CONTEXT_DEPENDENT: { label: "KONTEXTABHÄNGIG", tone: "neutral" },
    NEEDS_FOLLOWUP: { label: "FOLLOW-UP", tone: "alert" }
  };

  /* =====================================================================
     CONTEXT ENGINE — interpretiert mit Profil/Pathway/Goal/Medikation.
     Liefert für einen Marker eine Insight-Card-Struktur:
       {what_changed, why_it_matters, could_explain, recheck, discuss}
     ===================================================================== */
  function ctxProfile() {
    var os = OS();
    var p = os ? os.profile() : {};
    var d = (window.MM && MM.account) ? MM.account.getDashboardState() : {};
    return {
      age: (os && os.getP("identity.age", null)) || null,
      sex: (os && os.getP("identity.sex", "male")) || "male",
      pathway: (os && os.pathway()) || "",
      mode: (d && d.mode) || "",
      meds: (os && os.getP("health.medications", [])) || [],
      enhanced: ((os && os.pathway()) === "enhanced") || (os && os.getP("enhanced.active", false)),
      family: (os && os.getP("health.family", [])) || [],
      trainingHard: true
    };
  }
  function hasMed(ctx, re) { return (ctx.meds || []).some(function (m) { return re.test(normUnitStr(m)); }); }

  // insightFor(markerId) → strukturierte Karte, kontextualisiert.
  function insightFor(markerId) {
    var tr = trend(markerId); if (!tr) return null;
    var m = MARKERS[markerId]; var ctx = ctxProfile();
    var cur = tr.current;
    var curV = tr.currentValue;
    var whatChanged;
    if (tr.single) whatChanged = "Erster Messwert: " + fmtVal(cur) + ". Für eine Richtung braucht es einen zweiten Punkt.";
    else if (!tr.significant) whatChanged = "Von " + fmtNum(tr.previousValue) + " auf " + fmtNum(curV) + " " + (cur.canonical.unit || cur.unit) + " — innerhalb der biologischen Streuung (kein bedeutsamer Trend).";
    else whatChanged = (markerName(markerId)) + " " + fmtNum(tr.previousValue) + " → " + fmtNum(curV) + " " + (cur.canonical.unit || cur.unit) + " (" + (tr.pct > 0 ? "+" : "") + tr.pct + " %) — " + STATUS_META[tr.status].label + ".";

    var couldExplain = [];
    (m.context_factors || []).slice(0, 3).forEach(function (f) { couldExplain.push(f); });
    // Medikationskontext
    if (markerId === "ldl_c" || markerId === "apo_b" || markerId === "non_hdl") { if (hasMed(ctx, /statin|ezetimib|rosuva|atorva|simva/)) couldExplain.unshift("Aktuelle lipidsenkende Therapie — diesen Wert im Kontext der Medikation lesen."); }
    if ((markerId === "total_testosterone" || markerId === "hematocrit" || markerId === "estradiol" || markerId === "lh" || markerId === "fsh") && (ctx.enhanced || hasMed(ctx, /trt|testosteron|enanthat|cypionat/))) couldExplain.unshift("Im Kontext einer Testosteron-Therapie/Enhanced-Status zu interpretieren.");
    if ((markerId === "tsh" || markerId === "ft4" || markerId === "ft3") && hasMed(ctx, /l-thyrox|levothyro|schilddrüs|thyreo/)) couldExplain.unshift("Unter Schilddrüsen-Substitution zu bewerten.");
    if (markerId === "creatinine" || markerId === "egfr") { couldExplain.unshift("Hohe Muskelmasse und Kreatin-Supplement heben Kreatinin/senken eGFR — nicht automatisch ein Nierenproblem. Cystatin C entkoppelt das."); }

    var recheck = suggestRecheck(markerId);
    var discuss = [];
    if (tr.crit) discuss.push(tr.crit.note);
    if (tr.status === "WORSENING" && tr.outside) discuss.push("Wert außerhalb der Laborspanne UND verschlechternder Trend — ärztlich einordnen.");
    if (m.category === "prostate" && tr.significant) discuss.push("PSA-Veränderungen gehören ärztlich eingeordnet — keine Selbstdiagnose.");

    return {
      marker_id: markerId, name: markerName(markerId), category: m.category,
      status: tr.status, statusMeta: STATUS_META[tr.status],
      what_changed: whatChanged,
      why_it_matters: m.why_it_matters,
      could_explain: couldExplain,
      recheck: recheck,
      discuss: discuss,
      trend: tr
    };
  }
  function fmtNum(v) { return v == null ? "—" : (Math.round(v * 100) / 100); }
  function fmtVal(res) { return fmtNum((res.canonical && res.canonical.value != null) ? res.canonical.value : res.value) + " " + ((res.canonical && res.canonical.unit) || res.unit || ""); }

  /* =====================================================================
     TOP PRIORITIES — maximal 3. Gewichtung: kritisch > follow-up > außerhalb
     + verschlechternd > verschlechternd > außerhalb. Kontext (Pathway/Enhanced)
     hebt kardiovaskuläre/hämatologische Marker im Enhanced-Pfad.
     ===================================================================== */
  function priorities(limit) {
    limit = limit || 3;
    var ctx = ctxProfile();
    var scored = [];
    markersPresent().forEach(function (mid) {
      var tr = trend(mid); if (!tr) return;
      var m = MARKERS[mid]; var s = 0; var reason = "";
      if (tr.crit) { s += 100; reason = tr.crit.note; }
      if (tr.status === "NEEDS_FOLLOWUP") { s += 40; if (!reason) reason = "Braucht Follow-up."; }
      if (tr.outside && tr.dirSign < 0) { s += 30; if (!reason) reason = "Außerhalb Laborspanne und verschlechternder Trend."; }
      else if (tr.status === "WORSENING") { s += 22; if (!reason) reason = "Verschlechternder Trend."; }
      else if (tr.outside) { s += 16; if (!reason) reason = "Außerhalb der typischen Laborspanne."; }
      if (tr.needsFollowup) s += 8;
      // Recheck überfällig hebt Priorität leicht
      var rc = suggestRecheck(mid); if (rc && rc.due) { s += 10; if (!reason) reason = rc.reason; }
      // Kontext-Gewichtung
      if (ctx.enhanced && (m.category === "cardio" || m.category === "heme")) s += 6;
      if (ctx.mode === "cut" && m.category === "metabolic") s += 3;
      if (s > 0) scored.push({ marker_id: mid, name: markerName(mid), score: s, reason: reason, status: tr.status, trend: tr });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, limit);
  }

  /* =====================================================================
     CATEGORY DASHBOARD — pro Kategorie Zusammenfassung (nicht 80 Zahlen).
     ===================================================================== */
  function categorySummary() {
    var byCat = {};
    Object.keys(CATEGORIES).forEach(function (c) { byCat[c] = { key: c, label: CATEGORIES[c].label, short: CATEGORIES[c].short, region: CATEGORIES[c].region, count: 0, improving: 0, worsening: 0, followup: 0, outside: 0, stable: 0, markers: [] }; });
    markersPresent().forEach(function (mid) {
      var m = MARKERS[mid]; if (!m) return; var cat = m.category; if (!byCat[cat]) return;
      var tr = trend(mid); if (!tr) return;
      var g = byCat[cat]; g.count++;
      g.markers.push({ marker_id: mid, name: m.name, status: tr.status, value: tr.currentValue, unit: (tr.current.canonical && tr.current.canonical.unit) || tr.current.unit });
      if (tr.status === "IMPROVING") g.improving++;
      else if (tr.status === "WORSENING") g.worsening++;
      else if (tr.status === "NEEDS_FOLLOWUP") g.followup++;
      else if (tr.status === "OUTSIDE_LAB_RANGE") g.outside++;
      else g.stable++;
    });
    return Object.keys(byCat).map(function (c) { return byCat[c]; }).filter(function (g) { return g.count > 0; });
  }

  /* =====================================================================
     RECHECK ENGINE — kontextabhängige Fenster (Tage). Keine erfundene
     Universalfrequenz. Fenster nach Marker + Trend + Enhanced-Status.
     ===================================================================== */
  // Basis-Fenster (Tage) — bewusst als Spanne gedacht, hier Mittelwert-Anker.
  var RECHECK_BASE = {
    apo_b: 90, ldl_c: 90, non_hdl: 90, hdl_c: 180, triglycerides: 90, lp_a: 3650, hs_crp: 180,
    glucose: 180, hba1c: 90, insulin: 180, homa_ir: 180, uric_acid: 180,
    alt: 120, ast: 120, ggt: 120, alp: 180, bilirubin: 180,
    creatinine: 180, egfr: 180, cystatin_c: 180, acr: 180,
    hemoglobin: 120, hematocrit: 90, rbc: 120, wbc: 180, platelets: 180, ferritin: 180, iron: 180, tsat: 180,
    total_testosterone: 120, free_testosterone: 120, shbg: 180, estradiol: 120, lh: 180, fsh: 180, prolactin: 180, dht: 180,
    tsh: 180, ft4: 180, ft3: 180, tpo_ab: 3650,
    vitamin_d: 120, b12: 180, folate: 180, magnesium: 180, zinc: 180,
    ck: 60, cortisol: 180, psa: 365
  };
  function suggestRecheck(markerId) {
    var last = latestFor(markerId); if (!last) return null;
    var m = MARKERS[markerId]; if (!m) return null;
    var base = RECHECK_BASE[markerId] != null ? RECHECK_BASE[markerId] : 180;
    var ctx = ctxProfile();
    var tr = trend(markerId);
    // Enhanced verkürzt kardiovaskuläre/hämatologische Fenster
    if (ctx.enhanced && (m.category === "cardio" || m.category === "heme")) base = Math.round(base * 0.6);
    // Verschlechternder/kritischer Trend → früher
    if (tr && (tr.status === "WORSENING" || tr.status === "NEEDS_FOLLOWUP")) base = Math.round(base * 0.5);
    if (m.onceEnough && seriesFor(markerId).length >= 1) {
      return { markerId: markerId, windowDays: base, due: false, once: true, lastDate: last.date, reason: "Einmal messen reicht meist (kaum veränderlich)." };
    }
    var age = daysBetween(last.date, todayYmd());
    var due = age >= base;
    var windowLabel = base >= 365 ? Math.round(base / 365 * 10) / 10 + " Jahr(e)" : base >= 30 ? Math.round(base / 30) + " Monat(e)" : base + " Tage";
    var reason = due
      ? "Letzte Messung vor " + Math.round(age / 7) + " Wochen — Recheck fällig." + (tr && tr.status === "WORSENING" ? " Trend verschlechtert sich." : "")
      : "Nächster Recheck in ~" + Math.max(0, Math.round((base - age) / 7)) + " Wochen.";
    return { markerId: markerId, windowDays: base, windowLabel: windowLabel, due: due, ageDays: age, lastDate: last.date, reason: reason, status: tr ? tr.status : null };
  }
  // Alle fälligen Rechecks (für Today/NBA/Kalender)
  function dueRechecks() {
    return markersPresent().map(suggestRecheck).filter(function (r) { return r && r.due && !r.once; })
      .sort(function (a, b) { return b.ageDays - a.ageDays; });
  }
  // Recheck-Plan nach neuem Panel (kontextbasiert, Spannen wo unsicher)
  function recheckPlan() {
    var present = markersPresent();
    var groups = [
      { key: "lipids", label: "Lipide / ApoB", ids: ["apo_b", "ldl_c", "non_hdl", "triglycerides"] },
      { key: "metabolic", label: "HbA1c / Glukose", ids: ["hba1c", "glucose", "insulin"] },
      { key: "cbc", label: "Blutbild / Hämatokrit", ids: ["hematocrit", "hemoglobin", "rbc"] },
      { key: "hormones", label: "Hormone (T/SHBG/E2)", ids: ["total_testosterone", "shbg", "estradiol"] },
      { key: "liver", label: "Leber (ALT/AST/GGT)", ids: ["alt", "ast", "ggt"] },
      { key: "kidney", label: "Niere (Krea/Cystatin)", ids: ["creatinine", "cystatin_c"] },
      { key: "thyroid", label: "Schilddrüse (TSH/fT4)", ids: ["tsh", "ft4", "ft3"] }
    ];
    var plan = [];
    groups.forEach(function (grp) {
      var owned = grp.ids.filter(function (id) { return present.indexOf(id) >= 0; });
      if (!owned.length) return;
      // frühestes Fenster der Gruppe
      var windows = owned.map(function (id) { var r = suggestRecheck(id); return r ? r.windowDays : 180; });
      var w = Math.min.apply(null, windows);
      var lbl = w >= 365 ? Math.round(w / 30) + " Monate" : w >= 30 ? Math.round(w / 30) + " Monate" : w + " Tage";
      plan.push({ key: grp.key, label: grp.label, windowDays: w, windowLabel: lbl, markers: owned });
    });
    return plan;
  }

  /* =====================================================================
     LAB COMPLETENESS + BLOOD TEST BUILDER
     Personalisiertes Panel: CORE / GOAL-SPECIFIC / ADVANCED / OPTIONAL.
     Input aus Graph (Alter/Pathway/Goal/Familie/Medikation/Enhanced).
     ===================================================================== */
  function buildPanel(opts) {
    opts = opts || {};
    var ctx = ctxProfile();
    var pathway = opts.pathway || ctx.pathway || "health";
    var mode = opts.mode || ctx.mode || "";
    var family = opts.family || ctx.family || [];
    var enhanced = pathway === "enhanced" || opts.enhanced;
    function m(id, why, freq) { return { marker_id: id, name: markerName(id), why: why, frequency: freq }; }
    var core = [
      m("hemoglobin", "Blutbild-Basis (CBC) — Sauerstofftransport, Anämie-Kontext.", "jährlich"),
      m("hematocrit", "Teil des CBC — besonders unter Enhanced wichtig.", enhanced ? "alle 8–12 Wochen" : "jährlich"),
      m("glucose", "Metabolische Basis — nüchtern.", "jährlich"),
      m("hba1c", "Ø Blutzucker 3 Monate — robuster als Einzelwert.", "jährlich"),
      m("alt", "Leber-Basis.", "jährlich"),
      m("creatinine", "Nieren-Basis (mit Muskelmasse-Kontext).", "jährlich"),
      m("apo_b", "Bester Einzel-Lipidmarker fürs kardiovaskuläre Risiko.", "jährlich"),
      m("ldl_c", "Standard-Lipid — im Kontext von ApoB/non-HDL.", "jährlich"),
      m("hdl_c", "Teil des Lipidprofils.", "jährlich"),
      m("triglycerides", "Metabolik + Lipide — nüchtern.", "jährlich"),
      m("vitamin_d", "Häufiger Mangel — gezielt dosieren statt raten.", "jährlich")
    ];
    var goalSpecific = [];
    if (pathway === "performance" || mode === "build" || mode === "perform") {
      goalSpecific.push(
        m("ferritin", "Eisenspeicher — Recovery/Ausdauer; als Trend mit TSAT.", "halbjährlich"),
        m("tsat", "Ergänzt Ferritin — Über-/Unterladung unterscheiden.", "halbjährlich"),
        m("tsh", "Schilddrüsen-Kontext für Energie/Stoffwechsel.", "jährlich"),
        m("ft4", "Mit TSH interpretieren.", "jährlich"),
        m("total_testosterone", "Hormonelle Baseline (morgens, mit SHBG).", "jährlich"),
        m("shbg", "Nötig, um freies T zu verstehen.", "jährlich")
      );
    } else {
      goalSpecific.push(
        m("tsh", "Schilddrüsen-Basis.", "jährlich"),
        m("ferritin", "Eisenspeicher-Kontext.", "jährlich"),
        m("total_testosterone", "Hormon-Baseline (morgens).", "jährlich")
      );
    }
    var advanced = [
      m("lp_a", "Genetischer CV-Risikofaktor — einmal messen reicht meist.", "einmalig"),
      m("hs_crp", "Niedriggradige Entzündung (als Trend).", "jährlich"),
      m("cystatin_c", "Muskelmasse-unabhängiger Nierenmarker.", "bei Bedarf"),
      m("insulin", "Nüchtern-Insulin → HOMA-IR, frühe Insulinresistenz.", "jährlich")
    ];
    var optional = [
      m("uric_acid", "Gicht/Metabolik-Kontext.", "bei Bedarf"),
      m("b12", "Bei wenig tierischen Produkten.", "bei Bedarf"),
      m("folate", "Mit B12.", "bei Bedarf"),
      m("magnesium", "Grober Kontext.", "bei Bedarf")
    ];
    // Enhanced: erweitertes Monitoring in CORE/GOAL heben
    if (enhanced) {
      goalSpecific.push(
        m("estradiol", "Unter T eng gekoppelt — sensitiver Assay.", "alle 8–12 Wochen"),
        m("lh", "Achsen-/Fertilitätskontext.", "nach Bedarf"),
        m("fsh", "Fertilitätskontext.", "nach Bedarf")
      );
      advanced.push(
        m("ggt", "Leberbelastung (alkohol-/wirkstoffsensibel).", "alle 12 Wochen"),
        m("ast", "Leber/Muskel im Enhanced-Monitoring.", "alle 12 Wochen"),
        m("acr", "Frühe Nieren-/Gefäßbelastung (Blutdruck).", "halbjährlich"),
        m("psa", "Prostata-Verlauf unter T (Trend, ab ~40).", "jährlich")
      );
    }
    // Familienanamnese hebt Marker in ADVANCED/CORE
    var fam = (family || []).map(normUnitStr).join(" ");
    if (/herz|kardio|infarkt|cardio/.test(fam)) { if (!advanced.some(function (x) { return x.marker_id === "lp_a"; })) advanced.unshift(m("lp_a", "Familiäre früh­kardiovaskuläre Belastung — Lp(a) priorisiert.", "einmalig")); }
    if (/diabetes|zucker/.test(fam)) { advanced.unshift(m("insulin", "Familiäre Diabetes-Belastung — Insulin/HOMA priorisiert.", "jährlich")); }
    if (/prostata|prostate/.test(fam) && !optional.concat(advanced).some(function (x) { return x.marker_id === "psa"; })) advanced.push(m("psa", "Familiäre Prostata-Belastung — Verlaufskontrolle.", "jährlich"));
    if (/schilddrüs|thyroid|hashimoto/.test(fam)) advanced.push(m("tpo_ab", "Familiäre Schilddrüsen-Autoimmunität — TPO einmal.", "einmalig"));
    return { pathway: pathway, mode: mode, enhanced: !!enhanced, core: core, goal: goalSpecific, advanced: advanced, optional: optional };
  }

  // completeness — welche empfohlenen Marker fehlen (mit Grund).
  function completeness(opts) {
    var panel = buildPanel(opts);
    var present = markersPresent();
    var all = panel.core.concat(panel.goal);
    var have = all.filter(function (x) { return present.indexOf(x.marker_id) >= 0; });
    var missing = all.filter(function (x) { return present.indexOf(x.marker_id) < 0; });
    var advMissing = panel.advanced.filter(function (x) { return present.indexOf(x.marker_id) < 0; });
    return { total: all.length, have: have.length, missing: missing, advancedMissing: advMissing, panel: panel };
  }

  /* =====================================================================
     ENHANCED MONITORING VIEW — Kategorien mit latest/trend/last checked/next.
     Keine automatische Medikation.
     ===================================================================== */
  var ENHANCED_DOMAINS = [
    { key: "cardio", label: "CARDIO", markers: ["apo_b", "ldl_c", "hdl_c", "triglycerides", "hs_crp", "lp_a"] },
    { key: "heme", label: "HÄMATOLOGIE", markers: ["hematocrit", "hemoglobin", "rbc", "platelets"] },
    { key: "liver", label: "LEBER", markers: ["alt", "ast", "ggt"] },
    { key: "kidney", label: "NIERE", markers: ["creatinine", "cystatin_c", "acr", "egfr"] },
    { key: "endocrine", label: "ENDOKRIN", markers: ["total_testosterone", "free_testosterone", "shbg", "estradiol", "lh", "fsh"] },
    { key: "metabolic", label: "METABOLISCH", markers: ["glucose", "hba1c", "insulin"] },
    { key: "fertility", label: "FERTILITÄT", markers: ["lh", "fsh"] }
  ];
  function enhancedMonitoring() {
    return ENHANCED_DOMAINS.map(function (dom) {
      var rows = dom.markers.filter(function (id) { return latestFor(id); }).map(function (id) {
        var tr = trend(id); var rc = suggestRecheck(id); var last = latestFor(id);
        return { marker_id: id, name: markerName(id), status: tr.status, statusMeta: STATUS_META[tr.status], value: tr.currentValue, unit: (last.canonical && last.canonical.unit) || last.unit, lastDate: last.date, recheck: rc, delta: tr.delta, pct: tr.pct };
      });
      var missing = dom.markers.filter(function (id) { return !latestFor(id); }).map(markerName);
      return { key: dom.key, label: dom.label, rows: rows, missing: missing, has: rows.length > 0 };
    });
  }

  /* =====================================================================
     PANEL COMPARISON — zwei Panels/Zeitpunkte gegenüberstellen.
     ===================================================================== */
  function comparePanels(dateA, dateB) {
    // default: erstes vs letztes vorhandenes Panel
    var ps = panels().slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    if (!ps.length) return null;
    var a = dateA ? ps.filter(function (p) { return p.date === dateA; })[0] : ps[0];
    var b = dateB ? ps.filter(function (p) { return p.date === dateB; })[0] : ps[ps.length - 1];
    if (!a || !b) return null;
    var ra = {}, rb = {};
    resultsForPanel(a.id).forEach(function (r) { ra[r.marker_id] = r; });
    resultsForPanel(b.id).forEach(function (r) { rb[r.marker_id] = r; });
    var rows = [];
    Object.keys(rb).forEach(function (mid) {
      if (!MARKERS[mid]) return;
      var from = ra[mid], to = rb[mid];
      var fromV = from ? ((from.canonical && from.canonical.value) || from.value) : null;
      var toV = (to.canonical && to.canonical.value) || to.value;
      var delta = (fromV != null) ? round(toV - fromV, 3) : null;
      var pct = (fromV != null && fromV !== 0) ? round(delta / Math.abs(fromV) * 100, 1) : null;
      var dsign = delta != null ? directionSign(mid, delta) : 0;
      rows.push({ marker_id: mid, name: markerName(mid), category: MARKERS[mid].category, from: fromV, to: toV, unit: (to.canonical && to.canonical.unit) || to.unit, delta: delta, pct: pct, dirSign: dsign, significant: pct != null && Math.abs(pct) >= noiseFloor(mid) });
    });
    rows.sort(function (x, y) { return (y.significant ? 1 : 0) - (x.significant ? 1 : 0); });
    return { a: a, b: b, rows: rows };
  }

  /* =====================================================================
     IMPORT / REVIEW ARCHITECTURE (Scaffold, ehrlich)
     Kein Fake-OCR. Provider-Adapter: parseLabDocument(file) → pending values
     zum REVIEW. Ohne echten Provider: manuelle Review-Liste vorbereiten.
     UPLOAD → PARSE PENDING → REVIEW VALUES → CONFIRM.
     ===================================================================== */
  var _parseProvider = null;   // registerParseProvider(fn) für echte OCR/AI später
  function registerParseProvider(fn) { if (typeof fn === "function") _parseProvider = fn; }
  function hasParseProvider() { return !!_parseProvider; }
  // parseLabDocument gibt IMMER {status, values[]} zurück; ohne Provider: pending review, KEINE erfundenen Werte.
  function parseLabDocument(file, meta) {
    if (_parseProvider) {
      return Promise.resolve().then(function () { return _parseProvider(file, meta); }).then(function (out) {
        // normalisieren: jeden erkannten Wert auf kanonischen Marker mappen
        var values = (out && out.values ? out.values : []).map(function (v) {
          var mid = v.marker_id || canonicalMarkerId(v.name);
          return { marker_id: mid, name: v.name || (mid && markerName(mid)), value: v.value, unit: v.unit || "", reference_low: v.reference_low, reference_high: v.reference_high, confidence: "parsed_confirmed", recognized: !!mid };
        });
        return { status: "review", provider: true, values: values, meta: meta || {} };
      }).catch(function () { return { status: "manual", provider: false, values: [], meta: meta || {}, error: "parse_failed" }; });
    }
    // Kein Provider → ehrlicher manueller Review-Modus. Datei bleibt lokal (kein Upload).
    return Promise.resolve({ status: "manual", provider: false, values: [], meta: meta || {}, note: "Keine automatische Extraktion aktiv — Werte manuell erfassen (Datei bleibt auf diesem Gerät)." });
  }
  // confirmImport — validierte Review-Werte übernehmen (mit Dedupe & Panel-Merge).
  function confirmImport(reviewedValues, panelMeta) {
    panelMeta = panelMeta || {};
    var date = panelMeta.date || todayYmd();
    var added = [], skipped = [], errors = [];
    reviewedValues.forEach(function (v) {
      if (v.skip) { skipped.push(v); return; }
      var res = addResult({ marker_id: v.marker_id || canonicalMarkerId(v.name), name: v.name, value: v.value, unit: v.unit, reference_low: v.reference_low, reference_high: v.reference_high, date: date, lab: panelMeta.lab, fasted: panelMeta.fasted, source: "import", confidence: v.confidence || "parsed_confirmed" });
      if (res.ok) added.push(res.result);
      else if (res.code === "duplicate") skipped.push(v);
      else errors.push({ value: v, code: res.code });
    });
    if (added.length) emitLab("LAB_REVIEW_CONFIRMED", { count: added.length, date: date });
    return { ok: true, added: added.length, skipped: skipped.length, errors: errors };
  }

  /* =====================================================================
     LAB NOTES — Kontext (fasting/illness/hard training/med change/supplement)
     ===================================================================== */
  function addNote(note) {
    var n = { id: uid("note"), date: note.date || todayYmd(), type: note.type || "context", text: note.text || "", panel_id: note.panel_id || null, created: todayYmd() };
    var all = labNotes(); all.push(n); S.set("lab_notes", all); return n;
  }

  /* =====================================================================
     STACK-KONTEXT AUS LABS — der Stack-Engine liest Laborlage (keine
     Behandlung). Rückgabe: Flags, die die Supplement-Strategie modulieren.
     ===================================================================== */
  function stackContext() {
    var flags = [];
    function lv(id) { var r = latestFor(id); return r ? ((r.canonical && r.canonical.value != null) ? r.canonical.value : r.value) : null; }
    var vitd = lv("vitamin_d");
    if (vitd != null) {
      if (vitd >= 30) flags.push({ id: "vitd", action: "hold", supp: "vitd", text: "Vitamin D bereits ausreichend (" + fmtNum(vitd) + " ng/mL) — nicht blind hochdosieren." });
      else if (vitd < 20) flags.push({ id: "vitd", action: "consider", supp: "vitd", text: "Vitamin D niedrig (" + fmtNum(vitd) + " ng/mL) — Supplementierung sinnvoll, Dosis am Wert ausrichten (ärztlich abklären)." });
    }
    var ferr = lv("ferritin"), tsatv = lv("tsat"), ironv = lv("iron");
    if ((ferr != null && ferr > 300) || (tsatv != null && tsatv > 45)) flags.push({ id: "iron", action: "avoid", supp: "iron", text: "Eisenstatus hoch (Ferritin/TSAT) — KEIN Eisen supplementieren; ggf. Überladung ärztlich abklären." });
    else if (ferr != null && ferr < 30) flags.push({ id: "iron", action: "consider", supp: "iron", text: "Ferritin niedrig (" + fmtNum(ferr) + ") — Eisenmangel-Kontext; Ursache und Supplementierung ärztlich klären." });
    var b12v = lv("b12");
    if (b12v != null && b12v < 200) flags.push({ id: "b12", action: "consider", supp: "b12", text: "B12 niedrig — besonders bei wenig tierischen Produkten; Supplementierung erwägen." });
    var mg = lv("magnesium");
    if (mg != null && mg >= 1.7) flags.push({ id: "magnesium", action: "hold", supp: "magnesium", text: "Serum-Magnesium im Bereich — Supplement nur bei Symptomen (Serum bildet Gesamtstatus grob ab)." });
    // Omega-3 Kontext über Triglyceride/hs-CRP (nur Kontext, keine Behandlung)
    var tg = lv("triglycerides");
    if (tg != null && tg > 150) flags.push({ id: "omega3", action: "consider", supp: "omega3", text: "Triglyceride erhöht — Omega-3 und Ernährung als Kontext (nicht als Ersatz für Ursachenarbeit)." });
    return flags;
  }
  // Enhanced-Monitoring-Priorität aus Trends (keine Medikamentenanpassung).
  function enhancedMonitoringPriority() {
    var out = [];
    var hct = trend("hematocrit");
    if (hct && (hct.status === "WORSENING" || hct.status === "NEEDS_FOLLOWUP" || (hct.outside === "high"))) out.push({ domain: "heme", level: hct.crit ? "high" : "raised", text: "Hämatokrit-Trend steigend/erhöht — Monitoring-Priorität erhöht (Blutviskosität/Blutdruck). Keine automatische Maßnahme — mit qualifiziertem Kliniker einordnen." });
    var apob = trend("apo_b");
    if (apob && apob.status === "WORSENING") out.push({ domain: "cardio", level: "raised", text: "ApoB-Trend verschlechtert — kardiovaskuläres Monitoring priorisieren." });
    var e2 = trend("estradiol");
    if (e2 && e2.significant) out.push({ domain: "endocrine", level: "context", text: "Estradiol bewegt sich deutlich — im Kontext von T/Therapie einordnen." });
    return out;
  }

  /* =====================================================================
     PROGRESS / TODAY / NBA HELPERS
     ===================================================================== */
  function progressDeltas() {
    // markante Marker mit ≥2 Punkten: from→to
    var out = [];
    ["apo_b", "hba1c", "hematocrit", "ldl_c", "triglycerides", "total_testosterone", "alt"].forEach(function (mid) {
      var s = seriesFor(mid); if (s.length < 2) return;
      var from = (s[0].canonical && s[0].canonical.value) || s[0].value;
      var to = (s[s.length - 1].canonical && s[s.length - 1].canonical.value) || s[s.length - 1].value;
      var tr = trend(mid);
      out.push({ marker_id: mid, name: markerName(mid), from: from, to: to, unit: (s[s.length - 1].canonical && s[s.length - 1].canonical.unit) || s[s.length - 1].unit, status: tr.status, dirSign: tr.dirSign });
    });
    return out;
  }
  // Today-Signale: nur wenn relevant (recheck fällig ODER neue Panels mit Änderungen)
  function todaySignals() {
    var sig = [];
    var due = dueRechecks();
    if (due.length) {
      var top = due[0];
      sig.push({ type: "recheck_due", marker_id: top.markerId, label: "Lab-Recheck fällig", detail: markerName(top.markerId) + (due.length > 1 ? " +" + (due.length - 1) + " weitere" : "") + " · zuletzt vor " + Math.round(top.ageDays / 7) + " Wochen", deepLink: "#labs" });
    }
    // neue Panels (heute/gestern) → Review-Hinweis
    var recent = panels().filter(function (p) { return daysBetween(p.date, todayYmd()) <= 2 && daysBetween(p.date, todayYmd()) >= 0; });
    if (recent.length) {
      var prios = priorities(3);
      if (prios.length) sig.push({ type: "new_labs", label: "Neue Laborwerte", detail: prios.length + " wichtige Änderung(en) prüfen", deepLink: "#labs" });
    }
    return sig;
  }
  // ICS für einen Recheck-Termin (Kalender-Integration, ehrlich: ICS + Reminder)
  function recheckIcs(markerIds, dateYmd, timeHHMM) {
    var t = (timeHHMM || "09:00").replace(":", "") + "00";
    var ymd = String(dateYmd || todayYmd()).replace(/-/g, "");
    var names = (markerIds || []).map(markerName).join(", ") || "Lab-Recheck";
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MaleMetrix//Labs//DE",
      "BEGIN:VEVENT", "UID:mm-lab-" + ymd + "-" + normUnitStr(names).replace(/[^a-z0-9]/g, "").slice(0, 12) + "@malemetrix",
      "DTSTART:" + ymd + "T" + t, "SUMMARY:MaleMetrix · Lab-Recheck: " + names,
      "DESCRIPTION:Blutabnahme planen (nüchtern wo relevant, morgens für Hormone).",
      "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  }

  /* ---- Events (privacy: NIE echte Biomarker-Werte im Event-Payload) ---- */
  // LAB_PANEL_CREATED · LAB_RESULT_ADDED · LAB_RESULT_UPDATED ·
  // LAB_REVIEW_CONFIRMED · LAB_RECHECK_DUE · LAB_TREND_CHANGED
  function emitLab(name, payload) {
    // Werte werden NICHT durchgereicht — nur Marker-ID/Status/Datum (siehe Privacy §66).
    var safe = {};
    if (payload) { ["marker_id", "panel_id", "status", "date", "count"].forEach(function (k) { if (payload[k] != null) safe[k] = payload[k]; }); }
    var os = OS();
    if (os && os.emit) os.emit(name, safe);
    else { try { document.dispatchEvent(new CustomEvent("mm:os", { detail: { name: name, payload: safe } })); } catch (e) {} }
  }

  /* ---- Test/Utility: alles löschen (nur lokale Labs) ---- */
  function _clearAll() { S.set("lab_panels", []); S.set("lab_results", []); S.set("lab_notes", []); }

  MM.labs = {
    CATEGORIES: CATEGORIES, MARKERS: MARKERS, STATUS_META: STATUS_META, ENHANCED_DOMAINS: ENHANCED_DOMAINS,
    // normalization
    canonicalMarkerId: canonicalMarkerId, marker: marker, markerName: markerName, toCanonical: toCanonical, UNIT_MAPS: UNIT_MAPS,
    // data model
    panels: panels, results: results, resultsForPanel: resultsForPanel, seriesFor: seriesFor, latestFor: latestFor, firstFor: firstFor, markersPresent: markersPresent,
    createPanel: createPanel, addResult: addResult, updateResult: updateResult, deleteResult: deleteResult, isDuplicateResult: isDuplicateResult, findPanel: findPanel,
    // derived
    calcFreeTestosterone: calcFreeTestosterone,
    // trend + status + context
    trend: trend, insightFor: insightFor, outsideLabRange: outsideLabRange, criticalFlag: criticalFlag, refFor: refFor,
    // dashboards
    categorySummary: categorySummary, priorities: priorities, comparePanels: comparePanels,
    // recheck
    suggestRecheck: suggestRecheck, dueRechecks: dueRechecks, recheckPlan: recheckPlan, recheckIcs: recheckIcs,
    // builder + completeness
    buildPanel: buildPanel, completeness: completeness,
    // enhanced
    enhancedMonitoring: enhancedMonitoring, enhancedMonitoringPriority: enhancedMonitoringPriority,
    // import
    registerParseProvider: registerParseProvider, hasParseProvider: hasParseProvider, parseLabDocument: parseLabDocument, confirmImport: confirmImport,
    // notes
    addNote: addNote, labNotes: labNotes,
    // integrations
    stackContext: stackContext, progressDeltas: progressDeltas, todaySignals: todaySignals,
    _clearAll: _clearAll
  };

  // Sync-Domains registrieren (append-orientiert; Konfliktmodell siehe account.js)
  try {
    if (MM.account && MM.account.registerStateDomain) {
      MM.account.registerStateDomain("labpanels", "lab_panels");
      MM.account.registerStateDomain("labresults", "lab_results");
      MM.account.registerStateDomain("labnotes", "lab_notes");
    }
  } catch (e) {}
})();
