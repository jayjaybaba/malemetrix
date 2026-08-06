-- =============================================================================
-- SCHEMA-CAPTURE: Remote-only-Objekte der Produktions-Datenbank (Stand 06.08.2026)
--
-- Die Produktions-DB (Projekt vczhfyxltiyvtvppfodt) hat 22 angewandte
-- Migrationen; das Repo enthält 16 Migrationsdateien. Diese Datei friert die
-- Objekte ein, die NUR remote existieren (per Supabase SQL-Editor angelegt),
-- damit ein vollständiger Schema-Restore aus dem Repo möglich ist:
--   Repo-Migrationen (16 Dateien) + diese Datei = vollständiges Prod-Schema.
--
-- Erfasst am 06.08.2026 via pg_get_functiondef / information_schema aus der
-- Live-DB. Keine Nutzerdaten, keine Secrets.
--
-- Remote-only-Migrationen laut Migrationshistorie:
--   20260728203343 grants_and_function_hardening   → rls_auto_enable (Event-Trigger)
--   20260730092023 translation_budget_fn           → translation_budget()
--   20260730094320 translation_budget_total        → (in translation_budget enthalten)
--   20260730094515 translations_free_provider      → Spalten-/Provider-Anpassung translations
--   20260730094921 translation_report_provider     → translation_report()
--   20260805170336 create_koerper_leads            → Tabelle koerper_leads
-- Außerdem weicht die Versionsnummerierung ab (z. B. score_telemetry ist remote
-- 20260728202355, im Repo 20260725000010) — inhaltlich identisch.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tabelle: koerper_leads (Transformation-Funnel-Leads; RLS aktiv, KEINE
-- Policies = deny-all für anon/authenticated; Schreibzugriff nur über
-- Edge Function mm-transform mit Service-Role)
-- ---------------------------------------------------------------------------
create table if not exists public.koerper_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  goal text,
  age integer,
  height_cm integer,
  weight_kg numeric,
  training_days integer,
  created_at timestamptz not null default now()
);
alter table public.koerper_leads enable row level security;

-- ---------------------------------------------------------------------------
-- Event-Trigger-Funktion: rls_auto_enable — aktiviert RLS automatisch auf
-- jeder neu angelegten Tabelle in public (Sicherheitsnetz).
-- Der zugehörige EVENT TRIGGER muss nach Restore manuell angelegt werden
-- (Event-Trigger benötigen Superuser; auf Supabase via Dashboard/Support):
--   create event trigger rls_auto_enable_trigger
--     on ddl_command_end execute function public.rls_auto_enable();
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Funktion: translation_budget — Zeichenbudget des Übersetzungs-Caches
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.translation_budget()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'chars_month', (select coalesce(sum(chars), 0) from public.translations
                      where created_at >= date_trunc('month', now())),
    'chars_total', (select coalesce(sum(chars), 0) from public.translations),
    'new_last_hour', (select count(*) from public.translations
                        where created_at >= now() - interval '1 hour')
  );
$function$;

-- ---------------------------------------------------------------------------
-- Funktion: translation_report — Owner-Report über den Übersetzungs-Cache
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.translation_report()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  ist_owner boolean;
  monat     bigint;
  gesamt    bigint;
  zeilen    bigint;
begin
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'owner'
  ) into ist_owner;
  if not ist_owner then
    raise exception 'forbidden';
  end if;

  select coalesce(sum(chars), 0) into monat
    from public.translations
    where created_at >= date_trunc('month', now());
  select coalesce(sum(chars), 0), count(*) into gesamt, zeilen
    from public.translations;

  return jsonb_build_object(
    'zeichen_monat', monat,
    'zeichen_gesamt', gesamt,
    'saetze', zeilen,
    'anbieter', (
      select coalesce(jsonb_object_agg(provider, n), '{}'::jsonb)
      from (select provider, count(*) as n from public.translations group by provider) p
    ),
    'zuletzt', (
      select coalesce(jsonb_agg(jsonb_build_object('de', left(source_text, 90), 'en', left(target_text, 90)) order by created_at desc), '[]'::jsonb)
      from (select source_text, target_text, created_at from public.translations order by created_at desc limit 15) s
    )
  );
end;
$function$;
