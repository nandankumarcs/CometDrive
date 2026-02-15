import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import api from '../lib/api';
import type { AuthUser, LoginResponse, RegisterResponse } from '../schemas/auth.schema';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (token: string, firstName: string, lastName: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        login: async (email, password) => {
          set({ isLoading: true, error: null });
          try {
            const res = await api.post<LoginResponse>('/auth/login', { email, password });
            const { accessToken, refreshToken, user } = res.data.data;
            set({
              user,
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (err: any) {
            const message = err.response?.data?.message || 'Login failed';
            set({ error: message, isLoading: false });
            throw err;
          }
        },

        register: async (token, firstName, lastName, password) => {
          set({ isLoading: true, error: null });
          try {
            const res = await api.post<RegisterResponse>('/auth/register-with-token', {
              token,
              firstName,
              lastName,
              password,
            });
            const { accessToken, refreshToken, user } = res.data.data;
            set({
              user,
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (err: any) {
            const message = err.response?.data?.message || 'Registration failed';
            set({ error: message, isLoading: false });
            throw err;
          }
        },

        logout: () => {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null,
          });
        },

        clearError: () => set({ error: null }),

        _hasHydrated: false,
        setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),
      }),
      {
        name: 'auth-storage',
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true);
        },
      },
    ),
    { name: 'AuthStore' },
  ),
);
