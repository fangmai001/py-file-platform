from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Feed(Base):
    """一個 RSS／Atom 訂閱來源。抓回來的每一則項目存在 FeedItem。"""

    __tablename__ = "feeds"

    id: Mapped[int] = mapped_column(primary_key=True)
    # 由管理員自訂的顯示名稱，刻意不採用 feed 自報的標題——對方改名不該讓平台上的分類跟著跳動。
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    # index=True 而不是只給 unique：理由與 folders.name 相同，見 app/models/folder.py 的註解。
    url: Mapped[str] = mapped_column(String(2048), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    folder_id: Mapped[int | None] = mapped_column(ForeignKey("folders.id"), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # 停用之後，排程與管理員的手動抓取都會略過它，但既有的文章仍留在資料庫裡。
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # HTTP 回應標頭原樣存放，下一次以條件式 GET 送出；對方回 304 時就不必重新解析整份 feed。
    etag: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_modified: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_fetched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # "ok" / "not_modified" / "error"，供管理後台顯示狀態標籤。
    last_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
