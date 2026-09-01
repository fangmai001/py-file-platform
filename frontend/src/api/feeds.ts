import { del, getJSON, patchJSON, postJSON } from "./client";
import type {
  AdminFeedSource,
  BatchFetchResult,
  FeedArticle,
  FeedFetchResult,
  FeedSettings,
  FeedSource,
} from "./types";

export interface CreateFeedInput {
  title: string;
  description?: string | null;
  url: string;
  folder_id?: number | null;
  is_public?: boolean;
  is_active?: boolean;
}

export interface UpdateFeedInput {
  title?: string;
  description?: string | null;
  url?: string;
  folder_id?: number | null;
  is_public?: boolean;
  is_active?: boolean;
}

export interface ListFeedArticlesOptions {
  feedId?: number | null;
  /** 依來源所屬的資料夾篩選。與 feedId 可以並用，兩者都會套用。 */
  folderId?: number | null;
  limit?: number;
  offset?: number;
}

/** 公開的訂閱來源清單，只含公開且啟用中的來源。 */
export function listFeeds(): Promise<FeedSource[]> {
  return getJSON<FeedSource[]>("/feeds");
}

/** 管理後台專用：含私密與停用的來源，以及最後一次抓取失敗的原因。 */
export function listAdminFeeds(): Promise<AdminFeedSource[]> {
  return getJSON<AdminFeedSource[]>("/feeds/admin");
}

export function listFeedArticles(options: ListFeedArticlesOptions = {}): Promise<FeedArticle[]> {
  const params = new URLSearchParams();
  if (options.feedId != null) {
    params.set("feed_id", String(options.feedId));
  }
  if (options.folderId != null) {
    params.set("folder_id", String(options.folderId));
  }
  if (options.limit != null) {
    params.set("limit", String(options.limit));
  }
  if (options.offset != null) {
    params.set("offset", String(options.offset));
  }
  const query = params.toString();
  return getJSON<FeedArticle[]>(query ? `/feeds/items?${query}` : "/feeds/items");
}

export function createFeed(input: CreateFeedInput): Promise<AdminFeedSource> {
  return postJSON<AdminFeedSource>("/feeds", input);
}

export function updateFeed(feedId: number, input: UpdateFeedInput): Promise<AdminFeedSource> {
  return patchJSON<AdminFeedSource>(`/feeds/${feedId}`, input);
}

export function deleteFeed(feedId: number): Promise<void> {
  return del(`/feeds/${feedId}`);
}

/** 立即抓取單一來源。抓取失敗時後端仍回 200，失敗原因在回應的 error 欄位裡。 */
export function fetchFeedNow(feedId: number): Promise<FeedFetchResult> {
  return postJSON<FeedFetchResult>(`/feeds/${feedId}/fetch`, {});
}

/** 立即抓取全部啟用中的來源。與單一來源的抓取一樣是同步的，來源多時可能要跑數十秒。 */
export function fetchAllFeeds(): Promise<BatchFetchResult> {
  return postJSON<BatchFetchResult>("/feeds/fetch-all", {});
}

export function getFeedSettings(): Promise<FeedSettings> {
  return getJSON<FeedSettings>("/feed-settings");
}

export function updateFeedSettings(input: {
  fetch_enabled?: boolean;
  fetch_interval_minutes?: number;
}): Promise<FeedSettings> {
  return patchJSON<FeedSettings>("/feed-settings", input);
}
