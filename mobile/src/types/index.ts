export type ThemeName = 'blush' | 'meadow' | 'dusk' | 'clay';

export type Phenotype = 'regular' | 'mildly_irregular' | 'diagnosed_pcos' | 'unknown';

export interface UserProfile {
  id: string;
  phenotype: Phenotype | null;
  selfReportedDx: boolean;
  createdAt: string;
  displayName: string | null;
  /** Null until they pick one; the provider falls back to the default. */
  theme: ThemeName | null;
}

export type EntrySource = 'logged' | 'backfilled';

export interface CycleLog {
  id: string;
  userId: string;
  startDate: string;
  endDate: string | null;
  flowIntensity: 'light' | 'medium' | 'heavy' | null;
  isConfirmed: boolean;
  entrySource: EntrySource;
}

export type SymptomTag =
  | 'acne'
  | 'hirsutism'
  | 'hair_thinning'
  | 'cramps'
  | 'cravings'
  | 'fatigue'
  | 'mood_swing'
  | 'ovulation_pain';

export type MovementLevel = 'none' | 'light' | 'moderate' | 'intense';

/**
 * A day's check-in. Everything past `date` is optional — a day where someone
 * only taps their mood is a perfectly good entry, and demanding more would just
 * mean fewer days recorded.
 */
export interface DailySymptomLog {
  id: string;
  userId: string;
  date: string;
  symptomTags: SymptomTag[];
  basalTemp: number | null;
  mood: string | null;
  /** 1 (calm) to 5 (overwhelmed). */
  stressLevel: number | null;
  hydrationGlasses: number | null;
  sleepHours: number | null;
  movement: MovementLevel | null;
  foodNote: string | null;
  /** Anything else affecting the day — travel, illness, medication, work. */
  otherNote: string | null;
}

export interface PredictionSnapshot {
  id: string;
  userId: string;
  generatedAt: string;
  rangeStart: string;
  rangeEnd: string;
  confidence: number;
  modelVersion: string;
}

export interface EducationContent {
  id: string;
  title: string;
  tags: string[];
  phenotypeRelevance: Phenotype[];
  body: string;
  citations: string[];
}

/** Output of the prediction engine — a range and a confidence, never a single date. */
export interface CycleRangePrediction {
  rangeStartDay: number;
  rangeEndDay: number;
  confidence: number;
  meanCycleLength: number;
  stdDevCycleLength: number;
}
