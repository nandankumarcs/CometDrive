'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HardDrive, Trash2, Cloud, Star, Users } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

const navItems = [
  { name: 'My Drive', href: '/drive', icon: HardDrive, exact: true },
  { name: 'Shared with Me', href: '/drive/shared-with-me', icon: Users, exact: false },
  { name: 'Starred', href: '/drive/starred', icon: Star, exact: false },
  { name: 'Trash', href: '/drive/trash', icon: Trash2, exact: false },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const { user } = useAuthStore();
  const storageUsed = parseInt(user?.organization?.storage_used || '0', 10);
  const maxStorage = parseInt(user?.organization?.max_storage || '1073741824', 10); // Default 1GB
  const percentage = Math.min((storageUsed / maxStorage) * 100, 100);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen fixed left-0 top-0 pt-16 z-30 transition-colors duration-300">
      <div className="p-4 flex-1">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  active
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon
                  className={`mr-3 h-5 w-5 ${
                    active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Storage Indicator */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center mb-2">
          <Cloud className="h-5 w-5 text-gray-400 mr-2" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Storage</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2 overflow-hidden">
          <div
            className="bg-primary-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{formatSize(storageUsed)} used</span>
          <span>{formatSize(maxStorage)} total</span>
        </div>
      </div>
    </aside>
  );
}
