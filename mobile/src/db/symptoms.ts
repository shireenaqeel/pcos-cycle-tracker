import { getDb } from './client';
import type { DailySymptomLog, SymptomTag } from '../types';

interface DailySymptomLogRow {
  id: string;
  user_id: string;
  date: string;
  symptom_tags: string;
  basal_temp: number | null;
  mood: string | null;
}

/** Derived from user and date so a day can only ever hold one entry. */
function symptomLogId(userId: string, date: string): string {
  return `sym_${userId}_${date}`;
}

function rowToSymptomLog(row: DailySymptomLogRow): DailySymptomLog {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    symptomTags: JSON.parse(row.symptom_tags) as SymptomTag[],
    basalTemp: row.basal_temp,
    mood: row.mood,
  };
}

export async function getSymptomLogForDate(
  userId: string,
  date: string
): Promise<DailySymptomLog | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<DailySymptomLogRow>(
    `SELECT * FROM daily_symptom_log WHERE user_id = ? AND date = ?`,
    userId,
    date
  );
  return row === null ? null : rowToSymptomLog(row);
}

export async function listSymptomLogs(userId: string): Promise<DailySymptomLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DailySymptomLogRow>(
    `SELECT * FROM daily_symptom_log WHERE user_id = ? ORDER BY date DESC`,
    userId
  );
  return rows.map(rowToSymptomLog);
}

export async function saveSymptomLog(input: {
  userId: string;
  date: string;
  symptomTags: SymptomTag[];
  basalTemp: number | null;
  mood: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO daily_symptom_log (id, user_id, date, symptom_tags, basal_temp, mood)
     VALUES (?, ?, ?, ?, ?, ?)`,
    symptomLogId(input.userId, input.date),
    input.userId,
    input.date,
    JSON.stringify(input.symptomTags),
    input.basalTemp,
    input.mood
  );
}

export async function deleteSymptomLog(userId: string, date: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM daily_symptom_log WHERE id = ?`, symptomLogId(userId, date));
}
