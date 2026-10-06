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
  remindersEnabled: boolean;
  /** Hour of day, 0-23, for the daily nudge. */
  reminderHour: number;
  appLockEnabled: boolean;
}

export type EntrySource = 'logged' | 'backfilled';

export interface CycleLog {
  id: string;
  userId: string;
  startDate: string;
  endDate: string | null;
  flowIntensity: FlowIntensity | null;
  isConfirmed: boolean;
  entrySource: EntrySource;
}

export type SymptomTag =
  | 'cramps'
  | 'headache'
  | 'migraine'
  | 'backache'
  | 'joint_pain'
  | 'breast_tenderness'
  | 'ovulation_pain'
  | 'pain_during_sex'
  | 'bloating'
  | 'nausea'
  | 'cravings'
  | 'appetite_loss'
  | 'constipation'
  | 'diarrhoea'
  | 'indigestion'
  | 'fatigue'
  | 'insomnia'
  | 'oversleeping'
  | 'dizziness'
  | 'sugar_crash'
  | 'acne'
  | 'oily_skin'
  | 'dry_skin'
  | 'hair_thinning'
  | 'hirsutism'
  | 'skin_darkening'
  | 'skin_tags'
  | 'hot_flush'
  | 'night_sweats'
  | 'heart_racing'
  | 'swelling'
  | 'weight_change';

export type MoodTag =
  | 'calm'
  | 'happy'
  | 'energetic'
  | 'playful'
  | 'confident'
  | 'content'
  | 'tired'
  | 'flat'
  | 'sad'
  | 'low_self_esteem'
  | 'irritable'
  | 'angry'
  | 'anxious'
  | 'overwhelmed'
  | 'mood_swings'
  | 'weepy'
  | 'restless'
  | 'foggy'
  | 'unmotivated'
  | 'detached';

export type DischargeType =
  | 'none'
  | 'dry'
  | 'sticky'
  | 'creamy'
  | 'watery'
  | 'egg_white'
  | 'clumpy'
  | 'grey'
  | 'unusual_smell';

export type SexTag = 'none' | 'protected' | 'unprotected' | 'solo' | 'high_drive' | 'low_drive';

export type FlowIntensity = 'spotting' | 'light' | 'medium' | 'heavy' | 'clots';

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
  /** Free-text single mood from before moods became multi-select; read-only now. */
  mood: string | null;
  moods: MoodTag[];
  discharge: DischargeType | null;
  sex: SexTag[];
  /** 1 (calm) to 5 (overwhelmed). */
  stressLevel: number | null;
  hydrationGlasses: number | null;
  sleepHours: number | null;
  movement: MovementLevel | null;
  foodNote: string | null;
  /** Anything else affecting the day — travel, illness, work. */
  otherNote: string | null;
  /** Bleeding on this specific day; a period's flow changes across its days. */
  flow: FlowIntensity | null;
  /** What was taken today, free text — inositol, metformin, the pill, painkillers. */
  medications: string | null;
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
