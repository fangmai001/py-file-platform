from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.folder import FolderResponse


class FileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
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
