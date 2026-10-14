import type { DailySymptomLog } from '../types';

/**
 * How long after ovulation the next period arrives. The luteal phase is far
 * more consistent between people and between cycles than total cycle length —
 * which is exactly why a measured ovulation beats counting days from the last
 * period, and why it helps most for the irregular cycles this app is for.
 */
export const LUTEAL_MEAN_DAYS = 14;

/**
 * Spread of that interval. Wider than the ~1.5 days reported for the luteal
 * phase itself, because this is a population figure standing in for a personal
 * one we have not measured. Claiming the tighter number would be overstating
 * what a single signal can tell us.
 */
export const LUTEAL_STD_DEV_DAYS = 2.2;

/** A positive LH strip precedes ovulation by roughly a day. */
const LH_TO_OVULATION_DAYS = 1;

/** Readings needed before a temperature baseline means anything. */
const BASELINE_READINGS = 6;

/** Consecutive days above baseline that count as a sustained rise. */
const SUSTAINED_DAYS = 3;

/** How far above baseline a reading has to sit, in °C, to count as a rise. */
const RISE_THRESHOLD_C = 0.2;

export interface OvulationSignal {
  /** Estimated date of ovulation, ISO. */
  date: string;
  source: 'lh' | 'temperature';
  /** Days from the cycle's first day to that date. */
  cycleDay: number;
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000);
}

function addDaysIso(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/**
 * Finds a measured ovulation in the current cycle, or nothing.
 *
 * Returning null is the common case and must stay cheap to handle: most people
 * will never take an LH test or a morning temperature, and the app has to work
 * just as well for them.
 *
 * An LH result wins over a temperature rise when both exist. The strip detects
 * the surge *before* ovulation, so it is both earlier and more direct; a
 * temperature rise can only confirm afterwards.
 */
export function detectOvulation(
  logs: DailySymptomLog[],
  cycleStart: string
): OvulationSignal | null {
  const inCycle = logs
    .filter((entry) => entry.date >= cycleStart)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Latest positive strip, since an earlier one in the same cycle is superseded.
  const positives = inCycle.filter((entry) => entry.lhTest === 'positive');
  if (positives.length > 0) {
    const date = addDaysIso(positives[positives.length - 1].date, LH_TO_OVULATION_DAYS);
    return { date, source: 'lh', cycleDay: daysBetween(cycleStart, date) + 1 };
  }

  const temps = inCycle.filter(
    (entry): entry is DailySymptomLog & { basalTemp: number } => entry.basalTemp !== null
  );

  // A rise is only meaningful against an established baseline, and only once it
  // has held for several days — a single warm morning is noise, not ovulation.
  for (let index = BASELINE_READINGS; index + SUSTAINED_DAYS - 1 < temps.length; index++) {
    const baseline = mean(temps.slice(index - BASELINE_READINGS, index).map((e) => e.basalTemp));
    const run = temps.slice(index, index + SUSTAINED_DAYS);
    if (run.every((entry) => entry.basalTemp >= baseline + RISE_THRESHOLD_C)) {
      // Ovulation sits just before the first raised reading.
      const date = addDaysIso(run[0].date, -1);
      if (date < cycleStart) return null;
      return { date, source: 'temperature', cycleDay: daysBetween(cycleStart, date) + 1 };
    }
  }

  return null;
}
