import type { CycleLog, PredictionSnapshot } from '../types';

export interface ResolvedPrediction {
  snapshot: PredictionSnapshot;
  /** The first cycle start recorded after the prediction was made, if one exists yet. */
  actualStartDate: string;
  landedInWindow: boolean;
  /** Days early (negative) or late (positive) relative to the window; 0 when inside it. */
  daysOutsideWindow: number;
}

export interface AccuracySummary {
  resolved: ResolvedPrediction[];
  /** Share of resolved predictions whose window contained the actual start. */
  hitRate: number | null;
  /** What the engine claimed, averaged — the number hitRate should be compared against. */
  claimedConfidence: number | null;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return Math.round((to - from) / 86_400_000);
}

/**
 * Pairs each stored prediction with what actually happened next. A prediction is
 * judged against the first cycle logged after it was made — including cycles
 * entered from memory later, since the point is an honest scoreboard rather
 * than a flattering one.
 */
export function resolvePredictions(
  snapshots: PredictionSnapshot[],
  cycles: CycleLog[]
): AccuracySummary {
  const startDates = cycles.map((cycle) => cycle.startDate).sort((a, b) => a.localeCompare(b));

  const resolved: ResolvedPrediction[] = [];
  for (const snapshot of snapshots) {
    const generatedOn = snapshot.generatedAt.slice(0, 10);
    const actualStartDate = startDates.find((date) => date > generatedOn);
    if (actualStartDate === undefined) continue;

    const early = actualStartDate < snapshot.rangeStart;
    const late = actualStartDate > snapshot.rangeEnd;

    resolved.push({
      snapshot,
      actualStartDate,
      landedInWindow: !early && !late,
      daysOutsideWindow: early
        ? daysBetween(snapshot.rangeStart, actualStartDate)
        : late
          ? daysBetween(snapshot.rangeEnd, actualStartDate)
          : 0,
    });
  }

  if (resolved.length === 0) {
    return { resolved, hitRate: null, claimedConfidence: null };
  }

  const hits = resolved.filter((entry) => entry.landedInWindow).length;
  const claimed =
    resolved.reduce((total, entry) => total + entry.snapshot.confidence, 0) / resolved.length;

  return { resolved, hitRate: hits / resolved.length, claimedConfidence: claimed };
}
