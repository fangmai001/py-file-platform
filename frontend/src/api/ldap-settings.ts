import { getJSON, patchJSON } from "./client";

export interface LdapSettings {
  enabled: boolean;
  server_uri: string | null;
  bind_dn: string | null;
  // API 永遠不會回傳 bind 密碼本身，只會回傳是否已設定。
  bind_password_set: boolean;
  base_dn: string | null;
  user_search_filter: string;
}

export interface UpdateLdapSettingsInput {
  enabled?: boolean;
  server_uri?: string | null;
  bind_dn?: string | null;
  // 完全省略這個欄位，就代表沿用目前存著的密碼、不做更動。
  bind_password?: string;
  base_dn?: string | null;
  user_search_filter?: string;
}

export function getLdapSettings(): Promise<LdapSettings> {
  return getJSON<LdapSettings>("/ldap-settings");
}

export function updateLdapSettings(input: UpdateLdapSettingsInput): Promise<LdapSettings> {
  return patchJSON<LdapSettings>("/ldap-settings", input);
}
