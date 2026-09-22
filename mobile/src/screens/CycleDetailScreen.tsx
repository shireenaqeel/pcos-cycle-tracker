import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format, isBefore } from 'date-fns';

import { DateGrid } from '../components/DateGrid';
import { deleteCycleLog, getCycleLog, updateCycleLog } from '../db/cycles';
import { fromIsoDate, toIsoDate } from '../lib/dates';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { CycleLog } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'CycleDetail'>;

type FlowIntensity = NonNullable<CycleLog['flowIntensity']>;

const FLOW_OPTIONS: { value: FlowIntensity; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
];

export function CycleDetailScreen({ navigation, route }: Props) {
  const { cycleId } = route.params;
  const [cycle, setCycle] = useState<CycleLog | null>(null);

  useEffect(() => {
    getCycleLog(cycleId).then((loaded) => {
      if (loaded === null) navigation.goBack();
      else setCycle(loaded);
    });
  }, [cycleId, navigation]);

  if (cycle === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return <CycleEditor cycle={cycle} onDone={() => navigation.goBack()} />;
}

function CycleEditor({ cycle, onDone }: { cycle: CycleLog; onDone: () => void }) {
  const [startDate, setStartDate] = useState(() => fromIsoDate(cycle.startDate));
  const [endDate, setEndDate] = useState<Date | null>(() =>
    cycle.endDate === null ? null : fromIsoDate(cycle.endDate)
  );
  const [flow, setFlow] = useState<FlowIntensity | null>(cycle.flowIntensity);
  const [busy, setBusy] = useState(false);

  function changeStartDate(date: Date) {
    setStartDate(date);
    if (endDate !== null && isBefore(endDate, date)) setEndDate(date);
  }

  async function save() {
    setBusy(true);
    await updateCycleLog({
      id: cycle.id,
      startDate: toIsoDate(startDate),
      endDate: endDate === null ? null : toIsoDate(endDate),
      flowIntensity: flow,
    });
    onDone();
  }

  function confirmDelete() {
    Alert.alert(
      'Delete this cycle?',
      'It will stop counting toward your predictions. This cannot be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            await deleteCycleLog(cycle.id);
            onDone();
          },
        },
      ]
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.provenance}>
        {cycle.entrySource === 'backfilled'
          ? 'Added from memory — counts toward predictions, but weighted less than a cycle logged as it happened. Editing it keeps that weighting.'
          : 'Logged as it happened, so it carries full weight in your predictions.'}
      </Text>

      <Text style={styles.sectionLabel}>Start date</Text>
      <DateGrid value={startDate} onChange={changeStartDate} maxDate={new Date()} />

      <Text style={styles.sectionLabel}>End date</Text>
      {endDate === null ? (
        <Pressable style={styles.ghostButton} onPress={() => setEndDate(startDate)}>
          <Text style={styles.ghostButtonText}>Add an end date</Text>
        </Pressable>
      ) : (
        <View style={styles.gap}>
          <DateGrid value={endDate} onChange={setEndDate} minDate={startDate} maxDate={new Date()} />
          <Pressable style={styles.ghostButton} onPress={() => setEndDate(null)}>
            <Text style={styles.ghostButtonText}>Clear end date</Text>
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
        disabled={busy}
        style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
        onPress={save}
      >
        <Text style={styles.saveButtonText}>Save changes</Text>
      </Pressable>

      <Pressable disabled={busy} style={styles.deleteButton} onPress={confirmDelete}>
        <Text style={styles.deleteButtonText}>Delete this cycle</Text>
      </Pressable>

      <Text style={styles.footnote}>
        Recorded {format(fromIsoDate(cycle.startDate), 'MMM d, yyyy')}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  gap: {
    gap: spacing.sm,
  },
  provenance: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    padding: spacing.md,
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
  saveButtonText: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
  deleteButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  deleteButtonText: {
    color: colors.accent,
    fontSize: 15,
  },
  footnote: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: 'center',
  },
});
