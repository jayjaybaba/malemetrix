# COMMERCE — Status & Aktivierung (Phase 8)

## Ehrlicher Status

| Baustein | Status |
|---|---|
| Produktleiter FREE → PROTOKOLL (49 € einmalig) → COACHING (149 €/Monat) | LIVE (Positionierung auf index/protokoll/coaching) |
| Warenkorb + Checkout (Vorkasse) | LIVE — ohne Bank-Config wird ehrlich "Bankverbindung per E-Mail" angezeigt (nie Platzhalter-IBAN) |
| PayPal Smart Buttons | FUNCTIONAL, REQUIRES CONFIG — `paypalClientId` steht auf `"sb"` (Sandbox, sichtbarer Testmodus-Banner). Live-Client-ID eintragen ⇒ echtes Geld |
| Serverseitige Kauf-Verifikation + Entitlement-Vergabe (`mm-commerce`) | CODE COMPLETE, REQUIRES CONFIG (Supabase + PayPal-Secrets) |
| Orders-/Events-Schema (Idempotenz) | Migration `20260723000007_phase8_commerce.sql` |
| Legacy-Auslieferung (Vault-Code nach Client-Capture) | LIVE, dokumentiertes Risiko (s. u.) |
| Abo-Billing (Stripe/PayPal Subscriptions), Trials, Coupons, Grace Period | DEFERRED — Architektur-Notizen unten, kein Fake |
| Refund-Webhook-Automatik | DEFERRED — Refunds derzeit manuell (Entitlement-Zeile auf `status='revoked'` setzen) |

## Die eiserne Regel (§12)

**Der Client vergibt NIE bezahlten Zugriff.**
- Mit Cloud-Konto: `checkout.js` ruft nach PayPal-Capture `mm-commerce` auf. Die Edge Function prüft die Zahlung **Server→Server direkt bei PayPal** (Order-Status `COMPLETED`, Capture `COMPLETED`, Betrag ≥ Produktsumme) und schreibt erst dann `orders` + `entitlements` — mit Service-Role, RLS-geschützt.
- Idempotenz (§73): `commerce_events` hat `unique(provider, event_id)`. Replays derselben Capture-ID geben `{ok, replay:true}` zurück und vergeben **nichts doppelt**. Eine erfundene Order-ID scheitert an der PayPal-Verifikation (404/409).
- Lokal (ohne Cloud): Zugriff entsteht ausschließlich durch AES-GCM-Decrypt mit gültigem Code (`account.js`, P1-11) — localStorage-Manipulation allein öffnet keine Premium-Inhalte.

## Dokumentiertes Restrisiko (Launch-Kompromiss)

`checkout.js` enthält den Schlüssel des Delivery-Vaults (obfuskiert, DK-Split). Ein technisch versierter Besucher kann den aktuellen Zugangscode extrahieren. Das war der bewusste Phase-2-Kompromiss für vollautomatische Auslieferung ohne Server.
**Abbau-Pfad:** Sobald Supabase + `mm-commerce` konfiguriert sind → Codes rotieren (`node tools-dev/vault.mjs encrypt …`), `DELIVERY_VAULT` aus `checkout.js` entfernen, Auslieferung läuft dann über `resolve-product-access` (Entitlement-gebunden, serverseitig).

## Aktivierungspfad (einmalig, ~30 Min)

1. Supabase-Projekt: `supabaseUrl` + Publishable Key in `js/config.js`, Migrationen ausführen (`supabase db push`).
2. `supabase secrets set PAYPAL_CLIENT_ID=… PAYPAL_SECRET=… PAYPAL_ENV=live`
3. `supabase functions deploy mm-commerce`
4. `js/config.js`: `paypalClientId` = Live-Client-ID, `bank` ausfüllen (oder leer lassen ⇒ E-Mail-Hinweis).
5. Testkauf (Sandbox: `PAYPAL_ENV=sandbox` + `paypalClientId:"sb"`), dann Codes rotieren (s. o.).

## Spätere Abo-Architektur (Notiz, nicht gebaut)

`products`/`prices` (statisch aus shop-data), `subscriptions` (user_id, plan, status, period_end), Webhook-Handler als zweite Route in `mm-commerce` mit derselben `commerce_events`-Idempotenz; Entitlement-Bridge = `entitlements.expires_at`. Grandfathering über `source`-Feld. Kein Teil davon wird vor echter Provider-Config im UI angeboten.
