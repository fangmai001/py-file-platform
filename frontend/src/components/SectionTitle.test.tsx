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

  // CardHeader 是依 data-slot 切換成雙欄 grid 的，因此拿掉這個屬性會靜默地
  // 破壞每一張帶有 CardAction 的卡片版面。
  it("keeps the card-title slot so CardHeader's grid still applies", () => {
    render(<SectionTitle>站台設定</SectionTitle>);

    expect(screen.getByRole("heading", { level: 2 })).toHaveAttribute("data-slot", "card-title");
  });

  it("does not change the heading level with the size variant", () => {
    render(<SectionTitle size="sm">通知</SectionTitle>);

    expect(screen.getByRole("heading", { level: 2, name: "通知" })).toBeInTheDocument();
  });
});
