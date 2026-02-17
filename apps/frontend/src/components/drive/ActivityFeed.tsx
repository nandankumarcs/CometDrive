'use client';

import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { useDriveStore } from '../../store/drive.store';
import { Activity, Trash2, RotateCcw, Upload } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AuditLog {
  id: number;
  action: string;
  metadata: Record<string, any>;
  createdAt: string;
  user: {
    first_name: string;
    last_name: string;
  };
}
export function ActivityFeed() {
  const { user } = useAuthStore();
  const { setCurrentFolder, setBreadcrumbs } = useDriveStore();

  const { data: activities, isLoading } = useQuery({
    queryKey: ['activities', user?.id],
    queryFn: async () => {
      const res = await api.get<{ rows: AuditLog[]; count: number }>('/audit-logs?limit=20');
      return res.data;
    },
    enabled: !!user,
  });

  const handleActivityClick = (log: AuditLog) => {
    const folderUuid = log.metadata?.folderUuid;
    if (folderUuid) {
      if (folderUuid === 'root') {
        setCurrentFolder(null); // or undefined? store says string | null
        setBreadcrumbs([{ uuid: null, name: 'My Drive' }]);
      } else {
        setCurrentFolder(folderUuid);
        // We lack the folder name here to set breadcrumbs correctly without fetching
        // But the breadcrumb component might handle it or we accept slightly broken breadcrumbs until we fix that
        // OR we just set a "Loading..." breadcrumb?
        // Ideally we fetch the folder path.
        // For now, let's just set the folder and reset breadcrumbs to "..."
        setBreadcrumbs([
          { uuid: null, name: 'My Drive' },
          { uuid: folderUuid, name: '...' },
        ]);
      }
    }
  };

  const getIcon = (action: string) => {
    switch (action) {
      case 'FILE_UPLOAD':
        return <Upload className="w-4 h-4 text-blue-500" />;
      case 'FILE_TRASH':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'FILE_RESTORE':
        return <RotateCcw className="w-4 h-4 text-green-500" />;
      case 'FILE_DELETE_PERMANENT':
        return <Trash2 className="w-4 h-4 text-red-700" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMessage = (log: AuditLog) => {
    const name = log.metadata?.name || 'item';
    switch (log.action) {
      case 'FILE_UPLOAD':
        return `uploaded ${name}`;
      case 'FILE_TRASH':
        return `moved ${name} to trash`;
      case 'FILE_RESTORE':
        return `restored ${name}`;
      case 'FILE_DELETE_PERMANENT':
        return `permanently deleted ${name}`;
      default:
        return `performed ${log.action}`;
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500 text-sm">Loading activities...</div>;
  }

  if (!activities?.rows?.length) {
    return <div className="p-4 text-center text-gray-500 text-sm">No recent activities</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
          <Activity className="w-4 h-4 mr-2 text-primary-500" />
          Recent Activity
        </h3>
      </div>
      <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
        {activities.rows.map((log) => (
          <div
            key={log.id}
            onClick={() => handleActivityClick(log)}
            className="group flex items-start p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors duration-200"
          >
            <div className="mt-0.5 mr-3 shrink-0 bg-white dark:bg-gray-700 p-1.5 rounded-full shadow-xs border border-gray-100 dark:border-gray-600">
              {getIcon(log.action)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 dark:text-gray-100 leading-snug">
                <span className="font-medium text-gray-900 dark:text-white">
                  {log.user?.first_name || 'User'}
                </span>{' '}
                <span className="text-gray-600 dark:text-gray-300">{getMessage(log)}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1 flex items-center">
                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
