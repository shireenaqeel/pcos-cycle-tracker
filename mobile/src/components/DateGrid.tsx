import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';

import { colors, radius, spacing } from '../theme';

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  /** Cycle dates are always in the past or today — a future start date is never meaningful. */
  maxDate?: Date;
  minDate?: Date;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function DateGrid({ value, onChange, maxDate, minDate }: Props) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(value));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(visibleMonth)),
    end: endOfWeek(endOfMonth(visibleMonth)),
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          hitSlop={12}
          style={styles.navButton}
          onPress={() => setVisibleMonth((month) => subMonths(month, 1))}
        >
          <Text style={styles.navButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{format(visibleMonth, 'MMMM yyyy')}</Text>
        <Pressable
          hitSlop={12}
          style={styles.navButton}
          onPress={() => setVisibleMonth((month) => addMonths(month, 1))}
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
        {days.map((day) => {
          const outOfRange =
            (maxDate !== undefined && isAfter(startOfDay(day), startOfDay(maxDate))) ||
            (minDate !== undefined && isAfter(startOfDay(minDate), startOfDay(day)));
          const selected = isSameDay(day, value);
          const dimmed = !isSameMonth(day, visibleMonth);

          return (
            <Pressable
              key={day.toISOString()}
              disabled={outOfRange}
              style={[styles.cell, selected && styles.cellSelected]}
              onPress={() => onChange(day)}
            >
              <Text
                style={[
                  styles.cellText,
                  dimmed && styles.cellTextDimmed,
                  outOfRange && styles.cellTextOutOfRange,
                  selected && styles.cellTextSelected,
                ]}
              >
                {format(day, 'd')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
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
    color: colors.accent,
    fontSize: 24,
    lineHeight: 26,
  },
  monthLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: 'center',
    width: `${100 / 7}%`,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: radius.sm,
    justifyContent: 'center',
    width: `${100 / 7}%`,
  },
  cellSelected: {
    backgroundColor: colors.accent,
  },
  cellText: {
    color: colors.text,
    fontSize: 15,
  },
  cellTextDimmed: {
    color: colors.textFaint,
  },
  cellTextOutOfRange: {
    color: colors.border,
  },
  cellTextSelected: {
    color: colors.onAccent,
    fontWeight: '600',
  },
});
