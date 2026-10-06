import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { format, isToday } from 'date-fns';

import { SleepBars, StressBlob, WaterGlasses } from '../components/CheckInControls';
import { Blob, Chip, SectionLabel, SoftCard, Squish } from '../components/Soft';
import {
  DISCHARGE_OPTIONS,
  FLOW_OPTIONS,
  MOOD_OPTIONS,
  SEX_OPTIONS,
  SYMPTOM_GROUPS,
} from '../content/trackers';
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
import type {
  DischargeType,
  FlowIntensity,
  MoodTag,
  MovementLevel,
  SexTag,
  SymptomTag,
} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'CheckIn'>;

const MOVEMENT_OPTIONS: { value: MovementLevel; label: string }[] = [
  { value: 'none', label: 'Rested' },
  { value: 'light', label: 'A little' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'intense', label: 'Hard' },
];

/** Adds or removes a value, so every grid behaves identically. */
function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/**
 * One scrollable sheet of grouped categories, which is how established trackers
 * do it. The earlier version marched through ten forced steps — tolerable on a
 * first run, tedious every day after, and it buried whichever single thing the
 * app was opened to record.
 */
export function CheckInScreen({ navigation, route }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();

  const requestedDate = route.params?.date;
  const [date] = useState(() =>
    requestedDate === undefined ? new Date() : fromIsoDate(requestedDate)
  );
  const isoDate = toIsoDate(date);

  const [flow, setFlow] = useState<FlowIntensity | null>(null);
  const [moods, setMoods] = useState<MoodTag[]>([]);
  const [tags, setTags] = useState<SymptomTag[]>([]);
  const [discharge, setDischarge] = useState<DischargeType | null>(null);
  const [sex, setSex] = useState<SexTag[]>([]);
  const [stress, setStress] = useState<number | null>(null);
  const [hydration, setHydration] = useState(0);
  const [sleep, setSleep] = useState(0);
  const [movement, setMovement] = useState<MovementLevel | null>(null);
  const [medications, setMedications] = useState('');
  const [foodNote, setFoodNote] = useState('');
  const [otherNote, setOtherNote] = useState('');
  // Not editable here, but carried through so an older reading isn't wiped.
  const [basalTemp, setBasalTemp] = useState<number | null>(null);
  const [existingEntry, setExistingEntry] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getSymptomLogForDate(LOCAL_USER_ID, isoDate).then((entry) => {
      if (!active || entry === null) return;
      setFlow(entry.flow);
      setMoods(entry.moods);
      setTags(entry.symptomTags);
      setDischarge(entry.discharge);
      setSex(entry.sex);
      setStress(entry.stressLevel);
      setHydration(entry.hydrationGlasses ?? 0);
      setSleep(entry.sleepHours ?? 0);
      setMovement(entry.movement);
      setMedications(entry.medications ?? '');
      setFoodNote(entry.foodNote ?? '');
      setOtherNote(entry.otherNote ?? '');
      setBasalTemp(entry.basalTemp);
      setExistingEntry(true);
    });
    return () => {
      active = false;
    };
  }, [isoDate]);

  const chosenCount =
    moods.length +
    tags.length +
    sex.length +
    (flow === null ? 0 : 1) +
    (discharge === null ? 0 : 1) +
    (stress === null ? 0 : 1) +
    (hydration === 0 ? 0 : 1) +
    (sleep === 0 ? 0 : 1) +
    (movement === null ? 0 : 1);

  async function save() {
    setBusy(true);
    await saveSymptomLog({
      userId: LOCAL_USER_ID,
      date: isoDate,
      symptomTags: tags,
      basalTemp,
      mood: null,
      moods,
      discharge,
      sex,
      stressLevel: stress,
      hydrationGlasses: hydration === 0 ? null : hydration,
      sleepHours: sleep === 0 ? null : sleep,
      movement,
      flow,
      medications: medications.trim() === '' ? null : medications.trim(),
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
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headerWrap}>
          <Blob color={colors.petal} size={220} style={styles.blob} />
          <LinearGradient
            colors={[colors.gradientFrom, colors.gradientTo]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Text style={styles.headerTitle}>
              {isToday(date) ? 'Today' : format(date, 'EEEE, d MMMM')}
            </Text>
            <Text style={styles.headerSub}>
              {chosenCount === 0
                ? 'Tap whatever applies. Nothing here is required.'
                : `${chosenCount} recorded so far.`}
            </Text>
          </LinearGradient>
        </View>

        <SoftCard tint={colors.petal}>
          <SectionLabel>Bleeding</SectionLabel>
          <View style={styles.grid}>
            {FLOW_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                tint={colors.surface}
                selected={flow === option.value}
                onPress={() => setFlow(flow === option.value ? null : option.value)}
              />
            ))}
          </View>
        </SoftCard>

        <SoftCard tint={colors.lilac}>
          <SectionLabel>Mood — as many as fit</SectionLabel>
          <View style={styles.grid}>
            {MOOD_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                tint={colors.surface}
                selected={moods.includes(option.value)}
                onPress={() => setMoods((current) => toggle(current, option.value))}
              />
            ))}
          </View>
        </SoftCard>

        {SYMPTOM_GROUPS.map((group) => (
          <SoftCard key={group.title}>
            <SectionLabel>{group.title}</SectionLabel>
            <View style={styles.grid}>
              {group.options.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={tags.includes(option.value)}
                  onPress={() => setTags((current) => toggle(current, option.value))}
                />
              ))}
            </View>
          </SoftCard>
        ))}

        <SoftCard>
          <SectionLabel>Discharge</SectionLabel>
          <View style={styles.grid}>
            {DISCHARGE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={discharge === option.value}
                onPress={() => setDischarge(discharge === option.value ? null : option.value)}
              />
            ))}
          </View>
          <Text style={styles.note}>
            Clumpy, grey or unusual-smelling discharge is worth raising with a clinician rather
            than only tracking.
          </Text>
        </SoftCard>

        <SoftCard>
          <SectionLabel>Sex and drive</SectionLabel>
          <View style={styles.grid}>
            {SEX_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={sex.includes(option.value)}
                onPress={() => setSex((current) => toggle(current, option.value))}
              />
            ))}
          </View>
        </SoftCard>

        <SoftCard tint={colors.apricot}>
          <SectionLabel>Stress</SectionLabel>
          <StressBlob level={stress} onChange={setStress} />
        </SoftCard>

        <SoftCard tint={colors.sage}>
          <SectionLabel>Water</SectionLabel>
          <WaterGlasses count={hydration} onChange={setHydration} />
        </SoftCard>

        <SoftCard>
          <SectionLabel>Sleep</SectionLabel>
          <SleepBars hours={sleep} onChange={setSleep} />
        </SoftCard>

        <SoftCard>
          <SectionLabel>Movement</SectionLabel>
          <View style={styles.grid}>
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
          <SectionLabel>Medication and supplements</SectionLabel>
          <TextInput
            style={styles.input}
            value={medications}
            onChangeText={setMedications}
            placeholder="Inositol, metformin, the pill, ibuprofen…"
            placeholderTextColor={colors.textFaint}
            multiline
          />
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
            placeholder="Travel, illness, a hard week"
            placeholderTextColor={colors.textFaint}
            multiline
          />
        </SoftCard>

        {existingEntry && (
          <Squish onPress={clearDay} disabled={busy} haptic={false}>
            <View style={styles.clearButton}>
              <Text style={styles.clearText}>Clear this day</Text>
            </View>
          </Squish>
        )}

        <Text style={styles.footnote}>
          None of this moves the prediction — it's here so you can see your own patterns, and so
          there's something real to show a clinician.
        </Text>
      </ScrollView>

      <View style={styles.saveBar}>
        <Squish onPress={save} disabled={busy} haptic={false}>
          <View style={styles.saveButton}>
            <Text style={styles.saveButtonText}>
              {busy ? 'Saving…' : `Save ${format(date, 'd MMM')}`}
            </Text>
          </View>
        </Squish>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      backgroundColor: colors.background,
      flex: 1,
    },
    container: {
      gap: spacing.sm,
      padding: spacing.md,
      paddingBottom: spacing.xl * 3,
    },
    headerWrap: {
      marginBottom: spacing.xs,
    },
    blob: {
      opacity: 0.4,
      position: 'absolute',
      right: -60,
      top: -55,
    },
    header: {
      borderRadius: radius.xl,
      gap: spacing.xs,
      padding: spacing.lg,
    },
    headerTitle: {
      ...typography.title,
      color: colors.text,
    },
    headerSub: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    note: {
      ...typography.micro,
      color: colors.textMuted,
    },
    input: {
      ...typography.body,
      backgroundColor: colors.background,
      borderRadius: radius.md,
      color: colors.text,
      minHeight: 64,
      padding: spacing.md,
      textAlignVertical: 'top',
    },
    clearButton: {
      alignItems: 'center',
      padding: spacing.md,
    },
    clearText: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    footnote: {
      ...typography.micro,
      color: colors.textFaint,
      textAlign: 'center',
    },
    // Pinned: the sheet is long, and a save button at the end of it would mean
    // scrolling past everything to commit a single tap.
    saveBar: {
      backgroundColor: colors.background,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      bottom: 0,
      left: 0,
      padding: spacing.md,
      position: 'absolute',
      right: 0,
    },
    saveButton: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      padding: spacing.md,
    },
    saveButtonText: {
      ...typography.strong,
      color: colors.onAccent,
    },
  });
