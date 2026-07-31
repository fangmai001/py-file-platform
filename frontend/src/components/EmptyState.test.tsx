import { render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { describe, expect, it } from "vitest";
import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("renders the title on its own", () => {
    const { container } = render(<EmptyState title="目前沒有通知" />);

    expect(screen.getByText("目前沒有通知")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders the optional description, action and icon when given", () => {
    const { container } = render(
      <EmptyState
        icon={Inbox}
        title="目前沒有檔案"
        description="登入後即可上傳第一份檔案。"
        action={<button type="button">前往上傳</button>}
      />,
    );

    expect(screen.getByText("目前沒有檔案")).toBeInTheDocument();
    expect(screen.getByText("登入後即可上傳第一份檔案。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "前往上傳" })).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
