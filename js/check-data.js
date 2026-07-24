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
    strength: "Kraft, Cardio & Progression",
    fuel: "Ernährung, Protein & Alltag",
    recovery: "Schlaf, Stress & Regeneration",
    blood: "Gesundheitsdaten & Prävention",
    drive: "Energie, Fokus & Antrieb",
    execution: "Umsetzung & Routinen"
  },

  /* Deutsche Anzeigenamen fürs Dashboard (einheitlich mit der Startseite).
     Nur Darstellung — Scoring/Keys bleiben unverändert. */
  moduleNamesDe: {
    body: "Körper", strength: "Training & Fitness", fuel: "Ernährung", recovery: "Schlaf & Erholung",
    blood: "Blutwerte & Prävention", drive: "Energie & Antrieb", execution: "Umsetzung"
  },
  moduleNamesShort: {
    body: "Körper", strength: "Training", fuel: "Ernährung", recovery: "Schlaf",
    blood: "Blutwerte", drive: "Energie", execution: "Umsetzung"
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
          sub: "Genau ein Punkt — der, den du am liebsten sofort loswerden würdest.",
          options: [
            { v: "bauch", label: "Bauch / Taille" },
            { v: "muskelmasse", label: "Zu wenig Muskelmasse" },
            { v: "kraft", label: "Geringe Kraft / Performance" },
            { v: "muede", label: "Niedrige Energie" },
            { v: "schlaf", label: "Schlechter Schlaf" },
            { v: "libido", label: "Libido / Erektion" },
            { v: "blutwerte", label: "Blutwerte / Gesundheitsrisiko" },
            { v: "gewicht", label: "Gewicht" },
            { v: "essen", label: "Unkontrolliertes Essen" },
            { v: "struktur", label: "Keine Struktur" },
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
      id: "body", label: "Körper & Bauchumfang",
      questions: [
        {
          id: "body_weighttrend", type: "single", module: "body",
          title: "Wie hat sich dein Gewicht in den letzten 12 Monaten entwickelt?",
          sub: "Wir bewerten Stabilität und Kontrolle — nicht Abnehmen um jeden Preis.",
          options: [
            { v: "plus8", label: "Mehr als 8 kg zugenommen", p: 3 },
            { v: "plus48", label: "4–8 kg zugenommen", p: 7 },
            { v: "gleich", label: "Etwa gleich geblieben", p: 15 },
            { v: "minus48", label: "4–8 kg abgenommen", p: 13 },
            { v: "minus8", label: "Mehr als 8 kg abgenommen", p: 9 },
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
          when: function (a) { return !a.body_type || a.body_type === "unknown"; },
          title: "Wie zufrieden bist du mit deiner aktuellen Form?",
          sub: "1 = sehr unzufrieden · 10 = sehr zufrieden. Subjektiv — fließt bewusst nur schwach in den Score ein.",
          pointsMap: [[2, 3], [4, 5], [6, 7], [8, 8], [10, 7]]
        }
      ]
    },

    /* ---------- 3b. STATUS-ROUTING (V2) — die zentrale Weiche ----------
       Diese Antwort ist KEINE Bewertung. Sie entscheidet, welche Fragen
       überhaupt sinnvoll sind und wie das Ergebnis gelesen werden muss.
       Sie erzeugt NIE einen direkten Punktabzug (siehe SCORE_V2_LOGIC.md). */
    {
      id: "status", label: "Dein Kontext",
      questions: [
        {
          id: "perf_status", type: "single", module: null,
          title: "Welcher Status beschreibt dich aktuell am besten?",
          sub: "Ehrlich beantwortet, weil davon abhängt, welche Fragen und welche Einordnung für dich überhaupt sinnvoll sind. Dein Status kostet dich keinen einzigen Punkt — bewertet wird nur, wie gut dein aktuelles System kontrolliert ist.",
          options: [
            { v: "natural", label: "NATURAL — ich verwende aktuell keine hormonellen oder pharmakologischen Performance-Enhancer." },
            { v: "former_enhanced", label: "FRÜHER ENHANCED — ich habe früher hormonelle / leistungssteigernde Substanzen verwendet, aktuell nicht." },
            { v: "medical_trt", label: "TRT / ÄRZTLICHE HORMONTHERAPIE — ich erhalte aktuell eine medizinisch begleitete Testosteron- oder Hormontherapie." },
            { v: "enhanced", label: "ENHANCED — ich verwende aktuell hormonelle oder pharmakologische Substanzen für Leistung, Körperkomposition oder Performance." },
            { v: "uncertain", label: "NICHT SICHER — ich weiß nicht genau, welcher Kategorie ich mich zuordnen soll." }
          ]
        },
        {
          id: "unc_context", type: "single", module: null,
          when: function (a) { return a.perf_status === "uncertain"; },
          title: "Damit wir dich nicht falsch einsortieren: Was trifft am ehesten zu?",
          sub: "Keine Zuordnung wird erzwungen. Wenn nichts passt, bleibt dein Status offen — das Ergebnis funktioniert trotzdem.",
          options: [
            { v: "supplements_only", label: "Ich nehme nur frei verkäufliche Supplements (z. B. Kreatin, Protein, Vitamine)" },
            { v: "prescribed_unclear", label: "Ich nehme etwas ärztlich Verordnetes und weiß nicht, ob das dazuzählt" },
            { v: "past_unclear", label: "Ich hatte früher etwas verwendet, bin mir bei der Einordnung aber unsicher" },
            { v: "current_unclear", label: "Ich verwende aktuell etwas, bin mir bei der Einordnung aber unsicher" },
            { v: "no_answer", label: "Möchte ich nicht angeben" }
          ]
        }
      ]
    },

    /* ---------- 3c. NATURAL-PFAD ---------- */
    {
      id: "ctx_natural", label: "Natural-Kontext",
      when: function (a) {
        var st = window.MM_CHECK.statusOf(a);
        /* Auch bei offenem Status: neutrale Fragen statt erzwungener Einordnung. */
        return st === "natural" || st === "uncertain";
      },
      questions: [
        {
          id: "nat_training_response", type: "single", module: "strength", dom: "training",
          title: "Wie reagiert dein Körper aktuell auf Training?",
          sub: "Trainingsantwort ist einer der ehrlichsten Alltagsmarker — und kein Hormonbefund.",
          options: [
            { v: "gut", label: "Guter, sichtbarer Fortschritt", p: 12 },
            { v: "langsam", label: "Langsamer Fortschritt", p: 8 },
            { v: "stagniert", label: "Stagniert seit Längerem", p: 4, sig: "training_stall" },
            { v: "verlust", label: "Deutlicher Leistungs-/Kraftverlust", p: 1, sig: "strength_loss" },
            { v: "unknown", label: "Kann ich nicht einschätzen", p: 5, gap: "training_response" }
          ]
        },
        {
          id: "nat_recovery", type: "single", module: "recovery", dom: "recovery",
          title: "Wie gut erholst du dich zwischen den Belastungen?",
          options: [
            { v: "gut", label: "Gut — ich bin am nächsten Tag wieder da", p: 14 },
            { v: "mittel", label: "Mittel — es zieht sich manchmal", p: 9 },
            { v: "schlecht", label: "Schlecht — ich bin dauerhaft angeschlagen", p: 3, sig: "poor_recovery" }
          ]
        }
      ]
    },

    /* ---------- 3d. FRÜHER-ENHANCED-PFAD ---------- */
    {
      id: "ctx_former", label: "Rückkehr-Kontext",
      when: function (a) { return window.MM_CHECK.statusOf(a) === "former_enhanced"; },
      questions: [
        {
          id: "fe_last_use", type: "single", module: null, dom: "recoveryStatus",
          title: "Wann war die letzte Anwendung?",
          options: [
            { v: "lt3m", label: "Vor weniger als 3 Monaten", p: 4 },
            { v: "3to6m", label: "Vor 3–6 Monaten", p: 6 },
            { v: "6to12m", label: "Vor 6–12 Monaten", p: 9 },
            { v: "gt12m", label: "Vor mehr als 12 Monaten", p: 12 },
            { v: "unknown", label: "Weiß ich nicht mehr genau", p: 6, gap: "former_timeline" }
          ]
        },
        {
          id: "fe_duration", type: "single", module: null, dom: "recoveryStatus",
          title: "Wie lange hast du insgesamt angewendet?",
          sub: "Gesamtdauer der Exposition — grobe Einordnung reicht.",
          options: [
            { v: "lt3m", label: "Unter 3 Monate", p: 12 },
            { v: "3to12m", label: "3–12 Monate", p: 9 },
            { v: "1to3y", label: "1–3 Jahre", p: 6 },
            { v: "gt3y", label: "Über 3 Jahre", p: 4 },
            { v: "unknown", label: "Weiß ich nicht", p: 6, gap: "former_exposure" }
          ]
        },
        {
          id: "fe_changes", type: "multi", module: null, dom: null, cap: 0,
          title: "Was hat sich seit dem Absetzen verändert?",
          sub: "Mehrfachauswahl. Diese Angaben erzeugen keine Diagnose — sie steuern, worauf wir dich hinweisen.",
          options: [
            { v: "libido", label: "Libido reduziert", sig: "sexual" },
            { v: "erektion", label: "Erektionsfunktion verändert", sig: "sexual" },
            { v: "energie", label: "Energie niedriger", sig: "energy" },
            { v: "stimmung", label: "Stimmung verändert", sig: "mood" },
            { v: "kraft", label: "Kraftverlust", sig: "strength_loss" },
            { v: "koerper", label: "Körperkomposition verschlechtert", sig: "body" },
            { v: "fertilitaet", label: "Kinderwunsch / Fruchtbarkeit ist ein Thema", sig: "fertility" },
            { v: "keine", label: "Nichts davon", exclusive: true },
            { v: "unsure", label: "Unsicher", exclusive: true, gap: "former_symptoms" }
          ]
        },
        {
          id: "fe_followup", type: "single", module: null, dom: "recoveryStatus",
          title: "Gab es nach dem Absetzen eine ärztliche Nachkontrolle / Blutwerte?",
          options: [
            { v: "vollstaendig", label: "Ja, vollständig und ärztlich eingeordnet", p: 16 },
            { v: "teilweise", label: "Teilweise", p: 9 },
            { v: "nein", label: "Nein", p: 3, gap: "former_followup" },
            { v: "unsure", label: "Weiß ich nicht", p: 5, gap: "former_followup" }
          ]
        }
      ]
    },

    /* ---------- 3e. MEDIZINISCHE TRT ---------- */
    {
      id: "ctx_trt", label: "Therapie-Kontext",
      when: function (a) { return window.MM_CHECK.statusOf(a) === "medical_trt"; },
      questions: [
        {
          id: "trt_reason", type: "single", module: null, dom: null,
          title: "Warum wurde die Therapie begonnen?",
          sub: "Der Anlass verändert, was sinnvoll kontrolliert wird — nicht deinen Score.",
          options: [
            { v: "hypogonadismus", label: "Diagnostizierter Hypogonadismus" },
            { v: "sekundaer", label: "Sekundär zu einer anderen Erkrankung" },
            { v: "nach_aas", label: "Nach vorheriger Anwendung leistungssteigernder Substanzen" },
            { v: "symptome", label: "Alters-/symptomgetrieben" },
            { v: "unsure", label: "Weiß ich nicht genau", gap: "trt_indication" },
            { v: "other", label: "Anderer Grund" }
          ]
        },
        {
          id: "trt_supervision", type: "single", module: null, dom: "therapyControl",
          title: "Wie eng ist deine Therapie aktuell ärztlich begleitet?",
          options: [
            { v: "regelmaessig", label: "Regelmäßig ärztlich betreut", p: 22 },
            { v: "gelegentlich", label: "Gelegentliche Betreuung", p: 14 },
            { v: "selbst", label: "Rezept vorhanden, aber faktisch selbst gesteuert", p: 6, sig: "trt_unsupervised" },
            { v: "keine", label: "Aktuell keine Betreuung", p: 2, sig: "trt_unsupervised" }
          ]
        },
        {
          id: "trt_duration", type: "single", module: null, dom: null,
          title: "Wie lange läuft die Therapie bereits?",
          options: [
            { v: "lt6m", label: "Unter 6 Monate" },
            { v: "6to12m", label: "6–12 Monate" },
            { v: "1to3y", label: "1–3 Jahre" },
            { v: "gt3y", label: "Über 3 Jahre" },
            { v: "unsure", label: "Weiß ich nicht genau" }
          ]
        },
        {
          id: "trt_followup", type: "single", module: null, dom: "therapyControl",
          title: "Wann waren die letzten Verlaufskontrollen (Blutwerte)?",
          sub: "In der Einstellungsphase sind engere Kontrollen üblich, später meist jährlich — das entscheidet dein Arzt.",
          options: [
            { v: "lt3m", label: "Vor unter 3 Monaten", p: 20 },
            { v: "3to6m", label: "Vor 3–6 Monaten", p: 18 },
            { v: "6to12m", label: "Vor 6–12 Monaten", p: 13 },
            { v: "gt12m", label: "Vor über 12 Monaten", p: 5, gap: "trt_labs" },
            { v: "nie", label: "Nie / weiß ich nicht", p: 1, gap: "trt_labs" }
          ]
        },
        {
          id: "trt_response", type: "single", module: null, dom: null,
          title: "Haben sich deine ursprünglichen Beschwerden unter der Therapie verändert?",
          sub: "Therapie-ANSPRECHEN ist nicht dasselbe wie Therapie-KONTROLLE. Beides wird getrennt ausgewertet.",
          options: [
            { v: "klar", label: "Deutlich verbessert" },
            { v: "teilweise", label: "Teilweise verbessert" },
            { v: "nein", label: "Nicht verbessert", sig: "trt_no_response" },
            { v: "schlechter", label: "Verschlechtert", sig: "trt_worse" },
            { v: "unsure", label: "Kann ich nicht sagen", gap: "trt_response" }
          ]
        },
        {
          id: "trt_fertility", type: "single", module: null, dom: null,
          title: "Ist Kinderwunsch für dich aktuell ein Thema?",
          sub: "Relevant, weil Fruchtbarkeit unter Hormontherapie ärztlich mitgedacht werden sollte.",
          options: [
            { v: "ja", label: "Ja", sig: "fertility" },
            { v: "nein", label: "Nein" },
            { v: "unsure", label: "Unsicher", sig: "fertility" },
            { v: "abgeschlossen", label: "Familienplanung abgeschlossen" },
            { v: "no_answer", label: "Möchte ich nicht angeben" }
          ]
        }
      ]
    },

    /* ---------- 3f. ENHANCED ----------
       Kontext-Routing, KEIN Stack-Optimizer: keine Dosierungen, keine
       Gegenmittel, keine „nimm X dazu"-Logik. Nur: was ist relevant zu
       kontrollieren, und was davon fehlt aktuell. */
    {
      id: "ctx_enhanced", label: "Enhanced-Kontext",
      when: function (a) { return window.MM_CHECK.statusOf(a) === "enhanced"; },
      questions: [
        {
          id: "enh_context", type: "single", module: null, dom: null,
          title: "Wie sieht dein aktueller Kontext aus?",
          sub: "MaleMetrix bewertet nicht, WAS du tust — sondern wie gut das System kontrolliert ist.",
          options: [
            { v: "cruise", label: "TRT-ähnlich / Cruise" },
            { v: "blast", label: "Aktive Aufbau-/Leistungsphase" },
            { v: "blast_cruise", label: "Blast & Cruise" },
            { v: "transition", label: "Übergangs-/Absetzphase" },
            { v: "other", label: "Anderer Kontext" },
            { v: "no_answer", label: "Möchte ich nicht angeben", gap: "enh_context" }
          ]
        },
        {
          id: "enh_categories", type: "multi", module: null, dom: null, cap: 0,
          title: "Welche Kategorien sind aktuell beteiligt?",
          sub: "Mehrfachauswahl. Wir fragen Kategorien, keine Präparate und keine Mengen — die Antwort steuert ausschließlich, welche Kontroll-Themen für dich relevant sind.",
          options: [
            { v: "testosterone", label: "Testosteron" },
            { v: "aas", label: "Weitere anabol/androgen wirksame Substanzen" },
            { v: "oral", label: "Orale anabole Substanzen" },
            { v: "gh", label: "Wachstumshormon" },
            { v: "glp1", label: "GLP-1 / GIP-Medikation" },
            { v: "thyroid", label: "Schilddrüsenhormon" },
            { v: "insulin", label: "Insulin / glukosewirksame Substanzen" },
            { v: "stimulants", label: "Stimulanzien" },
            { v: "peptides", label: "Peptide / sonstige Performance-Substanzen" },
            { v: "other", label: "Anderes" },
            { v: "no_answer", label: "Möchte ich nicht angeben", exclusive: true, gap: "enh_categories" }
          ]
        },
        {
          id: "enh_signals", type: "multi", module: null, dom: null, cap: 0,
          title: "Hast du seit Beginn oder Änderung deines aktuellen Regimes etwas davon bemerkt?",
          sub: "Mehrfachauswahl. Diese Angaben steuern Folgefragen — sie sind kein Punktabzug und keine Diagnose.",
          options: [
            { v: "bp", label: "Erhöhter Blutdruck", sig: "bp" },
            { v: "kopfschmerz", label: "Kopfschmerzen", sig: "bp" },
            { v: "atemnot", label: "Ungewohnte Luftnot", sig: "cardio_alarm" },
            { v: "schlaf", label: "Schlaf verschlechtert", sig: "sleep" },
            { v: "schnarchen", label: "Starkes Schnarchen / Tagesmüdigkeit", sig: "apnea" },
            { v: "wasser", label: "Wassereinlagerungen", sig: "edema" },
            { v: "libido", label: "Libido verändert", sig: "sexual" },
            { v: "erektion", label: "Erektionsprobleme", sig: "sexual" },
            { v: "akne", label: "Akne", sig: "derm" },
            { v: "haar", label: "Haarausfall", sig: "derm" },
            { v: "stimmung", label: "Stimmungsveränderungen", sig: "mood" },
            { v: "brust", label: "Brust-/Brustwarzen-Symptome", sig: "hormonal" },
            { v: "fertilitaet", label: "Fruchtbarkeit ist ein Thema", sig: "fertility" },
            { v: "keine", label: "Nichts davon", exclusive: true },
            { v: "unsure", label: "Unsicher", exclusive: true, gap: "enh_signals" }
          ]
        },
        {
          id: "enh_bp_routine", type: "single", module: null, dom: "enhancedControl",
          title: "Wie regelmäßig misst du deinen Blutdruck?",
          sub: "Unter anabol wirksamen Substanzen ist Blutdruck einer der wenigen Werte, die du selbst engmaschig kontrollieren kannst.",
          options: [
            { v: "regelmaessig", label: "Regelmäßig, eigenes Gerät", p: 20 },
            { v: "gelegentlich", label: "Gelegentlich", p: 12 },
            { v: "selten", label: "Selten", p: 5, gap: "bp" },
            { v: "nie", label: "Nie", p: 1, gap: "bp" },
            { v: "diagnostiziert", label: "Bekannt erhöht / in Behandlung", p: 8, sig: "bp_known" },
            { v: "unsure", label: "Weiß ich nicht", p: 3, gap: "bp" }
          ]
        },
        {
          id: "enh_liver", type: "single", module: null, dom: "enhancedControl",
          when: function (a) { return (a.enh_categories || []).indexOf("oral") >= 0; },
          title: "Sind bei dir Leberwerte im Verlauf kontrolliert worden?",
          sub: "Wird gefragt, weil du orale Substanzen angegeben hast — dort ist der Leber-/Lipid-Kontext besonders relevant.",
          options: [
            { v: "aktuell", label: "Ja, aktuell und ärztlich eingeordnet", p: 14 },
            { v: "aelter", label: "Ja, aber ältere Werte", p: 8 },
            { v: "nein", label: "Nein", p: 2, gap: "liver" },
            { v: "unsure", label: "Weiß ich nicht", p: 3, gap: "liver" }
          ]
        },
        {
          id: "enh_glucose", type: "single", module: null, dom: "enhancedControl",
          when: function (a) { var c = a.enh_categories || []; return c.indexOf("gh") >= 0 || c.indexOf("insulin") >= 0; },
          title: "Wird dein Blutzucker (nüchtern oder HbA1c) kontrolliert?",
          sub: "Wird gefragt, weil Wachstumshormon bzw. glukosewirksame Substanzen den Zuckerstoffwechsel direkt betreffen.",
          options: [
            { v: "aktuell", label: "Ja, aktuelle Werte vorhanden", p: 14 },
            { v: "aelter", label: "Nur ältere Werte", p: 8 },
            { v: "nein", label: "Nein", p: 2, gap: "glucose" },
            { v: "unsure", label: "Weiß ich nicht", p: 3, gap: "glucose" }
          ]
        },
        {
          id: "enh_hematology", type: "single", module: null, dom: "enhancedControl",
          when: function (a) { var c = a.enh_categories || []; return c.indexOf("testosterone") >= 0 || c.indexOf("aas") >= 0 || c.indexOf("oral") >= 0; },
          title: "Kennst du deinen aktuellen Hämatokrit / Hämoglobin-Wert?",
          sub: "Wird gefragt, weil androgen wirksame Substanzen das Blutbild verdicken können — einer der klassisch überwachten Werte.",
          options: [
            { v: "aktuell", label: "Ja, aktueller Wert bekannt", p: 16 },
            { v: "aelter", label: "Nur ein älterer Wert", p: 9 },
            { v: "nein", label: "Nein", p: 2, gap: "hematocrit" },
            { v: "unsure", label: "Weiß ich nicht", p: 3, gap: "hematocrit" }
          ]
        }
      ]
    },

    /* ---------- 3g. GLP-1-Kontext (statusunabhängig) ---------- */
    {
      id: "ctx_glp1", label: "GLP-1-Kontext",
      when: function (a) { return window.MM_CHECK.usesGlp1(a); },
      questions: [
        {
          id: "glp1_lean", type: "single", module: "fuel", dom: "nutrition",
          title: "Wie sicherst du unter GLP-1 deine Muskelmasse ab?",
          sub: "Unter starker Appetitreduktion ist Proteinzufuhr plus Krafttraining der entscheidende Hebel gegen Muskelverlust.",
          options: [
            { v: "beides", label: "Protein-Ziel + regelmäßiges Krafttraining", p: 18 },
            { v: "protein", label: "Nur auf Protein geachtet", p: 11 },
            { v: "training", label: "Nur Krafttraining", p: 10 },
            { v: "nichts", label: "Weder noch", p: 3, sig: "lean_mass_risk" },
            { v: "unsure", label: "Weiß ich nicht", p: 5, gap: "glp1_lean" }
          ]
        }
      ]
    },

    /* ---------- 4. Training & Fitness (Kraft + Cardio) ---------- */
    {
      id: "strength", label: "Training & Fitness — Kraft, Cardio & Progression",
      questions: [
        {
          id: "str_freq", type: "single", module: "strength",
          title: "Wie oft trainierst du Kraft pro Woche?",
          sub: "Es zählt sinnvolle Regelmäßigkeit — nicht möglichst viele Tage.",
          options: [
            { v: "0", label: "Gar nicht", p: 2 },
            { v: "1", label: "1× pro Woche", p: 7 },
            { v: "2", label: "2× pro Woche", p: 13 },
            { v: "3", label: "3× pro Woche", p: 16 },
            { v: "4plus", label: "4× oder öfter", p: 16 },
            { v: "unregelmaessig", label: "Sehr unregelmäßig", p: 5 }
          ]
        },
        {
          id: "str_plan", type: "single", module: "strength",
          title: "Trainierst du mit Progression (steigende Belastung über die Zeit)?",
          options: [
            { v: "progression", label: "Ja, mit klarer Progression", p: 16 },
            { v: "ohne_steigerung", label: "Ja, aber ohne klare Steigerung", p: 10 },
            { v: "spontan", label: "Ich mache spontan, worauf ich Lust habe", p: 6 },
            { v: "selten", label: "Ich trainiere selten", p: 3 },
            { v: "nein", label: "Gar nicht", p: 0 }
          ]
        },
        {
          id: "str_log", type: "single", module: "strength",
          title: "Wie dokumentierst du dein Training?",
          options: [
            { v: "app", label: "App / Notizen mit Gewichten & Wiederholungen", p: 12 },
            { v: "manchmal", label: "Gelegentlich", p: 8 },
            { v: "kopf", label: "Nur im Kopf", p: 5 },
            { v: "nein", label: "Gar nicht", p: 2 }
          ]
        },
        {
          id: "str_exercises", type: "multi", module: "strength", cap: 8,
          title: "Deckst du die großen Grundmuster ab?",
          sub: "Mehrfachauswahl — Vollständigkeit der Muster zählt, nicht die Anzahl der Übungen.",
          options: [
            { v: "kniebeuge", label: "Knie (Kniebeuge / Beinpresse)", p: 1.6 },
            { v: "kreuzheben", label: "Hüfte (Kreuzheben / Hip Hinge)", p: 1.6 },
            { v: "bank", label: "Druck horizontal (Bank / Brust)", p: 1.6 },
            { v: "rudern", label: "Zug horizontal (Rudern)", p: 1.6 },
            { v: "klimmzug", label: "Zug vertikal (Klimmzug / Latzug)", p: 1.6 },
            { v: "schulter", label: "Druck vertikal (Schulterdrücken)", p: 1.6 },
            { v: "core", label: "Core / Rumpf", p: 1.6 },
            { v: "keine", label: "Keine davon", p: 0, exclusive: true }
          ]
        },
        {
          id: "str_limit", type: "single", module: "strength",
          when: function (a) { return !(a.str_freq === "4plus" && a.str_plan === "progression"); },
          title: "Was limitiert dich beim Training am meisten?",
          options: [
            { v: "zeit", label: "Zeit", p: 6 },
            { v: "schmerzen", label: "Schmerzen", p: 3 },
            { v: "muedigkeit", label: "Müdigkeit", p: 5 },
            { v: "motivation", label: "Motivation", p: 5 },
            { v: "kein_plan", label: "Kein Plan", p: 4 },
            { v: "technik", label: "Unsicherheit bei der Technik", p: 5 },
            { v: "kein_gym", label: "Keine Lust auf Gym", p: 4 },
            { v: "nichts", label: "Nichts — läuft", p: 8 }
          ]
        },
        {
          id: "str_values", type: "single", module: "strength",
          when: function (a) { return a.str_freq !== "0" && a.str_log !== "app"; },
          title: "Kennst du deine aktuellen Kraftwerte?",
          sub: "Z. B. Gewichte bei Kniebeuge, Bankdrücken, Kreuzheben — oder Liegestütze am Stück.",
          options: [
            { v: "genau", label: "Ja, ich kenne meine Werte genau", p: 10 },
            { v: "ungefaehr", label: "Ungefähr", p: 6 },
            { v: "nein", label: "Nein", p: 3 }
          ]
        },
        {
          id: "str_cardio_freq", type: "single", module: "strength",
          title: "Wie oft machst du pro Woche gezielt Ausdauer / Cardio?",
          sub: "Zügiges Gehen, Laufen, Rad, Rudern, Schwimmen — moderat oder intensiv.",
          options: [
            { v: "0", label: "Gar nicht gezielt", p: 2 },
            { v: "alltag", label: "Nur Alltagsbewegung, nichts Gezieltes", p: 6 },
            { v: "1", label: "1× pro Woche", p: 9 },
            { v: "2", label: "2× pro Woche", p: 13 },
            { v: "3plus", label: "3× oder öfter", p: 15 }
          ]
        },
        {
          id: "str_cardio_capacity", type: "single", module: "strength",
          title: "Wie fühlst du dich, wenn du 3–4 Stockwerke zügig hochgehst?",
          sub: "Einfacher Alltags-Fitnesscheck — keine VO₂max-Messung.",
          options: [
            { v: "locker", label: "Locker, kaum außer Atem", p: 9 },
            { v: "etwas", label: "Etwas außer Atem, aber okay", p: 6 },
            { v: "deutlich", label: "Deutlich außer Atem", p: 3 },
            { v: "vermeide", label: "Vermeide ich eher / geht schwer", p: 1 },
            { v: "unknown", label: "Weiß ich nicht", p: 4 }
          ]
        },
        {
          id: "str_cardio_marker", type: "single", module: "strength",
          when: function (a) { return ["2", "3plus"].indexOf(a.str_cardio_freq) >= 0 && a.str_log !== "nein"; },
          title: "Kennst du einen reproduzierbaren Ausdauer-Marker von dir?",
          sub: "Z. B. eine feste Strecke/Zeit, Ruhepuls, ein Wert von einem Cardio-Gerät.",
          options: [
            { v: "regelmaessig", label: "Ja, ich verfolge ihn", p: 6 },
            { v: "grob", label: "Grob / gelegentlich", p: 4 },
            { v: "nein", label: "Nein", p: 2 }
          ]
        }
      ]
    },

    /* ---------- 4b. ALLTAGSBEWEGUNG (V2) ----------
       Eigenes System, bewusst getrennt vom strukturierten Training:
       3× Gym pro Woche bei 14 Stunden Sitzen ist NICHT „aktiv". */
    {
      id: "movement", label: "Alltagsbewegung",
      questions: [
        {
          id: "mov_daily", type: "single", module: "strength", dom: "movement",
          title: "Wie viel bewegst du dich außerhalb deiner Trainingseinheiten?",
          sub: "Nicht das Workout — der Rest des Tages. Kein Wearable nötig.",
          options: [
            { v: "sehr_wenig", label: "Sehr wenig — praktisch nur die nötigen Wege", p: 3 },
            { v: "sitzend_kurz", label: "Überwiegend sitzend, kurze Spaziergänge", p: 8 },
            { v: "regelmaessig", label: "Regelmäßig aktiv über den Tag verteilt", p: 16 },
            { v: "sehr_aktiv", label: "Sehr aktiv — ich bin ständig in Bewegung", p: 20 }
          ]
        },
        {
          id: "mov_sitting", type: "single", module: "strength", dom: "movement",
          title: "Wie viele Stunden sitzt du an einem typischen Werktag?",
          options: [
            { v: "lt4", label: "Unter 4 Stunden", p: 16 },
            { v: "4to8", label: "4–8 Stunden", p: 11 },
            { v: "8to11", label: "8–11 Stunden", p: 5 },
            { v: "gt11", label: "Über 11 Stunden", p: 2, sig: "sedentary" },
            { v: "unknown", label: "Weiß ich nicht", p: 6, gap: "sitting" }
          ]
        }
      ]
    },

    /* ---------- 5. Fuel ---------- */
    {
      id: "fuel", label: "Ernährung",
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
          when: function (a) { return a.fuel_structure !== "tracke"; },
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
          when: function (a) { return ["chaotisch", "abends_viel", "geregelt"].indexOf(a.fuel_structure) >= 0; },
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
          when: function (a) { return ["keine_ahnung", "lt80"].indexOf(a.fuel_protein) >= 0 || ["chaotisch", "abends_viel"].indexOf(a.fuel_structure) >= 0 || a.fuel_control !== "selten"; },
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
      id: "recovery", label: "Schlaf & Erholung",
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
          when: function (a) { return a.rec_wake !== "erholt" || ["lt5", "5to6", "6to7"].indexOf(a.rec_duration) >= 0; },
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
          sub: "Timing ist nur ein Faktor — Menge und deine individuelle Schlafreaktion zählen mit.",
          options: [
            { v: "kein", label: "Gar kein Koffein", p: 10 },
            { v: "morgens", label: "Nur morgens", p: 10 },
            { v: "mittags", label: "Bis mittags", p: 8 },
            { v: "nachmittag", label: "Bis in den Nachmittag", p: 6 },
            { v: "abends", label: "Auch abends", p: 3 }
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
            { v: "unknown", label: "Weiß ich nicht", p: 5, gap: "snoring" }
          ]
        },
        {
          id: "slp_daysleep", type: "single", module: "recovery", dom: "sleep",
          when: function (a) {
            return ["stark", "aussetzer", "unknown"].indexOf(a.rec_snore) >= 0
              || (a.enh_signals || []).indexOf("schnarchen") >= 0
              || (a.enh_signals || []).indexOf("schlaf") >= 0;
          },
          title: "Wie oft bist du tagsüber ungewollt müde — z. B. am Schreibtisch, im Auto, vor dem Fernseher?",
          sub: "Wird gefragt, weil Schnarchen zusammen mit Tagesmüdigkeit ein Muster ist, das ärztlich abgeklärt gehört.",
          options: [
            { v: "nie", label: "Praktisch nie", p: 14 },
            { v: "selten", label: "Selten", p: 11 },
            { v: "oft", label: "Oft", p: 4, sig: "apnea" },
            { v: "taeglich", label: "Fast täglich — ich kämpfe gegen das Einschlafen", p: 1, sig: "apnea" }
          ]
        }
      ]
    },

    /* ---------- 7. Blutwerte & Prävention (risikobasiert, nicht „mehr Marker") ---------- */
    {
      id: "blood", label: "Blutwerte & Prävention — Gesundheitsdaten mit Sinn",
      questions: [
        {
          id: "blood_bp", type: "single", module: "blood",
          title: "Kennst du deinen aktuellen Blutdruck?",
          sub: "Der wichtigste einzelne, oft unterschätzte Gesundheitswert.",
          options: [
            { v: "kontrolliert", label: "Ja — gemessen und im Blick / kontrolliert", p: 20 },
            { v: "grob", label: "Ungefähr (mal gemessen)", p: 12 },
            { v: "lange_her", label: "Lange nicht mehr gemessen", p: 5 },
            { v: "nein", label: "Nein / keine Ahnung", p: 2 }
          ]
        },
                        {
          id: "blood_prevention", type: "single", module: "blood",
          title: "Nimmst du alters-/risikogerechte Vorsorge wahr?",
          sub: "Z. B. Gesundheits-Check-up beim Hausarzt — nicht mehr als sinnvoll, aber nicht gar nichts.",
          options: [
            { v: "regelmaessig", label: "Ja, regelmäßig und passend zu meinem Alter", p: 16 },
            { v: "einmalig", label: "Einmalig / unregelmäßig", p: 9 },
            { v: "nein", label: "Nein, gehe kaum zur Vorsorge", p: 3 }
          ]
        },
        {
          id: "blood_family", type: "single", module: "blood",
          title: "Kennst du deine relevante Familiengeschichte?",
          sub: "Herzinfarkt/Schlaganfall (früh), Diabetes, hoher Blutdruck, bestimmte Krebsarten in der Familie.",
          options: [
            { v: "ja", label: "Ja, kenne ich", p: 8 },
            { v: "teilweise", label: "Teilweise", p: 5 },
            { v: "nein", label: "Nein / unklar", p: 2 }
          ]
        },
        {
          id: "blood_doctor", type: "single", module: "blood",
          when: function (a) { return ["nie", "unsure"].indexOf(a.lab_recency) < 0 && (a.blood_prevention !== "regelmaessig" || window.MM_CHECK.statusOf(a) !== "natural"); },
          title: "Werden auffällige Werte bei dir ärztlich eingeordnet?",
          options: [
            { v: "regelmaessig", label: "Ja, ich bespreche Auffälligkeiten mit dem Arzt", p: 12 },
            { v: "einmalig", label: "Selten / nur wenn es akut wird", p: 7 },
            { v: "keine_auffaellig", label: "Bisher keine auffälligen Werte", p: 10 },
            { v: "nein", label: "Nein, ordne nichts ein", p: 3 }
          ]
        },
        {
          id: "blood_overtest", type: "single", module: "blood",
          when: function (a) { return (a.lab_known || []).length >= 6; },
          title: "Wie gehst du mit Tests und Spezialmarkern um?",
          sub: "Mehr Tests sind nicht automatisch mehr Gesundheit — jede Messung braucht eine Frage.",
          options: [
            { v: "gezielt", label: "Gezielt — ich teste, wenn es eine Frage/Anlass gibt", p: 10 },
            { v: "gemischt", label: "Gemischt", p: 7 },
            { v: "viel_ohne", label: "Ich teste viel / sammle viele Marker ohne klaren Anlass", p: 4 },
            { v: "gar_nicht", label: "Ich kümmere mich gar nicht darum", p: 3 }
          ]
        },
        {
          id: "blood_why", type: "single", module: null,
          when: function (a) { var g = a.goal_main || []; return g.indexOf("blutwerte") >= 0 || g.indexOf("hormone") >= 0 || a.goal_pain === "blutwerte"; },
          title: "Warum interessieren dich Gesundheitsdaten?",
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

    /* ---------- 7b. CARDIOVASKULÄR & METABOLISCH (V2) ---------- */
    {
      id: "cardiometabolic", label: "Herz-Kreislauf & Stoffwechsel",
      questions: [
        {
          id: "cv_smoking", type: "single", module: "blood", dom: "cardiovascular",
          title: "Rauchst du oder dampfst du (Nikotin)?",
          options: [
            { v: "nie", label: "Nie geraucht", p: 16 },
            { v: "ex", label: "Früher, aktuell nicht mehr", p: 13 },
            { v: "gelegentlich", label: "Gelegentlich", p: 6, sig: "nicotine" },
            { v: "taeglich", label: "Täglich", p: 1, sig: "nicotine" },
            { v: "no_answer", label: "Möchte ich nicht angeben", p: 8, gap: "nicotine" }
          ]
        },
        {
          id: "cv_bp_control", type: "single", module: "blood", dom: "cardiovascular",
          when: function (a) {
            return a.blood_bp === "kontrolliert" || a.enh_bp_routine === "diagnostiziert"
              || (a.enh_signals || []).indexOf("bp") >= 0
              || (a.redflags || []).indexOf("blutdruck") >= 0;
          },
          title: "Wie ist dein Blutdruck aktuell einzuordnen?",
          sub: "Grobe Einordnung genügt — eine Diagnose stellen wir nicht.",
          options: [
            { v: "normal", label: "Im Normbereich (etwa unter 130/85)", p: 18 },
            { v: "grenzwertig", label: "Grenzwertig / leicht erhöht", p: 10, sig: "bp_borderline" },
            { v: "behandelt", label: "Erhöht, aber medikamentös eingestellt", p: 13 },
            { v: "unbehandelt", label: "Erhöht und aktuell nicht behandelt", p: 2, sig: "bp_uncontrolled" },
            { v: "unsure", label: "Weiß ich nicht", p: 5, gap: "bp" }
          ]
        },
        {
          id: "met_glucose", type: "single", module: "blood", dom: "metabolic",
          title: "Ist bei dir etwas zum Blutzucker bekannt?",
          sub: "Nüchternglukose oder HbA1c — falls du das schon einmal hast messen lassen.",
          options: [
            { v: "normal", label: "Ja, zuletzt unauffällig", p: 18 },
            { v: "prediabetes", label: "Grenzwertig / Prädiabetes bekannt", p: 8, sig: "dysglycemia" },
            { v: "diabetes", label: "Diabetes diagnostiziert", p: 6, sig: "diabetes" },
            { v: "nie", label: "Noch nie gemessen", p: 4, gap: "glucose" },
            { v: "unsure", label: "Weiß ich nicht", p: 4, gap: "glucose" }
          ]
        },
        {
          id: "met_medication", type: "multi", module: null, dom: null, cap: 0,
          title: "Nimmst du aktuell eines dieser Medikamente?",
          sub: "Mehrfachauswahl. Wird nur genutzt, um die richtigen Folgefragen zu stellen — keine Bewertung, keine Empfehlung.",
          options: [
            { v: "glp1", label: "GLP-1 / GIP (z. B. Abnehm-/Diabetesmedikation)" },
            { v: "bp", label: "Blutdruckmedikament" },
            { v: "lipid", label: "Cholesterin-/Lipidsenker" },
            { v: "glucose", label: "Blutzuckermedikament" },
            { v: "psych", label: "Psychopharmaka / Antidepressiva", sig: "med_sexual_context" },
            { v: "other", label: "Anderes Dauermedikament" },
            { v: "keine", label: "Keines davon", exclusive: true },
            { v: "no_answer", label: "Möchte ich nicht angeben", exclusive: true }
          ]
        }
      ]
    },

    /* ---------- 7c. LABOR & DATENLÜCKEN (V2) ----------
       Kernprinzip: NICHT GEMESSEN ≠ NORMAL. Unbekannte Werte senken die
       Aussagesicherheit, nicht automatisch den Gesundheits-Score. */
    {
      id: "labs", label: "Labor & Datenlage",
      questions: [
        {
          id: "lab_recency", type: "single", module: "blood", dom: "dataQuality",
          title: "Wann wurde zuletzt Blut bei dir abgenommen?",
          options: [
            { v: "lt3m", label: "Vor unter 3 Monaten", p: 20 },
            { v: "3to6m", label: "Vor 3–6 Monaten", p: 18 },
            { v: "6to12m", label: "Vor 6–12 Monaten", p: 13 },
            { v: "gt12m", label: "Vor über 12 Monaten", p: 6, gap: "labs_old" },
            { v: "nie", label: "Noch nie", p: 2, gap: "labs_none" },
            { v: "unsure", label: "Weiß ich nicht", p: 4, gap: "labs_none" }
          ]
        },
        {
          id: "lab_known", type: "multi", module: "blood", dom: "dataQuality", cap: 22,
          when: function (a) { return ["gt12m", "nie", "unsure"].indexOf(a.lab_recency) < 0; },
          title: "Welche dieser Werte kennst du von dir?",
          sub: "Mehrfachauswahl — es geht nicht um viele Werte, sondern um die wenigen, die für deinen Kontext zählen.",
          options: [
            { v: "blutbild", label: "Blutbild", p: 2 },
            { v: "haematokrit", label: "Hämatokrit / Hämoglobin", p: 3 },
            { v: "ldl", label: "LDL-Cholesterin", p: 3 },
            { v: "hdl", label: "HDL-Cholesterin", p: 2 },
            { v: "trig", label: "Triglyceride", p: 2 },
            { v: "apob", label: "ApoB", p: 4 },
            { v: "lpa", label: "Lp(a)", p: 3 },
            { v: "glukose", label: "Glukose / HbA1c", p: 3 },
            { v: "niere", label: "Nierenwerte", p: 2 },
            { v: "leber", label: "Leberwerte", p: 2 },
            { v: "hormone", label: "Hormonwerte (z. B. Testosteron)", p: 3 },
            { v: "psa", label: "PSA", p: 2 },
            { v: "keine", label: "Keiner davon / unsicher", p: 0, exclusive: true, gap: "markers_unknown" }
          ]
        }
      ]
    },

    /* ---------- 8. Drive ---------- */
    {
      id: "drive", label: "Energie & Antrieb",
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
          when: function (a) { return a.drv_energy !== "stabil"; },
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
          when: function (a) { return ["stabil", "nachmittag_tief"].indexOf(a.drv_energy) < 0; },
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
          id: "drv_change", type: "single", module: null, dom: null,
          when: function (a) { return window.MM_CHECK.sexualConcern(a); },
          title: "Wie hat sich das entwickelt?",
          sub: "Wird gefragt, weil der Verlauf für die ärztliche Einordnung wichtiger ist als der Momentzustand. Wir stellen keine Diagnose.",
          options: [
            { v: "schleichend", label: "Schleichend über Monate/Jahre" },
            { v: "ploetzlich", label: "Relativ plötzlich", sig: "sexual_acute" },
            { v: "schwankend", label: "Schwankend, mal besser mal schlechter" },
            { v: "immer", label: "War eigentlich immer so" },
            { v: "no_answer", label: "Möchte ich nicht angeben", gap: "sexual_course" }
          ]
        },
        {
          id: "drv_fertility", type: "single", module: null, dom: null,
          when: function (a) {
            var st = window.MM_CHECK.statusOf(a);
            return st === "enhanced" || st === "former_enhanced" || (a.goal_main || []).indexOf("hormone") >= 0;
          },
          title: "Ist Kinderwunsch für dich aktuell oder perspektivisch ein Thema?",
          options: [
            { v: "ja", label: "Ja", sig: "fertility" },
            { v: "unsure", label: "Unsicher / vielleicht später", sig: "fertility" },
            { v: "nein", label: "Nein" },
            { v: "abgeschlossen", label: "Familienplanung abgeschlossen" },
            { v: "no_answer", label: "Möchte ich nicht angeben" }
          ]
        },
        {
          id: "drv_caffeine", type: "single", module: "drive",
          when: function (a) { return ["nachmittag", "abends"].indexOf(a.rec_caffeine) >= 0; },
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
          when: function (a) { return window.MM_CHECK.driveConcern(a); },
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
      id: "execution", label: "Umsetzung",
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
          sub: "Bewiesene Konstanz zählt mehr als guter Vorsatz.",
          options: [
            { v: "konstant", label: "Gar nicht — ich bin konstant", p: 14 },
            { v: "1to2", label: "1–2×", p: 10 },
            { v: "3to5", label: "3–5×", p: 5 },
            { v: "staendig", label: "Ständig", p: 2 },
            { v: "nie_drin", label: "Ich komme gar nicht richtig rein", p: 1 }
          ]
        },
        {
          id: "exe_after4w", type: "single", module: "execution",
          when: function (a) { return a.exe_restarts !== "konstant"; },
          title: "Was passiert bei dir typischerweise nach 2–4 Wochen?",
          options: [
            { v: "durchziehen", label: "Ich ziehe durch", p: 14 },
            { v: "lockerer", label: "Ich werde lockerer", p: 8 },
            { v: "plan_wechsel", label: "Ich ändere den Plan", p: 5 },
            { v: "abbruch", label: "Ich breche ab", p: 2 },
            { v: "neustart", label: "Ich starte wieder neu", p: 3 }
          ]
        },
        {
          id: "exe_enemy", type: "single", module: "execution",
          when: function (a) { return a.exe_restarts !== "konstant" || a.exe_after4w !== "durchziehen"; },
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
          sub: "1 = eher nicht · 10 = absolut bereit. Bereitschaft ist ein Startsignal — bewiesene Umsetzung zählt mehr.",
          pointsMap: [[2, 2], [4, 4], [6, 7], [8, 10], [10, 12]]
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
          when: function (a) { return (parseInt(a.exe_ready, 10) || 0) < 8; },
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
          when: function (a) { return !a.exe_support || a.exe_support === "unknown"; },
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
          when: function (a) { return (parseInt(a.goal_urgency, 10) || 0) <= 3; },
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
      high: "Dein Trainings- & Fitness-Fundament ist stark — Kraft und Ausdauer stehen. Dein nächster Hebel liegt wahrscheinlich eher bei Ernährung oder Schlaf & Erholung."
    },
    fuel: {
      low: "Deine Ernährung ist aktuell ein großer Hebel. Du brauchst keine neue Diät, sondern klare Proteinziele, einfache Standardmahlzeiten und eine Wochenendstrategie.",
      mid: "Du isst wahrscheinlich qualitativ okay, aber nicht messbar genug. Dein Körper verändert sich erst planbar, wenn Mengen, Protein und Wochenenden kontrollierbarer werden.",
      high: "Deine Ernährung ist gut strukturiert. Feintuning läuft über Timing, Kalorien, Proteinverteilung und Alltagssituationen."
    },
    recovery: {
      low: "Deine Schlaf & Erholung ist ein echter Engpass. Mehr Training wird dich nicht retten, wenn Schlaf, Stress und Regeneration gegen dich arbeiten.",
      mid: "Deine Erholung ist okay, aber nicht stabil. Kleine Änderungen bei Schlafzeit, Koffein, Abendroutine und Trainingslast können großen Effekt haben.",
      high: "Deine Erholungs-Basis ist gut. Dadurch kannst du stärker über Training und Ernährung skalieren."
    },
    blood: {
      low: "Dein Bereich Blutwerte & Prävention ist niedrig. Das heißt nicht, dass etwas nicht stimmt — es heißt: Dir fehlen ein paar einfache Basics wie Blutdruck oder eine risikogerechte Vorsorge. Dein nächster Schritt ist nicht mehr Tests, sondern die wenigen, die zählen.",
      mid: "Du hast eine Basis, aber noch kein System. Jetzt geht es darum, die richtigen Werte zu kennen (Blutdruck, cardiometabolische Basics), Vorsorge wahrzunehmen und auffällige Werte ärztlich einordnen zu lassen.",
      high: "Deine Gesundheitsdaten & Prävention sind im Griff. Dein Risiko ist eher Overthinking — die richtigen wenigen Werte schlagen möglichst viele Marker."
    },
    drive: {
      low: "Deine Energie & Antrieb sind niedrig. Das kann viele Ursachen haben: Schlaf, Stress, Körperfett, Ernährung oder Blutwerte. Wir bewerten das nicht medizinisch, sondern zeigen dir, welche Lifestyle-Hebel zuerst geprüft werden sollten.",
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

  /* ---------- Kurz-Kontext pro Bereich, wenn er eine STÄRKE ist ---------- */
  strengthNotes: {
    body: "Deine Körperbasis sitzt — gute Ausgangslage zum Aufbauen.",
    strength: "Dein Training läuft — dieses Fundament trägt den Rest.",
    fuel: "Deine Ernährung ist im Griff — ein starker Hebel, den viele nicht haben.",
    recovery: "Du erholst dich gut — die Basis, auf der alles andere skaliert.",
    blood: "Du kennst deine Daten — du steuerst mit Fakten statt Gefühl.",
    drive: "Deine Energie ist stark — nutze sie als Antrieb für den Rest.",
    execution: "Du setzt um — die seltenste und wertvollste Stärke überhaupt."
  },

  /* ---------- Welche anderen Bereiche ein schwacher Bereich mitzieht ---------- */
  bottleneckAffects: {
    body: "Ohne saubere Ausgangslage bleiben Ernährung und Training ein Blindflug — du kannst Fortschritt nicht sehen.",
    strength: "Fehlt die Trainingsstruktur, verpufft auch eine gute Ernährung: ohne Reiz kein Muskel, ohne Progression kein Fortschritt.",
    fuel: "Eine unklare Ernährung bremst Körper und Energie gleichzeitig — selbst gutes Training kann das nicht ausgleichen.",
    recovery: "Schlechte Erholung zieht Energie, Antrieb, Appetit und Trainingsleistung mit nach unten — sie ist oft die versteckte Ursache.",
    blood: "Ohne Datenbasis interpretierst du Energie und Hormone nach Gefühl — Fehlentscheidungen bei Supplementen und Fokus sind vorprogrammiert.",
    drive: "Niedrige Energie kippt Training, Ernährung und Umsetzung — meist liegt die Ursache aber in Schlaf, Bewegung oder Ernährung.",
    execution: "Ohne Umsetzung bleibt jeder Plan Theorie — der beste Score nützt nichts, wenn der Alltag ihn wegdrückt."
  },

  /* ---------- Passende Inhalte/Tools pro Bereich (beratend, vor dem Verkauf) ---------- */
  resource: {
    body:      { read: { label: "Fettabbau ohne Hunger", href: "ebooks/fettabbau.html" },        track: { label: "Fortschritts-Tracker", href: "tracker.html" } },
    strength:  { read: { label: "Jeden Tag trainieren", href: "ebooks/taeglich-trainieren.html" }, track: { label: "Trainings-Tracker", href: "tracker.html" } },
    fuel:      { read: { label: "Protein ohne Kochen", href: "ebooks/protein-system.html" },      track: { label: "Kalorien-Tracker", href: "dinner.html" } },
    recovery:  { read: { label: "Der Schlaf-Stack", href: "ebooks/schlaf-stack.html" },            track: { label: "Fortschritts-Tracker", href: "tracker.html" } },
    blood:     { read: { label: "Blutwerte verstehen", href: "ebooks/blutwerte-guide.html" },      track: { label: "Blood Dashboard", href: "blutwerte.html" } },
    drive:     { read: { label: "Testosteron verstehen", href: "ebooks/testosteron.html" },        track: { label: "Rechner & Tools", href: "tools.html" } },
    execution: { read: { label: "Gewohnheiten, die bleiben", href: "ebooks/gewohnheiten.html" },   track: { label: "Fortschritts-Tracker", href: "tracker.html" } }
  },

  /* Engpass → PASSENDES Protokoll-Kapitel (P16-G/H): der Erklär-Link im
     Diagnose-Block führt gezielt auf das Kapitel, das genau diesen Engpass
     erklärt — statt generisch auf die Produktseite. Die freien Kapitel tragen
     die Protokoll-Rahmung inkl. Kauf-CTA am Ende. */
  bottleneckChapter: {
    body:      { href: "ebooks/fettabbau.html",       label: "Körperkomposition" },
    strength:  { href: "ebooks/training-system.html", label: "Training" },
    fuel:      { href: "ebooks/fettabbau.html",       label: "Körperkomposition" },
    recovery:  { href: "ebooks/schlaf-energie.html",  label: "Schlaf" },
    blood:     { href: "ebooks/blutwerte-guide.html", label: "Blutwerte" },
    drive:     { href: "ebooks/testosteron.html",     label: "Hormone" },
    execution: { href: "ebooks/gewohnheiten.html",    label: "Umsetzung" }
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

/* ==========================================================================
   GETEILTE LOGIK — EINE Quelle der Wahrheit für Dashboard (check.js) UND
   Report (report.js). Beide Oberflächen rufen ausschließlich diese Funktionen
   auf, damit dieselben Antworten nie zu unterschiedlichen Empfehlungen führen.
   ========================================================================== */
(function () {
  "use strict";
  var C = window.MM_CHECK;

  C.levelClass = function (v) { return v < 40 ? "low" : v < 70 ? "mid" : "high"; };
  C.moduleText = function (key, v) {
    var t = C.moduleTexts[key];
    return v < 40 ? t.low : v < 70 ? t.mid : t.high;
  };
  C.nm = function (k) { return (C.moduleNamesDe && C.moduleNamesDe[k]) || C.moduleNames[k]; };

  var num = function (x) { var n = parseFloat(x); return isFinite(n) ? n : 0; };

  /* ---------- Referenzgewicht (Protein bei starkem Übergewicht sauber) ---------- */
  C.referenceWeight = function (a) {
    var h = num(a.height), w = num(a.weight);
    if (!h || !w) return w || 0;
    var bmi = w / Math.pow(h / 100, 2);
    if (bmi <= 27) return w;
    // bei deutlichem Übergewicht: Referenz auf BMI 27 statt aktuelles Gewicht,
    // damit kein unnötig hoher Proteinwert entsteht (aber nicht unter reales Zielgewicht)
    return Math.round(27 * Math.pow(h / 100, 2));
  };
  C.proteinRange = function (a) {
    var refW = C.referenceWeight(a);
    if (!refW) return { lo: 130, hi: 170, str: "1,6–2 g pro kg Zielgewicht" };
    var lo = Math.round(refW * 1.6), hi = Math.round(refW * 2.0);
    return { lo: lo, hi: hi, str: lo + "–" + hi + " g" };
  };
  // Rückwärtskompatibler Kurzhelfer (früher in check.js)
  C.protTarget = function (a) { return C.proteinRange(a).str; };
  C.stepTargetNum = function (a) {
    return (a.steps === "lt4") ? "7.000" : (a.steps === "4to7") ? "8.000" : "10.000";
  };

  /* ---------- Moduswahl aus Ziel: kein automatischer Cut für jeden ---------- */
  /* Modus-Entscheidung: kombiniert mehrere Faktoren statt eines Einzelwerts —
     Körperfett-Level (body_type + WHtR/BMI), Bauchfett-Fokus (Ziel + goal_pain),
     Muskelziel und Trainingsstatus. Gibt Modus UND eine transparente Begründung.
     Grundsatz: Wer klar Bauchfett/Körperfett stört, bekommt nicht leichtfertig BUILD. */
  C.goalDecision = function (a) {
    var g = a.goal_main || [];
    var has = function (x) { return g.indexOf(x) >= 0; };
    var h = num(a.height), w = num(a.weight), waist = num(a.waist);
    var bmi = a._bmi || (h && w ? w / Math.pow(h / 100, 2) : 0);
    var whtr = (waist && h) ? waist / h : 0;
    var bt = a.body_type;

    // Körperfett-Level grob: 0 = niedrig, 1 = moderat, 2 = hoch
    var fat = 0;
    if (bt === "normal_bauch" || bt === "stark_fett") fat = 1;
    if (bt === "uebergewicht") fat = 2;
    if (whtr) {
      if (whtr >= 0.58) fat = 2;
      else if (whtr >= 0.53) fat = Math.max(fat, 1);
      else if (whtr < 0.47) fat = Math.min(fat, 0);
    } else if (bmi) {
      if (bmi >= 30) fat = 2;
      else if (bmi >= 27) fat = Math.max(fat, 1);
      else if (bmi < 23 && bt !== "stark_fett" && bt !== "normal_bauch") fat = Math.min(fat, 0);
    }
    if (bt === "skinny" && fat < 1) fat = 0;

    /* V2: Der Trend zaehlt mit. Wer sichtbar zunimmt und dessen Taille
       waechst, ist kein BUILD-Kandidat, auch wenn die Momentaufnahme
       unauffaellig wirkt. */
    if (a.body_waisttrend === "viel_mehr" || a.body_weighttrend === "plus8") fat = Math.max(fat, 1);

    var wantsMuscle = has("muskeln") || has("kraft") || a.goal_pain === "muskelmasse";
    var fatConcern = has("bauchfett") || a.goal_pain === "bauch" || a.goal_pain === "gewicht"
      || bt === "normal_bauch" || bt === "stark_fett" || bt === "uebergewicht"
      || (whtr && whtr >= 0.53)
      || a.body_waisttrend === "viel_mehr" || a.body_waisttrend === "mehr";
    var beginner = a.str_freq === "0" || a.str_freq === "unregelmaessig"
      || a.str_plan === "nein" || a.str_plan === "selten";

    var mode, reason;
    if (fat >= 2) {
      mode = "cut";
      reason = wantsMuscle
        ? "Dein Körperfettanteil ist aktuell hoch. Ein klassischer Aufbau würde vor allem Fett dazupacken — deshalb zuerst CUT: Fett runter, Kraft und Muskeln mit viel Protein und hartem Training schützen. Der Aufbau kommt danach auf einer besseren Basis."
        : "Dein Körperfettanteil ist aktuell hoch — der größte Hebel ist, ihn kontrolliert zu senken (CUT), ohne dabei Kraft zu verlieren.";
    } else if (fatConcern && wantsMuscle) {
      /* V2-Fix: BUILD trotz Bauch-/Fettfokus NUR mit belegter Schlankheit.
         Unbekannter Bauchumfang gilt NICHT als "schlank" — sonst bekommt
         genau der Mann BUILD, den sein Bauchansatz stört. */
      var leanProven = (whtr && whtr < 0.5) || (bt === "skinny" && bmi && bmi < 24);
      if (fat <= 0 && !beginner && leanProven) {
        mode = "build";
        reason = "Du willst muskulöser werden und trägst dabei nachweislich wenig Fett (Taille unter der Hälfte deiner Größe) — du hast die Reserve, um in einem kleinen Überschuss (BUILD) sauber aufzubauen, ohne den Bauch zu verlieren.";
      } else if (fat >= 1 && ((whtr && whtr >= 0.55) || bt === "stark_fett" || bt === "uebergewicht")) {
        /* Deutlich erhöhter Körperfett-Kontext: Muskelwunsch bleibt, aber der
           Fettabbau geht voran — Muskeln werden über Protein und hartes
           Training geschützt, nicht über einen Überschuss aufgebaut. */
        mode = "cut";
        reason = "Du willst Muskeln aufbauen — dein Körperfett-Kontext ist dafür aktuell aber klar zu hoch. Deshalb zuerst CUT: Fett runter, Kraft und Muskelmasse mit hohem Protein und hartem Training schützen. Der Aufbau kommt danach auf einer Basis, auf der er auch sichtbar wird.";
      } else if (fat <= 0 && !beginner && !leanProven) {
        mode = "recomp";
        reason = "Du willst Muskeln aufbauen, gleichzeitig stört dich dein Bauch — und dein Körperfett-Kontext ist nicht belegt schlank. Ein Überschuss wäre hier ein Blindflug: RECOMP baut Muskeln auf, ohne den Bauch mitzufüttern. Miss deinen Bauchumfang, dann wird die Empfehlung präziser.";
      } else {
        mode = "recomp";
        reason = "Du willst gleichzeitig Muskeln aufbauen und Bauchfett verlieren" + (beginner ? " — und als (Wieder-)Einsteiger ist genau das besonders gut möglich" : ", was bei deinem Ausgangspunkt realistisch ist") + ". Deshalb RECOMP: nahe der Erhaltung, viel Protein, hart trainieren. Ein klassischer Aufbau würde deinem Ziel — weniger Bauch — wahrscheinlich entgegenlaufen.";
      }
    } else if (fatConcern) {
      mode = "cut";
      reason = "Dein Fokus liegt klar auf weniger Bauchfett — deshalb CUT: moderates Kaloriendefizit, Protein hoch, Kraft halten. Kein Aufbau, der dem Ziel entgegenläuft.";
    } else if (wantsMuscle) {
      mode = fat >= 1 ? "recomp" : "build";
      reason = fat >= 1
        ? "Du willst Muskeln aufbauen und trägst moderat Fett — RECOMP baut Muskeln auf, während die Taille eher runter geht, statt Fett mitaufzubauen."
        : "Du bist relativ schlank und willst Muskeln und Kraft aufbauen — BUILD: ein kleiner, kontrollierter Überschuss für sauberen Aufbau.";
    } else if (has("energie") || has("schlaf") || has("blutwerte") || has("hormone") || has("disziplin")) {
      if (fat >= 2) { mode = "cut"; reason = "Für deine Gesundheits- und Energieziele ist der größte Hebel, den hohen Körperfettanteil zu senken (CUT)."; }
      else if (fat >= 1) { mode = "recomp"; reason = "Für deine Gesundheits- und Energieziele passt RECOMP: Körperkomposition verbessern, ohne aggressive Diät."; }
      else { mode = "perform"; reason = "Deine Ziele sind Energie, Schlaf und Gesundheit — PERFORM: Gewicht halten, Training und Recovery gezielt fuelen, statt zu diäten oder aufzubauen."; }
    } else {
      var wantsLook = has("attraktiv") || has("ernaehrung");
      mode = fat >= 2 ? "cut" : (fat >= 1 ? "recomp" : (wantsLook ? "recomp" : "perform"));
      reason = mode === "cut" ? "Bei deinem Körperfettanteil ist CUT der klarste Weg zu einem definierteren Ergebnis."
        : mode === "recomp" ? "RECOMP passt: definierter und muskulöser werden, ohne aggressive Diät."
        : "PERFORM: Form halten und Leistung, Schlaf und Gesundheit ausbauen.";
    }
    /* ---- V2: HEALTH FIRST ueberschreibt die Physique-Richtung ----
       Nicht "du bist krank", sondern: erst das System klaeren/kontrollieren,
       dann optimieren. Die Trainingsrichtung (trainingMode) bleibt erhalten,
       damit Programm und Kalorienlogik weiterlaufen. */
    var hf = (typeof C.healthFirstReason === "function") ? C.healthFirstReason(a) : null;
    if (hf) {
      return { mode: "health_first", trainingMode: mode, reason: hf.reason, healthFirst: hf,
        bodyReason: reason, fat: fat, beginner: beginner };
    }
    return { mode: mode, trainingMode: mode, reason: reason, fat: fat, beginner: beginner };
  };
  C.goalMode = function (a) { return C.goalDecision(a).mode; };
  C.trainingModeOf = function (a) { var d = C.goalDecision(a); return d.trainingMode || d.mode; };
  C.modeLabels = {
    cut:          { label: "CUT",     desc: "moderates Kaloriendefizit — Fett runter, Kraft schützen" },
    recomp:       { label: "RECOMP",  desc: "nahe Erhaltung — Taille runter, Kraft rauf" },
    build:        { label: "BUILD",   desc: "kleiner kontrollierter Überschuss — Muskel & Kraft aufbauen" },
    perform:      { label: "PERFORM", desc: "Erhaltung — Leistung, Schlaf & Gesundheit fuelen" },
    health_first: { label: "HEALTH FIRST", desc: "zuerst klären und kontrollieren, dann Körper optimieren" }
  };

  /* ---------- Zielwerte als Bereiche (keine Scheingenauigkeit) ---------- */
  C.targetValues = function (a) {
    var age = num(a.age), h = num(a.height), w = num(a.weight), waist = num(a.waist);
    var dec = C.goalDecision(a);
    var mode = dec.mode;
    /* HEALTH FIRST ist eine Prioritaets-Aussage, keine Kalorienstrategie —
       die Energiewerte kommen weiter aus der Koerper-Richtung. */
    var energyMode = dec.trainingMode || mode;
    var prot = C.proteinRange(a);
    var out = {
      mode: mode, trainingMode: energyMode,
      modeLabel: C.modeLabels[mode].label, modeDesc: C.modeLabels[mode].desc, modeReason: dec.reason,
      bodyReason: dec.bodyReason || dec.reason,
      bodyModeLabel: C.modeLabels[energyMode] ? C.modeLabels[energyMode].label : "",
      proteinLo: prot.lo, proteinHi: prot.hi, proteinStr: prot.str,
      stepGoal: C.stepTargetNum(a),
      hasEnergy: false
    };
    if (age && h && w) {
      var bmr = 10 * w + 6.25 * h - 5 * age + 5;
      var stepFactor = { lt4: 1.3, "4to7": 1.45, "7to10": 1.6, gt10: 1.75 }[a.steps] || 1.4;
      var factor = Math.min(1.9, stepFactor + ((a.job === "aktiv" || a.job === "schicht") ? 0.05 : 0));
      var tdee = bmr * factor;
      var r50 = function (x) { return Math.round(x / 50) * 50; };
      out.hasEnergy = true;
      out.maintLo = r50(tdee * 0.95); out.maintHi = r50(tdee * 1.05);
      var adj = { cut: [0.78, 0.88], recomp: [0.90, 1.00], build: [1.03, 1.12], perform: [0.97, 1.03] }[energyMode]
        || [0.95, 1.05];
      out.targetLo = r50(tdee * adj[0]); out.targetHi = r50(tdee * adj[1]);
    }
    if (waist && h) { out.waist = waist; out.waistTarget = Math.round(h * 0.5); }
    else if (h) { out.waistTarget = Math.round(h * 0.5); }
    return out;
  };

  /* ---------- Datenqualität (NICHT Gesundheitsstatus) ---------- */
  C.dataConfidence = function (a) {
    var missing = [];
    if (!num(a.waist)) missing.push("Bauchumfang");
    if (!a.steps || a.steps === "unknown") missing.push("Schritte pro Tag");
    if (a.blood_bp === "nein" || a.blood_bp === "lange_her") missing.push("aktueller Blutdruck");
    if (a.drv_libido === "keine_antwort" && a.drv_morning === "keine_antwort") missing.push("Drive-Selbsteinschätzung");
    var level = missing.length === 0 ? "hoch" : (missing.length <= 1 ? "mittel" : "eingeschränkt");
    var text = level === "hoch"
      ? "Datenqualität: hoch — deine zentralen Angaben sind vollständig, dein Ergebnis ist gut belastbar."
      : "Datenqualität: " + level + " — es fehlen: " + missing.join(", ") + ". Dein Ergebnis bleibt nützlich, ist in diesen Bereichen aber weniger präzise.";
    return { level: level, missing: missing, text: text };
  };

  /* ---------- P13/P1.5 — DECISION CONFIDENCE (deterministisch) ----------
     Wie sicher ist die Mode-/Engpass-Einordnung? KEINE Fake-Prozente:
     HIGH/MEDIUM/LIMITED aus Vollständigkeit (dataConfidence), inneren
     Widersprüchen der Angaben und Red Flags. Rein regelbasiert, testbar. */
  C.decisionConfidence = function (a, knownFlags) {
    a = a || {};
    var reasons = [];
    var dc = C.dataConfidence(a);
    var contradictions = [];
    var h = num(a.height), w = num(a.weight), waist = num(a.waist);
    var whtr = (waist && h) ? waist / h : 0;
    var bmi = (h && w) ? w / Math.pow(h / 100, 2) : 0;
    // Selbstbild vs. Messwerte widersprechen sich
    if (a.body_type === "skinny" && whtr >= 0.56) contradictions.push("Selbstbild „schlank“ passt nicht zum Bauchumfang");
    if (a.body_type === "uebergewicht" && whtr && whtr < 0.47) contradictions.push("Selbstbild „übergewichtig“ passt nicht zu den Messwerten");
    if (bmi && bmi < 18.5 && (a.goal_main || []).indexOf("bauchfett") >= 0) contradictions.push("Bauchfett-Ziel bei sehr niedrigem Körpergewicht");
    // Antwortverweigerung in tragenden Bereichen
    var silent = ["drv_libido", "drv_morning", "rec_quality"].filter(function (k) { return a[k] === "keine_antwort"; }).length;
    if (silent >= 2) contradictions.push("mehrere Selbsteinschätzungen ohne Antwort");
    var flags = knownFlags || ((typeof C.redFlags === "function") ? C.redFlags(a) : []);
    var level;
    if (flags.length) {
      level = "LIMITED";
      reasons.push("Mögliche medizinische Warnzeichen — die Einordnung ist bewusst vorsichtig, bis das ärztlich geklärt ist.");
    } else if (contradictions.length >= 2 || dc.level === "eingeschränkt") {
      level = "LIMITED";
      if (contradictions.length) reasons.push("Widersprüche: " + contradictions.join("; ") + ".");
      if (dc.missing.length) reasons.push("Fehlende Daten: " + dc.missing.join(", ") + ".");
    } else if (contradictions.length === 1 || dc.level === "mittel") {
      level = "MEDIUM";
      if (contradictions.length) reasons.push(contradictions[0] + ".");
      if (dc.missing.length) reasons.push("Es fehlt: " + dc.missing.join(", ") + ".");
      if (!reasons.length) reasons.push("Die Richtung ist klar, einzelne Angaben sind uneindeutig.");
    } else {
      level = "HIGH";
      reasons.push("Mehrere konsistente Antworten zeigen dasselbe Muster.");
    }
    return { level: level, reasons: reasons.slice(0, 3), contradictions: contradictions, missing: dc.missing };
  };

  /* ---------- P13/P1.6 — NEXT STEP ROUTING (genau EINE primäre Handlung) --
     state: { hasScore, signedIn, activeCycle, redFlags } — deterministisch,
     von Result-Seite UND Post-Purchase nutzbar. */
  C.nextStep = function (state) {
    state = state || {};
    if (state.redFlags) {
      return { key: "medical", label: "Punkte ärztlich abklären", href: null,
        note: "Gesundheit vor Optimierung — das Programm läuft danach auf sicherem Fundament." };
    }
    if (!state.hasScore) {
      return { key: "score", label: "Kostenlosen MaleMetrix Score starten", href: "check.html" };
    }
    if (!state.signedIn) {
      return { key: "account", label: "Ergebnis sichern & System starten", href: "mein-protokoll.html",
        note: "Dein Score bleibt erhalten und wird deinem Konto zugeordnet." };
    }
    if (!state.activeCycle) {
      return { key: "start_program", label: "Dein 12-Wochen-System starten", href: "kurs-programm.html" };
    }
    return { key: "today", label: "Weiter mit HEUTE", href: "mein-protokoll.html#today" };
  };

  /* ---------- Risikobasierte Blutwerte-/Gesundheitsdaten-Struktur ---------- */
  C.healthDashboard = function (a) {
    var age = num(a.age);
    var base = [
      "Blutdruck (kennen & im Blick behalten)",
      "Bauchumfang / Körperkomposition",
      "Nüchternblutzucker bzw. HbA1c",
      "Lipidprofil (LDL, HDL, Triglyceride)",
      "Nikotin-/Alkoholstatus",
      "Familiäre Vorbelastung (Herz, Diabetes)"
    ];
    var cardio = [
      "ApoB (bei kardiovaskulärem Risiko)",
      "Lp(a) — einmal im Leben sinnvoll, um vererbtes Risiko zu erkennen",
      "Nierenwerte inkl. eGFR / UACR (bei Diabetes, Bluthochdruck, Adipositas)"
    ];
    var symptom = [
      "Testosteron (morgens, mehrfach) + SHBG — nur bei klaren Symptomen",
      "TSH — bei Symptomen",
      "Ferritin / Vitamin D — bei Symptomen oder Mangelverdacht",
      "Leberwerte + FIB-4-Kontext (bei Diabetes/Übergewicht/mehreren Risikofaktoren)"
    ];
    var special = [
      "PSA — nach Alter/Risiko und ärztlicher Empfehlung",
      "hs-CRP, Homocystein u. a. — nur, wenn sie eine Entscheidung verändern"
    ];
    return {
      note: "Nicht jeder Mann braucht alle diese Werte. Welche sinnvoll sind, hängt von Alter, Risiko, Symptomen und ärztlicher Einschätzung ab — mehr Tests sind nicht automatisch mehr Gesundheit.",
      groups: [
        { key: "A", title: "Basis & Prävention", items: base },
        { key: "B", title: "Cardiometabolisch (bei Risiko)", items: cardio },
        { key: "C", title: "Symptome / konkrete Fragestellung", items: symptom },
        { key: "D", title: "Spezialmarker (nur wenn entscheidungsrelevant)", items: special }
      ]
    };
  };

  /* ---------- Produktempfehlung: nicht immer Coaching ---------- */
  C.productRecommendation = function (r) {
    var s = r.scores, a = r.answers || {};
    // 1) Red Flags haben Vorrang — kein Sales-Push über eine medizinische Priorität
    if (r.flags && r.flags.length) {
      return {
        kind: "medical",
        title: "Zuerst ärztlich abklären",
        why: "Deine Angaben enthalten mindestens einen Punkt, der medizinisch abgeklärt gehört, bevor ein Trainings- oder Ernährungsprogramm sinnvoll startet. Gesundheit geht vor Optimierung.",
        primary: { label: "Punkte oben mit einem Arzt klären", href: null },
        secondary: { label: "DAS PROTOKOLL ansehen (für später)", href: "protokoll.html" }
      };
    }
    // Umsetzungs-Signale
    var weakCount = ["body", "strength", "fuel", "recovery", "blood", "drive", "execution"]
      .filter(function (k) { return s[k] < 45; }).length;
    var restartsBad = a.exe_restarts === "staendig" || a.exe_restarts === "nie_drin" || a.exe_after4w === "abbruch" || a.exe_after4w === "neustart";
    var wantsCoaching = a.exe_support === "coach" || a.exe_support === "accountability" || a.qual_support === "coaching" || a.qual_support === "checkin";
    var executionStrong = s.execution >= 60 && !restartsBad;

    // Coaching, wenn Umsetzung schwach / viele Baustellen / wiederholte Neustarts / expliziter Wunsch
    if ((s.execution < 45) || weakCount >= 3 || (restartsBad && weakCount >= 2) || wantsCoaching) {
      return {
        kind: "coaching",
        title: "1:1 Coaching passt zu deinem Profil",
        why: (s.execution < 45 || restartsBad)
          ? "Dein Engpass ist weniger Wissen als konstante Umsetzung. Genau da wirkt wöchentliche Begleitung mit Accountability am stärksten."
          : (weakCount >= 3
              ? "Mehrere Bereiche sind gleichzeitig schwach — hier hilft ein individuell priorisierter, wöchentlich angepasster Plan mehr als reines Selbstlernen."
              : "Du suchst ausdrücklich persönliche Begleitung — dafür ist das 1:1 Coaching gebaut."),
        primary: { label: "1:1 Coaching ansehen", href: "coaching.html" },
        secondary: { label: "Oder selbstständig: DAS PROTOKOLL", href: "protokoll.html" }
      };
    }
    // Sonst: Protokoll (selbstständig, klarer Engpass, gute Umsetzung)
    return {
      kind: "protokoll",
      title: "DAS PROTOKOLL passt zu deinem Profil",
      why: executionStrong
        ? "Du setzt grundsätzlich zuverlässig um und hast einen klaren Hauptengpass. Damit kommst du selbstständig mit dem System am schnellsten voran — ohne laufende Begleitung."
        : "Du hast einen klaren Fokus und keine große Komplexität. Das Protokoll gibt dir das komplette System für die selbstständige Umsetzung.",
      primary: { label: "DAS PROTOKOLL ansehen", href: "protokoll.html" },
      secondary: { label: "Lieber mit Begleitung? 1:1 Coaching", href: "coaching.html" }
    };
  };

  /* ---------- Personalisierte Insights (aus konkreten Antworten) ---------- */
  C.personalInsights = function (a, r) {
    var neg = [], pos = [];
    var sleepMap = { lt5: "unter 5", "5to6": "5–6", "6to7": "6–7" };
    if (a.rec_duration === "lt5" || a.rec_duration === "5to6")
      neg.push({ icon: "😴", text: "Du schläfst aktuell nur <strong>" + sleepMap[a.rec_duration] + " Stunden</strong>. Das bremst Regeneration, Appetitkontrolle und Energie mehr als fast alles andere — und ist dein schnellster Hebel." });
    else if (a.rec_wake === "geraedert" || a.rec_wake === "nachts_wach")
      neg.push({ icon: "😴", text: "Du wachst gerädert auf bzw. nachts oft. Selbst bei genug Stunden zählt die <strong>Schlafqualität</strong> — Koffein-Timing und Abendroutine sind hier dein Hebel." });

    if (a.fuel_protein === "keine_ahnung")
      neg.push({ icon: "🥩", text: "Du weißt nicht, wie viel <strong>Protein</strong> du isst. Solange das im Dunkeln bleibt, sind Fettabbau und Muskelerhalt Glückssache. Dein Zielwert: <strong>" + C.protTarget(a) + "</strong> pro Tag." });
    else if (a.fuel_protein === "lt80")
      neg.push({ icon: "🥩", text: "Dein <strong>Protein liegt unter 80 g</strong> pro Tag — deutlich zu wenig. Allein das auf <strong>" + C.protTarget(a) + "</strong> anzuheben verändert Sättigung und Körperbild spürbar." });

    var freqMap = { "0": "gar nicht", "1": "nur 1×", unregelmaessig: "sehr unregelmäßig" };
    if (a.str_freq === "0" || a.str_freq === "1" || a.str_freq === "unregelmaessig")
      neg.push({ icon: "🏋️", text: "Du trainierst aktuell <strong>" + freqMap[a.str_freq] + "</strong> Kraft pro Woche. Schon <strong>2–3 feste Einheiten</strong> mit Progression sind hier dein größter Hebel — mehr Tage sind nicht automatisch besser." });
    else if (a.str_plan === "spontan" || a.str_log === "nein")
      neg.push({ icon: "📈", text: "Du trainierst zwar, aber <strong>ohne dokumentierte Progression</strong>. Ohne Steigerung im Plan stagniert der Reiz — Tracking ist dein Hebel, nicht mehr Schwitzen." });

    // Cardio-Lücke sichtbar machen (auch bei starkem Kraftfundament)
    if (a.str_cardio_freq === "0" || a.str_cardio_freq === "alltag")
      neg.push({ icon: "🫀", text: "Du machst <strong>kaum gezieltes Cardio</strong>. Aerobe Fitness ist ein eigenständiges System für Herz, Gesundheit und Ausdauer — 2 lockere Zone-2-Einheiten pro Woche sind ein starker, oft fehlender Baustein." });

    if (a.steps === "lt4")
      neg.push({ icon: "👟", text: "<strong>Unter 4.000 Schritte</strong> am Tag — der am meisten unterschätzte Hebel. Mehr Alltagsbewegung verbrennt oft mehr als jedes Workout. Ziel: <strong>" + C.stepTargetNum(a) + "</strong>." });
    else if (a.steps === "4to7")
      neg.push({ icon: "👟", text: "<strong>4.000–7.000 Schritte</strong> sind okay, aber nicht genug. Ein Ziel von <strong>" + C.stepTargetNum(a) + "</strong> ist ein leiser, großer Hebel für deine Bilanz." });

    if (a.fuel_alcohol === "taeglich")
      neg.push({ icon: "🍺", text: "<strong>Fast täglich Alkohol</strong> sabotiert Schlafqualität, Regeneration und Kalorienbilanz gleichzeitig — drei deiner Baustellen auf einmal." });
    else if (a.fuel_alcohol === "we_viel")
      neg.push({ icon: "🍺", text: "Am Wochenende viel Alkohol: Zwei Tage können das Defizit von fünf disziplinierten löschen. Hier liegt <strong>schnelle Beute</strong>." });

    if (a.rec_caffeine === "abends" || a.rec_caffeine === "nachmittag")
      neg.push({ icon: "☕", text: "Du trinkst Koffein bis in den <strong>" + (a.rec_caffeine === "abends" ? "Abend" : "Nachmittag") + "</strong>. Menge und Timing zusammen kosten oft Tiefschlaf — teste, ob eine frühere Deadline deinen Schlaf verbessert." });

    if (a.blood_bp === "nein" || a.blood_bp === "lange_her")
      neg.push({ icon: "🩺", text: "Du kennst deinen <strong>Blutdruck</strong> aktuell nicht. Er ist der wichtigste einzelne, still verlaufende Gesundheitswert — einmal messen (Apotheke/Arzt) ist ein großer, kostenloser Schritt." });

    if (a.exe_restarts === "staendig" || a.exe_restarts === "nie_drin")
      neg.push({ icon: "🔁", text: "Du startest immer wieder neu. Das ist <strong>kein Disziplinproblem</strong> — dir fehlt ein System, das deinen Alltag überlebt. Genau das ist der Kern von MaleMetrix." });

    if (r.whtr && r.whtr >= 0.6)
      neg.push({ icon: "📏", text: "Dein Bauchumfang liegt bei <strong>" + r.whtr.toFixed(2).replace(".", ",") + "×</strong> deiner Größe (Ziel: unter 0,50). Das ist dein wichtigster sichtbarer Marker — und gut veränderbar." });
    else if (r.whtr && r.whtr >= 0.5)
      neg.push({ icon: "📏", text: "Dein Bauchumfang liegt <strong>knapp über der Hälfte</strong> deiner Größe. Schon ein paar Zentimeter weniger verschieben das Bild spürbar." });

    if (a.rec_stress && parseInt(a.rec_stress, 10) >= 8)
      neg.push({ icon: "🧠", text: "Dein Stresslevel liegt bei <strong>" + a.rec_stress + "/10</strong>. Hoher Dauerstress arbeitet gegen Schlaf, Appetit und Regeneration — kurze tägliche Spaziergänge sind dein Ventil." });

    if (a.drv_energy === "nur_koffein")
      neg.push({ icon: "⚡", text: "Du <strong>funktionierst nur mit Koffein</strong>. Das ist ein Symptom, kein Zustand — meist steckt Schlaf oder Erholung dahinter, nicht ein „Energie-Problem“." });

    var strongTexts = {
      execution: "Deine <strong>Umsetzung</strong> ist stark — der beste Startvorteil, den es gibt.",
      strength: "Dein <strong>Trainings- & Fitness-Fundament</strong> ist solide — darauf lässt sich schnell aufbauen.",
      recovery: "Deine <strong>Erholung</strong> ist eine Stärke — sie erlaubt dir, über Training und Ernährung zu skalieren.",
      fuel: "Deine <strong>Ernährung</strong> ist überraschend strukturiert — eine starke Basis.",
      body: "Deine <strong>Körperbasis</strong> ist gut — bei dir geht es um Feintuning.",
      drive: "Dein <strong>Antrieb</strong> ist eine Stärke — nutze ihn als Motor.",
      blood: "Deine <strong>Gesundheitsdaten & Prävention</strong> sind im Griff — du steuerst mit Fakten statt Gefühl."
    };
    if (r.scores[r.strongest] >= 50 && strongTexts[r.strongest])
      pos.push({ icon: "✅", text: "Deine Stärke: " + strongTexts[r.strongest] });

    if (a.goal_urgency >= 4 || a.exe_ready >= 8)
      pos.push({ icon: "🔥", text: "Du willst <strong>jetzt</strong> starten — und Bereitschaft ist der Faktor, der am stärksten über Erfolg entscheidet. Nutze dieses Momentum." });

    return neg.slice(0, 5).concat(pos.slice(0, 1));
  };

  /* ---------- Dynamischer 7-Tage-Plan (modusbewusst, inkl. Cardio) ---------- */
  C.dynamicPlan = function (a, r) {
    var tv = C.targetValues(a);
    var has = {
      sleep: ["lt5", "5to6"].indexOf(a.rec_duration) >= 0 || ["geraedert", "nachts_wach"].indexOf(a.rec_wake) >= 0,
      caffeine: ["nachmittag", "abends"].indexOf(a.rec_caffeine) >= 0,
      protein: ["keine_ahnung", "lt80"].indexOf(a.fuel_protein) >= 0,
      training: ["0", "1", "unregelmaessig"].indexOf(a.str_freq) >= 0,
      cardio: ["0", "alltag"].indexOf(a.str_cardio_freq) >= 0,
      steps: ["lt4", "4to7"].indexOf(a.steps) >= 0,
      alcohol: ["we_viel", "taeglich", "2to3"].indexOf(a.fuel_alcohol) >= 0,
      tracking: Array.isArray(a.body_tracking) && a.body_tracking.indexOf("nichts") >= 0,
      blood: a.blood_bp === "nein" || a.blood_bp === "lange_her" || a.blood_baseline === "nie",
      weekend: ["wochenende", "abends"].indexOf(a.fuel_control) >= 0
    };
    var energyLine = tv.hasEnergy
      ? "Startwerte notieren — Modus " + tv.modeLabel + " (" + tv.modeDesc + "): Zielbereich ca. " + tv.targetLo + "–" + tv.targetHi + " kcal, Protein " + tv.proteinLo + "–" + tv.proteinHi + " g"
      : "Modus wählen: " + tv.modeLabel + " (" + tv.modeDesc + ") und Protein-Ziel " + tv.proteinStr + " festlegen";
    var days = [];

    days.push({ day: "Tag 1", items: [
      "Gewicht und Bauchumfang messen (Nabelhöhe, ausgeatmet) + 3 Fotos: front, seitlich, hinten",
      energyLine,
      "Heute leichter Start: 20–30 Min zügig spazieren (Richtung " + tv.stepGoal + " Schritte) — jeden Tag ein Bewegungsreiz"
    ] });

    var d2 = [];
    if (has.sleep) d2.push("Feste Schlafenszeit für die nächsten 7 Tage festlegen — Ziel mindestens 7 Stunden");
    else d2.push("Zwei proteinreiche Standardmahlzeiten definieren, die du ohne Nachdenken wiederholst");
    if (has.blood) d2.push("Blutdruck messen lassen (Apotheke/Arzt) und notieren");
    else if (has.caffeine) d2.push("Koffein-Timing testen: Deadline früher legen und Schlaf beobachten");
    d2.push(has.steps ? ("Schritte-Tracking am Handy aktivieren, Ziel " + tv.stepGoal + " — heute Bewegungstag (Gehen/Mobility)") : ("Bewegungstag: " + tv.stepGoal + " Schritte oder 10 Min Mobility — kein Gym, aber nicht nichts"));
    days.push({ day: "Tag 2", items: d2 });

    days.push({ day: "Tag 3", items: [
      has.training ? "Erstes Krafttraining: Ganzkörper, 45–60 Min, Technik vor Gewicht — im Tracker dokumentieren" : "Krafttraining wie gewohnt — ab heute jede Übung im Tracker dokumentieren (Gewicht, Wdh.)",
      has.cardio ? "20–30 Min lockeres Cardio (Zone 2, nebenbei sprechen möglich) — dein Motor-Startpunkt" : "Nach dem Training 15–20 Min zügig gehen (Richtung " + tv.stepGoal + " Schritte)"
    ] });

    var d4 = [];
    if (has.tracking) d4.push("Einen Tag Ernährung grob mitschreiben — nur beobachten, noch nichts ändern");
    else d4.push("Protein heute bewusst treffen (" + tv.proteinLo + "–" + tv.proteinHi + " g) und kurz notieren");
    if (has.blood) d4.push("Alters-/risikogerechte Vorsorge prüfen: Wann war der letzte Check-up?");
    else d4.push("Koffein-Deadline testen, etwas früher ins Bett");
    d4.push("Bewegungstag: 20–40 Min lockere Zone 2 (Gehen/Rad, sprechen möglich) oder Mobility — aktive Erholung zwischen den Krafttagen");
    days.push({ day: "Tag 4", items: d4 });

    days.push({ day: "Tag 5", items: [
      "Zweites Krafttraining — gleiche Übungen, kleine Steigerung anstreben",
      has.sleep ? "Abendroutine: letzte 30 Minuten vor dem Schlafen ohne Bildschirm" : (tv.stepGoal + " Schritte erreichen")
    ] });

    days.push({ day: "Tag 6", items: [
      (has.alcohol || has.weekend) ? "Wochenendstrategie schriftlich festlegen: Alkohol- und Snack-Limit vorab — nüchtern entschieden" : "Eine flexible Mahlzeit bewusst einplanen statt das Wochenende laufen zu lassen",
      has.cardio ? "Zweite lockere Cardio-Einheit (20–30 Min) oder aktive Erholung" : "Dritte Trainingseinheit oder aktive Erholung (Spaziergang, Mobility 15 Min)"
    ] });

    days.push({ day: "Tag 7", items: [
      "Sonntag-Review: Gewicht, Bauchumfang, Schlaf, Training, Cardio und Energie (1–10) mit Tag 1 vergleichen",
      "Aktive Erholung: leichter Spaziergang oder Mobility — Ruhetag heißt lockere Bewegung, nicht Couch",
      "Nächste Woche planen: 3 feste Krafteinheiten + tägliche Bewegung in den Kalender eintragen — und deinen #1-Engpass benennen"
    ] });

    return days;
  };
})();

/* ==========================================================================
   SCORE V2 — ADAPTIVE INTELLIGENCE ENGINE
   --------------------------------------------------------------------------
   Vier Kontexte (natural / former_enhanced / medical_trt / enhanced) sind
   unterschiedliche BIOLOGISCHE UND MONITORING-KONTEXTE, keine Wertung.
   Der Status erzeugt NIEMALS einen direkten Punktabzug. Bewertet wird
   ausschliesslich, wie gut das aktuelle System kontrolliert ist.

   Architektur (vollstaendig dokumentiert in SCORE_V2_LOGIC.md):
     statusOf        → Routing-Enum (nie Anzeigetexte als Logik-Key)
     visibleSteps    → adaptive Fragenliste (progressive disclosure)
     domainScores    → 12 Kern-Domains + 1 Kontext-Domain, je 0..100
     dataGaps        → UNBEKANNT ≠ GUT: explizite Luecken statt Annahmen
     assessmentConfidence → HIGH / MODERATE / LIMITED, getrennt vom Score
     primaryBottleneck    → Prioritaet, nicht einfach "niedrigster Wert"
     goalDecision    → CUT / RECOMP / BUILD / PERFORM / HEALTH FIRST
   ========================================================================== */
(function () {
  "use strict";
  var C = window.MM_CHECK;
  var num = function (x) { var n = parseFloat(x); return isFinite(n) ? n : 0; };
  var arr = function (x) { return Array.isArray(x) ? x : []; };

  /* ---------------------------------------------------------------- STATUS */

  C.STATUS = ["natural", "former_enhanced", "medical_trt", "enhanced", "uncertain", "unknown"];

  /* Alte Ergebnisse haben kein perf_status. Sie werden NICHT als "natural"
     und nicht als "gesund" interpretiert, sondern als "unknown" (Legacy). */
  C.statusOf = function (a) {
    a = a || {};
    var s = a.perf_status;
    return (C.STATUS.indexOf(s) >= 0 && s !== "unknown") ? s : "unknown";
  };

  C.statusLabels = {
    natural:         { short: "NATURAL",         long: "Natural" },
    former_enhanced: { short: "FRÜHER ENHANCED", long: "Früher Enhanced" },
    medical_trt:     { short: "TRT",             long: "Ärztliche Hormontherapie" },
    enhanced:        { short: "ENHANCED",        long: "Enhanced" },
    uncertain:       { short: "STATUS OFFEN",    long: "Status offen" },
    unknown:         { short: "STATUS UNBEKANNT", long: "Status nicht erfasst (Legacy-Ergebnis)" }
  };

  /* Kontext-Domain je Status — nur EINE ist jemals aktiv. */
  C.contextDomainOf = function (st) {
    return st === "enhanced" ? "enhancedControl"
      : st === "medical_trt" ? "therapyControl"
      : st === "former_enhanced" ? "recoveryStatus" : null;
  };

  /* --------------------------------------------------- ROUTING-PRAEDIKATE */

  C.usesGlp1 = function (a) {
    a = a || {};
    return arr(a.enh_categories).indexOf("glp1") >= 0 || arr(a.met_medication).indexOf("glp1") >= 0;
  };
  C.bloodInterest = function (a) {
    a = a || {};
    var g = arr(a.goal_main);
    return g.indexOf("blutwerte") >= 0 || g.indexOf("hormone") >= 0
      || a.goal_pain === "blutwerte" || C.statusOf(a) !== "natural";
  };
  C.driveConcern = function (a) {
    a = a || {};
    return ["stabil"].indexOf(a.drv_energy) < 0
      || ["sehr", "okay"].indexOf(a.drv_libido) < 0
      || a.goal_pain === "muede" || a.goal_pain === "libido";
  };
  C.sexualConcern = function (a) {
    a = a || {};
    return ["schwankend", "niedrig"].indexOf(a.drv_libido) >= 0
      || ["selten", "fast_nie"].indexOf(a.drv_morning) >= 0
      || arr(a.enh_signals).indexOf("libido") >= 0 || arr(a.enh_signals).indexOf("erektion") >= 0
      || arr(a.fe_changes).indexOf("libido") >= 0 || arr(a.fe_changes).indexOf("erektion") >= 0;
  };

  /* ------------------------------------------------- ADAPTIVE FRAGENLISTE */

  C.stepVisible = function (mod, q, a) {
    try { if (typeof mod.when === "function" && !mod.when(a)) return false; } catch (e) {}
    try { if (typeof q.when === "function" && !q.when(a)) return false; } catch (e) {}
    return true;
  };

  /* Flache, adaptive Schrittliste in Reihenfolge der Module. */
  C.visibleSteps = function (a) {
    a = a || {};
    var out = [];
    C.modules.forEach(function (m) {
      m.questions.forEach(function (q) {
        if (C.stepVisible(m, q, a)) out.push({ mod: m, q: q });
      });
    });
    return out;
  };

  /* Alle Fragen (auch unsichtbare) — fuer Auswertung gespeicherter Antworten. */
  C.allSteps = (function () {
    var out = [];
    C.modules.forEach(function (m) { m.questions.forEach(function (q) { out.push({ mod: m, q: q }); }); });
    return out;
  })();
  C.questionById = function (id) {
    for (var i = 0; i < C.allSteps.length; i++) if (C.allSteps[i].q.id === id) return C.allSteps[i].q;
    return null;
  };

  /* ------------------------------------------------------------- DOMAINS */

  C.domainKeys = ["bodyComposition", "training", "movement", "sleep", "recovery", "nutrition",
    "metabolic", "cardiovascular", "hormonal", "energy", "dataQuality", "execution"];

  C.domainMeta = {
    bodyComposition: { name: "Körperkomposition", short: "KÖRPER", w: 12, health: 1.0, action: 0.9 },
    training:        { name: "Training",          short: "TRAINING", w: 11, health: 0.8, action: 1.0 },
    movement:        { name: "Alltagsbewegung",   short: "BEWEGUNG", w: 8,  health: 0.9, action: 1.0 },
    sleep:           { name: "Schlaf",            short: "SCHLAF", w: 11, health: 1.0, action: 0.9 },
    recovery:        { name: "Erholung & Stress", short: "ERHOLUNG", w: 8,  health: 0.8, action: 0.8 },
    nutrition:       { name: "Ernährung",         short: "ERNÄHRUNG", w: 11, health: 0.9, action: 0.9 },
    metabolic:       { name: "Stoffwechsel",      short: "STOFFWECHSEL", w: 9,  health: 1.1, action: 0.7 },
    cardiovascular:  { name: "Herz-Kreislauf",    short: "HERZ-KREISLAUF", w: 11, health: 1.3, action: 0.8 },
    hormonal:        { name: "Hormonell & Sexuell", short: "HORMONELL", w: 6, health: 0.9, action: 0.6 },
    energy:          { name: "Energie & Antrieb", short: "ENERGIE", w: 7,  health: 0.7, action: 0.7 },
    dataQuality:     { name: "Datenlage & Monitoring", short: "DATENLAGE", w: 10, health: 1.0, action: 1.0 },
    execution:       { name: "Umsetzung",         short: "UMSETZUNG", w: 10, health: 0.7, action: 1.0 },
    enhancedControl: { name: "Enhanced Control",  short: "CONTROL", w: 12, health: 1.3, action: 1.0 },
    therapyControl:  { name: "Therapie-Kontrolle", short: "THERAPIE", w: 10, health: 1.2, action: 1.0 },
    recoveryStatus:  { name: "Rückkehr-Status",   short: "RÜCKKEHR", w: 9,  health: 1.0, action: 0.9 }
  };

  /* Frage → GENAU EINE Domain (kein Mehrfachzaehlen). Fragen mit eigenem
     dom-Feld (V2-Fragen) haben Vorrang; hier stehen die Bestandsfragen. */
  C.domainMap = {
    body_weighttrend: "bodyComposition", body_waisttrend: "bodyComposition",
    body_type: "bodyComposition", body_satisfaction: "bodyComposition",
    body_tracking: "dataQuality",

    str_freq: "training", str_plan: "training", str_log: "training",
    str_exercises: "training", str_limit: "training", str_values: "training",
    str_cardio_freq: "training", str_cardio_capacity: "cardiovascular", str_cardio_marker: "dataQuality",

    fuel_protein: "nutrition", fuel_structure: "nutrition", fuel_calories: "nutrition",
    fuel_alcohol: "nutrition", fuel_control: "nutrition", fuel_eatout: "nutrition",

    rec_duration: "sleep", rec_wake: "sleep", rec_night: "sleep",
    rec_caffeine: "sleep", rec_snore: "sleep", rec_stress: "recovery",

    blood_bp: "cardiovascular", blood_family: "cardiovascular",
    blood_cardiometabolic: "metabolic",
    blood_baseline: "dataQuality", blood_prevention: "dataQuality",
    blood_doctor: "dataQuality", blood_overtest: "dataQuality",

    drv_energy: "energy", drv_focus: "energy", drv_motivation: "energy", drv_caffeine: "energy",
    drv_libido: "hormonal", drv_morning: "hormonal",

    exe_slots: "execution", exe_restarts: "execution", exe_after4w: "execution",
    exe_enemy: "execution", exe_support: "execution", exe_ready: "execution"
  };
  C.domainOf = function (q) { return q.dom || C.domainMap[q.id] || null; };

  /* Punkte + Maximum einer beantworteten Frage. */
  function qPoints(q, ans) {
    if (ans === undefined || ans === null || ans === "") return null;
    if (q.type === "single") {
      var opt = (q.options || []).find(function (o) { return String(o.v) === String(ans); });
      if (!opt || typeof opt.p !== "number") return null;
      var max = 0;
      q.options.forEach(function (o) { if (typeof o.p === "number" && o.p > max) max = o.p; });
      return max > 0 ? { p: opt.p, max: max } : null;
    }
    if (q.type === "multi") {
      var sel = arr(ans), sum = 0, maxAll = 0;
      (q.options || []).forEach(function (o) { if (typeof o.p === "number" && !o.exclusive) maxAll += o.p; });
      if (!maxAll) return null;
      sel.forEach(function (v) {
        var o = (q.options || []).find(function (x) { return String(x.v) === String(v); });
        if (o && typeof o.p === "number") sum += o.p;
      });
      var cap = q.cap || maxAll;
      return { p: Math.min(sum, cap), max: Math.min(maxAll, cap) };
    }
    if (q.type === "scale") {
      var val = parseInt(ans, 10);
      if (!isFinite(val) || !q.pointsMap) return null;
      var got = 0, mx = 0;
      q.pointsMap.forEach(function (pair) { if (pair[1] > mx) mx = pair[1]; });
      for (var i = 0; i < q.pointsMap.length; i++) { if (val <= q.pointsMap[i][0]) { got = q.pointsMap[i][1]; break; } }
      return mx > 0 ? { p: got, max: mx } : null;
    }
    return null;
  }

  /* Zusatzsignale aus den Basisdaten (keine eigenen Fragen). */
  function extraInputs(a) {
    var out = [];
    var waist = num(a.waist), h = num(a.height);
    if (waist && h) {
      var ratio = waist / h;
      var p = ratio < 0.5 ? 25 : ratio < 0.55 ? 17 : ratio < 0.6 ? 9 : 3;
      out.push({ dom: "bodyComposition", p: p, max: 25 });
    }
    var stepP = { lt4: 2, "4to7": 8, "7to10": 14, gt10: 18 }[a.steps];
    if (stepP !== undefined) out.push({ dom: "movement", p: stepP, max: 18 });
    var jobP = { sitzend: 3, gemischt: 9, aktiv: 14, schicht: 6 }[a.job];
    if (jobP !== undefined) out.push({ dom: "movement", p: jobP, max: 14 });
    var histP = { nie: 2, lange_raus: 4, pausen: 7, aktiv: 12 }[a.history];
    if (histP !== undefined) out.push({ dom: "training", p: histP, max: 12 });
    return out;
  }

  /* Kontextmodifikatoren: bewusst wenige, klein, gedeckelt, dokumentiert.
     Verhindert, dass EIN Problem fuenf Domains gleichzeitig bestraft. */
  C.MODIFIERS = [
    { id: "sleep_debt", when: function (a) { return ["lt5", "5to6"].indexOf(a.rec_duration) >= 0; },
      apply: { recovery: -6, energy: -6 }, why: "Ausgeprägtes Schlafdefizit wirkt nachweislich auf Erholung und Energie." },
    { id: "sedentary", when: function (a) { return a.mov_sitting === "gt11" || a.steps === "lt4"; },
      apply: { metabolic: -5 }, why: "Sehr geringe Alltagsbewegung ist ein eigenständiger metabolischer Faktor." }
  ];

  /* Bewertet werden ausschliesslich die Fragen, die fuer DIESE Antworten
     sichtbar sind. Wer seinen Status im Wizard zurueck aendert, schleppt
     keine Antworten aus einem verlassenen Zweig mit. */
  C.scoredSteps = function (a) { return C.visibleSteps(a || {}); };

  C.domainScores = function (a) {
    a = a || {};
    var acc = {};
    function add(dom, p, max) {
      if (!dom || !max) return;
      if (!acc[dom]) acc[dom] = { p: 0, max: 0, n: 0 };
      acc[dom].p += p; acc[dom].max += max; acc[dom].n++;
    }
    C.scoredSteps(a).forEach(function (st) {
      var dom = C.domainOf(st.q);
      if (!dom) return;
      var r = qPoints(st.q, a[st.q.id]);
      if (r) add(dom, r.p, r.max);
    });
    extraInputs(a).forEach(function (x) { add(x.dom, x.p, x.max); });

    var out = {}, applied = [];
    Object.keys(acc).forEach(function (d) {
      out[d] = Math.max(0, Math.min(100, Math.round(100 * acc[d].p / acc[d].max)));
    });
    C.MODIFIERS.forEach(function (m) {
      var hit = false;
      try { hit = !!m.when(a); } catch (e) { hit = false; }
      if (!hit) return;
      applied.push(m.id);
      Object.keys(m.apply).forEach(function (d) {
        if (out[d] === undefined) return;
        out[d] = Math.max(0, Math.min(100, out[d] + m.apply[d]));
      });
    });
    return { domains: out, coverage: acc, modifiers: applied };
  };

  /* Gesamtscore: gewichtetes Mittel ueber die VORHANDENEN Domains.
     Der Status selbst zieht nie Punkte ab — er entscheidet nur, welche
     Kontext-Domain zusaetzlich bewertet wird. */
  C.totalFrom = function (domains) {
    var sum = 0, wsum = 0;
    Object.keys(domains).forEach(function (d) {
      var meta = C.domainMeta[d];
      if (!meta || domains[d] === null || domains[d] === undefined) return;
      sum += domains[d] * meta.w; wsum += meta.w;
    });
    return wsum ? Math.round(sum / wsum) : 0;
  };

  /* V2-Domains → die 7 historischen Bereiche (Radar, Report, Programm). */
  C.legacyScores = function (d) {
    function g(k, fb) { return (d[k] === undefined || d[k] === null) ? fb : d[k]; }
    function mix(parts) {
      var s = 0, w = 0;
      parts.forEach(function (p) { if (d[p[0]] !== undefined && d[p[0]] !== null) { s += d[p[0]] * p[1]; w += p[1]; } });
      return w ? Math.round(s / w) : 50;
    }
    return {
      body: Math.round(g("bodyComposition", 50)),
      strength: mix([["training", 0.7], ["movement", 0.3]]),
      fuel: Math.round(g("nutrition", 50)),
      recovery: mix([["sleep", 0.6], ["recovery", 0.4]]),
      blood: mix([["metabolic", 0.35], ["cardiovascular", 0.35], ["dataQuality", 0.3]]),
      drive: mix([["energy", 0.6], ["hormonal", 0.4]]),
      execution: Math.round(g("execution", 50))
    };
  };

  /* ------------------------------------------------------------- SIGNALE */

  C.signals = function (a) {
    a = a || {};
    var set = {};
    C.scoredSteps(a).forEach(function (st) {
      var q = st.q, ans = a[q.id];
      if (ans === undefined || ans === null) return;
      var vals = Array.isArray(ans) ? ans : [ans];
      vals.forEach(function (v) {
        var o = (q.options || []).find(function (x) { return String(x.v) === String(v); });
        if (o && o.sig) set[o.sig] = true;
      });
    });
    if (a.rec_snore === "aussetzer") set.apnea = true;
    if (arr(a.redflags).indexOf("apnoe") >= 0) set.apnea = true;
    if (arr(a.redflags).indexOf("blutdruck") >= 0) set.bp_uncontrolled = true;
    if (C.sexualConcern(a)) set.sexual = true;
    return Object.keys(set);
  };

  /* ----------------------------------------------------- DATA-GAP-ENGINE */
  /* Zentrale Regel: NICHT GEMESSEN ist NICHT "normal". Eine Luecke senkt die
     Aussagesicherheit (Confidence) — nicht automatisch den Score. */

  C.GAP_LIB = {
    waist:            { label: "Bauchumfang unbekannt", why: "Der Bauchumfang sagt über Stoffwechselrisiko mehr aus als das Gewicht allein.", dom: "bodyComposition", sev: 2 },
    steps:            { label: "Alltagsbewegung nicht erfasst", why: "Ohne grobe Schritt-Orientierung fehlt der größte Hebel neben dem Training.", dom: "movement", sev: 1 },
    sitting:          { label: "Sitzzeit unbekannt", why: "Sitzzeit wirkt unabhängig vom Training auf den Stoffwechsel.", dom: "movement", sev: 1 },
    bp:               { label: "Blutdruck nicht bekannt", why: "Blutdruck ist der wichtigste einzelne, still verlaufende Gesundheitswert — und selbst messbar.", dom: "cardiovascular", sev: 3 },
    labs_old:         { label: "Letzte Blutwerte über 12 Monate alt", why: "Ältere Werte beschreiben nicht deinen aktuellen Zustand.", dom: "dataQuality", sev: 2 },
    labs_none:        { label: "Keine Blutwerte vorhanden", why: "Ohne Baseline bleibt jede Einordnung deiner Werte Schätzung.", dom: "dataQuality", sev: 3 },
    markers_unknown:  { label: "Keine konkreten Marker bekannt", why: "Ohne bekannte Einzelwerte lässt sich kein Risikoprofil bilden.", dom: "dataQuality", sev: 2 },
    apob:             { label: "ApoB unbekannt", why: "ApoB bildet die Zahl der atherogenen Partikel ab — im Risiko- oder Enhanced-Kontext besonders relevant.", dom: "cardiovascular", sev: 2 },
    lipids:           { label: "Blutfette unbekannt", why: "Lipide gehören zu den wenigen Werten, die im Verlauf wirklich etwas verändern.", dom: "cardiovascular", sev: 2 },
    glucose:          { label: "Blutzucker / HbA1c unbekannt", why: "Metabolische Verschiebungen laufen lange ohne Symptome.", dom: "metabolic", sev: 2 },
    hematocrit:       { label: "Hämatokrit / Hämoglobin unbekannt", why: "Androgen wirksame Substanzen können das Blut verdicken — ein klassisch überwachter Wert.", dom: "enhancedControl", sev: 3 },
    liver:            { label: "Leberwerte unbekannt", why: "Bei oralen Substanzen ist der Leber-Kontext besonders relevant.", dom: "enhancedControl", sev: 3 },
    nicotine:         { label: "Nikotinstatus offen", why: "Nikotin ist einer der stärksten einzelnen kardiovaskulären Faktoren.", dom: "cardiovascular", sev: 1 },
    snoring:          { label: "Schlafatmung unklar", why: "Schnarchen und Atemaussetzer beeinflussen Energie, Blutdruck und Erholung.", dom: "sleep", sev: 2 },
    training_response:{ label: "Trainingsantwort nicht einschätzbar", why: "Die Reaktion auf Training ist ein ehrlicher Alltagsmarker.", dom: "training", sev: 1 },
    sexual_course:    { label: "Verlauf der sexuellen Funktion offen", why: "Für die ärztliche Einordnung zählt der Verlauf mehr als der Momentzustand.", dom: "hormonal", sev: 1 },
    former_timeline:  { label: "Zeitpunkt der letzten Anwendung unklar", why: "Ohne Zeitachse lässt sich der Rückkehr-Status nicht einordnen.", dom: "recoveryStatus", sev: 2 },
    former_exposure:  { label: "Dauer der früheren Anwendung unklar", why: "Expositionsdauer ist ein zentraler Kontextfaktor.", dom: "recoveryStatus", sev: 2 },
    former_symptoms:  { label: "Veränderungen seit dem Absetzen unklar", why: "Ohne Symptombild bleibt der Rückkehr-Status offen.", dom: "recoveryStatus", sev: 2 },
    former_followup:  { label: "Keine Nachkontrolle nach dem Absetzen", why: "Zeit allein ist kein Beleg dafür, dass sich das System erholt hat.", dom: "recoveryStatus", sev: 3 },
    trt_labs:         { label: "Keine aktuellen Verlaufskontrollen", why: "Eine Hormontherapie ohne Verlaufswerte ist nicht gesteuert, sondern nur begonnen.", dom: "therapyControl", sev: 3 },
    trt_indication:   { label: "Indikation der Therapie unklar", why: "Der Anlass entscheidet mit, was sinnvoll kontrolliert wird.", dom: "therapyControl", sev: 2 },
    trt_response:     { label: "Therapie-Ansprechen unklar", why: "Ohne Verlaufseinschätzung fehlt der wichtigste Wirksamkeitsmarker.", dom: "therapyControl", sev: 1 },
    enh_context:      { label: "Aktueller Kontext nicht angegeben", why: "Ohne Kontext bleibt die Einordnung bewusst allgemein.", dom: "enhancedControl", sev: 1 },
    enh_categories:   { label: "Beteiligte Kategorien nicht angegeben", why: "Ohne Kategorien können relevante Kontrollthemen nicht zugeordnet werden.", dom: "enhancedControl", sev: 2 },
    enh_signals:      { label: "Mögliche Veränderungen unklar", why: "Ohne Symptomlage fehlt ein wichtiger Frühindikator.", dom: "enhancedControl", sev: 1 },
    glp1_lean:        { label: "Muskelschutz unter GLP-1 unklar", why: "Unter starker Appetitreduktion ist Muskelerhalt der kritische Punkt.", dom: "nutrition", sev: 2 }
  };

  C.dataGaps = function (a) {
    a = a || {};
    var st = C.statusOf(a);
    var ids = {};
    /* 1) Luecken direkt aus Antworten (gap-Flag an der Option) */
    C.scoredSteps(a).forEach(function (step) {
      var q = step.q, ans = a[q.id];
      if (ans === undefined || ans === null) return;
      var vals = Array.isArray(ans) ? ans : [ans];
      vals.forEach(function (v) {
        var o = (q.options || []).find(function (x) { return String(x.v) === String(v); });
        if (o && o.gap) ids[o.gap] = true;
      });
    });
    /* 2) Strukturelle Luecken */
    if (!num(a.waist)) ids.waist = true;
    if (!a.steps || a.steps === "unknown") ids.steps = true;
    if (a.blood_bp === "nein" || a.blood_bp === "lange_her") ids.bp = true;
    var known = arr(a.lab_known);
    var noLabs = ["gt12m", "nie", "unsure"].indexOf(a.lab_recency) >= 0 || !a.lab_recency;
    var riskContext = st === "enhanced" || st === "medical_trt" || st === "former_enhanced"
      || a.met_glucose === "prediabetes" || a.met_glucose === "diabetes"
      || C.signals(a).indexOf("bp_uncontrolled") >= 0 || num(a.age) >= 40;
    if (riskContext && (noLabs || (known.indexOf("apob") < 0 && known.indexOf("ldl") < 0))) ids.lipids = true;
    if (riskContext && (noLabs || known.indexOf("apob") < 0)) ids.apob = true;
    if (noLabs || (known.length && known.indexOf("glukose") < 0)) {
      if (a.met_glucose === "nie" || a.met_glucose === "unsure") ids.glucose = true;
    }
    if (st === "enhanced" && (noLabs || (known.length && known.indexOf("haematokrit") < 0))) ids.hematocrit = true;
    /* 3) Ausgeben, nach Schwere sortiert */
    return Object.keys(ids).filter(function (k) { return !!C.GAP_LIB[k]; }).map(function (k) {
      var g = C.GAP_LIB[k];
      return { id: k, label: g.label, why: g.why, domain: g.dom, severity: g.sev };
    }).sort(function (x, y) { return y.severity - x.severity; });
  };

  /* ------------------------------------------------------- RED-FLAG-LOGIK */

  C.redFlags = function (a) {
    a = a || {};
    var flags = [];
    var q = C.questionById("redflags");
    arr(a.redflags).forEach(function (v) {
      var o = q && (q.options || []).find(function (x) { return x.v === v; });
      if (o && o.flag) flags.push(o.flag);
    });
    if (a.rec_snore === "aussetzer" && arr(a.redflags).indexOf("apnoe") < 0) {
      flags.push("Beobachtete Atemaussetzer im Schlaf sollten ärztlich abgeklärt werden (Stichwort Schlafapnoe).");
    }
    if (arr(a.enh_signals).indexOf("atemnot") >= 0 && arr(a.redflags).indexOf("atemnot") < 0) {
      flags.push("Ungewohnte Luftnot gehört ärztlich abgeklärt, bevor die Belastung weiter steigt.");
    }
    if (a.cv_bp_control === "unbehandelt") {
      flags.push("Ein bekannt erhöhter, aktuell unbehandelter Blutdruck gehört ärztlich eingeordnet — er verläuft lange ohne Symptome.");
    }
    if (a.slp_daysleep === "taeglich" && ["stark", "aussetzer"].indexOf(a.rec_snore) >= 0) {
      flags.push("Starkes Schnarchen zusammen mit ausgeprägter Tagesmüdigkeit ist ein Muster, das ärztlich abgeklärt gehört (Stichwort Schlafapnoe).");
    }
    return flags;
  };

  /* -------------------------------------------- ASSESSMENT CONFIDENCE V2 */
  /* Getrennt vom Score: WIE SICHER ist die Einordnung? Keine Fake-Prozente. */

  C.assessmentConfidence = function (a, gaps, flags) {
    a = a || {};
    gaps = gaps || C.dataGaps(a);
    flags = flags || C.redFlags(a);
    var st = C.statusOf(a);
    var reasons = [], sev = 0, critical = [];
    gaps.forEach(function (g) { sev += g.severity; if (g.severity >= 3) critical.push(g.label); });

    /* Verweigerte Angaben in tragenden Bereichen */
    var silent = ["drv_libido", "drv_morning", "enh_context", "enh_categories", "trt_fertility", "cv_smoking", "drv_change"]
      .filter(function (k) { return a[k] === "keine_antwort" || a[k] === "no_answer" || arr(a[k]).indexOf("no_answer") >= 0; }).length;

    /* Widersprueche */
    var h = num(a.height), w = num(a.weight), waist = num(a.waist);
    var whtr = (waist && h) ? waist / h : 0;
    var contradictions = [];
    if (a.body_type === "skinny" && whtr >= 0.56) contradictions.push("Selbstbild „schlank“ passt nicht zum Bauchumfang");
    if (a.body_type === "uebergewicht" && whtr && whtr < 0.47) contradictions.push("Selbstbild „übergewichtig“ passt nicht zu den Messwerten");
    if (a.str_freq === "0" && a.nat_training_response === "gut") contradictions.push("guter Trainingsfortschritt ohne aktuelles Training");

    /* Kontextspezifische Mindestanforderung an Datenqualitaet */
    var contextCritical = 0;
    if (st === "enhanced") {
      ["hematocrit", "bp", "labs_none", "labs_old", "liver", "apob"].forEach(function (id) {
        if (gaps.some(function (g) { return g.id === id; })) contextCritical++;
      });
    } else if (st === "medical_trt") {
      ["trt_labs", "bp", "labs_none"].forEach(function (id) {
        if (gaps.some(function (g) { return g.id === id; })) contextCritical++;
      });
    } else if (st === "former_enhanced") {
      ["former_followup", "former_timeline", "labs_none"].forEach(function (id) {
        if (gaps.some(function (g) { return g.id === id; })) contextCritical++;
      });
    }

    var level;
    if (st === "unknown") {
      level = "LIMITED";
      reasons.push("Dieses Ergebnis stammt aus einer früheren Score-Version ohne Status-Kontext — es wird bewusst vorsichtig gelesen.");
    } else if (critical.length >= 2 || contextCritical >= 2 || sev >= 10 || contradictions.length >= 2 || silent >= 3) {
      level = "LIMITED";
    } else if (critical.length === 1 || contextCritical === 1 || sev >= 4 || contradictions.length === 1 || silent >= 1) {
      level = "MODERATE";
    } else {
      level = "HIGH";
    }
    if (level !== "LIMITED" && flags.length) {
      level = "MODERATE";
      reasons.push("Mögliche medizinische Warnzeichen — bis zur ärztlichen Klärung bleibt die Einordnung bewusst zurückhaltend.");
    }
    if (critical.length) reasons.push("Entscheidende Werte fehlen: " + critical.slice(0, 3).join(", ") + ".");
    else if (gaps.length) reasons.push("Offene Punkte: " + gaps.slice(0, 3).map(function (g) { return g.label; }).join(", ") + ".");
    if (contradictions.length) reasons.push("Widerspruch in deinen Angaben: " + contradictions[0] + ".");
    if (silent) reasons.push("Einzelne Angaben hast du bewusst offen gelassen — das ist in Ordnung, kostet aber Genauigkeit.");
    if (!reasons.length) reasons.push("Deine Angaben sind vollständig und in sich konsistent — die Einordnung ist gut belastbar.");

    return {
      level: level,
      label: level === "HIGH" ? "HOCH" : level === "MODERATE" ? "MODERAT" : "EINGESCHRÄNKT",
      reasons: reasons.slice(0, 3),
      gapCount: gaps.length,
      criticalGaps: critical,
      contradictions: contradictions
    };
  };

  /* ------------------------------------------------------ KONTEXT-PANEL */
  /* Bewertet KONTROLLQUALITAET, nicht den Status an sich. */

  function band(v) {
    return v >= 78 ? { key: "good", label: "GUTE KONTROLLE" }
      : v >= 58 ? { key: "partial", label: "TEILWEISE KONTROLLIERT" }
      : v >= 38 ? { key: "gaps", label: "DEUTLICHE DATENLÜCKEN" }
      : { key: "review", label: "ÜBERPRÜFUNG NÖTIG" };
  }

  C.contextPanel = function (a, domains, gaps) {
    a = a || {}; domains = domains || {}; gaps = gaps || C.dataGaps(a);
    var st = C.statusOf(a);
    var dom = C.contextDomainOf(st);
    var lines = [];
    var openGaps = gaps.filter(function (g) { return g.domain === dom; }).map(function (g) { return g.label; });

    if (st === "enhanced") {
      var v = domains.enhancedControl;
      var b = band(v == null ? 40 : v);
      lines.push("Bewertet wird ausschließlich, wie gut dein aktuelles System kontrolliert ist — nicht, dass du es betreibst.");
      if (a.enh_context) lines.push("Kontext: " + ({ cruise: "TRT-ähnlich / Cruise", blast: "aktive Leistungsphase", blast_cruise: "Blast & Cruise", transition: "Übergangs-/Absetzphase", other: "individuell", no_answer: "nicht angegeben" }[a.enh_context] || "individuell") + ".");
      if (openGaps.length) lines.push("Offene Kontrollpunkte: " + openGaps.join(", ") + ".");
      else lines.push("Deine Kontrollpunkte sind aktuell abgedeckt — das ist die Basis, auf der Leistung überhaupt tragfähig ist.");
      var esig = C.signals(a).filter(function (s) { return ["bp", "cardio_alarm", "apnea", "sexual", "hormonal", "mood", "edema", "fertility"].indexOf(s) >= 0; });
      if (esig.length) {
        lines.push("Du hast Veränderungen angegeben, die in deinem Kontext ärztlich eingeordnet gehören. MaleMetrix bewertet Struktur und Kontrolle — die medizinische Beurteilung gehört zu einem Arzt.");
      }
      return { key: "enhanced", title: "ENHANCED CONTROL", verdict: b.label, band: b.key, value: v == null ? null : v, signals: esig, lines: lines };
    }
    if (st === "medical_trt") {
      var tv = domains.therapyControl;
      var tb = band(tv == null ? 40 : tv);
      var resp = { klar: "deutlich verbessert", teilweise: "teilweise verbessert", nein: "nicht verbessert", schlechter: "verschlechtert", unsure: "unklar" }[a.trt_response];
      lines.push("Therapie-ANSPRECHEN und Therapie-KONTROLLE sind zwei getrennte Dinge. Beides steht hier nebeneinander.");
      if (resp) lines.push("Ansprechen laut deinen Angaben: " + resp + ".");
      if (openGaps.length) lines.push("Kontroll-Lücken: " + openGaps.join(", ") + ".");
      else lines.push("Die Verlaufskontrolle deiner Therapie ist aktuell schlüssig dokumentiert.");
      return { key: "medical_trt", title: "THERAPIE-KONTROLLE", verdict: tb.label, band: tb.key, value: tv == null ? null : tv, response: resp || null, lines: lines };
    }
    if (st === "former_enhanced") {
      var rv = domains.recoveryStatus;
      var rb = band(rv == null ? 40 : rv);
      var sigs = C.signals(a);
      var unclear = (sigs.indexOf("sexual") >= 0 || sigs.indexOf("energy") >= 0 || sigs.indexOf("mood") >= 0 || sigs.indexOf("strength_loss") >= 0)
        && (a.fe_followup === "nein" || a.fe_followup === "unsure");
      lines.push("Vergangene Zeit allein ist kein Beleg dafür, dass sich dein System erholt hat.");
      if (unclear) lines.push("Bei dir treffen Symptome nach dem Absetzen und fehlende Nachkontrolle zusammen — der Rückkehr-Status ist damit offen, nicht negativ.");
      if (openGaps.length) lines.push("Offene Punkte: " + openGaps.join(", ") + ".");
      return {
        key: "former_enhanced", title: "RÜCKKEHR-STATUS",
        verdict: unclear ? "RÜCKKEHR-STATUS UNKLAR" : rb.label, band: unclear ? "review" : rb.key,
        value: rv == null ? null : rv, unclear: unclear, lines: lines
      };
    }
    if (st === "uncertain" || st === "unknown") {
      lines.push(st === "unknown"
        ? "Dieses Ergebnis stammt aus einer früheren Score-Version. Der Kontext wurde damals nicht erfasst und wird nicht nachträglich unterstellt."
        : "Du hast deinen Status offen gelassen — das ist völlig in Ordnung. Wir ordnen dich nicht zwangsweise ein und lesen dein Ergebnis entsprechend neutral.");
      lines.push("Sobald du deinen Kontext kennst, wird die Einordnung präziser — der Score funktioniert auch ohne.");
      return { key: st, title: "STATUS OFFEN", verdict: "NEUTRALE EINORDNUNG", band: "neutral", value: null, lines: lines };
    }
    /* natural */
    var sig = C.signals(a);
    var cluster = ["sexual", "energy", "training_stall", "strength_loss", "poor_recovery"].filter(function (s) { return sig.indexOf(s) >= 0; });
    lines.push("Natural heißt: dein System muss die Regeneration selbst leisten. Genau daran messen wir es.");
    if (cluster.length >= 2) {
      lines.push("Mehrere deiner Angaben (" + cluster.length + " Bereiche) zeigen dasselbe Muster. Das ist KEIN Hormonbefund — aber es rechtfertigt eine genauere ärztliche Abklärung, statt weiter zu raten.");
    } else {
      lines.push("Ein einzelner schwacher Bereich ist kein Alarmsignal — er ist dein nächster Hebel.");
    }
    return {
      key: "natural", title: "NATURAL PERFORMANCE CONTEXT",
      verdict: cluster.length >= 2 ? "HORMONELLER KONTEXT SOLLTE GEPRÜFT WERDEN" : "SYSTEM SELBSTREGULIERT",
      band: cluster.length >= 2 ? "gaps" : "good", value: null, clusterCount: cluster.length, lines: lines
    };
  };

  /* --------------------------------------------- PRIMARY BOTTLENECK V2 */
  /* Nicht "niedrigster Wert", sondern hoechste Kombination aus Schwere,
     Gesundheitsrelevanz, Umsetzbarkeit und Zielbezug — mit klaren
     Vorrangregeln fuer harte Kontrollprobleme. */

  C.LEGACY_DOMAIN_KEY = {
    bodyComposition: "body", training: "strength", movement: "strength",
    sleep: "recovery", recovery: "recovery", nutrition: "fuel",
    metabolic: "blood", cardiovascular: "blood", dataQuality: "blood",
    hormonal: "drive", energy: "drive", execution: "execution",
    enhancedControl: "blood", therapyControl: "blood", recoveryStatus: "drive"
  };

  C.bottleneckCopy = {
    bodyComposition: { name: "Körperkomposition", text: "Mehr Muskelaufbau ist möglich. Dein aktueller Engpass ist jedoch die Körperkomposition — sie entscheidet gerade über Stoffwechsel, Optik und Risiko gleichzeitig." },
    training:        { name: "Trainingsstruktur", text: "Du hast kein Motivationsproblem, dir fehlt planbare Progression: feste Tage, feste Muster, dokumentierte Steigerung." },
    movement:        { name: "Alltagsbewegung", text: "Dein Training ist nicht das Problem — der Rest deines Tages ist es. Drei Einheiten pro Woche kompensieren keine 13 Stunden Sitzen." },
    sleep:           { name: "Schlaf", text: "Schlaf ist bei dir der erste Hebel. Alles andere — Appetit, Erholung, Energie, Trainingsleistung — hängt daran." },
    recovery:        { name: "Erholung & Stress", text: "Du bekommst Reize, aber keine Erholung. Ohne Regeneration wird aus Belastung kein Fortschritt." },
    nutrition:       { name: "Ernährungssystem", text: "Du hast kein Trainingsproblem, sondern ein Ernährungssystem-Problem: Protein, Mengen und Wochenenden müssen messbar werden." },
    metabolic:       { name: "Stoffwechsel-Kontext", text: "Dein metabolischer Kontext ist der Engpass — er entscheidet langfristig mehr über Gesundheit und Körperbild als jedes Trainingsdetail." },
    cardiovascular:  { name: "Herz-Kreislauf-Kontrolle", text: "Deine Performance ist nicht der limitierende Faktor. Dein Herz-Kreislauf-Kontext ist es — und er verläuft lange ohne Symptome." },
    hormonal:        { name: "Hormonell-sexueller Kontext", text: "Deine Angaben rechtfertigen eine genauere Abklärung dieses Bereichs — keine Selbstdiagnose, sondern eine saubere Klärung." },
    energy:          { name: "Energie-Management", text: "Deine Energie ist der Engpass — und sie hängt fast immer an Schlaf, Bewegung, Ernährung und Stress." },
    dataQuality:     { name: "Datenlage & Monitoring", text: "Dein größter Hebel ist nicht mehr Training. Es ist die Qualität deiner Daten — du steuerst gerade ohne Instrumente." },
    execution:       { name: "Umsetzung", text: "Du weißt wahrscheinlich genug. Was fehlt, ist ein System, das deinen Alltag überlebt." },
    enhancedControl: { name: "Enhanced Control", text: "Deine Performance ist hoch. Deine Kontrolltiefe hält aktuell nicht Schritt — genau das ist dein Engpass, nicht dein Status." },
    therapyControl:  { name: "Therapie-Kontrolle", text: "Deine Therapie wirkt, aber sie ist aktuell nicht ausreichend gesteuert. Ansprechen ersetzt keine Verlaufskontrolle." },
    recoveryStatus:  { name: "Rückkehr-Status", text: "Nach dem Absetzen fehlt dir die Rückmeldung, ob dein System wirklich wieder trägt. Diese Lücke ist dein aktueller Engpass." }
  };

  C.primaryBottleneck = function (a, domains, gaps, flags) {
    a = a || {}; domains = domains || {}; gaps = gaps || C.dataGaps(a); flags = flags || C.redFlags(a);
    var st = C.statusOf(a);
    var sig = C.signals(a);
    var goals = arr(a.goal_main);
    var goalDomains = {};
    goals.forEach(function (g) { (C.goalDomainMap[g] || []).forEach(function (d) { goalDomains[d] = true; }); });
    (C.painDomainMap[a.goal_pain] || []).forEach(function (d) { goalDomains[d] = true; });

    var gapSeverityByDomain = {};
    gaps.forEach(function (g) { gapSeverityByDomain[g.domain] = (gapSeverityByDomain[g.domain] || 0) + g.severity; });

    var ranked = Object.keys(domains).map(function (d) {
      var meta = C.domainMeta[d] || { health: 1, action: 1, w: 8, name: d };
      var severity = (100 - domains[d]) / 100;
      var gapBoost = Math.min(0.35, (gapSeverityByDomain[d] || 0) * 0.06);
      var goalBoost = goalDomains[d] ? 0.25 : 0;
      var score = (severity + gapBoost) * meta.health * meta.action * (1 + goalBoost);
      return { domain: d, value: domains[d], score: score };
    }).sort(function (x, y) { return y.score - x.score; });

    /* Vorrangregeln — harte Kontrollprobleme schlagen den reinen Zahlenwert */
    var forced = null;
    if (sig.indexOf("bp_uncontrolled") >= 0 || a.cv_bp_control === "unbehandelt") forced = "cardiovascular";
    else if (sig.indexOf("apnea") >= 0) forced = "sleep";
    else if (st === "enhanced" && domains.enhancedControl != null && domains.enhancedControl < 55) forced = "enhancedControl";
    else if (st === "medical_trt" && domains.therapyControl != null && domains.therapyControl < 55) forced = "therapyControl";
    else if (st === "former_enhanced" && domains.recoveryStatus != null && domains.recoveryStatus < 55) forced = "recoveryStatus";
    else if (gaps.filter(function (g) { return g.severity >= 3; }).length >= 2) forced = "dataQuality";

    var primaryKey = forced && domains[forced] !== undefined ? forced : (ranked[0] ? ranked[0].domain : "execution");
    var copy = C.bottleneckCopy[primaryKey] || { name: primaryKey, text: "" };
    var secondary = ranked.filter(function (r) { return r.domain !== primaryKey; }).slice(0, 3).map(function (r) {
      return { domain: r.domain, name: (C.domainMeta[r.domain] || {}).name || r.domain, value: r.value };
    });

    return {
      domain: primaryKey,
      key: C.LEGACY_DOMAIN_KEY[primaryKey] || "execution",
      name: copy.name,
      text: copy.text,
      value: domains[primaryKey] != null ? domains[primaryKey] : null,
      forced: !!forced,
      secondary: secondary,
      ranked: ranked
    };
  };

  C.goalDomainMap = {
    bauchfett: ["bodyComposition", "nutrition"],
    muskeln: ["training", "nutrition"],
    kraft: ["training"],
    energie: ["sleep", "energy"],
    schlaf: ["sleep"],
    ernaehrung: ["nutrition"],
    blutwerte: ["dataQuality", "cardiovascular"],
    hormone: ["hormonal", "dataQuality"],
    disziplin: ["execution"],
    attraktiv: ["bodyComposition", "training"]
  };
  C.painDomainMap = {
    bauch: ["bodyComposition"], muskelmasse: ["training"], kraft: ["training"],
    muede: ["energy", "sleep"], schlaf: ["sleep"], libido: ["hormonal"],
    blutwerte: ["dataQuality", "cardiovascular"], gewicht: ["bodyComposition"],
    essen: ["nutrition"], struktur: ["execution"], neustart: ["execution"]
  };
})();

/* ==========================================================================
   SCORE V2 — HEALTH FIRST, DEEP LINKS, ERGEBNIS-PIPELINE
   ========================================================================== */
(function () {
  "use strict";
  var C = window.MM_CHECK;
  var arr = function (x) { return Array.isArray(x) ? x : []; };
  var num = function (x) { var n = parseFloat(x); return isFinite(n) ? n : 0; };

  /* ------------------------------------------------------- HEALTH FIRST */
  /* Bewusst konservativ und regelbasiert. Kein Urteil ueber den Menschen,
     sondern eine Reihenfolge-Aussage: erst klaeren/kontrollieren, dann
     Physique optimieren. Keine Diagnose, keine Therapieempfehlung. */

  C.SEVERE_FLAGS = ["brust", "ohnmacht", "atemnot", "blut", "gewichtsverlust", "blutdruck", "labor", "hormone"];

  C.healthFirstReason = function (a) {
    a = a || {};
    var st = C.statusOf(a);
    var flags = arr(a.redflags).filter(function (v) { return C.SEVERE_FLAGS.indexOf(v) >= 0; });
    var sig = C.signals(a);
    var gaps = C.dataGaps(a);
    var hasGap = function (id) { return gaps.some(function (g) { return g.id === id; }); };
    var reasons = [];

    if (flags.length) {
      reasons.push("Mindestens eine deiner Angaben gehört ärztlich abgeklärt, bevor ein Trainings- oder Ernährungsprogramm sinnvoll startet.");
    }
    if (a.cv_bp_control === "unbehandelt") {
      reasons.push("Ein bekannt erhöhter, aktuell unbehandelter Blutdruck hat Vorrang vor jedem Körperziel.");
    }
    if (sig.indexOf("apnea") >= 0 && (a.slp_daysleep === "oft" || a.slp_daysleep === "taeglich" || a.rec_snore === "aussetzer")) {
      reasons.push("Auffällige Schlafatmung zusammen mit Tagesmüdigkeit sollte geklärt werden — sie verändert Energie, Blutdruck und Körperkomposition gleichzeitig.");
    }
    if (st === "enhanced") {
      var enhCrit = ["hematocrit", "bp", "labs_none", "labs_old", "liver"].filter(hasGap).length;
      if (enhCrit >= 2) reasons.push("In deinem Kontext fehlen mehrere der wenigen Werte, die tatsächlich engmaschig kontrolliert gehören. Deine Kontrolltiefe hält deiner Performance aktuell nicht stand.");
    }
    if (st === "medical_trt" && hasGap("trt_labs") && (a.trt_supervision === "selbst" || a.trt_supervision === "keine")) {
      reasons.push("Eine laufende Hormontherapie ohne aktuelle Verlaufskontrolle und ohne ärztliche Begleitung ist nicht gesteuert — das kommt vor jedem Körperziel.");
    }
    if (st === "former_enhanced" && hasGap("former_followup")
        && (sig.indexOf("sexual") >= 0 || sig.indexOf("energy") >= 0 || sig.indexOf("strength_loss") >= 0 || sig.indexOf("mood") >= 0)) {
      reasons.push("Symptome nach dem Absetzen ohne jede Nachkontrolle lassen deinen Rückkehr-Status offen. Diese Klärung kommt zuerst.");
    }
    if ((a.met_glucose === "diabetes" || a.met_glucose === "prediabetes") && hasGap("bp") && (hasGap("labs_none") || hasGap("labs_old"))) {
      reasons.push("Bekannter Blutzucker-Kontext ohne aktuellen Blutdruck und ohne aktuelle Werte: dir fehlt gerade die Steuerung, nicht die Motivation.");
    }
    if (!reasons.length) return null;
    return {
      reason: "HEALTH FIRST: " + reasons[0] + " Das ist kein Urteil über dich — es ist eine Reihenfolge. Körperziele laufen danach auf sicherem Fundament weiter.",
      reasons: reasons,
      severeFlags: flags
    };
  };

  /* --------------------------------------------------------- DEEP LINKS */
  /* Nicht jeder Link fuer jeden. Genau der naechste sinnvolle Weg. */

  C.CHAPTERS = {
    training:   { label: "Training",           href: "ebooks/training-system.html" },
    body:       { label: "Körperkomposition",  href: "ebooks/fettabbau.html" },
    protein:    { label: "Protein & Ernährung", href: "ebooks/protein-system.html" },
    sleep:      { label: "Schlaf",             href: "ebooks/schlaf-energie.html" },
    sleepStack: { label: "Schlaf-Stack",       href: "ebooks/schlaf-stack.html" },
    blood:      { label: "Blutwerte",          href: "ebooks/blutwerte-guide.html" },
    hormones:   { label: "Hormone",            href: "ebooks/testosteron.html" },
    sexual:     { label: "Sexuelle Gesundheit", href: "ebooks/sexuelle-gesundheit.html" },
    glp1:       { label: "GLP-1",              href: "ebooks/glp1-agonisten.html" },
    stack:      { label: "Ultimate Stack",     href: "ebooks/ultimate-stack.html" },
    habits:     { label: "Umsetzung",          href: "ebooks/gewohnheiten.html" },
    daily:      { label: "Tägliche Bewegung",  href: "ebooks/taeglich-trainieren.html" }
  };

  C.DOMAIN_CHAPTER = {
    bodyComposition: "body", training: "training", movement: "daily", sleep: "sleep",
    recovery: "sleepStack", nutrition: "protein", metabolic: "blood", cardiovascular: "blood",
    hormonal: "hormones", energy: "sleep", dataQuality: "blood", execution: "habits",
    enhancedControl: "blood", therapyControl: "hormones", recoveryStatus: "hormones"
  };

  C.deepLinks = function (a, bottleneck, gaps) {
    a = a || {}; gaps = gaps || [];
    var st = C.statusOf(a);
    var out = [];
    var seen = {};
    function push(key, why) {
      var ch = C.CHAPTERS[key];
      if (!ch || seen[key]) return;
      seen[key] = true;
      out.push({ key: key, label: ch.label, href: ch.href, why: why });
    }
    /* 1) Der Engpass fuehrt */
    if (bottleneck && C.DOMAIN_CHAPTER[bottleneck.domain]) {
      push(C.DOMAIN_CHAPTER[bottleneck.domain], "Erklärt, warum " + bottleneck.name + " gerade dein Fortschritt bestimmt.");
    }
    /* 2) Kontextspezifisch */
    if (st === "enhanced" || st === "medical_trt" || st === "former_enhanced") {
      push("blood", "Die wenigen Werte, die in deinem Kontext wirklich kontrolliert gehören.");
    }
    if (C.sexualConcern(a)) push("sexual", "Ordnet Libido und Erektion ein, ohne daraus eine Diagnose zu machen.");
    if (C.usesGlp1(a)) push("glp1", "Was unter GLP-1 über Muskelerhalt und Proteinzufuhr entscheidet.");
    if (gaps.some(function (g) { return g.id === "steps" || g.id === "sitting"; })) push("daily", "Warum der Rest des Tages mehr wiegt als das Workout.");
    return out.slice(0, 3);
  };

  /* Konkreter naechster Produktweg (Score findet, Protokoll erklaert,
     Programm fuehrt, Tracker misst). */
  C.nextPath = function (ctx) {
    ctx = ctx || {};
    if (ctx.healthFirst) {
      return { key: "medical", label: "Zuerst ärztlich klären", href: null,
        note: "Danach läuft alles Weitere auf einem Fundament, dem du trauen kannst." };
    }
    if (ctx.bigDataGaps) {
      return { key: "measure", label: "Blutwerte & Blutdruck erfassen", href: "blutwerte.html",
        note: "Dein Score steigt nicht durch mehr Aufwand, sondern durch bessere Daten." };
    }
    return C.nextStep(ctx);
  };

  /* ------------------------------------------------------------ PIPELINE */
  /* EINE Quelle der Wahrheit fuer Dashboard, Report und Programm. */

  C.evaluate = function (a) {
    a = a || {};
    var st = C.statusOf(a);
    var ds = C.domainScores(a);
    var domains = ds.domains;
    var gaps = C.dataGaps(a);
    var flags = C.redFlags(a);
    var signals = C.signals(a);
    var total = C.totalFrom(domains);
    var legacy = C.legacyScores(domains);
    var bottleneck = C.primaryBottleneck(a, domains, gaps, flags);
    var confidence = C.assessmentConfidence(a, gaps, flags);
    var panel = C.contextPanel(a, domains, gaps);
    var dec = C.goalDecision(a);
    var links = C.deepLinks(a, bottleneck, gaps);
    return {
      version: 2,
      status: st,
      statusLabel: (C.statusLabels[st] || C.statusLabels.unknown).short,
      domains: domains,
      domainCoverage: ds.coverage,
      modifiers: ds.modifiers,
      total: total,
      scores: legacy,
      dataGaps: gaps,
      signals: signals,
      flags: flags,
      confidence: confidence,
      contextPanel: panel,
      primaryBottleneck: bottleneck,
      secondaryPriorities: bottleneck.secondary,
      goalRecommendation: {
        mode: dec.mode,
        trainingMode: dec.trainingMode || dec.mode,
        label: (C.modeLabels[dec.mode] || {}).label || String(dec.mode).toUpperCase(),
        desc: (C.modeLabels[dec.mode] || {}).desc || "",
        reason: dec.reason,
        bodyReason: dec.bodyReason || dec.reason
      },
      deepLinks: links
    };
  };

  /* Reihenfolge-Block "DEINE REIHENFOLGE" auf der Ergebnisseite. */
  C.orderOfOperations = function (ev) {
    var steps = [];
    var crit = (ev.dataGaps || []).filter(function (g) { return g.severity >= 3; });
    if (ev.flags && ev.flags.length) {
      steps.push({ t: "KLÄREN", d: "Die markierten Punkte ärztlich einordnen lassen. Alles Weitere läuft danach auf sicherem Fundament." });
    }
    steps.push({
      t: "MESSEN",
      d: crit.length
        ? "Diese Lücken zuerst schließen: " + crit.slice(0, 2).map(function (g) { return g.label; }).join(" · ") + "."
        : "Baseline sichern: Bauchumfang, Blutdruck, Gewichtstrend — gleiche Bedingungen, gleicher Tag."
    });
    steps.push({
      t: "ENGPASS LÖSEN",
      d: ev.primaryBottleneck.name + " ist dein Hebel Nummer eins. Nicht alles gleichzeitig — das hier zuerst."
    });
    steps.push({
      t: "TRAINING & ERNÄHRUNG AUSRICHTEN",
      d: "Richtung " + (ev.goalRecommendation.trainingMode || "").toUpperCase() + ": " +
         ((C.modeLabels[ev.goalRecommendation.trainingMode] || {}).desc || "") + "."
    });
    steps.push({ t: "NEU BEWERTEN", d: "In 4–6 Wochen erneut messen. Was sich nicht messen lässt, lässt sich nicht steuern." });
    return steps;
  };
})();
