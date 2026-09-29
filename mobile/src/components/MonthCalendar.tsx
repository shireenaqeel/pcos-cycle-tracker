import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';

import { toIsoDate } from '../lib/dates';
import type { CycleCalendar } from '../lib/cycleDays';
import { fonts, radius, spacing, typography, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';

interface Props {
  calendar: CycleCalendar;
  onSelectDay: (date: Date) => void;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Where a day sits inside a run of consecutive marked days. A run is broken at
 * the end of a week row as well as by an unmarked day, so a span never appears
 * to wrap from Saturday to Sunday.
 */
function runEdges(
  day: Date,
  columnIndex: number,
  marked: Set<string>
): { isFirst: boolean; isLast: boolean } {
  return {
    isFirst: columnIndex === 0 || !marked.has(toIsoDate(subDays(day, 1))),
    isLast: columnIndex === 6 || !marked.has(toIsoDate(addDays(day, 1))),
  };
}

export function MonthCalendar({ calendar, onSelectDay }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const today = new Date();

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(visibleMonth)),
    end: endOfWeek(endOfMonth(visibleMonth)),
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          hitSlop={12}
          onPress={() => setVisibleMonth((month) => subMonths(month, 1))}
          style={styles.navButton}
        >
          <Text style={styles.navButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{format(visibleMonth, 'MMMM yyyy')}</Text>
        <Pressable
          hitSlop={12}
          onPress={() => setVisibleMonth((month) => addMonths(month, 1))}
          style={styles.navButton}
        >
          <Text style={styles.navButtonText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text key={index} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day, index) => {
          const iso = toIsoDate(day);
          const columnIndex = index % 7;
          const isPeriod = calendar.periodDates.has(iso);
          const isPredicted = !isPeriod && calendar.predictedDates.has(iso);
          const band = isPeriod
            ? runEdges(day, columnIndex, calendar.periodDates)
            : isPredicted
              ? runEdges(day, columnIndex, calendar.predictedDates)
              : null;

          return (
            <Pressable key={iso} style={styles.cell} onPress={() => onSelectDay(day)}>
              {band !== null && (
                <View
                  style={[
                    styles.band,
                    isPeriod ? styles.bandPeriod : styles.bandPredicted,
                    band.isFirst && styles.bandFirst,
                    band.isLast && styles.bandLast,
                  ]}
                />
              )}
              <View style={[styles.dayInner, isSameDay(day, today) && styles.dayToday]}>
                <Text
                  style={[
                    styles.dayText,
                    !isSameMonth(day, visibleMonth) && styles.dayTextOutside,
                    isPeriod && styles.dayTextPeriod,
                  ]}
                >
                  {format(day, 'd')}
                </Text>
              </View>
              <View
                style={[
                  styles.symptomDot,
                  calendar.symptomDates.has(iso) && styles.symptomDotVisible,
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <Legend />
    </View>
  );
}

function Legend() {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();

  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, { backgroundColor: colors.accent }]} />
        <Text style={styles.legendLabel}>Period</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, { backgroundColor: colors.accentSoft }]} />
        <Text style={styles.legendLabel}>Predicted</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.textMuted }]} />
        <Text style={styles.legendLabel}>Symptoms</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    navButton: {
      alignItems: 'center',
      height: 32,
      justifyContent: 'center',
      width: 32,
    },
    navButtonText: {
      ...typography.title,
      color: colors.accent,
    },
    monthLabel: {
      ...typography.strong,
      color: colors.text,
    },
    weekdayRow: {
      flexDirection: 'row',
    },
    weekdayLabel: {
      ...typography.micro,
      color: colors.textFaint,
      textAlign: 'center',
      width: `${100 / 7}%`,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    cell: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 3,
      width: `${100 / 7}%`,
    },
    // Spans the whole cell so consecutive days meet with no seam; the ends of a
    // run get the rounding, which is what turns a row of days into one pill.
    band: {
      bottom: 9,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 3,
    },
    bandPeriod: {
      backgroundColor: colors.accent,
    },
    bandPredicted: {
      backgroundColor: colors.accentSoft,
    },
    bandFirst: {
      borderBottomLeftRadius: 999,
      borderTopLeftRadius: 999,
      marginLeft: 2,
    },
    bandLast: {
      borderBottomRightRadius: 999,
      borderTopRightRadius: 999,
      marginRight: 2,
    },
    dayInner: {
      alignItems: 'center',
      aspectRatio: 1,
      borderRadius: 999,
      justifyContent: 'center',
      width: '76%',
    },
    dayToday: {
      borderColor: colors.text,
      borderWidth: 2,
    },
    dayText: {
      ...typography.bodySmall,
      color: colors.text,
    },
    dayTextOutside: {
      color: colors.textFaint,
    },
    dayTextPeriod: {
      color: colors.onAccent,
      fontFamily: fonts.bodyBold,
    },
    symptomDot: {
      borderRadius: 999,
      height: 4,
      marginTop: 2,
      width: 4,
    },
    symptomDotVisible: {
      backgroundColor: colors.textMuted,
    },
    legend: {
      borderTopColor: colors.border,
      borderTopWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
    },
    legendItem: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },
    legendSwatch: {
      borderRadius: 999,
      height: 14,
      width: 14,
    },
    legendDot: {
      borderRadius: 999,
      height: 6,
      width: 6,
    },
    legendLabel: {
      ...typography.micro,
      color: colors.textMuted,
    },
  });
