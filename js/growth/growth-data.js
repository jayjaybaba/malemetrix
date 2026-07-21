/* ==========================================================================
   MaleMetrix Growth OS — Stammdaten & Konfiguration
   --------------------------------------------------------------------------
   Enthält KEINE Secrets und KEINE Nutzerdaten. Alle Nutzerdaten liegen
   ausschließlich lokal im Browser (localStorage, Prefix mm_gos_*).
   Gewichte, Regeln und Definitionen sind bewusst Daten statt Code,
   damit sie ohne Logik-Änderung angepasst werden können (§93/§94).
   ========================================================================== */

window.GOS_DATA = (function () {
  "use strict";

  /* ---------- Themen-Bereiche (Topic Authority, §16) ---------- */
  var TOPICS = [
    "Testosteron/Hormone", "Blutwerte", "Körperkomposition", "Fettverlust",
    "Muskelaufbau", "Training", "Schlaf", "Energie", "GLP-1", "Supplements",
    "Sexuelle Gesundheit", "Longevity", "Stoffwechsel", "Herz-Kreislauf",
    "Mentale Performance", "Männergesundheit allgemein"
  ];

  /* ---------- Formate ---------- */
  var FORMATS = [
    "Talking Head", "Talking Head + Grafiken", "B-Roll + Voiceover",
    "Study Breakdown", "Mythos-Check", "Listen-Video", "Antwort auf Kommentar",
    "Storytelling", "News-Reaktion", "Tutorial/How-to"
  ];

  /* ---------- Content-Klassen / Monetization Router (§36) ---------- */
  var CONTENT_CLASSES = {
    reward:    { label: "Reward Content",           note: "Kandidat für Creator Rewards — nicht sponsern, nicht promoten." },
    sponsored: { label: "Sponsored Content",        note: "⚠️ Nicht als Creator-Rewards-Kandidat behandeln. Werbekennzeichnung Pflicht." },
    affiliate: { label: "Affiliate Content",        note: "Kennzeichnung Pflicht. Reward-Eignung prüfen (kommerzieller Inhalt)." },
    product:   { label: "Product Conversion",       note: "Ziel: Score/Ebook/Coaching. Follower- und Business-Wert vor Reward." },
    brand:     { label: "Brand / Authority",        note: "Ziel: Positionierung + Follower. Reward zweitrangig." }
  };

  /* ---------- Pipeline-Status (§48) ---------- */
  var STATUSES = [
    "IDEA", "RESEARCH", "SCRIPT", "READY TO FILM", "FILMED",
    "EDITING", "READY", "PUBLISHED", "ANALYZING", "WINNER", "ARCHIVED"
  ];
  var STATUS_ACTIVE = STATUSES.slice(0, 7); // vor Veröffentlichung

  /* ---------- Hook-Typen (§21) mit MaleMetrix-Beispielen ---------- */
  var HOOK_TYPES = [
    { key: "contrarian", label: "Contrarian",
      desc: "Widerspricht einer verbreiteten Annahme.",
      example: "Dein Testosteron kann laut Labor völlig normal sein — und trotzdem liegt genau hier dein Problem." },
    { key: "curiosity", label: "Curiosity Gap",
      desc: "Öffnet eine Informationslücke, die das Video schließt.",
      example: "Es gibt einen Blutwert, den fast kein Hausarzt misst — und der erklärt bei vielen Männern die Dauermüdigkeit." },
    { key: "problem", label: "Problem Recognition",
      desc: "Der Zuschauer erkennt sein eigenes Problem in Sekunde 1.",
      example: "Du schläfst 7 Stunden und bist trotzdem den ganzen Tag müde? Dann prüf diese drei Werte." },
    { key: "number", label: "Number Hook",
      desc: "Konkrete Zahl als sofortiges Versprechen.",
      example: "5 Blutwerte, die jeder Mann ab 30 kennen muss — Nummer 4 wird fast nie gemessen." },
    { key: "myth", label: "Myth Busting",
      desc: "Zerlegt einen verbreiteten Mythos mit Evidenz.",
      example: "Nein — Eier erhöhen nicht dein Herzinfarktrisiko. Die Studienlage sagt etwas anderes." },
    { key: "authority", label: "Authority Hook",
      desc: "Positioniert Fachwissen/Erfahrung als Einstieg.",
      example: "Ich habe über 200 Blutbilder von Männern gesehen — dieser Fehler taucht in fast jedem auf." },
    { key: "personal", label: "Personal Relevance",
      desc: "Direkte Ansprache einer konkreten Zielgruppe.",
      example: "Wenn du über 35 bist und trainierst, aber der Bauch bleibt: Das hier ist wahrscheinlich der Grund." },
    { key: "fear", label: "Fear (ohne Panikmache)",
      desc: "Reales Risiko sachlich benennen — kein Alarmismus.",
      example: "Ein dauerhaft erhöhter Nüchternblutzucker tut nicht weh — genau das macht ihn gefährlich." },
    { key: "transformation", label: "Transformation",
      desc: "Vorher/Nachher als messbare Veränderung.",
      example: "In 12 Wochen von 34 auf 29 % Körperfett — ohne Crash-Diät. Das war der Plan dahinter." },
    { key: "science", label: "Unexpected Science",
      desc: "Überraschender, belegbarer Mechanismus.",
      example: "Eine Nacht mit 5 Stunden Schlaf kann dein Testosteron messbar senken — hier ist der Mechanismus." }
  ];

  /* ---------- Hook-Selbstcheck (First-5-Seconds, §12/§21) ---------- */
  var HOOK_CHECKS = [
    { key: "why_stay",   label: "Sekunde 0–1: Sofort klar, warum man bleiben soll", weight: 2 },
    { key: "no_greet",   label: "Keine Begrüßung / kein Intro / kein „Hallo Leute“", weight: 2 },
    { key: "concrete",   label: "Konkretes Versprechen oder konkrete Zahl", weight: 1.5 },
    { key: "gap",        label: "Offene Informationslücke (wird im Video eingelöst)", weight: 1.5 },
    { key: "target",     label: "Zielgruppe erkennt sich (Mann 30–50, DACH)", weight: 1 },
    { key: "credible",   label: "Glaubwürdig — kein Clickbait, keine falsche Behauptung", weight: 2 }
  ];

  /* ---------- Score-Faktoren (§9) — 0–10 Selbsteinschätzung ---------- */
  var FACTORS = {
    viral: [
      { key: "hook",       label: "Hook-Stärke", hint: "Stoppt der Einstieg den Daumen?" },
      { key: "curiosity",  label: "Neugier / Informationslücke" },
      { key: "emotion",    label: "Emotionale Relevanz / Problemdruck" },
      { key: "surprise",   label: "Überraschung / neue Erkenntnis" },
      { key: "share",      label: "Share-Potenzial", hint: "Schickt man das einem Kumpel?" },
      { key: "comment",    label: "Kommentar-Potenzial", hint: "Provoziert es Fragen/Widerspruch?" },
      { key: "momentum",   label: "Aktualität / Trend-Momentum" },
      { key: "breadth",    label: "Zielgruppenbreite" }
    ],
    growth: [
      { key: "fit",        label: "MaleMetrix-Zielgruppenfit", hint: "Männer 30–50, DACH, Gesundheit/Performance" },
      { key: "pressure",   label: "Problemdruck der Zielgruppe" },
      { key: "authority",  label: "Expertenpositionierung", hint: "Zeigt es echte Tiefe?" },
      { key: "series",     label: "Serienpotenzial", hint: "Gibt es logische Folge-Videos?" },
      { key: "cta",        label: "Thematischer Follow-Grund", hint: "„Nächstes Video: SHBG“ statt „Folge mir“" }
    ],
    reward: [
      { key: "length",     label: "Trägt das Thema >60 Sekunden echten Wert?" },
      { key: "original",   label: "Originalität / eigene Produktion" },
      { key: "watchtime",  label: "Erwartete Watchtime/Completion" },
      { key: "search",     label: "Search-Wert", hint: "Wird danach aktiv gesucht?" },
      { key: "special",    label: "Spezialisierung / Themenfokus" },
      { key: "production", label: "Produktionsqualität (Licht, Ton, Schnitt)" }
    ]
  };

  /* ---------- Gewichtungs-Presets (§10) — versioniert ---------- */
  var WEIGHT_PRESETS = {
    balanced:  { label: "BALANCED",           w: { viral: 30, growth: 30, reward: 30, brand: 10 } },
    maxgrowth: { label: "MAX GROWTH",         w: { viral: 20, growth: 55, reward: 15, brand: 10 } },
    maxreward: { label: "MAX REWARD",         w: { viral: 15, growth: 15, reward: 60, brand: 10 } },
    maxviral:  { label: "MAX VIRALITY",       w: { viral: 60, growth: 20, reward: 15, brand: 5 } },
    authority: { label: "AUTHORITY BUILDING", w: { viral: 10, growth: 35, reward: 15, brand: 40 } }
  };
  var WEIGHTS_VERSION = 1;

  /* ---------- Script-Modi mit Retention Map (§13/§23) ---------- */
  var SCRIPT_MODES = [
    { key: "reward", label: "60–90 s Reward", blocks: [
      { t: "0–3 s",   label: "Hook", hint: "Kein Intro. Direkt das Versprechen / die Lücke." },
      { t: "3–8 s",   label: "Problem verstärken", hint: "Warum betrifft das den Zuschauer konkret?" },
      { t: "8–15 s",  label: "Erste überraschende Information", hint: "Der „Wow“-Moment früh setzen." },
      { t: "15–25 s", label: "Begründung / Mechanismus", hint: "Warum ist das so? Kurz, konkret." },
      { t: "25–35 s", label: "Pattern Interrupt", hint: "Kamerawechsel, Grafik, These, Gegenfrage." },
      { t: "35–50 s", label: "Konkrete Lösung", hint: "Was genau tun? Messbar, umsetzbar." },
      { t: "50–65 s", label: "Zweite Erkenntnis", hint: "Bonus-Insight, der Watchtime belohnt." },
      { t: "65–80 s", label: "Zusammenfassung + thematischer CTA", hint: "Follow-Grund nennen, kein generisches „Folge mir“." }
    ]},
    { key: "deepdive", label: "90–180 s Deep Dive", blocks: [
      { t: "0–5 s",    label: "Hook + Roadmap", hint: "Versprechen + „3 Dinge in diesem Video“." },
      { t: "5–20 s",   label: "Kontext / Problem", hint: "" },
      { t: "20–60 s",  label: "Kernteil 1 (Mechanismus)", hint: "Mit Grafik/Einblendung." },
      { t: "60–100 s", label: "Kernteil 2 (Messung/Werte)", hint: "Konkrete Zahlen, Referenzbereiche." },
      { t: "100–140 s",label: "Kernteil 3 (Intervention)", hint: "Was tun — priorisiert." },
      { t: "140–170 s",label: "Zusammenfassung + CTA", hint: "" }
    ]},
    { key: "growthvid", label: "Growth Video (kurz, breit)", blocks: [
      { t: "0–3 s",  label: "Hook (breite Zielgruppe)", hint: "" },
      { t: "3–20 s", label: "Kernaussage mit Beleg", hint: "" },
      { t: "20–35 s",label: "Konkreter Takeaway", hint: "" },
      { t: "35–45 s",label: "Thematischer Follow-CTA", hint: "" }
    ]},
    { key: "myth", label: "Myth Busting", blocks: [
      { t: "0–3 s",  label: "Mythos nennen", hint: "„Nein — X stimmt so nicht.“" },
      { t: "3–15 s", label: "Warum der Mythos plausibel wirkt", hint: "" },
      { t: "15–40 s",label: "Was die Evidenz zeigt", hint: "Quelle nennen (Tier A/B bevorzugt)." },
      { t: "40–60 s",label: "Was stattdessen gilt + CTA", hint: "" }
    ]},
    { key: "search", label: "Search Answer", blocks: [
      { t: "0–3 s",  label: "Suchfrage als Hook umformuliert", hint: "Nicht SEO-Sprech — Spannung. §35." },
      { t: "3–30 s", label: "Direkte Antwort", hint: "Keyword natürlich einbauen." },
      { t: "30–60 s",label: "Kontext + häufiger Fehler", hint: "" },
      { t: "60–75 s",label: "Nächster Schritt + CTA", hint: "" }
    ]},
    { key: "comment", label: "Comment Reply", blocks: [
      { t: "0–3 s",  label: "Kommentar einblenden + anteasern", hint: "" },
      { t: "3–30 s", label: "Fundierte Antwort", hint: "" },
      { t: "30–50 s",label: "Verallgemeinern + CTA", hint: "„Mehr solcher Fragen? Kommentiere.“" }
    ]},
    { key: "study", label: "Study Breakdown", blocks: [
      { t: "0–5 s",   label: "Ergebnis als Hook", hint: "„Neue Studie: X verändert Y um Z %“ — nur wenn korrekt." },
      { t: "5–25 s",  label: "Was wurde untersucht (Population, Design)", hint: "Evidenz-Tier ehrlich nennen." },
      { t: "25–50 s", label: "Was es bedeutet — und was nicht", hint: "Limitierungen!" },
      { t: "50–70 s", label: "Praktische Einordnung + CTA", hint: "" }
    ]},
    { key: "story", label: "Storytelling", blocks: [
      { t: "0–5 s",  label: "Mitten in der Geschichte starten", hint: "" },
      { t: "5–30 s", label: "Konflikt / Problem", hint: "" },
      { t: "30–55 s",label: "Wendepunkt + Messwerte", hint: "MaleMetrix-DNA: messbar machen." },
      { t: "55–75 s",label: "Ergebnis + Learning + CTA", hint: "" }
    ]}
  ];

  /* ---------- Visual-Anweisungen (§24) je Blockposition ---------- */
  var VISUAL_HINTS = [
    "Close-up + On-Screen-Text (Kernaussage)",
    "Kamerawechsel (Winkel/Distanz)",
    "Grafische Einblendung (Wert/Diagramm)",
    "B-Roll (Gym/Setting)",
    "Diagramm/Chart einblenden",
    "Zurück zur Kamera, ruhiger Abschluss"
  ];

  /* ---------- Pre-Publish-Check (§58) ---------- */
  var PREPUBLISH = [
    { key: "original",  label: "Original? Eigene Produktion, kein Repost/Duet/Stitch", critical: true, dim: "eligibility" },
    { key: "length",    label: "Mindestdauer erreicht (Regel R1 unten)", critical: true, dim: "eligibility" },
    { key: "ads",       label: "Keine ungeklärte Werbung / Sponsoring korrekt gekennzeichnet", critical: true, dim: "compliance" },
    { key: "res",       label: "1080p oder besser, scharf, gutes Licht", critical: false, dim: "quality" },
    { key: "audio",     label: "Audio sauber (kein Rauschen, klare Stimme)", critical: false, dim: "quality" },
    { key: "hook5s",    label: "5-Sekunden-Hook stark (Hook-Check ≥ 70)", critical: false, dim: "quality" },
    { key: "search",    label: "Search-Intent vorhanden (Suchbegriff hinterlegt)", critical: false, dim: "quality" },
    { key: "science",   label: "Wissenschaftlich sauber (Risiko-Check nicht HIGH, Quellen notiert)", critical: true, dim: "compliance" },
    { key: "guidelines",label: "TikTok Community Guidelines eingehalten (keine Heilversprechen/Fehlinfo)", critical: true, dim: "compliance" },
    { key: "music",     label: "Musik/Copyright geklärt (kommerzielle Bibliothek bzw. eigene Audio)", critical: true, dim: "eligibility" }
  ];

  /* ---------- platform_rules (§94) — Werte MIT Quelle & Verifikationsdatum.
       WICHTIG: Diese Startwerte sind NICHT von uns verifiziert (verified:null).
       Ural prüft sie im TikTok-Studio / in der offiziellen Doku und trägt das
       Datum in den Einstellungen ein. Das System warnt bei fehlender/alter
       Verifikation (§95). ---------- */
  var DEFAULT_RULES = [
    { id: "r_minlen",   name: "R1 · Reward-Mindestlänge", value: "> 1 Minute",
      source: "TikTok Creator Rewards Program (offizielle Bedingungen im TikTok Studio prüfen)", verified: null,
      note: "Nur Videos über der Mindestlänge sind Reward-fähig." },
    { id: "r_qualview", name: "R2 · Qualified View", value: "Mindest-Watchtime pro View (Schwelle im TikTok Studio prüfen)",
      source: "TikTok Creator Rewards Program", verified: null,
      note: "Sehr kurze Views zählen nicht als qualifizierte Views." },
    { id: "r_original", name: "R3 · Originalität", value: "Eigener, origineller Content; keine Reposts/Duette/Stitches",
      source: "TikTok Creator Rewards Program", verified: null, note: "" },
    { id: "r_sponsored",name: "R4 · Werbung/Promote", value: "Gesponserte & promotete Views sind keine Reward-Views",
      source: "TikTok Creator Rewards / Werberichtlinien", verified: null,
      note: "Sponsored Content getrennt behandeln (§65)." },
    { id: "r_eligible", name: "R5 · Programm-Voraussetzungen", value: "Follower-/Views-Mindestwerte & Landesverfügbarkeit (im TikTok Studio prüfen)",
      source: "TikTok Creator Rewards Program", verified: null, note: "" },
    { id: "r_api_audit",name: "R6 · Content Posting API", value: "Unauditierte Apps posten nur PRIVAT; öffentlich erst nach TikTok-Audit",
      source: "developers.tiktok.com/doc/content-posting-api-get-started (geprüft 2026-07-20)", verified: "2026-07-20",
      note: "Deshalb ist Draft/Direct-Post bis zum Audit als EXTERNE FREIGABE markiert." },
    { id: "r_token",    name: "R7 · API-Token-Laufzeiten", value: "Access Token 24 h, Refresh Token 365 Tage",
      source: "developers.tiktok.com/doc/oauth-user-access-token-management (geprüft 2026-07-20)", verified: "2026-07-20", note: "" }
  ];
  var RULE_MAX_AGE_DAYS = 90;

  /* ---------- Daily Missions (§39) — manuelle Checkliste, keine Automatisierung ---------- */
  var MISSIONS = [
    { key: "m_produce", label: "1 Video aus den Top-Opportunities produzieren" },
    { key: "m_trend",   label: "1 Trend/Breakout prüfen und als Idee oder Search-Chance erfassen" },
    { key: "m_watch",   label: "5 relevante Videos der Nische ansehen (Was fehlt? Welche Frage bleibt offen?)" },
    { key: "m_comment", label: "5 fachlich wertvolle Kommentare schreiben (manuell, kein Spam)" },
    { key: "m_reply",   label: "3 Kommentare eigener Zuschauer beantworten" },
    { key: "m_replyvid",label: "1 Zuschauer-Frage als Antwortvideo-Idee erfassen" },
    { key: "m_search",  label: "Creator Search Insights prüfen und neue Suchbegriffe importieren" }
  ];

  /* ---------- Winner-Ableitungen (§29) ---------- */
  var WINNER_ANGLES = [
    "Deep Dive: das Kernthema in 2–3 Minuten vertiefen",
    "Gegenfrage: die häufigste Kommentar-Frage beantworten",
    "Mythos: den größten Irrtum zum Thema zerlegen",
    "Teil 2: die nächste logische Ebene",
    "FAQ: die 3 häufigsten Fragen in einem Video",
    "Fehler: „Die 3 häufigsten Fehler bei …“",
    "„Was niemand sagt über …“",
    "Untergruppe: dasselbe Thema für eine spezifische Gruppe (z. B. Männer 40+)",
    "Neues Suchkeyword: dieselbe Autorität auf eine Nachbar-Suche richten"
  ];

  /* ---------- Level-Definition (§77) ---------- */
  var LEVELS = [
    { n: 0, label: "Manual Mode", desc: "Alle Daten per Studio-/CSV-Import oder Eingabe. Voll nutzbar.", state: "LIVE" },
    { n: 1, label: "TikTok Profile Connected", desc: "OAuth über eigenen Worker; Profil & Stats per API.", state: "KONFIGURATION ERFORDERLICH" },
    { n: 2, label: "Video Analytics", desc: "Eigene Videoliste + Metadaten per Display API.", state: "KONFIGURATION ERFORDERLICH" },
    { n: 3, label: "Draft Upload", desc: "Video als Entwurf an TikTok senden (Content Posting API).", state: "EXTERNE FREIGABE ERFORDERLICH (TikTok-Audit)" },
    { n: 4, label: "Direct Post", desc: "Direkt veröffentlichen.", state: "EXTERNE FREIGABE ERFORDERLICH (TikTok-Audit)" }
  ];

  var MIN_N = 3;      // Mindest-Stichprobe für Aggregat-Aussagen (§84)
  var MIN_N_TIME = 5; // für Posting-Zeit-Aussagen (§47)

  return {
    TOPICS: TOPICS, FORMATS: FORMATS, CONTENT_CLASSES: CONTENT_CLASSES,
    STATUSES: STATUSES, STATUS_ACTIVE: STATUS_ACTIVE,
    HOOK_TYPES: HOOK_TYPES, HOOK_CHECKS: HOOK_CHECKS,
    FACTORS: FACTORS, WEIGHT_PRESETS: WEIGHT_PRESETS, WEIGHTS_VERSION: WEIGHTS_VERSION,
    SCRIPT_MODES: SCRIPT_MODES, VISUAL_HINTS: VISUAL_HINTS,
    PREPUBLISH: PREPUBLISH, DEFAULT_RULES: DEFAULT_RULES, RULE_MAX_AGE_DAYS: RULE_MAX_AGE_DAYS,
    MISSIONS: MISSIONS, WINNER_ANGLES: WINNER_ANGLES, LEVELS: LEVELS,
    MIN_N: MIN_N, MIN_N_TIME: MIN_N_TIME
  };
})();
