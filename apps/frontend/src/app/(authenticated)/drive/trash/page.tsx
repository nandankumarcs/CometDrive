'use client';

import { Trash2 } from 'lucide-react';
import { useDriveStore } from '../../../../store/drive.store';
import {
  useFolders,
  useRestoreFolder,
  useDeleteFolderPermanent,
} from '../../../../hooks/use-folders';
import { useFiles, useRestoreFile, useDeleteFilePermanent } from '../../../../hooks/use-files';
import { DriveItem } from '../../../../components/drive/DriveItem';
import { EmptyState } from '../../../../components/drive/EmptyState';
import { DeleteConfirmModal } from '../../../../components/drive/DeleteConfirmModal';
import { useEmptyTrashFiles } from '../../../../hooks/use-files';
import { useEmptyTrashFolders } from '../../../../hooks/use-folders';
import { Loader2, RotateCcw, XCircle } from 'lucide-react';
import { useState } from 'react';

export default function TrashPage() {
  const { viewMode, selectedItems, clearSelection, openModal } = useDriveStore();

  // Fetch trashed items
  const { data: folders = [], isLoading: foldersLoading } = useFolders(null, true);
  const { data: files = [], isLoading: filesLoading } = useFiles(null, true);

  const restoreFolder = useRestoreFolder();
  const deleteFolder = useDeleteFolderPermanent();
  const restoreFile = useRestoreFile();
  const deleteFile = useDeleteFilePermanent();
  const emptyTrashFiles = useEmptyTrashFiles();
  const emptyTrashFolders = useEmptyTrashFolders();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkRestore = async () => {
    if (selectedItems.length === 0) return;
    setIsProcessing(true);
    try {
      await Promise.all(
        selectedItems.map((item) =>
          item.type === 'file'
            ? restoreFile.mutateAsync(item.uuid)
            : restoreFolder.mutateAsync(item.uuid),
        ),
      );
      clearSelection();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDeletePermanent = () => {
    if (selectedItems.length === 0) return;
    // For bulk permanent delete, we might need a modified modal or just confirmation.
    // For now, let's use a simple confirm or trigger the modal for each (not ideal).
    // Better: Add a 'bulk-delete' modal type.
    if (
      confirm(`Are you sure you want to permanently delete these ${selectedItems.length} items?`)
    ) {
      handleActualBulkDelete();
    }
  };

  const handleActualBulkDelete = async () => {
    setIsProcessing(true);
    try {
      await Promise.all(
        selectedItems.map((item) =>
          item.type === 'file'
            ? deleteFile.mutateAsync(item.uuid)
            : deleteFolder.mutateAsync(item.uuid),
        ),
      );
      clearSelection();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmptyTrash = async () => {
    if (
      confirm('Are you sure you want to empty the trash? This will permanently delete all items.')
    ) {
      await Promise.all([emptyTrashFiles.mutateAsync(), emptyTrashFolders.mutateAsync()]);
    }
  };

  const isLoading = foldersLoading || filesLoading;
  const isEmpty = folders.length === 0 && files.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-gray-500" />
          Trash
        </h1>
        {!isEmpty && (
          <button
            onClick={handleEmptyTrash}
            disabled={emptyTrashFiles.isPending || emptyTrashFolders.isPending}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors disabled:opacity-50"
          >
            {emptyTrashFiles.isPending || emptyTrashFolders.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Empty Trash
          </button>
        )}
      </div>

      {selectedItems.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-primary-50 dark:bg-primary-900/10 border-b border-primary-100 dark:border-primary-900/20">
          <span className="text-sm font-medium text-primary-700 dark:text-primary-400">
            {selectedItems.length} selected
          </span>
          <div className="h-4 w-px bg-primary-200 dark:bg-primary-800" />
          <button
            onClick={handleBulkRestore}
            disabled={isProcessing}
            className="text-sm font-medium text-primary-700 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 flex items-center gap-1.5"
          >
            <RotateCcw className="h-4 w-4" /> Restore all
          </button>
          <button
            onClick={handleBulkDeletePermanent}
            disabled={isProcessing}
            className="text-sm font-medium text-red-600 hover:text-red-700 dark:hover:text-red-400 flex items-center gap-1.5"
          >
            <XCircle className="h-4 w-4" /> Delete forever
          </button>
          <button
            onClick={clearSelection}
            className="ml-auto text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Cancel
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Loading trash...</span>
          </div>
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={Trash2}
          title="Trash is empty"
          subtitle="Items moved to trash will appear here."
        />
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-4'
              : 'flex flex-col gap-0.5 p-1'
          }
        >
          {/* Folders first */}
          {folders.map((folder) => (
            <DriveItem
              key={folder.uuid}
              uuid={folder.uuid}
              name={folder.name}
              type="folder"
              updatedAt={folder.updated_at}
              isSelected={selectedItems.some((i) => i.uuid === folder.uuid)}
              isTrashed={true}
              onRestore={() => restoreFolder.mutate(folder.uuid)}
              onDeletePermanent={() =>
                openModal('delete', { uuid: folder.uuid, name: folder.name, type: 'folder' })
              }
            />
          ))}
          {/* Then files */}
          {files.map((file) => (
            <DriveItem
              key={file.uuid}
              uuid={file.uuid}
              name={file.name}
              type="file"
              mimeType={file.mime_type}
              size={file.size}
              updatedAt={file.updated_at}
              isSelected={selectedItems.some((i) => i.uuid === file.uuid)}
              isTrashed={true}
              onRestore={() => restoreFile.mutate(file.uuid)}
              onDeletePermanent={() =>
                openModal('delete', { uuid: file.uuid, name: file.name, type: 'file' })
              }
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <DeleteConfirmModal />
    </div>
  );
}
