-- =============================================================================
-- Generation 2 — Push-Scheduler (ADDITIV, 06.08.2026)
--
-- Aktiviert pg_cron + pg_net und plant den Versand über die bestehende
-- Edge Function `send-brief` (CODE COMPLETE seit Phase 7; jetzt sind die
-- VAPID-Secrets gesetzt):
--   · Morning Brief:  täglich 05:00 UTC (07:00 MESZ / 06:00 MEZ)
--   · Weekly Review:  Sonntag 16:00 UTC (18:00 MESZ)
--
-- Sicherheit: send-brief verlangt den Header `x-scheduler-secret`. Der Wert
-- liegt NICHT in dieser Datei, sondern im Supabase Vault (`scheduler_secret`)
-- und in den Edge-Function-Secrets (SCHEDULER_SECRET) — der Cron-Job liest
-- ihn zur Laufzeit aus dem Vault. Kein Secret im Repo.
--
-- Nicht-destruktiv: nur Extensions + zwei Cron-Jobs; nichts Bestehendes wird
-- verändert. Deaktivieren: select cron.unschedule('mm-morning-brief');
--                          select cron.unschedule('mm-weekly-review');
-- =============================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Hilfsfunktion: ein send-brief-Aufruf mit Vault-Secret (SECURITY DEFINER,
-- damit der Cron-Job das Vault lesen darf; fester search_path).
create or replace function public.mm_send_brief(brief_type text)
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  secret text;
begin
  select decrypted_secret into secret
    from vault.decrypted_secrets where name = 'scheduler_secret';
  if secret is null then
    raise log 'mm_send_brief: kein scheduler_secret im Vault — Versand übersprungen';
    return;
  end if;
  perform net.http_post(
    url := 'https://vczhfyxltiyvtvppfodt.supabase.co/functions/v1/send-brief',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-scheduler-secret', secret
    ),
    body := jsonb_build_object('type', brief_type),
    timeout_milliseconds := 15000
  );
end;
$$;

revoke all on function public.mm_send_brief(text) from public, anon, authenticated;

-- Idempotent planen: vorhandene Jobs gleichen Namens zuerst entfernen.
do $$
begin
  perform cron.unschedule('mm-morning-brief');
exception when others then null;
end $$;
do $$
begin
  perform cron.unschedule('mm-weekly-review');
exception when others then null;
end $$;

select cron.schedule('mm-morning-brief', '0 5 * * *',  $$select public.mm_send_brief('morning_brief')$$);
select cron.schedule('mm-weekly-review', '0 16 * * 0', $$select public.mm_send_brief('weekly_review')$$);
