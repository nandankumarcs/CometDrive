import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useFeatureFlags } from '../store/feature-flags.store';

export interface CommentUser {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
}

export interface CommentItem {
  uuid: string;
  content: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  parent_id: number | null;
  user: CommentUser;
}

export function useComments(resourceType: 'file' | 'folder', uuid: string, enabled = true) {
  const { isEnabled } = useFeatureFlags();
  const canLoad = enabled && isEnabled('resourceComments') && !!uuid;

  return useQuery<CommentItem[]>({
    queryKey: ['comments', resourceType, uuid],
    queryFn: async () => {
      const res = await api.get(`/comments/${resourceType}/${uuid}`);
      return res.data.data;
    },
    enabled: canLoad,
  });
}

export function useCreateComment(resourceType: 'file' | 'folder', resourceUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { content: string; parentUuid?: string; metadata?: any }) => {
      const payload = {
        ...data,
        [resourceType === 'file' ? 'fileUuid' : 'folderUuid']: resourceUuid,
      };
      const res = await api.post('/comments', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', resourceType, resourceUuid] });
    },
  });
}

export function useDeleteComment(resourceType: 'file' | 'folder', resourceUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentUuid: string) => {
      await api.delete(`/comments/${commentUuid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', resourceType, resourceUuid] });
    },
  });
}
