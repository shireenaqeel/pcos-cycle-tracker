import { addDays, differenceInCalendarDays } from 'date-fns';

import { fromIsoDate, toIsoDate } from './dates';
import type { CycleLog, CycleRangePrediction, DailySymptomLog } from '../types';

/** Guards against a mistyped end date turning into an unbounded loop. */
const MAX_PERIOD_DAYS = 60;

export interface CycleCalendar {
  /** Dates where bleeding was recorded, start through end. */
  periodDates: Set<string>;
  /** Dates the next period is predicted to fall within. */
  predictedDates: Set<string>;
  symptomDates: Set<string>;
  /** Which day of the current cycle today is, counting the last start as day 1. */
  currentCycleDay: number | null;
  predictedWindow: { start: string; end: string } | null;
  lastPeriodStart: string | null;
}

function datesBetween(startIso: string, endIso: string): string[] {
  const start = fromIsoDate(startIso);
  const span = Math.min(differenceInCalendarDays(fromIsoDate(endIso), start), MAX_PERIOD_DAYS);
  if (span < 0) return [startIso];

  const dates: string[] = [];
  for (let offset = 0; offset <= span; offset++) {
    dates.push(toIsoDate(addDays(start, offset)));
  }
  return dates;
}

export function buildCycleCalendar(
  cycles: CycleLog[],
  symptoms: DailySymptomLog[],
  prediction: CycleRangePrediction | null,
  today: Date = new Date()
): CycleCalendar {
  const periodDates = new Set<string>();
  for (const cycle of cycles) {
    for (const date of datesBetween(cycle.startDate, cycle.endDate ?? cycle.startDate)) {
      periodDates.add(date);
    }
  }

  const lastCycle = cycles.length === 0 ? null : cycles[cycles.length - 1];
  const lastPeriodStart = lastCycle === null ? null : lastCycle.startDate;

  let predictedWindow: CycleCalendar['predictedWindow'] = null;
  const predictedDates = new Set<string>();
  if (lastPeriodStart !== null && prediction !== null) {
    const anchor = fromIsoDate(lastPeriodStart);
    const start = toIsoDate(addDays(anchor, prediction.rangeStartDay));
    const end = toIsoDate(addDays(anchor, prediction.rangeEndDay));
    predictedWindow = { start, end };
    for (const date of datesBetween(start, end)) predictedDates.add(date);
  }

  return {
    periodDates,
    predictedDates,
    symptomDates: new Set(symptoms.map((entry) => entry.date)),
    currentCycleDay:
      lastPeriodStart === null
        ? null
        : differenceInCalendarDays(today, fromIsoDate(lastPeriodStart)) + 1,
    predictedWindow,
    lastPeriodStart,
  };
}
