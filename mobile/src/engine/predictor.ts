import { cycleGaps } from './gaps';
import { zForCentralConfidence } from './stats';
import type { CycleLog, CycleRangePrediction, Phenotype } from '../types';

/**
 * This is Phase 1 from the design doc: empirical/hierarchical Bayes, not a
 * trained model. A phenotype prior on the mean cycle length gets updated by
 * a normal-normal conjugate rule as real cycle lengths come in. It's the
 * lightweight, closed-form, fully-explainable, on-device-friendly cousin of
 * transfer learning — Phase 2 (a pretrained-and-fine-tuned model) is gated
 * on having a real aggregate dataset, which this MVP does not have yet.
 */
export const MODEL_VERSION = 'phase1-hierarchical-bayes-v2';

interface PhenotypePrior {
  /** Prior belief about the mean cycle length, in days. */
  meanDays: number;
  /** How sure the prior is about that mean — small = confident, large = wide. */
  stdDevDays: number;
}

const PHENOTYPE_PRIORS: Record<Phenotype, PhenotypePrior> = {
  regular: { meanDays: 28, stdDevDays: 2 },
  mildly_irregular: { meanDays: 32, stdDevDays: 6 },
  diagnosed_pcos: { meanDays: 40, stdDevDays: 12 },
  // "Not sure" is a valid, common state — start wide rather than force a guess.
  unknown: { meanDays: 30, stdDevDays: 10 },
};

/**
 * Natural cycle-to-cycle variability — distinct from uncertainty about the mean.
 * Used as the starting belief before there is enough history to measure it.
 */
const PRIOR_INTRINSIC_STD_DEV_DAYS = 6;

/** How many observed cycles it takes to outweigh that starting belief. */
const INTRINSIC_VARIANCE_PRIOR_WEIGHT = 4;

/**
 * Cycles are recorded to the day and even very regular ones move by a day or
 * two, so a narrower claim than this would be false precision — which matters
 * most for someone whose history happens to look unusually tidy so far.
 */
const MIN_INTRINSIC_STD_DEV_DAYS = 2;

/** Backfilled dates are remembered, not logged in the moment — treat them as noisier. */
const BACKFILL_VARIANCE_INFLATION = 3;

/** The range is reported at this central confidence — matches the design doc's "~60% likely". */
const DEFAULT_CONFIDENCE = 0.6;

interface Observation {
  cycleLengthDays: number;
  varianceInflation: number;
}

function cycleLengthsFromLogs(logs: CycleLog[]): Observation[] {
  return cycleGaps(logs).map((gap) => ({
    cycleLengthDays: gap.cycleLengthDays,
    varianceInflation: gap.fromBackfilled ? BACKFILL_VARIANCE_INFLATION : 1,
  }));
}

/**
 * How much this person's cycles actually scatter, blended with the generic
 * starting belief so a couple of similar cycles can't claim clockwork
 * regularity. A single observation says nothing about spread, so below two it
 * defers entirely to the prior.
 */
function intrinsicVariance(observations: Observation[]): number {
  const priorVariance = PRIOR_INTRINSIC_STD_DEV_DAYS ** 2;
  if (observations.length < 2) return priorVariance;

  const lengths = observations.map((observation) => observation.cycleLengthDays);
  const mean = lengths.reduce((total, length) => total + length, 0) / lengths.length;
  const sampleVariance =
    lengths.reduce((total, length) => total + (length - mean) ** 2, 0) / (lengths.length - 1);

  const blended =
    (INTRINSIC_VARIANCE_PRIOR_WEIGHT * priorVariance + lengths.length * sampleVariance) /
    (INTRINSIC_VARIANCE_PRIOR_WEIGHT + lengths.length);

  return Math.max(blended, MIN_INTRINSIC_STD_DEV_DAYS ** 2);
}

interface Posterior {
  mean: number;
  varianceOfMean: number;
  cycleVariance: number;
}

function posteriorFor(logs: CycleLog[], phenotype: Phenotype | null): Posterior {
  const prior = PHENOTYPE_PRIORS[phenotype ?? 'unknown'];
  const observations = cycleLengthsFromLogs(logs);
  const cycleVariance = intrinsicVariance(observations);

  // Sequential normal-normal conjugate update, expressed in precision (1/variance)
  // form so each new observation just adds onto a running total.
  let precision = 1 / prior.stdDevDays ** 2;
  let weightedMean = prior.meanDays * precision;

  for (const obs of observations) {
    const obsPrecision = 1 / (cycleVariance * obs.varianceInflation);
    precision += obsPrecision;
    weightedMean += obs.cycleLengthDays * obsPrecision;
  }

  return {
    mean: weightedMean / precision,
    varianceOfMean: 1 / precision,
    cycleVariance,
  };
}

/**
 * Predicts the likely window for the next cycle as a range + confidence,
 * never a single date. Zero logs still returns a (wide) range, built from
 * the phenotype prior alone — that's the honest cold-start answer.
 */
export function predictNextCycle(
  logs: CycleLog[],
  phenotype: Phenotype | null,
  confidence: number = DEFAULT_CONFIDENCE
): CycleRangePrediction {
  const posterior = posteriorFor(logs, phenotype);

  // Predicting the next *actual* cycle length, not just the mean, so intrinsic
  // variability still applies on top of whatever we now know about the mean.
  const predictiveStdDev = Math.sqrt(posterior.varianceOfMean + posterior.cycleVariance);
  const z = zForCentralConfidence(confidence);

  return {
    rangeStartDay: Math.round(posterior.mean - z * predictiveStdDev),
    rangeEndDay: Math.round(posterior.mean + z * predictiveStdDev),
    confidence,
    meanCycleLength: posterior.mean,
    stdDevCycleLength: predictiveStdDev,
  };
}

export interface ProjectedWindow {
  /** 1 is the next period, 2 the one after it, and so on. */
  cycleIndex: number;
  rangeStartDay: number;
  rangeEndDay: number;
  confidence: number;
}

/**
 * Windows for the next several periods, so the calendar isn't blank the moment
 * you page a month forward.
 *
 * Uncertainty compounds twice over: the error in the estimated mean applies
 * once per cycle (so it grows with k), while independent cycle-to-cycle
 * variation accumulates as a random walk (so it grows with sqrt(k)). Windows
 * therefore widen the further out they sit, and projection **stops as soon as
 * one window would overlap the previous one** — past that point the app cannot
 * honestly say which cycle a given day belongs to, and a continuous smear of
 * "maybe" across the calendar would say less than nothing. A steady history
 * gets several windows; a scattered one gets very few, which is the truth.
 *
 * The six-cycle horizon is a plain product limit on top of that: a steady
 * history stays non-overlapping for a year, but by then each window spans
 * nearly a whole cycle, so paging that far out would tint most of the calendar
 * to say very little.
 */
export function projectCycleWindows(
  logs: CycleLog[],
  phenotype: Phenotype | null,
  confidence: number = DEFAULT_CONFIDENCE,
  maxCycles = 6
): ProjectedWindow[] {
  const posterior = posteriorFor(logs, phenotype);
  const z = zForCentralConfidence(confidence);
  const windows: ProjectedWindow[] = [];

  for (let cycleIndex = 1; cycleIndex <= maxCycles; cycleIndex++) {
    const spread = Math.sqrt(
      cycleIndex ** 2 * posterior.varianceOfMean + cycleIndex * posterior.cycleVariance
    );
    const centre = cycleIndex * posterior.mean;
    const rangeStartDay = Math.round(centre - z * spread);
    const rangeEndDay = Math.round(centre + z * spread);

    const previous = windows[windows.length - 1];
    if (previous !== undefined && rangeStartDay <= previous.rangeEndDay) break;

    windows.push({ cycleIndex, rangeStartDay, rangeEndDay, confidence });
  }

  return windows;
}
