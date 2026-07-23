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
      auth_source: "local",
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
      auth_source: "local",
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
      auth_source: "local",
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
