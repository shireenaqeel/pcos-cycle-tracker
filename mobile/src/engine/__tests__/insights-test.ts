import { describe, expect, it } from '@jest/globals';

import { cycleInsights } from '../insights';
import type { CycleLog } from '../../types';

function cycle(startDate: string, endDate: string | null = null): CycleLog {
  return {
    id: `test_${startDate}`,
    userId: 'local',
    startDate,
    endDate,
    flowIntensity: null,
    isConfirmed: true,
    entrySource: 'logged',
  };
}

const NOW = new Date('2026-06-01T12:00:00.000Z');

describe('with nothing recorded', () => {
  it('reports absence rather than zeroes that look like measurements', () => {
    const insights = cycleInsights([], NOW);

    expect(insights.measuredCycles).toBe(0);
    expect(insights.shortestCycleDays).toBeNull();
    expect(insights.longestCycleDays).toBeNull();
    expect(insights.averageCycleDays).toBeNull();
    expect(insights.spreadDays).toBeNull();
    expect(insights.typicalPeriodLengthDays).toBeNull();
  });

  it('needs two periods before any cycle can be measured', () => {
    const insights = cycleInsights([cycle('2026-05-01')], NOW);

    expect(insights.periodsInLastYear).toBe(1);
    expect(insights.measuredCycles).toBe(0);
    expect(insights.averageCycleDays).toBeNull();
  });
});

describe('cycle length statistics', () => {
  const logs = [
    cycle('2026-01-01'),
    cycle('2026-01-29'), // 28
    cycle('2026-03-05'), // 35
    cycle('2026-03-26'), // 21
    cycle('2026-05-01'), // 36
  ];

  it('reports the shortest, longest and spread a clinician asks for', () => {
    const insights = cycleInsights(logs, NOW);

    expect(insights.measuredCycles).toBe(4);
    expect(insights.shortestCycleDays).toBe(21);
    expect(insights.longestCycleDays).toBe(36);
    expect(insights.spreadDays).toBe(15);
  });

  it('reports both average and median, which diverge on irregular histories', () => {
    const insights = cycleInsights(logs, NOW);

    expect(insights.averageCycleDays).toBeCloseTo(30, 6);
    expect(insights.medianCycleDays).toBeCloseTo(31.5, 6);
  });
});

describe('periods in the last year', () => {
  it('counts only what falls inside the window', () => {
    const insights = cycleInsights(
      [cycle('2024-02-01'), cycle('2025-01-01'), cycle('2026-01-01'), cycle('2026-05-01')],
      NOW
    );

    expect(insights.periodsInLastYear).toBe(2);
  });
});

describe('period length', () => {
  it('counts both the first and last day of bleeding', () => {
    const insights = cycleInsights([cycle('2026-05-01', '2026-05-05')], NOW);
    expect(insights.typicalPeriodLengthDays).toBe(5);
  });

  it('treats a period that started and ended the same day as one day', () => {
    const insights = cycleInsights([cycle('2026-05-01', '2026-05-01')], NOW);
    expect(insights.typicalPeriodLengthDays).toBe(1);
  });

  it('averages only over periods that actually have an end date', () => {
    const insights = cycleInsights(
      [cycle('2026-03-01', '2026-03-05'), cycle('2026-04-01'), cycle('2026-05-01', '2026-05-07')],
      NOW
    );

    expect(insights.periodsWithRecordedLength).toBe(2);
    expect(insights.typicalPeriodLengthDays).toBe(6);
  });
});
