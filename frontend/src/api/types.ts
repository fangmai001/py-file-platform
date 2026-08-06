export interface FolderItem {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface FileItem {
  id: number;
  owner_id: number;
  owner_username: string;
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

export interface HighlightItem {
  id: number;
  // kebab-case 的 key，由 src/lib/highlight-icons.ts 對應到 lucide 圖示。
  // 型別保持單純的 string，這樣較新版後端新增的圖示仍然解析得出來。
  icon: string;
  title: string;
  description: string | null;
  sort_order: number;
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
  full_name: string | null;
  email: string | null;
  role: string;
  auth_source: string;
  is_active: boolean;
  notify_by_email: boolean;
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
  // 操作者的帳號被刪除後即為 null；actor_username 仍會帶著後端給的可讀佔位字串，
  // 因此請渲染那個欄位，而不是這一個。
  actor_id: number | null;
  actor_username: string;
  action: string;
  target: string | null;
  detail: string | null;
  created_at: string;
}
