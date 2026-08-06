from pydantic import BaseModel, Field

from app.core.security import MIN_PASSWORD_LENGTH


class PasswordResetRequest(BaseModel):
    # 這個欄位可能是帳號也可能是 email，因此不能套 EmailStr。
    username_or_email: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH)


class PasswordResetMessage(BaseModel):
    message: str
