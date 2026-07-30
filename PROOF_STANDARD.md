# PROOF STANDARD — Wann ein Ergebnis veröffentlicht werden darf

Ergänzt `FIRST_100_BETA_PLAN.md` (wen rekrutieren, was beobachten). Dieses
Dokument regelt die andere Hälfte: **wie aus einem gelaufenen Durchlauf ein
belastbarer Beleg wird** — und wann ausdrücklich keiner.

Der Kernsatz, an dem sich alles hier misst:

> MaleMetrix muss nicht wie ein größeres Produkt aussehen. Es muss zeigen,
> dass normale Männer das Programm zwölf Wochen lang tatsächlich umsetzen und
> dadurch messbar besser werden.

---

## 0 — Die eine Regel, die nicht verhandelbar ist

**Es wird nichts erfunden, geglättet, zusammengesetzt oder „repräsentativ
nachgebaut“.** Kein Beispiel-Teilnehmer, kein „so könnte ein Ergebnis
aussehen“, keine Composite-Persona, keine geschätzte Adhärenz, keine
Stockfoto-Transformation, keine gekaufte Bewertung.

Ein leerer Ergebnis-Bereich ist ein ehrlicher Zustand und wird als solcher
kommuniziert (`ergebnisse.html` tut das). Er ist kein Anlass, die Lücke zu
füllen.

Technisch abgesichert: `js/case-studies-data.js` startet mit einem leeren
Array, `tools-dev/tests/proof-standard.test.js` prüft, dass jeder Eintrag
den Standard unten erfüllt und dass die öffentlichen Seiten keine
Ergebnis-Behauptungen ohne hinterlegte Fallstudie aufstellen.

---

## 1 — Wann ein Durchlauf zählt

| Kriterium | Anforderung | Warum |
|---|---|---|
| Dauer | volle 12 Wochen abgeschlossen | Ein Ausschnitt beweist keine Umsetzbarkeit |
| Messpunkte | W0 **und** W12 für Taille **oder** Gewicht | Ohne Start- und Endwert gibt es kein Delta |
| Adhärenz | aus dem Programm berechnet, nicht erinnert | −5 kg bei 40 % Umsetzung ist eine andere Aussage als bei 85 % |
| Reibung | „Was hat NICHT funktioniert?“ beantwortet | Eine Fallstudie ohne Reibung ist Werbung |
| Einwilligung | schriftlich, anonymisiert, widerrufbar | Rechtlich und ethisch nicht optional |
| Alter | vorhanden (aus dem Score) | Einordnung für den Leser |

Fehlt ein Kriterium, wird der Durchlauf **nicht** veröffentlicht — auch nicht
gekürzt, auch nicht „ohne die schwachen Stellen“.

## 2 — Prüftiefen (sichtbar je Fallstudie)

| Stufe | Bedeutung | Was der Betreiber gesehen hat |
|---|---|---|
| `self-reported` | Werte vom Teilnehmer eingetragen | nichts außer dem Entwurf |
| `founder-verified` | Zahlen und Zeitverlauf nachvollzogen | Programm-Screenshots der Messpunkte |
| `photo-verified` | zusätzlich Fotobeleg | datierte Vorher-Nachher-Fotos |

Die Stufe steht **an jeder Fallstudie**, nicht pauschal auf der Seite. Ein
undifferenziertes „verifiziert“ wäre eine stärkere Behauptung als das, was
tatsächlich geprüft wurde.

**Grenze, die auch bei Stufe 3 gilt:** Eine Einzelfall-Dokumentation ist keine
Studie. Sie belegt, dass es jemand unter realen Bedingungen durchgezogen hat —
nicht, dass es beim nächsten Käufer genauso läuft. Diese Einordnung steht
sichtbar auf `ergebnisse.html` und wird nicht entfernt, wenn die Zahlen gut
aussehen.

## 3 — Wie ein Durchlauf erfasst wird (Produktseite)

Der Weg ist bewusst im Produkt verankert statt in einem separaten Formular —
sonst entsteht der Beleg nie:

1. Der Teilnehmer trägt W0 im Programm ein (Recheck-Tabelle, `course_rechecks`).
2. Tägliche Häkchen erzeugen die Adhärenz — ungefragt, ohne Streak-Zwang.
3. Weekly Pulse markiert Wochen mit gerissener Umsetzung (`c2_pulse`).
4. In Woche 12 erscheint im Abschlussbericht die Karte
   **„Fallstudie — deinen Durchlauf dokumentieren“** (`js/case-study.js`).
5. Sie erzeugt aus den echten Werten einen Klartext-Entwurf inkl. Kurzfassung
   im Format: *38 Jahre, 3 Trainingseinheiten/Woche: −7,0 cm Taille,
   −5,0 kg Gewicht, Kraft gehalten, 82 % Umsetzung.*
6. Pflichtfeld „Was hat NICHT funktioniert?“ + drei getrennte
   Einwilligungs-Häkchen (Veröffentlichung / Vorname / Fotos).
7. **Senden** öffnet den Mail-Client mit dem vollständigen Text. Der
   Teilnehmer sieht vorher exakt, was rausgeht.

**Was das System dabei nicht tut:** keine stille Übertragung von
Gesundheitsdaten, kein automatischer Foto-Upload, keine vorausgefüllte
Einwilligung, keine Erinnerung mit Druck.

## 4 — Vom Entwurf zur Veröffentlichung (Betreiber-Schritte)

1. Eingang prüfen: Sind W0/W12 plausibel? Passt der Zeitverlauf zum
   Startdatum? Widersprechen sich Adhärenz und Ergebnis?
2. Einwilligung ablegen (Datum + Umfang) und `consentId` vergeben.
3. Prüftiefe ehrlich setzen — im Zweifel die niedrigere Stufe.
4. Anonymisieren: keine Klarnamen ohne Freigabe, keine Orte, keine
   Arbeitgeber, keine identifizierenden Details in `situation`.
5. Eintrag in `js/case-studies-data.js` ergänzen.
6. `node tools-dev/tests/proof-standard.test.js` laufen lassen.
7. Widerruf: Eintrag ersatzlos entfernen, keine Nachfrage, keine Hürde.

## 5 — Was NICHT veröffentlicht wird

- Zwischenstände als Erfolgsmeldung („nach 3 Wochen schon …“).
- Abbrecher als anonyme Erfolgsgeschichte umdeklariert.
- Aussagen über Blutwerte, Hormone oder Medikation als Ergebnis des Programms.
  MaleMetrix stellt keine Diagnosen; ein Laborwert-Verlauf gehört zum Arzt,
  nicht in eine Verkaufsseite.
- Ergebnisse von Enhanced-Teilnehmern ohne klare Kennzeichnung des Status —
  sonst wird eine Substanzwirkung als Programmwirkung verkauft.
- Alles ohne Einwilligung, auch anonymisiert.

## 6 — Zielgrößen für die erste kontrollierte Gruppe

Damit „Proof“ messbar wird statt gefühlt (Wellen und Rekrutierung: siehe
`FIRST_100_BETA_PLAN.md`):

| Kennzahl | Ziel Welle 1 | Warum |
|---|---|---|
| Gestartete Durchläufe | 20 | Basis für alles Weitere |
| Abschlussquote (12 Wochen) | ≥ 50 % | Der eigentliche Produktbeweis |
| Fallstudien mit vollständigem Datensatz | ≥ 10 | Nicht jeder Abschluss wird dokumentiert |
| Davon `founder-verified` oder besser | ≥ 5 | Die belastbaren Fälle |
| Median-Adhärenz der Abschließer | ≥ 70 % | Zeigt, ob der Alltag das Programm trägt |

**Wichtig:** Die Abschlussquote wird auch dann veröffentlicht, wenn sie
niedrig ist. Eine hohe Zahl guter Einzelfälle bei stiller Abbruchquote ist
genau die Verzerrung, die dieses Dokument verhindern soll.

## 7 — Was hier bewusst offen bleibt

Diese Datei regelt Erfassung und Veröffentlichung. Sie ersetzt nicht:

- **Externe Vertrauenssignale** (Google-/Trustpilot-Bewertungen, öffentliche
  Teilnehmerprofile) — die entstehen außerhalb des Repos und lassen sich nicht
  herbeiprogrammieren.
- **Fachliche Prüfung** medizinisch naher Inhalte durch Arzt,
  Sportwissenschaftler oder Ernährungswissenschaftler. Wenn eine solche
  Prüfung stattfindet, gehört sie mit Name, Qualifikation und Prüfdatum
  dokumentiert — nicht als anonymes „fachlich geprüft“-Siegel.
- **Die Durchführung** der ersten Gruppe. Kein Codeänderung ersetzt zwanzig
  Männer, die zwölf Wochen durchziehen.
