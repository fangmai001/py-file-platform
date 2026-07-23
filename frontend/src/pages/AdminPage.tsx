import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createUser, deleteUser, listAuditLogs, listUsers, updateUser } from "../api/admin";
import { ApiError } from "../api/client";
import { deleteFile, listFiles } from "../api/files";
import { createFolder, deleteFolder, listFolders, updateFolder } from "../api/folders";
import { createLinkCard, deleteLinkCard, listLinkCards, updateLinkCard } from "../api/link-cards";
import { updateSiteSettings } from "../api/site-settings";
import type { AuditLogItem, FileItem, FolderGroup, FolderItem, LinkCardItem, UserItem } from "../api/types";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmDialogContext";
import { useSiteSettings } from "../context/SiteSettingsContext";

interface FolderDraft {
  name: string;
  description: string;
}

function toFolderDrafts(items: FolderItem[]): Record<number, FolderDraft> {
  return Object.fromEntries(items.map((f) => [f.id, { name: f.name, description: f.description ?? "" }]));
}

interface LinkCardDraft {
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

const AUDIT_LOG_LIMIT = 50;
const ALL_ACTIONS = "__all__";
const NO_FOLDER = "none";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("zh-TW");
}

function AdminPage() {
  const { user: currentUser } = useAuth();
  const confirm = useConfirm();
  const siteSettings = useSiteSettings();

  const [siteSettingsDraft, setSiteSettingsDraft] = useState({
    brandName: siteSettings.brandName,
    browserTitle: siteSettings.browserTitle,
    heroTitle: siteSettings.heroTitle,
    heroSubtitle: siteSettings.heroSubtitle,
  });
  const [isSavingSiteSettings, setIsSavingSiteSettings] = useState(false);

  const [users, setUsers] = useState<UserItem[] | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [isCreating, setIsCreating] = useState(false);

  const [fileGroups, setFileGroups] = useState<FolderGroup[] | null>(null);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [fileFilter, setFileFilter] = useState("");

  const [folders, setFolders] = useState<FolderItem[] | null>(null);
  const [foldersError, setFoldersError] = useState<string | null>(null);
  const [folderDrafts, setFolderDrafts] = useState<Record<number, FolderDraft>>({});
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [linkCards, setLinkCards] = useState<LinkCardItem[] | null>(null);
  const [linkCardsError, setLinkCardsError] = useState<string | null>(null);
  const [linkCardDrafts, setLinkCardDrafts] = useState<Record<number, LinkCardDraft>>({});
  const [newLinkCardTitle, setNewLinkCardTitle] = useState("");
  const [newLinkCardDescription, setNewLinkCardDescription] = useState("");
  const [newLinkCardUrl, setNewLinkCardUrl] = useState("");
  const [newLinkCardFolderId, setNewLinkCardFolderId] = useState(NO_FOLDER);
  const [isCreatingLinkCard, setIsCreatingLinkCard] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[] | null>(null);
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null);
  const [auditActionFilter, setAuditActionFilter] = useState(ALL_ACTIONS);

  async function loadUsers() {
    try {
      setUsers(await listUsers());
      setUsersError(null);
    } catch (err) {
      setUsersError(err instanceof ApiError ? err.message : "無法載入使用者列表");
    }
  }

  async function loadFiles() {
    try {
      setFileGroups(await listFiles());
      setFilesError(null);
    } catch (err) {
      setFilesError(err instanceof ApiError ? err.message : "無法載入檔案列表");
    }
  }

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

  async function loadAuditLogs() {
    try {
      setAuditLogs(await listAuditLogs(AUDIT_LOG_LIMIT));
      setAuditLogsError(null);
    } catch (err) {
      setAuditLogsError(err instanceof ApiError ? err.message : "無法載入操作紀錄");
    }
  }

  useEffect(() => {
    loadUsers();
    loadFiles();
    loadFolders();
    loadLinkCards();
    loadAuditLogs();
  }, []);

  useEffect(() => {
    setSiteSettingsDraft({
      brandName: siteSettings.brandName,
      browserTitle: siteSettings.browserTitle,
      heroTitle: siteSettings.heroTitle,
      heroSubtitle: siteSettings.heroSubtitle,
    });
  }, [siteSettings.brandName, siteSettings.browserTitle, siteSettings.heroTitle, siteSettings.heroSubtitle]);

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setUsersError(null);
    try {
      await createUser({ username: newUsername, password: newPassword, role: newRole });
      setNewUsername("");
      setNewPassword("");
      setNewRole("user");
      await loadUsers();
      await loadAuditLogs();
      toast.success(`已建立使用者「${newUsername}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "建立使用者失敗";
      setUsersError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleActive(target: UserItem) {
    const ok = await confirm({
      title: target.is_active ? "停用使用者" : "啟用使用者",
      description: target.is_active
        ? `確定要停用使用者「${target.username}」嗎？停用後該帳號將無法登入。`
        : `確定要啟用使用者「${target.username}」嗎？`,
      confirmLabel: "確定",
    });
    if (!ok) {
      return;
    }
    try {
      await updateUser(target.id, { is_active: !target.is_active });
      await loadUsers();
      await loadAuditLogs();
      toast.success(`已${target.is_active ? "停用" : "啟用"}使用者「${target.username}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新使用者失敗";
      setUsersError(message);
      toast.error(message);
    }
  }

  async function handleChangeRole(target: UserItem, role: string) {
    if (role === target.role) {
      return;
    }
    const ok = await confirm({
      title: "變更角色",
      description: `確定要將使用者「${target.username}」的角色改為「${role}」嗎？`,
      confirmLabel: "確定",
    });
    if (!ok) {
      return;
    }
    try {
      await updateUser(target.id, { role });
      await loadUsers();
      await loadAuditLogs();
      toast.success(`已將「${target.username}」的角色改為「${role}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新使用者失敗";
      setUsersError(message);
      toast.error(message);
    }
  }

  async function handleDeleteUser(target: UserItem) {
    const ok = await confirm({
      title: "刪除使用者",
      description: `確定要刪除使用者「${target.username}」嗎？此操作無法復原。`,
      confirmLabel: "刪除",
      variant: "destructive",
    });
    if (!ok) {
      return;
    }
    try {
      await deleteUser(target.id);
      await loadUsers();
      await loadAuditLogs();
      toast.success(`已刪除使用者「${target.username}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "刪除使用者失敗";
      setUsersError(message);
      toast.error(message);
    }
  }

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
      await loadAuditLogs();
      toast.success(`已刪除檔案「${file.filename}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "刪除檔案失敗";
      setFilesError(message);
      toast.error(message);
    }
  }

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
      await loadFiles();
      toast.success(`已刪除卡片「${folder.name}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "刪除卡片失敗";
      setFoldersError(message);
      toast.error(message);
    }
  }

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

  async function handleSaveSiteSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingSiteSettings(true);
    try {
      await updateSiteSettings({
        brand_name: siteSettingsDraft.brandName.trim() || null,
        browser_title: siteSettingsDraft.browserTitle.trim() || null,
        hero_title: siteSettingsDraft.heroTitle.trim() || null,
        hero_subtitle: siteSettingsDraft.heroSubtitle.trim() || null,
      });
      await siteSettings.refresh();
      toast.success("已更新站台設定");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新站台設定失敗";
      toast.error(message);
    } finally {
      setIsSavingSiteSettings(false);
    }
  }

  const totalFiles = fileGroups?.reduce((sum, group) => sum + group.files.length, 0) ?? null;

  const filteredUsers = useMemo(() => {
    if (!users) {
      return users;
    }
    const keyword = userFilter.trim().toLowerCase();
    if (!keyword) {
      return users;
    }
    return users.filter((u) => u.username.toLowerCase().includes(keyword));
  }, [users, userFilter]);

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

  const auditActions = useMemo(() => {
    if (!auditLogs) {
      return [];
    }
    return Array.from(new Set(auditLogs.map((log) => log.action))).sort();
  }, [auditLogs]);

  const filteredAuditLogs = useMemo(() => {
    if (!auditLogs) {
      return auditLogs;
    }
    if (auditActionFilter === ALL_ACTIONS) {
      return auditLogs;
    }
    return auditLogs.filter((log) => log.action === auditActionFilter);
  }, [auditLogs, auditActionFilter]);

  return (
    <div className="page">
      <h1>管理後台</h1>
      <p className="text-sm text-muted-foreground">管理使用者帳號與所有人上傳的檔案。</p>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-2xl font-semibold text-foreground">{users?.length ?? "—"}</span>
            <span className="text-sm text-muted-foreground">使用者總數</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-2xl font-semibold text-foreground">{totalFiles ?? "—"}</span>
            <span className="text-sm text-muted-foreground">檔案總數</span>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">使用者</TabsTrigger>
          <TabsTrigger value="folders">卡片</TabsTrigger>
          <TabsTrigger value="link-cards">連結卡片</TabsTrigger>
          <TabsTrigger value="files">檔案</TabsTrigger>
          <TabsTrigger value="audit-logs">操作紀錄</TabsTrigger>
          <TabsTrigger value="site-settings">站台設定</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="flex flex-col gap-6 pt-4">
          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <h2>新增使用者</h2>
              <form className="flex flex-wrap items-end gap-4" onSubmit={handleCreateUser}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-username">帳號</Label>
                  <Input
                    id="new-username"
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-password">密碼</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-role">角色</Label>
                  <Select value={newRole} onValueChange={(value) => value && setNewRole(value)}>
                    <SelectTrigger id="new-role" className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">user</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "建立中…" : "新增"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2>使用者列表</h2>
                <Input
                  type="search"
                  placeholder="依帳號搜尋…"
                  className="w-56"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  aria-label="依帳號搜尋使用者"
                />
              </div>
              {usersError && <p className="text-sm text-destructive">{usersError}</p>}
              {users === null && !usersError && <p className="text-sm text-muted-foreground">載入中…</p>}
              {filteredUsers !== null && filteredUsers.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
                  {users !== null && users.length > 0 ? "沒有符合條件的使用者" : "目前沒有使用者"}
                </div>
              )}
              {filteredUsers !== null && filteredUsers.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>帳號</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead>新增日期</TableHead>
                      <TableHead>修改日期</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.username}</TableCell>
                        <TableCell>
                          <Select value={u.role} onValueChange={(role) => role && handleChangeRole(u, role)}>
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">user</SelectItem>
                              <SelectItem value="admin">admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{u.is_active ? "啟用" : "停用"}</TableCell>
                        <TableCell>{formatDateTime(u.created_at)}</TableCell>
                        <TableCell>{formatDateTime(u.updated_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleToggleActive(u)}>
                              {u.is_active ? "停用" : "啟用"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(u)}
                              disabled={currentUser?.id === u.id}
                            >
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
        </TabsContent>

        <TabsContent value="folders" className="flex flex-col gap-6 pt-4">
          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <h2>新增卡片</h2>
              <p className="text-sm text-muted-foreground">卡片用來將首頁的檔案分組呈現，檔案上傳或編輯時可選擇要放入哪張卡片。</p>
              <form className="flex flex-wrap items-end gap-4" onSubmit={handleCreateFolder}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-folder-name">名稱</Label>
                  <Input
                    id="new-folder-name"
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-folder-description">描述</Label>
                  <Input
                    id="new-folder-description"
                    type="text"
                    value={newFolderDescription}
                    onChange={(e) => setNewFolderDescription(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isCreatingFolder}>
                  {isCreatingFolder ? "建立中…" : "新增"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <h2>卡片列表</h2>
              {foldersError && <p className="text-sm text-destructive">{foldersError}</p>}
              {folders === null && !foldersError && <p className="text-sm text-muted-foreground">載入中…</p>}
              {folders !== null && folders.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
                  目前沒有卡片
                </div>
              )}
              {folders !== null && folders.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名稱</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {folders.map((folder) => (
                      <TableRow key={folder.id}>
                        <TableCell>
                          <Input
                            type="text"
                            value={folderDrafts[folder.id]?.name ?? ""}
                            onChange={(e) =>
                              setFolderDrafts((drafts) => ({
                                ...drafts,
                                [folder.id]: { ...drafts[folder.id], name: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            value={folderDrafts[folder.id]?.description ?? ""}
                            onChange={(e) =>
                              setFolderDrafts((drafts) => ({
                                ...drafts,
                                [folder.id]: { ...drafts[folder.id], description: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleSaveFolder(folder)}>
                              儲存
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteFolder(folder)}>
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
        </TabsContent>

        <TabsContent value="link-cards" className="flex flex-col gap-6 pt-4">
          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <h2>新增連結卡片</h2>
              <p className="text-sm text-muted-foreground">
                連結卡片會與檔案卡片一併顯示在首頁，點擊後在新分頁開啟指定網址，不涉及檔案上傳/下載。
              </p>
              <form className="flex flex-wrap items-end gap-4" onSubmit={handleCreateLinkCard}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-link-card-title">標題</Label>
                  <Input
                    id="new-link-card-title"
                    type="text"
                    value={newLinkCardTitle}
                    onChange={(e) => setNewLinkCardTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-link-card-description">說明</Label>
                  <Input
                    id="new-link-card-description"
                    type="text"
                    value={newLinkCardDescription}
                    onChange={(e) => setNewLinkCardDescription(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-link-card-url">目標網址</Label>
                  <Input
                    id="new-link-card-url"
                    type="url"
                    placeholder="https://example.com"
                    value={newLinkCardUrl}
                    onChange={(e) => setNewLinkCardUrl(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-link-card-folder">卡片分類</Label>
                  <Select value={newLinkCardFolderId} onValueChange={(value) => value && setNewLinkCardFolderId(value)}>
                    <SelectTrigger id="new-link-card-folder" className="w-40">
                      <SelectValue>
                        {(value: string) =>
                          value === NO_FOLDER ? "未分類" : (folders?.find((f) => String(f.id) === value)?.name ?? "未分類")
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_FOLDER}>未分類</SelectItem>
                      {(folders ?? []).map((folder) => (
                        <SelectItem key={folder.id} value={String(folder.id)}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isCreatingLinkCard}>
                  {isCreatingLinkCard ? "建立中…" : "新增"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <h2>連結卡片列表</h2>
              {linkCardsError && <p className="text-sm text-destructive">{linkCardsError}</p>}
              {linkCards === null && !linkCardsError && <p className="text-sm text-muted-foreground">載入中…</p>}
              {linkCards !== null && linkCards.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
                  目前沒有連結卡片
                </div>
              )}
              {linkCards !== null && linkCards.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>標題</TableHead>
                      <TableHead>網址</TableHead>
                      <TableHead>分類</TableHead>
                      <TableHead>公開</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkCards.map((card) => (
                      <TableRow key={card.id}>
                        <TableCell>
                          <Input
                            type="text"
                            value={linkCardDrafts[card.id]?.title ?? ""}
                            onChange={(e) =>
                              setLinkCardDrafts((drafts) => ({
                                ...drafts,
                                [card.id]: { ...drafts[card.id], title: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="url"
                            value={linkCardDrafts[card.id]?.url ?? ""}
                            onChange={(e) =>
                              setLinkCardDrafts((drafts) => ({
                                ...drafts,
                                [card.id]: { ...drafts[card.id], url: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={linkCardDrafts[card.id]?.folderId ?? NO_FOLDER}
                            onValueChange={(value) =>
                              value &&
                              setLinkCardDrafts((drafts) => ({
                                ...drafts,
                                [card.id]: { ...drafts[card.id], folderId: value },
                              }))
                            }
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue>
                                {(value: string) =>
                                  value === NO_FOLDER
                                    ? "未分類"
                                    : (folders?.find((f) => String(f.id) === value)?.name ?? "未分類")
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_FOLDER}>未分類</SelectItem>
                              {(folders ?? []).map((folder) => (
                                <SelectItem key={folder.id} value={String(folder.id)}>
                                  {folder.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setLinkCardDrafts((drafts) => ({
                                ...drafts,
                                [card.id]: { ...drafts[card.id], isPublic: !drafts[card.id]?.isPublic },
                              }))
                            }
                          >
                            {linkCardDrafts[card.id]?.isPublic ? "公開" : "私密"}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleSaveLinkCard(card)}>
                              儲存
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteLinkCard(card)}>
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
        </TabsContent>

        <TabsContent value="files" className="pt-4">
          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2>所有檔案</h2>
                <Input
                  type="search"
                  placeholder="依檔名搜尋…"
                  className="w-56"
                  value={fileFilter}
                  onChange={(e) => setFileFilter(e.target.value)}
                  aria-label="依檔名搜尋檔案"
                />
              </div>
              {filesError && <p className="text-sm text-destructive">{filesError}</p>}
              {fileGroups === null && !filesError && <p className="text-sm text-muted-foreground">載入中…</p>}
              {filteredFiles !== null && filteredFiles.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
                  {totalFiles !== null && totalFiles > 0 ? "沒有符合條件的檔案" : "目前沒有檔案"}
                </div>
              )}
              {filteredFiles !== null && filteredFiles.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>檔名</TableHead>
                      <TableHead>顯示名稱</TableHead>
                      <TableHead>卡片</TableHead>
                      <TableHead>公告日期</TableHead>
                      <TableHead>擁有者 ID</TableHead>
                      <TableHead>可見度</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiles.map(({ file, folderName }) => (
                      <TableRow key={file.id}>
                        <TableCell>{file.filename}</TableCell>
                        <TableCell>{file.display_name ?? "—"}</TableCell>
                        <TableCell>{folderName}</TableCell>
                        <TableCell>{file.announced_at ?? "—"}</TableCell>
                        <TableCell>{file.owner_id}</TableCell>
                        <TableCell>{file.is_public ? "公開" : "私密"}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteFile(file)}>
                            刪除
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit-logs" className="pt-4">
          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2>操作紀錄</h2>
                <Select value={auditActionFilter} onValueChange={(value) => value && setAuditActionFilter(value)}>
                  <SelectTrigger className="w-48" aria-label="依動作類型篩選">
                    <SelectValue>{(value: string) => (value === ALL_ACTIONS ? "全部動作" : value)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_ACTIONS}>全部動作</SelectItem>
                    {auditActions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">高權限操作的稽核紀錄，僅顯示最近 {AUDIT_LOG_LIMIT} 筆。</p>
              {auditLogsError && <p className="text-sm text-destructive">{auditLogsError}</p>}
              {auditLogs === null && !auditLogsError && <p className="text-sm text-muted-foreground">載入中…</p>}
              {filteredAuditLogs !== null && filteredAuditLogs.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
                  {auditLogs !== null && auditLogs.length > 0 ? "沒有符合條件的操作紀錄" : "目前沒有操作紀錄"}
                </div>
              )}
              {filteredAuditLogs !== null && filteredAuditLogs.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>時間</TableHead>
                      <TableHead>操作者</TableHead>
                      <TableHead>動作</TableHead>
                      <TableHead>對象</TableHead>
                      <TableHead>詳情</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{formatDateTime(log.created_at)}</TableCell>
                        <TableCell>{log.actor_username}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>{log.target ?? "—"}</TableCell>
                        <TableCell>{log.detail ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="site-settings" className="pt-4">
          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <h2>站台設定</h2>
              <p className="text-sm text-muted-foreground">
                自訂導覽列／瀏覽器分頁顯示的站台名稱，以及首頁歡迎卡片的主標題與副標說明文字。欄位留空時使用預設文案。
              </p>
              <form className="flex max-w-lg flex-col gap-4" onSubmit={handleSaveSiteSettings}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="site-brand-name">站台名稱（導覽列）</Label>
                  <Input
                    id="site-brand-name"
                    type="text"
                    value={siteSettingsDraft.brandName}
                    onChange={(e) => setSiteSettingsDraft((draft) => ({ ...draft, brandName: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="site-browser-title">瀏覽器分頁標題</Label>
                  <Input
                    id="site-browser-title"
                    type="text"
                    value={siteSettingsDraft.browserTitle}
                    onChange={(e) => setSiteSettingsDraft((draft) => ({ ...draft, browserTitle: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="site-hero-title">首頁主標題</Label>
                  <Input
                    id="site-hero-title"
                    type="text"
                    value={siteSettingsDraft.heroTitle}
                    onChange={(e) => setSiteSettingsDraft((draft) => ({ ...draft, heroTitle: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="site-hero-subtitle">首頁副標說明</Label>
                  <Input
                    id="site-hero-subtitle"
                    type="text"
                    value={siteSettingsDraft.heroSubtitle}
                    onChange={(e) => setSiteSettingsDraft((draft) => ({ ...draft, heroSubtitle: e.target.value }))}
                  />
                </div>
                <Button type="submit" className="self-start" disabled={isSavingSiteSettings}>
                  {isSavingSiteSettings ? "儲存中…" : "儲存"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminPage;
