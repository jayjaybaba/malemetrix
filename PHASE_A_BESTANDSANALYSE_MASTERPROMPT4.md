# MaleMetrix — Phase A: Bestandsanalyse (Masterprompt 4.0)

Stand: 28.07.2026 · Branch `claude/malemetrix-masterprompt-4-ggr1fi` · Reine Analyse, keine Codeänderungen.
Basis: 10 parallele Teilsystem-Analysen (OS/My MaleMetrix, Score, 12-Wochen-System, Protokoll, Tracker/Tools, Stack/Labs, Coaching/Commerce, Marketing/Navigation, Datenmodell, Terminologie) plus Nachrecherchen zu PWA/Service-Worker und iOS-App.

---

## 1. Executive Summary

**Kernbefund: Die Zielarchitektur des Masterprompts existiert bereits zu rund 80 % — unter anderen Namen.** MaleMetrix ist kein Rohbau, sondern ein reifes, getestetes System (24 Test-Suiten, ~1.850 Assertions). Der Decision Ledger (`intel_decisions`) ist strukturell fast feldgleich mit dem geplanten „Optimierungspunkt“, die Experiment-Engine ist die „Fokusphase“ samt Ergebnisprüfung, die Bottleneck-Domänen sind die „Optimierungsbereiche“, MY PROTOCOL ist der „Persönliche Standard“, die Proof-Engine sind die „Erkenntnisse“. Verbotene QM-Methodenbegriffe (FMEA, Ishikawa, 5-Why, 8D, KVP, Pareto, Scrum, Backlog, PQM, Bewertungsindex) kommen im gesamten Klartext des Repos **nicht** vor — die Ingenieurslogik ist bereits „versteckt“, genau wie gefordert.

**Größte Chance:** Konsolidierung statt Neubau. Die Arbeit von Phase B/C ist überwiegend (a) eine deutsche Begriffsschicht über vorhandene Label-Maps legen, (b) vier parallele Zeitfenster-Mechaniken zu einer Fokusphasen-Logik vereinen, (c) ein gemeinsames Statusmodell über den bestehenden Ledger mappen und (d) eine Handvoll echter Lücken schließen.

**Größtes aktuelles Problem:** Begriffs-Wildwuchs. Fünf konkurrierende Wortfamilien für dieselben Konzepte (Bereich/Modul/Domain/System · Engpass/Limiter/Bottleneck/Hebel · Auftrag/Experiment/Aktion/Entscheidung · Review/Recheck/Check-in/Pulse · Phase/Woche/Zyklus/Block) plus eine stark englische UI-Schicht im Kern-OS. Dazu ein fehlendes gemeinsames Statusmodell: Engpass, Datenlücken, Auftrag und Decisions sind vier getrennte Objekte ohne gemeinsamen Lebenszyklus.

**Wichtigste strategische Entscheidung:** Die neuen Begriffe als **Konsolidierungsschicht über die bestehenden Engines** einführen — nicht als Parallelwelt. Konkret heißt das: keine zweite Bewertungsskala neben 0–100 aufbauen, den etablierten Diagnose-Begriff „Engpass“ nicht opfern, und `focus.js` + `experiments.js` unter EINEM Fokusphasen-Begriff vereinen statt ein fünftes Zeitfenster-Konstrukt zu bauen.

---

## 2. Bestandsanalyse

### 2.1 Zu erhaltende Kernkonzepte (verbindlich, nicht ersetzen)

1. **Score mit Engpass-Logik** (`js/check-data.js`, `C.evaluate` als einzige Quelle der Wahrheit): 12 Kern-Domains + max. 1 Kontext-Domain, deterministische Priorisierung nach Schwere × Gesundheitsrelevanz × Umsetzbarkeit × Zielbezug mit Vorrangregeln, Datenlücken-Engine („Nicht gemessen heißt nicht normal“), Aussagesicherheit mit Gründen. Die 7 Legacy-Anzeige-Säulen (Body/Strength/Fuel/…) werden aus den 12 Domains abgeleitet — die Doppelanzeige wird konsolidiert, die Engine bleibt.
2. **„Ein Auftrag“-Fokus** (`js/focus.js` + `C.FOCUS`): genau eine Maßnahme aus dem Engpass, 28 Tage, tägliches Ja/Nein, Ziel 20/28 statt Perfektion, Historie, ehrliche Vier-Quadranten-Bilanz beim zweiten Score (durchgezogen × Wirkung). Das ist bereits Fokusphase + Ergebnisprüfung in Rohform — und der beste kostenlose Funnel-Baustein.
3. **Decision Ledger mit KEEP-Verdikt** (`js/os/intelligence/memory.js`, `intel_decisions`): jeder Vorschlag mit `expectedSignal` + `reassessIf` + Review-Datum (Falsifizierbarkeits-Contract, UI „ERWARTET / NEU BEWERTEN WENN“), KEEP als souveräner Premium-Output („WAS WÜRDE DAS ÄNDERN?“). Das IST die Ergebnisprüfung der Zielarchitektur, deterministisch implementiert.
4. **Experiments-Modul** (`js/os/intelligence/experiments.js`): eine Variable pro Änderung, Baseline-Snapshot, feste Dauer, konservative Auswertung ohne Kausalitäts-Übertreibung. Strukturell die fertige Fokusphase.

Ebenfalls erhalten: das generische `os_state`-Sync-Modell (versionierte JSON-Blobs je Domain — neue Entitäten kosten keine Migration), das strikte RLS-/Idempotenz-Muster im Backend, die serverautoritative Commerce-/Entitlement-Architektur, die visuelle Identität (Dark-only, Cyan, Koordinaten-/Mess-Ästhetik — keine Zahnräder, keine Werkstattoptik, passt exakt zu „Performance Engineering“), der Denk-Kreislauf auf trust.html (DATEN→KONTEXT→ENTSCHEIDUNG→AUSFÜHRUNG→MESSUNG→LERNEN — bereits der Ziel-Loop) und der Ingenieurs-Anker auf der Startseite („Ein Ingenieur denkt Männergesundheit als System“, index.html:387).

### 2.2 Inkonsistenzen (echte Befunde, nicht Begriffskosmetik)

- **7 vs. 12 Systeme auf der Startseite:** index.html:148 sagt „7 Systeme“, Z. 186/204 „zwölf Systeme“, das Instrument-Mock zeigt 7 englische Achsen; README.md nennt noch die alte 7er-Gewichtung.
- **Doku-Drift bei Preisen:** COMMERCE.md/BUSINESS-MODEL.md und alle fünf PROTOCOL_-Docs rechnen mit 49 €/149 € — live sind 99 € (Protokoll) und 199 €/Monat (Coaching). README.md ist mehrfach veraltet (Hell/Dunkel-Theme, Preise, Domain).
- **Score→Kapitel-Empfehlung entwertet:** Seit Phase 17 zeigen alle `C.CHAPTERS`-Links generisch auf protokoll.html, obwohl die „empfohlen weil…“-Begründungen weiter erzeugt werden — die geforderte begründete Empfehlungskette existiert, läuft aber ins Leere.
- **Zwei parallele Logging-Welten:** freier Tracker (`mm_trk_*`, kein Cloud-Sync) vs. OS-Logs (`os_workout_logs`, `os_nutrition_log`, Cloud-Sync) — zwei Wahrheiten für Trainings-/Ernährungsdaten ohne Brücke; `dinner.js` schreibt zusätzlich an `MM.store` vorbei (roher localStorage, für Sync unsichtbar).
- **Fokus-Erfüllung ist Selbstauskunft:** tägliche Checkbox, obwohl Protein (`mm_diary_*`), Schlaf (`mm_trk_sleep`) und Bewegung (`mm_trk_sessions/cardio/daily`) als echte Messdaten im selben Browser liegen.
- **Echte Backend-Bugs:** `send-brief` nutzt nicht existierende Spalten (`revoked`, `privacy_mode` — Migration 0005 definiert nur `privacy`); `mm-admin` ruft die Shared-CORS-Helper falsch auf und fehlt in `config.toml`; `registerStateDomain` ignoriert `{append:true}` — Ledger-Historien sind Last-write-wins (Multi-Device-Verlustrisiko).
- **Doppelte Formeln:** Scheiben-Rechner, TDEE/Makros und e1RM existieren je zweimal (tracker.js/tools.js/dinner.js) mit teils abweichenden Ergebnissen.

### 2.3 Unnötige Komplexität

- 22 Hash-Routen + Coach-Hub mit 8 Intelligence-Modulen im OS — die Soll-Welt braucht weniger, klarer benannte Oberflächen.
- Drei Confidence-Systeme im Score (dataConfidence, decisionConfidence, assessmentConfidence) und wirkungslose Alt-Gewichte.
- Archetypen als dritte Klassifikationsebene neben Engpass + Modus.
- Doppelte Framework-Konfiguration `course.js` ↔ `program-view.js` (Paritätstest nötig bei jeder Umbenennung).
- Legacy-Store `os_decisions` neben kanonischem `intel_decisions`.
- shop.html als Attrappe (bewirbt Sortiment, Katalog enthält 1 Produkt) — inkl. des Verbotsbegriffs „ärztlich validiert“.

---

## 3. Zielbild (kleinste sinnvolle Anpassung)

Das bestehende Rollenmodell bleibt unverändert der Kern: **Score findet · Protokoll erklärt · Programm führt · Tracker misst.** Die Nutzerreise (Score → Auftrag/Fokusphase → Tracker → zweiter Score → Programm/Protokoll → OS) existiert und funktioniert. Phase B verändert nicht die Architektur, sondern legt eine **einheitliche deutsche Begriffsschicht** darüber und schließt sechs echte Lücken:

1. Ein gemeinsames Statusmodell für Punkte (heute: vier getrennte Objekte).
2. Fokusphasen-Dauern 7/14/28 (heute: 28 hart codiert bzw. 14/21/28/42).
3. Automatische Ergebnisprüfung aus Messdaten statt Selbst-Checkbox, wo Daten vorliegen.
4. Bereichswert-Darstellung mit Begründung je Bereich (Rechenkern vorhanden, Anzeige fehlt).
5. Konkrete „empfohlen weil…“-Kette Score→Kapitel wiederherstellen.
6. Expliziter „Alltagstest“-Meilenstein im 12-Wochen-System (Bausteine — Minimum Day, Stabilize Habits — existieren verstreut).

---

## 4. Optimierungsbereiche & Bereichswert — ersetzen oder verdoppeln?

**„Optimierungsbereich“ = Konsolidierung, kein Duplikat — mit Einschränkung.** Heute konkurrieren vier Vokabulare (Bereich/Modul/Domain/System, dazu „pillar“ in CSS). „Bereich“ ist bereits das etablierte, deutsche, nutzersichtbare Wort („Dein stärkster Bereich“). Empfehlung: die 12 Score-Domains werden die kanonischen Bereiche; „Optimierungsbereich“ als formale Langform (Überschriften, Erklärtexte), „Bereich“ als Kurzform im Alltag. Die Bottleneck-Domänen der Intelligence (8 Stück: execution, recovery, nutrition, training, body, metabolic, medical, knowledge) werden auf dieselbe Taxonomie gemappt — eine Bereichsliste, zwei Datenquellen (Score-Antworten + Live-Verhalten). Kriterien für die Bewertung existieren bereits je Bereich (Score-Fragen, `moduleTexts`, `bottleneckCopy`, `gap.why`, Twin-Trend/Confidence).

**„Bereichswert (1–10)“ = Verdopplungsrisiko — nicht als zweite Skala einführen.** Die 0–100-Skala steckt überall: UI („52/100“), `score_results.score_total`, Telemetrie-CHECK-Constraints (client-, edge- und DB-seitig dreifach dupliziert), Marketing, Kalibrierungs-Freeze (SCORE_V2_CALIBRATION.md). Eine parallele 1–10-Welt erzeugt zwei konkurrierende Bewertungswahrheiten. **Empfehlung: Bereichswert als reine Darstellungsschicht** — Engine und Persistenz bleiben 0–100, die Anzeige je Bereich wird „Bereichswert 5 von 10“ (= Domain-Score/10, gerundet auf ganze bzw. halbe Werte) mit der bereits vorhandenen Begründung. Der Gesamtscore /100 bleibt als Marken-Asset erhalten. Das erfüllt die Soll-Skala 1–10 samt Begründungspflicht ohne Kalibrierungs-, Telemetrie- oder Migrations-Risiko. (Falls stattdessen eine harte 1–10-Umstellung gewünscht ist: Freeze-Prozess offiziell aufheben, Telemetrie-Migration einplanen — deutlich teurer, kein erkennbarer Nutzergewinn.)

---

## 5. Optimierungspunkte, Fokusphase, Status, Ergebnisprüfung

**„Optimierungspunkt“ = echte Lücke, sinnvoll — aber nicht als Ersatz für „Engpass“.** „Engpass“ ist der stärkste, konsistent deutsche Diagnose-Begriff des Produkts (Seitentitel des Score, USP, Marketing). Empfehlung: **Engpass bleibt der Diagnose-Moment** („dein größter Engpass liegt im Bereich Schlaf“), der **Optimierungspunkt ist das Arbeitsobjekt**, das daraus entsteht und einen Status trägt. Damit verschwinden die Konkurrenten „Limiter“ (sichtbar, englisch) und „Bottleneck“ (nur intern ok); Datenlücken werden Optimierungspunkte vom Typ „Weitere Abklärung erforderlich“. Datenmodell: der bestehende Ledger-Eintrag (`intel_decisions`: domain, title, old/new/applied_state, reason, evidence, confidence, review_date, status, outcome) wird um die Soll-Felder ergänzt (observed_deviation, success_metric, insights, personal_standard) — kein Neubau.

**Statusliste: als internes Mapping einführen, sichtbar verdichtet.** Die 12 Soll-Status existieren nirgends, aber fast alle sind in vorhandenen Zuständen angelegt. Mapping (Ist → Soll):

| Ist (verstreut) | Soll-Status |
|---|---|
| Score-Engpass/Datenlücke erzeugt | Erkannt / Wird geprüft |
| Auswahl im Onboarding, `type: watch` | Priorisiert |
| Proposal bestätigt (`applied_state`) | Maßnahme festgelegt / In Umsetzung |
| `review_date` fällig, „Recheck fällig“, `dueForReview` | Ergebnisprüfung fällig |
| Outcome `kept` / „HAT GEHOLFEN“ / „LIKELY HELPED“ | Wirksam |
| Outcome `adjusted` / „ADJUST — eine Variable“ | Teilweise wirksam |
| Outcome `reverted` / „KEIN MESSBARER EFFEKT“ | Nicht wirksam |
| Dismiss-Cooldown, Pause-Mechanik (`c2_pause`) | Pausiert |
| „CHECK FIRST / ZUERST ABKLÄREN“, Red-Flag-Gates, Coach-Eskalation | Weitere Abklärung erforderlich |
| `superseded` / `reviewed` / Archiv | Abgeschlossen |

Sichtbar sollten nicht alle 12 Status gleichberechtigt erscheinen — die UI arbeitet mit den vorhandenen Verdict-Farbfamilien (Status-Tokens existieren in css/style.css) und zeigt den vollen Lebenszyklus nur in der Punkt-Detailansicht.

**„Fokusphase“ = Konsolidierung von vier Mechaniken — der wichtigste Vereinheitlichungsschritt.** Heute laufen parallel: der 28-Tage-Auftrag (`focus.js`, frei, genau einer), Experimente (14/21/28/42 Tage, Premium, mehrere), Weekly Review (7 Tage) und Decision-Review-Fristen (7/14/21 Tage). Empfehlung: **ein sichtbarer Begriff „Fokusphase“ mit zwei Ausbaustufen desselben Konzepts** — frei: `focus.js` (eine Fokusphase, 7/14/28 Tage wählbar; heute hart 28 in `check-data.js:1708/1722`, `focus.js` liest die Dauer bereits generisch — kleiner Eingriff), Premium: `experiments.js` (Baseline-Snapshot, Deltas, mehrere Punkte, Dauern auf 7/14/28 gerastert). Das 12-Wochen-Programm bleibt als Container bestehen (Programm ≠ Fokusphase); Weekly Review und Decision-Reviews sind keine Fokusphasen, sondern **Ergebnisprüfungen**.

**„Ergebnisprüfung“ = klare Verbesserung, keine Verdopplung.** Der Begriff hat heute 0 Treffer und ersetzt vier Anglizismen für dasselbe Konzept (Weekly Review/Pulse, Recheck, Check-in, Reassessment). Getrennte Prüfung von Umsetzung und Wirkung existiert bereits wörtlich (Auftrags-Bilanz: „durchgezogen × Score-Delta“; `adjudicate()` unterscheidet „EXECUTION FIRST“ von „ADJUST“). Auch die W0/W4/W8/W12-Rechecks und die Labs-Recheck-Fenster laufen unter diesem Begriff zusammen.

**„Persönlicher Standard“ = sinnvoll, löst zusätzlich eine Namenskollision.** MY PROTOCOL (Sektionen, „Meine Regeln“, Fingerprint-Versionierung) passt 1:1 — und die Umbenennung entschärft die Dreifach-Belegung von „Protokoll“ (Produkt DAS PROTOKOLL / Ansicht MY PROTOCOL / Seite mein-protokoll.html). **„Erkenntnisse“** ersetzt „Was MaleMetrix gelernt hat“ — geringes Risiko, geringer Aufwand, niedrige Priorität (Labels dort sind schon deutsch).

---

## 6. Seitenanalyse (verdichtet auf die relevanten Änderungen)

**Priorität hoch:**
- `js/os/app.js` (+ mein-protokoll.html): höchste Dichte Soll-widriger Labels (Bottom-Nav Today/Plan/Track/Progress/Learn, NEXT BEST ACTION, KEEP/CHANGE/WATCH/CHECK FIRST, WEEKLY INTELLIGENCE REVIEW, „Limiter“, „validiert“ in Z. 564). Änderung: zentrale Label-Maps (DEC_LABEL, VERDICT, PHASE, NAV, VIEW_LABEL — existieren bereits als Objekte) auf die neue Begriffswelt mappen; #experiments→Fokusphase, #review→Ergebnisprüfung, #protocol→Persönlicher Standard, #learned→Erkenntnisse.
- `check.html`/`js/check.js`/`check-data.js`: Doppelanzeige 12 Domains + 7 Legacy-Säulen konsolidieren; Bereichswert-Darstellung 1–10 mit Begründung; „DEINE EINE AUFGABE“ → Fokusphase mit 7/14/28; „DEIN NÄCHSTER SCORE“ → Ergebnisprüfung; englische Level-/Modus-Labels eindeutschen.
- `js/course.js` (+ kurs-programm.html, program-view.js): T_DICT zentralisiert die gesamte Chrome-Terminologie — Weekly Pulse/Recheck/Halfway Review/Final Report → Ergebnisprüfungs-Sprache, Meilensteinleiste (Start-Ausgangslage → Fokus festgelegt → erste Ergebnisprüfung W4 → System stabilisieren W8 → Alltagstest ~W11 → Abschluss W12) über die vorhandene Phase-Rail legen; beide Konfig-Dateien synchron ändern (Paritätstest).
- `js/checkout.js`: „Verifikations-Server / verifizierter Betrag / serverseitig verifiziert“ (Z. 619/625/667) ersetzen; englische Erfolgs-Stempel („ACCESS GRANTED · 12-WEEK SYSTEM“) eindeutschen.
- `index.html`: 7-vs-12-Widerspruch auflösen; Bereichs-/Fokusphasen-Sprache einführen; Ingenieurs-Sektion als Positionierungs-Anker ausbauen.
- `tracker.html`/`js/tracker.js`: Fokus-Karte → Fokusphase (Dauer + Status), Bereichswert-Kopf aus vorhandenen Zeitreihen, automatische Erfüllungs-Vorschläge aus Messdaten.
- trust.html: „Verifizierte Leitlinien“ ersetzen; Kreislauf-Stufen 5/6 in „Ergebnisprüfung“/„Erkenntnisse“ benennen; Seite prominent verlinken (heute nur im index-Footer).

**Priorität mittel:** report.html (Hauptteil hängt an 7 Legacy-Säulen und Archetyp — auf Bereiche/Punkte/Fokusphase heben), labor.html (Recheck→Ergebnisprüfung, Monitoring eindeutschen), coaching.html/termin.html (Doppelstruktur „Erstgespräch“/„Analysegespräch“ vereinheitlichen; 12-Wochen-Anker um Fokusphasen ergänzen), ebooks.html (zwei veraltete Alt-Kacheln entfernen; Empfehlungsblock auf Bereichs-Keys), faq.html (validiert, JSON-LD synchron), Blog-Header (altes Logo-Markup), shop.html (Attrappe bereinigen, „validiert“).

**Priorität niedrig:** kontakt.html, circle.html (inaktiv), lp/-Seiten (13 identische Templates, zwei Textbausteine synchron), Kapitel-Vorschauseiten (später um Soll-Blöcke je Bereich erweitern), css (Status-Tokens wiederverwenden, nichts umbauen).

**Übergreifende Release-Randbedingung (PWA):** `sw.js` cached 40+ Dateien hart (CORE-Liste) unter VERSION mm-v153 mit stillem 404-Catch; `manifest.webmanifest` trägt Soll-widrige sichtbare Texte („Personal Performance OS“, Shortcuts Today/Workout/Track) und koppelt hart an mein-protokoll.html#today. Jedes Terminologie-Deploy braucht VERSION-Bump; Datei-Umbenennungen sind wegen fünf Kopplungsstellen (CORE, Nav-Fallback, notificationclick, APP_PAGES in main.js, manifest) zu vermeiden — URLs bleiben, nur Inhalte ändern.

**iOS-App (`ios/`, 949 Zeilen SwiftUI):** nie kompilierter, vollständig getrennter Prototyp ohne Backend-Verbindung; eigener „Readiness-Score“ konkurriert begrifflich. Empfehlung: explizit aus dem Zielbild ausklammern (Verbotsliste dort bereits erfüllt: 0 Treffer); Soll-Begriffe erst bei Wiederaufnahme.

---

## 7. Datenmodell

**Keine neuen Tabellen nötig.** Das Backend (19 Tabellen, 11 idempotente Migrationen, durchgängiges RLS) trägt die Soll-Entitäten bereits:

- **Optimierungspunkt:** Erweiterung des bestehenden Ledger-Objekts in `intel_decisions` (JSON, kein Schemazwang) um observed_deviation, baseline_data, target_state, possible_causes, selected_measure, success_metric, implementation_result, effect_result, insights, personal_standard + 12er-Statusmaschine mit Migration der Alt-Status. Legacy-Store `os_decisions` wird dabei endgültig abgelöst.
- **Optimierungsbereich:** Bereichswerte werden aus vorhandenen Signalen berechnet (Score-Domains + `bottleneck2` + Twin) und bei Bedarf als neue `os_state`-Domain (z. B. `optareas` → `opt_areas`) registriert — `registerStateDomain` genügt, keine Migration; Historie kann zusätzlich abwärtskompatibel ins `result`-jsonb von `score_results` geschrieben werden.
- **Fokusphase:** `intel_experiments` (Premium) und `mm_focus` (frei) bleiben die Speicher; nur Dauern-Raster und Verdict-Texte ändern sich.
- **Stack als Maßnahmen:** Der SUPPS-Katalog trägt schon Zweck/Nutzen/Aufwand/Kosten/Risiken; es fehlen je Item Testzeitraum, Erfolgskriterium, Prüftermin, Status — Erweiterung des `os_stack`-Objekts, Recheck-Fenster-Engine der Labs (`RECHECK_WEEKS`, `rechecksDue`) pro Maßnahme instanziieren.

**Vorher zu fixen (unabhängig von Begriffen):** `send-brief`-Spalten-Mismatch (`revoked`/`privacy_mode` — kleine Migration ODER Code-Anpassung), `mm-admin`-CORS/config.toml, Append-Semantik von `registerStateDomain` (implementieren oder bewusst dokumentiert bei Last-write-wins bleiben). **Messdaten-Entscheidung nötig:** Bereichswerte und automatische Ergebnisprüfungen brauchen EINE definierte Datenquelle je Metrik — Vorschlag: für freie Nutzer `trk_*`/`mm_diary_*` (dazu dinner.js auf MM.store umstellen und `trk_*` im Sync-Inventar klassifizieren), für eingeloggte OS-Nutzer die kanonischen `os_*`-Logs; keine Vermischung ohne explizite Brücke. **Nicht anfassen:** Telemetrie-Enums (`primary_bottleneck_id`, dreifach dupliert client/edge/DB), Entitlement-Keys (`twelve_week` — Grandfathering), `c2_*`-Datenkeys (nur Labels ändern).

---

## 8. Umsetzungsplan (Vorschlag für Phase C, in Paketen)

| Paket | Inhalt | Betroffene Dateien (Kern) | Risiko | Tests/Abnahme |
|---|---|---|---|---|
| **0 — Wahrheit & Bugs** | send-brief-Spalten, mm-admin-CORS/config.toml, Doku-Preise (COMMERCE/BUSINESS-MODEL/PROTOCOL_*/README), 7-vs-12 auf index, Footer-trust-Link | supabase/functions, 6 MD-Dateien, index.html | sehr gering | edge-functions-Suite; Sichtprüfung |
| **1 — Begriffs-Kanon** | Kanonisches Wörterbuch (i18n-DICT + Label-Maps DEC_LABEL/VERDICT/verdictMap/PHASE/NAV/T_DICT); die 8 sichtbaren „verifiziert/validiert“-Stellen ersetzen; manifest-Texte | js/os/app.js, course.js, review/experiments/proof.js, checkout.js, trust/ueber/faq/shop.html, i18n.js, manifest | gering (nur Strings) | alle 24 Suiten grün; sw.js-Bump; 390/1440-px-Pass |
| **2 — Fokusphase** | focus.js-Dauer 7/14/28 parametrisieren; experiments-Dauern rastern + Verdicts deutsch; ein sichtbarer Begriff über beide; Ergebnisprüfungs-Benennung über Review/Recheck/Pulse | focus.js, check-data.js, check.js, tracker.js, experiments.js, review.js, labs-app.js, course.js | mittel (focus.test.js-Leitplanken beachten) | focus.test.js erweitert; Kette Score→Start→Abhaken→Bilanz im Browser |
| **3 — Optimierungspunkt-Status** | Ledger-Felder + 12er-Statusmaschine + Alt-Status-Migration; os_decisions-Ablösung; Punkte-Detailansicht | memory.js, execution.js, app.js | mittel | intelligence-/program-engine-Suiten + neue Statusübergangs-Tests |
| **4 — Bereichswerte** | 1–10-Darstellung + Begründung je Bereich; Score-Ergebnisseite konsolidieren (12 statt 7+12); Report nachziehen | check.js, check-data.js (nur Anzeige), report.js, app.js | mittel (Kalibrierungs-Freeze: nur Darstellung, keine Gewichte) | score-engine-Suite unverändert grün = Beweis „Engine unangetastet“ |
| **5 — Brücken** | deepLinks wieder auf konkrete Kapitel/Bereiche; Tracker-Messdaten → automatische Fokus-Erfüllung; Stack-Maßnahmenfelder + Prüftermine; Alltagstest-Meilenstein | check-data.js, tracker.js, dinner.js, engines.js, labs.js, course.js | mittel | neue Integrationstests; Browser-QA |

Durchgängige Regeln: jede ausgelieferte Änderung ⇒ `sw.js`-VERSION-Bump; keine Datei-Umbenennungen; keine Änderungen an Datenkeys, Telemetrie-Enums, Entitlements, Vault-/Payment-Logik; bestehende Nutzerzustände (localStorage) werden nur per `migrate()`-Muster angefasst.

**Owner-Schritte außerhalb des Repos:** Der bezahlte Inhalt (protoVault 676 KB, courseVault 65 KB, ~750 KB Klartext) ist AES-verschlüsselt, Klartext-Master liegt in `_src/` außerhalb des Repos — Terminologie dort ist aus dem Repo weder prüfbar noch änderbar. Für Phase B/C ist ein Prozessschritt einzuplanen: Owner liefert `_src/` + Zugangscode → Terminologie-Scan/Umbenennung → Re-Encrypt via `tools-dev/rotate-vault.mjs`.

---

## 9. Terminologieprüfung (konsolidiert)

**Verbotene QM-/Agile-Begriffe:** 0 echte Klartext-Treffer im gesamten Repo (PQM, Bewertungsindex, BI, FMEA, Ishikawa, 5-Why, 8D, KVP, Pareto, Scrum, Sprint, Backlog, Requalifikation, Change Management). Scheinbare Treffer (PQM/FMEA/KVP/8D) sind Base64-Zufallssequenzen in den verschlüsselten Vault-Payloads (mein-protokoll.html:72, kurs-programm.html:113, ebooks/protokoll.html:44) — ein künftiges Verbots-Linting muss diese Zeilen ausnehmen. **Vorbehalt:** Der entschlüsselte Kauf-Inhalt bleibt ungeprüft (siehe Owner-Schritt oben).

**Nutzersichtbare Treffer der Wortfamilie verifiziert/validiert (8 Stellen, alle in Paket 1 ersetzbar):**

| Stelle | Text | Ersatzvorschlag |
|---|---|---|
| trust.html:111 | „Verifizierte Leitlinien“ | „Belegte Leitlinien“ |
| ueber.html:132 | „kein medizinisch validiertes Diagnoseinstrument“ | „kein medizinisches Diagnoseinstrument“ |
| faq.html:114 / shop.html:90 | „ärztlich validiert(er) Ergebnisbericht“ | „ärztlich geprüft/befundet“ |
| js/checkout.js:619/625/667 | „Verifikations-Server“ / „verifizierter Betrag“ / „serverseitig verifiziert“ | „Zahlungsprüfung“ / „geprüfter Betrag“ / „serverseitig bestätigt“ |
| js/os/app.js:564 | „KI-Synthese aktiv (server-seitig, validiert)“ | „…serverseitig geprüft“ |

Nur intern (keine Eile): `qualityGate`-Objektkey (content-engine.js:41), „Root Cause“ (2 Backend-Kommentare), „Quality Gate“ (2 MD-Reports), zahlreiche „verifiziert/Validierung“-Code-Kommentare, Dev-„Phase N“-Kommentare (~196 Treffer — kollidieren beim Greppen mit „Fokusphase“, bei Gelegenheit zu „P<N>“ verdichten).

**Konkurrierende Begriffsfamilien (der eigentliche Handlungsbedarf):** Bereich/Modul/Domain/System/pillar · Engpass/Limiter/Bottleneck/Hebel/Priorität · Auftrag/Aufgabe/Experiment/Aktion/Empfehlung/Entscheidung · Weekly Review/Review/Recheck/Check-in/Pulse/Reassessment · Phase/Woche/Zyklus/Block. Die Soll-Begriffe „Ergebnisprüfung“ und „Persönlicher Standard“ haben heute 0 Treffer. Pikant: `focus.test.js:97` verbietet „Zyklus“ in Fokus-Texten (Nähe zur Steroid-Sprache), während das OS-UI „Zyklus abschließen / Zyklus-Historie“ prominent rendert — ein weiterer Grund, „Zyklus“ sichtbar abzulösen. Dazu die englische Alt-Schicht: OS-Nav, MODE/PHASE/MISSIONS, Experiment-Verdicts, „Measurement Layer“, „ACCESS GRANTED / 12-WEEK SYSTEM“ im Checkout, manifest.webmanifest.

---

## 10. Stopp

Phase A ist hiermit abgeschlossen — **ohne Codeänderungen**. Vor der Freigabe von Phase B sind vier Entscheidungen des Inhabers nötig:

1. **Skala:** Bereichswert 1–10 als Darstellungsschicht über 0–100 (Empfehlung) oder harte Umstellung?
2. **Engpass:** als Diagnose-Begriff behalten + „Optimierungspunkt“ als Arbeitsobjekt (Empfehlung) oder vollständig ersetzen?
3. **Messdaten-Quelle:** trk_*/diary für freie Nutzer, os_* für OS-Nutzer (Empfehlung) — bestätigen.
4. **Vault-Prozess:** Bereitstellung von `_src/` + Zugangscode für Terminologie-Prüfung/Umbenennung des bezahlten Inhalts — ja/nein/wann.

Warte auf ausdrückliche Freigabe.
