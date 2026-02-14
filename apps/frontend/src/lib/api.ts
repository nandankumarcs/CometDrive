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
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // ignore parse errors
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
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
