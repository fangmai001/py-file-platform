import { getJSON, patchJSON } from "./client";

export interface LdapSettings {
  enabled: boolean;
  server_uri: string | null;
  bind_dn: string | null;
  // The bind password itself is never returned by the API, only whether one is set.
  bind_password_set: boolean;
  base_dn: string | null;
  user_search_filter: string;
}

export interface UpdateLdapSettingsInput {
  enabled?: boolean;
  server_uri?: string | null;
  bind_dn?: string | null;
  // Omit entirely to keep the currently stored password unchanged.
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
