# My MaleMetrix — Supabase Setup (REQUIRES EXTERNAL CONFIGURATION)

The account layer (`js/account.js`) is fully implemented but **inert until you
create a Supabase project and paste its two public values into `js/config.js`**.
Until then the site runs in **local mode** (this-device-only) and nothing breaks.

Nothing here is a secret. Only the project URL and the **anon/public** key ever
touch the browser. The `service_role` key must **never** be committed or shipped.

---

## 1. Create the project
1. supabase.com → New project. Note the **Project URL** and the **anon public** key
   (Project Settings → API). Do **not** copy the `service_role` key anywhere.

## 2. Paste the two public values
In `js/config.js`:
```js
supabaseUrl:     "https://YOURREF.supabase.co",
supabaseAnonKey: "eyJ...the anon public key...",
```
Leave them empty to stay in local mode.

## 3. Auth configuration (Supabase dashboard → Authentication)
- **Providers → Email:** enable. Enable "Email OTP / Magic Link".
- **URL Configuration → Site URL:** `https://www.malemetrix.com`
- **Redirect URLs (allow list):**
  - `https://www.malemetrix.com/mein-protokoll.html`
  - `http://localhost:8199/mein-protokoll.html` (local dev, optional)
- Google/Apple can be added later; the frontend already routes through
  `MM.account.signIn()` so no page change is needed.

## 4. Schema + Row Level Security (SQL editor → run)
```sql
-- PROFILES ---------------------------------------------------------------
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  language   text default 'de',
  timezone   text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ENTITLEMENTS -----------------------------------------------------------
create table if not exists public.entitlements (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_key text not null,          -- protocol | twelve_week | advanced_library | coaching
  status      text not null default 'active',
  source      text,
  granted_at  timestamptz default now(),
  expires_at  timestamptz,
  unique (user_id, product_key)
);

-- SCORE RESULTS ----------------------------------------------------------
create table if not exists public.score_results (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  source_id   text,                   -- e.g. "local:2026-07-20" for idempotent import
  score_total int,
  mode        text,
  bottleneck  text,
  result      jsonb,
  created_at  timestamptz default now(),
  unique (user_id, source_id)
);

-- PROGRAM CYCLES (12-Week state, adapted — not re-modelled) ---------------
create table if not exists public.program_cycles (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  source_id   text,
  start_date  date,
  status      text default 'active',
  mode        text,
  bottleneck  text,
  current_day int,
  state       jsonb,                  -- days/daily/pulse/rechecks/history/paused_days/lifts
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, source_id)
);

-- ACCESS CODES (for the "claim existing access" flow) --------------------
create table if not exists public.access_codes (
  code         text primary key,      -- normalized (upper, no spaces)
  product_keys text[] not null default array['protocol','twelve_week'],
  active       boolean default true
);

-- RLS: every user sees ONLY their own rows -------------------------------
alter table public.profiles       enable row level security;
alter table public.entitlements   enable row level security;
alter table public.score_results  enable row level security;
alter table public.program_cycles enable row level security;
alter table public.access_codes   enable row level security;   -- no policies => not client-readable

create policy "own profile"   on public.profiles       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own ent read"  on public.entitlements   for select using (auth.uid() = user_id);
create policy "own score"     on public.score_results  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own cycles"    on public.program_cycles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- entitlements are only WRITTEN server-side (via the RPC below / payment webhook),
-- never directly by the client — so no client insert/update policy is granted.

-- Auto-create a profile row on signup
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- CLAIM ACCESS CODE (validates server-side, grants entitlement to caller) --
create or replace function public.claim_access_code(code text)
returns void language plpgsql security definer set search_path = public as $$
declare rec public.access_codes; k text;
begin
  select * into rec from public.access_codes where access_codes.code = upper(trim(claim_access_code.code)) and active;
  if rec.code is null then raise exception 'invalid_code'; end if;
  foreach k in array rec.product_keys loop
    insert into public.entitlements (user_id, product_key, source)
    values (auth.uid(), k, 'code') on conflict (user_id, product_key) do nothing;
  end loop;
end; $$;
revoke all on function public.claim_access_code(text) from public;
grant execute on function public.claim_access_code(text) to authenticated;
```

## 5. Grant test entitlements (dev only, from the SQL editor — never client-side)
```sql
insert into public.entitlements(user_id, product_key, status)
values ('<a-user-uuid>', 'twelve_week', 'active'), ('<a-user-uuid>', 'protocol', 'active')
on conflict (user_id, product_key) do nothing;
-- or seed a code:
insert into public.access_codes(code, product_keys) values ('URAL', array['protocol','twelve_week']);
```

## 6. Payments (later, not this phase)
When Stripe is added, a **server-side** webhook (Edge Function using the
`service_role` key, kept server-side only) inserts into `entitlements`. The
frontend never grants access — it only reads it. `MM.account.hasAccess(...)`
already works against the `entitlements` table, so no client change is needed.

## 7. Data rights
- **Export:** `select` the four tables filtered by `auth.uid()` → JSON.
  A one-click "Export my data" UI is prepared for but not built (`getDashboardState`
  already assembles the read model).
- **Delete account:** a `delete_my_account()` `security definer` RPC (deleting the
  four tables' rows + `auth.users` row) is the intended path — **not implemented in
  this phase** (documented blocker, see report §M).
