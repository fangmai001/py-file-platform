import { NavLink, Route, Routes } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? "nav-link active" : "nav-link";
}

function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink to="/" className="brand">
          py-file-platform
        </NavLink>
        <nav className="nav">
          <NavLink to="/" end className={navLinkClass}>
            首頁
          </NavLink>
          <NavLink to="/login" className={navLinkClass}>
            登入
          </NavLink>
          <NavLink to="/admin" className={navLinkClass}>
            管理
          </NavLink>
        </nav>
      </header>
      <main className="site-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <span>py-file-platform &middot; 內部文件共享平台</span>
      </footer>
    </div>
  );
}

export default App;
