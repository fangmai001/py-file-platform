from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.core.upload_limit import MAX_UPLOAD_SIZE_MB_CEILING

BRANDING_ASSET_URL_PREFIX = "/api/site-settings/assets"


class SiteSettingUpdate(BaseModel):
    brand_name: str | None = None
    browser_title: str | None = None
    hero_title: str | None = None
    hero_subtitle: str | None = None
    max_upload_size_mb: int | None = Field(default=None, ge=1, le=MAX_UPLOAD_SIZE_MB_CEILING)


class SiteSettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    brand_name: str | None
    browser_title: str | None
    hero_title: str | None
    hero_subtitle: str | None
    # 實務上永遠不會是 null：讀取都會經過 _get_or_create_settings，它會把值補上。
    max_upload_size_mb: int

    # 客戶端只會看到 URL，原始檔名一律留在伺服器端。每次上傳都會拿到全新的 uuid 檔名，
    # 因此 URL 也跟著改變，瀏覽器不需要任何額外的 cache-busting 參數就會抓到新的檔案。
    favicon_filename: str | None = Field(exclude=True)
    hero_image_filename: str | None = Field(exclude=True)

    @computed_field
    @property
    def favicon_url(self) -> str | None:
        if not self.favicon_filename:
            return None
        return f"{BRANDING_ASSET_URL_PREFIX}/{self.favicon_filename}"

    @computed_field
    @property
    def hero_image_url(self) -> str | None:
        if not self.hero_image_filename:
            return None
        return f"{BRANDING_ASSET_URL_PREFIX}/{self.hero_image_filename}"
