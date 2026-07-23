import { getJSON, patchJSON } from "./client";

export interface SiteSettings {
  brand_name: string | null;
  browser_title: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
}

export interface UpdateSiteSettingsInput {
  brand_name?: string | null;
  browser_title?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
}

export function getSiteSettings(): Promise<SiteSettings> {
  return getJSON<SiteSettings>("/site-settings");
}

export function updateSiteSettings(input: UpdateSiteSettingsInput): Promise<SiteSettings> {
  return patchJSON<SiteSettings>("/site-settings", input);
}
