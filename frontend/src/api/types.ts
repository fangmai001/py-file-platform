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

/**
 * 後端只認得這兩個角色，寫入端由 backend/app/schemas/user.py 的 `UserRole` 擋下其他值；
 * 兩份清單必須一起改。後端的回應型別刻意仍是寬鬆的 str（見該檔說明），所以顯示用的
 * `roleLabel()` 仍保留未知值的 fallback。
 */
export type UserRole = "user" | "admin";

export interface UserItem {
  id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
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

export interface FeedSource {
  id: number;
  title: string;
  description: string | null;
  url: string;
  folder_id: number | null;
  is_public: boolean;
  is_active: boolean;
  last_fetched_at: string | null;
  last_status: string | null;
  created_at: string;
}

/** 只有管理員的清單（GET /api/feeds/admin）會帶上 last_error，公開的清單不揭露失敗原因。 */
export interface AdminFeedSource extends FeedSource {
  last_error: string | null;
}

/** 從訂閱來源抓回來的單一則項目。 */
export interface FeedArticle {
  id: number;
  feed_id: number;
  title: string;
  link: string | null;
  author: string | null;
  summary: string | null;
  published_at: string | null;
  fetched_at: string;
}

export interface FeedFetchResult {
  status: string;
  created: number;
  skipped: number;
  error: string | null;
}
