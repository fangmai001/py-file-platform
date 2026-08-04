from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    # ondelete=CASCADE so deleting a user takes their notifications with them. Nothing in
    # the app maps a Notification back to a User via relationship(), so a plain
    # db.delete(user) only emits DELETE FROM users - the database has to handle the
    # children, or Postgres rejects the whole delete (see app/api/admin.py delete_user).
    recipient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_id: Mapped[int] = mapped_column(ForeignKey("files.id"), nullable=False, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
