import { create } from 'zustand';
import { authClient } from '../constants/auth-client';

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  checkAuth: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  setSessionData: (user: User | null, isAuthenticated: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,

  setSessionData: (user, isAuthenticated) => {
    set({ user, isAuthenticated, isLoading: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });

    try {
      const { data: session, error } = await authClient.getSession();

      if (session?.user) {
        set({
          isAuthenticated: true,
          isLoading: false,
          user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image ?? null,
          },
        });
        return;
      }

      set({ isAuthenticated: false, isLoading: false, user: null });
    } catch {
      set({ isAuthenticated: false, isLoading: false, user: null });
    }
  },

  signInWithEmail: async (email, password) => {
    try {
      set({ isLoading: true });

      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });

      if (error) {
        set({ isLoading: false });
        return { success: false, error: error.message || 'Invalid credentials' };
      }

      if (data?.user) {
        set({
          isAuthenticated: true,
          isLoading: false,
          user: {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            image: data.user.image ?? null,
          },
        });
        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, error: 'Sign in failed' };
    } catch (error: any) {
      set({ isLoading: false });
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  },

  signUp: async (name, email, password) => {
    try {
      set({ isLoading: true });

      const { data, error } = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (error) {
        set({ isLoading: false });
        return { success: false, error: error.message || 'Registration failed' };
      }

      if (data?.user) {
        set({
          isAuthenticated: true,
          isLoading: false,
          user: {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            image: data.user.image ?? null,
          },
        });
        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, error: 'Registration failed' };
    } catch (error: any) {
      set({ isLoading: false });
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  },

  signOut: async () => {
    try {
      await authClient.signOut();
    } finally {
      set({ isAuthenticated: false, user: null });
    }
  },
}));
