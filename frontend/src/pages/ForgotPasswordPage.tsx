import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../api/password-reset";
import { ApiError } from "../api/client";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

function ForgotPasswordPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(usernameOrEmail);
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "送出失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-10">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center text-center">
          <h1 className="text-2xl font-semibold text-foreground">忘記密碼</h1>
          <p className="text-sm text-muted-foreground">
            輸入帳號或 Email，若帳號存在且已設定 Email，我們會寄送重設密碼連結。
          </p>
        </CardHeader>
        <CardContent>
          {message ? (
            <div className="flex flex-col gap-4 text-left">
              <p className="text-sm text-foreground">{message}</p>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
                返回登入頁
              </Link>
            </div>
          ) : (
            <form className="flex flex-col gap-4 text-left" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="username-or-email">帳號或 Email</Label>
                <Input
                  id="username-or-email"
                  type="text"
                  placeholder="請輸入帳號或 Email"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "送出中…" : "送出重設連結"}
              </Button>
              <Link to="/login" className="self-center text-sm text-muted-foreground hover:text-foreground">
                返回登入頁
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ForgotPasswordPage;
