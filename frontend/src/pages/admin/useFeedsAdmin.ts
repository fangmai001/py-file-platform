import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ApiError } from "../../api/client";
import { createFeed, deleteFeed, fetchFeedNow, listAdminFeeds, updateFeed } from "../../api/feeds";
import type { AdminFeedSource } from "../../api/types";
import { useConfirm } from "../../context/ConfirmDialogContext";

/** 代表「不屬於任何 folder」的哨符值——Select item 的 value 不能是空字串。 */
export const NO_FOLDER = "none";

export interface FeedDraft {
  title: string;
  description: string;
  url: string;
  folderId: string;
  isPublic: boolean;
  isActive: boolean;
}

function toFeedDrafts(items: AdminFeedSource[]): Record<number, FeedDraft> {
  return Object.fromEntries(
    items.map((feed) => [
      feed.id,
      {
        title: feed.title,
        description: feed.description ?? "",
        url: feed.url,
        folderId: feed.folder_id !== null ? String(feed.folder_id) : NO_FOLDER,
        isPublic: feed.is_public,
        isActive: feed.is_active,
      },
    ]),
  );
}

/**
 * 判斷某一列是否與伺服器上的資料不同。正規化方式與 handleSaveFeed 的 payload 完全一致，
 * 因此「儲存」按鈕絕不會為了一次什麼都不會送出的編輯而啟用。
 */
export function isFeedDirty(feed: AdminFeedSource, draft: FeedDraft | undefined): boolean {
  if (!draft) {
    return false;
  }
  return (
    draft.title !== feed.title ||
    (draft.description.trim() || null) !== (feed.description ?? null) ||
    draft.url !== feed.url ||
    (draft.folderId === NO_FOLDER ? null : Number(draft.folderId)) !== feed.folder_id ||
    draft.isPublic !== feed.is_public ||
    draft.isActive !== feed.is_active
  );
}

/** State and actions behind the RSS 訂閱 tab. */
export function useFeedsAdmin({ reloadAuditLogs }: { reloadAuditLogs: () => Promise<void> }) {
  const confirm = useConfirm();

  const [feeds, setFeeds] = useState<AdminFeedSource[] | null>(null);
  const [feedsError, setFeedsError] = useState<string | null>(null);
  const [feedDrafts, setFeedDrafts] = useState<Record<number, FeedDraft>>({});
  const [newFeedTitle, setNewFeedTitle] = useState("");
  const [newFeedDescription, setNewFeedDescription] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedFolderId, setNewFeedFolderId] = useState(NO_FOLDER);
  const [isCreatingFeed, setIsCreatingFeed] = useState(false);
  // 抓取是同步的網路操作，可能要好幾秒；記住是哪一列正在跑，才能只停用那一顆按鈕。
  const [fetchingFeedId, setFetchingFeedId] = useState<number | null>(null);

  async function loadFeeds() {
    try {
      const data = await listAdminFeeds();
      setFeeds(data);
      setFeedDrafts(toFeedDrafts(data));
      setFeedsError(null);
    } catch (err) {
      setFeedsError(err instanceof ApiError ? err.message : "無法載入訂閱來源列表");
    }
  }

  useEffect(() => {
    loadFeeds();
  }, []);

  async function handleCreateFeed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingFeed(true);
    setFeedsError(null);
    try {
      await createFeed({
        title: newFeedTitle,
        description: newFeedDescription.trim() || null,
        url: newFeedUrl,
        folder_id: newFeedFolderId === NO_FOLDER ? null : Number(newFeedFolderId),
      });
      setNewFeedTitle("");
      setNewFeedDescription("");
      setNewFeedUrl("");
      setNewFeedFolderId(NO_FOLDER);
      await loadFeeds();
      await reloadAuditLogs();
      toast.success(`已新增訂閱來源「${newFeedTitle}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "新增訂閱來源失敗";
      setFeedsError(message);
      toast.error(message);
    } finally {
      setIsCreatingFeed(false);
    }
  }

  async function handleSaveFeed(feed: AdminFeedSource) {
    const draft = feedDrafts[feed.id];
    if (!isFeedDirty(feed, draft)) {
      return;
    }
    try {
      await updateFeed(feed.id, {
        title: draft.title,
        description: draft.description.trim() || null,
        url: draft.url,
        folder_id: draft.folderId === NO_FOLDER ? null : Number(draft.folderId),
        is_public: draft.isPublic,
        is_active: draft.isActive,
      });
      await loadFeeds();
      await reloadAuditLogs();
      toast.success(`已更新訂閱來源「${draft.title}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新訂閱來源失敗";
      setFeedsError(message);
      toast.error(message);
    }
  }

  async function handleDeleteFeed(feed: AdminFeedSource) {
    const ok = await confirm({
      title: "刪除訂閱來源",
      description: `確定要刪除訂閱來源「${feed.title}」嗎？已抓回的文章會一併刪除，此操作無法復原。`,
      confirmLabel: "刪除",
      variant: "destructive",
    });
    if (!ok) {
      return;
    }
    try {
      await deleteFeed(feed.id);
      await loadFeeds();
      await reloadAuditLogs();
      toast.success(`已刪除訂閱來源「${feed.title}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "刪除訂閱來源失敗";
      setFeedsError(message);
      toast.error(message);
    }
  }

  async function handleFetchFeed(feed: AdminFeedSource) {
    setFetchingFeedId(feed.id);
    setFeedsError(null);
    try {
      const result = await fetchFeedNow(feed.id);
      // 重新載入必須排在顯示結果之前：loadFeeds() 成功時會清掉 feedsError，
      // 順序反過來的話，剛設好的失敗訊息會立刻被自己抹掉。
      await loadFeeds();
      await reloadAuditLogs();

      // 抓取失敗時後端仍回 200——失敗原因在 result.error 裡，而不是丟出 ApiError。
      if (result.status === "error") {
        const message = `「${feed.title}」抓取失敗：${result.error ?? "未知錯誤"}`;
        setFeedsError(message);
        toast.error(message);
      } else if (result.status === "not_modified") {
        toast.success(`「${feed.title}」自上次抓取以來沒有更新`);
      } else {
        toast.success(`「${feed.title}」新增 ${result.created} 則、略過 ${result.skipped} 則`);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "抓取訂閱來源失敗";
      setFeedsError(message);
      toast.error(message);
    } finally {
      setFetchingFeedId(null);
    }
  }

  return {
    reload: loadFeeds,
    feeds,
    feedsError,
    feedDrafts,
    setFeedDrafts,
    newFeedTitle,
    setNewFeedTitle,
    newFeedDescription,
    setNewFeedDescription,
    newFeedUrl,
    setNewFeedUrl,
    newFeedFolderId,
    setNewFeedFolderId,
    isCreatingFeed,
    fetchingFeedId,
    handleCreateFeed,
    handleSaveFeed,
    handleDeleteFeed,
    handleFetchFeed,
  };
}
