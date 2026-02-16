import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface Share {
  uuid: string;
  token: string;
  file_id: string;
  created_by: string;
  is_active: boolean;
  expires_at: string | null;
  views: number;
  created_at: string;
}

export function useGetShare(fileUuid: string, enabled = true) {
  return useQuery({
    queryKey: ['share', fileUuid],
    queryFn: async () => {
      const res = await api.get<{ data: Share }>(`/shares/file/${fileUuid}`);
      return res.data.data;
    },
    enabled: !!fileUuid && enabled,
    retry: false,
  });
}

export function useCreateShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileUuid,
      expiresAt,
      recipientEmail,
    }: {
      fileUuid: string;
      expiresAt?: Date;
      recipientEmail?: string;
    }) => {
      const res = await api.post<{ data: Share }>('/shares', {
        fileId: fileUuid,
        expiresAt,
        recipientEmail,
      });
      return res.data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['share', variables.fileUuid], data);
      queryClient.invalidateQueries({ queryKey: ['files'] }); // Optional, if we show share icon in list
    },
  });
}

export function useSharedWithMe() {
  return useQuery({
    queryKey: ['shared-with-me'],
    queryFn: async () => {
      const res = await api.get('/shares/shared-with-me');
      return res.data.data;
    },
  });
}

export function useRevokeShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileUuid: string) => {
      await api.delete(`/shares/file/${fileUuid}`);
    },
    onSuccess: (_, fileUuid) => {
      queryClient.setQueryData(['share', fileUuid], null);
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}
