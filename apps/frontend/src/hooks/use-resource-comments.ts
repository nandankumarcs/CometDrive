import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useFeatureFlags } from '../store/feature-flags.store';

export interface ResourceComment {
  uuid: string;
  content: string;
  created_at: string;
  author: { uuid: string; first_name: string; last_name: string };
  canDelete: boolean;
}

export function useResourceComments(
  resourceType: 'file' | 'folder',
  resourceUuid: string,
  enabled = true,
) {
  const { isEnabled } = useFeatureFlags();

  return useQuery<ResourceComment[]>({
    queryKey: ['resource-comments', resourceType, resourceUuid],
    queryFn: async () => {
      const res = await api.get(`/comments/${resourceType}/${resourceUuid}`);
      return res.data.data;
    },
    enabled: enabled && isEnabled('resourceComments') && !!resourceUuid,
  });
}

export function useCreateResourceComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      resourceType: 'file' | 'folder';
      resourceUuid: string;
      content: string;
    }) => {
      const res = await api.post(`/comments/${payload.resourceType}/${payload.resourceUuid}`, {
        content: payload.content,
      });
      return res.data.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: ['resource-comments', vars.resourceType, vars.resourceUuid],
      });
    },
  });
}

export function useDeleteResourceComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      resourceType: 'file' | 'folder';
      resourceUuid: string;
      commentUuid: string;
    }) => {
      await api.delete(`/comments/${payload.commentUuid}`);
      return payload;
    },
    onSuccess: (payload) => {
      qc.invalidateQueries({
        queryKey: ['resource-comments', payload.resourceType, payload.resourceUuid],
      });
    },
  });
}
