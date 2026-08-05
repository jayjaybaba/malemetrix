# SUPABASE PRODUCTION AUDIT

Statischer Audit von 8 Migrationen + 5 Edge Functions (Phase 9.5), am
**05.08.2026 ergänzt** um die Differenz (Migrationen 0009–0014, Functions
6–10) und erstmals um **Runtime-Befunde aus der echten Produktion** — siehe
Nachtrag unten.

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

---

## NACHTRAG 05.08.2026 — Delta-Audit + Runtime-Verifikation

Geprüft gegen das echte Projekt `vczhfyxltiyvtvppfodt` (Management API) und
per anonymen REST-Proben. Quelltext der Delta-Migrationen und -Functions
statisch gelesen.

### Projektzustand (Runtime, Management API)
- Projekt **ACTIVE_HEALTHY**, Postgres 17, eu-central-1.
- **Alle 14 Migrationen angewandt** — 21 Tabellen, RLS auf jeder.
- **Alle 10 Edge Functions ACTIVE** (`mm-commerce` in v22).
- Echte Nutzung: 5 profiles · 3 entitlements · 1 orders (paid-Pfad real
  durchlaufen) · 1 commerce_events · 558 site_events · 796 translations ·
  1 user_roles (owner).

### Migrationen 0009–0014 (statisch gelesen)
| Datei | Zweck | Bewertung |
|---|---|---|
| `0009_service_role_grants` | explizite Grants nur für service_role auf Geld-/Log-Tabellen | ✅ minimal, korrekt |
| `0010_score_telemetry` | `score_events`: pseudonym, ohne user_id/IP, jede Spalte CHECK-beschränkt, `revoke all from anon, authenticated` | ✅ vorbildlich (Idempotenz via unique event_id) |
| `0011_owner_roles_and_grants` | `user_roles` (nur service_role schreibt), `is_owner()` SECURITY DEFINER für RLS, `access_grants` | ✅ Begründung im Quelltext |
| `0012_restore_role_table_grants` | Grant-Reparatur | ✅ |
| `0013_site_events` | Site-Telemetrie, Schreibzugriff nur Edge Function | ✅ |
| `0014_translations` | Übersetzungs-Cache, keine Client-Policy, `translation_report()` intern owner-gated (`raise 'forbidden'`) | ✅ |

### Edge Functions 6–10 (statisch gelesen)
| Function | Auth-Modell | Befund |
|---|---|---|
| `mm-admin` | JWT via `auth.getUser` + Owner-Rolle aus `user_roles` | ✅ Identität nie aus dem Body |
| `mm-usage` | JWT + Owner-Rolle | ✅ |
| `mm-translate` | Service-Role intern; Budget-Wächter über env (`TRANSLATE_BUDGET_*`) | ✅ Kostendeckel |
| `site-telemetry` / `score-telemetry` | bewusst öffentlich beschreibbar; Tabellen-Constraints + Idempotenz begrenzen Missbrauch | ✅ akzeptiert (reine Zähldaten) |

Secret-Hygiene unverändert: alles aus `Deno.env`, nichts im Repo.

### Runtime-Proben (05.08., anonym mit Publishable Key)
Alle 14 Nutzer-/Geld-Tabellen **und** alle RPCs (`claim_access_code`,
`translation_report`, `is_owner`) antworten anonym mit **HTTP 401 /
`42501` permission denied** — die anonyme Angriffsfläche ist auf
Privilegien-Ebene geschlossen, nicht erst durch RLS-Leerergebnisse.
**Cross-User-Test (authentifiziert, A liest nicht B) bleibt offen** —
ACTIVATION.md §9.

### Security Advisor (05.08.)
- 8× INFO „RLS enabled no policy" — **bewusst**: Service-Role-only-Tabellen
  (access_codes, Logs, Events, translations). Keine Aktion.
- 3× WARN „SECURITY DEFINER executable by authenticated":
  `claim_access_code` (gewollt — das ist der Claim-Pfad),
  `translation_report` (intern owner-gated, wirft `forbidden`),
  `is_owner` (von RLS-Policies benötigt; gibt nur boolean zurück).
  **Alle drei akzeptiert mit Begründung** — siehe SECURITY.md.
- 1× WARN „Leaked password protection disabled" → Founder-Schalter,
  ACTIVATION.md §10.
