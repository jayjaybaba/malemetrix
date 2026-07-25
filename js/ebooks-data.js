/* ==========================================================================
   MaleMetrix — Ebook-Liste (zentrale Datenquelle)
   --------------------------------------------------------------------------
   NEUES EBOOK HINZUFÜGEN — so einfach geht's, ohne Seitencode anzufassen:

   1. Erstelle dein Ebook als PDF (z. B. mit Canva, Word → "Als PDF speichern").
   2. Lege die PDF-Datei in den Ordner  ebooks/files/  ab,
      z. B.  ebooks/files/mein-neues-ebook.pdf
   3. Kopiere unten einen { ... }-Block und füge ihn in die Liste ein
      (das oberste Ebook wird als großes Flaggschiff oben angezeigt).
   4. Felder anpassen — fertig. Die Bibliothek aktualisiert sich von selbst.

   Felder:
   - id        : eindeutiger Kurzname (nur Buchstaben/Zahlen/Bindestrich)
   - featured  : true = großes Flaggschiff oben (nur EINS sollte true sein)
   - kicker    : kleine Kategorie über dem Titel
   - cover     : Farbverlauf der Cover-Kachel (CSS linear-gradient)
   - badge     : optionales Abzeichen (oder weglassen / null)
   - title     : Titel  { de: "...", en: "..." }
   - desc      : Kurzbeschreibung  { de: "...", en: "..." }
   - minutes   : geschätzte Lesezeit (Zahl)
   - read      : Pfad zur Datei. Entweder eine PDF (ebooks/files/xyz.pdf)
                 ODER eine HTML-Leseseite (ebooks/xyz.html).
   - gated     : true  = E-Mail nötig, um es zu öffnen (gut für reine PDFs)
                 false = frei lesbar (z. B. HTML-Seiten; deren PDF-Button
                         fragt die E-Mail separat ab)

   Tipp: en weglassen ist ok — dann wird der deutsche Text auch im
   Englisch-Modus angezeigt.
   ========================================================================== */

window.MM_EBOOKS = [

  {
    id: "start-here",
    kicker: { de: "MaleMetrix · DAS PROTOKOLL", en: "MaleMetrix · THE PROTOCOL" },
    cover: "linear-gradient(150deg,#062033,#05070b)",
    badge: { de: "Neu · Start", en: "New · Start" },
    title: { de: "Start here — wie das System funktioniert", en: "Start here — how the system works" },
    desc: { de: "Das Betriebssystem in fünf Minuten: Optimiere zuerst das System, bevor du ein Signal von außen ersetzt. Messen, verstehen, priorisieren, umsetzen, neu bewerten — plus die Ein-Engpass-Regel und wie Score, Protokoll, Programm und Tracker zusammenpassen.",
            en: "The operating system in five minutes: optimise the system before you replace a signal from outside. Measure, understand, prioritise, act, reassess — plus the one-bottleneck rule and how Score, Protocol, Program and Tracker fit together." },
    minutes: 5,
    read: "ebooks/00-start-here.html",
    gated: true
  },
  {
    id: "injektionen",
    kicker: { de: "MaleMetrix · Aufklärung", en: "MaleMetrix · Education" },
    cover: "linear-gradient(150deg,#0a1e34,#05070b)",
    badge: { de: "Neu · Aufklärung", en: "New · Education" },
    title: { de: "Injektionen verstehen — Angst raus, Präzision rein", en: "Understanding injections — fear out, precision in" },
    desc: { de: "Was subkutan und intramuskulär bedeuten, warum es keine Universalnadel gibt und wie Route, Gauge und Länge medizinisch gewählt werden. Sachliche Aufklärung, damit du auf Augenhöhe mit deinem Arzt sprichst — keine Dosierungen, keine Selbstanwendungsanleitung.",
            en: "What subcutaneous and intramuscular mean, why there is no universal needle and how route, gauge and length are chosen medically. Factual education so you can talk to your doctor on eye level — no doses, no self-administration guide." },
    minutes: 9,
    read: "ebooks/11-injektionen.html",
    gated: true
  },
  {
    id: "longevity-risk",
    kicker: { de: "MaleMetrix · Longevity", en: "MaleMetrix · Longevity" },
    cover: "linear-gradient(150deg,#08283a,#05070b)",
    badge: { de: "Neu · Longevity", en: "New · Longevity" },
    title: { de: "Longevity & Risk — Risiken früh erkennen", en: "Longevity & Risk — spot risk early" },
    desc: { de: "Longevity ehrlich: nicht NAD-Hype, sondern Risiken früh erkennen. Blutdruck, ApoB & Lipide, Glukose, VO₂max und Vorsorge als System — miss, was Entscheidungen verändert, und geh vorbereitet zum Arzt. Ohne erfundene Grenzwerte.",
            en: "Longevity honestly: not NAD hype but spotting risk early. Blood pressure, ApoB & lipids, glucose, VO₂max and screening as a system — measure what changes decisions and go prepared to your doctor. No made-up cutoffs." },
    minutes: 11,
    read: "ebooks/12-longevity-risk.html",
    gated: true
  },
  {
    id: "glp1-agonisten",
    kicker: { de: "MaleMetrix · Aufklärung", en: "MaleMetrix · Education" },
    cover: "linear-gradient(150deg,#0a2440,#0c1320)",
    img: "ebooks/img/glp1/01-titel.jpg",
    badge: { de: "Neu · Aufklärung", en: "New · Education" },
    title: { de: "GLP-1-Agonisten verstehen", en: "Understanding GLP-1 Agonists" },
    desc: { de: "Ozempic, Tirzepatid & Retatrutid sachlich erklärt: Wie diese Wirkstoffe wirken, was die Studien zeigen, welche Risiken (Stichwort Muskelverlust) es gibt und warum sie kein Ersatz für Training, Ernährung und Schlaf sind — ohne Hype, ohne Empfehlung.",
            en: "Ozempic, tirzepatide & retatrutide explained factually: how they work, what the studies show, the risks (muscle loss) and why they don't replace training, nutrition and sleep — no hype, no recommendation." },
    minutes: 15,
    read: "ebooks/glp1-agonisten.html",
    gated: true
  },
  {
    id: "ultimate-stack",
    kicker: { de: "MaleMetrix · High-End", en: "MaleMetrix · High-End" },
    cover: "linear-gradient(150deg,#0a1424,#05070b)",
    img: "ebooks/img/ultimate-stack/cover.jpg",
    badge: { de: "Premium · Zugangscode", en: "Premium · Access code" },
    title: { de: "Der Ultimate Stack", en: "The Ultimate Stack" },
    desc: { de: "Das evidenzbasierte High-End-Framework für Körperkomposition, Hormone, metabolische Kontrolle und Performance — ärztlich geführt und ehrlich eingeordnet. Alle besprochenen Wirkstoffe sind verschreibungspflichtig und gehören in ärztliche Hände. Privater Leitfaden, nur mit Zugangscode.",
            en: "The evidence-based high-end framework for body composition, hormones, metabolic control and performance — physician-led and honestly framed. Every substance discussed is prescription-only and belongs in a doctor's hands. Private guide, access code required." },
    minutes: 19,
    read: "ebooks/ultimate-stack.html",
    gated: true
  },

  {
    id: "master-ebook",
    hidden: true,   // in Überarbeitung — vorerst nicht öffentlich in der Bibliothek zeigen (Datei bleibt erhalten)
    kicker: { de: "MaleMetrix · Master-Kompendium", en: "MaleMetrix · Master Compendium" },
    cover: "linear-gradient(150deg,#1a2c52,#0a1020)",
    badge: { de: "Master · Premium-Zugang", en: "Master · Premium access" },
    title: { de: "Das Kompendium — alles vereint", en: "The Compendium — everything united" },
    desc: { de: "Das große Master-Ebook: das gesamte MaleMetrix-Wissen in einem Buch (21 Kapitel). Training, Ernährung, Schlaf, Supplemente, Blutwerte, Testosteron und sexuelle Gesundheit — plus die ehrliche Red Zone: GLP-1, PDE-5, TRT/Steroide, Peptide und der ärztlich geführte Ultimate Stack. Öffnen mit deinem Premium-Zugangscode (Master, Protokoll oder Stack).",
            en: "The big master ebook: all MaleMetrix knowledge in one book (21 chapters). Training, nutrition, sleep, supplements, blood values, testosterone and sexual health — plus the honest Red Zone: GLP-1, PDE-5, TRT, peptides and the doctor-led Ultimate Stack. Open with your premium access code (Master, Protokoll or Stack)." },
    minutes: 60,
    read: "ebooks/master-ebook.html",
    gated: true
  },

  {
    id: "masterguide",
    hidden: true,
    kicker: { de: "MaleMetrix · Flaggschiff-Guide", en: "MaleMetrix · Flagship Guide" },
    cover: "linear-gradient(150deg,#1a2c52,#0a1020)",
    badge: { de: "Komplettes System · 11 Kapitel", en: "Complete system · 11 chapters" },
    title: { de: "Der MaleMetrix Masterguide", en: "The MaleMetrix Masterguide" },
    desc: { de: "Das große Flaggschiff: Training, Ernährung, Regeneration, Tracking und Blutwerte-Verständnis als ein zusammenhängendes System — mit komplettem 12-Wochen-Fahrplan.",
            en: "The flagship guide: training, nutrition, recovery, tracking and understanding blood values as one connected system — with a full 12-week roadmap." },
    minutes: 18,
    read: "ebooks/masterguide.html",
    gated: true
  },

  {
    id: "training-system",
    hidden: true,
    kicker: { de: "MaleMetrix · Training", en: "MaleMetrix · Training" },
    cover: "linear-gradient(150deg,#11203c,#0c1320)",
    title: { de: "Das 3-Tage-System", en: "The 3-Day System" },
    desc: { de: "Der komplette Trainingsleitfaden für Männer mit wenig Zeit: A/B/C-Plan, Progression und die wichtigsten Technik-Cues.",
            en: "The complete training guide for busy men: A/B/C plan, progression and the key form cues." },
    minutes: 12,
    read: "ebooks/training-system.html",
    gated: true
  },

  {
    id: "protein-system",
    hidden: true,
    kicker: { de: "MaleMetrix · Ernährung", en: "MaleMetrix · Nutrition" },
    cover: "linear-gradient(150deg,#0c2b2a,#0c1320)",
    title: { de: "Protein ohne Kochen", en: "Protein Without Cooking" },
    desc: { de: "Wie du dein Proteinziel triffst, ohne Hobbykoch zu werden: Standardmahlzeiten, Einkaufsliste, Restaurant-Strategie.",
            en: "How to hit your protein target without becoming a chef: standard meals, shopping list, restaurant strategy." },
    minutes: 10,
    read: "ebooks/protein-system.html",
    gated: true
  },

  {
    id: "schlaf-energie",
    hidden: true,
    kicker: { de: "MaleMetrix · Recovery", en: "MaleMetrix · Recovery" },
    cover: "linear-gradient(150deg,#231042,#0c1320)",
    img: "ebooks/img/schlaf/01-titel.jpg",
    title: { de: "Schlaf- & Energie-Reset", en: "Sleep & Energy Reset" },
    desc: { de: "Der 14-Tage-Plan für mehr Energie: Abendroutine, Koffein-Timing und die häufigsten Schlafkiller bei Männern.",
            en: "The 14-day plan for more energy: evening routine, caffeine timing and the most common sleep killers for men." },
    minutes: 11,
    read: "ebooks/schlaf-energie.html",
    gated: true
  },

  {
    id: "schlaf-stack",
    kicker: { de: "MaleMetrix · Recovery", en: "MaleMetrix · Recovery" },
    cover: "linear-gradient(160deg,#1a1140,#0a1020)",
    img: "ebooks/img/schlaf/01-titel.jpg",
    badge: { de: "Recovery · Schlaf-Stack", en: "Recovery · Sleep Stack" },
    title: { de: "Der Schlaf-Stack", en: "The Sleep Stack" },
    desc: { de: "Die Abend-Routine für tieferen Schlaf: die wenigen Schlaf-Supplemente mit Evidenz (Magnesium, L-Theanin, Glycin) plus die Basis aus Licht, Timing und Temperatur — als eigene Seite (PDF weiterhin enthalten).",
            en: "The evening routine for deeper sleep: the few sleep supplements with evidence (magnesium, L-theanine, glycine) plus the basics of light, timing and temperature — as its own page (PDF still included)." },
    minutes: 10,
    read: "ebooks/schlaf-stack.html",
    gated: true
  },

  {
    id: "fettabbau",
    hidden: true,
    kicker: { de: "MaleMetrix · Fettabbau", en: "MaleMetrix · Fat Loss" },
    cover: "linear-gradient(150deg,#3a1d12,#0c1320)",
    title: { de: "Fettabbau ohne Hunger", en: "Fat Loss Without Hunger" },
    desc: { de: "Wie du Bauchfett verlierst, ohne ständig hungrig zu sein: Energiebilanz, Protein, Sattmacher, Wochenend-Strategie und der Umgang mit Plateaus.",
            en: "How to lose belly fat without constant hunger: energy balance, protein, satiety, weekend strategy and beating plateaus." },
    minutes: 13,
    read: "ebooks/fettabbau.html",
    gated: true
  },

  {
    id: "taeglich-trainieren",
    kicker: { de: "MaleMetrix · Training", en: "MaleMetrix · Training" },
    cover: "linear-gradient(150deg,#103226,#0c1320)",
    img: "ebooks/img/taeglich-trainieren/cover.jpg",
    badge: { de: "Neu · Training", en: "New · Training" },
    title: { de: "Jeden Tag trainieren", en: "Train Every Day" },
    desc: { de: "Warum „3× die Woche\" ständig vor sich hergeschoben wird — und wie tägliche 25–30 Minuten plus drei harte Gym-Tage als Push/Pull/Legs das Aufschieben killen und dich dauerhaft am Ball halten. Das Anti-Aufschieben-System, kombiniert mit dem 3-Tage-System.",
            en: "Why \"3× a week\" keeps getting postponed — and how daily 25–30 minutes plus three hard gym days as Push/Pull/Legs kill procrastination and keep you consistent. The anti-procrastination system, combined with the 3-day system." },
    minutes: 13,
    read: "ebooks/taeglich-trainieren.html",
    gated: true
  },

  {
    id: "sexuelle-gesundheit",
    kicker: { de: "MaleMetrix · Aufklärung", en: "MaleMetrix · Education" },
    cover: "linear-gradient(150deg,#3a1030,#0c1320)",
    img: "ebooks/img/sexuelle-gesundheit/01-titel.jpg",
    badge: { de: "Neu · Aufklärung", en: "New · Education" },
    title: { de: "Sexuelle Gesundheit & die Medikamente", en: "Sexual Health & the Medications" },
    desc: { de: "Der eigentliche Mehrwert: das Wissen über die Medikamente — Viagra (Sildenafil), Cialis (Tadalafil), Dapoxetin, PT-141, Testosteron und die Rolle der Schilddrüse, jeweils mit Wirkmechanismus und Risiken. Plus Beckenboden & Kegelübungen, Lebensstil-Hebel und der Weg zum richtigen Arzt — sachlich, ohne Tabu.",
            en: "The real value: knowledge about the medications — Viagra (sildenafil), Cialis (tadalafil), dapoxetine, PT-141, testosterone and the thyroid's role, each with mechanism and risks. Plus pelvic floor & Kegel exercises, lifestyle levers and the path to the right doctor — factual, no taboo." },
    minutes: 19,
    read: "ebooks/sexuelle-gesundheit.html",
    gated: true
  },

  {
    id: "testosteron",
    kicker: { de: "MaleMetrix · Aufklärung", en: "MaleMetrix · Education" },
    cover: "linear-gradient(150deg,#3a2410,#0c1320)",
    img: "ebooks/img/testosteron/01-titel.jpg",
    badge: { de: "Neu · Aufklärung", en: "New · Education" },
    title: { de: "Testosteron verstehen", en: "Understanding Testosterone" },
    desc: { de: "Der ehrliche Guide: Was Testosteron wirklich macht, welche Blutwerte zählen, welche natürlichen Hebel (Schlaf, Training, Körperfett) wirken, was reine Geldverschwendung ist und wann ein Arztbesuch sinnvoll ist — ohne Hype, ohne Booster-Verkauf.",
            en: "The honest guide: what testosterone really does, which blood values matter, the natural levers that work (sleep, training, body fat), what's a waste of money and when to see a doctor — no hype, no booster sales." },
    minutes: 14,
    read: "ebooks/testosteron.html",
    gated: true
  },


  {
    id: "blutwerte-guide",
    kicker: { de: "MaleMetrix · Blutwerte", en: "MaleMetrix · Blood Values" },
    cover: "linear-gradient(150deg,#3a1018,#0c1320)",
    img: "ebooks/img/blutwerte/cover.jpg",
    badge: { de: "Aufklärung", en: "Education" },
    title: { de: "Blutwerte & Hormone verstehen", en: "Understand Blood Values & Hormones" },
    desc: { de: "Welche Werte für Männer wirklich zählen, wie du dein Arztgespräch vorbereitest und was die natürlichen Hebel für deinen Hormonhaushalt sind — sachlich, ohne Hype.",
            en: "Which markers really matter for men, how to prepare your doctor visit and the natural levers for your hormones — factual, no hype." },
    minutes: 14,
    read: "ebooks/blutwerte-guide.html",
    gated: true
  },

  {
    id: "supplements",
    kicker: { de: "MaleMetrix · Supplemente", en: "MaleMetrix · Supplements" },
    cover: "linear-gradient(150deg,#0c2b1f,#0c1320)",
    img: "ebooks/img/supplements/cover.jpg",
    title: { de: "Supplemente mit Evidenz", en: "Evidence-Based Supplements" },
    desc: { de: "Die kurze, ehrliche Liste: was wirklich wirkt (Kreatin, Vitamin D, Protein, Koffein), was Geldverschwendung ist und in welcher Reihenfolge du überhaupt darüber nachdenken solltest.",
            en: "The short, honest list: what actually works (creatine, vitamin D, protein, caffeine), what wastes money and the order to even consider it." },
    minutes: 10,
    read: "ebooks/supplements.html",
    gated: true
  },


  {
    id: "gewohnheiten",
    hidden: true,
    kicker: { de: "MaleMetrix · Verhalten", en: "MaleMetrix · Behavior" },
    cover: "linear-gradient(150deg,#11203c,#0c1320)",
    title: { de: "Gewohnheiten, die bleiben", en: "Habits That Stick" },
    desc: { de: "Warum Motivation überschätzt wird: Trigger, Mini-Gewohnheiten, Umfeld-Design und Identität — das System, mit dem deine Ergebnisse auch nach Woche 12 halten.",
            en: "Why motivation is overrated: triggers, mini-habits, environment design and identity — the system that keeps your results past week 12." },
    minutes: 11,
    read: "ebooks/gewohnheiten.html",
    gated: true
  }

  /* ----------------------------------------------------------------------
     // BEISPIEL für ein neues, hochgeladenes PDF-Ebook (einfach einkommentieren
     // und anpassen):
     ,{
       id: "mein-neues-ebook",
       kicker: { de: "MaleMetrix · Neu" },
       cover: "linear-gradient(150deg,#3a1d12,#0c1320)",
       badge: { de: "Neu" },
       title: { de: "Titel meines Ebooks" },
       desc:  { de: "Worum es geht, in ein bis zwei Sätzen." },
       minutes: 9,
       read: "ebooks/files/mein-neues-ebook.pdf",
       gated: true
     }
     ---------------------------------------------------------------------- */
];
