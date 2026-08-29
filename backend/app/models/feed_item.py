from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FeedItem(Base):
    """從某個 Feed 抓回來的單一則項目。"""

    __tablename__ = "feed_items"
    # 去重的唯一依據：同一個來源裡 guid 相同就視為同一則，重抓時不再新增。
    __table_args__ = (UniqueConstraint("feed_id", "guid", name="uq_feed_items_feed_id_guid"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    # 用 ondelete=CASCADE，讓刪除訂閱來源時一併帶走它的項目。理由與 notifications.recipient_id
    # 相同：程式裡沒有任何 relationship() 把 FeedItem 對回 Feed，單純的 db.delete(feed) 只會發出
    # DELETE FROM feeds，子資料列必須交給資料庫處理，否則 Postgres 會拒絕整個刪除。
    feed_id: Mapped[int] = mapped_column(
        ForeignKey("feeds.id", ondelete="CASCADE"), nullable=False, index=True
    )
    guid: Mapped[str] = mapped_column(String(512), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    link: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 有不少 feed 根本不提供日期，因此允許為 null，排序時退回 fetched_at。
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
