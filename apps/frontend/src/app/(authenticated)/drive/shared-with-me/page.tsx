'use client';

import { useSharedWithMe } from '../../../../hooks/use-share';
import { Loader2, Folder, File as FileIcon, Clock, Users } from 'lucide-react';
import { DriveItem } from '../../../../components/drive/DriveItem';

export default function SharedWithMePage() {
  const { data: shares, isLoading } = useSharedWithMe();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!shares || shares.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <Users className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Shared with me</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          Files and folders shared with you by other users will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Shared with me</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {shares.map((share: any) => (
          <div key={share.id} className="relative group">
            <DriveItem
              item={{
                ...share.file,
                // Add shared context
                sharedBy: share.creator,
                sharedAt: share.created_at,
              }}
              viewMode="grid" // Force grid for now, or respect generic view mode
            />
            <div className="absolute top-2 right-2 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs px-2 py-1 rounded-full shadow-sm z-10 flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{share.creator.first_name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
