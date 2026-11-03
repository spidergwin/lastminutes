import React from 'react';
import { View, Text } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { typography, spacing, radius, brand, Colors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

interface OfflineBannerProps {
  visible: boolean;
  pendingCount?: number;
}

export function OfflineBanner({ visible, pendingCount = 0 }: OfflineBannerProps) {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <View
      className="flex-row items-center justify-center"
      style={{
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(245, 158, 11, 0.15)',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.base,
        gap: spacing.sm,
      }}
    >
      <View
        className="items-center justify-center"
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
        }}
      >
        <WifiOff size={14} color={colors.warning} />
      </View>
      <Text
        style={{
          color: colors.warning,
          fontSize: typography.size.xs,
          fontFamily: typography.fontFamily.medium,
          letterSpacing: typography.letterSpacing.wide,
        }}
      >
        You're offline
        {pendingCount > 0 && ` · ${pendingCount} recording${pendingCount > 1 ? 's' : ''} pending`}
      </Text>
    </View>
  );
}

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'accent';
  size?: 'sm' | 'md';
}

export function Badge({ label, variant = 'default', size = 'sm' }: BadgeProps) {
  const { colors } = useTheme();
  const variantColors = {
    default: { bg: colors.overlay.light, text: colors.text.secondary },
    success: { bg: 'rgba(34,197,94,0.12)', text: colors.success },
    warning: { bg: 'rgba(245,158,11,0.12)', text: colors.warning },
    error: { bg: 'rgba(239,68,68,0.12)', text: colors.error },
    accent: { bg: brand.orangeMuted, text: brand.orange },
  };

  const c = variantColors[variant];

  return (
    <View
      className="self-start"
      style={[
        {
          borderRadius: radius.full,
          backgroundColor: c.bg,
        },
        size === 'sm'
          ? { paddingHorizontal: 8, paddingVertical: 3 }
          : { paddingHorizontal: 12, paddingVertical: 5 },
      ]}
    >
      <Text
        className="uppercase"
        style={[
          {
            color: c.text,
            fontFamily: typography.fontFamily.semibold,
            letterSpacing: typography.letterSpacing.wider,
          },
          size === 'sm' ? { fontSize: 9 } : { fontSize: typography.size.xs },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}
