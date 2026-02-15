'use client';

import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { useDriveStore } from '../../store/drive.store';
import { useDeleteFolderPermanent } from '../../hooks/use-folders';
import { useDeleteFilePermanent } from '../../hooks/use-files';

export function DeleteConfirmModal() {
  const { activeModal, closeModal, contextItem } = useDriveStore();
  const deleteFolder = useDeleteFolderPermanent();
  const deleteFile = useDeleteFilePermanent();

  if (activeModal !== 'delete' || !contextItem) return null;

  const mutation = contextItem.type === 'folder' ? deleteFolder : deleteFile;

  const handleDelete = async () => {
    await mutation.mutateAsync(contextItem.uuid);
    closeModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={closeModal}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Delete permanently?
            </h3>
          </div>
          <button
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          <strong className="text-gray-900 dark:text-white">{contextItem.name}</strong> will be
          permanently deleted. This action cannot be undone.
        </p>

        <div className="flex justify-end gap-2">
          <button onClick={closeModal} className="btn-secondary text-sm">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={mutation.isPending}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-60"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Delete Forever
          </button>
        </div>
      </div>
    </div>
  );
}
