from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    # UI 上用來取代登入 username 顯示的名稱；純粹是外觀用途。
    full_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # 可為 null：沒有登記地址時，那位使用者的上傳通知信就直接跳過
    # （不論如何，站內通知還是照樣寫入）。
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    # LDAP 帳號為 NULL：密碼本身從不存在本機，只在登入當下用於對 LDAP 伺服器做一次性的 bind
    # （見 app/core/ldap.py）。
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # "local"（bcrypt 的 password_hash）或 "ldap"（驗證委由 LDAP 伺服器處理）。
    auth_source: Mapped[str] = mapped_column(String(16), nullable=False, default="local")
    role: Mapped[str] = mapped_column(String(16), nullable=False, default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # 是否寄上傳通知信給這位使用者；不論這個設定為何，站內通知一律照寫。
    notify_by_email: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
