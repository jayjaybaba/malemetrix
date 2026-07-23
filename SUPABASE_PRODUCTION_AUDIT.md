# SUPABASE PRODUCTION AUDIT (Phase 9.5, §2.1)

Statischer Audit aller 8 Migrationen + 5 Edge Functions. **Runtime-Verifikation
BLOCKED** (keine Projekt-Credentials) — nichts wird als live behauptet.

## Migrationen

| Datei | Zweck | Abhängigkeiten | RLS | Risiko | Rollback |
|---|---|---|---|---|---|
| `0001_init` | profiles, entitlements, score_results, program_cycles | auth.users | ✅ own-read; entitlements Schreiben nur Service-Role | niedrig | drop tables |
| `0002_claim_rpc` | `claim_access_code(text)` RPC (gehashter Token) | entitlements | execute nur authenticated | niedrig | drop function |
| `0003_os_state` | generische os_state (user_id+domain) | auth.users | ✅ own | niedrig | drop table |
| `0004_labs` | Labor-Domänen | os_state-Muster | ✅ own | niedrig | drop |
| `0005_push_subscriptions` | Push-Subscriptions | auth.users | ✅ own; Service liest zum Senden | mittel (PII: Endpoint) | drop |
| `0006_phase7_ai_push` | ai_request_log, push_delivery_log | auth.users | ✅ RLS, **keine** authenticated-Policy (Service-only) | niedrig | drop |
| `0007_phase8_commerce` | orders, commerce_events | auth.users | orders own-read/Service-write; events Service-only, unique(provider,event_id) | mittel (Geld) | additiv, drop |
| `0008_phase9_subscriptions` | subscriptions, subscription_events | auth.users | subs own-read/Service-write; events Service-only, unique | mittel (Geld) | additiv, drop |

**Reihenfolge/Idempotenz:** alle `create table if not exists` + `drop policy if
exists` vor `create policy` — mehrfaches Anwenden ist sicher. Fremdschlüssel auf
`auth.users(id)` mit `on delete cascade` (bzw. `set null` bei orders) → saubere
Konto-Löschung.

## Edge Functions

| Function | Auth | Secrets (nur Server) | Zweck |
|---|---|---|---|
| `mm-ai` | verify_jwt | ANTHROPIC_API_KEY / OPENAI_API_KEY | KI-Sprachschicht, Rate-Limit, Validierung |
| `mm-commerce` | JWT (getUser) | PAYPAL_CLIENT_ID/SECRET, SERVICE_ROLE_KEY | Kauf- + Abo-Verifikation, Entitlement-Vergabe, Idempotenz |
| `resolve-product-access` | JWT | SERVICE_ROLE_KEY, Vault-Material | Entitlement→Material serverseitig |
| `send-brief` | x-scheduler-secret | VAPID_*, SCHEDULER_SECRET | Push-Versand, Dedup, DISCREET |
| `delete-account` | JWT | SERVICE_ROLE_KEY | Kaskadenlöschung nach Policy |

**Secret-Hygiene:** kein Secret in Migrationen, Functions-Quelltext lädt alle aus
`Deno.env` — nichts im Repo (verifiziert per Scan). Publishable/Anon-Key ist
clientseitig erlaubt.

## RLS Red-Team (§3) — STATISCH bestanden, RUNTIME BLOCKED

Statisch verifiziert: jede Nutzer-Tabelle hat `enable row level security` + eine
`using (user_id = auth.uid())`-Lesepolicy; Schreibpfade laufen über Service-Role
(kein `insert/update` für `authenticated` auf Geld-/Log-Tabellen). Die
**Laufzeit**-Prüfung (User A liest nicht User B über echte Requests) verlangt ein
laufendes Projekt und ist als **BLOCKED-FOUNDER** markiert — ACTIVATION.md
Schritt 2/9 enthält den exakten Verifikationsbefehl nach dem Deploy.
