export type Phenotype = 'regular' | 'mildly_irregular' | 'diagnosed_pcos' | 'unknown';

export interface UserProfile {
  id: string;
  phenotype: Phenotype | null;
  selfReportedDx: boolean;
  createdAt: string;
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

export interface DailySymptomLog {
  id: string;
  userId: string;
  date: string;
  symptomTags: SymptomTag[];
  basalTemp: number | null;
  mood: string | null;
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
