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
  password_hash TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'PARTICIPANT',
  avatar TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  ranking_position INTEGER NOT NULL DEFAULT 1,
  completed_missions_count INTEGER NOT NULL DEFAULT 0,
  visited_startups_json TEXT NOT NULL DEFAULT '[]',
  unlocked_achievements_json TEXT NOT NULL DEFAULT '[]',
  registered_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Ativo',
  show_nickname_in_public_ranking INTEGER NOT NULL DEFAULT 1,
  allow_activity_notifications INTEGER NOT NULL DEFAULT 1,
  share_startup_interests INTEGER NOT NULL DEFAULT 0,
  is_current_session INTEGER NOT NULL DEFAULT 0
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
  website TEXT
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
  estimated_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Disponível',
  period TEXT NOT NULL,
  completion_criteria TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  qr_code_required TEXT,
  quiz_questions_json TEXT
);

CREATE TABLE IF NOT EXISTS participant_missions (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  sequence_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Bloqueada',
  unlocked_at_ms INTEGER,
  started_at_ms INTEGER,
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
  points_awarded INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pendente'
);

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
  event_key TEXT,
  mission_id TEXT
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  unlock_condition TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  points_bonus INTEGER NOT NULL DEFAULT 0,
  unlocked INTEGER NOT NULL DEFAULT 0,
  unlocked_at TEXT,
  progress_current INTEGER NOT NULL DEFAULT 0,
  progress_total INTEGER NOT NULL DEFAULT 1
);

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
