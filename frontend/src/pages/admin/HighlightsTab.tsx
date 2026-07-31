import { Sparkles } from "lucide-react";
import Callout from "../../components/Callout";
import EmptyState from "../../components/EmptyState";
import SectionTitle from "../../components/SectionTitle";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { DEFAULT_HIGHLIGHT_ICON, HIGHLIGHT_ICON_OPTIONS, highlightIcon, highlightIconLabel } from "../../lib/highlight-icons";
import TableSkeleton from "./TableSkeleton";
import { isHighlightDirty, type useHighlightsAdmin } from "./useHighlightsAdmin";

function HighlightsTab(props: ReturnType<typeof useHighlightsAdmin>) {
  const {
    highlights,
    highlightsError,
    highlightDrafts,
    setHighlightDrafts,
    newHighlightIcon,
    setNewHighlightIcon,
    newHighlightTitle,
    setNewHighlightTitle,
    newHighlightDescription,
    setNewHighlightDescription,
    newHighlightSortOrder,
    setNewHighlightSortOrder,
    isCreatingHighlight,
    handleCreateHighlight,
    handleSaveHighlight,
    handleDeleteHighlight,
  } = props;

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-4 text-left">
          <SectionTitle>新增首頁特色</SectionTitle>
          <p className="text-sm text-muted-foreground">
            首頁特色會顯示在首頁歡迎區塊下方，用來介紹站台的主要功能。數字越小越前面，版面會依張數自動調整。
          </p>
          <form className="flex flex-wrap items-end gap-4" onSubmit={handleCreateHighlight}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-highlight-icon">圖示</Label>
              <Select value={newHighlightIcon} onValueChange={(value) => value && setNewHighlightIcon(value)}>
                <SelectTrigger id="new-highlight-icon" className="w-40">
                  <SelectValue>
                    {(value: string) => {
                      const Icon = highlightIcon(value);
                      return (
                        <>
                          <Icon className="size-4" />
                          {highlightIconLabel(value)}
                        </>
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {HIGHLIGHT_ICON_OPTIONS.map(({ key, label, Icon }) => (
                    <SelectItem key={key} value={key}>
                      <Icon className="size-4" />
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-highlight-title">標題</Label>
              <Input
                id="new-highlight-title"
                type="text"
                value={newHighlightTitle}
                onChange={(e) => setNewHighlightTitle(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-highlight-description">說明</Label>
              <Input
                id="new-highlight-description"
                type="text"
                value={newHighlightDescription}
                onChange={(e) => setNewHighlightDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-highlight-sort-order">排序</Label>
              <Input
                id="new-highlight-sort-order"
                type="number"
                className="w-24"
                placeholder="0"
                value={newHighlightSortOrder}
                onChange={(e) => setNewHighlightSortOrder(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isCreatingHighlight}>
              {isCreatingHighlight ? "建立中…" : "新增"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 text-left">
          <SectionTitle>首頁特色列表</SectionTitle>
          <Callout>{highlightsError}</Callout>
          {highlights === null && !highlightsError && <TableSkeleton />}
          {highlights !== null && highlights.length === 0 && (
            <EmptyState icon={Sparkles} title="目前沒有首頁特色" />
          )}
          {highlights !== null && highlights.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>圖示</TableHead>
                  <TableHead>標題</TableHead>
                  <TableHead>說明</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead>顯示</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {highlights.map((highlight) => (
                  <TableRow key={highlight.id}>
                    <TableCell>
                      <Select
                        value={highlightDrafts[highlight.id]?.icon ?? DEFAULT_HIGHLIGHT_ICON}
                        onValueChange={(value) =>
                          value &&
                          setHighlightDrafts((drafts) => ({
                            ...drafts,
                            [highlight.id]: { ...drafts[highlight.id], icon: value },
                          }))
                        }
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue>
                            {(value: string) => {
                              const Icon = highlightIcon(value);
                              return (
                                <>
                                  <Icon className="size-4" />
                                  {highlightIconLabel(value)}
                                </>
                              );
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {HIGHLIGHT_ICON_OPTIONS.map(({ key, label, Icon }) => (
                            <SelectItem key={key} value={key}>
                              <Icon className="size-4" />
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={highlightDrafts[highlight.id]?.title ?? ""}
                        onChange={(e) =>
                          setHighlightDrafts((drafts) => ({
                            ...drafts,
                            [highlight.id]: { ...drafts[highlight.id], title: e.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={highlightDrafts[highlight.id]?.description ?? ""}
                        onChange={(e) =>
                          setHighlightDrafts((drafts) => ({
                            ...drafts,
                            [highlight.id]: { ...drafts[highlight.id], description: e.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-20"
                        value={highlightDrafts[highlight.id]?.sortOrder ?? ""}
                        onChange={(e) =>
                          setHighlightDrafts((drafts) => ({
                            ...drafts,
                            [highlight.id]: { ...drafts[highlight.id], sortOrder: e.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setHighlightDrafts((drafts) => ({
                            ...drafts,
                            [highlight.id]: { ...drafts[highlight.id], isPublic: !drafts[highlight.id]?.isPublic },
                          }))
                        }
                      >
                        {highlightDrafts[highlight.id]?.isPublic ? "公開" : "私密"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSaveHighlight(highlight)}
                          disabled={!isHighlightDirty(highlight, highlightDrafts[highlight.id])}
                        >
                          儲存
                        </Button>
                        <Button variant="destructive-outline" size="sm" onClick={() => handleDeleteHighlight(highlight)}>
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

export default HighlightsTab;
