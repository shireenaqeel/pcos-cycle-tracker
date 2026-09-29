import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';

import { DateGrid } from '../components/DateGrid';
import { insertCycleLog, listCycleLogs } from '../db/cycles';
import { LOCAL_USER_ID } from '../db/profile';
import { fromIsoDate, toIsoDate } from '../lib/dates';
import type { RootStackParamList } from '../navigation/types';
import { radius, spacing, typography, useThemedStyles, type ThemeColors } from '../theme';
import type { CycleLog } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Backfill'>;

export function BackfillScreen({ navigation }: Props) {
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      flexGrow: 1,
      gap: spacing.md,
      padding: spacing.md,
    },
    intro: {
      ...typography.bodySmall,
      color: colors.textMuted,
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
      ...typography.strong,
      color: colors.onAccent,
    },
    list: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      padding: spacing.md,
    },
    listTitle: {
      ...typography.label,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    listRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
    },
    listDate: {
      ...typography.body,
      color: colors.text,
    },
    listSource: {
      ...typography.micro,
      color: colors.textFaint,
    },
    doneButton: {
      alignItems: 'center',
      padding: spacing.md,
    },
    doneButtonText: {
      ...typography.strong,
      color: colors.accent,
    },
  });
