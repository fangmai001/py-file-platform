import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AboutPage from "./AboutPage";

describe("AboutPage", () => {
  it("renders the project introduction", () => {
    render(<AboutPage />);

    expect(screen.getByRole("heading", { name: "關於本專案" })).toBeInTheDocument();
    expect(screen.getByText("已實作功能")).toBeInTheDocument();
  });
});
