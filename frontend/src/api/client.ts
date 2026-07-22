const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const TOKEN_STORAGE_KEY = "access_token";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
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
      // response body wasn't JSON (or was empty) - fall back to statusText
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

// Downloads go through fetch (not a plain <a href>) so the Authorization header can be
// attached - private files 401 without it, and a real anchor navigation can't carry headers.
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
