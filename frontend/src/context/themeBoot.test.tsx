import { render } from "@testing-library/react";
import indexHtml from "../../index.html?raw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./ThemeContext";

/**
 * index.html 內含一段 inline 的 boot script，會在第一次繪製前套用主題，而它的註解寫著
 * 「必須與 getInitialTheme() 完全一致」。這份約定過去只靠那句註解撐著：只要在任一邊改動
 * storage key 或優先順序，編譯都不會失敗——唯一的症狀是 React hydrate 之後主題閃一下就翻掉。
 *
 * 這個測試會把 index.html 裡真正的 script 抓出來執行，比對它對 documentElement 做的事，
 * 與 ThemeProvider 從相同起始狀態出發所做的事是否一致。
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
  // jsdom 的 matchMedia 永遠回報 matches: false，所以優先順序規則中「系統偏好」的那一半
  // 只能靠 stub 才跑得到。
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
    // 無法辨識的值，不論如何都不該被當成一種偏好設定。
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
