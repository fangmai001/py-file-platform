import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ApiError } from "../../api/client";
import { getSmtpSettings, updateSmtpSettings } from "../../api/smtp-settings";
import type { SmtpSettings } from "../../api/smtp-settings";

/** State and actions behind the Email SMTP 設定 tab. */
export function useSmtpSettingsAdmin({ reloadAuditLogs }: { reloadAuditLogs: () => Promise<void> }) {
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
        // Omitted entirely when blank so the currently stored password is kept.
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
    smtpSettingsError,
    smtpDraft,
    setSmtpDraft,
    isSavingSmtpSettings,
    handleSaveSmtpSettings,
  };
}
