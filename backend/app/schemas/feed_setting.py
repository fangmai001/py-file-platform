from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.feed_schedule import MAX_FETCH_INTERVAL_MINUTES, MIN_FETCH_INTERVAL_MINUTES


class FeedSettingUpdate(BaseModel):
    # 兩個都是 non-null 欄位，省略代表「這次沒有要動」，與 app/api/smtp_settings.py 一致。
    fetch_enabled: bool | None = None
    fetch_interval_minutes: int | None = Field(
        default=None, ge=MIN_FETCH_INTERVAL_MINUTES, le=MAX_FETCH_INTERVAL_MINUTES
    )


class FeedSettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    fetch_enabled: bool
    fetch_interval_minutes: int
    last_run_at: datetime | None
    last_run_status: str | None
    last_run_detail: str | None
