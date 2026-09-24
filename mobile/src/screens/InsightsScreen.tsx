import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { listCycleLogs } from '../db/cycles';
import { LOCAL_USER_ID } from '../db/profile';
import { cycleInsights, type CycleInsights } from '../engine/insights';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { CycleLog } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Insights'>;

export function InsightsScreen(_props: Props) {
  const [cycles, setCycles] = useState<CycleLog[] | null>(null);

  useEffect(() => {
    listCycleLogs(LOCAL_USER_ID).then(setCycles);
  }, []);

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
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
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
    gap: spacing.sm,
    padding: spacing.md,
  },
  intro: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
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
  big: {
    color: colors.accent,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  statValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  note: {
    color: colors.textFaint,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
