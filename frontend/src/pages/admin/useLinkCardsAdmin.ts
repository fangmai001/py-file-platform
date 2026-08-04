import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ApiError } from "../../api/client";
import { createLinkCard, deleteLinkCard, listLinkCards, updateLinkCard } from "../../api/link-cards";
import type { LinkCardItem } from "../../api/types";
import { useConfirm } from "../../context/ConfirmDialogContext";

/** 代表「不屬於任何 folder」的哨符值——Select item 的 value 不能是空字串。 */
export const NO_FOLDER = "none";

export interface LinkCardDraft {
  title: string;
  description: string;
  url: string;
  folderId: string;
  isPublic: boolean;
}

function toLinkCardDrafts(items: LinkCardItem[]): Record<number, LinkCardDraft> {
  return Object.fromEntries(
    items.map((c) => [
      c.id,
      {
        title: c.title,
        description: c.description ?? "",
        url: c.url,
        folderId: c.folder_id !== null ? String(c.folder_id) : NO_FOLDER,
        isPublic: c.is_public,
      },
    ]),
  );
}

/**
 * 判斷某一列是否與伺服器上的資料不同。正規化方式與 handleSaveLinkCard 的 payload 完全一致，
 * 因此「儲存」按鈕絕不會為了一次什麼都不會送出的編輯而啟用。
 */
export function isLinkCardDirty(card: LinkCardItem, draft: LinkCardDraft | undefined): boolean {
  if (!draft) {
    return false;
  }
  return (
    draft.title !== card.title ||
    (draft.description.trim() || null) !== (card.description ?? null) ||
    draft.url !== card.url ||
    (draft.folderId === NO_FOLDER ? null : Number(draft.folderId)) !== card.folder_id ||
    draft.isPublic !== card.is_public
  );
}

/** State and actions behind the 連結卡片 tab. */
export function useLinkCardsAdmin() {
  const confirm = useConfirm();

  const [linkCards, setLinkCards] = useState<LinkCardItem[] | null>(null);
  const [linkCardsError, setLinkCardsError] = useState<string | null>(null);
  const [linkCardDrafts, setLinkCardDrafts] = useState<Record<number, LinkCardDraft>>({});
  const [newLinkCardTitle, setNewLinkCardTitle] = useState("");
  const [newLinkCardDescription, setNewLinkCardDescription] = useState("");
  const [newLinkCardUrl, setNewLinkCardUrl] = useState("");
  const [newLinkCardFolderId, setNewLinkCardFolderId] = useState(NO_FOLDER);
  const [isCreatingLinkCard, setIsCreatingLinkCard] = useState(false);

  async function loadLinkCards() {
    try {
      const data = await listLinkCards();
      setLinkCards(data);
      setLinkCardDrafts(toLinkCardDrafts(data));
      setLinkCardsError(null);
    } catch (err) {
      setLinkCardsError(err instanceof ApiError ? err.message : "無法載入連結卡片列表");
    }
  }

  useEffect(() => {
    loadLinkCards();
  }, []);

  async function handleCreateLinkCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingLinkCard(true);
    setLinkCardsError(null);
    try {
      await createLinkCard({
        title: newLinkCardTitle,
        description: newLinkCardDescription.trim() || null,
        url: newLinkCardUrl,
        folder_id: newLinkCardFolderId === NO_FOLDER ? null : Number(newLinkCardFolderId),
      });
      setNewLinkCardTitle("");
      setNewLinkCardDescription("");
      setNewLinkCardUrl("");
      setNewLinkCardFolderId(NO_FOLDER);
      await loadLinkCards();
      toast.success(`已建立連結卡片「${newLinkCardTitle}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "建立連結卡片失敗";
      setLinkCardsError(message);
      toast.error(message);
    } finally {
      setIsCreatingLinkCard(false);
    }
  }

  async function handleSaveLinkCard(linkCard: LinkCardItem) {
    const draft = linkCardDrafts[linkCard.id];
    if (!isLinkCardDirty(linkCard, draft)) {
      return;
    }
    try {
      await updateLinkCard(linkCard.id, {
        title: draft.title,
        description: draft.description.trim() || null,
        url: draft.url,
        folder_id: draft.folderId === NO_FOLDER ? null : Number(draft.folderId),
        is_public: draft.isPublic,
      });
      await loadLinkCards();
      toast.success(`已更新連結卡片「${draft.title}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新連結卡片失敗";
      setLinkCardsError(message);
      toast.error(message);
    }
  }

  async function handleDeleteLinkCard(linkCard: LinkCardItem) {
    const ok = await confirm({
      title: "刪除連結卡片",
      description: `確定要刪除連結卡片「${linkCard.title}」嗎？此操作無法復原。`,
      confirmLabel: "刪除",
      variant: "destructive",
    });
    if (!ok) {
      return;
    }
    try {
      await deleteLinkCard(linkCard.id);
      await loadLinkCards();
      toast.success(`已刪除連結卡片「${linkCard.title}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "刪除連結卡片失敗";
      setLinkCardsError(message);
      toast.error(message);
    }
  }

  return {
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
  };
}
