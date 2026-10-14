import type { CycleLog, DailySymptomLog, EntrySource } from '../types';

// Deliberately free of any native or database import. Pulling the DB layer in
// here once made this module unloadable under jest — expo-sqlite reaches for
// expo-asset, which does not resolve in a test environment — so the merge rules
// could not be tested at all. The rules are the risky part; they stay pure.
export interface ImportPlan {
  cyclesToAdd: CycleLog[];
  logsToWrite: DailySymptomLog[];
  /** Periods whose start date is already recorded, so they are left alone. */
  duplicateCycles: number;
  /** Days already recorded on this device, which are never overwritten. */
  skippedLogs: number;
  /** Entries dropped because they were not shaped like a record. */
  unreadable: number;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function asCycle(raw: unknown): CycleLog | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;
  if (!isIsoDate(record.startDate)) return null;

  return {
    id: typeof record.id === 'string' ? record.id : `imported_${record.startDate}`,
    userId: 'local',
    startDate: record.startDate,
    endDate: isIsoDate(record.endDate) ? record.endDate : null,
    flowIntensity: null,
    isConfirmed: true,
    // Anything restored from a file was recorded elsewhere, so it keeps whatever
    // provenance it had and defaults to the weaker one rather than claiming to
    // have been logged live on this device.
    entrySource: record.entrySource === 'logged' ? 'logged' : ('backfilled' as EntrySource),
  };
}

function asLog(raw: unknown): DailySymptomLog | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;
  if (!isIsoDate(record.date)) return null;

  const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
  const num = (value: unknown): number | null => (typeof value === 'number' ? value : null);
  const str = (value: unknown): string | null => (typeof value === 'string' ? value : null);

  return {
    id: `sym_local_${record.date}`,
    userId: 'local',
    date: record.date,
    symptomTags: list(record.symptomTags),
    basalTemp: num(record.basalTemp),
    mood: null,
    moods: list(record.moods),
    discharge: str(record.discharge) as DailySymptomLog['discharge'],
    sex: list(record.sex),
    stressLevel: num(record.stressLevel),
    hydrationGlasses: num(record.hydrationGlasses),
    sleepHours: num(record.sleepHours),
    movement: str(record.movement) as DailySymptomLog['movement'],
    foodNote: str(record.foodNote),
    otherNote: str(record.otherNote),
    flow: str(record.flow) as DailySymptomLog['flow'],
    medications: str(record.medications),
    lhTest: str(record.lhTest) as DailySymptomLog['lhTest'],
  };
}

/**
 * Decides what a backup file would change, without touching the database.
 *
 * Kept pure so the merge rules are testable, which matters more here than
 * anywhere else in the app: this is the one operation that runs against
 * someone's existing history, and the file comes from outside the app so its
 * contents cannot be trusted to be well formed.
 *
 * Two rules protect what is already on the device:
 *
 * - **Periods dedupe on start date.** Cycle ids are generated randomly at
 *   insert, so importing the same file twice would otherwise double a history.
 * - **Existing days are never overwritten.** A day already recorded here may be
 *   richer than the one in an older backup, so the local copy wins and the
 *   count is reported instead.
 */
export function planImport(
  existing: { cycles: CycleLog[]; logs: DailySymptomLog[] },
  incoming: unknown
): ImportPlan {
  const empty: ImportPlan = {
    cyclesToAdd: [],
    logsToWrite: [],
    duplicateCycles: 0,
    skippedLogs: 0,
    unreadable: 0,
  };

  if (typeof incoming !== 'object' || incoming === null) return empty;
  const payload = incoming as Record<string, unknown>;

  const knownStarts = new Set(existing.cycles.map((cycle) => cycle.startDate));
  const knownDates = new Set(existing.logs.map((log) => log.date));
  const plan: ImportPlan = { ...empty, cyclesToAdd: [], logsToWrite: [] };

  const rawCycles = Array.isArray(payload.cycles) ? payload.cycles : [];
  for (const raw of rawCycles) {
    const cycle = asCycle(raw);
    if (cycle === null) {
      plan.unreadable += 1;
    } else if (knownStarts.has(cycle.startDate)) {
      plan.duplicateCycles += 1;
    } else {
      knownStarts.add(cycle.startDate);
      plan.cyclesToAdd.push(cycle);
    }
  }

  const rawLogs = Array.isArray(payload.dailyLogs) ? payload.dailyLogs : [];
  for (const raw of rawLogs) {
    const log = asLog(raw);
    if (log === null) {
      plan.unreadable += 1;
    } else if (knownDates.has(log.date)) {
      plan.skippedLogs += 1;
    } else {
      knownDates.add(log.date);
      plan.logsToWrite.push(log);
    }
  }

  return plan;
}

export function describePlan(plan: ImportPlan): string {
  const parts = [
    `${plan.cyclesToAdd.length} ${plan.cyclesToAdd.length === 1 ? 'period' : 'periods'}`,
    `${plan.logsToWrite.length} ${plan.logsToWrite.length === 1 ? 'day' : 'days'}`,
  ];
  const lines = [`Adds ${parts.join(' and ')}.`];

  if (plan.duplicateCycles > 0) {
    lines.push(`${plan.duplicateCycles} already recorded here, left as they are.`);
  }
  if (plan.skippedLogs > 0) {
    lines.push(`${plan.skippedLogs} days already recorded here, kept as they are.`);
  }
  if (plan.unreadable > 0) {
    lines.push(`${plan.unreadable} entries could not be read and will be ignored.`);
  }

  return lines.join('\n');
}

