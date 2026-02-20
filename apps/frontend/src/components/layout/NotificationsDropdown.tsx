'use client';

import { useNotifications } from '../../hooks/use-notifications';

export function NotificationsDropdown() {
  const { data: notifications } = useNotifications(false);

  if (!notifications) {
    return null;
  }

  return null;
}
