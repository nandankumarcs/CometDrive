'use client';

import { useState, useRef, useEffect } from 'react';
import { Pencil, X, Loader2 } from 'lucide-react';
import { useDriveStore } from '../../store/drive.store';
import { useRenameFolder } from '../../hooks/use-folders';
import { useRenameFile } from '../../hooks/use-files';

export function RenameModal() {
  const { activeModal, closeModal, contextItem } = useDriveStore();
  const renameFolder = useRenameFolder();
  const renameFile = useRenameFile();
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeModal === 'rename' && contextItem) {
      setName(contextItem.name);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [activeModal, contextItem]);

  if (activeModal !== 'rename' || !contextItem) return null;

  const mutation = contextItem.type === 'folder' ? renameFolder : renameFile;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === contextItem.name) return;
    await mutation.mutateAsync({ uuid: contextItem.uuid, name: name.trim() });
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
            <Pencil className="h-5 w-5 text-primary-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rename</h3>
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
            placeholder="New name"
            className="form-input-field mb-4"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeModal} className="btn-secondary text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || mutation.isPending}
              className="btn-primary text-sm"
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
