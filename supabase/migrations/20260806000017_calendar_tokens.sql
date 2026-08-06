-- =============================================================================
-- Generation 2 — Kalender-Feed-Tokens (Phase 6, ADDITIV)
--
-- Ein Nutzer kann seinen 12-Wochen-Plan als abonnierbaren Kalender (ICS)
-- freigeben. Die URL enthält einen zufälligen, widerrufbaren Token — nie
-- E-Mail oder User-ID (§21 Sicherheit). Gespeichert wird NUR der SHA-256-Hash
-- des Tokens; der Klartext existiert ausschließlich beim Nutzer.
--
-- Nicht-destruktiv: neue Tabelle, keine bestehende Struktur wird verändert.
-- RLS aktiv, KEINE Policies → anon/authenticated haben keinerlei Zugriff;
-- gelesen/geschrieben wird ausschließlich per Service-Role in der Edge
-- Function mm-plan-ics (Auth im Handler, Standard P0.6).
-- =============================================================================
create table if not exists public.calendar_tokens (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);

alter table public.calendar_tokens enable row level security;

-- Ein aktiver Token je Nutzer (Rotation = alten widerrufen, neuen anlegen).
create unique index if not exists one_active_calendar_token_per_user
  on public.calendar_tokens(user_id) where (revoked_at is null);

comment on table public.calendar_tokens is
  'Gen 2: widerrufbare Tokens für den persönlichen ICS-Kalender-Feed (mm-plan-ics). Nur Hashes, Service-Role-only.';
