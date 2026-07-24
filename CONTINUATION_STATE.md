# CONTINUATION_STATE — Phase 16: DAS PROTOKOLL 2.0 (Flagship Rebuild)

## PHASE 16 STAND (A-H erledigt, J offen)
ERLEDIGT:
- G/H SCORE-ERGEBNIS → PASSENDES KAPITEL: Diagnose-Block-Link führt jetzt
  je Engpass auf das genau erklärende Kapitel statt generisch protokoll.html.
  Neue Map C.bottleneckChapter (check-data.js): body→fettabbau, strength→
  training-system, fuel→fettabbau, recovery→schlaf-energie, blood→blutwerte-
  guide, drive→testosteron, execution→gewohnheiten. check.js rendert Link
  „DAS PROTOKOLL · Kapitel <X>: warum <Engpass>…", data-track protokoll_chapter_<key>.
  Produkt-CTA (cta_protokoll, 49 €) bleibt erhalten. Browser-verifiziert für
  recovery/body/drive/blood. Tests P16/G-H (116/0). SW mm-v123.
- F BEFORE-TRT (ebooks/testosteron.html): neue Sektion #before-trt VOR s12
  (TRT-Red-Zone) + TOC. Adipositas↔T MEHRPFADIG korrekt — Aromatase als EIN
  Pfad neben Insulinresistenz/Entzündung/SHBG-Verschiebung/Schlafapnoe/
  zentraler HPG-Dämpfung; „Fett = hohes Östradiol" explizit als IRRTUM.
  Reihenfolge Körper→Schlaf→Training→Labor→Reassess→Diagnose (.p2chain).
  Kein Pro-/Anti-TRT („weder Werbung für noch gegen"). Zwei Altstellen (s6/s8)
  entschärft. PROTOCOL_MEDICAL_QA.md F-Abschnitt gefüllt. Tests P16/F (104/0).
  BUGFIX aus E: doppelte .ev-Basisregel in blueprint.css entfernt (hätte
  ev-a/ev-red-Chips in 10 Bestands-Ebooks grau gemacht) — Farben verifiziert
  (grün/rot wieder korrekt). SW mm-v122.
- E NEUE KAPITEL (bp-Design, FREE, foto-freies nofoto-Cover):
  ebooks/00-start-here.html (Reader-Journey + Rollen-Trennung + Ein-Engpass),
  ebooks/11-injektionen.html (Angstabbau, KEINE Universalnadel, KEINE Dosis,
  Body-Comp-Crosslink, MM/SAFETY), ebooks/12-longevity-risk.html (ApoB/RR/
  VO₂max/Screening, KEINE erfundenen Ranges). In Library-Katalog
  (ebooks-data.js) aufgenommen. PROTOCOL_MEDICAL_QA.md dokumentiert jede
  Leitplanke. Tests P16/E (89/0) inkl. medizinischer Negativ-Guards (kein mg,
  kein mm/G, kein mmHg/mgdl). Browser-QA 390/1440: 0px Overflow, keine Fehler.
  blueprint.css: .bp-cover.nofoto + .ev-Evidenz-Chips. SW mm-v121.
- D2 MODUL-HUB: protokoll.html hat eigene Sektion „Frei lesbar · bevor du
  kaufst" (9 Preview-Kacheln → freie Kapitel) UNTER der echten 10-Modul-
  Übersicht (nicht ersetzt = kein Überversprechen). ebooks.html: „EMPFOHLEN
  FÜR DICH"-Sektion (verborgen bis Score da), liest MM.store check_result,
  mappt alle 7 Bottlenecks → 2 freie Kapitel, sendet nichts. Styles
  .preview-grid/.preview-ch in style.css. Tests P16/D2 (68/0). Browser-QA
  390/1440: 0px Overflow, keine Fehler, no-seed = Sektion bleibt verborgen.
  SW mm-v120.
- D1 KAPITEL-RAHMUNG: alle 14 freien Ebooks tragen jetzt Protokoll-Systemkopf
  (os14-sysline „MM / PROTOCOL · KAPITEL NN") + Ende-CTA-Plane („Teil von DAS
  PROTOKOLL", Rollen getrennt, 49 € · einmalig). Styles .bp-protohead/.bp-protocta
  in blueprint.css. PROTOCOL_MIGRATION_MAP.md geschrieben. Test-Gruppe P16/D1 in
  visual-system.test.js (51/0). Browser-QA 390/1440 = 0px Overflow, keine Fehler.
  SW mm-v119. masterguide = ÜBERBLICK (kein Nummern-Kapitel, Redundanz zu 01).
- A INVENTORY: PROTOCOL_CONTENT_INVENTORY.md — Kernbefund: Premium-Werke
  (protokoll 230KB, master-ebook 442KB, ultimate-stack 208KB) liegen NUR
  verschlüsselt vor (Keys nicht in dieser Umgebung!). 13 freie Ebooks
  (~590KB Klartext, bp-Design) sind die redaktionelle Arbeitsmasse.
  ⇒ Kein Entschlüsseln/Concatenieren möglich; Flaggschiff = Modul-System.
- B ARCHITECTURE: PROTOCOL_MASTER_ARCHITECTURE.md — 14 Module mit realen
  Quellen, Reader Journey, Crosslink-Matrix, Editorial-Standards,
  Zugangs-Logik (FREE-Previews bleiben frei — kein Pseudo-Paywalling).
- C SITE: Hauptnav ist jetzt System·Score·Das Protokoll·1:1·Über·MyMM —
  Library ins Über-Dropdown verschoben (25 Seiten; URL ebooks.html bleibt,
  launch-readiness weiter grün). Wordmark Teil 26: weight 500,
  letter-spacing 0.13em (mobil 0.1em).

WICHTIGE PRODUKT-EHRLICHKEITSREGEL für Phase G (Produktseite):
protokoll.html zeigt bereits die ECHTEN 10 Module des verschlüsselten
Kaufinhalts. NICHT durch die 14-Kapitel-Architektur ersetzen (würde
überversprechen). Stattdessen: eigene Sektion „Frei lesbare
Kapitel-Previews" (Links auf die 13 freien Kapitel) UNTER der
10-Modul-Übersicht.

## NEXT EXACT ACTION (Phase 16 D-J, Reihenfolge)
1. **D1 Kapitel-Rahmung:** Jede der 13 freien Ebook-Seiten bekommt einen
   Protokoll-Systemkopf: os14-sysline "MM / PROTOCOL · KAPITEL NN — TITEL"
   (Nummern aus MASTER_ARCHITECTURE) + Ende-CTA-Plane „Dieses Kapitel ist
   Teil von DAS PROTOKOLL → protokoll.html". Uniform per Python-Replace.
   PROTOCOL_MIGRATION_MAP.md (ALT→NEU je URL) mitschreiben. Tests: neue
   Gruppe in visual-system.test.js (13 Seiten tragen Kopf+CTA).
2. **D2 Modul-Hub:** protokoll.html Preview-Sektion (s. Regel oben) +
   ebooks.html Kopf: "EMPFOHLEN FÜR DICH" nach Bottleneck (localStorage
   check_result lesen) vor dem Katalog.
3. **E NEUE KAPITEL (je ebooks/<name>.html, bp-Design, FREE):**
   00-start-here (MEASURE→UNDERSTAND→PRIORITIZE→ACT→REASSESS, kurz),
   11-injektionen (Gauge/Länge/Routen korrekt, KEINE Universalnadel-Regel,
   keine Dosier-Individualisierung, Angstabbau, MM/SAFETY-Notes,
   Body-Comp-Crosslink: weniger subkutanes Fett ⇒ Zielgewebe ggf.
   oberflächlicher, Nadelwahl bleibt von Präparat/Route/Stelle/Anatomie
   abhängig), 12-longevity-risk (ApoB/RR/VO2max/Screening, keine
   erfundenen Ranges). PROTOCOL_MEDICAL_QA.md anlegen.
4. **F BEFORE-TRT-Sektion** in ebooks/testosteron.html: Adipositas↔T
   mehrpfadig korrekt (Aromatase ALS EIN Pfad neben Insulinresistenz/
   Entzündung/SHBG/Schlafapnoe/HPG — nie „Fett=hohes E2"); Reihenfolge
   Body-Comp→Sleep→Training→Labs→Reassess→Diagnose; kein Anti/Pro-TRT.
5. **G/H** Score-Result-Link je Bottleneck aufs PASSENDE Kapitel
   (recovery→04 schlaf-energie, body→02 fettabbau, metabolic→05/07,
   strength→03, drive→06/10) statt generisch protokoll.html.
6. **J QA:** qa.js-Pass (390/1440) über protokoll.html + 3 Kapitel +
   ebooks.html; PROTOCOL_FLAGSHIP_REPORT.md ehrlich (DoD-Punkte 1-25).
Jedes Paket: Suiten + sw.js-Bump + Commit (P16-X) + Push beider Branches
+ diese Datei aktualisieren.

## DO NOT REGRESS (Phase 16)
- protocol/twelve_week-Entitlements + Vaults UNVERÄNDERT (Teil 18).
- Keine Library-/Ebook-URL löschen (SEO); ebooks.html bleibt erreichbar.
- Produktseite nie mehr versprechen als der Vault-Inhalt liefert.
- Score bleibt primärer kostenloser Funnel-Einstieg.

# ÄLTERE PHASEN (14/15/Brand) — weiterhin gültig


## BRAND: SPLIT-X FINAL (Commit d361446 — NICHT regressieren)
- Identität: MALEMETRI + Custom-Split-X-SVG (links Off-White #eef2f7,
  rechts Cyan #00c2ff, runde Kappen, Negativraum). Assets: assets/brand/
  (mark + mono + app-icon + maskable). Header/Footer-Markup uniform in
  allen Seiten; Legacy .logo-mark/.x entfernt. Favicon = Split-X-Data-URI.
  Icons 512/192/180 + 512-maskable aus SVG generiert (scratchpad/
  genicons.js). manifest: any/maskable getrennt. JSON-LD logo = icon-512.
- OFFEN: og-image.png trägt alte Marke → neues 1200×630-Social-Asset
  rendern (playwright, Wordmark + PERFORMANCE OS + Split-X auf Deep
  Black); Footer-Subline PERFORMANCE OS optional; tiktok-app-icon-1024
  ungenutzt prüfen.

## PHASE 15 FOUNDER-QA (echter Browser-Pass — NEU)
- Tooling: scratchpad/qa.js (playwright-core + /opt/pw-browsers/chromium-
  1194/chrome-linux/chrome, python3 -m http.server 8899, localStorage-Seed).
  Screenshots in scratchpad/shots/. WIEDERVERWENDEN, nicht neu bauen.
- Messergebnis: 0px horizontaler Overflow auf 9 Seiten × 390/1440px;
  Konsole ohne JS-Fehler (nur geblockte Supabase-Calls in der Sandbox).
- Behobene P1-Funde (visuell nachverifiziert): (1) My MaleMetrix zeigt
  Status VOR Pathway-Frage (app.js pathwayCta-Flag); (2) check.html
  "bereits ein Ergebnis" ohne Emoji-Alert, jetzt VS2-Instrumentzeile.
- FOUNDER_VISUAL_QA.md: Scorecards + priorisierte Restliste (P2: FAB-
  Padding mobil, qa.js-Klick zur Result-View + Entitlement-Seed für
  Aktiv-State, Cinematic-Slot REQUIRES EXTERNAL GENERATION; P3-Liste).
- NEXT EXACT ACTION (Phase 15): Punkte 3+4 der Fixliste in
  FOUNDER_VISUAL_QA.md umsetzen, dann Tracker/Labs/Library-Screenshots
  bewerten, dann PHASE15_REPORT.md.

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
  + Prograil; os.css os14-cmd. SW mm-v115.
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
