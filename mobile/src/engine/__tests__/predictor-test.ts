import { describe, expect, it } from '@jest/globals';

import { predictNextCycle } from '../predictor';
import type { CycleLog, EntrySource } from '../../types';

function cycle(startDate: string, entrySource: EntrySource = 'logged'): CycleLog {
  return {
    id: `test_${startDate}_${entrySource}`,
    userId: 'local',
    startDate,
    endDate: null,
    flowIntensity: null,
    isConfirmed: true,
    entrySource,
  };
}

/** Start dates `spacingDays` apart, which is what the engine actually consumes. */
function evenlySpaced(count: number, spacingDays: number, entrySource: EntrySource = 'logged') {
  const start = new Date(Date.UTC(2026, 0, 1));
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(start.getTime() + i * spacingDays * 86_400_000);
    return cycle(day.toISOString().slice(0, 10), entrySource);
  });
}

describe('cold start, with nothing logged', () => {
  it('falls back to the phenotype prior rather than refusing to answer', () => {
    expect(predictNextCycle([], 'regular').meanCycleLength).toBeCloseTo(28, 6);
    expect(predictNextCycle([], 'mildly_irregular').meanCycleLength).toBeCloseTo(32, 6);
    expect(predictNextCycle([], 'diagnosed_pcos').meanCycleLength).toBeCloseTo(40, 6);
    expect(predictNextCycle([], 'unknown').meanCycleLength).toBeCloseTo(30, 6);
  });

  it('treats "not sure" and never-asked as the same wide prior', () => {
    expect(predictNextCycle([], null)).toEqual(predictNextCycle([], 'unknown'));
  });

  it('gives a less certain phenotype a wider window', () => {
    const width = (p: Parameters<typeof predictNextCycle>[1]) => {
      const r = predictNextCycle([], p);
      return r.rangeEndDay - r.rangeStartDay;
    };
    expect(width('regular')).toBeLessThan(width('mildly_irregular'));
    expect(width('mildly_irregular')).toBeLessThan(width('diagnosed_pcos'));
  });
});

describe('the reported window', () => {
  it('is always a range around the mean, never a bare date', () => {
    const result = predictNextCycle(evenlySpaced(4, 31), 'mildly_irregular');
    expect(result.rangeStartDay).toBeLessThan(result.rangeEndDay);
    expect(result.rangeStartDay).toBeLessThan(result.meanCycleLength);
    expect(result.rangeEndDay).toBeGreaterThan(result.meanCycleLength);
  });

  it('echoes back the confidence it was asked for, and widens with it', () => {
    const logs = evenlySpaced(4, 31);
    const modest = predictNextCycle(logs, 'regular', 0.6);
    const demanding = predictNextCycle(logs, 'regular', 0.95);

    expect(modest.confidence).toBe(0.6);
    expect(demanding.confidence).toBe(0.95);
    expect(demanding.rangeEndDay - demanding.rangeStartDay).toBeGreaterThan(
      modest.rangeEndDay - modest.rangeStartDay
    );
  });
});

describe('how observations move the posterior', () => {
  it('pulls the prior toward an observed cycle length', () => {
    const result = predictNextCycle([cycle('2026-01-01'), cycle('2026-01-31')], 'regular');
    expect(result.meanCycleLength).toBeCloseTo(28.2, 4);
  });

  it('converges toward the observed length as evidence accumulates', () => {
    const means = [2, 4, 10, 30].map(
      (count) => predictNextCycle(evenlySpaced(count, 35), 'regular').meanCycleLength
    );

    for (let i = 1; i < means.length; i++) {
      expect(means[i]).toBeGreaterThan(means[i - 1]);
    }
    expect(means[means.length - 1]).toBeGreaterThan(33);
    expect(means[means.length - 1]).toBeLessThan(35);
  });

  it('narrows the window as evidence accumulates', () => {
    const width = (count: number) => {
      const r = predictNextCycle(evenlySpaced(count, 35), 'unknown');
      return r.rangeEndDay - r.rangeStartDay;
    };
    expect(width(20)).toBeLessThan(width(2));
  });
});

describe('backfilled cycles are trusted less than logged ones', () => {
  it('moves the posterior less than an identical logged cycle', () => {
    const logged = predictNextCycle([cycle('2026-01-01'), cycle('2026-01-31')], 'regular');
    const remembered = predictNextCycle(
      [cycle('2026-01-01', 'backfilled'), cycle('2026-01-31', 'backfilled')],
      'regular'
    );

    expect(remembered.meanCycleLength).toBeCloseTo(28.0714, 4);
    expect(remembered.meanCycleLength).toBeLessThan(logged.meanCycleLength);
  });

  it('leaves more uncertainty than an identical logged cycle', () => {
    const logged = predictNextCycle(evenlySpaced(6, 35, 'logged'), 'regular');
    const remembered = predictNextCycle(evenlySpaced(6, 35, 'backfilled'), 'regular');

    expect(remembered.stdDevCycleLength).toBeGreaterThan(logged.stdDevCycleLength);
  });

  it('counts a gap as remembered when either end of it was backfilled', () => {
    const mixed = predictNextCycle(
      [cycle('2026-01-01', 'backfilled'), cycle('2026-01-31', 'logged')],
      'regular'
    );
    const bothRemembered = predictNextCycle(
      [cycle('2026-01-01', 'backfilled'), cycle('2026-01-31', 'backfilled')],
      'regular'
    );

    expect(mixed.meanCycleLength).toBeCloseTo(bothRemembered.meanCycleLength, 6);
  });
});

describe('learning how much this person actually varies', () => {
  function atOffsets(offsets: number[]): CycleLog[] {
    const start = new Date(Date.UTC(2026, 0, 1));
    let dayCursor = 0;
    return [0, ...offsets].map((gap) => {
      dayCursor += gap;
      const day = new Date(start.getTime() + dayCursor * 86_400_000);
      return cycle(day.toISOString().slice(0, 10));
    });
  }

  it('gives a scattered history a wider window than a steady one with the same average', () => {
    const steady = predictNextCycle(atOffsets([30, 30, 30, 30, 30, 30]), 'unknown');
    const scattered = predictNextCycle(atOffsets([18, 42, 21, 39, 24, 36]), 'unknown');

    expect(steady.meanCycleLength).toBeCloseTo(scattered.meanCycleLength, 0);
    expect(scattered.stdDevCycleLength).toBeGreaterThan(steady.stdDevCycleLength * 1.5);
  });

  it('refuses to claim more precision than whole-day tracking supports', () => {
    const flawless = predictNextCycle(atOffsets([28, 28, 28, 28, 28, 28, 28, 28, 28, 28]), 'regular');
    expect(flawless.stdDevCycleLength).toBeGreaterThanOrEqual(2);
  });

  it('ignores spread until there are at least two gaps to measure it from', () => {
    const single = predictNextCycle([cycle('2026-01-01'), cycle('2026-01-31')], 'regular');
    expect(single.meanCycleLength).toBeCloseTo(28.2, 4);
  });
});

describe('messy input', () => {
  it('does not care what order the logs arrive in', () => {
    const ordered = [cycle('2026-01-01'), cycle('2026-02-01'), cycle('2026-03-05')];
    const shuffled = [ordered[2], ordered[0], ordered[1]];

    expect(predictNextCycle(shuffled, 'regular')).toEqual(predictNextCycle(ordered, 'regular'));
  });

  it('ignores duplicate start dates instead of treating them as a zero-day cycle', () => {
    const withDuplicate = predictNextCycle(
      [cycle('2026-01-01'), cycle('2026-01-01'), cycle('2026-01-31')],
      'regular'
    );
    const withoutDuplicate = predictNextCycle(
      [cycle('2026-01-01'), cycle('2026-01-31')],
      'regular'
    );

    expect(withDuplicate.meanCycleLength).toBeCloseTo(withoutDuplicate.meanCycleLength, 6);
  });

  it('survives a single log, which yields no cycle length at all', () => {
    expect(predictNextCycle([cycle('2026-01-01')], 'regular').meanCycleLength).toBeCloseTo(28, 6);
  });
});

describe('calendar arithmetic', () => {
  it('measures a gap that crosses a daylight-saving boundary as whole days', () => {
    // US DST began 2026-03-08; naive local-time subtraction loses an hour here
    // and would round a 30-day gap down to 29.
    const acrossDst = predictNextCycle([cycle('2026-03-01'), cycle('2026-03-31')], 'regular');
    const clearOfDst = predictNextCycle([cycle('2026-05-01'), cycle('2026-05-31')], 'regular');

    expect(acrossDst.meanCycleLength).toBeCloseTo(clearOfDst.meanCycleLength, 6);
  });

  it('measures a gap that crosses a year boundary correctly', () => {
    const acrossNewYear = predictNextCycle([cycle('2025-12-15'), cycle('2026-01-14')], 'regular');
    expect(acrossNewYear.meanCycleLength).toBeCloseTo(28.2, 4);
  });
});
