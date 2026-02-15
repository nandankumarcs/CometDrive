import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export const useFolderAncestry = (folderUuid: string | null) => {
  return useQuery({
    queryKey: ['folder-ancestry', folderUuid],
    queryFn: async () => {
      if (!folderUuid) return [];
      const { data } = await api.get(`/folders/${folderUuid}/ancestry`);
      return data.data; // API returns { success: true, data: ... }
    },
    enabled: !!folderUuid,
  });
};
