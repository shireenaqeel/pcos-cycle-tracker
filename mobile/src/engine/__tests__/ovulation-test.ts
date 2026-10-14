import { describe, expect, it } from '@jest/globals';

import { detectOvulation } from '../ovulation';
import { predictNextCycle, projectCycleWindows } from '../predictor';
import type { CycleLog, DailySymptomLog, LhTest } from '../../types';

function day(
  date: string,
  fields: { lhTest?: LhTest; basalTemp?: number } = {}
): DailySymptomLog {
  return {
    id: `sym_${date}`,
    userId: 'local',
    date,
    symptomTags: [],
    basalTemp: fields.basalTemp ?? null,
    mood: null,
    moods: [],
    discharge: null,
    sex: [],
    stressLevel: null,
    hydrationGlasses: null,
    sleepHours: null,
    movement: null,
    foodNote: null,
    otherNote: null,
    flow: null,
    medications: null,
    lhTest: fields.lhTest ?? null,
  };
}

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

/** Flat baseline temperatures from day 2, then an optional run of raised ones. */
function temperatureRun(baseline: number[], raised: number[]): DailySymptomLog[] {
  const all = [...baseline, ...raised];
  return all.map((temp, index) =>
    day(`2026-03-${String(index + 2).padStart(2, '0')}`, { basalTemp: temp })
  );
}

describe('an LH strip', () => {
  it('puts ovulation the day after a positive', () => {
    const signal = detectOvulation([day('2026-03-14', { lhTest: 'positive' })], '2026-03-01');

    expect(signal).not.toBeNull();
    expect(signal?.source).toBe('lh');
    expect(signal?.date).toBe('2026-03-15');
    expect(signal?.cycleDay).toBe(15);
  });

  it('ignores negatives', () => {
    const logs = [day('2026-03-10', { lhTest: 'negative' }), day('2026-03-11', { lhTest: 'negative' })];
    expect(detectOvulation(logs, '2026-03-01')).toBeNull();
  });

  it('uses the latest positive when a cycle has several', () => {
    const logs = [
      day('2026-03-12', { lhTest: 'positive' }),
      day('2026-03-14', { lhTest: 'positive' }),
    ];
    expect(detectOvulation(logs, '2026-03-01')?.date).toBe('2026-03-15');
  });

  it('ignores a positive from before this cycle began', () => {
    const logs = [day('2026-02-20', { lhTest: 'positive' })];
    expect(detectOvulation(logs, '2026-03-01')).toBeNull();
  });
});

describe('a basal temperature rise', () => {
  const flat = [36.3, 36.25, 36.35, 36.3, 36.28, 36.32];

  it('needs the rise to hold for three days', () => {
    const twoDays = detectOvulation(temperatureRun(flat, [36.6, 36.62]), '2026-03-01');
    expect(twoDays).toBeNull();

    const threeDays = detectOvulation(temperatureRun(flat, [36.6, 36.62, 36.58]), '2026-03-01');
    expect(threeDays).not.toBeNull();
    expect(threeDays?.source).toBe('temperature');
  });

  it('puts ovulation just before the first raised reading', () => {
    // Baseline covers 2-7 March, so the first raised reading is the 8th.
    const signal = detectOvulation(temperatureRun(flat, [36.6, 36.62, 36.58]), '2026-03-01');
    expect(signal?.date).toBe('2026-03-07');
  });

  it('ignores a single warm morning', () => {
    const blip = detectOvulation(temperatureRun(flat, [36.7, 36.3, 36.28]), '2026-03-01');
    expect(blip).toBeNull();
  });

  it('will not call a rise without an established baseline', () => {
    const tooFew = detectOvulation(temperatureRun([36.3, 36.3], [36.7, 36.72, 36.69]), '2026-03-01');
    expect(tooFew).toBeNull();
  });

  it('requires a real step up, not drift within noise', () => {
    const drift = detectOvulation(temperatureRun(flat, [36.4, 36.42, 36.38]), '2026-03-01');
    expect(drift).toBeNull();
  });
});

describe('when both signals exist', () => {
  it('prefers the strip, which detects the surge rather than confirming after it', () => {
    const logs = [
      ...temperatureRun([36.3, 36.25, 36.35, 36.3, 36.28, 36.32], [36.6, 36.62, 36.58]),
      day('2026-03-12', { lhTest: 'positive' }),
    ];

    expect(detectOvulation(logs, '2026-03-01')?.source).toBe('lh');
  });
});

describe('what a measured signal does to the prediction', () => {
  const history = [cycle('2026-01-01'), cycle('2026-02-10'), cycle('2026-03-01')];
  const signal = { date: '2026-03-15', source: 'lh' as const, cycleDay: 15 };

  it('narrows the window sharply compared with counting days', () => {
    const guessed = predictNextCycle(history, 'diagnosed_pcos');
    const measured = predictNextCycle(history, 'diagnosed_pcos', 0.6, signal);

    const width = (p: { rangeStartDay: number; rangeEndDay: number }) =>
      p.rangeEndDay - p.rangeStartDay;
    expect(width(measured)).toBeLessThan(width(guessed) / 2);
  });

  it('centres it a luteal phase after the ovulation, not after the last period', () => {
    const measured = predictNextCycle(history, 'diagnosed_pcos', 0.6, signal);
    expect(measured.meanCycleLength).toBe(29);
  });

  it('is still a range, never a single day', () => {
    const measured = predictNextCycle(history, 'regular', 0.6, signal);
    expect(measured.rangeEndDay).toBeGreaterThan(measured.rangeStartDay);
  });

  it('widens when more confidence is demanded, like the unmeasured path', () => {
    const modest = predictNextCycle(history, 'regular', 0.6, signal);
    const demanding = predictNextCycle(history, 'regular', 0.95, signal);

    expect(demanding.rangeEndDay - demanding.rangeStartDay).toBeGreaterThan(
      modest.rangeEndDay - modest.rangeStartDay
    );
  });

  it('leaves the prediction untouched when there is no signal', () => {
    expect(predictNextCycle(history, 'regular', 0.6, null)).toEqual(
      predictNextCycle(history, 'regular')
    );
  });
});

describe('projected windows stay consistent with it', () => {
  const history = [cycle('2026-01-01'), cycle('2026-01-30'), cycle('2026-02-28')];
  const signal = { date: '2026-03-14', source: 'lh' as const, cycleDay: 15 };

  it('uses the measurement for the next window so Today and the calendar agree', () => {
    const next = predictNextCycle(history, 'regular', 0.6, signal);
    const [first] = projectCycleWindows(history, 'regular', 0.6, 6, signal);

    expect(first.cycleIndex).toBe(1);
    expect(first.rangeStartDay).toBe(next.rangeStartDay);
    expect(first.rangeEndDay).toBe(next.rangeEndDay);
  });

  it('never lets a later window overlap the measured one', () => {
    const windows = projectCycleWindows(history, 'regular', 0.6, 6, signal);

    for (let i = 1; i < windows.length; i++) {
      expect(windows[i].rangeStartDay).toBeGreaterThan(windows[i - 1].rangeEndDay);
    }
  });
});
