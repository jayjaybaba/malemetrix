-- =============================================================================
-- MaleMetrix Account Foundation — initial schema (Phase 2.2)
-- Idempotent where practical. Apply via `supabase db push` or SQL editor.
-- =============================================================================
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text, language text default 'de', timezone text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.entitlements (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_key text not null,            -- protocol | twelve_week | advanced_library | coaching
  status text not null default 'active',
  source text,
  granted_at timestamptz default now(), expires_at timestamptz,
  unique (user_id, product_key)
);

create table if not exists public.score_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id text,                       -- "score:<date>" → history preserved, idempotent import
  score_total int, mode text, bottleneck text,
  result jsonb, scored_at text,
  created_at timestamptz default now(),
  unique (user_id, source_id)
);

create table if not exists public.program_cycles (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id text,                       -- "cycle:<start_date>"
  start_date date,
  status text not null default 'active',   -- active | completed | archived
  mode text, bottleneck text, current_day int,
  state jsonb, state_version int default 0,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  unique (user_id, source_id)
);

-- ONE ACTIVE CYCLE INVARIANT (P1-16): a user can never have two active cycles.
create unique index if not exists one_active_cycle_per_user
  on public.program_cycles(user_id) where (status = 'active');

-- HASHED claim tokens (P1-37): the plaintext token never touches the database.
create table if not exists public.access_codes (
  code_hash text primary key,           -- sha256 hex of upper(trim(token))
  product_keys text[] not null default array['protocol','twelve_week'],
  max_uses int not null default 1, used int not null default 0,
  claimed_by uuid, claimed_at timestamptz,
  active boolean not null default true
);

create index if not exists idx_ent_user   on public.entitlements(user_id);
create index if not exists idx_score_user on public.score_results(user_id);
create index if not exists idx_cycle_user on public.program_cycles(user_id);

alter table public.profiles       enable row level security;
alter table public.entitlements   enable row level security;
alter table public.score_results  enable row level security;
alter table public.program_cycles enable row level security;
alter table public.access_codes   enable row level security;  -- no policies => never client-readable

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own ent read" on public.entitlements;
create policy "own ent read" on public.entitlements for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
-- entitlements are written ONLY by the claim RPC / payment webhook (service role).

drop policy if exists "own score" on public.score_results;
create policy "own score" on public.score_results for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own cycles" on public.program_cycles;
create policy "own cycles" on public.program_cycles for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
