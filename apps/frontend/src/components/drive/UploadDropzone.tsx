'use client';

import { useCallback, useRef, useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useUploadFile } from '../../hooks/use-files';
import { useDriveStore } from '../../store/drive.store';

export function UploadDropzone() {
  const { currentFolderUuid } = useDriveStore();
  const uploadFile = useUploadFile();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setStatus('uploading');
      try {
        for (let i = 0; i < files.length; i++) {
          await uploadFile.mutateAsync({
            file: files[i],
            folderUuid: currentFolderUuid ?? undefined,
          });
        }
        setStatus('success');
        setTimeout(() => setStatus('idle'), 2000);
      } catch {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    },
    [currentFolderUuid, uploadFile],
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
      />
      {status !== 'idle' && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 px-4 py-3">
          {status === 'uploading' && (
            <>
              <Loader2 className="h-5 w-5 text-primary-500 animate-spin" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Uploading...</span>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Upload complete!</span>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Upload failed</span>
            </>
          )}
        </div>
      )}
    </>
  );
}

export function triggerUpload() {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  input?.click();
}
