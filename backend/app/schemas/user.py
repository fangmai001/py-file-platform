from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, TypeAdapter

from app.core.security import MIN_PASSWORD_LENGTH

# 系統只認得這兩個角色：app/api/deps.py 的 require_admin 是以 == "admin" 判斷的，因此
# 任何其他值（包含大小寫不同的 "Admin"）都等同於沒有管理權限。收成 Literal 是為了讓這種
# 情況在 422 當下就被擋下，而不是先寫進 DB、之後才發現那個帳號永遠拿不到權限。
# 前端對應的 union 在 frontend/src/api/types.ts 的 UserRole，兩邊必須一起改。
UserRole = Literal["user", "admin"]

# 對齊 models/user.py 中 User.email 的 String(255)：超過長度的話，驗證放行後會改由 Postgres
# 丟出 DataError，也就是一個沒有欄位資訊的 500。
EMAIL_MAX_LENGTH = 255

_email_adapter = TypeAdapter(EmailStr)


def _validate_email(value: str) -> str:
    if len(value) > EMAIL_MAX_LENGTH:
        raise ValueError(f"email 長度不可超過 {EMAIL_MAX_LENGTH} 個字元")
    return str(_email_adapter.validate_python(value))


# 這兩個型別刻意寫成「`str | None` ＋ AfterValidator」，而不是直觀的
# `EmailStr | Literal[""] | None` union。union 在驗證失敗時會替每一個成員各產生一筆錯誤，
# 而且 loc 會多出 pydantic 的內部標籤（`function-after[_validate(), str]`、`literal['']`）。
# 前端的 lib/validation-errors.ts 取的是 loc 的最後一段當欄位名，於是畫面會出現
# 「function-after[_validate(), str]：格式不正確」——正是 #132 修掉的那類訊息。
# 單一型別讓 loc 維持在 ["body", "email"]，錯誤也只有一筆。
OptionalEmail = Annotated[str | None, AfterValidator(lambda v: v if v is None else _validate_email(v))]

# PATCH 專用。允許空字串是既有的介面約定：那兩個 PATCH 端點以 None 表示「這次沒有要動
# email」，因此「清空 email」只能用 ""（見 app/api/auth.py 的 `payload.email or None`，
# 以及 tests/test_auth.py 的 test_update_me_can_clear_email）。建立使用者時沒有「清空」
# 這回事，所以 UserCreate 用的是不含 "" 的 OptionalEmail。
ClearableEmail = Annotated[
    str | None, AfterValidator(lambda v: v if v is None or v == "" else _validate_email(v))
]

# 對齊 models/user.py 中 User.full_name 的 String(100)，理由與 EMAIL_MAX_LENGTH 相同。
FullName = Annotated[str | None, Field(max_length=100)]


class UserCreate(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=MIN_PASSWORD_LENGTH)
    role: UserRole = "user"
    email: OptionalEmail = None
    full_name: FullName = None


class UserUpdate(BaseModel):
    role: UserRole | None = None
    is_active: bool | None = None
    email: ClearableEmail = None
    full_name: FullName = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str | None
    # role 與 email 在回應端刻意維持寬鬆的 str：它們讀的是 DB 現況，而 users 表在這次收斂
    # 之前可能已經存進不符合上面規則的值。若這裡也收成 UserRole／EmailStr，一列舊資料就會
    # 讓整個 GET /api/admin/users 序列化失敗（500），使管理員連修正它的畫面都打不開。
    email: str | None
    role: str
    auth_source: str
    is_active: bool
    notify_by_email: bool
    created_at: datetime
    updated_at: datetime


class ProfileUpdateRequest(BaseModel):
    full_name: FullName = None
    email: ClearableEmail = None
    notify_by_email: bool | None = None


class AdminPasswordResetResponse(BaseModel):
    password: str


class PasswordChangeRequest(BaseModel):
    # current_password 不設下限：它比對的是既有密碼，可能早於這條規則就已經存在。
    current_password: str
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH)


class PasswordChangeResponse(BaseModel):
    message: str
