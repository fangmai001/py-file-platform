import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { FileText, Folder, Link2, ScrollText, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { createUser, deleteUser, listAuditLogs, listUsers, resetUserPassword, updateUser } from "../api/admin";
import { ApiError } from "../api/client";
import { deleteFile, listFiles } from "../api/files";
import { createFolder, deleteFolder, listFolders, updateFolder } from "../api/folders";
import { createHighlight, deleteHighlight, listHighlights, updateHighlight } from "../api/highlights";
import { getLdapSettings, updateLdapSettings } from "../api/ldap-settings";
import type { LdapSettings } from "../api/ldap-settings";
import { createLinkCard, deleteLinkCard, listLinkCards, updateLinkCard } from "../api/link-cards";
import {
  deleteFavicon,
  deleteHeroImage,
  updateSiteSettings,
  uploadFavicon,
  uploadHeroImage,
} from "../api/site-settings";
import { getSmtpSettings, updateSmtpSettings } from "../api/smtp-settings";
import type { SmtpSettings } from "../api/smtp-settings";
import type {
  AuditLogItem,
  FileItem,
  FolderGroup,
  FolderItem,
  HighlightItem,
  LinkCardItem,
  UserItem,
} from "../api/types";
import Callout from "../components/Callout";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import SectionTitle from "../components/SectionTitle";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Skeleton } from "../components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmDialogContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { DEFAULT_HIGHLIGHT_ICON, HIGHLIGHT_ICON_OPTIONS, highlightIcon, highlightIconLabel } from "../lib/highlight-icons";

interface UserDraft {
  email: string;
  role: string;
  full_name: string;
}

function toUserDrafts(items: UserItem[]): Record<number, UserDraft> {
  return Object.fromEntries(
    items.map((u) => [u.id, { email: u.email ?? "", role: u.role, full_name: u.full_name ?? "" }]),
  );
}

interface FolderDraft {
  name: string;
  description: string;
}

function toFolderDrafts(items: FolderItem[]): Record<number, FolderDraft> {
  return Object.fromEntries(items.map((f) => [f.id, { name: f.name, description: f.description ?? "" }]));
}

interface LinkCardDraft {
  title: string;
  description: string;
  url: string;
  folderId: string;
  isPublic: boolean;
}

function toLinkCardDrafts(items: LinkCardItem[]): Record<number, LinkCardDraft> {
  return Object.fromEntries(
    items.map((c) => [
      c.id,
      {
        title: c.title,
        description: c.description ?? "",
        url: c.url,
        folderId: c.folder_id !== null ? String(c.folder_id) : NO_FOLDER,
        isPublic: c.is_public,
      },
    ]),
  );
}

interface HighlightDraft {
  icon: string;
  title: string;
  description: string;
  sortOrder: string;
  isPublic: boolean;
}

function toHighlightDrafts(items: HighlightItem[]): Record<number, HighlightDraft> {
  return Object.fromEntries(
    items.map((h) => [
      h.id,
      {
        icon: h.icon,
        title: h.title,
        description: h.description ?? "",
        sortOrder: String(h.sort_order),
        isPublic: h.is_public,
      },
    ]),
  );
}

const AUDIT_LOG_LIMIT = 50;
const ALL_ACTIONS = "__all__";
const NO_FOLDER = "none";

type BrandingImageKind = "favicon" | "heroImage";

const BRANDING_IMAGE_LABELS: Record<BrandingImageKind, string> = {
  favicon: "網站圖示",
  heroImage: "首頁歡迎圖片",
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("zh-TW");
}

/** Placeholder rows shown while a tab's table is still loading. */
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function AdminPage() {
  const { user: currentUser } = useAuth();
  const confirm = useConfirm();
  const siteSettings = useSiteSettings();

  const [siteSettingsDraft, setSiteSettingsDraft] = useState({
    brandName: siteSettings.brandName,
    browserTitle: siteSettings.browserTitle,
    heroTitle: siteSettings.heroTitle,
    heroSubtitle: siteSettings.heroSubtitle,
  });
  const [isSavingSiteSettings, setIsSavingSiteSettings] = useState(false);
  const [brandingImageBusy, setBrandingImageBusy] = useState<BrandingImageKind | null>(null);

  const [ldapSettings, setLdapSettings] = useState<LdapSettings | null>(null);
  const [ldapSettingsError, setLdapSettingsError] = useState<string | null>(null);
  const [ldapDraft, setLdapDraft] = useState({
    enabled: false,
    serverUri: "",
    bindDn: "",
    bindPassword: "",
    baseDn: "",
    userSearchFilter: "",
  });
  const [isSavingLdapSettings, setIsSavingLdapSettings] = useState(false);

  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings | null>(null);
  const [smtpSettingsError, setSmtpSettingsError] = useState<string | null>(null);
  const [smtpDraft, setSmtpDraft] = useState({
    enabled: false,
    host: "",
    port: "587",
    username: "",
    password: "",
    fromAddress: "",
    useTls: true,
  });
  const [isSavingSmtpSettings, setIsSavingSmtpSettings] = useState(false);

  const [users, setUsers] = useState<UserItem[] | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState("");
  const [userDrafts, setUserDrafts] = useState<Record<number, UserDraft>>({});
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<{ username: string; password: string } | null>(null);

  const [fileGroups, setFileGroups] = useState<FolderGroup[] | null>(null);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [fileFilter, setFileFilter] = useState("");

  const [folders, setFolders] = useState<FolderItem[] | null>(null);
  const [foldersError, setFoldersError] = useState<string | null>(null);
  const [folderDrafts, setFolderDrafts] = useState<Record<number, FolderDraft>>({});
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [linkCards, setLinkCards] = useState<LinkCardItem[] | null>(null);
  const [linkCardsError, setLinkCardsError] = useState<string | null>(null);
  const [linkCardDrafts, setLinkCardDrafts] = useState<Record<number, LinkCardDraft>>({});
  const [newLinkCardTitle, setNewLinkCardTitle] = useState("");
  const [newLinkCardDescription, setNewLinkCardDescription] = useState("");
  const [newLinkCardUrl, setNewLinkCardUrl] = useState("");
  const [newLinkCardFolderId, setNewLinkCardFolderId] = useState(NO_FOLDER);
  const [isCreatingLinkCard, setIsCreatingLinkCard] = useState(false);

  const [highlights, setHighlights] = useState<HighlightItem[] | null>(null);
  const [highlightsError, setHighlightsError] = useState<string | null>(null);
  const [highlightDrafts, setHighlightDrafts] = useState<Record<number, HighlightDraft>>({});
  const [newHighlightIcon, setNewHighlightIcon] = useState(DEFAULT_HIGHLIGHT_ICON);
  const [newHighlightTitle, setNewHighlightTitle] = useState("");
  const [newHighlightDescription, setNewHighlightDescription] = useState("");
  const [newHighlightSortOrder, setNewHighlightSortOrder] = useState("");
  const [isCreatingHighlight, setIsCreatingHighlight] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[] | null>(null);
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null);
  const [auditActionFilter, setAuditActionFilter] = useState(ALL_ACTIONS);

  async function loadUsers() {
    try {
      const data = await listUsers();
      setUsers(data);
      setUserDrafts(toUserDrafts(data));
      setUsersError(null);
    } catch (err) {
      setUsersError(err instanceof ApiError ? err.message : "無法載入使用者列表");
    }
  }

  async function loadFiles() {
    try {
      setFileGroups(await listFiles());
      setFilesError(null);
    } catch (err) {
      setFilesError(err instanceof ApiError ? err.message : "無法載入檔案列表");
    }
  }

  async function loadFolders() {
    try {
      const data = await listFolders();
      setFolders(data);
      setFolderDrafts(toFolderDrafts(data));
      setFoldersError(null);
    } catch (err) {
      setFoldersError(err instanceof ApiError ? err.message : "無法載入卡片列表");
    }
  }

  async function loadLinkCards() {
    try {
      const data = await listLinkCards();
      setLinkCards(data);
      setLinkCardDrafts(toLinkCardDrafts(data));
      setLinkCardsError(null);
    } catch (err) {
      setLinkCardsError(err instanceof ApiError ? err.message : "無法載入連結卡片列表");
    }
  }

  async function loadHighlights() {
    try {
      const data = await listHighlights();
      setHighlights(data);
      setHighlightDrafts(toHighlightDrafts(data));
      setHighlightsError(null);
    } catch (err) {
      setHighlightsError(err instanceof ApiError ? err.message : "無法載入首頁特色列表");
    }
  }

  async function loadAuditLogs() {
    try {
      setAuditLogs(await listAuditLogs(AUDIT_LOG_LIMIT));
      setAuditLogsError(null);
    } catch (err) {
      setAuditLogsError(err instanceof ApiError ? err.message : "無法載入操作紀錄");
    }
  }

  async function loadLdapSettings() {
    try {
      const data = await getLdapSettings();
      setLdapSettings(data);
      setLdapDraft({
        enabled: data.enabled,
        serverUri: data.server_uri ?? "",
        bindDn: data.bind_dn ?? "",
        bindPassword: "",
        baseDn: data.base_dn ?? "",
        userSearchFilter: data.user_search_filter,
      });
      setLdapSettingsError(null);
    } catch (err) {
      setLdapSettingsError(err instanceof ApiError ? err.message : "無法載入 LDAP 設定");
    }
  }

  async function loadSmtpSettings() {
    try {
      const data = await getSmtpSettings();
      setSmtpSettings(data);
      setSmtpDraft({
        enabled: data.enabled,
        host: data.host ?? "",
        port: String(data.port),
        username: data.username ?? "",
        password: "",
        fromAddress: data.from_address,
        useTls: data.use_tls,
      });
      setSmtpSettingsError(null);
    } catch (err) {
      setSmtpSettingsError(err instanceof ApiError ? err.message : "無法載入 SMTP 設定");
    }
  }

  useEffect(() => {
    loadUsers();
    loadFiles();
    loadFolders();
    loadLinkCards();
    loadHighlights();
    loadAuditLogs();
    loadLdapSettings();
    loadSmtpSettings();
  }, []);

  useEffect(() => {
    setSiteSettingsDraft({
      brandName: siteSettings.brandName,
      browserTitle: siteSettings.browserTitle,
      heroTitle: siteSettings.heroTitle,
      heroSubtitle: siteSettings.heroSubtitle,
    });
  }, [siteSettings.brandName, siteSettings.browserTitle, siteSettings.heroTitle, siteSettings.heroSubtitle]);

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setUsersError(null);
    try {
      await createUser({
        username: newUsername,
        password: newPassword,
        role: newRole,
        email: newEmail.trim() || null,
        full_name: newFullName.trim() || null,
      });
      setNewUsername("");
      setNewPassword("");
      setNewRole("user");
      setNewEmail("");
      setNewFullName("");
      await loadUsers();
      await loadAuditLogs();
      toast.success(`已建立使用者「${newUsername}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "建立使用者失敗";
      setUsersError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSaveUser(target: UserItem) {
    const draft = userDrafts[target.id];
    const email = draft?.email.trim() || null;
    const role = draft?.role ?? target.role;
    const fullName = draft?.full_name.trim() || null;
    const emailChanged = email !== (target.email ?? null);
    const roleChanged = role !== target.role;
    const fullNameChanged = fullName !== (target.full_name ?? null);
    if (!emailChanged && !roleChanged && !fullNameChanged) {
      return;
    }
    if (roleChanged) {
      const ok = await confirm({
        title: "變更角色",
        description: `確定要將使用者「${target.username}」的角色改為「${role}」嗎？`,
        confirmLabel: "確定",
      });
      if (!ok) {
        return;
      }
    }
    try {
      await updateUser(target.id, {
        ...(emailChanged ? { email } : {}),
        ...(roleChanged ? { role } : {}),
        ...(fullNameChanged ? { full_name: fullName } : {}),
      });
      await loadUsers();
      await loadAuditLogs();
      toast.success(`已更新使用者「${target.username}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新使用者失敗";
      setUsersError(message);
      toast.error(message);
    }
  }

  async function handleResetPassword(target: UserItem) {
    const ok = await confirm({
      title: "重設密碼",
      description: `確定要重設使用者「${target.username}」的密碼嗎？系統會產生一組新密碼，請於下個視窗複製後轉交給使用者。`,
      confirmLabel: "確定",
    });
    if (!ok) {
      return;
    }
    try {
      const { password } = await resetUserPassword(target.id);
      await loadUsers();
      await loadAuditLogs();
      setRevealedPassword({ username: target.username, password });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "重設密碼失敗";
      setUsersError(message);
      toast.error(message);
    }
  }

  async function handleToggleActive(target: UserItem) {
    const ok = await confirm({
      title: target.is_active ? "停用使用者" : "啟用使用者",
      description: target.is_active
        ? `確定要停用使用者「${target.username}」嗎？停用後該帳號將無法登入。`
        : `確定要啟用使用者「${target.username}」嗎？`,
      confirmLabel: "確定",
    });
    if (!ok) {
      return;
    }
    try {
      await updateUser(target.id, { is_active: !target.is_active });
      await loadUsers();
      await loadAuditLogs();
      toast.success(`已${target.is_active ? "停用" : "啟用"}使用者「${target.username}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新使用者失敗";
      setUsersError(message);
      toast.error(message);
    }
  }

  async function handleDeleteUser(target: UserItem) {
    const ok = await confirm({
      title: "刪除使用者",
      description: `確定要刪除使用者「${target.username}」嗎？此操作無法復原。`,
      confirmLabel: "刪除",
      variant: "destructive",
    });
    if (!ok) {
      return;
    }
    try {
      await deleteUser(target.id);
      await loadUsers();
      await loadAuditLogs();
      toast.success(`已刪除使用者「${target.username}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "刪除使用者失敗";
      setUsersError(message);
      toast.error(message);
    }
  }

  async function handleDeleteFile(file: FileItem) {
    const ok = await confirm({
      title: "刪除檔案",
      description: `確定要刪除檔案「${file.filename}」嗎？此操作無法復原。`,
      confirmLabel: "刪除",
      variant: "destructive",
    });
    if (!ok) {
      return;
    }
    try {
      await deleteFile(file.id);
      await loadFiles();
      await loadAuditLogs();
      toast.success(`已刪除檔案「${file.filename}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "刪除檔案失敗";
      setFilesError(message);
      toast.error(message);
    }
  }

  async function handleCreateFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingFolder(true);
    setFoldersError(null);
    try {
      await createFolder({ name: newFolderName, description: newFolderDescription.trim() || null });
      setNewFolderName("");
      setNewFolderDescription("");
      await loadFolders();
      toast.success(`已建立卡片「${newFolderName}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "建立卡片失敗";
      setFoldersError(message);
      toast.error(message);
    } finally {
      setIsCreatingFolder(false);
    }
  }

  async function handleSaveFolder(folder: FolderItem) {
    const draft = folderDrafts[folder.id];
    try {
      await updateFolder(folder.id, { name: draft.name, description: draft.description.trim() || null });
      await loadFolders();
      toast.success(`已更新卡片「${draft.name}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新卡片失敗";
      setFoldersError(message);
      toast.error(message);
    }
  }

  async function handleDeleteFolder(folder: FolderItem) {
    const ok = await confirm({
      title: "刪除卡片",
      description: `確定要刪除卡片「${folder.name}」嗎？此卡片下的檔案將變為未分類。`,
      confirmLabel: "刪除",
      variant: "destructive",
    });
    if (!ok) {
      return;
    }
    try {
      await deleteFolder(folder.id);
      await loadFolders();
      await loadFiles();
      toast.success(`已刪除卡片「${folder.name}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "刪除卡片失敗";
      setFoldersError(message);
      toast.error(message);
    }
  }

  async function handleCreateLinkCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingLinkCard(true);
    setLinkCardsError(null);
    try {
      await createLinkCard({
        title: newLinkCardTitle,
        description: newLinkCardDescription.trim() || null,
        url: newLinkCardUrl,
        folder_id: newLinkCardFolderId === NO_FOLDER ? null : Number(newLinkCardFolderId),
      });
      setNewLinkCardTitle("");
      setNewLinkCardDescription("");
      setNewLinkCardUrl("");
      setNewLinkCardFolderId(NO_FOLDER);
      await loadLinkCards();
      toast.success(`已建立連結卡片「${newLinkCardTitle}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "建立連結卡片失敗";
      setLinkCardsError(message);
      toast.error(message);
    } finally {
      setIsCreatingLinkCard(false);
    }
  }

  async function handleSaveLinkCard(linkCard: LinkCardItem) {
    const draft = linkCardDrafts[linkCard.id];
    try {
      await updateLinkCard(linkCard.id, {
        title: draft.title,
        description: draft.description.trim() || null,
        url: draft.url,
        folder_id: draft.folderId === NO_FOLDER ? null : Number(draft.folderId),
        is_public: draft.isPublic,
      });
      await loadLinkCards();
      toast.success(`已更新連結卡片「${draft.title}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新連結卡片失敗";
      setLinkCardsError(message);
      toast.error(message);
    }
  }

  async function handleDeleteLinkCard(linkCard: LinkCardItem) {
    const ok = await confirm({
      title: "刪除連結卡片",
      description: `確定要刪除連結卡片「${linkCard.title}」嗎？此操作無法復原。`,
      confirmLabel: "刪除",
      variant: "destructive",
    });
    if (!ok) {
      return;
    }
    try {
      await deleteLinkCard(linkCard.id);
      await loadLinkCards();
      toast.success(`已刪除連結卡片「${linkCard.title}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "刪除連結卡片失敗";
      setLinkCardsError(message);
      toast.error(message);
    }
  }

  async function handleCreateHighlight(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingHighlight(true);
    setHighlightsError(null);
    try {
      await createHighlight({
        icon: newHighlightIcon,
        title: newHighlightTitle,
        description: newHighlightDescription.trim() || null,
        sort_order: Number(newHighlightSortOrder) || 0,
      });
      setNewHighlightIcon(DEFAULT_HIGHLIGHT_ICON);
      setNewHighlightTitle("");
      setNewHighlightDescription("");
      setNewHighlightSortOrder("");
      await loadHighlights();
      toast.success(`已建立首頁特色「${newHighlightTitle}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "建立首頁特色失敗";
      setHighlightsError(message);
      toast.error(message);
    } finally {
      setIsCreatingHighlight(false);
    }
  }

  async function handleSaveHighlight(highlight: HighlightItem) {
    const draft = highlightDrafts[highlight.id];
    try {
      await updateHighlight(highlight.id, {
        icon: draft.icon,
        title: draft.title,
        description: draft.description.trim() || null,
        sort_order: Number(draft.sortOrder) || 0,
        is_public: draft.isPublic,
      });
      await loadHighlights();
      toast.success(`已更新首頁特色「${draft.title}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新首頁特色失敗";
      setHighlightsError(message);
      toast.error(message);
    }
  }

  async function handleDeleteHighlight(highlight: HighlightItem) {
    const ok = await confirm({
      title: "刪除首頁特色",
      description: `確定要刪除首頁特色「${highlight.title}」嗎？此操作無法復原。`,
      confirmLabel: "刪除",
      variant: "destructive",
    });
    if (!ok) {
      return;
    }
    try {
      await deleteHighlight(highlight.id);
      await loadHighlights();
      toast.success(`已刪除首頁特色「${highlight.title}」`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "刪除首頁特色失敗";
      setHighlightsError(message);
      toast.error(message);
    }
  }

  async function handleSaveSiteSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingSiteSettings(true);
    try {
      await updateSiteSettings({
        brand_name: siteSettingsDraft.brandName.trim() || null,
        browser_title: siteSettingsDraft.browserTitle.trim() || null,
        hero_title: siteSettingsDraft.heroTitle.trim() || null,
        hero_subtitle: siteSettingsDraft.heroSubtitle.trim() || null,
      });
      await siteSettings.refresh();
      toast.success("已更新站台設定");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新站台設定失敗";
      toast.error(message);
    } finally {
      setIsSavingSiteSettings(false);
    }
  }

  // Branding images upload as soon as a file is picked rather than waiting for the text
  // form's submit - there is no draft state to reconcile, just a file that replaces the old one.
  async function handleBrandingImageChange(kind: BrandingImageKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset the input so re-picking the same file after a failed upload still fires onChange.
    event.target.value = "";
    if (!file) {
      return;
    }

    setBrandingImageBusy(kind);
    try {
      await (kind === "favicon" ? uploadFavicon(file) : uploadHeroImage(file));
      await siteSettings.refresh();
      toast.success(`已更新${BRANDING_IMAGE_LABELS[kind]}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `更新${BRANDING_IMAGE_LABELS[kind]}失敗`);
    } finally {
      setBrandingImageBusy(null);
    }
  }

  async function handleRemoveBrandingImage(kind: BrandingImageKind) {
    setBrandingImageBusy(kind);
    try {
      await (kind === "favicon" ? deleteFavicon() : deleteHeroImage());
      await siteSettings.refresh();
      toast.success(`已移除${BRANDING_IMAGE_LABELS[kind]}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `移除${BRANDING_IMAGE_LABELS[kind]}失敗`);
    } finally {
      setBrandingImageBusy(null);
    }
  }

  async function handleSaveLdapSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingLdapSettings(true);
    try {
      await updateLdapSettings({
        enabled: ldapDraft.enabled,
        server_uri: ldapDraft.serverUri.trim() || null,
        bind_dn: ldapDraft.bindDn.trim() || null,
        // Omitted entirely when blank so the currently stored password is kept.
        ...(ldapDraft.bindPassword.trim() ? { bind_password: ldapDraft.bindPassword.trim() } : {}),
        base_dn: ldapDraft.baseDn.trim() || null,
        user_search_filter: ldapDraft.userSearchFilter.trim() || undefined,
      });
      await loadLdapSettings();
      await loadAuditLogs();
      toast.success("已更新 LDAP 設定");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新 LDAP 設定失敗";
      setLdapSettingsError(message);
      toast.error(message);
    } finally {
      setIsSavingLdapSettings(false);
    }
  }

  async function handleSaveSmtpSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingSmtpSettings(true);
    try {
      const port = Number.parseInt(smtpDraft.port, 10);
      await updateSmtpSettings({
        enabled: smtpDraft.enabled,
        host: smtpDraft.host.trim() || null,
        port: Number.isNaN(port) ? undefined : port,
        username: smtpDraft.username.trim() || null,
        // Omitted entirely when blank so the currently stored password is kept.
        ...(smtpDraft.password.trim() ? { password: smtpDraft.password.trim() } : {}),
        from_address: smtpDraft.fromAddress.trim() || undefined,
        use_tls: smtpDraft.useTls,
      });
      await loadSmtpSettings();
      await loadAuditLogs();
      toast.success("已更新 SMTP 設定");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新 SMTP 設定失敗";
      setSmtpSettingsError(message);
      toast.error(message);
    } finally {
      setIsSavingSmtpSettings(false);
    }
  }

  const totalFiles = fileGroups?.reduce((sum, group) => sum + group.files.length, 0) ?? null;

  const filteredUsers = useMemo(() => {
    if (!users) {
      return users;
    }
    const keyword = userFilter.trim().toLowerCase();
    if (!keyword) {
      return users;
    }
    return users.filter((u) => u.username.toLowerCase().includes(keyword));
  }, [users, userFilter]);

  const allFiles = useMemo(
    () =>
      fileGroups?.flatMap((group) => group.files.map((file) => ({ file, folderName: group.folder?.name ?? "未分類" }))) ??
      null,
    [fileGroups],
  );

  const filteredFiles = useMemo(() => {
    if (!allFiles) {
      return allFiles;
    }
    const keyword = fileFilter.trim().toLowerCase();
    if (!keyword) {
      return allFiles;
    }
    return allFiles.filter(
      ({ file }) =>
        file.filename.toLowerCase().includes(keyword) ||
        (file.display_name?.toLowerCase().includes(keyword) ?? false),
    );
  }, [allFiles, fileFilter]);

  const auditActions = useMemo(() => {
    if (!auditLogs) {
      return [];
    }
    return Array.from(new Set(auditLogs.map((log) => log.action))).sort();
  }, [auditLogs]);

  const filteredAuditLogs = useMemo(() => {
    if (!auditLogs) {
      return auditLogs;
    }
    if (auditActionFilter === ALL_ACTIONS) {
      return auditLogs;
    }
    return auditLogs.filter((log) => log.action === auditActionFilter);
  }, [auditLogs, auditActionFilter]);

  return (
    <div className="page">
      <PageHeader title="管理後台" description="管理使用者帳號與所有人上傳的檔案。" />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 sm:max-w-lg">
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5">
              {users === null ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-3xl font-semibold text-foreground tabular-nums">
                  {users.length}
                </span>
              )}
              <span className="text-sm text-muted-foreground">使用者總數</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5">
              {totalFiles === null ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-3xl font-semibold text-foreground tabular-nums">
                  {totalFiles}
                </span>
              )}
              <span className="text-sm text-muted-foreground">檔案總數</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        {/* line variant + flex-none: nine Chinese labels crammed into the default padded
            trough get squashed, because the stock trigger is flex-1. */}
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="users" className="h-9 flex-none px-3">
            使用者
          </TabsTrigger>
          <TabsTrigger value="folders" className="h-9 flex-none px-3">
            卡片
          </TabsTrigger>
          <TabsTrigger value="link-cards" className="h-9 flex-none px-3">
            連結卡片
          </TabsTrigger>
          <TabsTrigger value="highlights" className="h-9 flex-none px-3">
            首頁特色
          </TabsTrigger>
          <TabsTrigger value="files" className="h-9 flex-none px-3">
            檔案
          </TabsTrigger>
          <TabsTrigger value="audit-logs" className="h-9 flex-none px-3">
            操作紀錄
          </TabsTrigger>
          <TabsTrigger value="site-settings" className="h-9 flex-none px-3">
            站台設定
          </TabsTrigger>
          <TabsTrigger value="ldap-settings" className="h-9 flex-none px-3">
            LDAP 設定
          </TabsTrigger>
          <TabsTrigger value="smtp-settings" className="h-9 flex-none px-3">
            Email SMTP 設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="flex flex-col gap-6 pt-4">
          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <SectionTitle>新增使用者</SectionTitle>
              <form className="flex flex-wrap items-end gap-4" onSubmit={handleCreateUser}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-username">帳號</Label>
                  <Input
                    id="new-username"
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-password">密碼</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-email">Email（選填）</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-full-name">姓名（選填）</Label>
                  <Input
                    id="new-full-name"
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-role">角色</Label>
                  <Select value={newRole} onValueChange={(value) => value && setNewRole(value)}>
                    <SelectTrigger id="new-role" className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">user</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "建立中…" : "新增"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <SectionTitle>使用者列表</SectionTitle>
                <Input
                  type="search"
                  placeholder="依帳號搜尋…"
                  className="w-56"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  aria-label="依帳號搜尋使用者"
                />
              </div>
              <Callout>{usersError}</Callout>
              {users === null && !usersError && <TableSkeleton />}
              {filteredUsers !== null && filteredUsers.length === 0 && (
                <EmptyState icon={Users} title={users !== null && users.length > 0 ? "沒有符合條件的使用者" : "目前沒有使用者"} />
              )}
              {filteredUsers !== null && filteredUsers.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>帳號</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead>新增日期</TableHead>
                      <TableHead>修改日期</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.username}</TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            className="w-32"
                            placeholder="未填寫姓名"
                            aria-label={`「${u.username}」的姓名`}
                            value={userDrafts[u.id]?.full_name ?? ""}
                            onChange={(e) =>
                              setUserDrafts((drafts) => ({
                                ...drafts,
                                [u.id]: { ...drafts[u.id], full_name: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="email"
                            className="w-48"
                            placeholder={u.auth_source === "ldap" ? "LDAP 帳號" : "未設定"}
                            value={userDrafts[u.id]?.email ?? ""}
                            onChange={(e) =>
                              setUserDrafts((drafts) => ({
                                ...drafts,
                                [u.id]: { ...drafts[u.id], email: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={userDrafts[u.id]?.role ?? u.role}
                            onValueChange={(role) =>
                              role &&
                              setUserDrafts((drafts) => ({
                                ...drafts,
                                [u.id]: { ...drafts[u.id], role },
                              }))
                            }
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">user</SelectItem>
                              <SelectItem value="admin">admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.is_active ? "success" : "secondary"}>
                            {u.is_active ? "啟用" : "停用"}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDateTime(u.created_at)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDateTime(u.updated_at)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleSaveUser(u)}>
                              儲存
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleToggleActive(u)}>
                              {u.is_active ? "停用" : "啟用"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResetPassword(u)}
                              disabled={u.auth_source === "ldap"}
                              title={u.auth_source === "ldap" ? "LDAP 帳號的密碼由 LDAP 伺服器管理" : undefined}
                            >
                              重設密碼
                            </Button>
                            <Button
                              variant="destructive-outline"
                              size="sm"
                              onClick={() => handleDeleteUser(u)}
                              disabled={currentUser?.id === u.id}
                            >
                              刪除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Dialog open={revealedPassword !== null} onOpenChange={(open) => !open && setRevealedPassword(null)}>
            <DialogContent showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>已重設「{revealedPassword?.username}」的密碼</DialogTitle>
                <DialogDescription>此密碼僅顯示這一次，請立即複製並透過其他管道轉交給使用者。</DialogDescription>
              </DialogHeader>
              <Input type="text" readOnly value={revealedPassword?.password ?? ""} className="font-mono" />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (revealedPassword) {
                      await navigator.clipboard.writeText(revealedPassword.password);
                      toast.success("已複製密碼");
                    }
                  }}
                >
                  複製
                </Button>
                <Button onClick={() => setRevealedPassword(null)}>關閉</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="folders" className="flex flex-col gap-6 pt-4">
          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <SectionTitle>新增卡片</SectionTitle>
              <p className="text-sm text-muted-foreground">卡片用來將首頁的檔案分組呈現，檔案上傳或編輯時可選擇要放入哪張卡片。</p>
              <form className="flex flex-wrap items-end gap-4" onSubmit={handleCreateFolder}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-folder-name">名稱</Label>
                  <Input
                    id="new-folder-name"
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-folder-description">描述</Label>
                  <Input
                    id="new-folder-description"
                    type="text"
                    value={newFolderDescription}
                    onChange={(e) => setNewFolderDescription(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isCreatingFolder}>
                  {isCreatingFolder ? "建立中…" : "新增"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <SectionTitle>卡片列表</SectionTitle>
              <Callout>{foldersError}</Callout>
              {folders === null && !foldersError && <TableSkeleton />}
              {folders !== null && folders.length === 0 && (
                <EmptyState icon={Folder} title="目前沒有卡片" />
              )}
              {folders !== null && folders.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名稱</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {folders.map((folder) => (
                      <TableRow key={folder.id}>
                        <TableCell>
                          <Input
                            type="text"
                            value={folderDrafts[folder.id]?.name ?? ""}
                            onChange={(e) =>
                              setFolderDrafts((drafts) => ({
                                ...drafts,
                                [folder.id]: { ...drafts[folder.id], name: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            value={folderDrafts[folder.id]?.description ?? ""}
                            onChange={(e) =>
                              setFolderDrafts((drafts) => ({
                                ...drafts,
                                [folder.id]: { ...drafts[folder.id], description: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleSaveFolder(folder)}>
                              儲存
                            </Button>
                            <Button variant="destructive-outline" size="sm" onClick={() => handleDeleteFolder(folder)}>
                              刪除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="link-cards" className="flex flex-col gap-6 pt-4">
          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <SectionTitle>新增連結卡片</SectionTitle>
              <p className="text-sm text-muted-foreground">
                連結卡片會與檔案卡片一併顯示在首頁，點擊後在新分頁開啟指定網址，不涉及檔案上傳/下載。
              </p>
              <form className="flex flex-wrap items-end gap-4" onSubmit={handleCreateLinkCard}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-link-card-title">標題</Label>
                  <Input
                    id="new-link-card-title"
                    type="text"
                    value={newLinkCardTitle}
                    onChange={(e) => setNewLinkCardTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-link-card-description">說明</Label>
                  <Input
                    id="new-link-card-description"
                    type="text"
                    value={newLinkCardDescription}
                    onChange={(e) => setNewLinkCardDescription(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-link-card-url">目標網址</Label>
                  <Input
                    id="new-link-card-url"
                    type="url"
                    placeholder="https://example.com"
                    value={newLinkCardUrl}
                    onChange={(e) => setNewLinkCardUrl(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-link-card-folder">卡片分類</Label>
                  <Select value={newLinkCardFolderId} onValueChange={(value) => value && setNewLinkCardFolderId(value)}>
                    <SelectTrigger id="new-link-card-folder" className="w-40">
                      <SelectValue>
                        {(value: string) =>
                          value === NO_FOLDER ? "未分類" : (folders?.find((f) => String(f.id) === value)?.name ?? "未分類")
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_FOLDER}>未分類</SelectItem>
                      {(folders ?? []).map((folder) => (
                        <SelectItem key={folder.id} value={String(folder.id)}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isCreatingLinkCard}>
                  {isCreatingLinkCard ? "建立中…" : "新增"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <SectionTitle>連結卡片列表</SectionTitle>
              <Callout>{linkCardsError}</Callout>
              {linkCards === null && !linkCardsError && <TableSkeleton />}
              {linkCards !== null && linkCards.length === 0 && (
                <EmptyState icon={Link2} title="目前沒有連結卡片" />
              )}
              {linkCards !== null && linkCards.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>標題</TableHead>
                      <TableHead>說明</TableHead>
                      <TableHead>網址</TableHead>
                      <TableHead>分類</TableHead>
                      <TableHead>公開</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkCards.map((card) => (
                      <TableRow key={card.id}>
                        <TableCell>
                          <Input
                            type="text"
                            value={linkCardDrafts[card.id]?.title ?? ""}
                            onChange={(e) =>
                              setLinkCardDrafts((drafts) => ({
                                ...drafts,
                                [card.id]: { ...drafts[card.id], title: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            value={linkCardDrafts[card.id]?.description ?? ""}
                            onChange={(e) =>
                              setLinkCardDrafts((drafts) => ({
                                ...drafts,
                                [card.id]: { ...drafts[card.id], description: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="url"
                            value={linkCardDrafts[card.id]?.url ?? ""}
                            onChange={(e) =>
                              setLinkCardDrafts((drafts) => ({
                                ...drafts,
                                [card.id]: { ...drafts[card.id], url: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={linkCardDrafts[card.id]?.folderId ?? NO_FOLDER}
                            onValueChange={(value) =>
                              value &&
                              setLinkCardDrafts((drafts) => ({
                                ...drafts,
                                [card.id]: { ...drafts[card.id], folderId: value },
                              }))
                            }
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue>
                                {(value: string) =>
                                  value === NO_FOLDER
                                    ? "未分類"
                                    : (folders?.find((f) => String(f.id) === value)?.name ?? "未分類")
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_FOLDER}>未分類</SelectItem>
                              {(folders ?? []).map((folder) => (
                                <SelectItem key={folder.id} value={String(folder.id)}>
                                  {folder.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setLinkCardDrafts((drafts) => ({
                                ...drafts,
                                [card.id]: { ...drafts[card.id], isPublic: !drafts[card.id]?.isPublic },
                              }))
                            }
                          >
                            {linkCardDrafts[card.id]?.isPublic ? "公開" : "私密"}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleSaveLinkCard(card)}>
                              儲存
                            </Button>
                            <Button variant="destructive-outline" size="sm" onClick={() => handleDeleteLinkCard(card)}>
                              刪除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="highlights" className="flex flex-col gap-6 pt-4">
          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <SectionTitle>新增首頁特色</SectionTitle>
              <p className="text-sm text-muted-foreground">
                首頁特色會顯示在首頁歡迎區塊下方，用來介紹站台的主要功能。數字越小越前面，版面會依張數自動調整。
              </p>
              <form className="flex flex-wrap items-end gap-4" onSubmit={handleCreateHighlight}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-highlight-icon">圖示</Label>
                  <Select value={newHighlightIcon} onValueChange={(value) => value && setNewHighlightIcon(value)}>
                    <SelectTrigger id="new-highlight-icon" className="w-40">
                      <SelectValue>
                        {(value: string) => {
                          const Icon = highlightIcon(value);
                          return (
                            <>
                              <Icon className="size-4" />
                              {highlightIconLabel(value)}
                            </>
                          );
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {HIGHLIGHT_ICON_OPTIONS.map(({ key, label, Icon }) => (
                        <SelectItem key={key} value={key}>
                          <Icon className="size-4" />
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-highlight-title">標題</Label>
                  <Input
                    id="new-highlight-title"
                    type="text"
                    value={newHighlightTitle}
                    onChange={(e) => setNewHighlightTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-highlight-description">說明</Label>
                  <Input
                    id="new-highlight-description"
                    type="text"
                    value={newHighlightDescription}
                    onChange={(e) => setNewHighlightDescription(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-highlight-sort-order">排序</Label>
                  <Input
                    id="new-highlight-sort-order"
                    type="number"
                    className="w-24"
                    placeholder="0"
                    value={newHighlightSortOrder}
                    onChange={(e) => setNewHighlightSortOrder(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isCreatingHighlight}>
                  {isCreatingHighlight ? "建立中…" : "新增"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <SectionTitle>首頁特色列表</SectionTitle>
              <Callout>{highlightsError}</Callout>
              {highlights === null && !highlightsError && <TableSkeleton />}
              {highlights !== null && highlights.length === 0 && (
                <EmptyState icon={Sparkles} title="目前沒有首頁特色" />
              )}
              {highlights !== null && highlights.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>圖示</TableHead>
                      <TableHead>標題</TableHead>
                      <TableHead>說明</TableHead>
                      <TableHead>排序</TableHead>
                      <TableHead>顯示</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {highlights.map((highlight) => (
                      <TableRow key={highlight.id}>
                        <TableCell>
                          <Select
                            value={highlightDrafts[highlight.id]?.icon ?? DEFAULT_HIGHLIGHT_ICON}
                            onValueChange={(value) =>
                              value &&
                              setHighlightDrafts((drafts) => ({
                                ...drafts,
                                [highlight.id]: { ...drafts[highlight.id], icon: value },
                              }))
                            }
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue>
                                {(value: string) => {
                                  const Icon = highlightIcon(value);
                                  return (
                                    <>
                                      <Icon className="size-4" />
                                      {highlightIconLabel(value)}
                                    </>
                                  );
                                }}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {HIGHLIGHT_ICON_OPTIONS.map(({ key, label, Icon }) => (
                                <SelectItem key={key} value={key}>
                                  <Icon className="size-4" />
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            value={highlightDrafts[highlight.id]?.title ?? ""}
                            onChange={(e) =>
                              setHighlightDrafts((drafts) => ({
                                ...drafts,
                                [highlight.id]: { ...drafts[highlight.id], title: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            value={highlightDrafts[highlight.id]?.description ?? ""}
                            onChange={(e) =>
                              setHighlightDrafts((drafts) => ({
                                ...drafts,
                                [highlight.id]: { ...drafts[highlight.id], description: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-20"
                            value={highlightDrafts[highlight.id]?.sortOrder ?? ""}
                            onChange={(e) =>
                              setHighlightDrafts((drafts) => ({
                                ...drafts,
                                [highlight.id]: { ...drafts[highlight.id], sortOrder: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setHighlightDrafts((drafts) => ({
                                ...drafts,
                                [highlight.id]: { ...drafts[highlight.id], isPublic: !drafts[highlight.id]?.isPublic },
                              }))
                            }
                          >
                            {highlightDrafts[highlight.id]?.isPublic ? "公開" : "私密"}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleSaveHighlight(highlight)}>
                              儲存
                            </Button>
                            <Button variant="destructive-outline" size="sm" onClick={() => handleDeleteHighlight(highlight)}>
                              刪除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="pt-4">
          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <SectionTitle>所有檔案</SectionTitle>
                <Input
                  type="search"
                  placeholder="依檔名搜尋…"
                  className="w-56"
                  value={fileFilter}
                  onChange={(e) => setFileFilter(e.target.value)}
                  aria-label="依檔名搜尋檔案"
                />
              </div>
              <Callout>{filesError}</Callout>
              {fileGroups === null && !filesError && <TableSkeleton />}
              {filteredFiles !== null && filteredFiles.length === 0 && (
                <EmptyState icon={FileText} title={totalFiles !== null && totalFiles > 0 ? "沒有符合條件的檔案" : "目前沒有檔案"} />
              )}
              {filteredFiles !== null && filteredFiles.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>檔名</TableHead>
                      <TableHead>顯示名稱</TableHead>
                      <TableHead>卡片</TableHead>
                      <TableHead>公告日期</TableHead>
                      <TableHead>擁有者 ID</TableHead>
                      <TableHead>可見度</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiles.map(({ file, folderName }) => (
                      <TableRow key={file.id}>
                        <TableCell>{file.filename}</TableCell>
                        <TableCell>{file.display_name ?? "—"}</TableCell>
                        <TableCell>{folderName}</TableCell>
                        <TableCell className="whitespace-nowrap">{file.announced_at ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{file.owner_id}</TableCell>
                        <TableCell>
                          <Badge variant={file.is_public ? "success" : "secondary"}>
                            {file.is_public ? "公開" : "私密"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="destructive-outline" size="sm" onClick={() => handleDeleteFile(file)}>
                            刪除
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit-logs" className="pt-4">
          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <SectionTitle>操作紀錄</SectionTitle>
                <Select value={auditActionFilter} onValueChange={(value) => value && setAuditActionFilter(value)}>
                  <SelectTrigger className="w-48" aria-label="依動作類型篩選">
                    <SelectValue>{(value: string) => (value === ALL_ACTIONS ? "全部動作" : value)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_ACTIONS}>全部動作</SelectItem>
                    {auditActions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">高權限操作的稽核紀錄，僅顯示最近 {AUDIT_LOG_LIMIT} 筆。</p>
              <Callout>{auditLogsError}</Callout>
              {auditLogs === null && !auditLogsError && <TableSkeleton />}
              {filteredAuditLogs !== null && filteredAuditLogs.length === 0 && (
                <EmptyState icon={ScrollText} title={auditLogs !== null && auditLogs.length > 0 ? "沒有符合條件的操作紀錄" : "目前沒有操作紀錄"} />
              )}
              {filteredAuditLogs !== null && filteredAuditLogs.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>時間</TableHead>
                      <TableHead>操作者</TableHead>
                      <TableHead>動作</TableHead>
                      <TableHead>對象</TableHead>
                      <TableHead>詳情</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">{formatDateTime(log.created_at)}</TableCell>
                        <TableCell className="whitespace-nowrap">{log.actor_username}</TableCell>
                        <TableCell className="whitespace-nowrap">{log.action}</TableCell>
                        <TableCell>{log.target ?? "—"}</TableCell>
                        <TableCell>{log.detail ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="site-settings" className="pt-4">
          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <SectionTitle>站台設定</SectionTitle>
              <p className="text-sm text-muted-foreground">
                自訂導覽列／瀏覽器分頁顯示的站台名稱，以及首頁歡迎卡片的主標題與副標說明文字。欄位留空時使用預設文案。
              </p>
              <form className="flex max-w-lg flex-col gap-4" onSubmit={handleSaveSiteSettings}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="site-brand-name">站台名稱（導覽列）</Label>
                  <Input
                    id="site-brand-name"
                    type="text"
                    value={siteSettingsDraft.brandName}
                    onChange={(e) => setSiteSettingsDraft((draft) => ({ ...draft, brandName: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="site-browser-title">瀏覽器分頁標題</Label>
                  <Input
                    id="site-browser-title"
                    type="text"
                    value={siteSettingsDraft.browserTitle}
                    onChange={(e) => setSiteSettingsDraft((draft) => ({ ...draft, browserTitle: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="site-hero-title">首頁主標題</Label>
                  <Input
                    id="site-hero-title"
                    type="text"
                    value={siteSettingsDraft.heroTitle}
                    onChange={(e) => setSiteSettingsDraft((draft) => ({ ...draft, heroTitle: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="site-hero-subtitle">首頁副標說明</Label>
                  <Input
                    id="site-hero-subtitle"
                    type="text"
                    value={siteSettingsDraft.heroSubtitle}
                    onChange={(e) => setSiteSettingsDraft((draft) => ({ ...draft, heroSubtitle: e.target.value }))}
                  />
                </div>
                <Button type="submit" className="self-start" disabled={isSavingSiteSettings}>
                  {isSavingSiteSettings ? "儲存中…" : "儲存"}
                </Button>
              </form>

              <div className="flex flex-col gap-6 border-t border-border pt-6">
                <div>
                  <SectionTitle as="h3" size="sm">站台圖片</SectionTitle>
                  <p className="text-sm text-muted-foreground">
                    支援 SVG / PNG / JPG / GIF / WebP / ICO。選擇檔案後會立即上傳並套用，未設定時使用內建預設圖示。
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="site-favicon">網站圖示（瀏覽器分頁 favicon，上限 512 KB）</Label>
                  <div className="flex flex-wrap items-center gap-3">
                    {siteSettings.faviconUrl ? (
                      <span className="flex h-16 items-center justify-center rounded-lg border border-border bg-muted/40 px-4">
                        <img
                          src={siteSettings.faviconUrl}
                          alt="目前的網站圖示"
                          className="size-8 rounded-md object-contain"
                        />
                      </span>
                    ) : (
                      <span className="flex h-16 items-center rounded-lg border border-dashed border-border bg-muted/30 px-4 text-sm text-muted-foreground">
                        尚未設定
                      </span>
                    )}
                    <Input
                      id="site-favicon"
                      type="file"
                      accept=".svg,.png,.jpg,.jpeg,.gif,.webp,.ico"
                      className="max-w-xs"
                      disabled={brandingImageBusy !== null}
                      onChange={(e) => handleBrandingImageChange("favicon", e)}
                    />
                    {siteSettings.faviconUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={brandingImageBusy !== null}
                        onClick={() => handleRemoveBrandingImage("favicon")}
                      >
                        移除
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="site-hero-image">首頁歡迎圖片（顯示於主標題上方，上限 2 MB）</Label>
                  <div className="flex flex-wrap items-center gap-3">
                    {siteSettings.heroImageUrl ? (
                      <span className="flex h-16 items-center justify-center rounded-lg border border-border bg-muted/40 px-3">
                        <img
                          src={siteSettings.heroImageUrl}
                          alt="目前的首頁歡迎圖片"
                          className="h-12 w-auto max-w-[160px] object-contain"
                        />
                      </span>
                    ) : (
                      <span className="flex h-16 items-center rounded-lg border border-dashed border-border bg-muted/30 px-4 text-sm text-muted-foreground">
                        尚未設定
                      </span>
                    )}
                    <Input
                      id="site-hero-image"
                      type="file"
                      accept=".svg,.png,.jpg,.jpeg,.gif,.webp,.ico"
                      className="max-w-xs"
                      disabled={brandingImageBusy !== null}
                      onChange={(e) => handleBrandingImageChange("heroImage", e)}
                    />
                    {siteSettings.heroImageUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={brandingImageBusy !== null}
                        onClick={() => handleRemoveBrandingImage("heroImage")}
                      >
                        移除
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ldap-settings" className="pt-4">
          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <SectionTitle>LDAP 設定</SectionTitle>
              <p className="text-sm text-muted-foreground">
                設定後，使用者可用 LDAP 帳號密碼登入（本機帳號優先，找不到本機帳號時才會嘗試 LDAP 驗證）。
                密碼欄位留空表示不變更目前已儲存的密碼。
              </p>
              <Callout>{ldapSettingsError}</Callout>
              <form className="flex max-w-lg flex-col gap-4" onSubmit={handleSaveLdapSettings}>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ldap-enabled"
                    checked={ldapDraft.enabled}
                    onCheckedChange={(checked) =>
                      setLdapDraft((draft) => ({ ...draft, enabled: checked === true }))
                    }
                  />
                  <Label htmlFor="ldap-enabled">啟用 LDAP 登入</Label>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ldap-server-uri">伺服器位址</Label>
                  <Input
                    id="ldap-server-uri"
                    type="text"
                    placeholder="ldap://ldap.example.internal"
                    value={ldapDraft.serverUri}
                    onChange={(e) => setLdapDraft((draft) => ({ ...draft, serverUri: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ldap-bind-dn">服務帳號 DN</Label>
                  <Input
                    id="ldap-bind-dn"
                    type="text"
                    placeholder="cn=service-account,dc=example,dc=internal"
                    value={ldapDraft.bindDn}
                    onChange={(e) => setLdapDraft((draft) => ({ ...draft, bindDn: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ldap-bind-password">服務帳號密碼</Label>
                  <Input
                    id="ldap-bind-password"
                    type="password"
                    placeholder={ldapSettings?.bind_password_set ? "已設定，留空表示不變更" : "尚未設定"}
                    value={ldapDraft.bindPassword}
                    onChange={(e) => setLdapDraft((draft) => ({ ...draft, bindPassword: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ldap-base-dn">搜尋起始 DN</Label>
                  <Input
                    id="ldap-base-dn"
                    type="text"
                    placeholder="ou=people,dc=example,dc=internal"
                    value={ldapDraft.baseDn}
                    onChange={(e) => setLdapDraft((draft) => ({ ...draft, baseDn: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ldap-user-search-filter">使用者搜尋條件</Label>
                  <Input
                    id="ldap-user-search-filter"
                    type="text"
                    placeholder="(uid={username})"
                    value={ldapDraft.userSearchFilter}
                    onChange={(e) => setLdapDraft((draft) => ({ ...draft, userSearchFilter: e.target.value }))}
                  />
                </div>
                <Button type="submit" className="self-start" disabled={isSavingLdapSettings}>
                  {isSavingLdapSettings ? "儲存中…" : "儲存"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="smtp-settings" className="pt-4">
          <Card>
            <CardContent className="flex flex-col gap-4 text-left">
              <SectionTitle>Email SMTP 設定</SectionTitle>
              <p className="text-sm text-muted-foreground">
                設定後，系統會透過此 SMTP 伺服器寄送重設密碼信件與上傳通知信；未啟用或未設定時，信件內容僅會寫入後端日誌。
                密碼欄位留空表示不變更目前已儲存的密碼。
              </p>
              <Callout>{smtpSettingsError}</Callout>
              <form className="flex max-w-lg flex-col gap-4" onSubmit={handleSaveSmtpSettings}>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="smtp-enabled"
                    checked={smtpDraft.enabled}
                    onCheckedChange={(checked) =>
                      setSmtpDraft((draft) => ({ ...draft, enabled: checked === true }))
                    }
                  />
                  <Label htmlFor="smtp-enabled">啟用 SMTP 寄信</Label>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="smtp-host">伺服器位址</Label>
                  <Input
                    id="smtp-host"
                    type="text"
                    placeholder="smtp.example.com"
                    value={smtpDraft.host}
                    onChange={(e) => setSmtpDraft((draft) => ({ ...draft, host: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="smtp-port">連接埠</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    placeholder="587"
                    value={smtpDraft.port}
                    onChange={(e) => setSmtpDraft((draft) => ({ ...draft, port: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="smtp-username">帳號</Label>
                  <Input
                    id="smtp-username"
                    type="text"
                    value={smtpDraft.username}
                    onChange={(e) => setSmtpDraft((draft) => ({ ...draft, username: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="smtp-password">密碼</Label>
                  <Input
                    id="smtp-password"
                    type="password"
                    placeholder={smtpSettings?.password_set ? "已設定，留空表示不變更" : "尚未設定"}
                    value={smtpDraft.password}
                    onChange={(e) => setSmtpDraft((draft) => ({ ...draft, password: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="smtp-from-address">寄件人地址</Label>
                  <Input
                    id="smtp-from-address"
                    type="text"
                    placeholder="noreply@example.com"
                    value={smtpDraft.fromAddress}
                    onChange={(e) => setSmtpDraft((draft) => ({ ...draft, fromAddress: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="smtp-use-tls"
                    checked={smtpDraft.useTls}
                    onCheckedChange={(checked) =>
                      setSmtpDraft((draft) => ({ ...draft, useTls: checked === true }))
                    }
                  />
                  <Label htmlFor="smtp-use-tls">使用 TLS</Label>
                </div>
                <Button type="submit" className="self-start" disabled={isSavingSmtpSettings}>
                  {isSavingSmtpSettings ? "儲存中…" : "儲存"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminPage;
