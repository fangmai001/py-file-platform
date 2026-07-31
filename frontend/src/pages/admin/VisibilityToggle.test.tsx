import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import VisibilityToggle from "./VisibilityToggle";

describe("VisibilityToggle", () => {
  it("shows the current value as its accessible name", () => {
    const { rerender } = render(<VisibilityToggle isPublic onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: "公開" })).toBeInTheDocument();

    rerender(<VisibilityToggle isPublic={false} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: "私密" })).toBeInTheDocument();
  });

  it("calls onToggle when clicked", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<VisibilityToggle isPublic={false} onToggle={onToggle} />);

    await user.click(screen.getByRole("button"));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("wears the Badge colours so it matches the read-only status badges", () => {
    const { rerender } = render(<VisibilityToggle isPublic onToggle={() => {}} />);
    expect(screen.getByRole("button")).toHaveClass("bg-success/12", "text-success", "rounded-full");

    rerender(<VisibilityToggle isPublic={false} onToggle={() => {}} />);
    expect(screen.getByRole("button")).toHaveClass("bg-muted", "text-muted-foreground", "rounded-full");
  });

  it("drops the ghost variant's grey hover in both themes", () => {
    // tailwind-merge keeps `hover:` and `dark:hover:` in separate groups, and the dark rule
    // outranks the light one — so a public pill would grey out on hover if either override
    // went missing, reading as though it had already flipped to private.
    render(<VisibilityToggle isPublic onToggle={() => {}} />);
    const toggle = screen.getByRole("button");

    expect(toggle).toHaveClass("hover:bg-success/20", "dark:hover:bg-success/20");
    expect(toggle.className).not.toMatch(/hover:bg-muted/);
  });
});
