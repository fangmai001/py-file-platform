import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import ResetPasswordPage from "./ResetPasswordPage";

vi.mock("../api/password-reset", () => ({
  confirmPasswordReset: vi.fn(),
}));

import { confirmPasswordReset } from "../api/password-reset";

function renderResetPasswordPage(initialPath = "/reset-password?token=abc123") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<h1>登入</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an invalid-link message when there's no token in the URL", () => {
    renderResetPasswordPage("/reset-password");

    expect(screen.getByText("重設密碼連結無效")).toBeInTheDocument();
  });

  it("rejects mismatched password confirmation without calling the API", async () => {
    renderResetPasswordPage();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("新密碼"), "new-password-1");
    await user.type(screen.getByLabelText("確認新密碼"), "new-password-2");
    await user.click(screen.getByRole("button", { name: "重設密碼" }));

    expect(await screen.findByText("兩次輸入的密碼不一致")).toBeInTheDocument();
    expect(confirmPasswordReset).not.toHaveBeenCalled();
  });

  it("submits the token and new password, then redirects to login", async () => {
    vi.mocked(confirmPasswordReset).mockResolvedValue({ message: "密碼已重設" });

    renderResetPasswordPage();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("新密碼"), "new-password-123");
    await user.type(screen.getByLabelText("確認新密碼"), "new-password-123");
    await user.click(screen.getByRole("button", { name: "重設密碼" }));

    await waitFor(() => expect(confirmPasswordReset).toHaveBeenCalledWith("abc123", "new-password-123"));
    await waitFor(() => expect(screen.getByRole("heading", { name: "登入" })).toBeInTheDocument());
  });

  it("shows an error message when the token is invalid or expired", async () => {
    vi.mocked(confirmPasswordReset).mockRejectedValue(new ApiError(400, "重設連結無效或已過期"));

    renderResetPasswordPage();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("新密碼"), "new-password-123");
    await user.type(screen.getByLabelText("確認新密碼"), "new-password-123");
    await user.click(screen.getByRole("button", { name: "重設密碼" }));

    await waitFor(() => expect(screen.getByText("重設連結無效或已過期")).toBeInTheDocument());
  });
});
