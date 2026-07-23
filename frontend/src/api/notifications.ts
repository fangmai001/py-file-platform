import { getJSON, patchJSON } from "./client";
import type { NotificationItem } from "./types";

export function listNotifications(): Promise<NotificationItem[]> {
  return getJSON<NotificationItem[]>("/notifications");
}

export function markNotificationRead(notificationId: number): Promise<NotificationItem> {
  return patchJSON<NotificationItem>(`/notifications/${notificationId}`, { is_read: true });
}
