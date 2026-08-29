import { useEffect, useState } from "react";
import { ExternalLink, Rss } from "lucide-react";
import { ApiError } from "../api/client";
import { listFeedArticles, listFeeds } from "../api/feeds";
import type { FeedArticle, FeedSource } from "../api/types";
import { formatDateTime, formatRelativeTime } from "../lib/format";
import Callout from "../components/Callout";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import SectionTitle from "../components/SectionTitle";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";

const ALL_FEEDS = "__all__";
const PAGE_SIZE = 20;

/**
 * 摘要一律以純文字呈現。RSS 的 <description> 是外部網站給的 HTML，直接渲染等於把一個
 * 我們無法控制的來源接進 DOM；這裡把標籤剝掉並還原最常見的幾個 entity 就好。
 */
function toPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function FeedsPage() {
  const [feeds, setFeeds] = useState<FeedSource[]>([]);
  const [articles, setArticles] = useState<FeedArticle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedFilter, setFeedFilter] = useState(ALL_FEEDS);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    async function loadFeeds() {
      try {
        setFeeds(await listFeeds());
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "無法載入訂閱來源列表");
      }
    }
    loadFeeds();
  }, []);

  useEffect(() => {
    async function loadArticles() {
      setArticles(null);
      try {
        const data = await listFeedArticles({
          feedId: feedFilter === ALL_FEEDS ? undefined : Number(feedFilter),
          limit: PAGE_SIZE,
        });
        setArticles(data);
        setHasMore(data.length === PAGE_SIZE);
        setError(null);
      } catch (err) {
        setArticles([]);
        setError(err instanceof ApiError ? err.message : "無法載入文章列表");
      }
    }
    loadArticles();
  }, [feedFilter]);

  async function handleLoadMore() {
    setIsLoadingMore(true);
    try {
      const next = await listFeedArticles({
        feedId: feedFilter === ALL_FEEDS ? undefined : Number(feedFilter),
        limit: PAGE_SIZE,
        offset: articles?.length ?? 0,
      });
      setArticles((current) => [...(current ?? []), ...next]);
      setHasMore(next.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "無法載入更多文章");
    } finally {
      setIsLoadingMore(false);
    }
  }

  const feedTitles = new Map(feeds.map((feed) => [feed.id, feed.title]));

  return (
    <div className="page">
      <PageHeader
        title="訂閱文章"
        description="平台定期從外部 RSS／Atom 來源抓回的最新文章，點擊標題會在新分頁開啟原文。"
      />

      <Card>
        <CardContent className="flex flex-col gap-4 text-left">
          <SectionTitle>訂閱來源</SectionTitle>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="feed-filter">篩選來源</Label>
            <Select value={feedFilter} onValueChange={(value) => value && setFeedFilter(value)}>
              <SelectTrigger id="feed-filter" className="w-56">
                <SelectValue>
                  {(value: string) =>
                    value === ALL_FEEDS ? "全部來源" : (feedTitles.get(Number(value)) ?? "全部來源")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FEEDS}>全部來源</SelectItem>
                {feeds.map((feed) => (
                  <SelectItem key={feed.id} value={String(feed.id)}>
                    {feed.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Callout>{error}</Callout>

      {articles === null && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {articles !== null && articles.length === 0 && !error && (
        <EmptyState
          icon={Rss}
          title="目前沒有文章"
          description="管理員新增訂閱來源並完成第一次抓取之後，最新文章就會出現在這裡。"
        />
      )}

      {articles !== null && articles.length > 0 && (
        <div className="flex flex-col gap-3">
          {articles.map((article) => (
            <Card key={article.id}>
              <CardContent className="flex flex-col gap-2 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{feedTitles.get(article.feed_id) ?? "未知來源"}</Badge>
                  {/* 沒有發布日期的 feed 不少，這時退回顯示我們抓到它的時間。 */}
                  <span
                    className="text-xs text-muted-foreground"
                    title={formatDateTime(article.published_at ?? article.fetched_at)}
                  >
                    {article.published_at
                      ? formatRelativeTime(article.published_at)
                      : `抓取於 ${formatRelativeTime(article.fetched_at)}`}
                  </span>
                  {article.author && <span className="text-xs text-muted-foreground">{article.author}</span>}
                </div>
                {article.link ? (
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1.5 font-medium text-foreground no-underline hover:text-primary"
                  >
                    {article.title}
                    <ExternalLink className="mt-1 size-3.5 shrink-0" aria-hidden />
                  </a>
                ) : (
                  <span className="font-medium text-foreground">{article.title}</span>
                )}
                {article.summary && (
                  <p className="line-clamp-3 text-sm text-muted-foreground">{toPlainText(article.summary)}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? "載入中…" : "載入更多"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default FeedsPage;
