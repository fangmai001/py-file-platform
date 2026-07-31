import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  // Loading placeholders stand in for rows of real content; without aria-hidden a
  // screen reader would read out a table's worth of meaningless boxes.
  it("stays out of the accessibility tree", () => {
    const { container } = render(<Skeleton className="h-4 w-24" />);

    const skeleton = container.firstElementChild;
    expect(skeleton).toHaveAttribute("aria-hidden");
    expect(skeleton).toHaveAttribute("data-slot", "skeleton");
  });

  it("renders no readable content of its own", () => {
    const { container } = render(<Skeleton className="h-4 w-24" />);

    expect(container).toHaveTextContent("");
    expect(container.firstElementChild?.tagName).toBe("DIV");
  });
});
