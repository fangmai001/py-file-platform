import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ApiError } from "../../api/client";
import { getLdapSettings, updateLdapSettings } from "../../api/ldap-settings";
import type { LdapSettings } from "../../api/ldap-settings";

export interface LdapDraft {
  enabled: boolean;
  serverUri: string;
  bindDn: string;
  bindPassword: string;
  baseDn: string;
  userSearchFilter: string;
}

/**
 * 判斷草稿是否與伺服器上的資料不同。正規化方式與 handleSaveLdapSettings 的 payload 完全一致，
 * 因此「儲存」按鈕絕不會為了一次什麼都不會送出的編輯而啟用——而這裡的每一次 PATCH 都會寫進
 * 稽核紀錄，讓誤點產生一筆假的變更紀錄。
 */
export function isLdapDirty(settings: LdapSettings | null, draft: LdapDraft): boolean {
  if (settings === null) {
    return false;
  }
  return (
    draft.enabled !== settings.enabled ||
    (draft.serverUri.trim() || null) !== (settings.server_uri ?? null) ||
    (draft.bindDn.trim() || null) !== (settings.bind_dn ?? null) ||
    (draft.baseDn.trim() || null) !== (settings.base_dn ?? null) ||
    (draft.userSearchFilter.trim() || settings.user_search_filter) !== settings.user_search_filter ||
    // 密碼欄留白代表「不變更」，只有真的輸入了東西才算異動。
    draft.bindPassword.trim() !== ""
  );
}

/** State and actions behind the LDAP 設定 tab. */
export function useLdapSettingsAdmin({ reloadAuditLogs }: { reloadAuditLogs: () => Promise<void> }) {
  const [ldapSettings, setLdapSettings] = useState<LdapSettings | null>(null);
  const [ldapSettingsError, setLdapSettingsError] = useState<string | null>(null);
  const [ldapDraft, setLdapDraft] = useState<LdapDraft>({
    enabled: false,
    serverUri: "",
    bindDn: "",
    bindPassword: "",
    baseDn: "",
    userSearchFilter: "",
  });
  const [isSavingLdapSettings, setIsSavingLdapSettings] = useState(false);

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

  useEffect(() => {
    loadLdapSettings();
  }, []);

  async function handleSaveLdapSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingLdapSettings(true);
    try {
      await updateLdapSettings({
        enabled: ldapDraft.enabled,
        server_uri: ldapDraft.serverUri.trim() || null,
        bind_dn: ldapDraft.bindDn.trim() || null,
        // 留白時完全省略這個欄位，好沿用目前存著的密碼。
        ...(ldapDraft.bindPassword.trim() ? { bind_password: ldapDraft.bindPassword.trim() } : {}),
        base_dn: ldapDraft.baseDn.trim() || null,
        user_search_filter: ldapDraft.userSearchFilter.trim() || undefined,
      });
      await loadLdapSettings();
      await reloadAuditLogs();
      toast.success("已更新 LDAP 設定");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新 LDAP 設定失敗";
      setLdapSettingsError(message);
      toast.error(message);
    } finally {
      setIsSavingLdapSettings(false);
    }
  }

  return {
    ldapSettings,
    isLdapDirty: isLdapDirty(ldapSettings, ldapDraft),
    ldapSettingsError,
    ldapDraft,
    setLdapDraft,
    isSavingLdapSettings,
    handleSaveLdapSettings,
  };
}
