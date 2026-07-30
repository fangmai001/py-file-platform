import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSiteSettings, siteAssetUrl } from "../api/site-settings";

const DEFAULT_BRAND_NAME = "py-file-platform";
const DEFAULT_BROWSER_TITLE = "py-file-platform";
const DEFAULT_HERO_TITLE = "公開檔案牆";
const DEFAULT_HERO_SUBTITLE =
  "瀏覽並下載社團 / 團隊公開的檔案，不需登入即可查看；上傳與管理檔案才需要登入帳號。";
// Falls back to the icon bundled in frontend/public when no favicon has been uploaded.
const DEFAULT_FAVICON_HREF = "/favicon.svg";
// Only used until the real, admin-configured limit arrives; mirrors the MAX_UPLOAD_SIZE_MB default.
const DEFAULT_MAX_UPLOAD_SIZE_MB = 50;

interface SiteSettingsContextValue {
  brandName: string;
  browserTitle: string;
  heroTitle: string;
  heroSubtitle: string;
  faviconUrl: string | null;
  heroImageUrl: string | null;
  maxUploadSizeMb: number;
  refresh: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [brandName, setBrandName] = useState(DEFAULT_BRAND_NAME);
  const [browserTitle, setBrowserTitle] = useState(DEFAULT_BROWSER_TITLE);
  const [heroTitle, setHeroTitle] = useState(DEFAULT_HERO_TITLE);
  const [heroSubtitle, setHeroSubtitle] = useState(DEFAULT_HERO_SUBTITLE);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState(DEFAULT_MAX_UPLOAD_SIZE_MB);

  async function refresh() {
    try {
      const settings = await getSiteSettings();
      setBrandName(settings.brand_name || DEFAULT_BRAND_NAME);
      setBrowserTitle(settings.browser_title || DEFAULT_BROWSER_TITLE);
      setHeroTitle(settings.hero_title || DEFAULT_HERO_TITLE);
      setHeroSubtitle(settings.hero_subtitle || DEFAULT_HERO_SUBTITLE);
      setFaviconUrl(siteAssetUrl(settings.favicon_url));
      setHeroImageUrl(siteAssetUrl(settings.hero_image_url));
      setMaxUploadSizeMb(settings.max_upload_size_mb || DEFAULT_MAX_UPLOAD_SIZE_MB);
    } catch {
      // keep the fallback defaults if the request fails
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    document.title = browserTitle;
  }, [browserTitle]);

  // Same imperative approach as the title above: index.html ships a static <link rel="icon">
  // and we repoint it once the admin-configured favicon has loaded.
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) {
      link.href = faviconUrl ?? DEFAULT_FAVICON_HREF;
    }
  }, [faviconUrl]);

  return (
    <SiteSettingsContext.Provider
      value={{
        brandName,
        browserTitle,
        heroTitle,
        heroSubtitle,
        faviconUrl,
        heroImageUrl,
        maxUploadSizeMb,
        refresh,
      }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): SiteSettingsContextValue {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) {
    throw new Error("useSiteSettings must be used within a SiteSettingsProvider");
  }
  return ctx;
}
