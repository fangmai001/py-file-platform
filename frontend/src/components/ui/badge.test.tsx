import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renders its content in a span carrying the badge slot", () => {
    render(<Badge>管理員</Badge>);

    const badge = screen.getByText("管理員");
    expect(badge.tagName).toBe("SPAN");
    expect(badge).toHaveAttribute("data-slot", "badge");
  });

  it("forwards arbitrary props such as title", () => {
    render(<Badge title="公開檔案">公開</Badge>);

    expect(screen.getByTitle("公開檔案")).toHaveTextContent("公開");
  });
});
