import { useEffect, useState, type FormEvent } from "react";
import { createUser, deleteUser, listUsers, updateUser } from "../api/admin";
import { ApiError } from "../api/client";
import { deleteFile, listFiles } from "../api/files";
import { createFolder, deleteFolder, listFolders, updateFolder } from "../api/folders";
import type { FileItem, FolderGroup, FolderItem, UserItem } from "../api/types";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { useAuth } from "../context/AuthContext";

interface FolderDraft {
  name: string;
  description: string;
}

function toFolderDrafts(items: FolderItem[]): Record<number, FolderDraft> {
  return Object.fromEntries(items.map((f) => [f.id, { name: f.name, description: f.description ?? "" }]));
}

function AdminPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<UserItem[] | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [isCreating, setIsCreating] = useState(false);

  const [fileGroups, setFileGroups] = useState<FolderGroup[] | null>(null);
  const [filesError, setFilesError] = useState<string | null>(null);

  const [folders, setFolders] = useState<FolderItem[] | null>(null);
  const [foldersError, setFoldersError] = useState<string | null>(null);
  const [folderDrafts, setFolderDrafts] = useState<Record<number, FolderDraft>>({});
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

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

  useEffect(() => {
    loadUsers();
    loadFiles();
    loadFolders();
  }, []);

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
    } catch (err) {
      setUsersError(err instanceof ApiError ? err.message : "建立使用者失敗");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleActive(target: UserItem) {
    try {
      await updateUser(target.id, { is_active: !target.is_active });
      await loadUsers();
    } catch (err) {
      setUsersError(err instanceof ApiError ? err.message : "更新使用者失敗");
    }
  }

  async function handleChangeRole(target: UserItem, role: string) {
    try {
      await updateUser(target.id, { role });
      await loadUsers();
    } catch (err) {
      setUsersError(err instanceof ApiError ? err.message : "更新使用者失敗");
    }
  }

  async function handleDeleteUser(target: UserItem) {
    if (!window.confirm(`確定要刪除使用者「${target.username}」嗎？`)) {
      return;
    }
    try {
      await deleteUser(target.id);
      await loadUsers();
    } catch (err) {
      setUsersError(err instanceof ApiError ? err.message : "刪除使用者失敗");
    }
  }

  async function handleDeleteFile(file: FileItem) {
    if (!window.confirm(`確定要刪除檔案「${file.filename}」嗎？`)) {
      return;
    }
    try {
      await deleteFile(file.id);
      await loadFiles();
    } catch (err) {
      setFilesError(err instanceof ApiError ? err.message : "刪除檔案失敗");
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
    } catch (err) {
      setFoldersError(err instanceof ApiError ? err.message : "建立卡片失敗");
    } finally {
      setIsCreatingFolder(false);
    }
  }

  async function handleSaveFolder(folder: FolderItem) {
    const draft = folderDrafts[folder.id];
    try {
      await updateFolder(folder.id, { name: draft.name, description: draft.description.trim() || null });
      await loadFolders();
    } catch (err) {
      setFoldersError(err instanceof ApiError ? err.message : "更新卡片失敗");
    }
  }

  async function handleDeleteFolder(folder: FolderItem) {
    if (!window.confirm(`確定要刪除卡片「${folder.name}」嗎？此卡片下的檔案將變為未分類。`)) {
      return;
    }
    try {
      await deleteFolder(folder.id);
      await loadFolders();
      await loadFiles();
    } catch (err) {
      setFoldersError(err instanceof ApiError ? err.message : "刪除卡片失敗");
    }
  }

  const totalFiles = fileGroups?.reduce((sum, group) => sum + group.files.length, 0) ?? null;

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
          <h2>使用者列表</h2>
          {usersError && <p className="text-sm text-destructive">{usersError}</p>}
          {users === null && !usersError && <p className="text-sm text-muted-foreground">載入中…</p>}
          {users !== null && users.length === 0 && (
            <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
              目前沒有使用者
            </div>
          )}
          {users !== null && users.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>帳號</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
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

      <Card>
        <CardContent className="flex flex-col gap-4 text-left">
          <h2>所有檔案</h2>
          {filesError && <p className="text-sm text-destructive">{filesError}</p>}
          {fileGroups === null && !filesError && <p className="text-sm text-muted-foreground">載入中…</p>}
          {fileGroups !== null && totalFiles === 0 && (
            <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
              目前沒有檔案
            </div>
          )}
          {fileGroups !== null && totalFiles !== null && totalFiles > 0 && (
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
                {fileGroups.flatMap((group) =>
                  group.files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>{file.filename}</TableCell>
                      <TableCell>{file.display_name ?? "—"}</TableCell>
                      <TableCell>{group.folder?.name ?? "未分類"}</TableCell>
                      <TableCell>{file.announced_at ?? "—"}</TableCell>
                      <TableCell>{file.owner_id}</TableCell>
                      <TableCell>{file.is_public ? "公開" : "私密"}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteFile(file)}>
                          刪除
                        </Button>
                      </TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminPage;
