'use client';

import { ChevronRight, LayoutGrid, List, FolderPlus, Upload, Trash2, X, Info } from 'lucide-react';
import { useDriveStore } from '../../store/drive.store';
import { useEffect, useState } from 'react';
import { useTrashFile, useDownloadZip } from '../../hooks/use-files';
import { useTrashFolder } from '../../hooks/use-folders';

interface DriveToolbarProps {
  onUpload?: () => void;
}

export function DriveToolbar({ onUpload }: DriveToolbarProps) {
  const store = useDriveStore();
  const {
    breadcrumbs = [],
    navigateToBreadcrumb,
    viewMode,
    setViewMode,
    openModal,
    selectedItems,
    clearSelection,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    filterType,
    setFilterType,
  } = store;

  const trashFile = useTrashFile();
  const trashFolder = useTrashFolder();
  const downloadZip = useDownloadZip();
  const [isTrashing, setIsTrashing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleBulkDownload = async () => {
    if (selectedItems.length === 0) return;
    setIsDownloading(true);
    try {
      const fileUuids = selectedItems
        .filter((item) => item.type === 'file')
        .map((item) => item.uuid);

      if (fileUuids.length > 0) {
        const blob = await downloadZip.mutateAsync(fileUuids);
        // Trigger file download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `download-${Date.now()}.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      clearSelection();
    } catch (error) {
      console.error('Failed to download zip:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBulkTrash = async () => {
    if (selectedItems.length === 0) return;
    setIsTrashing(true);
    try {
      await Promise.all(
        selectedItems.map((item) =>
          item.type === 'file'
            ? trashFile.mutateAsync(item.uuid)
            : trashFolder.mutateAsync(item.uuid),
        ),
      );
      clearSelection();
    } finally {
      setIsTrashing(false);
    }
  };

  useEffect(() => {
    console.log('DriveToolbar mounted. Store state:', store);
    console.log('Breadcrumbs:', breadcrumbs);
  }, [store, breadcrumbs]);

  return (
    <div className="flex flex-col gap-3 py-3 px-1 mb-2 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between">
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm min-w-0 flex-1 mr-4">
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

        {/* Search */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <input
              type="text"
              placeholder="Search in Drive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Filters & Sort */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          {/* Filter Chips */}
          {['image', 'video', 'application/pdf'].map((type) => {
            const label =
              type === 'application/pdf'
                ? 'Documents'
                : type.charAt(0).toUpperCase() + type.slice(1) + 's';
            const isActive =
              filterType &&
              (type === filterType || (type === 'image' && filterType.startsWith('image/')));

            return (
              <button
                key={type}
                onClick={() => setFilterType(isActive ? null : type)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            );
          })}

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Sort Dropdown (Simple implementation) */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-transparent border-none text-gray-600 dark:text-gray-300 font-medium focus:ring-0 cursor-pointer"
          >
            <option value="name">Name</option>
            <option value="date">Date</option>
            <option value="size">Size</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
            className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title={sortOrder === 'ASC' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'ASC' ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4h13M3 8h9m-9 4h5m4 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => openModal('newFolder')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            <FolderPlus className="h-3.5 w-3.5" />{' '}
            <span className="hidden lg:inline">New Folder</span>
          </button>
          <button
            onClick={onUpload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-all shadow-sm"
          >
            <Upload className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Upload</span>
          </button>

          {selectedItems.length > 0 && (
            <>
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
              <div className="flex items-center gap-2 bg-primary-50 dark:bg-primary-900/10 px-2 py-1 rounded-lg border border-primary-100 dark:border-primary-900/20 animate-in fade-in zoom-in duration-200">
                <span className="text-xs font-medium text-primary-700 dark:text-primary-400 px-1">
                  {selectedItems.length}
                </span>
                <button
                  onClick={() => handleBulkDownload()}
                  disabled={isDownloading}
                  className="p-1.5 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
                  title="Download Selected"
                >
                  <Upload className="h-4 w-4 rotate-180" />
                </button>
                <button
                  onClick={handleBulkTrash}
                  disabled={isTrashing}
                  className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors disabled:opacity-50"
                  title="Move to Trash"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={clearSelection}
                  className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title="Clear selection"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

          <button
            onClick={store.toggleDetails}
            className={`p-1.5 rounded-lg transition-colors ${
              store.showDetails
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="View Details"
          >
            <Info className="h-5 w-5" />
          </button>

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
    </div>
  );
}
