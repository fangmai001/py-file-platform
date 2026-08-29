import { Rss } from "lucide-react";
import type { AdminFeedSource, FolderItem } from "../../api/types";
import { formatDateTime } from "../../lib/format";
import Callout from "../../components/Callout";
import EmptyState from "../../components/EmptyState";
import SectionTitle from "../../components/SectionTitle";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import TableSkeleton from "./TableSkeleton";
import VisibilityToggle from "./VisibilityToggle";
import { NO_FOLDER, isFeedDirty, type useFeedsAdmin } from "./useFeedsAdmin";

const STATUS_LABEL: Record<string, string> = {
  ok: "正常",
  not_modified: "無更新",
  error: "失敗",
};

/** 最後一次抓取的狀態。從未抓過（last_status 為 null）與抓失敗是兩件事，不要混為一談。 */
function StatusBadge({ feed }: { feed: AdminFeedSource }) {
  if (feed.last_status === null) {
    return <Badge variant="outline">尚未抓取</Badge>;
  }
  const variant = feed.last_status === "ok" ? "success" : feed.last_status === "error" ? "destructive" : "secondary";
  return (
    <Badge
      variant={variant}
      title={feed.last_error ?? (feed.last_fetched_at ? formatDateTime(feed.last_fetched_at) : undefined)}
    >
      {STATUS_LABEL[feed.last_status] ?? feed.last_status}
    </Badge>
  );
}

function FeedsTab(props: ReturnType<typeof useFeedsAdmin> & { folders: FolderItem[] | null }) {
  const {
    folders,
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
  } = props;

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-4 text-left">
          <SectionTitle>新增訂閱來源</SectionTitle>
          <p className="text-sm text-muted-foreground">
            平台會定期抓取這裡列出的 RSS／Atom 來源，並把最新文章顯示在「訂閱」頁面。新增之後請按一次
            「立即抓取」，確認網址正確。
          </p>
          <form className="flex flex-wrap items-end gap-4" onSubmit={handleCreateFeed}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-feed-title">名稱</Label>
              <Input
                id="new-feed-title"
                type="text"
                value={newFeedTitle}
                onChange={(e) => setNewFeedTitle(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-feed-description">說明</Label>
              <Input
                id="new-feed-description"
                type="text"
                value={newFeedDescription}
                onChange={(e) => setNewFeedDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-feed-url">Feed 網址</Label>
              <Input
                id="new-feed-url"
                type="url"
                placeholder="https://example.com/rss"
                value={newFeedUrl}
                onChange={(e) => setNewFeedUrl(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-feed-folder">所屬資料夾</Label>
              <Select value={newFeedFolderId} onValueChange={(value) => value && setNewFeedFolderId(value)}>
                <SelectTrigger id="new-feed-folder" className="w-40">
                  <SelectValue>
                    {(value: string) =>
                      value === NO_FOLDER ? "未分類" : (folders?.find((f) => String(f.id) === value)?.name ?? "未分類")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_FOLDER}>未分類</SelectItem>
                  {(folders ?? []).map((folder) => (
                    <SelectItem key={folder.id} value={String(folder.id)}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isCreatingFeed}>
              {isCreatingFeed ? "建立中…" : "新增"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 text-left">
          <SectionTitle>訂閱來源列表</SectionTitle>
          <Callout>{feedsError}</Callout>
          {feeds === null && !feedsError && <TableSkeleton />}
          {feeds !== null && feeds.length === 0 && <EmptyState icon={Rss} title="目前沒有訂閱來源" />}
          {feeds !== null && feeds.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名稱</TableHead>
                  <TableHead>Feed 網址</TableHead>
                  <TableHead>分類</TableHead>
                  <TableHead>公開</TableHead>
                  <TableHead>啟用</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeds.map((feed) => (
                  <TableRow key={feed.id}>
                    <TableCell>
                      <Input
                        type="text"
                        value={feedDrafts[feed.id]?.title ?? ""}
                        onChange={(e) =>
                          setFeedDrafts((drafts) => ({
                            ...drafts,
                            [feed.id]: { ...drafts[feed.id], title: e.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="url"
                        value={feedDrafts[feed.id]?.url ?? ""}
                        onChange={(e) =>
                          setFeedDrafts((drafts) => ({
                            ...drafts,
                            [feed.id]: { ...drafts[feed.id], url: e.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={feedDrafts[feed.id]?.folderId ?? NO_FOLDER}
                        onValueChange={(value) =>
                          value &&
                          setFeedDrafts((drafts) => ({
                            ...drafts,
                            [feed.id]: { ...drafts[feed.id], folderId: value },
                          }))
                        }
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue>
                            {(value: string) =>
                              value === NO_FOLDER
                                ? "未分類"
                                : (folders?.find((f) => String(f.id) === value)?.name ?? "未分類")
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_FOLDER}>未分類</SelectItem>
                          {(folders ?? []).map((folder) => (
                            <SelectItem key={folder.id} value={String(folder.id)}>
                              {folder.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <VisibilityToggle
                        isPublic={feedDrafts[feed.id]?.isPublic ?? false}
                        onToggle={() =>
                          setFeedDrafts((drafts) => ({
                            ...drafts,
                            [feed.id]: { ...drafts[feed.id], isPublic: !drafts[feed.id]?.isPublic },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="xs"
                        title={feedDrafts[feed.id]?.isActive ? "點擊改為停用" : "點擊改為啟用"}
                        onClick={() =>
                          setFeedDrafts((drafts) => ({
                            ...drafts,
                            [feed.id]: { ...drafts[feed.id], isActive: !drafts[feed.id]?.isActive },
                          }))
                        }
                      >
                        {feedDrafts[feed.id]?.isActive ? "啟用中" : "已停用"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <StatusBadge feed={feed} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-nowrap items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFetchFeed(feed)}
                          disabled={fetchingFeedId === feed.id}
                        >
                          {fetchingFeedId === feed.id ? "抓取中…" : "立即抓取"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSaveFeed(feed)}
                          disabled={!isFeedDirty(feed, feedDrafts[feed.id])}
                        >
                          儲存
                        </Button>
                        <Button variant="destructive-outline" size="sm" onClick={() => handleDeleteFeed(feed)}>
                          刪除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default FeedsTab;
