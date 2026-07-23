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
    "nav.system":  { de: "System", en: "System" },
    "nav.check":   { de: "Score", en: "Score" },
    "nav.coaching":{ de: "1:1 Coaching", en: "1:1 Coaching" },
    "nav.startScore": { de: "Score starten", en: "Start your score" },
    "nav.tools":   { de: "Rechner", en: "Calculators" },
    "nav.tracker": { de: "Tracker", en: "Tracker" },
    "nav.protokoll":{ de: "Das Protokoll", en: "The Protocol" },
    "nav.mycourse":{ de: "My MaleMetrix", en: "My MaleMetrix" },
    "nav.mymm":    { de: "My MaleMetrix", en: "My MaleMetrix" },
    "nav.shop":    { de: "Shop", en: "Shop" },
    "nav.more":    { de: "Wissen", en: "Knowledge" },
    "nav.ebooks":  { de: "Library", en: "Library" },
    "nav.library": { de: "Library", en: "Library" },
    "nav.magazine":{ de: "Magazin", en: "Magazine" },
    "nav.blood":   { de: "Blutwerte", en: "Blood Values" },
    "nav.about":   { de: "Über", en: "About" },
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
    "foot.ebooks":  { de: "Ebooks", en: "Ebooks" },
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
    "cta.startCheck": { de: "Kostenlosen MaleMetrix Score starten", en: "Start the free MaleMetrix Score" },
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
    "home.h1": { de: "Bau den Körper.<br><span class=\"text-grad\">Schütz das System.</span>",
                 en: "Build the body.<br><span class=\"text-grad\">Protect the system.</span>" },
    "home.lead": { de: "Training, Ernährung, Schlaf, Hormone und Gesundheit für Männer, die Job und Familie haben — datenbasiert statt nach Bauchgefühl. MaleMetrix findet zuerst deinen größten Engpass, bevor du Zeit, Geld oder Energie in die falschen Dinge steckst.",
                   en: "Training, nutrition, sleep, hormones and health for men with a job and a family — data-driven, not guesswork. MaleMetrix first finds your biggest bottleneck, before you pour time, money or energy into the wrong things." },
    "home.trustline": { de: "~10 Minuten · kostenlos · sofortige Auswertung · kein E-Mail-Zwang", en: "~10 minutes · free · instant results · no email required" },
    "home.howLink": { de: "So funktioniert MaleMetrix ↓", en: "How MaleMetrix works ↓" },

    /* Sektions-Kicker + Überschriften */
    "home.s.problem.k": { de: "Das eigentliche Problem", en: "The real problem" },
    "home.s.problem.h": { de: "Du brauchst nicht mehr Informationen. Du brauchst die richtige <span class=\"text-grad\">Reihenfolge</span>.",
                          en: "You don’t need more information. You need the right <span class=\"text-grad\">order</span>." },
    "home.s.system.k": { de: "Das MaleMetrix System", en: "The MaleMetrix system" },
    "home.s.system.h": { de: "Ein System. Vier klare Rollen.", en: "One system. Four clear roles." },
    "home.s.score.k": { de: "Der MaleMetrix Score", en: "The MaleMetrix Score" },
    "home.s.score.h": { de: "Deine Performance besteht aus <span class=\"text-grad\">mehreren Systemen</span>.",
                        en: "Your performance is made of <span class=\"text-grad\">several systems</span>." },
    "home.s.wege.k": { de: "Nach dem Score", en: "After the Score" },
    "home.s.wege.h": { de: "Wie möchtest du MaleMetrix nutzen?", en: "How do you want to use MaleMetrix?" },
    "home.s.lib.k": { de: "Sekundär · zum Vertiefen", en: "Secondary · go deeper" },
    "home.s.lib.h": { de: "MaleMetrix Library &amp; Tools", en: "MaleMetrix Library &amp; Tools" },
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
    "home.s.final.k": { de: "Kostenlos · ~10 Minuten", en: "Free · ~10 minutes" },
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
    "eb.eyebrow": { de: "Kostenlose Ebooks · Lesen ohne Anmeldung", en: "Free ebooks · read without signup" },
    "eb.h1a": { de: "MaleMetrix", en: "MaleMetrix" },
    "eb.h1b": { de: "Library", en: "Library" },
    "eb.lead": { de: "Deep Dives zu den Systemen hinter männlicher Gesundheit und Performance — Körper, Engine, Recovery, Hormone, Health. Direkt im Browser lesen. Wissen, das dein System vertieft.",
                 en: "Deep dives into the systems that drive male health and performance — body, engine, recovery, hormones, health. Read instantly in your browser. Knowledge that deepens your system." },
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
    lang = norm(l) || "de";
    try { localStorage.setItem("mm_lang", lang); } catch (e) {}   // manuelle Wahl gewinnt künftig
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
    norm,
    detectBrowser,
    fmtNum,
    fmtDate,
    plural,
    supported: SUPPORTED.slice(),
    get lang() { return lang; },
    /** Fehlende Keys, die zur Laufzeit angefragt wurden (QA/Diagnose). */
    missing() { return Object.assign({}, MISSING); },
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
