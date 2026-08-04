from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    # 操作者的帳號被刪除後即為 None（ondelete=SET NULL）；actor_username 無論如何都仍是字串，
    # 因為 app/api/admin.py 會替換成一個佔位值。
    actor_id: int | None
    actor_username: str
    action: str
    target: str | None
    detail: str | None
    created_at: datetime
