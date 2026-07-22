import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { deleteFile, downloadFile, listFiles, updateFileVisibility, uploadFile } from "../api/files";
import type { FileItem, FolderGroup } from "../api/types";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function HomePage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<FolderGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function loadFiles() {
    try {
      const data = await listFiles();
      setGroups(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "無法載入檔案列表");
    }
  }

  useEffect(() => {
    loadFiles();
  }, [user]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      await uploadFile(selectedFile, isPublic);
      setSelectedFile(null);
      await loadFiles();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "上傳失敗");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(file: FileItem) {
    try {
      await downloadFile(file);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "下載失敗");
    }
  }

  async function handleToggleVisibility(file: FileItem) {
    try {
      await updateFileVisibility(file.id, !file.is_public);
      await loadFiles();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "更新失敗");
    }
  }

  async function handleDelete(file: FileItem) {
    if (!window.confirm(`確定要刪除「${file.filename}」嗎？`)) {
      return;
    }
    try {
      await deleteFile(file.id);
      await loadFiles();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "刪除失敗");
    }
  }

  function canManage(file: FileItem): boolean {
    return !!user && (user.id === file.owner_id || user.role === "admin");
  }

  const hasFiles = groups !== null && groups.some((group) => group.files.length > 0);

  return (
    <div className="page">
      <section className="py-6 text-center">
        <h1>公開檔案牆</h1>
        <p className="mx-auto max-w-[560px] text-[17px] leading-[1.55] text-muted-foreground">
          瀏覽並下載社團 / 團隊公開的檔案，不需登入即可查看；上傳與管理檔案才需要登入帳號。
        </p>
      </section>

      {user && (
        <Card>
          <CardContent className="flex flex-col gap-4 text-left">
            <h2>上傳檔案</h2>
            <form className="flex flex-col gap-4" onSubmit={handleUpload}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="upload">選擇檔案（pdf / doc / xls / docx / xlsx）</Label>
                <Input
                  id="upload"
                  type="file"
                  accept=".pdf,.doc,.xls,.docx,.xlsx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is-public"
                  checked={isPublic}
                  onCheckedChange={(checked) => setIsPublic(checked === true)}
                />
                <Label htmlFor="is-public">公開（取消勾選則僅本人與管理員可檢視）</Label>
              </div>
              {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
              <Button type="submit" disabled={!selectedFile || isUploading}>
                {isUploading ? "上傳中…" : "上傳"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4 text-left">
          <h2>檔案列表</h2>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {groups === null && !error && <p className="text-sm text-muted-foreground">載入中…</p>}
          {groups !== null && !hasFiles && (
            <div className="rounded-md border border-dashed border-border p-8 text-center">
              <p className="mb-1 font-medium text-foreground">目前沒有可檢視的檔案</p>
              <p className="text-sm text-muted-foreground">登入後即可上傳檔案，公開的檔案會顯示在這裡。</p>
            </div>
          )}
          {groups !== null && hasFiles && (
            <div className="flex flex-col gap-6">
              {groups.map((group) => (
                <div key={group.folder ?? "__root__"}>
                  <h3 className="mb-2 text-base text-foreground">{group.folder ?? "未分類"}</h3>
                  <ul className="flex flex-col gap-2">
                    {group.files.map((file) => (
                      <li
                        key={file.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-3"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">{file.filename}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatSize(file.size)} &middot; {file.is_public ? "公開" : "私密"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleDownload(file)}>
                            下載
                          </Button>
                          {canManage(file) && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleToggleVisibility(file)}>
                                設為{file.is_public ? "私密" : "公開"}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete(file)}>
                                刪除
                              </Button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default HomePage;
