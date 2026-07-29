import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import AuthLayout from "../components/AuthLayout";
import Callout from "../components/Callout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "登入失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout title="登入" description="使用本機帳號登入以上傳與管理檔案。">
      <form className="flex flex-col gap-4 text-left" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">帳號</Label>
          <Input
            id="username"
            type="text"
            placeholder="請輸入帳號"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">密碼</Label>
          <Input
            id="password"
            type="password"
            placeholder="請輸入密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Link
            to="/forgot-password"
            className="self-end text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            忘記密碼？
          </Link>
        </div>
        <Callout>{error}</Callout>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "登入中…" : "登入"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default LoginPage;
