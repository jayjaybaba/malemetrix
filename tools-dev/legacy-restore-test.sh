#!/usr/bin/env bash
# LEGACY RESTORE TEST — restores the frozen MaleMetrix OS v1 schema into a
# throwaway local PostgreSQL 16 cluster and verifies structure, RLS and RPCs.
# No production credentials, no user data, no outbound traffic.
set -euo pipefail

PGBIN=/usr/lib/postgresql/16/bin
WORK="${1:-/tmp/mm-legacy-restore}"
REPO="${2:-$(cd "$(dirname "$0")/.." && pwd)}"
PORT=54329

rm -rf "$WORK"; mkdir -p "$WORK"
"$PGBIN/initdb" -D "$WORK/data" -U postgres --auth=trust -E UTF8 >/dev/null
"$PGBIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=$WORK" -l "$WORK/pg.log" start >/dev/null
trap '"$PGBIN/pg_ctl" -D "$WORK/data" stop -m fast >/dev/null 2>&1 || true' EXIT

PSQL="$PGBIN/psql -h 127.0.0.1 -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -c "create database mm_restore" postgres

# --- Supabase environment shim (what supabase provides out of the box) -------
$PSQL mm_restore <<'SQL'
create extension if not exists pgcrypto;
-- roles that supabase always ships
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
-- auth schema shim
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz default now()
);
create or replace function auth.uid() returns uuid
language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', false), '')::uuid $$;
create or replace function auth.role() returns text
language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', false), ''), 'anon') $$;
-- extensions schema shim (supabase installs pgcrypto there)
create schema if not exists extensions;
create or replace function extensions.digest(t text, a text) returns bytea
language sql immutable as $$ select public.digest(t, a) $$;
create or replace function extensions.gen_random_uuid() returns uuid
language sql volatile as $$ select public.gen_random_uuid() $$;
grant usage on schema extensions, auth to anon, authenticated, service_role;
-- supabase vault shim (secret store; empty in the test environment)
create schema if not exists vault;
create table if not exists vault.decrypted_secrets (
  id uuid default gen_random_uuid() primary key,
  name text unique,
  decrypted_secret text
);
SQL

# --- apply the frozen repo migrations in order -------------------------------
APPLIED=0
for f in "$REPO"/supabase/migrations/*.sql; do
  echo "  applying $(basename "$f")"
  $PSQL mm_restore -f "$f"
  APPLIED=$((APPLIED+1))
done
echo "APPLIED_MIGRATIONS=$APPLIED"

# --- verification -------------------------------------------------------------
$PSQL mm_restore <<'SQL'
\echo '--- tables in public ---'
select count(*) as public_tables from pg_tables where schemaname='public';
\echo '--- tables WITHOUT rls (should list only intentionally-open ones) ---'
select tablename from pg_tables where schemaname='public' and rowsecurity=false order by 1;
\echo '--- policies ---'
select count(*) as policies from pg_policies where schemaname='public';
\echo '--- functions in public ---'
select count(*) as functions from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public';
\echo '--- triggers ---'
select count(*) as triggers from information_schema.triggers where trigger_schema='public';
SQL

# --- representative data round-trip (synthetic, NOT production data) ---------
$PSQL mm_restore <<'SQL'
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'restore-test@example.invalid');
\echo '--- on_auth_user_created trigger auto-created profile (expect 1) ---'
select count(*) from public.profiles where user_id='11111111-1111-1111-1111-111111111111';
update public.profiles set first_name='RestoreTest', language='de' where user_id='11111111-1111-1111-1111-111111111111';
insert into public.entitlements (user_id, product_key, status, source) values ('11111111-1111-1111-1111-111111111111', 'protocol', 'active', 'restore-test');
insert into public.program_cycles (user_id, source_id, start_date, status, current_day, state)
  values ('11111111-1111-1111-1111-111111111111', 'cycle:2026-08-06', '2026-08-06', 'active', 1, '{"restore":"test"}');
insert into public.os_state (user_id, domain, state, state_version)
  values ('11111111-1111-1111-1111-111111111111', 'restore_probe', '{"ok":true}', 1);
\echo '--- entitlement readable ---'
select product_key, status from public.entitlements where user_id='11111111-1111-1111-1111-111111111111';
\echo '--- program readable ---'
select source_id, status, current_day from public.program_cycles where user_id='11111111-1111-1111-1111-111111111111';
SQL

# --- RLS behaviour ------------------------------------------------------------
# anon: production posture is 42501 permission denied (no table grant at all)
ANON_OUT=$("$PGBIN/psql" -h 127.0.0.1 -p $PORT -U postgres -q mm_restore -c "set role anon; select count(*) from public.profiles;" 2>&1 || true)
echo "$ANON_OUT" | grep -q "permission denied" && echo "ANON_BLOCKED_OK (42501 wie in Produktion)" || { echo "ANON_NOT_BLOCKED: $ANON_OUT"; exit 1; }
ANON_OUT2=$("$PGBIN/psql" -h 127.0.0.1 -p $PORT -U postgres -q mm_restore -c "set role anon; select count(*) from public.entitlements;" 2>&1 || true)
echo "$ANON_OUT2" | grep -q "permission denied" && echo "ANON_ENTITLEMENTS_BLOCKED_OK" || { echo "ANON_ENT_NOT_BLOCKED: $ANON_OUT2"; exit 1; }
# authenticated: sees own row only
$PSQL mm_restore <<'SQL'
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
\echo '--- owner sees own profile (expect 1) ---'
select count(*) from public.profiles where user_id = auth.uid();
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
\echo '--- other authenticated user sees foreign profiles (expect 0) ---'
select count(*) from public.profiles;
select count(*) from public.entitlements;
reset role;
SQL

echo "RESTORE_TEST_OK"
