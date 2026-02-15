'use client';

import { Star } from 'lucide-react';
import { useDriveStore } from '../../../../store/drive.store';
import { useFolders, useToggleStarFolder, useTrashFolder } from '../../../../hooks/use-folders';
import {
  useFiles,
  useToggleStarFile,
  useTrashFile,
  useDownloadFile,
} from '../../../../hooks/use-files';
import { DriveItem } from '../../../../components/drive/DriveItem';
import { EmptyState } from '../../../../components/drive/EmptyState';
import { NewFolderModal } from '../../../../components/drive/NewFolderModal';
import { RenameModal } from '../../../../components/drive/RenameModal';
import { DeleteConfirmModal } from '../../../../components/drive/DeleteConfirmModal';
import { ShareModal } from '../../../../components/drive/ShareModal';
import { UploadDropzone } from '../../../../components/drive/UploadDropzone';
import { useEffect, useCallback } from 'react';

export default function StarredPage() {
  const { viewMode, selectedItems, setIsStarred } = useDriveStore();

  // Fetch starred items
  // We pass isStarred=true via useStore or just use custom hook logic?
  // The hooks read from store. So we need to set isStarred=true in store on mount.
  // Actually, the page should probably set the store state.

  // However, the hooks `useFiles` and `useFolders` read `isStarred` from store.
  // If I navigate to /drive/starred, I should set `isStarred` to true.

  useEffect(() => {
    setIsStarred(true);
    return () => setIsStarred(false); // Reset on unmount
  }, [setIsStarred]);

  const { data: folders = [], isLoading: foldersLoading } = useFolders(null);
  const { data: files = [], isLoading: filesLoading } = useFiles(null);

  const toggleStarFolder = useToggleStarFolder();
  const toggleStarFile = useToggleStarFile();
  const trashFolder = useTrashFolder();
  const trashFile = useTrashFile();
  const downloadFile = useDownloadFile();

  const handleDownload = useCallback(
    async (uuid: string, name: string) => {
      const blob = await downloadFile.mutateAsync(uuid);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    [downloadFile],
  );

  const isLoading = foldersLoading || filesLoading;
  const isEmpty = folders.length === 0 && files.length === 0;

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500 fill-current" />
          Starred
        </h1>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Loading starred items...</span>
          </div>
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={Star}
          title="No starred items"
          subtitle="Star files and folders to access them quickly here."
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
              isStarred={true}
              onToggleStar={() => toggleStarFolder.mutate(folder.uuid)}
              onTrash={() => trashFolder.mutate(folder.uuid)}
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
              isStarred={true}
              onToggleStar={() => toggleStarFile.mutate(file.uuid)}
              onTrash={() => trashFile.mutate(file.uuid)}
              onDownload={() => handleDownload(file.uuid, file.name)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <NewFolderModal />
      <RenameModal />
      <DeleteConfirmModal />
      <ShareModal />
      <UploadDropzone />
    </div>
  );
}
