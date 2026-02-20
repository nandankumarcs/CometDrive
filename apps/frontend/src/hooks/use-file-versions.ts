import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useFeatureFlags } from '../store/feature-flags.store';

export interface FileVersionItem {
  uuid: string;
  message?: string;
  created_at: string;
}

export function useFileVersions(fileUuid: string, enabled = true) {
  const { isEnabled } = useFeatureFlags();

  return useQuery<FileVersionItem[]>({
    queryKey: ['file-versions', fileUuid],
    queryFn: async () => {
      const res = await api.get(`/files/${fileUuid}/versions`);
      return res.data.data;
    },
    enabled: enabled && isEnabled('fileVersions') && !!fileUuid,
  });
}
