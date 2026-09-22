import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';

import { listCycleLogs } from '../db/cycles';
import { listPredictionSnapshots } from '../db/predictions';
import { LOCAL_USER_ID } from '../db/profile';
import { resolvePredictions, type AccuracySummary } from '../engine/accuracy';
import { fromIsoDate } from '../lib/dates';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Accuracy'>;

export function AccuracyScreen(_props: Props) {
  const [summary, setSummary] = useState<AccuracySummary | null>(null);

  useEffect(() => {
    (async () => {
      const [snapshots, cycles] = await Promise.all([
        listPredictionSnapshots(LOCAL_USER_ID),
        listCycleLogs(LOCAL_USER_ID),
      ]);
      setSummary(resolvePredictions(snapshots, cycles));
    })();
  }, []);

  if (summary === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (summary.resolved.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.intro}>
          Nothing to score yet. Once you log a cycle that happened after a prediction was made,
          this page will show whether the window was right — including the times it wasn't.
        </Text>
      </ScrollView>
    );
  }

  const hitPercent = Math.round((summary.hitRate ?? 0) * 100);
  const claimedPercent = Math.round((summary.claimedConfidence ?? 0) * 100);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Track record</Text>
        <Text style={styles.headline}>
          {hitPercent}% landed in the window
        </Text>
        <Text style={styles.cardMeta}>
          Across {summary.resolved.length}{' '}
          {summary.resolved.length === 1 ? 'prediction' : 'predictions'}. The app claimed about{' '}
          {claimedPercent}%, so the closer these two numbers are, the better calibrated it is.
        </Text>
        <Text style={styles.disclaimer}>
          A small number of predictions can't tell you much either way — this gets meaningful after
          several cycles.
        </Text>
      </View>

      {[...summary.resolved].reverse().map((entry) => (
        <View key={entry.snapshot.id} style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowWindow}>
              {format(fromIsoDate(entry.snapshot.rangeStart), 'MMM d')} –{' '}
              {format(fromIsoDate(entry.snapshot.rangeEnd), 'MMM d')}
            </Text>
            <Text style={styles.rowActual}>
              Arrived {format(fromIsoDate(entry.actualStartDate), 'MMM d')}
            </Text>
          </View>
          <Text style={[styles.verdict, entry.landedInWindow && styles.verdictHit]}>
            {entry.landedInWindow
              ? 'in window'
              : `${Math.abs(entry.daysOutsideWindow)}d ${entry.daysOutsideWindow < 0 ? 'early' : 'late'}`}
          </Text>
        </View>
      ))}
    </ScrollView>
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
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  cardLabel: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  headline: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '700',
  },
  cardMeta: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  disclaimer: {
    color: colors.textFaint,
    fontSize: 12,
    lineHeight: 17,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  rowText: {
    gap: 2,
  },
  rowWindow: {
    color: colors.text,
    fontSize: 15,
  },
  rowActual: {
    color: colors.textMuted,
    fontSize: 13,
  },
  verdict: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  verdictHit: {
    color: colors.accent,
  },
});
