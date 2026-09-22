import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { addDays, differenceInCalendarDays, format } from 'date-fns';

import { listCycleLogs } from '../db/cycles';
import { getOrCreateProfile } from '../db/profile';
import { predictNextCycle } from '../engine/predictor';
import { fromIsoDate } from '../lib/dates';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { CycleLog, Phenotype } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

interface LoadedState {
  cycles: CycleLog[];
  phenotype: Phenotype | null;
}

export function HomeScreen({ navigation }: Props) {
  const [state, setState] = useState<LoadedState | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const profile = await getOrCreateProfile();
        const cycles = await listCycleLogs(profile.id);
        if (active) setState({ cycles, phenotype: profile.phenotype });
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  if (state === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const { cycles, phenotype } = state;
  const prediction = predictNextCycle(cycles, phenotype);
  const lastCycle = cycles.length > 0 ? cycles[cycles.length - 1] : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Next period, likely window</Text>
        {lastCycle === null ? (
          <Text style={styles.emptyText}>
            Nothing recorded yet. Add a past cycle you remember, or log one as it starts, and a
            window will appear here.
          </Text>
        ) : (
          <WindowSummary lastStartDate={lastCycle.startDate} prediction={prediction} />
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={() => navigation.navigate('LogCycle')}
        >
          <Text style={styles.primaryButtonText}>Log a cycle</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          onPress={() => navigation.navigate('Backfill')}
        >
          <Text style={styles.secondaryButtonText}>Add past cycles</Text>
        </Pressable>
      </View>

      {cycles.length > 0 && (
        <View style={styles.history}>
          <Text style={styles.historyTitle}>History</Text>
          {[...cycles].reverse().map((cycle) => (
            <View key={cycle.id} style={styles.historyRow}>
              <Text style={styles.historyDate}>
                {format(fromIsoDate(cycle.startDate), 'MMM d, yyyy')}
              </Text>
              <Text style={styles.historySource}>
                {cycle.entrySource === 'backfilled' ? 'from memory' : 'logged live'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function WindowSummary({
  lastStartDate,
  prediction,
}: {
  lastStartDate: string;
  prediction: ReturnType<typeof predictNextCycle>;
}) {
  const anchor = fromIsoDate(lastStartDate);
  const windowStart = addDays(anchor, prediction.rangeStartDay);
  const windowEnd = addDays(anchor, prediction.rangeEndDay);
  const daysUntilStart = differenceInCalendarDays(windowStart, new Date());

  return (
    <>
      <Text style={styles.windowText}>
        {format(windowStart, 'MMM d')} – {format(windowEnd, 'MMM d')}
      </Text>
      <Text style={styles.windowMeta}>
        Around {Math.round(prediction.confidence * 100)}% likely to start in this window — day{' '}
        {prediction.rangeStartDay}–{prediction.rangeEndDay} of this cycle.
      </Text>
      <Text style={styles.windowMeta}>
        {daysUntilStart > 0
          ? `The window opens in ${daysUntilStart} ${daysUntilStart === 1 ? 'day' : 'days'}.`
          : daysUntilStart === 0
            ? 'The window opens today.'
            : 'You are inside the window now.'}
      </Text>
      <Text style={styles.disclaimer}>
        A range built from your own history, not a diagnosis or a guarantee. It gets narrower the
        more you log.
      </Text>
    </>
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
    gap: spacing.md,
    padding: spacing.md,
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
  windowText: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: '700',
  },
  windowMeta: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  disclaimer: {
    color: colors.textFaint,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  primaryButtonText: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  secondaryButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
  history: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  historyTitle: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  historyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  historyDate: {
    color: colors.text,
    fontSize: 15,
  },
  historySource: {
    color: colors.textFaint,
    fontSize: 12,
  },
});
