# SCORE_TO_PLAN — Datenfluss: Score-Ergebnis → Planentscheidungen

Stand: Phase 2. Code: `js/simple/plan-input.js` (`SCORE_RULES`, `mapScore`),
Anwendung: `js/simple/plan-engine.js`. Tests: `tools-dev/tests/simple-input.test.js`.

## Prinzip (§7)

Der Score ist **Planinput, kein Selbstzweck**. Das Ergebnis wird nicht mehr
primär als zwölf Zahlen präsentiert, sondern als:

> „Wir haben erkannt, was deinen Fortschritt aktuell am stärksten begrenzt.
> Diese Information fließt jetzt direkt in deinen 12-Wochen-Plan ein."

Angezeigt werden: wichtigster Engpass, höchstens zwei weitere Faktoren,
konkrete Konsequenz für den Plan. Die vollständige v1-Auswertung (12 Bereiche,
Radar, Archetyp) bleibt unter der Legacy-Ansicht erhalten.

## Regelwerk: jede Score-Domäne → konkrete Plankonsequenz

| Engpass (Score-V2-Domäne) | Deterministische Effekte | Sichtbarer Satz (Kurzform) |
|---|---|---|
| `recovery` | max. 3 Trainingstage, Rate ×0,85, fester Schlafanker, frühe Deload-Woche | „Regeneration begrenzt dich → 3 Einheiten, moderate Rate, Schlafanker" |
| `strength` | Ganzkörper-Vorlage bevorzugt, strikte Progressionsregel | „Struktur fehlt → feste Einheiten, dokumentierte Progression" |
| `fuel` | Mahlzeitenbausteine + Protein-Priorität + Meal-Prep-Tag im Wochenplan | „Ernährungssystem → Bausteine, Einkaufsliste, Prep-Tag" |
| `drive` | Rate ×0,9, Schlafanker, moderates Schrittziel | „Energie → moderates Defizit, Schlaf, realistische Schritte" |
| `execution` | Einheiten ≤45 min, max. 3 Tagesaufgaben, Gewohnheit vor Umfang | „Umsetzung → bewusst kleiner Plan" |
| `body` | feste Wiege-Tage, Fotos Start/W4/W8/W12 | „Ausgangslage unscharf → Messen wird Teil des Plans" |
| `blood` | konservative Rate, Hinweis auf Blutwerte-Baseline (ohne Diagnose) | „Datenbasis fehlt → konservativ + Laborhinweis" |

Sekundärfaktoren (max. 2) wirken abgeschwächt; bei numerischen Konflikten
gewinnt der konservativste Wert.

## Medizinische Warnsignale

Red Flags aus dem Score (`result.flags`) werden zu `medicalCautions`:
Rate wird auf ≤0,85 gedeckelt, der Plan erhält den Hinweis auf ärztliche
Abklärung. Keine Diagnosen, keine Therapieempfehlungen — unverändert die
MaleMetrix-Grenze.

## Fragen ohne Plankonsequenz

Der Score V2 selbst bleibt unangetastet (kanonische Engine
`js/check-data.js`, eingefroren in OS v1). Für den **Planfragebogen** gilt:
jede Frage in `plan-input.QUESTIONS` trägt ihre Wirkung (`why`) sichtbar;
Fragen ohne Wirkung existieren dort nicht. Score-Antworten, die der Plan
bereits kennt (über `transform_goal` oder Score-Prefill), werden nie
erneut gestellt.

## Kein Gate

Ohne Score entsteht trotzdem ein Plan (Score-Kontext bleibt dann leer und
die Standard-Leitplanken gelten). Der Score verbessert den Plan — er
blockiert ihn nicht.
