import { Link2 } from "lucide-react";
import type { FolderItem } from "../../api/types";
import Callout from "../../components/Callout";
import EmptyState from "../../components/EmptyState";
import SectionTitle from "../../components/SectionTitle";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import TableSkeleton from "./TableSkeleton";
import { NO_FOLDER, isLinkCardDirty, type useLinkCardsAdmin } from "./useLinkCardsAdmin";

function LinkCardsTab(props: ReturnType<typeof useLinkCardsAdmin> & { folders: FolderItem[] | null }) {
  const {
    folders,
    linkCards,
    linkCardsError,
    linkCardDrafts,
    setLinkCardDrafts,
    newLinkCardTitle,
    setNewLinkCardTitle,
    newLinkCardDescription,
    setNewLinkCardDescription,
    newLinkCardUrl,
    setNewLinkCardUrl,
    newLinkCardFolderId,
    setNewLinkCardFolderId,
    isCreatingLinkCard,
    handleCreateLinkCard,
    handleSaveLinkCard,
    handleDeleteLinkCard,
  } = props;

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-4 text-left">
          <SectionTitle>新增連結卡片</SectionTitle>
          <p className="text-sm text-muted-foreground">
            連結卡片會與檔案卡片一併顯示在首頁，點擊後在新分頁開啟指定網址，不涉及檔案上傳/下載。
          </p>
          <form className="flex flex-wrap items-end gap-4" onSubmit={handleCreateLinkCard}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-link-card-title">標題</Label>
              <Input
                id="new-link-card-title"
                type="text"
                value={newLinkCardTitle}
                onChange={(e) => setNewLinkCardTitle(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-link-card-description">說明</Label>
              <Input
                id="new-link-card-description"
                type="text"
                value={newLinkCardDescription}
                onChange={(e) => setNewLinkCardDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-link-card-url">目標網址</Label>
              <Input
                id="new-link-card-url"
                type="url"
                placeholder="https://example.com"
                value={newLinkCardUrl}
                onChange={(e) => setNewLinkCardUrl(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-link-card-folder">卡片分類</Label>
              <Select value={newLinkCardFolderId} onValueChange={(value) => value && setNewLinkCardFolderId(value)}>
                <SelectTrigger id="new-link-card-folder" className="w-40">
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
            <Button type="submit" disabled={isCreatingLinkCard}>
              {isCreatingLinkCard ? "建立中…" : "新增"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 text-left">
          <SectionTitle>連結卡片列表</SectionTitle>
          <Callout>{linkCardsError}</Callout>
          {linkCards === null && !linkCardsError && <TableSkeleton />}
          {linkCards !== null && linkCards.length === 0 && (
            <EmptyState icon={Link2} title="目前沒有連結卡片" />
          )}
          {linkCards !== null && linkCards.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>標題</TableHead>
                  <TableHead>說明</TableHead>
                  <TableHead>網址</TableHead>
                  <TableHead>分類</TableHead>
                  <TableHead>公開</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkCards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell>
                      <Input
                        type="text"
                        value={linkCardDrafts[card.id]?.title ?? ""}
                        onChange={(e) =>
                          setLinkCardDrafts((drafts) => ({
                            ...drafts,
                            [card.id]: { ...drafts[card.id], title: e.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={linkCardDrafts[card.id]?.description ?? ""}
                        onChange={(e) =>
                          setLinkCardDrafts((drafts) => ({
                            ...drafts,
                            [card.id]: { ...drafts[card.id], description: e.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="url"
                        value={linkCardDrafts[card.id]?.url ?? ""}
                        onChange={(e) =>
                          setLinkCardDrafts((drafts) => ({
                            ...drafts,
                            [card.id]: { ...drafts[card.id], url: e.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={linkCardDrafts[card.id]?.folderId ?? NO_FOLDER}
                        onValueChange={(value) =>
                          value &&
                          setLinkCardDrafts((drafts) => ({
                            ...drafts,
                            [card.id]: { ...drafts[card.id], folderId: value },
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setLinkCardDrafts((drafts) => ({
                            ...drafts,
                            [card.id]: { ...drafts[card.id], isPublic: !drafts[card.id]?.isPublic },
                          }))
                        }
                      >
                        {linkCardDrafts[card.id]?.isPublic ? "公開" : "私密"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSaveLinkCard(card)}
                          disabled={!isLinkCardDirty(card, linkCardDrafts[card.id])}
                        >
                          儲存
                        </Button>
                        <Button variant="destructive-outline" size="sm" onClick={() => handleDeleteLinkCard(card)}>
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

export default LinkCardsTab;
