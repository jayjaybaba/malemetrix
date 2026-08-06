# PRODUCT_ARCHITECTURE — MaleMetrix Generation 2 („einfacher 12-Wochen-Begleiter")

Stand: 06.08.2026. Generation 1 („MaleMetrix OS v1") ist vollständig
archiviert (`LEGACY_RESTORE.md`, Tag `malemetrix-os-v1-final`,
Branch `archive/malemetrix-os-v1`) und bleibt parallel lauffähig.

## Produktversprechen (ein Satz)

> MaleMetrix zeigt dir ein realistisches körperliches Ziel, erstellt daraus
> deinen persönlichen 12-Wochen-Plan und sagt dir jeden Tag, was du konkret
> tun musst.

Hauptablauf: Transformation → Ziel wählen → Score → wenige Planfragen →
12-Wochen-Plan → iPhone-Einrichtung → tägliche Umsetzung → Wochencheck.

## Drei Ebenen

| Ebene | Modul | Sichtbar |
|---|---|---|
| Vision | Transformation (unverändert, `js/transformation.js`) | zwei Zielbilder, eine Wahl |
| Diagnose | Score V2 (unverändert, `js/check*.js`) | Engpass + Konsequenz statt Zahlenfriedhof |
| Umsetzung | Generation-2-Plan (`js/simple/*`) | Heute · Mein Plan · Fortschritt · Profil |

## Code-Karte Generation 2

```
meinplan.html            App-Seite (4-Tab-Bottom-Nav), noindex
css/simple.css           App-Styles auf den bestehenden Design-Tokens
js/flags.js              MM.flags — 4-Ebenen-Feature-Flags (ROLLBACK.md)
js/simple/plan-model.js  Modell + LIMITS + Versionierung (pur, getestet)
js/simple/plan-input.js  Transformation→Plan, SCORE_RULES, Planfragebogen
js/simple/plan-engine.js Ziele (Mifflin), Training, Mahlzeitenbausteine,
                         Einkaufsliste, Wochenstruktur (deterministisch)
js/simple/weekly-check.js Wochencheck-Regelwerk (12 Regeln, Sicherheitsvorrang)
js/simple/ics.js         ehrlicher Kalender-Generator (identische Edge-Kopie)
js/simple/plan-store.js  EINE Wahrheit: MM.store-Keys + os_state-Sync-Domains
js/simple/migration.js   Bestandsmigration (nicht-destruktiv, rückholbar)
js/simple/iphone.js      „Auf meinem iPhone einrichten" (ehrlich beschriftet)
js/simple/app.js         App-Controller (Wizard, Heute, Plan, Fortschritt,
                         Profil, Workout-Runner, Wochencheck-UI)
supabase/functions/mm-plan-ics  Kalender-Feed (Token, service-role)
supabase/migrations/20260806000017_calendar_tokens.sql  (einzige neue Tabelle)
```

## Eine Quelle der Wahrheit (Gen 2 ↔ OS v1)

| Datum | Owner | Anmerkung |
|---|---|---|
| Auth/Profile/Entitlements/Käufe/Checkout | bestehend (`account.js`, Edge) | unverändert; Käufer erhalten Gen 2 ohne Neukauf |
| Transformationsziel | `mm_transform_goal` (transformation.js) | Gen 2 liest nur; jetzt kontogesynct |
| Score-Ergebnis | `mm_check_result` (check.js) | Gen 2 mappt auf Plan-Effekte |
| Gewicht | `mm_os_metrics` | identische Form in beiden Generationen |
| Gen-2-Plan/Historie/Checkins/Daylog/Funnel/Snapshot/Migration | `mm_simple_*`, `mm_legacy_snapshot` | NEUE Keys — Gen 2 schreibt nie in `c2_*`/`intel_*`/`os_overlays` |
| 12-Wochen-Programm v1 | `course.js` (`c2_*`) | bleibt Owner seiner Daten; Legacy-Ansicht liest weiter |
| Server-State | `os_state` (bestehende Tabelle) | Gen 2 = zusätzliche Domains, keine neue Sync-Maschine |

Konfliktstrategie Legacy ↔ Gen 2: getrennte Schreibdomänen (einzige geteilte
Schreibfläche ist die Gewichtsreihe, deren Format identisch und idempotent
je (type, date, source) ist). Die Legacy-Route ist damit parallel nutzbar,
ohne dass sich die Generationen gegenseitig Daten zerschreiben.

## Intern weiterlaufende v1-Systeme (Klasse C) und ausgeblendete Module (D)

Siehe `LEGACY_MODULES.md` — nichts wurde gelöscht; alle `#`-Routen der
OS-App bleiben unter `mein-protokoll.html?legacy=1` erreichbar.

## KI-Grenze (§11)

Der fachliche Plan ist zu 100 % regelbasiert (Engine + LIMITS + Wochencheck-
Regeln, alle getestet). Es existiert in Gen 2 kein KI-Aufruf; die
vorbereitete mm-ai-Infrastruktur darf später ausschließlich formulieren/
erklären — nie Kalorien, Volumen, Raten oder medizinische Aussagen erzeugen.

## Rollout (§32) — Stufen & Schalter

| Stufe | Zustand | Schalter |
|---|---|---|
| **1 intern (AKTUELL)** | Legacy Standard; neue App unter `/meinplan.html` für Admin/Tester | `featureFlags.simpleAppDefault=false` (deployt) |
| 2 Testkonten | Opt-in je Konto, Rückschaltung jederzeit | `MM.flags.setUser("simpleAppDefault", true)` bzw. Profil-Schalter |
| 3 neue Nutzer | Funnel-CTAs (Transformation/Score/Startseite) zeigen auf `meinplan.html`; öffentliche Navigation wird reduziert | Link-Umstellung + Nav-Vereinfachung (ein Commit) |
| 4 Bestand | neue App Standard, Legacy-Fallback pro Nutzer im Profil | `simpleAppDefault: true` |
| 5 Standard | Legacy nur noch Admin/Testkonten verlinkt | zusätzlich `legacyAppAdminOnly: true` |

Voraussetzungen für Stufe 5 (alle prüfbar): Backups verifiziert (✅ Phase 0),
Migration getestet (✅ Phase 7), Rollback getestet (✅ Tests + Profil-Schalter),
Entitlements korrekt (✅ unverändert server-autoritativ), Kernabläufe stabil
(Browser-Smokes ✅), keine kritischen Datenabweichungen (Founder-Beobachtung
Stufe 2–4). Legacy wird nie physisch gelöscht.

## Bewusst offen (Founder-Entscheidungen)

- Öffentliche Navigation der 30+ statischen Seiten wird erst in Stufe 3
  reduziert (ein gezielter Commit), solange Legacy Standard ist.
- Server-Push bleibt ehrlich „nicht aktiv", bis VAPID konfiguriert ist.
- Echte iPhone-Gerätetests (PWA-Installation, webcal-Abo, Share-Sheets)
  stehen für Stufe 1/2 auf der Founder-Checkliste (IPHONE_INTEGRATION.md).
