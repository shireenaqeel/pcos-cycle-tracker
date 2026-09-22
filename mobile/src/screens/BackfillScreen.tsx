import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';

import { DateGrid } from '../components/DateGrid';
import { insertCycleLog, listCycleLogs } from '../db/cycles';
import { LOCAL_USER_ID } from '../db/profile';
import { fromIsoDate, toIsoDate } from '../lib/dates';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { CycleLog } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Backfill'>;

export function BackfillScreen({ navigation }: Props) {
  const [selected, setSelected] = useState(() => new Date());
  const [cycles, setCycles] = useState<CycleLog[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCycleLogs(LOCAL_USER_ID).then(setCycles);
  }, []);

  const selectedIso = toIsoDate(selected);
  const alreadyRecorded = cycles.some((cycle) => cycle.startDate === selectedIso);

  async function add() {
    setSaving(true);
    const cycle = await insertCycleLog({
      userId: LOCAL_USER_ID,
      startDate: selectedIso,
      entrySource: 'backfilled',
    });
    setCycles((current) =>
      [...current, cycle].sort((a, b) => a.startDate.localeCompare(b.startDate))
    );
    setSaving(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.intro}>
        Add the start dates you remember, oldest or newest first — it doesn't matter. Rough guesses
        are useful: they shape the prediction, just more loosely than a cycle you log as it happens.
      </Text>

      <DateGrid value={selected} onChange={setSelected} maxDate={new Date()} />

      <Pressable
        disabled={saving || alreadyRecorded}
        style={({ pressed }) => [
          styles.addButton,
          pressed && styles.addButtonPressed,
          (saving || alreadyRecorded) && styles.addButtonDisabled,
        ]}
        onPress={add}
      >
        <Text style={styles.addButtonText}>
          {alreadyRecorded
            ? `${format(selected, 'MMM d, yyyy')} already added`
            : `Add ${format(selected, 'MMM d, yyyy')}`}
        </Text>
      </Pressable>

      {cycles.length > 0 && (
        <View style={styles.list}>
          <Text style={styles.listTitle}>Recorded start dates</Text>
          {[...cycles].reverse().map((cycle) => (
            <View key={cycle.id} style={styles.listRow}>
              <Text style={styles.listDate}>
                {format(fromIsoDate(cycle.startDate), 'MMM d, yyyy')}
              </Text>
              <Text style={styles.listSource}>
                {cycle.entrySource === 'backfilled' ? 'from memory' : 'logged live'}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Pressable style={styles.doneButton} onPress={() => navigation.goBack()}>
        <Text style={styles.doneButtonText}>Done</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  intro: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  addButtonPressed: {
    opacity: 0.85,
  },
  addButtonDisabled: {
    backgroundColor: colors.textFaint,
  },
  addButtonText: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  listTitle: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  listRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  listDate: {
    color: colors.text,
    fontSize: 15,
  },
  listSource: {
    color: colors.textFaint,
    fontSize: 12,
  },
  doneButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  doneButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
});
