import { useEffect, useState, type ReactNode } from "react";
import { Loader2, Moon, Sun } from "lucide-react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import AboutPage from "./pages/AboutPage";
import AdminPage from "./pages/AdminPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProfilePage from "./pages/ProfilePage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import UploadPage from "./pages/UploadPage";
import NotificationBell from "./components/NotificationBell";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ConfirmDialogProvider } from "./context/ConfirmDialogContext";
import { SiteSettingsProvider, useSiteSettings } from "./context/SiteSettingsContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { cn } from "./lib/utils";

// 導覽連結與頁首的 ghost／icon 按鈕統一使用同一顆 32px 的膠囊外型，讓整列看起來像
// 一組控制項，而不是三種不同的視覺語彙。
function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "inline-flex h-8 items-center rounded-full px-3 text-sm font-medium text-muted-foreground no-underline transition-colors hover:bg-accent hover:text-foreground",
    isActive && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
  );
}

// 驗證守衛以前在解析期間會渲染 null，導致畫面閃過一片空白。
function RouteFallback() {
  return (
    <div className="flex min-h-[60svh] items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
      <span className="sr-only">載入中…</span>
    </div>
  );
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <RouteFallback />;
  }
  if (!user || user.role !== "admin") {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <RouteFallback />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// 驅動頁首的捲動陰影。在 jsdom 下也安全，因為那裡的 scrollY 永遠是 0。
function useIsScrolled(threshold = 4) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > threshold);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="rounded-full"
      onClick={toggleTheme}
      aria-label={isDark ? "切換為明亮模式" : "切換為暗黑模式"}
      title={isDark ? "切換為明亮模式" : "切換為暗黑模式"}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}

function HeaderNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <nav className="flex items-center gap-0.5">
      <NavLink to="/" end className={navLinkClass}>
        首頁
      </NavLink>
      <NavLink to="/about" className={navLinkClass}>
        關於
      </NavLink>
      {user && (
        <NavLink to="/upload" className={navLinkClass}>
          上傳
        </NavLink>
      )}
      {user?.role === "admin" && (
        <NavLink to="/admin" className={navLinkClass}>
          管理
        </NavLink>
      )}
      {user ? (
        <>
          <NavLink to="/profile" className={navLinkClass}>
            {user.full_name || user.username}
          </NavLink>
          <div aria-hidden className="mx-1 h-5 w-px bg-border" />
          <NotificationBell />
          <Button variant="ghost" size="sm" className="rounded-full px-3" onClick={handleLogout}>
            登出
          </Button>
        </>
      ) : (
        <NavLink to="/login" className={navLinkClass}>
          登入
        </NavLink>
      )}
      <ThemeToggle />
    </nav>
  );
}

function AppShell() {
  const { brandName, faviconUrl } = useSiteSettings();
  const scrolled = useIsScrolled();

  return (
    <div className="mx-auto box-border flex min-h-svh w-full max-w-app flex-col border-x border-border bg-background">
      <header
        data-scrolled={scrolled}
        className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/85 px-6 py-2.5 backdrop-blur-md transition-shadow supports-backdrop-filter:bg-background/70 data-[scrolled=true]:shadow-sm sm:px-8"
      >
        <NavLink
          to="/"
          className="flex items-center gap-2 text-base font-semibold tracking-[-0.01em] text-foreground no-underline"
        >
          {faviconUrl && <img src={faviconUrl} alt="" className="size-6 rounded-md object-contain" />}
          {brandName}
        </NavLink>
        <HeaderNav />
      </header>
      <main className="w-full flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/upload"
            element={
              <RequireAuth>
                <UploadPage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminPage />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="mt-auto border-t border-border bg-muted/25 px-6 py-6 text-xs text-muted-foreground sm:px-8">
        <span className="font-medium text-foreground">{brandName}</span>
        <span className="mx-2 text-border">&middot;</span>
        <span>內部文件共享平台</span>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <SiteSettingsProvider>
        <AuthProvider>
          <ConfirmDialogProvider>
            <AppShell />
            <Toaster position="bottom-right" duration={4000} visibleToasts={3} />
          </ConfirmDialogProvider>
        </AuthProvider>
      </SiteSettingsProvider>
    </ThemeProvider>
  );
}

export default App;
