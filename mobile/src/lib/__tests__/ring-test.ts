import { describe, expect, it } from '@jest/globals';

import { ringGeometry } from '../ring';

describe('ringGeometry', () => {
  it('places today partway round a ring sized by the predicted window', () => {
    const ring = ringGeometry({ cycleDay: 17, windowStartDay: 26, windowEndDay: 34 });

    expect(ring.totalDays).toBe(34);
    expect(ring.elapsedFraction).toBeCloseTo(0.5, 2);
    expect(ring.windowStartFraction).toBeCloseTo(26 / 34, 6);
    expect(ring.windowEndFraction).toBe(1);
    expect(ring.isOverdue).toBe(false);
  });

  it('stretches the ring when a period is late so the marker stays on it', () => {
    const ring = ringGeometry({ cycleDay: 52, windowStartDay: 26, windowEndDay: 34 });

    expect(ring.totalDays).toBe(52);
    expect(ring.elapsedFraction).toBe(1);
    expect(ring.windowEndFraction).toBeCloseTo(34 / 52, 6);
    expect(ring.isOverdue).toBe(true);
  });

  it('treats the last day of the window as not yet overdue', () => {
    expect(ringGeometry({ cycleDay: 34, windowStartDay: 26, windowEndDay: 34 }).isOverdue).toBe(
      false
    );
  });

  it('keeps every fraction on the ring even with odd inputs', () => {
    const ring = ringGeometry({ cycleDay: 1, windowStartDay: -4, windowEndDay: 0 });

    for (const fraction of [
      ring.elapsedFraction,
      ring.windowStartFraction,
      ring.windowEndFraction,
    ]) {
      expect(fraction).toBeGreaterThanOrEqual(0);
      expect(fraction).toBeLessThanOrEqual(1);
    }
    expect(ring.totalDays).toBeGreaterThanOrEqual(1);
  });
});
