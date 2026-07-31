import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SectionTitle from "./SectionTitle";

describe("SectionTitle", () => {
  it("defaults to a level-2 heading", () => {
    render(<SectionTitle>已實作功能</SectionTitle>);

    expect(screen.getByRole("heading", { level: 2, name: "已實作功能" })).toBeInTheDocument();
  });

  it("honours the requested heading level", () => {
    render(<SectionTitle as="h3">版本歷史</SectionTitle>);

    expect(screen.getByRole("heading", { level: 3, name: "版本歷史" })).toBeInTheDocument();
  });

  // CardHeader switches to a two-column grid based on data-slot, so dropping this
  // attribute would silently break the layout of every card with a CardAction.
  it("keeps the card-title slot so CardHeader's grid still applies", () => {
    render(<SectionTitle>站台設定</SectionTitle>);

    expect(screen.getByRole("heading", { level: 2 })).toHaveAttribute("data-slot", "card-title");
  });

  it("does not change the heading level with the size variant", () => {
    render(<SectionTitle size="sm">通知</SectionTitle>);

    expect(screen.getByRole("heading", { level: 2, name: "通知" })).toBeInTheDocument();
  });
});
