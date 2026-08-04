from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    # 用 SET NULL 而不是 CASCADE，因此欄位可為 null：稽核紀錄的存在就是為了記下高權限操作，
    # 所以刪除執行這些操作的帳號，不該把「做了什麼」的紀錄一併抹除。讀取端必須能應付
    # 操作者不存在的情況——app/api/admin.py 的 list_audit_logs 會用 outer join 並替換成
    # 一個佔位用的 username。
    actor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    target: Mapped[str | None] = mapped_column(String(255), nullable=True)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
