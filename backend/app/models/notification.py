from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    # 用 ondelete=CASCADE，讓刪除使用者時一併帶走他的通知。應用程式裡沒有任何地方以
    # relationship() 把 Notification 對回 User，因此單純的 db.delete(user) 只會發出
    # DELETE FROM users——子資料列必須交給資料庫處理，否則 Postgres 會拒絕整個刪除
    # （見 app/api/admin.py 的 delete_user）。
    recipient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_id: Mapped[int] = mapped_column(ForeignKey("files.id"), nullable=False, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
