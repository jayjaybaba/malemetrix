# NIGHT REPORT — Phase 10: Production Foundation

Datum: 2026-07-23 · Branch: `claude/malemetrix-phase-6-execution-przdvm` (master/main synchron)

## Executive Summary

Der nach dem 1-€-PayPal-LIVE-Test verbliebene gefährlichste Zustand — die
Event-first-Fulfillment-Regression in mm-commerce — ist behoben, unit-getestet
und committet, aber **bewusst noch nicht deployt** (ein manueller
`supabase`-Befehl, siehe unten). Zusätzlich: Capture-Claim-Schutz geschlossen,
Preise/Währung exakt server-autoritativ, Service-Role-Grants versioniert,
alle 5 Edge Functions auf einen einheitlichen ES256-Auth-/CORS-Standard
gebracht, produktionsreife Konto-Recovery gebaut, Premium-Access real auf
Bypässe geprüft (keiner gefunden), Score-Engine auditiert und mit 27
Verhaltenstests eingefroren. Gesamtsuite: **791 Tests, 0 Fehler** über 15 Suiten.

## Ausgangszustand

- 1-€-PayPal-LIVE-E2E erfolgreich (Zahlung → Server-Verify → Order →
  Entitlement → Replay ohne Doppelzugriff). Live-Stand funktioniert.
- Repo-Stand a8f6f56: Testpfad sauber entfernt, ABER mm-commerce trug wieder
  die Event-first-Reihenfolge (der Bug, der live einen bezahlten Kauf
  blockiert hatte) — deshalb galt: NICHT deployen.
- mm-ai + delete-account: bekannter ES256-Auth-Bug (ANON_KEY + getUser() ohne
  Token) — live faktisch tot (401).

## P0 Findings (verifiziert, nicht vermutet)

1. **Fulfillment-Reihenfolge falsch** (index.ts): commerce_events-Insert vor
   Order/Entitlement; Nicht-Duplikat-Fehler ⇒ `event_log_failed` ⇒ Kunde
   bezahlt, kein Zugang. → behoben.
2. **Claim-Lücke** (P0.1): Existing-Order-Check verglich `user_id` nicht —
   ein zweiter Account hätte mit fremder Capture-ID Entitlements bekommen
   können. → behoben (409 `payment_already_claimed`, auch für verwaiste
   Orders; Races über UNIQUE + Refetch + erneutem Claim-Check).
3. **Preise nur als Minimum, Währung ungeprüft** (P0.2): `paid < min` statt
   exakt; USD wäre durchgegangen; unbekannte IDs still ignoriert. → exakter
   Betrag (4900), EUR erzwungen, `unknown_product`, Dedupe.
4. **mm-ai ohne CORS + ES256-Bug**; **delete-account ES256-Bug + unvollständige
   Preflight-Header + Nicht-Standard-Secret-Name**; **resolve-product-access
   Preflight ohne apikey/x-client-info + ohne Apex-Origin**. → alle behoben.
5. **Grants nur manuell im Dashboard** — nicht reproduzierbar. → Migration.

## Security Fixes

- Capture-Claim-Schutz (payment_already_claimed, order_conflict bei
  manipuliertem Replay: Betrag/Währung/Produkte/Status).
- CORS: Wildcard → Origin-Allowlist (www + Apex) mit `vary: origin`, überall
  Preflight 204 + vollständige supabase-js-Header.
- delete-account: Identität nur aus validiertem JWT; `{confirm:true}` Pflicht;
  Aufbewahrung: bezahlte Orders bleiben anonymisiert (FK `set null`) —
  Löschung und gesetzliche Aufbewahrung logisch getrennt.
- Keine Secrets im Repo (geprüft); Service-Role nur als Function-Secret.

## Commerce Fixes

Verbindliche Reihenfolge (fulfillment.mjs, von index.ts importiert, identischer
Code in Deno und Node-Tests):
`PAYPAL VERIFIED → ORDER (unique provider,provider_ref) → ENTITLEMENTS
(unique user_id,product_key) → AUDIT best effort (audit_logged:false statt
Blockade)`. commerce_events ist nur noch Tracing. Client-Fehlertexte für alle
neuen Codes ergänzt.

## Auth Fixes

Einheitliches Muster in `_shared/edge.mjs`: Bearer extrahieren →
`service.auth.getUser(jwt)` → 401-Codes auth_missing/auth_invalid_token/
auth_validation_failed. `verify_jwt=false` für alle 5 Functions in config.toml
dokumentiert (macht nichts öffentlich — Handler erzwingen Auth). send-brief
bleibt bewusst Scheduler-Secret-basiert.

## Premium Access Findings

Kein Bypass gefunden (PREMIUM_ACCESS_AUDIT.md, 7 Hypothesen, Live-curls):
Premium-Inhalte ausschließlich AES-256-GCM-Ciphertext (live bestätigt),
Schlüsselmaterial nur gegen DB-geprüftes Entitlement, localStorage öffnet nur
UI. Ehrliche Grenzen dokumentiert (Legacy-Codes nur per Rotation widerrufbar,
?code=-URL P3, Client-Krypto ≠ DRM). Asset-Rollen kategorisiert
(PAID/FREE/LEAD MAGNET/INTERN) — keine Pseudo-Paywall.

## Score / Product Findings

- goalDecision ist deterministisch, trennt GOAL von BOTTLENECK, priorisiert
  Körperfett korrekt, hat Red-Flag-Vorrang und High-Intent-Coaching-Trigger.
  Der gemeldete Realfehler („Bauch stört → BUILD") ist im aktuellen Code nicht
  reproduzierbar und jetzt per Test unmöglich gemacht.
- Keine Fake-Claims gefunden: Foto-Kalorien-KI wird nicht beworben (Feature
  unsichtbar bis konfiguriert), Schlaf existiert im Tracker.

## Implemented Features

- Konto-seitige Zahlungs-Recovery („Mit PayPal bezahlt, aber kein Zugang?"):
  nur eingeloggt, Transaktions-ID → server-autoritative Prüfung, löst nie
  eine Zahlung aus, kein URL-Backdoor. SW mm-v104.

## Tests

| Bereich | STATIC | UNIT | INTEGRATION | LIVE |
|---|---|---|---|---|
| Commerce-Fulfillment | ✓ (commerce-e2e 85) | ✓ (43, echte Logik) | ✓ (Suiten) | alter Fluss ✓ / neuer Code ✗ (Deploy offen) |
| Edge-Auth/CORS | ✓ | ✓ (echtes _shared-Modul, 51) | — | mm-commerce-Muster ✓ |
| Premium Access | ✓ | — | — | ✓ (Ciphertext-only live) |
| Score-Engine | ✓ | ✓ (27, echte Engine) | ✓ | ✗ |
| Gesamt | **15 Suiten · 791 PASS · 0 FAIL** ||||

## Commits (diese Phase)

- `f46efff` Fix commerce regression after verified PayPal LIVE E2E (Kern)
- `5a84ee0` P0.5–P0.8 Grants-Migration, _shared/edge.mjs, mm-ai/delete-account/
  resolve-product-access-Fixes, config.toml, EDGE_FUNCTIONS.md, 51 Tests
- `eaa2567` P0.10 Konto-Recovery ohne Backdoor, SW mm-v104
- `1348bb8` P1/P4.1 Premium-Access-Audit (Repo + Live)
- `696eb99` P2 Score-Engine-Verhaltenstests (27)
- (+ Readiness/Night-Report-Commit)

## Deployments

- **Deployt (GitHub Pages, automatisch über master):** alle Client-Änderungen
  (checkout-Fehlertexte, Konto-Recovery-UI, SW mm-v104).
- **NICHT deployt (bewusst — nur du kannst das):** mm-commerce,
  resolve-product-access, mm-ai, delete-account, send-brief, DB-Migration.

## Manual Actions Required (Copy-Paste, in dieser Reihenfolge)

```bash
# 1) DB-Migration (Grants — reproduziert den manuell gesetzten Live-Zustand):
supabase db push

# 2) Der wichtigste Deploy — schließt Event-first-Regression + Claim-Lücke:
supabase functions deploy mm-commerce

# 3) Zugriffs-/Auth-Fixes:
supabase functions deploy resolve-product-access
supabase functions deploy mm-ai
supabase functions deploy delete-account
supabase functions deploy send-brief

# 4) Nur falls mm-ai genutzt werden soll:
supabase secrets set ANTHROPIC_API_KEY=<dein-key>
```

Danach (nur lesend, keine neue Zahlung): im Konto „Zahlung prüfen" mit der
historischen Transaktions-ID `9R3786567S503141K` → erwartet ist eine
**Ablehnung** (amount_mismatch: 1 € ≠ 49 €-Produkt) — das beweist live, dass
exakte Preisprüfung + Claim-Schutz aktiv sind, ohne etwas zu verändern.

## Risks Remaining

- **P0 (bis Deploy):** Live-mm-commerce hat weiter Event-first + Min-Preis +
  fehlenden Claim-Schutz. Praktisch kaum ausnutzbar (einzige historische
  Capture scheitert an amount_mismatch; künftige Capture-IDs sind nur dem
  Zahler bekannt) — aber jeder Tag ohne Deploy ist unnötiges Risiko.
- **P1:** delete-account nach Deploy einmal mit Wegwerf-Account verifizieren.
- **P2:** mm-ai Kostenkontrolle ist Rate-Limit-basiert (30/h/User) — vor
  breiter Aktivierung Budget-Alarm beim Provider setzen. i18n weiterhin
  PARTIAL (Homepage-Fundament).
- **P3:** ?code=-URL-Einstieg (kurs-programm) auf Eingabefeld umstellen;
  Legacy-Vault-Rotationslauf einmal durchspielen; Coaching-/Bloodwork-/
  Nutrition-Ausbau (P2.2–P3.2 des Briefs) noch nicht vertieft.

## Next Phase (größter Hebel)

1. **Deploy-Fenster** (5 Kommandos oben) + Live-Verifikation der Recovery-
   Ablehnung — erst damit ist P0 wirklich „in Produktion".
2. **My MaleMetrix als Cockpit (P1.1)** + 12-Wochen-Differenzierung (P2.2):
   größter Produkt-/Retention-Hebel, jetzt auf sicherem Fundament.
3. **i18n-Fertigstellung (P5)** vor Reichweiten-Ausbau.
