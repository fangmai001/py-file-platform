from datetime import date, datetime

from pydantic import AliasPath, BaseModel, ConfigDict, Field

from app.schemas.folder import FolderResponse


class FileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    # owner_id 仍然保留：前端用它判斷目前登入者能不能編輯這個檔案。owner_username 則是
    # 給人看的，比照 AuditLogItem.actor_username 的作法，不讓呼叫端自己拿 id 去拼名稱。
    owner_id: int
    owner_username: str = Field(validation_alias=AliasPath("owner", "username"))
    filename: str
    display_name: str | None
    folder_id: int | None
    announced_at: date | None
    is_public: bool
    size: int
    created_at: datetime


class FolderGroup(BaseModel):
    folder: FolderResponse | None
    files: list[FileResponse]


class FileUpdate(BaseModel):
    is_public: bool | None = None
    folder_id: int | None = None
    display_name: str | None = None
    announced_at: date | None = None


class FileVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_id: int
    version_no: int
    uploaded_at: datetime
