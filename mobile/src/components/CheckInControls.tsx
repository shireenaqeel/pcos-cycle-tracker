import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { tapFeedback } from '../lib/feedback';
import {
  radius,
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
  type ThemeColors,
} from '../theme';

/** Glasses that fill as you tap them — tapping the one already filled empties back to it. */
export function WaterGlasses({
  count,
  onChange,
  total = 10,
}: {
  count: number;
  onChange: (next: number) => void;
  total?: number;
}) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.glassRow}>
      {Array.from({ length: total }, (_, index) => index + 1).map((position) => (
        <Glass
          key={position}
          filled={position <= count}
          onPress={() => {
            tapFeedback();
            onChange(count === position ? position - 1 : position);
          }}
        />
      ))}
    </View>
  );
}

function Glass({ filled, onPress }: { filled: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const level = useRef(new Animated.Value(filled ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(level, { toValue: filled ? 1 : 0, useNativeDriver: false, speed: 14 }).start();
  }, [filled, level]);

  return (
    <Pressable onPress={onPress} hitSlop={4}>
      <View style={styles.glass}>
        <Animated.View
          style={[
            styles.glassFill,
            {
              backgroundColor: colors.accent,
              height: level.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

/**
 * Hours as tappable bars. A row of bars reads as an amount at a glance, which a
 * plus/minus counter never does, and half hours stay reachable via the toggle.
 */
export function SleepBars({
  hours,
  onChange,
}: {
  hours: number;
  onChange: (next: number) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const whole = Math.floor(hours);
  const hasHalf = hours - whole >= 0.5;

  return (
    <View style={styles.sleepWrap}>
      <View style={styles.barRow}>
        {Array.from({ length: 10 }, (_, index) => index + 3).map((hour) => {
          const active = hour <= whole;
          return (
            <Pressable
              key={hour}
              style={styles.barTouch}
              onPress={() => {
                tapFeedback();
                onChange(whole === hour && !hasHalf ? 0 : hour);
              }}
            >
              <View
                style={[
                  styles.bar,
                  { height: 24 + (hour - 3) * 7 },
                  active && styles.barActive,
                ]}
              />
              <Text style={[styles.barLabel, active && styles.barLabelActive]}>{hour}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.halfToggle, hasHalf && styles.halfToggleActive]}
        onPress={() => {
          tapFeedback();
          onChange(hasHalf ? whole : whole + 0.5);
        }}
      >
        <Text style={[styles.halfToggleText, hasHalf && styles.halfToggleTextActive]}>
          + 30 minutes
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Stress as a blob that swells and warms as the level rises, with the number
 * kept alongside so the feeling and the value are both legible.
 */
export function StressBlob({
  level,
  onChange,
}: {
  level: number | null;
  onChange: (next: number | null) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const size = useRef(new Animated.Value(level ?? 1)).current;

  useEffect(() => {
    Animated.spring(size, { toValue: level ?? 1, useNativeDriver: false, speed: 12 }).start();
  }, [level, size]);

  const tints = [colors.sage, colors.sage, colors.apricot, colors.apricot, colors.petal];

  return (
    <View style={styles.stressWrap}>
      <Animated.View
        style={[
          styles.stressBlob,
          {
            backgroundColor: level === null ? colors.border : tints[level - 1],
            transform: [
              { scale: size.interpolate({ inputRange: [1, 5], outputRange: [0.75, 1.25] }) },
            ],
          },
        ]}
      >
        <Text style={styles.stressValue}>{level === null ? '–' : level}</Text>
      </Animated.View>

      <View style={styles.stressButtons}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            style={[styles.stressDot, level === value && styles.stressDotActive]}
            onPress={() => {
              tapFeedback();
              onChange(level === value ? null : value);
            }}
          >
            <Text style={[styles.stressDotText, level === value && styles.stressDotTextActive]}>
              {value}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.stressLabels}>
        <Text style={styles.stressLabel}>calm</Text>
        <Text style={styles.stressLabel}>overwhelmed</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    glassRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      justifyContent: 'center',
    },
    glass: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: radius.sm,
      borderBottomRightRadius: radius.sm,
      borderColor: colors.accent,
      borderWidth: 1.5,
      height: 52,
      justifyContent: 'flex-end',
      overflow: 'hidden',
      width: 30,
    },
    glassFill: {
      width: '100%',
    },
    sleepWrap: {
      alignItems: 'center',
      gap: spacing.md,
    },
    barRow: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
    },
    barTouch: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    bar: {
      backgroundColor: colors.border,
      borderRadius: radius.sm,
      width: 20,
    },
    barActive: {
      backgroundColor: colors.accent,
    },
    barLabel: {
      ...typography.micro,
      color: colors.textFaint,
    },
    barLabelActive: {
      color: colors.accent,
    },
    halfToggle: {
      borderColor: colors.border,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    halfToggleActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    halfToggleText: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    halfToggleTextActive: {
      color: colors.accent,
    },
    stressWrap: {
      alignItems: 'center',
      gap: spacing.md,
    },
    stressBlob: {
      alignItems: 'center',
      borderRadius: radius.pill,
      height: 120,
      justifyContent: 'center',
      width: 120,
    },
    stressValue: {
      ...typography.metric,
      color: colors.text,
    },
    stressButtons: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    stressDot: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    stressDotActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    stressDotText: {
      ...typography.body,
      color: colors.textMuted,
    },
    stressDotTextActive: {
      color: colors.onAccent,
    },
    stressLabels: {
      flexDirection: 'row',
      gap: spacing.xl,
      justifyContent: 'space-between',
    },
    stressLabel: {
      ...typography.micro,
      color: colors.textFaint,
    },
  });
