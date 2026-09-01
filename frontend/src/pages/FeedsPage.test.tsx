import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import FeedsPage from "./FeedsPage";

vi.mock("../api/feeds", () => ({
  listFeeds: vi.fn().mockResolvedValue([]),
  listFeedArticles: vi.fn().mockResolvedValue([]),
}));

vi.mock("../api/folders", () => ({
  listFolders: vi.fn().mockResolvedValue([]),
}));

import { listFeedArticles, listFeeds } from "../api/feeds";
import { listFolders } from "../api/folders";
import type { FeedArticle, FeedSource, FolderItem } from "../api/types";

function makeFeed(overrides: Partial<FeedSource> = {}): FeedSource {
  return {
    id: 1,
    title: "消息部落格",
    description: null,
    url: "https://example.com/rss",
    folder_id: null,
    is_public: true,
    is_active: true,
    last_fetched_at: null,
    last_status: "ok",
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeFolder(overrides: Partial<FolderItem> = {}): FolderItem {
  return {
    id: 10,
    name: "技術文章",
    description: null,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeArticle(overrides: Partial<FeedArticle> = {}): FeedArticle {
  return {
    id: 1,
    feed_id: 1,
    title: "第一篇",
    link: "https://example.com/posts/1",
    author: null,
    summary: null,
    published_at: "2025-03-03T08:00:00Z",
    fetched_at: "2025-03-03T09:00:00Z",
    ...overrides,
  };
}

describe("FeedsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks 只清呼叫紀錄，不清 mockResolvedValue，所以每個案例的預設值要重設一次，
    // 否則前一個案例留下的文章會漏進「沒有文章」的案例裡。
    vi.mocked(listFeeds).mockResolvedValue([]);
    vi.mocked(listFeedArticles).mockResolvedValue([]);
    vi.mocked(listFolders).mockResolvedValue([]);
  });

  it("lists the fetched articles with their source", async () => {
    vi.mocked(listFeeds).mockResolvedValue([makeFeed()]);
    vi.mocked(listFeedArticles).mockResolvedValue([makeArticle()]);

    render(<FeedsPage />);

    expect(screen.getByRole("heading", { name: "訂閱文章" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("link", { name: /第一篇/ })).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /第一篇/ })).toHaveAttribute("href", "https://example.com/posts/1");
    await waitFor(() => expect(screen.getByText("消息部落格")).toBeInTheDocument());
  });

  it("renders the summary as plain text instead of the feed's raw HTML", async () => {
    vi.mocked(listFeeds).mockResolvedValue([makeFeed()]);
    vi.mocked(listFeedArticles).mockResolvedValue([
      makeArticle({ summary: "<p>第一段<strong>重點</strong></p>" }),
    ]);

    render(<FeedsPage />);

    await waitFor(() => expect(screen.getByText("第一段 重點")).toBeInTheDocument());
    expect(document.querySelector("strong")).toBeNull();
  });

  it("shows an empty state when no articles have been fetched yet", async () => {
    render(<FeedsPage />);

    await waitFor(() => expect(screen.getByText("目前沒有文章")).toBeInTheDocument());
  });

  it("shows an error when the article list fails to load", async () => {
    vi.mocked(listFeedArticles).mockRejectedValue(new ApiError(500, "伺服器錯誤"));

    render(<FeedsPage />);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("伺服器錯誤"));
  });

  it("filters the articles by source", async () => {
    vi.mocked(listFeeds).mockResolvedValue([makeFeed(), makeFeed({ id: 2, title: "另一個來源" })]);
    vi.mocked(listFeedArticles).mockResolvedValue([makeArticle()]);

    render(<FeedsPage />);

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByLabelText("篩選來源")).toBeInTheDocument());
    await user.click(screen.getByLabelText("篩選來源"));
    await user.click(await screen.findByRole("option", { name: "另一個來源" }));

    await waitFor(() =>
      expect(listFeedArticles).toHaveBeenLastCalledWith({ feedId: 2, limit: 20 }),
    );
  });

  it("filters the articles by folder", async () => {
    vi.mocked(listFolders).mockResolvedValue([makeFolder()]);
    vi.mocked(listFeeds).mockResolvedValue([makeFeed({ folder_id: 10 })]);
    vi.mocked(listFeedArticles).mockResolvedValue([makeArticle()]);

    render(<FeedsPage />);

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByLabelText("篩選分類")).toBeInTheDocument());
    await user.click(screen.getByLabelText("篩選分類"));
    await user.click(await screen.findByRole("option", { name: "技術文章" }));

    await waitFor(() => expect(listFeedArticles).toHaveBeenLastCalledWith({ folderId: 10, limit: 20 }));
  });

  it("hides the folder filter when no source belongs to a folder", async () => {
    // 一個永遠篩不出任何文章的分類不該出現在選單裡。
    vi.mocked(listFolders).mockResolvedValue([makeFolder()]);
    vi.mocked(listFeeds).mockResolvedValue([makeFeed({ folder_id: null })]);

    render(<FeedsPage />);

    await waitFor(() => expect(screen.getByLabelText("篩選來源")).toBeInTheDocument());
    expect(screen.queryByLabelText("篩選分類")).not.toBeInTheDocument();
  });

  it("narrows the source list to the chosen folder", async () => {
    vi.mocked(listFolders).mockResolvedValue([makeFolder()]);
    vi.mocked(listFeeds).mockResolvedValue([
      makeFeed({ folder_id: 10 }),
      makeFeed({ id: 2, title: "未分類來源", folder_id: null }),
    ]);

    render(<FeedsPage />);

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByLabelText("篩選分類")).toBeInTheDocument());
    await user.click(screen.getByLabelText("篩選分類"));
    await user.click(await screen.findByRole("option", { name: "技術文章" }));

    await user.click(screen.getByLabelText("篩選來源"));
    expect(await screen.findByRole("option", { name: "消息部落格" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "未分類來源" })).not.toBeInTheDocument();
  });
});
