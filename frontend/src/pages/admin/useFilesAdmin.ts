import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "../../api/client";
import { deleteFile, listFiles } from "../../api/files";
import type { FileItem, FolderGroup } from "../../api/types";
import { useConfirm } from "../../context/ConfirmDialogContext";

/**
 * State and actions behind the 檔案 tab. Lives at page level because AdminPage's stat cards
 * show the file total, and deleting a folder has to re-list files - see AdminPage.tsx.
 */
export function useFilesAdmin({ reloadAuditLogs }: { reloadAuditLogs: () => Promise<void> }) {
  const confirm = useConfirm();

  const [fileGroups, setFileGroups] = useState<FolderGroup[] | null>(null);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [fileFilter, setFileFilter] = useState("");

  async function loadFiles() {
    try {
      setFileGroups(await listFiles());
      setFilesError(null);
    } catch (err) {
      setFilesError(err instanceof ApiError ? err.message : "無法載入檔案列表");
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  async function handleDeleteFile(file: FileItem) {
    const ok = await confirm({
      title: "刪除檔案",
      description: `確定要刪除檔案「${file.filename}」嗎？此操作無法復原。`,
      confirmLabel: "刪除",
      variant: "destructive",
    });
    if (!ok) {
      return;
    }
    try {
      await deleteFile(file.id);
      await loadFiles();
      await reloadAuditLogs();
      toast.success(`已刪除檔案「${file.filename}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "刪除檔案失敗";
      setFilesError(message);
      toast.error(message);
    }
  }

  const totalFiles = fileGroups?.reduce((sum, group) => sum + group.files.length, 0) ?? null;

  const allFiles = useMemo(
    () =>
      fileGroups?.flatMap((group) => group.files.map((file) => ({ file, folderName: group.folder?.name ?? "未分類" }))) ??
      null,
    [fileGroups],
  );

  const filteredFiles = useMemo(() => {
    if (!allFiles) {
      return allFiles;
    }
    const keyword = fileFilter.trim().toLowerCase();
    if (!keyword) {
      return allFiles;
    }
    return allFiles.filter(
      ({ file }) =>
        file.filename.toLowerCase().includes(keyword) ||
        (file.display_name?.toLowerCase().includes(keyword) ?? false),
    );
  }, [allFiles, fileFilter]);

  return {
    fileGroups,
    filesError,
    fileFilter,
    setFileFilter,
    totalFiles,
    filteredFiles,
    reload: loadFiles,
    handleDeleteFile,
  };
}
