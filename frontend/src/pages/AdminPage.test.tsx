import { render, screen, waitFor, within } from "@testing-library/react";
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
  resetUserPassword: vi.fn(),
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
vi.mock("../api/feeds", () => ({
  listAdminFeeds: vi.fn().mockResolvedValue([]),
  createFeed: vi.fn(),
  updateFeed: vi.fn(),
  deleteFeed: vi.fn(),
  fetchFeedNow: vi.fn(),
  fetchAllFeeds: vi.fn(),
  getFeedSettings: vi.fn().mockResolvedValue({
    fetch_enabled: false,
    fetch_interval_minutes: 60,
    last_run_at: null,
    last_run_status: null,
    last_run_detail: null,
  }),
  updateFeedSettings: vi.fn(),
}));
vi.mock("../api/highlights", () => ({
  listHighlights: vi.fn().mockResolvedValue([]),
  createHighlight: vi.fn(),
  updateHighlight: vi.fn(),
  deleteHighlight: vi.fn(),
}));
vi.mock("../api/site-settings", () => ({
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
vi.mock("../api/ldap-settings", () => ({
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
vi.mock("../api/smtp-settings", () => ({
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

import { fetchCurrentUser } from "../api/auth";
import { createUser, deleteUser, listAuditLogs, listUsers, resetUserPassword, updateUser } from "../api/admin";
import { getLdapSettings, updateLdapSettings } from "../api/ldap-settings";
import { getSmtpSettings, updateSmtpSettings } from "../api/smtp-settings";
import { ApiError } from "../api/client";
import { createHighlight, deleteHighlight, listHighlights, updateHighlight } from "../api/highlights";
import { createLinkCard, deleteLinkCard, listLinkCards, updateLinkCard } from "../api/link-cards";
import {
  createFeed,
  deleteFeed,
  fetchAllFeeds,
  fetchFeedNow,
  getFeedSettings,
  listAdminFeeds,
  updateFeedSettings,
} from "../api/feeds";
import type { AdminFeedSource } from "../api/types";
import { createFolder, deleteFolder, listFolders, updateFolder } from "../api/folders";
import { deleteFile, listFiles } from "../api/files";
import {
  deleteHeroImage,
  getSiteSettings,
  updateSiteSettings,
  uploadFavicon,
} from "../api/site-settings";

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

function makeFeed(overrides: Partial<AdminFeedSource> = {}): AdminFeedSource {
  return {
    id: 1,
    title: "消息部落格",
    description: null,
    url: "https://example.com/rss",
    folder_id: null,
    is_public: true,
    is_active: true,
    last_fetched_at: null,
    last_status: null,
    last_error: null,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

async function loginAsAdmin() {
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
        email: null,
        full_name: null,
        auth_source: "local",
        notify_by_email: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 2,
        username: "bob",
        role: "user",
        is_active: true,
        email: null,
        full_name: null,
        auth_source: "local",
        notify_by_email: true,
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

  it("creates a user with an email address", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(createUser).mockResolvedValue({
      id: 3,
      username: "carol",
      role: "user",
      is_active: true,
      email: "carol@example.com",
      full_name: null,
      auth_source: "local",
      notify_by_email: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByLabelText("帳號")).toBeInTheDocument());
    await user.type(screen.getByLabelText("帳號"), "carol");
    await user.type(screen.getByLabelText("密碼"), "s3cret-pw");
    await user.type(screen.getByLabelText("Email（選填）"), "carol@example.com");
    await user.click(screen.getByRole("button", { name: "新增" }));

    await waitFor(() =>
      expect(createUser).toHaveBeenCalledWith({
        username: "carol",
        password: "s3cret-pw",
        role: "user",
        email: "carol@example.com",
        full_name: null,
      }),
    );
  });

  it("saves an edited email for an existing user", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([
      {
        id: 2,
        username: "bob",
        role: "user",
        is_active: true,
        email: null,
        full_name: null,
        auth_source: "local",
        notify_by_email: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ]);
    vi.mocked(updateUser).mockResolvedValue({
      id: 2,
      username: "bob",
      role: "user",
      is_active: true,
      email: "bob@example.com",
      full_name: null,
      auth_source: "local",
      notify_by_email: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("bob")).toBeInTheDocument());
    const emailInput = screen.getByPlaceholderText("未設定");
    await user.type(emailInput, "bob@example.com");
    await user.click(screen.getByRole("button", { name: "儲存" }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith(2, { email: "bob@example.com" }));
  });

  it("keeps a user row's 儲存 disabled until something in it actually changes", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([
      {
        id: 2,
        username: "bob",
        role: "user",
        is_active: true,
        email: "bob@example.com",
        full_name: null,
        auth_source: "local",
        notify_by_email: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ]);

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("bob")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "儲存" })).toBeDisabled();

    await user.type(screen.getByLabelText("「bob」的姓名"), "小巴");
    expect(screen.getByRole("button", { name: "儲存" })).toBeEnabled();
  });

  it("resets a user's password after confirmation and reveals the generated password", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([
      {
        id: 2,
        username: "bob",
        role: "user",
        is_active: true,
        email: null,
        full_name: null,
        auth_source: "local",
        notify_by_email: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ]);
    vi.mocked(resetUserPassword).mockResolvedValue({ password: "gener4ted-pw" });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("bob")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "重設密碼" }));

    await waitFor(() => expect(screen.getByText(/確定要重設使用者「bob」的密碼嗎/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "確定" }));

    await waitFor(() => expect(resetUserPassword).toHaveBeenCalledWith(2));
    expect(await screen.findByText("已重設「bob」的密碼")).toBeInTheDocument();
    expect(screen.getByDisplayValue("gener4ted-pw")).toBeInTheDocument();
  });

  it("disables password reset for LDAP accounts", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([
      {
        id: 2,
        username: "carl",
        role: "user",
        is_active: true,
        email: null,
        full_name: null,
        auth_source: "ldap",
        notify_by_email: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ]);

    renderAdminPage();

    await waitFor(() => expect(screen.getByText("carl")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "重設密碼" })).toBeDisabled();
  });

  it("stages a role change and only saves it after confirming", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([
      {
        id: 2,
        username: "bob",
        role: "user",
        is_active: true,
        email: null,
        full_name: null,
        auth_source: "local",
        notify_by_email: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ]);
    vi.mocked(updateUser).mockResolvedValue({
      id: 2,
      username: "bob",
      role: "admin",
      is_active: true,
      email: null,
      full_name: null,
      auth_source: "local",
      notify_by_email: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("bob")).toBeInTheDocument());
    const roleCombobox = screen.getAllByRole("combobox").at(-1);
    if (!roleCombobox) {
      throw new Error("role combobox not found");
    }
    await user.click(roleCombobox);
    await user.click(screen.getByRole("option", { name: "管理員" }));

    expect(updateUser).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "儲存" }));
    await waitFor(() => expect(screen.getByText(/角色改為「admin」/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "確定" }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith(2, { role: "admin" }));
  });

  it("asks for confirmation before deleting a user, and cancelling keeps it", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([
      {
        id: 2,
        username: "bob",
        role: "user",
        is_active: true,
        email: null,
        full_name: null,
        auth_source: "local",
        notify_by_email: true,
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
    expect(screen.queryByText("資料夾列表")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "資料夾" }));

    await waitFor(() => expect(screen.getByText("資料夾列表")).toBeInTheDocument());
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

  it("creates a folder from the 資料夾 tab", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(createFolder).mockResolvedValue({
      id: 1,
      name: "教學文件",
      description: "上課用",
      created_at: "2024-01-01T00:00:00Z",
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "資料夾" }));

    await waitFor(() => expect(screen.getByLabelText("名稱")).toBeInTheDocument());
    await user.type(screen.getByLabelText("名稱"), "教學文件");
    await user.type(screen.getByLabelText("說明"), "上課用");
    await user.click(screen.getByRole("button", { name: "新增" }));

    await waitFor(() =>
      expect(createFolder).toHaveBeenCalledWith({ name: "教學文件", description: "上課用" }),
    );
  });

  it("edits and saves a folder's description", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(listFolders).mockResolvedValue([
      { id: 1, name: "教學文件", description: null, created_at: "2024-01-01T00:00:00Z" },
    ]);
    vi.mocked(updateFolder).mockResolvedValue({
      id: 1,
      name: "教學文件",
      description: "上課用",
      created_at: "2024-01-01T00:00:00Z",
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "資料夾" }));

    const nameInput = await screen.findByDisplayValue("教學文件");
    const row = nameInput.closest("tr");
    if (!row) {
      throw new Error("folder row not found");
    }
    const descriptionInput = within(row).getAllByRole("textbox")[1];
    await user.type(descriptionInput, "上課用");
    await user.click(within(row).getByRole("button", { name: "儲存" }));

    await waitFor(() =>
      expect(updateFolder).toHaveBeenCalledWith(1, { name: "教學文件", description: "上課用" }),
    );
  });

  it("keeps a folder row's 儲存 disabled until something in it actually changes", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(listFolders).mockResolvedValue([
      { id: 1, name: "教學文件", description: "上課用", created_at: "2024-01-01T00:00:00Z" },
    ]);

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "資料夾" }));

    const nameInput = await screen.findByDisplayValue("教學文件");
    const row = nameInput.closest("tr");
    if (!row) {
      throw new Error("folder row not found");
    }
    expect(within(row).getByRole("button", { name: "儲存" })).toBeDisabled();

    await user.type(nameInput, "（舊）");
    expect(within(row).getByRole("button", { name: "儲存" })).toBeEnabled();
    expect(updateFolder).not.toHaveBeenCalled();
  });

  it("asks for confirmation before deleting a folder, and warns its files become unfiled", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(listFolders).mockResolvedValue([
      { id: 1, name: "教學文件", description: null, created_at: "2024-01-01T00:00:00Z" },
    ]);

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "資料夾" }));

    await waitFor(() => expect(screen.getByDisplayValue("教學文件")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "刪除" }));

    // 刪除資料夾的影響不只限於資料夾本身——它會讓裡面的每個檔案都變成未分類，
    // 所以對話框必須在管理員按下去之前把這件事講清楚。
    await waitFor(() => expect(screen.getByText(/裡面的檔案將變為未分類/)).toBeInTheDocument());
    const deleteButtons = screen.getAllByRole("button", { name: "刪除" });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => expect(deleteFolder).toHaveBeenCalledWith(1));
  });

  it("refreshes the audit log after a folder is deleted", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(listFolders).mockResolvedValue([
      { id: 1, name: "教學文件", description: null, created_at: "2024-01-01T00:00:00Z" },
    ]);

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    // 掛載時載入一次。
    await waitFor(() => expect(listAuditLogs).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("tab", { name: "資料夾" }));
    await waitFor(() => expect(screen.getByDisplayValue("教學文件")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "刪除" }));
    await waitFor(() => expect(screen.getByText(/裡面的檔案將變為未分類/)).toBeInTheDocument());
    const deleteButtons = screen.getAllByRole("button", { name: "刪除" });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    // 後端會為 folder.delete 寫稽核紀錄，所以這個分頁的操作也必須刷新它——否則切到
    // 「操作紀錄」看不到剛才那筆，得整頁重整。
    await waitFor(() => expect(deleteFolder).toHaveBeenCalledWith(1));
    await waitFor(() => expect(listAuditLogs).toHaveBeenCalledTimes(2));
    // 連結卡片也引用 folder_id，它的資料夾選單同樣不能繼續列出已刪除的那個。訂閱來源同理。
    await waitFor(() => expect(listLinkCards).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(listAdminFeeds).toHaveBeenCalledTimes(2));
  });

  it("keeps the LDAP 儲存 disabled until something in the form actually changes", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(getLdapSettings).mockResolvedValue({
      enabled: true,
      server_uri: "ldap://ldap.example.internal",
      bind_dn: null,
      bind_password_set: true,
      base_dn: null,
      user_search_filter: "(uid={username})",
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "LDAP 設定" }));

    // 這個 PATCH 會寫進稽核紀錄，所以什麼都沒改就能按下去，等於讓誤點產生一筆假的變更紀錄。
    const save = await screen.findByRole("button", { name: "儲存" });
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText("搜尋起始 DN"), "ou=people,dc=example");
    expect(screen.getByRole("button", { name: "儲存" })).toBeEnabled();
    expect(updateLdapSettings).not.toHaveBeenCalled();
  });

  it("creates a link card from the 連結卡片 tab", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(createLinkCard).mockResolvedValue({
      id: 1,
      title: "公告網站",
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
    await user.type(screen.getByLabelText("標題"), "公告網站");
    await user.type(screen.getByLabelText("目標網址"), "https://example.com");
    await user.click(screen.getByRole("button", { name: "新增" }));

    await waitFor(() =>
      expect(createLinkCard).toHaveBeenCalledWith({
        title: "公告網站",
        description: null,
        url: "https://example.com",
        folder_id: null,
      }),
    );
  });

  it("edits and saves a link card's description", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(listLinkCards).mockResolvedValue([
      {
        id: 1,
        title: "公告網站",
        description: null,
        url: "https://example.com/",
        folder_id: null,
        is_public: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]);
    vi.mocked(updateLinkCard).mockResolvedValue({
      id: 1,
      title: "公告網站",
      description: "官方網站",
      url: "https://example.com/",
      folder_id: null,
      is_public: true,
      created_at: "2024-01-01T00:00:00Z",
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "連結卡片" }));

    const titleInput = await screen.findByDisplayValue("公告網站");
    const row = titleInput.closest("tr");
    if (!row) {
      throw new Error("link card row not found");
    }
    const descriptionInput = within(row).getAllByRole("textbox")[1];
    await user.type(descriptionInput, "官方網站");
    await user.click(within(row).getByRole("button", { name: "儲存" }));

    await waitFor(() =>
      expect(updateLinkCard).toHaveBeenCalledWith(1, {
        title: "公告網站",
        description: "官方網站",
        url: "https://example.com/",
        folder_id: null,
        is_public: true,
      }),
    );
  });

  it("keeps a link card row's 儲存 disabled until something in it actually changes", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(listLinkCards).mockResolvedValue([
      {
        id: 1,
        title: "公告網站",
        description: "官方網站",
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

    const titleInput = await screen.findByDisplayValue("公告網站");
    const row = titleInput.closest("tr");
    if (!row) {
      throw new Error("link card row not found");
    }
    expect(within(row).getByRole("button", { name: "儲存" })).toBeDisabled();

    // The 公開／私密 toggle only edits the draft, so it counts as a change like any other.
    await user.click(within(row).getByRole("button", { name: "公開" }));
    expect(within(row).getByRole("button", { name: "儲存" })).toBeEnabled();
    expect(updateLinkCard).not.toHaveBeenCalled();
  });

  it("asks for confirmation before deleting a link card", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(listLinkCards).mockResolvedValue([
      {
        id: 1,
        title: "公告網站",
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

    await waitFor(() => expect(screen.getByDisplayValue("公告網站")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "刪除" }));

    await waitFor(() => expect(screen.getByText(/此操作無法復原/)).toBeInTheDocument());
    const deleteButtons = screen.getAllByRole("button", { name: "刪除" });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => expect(deleteLinkCard).toHaveBeenCalledWith(1));
  });

  it("creates a feed from the RSS 訂閱 tab", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(createFeed).mockResolvedValue(makeFeed());

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "RSS 訂閱" }));

    await waitFor(() => expect(screen.getByLabelText("名稱")).toBeInTheDocument());
    await user.type(screen.getByLabelText("名稱"), "消息部落格");
    await user.type(screen.getByLabelText("Feed 網址"), "https://example.com/rss");
    await user.click(screen.getByRole("button", { name: "新增" }));

    await waitFor(() =>
      expect(createFeed).toHaveBeenCalledWith({
        title: "消息部落格",
        description: null,
        url: "https://example.com/rss",
        folder_id: null,
      }),
    );
  });

  it("fetches a feed on demand and refreshes the audit log", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(listAdminFeeds).mockResolvedValue([makeFeed()]);
    vi.mocked(fetchFeedNow).mockResolvedValue({ status: "ok", created: 3, skipped: 1, error: null });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await waitFor(() => expect(listAuditLogs).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("tab", { name: "RSS 訂閱" }));
    await waitFor(() => expect(screen.getByDisplayValue("消息部落格")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "立即抓取" }));

    await waitFor(() => expect(fetchFeedNow).toHaveBeenCalledWith(1));
    // 後端會為 feed.fetch 寫稽核紀錄，所以這個操作也必須刷新操作紀錄。
    await waitFor(() => expect(listAuditLogs).toHaveBeenCalledTimes(2));
  });

  it("surfaces a fetch failure that the API reports inside a 200 response", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(listAdminFeeds).mockResolvedValue([makeFeed()]);
    // 抓取失敗不是 HTTP 錯誤——後端仍回 200，失敗原因在 error 欄位裡，畫面必須自己讀出來。
    vi.mocked(fetchFeedNow).mockResolvedValue({ status: "error", created: 0, skipped: 0, error: "HTTP 404" });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "RSS 訂閱" }));

    await waitFor(() => expect(screen.getByDisplayValue("消息部落格")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "立即抓取" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("HTTP 404"));
  });

  it("keeps a feed row's 儲存 disabled until something in it actually changes", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(listAdminFeeds).mockResolvedValue([makeFeed()]);

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "RSS 訂閱" }));

    await waitFor(() => expect(screen.getByDisplayValue("消息部落格")).toBeInTheDocument());
    const row = screen.getByDisplayValue("消息部落格").closest("tr") as HTMLElement;
    expect(within(row).getByRole("button", { name: "儲存" })).toBeDisabled();

    await user.click(within(row).getByRole("button", { name: "啟用中" }));
    expect(within(row).getByRole("button", { name: "儲存" })).toBeEnabled();
  });

  it("asks for confirmation before deleting a feed, and warns its articles go with it", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(listAdminFeeds).mockResolvedValue([makeFeed()]);

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "RSS 訂閱" }));

    await waitFor(() => expect(screen.getByDisplayValue("消息部落格")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "刪除" }));

    await waitFor(() => expect(screen.getByText(/已抓回的文章會一併刪除/)).toBeInTheDocument());
    const deleteButtons = screen.getAllByRole("button", { name: "刪除" });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => expect(deleteFeed).toHaveBeenCalledWith(1));
  });

  it("saves the fetch schedule from the RSS 訂閱 tab", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(updateFeedSettings).mockResolvedValue({
      fetch_enabled: true,
      fetch_interval_minutes: 15,
      last_run_at: null,
      last_run_status: null,
      last_run_detail: null,
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "RSS 訂閱" }));

    await waitFor(() => expect(getFeedSettings).toHaveBeenCalled());
    await user.click(await screen.findByRole("checkbox", { name: "啟用定時抓取" }));
    await user.clear(screen.getByLabelText("間隔（分鐘）"));
    await user.type(screen.getByLabelText("間隔（分鐘）"), "15");
    await user.click(screen.getByRole("button", { name: "儲存排程" }));

    await waitFor(() =>
      expect(updateFeedSettings).toHaveBeenCalledWith({ fetch_enabled: true, fetch_interval_minutes: 15 }),
    );
  });

  it("keeps 儲存排程 disabled until the schedule actually changes", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "RSS 訂閱" }));

    await waitFor(() => expect(getFeedSettings).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "儲存排程" })).toBeDisabled();

    await user.click(await screen.findByRole("checkbox", { name: "啟用定時抓取" }));
    expect(screen.getByRole("button", { name: "儲存排程" })).toBeEnabled();
  });

  it("fetches every feed at once and surfaces per-source failures", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    // 整批抓取即使有來源失敗仍回 200，失敗細節在 errors 裡，畫面必須自己讀出來。
    vi.mocked(fetchAllFeeds).mockResolvedValue({
      total: 2,
      ok: 1,
      not_modified: 0,
      failed: 1,
      created: 3,
      errors: ["壞掉的來源：HTTP 404"],
      summary: "2 個來源：成功 1、無更新 0、失敗 1，新增 3 則",
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "RSS 訂閱" }));

    await waitFor(() => expect(getFeedSettings).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "全部立即抓取" }));

    await waitFor(() => expect(fetchAllFeeds).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("壞掉的來源：HTTP 404"));
  });

  it("shows the last scheduled run on the RSS 訂閱 tab", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(getFeedSettings).mockResolvedValue({
      fetch_enabled: true,
      fetch_interval_minutes: 60,
      last_run_at: "2025-03-03T08:00:00Z",
      last_run_status: "error",
      last_run_detail: "2 個來源：成功 1、無更新 0、失敗 1，新增 3 則",
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "RSS 訂閱" }));

    await waitFor(() => expect(screen.getByText("有來源失敗")).toBeInTheDocument());
    expect(screen.getByText("2 個來源：成功 1、無更新 0、失敗 1，新增 3 則")).toBeInTheDocument();
  });

  it("creates a highlight from the 首頁特色 tab", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(createHighlight).mockResolvedValue({
      id: 1,
      icon: "sparkles",
      title: "全文搜尋",
      description: null,
      sort_order: 50,
      is_public: true,
      created_at: "2024-01-01T00:00:00Z",
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "首頁特色" }));

    await waitFor(() => expect(screen.getByLabelText("標題")).toBeInTheDocument());
    await user.type(screen.getByLabelText("標題"), "全文搜尋");
    await user.type(screen.getByLabelText("排序"), "50");
    await user.click(screen.getByRole("button", { name: "新增" }));

    await waitFor(() =>
      expect(createHighlight).toHaveBeenCalledWith({
        icon: "sparkles",
        title: "全文搜尋",
        description: null,
        sort_order: 50,
      }),
    );
  });

  it("edits and saves a highlight's title and sort order", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(listHighlights).mockResolvedValue([
      {
        id: 1,
        icon: "shield-check",
        title: "版本歷史",
        description: "說明文字",
        sort_order: 20,
        is_public: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]);
    vi.mocked(updateHighlight).mockResolvedValue({
      id: 1,
      icon: "shield-check",
      title: "版本歷史（新）",
      description: "說明文字",
      sort_order: 205,
      is_public: true,
      created_at: "2024-01-01T00:00:00Z",
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "首頁特色" }));

    const titleInput = await screen.findByDisplayValue("版本歷史");
    const row = titleInput.closest("tr");
    if (!row) {
      throw new Error("highlight row not found");
    }
    await user.type(titleInput, "（新）");
    await user.type(within(row).getByDisplayValue("20"), "5");
    await user.click(within(row).getByRole("button", { name: "儲存" }));

    await waitFor(() =>
      expect(updateHighlight).toHaveBeenCalledWith(1, {
        icon: "shield-check",
        title: "版本歷史（新）",
        description: "說明文字",
        sort_order: 205,
        is_public: true,
      }),
    );
  });

  it("asks for confirmation before deleting a highlight", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(listHighlights).mockResolvedValue([
      {
        id: 1,
        icon: "shield-check",
        title: "版本歷史",
        description: null,
        sort_order: 20,
        is_public: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]);

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "首頁特色" }));

    await waitFor(() => expect(screen.getByDisplayValue("版本歷史")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "刪除" }));

    await waitFor(() => expect(screen.getByText(/此操作無法復原/)).toBeInTheDocument());
    const deleteButtons = screen.getAllByRole("button", { name: "刪除" });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => expect(deleteHighlight).toHaveBeenCalledWith(1));
  });

  it("saves site settings from the 站台設定 tab", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(getSiteSettings).mockResolvedValue({
      brand_name: "舊名稱",
      browser_title: "舊分頁標題",
      hero_title: "舊主標題",
      hero_subtitle: "舊副標",
      favicon_url: null,
      hero_image_url: null,
      max_upload_size_mb: 50,
    });
    vi.mocked(updateSiteSettings).mockResolvedValue({
      brand_name: "我的平台",
      browser_title: "舊分頁標題",
      hero_title: "舊主標題",
      hero_subtitle: "舊副標",
      favicon_url: null,
      hero_image_url: null,
      max_upload_size_mb: 50,
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "站台設定" }));

    const brandInput = await screen.findByDisplayValue("舊名稱");
    await user.clear(brandInput);
    await user.type(brandInput, "我的平台");
    await user.click(screen.getByRole("button", { name: "儲存" }));

    await waitFor(() =>
      expect(updateSiteSettings).toHaveBeenCalledWith({
        brand_name: "我的平台",
        browser_title: "舊分頁標題",
        hero_title: "舊主標題",
        hero_subtitle: "舊副標",
        max_upload_size_mb: 50,
      }),
    );
  });

  it("saves a new upload size limit", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(updateSiteSettings).mockResolvedValue({
      brand_name: null,
      browser_title: null,
      hero_title: null,
      hero_subtitle: null,
      favicon_url: null,
      hero_image_url: null,
      max_upload_size_mb: 200,
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "站台設定" }));

    const limitInput = await screen.findByLabelText("單檔上傳大小上限（MB）");
    await user.clear(limitInput);
    await user.type(limitInput, "200");
    await user.click(screen.getByRole("button", { name: "儲存" }));

    await waitFor(() =>
      expect(updateSiteSettings).toHaveBeenCalledWith(expect.objectContaining({ max_upload_size_mb: 200 })),
    );
  });

  it("refuses to save an upload size limit above the ceiling", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "站台設定" }));

    const limitInput = await screen.findByLabelText("單檔上傳大小上限（MB）");
    await user.clear(limitInput);
    await user.type(limitInput, "1024");
    await user.click(screen.getByRole("button", { name: "儲存" }));

    expect(updateSiteSettings).not.toHaveBeenCalled();
  });

  it("uploads a favicon as soon as a file is picked", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(uploadFavicon).mockResolvedValue({
      brand_name: null,
      browser_title: null,
      hero_title: null,
      hero_subtitle: null,
      favicon_url: "/api/site-settings/assets/abc.png",
      hero_image_url: null,
      max_upload_size_mb: 50,
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "站台設定" }));

    const file = new File(["icon"], "icon.png", { type: "image/png" });
    await user.upload(await screen.findByLabelText(/網站圖示/), file);

    await waitFor(() => expect(uploadFavicon).toHaveBeenCalledWith(file));
  });

  it("removes the hero image and hides the remove button when none is set", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(getSiteSettings).mockResolvedValue({
      brand_name: null,
      browser_title: null,
      hero_title: null,
      hero_subtitle: null,
      favicon_url: null,
      hero_image_url: "/api/site-settings/assets/hero.png",
      max_upload_size_mb: 50,
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "站台設定" }));

    // Only the hero image is set, so exactly one 移除 button is rendered.
    const removeButton = await screen.findByRole("button", { name: "移除" });
    await user.click(removeButton);

    await waitFor(() => expect(deleteHeroImage).toHaveBeenCalled());
  });

  it("saves LDAP settings from the LDAP 設定 tab without sending a blank password", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(getLdapSettings).mockResolvedValue({
      enabled: false,
      server_uri: null,
      bind_dn: null,
      bind_password_set: true,
      base_dn: null,
      user_search_filter: "(uid={username})",
    });
    vi.mocked(updateLdapSettings).mockResolvedValue({
      enabled: true,
      server_uri: "ldap://ldap.example.internal",
      bind_dn: null,
      bind_password_set: true,
      base_dn: null,
      user_search_filter: "(uid={username})",
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "LDAP 設定" }));

    const enabledCheckbox = await screen.findByRole("checkbox", { name: "啟用 LDAP 登入" });
    await user.click(enabledCheckbox);
    const serverUriInput = screen.getByLabelText("伺服器位址");
    await user.type(serverUriInput, "ldap://ldap.example.internal");
    await user.click(screen.getByRole("button", { name: "儲存" }));

    await waitFor(() =>
      expect(updateLdapSettings).toHaveBeenCalledWith({
        enabled: true,
        server_uri: "ldap://ldap.example.internal",
        bind_dn: null,
        base_dn: null,
        user_search_filter: "(uid={username})",
      }),
    );
  });

  it("lists files grouped under their folder and filters them by filename", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(listFiles).mockResolvedValue([
      {
        folder: { id: 1, name: "教學文件", description: null, created_at: "2024-01-01T00:00:00Z" },
        files: [
          {
            id: 10,
            owner_id: 1,
            owner_username: "alice",
            filename: "handbook.pdf",
            display_name: "新生手冊",
            folder_id: 1,
            announced_at: null,
            is_public: true,
            size: 1024,
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
      },
      {
        folder: null,
        files: [
          {
            id: 11,
            owner_id: 2,
            owner_username: "bob",
            filename: "budget.xlsx",
            display_name: null,
            folder_id: null,
            announced_at: null,
            is_public: false,
            size: 2048,
            created_at: "2024-01-02T00:00:00Z",
          },
        ],
      },
    ]);

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "檔案" }));

    expect(await screen.findByText("handbook.pdf")).toBeInTheDocument();
    expect(screen.getByText("budget.xlsx")).toBeInTheDocument();
    // 所有分組的檔案都被攤平進同一張表格，因此資料夾名稱是唯一還能分辨
    // 「已分類」與「未分類」檔案的東西。
    expect(screen.getByText("教學文件")).toBeInTheDocument();
    // 擁有者那一欄顯示的是帳號名稱，不是 owner_id 那個數字。
    expect(screen.getByRole("columnheader", { name: "擁有者" })).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();

    await user.type(screen.getByLabelText("依檔名搜尋檔案"), "budget");

    await waitFor(() => expect(screen.queryByText("handbook.pdf")).not.toBeInTheDocument());
    expect(screen.getByText("budget.xlsx")).toBeInTheDocument();
  });

  it("asks for confirmation before deleting a file from the 檔案 tab", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(listFiles).mockResolvedValue([
      {
        folder: null,
        files: [
          {
            id: 10,
            owner_id: 1,
            owner_username: "alice",
            filename: "handbook.pdf",
            display_name: null,
            folder_id: null,
            announced_at: null,
            is_public: true,
            size: 1024,
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
      },
    ]);

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "檔案" }));

    await waitFor(() => expect(screen.getByText("handbook.pdf")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "刪除" }));

    await waitFor(() => expect(screen.getByText(/此操作無法復原/)).toBeInTheDocument());
    const deleteButtons = screen.getAllByRole("button", { name: "刪除" });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    // 刪除他人的檔案屬於會被稽核的管理員操作，所以操作紀錄必須與列表一起刷新
    // ——見 useFilesAdmin。
    await waitFor(() => expect(deleteFile).toHaveBeenCalledWith(10));
    await waitFor(() => expect(listAuditLogs).toHaveBeenCalledTimes(2));
  });

  it("cancelling the confirmation keeps the file", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(listFiles).mockResolvedValue([
      {
        folder: null,
        files: [
          {
            id: 10,
            owner_id: 1,
            owner_username: "alice",
            filename: "handbook.pdf",
            display_name: null,
            folder_id: null,
            announced_at: null,
            is_public: true,
            size: 1024,
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
      },
    ]);

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "檔案" }));

    await waitFor(() => expect(screen.getByText("handbook.pdf")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "刪除" }));

    await waitFor(() => expect(screen.getByText(/此操作無法復原/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(deleteFile).not.toHaveBeenCalled();
    expect(screen.getByText("handbook.pdf")).toBeInTheDocument();
  });

  it("saves SMTP settings from the Email SMTP 設定 tab without sending a blank password", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(getSmtpSettings).mockResolvedValue({
      enabled: false,
      host: null,
      port: 587,
      username: null,
      password_set: true,
      from_address: "no-reply@example.com",
      use_tls: true,
    });
    vi.mocked(updateSmtpSettings).mockResolvedValue({
      enabled: true,
      host: "smtp.example.internal",
      port: 587,
      username: null,
      password_set: true,
      from_address: "no-reply@example.com",
      use_tls: true,
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "Email SMTP 設定" }));

    const enabledCheckbox = await screen.findByRole("checkbox", { name: "啟用 SMTP 寄信" });
    await user.click(enabledCheckbox);
    await user.type(screen.getByLabelText("伺服器位址"), "smtp.example.internal");
    await user.click(screen.getByRole("button", { name: "儲存" }));

    // password 是刻意整個不存在，而不是給空字串：送出空值會把已儲存的密碼清掉，
    // 這正是 useSmtpSettingsAdmin 要用條件展開把它放進去的原因。
    await waitFor(() =>
      expect(updateSmtpSettings).toHaveBeenCalledWith({
        enabled: true,
        host: "smtp.example.internal",
        port: 587,
        username: null,
        from_address: "no-reply@example.com",
        use_tls: true,
      }),
    );
  });

  it("sends a newly typed SMTP password", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(getSmtpSettings).mockResolvedValue({
      enabled: true,
      host: "smtp.example.internal",
      port: 587,
      username: "mailer",
      password_set: true,
      from_address: "no-reply@example.com",
      use_tls: true,
    });

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "Email SMTP 設定" }));

    await user.type(await screen.findByLabelText("密碼"), "new-secret");
    await user.click(screen.getByRole("button", { name: "儲存" }));

    await waitFor(() =>
      expect(updateSmtpSettings).toHaveBeenCalledWith(
        expect.objectContaining({ password: "new-secret" }),
      ),
    );
  });

  it("shows an error when the SMTP settings fail to load", async () => {
    await loginAsAdmin();
    vi.mocked(listUsers).mockResolvedValue([]);
    vi.mocked(getSmtpSettings).mockRejectedValue(new ApiError(500, "無法連線至伺服器"));

    renderAdminPage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("使用者列表")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "Email SMTP 設定" }));

    expect(await screen.findByText("無法連線至伺服器")).toBeInTheDocument();
  });
});
