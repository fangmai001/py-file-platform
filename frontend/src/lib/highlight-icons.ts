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

// Keep these keys in sync with HighlightIconKey in backend/app/schemas/highlight.py
// (same keys, same order) — the backend rejects anything outside that list with a 422.
// Note: the "link" key maps to lucide's Link2 because lucide's Link would collide with
// react-router-dom's Link in pages that use both.
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

/** Resolves an icon key to a lucide component, falling back for keys this build doesn't know. */
export function highlightIcon(key: string): LucideIcon {
  return ICONS_BY_KEY.get(key)?.Icon ?? Sparkles;
}

/** Chinese label for an icon key, falling back to the key itself for unknown values. */
export function highlightIconLabel(key: string): string {
  return ICONS_BY_KEY.get(key)?.label ?? key;
}
