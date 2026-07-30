-- ============================================================================
-- SITE EVENTS — eigene, anonyme Nutzungsmessung ("Was passiert auf der Seite?")
--
-- WARUM EIGENE TABELLE: Cloudflare Web Analytics (kostenlos) zählt nur
-- Seitenaufrufe. Welche Kapitel gelesen, welche Rechner benutzt und welche
-- Buttons geklickt werden, beantwortet es nicht. Diese Tabelle schließt genau
-- diese Lücke — im selben Sicherheitsmodell wie public.score_events (0010).
--
-- DATENSPARSAMKEIT (bewusste Nicht-Felder):
--   · KEINE IP-Adresse, KEIN User-Agent, KEINE Cookies, KEINE user_id.
--   · session_id ist ein Zufallswert pro Browser-Sitzung (sessionStorage),
--     nicht geräteübergreifend und nicht auf eine Person zurückführbar.
--   · ref_host speichert NUR den Host der Herkunft (z. B. "google.com"),
--     niemals Pfad oder Query — dort stünden sonst Suchbegriffe.
--   · Es gibt kein Freitextfeld: jedes Feld ist per CHECK auf ein Muster
--     begrenzt, ein manipulierter Client kann strukturell nichts einschleusen.
--
-- ZUGRIFF: RLS an, KEINE Policy → weder anon noch authenticated können lesen
-- oder schreiben. Geschrieben wird ausschließlich von der Edge Function
-- `site-telemetry` (Service Role), gelesen ausschließlich über die
-- SECURITY-DEFINER-Funktion site_usage_report() via mm-admin (Owner-Rolle).
-- ============================================================================

create table if not exists public.site_events (
  id           bigint generated always as identity primary key,

  -- Idempotenz: Retry oder doppelter Beacon erzeugt keine zweite Zeile.
  event_id     text not null unique,
  session_id   text not null,
  event_name   text not null,

  page         text,          -- Seiten-Slug, z. B. "index", "protokoll"
  ref_host     text,          -- Herkunfts-HOST, z. B. "google.com" (nie Pfad)
  device_class text,          -- mobile | tablet | desktop

  client_ts    timestamptz,
  received_at  timestamptz not null default now(),

  constraint site_events_event_id_chk   check (event_id   ~ '^[a-f0-9]{8,64}$'),
  constraint site_events_session_chk    check (session_id ~ '^[a-f0-9]{8,64}$'),
  constraint site_events_name_chk       check (event_name ~ '^[a-z0-9_]{3,48}$'),
  constraint site_events_page_chk       check (page     is null or page     ~ '^[a-z0-9_-]{1,48}$'),
  constraint site_events_ref_chk        check (ref_host is null or ref_host ~ '^[a-z0-9.-]{3,64}$'),
  constraint site_events_device_chk     check (device_class is null or device_class in ('mobile','tablet','desktop'))
);

create index if not exists idx_site_events_received on public.site_events (received_at desc);
create index if not exists idx_site_events_name     on public.site_events (event_name, received_at desc);
create index if not exists idx_site_events_session  on public.site_events (session_id);

alter table public.site_events enable row level security;
-- Bewusst KEINE Policy: die Tabelle ist für Clients weder les- noch schreibbar.

grant select, insert on table public.site_events to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------- REPORT ----
-- Liefert den fertigen Auswertungsbericht als JSON. security definer, damit
-- mm-admin (nach Owner-Prüfung) ihn aufrufen kann, ohne dass irgendein Client
-- direkten Tabellenzugriff bekommt. Rohzeilen verlassen die Datenbank nie —
-- nur Aggregate.
create or replace function public.site_usage_report(days int default 7)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with fenster as (
    select * from public.site_events
     where received_at >= now() - (least(greatest(days, 1), 90) || ' days')::interval
  )
  select jsonb_build_object(
    'days',      least(greatest(days, 1), 90),
    'sitzungen', (select count(distinct session_id) from fenster),
    'ereignisse',(select count(*) from fenster),
    'heute',     (select count(distinct session_id) from public.site_events
                   where received_at >= date_trunc('day', now())),
    'seiten',    coalesce((select jsonb_agg(x) from (
                    select page as name, count(distinct session_id) as sitzungen
                      from fenster where page is not null
                     group by page order by 2 desc limit 15) x), '[]'::jsonb),
    'quellen',   coalesce((select jsonb_agg(x) from (
                    select ref_host as name, count(distinct session_id) as sitzungen
                      from fenster where ref_host is not null
                     group by ref_host order by 2 desc limit 15) x), '[]'::jsonb),
    'aktionen',  coalesce((select jsonb_agg(x) from (
                    select event_name as name, count(*) as anzahl
                      from fenster where event_name <> 'pageview'
                     group by event_name order by 2 desc limit 25) x), '[]'::jsonb),
    'geraete',   coalesce((select jsonb_agg(x) from (
                    select device_class as name, count(distinct session_id) as sitzungen
                      from fenster where device_class is not null
                     group by device_class order by 2 desc) x), '[]'::jsonb),
    -- Aggregat erst im Unterquery bilden, dann als JSON verpacken: ein
    -- jsonb_build_object mit count() DARIN kann nicht gruppiert werden.
    'verlauf',   coalesce((select jsonb_agg(jsonb_build_object('tag', tag, 'sitzungen', s) order by tag)
                    from (select to_char(date_trunc('day', received_at), 'YYYY-MM-DD') as tag,
                                 count(distinct session_id) as s
                            from fenster group by 1) y), '[]'::jsonb)
  );
$$;

revoke all on function public.site_usage_report(int) from public, anon, authenticated;
grant execute on function public.site_usage_report(int) to service_role;

-- ---------------------------------------------------------------------------
-- AUFBEWAHRUNG: Ereignisse älter als 180 Tage sind für Produktentscheidungen
-- wertlos. Löschen läuft bewusst manuell/per Cron-Job, nicht als Trigger:
--   delete from public.site_events where received_at < now() - interval '180 days';
-- ---------------------------------------------------------------------------
