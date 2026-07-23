export interface FolderItem {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface FileItem {
  id: number;
  owner_id: number;
  filename: string;
  display_name: string | null;
  folder_id: number | null;
  announced_at: string | null;
  is_public: boolean;
  size: number;
  created_at: string;
}

export interface FolderGroup {
  folder: FolderItem | null;
  files: FileItem[];
}

export interface LinkCardItem {
  id: number;
  title: string;
  description: string | null;
  url: string;
  folder_id: number | null;
  is_public: boolean;
  created_at: string;
}

export interface FileVersionItem {
  id: number;
  file_id: number;
  version_no: number;
  uploaded_at: string;
}

export interface UserItem {
  id: number;
  username: string;
  email: string | null;
  role: string;
  auth_source: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  id: number;
  file_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  actor_id: number;
  actor_username: string;
  action: string;
  target: string | null;
  detail: string | null;
  created_at: string;
}
