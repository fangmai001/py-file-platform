import { getJSON, patchJSON } from "./client";

export interface SmtpSettings {
  enabled: boolean;
  host: string | null;
  port: number;
  username: string | null;
  // API 永遠不會回傳密碼本身，只會回傳是否已設定。
  password_set: boolean;
  from_address: string;
  use_tls: boolean;
}

export interface UpdateSmtpSettingsInput {
  enabled?: boolean;
  host?: string | null;
  port?: number;
  username?: string | null;
  // 完全省略這個欄位，就代表沿用目前存著的密碼、不做更動。
  password?: string;
  from_address?: string;
  use_tls?: boolean;
}

export function getSmtpSettings(): Promise<SmtpSettings> {
  return getJSON<SmtpSettings>("/smtp-settings");
}

export function updateSmtpSettings(input: UpdateSmtpSettingsInput): Promise<SmtpSettings> {
  return patchJSON<SmtpSettings>("/smtp-settings", input);
}
