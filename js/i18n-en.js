/* ==========================================================================
   MaleMetrix — Glossar DE→EN
   --------------------------------------------------------------------------
   Das ist KEIN vollständiges Wörterbuch. Die Seite wird dynamisch übersetzt
   (js/i18n.js → Edge Function mm-translate); wer hier Sätze pflegt, pflegt
   doppelt und produziert genau den Drift, den die dynamische Übersetzung
   vermeidet.

   Hier stehen ausschließlich die Fälle, die eine Maschine falsch macht:

   1. MARKEN- UND PRODUKTNAMEN, die unverändert bleiben müssen. Ein Eintrag
      "X" → "X" verhindert, dass der Satz überhaupt an den Dienst geht — das
      spart Budget und schließt aus, dass aus "DAS PROTOKOLL" ein "THE
      PROTOCOL LOG" wird.
   2. FACHBEGRIFFE mit fester Übersetzung in diesem Produkt. "Engpass" ist
      hier der schwächste Hebel im System, nicht eine Verengung im Rohr.
   3. TEXTE MIT RECHTLICHER SCHÄRFE, bei denen eine maschinelle Formulierung
      ein Versprechen verschieben könnte (Garantie, Widerruf, Kündigung).

   Ein Eintrag hier gewinnt IMMER gegen die maschinelle Übersetzung. Schlüssel
   ist der deutsche Text exakt wie auf der Seite, nur Leerraum normalisiert.

   Was fehlt, findet man live — Seite auf Englisch öffnen, dann in der Konsole:
       MM.i18n.untranslated()    → Sätze ohne Übersetzung, häufigste zuerst
       MM.i18n.status()          → Zustand des Dienstes
   ========================================================================== */
window.MM_I18N_EN = {
  /* ---------- 1. Bleibt unverändert (Marke, Produkt, Eigennamen) ---------- */
  "MaleMetrix": "MaleMetrix",
  "MaleMetrix.": "MaleMetrix.",
  "MaleMetrix Score": "MaleMetrix Score",
  "MaleMetrix Circle": "MaleMetrix Circle",
  "MaleMetrix Startseite": "MaleMetrix home",
  "BloodMetrix": "BloodMetrix",
  "MALEMETRI": "MALEMETRI",
  "malemetrix.com": "malemetrix.com",
  "Ural Bayramoglu, Gründer von MaleMetrix": "Ural Bayramoglu, founder of MaleMetrix",
  "1:1 Coaching": "1:1 Coaching",
  "1:1-Coaching": "1:1 Coaching",

  /* ---------- 2. Produktnamen mit fester englischer Fassung ---------- */
  "DAS PROTOKOLL": "THE PROTOCOL",
  "Das Protokoll": "The Protocol",
  "DAS PROTOKOLL — Der komplette Männer-Guide": "THE PROTOCOL — the complete guide for men",
  "DAS PROTOKOLL ansehen": "View THE PROTOCOL",
  "DAS PROTOKOLL sichern — 99 €": "Get THE PROTOCOL — €99",
  "IM PROTOKOLL": "IN THE PROTOCOL",
  "Protokoll-Seite": "Protocol page",
  "12-Wochen-Programm": "12-week program",
  "12-Wochen-Programm · Zugang": "12-week program · access",
  "Ultimativen Stack": "Ultimate Stack",
  "Analysegespräch": "Analysis call",
  "Analysegespräch buchen": "Book your analysis call",
  "Training-Tracker": "Training tracker",
  "Score-Check": "Score check",

  /* ---------- 3. Fachbegriffe dieses Produkts ---------- */
  "Engpass": "bottleneck",
  "Optimierungsbereich": "area to optimise",
  "Blutwerte": "Blood values",
  "Blutwerte verstehen": "Understand your blood values",
  "Blutwerte & Hormone": "Blood values & hormones",
  "Körperkomposition": "Body composition",
  "Alltagsbewegung": "Everyday movement",
  "Erholung & Stress": "Recovery & stress",
  "Hormonell & Sexuell": "Hormonal & sexual",
  "Energie & Antrieb": "Energy & drive",
  "Herz-Kreislauf": "Cardiovascular",
  "Stoffwechsel": "Metabolism",
  "Bauchumfang": "Waist circumference",
  "Umsetzungsquote": "Adherence rate",
  "Umsetzung": "Execution",

  /* ---------- 4. Rechtlich scharfe Formulierungen ---------- */
  "einmalig": "one-time",
  "99 € · einmalig": "€99 · one-time",
  "99 € · EINMALIG": "€99 · ONE-TIME",
  "30 Tage Geld-zurück-Garantie": "30-day money-back guarantee",
  "✓ 30 Tage Geld-zurück-Garantie": "✓ 30-day money-back guarantee",
  "14 Tage Widerruf": "14-day right of withdrawal",
  "AGB & Widerruf": "Terms & withdrawal",
  "AGB": "Terms",
  "Datenschutz": "Privacy",
  "Datenschutzerklärung": "Privacy policy",
  "Impressum": "Imprint",
  "Rechtliches": "Legal",
  "· monatlich kündbar": "· cancel monthly",
  "199 €/Monat": "€199/month",
  "199 € im Monat": "€199 per month",
  "€/Monat": "/month",
  "/ Monat · jederzeit kündbar": "/ month · cancel any time",
  "Kostenlos & unverbindlich. Wir bestätigen per E-Mail und senden dir den Video-Link. Datenverarbeitung gemäß":
    "Free and without obligation. We confirm by email and send you the video link. Data processing according to",
  "© MaleMetrix. Allgemeine Information und Aufklärung, kein Ersatz für ärztliche Beratung, Diagnose oder Therapie.":
    "© MaleMetrix. General information and education — not a substitute for medical advice, diagnosis or treatment.",
  "MaleMetrix. Alle Rechte vorbehalten.": "MaleMetrix. All rights reserved."
};
