import { cycleGaps } from './gaps';
import type { CycleLog, DailySymptomLog, SymptomTag } from '../types';

/**
 * The stretch before a period, where PMS-type symptoms are expected to cluster.
 * Counted backwards from the next period's start, since that is the event the
 * pattern is anchored to.
 */
const PREMENSTRUAL_DAYS = 5;

export interface SymptomPattern {
  tag: SymptomTag;
  /** Share of premenstrual days this was logged on, 0-1. */
  premenstrualRate: number;
  restOfCycleRate: number;
  premenstrualDays: number;
  restOfCycleDays: number;
}

export interface PhaseInsights {
  /** Days that fell in the run-up to a period we can actually see the start of. */
  premenstrualDays: number;
  restOfCycleDays: number;
  /** Symptoms logged more often before a period than during the rest of the cycle. */
  clustered: SymptomPattern[];
  averageStressPremenstrual: number | null;
  averageStressRestOfCycle: number | null;
  /** False until there is enough logged to say anything at all. */
  hasEnoughData: boolean;
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000
  );
}

/**
 * Splits logged days by where they fell in the cycle, then compares how often
 * each symptom appears in the run-up to a period against the rest of the time.
 *
 * Only days that sit before a period whose start was *actually recorded* count:
 * a day can only be labelled premenstrual in hindsight. This is descriptive
 * counting, not a model — with a handful of cycles the rates move a lot, which
 * is why the screen reports how many days each figure rests on.
 */
export function phaseInsights(
  cycles: CycleLog[],
  symptoms: DailySymptomLog[]
): PhaseInsights {
  const starts = cycles.map((cycle) => cycle.startDate).sort((a, b) => a.localeCompare(b));

  const premenstrual: DailySymptomLog[] = [];
  const rest: DailySymptomLog[] = [];

  for (const entry of symptoms) {
    const nextStart = starts.find((start) => start > entry.date);
    if (nextStart === undefined) continue; // no period logged after it yet

    const daysUntil = daysBetween(entry.date, nextStart);
    if (daysUntil <= PREMENSTRUAL_DAYS) premenstrual.push(entry);
    else rest.push(entry);
  }

  const tags = new Set<SymptomTag>();
  for (const entry of [...premenstrual, ...rest]) {
    for (const tag of entry.symptomTags) tags.add(tag);
  }

  const clustered: SymptomPattern[] = [];
  for (const tag of tags) {
    const before = premenstrual.filter((entry) => entry.symptomTags.includes(tag)).length;
    const during = rest.filter((entry) => entry.symptomTags.includes(tag)).length;
    const premenstrualRate = premenstrual.length === 0 ? 0 : before / premenstrual.length;
    const restOfCycleRate = rest.length === 0 ? 0 : during / rest.length;

    if (premenstrualRate > restOfCycleRate) {
      clustered.push({
        tag,
        premenstrualRate,
        restOfCycleRate,
        premenstrualDays: before,
        restOfCycleDays: during,
      });
    }
  }

  clustered.sort(
    (a, b) => b.premenstrualRate - b.restOfCycleRate - (a.premenstrualRate - a.restOfCycleRate)
  );

  const meanStress = (entries: DailySymptomLog[]): number | null => {
    const values = entries
      .map((entry) => entry.stressLevel)
      .filter((value): value is number => value !== null);
    return values.length === 0
      ? null
      : values.reduce((total, value) => total + value, 0) / values.length;
  };

  return {
    premenstrualDays: premenstrual.length,
    restOfCycleDays: rest.length,
    clustered,
    averageStressPremenstrual: meanStress(premenstrual),
    averageStressRestOfCycle: meanStress(rest),
    // Two cycles' worth of gaps and a handful of logged days before any of this
    // is worth showing; below that it is noise with a percentage sign on it.
    hasEnoughData: cycleGaps(cycles).length >= 2 && premenstrual.length >= 3 && rest.length >= 3,
  };
}
