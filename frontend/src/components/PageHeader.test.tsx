import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PageHeader from "./PageHeader";

describe("PageHeader", () => {
  // Page-level tests locate their page with getByRole("heading"), which only works
  // because this emits a real <h1> - shadcn's CardTitle renders a <div>.
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
