import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useDriveStore } from '../store/drive.store';

export interface FileItem {
  id: number;
  uuid: string;
  name: string;
  size: number;
  mime_type: string;
  storage_key: string;
  folder_id: number | null;
  user_id: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useFiles(folderUuid?: string | null, isTrashed = false) {
  const { searchQuery, sortBy, sortOrder, filterType, isStarred } = useDriveStore();

  const params = new URLSearchParams();
  if (folderUuid) params.set('folderUuid', folderUuid);
  if (isTrashed) params.set('isTrashed', 'true');
  if (isStarred) params.set('isStarred', 'true');
  if (searchQuery) params.set('search', searchQuery);
  if (filterType) params.set('type', filterType);
  params.set('sort', sortBy);
  params.set('order', sortOrder);

  return useQuery<FileItem[]>({
    queryKey: [
      'files',
      folderUuid ?? 'root',
      isTrashed,
      isStarred,
      searchQuery,
      filterType,
      sortBy,
      sortOrder,
    ],
    queryFn: async () => {
      const res = await api.get(`/files?${params.toString()}`);
      return res.data.data;
    },
  });
}

export function useToggleStarFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      const res = await api.post(`/files/${uuid}/toggle-star`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  });
}

export function useUploadFile() {
  const qc = useQueryClient();
  const { addUpload, updateUploadProgress, completeUpload, failUpload } = useDriveStore();

  return useMutation({
    mutationFn: async ({ file, folderUuid }: { file: File; folderUuid?: string }) => {
      const uploadId = Math.random().toString(36).substring(7);
      addUpload(uploadId, file.name);

      try {
        const formData = new FormData();
        formData.append('file', file);
        if (folderUuid) formData.append('folderUuid', folderUuid);

        const res = await api.post('/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              updateUploadProgress(uploadId, progress);
            }
          },
        });

        completeUpload(uploadId);
        return res.data.data;
      } catch (error: any) {
        failUpload(uploadId, error.message || 'Upload failed');
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  });
}

export function useRenameFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uuid, name }: { uuid: string; name: string }) => {
      const res = await api.patch(`/files/${uuid}`, { name });
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  });
}

export function useTrashFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      await api.delete(`/files/${uuid}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  });
}

export function useRestoreFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      await api.post(`/files/${uuid}/restore`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  });
}

export function useDeleteFilePermanent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      await api.delete(`/files/${uuid}/permanent`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  });
}

export function useEmptyTrashFiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete('/files/trash/empty');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  });
}

export function useDownloadFile() {
  return useMutation({
    mutationFn: async (uuid: string) => {
      const res = await api.get(`/files/${uuid}/download`, { responseType: 'blob' });
      return res.data;
    },
  });
}

export function useDownloadZip() {
  return useMutation({
    mutationFn: async (uuids: string[]) => {
      const res = await api.post('/files/download-zip', { uuids }, { responseType: 'blob' });
      return res.data;
    },
  });
}
