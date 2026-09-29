import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { ringGeometry } from '../lib/ring';
import { spacing, typography, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';

interface Props {
  cycleDay: number;
  windowStartDay: number;
  windowEndDay: number;
  /** Shown under the day count, e.g. "of about 31". */
  caption: string;
  headline: string;
}

const SIZE = 220;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** An arc drawn by dashing the circle: one visible run, then a gap the rest of the way. */
function arcProps(fromFraction: number, toFraction: number) {
  const length = Math.max(0, toFraction - fromFraction) * CIRCUMFERENCE;
  return {
    strokeDasharray: `${length} ${CIRCUMFERENCE}`,
    strokeDashoffset: -fromFraction * CIRCUMFERENCE,
  };
}

export function CycleRing({ cycleDay, windowStartDay, windowEndDay, caption, headline }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const ring = ringGeometry({ cycleDay, windowStartDay, windowEndDay });

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE}>
        {/* Rotated so day zero sits at the top rather than at three o'clock. */}
        <G rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={colors.border}
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={colors.accentSoft}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="butt"
            {...arcProps(ring.windowStartFraction, ring.windowEndFraction)}
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={ring.isOverdue ? colors.textMuted : colors.accent}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            {...arcProps(0, ring.elapsedFraction)}
          />
        </G>
      </Svg>

      <View style={styles.center} pointerEvents="none">
        <Text style={styles.dayLabel}>Day</Text>
        <Text style={styles.dayNumber}>{cycleDay}</Text>
        <Text style={styles.caption}>{caption}</Text>
      </View>

      <Text style={styles.headline}>{headline}</Text>

      <View style={styles.legend}>
        <LegendItem color={ring.isOverdue ? colors.textMuted : colors.accent} label="Elapsed" />
        <LegendItem color={colors.accentSoft} label="Expected window" />
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    center: {
      alignItems: 'center',
      height: SIZE,
      justifyContent: 'center',
      position: 'absolute',
      width: SIZE,
    },
    dayLabel: {
      ...typography.overline,
      color: colors.textMuted,
    },
    dayNumber: {
      ...typography.display,
      color: colors.text,
    },
    caption: {
      ...typography.caption,
      color: colors.textMuted,
    },
    headline: {
      ...typography.heading,
      color: colors.text,
      marginTop: 4,
      textAlign: 'center',
    },
    legend: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    legendItem: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },
    legendSwatch: {
      borderRadius: 999,
      height: 10,
      width: 10,
    },
    legendLabel: {
      ...typography.micro,
      color: colors.textMuted,
    },
  });
