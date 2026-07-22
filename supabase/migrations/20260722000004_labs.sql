-- =============================================================================
-- MaleMetrix LABS & BIOMARKER INTELLIGENCE — Phase 4
-- =============================================================================
-- SYNC-PFAD (aktiv): Lab-Datensätze reisen bereits über die generische
-- os_state-Tabelle (Migration 0003) als drei EIGENE Domain-Zeilen pro Nutzer:
--   domain='labpanels' | 'labresults' | 'labnotes'
-- Das ist KEIN „giant blob“ (jede Domain ist eine eigene Zeile) und wird
-- append-orientiert gemergt (Client: registerStateDomain(..., {append:true})),
-- damit zwei Geräte offline nie gegenseitig Historie überschreiben (§71).
-- os_state trägt bereits RLS ("own os_state") + ON DELETE CASCADE auf
-- auth.users → Labs sind damit heute schon RLS-geschützt und werden bei
-- Kontolöschung mitgelöscht (§68/§70/§101).
--
-- DIESE MIGRATION stellt zusätzlich die DEDIZIERTEN, strukturierten Tabellen
-- bereit (§67) — der vorbereitete Skalierungspfad für große Lab-Historien,
-- Server-seitige Auswertung und Import-Provider. Volle RLS je Nutzer. Der
-- Client kann später ohne Account-Layer-Umbau hierauf umstellen.
-- =============================================================================

-- ---------- lab_panels: ein Bluttermin = ein Panel ----------
create table if not exists public.lab_panels (
  id text primary key,                    -- clientseitige stabile ID (panel_…)
  user_id uuid not null references auth.users(id) on delete cascade,
  panel_date date not null,
  lab text,
  fasted boolean,
  note text,
  source text default 'manual',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_lab_panels_user on public.lab_panels(user_id);
create index if not exists idx_lab_panels_user_date on public.lab_panels(user_id, panel_date);
alter table public.lab_panels enable row level security;
drop policy if exists "own lab_panels" on public.lab_panels;
create policy "own lab_panels" on public.lab_panels for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------- lab_results: einzelne Messwerte (append/immutable history) ----------
create table if not exists public.lab_results (
  id text primary key,                    -- clientseitige stabile ID (res_…)
  user_id uuid not null references auth.users(id) on delete cascade,
  panel_id text references public.lab_panels(id) on delete cascade,
  marker_id text not null,                -- kanonische Marker-ID (apo_b, hba1c …)
  value numeric not null,                 -- Originalwert (Original-Einheit bewahrt)
  unit text,
  canonical_value numeric,                -- normalisiert für Vergleich
  canonical_unit text,
  reference_low numeric,
  reference_high numeric,
  lab_reference_text text,
  result_date date not null,
  fasted boolean,
  sample_time text,
  source text default 'manual',
  confidence text default 'manual',       -- manual | parsed_confirmed | imported
  notes text,
  assay text,
  sample text,
  derived_from text[],                    -- z. B. {total_testosterone,shbg} für free_t
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_lab_results_user on public.lab_results(user_id);
create index if not exists idx_lab_results_user_marker on public.lab_results(user_id, marker_id, result_date);
create index if not exists idx_lab_results_panel on public.lab_results(panel_id);
-- Duplikat-Guard serverseitig: gleicher Marker/Datum/Wert/Einheit je Nutzer.
create unique index if not exists uq_lab_results_dupe
  on public.lab_results(user_id, marker_id, result_date, value, coalesce(unit,''));
alter table public.lab_results enable row level security;
drop policy if exists "own lab_results" on public.lab_results;
create policy "own lab_results" on public.lab_results for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------- lab_notes: Kontext (fasting/illness/training/med/supplement) ----------
create table if not exists public.lab_notes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  panel_id text references public.lab_panels(id) on delete set null,
  note_date date not null,
  note_type text default 'context',
  text text,
  created_at timestamptz default now()
);
create index if not exists idx_lab_notes_user on public.lab_notes(user_id);
alter table public.lab_notes enable row level security;
drop policy if exists "own lab_notes" on public.lab_notes;
create policy "own lab_notes" on public.lab_notes for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- PRIVACY (§66): rohe Biomarker-Werte gehören NIE in generische Analytics/Events.
-- Die Werte liegen ausschließlich in diesen RLS-geschützten Zeilen bzw. in
-- os_state — Domain-Events tragen nur marker_id/status/date (siehe labs.js).
