import { getJSON, postJSON } from "./client";
import type { UserItem } from "./types";

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export function login(username: string, password: string): Promise<TokenResponse> {
  return postJSON<TokenResponse>("/auth/login", { username, password });
}

export function fetchCurrentUser(): Promise<UserItem> {
  return getJSON<UserItem>("/auth/me");
}
