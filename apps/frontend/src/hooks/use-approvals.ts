import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useFeatureFlags } from '../store/feature-flags.store';

export interface ApprovalItem {
  uuid: string;
  status: 'requested' | 'approved' | 'changes_requested';
  created_at: string;
}

export function useApprovals(
  resourceType: 'file' | 'folder',
  resourceUuid: string,
  enabled = true,
) {
  const { isEnabled } = useFeatureFlags();

  return useQuery<ApprovalItem[]>({
    queryKey: ['approvals', resourceType, resourceUuid],
    queryFn: async () => {
      const res = await api.get(`/approvals/${resourceType}/${resourceUuid}`);
      return res.data.data;
    },
    enabled: enabled && isEnabled('approvals') && !!resourceUuid,
  });
}
