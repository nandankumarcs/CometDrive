'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { HardDrive, Upload, FolderPlus } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useDriveStore } from '../../store/drive.store';
import { useFolders, useTrashFolder } from '../../hooks/use-folders';
import { useFiles, useTrashFile, useDownloadFile, useUploadFile } from '../../hooks/use-files';
import { DriveItem } from './DriveItem';
import { DriveToolbar } from './DriveToolbar';
import { EmptyState } from './EmptyState';
import { NewFolderModal } from './NewFolderModal';
import { RenameModal } from './RenameModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ShareModal } from './ShareModal';
import { UploadDropzone, triggerUpload } from './UploadDropzone';
import { DetailsPanel } from './DetailsPanel';
import { CommentsPanel } from '../collaboration/CommentsPanel';
import { ContinueWatchingCard } from './ContinueWatchingCard';

interface DriveContentProps {
  skipBreadcrumbReset?: boolean;
}

export function DriveContent({ skipBreadcrumbReset = false }: DriveContentProps) {
  const { currentFolderUuid, viewMode, selectedItems, resetBreadcrumbs, openModal, showComments } =
    useDriveStore();
  const pathname = usePathname();

  const { data: folders = [], isLoading: foldersLoading } = useFolders(currentFolderUuid);
  const { data: files = [], isLoading: filesLoading } = useFiles(currentFolderUuid);
  const trashFolder = useTrashFolder();
  const trashFile = useTrashFile();
  const downloadFile = useDownloadFile();
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const uploadFile = useUploadFile();

  // Reset breadcrumbs when mounting
  useEffect(() => {
    if (!skipBreadcrumbReset) {
      resetBreadcrumbs();
    }
  }, [skipBreadcrumbReset]);

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

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        try {
          for (let i = 0; i < files.length; i++) {
            await uploadFile.mutateAsync({
              file: files[i],
              folderUuid: currentFolderUuid ?? undefined,
            });
          }
        } catch (error) {
          console.error('Drop upload failed:', error);
        }
      }
    },
    [currentFolderUuid, uploadFile],
  );

  const isLoading = foldersLoading || filesLoading;
  const isEmpty = folders.length === 0 && files.length === 0;
  const showContinueWatchingCard = pathname === '/drive' && currentFolderUuid === null;

  return (
    <div
      className="flex flex-col h-full relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <DriveToolbar onUpload={triggerUpload} />
      {showContinueWatchingCard && <ContinueWatchingCard />}

      <div className="flex-1 flex min-h-0 relative">
        <div
          className="flex-1 flex flex-col min-h-0 relative overflow-y-auto"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag Overlay moved inside this container or keep absolute to parent?
              Lets keep drag overlay in parent but ensure this div takes remaining space
          */}
          {isDragging && (
            <div className="absolute inset-4 z-50 bg-primary-500/10 dark:bg-primary-500/20 backdrop-blur-sm border-4 border-primary-500 border-dashed rounded-xl flex flex-col items-center justify-center animate-in fade-in duration-200 pointer-events-none">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-full shadow-xl mb-4">
                <Upload className="h-10 w-10 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-xl font-bold text-primary-700 dark:text-primary-300">
                Drop files to upload
              </h3>
            </div>
          )}

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
                  <button onClick={() => openModal('newFolder')} className="btn-secondary">
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
              data-testid="drive-items"
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
        </div>

        <DetailsPanel />
        {showComments && currentFolderUuid && (
          <div className="w-80 h-full border-l border-gray-100 dark:border-gray-800 hidden md:block shrink-0 bg-white dark:bg-gray-900">
            <CommentsPanel resourceType="folder" resourceUuid={currentFolderUuid} />
          </div>
        )}
      </div>

      {/* Modals */}
      <NewFolderModal />
      <RenameModal />
      <DeleteConfirmModal />
      <ShareModal />
      <UploadDropzone />
    </div>
  );
}
