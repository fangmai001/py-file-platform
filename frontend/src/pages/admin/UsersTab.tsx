import { KeyRound, Power, Save, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import Callout from "../../components/Callout";
import EmptyState from "../../components/EmptyState";
import SectionTitle from "../../components/SectionTitle";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime } from "../../lib/format";
import TableSkeleton from "./TableSkeleton";
import type { useUsersAdmin } from "./useUsersAdmin";

function UsersTab(props: ReturnType<typeof useUsersAdmin>) {
  const {
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
  } = props;
  const { user: currentUser } = useAuth();

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-4 text-left">
          <SectionTitle>新增使用者</SectionTitle>
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
              <Label htmlFor="new-email">Email（選填）</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-full-name">姓名（選填）</Label>
              <Input
                id="new-full-name"
                type="text"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
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
            <SectionTitle>使用者列表</SectionTitle>
            <Input
              type="search"
              placeholder="依帳號搜尋…"
              className="w-56"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              aria-label="依帳號搜尋使用者"
            />
          </div>
          <Callout>{usersError}</Callout>
          {users === null && !usersError && <TableSkeleton />}
          {filteredUsers !== null && filteredUsers.length === 0 && (
            <EmptyState icon={Users} title={users !== null && users.length > 0 ? "沒有符合條件的使用者" : "目前沒有使用者"} />
          )}
          {filteredUsers !== null && filteredUsers.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>帳號</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>Email</TableHead>
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
                      <Input
                        type="text"
                        className="w-32"
                        placeholder="未填寫姓名"
                        aria-label={`「${u.username}」的姓名`}
                        value={userDrafts[u.id]?.full_name ?? ""}
                        onChange={(e) =>
                          setUserDrafts((drafts) => ({
                            ...drafts,
                            [u.id]: { ...drafts[u.id], full_name: e.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="email"
                        className="w-48"
                        placeholder={u.auth_source === "ldap" ? "LDAP 帳號" : "未設定"}
                        value={userDrafts[u.id]?.email ?? ""}
                        onChange={(e) =>
                          setUserDrafts((drafts) => ({
                            ...drafts,
                            [u.id]: { ...drafts[u.id], email: e.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={userDrafts[u.id]?.role ?? u.role}
                        onValueChange={(role) =>
                          role &&
                          setUserDrafts((drafts) => ({
                            ...drafts,
                            [u.id]: { ...drafts[u.id], role },
                          }))
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">user</SelectItem>
                          <SelectItem value="admin">admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "success" : "secondary"}>
                        {u.is_active ? "啟用" : "停用"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(u.created_at)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(u.updated_at)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-nowrap items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="儲存"
                          title="儲存"
                          onClick={() => handleSaveUser(u)}
                        >
                          <Save />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={u.is_active ? "停用" : "啟用"}
                          title={u.is_active ? "停用" : "啟用"}
                          onClick={() => handleToggleActive(u)}
                        >
                          <Power />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="重設密碼"
                          title={u.auth_source === "ldap" ? "LDAP 帳號的密碼由 LDAP 伺服器管理" : "重設密碼"}
                          onClick={() => handleResetPassword(u)}
                          disabled={u.auth_source === "ldap"}
                        >
                          <KeyRound />
                        </Button>
                        <Button
                          variant="destructive-outline"
                          size="icon-sm"
                          aria-label="刪除"
                          title="刪除"
                          onClick={() => handleDeleteUser(u)}
                          disabled={currentUser?.id === u.id}
                        >
                          <Trash2 />
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

      <Dialog open={revealedPassword !== null} onOpenChange={(open) => !open && setRevealedPassword(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>已重設「{revealedPassword?.username}」的密碼</DialogTitle>
            <DialogDescription>此密碼僅顯示這一次，請立即複製並透過其他管道轉交給使用者。</DialogDescription>
          </DialogHeader>
          <Input type="text" readOnly value={revealedPassword?.password ?? ""} className="font-mono" />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={async () => {
                if (revealedPassword) {
                  await navigator.clipboard.writeText(revealedPassword.password);
                  toast.success("已複製密碼");
                }
              }}
            >
              複製
            </Button>
            <Button onClick={() => setRevealedPassword(null)}>關閉</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default UsersTab;
