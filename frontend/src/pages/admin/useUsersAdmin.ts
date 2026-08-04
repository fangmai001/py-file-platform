import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createUser, deleteUser, listUsers, resetUserPassword, updateUser } from "../../api/admin";
import { ApiError } from "../../api/client";
import type { UserItem } from "../../api/types";
import { useConfirm } from "../../context/ConfirmDialogContext";

export interface UserDraft {
  email: string;
  role: string;
  full_name: string;
}

function toUserDrafts(items: UserItem[]): Record<number, UserDraft> {
  return Object.fromEntries(
    items.map((u) => [u.id, { email: u.email ?? "", role: u.role, full_name: u.full_name ?? "" }]),
  );
}

/**
 * 一次儲存實際會送出的欄位，以及其中哪些有變動。「儲存」按鈕的啟用狀態與 PATCH 的 payload
 * 都由這裡推導出來，因此兩者不可能脫節。
 */
function diffUser(target: UserItem, draft: UserDraft | undefined) {
  const email = draft?.email.trim() || null;
  const role = draft?.role ?? target.role;
  const fullName = draft?.full_name.trim() || null;
  return {
    email,
    role,
    fullName,
    emailChanged: email !== (target.email ?? null),
    roleChanged: role !== target.role,
    fullNameChanged: fullName !== (target.full_name ?? null),
  };
}

export function isUserDirty(target: UserItem, draft: UserDraft | undefined): boolean {
  const { emailChanged, roleChanged, fullNameChanged } = diffUser(target, draft);
  return emailChanged || roleChanged || fullNameChanged;
}

/**
 * 使用者分頁背後的狀態與操作。放在這裡而不是 UsersTab 內部，是因為即使正在顯示其他分頁，
 * AdminPage 的統計卡片仍需要使用者數量——見 AdminPage.tsx 的說明。
 */
export function useUsersAdmin({ reloadAuditLogs }: { reloadAuditLogs: () => Promise<void> }) {
  const confirm = useConfirm();

  const [users, setUsers] = useState<UserItem[] | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState("");
  const [userDrafts, setUserDrafts] = useState<Record<number, UserDraft>>({});
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<{ username: string; password: string } | null>(null);

  async function loadUsers() {
    try {
      const data = await listUsers();
      setUsers(data);
      setUserDrafts(toUserDrafts(data));
      setUsersError(null);
    } catch (err) {
      setUsersError(err instanceof ApiError ? err.message : "無法載入使用者列表");
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setUsersError(null);
    try {
      await createUser({
        username: newUsername,
        password: newPassword,
        role: newRole,
        email: newEmail.trim() || null,
        full_name: newFullName.trim() || null,
      });
      setNewUsername("");
      setNewPassword("");
      setNewRole("user");
      setNewEmail("");
      setNewFullName("");
      await loadUsers();
      await reloadAuditLogs();
      toast.success(`已建立使用者「${newUsername}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "建立使用者失敗";
      setUsersError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSaveUser(target: UserItem) {
    const { email, role, fullName, emailChanged, roleChanged, fullNameChanged } = diffUser(
      target,
      userDrafts[target.id],
    );
    if (!emailChanged && !roleChanged && !fullNameChanged) {
      return;
    }
    if (roleChanged) {
      const ok = await confirm({
        title: "變更角色",
        description: `確定要將使用者「${target.username}」的角色改為「${role}」嗎？`,
        confirmLabel: "確定",
      });
      if (!ok) {
        return;
      }
    }
    try {
      await updateUser(target.id, {
        ...(emailChanged ? { email } : {}),
        ...(roleChanged ? { role } : {}),
        ...(fullNameChanged ? { full_name: fullName } : {}),
      });
      await loadUsers();
      await reloadAuditLogs();
      toast.success(`已更新使用者「${target.username}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新使用者失敗";
      setUsersError(message);
      toast.error(message);
    }
  }

  async function handleResetPassword(target: UserItem) {
    const ok = await confirm({
      title: "重設密碼",
      description: `確定要重設使用者「${target.username}」的密碼嗎？系統會產生一組新密碼，請於下個視窗複製後轉交給使用者。`,
      confirmLabel: "確定",
    });
    if (!ok) {
      return;
    }
    try {
      const { password } = await resetUserPassword(target.id);
      await loadUsers();
      await reloadAuditLogs();
      setRevealedPassword({ username: target.username, password });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "重設密碼失敗";
      setUsersError(message);
      toast.error(message);
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
      await reloadAuditLogs();
      toast.success(`已${target.is_active ? "停用" : "啟用"}使用者「${target.username}」`);
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
      await reloadAuditLogs();
      toast.success(`已刪除使用者「${target.username}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "刪除使用者失敗";
      setUsersError(message);
      toast.error(message);
    }
  }

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

  return {
    users,
    usersError,
    userFilter,
    setUserFilter,
    userDrafts,
    setUserDrafts,
    filteredUsers,
    newUsername,
    setNewUsername,
    newPassword,
    setNewPassword,
    newRole,
    setNewRole,
    newEmail,
    setNewEmail,
    newFullName,
    setNewFullName,
    isCreating,
    revealedPassword,
    setRevealedPassword,
    handleCreateUser,
    handleSaveUser,
    handleResetPassword,
    handleToggleActive,
    handleDeleteUser,
  };
}
