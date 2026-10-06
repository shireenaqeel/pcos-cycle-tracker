import { describe, expect, it } from '@jest/globals';

import { phaseInsights } from '../phases';
import type { CycleLog, DailySymptomLog, SymptomTag } from '../../types';

function cycle(startDate: string): CycleLog {
  return {
    id: `cyc_${startDate}`,
    userId: 'local',
    startDate,
    endDate: null,
    flowIntensity: null,
    isConfirmed: true,
    entrySource: 'logged',
  };
}

function day(
  date: string,
  symptomTags: SymptomTag[] = [],
  stressLevel: number | null = null
): DailySymptomLog {
  return {
    id: `sym_${date}`,
    userId: 'local',
    date,
    symptomTags,
    basalTemp: null,
    mood: null,
    stressLevel,
    hydrationGlasses: null,
    sleepHours: null,
    movement: null,
    foodNote: null,
    otherNote: null,
    flow: null,
    medications: null,
    moods: [],
    discharge: null,
    sex: [],
  };
}

const CYCLES = [cycle('2026-01-01'), cycle('2026-02-01'), cycle('2026-03-01')];

describe('what counts as premenstrual', () => {
  it('ignores days with no period logged after them, since the label is hindsight', () => {
    const insights = phaseInsights(CYCLES, [day('2026-03-20', ['cramps'])]);

    expect(insights.premenstrualDays).toBe(0);
    expect(insights.restOfCycleDays).toBe(0);
  });

  it('counts the five days before a recorded start, and not the sixth', () => {
    const insights = phaseInsights(CYCLES, [
      day('2026-01-27'), // 5 days before 1 Feb
      day('2026-01-26'), // 6 days before — rest of cycle
    ]);

    expect(insights.premenstrualDays).toBe(1);
    expect(insights.restOfCycleDays).toBe(1);
  });
});

describe('symptom clustering', () => {
  it('surfaces a symptom that shows up mainly before a period', () => {
    const insights = phaseInsights(CYCLES, [
      day('2026-01-28', ['cramps']),
      day('2026-01-29', ['cramps']),
      day('2026-01-30', ['cramps']),
      day('2026-01-10', ['acne']),
      day('2026-01-12', []),
      day('2026-01-15', []),
    ]);

    const cramps = insights.clustered.find((pattern) => pattern.tag === 'cramps');
    expect(cramps).toBeDefined();
    expect(cramps?.premenstrualRate).toBe(1);
    expect(cramps?.restOfCycleRate).toBe(0);
  });

  it('leaves out anything that is no more common before a period', () => {
    const insights = phaseInsights(CYCLES, [
      day('2026-01-28', ['acne']),
      day('2026-01-10', ['acne']),
      day('2026-01-12', ['acne']),
    ]);

    expect(insights.clustered.find((pattern) => pattern.tag === 'acne')).toBeUndefined();
  });
});

describe('holding back until there is something to say', () => {
  it('stays quiet on a couple of logged days', () => {
    expect(phaseInsights(CYCLES, [day('2026-01-28', ['cramps'])]).hasEnoughData).toBe(false);
  });

  it('reports once both phases have several days behind them', () => {
    const insights = phaseInsights(CYCLES, [
      day('2026-01-28', ['cramps'], 4),
      day('2026-01-29', ['cramps'], 5),
      day('2026-01-30', [], 4),
      day('2026-01-10', [], 2),
      day('2026-01-12', [], 1),
      day('2026-01-15', [], 3),
    ]);

    expect(insights.hasEnoughData).toBe(true);
    expect(insights.averageStressPremenstrual).toBeCloseTo(13 / 3, 5);
    expect(insights.averageStressRestOfCycle).toBeCloseTo(2, 5);
  });

  it('reports no stress average when nobody logged stress', () => {
    const insights = phaseInsights(CYCLES, [day('2026-01-28', ['cramps'])]);
    expect(insights.averageStressPremenstrual).toBeNull();
  });
});
