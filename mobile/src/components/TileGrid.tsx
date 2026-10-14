import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { TrackerOption } from '../content/trackers';
import { tapFeedback } from '../lib/feedback';
import {
  radius,
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
  type ThemeColors,
} from '../theme';

/**
 * A pictogram tile per option, four to a row.
 *
 * This replaced rows of identical text pills, which is the shape that made the
 * logging sheet unscannable: thirty chips differ only by the word inside them,
 * so finding "cramps" meant reading rather than looking. With an icon the shape
 * is the thing you recognise, and the label becomes confirmation.
 */
export function Tile<T extends string>({
  option,
  selected,
  tint,
  onPress,
}: {
  option: TrackerOption<T>;
  selected: boolean;
  tint: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const scale = useRef(new Animated.Value(1)).current;

  function animate(to: number) {
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 50, bounciness: 10 }).start();
  }

  return (
    <Pressable
      style={styles.slot}
      onPressIn={() => animate(0.92)}
      onPressOut={() => animate(1)}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
    >
      <Animated.View style={{ alignItems: 'center', transform: [{ scale }] }}>
        <View
          style={[
            styles.disc,
            { backgroundColor: selected ? tint : colors.background },
            selected && { borderColor: tint },
          ]}
        >
          <MaterialCommunityIcons
            name={option.icon}
            size={24}
            color={selected ? colors.text : colors.textMuted}
          />
        </View>
        <Text
          numberOfLines={2}
          style={[styles.label, selected && { color: colors.text }]}
        >
          {option.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function TileGrid<T extends string>({
  options,
  selected,
  tint,
  onToggle,
}: {
  options: TrackerOption<T>[];
  selected: T[];
  tint: string;
  onToggle: (value: T) => void;
}) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.grid}>
      {options.map((option) => (
        <Tile
          key={option.value}
          option={option}
          tint={tint}
          selected={selected.includes(option.value)}
          onPress={() => onToggle(option.value)}
        />
      ))}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: spacing.md,
    },
    // Quarter width so four sit per row at any phone size, rather than wrapping
    // unevenly the way pills of differing text length do.
    slot: {
      alignItems: 'center',
      width: '25%',
    },
    disc: {
      alignItems: 'center',
      borderColor: 'transparent',
      borderRadius: radius.pill,
      borderWidth: 2,
      height: 54,
      justifyContent: 'center',
      width: 54,
    },
    label: {
      ...typography.micro,
      color: colors.textMuted,
      marginTop: spacing.xs,
      paddingHorizontal: 2,
      textAlign: 'center',
    },
  });
