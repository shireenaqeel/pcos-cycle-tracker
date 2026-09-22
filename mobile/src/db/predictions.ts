import { getDb } from './client';
import type { PredictionSnapshot } from '../types';

interface PredictionSnapshotRow {
  id: string;
  user_id: string;
  generated_at: string;
  range_start: string;
  range_end: string;
  confidence: number;
  model_version: string;
}

function rowToSnapshot(row: PredictionSnapshotRow): PredictionSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    generatedAt: row.generated_at,
    rangeStart: row.range_start,
    rangeEnd: row.range_end,
    confidence: row.confidence,
    modelVersion: row.model_version,
  };
}

export async function listPredictionSnapshots(userId: string): Promise<PredictionSnapshot[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PredictionSnapshotRow>(
    `SELECT * FROM prediction_snapshot WHERE user_id = ? ORDER BY generated_at ASC`,
    userId
  );
  return rows.map(rowToSnapshot);
}

/**
 * Records a prediction only when it differs from the last one stored. The home
 * screen recomputes on every focus, and a snapshot per glance would bury the
 * handful of moments the forecast actually moved.
 */
export async function recordPredictionIfChanged(input: {
  userId: string;
  rangeStart: string;
  rangeEnd: string;
  confidence: number;
  modelVersion: string;
}): Promise<void> {
  const db = await getDb();
  const latest = await db.getFirstAsync<PredictionSnapshotRow>(
    `SELECT * FROM prediction_snapshot WHERE user_id = ? ORDER BY generated_at DESC LIMIT 1`,
    input.userId
  );

  if (
    latest !== null &&
    latest.range_start === input.rangeStart &&
    latest.range_end === input.rangeEnd &&
    latest.model_version === input.modelVersion
  ) {
    return;
  }

  await db.runAsync(
    `INSERT INTO prediction_snapshot
       (id, user_id, generated_at, range_start, range_end, confidence, model_version)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    `pred_${Date.now()}_${Math.round(Math.random() * 1e6)}`,
    input.userId,
    new Date().toISOString(),
    input.rangeStart,
    input.rangeEnd,
    input.confidence,
    input.modelVersion
  );
}
