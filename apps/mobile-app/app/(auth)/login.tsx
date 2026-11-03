import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Mic, ArrowRight } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuthStore } from '../../store/auth';
import { router } from 'expo-router';
import { authClient } from '../../constants/auth-client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand, typography, spacing, radius, shadows } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

const GoogleIcon = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </Svg>
);

export default function LoginScreen() {
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signInWithEmail, isLoading, checkAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    const result = await signInWithEmail(email, password);
    if (result.success) {
      router.replace('/(main)');
    } else {
      setError(result.error || 'Failed to sign in');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setError(null);

      const { error: oauthError } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/(main)',
      });

      if (oauthError) {
        setError(oauthError.message || 'Authentication failed. Please try again.');
        return;
      }

      await checkAuth();
      router.replace('/(main)');
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google Sign In');
      console.error('Google Sign In error:', err);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg.primary }}>
      <LinearGradient
        colors={[colors.bg.primary, colors.bg.secondary, colors.bg.primary]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: spacing['2xl'],
            paddingTop: Math.max(insets.top + spacing.xl, spacing['4xl']),
            paddingBottom: Math.max(insets.bottom, spacing['4xl']),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header — matches web's left panel feel */}
          <View className="items-center" style={{ marginBottom: spacing['2xl'] }}>
            <View style={[{ marginBottom: spacing.lg }, shadows.glow]}>
              <LinearGradient
                colors={[...gradients.brandPrimary]}
                className="items-center justify-center"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radius.lg,
                }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Mic size={24} color="#fff" strokeWidth={2} />
              </LinearGradient>
            </View>

            <Text
              style={{
                fontSize: typography.size.xl,
                fontFamily: typography.fontFamily.bold,
                color: colors.text.primary,
                letterSpacing: typography.letterSpacing.tight,
                marginBottom: spacing.xs,
              }}
            >
              Welcome Back
            </Text>
            <Text
              className="text-center"
              style={{
                fontSize: typography.size.sm,
                fontFamily: typography.fontFamily.regular,
                color: colors.text.secondary,
              }}
            >
              Sign in to your Last Minutes account
            </Text>
          </View>

          {/* Google OAuth — first, like the web */}
          <Button
            title="Continue with Google"
            onPress={handleGoogleSignIn}
            variant="outline"
            loading={isGoogleLoading}
            disabled={isLoading}
            icon={<GoogleIcon />}
            iconPosition="left"
          />

          {/* Divider */}
          <View className="flex-row items-center" style={{ marginVertical: spacing.xl }}>
            <View className="flex-1" style={{ height: 1, backgroundColor: colors.border.default }} />
            <Text
              style={{
                color: colors.text.muted,
                fontSize: 10,
                fontFamily: typography.fontFamily.semibold,
                letterSpacing: typography.letterSpacing.wider,
                marginHorizontal: spacing.md,
              }}
            >
              OR CONTINUE WITH EMAIL
            </Text>
            <View className="flex-1" style={{ height: 1, backgroundColor: colors.border.default }} />
          </View>

          {/* Email Form */}
          <View>
            <Input
              label="Email"
              icon={<Mail size={18} color={colors.text.tertiary} />}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <Input
              label="Password"
              icon={<Lock size={18} color={colors.text.tertiary} />}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              containerStyle={{ marginTop: spacing.base }}
            />

            {/* Forgot Password */}
            <Pressable className="self-end" style={{ marginTop: spacing.sm }} onPress={() => {}}>
              <Text
                style={{
                  color: colors.text.tertiary,
                  fontSize: typography.size.xs,
                  fontFamily: typography.fontFamily.medium,
                }}
              >
                Forgot password?
              </Text>
            </Pressable>

            {error && (
              <View
                style={{
                  marginTop: spacing.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: 'rgba(239, 68, 68, 0.15)',
                }}
              >
                <Text
                  className="text-center"
                  style={{
                    color: colors.error,
                    fontSize: typography.size.sm,
                    fontFamily: typography.fontFamily.medium,
                  }}
                >
                  {error}
                </Text>
              </View>
            )}

            <View style={{ marginTop: spacing.lg }}>
              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={isLoading}
                disabled={isGoogleLoading}
              />
            </View>
          </View>

          {/* Sign Up Link */}
          <View className="flex-row justify-center items-center" style={{ marginTop: spacing['2xl'] }}>
            <Text
              style={{
                color: colors.text.tertiary,
                fontSize: typography.size.sm,
                fontFamily: typography.fontFamily.regular,
              }}
            >
              Don't have an account?
            </Text>
            <Pressable onPress={() => router.push('/(auth)/signup')}>
              <Text
                style={{
                  color: brand.orange,
                  fontSize: typography.size.sm,
                  fontFamily: typography.fontFamily.semibold,
                }}
              >
                {' '}Sign Up
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
