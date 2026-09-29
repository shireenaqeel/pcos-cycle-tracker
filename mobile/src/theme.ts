import { useMemo } from 'react';
import { useColorScheme, type TextStyle } from 'react-native';

export interface ThemeColors {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
}

const lightColors: ThemeColors = {
  background: '#FBF7F9',
  surface: '#FFFFFF',
  border: '#EADFE4',
  text: '#241B20',
  textMuted: '#7B6B73',
  textFaint: '#B6A7AE',
  accent: '#A63D62',
  accentSoft: '#F6E7ED',
  onAccent: '#FFFFFF',
};

const darkColors: ThemeColors = {
  background: '#141014',
  surface: '#1E181D',
  border: '#352B32',
  text: '#F4ECF0',
  textMuted: '#B4A3AD',
  textFaint: '#776871',
  // Lightened so it carries contrast against a dark ground; the light accent
  // would read as muddy here.
  accent: '#EB8FB1',
  accentSoft: '#3B2630',
  onAccent: '#24121B',
};

export function useThemeColors(): ThemeColors {
  return useColorScheme() === 'dark' ? darkColors : lightColors;
}

/**
 * Builds a screen's stylesheet from the active palette, rebuilding it only when
 * the palette changes. Pass a module-level factory so its identity is stable.
 */
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const colors = useThemeColors();
  return useMemo(() => factory(colors), [colors, factory]);
}

/**
 * One role per job, rather than a new font size per screen. Compose as
 * `{ ...typography.body, color: colors.text }` and override weight only where a
 * specific instance genuinely differs.
 */
export const typography = {
  /** The cycle-day number on Today, and nothing else. */
  display: { fontSize: 54, fontWeight: '800', lineHeight: 60, letterSpacing: -1 },
  /** Headline figures: a hit rate, a cycle-length range. */
  metric: { fontSize: 28, fontWeight: '700', lineHeight: 34, letterSpacing: -0.4 },
  /** Screen-level titles. */
  title: { fontSize: 24, fontWeight: '700', lineHeight: 30, letterSpacing: -0.3 },
  /** Section headings and the line under the ring. */
  heading: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  /** Card titles, option labels, button text. */
  strong: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodySmall: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 19 },
  /** Small uppercase label above a card's contents. */
  overline: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.7,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  /** Footnotes, citations, disclaimers. */
  micro: { fontSize: 12, fontWeight: '400', lineHeight: 17 },
} as const satisfies Record<string, TextStyle>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
};
