export interface FileItem {
  id: number;
  owner_id: number;
  filename: string;
  folder: string | null;
  is_public: boolean;
  size: number;
  created_at: string;
}

export interface FolderGroup {
  folder: string | null;
  files: FileItem[];
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
  role: string;
  is_active: boolean;
  created_at: string;
}
