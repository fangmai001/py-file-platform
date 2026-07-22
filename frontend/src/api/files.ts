import { del, downloadToDisk, getJSON, patchJSON, postForm } from "./client";
import type { FileItem, FileVersionItem, FolderGroup } from "./types";

export interface UploadFileOptions {
  folderId?: number | null;
  displayName?: string | null;
  announcedAt?: string | null;
}

export interface UpdateFileInput {
  is_public?: boolean;
  folder_id?: number | null;
  display_name?: string | null;
  announced_at?: string | null;
}

export function listFiles(): Promise<FolderGroup[]> {
  return getJSON<FolderGroup[]>("/files");
}

export function uploadFile(file: File, isPublic: boolean, options: UploadFileOptions = {}): Promise<FileItem> {
  const form = new FormData();
  form.append("upload", file);
  form.append("is_public", String(isPublic));
  if (options.folderId != null) {
    form.append("folder_id", String(options.folderId));
  }
  if (options.displayName) {
    form.append("display_name", options.displayName);
  }
  if (options.announcedAt) {
    form.append("announced_at", options.announcedAt);
  }
  return postForm<FileItem>("/files/upload", form);
}

export function updateFile(fileId: number, input: UpdateFileInput): Promise<FileItem> {
  return patchJSON<FileItem>(`/files/${fileId}`, input);
}

export function updateFileVisibility(fileId: number, isPublic: boolean): Promise<FileItem> {
  return updateFile(fileId, { is_public: isPublic });
}

export function deleteFile(fileId: number): Promise<void> {
  return del(`/files/${fileId}`);
}

export function listFileVersions(fileId: number): Promise<FileVersionItem[]> {
  return getJSON<FileVersionItem[]>(`/files/${fileId}/versions`);
}

export function downloadFile(file: FileItem): Promise<void> {
  return downloadToDisk(`/files/${file.id}/download`, file.filename);
}

export function downloadFileVersion(file: FileItem, versionNo: number): Promise<void> {
  return downloadToDisk(`/files/${file.id}/versions/${versionNo}/download`, file.filename);
}
