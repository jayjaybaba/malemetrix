# MALEMETRIX OS — Architecture

One system. One user. One state. Many specialized engines underneath.
MaleMetrix does the integration — the user never combines tools in his head.

## Product map (one job per module)
| Module | Job |
|---|---|
| SCORE | find the bottleneck |
| PATHWAY | define ambition/context (health · performance · enhanced) — PATHWAY ≠ GOAL |
| BASELINE | capture the starting point (body, photos, lifts, sleep, stack) |
| TRANSFORMATION | reality-check the goal, build the 12-month roadmap |
| 12-WEEK | execute the current cycle (frozen core, `js/course.js`) |
| TODAY | say what matters now — ONE Next Best Action + Not-Now |
| TRAINING | drive adaptation (double progression, plateau logic) |
| NUTRITION | fuel the goal (targets, example day, family, trends) |
| STACK | support intelligently (value-based, remove low-value) |
| TRACK | measure execution (generic metrics, tracker) |
| PROGRESS | show change (Start→Now, photos, cycles, interpretation) |
| LEARN | explain why (Protokoll, Library, Enhanced Center) |

## Code
```
js/os/os-core.js   MM.os      — Graph, metrics, events, actions/Today/NBA,
                                baseline, photos (IndexedDB), context modes, ICS
js/os/engines.js   MM.engines — transformation, nutrition, training, stack,
                                progress interpretation (pure + data)
js/os/app.js                  — app shell (#today/#plan/#track/#progress/#learn
                                /#baseline/#pathway/#transform/#workout)
css/os.css                    — OS visual system (coordinate motif, components)
js/account.js      MM.account — identity, entitlements, product access, sync
js/course.js                  — 12-Week core (FROZEN business logic)
```

## Sources of truth (one owner per datum)
| Datum | Owner | Readers |
|---|---|---|
| weight/waist/bf/sleep metrics | `os_metrics` (MM.os.logMetric) | nutrition, transformation, progress, score-prefill |
| identity/pathway/goals/prefs | `os_profile` | all engines |
| program state (c2_*) | course.js via MM.store | account (read-only view), Today, ICS |
| score result | `check_result` (check.js) | prefill, dashboard, cloud history |
| baseline per cycle | `os_baseline` | progress |
| photos | IndexedDB `mm_os/photos` (device-only, never synced) | progress |
| plans (nutrition/training/stack/transformation) | `os_*` keys | Today, views |
| entitlements | cloud `entitlements` (server-granted) / vault decrypt locally | access bridge |

Score answers prefill the Graph (`prefillFromScore`) — **never re-ask** known data.

## Events (`mm:os` CustomEvent + capped local log)
SCORE_COMPLETED · PATHWAY_SELECTED · GOAL_CHANGED · BASELINE_CREATED ·
PROGRAM_STARTED · WORKOUT_COMPLETED · MEAL_LOGGED · WEIGHT_LOGGED ·
WEEKLY_REVIEW_COMPLETED · RECHECK_COMPLETED · STACK_UPDATED ·
ACTION_RESCHEDULED · CYCLE_COMPLETED

## Action model
`{id, domain, type, date, priority, status, source, deepLink, label, detail}` —
stable IDs dedupe program/training/calendar references to the SAME workout into
ONE Today action. Daily limit 3–5. NBA is rule-based and bottleneck-weighted;
completing an OS workout writes the program-day key course.js already reads
(`c2_daily.dN.p`) — integration without logic duplication or double entry.

## Sync (Phase 2.2 engine, extended)
OS domains register via `MM.account.registerStateDomain(name, storeKey)` →
versioned rows in the generic `os_state` table (migration 0003), same
dirty-queue/retry/backoff/hydration rules as program/score. Local-first;
offline never loses work. Photos intentionally NOT synced.

## Phase 6 — Execution layer (`js/os/execution.js`, MM.exec)
Turns plan + context into ONE executable day. Owns NOTHING that course.js
owns — it derives (read-only mirror of `dayTypeAt`, tested against fixtures)
and completes via the existing keys (`c2_daily.dN.p`). One completion,
many readers.

| Piece | What it does |
|---|---|
| `buildDay()` | canonical actions + chronological anchors + NBA 2.0 (1 primary, ≤2 secondary, WHY) |
| Overlays (`os_overlays`) | BASE PLAN + TODAY OVERLAY: travel/busy/no_gym/low_recovery/vacation/sick/family_day/jetlag — expiring, reversible, never rewrites history |
| `proposeDayChange()` | MY DAY CHANGED: deterministic proposals → user confirms → overlay/reschedule |
| `compressSession()` | 15/30/45-min versions from the REAL plan; slot order = stimulus priority; compounds always survive |
| `substituteSession()` | equivalence via engines.EXDB.alt (movement pattern preserved) |
| Repair (`os_reschedules`) | missed session → ranked makeup options (spacing-based); past days stay honestly missed; makeup completes on target day |
| Reminders (`os_reminder_prefs`) | ONE engine: value filter, dedup/day, quiet hours, max/day, escalation exactly once, never for completed actions; privacy FULL/DISCREET/OFF |
| Brief/Close (`os_daylog`) | Morning Brief data + Evening Close snapshot (immutable after the day); CONSISTENCY (28d) instead of streaks; comeback instead of guilt |
| Decisions (`os_decisions`) | ledger: decide → review due (Today action) → keep/revert/adjust |
| Calendar | internal events + honest ICS (training/makeup/review/measure ONLY, floating local time, DTEND); week planner + week load; two-way sync NOT faked |
| Push | local notifications while app open; server push = architecture + migration 0004, **CONFIG REQUIRED** (see PUSH.md) |

Integration with Phase 3.1/4 (merge of `0a711c2`): day types come from
`MM.programView` (execution.js keeps a parity-tested fallback mirror);
food logging delegates to `MM.os.logFood`/`os_nutrition_log` (one log);
session selection is plan-derived (n-th strength slot → template n);
overdue Weekly Pulse / Recheck / Lab-Recheck flow into NBA 2.0 as
override-priority actions; makeup completion uses
`completeProgramDay(day, {requireStrength:false})`. The old context chips
and the dayswap-based reschedule card are superseded by overlays +
"Mein Tag hat sich geändert" (past days are never re-typed).

Invariant tests: `node tools-dev/test-execution.mjs` (59 assertions —
one-completion, no history rewrites, reminder honesty, calendar honesty,
overlay expiry, snapshot immutability, ledger loop, mirror↔programView
parity, pulse-override).

## SYSTEM LAYERS (Grand Unification — Phase 5 thinks, Phase 6 executes)
```
Layer 0  ACCOUNT/DATA   account.js (auth, sync, os_state, entitlements)
Layer 1  DOMAIN TRUTH   course.js (12-week) · programView · engines ·
                        labs · metrics (os-core) · workout/nutrition logs
Layer 2  INTELLIGENCE   MM.intelligence (js/os/intelligence/*) —
                        context builder · snapshot · digital twin ·
                        freshness/confidence · memory + DECISION LEDGER
                        (intel_decisions, canonical) · decision engine 2.0 ·
                        bottleneck 2.0 · contradictions · weekly review ·
                        briefing content · advisor (deterministic core +
                        provider seam) · simulator/forecast · experiments ·
                        protocol · timeline · waiting-for-data · KEEP verdict
Layer 3  EXECUTION      MM.exec (execution.js) — buildDay/NBA feasibility ·
                        overlays · my-day-changed · compression ·
                        repair/reschedule · reminders · calendar/ICS ·
                        brief delivery · evening close · comeback ·
                        proposal apply (after user confirmation ONLY)
Layer 4  EXPERIENCE     app.js — ONE app shell, 5-tab nav + secondary
                        intelligence routes via Coach hub
```
Direction: domain state → intelligence → execution → app. Execution writes
outcomes back to domain state; intelligence learns from them. No circular
imports; every cross-layer call is lazy + guarded.

## CONCEPT → OWNER (duplicate-owner audit, §104)
| Concept | Owner | Note |
|---|---|---|
| Decision Ledger | MM.intelligence.memory (`intel_decisions`) | MM.exec = facade + one-time migration of `os_decisions` (frozen) |
| NBA | intelligence ranks · exec filters feasibility | ONE result in buildDay() |
| Today rendering | app.js vToday (single path) | data: exec + intelligence |
| Morning Brief | content: intelligence.review.morningBrief · schedule/render: exec.brief | one contract |
| Weekly Review | intelligence.review (wraps Weekly Pulse truth) | pulse business logic untouched |
| Bottleneck | intelligence.decision.bottleneck2 (dynamic) | score bottleneck = historical prior |
| Context modes | MM.exec overlays (`os_overlays`) | intelligence interprets via executionContext |
| Timeline | intelligence.timeline (`intel_timeline`) | includes exec events |
| Nutrition target | `os_nutrition_plan` (domain) | intelligence proposes · exec applies after confirm |
| Training plan | `os_training_plan` + course.js | exec compresses/substitutes only |
| Program truth | course.js / programView | read-only everywhere else |
| Labs | MM.labs (Phase 4 canonical) | intelligence consumes via adapted context |

## Phase 7 — Foresight (`MM.intelligence.knowledge/foresight`, `MM.ai`, `MM.content`)
| Piece | What it does |
|---|---|
| Knowledge Graph | 19 kuratierte Objekte, CLAIMs mit 6 Evidenztypen, Retrieval mit Kontext-Ranking, Staleness, Personalized Learn (kein Dead-End) |
| MM.ai | server-seitige KI-Sprachschicht (Edge `mm-ai`, CONFIG REQUIRED): Task-Routing, Budget, Cache, Validator (Grounding/Verbote/KEEP-Schutz), deterministischer Fallback |
| Foresight | Execution-Risk je Wochentag (gelernt), Plateau-Risk mit Restraint, Recovery-Pressure, Trajektorie-Band, Forecast (Band + persönliche Response-Historie), Prediction-Ledger + Kalibrierung, EIN-Insight-Regel |
| Weekly Autopilot | nächste Woche = Plan × busy/free × Recovery → Konflikte + Moves + Fokus; ACCEPT WEEK nur §57-sichere Ausführungs-Präferenzen |
| Kalender-Voraussicht | os_busy (nur start/end, nie Titel), ICS-Import, Konflikt-Engine, beste Fenster; Google OAuth = CONFIG REQUIRED |
| Push-Sender | Edge `send-brief` (VAPID, Dedup, DISCREET) — CONFIG REQUIRED |
| Visual Intelligence | Metrix Body (SVG, 6 Systeme), Trajektorie-Band-Chart (ein Chart-System), visual-manifest v2 (12 Assets, REQUIRES_EXTERNAL_GENERATION) |
| Content-Foundation | MM.content: 1 Wissensobjekt → Multi-Plattform-Struktur, gegroundet, ohne Nutzerdaten |

Tests: `node tools-dev/tests/phase7.test.js` (51).

## Phase 8 — Aktivierung · Monetarisierung · Proof (`MM.activation`, `I.proof`, mm-commerce)
| Piece | What it does |
|---|---|
| MM.activation (js/os/activation.js) | Meilensteine/Stage/Depth/ColdStart rein aus vorhandenem Zustand abgeleitet — nichts wird doppelt gefragt; Funnel-Events je 1×, ohne Gesundheitswerte |
| Performance Map (#map) | Erster Wert in Sekunden: Du heute → Limiter → 12 Wochen → Start hier → Not now, mit ehrlicher Datenbasis-Zeile |
| I.proof (intelligence/proof.js) | "Was MaleMetrix gelernt hat": Muster mit Evidenz-Klassen (BEOBACHTET/ZUSAMMENHANG/WAHRSCHEINLICH/UNSICHER), Mindest-N je Generator, Entscheidungs-Outcomes (#learned) |
| Transformation Proof | Checkpoints W4/8/12 (Karte nur, wenn Fotos wirklich fehlen), W12-Report, privacy-safe Share-Cards (4:5/9:16 PNG — ohne Labs/Medikation/Pathway) |
| Commerce | mm-commerce Edge Function (Server-Verify direkt bei PayPal, Idempotenz via commerce_events unique(provider,event_id), Entitlements nur per Service-Role) + Migration 0007 + COMMERCE.md — CONFIG REQUIRED |
| Coaching-Bridge | Coach-Paket-Export (strukturierter Snapshot, keine Fotos/Roh-Logs) + deterministische Eskalations-Trigger im Coach-Hub |
| Paywall-Intelligenz | Kontextuelle Upgrade-Momente mit ECHTEN Vorschauwerten (nie erfunden), outcome-basierte Preisleiter FREE → PROTOKOLL → COACHING |

Tests: `node tools-dev/tests/phase8.test.js` (62, inkl. 20-Kategorien-AI-Eval-Batterie + Commerce-/Privacy-Invarianten).

## Phase 9 — Produktionswahrheit (`MM.entitlements`, `MM.billing`, `MM.productionStatus`, Evidenz)
| Piece | What it does |
|---|---|
| MM.entitlements | Kanonische Fähigkeits-Facade `can(cap)` (Plan→Capability), eine Wahrheit aus account-Entitlements; Abo-Gate vorbereitet aber aus (ehrlich); Grandfathering-Provenance (LEGACY_LIFETIME schont Alt-Käufer) |
| MM.billing | Deterministische Billing-Zustandsmaschine (9 Zustände); out-of-order/unbekannte Webhooks = No-Ops; identische Tabelle serverseitig in mm-commerce |
| Commerce/Abo | Migration 0008 (subscriptions + subscription_events unique(provider,event_id)); mm-commerce subscription_event-Handler (Idempotenz-insert-first + Zustandsmaschine) — CONFIG REQUIRED |
| Delivery-Vault-Remediation | §5: bei Server-Grant entschlüsselt checkout.js den Client-Vault NICHT mehr; rotate-vault.mjs + SECURITY.md (P1 + Historie-Klartextcode + Alt-Kunden-schonende Retire-Sequenz) |
| MM.productionStatus() | Sichere Bereitschafts-Diagnose (configured/reachable je Abhängigkeit, nie Secrets) |
| Knowledge-Evidenz | §27/§29: 5 real verifizierte Landmark-Quellen (DOI+URL), Publikations-Gate (PUBLISHED nur bei belegten Kern-Claims), UNRESOLVED wird nie zitiert; KV 1→2 (§30) |
| Trust/Methodik | trust.html: Denk-Kreislauf, KI-Grenze, Evidenz-Stufen, Datenschutz — indexiert |
| Falsifizierbarkeit + KEEP | §68 jeder Vorschlag mit erwartetem Signal + Reassess-Kriterium; §70 KEEP als Premium-Output mit Reassess-Datum |
| Docs | BUSINESS-MODEL.md (Modell E Hybrid, AI-Kosten, Unit Economics), ACTIVATION.md (Wahrheitsmatrix + Founder-Checkliste WO/WAS/VERIFY/ROLLBACK) |

Tests: `node tools-dev/tests/phase9.test.js` (44) — Billing-Determinismus + out-of-order, Capability-Gating, Vault-Neutralisierung, Evidenz-nicht-erfindbar, productionStatus-ohne-Secrets, Chaos.

## Phase 9.5 — Go-Live-Wahrheit (Access-Control-Härtung, Production-Truth-Docs)
| Piece | What it does |
|---|---|
| Access-Path-Graph (SECURITY.md) | Jeder Premium-Grant-Pfad + Autoritäts-Modell: bezahlter Vermögenswert = AES-verschlüsselter Inhalt, nicht die statische Shell; localStorage-Fälschung öffnet weder Inhalt noch Server-Ressource |
| PRODUCTION_TRUTH.md | Machine-readable 7-Zustands-Matrix je Capability + "was 100 Fremde morgen erleben würden" |
| SUPABASE_PRODUCTION_AUDIT.md | 8 Migrationen + 5 Edge Functions statisch auditiert (RLS/Rollback/Idempotenz); Runtime-RLS BLOCKED (keine Creds) |
| FIRST_100_USERS.md | Messplan + Diagnose-Baum (welcher Funnel-Abfall bedeutet was) |
| SUBSCRIPTION_ACTIVATION_DECISION.md | Was vor Abo-Preis gemessen sein muss; Schalter dokumentiert |
| KNOWLEDGE_AUDIT.md | Deckung je Objekt (2 PUBLISHED, 16 REVIEWED, 5 Quellen), nächste Redaktionsschritte |
| Trust-Transparenz | trust.html "Wer sieht was — konkret", gegen Code verifiziert |

Tests: `node tools-dev/tests/phase95.test.js` (37) — AES-Inhaltsgrenze, Autoritäts-Modell, Capability-Facade server-autoritativ, SW-Cache-Sicherheit (nie Cross-Origin), Migrations-Idempotenz + RLS-Statik, productionStatus ohne Secrets. Gesamt 438 Assertions über 7 Suiten. SW: mm-v86.

## Future modules (contract)
tracker · nutrition-logging · stack-adherence · labs · wearables:
each = local-first store key + `registerStateDomain` (+ optional engine).
No account-layer rewrite needed. Wearables/push/food-AI = external services,
documented, never faked.
