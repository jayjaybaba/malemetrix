# PRODUCTION TRUTH MATRIX (Phase 9.5)

Sieben Zustände, nie kollabiert: **BUILT · DEPLOYED · CONFIGURED · VERIFIED ·
LIVE-REAL · BLOCKED-FOUNDER · DEFERRED.** Laufzeit-Diagnose: `await MM.productionStatus()`.

> Umgebungswahrheit: In dieser Build-/Test-Umgebung liegen **keine** externen
> Credentials (Supabase/PayPal-live/AI/Push/Analytics). Alles Cloud-Abhängige ist
> daher höchstens **CODE COMPLETE, NOT DEPLOYED** — nie als LIVE behauptet.

| Capability | Code | Config | Deployed | Real Service | Runtime Verified | Status |
|---|---|---|---|---|---|---|
| Deterministische App (Score→Map→Today→Intelligence) | ✅ | ✅ | ✅ | n/a | ✅ (Live-Smoke) | **LIVE + VERIFIED** |
| PWA / Offline / SW mm-v85 | ✅ | ✅ | ✅ | n/a | ✅ | **LIVE + VERIFIED** |
| Supabase Projekt / Auth / Magic Link | ✅ | ❌ | ❌ | ❌ | ❌ | **CODE COMPLETE, NOT DEPLOYED** |
| profiles / entitlements / score / program / os_state Sync | ✅ | ❌ | ❌ | ❌ | ❌ | **CODE COMPLETE, NOT DEPLOYED** |
| RLS (alle Nutzer-Tabellen) | ✅ (Schema) | ❌ | ❌ | ❌ | ❌ Statik ok, Runtime BLOCKED | **BLOCKED-FOUNDER** |
| delete-account / export | ✅ | ❌ | ❌ | ❌ | Export lokal ✅ | **PARTIAL** |
| PayPal Checkout | ✅ | `sb` | n/a | Sandbox | Sandbox-Flow ✅ | **FUNCTIONAL, REQUIRES CONFIG** |
| mm-commerce (Server-Verifikation + Idempotenz) | ✅ | ❌ | ❌ | ❌ | Logik getestet | **CODE COMPLETE, NOT DEPLOYED** |
| Vorkasse | ✅ | ⚠️ (E-Mail-Relay) | n/a | Relay | ehrlicher Fallback ✅ | **LIVE, DEGRADED** |
| Legacy Vault / Access Codes | ✅ | n/a | ✅ | n/a | AES-Grenze getestet | **LIVE (kompromittiert, Retire-Pfad steht)** |
| Billing-Zustandsmaschine | ✅ | n/a | n/a | n/a | 44+37 Assertions | **CODE COMPLETE** |
| subscriptions / subscription_events | ✅ (Migr. 0008) | ❌ | ❌ | ❌ | Statik ok | **CODE COMPLETE, NOT DEPLOYED** |
| AI Provider (mm-ai) | ✅ | ❌ | ❌ | ❌ | Validator gemockt | **CODE COMPLETE, NOT DEPLOYED** |
| AI Validator / Fallback | ✅ | ✅ | ✅ | n/a | 20-Kat. gemockt ✅ | **LIVE (deterministischer Fallback)** |
| Push subscription / send-brief / VAPID / Scheduler | ✅ | ❌ | ❌ | ❌ | Client-Handler ✅ | **CODE COMPLETE, NOT DEPLOYED** |
| Analytics (Plausible) | ✅ | ❌ | n/a | ❌ | lokaler Funnel ✅ | **FUNCTIONAL, REQUIRES CONFIG** |
| Funnel-Events (lokal) | ✅ | ✅ | ✅ | n/a | `MM.funnel()` ✅ | **LIVE + VERIFIED** |
| Email Lifecycle | ✅ (Relay) | ❌ | ❌ | ❌ | — | **REQUIRES CONFIG** |
| Knowledge Evidenz (5 verifizierte Quellen + Gate) | ✅ | ✅ | ✅ | n/a | ✅ | **LIVE + VERIFIED** |
| Trust/Methodik-Seite | ✅ | ✅ | ✅ | n/a | ✅ Live-Smoke | **LIVE + VERIFIED** |

## Was 100 Fremde MORGEN erleben würden (§31, ehrlich)

**Würde funktionieren:** Homepage, Score, Performance Map, das komplette
deterministische System (Today, Training, Nutrition, Labs, Advisor deterministisch,
Weekly Review, Simulator, Proof, Trust) — alles lokal-first, offline-fähig, ohne
Konto, 0 Konsolenfehler (live verifiziert). Kauf per **PayPal-Sandbox** (kein
echtes Geld) oder **Vorkasse** (Bankdaten per E-Mail). Evidenz-Zitate mit echten
Quellen.

**Würde NICHT funktionieren (bis Founder-Config):** geräteübergreifendes Konto,
echte Zahlung mit Server-Entitlement, KI-Sprachschicht, Push-Erinnerungen,
Server-Analytics/Funnel-Dashboard, E-Mail-Lifecycle.

**Könnten wir sicher Geld nehmen?** Rechtlich/technisch erst nach dem
PayPal-Live-Cutover (ACTIVATION.md Schritt 4) + Vault-Retirement (Schritt 5).
Bis dahin: Sandbox ist ehrlich als Testmodus markiert — es fließt bewusst kein
echtes Geld, statt es unsicher zu tun.
