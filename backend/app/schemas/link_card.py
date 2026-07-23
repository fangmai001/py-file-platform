from datetime import datetime

from pydantic import BaseModel, ConfigDict, HttpUrl


class LinkCardCreate(BaseModel):
    title: str
    description: str | None = None
    url: HttpUrl
    folder_id: int | None = None
    is_public: bool = True


class LinkCardUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    url: HttpUrl | None = None
    folder_id: int | None = None
    is_public: bool | None = None


class LinkCardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    url: str
    folder_id: int | None
    is_public: bool
    created_at: datetime
