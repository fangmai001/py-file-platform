import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import ForgotPasswordPage from "./ForgotPasswordPage";

vi.mock("../api/password-reset", () => ({
  requestPasswordReset: vi.fn(),
}));

import { requestPasswordReset } from "../api/password-reset";

function renderForgotPasswordPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits the account/email and shows the generic confirmation message", async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue({
      message: "若帳號存在，重設密碼信件已寄出，請至信箱查收。",
    });

    renderForgotPasswordPage();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("帳號或 Email"), "alice");
    await user.click(screen.getByRole("button", { name: "送出重設連結" }));

    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith("alice"));
    await waitFor(() =>
      expect(screen.getByText("若帳號存在，重設密碼信件已寄出，請至信箱查收。")).toBeInTheDocument(),
    );
  });

  it("shows an error message when the request fails", async () => {
    vi.mocked(requestPasswordReset).mockRejectedValue(new ApiError(500, "伺服器錯誤"));

    renderForgotPasswordPage();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("帳號或 Email"), "alice");
    await user.click(screen.getByRole("button", { name: "送出重設連結" }));

    await waitFor(() => expect(screen.getByText("伺服器錯誤")).toBeInTheDocument());
  });
});
