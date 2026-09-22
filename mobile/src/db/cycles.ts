import { getDb } from './client';
import type { CycleLog, EntrySource } from '../types';

interface CycleLogRow {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string | null;
  flow_intensity: string | null;
  is_confirmed: number;
  entry_source: string;
}

function rowToCycleLog(row: CycleLogRow): CycleLog {
  return {
    id: row.id,
    userId: row.user_id,
    startDate: row.start_date,
    endDate: row.end_date,
    flowIntensity: row.flow_intensity as CycleLog['flowIntensity'],
    isConfirmed: row.is_confirmed === 1,
    entrySource: row.entry_source as EntrySource,
  };
}

export async function insertCycleLog(input: {
  userId: string;
  startDate: string;
  endDate?: string | null;
  flowIntensity?: CycleLog['flowIntensity'];
  entrySource: EntrySource;
}): Promise<CycleLog> {
  const db = await getDb();
  const id = `cyc_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
  await db.runAsync(
    `INSERT INTO cycle_log (id, user_id, start_date, end_date, flow_intensity, is_confirmed, entry_source)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    id,
    input.userId,
    input.startDate,
    input.endDate ?? null,
    input.flowIntensity ?? null,
    input.entrySource
  );
  return {
    id,
    userId: input.userId,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    flowIntensity: input.flowIntensity ?? null,
    isConfirmed: true,
    entrySource: input.entrySource,
  };
}

export async function getCycleLog(id: string): Promise<CycleLog | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<CycleLogRow>(`SELECT * FROM cycle_log WHERE id = ?`, id);
  return row === null ? null : rowToCycleLog(row);
}

/**
 * `entry_source` is deliberately absent: correcting a date you remembered
 * wrongly doesn't turn it into something you logged as it happened, and the
 * predictor's trust in the row must not silently change under an edit.
 */
export async function updateCycleLog(input: {
  id: string;
  startDate: string;
  endDate: string | null;
  flowIntensity: CycleLog['flowIntensity'];
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE cycle_log SET start_date = ?, end_date = ?, flow_intensity = ? WHERE id = ?`,
    input.startDate,
    input.endDate,
    input.flowIntensity,
    input.id
  );
}

export async function deleteCycleLog(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM cycle_log WHERE id = ?`, id);
}

/** All cycles for a user, oldest first — the shape the prediction engine wants. */
export async function listCycleLogs(userId: string): Promise<CycleLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CycleLogRow>(
    `SELECT * FROM cycle_log WHERE user_id = ? ORDER BY start_date ASC`,
    userId
  );
  return rows.map(rowToCycleLog);
}
