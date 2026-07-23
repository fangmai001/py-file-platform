import type { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import AboutPage from "./pages/AboutPage";
import AdminPage from "./pages/AdminPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
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

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "rounded-full px-3.5 py-1.5 text-sm text-muted-foreground no-underline transition-colors hover:bg-accent hover:text-foreground",
    isActive && "bg-accent text-foreground",
  );
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return null;
  }
  if (!user || user.role !== "admin") {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return null;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="ml-1 rounded-full"
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
    <nav className="flex items-center gap-1">
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
          <NotificationBell />
          <Button variant="ghost" onClick={handleLogout}>
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
  const { brandName } = useSiteSettings();

  return (
    <div className="mx-auto box-border flex min-h-svh w-full max-w-[1126px] flex-col border-x border-border">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background px-8 py-4">
        <NavLink to="/" className="text-lg font-semibold tracking-tight text-foreground no-underline">
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
        </Routes>
      </main>
      <footer className="mt-auto border-t border-border px-8 py-4 text-sm text-muted-foreground">
        <span>{brandName} &middot; 內部文件共享平台</span>
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
