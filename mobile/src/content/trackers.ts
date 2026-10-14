import type { MaterialCommunityIcons } from '@expo/vector-icons';

import type {
  DischargeType,
  FlowIntensity,
  MoodTag,
  MovementLevel,
  SexTag,
  SymptomTag,
} from '../types';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

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
  /**
   * A pictogram per option. Rows of identical text pills are the thing that
   * makes a logging screen unreadable at a glance — and every name here is
   * checked against the installed glyph map, because a wrong one renders as
   * nothing at all rather than failing loudly.
   */
  icon: IconName;
}

export const FLOW_OPTIONS: TrackerOption<FlowIntensity>[] = [
  { value: 'spotting', label: 'Spotting', icon: 'water-outline' },
  { value: 'light', label: 'Light', icon: 'water' },
  { value: 'medium', label: 'Medium', icon: 'water-plus' },
  { value: 'heavy', label: 'Heavy', icon: 'water-alert' },
  { value: 'clots', label: 'With clots', icon: 'blood-bag' },
];

export const MOOD_OPTIONS: TrackerOption<MoodTag>[] = [
  { value: 'calm', label: 'Calm', icon: 'weather-sunny' },
  { value: 'happy', label: 'Happy', icon: 'emoticon-happy-outline' },
  { value: 'energetic', label: 'Energetic', icon: 'lightning-bolt' },
  { value: 'playful', label: 'Playful', icon: 'emoticon-wink-outline' },
  { value: 'confident', label: 'Confident', icon: 'star-four-points-outline' },
  { value: 'content', label: 'Content', icon: 'emoticon-outline' },
  { value: 'tired', label: 'Tired', icon: 'sleep' },
  { value: 'flat', label: 'Flat', icon: 'emoticon-neutral-outline' },
  { value: 'sad', label: 'Sad', icon: 'emoticon-sad-outline' },
  { value: 'low_self_esteem', label: 'Down on myself', icon: 'emoticon-frown-outline' },
  { value: 'irritable', label: 'Irritable', icon: 'emoticon-angry-outline' },
  { value: 'angry', label: 'Angry', icon: 'fire' },
  { value: 'anxious', label: 'Anxious', icon: 'emoticon-confused-outline' },
  { value: 'overwhelmed', label: 'Overwhelmed', icon: 'weather-lightning' },
  { value: 'mood_swings', label: 'Mood swings', icon: 'swap-vertical' },
  { value: 'weepy', label: 'Weepy', icon: 'emoticon-cry-outline' },
  { value: 'restless', label: 'Restless', icon: 'shoe-print' },
  { value: 'foggy', label: 'Brain fog', icon: 'weather-fog' },
  { value: 'unmotivated', label: 'Unmotivated', icon: 'battery-low' },
  { value: 'detached', label: 'Detached', icon: 'cloud-outline' },
];

export const SYMPTOM_GROUPS: { title: string; options: TrackerOption<SymptomTag>[] }[] = [
  {
    title: 'Pain',
    options: [
      { value: 'cramps', label: 'Cramps', icon: 'lightning-bolt-outline' },
      { value: 'headache', label: 'Headache', icon: 'head-flash-outline' },
      { value: 'migraine', label: 'Migraine', icon: 'head-alert-outline' },
      { value: 'backache', label: 'Back ache', icon: 'human-handsdown' },
      { value: 'joint_pain', label: 'Joint pain', icon: 'bone' },
      { value: 'breast_tenderness', label: 'Tender breasts', icon: 'alert-circle-outline' },
      { value: 'ovulation_pain', label: 'Ovulation pain', icon: 'egg-outline' },
      { value: 'pain_during_sex', label: 'Pain during sex', icon: 'alert-outline' },
    ],
  },
  {
    title: 'Gut',
    options: [
      { value: 'bloating', label: 'Bloating', icon: 'balloon' },
      { value: 'nausea', label: 'Nausea', icon: 'emoticon-sick-outline' },
      { value: 'cravings', label: 'Cravings', icon: 'cookie' },
      { value: 'appetite_loss', label: 'No appetite', icon: 'food-off' },
      { value: 'constipation', label: 'Constipation', icon: 'toilet' },
      { value: 'diarrhoea', label: 'Loose stools', icon: 'water-off' },
      { value: 'indigestion', label: 'Indigestion', icon: 'stomach' },
    ],
  },
  {
    title: 'Energy and sleep',
    options: [
      { value: 'fatigue', label: 'Fatigue', icon: 'battery-outline' },
      { value: 'insomnia', label: 'Could not sleep', icon: 'weather-night' },
      { value: 'oversleeping', label: 'Slept too much', icon: 'bed' },
      { value: 'dizziness', label: 'Dizziness', icon: 'rotate-3d-variant' },
      { value: 'sugar_crash', label: 'Energy crash', icon: 'chart-line-variant' },
    ],
  },
  {
    title: 'Skin and hair',
    options: [
      { value: 'acne', label: 'Acne', icon: 'face-woman-outline' },
      { value: 'oily_skin', label: 'Oily skin', icon: 'oil' },
      { value: 'dry_skin', label: 'Dry skin', icon: 'snowflake' },
      { value: 'hair_thinning', label: 'Hair thinning', icon: 'content-cut' },
      { value: 'hirsutism', label: 'Excess hair growth', icon: 'hair-dryer-outline' },
      { value: 'skin_darkening', label: 'Skin darkening', icon: 'circle-opacity' },
      { value: 'skin_tags', label: 'Skin tags', icon: 'dots-horizontal-circle-outline' },
    ],
  },
  {
    title: 'Other',
    options: [
      { value: 'hot_flush', label: 'Hot flush', icon: 'thermometer' },
      { value: 'night_sweats', label: 'Night sweats', icon: 'weather-partly-rainy' },
      { value: 'heart_racing', label: 'Heart racing', icon: 'heart-pulse' },
      { value: 'swelling', label: 'Swelling', icon: 'circle-expand' },
      { value: 'weight_change', label: 'Weight change', icon: 'scale-bathroom' },
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
  { value: 'none', label: 'None', icon: 'minus-circle-outline' },
  { value: 'dry', label: 'Dry', icon: 'air-filter' },
  { value: 'sticky', label: 'Sticky', icon: 'blur' },
  { value: 'creamy', label: 'Creamy', icon: 'cloud' },
  { value: 'watery', label: 'Watery', icon: 'waves' },
  { value: 'egg_white', label: 'Stretchy, like egg white', icon: 'egg' },
  { value: 'clumpy', label: 'Clumpy', icon: 'grain' },
  { value: 'grey', label: 'Grey', icon: 'circle-half-full' },
  { value: 'unusual_smell', label: 'Unusual smell', icon: 'alert-rhombus-outline' },
];

export const MOVEMENT_OPTIONS: TrackerOption<MovementLevel>[] = [
  { value: 'none', label: 'Rested', icon: 'sofa-outline' },
  { value: 'light', label: 'A little', icon: 'walk' },
  { value: 'moderate', label: 'Moderate', icon: 'run' },
  { value: 'intense', label: 'Hard', icon: 'weight-lifter' },
];

export const SEX_OPTIONS: TrackerOption<SexTag>[] = [
  { value: 'none', label: 'None', icon: 'minus-circle-outline' },
  { value: 'protected', label: 'Protected', icon: 'shield-check-outline' },
  { value: 'unprotected', label: 'Unprotected', icon: 'shield-off-outline' },
  { value: 'solo', label: 'Solo', icon: 'account-outline' },
  { value: 'high_drive', label: 'High drive', icon: 'heart-multiple-outline' },
  { value: 'low_drive', label: 'Low drive', icon: 'heart-off-outline' },
];

export const SYMPTOM_LABELS: Record<SymptomTag, string> = Object.fromEntries(
  ALL_SYMPTOMS.map((option) => [option.value, option.label])
) as Record<SymptomTag, string>;

export const MOOD_LABELS: Record<MoodTag, string> = Object.fromEntries(
  MOOD_OPTIONS.map((option) => [option.value, option.label])
) as Record<MoodTag, string>;
