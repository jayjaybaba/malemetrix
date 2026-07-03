/* ==========================================================================
   MaleMetrix — zentrale Konfiguration
   Hier trägst du einmalig deine Daten ein. Alles andere zieht sich daraus.
   ========================================================================== */

window.MM_CONFIG = {

  // --- Kontakt -----------------------------------------------------------
  // Deine geschäftliche E-Mail-Adresse. Wird für Bestellungen, Buchungen
  // und Kontaktanfragen genutzt.
  contactEmail: "coaching@malemetrix.de",

  // Optional: WhatsApp-Nummer im internationalen Format (nur Ziffern),
  // z. B. "4915112345678". Leer lassen, wenn nicht gewünscht.
  whatsapp: "",

  // Instagram-Profil-URL (für Footer & Kontaktseite).
  instagram: "https://instagram.com/malemetrix",

  // --- Formular-Versand ---------------------------------------------------
  // Damit Buchungen, Bestellungen und Kontaktanfragen automatisch als
  // E-Mail bei dir landen, ohne eigenen Server:
  // 1. Gehe auf https://formsubmit.co und aktiviere deine E-Mail-Adresse
  //    (einmalig: erstes Formular absenden, Bestätigungslink klicken).
  // 2. Fertig — der Endpoint unten funktioniert dann automatisch.
  // Solange nicht aktiviert, öffnet die Website als Fallback das
  // E-Mail-Programm des Besuchers mit fertig ausgefülltem Text (mailto).
  formEndpoint: "https://formsubmit.co/ajax/coaching@malemetrix.de",

  // --- Zahlung (Shop) ------------------------------------------------------
  // Bankverbindung für Vorkasse/Überweisung. MUSS vor dem Livegang
  // ausgefüllt werden.
  bank: {
    inhaber: "[KONTOINHABER EINTRAGEN]",
    iban: "[IBAN EINTRAGEN]",
    bank: "[BANKNAME EINTRAGEN]"
  },

  // --- PayPal -------------------------------------------------------------
  // PayPal Smart Buttons (PayPal + Kredit-/Debitkarte) direkt im Checkout.
  //
  // AKTUELL: "sb" = PayPal-TESTMODUS (Sandbox). Der Button ist sichtbar und
  // funktioniert, es fließt aber KEIN echtes Geld. Gut zum Ausprobieren.
  //
  // FÜR DEN LIVEGANG (echtes Geld empfangen):
  // 1. Kostenloses PayPal-Geschäftskonto erstellen.
  // 2. Auf developer.paypal.com → "Apps & Credentials" → Reiter "Live" →
  //    "Create App" → die Live-Client-ID kopieren.
  // 3. Unten das "sb" durch deine Live-Client-ID ersetzen. Fertig.
  // Die Client-ID ist öffentlich und darf im Frontend stehen.
  // (Leer lassen "" = PayPal-Buttons aus, nur Vorkasse.)
  paypalClientId: "sb",      // "sb" = Test · "AeB1Q..." = live · "" = aus
  paypalCurrency: "EUR",

  // Variante B (Fallback ohne Entwickler-App): PayPal.me-Link,
  // z. B. "https://paypal.me/deinname". Wird angeboten, wenn keine
  // Client-ID gesetzt ist.
  paypalMe: "",

  // Optional: Stripe Payment Links pro Produkt-ID.
  // Beispiel: { "starter-report": "https://buy.stripe.com/xxx" }
  // Sobald ein Link hinterlegt ist, wird er im Checkout bevorzugt angeboten.
  stripeLinks: {},

  // --- Versand -------------------------------------------------------------
  shipping: {
    flat: 3.90,        // Versandkosten pro Bestellung (physische Produkte)
    freeFrom: 50.00    // Versandkostenfrei ab diesem Warenwert
  },

  // --- Domain / SEO --------------------------------------------------------
  // Deine endgültige Domain (für Canonical-URLs & Sitemap). Falls du eine
  // andere Domain nutzt, hier und in sitemap.xml + den OG-Tags anpassen.
  siteUrl: "https://malemetrix.de",

  // --- Dinner-Planer: Foto-Kalorienschätzung (KI) --------------------------
  // Mahlzeit fotografieren -> Claude schätzt Gericht, kcal & Protein.
  // AKTIVIEREN (5 Minuten, Copy-Paste): Anleitung in proxy/README.md —
  // fertiger Cloudflare-Worker liegt in proxy/food-vision-worker.js.
  // Danach unten die Worker-URL bei "endpoint" eintragen (empfohlen).
  // Kosten: mit claude-haiku-4-5 ca. 0,2-0,4 Cent pro Foto.
  // SICHERHEIT: Ein direkt hier eingetragener apiKey waere oeffentlich
  // sichtbar (statische Seite!) — wenn ueberhaupt, nur mit Ausgabenlimit.
  // Solange beides leer ist, bleibt der Foto-Button unsichtbar.
  foodVision: {
    apiKey: "",                    // z. B. "sk-ant-..." (nur mit Spend-Limit!)
    endpoint: "",                  // ODER eigene Proxy-URL (empfohlen)
    model: "claude-haiku-4-5"      // guenstigstes Vision-Modell
  },

  // --- Affiliate- / Partner-Links -------------------------------------------
  // Sobald du bei einem Partnerprogramm angemeldet bist, trägst du hier
  // deinen persönlichen Link ein — alle Empfehlungs-Boxen auf der Seite
  // nutzen ihn dann automatisch (mit rel="sponsored" und Kennzeichnung).
  // Solange ein Feld leer ist, zeigt der Link neutral auf den Hersteller.
  // Wo du dich anmeldest:
  //  - oura:       ouraring.com -> "Affiliate" (läuft über impact.com)
  //  - bloodtest:  z. B. Lykon (awin.com) oder Aware (Partnerprogramm)
  //  - supplements: z. B. ESN/More via awin.com, iHerb-Partnerprogramm
  //  - telemed:    Männergesundheits-/Telemedizin-Anbieter mit Partnerprogramm
  affiliate: {
    oura: "",          // z. B. "https://ouraring.com/?irclickid=..."
    bloodtest: "",     // z. B. dein Lykon/Aware-Partnerlink
    supplements: "",   // z. B. dein ESN/iHerb-Partnerlink
    telemed: ""        // z. B. dein Telemedizin-Partnerlink
  },

  // --- Analytics (datenschutzfreundlich) ----------------------------------
  // Plausible ist cookielos und DSGVO-freundlich (kein Cookie-Banner nötig).
  // 1. Kostenpflichtig/Trial: Konto auf plausible.io, Domain hinzufügen.
  //    (Oder self-hosted / Umami als Alternative.)
  // 2. Deine Domain unten eintragen, z. B. "malemetrix.de".
  // Solange leer, werden Events nur lokal gezählt (im Browser, für dich
  // sichtbar über MM.funnel() in der Konsole) und nirgendwo hingesendet.
  analytics: {
    plausibleDomain: "",   // z. B. "malemetrix.de"
    plausibleSrc: "https://plausible.io/js/script.tagged-events.js"
  },

  // --- 12-Wochen-Programm (Selbststudium) -------------------------------------
  // Das Programm ist ein digitales Produkt (im Shop / auf kurs.html kaufbar).
  // Nach dem Kauf bekommt der Käufer diesen Zugangscode, um den Programminhalt
  // (kurs/programm.html) freizuschalten. Ändere ihn jederzeit (dann brauchen
  // bestehende Käufer den neuen Code — am besten nur bei Missbrauch ändern).
  // WICHTIG: Das ist ein einfacher, geteilter Code (kein echter Kopierschutz).
  // Für automatische Auslieferung + Schutz + Rechnungen später eine
  // Programmplattform nutzen (elopage, Copecart, Digistore24).
  courseAccessCode: "MM12-START",

  // Zugangscode für "DAS PROTOKOLL" (Premium-Ebook). Käufer erhalten ihn nach
  // Zahlung und schalten damit ebooks/protokoll.html frei (Sofort-Zugang).
  protokollAccessCode: "PROTOKOLL-M",

  // Zugangscode für den privaten "Ultimate Stack"-Leitfaden
  // (ebooks/ultimate-stack.html). Bewusst NICHT öffentlich verlinkt — du gibst
  // diesen Code nur Leuten, die konkret Interesse zeigen (Anfrage, Gespräch).
  // So bleibt das Medikamenten-/Stack-Wissen aus der öffentlichen Seite raus.
  stackAccessCode: "STACK-M",

  // --- MaleMetrix Circle (bezahlte Community, monatlich) -------------------
  // 1. Telegram: private Gruppe erstellen -> Einladungslink hier eintragen
  //    (t.me/+xxxx). Er wird NUR nach erfolgreicher Zahlung angezeigt.
  // 2. PayPal-Abo: auf developer.paypal.com (Live) unter "Products & Plans"
  //    einen Plan mit deinem Monatspreis anlegen und die Plan-ID (P-xxx)
  //    unten eintragen. Braucht die Live-Client-ID oben (paypalClientId).
  // Solange planId leer ist, zeigt die Seite eine Warteliste (E-Mail-Anfrage).
  circle: {
    priceMonthly: 15,
    paypalPlanId: "",          // z. B. "P-5ML4271244454362WXNWU5NQ"
    telegramInvite: ""         // z. B. "https://t.me/+AbCdEfGh"
  },

  // --- E-Mail-Liste / Ebook-Unlock ----------------------------------------
  // Damit eingesammelte E-Mails automatisch in deiner Liste landen (statt nur
  // ins Postfach), nutze ein kostenloses Brevo-Konto (brevo.com):
  // 1. In Brevo unter "Kontakte → Formulare" ein Anmeldeformular erstellen
  //    (mit Double-Opt-In aktiviert — in Deutschland Pflicht).
  // 2. Im Einbettungscode die "action"-URL kopieren (beginnt mit
  //    https://....sibforms.com/serve/...) und unten einsetzen.
  // Solange leer, landet die E-Mail per FormSubmit in deinem Postfach.
  brevoFormAction: "",
  // Feldname der E-Mail im Brevo-Formular (Standard ist "EMAIL").
  brevoEmailField: "EMAIL",

  // --- Cal.com Terminbuchung ----------------------------------------------
  // Für echte Kalender-Sync mit Bestätigung & Erinnerung:
  // 1. Kostenloses Konto auf cal.com erstellen, einen Event-Typ anlegen
  //    (z. B. "Analysegespräch", 45 Min).
  // 2. Den Link-Slug eintragen, Format "nutzername/event", z. B.
  //    "malemetrix/analysegespraech".
  // Solange leer, wird der eingebaute Kalender (Anfrage per Formular) genutzt.
  calLink: "",

  // --- Social Proof / Testimonials ----------------------------------------
  // Sobald du echte (eingewilligte!) Kundenstimmen hast, hier eintragen:
  // { text: "...", name: "Max M., 38", result: "−6 cm Bauch in 12 Wochen" }
  // Solange leer, zeigt die Seite ehrliche Trust-Signale statt erfundener Zitate.
  testimonials: [],

  // --- Termine / Analysegespräch -------------------------------------------
  booking: {
    // Wochentage mit Terminen (0 = Sonntag, 1 = Montag ... 6 = Samstag).
    // Alle 7 Tage buchbar: unter der Woche nur abends, am Wochenende ganztags.
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    // Uhrzeiten Montag–Freitag (nur abends, ab 17:30).
    slotsWeekday: ["17:30", "18:30", "19:30", "20:30"],
    // Uhrzeiten Samstag & Sonntag (ganzer Tag).
    slotsWeekend: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"],
    // Fallback, falls oben keine getrennten Zeiten gesetzt sind (alte Variante).
    slots: ["17:30", "18:30", "19:30"],
    // Wie viele Wochen im Voraus buchbar
    weeksAhead: 4,
    // Dauer des Gesprächs in Minuten (für Kalendereintrag)
    durationMin: 45
  },

  // --- Rechtliches ----------------------------------------------------------
  // Diese Angaben werden im Impressum & in Bestellbestätigungen verwendet.
  legal: {
    name: "[VOLLSTÄNDIGER NAME EINTRAGEN]",
    street: "[STRASSE + HAUSNUMMER]",
    city: "[PLZ + ORT]",
    phone: "[TELEFONNUMMER]",
    ustHinweis: "Kleinunternehmer gemäß § 19 UStG — keine Ausweisung der Umsatzsteuer."
  }
};
