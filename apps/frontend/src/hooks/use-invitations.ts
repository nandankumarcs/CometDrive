'use client';

import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';

export interface InvitationRecord {
  uuid: string;
  email: string;
  token: string;
  user_type_id: number;
  expires_at: string;
  accepted_at?: string | null;
  is_revoked?: boolean;
}

export function useCreateInvitation() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<InvitationRecord>('/invitations', {});
      return res.data;
    },
  });
}
