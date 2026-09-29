import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';

import { MonthCalendar } from '../components/MonthCalendar';
import { Blob, SectionLabel, SoftCard } from '../components/Soft';
import { listCycleLogs } from '../db/cycles';
import { getOrCreateProfile } from '../db/profile';
import { listSymptomLogs } from '../db/symptoms';
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
        const windows = cycles.length === 0 ? [] : projectCycleWindows(cycles, profile.phenotype);
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
        <Blob color={colors.lilac} size={210} style={styles.blob} />
        <LinearGradient
          colors={[colors.gradientFrom, colors.gradientTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
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
        </LinearGradient>
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
    blob: {
      opacity: 0.4,
      position: 'absolute',
      right: -60,
      top: -50,
    },
    header: {
      borderRadius: radius.xl,
      gap: spacing.xs,
      padding: spacing.lg,
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
