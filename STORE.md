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
> No subscription. No ads. No tracking. Your data stays on the device — an
> account is optional and only syncs your plan between devices. Progress
> photos are never uploaded.
>
> The plan is rule-based, not AI and not medicine. It does not replace
> medical advice.

## Schluesselbegriffe (max. 100 Zeichen)

```
Trainingsplan,Muskelaufbau,Abnehmen,Fitness,Kalorien,Makros,Krafttraining,Tracker,12 Wochen
```
(97 Zeichen. „MaleMetrix" nicht wiederholen — der Name zaehlt ohnehin.)

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
| Fotos | **nein** — Fortschrittsfotos verlassen das Geraet nie, gespeichert wird nur ein Haekchen | — | — | — |
| Standort, Kontakte, Kennungen, Nutzungsdaten, Diagnose | **nein** | — | — | — |

**Tracking (App Tracking Transparency):** Nein. Die App verfolgt Nutzer nicht
ueber Apps und Websites anderer Anbieter hinweg, es gibt keine Werbe-SDKs und
keine Werbe-IDs. Damit ist auch kein ATT-Dialog noetig.

**Ohne Konto** verlaesst kein einziges Datum das Geraet. Die Analyse-Ereignisse
(`ANALYTICS.md`) zaehlen nur lokal und enthalten grundsaetzlich keine
Gesundheitswerte.

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
> Nativ genutzt werden lokale Mitteilungen (zwei Erinnerungen pro Woche,
> vollstaendig auf dem Geraet geplant), Haptik und die sichere Ablage der
> Plandaten. Ein Konto ist optional; ohne Konto ist die App vollstaendig
> nutzbar und sendet keine Daten.
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
