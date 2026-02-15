'use client';

import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach Bearer token from localStorage (set by auth store)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('auth-storage');
      if (raw) {
        const parsed = JSON.parse(raw);
        const token = parsed?.state?.accessToken;
        console.log('[API] Interceptor - Token from storage:', token ? 'Found' : 'Missing', token);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('[API] Interceptor - Set Authorization header');
        } else {
          console.warn('[API] Interceptor - No token found in storage');
        }
      } else {
        console.warn('[API] Interceptor - No auth-storage in localStorage');
      }
    } catch (e) {
      console.error('[API] Interceptor - Error parsing auth-storage', e);
    }
  }
  return config;
});

// Redirect to /login on 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login')
    ) {
      console.warn('[API] Interceptor - 401 Unauthorized, redirecting to login');
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
