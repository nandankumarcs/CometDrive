import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import api from '../lib/api';
import type { AuthUser, LoginResponse, RegisterResponse } from '../schemas/auth.schema';
import { useDriveStore } from './drive.store';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  registerWithToken: (
    token: string,
    email: string,
    firstName: string,
    lastName: string,
    password: string,
  ) => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
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
            useDriveStore.getState().resetState();
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

        register: async (firstName, lastName, email, password) => {
          set({ isLoading: true, error: null });
          try {
            const res = await api.post<RegisterResponse>('/auth/register', {
              firstName,
              lastName,
              email,
              password,
            });
            const { accessToken, refreshToken, user } = res.data.data;
            useDriveStore.getState().resetState();
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

        registerWithToken: async (token, email, firstName, lastName, password) => {
          set({ isLoading: true, error: null });
          try {
            const res = await api.post<RegisterResponse>('/auth/register-with-token', {
              token,
              email,
              firstName,
              lastName,
              password,
            });
            const { accessToken, refreshToken, user } = res.data.data;
            useDriveStore.getState().resetState();
            set({
              user,
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (err: any) {
            const message = err.response?.data?.message || 'Invitation registration failed';
            set({ error: message, isLoading: false });
            throw err;
          }
        },

        refreshCurrentUser: async () => {
          try {
            const res = await api.get<{ data: AuthUser }>('/auth/me');
            const user = res.data.data;
            set((state) => ({
              user,
              isAuthenticated: state.accessToken ? true : state.isAuthenticated,
            }));
          } catch (err) {
            // Keep the existing session state if a background refresh fails.
            console.warn('[AuthStore] Failed to refresh current user', err);
          }
        },

        logout: () => {
          useDriveStore.getState().resetState();
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
