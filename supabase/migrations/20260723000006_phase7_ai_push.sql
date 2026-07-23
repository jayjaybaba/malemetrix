-- =============================================================================
-- MaleMetrix Phase 7 — AI-Observability + Push-Delivery-Log
-- Idempotent. RLS strikt: ai_request_log & push_delivery_log sind SERVICE-ONLY
-- (Clients schreiben/lesen sie nie direkt — nur Edge Functions mit Service-Key).
-- Keine sensiblen Payloads: nur Task/Modell/Typ/Zeit — nie Frage-/Kontexttexte.
-- =============================================================================
create table if not exists public.ai_request_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task text not null,
  model text,
  ok boolean default true,
  created_at timestamptz default now()
);
create index if not exists idx_ai_log_user_time on public.ai_request_log(user_id, created_at);
alter table public.ai_request_log enable row level security;
-- bewusst KEINE authenticated-Policies: nur service_role (RLS-Bypass) schreibt/liest.

create table if not exists public.push_delivery_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,      -- morning_brief | weekly_review | decision_review | reminder
  dedup_key text not null,
  scheduled_at timestamptz,
  sent_at timestamptz,
  result text,                          -- sent | failed | skipped_quiet_hours | skipped_duplicate | skipped_revoked
  created_at timestamptz default now(),
  unique (user_id, dedup_key)
);
create index if not exists idx_push_log_user_time on public.push_delivery_log(user_id, created_at);
alter table public.push_delivery_log enable row level security;
-- service-only wie oben; kein Payload-Inhalt gespeichert (§67).
