import type { CycleLog } from '../types';

export interface CycleGap {
  cycleLengthDays: number;
  /** True when either end of the gap was entered from memory. */
  fromBackfilled: boolean;
}

/**
 * The gaps between consecutive period start dates — the only thing either the
 * predictor or the stats screen actually measure cycles from.
 *
 * Both ends are parsed the same way, so the UTC offset cancels out of the
 * subtraction and the day count is exact regardless of timezone or DST. That
 * property is why this lives in one place instead of being reimplemented.
 */
export function cycleGaps(logs: CycleLog[]): CycleGap[] {
  const sorted = [...logs].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const gaps: CycleGap[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const previousMs = new Date(sorted[i - 1].startDate).getTime();
    const currentMs = new Date(sorted[i].startDate).getTime();
    const days = Math.round((currentMs - previousMs) / 86_400_000);
    if (days <= 0) continue; // duplicate or out-of-order entries

    gaps.push({
      cycleLengthDays: days,
      fromBackfilled:
        sorted[i].entrySource === 'backfilled' || sorted[i - 1].entrySource === 'backfilled',
    });
  }

  return gaps;
}
