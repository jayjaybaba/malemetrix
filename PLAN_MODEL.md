# PLAN_MODEL — Das versionierte 12-Wochen-Planmodell (Generation 2)

Stand: Phase 1, 06.08.2026. Code: `js/simple/plan-model.js` (pur, getestet via
`tools-dev/tests/simple-plan.test.js`), Persistenz: `js/simple/plan-store.js`.

## Eine Quelle der Wahrheit

| Datum | Owner (Key) | Sync |
|---|---|---|
| aktiver Plan (Dokument) | `mm_simple_plan` | os_state-Domain `simple_plan` |
| Versionshistorie (append-only) | `mm_simple_plan_history` | `simple_plan_history` (append-merge) |
| Funnelstatus | `mm_simple_funnel` | `simple_funnel` |
| Wochencheck-Ergebnisse (append-only) | `mm_simple_checkins` | `simple_checkins` (append-merge) |
| Legacy-Snapshot (§27.3) | `mm_legacy_snapshot` | `legacy_snapshot` |
| Konto-Feature-Flags | `mm_flags_user` | `flags_user` |

**Bewusste Entscheidung — keine neue Plantabelle:** Die bestehende Tabelle
`os_state` (user_id + domain unique, `state_version`, RLS „own os_state",
Offline-Queue, Konfliktregel „Cloud überschreibt nur strikt Neueres bei lokal
Unverändertem") erfüllt „serverseitig, versioniert, kontobezogen" vollständig.
Ein neues Tabellen-/Sync-System wäre genau das verbotene Parallelsystem
(§1.2). Die Datenbank-Änderung der Generation 2 ist damit **null-destruktiv:
es gibt keine** — bis auf die iPhone-Kalender-Tokens (Phase 6, additiv).

## Dokumentstruktur

Siehe `emptyPlan()` in `js/simple/plan-model.js` — deckt die fachlichen
Bereiche aus dem Auftrag ab: `selectedTransformation` (Gesamtziel, getrennt
vom 12-Wochen-Ziel), `phaseGoal` (Woche-12-Korridor, `isFinalPhase`),
`scoreContext` (Engpass + max. 2 Faktoren + medizinische Hinweise),
`training`, `nutrition`, `dailyTargets`, `reminderPreferences`, `lifestyle`,
`legacySource`, `status: draft|active|paused|completed`.

## Harte Grenzen (LIMITS)

| Grenze | Wert | Warum |
|---|---|---|
| Kalorien | 1500–4500 kcal | kein extremes Defizit, keine Fantasiewerte |
| Kalorienschritt pro Anpassung | ≤ 250 kcal | sanfte Wochenanpassung statt Sprünge |
| Abnahmerate Phase 1 | ≤ 1 % Körpergewicht/Woche | physiologisch seriös |
| Protein | ~1,6–2,6 g/kg | evidenzbasierter Korridor |
| Trainingstage | 2–4 | Gen 2 plant realistisch, nicht maximal |
| Trainingsdauer | 20–120 min | |
| Schrittziel | 4000–20000, Schritt ≤ 2000/Woche | |
| Mahlzeiten | 2–5 | |
| Phasendauer | fest 12 Wochen | endDate = startDate + 83 Tage, validiert |

Verletzt eine Änderung eine Grenze, wird sie **komplett abgelehnt** — der
Plan bleibt unverändert (keine halben Änderungen, nichts wird still
korrigiert).

## Versionierung

- Einziger Schreibweg für versionierte Felder: `applyChange(plan, changes,
  meta)` bzw. `MMSimple.store.changePlan(...)`.
- Pflicht-Metadaten: `reason` (Begründung), `source` (`user|system|admin`);
  optional `rule` (angewendete Wochencheck-Regel) und `checkinId`.
- Jeder Eintrag speichert pro Feld `from` und `to` → `planAtVersion()`
  rekonstruiert jeden historischen Stand; vergangene Wochen werden nie
  rückwirkend verändert.
- No-Ops erzeugen keine Version; nicht-versionierte Pfade (Kosmetik wie
  `preferredTimes`) laufen nicht über die Versionierung.

## KI-Grenze

Das Modell enthält keinerlei KI-Aufrufe. Alle kritischen Werte entstehen
regelbasiert (plan-engine, Phase 3); KI darf später ausschließlich
formulieren/erklären, nie Werte erzeugen (Auftrag §11).
