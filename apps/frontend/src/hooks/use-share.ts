import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';

export type ShareResourceType = 'file' | 'folder';
export type SharePermission = 'viewer' | 'editor';

export interface Share {
  uuid: string;
  token: string;
  file_id: number | null;
  folder_id: number | null;
  recipient_id: number | null;
  created_by: number;
  is_active: boolean;
  permission: SharePermission;
  expires_at: string | null;
  views: number;
  created_at: string;
  recipient?: {
    uuid: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  file?: {
    uuid: string;
    name: string;
    mime_type: string;
    size: number;
    created_at: string;
    updated_at: string;
  } | null;
  folder?: {
    uuid: string;
    name: string;
    created_at: string;
    updated_at: string;
  } | null;
  creator?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function useGetShares(
  resourceType: ShareResourceType | null,
  resourceUuid: string | null,
  enabled = true,
) {
  const userUuid = useAuthStore((state) => state.user?.uuid);

  return useQuery({
    queryKey: ['shares', userUuid, resourceType, resourceUuid],
    queryFn: async () => {
      if (!resourceType || !resourceUuid) return [];
      const res = await api.get<{ data: Share[] }>(
        `/shares/resource/${resourceType}/${resourceUuid}`,
      );
      return res.data.data;
    },
    enabled: !!userUuid && !!resourceType && !!resourceUuid && enabled,
    retry: false,
  });
}

export function useCreateShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      resourceType,
      resourceUuid,
      expiresAt,
      recipientEmail,
      permission,
    }: {
      resourceType: ShareResourceType;
      resourceUuid: string;
      expiresAt?: Date;
      recipientEmail?: string;
      permission?: SharePermission;
    }) => {
      const payload: {
        fileId?: string;
        folderId?: string;
        expiresAt?: Date;
        recipientEmail?: string;
        permission?: SharePermission;
      } = {
        expiresAt,
      };

      if (resourceType === 'file') {
        payload.fileId = resourceUuid;
      } else {
        payload.folderId = resourceUuid;
      }

      if (recipientEmail) {
        payload.recipientEmail = recipientEmail;
      }

      if (permission) {
        payload.permission = permission;
      }

      const res = await api.post<{ data: Share }>('/shares', payload);
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shares'] });
      queryClient.invalidateQueries({ queryKey: ['shared-with-me'] });
    },
  });
}

export function useSharedWithMe() {
  const userUuid = useAuthStore((state) => state.user?.uuid);

  return useQuery({
    queryKey: ['shared-with-me', userUuid],
    queryFn: async () => {
      const res = await api.get('/shares/shared-with-me');
      return res.data.data;
    },
    enabled: !!userUuid,
  });
}

export function useRevokeShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shareUuid,
      resourceType,
      resourceUuid,
    }: {
      shareUuid: string;
      resourceType: ShareResourceType;
      resourceUuid: string;
    }) => {
      await api.delete(`/shares/${shareUuid}`);
      return { resourceType, resourceUuid };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares'] });
      queryClient.invalidateQueries({ queryKey: ['shared-with-me'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function useUpdateShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shareUuid,
      permission,
      expiresAt,
    }: {
      shareUuid: string;
      permission?: SharePermission;
      expiresAt?: Date | null;
    }) => {
      const res = await api.patch<{ data: Share }>(`/shares/${shareUuid}`, {
        permission,
        expiresAt,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares'] });
    },
  });
}
