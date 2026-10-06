import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Alert, Switch } from 'react-native';

import { listCycleLogs } from '../db/cycles';
import { deleteAllRecords } from '../db/reset';
import { getOrCreateProfile, setAppLock, setPhenotype, setReminderPrefs } from '../db/profile';
import { listSymptomLogs } from '../db/symptoms';
import { exportEverything } from '../lib/exportData';
import {
  cancelReminders,
  remindersSupported,
  requestPermission,
  rescheduleReminders,
} from '../lib/reminders';
import { projectCycleWindows } from '../engine/predictor';
import { buildCycleCalendar } from '../lib/cycleDays';
import { successFeedback, warningFeedback } from '../lib/feedback';
import { paletteFor, THEME_OPTIONS, useTheme } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { fonts, radius, spacing, typography, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
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
  const { themeName, chooseTheme } = useTheme();
  const dark = useColorScheme() === 'dark';
  const [phenotype, setCurrent] = useState<Phenotype | null>(null);
  const [counts, setCounts] = useState<{ cycles: number; symptoms: number } | null>(null);
  const [reminders, setReminders] = useState(false);
  const [reminderHour, setReminderHour] = useState(20);
  const [appLock, setAppLockState] = useState(false);
  const [working, setWorking] = useState<string | null>(null);

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
        setReminders(profile.remindersEnabled);
        setReminderHour(profile.reminderHour);
        setAppLockState(profile.appLockEnabled);
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  /** Reminder times are derived from the current prediction, so they're rebuilt here. */
  async function applyReminders(enabled: boolean, hour: number) {
    setReminders(enabled);
    setReminderHour(hour);
    await setReminderPrefs({ enabled, hour });

    if (!enabled) {
      await cancelReminders();
      return;
    }

    if (!remindersSupported()) {
      setReminders(false);
      await setReminderPrefs({ enabled: false, hour });
      return;
    }

    if (!(await requestPermission())) {
      setReminders(false);
      await setReminderPrefs({ enabled: false, hour });
      Alert.alert(
        'Notifications are off',
        'Your phone is blocking notifications for this app. Turn them on in system settings and try again.'
      );
      return;
    }

    const profile = await getOrCreateProfile();
    const [cycles, symptoms] = await Promise.all([
      listCycleLogs(profile.id),
      listSymptomLogs(profile.id),
    ]);
    const windows = cycles.length === 0 ? [] : projectCycleWindows(cycles, profile.phenotype);
    const calendar = buildCycleCalendar(cycles, symptoms, windows);

    await rescheduleReminders({
      windowStart: calendar.predictedWindow?.start ?? null,
      windowEnd: calendar.predictedWindow?.end ?? null,
      hour,
    });
    successFeedback();
  }

  async function exportData() {
    setWorking('export');
    try {
      const result = await exportEverything();
      if (!result.shared) {
        Alert.alert('Saved', `Sharing isn't available here. The file is at ${result.path}`);
      }
    } catch {
      Alert.alert('Could not export', 'Something went wrong writing the file.');
    } finally {
      setWorking(null);
    }
  }

  function confirmDeleteAll() {
    Alert.alert(
      'Delete everything?',
      'Every period, check-in and prediction on this device. There is no server copy, so this cannot be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: async () => {
            warningFeedback();
            await deleteAllRecords();
            await cancelReminders();
            setCounts({ cycles: 0, symptoms: 0 });
          },
        },
      ]
    );
  }

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
        <Text style={styles.cardLabel}>Theme</Text>
        <Text style={styles.cardBody}>
          Light and dark follow your phone; this picks the colours used in both.
        </Text>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map((option) => {
            const palette = paletteFor(option.name, dark);
            const selected = themeName === option.name;
            return (
              <Pressable
                key={option.name}
                style={[styles.themeChoice, selected && styles.themeChoiceSelected]}
                onPress={() => chooseTheme(option.name)}
              >
                <View style={styles.swatchRow}>
                  <View style={[styles.swatch, { backgroundColor: palette.accent }]} />
                  <View style={[styles.swatch, { backgroundColor: palette.petal }]} />
                  <View style={[styles.swatch, { backgroundColor: palette.sage }]} />
                </View>
                <Text style={[styles.themeLabel, selected && styles.themeLabelSelected]}>
                  {option.label}
                </Text>
                <Text style={styles.themeBlurb}>{option.blurb}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Reminders</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Nudge me about my cycle</Text>
          <Switch
            value={reminders}
            disabled={!remindersSupported()}
            onValueChange={(next) => void applyReminders(next, reminderHour)}
            trackColor={{ true: colors.accent, false: colors.border }}
          />
        </View>
        <Text style={styles.note}>
          Two days before your window opens, on the day it opens, and a daily check-in nudge.
          Scheduled on this phone — no server is involved and nothing is sent anywhere.
        </Text>
        {!remindersSupported() && (
          <Text style={styles.note}>
            Unavailable in Expo Go: Android support for notifications was removed from it in SDK
            53. This works in an installed build of the app.
          </Text>
        )}
        {reminders && (
          <>
            <Text style={styles.switchLabel}>Time of day</Text>
            <View style={styles.hourRow}>
              {[8, 12, 17, 20, 22].map((hour) => (
                <Pressable
                  key={hour}
                  style={[styles.hourChip, reminderHour === hour && styles.hourChipActive]}
                  onPress={() => void applyReminders(true, hour)}
                >
                  <Text
                    style={[
                      styles.hourChipText,
                      reminderHour === hour && styles.hourChipTextActive,
                    ]}
                  >
                    {hour === 12 ? 'noon' : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Privacy</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Require unlock to open</Text>
          <Switch
            value={appLock}
            onValueChange={(next) => {
              setAppLockState(next);
              void setAppLock(next);
            }}
            trackColor={{ true: colors.accent, false: colors.border }}
          />
        </View>
        <Text style={styles.note}>
          Uses your phone's own face, fingerprint or passcode. If your device has none set up, this
          does nothing — it can't invent a lock of its own.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Your data</Text>
        <Row label="Periods recorded" value={`${counts.cycles}`} />
        <Row label="Days with symptoms" value={`${counts.symptoms}`} />
        <Text style={styles.note}>
          All of it is stored on this device only. There is no account, no sync, and no analytics
          with access to it.
        </Text>
        <Pressable style={styles.action} onPress={exportData} disabled={working === 'export'}>
          <Text style={styles.actionText}>
            {working === 'export' ? 'Preparing…' : 'Export everything as a file'}
          </Text>
        </Pressable>
        <Pressable style={styles.action} onPress={confirmDeleteAll}>
          <Text style={styles.actionDanger}>Delete all my data</Text>
        </Pressable>
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
      borderRadius: radius.lg,
      gap: spacing.sm,
      padding: spacing.md,
    },
    cardLabel: {
      ...typography.label,
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
      fontFamily: fonts.bodyBold,
    },
    themeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    themeChoice: {
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1.5,
      flexGrow: 1,
      flexBasis: '45%',
      gap: spacing.xs,
      padding: spacing.md,
    },
    themeChoiceSelected: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    swatchRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    swatch: {
      borderRadius: radius.pill,
      height: 18,
      width: 18,
    },
    themeLabel: {
      ...typography.strong,
      color: colors.text,
    },
    themeLabelSelected: {
      color: colors.accent,
    },
    themeBlurb: {
      ...typography.micro,
      color: colors.textMuted,
    },
    switchRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    switchLabel: {
      ...typography.body,
      color: colors.text,
      flex: 1,
    },
    hourRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    hourChip: {
      borderColor: colors.border,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    hourChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    hourChipText: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    hourChipTextActive: {
      color: colors.onAccent,
    },
    action: {
      paddingVertical: spacing.sm,
    },
    actionText: {
      ...typography.body,
      color: colors.accent,
    },
    actionDanger: {
      ...typography.body,
      color: colors.accent,
      opacity: 0.85,
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
      fontFamily: fonts.bodyMedium,
      color: colors.text,
    },
    note: {
      ...typography.micro,
      color: colors.textFaint,
    },
  });
