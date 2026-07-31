import { render } from "@testing-library/react";
import indexHtml from "../../index.html?raw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./ThemeContext";

/**
 * index.html carries an inline boot script that applies the theme before first paint, and
 * its comment says it "must mirror getInitialTheme() exactly". That agreement was held up
 * by the comment alone: change the storage key or the precedence on either side and
 * nothing fails to compile - the only symptom is the theme flipping once React hydrates.
 *
 * This test runs the real script out of index.html and compares what it does to the
 * documentElement against what ThemeProvider does from the same starting state.
 */
const bootScript = indexHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1];

function runBootScript() {
  if (!bootScript) {
    throw new Error("index.html no longer contains an inline boot <script>");
  }
  new Function(bootScript)();
}

function ThemeProbe() {
  const { theme } = useTheme();
  return <span>{theme}</span>;
}

function reset() {
  document.documentElement.className = "";
  document.documentElement.style.colorScheme = "";
}

function stubPrefersDark(prefersDark: boolean) {
  // jsdom's matchMedia always reports matches: false, so the system-preference half of
  // the precedence rules can only be exercised with a stub.
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: query.includes("dark") && prefersDark,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

describe("index.html boot script", () => {
  beforeEach(() => {
    localStorage.clear();
    reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is still present and readable", () => {
    expect(bootScript).toBeTruthy();
    expect(bootScript).toContain("localStorage.getItem");
  });

  const cases: { stored: string | null; prefersDark: boolean; expected: "light" | "dark" }[] = [
    { stored: "dark", prefersDark: false, expected: "dark" },
    { stored: "dark", prefersDark: true, expected: "dark" },
    { stored: "light", prefersDark: true, expected: "light" },
    { stored: "light", prefersDark: false, expected: "light" },
    { stored: null, prefersDark: true, expected: "dark" },
    { stored: null, prefersDark: false, expected: "light" },
    // An unrecognised value must not be treated as a preference either way.
    { stored: "blue", prefersDark: true, expected: "dark" },
    { stored: "blue", prefersDark: false, expected: "light" },
  ];

  it.each(cases)(
    "agrees with ThemeProvider (stored=$stored, prefersDark=$prefersDark)",
    ({ stored, prefersDark, expected }) => {
      stubPrefersDark(prefersDark);

      if (stored !== null) {
        localStorage.setItem("theme", stored);
      }
      runBootScript();
      const boot = {
        dark: document.documentElement.classList.contains("dark"),
        colorScheme: document.documentElement.style.colorScheme,
      };

      reset();
      const { unmount } = render(
        <ThemeProvider>
          <ThemeProbe />
        </ThemeProvider>,
      );
      const provider = {
        dark: document.documentElement.classList.contains("dark"),
        colorScheme: document.documentElement.style.colorScheme,
      };
      unmount();

      expect(boot).toEqual(provider);
      expect(boot).toEqual({ dark: expected === "dark", colorScheme: expected });
    },
  );
});
