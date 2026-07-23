import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

vi.mock("../api/auth", () => ({
  fetchCurrentUser: vi.fn(),
}));
vi.mock("../api/notifications", () => ({
  listNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
}));

import { fetchCurrentUser } from "../api/auth";
import { listNotifications, markNotificationRead } from "../api/notifications";

function renderBell() {
  return render(
    <AuthProvider>
      <NotificationBell />
    </AuthProvider>,
  );
}

async function loginAsUser() {
  localStorage.setItem("access_token", "tok");
  vi.mocked(fetchCurrentUser).mockResolvedValue({
    id: 1,
    username: "alice",
    role: "user",
    is_active: true,
    email: "alice@example.com",
    full_name: null,
    auth_source: "local",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  });
}

describe("NotificationBell", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders nothing when logged out", () => {
    vi.mocked(listNotifications).mockResolvedValue([]);
    const { container } = renderBell();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows an unread count badge and marks a notification as read on click", async () => {
    await loginAsUser();
    vi.mocked(listNotifications).mockResolvedValue([
      { id: 1, file_id: 10, message: "alice 上傳了新檔案：report.pdf", is_read: false, created_at: "2024-01-01T00:00:00Z" },
      { id: 2, file_id: 11, message: "bob 上傳了新檔案：notes.docx", is_read: true, created_at: "2024-01-02T00:00:00Z" },
    ]);
    vi.mocked(markNotificationRead).mockResolvedValue({
      id: 1,
      file_id: 10,
      message: "alice 上傳了新檔案：report.pdf",
      is_read: true,
      created_at: "2024-01-01T00:00:00Z",
    });

    renderBell();

    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "通知" }));

    await waitFor(() => expect(screen.getByText("alice 上傳了新檔案：report.pdf")).toBeInTheDocument());
    await user.click(screen.getByText("alice 上傳了新檔案：report.pdf"));

    await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith(1));
  });

  it("shows an empty state when there are no notifications", async () => {
    await loginAsUser();
    vi.mocked(listNotifications).mockResolvedValue([]);

    renderBell();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "通知" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "通知" }));

    await waitFor(() => expect(screen.getByText("目前沒有通知")).toBeInTheDocument());
  });
});
