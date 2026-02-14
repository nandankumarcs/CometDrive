import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

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

export function useFiles(folderUuid?: string | null) {
  const params = new URLSearchParams();
  if (folderUuid) params.set('folderUuid', folderUuid);

  return useQuery<FileItem[]>({
    queryKey: ['files', folderUuid ?? 'root'],
    queryFn: async () => {
      const res = await api.get(`/files?${params.toString()}`);
      return res.data.data;
    },
  });
}

export function useUploadFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, folderUuid }: { file: File; folderUuid?: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (folderUuid) formData.append('folderUuid', folderUuid);
      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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

export function useDownloadFile() {
  return useMutation({
    mutationFn: async (uuid: string) => {
      const res = await api.get(`/files/${uuid}/download`, { responseType: 'blob' });
      return res.data;
    },
  });
}
