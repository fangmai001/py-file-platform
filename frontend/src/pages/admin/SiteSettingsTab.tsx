import Callout from "../../components/Callout";
import SectionTitle from "../../components/SectionTitle";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { MAX_UPLOAD_SIZE_MB_CEILING, type useSiteSettingsAdmin } from "./useSiteSettingsAdmin";

function SiteSettingsTab(props: ReturnType<typeof useSiteSettingsAdmin>) {
  const {
    siteSettingsDraft,
    setSiteSettingsDraft,
    siteSettingsError,
    isSavingSiteSettings,
    isSiteSettingsDirty,
    brandingImageBusy,
    handleSaveSiteSettings,
    handleBrandingImageChange,
    handleRemoveBrandingImage,
  } = props;
  const siteSettings = useSiteSettings();

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 text-left">
        <SectionTitle>站台設定</SectionTitle>
        <Callout>{siteSettingsError}</Callout>
        <p className="text-sm text-muted-foreground">
          自訂導覽列／瀏覽器分頁顯示的站台名稱，以及首頁歡迎卡片的主標題與副標說明文字。欄位留空時使用預設文案。
        </p>
        <form className="flex max-w-lg flex-col gap-4" onSubmit={handleSaveSiteSettings}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="site-brand-name">站台名稱（導覽列）</Label>
            <Input
              id="site-brand-name"
              type="text"
              value={siteSettingsDraft.brandName}
              onChange={(e) => setSiteSettingsDraft((draft) => ({ ...draft, brandName: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="site-browser-title">瀏覽器分頁標題</Label>
            <Input
              id="site-browser-title"
              type="text"
              value={siteSettingsDraft.browserTitle}
              onChange={(e) => setSiteSettingsDraft((draft) => ({ ...draft, browserTitle: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="site-hero-title">首頁主標題</Label>
            <Input
              id="site-hero-title"
              type="text"
              value={siteSettingsDraft.heroTitle}
              onChange={(e) => setSiteSettingsDraft((draft) => ({ ...draft, heroTitle: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="site-hero-subtitle">首頁副標說明</Label>
            <Input
              id="site-hero-subtitle"
              type="text"
              value={siteSettingsDraft.heroSubtitle}
              onChange={(e) => setSiteSettingsDraft((draft) => ({ ...draft, heroSubtitle: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="site-max-upload-size">單檔上傳大小上限（MB）</Label>
            <Input
              id="site-max-upload-size"
              type="number"
              min={1}
              max={MAX_UPLOAD_SIZE_MB_CEILING}
              step={1}
              value={siteSettingsDraft.maxUploadSizeMb}
              onChange={(e) => setSiteSettingsDraft((draft) => ({ ...draft, maxUploadSizeMb: e.target.value }))}
            />
            <p className="text-sm text-muted-foreground">
              可設定 1 到 {MAX_UPLOAD_SIZE_MB_CEILING} MB。此上限即時生效，會套用在上傳頁的提示與後端檢查。
            </p>
          </div>
          <Button type="submit" className="self-start" disabled={isSavingSiteSettings || !isSiteSettingsDirty}>
            {isSavingSiteSettings ? "儲存中…" : "儲存"}
          </Button>
        </form>

        <div className="flex flex-col gap-6 border-t border-border pt-6">
          <div>
            <SectionTitle as="h3" size="sm">站台圖片</SectionTitle>
            <p className="text-sm text-muted-foreground">
              支援 SVG / PNG / JPG / GIF / WebP / ICO。選擇檔案後會立即上傳並套用，未設定時使用內建預設圖示。
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="site-favicon">網站圖示（瀏覽器分頁 favicon，上限 512 KB）</Label>
            <div className="flex flex-wrap items-center gap-3">
              {siteSettings.faviconUrl ? (
                <span className="flex h-16 items-center justify-center rounded-lg border border-border bg-muted/40 px-4">
                  <img
                    src={siteSettings.faviconUrl}
                    alt="目前的網站圖示"
                    className="size-8 rounded-md object-contain"
                  />
                </span>
              ) : (
                <span className="flex h-16 items-center rounded-lg border border-dashed border-border bg-muted/30 px-4 text-sm text-muted-foreground">
                  尚未設定
                </span>
              )}
              <Input
                id="site-favicon"
                type="file"
                accept=".svg,.png,.jpg,.jpeg,.gif,.webp,.ico"
                className="max-w-xs"
                disabled={brandingImageBusy !== null}
                onChange={(e) => handleBrandingImageChange("favicon", e)}
              />
              {siteSettings.faviconUrl && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={brandingImageBusy !== null}
                  onClick={() => handleRemoveBrandingImage("favicon")}
                >
                  移除
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="site-hero-image">首頁歡迎圖片（顯示於主標題上方，上限 2 MB）</Label>
            <div className="flex flex-wrap items-center gap-3">
              {siteSettings.heroImageUrl ? (
                <span className="flex h-16 items-center justify-center rounded-lg border border-border bg-muted/40 px-3">
                  <img
                    src={siteSettings.heroImageUrl}
                    alt="目前的首頁歡迎圖片"
                    className="h-12 w-auto max-w-[160px] object-contain"
                  />
                </span>
              ) : (
                <span className="flex h-16 items-center rounded-lg border border-dashed border-border bg-muted/30 px-4 text-sm text-muted-foreground">
                  尚未設定
                </span>
              )}
              <Input
                id="site-hero-image"
                type="file"
                accept=".svg,.png,.jpg,.jpeg,.gif,.webp,.ico"
                className="max-w-xs"
                disabled={brandingImageBusy !== null}
                onChange={(e) => handleBrandingImageChange("heroImage", e)}
              />
              {siteSettings.heroImageUrl && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={brandingImageBusy !== null}
                  onClick={() => handleRemoveBrandingImage("heroImage")}
                >
                  移除
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SiteSettingsTab;
