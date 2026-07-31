import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AuthLayout from "./AuthLayout";

describe("AuthLayout", () => {
  it("emits the title as a level-1 heading", () => {
    render(<AuthLayout title="登入">{null}</AuthLayout>);

    expect(screen.getByRole("heading", { level: 1, name: "登入" })).toBeInTheDocument();
  });

  it("renders the description and the form it wraps", () => {
    render(
      <AuthLayout title="忘記密碼" description="輸入註冊時使用的 Email。">
        <button type="button">送出</button>
      </AuthLayout>,
    );

    expect(screen.getByText("輸入註冊時使用的 Email。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "送出" })).toBeInTheDocument();
  });

  it("omits the description when none is given", () => {
    render(<AuthLayout title="重設密碼">{null}</AuthLayout>);

    expect(screen.getByRole("heading", { level: 1 }).parentElement?.children).toHaveLength(1);
  });
});
