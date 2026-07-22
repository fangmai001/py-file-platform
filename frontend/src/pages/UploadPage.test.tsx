import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import UploadPage from "./UploadPage";

vi.mock("../api/files", () => ({
  uploadFile: vi.fn(),
}));

import { uploadFile } from "../api/files";

function renderUploadPage() {
  return render(
    <MemoryRouter>
      <UploadPage />
    </MemoryRouter>,
  );
}

describe("UploadPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads the selected file with the chosen visibility", async () => {
    vi.mocked(uploadFile).mockResolvedValue({
      id: 1,
      owner_id: 1,
      filename: "a.pdf",
      folder: null,
      is_public: false,
      size: 10,
      created_at: "2024-01-01T00:00:00Z",
    });

    renderUploadPage();

    const user = userEvent.setup();
    const file = new File(["hello"], "a.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("選擇檔案（pdf / doc / xls / docx / xlsx）"), file);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "上傳" }));

    await waitFor(() => expect(uploadFile).toHaveBeenCalledWith(file, false));
  });

  it("shows an error message when upload fails", async () => {
    vi.mocked(uploadFile).mockRejectedValue(new ApiError(400, "檔案格式不支援"));

    renderUploadPage();

    const user = userEvent.setup();
    const file = new File(["hello"], "a.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("選擇檔案（pdf / doc / xls / docx / xlsx）"), file);
    await user.click(screen.getByRole("button", { name: "上傳" }));

    await waitFor(() => expect(screen.getByText("檔案格式不支援")).toBeInTheDocument());
  });
});
