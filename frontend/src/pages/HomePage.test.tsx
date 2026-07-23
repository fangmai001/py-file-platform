import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext";
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
vi.mock("../api/auth", () => ({
  login: vi.fn(),
  fetchCurrentUser: vi.fn(),
}));

import { listFiles } from "../api/files";

function renderHomePage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <HomePage />
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
});
