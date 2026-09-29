import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';

import { Blob, SectionLabel } from '../components/Soft';

import { listCycleLogs } from '../db/cycles';
import { listPredictionSnapshots } from '../db/predictions';
import { LOCAL_USER_ID } from '../db/profile';
import { resolvePredictions, type AccuracySummary } from '../engine/accuracy';
import { fromIsoDate } from '../lib/dates';
import type { RootStackParamList } from '../navigation/types';
import { fonts, radius, spacing, typography, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Accuracy'>;

export function AccuracyScreen(_props: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
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
      <View style={styles.heroWrap}>
        <Blob color={colors.sage} size={200} style={styles.blob} />
        <LinearGradient
          colors={[colors.gradientFrom, colors.gradientTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <SectionLabel>Track record</SectionLabel>
          <Text style={styles.headline}>{hitPercent}% landed in the window</Text>
        <Text style={styles.cardMeta}>
          Across {summary.resolved.length}{' '}
          {summary.resolved.length === 1 ? 'prediction' : 'predictions'}. The app claimed about{' '}
          {claimedPercent}%, so the closer these two numbers are, the better calibrated it is.
        </Text>
          <View style={styles.compareBar}>
            <View style={[styles.compareFill, { width: `${hitPercent}%` }]} />
            <View style={[styles.claimMarker, { left: `${claimedPercent}%` }]} />
          </View>
          <Text style={styles.disclaimer}>
            The bar is how often it was right; the notch is how confident it claimed to be. A small
            number of predictions can't tell you much either way.
          </Text>
        </LinearGradient>
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
          <View
            style={[styles.verdictDot, entry.landedInWindow && styles.verdictDotHit]}
          />
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
      ...typography.body,
      color: colors.textMuted,
    },
    heroWrap: {
      marginBottom: spacing.xs,
    },
    blob: {
      opacity: 0.4,
      position: 'absolute',
      right: -60,
      top: -55,
    },
    hero: {
      borderRadius: radius.xl,
      gap: spacing.sm,
      padding: spacing.lg,
    },
    compareBar: {
      backgroundColor: colors.border,
      borderRadius: radius.pill,
      height: 10,
      justifyContent: 'center',
      overflow: 'visible',
    },
    compareFill: {
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      height: 10,
    },
    claimMarker: {
      backgroundColor: colors.text,
      borderRadius: radius.pill,
      height: 18,
      position: 'absolute',
      top: -4,
      width: 3,
    },
    verdictDot: {
      backgroundColor: colors.textFaint,
      borderRadius: radius.pill,
      height: 8,
      marginRight: spacing.sm,
      width: 8,
    },
    verdictDotHit: {
      backgroundColor: colors.accent,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      gap: spacing.sm,
      padding: spacing.lg,
    },
    cardLabel: {
      ...typography.label,
      color: colors.textMuted,
    },
    headline: {
      ...typography.metric,
      color: colors.accent,
    },
    cardMeta: {
      ...typography.bodySmall,
      color: colors.text,
    },
    disclaimer: {
      ...typography.micro,
      color: colors.textFaint,
    },
    row: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: spacing.md,
    },
    rowText: {
      gap: 2,
    },
    rowWindow: {
      ...typography.body,
      color: colors.text,
    },
    rowActual: {
      ...typography.caption,
      color: colors.textMuted,
    },
    verdict: {
      ...typography.caption,
      fontFamily: fonts.bodyMedium,
      color: colors.textMuted,
    },
    verdictHit: {
      color: colors.accent,
    },
  });
