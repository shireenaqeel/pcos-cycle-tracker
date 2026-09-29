export interface RingGeometry {
  /** Days the full circle represents. */
  totalDays: number;
  /** Where today sits, 0 at the top of the ring, 1 all the way round. */
  elapsedFraction: number;
  windowStartFraction: number;
  windowEndFraction: number;
  isOverdue: boolean;
}

function clampFraction(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Lays the current cycle out around a circle. The ring stretches to whichever
 * is longer — the predicted window or how far this cycle has already run — so
 * a late period keeps the marker on the ring instead of spinning past the end,
 * which for an irregular cycle is a normal Tuesday rather than an edge case.
 */
export function ringGeometry(input: {
  cycleDay: number;
  windowStartDay: number;
  windowEndDay: number;
}): RingGeometry {
  const totalDays = Math.max(input.windowEndDay, input.cycleDay, 1);

  return {
    totalDays,
    elapsedFraction: clampFraction(input.cycleDay / totalDays),
    windowStartFraction: clampFraction(input.windowStartDay / totalDays),
    windowEndFraction: clampFraction(input.windowEndDay / totalDays),
    isOverdue: input.cycleDay > input.windowEndDay,
  };
}
