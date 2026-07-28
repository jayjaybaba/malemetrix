-- ===========================================================================
-- PHASE 12/13 NACHZÜGLER — SERVICE-ROLE-GRANTS + FUNKTIONS-HÄRTUNG
--
-- TEIL 1: Grants für die nach Migration 0009 hinzugekommenen Tabellen.
-- Der dort dokumentierte Live-Bug ("permission denied" für mm-commerce) trat
-- beim ersten Deploy von score-telemetry erneut auf: score_events kam NACH
-- den versionierten Grants, service_role hatte kein insert/select. Gleiche
-- Regel wie 0009 — jede neue Server-Tabelle bekommt ihre Grants versioniert,
-- nie per Dashboard.
--   score-telemetry → score_events (select/insert: idempotenter Upsert)
--   mm-admin        → user_roles (select: Owner-Prüfung),
--                     access_grants (select/insert/update: Vergabeliste)
--   (entitlements-Rechte für mm-admin sind seit 0009 vorhanden.)
--
-- TEIL 2: Härtung nach Supabase-Security-Advisor (Lints 0028/0029).
-- SECURITY-DEFINER-Funktionen waren über PostgREST (/rest/v1/rpc/...) von
-- anon/authenticated aufrufbar, obwohl sie reine Trigger-/Serverbausteine
-- sind. Trigger brauchen kein EXECUTE des auslösenden Rollen-Kontexts —
-- supabase_auth_admin erhält es explizit, damit die auth.users-Trigger
-- (on_auth_user_created*, bind_grants) unter allen Semantiken feuern.
--   handle_new_user     → nur Trigger auf auth.users
--   rls_auto_enable     → nur Event-Trigger/Wartung
--   bind_pending_grants → nur Trigger auf auth.users (Migration 0011)
--   is_owner(uuid)      → wird von RLS-Policies (authenticated) genutzt;
--                         anon hat keinen legitimen Aufrufpfad und könnte
--                         sonst Owner-UUIDs durchprobieren.
--   claim_access_code   → bleibt bewusst für authenticated aufrufbar (Claim-RPC).
-- ===========================================================================

-- Teil 1 — Grants (idempotent)
grant select, insert                 on table public.score_events  to service_role;
grant select                         on table public.user_roles    to service_role;
grant select, insert, update         on table public.access_grants to service_role;

-- Teil 2 — Funktions-Härtung
revoke execute on function public.handle_new_user()     from public, anon, authenticated;
revoke execute on function public.rls_auto_enable()     from public, anon, authenticated;
revoke execute on function public.bind_pending_grants() from public, anon, authenticated;
grant  execute on function public.handle_new_user()     to supabase_auth_admin;
grant  execute on function public.bind_pending_grants() to supabase_auth_admin;

revoke execute on function public.is_owner(uuid) from public, anon;
-- authenticated + service_role behalten execute (Policies "grants read" /
-- "owner ent read" laufen als authenticated).

-- ---------------------------------------------------------------------------
-- VERIFIKATION (im SQL-Editor):
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_schema='public' and table_name='score_events';
--   → service_role hat SELECT + INSERT.
--   Supabase Advisor (Security) erneut laufen lassen:
--   → keine 0028/0029-Warnungen mehr für die vier Funktionen oben.
-- ---------------------------------------------------------------------------
