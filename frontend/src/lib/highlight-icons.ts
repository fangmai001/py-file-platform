import {
  Bell,
  Calendar,
  ClipboardList,
  Download,
  FileText,
  FolderTree,
  Globe,
  History,
  Link2,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface HighlightIconOption {
  key: string;
  label: string;
  Icon: LucideIcon;
}

// 這些 key 必須與 backend/app/schemas/highlight.py 中的 HighlightIconKey 保持同步
//（相同的 key、相同的順序）——不在那份清單裡的值，後端一律以 422 拒絕。
// 注意："link" 這個 key 對應到 lucide 的 Link2，因為在同時用到兩者的頁面裡，
// lucide 的 Link 會與 react-router-dom 的 Link 撞名。
export const HIGHLIGHT_ICON_OPTIONS: HighlightIconOption[] = [
  { key: "shield-check", label: "安全盾牌", Icon: ShieldCheck },
  { key: "history", label: "歷史紀錄", Icon: History },
  { key: "folder-tree", label: "資料夾分類", Icon: FolderTree },
  { key: "clipboard-list", label: "清單", Icon: ClipboardList },
  { key: "file-text", label: "文件", Icon: FileText },
  { key: "upload", label: "上傳", Icon: Upload },
  { key: "download", label: "下載", Icon: Download },
  { key: "users", label: "使用者", Icon: Users },
  { key: "lock", label: "鎖", Icon: Lock },
  { key: "globe", label: "全球／公開", Icon: Globe },
  { key: "search", label: "搜尋", Icon: Search },
  { key: "bell", label: "通知", Icon: Bell },
  { key: "link", label: "連結", Icon: Link2 },
  { key: "calendar", label: "日期", Icon: Calendar },
  { key: "star", label: "星號", Icon: Star },
  { key: "sparkles", label: "亮點", Icon: Sparkles },
];

export const DEFAULT_HIGHLIGHT_ICON = "sparkles";

const ICONS_BY_KEY = new Map(HIGHLIGHT_ICON_OPTIONS.map((option) => [option.key, option]));

/** 把圖示 key 對應成 lucide 元件；這份 build 不認得的 key 會退回預設值。 */
export function highlightIcon(key: string): LucideIcon {
  return ICONS_BY_KEY.get(key)?.Icon ?? Sparkles;
}

/** 圖示 key 的中文標籤；遇到未知的值就退回 key 本身。 */
export function highlightIconLabel(key: string): string {
  return ICONS_BY_KEY.get(key)?.label ?? key;
}
