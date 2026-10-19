import { describe, expect, it } from '@jest/globals';

import type { OvulationSignal } from '../../engine/ovulation';
import type { ProjectedWindow } from '../../engine/predictor';
import type { CycleLog } from '../../types';
import { buildCycleCalendar } from '../cycleDays';

const cycle: CycleLog = {
  id: 'c1',
  userId: 'local',
  startDate: '2026-03-01',
  endDate: '2026-03-05',
  flowIntensity: null,
  isConfirmed: true,
  entrySource: 'logged',
};

const windows: ProjectedWindow[] = [
  { cycleIndex: 1, rangeStartDay: 27, rangeEndDay: 33, confidence: 0.6 },
  { cycleIndex: 2, rangeStartDay: 57, rangeEndDay: 69, confidence: 0.6 },
];

const today = new Date(2026, 2, 10);

function sorted(dates: Set<string>): string[] {
  return [...dates].sort();
}

describe('buildCycleCalendar', () => {
  it('always returns every set the calendar reads, even with nothing recorded', () => {
    const empty = buildCycleCalendar([], [], [], today);

    for (const set of [
      empty.periodDates,
      empty.predictedDates,
      empty.premenstrualDates,
      empty.likelyOvulationDates,
      empty.symptomDates,
    ]) {
      expect(set).toBeInstanceOf(Set);
      expect(set.size).toBe(0);
    }
    expect(empty.ovulationDate).toBeNull();
  });

  it('marks the five days before each window as premenstrual', () => {
    const calendar = buildCycleCalendar([cycle], [], windows, today);

    expect(sorted(calendar.premenstrualDates)).toEqual([
      '2026-03-23',
      '2026-03-24',
      '2026-03-25',
      '2026-03-26',
      '2026-03-27',
      '2026-04-22',
      '2026-04-23',
      '2026-04-24',
      '2026-04-25',
      '2026-04-26',
    ]);
  });

  it('estimates ovulation two weeks before each window, inside its own cycle', () => {
    const dates = sorted(buildCycleCalendar([cycle], [], windows, today).likelyOvulationDates);

    expect(dates[0]).toBe('2026-03-14');
    expect(dates).toContain('2026-03-20');
    expect(dates).not.toContain('2026-03-21');
    // The second cycle's estimate would start on day 43; it stays after the first window.
    expect(dates).toContain('2026-04-13');
    expect(dates).not.toContain('2026-04-03');
    expect(dates[dates.length - 1]).toBe('2026-04-25');
  });

  it('replaces the current cycle estimate with a measured ovulation', () => {
    const signal: OvulationSignal = { date: '2026-03-16', source: 'lh', cycleDay: 16 };
    const calendar = buildCycleCalendar([cycle], [], windows, today, signal);

    expect(calendar.ovulationDate).toBe('2026-03-16');
    expect(sorted(calendar.likelyOvulationDates)[0]).toBe('2026-04-13');
  });
});
