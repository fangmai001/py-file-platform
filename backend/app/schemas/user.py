from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"
    email: str | None = None
    full_name: str | None = None


class UserUpdate(BaseModel):
    role: str | None = None
    is_active: bool | None = None
    email: str | None = None
    full_name: str | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str | None
    email: str | None
    role: str
    auth_source: str
    is_active: bool
    notify_by_email: bool
    created_at: datetime
    updated_at: datetime


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = None
    email: str | None = None
    notify_by_email: bool | None = None


class AdminPasswordResetResponse(BaseModel):
    password: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class PasswordChangeResponse(BaseModel):
    message: str
