import type { ReactNode } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? "nav-link active" : "nav-link";
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

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "切換為明亮模式" : "切換為暗黑模式"}
      title={isDark ? "切換為明亮模式" : "切換為暗黑模式"}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
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
    <nav className="nav">
      <NavLink to="/" end className={navLinkClass}>
        首頁
      </NavLink>
      {user?.role === "admin" && (
        <NavLink to="/admin" className={navLinkClass}>
          管理
        </NavLink>
      )}
      {user ? (
        <>
          <span className="nav-user">{user.username}</span>
          <button type="button" className="btn" onClick={handleLogout}>
            登出
          </button>
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
  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink to="/" className="brand">
          py-file-platform
        </NavLink>
        <HeaderNav />
      </header>
      <main className="site-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
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
      <footer className="site-footer">
        <span>py-file-platform &middot; 內部文件共享平台</span>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
