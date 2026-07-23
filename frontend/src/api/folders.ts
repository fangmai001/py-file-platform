import { del, getJSON, patchJSON, postJSON } from "./client";
import type { FolderItem } from "./types";

export interface CreateFolderInput {
  name: string;
  description?: string | null;
}

export interface UpdateFolderInput {
  name?: string;
  description?: string | null;
}

export function listFolders(): Promise<FolderItem[]> {
  return getJSON<FolderItem[]>("/folders");
}

export function createFolder(input: CreateFolderInput): Promise<FolderItem> {
  return postJSON<FolderItem>("/folders", input);
}

export function updateFolder(folderId: number, input: UpdateFolderInput): Promise<FolderItem> {
  return patchJSON<FolderItem>(`/folders/${folderId}`, input);
}

export function deleteFolder(folderId: number): Promise<void> {
  return del(`/folders/${folderId}`);
}
