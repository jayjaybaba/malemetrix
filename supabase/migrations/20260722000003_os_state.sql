-- =============================================================================
-- MaleMetrix OS — generic per-domain state (Ultra Mega Build)
-- One row per (user, domain): osprofile | nutrition | training | stack |
-- progress | calendar | tracker (future) … Versioned like program_cycles.
-- =============================================================================
create table if not exists public.os_state (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  state jsonb,
  state_version int default 0,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  unique (user_id, domain)
);
create index if not exists idx_os_user on public.os_state(user_id);
alter table public.os_state enable row level security;
drop policy if exists "own os_state" on public.os_state;
create policy "own os_state" on public.os_state for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
