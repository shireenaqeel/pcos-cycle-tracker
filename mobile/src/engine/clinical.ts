import { cycleGaps } from './gaps';
import { cycleInsights } from './insights';
import type { CycleLog, DailySymptomLog } from '../types';

export type FlagLevel = 'watch' | 'discuss';

export interface ClinicalFlag {
  id: string;
  /** 'discuss' means guidelines name this as a reason to book an appointment. */
  level: FlagLevel;
  title: string;
  /** What in this person's own data triggered it. */
  finding: string;
  /** What the guidelines say about it, in plain words. */
  meaning: string;
  source: string;
}

/** Thresholds from the guidelines cited on each flag, not invented. */
const LONG_CYCLE_DAYS = 35;
const SHORT_CYCLE_DAYS = 21;
const IRREGULAR_SPREAD_DAYS = 9;
const FEW_PERIODS_PER_YEAR = 8;
const NO_PERIOD_DAYS = 90;
const LONG_BLEED_DAYS = 8;

const GUIDELINE_PCOS =
  'Teede HJ et al., International Evidence-Based Guideline for the Assessment and Management of Polycystic Ovary Syndrome (2023)';
const GUIDELINE_FIGO =
  'FIGO Menstrual Disorders Committee — Munro MG et al., The two FIGO systems for normal and abnormal uterine bleeding (2018)';
const GUIDELINE_AMENORRHOEA =
  'National Institute for Health and Care Excellence (NICE), Clinical Knowledge Summary: Amenorrhoea (2023)';
const GUIDELINE_BLEEDING =
  'American College of Obstetricians and Gynecologists, Heavy Menstrual Bleeding (FAQ, 2024)';

export interface ClinicalReview {
  flags: ClinicalFlag[];
  /** False while there is too little history for any of this to mean anything. */
  hasEnoughData: boolean;
  measuredCycles: number;
}

function daysSince(iso: string, now: Date): number {
  return Math.round((now.getTime() - new Date(iso).getTime()) / 86_400_000);
}

/**
 * Compares recorded history against published thresholds and names what a
 * clinician would want to hear about.
 *
 * This is **pattern matching against guidelines, not diagnosis**. Every flag
 * reports the threshold it crossed and cites where that threshold comes from,
 * so it can be checked rather than believed — and the wording never tells
 * someone what they have, only that what they have recorded is worth raising.
 *
 * The bar for saying anything is deliberately high: with one or two cycles
 * almost any history looks irregular, and frightening someone over three data
 * points would be worse than staying quiet.
 */
export function clinicalReview(
  cycles: CycleLog[],
  symptoms: DailySymptomLog[],
  now: Date = new Date()
): ClinicalReview {
  const insights = cycleInsights(cycles, now);
  const gaps = cycleGaps(cycles).map((gap) => gap.cycleLengthDays);
  const flags: ClinicalFlag[] = [];

  const starts = cycles.map((cycle) => cycle.startDate).sort((a, b) => a.localeCompare(b));
  const lastStart = starts.length === 0 ? null : starts[starts.length - 1];

  // Checked regardless of how many cycles exist: a long absence stands alone.
  if (lastStart !== null) {
    const since = daysSince(lastStart, now);
    if (since >= NO_PERIOD_DAYS) {
      flags.push({
        id: 'no-period-90',
        level: 'discuss',
        title: 'No period recorded for three months',
        finding: `Your last recorded period started ${since} days ago.`,
        meaning:
          'Going three months or more without a period, when pregnancy is not the reason, is commonly given as a point to get checked. It has many possible causes, several of them easily treated.',
        source: GUIDELINE_AMENORRHOEA,
      });
    }
  }

  const longBleeds = cycles.filter((cycle) => {
    if (cycle.endDate === null) return false;
    const days =
      Math.round(
        (new Date(cycle.endDate).getTime() - new Date(cycle.startDate).getTime()) / 86_400_000
      ) + 1;
    return days > LONG_BLEED_DAYS;
  });
  if (longBleeds.length > 0) {
    flags.push({
      id: 'long-bleed',
      level: 'discuss',
      title: 'Periods lasting over a week',
      finding: `${longBleeds.length} recorded ${longBleeds.length === 1 ? 'period has' : 'periods have'} run longer than ${LONG_BLEED_DAYS} days.`,
      meaning:
        'Bleeding that regularly lasts longer than about a week is one of the standard reasons to see someone, partly because prolonged blood loss can quietly cause anaemia.',
      source: GUIDELINE_BLEEDING,
    });
  }

  const heavyDays = symptoms.filter((entry) => entry.flow === 'heavy' || entry.flow === 'clots');
  if (heavyDays.length >= 3) {
    flags.push({
      id: 'heavy-flow',
      level: 'watch',
      title: 'Heavy days logged repeatedly',
      finding: `You have recorded ${heavyDays.length} days as heavy or with clots.`,
      meaning:
        'Heavy bleeding is worth raising, especially alongside tiredness. The question a clinician asks is whether it soaks through a pad or tampon hourly for several hours — if it does, that is not something to wait out.',
      source: GUIDELINE_BLEEDING,
    });
  }

  // Everything below compares cycle lengths, which needs a few cycles to mean anything.
  const enough = gaps.length >= 3;
  if (enough) {
    const longCycles = gaps.filter((days) => days > LONG_CYCLE_DAYS);
    if (longCycles.length >= 2) {
      flags.push({
        id: 'long-cycles',
        level: 'discuss',
        title: 'Cycles longer than 35 days',
        finding: `${longCycles.length} of your ${gaps.length} measured cycles ran longer than ${LONG_CYCLE_DAYS} days.`,
        meaning:
          'The 2023 international PCOS guideline describes adult cycles over 35 days as irregular. That does not mean PCOS — thyroid conditions, stress, weight change and perimenopause all do this too — but it is the pattern worth having assessed.',
        source: GUIDELINE_PCOS,
      });
    }

    const shortCycles = gaps.filter((days) => days < SHORT_CYCLE_DAYS);
    if (shortCycles.length >= 2) {
      flags.push({
        id: 'short-cycles',
        level: 'discuss',
        title: 'Cycles shorter than 21 days',
        finding: `${shortCycles.length} of your ${gaps.length} measured cycles were under ${SHORT_CYCLE_DAYS} days.`,
        meaning:
          'Cycles consistently under 21 days fall outside the usual range and are also described as irregular in the same guideline.',
        source: GUIDELINE_PCOS,
      });
    }

    if (insights.spreadDays !== null && insights.spreadDays > IRREGULAR_SPREAD_DAYS) {
      flags.push({
        id: 'wide-spread',
        level: 'watch',
        title: 'Your cycle length moves around a lot',
        finding: `Your shortest and longest cycles are ${insights.spreadDays} days apart.`,
        meaning: `A gap of more than about ${IRREGULAR_SPREAD_DAYS} days between shortest and longest is the figure usually read as irregular, rather than any single cycle being wrong.`,
        source: GUIDELINE_FIGO,
      });
    }
  }

  // Needs a year of history behind it before the count means anything.
  const oldestStart = starts.length === 0 ? null : starts[0];
  const trackedLongEnough = oldestStart !== null && daysSince(oldestStart, now) >= 330;
  if (trackedLongEnough && insights.periodsInLastYear < FEW_PERIODS_PER_YEAR) {
    flags.push({
      id: 'few-periods',
      level: 'discuss',
      title: 'Fewer than eight periods in a year',
      finding: `You have recorded ${insights.periodsInLastYear} in the last 12 months.`,
      meaning:
        'Fewer than eight cycles a year is one of the ways the PCOS guideline defines irregular cycles in adults. It is a reason to ask, not an answer.',
      source: GUIDELINE_PCOS,
    });
  }

  return {
    flags,
    hasEnoughData: enough || flags.length > 0,
    measuredCycles: gaps.length,
  };
}
