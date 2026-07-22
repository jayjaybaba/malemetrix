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

## Future modules (contract)
tracker · nutrition-logging · stack-adherence · labs · calendar · reminders:
each = local-first store key + `registerStateDomain` (+ optional engine).
No account-layer rewrite needed. Wearables/push/food-AI = external services,
documented, never faked.
