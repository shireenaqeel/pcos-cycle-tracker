import { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { tapFeedback } from '../lib/feedback';
import {
  radius,
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
  type ThemeColors,
} from '../theme';

/** A rounded panel. Tint it to give a section its own colour rather than another white box. */
export function SoftCard({
  children,
  tint,
  style,
}: {
  children: React.ReactNode;
  tint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles(makeStyles);
  return <View style={[styles.card, tint !== undefined && { backgroundColor: tint }, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

/**
 * A pressable that dips slightly when touched. The scale is small on purpose —
 * enough to feel like the surface responds, not enough to look like a toy.
 */
export function Squish({
  children,
  onPress,
  disabled,
  style,
  haptic = true,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => animate(0.96)}
      onPressOut={() => animate(1)}
      onPress={() => {
        if (haptic) tapFeedback();
        onPress();
      }}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  tint,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  tint?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();

  return (
    <Squish onPress={onPress}>
      <View
        style={[
          styles.chip,
          selected && styles.chipSelected,
          selected && tint !== undefined && { backgroundColor: tint, borderColor: tint },
        ]}
      >
        <Text style={[styles.chipText, selected && { color: colors.text }]}>{label}</Text>
      </View>
    </Squish>
  );
}

/** Plus/minus counter for the things people log as a number of somethings. */
export function Stepper({
  value,
  onChange,
  suffix,
  step = 1,
  max = 30,
  format,
}: {
  value: number;
  onChange: (next: number) => void;
  suffix: string;
  step?: number;
  max?: number;
  format?: (value: number) => string;
}) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.stepper}>
      <Squish onPress={() => onChange(Math.max(0, Number((value - step).toFixed(1))))}>
        <View style={styles.stepperButton}>
          <Text style={styles.stepperSymbol}>−</Text>
        </View>
      </Squish>
      <View style={styles.stepperValue}>
        <Text style={styles.stepperNumber}>{format === undefined ? value : format(value)}</Text>
        <Text style={styles.stepperSuffix}>{suffix}</Text>
      </View>
      <Squish onPress={() => onChange(Math.min(max, Number((value + step).toFixed(1))))}>
        <View style={styles.stepperButton}>
          <Text style={styles.stepperSymbol}>+</Text>
        </View>
      </Squish>
    </View>
  );
}

/** 1-5 selector used for stress, shown as growing dots rather than numbers. */
export function ScaleDots({
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  lowLabel: string;
  highLabel: string;
}) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.scaleWrap}>
      <View style={styles.scaleRow}>
        {[1, 2, 3, 4, 5].map((level) => {
          const active = value !== null && level <= value;
          return (
            <Squish key={level} onPress={() => onChange(value === level ? null : level)}>
              <View
                style={[
                  styles.scaleDot,
                  { height: 18 + level * 5, width: 18 + level * 5 },
                  active && styles.scaleDotActive,
                ]}
              />
            </Squish>
          );
        })}
      </View>
      <View style={styles.scaleLabels}>
        <Text style={styles.scaleLabel}>{lowLabel}</Text>
        <Text style={styles.scaleLabel}>{highLabel}</Text>
      </View>
    </View>
  );
}

/**
 * A soft organic shape for screen backgrounds. Hand-tuned bezier rather than a
 * circle, so the app has something in it that isn't a rounded rectangle.
 */
export function Blob({
  color,
  size,
  style,
}: {
  color: string;
  size: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View pointerEvents="none" style={style}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Path
          fill={color}
          d="M46,-58.8C58.6,-49.1,67.1,-33.8,70.9,-17.4C74.7,-1,73.8,16.6,66.2,30.6C58.6,44.6,44.3,55,28.6,62.2C12.9,69.4,-4.2,73.4,-20.9,69.9C-37.6,66.3,-53.9,55.2,-63.4,40.1C-72.9,25,-75.6,5.9,-71.6,-11C-67.6,-27.9,-56.9,-42.6,-43.4,-52.3C-29.9,-62,-15,-66.7,1.4,-68.4C17.7,-70.1,35.4,-68.6,46,-58.8Z"
          transform="translate(100 100)"
        />
      </Svg>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      gap: spacing.sm,
      padding: spacing.md,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textMuted,
    },
    chip: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    chipSelected: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    chipText: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    stepper: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'center',
    },
    stepperButton: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      height: 46,
      justifyContent: 'center',
      width: 46,
    },
    stepperSymbol: {
      ...typography.heading,
      color: colors.accent,
    },
    stepperValue: {
      alignItems: 'center',
      minWidth: 96,
    },
    stepperNumber: {
      ...typography.metric,
      color: colors.text,
    },
    stepperSuffix: {
      ...typography.caption,
      color: colors.textMuted,
    },
    scaleWrap: {
      gap: spacing.sm,
    },
    scaleRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xs,
    },
    scaleDot: {
      backgroundColor: colors.border,
      borderRadius: radius.pill,
    },
    scaleDotActive: {
      backgroundColor: colors.accent,
    },
    scaleLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    scaleLabel: {
      ...typography.micro,
      color: colors.textFaint,
    },
  });
