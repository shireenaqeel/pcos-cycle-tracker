import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { setPhenotype } from '../db/profile';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { Phenotype } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const OPTIONS: { value: Phenotype; label: string; hint: string }[] = [
  {
    value: 'regular',
    label: 'Fairly regular',
    hint: 'Your cycles usually land around the same length.',
  },
  {
    value: 'mildly_irregular',
    label: 'Somewhat irregular',
    hint: 'The gap between cycles moves around by a week or so.',
  },
  {
    value: 'diagnosed_pcos',
    label: 'Diagnosed PCOS or PCOD',
    hint: 'A clinician has told you that you have it.',
  },
  {
    value: 'unknown',
    label: "I'm not sure",
    hint: "A normal place to start. Predictions widen to match, and narrow as you log.",
  },
];

export function OnboardingScreen({ navigation }: Props) {
  const [pending, setPending] = useState<Phenotype | null>(null);

  async function choose(value: Phenotype) {
    setPending(value);
    await setPhenotype(value);
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>How would you describe your cycles?</Text>
      <Text style={styles.subtitle}>
        This only sets a starting point. What you log from here carries far more weight than this
        answer, and you can be wrong about it without breaking anything.
      </Text>

      <View style={styles.options}>
        {OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            disabled={pending !== null}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            onPress={() => choose(option.value)}
          >
            <View style={styles.optionTextGroup}>
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionHint}>{option.hint}</Text>
            </View>
            {pending === option.value && <ActivityIndicator color={colors.accent} />}
          </Pressable>
        ))}
      </View>

      <Text style={styles.footnote}>
        This app does not detect or confirm PCOS. It tracks what you record and shows you the
        pattern.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  options: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  option: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  optionPressed: {
    backgroundColor: colors.accentSoft,
  },
  optionTextGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  optionLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  optionHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  footnote: {
    color: colors.textFaint,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xl,
  },
});
