# PRODUCTION ACTIVATION — Truth Matrix & Founder Checklist

> **Aktualisiert am 05.08.2026** nach Verifikation gegen die echte Produktion
> (Supabase Management API + Live-Site + anonyme REST-Proben). Die Schritte
> 1–3 sind vollzogen, Schritt 4 zur Hälfte. Details: `PRODUCTION_TRUTH.md`.

## Aktivierungs-Wahrheitsmatrix

Status: **LIVE+VERIFIED** · **REQUIRES CONFIG** (Architektur fertig, Founder-Aktion nötig) · **DEFERRED**

| Abhängigkeit | Config im Client? | Server konfiguriert? | Migrationen? | Function deployed? | Real getestet? | UI ehrlich? | Status |
|---|---|---|---|---|---|---|---|
| Supabase (Auth/Sync/RLS) | ✅ URL + Publishable Key | ✅ `ACTIVE_HEALTHY` | ✅ alle 14 angewandt | ✅ 10 ACTIVE | ✅ echte Profile/Entitlements; Anon-RLS-Proben 05.08. bestanden | ja | **LIVE-REAL** |
| Stripe (Kauf) | ✅ Payment Link | ✅ `rk_live` (nur Session lesen) | 0007 ✅ | mm-commerce v22 ✅ | ✅ 1 realer Kauf (orders/commerce_events) | ja | **LIVE-REAL** |
| PayPal (Kauf) | ✅ Live-Client-ID | PAYPAL_*-Secrets: siehe §4 | — | mm-commerce ✅ | ⚠️ Live-Testkauf noch nicht dokumentiert | ja | **CONFIGURED — VERIFY offen (§4)** |
| Vorkasse | ❌ Bankdaten = Platzhalter | E-Mail-Relay (FormSubmit) | — | — | Guard: wird ohne echte Bankdaten nicht angeboten | ja | **AUS — Founder: Bankdaten (§4b)** |
| KI (mm-ai) | deterministischer Fallback aktiv | Provider-Key: prüfen | 0006 ✅ | ✅ ACTIVE | `ai_request_log` leer | ja | **DEPLOYED — Nutzung 0** |
| Übersetzung (mm-translate) | ✅ | ✅ | 0014 ✅ | ✅ | ✅ 796 Cache-Zeilen | ja | **LIVE-REAL** |
| Telemetrie (site/score) | ✅ | ✅ | 0010/0013 ✅ | ✅ | ✅ 558 site_events | ja | **LIVE-REAL** |
| Push (VAPID + Scheduler) | kein `vapidPublicKey` | nein | 0005 ✅ | send-brief ✅ | Client-Handler | ja (In-App-Erinnerungen live) | **REQUIRES CONFIG** |
| Analytics (Plausible) | keine Domain | — | — | — | lokaler Funnel zählt | ja (lokal-only) | **REQUIRES CONFIG** |
| E-Mail (Brevo) | keine Action | Relay-Fallback | — | — | — | ja | **REQUIRES CONFIG** |
| Terminbuchung (Cal.com) | kein `calLink` | — | — | — | eingebauter Kalender läuft | ja | **REQUIRES CONFIG** |
| Google Calendar OAuth | — | — | — | — | ICS-Import live | ja | **DEFERRED** |
| Abo-Rail (mm-commerce subs) | — | ✅ deployt | 0008 ✅ | ✅ | Zustandsmaschine getestet, Tabellen leer | ja (nicht angeboten) | **DEPLOYED, nicht angeboten** |

**Diagnose zur Laufzeit:** in der Konsole `await MM.productionStatus()` → meldet
je Abhängigkeit configured/reachable, nie Secrets.

## FOUNDER-AKTIVIERUNGS-CHECKLISTE (eine Liste, exakte Schritte)

Jeder Schritt: **WO · WAS · VERIFY · ROLLBACK.**

### 1. Supabase-Projekt ✅ ERLEDIGT (23.07., verifiziert 05.08.)
- **WO:** supabase.com → New Project.
- **WAS:** Projekt-URL + Publishable Key in `js/config.js` (`supabaseUrl`,
  `supabasePublishableKey`). Niemals service_role in den Client.
- **VERIFY:** `await MM.productionStatus()` → `supabase.client_configured: true, reachable: true`.
- **ROLLBACK:** Felder leeren → App fällt in lokalen Modus zurück (kein Datenverlust).

### 2. Migrationen anwenden ✅ ERLEDIGT (alle 14 angewandt, 21 Tabellen mit RLS — verifiziert 05.08.)
- **WO:** lokal mit Supabase CLI.
- **WAS:** `supabase db push` (wendet 0001–0008 an).
- **VERIFY:** Tabellen `entitlements, orders, commerce_events, subscriptions, subscription_events, os_state, ...` existieren; RLS aktiv.
- **ROLLBACK:** je Migration dokumentierter Down-Pfad; 0007/0008 sind additiv (droppen bei Bedarf).

### 3. Edge Functions deployen ✅ ERLEDIGT (10 Functions ACTIVE — verifiziert 05.08.)
- **WO:** Supabase CLI.
- **WAS:** `supabase functions deploy mm-ai mm-commerce send-brief resolve-product-access delete-account`.
- **VERIFY:** Functions-Liste im Dashboard; 503 `provider_not_configured` bis Secrets gesetzt (erwartet).
- **ROLLBACK:** `supabase functions delete <name>`.

### 4. PayPal Live ⚠️ HALB — Client-ID gesetzt, VERIFY offen
- **WO:** developer.paypal.com → Live-App.
- **WAS (erledigt):** Live-Client-ID steht in `config.js paypalClientId`.
- **WAS (offen):** prüfen, dass `PAYPAL_CLIENT_ID/PAYPAL_SECRET/PAYPAL_ENV=live`
  als Supabase Secrets gesetzt sind, dann der dokumentierte Testkauf.
- **VERIFY:** Testkauf → `orders.status='paid'` serverseitig, Entitlement gesetzt; `commerce_events` +1 Zeile; Doppel-Capture ⇒ `replay:true`. (Stripe hat diesen Nachweis bereits: 1 realer Kauf in Prod.)
- **ROLLBACK:** `paypalClientId:"sb"` (Sandbox) oder `""` (nur Vorkasse/Stripe).

### 4b. Vorkasse aktivieren — NUR Founder (Bankdaten)
- **WO:** `js/config.js` → `bank` (`inhaber`, `iban`, `bank`).
- **WAS:** echte Kontodaten eintragen. Solange Platzhalter stehen, bietet der
  Checkout Vorkasse bewusst **nicht** an (`bankConfigured()`-Guard) — es kommt
  also nichts Kaputtes beim Kunden an, es fehlt nur der Zahlweg.
- **VERIFY:** Checkout zeigt Vorkasse als Option; Bestellbestätigung nennt IBAN.
- **ROLLBACK:** Platzhalter wiederherstellen → Option verschwindet wieder.

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
- Produktions-Smoke: `bash tools-dev/production-smoke.sh` — misst Seiten,
  Edge Functions, anonyme RLS-Oberfläche und SW-Version in einem Lauf
  (**GRÜN am 05.08.2026**; läuft täglich als GitHub Action, sobald die
  Workflow-Datei auf dem Default-Branch liegt).
- **Anon-RLS: ✅ bestanden (05.08.2026).** Anonyme REST-Proben mit dem
  Publishable Key gegen alle 14 Nutzer-/Geld-Tabellen und die RPCs
  (`claim_access_code`, `translation_report`, `is_owner`) → durchgängig
  HTTP 401 / `42501`. Nichts ist anonym lesbar.
- **Cross-User-RLS (offen, braucht Founder):** mit **zwei echten Konten**
  (A und B) je anmelden und prüfen, dass A per REST (`profiles`, `os_state`,
  `orders`, `entitlements` mit A-JWT) ausschließlich eigene Zeilen sieht.
  Bewusst nicht mit Wegwerf-Konten automatisiert, um keine Kunstdaten in
  Produktions-Tabellen zu hinterlassen.

### 10. Auth-Härtung (Dashboard, 2 Minuten)
- **WO:** Supabase Dashboard → Authentication → Passwords.
- **WAS:** „Leaked password protection" (HaveIBeenPwned-Abgleich) aktivieren.
  Der Login läuft zwar über Magic Links, der Schalter kostet aber nichts und
  schließt den Advisor-WARN.
- **VERIFY:** Security Advisor zeigt die Warnung nicht mehr.
