'use client';

import { User, Moon, Sun, HardDrive, CreditCard, MailPlus, Copy, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../../store/auth.store';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { useCreateInvitation } from '../../../hooks/use-invitations';

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const createInvitation = useCreateInvitation();

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const rawStorageUsed = user ? Number.parseInt(String(user.storage_used ?? '0'), 10) : 0;
  const rawMaxStorage = user ? Number.parseInt(String(user.max_storage ?? '1073741824'), 10) : 0;
  const storageUsed = Number.isFinite(rawStorageUsed) ? Math.max(rawStorageUsed, 0) : 0;
  const maxStorage =
    Number.isFinite(rawMaxStorage) && rawMaxStorage > 0 ? rawMaxStorage : 1073741824;
  const storagePercent = maxStorage > 0 ? (storageUsed / maxStorage) * 100 : 0;
  const inviteError =
    (createInvitation.error as { response?: { data?: { message?: string } } } | null)?.response
      ?.data?.message ?? null;

  const handleInviteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const invitation = await createInvitation.mutateAsync();

    setInviteLink(`${window.location.origin}/auth/signup?token=${invitation.token}`);
    setCopySuccess(false);
  };

  const handleCopyInviteLink = async () => {
    if (!inviteLink) {
      return;
    }

    await navigator.clipboard.writeText(inviteLink);
    setCopySuccess(true);
    window.setTimeout(() => setCopySuccess(false), 2000);
  };

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
                {formatBytes(storageUsed)} used of {formatBytes(maxStorage)}
              </span>
              <span className="text-sm text-gray-500">{Math.round(storagePercent)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-6">
              <div
                className="bg-primary-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(storagePercent, 100)}%` }}
              ></div>
            </div>
            <button className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline flex items-center">
              <CreditCard className="w-4 h-4 mr-1" />
              Upgrade Storage Plan
            </button>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <MailPlus className="w-5 h-5 mr-2 text-emerald-500" />
              Invite Teammates
            </h2>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Create a reusable invitation link for a new user to create an account.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                The first successful signup uses the link, and unused links expire in 7 days.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleInviteSubmit}>
              <div className="flex justify-start">
                <div>
                  <button
                    type="submit"
                    data-testid="create-invite-button"
                    disabled={createInvitation.isPending}
                    className="w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {createInvitation.isPending ? 'Creating...' : 'Create Invite Link'}
                  </button>
                </div>
              </div>

              {inviteError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                  {inviteError}
                </div>
              )}
            </form>

            {inviteLink && (
              <div
                data-testid="invite-link-panel"
                className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                      Invitation created
                    </p>
                    <p
                      data-testid="invite-link-text"
                      className="mt-1 break-all text-sm text-emerald-800 dark:text-emerald-300"
                    >
                      {inviteLink}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
                  >
                    {copySuccess ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy link
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
