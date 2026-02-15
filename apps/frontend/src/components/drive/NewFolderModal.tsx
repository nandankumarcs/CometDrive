'use client';

import { useState, useRef, useEffect } from 'react';
import { FolderPlus, X, Loader2 } from 'lucide-react';
import { useDriveStore } from '../../store/drive.store';
import { useCreateFolder } from '../../hooks/use-folders';

export function NewFolderModal() {
  const { activeModal, closeModal, currentFolderUuid } = useDriveStore();
  const createFolder = useCreateFolder();
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeModal === 'newFolder') {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeModal]);

  if (activeModal !== 'newFolder') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createFolder.mutateAsync({
      name: name.trim(),
      parentUuid: currentFolderUuid ?? undefined,
    });
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
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Folder</h3>
          </div>
          <button
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            className="form-input-field mb-4"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeModal} className="btn-secondary text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createFolder.isPending}
              className="btn-primary text-sm"
            >
              {createFolder.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
