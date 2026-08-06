# TRAINING_ENGINE — Deterministischer 12-Wochen-Trainingsplan

Stand: Phase 3. Code: `js/simple/plan-engine.js` (`buildTraining`, `TEMPLATES`,
`EX`, `resolveExercise`). Tests: `tools-dev/tests/simple-engine.test.js`.

## Prinzipien

- **2–4 realistische Trainingstage** (harte Modellgrenze), abgeleitet aus
  Wunsch (Transformation), Score-Kontext (z. B. Regeneration → max. 3) und
  Fragebogen.
- **Keine unnötige Vielfalt**: Übungen bleiben über die 12 Wochen konstant,
  damit Progression messbar ist. Der Nutzer soll denken können: „Heute mache
  ich Training B und versuche bei zwei Übungen eine Wiederholung mehr."
- **Bewährte Splits**: 2 Tage → Ganzkörper A/B, 3 Tage → Ganzkörper A/B/C,
  4 Tage → Ober-/Unterkörper (bei Struktur-Engpass bewusst wieder Ganzkörper).
- Reihenfolge der Slots = Stimulus-Priorität; Verbundübungen zuerst und
  immer Teil der Kurzversion.

## Jede Übung trägt

Sätze · Wiederholungsbereich · RIR 2 · Pausenzeit · Ersatzübung (gleiches
Bewegungsmuster) · Kurzversions-Markierung · Home-Variante.

`resolveExercise(exId, location, injuries)` löst deterministisch auf:
Zuhause → Home-Variante, Verletzungs-Tag (schulter/knie/ruecken/huefte/
handgelenk) → Alternative. Kein Zufall, keine KI.

## Regeln (im Plan gespeichert, DE/EN)

- **Progression**: Doppelte Progression (Wiederholungen bis Bereichs-Ende bei
  RIR 2, dann +2,5 kg OK / +5 kg UK, wieder hocharbeiten).
- **Deload**: Woche 7 (bzw. Wochen 5+10 bei Regenerations-Engpass) — gleiche
  Übungen, ein Satz weniger, ~80 % Last, mit Begründung.
- **Kurzversion** (~25–30 min): markierte Grundübungen, 2 Sätze, 90 s Pause —
  zählt voll.
- **Reise/kein Gym**: Home-Variante oder Kurzversion; nichts wird gestapelt.
- **Wiedereinstieg nach Krankheit**: 1 Woche 2 Sätze @ ~70 %, dann normal.

## Weiterverwendung von OS v1

Die Trainingshistorie und Satz-Logs bleiben im bestehenden Tracker-System
(`js/tracker.js`, Tracker-Store); die Today-Ansicht der Gen-2-App schreibt
Abschlüsse in dieselben Keys wie bisher (eine Completion, viele Leser —
Verdrahtung in Phase 4). Die v1-Engine (`js/os/engines.js`) bleibt intern
erhalten; Gen 2 ersetzt nur die sichtbare Planoberfläche.
