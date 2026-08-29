import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./api/auth", () => ({
  login: vi.fn(),
  fetchCurrentUser: vi.fn(),
}));
vi.mock("./api/files", () => ({
  listFiles: vi.fn().mockResolvedValue([]),
  uploadFile: vi.fn(),
  updateFile: vi.fn(),
  updateFileVisibility: vi.fn(),
  deleteFile: vi.fn(),
  downloadFile: vi.fn(),
}));
vi.mock("./api/folders", () => ({
  listFolders: vi.fn().mockResolvedValue([]),
  createFolder: vi.fn(),
  updateFolder: vi.fn(),
  deleteFolder: vi.fn(),
}));
vi.mock("./api/highlights", () => ({
  listHighlights: vi.fn().mockResolvedValue([]),
  createHighlight: vi.fn(),
  updateHighlight: vi.fn(),
  deleteHighlight: vi.fn(),
}));
vi.mock("./api/admin", () => ({
  listUsers: vi.fn().mockResolvedValue([]),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  resetUserPassword: vi.fn(),
  listAuditLogs: vi.fn().mockResolvedValue([]),
}));
// 進到 /admin 會一次掛載所有管理分頁的 hook（見 AdminPage.tsx），而包在每個路由外層的
// 外殼又會拉進站台設定與通知鈴鐺——所以這個檔案必須把整片範圍都 mock 起來，
// 而不只是斷言真正碰到的那幾個模組。
vi.mock("./api/link-cards", () => ({
  listLinkCards: vi.fn().mockResolvedValue([]),
  createLinkCard: vi.fn(),
  updateLinkCard: vi.fn(),
  deleteLinkCard: vi.fn(),
}));
vi.mock("./api/feeds", () => ({
  listFeeds: vi.fn().mockResolvedValue([]),
  listFeedArticles: vi.fn().mockResolvedValue([]),
  listAdminFeeds: vi.fn().mockResolvedValue([]),
  createFeed: vi.fn(),
  updateFeed: vi.fn(),
  deleteFeed: vi.fn(),
  fetchFeedNow: vi.fn(),
}));
vi.mock("./api/site-settings", () => ({
  getSiteSettings: vi.fn().mockResolvedValue({
    brand_name: null,
    browser_title: null,
    hero_title: null,
    hero_subtitle: null,
    favicon_url: null,
    hero_image_url: null,
    max_upload_size_mb: 50,
  }),
  updateSiteSettings: vi.fn(),
  uploadFavicon: vi.fn(),
  uploadHeroImage: vi.fn(),
  deleteFavicon: vi.fn(),
  deleteHeroImage: vi.fn(),
  siteAssetUrl: (path: string | null) => path,
}));
vi.mock("./api/ldap-settings", () => ({
  getLdapSettings: vi.fn().mockResolvedValue({
    enabled: false,
    server_uri: null,
    bind_dn: null,
    bind_password_set: false,
    base_dn: null,
    user_search_filter: "(uid={username})",
  }),
  updateLdapSettings: vi.fn(),
}));
vi.mock("./api/smtp-settings", () => ({
  getSmtpSettings: vi.fn().mockResolvedValue({
    enabled: false,
    host: null,
    port: 587,
    username: null,
    password_set: false,
    from_address: "no-reply@example.com",
    use_tls: true,
  }),
  updateSmtpSettings: vi.fn(),
}));
vi.mock("./api/notifications", () => ({
  listNotifications: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

import { fetchCurrentUser } from "./api/auth";

describe("admin route gating", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("redirects a logged-in non-admin user away from /admin", async () => {
    localStorage.setItem("access_token", "tok");
    vi.mocked(fetchCurrentUser).mockResolvedValue({
      id: 1,
      username: "alice",
      role: "user",
      is_active: true,
      email: null,
      full_name: null,
      auth_source: "local",
      notify_by_email: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "登入" })).toBeInTheDocument());
  });

  it("lets an admin user reach the admin page", async () => {
    localStorage.setItem("access_token", "tok");
    vi.mocked(fetchCurrentUser).mockResolvedValue({
      id: 1,
      username: "root",
      role: "admin",
      is_active: true,
      email: null,
      full_name: null,
      auth_source: "local",
      notify_by_email: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
  });

  it("redirects a guest (no token) away from /admin", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "登入" })).toBeInTheDocument());
  });
});

describe("upload route gating", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("redirects a guest (no token) away from /upload", async () => {
    render(
      <MemoryRouter initialEntries={["/upload"]}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "登入" })).toBeInTheDocument());
  });

  it("lets a logged-in user reach the upload page", async () => {
    localStorage.setItem("access_token", "tok");
    vi.mocked(fetchCurrentUser).mockResolvedValue({
      id: 1,
      username: "alice",
      role: "user",
      is_active: true,
      email: null,
      full_name: null,
      auth_source: "local",
      notify_by_email: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    });

    render(
      <MemoryRouter initialEntries={["/upload"]}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "上傳檔案" })).toBeInTheDocument());
  });
});

describe("profile route gating", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("redirects a guest (no token) away from /profile", async () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "登入" })).toBeInTheDocument());
  });

  it("lets a logged-in user reach the profile page", async () => {
    localStorage.setItem("access_token", "tok");
    vi.mocked(fetchCurrentUser).mockResolvedValue({
      id: 1,
      username: "alice",
      role: "user",
      is_active: true,
      email: null,
      full_name: null,
      auth_source: "local",
      notify_by_email: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    });

    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "個人資料" })).toBeInTheDocument());
  });
});

describe("unknown routes", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // 少了 catch-all 路由時，這些網址會渲染出頁首、頁尾夾著一個空的 <main>，
  // 看起來像是頁面壞掉，而不是頁面不存在。
  it("renders the not-found page for an unknown URL", async () => {
    render(
      <MemoryRouter initialEntries={["/no-such-page"]}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "找不到頁面" })).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "回到首頁" })).toHaveAttribute("href", "/");
  });

  it("does not swallow a known route", async () => {
    render(
      <MemoryRouter initialEntries={["/about"]}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "關於本專案" })).toBeInTheDocument(),
    );
    expect(screen.queryByRole("heading", { name: "找不到頁面" })).not.toBeInTheDocument();
  });
});
