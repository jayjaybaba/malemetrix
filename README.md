# MaleMetrix — Website

**Das Performance-System für Männer.** Komplette, statische Website — kein Build-Schritt, kein Server nötig. Öffne `index.html` im Browser oder lade den Ordner bei einem beliebigen Hoster hoch.

## Was alles funktioniert (ohne weitere Einrichtung)

| Funktion | Status |
| --- | --- |
| **MaleMetrix Score-Check** — adaptiver Fragebogen, 12 gewichtete Bereiche (Score V2; im Profil zu 7 Säulen verdichtet), Engpass-Algorithmus, 7 Archetypen, Red-Flag-System, Radar-Chart, 7-Tage-Plan | ✅ läuft komplett im Browser |
| **19 kostenlose Rechner** ([tools.html](tools.html)) — BMI, Körperfett (US Navy & Caliper), WHtR, LBM, Berkhan, BMR/TDEE/Cunningham, Protein, Makros, Wasser, FFMI, Idealgewicht, Casey-Butt-Muskelpotenzial, 1RM, Herzfrequenz, Wilks-2, Scheibenrechner | ✅ wissenschaftliche Formeln, metrisch/imperial |
| **Training-Tracker** ([tracker.html](tracker.html)) — Sätze loggen mit Auto-Vorschlag aus dem letzten Mal, PRs, e1RM, Rest-Timer, Cardio (Pace/Tempo), Körpermaße + Gewichtschart, eigene & fertige Pläne, JSON-Export/Import | ✅ voll funktionsfähige Fitness-App, offline |
| **Ebook-Bibliothek** ([ebooks.html](ebooks.html)) — die Kapitel von DAS PROTOKOLL als eigene Seiten (Teaser + Inhaltsverzeichnis frei, Volltext hinter dem Kauf; `noindex` gegen Duplicate Content) | ✅ |
| **PDF-Report** ([report.html](report.html)) — jetzt mit **personalisierten Zielwerten** (BMR, TDEE, Protein-Gramm, Ziel-Bauchumfang aus den Check-Antworten) | ✅ über Browser-Druck |
| **Shop** — 9 Produkte inkl. **9-€-Express-Plan (Tripwire)**, Filter, Warenkorb, Checkout | ✅ Bestellungen sofort möglich |
| **PayPal-Checkout** — Smart Buttons (PayPal/Karte), **Live-Client-ID eingetragen**; dazu Stripe-Zahlungslink (Apple/Google Pay, Karte, Klarna) mit serverseitiger Verifikation | ✅ live |
| **E-Mail-Capture / Liste** — Ebook-Unlock + Newsletter, mit Brevo (Double-Opt-In) oder FormSubmit-Fallback | ✅ |
| **Conversion-Brücken** — Tool-Ergebnisse & Score-Check verlinken kontextuell auf Coaching/Tripwire; Social-Proof-Strips auf Coaching/Checkout/Termin | ✅ |
| **Terminbuchung** — **Cal.com-Embed** (wenn `calLink` gesetzt) oder eingebauter Kalender mit .ics-Export | ✅ |
| **Sprache DE/EN** + **Hell/Dunkel-Theme** — Umschalter oben rechts, Auswahl wird gespeichert | ✅ |

**Formularversand:** Solange FormSubmit nicht aktiviert ist, öffnen Formulare als Fallback das E-Mail-Programm des Besuchers — Anfragen erreichen dich also auch ohne Einrichtung.

## In 15 Minuten startklar (Checkliste)

1. **`js/config.js` öffnen** und eintragen:
   - `contactEmail` — deine echte E-Mail (auch im `formEndpoint` ersetzen!)
   - `bank` — Kontoinhaber, IBAN, Bank (für Vorkasse-Bestellungen)
   - `paypalClientId` — für PayPal/Karte direkt auf der Seite (siehe unten); optional
   - `instagram`, optional `whatsapp`, optional `paypalMe`
   - `brevoFormAction` — optional, für die E-Mail-Liste (siehe unten)
   - `calLink` — optional, für echte Terminbuchung mit Cal.com (siehe unten)
2. **FormSubmit aktivieren** (für automatischen E-Mail-Eingang): auf der Live-Seite einmal das Kontaktformular absenden, Bestätigungslink von formsubmit.co klicken.
3. **Rechtliches ausfüllen:** In [impressum.html](impressum.html), [datenschutz.html](datenschutz.html), [agb.html](agb.html) alle `[PLATZHALTER]` ersetzen. ⚠️ Impressum ist Pflicht nach § 5 DDG. AGB/Datenschutz idealerweise anwaltlich prüfen lassen.
4. **Hochladen:** Kompletten Ordner zu Netlify (Drag & Drop), Vercel, GitHub Pages oder Webspace. Domain verbinden — fertig.

> **Produktion (dieses Repository):** GitHub Pages baut aus **`main` / root**.
> Deploy = Push auf `main`. `master` ist nur ein Spiegel und deployt nichts.
> Verbindliche Regeln und Verifikation: [DEPLOYMENT.md](DEPLOYMENT.md).

## Neues Ebook hinzufügen (ohne Code zu schreiben)

Die Ebook-Bibliothek ist **datengetrieben** — du pflegst nur eine Liste, der Rest baut sich von selbst.

**Variante A — fertiges PDF hochladen (am einfachsten):**
1. Ebook als **PDF** exportieren (z. B. Canva, Word → „Als PDF speichern").
2. Datei in den Ordner `ebooks/files/` legen, z. B. `ebooks/files/mein-ebook.pdf`.
3. In [js/ebooks-data.js](js/ebooks-data.js) einen `{ … }`-Block kopieren und anpassen (`title`, `desc`, `read: "ebooks/files/mein-ebook.pdf"`, `gated: true` für E-Mail-Abfrage vor dem Öffnen).
4. Speichern, hochladen — das Ebook erscheint automatisch in der Bibliothek.

**Variante B — schöne HTML-Leseseite (mehr SEO):** Eine bestehende Datei in `ebooks/` (z. B. `training-system.html`) kopieren, Inhalt ersetzen, und in `js/ebooks-data.js` mit `read: "ebooks/dein-name.html"`, `gated: false` eintragen. HTML-Seiten sind frei lesbar (gut für Google), der PDF-Button darin fragt die E-Mail separat ab.

> Das oberste Ebook mit `featured: true` wird groß als Flaggschiff oben angezeigt. Alle Texte stehen als `{ de: …, en: … }` direkt im Eintrag — du musst keine andere Datei anfassen.

**Wenn du lieber per Web-Oberfläche hochladen willst** (echtes „Login → Datei hochladen → fertig"): Dafür gibt es Decap CMS (ehem. Netlify CMS). Das ist ein kostenloses Admin-Panel unter `/admin`, das deine Änderungen automatisch ins Repo committet. Etwas Einrichtung (Git-Backend + Login), aber dann komplett ohne Dateien-Editieren. Sag Bescheid, wenn ich das aufsetzen soll.

## E-Mail-Liste aktivieren (Ebook-Unlock + Newsletter)

Die Ebook-PDFs sind hinter einer E-Mail-Abfrage (Lesen bleibt offen für SEO). Damit eingesammelte E-Mails automatisch in deine Liste wandern statt nur ins Postfach:

1. Kostenloses Konto bei [Brevo](https://www.brevo.com) anlegen.
2. **Kontakte → Formulare** → ein Anmeldeformular erstellen, **Double-Opt-In aktivieren** (in DE Pflicht).
3. Im Einbettungscode die `action`-URL kopieren (`https://....sibforms.com/serve/...`) und in `js/config.js` bei `brevoFormAction` einsetzen.
4. Ohne Eintrag landen die E-Mails per FormSubmit in deinem Postfach — du kannst sie manuell importieren.

## Analytics (datenschutzfreundlich, optional)

Die Seite trackt die wichtigsten Funnel-Schritte (Check gestartet/abgeschlossen, Tripwire-Klick, Warenkorb, Checkout, Bestellung, Terminanfrage, Rechner-Nutzung, Ebook-Unlock).

- **Ohne Einrichtung:** Events werden nur **lokal im Browser** gezählt. In der Browser-Konsole `MM.funnel()` eingeben zeigt die Zahlen.
- **Mit echtem Tool:** In `js/config.js` unter `analytics.plausibleDomain` deine Domain eintragen (Konto auf [plausible.io](https://plausible.io), cookielos & DSGVO-freundlich → **kein Cookie-Banner nötig**). Alternativ self-hosted Umami.
- Die Datenschutzerklärung enthält dafür bereits einen passenden Abschnitt.

## SEO ist eingebaut

- **Open-Graph- & Twitter-Card-Tags** auf allen Seiten (schöne Link-Vorschauen) mit eigenem Bild `og-image.png`.
- **`sitemap.xml`** (30 öffentliche Seiten) + **`robots.txt`** (verweist auf die Sitemap).
- **Structured Data (JSON-LD):** Organization + WebSite + Service auf der Startseite, FAQ-Schema auf [faq.html](faq.html) → Chance auf Rich Results bei Google.
- **Canonical-URLs** auf allen Seiten.

⚠️ Alle SEO-URLs nutzen `https://www.malemetrix.com` (Live-Domain, siehe `CNAME`). Wenn deine Domain abweicht: in `sitemap.xml`, `robots.txt` und per Suchen-&-Ersetzen in den HTML-Dateien (`www.malemetrix.com` → deine Domain) anpassen, dann das OG-Bild neu prüfen.

> Das OG-Bild kannst du jederzeit neu erzeugen mit `python og_gen.py` (Anpassungen im Skript möglich).

## Terminbuchung mit Cal.com (optional)

1. Kostenloses Konto auf [cal.com](https://cal.com), Event-Typ „Analysegespräch" (45 Min) anlegen.
2. In `js/config.js` bei `calLink` den Slug eintragen, z. B. `"malemetrix/analysegespraech"`.
3. Die Terminseite zeigt dann den echten Cal.com-Kalender (Bestätigung + Erinnerung automatisch). Ohne Eintrag bleibt der eingebaute Anfrage-Kalender aktiv.

## PayPal aktivieren (✅ erledigt — Live-Client-ID ist in `js/config.js` eingetragen)

> Die Schritte bleiben als Referenz für einen Konto-Wechsel stehen.

1. Kostenloses PayPal-**Geschäftskonto** anlegen.
2. Auf [developer.paypal.com](https://developer.paypal.com) → *Apps & Credentials* → **Live** → *Create App* → **Client-ID** kopieren.
3. In `js/config.js` bei `paypalClientId` einfügen. Fertig — im Checkout erscheint dann „PayPal / Kreditkarte" und Käufer bezahlen direkt auf der Seite. Die Client-ID ist öffentlich und darf im Frontend stehen.
4. Ohne Client-ID greift automatisch Vorkasse (und PayPal.me, falls `paypalMe` gesetzt).

> Hinweis: Da die Seite serverlos ist, läuft die PayPal-Zahlung clientseitig (Standard-Smart-Buttons). Für hohe Umsätze später ggf. serverseitige Order-Capture ergänzen.

## 12-Wochen-Programm (Selbststudium, ohne Coaching)

Ein Online-Programm zum Selbermachen — dasselbe System wie das Coaching, aber ohne 1:1-Betreuung. **Teil von DAS PROTOKOLL (99 € einmalig), kein separater Kauf.**

- **Verkaufsseite:** [kurs.html](kurs.html) — Kauf-Button legt das Produkt `kurs-12w` in den Warenkorb → Checkout.
- **Programminhalt:** [kurs-programm.html](kurs-programm.html) — hinter einem Zugangscode. 12 Wochen mit To-dos zum Abhaken; der Fortschritt wird lokal im Browser gespeichert.
- **Inhalt bearbeiten:** im privaten `_src/course-data.js` (nicht im öffentlichen Repo — siehe [BUILD.md](BUILD.md)); danach den `courseVault` neu verschlüsseln.
- **Zugangscode:** wird nicht im Klartext im Repo gehalten. Der Code entschlüsselt den Vault (siehe BUILD.md). Nach dem Kauf:
  - **PayPal/Karte (sofort bezahlt):** der Käufer sieht den Code direkt auf der Bestätigungsseite + einen Direkt-Link (`kurs-programm.html?code=…`, schaltet automatisch frei).
  - **Vorkasse:** Code schickst du nach Zahlungseingang per E-Mail.
- **Wichtig:** Das ist ein **einfacher, geteilter Code — kein echter Kopierschutz**. Für automatische Auslieferung, echten Schutz und Rechnungen später eine Programmplattform nutzen (elopage, Copecart, Digistore24) und dort den Kaufabschluss-Button hinterlegen.

## Preise (Live-Stand Juli 2026)

- **DAS PROTOKOLL: 99 €** einmalig — Referenzwerk inkl. 12-Wochen-Programm (einziges Kaufprodukt im Shop-Katalog).
- **1:1 Coaching: 199 €/Monat**, monatlich kündbar. Erstgespräch kostenlos.
- **Kostenlos:** Score-Check, alle 19 Rechner, Training-Tracker, Kalorien-Tagebuch, Blutwerte-Checkliste, Magazin, Analysegespräch.

## Bewusste Produkt-Entscheidungen

- **Großer kostenloser Funnel-Magnet:** Rechner + Tracker + Ebooks ziehen Besucher über Suche/Social an, ohne E-Mail-Zwang → später Conversion zu Coaching/Shop.
- **Check & Tracker ohne Konto:** Alles in `localStorage`, DSGVO-freundlich (Gesundheitsdaten verlassen den Browser nur auf aktive Aktion).
- **Keine erfundenen Testimonials**, klare medizinische Grenze (keine Diagnosen/TRT-Beratung) — überall verankert. Wann ein Ergebnis veröffentlicht werden darf, regelt `PROOF_STANDARD.md`; erfasst wird es im Abschlussbericht des 12-Wochen-Programms (`js/case-study.js`), veröffentlicht auf `ergebnisse.html`.
- **Bauchumfang/Blutdruck** stehen nicht mehr in der Blutwerte-Checkliste (sind keine Blutwerte) → in den Tracker verschoben.

## Spätere Upgrades

- **Stripe Payment Links:** pro Produkt in `js/config.js` unter `stripeLinks`.
- **E-Mail-Funnel:** Brevo anbinden (7-teilige Sequenz aus dem Konzept).
- **Echtes Buchungs-Backend:** Cal.com einbinden, wenn das Volumen wächst.
- **Mehr EN-Übersetzungen:** Chrome, Homepage, Tools, Tracker, Ebooks-Bibliothek & Shop-UI sind zweisprachig. Lange Fließtexte der Unterseiten (Coaching-Details, Blutwerte, Recht) sind aktuell Deutsch — bei Bedarf weitere `data-i18n`-Keys in `js/i18n.js` ergänzen.

## Technik

- Reines HTML/CSS/JS, keine Abhängigkeiten, kein Build.
- Schriften lokal in `fonts/` (kein Google-Request, DSGVO-sauber, offline-fähig).
- Vorschau lokal: `python serve.py 4173` → http://127.0.0.1:4173
- Design-System: [css/style.css](css/style.css) · geteilte Logik: [js/main.js](js/main.js) · Sprache: [js/i18n.js](js/i18n.js) · Rechner: [js/tools.js](js/tools.js) · Tracker: [js/tracker.js](js/tracker.js) + [js/tracker-data.js](js/tracker-data.js) · Ebooks: [js/ebooks-data.js](js/ebooks-data.js) (Inhalt) + [js/ebooks.js](js/ebooks.js) (Renderer) · Programm: [js/course-data.js](js/course-data.js) (Inhalt) + [js/course.js](js/course.js) (Zugang/Fortschritt).
- Score-Logik: 12 gewichtete Bereiche (Score V2, kanonische Engine in [js/check-data.js](js/check-data.js)); Gewichte, Schwellen und Leitplanken in [SCORE_V2_LOGIC.md](SCORE_V2_LOGIC.md). Die 7 Profil-Säulen (Radar/Report) sind eine daraus abgeleitete, verdichtete Anzeige.

## Wichtiger Hinweis

MaleMetrix ist Lifestyle-Coaching: **keine Diagnosen, keine Heilversprechen, keine Medikamenten-/TRT-Beratung.** Diese Grenze ist in Texten, Check, Rechnern, Ebooks und Report verankert — bitte bei Werbeanzeigen (Meta!) und Social-Content beibehalten.
