import { del, getJSON, patchJSON, postJSON } from "./client";
import type { AdminFeedSource, FeedArticle, FeedFetchResult, FeedSource } from "./types";

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
