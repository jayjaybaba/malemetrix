-- ===========================================================================
-- RESTORE ROLE TABLE GRANTS — Behebt den produktiven Konto-Sync-Ausfall
--
-- BEFUND (28. Juli 2026): Postgres-Logs voller "permission denied for table
-- profiles/entitlements/score_results/program_cycles/subscriptions/os_state".
-- anon/authenticated besaßen auf allen Client-Tabellen nur noch REFERENCES/
-- TRIGGER/TRUNCATE; service_role fehlten DML-Rechte außerhalb der in 0009
-- versionierten Commerce-Tabellen. Folge: jeder Konto-Sync scheiterte, die
-- Migrations-Karte in My MaleMetrix blieb dauerhaft auf "teilweise
-- übernommen" hängen.
--
-- MODELL (unverändert, wie in 0009 dokumentiert): Tabellen-Grants öffnen nur
-- die Tür bis zur RLS — die Zeilensicherheit erzwingt ausschließlich RLS.
-- Grants folgen exakt den existierenden Policies (Least Privilege):
--   · ALL-Policies  (eigene Zeile)  → select/insert/update für authenticated
--   · SELECT-Policies               → select für authenticated
--   · Tabellen ohne Policy          → keine Client-Grants (reine Server-Tabellen)
--   · anon                          → keine Tabellen-Grants (Telemetrie läuft
--                                     über die Edge Function score-telemetry)
-- KEIN delete, KEIN truncate für Clients: der Browser-Client löscht nie
-- (Account-Löschung: Edge Function + FK-Kaskaden). TRUNCATE unterliegt nicht
-- der RLS und gehört deshalb niemals in Client-Rollen.
--
-- Am 28.07.2026 bereits auf die Produktions-DB angewendet (MCP-Migration
-- "restore_role_table_grants"); diese Datei versioniert den Stand.
-- ===========================================================================

-- 1) Alte Grant-Reste vollständig entfernen (inkl. RLS-fremdem TRUNCATE).
revoke all on all tables in schema public from anon, authenticated;
revoke all on all tables in schema public from service_role;

-- 2) Schema-Zugriff (Standard).
grant usage on schema public to anon, authenticated, service_role;

-- 3) Client-Tabellen mit „eigene Zeile"-Policy (FOR ALL): lesen + upsert.
grant select, insert, update on table
  public.profiles, public.score_results, public.program_cycles,
  public.os_state, public.lab_panels, public.lab_results, public.lab_notes,
  public.push_subscriptions
to authenticated;

-- 4) Read-only für den Client (Policies: nur SELECT auf eigene Zeilen/Owner).
grant select on table
  public.entitlements, public.orders, public.subscriptions,
  public.user_roles, public.access_grants
to authenticated;

-- 5) Sequenzen (identity-Spalten) für Client-Inserts.
grant usage, select on all sequences in schema public to authenticated;

-- 6) service_role: DML auf allen Tabellen (Edge Functions; BYPASSRLS by design).
--    Bewusst ohne delete/truncate — keine Funktion löscht Zeilen (0009).
grant select, insert, update on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- 7) Künftige Tabellen: service_role automatisch, Clients bewusst pro Migration.
alter default privileges in schema public grant select, insert, update on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;

-- ---------------------------------------------------------------------------
-- VERIFIKATION (im SQL-Editor):
--   select table_name, grantee, string_agg(privilege_type, ',') as privs
--     from information_schema.role_table_grants
--    where table_schema = 'public' and grantee in ('anon','authenticated')
--    group by table_name, grantee order by table_name, grantee;
-- Erwartung: anon = keine Zeilen; authenticated = SELECT,INSERT,UPDATE auf
-- den Eigene-Zeile-Tabellen, SELECT auf entitlements/orders/subscriptions/
-- user_roles/access_grants, sonst nichts.
-- ---------------------------------------------------------------------------
