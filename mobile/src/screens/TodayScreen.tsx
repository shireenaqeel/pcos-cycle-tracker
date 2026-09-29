import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { differenceInCalendarDays, format } from 'date-fns';

import { CycleRing } from '../components/CycleRing';
import { listCycleLogs } from '../db/cycles';
import { recordPredictionIfChanged } from '../db/predictions';
import { getOrCreateProfile } from '../db/profile';
import { listSymptomLogs } from '../db/symptoms';
import { MODEL_VERSION, predictNextCycle } from '../engine/predictor';
import { buildCycleCalendar, type CycleCalendar } from '../lib/cycleDays';
import { fromIsoDate, toIsoDate } from '../lib/dates';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { CycleLog, CycleRangePrediction } from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Today'>,
  NativeStackScreenProps<RootStackParamList>
>;

interface Loaded {
  cycles: CycleLog[];
  prediction: CycleRangePrediction | null;
  calendar: CycleCalendar;
}

export function TodayScreen({ navigation }: Props) {
  const [data, setData] = useState<Loaded | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const profile = await getOrCreateProfile();
        const [cycles, symptoms] = await Promise.all([
          listCycleLogs(profile.id),
          listSymptomLogs(profile.id),
        ]);
        if (!active) return;

        const prediction = cycles.length === 0 ? null : predictNextCycle(cycles, profile.phenotype);
        const calendar = buildCycleCalendar(cycles, symptoms, prediction);
        setData({ cycles, prediction, calendar });

        if (calendar.predictedWindow !== null && prediction !== null) {
          await recordPredictionIfChanged({
            userId: profile.id,
            rangeStart: calendar.predictedWindow.start,
            rangeEnd: calendar.predictedWindow.end,
            confidence: prediction.confidence,
            modelVersion: MODEL_VERSION,
          });
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  if (data === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const { cycles, prediction, calendar } = data;
  const bleedingToday = calendar.periodDates.has(toIsoDate(new Date()));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {calendar.currentCycleDay === null || prediction === null ? (
        <View style={styles.emptyHero}>
          <Text style={styles.emptyKicker}>Nothing recorded yet</Text>
          <Text style={styles.emptyHeadline}>Let's start with one date</Text>
          <Text style={styles.emptyBody}>
            Add when your last period started and this becomes a real prediction instead of an
            empty screen.
          </Text>
        </View>
      ) : (
        <View style={styles.ringCard}>
          <CycleRing
            cycleDay={calendar.currentCycleDay}
            windowStartDay={prediction.rangeStartDay}
            windowEndDay={prediction.rangeEndDay}
            caption={
              bleedingToday
                ? 'period recorded today'
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
              {format(fromIsoDate(calendar.predictedWindow.start), 'MMM d')} –{' '}
              {format(fromIsoDate(calendar.predictedWindow.end), 'MMM d')} · about{' '}
              {Math.round(prediction.confidence * 100)}% likely
            </Text>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={() => navigation.navigate('LogCycle')}
        >
          <Text style={styles.primaryButtonText}>
            {bleedingToday ? 'Log another period' : 'My period started'}
          </Text>
        </Pressable>
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => navigation.navigate('SymptomLog', {})}
          >
            <Text style={styles.secondaryButtonText}>Log symptoms</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => navigation.navigate('Backfill')}
          >
            <Text style={styles.secondaryButtonText}>Add past cycles</Text>
          </Pressable>
        </View>
      </View>

      {prediction !== null && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>What this is based on</Text>
          <Text style={styles.cardBody}>
            {cycles.length} recorded {cycles.length === 1 ? 'period' : 'periods'}, giving a typical
            cycle of about {Math.round(prediction.meanCycleLength)} days. The window is wide when
            your history is short or uneven, and narrows as it grows.
          </Text>
          <Text style={styles.disclaimer}>
            A likely range from your own data — not a diagnosis, and not a guarantee.
          </Text>
        </View>
      )}

      {cycles.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Recent periods</Text>
          {[...cycles]
            .reverse()
            .slice(0, 4)
            .map((cycle) => (
              <Pressable
                key={cycle.id}
                style={({ pressed }) => [styles.historyRow, pressed && styles.historyRowPressed]}
                onPress={() => navigation.navigate('CycleDetail', { cycleId: cycle.id })}
              >
                <Text style={styles.historyDate}>
                  {format(fromIsoDate(cycle.startDate), 'MMM d, yyyy')}
                </Text>
                <Text style={styles.historyMeta}>
                  {cycle.entrySource === 'backfilled' ? 'from memory' : 'logged live'} ›
                </Text>
              </Pressable>
            ))}
        </View>
      )}
    </ScrollView>
  );
}

function windowPhrase(startIso: string, endIso: string): string {
  const today = new Date();
  const daysToStart = differenceInCalendarDays(fromIsoDate(startIso), today);
  const daysToEnd = differenceInCalendarDays(fromIsoDate(endIso), today);

  if (daysToStart > 1) return `Next period expected in ${daysToStart} days`;
  if (daysToStart === 1) return 'Next period expected tomorrow';
  if (daysToStart === 0) return 'Your window opens today';
  if (daysToEnd >= 0) return "You're inside the expected window";
  return `Expected window passed ${Math.abs(daysToEnd)} ${Math.abs(daysToEnd) === 1 ? 'day' : 'days'} ago`;
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  ringCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  windowLine: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyHero: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  emptyKicker: {
    color: colors.accentSoft,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  emptyHeadline: {
    color: colors.onAccent,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  emptyBody: {
    color: colors.accentSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.accent,
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: spacing.md,
  },
  primaryButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardLabel: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardBody: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  disclaimer: {
    color: colors.textFaint,
    fontSize: 12,
    lineHeight: 17,
  },
  historyRow: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  historyRowPressed: {
    backgroundColor: colors.accentSoft,
  },
  historyDate: {
    color: colors.text,
    fontSize: 15,
  },
  historyMeta: {
    color: colors.textFaint,
    fontSize: 12,
  },
});
