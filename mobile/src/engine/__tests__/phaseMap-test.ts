import { describe, expect, it } from '@jest/globals';

import type { OvulationSignal } from '../ovulation';
import { mapCyclePhases, type PhaseMapInput } from '../phaseMap';

const base: PhaseMapInput = {
  cycleDay: 10,
  windowStartDay: 28,
  windowEndDay: 36,
  periodLengthDays: 5,
  bleedingToday: false,
  signal: null,
};

const lhSignal: OvulationSignal = { date: '2026-03-15', source: 'lh', cycleDay: 15 };

function phases(input: PhaseMapInput) {
  return mapCyclePhases(input).segments.map((segment) => [
    segment.phase,
    segment.startDay,
    segment.endDay,
  ]);
}

describe('mapCyclePhases', () => {
  it('lays out an unmeasured cycle without naming ovulation', () => {
    expect(phases(base)).toEqual([
      ['period', 1, 5],
      ['between', 6, 22],
      ['premenstrual', 23, 27],
      ['window', 28, 36],
    ]);
    expect(mapCyclePhases(base).current).toBe('between');
  });

  it('names follicular, ovulation and luteal once ovulation is measured', () => {
    expect(phases({ ...base, signal: lhSignal })).toEqual([
      ['period', 1, 5],
      ['follicular', 6, 14],
      ['ovulation', 15, 15],
      ['luteal', 16, 22],
      ['premenstrual', 23, 27],
      ['window', 28, 36],
    ]);
  });

  it('places today in the phase its cycle day falls in', () => {
    expect(mapCyclePhases({ ...base, cycleDay: 3 }).current).toBe('period');
    expect(mapCyclePhases({ ...base, cycleDay: 25 }).current).toBe('premenstrual');
    expect(mapCyclePhases({ ...base, cycleDay: 30 }).current).toBe('window');
    expect(mapCyclePhases({ ...base, cycleDay: 36 }).current).toBe('window');
    expect(mapCyclePhases({ ...base, cycleDay: 18, signal: lhSignal }).current).toBe('luteal');
  });

  it('runs past the window as late rather than wrapping round', () => {
    const map = mapCyclePhases({ ...base, cycleDay: 44 });

    expect(map.current).toBe('late');
    expect(map.totalDays).toBe(44);
    expect(map.segments[map.segments.length - 1]).toEqual({
      phase: 'late',
      startDay: 37,
      endDay: 44,
    });
  });

  it('trusts a recorded bleed over the typical period length', () => {
    expect(mapCyclePhases({ ...base, cycleDay: 8, bleedingToday: true }).current).toBe('period');
  });

  it('gives the premenstrual start as a range that inherits the window', () => {
    const map = mapCyclePhases(base);

    expect(map.premenstrualFromDay).toBe(23);
    expect(map.premenstrualToDay).toBe(31);
  });

  it('never starts premenstrual days before the period or a measured ovulation ends', () => {
    const tight = mapCyclePhases({ ...base, windowStartDay: 8, windowEndDay: 12 });
    expect(tight.segments.find((s) => s.phase === 'premenstrual')).toEqual({
      phase: 'premenstrual',
      startDay: 6,
      endDay: 7,
    });

    const late = mapCyclePhases({ ...base, signal: { ...lhSignal, cycleDay: 25 } });
    expect(late.segments.find((s) => s.phase === 'premenstrual')?.startDay).toBe(26);
  });

  it('falls back to a typical period length when none is recorded', () => {
    expect(mapCyclePhases({ ...base, periodLengthDays: null }).segments[0]).toEqual({
      phase: 'period',
      startDay: 1,
      endDay: 5,
    });
  });

  it('estimates ovulation as the window moved back by the luteal phase', () => {
    expect(mapCyclePhases(base).likelyOvulation).toEqual({ startDay: 14, endDay: 22 });
  });

  it('drops the estimate once ovulation is measured', () => {
    expect(mapCyclePhases({ ...base, signal: lhSignal }).likelyOvulation).toBeNull();
  });

  it('keeps the estimate out of the period, and gives none when nothing is left', () => {
    expect(
      mapCyclePhases({ ...base, windowStartDay: 18, windowEndDay: 30 }).likelyOvulation
    ).toEqual({ startDay: 6, endDay: 16 });
    expect(
      mapCyclePhases({ ...base, windowStartDay: 8, windowEndDay: 12 }).likelyOvulation
    ).toBeNull();
  });

  it('leaves the estimate out of the segments, so phases still need a measurement', () => {
    const named = mapCyclePhases(base).segments.map((segment) => segment.phase);
    expect(named).not.toContain('ovulation');
    expect(named).not.toContain('luteal');
  });

  it('tiles every day from 1 to the end exactly once', () => {
    const inputs: PhaseMapInput[] = [
      base,
      { ...base, signal: lhSignal },
      { ...base, cycleDay: 50 },
      { ...base, windowStartDay: 4, windowEndDay: 9, periodLengthDays: 7 },
      { ...base, windowStartDay: 40, windowEndDay: 70, periodLengthDays: 2.6 },
      { ...base, signal: { ...lhSignal, cycleDay: 2 } },
    ];

    for (const input of inputs) {
      const map = mapCyclePhases(input);
      let expectedStart = 1;
      for (const segment of map.segments) {
        expect(segment.startDay).toBe(expectedStart);
        expect(segment.endDay).toBeGreaterThanOrEqual(segment.startDay);
        expectedStart = segment.endDay + 1;
      }
      expect(expectedStart - 1).toBe(map.totalDays);
    }
  });
});
