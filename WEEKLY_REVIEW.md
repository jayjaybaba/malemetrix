# WEEKLY_REVIEW — Der Wochencheck (Generation 2)

Stand: Phase 5. Code: `js/simple/weekly-check.js` (pur), Anwendung über
`MMSimple.store.changePlan` (Versionierung). Tests:
`tools-dev/tests/simple-weekly.test.js` (25 Assertions).

## Ablauf

Einmal pro Woche (am gewählten Wochencheck-Tag) beantwortet der Nutzer nur
das Notwendige: absolvierte Trainings, grobe Ernährungstreue, Hunger,
Energie/Regeneration, Trainingsleistung, besondere Umstände (krank, Reise,
Stress, Verletzung). Gewichtsdaten kommen aus den geloggten Werten —
als **geglätteter Trend** (7-Tage-Mittel vs. Vorwoche), nie aus einem
einzelnen Messwert. Unter 2 Werten je Woche gibt es keinen Trend und
damit keine Änderung.

## Regelwerk (Priorität von oben nach unten)

| # | Regel | Bedingung | Entscheidung |
|---|---|---|---|
| 1 | `wr_sick` | krank | Erholung zuerst, NIE verschärfen |
| 2 | `wr_injury` | Verletzung | Übungen tauschen, Volumen reduziert, Arzthinweis |
| 3 | `wr_too_fast` | Verlust > ~1,1 % KG/Woche | Kalorien +150 (Muskelschutz) |
| 4 | `wr_overreach` | Leistung ↓ UND Regeneration schlecht | reduzierte Woche, keine kcal-Änderung |
| 5 | `wr_hunger` | Dauerhunger + Energie schlecht (Cut) | Defizit −100 kcal entschärfen |
| 6 | `wr_no_data` | kein Trend berechenbar | unverändert; Wiegen wird Aufgabe |
| 7 | `wr_on_track` | Trend im Zielkorridor | **unverändert — bewusst** |
| 8 | `wr_stall_adherent` | Stagnation + gute Umsetzung | Kalorien −120 (an der 1500er-Grenze: Schritte +1000, `wr_stall_steps`) |
| 9 | `wr_gain_stall` | Aufbau stagniert + gute Umsetzung | Kalorien +120 |
| 10 | `wr_stall_execution` | Stagnation + schlechte Umsetzung | unverändert — Umsetzung vor Verschärfung |
| 11 | `wr_life` | Reise/Stress, Zahlen ok | unverändert, Unterwegs-Regeln |
| 12 | `wr_watch` | leichte Abweichung ohne Muster | unverändert, beobachten |

Nicht jede Woche wird zwanghaft etwas verändert — `keep` ist der häufigste
und ein vollwertiger Ausgang. Jede Entscheidung trägt eine sichtbare
Begründung (DE/EN) mit den konkreten Zahlen.

## Sicherheitsgrenzen

- Änderungen laufen ausschließlich über `plan-model.applyChange`:
  max. 250 kcal bzw. 2000 Schritte pro Anpassung, nie unter 1500 kcal,
  nie über 1 %-Regel — Verstöße werden komplett abgelehnt.
- Krankheit/Verletzung/Regeneration/zu schneller Verlust/zu dünne Daten
  schlagen alle Optimierungsregeln.
- Vergangene Wochen werden nie rückwirkend verändert; jede Anpassung ist
  eine neue Planversion mit Regel-ID, Grund, Datum, Quelle `system` und
  `checkinId` (Historie: `mm_simple_plan_history`, Check-ins:
  `mm_simple_checkins`, beide append-only und kontogesynct).

## Future Split (Kurskarte) — Stand 06.08.2026

Code: `weekly-check.js → project(ctx)` (rein, deterministisch, kein LLM,
keine Mutation). UI: `app.js → renderFutureSplit` (Fortschritt-Tab) und die
Hebel-Karte im Wochencheck-Ergebnis. Flag: `futureSplitEnabled`
(aus = exakt der vorherige Zustand). Tests:
`tools-dev/tests/simple-future-split.test.js` (38 Assertions).

**Projektion:** `thisWeekAvg + deltaPerWeek × weeksRemaining` auf Basis des
bestehenden geglätteten Trends (`trend()`, nie Ein-Punkt). Korridorbreite
nach Datenqualität: `high` (≥6 Messpunkte) ±0,5 kg, `medium` (<6) ±0,9 kg,
`low` (kein Trend) → **keine Zahlen**, Status `insufficient_data`.
Die Breiten sind konservativ gesetzt, aber noch nicht an echten Verläufen
kalibriert — offene Flanke, sichtbar über die Datenqualitätsstufe.

**Statusreihenfolge (erste zutreffende gewinnt):** `insufficient_data` →
`loss_too_fast` (EXAKT dieselbe Schwelle wie `wr_too_fast`: >1,1 % KG/Woche,
nur Cut) → `goal_requires_extension` (nötige Restrate über der Schwelle →
Zielzeitraum verlängern statt verschärfen, `stillPlausible=false`) →
`completed` → `ahead_but_safe` → `on_course` (Korridore überlappen) →
`slightly_behind` (Abstand ≤1,5 kg) → `behind_target`.

**Richtung:** Cut = „hinter" wenn Projektion ÜBER dem Ziel; Gain exakt
invertiert. Gain-Überschießen wird neutral als „vor dem Zielkurs" gezeigt,
nie als Erfolg. Wochenabweichung = `ceil(kg / |Planrate|)`; bei Planrate
<0,05 kg/Wo bewusst `null` (keine Division, kein Infinity).

**Grenzen:** kein Recomp-Indikator (Taille/Kraft/Fotos), keine
Wahrscheinlichkeit in Prozent, keine Kursgrafik, keine Bilder — bewusst
nicht Teil dieser Scheibe. Headlines sind eine feste Tabelle (DE/EN),
ohne Wertung. `decide()` bleibt die einzige Entscheidungsinstanz;
`project()` zeigt nur an.
