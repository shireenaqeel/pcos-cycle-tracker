import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme, type TextStyle } from 'react-native';

import type { ThemeName } from './types';

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
  /** Category tints for check-in tiles, so each thing you log has its own colour. */
  petal: string;
  sage: string;
  apricot: string;
  lilac: string;
  gradientFrom: string;
  gradientTo: string;
}

const PALETTES: Record<ThemeName, { light: ThemeColors; dark: ThemeColors }> = {
  blush: {
    light: {
      background: '#FFF7F3', surface: '#FFFFFF', border: '#F7DCD3',
      text: '#2E1A21', textMuted: '#7E5A64', textFaint: '#BC96A1',
      accent: '#D33C64', accentSoft: '#FFE2E9', onAccent: '#FFFFFF',
      petal: '#FFADBF', sage: '#7FCCA4', apricot: '#FFBC6B', lilac: '#C3A4F0',
      gradientFrom: '#FFD4DC', gradientTo: '#FFE6C7',
    },
    dark: {
      background: '#1B1016', surface: '#2A1922', border: '#452833',
      text: '#FFF0F4', textMuted: '#C9A3B0', textFaint: '#8A6675',
      accent: '#FF7B9D', accentSoft: '#4A2231', onAccent: '#2B0A16',
      petal: '#A8415C', sage: '#2F7A56', apricot: '#9B6228', lilac: '#6B4BA8',
      gradientFrom: '#48202F', gradientTo: '#35223F',
    },
  },
  meadow: {
    light: {
      background: '#F7FCF4', surface: '#FFFFFF', border: '#D8EBCE',
      text: '#1C2E1B', textMuted: '#587055', textFaint: '#9BB596',
      accent: '#1B864D', accentSoft: '#D7F4E1', onAccent: '#FFFFFF',
      petal: '#FFA78F', sage: '#72D39A', apricot: '#FFC95F', lilac: '#9FBDF5',
      gradientFrom: '#CFF3D8', gradientTo: '#FFF1C6',
    },
    dark: {
      background: '#0F170F', surface: '#182418', border: '#2B3F2B',
      text: '#EEFBEC', textMuted: '#A3C2A1', textFaint: '#6B8569',
      accent: '#5FD68C', accentSoft: '#1D3A28', onAccent: '#06200F',
      petal: '#A4503C', sage: '#2E7A50', apricot: '#916A22', lilac: '#3F5C94',
      gradientFrom: '#1B3524', gradientTo: '#2B3318',
    },
  },
  dusk: {
    light: {
      background: '#F8F5FE', surface: '#FFFFFF', border: '#E2DAF7',
      text: '#201936', textMuted: '#625A85', textFaint: '#A096C0',
      accent: '#6341DF', accentSoft: '#E7E0FF', onAccent: '#FFFFFF',
      petal: '#F79AC9', sage: '#73CEC0', apricot: '#FFC477', lilac: '#B49BF7',
      gradientFrom: '#DED5FB', gradientTo: '#FFD6E8',
    },
    dark: {
      background: '#100E1F', surface: '#1A1730', border: '#2E2A4D',
      text: '#F0EDFF', textMuted: '#AAA2D0', textFaint: '#6F6796',
      accent: '#A48CFF', accentSoft: '#2A2352', onAccent: '#120A2E',
      petal: '#8E3C70', sage: '#2C6E68', apricot: '#8E6228', lilac: '#5947A8',
      gradientFrom: '#241E4A', gradientTo: '#3A2142',
    },
  },
  clay: {
    light: {
      background: '#FFF9F1', surface: '#FFFFFF', border: '#F4DFC9',
      text: '#33221A', textMuted: '#7D5F4C', textFaint: '#BC9F86',
      accent: '#C05423', accentSoft: '#FFE4D0', onAccent: '#FFFFFF',
      petal: '#FFAE8D', sage: '#9FC87F', apricot: '#FFBE52', lilac: '#D7A9A0',
      gradientFrom: '#FFDDBE', gradientTo: '#FFEFCB',
    },
    dark: {
      background: '#191009', surface: '#251810', border: '#412B1C',
      text: '#FFF2E4', textMuted: '#C8A587', textFaint: '#8A6B50',
      accent: '#FF8F4D', accentSoft: '#45291A', onAccent: '#2A1205',
      petal: '#A8543A', sage: '#58783E', apricot: '#94661C', lilac: '#8A5A4E',
      gradientFrom: '#452813', gradientTo: '#3A2A14',
    },
  },
};

export const THEME_OPTIONS: { name: ThemeName; label: string; blurb: string }[] = [
  { name: 'blush', label: 'Blush', blurb: 'Warm pinks' },
  { name: 'meadow', label: 'Meadow', blurb: 'Soft greens' },
  { name: 'dusk', label: 'Dusk', blurb: 'Quiet violets' },
  { name: 'clay', label: 'Clay', blurb: 'Earthy terracotta' },
];

const ThemeNameContext = createContext<{
  themeName: ThemeName;
  chooseTheme: (next: ThemeName) => void;
}>({ themeName: 'blush', chooseTheme: () => {} });

/**
 * Holds the chosen palette for the whole tree. The choice lives in the profile
 * row, but it is mirrored in state so tapping a theme repaints immediately
 * rather than after a round trip to SQLite.
 */
export function ThemeProvider({
  initialTheme,
  onChange,
  children,
}: {
  initialTheme: ThemeName | null;
  onChange: (next: ThemeName) => void;
  children: ReactNode;
}) {
  const [themeName, setThemeName] = useState<ThemeName>(initialTheme ?? 'blush');

  const value = useMemo(
    () => ({
      themeName,
      chooseTheme: (next: ThemeName) => {
        setThemeName(next);
        onChange(next);
      },
    }),
    [themeName, onChange]
  );

  return <ThemeNameContext.Provider value={value}>{children}</ThemeNameContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeNameContext);
}

export function paletteFor(themeName: ThemeName, dark: boolean): ThemeColors {
  return dark ? PALETTES[themeName].dark : PALETTES[themeName].light;
}

export function useThemeColors(): ThemeColors {
  const { themeName } = useTheme();
  return paletteFor(themeName, useColorScheme() === 'dark');
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
/**
 * Quicksand carries the headings — geometric but rounded, which is the whole
 * point of this direction — and Nunito the reading text, where Quicksand's
 * wide letterforms get tiring. Weights are baked into the family name because
 * that is how the loaded fonts are addressed; `fontWeight` would silently do
 * nothing.
 */
export const fonts = {
  displayBold: 'Quicksand_700Bold',
  displayMedium: 'Quicksand_600SemiBold',
  body: 'Nunito_400Regular',
  bodyMedium: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
};

export const typography = {
  /** The cycle-day number on Today, and nothing else. */
  display: { fontFamily: fonts.displayBold, fontSize: 56, lineHeight: 62, letterSpacing: -1.5 },
  /** Headline figures: a hit rate, a cycle-length range. */
  metric: { fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  /** Screen-level titles. */
  title: { fontFamily: fonts.displayBold, fontSize: 25, lineHeight: 32, letterSpacing: -0.4 },
  /** Section headings and the line under the ring. */
  heading: { fontFamily: fonts.displayMedium, fontSize: 18, lineHeight: 25 },
  /** Card titles, option labels, button text. */
  strong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 23 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23 },
  bodySmall: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  /**
   * Section labels. Sentence case on purpose — a wall of tiny uppercase
   * headings is the single most generic thing a screen can do.
   */
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18, letterSpacing: 0.2 },
  /** Footnotes, citations, disclaimers. */
  micro: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
} as const satisfies Record<string, TextStyle>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
};
