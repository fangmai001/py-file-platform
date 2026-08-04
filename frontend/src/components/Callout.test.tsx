import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Callout from "./Callout";

describe("Callout", () => {
  it("renders nothing when there is no message", () => {
    // 呼叫端會直接把可能為 null 的錯誤字串丟進來，因此空內容時必須什麼都不渲染，
    // 而不是留下一個空的帶框方塊。
    const { container } = render(<Callout>{null}</Callout>);
    expect(container).toBeEmptyDOMElement();

    const { container: emptyString } = render(<Callout>{""}</Callout>);
    expect(emptyString).toBeEmptyDOMElement();
  });

  it("announces destructive messages as an alert", () => {
    render(<Callout>帳號或密碼錯誤</Callout>);

    expect(screen.getByRole("alert")).toHaveTextContent("帳號或密碼錯誤");
  });

  it("announces success messages as a status", () => {
    render(<Callout variant="success">已儲存</Callout>);

    expect(screen.getByRole("status")).toHaveTextContent("已儲存");
  });

  it("announces info messages as a status", () => {
    render(<Callout variant="info">密碼欄位留空表示不變更</Callout>);

    expect(screen.getByRole("status")).toHaveTextContent("密碼欄位留空表示不變更");
  });

  it("does not use the alert role for non-error variants", () => {
    render(<Callout variant="info">僅供參考</Callout>);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
