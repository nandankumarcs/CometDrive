'use client';

import { useNotifications, useMarkNotificationRead } from '../../hooks/use-notifications';
import { Bell, Check, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useRef, useEffect } from 'react';

export function NotificationsDropdown() {
  const { data: notifications, isLoading } = useNotifications(true);
  const markRead = useMarkNotificationRead();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors relative"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg py-1 ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-100 dark:border-gray-700 transform origin-top-right transition-all z-50">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                {unreadCount} unread
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              </div>
            ) : notifications?.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifications?.map((notification) => (
                <div
                  key={notification.uuid}
                  className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer border-b border-gray-50 dark:border-gray-700/30 last:border-0 ${
                    !notification.is_read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                  }`}
                  onClick={() => {
                    if (!notification.is_read) {
                      markRead.mutate(notification.uuid);
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <div
                      className={`mt-0.5 p-1.5 rounded-lg ${
                        !notification.is_read
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                      }`}
                    >
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${
                          !notification.is_read
                            ? 'font-semibold text-gray-900 dark:text-white'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                          {notification.body}
                        </p>
                      )}
                      <div className="flex items-center mt-1 text-[10px] text-gray-400">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                        {!notification.is_read && (
                          <span className="ml-2 flex items-center text-primary-500">
                            <span className="h-1.5 w-1.5 bg-primary-500 rounded-full mr-1"></span>
                            New
                          </span>
                        )}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <button
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-500 transition-opacity"
                        title="Mark as read"
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead.mutate(notification.uuid);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-center">
            <button className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline">
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
