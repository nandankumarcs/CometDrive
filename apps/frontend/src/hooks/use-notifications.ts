import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useFeatureFlags } from '../store/feature-flags.store';

export interface NotificationItem {
  uuid: string;
  type: string;
  title: string;
  body?: string;
  is_read: boolean;
  created_at: string;
}

export function useNotifications(enabled = true) {
  const { isEnabled } = useFeatureFlags();

  return useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.data;
    },
    enabled: enabled && isEnabled('notifications'),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      const res = await api.patch(`/notifications/${uuid}/read`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
