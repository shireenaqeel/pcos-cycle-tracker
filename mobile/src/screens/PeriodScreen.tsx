import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { addDays, differenceInCalendarDays, format, isBefore } from 'date-fns';

import { DateGrid } from '../components/DateGrid';
import { Chip, SectionLabel, SoftCard, Squish } from '../components/Soft';
import {
  deleteCycleLog,
  getCycleLog,
  insertCycleLog,
  listCycleLogs,
  updateCycleLog,
} from '../db/cycles';
import { LOCAL_USER_ID } from '../db/profile';
import { cycleInsights } from '../engine/insights';
import { fromIsoDate, toIsoDate } from '../lib/dates';
import { successFeedback, warningFeedback } from '../lib/feedback';
import type { RootStackParamList } from '../navigation/types';
import {
  radius,
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
  type ThemeColors,
} from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Period'>;

/** Used only until there's enough history to know this person's own typical length. */
const ASSUMED_PERIOD_DAYS = 5;

/**
 * The single screen for a period, whether it's being added or corrected.
 *
 * There used to be three ways in — a "log a period" screen, a "period started
 * this day" action on a date, and a separate edit screen — which is why it was
 * unclear what the difference between them was. There is no difference, so
 * there is now one screen.
 */
export function PeriodScreen({ navigation, route }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();

  const editingId = route.params?.cycleId;
  const openedToEnd = route.params?.markEnd === true;
  const [loaded, setLoaded] = useState(false);
  const [startDate, setStartDate] = useState<Date>(() =>
    route.params?.startDate === undefined ? new Date() : fromIsoDate(route.params.startDate)
  );
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [stillBleeding, setStillBleeding] = useState(true);
  const [typicalLength, setTypicalLength] = useState(ASSUMED_PERIOD_DAYS);
  const [knowsTypical, setKnowsTypical] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const cycles = await listCycleLogs(LOCAL_USER_ID);
      const insights = cycleInsights(cycles);
      const existing = editingId === undefined ? null : await getCycleLog(editingId);
      if (!active) return;

      if (insights.typicalPeriodLengthDays !== null) {
        setTypicalLength(Math.round(insights.typicalPeriodLengthDays));
        setKnowsTypical(true);
      }

      if (existing !== null) {
        const start = fromIsoDate(existing.startDate);
        setStartDate(start);
        setEndDate(existing.endDate === null ? null : fromIsoDate(existing.endDate));
        // Arriving via "my period ended" means the end date is the whole point,
        // so don't make them flip a toggle to reach it.
        setStillBleeding(openedToEnd ? false : existing.endDate === null);
        if (openedToEnd && existing.endDate === null) {
          const typical = insights.typicalPeriodLengthDays;
          setEndDate(addDays(start, Math.max(0, Math.round(typical ?? ASSUMED_PERIOD_DAYS) - 1)));
        }
      }
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [editingId]);

  /** The end date most people would pick, so they only touch it when it's wrong. */
  const suggestedEnd = addDays(startDate, Math.max(0, typicalLength - 1));

  function changeStart(date: Date) {
    setStartDate(date);
    if (endDate !== null && isBefore(endDate, date)) setEndDate(date);
  }

  async function save() {
    setBusy(true);
    const resolvedEnd = stillBleeding ? null : toIsoDate(endDate ?? suggestedEnd);

    if (editingId === undefined) {
      await insertCycleLog({
        userId: LOCAL_USER_ID,
        startDate: toIsoDate(startDate),
        endDate: resolvedEnd,
        entrySource: 'logged',
      });
    } else {
      await updateCycleLog({
        id: editingId,
        startDate: toIsoDate(startDate),
        endDate: resolvedEnd,
        flowIntensity: null,
      });
    }
    successFeedback();
    navigation.goBack();
  }

  function confirmDelete() {
    if (editingId === undefined) return;
    Alert.alert(
      'Remove this period?',
      'It will stop counting toward your predictions. This cannot be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            warningFeedback();
            await deleteCycleLog(editingId);
            navigation.goBack();
          },
        },
      ]
    );
  }

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const shownEnd = endDate ?? suggestedEnd;
  const lengthDays = differenceInCalendarDays(shownEnd, startDate) + 1;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>
        {editingId === undefined
          ? 'When did it start?'
          : openedToEnd
            ? 'When did it end?'
            : 'Edit this period'}
      </Text>
      <Text style={styles.sub}>
        Pick the first day of bleeding. You can change any of this later.
      </Text>

      <DateGrid value={startDate} onChange={changeStart} maxDate={new Date()} />

      <SoftCard>
        <SectionLabel>Has it finished?</SectionLabel>
        <View style={styles.row}>
          <Chip
            label="Still bleeding"
            selected={stillBleeding}
            onPress={() => setStillBleeding(true)}
          />
          <Chip
            label="It has ended"
            selected={!stillBleeding}
            onPress={() => {
              setStillBleeding(false);
              if (endDate === null) setEndDate(suggestedEnd);
            }}
          />
        </View>

        {stillBleeding ? (
          <Text style={styles.note}>
            {knowsTypical
              ? `Your periods usually run about ${typicalLength} days, so this one would end around ${format(suggestedEnd, 'd MMM')}. Come back and set the end date when it does.`
              : `Most periods run about ${ASSUMED_PERIOD_DAYS} days. Once you've recorded a few end dates, this will use your own average instead.`}
          </Text>
        ) : (
          <>
            <Text style={styles.note}>
              {knowsTypical
                ? `Suggested from your own average of ${typicalLength} days. Change it if this one was different.`
                : `Suggested as ${ASSUMED_PERIOD_DAYS} days until your own average is known.`}
            </Text>
            <DateGrid
              value={shownEnd}
              onChange={setEndDate}
              minDate={startDate}
              maxDate={new Date()}
            />
            <Text style={styles.lengthLine}>
              {format(startDate, 'd MMM')} – {format(shownEnd, 'd MMM')} · {lengthDays}{' '}
              {lengthDays === 1 ? 'day' : 'days'}
            </Text>
          </>
        )}
      </SoftCard>

      <Squish onPress={save} disabled={busy} haptic={false}>
        <View style={styles.saveButton}>
          <Text style={styles.saveButtonText}>
            {editingId === undefined ? `Save period from ${format(startDate, 'd MMM')}` : 'Save changes'}
          </Text>
        </View>
      </Squish>

      {editingId !== undefined && (
        <Squish onPress={confirmDelete} disabled={busy} haptic={false}>
          <View style={styles.deleteButton}>
            <Text style={styles.deleteText}>Remove this period</Text>
          </View>
        </Squish>
      )}

      <Text style={styles.footnote}>
        Day-by-day flow, spotting and symptoms live in the daily check-in — this screen is just the
        dates.
      </Text>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
      paddingBottom: spacing.xl,
    },
    heading: {
      ...typography.title,
      color: colors.text,
    },
    sub: {
      ...typography.bodySmall,
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    note: {
      ...typography.caption,
      color: colors.textMuted,
    },
    lengthLine: {
      ...typography.bodySmall,
      color: colors.accent,
      textAlign: 'center',
    },
    saveButton: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      marginTop: spacing.sm,
      padding: spacing.md,
    },
    saveButtonText: {
      ...typography.strong,
      color: colors.onAccent,
    },
    deleteButton: {
      alignItems: 'center',
      padding: spacing.md,
    },
    deleteText: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    footnote: {
      ...typography.micro,
      color: colors.textFaint,
      textAlign: 'center',
    },
  });
