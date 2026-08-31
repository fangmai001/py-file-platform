import { Rss } from "lucide-react";
import type { AdminFeedSource, FolderItem } from "../../api/types";
import { formatDateTime } from "../../lib/format";
import Callout from "../../components/Callout";
import EmptyState from "../../components/EmptyState";
import SectionTitle from "../../components/SectionTitle";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import TableSkeleton from "./TableSkeleton";
import VisibilityToggle from "./VisibilityToggle";
import {
  MAX_FETCH_INTERVAL_MINUTES,
  MIN_FETCH_INTERVAL_MINUTES,
  NO_FOLDER,
  isFeedDirty,
  isScheduleDirty,
  type useFeedsAdmin,
} from "./useFeedsAdmin";

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

/** 上一次「整批」抓取的結果。與每一列的 StatusBadge 是不同的東西：那個講的是單一來源。 */
function LastRunBadge({ status }: { status: string | null }) {
  if (status === null) {
    return <Badge variant="outline">尚未執行</Badge>;
  }
  return (
    <Badge variant={status === "error" ? "destructive" : "success"}>{status === "error" ? "有來源失敗" : "正常"}</Badge>
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
    feedSettings,
    scheduleDraft,
    setScheduleDraft,
    isSavingSchedule,
    isFetchingAll,
    handleSaveSchedule,
    handleFetchAll,
  } = props;

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-4 text-left">
          <SectionTitle>抓取排程</SectionTitle>
          <p className="text-sm text-muted-foreground">
            啟用後，平台會自己按照設定的間隔抓取所有啟用中的來源，不需要在伺服器上設定 cron。
            改完設定會立即生效。
          </p>
          <form className="flex flex-wrap items-end gap-4" onSubmit={handleSaveSchedule}>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                id="feed-schedule-enabled"
                checked={scheduleDraft.fetchEnabled}
                onCheckedChange={(checked) =>
                  setScheduleDraft((draft) => ({ ...draft, fetchEnabled: checked === true }))
                }
              />
              <Label htmlFor="feed-schedule-enabled">啟用定時抓取</Label>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="feed-schedule-interval">間隔（分鐘）</Label>
              <Input
                id="feed-schedule-interval"
                type="number"
                className="w-32"
                min={MIN_FETCH_INTERVAL_MINUTES}
                max={MAX_FETCH_INTERVAL_MINUTES}
                required
                value={scheduleDraft.fetchIntervalMinutes}
                onChange={(e) => setScheduleDraft((draft) => ({ ...draft, fetchIntervalMinutes: e.target.value }))}
              />
            </div>
            {/* 名稱刻意不只是「儲存」：同一個分頁的每一列來源也各有一顆儲存按鈕，兩者同名會分不出來。 */}
            <Button type="submit" disabled={isSavingSchedule || !isScheduleDirty(feedSettings, scheduleDraft)}>
              {isSavingSchedule ? "儲存中…" : "儲存排程"}
            </Button>
            <Button type="button" variant="outline" onClick={handleFetchAll} disabled={isFetchingAll}>
              {isFetchingAll ? "抓取中…" : "全部立即抓取"}
            </Button>
          </form>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>上次執行：</span>
            <LastRunBadge status={feedSettings?.last_run_status ?? null} />
            {feedSettings?.last_run_at && <span>{formatDateTime(feedSettings.last_run_at)}</span>}
            {feedSettings?.last_run_detail && <span>{feedSettings.last_run_detail}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 text-left">
          <SectionTitle>新增訂閱來源</SectionTitle>
          <p className="text-sm text-muted-foreground">
            這裡列出的 RSS／Atom 來源會依上方的排程抓取，最新文章顯示在「訂閱」頁面。新增之後請按一次
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
