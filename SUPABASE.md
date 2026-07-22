# My MaleMetrix — Supabase Setup (REQUIRES EXTERNAL CONFIGURATION)

The account layer (`js/account.js`) is fully implemented but **inert until you
create a Supabase project and paste its public values into `js/config.js`**.
Until then the site runs in **local mode** (this-device-only) and nothing breaks.

Nothing here is a secret. Only the project URL and the **publishable** key ever
touch the browser. The `service_role` / secret key must **never** be committed
or shipped — RLS + `security definer` RPCs are the only server-side write paths.

---

## 1. Create the project
supabase.com → New project. From Project Settings → API copy the **Project URL**
and the **Publishable key** (`sb_publishable_...`). Do **not** copy the secret /
`service_role` key anywhere client-side.

## 2. Paste the public values into `js/config.js`
```js
supabaseUrl:            "https://YOURREF.supabase.co",
supabasePublishableKey: "sb_publishable_....",   // preferred (current model)
// supabaseAnonKey:     "eyJ..."                 // only if the project has no publishable key
```
Leave empty to stay in local mode.

## 3. Auth (dashboard → Authentication)
- Providers → **Email**: enable, with **Email OTP / Magic Link**.
- URL Configuration → **Site URL**: `https://www.malemetrix.com`
- **Redirect URLs**: `https://www.malemetrix.com/mein-protokoll.html`
  (+ `http://localhost:8199/mein-protokoll.html` for local dev).
- Google/Apple later — the frontend already routes through `MM.account.signIn()`.

## 4. Schema + RLS (SQL editor)
```sql
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text, language text default 'de', timezone text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.entitlements (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_key text not null,           -- protocol | twelve_week | advanced_library | coaching
  status text not null default 'active', source text,
  granted_at timestamptz default now(), expires_at timestamptz,
  unique (user_id, product_key)
);
create table if not exists public.score_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id text, score_total int, mode text, bottleneck text, result jsonb,
  created_at timestamptz default now(), unique (user_id, source_id)
);
create table if not exists public.program_cycles (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id text, start_date date, status text default 'active',
  mode text, bottleneck text, current_day int,
  state jsonb, state_version int default 0,          -- P1-5 conflict resolution
  created_at timestamptz default now(), updated_at timestamptz default now(),
  unique (user_id, source_id)
);

-- HARDENED access codes (P1-7/P1-8): high-entropy, revocable, usage-capped.
-- Do NOT seed guessable/shared legacy codes here as permanent account grants.
create table if not exists public.access_codes (
  code text primary key,                             -- store a HASH in production; high-entropy token
  product_keys text[] not null default array['protocol','twelve_week'],
  max_uses int default 1, used int default 0,
  claimed_by uuid, claimed_at timestamptz,
  active boolean default true                         -- set false to revoke
);

-- Indexes on every user_id (P1-14)
create index if not exists idx_ent_user   on public.entitlements(user_id);
create index if not exists idx_score_user on public.score_results(user_id);
create index if not exists idx_cycle_user on public.program_cycles(user_id);

alter table public.profiles       enable row level security;
alter table public.entitlements   enable row level security;
alter table public.score_results  enable row level security;
alter table public.program_cycles enable row level security;
alter table public.access_codes   enable row level security;   -- NO policies => never client-readable

-- Policies scoped explicitly TO authenticated with a non-null uid check (P1-14)
create policy "own profile" on public.profiles for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "own ent read" on public.entitlements for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "own score" on public.score_results for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "own cycles" on public.program_cycles for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
-- entitlements are INSERTed only by the RPC / a future payment webhook — no client write policy.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- CLAIM: authenticated only, uid non-null, usage-capped, revocable, no info leak (P1-15)
create or replace function public.claim_access_code(code text)
returns void language plpgsql security definer set search_path = '' as $$
declare rec public.access_codes; k text; uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into rec from public.access_codes
    where access_codes.code = upper(trim(claim_access_code.code))
      and active and used < max_uses for update;
  if rec.code is null then raise exception 'invalid_code'; end if;   -- generic; no detail leak
  update public.access_codes set used = used + 1, claimed_by = uid, claimed_at = now()
    where access_codes.code = rec.code;
  foreach k in array rec.product_keys loop
    insert into public.entitlements(user_id, product_key, source)
    values (uid, k, 'code') on conflict (user_id, product_key) do nothing;
  end loop;
end; $$;
revoke all on function public.claim_access_code(text) from public, anon;
grant execute on function public.claim_access_code(text) to authenticated;
```

## 5. Seed access / test entitlements (server-side only, dev)
```sql
-- one-time, high-entropy claim token (NOT a shared legacy code):
insert into public.access_codes(code, product_keys, max_uses)
values (upper('MM-'||encode(gen_random_bytes(9),'hex')), array['protocol','twelve_week'], 1);
-- direct grant for a known user:
insert into public.entitlements(user_id, product_key) values ('<uuid>','twelve_week')
  on conflict do nothing;
```
> **Legacy vault codes** (e.g. the shared `URAL`) keep their **existing local
> vault unlock** (AES-GCM decrypt) but are intentionally **not** seeded as
> permanent account entitlements — that path is guessable and unbounded.

## 6. Rate limiting (P1-8)
Supabase Auth already rate-limits OTP sends. For `claim_access_code`, the
`max_uses` cap + high-entropy tokens remove brute-force value. If you want a
hard per-IP limit, add an Edge Function in front of the RPC (documented, not
required for correctness here).

## 7. Tracker cloud — DEFERRED to Phase 3 (P1-9, honest)
There is **no** `tracker_*` table and `importLocalData()` does **not** import
tracker data. The dashboard/migration UI reflects this — it never claims
"tracker imported." Tracker stays local until Phase 3 adds a `tracker_state`
table with the same RLS pattern.

## 8. Data rights
- **Export:** `select` the four tables by `auth.uid()` → JSON (read model already
  assembled by `getDashboardState`). One-click UI: not built this phase.
- **Delete account:** intended `delete_my_account()` `security definer` RPC
  (delete the four tables' rows for `auth.uid()`, then the `auth.users` row).
  **Not implemented this phase — documented blocker.**

## 9. Payments (later)
A server-side Stripe webhook (secret key server-only) inserts into `entitlements`.
The client never grants access — `hasAccess()` only reads it. No client change needed.
