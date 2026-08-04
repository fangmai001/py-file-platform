import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PageHeader from "./PageHeader";

describe("PageHeader", () => {
  // 頁面層級的測試是用 getByRole("heading") 定位頁面，而這之所以行得通，
  // 正是因為這裡輸出的是真正的 <h1>——shadcn 的 CardTitle 渲染出來的是 <div>。
  it("emits the title as a level-1 heading", () => {
    render(<PageHeader title="上傳檔案" />);

    expect(screen.getByRole("heading", { level: 1, name: "上傳檔案" })).toBeInTheDocument();
  });

  it("renders the optional description and actions", () => {
    render(
      <PageHeader
        title="使用者管理"
        description="建立、停用或刪除帳號。"
        actions={<button type="button">新增使用者</button>}
      />,
    );

    expect(screen.getByText("建立、停用或刪除帳號。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增使用者" })).toBeInTheDocument();
  });

  it("omits the description when none is given", () => {
    render(<PageHeader title="關於本專案" />);

    expect(screen.getByRole("heading", { level: 1 }).parentElement?.children).toHaveLength(1);
  });
});
