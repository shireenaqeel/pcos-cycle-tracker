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
      background: '#FDF6F3', surface: '#FFFFFF', border: '#F0E2DD',
      text: '#33242B', textMuted: '#8A7078', textFaint: '#BFA9AF',
      accent: '#C4577B', accentSoft: '#FBE8EC', onAccent: '#FFFFFF',
      petal: '#F7C9CF', sage: '#BFD3C1', apricot: '#F6D6B8', lilac: '#D8CDEB',
      gradientFrom: '#FCE4E6', gradientTo: '#EFE2F3',
    },
    dark: {
      background: '#171216', surface: '#221A20', border: '#392D35',
      text: '#F6EDF0', textMuted: '#B6A2AB', textFaint: '#7C6A73',
      accent: '#F0A0BC', accentSoft: '#3D2A33', onAccent: '#24121B',
      petal: '#6B4450', sage: '#4C6151', apricot: '#6E523C', lilac: '#544A6B',
      gradientFrom: '#31212A', gradientTo: '#272036',
    },
  },
  meadow: {
    light: {
      background: '#F4F8F2', surface: '#FFFFFF', border: '#DDE9DA',
      text: '#22301F', textMuted: '#67796A', textFaint: '#A3B4A4',
      accent: '#4C8055', accentSoft: '#E2F0E3', onAccent: '#FFFFFF',
      petal: '#F3CFC6', sage: '#BFD9BD', apricot: '#F1DFB4', lilac: '#CBD8E8',
      gradientFrom: '#E3F1E2', gradientTo: '#F2EEDC',
    },
    dark: {
      background: '#121711', surface: '#1B2219', border: '#2D3A2B',
      text: '#ECF3EA', textMuted: '#A3B4A2', textFaint: '#6D7D6C',
      accent: '#8CC493', accentSoft: '#25331F', onAccent: '#132015',
      petal: '#5E4640', sage: '#3C5540', apricot: '#5E5436', lilac: '#3C4859',
      gradientFrom: '#1D2A1E', gradientTo: '#25281C',
    },
  },
  dusk: {
    light: {
      background: '#F5F4FB', surface: '#FFFFFF', border: '#E2DFF0',
      text: '#262338', textMuted: '#6C6785', textFaint: '#A6A1BE',
      accent: '#5B53A6', accentSoft: '#E8E5F7', onAccent: '#FFFFFF',
      petal: '#DCC9EB', sage: '#C2D6E4', apricot: '#EBD6C6', lilac: '#CFC9EE',
      gradientFrom: '#E6E2F6', gradientTo: '#DCE7F3',
    },
    dark: {
      background: '#121120', surface: '#1B1930', border: '#2C2945',
      text: '#EEECFA', textMuted: '#A8A3C4', textFaint: '#6F6A8C',
      accent: '#A99CF2', accentSoft: '#272348', onAccent: '#14112A',
      petal: '#4A3A5C', sage: '#374A5B', apricot: '#5A4838', lilac: '#443D68',
      gradientFrom: '#221E3D', gradientTo: '#1C2438',
    },
  },
  clay: {
    light: {
      background: '#FBF5F0', surface: '#FFFFFF', border: '#EEE0D4',
      text: '#33261D', textMuted: '#8A7362', textFaint: '#BCA795',
      accent: '#B05F38', accentSoft: '#F8E7DB', onAccent: '#FFFFFF',
      petal: '#F0C9B4', sage: '#C9D3BA', apricot: '#F3D9AE', lilac: '#DCCBC2',
      gradientFrom: '#F8E3D4', gradientTo: '#EFE7D5',
    },
    dark: {
      background: '#17120E', surface: '#221A15', border: '#392C23',
      text: '#F6EEE7', textMuted: '#BAA595', textFaint: '#7E6B5C',
      accent: '#E39468', accentSoft: '#3B2A20', onAccent: '#241509',
      petal: '#6A4634', sage: '#4C5540', apricot: '#6B5533', lilac: '#584740',
      gradientFrom: '#33231A', gradientTo: '#2B2519',
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
