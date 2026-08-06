# ROLLBACK — Rückholbarkeit der Generation 2 (ohne Codeänderung)

Stand: Phase 1, 06.08.2026. Flag-System: `js/flags.js` (`MM.flags`).

## Flag-Ebenen (spätere gewinnt)

1. **Defaults** in `js/flags.js` — Auslieferungszustand
2. **Deploy**: `MM_CONFIG.featureFlags` in `js/config.js` — globaler Schalter
3. **Konto**: `MM.flags.setUser(name, wert)` → `mm_flags_user`, gesynct über
   `os_state`-Domain `flags_user` — Rollback **pro Nutzer**, folgt dem Konto
   auf alle Geräte
4. **Gerät**: `MM.flags.setLocal(name, wert)` → `mm_flags_local` — Tester/Support

## Flags

| Flag | Default | Wirkung |
|---|---|---|
| `simpleAppEnabled` | true | vereinfachte App erreichbar |
| `simpleAppDefault` | **false** | Einstieg „My MaleMetrix" führt in die vereinfachte App (Rollout-Schalter) |
| `legacyAppEnabled` | true | OS-v1-App (mein-protokoll.html) erreichbar |
| `legacyAppAdminOnly` | false | Legacy nur noch für Owner/Testkonten verlinken |
| `newPlanEngineEnabled` | true | deterministische Gen-2-Plan-Engine aktiv |
| `legacyPlanFallbackEnabled` | true | lesender Fallback auf v1-Programmdaten |

## Rollback-Szenarien

**Global auf Legacy zurück (kein Deployment nötig, wenn config deployt ist):**
`js/config.js` → `featureFlags: { simpleAppDefault: false }` — bzw. war die
Umstellung schon global aktiv: `{ simpleAppDefault: false, simpleAppEnabled: false }`.
Ein `git revert` des Config-Commits + Push auf `main` ist der komplette
Rollback-Deploy (statische Site, keine DB-Änderung nötig — alle
Gen-2-Datenänderungen sind additiv; die v1-App liest die neuen Keys nicht).

**Einzelnen Nutzer zurückschalten:**
Im Profil der neuen App („Zur klassischen Ansicht wechseln") oder Konsole:
`MM.flags.setUser("simpleAppDefault", false)` — synct über das Konto.
Zurück zur neuen App: `MM.flags.setUser("simpleAppDefault", true)`.
Die Migrations-Rücknahme pro Nutzer (Plan deaktivieren, Snapshot behalten)
ist in `MIGRATION.md` (Phase 7) beschrieben — die v1-Originaldaten werden
bei der Migration nie verändert, ein Zurückschalten verliert daher nichts.

**Neue Plan-Engine deaktivieren:** `newPlanEngineEnabled: false` — die App
zeigt dann keinen Gen-2-Plan-Neuaufbau an; bestehende Planstände bleiben
gespeichert. Mit `legacyPlanFallbackEnabled: true` zeigt „Mein Plan" lesend
die v1-Programmdaten.

**Neue Navigation deaktivieren:** identisch zu `simpleAppDefault: false` —
die 4-Tab-Navigation existiert nur innerhalb der vereinfachten App-Seite.

## Sicherheitsmodell

Flags steuern nur Oberflächen-Führung. Zugriffsschutz (bezahlte Inhalte,
Admin-Funktionen, fremde Daten) bleibt ausschließlich server-autoritativ:
Entitlements werden nur per Service-Role geschrieben, RLS trennt Nutzer,
mm-admin verlangt die Owner-Rolle. Ein manipuliertes Client-Flag ändert die
Ansicht, öffnet aber keine Daten (verifiziert durch die bestehenden
Security-Suiten, u. a. `tools-dev/tests/security-guards.test.js`).

## Getestet

- `tools-dev/tests/simple-flags.test.js` — Ebenen-Präzedenz, Unbekannt-Schutz,
  Konto- vs. Geräte-Ebene (Phase 8/9-Suite).
- Restore der v1-Generation: `LEGACY_RESTORE.md` §9 (Weg A Flags, Weg B Code).
