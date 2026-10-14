import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { getHours } from 'date-fns';

import { radius } from '../theme';
import { useThemeColors, type ThemeColors } from '../theme';

/**
 * Hand-authored scenery, in the spirit of painted pastoral backdrops: a washed
 * sky, drifting clouds, layered hills and grass that sways. Every shape here is
 * an original path — nothing is traced from anyone's artwork.
 *
 * Two rules keep it from becoming noise. Motion is slow enough to read as
 * weather rather than animation, and the scene always sits *behind* content
 * with text drawn on its own surface, so nothing legible fights a gradient.
 */

type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export function timeOfDay(now: Date = new Date()): TimeOfDay {
  const hour = getHours(now);
  if (hour < 7) return 'dawn';
  if (hour < 17) return 'day';
  if (hour < 20) return 'dusk';
  return 'night';
}

/** The sky shifts through the day, so opening the app at night looks like night. */
function skyColors(part: TimeOfDay, colors: ThemeColors): [string, string] {
  switch (part) {
    case 'dawn':
      return [colors.apricot, colors.petal];
    case 'day':
      return [colors.gradientFrom, colors.gradientTo];
    case 'dusk':
      return [colors.petal, colors.lilac];
    case 'night':
      return [colors.lilac, colors.accentSoft];
  }
}

function useLoop(seconds: number, delay = 0) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: seconds * 1000,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [progress, seconds, delay]);

  return progress;
}

function Cloud({ width, color }: { width: number; color: string }) {
  return (
    <Svg width={width} height={width * 0.42} viewBox="0 0 100 42">
      <Ellipse cx="30" cy="26" rx="26" ry="14" fill={color} />
      <Ellipse cx="54" cy="20" rx="22" ry="17" fill={color} />
      <Ellipse cx="74" cy="27" rx="19" ry="12" fill={color} />
    </Svg>
  );
}

interface CloudSpec {
  size: number;
  top: number;
  seconds: number;
  delay: number;
  opacity: number;
}

/** Its own component so the animation hook isn't called from inside a loop. */
function DriftingCloud({
  spec,
  width,
  color,
}: {
  spec: CloudSpec;
  width: number;
  color: string;
}) {
  const progress = useLoop(spec.seconds, spec.delay);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        opacity: spec.opacity,
        position: 'absolute',
        top: spec.top,
        transform: [
          {
            translateX: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [-spec.size, width + spec.size],
            }),
          },
        ],
      }}
    >
      <Cloud width={spec.size} color={color} />
    </Animated.View>
  );
}

/** Clouds cross on their own slow schedules, so the scene never repeats exactly. */
function DriftingClouds({ width, color }: { width: number; color: string }) {
  const specs: CloudSpec[] = useMemo(
    () => [
      { size: width * 0.42, top: 14, seconds: 58, delay: 0, opacity: 0.75 },
      { size: width * 0.3, top: 52, seconds: 82, delay: 6000, opacity: 0.55 },
      { size: width * 0.22, top: 30, seconds: 104, delay: 15000, opacity: 0.4 },
    ],
    [width]
  );

  return (
    <>
      {specs.map((spec, index) => (
        <DriftingCloud key={index} spec={spec} width={width} color={color} />
      ))}
    </>
  );
}

/** Layered ridges. Two tones, the far one paler, which is what reads as distance. */
function Hills({ width, colors }: { width: number; colors: ThemeColors }) {
  return (
    <Svg width={width} height={94} viewBox="0 0 390 94" style={styles.hills}>
      <Path
        d="M0 58 C 48 30, 96 30, 150 52 C 206 74, 250 36, 300 44 C 340 50, 368 40, 390 34 L390 94 L0 94 Z"
        fill={colors.sage}
        opacity={0.55}
      />
      <Path
        d="M0 74 C 60 52, 118 66, 176 72 C 240 79, 286 58, 334 64 C 362 67, 378 72, 390 70 L390 94 L0 94 Z"
        fill={colors.sage}
      />
    </Svg>
  );
}

function Blade({ delay, height, color }: { delay: number; height: number; color: string }) {
  const sway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: 2600,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sway, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sway, delay]);

  return (
    <Animated.View
      style={{
        backgroundColor: color,
        borderTopLeftRadius: radius.pill,
        borderTopRightRadius: radius.pill,
        height,
        transform: [
          {
            rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '6deg'] }),
          },
        ],
        transformOrigin: 'bottom',
        width: 5,
      }}
    />
  );
}

/** A strip of grass that sways out of step with itself, like a breeze crossing it. */
export function GrassStrip({ count = 26 }: { count?: number }) {
  const colors = useThemeColors();
  const blades = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        height: 14 + ((index * 7) % 13),
        delay: (index % 7) * 260,
      })),
    [count]
  );

  return (
    <View pointerEvents="none" style={styles.grassRow}>
      {blades.map((blade, index) => (
        <Blade
          key={index}
          delay={blade.delay}
          height={blade.height}
          color={index % 3 === 0 ? colors.sage : colors.apricot}
        />
      ))}
    </View>
  );
}

function Petal({ index, width, color }: { index: number; width: number; color: string }) {
  const fall = useLoop(9 + (index % 5) * 2.5, index * 900);
  const startX = ((index * 83) % 100) / 100;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        left: startX * width,
        position: 'absolute',
        top: -20,
        opacity: fall.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 0.9, 0.9, 0] }),
        transform: [
          {
            translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, 420] }),
          },
          {
            translateX: fall.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, index % 2 === 0 ? 26 : -26, 0],
            }),
          },
          {
            rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '220deg'] }),
          },
        ],
      }}
    >
      <Svg width={12} height={12} viewBox="0 0 12 12">
        <Path d="M6 0 C 9.5 3, 10 7, 6 12 C 2 7, 2.5 3, 6 0 Z" fill={color} />
      </Svg>
    </Animated.View>
  );
}

/** Petals drifting down over a screen. Used sparingly — a moment, not a texture. */
export function PetalFall({ count = 9 }: { count?: number }) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }, (_, index) => (
        <Petal key={index} index={index} width={width} color={index % 2 === 0 ? colors.petal : colors.accent} />
      ))}
    </View>
  );
}

/**
 * A full scene: washed sky, clouds and hills, with content floating above it.
 * Height is set by the caller so the hills always meet the bottom edge.
 */
export function Landscape({
  children,
  height = 300,
  showPetals = false,
}: {
  children?: ReactNode;
  height?: number;
  showPetals?: boolean;
}) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const part = timeOfDay();
  const [from, to] = skyColors(part, colors);

  return (
    <View style={[styles.scene, { height }]}>
      <LinearGradient colors={[from, to]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      <DriftingClouds width={width} color={colors.surface} />
      {showPetals && <PetalFall count={7} />}
      <Hills width={width} colors={colors} />
      <View style={styles.sceneContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    borderRadius: radius.xl,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sceneContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  hills: {
    bottom: 0,
    position: 'absolute',
  },
  grassRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
