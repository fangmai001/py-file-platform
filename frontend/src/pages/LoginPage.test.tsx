import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { AuthProvider } from "../context/AuthContext";
import LoginPage from "./LoginPage";

vi.mock("../api/auth", () => ({
  login: vi.fn(),
  fetchCurrentUser: vi.fn(),
}));

import { fetchCurrentUser, login } from "../api/auth";

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("logs in and stores the access token", async () => {
    vi.mocked(login).mockResolvedValue({ access_token: "tok123", token_type: "bearer" });
    vi.mocked(fetchCurrentUser).mockResolvedValue({
      id: 1,
      username: "alice",
      role: "user",
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    });

    renderLoginPage();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("帳號"), "alice");
    await user.type(screen.getByLabelText("密碼"), "s3cret-pw");
    await user.click(screen.getByRole("button", { name: "登入" }));

    await waitFor(() => expect(login).toHaveBeenCalledWith("alice", "s3cret-pw"));
    await waitFor(() => expect(localStorage.getItem("access_token")).toBe("tok123"));
  });

  it("shows an error message when login fails", async () => {
    vi.mocked(login).mockRejectedValue(new ApiError(401, "帳號或密碼錯誤"));

    renderLoginPage();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("帳號"), "alice");
    await user.type(screen.getByLabelText("密碼"), "wrong-pw");
    await user.click(screen.getByRole("button", { name: "登入" }));

    await waitFor(() => expect(screen.getByText("帳號或密碼錯誤")).toBeInTheDocument());
    expect(localStorage.getItem("access_token")).toBeNull();
  });

  it("links to the forgot-password page", () => {
    renderLoginPage();

    expect(screen.getByRole("link", { name: "忘記密碼？" })).toHaveAttribute("href", "/forgot-password");
  });
});
