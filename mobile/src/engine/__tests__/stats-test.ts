import { describe, expect, it } from '@jest/globals';

import { inverseNormalCdf, zForCentralConfidence } from '../stats';

describe('inverseNormalCdf', () => {
  it('matches known quantiles of the standard normal', () => {
    expect(inverseNormalCdf(0.5)).toBeCloseTo(0, 6);
    expect(inverseNormalCdf(0.975)).toBeCloseTo(1.959964, 4);
    expect(inverseNormalCdf(0.025)).toBeCloseTo(-1.959964, 4);
    expect(inverseNormalCdf(0.84134)).toBeCloseTo(1, 4);
  });

  it('stays accurate in the tails, where the approximation switches branches', () => {
    expect(inverseNormalCdf(0.001)).toBeCloseTo(-3.090232, 3);
    expect(inverseNormalCdf(0.999)).toBeCloseTo(3.090232, 3);
    // Exactly the branch-switch point in Acklam's approximation.
    expect(inverseNormalCdf(0.02425)).toBeCloseTo(-1.972961, 5);
  });

  it('is symmetric about the median', () => {
    for (const p of [0.01, 0.1, 0.3, 0.45]) {
      expect(inverseNormalCdf(p)).toBeCloseTo(-inverseNormalCdf(1 - p), 6);
    }
  });

  it('rejects probabilities outside (0, 1), which have no finite quantile', () => {
    expect(() => inverseNormalCdf(0)).toThrow(RangeError);
    expect(() => inverseNormalCdf(1)).toThrow(RangeError);
    expect(() => inverseNormalCdf(-0.1)).toThrow(RangeError);
    expect(() => inverseNormalCdf(1.5)).toThrow(RangeError);
  });
});

describe('zForCentralConfidence', () => {
  it('returns the half-width multiplier for a central interval', () => {
    expect(zForCentralConfidence(0.95)).toBeCloseTo(1.959964, 4);
    expect(zForCentralConfidence(0.6)).toBeCloseTo(0.841621, 4);
    expect(zForCentralConfidence(0.5)).toBeCloseTo(0.674490, 4);
  });

  it('widens monotonically as the requested confidence rises', () => {
    const widths = [0.5, 0.6, 0.8, 0.95, 0.99].map(zForCentralConfidence);
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]).toBeGreaterThan(widths[i - 1]);
    }
  });
});
