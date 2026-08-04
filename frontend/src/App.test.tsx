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
