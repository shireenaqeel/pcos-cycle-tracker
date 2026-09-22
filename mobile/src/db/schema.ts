export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY NOT NULL,
  phenotype TEXT,
  self_reported_dx INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cycle_log (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  flow_intensity TEXT,
  is_confirmed INTEGER NOT NULL DEFAULT 1,
  entry_source TEXT NOT NULL DEFAULT 'logged'
);

CREATE TABLE IF NOT EXISTS daily_symptom_log (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  symptom_tags TEXT NOT NULL DEFAULT '[]',
  basal_temp REAL,
  mood TEXT
);

CREATE TABLE IF NOT EXISTS prediction_snapshot (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  range_start TEXT NOT NULL,
  range_end TEXT NOT NULL,
  confidence REAL NOT NULL,
  model_version TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cycle_log_user ON cycle_log(user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_symptom_log_user ON daily_symptom_log(user_id, date);
`;
