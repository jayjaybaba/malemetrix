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
  // WICHTIG: Das ist der Schalter für die VOLLAUTOMATISCHE Auslieferung.
  // Zahlt ein Käufer per PayPal, wird die Zahlung sofort bestätigt und der
  // Zugangscode automatisch auf der Bestellbestätigung angezeigt & verlinkt —
  // ohne dein Zutun. (Bei Vorkasse geht das prinzipbedingt nicht: dort kommt
  // der Code nach Zahlungseingang per E-Mail.)
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
  paypalClientId: "AcN9AssC3uXAokijIZpDnXJl07vHXNg-QJS2pwZe8oKAcVnOPNeagfd0UDbo2m978Z1wASaqx8vBzgec",      // "sb" = Test · "AeB1Q..." = live · "" = aus
  paypalCurrency: "EUR",

  // Variante B (Fallback ohne Entwickler-App): PayPal.me-Link,
  // z. B. "https://paypal.me/deinname". Wird angeboten, wenn keine
  // Client-ID gesetzt ist.
  paypalMe: "",

  // --- Apple Pay / Google Pay / Karte / Klarna (Stripe Payment Link) -------
  //
  // Das ist der Schalter für Apple Pay. Apple Pay lässt sich technisch nicht
  // ohne Händlerkonto anbieten — es braucht einen Zahlungsdienstleister, der
  // gegenüber Apple für die Zahlung geradesteht. Der schnellste Weg dahin ist
  // eine von Stripe gehostete Bezahlseite, weil Stripe die Apple-Domain-
  // Verifizierung für die eigene Seite selbst übernimmt.
  //
  // AKTIVIEREN (ca. 10 Minuten, kein Code):
  // 1. Konto auf stripe.com anlegen (kostenlos, keine Grundgebühr).
  // 2. Dashboard → Zahlungsarten → Apple Pay, Google Pay, Karte und Klarna
  //    aktivieren. Apple Pay ist für gehostete Bezahlseiten standardmäßig an.
  // 3. Dashboard → Zahlungslinks → "Neu" → Produkt "DAS PROTOKOLL", Preis
  //    99 €, einmalig. Danach unter "Nach der Zahlung" → "Weiterleitung zu
  //    einer Seite" eintragen:
  //      https://www.malemetrix.com/checkout.html?bezahlt=stripe
  // 4. Die entstandene URL (beginnt mit https://buy.stripe.com/) hier unten
  //    bei "protokoll" einsetzen. Fertig — die Zahlart erscheint sofort.
  //
  // Solange der Wert leer ist, wird die Zahlart NICHT angeboten. Es wird
  // bewusst kein Apple-Pay-Versprechen angezeigt, das nicht eingelöst würde.
  //
  // ACHTUNG, EINMALZAHLUNG: Der Preis hinter dem Zahlungslink MUSS in Stripe
  // als "einmalig" angelegt sein, nicht als "wiederkehrend". Die ganze Seite
  // verspricht "99 €, einmalig, kein Abo" — ein wiederkehrender Preis würde
  // jeden Käufer stattdessen jeden Monat erneut belasten. Im Stripe-Dashboard
  // steht das beim Preis unter "Abrechnung": dort muss "Einmalig" stehen.
  //
  // NIEMALS hier eintragen: ein Schlüssel, der mit sk_ oder rk_ beginnt. Das
  // sind Geheimschlüssel; diese Datei wird an jeden Besucher ausgeliefert.
  // Öffentlich sein dürfen nur die buy.stripe.com-Adresse und pk_-Schlüssel.
  // Der Wächter G9 in tools-dev/tests/security-guards.test.js bricht den
  // Build, falls doch einmal einer hineingerät.
  //
  // WICHTIG zur Auslieferung: PayPal schaltet den Zugang automatisch frei,
  // weil die Zahlung serverseitig geprüft wird. Für Stripe existiert diese
  // Prüfung noch nicht — dort schaltest du den Zugang nach der Zahlung
  // einmal manuell frei (My MaleMetrix → Zugänge verwalten). Der Checkout
  // sagt dem Käufer das ehrlich an. Details in COMMERCE.md.
  stripeLinks: {
    "protokoll": ""      // z. B. "https://buy.stripe.com/eVa5kQ0000000000"
  },

  // --- Versand -------------------------------------------------------------
  shipping: {
    flat: 3.90,        // Versandkosten pro Bestellung (physische Produkte)
    freeFrom: 50.00    // Versandkostenfrei ab diesem Warenwert
  },

  // --- Domain / SEO --------------------------------------------------------
  // Deine endgültige Domain (für Canonical-URLs & Sitemap). Falls du eine
  // andere Domain nutzt, hier und in sitemap.xml + den OG-Tags anpassen.
  siteUrl: "https://www.malemetrix.com",

  // --- My MaleMetrix Account (Supabase) -----------------------------------
  // NUR die ÖFFENTLICHEN Werte hier eintragen. NIEMALS den service_role- oder
  // secret-Key — die liegen ausschließlich serverseitig in Supabase. Solange
  // die Felder leer sind, läuft My MaleMetrix im lokalen Modus (nur dieses
  // Gerät, ohne Cloud-Konto) und die Website funktioniert vollständig weiter.
  // Setup + SQL + RLS: siehe SUPABASE.md.
  supabaseUrl: "https://vczhfyxltiyvtvppfodt.supabase.co",                 // z. B. "https://vczhfyxltiyvtvppfodt.supabase.co"
  // Aktuelles Modell: Publishable Key ("sb_publishable_dfpck4XKI--7rdrd7tHFWQ_VFIdPY2F"). Ist clientseitig
  // erlaubt. (Ältere Projekte nutzen den anon/public JWT — supabaseAnonKey als
  // Fallback möglich, aber Publishable Key bevorzugen.)
  supabasePublishableKey: "sb_publishable_dfpck4XKI--7rdrd7tHFWQ_VFIdPY2F",      // z. B. "sb_publishable_..."
  supabaseAnonKey: "",             // Legacy-Fallback (nur falls kein Publishable Key)

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
  // 2. Deine Domain unten eintragen, z. B. "www.malemetrix.com".
  // Solange leer, werden Events nur lokal gezählt (im Browser, für dich
  // sichtbar über MM.funnel() in der Konsole) und nirgendwo hingesendet.
  // --- Reichweitenmessung --------------------------------------------------
  //
  // Solange plausibleDomain leer ist, wird NICHTS übertragen: alle Ereignisse
  // laufen nur lokal im Browser des Besuchers. Das heißt im Klartext, dass du
  // deine Besucherzahlen, deine Abbruchstellen und deine Kaufquote nicht sehen
  // kannst. Ohne diese Zahlen ist jede Umsatzplanung geraten.
  //
  // AKTIVIEREN (2 Minuten, kostet ab ca. 9 €/Monat):
  // 1. Konto auf plausible.io anlegen und "www.malemetrix.com" als Website
  //    hinzufügen. Kein Skript einbauen — das erledigt js/analytics.js.
  // 2. Unten "www.malemetrix.com" eintragen. Fertig.
  //
  // Plausible ist cookielos und bildet keine personenbezogenen Profile; die
  // Datenschutzerklärung deckt diesen Fall in Abschnitt 7 bereits ab. Es wird
  // bewusst kein Anbieter vorbelegt: Ein Skript zu laden, hinter dem kein
  // Konto steht, sendet Daten ins Leere und wäre in der Datenschutzerklärung
  // falsch beschrieben.
  //
  // Welche Ereignisse den Kauf-Trichter bilden, steht im Kopf von
  // js/analytics.js.
  analytics: {
    plausibleDomain: "",   // z. B. "www.malemetrix.com"
    plausibleSrc: "https://plausible.io/js/script.tagged-events.js"
  },

  // --- Premium-Zugänge (Protokoll, Programm, Ultimate Stack) ----------------
  // Die Zugangscodes stehen bewusst NICHT mehr hier (diese Datei ist öffentlich
  // lesbar). Die Premium-Inhalte liegen AES-verschlüsselt in den jeweiligen
  // Seiten; der Code ist der Entschlüsselungsschlüssel und wird nach Zahlung
  // manuell per E-Mail verschickt. Inhalte neu verschlüsseln:
  //   node tools-dev/vault.mjs encrypt <datei> <CODE>
  // Klartext-Master liegen in _src/ (wird von GitHub Pages nicht ausgeliefert).

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

  // --- Growth OS (interner Bereich /admin/growth/) --------------------------
  // Alle Growth-OS-Nutzerdaten liegen NUR lokal im Browser. Hier stehen
  // ausschließlich Endpunkte/Hashes — niemals Secrets oder Tokens.
  growth: {
    // Zugangscode-Hash (SHA-256 des normalisierten Codes, Großschreibung,
    // ohne Leerzeichen). Standard = derselbe Code wie beim Protokoll.
    // Neuen Hash erzeugen: node -e "console.log(require('crypto').createHash('sha256').update('DEINCODE').digest('hex'))"
    accessHash: "",

    // TikTok-Anbindung über EIGENEN Cloudflare Worker (Code liegt fertig in
    // proxy/tiktok-oauth-worker.js). LEER = Level 0 (Manual Mode) — das ist
    // der bewusst gewählte Normalbetrieb: Kennzahlen werden pro Video von Hand
    // eingetragen (Videos → „Kennzahlen-Snapshot"). Kein Setup nötig, keine
    // TikTok-Genehmigung nötig, kein toter Verbinden-Button.
    //
    // Die automatische API-Anbindung ist OPTIONAL und rein Komfort (Zahlen
    // laden sich selbst statt getippt zu werden). Sie setzt eine von TikTok
    // freigegebene Developer-App voraus (App Review inkl. Demo-Video) und wird
    // NUR aktiviert, indem man hier die eigene Worker-URL einträgt, z. B.
    //   apiBase: "https://mm-tiktok.DEINACCOUNT.workers.dev"
    // WICHTIG: Hier steht KEIN Secret. Das Admin-Passwort lebt ausschließlich
    // als Worker-Secret (ADMIN_PASSWORD). Setup Schritt für Schritt: GROWTH-OS.md
    tiktok: {
      apiBase: ""
    },

    // Optionale KI-Unterstützung (Hook-/Skript-Entwürfe, klar als
    // KI-VORSCHLAG markiert). Empfohlen: eigener Proxy-Endpoint statt
    // API-Key im Browser (dieselbe Logik wie foodVision oben).
    ai: {
      endpoint: "",
      apiKey: "",
      model: "claude-sonnet-5"
    }
  },

  // --- Rechtliches ----------------------------------------------------------
  // Diese Angaben werden im Impressum & in Bestellbestätigungen verwendet.
  legal: {
    name: "Ural Bayramoglu",
    street: "Eberwurzstraße 15",
    city: "80935 München",
    phone: "0176 70240248",
    ustHinweis: "Kleinunternehmer gemäß § 19 UStG — keine Ausweisung der Umsatzsteuer."
  }
};



