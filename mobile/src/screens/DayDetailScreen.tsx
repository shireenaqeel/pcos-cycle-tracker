import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format, isAfter, startOfDay } from 'date-fns';

import { insertCycleLog, listCycleLogs } from '../db/cycles';
import { LOCAL_USER_ID } from '../db/profile';
import { getSymptomLogForDate } from '../db/symptoms';
import { fromIsoDate } from '../lib/dates';
import type { RootStackParamList } from '../navigation/types';
import { radius, spacing, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { CycleLog, DailySymptomLog, SymptomTag } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'DayDetail'>;

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

export function DayDetailScreen({ navigation, route }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const { date } = route.params;
  const [cycleOnDay, setCycleOnDay] = useState<CycleLog | null>(null);
  const [symptoms, setSymptoms] = useState<DailySymptomLog | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [cycles, entry] = await Promise.all([
          listCycleLogs(LOCAL_USER_ID),
          getSymptomLogForDate(LOCAL_USER_ID, date),
        ]);
        if (!active) return;
        setCycleOnDay(cycles.find((cycle) => cycle.startDate === date) ?? null);
        setSymptoms(entry);
        setLoaded(true);
      })();
      return () => {
        active = false;
      };
    }, [date])
  );

  const day = fromIsoDate(date);
  const inFuture = isAfter(startOfDay(day), startOfDay(new Date()));

  async function markPeriodStart() {
    setBusy(true);
    await insertCycleLog({
      userId: LOCAL_USER_ID,
      startDate: date,
      entrySource: 'logged',
      flowIntensity: null,
    });
    navigation.goBack();
  }

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.date}>{format(day, 'EEEE, d MMMM yyyy')}</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Period</Text>
        {cycleOnDay === null ? (
          <Text style={styles.empty}>No period recorded as starting on this day.</Text>
        ) : (
          <>
            <Text style={styles.cardBody}>
              Recorded as a period start
              {cycleOnDay.endDate === null
                ? ', no end date yet'
                : `, ending ${format(fromIsoDate(cycleOnDay.endDate), 'MMM d')}`}
              .
            </Text>
            <Text style={styles.meta}>
              {cycleOnDay.entrySource === 'backfilled' ? 'Entered from memory' : 'Logged live'}
              {cycleOnDay.flowIntensity === null ? '' : ` · ${cycleOnDay.flowIntensity} flow`}
            </Text>
          </>
        )}

        {cycleOnDay === null ? (
          inFuture ? (
            <Text style={styles.meta}>A period can't be recorded for a future date.</Text>
          ) : (
            <Pressable
              disabled={busy}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
              onPress={markPeriodStart}
            >
              <Text style={styles.buttonText}>My period started this day</Text>
            </Pressable>
          )
        ) : (
          <Pressable
            style={({ pressed }) => [styles.ghostButton, pressed && styles.pressed]}
            onPress={() => navigation.navigate('CycleDetail', { cycleId: cycleOnDay.id })}
          >
            <Text style={styles.ghostButtonText}>Edit or delete this period</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Symptoms</Text>
        {symptoms === null ? (
          <Text style={styles.empty}>Nothing recorded for this day.</Text>
        ) : (
          <>
            {symptoms.symptomTags.length > 0 && (
              <Text style={styles.cardBody}>
                {symptoms.symptomTags.map((tag) => TAG_LABELS[tag]).join(' · ')}
              </Text>
            )}
            <Text style={styles.meta}>
              {symptoms.mood === null ? '' : `mood: ${symptoms.mood}`}
              {symptoms.basalTemp === null ? '' : `  ${symptoms.basalTemp}°C`}
            </Text>
          </>
        )}
        <Pressable
          style={({ pressed }) => [styles.ghostButton, pressed && styles.pressed]}
          onPress={() => navigation.navigate('SymptomLog', { date })}
        >
          <Text style={styles.ghostButtonText}>
            {symptoms === null ? 'Log symptoms for this day' : 'Change what you recorded'}
          </Text>
        </Pressable>
      </View>
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
    date: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      gap: spacing.sm,
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
      fontSize: 15,
      lineHeight: 21,
    },
    empty: {
      color: colors.textMuted,
      fontSize: 14,
    },
    meta: {
      color: colors.textFaint,
      fontSize: 12,
    },
    button: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    buttonText: {
      color: colors.onAccent,
      fontSize: 15,
      fontWeight: '600',
    },
    ghostButton: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      padding: spacing.md,
    },
    ghostButtonText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '600',
    },
    pressed: {
      opacity: 0.85,
    },
  });
