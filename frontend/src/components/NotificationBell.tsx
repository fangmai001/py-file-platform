import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { listNotifications, markNotificationRead } from "../api/notifications";
import type { NotificationItem } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { cn } from "../lib/utils";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("zh-TW");
}

function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[] | null>(null);

  async function loadNotifications() {
    try {
      setNotifications(await listNotifications());
    } catch {
      // Best-effort: a failed notification fetch shouldn't block the rest of the page.
    }
  }

  useEffect(() => {
    if (!user) {
      setNotifications(null);
      return;
    }
    loadNotifications();
  }, [user]);

  if (!user) {
    return null;
  }

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  async function handleMarkRead(notification: NotificationItem) {
    if (notification.is_read) {
      return;
    }
    try {
      const updated = await markNotificationRead(notification.id);
      setNotifications((current) => current?.map((n) => (n.id === updated.id ? updated : n)) ?? current);
    } catch {
      // Best-effort: leave the notification as unread in the UI if the request fails.
    }
  }

  return (
    <Dialog onOpenChange={(open) => open && loadNotifications()}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="通知" title="通知" />
        }
      >
        <Bell />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[0.6rem] font-medium text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>通知</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
          {notifications === null && <p className="text-sm text-muted-foreground">載入中…</p>}
          {notifications !== null && notifications.length === 0 && (
            <p className="text-sm text-muted-foreground">目前沒有通知</p>
          )}
          {notifications?.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleMarkRead(n)}
              className={cn(
                "flex flex-col gap-1 rounded-md border border-border p-3 text-left text-sm transition-colors hover:bg-accent",
                !n.is_read && "bg-accent/50 font-medium",
              )}
            >
              <span>{n.message}</span>
              <span className="text-xs font-normal text-muted-foreground">{formatDateTime(n.created_at)}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NotificationBell;
