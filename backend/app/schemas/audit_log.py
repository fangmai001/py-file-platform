from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_id: int
    actor_username: str
    action: str
    target: str | None
    detail: str | None
    created_at: datetime
