import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface Folder {
  id: number;
  uuid: string;
  name: string;
  parent_id: number | null;
  parent_uuid: string | null;
  user_id: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useFolders(parentUuid?: string | null, isTrashed = false) {
  const params = new URLSearchParams();
  if (parentUuid) params.set('parentUuid', parentUuid);
  if (isTrashed) params.set('isTrashed', 'true');

  return useQuery<Folder[]>({
    queryKey: ['folders', parentUuid ?? 'root', isTrashed],
    queryFn: async () => {
      const res = await api.get(`/folders?${params.toString()}`);
      return res.data.data;
    },
  });
}

export function useFolderDetails(uuid: string | null) {
  return useQuery<Folder>({
    queryKey: ['folder', uuid],
    queryFn: async () => {
      const res = await api.get(`/folders/${uuid}`);
      return res.data.data;
    },
    enabled: !!uuid,
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; parentUuid?: string }) => {
      const res = await api.post('/folders', data);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uuid, name }: { uuid: string; name: string }) => {
      const res = await api.patch(`/folders/${uuid}`, { name });
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  });
}

export function useTrashFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      await api.delete(`/folders/${uuid}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  });
}

export function useRestoreFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      await api.post(`/folders/${uuid}/restore`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  });
}

export function useDeleteFolderPermanent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      await api.delete(`/folders/${uuid}/permanent`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  });
}
