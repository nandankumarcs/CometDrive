'use client';

import { User, Moon, Sun, HardDrive, CreditCard, Shield } from 'lucide-react';
import { useAuthStore } from '../../../store/auth.store';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Manage your account settings and preferences.
      </p>

      <div className="space-y-6">
        {/* Profile Section */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <User className="w-5 h-5 mr-2 text-primary-500" />
              Profile Information
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center space-x-6">
              <div className="h-20 w-20 rounded-full bg-linear-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-md">
                {user?.first_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                  {user?.first_name} {user?.last_name}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 mt-2">
                  Active Account
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Appearance Section */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Sun className="w-5 h-5 mr-2 text-orange-500" />
              Appearance
            </h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Customize how CometDrive looks on your device.
            </p>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              <button
                onClick={() => setTheme('light')}
                className={`p-4 rounded-lg border-2 flex flex-col items-center space-y-2 transition-all ${
                  theme === 'light'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10 text-primary-600'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Sun className="w-6 h-6" />
                <span className="text-sm font-medium">Light</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-lg border-2 flex flex-col items-center space-y-2 transition-all ${
                  theme === 'dark'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10 text-primary-600'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Moon className="w-6 h-6" />
                <span className="text-sm font-medium">Dark</span>
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`p-4 rounded-lg border-2 flex flex-col items-center space-y-2 transition-all ${
                  theme === 'system'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10 text-primary-600'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="relative">
                  <Sun className="w-6 h-6 clip-half-left" />
                  <Moon className="w-6 h-6 absolute top-0 left-0 clip-half-right ml-3" />
                </div>
                <span className="text-sm font-medium">System</span>
              </button>
            </div>
          </div>
        </section>

        {/* Storage Section */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <HardDrive className="w-5 h-5 mr-2 text-blue-500" />
              Storage
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                12.5 GB used of 15 GB
              </span>
              <span className="text-sm text-gray-500">83%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-6">
              <div
                className="bg-primary-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: '83%' }}
              ></div>
            </div>
            <button className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline flex items-center">
              <CreditCard className="w-4 h-4 mr-1" />
              Upgrade Storage Plan
            </button>
          </div>
        </section>

        {/* Security Section (Placeholder) */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 overflow-hidden opacity-50 cursor-not-allowed">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Shield className="w-5 h-5 mr-2 text-red-500" />
              Security (Coming Soon)
            </h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Two-factor authentication and password management features will be available soon.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
