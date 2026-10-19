import { estimateOvulationRange, type OvulationSignal } from './ovulation';
import { PREMENSTRUAL_DAYS } from './phases';

/** Used until a period with an end date has been recorded. */
const DEFAULT_PERIOD_DAYS = 5;

/**
 * `follicular`, `ovulation` and `luteal` only ever appear when ovulation was
 * measured. Without a signal the stretch after a period is `between`, and the
 * estimate travels separately as `likelyOvulation`: for irregular cycles that
 * range is wide enough to run into the premenstrual days, so as a segment it
 * would either overlap them or be silently trimmed to fit.
 */
export type CyclePhase =
  | 'period'
  | 'between'
  | 'follicular'
  | 'ovulation'
  | 'luteal'
  | 'premenstrual'
  | 'window'
  | 'late';

export interface PhaseSegment {
  phase: CyclePhase;
  /** Cycle days, 1 being the first day of the last period, inclusive. */
  startDay: number;
  endDay: number;
}

export interface PhaseMap {
  segments: PhaseSegment[];
  current: CyclePhase;
  totalDays: number;
  /**
   * Earliest and latest cycle day premenstrual days could begin. A range for the
   * same reason the period is one: it inherits the window's uncertainty.
   */
  premenstrualFromDay: number;
  premenstrualToDay: number;
  /** Estimated from the window when nothing was measured; null once a signal exists. */
  likelyOvulation: { startDay: number; endDay: number } | null;
}

export interface PhaseMapInput {
  cycleDay: number;
  /** The predicted window in cycle days, not the predictor's day offsets. */
  windowStartDay: number;
  windowEndDay: number;
  periodLengthDays: number | null;
  bleedingToday: boolean;
  signal: OvulationSignal | null;
}

export function mapCyclePhases(input: PhaseMapInput): PhaseMap {
  const { cycleDay, windowStartDay, windowEndDay, signal } = input;

  const periodEnd = Math.max(
    1,
    Math.min(Math.round(input.periodLengthDays ?? DEFAULT_PERIOD_DAYS), windowStartDay - 1)
  );
  const ovulationDay = signal === null ? null : Math.max(signal.cycleDay, periodEnd + 1);
  const premenstrualStart = Math.max(
    windowStartDay - PREMENSTRUAL_DAYS,
    (ovulationDay ?? periodEnd) + 1
  );

  const candidates: PhaseSegment[] = [{ phase: 'period', startDay: 1, endDay: periodEnd }];
  if (ovulationDay === null) {
    candidates.push({ phase: 'between', startDay: periodEnd + 1, endDay: premenstrualStart - 1 });
  } else {
    candidates.push(
      { phase: 'follicular', startDay: periodEnd + 1, endDay: ovulationDay - 1 },
      { phase: 'ovulation', startDay: ovulationDay, endDay: ovulationDay },
      { phase: 'luteal', startDay: ovulationDay + 1, endDay: premenstrualStart - 1 }
    );
  }
  candidates.push(
    { phase: 'premenstrual', startDay: premenstrualStart, endDay: windowStartDay - 1 },
    { phase: 'window', startDay: windowStartDay, endDay: windowEndDay },
    { phase: 'late', startDay: windowEndDay + 1, endDay: cycleDay }
  );

  const segments = candidates.filter((segment) => segment.endDay >= segment.startDay);

  // A recorded bleed outranks the typical length: someone on day 7 of a long
  // period is in their period, whatever the average says.
  const current: CyclePhase = input.bleedingToday
    ? 'period'
    : (segments.find((s) => cycleDay >= s.startDay && cycleDay <= s.endDay)?.phase ?? 'between');

  const estimate = estimateOvulationRange(windowStartDay, windowEndDay);
  const likelyStart = Math.max(estimate.start, periodEnd + 1);

  return {
    segments,
    current,
    totalDays: Math.max(windowEndDay, cycleDay),
    premenstrualFromDay: premenstrualStart,
    premenstrualToDay: Math.max(premenstrualStart, windowEndDay - PREMENSTRUAL_DAYS),
    likelyOvulation:
      signal !== null || estimate.end < likelyStart
        ? null
        : { startDay: likelyStart, endDay: estimate.end },
  };
}
