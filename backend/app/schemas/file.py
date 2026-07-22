from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    filename: str
    folder: str | None
    is_public: bool
    size: int
    created_at: datetime


class FolderGroup(BaseModel):
    folder: str | None
    files: list[FileResponse]


class FileUpdate(BaseModel):
    is_public: bool | None = None
