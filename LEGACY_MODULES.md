# LEGACY_MODULES — Inventar & Klassifizierung der Produktgeneration OS v1

Stand: 06.08.2026, eingefroren als `malemetrix-os-v1-final` /
`archive/malemetrix-os-v1`. Klassifizierung für die Vereinfachung zur
Generation 2 („einfacher 12-Wochen-Begleiter"):

- **A** – zentral sichtbar weiterverwenden
- **B** – in vereinfachter Form umbauen
- **C** – nur noch intern (Hintergrund) weiterverwenden
- **D** – aus Hauptnavigation entfernen, technisch erhalten
- **E** – tatsächlich veraltet (nur eindeutige Duplikate; nichts wird gelöscht)

**Nichts aus diesem Inventar wird physisch gelöscht.** Reaktivierung: Route
wieder verlinken bzw. Flag setzen (siehe Spalte „Reaktivierung" und
`ROLLBACK.md`).

## Haupt-App (`mein-protokoll.html` = OS-Shell, Routen `#…` in `js/os/app.js`)

| Modul | Klasse | Dateien (Kern) | Daten (Owner-Keys) | Route(n) v1 | Reaktivierung |
|---|---|---|---|---|---|
| Today / Execution | **A** (radikal vereinfacht) | `js/os/execution.js`, `js/os/app.js` (vToday) | `c2_daily`, `os_daylog`, `os_overlays` | `#today` | bleibt; v1-Ansicht über Legacy-Route |
| 12-Wochen-Programm (Kern) | **A** (eingefrorene Logik) | `js/course.js` (FROZEN), `js/program-framework.js` | `c2_*` (via MM.store, gesynct in `program_cycles`) | `#plan`, kurs-programm.html | unverändert weiterverwendet |
| Score / Check | **A** (nur noch als Planinput) | `js/check.js`, `js/check-data.js` | `check_result` (+ `score_results` cloud) | check.html | unverändert; Ergebnis-Screen vereinfacht |
| Transformation | **A** (echter Planstart) | `js/transformation.js`, Edge `mm-transform` | transformation-Keys, `koerper_leads` | transformation.html | unverändert |
| Trainings-Engine | **A** (intern) | `js/os/engines.js` (EXDB, Progression), `js/tracker.js` | `os_training_plan`, Tracker-Logs | `#workout`, `#track`, tracker.html | Engine wird von Gen-2-Plan weiterbenutzt |
| Ernährungs-Engine | **B** | `js/os/engines.js`, `js/food-db.js`, `js/dinner.js` | `os_nutrition_plan`, `os_nutrition_log` | `#plan` (Nutrition) | Gen 2 baut Bausteinsystem darauf |
| Fortschritt / Progress | **B** | `js/os/app.js` (vProgress), `js/os/os-core.js` (metrics, photos) | `os_metrics`, `os_baseline`, IndexedDB-Fotos | `#progress` | vereinfachte Ansicht in Gen 2 |
| Plan / Program View | **B** | `js/os/program-view.js` | program state | `#plan`, `#week` | Wochenansicht fließt in „Mein Plan" |
| Track | **B → D** (kein Haupttab mehr) | `js/tracker.js`, `js/os/app.js` (vTrack) | Tracker-Store | `#track`, tracker.html | Route bleibt erreichbar, Verlinkung über Profil |
| Wochenreview / Weekly Pulse | **A** (als „Wochencheck" regelbasiert) | `js/os/intelligence/review.js` | Review-State in `os_state` | `#review` | Kernlogik weiterverwendet |
| Reminder Engine | **C** | `js/os/execution.js` (Reminders) | `os_reminder_prefs` | (in Today/Settings) | läuft intern hinter Gen-2-Erinnerungen |
| Context Overlays | **C** | `js/os/execution.js` | `os_overlays` | („Mein Tag hat sich geändert") | intern für Kurzversion/Reise/Krankheit |
| Advisor | **C/D** | `js/os/intelligence/advisor.js` | intel-Keys | `#advisor` | Route erhalten, aus Nav entfernt |
| Intelligence-Core / Decision Engine / Bottleneck 2.0 | **C** | `js/os/intelligence/intelligence-core.js`, `decision-engine.js`, `context-builder.js` | `intel_*` | `#coach` | intern (liefert Begründungen) |
| Digital Twin | **D** | `js/os/intelligence/digital-twin.js` | intel-Keys | `#twin` | Route erhalten, aus Nav entfernt |
| Simulator / Foresight | **D** | `js/os/intelligence/simulator.js`, `foresight.js` | Prediction-Ledger | `#simulator` | Route erhalten |
| Experimente | **D** | `js/os/intelligence/experiments.js` | intel-Keys | `#experiments` | Route erhalten |
| Optimierungspunkte / Maßnahmenprüfung | **C** | `js/points.js`, intelligence | `mm_opt_points` | (in Coach/Today) | intern |
| Memory / Timeline | **D** | `js/os/intelligence/memory.js`, Timeline in intelligence | `intel_decisions`, `intel_timeline` | `#memory`, `#timeline` | Routen erhalten |
| Performance Map | **D** | `js/os/activation.js` (Map-View) | abgeleitet | `#map` | Route erhalten |
| Stack Builder | **D** | `js/os/engines.js` (Stack), app vStack | `os_stack_plan` | (unter `#plan`) | Route erhalten |
| Protocol Builder / Protokoll-Ansicht | **D** | `js/os/intelligence/protocol.js`, mein-protokoll.html | intel-Keys | `#protocol` | Route erhalten |
| Learn / Knowledge | **D** (Inhalte bleiben erreichbar) | `js/os/intelligence/knowledge.js`, `content-engine.js` | statisch | `#learn`, blog/, ebooks/ | über „Wissen"-Sekundärnavigation |
| Grants / Usage (Owner-Admin) | **D** | app vGrants/vUsage, Edge `mm-admin`, `mm-usage` | `access_grants`, `site_events` | `#grants`, `#usage` | Owner-only, Route erhalten |
| Baseline / Pathway | **C** | `js/os/os-core.js`, app | `os_baseline`, `os_profile` | `#baseline`, `#pathway` | Daten fließen in Planfragen ein |
| Alltagstest / Abschluss | **C** | course/alltagstest-Logik | `os_cycle.everyday` | (in `#plan`) | intern, Abschlussfenster bleibt |
| Labs / Blutwerte | **D** | `js/os/labs*.js`, labor.html, blutwerte.html | `lab_*` Tabellen | labor.html | eigenständige Seite bleibt |
| Settings | **A** (wird „Profil") | app vSettings, `js/account.js` | `os_profile`, prefs | `#settings` | Basis für Profil-Tab |

## Konto, Kommerz, Infrastruktur (alle Klasse A — unverändert weiterverwenden)

| System | Dateien | Anmerkung |
|---|---|---|
| Auth / Magic Link / Sync | `js/account.js`, Supabase Auth, `os_state`-Tabelle | EINZIGE Identitäts-/Sync-Quelle, Gen 2 registriert nur neue State-Domains |
| Entitlements / Käuferzugänge | `js/account.js`, `js/os/entitlements.js`, Edge `resolve-product-access`, `mm-commerce` | Käufer von DAS PROTOKOLL (99 €) erhalten die Gen-2-Planfunktionen ohne Neukauf |
| Checkout / Preise | `js/checkout.js`, `js/config.js`, `js/shop-data.js` | keine neue Preisquelle in Gen 2 |
| Billing-Zustandsmaschine | `js/os/billing-machine.js`, Migration 0008 | deployed, kein Abo aktiv |
| Analytics / Telemetrie | `js/analytics.js`, `js/score-telemetry.js`, Edge `site-telemetry`, `score-telemetry` | Gen-2-Events kommen additiv dazu |
| PWA / Service Worker | `sw.js`, `manifest.webmanifest` | Versionsschema `mm-vNNN` weiterführen |
| i18n | `js/i18n.js`, `js/i18n-en.js`, Edge `mm-translate` | Gen-2-Keys additiv |
| Edge Functions | `supabase/functions/*` | keine wird entfernt |
| Öffentliche Seiten / SEO / Recht | index.html, blog/, ebooks/, faq…, datenschutz/agb/impressum | bleiben; nur Hauptnavigation wird reduziert |

## Klasse E — tatsächlich veraltet (markiert, NICHT gelöscht)

| Kandidat | Grund | Status |
|---|---|---|
| Legacy Vault / geteilter Zugangscode (`js/vault.js`, `js/unlock.js`) | durch Server-Entitlements ersetzt; als kompromittiert dokumentiert (SECURITY.md, ACTIVATION.md §5) | bleibt für Alt-Käufer, Retire-Pfad beim Founder |
| `js/os/production-status.js` Phase-9.5-Aussagen | durch PRODUCTION_TRUTH.md 05.08. überholt | Doku aktualisiert, Code bleibt |
| Duplizierte Score-Anzeigen (12 Zahlen im Abschluss) | Gen 2 zeigt Engpass + Konsequenz statt Zahlenfriedhof | v1-Ansicht bleibt unter Legacy-Route |

## Datenabhängigkeits-Kurzreferenz für Reaktivierungen

Alle OS-Domains syncen über `MM.account.registerStateDomain(name, storeKey)` in
die generische `os_state`-Tabelle. Ein reaktiviertes Modul findet seine Daten
daher auch nach Monaten wieder — Gen 2 löscht keine LocalStorage-Keys und
keine `os_state`-Domains. Konfliktregel: Gen 2 schreibt NIE in `c2_*`,
`intel_*`, `os_overlays` etc. außer über die bestehenden Owner-APIs
(`course.js`, `MM.exec`, `MM.os`); der neue Plan lebt in eigenen Keys/Tabellen
(`simple_*`). Dadurch kann jedes v1-Modul ohne Migration wieder aktiviert
werden, solange die Gen-2-Migrationstabellen unangetastet bleiben.
