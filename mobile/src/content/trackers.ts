import type { DischargeType, FlowIntensity, MoodTag, SexTag, SymptomTag } from '../types';

/**
 * What a day can record. Mainstream trackers offer somewhere north of seventy
 * options across these groups, and a short list is actively worse than a long
 * one here: a symptom with nowhere to go is a symptom the person stops logging.
 *
 * Grouping matters as much as breadth. Thirty undifferentiated chips is a wall;
 * the same thirty under headings is scannable.
 */
export interface TrackerOption<T extends string> {
  value: T;
  label: string;
}

export const FLOW_OPTIONS: TrackerOption<FlowIntensity>[] = [
  { value: 'spotting', label: 'Spotting' },
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
  { value: 'clots', label: 'With clots' },
];

export const MOOD_OPTIONS: TrackerOption<MoodTag>[] = [
  { value: 'calm', label: 'Calm' },
  { value: 'happy', label: 'Happy' },
  { value: 'energetic', label: 'Energetic' },
  { value: 'playful', label: 'Playful' },
  { value: 'confident', label: 'Confident' },
  { value: 'content', label: 'Content' },
  { value: 'tired', label: 'Tired' },
  { value: 'flat', label: 'Flat' },
  { value: 'sad', label: 'Sad' },
  { value: 'low_self_esteem', label: 'Down on myself' },
  { value: 'irritable', label: 'Irritable' },
  { value: 'angry', label: 'Angry' },
  { value: 'anxious', label: 'Anxious' },
  { value: 'overwhelmed', label: 'Overwhelmed' },
  { value: 'mood_swings', label: 'Mood swings' },
  { value: 'weepy', label: 'Weepy' },
  { value: 'restless', label: 'Restless' },
  { value: 'foggy', label: 'Brain fog' },
  { value: 'unmotivated', label: 'Unmotivated' },
  { value: 'detached', label: 'Detached' },
];

export const SYMPTOM_GROUPS: { title: string; options: TrackerOption<SymptomTag>[] }[] = [
  {
    title: 'Pain',
    options: [
      { value: 'cramps', label: 'Cramps' },
      { value: 'headache', label: 'Headache' },
      { value: 'migraine', label: 'Migraine' },
      { value: 'backache', label: 'Back ache' },
      { value: 'joint_pain', label: 'Joint pain' },
      { value: 'breast_tenderness', label: 'Tender breasts' },
      { value: 'ovulation_pain', label: 'Ovulation pain' },
      { value: 'pain_during_sex', label: 'Pain during sex' },
    ],
  },
  {
    title: 'Gut',
    options: [
      { value: 'bloating', label: 'Bloating' },
      { value: 'nausea', label: 'Nausea' },
      { value: 'cravings', label: 'Cravings' },
      { value: 'appetite_loss', label: 'No appetite' },
      { value: 'constipation', label: 'Constipation' },
      { value: 'diarrhoea', label: 'Loose stools' },
      { value: 'indigestion', label: 'Indigestion' },
    ],
  },
  {
    title: 'Energy and sleep',
    options: [
      { value: 'fatigue', label: 'Fatigue' },
      { value: 'insomnia', label: 'Could not sleep' },
      { value: 'oversleeping', label: 'Slept too much' },
      { value: 'dizziness', label: 'Dizziness' },
      { value: 'sugar_crash', label: 'Energy crash' },
    ],
  },
  {
    title: 'Skin and hair',
    options: [
      { value: 'acne', label: 'Acne' },
      { value: 'oily_skin', label: 'Oily skin' },
      { value: 'dry_skin', label: 'Dry skin' },
      { value: 'hair_thinning', label: 'Hair thinning' },
      { value: 'hirsutism', label: 'Excess hair growth' },
      { value: 'skin_darkening', label: 'Skin darkening' },
      { value: 'skin_tags', label: 'Skin tags' },
    ],
  },
  {
    title: 'Other',
    options: [
      { value: 'hot_flush', label: 'Hot flush' },
      { value: 'night_sweats', label: 'Night sweats' },
      { value: 'heart_racing', label: 'Heart racing' },
      { value: 'swelling', label: 'Swelling' },
      { value: 'weight_change', label: 'Weight change' },
    ],
  },
];

export const ALL_SYMPTOMS: TrackerOption<SymptomTag>[] = SYMPTOM_GROUPS.flatMap(
  (group) => group.options
);

/**
 * Discharge is a genuine signal people are told to watch, and the one most
 * often left out of simpler trackers. Plain descriptive wording, since the
 * clinical terms are no use to someone who has not been taught them.
 */
export const DISCHARGE_OPTIONS: TrackerOption<DischargeType>[] = [
  { value: 'none', label: 'None' },
  { value: 'dry', label: 'Dry' },
  { value: 'sticky', label: 'Sticky' },
  { value: 'creamy', label: 'Creamy' },
  { value: 'watery', label: 'Watery' },
  { value: 'egg_white', label: 'Stretchy, like egg white' },
  { value: 'clumpy', label: 'Clumpy' },
  { value: 'grey', label: 'Grey' },
  { value: 'unusual_smell', label: 'Unusual smell' },
];

export const SEX_OPTIONS: TrackerOption<SexTag>[] = [
  { value: 'none', label: 'None' },
  { value: 'protected', label: 'Protected' },
  { value: 'unprotected', label: 'Unprotected' },
  { value: 'solo', label: 'Solo' },
  { value: 'high_drive', label: 'High drive' },
  { value: 'low_drive', label: 'Low drive' },
];

export const SYMPTOM_LABELS: Record<SymptomTag, string> = Object.fromEntries(
  ALL_SYMPTOMS.map((option) => [option.value, option.label])
) as Record<SymptomTag, string>;

export const MOOD_LABELS: Record<MoodTag, string> = Object.fromEntries(
  MOOD_OPTIONS.map((option) => [option.value, option.label])
) as Record<MoodTag, string>;
