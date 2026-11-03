import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput as RNTextInput, Text, Animated, ViewStyle, TextInputProps as RNTextInputProps, Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { typography, radius, spacing, brand, Colors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

interface InputProps extends Omit<RNTextInputProps, 'style'> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  icon,
  error,
  value,
  onFocus,
  onBlur,
  secureTextEntry,
  containerStyle,
  ...rest
}: InputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelTop = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 6],
  });

  const labelSize = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [typography.size.base, typography.size.xs],
  });

  const labelColor = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.text.tertiary, isFocused ? brand.orange : colors.text.secondary],
  });

  const isSecure = secureTextEntry && !isPasswordVisible;

  return (
    <View style={containerStyle}>
      <View
        className="flex-row items-center"
        style={[
          {
            backgroundColor: colors.bg.input,
            borderRadius: radius.lg,
            borderWidth: 1.5,
            borderColor: colors.border.default,
            paddingHorizontal: spacing.base,
            minHeight: 58,
          },
          isFocused && {
            borderColor: brand.orange,
            backgroundColor: colors.bg.secondary,
          },
          error ? { borderColor: colors.error } : undefined,
        ]}
      >
        {icon && <View className="opacity-60" style={{ marginRight: spacing.md }}>{icon}</View>}

        <View className="flex-1 justify-center" style={{ height: 58 }}>
          <Animated.Text
            className="absolute"
            style={{
              top: labelTop,
              fontSize: labelSize,
              color: labelColor,
              fontFamily: typography.fontFamily.medium,
              letterSpacing: typography.letterSpacing.wide,
            }}
            pointerEvents="none"
          >
            {label}
          </Animated.Text>

          <RNTextInput
            className="flex-1"
            style={[
              {
                color: colors.text.primary,
                fontFamily: typography.fontFamily.regular,
                fontSize: typography.size.base,
                paddingTop: 14,
              },
              icon ? undefined : { paddingLeft: 0 },
            ]}
            value={value}
            placeholderTextColor="transparent"
            secureTextEntry={isSecure}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            {...rest}
          />
        </View>

        {/* Password visibility toggle */}
        {secureTextEntry && (
          <Pressable
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={{ padding: spacing.sm, marginLeft: spacing.xs }}
            hitSlop={8}
          >
            {isPasswordVisible ? (
              <EyeOff size={18} color={colors.text.tertiary} strokeWidth={1.5} />
            ) : (
              <Eye size={18} color={colors.text.tertiary} strokeWidth={1.5} />
            )}
          </Pressable>
        )}
      </View>

      {error && (
        <Text
          style={{
            color: colors.error,
            fontSize: typography.size.xs,
            fontFamily: typography.fontFamily.medium,
            marginTop: spacing.xs,
            marginLeft: spacing.xs,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
