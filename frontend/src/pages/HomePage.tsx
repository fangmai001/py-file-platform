import { useEffect, useMemo, useState, type ComponentType, type FormEvent } from "react";
import { ClipboardList, ExternalLink, FolderTree, History, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ApiError } from "../api/client";
import { deleteFile, downloadFile, listFiles, updateFile, updateFileVisibility } from "../api/files";
import { listFolders } from "../api/folders";
import { listLinkCards } from "../api/link-cards";
import type { FileItem, FolderGroup, FolderItem, LinkCardItem } from "../api/types";
import { Button, buttonVariants } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmDialogContext";
import { useSiteSettings } from "../context/SiteSettingsContext";

const NO_FOLDER = "none";
const ALL_FOLDERS = "__all__";
const SEARCH_DEBOUNCE_MS = 300;
const FILES_PAGE_SIZE = 20;

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

interface EditDraft {
  displayName: string;
  announcedAt: string;
  folderId: string;
}

function HomePage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const { heroTitle, heroSubtitle } = useSiteSettings();
  const [groups, setGroups] = useState<FolderGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [linkCards, setLinkCards] = useState<LinkCardItem[]>([]);
  const [editingFileId, setEditingFileId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({ displayName: "", announcedAt: "", folderId: NO_FOLDER });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState(ALL_FOLDERS);
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

  async function loadFiles() {
    try {
      const data = await listFiles({
        search: search.trim() || undefined,
        folderId: folderFilter === ALL_FOLDERS ? undefined : Number(folderFilter),
      });
      setGroups(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "無法載入檔案列表");
    }
  }

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, search, folderFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setVisibleCounts({});
  }, [search, folderFilter]);

  useEffect(() => {
    listFolders()
      .then(setFolders)
      .catch(() => setFolders([]));
  }, []);

  useEffect(() => {
    listLinkCards({ folderId: folderFilter === ALL_FOLDERS ? undefined : Number(folderFilter) })
      .then(setLinkCards)
      .catch(() => setLinkCards([]));
  }, [folderFilter, user]);

  async function handleDownload(file: FileItem) {
    try {
      await downloadFile(file);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "下載失敗");
    }
  }

  async function handleToggleVisibility(file: FileItem) {
    const makingPrivate = file.is_public;
    const ok = await confirm({
      title: makingPrivate ? "設為私密" : "設為公開",
      description: makingPrivate
        ? `確定要將「${file.filename}」設為私密嗎？設為私密後，訪客將無法瀏覽或下載此檔案。`
        : `確定要將「${file.filename}」設為公開嗎？設為公開後，所有訪客都能瀏覽並下載此檔案。`,
      confirmLabel: "確定",
    });
    if (!ok) {
      return;
    }
    try {
      await updateFileVisibility(file.id, !file.is_public);
      await loadFiles();
      toast.success(`已將「${file.filename}」設為${makingPrivate ? "私密" : "公開"}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新失敗";
      setError(message);
      toast.error(message);
    }
  }

  async function handleDelete(file: FileItem) {
    const ok = await confirm({
      title: "刪除檔案",
      description: `確定要刪除「${file.filename}」嗎？此操作無法復原。`,
      confirmLabel: "刪除",
      variant: "destructive",
    });
    if (!ok) {
      return;
    }
    try {
      await deleteFile(file.id);
      await loadFiles();
      toast.success(`已刪除「${file.filename}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "刪除失敗";
      setError(message);
      toast.error(message);
    }
  }

  function startEdit(file: FileItem) {
    setEditingFileId(file.id);
    setEditDraft({
      displayName: file.display_name ?? "",
      announcedAt: file.announced_at ?? "",
      folderId: file.folder_id !== null ? String(file.folder_id) : NO_FOLDER,
    });
  }

  function cancelEdit() {
    setEditingFileId(null);
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>, file: FileItem) {
    event.preventDefault();
    setIsSavingEdit(true);
    try {
      await updateFile(file.id, {
        display_name: editDraft.displayName.trim() || null,
        announced_at: editDraft.announcedAt || null,
        folder_id: editDraft.folderId === NO_FOLDER ? null : Number(editDraft.folderId),
      });
      setEditingFileId(null);
      await loadFiles();
      toast.success("已更新檔案資訊");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新失敗";
      setError(message);
      toast.error(message);
    } finally {
      setIsSavingEdit(false);
    }
  }

  function canManage(file: FileItem): boolean {
    return !!user && (user.id === file.owner_id || user.role === "admin");
  }

  const filteredLinkCards = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return linkCards;
    }
    return linkCards.filter(
      (card) =>
        card.title.toLowerCase().includes(keyword) || (card.description?.toLowerCase().includes(keyword) ?? false),
    );
  }, [linkCards, search]);

  interface MergedGroup {
    key: string;
    folder: FolderItem | null;
    files: FileItem[];
    linkCards: LinkCardItem[];
  }

  const mergedGroups = useMemo<MergedGroup[]>(() => {
    const byKey = new Map<string, MergedGroup>();

    for (const group of groups ?? []) {
      const key = group.folder ? String(group.folder.id) : "__root__";
      byKey.set(key, { key, folder: group.folder, files: group.files, linkCards: [] });
    }

    for (const card of filteredLinkCards) {
      const key = card.folder_id !== null ? String(card.folder_id) : "__root__";
      let entry = byKey.get(key);
      if (!entry) {
        const folder = card.folder_id !== null ? (folders.find((f) => f.id === card.folder_id) ?? null) : null;
        entry = { key, folder, files: [], linkCards: [] };
        byKey.set(key, entry);
      }
      entry.linkCards.push(card);
    }

    return Array.from(byKey.values()).sort((a, b) => {
      if (a.folder === null) return -1;
      if (b.folder === null) return 1;
      return a.folder.name.localeCompare(b.folder.name);
    });
  }, [groups, filteredLinkCards, folders]);

  const hasFiles = mergedGroups.some((group) => group.files.length > 0 || group.linkCards.length > 0);

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
        <h1>{heroTitle}</h1>
        <p className="mx-auto max-w-[560px] text-[17px] leading-[1.55] text-muted-foreground">{heroSubtitle}</p>
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2>檔案列表</h2>
            <div className="flex flex-wrap gap-2">
              <Input
                type="search"
                placeholder="依檔名搜尋…"
                className="w-56"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="依檔名搜尋檔案"
              />
              <Select value={folderFilter} onValueChange={(value) => value && setFolderFilter(value)}>
                <SelectTrigger className="w-40" aria-label="依卡片分類篩選">
                  <SelectValue>
                    {(value: string) =>
                      value === ALL_FOLDERS ? "全部分類" : (folders.find((f) => String(f.id) === value)?.name ?? "全部分類")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FOLDERS}>全部分類</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={String(folder.id)}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {groups === null && !error && <p className="text-sm text-muted-foreground">載入中…</p>}
          {groups !== null && !hasFiles && (
            <div className="rounded-md border border-dashed border-border p-8 text-center">
              <p className="mb-1 font-medium text-foreground">目前沒有可檢視的檔案</p>
              <p className="text-sm text-muted-foreground">
                {search || folderFilter !== ALL_FOLDERS
                  ? "沒有符合搜尋條件的檔案。"
                  : "登入後即可上傳檔案，公開的檔案會顯示在這裡。"}
              </p>
            </div>
          )}
          {groups !== null && hasFiles && (
            <div className="flex flex-col gap-6">
              {mergedGroups.map((group) => {
                const groupKey = group.key;
                const visibleCount = visibleCounts[groupKey] ?? FILES_PAGE_SIZE;
                const visibleFiles = group.files.slice(0, visibleCount);
                const remaining = group.files.length - visibleFiles.length;
                return (
                  <div key={groupKey}>
                    <h3 className="mb-0.5 text-base text-foreground">{group.folder?.name ?? "未分類"}</h3>
                    {group.folder?.description && (
                      <p className="mb-2 text-sm text-muted-foreground">{group.folder.description}</p>
                    )}
                    {group.linkCards.length > 0 && (
                      <ul className="mb-2 flex flex-col gap-2">
                        {group.linkCards.map((card) => (
                          <li key={`link-${card.id}`}>
                            <a
                              href={card.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-accent/30 p-3 no-underline hover:bg-accent/60"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="flex items-center gap-1.5 font-medium text-foreground">
                                  <ExternalLink className="size-4 text-muted-foreground" />
                                  {card.title}
                                </span>
                                {card.description && (
                                  <span className="text-sm text-muted-foreground">{card.description}</span>
                                )}
                              </div>
                              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                連結
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    <ul className="flex flex-col gap-2">
                      {visibleFiles.map((file) =>
                      editingFileId === file.id ? (
                        <li key={file.id} className="rounded-lg border border-border p-3">
                          <form
                            className="flex flex-col gap-3"
                            onSubmit={(event) => handleSaveEdit(event, file)}
                          >
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor={`edit-name-${file.id}`}>顯示名稱</Label>
                              <Input
                                id={`edit-name-${file.id}`}
                                type="text"
                                value={editDraft.displayName}
                                onChange={(e) =>
                                  setEditDraft((draft) => ({ ...draft, displayName: e.target.value }))
                                }
                                placeholder={file.filename}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor={`edit-folder-${file.id}`}>卡片分類</Label>
                              <Select
                                value={editDraft.folderId}
                                onValueChange={(value) =>
                                  value && setEditDraft((draft) => ({ ...draft, folderId: value }))
                                }
                              >
                                <SelectTrigger id={`edit-folder-${file.id}`} className="w-full">
                                  <SelectValue>
                                    {(value: string) =>
                                      value === NO_FOLDER
                                        ? "未分類"
                                        : (folders.find((f) => String(f.id) === value)?.name ?? "未分類")
                                    }
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={NO_FOLDER}>未分類</SelectItem>
                                  {folders.map((folder) => (
                                    <SelectItem key={folder.id} value={String(folder.id)}>
                                      {folder.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor={`edit-date-${file.id}`}>公告日期</Label>
                              <Input
                                id={`edit-date-${file.id}`}
                                type="date"
                                value={editDraft.announcedAt}
                                onChange={(e) =>
                                  setEditDraft((draft) => ({ ...draft, announcedAt: e.target.value }))
                                }
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button type="submit" size="sm" disabled={isSavingEdit}>
                                {isSavingEdit ? "儲存中…" : "儲存"}
                              </Button>
                              <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                                取消
                              </Button>
                            </div>
                          </form>
                        </li>
                      ) : (
                        <li
                          key={file.id}
                          className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-3"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-foreground">
                              {file.display_name || file.filename}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatSize(file.size)} &middot; {file.is_public ? "公開" : "私密"}
                              {file.announced_at && <> &middot; 公告於 {file.announced_at}</>}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleDownload(file)}>
                              下載
                            </Button>
                            {canManage(file) && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => startEdit(file)}>
                                  編輯
                                </Button>
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
                      ),
                    )}
                    </ul>
                    {remaining > 0 && (
                      <div className="mt-3 flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setVisibleCounts((counts) => ({
                              ...counts,
                              [groupKey]: visibleCount + FILES_PAGE_SIZE,
                            }))
                          }
                        >
                          載入更多（還有 {remaining} 筆）
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default HomePage;
