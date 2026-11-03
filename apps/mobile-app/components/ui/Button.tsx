import React from 'react';
import { Pressable, Text, ActivityIndicator, ViewStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { brand, typography, radius, shadows, gc } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  style,
}: ButtonProps) {
  const { colors, gradients } = useTheme();
  const isDisabled = disabled || loading;

  const sizeStyles = {
    sm: { height: 40, paddingHorizontal: 16, fontSize: typography.size.sm },
    md: { height: 52, paddingHorizontal: 24, fontSize: typography.size.base },
    lg: { height: 58, paddingHorizontal: 32, fontSize: typography.size.md },
  };

  const currentSize = sizeStyles[size];

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        className="justify-center overflow-hidden"
        style={({ pressed }) => [
          { height: currentSize.height, width: fullWidth ? '100%' : undefined },
          pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          isDisabled && { opacity: 0.5 },
          style,
        ]}
      >
        <LinearGradient
          colors={isDisabled ? ['#6B7280', '#4B5563'] : gc(gradients.brandPrimary)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="flex-1 flex-row items-center justify-center"
          style={[
            { height: currentSize.height, borderRadius: radius.lg, gap: 8 },
            shadows.glow,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View className="flex-row items-center justify-center">
              {icon && iconPosition === 'left' && <View className="mr-2">{icon}</View>}
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: currentSize.fontSize,
                  fontFamily: typography.fontFamily.semibold,
                  letterSpacing: typography.letterSpacing.wide,
                }}
              >
                {title}
              </Text>
              {icon && iconPosition === 'right' && <View className="ml-2">{icon}</View>}
            </View>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  const variantStyles: Record<string, { bg: string; border: string; textColor: string }> = {
    secondary: {
      bg: colors.surface.card,
      border: colors.border.strong,
      textColor: colors.text.primary,
    },
    outline: {
      bg: colors.bg.primary,
      border: colors.border.strong,
      textColor: colors.text.primary,
    },
    ghost: {
      bg: 'transparent',
      border: 'transparent',
      textColor: brand.orange,
    },
    danger: {
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.2)',
      textColor: colors.error,
    },
  };

  const vs = variantStyles[variant] || variantStyles.secondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className="justify-center overflow-hidden"
      style={({ pressed }) => [
        {
          height: currentSize.height,
          width: fullWidth ? '100%' : undefined,
          backgroundColor: vs.bg,
          borderWidth: 1,
          borderColor: vs.border,
          borderRadius: radius.lg,
          paddingHorizontal: currentSize.paddingHorizontal,
        },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={vs.textColor} size="small" />
      ) : (
        <View className="flex-row items-center justify-center">
          {icon && iconPosition === 'left' && <View className="mr-2">{icon}</View>}
          <Text
            style={{
              color: vs.textColor,
              fontSize: currentSize.fontSize,
              fontFamily: typography.fontFamily.semibold,
              letterSpacing: typography.letterSpacing.normal,
            }}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && <View className="ml-2">{icon}</View>}
        </View>
      )}
    </Pressable>
  );
}
