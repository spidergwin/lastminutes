import React from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { brand, radius, shadows, gc } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'elevated' | 'accent';
  style?: ViewStyle;
  noPadding?: boolean;
}

export function Card({ children, variant = 'default', style, noPadding = false }: CardProps) {
  const { colors, gradients } = useTheme();
  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: colors.bg.secondary,
      borderColor: colors.surface.cardBorder,
      borderWidth: 1,
    },
    glass: {
      backgroundColor: colors.surface.card,
      borderColor: colors.surface.glassBorder,
      borderWidth: 1,
    },
    elevated: {
      backgroundColor: colors.bg.tertiary,
      borderColor: colors.border.subtle,
      borderWidth: 1,
      ...shadows.md,
    },
    accent: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
    },
  };

  if (variant === 'accent') {
    return (
      <LinearGradient
        colors={gc(gradients.brandSubtle)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="overflow-hidden"
        style={[
          { borderRadius: radius.xl },
          !noPadding && { padding: 16 },
          { borderWidth: 1, borderColor: brand.orangeMuted },
          style,
        ]}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View
      className="overflow-hidden"
      style={[
        { borderRadius: radius.xl },
        variantStyles[variant],
        !noPadding && { padding: 16 },
        style,
      ]}
    >
      {children}
    </View>
  );
}
