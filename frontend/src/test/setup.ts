import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

// 每個測試檔都會 mock 掉它所渲染的元件會呼叫的 api/ 模組。因此只要有 fetch 走到這個
// stub，就代表漏了某個模組——那個元件是對著真正的 client.ts 執行，並試圖連向一台根本
// 不存在的伺服器。
//
// 光是 reject 並不足以讓這件事浮現。管理後台的 hook 一律把載入邏輯包在 try/catch 裡，
// 再把錯誤轉成一個 state，於是 rejection 被吞掉，測試照樣變綠，卻已經悄悄發出了網路
// 請求。把呼叫記錄下來、在 afterEach 斷言，才會讓漏掉的 mock 變成看得見的失敗。
let unmockedRequests: string[] = [];

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

beforeEach(() => {
  unmockedRequests = [];
  vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
    const url = requestUrl(input);
    unmockedRequests.push(url);
    return Promise.reject(new Error(`Unmocked fetch: ${url}`));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (unmockedRequests.length === 0) return;

  const count = unmockedRequests.length;
  const urls = [...new Set(unmockedRequests)].join("\n  ");
  unmockedRequests = [];
  throw new Error(
    `This test made ${count} unmocked network request(s):\n  ${urls}\n` +
      "Add a vi.mock() for the api/ module behind each of them.",
  );
});
