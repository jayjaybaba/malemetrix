# Umsetzung der Optimierungs-Liste

Stand: 25. Juli 2026 · Service Worker `mm-v134` · 1563 Assertions über 21 Suiten, 0 Fehler

Grundlage ist die priorisierte Arbeitsliste aus dem Repo-Audit. Dieses
Dokument hält fest, **was umgesetzt wurde, was bewusst nicht** — und wo die
Prüfung des Audits selbst nicht standgehalten hat.

---

## SOFORT — vollständig umgesetzt (30 von 30)

| # | Befund | Umsetzung |
|---|---|---|
| S1 | Vorkasse war an der Kasse vorausgewählt | PayPal steht jetzt an erster Stelle; der Beschreibungstext nennt den sofortigen Zugang |
| S2 | Laufendes Workout wurde ohne Rückfrage gelöscht | `mayReplaceActive()` vor `startSession()` und `repeatSession()` |
| S3 | Konto-Sync lud `r.answers` samt Art.-9-Daten hoch | Upload auf eine Erlaubnisliste beschränkt; `answers` fällt heraus |
| S4 | `recoveryLow()` war doppelt falsch | Leeres Feld zählt nicht mehr als Signal; `"schlecht"` statt des nie geschriebenen `"bad"`; `vcode === "exec"` korrigiert |
| S5 | Score-Wiedereinstieg begann bei Frage 1 | Sprung zur ersten offenen Frage, mit Hinweis |
| S6 | `parseFloat("94,5")` = 94 | `numDE()` eingeführt und angewendet |
| S7 | UTC-Datum brach den Streak | Drei Vorbelegungen auf `localYmd()` |
| S8 | PR-Abzeichen feierte den Gleichstand | `setE1 > pr + 0.01` |
| S9 | Bewegungstage wurden doppelt gezählt | Zweiter Zähler schließt MOVE-Tage aus |
| S10 | 47 KB gzip totes JS auf der App-Seite | `check-data.js` aus `mein-protokoll.html` entfernt |
| S11 | 12,9 KB render-blockierendes CSS auf der Startseite | `os.css` aus `index.html` entfernt — vorher jedes Klassen-Token, jede ID und jede Laufzeit-Klasse geprüft |
| S12 | `aria-live` über der gesamten App | Ansicht ist keine Live-Region mehr; Fokus wandert in `.os-body`, eigene `role="status"`-Zeile |
| S13 | Kontrastfehler in über 150 Textstellen | `--muted-2` auf `#8b95a8` (6,61:1) |
| S14 | Toast war für Screenreader stumm | `role="status"` + `aria-live="polite"` |
| S15 | Ergebnisseite ohne h1/h2 | Ergebniszeile ist h1 (inkl. Score für Screenreader), acht Abschnitte auf h2, Fokus wandert dorthin |
| S16 | Datei-Upload nur mit Maus bedienbar | `display:none` → sichtbar-versteckt, aber fokussierbar; `:focus-within` am Label |
| S17 | Geschlossene Modale blieben im Tab-Fokus | `visibility: hidden`, mitanimiert — 17 unsichtbare Bedienelemente weniger in der Tab-Reihenfolge |
| S18 | Lokale Daten ließen sich nicht löschen | Eigenständiger Knopf im Konto-Bereich, zweistufig bestätigt, ohne Kontobezug |
| S19 | `sw.js`: unbehandelte Rejection | Installation ist tolerant gegen einzelne fehlende Dateien |
| S20 | `robots.txt` hob das eigene `noindex` auf | Nur noch `/admin/` gesperrt |
| S21 | Kein Blog-Artikel verlinkte den Score | Alle 11 Artikel: Kopfzeile + Block am Textende |
| S22 | `blog.html` und `circle.html` ohne og-Tags | Vollständiger Satz inkl. Twitter-Card |
| S23 | Kein Product/Offer-Schema auf den Verkaufsseiten | Product (49 €) auf `protokoll.html`, Service (149 €) auf `coaching.html` — ohne erfundene Bewertungen |
| S24 | Drei Ebooks mit unbegründetem `noindex` | Entfernt, in die Sitemap aufgenommen; die übrigen sechs unangetastet |
| S25 | „ab 149 €" auf der Ergebnisseite | „149 € / Monat · monatlich kündbar" |
| S26 | Versandkostensatz bei digitalem Sortiment | „Digitale Lieferung, keine Versandkosten" |
| S27 | Vier Reste „~10 Minuten" | Auf 7 angeglichen |
| S28 | Report-URLs waren nicht klickbar | Echte Links am Bildschirm, Fließtext im Druck |
| S29 | `shop.html` / `circle.html` im Index, aber inhaltlich nicht tragfähig | `noindex, follow` + aus der Sitemap; in einer Zeile umkehrbar |
| S30 | Kleinkram | `esc()` für Name/E-Mail/Bestellnummer; `mm-commerce` reicht keine Fehlerursache mehr an den Client; doppelter Scroll-Handler entfernt; Doku auf Ist-Stand |

## DANACH — umgesetzt, soweit ohne Inhaber-Entscheidung möglich (7)

| # | Befund | Umsetzung |
|---|---|---|
| D3 | `ueber.html` publizierte eine Gewichtung, die nichts steuert | Tabelle auf die tatsächlich gerechneten zwölf Domains umgestellt, Werte aus `C.domainMeta` nachgerechnet. **Keine Gewichte geändert** — Kalibrierungs-Freeze unberührt. `C.weights` bleibt erhalten und ist als wirkungslos kommentiert |
| D4 | „7 Bereiche" doppelt auf der Ergebnisseite | Legacy-Block heißt „Dein Profil im Überblick"; Werte und Radar unverändert; Report und App nachgezogen |
| D6 | 22 Labels ohne Bezug, 8 namenlose ✕-Knöpfe | 23 Labels verknüpft, alle ✕ benannt, Anmeldefeld beschriftet |
| D9 | 249 h1 über die Ebook-Seiten | Kapitelüberschriften auf h2; jede Seite hat jetzt genau eine h1; `blueprint.html` hat eine eigene Titel-h1 bekommen; CSS-Selektoren tag-unabhängig, Optik identisch |
| D12 | SW registrierte auf jeder Seite | Nur noch auf App-Seiten und für installierte Nutzer; bestehende Installationen werden weiterhin aktualisiert |
| D13 | Toter Programm-CSS-Block | 12,3 KB entfernt, drei live genutzte Klassen und die `#courseGate`-Print-Regel erhalten |
| D14 | Vier tote Funktionen | Entfernt, samt der zugehörigen `.intel-insight`-Regeln |

---

## Zwei Befunde, die der Prüfung nicht standhielten

**D13 / `.doc-*`-Block — nur teilweise umgesetzt, mit Absicht.**
Das Audit führt `.doc-toolbar`, `.doc-toc`, `.doc-level`, `.doc-table`,
`.doc-actionbox`, `.doc-quickstart` und `.doc-figure` als tot. Im greifbaren
Quelltext stimmt das. Aber `ebooks/master-ebook.html`,
`ebooks/protokoll.html` und `ebooks/ultimate-stack.html` laden `style.css`
und füllen einen leeren `<div>` mit HTML, das erst zur Laufzeit aus einem
AES-Vault entschlüsselt wird. Dieses Markup liegt nirgends im Klartext vor
— es kann diese Klassen benutzen. Für 3,7 KB unkomprimiert bezahlte Inhalte
zu riskieren, die niemand gegenprüfen kann, ist der schlechtere Handel. Der
`.course-*`-Block dagegen ist beweisbar tot (`js/course.js` rendert mit
`c2-*`, der Kurs-Vault enthält Daten statt Markup) und wurde entfernt.

**S30 / `esc()` auf `personalInsights()[].text` — bewusst nicht angewendet.**
Diese Texte enthalten planvoll `<strong>`-Markup aus `check-data.js`;
maskiert stünde es sichtbar auf der Seite. Interpoliert werden dort nur
interne Kennzahlen, keine Nutzereingaben. Escaped wurden die Stellen, an
denen tatsächlich Formulareingaben landen: Vorname, E-Mail, Bestellnummer.

---

## Drei Befunde, die erst die Browser-QA gefunden hat

**Q1 · Der Tracker-Import war vollständig tot.**
Beim Test der Tastaturbedienung (S16) war `#trkImport` nach dem Laden nicht
im DOM. Ursache: `data-i18n` stand auf dem `<label>`, und `js/i18n.js`
übersetzt per `textContent` — was jedes Kindelement entfernt. Jeder
Seitenaufruf löschte damit das `<input type="file">`. Der einzige Weg, ein
Tracker-Backup zurückzuspielen, funktionierte nicht, unabhängig von Maus
oder Tastatur. `data-i18n` sitzt jetzt auf einem `<span>`; ein Test prüft
projektweit, dass kein `[data-i18n]`-Element Kindelemente enthält.

**Q2 · Kontrast auf hellem Papier.**
Der Marken-Akzent `#2e7cf6` ist auf dunklem Grund richtig, erreicht auf dem
weißen Dokumentpapier aber nur 3,94:1. Betroffen waren 50 Inline-Links in
12 Dokumentseiten, die Kicker-Zeile und die Dokument-Fußzeile (2,54:1).
Umgestellt auf `#1a56c4` (6,62:1) bzw. `#646c7c` (5,28:1) — nur dort, wo
heller Grund vorliegt. Der Akzent selbst bleibt unverändert.

**Q3 · Weißer Text auf gefüllten Schaltflächen.**
Aktiver Tracker-Tab und aktive Einheiten-Umschaltung: Weiß auf `--accent`
ergibt 3,94:1. Die beiden Flächen gehen eine Stufe tiefer (`#215fc9`,
5,92:1); die Markenfarbe bleibt, wo sie hingehört.

Nicht geändert: die großen Geisterziffern („01", „02") mit 14 % Weiß. Sie
sind Ornament — die eigentliche Angabe steht als voll kontrastierender Text
daneben, auf `protokoll.html` liefert das `<ol>` die Ordnungszahl ohnehin
strukturell. Sie tragen jetzt `aria-hidden="true"`, womit die Ausnahme nach
WCAG 1.4.3 dokumentiert statt bloß angenommen ist.

---

## Offen — braucht eine Entscheidung des Inhabers

- **D1 · `shop.html`** beschreibt Test-Kits und Tracking-Zubehör; verkauft
  werden vier digitale Artikel. Solange kein Blutwerte-Produkt existiert,
  ist die Seite per S29 aus dem Index genommen. Die inhaltliche Korrektur
  hängt an der Produktentscheidung.
- **D2 · `circle.html`** beschreibt im Präsens eine laufende Gruppe, während
  ohne `paypalPlanId`/`telegramInvite` nur die Warteliste gerendert wird.
  Ebenfalls vorläufig aus dem Index.
- **D5 · 30-Tage-Garantie** ist beworben, steht aber in keiner AGB-Klausel.
  Ein eigener Absatz braucht eine rechtliche Freigabe.

## Blockiert durch fehlende Zugangsdaten

- `bash tools-dev/deploy-telemetry.sh` — braucht `SUPABASE_ACCESS_TOKEN`
  und `SUPABASE_DB_PASSWORD`. Der Client-Teil ist live und schreibt ins
  Leere, bis die Funktion deployt ist (Opt-in, kein Datenverlust).
- GitHub-Standardbranch auf `main` umstellen — nur über die GitHub-
  Oberfläche möglich, der Proxy verweigert Schreibzugriffe auf
  Repository-Einstellungen. Bis dahin gilt `DEPLOYMENT.md`.

---

## Prüfung

```
node tools-dev/tests/fixes-audit.test.js     # 246 Assertions, alle Korrekturen dieser Runde
for x in tools-dev/tests/*.test.js; do node "$x"; done   # 1563 Assertions, 0 Fehler
```

Browser-QA (Chromium, 360–1280 px): 71 Prüfungen über Startseite, Score-
Ergebnis nach echtem Wizard-Durchlauf, Tracker, App, Magazin, Ebooks,
Programmseite und Kontrast auf zwölf Seiten mit korrekter Alpha-Komposition
— 0 Fehler.
