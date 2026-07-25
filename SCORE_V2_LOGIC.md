# SCORE V2 — Logik, Gewichte, Verzweigung

> **KALIBRIERUNGS-FREEZE AKTIV.** Fragen, Gewichte, Schwellen und die
> CUT/RECOMP/BUILD/HEALTH-FIRST-Logik sind eingefroren. Änderungen nur bei
> reproduzierbarem Fehler oder belegtem Nutzungsproblem — Pflichtformular und
> Begründung siehe **[SCORE_V2_CALIBRATION.md](SCORE_V2_CALIBRATION.md)**.

Entwicklerdokumentation der adaptiven Score-Engine.
Quellcode: `js/check-data.js` (Fragen + Engine), `js/check.js` (Wizard + Ergebnis),
`js/report.js` (Report), Tests: `tools-dev/tests/score-v2.test.js`.

Leitsatz der Version 2:

> Der Score fragt nicht „bist du gesund?", sondern:
> **Welches System limitiert dich gerade, wie sicher wissen wir das, und was kommt zuerst?**

---

## 1. Grundprinzipien

1. **Status ist Kontext, keine Wertung.** NATURAL, FRÜHER ENHANCED, MEDIZINISCHE TRT
   und ENHANCED sind unterschiedliche biologische und Monitoring-Kontexte.
   Es gibt **keinen** Zweig im Code, der wegen des Status Punkte abzieht.
   Bewertet wird ausschließlich, **wie gut das aktuelle System kontrolliert ist**.
2. **Medizinische TRT ≠ leistungsorientierte Anwendung.** Getrennte Fragen,
   getrennte Domains, getrennte Ergebnistexte. Keine Zusammenlegung.
3. **UNBEKANNT ≠ NORMAL.** Nicht gemessene Werte werden als *Datenlücke* geführt
   und senken die **Aussagesicherheit**, nicht automatisch den Score.
4. **Keine Diagnose, keine Dosierung.** Der Score identifiziert Kontext,
   Kontrollrelevanz, Datenlücken und Bereiche für ärztliche Abklärung.
   Er stellt keine Diagnose, empfiehlt keine Substanzen, Mengen oder Gegenmittel.
5. **Jede Frage zahlt auf genau eine Domain ein.** Kein Problem wird fünfmal bestraft.

---

## 2. Datenmodell (normalisierte Felder)

Alle Logik läuft über stabile Enums, nie über Anzeigetexte.

| Feld | Werte |
|---|---|
| `perf_status` | `natural` · `former_enhanced` · `medical_trt` · `enhanced` · `uncertain` |
| `C.statusOf(a)` | zusätzlich `unknown` (Alt-Ergebnisse ohne Status) |
| `enh_context` | `cruise` · `blast` · `blast_cruise` · `transition` · `other` · `no_answer` |
| `enh_categories[]` | `testosterone` `aas` `oral` `gh` `glp1` `thyroid` `insulin` `stimulants` `peptides` `other` `no_answer` |
| `lab_recency` | `lt3m` · `3to6m` · `6to12m` · `gt12m` · `nie` · `unsure` |
| `lab_known[]` | `blutbild` `haematokrit` `ldl` `hdl` `trig` `apob` `lpa` `glukose` `niere` `leber` `hormone` `psa` `keine` |
| `cv_bp_control` | `normal` · `grenzwertig` · `behandelt` · `unbehandelt` · `unsure` |
| `met_glucose` | `normal` · `prediabetes` · `diabetes` · `nie` · `unsure` |
| `met_medication[]` | `glp1` `bp` `lipid` `glucose` `psych` `other` `keine` `no_answer` |
| `trt_supervision` | `regelmaessig` · `gelegentlich` · `selbst` · `keine` |
| `trt_followup` | `lt3m` · `3to6m` · `6to12m` · `gt12m` · `nie` |
| `fe_last_use` / `fe_duration` | Zeitfenster-Enums |

Abgeleitete Objekte (aus `C.evaluate(answers)`):
`status`, `domains{}`, `dataGaps[]`, `signals[]`, `flags[]`, `confidence`,
`contextPanel`, `primaryBottleneck`, `secondaryPriorities[]`,
`goalRecommendation`, `deepLinks[]`, `total`, `scores` (die 7 Altbereiche).

---

## 3. Adaptive Fragenführung

`C.visibleSteps(answers)` baut die Schrittliste bei **jeder** Antwort neu.
Sichtbar ist eine Frage, wenn Modul-`when` und Frage-`when` beide zutreffen.

**Bank:** 87 Fragen, davon **46 bedingt** (53 %).
**Typischer Pfad:** 48–53 Fragen (vorher: 51 starre Fragen für jeden).
**Ungünstigster Pfad** (Enhanced mit vielen Auffälligkeiten): 64.

### Status-Pfade

| Status | Zusätzliche Module |
|---|---|
| `natural` | Trainingsantwort, Erholung (neutral, keine Hormonaussage) |
| `uncertain` | Klärungsfrage + dieselben neutralen Fragen wie natural — **keine erzwungene Einordnung** |
| `former_enhanced` | letzte Anwendung, Gesamtdauer, Veränderungen seit Absetzen, Nachkontrolle |
| `medical_trt` | Indikation, ärztliche Begleitung, Dauer, Verlaufskontrollen, Ansprechen, Kinderwunsch |
| `enhanced` | Kontext, Kategorien, Signale, Blutdruck-Routine + compound-abhängige Folgefragen |

### Compound-aware Routing (nur Fragensteuerung, nie Empfehlung)

| Auswahl | Öffnet |
|---|---|
| `oral` | Leberwert-Kontrolle |
| `gh` / `insulin` | Blutzucker-Kontrolle |
| `testosterone` / `aas` / `oral` | Hämatokrit / Hämoglobin |
| `glp1` (auch über `met_medication`, also statusunabhängig) | Muskelerhalt-Kontext (Protein + Krafttraining) |

### Signal-Routing

| Signal | Öffnet |
|---|---|
| starkes Schnarchen / Apnoe-Hinweis / Schlafverschlechterung | Tagesmüdigkeit (Apnoe-Kontext) |
| reduzierte Libido / Erektionsveränderung | Verlaufsfrage (schleichend vs. plötzlich) |
| Blutdruck-Signal, bekannter Hochdruck, Red Flag Blutdruck | kardiovaskuläres Kontrollmodul |

---

## 4. Domain-Scoring

Kein linearer Gesamttopf. Je Domain: `100 × erreichte Punkte / mögliche Punkte
der tatsächlich beantworteten Fragen`. Nicht erhobene Domains erscheinen nicht —
sie werden **nicht** mit einem Mittelwert erfunden.

| Domain | Gewicht | Gesundheitsrelevanz | Umsetzbarkeit |
|---|---|---|---|
| bodyComposition | 12 | 1.0 | 0.9 |
| training | 11 | 0.8 | 1.0 |
| movement | 8 | 0.9 | 1.0 |
| sleep | 11 | 1.0 | 0.9 |
| recovery | 8 | 0.8 | 0.8 |
| nutrition | 11 | 0.9 | 0.9 |
| metabolic | 9 | 1.1 | 0.7 |
| cardiovascular | 11 | 1.3 | 0.8 |
| hormonal | 6 | 0.9 | 0.6 |
| energy | 7 | 0.7 | 0.7 |
| dataQuality | 10 | 1.0 | 1.0 |
| execution | 10 | 0.7 | 1.0 |
| **enhancedControl** *(nur enhanced)* | 12 | 1.3 | 1.0 |
| **therapyControl** *(nur TRT)* | 10 | 1.2 | 1.0 |
| **recoveryStatus** *(nur former)* | 9 | 1.0 | 0.9 |

Gesamtscore = gewichtetes Mittel über die **vorhandenen** Domains
(`C.totalFrom`). Weil normalisiert wird, senkt das bloße *Hinzukommen* einer
Kontext-Domain den Score nicht — nur ein schlechter Wert darin tut das.

### Doppelzählung

Jede Frage → genau eine Domain (`q.dom` oder `C.domainMap[q.id]`).
Zusätzlich existieren **genau zwei** gedeckelte Kontextmodifikatoren (`C.MODIFIERS`):

| Modifikator | Wirkung | Begründung |
|---|---|---|
| `sleep_debt` (< 6 h Schlaf) | recovery −6, energy −6 | Schlafdefizit wirkt real auf Erholung und Energie |
| `sedentary` (> 11 h Sitzen oder < 4.000 Schritte) | metabolic −5 | Alltagsinaktivität ist ein eigenständiger metabolischer Faktor |

Maximal ±8 Punkte je Modifikator. Schlechter Schlaf zieht also Schlaf (primär)
plus zwei kleine Kontexteffekte — nicht fünf volle Strafen.

### Ableitung der 7 Bestandsbereiche

Für Radar, Report, 12-Wochen-Programm und Konto-Sync:

```
body      = bodyComposition
strength  = 0.7 training + 0.3 movement
fuel      = nutrition
recovery  = 0.6 sleep + 0.4 recovery
blood     = 0.35 metabolic + 0.35 cardiovascular + 0.30 dataQuality
drive     = 0.6 energy + 0.4 hormonal
execution = execution
```

---

## 5. Data-Gap-Engine

`C.dataGaps(answers)` → `[{ id, label, why, domain, severity 1–3 }]`, absteigend sortiert.

Quellen:
1. **Antwort-Lücken** — Optionen mit `gap:`-Flag („nie gemessen", „weiß ich nicht", „möchte ich nicht angeben").
2. **Strukturelle Lücken** — fehlender Bauchumfang, unbekannte Schritte, unbekannter Blutdruck.
3. **Kontextlücken** — im Risiko-/Enhanced-/TRT-Kontext zusätzlich Lipide/ApoB,
   Hämatokrit (enhanced), Glukose, Verlaufskontrollen.

Schweregrad 3 = entscheidungsrelevant (Blutdruck, keine Blutwerte, Hämatokrit,
Leberwerte im oralen Kontext, fehlende TRT-Verlaufskontrolle, fehlende
Nachkontrolle nach Absetzen).

Eine Lücke senkt **nie direkt** den Gesundheits-Score. Sie senkt die
Aussagesicherheit und kann den Engpass verschieben.

---

## 6. Aussagesicherheit (getrennt vom Score)

`C.assessmentConfidence(a, gaps, flags)` → `HIGH` · `MODERATE` · `LIMITED`
(Anzeige: HOCH / MODERAT / EINGESCHRÄNKT). Rein regelbasiert, keine Fake-Prozente.

| Stufe | Bedingung (erste zutreffende) |
|---|---|
| `LIMITED` | Legacy-Ergebnis ohne Status · ≥2 kritische Lücken · ≥2 kontextkritische Lücken · Lückensumme ≥10 · ≥2 Widersprüche · ≥3 verweigerte Kernangaben |
| `MODERATE` | 1 kritische Lücke · 1 kontextkritische Lücke · Lückensumme ≥4 · 1 Widerspruch · ≥1 verweigerte Angabe · oder vorhandene Red Flags |
| `HIGH` | keine der obigen Bedingungen |

Kontextkritisch ist statusabhängig: enhanced → Hämatokrit/Blutdruck/Labore/Leber/ApoB,
TRT → Verlaufskontrollen/Blutdruck/Labore, former → Nachkontrolle/Zeitachse/Labore.

Widersprüche werden benannt, nicht kaschiert (z. B. Selbstbild „schlank" bei
WHtR ≥ 0.56).

*(Die ältere Funktion `C.decisionConfidence` bleibt unverändert erhalten —
sie wird von Bestandstests und Alt-Aufrufen genutzt.)*

---

## 7. Kontext-Panel (Kontrollqualität statt Statusurteil)

`C.contextPanel(a, domains, gaps)`

| Status | Titel | Bänder |
|---|---|---|
| enhanced | ENHANCED CONTROL | GUTE KONTROLLE ≥78 · TEILWEISE ≥58 · DEUTLICHE DATENLÜCKEN ≥38 · ÜBERPRÜFUNG NÖTIG |
| medical_trt | THERAPIE-KONTROLLE | dieselben Bänder + **getrennt ausgewiesenes Therapie-Ansprechen** |
| former_enhanced | RÜCKKEHR-STATUS | zusätzlich Sonderzustand **RÜCKKEHR-STATUS UNKLAR** |
| natural | NATURAL PERFORMANCE CONTEXT | ab 2 zusammenpassenden Symptombereichen: „HORMONELLER KONTEXT SOLLTE GEPRÜFT WERDEN" |
| uncertain / unknown | STATUS OFFEN | NEUTRALE EINORDNUNG |

**RÜCKKEHR-STATUS UNKLAR** entsteht, wenn Symptome nach dem Absetzen und
fehlende/unklare Nachkontrolle zusammentreffen — unabhängig davon, wie viel
Zeit vergangen ist. Zeit allein gilt nicht als Beleg für Erholung.

Enhanced-Nutzer mit Symptomsignalen bekommen zusätzlich den ausdrücklichen
Hinweis auf ärztliche Einordnung.

---

## 8. Primary-Bottleneck-Engine

`C.primaryBottleneck(a, domains, gaps, flags)`

Ranking-Score je Domain:

```
score = (Schwere + Lücken-Boost) × Gesundheitsrelevanz × Umsetzbarkeit × (1 + Zielbezug)
Schwere      = (100 − Domainwert) / 100
Lücken-Boost = min(0.35, Summe Lückenschwere × 0.06)
Zielbezug    = +0.25, wenn Ziel oder Hauptbelastung auf diese Domain zeigt
```

**Vorrangregeln** (schlagen das Ranking, in dieser Reihenfolge):

1. unkontrolliert erhöhter Blutdruck → `cardiovascular`
2. Apnoe-Signal → `sleep`
3. enhanced und `enhancedControl` < 55 → `enhancedControl`
4. TRT und `therapyControl` < 55 → `therapyControl`
5. former und `recoveryStatus` < 55 → `recoveryStatus`
6. ≥2 kritische Datenlücken → `dataQuality`

Ergebnis enthält immer `secondary[]` (3 nächste Prioritäten) und einen
Legacy-Schlüssel (`C.LEGACY_DOMAIN_KEY`) für Programm und Ebook-Empfehlung.

---

## 9. Ziel-Engine: CUT / RECOMP / BUILD / PERFORM / HEALTH FIRST

`C.goalDecision(a)` → `{ mode, trainingMode, reason, … }`

Körperfett-Kontext (`fat` = 0/1/2) entsteht aus `body_type`, WHtR, BMI **und
Trend** (starke Zunahme oder deutlich wachsende Taille heben `fat` auf ≥1).

| Situation | Modus |
|---|---|
| `fat = 2` | **CUT** (Muskelwunsch bleibt: Protein hoch, hart trainieren) |
| Fettfokus + Muskelwunsch + WHtR ≥ 0.55 / „stark, aber zu viel Fett" / übergewichtig | **CUT** |
| Fettfokus + Muskelwunsch + **belegt** schlank (WHtR < 0.5 oder skinny & BMI < 24) + kein Anfänger | **BUILD** |
| Fettfokus + Muskelwunsch, Schlankheit **nicht belegt** | **RECOMP** |
| Fettfokus ohne Muskelwunsch | **CUT** |
| Muskelwunsch ohne Fettfokus | `fat ≥ 1` → RECOMP, sonst BUILD |
| Gesundheits-/Energieziele, schlank | **PERFORM** |

**Der behobene Altfehler:** „Mein Bauchansatz stört mich" ergab BUILD, sobald
der Bauchumfang unbekannt war. Unbekannt zählte faktisch als schlank.
Neu: BUILD verlangt **belegte** Schlankheit; sonst RECOMP mit dem expliziten
Hinweis, den Bauchumfang zu messen.

### HEALTH FIRST

`C.healthFirstReason(a)` überschreibt die Richtung, wenn:

* eine schwere Red Flag vorliegt (Brustschmerz, Ohnmacht, Atemnot, Blut im
  Urin/Stuhl, starker ungewollter Gewichtsverlust, bekannt sehr hoher Blutdruck,
  stark auffällige Laborwerte ohne Begleitung, Hormone ohne ärztliche Betreuung)
* bekannt erhöhter, **unbehandelter** Blutdruck
* Apnoe-Muster (auffällige Schlafatmung + Tagesmüdigkeit)
* enhanced mit ≥2 kritischen Kontroll-Lücken
* TRT ohne Verlaufskontrolle **und** ohne ärztliche Begleitung
* former mit Symptomen **und** ohne jede Nachkontrolle
* bekannter Blutzucker-Kontext ohne Blutdruck und ohne aktuelle Werte

`trainingMode` bleibt dabei erhalten (CUT/RECOMP/BUILD/PERFORM), damit
12-Wochen-Programm und Kalorienlogik weiterlaufen. Die Botschaft ist
**Reihenfolge**, nicht „du bist krank".

---

## 10. Ergebnisseite

Reihenfolge: Score-Hero → Status / Richtung / Aussagesicherheit → Red Flags →
**Primärer Engpass** → System-Scores (nur erhobene Domains) → Kontext-Panel →
**Datenlücken** → **Deine Reihenfolge** → empfohlener Weg → Profil/Radar →
Stärken → nächster Schritt → Prioritäten → Insights → Inhalte → 7-Tage-Plan →
Empfehlung → Score-Card → Aktionen.

`C.orderOfOperations(ev)`: (Klären →) Messen → Engpass lösen → Training &
Ernährung ausrichten → neu bewerten.

`C.deepLinks(a, bottleneck, gaps)` liefert **maximal 3** Kapitel:
Engpass-Kapitel, Kontext-Kapitel (Blutwerte bei enhanced/TRT/former),
Sexuelle Gesundheit bei sexuellen Signalen, GLP-1 bei GLP-1-Nutzung,
Tägliche Bewegung bei Bewegungslücken. Kein Link-Spam.

---

## 11. Rückwärtskompatibilität

* `check_result` behält **alle** Bestandsfelder (`total`, `scores`, `level`,
  `levelText`, `archetype`, `plan`, `bottleneck.key/name/text`, `weakest`,
  `strongest`, `flags`, `whtr`, `answers`, `date`) — Report, Programm,
  Buchung, Ebook-Empfehlung, Konto-Sync bleiben unverändert lauffähig.
* Neu hinzu: `v: 2`, `status`, `domains`, `dataGaps`, `signals`, `confidence`,
  `contextPanel`, `primaryBottleneck`, `secondaryPriorities`,
  `goalRecommendation`, `deepLinks`.
* Alte Ergebnisse ohne `perf_status` werden als **`unknown`** geführt —
  ausdrücklich **nicht** als `natural` und **nicht** als „gesund". Sie erhalten
  Aussagesicherheit `LIMITED` und ein Panel, das die alte Score-Version benennt.
* `check.js` und `report.js` rechnen Alt-Ergebnisse bei Bedarf aus den
  gespeicherten Antworten nach (`hydrate`). Keine destruktive Migration,
  kein Schreiben in alte Datensätze.
* `course.js` nutzt `trainingMode`, wenn `mode === health_first`.

---

## 12. Medizinische Leitplanken (im Code verankert und getestet)

* keine Diagnose („deine Angaben rechtfertigen eine genauere Abklärung" statt
  „du hast einen Mangel")
* keine Substanz-, Mengen- oder Zyklusempfehlungen; keine Gegenmittel;
  kein PCT-Protokoll — testgesichert per Textscan über `check-data.js` und `check.js`
* Enhanced-Logik dient ausschließlich Kontext, Kontrollrelevanz, Datenlücken
  und der Identifikation von Bereichen für ärztliche Beurteilung
* Red Flags haben Vorrang vor jeder Produkt- oder Programmempfehlung
* „Möchte ich nicht angeben" ist überall dort möglich, wo es sensibel wird —
  es kostet Aussagesicherheit, aber nie Punkte und nie die Nutzbarkeit
