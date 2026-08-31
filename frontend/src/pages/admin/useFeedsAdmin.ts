import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ApiError } from "../../api/client";
import {
  createFeed,
  deleteFeed,
  fetchAllFeeds,
  fetchFeedNow,
  getFeedSettings,
  listAdminFeeds,
  updateFeed,
  updateFeedSettings,
} from "../../api/feeds";
import type { AdminFeedSource, FeedSettings } from "../../api/types";
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

/**
 * 抓取排程的編輯草稿。間隔以字串保存，因為輸入框清空的中間狀態不是合法的數字，
 * 硬轉成 number 會在使用者刪掉最後一個字元時跳回 0。
 */
export interface FeedScheduleDraft {
  fetchEnabled: boolean;
  fetchIntervalMinutes: string;
}

/** 與後端 app/core/feed_schedule.py 的 MIN／MAX_FETCH_INTERVAL_MINUTES 是同一組數字，必須一起改。 */
export const MIN_FETCH_INTERVAL_MINUTES = 5;
export const MAX_FETCH_INTERVAL_MINUTES = 1440;

function toScheduleDraft(settings: FeedSettings): FeedScheduleDraft {
  return {
    fetchEnabled: settings.fetch_enabled,
    fetchIntervalMinutes: String(settings.fetch_interval_minutes),
  };
}

/** 判斷排程設定是否與伺服器上的不同，讓「儲存」不會為了一次什麼都不送的編輯而啟用。 */
export function isScheduleDirty(settings: FeedSettings | null, draft: FeedScheduleDraft): boolean {
  if (!settings) {
    return false;
  }
  return (
    draft.fetchEnabled !== settings.fetch_enabled ||
    draft.fetchIntervalMinutes !== String(settings.fetch_interval_minutes)
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

  const [feedSettings, setFeedSettings] = useState<FeedSettings | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<FeedScheduleDraft>({
    fetchEnabled: false,
    fetchIntervalMinutes: "60",
  });
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isFetchingAll, setIsFetchingAll] = useState(false);

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

  async function loadFeedSettings() {
    try {
      const data = await getFeedSettings();
      setFeedSettings(data);
      setScheduleDraft(toScheduleDraft(data));
    } catch (err) {
      setFeedsError(err instanceof ApiError ? err.message : "無法載入抓取排程設定");
    }
  }

  useEffect(() => {
    loadFeeds();
    loadFeedSettings();
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

  async function handleSaveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingSchedule(true);
    setFeedsError(null);
    try {
      const data = await updateFeedSettings({
        fetch_enabled: scheduleDraft.fetchEnabled,
        fetch_interval_minutes: Number(scheduleDraft.fetchIntervalMinutes),
      });
      setFeedSettings(data);
      setScheduleDraft(toScheduleDraft(data));
      await reloadAuditLogs();
      toast.success(data.fetch_enabled ? `已啟用定時抓取，每 ${data.fetch_interval_minutes} 分鐘一次` : "已停用定時抓取");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "儲存抓取排程失敗";
      setFeedsError(message);
      toast.error(message);
    } finally {
      setIsSavingSchedule(false);
    }
  }

  async function handleFetchAll() {
    setIsFetchingAll(true);
    setFeedsError(null);
    try {
      const result = await fetchAllFeeds();
      // 順序與 handleFetchFeed 相同：重新載入會清掉 feedsError，必須排在顯示結果之前。
      await loadFeeds();
      await loadFeedSettings();
      await reloadAuditLogs();

      if (result.failed > 0) {
        // 整批抓取即使有來源失敗仍回 200，失敗的細節在 errors 裡而不是 ApiError。
        const message = `${result.summary}。失敗原因：${result.errors.join("；")}`;
        setFeedsError(message);
        toast.error(`有 ${result.failed} 個來源抓取失敗`);
      } else {
        toast.success(result.summary);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "抓取全部訂閱來源失敗";
      setFeedsError(message);
      toast.error(message);
    } finally {
      setIsFetchingAll(false);
    }
  }

  return {
    reload: loadFeeds,
    feedSettings,
    scheduleDraft,
    setScheduleDraft,
    isSavingSchedule,
    isFetchingAll,
    handleSaveSchedule,
    handleFetchAll,
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
