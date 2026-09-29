import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';

import { toIsoDate } from '../lib/dates';
import type { CycleCalendar } from '../lib/cycleDays';
import { colors, radius, spacing } from '../theme';

interface Props {
  calendar: CycleCalendar;
  onSelectDay: (date: Date) => void;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function MonthCalendar({ calendar, onSelectDay }: Props) {
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
        {days.map((day) => {
          const iso = toIsoDate(day);
          const isPeriod = calendar.periodDates.has(iso);
          const isPredicted = !isPeriod && calendar.predictedDates.has(iso);
          const hasSymptoms = calendar.symptomDates.has(iso);
          const outsideMonth = !isSameMonth(day, visibleMonth);

          return (
            <Pressable key={iso} style={styles.cell} onPress={() => onSelectDay(day)}>
              <View
                style={[
                  styles.dayCircle,
                  isPeriod && styles.dayPeriod,
                  isPredicted && styles.dayPredicted,
                  isSameDay(day, today) && styles.dayToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    outsideMonth && styles.dayTextOutside,
                    isPeriod && styles.dayTextPeriod,
                  ]}
                >
                  {format(day, 'd')}
                </Text>
              </View>
              <View style={[styles.symptomDot, hasSymptoms && styles.symptomDotVisible]} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <Legend swatchStyle={styles.dayPeriod} label="Period" />
        <Legend swatchStyle={styles.dayPredicted} label="Predicted" />
        <Legend swatchStyle={styles.symptomDotVisible} label="Symptoms" round />
      </View>
    </View>
  );
}

function Legend({
  swatchStyle,
  label,
  round,
}: {
  swatchStyle: object;
  label: string;
  round?: boolean;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[round ? styles.legendDot : styles.legendSwatch, swatchStyle]} />
      <Text style={styles.legendLabel}>{label}</Text>
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
    paddingVertical: 3,
    width: `${100 / 7}%`,
  },
  dayCircle: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: 999,
    justifyContent: 'center',
    width: '78%',
  },
  dayPeriod: {
    backgroundColor: colors.accent,
  },
  dayPredicted: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  dayToday: {
    borderColor: colors.text,
    borderWidth: 2,
  },
  dayText: {
    color: colors.text,
    fontSize: 14,
  },
  dayTextOutside: {
    color: colors.textFaint,
  },
  dayTextPeriod: {
    color: colors.onAccent,
    fontWeight: '700',
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
    color: colors.textMuted,
    fontSize: 12,
  },
});
