import { del, getJSON, patchJSON, postJSON } from "./client";
import type { UserItem } from "./types";

export interface CreateUserInput {
  username: string;
  password: string;
  role: string;
}

export interface UpdateUserInput {
  role?: string;
  is_active?: boolean;
  password?: string;
}

export function listUsers(): Promise<UserItem[]> {
  return getJSON<UserItem[]>("/admin/users");
}

export function createUser(input: CreateUserInput): Promise<UserItem> {
  return postJSON<UserItem>("/admin/users", input);
}

export function updateUser(userId: number, input: UpdateUserInput): Promise<UserItem> {
  return patchJSON<UserItem>(`/admin/users/${userId}`, input);
}

export function deleteUser(userId: number): Promise<void> {
  return del(`/admin/users/${userId}`);
}
