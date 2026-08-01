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

## 2 — Die Verkaufsseite

**Tonlage — die Regel, an der sich jeder Satz misst:**

> Ehrlichkeit, die **vorhersagt**, ist Autorität. Ehrlichkeit, die sich
> **entschuldigt**, ist Schwäche.

„Woche 1 stürzt die Waage, davon sind 2–3 kg Wasser — ich sage es dir vorher,
damit du in Woche 2 nicht denkst, es hört auf zu wirken" klingt wie jemand,
der das hundertmal gesehen hat. „Wir haben dazu noch keine Daten" klingt wie
ein Praktikant. Beides ist wahr, nur eines verkauft. **Auf der Seite steht
kein Satz, der das eigene Angebot relativiert.** Die Garantie trägt das
Risiko — sie braucht keinen Disclaimer daneben, der sie wieder einreißt.

---

**Headline:**
> # 28 Tage. −8 cm Bauchumfang. Oder du zahlst nichts.

**Subline:**
> Miss an Tag 0. Miss an Tag 28. Die Zahl entscheidet — nicht ich, und nicht
> dein Gefühl.

**a) Der Einstieg.**
> Du kennst dein Problem. Es sitzt vorne, es ist seit Jahren da, und kein
> Januar hat daran je etwas geändert.
>
> PROTOKOLL 28 ändert es in vier Wochen. Nicht, weil es ein Wundermittel
> gibt, sondern weil du zum ersten Mal ein Defizit fährst, das hart genug
> ist — und einen Protein-Boden, der deine Muskeln dabei schützt.
>
> Ist dein Bauchumfang nach 28 Tagen nicht mindestens 8 cm kleiner,
> bekommst du dein Geld zurück. Ohne Nachfrage.

**b) Nicht jeder bekommt es.**
> Unter 100 cm Bauchumfang verkaufe ich es dir nicht. Diabetes, Essstörung
> in der Vorgeschichte, BMI unter 25 — auch nein.
>
> Das ist keine Höflichkeit. Für dich wäre das Programm hart und der Ertrag
> klein, und die Garantie könnte ich dir dann nicht geben. Der Check steht
> **vor** dem Kaufbutton.

**c) Was in den vier Wochen passiert — vorher gesagt, nicht hinterher erklärt.**
> **Woche 1:** Die Waage stürzt. 2–3 kg. Das ist Wasser und Glykogen, kein
> Fett. Ich sage es dir jetzt, damit du in Woche 2 nicht denkst, es
> funktioniert nicht mehr, wenn der Sturz aufhört.
>
> **Woche 2:** Der unangenehmste Teil. Hier hörst du auf, wenn du aufhörst.
> Deshalb ist das der am dichtesten geführte Block des Programms.
>
> **Woche 3:** Es läuft. Die Hose sitzt anders, bevor die Waage es einholt.
>
> **Woche 4:** Der kontrollierte Ausstieg — der Teil, den jede Crash-Diät
> auslässt und an dem jede Crash-Diät scheitert.

**d) Warum der Bauchumfang und nicht das Gewicht.**
> Gewicht schwankt mit Salz, Schlaf und Darminhalt. Es lügt dich an, in
> beide Richtungen. Der Bauchumfang tut das nicht. Deshalb hängt die
> Garantie daran — und deshalb ist es die Zahl, an der du das Ergebnis
> siehst, bevor irgendjemand etwas sagt.

**e) Der Satz, der genauso deutlich dasteht:**
> **PROTOKOLL 28 enthält keine Substanzen und empfiehlt keine. Der Begrenzer
> beim Fettabbau ist das Defizit, nicht die Pharmakologie.**

Das ist kein Rückzieher, sondern Abgrenzung nach oben: Der halbe Markt
verkauft Abkürzungen. Hier steht, dass es keine braucht.

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

## 12 — Entschieden

| Punkt | Entscheidung |
|---|---|
| Garantie | **−8 cm** (nicht die vorsichtige Variante) |
| Kohortengröße | **ungedeckelt** |
| Preis | 79 € (wie vorgeschlagen) |
| Name | PROTOKOLL 28 (wie vorgeschlagen) |

Die Kohorte ist ungedeckelt — damit fällt die Knappheit als Verkaufsmechanik
weg und der **Termin** trägt die Dringlichkeit allein. Das ist tragfähig, hat
aber eine Folge für Block 2: Wenn 200 Männer gleichzeitig in Woche 2 sind,
gibt es niemanden, der sie einzeln auffängt. Das Programm muss den
Abbruchmoment deshalb **selbst** abfangen (Weekly Pulse, Troubleshooting im
Tagestext) statt auf Betreuung zu bauen.

---

## 13 — Kollision mit den eigenen Wächtern

Beim Bauen sind zwei Stellen aufgelaufen. Die erste ist erledigt, die zweite
braucht deine Entscheidung.

### 13.1 G5 war auf genau ein Produkt geschrieben — behoben

`tools-dev/tests/security-guards.test.js` verglich den **ersten** `price:` aus
`js/shop-data.js` gegen den **ersten** `priceCents:` aus `fulfillment.mjs`.
Bei einem Ein-Produkt-Katalog reichte das. Ein zweites Produkt mit falschem
Preis wäre **unbemerkt** durchgegangen — und ein auseinanderlaufender Preis
lässt serverseitig jede Zahlung auflaufen (`validateProducts` rechnet die
Summe aus dem Server-Katalog).

Der Wächter liest jetzt **beide Kataloge vollständig** ein und vergleicht je
Produkt-ID. Gegengeprüft: Ein absichtlich falscher Serverpreis (6900 statt
7900) lässt die Suite jetzt scheitern — vorher nicht.

### 13.2 Die −8 cm kollidieren mit dem Proof-Standard — offen

`tools-dev/tests/proof-standard.test.js` prüft öffentliche Seiten gegen:

```js
var claims = /(\d+\s*(kg|cm)\s*(in|nach)\s*\d+\s*Wochen|garantierte[rs]?\s+Erfolg|…)/i;
ok(anyPublished || !claims.test(src), "kein Ergebnisversprechen ohne hinterlegte Fallstudie");
```

`js/case-studies-data.js` ist leer, also greift die Regel. Die Verkaufsseite
sagt **„−8 cm in 28 Tagen"** — exakt das, was die Regel verhindern soll.

**Formal würde es durchgehen:** Der Ausdruck verlangt „Wochen", die Seite
schreibt „Tagen". Diese Lücke zu benutzen wäre die unehrlichste verfügbare
Option — Wächter bestanden, Standard gebrochen. Kommt nicht in Frage.

**Die Auflösung ist eine andere:** Der Wächter unterscheidet bisher nicht
zwischen zwei völlig verschiedenen Sätzen.

| Satz | Wer trägt das Risiko | Braucht Beleg |
|---|---|---|
| „Männer verlieren hier 8 cm in 28 Tagen." | der Käufer | **ja** — das ist eine Behauptung über typische Ergebnisse |
| „−8 cm oder du zahlst nichts." | der **Verkäufer** | nein — das ist eine Angebotsbedingung |

Der zweite Satz ist kein Ergebnisversprechen, sondern eine
**Rückgabe-Zusage**. Er behauptet nichts über den Käufer; er verpflichtet den
Verkäufer. Genau deshalb darf er ohne Fallstudie stehen — und genau deshalb
braucht er **keinen relativierenden Zusatz**. Ein „wir haben dazu noch keine
Daten" daneben würde die Zusage nicht ehrlicher machen, nur schwächer.

**Wächter-Erweiterung:** Eine Ergebniszahl auf einer öffentlichen Seite ist
erlaubt, **wenn sie auf derselben Seite an eine Rückgabe-Zusage samt
Bedingungen gebunden ist**. Steht die Zahl frei — ohne Garantie, ohne
Bedingungen — schlägt die Suite weiterhin fehl, und der Ausdruck wird dabei
zusätzlich auf `Tagen|Wochen|Monaten` erweitert, damit die heutige Lücke
zugeht. Unterm Strich ist das eine **Verschärfung**: Aktuell käme jede
Zahl mit „Tagen" überall durch.

Die einzige Bedingung, die diese Konstruktion trägt: **Die Garantie muss
tatsächlich bedient werden.** Eine nicht eingelöste Rückgabe-Zusage ist nach
UWG angreifbar und beendet das Produkt schneller als jede schwache Headline.

### 13.3 Der schnellste Weg aus der Beleglage

Diese ganze Frage verschwindet nach 28 Tagen — sobald echte Durchläufe
vorliegen.

1. **Eigener Durchlauf.** Du machst PROTOKOLL 28 selbst, dokumentiert nach
   `PROOF_STANDARD.md` (W0/W28, Maßband, Adhärenz aus dem Programm). Das ist
   ein legitimer Beleg, sofort verfügbar, und es prüft nebenbei das Programm.
2. **Kohorte 1** liefert 28 Tage nach Start den Rest — ungedeckelt und mit
   gemeinsamem Startdatum kommen die Daten gebündelt.

Danach steht auf der Seite eine Zahl mit echten Fällen dahinter, und die
Garantie ist nicht mehr die einzige Stütze, sondern der Verstärker.

---

## 14 — Was jetzt gebaut ist

| Baustein | Zustand |
|---|---|
| Server-Katalog `p28`, 7900 ct, Entitlement `p28` | ✅ `fulfillment.mjs` |
| Fähigkeit `P28_PROGRAM` + Grant | ✅ `js/os/entitlements.js` |
| Shop-Eintrag, 79 € | ✅ `js/shop-data.js` — **`hidden: true`** |
| Wächter G5 mehrproduktfähig | ✅ mit Gegentest |
| Testsuite | ✅ 35 Suiten, 2.896 Assertions, 0 Fehler |
| Verkaufsseite `p28.html` | ⛔ wartet auf 13.2 |
| Eignungs-Check | ⛔ wartet auf 13.2 |
| 28 Tagestexte (Vault) | ⛔ die eigentliche Arbeit, noch nicht begonnen |
| Kohorten-Logik | ⛔ offen |

**`hidden: true` ist Absicht.** Preis und Rechte stehen auf Client und Server
identisch, damit der Wächter greift — aber das Produkt taucht im Shop nicht
auf, solange kein Inhalt existiert. Ein kaufbares Produkt ohne Inhalt wäre
Geld gegen nichts.
