-- =============================================================================
-- mm-transform Missbrauchsschutz (05.08.2026)
-- Warum: Jedes generierte Bild kostet echtes Geld (~4 Cent, fal.ai). Das
-- bisherige 12/h-Limit pro Nutzer schützt nicht gegen Wegwerf-Konten
-- (Magic Link = beliebig viele E-Mail-Adressen). Drei neue Schichten:
--   1. Lifetime-Freikontingent pro Konto (Edge Function zählt ok=true-Zeilen)
--   2. Stundenlimit pro IP — dafür braucht ai_request_log eine ip_hash-Spalte
--      (SHA-256 mit serverseitigem Schlüssel, nie die rohe IP — §Datenschutz)
--   3. Globaler Tages-Deckel als Kosten-Notbremse
-- Idempotent. ai_request_log bleibt SERVICE-ONLY (RLS ohne Policies).
-- =============================================================================

alter table public.ai_request_log add column if not exists ip_hash text;

-- Zählabfragen der Edge Function: pro Task+Zeit (globaler Deckel) und
-- pro IP+Zeit (IP-Limit). Der bestehende Index (user_id, created_at)
-- deckt die Nutzer-Limits bereits ab.
create index if not exists idx_ai_log_task_time on public.ai_request_log(task, created_at);
create index if not exists idx_ai_log_ip_time on public.ai_request_log(ip_hash, created_at) where ip_hash is not null;
