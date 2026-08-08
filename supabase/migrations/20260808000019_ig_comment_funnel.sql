-- ============================================================================
-- INSTAGRAM COMMENT FUNNEL — Kommentar rein, Private Reply raus, Lead in der DB
--
-- WAS DAS IST: Wer unter einem Beitrag ein hinterlegtes Stichwort kommentiert,
-- bekommt automatisch EINE Direktnachricht mit dem passenden Link. Das ist die
-- einzige von Meta ausdrücklich erlaubte Form automatischer Erstansprache
-- ("Private Replies", Instagram Messaging API): genau eine Antwort pro
-- Kommentar, innerhalb von 7 Tagen. Antwortet der Empfänger, öffnet sich das
-- 24-Stunden-Fenster für eine echte Unterhaltung — die führt ein Mensch.
--
-- WAS DAS BEWUSST NICHT IST: Es gibt keinen Weg, "alle Liker" oder "alle
-- Besucher" anzuschreiben. Weder Instagram noch TikTok geben diese Listen
-- heraus; sie wären nur per Scraping des eingeloggten Kontos zu bekommen
-- (Sperrgrund) und unaufgeforderte Werbenachrichten an Privatpersonen sind
-- nach § 7 UWG abmahnfähig. Dieses Modell kann strukturell nur auf eine
-- eigene Handlung des Empfängers (seinen Kommentar) reagieren.
--
-- DATENSPARSAMKEIT (bewusste Nicht-Felder):
--   · Der KOMMENTARTEXT wird nie gespeichert. Gespeichert wird nur, WELCHES
--     Stichwort gegriffen hat — das reicht für jede Auswertung.
--   · Kein Klartext eingehender Direktnachrichten, nur ihre ID und der
--     Zeitpunkt (für das 24-Stunden-Fenster und den Opt-out).
--   · Die IGSID ist eine app-spezifische Pseudonym-ID von Meta, nicht die
--     öffentliche Profil-ID. Der Benutzername wird gespeichert, weil ohne ihn
--     keine persönliche Ansprache und keine Auskunft nach Art. 15 DSGVO
--     möglich wäre — löschbar über ig_forget_lead().
--
-- ZUGRIFF: RLS an, KEINE Policy → für anon und authenticated weder les- noch
-- schreibbar. Geschrieben wird ausschließlich von der Edge Function
-- `ig-webhook` (Service Role), gelesen ausschließlich über die
-- SECURITY-DEFINER-Funktionen via `ig-admin` (Owner-Rolle).
-- ============================================================================

-- ------------------------------------------------------------ EINSTELLUNGEN --
-- Eine einzige Zeile. Der Not-Aus (`active`) steht bewusst in der Datenbank
-- und nicht im Code: Wer den Funnel stoppen will, klickt einen Schalter und
-- wartet nicht auf einen Deploy.
create table if not exists public.ig_settings (
  id                     smallint primary key default 1 check (id = 1),
  active                 boolean not null default false,
  -- Harte Obergrenze pro Tag über ALLE Regeln. Schützt vor einem viralen
  -- Beitrag, der über Nacht das Meta-Limit reisst und das Konto gefährdet.
  daily_cap              integer not null default 40 check (daily_cap between 0 and 500),
  -- Dieselbe Person bekommt frühestens nach so vielen Tagen wieder eine DM,
  -- egal wie oft sie kommentiert. Ohne das wird aus Automatisierung Belästigung.
  per_lead_cooldown_days integer not null default 30 check (per_lead_cooldown_days between 0 and 365),
  -- Metas Private-Reply-Fenster sind 7 Tage. Kleiner darf man, größer nie.
  comment_window_days    integer not null default 7 check (comment_window_days between 1 and 7),
  updated_at             timestamptz not null default now(),
  updated_by             uuid references auth.users(id) on delete set null
);

comment on table public.ig_settings is
  'Not-Aus und Deckel des Instagram-Funnels. Genau eine Zeile (id = 1).';

insert into public.ig_settings (id) values (1) on conflict (id) do nothing;

-- ------------------------------------------------------------------ REGELN --
-- Stichwort → Nachricht. `is_default` greift, wenn kein Stichwort passt; gibt
-- es keine Default-Regel, passiert bei nicht passenden Kommentaren nichts.
-- Das ist die sichere Voreinstellung: lieber schweigen als daneben antworten.
create table if not exists public.ig_rules (
  id           bigint generated always as identity primary key,
  keyword      text not null,
  match_mode   text not null default 'contains' check (match_mode in ('contains', 'exact')),
  message      text not null,
  link_url     text,
  priority     integer not null default 100,
  is_default   boolean not null default false,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id) on delete set null,

  -- Stichwörter sind klein geschrieben und ohne Sonderzeichen — so kann die
  -- Zuordnung im Code ein simpler, nachvollziehbarer Vergleich bleiben.
  constraint ig_rules_keyword_chk check (keyword ~ '^[a-z0-9äöüß _-]{2,40}$'),
  -- Instagram schneidet Direktnachrichten bei 1000 Zeichen ab. 900 lässt
  -- Platz für den angehängten Opt-out-Hinweis.
  constraint ig_rules_message_chk check (char_length(message) between 10 and 900),
  constraint ig_rules_link_chk    check (link_url is null or link_url ~ '^https://[a-z0-9.-]+\.[a-z]{2,}(/[^\s]*)?$')
);

create unique index if not exists idx_ig_rules_keyword on public.ig_rules (keyword);
-- Höchstens eine Default-Regel: zwei wären ein stiller Zufallsgenerator.
-- (Unique auf der Spalte, aber nur für die true-Zeilen — false darf beliebig oft.)
create unique index if not exists idx_ig_rules_one_default on public.ig_rules (is_default) where is_default;

comment on table public.ig_rules is
  'Stichwort-Regeln für die automatische Private Reply. Nur der Owner schreibt (ig-admin).';

-- ------------------------------------------------------------------- LEADS --
-- Eine Zeile pro Person (IGSID). Hier steht der Zustand, der die nächste
-- Entscheidung bestimmt: hat sie widersprochen, wann kam die letzte DM,
-- hat sie geantwortet.
create table if not exists public.ig_leads (
  id              bigint generated always as identity primary key,
  igsid           text not null unique,
  username        text,
  first_seen_at   timestamptz not null default now(),
  last_comment_at timestamptz,
  last_dm_at      timestamptz,
  last_reply_at   timestamptz,          -- Antwort des Leads ⇒ 24-h-Fenster offen
  comment_count   integer not null default 0,
  dm_count        integer not null default 0,
  -- new → contacted (DM raus) → replied (er hat geantwortet) → converted
  -- (vom Owner von Hand gesetzt, wenn ein Kauf zuzuordnen war)
  status          text not null default 'new'
                  check (status in ('new', 'contacted', 'replied', 'converted', 'opted_out')),
  opted_out_at    timestamptz,

  constraint ig_leads_igsid_chk check (igsid ~ '^[0-9]{5,32}$'),
  constraint ig_leads_user_chk  check (username is null or username ~ '^[A-Za-z0-9._]{1,30}$')
);

create index if not exists idx_ig_leads_status on public.ig_leads (status, last_comment_at desc);
create index if not exists idx_ig_leads_seen   on public.ig_leads (first_seen_at desc);

comment on column public.ig_leads.opted_out_at is
  'Gesetzt, sobald jemand STOPP schreibt. Ab dann geht strukturell keine DM mehr raus.';

-- --------------------------------------------------------------- KOMMENTARE --
-- Ein Datensatz pro verarbeitetem Kommentar. Die UNIQUE-Bedingung auf
-- comment_id ist das Herzstück der Idempotenz: Meta wiederholt Webhooks bei
-- jedem Timeout, und ohne diese Zeile bekäme derselbe Mensch dieselbe
-- Nachricht mehrfach. Der Datensatz wird VOR dem Senden angelegt.
create table if not exists public.ig_comments (
  id              bigint generated always as identity primary key,
  comment_id      text not null unique,
  media_id        text,
  igsid           text not null,
  rule_id         bigint references public.ig_rules(id) on delete set null,
  matched_keyword text,               -- nur das Stichwort, NIE der Kommentartext
  action          text not null default 'pending'
                  check (action in ('pending', 'dm_sent', 'dm_failed', 'skipped_inactive',
                                    'skipped_own', 'skipped_optout', 'skipped_no_rule',
                                    'skipped_window', 'skipped_cap', 'skipped_cooldown')),
  error_code      text,
  received_at     timestamptz not null default now(),
  decided_at      timestamptz
);

create index if not exists idx_ig_comments_recv   on public.ig_comments (received_at desc);
create index if not exists idx_ig_comments_action on public.ig_comments (action, received_at desc);
create index if not exists idx_ig_comments_igsid  on public.ig_comments (igsid, received_at desc);

-- ------------------------------------------------------- EINGEHENDE NACHRICHT --
-- Nur ID und Zeitpunkt. Der Inhalt einer Direktnachricht ist Privatkorrespondenz
-- und hat in einer Auswertungstabelle nichts verloren; gebraucht wird er auch
-- nicht — die Nachricht selbst liegt ohnehin im Instagram-Posteingang.
create table if not exists public.ig_inbound (
  message_id  text primary key,
  igsid       text not null,
  is_opt_out  boolean not null default false,
  received_at timestamptz not null default now()
);

create index if not exists idx_ig_inbound_igsid on public.ig_inbound (igsid, received_at desc);

-- ------------------------------------------------------------------- RECHTE --
alter table public.ig_settings enable row level security;
alter table public.ig_rules    enable row level security;
alter table public.ig_leads    enable row level security;
alter table public.ig_comments enable row level security;
alter table public.ig_inbound  enable row level security;
-- Bewusst KEINE Policy auf allen fünf Tabellen: kein Client kommt heran.

grant select, insert, update, delete on table public.ig_settings to service_role;
grant select, insert, update, delete on table public.ig_rules    to service_role;
grant select, insert, update, delete on table public.ig_leads    to service_role;
grant select, insert, update        on table public.ig_comments  to service_role;
grant select, insert                on table public.ig_inbound   to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ============================================================================
-- FUNKTIONEN
-- Alle Schreibpfade laufen über Funktionen statt über einzelne Statements der
-- Edge Function. Grund: Zählerstände (comment_count, dm_count) und Zustands-
-- übergänge müssen atomar sein. Zwei gleichzeitig eintreffende Webhooks für
-- dieselbe Person würden sich sonst gegenseitig überschreiben.
-- ============================================================================

-- Person anlegen oder anfassen. Gibt die Zeile ZURÜCK, damit der Aufrufer in
-- derselben Runde entscheiden kann (opted_out? Cooldown?) — ohne zweite Abfrage.
create or replace function public.ig_touch_lead(p_igsid text, p_username text default null)
returns public.ig_leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.ig_leads;
begin
  insert into public.ig_leads (igsid, username, last_comment_at, comment_count)
  values (p_igsid, nullif(p_username, ''), now(), 1)
  on conflict (igsid) do update
    set last_comment_at = now(),
        comment_count   = public.ig_leads.comment_count + 1,
        -- Benutzernamen ändern sich; der neueste ist der brauchbare.
        username        = coalesce(nullif(excluded.username, ''), public.ig_leads.username)
  returning * into v_lead;
  return v_lead;
end;
$$;

-- Wie viele Direktnachrichten sind heute schon rausgegangen? Der Deckel wird
-- gegen echte Sendungen gezählt, nicht gegen Versuche.
create or replace function public.ig_dm_sent_today()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
    from public.ig_comments
   where action = 'dm_sent'
     and decided_at >= date_trunc('day', now());
$$;

-- Ergebnis eines Kommentars festschreiben. Bei 'dm_sent' wandern Zähler und
-- Zeitstempel des Leads in derselben Transaktion mit — sonst könnte der
-- Cooldown durch einen abgebrochenen Aufruf verloren gehen.
create or replace function public.ig_mark_comment(
  p_comment_id      text,
  p_action          text,
  p_rule_id         bigint default null,
  p_matched_keyword text default null,
  p_error_code      text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_igsid text;
begin
  update public.ig_comments
     set action          = p_action,
         rule_id         = p_rule_id,
         matched_keyword = p_matched_keyword,
         error_code      = p_error_code,
         decided_at      = now()
   where comment_id = p_comment_id
  returning igsid into v_igsid;

  if v_igsid is null then
    return;                               -- unbekannter Kommentar: nichts tun
  end if;

  if p_action = 'dm_sent' then
    update public.ig_leads
       set last_dm_at = now(),
           dm_count   = dm_count + 1,
           -- 'replied' und 'converted' sind weiter fortgeschritten als
           -- 'contacted' und dürfen nicht zurückfallen.
           status     = case when status in ('new') then 'contacted' else status end
     where igsid = v_igsid;
  end if;
end;
$$;

-- Widerspruch. Ab hier ist die Person für den Funnel unerreichbar — das ist
-- eine Datenbank-Eigenschaft, nicht eine Höflichkeit im Code.
create or replace function public.ig_opt_out(p_igsid text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ig_leads (igsid, status, opted_out_at)
  values (p_igsid, 'opted_out', now())
  on conflict (igsid) do update
    set status = 'opted_out', opted_out_at = coalesce(public.ig_leads.opted_out_at, now());
$$;

-- Eingehende Antwort verbuchen (Idempotenz über die Nachrichten-ID).
create or replace function public.ig_note_reply(p_message_id text, p_igsid text, p_opt_out boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ig_inbound (message_id, igsid, is_opt_out)
  values (p_message_id, p_igsid, p_opt_out)
  on conflict (message_id) do nothing;

  if not found then
    return;                               -- schon verbucht (Meta-Wiederholung)
  end if;

  insert into public.ig_leads (igsid, last_reply_at, status)
  values (p_igsid, now(), case when p_opt_out then 'opted_out' else 'replied' end)
  on conflict (igsid) do update
    set last_reply_at = now(),
        status = case
                   when p_opt_out then 'opted_out'
                   when public.ig_leads.status = 'converted' then 'converted'
                   else 'replied'
                 end,
        opted_out_at = case when p_opt_out then coalesce(public.ig_leads.opted_out_at, now())
                            else public.ig_leads.opted_out_at end;
end;
$$;

-- Auskunft und Löschung nach Art. 15/17 DSGVO. Schreibt jemand "lösch meine
-- Daten", muss das in einem Aufruf erledigt sein. Die Kommentar-Datensätze
-- bleiben pseudonymisiert bestehen (sonst bricht die Idempotenz und er bekäme
-- bei einer Meta-Wiederholung erneut eine DM), verlieren aber jeden Bezug.
create or replace function public.ig_forget_lead(p_igsid text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.ig_leads where igsid = p_igsid;
  get diagnostics v_count = row_count;
  update public.ig_comments set igsid = 'geloescht' where igsid = p_igsid;
  delete from public.ig_inbound where igsid = p_igsid;
  return v_count;
end;
$$;

-- --------------------------------------------------------------- BERICHT ----
-- Nur Aggregate plus eine kurze Lead-Liste für die Anzeige. Der Bericht ist
-- die einzige Leseschnittstelle; Rohzeilen aller Kommentare verlassen die
-- Datenbank nie.
create or replace function public.ig_funnel_report(days integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with d as (select least(greatest(coalesce(days, 30), 1), 365) as n),
  fenster as (
    select c.* from public.ig_comments c, d
     where c.received_at >= now() - (d.n || ' days')::interval
  )
  select jsonb_build_object(
    'days',          (select n from d),
    'aktiv',         (select active from public.ig_settings where id = 1),
    'tageslimit',    (select daily_cap from public.ig_settings where id = 1),
    'heute_gesendet',public.ig_dm_sent_today(),
    'kommentare',    (select count(*) from fenster),
    'gesendet',      (select count(*) from fenster where action = 'dm_sent'),
    'fehlgeschlagen',(select count(*) from fenster where action = 'dm_failed'),
    'leads',         (select count(*) from public.ig_leads),
    'antworten',     (select count(*) from public.ig_leads where last_reply_at is not null),
    'abgemeldet',    (select count(*) from public.ig_leads where status = 'opted_out'),
    'gewonnen',      (select count(*) from public.ig_leads where status = 'converted'),
    -- Warum NICHT gesendet wurde, ist die wichtigste Zahl beim Einrichten:
    -- fast immer steht dort 'skipped_no_rule' und es fehlt schlicht ein Stichwort.
    'gruende',       coalesce((select jsonb_agg(x order by x.anzahl desc) from (
                       select action as name, count(*) as anzahl
                         from fenster where action <> 'dm_sent'
                        group by action) x), '[]'::jsonb),
    'stichworte',    coalesce((select jsonb_agg(x order by x.anzahl desc) from (
                       select matched_keyword as name, count(*) as anzahl
                         from fenster where matched_keyword is not null
                        group by matched_keyword limit 20) x), '[]'::jsonb),
    'verlauf',       coalesce((select jsonb_agg(jsonb_build_object('tag', tag, 'gesendet', g) order by tag)
                       from (select to_char(date_trunc('day', received_at), 'YYYY-MM-DD') as tag,
                                    count(*) filter (where action = 'dm_sent') as g
                               from fenster group by 1) y), '[]'::jsonb)
  );
$$;

-- Kurze Lead-Liste für die Verwaltung. Bewusst getrennt vom Bericht: Zahlen
-- sieht man oft, Namen selten.
create or replace function public.ig_lead_list(p_limit integer default 100)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(l) order by l.last_comment_at desc nulls last), '[]'::jsonb)
    from (
      select igsid, username, status, comment_count, dm_count,
             first_seen_at, last_comment_at, last_dm_at, last_reply_at
        from public.ig_leads
       order by last_comment_at desc nulls last
       limit least(greatest(coalesce(p_limit, 100), 1), 500)
    ) l;
$$;

revoke all on function public.ig_touch_lead(text, text)               from public, anon, authenticated;
revoke all on function public.ig_dm_sent_today()                      from public, anon, authenticated;
revoke all on function public.ig_mark_comment(text, text, bigint, text, text) from public, anon, authenticated;
revoke all on function public.ig_opt_out(text)                        from public, anon, authenticated;
revoke all on function public.ig_note_reply(text, text, boolean)      from public, anon, authenticated;
revoke all on function public.ig_forget_lead(text)                    from public, anon, authenticated;
revoke all on function public.ig_funnel_report(integer)               from public, anon, authenticated;
revoke all on function public.ig_lead_list(integer)                   from public, anon, authenticated;

grant execute on function public.ig_touch_lead(text, text)               to service_role;
grant execute on function public.ig_dm_sent_today()                      to service_role;
grant execute on function public.ig_mark_comment(text, text, bigint, text, text) to service_role;
grant execute on function public.ig_opt_out(text)                        to service_role;
grant execute on function public.ig_note_reply(text, text, boolean)      to service_role;
grant execute on function public.ig_forget_lead(text)                    to service_role;
grant execute on function public.ig_funnel_report(integer)               to service_role;
grant execute on function public.ig_lead_list(integer)                   to service_role;

-- ---------------------------------------------------------------------------
-- AUFBEWAHRUNG: Kommentar-Datensätze älter als 180 Tage haben keinen Zweck
-- mehr — die Idempotenz braucht sie nur, solange Metas Private-Reply-Fenster
-- (7 Tage) offen ist. Löschen bewusst manuell/per Cron, nicht als Trigger:
--   delete from public.ig_comments where received_at < now() - interval '180 days';
--   delete from public.ig_inbound  where received_at < now() - interval '180 days';
-- Leads, die nie geantwortet haben, nach einem Jahr:
--   delete from public.ig_leads where last_reply_at is null
--     and coalesce(last_comment_at, first_seen_at) < now() - interval '365 days';
-- ---------------------------------------------------------------------------
