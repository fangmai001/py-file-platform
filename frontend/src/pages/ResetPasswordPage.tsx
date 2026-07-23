import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { confirmPasswordReset } from "../api/password-reset";
import { ApiError } from "../api/client";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmNewPassword) {
      setError("兩次輸入的密碼不一致");
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(token, newPassword);
      toast.success("密碼已重設，請使用新密碼登入");
      navigate("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "重設密碼失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-10">
        <Card className="w-full max-w-sm text-center">
          <CardHeader className="items-center text-center">
            <h1 className="text-2xl font-semibold text-foreground">重設密碼連結無效</h1>
          </CardHeader>
          <CardContent>
            <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
              重新申請重設密碼
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-10">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center text-center">
          <h1 className="text-2xl font-semibold text-foreground">重設密碼</h1>
          <p className="text-sm text-muted-foreground">請輸入新密碼。</p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4 text-left" onSubmit={handleSubmit}>
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "送出中…" : "重設密碼"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default ResetPasswordPage;
