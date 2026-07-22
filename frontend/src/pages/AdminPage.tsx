import { useEffect, useState, type FormEvent } from "react";
import { createUser, deleteUser, listUsers, updateUser } from "../api/admin";
import { ApiError } from "../api/client";
import { deleteFile, listFiles } from "../api/files";
import type { FileItem, FolderGroup, UserItem } from "../api/types";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { useAuth } from "../context/AuthContext";

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

  useEffect(() => {
    loadUsers();
    loadFiles();
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
                  <TableHead>資料夾</TableHead>
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
                      <TableCell>{file.folder ?? "未分類"}</TableCell>
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
