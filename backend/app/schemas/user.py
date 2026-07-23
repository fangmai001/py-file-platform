from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"
    email: str | None = None


class UserUpdate(BaseModel):
    role: str | None = None
    is_active: bool | None = None
    password: str | None = None
    email: str | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str | None
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
