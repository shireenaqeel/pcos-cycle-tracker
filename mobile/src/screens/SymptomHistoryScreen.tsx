import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';

import { LOCAL_USER_ID } from '../db/profile';
import { listSymptomLogs } from '../db/symptoms';
import { fromIsoDate } from '../lib/dates';
import type { RootStackParamList } from '../navigation/types';
import { radius, spacing, typography, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { DailySymptomLog, SymptomTag } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'SymptomHistory'>;

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

export function SymptomHistoryScreen({ navigation }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const [entries, setEntries] = useState<DailySymptomLog[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listSymptomLogs(LOCAL_USER_ID).then((loaded) => {
        if (active) setEntries(loaded);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  if (entries === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.empty}>
          Nothing recorded yet. Anything you log on the symptoms screen shows up here, newest
          first.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.intro}>Tap a day to change what you recorded.</Text>
      {entries.map((entry) => (
        <Pressable
          key={entry.id}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => navigation.navigate('SymptomLog', { date: entry.date })}
        >
          <Text style={styles.date}>{format(fromIsoDate(entry.date), 'EEEE, MMM d yyyy')}</Text>

          {entry.symptomTags.length > 0 && (
            <Text style={styles.tags}>
              {entry.symptomTags.map((tag) => TAG_LABELS[tag]).join(' · ')}
            </Text>
          )}

          <View style={styles.metaRow}>
            {entry.mood !== null && <Text style={styles.meta}>mood: {entry.mood}</Text>}
            {entry.basalTemp !== null && <Text style={styles.meta}>{entry.basalTemp}°C</Text>}
          </View>

          {entry.symptomTags.length === 0 && entry.mood === null && entry.basalTemp === null && (
            <Text style={styles.meta}>Nothing noted for this day.</Text>
          )}
        </Pressable>
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
      ...typography.caption,
      color: colors.textMuted,
    },
    empty: {
      ...typography.body,
      color: colors.textMuted,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.md,
    },
    cardPressed: {
      backgroundColor: colors.accentSoft,
    },
    date: {
      ...typography.body,
      fontWeight: '600',
      color: colors.text,
    },
    tags: {
      ...typography.bodySmall,
      color: colors.text,
    },
    metaRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    meta: {
      ...typography.micro,
      color: colors.textFaint,
    },
  });
