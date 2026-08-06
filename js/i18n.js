/* ==========================================================================
   MaleMetrix — Sprachsystem (DE / EN)
   Elemente mit data-i18n="key" werden übersetzt. Fehlt ein Key, bleibt der
   vorhandene (deutsche) Text erhalten. data-i18n-attr="placeholder:key" für
   Attribute, data-i18n-html für HTML-Inhalt.
   ========================================================================== */

(function () {
  "use strict";

  const DICT = {
    /* ---------- Navigation (überall) ---------- */
    "nav.check":   { de: "Score", en: "Score" },
    "nav.coaching":{ de: "1:1 Coaching", en: "1:1 Coaching" },
    "nav.startScore": { de: "Score starten", en: "Start your score" },
    "nav.tools":   { de: "Rechner", en: "Calculators" },
    "nav.tracker": { de: "Tracker", en: "Tracker" },
    "nav.protokoll":{ de: "Das Protokoll", en: "The Protocol" },
    "nav.mycourse":{ de: "My MaleMetrix", en: "My MaleMetrix" },
    "nav.mymm":    { de: "My MaleMetrix", en: "My MaleMetrix" },
    "nav.shop":    { de: "Shop", en: "Shop" },
    /* Der Sammelpunkt hieß "Über" und enthielt nur Info-Seiten. Die drei
       kostenlosen Tracker waren dagegen nur im Footer verlinkt — also
       praktisch unauffindbar. Beides liegt jetzt hier zusammen, und der
       Punkt heißt entsprechend "Mehr". */
    "nav.more":    { de: "Mehr", en: "More" },
    "nav.openMenu":  { de: "Menü öffnen", en: "Open menu" },
    "nav.closeMenu": { de: "Menü schließen", en: "Close menu" },
    "nav.ebooks":  { de: "Library", en: "Library" },
    "nav.library": { de: "Kapitelübersicht", en: "Chapter index" },
    "nav.protocol": { de: "Das Protokoll", en: "The Protocol" },
    "nav.magazine":{ de: "Magazin", en: "Magazine" },
    "nav.blood":   { de: "Blutwerte", en: "Blood Values" },
    /* Gruppe heisst "Kostenlos", nicht "Tracker": die Rechner gehoeren dazu,
       sind aber keine Tracker. */
    "nav.freeGroup":    { de: "Kostenlos", en: "Free" },
    "nav.matrix":       { de: "Anabole Matrix", en: "Anabolic Matrix" },
    "nav.calc":         { de: "Rechner & Werkzeuge", en: "Calculators & tools" },
    "nav.trackerGym":   { de: "Training & Schlaf", en: "Training & sleep" },
    "nav.trackerFood":  { de: "Kalorien & Protein", en: "Calories & protein" },
    "nav.trackerLabs":  { de: "Blutwerte im Verlauf", en: "Blood over time" },
    /* Eigene Gruppe, weil das Ziel in der App liegt und nicht auf einer
       freien Seite — „Kostenlos" wäre an dieser Stelle eine Zusage, die der
       Stack Builder nicht einlöst. Der Produktname bleibt unübersetzt; er
       steht so im OS und in MALEMETRIX_OS.md. */
    "nav.productGroup": { de: "Produkte", en: "Products" },
    "nav.myGroup":      { de: "My MaleMetrix", en: "My MaleMetrix" },
    "nav.stackBuilder": { de: "Stack Builder", en: "Stack Builder" },
    "nav.transform":    { de: "Transformation", en: "Transformation" },
    "nav.circle":       { de: "Circle", en: "Circle" },
    /* Nur die Gruppenüberschrift bekommt einen Schlüssel. Die Kapiteltitel
       selbst bleiben ohne — wie „Ergebnisse" und „Produktvorschau" — und
       laufen über die dynamische Übersetzung. Siebzehn feste EN-Strings
       wären eine zweite Pflegestelle für Titel, die sich ändern können. */
    "nav.ebooksGroup":  { de: "Ebooks", en: "Ebooks" },
    "nav.aboutGroup":   { de: "MaleMetrix", en: "MaleMetrix" },
    "nav.aboutMM": { de: "Über MaleMetrix", en: "About MaleMetrix" },
    "nav.faq":     { de: "FAQ", en: "FAQ" },
    "nav.contact": { de: "Kontakt", en: "Contact" },
    "nav.booking": { de: "Analysegespräch", en: "Free Consult" },

    /* ---------- Footer ---------- */
    "foot.brand":   { de: "Das Performance-System für Männer. Körper. Kraft. Energie. Blutwerte. Umsetzung.",
                      en: "The performance system for men. Body. Strength. Energy. Blood. Execution." },
    "foot.system":  { de: "System", en: "System" },
    "foot.freecol": { de: "Kostenlos", en: "Free" },
    "foot.info":    { de: "Info", en: "Info" },
    "foot.legal":   { de: "Rechtliches", en: "Legal" },
    "foot.score":   { de: "MaleMetrix Score", en: "MaleMetrix Score" },
    "foot.coaching":{ de: "1:1 Coaching", en: "1:1 Coaching" },
    "foot.course":  { de: "DAS PROTOKOLL (inkl. Programm)", en: "THE PROTOCOL (incl. program)" },
    "foot.tools":   { de: "Kostenlose Rechner", en: "Free Calculators" },
    "foot.tracker": { de: "Training-Tracker", en: "Workout Tracker" },
    "foot.shop":    { de: "Shop", en: "Shop" },
    "foot.ebooks":  { de: "Kapitelübersicht", en: "Chapter index" },
    "foot.blood":   { de: "Blutwerte verstehen", en: "Understand Blood Values" },
    "foot.about":   { de: "Über MaleMetrix", en: "About MaleMetrix" },
    "foot.trust":   { de: "Vertrauen & Methodik", en: "Trust & Methodology" },
    "foot.faq":     { de: "FAQ", en: "FAQ" },
    "foot.booking": { de: "Analysegespräch", en: "Free Consultation" },
    "foot.contact": { de: "Kontakt", en: "Contact" },
    "foot.imprint": { de: "Impressum", en: "Imprint" },
    "foot.privacy": { de: "Datenschutz", en: "Privacy" },
    "foot.terms":   { de: "AGB & Widerruf", en: "Terms & Withdrawal" },
    "foot.disclaimer": {
      de: "MaleMetrix bietet Coaching, Lifestyle-Analyse und strukturierte Orientierung zu Training, Ernährung, Schlaf, Körperkomposition und allgemeinen Gesundheitsmarkern. MaleMetrix stellt keine medizinischen Diagnosen, ersetzt keine ärztliche Beratung und gibt keine Therapie- oder Medikamentenempfehlungen. Bei gesundheitlichen Beschwerden, auffälligen Laborwerten oder medizinischen Fragen wende dich bitte an einen Arzt.",
      en: "MaleMetrix provides coaching, lifestyle analysis and structured guidance on training, nutrition, sleep, body composition and general health markers. MaleMetrix does not make medical diagnoses, does not replace medical advice and gives no therapy or medication recommendations. For health complaints, abnormal lab values or medical questions, please consult a doctor."
    },
    "foot.rights":  { de: "Alle Rechte vorbehalten.", en: "All rights reserved." },
    "foot.tagline": { de: "Made for Männer, die mehr wollen.", en: "Made for men who want more." },

    /* ---------- Buttons / wiederkehrend ---------- */
    "cta.startCheck": { de: "Meinen kostenlosen Score starten", en: "Start my free score" },
    "cta.viewCoaching": { de: "1:1 Coaching ansehen", en: "View 1:1 coaching" },
    "common.free": { de: "Kostenlos", en: "Free" },
    "common.addCart": { de: "In den Warenkorb", en: "Add to cart" },
    "common.details": { de: "Details", en: "Details" },
    "cart.title": { de: "Warenkorb", en: "Cart" },
    "cart.empty": { de: "Dein Warenkorb ist leer.", en: "Your cart is empty." },
    "cart.toShop": { de: "Zum Shop", en: "To shop" },
    "cart.subtotal": { de: "Zwischensumme", en: "Subtotal" },
    "cart.shipping": { de: "Versand", en: "Shipping" },
    "cart.total": { de: "Gesamt", en: "Total" },
    "cart.checkout": { de: "Zur Kasse", en: "Checkout" },
    "cart.free": { de: "kostenlos", en: "free" },
    "cart.digital": { de: "entfällt (digital)", en: "none (digital)" },
    "cart.remove": { de: "Entfernen", en: "Remove" },

    /* ---------- Shop ---------- */
    "shop.eyebrow": { de: "MaleMetrix Shop", en: "MaleMetrix Shop" },
    "shop.h1a": { de: "Werkzeuge für deine", en: "Tools for your" },
    "shop.h1b": { de: "Baseline", en: "baseline" },
    "shop.lead": { de: "Test-Kits, Tracking-Zubehör und personalisierte Reports — alles, was dein System messbar macht. Versand 3,90 €, kostenlos ab 50 €. Digitale Produkte ohne Versandkosten.",
                   en: "Test kits, tracking gear and personalized reports — everything that makes your system measurable. Shipping €3.90, free over €50. Digital products ship-free." },
    "shop.fAll": { de: "Alle Produkte", en: "All products" },
    "shop.fKit": { de: "Test-Kits", en: "Test kits" },
    "shop.fGear": { de: "Tracking & Gadgets", en: "Tracking & gadgets" },
    "shop.fDigital": { de: "Digital", en: "Digital" },

    /* ---------- Homepage (aktuell verdrahtet, Stand P9.8) ---------- */
    "home.badge": { de: "Männergesundheit als System — nicht nach Bauchgefühl", en: "Men’s health as a system — not guesswork" },
    /* Hero-Neufassung (Founder, Juli 2026): aktivere Verben ("Bau DEINEN
       Körper", "STEUERE dein System"), kürzerer Nutzen-Text ohne "Hormone"
       und "Bauchgefühl", CTA in Ich-Form. br-m bricht nur mobil. */
    /* Flaggschiff-Neuausrichtung (August 2026): Die Transformation ist der
       Hero — sieh deinen möglichen Körper, wähle dein Ziel, MaleMetrix baut
       den Weg. Der Score bleibt der sekundäre Einstieg. */
    "home.h1": { de: "Sieh deinen möglichen Körper.<br><span class=\"text-grad\">Bevor du dafür <br class=\"br-m\">arbeitest.</span>",
                 en: "See your possible body.<br><span class=\"text-grad\">Before you <br class=\"br-m\">work for it.</span>" },
    "home.lead": { de: "Lade ein aktuelles Foto hoch. MaleMetrix erstellt zwei realistische KI-Visualisierungen möglicher Zielzustände. Du wählst das Ziel — MaleMetrix baut den Weg dorthin.",
                   en: "Upload a current photo. MaleMetrix creates two realistic AI visualizations of possible target states. You pick the target — MaleMetrix builds the path to it." },
    "home.trustline": { de: "Zwei realistische Zielvorschläge · eigenes Ziel frei wählbar · KI-Visualisierung, klar gekennzeichnet · Konto erst vor der Generierung",
                        en: "Two realistic target proposals · your own target freely selectable · AI visualization, clearly labeled · account only right before generation" },
    "home.howLink": { de: "So funktioniert es ↓", en: "How it works ↓" },
    "cta.seeTransform": { de: "Meine mögliche Transformation sehen", en: "See my possible transformation" },
    "home.s.how.k": { de: "So funktioniert es", en: "How it works" },
    "home.s.how.h": { de: "Vom Foto zum Ziel — <span class=\"text-grad\">in vier Schritten</span>.",
                      en: "From photo to target — <span class=\"text-grad\">in four steps</span>." },
    "home.s.targets.k": { de: "Warum zwei Ziele", en: "Why two targets" },
    "home.s.targets.h": { de: "Keine Fantasiekörper. <span class=\"text-grad\">Zwei ehrliche Optionen.</span>",
                          en: "No fantasy bodies. <span class=\"text-grad\">Two honest options.</span>" },

    /* ---------- Transformation (Hero der Funktionsseite) ---------- */
    "trf.h1a": { de: "Dein Körper in der Zukunft.", en: "Your body in the future." },
    "trf.h1b": { de: "Heute sichtbar.", en: "Visible today." },
    "trf.lead": { de: "Ein Foto von dir — und MaleMetrix erstellt zwei realistische KI-Visualisierungen möglicher Zielzustände, aus deinem eigenen Bild. Du wählst EIN Ziel, und MaleMetrix baut den Weg dorthin: Ernährung, Training, System.",
                  en: "One photo of you — and MaleMetrix creates two realistic AI visualizations of possible target states, from your own picture. You pick ONE target, and MaleMetrix builds the path: nutrition, training, system." },

    /* Sektions-Kicker + Überschriften */
    "home.s.problem.k": { de: "Das eigentliche Problem", en: "The real problem" },
    "home.s.problem.h": { de: "Du brauchst nicht mehr Informationen. Du brauchst die richtige <span class=\"text-grad\">Reihenfolge</span>.",
                          en: "You don’t need more information. You need the right <span class=\"text-grad\">order</span>." },
    "home.s.system.k": { de: "Vom Bild zum System", en: "From image to system" },
    "home.s.system.h": { de: "Die Visualisierung ist der Anfang — nicht das Produkt.", en: "The visualization is the start — not the product." },
    "home.s.score.k": { de: "Der MaleMetrix Score", en: "The MaleMetrix Score" },
    "home.s.score.h": { de: "Deine Performance besteht aus <span class=\"text-grad\">mehreren Bereichen</span>.",
                        en: "Your performance is made of <span class=\"text-grad\">several areas</span>." },
    "home.s.wege.k": { de: "Nach dem Score", en: "After the Score" },
    "home.s.wege.h": { de: "Wie möchtest du MaleMetrix nutzen?", en: "How do you want to use MaleMetrix?" },
    "home.s.lib.k": { de: "Sekundär · zum Vertiefen", en: "Secondary · go deeper" },
    "home.s.lib.h": { de: "Kostenlos vertiefen", en: "Go deeper — free" },
    "home.s.fit.k": { de: "Ehrliche Auswahl", en: "An honest fit" },
    "home.s.fit.h": { de: "Für wen MaleMetrix ist — und für wen nicht.", en: "Who MaleMetrix is for — and who it isn’t." },
    "home.s.trust.k": { de: "Transparenz statt Hochglanz", en: "Transparency over polish" },
    "home.s.trust.h": { de: "Warum du MaleMetrix vertrauen kannst — gerade weil es neu ist.",
                        en: "Why you can trust MaleMetrix — precisely because it’s new." },
    "home.s.founder.k": { de: "Warum ich MaleMetrix gebaut habe", en: "Why I built MaleMetrix" },
    "home.s.founder.h": { de: "Ein Ingenieur denkt Männergesundheit als System.", en: "An engineer treats men’s health as a system." },
    "home.s.know.k": { de: "Wissen, das du anwenden kannst", en: "Knowledge you can actually apply" },
    "home.s.know.h": { de: "Klartext statt Bro-Science.", en: "Straight talk, not bro-science." },
    "home.s.faq.k": { de: "Häufige Fragen", en: "Frequent questions" },
    "home.s.faq.h": { de: "Kurz beantwortet.", en: "Answered briefly." },
    "home.s.final.k": { de: "Zielvorschläge kostenlos · KI-Visualisierung klar gekennzeichnet", en: "Target proposals free · AI visualization clearly labeled" },
    /* Ziel-Instrument (Transformations-Schema) im Hero. */
    "home.diag.head": { de: "MM / TRANSFORM · BEISPIELRECHNUNG", en: "MM / TRANSFORM · SAMPLE CALCULATION" },
    "home.diag.level": { de: "Solide Basis, klare Engpässe", en: "Solid base, clear bottlenecks" },
    "home.diag.type": { de: "Typ: Der müde Leistungsträger", en: "Type: The tired high performer" },
    "home.diag.body": { de: "KÖRPER", en: "BODY" },
    "home.diag.strength": { de: "TRAINING", en: "TRAINING" },
    "home.diag.fuel": { de: "ERNÄHRUNG", en: "NUTRITION" },
    "home.diag.recovery": { de: "SCHLAF", en: "SLEEP" },
    "home.diag.blood": { de: "BLUTWERTE", en: "BIOMARKERS" },
    "home.diag.drive": { de: "ENERGIE", en: "ENERGY" },
    "home.diag.execution": { de: "UMSETZUNG", en: "EXECUTION" },
    "home.diag.leadOut": { de: "<b>Beide Vorschläge ehrlich gerechnet</b> — aus Gewicht, Größe, Taille und Ausgangsform. Dein eigenes Wunschziel bleibt frei wählbar.", en: "<b>Both proposals honestly computed</b> — from weight, height, waist and starting shape. Your own target stays freely selectable." },
    "home.diag.note": { de: "Schema mit Beispielwerten, keine echte Person. Deine Visualisierung entsteht aus deinem eigenen Foto und ist klar als KI gekennzeichnet.", en: "Schema with sample values, not a real person. Your visualization is created from your own photo and clearly labeled as AI." },
    "cta.findBottleneck": { de: "Meinen Engpass finden", en: "Find my bottleneck" },
    "cta.startFree": { de: "Kostenlos starten", en: "Start free" },
    "cta.calcScore": { de: "Score berechnen", en: "Calculate my Score" },

    /* ---------- Tools-Seite ---------- */
    "tools.eyebrow": { de: "Kostenlose Tools · keine Anmeldung", en: "Free tools · no signup" },
    "tools.h1a": { de: "19 Rechner für", en: "19 calculators for" },
    "tools.h1b": { de: "deinen Körper", en: "your body" },
    "tools.lead": { de: "Körperfett, Kalorien, Protein, Kraft-Scores und mehr — wissenschaftlich fundiert, sofort im Browser, komplett kostenlos. Keine Daten verlassen dein Gerät.",
                    en: "Body fat, calories, protein, strength scores and more — science-based, instant in your browser, completely free. No data leaves your device." },
    "tools.allCats": { de: "Alle", en: "All" },
    "tools.cat.body": { de: "Körpermaße", en: "Body Measurements" },
    "tools.cat.energy": { de: "Kalorien & Energie", en: "Calories & Energy" },
    "tools.cat.strength": { de: "Kraft & Leistung", en: "Strength & Performance" },
    "tools.back": { de: "← Alle Rechner", en: "← All calculators" },
    "tools.calculate": { de: "Berechnen", en: "Calculate" },
    "tools.reset": { de: "Zurücksetzen", en: "Reset" },
    "tools.fillHint": { de: "Fülle die Felder aus, um dein Ergebnis zu sehen.", en: "Fill in the fields to see your result." },
    "tools.disclaimer": { de: "Alle Rechner liefern Orientierungswerte auf Basis etablierter Formeln und ersetzen keine ärztliche oder ernährungsmedizinische Diagnostik.",
                          en: "All calculators provide estimates based on established formulas and do not replace medical or nutritional diagnostics." },
    "tools.ctaTitle": { de: "Zahlen sind der Anfang. Umsetzung ist das System.", en: "Numbers are the start. Execution is the system." },
    "tools.ctaText": { de: "Du kennst jetzt deine Werte — der kostenlose MaleMetrix Score zeigt dir, welcher Hebel bei dir zuerst kommt.", en: "Now you know your numbers — the free MaleMetrix Score shows which lever to pull first." },

    /* ---------- Tracker-Seite ---------- */
    "trk.eyebrow": { de: "Kostenlose Fitness-App · läuft offline", en: "Free fitness app · works offline" },
    "trk.h1a": { de: "MaleMetrix", en: "MaleMetrix" },
    "trk.h1b": { de: "Tracker", en: "Tracker" },
    "trk.lead": { de: "Dein Measurement Layer: Training, Cardio, Schlaf und Körperdaten an einem Ort — damit Fortschritt sichtbar wird und deine Entscheidungen auf Daten statt Gefühl beruhen. Mit Auto-Vorschlag, PRs und Charts. Alles lokal, ohne Konto.",
                  en: "Your measurement layer: training, cardio, sleep and body data in one place — so progress becomes visible and your decisions rest on data, not feel. With auto-fill, PRs and charts. All local, no account." },
    "trk.tab.workout": { de: "Training", en: "Workout" },
    "trk.tab.history": { de: "Verlauf", en: "History" },
    "trk.tab.cardio": { de: "Cardio", en: "Cardio" },
    "trk.tab.body": { de: "Körper", en: "Body" },
    "trk.tab.templates": { de: "Pläne", en: "Routines" },
    "trk.export": { de: "Daten sichern", en: "Export data" },
    "trk.import": { de: "Daten laden", en: "Import data" },

    /* ---------- Ebooks-Seite ---------- */
    "eb.eyebrow": { de: "MM / PROTOCOL · INHALTSVERZEICHNIS", en: "MM / PROTOCOL · TABLE OF CONTENTS" },
    "eb.h1a": { de: "Was in", en: "Inside" },
    "eb.h1b": { de: "DAS PROTOKOLL", en: "DAS PROTOKOLL" },
    "eb.h1c": { de: "steht", en: "— chapter by chapter" },
    "eb.lead": { de: "Alle Kapitel im Überblick — Körper, Training, Recovery, Hormone, Blutwerte, Longevity. Jedes Kapitel gehört zum Protokoll: <strong>99 €, einmalig, kein Abo.</strong> Hier siehst du vorab, was in jedem einzelnen drinsteht.",
      en: "Every chapter at a glance — body, training, recovery, hormones, blood work, longevity. Every chapter belongs to the protocol: <strong>€99, one-off, no subscription.</strong> Here you see upfront what each one contains." },
    "eb.box.num": { de: "WAS KOSTET WAS", en: "WHAT COSTS WHAT" },
    "eb.box.title": { de: "Die Kapitel gehören zum Protokoll. Der Rest ist kostenlos.", en: "The chapters belong to the protocol. Everything else is free." },
    "eb.box.text": { de: "Jedes Kapitel unten ist Teil von <strong>DAS PROTOKOLL</strong> — 99 € einmalig, kein Abo, inklusive 12-Wochen-Programm. Ohne Anmeldung und ohne Bezahlung nutzt du den Score, die Rechner, den Tracker und das Magazin.", en: "Every chapter below is part of <strong>DAS PROTOKOLL</strong> — €99 once, no subscription, including the 12-week program. The score, calculators, tracker and magazine stay free, no signup." },
    "eb.read": { de: "Jetzt lesen", en: "Read now" },
    "eb.peek": { de: "Was im Kapitel steht", en: "What’s in this chapter" },
    "eb.inProtocol": { de: "Im Protokoll · 99 €", en: "In the protocol · €99" },
    "eb.inProtocolShort": { de: "Im Protokoll", en: "In the protocol" },
    "eb.minutes": { de: "Min. Lesezeit", en: "min read" },
    "eb.online": { de: "Online lesen", en: "Read online" },
    "eb.b1.title": { de: "Das 3-Tage-System", en: "The 3-Day System" },
    "eb.b1.desc": { de: "Der komplette Trainingsleitfaden für Männer mit wenig Zeit: A/B/C-Plan, Progression und die wichtigsten Technik-Cues.", en: "The complete training guide for busy men: A/B/C plan, progression and the key form cues." },
    "eb.b2.title": { de: "Protein ohne Kochen", en: "Protein Without Cooking" },
    "eb.b2.desc": { de: "Wie du dein Proteinziel triffst, ohne Hobbykoch zu werden: Standardmahlzeiten, Einkaufsliste, Restaurant-Strategie.", en: "How to hit your protein target without becoming a chef: standard meals, shopping list, restaurant strategy." },
    "eb.b3.title": { de: "Schlaf- & Energie-Reset", en: "Sleep & Energy Reset" },
    "eb.b3.desc": { de: "Der 14-Tage-Plan für mehr Energie: Abendroutine, Koffein-Timing und die häufigsten Schlafkiller bei Männern.", en: "The 14-day plan for more energy: evening routine, caffeine timing and the most common sleep killers for men." },
    "eb.b0.title": { de: "Der MaleMetrix Masterguide", en: "The MaleMetrix Masterguide" },
    "eb.b0.desc": { de: "Das große Flaggschiff: Training, Ernährung, Regeneration, Tracking und Blutwerte-Verständnis als ein zusammenhängendes System — mit komplettem 12-Wochen-Fahrplan.", en: "The flagship guide: training, nutrition, recovery, tracking and understanding blood values as one connected system — with a full 12-week roadmap." },
    "eb.b0.badge": { de: "Komplettes System · 11 Kapitel", en: "Complete system · 11 chapters" },
    "eb.ctaTitle": { de: "Bevor du kaufst: finde heraus, wo du stehst.", en: "Before you buy: find out where you stand." },
    "eb.ctaText": { de: "Der Score ist kostenlos, dauert rund sieben Minuten und sagt dir, welches dieser Kapitel bei dir zuerst zählt.", en: "The score is free, takes about seven minutes and tells you which of these chapters matters first for you." }
  };

  /* ---------- Locale-Auflösung: Normalisierung → gespeicherte Wahl → Browser → DE ---------- */
  const SUPPORTED = ["de", "en"];
  function norm(l) {
    if (!l) return null;
    l = String(l).trim().toLowerCase();
    if (l === "german" || l === "deutsch") return "de";
    if (l === "english") return "en";
    l = l.split("-")[0].split("_")[0];       // de-DE → de, en_US → en
    return SUPPORTED.indexOf(l) >= 0 ? l : null;
  }
  function detectBrowser() {
    try {
      const cands = [].concat(navigator.languages || [], [navigator.language]);
      for (const c of cands) { const n = norm(c); if (n) return n; }
    } catch (e) {}
    return "de";
  }
  let stored = null;
  try { stored = norm(localStorage.getItem("mm_lang")); } catch (e) {}
  // Explizite Wahl gewinnt immer; sonst beim Erstbesuch Browser-Sprache; sonst DE.
  let lang = stored || detectBrowser();
  // Erstbesuch-Erkennung persistiert NICHT automatisch — die manuelle Wahl in
  // setLang() setzt den Marker. So bleibt "Browser-Erkennung nur beim Erstbesuch".

  const MISSING = {};   // Diagnose: fehlende Keys sammeln (für Tests/QA)
  function t(key, vars) {
    const e = DICT[key];
    let s = e ? (e[lang] != null ? e[lang] : e.de) : null;
    if (s == null) { MISSING[key] = (MISSING[key] || 0) + 1; return null; }
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return s;
  }

  /* ---------- Formatierung (Intl) — Speicherwerte bleiben locale-neutral ---------- */
  function fmtNum(n, opts) {
    try { return new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-US", opts).format(n); }
    catch (e) { return String(n); }
  }
  function fmtDate(d, opts) {
    try {
      const date = (d instanceof Date) ? d : new Date(d);
      return new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-US",
        opts || { year: "numeric", month: "long", day: "numeric" }).format(date);
    } catch (e) { return String(d); }
  }
  function plural(n, forms) {
    // forms: { one, other }  (DE/EN sind beide 1-vs-viele)
    const key = (n === 1 || n === -1) ? "one" : "other";
    const s = forms[key] != null ? forms[key] : forms.other;
    return String(s).replace(/\{n\}/g, fmtNum(n));
  }

  /* =========================================================================
     VOLLTEXT-ÜBERSETZER — ein Dienst statt englischer Seiten-Klone
     -------------------------------------------------------------------------
     Der Schlüssel-Ansatz oben (data-i18n) deckt die Hülle ab: Navigation,
     Footer, wiederkehrende Bausteine. Er kann aber nichts übersetzen, was
     JavaScript erzeugt — und das ist der größte Teil dieser Seite (Score,
     My MaleMetrix, Tracker, Rechner, Programm).

     UND ER SKALIERT NICHT MIT DER REALITÄT: Die deutschen Texte ändern sich
     laufend. Jede Änderung müsste in einem zweiten, handgepflegten Wörterbuch
     nachgezogen werden — ab der ersten vergessenen Zeile stimmt die englische
     Fassung nicht mehr. Genau derselbe Grund, aus dem es keine englischen
     Seiten-Klone gibt: zwei Wahrheiten driften immer auseinander.

     Deshalb übersetzt hier ein DIENST zur Laufzeit:

       1. Ein Durchlauf sammelt alle deutschen Textknoten der Seite.
       2. Bekannte Sätze werden sofort ersetzt (aus dem lokalen Cache oder dem
          kleinen Glossar für Marken- und Fachbegriffe).
       3. Der Rest geht gebündelt an die Edge Function mm-translate. Die
          antwortet aus ihrem Server-Cache — oder übersetzt einmal und merkt
          sich das Ergebnis für ALLE künftigen Besucher.
       4. Ein MutationObserver wiederholt das für alles, was danach
          nachgerendert wird (App, Score, Tracker).

     Was daraus folgt:
       · Text ändern reicht. Der geänderte Satz hat einen neuen Schlüssel und
         wird automatisch neu übersetzt — es gibt nichts nachzupflegen.
       · Kein Seiten-Klon, keine zweite Wahrheit, kein Drift.
       · Fehlt eine Übersetzung (kein Schlüssel konfiguriert, Budget erreicht,
         Anbieter offline), bleibt der Satz DEUTSCH stehen. Nie eine leere
         Stelle, nie ein Platzhalter.
       · Jeder Satz kostet genau einmal — der Server-Cache gilt für alle.

     Grenzen, bewusst so:
       · Rechtstexte werden NICHT übersetzt (legalNotice erklärt das im
         Klartext): die deutsche Fassung ist die verbindliche.
       · Der Premium-Reader (/ebooks/) bleibt außen vor — das ist das gekaufte
         Produkt und verdient eine geprüfte Übersetzung, keine maschinelle.
       · Nutzereingaben werden nie verschickt: gesendet wird nur Text, der aus
         der Seite selbst stammt (Formularfelder und ihre Werte nie).
       · Suchmaschinen sehen weiter die deutsche Fassung. Englischer
         Google-Traffic bräuchte eigene URLs — das wären wieder Klone.
     ========================================================================= */
  const PHRASES = {};             // normalisierter deutscher Text → englisch
  let phrasesState = "none";      // none | loading | ready | failed
  const UNTRANSLATED = {};        // Diagnose: was (noch) keine Übersetzung hat
  const SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1, KBD: 1, SAMP: 1 };
  const ATTRS = ["placeholder", "title", "aria-label", "alt"];
  /* Rechtsseiten bleiben deutsch — die deutsche Fassung ist die verbindliche. */
  const LEGAL_PAGES = ["agb.html", "datenschutz.html", "impressum.html"];
  const CACHE_KEY = "mm_i18n_en_v1";
  const CACHE_MAX_CHARS = 180000;  // ~180 KB localStorage-Anteil, dann Neuaufbau

  /* Der Laufzeit-Übersetzer braucht einen echten Browser: TreeWalker,
     MutationObserver, location. Die Schlüssel-Engine oben läuft auch in der
     Node-Testumgebung (tools-dev/tests/i18n.test.js) mit einem Minimal-DOM —
     dort bleibt der Übersetzer still, statt am fehlenden location zu scheitern. */
  const HAS_DOM = (function () {
    try {
      return typeof document !== "undefined" &&
        typeof document.createTreeWalker === "function" &&
        typeof document.createElement === "function" &&
        typeof location !== "undefined" && typeof location.pathname === "string";
    } catch (e) { return false; }
  })();

  function normText(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function hatBuchstaben(s) { return /[A-Za-zÄÖÜäöüß]/.test(s); }
  function seitenDatei() {
    try { return String(location.pathname || "").split("/").pop() || ""; } catch (e) { return ""; }
  }
  function istRechtsseite() { return LEGAL_PAGES.indexOf(seitenDatei()) >= 0; }
  function istPremiumReader() {
    try { return String(location.pathname || "").indexOf("/ebooks/") !== -1; } catch (e) { return false; }
  }

  /* ---------- Lokaler Cache: wiederkehrende Besucher fragen gar nicht ---------- */
  function cacheLaden() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      if (raw.length > CACHE_MAX_CHARS) { localStorage.removeItem(CACHE_KEY); return; }
      const o = JSON.parse(raw);
      if (o && typeof o === "object") Object.assign(PHRASES, o);
    } catch (e) { /* Speicher blockiert — dann eben ohne */ }
  }
  let cacheTimer = null;
  function cacheMerken() {
    if (cacheTimer) return;
    cacheTimer = setTimeout(() => {
      cacheTimer = null;
      try {
        const s = JSON.stringify(PHRASES);
        if (s.length <= CACHE_MAX_CHARS) localStorage.setItem(CACHE_KEY, s);
      } catch (e) { /* voll/blockiert */ }
    }, 1200);
  }

  /* Das Glossar (js/i18n-en.js) trägt Marken- und Fachbegriffe, die eine
     Maschine falsch übersetzen würde ("Engpass" ist hier nicht "bottleneck im
     Rohr"), plus alles, was unverändert bleiben MUSS. Es ist klein, absichtlich
     handgepflegt und gewinnt immer gegen die maschinelle Übersetzung.
     Geladen wird es nur für englische Besucher. */
  function loadPhrases(cb) {
    if (!HAS_DOM) { phrasesState = "failed"; cb(); return; }
    if (phrasesState === "ready" || phrasesState === "failed") { cb(); return; }
    if (phrasesState === "loading") { document.addEventListener("mm:phrases", function h() { document.removeEventListener("mm:phrases", h); cb(); }); return; }
    phrasesState = "loading";
    cacheLaden();
    /* Tiefe aus dem Pfad rechnen statt Verzeichnisse aufzuzählen. Die alte
       Liste kannte /ebooks/ und /blog/, aber nicht /lp/ — auf allen 13
       Landingpages lief der Glossar-Nachschlag deshalb auf lp/js/i18n-en.js
       und lieferte 404. Englische Besucher verloren dort alle 60 Einträge.
       Eine Liste bekannter Ordner geht bei jedem neuen Ordner wieder kaputt. */
    var ebenen = location.pathname.replace(/^\/+/, "").split("/").slice(0, -1).filter(Boolean).length;
    const s = document.createElement("script");
    s.src = "../".repeat(ebenen) + "js/i18n-en.js";
    const fertig = (ok) => {
      if (ok && window.MM_I18N_EN) Object.assign(PHRASES, window.MM_I18N_EN);
      phrasesState = "ready";     // auch ohne Glossar arbeitsfähig: Dienst + Cache
      document.dispatchEvent(new CustomEvent("mm:phrases"));
      cb();
    };
    s.onload = () => fertig(true);
    s.onerror = () => fertig(false);
    document.head.appendChild(s);
  }

  /* =========================================================================
     ANFRAGE-WARTESCHLANGE an mm-translate
     Gebündelt (nicht ein Aufruf pro Satz), entdoppelt, und mit einer Merkliste:
     zu jedem offenen Satz stehen die Knoten, die auf ihn warten. Kommt die
     Übersetzung, werden genau diese Knoten gepatcht — kein erneutes Durchlaufen
     der ganzen Seite.
     ========================================================================= */
  const WARTEND = new Map();      // deutscher Satz → { nodes:Set, attrs:Set }
  const ANGEFRAGT = new Set();    // gerade gefragt: nie zwei Anfragen für denselben Satz
  const VERSUCHE = new Map();     // Satz → Anzahl Versuche (deckelt Nachfragen)
  let sendeTimer = null;
  let laufend = 0;
  let dienstAus = false;          // kein Schlüssel / Budget erreicht → nicht weiter fragen

  function dienstUrl() {
    const base = (window.MM_CONFIG || {}).supabaseUrl || "";
    return base ? String(base).replace(/\/+$/, "") + "/functions/v1/mm-translate" : "";
  }

  /* =========================================================================
     ÜBERSETZUNG IM BROWSER (ohne Server, ohne Limit, ohne Kosten)
     -------------------------------------------------------------------------
     Neuere Chrome-Versionen bringen ein Übersetzungsmodell MIT — die
     Translator-API arbeitet auf dem Gerät. Wo es das gibt, ist das die beste
     Option, die es überhaupt gibt: unbegrenzt, sofort, kostenlos, und kein
     einziger Satz verlässt den Browser.

     Deshalb die Reihenfolge: Cache → Gerät → Server. Der Server (und damit
     dessen Tageslimit) wird nur noch für Browser gebraucht, die das nicht
     können — heute Safari und Firefox.

     WICHTIG, und bewusst so: Ergebnisse vom Gerät werden NICHT an den Server
     geschickt. Der Endpunkt ist öffentlich und anonym; würde er Übersetzungen
     von Clients annehmen, könnte jeder beliebigen Text in den gemeinsamen
     Cache schreiben und damit die Seite für alle Besucher verändern. Ein
     gefüllter Cache ist das nicht wert. Gerät-Übersetzungen bleiben lokal
     (localStorage) — für diesen Besucher dauerhaft, für andere unsichtbar. */
  let geraetUeb = null;          // erzeugte Translator-Instanz
  let geraetState = "unknown";   // unknown | none | pending | ready
  let geraetLaeuft = false;

  function geraetApi() {
    try {
      if (typeof Translator !== "undefined" && Translator && typeof Translator.create === "function") return Translator;
      if (self.ai && self.ai.translator && typeof self.ai.translator.create === "function") return self.ai.translator;
    } catch (e) {}
    return null;
  }

  function geraetVorbereiten() {
    if (geraetState !== "unknown") return;
    const api = geraetApi();
    if (!api) { geraetState = "none"; return; }
    geraetState = "pending";
    const opts = { sourceLanguage: "de", targetLanguage: "en" };
    /* create() darf laut Spezifikation einen Modell-Download auslösen und
       verlangt dafür unter Umständen eine Nutzeraktion. Der Klick auf EN IST
       eine — deshalb wird hier genau in diesem Moment erzeugt. Schlägt es
       fehl, ist das kein Fehler, sondern der Normalfall in anderen Browsern. */
    let p;
    try { p = api.create(opts); } catch (e) { geraetState = "none"; return; }
    Promise.resolve(p).then((t) => {
      if (t && typeof t.translate === "function") { geraetUeb = t; geraetState = "ready"; geraetArbeiten(); }
      else geraetState = "none";
    }).catch(() => { geraetState = "none"; planeSenden(); });
  }

  /* Arbeitet die Warteschlange auf dem Gerät ab — in kleinen Schritten, damit
     die Seite dabei flüssig bleibt. */
  function geraetArbeiten() {
    if (geraetState !== "ready" || geraetLaeuft || lang !== "en") return;
    const offen = [];
    WARTEND.forEach((_v, k) => { if (PHRASES[k] == null) offen.push(k); });
    if (!offen.length) return;
    geraetLaeuft = true;
    const paket = offen.slice(0, 20);
    Promise.all(paket.map((k) => {
      return Promise.resolve(geraetUeb.translate(k)).then((en) => {
        const t = normText(en || "");
        if (!t || t === k) return;
        PHRASES[k] = t;
        patche(k, t);
      }).catch(() => {});
    })).then(() => {
      geraetLaeuft = false;
      cacheMerken();
      if (WARTEND.size) {
        // Nächstes Paket, aber erst im nächsten Frame — nie die Seite blockieren.
        setTimeout(geraetArbeiten, 30);
      }
    }).catch(() => { geraetLaeuft = false; });
  }

  function merken(satz, node, attr) {
    let e = WARTEND.get(satz);
    if (!e) { e = { nodes: new Set(), attrs: new Set() }; WARTEND.set(satz, e); }
    if (attr) e.attrs.add({ el: node, attr: attr });
    else e.nodes.add(node);
    planeSenden();
  }

  function planeSenden() {
    // Erst das Gerät fragen: unbegrenzt, sofort, ohne Server.
    geraetVorbereiten();
    if (geraetState === "ready") { geraetArbeiten(); return; }
    if (geraetState === "pending") return;         // Modell wird gerade bereitgestellt
    if (dienstAus || sendeTimer || !dienstUrl()) return;
    // 250 ms Sammelzeit: genug, damit ein ganzer Seitenaufbau in EINE Anfrage
    // passt, kurz genug, dass es sich sofort anfühlt.
    sendeTimer = setTimeout(senden, 250);
  }

  function senden() {
    sendeTimer = null;
    /* Erst aufräumen: Was inzwischen bekannt ist, wird sofort erledigt — die
       Übersetzung kann aus einer früheren Antwort oder aus dem lokalen Cache
       stammen, während dieser Knoten noch in der Warteschlange stand. Ohne
       diesen Schritt bleiben erledigte Einträge liegen und halten Knoten fest. */
    Array.from(WARTEND.keys()).forEach((k) => { if (PHRASES[k] != null) patche(k, PHRASES[k]); });
    if (dienstAus || laufend >= 2) { if (WARTEND.size) planeSenden(); return; }
    const offen = [];
    WARTEND.forEach((_v, k) => { if (!ANGEFRAGT.has(k)) offen.push(k); });
    if (!offen.length) return;
    const paket = offen.slice(0, 48);
    paket.forEach((k) => ANGEFRAGT.add(k));
    laufend++;
    fetch(dienstUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ texts: paket })
    }).then((r) => r.ok ? r.json() : null).then((j) => {
      laufend--;
      if (!j || !j.map) { if (j && (j.error === "provider_not_configured" || j.throttled)) dienstAus = true; return; }
      if (j.error === "provider_not_configured" || j.throttled) dienstAus = true;
      const neu = Object.keys(j.map);
      neu.forEach((de) => {
        const en = j.map[de];
        if (!en || en === de) return;
        PHRASES[de] = en;
        patche(de, en);
      });
      if (neu.length) cacheMerken();

      /* Der kostenlose Anbieter übersetzt pro Aufruf nur eine begrenzte Menge —
         der Rest der Anfrage kommt unübersetzt zurück. Diese Sätze müssen
         wieder freigegeben werden, sonst bliebe die halbe Seite für den Rest
         des Besuchs deutsch, obwohl sie beim nächsten Anlauf dran wäre.
         Zwei Versuche pro Satz, dann Ruhe. */
      let offenGeblieben = 0;
      paket.forEach((k) => {
        if (PHRASES[k] != null) return;                    // erledigt
        const n = (VERSUCHE.get(k) || 0) + 1;
        VERSUCHE.set(k, n);
        if (n < 2 && WARTEND.has(k)) { ANGEFRAGT.delete(k); offenGeblieben++; }
      });
      /* Kam KEIN einziger neuer Satz zurück, ist das Tageslimit erschöpft oder
         der Anbieter stumm. Dann für diesen Besuch aufhören statt im Kreis zu
         fragen — beim nächsten Aufruf der Seite geht es weiter. */
      if (!neu.length && paket.length) dienstAus = true;
      if (WARTEND.size && (offenGeblieben || !dienstAus)) planeSenden();
    }).catch(() => {
      laufend--;
      // Netzfehler: nicht endlos nachbohren. Beim nächsten Seitenaufruf neu.
      dienstAus = true;
    });
  }

  /* Genau die wartenden Knoten ersetzen. */
  function patche(satz, en) {
    const e = WARTEND.get(satz);
    if (!e) return;
    WARTEND.delete(satz);
    e.nodes.forEach((n) => {
      if (!n || n.nodeType !== 3 || n.__mmDe != null) return;
      if (normText(n.nodeValue) !== satz) return;      // inzwischen neu gerendert
      const raw = n.nodeValue;
      const pre = (raw.match(/^\s*/) || [""])[0];
      const post = (raw.match(/\s*$/) || [""])[0];
      n.__mmDe = raw;
      n.nodeValue = pre + en + post;
    });
    e.attrs.forEach((a) => {
      const el = a.el;
      if (!el || el.nodeType !== 1) return;
      if (el.__mmDeAttrs && el.__mmDeAttrs[a.attr] != null) return;   // schon übersetzt
      if (normText(el.getAttribute(a.attr)) !== satz) return;
      if (!el.__mmDeAttrs) el.__mmDeAttrs = {};
      el.__mmDeAttrs[a.attr] = el.getAttribute(a.attr);
      el.setAttribute(a.attr, en);
    });
  }

  function textNodeWalker(root) {
    return document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !hatBuchstaben(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        for (let p = n.parentNode; p && p.nodeType === 1; p = p.parentNode) {
          if (SKIP_TAGS[p.tagName]) return NodeFilter.FILTER_REJECT;
          if (p.hasAttribute("data-no-i18n")) return NodeFilter.FILTER_REJECT;
          // Schlüssel-Übersetzung hat Vorrang; hier nicht doppelt anfassen.
          if (p.hasAttribute("data-i18n") || p.hasAttribute("data-i18n-html")) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
  }

  function translateNode(n) {
    if (n.__mmDe != null) return;                 // schon übersetzt (verhindert Schleifen)
    const raw = n.nodeValue;
    const key = normText(raw);
    if (key.length < 2 || !hatBuchstaben(key)) return;
    const en = PHRASES[key];
    if (en == null) {
      // Unbekannt: zur Übersetzung anmelden und den deutschen Text so lange
      // stehen lassen. Kein Flackern, kein Platzhalter.
      UNTRANSLATED[key] = (UNTRANSLATED[key] || 0) + 1;
      merken(key, n, null);
      return;
    }
    if (en === key) return;
    // Umgebende Leerzeichen erhalten — sonst kleben Wörter aneinander.
    const pre = (raw.match(/^\s*/) || [""])[0];
    const post = (raw.match(/\s*$/) || [""])[0];
    n.__mmDe = raw;
    n.nodeValue = pre + en + post;
  }

  function translateAttrs(el) {
    if (!el || el.nodeType !== 1 || el.hasAttribute("data-no-i18n")) return;
    if (el.hasAttribute("data-i18n-attr")) return;     // Schlüssel-Weg hat Vorrang
    ATTRS.forEach((a) => {
      if (!el.hasAttribute(a)) return;
      /* SCHON ÜBERSETZT → NIE WIEDER ANFASSEN.
         Ohne diese Zeile entsteht eine Endlosschleife: setAttribute löst eine
         Attribut-Mutation aus, der Observer ruft translateAttrs erneut, findet
         den (jetzt englischen) Wert nicht im Wörterbuch, schickt ihn zur
         Übersetzung, schreibt das Ergebnis — und das nächste Mal wieder.
         Live beobachtet: aus "Schließen" wurde in Sekunden
         "[EN] [EN] [EN] … Schließen", bei jedem Durchlauf eine Anfrage mehr.
         Für Textknoten leistet __mmDe dasselbe. */
      if (el.__mmDeAttrs && el.__mmDeAttrs[a] != null) return;
      const key = normText(el.getAttribute(a));
      if (key.length < 2 || !hatBuchstaben(key)) return;
      const en = PHRASES[key];
      if (en == null) { UNTRANSLATED[key] = (UNTRANSLATED[key] || 0) + 1; merken(key, el, a); return; }
      if (en === key) return;
      if (!el.__mmDeAttrs) el.__mmDeAttrs = {};
      el.__mmDeAttrs[a] = el.getAttribute(a);
      el.setAttribute(a, en);
    });
  }

  function translateTree(root) {
    if (lang !== "en" || phrasesState !== "ready" || !root) return;
    if (istRechtsseite() || istPremiumReader()) return;
    if (root.nodeType === 3) { translateNode(root); return; }
    const w = textNodeWalker(root);
    const liste = [];
    while (w.nextNode()) liste.push(w.currentNode);
    liste.forEach(translateNode);
    if (root.nodeType === 1) translateAttrs(root);
    if (root.querySelectorAll) {
      root.querySelectorAll("[placeholder],[title],[aria-label],[alt]").forEach(translateAttrs);
    }
  }

  /* Zurück auf Deutsch ohne Neuladen: jeder übersetzte Knoten trägt sein
     Original bei sich. Ein Reload wäre einfacher, würde aber getippte
     Formulareingaben verwerfen — im Checkout wäre das teuer. */
  function restoreGerman() {
    if (!HAS_DOM) return;
    const w = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT, null);
    const liste = [];
    while (w.nextNode()) liste.push(w.currentNode);
    liste.forEach((n) => { if (n.__mmDe != null) { n.nodeValue = n.__mmDe; n.__mmDe = null; } });
    (document.querySelectorAll("[placeholder],[title],[aria-label],[alt]") || []).forEach((el) => {
      if (!el.__mmDeAttrs) return;
      Object.keys(el.__mmDeAttrs).forEach((a) => el.setAttribute(a, el.__mmDeAttrs[a]));
      el.__mmDeAttrs = null;
    });
    const box = document.getElementById("mmLegalDe");
    if (box && box.parentNode) box.parentNode.removeChild(box);
  }

  let observer = null;
  function startObserver() {
    if (observer || !window.MutationObserver) return;
    observer = new MutationObserver((muts) => {
      if (lang !== "en" || phrasesState !== "ready") return;
      muts.forEach((m) => {
        if (m.type === "characterData") { translateNode(m.target); return; }
        if (m.type === "attributes" && m.target) { translateAttrs(m.target); return; }
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 3) translateNode(n);
          else if (n.nodeType === 1) translateTree(n);
        });
      });
    });
    observer.observe(document.documentElement, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
  }

  /* Rechtsseiten: ehrlicher Hinweis statt halber Übersetzung. */
  function legalNotice() {
    if (lang !== "en" || !istRechtsseite() || document.getElementById("mmLegalDe")) return;
    const box = document.createElement("div");
    box.id = "mmLegalDe";
    box.className = "alert alert-info";
    box.style.margin = "0 0 22px";
    box.setAttribute("data-no-i18n", "");
    box.innerHTML = '<span class="alert-icon">§</span><div>This page is available in German only. ' +
      'The German text is the legally binding version — a translation could change its meaning. ' +
      'If anything is unclear, <a href="kontakt.html" style="text-decoration:underline">write to us</a> and we will explain it in English.</div>';
    const ziel = document.querySelector("main .container") || document.querySelector("main");
    if (ziel) ziel.insertBefore(box, ziel.firstChild);
  }

  /* Englisch aktivieren: Wörterbuch holen, alles übersetzen, dann beobachten. */
  function runEnglish() {
    if (!HAS_DOM) return;
    loadPhrases(() => {
      if (lang !== "en") return;                  // zwischenzeitlich zurückgeschaltet
      translateTree(document.body || document.documentElement);
      legalNotice();
      startObserver();
      document.dispatchEvent(new CustomEvent("mm:translated", { detail: { missing: Object.keys(UNTRANSLATED).length } }));
    });
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll("[data-i18n]").forEach(el => {
      const v = t(el.getAttribute("data-i18n"));
      if (v != null) el.textContent = v;
    });
    root.querySelectorAll("[data-i18n-html]").forEach(el => {
      const v = t(el.getAttribute("data-i18n-html"));
      if (v != null) el.innerHTML = v;
    });
    root.querySelectorAll("[data-i18n-attr]").forEach(el => {
      el.getAttribute("data-i18n-attr").split(",").forEach(pair => {
        const [attr, key] = pair.split(":").map(s => s.trim());
        const v = t(key);
        if (v != null) el.setAttribute(attr, v);
      });
    });
    document.documentElement.lang = lang;
  }

  function setLang(l) {
    const vorher = lang;
    lang = norm(l) || "de";
    try { localStorage.setItem("mm_lang", lang); } catch (e) {}   // manuelle Wahl gewinnt künftig
    // Zurück auf Deutsch: erst die Volltext-Übersetzung zurückrollen, dann
    // die Schlüssel neu anwenden — sonst würde apply() über englische Knoten
    // schreiben, deren Original danach verloren wäre.
    if (vorher === "en" && lang !== "en") restoreGerman();
    apply();
    if (lang === "en") runEnglish();
    document.dispatchEvent(new CustomEvent("mm:langchange", { detail: { lang } }));
    const codeEls = document.querySelectorAll(".lang-code");
    codeEls.forEach(el => el.textContent = (lang === "de" ? "EN" : "DE"));
  }

  window.MM = window.MM || {};
  window.MM.i18n = {
    t,
    apply,
    setLang,
    norm,
    detectBrowser,
    fmtNum,
    fmtDate,
    plural,
    supported: SUPPORTED.slice(),
    get lang() { return lang; },
    /** Fehlende Keys, die zur Laufzeit angefragt wurden (QA/Diagnose). */
    missing() { return Object.assign({}, MISSING); },
    /** Sätze, die im EN-Modus kein Wörterbuch-Eintrag haben — nach Häufigkeit.
        So wächst das Wörterbuch aus dem echten Seiteninhalt, statt aus Raten:
        Seite auf Englisch öffnen, dann in der Konsole MM.i18n.untranslated() */
    untranslated() {
      return Object.keys(UNTRANSLATED)
        .sort((a, b) => UNTRANSLATED[b] - UNTRANSLATED[a] || a.localeCompare(b))
        .map((k) => ({ text: k, n: UNTRANSLATED[k] }));
    },
    /** Zahl der bekannten Übersetzungen (Glossar + Cache + Dienst-Antworten). */
    phraseCount() { return Object.keys(PHRASES).length; },
    /** Zustand des Übersetzungsdienstes — für QA und die Betreiber-Ansicht. */
    status() {
      return {
        lang: lang,
        bekannt: Object.keys(PHRASES).length,
        wartend: WARTEND.size,
        angefragt: ANGEFRAGT.size,
        /* geraet: "ready" = dieser Browser übersetzt selbst, unbegrenzt und
           ohne Server. "none" = Server-Weg (Tageslimit). */
        geraet: geraetState,
        dienst: dienstAus ? "aus" : (dienstUrl() ? "an" : "nicht konfiguriert")
      };
    },
    /** Lokalen Übersetzungs-Cache verwerfen (nach Textänderungen zum Testen). */
    clearCache() {
      try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
      return true;
    },
    /** Übersetzt einen nachträglich eingefügten Bereich (normalerweise
        übernimmt das der MutationObserver von selbst). */
    translateTree,
    toggle() { setLang(lang === "de" ? "en" : "de"); },
    dict: DICT,
    /** Registriert zusätzliche Übersetzungen (für Seiten-spezifische Strings). */
    extend(obj) { Object.assign(DICT, obj); apply(); }
  };

  /* Beim Laden: Schlüssel anwenden und — falls Englisch gewählt ist — die
     Volltext-Übersetzung starten. Das Wörterbuch lädt parallel zum restlichen
     Seitenaufbau; deutsche Besucher laden es nie. */
  function boot() {
    apply();
    if (lang === "en") runEnglish();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
