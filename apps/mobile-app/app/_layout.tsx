import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';
import 'react-native-gesture-handler';
import '../global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { useOnboardingStore } from '../store/onboarding';
import { brand } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { authClient } from '../constants/auth-client';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(onboarding)',
};

SplashScreen.preventAutoHideAsync();

// QueryClient must be created outside the component to avoid re-creation on re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const { colors, isDark } = useTheme();

  // Use Better Auth's useSession hook for reactive session state
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const { setSessionData } = useAuthStore();

  const { hasCompletedOnboarding, isLoading: onboardingLoading, checkOnboarding } = useOnboardingStore();
  const segments = useSegments();
  const router = useRouter();
  const hasNavigated = useRef(false);

  useEffect(() => {
    checkOnboarding();
  }, []);

  // Sync Better Auth session into our Zustand store
  useEffect(() => {
    if (!sessionLoading) {
      if (session?.user) {
        setSessionData(
          {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image ?? null,
          },
          true
        );
      } else {
        setSessionData(null, false);
      }
    }
  }, [session, sessionLoading]);

  useEffect(() => {
    if (sessionLoading || onboardingLoading) {
      hasNavigated.current = false;
      return;
    }

    // Prevent duplicate navigations in the same state cycle
    if (hasNavigated.current) return;

    const inOnboarding = segments[0] === '(onboarding)';
    const inAuth = segments[0] === '(auth)';
    const inMain = segments[0] === '(main)';

    const isAuthenticated = !!session?.user;

    // First launch → show onboarding
    if (!hasCompletedOnboarding && !inOnboarding) {
      hasNavigated.current = true;
      router.replace('/(onboarding)');
      return;
    }

    // Onboarding done, not authenticated → show auth
    if (hasCompletedOnboarding && !isAuthenticated && !inAuth) {
      hasNavigated.current = true;
      router.replace('/(auth)/login');
      return;
    }

    // Authenticated → show dashboard
    if (hasCompletedOnboarding && isAuthenticated && !inMain) {
      hasNavigated.current = true;
      router.replace('/(main)');
      return;
    }
  }, [session, sessionLoading, hasCompletedOnboarding, onboardingLoading, segments]);

  // Show loading screen while checking state
  if (sessionLoading || onboardingLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.bg.primary }}>
        <ActivityIndicator size="large" color={brand.orange} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
