import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, del, getJSON, setToken, setUnauthorizedHandler } from "./client";

// src/test/setup.ts 裝了一個會記錄並拋錯的全域 fetch，用來擋下未 mock 的網路請求。這個檔案
// 測的正是 client.ts 對回應的處理，所以每一則都要自己接管 fetch。
function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: false,
    status: 400,
    statusText: "Bad Request",
    json: () => Promise.resolve({}),
    ...response,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function validationResponse(detail: unknown) {
  return {
    ok: false,
    status: 422,
    statusText: "Unprocessable Entity",
    json: () => Promise.resolve({ detail }),
  };
}

describe("client 的錯誤處理", () => {
  beforeEach(() => {
    localStorage.clear();
    setUnauthorizedHandler(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setUnauthorizedHandler(null);
  });

  // 這一則直接釘住 [object Object]：422 的 detail 是陣列，當成字串用就會變成那樣。
  it("把 422 的驗證錯誤陣列攤平成可讀的中文訊息", async () => {
    mockFetch(
      validationResponse([
        { type: "url_parsing", loc: ["body", "url"], msg: "Input should be a valid URL" },
      ]),
    );

    await expect(getJSON("/link-cards")).rejects.toThrow("url：不是有效的網址");
  });

  it("多筆驗證錯誤會全部列出", async () => {
    mockFetch(
      validationResponse([
        { type: "url_parsing", loc: ["body", "url"], msg: "Input should be a valid URL" },
        { type: "missing", loc: ["body", "title"], msg: "Field required" },
      ]),
    );

    await expect(getJSON("/link-cards")).rejects.toThrow("url：不是有效的網址、title：必填");
  });

  it("未知的 type 退回 pydantic 原本的訊息，而不是變成空白", async () => {
    mockFetch(
      validationResponse([
        { type: "some_future_pydantic_type", loc: ["body", "x"], msg: "Something specific" },
      ]),
    );

    await expect(getJSON("/link-cards")).rejects.toThrow("x：Something specific");
  });

  it("detail 是字串時原樣使用", async () => {
    mockFetch({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: "資料夾不存在" }),
    });

    await expect(getJSON("/folders/1")).rejects.toThrow("資料夾不存在");
  });

  it("body 不是 JSON 時退回 statusText", async () => {
    mockFetch({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      json: () => Promise.reject(new Error("not json")),
    });

    await expect(getJSON("/folders")).rejects.toThrow("Bad Gateway");
  });

  it("ApiError 帶著原本的 status", async () => {
    mockFetch({ ok: false, status: 403, json: () => Promise.resolve({ detail: "沒有權限" }) });

    await expect(getJSON("/files")).rejects.toMatchObject({ status: 403 });
  });
});

describe("401 的處理", () => {
  beforeEach(() => {
    localStorage.clear();
    setUnauthorizedHandler(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setUnauthorizedHandler(null);
  });

  it("帶著 token 卻收到 401，代表 token 失效，要觸發登出", async () => {
    setToken("expired-token");
    mockFetch({ ok: false, status: 401, json: () => Promise.resolve({ detail: "無法驗證身份" }) });
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    await expect(getJSON("/auth/me")).rejects.toThrow(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  // 登入時密碼錯誤也是 401，但那時使用者根本還沒登入。若一併觸發登出，畫面會被導走，
  // 使用者看不到「帳號或密碼錯誤」。訪客存取私密檔案的 401 同理。
  it("沒帶 token 的 401 不觸發登出", async () => {
    mockFetch({ ok: false, status: 401, json: () => Promise.resolve({ detail: "帳號或密碼錯誤" }) });
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    await expect(getJSON("/auth/login")).rejects.toThrow("帳號或密碼錯誤");
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe("成功的回應", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("204 不嘗試解析 body", async () => {
    const json = vi.fn().mockRejectedValue(new Error("204 沒有 body"));
    mockFetch({ ok: true, status: 204, json });

    await expect(del("/folders/1")).resolves.toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it("回傳解析後的 JSON", async () => {
    mockFetch({ ok: true, status: 200, json: () => Promise.resolve([{ id: 1, name: "財務" }]) });

    await expect(getJSON("/folders")).resolves.toEqual([{ id: 1, name: "財務" }]);
  });
});
