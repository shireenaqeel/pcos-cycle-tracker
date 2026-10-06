import { getDb } from './client';
import type {
  DailySymptomLog,
  DischargeType,
  MoodTag,
  MovementLevel,
  SexTag,
  SymptomTag,
} from '../types';

interface DailySymptomLogRow {
  id: string;
  user_id: string;
  date: string;
  symptom_tags: string;
  basal_temp: number | null;
  mood: string | null;
  stress_level: number | null;
  hydration_glasses: number | null;
  sleep_hours: number | null;
  movement: string | null;
  food_note: string | null;
  other_note: string | null;
  flow: string | null;
  medications: string | null;
  moods: string | null;
  discharge: string | null;
  sex: string | null;
}

/** Derived from user and date so a day can only ever hold one entry. */
function symptomLogId(userId: string, date: string): string {
  return `sym_${userId}_${date}`;
}

function parseList<T extends string>(raw: string | null): T[] {
  return raw === null ? [] : (JSON.parse(raw) as T[]);
}

/**
 * Days logged before moods became multi-select hold a single value in `mood`.
 * Those are surfaced as a one-item list so older entries don't read as empty.
 */
function moodsFor(row: DailySymptomLogRow): MoodTag[] {
  const stored = parseList<MoodTag>(row.moods);
  if (stored.length > 0) return stored;
  return row.mood === null ? [] : [row.mood as MoodTag];
}

function rowToSymptomLog(row: DailySymptomLogRow): DailySymptomLog {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    symptomTags: JSON.parse(row.symptom_tags) as SymptomTag[],
    basalTemp: row.basal_temp,
    mood: row.mood,
    stressLevel: row.stress_level,
    hydrationGlasses: row.hydration_glasses,
    sleepHours: row.sleep_hours,
    movement: row.movement as MovementLevel | null,
    foodNote: row.food_note,
    otherNote: row.other_note,
    flow: row.flow as DailySymptomLog['flow'],
    medications: row.medications,
    moods: moodsFor(row),
    discharge: row.discharge as DischargeType | null,
    sex: parseList<SexTag>(row.sex),
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
  stressLevel: number | null;
  hydrationGlasses: number | null;
  sleepHours: number | null;
  movement: MovementLevel | null;
  foodNote: string | null;
  otherNote: string | null;
  flow: DailySymptomLog['flow'];
  medications: string | null;
  moods: MoodTag[];
  discharge: DischargeType | null;
  sex: SexTag[];
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO daily_symptom_log
       (id, user_id, date, symptom_tags, basal_temp, mood,
        stress_level, hydration_glasses, sleep_hours, movement, food_note, other_note,
        flow, medications, moods, discharge, sex)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    symptomLogId(input.userId, input.date),
    input.userId,
    input.date,
    JSON.stringify(input.symptomTags),
    input.basalTemp,
    input.mood,
    input.stressLevel,
    input.hydrationGlasses,
    input.sleepHours,
    input.movement,
    input.foodNote,
    input.otherNote,
    input.flow,
    input.medications,
    JSON.stringify(input.moods),
    input.discharge,
    JSON.stringify(input.sex)
  );
}

export async function deleteSymptomLog(userId: string, date: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM daily_symptom_log WHERE id = ?`, symptomLogId(userId, date));
}
