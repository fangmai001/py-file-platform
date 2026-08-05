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

// 對應 backend/app/core/upload_limit.py 中的 MAX_UPLOAD_SIZE_MB_CEILING——兩者必須一起修改。
// 現在已經沒有反向代理會限制 request body，所以這兩處就是唯一的上限來源。
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

    // 前端與伺服器端都檢查。422 現在已經看得懂了（client.ts 會把 detail 陣列攤平成中文，
    // 見 lib/validation-errors.ts），留著這道預檢是為了在送出前就給回饋，並且能講出這個
    // 欄位真正的上下限——那是後端的泛用訊息說不出來的。
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

  // 品牌圖片是一選好檔案就立刻上傳，而不是等文字表單送出——這裡沒有草稿狀態要協調，
  // 只有一個直接取代舊圖的檔案。
  async function handleBrandingImageChange(kind: BrandingImageKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 重設 input，這樣上傳失敗後重新挑選同一個檔案時仍會觸發 onChange。
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
