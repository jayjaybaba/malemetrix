# PRODUCTION READINESS — Phase 10

Stand: 2026-07-23 · Ehrliche Statusmatrix. Testlevel-Skala:
STATIC (Quellcode-Invarianten) → UNIT (echte Logik isoliert) → INTEGRATION
(Module zusammen) → BROWSER → AUTHENTICATED → REAL SUPABASE → **LIVE VERIFIED**.
Ein Feature ist nur so „ready" wie sein höchstes tatsächlich erreichtes Level —
keine erfundenen Häkchen.

| Feature | Status | Testlevel | Bekannte Risiken | Manueller Schritt | LIVE VERIFIED |
|---|---|---|---|---|---|
| **PAYMENT (mm-commerce, One-Time 49 €)** | Code P10-fertig (Order-first, Claim-Schutz, exakte Preise) | STATIC + UNIT (43) + INTEGRATION (85 statisch) | **Live läuft noch der ALTE Stand** (event-first, min-Preis, kein Claim-Schutz). Bis zum Deploy: theoretische Fremd-Claim-Lücke (praktisch nicht ausnutzbar — einzige historische Capture ist 1 € ≠ 4900 Cent ⇒ amount_mismatch) | `supabase db push` + `supabase functions deploy mm-commerce` | **JA für den 1-€-E2E-Fluss (alter Code)**; neuer Code: NEIN |
| **AUTH (Edge, ES256)** | Standardisiert (_shared/edge.mjs) | STATIC + UNIT (Verhalten des echten Moduls) | keiner bekannt im Muster; mm-ai/delete-account erst nach Deploy wirksam | Functions deployen | mm-commerce-Muster: **JA** (Live-E2E); übrige: NEIN |
| **ENTITLEMENTS** | Server-only Writes, RLS aktiv, Grants versioniert | STATIC + REAL SUPABASE (Livetest) + UNIT (Claim/Replay) | Grants-Migration noch nicht auf Prod angewandt (manuell gesetzt — Migration reproduziert nur) | `supabase db push` | **JA** (1-€-E2E: Entitlement kam an) |
| **PREMIUM ACCESS (Vault + resolve-product-access)** | Auditiert, kein Bypass gefunden | STATIC + LIVE-Abrufe (Ciphertext-only bestätigt) | Legacy-Codes nicht widerrufbar (nur Rotation); ?code=-URL P3 | resolve-product-access redeployen (CORS-Fix) | Inhalte-Gating: **JA** (live geprüft); Function-Neustand: NEIN |
| **ACCOUNT (Login/Sync)** | produktiv | LIVE (Livetest nutzte echten Login) | — | — | **JA** |
| **DELETE ACCOUNT** | Auth gefixt, Analyse dokumentiert | STATIC | destruktiv — bewusst NICHT live getestet; alter Live-Stand hat ES256-Bug (würde 401 werfen, löscht also derzeit nichts) | Deploy + Test mit Wegwerf-Account | **NEIN** (bewusst) |
| **AI (mm-ai)** | Auth/CORS P10-gefixt | STATIC | alter Live-Stand wirft 401 (ANON_KEY-Bug) — Feature ist bis Deploy faktisch tot; danach: Provider-Key nötig | `supabase secrets set ANTHROPIC_API_KEY` + Deploy | **NEIN** |
| **TRACKER** | produktiv, Schlaf vorhanden | STATIC + INTEGRATION (Suiten) | — | — | Seiten live, Detailflüsse nicht einzeln live-geprüft |
| **SCORE / DECISION ENGINE** | deterministisch, Regeln eingefroren | UNIT (27, echte Engine) + INTEGRATION | — | — | Score-Seite live; Engine-Ausgaben nicht separat live-gemessen |
| **RECOVERY (Zahlung)** | Boot-Recovery (LIVE-verifiziert) + neuer Konto-Weg | Boot: LIVE · Konto-Weg: STATIC | Konto-Weg braucht neuen mm-commerce für vollen Claim-Schutz | mm-commerce deployen | Boot: **JA** · Konto-Weg: NEIN |
| **PWA/SW** | mm-v104, Network-first + ?v-Busting | STATIC + LIVE (Versionswechsel mehrfach live beobachtet) | — | — | **JA** (Cache-Rollout funktioniert nachweislich) |

## Absolute Erfolgskriterien der Phase — Selbstprüfung

1. PayPal-LIVE-Fix nicht regressiert: **JA** — Live-Stand unangetastet, neuer Code strikt additiv-härter, Tests decken den E2E-Kontrakt.
2. event_log_failed kann Kauf nicht mehr blockieren: **JA (Code + 43 Unit-Tests)** — wirksam live erst nach Deploy.
3. Capture nicht von zweitem User claimbar: **JA (Code + Tests)** — live erst nach Deploy.
4. Service-Role-Grants versioniert: **JA** (Migration 20260725000009).
5. mm-commerce-Tests bilden reale Fehlerfälle ab: **JA** (echte Logik, Fake-DB, 43 Fälle inkl. Races).
6. mm-ai auf ES256-Auth umgestellt: **JA** (Code; Deploy offen).
7. delete-account korrigiert, nicht destruktiv getestet: **JA**.
8. Alle Edge Functions mit dokumentiertem Auth-/CORS-Status: **JA** (EDGE_FUNCTIONS.md).
9. Premium Access real auf Bypass geprüft: **JA** (PREMIUM_ACCESS_AUDIT.md, live-curl).
10. Score-/Programm-/Tracker-Inkonsistenzen inventarisiert, Top-Fälle behoben/eingefroren: **JA** (score-engine.test.js; keine neuen P0/P1-Mismatches gefunden).
11. Kein Feature behauptet Nichtexistierendes: **im geprüften Umfang JA** (Foto-KI ungebworben & gated; Schlaf im Tracker real).
12. Ehrlicher Readiness-Bericht: dieses Dokument.
