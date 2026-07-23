-- ===========================================================================
-- PHASE 9 — SUBSCRIPTIONS & BILLING STATE (§10–§12)
-- Optionale wiederkehrende Abrechnung. Bleibt vollständig inaktiv, solange kein
-- Abo-Provider konfiguriert ist — Einmal-/Legacy-Käufer sind hiervon nie betroffen.
-- Entitlements werden AUSSCHLIESSLICH serverseitig gesetzt (Service-Role).
-- ===========================================================================

-- Kanonische Billing-Zustandsmaschine (§11): ein Zustand pro Nutzer+Plan.
create table if not exists public.subscriptions (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  provider      text not null,                    -- paypal | stripe
  provider_sub_id text,                            -- Provider-Abo-ID
  plan          text not null,                     -- intelligence_monthly | intelligence_annual | ...
  state         text not null default 'FREE',      -- FREE|TRIALING|ACTIVE|PAST_DUE|GRACE|CANCEL_AT_PERIOD_END|CANCELLED|EXPIRED|REFUNDED
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end     timestamptz,
  grandfather_tag text,                            -- FOUNDING_MEMBER | PROMOTIONAL | LEGACY_LIFETIME
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, provider, plan)
);
create index if not exists idx_subs_user on public.subscriptions(user_id);

-- Webhook-Idempotenz für Abo-Events — dieselbe unique-insert-first-Regel wie
-- commerce_events (§12/§73). Getrennte Tabelle, damit Retention/Abfragen klar bleiben.
create table if not exists public.subscription_events (
  id           bigint generated always as identity primary key,
  provider     text not null,
  event_id     text not null,
  event_type   text not null,                      -- subscription.created|updated|cancelled|payment_failed|invoice.paid|refund
  provider_sub_id text,
  received_at  timestamptz not null default now(),
  unique (provider, event_id)
);

alter table public.subscriptions       enable row level security;
alter table public.subscription_events enable row level security;

-- Nutzer sehen nur ihren eigenen Abo-Zustand. Schreiben: nur Service-Role.
drop policy if exists "own subs read" on public.subscriptions;
create policy "own subs read" on public.subscriptions for select to authenticated
  using (user_id = auth.uid());
-- subscription_events: keine Client-Policies (reine Server-Tabelle).

comment on table public.subscriptions is 'Phase 9: kanonische Billing-Zustandsmaschine. state wird nur serverseitig (mm-commerce) gesetzt.';
comment on table public.subscription_events is 'Phase 9: Idempotenz-Register für Abo-Webhooks, unique(provider,event_id).';
