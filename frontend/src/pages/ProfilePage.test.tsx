import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { AuthProvider } from "../context/AuthContext";
import ProfilePage from "./ProfilePage";
import type { UserItem } from "../api/types";

vi.mock("../api/auth", () => ({
  login: vi.fn(),
  fetchCurrentUser: vi.fn(),
  updateCurrentUser: vi.fn(),
  changeCurrentUserPassword: vi.fn(),
}));

import { changeCurrentUserPassword, fetchCurrentUser, updateCurrentUser } from "../api/auth";

const baseUser: UserItem = {
  id: 1,
  username: "alice",
  full_name: null,
  email: null,
  role: "user",
  auth_source: "local",
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

function renderProfilePage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ProfilePage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function renderLoggedIn(user: UserItem = baseUser) {
  localStorage.setItem("access_token", "tok123");
  vi.mocked(fetchCurrentUser).mockResolvedValue(user);
  renderProfilePage();
  await waitFor(() => expect(screen.getByText(`帳號：${user.username}`)).toBeInTheDocument());
}

describe("ProfilePage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("updates the display name", async () => {
    await renderLoggedIn();
    vi.mocked(updateCurrentUser).mockResolvedValue({ ...baseUser, full_name: "Alice Chen" });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("姓名"), "Alice Chen");
    await user.click(screen.getByRole("button", { name: "儲存姓名" }));

    await waitFor(() => expect(updateCurrentUser).toHaveBeenCalledWith("Alice Chen"));
  });

  it("shows an error when updating the display name fails", async () => {
    await renderLoggedIn();
    vi.mocked(updateCurrentUser).mockRejectedValue(new ApiError(401, "無法驗證身份"));

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("姓名"), "Alice Chen");
    await user.click(screen.getByRole("button", { name: "儲存姓名" }));

    await waitFor(() => expect(screen.getByText("無法驗證身份")).toBeInTheDocument());
  });

  it("rejects mismatched password confirmation without calling the API", async () => {
    await renderLoggedIn();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("目前密碼"), "old-pw");
    await user.type(screen.getByLabelText("新密碼"), "new-pw-1");
    await user.type(screen.getByLabelText("確認新密碼"), "new-pw-2");
    await user.click(screen.getByRole("button", { name: "變更密碼" }));

    expect(await screen.findByText("兩次輸入的新密碼不一致")).toBeInTheDocument();
    expect(changeCurrentUserPassword).not.toHaveBeenCalled();
  });

  it("submits a password change", async () => {
    await renderLoggedIn();
    vi.mocked(changeCurrentUserPassword).mockResolvedValue({ message: "密碼已更新" });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("目前密碼"), "old-pw");
    await user.type(screen.getByLabelText("新密碼"), "new-pw-123");
    await user.type(screen.getByLabelText("確認新密碼"), "new-pw-123");
    await user.click(screen.getByRole("button", { name: "變更密碼" }));

    await waitFor(() =>
      expect(changeCurrentUserPassword).toHaveBeenCalledWith("old-pw", "new-pw-123"),
    );
  });

  it("shows an error message when the current password is wrong", async () => {
    await renderLoggedIn();
    vi.mocked(changeCurrentUserPassword).mockRejectedValue(new ApiError(400, "目前密碼錯誤"));

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("目前密碼"), "wrong-pw");
    await user.type(screen.getByLabelText("新密碼"), "new-pw-123");
    await user.type(screen.getByLabelText("確認新密碼"), "new-pw-123");
    await user.click(screen.getByRole("button", { name: "變更密碼" }));

    await waitFor(() => expect(screen.getByText("目前密碼錯誤")).toBeInTheDocument());
  });

  it("hides the password form for LDAP accounts", async () => {
    await renderLoggedIn({ ...baseUser, auth_source: "ldap" });

    expect(screen.queryByLabelText("目前密碼")).not.toBeInTheDocument();
    expect(screen.getByText(/LDAP 伺服器管理/)).toBeInTheDocument();
  });
});
