# EDGE FUNCTIONS — Auth-/CORS-/Deploy-Status (Phase 10)

Stand: 2026-07-23, **Statusmatrix aktualisiert 05.08.2026** (live nachgemessen via `check-functions.sh` — alle 6 gemessenen Functions AKTUELL; insgesamt sind 10 Functions ACTIVE, die 4 neueren — mm-admin, mm-usage, mm-translate, site-telemetry — auditiert in SUPABASE_PRODUCTION_AUDIT.md, Nachtrag). Projekt `vczhfyxltiyvtvppfodt` · Verbindlicher Standard: `supabase/functions/_shared/edge.mjs`

## Warum dieser Standard existiert

Das Projekt nutzt **asymmetrische Signing Keys (ES256)** + Publishable Keys.
Zwei Fehlerklassen haben deshalb live 401/Blockaden erzeugt:

1. **Platform `verify_jwt`** kann ES256-User-Tokens nicht prüfen → 401 VOR dem
   Handler. Fix: `verify_jwt = false` in `config.toml` + Auth **im Handler**.
2. **Alter Handler-Auth-Stil** (`ANON_KEY`-Client + `getUser()` ohne Token)
   liefert in diesem Projekt-Typ keinen User. Fix: Bearer extrahieren →
   `service.auth.getUser(jwt)` (server-autoritativ, keine ungeprüften Claims).

CORS: supabase-js sendet `authorization + apikey + x-client-info + content-type`
→ Browser-Preflight (OPTIONS) MUSS 204 + genau diese Header liefern, sonst wird
der POST nie gesendet. Seit P10: **Origin-Allowlist** (`https://www.malemetrix.com`,
`https://malemetrix.com`) statt Wildcard, `vary: origin`.

## Statusmatrix

> **Stand 25. Juli 2026, live nachgemessen** — nicht aus dem Gedächtnis dokumentiert.
> Ein OPTIONS-Preflight zeigt, ob der P10-Stand ausgerollt ist: die P10-Allowlist
> antwortet mit `access-control-allow-headers: authorization, apikey, x-client-info,
> content-type`. Vier von fünf Functions liefern genau das. Frühere Fassungen dieser
> Datei behaupteten „Deploy nötig" für alle vier — das war überholt und hätte zu
> unnötigen Redeploys oder falscher Fehlersuche geführt.
> Jederzeit nachprüfbar: `bash tools-dev/check-functions.sh`

| Function | Aufrufer | Auth | CORS | verify_jwt | Code-Stand | Deployt? |
|---|---|---|---|---|---|---|
| `mm-commerce` | Browser (checkout) | ✅ Standard (Handler, getUser(jwt)) | ✅ Allowlist, OPTIONS→204 | `false` ✅ | P10 Order-first-Fulfillment (fulfillment.mjs, 43 Unit-Tests) | ✅ **JA** — live verifiziert 25.07.2026 (OPTIONS liefert die P10-Allowlist inkl. `apikey, x-client-info`) |
| `resolve-product-access` | Browser (Premium-Unlock) | ✅ Standard | ✅ Allowlist (P10: apikey/x-client-info ergänzt, Apex ergänzt) | `false` ✅ | P10 | ✅ **JA** — live verifiziert 25.07.2026 (vollständige CORS-Header vorhanden) |
| `mm-ai` | Browser (Intelligence) | ✅ Standard (P10-Fix — vorher ANON_KEY-Bug, hätte live 401 geworfen) | ✅ Allowlist (P10 — vorher GAR KEINE CORS-Header) | `false` ✅ (P10) | P10 | ✅ **JA** — live verifiziert 25.07.2026 (CORS-Header vorhanden ⇒ P10-Stand ist ausgerollt) |
| `delete-account` | Browser (Konto) | ✅ Standard (P10-Fix — vorher ANON_KEY-Bug) | ✅ Allowlist (P10 — vorher fehlten apikey/x-client-info/Apex) | `false` ✅ (P10) | P10 | ✅ **JA** — live verifiziert 25.07.2026. **DESTRUKTIV** — siehe unten |
| `score-telemetry` | Browser (Score, anonym) | bewusst KEINE User-Auth — der Score ist anonym nutzbar; Schutz über Allowlist-Validierung (validate.mjs), Origin-Allowlist, Idempotenz (event_id), RLS ohne Policy | ✅ Allowlist, OPTIONS→204, akzeptiert zusätzlich text/plain (sendBeacon) | `false` ✅ | P12 neu (127 Unit-Tests) | ✅ **JA — live nachgemessen 05.08.2026** (`check-functions.sh`: P10-Allowlist aktiv). Die frühere Zeile „NEIN, 404" beschrieb den Stand vor dem Deploy. |
| `send-brief` | Scheduler (server→server) | ✅ `x-scheduler-secret` (kein User-JWT, bewusst) | n. a. (kein Browser-Aufruf) | `false` ✅ (P10 — nötig, damit der Scheduler ohne JWT durchkommt) | unverändert | Push-Stack insgesamt CONFIG REQUIRED (VAPID) |
| `mm-transform` | Browser (transformation.html) | ✅ Standard (Handler, getUser(jwt)) + eigenes Rate-Limit (12 Bilder/h/User über ai_request_log, task BODY_TRANSFORM) | ✅ Allowlist, OPTIONS→204 | `false` ✅ | Neu 05.08.2026 — Körper-Transformation via fal.ai (Details: TRANSFORMATION.md) | ✅ **JA — deployt & live nachgemessen 05.08.2026** (OPTIONS→204 mit P10-Allowlist, POST ohne Auth→401 `auth_missing`). **Aber CONFIG REQUIRED:** Secret `FAL_KEY` fehlt noch — bis dahin antwortet die Function ehrlich mit `provider_not_configured`; die Seite zeigt das als Klartext an. |

**Secrets-Konvention:** `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (Standard).
`delete-account` akzeptiert übergangsweise auch das ältere `SERVICE_ROLE_KEY`.
Service-Role-Key existiert NUR als Function-Secret — nie im Repo/Client/Log.

**Fehlercodes (einheitlich):** `auth_missing` (kein Bearer) · `auth_invalid_token`
(getUser lehnt ab) · `auth_validation_failed` (Prüfung selbst schlug fehl) —
alle 401. Fachliche Codes je Funktion dokumentiert im jeweiligen Quellcode.

## delete-account: Destruktivitäts-Analyse (P0.8)

- Identität kommt **nur** aus dem validierten JWT (`user.id`) — eine fremde
  user_id kann strukturell nicht gelöscht werden. `{ confirm: true }` Pflicht.
- **CASCADE** (fällt mit dem Account): profiles, entitlements, score_results,
  program_cycles, lab_*, push_subscriptions, push_delivery_log, ai_request_log,
  subscriptions.
- **BLEIBT (anonymisiert):** `orders` — FK `on delete set null`. Bezahlte
  Bestellungen bleiben als Belege (Aufbewahrungspflicht) ohne Personenbezug.
  Verwaiste Orders sind nicht erneut claimbar (`payment_already_claimed`).
- **BLEIBT:** commerce_events / subscription_events (kein Personenbezug).
- Live-Test der Löschung: **bewusst NICHT durchgeführt** (kein echter User wird
  gelöscht). Testlevel: STATIC + Code-Review. Vor Produktivnutzung: einen
  Wegwerf-Testaccount anlegen und löschen.

## Deploy-Reihenfolge (manuell, bewusst nicht automatisiert)

```bash
# 1) Migration (Grants) — im SQL-Editor oder:
supabase db push

# 2) Functions (config.toml wird beim Deploy mitgelesen):
supabase functions deploy mm-commerce
supabase functions deploy resolve-product-access
supabase functions deploy mm-ai
supabase functions deploy delete-account
supabase functions deploy send-brief
```

Nach dem mm-commerce-Deploy: Kauf-Recovery mit der historischen Capture-ID
(nur lesend, `9R3786567S503141K`-Transaktion) prüfen — erwartet `ok:true,
replay:true`, keine neue Order, kein Doppel-Entitlement.
