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
  markAllNotificationsRead: vi.fn(),
}));

import { fetchCurrentUser } from "../api/auth";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "../api/notifications";
import type { NotificationItem } from "../api/types";

function makeNotification(id: number, overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id,
    file_id: id,
    message: `檔案 ${id} 已上傳`,
    is_read: false,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

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
    notify_by_email: true,
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

  it("shows a load-more button when a full page comes back, and appends the next page", async () => {
    await loginAsUser();
    const firstPage = Array.from({ length: 50 }, (_, i) => makeNotification(i + 1));
    const secondPage = [makeNotification(51)];
    // firstPage 會有兩次回應：一次是掛載時的抓取，一次是 NotificationBell 在對話框
    // 被開啟時觸發的重新抓取；第三次則是「載入更多」。
    vi.mocked(listNotifications)
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    renderBell();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "通知" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "通知" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "載入更多" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "載入更多" }));

    expect(listNotifications).toHaveBeenLastCalledWith(50, 50);
    await waitFor(() => expect(screen.getByText("檔案 51 已上傳")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "載入更多" })).not.toBeInTheDocument();
  });

  it("marks all notifications as read", async () => {
    await loginAsUser();
    vi.mocked(listNotifications).mockResolvedValue([
      makeNotification(1, { is_read: false }),
      makeNotification(2, { is_read: false }),
    ]);
    vi.mocked(markAllNotificationsRead).mockResolvedValue({ updated: 2 });

    renderBell();

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "通知" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "全部標記已讀" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "全部標記已讀" }));

    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("button", { name: "全部標記已讀" })).not.toBeInTheDocument());
  });
});
