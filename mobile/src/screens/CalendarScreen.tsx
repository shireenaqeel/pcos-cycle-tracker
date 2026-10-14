import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';

import { MonthCalendar } from '../components/MonthCalendar';
import { GrassStrip, Landscape } from '../components/Scenery';
import { SectionLabel, SoftCard } from '../components/Soft';
import { listCycleLogs } from '../db/cycles';
import { getOrCreateProfile } from '../db/profile';
import { listSymptomLogs } from '../db/symptoms';
import { detectOvulation } from '../engine/ovulation';
import { projectCycleWindows } from '../engine/predictor';
import { buildCycleCalendar, type CycleCalendar } from '../lib/cycleDays';
import { fromIsoDate, toIsoDate } from '../lib/dates';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import {
  radius,
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
  type ThemeColors,
} from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Calendar'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function CalendarScreen({ navigation }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const [calendar, setCalendar] = useState<CycleCalendar | null>(null);
  const [windowCount, setWindowCount] = useState(0);

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
        const lastStart = cycles.length === 0 ? null : cycles[cycles.length - 1].startDate;
        const signal = lastStart === null ? null : detectOvulation(symptoms, lastStart);
        const windows =
          cycles.length === 0
            ? []
            : projectCycleWindows(cycles, profile.phenotype, undefined, undefined, signal);
        setWindowCount(windows.length);
        setCalendar(buildCycleCalendar(cycles, symptoms, windows));
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
      <View style={styles.headerWrap}>
        <Landscape height={168}>
          {calendar.currentCycleDay === null ? (
            <Text style={styles.headerTitle}>Nothing recorded yet</Text>
          ) : (
            <>
              <Text style={styles.headerTitle}>Day {calendar.currentCycleDay}</Text>
              {calendar.predictedWindow !== null && (
                <Text style={styles.headerSub}>
                  Next window {format(fromIsoDate(calendar.predictedWindow.start), 'd MMM')} –{' '}
                  {format(fromIsoDate(calendar.predictedWindow.end), 'd MMM')}
                </Text>
              )}
            </>
          )}
        </Landscape>
      </View>

      <MonthCalendar
        calendar={calendar}
        onSelectDay={(day) => navigation.navigate('DayDetail', { date: toIsoDate(day) })}
      />

      <SoftCard>
        <SectionLabel>Reading this calendar</SectionLabel>
        <Text style={styles.body}>
          Tap any day to see what's recorded on it, or to log a period or a check-in for that date.
        </Text>
        <Text style={styles.body}>
          {windowCount === 0
            ? 'Predicted windows appear once a period is recorded to count from.'
            : windowCount === 1
              ? "Only the next window is shown. Beyond it the uncertainty is wide enough that the app can't tell one cycle from the next — so it shows nothing rather than guessing."
              : `${windowCount} windows ahead are shown. Each is wider than the last, because every cycle's uncertainty adds to the one before. They stop where they'd start overlapping.`}
        </Text>
      </SoftCard>

      <GrassStrip />
    </ScrollView>
  );
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
    headerWrap: {
      marginBottom: spacing.xs,
    },
    headerTitle: {
      ...typography.title,
      color: colors.text,
    },
    headerSub: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    body: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
  });
