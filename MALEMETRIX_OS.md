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
| LABS | turn lab data into context (biomarker intelligence, not a spreadsheet) |
| COACH | personal performance intelligence — decide what's next & why (Phase 5) |
| LEARN | explain why (Protokoll, Library, Enhanced Center) |

## Code
```
js/os/os-core.js   MM.os      — Graph, metrics, events, actions/Today/NBA,
                                baseline, photos (IndexedDB), context modes, ICS
js/os/engines.js   MM.engines — transformation, nutrition, training, stack
                                (reads lab flags), progress interpretation
js/os/labs.js      MM.labs    — biomarker intelligence: marker KB (40+ markers),
                                unit normalization (original retained), append-
                                only panels/results, trends+status, context
                                engine, priorities, recheck, blood-test builder,
                                enhanced monitoring, import review, stack context
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

## Intelligence layer (Phase 5) — `js/os/intelligence/*` (MM.intelligence)
Three-layer model: (1) DETERMINISTIC TRUTH read from os/labs/account, never
rewritten; (2) RULE/DECISION engines; (3) SYNTHESIS/LANGUAGE (optional AI seam
with deterministic fallback). Modules:
```
intelligence-core.js  freshness (fresh/aging/stale/missing) + confidence utils
context-builder.js    buildContext() canonical package · snapshot · relevance budgeting
memory.js             goal/preference/constraint/response memory + Decision Ledger
digital-twin.js       8 domains w/ state·trend·confidence·completeness
decision-engine.js    decide() arbitration · bottleneck2 · contradictions · leverage · stopDoing
review.js             immutable Weekly Intelligence Review · morning/evening brief · expected-vs-actual
advisor.js            ASK MALEMETRIX — grounded contract answers, tool model, provider seam, boundaries
simulator.js          WHAT-IF scenarios + calibrated forecast + goal feasibility
experiments.js        N-of-1 engine (one-change, conservative verdicts, response memory)
protocol.js           MY PROTOCOL (versioned) + unified TIMELINE
```
All intelligence stores sync as append-merged os_state domains (intelmemory,
inteldecisions, intelreviews, intelexperiments, intelprotocol, inteltimeline,
intelbnhist). Events carry no raw values. Advisor works fully without any AI
provider; a provider only polishes language over the deterministic contract and
can never override Layer-1/2 truth. Tests: `tools-dev/tests/intelligence.test.js`
(123 assertions incl. 8 golden personas + longitudinal + adversarial + evals).

## Labs sync (Phase 4)
Lab records sync as three OWN os_state domain rows (`labpanels`/`labresults`/
`labnotes`), registered with `{append:true}` → conflict resolution is a UNION by
`id` (`mergeById`), never last-write-wins, so concurrent offline appends never
lose history. RLS via `os_state` policy (own rows only) + ON DELETE CASCADE.
Migration `0004` additionally ships dedicated `lab_panels`/`lab_results`/
`lab_notes` tables (full RLS + dupe guard) as the prepared structured path.
Events carry only marker_id/status/date — never raw biomarker values (privacy).

## Future modules (contract)
tracker · nutrition-logging · stack-adherence · calendar · reminders:
each = local-first store key + `registerStateDomain` (+ optional engine).
No account-layer rewrite needed. Wearables/push/food-AI = external services,
documented, never faked.
