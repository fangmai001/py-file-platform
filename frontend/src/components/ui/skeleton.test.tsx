import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  // 載入佔位是用來代替一列列真實內容的；少了 aria-hidden，螢幕閱讀器會把
  // 整張表格份量的無意義方塊全部唸出來。
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
