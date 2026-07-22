import { useEffect, useState, type ComponentType } from "react";
import { ClipboardList, FolderTree, History, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { deleteFile, downloadFile, listFiles, updateFileVisibility } from "../api/files";
import type { FileItem, FolderGroup } from "../api/types";
import { Button, buttonVariants } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
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

interface Highlight {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const highlights: Highlight[] = [
  {
    icon: ShieldCheck,
    title: "公開／私密控管",
    description: "每個檔案可獨立設定可見度，公開檔案訪客免登入即可下載，私密檔案僅本人與管理員可見。",
  },
  {
    icon: History,
    title: "版本歷史",
    description: "同名檔案重新上傳不會覆蓋，舊版本會保留完整歷史紀錄，方便回溯查閱。",
  },
  {
    icon: FolderTree,
    title: "資料夾分類",
    description: "檔案依資料夾分組呈現，瀏覽時可依主題或用途快速找到需要的文件。",
  },
  {
    icon: ClipboardList,
    title: "稽核紀錄",
    description: "刪除、權限變更等高權限操作皆會記錄稽核紀錄，操作歷程有跡可循。",
  },
];

function HomePage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<FolderGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const stats =
    groups === null
      ? null
      : {
          files: groups.reduce((sum, group) => sum + group.files.length, 0),
          folders: groups.filter((group) => group.folder !== null).length,
          totalSize: groups.reduce(
            (sum, group) => sum + group.files.reduce((s, file) => s + file.size, 0),
            0,
          ),
        };

  return (
    <div className="page">
      <section className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-gradient-to-b from-accent/50 to-transparent px-6 py-14 text-center">
        <h1>公開檔案牆</h1>
        <p className="mx-auto max-w-[560px] text-[17px] leading-[1.55] text-muted-foreground">
          瀏覽並下載社團 / 團隊公開的檔案，不需登入即可查看；上傳與管理檔案才需要登入帳號。
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a href="#file-list" className={buttonVariants({ size: "lg" })}>
            瀏覽公開檔案
          </a>
          {user ? (
            <Link to="/upload" className={buttonVariants({ variant: "outline", size: "lg" })}>
              上傳檔案
            </Link>
          ) : (
            <Link to="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
              登入以管理檔案
            </Link>
          )}
        </div>

        {stats && (
          <dl className="mt-2 flex flex-wrap justify-center gap-10">
            <div className="flex flex-col items-center gap-0.5">
              <dt className="text-sm text-muted-foreground">可瀏覽檔案</dt>
              <dd className="text-2xl font-semibold text-foreground">{stats.files}</dd>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <dt className="text-sm text-muted-foreground">資料夾分類</dt>
              <dd className="text-2xl font-semibold text-foreground">{stats.folders}</dd>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <dt className="text-sm text-muted-foreground">總容量</dt>
              <dd className="text-2xl font-semibold text-foreground">{formatSize(stats.totalSize)}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map(({ icon: Icon, title, description }) => (
          <Card key={title}>
            <CardContent className="flex flex-col gap-2 text-left">
              <Icon className="size-5 text-foreground" />
              <h3 className="text-base font-medium text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card id="file-list">
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
