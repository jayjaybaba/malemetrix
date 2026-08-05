# PRODUCTION TRUTH MATRIX

Sieben Zustände, nie kollabiert: **BUILT · DEPLOYED · CONFIGURED · VERIFIED ·
LIVE-REAL · BLOCKED-FOUNDER · DEFERRED.** Laufzeit-Diagnose: `await MM.productionStatus()`.

> **Stand: 05.08.2026 — von einer Session mit echten Produktions-Zugängen
> verifiziert** (Supabase Management API, Live-Site-Abgleich, anonyme
> REST-Proben). Die frühere Fassung (Phase 9.5) beschrieb eine Umgebung ohne
> Credentials und führte alles Cloud-Abhängige als NOT DEPLOYED — das ist
> überholt. Was hier steht, wurde am genannten Datum tatsächlich geprüft;
> die Prüfmethode steht jeweils dabei.

| Capability | Code | Config | Deployed | Real Service | Runtime Verified | Status |
|---|---|---|---|---|---|---|
| Deterministische App (Score→Map→Today→Intelligence) | ✅ | ✅ | ✅ | n/a | ✅ Live-Site = Repo (sw `mm-v174` identisch), Kernseiten HTTP 200 | **LIVE + VERIFIED** |
| PWA / Offline / Service Worker | ✅ | ✅ | ✅ | n/a | ✅ `mm-v174` live ausgeliefert | **LIVE + VERIFIED** |
| Supabase Projekt / Auth / Magic Link | ✅ | ✅ (`config.js`: URL + Publishable Key) | ✅ | ✅ `ACTIVE_HEALTHY` (PG 17, eu-central-1) | ✅ 5 Profile, 3 Entitlements real | **LIVE-REAL** |
| Migrationen (14) / Tabellen (21) | ✅ | ✅ | ✅ alle angewandt | ✅ | ✅ per Management API gelistet, RLS überall aktiv | **LIVE + VERIFIED** |
| RLS — anonyme Ebene | ✅ | ✅ | ✅ | ✅ | ✅ **05.08.: alle 14 Nutzer-/Geld-Tabellen + alle RPCs anonym 401/42501** (REST-Proben mit Publishable Key) | **LIVE + VERIFIED** |
| RLS — Cross-User (User A liest nicht B, authentifiziert) | ✅ (Policies) | ✅ | ✅ | ✅ | ❌ verlangt zwei echte Konten — bewusst nicht mit Wegwerf-Konten in Prod-Daten getestet | **BLOCKED-FOUNDER** (ACTIVATION.md §9) |
| Edge Functions (10) | ✅ | ✅ | ✅ alle ACTIVE (mm-commerce v22) | ✅ | Auth-Modell statisch geprüft (JWT+Owner-Rolle bzw. Service-Role) | **DEPLOYED + VERIFIED (statisch)** |
| PayPal Checkout | ✅ | ✅ Live-Client-ID in `config.js` | ✅ | Live-App | ⚠️ Echtkauf-Nachweis nicht in dieser Session | **CONFIGURED — Testkauf-Verify offen** |
| Stripe (Apple/Google Pay, Karte, Klarna) | ✅ | ✅ Payment Link live, `rk_live` (nur Checkout-Session lesen) in Supabase Secrets (30.07.) | ✅ | ✅ | ✅ 1 Bestellung + 1 `commerce_events`-Zeile in Prod | **LIVE-REAL** |
| mm-commerce (Server-Verifikation + Idempotenz) | ✅ | ✅ | ✅ v22 ACTIVE | ✅ | ✅ mind. 1 realer Durchlauf (orders/commerce_events) | **LIVE-REAL** |
| Vorkasse | ✅ | ❌ Bankdaten sind Platzhalter | n/a | Relay | ✅ Guard greift: Vorkasse wird **nicht angeboten**, solange Platzhalter stehen (`bankConfigured()`, checkout.js) | **EHRLICH DEGRADIERT — Founder: Bankdaten** |
| Legacy Vault / Access Codes | ✅ | n/a | ✅ | n/a | AES-Grenze getestet | **LIVE (kompromittiert, Retire-Pfad ACTIVATION.md §5 offen)** |
| Billing-Zustandsmaschine / subscriptions | ✅ | ✅ Migration 0008 angewandt | ✅ | ✅ Tabellen leer (kein Abo-Angebot aktiv) | Statik + 81 Assertions | **DEPLOYED, nicht angeboten** |
| AI Provider (mm-ai) | ✅ | ⚠️ Function ACTIVE; Provider-Key-Status nicht aus Repo ablesbar | ✅ | ? | `ai_request_log` leer | **DEPLOYED — Nutzung 0** |
| Übersetzung (mm-translate) | ✅ | ✅ | ✅ | ✅ | ✅ 796 Cache-Zeilen in Prod | **LIVE-REAL** |
| Telemetrie (site-telemetry / score-telemetry) | ✅ | ✅ | ✅ | ✅ | ✅ 558 `site_events`-Zeilen | **LIVE-REAL** (score_events noch 0) |
| Admin (mm-admin, Owner-Rolle) | ✅ | ✅ | ✅ | ✅ | ✅ 1 `user_roles`-Zeile (owner) | **LIVE-REAL** |
| Push subscription / send-brief / VAPID / Scheduler | ✅ | ❌ kein `vapidPublicKey` im Client | Function ACTIVE | ❌ | `push_subscriptions` leer | **REQUIRES CONFIG** |
| Analytics (Plausible) | ✅ | ❌ `plausibleDomain` leer | n/a | ❌ | lokaler Funnel ✅ | **REQUIRES CONFIG** |
| E-Mail-Liste (Brevo) | ✅ | ❌ `brevoFormAction` leer | n/a | ❌ | FormSubmit-Relay | **REQUIRES CONFIG** |
| Terminbuchung (Cal.com) | ✅ | ❌ `calLink` leer | n/a | ❌ | eingebauter Kalender läuft | **REQUIRES CONFIG** |
| Knowledge Evidenz (Gate) | ✅ | ✅ | ✅ | n/a | ✅ 2 PUBLISHED / 16 REVIEWED | **LIVE + VERIFIED** |

## Was 100 Fremde MORGEN erleben würden (§31, ehrlich — Stand 05.08.)

**Würde funktionieren:** die komplette deterministische App (lokal-first,
offline, ohne Konto), **echtes Konto mit Magic Link und Geräte-Sync**
(Supabase live), **echter Kauf** von DAS PROTOKOLL über den Stripe-Link
(Apple/Google Pay, Karte, Klarna) mit serverseitiger Verifikation und
automatischem Entitlement — mindestens ein realer Kauf ist durchgelaufen.
PayPal-Buttons erscheinen mit Live-Client-ID.

**Würde (noch) nicht funktionieren:** Vorkasse (wird mangels Bankdaten ehrlich
gar nicht angeboten), Push-Erinnerungen, Server-Analytics, automatische
E-Mail-Liste, Cal.com-Buchung.

**Offene Verifikationen (Founder):** ein dokumentierter PayPal-Live-Testkauf
(ACTIVATION.md §4 VERIFY), der Cross-User-RLS-Test mit zwei echten Konten
(§9), Vault-Retirement (§5).
