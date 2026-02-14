'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from '../../schemas/auth.schema';
import { useAuthStore } from '../../store/auth.store';
import { useRouter } from 'next/navigation';
import { Cloud, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();
  // Hydration fix for persist store
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) {
      router.push('/drive');
    }
  }, [isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    try {
      await login(data.email, data.password);
      router.push('/drive');
    } catch (err) {
      // Error handled in store
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-primary-50 dark:bg-primary-900/20 p-3 rounded-full">
              <Cloud className="h-10 w-10 text-primary-600 dark:text-primary-500" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to access your CometDrive
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start animate-pulse">
              <span className="flex-1">{error}</span>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label htmlFor="email-address" className="form-input-label">
                Email address
              </label>
              <input
                id="email-address"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={`form-input-field ${
                  errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                }`}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="form-input-label">
                  Password
                </label>
                <a
                  href="#"
                  className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
                >
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className={`form-input-field ${
                  errors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                }`}
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="text-center mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <span className="text-primary-600 dark:text-primary-400 font-medium">
                Ask your admin for an invite
              </span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
