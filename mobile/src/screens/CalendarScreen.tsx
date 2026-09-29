import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { MonthCalendar } from '../components/MonthCalendar';
import { listCycleLogs } from '../db/cycles';
import { getOrCreateProfile } from '../db/profile';
import { listSymptomLogs } from '../db/symptoms';
import { predictNextCycle } from '../engine/predictor';
import { buildCycleCalendar, type CycleCalendar } from '../lib/cycleDays';
import { toIsoDate } from '../lib/dates';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { spacing, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Calendar'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function CalendarScreen({ navigation }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const [calendar, setCalendar] = useState<CycleCalendar | null>(null);

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
        setCalendar(buildCycleCalendar(cycles, symptoms, prediction));
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  if (calendar === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <MonthCalendar
        calendar={calendar}
        onSelectDay={(day) => navigation.navigate('DayDetail', { date: toIsoDate(day) })}
      />
      <Text style={styles.hint}>
        Tap any day to see what's recorded on it, or to log a period or symptoms for that date.
        Dashed days are predicted, not recorded.
      </Text>
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
      gap: spacing.md,
      padding: spacing.md,
    },
    hint: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
  });
