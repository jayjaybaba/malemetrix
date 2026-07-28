# MaleMetrix — Begriffskanon (verbindlich ab Paket 1)

Zweck: EIN Wörterbuch für sichtbare Nutzerbegriffe. Konkurrierende Begriffe
werden hier entschieden — nicht einzeln über das Repository verteilt.
Technische Keys, Datenfelder, URLs und Kommentare sind davon ausgenommen und
werden nicht allein aus sprachlichen Gründen umbenannt.

## Die Hierarchie

Optimierungsbereich → Engpass → Optimierungspunkt → Ein Auftrag →
Fokusphase → Ergebnisprüfung → Persönlicher Standard

Nie die ganze Kette auf einmal zeigen — je Kontext nur die Begriffe, die der
Nutzer dort braucht.

| # | Kanonischer Begriff | Bedeutung | Ersetzt sichtbar (wenn dasselbe gemeint ist) |
|---|---|---|---|
| 1 | **Optimierungsbereich** (kompakt: „Bereich“) | Übergeordnetes Themengebiet; basiert auf den bestehenden 12 Score-Domains | System(e), Modul, Domain, Pillar |
| 2 | **Engpass** | Der aktuell wichtigste begrenzende Faktor (Diagnose-Begriff, bleibt) | Limiter, Bottleneck (sichtbar) |
| 3 | **Optimierungspunkt** | Das konkrete Thema, das aus einem Engpass abgeleitet und aktiv bearbeitet wird | — (Arbeitsobjekt in `mm_opt_points`, siehe unten) |
| 4 | **Fokusphase** | Ausschließlich der zeitlich begrenzte Bearbeitungszeitraum | Sprint-/Zyklus-artige Zeitbegriffe im Fokus-Kontext |
| 5 | **Ein Auftrag** | Die zentrale konkrete Aufgabe innerhalb einer Fokusphase (bestehendes Konzept, bleibt) | „Aufgabe“ (im Fokus-Kontext) |
| 6 | **Ergebnisprüfung** | Oberbegriff für Umsetzungs- und Wirkungsprüfung | Review, Recheck, Check-in, Weekly Pulse, Reassessment (sichtbar) |
| 6a | **Umsetzungsprüfung** | Wurde der Auftrag ausreichend umgesetzt? (aus den täglichen Häkchen) | — |
| 6b | **Wirkungsprüfung** | Hat die Maßnahme erkennbar geholfen? Darf später liegen als die Umsetzungsprüfung und bleibt bis dahin ehrlich „offen“ | — |
| 7 | **Bereichswert** | Sichtbare 10er-Darstellung eines Domain-Scores (Paket 4, umgesetzt); intern/persistiert bleibt alles 0–100, Gesamtscore bleibt /100 | — |
| 8 | **Persönlicher Standard** | Bewährte Maßnahme/Routine, dauerhaft übernommen | „MY PROTOCOL“ (Ansichtstitel) |

## Kontextregeln (nicht mechanisch ersetzen)

- **Engpass bleibt.** „Optimierungspunkt“ ersetzt ihn nicht, sondern ist das
  Arbeitsobjekt darunter.
- **„Experiment“** bleibt im Premium-Experiment-Modul zulässig, wo tatsächlich
  ein kontrollierter Test gemeint ist.
- **„Entscheidung“** bleibt im Decision Ledger zulässig.
- **„Review“** darf intern/technisch bestehen bleiben (Code, Keys, Kommentare);
  auch sichtbar dort, wo es NICHT die Ergebnisprüfung meint (z. B. „Human
  Review“ = Eskalation an einen Menschen).
- **„validiert“/„verifiziert“** sind nicht grundsätzlich verboten.
- **„System“** bleibt als Produkt-/Markenbegriff („Das Performance-System für
  Männer“, „das MaleMetrix System“). Nur wenn die 12 Bereiche gemeint sind,
  gilt Optimierungsbereich/Bereich.
- **„Hebel“** bleibt als Metapher für Wirkung/Ansatz zulässig; wo konkret der
  Engpass gemeint ist, steht Engpass.
- **„Programm“ / „Durchlauf“**: Das 12-Wochen-Programm ist KEINE Fokusphase.
  Ein abgeschlossener 12-Wochen-Lauf heißt sichtbar „Durchlauf“, nicht
  „Zyklus“ (Nähe zur Steroid-Sprache, siehe focus.test.js-Leitplanke).

## Wo die Labels technisch leben

- App-Chrome/Marketing: `js/i18n.js` (DICT)
- OS-App: Label-Maps in `js/os/app.js` (VIEW_LABEL, MODE, BN, PHASE, DEC_LABEL)
- 12-Wochen-Programm: `T_DICT` in `js/course.js`
- Score/Ergebnisseite: Render-Strings in `js/check.js` (Engine-Texte in
  `js/check-data.js` sind kalibriert — nur sichtbare Rahmentexte anfassen)
- PWA: `manifest.webmanifest` (nur Labels; URLs/Hashes niemals ändern)

## Fokusphasen-Regeln (Paket 2, umgesetzt)

- Dauern: **7 · 14 · 28 Tage**; MaleMetrix empfiehlt je Auftrag eine Dauer
  (`FOCUS[domain].dauer`), der Nutzer bestätigt oder wählt um.
  Leitplanken: 7 = kurzer Einstieg / klar überprüfbare Verhaltensänderung ·
  14 = Standard für Routinen · 28 = längere Eingewöhnung / langsame Trends.
  Produktleitplanken, keine medizinischen Wirksamkeitsfristen.
- **Ziel-Regel (Toleranzprinzip):** Ziel(d) = round(d × Ziel28 / 28),
  begrenzt auf 1 … d−1. 20/28 → 5/7 → 10/14 („5 von 7 Tagen pro Woche“);
  24/28 → 6/7 → 12/14. Perfektion (d von d) wird nie verlangt.
- **Umsetzungs-Urteil:** ausreichend = Ziel erreicht · teilweise = mindestens
  halbes Ziel · nicht ausreichend = darunter. Tage ohne Häkchen zählen nie
  als umgesetzt, gelten aber als „nicht erfasst oder nicht umgesetzt“, nicht
  als bewusstes Scheitern.
- **Wirkungs-Urteile:** erkennbar · teilweise · nicht erkennbar · offen ·
  unklar (Datenlage reicht nicht) · nicht weiter geprüft (bewusste
  Entscheidung). Wirkungsprüfung nie vor Phasenende; `wirkfrist` kann sie
  nach hinten legen (z. B. Training: Umsetzung nach 14 Tagen, Wirkung
  sinnvoll ab 28).
- **„Offen“ ist kein Abschluss.** Eine Vertagung hält den Vorgang aktiv:
  Die offene Wirkungsprüfung bleibt im Tracker sichtbar und bearbeitbar,
  auch nachdem der Auftrag archiviert wurde. Abgeschlossen ist sie erst
  mit einem echten Ergebnis oder der bewussten Entscheidung, nicht weiter
  zu prüfen. (Alt-Aufträge von vor Paket 2 tauchen dabei nie nachträglich
  als offen auf — Marker ist das Feld `wirkungBis`.)
- **Fokusphase ≠ vollständiger Score:** Das Phasenende löst nur die
  Prüfungen aus; der vollständige Score behält seinen eigenen Rhythmus
  (~4 Wochen) und wird nie automatisch erzwungen.
- **Abwärtskompatibilität:** Aufträge ohne gespeicherte Dauer gelten als
  28 Tage; Historie wird nie umgeschrieben, neue Felder sind additiv.

## Anzeigeregeln (verbindlich)

- **Umsetzung, Ziel und Zielstatus sind drei getrennte Angaben.** Das
  Mindestziel ist nie der Nenner der Umsetzung: „5 von 7 Tagen umgesetzt ·
  Ziel: 5 Tage — erreicht · Quote 71 %“, niemals „5 von 5“.
- **Letzter Umsetzungstag ≠ Prüfungstag.** Technisch ist `until` der
  Prüfungstag; der letzte Tag zum Abhaken liegt einen Tag davor. Sichtbar
  daher immer getrennt: „Fokusphase 14 Tage: 28.07.–10.08. ·
  Umsetzungsprüfung am 11.08.“

## Optimierungspunkte (Paket 3, umgesetzt)

**Kanonische Struktur:** `mm_opt_points` (`js/points.js`, Sync-Domäne
`optpoints`, append-orientiert). Sie speichert ausschließlich Zuordnung,
Status, Referenzen und zusammenfassende Ergebnisse — nie eine zweite Kopie
der Umsetzung. Keine neue Tabelle, keine Migration.

**Source of Truth je Information:**

| Information | Maßgebliche Quelle |
|---|---|
| Auftrag, Fokusphase, tägliche Häkchen, Umsetzungs- und Wirkungsprüfung | `mm_focus` / `mm_focus_history` |
| Premium-Experimente | `intel_experiments` (nur gelesen) |
| Planentscheidungen | `intel_decisions` (nur referenziert) |
| Zuordnung, Status, Referenz, Ergebnis-Zusammenfassung, persönlicher Standard | `mm_opt_points` |

**Statusmodell** — sieben interne Zustände, je einer pro sichtbarer Gruppe:

| Bestehender Zustand (Quelle) | Interner Zustand | Sichtbarer Status |
|---|---|---|
| Auftrag gestartet, Fokusphase läuft | `in_umsetzung` | In Umsetzung |
| Punkt gespeichert, noch nicht bearbeitet | `erkannt` | Offen |
| Fokusphase vorbei, Umsetzung nicht quittiert | `pruefung_faellig` | Prüfung fällig |
| Wirkung vertagt (`wirkung.verdict = offen`) oder Vorgang archiviert ohne Urteil | `wirkung_offen` | Wirkung offen |
| Wirkungsurteil erkennbar / teilweise / unklar / nicht weiter geprüft | `abgeschlossen` | Abgeschlossen |
| Bewusst pausiert (manuell) | `pausiert` | Pausiert |
| Manuell gesetzt **oder** ausreichend umgesetzt + keine Wirkung + ärztlicher Vorbehalt | `weitere_abklaerung` | Weitere Abklärung |

Manuelle Zustände (`pausiert`, `weitere_abklaerung`) gewinnen über die
Ableitung; sonst gewinnt immer die Quelle. Übergänge entstehen aus
bestehenden Handlungen — der Nutzer wählt nie einen Status aus.

**Entstehung:** Ein Punkt entsteht ausschließlich aus einer bestätigten
Handlung — heute: dem Start eines Auftrags. Ein angezeigter Score-Engpass
erzeugt nichts; wiederholte Scores sammeln keine unbestätigten Punkte an.

**Duplikatregel (konservativ, zweistufig):** gleiche `source_type` +
`source_id` ⇒ immer derselbe Punkt (Aktualisierung). Sonst: gleiche
Quellart + gleicher Bereich + identisch normalisierter Titel + noch nicht
abgeschlossen ⇒ Aktualisierung. Keine Ähnlichkeitssuche — fachlich
verschiedene Punkte werden nie zusammengelegt.

**Persönlicher Standard:** entsteht nie automatisch. Eine gute Umsetzung
plus erkennbare Wirkung erzeugt nur eine *Empfehlung*; übernommen wird
ausschließlich per ausdrücklicher Bestätigung (`standard.bestaetigt`).
Ärztlicher Vorbehalt im Bereich unterdrückt die Empfehlung. Der Standard
lebt im Punkt selbst — keine zweite Standardbibliothek.

## Bereichswerte (Paket 4, umgesetzt)

**Reine Darstellungsschicht.** `Bereichswert = Domain-Score / 10`. Es gibt
keine zweite Skala, keine zweite Engine und keine Speicherung: Intern und
persistiert bleibt alles 0–100, der Gesamtscore bleibt `/100` und die primäre
Zahl auf der Seite.

**Ein kanonischer Helfer** in `js/check-data.js` — jede sichtbare
Bereichszahl geht durch ihn:

| Funktion | Zweck |
|---|---|
| `C.areaValueFromDomainScore(score)` | gültigen Score erkennen, Rohwert `score/10` (sonst `null`) |
| `C.formatAreaValue(score)` | deutsches Zahlenformat: Komma, höchstens eine Nachkommastelle |
| `C.areaValueLabel(score)` | vollständiges Label `„5,6/10"` bzw. `„Noch nicht bewertet"` |
| `C.areaValueA11y(name, score)` | vollständiger Screenreader-Satz statt bloßer Zahl |
| `C.areaReasons(answers, domain, gaps, limit)` | Begründung aus vorhandenen Antworten, Modifikatoren und Datenlücken |

**Formatregeln:** deutsches Dezimalkomma · höchstens eine Nachkommastelle ·
ganze Werte ohne `,0` (70 → `7/10`) · **keine künstliche Untergrenze**
(0 → `0/10`, 1 → `0,1/10`) · ungültig/fehlend → **„Noch nicht bewertet"**
(nie 0, nie geraten).

**Begründung („Warum dieser Wert?"):** ausschließlich deterministische
Quellen — die eigenen Antworten des Nutzers, bewertet mit derselben
Engine-Funktion wie der Score, plus die dokumentierten Kontextmodifikatoren
und die bestehende Datenlücken-Liste. Keine generierten Texte, keine
Ursachenbehauptung, keine Diagnose. Wo nichts Punkte gekostet hat, wird
auch nichts erfunden.

**Engpass:** kommt weiterhin ausschließlich aus der Engine
(`C.primaryBottleneck`) — **nie** aus dem niedrigsten Bereichswert. Ein
Bereich mit höherem Wert kann der Engpass sein, wenn Gewichtung und
Zielbezug das so ergeben.

**Trennung 12 ↔ 7:** Die 12 Score-Domains (+ Kontext-Domains) sind die
**Optimierungsbereiche**. Die 7 Säulen sind das **verdichtete Profil** auf
der 100er-Skala — keine zweite Bereichsliste und nie mit Bereichswerten.

**Historie:** Ergebnisse ohne gespeicherte Domain-Daten bekommen die heutige
Struktur nicht rückwirkend übergestülpt; sie zeigen das verdichtete Profil
plus einen ehrlichen Hinweis. Kein Bereichswert wird aus einem Gesamtscore
oder aus Profilsäulen zurückgerechnet.

**Zeitbindung:** Ein Bereichswert gehört zu seinem Score-Zeitpunkt und wird
mit dem Score-Datum benannt. Tagestracking verändert ihn nie.

**Trend:** bewusst keiner. `check_history` speichert je Eintrag nur
`{date, total, scores}` — also Gesamtwert und Profilsäulen, keine
Domain-Details. Ein sicherer Bereichsvergleich ist damit heute nicht
möglich, und ein unsicherer wird nicht behauptet (§15). Die bestehende
Gesamtscore-Vergleichslogik bleibt unverändert in Gebrauch.

## Messdatenbrücke (Paket 5, umgesetzt)

Vorhandene Mess- und Trackingdaten unterstützen „Ein Auftrag", wo sie ihn
wirklich tragen — ohne zweite Datenwahrheit. Sichtbar heißt das:
**Automatisch aus Messdaten erkannt · Aus Tracking vorgeschlagen ·
Manuell bestätigt · Manuell korrigiert · Daten nicht ausreichend.**

**Drei Automatikstufen** (Zuordnung über die stabile Domain-ID des Auftrags,
nie über seinen sichtbaren Text):

| Stufe | Bedeutung | Bereiche |
|---|---|---|
| **A** — automatisch erkennbar | eindeutiges objektives Kriterium, klarer Schwellenwert, eine kanonische Quelle | `cardiovascular` (30 min Bewegung) · `nutrition` (Proteinziel) · `bodyComposition` (Gewicht notiert) · `dataQuality` (ein Wert notiert) |
| **B** — Bestätigung vorgeschlagen | Messdaten machen die Umsetzung wahrscheinlich, beweisen sie aber nicht | `training` (Log belegt keine Planbarkeit) · `movement` (Auftrag zählt **Schritte**, erfasst werden Minuten) · `sleep` (Auftrag betrifft die **Uhrzeit**, erfasst wird die Dauer) |
| **C** — nur manuell | nicht zuverlässig ableitbar | `recovery` · `metabolic` · `hormonal` · `energy` · `execution` · `enhancedControl` · `therapyControl` · `recoveryStatus` |

**Quellenmatrix** (ausschließlich reale bestehende Keys):

| Kennzahl | Free-Quelle | OS-Quelle | Tageszuordnung | Kriterium | Konfliktregel |
|---|---|---|---|---|---|
| Bewegungsminuten | `mm_trk_daily.min` + `mm_trk_cardio.durationMin` + `mm_trk_sessions.duration` | — (OS führt keine Minuten) | lokaler Tag; ISO-Zeitstempel über die lokale `ymd()`-Regel | `cardiovascular`: Summe ≥ 30 min (Schwelle steht im Auftrag) · `movement`: Summe ≥ `mm_trk_plan.dailyMin` (Standard 25) als Anhaltspunkt | Free ist kanonisch; nur eine OS-Session ohne Minuten ⇒ Stufe B |
| Trainingseinheit | `mm_trk_sessions` | `mm_os_workout_logs._sessions` | lokaler Tag der Einheit | Existenz (ODER, nie Summe) | Free zuerst, sonst OS — dieselbe Einheit kann nie doppelt zählen |
| Protein | `mm_diary_<tag>` (Ziel `mm_goals.p`) | `mm_os_nutrition_log[tag]` (Ziel `mm_os_nutrition_plan.protein`) | lokaler Tag des Eintrags | ≥ 90 % des Ziels (bestehende Adhärenz-Definition) | OS kanonisch, sobald ein OS-Ernährungsplan existiert; **nie addieren**; kommen beide Welten zu unterschiedlichen Ergebnissen ⇒ keine Automatik, nur Vorschlag |
| Gewicht notiert | `mm_trk_body.weightKg` | `mm_os_metrics` (`type:"weight"`) | lokaler Messtag | Existenz > 0 | ODER — Existenz kann nicht doppelt zählen |
| Schlaf erfasst | `mm_trk_sleep` | `mm_os_metrics` (`type:"sleep"`) | **Aufwachtag** („Nacht auf" — bestehende Konvention) | Existenz > 0 | ODER |
| Irgendein Wert | alle obigen | alle obigen | lokaler Tag | ≥ 1 Eintrag | ODER |
| **Schritte** | — | — | — | — | **keine Quelle im Produkt** ⇒ nie Stufe A |
| **Blutdruck** | — | — | — | — | **keine Quelle im Produkt** ⇒ Stufe C |

**Source of Truth bleibt unverändert:** `mm_focus`/`mm_focus_history` für den
Umsetzungsstatus · Tracker-/Diary-/OS-Logs für die Messwerte selbst ·
`mm_opt_points` für Zuordnung und Status. `mm_focus` speichert nur den
abgeleiteten Tagesstatus samt knapper Herkunft — nie eine Kopie der Messdaten.
Es wird nie in Tracker- oder OS-Logs zurückgeschrieben.

**Tagesstatus in `mm_focus.done`** (rein additiv, Alt-Bestand bleibt lesbar):

| Wert | Bedeutung |
|---|---|
| `true` | Alt-Bestand — gilt als manuell umgesetzt |
| `{v,s,q,src,val,ziel,at}` | `s`: `ja` / `nein` / `offen` · `q`: `manuell` / `bestaetigt` / `korrigiert` / `auto` / `auto_revidiert` |

**Prioritätsregel:** ausdrückliche manuelle Entscheidung → verlässliche
automatische Erkennung → Vorschlag → unbekannt. Ein manuell entschiedener Tag
(`manuell`/`bestaetigt`/`korrigiert`) wird von keinem Messdatenlauf mehr
angefasst. Fehlende Daten gelten weder als umgesetzt noch als nicht umgesetzt.

**Messwertkorrektur:** Während der laufenden Fokusphase darf eine **rein
automatische** Bewertung neu ausgewertet werden. Trägt der korrigierte Wert
sie nicht mehr, wird sie zurückgenommen (`auto_revidiert`) und benannt — nie
still in ein automatisches „nicht umgesetzt" verwandelt. Eine archivierte
Ergebnisprüfung ist eingefroren: in `mm_focus_history` wandert nur das
Ergebnis, nie die Tagesliste.

**Umsetzung ≠ Wirkung.** Messdaten können eine Umsetzung belegen, nie eine
Wirkung. Es gibt **eine** Umsetzungsquote; die Herkunft steht nur als Zusatz
daneben („davon 3 Tage aus Tracking erkannt"), nie als zweite Quote.

## Score → DAS PROTOKOLL (Paket 6, umgesetzt)

Der Score findet den Engpass, DAS PROTOKOLL erklärt ihn — jetzt mit
**konkretem Kapitel und konkretem Abschnitt** statt eines pauschalen
Verweises. Sichtbare Begriffe: **Empfohlenes Kapitel · Passender Abschnitt ·
Empfohlen, weil … · DAS PROTOKOLL**.

**Eine kanonische Zuordnung** in `js/check-data.js` — `C.CHAPTERS`
(Kapitelregister mit Nummer, Name, Datei, Abschnitten) und
`C.DOMAIN_CHAPTER` (Domain → Kapitel + Abschnitt). Jede sichtbare Empfehlung
läuft durch `C.chapterFor(domain, basis)`; es gibt keine zweite Kapitelliste
und keine Domain-Abfrage in `check.js`, `report.js` oder einer HTML-Datei.

**Technischer Schlüssel ist immer die stabile ID** (Kapitel-Key +
Abschnitts-Anker `#abschnitt-<id>`), nie die sichtbare Überschrift. Ein
Kapitel- oder Abschnittstitel darf umbenannt werden, ohne dass ein Link
bricht — nur die Anzeige folgt.

| Domain | Kapitel | Abschnitt |
|---|---|---|
| bodyComposition | 01 · DAS FUNDAMENT | Muskel und Fett als Stoffwechselorgane |
| training | 02 · JEDEN TAG TRAINIEREN | Drei Einheiten mit Progression statt sechs ohne |
| movement | 02 · JEDEN TAG TRAINIEREN | Alltagsbewegung als eigenständiger Hebel |
| sleep | 03 · SCHLAF & REGENERATION | Rhythmus schlägt Dauer |
| recovery · energy | 03 · SCHLAF & REGENERATION | Koffein-Timing, Alkohol und der Tiefschlaf |
| nutrition | 01 · VERTIEFUNG · Protein ohne Kochen | Wie viel Protein du wirklich brauchst |
| metabolic | 04 · BLUTWERTE, RISIKO & LONGEVITY | HbA1c, Nüchterninsulin und der stille Vorlauf |
| cardiovascular | 04 · BLUTWERTE, RISIKO & LONGEVITY | Blutdruck: der am meisten unterschätzte Einzelwert |
| dataQuality · enhancedControl | 04 · BLUTWERTE, RISIKO & LONGEVITY | Welche Werte eine Entscheidung verändern |
| hormonal · therapyControl | 05 · HORMONE & TESTOSTERON | Gesamt-T, freies T und SHBG richtig lesen |
| recoveryStatus | 05 · HORMONE & TESTOSTERON | Wie die HPG-Achse funktioniert |
| execution | ABSCHLUSS | Wie aus Wissen dauerhafte Umsetzung wird |

**Ernährung ist eine Vertiefung, kein Kanon-Kapitel.** Keines der zehn
Kapitel behandelt Protein oder Ernährung; der Bereich verweist deshalb auf
das Vertiefungs-Ebook „Protein ohne Kochen" und wird sichtbar als
**Vertiefung** gekennzeichnet, damit Kanon und Bibliothek nicht verschwimmen.

**Empfohlen, weil …** kommt ausschließlich aus `C.areaReasons` (Paket 4):
höchstens drei echte Antworten des Nutzers plus höchstens eine Datenlücke.
Keine generierten Texte, keine Diagnose, keine Kausalität. Ohne belastbare
Gründe steht der ehrliche Satz „Empfohlen aufgrund deines priorisierten
Optimierungsbereichs."

**Priorisierung unverändert.** Paket 6 entscheidet nicht neu, welcher Bereich
wichtig ist — es übersetzt die bestehende Engpass-Entscheidung. Der primäre
Engpass bekommt genau eine prominente Empfehlung, jeder weitere Bereich
höchstens eine kompakte; für den Engpass entfällt die kompakte, damit nichts
doppelt erscheint.

**Zugriff bleibt unberührt.** Ziel ist immer die bestehende Kapitelseite
(`ebooks/<kapitel>.html#abschnitt-<id>`) — die Vorschaufläche des Werks. Der
Volltext-Reader (`ebooks/protokoll.html`) ist AES-verschlüsselt und bleibt
es; keine Empfehlung zeigt dorthin, ein Anker kann die Sperre also nicht
einmal berühren. Von der Kapitelseite führt der bereits bestehende Weg in
den Volltext.

**Fehlt eine Zuordnung**, entsteht kein Link und kein Platzhalter, sondern:
„Für diesen Bereich ist aktuell noch kein direkter Protokollabschnitt
hinterlegt." Fehlt nur der Abschnitt, führt der Link höchstens ins richtige
Kapitel — nie zu einem falschen Anker.

## Noch offen (spätere Pakete)

- Bereichswert im Tracker / in My MaleMetrix: bewusst nicht in Paket 4.
  `tracker.html` und `mein-protokoll.html` laden `js/check-data.js` nicht —
  und damit auch den kanonischen Helfer nicht. Die Datei allein für eine
  formatierte Zahl auf eine Tagesseite zu legen, wäre nicht die kleinste
  sichere Änderung; im OS ist zudem heute kein Domain-Score sichtbar.
- Englische OS-Navigation (Today/Plan/Track/Progress/Learn) und Modul-Namen
  (NBA, Foresight, Digital Twin …) — bewusst nicht Teil der fünf Familien.
