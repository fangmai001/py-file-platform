import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext";
import { ConfirmDialogProvider } from "../context/ConfirmDialogContext";
import AdminPage from "./AdminPage";

vi.mock("../api/auth", () => ({
  login: vi.fn(),
  fetchCurrentUser: vi.fn(),
}));
vi.mock("../api/admin", () => ({
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  listAuditLogs: vi.fn().mockResolvedValue([]),
}));
vi.mock("../api/files", () => ({
  listFiles: vi.fn().mockResolvedValue([]),
  deleteFile: vi.fn(),
}));
vi.mock("../api/folders", () => ({
  listFolders: vi.fn().mockResolvedValue([]),
  createFolder: vi.fn(),
  updateFolder: vi.fn(),
  deleteFolder: vi.fn(),
}));

import { fetchCurrentUser } from "../api/auth";
import { deleteUser, listUsers } from "../api/admin";

function renderAdminPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ConfirmDialogProvider>
          <AdminPage />
        </ConfirmDialogProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function loginAsAdmin() {
  localStorage.setItem("access_token", "tok");
  vi.mocked(fetchCurrentUser).mockResolvedValue({
    id: 1,
    username: "root",
    role: "admin",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  });
}

describe("AdminPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("filters the user list by username", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([
      {
        id: 1,
        username: "alice",
        role: "user",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 2,
        username: "bob",
        role: "user",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ]);

    renderAdminPage();

    await waitFor(() => expect(screen.getByText("alice")).toBeInTheDocument());
    expect(screen.getByText("bob")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("依帳號搜尋使用者"), "ali");

    await waitFor(() => expect(screen.queryByText("bob")).not.toBeInTheDocument());
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("asks for confirmation before deleting a user, and cancelling keeps it", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([
      {
        id: 2,
        username: "bob",
        role: "user",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ]);

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("bob")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "刪除" }));

    await waitFor(() => expect(screen.getByText(/此操作無法復原/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(deleteUser).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "刪除" }));
    await waitFor(() => expect(screen.getByText(/此操作無法復原/)).toBeInTheDocument());
    const deleteButtons = screen.getAllByRole("button", { name: "刪除" });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith(2));
  });

  it("switches between tabs", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);

    renderAdminPage();

    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    expect(screen.queryByText("卡片列表")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "卡片" }));

    await waitFor(() => expect(screen.getByText("卡片列表")).toBeInTheDocument());
  });
});
