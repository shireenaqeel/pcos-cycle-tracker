import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

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
