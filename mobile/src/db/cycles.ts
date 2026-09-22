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

/** All cycles for a user, oldest first — the shape the prediction engine wants. */
export async function listCycleLogs(userId: string): Promise<CycleLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CycleLogRow>(
    `SELECT * FROM cycle_log WHERE user_id = ? ORDER BY start_date ASC`,
    userId
  );
  return rows.map(rowToCycleLog);
}
