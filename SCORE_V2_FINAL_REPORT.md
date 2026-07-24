# SCORE V2 — FINAL REPORT

**Stand:** 24. Juli 2026
**Branch:** `claude/malemetrix-score-v2-vhket0`
**Umfang:** `js/check-data.js`, `js/check.js`, `js/report.js`, `js/course.js`,
`check.html`, `css/style.css`, `tools-dev/tests/score-v2.test.js`,
`tools-dev/tests/visual-system.test.js`, `SCORE_V2_LOGIC.md`

---

## 1. OLD SCORE — Audit

| Punkt | Befund |
|---|---|
| Aufbau | 11 Module, **51 Fragen, für jeden Mann identisch**, streng linear |
| Verzweigung | **keine** — kein `when`, keine kontextabhängigen Fragen |
| Scoring | 7 Bereiche (body, strength, fuel, recovery, blood, drive, execution), Punkte je Option addiert, feste Gewichtung, ein Gesamtwert |
| Kontext | **kein Statusbegriff.** Natural, TRT und Enhanced bekamen identische Fragen, identische Texte, identische Empfehlungen |
| Enhanced | nur als Red Flag „Einnahme von Hormonen ohne ärztliche Betreuung" vorhanden |
| Unbekannte Werte | teilweise als Punkt gewertet („weiß ich nicht" = 4–5 Punkte), fehlender Bauchumfang wurde **hochskaliert** → unbekannt wirkte wie „okay" |
| Confidence | `dataConfidence` (4 Felder) + `decisionConfidence` — vorhanden, aber ohne Lückenbegriff und ohne Kontextbezug |
| Engpass | Sonderregeln + gewichtete Schwäche über 7 Bereiche |
| Ziel-Engine | CUT / RECOMP / BUILD / PERFORM, **kein HEALTH FIRST** |
| Persistenz | `check_result` in localStorage, gelesen von Report, 12-Wochen-Programm, Buchung, Ebook-Empfehlung, Konto-Sync |

### Gefundene Bugs & Widersprüche

1. **BUILD trotz Bauchfett-Fokus.** In `goalDecision` führte
   `fatConcern && wantsMuscle && fat<=0 && !beginner` zu BUILD. Da `fat` ohne
   gemessenen Bauchumfang auf 0 blieb, bekam genau der Mann BUILD, der
   „Bauchansatz stört mich" angegeben hatte — **unbekannt wurde wie schlank behandelt**.
2. **Trend wurde ignoriert.** 8 kg Zunahme und deutlich wachsende Taille
   veränderten den Modus nicht.
3. **Unbekannt = gut.** Fehlender Bauchumfang skalierte den Body-Score nach
   oben statt eine Lücke auszuweisen.
4. **Doppelte/überlappende Fragen:** Blutwerte-Baseline vs. Labor-Aktualität,
   Kalorien vs. Ernährungsstruktur, Fokus vs. Energie, Koffeinmenge vs. Timing,
   Umsetzungs-Support zweimal.
5. **Cardio-Frequenz zählte auf „strength"**, Alltagsbewegung existierte als
   Bewertungsdimension gar nicht — „3× Gym bei 14 h Sitzen" war nicht abbildbar.
6. **`C.redFlags` wurde in `decisionConfidence` aufgerufen, existierte aber nicht.**
7. Ergebnisseite mischte „Datenqualität" und Gesundheitsaussage in einer Karte.

---

## 2. NEUE ARCHITEKTUR

```
Antworten
   ↓  C.statusOf()            → Routing-Enum
   ↓  C.visibleSteps()        → adaptive Fragenliste (nach jeder Antwort neu)
   ↓  C.domainScores()        → 12 Kern-Domains + 1 Kontext-Domain
   ↓  C.dataGaps()            → explizite Lücken (unbekannt ≠ normal)
   ↓  C.signals()             → Symptom-/Kontextsignale
   ↓  C.redFlags()            → medizinische Vorrangpunkte
   ↓  C.assessmentConfidence()→ HIGH / MODERATE / LIMITED
   ↓  C.primaryBottleneck()   → Priorität statt niedrigster Wert
   ↓  C.goalDecision()        → CUT / RECOMP / BUILD / PERFORM / HEALTH FIRST
   ↓  C.contextPanel()        → Kontrollqualität je Status
   ↓  C.deepLinks()           → max. 3 passende Kapitel
   =  C.evaluate()            → EINE Quelle für Dashboard, Report, Programm
```

Vollständige Dokumentation der Gewichte, Schwellen und Regeln: **`SCORE_V2_LOGIC.md`**.

---

## 3. FRAGEN: COMMON CORE VS. ADAPTIV

| Kennzahl | Wert |
|---|---|
| Fragen in der Bank | **87** |
| davon unbedingt (Pflicht-Kern) | **41** |
| davon bedingt (adaptiv) | **46** |
| typischer Pfad NATURAL | **48** Fragen (stark) / 58 (viele Auffälligkeiten) |
| typischer Pfad TRT | **53** / 62 |
| typischer Pfad ENHANCED | **53** / 64 |
| typischer Pfad FRÜHER ENHANCED | **52** / 61 |
| typischer Pfad STATUS OFFEN | **50** / 59 |
| vorher | **51 starre Fragen für jeden** |

Der Pflicht-Kern macht 64–85 % eines Pfads aus, der Rest erscheint nur bei
Relevanz. Wer sauber aufgestellt ist, wird kürzer befragt; wer mehr offene
Punkte hat, bekommt mehr Klärungsfragen.

**Entfernt (Redundanz):** Blutwerte-Baseline, cardiometabolische Sammelfrage.
**Neu bedingt statt immer:** Kalorienwissen, Fokus, Koffeinmenge, nächtliches
Aufwachen, Kraftwerte, Trainingslimit, Umsetzungsfeind, Zufriedenheit,
Auswärts-Essen, Ernährungsproblem, Arzt-Einordnung, Test-Philosophie,
Zeitbudget, Startzeitpunkt, Support-Wunsch.

**Neue Module:** Status-Routing, Natural-Kontext, Rückkehr-Kontext,
Therapie-Kontext, Enhanced-Kontext, GLP-1-Kontext, Alltagsbewegung,
Herz-Kreislauf & Stoffwechsel, Labor & Datenlage.

---

## 4. STATUS-BRANCHES

| Status | Enum | Eigene Fragen | Eigene Domain | Eigenes Panel |
|---|---|---|---|---|
| Natural | `natural` | Trainingsantwort, Erholung | — | NATURAL PERFORMANCE CONTEXT |
| Früher Enhanced | `former_enhanced` | letzte Anwendung, Dauer, Veränderungen, Nachkontrolle | `recoveryStatus` | RÜCKKEHR-STATUS |
| Ärztliche TRT | `medical_trt` | Indikation, Begleitung, Dauer, Verlauf, Ansprechen, Kinderwunsch | `therapyControl` | THERAPIE-KONTROLLE |
| Enhanced | `enhanced` | Kontext, Kategorien, Signale, Blutdruck-Routine + compound-abhängig Leber / Glukose / Hämatologie | `enhancedControl` | ENHANCED CONTROL |
| Unsicher | `uncertain` | neutrale Klärungsfrage, sonst Natural-Fragen | — | STATUS OFFEN |
| Legacy | `unknown` | — | — | STATUS OFFEN (als Alt-Version benannt) |

**TRT und Enhanced sind strikt getrennt** — andere Fragen, andere Domain,
andere Ergebnistexte. Keine Zusammenlegung.

---

## 5. DOMAIN-SCORES

12 Kern-Domains (Körperkomposition, Training, Alltagsbewegung, Schlaf,
Erholung, Ernährung, Stoffwechsel, Herz-Kreislauf, Hormonell/Sexuell, Energie,
Datenlage/Monitoring, Umsetzung) + **genau eine** Kontext-Domain je Status.

* Jede Frage zahlt auf **genau eine** Domain ein.
* Normalisierung je Domain über die tatsächlich beantworteten Fragen.
* Gesamtscore = gewichtetes Mittel über die **vorhandenen** Domains.
* Doppelbestrafung verhindert: nur **zwei** gedeckelte Kontextmodifikatoren
  (Schlafdefizit → Erholung/Energie je −6, Inaktivität → Stoffwechsel −5).
* Die 7 historischen Bereiche werden aus den V2-Domains abgeleitet — Radar,
  Report, 12-Wochen-Programm und Konto-Sync bleiben unverändert lauffähig.

---

## 6. DATA-GAP-ENGINE

28 definierte Lückentypen mit Label, Begründung, Domain und Schweregrad 1–3.
Quellen: `gap`-Flags an Antwortoptionen, strukturelle Lücken (Bauchumfang,
Schritte, Blutdruck) und kontextabhängige Lücken (ApoB/Lipide im Risikokontext,
Hämatokrit bei Enhanced, Verlaufskontrollen bei TRT, Nachkontrolle bei Former).

**Regel:** Eine Lücke senkt **nie** direkt den Gesundheits-Score. Sie senkt die
Aussagesicherheit und kann den Engpass verschieben. Auf der Ergebnisseite steht
jede Lücke mit „warum sie zählt" und einer Relevanzstufe.

---

## 7. CONFIDENCE-ENGINE

`HIGH` / `MODERATE` / `LIMITED` (Anzeige: HOCH / MODERAT / EINGESCHRÄNKT),
deterministisch aus: Anzahl und Schwere der Lücken, kontextkritischen Lücken
(statusabhängig), Widersprüchen zwischen Angaben, verweigerten Kernangaben,
Red Flags und Legacy-Status. Keine erfundenen Prozentwerte.

Score und Confidence stehen **getrennt** im Ergebnis:
`SCORE 76/100 · AUSSAGESICHERHEIT EINGESCHRÄNKT — Entscheidende Werte fehlen:
Blutdruck nicht bekannt, Leberwerte unbekannt, Hämatokrit/Hämoglobin unbekannt.`

---

## 8. BOTTLENECK-ENGINE

Ranking = (Schwere + Lücken-Boost) × Gesundheitsrelevanz × Umsetzbarkeit ×
Zielbezug, plus sechs Vorrangregeln (unkontrollierter Blutdruck → Apnoe-Signal →
Enhanced-Kontrolle → Therapie-Kontrolle → Rückkehr-Status → kritische Datenlücken).

Verifiziert: Training 27/100 (schlechtester Zahlenwert), Engpass trotzdem
**Herz-Kreislauf-Kontrolle**, weil ein bekannter unbehandelter Blutdruck vorliegt.
Sekundäre Prioritäten werden immer mit ausgegeben.

---

## 9. GOAL-RECOMMENDATION — Änderungen

| vorher | jetzt |
|---|---|
| BUILD, sobald `fat === 0` — auch ohne gemessenen Bauchumfang | BUILD nur bei **belegter** Schlankheit (WHtR < 0.5 oder skinny & BMI < 24) |
| Trend irrelevant | starke Zunahme / wachsende Taille heben den Fett-Kontext an |
| kein CUT bei klar erhöhter Taille mit Muskelwunsch | WHtR ≥ 0.55 bzw. „stark, aber zu viel Fett" ⇒ **CUT** mit Muskelschutz |
| kein HEALTH FIRST | **HEALTH FIRST** als eigener Modus, mit parallel erhaltener Trainingsrichtung |
| `goal_pain` teilweise ignoriert | Bauch, Gewicht und Muskelmasse fließen direkt in Modus und Engpass |

### BELLY-FAT / BUILD BUG — Ergebnis

| Fall | vorher | jetzt |
|---|---|---|
| „Bauch stört", Taille 100 cm, Muskelziel | RECOMP/BUILD je nach Eingabe | **RECOMP** |
| „Bauch stört", **Bauchumfang nicht gemessen**, Selbstbild athletisch, Muskelziel | **BUILD** ❌ | **RECOMP** ✅ + Datenlücke „Bauchumfang unbekannt" + Hinweis, ihn zu messen |
| „Bauch stört", Taille 104 cm, „stark, aber zu viel Fett", Muskelziel | RECOMP | **CUT** (Muskeln über Protein + hartes Training geschützt) |
| schlank, Taille 82 cm, Muskelziel | BUILD | **BUILD** (unverändert korrekt) |

Testgesichert in `score-v2.test.js` (CASE 1 + CASE 2) und weiterhin in
`score-engine.test.js`.

---

## 10. TRT-LOGIK

* Eigene Fragen: Indikation, ärztliche Begleitung, Dauer, Verlaufskontrollen,
  **Ansprechen**, Kinderwunsch.
* **Therapie-ANSPRECHEN und Therapie-KONTROLLE werden getrennt ausgewiesen.**
  Verifiziert: „deutlich verbessert" bei gleichzeitig 17/100 Kontrolle.
* Gut betreute Therapie: Kontrolle 100/100, kein HEALTH FIRST, kein Punktabzug
  für den Status.
* Selbstgesteuert ohne Verlaufswerte: HEALTH FIRST, Lücke „Keine aktuellen
  Verlaufskontrollen", Engpass Therapie-Kontrolle.
* Medizinische Einordnung (Kontrollintervalle, Hämatokrit, PSA, Fertilität)
  bleibt ausdrücklich beim Arzt — der Score benennt nur Relevanz und Lücken.

## 11. ENHANCED-LOGIK

* Kategorien statt Präparate; Mengen werden **nie** erfragt.
* Compound-aware Routing: oral → Leber, GH/Insulin → Glukose, androgen wirksam
  → Hämatokrit/Hämoglobin, GLP-1 → Muskelerhalt.
* Signale (Blutdruck, Luftnot, Schnarchen/Tagesmüdigkeit, Sexualfunktion,
  Wassereinlagerung, Stimmung, Brustsymptome, Fertilität) **routen Fragen**
  statt Punkte abzuziehen; relevante Signale erzeugen den ausdrücklichen
  Hinweis auf ärztliche Einordnung.
* `ENHANCED CONTROL` als eigene Domain mit Bändern GUTE KONTROLLE / TEILWEISE /
  DEUTLICHE DATENLÜCKEN / ÜBERPRÜFUNG NÖTIG.
* **Kein Statusmalus:** identischer Lifestyle ergibt NATURAL 96 vs. gut
  kontrolliert ENHANCED 97. Schlecht kontrolliert fällt der Wert — durch die
  Kontrolle, nicht durch den Status.

## 12. FORMER-ENHANCED-LOGIK

* Zeitachse, Expositionsdauer, Veränderungen seit dem Absetzen, Nachkontrolle.
* Sonderzustand **RÜCKKEHR-STATUS UNKLAR**, wenn Symptome und fehlende
  Nachkontrolle zusammentreffen — **unabhängig von der vergangenen Zeit**
  (getestet auch für „>12 Monate her").
* Keine Diagnose, keine Aussage über Hormonspiegel.

---

## 13. BACKWARD COMPATIBILITY

* `check_result` behält alle Bestandsfelder; neue Felder kommen additiv dazu (`v: 2`).
* Alte Ergebnisse ohne Status → `unknown`, Confidence `LIMITED`, Panel benennt
  die alte Score-Version. **Nicht** als natural, **nicht** als „gesund" gedeutet.
* `check.js` und `report.js` rechnen Alt-Ergebnisse bei Bedarf aus den
  gespeicherten Antworten nach; keine destruktive Migration.
* Live verifiziert: gespeichertes v1-Ergebnis lädt, Banner erscheint,
  Ergebnisseite und PDF-Report rendern vollständig, 0 JS-Fehler.
* `course.js` nutzt bei HEALTH FIRST die parallele Trainingsrichtung, damit das
  12-Wochen-Programm unverändert weiterläuft.

---

## 14. MEDIZINISCHE LEITPLANKEN

* keine Diagnose — Formulierung „Deine Angaben rechtfertigen eine genauere
  Abklärung", nie „du hast einen Mangel"
* keine Dosierungen, keine Zyklusplanung, kein PCT, keine Gegenmittel,
  kein „nimm X dazu" — per Textscan über `check-data.js` und `check.js` getestet
* Red Flags haben Vorrang vor jeder Produkt- oder Programm-Empfehlung
* „Möchte ich nicht angeben" überall dort, wo es sensibel wird — kostet
  Aussagesicherheit, nie Punkte, nie Nutzbarkeit
* Status wird nicht an Analytics übergeben (nur Engpass-Domäne und Archetyp,
  wie bisher)

**Evidenz-Abgleich (Juli 2026):** Die Monitoring-Relevanz folgt der aktuellen
professionellen Praxis — Hämatokrit- und PSA-Verlauf sowie Kontrollintervalle
unter Testosterontherapie (Endocrine-Society-Leitlinie, weiterhin gültige
Fassung von 2018: Baseline, 3–6 Monate, danach periodisch), und für
nicht-medizinische Anwendung die in der Harm-Reduction-Literatur 2025/26
beschriebenen Parameter (Blutdruck, Hämatokrit/Hämoglobin, Lipide inkl. ApoB,
Leber- und Nierenwerte, Glukose, Fertilität, Schlafapnoe-Kontext). Für die
nicht-medizinische Anwendung existiert **keine** formale Leitlinie — das ist im
Produkt bewusst so abgebildet: Relevanz und Lücken benennen, Beurteilung dem
Arzt überlassen. Quellen:
[Endocrine Society — Testosterone Therapy Guideline](https://www.endocrine.org/clinical-practice-guidelines/testosterone-therapy),
[Endotext — Monitoring of Men Receiving Testosterone Therapy](https://www.ncbi.nlm.nih.gov/books/NBK278998/table/age-rel-chang-mra.T.recommendations_for/),
[Harm Reduction Journal 2025 — AAS harm reduction case report](https://link.springer.com/article/10.1186/s12954-025-01294-w),
[Navigating non-medical androgen use: towards a harm reduction paradigm](https://www.sciencedirect.com/science/article/pii/S2211266924000252),
[Impact of AAS abuse on the cardiovascular system](https://pmc.ncbi.nlm.nih.gov/articles/PMC12652398/).

---

## 15. TEST CASE RESULTS

Alle 12 geforderten Fälle sind als deterministische Tests umgesetzt
(`node tools-dev/tests/score-v2.test.js`).

| Case | Erwartung | Ergebnis |
|---|---|---|
| 1 Natural, schlank, Muskelziel | BUILD möglich | ✅ BUILD, Confidence HIGH |
| 2 Natural, Bauchfett-Sorge | nie automatisch BUILD | ✅ RECOMP/CUT, auch bei unbekanntem Bauchumfang |
| 3 Natural + Symptomcluster | keine Hormondiagnose | ✅ „hormoneller Kontext sollte geprüft werden" |
| 4 TRT, gutes Ansprechen, gute Kontrolle | kein Statusmalus | ✅ Kontrolle 100/100, kein HEALTH FIRST |
| 5 TRT, gutes Ansprechen, schlechtes Monitoring | Trennung Ansprechen/Kontrolle | ✅ „deutlich verbessert" bei Kontrolle 17/100 |
| 6 Enhanced, hohe Leistung, schlechte Kontrolle | Engpass = Kontrolle/Daten | ✅ Training 97, Engpass Enhanced Control 18 |
| 7 Enhanced, gut überwacht | kein erzwungen niedriger Score | ✅ 97 vs. 96 bei Natural |
| 8 Former + Symptome ohne Nachsorge | RÜCKKEHR-STATUS UNKLAR | ✅ inkl. Datenlücke, ohne Diagnose |
| 9 Labore unbekannt | Datenlücke statt „normal" | ✅ mehr Lücken, Confidence sinkt |
| 10 Mehrere Gesundheitssignale | HEALTH FIRST | ✅ inkl. erhaltener Trainingsrichtung |
| 11 Gleicher Score, anderer Kontext | andere Interpretation | ✅ andere Engpässe, Panels und Wege |
| 12 Status unsicher | funktioniert ohne Zwangseinordnung | ✅ neutrale Einordnung, keine Kontext-Domain |

**Suite gesamt:** 19 Testdateien, **1100 Assertions, 0 Fehler**
(davon `score-v2.test.js`: 132 neue Assertions).

Zusätzlich abgesichert: Zurück-Navigation im Wizard verwirft die Antworten
eines verlassenen Zweigs (Statuswechsel enhanced → natural entfernt
Kontroll-Domain, Lücken und Signale).

---

## 16. MOBILE / BROWSER QA

Echte Chromium-Durchläufe gegen die lokal ausgelieferte Seite
(kein Mock, kein Snapshot):

| Prüfung | Ergebnis |
|---|---|
| Alle 5 Statuspfade komplett durchgeklickt | ✅ Ergebnis erscheint, korrektes Panel je Status |
| Viewports 390 / 430 / 768 / 1440 | ✅ kein horizontaler Überlauf (`scrollWidth === clientWidth`) |
| JS-Fehler | ✅ 0 (die einzige Netzwerkmeldung ist die im QA-Sandkasten blockierte Supabase-CDN) |
| Zurück-Navigation | ✅ Statusfrage erreichbar, Folgefrage wechselt real (Natural → Trainingsantwort, Enhanced → Kontext) |
| Antwort-Persistenz nach Zurück | ✅ vorherige Auswahl bleibt markiert |
| Bedingte Fragen | ✅ erscheinen/verschwinden live nach jeder Antwort |
| Ergebnis-Rendering | ✅ Status, Engpass, Systeme, Panel, Datenlücken, Reihenfolge, Confidence |
| Report (PDF-Ansicht) | ✅ neue Kontext- und Lücken-Sektionen, 13,2 k Zeichen |
| Folgeseiten mit V2-Ergebnis | ✅ ebooks, mein-protokoll, kurs-programm, tracker, index: 0 Fehler |
| Legacy-Ergebnis (v1) | ✅ lädt, rendert, Status „unbekannt", Confidence eingeschränkt |
| Touch-Targets | 1 Bestands-Button („Ergebnis senden") unter 40 px — **vorbestehend**, nicht durch V2 eingeführt |
| Lange Labels | ✅ eigene Spaltenbreite + Kurznamen für die Domain-Liste, eigener Stil für Datenlücken |

---

## 17. QUALITY GATE

| # | Frage | Antwort |
|---|---|---|
| 1 | Ändert Natural vs. Enhanced die Erfahrung wirklich? | **JA** — andere Fragen, andere Domain, anderes Panel, andere Wege |
| 2 | Wird TRT anders behandelt als Performance-Enhancement? | **JA** — getrennte Module, Domains und Texte |
| 3 | Senkt „Enhanced" automatisch den Score? | **NEIN** — 97 vs. 96 bei identischem Lifestyle |
| 4 | Gelten unbekannte Labore als normal? | **NEIN** — explizite Datenlücken, Confidence sinkt |
| 5 | Kann jemand mit Bauchfett-Sorge fälschlich BUILD bekommen? | **NEIN** — BUILD verlangt belegte Schlankheit |
| 6 | Diagnostiziert der Score Hormonstörungen? | **NEIN** — nur Abklärungshinweis |
| 7 | Empfiehlt er Dosierungen / Gegenmittel? | **NEIN** — testgesichert per Textscan |
| 8 | Wird ein primärer Engpass benannt? | **JA** — in jedem Statuspfad |
| 9 | Werden Datenlücken gezeigt? | **JA** — mit Begründung und Relevanzstufe |
| 10 | Gibt es einen logischen nächsten Weg? | **JA** — Reihenfolge + max. 3 passende Kapitel |
| 11 | Lädt ein altes gespeichertes Ergebnis? | **JA** — live verifiziert |
| 12 | Fühlt sich der Score deutlich intelligenter an? | **JA** — Status, Kontrolle, Lücken, Sicherheit, Priorität statt einem Zahlenblock |

---

## 18. DEPLOYED SHA / LIVE VERIFICATION

**Status: PARTIAL — implementiert, getestet und im Browser verifiziert;
Produktions-Deploy ausstehend.**

Grund: GitHub Pages liefert dieses Repository direkt aus `master`
(Repo-Root, `CNAME` → `www.malemetrix.com`, kein Deploy-Workflow). Ein
Live-Deploy bedeutet hier einen Push auf `master`, also eine sofortige,
öffentliche Veröffentlichung auf der Produktivseite. Die Arbeitsanweisung
dieser Session bindet Entwicklung und Push an
`claude/malemetrix-score-v2-vhket0`; ein Push auf einen anderen Branch braucht
eine ausdrückliche Freigabe. Diese Freigabe wurde beim Owner angefragt.

Vorbereitet und bereit:

* Branch `claude/malemetrix-score-v2-vhket0` mit vollständiger Arbeit
* alle Suiten grün (1100 Assertions)
* Browser-QA auf 4 Viewports, 5 Statuspfaden, Legacy-Pfad, 0 JS-Fehler
* keine Änderungen an PayPal, Orders, Entitlements, Vaults, Ultimate-Stack-
  Verschlüsselung, Auth oder Recovery — der Commerce-Pfad wurde nicht berührt
  (Commerce-Suiten unverändert grün)

Nach Freigabe: Merge nach `master`, Push, danach Live-Verifikation von
`https://www.malemetrix.com/check.html` (alle vier Statuspfade,
Ziel-Empfehlung, Ergebnisseite, Deep Links, Mobile, JS-Fehlerfreiheit) und
Nachtrag der deployten SHA in diesem Abschnitt.
