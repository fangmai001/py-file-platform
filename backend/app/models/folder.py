from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[int] = mapped_column(primary_key=True)
    # index=True 的意義不只是查詢速度：少了它，SQLAlchemy 產生的是 UNIQUE constraint，
    # 而 migration（ef4fd64f566c）建的是 unique index——於是測試用 create_all 建出來的
    # schema 與實際 migrate 出來的分岔了。與 users.username／users.email／
    # password_reset_tokens.token_hash 的寫法一致。
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
