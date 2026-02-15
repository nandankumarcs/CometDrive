'use client';

import { useDriveStore } from '../../store/drive.store';
import { X, Minus, Maximize2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export function UploadProgressWidget() {
  const { uploads, clearCompletedUploads } = useDriveStore();
  const [isMinimized, setIsMinimized] = useState(false);
  const uploadList = Object.values(uploads);

  // Auto-maximize when new upload starts
  useEffect(() => {
    const hasActive = uploadList.some((u) => u.status === 'uploading' || u.status === 'pending');
    if (hasActive && isMinimized) {
      setIsMinimized(false);
    }
  }, [uploads, isMinimized]); // Keep isMinimized dependency to avoid maximize loops if user minimizes during upload

  if (uploadList.length === 0) return null;

  const activeCount = uploadList.filter(
    (u) => u.status === 'uploading' || u.status === 'pending',
  ).length;

  return (
    <div className="fixed bottom-20 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-40 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          {activeCount > 0
            ? `Uploading ${activeCount} item${activeCount !== 1 ? 's' : ''}`
            : 'Uploads complete'}
        </h3>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          </button>
          <button
            onClick={clearCompletedUploads}
            className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
            title="Clear completed"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* List */}
      {!isMinimized && (
        <div className="max-h-60 overflow-y-auto p-2 space-y-2">
          {uploadList.reverse().map((upload) => (
            <div
              key={upload.id}
              className="group flex flex-col p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center truncate">
                  <span
                    className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[180px]"
                    title={upload.name}
                  >
                    {upload.name}
                  </span>
                </div>
                <div className="shrink-0 ml-2">
                  {upload.status === 'completed' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {upload.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  {upload.status === 'uploading' && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {upload.progress}%
                    </span>
                  )}
                  {upload.status === 'pending' && (
                    <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {(upload.status === 'uploading' || upload.status === 'pending') && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(upload.progress, 5)}%` }}
                  />
                </div>
              )}

              {upload.status === 'error' && (
                <p className="text-[10px] text-red-500 mt-1 truncate">{upload.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
