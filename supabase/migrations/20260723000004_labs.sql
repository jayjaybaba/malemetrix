-- =============================================================================
-- MaleMetrix LABS — Biomarker Intelligence (Phase 4)
-- Dedicated append-oriented tables (NOT one giant os_state blob) so lab history
-- stays immutable and per-result. RLS: each user sees only their own labs.
-- Biomarker VALUES never leave the row — no analytics, no third parties.
-- The client also mirrors these into os_state domains (oslabpanels/…) for the
-- generic sync engine; these tables are the durable, query-friendly home.
-- =============================================================================

-- One blood draw / panel.
create table if not exists public.lab_panels (
  id text primary key,                       -- client-generated (panel_...)
  user_id uuid not null references auth.users(id) on delete cascade,
  panel_date date not null,
  fasted boolean default false,
  time_of_day text,
  lab_name text,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_lab_panels_user on public.lab_panels(user_id, panel_date);

-- One result = one marker in one panel. Append-oriented; edits update in place
-- but history across panels is preserved by design (§5/§71).
create table if not exists public.lab_results (
  id text primary key,                       -- client-generated (res_...)
  user_id uuid not null references auth.users(id) on delete cascade,
  panel_id text references public.lab_panels(id) on delete cascade,
  marker_id text not null,                   -- canonical id (apo_b, hba1c, …)
  name text,
  value numeric not null,
  unit text,
  canonical_value numeric,                   -- normalized for comparison; source kept above
  canonical_unit text,
  ref_low numeric,
  ref_high numeric,
  ref_text text,
  result_date date not null,
  fasted boolean default false,
  time_of_day text,
  source text default 'manual',              -- manual | import | parsed_confirmed
  confidence text default 'manual',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_lab_results_user on public.lab_results(user_id, marker_id, result_date);

-- Optional per-panel/per-marker notes (illness, hard training, med change).
create table if not exists public.lab_notes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  panel_id text references public.lab_panels(id) on delete cascade,
  marker_id text,
  note text,
  created_at timestamptz default now()
);
create index if not exists idx_lab_notes_user on public.lab_notes(user_id);

-- RLS — own rows only (§68/§101).
alter table public.lab_panels  enable row level security;
alter table public.lab_results enable row level security;
alter table public.lab_notes   enable row level security;

drop policy if exists "own lab_panels" on public.lab_panels;
create policy "own lab_panels" on public.lab_panels for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own lab_results" on public.lab_results;
create policy "own lab_results" on public.lab_results for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own lab_notes" on public.lab_notes;
create policy "own lab_notes" on public.lab_notes for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Account deletion (§70/§103): on delete cascade above removes all lab rows
-- when the auth.users row is deleted by the delete-account Edge Function.
