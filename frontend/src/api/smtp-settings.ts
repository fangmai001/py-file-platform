import { getJSON, patchJSON } from "./client";

export interface SmtpSettings {
  enabled: boolean;
  host: string | null;
  port: number;
  username: string | null;
  // The password itself is never returned by the API, only whether one is set.
  password_set: boolean;
  from_address: string;
  use_tls: boolean;
}

export interface UpdateSmtpSettingsInput {
  enabled?: boolean;
  host?: string | null;
  port?: number;
  username?: string | null;
  // Omit entirely to keep the currently stored password unchanged.
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
