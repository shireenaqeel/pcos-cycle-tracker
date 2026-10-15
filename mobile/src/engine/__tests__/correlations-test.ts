import { describe, expect, it } from '@jest/globals';

import { habitInsights } from '../correlations';
import type { DailySymptomLog, MovementLevel, SymptomTag } from '../../types';

let counter = 0;

function day(fields: {
  symptoms?: SymptomTag[];
  sleep?: number;
  stress?: number;
  water?: number;
  movement?: MovementLevel;
  meds?: string;
}): DailySymptomLog {
  counter += 1;
  return {
    id: `sym_${counter}`,
    userId: 'local',
    date: `2026-01-${String(counter).padStart(2, '0')}`,
    symptomTags: fields.symptoms ?? [],
    basalTemp: null,
    mood: null,
    moods: [],
    discharge: null,
    sex: [],
    stressLevel: fields.stress ?? null,
    hydrationGlasses: fields.water ?? null,
    sleepHours: fields.sleep ?? null,
    movement: fields.movement ?? null,
    foodNote: null,
    otherNote: null,
    flow: null,
    medications: fields.meds ?? null,
    lhTest: null,
  };
}

/** `count` days at a sleep length, with or without the symptom. */
function nights(count: number, sleep: number, symptoms: SymptomTag[]): DailySymptomLog[] {
  return Array.from({ length: count }, () => day({ sleep, symptoms }));
}

describe('staying silent until there is something to compare', () => {
  it('says nothing with no logs', () => {
    const result = habitInsights([]);
    expect(result.comparisons).toEqual([]);
    expect(result.hasEnoughData).toBe(false);
  });

  it('needs enough days on both sides of a split', () => {
    // Only four short nights and four long ones.
    const logs = [...nights(4, 5, ['fatigue']), ...nights(4, 9, [])];
    expect(habitInsights(logs).hasEnoughData).toBe(false);
  });

  it('ignores a symptom that has barely appeared', () => {
    const logs = [...nights(6, 5, ['fatigue']), ...nights(6, 9, [])];
    const cramps = habitInsights(logs).comparisons.find((c) => c.symptom === 'cramps');
    expect(cramps).toBeUndefined();
  });

  it('ignores a habit nobody records', () => {
    const logs = [...nights(6, 5, ['fatigue']), ...nights(6, 9, ['fatigue'])];
    expect(habitInsights(logs).habitsExamined).not.toContain('stress');
  });
});

describe('finding a difference worth showing', () => {
  it('reports a symptom that clusters on shorter nights', () => {
    const logs = [...nights(8, 5, ['fatigue']), ...nights(8, 9, [])];
    const result = habitInsights(logs);

    const fatigue = result.comparisons.find((c) => c.symptom === 'fatigue');
    expect(fatigue).toBeDefined();
    expect(fatigue?.habit).toBe('sleep');
    expect(fatigue?.moreLabel).toBe('shorter sleep');
    expect(fatigue?.moreRate).toBe(1);
    expect(fatigue?.lessRate).toBe(0);
  });

  it('reports which way round it goes, not just that it differs', () => {
    // Cramps here are logged on the *longer* nights.
    const logs = [...nights(8, 5, []), ...nights(8, 9, ['cramps'])];
    const cramps = habitInsights(logs).comparisons.find((c) => c.symptom === 'cramps');

    expect(cramps?.moreLabel).toBe('longer sleep');
    expect(cramps?.lessLabel).toBe('shorter sleep');
  });

  it('passes over a difference small enough to be noise', () => {
    // 5 of 10 against 4 of 10 — a real but trivial gap.
    const logs = [
      ...nights(5, 5, ['cramps']),
      ...nights(5, 5, []),
      ...nights(4, 9, ['cramps']),
      ...nights(6, 9, []),
    ];
    expect(habitInsights(logs).comparisons.find((c) => c.symptom === 'cramps')).toBeUndefined();
  });

  it('carries the day counts behind every figure', () => {
    const logs = [...nights(8, 5, ['fatigue']), ...nights(8, 9, [])];
    const [first] = habitInsights(logs).comparisons;

    expect(first.moreDays).toBeGreaterThanOrEqual(5);
    expect(first.lessDays).toBeGreaterThanOrEqual(5);
  });
});

describe('habits other than sleep', () => {
  it('splits stress at this person\'s own median', () => {
    const logs = [
      ...Array.from({ length: 7 }, () => day({ stress: 5, symptoms: ['headache'] })),
      ...Array.from({ length: 7 }, () => day({ stress: 1, symptoms: [] })),
    ];
    const headache = habitInsights(logs).comparisons.find((c) => c.habit === 'stress');

    expect(headache?.moreLabel).toBe('higher stress');
  });

  it('groups movement by kind rather than by median', () => {
    const logs = [
      ...Array.from({ length: 6 }, () => day({ movement: 'none', symptoms: ['bloating'] })),
      ...Array.from({ length: 6 }, () => day({ movement: 'moderate', symptoms: [] })),
    ];
    expect(habitInsights(logs).habitsExamined).toContain('movement');
  });

  it('compares days with something taken against days without', () => {
    const logs = [
      ...Array.from({ length: 6 }, () => day({ meds: 'ibuprofen', symptoms: ['cramps'] })),
      ...Array.from({ length: 6 }, () => day({ symptoms: [] })),
    ];
    expect(habitInsights(logs).habitsExamined).toContain('medication');
  });
});

describe('it must never imply cause', () => {
  it('reports two rates rather than a direction of effect', () => {
    const logs = [...nights(8, 5, ['fatigue']), ...nights(8, 9, [])];
    const [first] = habitInsights(logs).comparisons;

    // Both sides are present, so the screen can only phrase this as
    // co-occurrence — there is no single "effect" figure to misread.
    expect(first).toHaveProperty('moreRate');
    expect(first).toHaveProperty('lessRate');
    expect(first).not.toHaveProperty('cause');
    expect(first).not.toHaveProperty('effect');
  });

  it('uses labels that describe days, not consequences', () => {
    const logs = [...nights(8, 5, ['fatigue']), ...nights(8, 9, [])];

    for (const comparison of habitInsights(logs).comparisons) {
      for (const label of [comparison.moreLabel, comparison.lessLabel]) {
        expect(label).not.toMatch(/caus|because|leads to|due to|worsen|improve/i);
      }
    }
  });

  it('shows at most a handful at once', () => {
    const many: SymptomTag[] = ['fatigue', 'cramps', 'headache', 'bloating', 'nausea', 'acne'];
    const logs = [...nights(8, 5, many), ...nights(8, 9, [])];

    expect(habitInsights(logs).comparisons.length).toBeLessThanOrEqual(5);
  });
});
