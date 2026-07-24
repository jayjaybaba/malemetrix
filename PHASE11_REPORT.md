# PHASE 11 REPORT — The Product OS

Datum: 2026-07-23/24 · Branch `claude/malemetrix-phase-6-execution-przdvm` (master/main synchron)
Gesamtsuite: **18 Suiten · 868 PASS · 0 FAIL**

## Executive Summary

Kernbefund dieser Phase: Die Produktreise SCORE → PLAN → ACTION → TRACK →
REVIEW → RESULT ist in den Engines bereits weitgehend GEBAUT (Phasen 3–9) —
aber sie war weder als Einheit sichtbar noch als Verhalten abgesichert.
Phase 11 hat deshalb (a) das Cockpit so umgebaut, dass die Kernwahrheit
(Score · Mode · Engpass · Tag X/84 · nächster Check-in) beim Öffnen sofort
sichtbar ist, (b) das User-State-Modell als Single Source of Truth
verhaltensgetestet und (c) die drei wichtigsten Engines (Score-Entscheidung,
Mode-Differenzierung + Weekly Review, Bloodwork-Einheiten) mit echten
Behavior-Tests eingefroren. Keine Regression der Phase-10-Sicherheitsbasis
(P0-Check bestanden). mm-commerce-Deploy steht weiterhin aus (MANUAL DEPLOY
REQUIRED) — hat nichts blockiert.

## Product Architecture Before → After

**Before:** starke Einzel-Engines (goalDecision, nutritionAdjust,
plateauCheck, labs, foresight) ohne sichtbaren gemeinsamen Einstieg; Cockpit
begann mit Wochen-Hero, aber ohne Score/Engpass/Check-in-Überblick; die
Engine-Regeln existierten nur als Code, nicht als eingefrorene Produktregeln.

**After:** Today-View öffnet mit der Statuszeile aus dem kanonischen
`MM.account.getDashboardState()`; jede Regel der Reise ist testbar bewiesen:
Score trennt GOAL von BOTTLENECK (27 Tests), Modes rechnen real unterschiedlich
(39 Tests), Reviews entscheiden deterministisch (KEEP/adjust/execution_first/
recovery_first), Labs konvertieren korrekt oder verweigern ehrlich (15 Tests),
State-Präzedenz Programm > Score (23 Tests).

## Modulstatus (ehrlich)

| Modul | Status | Test Level |
|---|---|---|
| **My MaleMetrix Cockpit** (P1) — Statuszeile + bestehendes Today 2.0 (NBA, Tagesplan, Autopilot, Consistency, Empty States) | DONE (Statuszeile neu; Today-Basis bestand) | UNIT + INTEGRATION; BROWSER/LIVE ✗ |
| **User State Model** (P1.1) — getDashboardState als eine Wahrheit; Präzedenz Programm>Score; Access nur aus Entitlements | DONE (auditiert + getestet; Cloud-first via account-Sync bestand) | UNIT (23) |
| **Score 3.0** (P2) — Goal≠Bottleneck, Conflict-Handling (fatConcern), Red-Flag-Routing, Begründungen (WHY), Produktempfehlung als NEXT STEP | DONE im Kern; explizites CONFIDENCE-Feld (HIGH/MED/LOW) NOT STARTED | UNIT (27) |
| **12-Week Engine Mode-Differenzierung** (P3.1) | DONE — kcal ±20/0/+10/+5 %, Protein 2,2/2,0/1,8 g/kg, mode-eigene Wochenmuster | UNIT (39) |
| **Jeden Tag trainieren** (P3.2) — 7/7 Tagestypen je Mode, aktive Erholung, ≥3 Krafttage | DONE (bestand; jetzt eingefroren) | UNIT |
| **Weekly Review Engine** (P5) — DATA→deterministische DECISION→AI-Sprachschicht; %KG-Trends; Guardrails | DONE (bestand; jetzt eingefroren) | UNIT |
| **Plateau-Logik** (P5.2) — Execution vs. Plan, Recovery-Vorrang, insufficient_data | DONE (bestand; eingefroren) | UNIT |
| **Tracker 2.0** (P4) — Kernfelder inkl. Schlaf vorhanden; Foto-KI ehrlich gated (unsichtbar ohne Config) | PARTIAL (kein neues 20-40s-Redesign in dieser Phase) | STATIC + INTEGRATION |
| **Progress Photos** (P4.2) | NOT STARTED (Baseline-Fotos existieren als Konzept in #baseline) | — |
| **Bloodwork Intelligence** (P6) — Marker-DB (CV/Metabolic/Kidney/Thyroid/Hormone/PSA), Einheiten-Normalisierung, Trend-Prinzipien, keine erfundenen Ranges | DONE im Fundament; Labs→Actions-Verknüpfung (P6.2) PARTIAL (related-Marker + Kontext vorhanden, Knowledge-Deep-Links ausbaubar) | UNIT (15) |
| **Stack Builder** (P7) | DONE als 2.0 aus P9.6 (Foundation/Goal/Optional-Tiers, Evidenz, Konflikte, Budget); Lab-Input PARTIAL | STATIC + INTEGRATION (Bestand) |
| **Nutrition Builder** (P8) — Targets, Meal-DB, Swaps, Einkaufsliste, adaptive TDEE | DONE im Fundament (bestand) | UNIT (Targets/TDEE) + INTEGRATION |
| **Photo Food AI** (P8.1) | ENTSCHIEDEN: kein Fake — Feature bleibt unsichtbar bis echter Proxy konfiguriert; nirgends beworben (P10-Sweep) | STATIC |
| **MaleMetrix Intelligence** (P9) — mm-ai Sprachschicht, deterministik-treues Systemprompt, Rate-Limit; kontextbezogene Advisor-Fragen im OS | DONE im Code; LIVE ✗ (Deploy + Provider-Key offen) | STATIC |
| **Library Context** (P10) | PARTIAL (Knowledge-Graph + bottleneck-bezogene Inhalte existieren im OS; Library-Seite selbst noch Kachel-orientiert) | STATIC |
| **Account/Entitlement Journey** (P11) — Kauf→„Zugang freigeschaltet"→Konto; Konto-Recovery; Legacy-Codes inventarisiert (PREMIUM_ACCESS_AUDIT) | DONE im Kern; Post-Purchase-„Jetzt starten"-Journey ausbaubar | STATIC + LIVE (Kauffluss alt) |
| **Coaching Conversion** (P12) — High-Intent-Trigger in productRecommendation | DONE im Kern (getestet: kein Push bei solidem Profil) | UNIT |
| **Analytics** (P13) | PARTIAL (Event-Layer + Privacy-Lint bestehen; Funnel-Events purchase_verified/purchase_recovered vorhanden; vollständige Event-Taxonomie offen) | STATIC |
| **i18n** (P14) | PARTIAL (bewusst zurückgestellt — Produktkern zuerst, per Brief-Priorisierung) | STATIC (26) |
| **PWA/Mobile** (P15) — SW mm-v105, Network-first, ?v-Busting | DONE (Mechanik mehrfach live bewiesen); gezielter iOS-Form-Audit offen | LIVE (Cache-Rollout) |
| **Design/UX** (P16/P17) | PARTIAL (Statuszeile im Lab-Stil; kein neuer Gesamt-Audit in dieser Phase) | — |

## Security / Regression Check (P0)

- HEAD sauber auf e640494 gestartet; keine Phase-10-Datei zurückgebaut.
- Commerce-Reihenfolge unangetastet: PAYPAL → ORDER → ENTITLEMENT → AUDIT
  (commerce-fulfillment 43/0, commerce-e2e 85/0 weiterhin grün).
- Live-Check: mm-commerce antwortet noch mit `access-control-allow-origin: *`
  ⇒ **alter Stand live, MANUAL DEPLOY REQUIRED** (Kommandos unten).
- Keine echte Zahlung, keine Löschung, keine Secrets.

## Tests

18 Suiten · 868 PASS · 0 FAIL. Neu in P11: user-state (23), program-engine
(39), labs-units (15) — alle laden echte Module in Node (Behavior, kein
Regex-only). LIVE-Häkchen nur wo tatsächlich live geprüft (SW-Rollout,
Ciphertext-Gating, alter Kauffluss).

## Commits

- `1aec47e` P11-A Cockpit-Statuszeile + user-state.test.js, SW mm-v105
- `cee4ae2` P11-B program-engine.test.js (Modes/Review/Plateau/Every-Day)
- `62a9c5e` P11-C labs-units.test.js (Einheiten + Ehrlichkeitsprinzipien)
- (+ dieser Report)

## Deployments

- Client: geht mit Push auf master automatisch live (Pages), SW mm-v105.
- Edge Functions/DB: **weiterhin NICHT deployt** — unverändert P10-Stand.

## Manual Actions Required

Unverändert aus NIGHT_REPORT.md (Phase 10):
```bash
supabase db push
supabase functions deploy mm-commerce
supabase functions deploy resolve-product-access
supabase functions deploy mm-ai
supabase functions deploy delete-account
supabase functions deploy send-brief
```

## Not Finished / Risks

- **P0-Risiko unverändert:** Live-mm-commerce bis Deploy ohne Claim-Schutz/
  Order-first (praktisch kaum ausnutzbar, aber offen).
- Score-CONFIDENCE-Feld, Progress Photos, Library-Kontextualisierung,
  vollständige Analytics-Taxonomie, i18n-Vervollständigung, Tracker-20-40s-
  Redesign: bewusst nicht begonnen/halbgebaut statt alles anzureißen
  (P19/P20: A+B+C richtig statt 30 halbe Features).
- BROWSER-Testlevel fehlt weiterhin für das Cockpit (nur Node/JSDOM-frei
  getestet) — einmal manuell auf iPhone öffnen lohnt.

## Next Highest-Leverage Phase

1. Deploy-Fenster ausführen + Live-Verifikation (Recovery-Ablehnung mit
   historischer Transaktions-ID).
2. Score-Result-Experience (P2.2): Ergebnisseite auf die 5-Block-Struktur
   (Score/Ziel/Engpass/Warum/Nächster Schritt) straffen + CONFIDENCE-Feld —
   kleinster Eingriff mit größtem Funnel-Effekt.
3. Post-Purchase-Journey (P11): „Zugang freigeschaltet → Jetzt starten"
   direkt in Programm-Tag 1 führen.
