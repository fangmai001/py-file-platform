import secrets
import string
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.core.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 設定新密碼時的最短長度，由 app/schemas/ 底下所有「會寫入密碼」的 schema 共用。
# 刻意不套用在登入用的 LoginRequest 上：既有帳號的密碼可能比這個值短，在登入端加上長度
# 限制等於把他們鎖在門外，而且會讓「密碼太短」與「密碼錯誤」變成兩種可區分的回應。
MIN_PASSWORD_LENGTH = 8

# 排除視覺上容易混淆的字元（0／O、1／l／I），因為這組密碼是要由管理員唸給使用者聽，
# 或是手動重新輸入的。
_TEMP_PASSWORD_ALPHABET = "".join(c for c in string.ascii_letters + string.digits if c not in "0O1lI")
# 必須 >= MIN_PASSWORD_LENGTH：管理員重設產生的密碼會直接交給使用者，若比下限還短，
# 使用者之後想沿用它改密碼時反而會被自己的驗證擋下。
_TEMP_PASSWORD_LENGTH = 12


def generate_temp_password() -> str:
    return "".join(secrets.choice(_TEMP_PASSWORD_ALPHABET) for _ in range(_TEMP_PASSWORD_LENGTH))


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd_context.verify(password, password_hash)


def create_access_token(subject: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": subject, "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
