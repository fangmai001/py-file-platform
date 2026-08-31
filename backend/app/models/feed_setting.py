from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FeedSetting(Base):
    """單列的資料表（id 永遠是 1），存放管理員可編輯的 RSS 定時抓取排程設定。

    與 LdapSetting／SmtpSetting 是同一個模式，差別在這裡沒有對應的環境變數初始值——
    排程從一開始就只由管理後台管理（見 app/core/feed_schedule.py）。
    """

    __tablename__ = "feed_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    # 預設關閉：既有部署升級之後行為不變（部署主機上的 crontab 繼續跑），改用內建排程是管理員
    # 主動的決定。兩邊同時開著也不會產生重複文章（去重鍵是 (feed_id, guid)），只是多打對方
    # 站台一次而已。
    fetch_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    fetch_interval_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    # 最近一次「整批」抓取的結果，供後台的排程卡片顯示。單一來源各自的狀態仍記在 feeds
    # 那一列上（last_status／last_error），兩者不重複。
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # "ok" / "error"，後者代表這一批裡至少有一個來源失敗。
    last_run_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    last_run_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
