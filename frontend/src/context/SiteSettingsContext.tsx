import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSiteSettings } from "../api/site-settings";

const DEFAULT_BRAND_NAME = "py-file-platform";
const DEFAULT_BROWSER_TITLE = "py-file-platform";
const DEFAULT_HERO_TITLE = "公開檔案牆";
const DEFAULT_HERO_SUBTITLE =
  "瀏覽並下載社團 / 團隊公開的檔案，不需登入即可查看；上傳與管理檔案才需要登入帳號。";

interface SiteSettingsContextValue {
  brandName: string;
  browserTitle: string;
  heroTitle: string;
  heroSubtitle: string;
  refresh: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [brandName, setBrandName] = useState(DEFAULT_BRAND_NAME);
  const [browserTitle, setBrowserTitle] = useState(DEFAULT_BROWSER_TITLE);
  const [heroTitle, setHeroTitle] = useState(DEFAULT_HERO_TITLE);
  const [heroSubtitle, setHeroSubtitle] = useState(DEFAULT_HERO_SUBTITLE);

  async function refresh() {
    try {
      const settings = await getSiteSettings();
      setBrandName(settings.brand_name || DEFAULT_BRAND_NAME);
      setBrowserTitle(settings.browser_title || DEFAULT_BROWSER_TITLE);
      setHeroTitle(settings.hero_title || DEFAULT_HERO_TITLE);
      setHeroSubtitle(settings.hero_subtitle || DEFAULT_HERO_SUBTITLE);
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

  return (
    <SiteSettingsContext.Provider value={{ brandName, browserTitle, heroTitle, heroSubtitle, refresh }}>
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
