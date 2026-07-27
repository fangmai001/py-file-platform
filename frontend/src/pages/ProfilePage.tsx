import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { changeCurrentUserPassword, updateCurrentUser } from "../api/auth";
import { ApiError } from "../api/client";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";

function ProfilePage() {
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [notifyByEmail, setNotifyByEmail] = useState(user?.notify_by_email ?? true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (!user) {
    return null;
  }

  const isLdapAccount = user.auth_source === "ldap";

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    setIsSavingProfile(true);
    try {
      const updated = await updateCurrentUser(fullName.trim(), email.trim() || null, notifyByEmail);
      setUser(updated);
      toast.success("個人資料已更新");
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : "更新個人資料失敗，請稍後再試");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordError("兩次輸入的新密碼不一致");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changeCurrentUserPassword(currentPassword, newPassword);
      toast.success("密碼已更新");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "變更密碼失敗，請稍後再試");
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className="page flex flex-col gap-6">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold text-foreground">個人資料</h1>
          <p className="text-sm text-muted-foreground">帳號：{user.username}</p>
        </CardHeader>
        <CardContent>
          <form className="flex max-w-sm flex-col gap-4" onSubmit={handleProfileSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full-name">姓名</Label>
              <Input
                id="full-name"
                type="text"
                placeholder="請輸入姓名"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                placeholder="請輸入 Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="notify-by-email"
                checked={notifyByEmail}
                onCheckedChange={(checked) => setNotifyByEmail(checked === true)}
              />
              <Label htmlFor="notify-by-email">上傳通知寄送 Email（站內通知不受影響）</Label>
            </div>
            {profileError && <p className="text-sm text-destructive">{profileError}</p>}
            <Button type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? "儲存中…" : "儲存"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-foreground">變更密碼</h2>
          {isLdapAccount && (
            <p className="text-sm text-muted-foreground">此帳號使用 LDAP 驗證，密碼由 LDAP 伺服器管理，無法在此變更。</p>
          )}
        </CardHeader>
        {!isLdapAccount && (
          <CardContent>
            <form className="flex max-w-sm flex-col gap-4" onSubmit={handlePasswordSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="current-password">目前密碼</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-password">新密碼</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-new-password">確認新密碼</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
              </div>
              {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? "更新中…" : "變更密碼"}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default ProfilePage;
