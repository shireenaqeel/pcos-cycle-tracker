import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format, isToday } from 'date-fns';

import { Chip, ScaleDots, SectionLabel, SoftCard, Squish, Stepper } from '../components/Soft';
import { LOCAL_USER_ID } from '../db/profile';
import { deleteSymptomLog, getSymptomLogForDate, saveSymptomLog } from '../db/symptoms';
import { fromIsoDate, toIsoDate } from '../lib/dates';
import { successFeedback, warningFeedback } from '../lib/feedback';
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

export function CheckInScreen({ navigation, route }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();

  const requestedDate = route.params?.date;
  const [date] = useState(() =>
    requestedDate === undefined ? new Date() : fromIsoDate(requestedDate)
  );
  const isoDate = toIsoDate(date);

  const [mood, setMood] = useState<string | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [hydration, setHydration] = useState(0);
  const [sleep, setSleep] = useState(0);
  const [movement, setMovement] = useState<MovementLevel | null>(null);
  const [tags, setTags] = useState<SymptomTag[]>([]);
  const [foodNote, setFoodNote] = useState('');
  const [otherNote, setOtherNote] = useState('');
  const [existingEntry, setExistingEntry] = useState(false);
  const [busy, setBusy] = useState(false);

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
      setExistingEntry(true);
    });
    return () => {
      active = false;
    };
  }, [isoDate]);

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
      basalTemp: null,
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

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>
        {isToday(date) ? 'How was today?' : `How was ${format(date, 'EEEE, d MMM')}?`}
      </Text>
      <Text style={styles.intro}>
        Everything here is optional. One tap is a perfectly good entry.
      </Text>

      <SoftCard tint={colors.petal}>
        <SectionLabel>Mood</SectionLabel>
        <View style={styles.wrap}>
          {MOOD_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={mood === option}
              tint={colors.surface}
              onPress={() => setMood(mood === option ? null : option)}
            />
          ))}
        </View>
      </SoftCard>

      <SoftCard tint={colors.lilac}>
        <SectionLabel>Stress</SectionLabel>
        <ScaleDots value={stress} onChange={setStress} lowLabel="calm" highLabel="overwhelmed" />
      </SoftCard>

      <View style={styles.pair}>
        <SoftCard tint={colors.sage} style={styles.pairItem}>
          <SectionLabel>Water</SectionLabel>
          <Stepper value={hydration} onChange={setHydration} suffix="glasses" max={20} />
        </SoftCard>
      </View>

      <SoftCard tint={colors.apricot}>
        <SectionLabel>Sleep</SectionLabel>
        <Stepper
          value={sleep}
          onChange={setSleep}
          suffix="hours"
          step={0.5}
          max={16}
          format={(value) => (value === 0 ? '–' : String(value))}
        />
      </SoftCard>

      <SoftCard>
        <SectionLabel>Movement</SectionLabel>
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
      </SoftCard>

      <SoftCard>
        <SectionLabel>Anything you noticed</SectionLabel>
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
      </SoftCard>

      <SoftCard>
        <SectionLabel>Food</SectionLabel>
        <TextInput
          style={styles.input}
          value={foodNote}
          onChangeText={setFoodNote}
          placeholder="What you ate, how it sat with you"
          placeholderTextColor={colors.textFaint}
          multiline
        />
      </SoftCard>

      <SoftCard>
        <SectionLabel>Anything else going on</SectionLabel>
        <TextInput
          style={styles.input}
          value={otherNote}
          onChangeText={setOtherNote}
          placeholder="Travel, illness, medication, a hard week"
          placeholderTextColor={colors.textFaint}
          multiline
        />
      </SoftCard>

      <Squish onPress={save} disabled={busy} haptic={false}>
        <View style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save {format(date, 'd MMM')}</Text>
        </View>
      </Squish>

      {existingEntry && (
        <Squish onPress={clearDay} disabled={busy} haptic={false}>
          <View style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear this day</Text>
          </View>
        </Squish>
      )}

      <Text style={styles.footnote}>
        None of this changes the prediction. The app won't pretend a symptom tells it something it
        can't actually prove — it's here so you can see your own patterns.
      </Text>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      flexGrow: 1,
      gap: spacing.sm,
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    heading: {
      ...typography.title,
      color: colors.text,
    },
    intro: {
      ...typography.bodySmall,
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
    wrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    pair: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    pairItem: {
      flex: 1,
    },
    input: {
      ...typography.body,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      color: colors.text,
      minHeight: 64,
      padding: spacing.md,
      textAlignVertical: 'top',
    },
    saveButton: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      marginTop: spacing.sm,
      padding: spacing.md,
    },
    saveButtonText: {
      ...typography.strong,
      color: colors.onAccent,
    },
    clearButton: {
      alignItems: 'center',
      padding: spacing.md,
    },
    clearButtonText: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    footnote: {
      ...typography.micro,
      color: colors.textFaint,
      textAlign: 'center',
    },
  });
