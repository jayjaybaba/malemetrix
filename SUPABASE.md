# My MaleMetrix — Supabase Setup (REQUIRES EXTERNAL CONFIGURATION)

The account layer (`js/account.js`) is fully implemented but **inert until you
create a Supabase project and paste its public values into `js/config.js`**.
Until then the site runs in **local mode** (this-device-only) and nothing breaks.

Nothing in this repo is a secret. Only the project URL and the **publishable**
key ever touch the browser. The `service_role`/secret key and the product vault
keys live **only** in Supabase (Edge Function secrets) — never in Git, never in
any client asset.

The authoritative, executable schema lives in **`supabase/migrations/`**
(ordered, idempotent). The deployable Edge Functions live in
**`supabase/functions/`**. This document is the runbook; the SQL files are the
source of truth.

---

## 1. Create the project
supabase.com → New project. From Project Settings → API copy the **Project URL**
and the **Publishable key** (`sb_publishable_...`). Never copy the secret /
`service_role` key anywhere client-side.

## 2. Paste the public values into `js/config.js`
```js
supabaseUrl:            "https://YOURREF.supabase.co",
supabasePublishableKey: "sb_publishable_....",   // preferred (current key model)
// supabaseAnonKey:     "eyJ..."                 // legacy fallback only
```
Leave empty to stay in local mode.

## 3. Auth (dashboard → Authentication)
- Providers → **Email**: enable, with **Email OTP / Magic Link**.
- URL Configuration → **Site URL**: `https://www.malemetrix.com`
- **Redirect URLs**: `https://www.malemetrix.com/mein-protokoll.html`
  (+ `http://localhost:8199/mein-protokoll.html` for local dev).
- Google/Apple later — the frontend already routes through `MM.account.signIn()`.

## 4. Apply the migrations
With the Supabase CLI: `supabase db push` — or paste the two files from
`supabase/migrations/` into the SQL editor **in order**:

1. `20260722000001_init.sql` — profiles, entitlements, score_results (history),
   program_cycles (lifecycle `active|completed|archived`, `state_version`),
   hashed `access_codes`, all `user_id` indexes, RLS `TO authenticated` with
   non-null-uid checks, **partial unique index enforcing ONE active cycle per
   user**, `handle_new_user` trigger.
2. `20260722000002_claim_rpc.sql` — `claim_access_code`: **hashed** token claim
   (sha256 server-side; plaintext token is never stored), authenticated-only,
   usage-capped (`max_uses`), revocable (`active=false`), generic error.

These exact files pass an adversarial RLS test suite against real PostgreSQL 15
(user isolation, cross-user read/write denial, anon denial, no client
entitlement inserts, claim edge cases, one-active-cycle invariant).

## 5. Deploy the Edge Functions + secrets
```bash
supabase functions deploy resolve-product-access
supabase functions deploy delete-account
supabase secrets set PROTOCOL_VAULT_KEY=<the protocol vault code>
supabase secrets set TWELVE_WEEK_VAULT_KEY=<the 12-week vault code>
supabase secrets set SERVICE_ROLE_KEY=<service role key>   # delete-account only
```
- **resolve-product-access**: verifies the caller's JWT, checks an active,
  unexpired entitlement for the requested `product_key` under RLS, and only then
  returns the vault key material over HTTPS. The material is held in memory on
  the client (never localStorage, never logged, never in a URL).
  *Honest scope:* the browser must ultimately receive decryption material to
  decrypt client-side content — this is authorized delivery, not DRM.
- **delete-account**: authenticated + explicit confirmation → deletes the auth
  user via the service role (rows cascade). The client then offers intentional
  local-data cleanup — never before server confirmation.

## 6. Seed claim tokens (server-side only)
```sql
-- Generate a high-entropy one-time token; store ONLY its hash. Note the
-- returned plaintext down once — it is not stored anywhere.
with tok as (select 'MM-'||encode(gen_random_bytes(9),'hex') as t)
insert into public.access_codes(code_hash, product_keys, max_uses)
select encode(extensions.digest(upper(t),'sha256'),'hex'),
       array['protocol','twelve_week'], 1 from tok
returning (select upper(t) from tok) as plaintext_token;
```
Claim tokens are **not** vault keys: a token proves a purchase once and grants
the entitlement; the vault key decrypts content and is delivered only via
`resolve-product-access`. Legacy shared vault codes keep their existing local
unlock (AES-GCM decrypt on the device) but are intentionally never seeded as
account claim tokens — that path is guessable and unbounded.

## 7. Rate limiting
Supabase Auth rate-limits OTP sends. Claim brute-force has no value against
hashed, high-entropy, usage-capped tokens. A hard per-IP limit would need an
Edge Function in front of the RPC — documented, not required for correctness.

## 8. Tracker cloud — DEFERRED to Phase 3 (honest)
No `tracker_*` table exists and `importLocalData()` does not touch tracker
data; the UI says so. Phase 3 adds a `tracker_state` domain via
`MM.account.registerDomain("tracker", adapter)` — same dirty-queue/sync engine,
no account-layer rewrite.

## 9. Data rights
- **Export**: implemented — `MM.account.exportMyData()` (dashboard button)
  downloads profile, entitlement metadata, score history and program cycles as
  JSON. No secrets, no tokens, no vault material.
- **Delete**: implemented client-side + deployable `delete-account` function
  (above). Until the function is deployed, the UI reports deletion as
  unavailable — it is never faked.

## 10. Payments (later)
A server-side Stripe webhook (service key server-only) inserts into
`entitlements`. The client never grants access — `hasAccess()` and
`resolve-product-access` only read it. No client change needed.
