import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/theme';
import { darkColors, lightColors, darkGradients, lightGradients, Colors, Gradients } from '../constants/theme';

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const themePreference = useThemeStore((state) => state.themePreference);

  // Determine actual theme mode
  const isDark =
    themePreference === 'dark' || (themePreference === 'system' && systemColorScheme === 'dark');

  // Resolve active tokens
  const colors: Colors = isDark ? darkColors : lightColors;
  const gradients: Gradients = isDark ? darkGradients : lightGradients;

  return {
    colors,
    gradients,
    isDark,
    themePreference,
  };
}
