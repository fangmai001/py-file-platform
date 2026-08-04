import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ApiError } from "../../api/client";
import { getLdapSettings, updateLdapSettings } from "../../api/ldap-settings";
import type { LdapSettings } from "../../api/ldap-settings";

/** State and actions behind the LDAP 設定 tab. */
export function useLdapSettingsAdmin({ reloadAuditLogs }: { reloadAuditLogs: () => Promise<void> }) {
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
    ldapSettingsError,
    ldapDraft,
    setLdapDraft,
    isSavingLdapSettings,
    handleSaveLdapSettings,
  };
}
