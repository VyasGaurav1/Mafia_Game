/**
 * Auth Store (Zustand)
 * Manages authentication state separate from game state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, UserProfile } from '@/services/authService';

interface AuthState {
  // User data
  user: UserProfile | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, displayName?: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  playAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  setUser: (user: UserProfile | null) => void;

  // Initialize from stored auth
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      isAuthenticated: false,
      isGuest: false,
      isLoading: false,
      error: null,

      login: async (emailOrUsername, password) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = await authService.login(emailOrUsername, password);
          set({
            user,
            isAuthenticated: true,
            isGuest: false,
            isLoading: false
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      register: async (username, email, password, displayName) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = await authService.register(username, email, password, displayName);
          set({
            user,
            isAuthenticated: true,
            isGuest: false,
            isLoading: false
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      googleLogin: async (idToken) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = await authService.googleLogin(idToken);
          set({
            user,
            isAuthenticated: true,
            isGuest: false,
            isLoading: false
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      playAsGuest: async () => {
        set({ isLoading: true, error: null });
        try {
          const { user } = await authService.createGuest();
          set({
            user,
            isAuthenticated: true,
            isGuest: true,
            isLoading: false
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isGuest: false,
            error: null
          });
        }
      },

      refreshUser: async () => {
        try {
          const user = await authService.getProfile();
          set({ user });
        } catch {
          // Token might be invalid, clear auth
          set({
            user: null,
            isAuthenticated: false,
            isGuest: false
          });
        }
      },

      clearError: () => set({ error: null }),

      setUser: (user) => set({
        user,
        isAuthenticated: !!user,
        isGuest: user?.isGuest || false
      }),

      initialize: async () => {
        // Check for existing auth
        const storedUser = authService.getCurrentUser();
        const token = authService.getAccessToken();

        if (storedUser && token) {
          set({
            user: storedUser,
            isAuthenticated: true,
            isGuest: storedUser.isGuest || false
          });

          // Verify token is still valid (non-blocking)
          if (!storedUser.isGuest) {
            authService.getProfile().catch(() => {
              // Token invalid, clear auth
              set({
                user: null,
                isAuthenticated: false,
                isGuest: false
              });
            });
          }
        }
      }
    }),
    {
      name: 'mafia-auth-store',
      partialize: (_state) => ({
        // Don't persist sensitive data, let authService handle tokens
        // Only persist minimal UI state
      })
    }
  )
);

// Initialize auth on app load
export const initializeAuth = () => {
  useAuthStore.getState().initialize();
};
