from sqlalchemy import Boolean, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SmtpSetting(Base):
    """單列的資料表（id 永遠是 1），存放管理員可編輯的寄件用 SMTP 設定
    （重設密碼連結、上傳通知）。

    第一次被讀取時以 SMTP_* 環境變數填入初始值（見 app/core/smtp_config.py），
    讓既有那些靠 .env 設定的部署維持運作，直到管理員透過管理後台 UI 修改這些值為止。
    """

    __tablename__ = "smtp_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    host: Mapped[str | None] = mapped_column(Text, nullable=True)
    port: Mapped[int] = mapped_column(Integer, nullable=False, default=587)
    username: Mapped[str | None] = mapped_column(Text, nullable=True)
    password: Mapped[str | None] = mapped_column(Text, nullable=True)
    from_address: Mapped[str] = mapped_column(Text, nullable=False, default="noreply@example.com")
    use_tls: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
