import { getJSON, patchJSON, postJSON } from "./client";
import type { UserItem } from "./types";

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface PasswordChangeResponse {
  message: string;
}

export function login(username: string, password: string): Promise<TokenResponse> {
  return postJSON<TokenResponse>("/auth/login", { username, password });
}

export function fetchCurrentUser(): Promise<UserItem> {
  return getJSON<UserItem>("/auth/me");
}

export function updateCurrentUser(fullName: string): Promise<UserItem> {
  return patchJSON<UserItem>("/auth/me", { full_name: fullName });
}

export function changeCurrentUserPassword(currentPassword: string, newPassword: string): Promise<PasswordChangeResponse> {
  return postJSON<PasswordChangeResponse>("/auth/me/password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}
