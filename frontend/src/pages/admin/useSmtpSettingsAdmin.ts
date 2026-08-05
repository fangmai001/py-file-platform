import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ApiError } from "../../api/client";
import { getSmtpSettings, updateSmtpSettings } from "../../api/smtp-settings";
import type { SmtpSettings } from "../../api/smtp-settings";

export interface SmtpDraft {
  enabled: boolean;
  host: string;
  port: string;
  username: string;
  password: string;
  fromAddress: string;
  useTls: boolean;
}

/** 與 isLdapDirty 同一套理由：這裡的每一次 PATCH 都會寫進稽核紀錄。 */
export function isSmtpDirty(settings: SmtpSettings | null, draft: SmtpDraft): boolean {
  if (settings === null) {
    return false;
  }
  const port = Number.parseInt(draft.port, 10);
  return (
    draft.enabled !== settings.enabled ||
    (draft.host.trim() || null) !== (settings.host ?? null) ||
    (Number.isNaN(port) ? settings.port : port) !== settings.port ||
    (draft.username.trim() || null) !== (settings.username ?? null) ||
    (draft.fromAddress.trim() || settings.from_address) !== settings.from_address ||
    draft.useTls !== settings.use_tls ||
    draft.password.trim() !== ""
  );
}

/** State and actions behind the Email SMTP 設定 tab. */
export function useSmtpSettingsAdmin({ reloadAuditLogs }: { reloadAuditLogs: () => Promise<void> }) {
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings | null>(null);
  const [smtpSettingsError, setSmtpSettingsError] = useState<string | null>(null);
  const [smtpDraft, setSmtpDraft] = useState<SmtpDraft>({
    enabled: false,
    host: "",
    port: "587",
    username: "",
    password: "",
    fromAddress: "",
    useTls: true,
  });
  const [isSavingSmtpSettings, setIsSavingSmtpSettings] = useState(false);

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
    loadSmtpSettings();
  }, []);

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
        // 留白時完全省略這個欄位，好沿用目前存著的密碼。
        ...(smtpDraft.password.trim() ? { password: smtpDraft.password.trim() } : {}),
        from_address: smtpDraft.fromAddress.trim() || undefined,
        use_tls: smtpDraft.useTls,
      });
      await loadSmtpSettings();
      await reloadAuditLogs();
      toast.success("已更新 SMTP 設定");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新 SMTP 設定失敗";
      setSmtpSettingsError(message);
      toast.error(message);
    } finally {
      setIsSavingSmtpSettings(false);
    }
  }

  return {
    smtpSettings,
    isSmtpDirty: isSmtpDirty(smtpSettings, smtpDraft),
    smtpSettingsError,
    smtpDraft,
    setSmtpDraft,
    isSavingSmtpSettings,
    handleSaveSmtpSettings,
  };
}
