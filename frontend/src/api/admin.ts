import { del, getJSON, patchJSON, postJSON } from "./client";
import type { AuditLogItem, UserItem, UserRole } from "./types";

export interface CreateUserInput {
  username: string;
  password: string;
  role: UserRole;
  email?: string | null;
  full_name?: string | null;
}

export interface UpdateUserInput {
  role?: UserRole;
  is_active?: boolean;
  email?: string | null;
  full_name?: string | null;
}

export interface ResetPasswordResult {
  password: string;
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

export function resetUserPassword(userId: number): Promise<ResetPasswordResult> {
  return postJSON<ResetPasswordResult>(`/admin/users/${userId}/reset-password`, {});
}

export function listAuditLogs(limit = 50): Promise<AuditLogItem[]> {
  return getJSON<AuditLogItem[]>(`/admin/audit-logs?limit=${limit}`);
}
