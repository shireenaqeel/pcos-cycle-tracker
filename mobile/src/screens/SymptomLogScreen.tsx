import { useEffect, useState } from 'react';
import {
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
import { LOCAL_USER_ID } from '../db/profile';
import { deleteSymptomLog, getSymptomLogForDate, saveSymptomLog } from '../db/symptoms';
import { fromIsoDate, toIsoDate } from '../lib/dates';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { SymptomTag } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'SymptomLog'>;

const SYMPTOM_OPTIONS: { value: SymptomTag; label: string }[] = [
  { value: 'cramps', label: 'Cramps' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'cravings', label: 'Cravings' },
  { value: 'mood_swing', label: 'Mood swings' },
  { value: 'acne', label: 'Acne' },
  { value: 'hair_thinning', label: 'Hair thinning' },
  { value: 'hirsutism', label: 'Excess hair growth' },
  { value: 'ovulation_pain', label: 'Ovulation pain' },
];

const MOOD_OPTIONS = ['good', 'even', 'low', 'irritable', 'anxious'];

export function SymptomLogScreen({ navigation, route }: Props) {
  const requestedDate = route.params?.date;
  const [date, setDate] = useState(() =>
    requestedDate === undefined ? new Date() : fromIsoDate(requestedDate)
  );
  const [tags, setTags] = useState<SymptomTag[]>([]);
  const [mood, setMood] = useState<string | null>(null);
  const [basalTemp, setBasalTemp] = useState('');
  const [existingEntry, setExistingEntry] = useState(false);
  const [busy, setBusy] = useState(false);

  const isoDate = toIsoDate(date);

  useEffect(() => {
    let active = true;
    getSymptomLogForDate(LOCAL_USER_ID, isoDate).then((entry) => {
      if (!active) return;
      setTags(entry === null ? [] : entry.symptomTags);
      setMood(entry === null ? null : entry.mood);
      setBasalTemp(entry === null || entry.basalTemp === null ? '' : String(entry.basalTemp));
      setExistingEntry(entry !== null);
    });
    return () => {
      active = false;
    };
  }, [isoDate]);

  function toggleTag(tag: SymptomTag) {
    setTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    );
  }

  async function save() {
    setBusy(true);
    const parsedTemp = Number(basalTemp.trim());
    await saveSymptomLog({
      userId: LOCAL_USER_ID,
      date: isoDate,
      symptomTags: tags,
      basalTemp: basalTemp.trim() !== '' && Number.isFinite(parsedTemp) ? parsedTemp : null,
      mood,
    });
    navigation.goBack();
  }

  async function clearDay() {
    setBusy(true);
    await deleteSymptomLog(LOCAL_USER_ID, isoDate);
    navigation.goBack();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.intro}>
        Symptoms are yours to look back on. They don't move the prediction — the app won't pretend
        a symptom tells it something it can't actually prove.
      </Text>

      <Pressable style={styles.historyLink} onPress={() => navigation.navigate('SymptomHistory')}>
        <Text style={styles.historyLinkText}>See past entries</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>Day</Text>
      <DateGrid value={date} onChange={setDate} maxDate={new Date()} />

      <Text style={styles.sectionLabel}>How you felt</Text>
      <View style={styles.chipWrap}>
        {SYMPTOM_OPTIONS.map((option) => {
          const selected = tags.includes(option.value);
          return (
            <Pressable
              key={option.value}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => toggleTag(option.value)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Mood</Text>
      <View style={styles.chipWrap}>
        {MOOD_OPTIONS.map((option) => {
          const selected = mood === option;
          return (
            <Pressable
              key={option}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setMood(selected ? null : option)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Basal temperature (°C)</Text>
      <TextInput
        style={styles.input}
        value={basalTemp}
        onChangeText={setBasalTemp}
        placeholder="Optional, e.g. 36.6"
        placeholderTextColor={colors.textFaint}
        keyboardType="decimal-pad"
        inputMode="decimal"
      />

      <Pressable
        disabled={busy}
        style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
        onPress={save}
      >
        <Text style={styles.saveButtonText}>Save {format(date, 'MMM d')}</Text>
      </Pressable>

      {existingEntry && (
        <Pressable disabled={busy} style={styles.clearButton} onPress={clearDay}>
          <Text style={styles.clearButtonText}>Clear this day's entry</Text>
        </Pressable>
      )}
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
  intro: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.6,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.text,
    fontSize: 14,
  },
  chipTextSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    padding: spacing.md,
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
  clearButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  clearButtonText: {
    color: colors.accent,
    fontSize: 15,
  },
  historyLink: {
    alignSelf: 'flex-start',
  },
  historyLinkText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
