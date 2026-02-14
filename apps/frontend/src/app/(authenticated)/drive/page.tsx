'use client';

import { HardDrive, Upload, FolderPlus } from 'lucide-react';

export default function DrivePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      {/* Decorative gradient orb */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary-400/20 dark:bg-primary-500/10 rounded-full blur-3xl scale-150" />
        <div className="relative bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/30 p-6 rounded-2xl">
          <HardDrive className="h-16 w-16 text-primary-600 dark:text-primary-400" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Welcome to CometDrive
      </h1>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
        Your personal cloud storage. Upload files, create folders, and organise your documents.
      </p>

      <div className="flex items-center gap-3">
        <button className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-all shadow-md hover:shadow-lg focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
          <Upload className="h-4 w-4" />
          Upload File
        </button>
        <button className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all shadow-sm focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
          <FolderPlus className="h-4 w-4" />
          New Folder
        </button>
      </div>
    </div>
  );
}
