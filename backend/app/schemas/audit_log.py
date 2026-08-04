from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    # None once the actor's account is deleted (ondelete=SET NULL); actor_username stays a
    # string either way, since app/api/admin.py substitutes a placeholder.
    actor_id: int | None
    actor_username: str
    action: str
    target: str | None
    detail: str | None
    created_at: datetime
