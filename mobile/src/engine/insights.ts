import { cycleGaps } from './gaps';
import type { CycleLog } from '../types';

export interface CycleInsights {
  /** Gaps measured, which is one fewer than the number of recorded periods. */
  measuredCycles: number;
  shortestCycleDays: number | null;
  longestCycleDays: number | null;
  averageCycleDays: number | null;
  medianCycleDays: number | null;
  /** Longest minus shortest — the number clinicians read as "regular or not". */
  spreadDays: number | null;
  periodsInLastYear: number;
  /** Averaged over the cycles that actually have an end date recorded. */
  typicalPeriodLengthDays: number | null;
  periodsWithRecordedLength: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function periodLengthDays(cycle: CycleLog): number | null {
  if (cycle.endDate === null) return null;
  const start = new Date(cycle.startDate).getTime();
  const end = new Date(cycle.endDate).getTime();
  const days = Math.round((end - start) / 86_400_000);
  // A period recorded as starting and ending the same day lasted one day.
  return days < 0 ? null : days + 1;
}

export function cycleInsights(logs: CycleLog[], now: Date = new Date()): CycleInsights {
  const lengths = cycleGaps(logs).map((gap) => gap.cycleLengthDays);

  const yearAgo = new Date(now.getTime() - 365 * 86_400_000).toISOString().slice(0, 10);
  const periodsInLastYear = logs.filter((cycle) => cycle.startDate >= yearAgo).length;

  const recordedLengths = logs
    .map(periodLengthDays)
    .filter((length): length is number => length !== null);

  return {
    measuredCycles: lengths.length,
    shortestCycleDays: lengths.length === 0 ? null : Math.min(...lengths),
    longestCycleDays: lengths.length === 0 ? null : Math.max(...lengths),
    averageCycleDays:
      lengths.length === 0
        ? null
        : lengths.reduce((total, length) => total + length, 0) / lengths.length,
    medianCycleDays: lengths.length === 0 ? null : median(lengths),
    spreadDays: lengths.length === 0 ? null : Math.max(...lengths) - Math.min(...lengths),
    periodsInLastYear,
    typicalPeriodLengthDays:
      recordedLengths.length === 0
        ? null
        : recordedLengths.reduce((total, length) => total + length, 0) / recordedLengths.length,
    periodsWithRecordedLength: recordedLengths.length,
  };
}
