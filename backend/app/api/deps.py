from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import User

# tokenUrl 只是用來記載客戶端該去哪裡取得 token（供 OpenAPI 文件／Swagger UI 使用），
# 它並不會路由請求，所以 /api/auth/login 掛在另一個 router 上完全沒問題。
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="無法驗證身份",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
    except InvalidTokenError:
        raise credentials_exception

    username = payload.get("sub")
    if username is None:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


# auto_error=False，讓沒帶 token 的請求以訪客身份抵達端點，而不是在 handler 還來不及判斷
# 這個資源到底需不需要驗證之前，就先被擋下一個 401。
_optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user_optional(
    token: str | None = Depends(_optional_oauth2_scheme), db: Session = Depends(get_db)
) -> User | None:
    if token is None:
        return None
    try:
        payload = decode_access_token(token)
    except InvalidTokenError:
        return None

    username = payload.get("sub")
    if username is None:
        return None

    user = db.query(User).filter(User.username == username).first()
    if user is None or not user.is_active:
        return None
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要管理員權限")
    return current_user
