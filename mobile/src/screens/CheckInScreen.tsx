import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { format, isToday } from 'date-fns';

import { SleepBars, StressBlob, WaterGlasses } from '../components/CheckInControls';
import { Blob, Chip, Squish } from '../components/Soft';
import { LOCAL_USER_ID } from '../db/profile';
import { deleteSymptomLog, getSymptomLogForDate, saveSymptomLog } from '../db/symptoms';
import { fromIsoDate, toIsoDate } from '../lib/dates';
import { successFeedback, tapFeedback, warningFeedback } from '../lib/feedback';
import type { RootStackParamList } from '../navigation/types';
import {
  radius,
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
  type ThemeColors,
} from '../theme';
import type { MovementLevel, SymptomTag } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'CheckIn'>;

type StepName = 'mood' | 'stress' | 'sleep' | 'water' | 'movement' | 'body' | 'notes' | 'done';

const STEPS: StepName[] = ['mood', 'stress', 'sleep', 'water', 'movement', 'body', 'notes', 'done'];

const MOOD_OPTIONS = ['good', 'even', 'low', 'irritable', 'anxious'];

const MOVEMENT_OPTIONS: { value: MovementLevel; label: string }[] = [
  { value: 'none', label: 'Rested' },
  { value: 'light', label: 'A little' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'intense', label: 'Hard' },
];

const SYMPTOM_OPTIONS: { value: SymptomTag; label: string }[] = [
  { value: 'cramps', label: 'Cramps' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'cravings', label: 'Cravings' },
  { value: 'mood_swing', label: 'Mood swings' },
  { value: 'acne', label: 'Acne' },
  { value: 'hair_thinning', label: 'Hair thinning' },
  { value: 'hirsutism', label: 'Excess hair growth' },
  { value: 'ovulation_pain', label: 'Ovulation pain' },
];

const PROMPTS: Record<StepName, { title: string; sub: string }> = {
  mood: { title: 'How are you feeling?', sub: 'However you land is fine.' },
  stress: { title: 'How loud is today?', sub: 'One is calm, five is overwhelmed.' },
  sleep: { title: 'How did you sleep?', sub: 'Tap roughly how many hours you got.' },
  water: { title: 'Had much water?', sub: 'Tap a glass to fill it.' },
  movement: { title: 'Did you move?', sub: 'Resting counts as an answer.' },
  body: { title: 'How does your body feel?', sub: 'Tap anything you noticed. Skip what you did not.' },
  notes: { title: 'Anything worth remembering?', sub: 'Food, or whatever else shaped the day.' },
  done: { title: 'That is the lot.', sub: 'Here is what you logged.' },
};

export function CheckInScreen({ navigation, route }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();

  const requestedDate = route.params?.date;
  const [date] = useState(() =>
    requestedDate === undefined ? new Date() : fromIsoDate(requestedDate)
  );
  const isoDate = toIsoDate(date);

  const [stepIndex, setStepIndex] = useState(0);
  const [mood, setMood] = useState<string | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [hydration, setHydration] = useState(0);
  const [sleep, setSleep] = useState(0);
  const [movement, setMovement] = useState<MovementLevel | null>(null);
  const [tags, setTags] = useState<SymptomTag[]>([]);
  const [foodNote, setFoodNote] = useState('');
  const [otherNote, setOtherNote] = useState('');
  const [existingEntry, setExistingEntry] = useState(false);
  // Not editable here, but carried through the save so an older reading isn't
  // wiped by re-saving the day.
  const [basalTemp, setBasalTemp] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const step = STEPS[stepIndex];
  const fade = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    getSymptomLogForDate(LOCAL_USER_ID, isoDate).then((entry) => {
      if (!active || entry === null) return;
      setMood(entry.mood);
      setStress(entry.stressLevel);
      setHydration(entry.hydrationGlasses ?? 0);
      setSleep(entry.sleepHours ?? 0);
      setMovement(entry.movement);
      setTags(entry.symptomTags);
      setFoodNote(entry.foodNote ?? '');
      setOtherNote(entry.otherNote ?? '');
      setBasalTemp(entry.basalTemp);
      setExistingEntry(true);
    });
    return () => {
      active = false;
    };
  }, [isoDate]);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: (stepIndex + 1) / STEPS.length,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [stepIndex, progress]);

  /** Cross-fades the panel so moving between questions doesn't feel like a page reload. */
  function goTo(nextIndex: number) {
    tapFeedback();
    Animated.timing(fade, { toValue: 0, duration: 110, useNativeDriver: true }).start(() => {
      setStepIndex(nextIndex);
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  }

  function toggleTag(tag: SymptomTag) {
    setTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    );
  }

  async function save() {
    setBusy(true);
    await saveSymptomLog({
      userId: LOCAL_USER_ID,
      date: isoDate,
      symptomTags: tags,
      basalTemp,
      mood,
      stressLevel: stress,
      hydrationGlasses: hydration === 0 ? null : hydration,
      sleepHours: sleep === 0 ? null : sleep,
      movement,
      foodNote: foodNote.trim() === '' ? null : foodNote.trim(),
      otherNote: otherNote.trim() === '' ? null : otherNote.trim(),
    });
    successFeedback();
    navigation.goBack();
  }

  async function clearDay() {
    setBusy(true);
    warningFeedback();
    await deleteSymptomLog(LOCAL_USER_ID, isoDate);
    navigation.goBack();
  }

  const summary = [
    mood === null ? null : `feeling ${mood}`,
    stress === null ? null : `stress ${stress} of 5`,
    sleep === 0 ? null : `${sleep} hours of sleep`,
    hydration === 0 ? null : `${hydration} glasses of water`,
    movement === null ? null : MOVEMENT_OPTIONS.find((o) => o.value === movement)?.label.toLowerCase(),
    tags.length === 0 ? null : `${tags.length} thing${tags.length === 1 ? '' : 's'} noticed`,
  ].filter((line): line is string => line !== null);

  return (
    <LinearGradient
      colors={[colors.gradientFrom, colors.background]}
      style={styles.screen}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 0.7 }}
    >
      <Blob color={colors.petal} size={260} style={styles.blobOne} />
      <Blob color={colors.lilac} size={200} style={styles.blobTwo} />

      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
      </View>

      <Text style={styles.dayLabel}>
        {isToday(date) ? 'Today' : format(date, 'EEEE, d MMMM')} · {stepIndex + 1} of {STEPS.length}
      </Text>

      <Animated.View style={[styles.panel, { opacity: fade }]}>
        <Text style={styles.title}>{PROMPTS[step].title}</Text>
        <Text style={styles.sub}>{PROMPTS[step].sub}</Text>

        <ScrollView
          contentContainerStyle={styles.stepBody}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'mood' && (
            <View style={styles.wrap}>
              {MOOD_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  selected={mood === option}
                  onPress={() => setMood(mood === option ? null : option)}
                />
              ))}
            </View>
          )}

          {step === 'stress' && <StressBlob level={stress} onChange={setStress} />}

          {step === 'sleep' && <SleepBars hours={sleep} onChange={setSleep} />}

          {step === 'water' && (
            <View style={styles.waterBlock}>
              <WaterGlasses count={hydration} onChange={setHydration} />
              <Text style={styles.waterCount}>
                {hydration === 0 ? 'none yet' : `${hydration} glass${hydration === 1 ? '' : 'es'}`}
              </Text>
            </View>
          )}

          {step === 'movement' && (
            <View style={styles.wrap}>
              {MOVEMENT_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={movement === option.value}
                  onPress={() => setMovement(movement === option.value ? null : option.value)}
                />
              ))}
            </View>
          )}

          {step === 'body' && (
            <View style={styles.wrap}>
              {SYMPTOM_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={tags.includes(option.value)}
                  onPress={() => toggleTag(option.value)}
                />
              ))}
            </View>
          )}

          {step === 'notes' && (
            <View style={styles.notes}>
              <Text style={styles.noteLabel}>Food</Text>
              <TextInput
                style={styles.input}
                value={foodNote}
                onChangeText={setFoodNote}
                placeholder="What you ate, how it sat with you"
                placeholderTextColor={colors.textFaint}
                multiline
              />
              <Text style={styles.noteLabel}>Anything else</Text>
              <TextInput
                style={styles.input}
                value={otherNote}
                onChangeText={setOtherNote}
                placeholder="Travel, illness, medication, a hard week"
                placeholderTextColor={colors.textFaint}
                multiline
              />
            </View>
          )}

          {step === 'done' && (
            <View style={styles.summary}>
              {summary.length === 0 ? (
                <Text style={styles.summaryEmpty}>
                  Nothing tapped — saving will still record the day as checked in.
                </Text>
              ) : (
                summary.map((line) => (
                  <Text key={line} style={styles.summaryLine}>
                    {line}
                  </Text>
                ))
              )}
              <Text style={styles.footnote}>
                None of this moves the prediction. It's here so you can see your own patterns.
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      <View style={styles.footer}>
        {stepIndex > 0 && (
          <Pressable style={styles.backButton} onPress={() => goTo(stepIndex - 1)}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        )}

        <Squish
          style={styles.nextWrap}
          haptic={false}
          disabled={busy}
          onPress={() => (step === 'done' ? save() : goTo(stepIndex + 1))}
        >
          <View style={styles.nextButton}>
            <Text style={styles.nextText}>
              {step === 'done' ? `Save ${format(date, 'd MMM')}` : 'Next'}
            </Text>
          </View>
        </Squish>
      </View>

      {step === 'done' && existingEntry && (
        <Pressable disabled={busy} style={styles.clearButton} onPress={clearDay}>
          <Text style={styles.clearText}>Clear this day</Text>
        </Pressable>
      )}
    </LinearGradient>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    blobOne: {
      left: -90,
      opacity: 0.35,
      position: 'absolute',
      top: 40,
    },
    blobTwo: {
      bottom: 60,
      opacity: 0.3,
      position: 'absolute',
      right: -80,
    },
    progressTrack: {
      backgroundColor: colors.border,
      borderRadius: radius.pill,
      height: 5,
      overflow: 'hidden',
    },
    progressFill: {
      backgroundColor: colors.accent,
      height: '100%',
    },
    dayLabel: {
      ...typography.micro,
      color: colors.textMuted,
      marginTop: spacing.sm,
    },
    panel: {
      flex: 1,
      paddingTop: spacing.lg,
    },
    title: {
      ...typography.title,
      color: colors.text,
    },
    sub: {
      ...typography.bodySmall,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    stepBody: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingVertical: spacing.lg,
    },
    wrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      justifyContent: 'center',
    },
    waterBlock: {
      alignItems: 'center',
      gap: spacing.md,
    },
    waterCount: {
      ...typography.body,
      color: colors.textMuted,
    },
    notes: {
      gap: spacing.sm,
    },
    noteLabel: {
      ...typography.label,
      color: colors.textMuted,
    },
    input: {
      ...typography.body,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      color: colors.text,
      minHeight: 76,
      padding: spacing.md,
      textAlignVertical: 'top',
    },
    summary: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      gap: spacing.xs,
      padding: spacing.lg,
    },
    summaryLine: {
      ...typography.body,
      color: colors.text,
    },
    summaryEmpty: {
      ...typography.body,
      color: colors.textMuted,
    },
    footnote: {
      ...typography.micro,
      color: colors.textFaint,
      marginTop: spacing.sm,
    },
    footer: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      paddingBottom: spacing.md,
    },
    backButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    backText: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    nextWrap: {
      flex: 1,
    },
    nextButton: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      padding: spacing.md,
    },
    nextText: {
      ...typography.strong,
      color: colors.onAccent,
    },
    clearButton: {
      alignItems: 'center',
      paddingBottom: spacing.md,
    },
    clearText: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
  });
