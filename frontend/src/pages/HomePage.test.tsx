import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext";
import { ConfirmDialogProvider } from "../context/ConfirmDialogContext";
import { SiteSettingsProvider } from "../context/SiteSettingsContext";
import HomePage from "./HomePage";

vi.mock("../api/files", () => ({
  listFiles: vi.fn(),
  uploadFile: vi.fn(),
  updateFile: vi.fn(),
  updateFileVisibility: vi.fn(),
  deleteFile: vi.fn(),
  downloadFile: vi.fn(),
}));
vi.mock("../api/folders", () => ({
  listFolders: vi.fn().mockResolvedValue([]),
}));
vi.mock("../api/link-cards", () => ({
  listLinkCards: vi.fn().mockResolvedValue([]),
}));
vi.mock("../api/highlights", () => ({
  listHighlights: vi.fn().mockResolvedValue([]),
}));
vi.mock("../api/site-settings", () => ({
  getSiteSettings: vi.fn().mockResolvedValue({
    brand_name: null,
    browser_title: null,
    hero_title: null,
    hero_subtitle: null,
    favicon_url: null,
    hero_image_url: null,
  }),
  updateSiteSettings: vi.fn(),
  siteAssetUrl: (path: string | null) => path,
}));
vi.mock("../api/auth", () => ({
  login: vi.fn(),
  fetchCurrentUser: vi.fn(),
}));

import { deleteFile, listFiles } from "../api/files";
import { listHighlights } from "../api/highlights";
import { listLinkCards } from "../api/link-cards";
import { getSiteSettings } from "../api/site-settings";
import { fetchCurrentUser } from "../api/auth";

function renderHomePage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SiteSettingsProvider>
          <ConfirmDialogProvider>
            <HomePage />
          </ConfirmDialogProvider>
        </SiteSettingsProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("HomePage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("shows public files to a guest, without an upload form", async () => {
    vi.mocked(listFiles).mockResolvedValue([
      {
        folder: null,
        files: [
          {
            id: 1,
            owner_id: 2,
            filename: "a.pdf",
            display_name: null,
            folder_id: null,
            announced_at: null,
            is_public: true,
            size: 2048,
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
      },
    ]);

    renderHomePage();

    await waitFor(() => expect(screen.getByText("a.pdf")).toBeInTheDocument());
    expect(screen.queryByText("上傳檔案")).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no visible files", async () => {
    vi.mocked(listFiles).mockResolvedValue([]);

    renderHomePage();

    await waitFor(() => expect(screen.getByText("目前沒有可檢視的檔案")).toBeInTheDocument());
  });

  it("asks for confirmation before deleting a file, and cancelling keeps it", async () => {
    localStorage.setItem("access_token", "tok");
    vi.mocked(fetchCurrentUser).mockResolvedValue({
      id: 2,
      username: "owner",
      role: "user",
      is_active: true,
      email: null,
      full_name: null,
      auth_source: "local",
      notify_by_email: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    });
    vi.mocked(listFiles).mockResolvedValue([
      {
        folder: null,
        files: [
          {
            id: 1,
            owner_id: 2,
            filename: "a.pdf",
            display_name: null,
            folder_id: null,
            announced_at: null,
            is_public: true,
            size: 2048,
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
      },
    ]);

    renderHomePage();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("a.pdf")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "刪除" }));

    await waitFor(() => expect(screen.getByText(/此操作無法復原/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(deleteFile).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "刪除" }));
    await waitFor(() => expect(screen.getByText(/此操作無法復原/)).toBeInTheDocument());
    const deleteButtons = screen.getAllByRole("button", { name: "刪除" });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => expect(deleteFile).toHaveBeenCalledWith(1));
  });

  it("debounces the search input and calls listFiles with the search term", async () => {
    vi.mocked(listFiles).mockResolvedValue([]);

    renderHomePage();

    await waitFor(() => expect(listFiles).toHaveBeenCalledWith({ search: undefined, folderId: undefined }));
    vi.mocked(listFiles).mockClear();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("依檔名搜尋檔案"), "budget");

    await waitFor(() => expect(listFiles).toHaveBeenCalledWith({ search: "budget", folderId: undefined }));
  });

  it("only renders the first page of files per folder group, with a load-more button", async () => {
    const files = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      owner_id: 2,
      filename: `file-${i + 1}.pdf`,
      display_name: null,
      folder_id: null,
      announced_at: null,
      is_public: true,
      size: 1024,
      created_at: "2024-01-01T00:00:00Z",
    }));
    vi.mocked(listFiles).mockResolvedValue([{ folder: null, files }]);

    renderHomePage();

    await waitFor(() => expect(screen.getByText("file-1.pdf")).toBeInTheDocument());
    expect(screen.queryByText("file-25.pdf")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /載入更多/ }));

    await waitFor(() => expect(screen.getByText("file-25.pdf")).toBeInTheDocument());
  });

  it("shows link cards alongside file cards, clearly labelled", async () => {
    vi.mocked(listFiles).mockResolvedValue([]);
    vi.mocked(listLinkCards).mockResolvedValue([
      {
        id: 1,
        title: "社團官網",
        description: "官方網站",
        url: "https://example.com/",
        folder_id: null,
        is_public: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]);

    renderHomePage();

    await waitFor(() => expect(screen.getByText("社團官網")).toBeInTheDocument());
    expect(screen.getByText("連結")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /社團官網/ });
    expect(link).toHaveAttribute("href", "https://example.com/");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders a custom hero title and subtitle from site settings", async () => {
    vi.mocked(listFiles).mockResolvedValue([]);
    vi.mocked(getSiteSettings).mockResolvedValue({
      brand_name: null,
      browser_title: null,
      hero_title: "歡迎光臨我的社團",
      hero_subtitle: "這裡是自訂的副標說明",
      favicon_url: null,
      hero_image_url: null,
    });

    renderHomePage();

    await waitFor(() => expect(screen.getByText("歡迎光臨我的社團")).toBeInTheDocument());
    expect(screen.getByText("這裡是自訂的副標說明")).toBeInTheDocument();
  });

  it("renders the hero image when site settings provide one", async () => {
    vi.mocked(listFiles).mockResolvedValue([]);
    vi.mocked(getSiteSettings).mockResolvedValue({
      brand_name: null,
      browser_title: null,
      hero_title: null,
      hero_subtitle: null,
      favicon_url: null,
      hero_image_url: "/api/site-settings/assets/abc.png",
    });

    const { container } = renderHomePage();

    await waitFor(() =>
      expect(container.querySelector("img[src='/api/site-settings/assets/abc.png']")).toBeInTheDocument(),
    );
  });

  it("renders no hero image when site settings have none", async () => {
    vi.mocked(listFiles).mockResolvedValue([]);
    vi.mocked(getSiteSettings).mockResolvedValue({
      brand_name: null,
      browser_title: null,
      hero_title: null,
      hero_subtitle: null,
      favicon_url: null,
      hero_image_url: null,
    });

    const { container } = renderHomePage();

    await waitFor(() => expect(screen.getByText("公開檔案牆")).toBeInTheDocument());
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders the highlight cards returned by the API", async () => {
    vi.mocked(listFiles).mockResolvedValue([]);
    vi.mocked(listHighlights).mockResolvedValue([
      {
        id: 1,
        icon: "shield-check",
        title: "公開／私密控管",
        description: "每個檔案可獨立設定可見度。",
        sort_order: 10,
        is_public: true,
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 2,
        icon: "history",
        title: "版本歷史",
        description: null,
        sort_order: 20,
        is_public: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]);

    renderHomePage();

    await waitFor(() => expect(screen.getByText("公開／私密控管")).toBeInTheDocument());
    expect(screen.getByText("每個檔案可獨立設定可見度。")).toBeInTheDocument();
    expect(screen.getByText("版本歷史")).toBeInTheDocument();
  });

  it("renders an unknown icon key with the fallback icon instead of crashing", async () => {
    vi.mocked(listFiles).mockResolvedValue([]);
    vi.mocked(listHighlights).mockResolvedValue([
      {
        id: 1,
        icon: "icon-from-a-newer-backend",
        title: "未來的特色",
        description: null,
        sort_order: 10,
        is_public: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]);

    renderHomePage();

    await waitFor(() => expect(screen.getByText("未來的特色")).toBeInTheDocument());
  });

  it("renders no highlight section when the list is empty", async () => {
    vi.mocked(listFiles).mockResolvedValue([]);
    vi.mocked(listHighlights).mockResolvedValue([]);

    renderHomePage();

    await waitFor(() => expect(screen.getByText("公開檔案牆")).toBeInTheDocument());
    expect(screen.queryByText("公開／私密控管")).not.toBeInTheDocument();
  });
});
