'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterFormData } from '../../schemas/auth.schema';
import { useAuthStore } from '../../store/auth.store';
import { useRouter, useSearchParams } from 'next/navigation';
import { Cloud, Loader2 } from 'lucide-react';

function RegisterForm() {
  const { register: registerUser, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
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
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    clearError();
    try {
      await registerUser(token, data.firstName, data.lastName, data.password);
      router.push('/drive');
    } catch {
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
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Complete your registration to get started with CometDrive
          </p>
        </div>

        {!token && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-lg text-sm">
            No invitation token found. Please use the link from your invitation email.
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start">
              <span className="flex-1">{error}</span>
            </div>
          )}

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="form-input-label">
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  placeholder="John"
                  className={`form-input-field ${
                    errors.firstName ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                  }`}
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-500 font-medium">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className="form-input-label">
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  placeholder="Doe"
                  className={`form-input-field ${
                    errors.lastName ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                  }`}
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="form-input-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
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

            <div>
              <label htmlFor="confirmPassword" className="form-input-label">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                className={`form-input-field ${
                  errors.confirmPassword
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : ''
                }`}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !token}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Creating account...
                </div>
              ) : (
                'Create account'
              )}
            </button>
          </div>

          <div className="text-center mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <a
                href="/login"
                className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
              >
                Sign in
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
