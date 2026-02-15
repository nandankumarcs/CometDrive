'use client';

import { useEffect, useCallback } from 'react';
import { HardDrive, Upload, FolderPlus } from 'lucide-react';
import { useDriveStore } from '../../../store/drive.store';
import { useFolders } from '../../../hooks/use-folders';
import { useFiles, useTrashFile, useDownloadFile } from '../../../hooks/use-files';
import { useTrashFolder } from '../../../hooks/use-folders';
import { DriveItem } from '../../../components/drive/DriveItem';
import { DriveToolbar } from '../../../components/drive/DriveToolbar';
import { EmptyState } from '../../../components/drive/EmptyState';
import { NewFolderModal } from '../../../components/drive/NewFolderModal';
import { RenameModal } from '../../../components/drive/RenameModal';
import { DeleteConfirmModal } from '../../../components/drive/DeleteConfirmModal';
import { ShareModal } from '../../../components/drive/ShareModal';
import { UploadDropzone, triggerUpload } from '../../../components/drive/UploadDropzone';

export default function DrivePage() {
  const { currentFolderUuid, viewMode, selectedItems, navigateToFolder, resetBreadcrumbs } =
    useDriveStore();

  const { data: folders = [], isLoading: foldersLoading } = useFolders(currentFolderUuid);
  const { data: files = [], isLoading: filesLoading } = useFiles(currentFolderUuid);
  const trashFolder = useTrashFolder();
  const trashFile = useTrashFile();
  const downloadFile = useDownloadFile();

  // Reset breadcrumbs when mounting
  useEffect(() => {
    resetBreadcrumbs();
  }, []);

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
    <div className="flex flex-col h-full" onDragOver={(e) => e.preventDefault()}>
      <DriveToolbar onUpload={triggerUpload} />

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Loading…</span>
          </div>
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={HardDrive}
          title="Welcome to CometDrive"
          subtitle="Your personal cloud storage. Upload files, create folders, and organise your documents."
          action={
            <>
              <button
                onClick={triggerUpload}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                <Upload className="h-4 w-4" /> Upload File
              </button>
              <button
                onClick={() => useDriveStore.getState().openModal('newFolder')}
                className="btn-secondary"
              >
                <FolderPlus className="h-4 w-4 mr-2" /> New Folder
              </button>
            </>
          }
        />
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-1'
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
              onNavigate={() => navigateToFolder(folder.uuid, folder.name)}
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
