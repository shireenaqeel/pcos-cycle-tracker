import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { tapFeedback } from '../lib/feedback';
import {
  radius,
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
  type ThemeColors,
} from '../theme';

const TRACK_HEIGHT = 46;

/**
 * Water as one filling bar rather than a wrapping row of glasses.
 *
 * Tap anywhere on the bar to set the amount, or use the ends to nudge it. The
 * previous version was ten tappable glasses that wrapped onto two lines and
 * took up a third of the card for a number between zero and ten.
 */
export function WaterMeter({
  count,
  onChange,
  target = 8,
}: {
  count: number;
  onChange: (next: number) => void;
  target?: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const [trackWidth, setTrackWidth] = useState(0);
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fill, {
      toValue: Math.min(count / target, 1),
      useNativeDriver: false,
      speed: 14,
      bounciness: 6,
    }).start();
  }, [count, target, fill]);

  function setFromX(x: number) {
    if (trackWidth === 0) return;
    const next = Math.round((x / trackWidth) * target);
    const clamped = Math.max(0, Math.min(target + 4, next));
    if (clamped !== count) {
      tapFeedback();
      onChange(clamped);
    }
  }

  return (
    <View style={styles.meterRow}>
      <Pressable
        hitSlop={8}
        style={styles.nudge}
        onPress={() => {
          tapFeedback();
          onChange(Math.max(0, count - 1));
        }}
      >
        <Text style={styles.nudgeText}>−</Text>
      </Pressable>

      <Pressable
        style={styles.track}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        onPress={(event) => setFromX(event.nativeEvent.locationX)}
      >
        <Animated.View
          style={[
            styles.trackFill,
            {
              width: fill.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
        <Text style={styles.trackLabel}>
          {count === 0 ? 'none yet' : `${count} glass${count === 1 ? '' : 'es'}`}
        </Text>
      </Pressable>

      <Pressable
        hitSlop={8}
        style={styles.nudge}
        onPress={() => {
          tapFeedback();
          onChange(count + 1);
        }}
      >
        <Text style={styles.nudgeText}>+</Text>
      </Pressable>
    </View>
  );
}

/**
 * Sleep as a draggable slider. Dragging a single row to "about seven and a
 * half" is both quicker and a better match for how roughly people know this
 * than tapping one of ten bars and then a half-hour toggle.
 */
export function SleepSlider({
  hours,
  onChange,
  min = 0,
  max = 12,
}: {
  hours: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const [trackWidth, setTrackWidth] = useState(0);
  const widthRef = useRef(0);
  const latest = useRef(hours);
  latest.current = hours;

  /** Snaps to half hours: finer than that is false precision about sleep. */
  function valueFromX(x: number): number {
    const width = widthRef.current;
    if (width === 0) return latest.current;
    const ratio = Math.max(0, Math.min(1, x / width));
    return Math.round((min + ratio * (max - min)) * 2) / 2;
  }

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const next = valueFromX(event.nativeEvent.locationX);
        if (next !== latest.current) {
          tapFeedback();
          onChange(next);
        }
      },
      onPanResponderMove: (event, gesture) => {
        const next = valueFromX(event.nativeEvent.locationX + gesture.dx * 0);
        if (next !== latest.current) onChange(next);
      },
    })
  ).current;

  const ratio = (hours - min) / (max - min);

  return (
    <View style={styles.sliderWrap}>
      <View
        style={styles.track}
        onLayout={(event) => {
          widthRef.current = event.nativeEvent.layout.width;
          setTrackWidth(event.nativeEvent.layout.width);
        }}
        {...responder.panHandlers}
      >
        <View style={[styles.trackFill, { width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }]} />
        {trackWidth > 0 && (
          <View
            style={[
              styles.thumb,
              { left: Math.max(0, Math.min(trackWidth - 22, ratio * trackWidth - 11)) },
            ]}
          />
        )}
      </View>
      <Text style={styles.sliderValue}>
        {hours === 0 ? 'not recorded' : `${hours} hour${hours === 1 ? '' : 's'}`}
      </Text>
    </View>
  );
}

const STRESS_WORDS = ['calm', 'steady', 'busy', 'frayed', 'overwhelmed'];

/**
 * Stress as five segments in one row. The chosen one widens and the whole row
 * warms from sage to petal, so the reading is legible from the colour alone —
 * and it occupies a single line instead of a 120px blob plus a button row.
 */
export function StressScale({
  level,
  onChange,
}: {
  level: number | null;
  onChange: (next: number | null) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const tints = [colors.sage, colors.sage, colors.apricot, colors.apricot, colors.petal];

  return (
    <View style={styles.scaleWrap}>
      <View style={styles.segmentRow}>
        {[1, 2, 3, 4, 5].map((value) => {
          const selected = level === value;
          return (
            <Pressable
              key={value}
              style={[
                styles.segment,
                selected && styles.segmentSelected,
                { backgroundColor: level !== null && value <= level ? tints[level - 1] : colors.border },
              ]}
              onPress={() => {
                tapFeedback();
                LayoutAnimation.configureNext({
                  duration: 220,
                  update: { type: LayoutAnimation.Types.easeInEaseOut },
                });
                onChange(selected ? null : value);
              }}
            />
          );
        })}
      </View>
      <Text style={styles.scaleWord}>
        {level === null ? 'tap to set' : STRESS_WORDS[level - 1]}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    meterRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    nudge: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      height: 38,
      justifyContent: 'center',
      width: 38,
    },
    nudgeText: {
      ...typography.heading,
      color: colors.accent,
    },
    track: {
      backgroundColor: colors.border,
      borderRadius: radius.pill,
      flex: 1,
      height: TRACK_HEIGHT,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    trackFill: {
      backgroundColor: colors.accent,
      bottom: 0,
      left: 0,
      position: 'absolute',
      top: 0,
    },
    trackLabel: {
      ...typography.bodySmall,
      color: colors.text,
      textAlign: 'center',
    },
    sliderWrap: {
      gap: spacing.sm,
    },
    thumb: {
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      height: 22,
      position: 'absolute',
      width: 22,
    },
    sliderValue: {
      ...typography.bodySmall,
      color: colors.textMuted,
      textAlign: 'center',
    },
    scaleWrap: {
      gap: spacing.sm,
    },
    segmentRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      height: 38,
    },
    segment: {
      borderRadius: radius.pill,
      flex: 1,
    },
    segmentSelected: {
      flex: 2.2,
    },
    scaleWord: {
      ...typography.bodySmall,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
