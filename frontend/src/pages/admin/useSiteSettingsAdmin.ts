import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { ApiError } from "../../api/client";
import {
  deleteFavicon,
  deleteHeroImage,
  updateSiteSettings,
  uploadFavicon,
  uploadHeroImage,
} from "../../api/site-settings";
import { useSiteSettings } from "../../context/SiteSettingsContext";

// Mirrors MAX_UPLOAD_SIZE_MB_CEILING in backend/app/core/upload_limit.py - the two move
// together. No reverse proxy caps the request body any more, so those are the only two.
export const MAX_UPLOAD_SIZE_MB_CEILING = 512;

export type BrandingImageKind = "favicon" | "heroImage";

export const BRANDING_IMAGE_LABELS: Record<BrandingImageKind, string> = {
  favicon: "網站圖示",
  heroImage: "首頁歡迎圖片",
};

/** State and actions behind the 站台設定 tab. */
export function useSiteSettingsAdmin() {
  const siteSettings = useSiteSettings();

  const [siteSettingsDraft, setSiteSettingsDraft] = useState({
    brandName: siteSettings.brandName,
    browserTitle: siteSettings.browserTitle,
    heroTitle: siteSettings.heroTitle,
    heroSubtitle: siteSettings.heroSubtitle,
    maxUploadSizeMb: String(siteSettings.maxUploadSizeMb),
  });
  const [isSavingSiteSettings, setIsSavingSiteSettings] = useState(false);
  const [brandingImageBusy, setBrandingImageBusy] = useState<BrandingImageKind | null>(null);

  useEffect(() => {
    setSiteSettingsDraft({
      brandName: siteSettings.brandName,
      browserTitle: siteSettings.browserTitle,
      heroTitle: siteSettings.heroTitle,
      heroSubtitle: siteSettings.heroSubtitle,
      maxUploadSizeMb: String(siteSettings.maxUploadSizeMb),
    });
  }, [
    siteSettings.brandName,
    siteSettings.browserTitle,
    siteSettings.heroTitle,
    siteSettings.heroSubtitle,
    siteSettings.maxUploadSizeMb,
  ]);

  async function handleSaveSiteSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Checked here as well as server-side: the backend rejects out-of-range values with a
    // 422 whose detail is a validation-error list, which wouldn't render as a readable message.
    const maxUploadSizeMb = Number(siteSettingsDraft.maxUploadSizeMb);
    if (!Number.isInteger(maxUploadSizeMb) || maxUploadSizeMb < 1 || maxUploadSizeMb > MAX_UPLOAD_SIZE_MB_CEILING) {
      toast.error(`上傳大小上限須為 1 到 ${MAX_UPLOAD_SIZE_MB_CEILING} 之間的整數（MB）`);
      return;
    }

    setIsSavingSiteSettings(true);
    try {
      await updateSiteSettings({
        brand_name: siteSettingsDraft.brandName.trim() || null,
        browser_title: siteSettingsDraft.browserTitle.trim() || null,
        hero_title: siteSettingsDraft.heroTitle.trim() || null,
        hero_subtitle: siteSettingsDraft.heroSubtitle.trim() || null,
        max_upload_size_mb: maxUploadSizeMb,
      });
      await siteSettings.refresh();
      toast.success("已更新站台設定");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "更新站台設定失敗";
      toast.error(message);
    } finally {
      setIsSavingSiteSettings(false);
    }
  }

  // Branding images upload as soon as a file is picked rather than waiting for the text
  // form's submit - there is no draft state to reconcile, just a file that replaces the old one.
  async function handleBrandingImageChange(kind: BrandingImageKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset the input so re-picking the same file after a failed upload still fires onChange.
    event.target.value = "";
    if (!file) {
      return;
    }

    setBrandingImageBusy(kind);
    try {
      await (kind === "favicon" ? uploadFavicon(file) : uploadHeroImage(file));
      await siteSettings.refresh();
      toast.success(`已更新${BRANDING_IMAGE_LABELS[kind]}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `更新${BRANDING_IMAGE_LABELS[kind]}失敗`);
    } finally {
      setBrandingImageBusy(null);
    }
  }

  async function handleRemoveBrandingImage(kind: BrandingImageKind) {
    setBrandingImageBusy(kind);
    try {
      await (kind === "favicon" ? deleteFavicon() : deleteHeroImage());
      await siteSettings.refresh();
      toast.success(`已移除${BRANDING_IMAGE_LABELS[kind]}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `移除${BRANDING_IMAGE_LABELS[kind]}失敗`);
    } finally {
      setBrandingImageBusy(null);
    }
  }

  return {
    siteSettingsDraft,
    setSiteSettingsDraft,
    isSavingSiteSettings,
    brandingImageBusy,
    handleSaveSiteSettings,
    handleBrandingImageChange,
    handleRemoveBrandingImage,
  };
}
