import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ApiError } from "../../api/client";
import { createFolder, deleteFolder, listFolders, updateFolder } from "../../api/folders";
import type { FolderItem } from "../../api/types";
import { useConfirm } from "../../context/ConfirmDialogContext";

export interface FolderDraft {
  name: string;
  description: string;
}

function toFolderDrafts(items: FolderItem[]): Record<number, FolderDraft> {
  return Object.fromEntries(items.map((f) => [f.id, { name: f.name, description: f.description ?? "" }]));
}

/**
 * 判斷某一列是否與伺服器上的資料不同。正規化方式與 handleSaveFolder 的 payload 完全一致，
 * 因此「儲存」按鈕絕不會為了一次什麼都不會送出的編輯而啟用。
 */
export function isFolderDirty(folder: FolderItem, draft: FolderDraft | undefined): boolean {
  if (!draft) {
    return false;
  }
  return draft.name !== folder.name || (draft.description.trim() || null) !== (folder.description ?? null);
}

/**
 * 資料夾分頁背後的狀態與操作。folder 列表同時也被連結卡片分頁的 folder 選單讀取，
 * 而且刪除 folder 之後要重新列出檔案，所以這個 hook 放在頁面層級。
 */
export function useFoldersAdmin({
  reloadFiles,
  reloadLinkCards,
  reloadAuditLogs,
}: {
  reloadFiles: () => Promise<void>;
  reloadLinkCards: () => Promise<void>;
  reloadAuditLogs: () => Promise<void>;
}) {
  const confirm = useConfirm();

  const [folders, setFolders] = useState<FolderItem[] | null>(null);
  const [foldersError, setFoldersError] = useState<string | null>(null);
  const [folderDrafts, setFolderDrafts] = useState<Record<number, FolderDraft>>({});
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  async function loadFolders() {
    try {
      const data = await listFolders();
      setFolders(data);
      setFolderDrafts(toFolderDrafts(data));
      setFoldersError(null);
    } catch (err) {
      setFoldersError(err instanceof ApiError ? err.message : "無法載入資料夾列表");
    }
  }

  useEffect(() => {
    loadFolders();
  }, []);

  async function handleCreateFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingFolder(true);
    setFoldersError(null);
    try {
      await createFolder({ name: newFolderName, description: newFolderDescription.trim() || null });
      setNewFolderName("");
      setNewFolderDescription("");
      await loadFolders();
      await reloadAuditLogs();
      toast.success(`已建立資料夾「${newFolderName}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "建立資料夾失敗";
      setFoldersError(message);
      toast.error(message);
    } finally {
      setIsCreatingFolder(false);
    }
  }

  async function handleSaveFolder(folder: FolderItem) {
    const draft = folderDrafts[folder.id];
    if (!isFolderDirty(folder, draft)) {
      return;
    }
    try {
      await updateFolder(folder.id, { name: draft.name, description: draft.description.trim() || null });
      await loadFolders();
      await reloadAuditLogs();
      toast.success(`已更新資料夾「${draft.name}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新資料夾失敗";
      setFoldersError(message);
      toast.error(message);
    }
  }

  async function handleDeleteFolder(folder: FolderItem) {
    const ok = await confirm({
      title: "刪除資料夾",
      description: `確定要刪除資料夾「${folder.name}」嗎？裡面的檔案將變為未分類。`,
      confirmLabel: "刪除",
      variant: "destructive",
    });
    if (!ok) {
      return;
    }
    try {
      await deleteFolder(folder.id);
      await loadFolders();
      await reloadFiles();
      // 連結卡片也有 folder_id，不刷新的話它的資料夾下拉選單會繼續列出剛剛刪掉的那個。
      await reloadLinkCards();
      await reloadAuditLogs();
      toast.success(`已刪除資料夾「${folder.name}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "刪除資料夾失敗";
      setFoldersError(message);
      toast.error(message);
    }
  }

  return {
    reload: loadFolders,
    folders,
    foldersError,
    folderDrafts,
    setFolderDrafts,
    newFolderName,
    setNewFolderName,
    newFolderDescription,
    setNewFolderDescription,
    isCreatingFolder,
    handleCreateFolder,
    handleSaveFolder,
    handleDeleteFolder,
  };
}
