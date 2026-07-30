import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { SiteSettingsProvider } from "../context/SiteSettingsContext";
import UploadPage from "./UploadPage";

vi.mock("../api/files", () => ({
  uploadFile: vi.fn(),
}));
vi.mock("../api/folders", () => ({
  listFolders: vi.fn().mockResolvedValue([{ id: 5, name: "財務", description: null, created_at: "2024-01-01T00:00:00Z" }]),
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
  siteAssetUrl: (path: string | null) => path,
}));

import { uploadFile } from "../api/files";
import { getSiteSettings } from "../api/site-settings";

const FILE_INPUT_LABEL = "選擇檔案（pdf / doc / xls / docx / xlsx，單檔上限 50 MB）";

function renderUploadPage() {
  return render(
    <MemoryRouter>
      <SiteSettingsProvider>
        <UploadPage />
      </SiteSettingsProvider>
    </MemoryRouter>,
  );
}

describe("UploadPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(uploadFile).mockResolvedValue({
      id: 1,
      owner_id: 1,
      filename: "a.pdf",
      display_name: null,
      folder_id: null,
      announced_at: null,
      is_public: false,
      size: 10,
      created_at: "2024-01-01T00:00:00Z",
    });
  });

  it("uploads the selected file with the chosen visibility", async () => {
    renderUploadPage();

    const user = userEvent.setup();
    const file = new File(["hello"], "a.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText(FILE_INPUT_LABEL), file);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "上傳" }));

    await waitFor(() =>
      expect(uploadFile).toHaveBeenCalledWith(file, false, {
        folderId: null,
        displayName: null,
        announcedAt: null,
      }),
    );
  });

  it("uploads with a display name and a selected card", async () => {
    renderUploadPage();

    const user = userEvent.setup();
    const file = new File(["hello"], "a.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText(FILE_INPUT_LABEL), file);
    await user.type(screen.getByLabelText("顯示名稱（選填，預設使用檔名）"), "2026 年度財報");
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "財務" }));
    await user.click(screen.getByRole("button", { name: "上傳" }));

    await waitFor(() =>
      expect(uploadFile).toHaveBeenCalledWith(file, true, {
        folderId: 5,
        displayName: "2026 年度財報",
        announcedAt: null,
      }),
    );
  });

  it("shows an error message when upload fails", async () => {
    vi.mocked(uploadFile).mockRejectedValue(new ApiError(400, "檔案格式不支援"));

    renderUploadPage();

    const user = userEvent.setup();
    const file = new File(["hello"], "a.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText(FILE_INPUT_LABEL), file);
    await user.click(screen.getByRole("button", { name: "上傳" }));

    await waitFor(() => expect(screen.getByText("檔案格式不支援")).toBeInTheDocument());
  });

  it("rejects a file over the limit as soon as it is picked, without uploading", async () => {
    renderUploadPage();
    // wait for the admin-configured limit to arrive before picking a file
    await waitFor(() => expect(getSiteSettings).toHaveBeenCalled());

    const user = userEvent.setup();
    const file = new File(["hello"], "big.pdf", { type: "application/pdf" });
    // faking size beats allocating 50 MB of test data just to cross the threshold
    Object.defineProperty(file, "size", { value: 51 * 1024 * 1024 });
    await user.upload(screen.getByLabelText(FILE_INPUT_LABEL), file);

    expect(await screen.findByText("檔案超過大小上限（50 MB）")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上傳" })).toBeDisabled();
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("shows the admin-configured limit in the file field label", async () => {
    vi.mocked(getSiteSettings).mockResolvedValue({
      brand_name: null,
      browser_title: null,
      hero_title: null,
      hero_subtitle: null,
      favicon_url: null,
      hero_image_url: null,
      max_upload_size_mb: 200,
    });

    renderUploadPage();

    expect(
      await screen.findByLabelText("選擇檔案（pdf / doc / xls / docx / xlsx，單檔上限 200 MB）"),
    ).toBeInTheDocument();
  });
});
