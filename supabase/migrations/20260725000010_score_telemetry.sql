-- ============================================================================
-- Phase 12 — Score-Telemetrie & Ergebnis-Feedback (pseudonym, datenminimierend)
--
-- ZWECK: sehen, wo Männer im Score aussteigen, wie lange er dauert und ob das
-- Ergebnis als zutreffend empfunden wird. NICHT: ein zweites Gesundheitsdaten-
-- Lager.
--
-- DATENSCHUTZ-ARCHITEKTUR (im Schema erzwungen, nicht nur dokumentiert):
--   · Es gibt KEINE Freitextspalte. Antworten, Laborwerte, Substanzen,
--     Symptome, Namen oder E-Mail-Adressen haben hier strukturell keinen Ort —
--     auch ein manipulierter Client kann sie nicht unterbringen.
--   · Der Natural/TRT/Enhanced-Status wird bewusst NICHT gespeichert.
--   · Kein user_id, keine IP, kein User-Agent, keine Cookies. Die einzige
--     Kennung ist eine zufällige Score-Versuchs-ID, die pro Versuch neu
--     entsteht und nirgends mit einem Konto verknüpft wird.
--   · Gespeichert werden nur Kategorien der ENGINE (Modus, Engpass,
--     Aussagesicherheit, Anzahl Datenlücken) plus Fortschrittsdaten.
--   · CHECK-Constraints = zweite Allowlist hinter der Edge-Function.
--
-- ZUGRIFF: RLS an, KEINE Policy → weder anon noch authenticated können lesen
-- oder schreiben. Schreibend arbeitet ausschließlich die Edge Function
-- `score-telemetry` mit Service Role; Auswertung ebenfalls nur mit Service Role
-- (tools-dev/score-calibration.mjs).
-- ============================================================================

create table if not exists public.score_events (
  id           bigint generated always as identity primary key,

  -- Idempotenz: derselbe Client-Retry/Beacon erzeugt keine zweite Zeile.
  event_id           text not null unique,
  score_session_id   text not null,
  event_name         text not null,
  score_version      text not null default 'v2',

  client_ts    timestamptz,
  received_at  timestamptz not null default now(),

  -- Funnel-/Fortschrittsdaten
  section_id              text,
  question_index          int,
  visible_question_count  int,
  completion_percentage   int,
  elapsed_seconds         int,
  device_class            text,
  route_length_bucket     text,

  -- Ergebnis-Kategorien der Engine (keine Antworten)
  result_mode                text,
  primary_bottleneck_id      text,
  assessment_confidence      text,
  completion_duration_bucket text,
  data_gap_count             int,

  -- Ergebnis-Feedback
  feedback_rating        text,
  feedback_reason_codes  text[],

  -- CTA-Klicks (stabile ID, nie Linktext oder Ziel-URL)
  cta_id  text,

  constraint score_events_event_name_chk check (event_name in (
    'score_started','score_resumed','score_section_entered','score_section_completed',
    'score_progress_checkpoint','score_completed','score_result_viewed',
    'score_result_feedback_submitted','score_cta_clicked',
    'score_email_result_opened','score_email_result_submitted')),
  constraint score_events_session_chk check (score_session_id ~ '^[a-f0-9]{8,64}$'),
  constraint score_events_event_id_chk check (event_id ~ '^[a-f0-9]{8,64}$'),
  constraint score_events_version_chk check (score_version in ('v2')),
  constraint score_events_section_chk check (section_id is null or section_id ~ '^[a-z_]{2,40}$'),
  constraint score_events_device_chk check (device_class is null or device_class in ('mobile','tablet','desktop')),
  constraint score_events_route_chk check (route_length_bucket is null or route_length_bucket in
    ('common','short_adaptive','medium_adaptive','long_adaptive')),
  constraint score_events_mode_chk check (result_mode is null or result_mode in
    ('cut','recomp','build','perform','health_first')),
  constraint score_events_bottleneck_chk check (primary_bottleneck_id is null or primary_bottleneck_id in
    ('bodyComposition','training','movement','sleep','recovery','nutrition','metabolic',
     'cardiovascular','hormonal','energy','dataQuality','execution',
     'enhancedControl','therapyControl','recoveryStatus')),
  constraint score_events_confidence_chk check (assessment_confidence is null or assessment_confidence in
    ('high','moderate','limited')),
  constraint score_events_duration_chk check (completion_duration_bucket is null or completion_duration_bucket in
    ('lt3m','3to6m','6to10m','gt10m')),
  constraint score_events_rating_chk check (feedback_rating is null or feedback_rating in ('yes','partial','no')),
  constraint score_events_cta_chk check (cta_id is null or cta_id ~ '^[a-zA-Z0-9_]{1,40}$'),
  constraint score_events_qidx_chk check (question_index is null or (question_index between 0 and 200)),
  constraint score_events_qcount_chk check (visible_question_count is null or (visible_question_count between 0 and 200)),
  constraint score_events_pct_chk check (completion_percentage is null or (completion_percentage between 0 and 100)),
  constraint score_events_elapsed_chk check (elapsed_seconds is null or (elapsed_seconds between 0 and 7200)),
  constraint score_events_gaps_chk check (data_gap_count is null or (data_gap_count between 0 and 40)),
  constraint score_events_reasons_chk check (
    feedback_reason_codes is null or (
      array_length(feedback_reason_codes, 1) between 1 and 7
      and feedback_reason_codes <@ array['bottleneck_wrong','mode_wrong','too_generic',
        'context_missing','reasoning_unclear','too_long','other']::text[]
    ))
);

create index if not exists idx_score_events_name_time on public.score_events(event_name, received_at desc);
create index if not exists idx_score_events_session   on public.score_events(score_session_id);
create index if not exists idx_score_events_received  on public.score_events(received_at desc);

alter table public.score_events enable row level security;
-- BEWUSST KEINE POLICY: reine Server-Tabelle. anon/authenticated haben damit
-- weder Lese- noch Schreibzugriff. Nur Service Role (umgeht RLS) schreibt.
revoke all on public.score_events from anon, authenticated;

comment on table public.score_events is
  'Phase 12: pseudonyme Score-Funnel-Telemetrie + Ergebnis-Feedback. Keine Antworten, keine Laborwerte, keine Substanzen, kein Natural/TRT/Enhanced-Status, kein user_id, keine IP. Schreibzugriff nur über die Edge Function score-telemetry (Service Role).';
comment on column public.score_events.score_session_id is
  'Zufällige Kennung EINES Score-Versuchs. Nicht aus E-Mail/Konto abgeleitet, nicht als Werbe-ID verwendbar, wird beim nächsten Versuch ersetzt.';
comment on column public.score_events.primary_bottleneck_id is
  'Ergebnis-Kategorie der Engine (12 Kern-Domains + Kontext-Domain) — eine Ausgabe des Systems, keine Nutzerantwort.';
