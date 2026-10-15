import type { DailySymptomLog, SymptomTag } from '../types';

/** Days needed on each side of a split before a comparison is shown at all. */
const MIN_DAYS_PER_GROUP = 5;

/** How often a symptom must appear overall before it is worth comparing. */
const MIN_SYMPTOM_DAYS = 3;

/** The gap in rates below which a difference is not worth reporting. */
const MIN_RATE_DIFFERENCE = 0.2;

/** Most differences shown at once, so the screen stays readable. */
const MAX_COMPARISONS = 5;

export type HabitKey = 'sleep' | 'stress' | 'hydration' | 'movement' | 'medication';

export interface HabitComparison {
  habit: HabitKey;
  /** e.g. "shorter sleep" — the group where the symptom was more common. */
  moreLabel: string;
  lessLabel: string;
  symptom: SymptomTag;
  /** Share of days in each group where the symptom was logged, 0-1. */
  moreRate: number;
  lessRate: number;
  moreDays: number;
  lessDays: number;
}

export interface HabitInsights {
  comparisons: HabitComparison[];
  /** Habits with enough days recorded to have been looked at. */
  habitsExamined: HabitKey[];
  hasEnoughData: boolean;
}

interface Split {
  habit: HabitKey;
  lowLabel: string;
  highLabel: string;
  low: DailySymptomLog[];
  high: DailySymptomLog[];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/**
 * Splits days by a numeric habit at **this person's own median**, rather than a
 * fixed cutoff. Picking a number like "six hours" would assert a threshold the
 * app has no evidence for; a median split only ever says "your shorter nights
 * versus your longer ones", which is a claim about their data and nothing more.
 */
function splitByNumber(
  logs: DailySymptomLog[],
  habit: HabitKey,
  read: (entry: DailySymptomLog) => number | null,
  lowLabel: string,
  highLabel: string
): Split | null {
  const recorded = logs.filter((entry) => read(entry) !== null);
  if (recorded.length < MIN_DAYS_PER_GROUP * 2) return null;

  const cut = median(recorded.map((entry) => read(entry) as number));
  const low = recorded.filter((entry) => (read(entry) as number) < cut);
  const high = recorded.filter((entry) => (read(entry) as number) >= cut);

  return { habit, lowLabel, highLabel, low, high };
}

function rate(group: DailySymptomLog[], symptom: SymptomTag): number {
  if (group.length === 0) return 0;
  return group.filter((entry) => entry.symptomTags.includes(symptom)).length / group.length;
}

/**
 * Compares how often each symptom was logged on one kind of day against
 * another — shorter nights against longer ones, higher-stress days against
 * calmer ones, and so on.
 *
 * **This is co-occurrence, not cause.** Someone sleeping badly *because* of
 * cramps produces exactly the same numbers as cramps caused by poor sleep, and
 * nothing here can tell the two apart. The output is deliberately shaped as two
 * rates with their day counts so the screen can only ever say "logged together
 * more often", and every figure arrives with the number of days behind it.
 *
 * Silence is the default. A comparison appears only with enough days on both
 * sides, enough instances of the symptom, and a gap wide enough not to be noise.
 */
export function habitInsights(logs: DailySymptomLog[]): HabitInsights {
  const splits: Split[] = [];

  const sleep = splitByNumber(logs, 'sleep', (e) => e.sleepHours, 'shorter sleep', 'longer sleep');
  if (sleep !== null) splits.push(sleep);

  const stress = splitByNumber(logs, 'stress', (e) => e.stressLevel, 'lower stress', 'higher stress');
  if (stress !== null) splits.push(stress);

  const water = splitByNumber(logs, 'hydration', (e) => e.hydrationGlasses, 'less water', 'more water');
  if (water !== null) splits.push(water);

  // Movement and medication are categorical, so they split on kind, not median.
  const moved = logs.filter((entry) => entry.movement !== null);
  if (moved.length >= MIN_DAYS_PER_GROUP * 2) {
    splits.push({
      habit: 'movement',
      lowLabel: 'quieter days',
      highLabel: 'more active days',
      low: moved.filter((e) => e.movement === 'none' || e.movement === 'light'),
      high: moved.filter((e) => e.movement === 'moderate' || e.movement === 'intense'),
    });
  }

  const withMeds = logs.filter((entry) => entry.medications !== null);
  const withoutMeds = logs.filter((entry) => entry.medications === null);
  if (withMeds.length >= MIN_DAYS_PER_GROUP && withoutMeds.length >= MIN_DAYS_PER_GROUP) {
    splits.push({
      habit: 'medication',
      lowLabel: 'days without anything logged',
      highLabel: 'days you took something',
      low: withoutMeds,
      high: withMeds,
    });
  }

  const symptoms = new Set<SymptomTag>();
  for (const entry of logs) {
    for (const tag of entry.symptomTags) symptoms.add(tag);
  }

  const comparisons: HabitComparison[] = [];
  const habitsExamined: HabitKey[] = [];

  for (const split of splits) {
    if (split.low.length < MIN_DAYS_PER_GROUP || split.high.length < MIN_DAYS_PER_GROUP) continue;
    habitsExamined.push(split.habit);

    for (const symptom of symptoms) {
      const occurrences = logs.filter((entry) => entry.symptomTags.includes(symptom)).length;
      if (occurrences < MIN_SYMPTOM_DAYS) continue;

      const lowRate = rate(split.low, symptom);
      const highRate = rate(split.high, symptom);
      if (Math.abs(highRate - lowRate) < MIN_RATE_DIFFERENCE) continue;

      const highIsMore = highRate > lowRate;
      comparisons.push({
        habit: split.habit,
        symptom,
        moreLabel: highIsMore ? split.highLabel : split.lowLabel,
        lessLabel: highIsMore ? split.lowLabel : split.highLabel,
        moreRate: highIsMore ? highRate : lowRate,
        lessRate: highIsMore ? lowRate : highRate,
        moreDays: highIsMore ? split.high.length : split.low.length,
        lessDays: highIsMore ? split.low.length : split.high.length,
      });
    }
  }

  comparisons.sort((a, b) => b.moreRate - b.lessRate - (a.moreRate - a.lessRate));

  return {
    comparisons: comparisons.slice(0, MAX_COMPARISONS),
    habitsExamined,
    hasEnoughData: habitsExamined.length > 0,
  };
}
