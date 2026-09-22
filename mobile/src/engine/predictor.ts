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
  const sorted = [...logs].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const observations: Observation[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prevMs = new Date(sorted[i - 1].startDate).getTime();
    const currMs = new Date(sorted[i].startDate).getTime();
    const days = Math.round((currMs - prevMs) / (1000 * 60 * 60 * 24));
    if (days <= 0) continue; // guards against duplicate or out-of-order entries

    const eitherEndBackfilled =
      sorted[i].entrySource === 'backfilled' || sorted[i - 1].entrySource === 'backfilled';

    observations.push({
      cycleLengthDays: days,
      varianceInflation: eitherEndBackfilled ? BACKFILL_VARIANCE_INFLATION : 1,
    });
  }

  return observations;
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
  const prior = PHENOTYPE_PRIORS[phenotype ?? 'unknown'];
  const observations = cycleLengthsFromLogs(logs);
  const cycleVariance = intrinsicVariance(observations);

  // Sequential normal-normal conjugate update, expressed in precision (1/variance)
  // form so each new observation just adds onto a running total.
  let precision = 1 / prior.stdDevDays ** 2;
  let weightedMean = prior.meanDays * precision;

  for (const obs of observations) {
    const obsVariance = cycleVariance * obs.varianceInflation;
    const obsPrecision = 1 / obsVariance;
    precision += obsPrecision;
    weightedMean += obs.cycleLengthDays * obsPrecision;
  }

  const posteriorMean = weightedMean / precision;
  const posteriorVarianceOfMean = 1 / precision;

  // Predicting the next *actual* cycle length, not just the mean, so intrinsic
  // variability still applies on top of whatever we now know about the mean.
  const predictiveStdDev = Math.sqrt(posteriorVarianceOfMean + cycleVariance);
  const z = zForCentralConfidence(confidence);

  return {
    rangeStartDay: Math.round(posteriorMean - z * predictiveStdDev),
    rangeEndDay: Math.round(posteriorMean + z * predictiveStdDev),
    confidence,
    meanCycleLength: posteriorMean,
    stdDevCycleLength: predictiveStdDev,
  };
}
