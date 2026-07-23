-- ===========================================================================
-- PHASE 8 — COMMERCE (§11–§12, §73)
-- Bestellungen + idempotente Zahlungs-Events. Entitlements werden AUSSCHLIESSLICH
-- serverseitig vergeben (Edge Function mm-commerce mit Service-Role) — nie vom
-- Client. Der Client liest nur seine eigenen Bestellungen.
-- ===========================================================================

create table if not exists public.orders (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete set null,
  order_no    text not null unique,
  email       text,                          -- Gast-Bestellungen ohne Konto
  items       jsonb not null default '[]',   -- [{id, name, price, qty}]
  product_keys text[] not null default '{}', -- welche Entitlements dieser Kauf trägt
  total_cents integer not null default 0,
  currency    text not null default 'EUR',
  pay_method  text,
  status      text not null default 'pending',  -- pending | paid | refunded | cancelled
  provider    text,                             -- paypal | bank_transfer | stripe (später)
  provider_ref text,                            -- PayPal Order-/Capture-ID etc.
  created_at  timestamptz not null default now(),
  paid_at     timestamptz,
  refunded_at timestamptz
);
create index if not exists idx_orders_user on public.orders(user_id);
create unique index if not exists idx_orders_provider_ref on public.orders(provider, provider_ref) where provider_ref is not null;

-- Webhook-/Verify-Idempotenz (§73): dieselbe Provider-Transaktion kann NIE
-- doppelt verarbeitet werden — unique-Insert zuerst, Verarbeitung danach.
create table if not exists public.commerce_events (
  id           bigint generated always as identity primary key,
  provider     text not null,
  event_id     text not null,               -- PayPal capture id / webhook id
  event_type   text not null,
  order_no     text,
  processed_at timestamptz not null default now(),
  unique (provider, event_id)
);

alter table public.orders          enable row level security;
alter table public.commerce_events enable row level security;

-- Nutzer sehen nur die eigenen Bestellungen. Schreiben: nur Service-Role.
drop policy if exists "own orders read" on public.orders;
create policy "own orders read" on public.orders for select to authenticated
  using (user_id = auth.uid());
-- commerce_events: KEINE Policies für authenticated — reine Server-Tabelle.

comment on table public.orders is 'Phase 8: Bestellungen. status=paid wird nur durch mm-commerce (Server) gesetzt.';
comment on table public.commerce_events is 'Phase 8: Idempotenz-Registrierung verarbeiteter Zahlungs-Events (unique provider+event_id).';
