import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';

import { DateGrid } from '../components/DateGrid';
import { insertCycleLog } from '../db/cycles';
import { CONTRACEPTION_OPTIONS } from '../content/contraception';
import { LOCAL_USER_ID, setContraception, setDisplayName, setPhenotype } from '../db/profile';
import { toIsoDate } from '../lib/dates';
import type { RootStackParamList } from '../navigation/types';
import { fonts, radius, spacing, typography, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { Contraception, Phenotype } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const PHENOTYPE_OPTIONS: { value: Phenotype; label: string; hint: string }[] = [
  {
    value: 'regular',
    label: 'Fairly regular',
    hint: 'Your cycles usually land around the same length.',
  },
  {
    value: 'mildly_irregular',
    label: 'Somewhat irregular',
    hint: 'The gap moves around by a week or so.',
  },
  {
    value: 'diagnosed_pcos',
    label: 'Diagnosed PCOS or PCOD',
    hint: 'A clinician has told you that you have it.',
  },
  {
    value: 'unknown',
    label: "I'm not sure",
    hint: 'A normal place to start. Predictions widen to match.',
  },
];

export function OnboardingScreen({ navigation }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const [step, setStep] = useState<'intro' | 'name' | 'phenotype' | 'method' | 'lastPeriod'>(
    'intro'
  );
  const [name, setName] = useState('');
  const [chosen, setChosen] = useState<Phenotype | null>(null);
  const [method, setMethod] = useState<Contraception | null>(null);
  const [lastPeriod, setLastPeriod] = useState(() => new Date());
  const [busy, setBusy] = useState(false);

  function choosePhenotype(value: Phenotype) {
    setChosen(value);
    setStep('method');
  }

  function chooseMethod(value: Contraception) {
    setMethod(value);
    setStep('lastPeriod');
  }

  async function finish(withLastPeriod: boolean) {
    setBusy(true);
    if (name.trim() !== '') await setDisplayName(name);
    if (chosen !== null) await setPhenotype(chosen);
    if (method !== null) await setContraception(method);
    if (withLastPeriod) {
      // Remembered at sign-up, so it is backfilled — not something logged as it happened.
      await insertCycleLog({
        userId: LOCAL_USER_ID,
        startDate: toIsoDate(lastPeriod),
        entrySource: 'backfilled',
      });
    }
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.progress}>
        {(['intro', 'name', 'phenotype', 'method', 'lastPeriod'] as const).map((stepName) => (
          <View key={stepName} style={[styles.pip, step === stepName && styles.pipActive]} />
        ))}
      </View>

      {step === 'intro' && (
        <View style={styles.stepBody}>
          <Text style={styles.title}>A tracker that doesn't assume 28 days</Text>
          <Text style={styles.paragraph}>
            Most period apps predict from a population average and show you one confident date. If
            your cycles are irregular, that date is usually wrong and tells you nothing about how
            wrong.
          </Text>
          <Text style={styles.paragraph}>
            This one learns from your own history and always shows a window with how likely it is.
            A few quick questions and you're set.
          </Text>
          <Text style={styles.footnote}>
            It can't detect or diagnose PCOS, and it isn't a substitute for a clinician.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => setStep('name')}
          >
            <Text style={styles.primaryButtonText}>Get started</Text>
          </Pressable>
        </View>
      )}

      {step === 'name' && (
        <View style={styles.stepBody}>
          <Text style={styles.title}>What should I call you?</Text>
          <Text style={styles.paragraph}>
            Only used to say hello on the home screen. It stays on this phone like everything else,
            and you can skip it.
          </Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => setStep('phenotype')}
          />
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => setStep('phenotype')}
          >
            <Text style={styles.primaryButtonText}>
              {name.trim() === '' ? 'Skip for now' : `Nice to meet you, ${name.trim()}`}
            </Text>
          </Pressable>
        </View>
      )}

      {step === 'phenotype' && (
        <View style={styles.stepBody}>
          <Text style={styles.title}>How would you describe your cycles?</Text>
          <Text style={styles.paragraph}>
            This only sets a starting point. What you log matters far more, and being wrong here
            breaks nothing.
          </Text>
          <View style={styles.options}>
            {PHENOTYPE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                onPress={() => choosePhenotype(option.value)}
              >
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionHint}>{option.hint}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {step === 'method' && (
        <View style={styles.stepBody}>
          <Text style={styles.title}>Are you using contraception?</Text>
          <Text style={styles.paragraph}>
            This matters more than it sounds. On a hormonal method your bleeds are scheduled by the
            method rather than by your own cycle, so the app must not read them as cycle patterns —
            it would draw the wrong conclusions in both directions.
          </Text>
          <View style={styles.options}>
            {CONTRACEPTION_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                onPress={() => chooseMethod(option.value)}
              >
                <Text style={styles.optionLabel}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {step === 'lastPeriod' && (
        <View style={styles.stepBody}>
          <Text style={styles.title}>When did your last period start?</Text>
          <Text style={styles.paragraph}>
            A rough guess is genuinely useful — it gives the app something to count from. It'll be
            marked as remembered rather than logged, and counted accordingly.
          </Text>
          <DateGrid value={lastPeriod} onChange={setLastPeriod} maxDate={new Date()} />
          <Pressable
            disabled={busy}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => finish(true)}
          >
            <Text style={styles.primaryButtonText}>
              {busy ? 'Setting up…' : `It started ${format(lastPeriod, 'MMM d')}`}
            </Text>
          </Pressable>
          <Pressable disabled={busy} style={styles.skipButton} onPress={() => finish(false)}>
            <Text style={styles.skipButtonText}>I don't remember — skip this</Text>
          </Pressable>
          {busy && <ActivityIndicator color={colors.accent} />}
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    progress: {
      alignSelf: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.lg,
    },
    pip: {
      backgroundColor: colors.border,
      borderRadius: 999,
      height: 6,
      width: 18,
    },
    pipActive: {
      backgroundColor: colors.accent,
    },
    stepBody: {
      gap: spacing.md,
    },
    title: {
      ...typography.title,
      color: colors.text,
    },
    paragraph: {
      ...typography.body,
      color: colors.textMuted,
    },
    footnote: {
      ...typography.micro,
      color: colors.textFaint,
    },
    options: {
      gap: spacing.sm,
    },
    option: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.md,
    },
    optionPressed: {
      backgroundColor: colors.accentSoft,
    },
    optionLabel: {
      ...typography.strong,
      color: colors.text,
    },
    optionHint: {
      ...typography.caption,
      color: colors.textMuted,
    },
    input: {
      ...typography.body,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1.5,
      color: colors.text,
      padding: spacing.md,
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    primaryButtonText: {
      ...typography.strong,
      fontFamily: fonts.bodyBold,
      color: colors.onAccent,
    },
    pressed: {
      opacity: 0.85,
    },
    skipButton: {
      alignItems: 'center',
      padding: spacing.sm,
    },
    skipButtonText: {
      ...typography.bodySmall,
      fontFamily: fonts.bodyMedium,
      color: colors.accent,
    },
  });
