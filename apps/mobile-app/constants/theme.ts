/**
 * Last Minutes — Design System Tokens
 *
 * Premium design system with light and dark mode support.
 */

// ─── Brand Colors ────────────────────────────────────────────────
export const brand = {
  orange: '#F97316', // hsl(25 95% 53%)
  orangeLight: '#FB923C',
  orangeDark: '#EA580C',
  orangeMuted: 'rgba(249, 115, 22, 0.15)',
  orangeGlow: 'rgba(249, 115, 22, 0.25)',
};

// ─── Dark Theme Palette ──────────────────────────────────────────
export const darkColors = {
  bg: {
    primary: '#0B0A09', // hsl(20 10% 4%)
    secondary: '#141211', // hsl(20 10% 7%)
    tertiary: '#22201F', // hsl(20 5% 13%)
    elevated: '#141211',
    input: '#2A2827', // hsl(20 5% 16%)
  },
  surface: {
    card: '#141211',
    cardBorder: '#2A2827',
    glass: 'rgba(20, 18, 17, 0.8)',
    glassBorder: 'rgba(42, 40, 39, 0.5)',
    hover: '#2A2827',
  },
  text: {
    primary: '#F5F5F5', // hsl(0 0% 96%)
    secondary: '#908D8A', // hsl(20 4% 55%)
    tertiary: '#6B6967', // hsl(20 4% 40%)
    muted: '#6B6967',
    inverse: '#0B0A09',
  },
  accent: {
    orange: '#FA812F', // hsl(25 95% 58%)
    blue: '#3B82F6',
    green: '#22C55E',
    red: '#EF4444',
    purple: '#A855F7',
    cyan: '#06B6D4',
    amber: '#F59E0B',
  },
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  border: {
    default: '#2A2827', // hsl(20 5% 16%)
    subtle: '#22201F', // hsl(20 5% 13%)
    strong: '#3A3837',
    focus: '#FA812F',
  },
  overlay: {
    light: 'rgba(255, 255, 255, 0.04)',
    medium: 'rgba(0, 0, 0, 0.5)',
    heavy: 'rgba(0, 0, 0, 0.8)',
  },
  // Drawer-specific
  drawer: {
    background: '#0B0A09',
    headerBg: '#141211',
    itemActive: 'rgba(250, 129, 47, 0.12)',
    itemHover: 'rgba(255, 255, 255, 0.04)',
    separator: '#2A2827',
  },
  // Record screen orb
  record: {
    orbCore: '#FA812F',
    orbGlow: 'rgba(250, 129, 47, 0.35)',
    orbRing1: 'rgba(250, 129, 47, 0.15)',
    orbRing2: 'rgba(250, 129, 47, 0.08)',
    orbRing3: 'rgba(250, 129, 47, 0.04)',
    waveform: 'rgba(250, 129, 47, 0.6)',
    waveformBg: 'rgba(255, 255, 255, 0.06)',
    canvasBg: '#0B0A09',
    controlBar: 'rgba(20, 18, 17, 0.9)',
    controlBorder: '#2A2827',
    aurora1: '#1E40AF',
    aurora2: '#7C3AED',
    statusPillBg: 'rgba(255, 255, 255, 0.08)',
    statusPillText: 'rgba(255, 255, 255, 0.5)',
    statusDot: 'rgba(255, 255, 255, 0.3)',
    topBarIcon: 'rgba(255, 255, 255, 0.7)',
    timerText: '#FFFFFF',
    hintText: 'rgba(255, 255, 255, 0.4)',
    buttonBg: 'rgba(255, 255, 255, 0.1)',
    buttonBgCenter: 'rgba(255, 255, 255, 0.15)',
  },
};

// ─── Light Theme Palette ──────────────────────────────────────────
export const lightColors = {
  bg: {
    primary: '#FFFFFF', // hsl(0 0% 100%)
    secondary: '#FFFFFF',
    tertiary: '#F6F5F4', // hsl(30 5% 96%)
    elevated: '#FFFFFF',
    input: '#F6F5F4',
  },
  surface: {
    card: '#FFFFFF',
    cardBorder: '#E8E6E4', // hsl(30 6% 90%)
    glass: 'rgba(255, 255, 255, 0.7)',
    glassBorder: 'rgba(232, 230, 228, 0.5)',
    hover: 'rgba(0, 0, 0, 0.03)',
  },
  text: {
    primary: '#110F0E', // hsl(20 10% 6%)
    secondary: '#787472', // hsl(20 4% 46%)
    tertiary: '#94A3B8',
    muted: '#94A3B8',
    inverse: '#FFFFFF',
  },
  accent: {
    orange: '#F97316', // hsl(25 95% 53%)
    blue: '#2563EB',
    green: '#16A34A',
    red: '#DC2626',
    purple: '#9333EA',
    cyan: '#0891B2',
    amber: '#D97706',
  },
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
  border: {
    default: '#E8E6E4',
    subtle: '#F6F5F4',
    strong: '#D1CFCD',
    focus: '#F97316',
  },
  overlay: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.3)',
    heavy: 'rgba(0, 0, 0, 0.6)',
  },
  // Drawer-specific
  drawer: {
    background: '#FFFFFF',
    headerBg: '#FFFFFF',
    itemActive: 'rgba(249, 115, 22, 0.08)',
    itemHover: 'rgba(0, 0, 0, 0.03)',
    separator: '#E8E6E4',
  },
  // Record screen orb
  record: {
    orbCore: '#F97316',
    orbGlow: 'rgba(249, 115, 22, 0.20)',
    orbRing1: 'rgba(249, 115, 22, 0.10)',
    orbRing2: 'rgba(249, 115, 22, 0.06)',
    orbRing3: 'rgba(249, 115, 22, 0.03)',
    waveform: 'rgba(249, 115, 22, 0.5)',
    waveformBg: 'rgba(0, 0, 0, 0.06)',
    canvasBg: '#F6F5F4',
    controlBar: 'rgba(255, 255, 255, 0.95)',
    controlBorder: '#E8E6E4',
    aurora1: 'rgba(59, 130, 246, 0.08)',
    aurora2: 'rgba(124, 58, 237, 0.06)',
    statusPillBg: 'rgba(0, 0, 0, 0.05)',
    statusPillText: 'rgba(0, 0, 0, 0.5)',
    statusDot: 'rgba(0, 0, 0, 0.2)',
    topBarIcon: 'rgba(0, 0, 0, 0.5)',
    timerText: '#110F0E',
    hintText: 'rgba(0, 0, 0, 0.4)',
    buttonBg: 'rgba(0, 0, 0, 0.06)',
    buttonBgCenter: 'rgba(0, 0, 0, 0.08)',
  },
};

export type Colors = typeof darkColors;

// ─── Gradients ───────────────────────────────────────────────────
export type GradientTuple = readonly [string, string, ...string[]];

/**
 * Cast a GradientTuple to the type expo-linear-gradient's `colors` prop expects.
 * Use instead of `[...gradients.xxx]` which loses tuple type info.
 */
export function gc(tuple: GradientTuple): readonly [string, string, ...string[]] {
  return tuple;
}

export interface Gradients {
  brandPrimary: GradientTuple;
  brandSubtle: GradientTuple;
  cardGlass: GradientTuple;
  darkFade: GradientTuple;
  onboarding1: GradientTuple;
  onboarding2: GradientTuple;
  onboarding3: GradientTuple;
  recordBg: GradientTuple;
  drawerHeader: GradientTuple;
}

export const darkGradients: Gradients = {
  brandPrimary: ['#F59E0B', '#EA580C'],
  brandSubtle: ['rgba(249, 115, 22, 0.2)', 'rgba(249, 115, 22, 0.05)'],
  cardGlass: ['rgba(20, 18, 17, 0.9)', 'rgba(20, 18, 17, 0.6)'],
  darkFade: ['#0B0A09', 'transparent'],
  onboarding1: ['#0B0A09', '#141211', '#1A1040'],
  onboarding2: ['#0B0A09', '#141211', '#0D1A2D'],
  onboarding3: ['#0B0A09', '#141211', '#0F2318'],
  recordBg: ['#0B0A09', '#141211', '#1B1A19'],
  drawerHeader: ['#0B0A09', '#141211'],
};

export const lightGradients: Gradients = {
  brandPrimary: ['#F59E0B', '#EA580C'],
  brandSubtle: ['rgba(249, 115, 22, 0.1)', 'rgba(249, 115, 22, 0.02)'],
  cardGlass: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.6)'],
  darkFade: ['#FFFFFF', 'transparent'],
  onboarding1: ['#FFFFFF', '#F6F5F4', '#F3F0FF'],
  onboarding2: ['#FFFFFF', '#F6F5F4', '#EFF6FF'],
  onboarding3: ['#FFFFFF', '#F6F5F4', '#F0FDF4'],
  recordBg: ['#F6F5F4', '#FFFFFF', '#FFFFFF'],
  drawerHeader: ['#FFFFFF', '#F6F5F4'],
};

// ─── Typography ──────────────────────────────────────────────────
export const typography = {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extrabold: 'Inter_800ExtraBold',
  },

  size: {
    xs: 12,
    sm: 14,
    base: 16,
    md: 18,
    lg: 22,
    xl: 28,
    '2xl': 34,
    '3xl': 40,
    '4xl': 52,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },

  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1.0,
    widest: 2.0,
  },
} as const;

// ─── Spacing ─────────────────────────────────────────────────────
export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  base: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
  '5xl': 80,
} as const;

// ─── Border Radius ───────────────────────────────────────────────
export const radius = {
  sm: 6, // var(--radius-sm)
  md: 8, // var(--radius-md)
  lg: 10, // var(--radius-lg)
  xl: 14,
  '2xl': 20,
  full: 9999,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  glow: {
    shadowColor: brand.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// ─── Animation Durations ─────────────────────────────────────────
export const animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
} as const;
