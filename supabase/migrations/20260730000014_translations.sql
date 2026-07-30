-- =============================================================================
-- MaleMetrix — Übersetzungs-Cache (dynamische DE→EN-Übersetzung)
--
-- WARUM EIN CACHE UND KEIN WÖRTERBUCH IM CODE:
-- Die deutschen Texte ändern sich laufend. Ein handgepflegtes Wörterbuch wäre
-- ab dem ersten Textwechsel veraltet und müsste bei jeder Änderung angefasst
-- werden. Stattdessen übersetzt ein Dienst zur Laufzeit — und diese Tabelle
-- sorgt dafür, dass derselbe Satz NIE zweimal bezahlt wird: der erste Besucher
-- löst die Übersetzung aus, alle folgenden lesen sie aus dem Cache.
--
-- SCHLÜSSEL IST DER TEXT, NICHT DIE SEITE. Damit gilt eine Übersetzung überall,
-- wo derselbe Satz steht — und ein geänderter deutscher Satz ist automatisch
-- ein neuer Schlüssel, wird also frisch übersetzt. Genau das macht die Lösung
-- wartungsfrei: Text ändern reicht, es gibt nichts nachzuziehen.
--
-- SICHERHEIT: RLS an, KEINE Policy → weder anon noch authenticated kommen an
-- die Tabelle. Nur die Edge Function (Service Role) liest und schreibt.
-- =============================================================================

create table if not exists public.translations (
  id           bigserial primary key,
  -- Zielsprache. Bewusst eng geprüft: heute nur Englisch. Eine weitere Sprache
  -- ist später eine Zeile im CHECK, kein Umbau.
  target_lang  text        not null check (target_lang in ('en')),
  -- SHA-256 des normalisierten Quelltextes (Hex). Der Hash ist der
  -- Nachschlage-Schlüssel: gleich lang für jeden Satz, indexfreundlich, und
  -- er verrät nichts über die Länge des Originals.
  source_hash  text        not null check (source_hash ~ '^[a-f0-9]{64}$'),
  source_text  text        not null check (length(source_text) between 1 and 2000),
  target_text  text        not null check (length(target_text) between 1 and 4000),
  -- Woher die Übersetzung kommt. 'manual' gewinnt bei einer späteren Korrektur
  -- von Hand: dann wird die Zeile überschrieben und nie wieder maschinell
  -- ersetzt (siehe Edge Function: nur Treffer werden gelesen, nie überschrieben).
  provider     text        not null check (provider in ('deepl', 'google', 'manual')),
  chars        integer     not null default 0 check (chars >= 0),
  created_at   timestamptz not null default now(),
  unique (target_lang, source_hash)
);

alter table public.translations enable row level security;
-- Absichtlich KEINE Policy: Clients haben hier nichts zu suchen.

-- Für den Budget-Wächter der Edge Function: "wie viele Zeichen wurden in
-- diesem Monat neu übersetzt?" Ohne Index wäre das mit wachsender Tabelle ein
-- Full Scan bei JEDEM Cache-Miss.
create index if not exists translations_created_idx on public.translations (created_at);

comment on table public.translations is
  'DE→EN-Übersetzungs-Cache. Schlüssel ist der Hash des Quelltextes: ein geänderter deutscher Satz erzeugt automatisch einen neuen Eintrag. provider=manual markiert von Hand korrigierte Einträge.';

-- Nutzungs-Bericht für den Betreiber: wie viel wurde übersetzt, wie viel kostet
-- es (Free-Tier-Budget), und was ist zuletzt neu dazugekommen. SECURITY DEFINER,
-- weil die Tabelle für Clients gesperrt ist; der Aufrufer muss Owner sein.
create or replace function public.translation_report()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
    'zuletzt', (
      select coalesce(jsonb_agg(jsonb_build_object('de', left(source_text, 90), 'en', left(target_text, 90)) order by created_at desc), '[]'::jsonb)
      from (select source_text, target_text, created_at from public.translations order by created_at desc limit 15) s
    )
  );
end;
$$;

revoke all on function public.translation_report() from public;
grant execute on function public.translation_report() to authenticated;
