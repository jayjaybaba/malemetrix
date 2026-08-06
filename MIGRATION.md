# MIGRATION — Bestandsnutzer in die Generation 2 (nicht-destruktiv)

Code: `js/simple/migration.js`, Verdrahtung in `js/simple/app.js` (Setup +
Profil). Tests: `tools-dev/tests/simple-migration.test.js` (26 Assertions).

## Grundsatz

Die Migration **verändert keine einzige Legacy-Zeile**. `migration.js`
enthält keinerlei Lösch- oder Schreiboperation auf v1-Keys (per Test
byte-identisch nachgewiesen). „Migrieren" heißt: sichern, vorbefüllen,
neuen Plan in NEUEN Keys anlegen.

## Ablauf je Nutzer (§27.2)

1. **Erkennen** (`detect()`): c2_-Programm (inkl. Programmtag), Training,
   Ernährung, Reviews, Fortschritt, Präferenzen, Score, Transformation.
2. **Validieren**: Wertebereiche (Alter 18–90, Tage 2–6, …).
3. **Snapshot** (`captureSnapshot()`): alle Bereiche + djb2-Checksummen je
   Quelle + Warnungen → `mm_legacy_snapshot`, kontogesynct über die
   os_state-Domain `legacy_snapshot`. **Idempotent**: ein zweiter Lauf
   überschreibt nichts. Bilddaten (Gerätefotos) werden bewusst nicht
   kopiert (§27.3) — sie bleiben geräte-lokal, wo sie sind.
4. **Vorbefüllung** (`prefillFromLegacy()`): nur zuverlässige Daten
   (os_profile: Alter, Erfahrung, Ort, Zeitbudget, Mahlzeiten, Kochzeit;
   5–6 Wunschtage werden auf das Gen-2-Maximum 4 gekappt). Unsicheres —
   z. B. konkrete Wochentage — wird als offene Frage gemeldet und einmalig
   gefragt, **nie still ersetzt** (§27.4).
5. **Neuer Plan** entsteht über den normalen Einrichtungs-Ablauf
   (Vorschau → Aktivierung nur mit Entitlement — Käufer zahlen nie erneut).
6./7. **Status** (`mm_simple_migration`, gesynct): status, sourceVersion,
   migrationVersion, snapshotId, planId, planVersion, Zeitpunkt, Warnungen.

Laufendes Programm (z. B. Woche 6): Warnung im Snapshot + sichtbarer
Hinweis — die alte Historie bleibt in der klassischen Ansicht vollständig
nutzbar, der neue Plan zählt ab seinem eigenen Start.

## Rücknahme (§27.5)

`revert(reason)` — über Profil („Migration zurücksetzen") oder durch einen
Administrator (Konsole/Support):
- Gen-2-Plan → `paused` (nicht gelöscht),
- Nutzer-Flag `simpleAppDefault=false` (klassische Ansicht wieder Standard,
  synct über das Konto),
- Status → `reverted` mit Begründung,
- Snapshot und sämtliche Historie bleiben erhalten.
Da Originale nie verändert wurden, ist die Rücknahme verlustfrei; ein
erneuter Wechsel zur neuen App ist jederzeit möglich.

## Getestete Szenarien (§33)

Neuer Nutzer · Bestandsnutzer ohne Programm · mit aktivem Programm ·
Nutzer in Woche 6 · pausiertes Programm · teilweise fehlende Daten ·
reine LocalStorage-Daten · Migration zweimal gestartet (idempotent) ·
Migration zurückgesetzt · Käufer (Entitlement-Weg unverändert, kein
erneuter Kauf) · Legacy-Fallback.
