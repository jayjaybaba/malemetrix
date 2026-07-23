# FIRST 100 USERS — Measurement Plan (Phase 9.5, §22)

Was genau bei den ersten 100 echten Nutzern gemessen wird — und welche
Diagnose jede Kennzahl auslöst. Alle Events sind bereits instrumentiert
(lokal via `MM.funnel()`; server-seitig sobald Plausible konfiguriert ist,
ACTIVATION.md Schritt 8). **Keine Gesundheitswerte in Analytics.**

## Primärkennzahlen

| Kennzahl | Definition | Zielhypothese (kein Fakt) |
|---|---|---|
| **Aktivierung** | % Score-Completer, die eine erste bedeutsame Aktion abschließen | ≥ 35 % |
| **Time-to-Value** | Median Score-Complete → Performance Map | < 5 min |
| **Execution** | % mit erstem abgeschlossenen Workout/Aktion | ≥ 40 % |
| **W1-Retention** | % die in Tag 7–13 zurückkehren UND eine bedeutsame Aktion abschließen | ≥ 25 % |
| **Review** | % die das erste Weekly Review erreichen | ≥ 20 % |
| **Proof** | % mit erstem messbaren Proof-Moment | ≥ 15 % |
| **Monetarisierung** | upgrade_view → checkout_start → purchase | Ketten-CVR messen, nicht raten |

## North Star

**Weekly Active Users, die ≥1 personalisierte bedeutsame Aktion abschließen.**
Berechnung erst mit echten Event-Daten — kein Fake-Dashboard vorher.

## Diagnose-Baum (welcher Abfall bedeutet was)

- Score-Completion niedrig → **Score-Friktion** (zu lang / zu fordernd am Anfang).
- Map hoch, Account niedrig → **Wert→Commitment-Brücke** fehlt (warum Konto?).
- Account hoch, First-Action niedrig → **Onboarding/Execution-Problem** (Today unklar).
- W1 niedrig → **Nützlichkeits-/Retention-Problem** (kein Grund zurückzukommen).
- Upgrade-View hoch, Checkout niedrig → **Angebot/Preis/Trust-Problem**.
- Checkout hoch, Paid niedrig → **Zahlungsfriktion** (PayPal-Flow, Vorkasse-Hürde).
- Paid hoch, Retention niedrig → **Produktversprechen-Mismatch** (verkauft ≠ erlebt).

## Instrumentierte Events (bereits vorhanden)

`pageview_*`, `score_start_click`, `check_started`, `check_completed`,
`map_view`, `today_open`, `m_scored…m_proof_moment`, `upgrade_view`,
`checkout_started`, `order_completed`, `share_created`, `coach_packet_export`,
`coaching_interest`. Milestone-Events feuern je genau 1× (Phase-8-Test), ohne
Gesundheitswerte (Repo-Lint erzwingt es).

## Beta-Betrieb

- Kohorten-Flag + Version-Identifier: über SW-Version (`mm-v85`) + `MM.productionStatus()`.
- Feedback: In-Produkt „Was war heute nicht hilfreich?" (strukturiert, ohne sensiblen Kontext).
- Diagnose-ID: nicht-sensible Session-ID im Bug-Report (keine Gesundheitsdaten).
- Rollback: SW-Version + Git-Revert; Cloud-Features per Config-Flag abschaltbar.
