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
  register: (
    firstName: string,
    lastName: string,
    email: string,
    organizationName: string,
    password: string,
  ) => Promise<void>;
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

        register: async (firstName, lastName, email, organizationName, password) => {
          set({ isLoading: true, error: null });
          try {
            const res = await api.post<RegisterResponse>('/auth/register', {
              firstName,
              lastName,
              email,
              organizationName,
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
