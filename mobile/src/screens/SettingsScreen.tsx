import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { listCycleLogs } from '../db/cycles';
import { getOrCreateProfile, setPhenotype } from '../db/profile';
import { listSymptomLogs } from '../db/symptoms';
import type { RootStackParamList } from '../navigation/types';
import { radius, spacing, typography, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { Phenotype } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const PHENOTYPE_OPTIONS: { value: Phenotype; label: string }[] = [
  { value: 'regular', label: 'Fairly regular' },
  { value: 'mildly_irregular', label: 'Somewhat irregular' },
  { value: 'diagnosed_pcos', label: 'Diagnosed PCOS or PCOD' },
  { value: 'unknown', label: "I'm not sure" },
];

export function SettingsScreen(_props: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const [phenotype, setCurrent] = useState<Phenotype | null>(null);
  const [counts, setCounts] = useState<{ cycles: number; symptoms: number } | null>(null);

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
        setCurrent(profile.phenotype);
        setCounts({ cycles: cycles.length, symptoms: symptoms.length });
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  async function change(value: Phenotype) {
    setCurrent(value);
    await setPhenotype(value);
  }

  if (counts === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Your cycle pattern</Text>
        <Text style={styles.cardBody}>
          Changing this shifts the starting assumption behind your predictions. Your recorded
          cycles still matter more, and nothing you've logged is affected.
        </Text>
        <View style={styles.options}>
          {PHENOTYPE_OPTIONS.map((option) => {
            const selected = phenotype === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => change(option.value)}
              >
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Your data</Text>
        <Row label="Periods recorded" value={`${counts.cycles}`} />
        <Row label="Days with symptoms" value={`${counts.symptoms}`} />
        <Text style={styles.note}>
          All of it is stored on this device only. There is no account, no sync, and no analytics
          with access to it. Deleting the app deletes the data — there is no export yet.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>About</Text>
        <Text style={styles.cardBody}>
          Predictions come from your own history plus your cycle pattern, reported as a window with
          a confidence level rather than a single date.
        </Text>
        <Text style={styles.note}>
          This app does not detect, diagnose or confirm PCOS, and it is not a substitute for advice
          from a clinician.
        </Text>
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md,
    },
    cardLabel: {
      ...typography.overline,
      color: colors.textMuted,
    },
    cardBody: {
      ...typography.bodySmall,
      color: colors.text,
    },
    options: {
      gap: spacing.sm,
    },
    option: {
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      padding: spacing.md,
    },
    optionSelected: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    optionLabel: {
      ...typography.body,
      color: colors.text,
    },
    optionLabelSelected: {
      color: colors.accent,
      fontWeight: '700',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    rowLabel: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    rowValue: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: colors.text,
    },
    note: {
      ...typography.micro,
      color: colors.textFaint,
    },
  });
