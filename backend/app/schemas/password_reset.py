from pydantic import BaseModel


class PasswordResetRequest(BaseModel):
    username_or_email: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class PasswordResetMessage(BaseModel):
    message: str
