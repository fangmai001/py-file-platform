import { getJSON, patchJSON } from "./client";
import type { NotificationItem } from "./types";

export function listNotifications(skip = 0, limit = 50): Promise<NotificationItem[]> {
  return getJSON<NotificationItem[]>(`/notifications?skip=${skip}&limit=${limit}`);
}

export function markNotificationRead(notificationId: number): Promise<NotificationItem> {
  return patchJSON<NotificationItem>(`/notifications/${notificationId}`, { is_read: true });
}

export function markAllNotificationsRead(): Promise<{ updated: number }> {
  return patchJSON<{ updated: number }>("/notifications/read-all", {});
}
