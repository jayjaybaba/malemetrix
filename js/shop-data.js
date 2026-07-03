/* ==========================================================================
   MaleMetrix Shop — Produkte
   Preise bewusst niedrig für den Start (Founder-Phase).
   ========================================================================== */

(function () {
  "use strict";

  /* Wiederverwendbare SVG-Bausteine für Produktvisuals */
  const defs =
    '<defs>' +
    '<linearGradient id="pgGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
    '<stop offset="0%" stop-color="#2e7cf6"/><stop offset="100%" stop-color="#00c2ff"/></linearGradient>' +
    '<radialGradient id="pgGlow" cx="50%" cy="35%" r="70%">' +
    '<stop offset="0%" stop-color="rgba(46,124,246,0.22)"/><stop offset="100%" stop-color="rgba(46,124,246,0)"/></radialGradient>' +
    '</defs>';

  function visual(inner) {
    return '<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' +
      defs +
      '<rect width="400" height="250" fill="#0d1119"/>' +
      '<rect width="400" height="250" fill="url(#pgGlow)"/>' +
      '<g stroke="rgba(255,255,255,0.04)"><line x1="0" y1="62" x2="400" y2="62"/><line x1="0" y1="125" x2="400" y2="125"/><line x1="0" y1="187" x2="400" y2="187"/><line x1="100" y1="0" x2="100" y2="250"/><line x1="200" y1="0" x2="200" y2="250"/><line x1="300" y1="0" x2="300" y2="250"/></g>' +
      inner +
      '</svg>';
  }

  window.MM_PRODUCTS = [

    /* ---------- Digital ---------- */
    {
      id: "protokoll",
      name: "DAS PROTOKOLL — Der komplette Männer-Guide",
      cat: "digital", catLabel: "Digital · Ebook · Sofort-Zugang",
      price: 49.00,
      compareAt: 199.00,
      digital: true,
      emoji: "📕",
      badge: "Bestseller",
      desc: "Das gesamte MaleMetrix-Wissen in einem einzigen Premium-Ebook: Training, Fettabbau, Hormone, Blutwerte, Schlaf, Supplemente — und das Herzstück: der 12-Wochen-Masterplan, der alles Woche für Woche in einen Fahrplan gießt. Alles, was du selbst in der Hand hast. Kein Bro-Science, kein Hype — das ehrliche Komplettsystem für Männer, die Ergebnisse wollen. Sofortiger Online-Zugang nach dem Kauf.",
      details: [
        "10 Module: Mindset & System, Training (täglich + Push/Pull/Legs), Fettabbau ohne Hunger, Supplemente, Schlaf-Stack, Blutwerte-Komplettpanel, Hormone & Testosteron (natürlich), Sexuelle Gesundheit, der 12-Wochen-Masterplan",
        "Das Herzstück: der 12-Wochen-Masterplan — Woche für Woche durchgeplant, mit Standard-Woche, Kontrollterminen und Troubleshooting",
        "INKLUSIVE: das interaktive 12-Wochen-Programm mit Wochen-Aufgaben & Fortschritts-Tracking im Browser (79 € Wert) — derselbe Zugangscode schaltet beides frei",
        "Hormone &amp; Testosteron natürlich optimieren — die kostenlosen Hebel, die wirklich zählen",
        "Blutwerte-Komplettpanel inkl. kleinem Blutbild, ApoB, Lp(a), Cystatin C, PSA & freiem PSA, Schilddrüse",
        "Sofortiger Online-Zugang per Code — kein Warten, jederzeit auf allen Geräten lesbar",
        "Bonus: druckbare Arzt-Checkliste + Wochenplan-Vorlagen",
        "49 € statt 199 € — Founder-Preis, solange die Seite jung ist",
        "30 Tage Geld-zurück: Wenn du keinen einzigen umsetzbaren Hebel findest, bekommst du dein Geld zurück"
      ],
      cta: { label: "Alles ansehen →", href: "protokoll.html" },
      svg: visual(
        '<rect x="132" y="42" width="136" height="170" rx="12" fill="#161b26" stroke="url(#pgGrad)" stroke-width="2"/>' +
        '<rect x="132" y="42" width="136" height="46" rx="12" fill="url(#pgGrad)" opacity="0.9"/>' +
        '<text x="200" y="72" font-family="monospace" font-size="17" font-weight="bold" fill="#ffffff" text-anchor="middle">PROTOKOLL</text>' +
        '<g stroke="rgba(255,255,255,0.22)" stroke-width="3" stroke-linecap="round"><line x1="152" y1="108" x2="248" y2="108"/><line x1="152" y1="124" x2="230" y2="124"/><line x1="152" y1="140" x2="242" y2="140"/><line x1="152" y1="156" x2="220" y2="156"/><line x1="152" y1="172" x2="238" y2="172"/><line x1="152" y1="188" x2="210" y2="188"/></g>'
      )
    },
    /* Das 12-Wochen-Programm ist seit der Zusammenlegung Teil von
       DAS PROTOKOLL (ein Kauf, ein Code) — kein eigenes Produkt mehr. */
    {
      id: "express-plan",
      name: "MaleMetrix Express-Plan",
      cat: "digital", catLabel: "Digital · PDF · Sofort",
      price: 9.00,
      digital: true,
      emoji: "⚡",
      badge: "Sofort-Start",
      desc: "Dein 14-Tage-Sofortplan als PDF — abgestimmt auf den Engpass aus deinem MaleMetrix Score. Konkrete Trainings-, Ernährungs- und Schlaf-Schritte, die du sofort umsetzt. Der schnellste Weg von Wissen zu Umsetzung.",
      details: [
        "14-Tage-Sofortplan, abgestimmt auf deinen Score-Engpass",
        "Tägliche, konkrete Mini-Aufgaben (kein Theorie-Wälzer)",
        "Protein- & Schritte-Zielwerte für deinen Alltag",
        "Checkliste zum Abhaken + Fortschritts-Tracker-Vorlage",
        "Anrechenbar: 9 € werden beim Coaching gutgeschrieben",
        "Lieferung per E-Mail innerhalb von 24 h nach Zahlungseingang"
      ],
      svg: visual(
        '<circle cx="200" cy="120" r="56" fill="#161b26" stroke="rgba(255,255,255,0.15)"/>' +
        '<path d="M205 80 L175 128 L198 128 L193 165 L228 112 L203 112 Z" fill="url(#pgGrad)"/>' +
        '<circle cx="200" cy="120" r="42" fill="none" stroke="url(#pgGrad)" stroke-width="2" opacity="0.5"/>'
      )
    },
    {
      id: "starter-report",
      name: "MaleMetrix Starter Report",
      cat: "digital", catLabel: "Digital · PDF",
      price: 19.00,
      digital: true,
      emoji: "📄",
      badge: "Personalisiert",
      desc: "Dein ausführlicher Performance-Report auf Basis deines Scores: Executive Summary, 30-Tage-Startplan, Trainingsstruktur, Ernährungs-Setup und Blutwerte-Checkliste — von uns persönlich auf dein Check-Ergebnis abgestimmt.",
      details: [
        "Ausführlicher PDF-Report zu deinem MaleMetrix Score",
        "30-Tage-Startplan + 7-Tage-Schnellstart",
        "Trainingsstruktur (3-Tage-System) für deinen Typ",
        "Protein- & Kalorienempfehlung für deinen Alltag",
        "Blutwerte-Checkliste fürs Arztgespräch",
        "Lieferung per E-Mail innerhalb von 48 h nach Zahlungseingang"
      ],
      svg: visual(
        '<rect x="140" y="35" width="120" height="180" rx="10" fill="#161b26" stroke="rgba(255,255,255,0.15)"/>' +
        '<rect x="155" y="55" width="55" height="8" rx="4" fill="url(#pgGrad)"/>' +
        '<rect x="155" y="72" width="90" height="5" rx="2.5" fill="rgba(255,255,255,0.18)"/>' +
        '<rect x="155" y="84" width="75" height="5" rx="2.5" fill="rgba(255,255,255,0.12)"/>' +
        '<circle cx="200" cy="135" r="28" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="6"/>' +
        '<path d="M 200 107 A 28 28 0 1 1 176 149" fill="none" stroke="url(#pgGrad)" stroke-width="6" stroke-linecap="round"/>' +
        '<text x="200" y="141" font-family="monospace" font-size="16" font-weight="bold" fill="#eef2f7" text-anchor="middle">74</text>' +
        '<rect x="155" y="178" width="90" height="5" rx="2.5" fill="rgba(255,255,255,0.12)"/>' +
        '<rect x="155" y="190" width="60" height="5" rx="2.5" fill="rgba(255,255,255,0.08)"/>'
      )
    },
    {
      id: "energie-guide",
      name: "Schlaf & Energie Guide",
      cat: "digital", catLabel: "Digital · PDF",
      price: 9.90,
      digital: true,
      emoji: "🌙",
      desc: "Das 40-Seiten-System für besseren Schlaf und stabile Tagesenergie: Abendroutine, Koffein-Timing, Schichtarbeit-Strategien und der 14-Tage Energy-Reset-Plan.",
      details: [
        "40 Seiten, sofort umsetzbar",
        "14-Tage Energy-Reset-Plan",
        "Koffein-, Alkohol- & Bildschirm-Protokoll",
        "Strategien für Väter & Vielarbeiter",
        "Lieferung per E-Mail innerhalb von 48 h nach Zahlungseingang"
      ],
      svg: visual(
        '<circle cx="200" cy="118" r="52" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>' +
        '<path d="M 222 86 A 42 42 0 1 0 232 140 A 34 34 0 0 1 222 86 Z" fill="url(#pgGrad)" opacity="0.9"/>' +
        '<circle cx="155" cy="75" r="3" fill="#00c2ff"/><circle cx="260" cy="95" r="2" fill="#2e7cf6"/><circle cx="248" cy="62" r="2.5" fill="rgba(255,255,255,0.5)"/>' +
        '<rect x="120" y="195" width="160" height="6" rx="3" fill="rgba(255,255,255,0.08)"/>' +
        '<rect x="120" y="195" width="104" height="6" rx="3" fill="url(#pgGrad)"/>'
      )
    },

    /* ---------- Test-Kits ---------- */
    {
      id: "blood-basic",
      name: "BloodMetrix Home-Kit Basis",
      cat: "kit", catLabel: "Test-Kit · Partnerlabor",
      price: 44.90,
      digital: false,
      emoji: "🩸",
      badge: "Baseline",
      desc: "Deine hormonelle & metabolische Baseline bequem von zu Hause: Testosteron (gesamt), Vitamin D und HbA1c. Probenahme zu Hause, Analyse im akkreditierten Partnerlabor, Ergebnis ärztlich validiert.",
      details: [
        "3 Marker: Testosteron gesamt · Vitamin D · HbA1c",
        "Einfache Selbstentnahme (Fingerstich) mit Anleitung",
        "Analyse im akkreditierten deutschen Partnerlabor",
        "Ergebnisbericht ärztlich validiert, digital abrufbar",
        "Inkl. MaleMetrix Einordnungshilfe fürs Arztgespräch",
        "Kein Diagnose-Ersatz: auffällige Werte gehören zum Arzt"
      ],
      svg: visual(
        '<rect x="150" y="50" width="100" height="150" rx="14" fill="#161b26" stroke="rgba(255,255,255,0.15)"/>' +
        '<path d="M200 85 C 188 105 182 115 182 126 a 18 18 0 0 0 36 0 c 0 -11 -6 -21 -18 -41 Z" fill="url(#pgGrad)"/>' +
        '<rect x="168" y="160" width="64" height="6" rx="3" fill="rgba(255,255,255,0.15)"/>' +
        '<rect x="168" y="174" width="44" height="6" rx="3" fill="rgba(255,255,255,0.1)"/>' +
        '<circle cx="118" cy="125" r="14" fill="none" stroke="rgba(46,124,246,0.5)" stroke-width="2"/>' +
        '<path d="M112 125 l4 4 l8 -8" stroke="#00c2ff" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
        '<circle cx="282" cy="125" r="14" fill="none" stroke="rgba(46,124,246,0.5)" stroke-width="2"/>' +
        '<path d="M276 125 l4 4 l8 -8" stroke="#00c2ff" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
      )
    },
    {
      id: "blood-performance",
      name: "BloodMetrix Home-Kit Performance",
      cat: "kit", catLabel: "Test-Kit · Partnerlabor",
      price: 84.90,
      digital: false,
      emoji: "🧪",
      badge: "Komplett",
      desc: "Das erweiterte Männer-Panel: Testosteron (gesamt), SHBG, Lipidprofil, HbA1c, hs-CRP, Ferritin und Vitamin D. Die Datenbasis, mit der dein Arztgespräch und dein Coaching wirklich etwas anfangen können.",
      details: [
        "7 Marker: Testosteron · SHBG · Lipide · HbA1c · hs-CRP · Ferritin · Vitamin D",
        "Freies Testosteron rechnerisch eingeordnet",
        "Einfache Selbstentnahme mit Schritt-für-Schritt-Anleitung",
        "Analyse im akkreditierten deutschen Partnerlabor, ärztlich validiert",
        "Inkl. Verlaufstabelle + Arztgespräch-Vorbereitung von MaleMetrix",
        "Kein Diagnose-Ersatz: auffällige Werte gehören zum Arzt"
      ],
      svg: visual(
        '<g transform="translate(160,40)">' +
        '<rect x="0" y="20" width="22" height="130" rx="11" fill="#161b26" stroke="rgba(255,255,255,0.18)"/>' +
        '<rect x="2" y="80" width="18" height="68" rx="9" fill="url(#pgGrad)" opacity="0.85"/>' +
        '<rect x="34" y="20" width="22" height="130" rx="11" fill="#161b26" stroke="rgba(255,255,255,0.18)"/>' +
        '<rect x="36" y="60" width="18" height="88" rx="9" fill="url(#pgGrad)" opacity="0.65"/>' +
        '<rect x="68" y="20" width="22" height="130" rx="11" fill="#161b26" stroke="rgba(255,255,255,0.18)"/>' +
        '<rect x="70" y="100" width="18" height="48" rx="9" fill="url(#pgGrad)" opacity="0.95"/>' +
        '</g>' +
        '<path d="M110 200 L 290 200" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>' +
        '<path d="M120 190 L150 170 L180 178 L215 150 L250 160 L280 138" stroke="#00c2ff" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
      )
    },
    {
      id: "baseline-kit",
      name: "MaleMetrix Baseline Kit",
      cat: "kit", catLabel: "Starter-Kit",
      price: 29.90,
      digital: false,
      emoji: "📦",
      badge: "Bestseller",
      desc: "Alles für deine saubere Ausgangslage in einer Box: Roll-Maßband, 12-Wochen Tracking-Journal, Schnellstart-Karten für Training & Ernährung und die gedruckte Blutwerte-Checkliste.",
      details: [
        "Roll-Maßband mit Arretierung (Bauchumfang-Messung)",
        "12-Wochen Tracking-Journal (A5, 120 Seiten)",
        "6 Schnellstart-Karten: Training A/B/C + Ernährungs-Basics",
        "Gedruckte Blutwerte-Checkliste für Männer",
        "Spart 4,80 € gegenüber Einzelkauf"
      ],
      svg: visual(
        '<path d="M200 45 L290 85 L290 175 L200 215 L110 175 L110 85 Z" fill="#161b26" stroke="rgba(255,255,255,0.15)"/>' +
        '<path d="M110 85 L200 125 L290 85" fill="none" stroke="rgba(255,255,255,0.15)"/>' +
        '<path d="M200 125 L200 215" stroke="rgba(255,255,255,0.15)"/>' +
        '<path d="M155 65 L245 105 L245 135 L155 95 Z" fill="url(#pgGrad)" opacity="0.25"/>' +
        '<text x="252" y="160" font-family="monospace" font-size="13" fill="#00c2ff" text-anchor="middle">M</text>' +
        '<circle cx="148" cy="160" r="3" fill="#2e7cf6"/><circle cx="148" cy="172" r="3" fill="rgba(255,255,255,0.3)"/><circle cx="148" cy="184" r="3" fill="rgba(255,255,255,0.15)"/>'
      )
    },

    /* ---------- Zubehör / Gadgets ---------- */
    {
      id: "massband",
      name: "MaleMetrix Roll-Maßband",
      cat: "zubehoer", catLabel: "Tracking-Zubehör",
      price: 8.90,
      digital: false,
      emoji: "📏",
      desc: "Das wichtigste Messgerät für Männer — wichtiger als die Waage. Roll-Maßband mit Arretierung für reproduzierbare Bauchumfang-Messung, inkl. Mess-Anleitung nach MaleMetrix Standard.",
      details: [
        "150 cm, selbstaufrollend mit Arretierung",
        "Reproduzierbare Messung dank Spannmechanik",
        "Inkl. Anleitung: richtig messen auf Nabelhöhe",
        "Passt in jede Sporttasche"
      ],
      svg: visual(
        '<circle cx="200" cy="120" r="58" fill="#161b26" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>' +
        '<circle cx="200" cy="120" r="20" fill="#0d1119" stroke="rgba(255,255,255,0.18)"/>' +
        '<path d="M258 120 L 320 120 L 320 138 L 258 138" fill="url(#pgGrad)" opacity="0.9"/>' +
        '<g stroke="#0d1119" stroke-width="2"><line x1="270" y1="120" x2="270" y2="128"/><line x1="282" y1="120" x2="282" y2="132"/><line x1="294" y1="120" x2="294" y2="128"/><line x1="306" y1="120" x2="306" y2="132"/></g>' +
        '<circle cx="200" cy="120" r="40" fill="none" stroke="url(#pgGrad)" stroke-width="3" opacity="0.6"/>'
      )
    },
    {
      id: "journal",
      name: "12-Wochen Tracking-Journal",
      cat: "zubehoer", catLabel: "Tracking-Zubehör",
      price: 16.90,
      digital: false,
      emoji: "📓",
      desc: "Das Trainings- und Tracking-Logbuch nach dem MaleMetrix System: Wochen-Check-ins, Kraftwerte, Bauchumfang, Schlaf und Energie — 12 Wochen auf 120 strukturierten Seiten.",
      details: [
        "A5-Hardcover, 120 Seiten, liegt flach auf",
        "Vorstrukturiert: Training A/B/C mit Progression",
        "Wöchentlicher Check-in: Gewicht, Bauch, Schlaf, Energie",
        "Baseline- & Re-Check-Seiten für Woche 1 und 12"
      ],
      svg: visual(
        '<rect x="135" y="40" width="130" height="170" rx="10" fill="#161b26" stroke="rgba(255,255,255,0.15)"/>' +
        '<rect x="135" y="40" width="14" height="170" rx="6" fill="url(#pgGrad)" opacity="0.8"/>' +
        '<rect x="168" y="65" width="70" height="7" rx="3.5" fill="rgba(255,255,255,0.2)"/>' +
        '<g fill="rgba(255,255,255,0.1)"><rect x="168" y="90" width="80" height="4" rx="2"/><rect x="168" y="102" width="65" height="4" rx="2"/><rect x="168" y="114" width="75" height="4" rx="2"/></g>' +
        '<g><rect x="168" y="140" width="18" height="34" rx="3" fill="rgba(46,124,246,0.45)"/><rect x="192" y="130" width="18" height="44" rx="3" fill="rgba(46,124,246,0.7)"/><rect x="216" y="118" width="18" height="56" rx="3" fill="url(#pgGrad)"/></g>' +
        '<rect x="168" y="186" width="50" height="4" rx="2" fill="rgba(255,255,255,0.1)"/>'
      )
    },
    {
      id: "smart-scale",
      name: "MaleMetrix Smart Scale",
      cat: "zubehoer", catLabel: "Tracking-Gadget",
      price: 39.90,
      digital: false,
      emoji: "⚖️",
      badge: "Gadget",
      desc: "Bluetooth-Körperwaage mit App-Anbindung: Gewicht, Trend und Körperdaten automatisch geloggt. Der Gewichtstrend — nicht die Tagesschwankung — ist, was zählt.",
      details: [
        "Bluetooth, kompatibel mit iOS & Android (Apple Health / Google Fit)",
        "Gewichtstrend-Ansicht statt Einzelwert-Panik",
        "Bis 180 kg, 4 Präzisionssensoren",
        "Gehärtetes Sicherheitsglas, flaches Design",
        "Hinweis: Bioimpedanz-Körperfettwerte sind Schätzwerte — wir coachen nach Trend + Bauchumfang"
      ],
      svg: visual(
        '<rect x="130" y="55" width="140" height="140" rx="20" fill="#161b26" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>' +
        '<rect x="160" y="75" width="80" height="34" rx="8" fill="#0d1119" stroke="rgba(46,124,246,0.4)"/>' +
        '<text x="200" y="98" font-family="monospace" font-size="17" font-weight="bold" fill="#00c2ff" text-anchor="middle">84.6</text>' +
        '<circle cx="165" cy="160" r="9" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>' +
        '<circle cx="235" cy="160" r="9" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>' +
        '<path d="M285 100 q 14 20 0 40" stroke="#2e7cf6" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
        '<path d="M295 90 q 24 30 0 60" stroke="rgba(46,124,246,0.4)" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
      )
    }
  ];
})();
