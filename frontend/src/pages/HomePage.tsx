import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { deleteFile, downloadFile, listFiles, updateFileVisibility, uploadFile } from "../api/files";
import type { FileItem, FolderGroup } from "../api/types";
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
      <section className="hero">
        <h1>公開檔案牆</h1>
        <p className="lede">
          瀏覽並下載社團 / 團隊公開的檔案，不需登入即可查看；上傳與管理檔案才需要登入帳號。
        </p>
      </section>

      {user && (
        <section className="card">
          <h2>上傳檔案</h2>
          <form className="form" onSubmit={handleUpload}>
            <div className="field">
              <label htmlFor="upload">選擇檔案（pdf / doc / xls / docx / xlsx）</label>
              <input
                id="upload"
                type="file"
                accept=".pdf,.doc,.xls,.docx,.xlsx"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="field field-inline">
              <label htmlFor="is-public">
                <input
                  id="is-public"
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                {" "}公開（取消勾選則僅本人與管理員可檢視）
              </label>
            </div>
            {uploadError && <p className="error-text">{uploadError}</p>}
            <button type="submit" className="btn btn-primary" disabled={!selectedFile || isUploading}>
              {isUploading ? "上傳中…" : "上傳"}
            </button>
          </form>
        </section>
      )}

      <section className="card">
        <h2>檔案列表</h2>
        {error && <p className="error-text">{error}</p>}
        {groups === null && !error && <p className="muted">載入中…</p>}
        {groups !== null && !hasFiles && (
          <div className="empty-state">
            <p>目前沒有可檢視的檔案</p>
            <p className="muted">登入後即可上傳檔案，公開的檔案會顯示在這裡。</p>
          </div>
        )}
        {groups !== null &&
          hasFiles &&
          groups.map((group) => (
            <div key={group.folder ?? "__root__"} className="folder-group">
              <h3 className="folder-title">{group.folder ?? "未分類"}</h3>
              <ul className="file-list">
                {group.files.map((file) => (
                  <li key={file.id} className="file-item">
                    <div className="file-info">
                      <span className="file-name">{file.filename}</span>
                      <span className="muted file-meta">
                        {formatSize(file.size)} &middot; {file.is_public ? "公開" : "私密"}
                      </span>
                    </div>
                    <div className="file-actions">
                      <button type="button" className="btn" onClick={() => handleDownload(file)}>
                        下載
                      </button>
                      {canManage(file) && (
                        <>
                          <button type="button" className="btn" onClick={() => handleToggleVisibility(file)}>
                            設為{file.is_public ? "私密" : "公開"}
                          </button>
                          <button type="button" className="btn" onClick={() => handleDelete(file)}>
                            刪除
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </section>
    </div>
  );
}

export default HomePage;
