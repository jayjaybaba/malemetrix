# PRODUKT-PORTFOLIO — Bessere Verkaufsprodukte (Konzept)

Stand: 01.08.2026 · Status: **Konzept, nichts gebaut** · Nachfolger der
Portfolio-Frage aus `BUSINESS-MODEL.md`

> Diese Datei liegt im Wurzelverzeichnis und wird von GitHub Pages **öffentlich
> ausgeliefert**. Sie enthält deshalb keine Passagen aus bezahlten Kapiteln,
> keine Zugangscodes und keine Kundendaten. Alle Preise sind als **VORSCHLAG**
> gekennzeichnet und nirgends im Produkt aktiv. Wer das ändern will, muss die
> Sichtbarkeitsfrage aus `BUILD.md` (Repository privat stellen) zuerst klären.

---

## 0 — Der Auftrag in einem Satz

Es gibt zu wenig zu kaufen: **ein** digitales Produkt (99 €) und **ein**
Betreuungsprodukt (199 €/Monat). Dieses Dokument sagt, welche Produkte
dazukommen sollten, warum genau diese, was sie kosten und in welcher
Reihenfolge sie entstehen — mit **UPF · Urals Protein Fasten** als
ausformuliertem Erstkandidaten.

---

## 1 — Bestandsaufnahme (ACTUAL)

| Ebene | Angebot | Preis | Zustand |
|---|---|---|---|
| Kostenlos | Score-Check, 19 Rechner, Tracker, Kalorien-Tagebuch, Magazin | 0 € | groß, funktioniert |
| Kostenlos (Zeit!) | Analysegespräch (45 Min) | 0 € | verbraucht die knappste Ressource |
| Kostenlos (Zeit!) | Coaching-Erstgespräch (30–45 Min) | 0 € | dito |
| Kauf | **DAS PROTOKOLL** inkl. 12-Wochen-Programm | 99 € einmalig | einziges Shop-Produkt (`js/shop-data.js`) |
| Betreuung | **1:1 Coaching** | 199 €/Monat | kapazitätsbegrenzt (§46) |

### Drei Befunde, die im Repo aktuell nicht stimmen

1. **`README.md` Zeile 14** behauptet „Shop — **9 Produkte** inkl. **9-€-Express-Plan
   (Tripwire)**". `js/shop-data.js` enthält **genau ein** Produkt, keinen Tripwire.
   Auch Zeile 17 („Conversion-Brücken … verlinken auf Coaching/**Tripwire**")
   und Zeile 67 („**Tripwire**-Klick") beschreiben etwas, das es nicht gibt.
2. **`shop.html` Meta-Description** verspricht „BloodMetrix **Home-Test-Kits**,
   **Tracking-Zubehör** und personalisierte Reports … Versand aus Deutschland".
   Nichts davon existiert. Das ist die Beschreibung, die in Google-Ergebnissen
   und beim Teilen erscheint.
3. **`js/affiliates.js`** ist vollständig gebaut (Partner-Links, `rel="sponsored"`,
   Pflicht-Kennzeichnung) und **nirgends konfiguriert** — eine fertige,
   ungenutzte Einnahmequelle ohne Lager und ohne Fulfillment.

Punkt 1 und 2 sind keine Kleinigkeiten: Sie versprechen Produkte, die nicht
lieferbar sind. Nach dem Maßstab von `PROOF_STANDARD.md` §0 gehören sie
korrigiert, unabhängig von allem anderen in diesem Dokument.

---

## 2 — Warum das aktuelle Portfolio unter seinen Möglichkeiten bleibt

Nicht weil das Produkt schlecht ist. Weil die **Verpackung** nur einen
einzigen Kaufmoment kennt.

**a) Ein Preispunkt = eine Entscheidung.** Wer heute überzeugt ist, zahlt 99 €.
Wer *fast* überzeugt ist, kann nichts tun. Es gibt keinen kleinen Schritt
zwischen „kostet nichts" und „kostet 99 €". Das ist eine binäre
Conversion-Architektur; jeder Zweifel führt zu 0 €.

**b) Das Protokoll hat keinen Anlass.** Es ist ein **Referenzwerk** — es
verspricht Vollständigkeit. Vollständigkeit verkauft schlecht, weil sie keinen
Anfang und kein Ende hat. Niemand wacht auf und denkt „heute kaufe ich ein
Nachschlagewerk". Produkte, die sich verkaufen, haben ein **Startdatum, eine
Dauer und einen definierten Endzustand**.

**c) Kein Wiederkauf.** Nach dem Kauf gibt es genau eine Anschlussoption: der
Sprung auf 199 €/Monat. Ein zufriedener Käufer, der mehr will, aber kein
Coaching braucht, ist Umsatz, der nicht entsteht.

**d) Kein wiederkehrender Umsatz.** Jeder Monat startet bei null. Der
Kommentar in `js/checkout.js:815` benennt die Folge bereits selbst: *„Genau
daran scheitert später jede bezahlte Werbung, weil 99 € einmalig keine
Werbekosten tragen."*

**e) Die Oberkante des Trichters ist seit Phase 17 offen.** Der
Ebook-Lead-Magnet ist ersatzlos entfallen (dokumentiert in
`BUSINESS-MODEL.md` §5). Es gibt keinen Grund mehr, eine E-Mail-Adresse
zu hinterlassen.

**f) Zwei kostenlose Gesprächsformate.** Analysegespräch (45 Min) und
Coaching-Erstgespräch (30–45 Min) verbrauchen Gründerzeit — die einzige
Ressource, die nicht skaliert — zum Preis von null.

---

## 3 — Die Leitidee: **Bibliothek vs. Durchlauf**

Die Schwäche des Protokolls *als Produkt* ist seine Stärke *als Inhalt*: Es
ist komplett. Daraus folgt die Trennung, auf der alles Weitere aufbaut:

> **DAS PROTOKOLL bleibt die Bibliothek. Die neuen Produkte sind Durchläufe.**

Ein **Durchlauf** hat fünf Eigenschaften, die ein Referenzwerk nicht hat:

| Eigenschaft | Warum sie verkauft |
|---|---|
| Startdatum | „Montag" ist ein Kaufgrund, „irgendwann" ist keiner |
| feste Dauer | begrenzte Verpflichtung senkt die Kaufhürde |
| Tagesaufgabe | der Nutzer weiß jeden Morgen, was zu tun ist |
| Messung W0 → Wn | am Ende steht eine Zahl, kein Gefühl |
| definiertes Ende | ein Ende erzeugt ein Ergebnis — und einen Wiederkauf |

**Das ist keine Umettikettierung.** Der Wissensstand ist derselbe, die
Lieferform ist eine andere: Bibliothek = *nachschlagen, wenn du etwas wissen
willst*. Durchlauf = *ausführen, ohne nachzuschlagen*. Wer beides kauft, zahlt
nicht zweimal für dasselbe — er kauft einmal Wissen und einmal Führung.

**Technisch ist der Weg bereits offen:** `js/program-framework.js` (175 Zeilen,
reine Funktionen, kein DOM, kein localStorage) enthält das Gerüst — Tagestypen,
Modi, Phasen, Wochen-Missionen — getrennt vom bezahlten Vault-Inhalt. Genau
diese Trennung erlaubt einen **zweiten Durchlauf mit derselben Mechanik** und
eigenem Vault. Recheck-Tabelle, Adhärenz-Berechnung, Weekly Pulse und die
Fallstudien-Erfassung (`js/case-study.js`) sind ebenfalls schon da.

---

## 4 — Die Zielleiter

| # | Produkt | Preis (VORSCHLAG) | Job im Portfolio | Wiederkauf |
|---|---|---|---|---|
| 0 | Score · Rechner · Tracker · Magazin | 0 € | Reichweite | — |
| 1 | **Der Arztbrief** (Lead-Magnet) | 0 € gegen E-Mail | Liste aufbauen | — |
| 2 | **UPF · Urals Protein Fasten** | **49 €** | Erstkauf mit Anlass | ja, 2–3×/Jahr |
| 3 | DAS PROTOKOLL | 99 € (unverändert) | Wissensbasis | nein |
| 4 | **Der Durchlauf-Pass** | **12 €/Monat** | die einzige echte MRR | laufend |
| 5 | **Der Werte-Termin** (90 Min, einmalig) | **149 €** | Gründerzeit monetisieren | gelegentlich |
| 6 | 1:1 Coaching | 199 €/Monat (unverändert) | Oberkante | laufend |
| 7 | Partner-/Laborlinie (Affiliate) | Provision | Umsatz ohne Produkt | laufend |

Vier Kaufprodukte gleichzeitig sind die Obergrenze, die ein einzelner
Betreiber inhaltlich ehrlich pflegen kann. Mehr ist keine Auswahl, sondern
Verwässerung.

---

## 5 — UPF · Urals Protein Fasten (ausformuliert)

### 5.1 Was es ist

Ein **21-Tage-Durchlauf** für den einen Fall, den das Protokoll zwar abdeckt,
aber nicht *führt*: schneller, kontrollierter Fettabbau, ohne dabei die
Muskulatur zu verlieren — proteinerhaltendes Fasten mit hartem
Protein-Boden, engem Essfenster und reduziertem, aber nicht gestrichenem
Krafttraining.

**Der Satz, der es verkauft:**
> *Drei Wochen. Ein Protein-Boden, ein Essfenster, ein Minimum an Training.
> Am Ende steht eine Zahl — und ein kontrollierter Ausstieg, den keine
> Crash-Diät hat.*

### 5.2 Was es ausdrücklich NICHT ist

Dieser Block steht **vor** dem Kaufbutton auf der Verkaufsseite, nicht im
Kleingedruckten:

- keine Nulldiät, kein „Detox", keine „Entgiftung"
- **keine Empfehlung, keine Dosierung und keine Bezugsquelle** für
  Medikamente, Peptide oder verschreibungspflichtige Substanzen
- kein Ersatz für ärztliche Beratung und keine Diagnose
- keine Zusage einer bestimmten Kilozahl
- nicht geeignet bei: Diabetes (insbesondere Typ 1 und bei
  blutzuckersenkender Medikation), Essstörung in der Vorgeschichte,
  BMI < 20, unter 18 Jahren, bestehender Dauermedikation ohne ärztliche
  Rücksprache, Nieren- oder Lebererkrankung

**Produktbestandteil, nicht Disclaimer:** ein **Eignungs-Check vor dem Kauf**
(dieselbe Mechanik wie `check.html`). Wer durchfällt, sieht *warum* und
bekommt den Hinweis auf DAS PROTOKOLL statt eines Kaufbuttons. Das kostet
Umsatz und ist genau deshalb glaubwürdig — es ist außerdem die einzige
Bauweise, die zu §0 des `PROOF_STANDARD.md` passt.

### 5.3 Aufbau — drei Blöcke à sieben Tage

| Block | Tage | Aufgabe | Warum der Block existiert |
|---|---|---|---|
| **I · Entladen** | 1–7 | Protein hoch, Kohlenhydrate auf den Boden, Essfenster schließt sich | Der Körper muss das Defizit annehmen, ohne dass Muskulatur und Disziplin mitgehen |
| **II · Halten** | 8–14 | die harte Mitte: Refeed-Regeln, Training auf Erhaltungsminimum, Schlaf geschützt | Hier bricht jeder Versuch ab. Deshalb ist das der am dichtesten geführte Block |
| **III · Zurückführen** | 15–21 | kontrollierter Ausstieg auf Erhaltung, Erwartung an den Rebound ehrlich gesetzt | **Der Block, den jede Crash-Diät auslässt** — und der Grund, warum ihre Ergebnisse nicht halten |

Block III ist das eigentliche Verkaufsargument. Ein 21-Tage-Programm ohne
Ausstieg ist eine Diät; mit Ausstieg ist es ein Protokoll.

### 5.4 Die vier Schichten (jeden Tag, jeden Tag gleich)

1. **Protein-Boden** — festes Ziel in g/kg fettfreier Masse, nicht
   verhandelbar. Berechnet aus den Werten, die im Tracker ohnehin liegen.
2. **Fastenfenster** — das Essfenster des Tages, blockweise enger.
3. **Muskelschutz** — die minimale wirksame Trainingsdosis aus Kapitel 02
   (`STRENGTH`-Tagestyp, `min`-Variante des bestehenden Frameworks).
4. **Kopf** — die Stress- und Wachheitsschicht. *Das ist der „Ural"-Teil.*

### 5.5 Die Ural-Schicht — und wie sie behandelt wird

Der Name verweist auf die russische Forschungslinie, die im Haus bereits als
Library-Bände existiert (Selank, Modafinil). In UPF ist sie ein
**Aufklärungsmodul**, keine Anwendungsanleitung:

- **Was das Programm selbst benutzt**, sind ausschließlich nicht-pharmakologische
  Werkzeuge für dieselbe Schicht: Lichtanker am Morgen, Koffein-Timing
  (Adenosin-Kapitel), Atemanker vor dem Essfenster, Schlaffenster.
- **Was das Modul erklärt**, ist die Frage, die Männer in Woche 2 ohnehin
  googeln: *„Gibt es dafür was?"* — mit den korrekten Grenzen aus der
  bereits durchgeführten Faktenprüfung
  (`ULTIMATE_STACK_SELANK_MODAFINIL_REPORT.md`):
  - **Selank**: keine arzneimittelrechtliche Zulassung in DE/EU; russische
    Registrierung als **Nasentropfen 0,15 %** (30.04.2009, ATC N05BX);
    Kennzeichnung **EXPERIMENTELL · EVIDENZ FEHLT**.
  - **Modafinil**: **verschreibungspflichtig** nach AMVV Anlage 1; seit
    01.03.2008 nicht mehr in Anlage III BtMG; EU-Zulassung seit
    27.01.2011 **nur Narkolepsie**; ausdrückliche Abgrenzung gegen
    Schlafersatz.
- **Harte Hausregel für dieses Modul:** keine Dosierungen, keine
  Bezugsquellen, keine Anwendungsschritte, keine „Dosing Engine". Genau die
  Linie, die der Ultimate-Stack-Bericht bereits als Prüfpunkt führt.

### 5.6 Ehrlicher Einwand zum Namen

Ein Produkt nach einer Substanzlinie zu benennen, die es selbst **nicht**
verwendet, ist angreifbar — sowohl gegenüber dem eigenen Standard („es wird
nichts erfunden oder geglättet") als auch werberechtlich (HWG: Werbung, die
den Eindruck einer Arzneimittelwirkung erweckt). Zwei Wege, beide gangbar:

- **A (empfohlen):** Name bleibt **UPF · Urals Protein Fasten**, aber die
  Verkaufsseite definiert „Ural" **im ersten Absatz** als das, was es ist —
  den Namen der Wissens-Schicht, nicht des Verfahrens. Dazu ein sichtbarer
  Satz: *„UPF enthält keine Substanzen und empfiehlt keine."*
- **B:** neutraler Name (z. B. **„Der 21-Tage-Protein-Block"**), Ural-Modul
  als benanntes Kapitel darin. Rechtlich die ruhigere Variante, verkauft
  vermutlich schlechter.

Ich baue A, wenn du nichts anderes sagst — mit dem Definitionssatz als
Pflichtbestandteil, nicht als Option.

### 5.7 Preis und Stellung zum Protokoll

**49 € (VORSCHLAG).** Begründung: klar unter dem Protokoll, deutlich über
Impuls-Rauschen, passend für „drei Wochen mit definiertem Ergebnis".

**Gegen Kannibalisierung:** Wer UPF gekauft hat, bekommt die **49 € auf DAS
PROTOKOLL angerechnet**. Damit ist UPF nie eine Alternative zum Protokoll,
sondern dessen Vorstufe — und der Käufer verliert nichts. Umsetzbar über ein
Entitlement-gebundenes Guthaben, kein neuer Preis-Provider nötig.

### 5.8 Technische Umsetzung (Aufwandsschätzung)

| Baustein | Datei | Aufwand |
|---|---|---|
| Produkt im Katalog | `js/shop-data.js` | klein |
| Entitlement `upf` + GRANTS-Eintrag | `js/os/entitlements.js` | klein |
| Fähigkeit `UPF_PROGRAM` in `CAPS` | `js/os/entitlements.js` | klein |
| Verkaufsseite | neu: `upf.html` | mittel |
| Eignungs-Check vor Kauf | neu, Muster: `js/check.js` | mittel |
| Durchlauf-Ansicht (21 Tage) | Wiederverwendung `program-framework.js` | mittel |
| Bezahlter Inhalt im Vault | `tools-dev/vault.mjs` | **die eigentliche Arbeit** |
| Auslieferung nach Kauf | `resolve-product-access` (existiert) | klein |
| Stripe-Zahlungslink | `js/config.js` → `stripeLinks` | klein |
| Tests | `tools-dev/tests/` | klein |

**Der Engpass ist der Inhalt, nicht der Code.** 21 Tagestexte, drei
Blockeinführungen, das Ural-Modul, der Ausstiegsblock — das schreibt kein
Framework.

### 5.9 Der strategische Nebeneffekt: Beweise in drei Wochen statt zwölf

`ergebnisse.html` ist heute leer, weil ein belastbarer Beleg nach
`PROOF_STANDARD.md` §1 **zwölf abgeschlossene Wochen** verlangt. UPF liefert
einen vollständigen Durchlauf in **21 Tagen**. Das ist der schnellste
existierende Weg zu den ersten legitimen Fallstudien.

**Wichtig — und nicht verhandelbar:** Dafür muss `PROOF_STANDARD.md`
**erweitert** werden (eigene Kriterien: W0/W21, eigene Prüftiefen, eigener
Ergebnisrahmen), nicht gebogen. Ein 21-Tage-Ergebnis darf nie als
12-Wochen-Beleg erscheinen, und Gewichtsverlust in drei Wochen ist zu einem
erheblichen Teil Wasser und Darminhalt — das gehört in die Ergebnisdarstellung
selbst, nicht in eine Fußnote.

---

## 6 — Die übrigen Produkte (je kurz)

### 6.1 Der Arztbrief — Lead-Magnet, 0 € gegen E-Mail

Ein **druckbares Ein-Blatt**, das ein Mann mit zum Hausarzt nimmt: welche
Werte er anfragt, in welcher Reihenfolge, was die Praxis erfahrungsgemäß
ablehnt, was Selbstzahler-Werte ungefähr kosten, und ein Feld für die
Ergebnisse.

Warum genau das: Es ist **eigens geschrieben** (kein Protokoll-Kapitel — die
Bedingung aus `BUSINESS-MODEL.md` §5), es ist allein nützlich, und es erzeugt
den Bedarf, den das Protokoll beantwortet — nämlich die Frage, was die
zurückkommenden Zahlen bedeuten. `blutwerte.html` und `checkliste.html`
bleiben frei; der Magnet ist das **gepackte Artefakt**, nicht die Webseite.

### 6.2 Der Durchlauf-Pass — 12 €/Monat, die einzige echte MRR

**Das ist der wichtigste Vorschlag in diesem Dokument.**

`BUSINESS-MODEL.md` entscheidet sich für Modell E: laufende Fähigkeiten
(`FORESIGHT`, `REPORTS`, `ADVISOR`) später an ein Abo binden. Der Schalter
dafür (`SUBSCRIPTION_GATED`) ist gebaut und steht bewusst auf leer.

**Ich schlage vor, ihn leer zu lassen.** Ein Abo, das Fähigkeiten *einzäunt*,
die heute im Kaufpreis stecken, ist immer eine Wegnahme — auch mit
Grandfathering für Altkäufer. Es fühlt sich für Neukunden schlechter an, es
widerspricht der Positionierung „kein Zwangs-Abo", und es macht das
99-€-Produkt schwerer verkäuflich.

**Die Alternative:** Der **Durchlauf-Pass** gibt Zugang zu **allen Durchläufen** —
UPF und jedem weiteren, der quartalsweise dazukommt (z. B. ein
Kraft-Block im Winter, ein VO₂-Block im Frühjahr).

| | Modell E (Feature-Gating) | Durchlauf-Pass |
|---|---|---|
| Was der Kunde zahlt | Zugang zu etwas, das er hatte | Zugang zu etwas Neuem |
| Wirkung auf Altkäufer | Wegnahme, per §14 abgefedert | keine |
| Wirkung auf den 99-€-Verkauf | schwächt ihn | stützt ihn |
| Ehrliche Begründung des Preises | „laufende Serverkosten" | „laufend neuer Inhalt" |
| Aufwand für dich | einmalig Schalter umlegen | **laufend Inhalt liefern** |

Der Nachteil steht ehrlich in der letzten Zeile: Der Pass ist eine
Lieferverpflichtung. Wer sie nicht halten kann, sollte ihn nicht anbieten.
**Er wird deshalb erst aktiviert, wenn der zweite Durchlauf fertig ist** —
nicht mit dem ersten.

### 6.3 Der Werte-Termin — 149 €, einmalig

Heute gibt es zwei kostenlose Gesprächsformate. Beide verbrauchen Gründerzeit
zum Nulltarif, beide sind als Verkaufsgespräch gerahmt.

Vorschlag: **Das Coaching-Erstgespräch bleibt kostenlos** (es ist eine
Kaufentscheidung, das gehört sich). Das **Analysegespräch** wird zum
bezahlten Produkt: 90 Minuten, Score und mitgebrachte Blutwerte werden
durchgegangen, am Ende steht ein schriftlicher Ein-Seiten-Fahrplan. Keine
Diagnose, keine Medikationsberatung — die Grenze aus `PROOF_STANDARD.md` §5
gilt unverändert.

Warum das schnell Geld bringt: **kein Content-Aufwand, kein Vault, kein
Fulfillment.** Buchungsseite, Preis, Rechnung. Von allen Vorschlägen hier der
mit dem kürzesten Weg zum ersten Euro.

### 6.4 Partner-/Laborlinie — Provision

`js/affiliates.js` ist fertig und unkonfiguriert. Blutpanel-Anbieter,
Waagen mit Körperzusammensetzung, Schlaftracker — Produkte, die im Protokoll
ohnehin erklärt werden und die Nutzer ohnehin kaufen.

Kein Lager, kein Versand, keine Rücksendung. Bedingungen: Kennzeichnung
(macht `affiliates.js` bereits: `rel="sponsored"` + Pflichthinweis), und
**keine Empfehlung, die ohne die Provision anders ausfiele** — sonst ist es
die erste Stelle, an der das Haus seine eigene Regel bricht.

Nebenbei repariert das die falsche `shop.html`-Meta-Description (Befund 2).

---

## 7 — Umsatzwirkung (ANNAHMEN, keine Prognose)

Basis: BASE-Szenario aus `BUSINESS-MODEL.md` §5 — 5.000 Besucher/Monat.
Die Zahlen sind **erfunden im Sinne von „modelliert"** und dienen nur dem
Größenvergleich; echte Funnel-Daten liegen weiterhin nicht vor.

| Linie | heute | mit Leiter (ANNAHME) |
|---|---|---|
| Einmalumsatz digital | ~1.089 € (11 × 99 €) | ~1.100 € + ~1.300 € (≈27 × 49 €) |
| Wiederkehrend | **0 €** | Pass: wächst mit der Käuferbasis |
| Zeit-Umsatz | **0 €** | Werte-Termin, kapazitätsbegrenzt |
| Provision | **0 €** | klein, aber ohne Grenzkosten |

Die Aussage ist ausdrücklich **nicht** „das verdoppelt den Umsatz". Sie ist:
**drei von vier Umsatzlinien existieren heute überhaupt nicht.** Das ist der
eigentliche Befund, und er hängt nicht an der Genauigkeit der Zahlen.

---

## 8 — Reihenfolge

| Schritt | Was | Warum zuerst |
|---|---|---|
| 1 | Befunde 1–2 korrigieren (README, shop.html-Meta) | Es werden Produkte versprochen, die es nicht gibt |
| 2 | **Werte-Termin** | Schnellster Weg zu Umsatz, kein Content |
| 3 | **UPF** | Das eigentliche Produkt. Inhalt ist der Engpass |
| 4 | **Arztbrief** | Repariert die Trichter-Oberkante |
| 5 | Affiliate-Linie konfigurieren | Umsatz ohne Grenzkosten |
| 6 | Zweiter Durchlauf | Voraussetzung für Schritt 7 |
| 7 | **Durchlauf-Pass** | Erst wenn zwei Durchläufe existieren |

---

## 9 — Was ich bewusst NICHT vorschlage

- **Einen 9-€-Tripwire.** Er steht zwar im README, aber ein vierter Preispunkt
  unter 49 € verwässert die Leiter und kostet dieselbe inhaltliche Pflege wie
  ein richtiges Produkt. **Empfehlung: die Behauptung aus dem README streichen,
  nicht das Produkt bauen.**
- **Eigene Test-Kits / eigenes Zubehör.** Lager, Versand, Retouren, Haftung,
  MDR-Fragen — das ist ein anderes Geschäft, nicht eine Produkterweiterung.
  Deshalb Affiliate statt Eigenmarke.
- **Ein Substanz-Produkt jeder Art.** Auch nicht als „Stack-Beratung". Die
  Grenze aus `PROOF_STANDARD.md` §5 und die Korrekturliste aus dem
  Ultimate-Stack-Bericht sind der Grund, warum dieses Haus glaubwürdig ist.
- **Feature-Gating bestehender Fähigkeiten** (siehe §6.2).
- **Lifetime-Bundle „alles für 299 €".** Es zieht Umsatz nach vorn und tötet
  jede spätere Wiederkauf-Mechanik.

---

## 10 — Offene Entscheidungen (nur du)

1. **UPF-Name:** Variante A (Ural mit Definitionssatz) oder B (neutral)? —
   Ohne Antwort baue ich A.
2. **Preise:** 49 € / 12 € / 149 € sind Vorschläge. Keiner davon steht
   irgendwo im Produkt, bis du ihn bestätigst.
3. **Durchlauf-Pass statt Modell E** — oder beides parallel prüfen?
4. **Analysegespräch kostenpflichtig** — das ist ein sichtbarer Rückschritt
   für Besucher, die es bisher kostenlos sahen. Bewusste Entscheidung.
5. **Reihenfolge:** Wenn du schnell Umsatz brauchst, ist es Schritt 2. Wenn du
   das Portfolio brauchst, ist es Schritt 3.

Sag mir, was davon gebaut wird — dann setze ich es um.
