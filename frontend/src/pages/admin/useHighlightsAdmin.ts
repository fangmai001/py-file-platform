import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ApiError } from "../../api/client";
import { createHighlight, deleteHighlight, listHighlights, updateHighlight } from "../../api/highlights";
import type { HighlightItem } from "../../api/types";
import { useConfirm } from "../../context/ConfirmDialogContext";
import { DEFAULT_HIGHLIGHT_ICON } from "../../lib/highlight-icons";

export interface HighlightDraft {
  icon: string;
  title: string;
  description: string;
  sortOrder: string;
  isPublic: boolean;
}

function toHighlightDrafts(items: HighlightItem[]): Record<number, HighlightDraft> {
  return Object.fromEntries(
    items.map((h) => [
      h.id,
      {
        icon: h.icon,
        title: h.title,
        description: h.description ?? "",
        sortOrder: String(h.sort_order),
        isPublic: h.is_public,
      },
    ]),
  );
}

/**
 * 判斷某一列是否與伺服器上的資料不同。正規化方式與 handleSaveHighlight 的 payload 完全一致——
 * 注意排序值是以數字比較的，所以 "3" 與 "03" 都算沒有變動，這與實際儲存時會送出的內容一致。
 */
export function isHighlightDirty(highlight: HighlightItem, draft: HighlightDraft | undefined): boolean {
  if (!draft) {
    return false;
  }
  return (
    draft.icon !== highlight.icon ||
    draft.title !== highlight.title ||
    (draft.description.trim() || null) !== (highlight.description ?? null) ||
    (Number(draft.sortOrder) || 0) !== highlight.sort_order ||
    draft.isPublic !== highlight.is_public
  );
}

/** State and actions behind the 首頁特色 tab. */
export function useHighlightsAdmin({ reloadAuditLogs }: { reloadAuditLogs: () => Promise<void> }) {
  const confirm = useConfirm();

  const [highlights, setHighlights] = useState<HighlightItem[] | null>(null);
  const [highlightsError, setHighlightsError] = useState<string | null>(null);
  const [highlightDrafts, setHighlightDrafts] = useState<Record<number, HighlightDraft>>({});
  const [newHighlightIcon, setNewHighlightIcon] = useState(DEFAULT_HIGHLIGHT_ICON);
  const [newHighlightTitle, setNewHighlightTitle] = useState("");
  const [newHighlightDescription, setNewHighlightDescription] = useState("");
  const [newHighlightSortOrder, setNewHighlightSortOrder] = useState("");
  const [isCreatingHighlight, setIsCreatingHighlight] = useState(false);

  async function loadHighlights() {
    try {
      const data = await listHighlights();
      setHighlights(data);
      setHighlightDrafts(toHighlightDrafts(data));
      setHighlightsError(null);
    } catch (err) {
      setHighlightsError(err instanceof ApiError ? err.message : "無法載入首頁特色列表");
    }
  }

  useEffect(() => {
    loadHighlights();
  }, []);

  async function handleCreateHighlight(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingHighlight(true);
    setHighlightsError(null);
    try {
      await createHighlight({
        icon: newHighlightIcon,
        title: newHighlightTitle,
        description: newHighlightDescription.trim() || null,
        sort_order: Number(newHighlightSortOrder) || 0,
      });
      setNewHighlightIcon(DEFAULT_HIGHLIGHT_ICON);
      setNewHighlightTitle("");
      setNewHighlightDescription("");
      setNewHighlightSortOrder("");
      await loadHighlights();
      await reloadAuditLogs();
      toast.success(`已建立首頁特色「${newHighlightTitle}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "建立首頁特色失敗";
      setHighlightsError(message);
      toast.error(message);
    } finally {
      setIsCreatingHighlight(false);
    }
  }

  async function handleSaveHighlight(highlight: HighlightItem) {
    const draft = highlightDrafts[highlight.id];
    if (!isHighlightDirty(highlight, draft)) {
      return;
    }
    try {
      await updateHighlight(highlight.id, {
        icon: draft.icon,
        title: draft.title,
        description: draft.description.trim() || null,
        sort_order: Number(draft.sortOrder) || 0,
        is_public: draft.isPublic,
      });
      await loadHighlights();
      await reloadAuditLogs();
      toast.success(`已更新首頁特色「${draft.title}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新首頁特色失敗";
      setHighlightsError(message);
      toast.error(message);
    }
  }

  async function handleDeleteHighlight(highlight: HighlightItem) {
    const ok = await confirm({
      title: "刪除首頁特色",
      description: `確定要刪除首頁特色「${highlight.title}」嗎？此操作無法復原。`,
      confirmLabel: "刪除",
      variant: "destructive",
    });
    if (!ok) {
      return;
    }
    try {
      await deleteHighlight(highlight.id);
      await loadHighlights();
      await reloadAuditLogs();
      toast.success(`已刪除首頁特色「${highlight.title}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "刪除首頁特色失敗";
      setHighlightsError(message);
      toast.error(message);
    }
  }

  return {
    reload: loadHighlights,
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
  };
}
