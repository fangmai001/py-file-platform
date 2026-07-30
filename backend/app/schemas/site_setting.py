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
    # Never null in practice: reads go through _get_or_create_settings, which backfills it.
    max_upload_size_mb: int

    # Clients only ever see the URLs; the raw filenames stay server-side. Each upload gets a
    # fresh uuid filename, so the URL changes too and browsers pick the new asset up without
    # any extra cache-busting parameter.
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
