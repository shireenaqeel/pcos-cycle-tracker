import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { differenceInCalendarDays, format, getHours } from 'date-fns';

import { CycleRing } from '../components/CycleRing';
import { PhaseCard } from '../components/PhaseCard';
import { FadeInUp } from '../components/Motion';
import { GrassStrip, Landscape } from '../components/Scenery';
import { Chip, SectionLabel, SoftCard, Squish } from '../components/Soft';
import { listCycleLogs } from '../db/cycles';
import { recordPredictionIfChanged } from '../db/predictions';
import { LOCAL_USER_ID, getOrCreateProfile } from '../db/profile';
import { getSymptomLogForDate, listSymptomLogs, saveSymptomLog } from '../db/symptoms';
import { CONTRACEPTION_LABELS, suppressesOvulation } from '../content/contraception';
import { cycleInsights } from '../engine/insights';
import { detectOvulation, type OvulationSignal } from '../engine/ovulation';
import { mapCyclePhases } from '../engine/phaseMap';
import { phaseInsights } from '../engine/phases';
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
import { MOOD_LABELS, SYMPTOM_LABELS } from '../content/trackers';
import type {
  Contraception,
  CycleLog,
  CycleRangePrediction,
  DailySymptomLog,
  MoodTag,
  SymptomTag,
} from '../types';

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
  signal: OvulationSignal | null;
  typicalPeriodDays: number | null;
  premenstrualPattern: SymptomTag[] | null;
  contraception: Contraception | null;
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

    const lastStart = cycles.length === 0 ? null : cycles[cycles.length - 1].startDate;
    const signal = lastStart === null ? null : detectOvulation(symptoms, lastStart);

    const prediction =
      cycles.length === 0 ? null : predictNextCycle(cycles, profile.phenotype, undefined, signal);
    const windows =
      cycles.length === 0
        ? []
        : projectCycleWindows(cycles, profile.phenotype, undefined, undefined, signal);
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

    const pattern = phaseInsights(cycles, symptoms);

    return {
      cycles,
      prediction,
      calendar,
      today,
      name: profile.displayName,
      signal,
      typicalPeriodDays: cycleInsights(cycles).typicalPeriodLengthDays,
      premenstrualPattern: pattern.hasEnoughData
        ? pattern.clustered.slice(0, 3).map((p) => p.tag)
        : null,
      contraception: profile.contraception,
    };
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

  const { cycles, prediction, calendar, today, name, signal } = data;
  const bleedingToday = calendar.periodDates.has(toIsoDate(new Date()));
  const lastCycle = cycles.length === 0 ? null : cycles[cycles.length - 1];

  // The predictor speaks in day offsets from the last start; the ring and the
  // phase map count that start as day 1, the same way `currentCycleDay` does.
  const windowDays =
    prediction === null
      ? null
      : { start: prediction.rangeStartDay + 1, end: prediction.rangeEndDay + 1 };

  const phaseMap =
    windowDays === null || calendar.currentCycleDay === null || lastCycle === null
      ? null
      : mapCyclePhases({
          cycleDay: calendar.currentCycleDay,
          windowStartDay: windowDays.start,
          windowEndDay: windowDays.end,
          periodLengthDays:
            lastCycle.endDate === null ? data.typicalPeriodDays : periodLength(lastCycle),
          bleedingToday,
          signal,
        });
  // The most recent period with no end date recorded. While one exists, ending
  // it is the action someone is most likely here for — previously the only way
  // to reach it was to find that period in the history list.
  const ongoingPeriod =
    cycles.length === 0 ? null : (cycles[cycles.length - 1].endDate === null ? cycles[cycles.length - 1] : null);

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
      lhTest: today?.lhTest ?? null,
    });
    successFeedback();
    setData(await load());
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <FadeInUp style={styles.greetingBlock}>
        <Text style={styles.greeting}>{greeting(name)}</Text>
        <Text style={styles.date}>{format(new Date(), 'EEEE, d MMMM')}</Text>
      </FadeInUp>

      <FadeInUp delay={80} style={styles.heroWrap}>
        <Landscape height={calendar.currentCycleDay === null ? 250 : 330}>
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
                windowStartDay={prediction.rangeStartDay + 1}
                windowEndDay={prediction.rangeEndDay + 1}
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
        </Landscape>
      </FadeInUp>

      <SoftCard delay={160}>
        <SectionLabel>How are you feeling?</SectionLabel>
        <View style={styles.wrap}>
          {QUICK_MOODS.map((mood) => (
            <Chip
              key={mood}
              label={MOOD_LABELS[mood]}
              selected={today?.moods?.includes(mood) ?? false}
              onPress={() => setMood(mood)}
            />
          ))}
        </View>
        <Text style={styles.quickNote}>
          {(today === null ? null : summariseCheckIn(today)) ?? 'Saved the moment you tap.'}
        </Text>
      </SoftCard>

      {today !== null && today.symptomTags.length > 0 && (
        <SoftCard delay={200} tint={colors.apricot}>
          <SectionLabel>Noted today</SectionLabel>
          <View style={styles.wrap}>
            {today.symptomTags.slice(0, 8).map((tag) => (
              <View key={tag} style={styles.noteChip}>
                <Text style={styles.noteChipText}>{SYMPTOM_LABELS[tag]}</Text>
              </View>
            ))}
          </View>
        </SoftCard>
      )}

      <FadeInUp delay={240} style={styles.tileRow}>
        <Tile
          label={ongoingPeriod === null ? 'Period started' : 'My period ended'}
          tint={colors.petal}
          onPress={() =>
            navigation.navigate(
              'Period',
              ongoingPeriod === null ? {} : { cycleId: ongoingPeriod.id, markEnd: true }
            )
          }
        />
        <Tile
          label="Full check-in"
          tint={colors.sage}
          onPress={() => navigation.navigate('CheckIn', {})}
        />
      </FadeInUp>

      {phaseMap !== null &&
        lastCycle !== null &&
        calendar.currentCycleDay !== null &&
        (suppressesOvulation(data.contraception) && data.contraception !== null ? (
          <SoftCard delay={270}>
            <SectionLabel>Where you are in your cycle</SectionLabel>
            <Text style={styles.cardBody}>
              With your method ({CONTRACEPTION_LABELS[data.contraception]}), bleeds follow its
              schedule rather than ovulation, so cycle phases and PMS timing don't apply. The
              expected bleed above still does.
            </Text>
          </SoftCard>
        ) : (
          <PhaseCard
            delay={270}
            map={phaseMap}
            cycleDay={calendar.currentCycleDay}
            lastPeriodStart={lastCycle.startDate}
            signal={signal}
            premenstrualPattern={data.premenstrualPattern}
            confidence={prediction?.confidence ?? 0}
            onLearnMore={() => navigation.navigate('Learn')}
          />
        ))}

      {prediction !== null && (
        <SoftCard delay={300}>
          <SectionLabel>What this is based on</SectionLabel>
          <Text style={styles.cardBody}>
            {signal === null
              ? `${cycles.length} recorded ${cycles.length === 1 ? 'period' : 'periods'}, giving a typical cycle of about ${Math.round(prediction.meanCycleLength)} days. The window is wide when your history is short or uneven, and narrows as it grows.`
              : `An ovulation signal on day ${signal.cycleDay} of this cycle, from ${signal.source === 'lh' ? 'your LH test' : 'your temperature rise'}. Counting forward from that is far tighter than estimating a whole cycle's length, which is why this window is narrow.`}
          </Text>
          <Text style={styles.disclaimer}>
            A likely range from your own data — not a diagnosis, and not a guarantee.
          </Text>
        </SoftCard>
      )}

      {cycles.length > 0 && (
        <SoftCard delay={360}>
          <SectionLabel>Recent periods</SectionLabel>
          {[...cycles]
            .reverse()
            .slice(0, 4)
            .map((cycle) => (
              <Squish
                key={cycle.id}
                haptic={false}
                onPress={() =>
                  navigation.navigate('Period', {
                    cycleId: cycle.id,
                    markEnd: cycle.endDate === null,
                  })
                }
              >
                <View style={styles.historyRow}>
                  <Text style={styles.historyDate}>
                    {format(fromIsoDate(cycle.startDate), 'd MMM')}
                    {cycle.endDate === null
                      ? ''
                      : ` – ${format(fromIsoDate(cycle.endDate), 'd MMM')}`}
                  </Text>
                  <Text
                    style={[styles.historyMeta, cycle.endDate === null && styles.historyOngoing]}
                  >
                    {cycle.endDate === null ? 'no end date yet' : `${periodLength(cycle)} days`}
                  </Text>
                </View>
              </Squish>
            ))}
        </SoftCard>
      )}

      <GrassStrip />
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

function periodLength(cycle: CycleLog): number {
  if (cycle.endDate === null) return 0;
  return (
    differenceInCalendarDays(fromIsoDate(cycle.endDate), fromIsoDate(cycle.startDate)) + 1
  );
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
    noteChip: {
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    noteChipText: {
      ...typography.caption,
      color: colors.text,
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
    historyOngoing: {
      color: colors.accent,
    },
    historyMeta: {
      ...typography.micro,
      color: colors.textFaint,
    },
  });
