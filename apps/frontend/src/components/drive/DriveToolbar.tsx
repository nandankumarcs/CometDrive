'use client';

import { ChevronRight, LayoutGrid, List, FolderPlus, Upload } from 'lucide-react';
import { useDriveStore } from '../../store/drive.store';
import { useEffect } from 'react';

interface DriveToolbarProps {
  onUpload?: () => void;
}

export function DriveToolbar({ onUpload }: DriveToolbarProps) {
  const store = useDriveStore();
  const { breadcrumbs = [], navigateToBreadcrumb, viewMode, setViewMode, openModal } = store;

  useEffect(() => {
    console.log('DriveToolbar mounted. Store state:', store);
    console.log('Breadcrumbs:', breadcrumbs);
  }, [store, breadcrumbs]);

  return (
    <div className="flex items-center justify-between py-3 px-1 mb-2">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm min-w-0 flex-1">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center min-w-0">
            {i > 0 && <ChevronRight className="h-4 w-4 text-gray-400 mx-1 flex-shrink-0" />}
            <button
              onClick={() => navigateToBreadcrumb(i)}
              className={`truncate max-w-[160px] transition-colors ${
                i === breadcrumbs.length - 1
                  ? 'font-semibold text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400'
              }`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        <button
          onClick={() => openModal('newFolder')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
        >
          <FolderPlus className="h-3.5 w-3.5" /> New Folder
        </button>
        <button
          onClick={onUpload}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-all shadow-sm"
        >
          <Upload className="h-3.5 w-3.5" /> Upload
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* View toggle */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
