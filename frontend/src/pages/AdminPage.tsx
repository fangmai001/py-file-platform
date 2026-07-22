import { useEffect, useState, type FormEvent } from "react";
import { createUser, deleteUser, listUsers, updateUser } from "../api/admin";
import { ApiError } from "../api/client";
import { deleteFile, listFiles } from "../api/files";
import type { FileItem, FolderGroup, UserItem } from "../api/types";
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
      <p className="muted">管理使用者帳號與所有人上傳的檔案。</p>

      <section className="stat-grid">
        <div className="stat-card">
          <span className="stat-value">{users?.length ?? "—"}</span>
          <span className="stat-label">使用者總數</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totalFiles ?? "—"}</span>
          <span className="stat-label">檔案總數</span>
        </div>
      </section>

      <section className="card">
        <h2>新增使用者</h2>
        <form className="form form-row" onSubmit={handleCreateUser}>
          <div className="field">
            <label htmlFor="new-username">帳號</label>
            <input
              id="new-username"
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-password">密碼</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-role">角色</label>
            <select id="new-role" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={isCreating}>
            {isCreating ? "建立中…" : "新增"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>使用者列表</h2>
        {usersError && <p className="error-text">{usersError}</p>}
        {users === null && !usersError && <p className="muted">載入中…</p>}
        {users !== null && users.length === 0 && (
          <div className="empty-state">
            <p>目前沒有使用者</p>
          </div>
        )}
        {users !== null && users.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>帳號</th>
                <th>角色</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>
                    <select value={u.role} onChange={(e) => handleChangeRole(u, e.target.value)}>
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>{u.is_active ? "啟用" : "停用"}</td>
                  <td className="table-actions">
                    <button type="button" className="btn" onClick={() => handleToggleActive(u)}>
                      {u.is_active ? "停用" : "啟用"}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleDeleteUser(u)}
                      disabled={currentUser?.id === u.id}
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>所有檔案</h2>
        {filesError && <p className="error-text">{filesError}</p>}
        {fileGroups === null && !filesError && <p className="muted">載入中…</p>}
        {fileGroups !== null && totalFiles === 0 && (
          <div className="empty-state">
            <p>目前沒有檔案</p>
          </div>
        )}
        {fileGroups !== null && totalFiles !== null && totalFiles > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>檔名</th>
                <th>資料夾</th>
                <th>擁有者 ID</th>
                <th>可見度</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {fileGroups.flatMap((group) =>
                group.files.map((file) => (
                  <tr key={file.id}>
                    <td>{file.filename}</td>
                    <td>{file.folder ?? "未分類"}</td>
                    <td>{file.owner_id}</td>
                    <td>{file.is_public ? "公開" : "私密"}</td>
                    <td className="table-actions">
                      <button type="button" className="btn" onClick={() => handleDeleteFile(file)}>
                        刪除
                      </button>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default AdminPage;
