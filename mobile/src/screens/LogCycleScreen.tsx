import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format, isBefore } from 'date-fns';

import { DateGrid } from '../components/DateGrid';
import { insertCycleLog } from '../db/cycles';
import { LOCAL_USER_ID } from '../db/profile';
import { toIsoDate } from '../lib/dates';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { CycleLog } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'LogCycle'>;

type FlowIntensity = NonNullable<CycleLog['flowIntensity']>;

const FLOW_OPTIONS: { value: FlowIntensity; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
];

export function LogCycleScreen({ navigation }: Props) {
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [flow, setFlow] = useState<FlowIntensity | null>(null);
  const [saving, setSaving] = useState(false);

  function changeStartDate(date: Date) {
    setStartDate(date);
    if (endDate !== null && isBefore(endDate, date)) setEndDate(date);
  }

  async function save() {
    setSaving(true);
    await insertCycleLog({
      userId: LOCAL_USER_ID,
      startDate: toIsoDate(startDate),
      endDate: endDate === null ? null : toIsoDate(endDate),
      flowIntensity: flow,
      entrySource: 'logged',
    });
    navigation.goBack();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionLabel}>Start date</Text>
      <DateGrid value={startDate} onChange={changeStartDate} maxDate={new Date()} />

      <Text style={styles.sectionLabel}>End date</Text>
      {endDate === null ? (
        <Pressable style={styles.ghostButton} onPress={() => setEndDate(startDate)}>
          <Text style={styles.ghostButtonText}>It's already ended — add the end date</Text>
        </Pressable>
      ) : (
        <View style={styles.gap}>
          <DateGrid
            value={endDate}
            onChange={setEndDate}
            minDate={startDate}
            maxDate={new Date()}
          />
          <Pressable style={styles.ghostButton} onPress={() => setEndDate(null)}>
            <Text style={styles.ghostButtonText}>Still ongoing</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionLabel}>Flow</Text>
      <View style={styles.flowRow}>
        {FLOW_OPTIONS.map((option) => {
          const selected = flow === option.value;
          return (
            <Pressable
              key={option.value}
              style={[styles.flowOption, selected && styles.flowOptionSelected]}
              onPress={() => setFlow(selected ? null : option.value)}
            >
              <Text style={[styles.flowOptionText, selected && styles.flowOptionTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        disabled={saving}
        style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
        onPress={save}
      >
        <Text style={styles.saveButtonText}>Save cycle starting {format(startDate, 'MMM d')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  gap: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.6,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
  },
  ghostButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  ghostButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  flowRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flowOption: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md,
  },
  flowOptionSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  flowOptionText: {
    color: colors.text,
    fontSize: 15,
  },
  flowOptionTextSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonText: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: '600',
  },
});
