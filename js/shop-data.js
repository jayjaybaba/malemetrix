/* ==========================================================================
   MaleMetrix Shop — Produkte
   Preise bewusst niedrig für den Start (Launch-Phase).
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
      cat: "digital", catLabel: "Digital · Performance-System · Sofort-Zugang",
      price: 49.00,
      digital: true,
      emoji: "📕",
      badge: "System + Programm",
      desc: "Das gesamte MaleMetrix-Wissen als ein digitales Performance-System: Training, Fettabbau, Hormone, Blutwerte, Schlaf, Supplemente — und das Herzstück: der 12-Wochen-Masterplan, der alles Woche für Woche in einen Fahrplan gießt. Alles, was du selbst in der Hand hast. Kein Bro-Science, kein Hype — das ehrliche Komplettsystem für Männer, die Ergebnisse wollen. Sofortiger Online-Zugang nach dem Kauf.",
      details: [
        "10 Module: Mindset & System, Training (täglich + Push/Pull/Legs), Fettabbau ohne Hunger, Supplemente, Schlaf-Stack, Blutwerte-Komplettpanel, Hormone & Testosteron (natürlich), Sexuelle Gesundheit, der 12-Wochen-Masterplan",
        "Das Herzstück: der 12-Wochen-Masterplan — Woche für Woche durchgeplant, mit Standard-Woche, Kontrollterminen und Troubleshooting",
        "INKLUSIVE: das interaktive 12-Wochen-Programm mit Wochen-Aufgaben & Fortschritts-Tracking im Browser — derselbe Zugangscode schaltet beides frei",
        "Hormone &amp; Testosteron natürlich optimieren — die kostenlosen Hebel, die wirklich zählen",
        "Blutwerte-Komplettpanel inkl. kleinem Blutbild, ApoB, Lp(a), Cystatin C, PSA & freiem PSA, Schilddrüse",
        "Sofortiger Online-Zugang per Code — kein Warten, jederzeit auf allen Geräten lesbar",
        "Bonus: druckbare Arzt-Checkliste + Wochenplan-Vorlagen",
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

  ];
})();
