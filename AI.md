# MaleMetrix KI-Schicht — ehrliche Status-Klassifikation (Phase 7)

## Architektur (LAYER 3 — Sprache/Synthese, nie Wahrheitsquelle)
Client `MM.ai` (js/os/intelligence/ai.js) → Edge Function `mm-ai` (JWT-Auth,
Rate-Limit via `ai_request_log`, Task-Routing, Anthropic/OpenAI-Adapter) →
Antwort wird CLIENTSEITIG validiert (Zahlen-Grounding, verbotene Inhalte,
kein KEEP-Widerspruch, keine Zitations-Halluzination) → sonst deterministischer
Fallback. Cache: Task × Kontext-Fingerprint × Knowledge-Version.

| Baustein | Status |
|---|---|
| MM.ai Contract, Routing, Budget, Cache, Validator, Fallback | FUNCTIONAL LOCAL |
| Edge Function mm-ai (Auth/Rate-Limit/Provider-Adapter) | CODE COMPLETE |
| Provider-Keys (`ANTHROPIC_API_KEY` o. `OPENAI_API_KEY`) + Deploy | **CONFIG REQUIRED** |
| Migration 0006 `ai_request_log` (service-only RLS) | CODE COMPLETE |

## Aktivierung
1. `supabase secrets set ANTHROPIC_API_KEY=…` (oder OPENAI_API_KEY)
2. `supabase functions deploy mm-ai` · Migration 0006 anwenden
3. `js/config.js`: `MM_CONFIG.AI_ENABLED = true`
4. Rollback (§290): Flag auf false — Produkt bleibt voll deterministisch.

## Nicht verhandelbar
Keine Secrets im Client · KI erfindet keine Nutzerdaten/Quellen · keine
Diagnosen/Dosierungen · deterministische Entscheidung ist bindend ·
Consent-Hinweis in Einstellungen, bevor externer Provider Kontext erhält (§171).
Provider-Retention: gemäß Provider-Vertrag — keine eigenen Zusagen (§173).
