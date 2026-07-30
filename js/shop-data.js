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
    '<stop offset="0%" stop-color="#258CFF"/><stop offset="100%" stop-color="#16C4F4"/></linearGradient>' +
    '<radialGradient id="pgGlow" cx="50%" cy="35%" r="70%">' +
    '<stop offset="0%" stop-color="rgba(37, 140, 255,0.22)"/><stop offset="100%" stop-color="rgba(37, 140, 255,0)"/></radialGradient>' +
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
      price: 99.00,
      digital: true,
      emoji: "📕",
      badge: "System + Programm",
      desc: "Das gesamte MaleMetrix-Wissen als ein digitales Performance-System: Kraft, Cardio & VO₂, Körperkomposition (Cut · Recomp · Build · Perform), Schlaf, Supplemente, Health- & Longevity-Dashboard, Hormone, Fertilität — und das Herzstück: der 12-Wochen-Masterplan, der alles Woche für Woche in einen Fahrplan gießt. Alles, was du selbst in der Hand hast. Kein Bro-Science, kein Hype — das ehrliche Komplettsystem für Männer, die Ergebnisse wollen. Sofortiger Online-Zugang nach dem Kauf.",
      details: [
        "10 Module: Operating System, Kraft & Muskel (Minimum Effective Dose), Cardio/VO₂ & Bewegung, Ernährung & Körperkomposition (Cut/Recomp/Build/Perform), Schlaf & Regeneration, Supplemente, Health & Longevity Dashboard, Hormone & Testosteron, Sexuelle Gesundheit & Fertilität, der 12-Wochen-Masterplan",
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

  ];
})();
