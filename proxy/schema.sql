-- MaleMetrix Growth OS — D1-Schema (Phase 2: zentrale Daten + Zeitreihen)
-- Migration v1 · anwenden mit: wrangler d1 execute mm-growth --file=schema.sql
-- Migrationen: neue Versionen als schema-v2.sql etc. anhängen, nie destruktiv.

-- Cloud-Backup des lokalen Growth-OS-Datenbestands (geräteübergreifender Sync,
-- Last-Write-Wins mit updated_at; Konfliktprüfung im Frontend vor Pull).
CREATE TABLE IF NOT EXISTS kv_backup (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Tägliche Account-Zeitreihe (Cron, Quelle: TikTok Display API).
CREATE TABLE IF NOT EXISTS account_snapshots (
  ts TEXT NOT NULL,
  follower_count INTEGER,
  following_count INTEGER,
  likes_count INTEGER,
  video_count INTEGER
);
CREATE INDEX IF NOT EXISTS idx_account_ts ON account_snapshots (ts);

-- Tägliche Video-Zeitreihe (Cron, Quelle: TikTok Display API).
-- PRIMARY KEY (video_id, ts) => idempotent bei doppeltem Cron-Lauf.
CREATE TABLE IF NOT EXISTS video_snapshots (
  video_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  title TEXT,
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  duration INTEGER,
  share_url TEXT,
  PRIMARY KEY (video_id, ts)
);
CREATE INDEX IF NOT EXISTS idx_video_ts ON video_snapshots (ts);
