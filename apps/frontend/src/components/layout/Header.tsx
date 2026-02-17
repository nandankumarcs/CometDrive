import { Search, Bell, LogOut, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function Header() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    queryClient.clear();
    logout();
    router.push('/login');
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 fixed top-0 w-full z-40 flex items-center justify-between px-4 lg:px-6 transition-colors duration-300">
      {/* Brand */}
      <div className="flex items-center w-64">
        <Link
          href="/drive"
          className="flex items-center text-primary-600 dark:text-primary-500 font-bold text-xl tracking-tight"
        >
          <div className="bg-primary-100 dark:bg-primary-900/30 p-1.5 rounded-lg mr-2">
            <UserIcon className="h-5 w-5" />
          </div>
          <span>CometDrive</span>
        </Link>
      </div>

      {/* Search Bar - Center */}
      <div className="flex-1 max-w-2xl px-4 hidden md:block">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg leading-5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm transition-all duration-200"
            placeholder="Search files, folders, and documents..."
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-4">
        <button className="p-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors">
          <Bell className="h-6 w-6" />
        </button>

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-full"
          >
            <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-medium shadow-md">
              {user?.first_name?.[0]?.toUpperCase() || 'U'}
            </div>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg py-1 ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-100 dark:border-gray-700 transform origin-top-right transition-all">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 mb-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {user?.email}
                </p>
              </div>

              {/* Storage Widget */}
              {user?.organization && (
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Storage</span>
                    <span>
                      {Math.round(
                        (parseInt(user.organization.storage_used) /
                          parseInt(user.organization.max_storage)) *
                          100,
                      )}
                      % used
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-1">
                    <div
                      className="bg-primary-500 h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(
                          (parseInt(user.organization.storage_used) /
                            parseInt(user.organization.max_storage)) *
                            100,
                          100,
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 text-right">
                    {formatBytes(parseInt(user.organization.storage_used))} of{' '}
                    {formatBytes(parseInt(user.organization.max_storage))}
                  </div>
                </div>
              )}

              <Link
                href="/settings"
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Settings
              </Link>

              {/* Simple Theme Toggle for Dropdown */}
              {/* Only visible if JS enabled, theme handled by page usually but quick toggle is nice */}
              {/* Omitting complex theme toggle here to keep dropdown clean, relying on Settings page or adding simple one */}

              <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
