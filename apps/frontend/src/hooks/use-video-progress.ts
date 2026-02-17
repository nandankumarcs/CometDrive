import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface PlaybackProgress {
  fileUuid: string;
  positionSeconds: number;
  durationSeconds: number;
  progressPercent: number;
  lastWatchedAt: string;
}

export interface ContinueWatchingItem {
  file: {
    uuid: string;
    name: string;
    mime_type: string;
    size: number;
    updated_at: string;
  };
  positionSeconds: number;
  durationSeconds: number;
  progressPercent: number;
  lastWatchedAt: string;
}

interface UpdatePlaybackProgressInput {
  fileUuid: string;
  positionSeconds: number;
  durationSeconds: number;
}

const QUERY_KEYS = {
  continueWatching: ['continue-watching'],
  playbackProgress: (fileUuid: string) => ['playback-progress', fileUuid],
};

export function useContinueWatching(enabled = true) {
  return useQuery<ContinueWatchingItem | null>({
    queryKey: QUERY_KEYS.continueWatching,
    queryFn: async () => {
      const res = await api.get('/files/continue-watching');
      return res.data.data;
    },
    enabled,
  });
}

export function usePlaybackProgress(fileUuid: string, enabled = true) {
  return useQuery<PlaybackProgress | null>({
    queryKey: QUERY_KEYS.playbackProgress(fileUuid),
    queryFn: async () => {
      const res = await api.get(`/files/${fileUuid}/playback-progress`);
      return res.data.data;
    },
    enabled: enabled && !!fileUuid,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useUpdatePlaybackProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      fileUuid,
      positionSeconds,
      durationSeconds,
    }: UpdatePlaybackProgressInput) => {
      const res = await api.put(`/files/${fileUuid}/playback-progress`, {
        positionSeconds,
        durationSeconds,
      });
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.continueWatching });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.playbackProgress(variables.fileUuid) });
    },
  });
}

export function useDismissPlaybackProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fileUuid: string) => {
      const res = await api.delete(`/files/${fileUuid}/playback-progress`);
      return res.data.data;
    },
    onSuccess: (_data, fileUuid) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.continueWatching });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.playbackProgress(fileUuid) });
    },
  });
}
