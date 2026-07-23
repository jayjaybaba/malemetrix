# PRODUCTION ACTIVATION — Truth Matrix & Founder Checklist (Phase 9, §2/§90)

## Aktivierungs-Wahrheitsmatrix

Status: **LIVE+VERIFIED** · **REQUIRES CONFIG** (Architektur fertig, Founder-Aktion nötig) · **DEFERRED**

| Abhängigkeit | Config im Client? | Server konfiguriert? | Migrationen? | Function deployed? | Real getestet? | UI ehrlich? | Status |
|---|---|---|---|---|---|---|---|
| Supabase (Auth/Sync/RLS) | nein (leere Keys) | nein | 8 vorhanden, nicht angewandt | — | — | ja (lokaler Modus sichtbar) | **REQUIRES CONFIG** |
| PayPal (Kauf) | `"sb"` Sandbox | nein (mm-commerce) | — | nein | Sandbox-Flow | ja (Testmodus-Banner) | **REQUIRES CONFIG** |
| Vorkasse | — | E-Mail-Relay (FormSubmit) | — | — | — | ja (E-Mail-Hinweis statt Platzhalter) | **LIVE (degradiert)** |
| KI (mm-ai) | `AI_ENABLED` fehlt | nein (Provider-Key) | 0006 | nein | Validator gemockt | ja (deterministisch aktiv) | **REQUIRES CONFIG** |
| Push (VAPID + Scheduler) | kein `vapidPublicKey` | nein | 0005 | send-brief nein | Client-Handler | ja (In-App-Erinnerungen live) | **REQUIRES CONFIG** |
| Analytics (Plausible) | keine Domain | — | — | — | lokaler Funnel zählt | ja (lokal-only) | **REQUIRES CONFIG** |
| E-Mail (Brevo) | keine Action | Relay-Fallback | — | — | — | ja | **REQUIRES CONFIG** |
| Google Calendar OAuth | — | — | — | — | ICS-Import live | ja | **DEFERRED** |
| Abo-Rail (mm-commerce subs) | — | nein | 0008 | nein | Zustandsmaschine getestet | ja (nicht angeboten) | **REQUIRES CONFIG** |

**Diagnose zur Laufzeit:** in der Konsole `await MM.productionStatus()` → meldet
je Abhängigkeit configured/reachable, nie Secrets.

## FOUNDER-AKTIVIERUNGS-CHECKLISTE (eine Liste, exakte Schritte)

Jeder Schritt: **WO · WAS · VERIFY · ROLLBACK.**

### 1. Supabase-Projekt
- **WO:** supabase.com → New Project.
- **WAS:** Projekt-URL + Publishable Key in `js/config.js` (`supabaseUrl`,
  `supabasePublishableKey`). Niemals service_role in den Client.
- **VERIFY:** `await MM.productionStatus()` → `supabase.client_configured: true, reachable: true`.
- **ROLLBACK:** Felder leeren → App fällt in lokalen Modus zurück (kein Datenverlust).

### 2. Migrationen anwenden
- **WO:** lokal mit Supabase CLI.
- **WAS:** `supabase db push` (wendet 0001–0008 an).
- **VERIFY:** Tabellen `entitlements, orders, commerce_events, subscriptions, subscription_events, os_state, ...` existieren; RLS aktiv.
- **ROLLBACK:** je Migration dokumentierter Down-Pfad; 0007/0008 sind additiv (droppen bei Bedarf).

### 3. Edge Functions deployen
- **WO:** Supabase CLI.
- **WAS:** `supabase functions deploy mm-ai mm-commerce send-brief resolve-product-access delete-account`.
- **VERIFY:** Functions-Liste im Dashboard; 503 `provider_not_configured` bis Secrets gesetzt (erwartet).
- **ROLLBACK:** `supabase functions delete <name>`.

### 4. PayPal Live
- **WO:** developer.paypal.com → Live-App.
- **WAS:** Live-Client-ID → `config.js paypalClientId`; `supabase secrets set PAYPAL_CLIENT_ID=… PAYPAL_SECRET=… PAYPAL_ENV=live`.
- **VERIFY:** Testkauf → `orders.status='paid'` serverseitig, Entitlement gesetzt; `commerce_events` hat genau 1 Zeile; Doppel-Capture ⇒ `replay:true`.
- **ROLLBACK:** `paypalClientId:"sb"` (Sandbox) oder `""` (nur Vorkasse).

### 5. Delivery-Vault retiren (Reihenfolge schützt Alt-Kunden — SECURITY.md)
- **WAS:** (a) Alt-Kunden per Konto-Claim migrieren, (b) `node tools-dev/rotate-vault.mjs …` neuer Code, (c) `DELIVERY_VAULT`/`DK` aus `checkout.js` entfernen, SW bumpen.
- **VERIFY:** Alt-Code öffnet rotierte Inhalte NICHT; server-berechtigtes Konto öffnet via `resolveProductAccess`.
- **ROLLBACK:** bis Schritt (c) additiv; alter Pfad bleibt bis dahin funktionsfähig.

### 6. KI-Provider
- **WO:** Supabase Secrets.
- **WAS:** `supabase secrets set ANTHROPIC_API_KEY=…` (oder `OPENAI_API_KEY`); `config.js AI_ENABLED:true`.
- **VERIFY:** `MM.ai.status().state === "enabled"`; 20-Kategorien-Eval gegen echtes Modell laufen lassen (tools-dev/tests/phase8 als Vorlage, `invokeFunction` real).
- **ROLLBACK:** `AI_ENABLED:false` → deterministischer Fallback (Produkt voll funktionsfähig).

### 7. Push
- **WO:** `npx web-push generate-vapid-keys`.
- **WAS:** Public Key → `config.js vapidPublicKey`; Private + Scheduler-Secret → Supabase Secrets; Scheduler (Cron) auf `send-brief`.
- **VERIFY:** Subscribe → Testpush empfangen → Deep-Link öffnet richtiges Today; 410 ⇒ Subscription revoked.
- **ROLLBACK:** Scheduler stoppen; In-App-Erinnerungen bleiben.

### 8. Analytics
- **WO:** plausible.io.
- **WAS:** Domain hinzufügen → `config.js analytics.plausibleDomain`.
- **VERIFY:** Events erscheinen im Plausible-Dashboard; Lint-Test bestätigt keine Gesundheitswerte.
- **ROLLBACK:** Feld leeren → lokaler Funnel (`MM.funnel()`) bleibt.

### 9. Verifikation gesamt
- `await MM.productionStatus()` → alle beabsichtigten Abhängigkeiten `configured:true`.
- Produktions-Smoke (tools-dev, `BASE=https://www.malemetrix.com`) grün, 0 Konsolenfehler.
