# STORE — Angaben fuer App Store Connect

Alles, was Apple bei der Einreichung abfragt, hier vorbereitet. Beim Anlegen
der App kopierst du die Felder herueber; die Angaben sind so formuliert, dass
sie zur tatsaechlichen App passen — nicht zu einer schoeneren Version davon.

Grundlage: `DATENSCHUTZ_GEN2.md`, `ANALYTICS.md`, `PRODUCT_ARCHITECTURE.md`.

---

## Grunddaten

| Feld | Wert |
|---|---|
| Name | MaleMetrix |
| Untertitel (max. 30 Zeichen) | `Dein 12-Wochen-Plan` (19) |
| Bundle-ID | `de.malemetrix.app` |
| SKU | `malemetrix-app-001` |
| Primaersprache | Deutsch (Deutschland) |
| Kategorie | Gesundheit & Fitness · Zweitkategorie: Lifestyle |
| Preis | Kostenlos, keine In-App-Kaeufe |
| Support-URL | https://www.malemetrix.com/kontakt.html |
| Marketing-URL | https://www.malemetrix.com |
| Datenschutz-URL | https://www.malemetrix.com/datenschutz.html |

## Beschreibung (Deutsch)

> MaleMetrix zeigt dir ein realistisches koerperliches Ziel, macht daraus
> deinen persoenlichen 12-Wochen-Plan und sagt dir jeden Tag, was konkret
> dran ist.
>
> **So laeuft es**
> Du waehlst dein Zielbild. Ein kurzer Check findet deinen groessten Engpass
> — nicht als Zahlenfriedhof, sondern als eine Sache, an der es gerade haengt.
> Daraus entsteht dein Plan: Trainingstage, Kalorien- und Proteinziel,
> Mahlzeitenbausteine, Einkaufsliste, Wochenstruktur.
>
> **Jeden Tag**
> Der Tab „Heute" zeigt genau einen Schritt. Training wird mit Satz und
> Gewicht durchgefuehrt, nicht nur abgehakt. Gewicht eintragen dauert zwei
> Sekunden. Sonntags fuehrt dich der Wochencheck durch fuenf Fragen und passt
> den Plan an — nach festen Regeln, nicht nach Gefuehl.
>
> **Was drin ist**
> · 12-Wochen-Plan aus deinen Werten, jederzeit anpassbar
> · Trainings-Tracker mit Satzvorschlag aus dem letzten Mal, PRs, Rest-Timer
> · 19 Rechner: BMI, Koerperfett, FFMI, BMR/TDEE, Makros, 1RM und mehr
> · Fortschritt: Gewichtsverlauf, Umsetzungsquote, Foto-Checkpoints
> · Zwei Erinnerungen pro Woche, von deinem iPhone geplant
> · Apple Health (optional): dein Kalorienziel rechnet mit dem gemessenen
>   Tagesverbrauch von Uhr oder iPhone statt mit einer Schaetzformel
>
> **Was NICHT drin ist**
> Kein Abo. Keine Werbung. Kein Tracking. Deine Daten bleiben auf dem
> Geraet — ein Konto ist freiwillig und dient nur dazu, den Plan zwischen
> Geraeten zu synchronisieren. Fortschrittsfotos werden nie hochgeladen.
>
> **Ehrlich gesagt**
> Der Plan ist regelbasiert, keine KI und keine Medizin. Er ersetzt keine
> aerztliche Beratung. Bei Beschwerden, Medikamenten oder Vorerkrankungen:
> erst zum Arzt, dann trainieren.

## Beschreibung (Englisch)

> MaleMetrix shows you a realistic physical goal, turns it into your personal
> 12-week plan, and tells you what to do each day.
>
> Choose your target. A short check finds your biggest bottleneck — one thing,
> not a wall of numbers. From that comes your plan: training days, calorie and
> protein targets, meal building blocks, shopping list, weekly structure.
>
> The "Today" tab shows exactly one step. Workouts run set by set with weight
> suggestions from last time. The Sunday weekly check walks you through five
> questions and adjusts the plan by fixed rules, not by mood.
>
> Optionally connect Apple Health: your calorie target is then based on your
> measured daily burn from watch or iPhone instead of an estimate formula.
> Health data stays on your device.
>
> No subscription. No ads. No tracking. Your data stays on the device — an
> account is optional and only syncs your plan between devices. Progress
> photos are never uploaded.
>
> The plan is rule-based, not AI and not medicine. It does not replace
> medical advice.

## Schluesselbegriffe (max. 100 Zeichen)

```
Trainingsplan,Muskelaufbau,Abnehmen,Kalorien,Makros,Krafttraining,Tracker,Health,12 Wochen
```
(90 Zeichen. „MaleMetrix" nicht wiederholen — der Name zaehlt ohnehin.)

## Neuheiten in dieser Version (v1.0)

> Erste Version.

---

## App-Datenschutz (die Fragen im „App Privacy"-Formular)

Diese Antworten bilden ab, was die App wirklich tut. Bitte nichts davon
„vorsichtshalber" ankreuzen — falsche Angaben in beide Richtungen sind ein
Ablehnungsgrund.

**Werden Daten erfasst?** Ja, aber nur zwei Kategorien — und beide nur, wenn
der Nutzer freiwillig ein Konto anlegt.

| Datentyp | Erfasst | Zweck | Mit Identitaet verknuepft | Tracking |
|---|---|---|---|---|
| E-Mail-Adresse | nur mit Konto | App-Funktionalitaet (Anmeldung per Magic Link) | ja | **nein** |
| Fitness- und Gesundheitsdaten (Gewicht, Trainingsprotokoll, Planziele) | nur mit Konto | App-Funktionalitaet (Synchronisierung zwischen Geraeten) | ja | **nein** |
| Apple-Health-Daten (Verbrauch, Schritte, Schlaf, HRV, Ruhepuls) | **nein** — bleiben auf dem Geraet, nur der gemittelte Tagesverbrauch geht in die lokale Planrechnung | — | — | — |
| Fotos | **nein** — Fortschrittsfotos verlassen das Geraet nie, gespeichert wird nur ein Haekchen | — | — | — |
| Nutzungsdaten (Seitenaufrufe, Herkunft, Geraeteklasse) | **ja**, immer | Analyse | **nein** | **nein** |
| Standort, Kontakte, Kennungen, Diagnose | **nein** | — | — | — |

> **Achtung, hier stand vorher etwas Falsches.** Bis zum 08.08.2026 fuehrte
> diese Tabelle „Nutzungsdaten: nein" und darunter den Satz „Ohne Konto
> verlaesst kein einziges Datum das Geraet". Beides stimmt nicht: `js/analytics.js`
> laedt Cloudflare Web Analytics, und der Token dafuer ist in `js/config.js`
> gesetzt. Der Beacon laeuft auf jedem Bildschirm, auch ohne Konto. Eine
> falsche Angabe im App-Privacy-Formular ist ein Ablehnungsgrund — und eine,
> die Apple leicht nachprueft, weil sie den Netzverkehr der App sieht.
>
> Wenn du das **nicht** willst: `cloudflareToken` in `js/config.js` leeren.
> Dann faellt die Zeile oben weg und der alte Satz stimmt wieder. Solange der
> Token steht, gilt die Tabelle wie hier.

**Tracking (App Tracking Transparency):** Nein. Cloudflare Web Analytics ist
cookielos, nutzt keine Werbe-ID und verknuepft nichts mit einer Person oder
mit Daten anderer Anbieter. Es gibt keine Werbe-SDKs. Damit ist kein
ATT-Dialog noetig — die Nutzungsdaten sind „nicht verknuepft" und „kein
Tracking".

**Ohne Konto** verlassen ausser diesen Zaehldaten keine Inhalte das Geraet:
kein Gewicht, kein Trainingsprotokoll, kein Health-Wert, kein Foto. Die
Ereignisse aus `ANALYTICS.md` bleiben lokal und enthalten nie
Gesundheitswerte.

**Datenschutzmanifest.** `ios-app/App/App/PrivacyInfo.xcprivacy` sagt
dasselbe in Apples Format — seit Fruehjahr 2024 Pflicht fuer neue
Einreichungen. Die Datei und die Tabelle oben muessen uebereinstimmen;
`tools-dev/tests/native-app.test.js` prueft das bei jedem Lauf mit.

## Alterseinstufung

Fragebogen durchgehen, alle Kategorien „Keine/Nie" **ausser**:

- *Medizinische/behandlungsbezogene Informationen*: **Selten/mild**
  (Trainings- und Ernaehrungsempfehlungen, keine Diagnosen, keine
  Medikamentenberatung)

Erwartetes Ergebnis: **12+**.

## Hinweise fuer die Pruefung (Review Notes)

> Die App ist der persoenliche 12-Wochen-Begleiter von MaleMetrix. Sie laeuft
> vollstaendig offline: alle Inhalte sind im App-Bundle enthalten, es wird
> keine Website nachgeladen.
>
> Nativ genutzt werden HealthKit, lokale Mitteilungen (zwei Erinnerungen pro
> Woche, vollstaendig auf dem Geraet geplant), Haptik und die sichere Ablage
> der Plandaten. Ein Konto ist optional; ohne Konto ist die App vollstaendig
> nutzbar und sendet keine Daten.
>
> **Zu HealthKit:** Gelesen werden Aktiv- und Grundumsatz, Schritte, Schlaf,
> HRV, Ruhepuls und Gewicht — ausschliesslich, um das Kalorienziel aus dem
> gemessenen Tagesverbrauch statt aus einer Schaetzformel zu berechnen.
> Geschrieben wird nur ein vom Nutzer eingetragenes Gewicht, und nur auf
> ausdrueckliche Aktion. Health-Daten verlassen das Geraet nicht, werden nicht
> an einen Server gesendet, nicht fuer Werbung genutzt und nicht mit Dritten
> geteilt. Die App laeuft vollstaendig ohne Health-Zugriff; die Anbindung ist
> optional und jederzeit widerrufbar.
>
> Die App enthaelt keine Kaeufe, keine Abonnements und keine Verweise auf
> externe Kaufmoeglichkeiten.
>
> Die Trainings- und Ernaehrungsempfehlungen sind vollstaendig regelbasiert
> (feste Formeln: Mifflin-St Jeor fuer den Grundumsatz, gedeckelte
> Gewichtsaenderungsraten, Sicherheitsvorrang im Wochencheck). Es gibt keine
> KI-generierten Gesundheitsaussagen und keine Diagnosen. Auf die Grenze zur
> aerztlichen Beratung wird in der App und in der Beschreibung hingewiesen.
>
> Test ohne Konto moeglich — einfach dem Einstieg folgen.

**Demo-Konto:** nicht erforderlich (die App laeuft ohne Anmeldung). Falls Apple
trotzdem eines verlangt, ein Testkonto anlegen und hier eintragen.

## Screenshots

Pflicht ist ein Satz fuer **6,9″** (1320 × 2868 oder 1290 × 2796). Apple
skaliert daraus die kleineren Groessen.

Der Build-Workflow legt bei jedem Lauf Simulator-Screenshots als Artefakt ab
(Actions → ios-app → letzter Lauf → `simulator-screenshots`). Die zeigen den
Startzustand — fuer den Store brauchst du Aufnahmen mit echtem Inhalt:

1. **Heute** mit einem aktiven Plan (der eine Schritt des Tages)
2. **Mein Plan** (Wochenstruktur, Trainingstage)
3. **Workout-Runner** waehrend eines Satzes
4. **Fortschritt** mit Gewichtsverlauf ueber ein paar Wochen
5. **Rechner** (zeigt den kostenlosen Zusatznutzen)

Am ehrlichsten und schnellsten: TestFlight-Build auf dem eigenen iPhone,
zwei Wochen echt benutzen, dann per Seitentaste + Lauter-Taste aufnehmen.
Ausgedachte Screenshots mit Fantasiewerten fallen bei der Pruefung auf und
passen ohnehin nicht zum Anspruch des Produkts.

## Export-Konformitaet

Bereits in `Info.plist` beantwortet (`ITSAppUsesNonExemptEncryption = false`):
Die App nutzt ausschliesslich HTTPS ueber die Systembibliotheken. Deshalb
erscheint bei keinem Upload eine Rueckfrage.
