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

export default function TrashPage() {
  const { viewMode, selectedItems } = useDriveStore();

  // Fetch trashed items
  const { data: folders = [], isLoading: foldersLoading } = useFolders(null, true);
  const { data: files = [], isLoading: filesLoading } = useFiles(null, true);

  const restoreFolder = useRestoreFolder();
  const deleteFolder = useDeleteFolderPermanent();
  const restoreFile = useRestoreFile();
  const deleteFile = useDeleteFilePermanent();

  const isLoading = foldersLoading || filesLoading;
  const isEmpty = folders.length === 0 && files.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-gray-500" />
          Trash
        </h1>
      </div>

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
              isSelected={selectedItems.includes(folder.uuid)}
              isTrashed={true}
              onRestore={() => restoreFolder.mutate(folder.uuid)}
              onDeletePermanent={() => deleteFolder.mutate(folder.uuid)}
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
              isSelected={selectedItems.includes(file.uuid)}
              isTrashed={true}
              onRestore={() => restoreFile.mutate(file.uuid)}
              onDeletePermanent={() => deleteFile.mutate(file.uuid)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <DeleteConfirmModal />
    </div>
  );
}
