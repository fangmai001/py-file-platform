from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Highlight(Base):
    """首頁 hero 區塊下方顯示的特色卡片。"""

    __tablename__ = "highlights"

    id: Mapped[int] = mapped_column(primary_key=True)
    # kebab-case 的 key，由 frontend/src/lib/highlight-icons.ts 對應到 lucide 圖示；
    # 允許的值由 app/schemas/highlight.py 中的 HighlightIconKey 驗證。
    icon: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
