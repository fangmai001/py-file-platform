import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { confirmPasswordReset } from "../api/password-reset";
import { ApiError } from "../api/client";
import AuthLayout from "../components/AuthLayout";
import Callout from "../components/Callout";
import { Button, buttonVariants } from "../components/ui/button";
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
      <AuthLayout title="重設密碼連結無效">
        <div className="flex flex-col gap-4 text-left">
          <Callout>連結可能已過期或不完整，請重新申請一次。</Callout>
          <Link
            to="/forgot-password"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            重新申請重設密碼
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="重設密碼" description="請輸入新密碼。">
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
        <Callout>{error}</Callout>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "送出中…" : "重設密碼"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
