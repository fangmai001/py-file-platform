import { assetUrl, del, getJSON, patchJSON, postForm } from "./client";

export interface SiteSettings {
  brand_name: string | null;
  browser_title: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  favicon_url: string | null;
  hero_image_url: string | null;
  max_upload_size_mb: number;
}

export interface UpdateSiteSettingsInput {
  brand_name?: string | null;
  browser_title?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  max_upload_size_mb?: number;
}

export function getSiteSettings(): Promise<SiteSettings> {
  return getJSON<SiteSettings>("/site-settings");
}

export function updateSiteSettings(input: UpdateSiteSettingsInput): Promise<SiteSettings> {
  return patchJSON<SiteSettings>("/site-settings", input);
}

// The API returns a relative path; callers render it, so hand back a browser-usable URL.
export function siteAssetUrl(path: string | null): string | null {
  return path ? assetUrl(path) : null;
}

function uploadBrandingImage(path: string, file: File): Promise<SiteSettings> {
  const form = new FormData();
  form.append("upload", file);
  return postForm<SiteSettings>(path, form);
}

export function uploadFavicon(file: File): Promise<SiteSettings> {
  return uploadBrandingImage("/site-settings/favicon", file);
}

export function uploadHeroImage(file: File): Promise<SiteSettings> {
  return uploadBrandingImage("/site-settings/hero-image", file);
}

export function deleteFavicon(): Promise<void> {
  return del("/site-settings/favicon");
}

export function deleteHeroImage(): Promise<void> {
  return del("/site-settings/hero-image");
}
