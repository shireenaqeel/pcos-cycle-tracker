import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, MIGRATIONS, SCHEMA_VERSION } from './schema';

const DB_NAME = 'cycle_engine.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function existingColumns(db: SQLite.SQLiteDatabase, table: string): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return new Set(rows.map((row) => row.name));
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= SCHEMA_VERSION) return;

  for (const migration of MIGRATIONS) {
    if (migration.toVersion <= current) continue;

    for (const { table, column, type } of migration.columns) {
      const columns = await existingColumns(db, table);
      if (columns.has(column)) continue; // already present on a fresh install
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

/** Opens (once) the local database — the source of truth for all logs. Never touches the network. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync(CREATE_TABLES_SQL);
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}
