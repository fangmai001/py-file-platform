import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext";
import { ConfirmDialogProvider } from "../context/ConfirmDialogContext";
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
vi.mock("../api/auth", () => ({
  login: vi.fn(),
  fetchCurrentUser: vi.fn(),
}));

import { deleteFile, listFiles } from "../api/files";
import { listLinkCards } from "../api/link-cards";
import { fetchCurrentUser } from "../api/auth";

function renderHomePage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ConfirmDialogProvider>
          <HomePage />
        </ConfirmDialogProvider>
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
});
