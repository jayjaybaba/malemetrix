# TRANSFORMATION_TO_PLAN — Datenfluss: gewähltes Ziel → 12-Wochen-Plan

Stand: Phase 2. Code: `js/transformation.js` (Owner des Ziels),
`js/simple/plan-input.js` (`mapTransformation`), `js/simple/plan-engine.js`
(Phasenrechnung), Tests: `tools-dev/tests/simple-input.test.js`.

## Quelle

Die Transformation bleibt der einzige Owner des Ziels. Bei der Zielwahl
speichert sie `mm_transform_goal`; nach den Planfragen werden Alter,
Aktivität und Ernährungsform **additiv nachgetragen** (bestehende Felder
unverändert). Der Key synct ab Generation 2 kontobezogen über die
os_state-Domain `transform_goal` — der Funnel lässt sich auf jedem Gerät
fortsetzen.

## Übernommene Felder (§6)

| Plan-Feld | Quelle in `transform_goal` |
|---|---|
| startWeightKg | `current_kg` |
| finalTargetWeightKg | `target_kg` |
| targetType (realistic/ambitious) | `kind` |
| selectedAt | `date` |
| expectedTotalWeeks | Engine: Rate × Distanz (identische Formeln wie `calcPlan` in transformation.js) |
| targetRangeMin/MaxKg | Engine: ±1 kg um das Ziel |
| heightCm, age, activity | `height_cm`, `age`, `activity` |
| direction (cut/gain) | `direction` bzw. Vorzeichen der Differenz |
| experience, trainingDaysWish, location, mode, diet | `exp`, `days`, `equip`, `mode`, `diet` — werden im Fragebogen **nie erneut gefragt**, nur bestätigt |

## Gesamtziel ≠ 12-Wochen-Ziel

Ist das Gesamtziel in 12 Wochen nicht seriös erreichbar (Rate über den
Leitplanken), rechnet die Engine zwei getrennte Ziele:

- **Gesamtziel**: z. B. „80 kg in ~26 Wochen" (`selectedTransformation`)
- **Phase-1-Ziel**: Korridor nach Woche 12, z. B. „86–88 kg"
  (`phaseGoal.week12TargetMin/MaxKg`, `isFinalPhase=false`)

Liegt das Ziel innerhalb von 12 Wochen, ist `isFinalPhase=true` und der
Korridor umschließt das Gesamtziel. MaleMetrix behauptet nie, dass jedes
Ziel in 12 Wochen erreicht wird — der 12-Wochen-Plan ist die erste
realistische Phase.

## Garantien

- Ohne gewählte Transformation entsteht **kein** Plan (nichts wird erfunden).
- Das gewählte Ziel wird übernommen, nie neu berechnet oder „korrigiert" —
  nur die Phasenaufteilung wird ergänzt.
- Raten-Leitplanken: max. 1 % Körpergewicht/Woche Abnahme, Aufbau nach
  Erfahrungsstufe (identisch zu den bestehenden Transformation-Formeln).
