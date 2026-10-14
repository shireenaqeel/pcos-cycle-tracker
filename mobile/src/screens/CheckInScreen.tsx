import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { format, isToday } from 'date-fns';

import { SleepSlider, StressScale, WaterMeter } from '../components/CheckInControls';
import { FadeInUp } from '../components/Motion';
import { PetalFall } from '../components/Scenery';
import { Blob, SectionLabel, SoftCard, Squish } from '../components/Soft';
import { TileGrid } from '../components/TileGrid';
import type { TrackerOption } from '../content/trackers';
import {
  DISCHARGE_OPTIONS,
  FLOW_OPTIONS,
  MOOD_OPTIONS,
  MOVEMENT_OPTIONS,
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
  LhTest,
  FlowIntensity,
  MoodTag,
  MovementLevel,
  SexTag,
  SymptomTag,
} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'CheckIn'>;

const LH_OPTIONS: TrackerOption<LhTest>[] = [
  { value: 'negative', label: 'LH negative', icon: 'minus-circle-outline' },
  { value: 'positive', label: 'LH positive', icon: 'check-circle-outline' },
];

/**
 * Keeps a previously stored reading when the box is left untouched, so saving a
 * day does not quietly erase a temperature taken earlier.
 */
function readTemperature(text: string, stored: number | null): number | null {
  if (text.trim() === '') return null;
  const parsed = Number(text.trim());
  return Number.isFinite(parsed) ? parsed : stored;
}

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
  const [lhTest, setLhTest] = useState<LhTest | null>(null);
  const [basalTempText, setBasalTempText] = useState('');
  const [foodNote, setFoodNote] = useState('');
  const [otherNote, setOtherNote] = useState('');
  const [basalTemp, setBasalTemp] = useState<number | null>(null);
  const [existingEntry, setExistingEntry] = useState(false);
  const [busy, setBusy] = useState(false);
  // Petals play over the sheet for a beat on save, so logging a day lands as a
  // small moment rather than the screen simply vanishing.
  const [celebrating, setCelebrating] = useState(false);

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
      setBasalTempText(entry.basalTemp === null ? '' : String(entry.basalTemp));
      setLhTest(entry.lhTest);
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
      basalTemp: readTemperature(basalTempText, basalTemp),
      lhTest,
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
    setCelebrating(true);
    setTimeout(() => navigation.goBack(), 620);
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
          <TileGrid
            options={FLOW_OPTIONS}
            tint={colors.petal}
            selected={flow === null ? [] : [flow]}
            onToggle={(value) => setFlow(flow === value ? null : value)}
          />
        </SoftCard>

        <SoftCard tint={colors.lilac}>
          <SectionLabel>Mood — as many as fit</SectionLabel>
          <TileGrid
            options={MOOD_OPTIONS}
            tint={colors.lilac}
            selected={moods}
            onToggle={(value) => setMoods((current) => toggle(current, value))}
          />
        </SoftCard>

        {SYMPTOM_GROUPS.map((group) => (
          <SoftCard key={group.title}>
            <SectionLabel>{group.title}</SectionLabel>
            <TileGrid
              options={group.options}
              tint={colors.apricot}
              selected={tags}
              onToggle={(value) => setTags((current) => toggle(current, value))}
            />
          </SoftCard>
        ))}

        <SoftCard>
          <SectionLabel>Discharge</SectionLabel>
          <TileGrid
            options={DISCHARGE_OPTIONS}
            tint={colors.sage}
            selected={discharge === null ? [] : [discharge]}
            onToggle={(value) => setDischarge(discharge === value ? null : value)}
          />
          <Text style={styles.note}>
            Clumpy, grey or unusual-smelling discharge is worth raising with a clinician rather
            than only tracking.
          </Text>
        </SoftCard>

        <SoftCard>
          <SectionLabel>Sex and drive</SectionLabel>
          <TileGrid
            options={SEX_OPTIONS}
            tint={colors.lilac}
            selected={sex}
            onToggle={(value) => setSex((current) => toggle(current, value))}
          />
        </SoftCard>

        <SoftCard tint={colors.apricot}>
          <SectionLabel>Stress</SectionLabel>
          <StressScale level={stress} onChange={setStress} />
        </SoftCard>

        <SoftCard tint={colors.sage}>
          <SectionLabel>Water</SectionLabel>
          <WaterMeter count={hydration} onChange={setHydration} />
        </SoftCard>

        <SoftCard>
          <SectionLabel>Sleep</SectionLabel>
          <SleepSlider hours={sleep} onChange={setSleep} />
        </SoftCard>

        <SoftCard>
          <SectionLabel>Movement</SectionLabel>
          <TileGrid
            options={MOVEMENT_OPTIONS}
            tint={colors.sage}
            selected={movement === null ? [] : [movement]}
            onToggle={(value) => setMovement(movement === value ? null : value)}
          />
        </SoftCard>

        <SoftCard tint={colors.lilac}>
          <SectionLabel>Ovulation signals</SectionLabel>
          <Text style={styles.note}>
            Optional, and only worth it if you already test or take your temperature. A measured
            ovulation predicts your next period far better than counting days — especially when
            cycles are irregular.
          </Text>
          <TileGrid
            options={LH_OPTIONS}
            tint={colors.surface}
            selected={lhTest === null ? [] : [lhTest]}
            onToggle={(value) => setLhTest(lhTest === value ? null : value)}
          />
          <TextInput
            style={styles.input}
            value={basalTempText}
            onChangeText={setBasalTempText}
            placeholder="Waking temperature, e.g. 36.6"
            placeholderTextColor={colors.textFaint}
            keyboardType="decimal-pad"
            inputMode="decimal"
          />
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

      {celebrating && <PetalFall count={12} />}

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
