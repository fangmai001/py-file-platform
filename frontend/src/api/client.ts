const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const TOKEN_STORAGE_KEY = "access_token";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// 被 <img src> 與 <link rel="icon"> 引用的檔案必須把後端的 origin 明確寫出來——
// 開發時前端由 :5173 提供，而 API 在 :8000。
export function assetUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function authHeaders(existing?: HeadersInit): Headers {
  const headers = new Headers(existing);
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

async function fetchAuthed(path: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    ...options,
    headers: authHeaders(options.headers),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string };
      detail = body.detail ?? detail;
    } catch {
      // response body 不是 JSON（或是空的）——退回使用 statusText
    }
    throw new ApiError(response.status, detail);
  }

  return response;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetchAuthed(path, options);
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function getJSON<T>(path: string): Promise<T> {
  return request<T>(path);
}

function jsonBody(body: unknown): RequestInit {
  return { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export function postJSON<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "POST", ...jsonBody(body) });
}

export function patchJSON<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", ...jsonBody(body) });
}

export function del(path: string): Promise<void> {
  return request<void>(path, { method: "DELETE" });
}

export function postForm<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: "POST", body: form });
}

// 下載走 fetch（而不是單純的 <a href>），才能帶上 Authorization header——私密檔案少了它會回 401，
// 而真正的 anchor 導覽無法夾帶 header。
export async function downloadToDisk(path: string, filename: string): Promise<void> {
  const response = await fetchAuthed(path);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
