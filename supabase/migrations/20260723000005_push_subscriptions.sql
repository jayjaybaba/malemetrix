-- =============================================================================
-- MaleMetrix Phase 6 — Web-Push-Subscriptions (CONFIG REQUIRED serverseitig)
-- Speichert Push-Subscriptions pro Nutzer & Gerät. Der VERSAND braucht
-- zusätzlich: VAPID-Keypair (Secrets), eine Edge Function `send-reminders`
-- und einen Scheduler (pg_cron / externe Cron). Siehe PUSH.md.
-- Idempotent. RLS: jeder Nutzer sieht/verwaltet nur eigene Subscriptions.
-- =============================================================================
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,           -- vollständiges PushSubscription-JSON (keys p256dh/auth)
  privacy text default 'discreet',       -- full | discreet — Sperrbildschirm-Inhalt
  quiet_from text default '21:30',
  quiet_to text default '07:30',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, endpoint)
);
create index if not exists idx_push_user on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "own push_subscriptions" on public.push_subscriptions;
create policy "own push_subscriptions" on public.push_subscriptions for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
