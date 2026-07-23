from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_id: int
    message: str
    is_read: bool
    created_at: datetime


class NotificationUpdate(BaseModel):
    is_read: bool | None = None
