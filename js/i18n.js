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
    "nav.check":   { de: "Score-Check", en: "Score Check" },
    "nav.coaching":{ de: "Coaching", en: "Coaching" },
    "nav.tools":   { de: "Rechner", en: "Calculators" },
    "nav.tracker": { de: "Tracker", en: "Tracker" },
    "nav.protokoll":{ de: "Das Protokoll", en: "The Protocol" },
    "nav.mycourse":{ de: "Mein Programm", en: "My Program" },
    "nav.shop":    { de: "Shop", en: "Shop" },
    "nav.more":    { de: "Mehr", en: "More" },
    "nav.ebooks":  { de: "Ebooks", en: "Ebooks" },
    "nav.blood":   { de: "Blutwerte", en: "Blood Values" },
    "nav.about":   { de: "Über", en: "About" },
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
    "foot.ebooks":  { de: "Ebooks", en: "Ebooks" },
    "foot.blood":   { de: "Blutwerte verstehen", en: "Understand Blood Values" },
    "foot.about":   { de: "Über MaleMetrix", en: "About MaleMetrix" },
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
    "cta.startCheck": { de: "Kostenlosen MaleMetrix Check starten", en: "Start the free MaleMetrix Check" },
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

    /* ---------- Homepage ---------- */
    "home.badge": { de: "Performance-System statt Fitnessprogramm", en: "A performance system, not a fitness program" },
    "home.h1a": { de: "Das Performance-System für", en: "The performance system for" },
    "home.h1b": { de: "alle Männer", en: "all men" },
    "home.lead": { de: "Verliere Bauchfett, baue Kraft auf und bekomme wieder Energie und Struktur — mit Training, Ernährung, Schlaf und messbarem Tracking. Kein Crash. Kein Bro-Science. Ein System, das zu Job und Familie passt.",
                   en: "Lose belly fat, build strength and get your energy and structure back — with training, nutrition, sleep and measurable tracking. No crash. No bro-science. A system that fits your job and family." },
    "home.trust1": { de: "Für Männer mit Job, Familie & wenig Zeit", en: "For men with a job, family & little time" },
    "home.trust2": { de: "Kein Crash-Diät-System", en: "No crash-diet system" },
    "home.trust3": { de: "Keine medizinischen Versprechen — klare Lifestyle-Struktur", en: "No medical promises — clear lifestyle structure" },
    "home.freeTitle": { de: "Erst nutzen, dann entscheiden — komplett kostenlos.", en: "Use it first, decide later — completely free." },
    "home.freebar": { de: "100 % kostenlos: Score-Check, 19 Rechner, Training-Tracker & Ebooks — ohne Anmeldung.",
                      en: "100% free: score check, 19 calculators, workout tracker & ebooks — no signup." },

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
    "trk.h1a": { de: "Dein", en: "Your" },
    "trk.h1b": { de: "Training-Tracker", en: "workout tracker" },
    "trk.lead": { de: "Logge Sätze, Gewichte und Wiederholungen — mit Auto-Vorschlag aus deinem letzten Training, PRs, geschätztem 1RM und Fortschritts-Charts. Dazu Cardio und Körpermaße. Alles lokal auf deinem Gerät, ohne Konto.",
                  en: "Log sets, weights and reps — with auto-fill from your last session, PRs, estimated 1RM and progress charts. Plus cardio and body metrics. All stored locally on your device, no account." },
    "trk.tab.workout": { de: "Training", en: "Workout" },
    "trk.tab.history": { de: "Verlauf", en: "History" },
    "trk.tab.cardio": { de: "Cardio", en: "Cardio" },
    "trk.tab.body": { de: "Körper", en: "Body" },
    "trk.tab.templates": { de: "Pläne", en: "Routines" },
    "trk.export": { de: "Daten sichern", en: "Export data" },
    "trk.import": { de: "Daten laden", en: "Import data" },

    /* ---------- Ebooks-Seite ---------- */
    "eb.eyebrow": { de: "Kostenlose Ebooks · Lesen ohne Anmeldung", en: "Free ebooks · read without signup" },
    "eb.h1a": { de: "Wissen, das", en: "Knowledge that" },
    "eb.h1b": { de: "wirklich umsetzbar ist", en: "actually works" },
    "eb.lead": { de: "Kompakte Guides für Männer — Training, Ernährung, Hormone, Blutwerte und mehr. Direkt im Browser lesen, kostenlos. Den PDF-Download schaltest du mit deiner E-Mail frei.",
                 en: "Compact guides for men — training, nutrition, hormones, blood values and more. Read instantly in your browser, free. Unlock the PDF download with your email." },
    "eb.box.title": { de: "Alle Ebooks als PDF — kostenlos freischalten", en: "All ebooks as PDF — unlock for free" },
    "eb.box.text": { de: "Trag deine E-Mail ein, lade jedes Ebook als PDF und erhalte gelegentlich ehrliche Tipps für Männer. Jederzeit abbestellbar.", en: "Enter your email, download every ebook as PDF and get the occasional honest tip for men. Unsubscribe anytime." },
    "eb.box.consent": { de: "Ich akzeptiere die Datenschutzerklärung und möchte die Ebooks & Tipps per E-Mail (Double-Opt-In).", en: "I accept the privacy policy and want the ebooks & tips by email (double opt-in)." },
    "eb.box.btn": { de: "PDF-Downloads freischalten", en: "Unlock PDF downloads" },
    "eb.read": { de: "Jetzt lesen", en: "Read now" },
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
    "eb.ctaTitle": { de: "Wissen ist da. Jetzt fehlt das System.", en: "The knowledge is here. Now you need the system." },
    "eb.ctaText": { de: "Die Ebooks zeigen dir das Was. Der kostenlose Score zeigt dir, wo bei dir zuerst angesetzt werden muss.", en: "The ebooks show you the what. The free score shows you where to start first." }
  };

  let lang = "de";
  try { lang = localStorage.getItem("mm_lang") || "de"; } catch (e) {}
  if (lang !== "de" && lang !== "en") lang = "de";

  function t(key) {
    const e = DICT[key];
    return e ? (e[lang] || e.de) : null;
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
    lang = (l === "en") ? "en" : "de";
    try { localStorage.setItem("mm_lang", lang); } catch (e) {}
    apply();
    document.dispatchEvent(new CustomEvent("mm:langchange", { detail: { lang } }));
    const codeEls = document.querySelectorAll(".lang-code");
    codeEls.forEach(el => el.textContent = (lang === "de" ? "EN" : "DE"));
  }

  window.MM = window.MM || {};
  window.MM.i18n = {
    t,
    apply,
    setLang,
    get lang() { return lang; },
    toggle() { setLang(lang === "de" ? "en" : "de"); },
    dict: DICT,
    /** Registriert zusätzliche Übersetzungen (für Seiten-spezifische Strings). */
    extend(obj) { Object.assign(DICT, obj); apply(); }
  };

  // Früh anwenden (vor DOMContentLoaded-Inhalt, der schon da ist)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => apply());
  } else {
    apply();
  }
})();
