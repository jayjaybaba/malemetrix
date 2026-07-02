/* ==========================================================================
   MaleMetrix Score — Fragen, Scoring, Archetypen, Pläne
   Jedes Modul ergibt 0–100 Punkte. Der Gesamtscore ist gewichtet.
   ========================================================================== */

window.MM_CHECK = {

  /* ---------- Gewichtung der 7 Bereiche (Summe = 100) ---------- */
  weights: { body: 18, fuel: 18, strength: 15, recovery: 16, blood: 10, drive: 11, execution: 12 },

  moduleNames: {
    body: "Body", strength: "Strength", fuel: "Fuel", recovery: "Recovery",
    blood: "Blood", drive: "Drive", execution: "Execution"
  },

  moduleSubtitles: {
    body: "Körperkomposition & Bauchumfang",
    strength: "Krafttraining & Progression",
    fuel: "Ernährung, Protein & Alltag",
    recovery: "Schlaf, Stress & Regeneration",
    blood: "Blutwerte & Datenbasis",
    drive: "Energie, Fokus & Antrieb",
    execution: "Umsetzung & Routinen"
  },

  /* ---------- Score-Level ---------- */
  levels: [
    { min: 0,  max: 29,  name: "Reset nötig",        text: "Dir fehlt aktuell ein System — das ist keine Schwäche, sondern dein größter Vorteil: Mit einfachen, klaren Maßnahmen wirst du schnell messbare Fortschritte sehen." },
    { min: 30, max: 49,  name: "Rebuild Phase",       text: "Dein System hat klare Engpässe — und genau das ist gut: Sie sind identifizierbar und in 12 Wochen gezielt angehbar. Deine Chance auf schnelle, sichtbare Verbesserung ist hoch." },
    { min: 50, max: 69,  name: "Solide Basis",        text: "Dein Fundament steht, aber wichtige Lücken bremsen dich. Mit gezielter Struktur an den richtigen Stellen holst du deutlich mehr aus dem heraus, was du bereits tust." },
    { min: 70, max: 84,  name: "Performance Aufbau",  text: "Du hast eine gute Struktur. Jetzt geht es um Optimierung: Feinjustierung bei Training, Ernährung und Erholung bringt dich auf das nächste Level." },
    { min: 85, max: 100, name: "Optimizer Level",     text: "Dein System ist stark. Bei dir geht es um Feintuning, Plateaus und langfristige Strategie — nicht um Grundlagen." }
  ],

  levelFor(score) {
    return this.levels.find(l => score >= l.min && score <= l.max) || this.levels[0];
  },

  /* ---------- Ziel → relevante Module (für Engpass-Gewichtung) ---------- */
  goalModuleMap: {
    bauchfett: ["body", "fuel"],
    muskeln: ["strength", "fuel"],
    kraft: ["strength"],
    energie: ["recovery", "drive"],
    schlaf: ["recovery"],
    ernaehrung: ["fuel"],
    blutwerte: ["blood"],
    hormone: ["blood", "drive"],
    disziplin: ["execution"],
    attraktiv: ["body", "strength"]
  },

  /* ==========================================================================
     MODULE & FRAGEN
     type: single | multi | scale | fields | redflags
     p = Punkte. cap = Obergrenze bei multi. bucket = Punktstaffel nach Anzahl.
     ========================================================================== */

  modules: [

    /* ---------- 1. Ziel & Motivation ---------- */
    {
      id: "goal", label: "Ziel & Motivation",
      questions: [
        {
          id: "goal_main", type: "multi", maxSelect: 2, module: null,
          title: "Was ist dein Hauptziel für die nächsten 12 Wochen?",
          sub: "Wähle maximal 2 aus.",
          options: [
            { v: "bauchfett", label: "Bauchfett verlieren" },
            { v: "muskeln", label: "Muskeln aufbauen" },
            { v: "kraft", label: "Kraft steigern" },
            { v: "energie", label: "Energie verbessern" },
            { v: "schlaf", label: "Besser schlafen" },
            { v: "ernaehrung", label: "Ernährung in den Griff bekommen" },
            { v: "blutwerte", label: "Blutwerte verstehen" },
            { v: "hormone", label: "Testosteron / Hormone besser einordnen" },
            { v: "disziplin", label: "Wieder disziplinierter werden" },
            { v: "attraktiv", label: "Insgesamt athletischer aussehen" }
          ]
        },
        {
          id: "goal_pain", type: "single", module: null,
          title: "Was stört dich aktuell am meisten?",
          options: [
            { v: "bauch", label: "Bauchansatz" },
            { v: "muede", label: "Müdigkeit" },
            { v: "schlaf", label: "Schlechter Schlaf" },
            { v: "kraft", label: "Wenig Kraft" },
            { v: "struktur", label: "Keine Struktur" },
            { v: "essen", label: "Unkontrolliertes Essen" },
            { v: "libido", label: "Niedriger Drive / Libido" },
            { v: "blutwerte", label: "Blutwerte / Unsicherheit wegen Hormonen" },
            { v: "neustart", label: "Ich fange immer wieder neu an" }
          ]
        },
        {
          id: "goal_urgency", type: "single", module: null,
          title: "Wie dringend willst du das verändern?",
          options: [
            { v: 1, label: "Es wäre schön, aber nicht dringend" },
            { v: 2, label: "Ich denke seit Monaten daran" },
            { v: 3, label: "Ich bin wirklich genervt" },
            { v: 4, label: "Ich will jetzt konkret starten" },
            { v: 5, label: "Ich habe genug vom Aufschieben" }
          ]
        }
      ]
    },

    /* ---------- 2. Basisdaten ---------- */
    {
      id: "basics", label: "Basisdaten",
      questions: [
        {
          id: "basics_form", type: "fields",
          title: "Deine Ausgangslage",
          sub: "Bauchumfang: Miss auf Höhe des Bauchnabels, entspannt ausgeatmet, ohne den Bauch einzuziehen.",
          fields: [
            { id: "name", label: "Vorname (optional)", type: "text", placeholder: "z. B. Max", required: false },
            { id: "age", label: "Alter", type: "number", min: 18, max: 90, placeholder: "z. B. 38", required: true },
            { id: "height", label: "Größe (cm)", type: "number", min: 140, max: 220, placeholder: "z. B. 180", required: true },
            { id: "weight", label: "Gewicht (kg)", type: "number", min: 45, max: 250, placeholder: "z. B. 92", required: true },
            { id: "waist", label: "Bauchumfang (cm) — optional", type: "number", min: 50, max: 200, placeholder: "z. B. 98" },
            { id: "job", label: "Alltag", type: "select", required: true, options: [
              ["sitzend", "Überwiegend sitzend (Büro, Homeoffice)"],
              ["gemischt", "Gemischt (sitzend + Bewegung)"],
              ["aktiv", "Körperlich aktiv"],
              ["schicht", "Schichtarbeit"]
            ]},
            { id: "kids", label: "Kinder im Haushalt", type: "select", required: true, options: [["ja", "Ja"], ["nein", "Nein"]] },
            { id: "steps", label: "Schritte pro Tag (geschätzt)", type: "select", required: true, options: [
              ["lt4", "Unter 4.000"], ["4to7", "4.000–7.000"], ["7to10", "7.000–10.000"], ["gt10", "Über 10.000"], ["unknown", "Keine Ahnung"]
            ]},
            { id: "history", label: "Trainingshistorie", type: "select", required: true, options: [
              ["nie", "Noch nie ernsthaft trainiert"],
              ["lange_raus", "Früher trainiert, lange raus (1+ Jahre)"],
              ["pausen", "Immer wieder mit Pausen"],
              ["aktiv", "Aktuell regelmäßig dabei"]
            ]}
          ]
        }
      ]
    },

    /* ---------- 3. Body ---------- */
    {
      id: "body", label: "Body — Körper & Bauchumfang",
      questions: [
        {
          id: "body_weighttrend", type: "single", module: "body",
          title: "Wie hat sich dein Gewicht in den letzten 12 Monaten entwickelt?",
          options: [
            { v: "plus8", label: "Mehr als 8 kg zugenommen", p: 3 },
            { v: "plus48", label: "4–8 kg zugenommen", p: 7 },
            { v: "gleich", label: "Etwa gleich geblieben", p: 15 },
            { v: "minus48", label: "4–8 kg abgenommen", p: 15 },
            { v: "minus8", label: "Mehr als 8 kg abgenommen", p: 12 },
            { v: "unknown", label: "Weiß ich nicht", p: 4 }
          ]
        },
        {
          id: "body_waisttrend", type: "single", module: "body",
          title: "Wie hat sich dein Bauchumfang entwickelt?",
          options: [
            { v: "viel_mehr", label: "Deutlich mehr geworden", p: 3 },
            { v: "mehr", label: "Etwas mehr geworden", p: 6 },
            { v: "gleich", label: "Gleich geblieben", p: 12 },
            { v: "weniger", label: "Weniger geworden", p: 15 },
            { v: "messe_nicht", label: "Ich messe ihn nicht", p: 2 }
          ]
        },
        {
          id: "body_type", type: "single", module: "body",
          title: "Was beschreibt deinen Körper aktuell am besten?",
          options: [
            { v: "skinny", label: "Schlank, aber wenig Muskeln", p: 8 },
            { v: "normal_bauch", label: "Normal, aber Bauchansatz", p: 10 },
            { v: "stark_fett", label: "Stark, aber zu viel Körperfett", p: 8 },
            { v: "uebergewicht", label: "Deutlich übergewichtig", p: 4 },
            { v: "athletisch", label: "Athletisch, möchte optimieren", p: 15 },
            { v: "unknown", label: "Ich weiß es nicht", p: 5 }
          ]
        },
        {
          id: "body_tracking", type: "multi", module: "body", cap: 15,
          title: "Was trackst du aktuell regelmäßig?",
          sub: "Mehrfachauswahl möglich.",
          options: [
            { v: "gewicht", label: "Gewicht", p: 3 },
            { v: "bauch", label: "Bauchumfang", p: 4 },
            { v: "fotos", label: "Fotos", p: 2 },
            { v: "kraft", label: "Kraftwerte", p: 2 },
            { v: "schritte", label: "Schritte", p: 2 },
            { v: "kalorien", label: "Kalorien / Makros", p: 2 },
            { v: "nichts", label: "Nichts davon", p: 0, exclusive: true }
          ]
        },
        {
          id: "body_satisfaction", type: "scale", module: "body", min: 1, max: 10,
          title: "Wie zufrieden bist du mit deiner aktuellen Form?",
          sub: "1 = sehr unzufrieden · 10 = sehr zufrieden",
          pointsMap: [[2, 4], [4, 8], [6, 11], [8, 15], [10, 13]]
        }
      ]
    },

    /* ---------- 4. Strength ---------- */
    {
      id: "strength", label: "Strength — Kraft & Training",
      questions: [
        {
          id: "str_freq", type: "single", module: "strength",
          title: "Wie oft trainierst du Kraft pro Woche?",
          options: [
            { v: "0", label: "Gar nicht", p: 2 },
            { v: "1", label: "1× pro Woche", p: 6 },
            { v: "2", label: "2× pro Woche", p: 12 },
            { v: "3", label: "3× pro Woche", p: 20 },
            { v: "4plus", label: "4× oder öfter", p: 18 },
            { v: "unregelmaessig", label: "Sehr unregelmäßig", p: 4 }
          ]
        },
        {
          id: "str_plan", type: "single", module: "strength",
          title: "Trainierst du nach Plan?",
          options: [
            { v: "progression", label: "Ja, mit klarer Progression", p: 20 },
            { v: "ohne_steigerung", label: "Ja, aber ohne klare Steigerung", p: 12 },
            { v: "spontan", label: "Ich mache spontan, worauf ich Lust habe", p: 6 },
            { v: "selten", label: "Ich trainiere selten", p: 3 },
            { v: "nein", label: "Gar nicht", p: 0 }
          ]
        },
        {
          id: "str_log", type: "single", module: "strength",
          title: "Wie dokumentierst du dein Training?",
          options: [
            { v: "app", label: "App / Notizen mit Gewichten & Wiederholungen", p: 20 },
            { v: "manchmal", label: "Gelegentlich", p: 12 },
            { v: "kopf", label: "Nur im Kopf", p: 6 },
            { v: "nein", label: "Gar nicht", p: 2 }
          ]
        },
        {
          id: "str_exercises", type: "multi", module: "strength", cap: 15,
          title: "Welche Übungen nutzt du regelmäßig?",
          sub: "Mehrfachauswahl möglich.",
          options: [
            { v: "kniebeuge", label: "Kniebeuge / Beinpresse", p: 2.5 },
            { v: "kreuzheben", label: "Kreuzheben / Hip Hinge", p: 2.5 },
            { v: "bank", label: "Bankdrücken / Brustpresse", p: 2.5 },
            { v: "rudern", label: "Rudern", p: 2.5 },
            { v: "klimmzug", label: "Klimmzüge / Latzug", p: 2.5 },
            { v: "schulter", label: "Schulterdrücken", p: 2.5 },
            { v: "core", label: "Core / Rumpf", p: 2.5 },
            { v: "keine", label: "Keine davon", p: 0, exclusive: true }
          ]
        },
        {
          id: "str_limit", type: "single", module: "strength",
          title: "Was limitiert dich beim Training am meisten?",
          options: [
            { v: "zeit", label: "Zeit", p: 6 },
            { v: "schmerzen", label: "Schmerzen", p: 3 },
            { v: "muedigkeit", label: "Müdigkeit", p: 5 },
            { v: "motivation", label: "Motivation", p: 5 },
            { v: "kein_plan", label: "Kein Plan", p: 4 },
            { v: "technik", label: "Unsicherheit bei der Technik", p: 5 },
            { v: "kein_gym", label: "Keine Lust auf Gym", p: 4 },
            { v: "nichts", label: "Nichts — läuft", p: 10 }
          ]
        },
        {
          id: "str_values", type: "single", module: "strength",
          title: "Kennst du deine aktuellen Kraftwerte?",
          sub: "Z. B. Gewichte bei Kniebeuge, Bankdrücken, Kreuzheben — oder Liegestütze am Stück.",
          options: [
            { v: "genau", label: "Ja, ich kenne meine Werte genau", p: 15 },
            { v: "ungefaehr", label: "Ungefähr", p: 9 },
            { v: "nein", label: "Nein", p: 3 }
          ]
        }
      ]
    },

    /* ---------- 5. Fuel ---------- */
    {
      id: "fuel", label: "Fuel — Ernährung",
      questions: [
        {
          id: "fuel_protein", type: "single", module: "fuel",
          title: "Weißt du ungefähr, wie viel Protein du pro Tag isst?",
          options: [
            { v: "keine_ahnung", label: "Keine Ahnung", p: 3 },
            { v: "lt80", label: "Unter 80 g", p: 6 },
            { v: "80to120", label: "80–120 g", p: 15 },
            { v: "120to160", label: "120–160 g", p: 22 },
            { v: "gt160", label: "Über 160 g", p: 20 },
            { v: "tracke", label: "Ich tracke es genau", p: 25 }
          ]
        },
        {
          id: "fuel_structure", type: "single", module: "fuel",
          title: "Wie sieht deine Ernährung im Alltag aus?",
          options: [
            { v: "chaotisch", label: "Chaotisch — wie es kommt", p: 3 },
            { v: "abends_viel", label: "Tagsüber wenig, abends viel", p: 6 },
            { v: "geregelt", label: "2–3 geregelte Mahlzeiten", p: 13 },
            { v: "geplant", label: "Ich plane meistens vor", p: 17 },
            { v: "tracke", label: "Ich tracke Kalorien / Makros", p: 20 }
          ]
        },
        {
          id: "fuel_calories", type: "single", module: "fuel",
          title: "Weißt du ungefähr, wie viele Kalorien du täglich isst?",
          options: [
            { v: "tracke", label: "Ja, ich tracke", p: 20 },
            { v: "gut", label: "Gute Schätzung", p: 15 },
            { v: "grob", label: "Grobe Ahnung", p: 9 },
            { v: "nein", label: "Keine Ahnung", p: 3 }
          ]
        },
        {
          id: "fuel_alcohol", type: "single", module: "fuel",
          title: "Wie oft trinkst du Alkohol?",
          options: [
            { v: "nie", label: "Nie / selten", p: 15 },
            { v: "1x", label: "1× pro Woche", p: 12 },
            { v: "2to3", label: "2–3× pro Woche", p: 6 },
            { v: "we_viel", label: "Am Wochenende viel", p: 4 },
            { v: "taeglich", label: "Fast täglich", p: 2 }
          ]
        },
        {
          id: "fuel_control", type: "single", module: "fuel",
          title: "Wann verlierst du am ehesten die Kontrolle beim Essen?",
          options: [
            { v: "abends", label: "Abends", p: 7 },
            { v: "wochenende", label: "Am Wochenende", p: 6 },
            { v: "stress", label: "Bei Stress", p: 5 },
            { v: "suess", label: "Bei Süßem", p: 6 },
            { v: "brot", label: "Bei Brot / Nudeln", p: 7 },
            { v: "alkohol", label: "Bei Alkohol", p: 5 },
            { v: "selten", label: "Selten / nie", p: 15 }
          ]
        },
        {
          id: "fuel_eatout", type: "single", module: "fuel",
          title: "Wie oft isst du außer Haus (Kantine, Restaurant, unterwegs)?",
          options: [
            { v: "selten", label: "Selten", p: 5 },
            { v: "1to2", label: "1–2× pro Woche", p: 4 },
            { v: "3to5", label: "3–5× pro Woche", p: 3 },
            { v: "taeglich", label: "Fast täglich", p: 2 }
          ]
        },
        {
          id: "fuel_problem", type: "single", module: null,
          title: "Was ist dein größtes Ernährungsproblem?",
          sub: "Hilft uns, deinen Plan zu personalisieren — zählt nicht in den Score.",
          options: [
            { v: "zu_viel", label: "Ich esse zu viel" },
            { v: "protein", label: "Ich esse zu wenig Protein" },
            { v: "snacks", label: "Ich snacke abends" },
            { v: "trinken", label: "Ich trinke zu viele Kalorien" },
            { v: "durchhalten", label: "Ich halte es nur wenige Wochen durch" },
            { v: "wissen", label: "Ich weiß nicht, was ich essen soll" },
            { v: "kochen", label: "Ich koche nicht gern" }
          ]
        }
      ]
    },

    /* ---------- 6. Recovery ---------- */
    {
      id: "recovery", label: "Recovery — Schlaf & Stress",
      questions: [
        {
          id: "rec_duration", type: "single", module: "recovery",
          title: "Wie viele Stunden schläfst du meistens?",
          options: [
            { v: "lt5", label: "Unter 5", p: 2 },
            { v: "5to6", label: "5–6", p: 6 },
            { v: "6to7", label: "6–7", p: 14 },
            { v: "7to8", label: "7–8", p: 25 },
            { v: "gt8", label: "Über 8", p: 22 }
          ]
        },
        {
          id: "rec_wake", type: "single", module: "recovery",
          title: "Wie wachst du morgens auf?",
          options: [
            { v: "erholt", label: "Erholt", p: 25 },
            { v: "okay", label: "Okay", p: 18 },
            { v: "muede", label: "Müde", p: 10 },
            { v: "geraedert", label: "Gerädert", p: 4 },
            { v: "kopfschmerz", label: "Mit Kopfschmerzen", p: 3 },
            { v: "nachts_wach", label: "Ich wache nachts oft auf", p: 6 }
          ]
        },
        {
          id: "rec_night", type: "single", module: "recovery",
          title: "Wie oft wachst du nachts auf?",
          options: [
            { v: "0", label: "Gar nicht", p: 15 },
            { v: "1", label: "1×", p: 11 },
            { v: "2", label: "2×", p: 6 },
            { v: "3plus", label: "3× oder öfter", p: 3 },
            { v: "wasserlassen", label: "Häufig wegen Wasserlassen", p: 4 },
            { v: "gedanken", label: "Häufig wegen Gedanken / Stress", p: 4 }
          ]
        },
        {
          id: "rec_caffeine", type: "single", module: "recovery",
          title: "Bis wann trinkst du Koffein?",
          options: [
            { v: "kein", label: "Gar kein Koffein", p: 10 },
            { v: "morgens", label: "Nur morgens", p: 10 },
            { v: "mittags", label: "Bis mittags", p: 7 },
            { v: "nachmittag", label: "Bis in den Nachmittag", p: 4 },
            { v: "abends", label: "Auch abends", p: 1 }
          ]
        },
        {
          id: "rec_stress", type: "scale", module: "recovery", min: 1, max: 10,
          title: "Wie hoch ist dein Stresslevel aktuell?",
          sub: "1 = sehr entspannt · 10 = dauerhaft am Limit",
          pointsMap: [[3, 15], [5, 11], [7, 7], [9, 3], [10, 1]]
        },
        {
          id: "rec_snore", type: "single", module: "recovery",
          title: "Schnarchst du stark oder wurden Atemaussetzer beobachtet?",
          options: [
            { v: "nein", label: "Nein", p: 10 },
            { v: "leicht", label: "Leichtes Schnarchen", p: 7 },
            { v: "stark", label: "Starkes Schnarchen", p: 3 },
            { v: "aussetzer", label: "Atemaussetzer wurden beobachtet", p: 0, flag: "Beobachtete Atemaussetzer im Schlaf sollten ärztlich abgeklärt werden (Stichwort Schlafapnoe). Das kann Energie, Erholung und Gesundheit stark beeinflussen." },
            { v: "unknown", label: "Weiß ich nicht", p: 5 }
          ]
        }
      ]
    },

    /* ---------- 7. Blood ---------- */
    {
      id: "blood", label: "Blood — Blutwerte & Daten",
      questions: [
        {
          id: "blood_last", type: "single", module: "blood",
          title: "Wann hast du zuletzt Blutwerte machen lassen?",
          options: [
            { v: "nie", label: "Nie bewusst", p: 2 },
            { v: "gt2y", label: "Vor mehr als 2 Jahren", p: 5 },
            { v: "1to2y", label: "Vor 1–2 Jahren", p: 10 },
            { v: "12m", label: "In den letzten 12 Monaten", p: 20 },
            { v: "3m", label: "In den letzten 3 Monaten", p: 25 }
          ]
        },
        {
          id: "blood_understand", type: "single", module: "blood",
          title: "Verstehst du deine Blutwerte?",
          options: [
            { v: "nein", label: "Gar nicht", p: 2 },
            { v: "bisschen", label: "Ein bisschen", p: 6 },
            { v: "einzelne", label: "Ich kenne einzelne Werte", p: 10 },
            { v: "tracke", label: "Ich tracke sie regelmäßig", p: 16 },
            { v: "strukturiert", label: "Ich bespreche sie strukturiert mit Arzt / Coach", p: 20 }
          ]
        },
        {
          id: "blood_known", type: "multi", module: "blood", bucket: [[0, 0], [1, 4], [3, 8], [6, 14], [9, 20], [99, 25]],
          title: "Welche Werte kennst du von dir?",
          sub: "Mehrfachauswahl möglich.",
          options: [
            { v: "blutbild", label: "Kleines / großes Blutbild" },
            { v: "glukose", label: "Nüchternblutzucker" },
            { v: "hba1c", label: "HbA1c" },
            { v: "lipide", label: "Lipide (LDL, HDL, Triglyceride)" },
            { v: "apob", label: "ApoB" },
            { v: "leber", label: "Leberwerte" },
            { v: "niere", label: "Nierenwerte" },
            { v: "tsh", label: "TSH / fT3 / fT4" },
            { v: "testo", label: "Testosteron gesamt" },
            { v: "ftesto", label: "Freies Testosteron" },
            { v: "shbg", label: "SHBG" },
            { v: "estradiol", label: "Estradiol" },
            { v: "prolaktin", label: "Prolaktin" },
            { v: "psa", label: "PSA" },
            { v: "vitd", label: "Vitamin D" },
            { v: "crp", label: "hs-CRP" },
            { v: "ferritin", label: "Ferritin" },
            { v: "keine", label: "Keine Ahnung", exclusive: true }
          ]
        },
        {
          id: "blood_pdf", type: "single", module: "blood",
          title: "Hast du deine Laborwerte als Dokument (PDF / Ausdruck)?",
          options: [
            { v: "aktuell", label: "Ja, aktuelle Werte", p: 15 },
            { v: "alt", label: "Ja, aber ältere", p: 10 },
            { v: "spaeter", label: "Nein, möchte ich aber machen", p: 5 },
            { v: "nein", label: "Nein", p: 3 }
          ]
        },
        {
          id: "blood_doctor", type: "single", module: "blood",
          title: "Besprichst du deine Werte mit einem Arzt?",
          options: [
            { v: "regelmaessig", label: "Ja, regelmäßig", p: 15 },
            { v: "einmalig", label: "Einmalig / selten", p: 9 },
            { v: "nein", label: "Nein", p: 3 }
          ]
        },
        {
          id: "blood_why", type: "single", module: null,
          title: "Warum interessieren dich Blutwerte?",
          sub: "Zählt nicht in den Score — hilft bei der Einordnung.",
          options: [
            { v: "gesundheit", label: "Allgemeine Gesundheit / Vorsorge" },
            { v: "energie", label: "Energie" },
            { v: "hormone", label: "Testosteron / Hormone" },
            { v: "cholesterin", label: "Cholesterin / Herz-Kreislauf" },
            { v: "blutzucker", label: "Blutzucker" },
            { v: "arzt", label: "Mein Arzt hat etwas erwähnt" },
            { v: "verstehen", label: "Ich verstehe meine Werte nicht" }
          ]
        }
      ]
    },

    /* ---------- 8. Drive ---------- */
    {
      id: "drive", label: "Drive — Energie & Antrieb",
      questions: [
        {
          id: "drv_energy", type: "single", module: "drive",
          title: "Wie ist deine Energie tagsüber?",
          options: [
            { v: "stabil", label: "Stabil gut", p: 25 },
            { v: "nachmittag_tief", label: "Morgens gut, nachmittags schlecht", p: 14 },
            { v: "mittel", label: "Mittelmäßig", p: 12 },
            { v: "muede", label: "Häufig müde", p: 5 },
            { v: "nur_koffein", label: "Ich funktioniere nur mit Koffein", p: 3 }
          ]
        },
        {
          id: "drv_focus", type: "single", module: "drive",
          title: "Wie ist dein mentaler Fokus?",
          options: [
            { v: "klar", label: "Klar und fokussiert", p: 20 },
            { v: "okay", label: "Meistens okay", p: 15 },
            { v: "traege", label: "Oft träge", p: 8 },
            { v: "gereizt", label: "Schnell gereizt", p: 6 },
            { v: "schlecht", label: "Konzentration schlecht", p: 3 }
          ]
        },
        {
          id: "drv_motivation", type: "single", module: "drive",
          title: "Wie ist deine Motivation?",
          options: [
            { v: "gut", label: "Gut", p: 20 },
            { v: "schwankend", label: "Schwankend", p: 12 },
            { v: "druck", label: "Ich brauche Druck", p: 8 },
            { v: "abbruch", label: "Ich breche oft ab", p: 5 },
            { v: "kaum", label: "Kaum Antrieb", p: 2 }
          ]
        },
        {
          id: "drv_libido", type: "single", module: "drive",
          title: "Wie zufrieden bist du mit deinem sexuellen Drive?",
          sub: "Optional — du kannst die Antwort überspringen.",
          options: [
            { v: "sehr", label: "Sehr zufrieden", p: 15 },
            { v: "okay", label: "Okay", p: 11 },
            { v: "schwankend", label: "Schwankend", p: 7 },
            { v: "niedrig", label: "Niedrig", p: 3 },
            { v: "keine_antwort", label: "Möchte ich nicht beantworten", p: 8 }
          ]
        },
        {
          id: "drv_morning", type: "single", module: "drive",
          title: "Wie häufig hast du Morgenerektionen?",
          sub: "Optional — ein einfacher Alltagsmarker, keine Diagnose.",
          options: [
            { v: "regelmaessig", label: "Regelmäßig", p: 10 },
            { v: "manchmal", label: "Manchmal", p: 7 },
            { v: "selten", label: "Selten", p: 4 },
            { v: "fast_nie", label: "Fast nie", p: 1 },
            { v: "keine_antwort", label: "Möchte ich nicht beantworten", p: 6 }
          ]
        },
        {
          id: "drv_caffeine", type: "single", module: "drive",
          title: "Wie viel Koffein brauchst du, um zu funktionieren?",
          options: [
            { v: "0to1", label: "0–1 Getränke am Tag", p: 10 },
            { v: "2to3", label: "2–3 am Tag", p: 7 },
            { v: "4to5", label: "4–5 am Tag", p: 3 },
            { v: "6plus", label: "6 oder mehr", p: 1 }
          ]
        },
        {
          id: "drv_cause", type: "single", module: null,
          title: "Was vermutest du als Hauptursache, wenn Energie / Drive niedrig sind?",
          sub: "Zählt nicht in den Score.",
          options: [
            { v: "schlaf", label: "Schlaf" },
            { v: "stress", label: "Stress" },
            { v: "ernaehrung", label: "Ernährung" },
            { v: "training", label: "Zu wenig Training" },
            { v: "hormone", label: "Testosteron / Hormone" },
            { v: "koerperfett", label: "Körperfett" },
            { v: "arbeit", label: "Arbeit / Familie" },
            { v: "unknown", label: "Keine Ahnung" }
          ]
        }
      ]
    },

    /* ---------- 9. Execution ---------- */
    {
      id: "execution", label: "Execution — Umsetzung",
      questions: [
        {
          id: "exe_slots", type: "single", module: "execution",
          title: "Wie viele feste Trainingsfenster hast du pro Woche realistisch?",
          options: [
            { v: "4plus", label: "4 oder mehr", p: 25 },
            { v: "3", label: "3", p: 22 },
            { v: "2", label: "2", p: 14 },
            { v: "1", label: "1", p: 7 },
            { v: "0", label: "Keine festen", p: 2 }
          ]
        },
        {
          id: "exe_restarts", type: "single", module: "execution",
          title: "Wie oft hast du in den letzten 2 Jahren neu gestartet?",
          options: [
            { v: "konstant", label: "Gar nicht — ich bin konstant", p: 10 },
            { v: "1to2", label: "1–2×", p: 8 },
            { v: "3to5", label: "3–5×", p: 4 },
            { v: "staendig", label: "Ständig", p: 2 },
            { v: "nie_drin", label: "Ich komme gar nicht richtig rein", p: 1 }
          ]
        },
        {
          id: "exe_after4w", type: "single", module: "execution",
          title: "Was passiert bei dir typischerweise nach 2–4 Wochen?",
          options: [
            { v: "durchziehen", label: "Ich ziehe durch", p: 10 },
            { v: "lockerer", label: "Ich werde lockerer", p: 6 },
            { v: "plan_wechsel", label: "Ich ändere den Plan", p: 4 },
            { v: "abbruch", label: "Ich breche ab", p: 2 },
            { v: "neustart", label: "Ich starte wieder neu", p: 3 }
          ]
        },
        {
          id: "exe_enemy", type: "single", module: "execution",
          title: "Was ist dein größter Umsetzungsfeind?",
          options: [
            { v: "job", label: "Job", p: 12 },
            { v: "familie", label: "Kinder / Familie", p: 12 },
            { v: "muedigkeit", label: "Müdigkeit", p: 11 },
            { v: "stress", label: "Stress", p: 11 },
            { v: "essen", label: "Essen unterwegs", p: 11 },
            { v: "planung", label: "Fehlende Planung", p: 13 },
            { v: "motivation", label: "Motivation", p: 9 },
            { v: "schmerzen", label: "Schmerzen", p: 9 },
            { v: "anleitung", label: "Keine klare Anleitung", p: 14 }
          ]
        },
        {
          id: "exe_support", type: "single", module: "execution",
          title: "Welche Unterstützung würde dir am meisten helfen?",
          options: [
            { v: "plan", label: "Ein klarer Plan", p: 14 },
            { v: "checkin", label: "Wöchentlicher Check-in", p: 18 },
            { v: "vorgaben", label: "Konkrete Ernährungs- & Trainingsvorgaben", p: 16 },
            { v: "accountability", label: "Accountability — jemand, der nachhakt", p: 18 },
            { v: "coach", label: "1:1 Coaching", p: 20 },
            { v: "blutwerte", label: "Blutwerte-Orientierung", p: 14 },
            { v: "community", label: "Community", p: 12 },
            { v: "allein", label: "Ich will es allein schaffen", p: 6 },
            { v: "unknown", label: "Weiß ich noch nicht", p: 8 }
          ]
        },
        {
          id: "exe_ready", type: "scale", module: "execution", min: 1, max: 10,
          title: "Wie bereit bist du, in den nächsten 12 Wochen wirklich umzusetzen?",
          sub: "1 = eher nicht · 10 = absolut bereit",
          pointsMap: [[2, 2], [4, 5], [6, 10], [8, 16], [10, 20]]
        }
      ]
    },

    /* ---------- 10. Sicherheits-Check (Red Flags) ---------- */
    {
      id: "safety", label: "Sicherheits-Check",
      questions: [
        {
          id: "redflags", type: "multi", module: null, cap: 0,
          title: "Trifft aktuell einer dieser Punkte auf dich zu?",
          sub: "Ehrliche Antworten helfen uns, dich richtig einzuordnen. Diese Angaben fließen nicht in den Score ein.",
          options: [
            { v: "brust", label: "Brustschmerzen / Engegefühl", flag: "Brustschmerzen gehören immer in ärztliche Abklärung — bitte zeitnah." },
            { v: "ohnmacht", label: "Ohnmacht / Schwindelanfälle", flag: "Ohnmachtsanfälle sollten ärztlich abgeklärt werden, bevor du intensiv trainierst." },
            { v: "atemnot", label: "Starke Atemnot bei leichter Belastung", flag: "Starke Atemnot bei leichter Belastung bitte ärztlich abklären lassen." },
            { v: "apnoe", label: "Beobachtete Atemaussetzer im Schlaf", flag: "Atemaussetzer im Schlaf (Verdacht Schlafapnoe) bitte ärztlich abklären — das beeinflusst Energie und Gesundheit erheblich." },
            { v: "blut", label: "Blut im Urin oder Stuhl", flag: "Blut im Urin oder Stuhl gehört umgehend in ärztliche Abklärung." },
            { v: "gewichtsverlust", label: "Ungewollter starker Gewichtsverlust", flag: "Ungewollter starker Gewichtsverlust sollte ärztlich abgeklärt werden." },
            { v: "blutdruck", label: "Bekannter, sehr hoher Blutdruck", flag: "Bei sehr hohem Blutdruck bitte vor Trainingsstart Rücksprache mit deinem Arzt halten." },
            { v: "depression", label: "Starke depressive Gedanken", flag: "Bei starken depressiven Gedanken hol dir bitte professionelle Hilfe — z. B. über deinen Hausarzt oder die Telefonseelsorge (0800 111 0 111, kostenlos & anonym)." },
            { v: "labor", label: "Stark auffällige Laborwerte ohne ärztliche Begleitung", flag: "Auffällige Laborwerte sollten immer ärztlich eingeordnet werden — Coaching ersetzt das nicht." },
            { v: "hormone", label: "Einnahme von Hormonen ohne ärztliche Betreuung", flag: "Hormonpräparate gehören ausschließlich in ärztliche Begleitung. Bitte sprich mit einem Arzt — wir unterstützen nur bei Lifestyle-Struktur." },
            { v: "keine", label: "Nichts davon trifft zu", exclusive: true }
          ]
        }
      ]
    },

    /* ---------- 11. Qualifizierung ---------- */
    {
      id: "qualify", label: "Letzte Fragen",
      questions: [
        {
          id: "qual_time", type: "single", module: null,
          title: "Bist du bereit, in den nächsten 12 Wochen mindestens 3 Stunden pro Woche in Training, Tracking und Umsetzung zu investieren?",
          options: [
            { v: "ja", label: "Ja" },
            { v: "eher_ja", label: "Eher ja" },
            { v: "unsicher", label: "Unsicher" },
            { v: "nein", label: "Nein" }
          ]
        },
        {
          id: "qual_support", type: "single", module: null,
          title: "Welche Art von Unterstützung suchst du?",
          options: [
            { v: "allein", label: "Ich will es allein umsetzen" },
            { v: "plan", label: "Ich will einen klaren Plan" },
            { v: "checkin", label: "Ich will wöchentliche Kontrolle" },
            { v: "coaching", label: "Ich will 1:1 Coaching" },
            { v: "blutwerte", label: "Ich will Blutwerte besser verstehen" },
            { v: "unknown", label: "Ich weiß es noch nicht" }
          ]
        },
        {
          id: "qual_start", type: "single", module: null,
          title: "Wie schnell willst du starten?",
          options: [
            { v: "sofort", label: "Sofort" },
            { v: "2w", label: "Innerhalb von 2 Wochen" },
            { v: "1to2m", label: "In 1–2 Monaten" },
            { v: "spaeter", label: "Irgendwann später" }
          ]
        }
      ]
    }
  ],

  /* ==========================================================================
     ERGEBNISTEXTE pro Modul (niedrig < 40, mittel 40–69, hoch ≥ 70)
     ========================================================================== */

  moduleTexts: {
    body: {
      low: "Dir fehlt vor allem eine klare Ausgangslage. Gewicht allein reicht nicht — dein erster Hebel sind Bauchumfang, Fotos und ein realistisches 12-Wochen-Ziel.",
      mid: "Du hast eine solide Basis, aber dein Körper verändert sich nicht planbar genug. Wahrscheinlich fehlen dir klare Ernährungssteuerung und regelmäßige Messpunkte.",
      high: "Deine Körperbasis ist gut. Bei dir geht es eher um Feintuning: Kraft, Muskelaufbau, Erholung und präzisere Ernährung."
    },
    strength: {
      low: "Du brauchst keinen perfekten Split. Du brauchst zuerst feste Trainingstage, klare Übungen und einfache Progression.",
      mid: "Du trainierst bereits, aber vermutlich nicht messbar genug. Dein Hebel ist Trainingsdokumentation und planbare Steigerung.",
      high: "Deine Trainingsbasis ist stark. Dein nächster Hebel liegt wahrscheinlich eher bei Fuel oder Recovery."
    },
    fuel: {
      low: "Dein Fuel Score ist aktuell ein großer Hebel. Du brauchst keine neue Diät, sondern klare Proteinziele, einfache Standardmahlzeiten und eine Wochenendstrategie.",
      mid: "Du isst wahrscheinlich qualitativ okay, aber nicht messbar genug. Dein Körper verändert sich erst planbar, wenn Mengen, Protein und Wochenenden kontrollierbarer werden.",
      high: "Deine Ernährung ist gut strukturiert. Feintuning läuft über Timing, Kalorien, Proteinverteilung und Alltagssituationen."
    },
    recovery: {
      low: "Dein Recovery Score ist ein echter Engpass. Mehr Training wird dich nicht retten, wenn Schlaf, Stress und Regeneration gegen dich arbeiten.",
      mid: "Deine Erholung ist okay, aber nicht stabil. Kleine Änderungen bei Schlafzeit, Koffein, Abendroutine und Trainingslast können großen Effekt haben.",
      high: "Deine Recovery-Basis ist gut. Dadurch kannst du stärker über Training und Ernährung skalieren."
    },
    blood: {
      low: "Dein Blood Score ist niedrig. Das heißt nicht, dass etwas nicht stimmt — es heißt: Dir fehlt eine saubere Datenbasis. Dein nächster Schritt ist nicht mehr raten, sondern eine klare Baseline.",
      mid: "Du hast Daten, aber noch kein System. Jetzt geht es darum, Werte zu sortieren, Verläufe zu erkennen und gezielte Fragen für den Arzt vorzubereiten.",
      high: "Du bist datenorientiert. Dein Risiko ist eher Overthinking — Priorisierung ist wichtiger als noch mehr Einzelwerte."
    },
    drive: {
      low: "Dein Drive Score ist niedrig. Das kann viele Ursachen haben: Schlaf, Stress, Körperfett, Ernährung oder Blutwerte. Wir bewerten das nicht medizinisch, sondern zeigen dir, welche Lifestyle-Hebel zuerst geprüft werden sollten.",
      mid: "Deine Energie ist nicht schlecht, aber instabil. Wahrscheinlich brauchst du bessere Schlaf- und Ernährungsrhythmen plus kontrolliertes Training.",
      high: "Dein Drive ist eine Stärke. Nutze ihn, um Body, Fuel oder Strength konsequenter umzusetzen."
    },
    execution: {
      low: "Dein größter Engpass ist nicht Wissen, sondern Umsetzung. Du brauchst ein kleineres, klareres System und regelmäßige Kontrolle.",
      mid: "Du kannst umsetzen, aber dein Alltag wirft dich zu oft raus. Dein System muss besonders auf Planung, Check-ins und einfache Regeln setzen.",
      high: "Deine Umsetzungsbereitschaft ist stark. Mit einem guten Plan kannst du schnell Fortschritte machen."
    }
  },

  /* ---------- Sofortmaßnahmen pro Hauptengpass ---------- */
  nextSteps: {
    body: [
      "Bauchumfang messen (auf Nabelhöhe, ausgeatmet) und 3 Fotos machen — front, seitlich, hinten.",
      "Einen festen wöchentlichen Messtermin festlegen: gleicher Tag, gleiche Uhrzeit.",
      "Dein 12-Wochen-Ziel in Zahlen notieren: Ziel-Bauchumfang und Ziel-Gewichtskorridor."
    ],
    strength: [
      "3 feste Trainingstermine in den Kalender eintragen — wie Geschäftstermine.",
      "Einen einfachen A/B/C-Ganzkörperplan festlegen (6 Grundübungen reichen).",
      "Ab sofort jedes Training dokumentieren: Übung, Gewicht, Wiederholungen."
    ],
    fuel: [
      "Protein-Tagesziel festlegen: ca. 1,6–2 g pro kg Zielgewicht.",
      "Zwei Standardmahlzeiten definieren, die du ohne Nachdenken wiederholen kannst.",
      "Wochenendstrategie schriftlich festlegen: Alkohol- und Snack-Limit vorab definieren."
    ],
    recovery: [
      "Feste Schlafenszeit für die nächsten 7 Tage festlegen — Ziel: mindestens 7 Stunden.",
      "Koffein nach 14 Uhr streichen.",
      "Abendroutine bauen: letzte 30 Minuten vor dem Schlafen ohne Bildschirm."
    ],
    blood: [
      "Letzte Laborwerte raussuchen — oder einen Termin für ein Basislabor vereinbaren.",
      "Die MaleMetrix Blutwerte-Checkliste nutzen, um das Arztgespräch vorzubereiten.",
      "Eine einfache Verlaufstabelle anlegen: Wert, Datum, Referenzbereich."
    ],
    drive: [
      "Schlaf vor Koffein: ein festes 7-Stunden-Schlaffenster blocken.",
      "Tägliches Schritteziel setzen (z. B. 8.000) und per Handy tracken.",
      "Die 3 größten Energiefresser notieren — und einen davon diese Woche streichen."
    ],
    execution: [
      "System verkleinern: nur 3 Regeln für die nächsten 14 Tage — nicht mehr.",
      "Festen Wochen-Check-in einrichten: z. B. Sonntag 19 Uhr, 10 Minuten Review.",
      "Accountability organisieren: Trainingspartner, Coach oder öffentliches Commitment."
    ]
  },

  /* ---------- Engpass-Texte ---------- */
  bottleneckTexts: {
    body: { name: "Baseline & Körperdaten", text: "Ohne saubere Ausgangslage ist jeder Plan ein Blindflug. Dein erster Hebel: messen, fotografieren, Ziel definieren." },
    strength: { name: "Trainingsstruktur", text: "Du hast kein Motivationsproblem — dir fehlt ein planbares Training mit Progression. Feste Tage, feste Übungen, dokumentierte Steigerung." },
    fuel: { name: "Ernährungssystem", text: "Du hast kein Trainingsproblem. Du hast ein Ernährungssystem-Problem: Protein, Mengen und Wochenenden müssen messbar werden." },
    recovery: { name: "Schlaf & Regeneration", text: "Bevor du härter trainierst oder Hormone überinterpretierst: Schlaf, Stress und Erholung sind bei dir der erste Hebel." },
    blood: { name: "Datenbasis & Blutwerte", text: "Du interpretierst Energie und Fortschritt nach Gefühl. Eine saubere Baseline (Blutwerte + Körperdaten) macht Schluss mit dem Raten." },
    drive: { name: "Energie-Management", text: "Deine Energie ist der Engpass — und sie hängt fast immer an Schlaf, Bewegung, Ernährung und Stress. Genau da setzen wir an." },
    execution: { name: "Umsetzung", text: "Du weißt wahrscheinlich genug. Was fehlt, ist Kontrolle und ein System, das deinen Alltag überlebt — nicht mehr Wissen." }
  },

  /* ==========================================================================
     ARCHETYPEN
     ========================================================================== */

  archetypes: [
    {
      id: "hormon_fokus",
      name: "Der Hormon-Fokussierte",
      tagline: "Du denkst über Testosteron nach — aber dein System verdient den ersten Blick.",
      text: "Hormone können relevant sein, aber sie wirken nie isoliert. Bevor du sie überinterpretierst, muss dein System vollständig betrachtet werden: Schlaf, Körperfett, Training, Ernährung, Blutwerte — und die ärztliche Einordnung.",
      offer: "Blood & Performance Clarity", cta: "Blood & Performance Gespräch buchen",
      match(s, a) {
        const goals = a.goal_main || [];
        return (goals.includes("hormone") || a.drv_cause === "hormone" || a.goal_pain === "blutwerte") && s.drive <= 55;
      },
      plan: [
        { day: "Tag 1", items: ["Gewicht + Bauchumfang messen, 3 Fotos machen", "Schlafzeiten der letzten 7 Tage ehrlich notieren"] },
        { day: "Tag 2", items: ["Letzte Laborwerte raussuchen oder Basislabor-Termin vereinbaren", "Blutwerte-Checkliste durchgehen"] },
        { day: "Tag 3", items: ["Erstes Krafttraining: Ganzkörper, 45–60 Min, keine Maximalversuche"] },
        { day: "Tag 4", items: ["Koffein nach 14 Uhr streichen", "Festes 7-Stunden-Schlaffenster definieren"] },
        { day: "Tag 5", items: ["Zweites Krafttraining", "Protein-Ziel festlegen (1,6–2 g/kg)"] },
        { day: "Tag 6", items: ["Wochenendstrategie: Alkohol- und Snack-Limit vorab festlegen", "8.000+ Schritte"] },
        { day: "Tag 7", items: ["Review: Schlaf, Energie, Training, Protein", "Fragenliste für den Arzt vorbereiten"] }
      ]
    },
    {
      id: "muede_leistung",
      name: "Der müde Leistungsträger",
      tagline: "Du funktionierst — aber du regenerierst nicht.",
      text: "Job und Familie laufen, aber dein Körper bekommt nicht die Bedingungen, die er braucht: zu wenig Schlaf, zu viel Stress, zu wenig Struktur. Dein Hebel ist nicht mehr Disziplin — es sind bessere Rahmenbedingungen.",
      offer: "Energy Reset", cta: "Energy Reset anfragen",
      match(s) { return s.recovery <= 50 && s.drive <= 55; },
      plan: [
        { day: "Tag 1", items: ["Gewicht + Bauchumfang messen, 3 Fotos machen", "Schlafzeiten der letzten 7 Tage notieren"] },
        { day: "Tag 2", items: ["Feste Schlafenszeit festlegen (Ziel: 7 h+)", "Protein-Ziel festlegen, 2 Standardmahlzeiten definieren"] },
        { day: "Tag 3", items: ["Erstes Krafttraining: 45–60 Min, moderat", "Koffein nach 14 Uhr streichen"] },
        { day: "Tag 4", items: ["20 Minuten Spaziergang (am besten mittags)", "Abendroutine: 30 Min ohne Bildschirm"] },
        { day: "Tag 5", items: ["Zweites Krafttraining", "Schritteziel erreichen (8.000+)"] },
        { day: "Tag 6", items: ["Wochenendstrategie: Alkohol & Snacks vorab begrenzen"] },
        { day: "Tag 7", items: ["Review: Gewicht, Bauchumfang, Schlaf, Training, Energie (1–10)"] }
      ]
    },
    {
      id: "stark_weich",
      name: "Der Starke mit Substanz",
      tagline: "Dein Muskel-Fundament ist da. Jetzt muss deine Ernährung messbar werden.",
      text: "Du trainierst, deine Kraft ist okay — aber Bauchfett und unklare Ernährung fressen deine Ergebnisse. Du brauchst keine härteren Workouts, sondern ein Ernährungssystem mit Zahlen.",
      offer: "Cut & Recomp", cta: "Cut & Recomp Coaching anfragen",
      match(s) { return s.strength >= 55 && (s.body <= 50 || s.fuel <= 50); },
      plan: [
        { day: "Tag 1", items: ["Bauchumfang messen + 3 Fotos", "Realistisches 12-Wochen-Ziel notieren (z. B. −6 cm Bauch)"] },
        { day: "Tag 2", items: ["Protein-Ziel festlegen (1,8–2 g/kg)", "Kalorien-Korridor für moderate Defizitphase bestimmen"] },
        { day: "Tag 3", items: ["Training wie gewohnt — aber dokumentieren: Gewicht, Wdh."] },
        { day: "Tag 4", items: ["7 Tage Kalorien-Tracking starten (nur beobachten, nichts ändern)"] },
        { day: "Tag 5", items: ["Training + 8.000 Schritte"] },
        { day: "Tag 6", items: ["Wochenendstrategie: Alkohol-Limit + 1 flexible Mahlzeit einplanen"] },
        { day: "Tag 7", items: ["Review: Durchschnittskalorien, Protein, Bauchumfang"] }
      ]
    },
    {
      id: "skinny_fat",
      name: "Der Recomp-Kandidat",
      tagline: "Dein Ziel ist nicht einfach abnehmen — dein Ziel ist Recomposition.",
      text: "Normales Gewicht, wenig Muskeln, Bauchansatz: Klassischer Fall für Recomp — Muskeln rauf, Fett runter. Dein Hebel ist progressives Krafttraining plus ausreichend Protein, nicht weniger essen.",
      offer: "Recomp System", cta: "Recomp Plan erstellen lassen",
      match(s, a) {
        const bmi = a._bmi || 0;
        return bmi >= 19 && bmi <= 26.5 && s.strength <= 50 && s.body <= 60;
      },
      plan: [
        { day: "Tag 1", items: ["Bauchumfang + Gewicht messen, 3 Fotos", "Kraft-Baseline: Liegestütze am Stück, Plank-Zeit notieren"] },
        { day: "Tag 2", items: ["Protein-Ziel: 1,8–2 g/kg — das ist dein wichtigster Ernährungshebel", "2 proteinreiche Standardmahlzeiten festlegen"] },
        { day: "Tag 3", items: ["Krafttraining A: Ganzkörper, Grundübungen, Gewichte notieren"] },
        { day: "Tag 4", items: ["8.000+ Schritte", "Kalorien grob checken: Ziel ≈ Erhaltung, nicht Crash"] },
        { day: "Tag 5", items: ["Krafttraining B: leicht andere Übungsauswahl"] },
        { day: "Tag 6", items: ["Aktive Erholung: Spaziergang, Mobility 15 Min"] },
        { day: "Tag 7", items: ["Review + 3 feste Trainingstermine für nächste Woche eintragen"] }
      ]
    },
    {
      id: "datenblind",
      name: "Der Datenblinde",
      tagline: "Du brauchst nicht mehr raten. Du brauchst eine saubere Ausgangslage.",
      text: "Keine Blutwerte, kein Tracking, kein Bauchumfang, keine Kraftwerte — du steuerst im Nebel. Die gute Nachricht: Eine Baseline ist in 7 Tagen aufgebaut, und ab dann wird jeder Fortschritt sichtbar.",
      offer: "Baseline Analyse", cta: "Baseline Analyse buchen",
      match(s) { return s.blood <= 35 && s.body <= 45; },
      plan: [
        { day: "Tag 1", items: ["Gewicht + Bauchumfang messen (Nabelhöhe, ausgeatmet)", "3 Fotos: front, seitlich, hinten"] },
        { day: "Tag 2", items: ["Schritte-Tracking am Handy aktivieren", "Schlafzeiten notieren (Beginn/Ende)"] },
        { day: "Tag 3", items: ["Kraft-Baseline: Liegestütze, Plank, Kniebeugen mit Körpergewicht"] },
        { day: "Tag 4", items: ["1 Tag Ernährung komplett aufschreiben — ohne zu bewerten"] },
        { day: "Tag 5", items: ["Basislabor-Termin vereinbaren oder letzte Werte raussuchen"] },
        { day: "Tag 6", items: ["Blutwerte-Checkliste durchgehen, Arztfragen notieren"] },
        { day: "Tag 7", items: ["Alle Baseline-Daten in eine Übersicht eintragen — fertig ist deine Ausgangslage"] }
      ]
    },
    {
      id: "ueberoptimierer",
      name: "Der Über-Optimierer",
      tagline: "Du hast genug Werkzeuge. Du brauchst Reihenfolge.",
      text: "Viele Daten, viele Supplements, ständig neue Methoden — aber wenig Priorisierung. Mehr Messung ersetzt keine Umsetzung. Dein Hebel: radikal vereinfachen und 12 Wochen lang eine Sache durchziehen.",
      offer: "Priority Coaching", cta: "Priority Coaching anfragen",
      match(s) { return s.blood >= 60 && (s.execution <= 50 || s.recovery <= 50); },
      plan: [
        { day: "Tag 1", items: ["Alle aktuellen Maßnahmen auflisten — ehrlich und vollständig"] },
        { day: "Tag 2", items: ["Auf 3 Kernmaßnahmen reduzieren: Training, Protein, Schlaf. Rest pausieren."] },
        { day: "Tag 3", items: ["Krafttraining A — dokumentiert, ohne Experimente"] },
        { day: "Tag 4", items: ["Festes Schlaffenster definieren und einhalten"] },
        { day: "Tag 5", items: ["Krafttraining B", "Protein-Ziel treffen"] },
        { day: "Tag 6", items: ["Kein neues Tool, keine neue Methode — nur umsetzen"] },
        { day: "Tag 7", items: ["Review: Was wurde wirklich umgesetzt? Nur das zählt."] }
      ]
    },
    {
      id: "neustarter",
      name: "Der Neustarter",
      tagline: "Dein Vorteil: Du wirst mit einfachen Maßnahmen schnell messbare Fortschritte sehen.",
      text: "Lange raus, Motivation da, Struktur fehlt. Genau hier wirken die Basics am stärksten: feste Trainingstage, Proteinziel, Schritte, Schlaf. Kein Spezialplan — ein starkes Fundament.",
      offer: "Foundation", cta: "Foundation Coaching anfragen",
      match(s, a) { return (a.history === "lange_raus" || a.history === "nie") && s.strength <= 40; },
      plan: [
        { day: "Tag 1", items: ["Gewicht + Bauchumfang messen, 3 Fotos machen", "12-Wochen-Ziel in einem Satz notieren"] },
        { day: "Tag 2", items: ["3 feste Trainingstermine in den Kalender eintragen", "Protein-Ziel festlegen"] },
        { day: "Tag 3", items: ["Erstes Training: Ganzkörper, leicht, Technik im Fokus, 45 Min"] },
        { day: "Tag 4", items: ["20–30 Min Spaziergang", "2 Standardmahlzeiten definieren"] },
        { day: "Tag 5", items: ["Zweites Training: gleiche Übungen, sauber dokumentieren"] },
        { day: "Tag 6", items: ["Wochenendstrategie festlegen — der häufigste Stolperstein"] },
        { day: "Tag 7", items: ["Review: Was lief gut? 3 Termine für nächste Woche bestätigen"] }
      ]
    }
  ],

  /* Fallback-Archetyp nach Hauptengpass */
  archetypeFallback: {
    body: "datenblind", strength: "neustarter", fuel: "stark_weich",
    recovery: "muede_leistung", blood: "datenblind", drive: "muede_leistung", execution: "ueberoptimierer"
  }
};
