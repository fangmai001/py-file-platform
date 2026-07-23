from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    # NULL for LDAP accounts: the password itself is never stored locally, only used
    # for a one-off bind against the LDAP server at login time (see app/core/ldap.py).
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # "local" (bcrypt password_hash) or "ldap" (auth delegated to the LDAP server).
    auth_source: Mapped[str] = mapped_column(String(16), nullable=False, default="local")
    role: Mapped[str] = mapped_column(String(16), nullable=False, default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
