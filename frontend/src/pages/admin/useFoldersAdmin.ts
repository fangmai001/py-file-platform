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
 * State and actions behind the 卡片 tab. The folder list is also read by the 連結卡片 tab's
 * folder picker, and deleting a folder re-lists files, so this lives at page level.
 */
export function useFoldersAdmin({ reloadFiles }: { reloadFiles: () => Promise<void> }) {
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
      setFoldersError(err instanceof ApiError ? err.message : "無法載入卡片列表");
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
      toast.success(`已建立卡片「${newFolderName}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "建立卡片失敗";
      setFoldersError(message);
      toast.error(message);
    } finally {
      setIsCreatingFolder(false);
    }
  }

  async function handleSaveFolder(folder: FolderItem) {
    const draft = folderDrafts[folder.id];
    try {
      await updateFolder(folder.id, { name: draft.name, description: draft.description.trim() || null });
      await loadFolders();
      toast.success(`已更新卡片「${draft.name}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新卡片失敗";
      setFoldersError(message);
      toast.error(message);
    }
  }

  async function handleDeleteFolder(folder: FolderItem) {
    const ok = await confirm({
      title: "刪除卡片",
      description: `確定要刪除卡片「${folder.name}」嗎？此卡片下的檔案將變為未分類。`,
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
      toast.success(`已刪除卡片「${folder.name}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "刪除卡片失敗";
      setFoldersError(message);
      toast.error(message);
    }
  }

  return {
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
