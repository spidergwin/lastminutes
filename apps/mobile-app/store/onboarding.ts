import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'last_minutes_onboarding_complete';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  checkOnboarding: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasCompletedOnboarding: false,
  isLoading: true,

  checkOnboarding: async () => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      set({ hasCompletedOnboarding: value === 'true', isLoading: false });
    } catch {
      set({ hasCompletedOnboarding: false, isLoading: false });
    }
  },

  completeOnboarding: async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      set({ hasCompletedOnboarding: true });
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
  },

  resetOnboarding: async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_KEY);
      set({ hasCompletedOnboarding: false });
    } catch (error) {
      console.error('Error resetting onboarding state:', error);
    }
  },
}));
