import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import {
  radius,
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
  type ThemeColors,
} from '../theme';

/** The range the guidelines treat as typical, drawn as a band to compare against. */
const TYPICAL_MIN = 21;
const TYPICAL_MAX = 35;

const CHART_HEIGHT = 150;

/**
 * Cycle lengths as bars against the typical band.
 *
 * A column of numbers tells you each cycle's length; a chart tells you the
 * shape — whether they're drifting, alternating, or scattered — which is the
 * thing someone is actually trying to see and the thing a clinician asks
 * about. Bars outside the band are tinted, so "how often am I outside normal"
 * is answered by glancing rather than comparing figures.
 */
export function CycleLengthChart({ lengths }: { lengths: number[] }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();

  if (lengths.length === 0) return null;

  const width = screenWidth - spacing.md * 4;
  const shown = lengths.slice(-12);
  const top = Math.max(TYPICAL_MAX + 6, ...shown) + 4;
  const scale = (value: number) => CHART_HEIGHT - (value / top) * CHART_HEIGHT;

  const slot = width / shown.length;
  const barWidth = Math.min(slot * 0.56, 26);

  return (
    <View style={styles.wrap}>
      <Svg width={width} height={CHART_HEIGHT}>
        {/* The typical band sits behind the bars as context, not as a verdict. */}
        <Rect
          x={0}
          y={scale(TYPICAL_MAX)}
          width={width}
          height={scale(TYPICAL_MIN) - scale(TYPICAL_MAX)}
          fill={colors.sage}
          opacity={0.3}
          rx={6}
        />
        <Line
          x1={0}
          y1={scale(TYPICAL_MIN)}
          x2={width}
          y2={scale(TYPICAL_MIN)}
          stroke={colors.border}
          strokeWidth={1}
        />

        {shown.map((length, index) => {
          const outside = length < TYPICAL_MIN || length > TYPICAL_MAX;
          const barHeight = Math.max(4, CHART_HEIGHT - scale(length));
          return (
            <Rect
              key={index}
              x={index * slot + (slot - barWidth) / 2}
              y={CHART_HEIGHT - barHeight}
              width={barWidth}
              height={barHeight}
              rx={barWidth / 2}
              fill={outside ? colors.accent : colors.sage}
            />
          );
        })}
      </Svg>

      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>
          {shown.length} most recent {shown.length === 1 ? 'cycle' : 'cycles'}
        </Text>
        <Text style={styles.axisLabel}>
          band = {TYPICAL_MIN}–{TYPICAL_MAX} days
        </Text>
      </View>
    </View>
  );
}

/** Horizontal bars for how often each thing was logged. */
export function FrequencyBars({
  rows,
  tint,
}: {
  rows: { label: string; count: number }[];
  tint: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();

  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((row) => row.count));

  return (
    <View style={styles.bars}>
      {rows.map((row) => (
        <View key={row.label} style={styles.barRow}>
          <Text numberOfLines={1} style={styles.barLabel}>
            {row.label}
          </Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { backgroundColor: tint, width: `${Math.max(6, (row.count / max) * 100)}%` },
              ]}
            />
          </View>
          <Text style={[styles.barCount, { color: colors.textMuted }]}>{row.count}</Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      gap: spacing.sm,
    },
    axisRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    axisLabel: {
      ...typography.micro,
      color: colors.textFaint,
    },
    bars: {
      gap: spacing.sm,
    },
    barRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    barLabel: {
      ...typography.caption,
      color: colors.text,
      width: '38%',
    },
    barTrack: {
      backgroundColor: colors.border,
      borderRadius: radius.pill,
      flex: 1,
      height: 12,
      overflow: 'hidden',
    },
    barFill: {
      borderRadius: radius.pill,
      height: 12,
    },
    barCount: {
      ...typography.micro,
      minWidth: 18,
      textAlign: 'right',
    },
  });
