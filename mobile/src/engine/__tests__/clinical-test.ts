import { describe, expect, it } from '@jest/globals';

import { clinicalReview } from '../clinical';
import type { CycleLog, DailySymptomLog, FlowIntensity } from '../../types';

const NOW = new Date('2026-06-01T12:00:00.000Z');

function cycle(startDate: string, endDate: string | null = null): CycleLog {
  return {
    id: `cyc_${startDate}`,
    userId: 'local',
    startDate,
    endDate,
    flowIntensity: null,
    isConfirmed: true,
    entrySource: 'logged',
  };
}

function day(date: string, flow: FlowIntensity | null = null): DailySymptomLog {
  return {
    id: `sym_${date}`,
    userId: 'local',
    date,
    symptomTags: [],
    basalTemp: null,
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
    flow,
    medications: null,
  };
}

/** Starts spaced a fixed number of days apart, ending just before NOW. */
function spaced(count: number, gap: number): CycleLog[] {
  const last = Date.UTC(2026, 4, 25);
  return Array.from({ length: count }, (_, index) =>
    cycle(new Date(last - (count - 1 - index) * gap * 86_400_000).toISOString().slice(0, 10))
  );
}

function ids(cycles: CycleLog[], symptoms: DailySymptomLog[] = []): string[] {
  return clinicalReview(cycles, symptoms, NOW).flags.map((flag) => flag.id);
}

describe('staying quiet when there is nothing to say', () => {
  it('says nothing at all with no history', () => {
    const review = clinicalReview([], [], NOW);
    expect(review.flags).toEqual([]);
    expect(review.hasEnoughData).toBe(false);
  });

  it('does not call a cycle irregular off two gaps', () => {
    expect(ids(spaced(3, 44))).not.toContain('long-cycles');
  });

  it('leaves a steady history unflagged', () => {
    expect(ids(spaced(8, 29))).toEqual([]);
  });
});

describe('cycle length against the guideline thresholds', () => {
  it('flags repeated cycles over 35 days', () => {
    expect(ids(spaced(6, 48))).toContain('long-cycles');
  });

  it('flags repeated cycles under 21 days', () => {
    expect(ids(spaced(6, 18))).toContain('short-cycles');
  });

  it('flags a wide spread even when no single cycle is extreme', () => {
    // 24, 34, 24, 34 — each inside range, but 10 days apart end to end.
    const starts = [0, 24, 58, 82, 116];
    const base = Date.UTC(2026, 1, 1);
    const cycles = starts.map((offset) =>
      cycle(new Date(base + offset * 86_400_000).toISOString().slice(0, 10))
    );

    const flags = ids(cycles);
    expect(flags).toContain('wide-spread');
    expect(flags).not.toContain('long-cycles');
    expect(flags).not.toContain('short-cycles');
  });
});

describe('absence and bleeding, which stand on their own', () => {
  it('flags three months with no period regardless of cycle count', () => {
    expect(ids([cycle('2026-01-05')])).toContain('no-period-90');
  });

  it('does not flag an absence that is still within range', () => {
    expect(ids([cycle('2026-05-20')])).not.toContain('no-period-90');
  });

  it('flags a period that ran longer than eight days', () => {
    expect(ids([cycle('2026-05-01', '2026-05-11')])).toContain('long-bleed');
  });

  it('accepts a seven-day period without comment', () => {
    expect(ids([cycle('2026-05-20', '2026-05-26')])).not.toContain('long-bleed');
  });

  it('flags repeated heavy days from the daily log', () => {
    const heavy = [day('2026-05-21', 'heavy'), day('2026-05-22', 'clots'), day('2026-05-23', 'heavy')];
    expect(ids([cycle('2026-05-20')], heavy)).toContain('heavy-flow');
  });

  it('ignores one or two heavy days', () => {
    expect(ids([cycle('2026-05-20')], [day('2026-05-21', 'heavy')])).not.toContain('heavy-flow');
  });
});

describe('periods per year', () => {
  it('needs a year of history before counting them', () => {
    // Six cycles, but all inside the last few months.
    expect(ids(spaced(6, 30))).not.toContain('few-periods');
  });

  it('flags fewer than eight across a tracked year', () => {
    const base = Date.UTC(2025, 5, 1);
    const cycles = [0, 70, 140, 215, 290, 350].map((offset) =>
      cycle(new Date(base + offset * 86_400_000).toISOString().slice(0, 10))
    );
    expect(ids(cycles)).toContain('few-periods');
  });
});

describe('how findings are worded', () => {
  it('cites a source and never states a diagnosis', () => {
    const review = clinicalReview(spaced(6, 48), [], NOW);
    expect(review.flags.length).toBeGreaterThan(0);

    for (const flag of review.flags) {
      expect(flag.source.length).toBeGreaterThan(20);
      expect(flag.finding.length).toBeGreaterThan(0);
      // Nothing may assert the person has a condition.
      expect(flag.meaning).not.toMatch(/you have (PCOS|polycystic)/i);
      expect(flag.title).not.toMatch(/diagnos/i);
    }
  });
});
