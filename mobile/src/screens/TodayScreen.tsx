import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { differenceInCalendarDays, format, getHours } from 'date-fns';

import { CycleRing } from '../components/CycleRing';
import { Blob, Chip, SectionLabel, SoftCard, Squish } from '../components/Soft';
import { listCycleLogs } from '../db/cycles';
import { recordPredictionIfChanged } from '../db/predictions';
import { LOCAL_USER_ID, getOrCreateProfile } from '../db/profile';
import { getSymptomLogForDate, listSymptomLogs, saveSymptomLog } from '../db/symptoms';
import { MODEL_VERSION, predictNextCycle, projectCycleWindows } from '../engine/predictor';
import { buildCycleCalendar, type CycleCalendar } from '../lib/cycleDays';
import { fromIsoDate, toIsoDate } from '../lib/dates';
import { successFeedback } from '../lib/feedback';
import { rescheduleReminders } from '../lib/reminders';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import {
  radius,
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
  type ThemeColors,
} from '../theme';
import { MOOD_LABELS } from '../content/trackers';
import type { CycleLog, CycleRangePrediction, DailySymptomLog, MoodTag } from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Today'>,
  NativeStackScreenProps<RootStackParamList>
>;

interface Loaded {
  cycles: CycleLog[];
  prediction: CycleRangePrediction | null;
  calendar: CycleCalendar;
  today: DailySymptomLog | null;
  name: string | null;
}

/** A handful of common ones for a one-tap log; the full set lives in the check-in. */
const QUICK_MOODS: MoodTag[] = ['calm', 'happy', 'tired', 'irritable', 'anxious', 'overwhelmed'];

function greeting(name: string | null): string {
  const hour = getHours(new Date());
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return name === null ? `${part}.` : `${part}, ${name}.`;
}

export function TodayScreen({ navigation }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const [data, setData] = useState<Loaded | null>(null);

  const load = useCallback(async (): Promise<Loaded> => {
    const profile = await getOrCreateProfile();
    const [cycles, symptoms, today] = await Promise.all([
      listCycleLogs(profile.id),
      listSymptomLogs(profile.id),
      getSymptomLogForDate(profile.id, toIsoDate(new Date())),
    ]);

    const prediction = cycles.length === 0 ? null : predictNextCycle(cycles, profile.phenotype);
    const windows = cycles.length === 0 ? [] : projectCycleWindows(cycles, profile.phenotype);
    const calendar = buildCycleCalendar(cycles, symptoms, windows);

    if (calendar.predictedWindow !== null && prediction !== null) {
      const windowMoved = await recordPredictionIfChanged({
        userId: profile.id,
        rangeStart: calendar.predictedWindow.start,
        rangeEnd: calendar.predictedWindow.end,
        confidence: prediction.confidence,
        modelVersion: MODEL_VERSION,
      });

      // Reminders are built from the window, so they go stale the moment it
      // shifts. Rebuilding only when it actually moved keeps this off the
      // every-focus path.
      if (windowMoved && profile.remindersEnabled) {
        await rescheduleReminders({
          windowStart: calendar.predictedWindow.start,
          windowEnd: calendar.predictedWindow.end,
          hour: profile.reminderHour,
        });
      }
    }

    return { cycles, prediction, calendar, today, name: profile.displayName };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      load().then((next) => {
        if (active) setData(next);
      });
      return () => {
        active = false;
      };
    }, [load])
  );

  if (data === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const { cycles, prediction, calendar, today, name } = data;
  const bleedingToday = calendar.periodDates.has(toIsoDate(new Date()));

  /** Tapping a mood here records it outright — no trip to a form for one tap. */
  async function setMood(mood: MoodTag) {
    const current = today?.moods ?? [];
    await saveSymptomLog({
      userId: LOCAL_USER_ID,
      date: toIsoDate(new Date()),
      symptomTags: today?.symptomTags ?? [],
      basalTemp: today?.basalTemp ?? null,
      mood: null,
      moods: current.includes(mood) ? current.filter((m) => m !== mood) : [...current, mood],
      discharge: today?.discharge ?? null,
      sex: today?.sex ?? [],
      stressLevel: today?.stressLevel ?? null,
      hydrationGlasses: today?.hydrationGlasses ?? null,
      sleepHours: today?.sleepHours ?? null,
      movement: today?.movement ?? null,
      foodNote: today?.foodNote ?? null,
      otherNote: today?.otherNote ?? null,
      flow: today?.flow ?? null,
      medications: today?.medications ?? null,
    });
    successFeedback();
    setData(await load());
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.greetingBlock}>
        <Text style={styles.greeting}>{greeting(name)}</Text>
        <Text style={styles.date}>{format(new Date(), 'EEEE, d MMMM')}</Text>
      </View>

      <View style={styles.heroWrap}>
        <Blob color={colors.petal} size={240} style={styles.blobOne} />
        <Blob color={colors.lilac} size={180} style={styles.blobTwo} />

        <LinearGradient
          colors={[colors.gradientFrom, colors.gradientTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {calendar.currentCycleDay === null || prediction === null ? (
            <View style={styles.emptyHero}>
              <Text style={styles.emptyHeadline}>Let's start with one date</Text>
              <Text style={styles.emptyBody}>
                Add when your last period started and this becomes a real prediction instead of an
                empty screen.
              </Text>
            </View>
          ) : (
            <>
              <CycleRing
                cycleDay={calendar.currentCycleDay}
                windowStartDay={prediction.rangeStartDay}
                windowEndDay={prediction.rangeEndDay}
                caption={
                  bleedingToday
                    ? 'period today'
                    : `of about ${Math.round(prediction.meanCycleLength)}`
                }
                headline={
                  calendar.predictedWindow === null
                    ? ''
                    : windowPhrase(calendar.predictedWindow.start, calendar.predictedWindow.end)
                }
              />
              {calendar.predictedWindow !== null && (
                <Text style={styles.windowLine}>
                  {format(fromIsoDate(calendar.predictedWindow.start), 'd MMM')} –{' '}
                  {format(fromIsoDate(calendar.predictedWindow.end), 'd MMM')} · about{' '}
                  {Math.round(prediction.confidence * 100)}% likely
                </Text>
              )}
            </>
          )}
        </LinearGradient>
      </View>

      <SoftCard>
        <SectionLabel>How are you feeling?</SectionLabel>
        <View style={styles.wrap}>
          {QUICK_MOODS.map((mood) => (
            <Chip
              key={mood}
              label={MOOD_LABELS[mood]}
              selected={today?.moods.includes(mood) ?? false}
              onPress={() => setMood(mood)}
            />
          ))}
        </View>
        <Text style={styles.quickNote}>
          {(today === null ? null : summariseCheckIn(today)) ?? 'Saved the moment you tap.'}
        </Text>
      </SoftCard>

      <View style={styles.tileRow}>
        <Tile
          label={bleedingToday ? 'Period logged' : 'Period started'}
          tint={colors.petal}
          onPress={() => navigation.navigate('Period', {})}
        />
        <Tile
          label="Full check-in"
          tint={colors.sage}
          onPress={() => navigation.navigate('CheckIn', {})}
        />
      </View>

      {prediction !== null && (
        <SoftCard>
          <SectionLabel>What this is based on</SectionLabel>
          <Text style={styles.cardBody}>
            {cycles.length} recorded {cycles.length === 1 ? 'period' : 'periods'}, giving a typical
            cycle of about {Math.round(prediction.meanCycleLength)} days. The window is wide when
            your history is short or uneven, and narrows as it grows.
          </Text>
          <Text style={styles.disclaimer}>
            A likely range from your own data — not a diagnosis, and not a guarantee.
          </Text>
        </SoftCard>
      )}

      {cycles.length > 0 && (
        <SoftCard>
          <SectionLabel>Recent periods</SectionLabel>
          {[...cycles]
            .reverse()
            .slice(0, 4)
            .map((cycle) => (
              <Squish
                key={cycle.id}
                haptic={false}
                onPress={() => navigation.navigate('Period', { cycleId: cycle.id })}
              >
                <View style={styles.historyRow}>
                  <Text style={styles.historyDate}>
                    {format(fromIsoDate(cycle.startDate), 'd MMM yyyy')}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {cycle.entrySource === 'backfilled' ? 'from memory' : 'logged live'}
                  </Text>
                </View>
              </Squish>
            ))}
        </SoftCard>
      )}
    </ScrollView>
  );
}

function Tile({ label, tint, onPress }: { label: string; tint: string; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Squish style={styles.tile} onPress={onPress}>
      <View style={[styles.tileInner, { backgroundColor: tint }]}>
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
    </Squish>
  );
}

/** A short readback of what's already logged today, so the card isn't only an input. */
function summariseCheckIn(entry: DailySymptomLog): string | null {
  const parts: string[] = [];
  if (entry.moods.length > 0) parts.push(entry.moods.map((m) => MOOD_LABELS[m]).join(', ').toLowerCase());
  if (entry.stressLevel !== null) parts.push(`stress ${entry.stressLevel}/5`);
  if (entry.hydrationGlasses !== null) parts.push(`${entry.hydrationGlasses} glasses`);
  if (entry.sleepHours !== null) parts.push(`${entry.sleepHours}h sleep`);
  if (entry.symptomTags.length > 0) parts.push(`${entry.symptomTags.length} noted`);
  return parts.length === 0 ? null : `Today so far — ${parts.join(' · ')}.`;
}

function windowPhrase(startIso: string, endIso: string): string {
  const today = new Date();
  const daysToStart = differenceInCalendarDays(fromIsoDate(startIso), today);
  const daysToEnd = differenceInCalendarDays(fromIsoDate(endIso), today);

  if (daysToStart > 1) return `Period expected in ${daysToStart} days`;
  if (daysToStart === 1) return 'Period expected tomorrow';
  if (daysToStart === 0) return 'Your window opens today';
  if (daysToEnd >= 0) return "You're inside the expected window";
  return `Window passed ${Math.abs(daysToEnd)} ${Math.abs(daysToEnd) === 1 ? 'day' : 'days'} ago`;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    loading: {
      alignItems: 'center',
      backgroundColor: colors.background,
      flex: 1,
      justifyContent: 'center',
    },
    container: {
      backgroundColor: colors.background,
      flexGrow: 1,
      gap: spacing.sm,
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    greetingBlock: {
      paddingHorizontal: spacing.xs,
      paddingTop: spacing.xs,
    },
    greeting: {
      ...typography.title,
      color: colors.text,
    },
    date: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    heroWrap: {
      marginVertical: spacing.sm,
    },
    blobOne: {
      left: -70,
      opacity: 0.55,
      position: 'absolute',
      top: -60,
    },
    blobTwo: {
      bottom: -50,
      opacity: 0.45,
      position: 'absolute',
      right: -50,
    },
    hero: {
      alignItems: 'center',
      borderRadius: radius.xl,
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
    },
    windowLine: {
      ...typography.bodySmall,
      color: colors.textMuted,
      textAlign: 'center',
    },
    emptyHero: {
      gap: spacing.sm,
      paddingVertical: spacing.lg,
    },
    emptyHeadline: {
      ...typography.title,
      color: colors.text,
      textAlign: 'center',
    },
    emptyBody: {
      ...typography.bodySmall,
      color: colors.textMuted,
      textAlign: 'center',
    },
    wrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    quickNote: {
      ...typography.micro,
      color: colors.textFaint,
    },
    tileRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    tile: {
      flex: 1,
    },
    tileInner: {
      alignItems: 'center',
      borderRadius: radius.lg,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.lg,
    },
    tileLabel: {
      ...typography.strong,
      color: colors.text,
      textAlign: 'center',
    },
    cardBody: {
      ...typography.bodySmall,
      color: colors.text,
    },
    disclaimer: {
      ...typography.micro,
      color: colors.textFaint,
    },
    historyRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
    },
    historyDate: {
      ...typography.body,
      color: colors.text,
    },
    historyMeta: {
      ...typography.micro,
      color: colors.textFaint,
    },
  });
