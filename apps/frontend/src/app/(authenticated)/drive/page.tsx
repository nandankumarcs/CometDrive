'use client';

import { DriveContent } from '../../../components/drive/DriveContent';
import { ActivityFeed } from '../../../components/drive/ActivityFeed';

export default function DrivePage() {
  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0">
        <DriveContent />
      </div>
      <div className="w-80 border-l border-gray-200 dark:border-gray-800 hidden xl:block bg-gray-50/50 dark:bg-gray-900/50">
        <ActivityFeed />
      </div>
    </div>
  );
}
