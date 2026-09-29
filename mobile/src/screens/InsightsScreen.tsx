import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { listCycleLogs } from '../db/cycles';
import { LOCAL_USER_ID } from '../db/profile';
import { listSymptomLogs } from '../db/symptoms';
import { cycleInsights, type CycleInsights } from '../engine/insights';
import { phaseInsights, type PhaseInsights } from '../engine/phases';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { fonts, radius, spacing, typography, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { CycleLog, SymptomTag } from '../types';

const TAG_LABELS: Record<SymptomTag, string> = {
  cramps: 'Cramps',
  fatigue: 'Fatigue',
  cravings: 'Cravings',
  mood_swing: 'Mood swings',
  acne: 'Acne',
  hair_thinning: 'Hair thinning',
  hirsutism: 'Excess hair growth',
  ovulation_pain: 'Ovulation pain',
};

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Insights'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function InsightsScreen({ navigation }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const [cycles, setCycles] = useState<CycleLog[] | null>(null);
  const [phases, setPhases] = useState<PhaseInsights | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [loadedCycles, symptoms] = await Promise.all([
          listCycleLogs(LOCAL_USER_ID),
          listSymptomLogs(LOCAL_USER_ID),
        ]);
        if (!active) return;
        setCycles(loadedCycles);
        setPhases(phaseInsights(loadedCycles, symptoms));
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  if (cycles === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const insights = cycleInsights(cycles);
  const rememberedCount = cycles.filter((cycle) => cycle.entrySource === 'backfilled').length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.intro}>
        The numbers a clinician usually asks for, straight from what you've recorded. Nothing here
        is an assessment — it's your own data, counted.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Periods in the last 12 months</Text>
        <Text style={styles.big}>{insights.periodsInLastYear}</Text>
      </View>

      {insights.measuredCycles === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Cycle length</Text>
          <Text style={styles.empty}>
            Two recorded periods are needed before a cycle length exists to measure. Backfilling
            dates you remember counts.
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Cycle length</Text>
          <Text style={styles.big}>
            {insights.shortestCycleDays}–{insights.longestCycleDays} days
          </Text>
          <Stat label="Average" value={`${insights.averageCycleDays?.toFixed(1)} days`} />
          <Stat label="Median" value={`${insights.medianCycleDays?.toFixed(1)} days`} />
          <Stat label="Shortest to longest" value={`${insights.spreadDays} days apart`} />
          <Stat
            label="Cycles measured"
            value={`${insights.measuredCycles} (from ${cycles.length} periods)`}
          />
          <Text style={styles.note}>
            The gap between your shortest and longest cycle is the figure usually read as regular
            or irregular — see Learn for what the guidelines say.
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Period length</Text>
        {insights.typicalPeriodLengthDays === null ? (
          <Text style={styles.empty}>
            No end dates recorded yet. Add one to a period from the history on the home screen and
            this fills in.
          </Text>
        ) : (
          <>
            <Text style={styles.big}>
              {insights.typicalPeriodLengthDays.toFixed(1)} days
            </Text>
            <Text style={styles.note}>
              Averaged over the {insights.periodsWithRecordedLength}{' '}
              {insights.periodsWithRecordedLength === 1 ? 'period' : 'periods'} with an end date
              recorded.
            </Text>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Where this came from</Text>
        <Stat label="Logged as they happened" value={`${cycles.length - rememberedCount}`} />
        <Stat label="Entered from memory" value={`${rememberedCount}`} />
        <Text style={styles.note}>
          Worth mentioning in an appointment: remembered dates drift, and the prediction already
          weights them less.
        </Text>
      </View>

      {phases !== null && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Before your period</Text>
          {!phases.hasEnoughData ? (
            <Text style={styles.empty}>
              Not enough check-ins yet to compare the days before your period with the rest of your
              cycle. A few more logged days and this fills in — anything sooner would be noise with
              a percentage sign on it.
            </Text>
          ) : (
            <>
              {phases.clustered.length === 0 ? (
                <Text style={styles.empty}>
                  Nothing you've logged shows up more in the five days before your period than
                  during the rest of your cycle.
                </Text>
              ) : (
                <>
                  <Text style={styles.cardBody}>
                    In the five days before a period, compared with the rest of your cycle:
                  </Text>
                  {phases.clustered.slice(0, 4).map((pattern) => (
                    <Stat
                      key={pattern.tag}
                      label={TAG_LABELS[pattern.tag]}
                      value={`${Math.round(pattern.premenstrualRate * 100)}% vs ${Math.round(
                        pattern.restOfCycleRate * 100
                      )}%`}
                    />
                  ))}
                </>
              )}

              {phases.averageStressPremenstrual !== null &&
                phases.averageStressRestOfCycle !== null && (
                  <Stat
                    label="Average stress"
                    value={`${phases.averageStressPremenstrual.toFixed(1)} vs ${phases.averageStressRestOfCycle.toFixed(1)} of 5`}
                  />
                )}

              <Text style={styles.note}>
                Counted from {phases.premenstrualDays} premenstrual{' '}
                {phases.premenstrualDays === 1 ? 'day' : 'days'} and {phases.restOfCycleDays} other{' '}
                {phases.restOfCycleDays === 1 ? 'day' : 'days'}. These are your own tallies, not a
                finding — a handful of days can swing them a long way.
              </Text>
            </>
          )}
        </View>
      )}

      <Pressable
        style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]}
        onPress={() => navigation.navigate('Accuracy')}
      >
        <View style={styles.linkTextGroup}>
          <Text style={styles.linkTitle}>Track record</Text>
          <Text style={styles.linkBody}>
            How often the predicted window was actually right, next to how confident it claimed to
            be.
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]}
        onPress={() => navigation.navigate('SymptomHistory')}
      >
        <View style={styles.linkTextGroup}>
          <Text style={styles.linkTitle}>Symptom history</Text>
          <Text style={styles.linkBody}>Every day you've recorded, newest first.</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
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
    },
    intro: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      gap: spacing.xs,
      padding: spacing.md,
    },
    cardLabel: {
      ...typography.label,
      color: colors.textMuted,
    },
    big: {
      ...typography.metric,
      color: colors.accent,
      marginBottom: spacing.xs,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 2,
    },
    statLabel: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    statValue: {
      ...typography.bodySmall,
      fontFamily: fonts.bodyMedium,
      color: colors.text,
    },
    note: {
      ...typography.micro,
      color: colors.textFaint,
      marginTop: spacing.xs,
    },
    cardBody: {
      ...typography.bodySmall,
      color: colors.text,
    },
    empty: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    linkCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
    },
    linkCardPressed: {
      backgroundColor: colors.accentSoft,
    },
    linkTextGroup: {
      flex: 1,
      gap: 2,
    },
    linkTitle: {
      ...typography.body,
      fontFamily: fonts.bodyMedium,
      color: colors.text,
    },
    linkBody: {
      ...typography.caption,
      color: colors.textMuted,
    },
    chevron: {
      ...typography.heading,
      color: colors.accent,
    },
  });
