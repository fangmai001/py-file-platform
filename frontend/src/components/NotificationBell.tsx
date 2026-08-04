import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "../api/notifications";
import type { NotificationItem } from "../api/types";
import { useAuth } from "../context/AuthContext";
import EmptyState from "./EmptyState";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Skeleton } from "./ui/skeleton";
import { formatDateTime, formatRelativeTime } from "../lib/format";
import { cn } from "../lib/utils";

const PAGE_SIZE = 50;

function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  async function loadNotifications() {
    try {
      const page = await listNotifications(0, PAGE_SIZE);
      setNotifications(page);
      setHasMore(page.length === PAGE_SIZE);
    } catch {
      // Best-effort: a failed notification fetch shouldn't block the rest of the page.
    }
  }

  useEffect(() => {
    if (!user) {
      setNotifications(null);
      setHasMore(false);
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

  async function handleLoadMore() {
    setIsLoadingMore(true);
    try {
      const page = await listNotifications(notifications?.length ?? 0, PAGE_SIZE);
      setNotifications((current) => (current ?? []).concat(page));
      setHasMore(page.length === PAGE_SIZE);
    } catch {
      // Best-effort: leave the existing list as-is if loading the next page fails.
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleMarkAllRead() {
    setIsMarkingAllRead(true);
    try {
      await markAllNotificationsRead();
      setNotifications((current) => current?.map((n) => ({ ...n, is_read: true })) ?? current);
    } catch {
      // Best-effort: leave notifications as-is in the UI if the request fails.
    } finally {
      setIsMarkingAllRead(false);
    }
  }

  return (
    <Dialog onOpenChange={(open) => open && loadNotifications()}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="relative rounded-full" aria-label="通知" title="通知" />
        }
      >
        <Bell />
        {unreadCount > 0 && (
          // ring-2 ring-background punches the badge out of the bell glyph behind it.
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] font-semibold text-destructive-foreground ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {/* pr-8 keeps 全部標記已讀 clear of DialogContent's absolutely positioned close button,
            which sits at top-2 right-2 and would otherwise overlap the end of the label. */}
        <DialogHeader className="flex-row items-center justify-between pr-8">
          <DialogTitle>通知</DialogTitle>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" disabled={isMarkingAllRead} onClick={handleMarkAllRead}>
              {isMarkingAllRead ? "處理中…" : "全部標記已讀"}
            </Button>
          )}
        </DialogHeader>
        <div className="flex max-h-96 flex-col gap-2 overflow-y-auto scroll-fade-y">
          {notifications === null && (
            <>
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </>
          )}
          {notifications !== null && notifications.length === 0 && (
            <EmptyState icon={BellOff} title="目前沒有通知" className="py-10" />
          )}
          {notifications?.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleMarkRead(n)}
              className={cn(
                "relative flex flex-col gap-1 rounded-lg p-3 pl-4 text-left text-sm transition-colors hover:bg-accent/50",
                !n.is_read &&
                  "bg-accent/50 font-medium before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary",
              )}
            >
              <span>{n.message}</span>
              <span
                className="text-xs font-normal text-muted-foreground"
                title={formatDateTime(n.created_at)}
              >
                {formatRelativeTime(n.created_at)}
              </span>
            </button>
          ))}
          {hasMore && (
            <Button variant="outline" size="sm" disabled={isLoadingMore} onClick={handleLoadMore}>
              {isLoadingMore ? "載入中…" : "載入更多"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NotificationBell;
