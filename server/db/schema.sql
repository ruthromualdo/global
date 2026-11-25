-- ============================================================================
-- SCHEMA SQLITE — DESAFIO GLOBAL SUMMIT 2026
-- Arquivo de banco: server/db/desafio_global.sqlite
-- ============================================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nickname TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'PARTICIPANT',
  startup_id TEXT,
  avatar TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  ranking_position INTEGER NOT NULL DEFAULT 1,
  completed_missions_count INTEGER NOT NULL DEFAULT 0,
  visited_startups_json TEXT NOT NULL DEFAULT '[]',
  registered_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Ativo',
  show_nickname_in_public_ranking INTEGER NOT NULL DEFAULT 1,
  allow_activity_notifications INTEGER NOT NULL DEFAULT 1,
  share_startup_interests INTEGER NOT NULL DEFAULT 0,
  is_current_session INTEGER NOT NULL DEFAULT 0,
  image_publicity_consent INTEGER NOT NULL DEFAULT 0,
  image_publicity_consent_updated_at TEXT,
  image_publicity_consent_version TEXT,
  disqualified_at TEXT,
  disqualified_by TEXT,
  disqualification_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_participants_points ON participants(points DESC);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'PARTICIPANT',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES participants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);

CREATE TABLE IF NOT EXISTS startups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  solution_presentation TEXT NOT NULL,
  booth_number TEXT NOT NULL,
  logo_text TEXT NOT NULL,
  available_points INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  is_configurable_guest INTEGER NOT NULL DEFAULT 0,
  website TEXT,
  instagram_url TEXT,
  logo_path TEXT
);

CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  startup_id TEXT NOT NULL,
  startup_name TEXT NOT NULL,
  category TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 180,
  unlock_points INTEGER NOT NULL DEFAULT 20,
  completion_points INTEGER NOT NULL DEFAULT 180,
  max_speed_bonus INTEGER NOT NULL DEFAULT 50,
  sequence_order INTEGER,
  track_id TEXT,
  relative_weight INTEGER NOT NULL DEFAULT 10,
  estimated_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Disponível',
  period TEXT NOT NULL,
  completion_criteria TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  qr_code_required TEXT,
  quiz_questions_json TEXT,
  requires_evidence INTEGER NOT NULL DEFAULT 0,
  evidence_type TEXT,
  required_evidence_count INTEGER NOT NULL DEFAULT 1,
  max_video_seconds INTEGER,
  allow_shared_evidence INTEGER NOT NULL DEFAULT 0,
  is_surprise INTEGER NOT NULL DEFAULT 0,
  external_link TEXT
);

CREATE TABLE IF NOT EXISTS participant_missions (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  sequence_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Bloqueada',
  unlocked_at_ms INTEGER,
  started_at_ms INTEGER,
  submitted_at_ms INTEGER,
  completed_at_ms INTEGER,
  elapsed_seconds INTEGER,
  unlock_points_awarded INTEGER NOT NULL DEFAULT 0,
  completion_points_awarded INTEGER NOT NULL DEFAULT 0,
  speed_bonus_awarded INTEGER NOT NULL DEFAULT 0,
  total_points_awarded INTEGER NOT NULL DEFAULT 0,
  UNIQUE(participant_id, mission_id),
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_participant_missions_user ON participant_missions(participant_id, sequence_order);

CREATE TABLE IF NOT EXISTS mission_completions (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  mission_title TEXT NOT NULL,
  startup_id TEXT NOT NULL,
  startup_name TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  evidence_description TEXT NOT NULL,
  evidence_code TEXT NOT NULL,
  evidence_file_name TEXT,
  evidence_stored_name TEXT,
  evidence_mime_type TEXT,
  evidence_size_bytes INTEGER,
  evidence_sha256 TEXT,
  evidence_duration_seconds INTEGER,
  rejection_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  reversed_points INTEGER NOT NULL DEFAULT 0,
  reversed_at TEXT,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pendente'
);

CREATE TABLE IF NOT EXISTS mission_completion_files (
  id TEXT PRIMARY KEY,
  completion_id TEXT NOT NULL,
  file_order INTEGER NOT NULL DEFAULT 1,
  file_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (completion_id) REFERENCES mission_completions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mission_completion_files_completion
  ON mission_completion_files(completion_id, file_order);
CREATE INDEX IF NOT EXISTS idx_mission_completion_files_sha256
  ON mission_completion_files(sha256);

CREATE TABLE IF NOT EXISTS qr_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  startup_id TEXT NOT NULL,
  startup_name TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  mission_title TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  scans_count INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS qr_scans (
  id TEXT PRIMARY KEY,
  qr_code_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  scanned_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_scans_unique_participant ON qr_scans(qr_code_id, participant_id);

CREATE TABLE IF NOT EXISTS points_transactions (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_title TEXT NOT NULL,
  points_delta INTEGER NOT NULL,
  previous_balance INTEGER NOT NULL,
  new_balance INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  created_at_ms INTEGER,
  event_key TEXT,
  mission_id TEXT,
  source_completion_id TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_points_tx_unique_reversal_evidence
  ON points_transactions(event_key)
  WHERE event_key LIKE 'REVERSAL_EVIDENCE:%';

CREATE TABLE IF NOT EXISTS winner_homologations (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('GERAL', 'DIARIO')),
  event_date TEXT,
  participant_id TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  points INTEGER NOT NULL,
  ranking_position INTEGER NOT NULL,
  evidence_summary_json TEXT NOT NULL,
  data_fingerprint TEXT NOT NULL,
  homologated_by TEXT NOT NULL,
  homologated_at TEXT NOT NULL,
  homologated_at_ms INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Homologado' CHECK (status IN ('Homologado', 'Invalidado')),
  invalidated_reason TEXT,
  invalidated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_winner_homologations_scope
  ON winner_homologations(scope, event_date, status);

CREATE TABLE IF NOT EXISTS daily_ranking_closures (
  event_date TEXT PRIMARY KEY,
  day_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Aberto',
  scheduled_close_at_ms INTEGER NOT NULL,
  closed_at_ms INTEGER,
  winner_participant_id TEXT,
  winner_display_name TEXT,
  winner_avatar TEXT,
  winner_daily_points INTEGER NOT NULL DEFAULT 0,
  winner_last_mission_completed_at_ms INTEGER,
  snapshot_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TRIGGER IF NOT EXISTS trg_daily_ranking_closures_immutable_update
BEFORE UPDATE ON daily_ranking_closures
WHEN OLD.status = 'Encerrado'
BEGIN
  SELECT RAISE(ABORT, 'DAILY_RANKING_ALREADY_CLOSED');
END;

CREATE TRIGGER IF NOT EXISTS trg_daily_ranking_closures_immutable_delete
BEFORE DELETE ON daily_ranking_closures
WHEN OLD.status = 'Encerrado'
BEGIN
  SELECT RAISE(ABORT, 'DAILY_RANKING_IMMUTABLE');
END;

CREATE TABLE IF NOT EXISTS event_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  event_name TEXT NOT NULL,
  edition_year INTEGER NOT NULL,
  dates TEXT NOT NULL,
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  description TEXT NOT NULL,
  active_period TEXT NOT NULL,
  scoring_rules_json TEXT NOT NULL,
  tie_breaker_criteria_json TEXT NOT NULL,
  rewards_enabled INTEGER NOT NULL DEFAULT 0,
  rewards_legal_note TEXT NOT NULL,
  rewards_description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS governance_plans (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  description TEXT NOT NULL,
  responsible TEXT NOT NULL,
  indicators TEXT NOT NULL,
  status TEXT NOT NULL,
  related_documents_json TEXT NOT NULL
);
