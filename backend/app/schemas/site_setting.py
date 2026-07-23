from pydantic import BaseModel, ConfigDict


class SiteSettingUpdate(BaseModel):
    brand_name: str | None = None
    browser_title: str | None = None
    hero_title: str | None = None
    hero_subtitle: str | None = None


class SiteSettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    brand_name: str | None
    browser_title: str | None
    hero_title: str | None
    hero_subtitle: str | None
