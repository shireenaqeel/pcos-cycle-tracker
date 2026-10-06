export const SCHEMA_VERSION = 5;

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY NOT NULL,
  phenotype TEXT,
  self_reported_dx INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  display_name TEXT,
  theme TEXT,
  reminders_enabled INTEGER,
  reminder_hour INTEGER,
  app_lock_enabled INTEGER
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
  mood TEXT,
  stress_level INTEGER,
  hydration_glasses INTEGER,
  sleep_hours REAL,
  movement TEXT,
  food_note TEXT,
  other_note TEXT,
  flow TEXT,
  medications TEXT,
  moods TEXT,
  discharge TEXT,
  sex TEXT
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

/**
 * Applied in order to any database older than `SCHEMA_VERSION`, tracked by
 * SQLite's own `PRAGMA user_version`. Every step must be additive: people have
 * real cycle history on their device, and a destructive migration would throw
 * away the only copy of it — there is no server backup to restore from.
 *
 * A fresh install runs `CREATE_TABLES_SQL` first, which already includes these
 * columns, so each step also has to tolerate being unnecessary. `ALTER TABLE
 * ADD COLUMN` throws on a duplicate column, so the runner checks first.
 */
export const MIGRATIONS: { toVersion: number; columns: { table: string; column: string; type: string }[] }[] = [
  {
    toVersion: 2,
    columns: [
      { table: 'user_profile', column: 'display_name', type: 'TEXT' },
      { table: 'daily_symptom_log', column: 'stress_level', type: 'INTEGER' },
      { table: 'daily_symptom_log', column: 'hydration_glasses', type: 'INTEGER' },
      { table: 'daily_symptom_log', column: 'sleep_hours', type: 'REAL' },
      { table: 'daily_symptom_log', column: 'movement', type: 'TEXT' },
      { table: 'daily_symptom_log', column: 'food_note', type: 'TEXT' },
      { table: 'daily_symptom_log', column: 'other_note', type: 'TEXT' },
    ],
  },
  {
    toVersion: 3,
    columns: [{ table: 'user_profile', column: 'theme', type: 'TEXT' }],
  },
  {
    toVersion: 4,
    columns: [
      { table: 'user_profile', column: 'reminders_enabled', type: 'INTEGER' },
      { table: 'user_profile', column: 'reminder_hour', type: 'INTEGER' },
      { table: 'user_profile', column: 'app_lock_enabled', type: 'INTEGER' },
      // Flow belongs to a day, not to a whole cycle: it changes across a period,
      // and cycle_log.flow_intensity can only hold one answer for all of it.
      { table: 'daily_symptom_log', column: 'flow', type: 'TEXT' },
      { table: 'daily_symptom_log', column: 'medications', type: 'TEXT' },
    ],
  },
  {
    toVersion: 5,
    columns: [
      // Moods are plural: people are routinely tired *and* irritable, and the
      // single `mood` column could only hold one of them.
      { table: 'daily_symptom_log', column: 'moods', type: 'TEXT' },
      { table: 'daily_symptom_log', column: 'discharge', type: 'TEXT' },
      { table: 'daily_symptom_log', column: 'sex', type: 'TEXT' },
    ],
  },
];
