# PROTOKOLL 28 — Produktspezifikation

Stand: 01.08.2026 · Status: **Entwurf zur Ansicht, nichts gebaut**

> Liegt im Wurzelverzeichnis und wird von GitHub Pages öffentlich ausgeliefert.
> Keine bezahlten Inhalte, keine Codes. Preise sind **VORSCHLAG** und nirgends
> im Produkt aktiv.

---

## 1 — Das Produkt in einem Satz

**28 Tage, ein hartes Defizit, ein hoher Protein-Boden, zwei kurze
Krafteinheiten pro Woche — mit einer Garantie auf das Ergebnis und einem
Eignungs-Check, der Leute ablehnt.**

Zielgruppe ist eng und absichtlich eng: Männer mit **Bauchumfang ab 100 cm**.
Für die ist das Ergebnis nicht Glückssache, sondern Physiologie.

---

## 2 — Die Verkaufsseite (Kernaussagen)

Headline:
> **28 Tage. −8 cm Bauchumfang. Oder du bekommst dein Geld zurück.**

Subline:
> Kein „ohne Verzicht". Vier Wochen unangenehm, dann ist es vorbei.

Die drei Blöcke, die darunter stehen — in dieser Reihenfolge, weil der
Ausschluss vor dem Versprechen kommt:

**a) Für wen das nicht ist.**
> Bauchumfang unter 100 cm? Dann ist das hier das falsche Produkt und du
> bekommst es nicht verkauft. Diabetes, Essstörung in der Vorgeschichte,
> BMI unter 25 — dasselbe. Der Eignungs-Check steht vor dem Kaufbutton, nicht
> im Kleingedruckten.

**b) Was in vier Wochen wirklich passiert.**
> Woche 1 fällt die Waage schnell — davon sind 2–3 kg Wasser und Glykogen.
> Das ist kein Fett und wird auch nicht so verkauft. Ab Woche 2 sind es
> etwa 0,8–1,2 kg Fett pro Woche. Bei einem 100-kg-Mann landen die meisten
> nach 28 Tagen bei **6–9 kg und 6–10 cm Bauchumfang**.

**c) Warum der Bauchumfang zählt und nicht das Gewicht.**
> Gewicht schwankt mit Salz, Schlaf und Darminhalt. Der Bauchumfang tut das
> nicht. Deshalb hängt die Garantie daran.

Und ein Satz, der genauso deutlich dasteht:

> **PROTOKOLL 28 enthält keine Substanzen, empfiehlt keine und braucht keine.
> Der Begrenzer beim Fettabbau ist das Defizit, nicht die Pharmakologie.**

---

## 3 — Die Garantie

**Wortlaut:**
> Miss deinen Bauchumfang an Tag 0. Zieh 28 Tage durch. Sind es an Tag 28
> nicht mindestens 8 cm weniger, bekommst du die 79 € zurück — ohne Diskussion.

**Bedingungen (stehen offen daneben, nicht versteckt):**

| Bedingung | Warum |
|---|---|
| Messung Tag 0 **und** Tag 28, jeweils Foto vom Maßband | ohne Startwert kein Delta |
| mindestens **80 % Tageshäkchen** im Programm | die Garantie gilt dem Protokoll, nicht der Absicht |
| Eignungs-Check bestanden | sonst gäbe es das Produkt gar nicht |

**Warum die Garantie kalkulierbar ist:** Der Eignungs-Check lässt nur Männer
ab 100 cm Bauchumfang durch. In dieser Gruppe sind −8 cm bei 80 % Umsetzung
kein sportliches Ziel, sondern der Normalfall. Wer nicht umsetzt, erfüllt die
Bedingung nicht. Die Rückerstattungen, die trotzdem anfallen, sind
Marketingkosten — und sie sind der Grund, warum der Preis nicht bei 49 €
liegen kann.

Das Zusammenspiel ist der eigentliche Trick: **Der Ausschluss macht die
Garantie bezahlbar.** Beides zusammen ist glaubwürdiger als jede
Vorher-Nachher-Behauptung, und es funktioniert ab Tag 1, ohne dass eine
einzige Fallstudie existiert.

---

## 4 — Der Eignungs-Check (vor dem Kauf)

Mechanik wie `check.html`. Sieben Fragen, echtes Ergebnis:

| Frage | Ausgang |
|---|---|
| Bauchumfang unter 100 cm? | **Kein Verkauf** → Weiterleitung auf DAS PROTOKOLL |
| BMI unter 25? | **Kein Verkauf** |
| Diabetes oder blutzuckersenkende Medikation? | **Kein Verkauf** — ärztlich zu klären |
| Essstörung in der Vorgeschichte? | **Kein Verkauf** |
| Nieren-, Leber- oder Gichterkrankung? | **Kein Verkauf** ohne ärztliche Freigabe |
| Dauermedikation? | Hinweis: vor Start mit Arzt klären |
| Unter 18? | **Kein Verkauf** |

Wer abgelehnt wird, sieht **warum** und bekommt einen brauchbaren Ersatzweg,
keine Sackgasse. Das kostet Umsatz und ist genau deshalb das stärkste
Vertrauenssignal, das die Seite hat — und die einzige Bauweise, die zu
`PROOF_STANDARD.md` §0 passt.

---

## 5 — Die 28 Tage

| Block | Tage | Was passiert |
|---|---|---|
| **KIPPEN** | 1–5 | Kohlenhydrate auf den Boden, Protein hoch, Essfenster schließt sich. Die Waage stürzt — ehrlich eingeordnet als Wasser und Glykogen. |
| **DER BLOCK** | 6–21 | Die harte Phase. 16 Tage gleiche Struktur, gleiche Mahlzeiten, kein Nachdenken. Hier bricht ab, wer abbricht — deshalb ist das der am dichtesten geführte Teil. |
| **SICHERN** | 22–28 | Kontrolliert raus, zurück auf Erhaltung. Die Erwartung an den Rebound wird ehrlich gesetzt statt verschwiegen. |

**Vier Schichten, jeden Tag identisch:**

1. **Protein-Boden** — 2,2–2,6 g pro kg Zielgewicht. Nicht verhandelbar, weil
   daran der Muskelerhalt hängt.
2. **Essfenster** — blockweise enger.
3. **Muskelschutz** — 2× Ganzkörper-Kraft pro Woche, kurz und schwer
   (`STRENGTH`-Tagestyp, `min`-Variante aus `js/program-framework.js`).
4. **Schritte** — 10.000/Tag. Kein zusätzliches Cardio; im Defizit kostet es
   Regeneration und bringt wenig.

**Lieferform:** kein PDF. Ein Bildschirm pro Tag, eine Aufgabe, ein Häkchen.
Die Recheck-Tabelle, die Adhärenz-Berechnung und der Weekly Pulse existieren
bereits im 12-Wochen-Programm und werden wiederverwendet.

---

## 6 — Kohortenstart

Start ist **der erste Montag im Monat**. Anmeldung schließt am Freitag davor.

Drei Effekte, alle echt:
- Dringlichkeit ohne Fake-Countdown — der Termin existiert wirklich.
- Alle sind am selben Tag in Woche 2, wenn es unangenehm wird.
- Du bekommst die Ergebnisse **gebündelt** statt verstreut. `ergebnisse.html`
  ist heute leer; eine Kohorte von 20 Männern liefert in 28 Tagen mehr
  Belege als ein Jahr Einzelstarts.

---

## 7 — Das Enhanced-Begleitkapitel

Laut `FIRST_100_BETA_PLAN.md` §1 sind ~5 % der Zielgruppe auf dem
Enhanced-Pfad. Für die gibt es ein Kapitel, das sonst niemand ehrlich
schreibt: **„Wenn du ohnehin etwas nimmst."**

**Inhalt:** Welche Werte unter einem aggressiven Defizit kippen und worauf zu
achten ist — Lipidprofil, Leberwerte, Nüchternglukose, Hämatokrit, Blutdruck,
Ruhepuls. Woran man erkennt, dass abzubrechen ist. Was in die Hand eines
Arztes gehört und nicht in ein Programm.

**Harte Grenze, ohne Ausnahme:**
- keine Dosierungen
- keine Bezugsquellen
- keine Anwendungs- oder Zyklusanleitung
- keine Substanz als Bestandteil oder Voraussetzung des Programms
- keine Bewerbung auf der Verkaufsseite — das Kapitel steht in der
  Inhaltsliste, nicht im Werbetext

Das ist dieselbe Linie, die das GLP-1-Ebook bereits fährt („ohne Hype, ohne
Empfehlung") und die im `ULTIMATE_STACK_SELANK_MODAFINIL_REPORT.md` als
Prüfpunkt geführt wird („DOSING ENGINE ADDED: NEIN").

**Warum das trotzdem bindet:** Diese Männer finden überall Protokolle und
nirgends jemanden, der ihnen sagt, wann sie aufhören müssen. Genau das ist die
Lücke — und sie lässt sich besetzen, ohne dass du haftest.

---

## 8 — Preis

**79 € (VORSCHLAG).**

- über dem Impuls-Bereich, weil eine Garantie Marge braucht
- unter dem Protokoll (99 €), damit die Leiter stimmt
- **die 79 € werden auf DAS PROTOKOLL angerechnet**, wenn danach gekauft wird
  — dann ist PROTOKOLL 28 nie eine Alternative, sondern der Einstieg

---

## 9 — Was gebaut werden muss

| Baustein | Datei | Aufwand |
|---|---|---|
| Produkt im Katalog | `js/shop-data.js` | klein |
| Entitlement `p28` + GRANTS | `js/os/entitlements.js` | klein |
| Verkaufsseite | neu: `p28.html` | mittel |
| Eignungs-Check | neu, Muster `js/check.js` | mittel |
| Kohorten-Logik (Startdatum, Anmeldeschluss) | neu | mittel |
| 28-Tage-Ansicht | Wiederverwendung `js/program-framework.js` | mittel |
| Garantie-Erfassung (Messung + Foto-Nachweis) | Erweiterung `js/case-study.js` | mittel |
| Bezahlter Inhalt im Vault | `tools-dev/vault.mjs` | **die eigentliche Arbeit** |
| Auslieferung nach Kauf | `resolve-product-access` (existiert) | klein |
| Stripe-Zahlungslink | `js/config.js` → `stripeLinks` | klein |
| Tests | `tools-dev/tests/` | klein |

Der Engpass ist der Inhalt: 28 Tagestexte, drei Blockeinführungen, das
Enhanced-Kapitel, der Ausstiegsblock.

---

## 10 — Beweisführung

`PROOF_STANDARD.md` verlangt heute zwölf abgeschlossene Wochen. Für
PROTOKOLL 28 muss der Standard **erweitert** werden, nicht gebogen:

- eigene Kriterien: W0 und W28, **Bauchumfang als Pflichtwert**
- Adhärenz aus den Häkchen, nicht aus Erinnerung
- Pflichtfeld „Was hat NICHT funktioniert?" bleibt
- **Pflichthinweis an jedem Ergebnis:** ein erheblicher Teil des
  Woche-1-Verlusts ist Wasser
- ein 28-Tage-Ergebnis darf nie als 12-Wochen-Beleg erscheinen

---

## 11 — Was schiefgehen kann

| Risiko | Gegenmaßnahme |
|---|---|
| Rückerstattungsquote höher als kalkuliert | Adhärenz-Bedingung + enger Eignungs-Check; Quote ab Kohorte 1 messen, Preis danach anpassen |
| Abbruch in Woche 2 | Der Block ist der am dichtesten geführte Teil; Weekly Pulse markiert Abbruchgefahr früh |
| Teilnehmer mit unerkannter Vorerkrankung | Eignungs-Check ist die Absicherung — deshalb echte Ablehnungen, keine Pro-forma-Fragen |
| Werbeaussage „−8 cm" angreifbar (UWG) | Zahl ist an Bedingungen und eine definierte Zielgruppe geknüpft und wird nach Kohorte 1 durch eigene Daten belegt oder korrigiert |
| Rebound nach Tag 28 | Block SICHERN ist Produktbestandteil; danach ist DAS PROTOKOLL der Anschluss |

---

## 12 — Offene Entscheidungen

1. **Garantie −8 cm** — oder vorsichtiger −6 cm für die erste Kohorte, bis
   eigene Zahlen vorliegen?
2. **79 €** bestätigen oder ändern.
3. **Kohortengröße** — offen oder gedeckelt (z. B. 30, was die Knappheit echt
   macht und die Betreuung tragbar hält)?
4. **Name** — PROTOKOLL 28 oder etwas Härteres.
