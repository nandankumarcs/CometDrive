import { Search, Bell, LogOut, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export function Header() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
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
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg py-1 ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-100 dark:border-gray-700 transform origin-top-right transition-all">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 mb-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {user?.email}
                </p>
              </div>

              <Link
                href="/settings"
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Settings
              </Link>

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
