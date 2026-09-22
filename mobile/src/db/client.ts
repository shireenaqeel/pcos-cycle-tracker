import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';

const DB_NAME = 'cycle_engine.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Opens (once) the local database — the source of truth for all logs. Never touches the network. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync(CREATE_TABLES_SQL);
      return db;
    });
  }
  return dbPromise;
}
