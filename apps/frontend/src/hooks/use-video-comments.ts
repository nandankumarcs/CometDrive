import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface VideoComment {
  uuid: string;
  fileUuid: string;
  content: string;
  timestampSeconds: number;
  createdAt: string;
  author: {
    uuid: string;
    firstName: string;
    lastName: string;
  };
  canDelete: boolean;
}

interface CreateVideoCommentInput {
  fileUuid: string;
  content: string;
  timestampSeconds: number;
}

interface DeleteVideoCommentInput {
  fileUuid: string;
  commentUuid: string;
}

const QUERY_KEYS = {
  videoComments: (fileUuid: string) => ['video-comments', fileUuid],
};

export function useVideoComments(fileUuid: string, enabled = true) {
  return useQuery<VideoComment[]>({
    queryKey: QUERY_KEYS.videoComments(fileUuid),
    queryFn: async () => {
      const res = await api.get(`/files/${fileUuid}/comments`);
      return res.data.data;
    },
    enabled: enabled && !!fileUuid,
  });
}

export function useCreateVideoComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fileUuid, content, timestampSeconds }: CreateVideoCommentInput) => {
      const res = await api.post(`/files/${fileUuid}/comments`, {
        content,
        timestampSeconds,
      });
      return res.data.data as VideoComment;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.videoComments(variables.fileUuid) });
    },
  });
}

export function useDeleteVideoComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fileUuid, commentUuid }: DeleteVideoCommentInput) => {
      const res = await api.delete(`/files/${fileUuid}/comments/${commentUuid}`);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.videoComments(variables.fileUuid) });
    },
  });
}
