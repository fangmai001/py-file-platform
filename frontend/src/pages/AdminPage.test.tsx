import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext";
import { ConfirmDialogProvider } from "../context/ConfirmDialogContext";
import { SiteSettingsProvider } from "../context/SiteSettingsContext";
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
vi.mock("../api/link-cards", () => ({
  listLinkCards: vi.fn().mockResolvedValue([]),
  createLinkCard: vi.fn(),
  updateLinkCard: vi.fn(),
  deleteLinkCard: vi.fn(),
}));
vi.mock("../api/site-settings", () => ({
  getSiteSettings: vi.fn().mockResolvedValue({
    brand_name: null,
    browser_title: null,
    hero_title: null,
    hero_subtitle: null,
  }),
  updateSiteSettings: vi.fn(),
}));

import { fetchCurrentUser } from "../api/auth";
import { deleteUser, listAuditLogs, listUsers } from "../api/admin";
import { createLinkCard, deleteLinkCard, listLinkCards } from "../api/link-cards";
import { getSiteSettings, updateSiteSettings } from "../api/site-settings";

function renderAdminPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SiteSettingsProvider>
          <ConfirmDialogProvider>
            <AdminPage />
          </ConfirmDialogProvider>
        </SiteSettingsProvider>
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

  it("shows a readable label, not the raw sentinel value, for the audit log action filter", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(listAuditLogs).mockResolvedValue([
      {
        id: 1,
        actor_id: 1,
        actor_username: "root",
        action: "folder.create",
        target: "財務",
        detail: null,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]);

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "操作紀錄" }));

    await waitFor(() => expect(screen.getByLabelText("依動作類型篩選")).toBeInTheDocument());
    expect(screen.getByLabelText("依動作類型篩選")).toHaveTextContent("全部動作");
    expect(screen.queryByText("__all__")).not.toBeInTheDocument();
  });

  it("creates a link card from the 連結卡片 tab", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(createLinkCard).mockResolvedValue({
      id: 1,
      title: "社團官網",
      description: null,
      url: "https://example.com/",
      folder_id: null,
      is_public: true,
      created_at: "2024-01-01T00:00:00Z",
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "連結卡片" }));

    await waitFor(() => expect(screen.getByLabelText("標題")).toBeInTheDocument());
    await user.type(screen.getByLabelText("標題"), "社團官網");
    await user.type(screen.getByLabelText("目標網址"), "https://example.com");
    await user.click(screen.getByRole("button", { name: "新增" }));

    await waitFor(() =>
      expect(createLinkCard).toHaveBeenCalledWith({
        title: "社團官網",
        description: null,
        url: "https://example.com",
        folder_id: null,
      }),
    );
  });

  it("asks for confirmation before deleting a link card", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(listLinkCards).mockResolvedValue([
      {
        id: 1,
        title: "社團官網",
        description: null,
        url: "https://example.com/",
        folder_id: null,
        is_public: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]);

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "連結卡片" }));

    await waitFor(() => expect(screen.getByDisplayValue("社團官網")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "刪除" }));

    await waitFor(() => expect(screen.getByText(/此操作無法復原/)).toBeInTheDocument());
    const deleteButtons = screen.getAllByRole("button", { name: "刪除" });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => expect(deleteLinkCard).toHaveBeenCalledWith(1));
  });

  it("saves site settings from the 站台設定 tab", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(getSiteSettings).mockResolvedValue({
      brand_name: "舊名稱",
      browser_title: "舊分頁標題",
      hero_title: "舊主標題",
      hero_subtitle: "舊副標",
    });
    vi.mocked(updateSiteSettings).mockResolvedValue({
      brand_name: "我的社團",
      browser_title: "舊分頁標題",
      hero_title: "舊主標題",
      hero_subtitle: "舊副標",
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "站台設定" }));

    const brandInput = await screen.findByDisplayValue("舊名稱");
    await user.clear(brandInput);
    await user.type(brandInput, "我的社團");
    await user.click(screen.getByRole("button", { name: "儲存" }));

    await waitFor(() =>
      expect(updateSiteSettings).toHaveBeenCalledWith({
        brand_name: "我的社團",
        browser_title: "舊分頁標題",
        hero_title: "舊主標題",
        hero_subtitle: "舊副標",
      }),
    );
  });
});
