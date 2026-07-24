# CONTINUATION_STATE — Phase 14 (Visible Redesign) · davor Phase 13

## PHASE 14 STATUS (ehrliche Labels)
- Homepage: VISIBLY REDESIGNED (statisch) — OS-Hero (os14-hero, Mono-
  Sysline, Diagnose-Instrument statt dash-card), Data-Band statt Stats-
  Cards, Friction-Rows statt grid-3, 6 Kapitel-Marken (os14-ch).
- My MaleMetrix: VISIBLY REDESIGNED (statisch) — os14-cmd Command-Center-
  Kopf (TAG 18/84 Readout) statt os-hero-card, + Instrument-Statuszeile.
- Score Result: VISIBLY REDESIGNED (statisch) — os14-score-hero (Zahl bis
  8rem, Limiter-Band) statt Ring+Chips; MM/SYSTEMS + Confidence + 1 CTA.
- 12-Week: PARTIALLY APPLIED — os14-prograil (01…12 Rail + Sysline) im
  Today-Header; Week-View/Today-Detail-Komposition offen.
- Tracker: PARTIALLY APPLIED — nur OS-Seitenkopf (MM / TRACK); das
  Check-in-Instrument (P4.1/4.2) ist offen = A4 aus Phase 13.
- Labs/Library/Navigation: FOUNDATION ONLY — nicht angefasst.
- BROWSER/VISUAL QA: NICHT durchgeführt (kein Browser-Run) — alle Labels
  oben sind statische Einschätzungen. Nächster Schritt: 390px/1440px-Pass.
- CSS: style.css Blöcke "PHASE 14 — HOMEPAGE OS COMPOSITION" + Score-Hero
  + Prograil; os.css os14-cmd. SW mm-v114.
- PHASE14_VISUAL_TRANSFORMATION_REPORT.md: NICHT erstellt (Credits) —
  Struktur siehe Phase-14-Brief P47.


Zweck: Opus 4.8 (oder jede neue Session) arbeitet NUR mit dieser Datei sofort weiter.

# CURRENT HEAD

Nach Commit "P13-A1" (siehe git log --oneline -5). Branch:
`claude/malemetrix-phase-6-execution-przdvm` — master/main werden immer per
`git push origin HEAD:master HEAD:main` synchron gehalten (FF-only, nie force).

# COMPLETED (Phase 13)

- **A2 SYSTEM-READY-Moment (P2.3):** js/course.js Onboarding-Abschluss
  (c2ObGo) rendert jetzt statt Toast+Redirect einen VS2-Ready-Screen:
  Mono-Stamp SYSTEM READY (cyan), .mm-metric-row mit MODE / PRIMARY
  BOTTLENECK / 12 WEEKS / DAY 01 (echte Setup-Werte), EIN CTA
  „START DAY 1" → render() des Today-Views. Funnel-Events
  program_initialized + day1_started. Tests: visual-system 35/0.
- **A5 Weekly-Review-UX (P5.2):** vReview (js/os/app.js) zeigt die
  Wochenentscheidung jetzt ZUERST als größtes Element (.mm-metric,
  Statusfarbe nach Entscheidung: KEEP neutral, EXECUTION/RECOVERY watch,
  ADJUST flag). Reihenfolge: DECISION → WHY (Verdict-Karte) → WHAT
  CHANGES/„NICHT ÄNDERN" → NÄCHSTER REVIEW. Engine unangetastet.
  Tests: program-engine.test.js 43/0 (neue Review-UX-Gruppe).
- **A1 Score Result + Confidence + Next-Step (P1 komplett):**
  - `C.decisionConfidence(answers, knownFlags)` in js/check-data.js:
    deterministisch HIGH/MEDIUM/LIMITED aus Vollständigkeit (dataConfidence),
    Widersprüchen (Selbstbild vs. WHtR/BMI, verweigerte Antworten), Red Flags.
    Keine Prozente. Max 3 reasons.
  - `C.nextStep(state)` in js/check-data.js: EXAKT eine primäre Handlung.
    Präzedenz: redFlags→medical(href:null) → !hasScore→score →
    !signedIn→account("Ergebnis sichern") → !activeCycle→start_program
    (kurs-programm.html) → today (mein-protokoll.html#today).
  - Ergebnisseite (js/check.js renderResult): CONFIDENCE-Zeile im
    „DEIN EMPFOHLENER WEG"-Block (Mono, Statusfarbe) + „DEIN NÄCHSTER
    SCHRITT"-Block vor Priorität #1 (liest MM.account.snapshot() +
    c2_start/c2_goal aus MM.store).
  - Tests: tools-dev/tests/score-engine.test.js jetzt 42/0 (Gruppen 7+8).

# CURRENT ARCHITECTURE (nur was Phase 13 braucht)

- Engines existieren bereits (NICHT neu bauen, P26): Score
  `MM_CHECK.goalDecision/productRecommendation` (js/check-data.js);
  Weekly Review `MM.engines.nutritionAdjust/plateauCheck` (js/os/engines.js,
  getestet in program-engine.test.js); Today 2.0 + NBA + Statuszeile
  (js/os/app.js, renderToday); User State `MM.account.getDashboardState()`
  (js/account.js, getestet in user-state.test.js); Tages-Checkin-Basis:
  c2_daily/c2_pulse (js/course.js + js/os/*).
- Visual System 2.0: css/style.css Block "VISUAL SYSTEM 2.0"
  (.mm-metric/.mm-sys/.mm-secthead/.mm-access/.mm-empty/.mm-locked,
  --status-*-Tokens). IMMER diese Klassen nutzen, keine neuen Varianten.
- Cache-Disziplin: jede ausgelieferte JS/CSS-Änderung ⇒ sw.js VERSION bump
  (aktuell mm-v110) + ggf. ?v= auf checkout.html (aktuell v106).
- Tests: node tools-dev/tests/<suite>.test.js — Suiten: chaos, integration,
  intelligence, phase7/8/9/95/96, launch-readiness, i18n, commerce-e2e,
  commerce-fulfillment, edge-functions, score-engine, user-state,
  program-engine, labs-units, visual-system (+ tools-dev/test-execution.mjs).
  Stand: 19 Suiten, ~917 PASS, 0 FAIL (score-engine 42, program-engine 43).

# FILES CHANGED (Phase 13 bisher)

- js/check-data.js (decisionConfidence, nextStep)
- js/check.js (Confidence-Zeile, Next-Step-Block)
- tools-dev/tests/score-engine.test.js (Gruppen 7+8)
- sw.js (mm-v108)

# DEPLOY STATUS

- Client: Push auf master ⇒ GitHub Pages automatisch. Live-Check:
  `curl -s https://www.malemetrix.com/sw.js | grep VERSION`.
- Supabase: ALLE Edge Functions + db push sind laut Nutzer manuell deployt.
  mm-commerce live bestätigt (CORS-Echo www.malemetrix.com; historische
  1-€-Zahlung wird mit amount_mismatch abgelehnt). KEINE Payment-Arbeit mehr
  nötig, außer echte Regression gefunden.

# OPEN P0

- keins bekannt.

# OPEN P1 (Priority A, Reihenfolge einhalten)

- **A2 Activation-Flow:** Score→Account→Programmstart ohne State-Verlust
  prüfen/verdrahten. Score-Sicherung nach Login existiert (account.js
  saveScoreResult/importLocalData) — auditieren, dann Start-Moment bauen:
  kurs-programm.html Setup-Ende ⇒ „SYSTEM READY"-Screen (Mode/Bottleneck/
  12 WEEKS/DAY 01, CTA „START DAY 1" → mein-protokoll.html#today).
  VS2-Klassen (.mm-access-Muster als Vorbild, aber eigener .mm-ready o. ä.).
- **A4 Daily Check-in 2.0:** 20–40 s. Vorhandene Basis: js/os/app.js
  closeDayCard (Evening Close) + c2_daily. Ziel: One-Tap-Toggles
  (Training DONE/PARTIAL/MISSED, Schlaf-Buckets <5/5-6/6-7/7-8/8+,
  Energie LOW/OK/HIGH, Protein ja/nein, Steps), Feedback „X/5 CORE ACTIONS"
  ohne Konfetti, ein schlechter Tag ändert nie den Plan (Text sagt das).
- **A5 Weekly Review UX:** Engine-Ausgabe (nutritionAdjust) als
  WEEK NN REVIEW: DECISION (KEEP/EXECUTION FIRST/RECOVERY FIRST/ADJUST) →
  WHY (max 3) → WHAT CHANGES/NO CHANGE → NEXT WEEK. Rendering vermutlich
  in js/os/app.js #review-View — erst auditieren (grep "review").

# OPEN P2 (Priority B/C, erst nach A)

- Progress-Summary (START/NOW/CHANGE als .mm-metric-row), Progress Photos
  (privat! kein Public-Bucket), Post-Purchase-Routing via C.nextStep
  (checkout renderSuccess „Jetzt starten" dynamisch), Library-Kontext
  (Top 2-3 nach Bottleneck), Analytics-Funnel-Events (score_result_viewed,
  activation_started, program_initialized, day1_started,
  daily_checkin_completed, weekly_review_completed — KEINE Gesundheitsdaten),
  12-Week-Completion + Recheck-Loop, PHASE13_REPORT.md am Ende.

# NEXT EXACT ACTION

1. **A4 Daily Check-in 2.0 (EINZIGER offener Priority-A-Punkt).**
   AUDIT-ERGEBNIS (Fable, damit nichts doppelt gemacht wird):
   - js/os/app.js:133 closeDayCard(day) — Evening Close existiert und ist
     bereits EIN Klick (~15 s): Training/Protein werden ABGELEITET, nie
     doppelt gefragt. Verdicts COMPLETE/PARTIAL/RECOVERY/REST via
     X.dayLog/X.closeDay (js/os/execution.js — dort "closeDay" greppen).
   - Der data-closeday-Klick-Handler liegt weiter unten in app.js
     (grep -n "data-closeday" js/os/app.js).
   VERBLEIBENDE ARBEIT (chirurgisch, NICHT neu bauen):
   a) closeDayCard um 2 One-Tap-Zeilen erweitern: SCHLAF-Bucket
      (<5 / 5-6 / 6-7 / 7-8 / 8+) und ENERGIE (LOW/OK/HIGH) als
      .os-chip-Buttons mit data-Attributen; Auswahl in einer lokalen
      Variable/dataset halten.
   b) Im data-closeday-Handler die zwei Werte mit an X.closeDay übergeben
      bzw. zusätzlich in c2_pulse für den Tag speichern (bestehendes
      Format ansehen: MM.store.get("c2_pulse")) — KEINE neue Datenquelle.
   c) Nach dem Schließen Feedback ohne Konfetti: "X/N CORE ACTIONS" aus
      dem Verdict + Satz "Ein einzelner Tag ändert deinen Plan nicht."
      (bei PARTIAL/MISSED) — Texte kurz, VS2-Ton.
   d) Tests: program-engine.test.js Gruppe "P13/A4": statisch prüfen, dass
      closeDayCard Schlaf-/Energie-Chips enthält, keine Pflicht-Textfelder,
      und dass der Ein-Tag-ändert-nichts-Satz existiert. Verhaltenstest
      falls X.closeDay in Node ladbar (execution.js braucht DOM-Shims wie
      in user-state.test.js).
   e) sw.js bump + Commit + Push (Muster unten) + diese Datei updaten.
4. Nach jedem Paket: Suiten laufen lassen, sw.js bump, Commit im Stil der
   letzten Commits (deutsch, Co-Authored-By Claude Opus 4.8 + Session-Link),
   `git push -u origin claude/malemetrix-phase-6-execution-przdvm &&
   git push origin HEAD:master HEAD:main`, diese Datei aktualisieren.

# DO NOT REGRESS

- Commerce: PAYPAL VERIFIED → ORDER → ENTITLEMENT → AUDIT best effort
  (fulfillment.mjs). Claim-Schutz payment_already_claimed. Exakt 4900/EUR.
- ES256-Auth-Muster (_shared/edge.mjs), verify_jwt=false + Handler-Auth.
- Keine echte Zahlung, keine Account-Löschung, keine Secrets, keine
  Health-Daten in Analytics, AI ersetzt nie deterministische Entscheidungen.
- Visual System 2.0 nicht verwässern (keine Emoji-UI, keine neuen Bunt-Cards).
- Alle bestehenden Tests müssen grün bleiben (19 Suiten).
