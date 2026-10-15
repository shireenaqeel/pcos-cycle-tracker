import { describe, expect, it } from '@jest/globals';

import {
  ALL_SYMPTOMS,
  SYMPTOM_GROUPS,
  TRACKER_CATEGORIES,
  categoryEnabled,
} from '../trackers';

describe('which sections the check-in offers', () => {
  it('shows everything when nothing has been turned off', () => {
    for (const category of TRACKER_CATEGORIES) {
      expect(categoryEnabled(null, category.id)).toBe(true);
    }
  });

  it('shows only what is listed once a choice has been made', () => {
    expect(categoryEnabled(['flow', 'mood'], 'flow')).toBe(true);
    expect(categoryEnabled(['flow', 'mood'], 'stress')).toBe(false);
  });

  it('treats an empty list as everything off, not as no choice', () => {
    expect(categoryEnabled([], 'flow')).toBe(false);
  });
});

describe('the taxonomy holds together', () => {
  it('gives every symptom group a category that Settings can toggle', () => {
    const toggleable = new Set(TRACKER_CATEGORIES.map((category) => category.id));
    for (const group of SYMPTOM_GROUPS) {
      expect(toggleable.has(group.id)).toBe(true);
    }
  });

  it('has no duplicate category ids', () => {
    const ids = TRACKER_CATEGORIES.map((category) => category.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no duplicate symptom values across groups', () => {
    const values = ALL_SYMPTOMS.map((option) => option.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it('gives every option a label and an icon', () => {
    for (const option of ALL_SYMPTOMS) {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.icon.length).toBeGreaterThan(0);
    }
  });
});
