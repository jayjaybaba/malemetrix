-- =============================================================================
-- MaleMetrix — Owner-Rolle, manuelle Zugangsvergabe und ausstehende Einladungen
-- Anwenden mit `supabase db push` oder im SQL-Editor.
--
-- Leitgedanken:
--   * Die Owner-Rolle haengt an auth.users.id, NIE an einer E-Mail-Adresse.
--     Eine spaetere Adressaenderung uebertraegt die Rolle deshalb nicht.
--   * Kein Client darf Rollen setzen. Alle Schreibrechte liegen bei
--     service_role (Edge Function). Fuer authenticated gibt es ausschliesslich
--     Leserechte auf die eigene Zeile.
--   * Owner erhaelt Zugriff auf ALLE Premium-Inhalte, auch auf kuenftige —
--     ohne dass je Kapitel ein Entitlement-Datensatz angelegt werden muss.
-- =============================================================================

-- ---------------------------------------------------------------- Rollen ----
create table if not exists public.user_roles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('owner', 'admin')),
  granted_at  timestamptz not null default now(),
  granted_by  uuid references auth.users(id) on delete set null,
  reason      text
);

comment on table public.user_roles is
  'Serverseitige Rollen. Nur service_role darf schreiben — der Browser nie.';

-- Zentrale Pruefung. security definer, damit RLS anderer Tabellen sie nutzen
-- kann, ohne dass der Aufrufer user_roles direkt lesen darf.
create or replace function public.is_owner(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = uid and r.role = 'owner'
  );
$$;

revoke all on function public.is_owner(uuid) from public;
grant execute on function public.is_owner(uuid) to authenticated, anon, service_role;

-- ------------------------------------------------- Manuelle Zugangsvergabe ---
-- Der Owner kann einer beliebigen Adresse kostenlosen Zugang geben. Existiert
-- schon ein Konto, haengt der Datensatz direkt an dessen user_id. Existiert
-- keines, bleibt er als ausstehende Einladung an der normalisierten Adresse
-- haengen und wird bei der Registrierung automatisch zugeordnet.
create table if not exists public.access_grants (
  id          bigint generated always as identity primary key,
  email_norm  text not null,                   -- lower(trim(email))
  user_id     uuid references auth.users(id) on delete cascade,
  product_key text not null default 'protocol',
  status      text not null default 'pending'  check (status in ('pending','active','revoked')),
  granted_by  uuid not null references auth.users(id) on delete restrict,
  granted_at  timestamptz not null default now(),
  claimed_at  timestamptz,
  revoked_at  timestamptz,
  expires_at  timestamptz,
  note        text
);

create unique index if not exists access_grants_email_product_uniq
  on public.access_grants (email_norm, product_key)
  where status <> 'revoked';

create index if not exists access_grants_user_idx on public.access_grants (user_id);

comment on table public.access_grants is
  'Manuell vergebene Gratis-Zugaenge. Empfaenger erhalten NUR product_key-Entitlements, nie eine Rolle.';

-- ------------------------------------------ Einladung bei Registrierung binden
-- Sobald sich jemand mit einer eingeladenen Adresse registriert, wird der
-- Grant serverseitig an die neue user_id gebunden und das Entitlement gesetzt.
create or replace function public.bind_pending_grants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
begin
  for g in
    select * from public.access_grants
    where user_id is null
      and status = 'pending'
      and email_norm = lower(trim(new.email))
  loop
    update public.access_grants
      set user_id = new.id, status = 'active', claimed_at = now()
      where id = g.id;

    insert into public.entitlements (user_id, product_key, status, source)
    values (new.id, g.product_key, 'active', 'manual_grant')
    on conflict (user_id, product_key) do update
      set status = 'active', source = 'manual_grant';
  end loop;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_bind_grants on auth.users;
create trigger on_auth_user_created_bind_grants
  after insert on auth.users
  for each row execute function public.bind_pending_grants();

-- --------------------------------------------------------------- Sicherheit --
alter table public.user_roles    enable row level security;
alter table public.access_grants enable row level security;

-- Eigene Rolle lesen ist erlaubt (die UI muss wissen, ob sie den Bereich zeigt).
drop policy if exists "own role read" on public.user_roles;
create policy "own role read" on public.user_roles for select to authenticated
  using (user_id = auth.uid());

-- Bewusst KEINE insert/update/delete-Policy: damit kann kein angemeldeter
-- Nutzer sich selbst zum Owner machen. Schreiben geht nur ueber service_role,
-- das RLS ohnehin umgeht.

-- Owner darf die Vergabeliste lesen; Empfaenger sehen ihren eigenen Eintrag.
drop policy if exists "grants read" on public.access_grants;
create policy "grants read" on public.access_grants for select to authenticated
  using (public.is_owner(auth.uid()) or user_id = auth.uid());

-- --------------------------------------------- Owner sieht alle Entitlements --
-- Ergaenzt die bestehende "own ent read"-Policy, ersetzt sie nicht.
drop policy if exists "owner ent read" on public.entitlements;
create policy "owner ent read" on public.entitlements for select to authenticated
  using (public.is_owner(auth.uid()));

-- =============================================================================
-- EINMALIGE EINRICHTUNG DES OWNERS — bewusst NICHT automatisch ausgefuehrt.
-- Im SQL-Editor ausfuehren, nachdem das Konto existiert:
--
--   insert into public.user_roles (user_id, role, reason)
--   select id, 'owner', 'Gruender-Konto'
--     from auth.users
--    where lower(email) = 'ural.b@live.de'
--   on conflict (user_id) do update set role = 'owner';
--
-- Pruefen (muss genau 1 Zeile liefern):
--   select u.id, u.email, r.role
--     from auth.users u join public.user_roles r on r.user_id = u.id
--    where lower(u.email) = 'ural.b@live.de';
-- =============================================================================
