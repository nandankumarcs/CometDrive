'use client';

import { useCallback, useRef } from 'react';
import { useUploadFile } from '../../hooks/use-files';
import { useDriveStore } from '../../store/drive.store';

export function UploadDropzone() {
  const { currentFolderUuid } = useDriveStore();
  const uploadFile = useUploadFile();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      try {
        for (let i = 0; i < files.length; i++) {
          await uploadFile.mutateAsync({
            file: files[i],
            folderUuid: currentFolderUuid ?? undefined,
          });
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }
    },
    [currentFolderUuid, uploadFile],
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        data-testid="upload-input"
        className="hidden"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
      />
    </>
  );
}

export function triggerUpload() {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  input?.click();
}
